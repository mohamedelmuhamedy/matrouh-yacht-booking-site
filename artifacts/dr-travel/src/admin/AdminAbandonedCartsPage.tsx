import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Cart {
  id: number; sessionKey: string; name: string; phone: string;
  packageId: number | null; packageName: string; date: string;
  adults: number; children: number; estimatedValue: number;
  status: "active" | "contacted" | "recovered" | "lost";
  notes: string; contactedAt: string | null;
  recoveredBookingId: number | null; createdAt: string; updatedAt: string;
}

const LABELS: Record<string, string> = {
  active: "نشط", contacted: "تم التواصل", recovered: "تم الاسترجاع", lost: "ضائع",
};
const COLORS: Record<string, string> = {
  active: "#F59E0B", contacted: "#3B82F6", recovered: "#10B981", lost: "#94A3B8",
};

export default function AdminAbandonedCartsPage() {
  const [rows, setRows] = useState<Cart[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await adminFetch(`/admin/abandoned-carts?status=${filter}`);
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const update = async (id: number, patch: Partial<Cart>) => {
    await adminFetch(`/admin/abandoned-carts/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  };
  const remove = async (id: number) => {
    if (!confirm("حذف العربة؟")) return;
    await adminFetch(`/admin/abandoned-carts/${id}`, { method: "DELETE" });
    load();
  };

  const totals = useMemo(() => {
    const t = { count: rows.length, value: 0 };
    rows.forEach(r => { t.value += r.estimatedValue || 0; });
    return t;
  }, [rows]);

  const buildWhatsappMsg = (c: Cart) => {
    const pkg = c.packageName || "رحلتك";
    const date = c.date || "موعدك";
    return encodeURIComponent(
      `مرحباً ${c.name}،\nلاحظنا أنك بدأت حجز ${pkg} ليوم ${date}.\nهل نساعدك في إتمام الحجز؟ نقدم خصمًا خاصًا اليوم! 🎁\n— DR Travel`
    );
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>🛒 العربات المتروكة</h2>

      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
        {["active", "contacted", "recovered", "lost", "all"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? "#00AAFF" : "var(--bg-surface-solid)",
            color: filter === s ? "white" : "var(--text-primary)",
            border: "1px solid var(--border)", padding: ".4rem .8rem",
            borderRadius: 8, fontSize: ".85rem", fontWeight: 700, cursor: "pointer",
            fontFamily: "Cairo,sans-serif",
          }}>{s === "all" ? "الكل" : LABELS[s]}</button>
        ))}
        <span style={{ marginInlineStart: "auto", color: "var(--text-muted)", fontSize: ".9rem" }}>
          {totals.count} عربة • قيمة محتملة: {totals.value.toLocaleString("en-US")} ج.م
        </span>
      </div>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
       rows.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لا توجد عربات</div> :
       <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
         <table style={{ width: "100%", borderCollapse: "collapse" }}>
           <thead>
             <tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
               <th style={th}>الاسم</th><th style={th}>الهاتف</th>
               <th style={th}>الباقة</th><th style={th}>التاريخ</th>
               <th style={th}>عدد</th><th style={th}>القيمة</th>
               <th style={th}>الحالة</th><th style={th}>إجراء</th>
             </tr>
           </thead>
           <tbody>
             {rows.map(c => (
               <tr key={c.id}>
                 <td style={td}>{c.name || <em style={{ color: "var(--text-muted)" }}>—</em>}</td>
                 <td style={td}>
                   {c.phone ? (
                     <a href={`https://wa.me/2${c.phone}?text=${buildWhatsappMsg(c)}`} target="_blank"
                        style={{ color: "#10B981", textDecoration: "none", fontWeight: 700 }}>
                       {c.phone} 📱
                     </a>
                   ) : "—"}
                 </td>
                 <td style={td}>{c.packageName || "—"}</td>
                 <td style={td}>{c.date || "—"}</td>
                 <td style={td}>{c.adults + c.children}</td>
                 <td style={td}>{c.estimatedValue ? c.estimatedValue.toLocaleString("en-US") : "—"}</td>
                 <td style={td}>
                   <span style={{
                     background: COLORS[c.status] + "22", color: COLORS[c.status],
                     padding: "3px 8px", borderRadius: 6, fontSize: ".75rem", fontWeight: 700,
                   }}>{LABELS[c.status]}</span>
                 </td>
                 <td style={td}>
                   {c.status === "active" && c.phone && (
                     <button onClick={() => update(c.id, { status: "contacted" })} style={btn("#3B82F6")}>✓ تواصلت</button>
                   )}
                   {c.status === "contacted" && (
                     <button onClick={() => update(c.id, { status: "lost" })} style={btn("#94A3B8")}>ضائع</button>
                   )}
                   <button onClick={() => remove(c.id)} style={btn("#64748B")}>🗑️</button>
                 </td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
      }
    </div>
  );
}

const th: React.CSSProperties = { padding: ".6rem", borderBottom: "1px solid var(--border)", fontSize: ".85rem", fontWeight: 800 };
const td: React.CSSProperties = { padding: ".6rem", borderBottom: "1px solid var(--border)", fontSize: ".85rem" };
function btn(color: string): React.CSSProperties {
  return { background: color, color: "white", border: "none", padding: ".35rem .65rem", borderRadius: 6, fontSize: ".75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif", marginInlineEnd: 4 };
}
