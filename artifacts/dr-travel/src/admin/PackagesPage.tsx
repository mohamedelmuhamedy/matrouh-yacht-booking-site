import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { storageObjectUrl } from "../lib/api";

const STATUS_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "منشور", color: "#10B981", bg: "#10B98115" },
  draft: { label: "مسودة", color: "#F59E0B", bg: "#F59E0B15" },
  archived: { label: "أرشيف", color: "#6B7280", bg: "#6B728015" },
};

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const [confirmArchive, setConfirmArchive] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const { success, error: toastError } = useToast();

  const load = () => {
    setLoading(true);
    adminFetch("/admin/packages").then(r => r.json()).then(data => {
      setPackages(Array.isArray(data) ? data : []);
    }).catch(() => toastError("فشل تحميل الباقات")).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const archivePackage = async (pkg: any) => {
    try {
      const r = await adminFetch(`/admin/packages/${pkg.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status: "archived", active: false } : p));
      success(`تم أرشفة "${pkg.titleAr}"`);
    } catch { toastError("فشل أرشفة الباقة"); }
    setConfirmArchive(null);
  };

  const deletePackage = async (pkg: any) => {
    try {
      const r = await adminFetch(`/admin/packages/${pkg.id}?force=true`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setPackages(prev => prev.filter(p => p.id !== pkg.id));
      success(`تم حذف "${pkg.titleAr}" نهائياً`);
    } catch { toastError("فشل حذف الباقة"); }
    setConfirmDelete(null);
  };

  const duplicate = async (id: number, titleAr: string) => {
    setDuplicating(id);
    try {
      const r = await adminFetch(`/admin/packages/${id}/duplicate`, { method: "POST" });
      if (!r.ok) throw new Error();
      success(`تم نسخ "${titleAr}" كمسودة`);
      load();
    } catch { toastError("فشل نسخ الباقة"); }
    setDuplicating(null);
  };

  const toggleActive = async (pkg: any) => {
    try {
      const r = await adminFetch(`/admin/packages/${pkg.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...pkg, active: !pkg.active }),
      });
      if (!r.ok) throw new Error();
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, active: !pkg.active } : p));
      success(pkg.active ? "تم إخفاء الباقة" : "تم إظهار الباقة");
    } catch { toastError("فشل تحديث الباقة"); }
  };

  const setStatus = async (pkg: any, status: string) => {
    try {
      const r = await adminFetch(`/admin/packages/${pkg.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...pkg, status, active: status === "published" }),
      });
      if (!r.ok) throw new Error();
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, status, active: status === "published" } : p));
      success(`تم تغيير حالة الباقة إلى ${STATUS_BADGES[status]?.label || status}`);
    } catch { toastError("فشل تحديث الحالة"); }
  };

  const published = packages.filter(p => p.status === "published").length;
  const drafts = packages.filter(p => p.status === "draft").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.35rem" }}>
            الباقات السياحية <span style={{ color: "#00AAFF" }}>({packages.length})</span>
          </h2>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem" }}>
            <span style={{ color: "#10B981", fontWeight: 600 }}>✅ منشور: {published}</span>
            <span style={{ color: "#F59E0B", fontWeight: 600 }}>📝 مسودة: {drafts}</span>
          </div>
        </div>
        <button onClick={() => navigate("/admin/packages/new")}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
          + باقة جديدة
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          جاري التحميل...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {packages.map(pkg => {
            const statusBadge = STATUS_BADGES[pkg.status] || STATUS_BADGES.draft;
            return (
              <div key={pkg.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderRight: `4px solid ${pkg.color || "#00AAFF"}`, opacity: pkg.status === "archived" ? 0.55 : 1, transition: "opacity 0.2s" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  {pkg.images?.[0] ? (
                    <img
                      src={storageObjectUrl(pkg.images[0])}
                      alt={pkg.titleAr}
                      style={{ width: 80, height: 60, objectFit: "cover", borderRadius: "10px", flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 80, height: 60, borderRadius: "10px", background: `${pkg.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                      {pkg.icon}
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                      <span style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem" }}>{pkg.titleAr}</span>
                      <span style={{ background: statusBadge.bg, color: statusBadge.color, padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>
                        {statusBadge.label}
                      </span>
                      {!pkg.active && pkg.status === "published" && (
                        <span style={{ background: "#f3f4f6", color: "#9ca3af", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>مخفية</span>
                      )}
                      {pkg.featured && <span style={{ background: "#FEF3C7", color: "#D97706", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>مميزة</span>}
                      {pkg.popular && <span style={{ background: "#EFF6FF", color: "#3B82F6", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>الأكثر طلباً</span>}
                    </div>
                    <div style={{ color: "#667788", fontSize: "0.82rem" }}>{pkg.titleEn}</div>
                    <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#99aabb" }}>
                      <span>💰 {pkg.priceEGP?.toLocaleString()} {pkg.maxPriceEGP ? `– ${pkg.maxPriceEGP?.toLocaleString()}` : ""} جنيه</span>
                      {pkg.durationAr && <span>⏱️ {pkg.durationAr}</span>}
                      <span>⭐ {pkg.rating} ({pkg.reviewCount})</span>
                      <span style={{ fontFamily: "monospace" }}>#{pkg.id} · {pkg.slug}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0, alignItems: "flex-end" }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <select value={pkg.status} onChange={e => setStatus(pkg, e.target.value)}
                        style={{ padding: "0.4rem 0.5rem", border: `1.5px solid ${statusBadge.color}`, borderRadius: "8px", color: statusBadge.color, fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700, background: statusBadge.bg, cursor: "pointer", outline: "none" }}>
                        <option value="published">منشور</option>
                        <option value="draft">مسودة</option>
                        <option value="archived">أرشيف</option>
                      </select>
                      {pkg.status !== "archived" && (
                        <button onClick={() => toggleActive(pkg)}
                          style={{ padding: "0.4rem 0.75rem", border: `1px solid ${pkg.active ? "#e0e8f0" : "#25D366"}`, borderRadius: "8px", cursor: "pointer", background: pkg.active ? "#f9fafb" : "#25D36610", color: pkg.active ? "#667788" : "#25D366", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                          {pkg.active ? "🙈 إخفاء" : "👁️ إظهار"}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => duplicate(pkg.id, pkg.titleAr)} disabled={duplicating === pkg.id}
                        style={{ padding: "0.4rem 0.75rem", border: "1px solid #A855F730", borderRadius: "8px", cursor: "pointer", background: "#A855F708", color: "#A855F7", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600, opacity: duplicating === pkg.id ? 0.6 : 1 }}>
                        📋 نسخ
                      </button>
                      <button onClick={() => navigate(`/admin/packages/${pkg.id}/edit`)}
                        style={{ padding: "0.4rem 0.75rem", border: "1px solid #00AAFF30", borderRadius: "8px", cursor: "pointer", background: "#00AAFF08", color: "#00AAFF", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                        ✏️ تعديل
                      </button>
                      <button onClick={() => setConfirmArchive(pkg)} title="أرشفة (تختفي من الموقع)"
                        style={{ padding: "0.4rem 0.75rem", border: "1px solid #F59E0B40", borderRadius: "8px", cursor: "pointer", background: "#FEF3C7", color: "#D97706", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                        📁 أرشفة
                      </button>
                      <button onClick={() => setConfirmDelete(pkg)} title="حذف نهائي من قاعدة البيانات"
                        style={{ padding: "0.4rem 0.75rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700 }}>
                        🗑️ حذف
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {packages.length === 0 && (
            <div style={{ background: "white", borderRadius: "16px", padding: "4rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
              <p style={{ color: "#99aabb", fontWeight: 600 }}>لا توجد باقات بعد. أضف أول باقة!</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmArchive !== null}
        title="📁 أرشفة الباقة"
        message={`هل تريد أرشفة "${confirmArchive?.titleAr}"؟\n\nستختفي من الموقع العام لكنها تبقى في قاعدة البيانات ويمكن إعادة نشرها لاحقاً.`}
        confirmLabel="أرشفة"
        cancelLabel="إلغاء"
        danger={false}
        onConfirm={() => confirmArchive && archivePackage(confirmArchive)}
        onCancel={() => setConfirmArchive(null)}
      />

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="🗑️ حذف نهائي للباقة"
        message={`هل تريد حذف "${confirmDelete?.titleAr}" نهائياً؟\n\nهذا الإجراء لا يمكن التراجع عنه. ستُمحى الباقة من قاعدة البيانات تماماً.`}
        confirmLabel="حذف نهائياً"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => confirmDelete && deletePackage(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
