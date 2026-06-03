import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Bell, CheckCircle2, Clock3, FileText, RotateCcw, Ticket as TicketIcon, UploadCloud, XCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { apiFetch, apiUrl } from "../lib/api";
import SeoHead from "../components/SeoHead";
import TicketView, { type TicketData } from "../components/Ticket";
import { rememberTicket } from "../lib/myTickets";
import { subscribeToPaymentPortalUpdates } from "../hooks/usePushNotifications";

type Method = {
  key: string;
  labelAr: string;
  labelEn: string;
  instructionsAr: string;
  accountIdentifier: string;
};

type PortalData = {
  payment: {
    id: string;
    status: string;
    methodKey: string;
    currency: string;
    finalAmount: number;
    expectedDepositAmount: number;
    depositPercent: number;
    instructions: string;
    expiresAt: string | null;
    submittedAt: string | null;
    adminNote?: string;
  };
  booking: {
    id: number;
    name: string;
    phone: string;
    packageName: string;
    packageNameAr: string;
    date: string;
    passengers: number;
    status?: string;
    paymentStatus?: string;
  };
  methods: Method[];
  action?: string;
  message?: string;
  timeline?: { key: string; label: string; status: "done" | "current" | "upcoming" | "blocked" }[];
  ticket?: {
    status: "issued";
    token: string;
    ticketNumber: string;
    ticketSignature: string;
    issuedAt: string;
    ticketUrl: string;
    verifyUrl: string;
    pdfAvailable: boolean;
    pdfUrl: string | null;
  } | null;
};

