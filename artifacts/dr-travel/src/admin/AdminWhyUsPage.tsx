import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";

interface Card {
  id: number;
  slug: string;
  icon: string;
  color: string;
  titleAr: string;
  titleEn: string;
  shortDescAr: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminWhyUsPage() {
  const { success, error: toastError } = useToast();
  const [, navigate] = useLocation();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch("/admin/why-us");
      if (r.ok) setCards(await r.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(card: Card) {
    setBusy(true);
    try {
      const fr = await adminFetch(`/admin/why-us/${card.id}`);
      if (!fr.ok) { toastError("فشل تحميل البطاقة"); setBusy(false); return; }
      const full = await fr.json();
      const r = await adminFetch(`/admin/why-us/${card.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...full, isActive: !card.isActive }),
      });
      if (r.ok) { success("تم التحديث"); load(); }
      else { const d = await r.json().catch(() => ({})); toastError(d.error || "فشل التحديث"); }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setBusy(false);
  }

  async function handleDelete(id: number) {
    setBusy(true);
    try {
      const r = await adminFetch(`/admin/why-us/${id}`, { method: "DELETE" });
      if (r.ok) { success("تم الحذف"); setConfirmDelete(null); load(); }
      else { const d = await r.json().catch(() => ({})); toastError(d.error || "فشل الحذف"); }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.25rem" }}>
            مميزاتنا (Why Us)
          </h1>
          <p style={{ color: "var(--section-subtitle)", fontSize: "0.85rem", margin: 0 }}>
            البطاقات اللي بتظهر في قسم "ليه DR Travel؟" في الصفحة الرئيسية. كل بطاقة لها صفحة تفاصيل خاصة بيها.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/why-us/new")}
          style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.65rem 1.4rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
          + بطاقة جديدة
        </button>
      </div>

      <div style={{ background: "var(--bg-surface-solid)", borderRadius: 16, padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid var(--border)" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 0", fontSize: "0.9rem" }}>جاري التحميل...</div>
        ) : cards.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 0", fontSize: "0.9rem", background: "var(--bg-surface-sunk)", borderRadius: 10 }}>
            لا توجد بطاقات بعد — أضف بطاقة من زر "بطاقة جديدة"
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {cards.map(c => (
              <div key={c.id} style={{ background: "var(--bg-surface-sunk)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem", opacity: c.isActive ? 1 : 0.55 }}>
                {confirmDelete === c.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#DC2626", fontSize: "0.86rem", flex: 1, fontWeight: 600 }}>
                      تأكيد حذف "{c.titleAr}"؟ لا يمكن التراجع.
                    </span>
                    <button onClick={() => handleDelete(c.id)} disabled={busy}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      تأكيد الحذف
                    </button>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ background: "var(--bg-surface-solid)", color: "var(--section-subtitle)", border: "1px solid #d0dce8", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.65rem", flexShrink: 0, width: 42, height: 42, background: c.color + "18", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${c.color}33` }}>{c.icon}</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>{c.titleAr}</span>
                        <span style={{ background: "#e8f4ff", color: "#0077cc", borderRadius: 6, padding: "0.15rem 0.55rem", fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 600 }} dir="ltr">{c.slug}</span>
                        {!c.isActive && (
                          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "0.15rem 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}>مخفي</span>
                        )}
                      </div>
                      <div style={{ color: "var(--section-subtitle)", fontSize: "0.8rem", marginTop: "0.2rem", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        {c.shortDescAr}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <a href={`/why-us/${c.slug}`} target="_blank" rel="noopener noreferrer" title="معاينة" style={{ background: "#e8f4ff", color: "#0077cc", border: "none", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700, textDecoration: "none" }}>
                        👁️ معاينة
                      </a>
                      <button onClick={() => toggleActive(c)} disabled={busy}
                        style={{ background: c.isActive ? "#fef3c7" : "#dcfce7", color: c.isActive ? "#92400e" : "#166534", border: "none", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700 }}>
                        {c.isActive ? "إخفاء" : "إظهار"}
                      </button>
                      <button onClick={() => navigate(`/admin/why-us/${c.id}/edit`)}
                        style={{ background: "var(--bg-surface-solid)", color: "var(--text-muted)", border: "1px solid #d0dce8", borderRadius: 8, padding: "0.4rem 0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                        تعديل
                      </button>
                      <button onClick={() => setConfirmDelete(c.id)}
                        style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: 8, padding: "0.4rem 0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                        حذف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
