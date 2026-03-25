import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "./AdminContext";

const NAV = [
  { path: "/admin/dashboard", icon: "📊", label: "لوحة التحكم" },
  { path: "/admin/packages",  icon: "🏖️", label: "الباقات" },
  { path: "/admin/bookings",  icon: "📅", label: "الحجوزات" },
  { path: "/admin/testimonials", icon: "⭐", label: "التقييمات" },
  { path: "/admin/settings",  icon: "⚙️", label: "الإعدادات" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdmin();
  const [location, navigate] = useLocation();
  const [sideOpen, setSideOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl", background: "#f0f4f8" }}>
      {/* Sidebar */}
      <aside style={{
        width: sideOpen ? 220 : 64, minHeight: "100vh",
        background: "linear-gradient(180deg,#0D1B2A 0%,#0a1420 100%)",
        transition: "width 0.3s ease", overflow: "hidden",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "fixed", top: 0, right: 0, zIndex: 100,
        boxShadow: "0 0 30px rgba(0,0,0,0.5)",
      }}>
        {/* Toggle */}
        <button onClick={() => setSideOpen(!sideOpen)}
          style={{ background: "none", border: "none", color: "#00AAFF", fontSize: "1.4rem", cursor: "pointer", padding: "1.2rem", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {sideOpen ? "✕" : "☰"}
        </button>

        {/* Logo */}
        {sideOpen && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ color: "#00AAFF", fontWeight: 900, fontSize: "1rem", letterSpacing: "1px" }}>DR TRAVEL</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>Admin Panel</div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto" }}>
          {NAV.map(item => {
            const active = location.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => { navigate(item.path); setSideOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  width: "100%", background: active ? "rgba(0,170,255,0.15)" : "none",
                  border: "none", borderRight: active ? "3px solid #00AAFF" : "3px solid transparent",
                  color: active ? "#00AAFF" : "rgba(255,255,255,0.6)",
                  padding: "0.8rem 1rem", cursor: "pointer", fontSize: "0.9rem",
                  fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 500,
                  transition: "all 0.2s", textAlign: "right", whiteSpace: "nowrap",
                }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{item.icon}</span>
                {sideOpen && item.label}
              </button>
            );
          })}
        </nav>

        {/* User + logout */}
        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {sideOpen && (
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              👤 {user?.displayName || user?.username}
            </div>
          )}
          <button onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", borderRadius: "8px", padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Cairo, sans-serif", width: "100%", justifyContent: "center" }}>
            🚪{sideOpen && " تسجيل الخروج"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginRight: sideOpen ? 220 : 64, transition: "margin-right 0.3s ease", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{ background: "white", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 99 }}>
          <div style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.95rem" }}>
            {NAV.find(n => location.startsWith(n.path))?.label || "Admin"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ color: "#667788", fontSize: "0.8rem" }}>
              {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            <a href="/" target="_blank" style={{ color: "#00AAFF", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600 }}>
              🌐 عرض الموقع
            </a>
          </div>
        </header>
        <div style={{ flex: 1, padding: "1.5rem" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
