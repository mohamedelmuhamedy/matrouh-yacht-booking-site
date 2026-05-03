import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Review {
  id: number; bookingId: number; rating: number; comment: string;
  customerName: string; photoUrls: string[] | null; status: "pending" | "approved" | "rejected";
  publishedAsTestimonial: number | null; createdAt: string;
}

const STATUS_LABELS: Record<string, string> = { pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض" };
const STATUS_COLORS: Record<string, string> = { pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" };

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const load = async () => {
    setLoading(true);
    const r = await adminFetch("/admin/reviews");
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: number, status: string) => {
    await adminFetch(`/admin/reviews/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const publish = async (id: number) => {
    if (!confirm("نشر التقييم كرأي عميل؟")) return;
    const r = await adminFetch(`/admin/reviews/${id}/publish`, { method: "POST" });
    if (!r.ok) alert((await r.json()).error || "فشل النشر");
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("حذف التقييم؟")) return;
    await adminFetch(`/admin/reviews/${id}`, { method: "DELETE" });
    load();
  };

  const visible = filter === "all" ? rows : rows.filter(r => r.status === filter);

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>⭐ تقييمات الرحلات</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? "#00AAFF" : "var(--bg-surface-2)", color: filter === f ? "white" : "var(--text-primary)", border: "1px solid var(--border)", padding: "0.5rem 1rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 700 }}>
            {f === "all" ? "الكل" : STATUS_LABELS[f]} ({f === "all" ? rows.length : rows.filter(r => r.status === f).length})
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
        visible.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لا توجد تقييمات</div> :
        <div style={{ display: "grid", gap: "0.85rem" }}>
          {visible.map(r => (
            <div key={r.id} style={{ background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "var(--text-primary)" }}>{r.customerName}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>حجز #{r.bookingId} · {new Date(r.createdAt).toLocaleString("ar-EG")}</div>
                </div>
                <div>
                  <span style={{ background: STATUS_COLORS[r.status] + "22", color: STATUS_COLORS[r.status], padding: "4px 10px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700 }}>{STATUS_LABELS[r.status]}</span>
                </div>
              </div>
              <div style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>{"⭐".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "0.75rem", whiteSpace: "pre-wrap" }}>{r.comment || <em style={{ color: "var(--text-muted)" }}>(بدون تعليق)</em>}</p>
              {r.photoUrls && r.photoUrls.length > 0 && (
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  {r.photoUrls.map((u, i) => <img key={i} src={u} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />)}
                </div>
              )}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {r.status !== "approved" && <button onClick={() => setStatus(r.id, "approved")} style={btn("#10B981")}>✓ اعتمد</button>}
                {r.status !== "rejected" && <button onClick={() => setStatus(r.id, "rejected")} style={btn("#EF4444")}>✗ ارفض</button>}
                {r.status === "approved" && !r.publishedAsTestimonial && <button onClick={() => publish(r.id)} style={btn("#00AAFF")}>📢 انشره كرأي عميل</button>}
                {r.publishedAsTestimonial && <span style={{ color: "#10B981", fontSize: "0.8rem", fontWeight: 700, alignSelf: "center" }}>✓ منشور</span>}
                <button onClick={() => remove(r.id)} style={btn("#64748B")}>🗑️ حذف</button>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function btn(color: string): React.CSSProperties {
  return { background: color, color: "white", border: "none", padding: "0.5rem 0.95rem", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontSize: "0.82rem" };
}
