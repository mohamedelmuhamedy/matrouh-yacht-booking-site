import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Armchair,
  BarChart3,
  BellRing,
  CalendarDays,
  Camera,
  ClipboardList,
  Compass,
  Film,
  Gift,
  Images,
  LayoutDashboard,
  ListChecks,
  MessageSquareQuote,
  PackageOpen,
  Percent,
  QrCode,
  ScrollText,
  Settings,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Tags,
  Ticket,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAdmin, adminFetch } from "./AdminContext";
import { apiUrl } from "../lib/api";
import ThemeSwitch from "../components/ThemeSwitch";
import type { AdminPermission } from "./permissions";
import "./admin-mobile.css";

function useAdminBrandName() {
  const [brand, setBrand] = useState<string>("DR TRAVEL");
  useEffect(() => {
    let alive = true;
    fetch(apiUrl("/api/settings"))
      .then(r => r.ok ? r.json() : null)
      .then((data: Record<string, string> | null) => {
        if (!alive || !data) return;
        if (typeof data.brand_name === "string" && data.brand_name.trim()) {
          setBrand(data.brand_name);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return brand;
}

type NavItem = { path: string; icon: string; label: string; permission: AdminPermission; badge?: "bookings" | "testimonials" };
const NAV: NavItem[] = [
  { path: "/admin/dashboard",    icon: "📊", label: "لوحة التحكم", permission: "dashboard.view" },
  { path: "/admin/stats",        icon: "📈", label: "الإحصائيات", permission: "stats.view" },
  { path: "/admin/calendar",     icon: "🗓️", label: "تقويم الحجوزات", permission: "calendar.view" },
  { path: "/admin/packages",     icon: "🏖️", label: "الباقات", permission: "trips.manage" },
  { path: "/admin/categories",   icon: "🏷️", label: "الفئات", permission: "categories.manage" },
  { path: "/admin/services",     icon: "🎯", label: "الخدمات", permission: "services.manage" },
  { path: "/admin/why-us",       icon: "✨", label: "مميزاتنا", permission: "why_us.manage" },
  { path: "/admin/bookings",     icon: "📅", label: "الحجوزات", permission: "bookings.view", badge: "bookings" },
  { path: "/admin/manual-tickets", icon: "🎫", label: "تذاكر يدوية", permission: "manual_tickets.view" },
  { path: "/admin/capacity",     icon: "🪑", label: "السعة", permission: "capacity.manage" },
  { path: "/admin/waitlist",     icon: "📋", label: "قائمة الانتظار", permission: "waiting_list.manage" },
  { path: "/admin/abandoned-carts", icon: "🛒", label: "العربات المتروكة", permission: "abandoned_carts.manage" },
  { path: "/admin/customer-photos", icon: "📸", label: "صور العملاء", permission: "customer_photos.manage" },
  { path: "/admin/scanner",      icon: "📷", label: "ماسح التذاكر", permission: "scanner.use" },
  { path: "/admin/promo-codes",  icon: "🎟️", label: "أكواد الخصم", permission: "promo_codes.manage" },
  { path: "/admin/rewards",      icon: "🎁", label: "المكافآت", permission: "rewards.manage" },
  { path: "/admin/gallery",      icon: "🖼️", label: "المعرض", permission: "gallery.manage" },
  { path: "/admin/reviews",      icon: "🌟", label: "تقييمات الرحلات", permission: "reviews.manage" },
  { path: "/admin/testimonials", icon: "⭐", label: "آراء العملاء", permission: "testimonials.manage", badge: "testimonials" },
  { path: "/admin/hero-slides",  icon: "🎬", label: "خلفية الهيرو", permission: "hero_slides.manage" },
  { path: "/admin/share-card",   icon: "🪪", label: "بطاقة المشاركة", permission: "share_card.manage" },
  { path: "/admin/push",         icon: "🔔", label: "الإشعارات", permission: "push.manage" },
  { path: "/admin/users",        icon: "👥", label: "المستخدمون", permission: "users.manage" },
  { path: "/admin/settings",     icon: "⚙️", label: "الإعدادات", permission: "settings.manage" },
  { path: "/admin/audit",        icon: "📜", label: "سجل التدقيق", permission: "audit.view" },
];
const BOTTOM_NAV = NAV.filter(n =>
  n.path !== "/admin/testimonials" &&
  n.path !== "/admin/settings" &&
  n.path !== "/admin/push" &&
  n.path !== "/admin/share-card"
);

const NAV_META: Record<string, { Icon: LucideIcon; tone: string }> = {
  "/admin/dashboard": { Icon: LayoutDashboard, tone: "#00AAFF" },
  "/admin/stats": { Icon: BarChart3, tone: "#38BDF8" },
  "/admin/calendar": { Icon: CalendarDays, tone: "#C9A84C" },
  "/admin/packages": { Icon: PackageOpen, tone: "#22C55E" },
  "/admin/categories": { Icon: Tags, tone: "#F59E0B" },
  "/admin/services": { Icon: Compass, tone: "#14B8A6" },
  "/admin/why-us": { Icon: Sparkles, tone: "#A855F7" },
  "/admin/bookings": { Icon: ClipboardList, tone: "#00AAFF" },
  "/admin/manual-tickets": { Icon: Ticket, tone: "#22C55E" },
  "/admin/capacity": { Icon: Armchair, tone: "#F97316" },
  "/admin/waitlist": { Icon: ListChecks, tone: "#84CC16" },
  "/admin/abandoned-carts": { Icon: ShoppingCart, tone: "#FB7185" },
  "/admin/customer-photos": { Icon: Images, tone: "#60A5FA" },
  "/admin/scanner": { Icon: QrCode, tone: "#C9A84C" },
  "/admin/promo-codes": { Icon: Percent, tone: "#F59E0B" },
  "/admin/rewards": { Icon: Gift, tone: "#EC4899" },
  "/admin/gallery": { Icon: Camera, tone: "#06B6D4" },
  "/admin/reviews": { Icon: Star, tone: "#FACC15" },
  "/admin/testimonials": { Icon: MessageSquareQuote, tone: "#818CF8" },
  "/admin/hero-slides": { Icon: Film, tone: "#F43F5E" },
  "/admin/share-card": { Icon: Share2, tone: "#2DD4BF" },
  "/admin/push": { Icon: BellRing, tone: "#F97316" },
  "/admin/users": { Icon: Users, tone: "#93C5FD" },
  "/admin/settings": { Icon: Settings, tone: "#CBD5E1" },
  "/admin/audit": { Icon: ScrollText, tone: "#A3E635" },
};

function NavIcon({ path, active, size = 18 }: { path: string; active: boolean; size?: number }) {
  const meta = NAV_META[path] || NAV_META["/admin/dashboard"];
  const Icon = meta.Icon;
  return (
    <span style={{
      width: size + 16,
      height: size + 16,
      borderRadius: 10,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      color: active ? "#071526" : meta.tone,
      background: active ? meta.tone : `${meta.tone}1f`,
      border: `1px solid ${active ? meta.tone : `${meta.tone}55`}`,
      boxShadow: active ? `0 8px 18px ${meta.tone}35` : "none",
      transition: "all 0.2s ease",
    }}>
      <Icon size={size} strokeWidth={2.35} />
    </span>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span style={{
      position: "absolute", top: -4, left: -4,
      minWidth: 18, height: 18, borderRadius: 9,
      background: "#EF4444", color: "white",
      fontSize: "0.62rem", fontWeight: 900,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 4px", lineHeight: 1,
      boxShadow: "0 0 0 2px #0D1B2A",
      fontFamily: "Cairo, sans-serif",
      zIndex: 10,
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function playBookingBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const play = (freq: number, start: number, dur: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0, ctx.currentTime + start);
      g.gain.linearRampToValueAtTime(0.35, ctx.currentTime + start + 0.02);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.05);
    };
    play(880, 0,    0.12);
    play(1100, 0.15, 0.12);
    play(1320, 0.30, 0.2);
  } catch {}
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const brandName = useAdminBrandName();
  const { user, logout, hasPermission } = useAdmin();
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [newCount, setNewCount] = useState(0);
  const [pendingTestimonials, setPendingTestimonials] = useState(0);
  const [toastMsg, setToastMsg] = useState("");
  const badgeFor = (b?: "bookings" | "testimonials") => b === "bookings" ? newCount : b === "testimonials" ? pendingTestimonials : 0;
  const visibleNav = NAV.filter(item => hasPermission(item.permission));
  const bottomNav = BOTTOM_NAV.filter(item => hasPermission(item.permission));
  const seenIds = useRef<Set<number>>(new Set());
  const initialized = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fetchCount = () => {
    if (!hasPermission("bookings.view")) {
      setNewCount(0);
      return;
    }
    adminFetch("/admin/bookings/new-count")
      .then(r => r.ok ? r.json() : { count: 0, ids: [] })
      .then(d => {
        const ids: number[] = d.ids ?? [];
        setNewCount(ids.length);

        if (!initialized.current) {
          // First load — populate seen list silently
          ids.forEach(id => seenIds.current.add(id));
          initialized.current = true;
          return;
        }

        const fresh = ids.filter(id => !seenIds.current.has(id));
        if (fresh.length > 0) {
          fresh.forEach(id => seenIds.current.add(id));
          playBookingBeep();
          setToastMsg(`🔔 ${fresh.length === 1 ? "حجز جديد" : `${fresh.length} حجوزات جديدة`} !`);
          setTimeout(() => setToastMsg(""), 5000);
        }
      })
      .catch(() => {});
  };

  const fetchPendingTestimonials = () => {
    if (!hasPermission("testimonials.manage")) {
      setPendingTestimonials(0);
      return;
    }
    adminFetch("/admin/testimonials/pending-count")
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setPendingTestimonials(d.count ?? 0))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCount();
    fetchPendingTestimonials();
    pollRef.current = setInterval(() => { fetchCount(); fetchPendingTestimonials(); }, 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Refresh count when navigating (admin may have acted)
  useEffect(() => {
    fetchCount();
    fetchPendingTestimonials();
  }, [location]);

  const navTo = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const Toast = toastMsg ? (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "linear-gradient(135deg, var(--bg-surface-solid), #1a3a5c)",
      color: "#fff", padding: "0.85rem 1.5rem", borderRadius: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,170,255,0.3)",
      fontFamily: "Cairo, sans-serif", fontSize: "0.95rem", fontWeight: 700,
      direction: "rtl", whiteSpace: "nowrap",
      animation: "fadeInDown 0.35s ease",
      cursor: "pointer",
    }} onClick={() => { navigate("/admin/bookings"); setToastMsg(""); }}>
      <style>{`@keyframes fadeInDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {toastMsg}
      <span style={{ marginRight: "0.5rem", fontSize: "0.75rem", opacity: 0.7 }}>اضغط للعرض</span>
    </div>
  ) : null;

  if (isMobile) {
    return (
      <div className="admin-wrap" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl", background: "var(--bg-page)" }}>
        {Toast}

        {/* Mobile top bar */}
        <header style={{ background: "linear-gradient(135deg,#06182a 0%,#0b4260 58%,#0D1B2A 100%)", padding: "0 1rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200, boxShadow: "0 2px 18px rgba(0,0,0,0.28)" }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{ background: "rgba(201,168,76,0.16)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 8, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.1rem", color: "#C9A84C", position: "relative" }}>
            ☰
            {newCount > 0 && (
              <span style={{ position: "absolute", top: -5, left: -5, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", color: "white", fontSize: "0.58rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxShadow: "0 0 0 2px #0D1B2A" }}>
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </button>
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#C9A84C", fontSize: "0.9rem", letterSpacing: "1px" }}>
            {brandName}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ThemeSwitch size="sm" />
            <a href="/" target="_blank" style={{ color: "#C9A84C", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "0.35rem 0.65rem" }}>
              🌐
            </a>
          </div>
        </header>

        {/* Drawer overlay */}
        {drawerOpen && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}
            onClick={() => setDrawerOpen(false)}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} />
            <div
              onClick={e => e.stopPropagation()}
              style={{ position: "relative", width: 268, maxWidth: "84vw", background: "linear-gradient(180deg,#06111f 0%,#0a2f45 48%,#06101e 100%)", height: "100dvh", maxHeight: "100dvh", display: "flex", flexDirection: "column", boxShadow: "4px 0 30px rgba(0,0,0,0.5)", marginRight: 0, overflow: "hidden" }}>
              {/* Drawer header */}
              <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: "#C9A84C", fontWeight: 900, fontSize: "0.95rem", fontFamily: "Montserrat, sans-serif", letterSpacing: "1px" }}>{brandName}</div>
                  <div style={{ color: "rgba(255,255,255,0.62)", fontSize: "0.65rem", marginTop: 2 }}>Admin Panel</div>
                </div>
                <button onClick={() => setDrawerOpen(false)}
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.74)", fontSize: "1rem" }}>
                  ✕
                </button>
              </div>

              {/* Nav items */}
              <nav style={{ flex: 1, minHeight: 0, padding: "0.75rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.3rem", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
                {visibleNav.map(item => {
                  const active = location.startsWith(item.path);
                  const count = badgeFor(item.badge);
                  const showBadge = count > 0;
                  return (
                    <button key={item.path} onClick={() => navTo(item.path)}
                      style={{ display: "flex", alignItems: "center", gap: "0.85rem", width: "100%", background: active ? "linear-gradient(90deg, rgba(0,170,255,0.22), rgba(201,168,76,0.12))" : "transparent", border: "none", borderRadius: 10, borderRight: active ? "3px solid #C9A84C" : "3px solid transparent", color: active ? "#ffffff" : "rgba(255,255,255,0.78)", padding: "0.85rem 1rem", cursor: "pointer", fontSize: "0.92rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 800 : 600, textAlign: "right", transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1.15rem", position: "relative", flexShrink: 0 }}>
                        <NavIcon path={item.path} active={active} />
                        <Badge count={showBadge ? count : 0} />
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {showBadge && (
                        <span style={{ background: "#EF4444", color: "white", fontSize: "0.7rem", fontWeight: 900, borderRadius: 9, padding: "2px 7px", fontFamily: "Cairo, sans-serif" }}>
                          {count > 99 ? "99+" : count} {item.badge === "testimonials" ? "قيد الانتظار" : "جديد"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* User + logout */}
              <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                <div style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.72rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
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

        {/* Bottom nav bar (horizontally scrollable when many items) */}
        <nav style={{ position: "fixed", bottom: 0, right: 0, left: 0, zIndex: 200, background: "linear-gradient(0deg,#06111f 0%,#0b2c42 100%)", borderTop: "1px solid rgba(201,168,76,0.24)", display: "flex", alignItems: "stretch", height: 64, boxShadow: "0 -4px 20px rgba(0,0,0,0.3)", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
          {bottomNav.map(item => {
            const active = location.startsWith(item.path);
            const count = badgeFor(item.badge);
            const showBadge = count > 0;
            return (
              <button key={item.path} onClick={() => navTo(item.path)}
                style={{ flex: "0 0 auto", minWidth: 64, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.2rem", background: "none", border: "none", cursor: "pointer", padding: "0.5rem 0.6rem", position: "relative", transition: "all 0.2s" }}>
                {active && (
                  <span style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: 2, background: "#C9A84C", borderRadius: "0 0 2px 2px" }} />
                )}
                <span style={{ fontSize: "1.1rem", lineHeight: 1, position: "relative" }}>
                  <NavIcon path={item.path} active={active} size={17} />
                  {showBadge && (
                    <span style={{ position: "absolute", top: -5, left: -6, minWidth: 16, height: 16, borderRadius: 8, background: "#EF4444", color: "white", fontSize: "0.55rem", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", boxShadow: "0 0 0 1.5px #0D1B2A" }}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
                  <span style={{ fontSize: "0.6rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 400, color: active ? "#C9A84C" : "rgba(255,255,255,0.68)", whiteSpace: "nowrap", letterSpacing: "0.3px" }}>
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
    <div className="admin-wrap" style={{ display: "flex", minHeight: "100vh", fontFamily: "Cairo, sans-serif", direction: "rtl", background: "var(--bg-page)" }}>
      {Toast}
      {/* Desktop sidebar */}
      <aside style={{ width: drawerOpen ? 224 : 68, height: "100vh", maxHeight: "100dvh", background: "linear-gradient(180deg,#06111f 0%,#0a2f45 48%,#06101e 100%)", transition: "width 0.3s ease", overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, right: 0, zIndex: 100, boxShadow: "0 0 30px rgba(0,0,0,0.34)" }}>
        <button onClick={() => setDrawerOpen(!drawerOpen)}
          style={{ background: "none", border: "none", color: "#C9A84C", fontSize: "1.4rem", cursor: "pointer", padding: "1.2rem", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.10)", flexShrink: 0 }}>
          {drawerOpen ? "✕" : "☰"}
        </button>

        {drawerOpen && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.10)", flexShrink: 0 }}>
            <div style={{ color: "#C9A84C", fontWeight: 900, fontSize: "1rem", letterSpacing: "1px" }}>{brandName}</div>
            <div style={{ color: "rgba(255,255,255,0.62)", fontSize: "0.7rem" }}>Admin Panel</div>
          </div>
        )}

        <nav style={{ flex: 1, minHeight: 0, padding: "0.75rem 0", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
          {visibleNav.map(item => {
            const active = location.startsWith(item.path);
            const count = badgeFor(item.badge);
            const showBadge = count > 0;
            return (
              <button key={item.path} onClick={() => navTo(item.path)}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", width: "100%", background: active ? "linear-gradient(90deg, rgba(0,170,255,0.22), rgba(201,168,76,0.12))" : "none", border: "none", borderRight: active ? "3px solid #C9A84C" : "3px solid transparent", color: active ? "#ffffff" : "rgba(255,255,255,0.78)", padding: "0.8rem 1rem", cursor: "pointer", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", fontWeight: active ? 800 : 600, transition: "all 0.2s", textAlign: "right", whiteSpace: "nowrap" }}>
                <span style={{ fontSize: "1.2rem", flexShrink: 0, position: "relative" }}>
                  <NavIcon path={item.path} active={active} />
                  <Badge count={showBadge ? count : 0} />
                </span>
                {drawerOpen && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {showBadge && (
                      <span style={{ background: "#EF4444", color: "white", fontSize: "0.65rem", fontWeight: 900, borderRadius: 9, padding: "2px 7px", flexShrink: 0, fontFamily: "Cairo, sans-serif" }}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255,255,255,0.10)", flexShrink: 0 }}>
          {drawerOpen && (
            <div style={{ color: "rgba(255,255,255,0.68)", fontSize: "0.7rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              👤 {user?.displayName || user?.username}
            </div>
          )}
          <button onClick={logout}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.2)", color: "#ff6b6b", borderRadius: "8px", padding: "0.5rem 0.75rem", cursor: "pointer", fontSize: "0.8rem", fontFamily: "Cairo, sans-serif", width: "100%", justifyContent: "center" }}>
            🚪{drawerOpen && " تسجيل الخروج"}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, marginRight: drawerOpen ? 224 : 68, transition: "margin-right 0.3s ease", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header style={{ background: "var(--bg-surface-solid)", padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 99 }}>
          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            {visibleNav.find(n => location.startsWith(n.path))?.label || "Admin"}
            {location.startsWith("/admin/bookings") && newCount > 0 && (
              <span style={{ background: "#EF4444", color: "white", fontSize: "0.7rem", fontWeight: 900, borderRadius: 9, padding: "2px 8px", fontFamily: "Cairo, sans-serif" }}>
                {newCount} جديد
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ color: "var(--section-subtitle)", fontSize: "0.8rem" }}>
              {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            <ThemeSwitch size="sm" />
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
