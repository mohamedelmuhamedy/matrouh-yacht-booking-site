import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./AdminContext";
import { resolveApiAssetUrl } from "../lib/api";

type ReviewStatus = "pending" | "approved" | "rejected";
type Filter = "all" | ReviewStatus;

interface Review {
  id: string;
  customerName: string;
  rating: number;
  reviewText: string;
  photos: string[];
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "في الانتظار",
  approved: "مقبول",
  rejected: "مرفوض",
};
const STATUS_COLORS: Record<ReviewStatus, { bg: string; fg: string; border: string }> = {
  pending: { bg: "#FEF3C7", fg: "#B45309", border: "#FDE68A" },
  approved: { bg: "#DCFCE7", fg: "#15803D", border: "#BBF7D0" },
  rejected: { bg: "#FEE2E2", fg: "#B91C1C", border: "#FECACA" },
};

function starLine(rating: number) {
  return Array.from({ length: 5 }, (_, i) => i < rating ? "★" : "☆").join("");
}

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState("");
  const [lightbox, setLightbox] = useState("");

  const load = async () => {
    setLoading(true);
    const r = await adminFetch("/admin/reviews");
    if (r.ok) {
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);

  const updateStatus = async (review: Review, status: ReviewStatus) => {
    setBusyId(review.id);
    const endpoint = status === "approved"
      ? `/admin/reviews/${review.id}/approve`
      : status === "rejected"
        ? `/admin/reviews/${review.id}/reject`
        : `/admin/reviews/${review.id}`;
    const r = await adminFetch(endpoint, {
      method: "PATCH",
      body: status === "pending" ? JSON.stringify({ status }) : undefined,
    });
    if (r.ok) {
      const updated = await r.json();
      setRows((prev) => prev.map((item) => item.id === review.id ? updated : item));
    }
    setBusyId("");
  };

  const remove = async (review: Review) => {
    if (!confirm("حذف هذا الرأي؟")) return;
    setBusyId(review.id);
    const r = await adminFetch(`/admin/reviews/${review.id}`, { method: "DELETE" });
    if (r.ok) setRows((prev) => prev.filter((item) => item.id !== review.id));
    setBusyId("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text-primary)", fontWeight: 950 }}>الآراء والتقييمات</h2>
          <p style={{ margin: "0.35rem 0 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>مراجعة آراء صفحة /reviews قبل نشرها للعملاء.</p>
        </div>
        <button onClick={load} style={secondaryBtn}>تحديث</button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {([
          ["all", "الكل"],
          ["pending", "في الانتظار"],
          ["approved", "مقبول"],
          ["rejected", "مرفوض"],
        ] as [Filter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={filter === key ? activeTab : tab}>
            {label} <span style={{ opacity: 0.75 }}>({counts[key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={emptyBox}>جارٍ التحميل...</div>
      ) : visible.length === 0 ? (
        <div style={emptyBox}>لا توجد آراء في هذا التصنيف</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {visible.map((review) => {
            const status = STATUS_COLORS[review.status];
            const busy = busyId === review.id;
            return (
              <article key={review.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 950 }}>{review.customerName}</div>
                    <div style={{ color: "#F59E0B", direction: "ltr", textAlign: "right", letterSpacing: 1 }}>{starLine(review.rating)}</div>
                  </div>
                  <span style={{ background: status.bg, color: status.fg, border: `1px solid ${status.border}`, borderRadius: 999, padding: "0.25rem 0.65rem", height: "fit-content", fontSize: "0.76rem", fontWeight: 950 }}>
                    {STATUS_LABELS[review.status]}
                  </span>
                </div>

                <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, whiteSpace: "pre-wrap", margin: "0 0 0.85rem" }}>{review.reviewText}</p>

                {review.photos?.length > 0 && (
                  <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
                    {review.photos.map((photo) => (
                      <button key={photo} type="button" onClick={() => setLightbox(photo)} style={{ padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}>
                        <img src={resolveApiAssetUrl(photo) || photo} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: "1px solid var(--border)" }} />
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginBottom: "0.85rem" }}>
                  {new Date(review.createdAt).toLocaleString("ar-EG")}
                </div>

                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {review.status !== "approved" && <button disabled={busy} onClick={() => updateStatus(review, "approved")} style={btn("#16A34A")}>قبول</button>}
                  {review.status !== "rejected" && <button disabled={busy} onClick={() => updateStatus(review, "rejected")} style={btn("#DC2626")}>رفض</button>}
                  <button disabled={busy} onClick={() => remove(review)} style={btn("#64748B")}>حذف</button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {lightbox && (
        <div onClick={() => setLightbox("")} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <button type="button" onClick={() => setLightbox("")} style={{ position: "fixed", top: 16, left: 16, width: 42, height: 42, borderRadius: "50%", border: "none", background: "white", cursor: "pointer", fontSize: "1.4rem" }}>×</button>
          <img onClick={(e) => e.stopPropagation()} src={resolveApiAssetUrl(lightbox) || lightbox} alt="" style={{ maxWidth: "100%", maxHeight: "88vh", objectFit: "contain", borderRadius: 16 }} />
        </div>
      )}
    </div>
  );
}

const tab: React.CSSProperties = { background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "0.55rem 0.9rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 850 };
const activeTab: React.CSSProperties = { ...tab, background: "#00AAFF", color: "white", borderColor: "#00AAFF" };
const card: React.CSSProperties = { background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: 14, padding: "1rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" };
const emptyBox: React.CSSProperties = { background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: 14, padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontWeight: 850 };
const secondaryBtn: React.CSSProperties = { background: "var(--bg-surface-solid)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 10, padding: "0.55rem 0.9rem", cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 850 };
function btn(color: string): React.CSSProperties {
  return { background: color, color: "white", border: "none", padding: "0.48rem 0.8rem", borderRadius: 9, fontWeight: 900, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontSize: "0.82rem" };
}
