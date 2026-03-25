import { useEffect, useState, useRef } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

const STATUS_OPTIONS = [
  { value: "new", label: "جديد", color: "#3B82F6" },
  { value: "contacted", label: "تم التواصل", color: "#F59E0B" },
  { value: "confirmed", label: "مؤكد", color: "#10B981" },
  { value: "completed", label: "مكتمل", color: "#6B7280" },
  { value: "cancelled", label: "ملغي", color: "#EF4444" },
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [noteBooking, setNoteBooking] = useState<any | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const { success, error: toastError } = useToast();
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    if (q !== undefined ? q : search) params.set("search", q !== undefined ? q : search);
    adminFetch(`/admin/bookings?${params}`).then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : []);
    }).catch(() => { toastError("فشل تحميل الحجوزات"); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => load(val), 400);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    try {
      const r = await adminFetch(`/admin/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      success("تم تحديث الحالة");
    } catch { toastError("فشل تحديث الحالة"); }
    setUpdating(null);
  };

  const saveNote = async () => {
    if (!noteBooking) return;
    try {
      const r = await adminFetch(`/admin/bookings/${noteBooking.id}/notes`, { method: "PUT", body: JSON.stringify({ adminNotes: noteText }) });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.map(b => b.id === noteBooking.id ? { ...b, adminNotes: noteText } : b));
      setNoteBooking(null);
      success("تم حفظ الملاحظة");
    } catch { toastError("فشل حفظ الملاحظة"); }
  };

  const deleteBooking = async (id: number) => {
    try {
      const r = await adminFetch(`/admin/bookings/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setBookings(prev => prev.filter(b => b.id !== id));
      success("تم حذف الحجز");
    } catch { toastError("فشل حذف الحجز"); }
    setConfirmDelete(null);
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const r = await adminFetch("/admin/bookings/export/csv");
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      success("تم تصدير الحجوزات");
    } catch { toastError("فشل تصدير الحجوزات"); }
    setExporting(false);
  };

  const counts: Record<string, number> = {};
  bookings.forEach(b => { counts[b.status] = (counts[b.status] || 0) + 1; });

  const whatsappLink = (phone: string, name: string) => {
    const msg = encodeURIComponent(`أهلاً ${name}، شكراً لتواصلك مع DR Travel. نحن سعداء بخدمتك 😊`);
    const num = phone.replace(/\D/g, "");
    const intl = num.startsWith("0") ? "2" + num : num.startsWith("20") ? num : "20" + num;
    return `https://wa.me/${intl}?text=${msg}`;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          إدارة الحجوزات <span style={{ color: "#00AAFF" }}>({bookings.length})</span>
        </h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={() => load()} style={{ background: "#f0f4f8", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, color: "#667788" }}>
            🔄 تحديث
          </button>
          <button onClick={exportCSV} disabled={exporting}
            style={{ background: "#10B981", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "white", opacity: exporting ? 0.7 : 1 }}>
            📥 {exporting ? "جاري التصدير..." : "تصدير CSV"}
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text" value={search} onChange={e => handleSearchChange(e.target.value)}
          placeholder="🔍 بحث بالاسم أو الهاتف أو الباقة..."
          style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", outline: "none", boxSizing: "border-box", direction: "rtl" }}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <FilterTab value="all" current={filter} count={bookings.length} label="الكل" color="#667788" onClick={v => setFilter(v)} />
        {STATUS_OPTIONS.map(s => (
          <FilterTab key={s.value} value={s.value} current={filter} count={counts[s.value] || 0} label={s.label} color={s.color} onClick={v => setFilter(v)} />
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          جاري التحميل...
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ background: "white", borderRadius: "16px", padding: "4rem", textAlign: "center", color: "#99aabb" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
          <p style={{ fontWeight: 600 }}>لا توجد حجوزات {search ? "تطابق البحث" : "في هذا التصنيف"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {bookings.map(b => {
            const sObj = STATUS_OPTIONS.find(s => s.value === b.status) || STATUS_OPTIONS[0];
            return (
              <div key={b.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderRight: `4px solid ${sObj.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem" }}>{b.name}</span>
                      <span style={{ background: `${sObj.color}15`, color: sObj.color, padding: "0.2rem 0.65rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 700 }}>
                        {sObj.label}
                      </span>
                      {b.packageNameAr && (
                        <span style={{ background: "#00AAFF15", color: "#00AAFF", padding: "0.2rem 0.65rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 600 }}>
                          {b.packageNameAr}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", color: "#667788", fontSize: "0.875rem" }}>
                      <span>📞 <span style={{ direction: "ltr", display: "inline-block" }}>{b.phone}</span></span>
                      <span>📅 {b.date}</span>
                      <span>👥 {b.adults} كبار {b.children > 0 ? `+ ${b.children} أطفال` : ""}</span>
                      {b.priceAtBooking && <span>💰 {b.priceAtBooking.toLocaleString("ar-EG")} {b.currency}</span>}
                    </div>
                    {b.notes && (
                      <div style={{ marginTop: "0.5rem", color: "#99aabb", fontSize: "0.82rem", background: "#f9fafb", borderRadius: "6px", padding: "0.4rem 0.75rem" }}>
                        📝 ملاحظة العميل: {b.notes}
                      </div>
                    )}
                    {b.adminNotes && (
                      <div style={{ marginTop: "0.4rem", fontSize: "0.82rem", background: "#fffbeb", borderRadius: "6px", padding: "0.4rem 0.75rem", color: "#92400e", borderRight: "3px solid #F59E0B" }}>
                        🔒 ملاحظة داخلية: {b.adminNotes}
                      </div>
                    )}
                    <div style={{ color: "#c0ccd8", fontSize: "0.75rem", marginTop: "0.35rem" }}>
                      #{b.id} · {new Date(b.createdAt).toLocaleString("ar-EG")}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                    <select value={b.status} disabled={updating === b.id}
                      onChange={e => updateStatus(b.id, e.target.value)}
                      style={{ padding: "0.4rem 0.75rem", borderRadius: "8px", border: `1.5px solid ${sObj.color}`, color: sObj.color, fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 700, background: `${sObj.color}08`, cursor: "pointer", outline: "none" }}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <a href={whatsappLink(b.phone, b.name)} target="_blank" rel="noreferrer"
                        style={{ background: "#25D366", color: "white", border: "none", borderRadius: "8px", padding: "0.4rem 0.75rem", cursor: "pointer", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        💬 واتساب
                      </a>
                      <button onClick={() => { setNoteBooking(b); setNoteText(b.adminNotes || ""); }}
                        style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #F59E0B", borderRadius: "8px", padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                        📌 ملاحظة
                      </button>
                      <button onClick={() => setConfirmDelete(b.id)}
                        style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Note modal */}
      {noteBooking && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setNoteBooking(null)}>
          <div style={{ background: "white", borderRadius: "16px", padding: "1.75rem", maxWidth: "480px", width: "100%" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem", color: "#0D1B2A", fontFamily: "Cairo, sans-serif" }}>
              ملاحظة داخلية — {noteBooking.name}
            </h3>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
              placeholder="أضف ملاحظة داخلية للأدمن..."
              style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", outline: "none", resize: "vertical", boxSizing: "border-box", direction: "rtl" }} />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button onClick={() => setNoteBooking(null)} style={{ background: "#f0f4f8", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600 }}>إلغاء</button>
              <button onClick={saveNote} style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: "8px", padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="حذف الحجز"
        message="هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => confirmDelete !== null && deleteBooking(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function FilterTab({ value, current, count, label, color, onClick }: { value: string; current: string; count: number; label: string; color: string; onClick: (v: string) => void; }) {
  const active = value === current;
  return (
    <button onClick={() => onClick(value)}
      style={{ background: active ? color : "white", color: active ? "white" : color, border: `1.5px solid ${color}`, borderRadius: "50px", padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", fontWeight: 700, transition: "all 0.2s" }}>
      {label} {count > 0 && <span style={{ background: active ? "rgba(255,255,255,0.3)" : `${color}20`, borderRadius: "50px", padding: "0.1rem 0.4rem", marginRight: "0.25rem" }}>{count}</span>}
    </button>
  );
}
