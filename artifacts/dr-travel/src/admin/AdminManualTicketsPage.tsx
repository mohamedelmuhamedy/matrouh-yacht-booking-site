import { useEffect, useRef, useState } from "react";
import Ticket, { formatPhoneIntl, type TicketData } from "../components/Ticket";
import { adminFetch, useAdmin } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiUrl, resolveApiAssetUrl } from "../lib/api";
import { downloadQrPng } from "../components/ShareCardQR";
import logoFallback from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";

async function loadHtml2Canvas() {
  const m = await import("html2canvas");
  return m.default;
}

async function loadJsPDF() {
  const m = await import("jspdf");
  return m.default;
}

interface TripOption {
  id: number;
  titleAr: string;
  titleEn: string;
  priceEGP: number;
}

interface ManualTicketRow {
  kind: "booking" | "manual";
  id: number;
  name: string;
  phone: string;
  packageId: number | null;
  packageName: string;
  packageNameAr: string;
  date: string;
  passengerCount: number;
  pickupLocation: string;
  pickupLocationAr: string;
  meetingTime: string;
  supervisorName: string;
  supervisorPhone: string;
  remainingBalance: string;
  status: string;
  notes: string;
  ticketToken: string | null;
  ticketNumber?: string | null;
  ticketIssuedAt?: string | null;
  ticketUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  storageMode: "booking" | "manual";
}

