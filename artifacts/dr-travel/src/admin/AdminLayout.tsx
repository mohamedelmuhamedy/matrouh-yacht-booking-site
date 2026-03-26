import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "./AdminContext";

const NAV = [
  { path: "/admin/dashboard",    icon: "📊", label: "لوحة التحكم" },
  { path: "/admin/packages",     icon: "🏖️", label: "الباقات" },
  { path: "/admin/bookings",     icon: "📅", label: "الحجوزات" },
  { path: "/admin/rewards",      icon: "🎁", label: "المكافآت" },
  { path: "/admin/gallery",      icon: "🖼️", label: "المعرض" },
  { path: "/admin/testimonials", icon: "⭐", label: "التقييمات" },
  { path: "/admin/settings",     icon: "⚙️", label: "الإعدادات" },
];
const BOTTOM_NAV = NAV.filter(n => n.path !== "/admin/testimonials" && n.path !== "/admin/settings");

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdmin();
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navTo = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  if (isMobile) {
    return (
      <div className="admin-wrap" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl", background: "#f0f4f8" }}>

        {/* Mobile top bar */}
        <header style={{ background: "linear-gradient(135deg,#0D1B2A,#0a1420)", padding: "0 1rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "rgba(0,170,255,0.12)", border: "1px solid rgba(0,170,255,0.25)", borderRadius: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", color: "#00AAFF" }}>
            ☰
          </button>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#00AAFF", fontSize: "0.9rem", letterSpacing: "1px" }}>
            DR TRAVEL
          </div>
          <a href="/" target="_blank" style={{ color: "#00AAFF", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none", background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)", borderRadius: 8, padding: "0.35rem 0.65rem" }}>
            🌐
          </a>
        </header>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}
            onClick={() => setDrawerOpen(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: "relative", width: 260, maxWidth: "80vw", background: "linear-gradient(180deg,#0D1B2A,#0a1420)", height: "100vh", display: "flex", flexDirection: "column", boxShadow: "4px 0 30px rgba(0,0,0,0.5)", marginRight: 0 }}>
              {/* Drawer header */}
              <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "#00AAFF", fontWeight: 900, fontSize: "0.95rem", fontFamily: "Montserrat, sans-serif", letterSpacing: "1px" }}>DR TRAVEL</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.65rem", marginTop: 2 }}>Admin Panel</div>
                </div>
                <button onClick={() => setDrawerOpen(false)}
                  style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>
                  ✕
                </button>
              </div>

              {/* Nav items */}
              <nav style={{ flex: 1, padding: "0.75rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", overflowY: "auto" }}>
                {NAV.map(item => {
                  const active = location.startsWith(item.path);
                  return (
                    <button key={item.path} onClick={() => navTo(item.path)}
                      style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%", background: active ? "rgba(0,170,255,0.15)" : "transparent", border: "none", borderRadius: 10, borderRight: active ? "3px solid #00AAFF" : "3px solid transparent", color: active ? "#00AAFF" : "rgba(255,255,255,0.65)", padding: "0.85rem 1rem", cursor: "pointer", fontSize: "0.92rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 500, textAlign: "right", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* User + logout */}
              <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  👤 {user?.displayName || user?.username}
                </div>
                <button onClick={logout}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", borderRadius: 10, padding: "0.65rem", cursor: "pointer", fontSize: "0.85rem", fontFamily: "Cairo, sans-serif", width: "100%" }}>
                  🚪 تسجيل الخروج
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main style={{ flex: 1, padding: "1rem", paddingBottom: "90px", overflowX: "hidden" }}>
          {children}
        </main>

        {/* Bottom nav bar */}
        <nav style={{ position: "fixed", bottom: 0, right: 0, left: 0, zIndex: 200, background: "linear-gradient(0deg,#0D1B2A,#0a1420)", borderTop: "1px solid rgba(0,170,255,0.15)", display: "flex", alignItems: "stretch", height: 64, boxShadow: "0 -4px 20px rgba(0,0,0,0.3)" }}>
          {BOTTOM_NAV.map(item => {
            const active = location.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => navTo(item.path)}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.2rem", background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0.25rem", position: "relative", transition: "all 0.2s" }}>
                {active && (
                  <span style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: "#00AAFF", borderRadius: "0 0 2px 2px" }} />
                )}
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{item.icon}</span>
                <span style={{ fontSize: "0.6rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 400, color: active ? "#00AAFF" : "rgba(255,255,255,0.45)", whiteSpace: "nowrap", letterSpacing: "0.3px" }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="admin-wrap" style={{ display: "flex", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl", background: "#f0f4f8" }}>
      {/* Desktop sidebar */}
      <aside style={{ width: drawerOpen ? 220 : 64, minHeight: "100vh", background: "linear-gradient(180deg,#0D1B2A 0%,#0a1420 100%)", transition: "width 0.3s ease", overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, right: 0, zIndex: 100, boxShadow: "0 0 30px rgba(0,0,0,0.5)" }}>
        <button onClick={() => setDrawerOpen(!drawerOpen)}
          style={{ background: "none", border: "none", color: "#00AAFF", fontSize: "1.4rem", cursor: "pointer", padding: "1.2rem", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {drawerOpen ? "✕" : "☰"}
        </button>

        {drawerOpen && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ color: "#00AAFF", fontWeight: 900, fontSize: "1rem", letterSpacing: "1px" }}>DR TRAVEL</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.7rem" }}>Admin Panel</div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "0.75rem 0", overflowY: "auto" }}>
          {NAV.map(item => {
            const active = location.startsWith(item.path);
            return (
              <button key={item.path} onClick={() => navTo(item.path)}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", background: active ? "rgba(0,170,255,0.15)" : "none", border: "none", borderRight: active ? "3px solid #00AAFF" : "3px solid transparent", color: active ? "#00AAFF" : "rgba(255,255,255,0.6)", padding: "0.8rem 1rem", cursor: "pointer", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 500, transition: "all 0.2s", textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{item.icon}</span>
                {drawerOpen && item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
          {drawerOpen && (
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              👤 {user?.displayName || user?.username}
            </div>
          )}
          <button onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", borderRadius: "8px", padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Cairo, sans-serif", width: "100%", justifyContent: "center" }}>
            🚪{drawerOpen && " تسجيل الخروج"}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, marginRight: drawerOpen ? 220 : 64, transition: "margin-right 0.3s ease", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
