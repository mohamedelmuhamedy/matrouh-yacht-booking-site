import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CreditCard, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { adminFetch, useAdmin } from "./AdminContext";
import { apiUrl } from "../lib/api";

type PaymentMethod = {
  id: number;
  key: string;
  provider: string;
  labelAr: string;
  labelEn: string;
  instructionsAr: string;
  instructionsEn: string;
  accountIdentifier: string;
  active: boolean;
  sortOrder: number;
};

type PackageRow = {
  id: number;
  titleAr: string;
  titleEn: string;
  priceEGP: number;
  active: boolean;
  status: string;
};

type PackageSetting = {
  id?: number;
  packageId: number;
  enabled: boolean;
  methodKeys: string[];
  depositPercent: number;
  expirationHours: number | null;
  ticketIssuanceMode: "manual" | "automatic";
  instructionsAr: string;
  instructionsEn: string;
};

type Attachment = {
  id: string;
  attempt: number;
  mimeType: string;
  originalFilename: string;
  createdAt: string;
};

type PaymentRequest = {
  id: string;
  bookingId: number;
  status: string;
  methodKey: string;
  currency: string;
  finalAmountSnapshot: number;
  expectedDepositAmount: number;
  depositPercentSnapshot: number;
  expiresAt: string | null;
  submittedAt: string | null;
  adminNote: string;
  customerNote: string;
  booking?: {
    id: number;
    name: string;
    phone: string;
    packageName: string;
    packageNameAr: string;
    date: string;
    adults: number;
    children: number;
    infants: number;
  };
  attachments: Attachment[];
  events: { id: string; action: string; actorName: string; note: string; createdAt: string }[];
};

const statusLabels: Record<string, { label: string; bg: string; color: string }> = {
  pending: { label: "في انتظار الدفع", bg: "#FEF3C7", color: "#92400E" },
  submitted: { label: "قيد المراجعة", bg: "#DBEAFE", color: "#1D4ED8" },
  approved: { label: "مقبول", bg: "#DCFCE7", color: "#166534" },
  rejected: { label: "مرفوض", bg: "#FEE2E2", color: "#991B1B" },
  reupload_requested: { label: "إعادة رفع مطلوبة", bg: "#FFEDD5", color: "#9A3412" },
  expired: { label: "منتهي", bg: "#E2E8F0", color: "#334155" },
  waived: { label: "معفى", bg: "#E0E7FF", color: "#3730A3" },
  offline_paid: { label: "مدفوع خارجيًا", bg: "#CCFBF1", color: "#115E59" },
};

