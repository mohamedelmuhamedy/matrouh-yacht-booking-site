import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Photo {
  id: number; bookingId: number; photoUrl: string; caption: string;
  customerName: string; packageId: number | null; tripDate: string;
  status: "pending" | "approved" | "rejected"; featured: number; createdAt: string;
}

const LABELS: Record<string, string> = { pending: "قيد المراجعة", approved: "موافق", rejected: "مرفوض" };
const COLORS: Record<string, string> = { pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" };

export default function AdminCustomerPhotosPage() {
  const [rows, setRows] = useState<Photo[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await adminFetch(`/admin/customer-photos?status=${filter}`);
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const update = async (id: number, patch: Partial<Photo>) => {
    await adminFetch(`/admin/customer-photos/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    load();
  };
  const remove = async (id: number) => {
    if (!confirm("حذف الصورة؟")) return;
    await adminFetch(`/admin/customer-photos/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>📸 صور العملاء</h2>

      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {["pending", "approved", "rejected", "all"].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            background: filter === s ? "#00AAFF" : "var(--bg-surface-solid)",
            color: filter === s ? "white" : "var(--text-primary)",
            border: "1px solid var(--border)", padding: ".4rem .8rem",
            borderRadius: 8, fontSize: ".85rem", fontWeight: 700, cursor: "pointer",
            fontFamily: "Cairo,sans-serif",
          }}>{s === "all" ? "الكل" : LABELS[s]}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
       rows.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لا توجد صور</div> :
       <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "1rem" }}>
         {rows.map(p => (
           <div key={p.id} style={{ background: "var(--bg-surface-solid)", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,.06)" }}>
             <div style={{ position: "relative", aspectRatio: "1/1", background: "#000" }}>
               <img src={p.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
               <span style={{
                 position: "absolute", top: 8, insetInlineStart: 8,
                 background: COLORS[p.status], color: "white",
                 padding: "3px 8px", borderRadius: 6, fontSize: ".7rem", fontWeight: 800,
               }}>{LABELS[p.status]}</span>
               {p.featured ? <span style={{
                 position: "absolute", top: 8, insetInlineEnd: 8,
                 background: "#F59E0B", color: "white", padding: "3px 8px",
                 borderRadius: 6, fontSize: ".7rem", fontWeight: 800,
               }}>⭐ مميزة</span> : null}
             </div>
             <div style={{ padding: ".75rem", fontSize: ".85rem" }}>
               <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.customerName}</div>
               <div style={{ color: "var(--text-muted)", fontSize: ".75rem" }}>#{p.bookingId} • {p.tripDate}</div>
               {p.caption && <div style={{ marginTop: ".4rem", color: "var(--text-muted)", fontSize: ".8rem" }}>{p.caption}</div>}
               <div style={{ display: "flex", gap: ".3rem", marginTop: ".6rem", flexWrap: "wrap" }}>
                 {p.status !== "approved" && <button onClick={() => update(p.id, { status: "approved" })} style={btn("#10B981")}>✓ موافقة</button>}
                 {p.status !== "rejected" && <button onClick={() => update(p.id, { status: "rejected" })} style={btn("#EF4444")}>✕ رفض</button>}
                 <button onClick={() => update(p.id, { featured: p.featured ? 0 : 1 })} style={btn(p.featured ? "#94A3B8" : "#F59E0B")}>{p.featured ? "إلغاء التميز" : "⭐ تمييز"}</button>
                 <button onClick={() => remove(p.id)} style={btn("#64748B")}>🗑️</button>
               </div>
             </div>
           </div>
         ))}
       </div>
      }
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { background: color, color: "white", border: "none", padding: ".35rem .65rem", borderRadius: 6, fontSize: ".75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" };
}
