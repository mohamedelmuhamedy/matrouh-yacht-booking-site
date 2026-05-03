import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { adminFetch } from "./AdminContext";

interface Booking {
  id: number; name: string; date: string; status: string;
  packageId: number | null; packageNameAr: string; packageName: string;
  adults: number; children: number; infants: number;
}
interface Cap { packageId: number; date: string; maxSeats: number; }

const STATUS_COLOR: Record<string, string> = { new: "#3B82F6", contacted: "#F59E0B", confirmed: "#10B981", completed: "#64748B", cancelled: "#EF4444" };

function isoDay(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [capacity, setCapacity] = useState<Cap[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [, navigate] = useLocation();

  useEffect(() => {
    Promise.all([
      adminFetch("/admin/bookings").then(r => r.json()),
      adminFetch("/admin/capacity").then(r => r.json()),
    ]).then(([b, c]) => { setBookings(b); setCapacity(c); }).finally(() => setLoading(false));
  }, []);

  const grid = useMemo(() => {
    const first = new Date(month);
    const startOffset = first.getDay(); // 0=Sun
    const days: { date: Date; key: string; bookings: Booking[]; totalGuests: number; capByPkg: Map<number, number> }[] = [];
    for (let i = 0; i < startOffset; i++) days.push({ date: new Date(0), key: "_blank_" + i, bookings: [], totalGuests: 0, capByPkg: new Map() });
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(first.getFullYear(), first.getMonth(), d);
      const key = isoDay(date);
      const dayBookings = bookings.filter(b => b.date === key && b.status !== "cancelled");
      const totalGuests = dayBookings.reduce((s, b) => s + b.adults + b.children, 0);
      const capByPkg = new Map<number, number>();
      capacity.filter(c => c.date === key).forEach(c => capByPkg.set(c.packageId, c.maxSeats));
      days.push({ date, key, bookings: dayBookings, totalGuests, capByPkg });
    }
    return days;
  }, [month, bookings, capacity]);

  const monthLabel = month.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  const today = isoDay(new Date());

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>📅 تقويم الحجوزات — {monthLabel}</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={navBtn}>← السابق</button>
          <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); }} style={navBtn}>اليوم</button>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={navBtn}>التالي →</button>
        </div>
      </div>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
        <div style={{ background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"].map(d => (
              <div key={d} style={{ textAlign: "center", padding: "0.4rem", fontWeight: 800, color: "var(--text-muted)", fontSize: "0.8rem" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {grid.map(c => {
              if (c.key.startsWith("_blank_")) return <div key={c.key} />;
              const isToday = c.key === today;
              const cnt = c.bookings.length;
              const utilization = c.capByPkg.size > 0
                ? Math.round((c.totalGuests / [...c.capByPkg.values()].reduce((s, v) => s + v, 0)) * 100)
                : 0;
              return (
                <div key={c.key} style={{
                  minHeight: 90, padding: "0.4rem", borderRadius: 8,
                  background: isToday ? "rgba(0,170,255,0.08)" : "var(--bg-page-2)",
                  border: "1px solid " + (isToday ? "#00AAFF" : "var(--border)"),
                  cursor: cnt > 0 ? "pointer" : "default",
                  position: "relative",
                }} onClick={() => cnt > 0 && navigate("/admin/bookings")}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: "0.85rem", color: isToday ? "#00AAFF" : "var(--text-primary)" }}>{c.date.getDate()}</span>
                    {cnt > 0 && <span style={{ background: "#00AAFF", color: "white", borderRadius: 10, padding: "1px 6px", fontSize: "0.65rem", fontWeight: 800 }}>{cnt}</span>}
                  </div>
                  {c.totalGuests > 0 && <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>👥 {c.totalGuests}</div>}
                  {c.capByPkg.size > 0 && (
                    <div style={{ height: 4, background: "var(--bg-surface-2)", borderRadius: 2, marginBottom: 4, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, utilization)}%`, height: "100%", background: utilization >= 100 ? "#EF4444" : utilization >= 80 ? "#F59E0B" : "#10B981" }} />
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    {c.bookings.slice(0, 3).map(b => (
                      <span key={b.id} title={b.name} style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLOR[b.status] || "#64748B" }} />
                    ))}
                    {c.bookings.length > 3 && <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>+{c.bookings.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      }
    </div>
  );
}

const navBtn: React.CSSProperties = { background: "var(--bg-surface-2)", border: "1px solid var(--border)", padding: "0.45rem 0.85rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 700, color: "var(--text-primary)" };
