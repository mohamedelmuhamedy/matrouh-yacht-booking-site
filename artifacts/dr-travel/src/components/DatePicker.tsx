import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  lang?: "ar" | "en";
  placeholder?: string;
  className?: string;
  hasError?: boolean;
};

const AR_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const EN_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const AR_DAYS = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];
const EN_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseYmd(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DatePicker({ value, onChange, min, lang = "ar", placeholder, className, hasError }: Props) {
  const ar = lang === "ar";
  const months = ar ? AR_MONTHS : EN_MONTHS;
  const days = ar ? AR_DAYS : EN_DAYS;
  const today = new Date(); today.setHours(0,0,0,0);
  const minDate = parseYmd(min || "") || null;

  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [view, setView] = useState<Date>(selected || today);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const display = selected
    ? selected.toLocaleDateString(ar ? "ar-EG" : "en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : (placeholder || (ar ? "اختر تاريخ الرحلة" : "Pick trip date"));

  const goPrev = () => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const goNext = () => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  const isDisabled = (d: Date) => (minDate ? d < minDate : false);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={className}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: ar ? "right" : "left",
          background: "var(--input-bg)",
          color: selected ? "var(--input-text)" : "var(--text-muted)",
          border: `1.5px solid ${hasError ? "#ef4444" : "var(--input-border)"}`,
          borderRadius: 12,
          padding: "0.85rem 1rem",
          fontFamily: "Cairo, sans-serif",
          fontSize: "0.92rem",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.5rem",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: open ? "0 0 0 3px rgba(0,170,255,0.18)" : "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <span aria-hidden style={{ fontSize: "1.1rem" }}>📅</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{display}</span>
        </span>
        <span aria-hidden style={{ color: "var(--text-muted)", fontSize: "0.85rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ar ? "اختر التاريخ" : "Pick a date"}
          style={{
            position: "absolute",
            zIndex: 100,
            top: "calc(100% + 8px)",
            insetInlineStart: 0,
            insetInlineEnd: 0,
            background: "var(--bg-surface-solid)",
            border: "1px solid var(--border-strong)",
            borderRadius: 16,
            boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
            padding: "0.85rem",
            fontFamily: "Cairo, sans-serif",
            animation: "dr-dp-in 0.18s cubic-bezier(.2,.7,.2,1)",
          }}
        >
          <style>{`@keyframes dr-dp-in { from{opacity:0; transform:translateY(-6px)} to{opacity:1; transform:translateY(0)} }
            .dr-dp-day { transition: background 0.15s, color 0.15s; }
            .dr-dp-day:not(.is-disabled):hover { background: var(--bg-surface-2); }
          `}</style>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <button type="button" onClick={ar ? goNext : goPrev} aria-label={ar ? "الشهر السابق" : "Previous month"}
              style={navBtn}>{ar ? "›" : "‹"}</button>
            <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.95rem" }}>
              {months[view.getMonth()]} {view.getFullYear()}
            </div>
            <button type="button" onClick={ar ? goPrev : goNext} aria-label={ar ? "الشهر التالي" : "Next month"}
              style={navBtn}>{ar ? "‹" : "›"}</button>
          </div>

          {/* Day-of-week row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {days.map(d => (
              <div key={d} style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, padding: "0.3rem 0" }}>{d}</div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const isSel = selected && sameDay(d, selected);
              const isToday = sameDay(d, today);
              const disabled = isDisabled(d);
              return (
                <button
                  key={i}
                  type="button"
                  className={`dr-dp-day${disabled ? " is-disabled" : ""}`}
                  disabled={disabled}
                  onClick={() => { onChange(ymd(d)); setOpen(false); }}
                  aria-pressed={!!isSel}
                  style={{
                    aspectRatio: "1 / 1",
                    border: "none",
                    borderRadius: 10,
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    fontSize: "0.85rem",
                    fontWeight: isSel ? 800 : isToday ? 700 : 600,
                    background: isSel ? "linear-gradient(135deg,#00AAFF,#0086C9)" : "transparent",
                    color: disabled
                      ? "var(--text-muted)"
                      : isSel
                        ? "#ffffff"
                        : isToday
                          ? "#00AAFF"
                          : "var(--text-primary)",
                    opacity: disabled ? 0.35 : 1,
                    boxShadow: isSel ? "0 6px 16px rgba(0,170,255,0.35)" : isToday ? "inset 0 0 0 1.5px rgba(0,170,255,0.45)" : "none",
                  }}
                >{d.getDate()}</button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", paddingTop: "0.6rem", borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={() => { const t = new Date(); t.setHours(0,0,0,0); if (!isDisabled(t)) { onChange(ymd(t)); setOpen(false); } }}
              style={footerBtn}>{ar ? "اليوم" : "Today"}</button>
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              style={{ ...footerBtn, color: "var(--text-muted)" }}>{ar ? "مسح" : "Clear"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: "var(--bg-surface-2)", border: "1px solid var(--border)",
  color: "var(--text-primary)", cursor: "pointer", fontSize: "1.1rem", fontWeight: 800,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "inherit",
};

const footerBtn: React.CSSProperties = {
  flex: 1, padding: "0.55rem 0.75rem", borderRadius: 10,
  background: "var(--bg-surface-2)", border: "1px solid var(--border)",
  color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
  fontFamily: "Cairo, sans-serif",
};
