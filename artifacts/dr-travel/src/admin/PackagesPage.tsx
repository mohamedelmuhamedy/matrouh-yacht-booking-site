import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";

export default function PackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const load = () => {
    setLoading(true);
    adminFetch("/admin/packages").then(r => r.json()).then(data => {
      setPackages(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const del = async (id: number, name: string) => {
    if (!confirm(`هل تريد حذف باقة "${name}"؟`)) return;
    await adminFetch(`/admin/packages/${id}`, { method: "DELETE" });
    load();
  };

  const toggleActive = async (pkg: any) => {
    await adminFetch(`/admin/packages/${pkg.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...pkg, active: !pkg.active }),
    });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          الباقات السياحية <span style={{ color: "#00AAFF" }}>({packages.length})</span>
        </h2>
        <button onClick={() => navigate("/admin/packages/new")}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          + باقة جديدة
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {packages.map(pkg => (
            <div key={pkg.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderRight: `4px solid ${pkg.color || "#00AAFF"}`, opacity: pkg.active ? 1 : 0.6, transition: "opacity 0.2s" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                {/* Image thumbnail */}
                {pkg.images?.[0] && (
                  <img src={pkg.images[0]} alt={pkg.titleAr}
                    style={{ width: 80, height: 60, objectFit: "cover", borderRadius: "10px", flexShrink: 0 }} />
                )}
                {!pkg.images?.[0] && (
                  <div style={{ width: 80, height: 60, borderRadius: "10px", background: `${pkg.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                    {pkg.icon}
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                    <span style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem" }}>{pkg.titleAr}</span>
                    {!pkg.active && <span style={{ background: "#f3f4f6", color: "#9ca3af", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>مخفية</span>}
                    {pkg.featured && <span style={{ background: "#FEF3C7", color: "#D97706", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>مميزة</span>}
                    {pkg.popular && <span style={{ background: "#EFF6FF", color: "#3B82F6", padding: "0.2rem 0.6rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700 }}>الأكثر طلباً</span>}
                  </div>
                  <div style={{ color: "#667788", fontSize: "0.82rem" }}>{pkg.titleEn}</div>
                  <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#99aabb" }}>
                    <span>💰 {pkg.priceEGP?.toLocaleString()} – {pkg.maxPriceEGP?.toLocaleString()} جنيه</span>
                    <span>⏱️ {pkg.durationAr}</span>
                    <span>⭐ {pkg.rating} ({pkg.reviewCount})</span>
                    <span>#{pkg.id} · {pkg.slug}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button onClick={() => toggleActive(pkg)}
                    style={{ padding: "0.45rem 0.85rem", border: `1px solid ${pkg.active ? "#e0e8f0" : "#25D366"}`, borderRadius: "8px", cursor: "pointer", background: pkg.active ? "#f9fafb" : "#25D36610", color: pkg.active ? "#667788" : "#25D366", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
                    {pkg.active ? "🙈 إخفاء" : "👁️ إظهار"}
                  </button>
                  <button onClick={() => navigate(`/admin/packages/${pkg.id}/edit`)}
                    style={{ padding: "0.45rem 0.85rem", border: "1px solid #00AAFF30", borderRadius: "8px", cursor: "pointer", background: "#00AAFF08", color: "#00AAFF", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", fontWeight: 600 }}>
                    ✏️ تعديل
                  </button>
                  <button onClick={() => del(pkg.id, pkg.titleAr)}
                    style={{ padding: "0.45rem 0.85rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          {packages.length === 0 && (
            <div style={{ background: "white", borderRadius: "16px", padding: "4rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
              <p style={{ color: "#99aabb" }}>لا توجد باقات بعد. أضف أول باقة!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