type UploadItem = {
  id: string;
  file: File;
  objectPath?: string;
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
  error?: string;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_FILES = 5;
const MAX_SIZE = 10 * 1024 * 1024;
const PAYMENT_PORTALS_KEY = "dr-travel-payment-portals-v1";

function formatMoney(value: number, currency: string) {
  return `${Math.max(0, Number(value || 0)).toLocaleString("ar-EG")} ${currency || "EGP"}`;
}

function canUploadStatus(status: string) {
  return ["pending", "reupload_requested"].includes(status);
}

function isWaitingForChange(status: string, ticket?: PortalData["ticket"]) {
  return status === "submitted" || (["approved", "offline_paid", "waived"].includes(status) && !ticket?.token);
}

function rememberPaymentPortal(token: string) {
  if (!token || token.length < 16) return;
  try {
    const raw = localStorage.getItem(PAYMENT_PORTALS_KEY);
    const parsed = JSON.parse(raw || "[]");
    const list = Array.isArray(parsed) ? parsed as Array<{ token: string; savedAt: number }> : [];
    const next = [{ token, savedAt: Date.now() }, ...list.filter((item) => item?.token !== token)].slice(0, 10);
    localStorage.setItem(PAYMENT_PORTALS_KEY, JSON.stringify(next));
  } catch {
    localStorage.setItem(PAYMENT_PORTALS_KEY, JSON.stringify([{ token, savedAt: Date.now() }]));
  }
}

function uploadProof(token: string, item: UploadItem, onProgress: (value: number) => void): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const targetRes = await apiFetch(`/api/payments/portal/${encodeURIComponent(token)}/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.file.name,
          size: item.file.size,
          contentType: item.file.type,
        }),
      });
      const target = await targetRes.json().catch(() => ({}));
      if (!targetRes.ok || !target.uploadURL || !target.objectPath) {
        reject(new Error(target.error || "تعذر تجهيز رفع الملف"));
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", apiUrl(target.uploadURL));
      xhr.setRequestHeader("Content-Type", item.file.type);
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(String(target.objectPath));
        else reject(new Error("فشل رفع الملف"));
      };
      xhr.onerror = () => reject(new Error("فشل رفع الملف"));
      xhr.send(item.file);
    } catch (err) {
      reject(err);
    }
  });
}

export default function PaymentPortalPage() {
  const [, params] = useRoute("/payment/:token");
  const [, navigate] = useLocation();
  const token = params?.token || "";
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [methodKey, setMethodKey] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [notifyState, setNotifyState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const canSubmit = !!data && canUploadStatus(data.payment.status);
  const expiresText = useMemo(() => {
    if (!data?.payment.expiresAt) return "";
    const end = new Date(data.payment.expiresAt).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return "انتهت مهلة الدفع";
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return `${hours} ساعة و ${minutes} دقيقة متبقية`;
  }, [data?.payment.expiresAt]);

  const loadPortal = useCallback((silent = false) => {
    let alive = true;
    if (!silent) setLoading(true);
    apiFetch(`/api/payments/portal/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || "تعذر تحميل بوابة الدفع");
        return body as PortalData;
      })
      .then((body) => {
        if (!alive) return;
        setError("");
        setData(body);
        setMethodKey(body.payment.methodKey || body.methods[0]?.key || "");
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "تعذر تحميل بوابة الدفع"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token]);

  useEffect(() => loadPortal(false), [loadPortal]);

  useEffect(() => {
    rememberPaymentPortal(token);
  }, [token]);

  useEffect(() => {
    if (!data || !isWaitingForChange(data.payment.status, data.ticket)) return;
    const t = setInterval(() => loadPortal(true), 15_000);
    return () => clearInterval(t);
  }, [data?.payment.status, data?.ticket?.token, loadPortal]);

  useEffect(() => {
    const token = data?.ticket?.token;
    if (!token) {
      setTicketData(null);
      return;
    }
    rememberTicket(token);
    let alive = true;
    const sig = data.ticket?.ticketSignature ? `?sig=${encodeURIComponent(data.ticket.ticketSignature)}` : "";
    apiFetch(`/api/tickets/${encodeURIComponent(token)}${sig}`)
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (alive && body) setTicketData(body as TicketData);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [data?.ticket?.token, data?.ticket?.ticketSignature]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const next = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) break;
      if (!ALLOWED_TYPES.has(file.type)) {
        setError("الملفات المسموحة: صور JPG/PNG/WebP أو PDF فقط");
        continue;
      }
      if (file.size > MAX_SIZE) {
        setError("حجم الملف يجب ألا يتجاوز 10 ميجا");
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        progress: 0,
        status: "ready",
      });
    }
    setFiles(next);
  };

  const submit = async () => {
    if (!data || !methodKey || files.length === 0) {
      setError("اختر طريقة الدفع وارفع إثبات الدفع أولاً");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const uploaded: { objectPath: string; mimeType: string; sizeBytes: number; originalFilename: string }[] = [];
      for (const item of files) {
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "uploading", progress: 1 } : f));
        const objectPath = item.objectPath || await uploadProof(token, item, (progress) => {
          setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress } : f));
        });
        setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, status: "done", objectPath, progress: 100 } : f));
        uploaded.push({
          objectPath,
          mimeType: item.file.type,
          sizeBytes: item.file.size,
          originalFilename: item.file.name,
        });
      }
      const r = await apiFetch(`/api/payments/portal/${encodeURIComponent(token)}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methodKey, customerNote: note, attachments: uploaded }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "تعذر إرسال إثبات الدفع");
      setDone(true);
      setFiles([]);
      loadPortal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إرسال إثبات الدفع");
    } finally {
      setSubmitting(false);
    }
  };

  const enableNotifications = async () => {
    setNotifyState("loading");
    const result = await subscribeToPaymentPortalUpdates(token);
    setNotifyState(result.ok ? "ok" : "error");
  };

  return (
    <div dir="rtl" lang="ar" style={{ minHeight: "100vh", background: "#f7fbff", color: "#102033", fontFamily: "Cairo, sans-serif" }}>
      <SeoHead
        title="بوابة الدفع | DR Travel"
        description="ارفع إثبات الدفع الخاص بحجزك في DR Travel."
        path={`/payment/${token}`}
        noindex
      />
      <main style={{ width: "min(760px, 100%)", margin: "0 auto", padding: "1rem", paddingBottom: "3rem" }}>
        <button onClick={() => navigate("/")} style={{ border: "1px solid #d8e5f2", background: "#fff", color: "#123", borderRadius: 8, height: 40, padding: "0 0.8rem", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 800, cursor: "pointer" }}>
          <ArrowLeft size={18} /> الرئيسية
        </button>

        <section style={{ marginTop: "1rem", background: "#fff", border: "1px solid #dbe8f4", borderRadius: 8, padding: "1.1rem", boxShadow: "0 12px 30px rgba(20,40,70,0.08)" }}>
          <div style={{ color: "#0077c8", fontWeight: 900, fontSize: "0.84rem" }}>بوابة الدفع</div>
          <h1 style={{ margin: "0.35rem 0 0.5rem", fontSize: "clamp(1.55rem, 6vw, 2.4rem)", lineHeight: 1.2 }}>استكمال دفع الحجز</h1>
          <p style={{ margin: 0, color: "#5b6b7c", lineHeight: 1.8 }}>ارفع إثبات التحويل وسيقوم فريق الإدارة بمراجعته قبل إصدار التذكرة.</p>
        </section>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#0077c8", fontWeight: 900 }}>جاري التحميل...</div>
        ) : error && !data ? (
          <div style={{ marginTop: "1rem", background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", borderRadius: 8, padding: "1rem", fontWeight: 800 }}>{error}</div>
        ) : data ? (
          <>
            <section style={{ marginTop: "1rem", display: "grid", gap: "0.75rem" }}>
              <div style={{ background: "#fff", border: "1px solid #dbe8f4", borderRadius: 8, padding: "1rem" }}>
                <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>تفاصيل الحجز</h2>
                <div style={{ display: "grid", gap: "0.55rem", color: "#43566b", fontWeight: 700 }}>
                  <span>الاسم: {data.booking.name}</span>
                  <span>الباقة: {data.booking.packageNameAr || data.booking.packageName}</span>
                  <span>التاريخ: {data.booking.date}</span>
                  <span>عدد الأفراد: {data.booking.passengers}</span>
                </div>
              </div>
              <div style={{ background: "#eef8ff", border: "1px solid #b9e3ff", borderRadius: 8, padding: "1rem" }}>
                <div style={{ color: "#075985", fontWeight: 900 }}>المبلغ المطلوب</div>
                <div style={{ marginTop: 4, fontSize: "1.6rem", fontWeight: 1000 }}>{formatMoney(data.payment.expectedDepositAmount, data.payment.currency)}</div>
                <div style={{ color: "#42657d", fontSize: "0.88rem", fontWeight: 700 }}>العربون: {data.payment.depositPercent}% من إجمالي {formatMoney(data.payment.finalAmount, data.payment.currency)}</div>
                {expiresText && <div style={{ marginTop: 8, color: expiresText.includes("انتهت") ? "#be123c" : "#0f766e", fontWeight: 900 }}>{expiresText}</div>}
              </div>
            </section>

            <section style={{ marginTop: "1rem", background: "#fff", border: "1px solid #dbe8f4", borderRadius: 8, padding: "1rem", display: "grid", gap: "1rem" }}>
              <div style={{ display: "flex", gap: "0.8rem", alignItems: "flex-start", background: statusTone(data.payment.status).bg, border: `1px solid ${statusTone(data.payment.status).border}`, borderRadius: 8, padding: "0.9rem" }}>
                <StatusIcon status={data.payment.status} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: statusTone(data.payment.status).color, fontWeight: 1000 }}>{statusTitle(data.payment.status, !!data.ticket?.token)}</div>
                  <div style={{ color: "#425466", lineHeight: 1.8, marginTop: 4, fontWeight: 700 }}>
                    {done && data.payment.status !== "submitted" ? "تم إرسال إثبات الدفع بنجاح." : data.message || "تابع حالة حجزك من هنا."}
                  </div>
                </div>
              </div>

              <Timeline items={data.timeline || []} />

              <button
                onClick={enableNotifications}
                disabled={notifyState === "loading" || notifyState === "ok"}
                style={{ border: "1px solid #bae6fd", background: notifyState === "ok" ? "#ecfdf5" : "#f0f9ff", color: notifyState === "ok" ? "#047857" : "#0369a1", borderRadius: 8, minHeight: 44, padding: "0.65rem 0.8rem", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 900, fontFamily: "Cairo, sans-serif", cursor: notifyState === "loading" || notifyState === "ok" ? "default" : "pointer" }}>
                <Bell size={18} />
                {notifyState === "loading" ? "جاري التفعيل..." : notifyState === "ok" ? "سيتم تنبيهك عند التحديث" : notifyState === "error" ? "تعذر تفعيل التنبيه - حاول مرة أخرى" : "نبهني عند تحديث الحالة"}
              </button>
            </section>

            {data.ticket?.token && (
              <section style={{ marginTop: "1rem", background: "#fff", border: "1px solid #bbf7d0", borderRadius: 8, padding: "1rem", display: "grid", gap: "0.85rem" }}>
                <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", color: "#047857", fontWeight: 1000 }}>
                  <TicketIcon size={22} />
                  <span>تذكرتك جاهزة</span>
                </div>
                <div style={{ color: "#43566b", fontWeight: 800 }}>رقم التذكرة: {data.ticket.ticketNumber}</div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <a href={data.ticket.ticketUrl} target="_blank" rel="noreferrer" style={linkBtn("#00aaff", "#fff")}>فتح التذكرة</a>
                  <a href={data.ticket.verifyUrl} target="_blank" rel="noreferrer" style={linkBtn("#fff", "#075985")}>صفحة التحقق</a>
                  {data.ticket.pdfAvailable && data.ticket.pdfUrl && (
                    <a href={apiUrl(data.ticket.pdfUrl)} target="_blank" rel="noreferrer" style={linkBtn("#fff7ed", "#9a3412")}>تحميل PDF</a>
                  )}
                </div>
                {ticketData && (
                  <div style={{ overflow: "auto", borderRadius: 8, background: "#0D1B2A", padding: "0.75rem", display: "flex", justifyContent: "center" }}>
                    <div style={{ transform: "scale(0.72)", transformOrigin: "top center", width: 800, height: 650 }}>
                      <TicketView data={ticketData} lang="ar" publicUrl={typeof window !== "undefined" ? `${window.location.origin}/verify/${data.ticket.token}` : ""} />
                    </div>
                  </div>
                )}
              </section>
            )}

            {canSubmit && (
              <section style={{ marginTop: "1rem", background: "#fff", border: "1px solid #dbe8f4", borderRadius: 8, padding: "1rem" }}>
                <div style={{ display: "grid", gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem" }}>طريقة الدفع</h2>
                    <div style={{ display: "grid", gap: "0.65rem" }}>
                      {data.methods.map((method) => (
                        <label key={method.key} style={{ border: methodKey === method.key ? "2px solid #00aaff" : "1px solid #dbe8f4", borderRadius: 8, padding: "0.85rem", display: "grid", gap: "0.35rem", cursor: "pointer", background: methodKey === method.key ? "#eff8ff" : "#fff" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                            <input type="radio" checked={methodKey === method.key} onChange={() => setMethodKey(method.key)} />
                            {method.labelAr || method.labelEn}
                          </span>
                          {method.accountIdentifier && <span style={{ color: "#475569", direction: "ltr", textAlign: "right", fontWeight: 800 }}>{method.accountIdentifier}</span>}
                          {method.instructionsAr && <span style={{ color: "#64748b", lineHeight: 1.7 }}>{method.instructionsAr}</span>}
                        </label>
                      ))}
                    </div>
                  </div>

                  {data.payment.instructions && (
                    <pre style={{ whiteSpace: "pre-wrap", margin: 0, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.85rem", color: "#334155", lineHeight: 1.8, fontFamily: "Cairo, sans-serif" }}>{data.payment.instructions}</pre>
                  )}

                  <label style={{ border: "1px dashed #8ccff5", background: "#f7fcff", borderRadius: 8, padding: "1rem", textAlign: "center", cursor: "pointer", color: "#075985", fontWeight: 900 }}>
                    <UploadCloud size={28} />
                    <div>ارفع إثبات الدفع</div>
                    <div style={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 700 }}>حتى 5 ملفات: صور أو PDF</div>
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => addFiles(e.currentTarget.files)} style={{ display: "none" }} />
                  </label>

                  {files.length > 0 && (
                    <div style={{ display: "grid", gap: "0.55rem" }}>
                      {files.map((item) => (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: "0.65rem", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.6rem" }}>
                          <FileText size={22} color="#0ea5e9" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800 }}>{item.file.name}</div>
                            <div style={{ height: 5, background: "#e2e8f0", borderRadius: 4, marginTop: 6, overflow: "hidden" }}>
                              <div style={{ width: `${item.progress}%`, height: "100%", background: item.status === "error" ? "#ef4444" : "#00aaff" }} />
                            </div>
                          </div>
                          <button type="button" disabled={submitting} onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))} style={{ border: 0, background: "transparent", color: "#be123c", fontWeight: 900, cursor: "pointer" }}>حذف</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظات اختيارية" rows={3} style={{ border: "1px solid #dbe8f4", borderRadius: 8, padding: "0.8rem", resize: "vertical", fontFamily: "Cairo, sans-serif" }} />
                  {error && <div style={{ color: "#be123c", background: "#fff1f2", border: "1px solid #fecdd3", padding: "0.75rem", borderRadius: 8, fontWeight: 800 }}>{error}</div>}
                  <button disabled={submitting || !canSubmit} onClick={submit} style={{ height: 50, border: 0, borderRadius: 8, background: submitting ? "#94a3b8" : "#00aaff", color: "#fff", fontWeight: 1000, fontFamily: "Cairo, sans-serif", cursor: submitting ? "wait" : "pointer", fontSize: "1rem" }}>
                    {submitting ? "جاري الإرسال..." : "إرسال إثبات الدفع"}
                  </button>
                </div>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}

function statusTone(status: string) {
  if (status === "submitted") return { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" };
  if (["approved", "offline_paid", "waived"].includes(status)) return { bg: "#ecfdf5", border: "#bbf7d0", color: "#047857" };
  if (status === "reupload_requested") return { bg: "#fff7ed", border: "#fed7aa", color: "#c2410c" };
  if (status === "rejected") return { bg: "#fff1f2", border: "#fecdd3", color: "#be123c" };
  if (status === "expired") return { bg: "#f8fafc", border: "#cbd5e1", color: "#475569" };
  return { bg: "#f0f9ff", border: "#bae6fd", color: "#0369a1" };
}

function statusTitle(status: string, hasTicket: boolean) {
  if (hasTicket) return "تم إصدار التذكرة";
  if (status === "submitted") return "إثبات الدفع قيد المراجعة";
  if (["approved", "offline_paid", "waived"].includes(status)) return "تم اعتماد الدفع";
  if (status === "reupload_requested") return "مطلوب إعادة رفع الإثبات";
  if (status === "rejected") return "تم رفض إثبات الدفع";
  if (status === "expired") return "انتهت مهلة الدفع";
  return "في انتظار إثبات الدفع";
}

function StatusIcon({ status }: { status: string }) {
  if (["approved", "offline_paid", "waived"].includes(status)) return <CheckCircle2 size={24} color="#047857" />;
  if (status === "rejected" || status === "expired") return <XCircle size={24} color={status === "expired" ? "#64748b" : "#be123c"} />;
  if (status === "reupload_requested") return <RotateCcw size={24} color="#c2410c" />;
  return <Clock3 size={24} color="#0369a1" />;
}

function Timeline({ items }: { items: NonNullable<PortalData["timeline"]> }) {
  if (!items.length) return null;
  const colors: Record<string, string> = {
    done: "#10b981",
    current: "#0ea5e9",
    upcoming: "#cbd5e1",
    blocked: "#ef4444",
  };
  return (
    <div style={{ display: "grid", gap: "0.55rem" }}>
      {items.map((item) => (
        <div key={item.key} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: "0.6rem", alignItems: "center" }}>
          <span style={{ width: 18, height: 18, borderRadius: 999, background: colors[item.status] || "#cbd5e1", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.7rem", fontWeight: 1000 }}>
            {item.status === "done" ? "✓" : item.status === "blocked" ? "!" : ""}
          </span>
          <span style={{ color: item.status === "upcoming" ? "#7a8aa0" : "#243447", fontWeight: item.status === "current" ? 1000 : 800 }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function linkBtn(bg: string, color: string): CSSProperties {
  return {
    background: bg,
    color,
    border: "1px solid #bae6fd",
    borderRadius: 8,
    padding: "0.65rem 0.9rem",
    textDecoration: "none",
    fontWeight: 1000,
    fontFamily: "Cairo, sans-serif",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
  };
}
