import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch, useAdmin } from "./AdminContext";

const NAVY = "#0D1B2A";
const OCEAN = "#00AAFF";
const GOLD = "#C9A84C";

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

function fmtMoney(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ar-EG");
}

function fmtCount(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.round(n).toLocaleString("ar-EG");
}

function isoDay(d: Date): string {
  // Local-day key (yyyy-mm-dd) — avoids UTC off-by-one in non-UTC locales
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupSizeOf(b: { adults?: number; children?: number; infants?: number }): number {
  return (b.adults || 0) + (b.children || 0) + (b.infants || 0);
}

function parseBookingDate(s: string | undefined): Date | null {
  if (!s) return null;
  // Accept yyyy-mm-dd or yyyy/mm/dd or dd/mm/yyyy
  const m1 = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (m1) return new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const m2 = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(s);
  if (m2) return new Date(Number(m2[3]), Number(m2[2]) - 1, Number(m2[1]));
  const t = Date.parse(s);
  return isNaN(t) ? null : new Date(t);
}

interface Booking {
  id: number;
  name: string;
  phone: string;
  packageId?: number;
  packageName?: string;
  packageNameAr?: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  status: string;
  priceAtBooking?: number | null;
  ticketIssuedAt?: string | null;
  ticketUsedAt?: string | null;
  ticketNumber?: string | null;
  createdAt: string;
}
interface Pkg {
  id: number;
  titleAr: string;
  titleEn?: string;
  status: string;
  active?: boolean;
  icon?: string;
  updatedAt: string;
  priceEGP?: number;
}
interface Testimonial { id: number; status?: string; }

export default function DashboardPage() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAdmin();

  useEffect(() => {
    let alive = true;
    Promise.all([
      adminFetch("/admin/packages").then(r => r.json()),
      adminFetch("/admin/bookings").then(r => r.json()),
      adminFetch("/admin/testimonials").then(r => r.json()),
    ]).then(([pkgs, bks, tests]) => {
      if (!alive) return;
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setBookings(Array.isArray(bks) ? bks : []);
      setTestimonials(Array.isArray(tests) ? tests : []);
      setLastUpdated(new Date());
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshTick]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => setRefreshTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const today = isoDay(now);
    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const groupSize = groupSizeOf;
    const isPaid = (b: Booking) => b.status === "confirmed";
    const revenue = (b: Booking) => (b.priceAtBooking || 0);

    const thisMonthBookings = bookings.filter(b => new Date(b.createdAt) >= startOfMonth);
    const prevMonthBookings = bookings.filter(b => {
      const t = new Date(b.createdAt);
      return t >= startOfPrevMonth && t < endOfPrevMonth;
    });

    const revenueThisMonth = thisMonthBookings.filter(isPaid).reduce((s, b) => s + revenue(b), 0);
    const revenuePrevMonth = prevMonthBookings.filter(isPaid).reduce((s, b) => s + revenue(b), 0);
    const revenueDeltaPct = revenuePrevMonth > 0
      ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
      : (revenueThisMonth > 0 ? 100 : 0);

    const todaysTrips = bookings.filter(b => {
      const d = parseBookingDate(b.date);
      return d && isoDay(d) === today;
    });
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const upcoming7 = bookings.filter(b => {
      const d = parseBookingDate(b.date);
      if (!d) return false;
      const ms = d.getTime() - todayMidnight;
      return ms >= 0 && ms <= 7 * 24 * 3600 * 1000 && b.status !== "cancelled";
    });
    const checkedInToday = bookings.filter(b => {
      if (!b.ticketUsedAt) return false;
      return isoDay(new Date(b.ticketUsedAt)) === today;
    });
    const newBookingsToday = bookings.filter(b => isoDay(new Date(b.createdAt)) === today);
    const newBookingsWeek = bookings.filter(b => new Date(b.createdAt) >= startOfWeek);
    const totalGuestsThisMonth = thisMonthBookings.filter(isPaid).reduce((s, b) => s + groupSize(b), 0);
    const avgBookingValue = thisMonthBookings.filter(isPaid).length > 0
      ? revenueThisMonth / thisMonthBookings.filter(isPaid).length
      : 0;

    // Funnel
    const counts = {
      new: bookings.filter(b => b.status === "new").length,
      contacted: bookings.filter(b => b.status === "contacted").length,
      confirmed: bookings.filter(b => b.status === "confirmed").length,
      cancelled: bookings.filter(b => b.status === "cancelled").length,
    };
    const totalNonCancelled = counts.new + counts.contacted + counts.confirmed;
    const conversionPct = totalNonCancelled > 0
      ? Math.round((counts.confirmed / totalNonCancelled) * 100)
      : 0;

    // Action items
    const STALE_NEW_HOURS = 24;
    const staleNew = bookings.filter(b => {
      if (b.status !== "new") return false;
      return (Date.now() - new Date(b.createdAt).getTime()) > STALE_NEW_HOURS * 3600 * 1000;
    });
    const confirmedNoTicket = bookings.filter(b =>
      b.status === "confirmed" && !b.ticketIssuedAt
    );
    const tomorrowDate = new Date(); tomorrowDate.setDate(now.getDate() + 1);
    const tripsTomorrowUnconfirmed = bookings.filter(b => {
      const d = parseBookingDate(b.date);
      if (!d) return false;
      return isoDay(d) === isoDay(tomorrowDate) && b.status !== "confirmed" && b.status !== "cancelled";
    });

    // 14-day trend
    const trend: { day: string; count: number; revenue: number; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = isoDay(d);
      const bs = bookings.filter(b => isoDay(new Date(b.createdAt)) === key);
      trend.push({
        day: key,
        count: bs.length,
        revenue: bs.filter(isPaid).reduce((s, b) => s + revenue(b), 0),
        label: d.toLocaleDateString("ar-EG", { weekday: "short", day: "numeric" }),
      });
    }

    // Top packages this month
    const pkgMap = new Map<number, { id: number; name: string; icon: string; count: number; revenue: number; guests: number }>();
    thisMonthBookings.forEach(b => {
      if (!b.packageId) return;
      const cur = pkgMap.get(b.packageId) || {
        id: b.packageId,
        name: b.packageNameAr || b.packageName || `#${b.packageId}`,
        icon: packages.find(p => p.id === b.packageId)?.icon || "🏖️",
        count: 0, revenue: 0, guests: 0,
      };
      cur.count += 1;
      cur.revenue += isPaid(b) ? revenue(b) : 0;
      cur.guests += groupSize(b);
      pkgMap.set(b.packageId, cur);
    });
    const topPackages = [...pkgMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      revenueThisMonth, revenuePrevMonth, revenueDeltaPct, avgBookingValue,
      todaysTrips, upcoming7, checkedInToday, newBookingsToday, newBookingsWeek,
      totalGuestsThisMonth,
      counts, conversionPct, totalNonCancelled,
      staleNew, confirmedNoTicket, tripsTomorrowUnconfirmed,
      trend, topPackages,
    };
  }, [bookings, packages]);

  const recentlyEdited = useMemo(() =>
    [...packages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5),
    [packages]);

  const recentBookings = useMemo(() => bookings.slice(0, 6), [bookings]);

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
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ background: "white", borderRadius: 16, height: 80, animation: "pulse 1.5s ease-in-out infinite", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  );

  const trendMax = Math.max(1, ...stats.trend.map(d => d.count));
  const totalActionItems = stats.staleNew.length + stats.confirmedNoTicket.length + stats.tripsTomorrowUnconfirmed.length;
  const pendingTestimonials = testimonials.filter(t => t.status === "pending").length;

  return (
    <div className="dr-dashboard">
      <style>{`
        .dr-dashboard .dr-grid-2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        .dr-dashboard .dr-grid-trend { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1rem; margin-bottom: 1.25rem; }
        @media (max-width: 720px) {
          .dr-dashboard .dr-grid-2,
          .dr-dashboard .dr-grid-trend { grid-template-columns: 1fr; }
        }
      `}</style>
      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${NAVY} 0%, #14253a 60%, #0a1520 100%)`,
        borderRadius: 18, padding: "1.4rem 1.5rem", marginBottom: "1.25rem",
        color: "white", boxShadow: "0 12px 32px rgba(13,27,42,0.25)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -40, left: -40, width: 220, height: 220, borderRadius: "50%",
          background: `radial-gradient(circle, ${OCEAN}33 0%, transparent 70%)`, pointerEvents: "none",
        }} />
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>DR TRAVEL · Admin</div>
            <h2 style={{ color: "white", fontWeight: 900, fontSize: "1.6rem", margin: "0.4rem 0 0.4rem", lineHeight: 1.2 }}>
              مرحباً {user?.displayName || user?.username} 👋
            </h2>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.88rem" }}>
              {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {lastUpdated && <span style={{ marginInlineStart: 12, color: "var(--text-muted)", fontSize: "0.78rem" }}>· آخر تحديث {timeAgo(lastUpdated.toISOString())}</span>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => setRefreshTick(t => t + 1)}
              style={{ background: "var(--border)", border: "1px solid var(--border-strong)", color: "white", borderRadius: 10, padding: "0.55rem 0.95rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              🔄 تحديث
            </button>
            {stats.counts.new > 0 && (
              <button onClick={() => navigate("/admin/bookings")}
                style={{ background: "#EF4444", border: "1px solid #EF444460", color: "white", borderRadius: 10, padding: "0.55rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", boxShadow: "0 4px 14px rgba(239,68,68,0.4)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "white", display: "inline-block", animation: "ping 1.5s ease-in-out infinite" }} />
                {stats.counts.new} حجز جديد
                <style>{`@keyframes ping { 0%,100%{opacity:1}50%{opacity:0.3} }`}</style>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action items alert */}
      {totalActionItems > 0 && (
        <div style={{
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          border: "1px solid #f59e0b40", borderRadius: 14, padding: "1rem 1.1rem",
          marginBottom: "1.25rem", display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center",
        }}>
          <div style={{ fontSize: "1.5rem" }}>⚠️</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: "#78350f", fontWeight: 800, fontSize: "0.95rem" }}>تحتاج إلى انتباهك ({totalActionItems})</div>
            <div style={{ color: "#92400e", fontSize: "0.8rem", marginTop: 2 }}>
              {stats.staleNew.length > 0 && `${stats.staleNew.length} حجز جديد بدون متابعة لأكثر من 24 ساعة · `}
              {stats.confirmedNoTicket.length > 0 && `${stats.confirmedNoTicket.length} حجز مؤكد بدون إصدار تذكرة · `}
              {stats.tripsTomorrowUnconfirmed.length > 0 && `${stats.tripsTomorrowUnconfirmed.length} رحلة غداً غير مؤكدة`}
            </div>
          </div>
          <button onClick={() => navigate("/admin/bookings")}
            style={{ background: "#92400e", color: "white", border: "none", borderRadius: 10, padding: "0.55rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.8rem" }}>
            افتح الحجوزات ←
          </button>
        </div>
      )}

      {/* Top KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem", marginBottom: "1.25rem" }}>
        <KpiCard
          icon="💰" label="إيرادات الشهر" sublabel="EGP · مؤكدة"
          value={fmtMoney(stats.revenueThisMonth)} color={GOLD}
          delta={stats.revenueDeltaPct} deltaLabel={`vs الشهر الماضي`}
          onClick={() => navigate("/admin/bookings")}
        />
        <KpiCard
          icon="🎫" label="متوسط قيمة الحجز" sublabel="EGP · هذا الشهر"
          value={fmtMoney(stats.avgBookingValue)} color="#10B981"
          onClick={() => navigate("/admin/bookings")}
        />
        <KpiCard
          icon="👥" label="ضيوف الشهر" sublabel="من الحجوزات المؤكدة"
          value={fmtCount(stats.totalGuestsThisMonth)} color={OCEAN}
          onClick={() => navigate("/admin/bookings")}
        />
        <KpiCard
          icon="📈" label="نسبة التحويل" sublabel="مؤكد ÷ نشط"
          value={`${stats.conversionPct}%`} color="#A855F7"
          onClick={() => navigate("/admin/bookings")}
        />
        <KpiCard
          icon="📅" label="رحلات اليوم" sublabel={`${stats.checkedInToday.length} دخل البوابة`}
          value={`${stats.todaysTrips.length}`} color="#F59E0B"
          onClick={() => navigate("/admin/scanner")}
        />
        <KpiCard
          icon="✨" label="حجوزات الأسبوع"
          sublabel={`اليوم: ${stats.newBookingsToday.length}`}
          value={`${stats.newBookingsWeek.length}`} color="#3B82F6"
          onClick={() => navigate("/admin/bookings")}
        />
      </div>

      {/* Trend + Funnel side by side */}
      <div className="dr-grid-trend">
        {/* 14-day trend */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>📊 الحجوزات خلال آخر 14 يوم</h3>
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600 }}>
              المجموع: {stats.trend.reduce((s, d) => s + d.count, 0)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130, padding: "8px 0" }}>
            {stats.trend.map((d, i) => {
              const h = (d.count / trendMax) * 100;
              const isToday = i === stats.trend.length - 1;
              return (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}
                  title={`${d.label} — ${d.count} حجز`}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                    <div style={{
                      width: "100%",
                      height: `${Math.max(h, d.count > 0 ? 8 : 2)}%`,
                      background: d.count === 0 ? "#e5e7eb" : isToday
                        ? `linear-gradient(180deg, ${GOLD} 0%, #b08d3a 100%)`
                        : `linear-gradient(180deg, ${OCEAN} 0%, #0077b6 100%)`,
                      borderRadius: "6px 6px 2px 2px",
                      transition: "all 0.3s",
                      position: "relative",
                    }}>
                      {d.count > 0 && (
                        <span style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", color: NAVY, fontSize: "0.65rem", fontWeight: 800 }}>{d.count}</span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: "0.6rem", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap", transform: "rotate(-30deg)", transformOrigin: "center", marginTop: 4 }}>
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>🎯 فونيل التحويل</h3>
            <span style={{ color: GOLD, fontSize: "0.85rem", fontWeight: 800 }}>{stats.conversionPct}%</span>
          </div>
          {(() => {
            const total = Math.max(1, stats.counts.new + stats.counts.contacted + stats.counts.confirmed);
            const stages = [
              { key: "new", label: "جديد", count: stats.counts.new, color: statusColors.new },
              { key: "contacted", label: "تم التواصل", count: stats.counts.contacted, color: statusColors.contacted },
              { key: "confirmed", label: "مؤكد", count: stats.counts.confirmed, color: statusColors.confirmed },
            ];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stages.map(s => {
                  const pct = Math.round((s.count / total) * 100);
                  return (
                    <div key={s.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: 4 }}>
                        <span style={{ color: "#475569", fontWeight: 700 }}>{s.label}</span>
                        <span style={{ color: s.color, fontWeight: 800 }}>{s.count} <span style={{ color: "#94a3b8", fontWeight: 600 }}>({pct}%)</span></span>
                      </div>
                      <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
                {stats.counts.cancelled > 0 && (
                  <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "#94a3b8", fontWeight: 600 }}>ملغاة</span>
                    <span style={{ color: statusColors.cancelled, fontWeight: 700 }}>{stats.counts.cancelled}</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Today's gate + Top packages */}
      <div className="dr-grid-2">
        {/* Today's gate list */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>🚤 رحلات اليوم</h3>
            <button onClick={() => navigate("/admin/scanner")}
              style={linkBtnStyle}>📷 افتح الماسح ←</button>
          </div>
          {stats.todaysTrips.length === 0 ? (
            <EmptyHint icon="📭" text="لا توجد رحلات اليوم" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.todaysTrips.slice(0, 6).map(b => {
                const used = !!b.ticketUsedAt;
                const issued = !!b.ticketIssuedAt;
                const group = groupSizeOf(b);
                return (
                  <div key={b.id}
                    onClick={() => navigate("/admin/bookings")}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "0.55rem 0.7rem",
                      borderRadius: 10, cursor: "pointer", border: `1px solid ${used ? "#10B98130" : "#e2e8f0"}`,
                      background: used ? "#f0fdf4" : "white",
                    }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%",
                      background: used ? "#10B981" : issued ? "#F59E0B" : "#94a3b8",
                      color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.95rem", fontWeight: 800, flexShrink: 0,
                    }}>
                      {used ? "✓" : group}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: NAVY, fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: "0.72rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {b.packageNameAr || b.packageName} · 👥 {group}
                      </div>
                    </div>
                    <span style={{
                      background: used ? "#10B98115" : issued ? "#F59E0B15" : "#94a3b815",
                      color: used ? "#10B981" : issued ? "#F59E0B" : "#64748b",
                      padding: "0.2rem 0.6rem", borderRadius: 50, fontSize: "0.7rem", fontWeight: 800, flexShrink: 0,
                    }}>
                      {used ? "دخل" : issued ? "تذكرة جاهزة" : "بدون تذكرة"}
                    </span>
                  </div>
                );
              })}
              {stats.todaysTrips.length > 6 && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.75rem", padding: "0.4rem" }}>
                  + {stats.todaysTrips.length - 6} حجز آخر اليوم
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top packages */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>🏆 أكثر الباقات حجزاً (هذا الشهر)</h3>
            <button onClick={() => navigate("/admin/packages")} style={linkBtnStyle}>الكل ←</button>
          </div>
          {stats.topPackages.length === 0 ? (
            <EmptyHint icon="📦" text="لا توجد حجوزات هذا الشهر" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.topPackages.map((p, i) => {
                const max = stats.topPackages[0].count;
                const pct = (p.count / max) * 100;
                return (
                  <div key={p.id}
                    onClick={() => navigate(`/admin/packages/${p.id}/edit`)}
                    style={{ padding: "0.5rem 0.6rem", borderRadius: 10, cursor: "pointer" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: "1.05rem" }}>{p.icon}</span>
                      <span style={{ flex: 1, color: NAVY, fontWeight: 700, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {i === 0 && "🥇 "}{i === 1 && "🥈 "}{i === 2 && "🥉 "}{p.name}
                      </span>
                      <span style={{ color: GOLD, fontWeight: 800, fontSize: "0.85rem" }}>{p.count}</span>
                    </div>
                    <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", marginRight: 24 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${OCEAN}, ${GOLD})`, borderRadius: 3 }} />
                    </div>
                    <div style={{ marginRight: 24, fontSize: "0.7rem", color: "#94a3b8", marginTop: 3 }}>
                      💰 {fmtMoney(p.revenue)} · 👥 {p.guests}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Package status + recently edited */}
      <div className="dr-grid-2">
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>📦 نظرة على المحتوى</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            <MiniStat icon="✅" label="باقات منشورة" value={packages.filter(p => p.status === "published" && p.active).length} color="#10B981" />
            <MiniStat icon="📝" label="مسودات" value={packages.filter(p => p.status === "draft").length} color="#F59E0B" />
            <MiniStat icon="📦" label="أرشيف" value={packages.filter(p => p.status === "archived").length} color="#6B7280" />
            <MiniStat icon="⭐" label="تقييمات قيد المراجعة" value={pendingTestimonials} color="#A855F7" />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h3 style={cardTitleStyle}>✏️ آخر تعديلات الباقات</h3>
            <button onClick={() => navigate("/admin/packages")} style={linkBtnStyle}>الكل ←</button>
          </div>
          {recentlyEdited.length === 0 ? (
            <EmptyHint icon="📦" text="لا توجد باقات بعد" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {recentlyEdited.map(pkg => {
                const badge = pkgStatusBadge[pkg.status] || { label: pkg.status, color: "var(--section-subtitle)" };
                return (
                  <div key={pkg.id}
                    onClick={() => navigate(`/admin/packages/${pkg.id}/edit`)}
                    style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.6rem", borderRadius: 8, cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span style={{ fontSize: "1.2rem" }}>{pkg.icon || "🏖️"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: NAVY, fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.titleAr}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{timeAgo(pkg.updatedAt)}</div>
                    </div>
                    <span style={{ background: `${badge.color}15`, color: badge.color, padding: "0.15rem 0.5rem", borderRadius: "50px", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <h3 style={cardTitleStyle}>🆕 آخر الحجوزات</h3>
          <button onClick={() => navigate("/admin/bookings")} style={linkBtnStyle}>عرض الكل ←</button>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyHint icon="📭" text="لا توجد حجوزات بعد" sub="ستظهر الحجوزات هنا فور وصولها" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: 560 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f4f8" }}>
                  {["الاسم", "الهاتف", "الباقة", "التاريخ", "العدد", "السعر", "الحالة"].map(h => (
                    <th key={h} style={{ padding: "0.7rem 0.6rem", color: "var(--section-subtitle)", fontWeight: 700, textAlign: "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map(b => {
                  const group = groupSizeOf(b);
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #f0f4f8", cursor: "pointer" }}
                      onClick={() => navigate("/admin/bookings")}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ""; }}>
                      <td style={{ padding: "0.7rem 0.6rem", fontWeight: 600, color: NAVY }}>{b.name}</td>
                      <td style={{ padding: "0.7rem 0.6rem", color: "var(--section-subtitle)", direction: "ltr" }}>{b.phone}</td>
                      <td style={{ padding: "0.7rem 0.6rem", color: "var(--section-subtitle)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.packageNameAr || b.packageName || "—"}</td>
                      <td style={{ padding: "0.7rem 0.6rem", color: "var(--section-subtitle)" }}>{b.date}</td>
                      <td style={{ padding: "0.7rem 0.6rem", color: NAVY, fontWeight: 700 }}>👥 {group}</td>
                      <td style={{ padding: "0.7rem 0.6rem", color: GOLD, fontWeight: 800 }}>{b.priceAtBooking ? fmtMoney(b.priceAtBooking) : "—"}</td>
                      <td style={{ padding: "0.7rem 0.6rem" }}>
                        <span style={{ background: `${statusColors[b.status]}15`, color: statusColors[b.status], padding: "0.25rem 0.7rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 700 }}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white", borderRadius: 16, padding: "1.1rem 1.15rem",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
  minWidth: 0,
};
const cardHeaderStyle: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  marginBottom: "0.85rem", gap: "0.5rem",
};
const cardTitleStyle: React.CSSProperties = {
  color: NAVY, fontWeight: 800, fontSize: "0.95rem", margin: 0,
};
const linkBtnStyle: React.CSSProperties = {
  color: OCEAN, background: "none", border: "none", cursor: "pointer",
  fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.78rem",
};

function KpiCard({ icon, label, sublabel, value, color, delta, deltaLabel, onClick }: {
  icon: string; label: string; sublabel?: string; value: string; color: string;
  delta?: number; deltaLabel?: string; onClick?: () => void;
}) {
  const positive = (delta ?? 0) >= 0;
  return (
    <button onClick={onClick}
      style={{
        background: "white", borderRadius: 14, padding: "1rem 1.1rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: onClick ? "pointer" : "default",
        border: `1px solid ${color}25`, textAlign: "right", transition: "all 0.2s",
        fontFamily: "Cairo, sans-serif", display: "flex", flexDirection: "column", gap: 4,
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}>
      <div style={{
        position: "absolute", top: -20, left: -20, width: 80, height: 80, borderRadius: "50%",
        background: `${color}10`, pointerEvents: "none",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "1.4rem" }}>{icon}</span>
        {typeof delta === "number" && (
          <span style={{
            background: positive ? "#10B98115" : "#EF444415",
            color: positive ? "#10B981" : "#EF4444",
            padding: "2px 8px", borderRadius: 50, fontSize: "0.7rem", fontWeight: 800,
          }}>
            {positive ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: "1.85rem", fontWeight: 900, color, fontFamily: "Montserrat, sans-serif", lineHeight: 1.1, marginTop: 2 }}>{value}</div>
      <div style={{ color: NAVY, fontSize: "0.82rem", fontWeight: 700 }}>{label}</div>
      {sublabel && <div style={{ color: "#94a3b8", fontSize: "0.7rem", fontWeight: 600 }}>{sublabel}</div>}
      {deltaLabel && typeof delta === "number" && (
        <div style={{ color: "#94a3b8", fontSize: "0.68rem", marginTop: 1 }}>{deltaLabel}</div>
      )}
    </button>
  );
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10,
      padding: "0.7rem 0.8rem", display: "flex", alignItems: "center", gap: "0.55rem",
    }}>
      <span style={{ fontSize: "1.2rem" }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "1.25rem", fontWeight: 900, color, fontFamily: "Montserrat, sans-serif", lineHeight: 1 }}>{value}</div>
        <div style={{ color: "#64748b", fontSize: "0.7rem", fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function EmptyHint({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "1.6rem 0.5rem", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{icon}</div>
      <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{text}</div>
      {sub && <div style={{ fontSize: "0.78rem", marginTop: "0.3rem" }}>{sub}</div>}
    </div>
  );
}