const STATUS_OPTIONS = [
  { value: "new", label: "جديد" },
  { value: "contacted", label: "تم التواصل" },
  { value: "confirmed", label: "مؤكد" },
  { value: "client_confirmed", label: "مؤكد من العميل" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
];

const emptyForm = {
  name: "",
  phone: "",
  packageId: "",
  packageName: "",
  date: "",
  passengerCount: "1",
  pickupLocation: "",
  meetingTime: "",
  supervisorName: "",
  supervisorPhone: "",
  remainingBalance: "",
  status: "confirmed",
  notes: "",
};

type ManualTicketForm = typeof emptyForm;

export default function AdminManualTicketsPage() {
  const [rows, setRows] = useState<ManualTicketRow[]>([]);
  const [trips, setTrips] = useState<TripOption[]>([]);
  const [form, setForm] = useState<ManualTicketForm>(emptyForm);
  const [editing, setEditing] = useState<ManualTicketRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [convertToBookings, setConvertToBookings] = useState(true);
  const [ticketRow, setTicketRow] = useState<ManualTicketRow | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketBusy, setTicketBusy] = useState("");
  const [ticketLang, setTicketLang] = useState<"ar" | "en">("ar");
  const ticketRef = useRef<HTMLDivElement>(null);
  const { success, error: toastError } = useToast();
  const { hasPermission } = useAdmin();

  const canCreate = hasPermission("manual_tickets.create");
  const canEdit = hasPermission("manual_tickets.edit");
  const canDelete = hasPermission("manual_tickets.delete");

  const load = async () => {
    setLoading(true);
    try {
      const [listRes, tripsRes] = await Promise.all([
        adminFetch("/admin/manual-tickets"),
        adminFetch("/admin/manual-tickets/trips"),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setConvertToBookings(data.convertToBookings !== false);
      }
      if (tripsRes.ok) {
        const data = await tripsRes.json();
        setTrips(Array.isArray(data) ? data : []);
      }
    } catch {
      toastError("فشل تحميل التذاكر اليدوية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const payloadFromForm = () => ({
    name: form.name,
    phone: form.phone,
    packageId: form.packageId === "__custom" ? undefined : form.packageId || undefined,
    packageName: form.packageName,
    travelDate: form.date,
    passengerCount: Number.parseInt(form.passengerCount, 10) || 1,
    pickupPoint: form.pickupLocation,
    departureTime: form.meetingTime,
    supervisorName: form.supervisorName,
    supervisorPhone: form.supervisorPhone,
    remainingAmount: form.remainingBalance,
    status: form.status,
    notes: form.notes,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate && !editing) return;
    if (!canEdit && editing) return;
    setSaving(true);
    try {
      const path = editing ? `/admin/manual-tickets/${editing.kind}/${editing.id}` : "/admin/manual-tickets";
      const r = await adminFetch(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(payloadFromForm()),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "فشل حفظ التذكرة");
      }
      const data = await r.json();
      const item = data.item || data;
      if (editing) setRows(prev => prev.map(row => row.kind === item.kind && row.id === item.id ? item : row));
      else setRows(prev => [item, ...prev]);
      setForm(emptyForm);
      setEditing(null);
      success(editing ? "تم تعديل التذكرة" : "تم إنشاء التذكرة");
    } catch (err) {
      toastError(err instanceof Error ? err.message : "فشل حفظ التذكرة");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: ManualTicketRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      phone: row.phone,
      packageId: row.packageId ? String(row.packageId) : "__custom",
      packageName: row.packageId ? "" : (row.packageNameAr || row.packageName),
      date: row.date,
      passengerCount: String(row.passengerCount || 1),
      pickupLocation: row.pickupLocationAr || row.pickupLocation,
      meetingTime: row.meetingTime,
      supervisorName: row.supervisorName,
      supervisorPhone: row.supervisorPhone,
      remainingBalance: row.remainingBalance,
      status: row.status,
      notes: row.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateStatus = async (row: ManualTicketRow, status: string) => {
    if (!canEdit) return;
    const r = await adminFetch(`/admin/manual-tickets/${row.kind}/${row.id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      toastError("فشل تحديث الحالة");
      return;
    }
    const updated = await r.json();
    setRows(prev => prev.map(x => x.kind === row.kind && x.id === row.id ? updated : x));
  };

  const remove = async (row: ManualTicketRow) => {
    if (!canDelete || !confirm("حذف هذه التذكرة؟")) return;
    const r = await adminFetch(`/admin/manual-tickets/${row.kind}/${row.id}`, { method: "DELETE" });
    if (!r.ok) {
      toastError("فشل حذف التذكرة");
      return;
    }
    setRows(prev => prev.filter(x => !(x.kind === row.kind && x.id === row.id)));
    success("تم حذف التذكرة");
  };

  const reloadTicket = async (token: string) => {
    const r = await adminFetch(`/tickets/${encodeURIComponent(token)}`);
    if (!r.ok) return null;
    const data = await r.json() as TicketData;
    setTicketData(data);
    return data;
  };

  const openTicket = async (row: ManualTicketRow) => {
    setTicketRow(row);
    setTicketData(null);
    setTicketLoading(true);
    setTicketLang(row.packageNameAr ? "ar" : "en");
    try {
      const r = await adminFetch(`/admin/manual-tickets/${row.kind}/${row.id}/issue-ticket`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "issue failed");
      const { token } = await r.json();
      const data = await reloadTicket(token);
      if (!data) throw new Error("ticket load failed");
    } catch {
      toastError("فشل تجهيز التذكرة");
      setTicketRow(null);
    } finally {
      setTicketLoading(false);
    }
  };

  const closeTicket = () => {
    setTicketRow(null);
    setTicketData(null);
    setTicketBusy("");
  };

  const ticketPdfAbsoluteUrl = (token: string) => {
    const u = apiUrl(`/api/tickets/${token}.pdf`);
    return /^https?:\/\//i.test(u) ? u : `${window.location.origin}${u}`;
  };

  const generateTicketCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!ticketRef.current || !ticketData) return null;
    const node = ticketRef.current.querySelector("[data-ticket-root]") as HTMLElement | null;
    if (!node) return null;
    try {
      const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
      if (fonts?.ready) await fonts.ready;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 180));
    const html2canvas = await loadHtml2Canvas();
    return html2canvas(node, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: Math.ceil(node.offsetWidth || 800),
      height: Math.ceil(node.offsetHeight || 1130),
    });
  };

  const generateTicketPdfBlob = async (): Promise<Blob | null> => {
    const canvas = await generateTicketCanvas();
    if (!canvas) return null;
    const jsPDF = await loadJsPDF();
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const ratio = Math.min((pageW - margin * 2) / canvas.width, (pageH - margin * 2) / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    return pdf.output("blob");
  };

  const uploadTicketPdf = async (): Promise<string | null> => {
    if (!ticketRow || !ticketData) return null;
    const blob = await generateTicketPdfBlob();
    if (!blob) return null;
    const r = await adminFetch(`/admin/manual-tickets/${ticketRow.kind}/${ticketRow.id}/ticket-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: blob,
    });
    if (!r.ok) return null;
    const j = await r.json() as { token: string };
    await reloadTicket(j.token);
    return ticketPdfAbsoluteUrl(j.token);
  };

  const downloadPdf = async () => {
    if (!ticketData) return;
    setTicketBusy("pdf");
    try {
      const blob = await generateTicketPdfBlob();
      if (!blob) throw new Error("pdf");
      if (ticketRow) {
        await adminFetch(`/admin/manual-tickets/${ticketRow.kind}/${ticketRow.id}/ticket-pdf`, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: blob,
        }).catch(() => {});
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manual-ticket-${ticketData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      success("تم تنزيل PDF");
    } catch {
      toastError("فشل تنزيل PDF");
    } finally {
      setTicketBusy("");
    }
  };

  const downloadQr = async () => {
    if (!ticketData?.ticketToken) return;
    setTicketBusy("qr");
    try {
      const s = ticketData.settings || {};
      const url = `${window.location.origin}/verify/${ticketData.ticketToken}${ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : ""}`;
      await downloadQrPng({
        url,
        fg: s.card_qr_fg || "#0D1B2A",
        bg: s.card_qr_bg || "#ffffff",
        logoSrc: resolveApiAssetUrl(s.logo_url) || logoFallback,
        size: 1024,
        margin: 2,
        filename: `manual-ticket-${ticketData.ticketNumber || ticketData.id}-qr.png`,
      });
      success("تم تنزيل QR");
    } catch {
      toastError("فشل تنزيل QR");
    } finally {
      setTicketBusy("");
    }
  };

  const sendWhatsApp = async () => {
    if (!ticketData?.ticketToken) return;
    const popup = window.open("about:blank", "_blank");
    setTicketBusy("wa");
    try {
      const pdfUrl = await uploadTicketPdf();
      if (!pdfUrl) throw new Error("pdf");
      const pkg = ticketLang === "ar"
        ? ticketData.packageNameAr || ticketData.packageName
        : ticketData.packageName || ticketData.packageNameAr;
      const verifyUrl = `${window.location.origin}/verify/${ticketData.ticketToken}${ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : ""}`;
      const msg = ticketLang === "ar"
        ? `أهلاً ${ticketData.name}\nتم تجهيز تذكرتك مع DR Travel.\n\nالباقة: ${pkg}\nالتاريخ: ${ticketData.date}\nرقم التذكرة: ${ticketData.ticketNumber || ""}\nالمبلغ المتبقي: ${ticketData.remainingBalance || "—"}\n\nPDF:\n${pdfUrl}\n\nالتحقق:\n${verifyUrl}`
        : `Hi ${ticketData.name}\nYour DR Travel ticket is ready.\n\nTrip: ${pkg}\nDate: ${ticketData.date}\nTicket No.: ${ticketData.ticketNumber || ""}\nRemaining: ${ticketData.remainingBalance || "-"}\n\nPDF:\n${pdfUrl}\n\nVerify:\n${verifyUrl}`;
      const waUrl = `https://api.whatsapp.com/send?phone=${formatPhoneIntl(ticketData.phone)}&text=${encodeURIComponent(msg)}`;
      if (popup && !popup.closed) popup.location.href = waUrl;
      else window.open(waUrl, "_blank", "noopener,noreferrer");
      success("تم فتح واتساب");
    } catch {
      popup?.close();
      toastError("فشل تجهيز رسالة واتساب");
    } finally {
      setTicketBusy("");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ color: "var(--text-primary)", margin: 0, fontWeight: 900 }}>تذاكر يدوية</h2>
          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 4 }}>
            الوضع الحالي: {convertToBookings ? "تتحول إلى حجوزات عادية" : "تُحفظ كتذاكر مستقلة"}
          </div>
        </div>
        <button onClick={load} style={secondaryBtn}>تحديث</button>
      </div>

      {(canCreate || editing) && (
        <form onSubmit={submit} style={panel}>
          <div style={formGrid}>
            <Field label="اسم العميل" required value={form.name} onChange={v => setForm({ ...form, name: v })} />
            <Field label="رقم الهاتف" required value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
            <label style={fieldWrap}>
              <span style={labelStyle}>الرحلة</span>
              <select className="form-input" required value={form.packageId} onChange={e => setForm({ ...form, packageId: e.target.value, packageName: e.target.value === "__custom" ? form.packageName : "" })}>
                <option value="">اختر رحلة</option>
                {trips.map(t => <option key={t.id} value={t.id}>{t.titleAr || t.titleEn}</option>)}
                <option value="__custom">رحلة مخصصة بالاسم</option>
              </select>
            </label>
            {form.packageId === "__custom" && <Field label="اسم رحلة مخصص" required value={form.packageName} onChange={v => setForm({ ...form, packageName: v })} />}
            <Field label="تاريخ الرحلة" type="date" required value={form.date} onChange={v => setForm({ ...form, date: v })} />
            <Field label="عدد الركاب" type="number" required value={form.passengerCount} onChange={v => setForm({ ...form, passengerCount: v })} />
            <Field label="نقطة التجمع" required value={form.pickupLocation} onChange={v => setForm({ ...form, pickupLocation: v })} />
            <Field label="وقت الانطلاق" required value={form.meetingTime} onChange={v => setForm({ ...form, meetingTime: v })} />
            <Field label="اسم المشرف" required value={form.supervisorName} onChange={v => setForm({ ...form, supervisorName: v })} />
            <Field label="هاتف المشرف" required value={form.supervisorPhone} onChange={v => setForm({ ...form, supervisorPhone: v })} />
            <Field label="المبلغ المتبقي" required value={form.remainingBalance} onChange={v => setForm({ ...form, remainingBalance: v })} />
            <label style={fieldWrap}>
              <span style={labelStyle}>الحالة</span>
              <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </label>
          </div>
          <label style={{ ...fieldWrap, marginTop: "0.75rem" }}>
            <span style={labelStyle}>ملاحظات</span>
            <textarea className="form-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="submit" disabled={saving} style={primaryBtn}>{saving ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "إنشاء تذكرة"}</button>
            {editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm); }} style={secondaryBtn}>إلغاء</button>}
          </div>
        </form>
      )}

      {loading ? (
        <div style={emptyBox}>جاري التحميل...</div>
      ) : rows.length === 0 ? (
        <div style={emptyBox}>لا توجد تذاكر يدوية بعد</div>
      ) : (
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {rows.map(row => (
            <div key={`${row.kind}-${row.id}`} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 900 }}>{row.name}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>{row.phone} · {row.packageNameAr || row.packageName} · {row.date}</div>
                </div>
                <span style={{ ...pill, background: row.kind === "booking" ? "#DBEAFE" : "#DCFCE7", color: row.kind === "booking" ? "#1D4ED8" : "#166534" }}>
                  {row.kind === "booking" ? "حجز عادي" : "مستقلة"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.65rem", marginTop: "0.75rem", color: "var(--text-secondary)", fontSize: "0.84rem" }}>
                <span>الركاب: {row.passengerCount}</span>
                <span>الانطلاق: {row.meetingTime}</span>
                <span>التجمع: {row.pickupLocationAr || row.pickupLocation}</span>
                <span>المتبقي: {row.remainingBalance}</span>
                {row.ticketNumber && <span>التذكرة: {row.ticketNumber}</span>}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.85rem" }}>
                <select value={row.status} disabled={!canEdit} onChange={e => updateStatus(row, e.target.value)} className="form-input" style={{ width: 160 }}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                {canEdit && <button onClick={() => openTicket(row)} style={primaryBtn}>تذكرة</button>}
                {canEdit && <button onClick={() => startEdit(row)} style={secondaryBtn}>تعديل</button>}
                {canDelete && <button onClick={() => remove(row)} style={{ ...secondaryBtn, color: "#EF4444" }}>حذف</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {ticketRow && (
        <div style={overlay} onClick={closeTicket}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <h3 style={{ margin: 0, color: "var(--text-primary)" }}>تذكرة {ticketRow.name}</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["ar", "en"] as const).map(lang => (
                  <button key={lang} onClick={() => setTicketLang(lang)} style={ticketLang === lang ? primaryBtn : secondaryBtn}>{lang.toUpperCase()}</button>
                ))}
                <button onClick={closeTicket} style={secondaryBtn}>إغلاق</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              <button onClick={downloadPdf} disabled={!ticketData || !!ticketBusy} style={primaryBtn}>{ticketBusy === "pdf" ? "جاري..." : "PDF"}</button>
              <button onClick={downloadQr} disabled={!ticketData || !!ticketBusy} style={secondaryBtn}>{ticketBusy === "qr" ? "جاري..." : "QR"}</button>
              <button onClick={sendWhatsApp} disabled={!ticketData || !!ticketBusy} style={{ ...primaryBtn, background: "#25D366" }}>{ticketBusy === "wa" ? "جاري..." : "واتساب"}</button>
              {ticketData?.ticketToken && <a href={`/verify/${ticketData.ticketToken}${ticketData.ticketSignature ? `?sig=${encodeURIComponent(ticketData.ticketSignature)}` : ""}`} target="_blank" rel="noreferrer" style={secondaryLink}>صفحة التحقق</a>}
            </div>
            <div ref={ticketRef} style={{ background: "var(--border)", borderRadius: 14, padding: "1rem", overflow: "auto", display: "flex", justifyContent: "center" }}>
              {ticketLoading || !ticketData ? (
                <div style={{ padding: "3rem", color: "var(--text-muted)" }}>جاري تجهيز التذكرة...</div>
              ) : (
                <div style={{ transform: "scale(0.78)", transformOrigin: "top center", width: 800 }}>
                  <Ticket data={ticketData} lang={ticketLang} publicUrl={ticketData.ticketToken ? `${window.location.origin}/verify/${ticketData.ticketToken}` : ""} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label style={fieldWrap}>
      <span style={labelStyle}>{label}</span>
      <input className="form-input" type={type} required={required} value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

const panel: React.CSSProperties = { background: "var(--bg-surface-solid)", borderRadius: 14, padding: "1rem", marginBottom: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" };
const fieldWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 5 };
const labelStyle: React.CSSProperties = { color: "var(--text-secondary)", fontWeight: 800, fontSize: "0.8rem" };
const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 900, textDecoration: "none" };
const secondaryBtn: React.CSSProperties = { background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 800, textDecoration: "none" };
const secondaryLink: React.CSSProperties = { ...secondaryBtn, display: "inline-flex", alignItems: "center" };
const emptyBox: React.CSSProperties = { background: "var(--bg-surface-solid)", borderRadius: 14, padding: "2rem", textAlign: "center", color: "var(--text-muted)" };
const card: React.CSSProperties = { background: "var(--bg-surface-solid)", borderRadius: 14, padding: "1rem", border: "1px solid var(--border)", boxShadow: "0 1px 5px rgba(0,0,0,0.05)" };
const pill: React.CSSProperties = { borderRadius: 999, padding: "0.25rem 0.65rem", fontWeight: 900, fontSize: "0.78rem", height: "fit-content" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "flex-start", overflowY: "auto", padding: "1rem" };
const modal: React.CSSProperties = { background: "var(--bg-surface-sunk)", borderRadius: 18, padding: "1.25rem", maxWidth: 900, width: "100%", display: "flex", flexDirection: "column", gap: "0.5rem" };
