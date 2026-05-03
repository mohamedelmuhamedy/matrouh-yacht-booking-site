import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";

interface Service {
  id: number;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const { success, error: toastError } = useToast();
  const [, navigate] = useLocation();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [detailPagesEnabled, setDetailPagesEnabled] = useState(true);
  const [togglingFeature, setTogglingFeature] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [svcRes, setRes] = await Promise.all([
        adminFetch("/admin/services"),
        apiFetch("/api/settings"),
      ]);
      if (svcRes.ok) setServices(await svcRes.json());
      if (setRes.ok) {
        const s = await setRes.json().catch(() => null);
        if (s && typeof s === "object") {
          setDetailPagesEnabled(s.services_detail_pages_enabled !== "false");
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleDetailPagesFeature() {
    if (togglingFeature) return;
    setTogglingFeature(true);
    const next = !detailPagesEnabled;
    try {
      const r = await adminFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ services_detail_pages_enabled: next ? "true" : "false" }),
      });
      if (r.ok) {
        setDetailPagesEnabled(next);
        success(next ? "تم تفعيل صفحات التفاصيل" : "تم إيقاف صفحات التفاصيل");
      } else {
        const d = await r.json().catch(() => ({}));
        toastError(d.error || "فشل التحديث");
      }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setTogglingFeature(false);
  }

  async function toggleActive(svc: Service) {
    setBusy(true);
    try {
      // Fetch the full record first so PUT preserves all fields (long descriptions, features, CTA, etc.)
      const fr = await adminFetch(`/admin/services/${svc.id}`);
      if (!fr.ok) {
        toastError("فشل تحميل بيانات الخدمة");
        setBusy(false);
        return;
      }
      const full = await fr.json();
      const r = await adminFetch(`/admin/services/${svc.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...full, isActive: !svc.isActive }),
      });
      if (r.ok) { success("تم التحديث"); load(); }
      else { const d = await r.json().catch(() => ({})); toastError(d.error || "فشل التحديث"); }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setBusy(false);
  }

  async function handleDelete(id: number) {
    setBusy(true);
    try {
      const r = await adminFetch(`/admin/services/${id}`, { method: "DELETE" });
      if (r.ok) { success("تم الحذف"); setConfirmDelete(null); load(); }
      else { const d = await r.json().catch(() => ({})); toastError(d.error || "فشل الحذف"); }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setBusy(false);
  }

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.25rem" }}>
            إدارة الخدمات
          </h1>
          <p style={{ color: "var(--section-subtitle)", fontSize: "0.85rem", margin: 0 }}>
            هذه هي بطاقات الخدمات اللي بتظهر في الصفحة الرئيسية. كل خدمة لها صفحة تفاصيل خاصة بيها.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/services/new")}
          style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.65rem 1.4rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", whiteSpace: "nowrap" }}>
          + خدمة جديدة
        </button>
      </div>

      {/* Feature toggle: enable / disable service detail pages globally */}
      <div style={{ marginBottom: "1.25rem", background: detailPagesEnabled ? "#e8f4ff" : "#fef3c7", border: `1.5px solid ${detailPagesEnabled ? "#bcdcff" : "#fde68a"}`, borderRadius: 12, padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1.4rem" }}>{detailPagesEnabled ? "👁️" : "🚫"}</span>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "0.92rem" }}>
            صفحات تفاصيل الخدمات
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.15rem", lineHeight: 1.6 }}>
            {detailPagesEnabled
              ? "مفعّلة — الضغط على أي بطاقة خدمة بيفتح صفحة التفاصيل الخاصة بيها."
              : "موقوفة — البطاقات في الصفحة الرئيسية مش هتفتح صفحة تفاصيل."}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={detailPagesEnabled}
          onClick={toggleDetailPagesFeature}
          disabled={togglingFeature}
          aria-label={detailPagesEnabled ? "إيقاف صفحات التفاصيل" : "تفعيل صفحات التفاصيل"}
          style={{
            position: "relative", display: "inline-flex", alignItems: "center",
            width: 56, height: 30, borderRadius: 15, border: "none",
            cursor: togglingFeature ? "not-allowed" : "pointer",
            background: detailPagesEnabled ? "#00AAFF" : "var(--border)",
            transition: "background 0.2s", flexShrink: 0,
            opacity: togglingFeature ? 0.6 : 1,
          }}>
          <span style={{
            position: "absolute", top: 3, [detailPagesEnabled ? "right" : "left"]: 3,
            width: 24, height: 24, borderRadius: "50%", background: "var(--bg-surface-solid)",
            transition: "all 0.2s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          } as React.CSSProperties} />
        </button>
      </div>

      {/* List */}
      <div style={{ background: "var(--bg-surface-solid)", borderRadius: 16, padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid var(--border)" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 0", fontSize: "0.9rem" }}>جاري التحميل...</div>
        ) : services.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2.5rem 0", fontSize: "0.9rem", background: "var(--bg-surface-sunk)", borderRadius: 10 }}>
            لا توجد خدمات بعد — أضف خدمة من زر "خدمة جديدة"
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {services.map(svc => (
              <div key={svc.id} style={{ background: "var(--bg-surface-sunk)", border: "1.5px solid var(--border)", borderRadius: 12, padding: "0.9rem 1rem", opacity: svc.isActive ? 1 : 0.55 }}>
                {confirmDelete === svc.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#DC2626", fontSize: "0.86rem", flex: 1, fontWeight: 600 }}>
                      تأكيد حذف "{svc.titleAr}"؟ لا يمكن التراجع.
                    </span>
                    <button onClick={() => handleDelete(svc.id)} disabled={busy}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      تأكيد الحذف
                    </button>
                    <button onClick={() => setConfirmDelete(null)}
                      style={{ background: "var(--bg-surface-solid)", color: "var(--section-subtitle)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.45rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "1.65rem", flexShrink: 0, width: 42, height: 42, background: "var(--bg-surface-solid)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>{svc.icon}</span>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem" }}>{svc.titleAr}</span>
                        <span style={{ background: "#e8f4ff", color: "#0077cc", borderRadius: 6, padding: "0.15rem 0.55rem", fontSize: "0.7rem", fontFamily: "monospace", fontWeight: 600 }} dir="ltr">{svc.slug}</span>
                        {!svc.isActive && (
                          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "0.15rem 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}>مخفي</span>
                        )}
                      </div>
                      <div style={{ color: "var(--section-subtitle)", fontSize: "0.8rem", marginTop: "0.2rem", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                        {svc.descriptionAr}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <button onClick={() => toggleActive(svc)} disabled={busy} title={svc.isActive ? "إخفاء" : "إظهار"}
                        style={{ background: svc.isActive ? "#fef3c7" : "#dcfce7", color: svc.isActive ? "#92400e" : "#166534", border: "none", borderRadius: 8, padding: "0.4rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700 }}>
                        {svc.isActive ? "إخفاء" : "إظهار"}
                      </button>
                      <button onClick={() => navigate(`/admin/services/${svc.id}/edit`)}
                        style={{ background: "var(--bg-surface-solid)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.4rem 0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                        تعديل
                      </button>
                      <button onClick={() => setConfirmDelete(svc.id)}
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
