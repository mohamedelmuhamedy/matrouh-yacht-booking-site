import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Booking {
  id: number; name: string; phone: string; date: string; createdAt: string; status: string;
  packageId: number | null; packageName: string; packageNameAr: string;
  adults: number; children: number; infants: number;
  priceAtBooking: number | null; discountAmount?: number; promoCode?: string;
}

function fmt(n: number): string { return Math.round(n).toLocaleString("ar-EG"); }

export default function AdminStatsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"30d" | "90d" | "ytd" | "all">("30d");

  useEffect(() => {
    adminFetch("/admin/bookings").then(r => r.json()).then(setBookings).finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const cutoff = range === "30d" ? now - 30 * 86400000 :
      range === "90d" ? now - 90 * 86400000 :
      range === "ytd" ? new Date(new Date().getFullYear(), 0, 1).getTime() : 0;
    const inRange = bookings.filter(b => new Date(b.createdAt).getTime() >= cutoff);
    const confirmed = inRange.filter(b => b.status === "confirmed");
    const totalRevenue = confirmed.reduce((s, b) => s + (b.priceAtBooking || 0) - (b.discountAmount || 0), 0);
    const totalGuests = confirmed.reduce((s, b) => s + b.adults + b.children + b.infants, 0);
    const avgValue = confirmed.length ? totalRevenue / confirmed.length : 0;
    const avgGroup = confirmed.length ? totalGuests / confirmed.length : 0;
    const conversion = inRange.length ? (confirmed.length / inRange.filter(b => b.status !== "cancelled").length) * 100 : 0;

    // Repeat customers
    const phoneCount = new Map<string, number>();
    bookings.forEach(b => phoneCount.set(b.phone, (phoneCount.get(b.phone) || 0) + 1));
    const repeatCustomers = [...phoneCount.values()].filter(c => c > 1).length;

    // Revenue by month (last 6 months)
    const byMonth: { label: string; revenue: number; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i, 1); d.setHours(0, 0, 0, 0);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const m = bookings.filter(b => {
        const t = new Date(b.createdAt).getTime();
        return t >= d.getTime() && t < next.getTime() && b.status === "confirmed";
      });
      byMonth.push({
        label: d.toLocaleDateString("ar-EG", { month: "short" }),
        revenue: m.reduce((s, b) => s + (b.priceAtBooking || 0) - (b.discountAmount || 0), 0),
        count: m.length,
      });
    }

    // By package
    const byPkg = new Map<string, { name: string; count: number; revenue: number; guests: number }>();
    confirmed.forEach(b => {
      const name = b.packageNameAr || b.packageName || "غير محدد";
      const cur = byPkg.get(name) || { name, count: 0, revenue: 0, guests: 0 };
      cur.count += 1;
      cur.revenue += (b.priceAtBooking || 0) - (b.discountAmount || 0);
      cur.guests += b.adults + b.children + b.infants;
      byPkg.set(name, cur);
    });
    const topPackages = [...byPkg.values()].sort((a, b) => b.revenue - a.revenue);

    // Promo usage
    const promoSavings = inRange.reduce((s, b) => s + (b.discountAmount || 0), 0);
    const promoUsed = inRange.filter(b => b.promoCode).length;

    // Day of week breakdown
    const dow = [0, 0, 0, 0, 0, 0, 0];
    confirmed.forEach(b => {
      const d = new Date(b.date);
      if (!isNaN(d.getTime())) dow[d.getDay()] += 1;
    });

    // === Revenue forecasting (next 3 months) ===
    // Two signals combined:
    // 1. Future confirmed bookings already on the books (date >= today)
    // 2. Trailing 3-month average run-rate (for the "uncertain" portion of the month)
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const trailing3 = byMonth.slice(-3);
    const trailingAvgRevenue = trailing3.length ? trailing3.reduce((s, m) => s + m.revenue, 0) / trailing3.length : 0;
    const trailingAvgCount = trailing3.length ? trailing3.reduce((s, m) => s + m.count, 0) / trailing3.length : 0;

    const forecast: { label: string; booked: number; projected: number; bookings: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const start = new Date(); start.setMonth(start.getMonth() + i, 1); start.setHours(0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const future = bookings.filter(b => {
        const td = new Date(b.date).getTime();
        return td >= Math.max(start.getTime(), todayMs) && td < end.getTime() && b.status === "confirmed";
      });
      const booked = future.reduce((s, b) => s + (b.priceAtBooking || 0) - (b.discountAmount || 0), 0);
      // For current month, blend already-confirmed-for-month + remaining run-rate share
      let projected = booked;
      if (i === 0) {
        const daysInMonth = new Date(end.getTime() - 1).getDate();
        const today = new Date(); const dayOfMonth = today.getDate();
        const remainingFraction = Math.max(0, (daysInMonth - dayOfMonth + 1) / daysInMonth);
        projected = booked + trailingAvgRevenue * remainingFraction * 0.6; // discount the projection
      } else {
        projected = Math.max(booked, trailingAvgRevenue * (i === 1 ? 0.85 : 0.7));
      }
      forecast.push({
        label: start.toLocaleDateString("ar-EG", { month: "long" }),
        booked, projected, bookings: future.length,
      });
    }
    const forecastTotal = forecast.reduce((s, f) => s + f.projected, 0);

    // YoY comparison (this month vs same month last year)
    const thisMonthStart = new Date(); thisMonthStart.setDate(1); thisMonthStart.setHours(0, 0, 0, 0);
    const thisMonthEnd = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 1);
    const lastYearStart = new Date(thisMonthStart.getFullYear() - 1, thisMonthStart.getMonth(), 1);
    const lastYearEnd = new Date(thisMonthStart.getFullYear() - 1, thisMonthStart.getMonth() + 1, 1);
    const sumRange = (start: Date, end: Date) => bookings.filter(b => {
      const t = new Date(b.createdAt).getTime();
      return t >= start.getTime() && t < end.getTime() && b.status === "confirmed";
    }).reduce((s, b) => s + (b.priceAtBooking || 0) - (b.discountAmount || 0), 0);
    const thisMonthRev = sumRange(thisMonthStart, thisMonthEnd);
    const lastYearRev = sumRange(lastYearStart, lastYearEnd);
    const yoyChange = lastYearRev > 0 ? ((thisMonthRev - lastYearRev) / lastYearRev) * 100 : null;

    return { totalBookings: inRange.length, confirmed: confirmed.length, totalRevenue, totalGuests, avgValue, avgGroup, conversion, repeatCustomers, byMonth, topPackages, promoSavings, promoUsed, dow, forecast, forecastTotal, trailingAvgRevenue, trailingAvgCount, yoyChange, thisMonthRev, lastYearRev };
  }, [bookings, range]);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳ جار التحميل...</div>;

  const maxMonth = Math.max(1, ...stats.byMonth.map(m => m.revenue));
  const dowLabels = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];
  const maxDow = Math.max(1, ...stats.dow);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>📊 الإحصائيات</h2>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {(["30d", "90d", "ytd", "all"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{ background: range === r ? "#00AAFF" : "var(--bg-surface-2)", color: range === r ? "white" : "var(--text-primary)", border: "1px solid var(--border)", padding: "0.4rem 0.85rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 700, fontSize: "0.8rem" }}>
              {r === "30d" ? "30 يوم" : r === "90d" ? "90 يوم" : r === "ytd" ? "هذا العام" : "الكل"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <Kpi icon="💰" label="الإيراد الصافي" value={fmt(stats.totalRevenue)} sub="EGP" />
        <Kpi icon="🎫" label="الحجوزات المؤكدة" value={fmt(stats.confirmed)} sub={`من ${stats.totalBookings} طلب`} />
        <Kpi icon="👥" label="إجمالي الضيوف" value={fmt(stats.totalGuests)} sub={`متوسط ${stats.avgGroup.toFixed(1)}/حجز`} />
        <Kpi icon="💎" label="متوسط قيمة الحجز" value={fmt(stats.avgValue)} sub="EGP" />
        <Kpi icon="📈" label="نسبة التحويل" value={`${stats.conversion.toFixed(0)}%`} sub="مؤكد ÷ نشط" />
        <Kpi icon="🔁" label="عملاء متكررون" value={fmt(stats.repeatCustomers)} sub="حجزوا أكتر من مرة" />
        <Kpi icon="🎟️" label="استخدام أكواد الخصم" value={fmt(stats.promoUsed)} sub={`وفّر ${fmt(stats.promoSavings)} ج.م`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        {/* Revenue by month */}
        <Card title="📅 الإيراد آخر 6 أشهر">
          <div style={{ display: "flex", alignItems: "flex-end", height: 130, gap: 8, padding: "8px 0" }}>
            {stats.byMonth.map((m, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", height: `${(m.revenue / maxMonth) * 100}%`, minHeight: m.revenue > 0 ? 4 : 0, background: "linear-gradient(180deg,#00AAFF,#0086C9)", borderRadius: "6px 6px 2px 2px", position: "relative" }}>
                    {m.revenue > 0 && <span style={{ position: "absolute", top: -16, left: 0, right: 0, textAlign: "center", fontSize: "0.62rem", fontWeight: 800, color: "var(--text-primary)" }}>{fmt(m.revenue / 1000)}K</span>}
                  </div>
                </div>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Day of week */}
        <Card title="📆 أيام الأسبوع الأكثر حجزًا">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {dowLabels.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 50, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)" }}>{label}</span>
                <div style={{ flex: 1, height: 14, background: "var(--bg-surface-2)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${(stats.dow[i] / maxDow) * 100}%`, height: "100%", background: "#10B981", transition: "width 0.4s" }} />
                </div>
                <span style={{ width: 30, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", textAlign: "left" }}>{stats.dow[i]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Forecast */}
      <Card title="🔮 توقعات الإيرادات (3 أشهر قادمة)">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: ".75rem", marginBottom: "1rem" }}>
          {stats.forecast.map((f, i) => (
            <div key={i} style={{ background: "var(--bg-page-2)", padding: ".85rem", borderRadius: 10, border: i === 0 ? "2px solid #00AAFF" : "1px solid var(--border)" }}>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)", fontWeight: 700 }}>{f.label}{i === 0 && " (الحالي)"}</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "var(--text-primary)", margin: ".25rem 0" }}>{fmt(f.projected)} <span style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>ج.م</span></div>
              <div style={{ fontSize: ".72rem", color: "#10B981", fontWeight: 700 }}>محجوز: {fmt(f.booked)} ج.م</div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>{f.bookings} حجز مستقبلي</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", paddingTop: ".75rem", borderTop: "1px solid var(--border)", fontSize: ".85rem" }}>
          <div><strong style={{ color: "#00AAFF" }}>إجمالي متوقع: </strong>{fmt(stats.forecastTotal)} ج.م</div>
          <div><strong>متوسط آخر 3 أشهر: </strong>{fmt(stats.trailingAvgRevenue)} ج.م</div>
          {stats.yoyChange !== null && (
            <div>
              <strong>مقارنة بالعام الماضي: </strong>
              <span style={{ color: stats.yoyChange >= 0 ? "#10B981" : "#EF4444", fontWeight: 800 }}>
                {stats.yoyChange >= 0 ? "▲" : "▼"} {Math.abs(stats.yoyChange).toFixed(1)}%
              </span>
              <span style={{ color: "var(--text-muted)", fontSize: ".75rem" }}> ({fmt(stats.thisMonthRev)} مقابل {fmt(stats.lastYearRev)})</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: ".75rem", padding: ".5rem .75rem", background: "rgba(0,170,255,.08)", borderRadius: 8, fontSize: ".75rem", color: "var(--text-muted)" }}>
          💡 التوقعات مبنية على الحجوزات المستقبلية المؤكدة + متوسط آخر 3 أشهر. الشهر الحالي يخصم 40% من القيمة المتبقية للحذر.
        </div>
      </Card>

      <div style={{ height: "1.25rem" }} />

      {/* Top packages */}
      <Card title="🏆 ترتيب الباقات حسب الإيراد">
        {stats.topPackages.length === 0 ? <div style={{ color: "var(--text-muted)", padding: "1rem" }}>لا توجد بيانات</div> :
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "right" }}>
              <th style={th}>الباقة</th><th style={th}>عدد</th><th style={th}>الإيراد</th><th style={th}>الضيوف</th>
            </tr></thead>
            <tbody>{stats.topPackages.map((p, i) => (
              <tr key={i}><td style={td}>{p.name}</td><td style={td}>{p.count}</td><td style={td}><strong>{fmt(p.revenue)}</strong> ج.م</td><td style={td}>{p.guests}</td></tr>
            ))}</tbody>
          </table>
        }
      </Card>
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "var(--bg-surface-solid)", padding: "0.85rem", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 0.85rem", fontSize: "0.95rem", color: "var(--text-primary)" }}>{title}</h3>
      {children}
    </div>
  );
}
const th: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid var(--border)", fontSize: "0.82rem", fontWeight: 800, color: "var(--text-muted)" };
const td: React.CSSProperties = { padding: "0.5rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" };
