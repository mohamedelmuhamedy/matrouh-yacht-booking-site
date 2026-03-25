import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

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
  const [updating, setUpdating] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/bookings").then(r => r.json()).then(data => {
      setBookings(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    setUpdating(id);
    await adminFetch(`/admin/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
    load();
    setUpdating(null);
  };

  const deleteBooking = async (id: number) => {
    if (!confirm("هل تريد حذف هذا الحجز؟")) return;
    await adminFetch(`/admin/bookings/${id}`, { method: "DELETE" });
    load();
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);
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
        <button onClick={load} style={{ background: "#f0f4f8", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, color: "#667788" }}>
          🔄 تحديث
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <FilterTab value="all" current={filter} count={bookings.length} label="الكل" color="#667788" onClick={setFilter} />
        {STATUS_OPTIONS.map(s => (
          <FilterTab key={s.value} value={s.value} current={filter} count={counts[s.value] || 0} label={s.label} color={s.color} onClick={setFilter} />
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: "16px", padding: "4rem", textAlign: "center", color: "#99aabb" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
          <p>لا توجد حجوزات في هذا التصنيف</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filtered.map(b => {
            const sObj = STATUS_OPTIONS.find(s => s.value === b.status) || STATUS_OPTIONS[0];
            return (
              <div key={b.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderRight: `4px solid ${sObj.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
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
                      {b.currency && <span>💰 {b.currency}</span>}
                    </div>
                    {b.notes && (
                      <div style={{ marginTop: "0.5rem", color: "#99aabb", fontSize: "0.82rem", background: "#f9fafb", borderRadius: "6px", padding: "0.4rem 0.75rem" }}>
                        📝 {b.notes}
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
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <a href={whatsappLink(b.phone, b.name)} target="_blank" rel="noreferrer"
                        style={{ background: "#25D366", color: "white", border: "none", borderRadius: "8px", padding: "0.4rem 0.75rem", cursor: "pointer", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        💬 واتساب
                      </a>
                      <button onClick={() => deleteBooking(b.id)}
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
