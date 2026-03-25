import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";
import { useAdmin } from "./AdminContext";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `منذ ${d} يوم`;
  if (h > 0) return `منذ ${h} ساعة`;
  if (m > 0) return `منذ ${m} دقيقة`;
  return "الآن";
}

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
  const recentBookings = [...bookings].slice(0, 5);
  const recentlyEdited = [...packages]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

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
  const pkgStatusBadge: Record<string, { label: string; color: string }> = {
    published: { label: "منشور", color: "#10B981" },
    draft: { label: "مسودة", color: "#F59E0B" },
    archived: { label: "أرشيف", color: "#6B7280" },
  };

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ background: "white", borderRadius: 16, height: 80, animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.35rem" }}>
            مرحباً {user?.displayName || user?.username} 👋
          </h2>
          <p style={{ color: "#667788", margin: 0, fontSize: "0.9rem" }}>
            هذا ملخص النشاط الحالي لموقع DR Travel
          </p>
        </div>
        {newBookings > 0 && (
          <button onClick={() => navigate("/admin/bookings")}
            style={{ background: "#EF444415", border: "1px solid #EF444430", borderRadius: 10, padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", color: "#EF4444", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block", animation: "ping 1.5s ease-in-out infinite" }} />
            {newBookings} حجز جديد
            <style>{`@keyframes ping { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
          </button>
        )}
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {cards.map(card => (
          <button key={card.label} onClick={() => navigate(card.path)}
            style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", border: `1px solid ${card.color}20`, textAlign: "right", transition: "all 0.2s", fontFamily: "Cairo, sans-serif" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
            <div style={{ fontSize: "1.75rem", marginBottom: "0.35rem" }}>{card.icon}</div>
            <div style={{ fontSize: "2.25rem", fontWeight: 900, color: card.color, fontFamily: "Montserrat, sans-serif", lineHeight: 1 }}>{card.value}</div>
            <div style={{ color: "#667788", fontSize: "0.82rem", fontWeight: 600, marginTop: "0.35rem" }}>{card.label}</div>
          </button>
        ))}
      </div>

      {/* Middle row: package status + recently edited */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Package status breakdown */}
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

          <div style={{ borderTop: "1px solid #f0f4f8", marginTop: "1rem", paddingTop: "1rem" }}>
            <h4 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.85rem", margin: "0 0 0.6rem" }}>📊 توزيع الحجوزات</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {Object.entries(statusLabels).map(([key, label]) => {
                const count = bookings.filter(b => b.status === key).length;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#667788", fontSize: "0.8rem" }}>{label}</span>
                    <span style={{ background: `${statusColors[key]}15`, color: statusColors[key], padding: "0.15rem 0.6rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 700 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recently edited packages */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ color: "#0D1B2A", fontWeight: 800, fontSize: "1rem", margin: 0 }}>✏️ آخر تعديلات الباقات</h3>
            <button onClick={() => navigate("/admin/packages")} style={{ color: "#00AAFF", background: "none", border: "none", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.8rem" }}>
              الكل ←
            </button>
          </div>
          {recentlyEdited.length === 0 ? (
            <p style={{ color: "#99aabb", textAlign: "center", padding: "1.5rem", fontSize: "0.85rem" }}>لا توجد باقات بعد</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {recentlyEdited.map(pkg => {
                const badge = pkgStatusBadge[pkg.status] || { label: pkg.status, color: "#667788" };
                return (
                  <div key={pkg.id}
                    onClick={() => navigate(`/admin/packages/${pkg.id}/edit`)}
                    style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.6rem", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span style={{ fontSize: "1.2rem" }}>{pkg.icon || "🏖️"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#0D1B2A", fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.titleAr}</div>
                      <div style={{ color: "#99aabb", fontSize: "0.75rem" }}>{timeAgo(pkg.updatedAt)}</div>
                    </div>
                    <span style={{ background: `${badge.color}15`, color: badge.color, padding: "0.15rem 0.5rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
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
          <div style={{ textAlign: "center", padding: "2.5rem", color: "#99aabb" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📭</div>
            <div style={{ fontWeight: 600 }}>لا توجد حجوزات بعد</div>
            <div style={{ fontSize: "0.82rem", marginTop: "0.35rem" }}>ستظهر الحجوزات هنا فور وصولها</div>
          </div>
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
                  <tr key={b.id} style={{ borderBottom: "1px solid #f0f4f8", cursor: "pointer" }}
                    onClick={() => navigate("/admin/bookings")}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600, color: "#0D1B2A" }}>{b.name}</td>
                    <td style={{ padding: "0.75rem", color: "#667788", direction: "ltr" }}>{b.phone}</td>
                    <td style={{ padding: "0.75rem", color: "#667788", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.packageNameAr || b.packageName || "—"}</td>
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
