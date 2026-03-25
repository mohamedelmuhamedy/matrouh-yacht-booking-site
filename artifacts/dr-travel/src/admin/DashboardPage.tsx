import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";
import { useAdmin } from "./AdminContext";

export default function DashboardPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { user } = useAdmin();

  useEffect(() => {
    Promise.all([
      adminFetch("/admin/packages").then(r => r.json()),
      adminFetch("/admin/bookings").then(r => r.json()),
      adminFetch("/admin/testimonials").then(r => r.json()),
    ]).then(([pkgs, bks, tests]) => {
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setBookings(Array.isArray(bks) ? bks : []);
      setTestimonials(Array.isArray(tests) ? tests : []);
    }).finally(() => setLoading(false));
  }, []);

  const published = packages.filter(p => p.status === "published" && p.active).length;
  const drafts = packages.filter(p => p.status === "draft").length;
  const archived = packages.filter(p => p.status === "archived").length;
  const newBookings = bookings.filter(b => b.status === "new").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  const recentBookings = [...bookings].slice(0, 6);

  const cards = [
    { label: "الباقات المنشورة", value: published, icon: "✅", color: "#10B981", path: "/admin/packages" },
    { label: "مسودات", value: drafts, icon: "📝", color: "#F59E0B", path: "/admin/packages" },
    { label: "حجوزات جديدة", value: newBookings, icon: "🔔", color: "#EF4444", path: "/admin/bookings" },
    { label: "حجوزات مؤكدة", value: confirmedBookings, icon: "✅", color: "#25D366", path: "/admin/bookings" },
    { label: "إجمالي الحجوزات", value: bookings.length, icon: "📅", color: "#00AAFF", path: "/admin/bookings" },
    { label: "التقييمات", value: testimonials.length, icon: "⭐", color: "#A855F7", path: "/admin/testimonials" },
  ];

  const statusColors: Record<string, string> = {
    new: "#3B82F6", contacted: "#F59E0B", confirmed: "#10B981", completed: "#6B7280", cancelled: "#EF4444"
  };
  const statusLabels: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", confirmed: "مؤكد", completed: "مكتمل", cancelled: "ملغي"
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "5rem", color: "#667788" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
      <div style={{ fontSize: "1.1rem" }}>جاري التحميل...</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.35rem" }}>
          مرحباً {user?.displayName || user?.username} 👋
        </h2>
        <p style={{ color: "#667788", margin: 0, fontSize: "0.9rem" }}>
          هذا ملخص النشاط الحالي لموقع DR Travel
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {cards.map(card => (
          <button key={card.label} onClick={() => navigate(card.path)}
            style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", border: `1px solid ${card.color}20`, textAlign: "right", transition: "all 0.2s", fontFamily: "Cairo, sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>{card.icon}</div>
            <div style={{ fontSize: "2.25rem", fontWeight: 900, color: card.color, fontFamily: "Montserrat, sans-serif", lineHeight: 1 }}>{card.value}</div>
            <div style={{ color: "#667788", fontSize: "0.85rem", fontWeight: 600, marginTop: "0.35rem" }}>{card.label}</div>
          </button>
        ))}
      </div>

      {/* Package status breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ color: "#0D1B2A", fontWeight: 800, fontSize: "1rem", margin: "0 0 1rem" }}>📦 حالة الباقات</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {[
              { label: "منشور", count: published, color: "#10B981" },
              { label: "مسودة", count: drafts, color: "#F59E0B" },
              { label: "أرشيف", count: archived, color: "#6B7280" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "#667788", fontSize: "0.875rem" }}>{item.label}</span>
                <span style={{ background: `${item.color}15`, color: item.color, padding: "0.2rem 0.75rem", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700 }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <h3 style={{ color: "#0D1B2A", fontWeight: 800, fontSize: "1rem", margin: "0 0 1rem" }}>📊 توزيع الحجوزات</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {Object.entries(statusLabels).map(([key, label]) => {
              const count = bookings.filter(b => b.status === key).length;
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#667788", fontSize: "0.875rem" }}>{label}</span>
                  <span style={{ background: `${statusColors[key]}15`, color: statusColors[key], padding: "0.2rem 0.75rem", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 700 }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ color: "#0D1B2A", fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>آخر الحجوزات</h3>
          <button onClick={() => navigate("/admin/bookings")} style={{ color: "#00AAFF", background: "none", border: "none", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>
            عرض الكل ←
          </button>
        </div>
        {recentBookings.length === 0 ? (
          <p style={{ color: "#99aabb", textAlign: "center", padding: "2rem" }}>لا توجد حجوزات بعد</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f4f8" }}>
                  {["الاسم", "الهاتف", "الباقة", "التاريخ", "الحالة"].map(h => (
                    <th key={h} style={{ padding: "0.75rem", color: "#667788", fontWeight: 700, textAlign: "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f0f4f8" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600, color: "#0D1B2A" }}>{b.name}</td>
                    <td style={{ padding: "0.75rem", color: "#667788", direction: "ltr" }}>{b.phone}</td>
                    <td style={{ padding: "0.75rem", color: "#667788" }}>{b.packageNameAr || b.packageName || "—"}</td>
                    <td style={{ padding: "0.75rem", color: "#667788" }}>{b.date}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ background: `${statusColors[b.status]}15`, color: statusColors[b.status], padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.8rem", fontWeight: 700 }}>
                        {statusLabels[b.status] || b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