function money(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    const token = localStorage.getItem("admin_token") || "";
    fetch(apiUrl(`/api/admin/payment-requests/attachments/${attachment.id}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.ok ? r.blob() : null)
      .then((blob) => {
        if (!alive || !blob) return;
        setUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.id]);

  if (!url) return <span style={thumbStyle}>تحميل</span>;
  if (attachment.mimeType === "application/pdf") {
    return <a href={url} target="_blank" rel="noreferrer" style={thumbStyle}>PDF</a>;
  }
  return <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={attachment.originalFilename} style={{ ...thumbStyle, objectFit: "cover" }} /></a>;
}

export default function AdminPaymentGatewayPage() {
  const { hasPermission } = useAdmin();
  const canManage = hasPermission("payment_gateway.manage_settings");
  const canReview = hasPermission("payment_gateway.review");
  const canOverride = hasPermission("payment_gateway.override");
  const [tab, setTab] = useState<"requests" | "packages" | "methods" | "history">("requests");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [settings, setSettings] = useState<PackageSetting[]>([]);
  const [globalExpirationHours, setGlobalExpirationHours] = useState(12);
  const [msg, setMsg] = useState("");

  const settingsByPackage = useMemo(() => {
    const map = new Map<number, PackageSetting>();
    for (const setting of settings) map.set(setting.packageId, setting);
    return map;
  }, [settings]);

  const loadSettings = async () => {
    const r = await adminFetch("/admin/payment-gateway/settings");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "settings failed");
    setGlobalExpirationHours(d.globalExpirationHours || 12);
    setMethods(d.methods || []);
    setPackages(d.packages || []);
    setSettings((d.settings || []).map((s: any) => ({
      ...s,
      ticketIssuanceMode: s.ticketIssuanceMode === "automatic" ? "automatic" : "manual",
      expirationHours: s.expirationHours ?? null,
      methodKeys: Array.isArray(s.methodKeys) ? s.methodKeys : [],
    })));
  };

  const loadRequests = async () => {
    const r = await adminFetch(`/admin/payment-requests?status=${encodeURIComponent(status)}`);
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "requests failed");
    setRequests(d || []);
  };

  const loadAll = async () => {
    setLoading(true);
    setMsg("");
    try {
      await Promise.all([loadSettings(), loadRequests()]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "تعذر التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadRequests().catch(() => {}); }, [status]);

  const patchSetting = (packageId: number, patch: Partial<PackageSetting>) => {
    setSettings((prev) => {
      const current = prev.find((s) => s.packageId === packageId) || {
        packageId,
        enabled: false,
        methodKeys: [],
        depositPercent: 100,
        expirationHours: null,
        ticketIssuanceMode: "manual" as const,
        instructionsAr: "",
        instructionsEn: "",
      };
      const next = { ...current, ...patch };
      return [...prev.filter((s) => s.packageId !== packageId), next];
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    setMsg("");
    try {
      const r = await adminFetch("/admin/payment-gateway/settings", {
        method: "PUT",
        body: JSON.stringify({ globalExpirationHours, methods, packageSettings: settings }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "تعذر الحفظ");
      setMsg("تم حفظ إعدادات بوابة الدفع");
      await loadSettings();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const review = async (id: string, action: "approve" | "reject" | "request-reupload") => {
    if (!canReview) return;
    const needsNote = action !== "approve";
    const note = needsNote ? window.prompt("اكتب سبب القرار") || "" : "";
    if (needsNote && !note.trim()) return;
    const r = await adminFetch(`/admin/payment-requests/${id}/${action}`, {
      method: "PATCH",
      body: JSON.stringify({ note }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "تعذر تنفيذ الإجراء");
      return;
    }
    await loadRequests();
  };

  const override = async (id: string, mode: string) => {
    if (!canOverride) return;
    const note = window.prompt("سبب التجاوز مطلوب") || "";
    if (!note.trim()) return;
    const r = await adminFetch(`/admin/payment-requests/${id}/override`, {
      method: "PATCH",
      body: JSON.stringify({ mode, note }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "تعذر تنفيذ التجاوز");
      return;
    }
    await loadRequests();
  };

  return (
    <div style={{ direction: "rtl", fontFamily: "Cairo, sans-serif", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", display: "flex", alignItems: "center", gap: 10 }}><CreditCard /> بوابة الدفع</h1>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)" }}>إعداد ومراجعة إثباتات الدفع اليدوية بدون التأثير على الباقات غير المفعلة.</p>
        </div>
        <button onClick={loadAll} style={secondaryBtn}><RefreshCw size={16} /> تحديث</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          ["requests", "طلبات الدفع"],
          ["packages", "إعدادات الباقات"],
          ["methods", "طرق الدفع"],
          ["history", "سجل المحاولات"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)} style={tab === key ? primaryBtn : secondaryBtn}>{label}</button>
        ))}
      </div>

      {msg && <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: 8, background: "#EFF6FF", color: "#1D4ED8", fontWeight: 800 }}>{msg}</div>}
      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>جاري التحميل...</div> : null}

      {!loading && tab === "requests" && (
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
            <h2 style={sectionTitle}>طلبات الدفع</h2>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
              <option value="all">الكل</option>
              <option value="submitted">قيد المراجعة</option>
              <option value="pending">في انتظار الدفع</option>
              <option value="approved">مقبول</option>
              <option value="reupload_requested">إعادة رفع مطلوبة</option>
              <option value="rejected">مرفوض</option>
              <option value="expired">منتهي</option>
            </select>
          </div>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {requests.length === 0 ? <div style={emptyStyle}>لا توجد طلبات دفع حالياً</div> : requests.map((req) => {
              const badge = statusLabels[req.status] || { label: req.status, bg: "#E2E8F0", color: "#334155" };
              const passengers = (req.booking?.adults || 0) + (req.booking?.children || 0) + (req.booking?.infants || 0);
              const canApprove = canReview && req.status === "submitted";
              const canRequestReupload = canReview && req.status === "submitted";
              const canReject = canReview && ["pending", "submitted", "reupload_requested"].includes(req.status);
              return (
                <article key={req.id} style={cardStyle}>
                  <div style={{ display: "grid", gap: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ fontSize: "1.05rem" }}>{req.booking?.name || "عميل"}</strong>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>{req.booking?.phone} · {req.booking?.packageNameAr || req.booking?.packageName} · {req.booking?.date}</div>
                      </div>
                      <span style={{ ...badgeStyle, background: badge.bg, color: badge.color }}>{badge.label}</span>
                    </div>
                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", color: "var(--text-muted)", fontWeight: 800, fontSize: "0.86rem" }}>
                      <span>الأفراد: {passengers}</span>
                      <span>الطريقة: {req.methodKey || "لم يحدد"}</span>
                      <span>المطلوب: {money(req.expectedDepositAmount, req.currency)}</span>
                      <span>الإجمالي: {money(req.finalAmountSnapshot, req.currency)}</span>
                    </div>
                    {req.customerNote && <div style={noteStyle}>ملاحظة العميل: {req.customerNote}</div>}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {req.attachments.map((a) => <AttachmentPreview key={a.id} attachment={a} />)}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button disabled={!canApprove} onClick={() => review(req.id, "approve")} style={successBtn}>قبول</button>
                      <button disabled={!canReject} onClick={() => review(req.id, "reject")} style={dangerBtn}>رفض</button>
                      <button disabled={!canRequestReupload} onClick={() => review(req.id, "request-reupload")} style={secondaryBtn}>طلب إعادة رفع</button>
                      {canOverride && (
                        <>
                          <button onClick={() => override(req.id, "offline_paid")} style={secondaryBtn}>مدفوع خارجيًا</button>
                          <button onClick={() => override(req.id, "waive")} style={secondaryBtn}>إعفاء</button>
                          {req.status === "expired" && <button onClick={() => override(req.id, "restore_expired")} style={secondaryBtn}>استعادة</button>}
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!loading && tab === "packages" && (
        <section style={panelStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            <h2 style={sectionTitle}>إعدادات الباقات</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
              المهلة الافتراضية
              <input type="number" min={1} max={168} value={globalExpirationHours} onChange={(e) => setGlobalExpirationHours(Number(e.target.value) || 12)} disabled={!canManage} style={{ ...inputStyle, width: 90 }} />
              ساعة
            </label>
          </div>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {packages.map((pkg) => {
              const setting = settingsByPackage.get(pkg.id) || {
                packageId: pkg.id,
                enabled: false,
                methodKeys: [],
                depositPercent: 100,
                expirationHours: null,
                ticketIssuanceMode: "manual" as const,
                instructionsAr: "",
                instructionsEn: "",
              };
              return (
                <div key={pkg.id} style={cardStyle}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 1fr) repeat(4, minmax(120px, 160px))", gap: "0.75rem", alignItems: "center" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                      <input type="checkbox" checked={setting.enabled} disabled={!canManage} onChange={(e) => patchSetting(pkg.id, { enabled: e.target.checked })} />
                      {pkg.titleAr || pkg.titleEn}
                    </label>
                    <input type="number" min={1} max={100} value={setting.depositPercent} disabled={!canManage} onChange={(e) => patchSetting(pkg.id, { depositPercent: Number(e.target.value) || 100 })} style={inputStyle} title="نسبة العربون" />
                    <input type="number" min={1} max={168} value={setting.expirationHours ?? ""} disabled={!canManage} onChange={(e) => patchSetting(pkg.id, { expirationHours: e.target.value ? Number(e.target.value) : null })} style={inputStyle} placeholder={`${globalExpirationHours} ساعة`} />
                    <select value={setting.ticketIssuanceMode} disabled={!canManage} onChange={(e) => patchSetting(pkg.id, { ticketIssuanceMode: e.target.value === "automatic" ? "automatic" : "manual" })} style={inputStyle}>
                      <option value="manual">إصدار يدوي</option>
                      <option value="automatic">إصدار تلقائي بعد القبول</option>
                    </select>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {methods.map((method) => (
                        <label key={method.key} style={{ fontSize: "0.78rem", fontWeight: 800 }}>
                          <input
                            type="checkbox"
                            disabled={!canManage}
                            checked={setting.methodKeys.includes(method.key)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...setting.methodKeys, method.key]
                                : setting.methodKeys.filter((key) => key !== method.key);
                              patchSetting(pkg.id, { methodKeys: next });
                            }}
                          /> {method.labelAr || method.key}
                        </label>
                      ))}
                    </div>
                  </div>
                  <textarea value={setting.instructionsAr} disabled={!canManage} onChange={(e) => patchSetting(pkg.id, { instructionsAr: e.target.value })} placeholder="تعليمات إضافية لهذه الباقة" style={{ ...inputStyle, marginTop: "0.65rem", minHeight: 70, width: "100%" }} />
                </div>
              );
            })}
          </div>
          {canManage && <button onClick={saveSettings} disabled={saving} style={{ ...primaryBtn, marginTop: "1rem" }}><Save size={16} /> حفظ الإعدادات</button>}
        </section>
      )}

      {!loading && tab === "methods" && (
        <section style={panelStyle}>
          <h2 style={sectionTitle}>طرق الدفع</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {methods.map((method, index) => (
              <div key={method.key} style={cardStyle}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 1fr 1fr 120px", gap: "0.75rem" }}>
                  <label style={{ fontWeight: 900 }}><input type="checkbox" checked={method.active} disabled={!canManage} onChange={(e) => setMethods(prev => prev.map((m, i) => i === index ? { ...m, active: e.target.checked } : m))} /> مفعل</label>
                  <input value={method.labelAr} disabled={!canManage} onChange={(e) => setMethods(prev => prev.map((m, i) => i === index ? { ...m, labelAr: e.target.value } : m))} style={inputStyle} />
                  <input value={method.accountIdentifier} disabled={!canManage} onChange={(e) => setMethods(prev => prev.map((m, i) => i === index ? { ...m, accountIdentifier: e.target.value } : m))} style={inputStyle} placeholder="رقم الحساب / الهاتف" />
                  <input type="number" value={method.sortOrder} disabled={!canManage} onChange={(e) => setMethods(prev => prev.map((m, i) => i === index ? { ...m, sortOrder: Number(e.target.value) || 0 } : m))} style={inputStyle} />
                </div>
                <textarea value={method.instructionsAr} disabled={!canManage} onChange={(e) => setMethods(prev => prev.map((m, i) => i === index ? { ...m, instructionsAr: e.target.value } : m))} style={{ ...inputStyle, marginTop: "0.65rem", minHeight: 80, width: "100%" }} placeholder="تعليمات الدفع" />
              </div>
            ))}
          </div>
          {canManage && <button onClick={saveSettings} disabled={saving} style={{ ...primaryBtn, marginTop: "1rem" }}><Save size={16} /> حفظ طرق الدفع</button>}
        </section>
      )}

      {!loading && tab === "history" && (
        <section style={panelStyle}>
          <h2 style={sectionTitle}>سجل المحاولات</h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {requests.flatMap(req => req.events.map(event => ({ req, event }))).map(({ req, event }) => (
              <div key={event.id} style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}><ShieldCheck size={16} /> {event.action}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.86rem" }}>{req.booking?.name} · {new Date(event.createdAt).toLocaleString("ar-EG")} · {event.actorName || "system"}</div>
                {event.note && <div style={noteStyle}>{event.note}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const panelStyle: CSSProperties = { background: "var(--bg-surface-solid)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "1rem" };
const cardStyle: CSSProperties = { background: "var(--bg-page)", border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.9rem" };
const sectionTitle: CSSProperties = { margin: 0, fontSize: "1.12rem" };
const inputStyle: CSSProperties = { border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.55rem 0.7rem", background: "var(--bg-surface-solid)", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif" };
const primaryBtn: CSSProperties = { border: 0, borderRadius: 8, padding: "0.65rem 0.95rem", background: "#00AAFF", color: "#fff", fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "Cairo, sans-serif" };
const secondaryBtn: CSSProperties = { border: "1px solid var(--border-strong)", borderRadius: 8, padding: "0.6rem 0.85rem", background: "var(--bg-surface-solid)", color: "var(--text-primary)", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "Cairo, sans-serif" };
const successBtn: CSSProperties = { ...secondaryBtn, borderColor: "#16A34A", color: "#16A34A" };
const dangerBtn: CSSProperties = { ...secondaryBtn, borderColor: "#DC2626", color: "#DC2626" };
const badgeStyle: CSSProperties = { borderRadius: 999, padding: "0.25rem 0.65rem", fontSize: "0.78rem", fontWeight: 900 };
const noteStyle: CSSProperties = { background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.22)", borderRadius: 8, padding: "0.65rem", color: "var(--text-primary)" };
const emptyStyle: CSSProperties = { padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontWeight: 800 };
const thumbStyle: CSSProperties = { width: 72, height: 72, borderRadius: 8, border: "1px solid var(--border-strong)", background: "var(--bg-surface-solid)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", fontWeight: 900, textDecoration: "none" };
