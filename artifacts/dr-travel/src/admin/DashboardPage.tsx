import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";

interface Stats {
  packages: number;
  bookings: number;
  testimonials: number;
  newBookings: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ packages: 0, bookings: 0, testimonials: 0, newBookings: 0 });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    Promise.all([
      adminFetch("/admin/packages").then(r => r.json()),
      adminFetch("/admin/bookings").then(r => r.json()),
      adminFetch("/admin/testimonials").then(r => r.json()),
    ]).then(([pkgs, bks, tests]) => {
      const bookingsArr = Array.isArray(bks) ? bks : [];
      setStats({
        packages: Array.isArray(pkgs) ? pkgs.length : 0,
        bookings: bookingsArr.length,
        testimonials: Array.isArray(tests) ? tests.length : 0,
        newBookings: bookingsArr.filter((b: any) => b.status === "new").length,
      });
      setRecentBookings(bookingsArr.slice(0, 5));
    }).finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "الباقات", value: stats.packages, icon: "🏖️", color: "#00AAFF", path: "/admin/packages" },
    { label: "الحجوزات", value: stats.bookings, icon: "📅", color: "#C9A84C", path: "/admin/bookings" },
    { label: "حجوزات جديدة", value: stats.newBookings, icon: "🔔", color: "#25D366", path: "/admin/bookings" },
    { label: "التقييمات", value: stats.testimonials, icon: "⭐", color: "#A855F7", path: "/admin/testimonials" },
  ];

  const statusColors: Record<string, string> = {
    new: "#3B82F6", contacted: "#F59E0B", confirmed: "#10B981", completed: "#6B7280", cancelled: "#EF4444"
  };
  const statusLabels: Record<string, string> = {
    new: "جديد", contacted: "تم التواصل", confirmed: "مؤكد", completed: "مكتمل", cancelled: "ملغي"
  };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div>;

  return (
    <div>
      <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.5rem", marginBottom: "1.5rem" }}>مرحباً بك في لوحة التحكم 👋</h2>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {cards.map(card => (
          <button key={card.label} onClick={() => navigate(card.path)}
            style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", border: `1px solid ${card.color}20`, textAlign: "right", transition: "all 0.2s", fontFamily: "Cairo, sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{card.icon}</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 900, color: card.color, fontFamily: "Montserrat, sans-serif" }}>{card.value}</div>
            <div style={{ color: "#667788", fontSize: "0.9rem", fontWeight: 600 }}>{card.label}</div>
          </button>
        ))}
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
                  <tr key={b.id} style={{ borderBottom: "1px solid #f0f4f8" }}>
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
