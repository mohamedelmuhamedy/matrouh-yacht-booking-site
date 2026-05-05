import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
const AR_DAYS_SHORT = ["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"];
const EN_DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const AR_INDIC = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];

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
function toArabicNum(n: number | string): string {
  return String(n).replace(/\d/g, d => AR_INDIC[Number(d)]);
}

export default function DatePicker({ value, onChange, min, lang = "ar", placeholder, className, hasError }: Props) {
  const ar = lang === "ar";
  const months = ar ? AR_MONTHS : EN_MONTHS;
  const days = ar ? AR_DAYS_SHORT : EN_DAYS_SHORT;
  const today = new Date(); today.setHours(0,0,0,0);
  const minDate = parseYmd(min || "") || null;

  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [view, setView] = useState<Date>(selected || today);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (selected) setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!open) return;
    // Delay attaching the outside-click handler by one frame so that the
    // touch/click event that opened the picker doesn't immediately close it.
    let active = true;
    const onClick = (e: MouseEvent | TouchEvent) => {
      if (!active) return;
      const target = (e as TouchEvent).touches?.[0]?.target ?? e.target;
      if (wrapRef.current && !wrapRef.current.contains(target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const raf = requestAnimationFrame(() => {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("touchstart", onClick as EventListener);
      document.addEventListener("keydown", onKey);
    });
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("touchstart", onClick as EventListener);
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
  const fmtDay = (n: number) => ar ? toArabicNum(n) : String(n);
  const fmtYear = (n: number) => ar ? toArabicNum(n) : String(n);

  const updatePopupPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const width = Math.min(360, Math.max(296, viewportW - margin * 2));
    const estimatedHeight = Math.min(500, viewportH - margin * 2);
    const preferredLeft = ar ? rect.right - width : rect.left;
    const left = Math.max(margin, Math.min(preferredLeft, viewportW - width - margin));
    const belowTop = rect.bottom + 8;
    const aboveTop = rect.top - estimatedHeight - 8;
    const hasRoomBelow = belowTop + estimatedHeight <= viewportH - margin;
    const top = hasRoomBelow || aboveTop < margin
      ? Math.min(belowTop, viewportH - estimatedHeight - margin)
      : aboveTop;
    setPopupPos({ top: Math.max(margin, top), left, width });
  }, [ar]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopupPosition();
  }, [open, view, updatePopupPosition]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => updatePopupPosition();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, updatePopupPosition]);

  return (
    <div ref={wrapRef} style={{ position: "relative", minWidth: 0 }}>
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
          color: selected ? "var(--input-text)" : "var(--input-placeholder)",
          border: `1.5px solid ${hasError ? "#ef4444" : open ? "#00AAFF" : "var(--input-border)"}`,
          borderRadius: 12,
          minHeight: 50,
          padding: "0.78rem 1rem",
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
        <span style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0, overflow: "hidden" }}>
          <span aria-hidden style={{ fontSize: "1.1rem", flexShrink: 0 }}>📅</span>
          <span style={{ overflowWrap: "anywhere", whiteSpace: "normal", lineHeight: 1.35 }}>{display}</span>
        </span>
        <span aria-hidden style={{ color: "var(--text-muted)", fontSize: "0.85rem", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ar ? "اختر التاريخ" : "Pick a date"}
          style={{
            position: "fixed",
            zIndex: 10001,
            top: popupPos?.top ?? 12,
            left: popupPos?.left ?? 12,
            width: popupPos?.width ?? "min(360px, calc(100vw - 24px))",
            background: "var(--bg-surface-solid)",
            border: "1.5px solid var(--border-strong)",
            borderRadius: 16,
            boxShadow: "0 24px 60px rgba(13,27,42,0.22), 0 0 0 1px rgba(0,170,255,0.08)",
            padding: "0",
            fontFamily: "Cairo, sans-serif",
            animation: "dr-dp-in 0.18s cubic-bezier(.2,.7,.2,1)",
            overflowX: "hidden",
            overflowY: "auto",
            maxHeight: "calc(100dvh - 24px)",
            direction: ar ? "rtl" : "ltr",
          }}
        >
          <style>{`@keyframes dr-dp-in { from{opacity:0; transform:translateY(-6px)} to{opacity:1; transform:translateY(0)} }
            .dr-dp-day { transition: background 0.15s, color 0.15s, transform 0.1s; }
            .dr-dp-day:not(.is-disabled):not(.is-selected):hover { background: rgba(0,170,255,0.12); color: #00AAFF !important; }
            .dr-dp-day:not(.is-disabled):active { transform: scale(0.95); }
            .dr-dp-nav:hover { background: rgba(0,170,255,0.18) !important; color: #00AAFF !important; border-color: rgba(0,170,255,0.4) !important; }
            .dr-dp-foot:hover { background: rgba(0,170,255,0.12) !important; color: #00AAFF !important; border-color: rgba(0,170,255,0.4) !important; }
          `}</style>

          {/* Header — branded ocean strip */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.7rem 0.85rem",
            background: "linear-gradient(135deg, rgba(0,170,255,0.10), rgba(13,27,42,0.04))",
            borderBottom: "1px solid var(--border)",
          }}>
            <button type="button" className="dr-dp-nav" onClick={ar ? goNext : goPrev} aria-label={ar ? "الشهر السابق" : "Previous month"}
              style={navBtn}>{ar ? "›" : "‹"}</button>
            <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.98rem", letterSpacing: "0.2px" }}>
              {months[view.getMonth()]} {fmtYear(view.getFullYear())}
            </div>
            <button type="button" className="dr-dp-nav" onClick={ar ? goPrev : goNext} aria-label={ar ? "الشهر التالي" : "Next month"}
              style={navBtn}>{ar ? "‹" : "›"}</button>
          </div>

          <div style={{ padding: "0.75rem 0.85rem 0.85rem" }}>
            {/* Day-of-week row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
              {days.map((d, i) => (
                <div key={d} style={{
                  textAlign: "center",
                  color: (i === 5 || i === 6) ? "#00AAFF" : "var(--text-secondary)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.35rem 0",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.3px",
                }}>{d}</div>
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
                    className={`dr-dp-day${disabled ? " is-disabled" : ""}${isSel ? " is-selected" : ""}`}
                    disabled={disabled}
                    onClick={() => { onChange(ymd(d)); setOpen(false); }}
                    aria-pressed={!!isSel}
                    style={{
                      aspectRatio: "1 / 1",
                      border: "none",
                      borderRadius: 10,
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontFamily: "inherit",
                      fontSize: "0.88rem",
                      fontWeight: isSel ? 800 : isToday ? 800 : 600,
                      background: isSel ? "linear-gradient(135deg,#00AAFF,#0086C9)" : "transparent",
                      color: disabled
                        ? "var(--text-muted)"
                        : isSel
                          ? "#ffffff"
                          : isToday
                            ? "#00AAFF"
                            : "var(--text-primary)",
                      opacity: disabled ? 0.35 : 1,
                      boxShadow: isSel
                        ? "0 6px 16px rgba(0,170,255,0.4)"
                        : isToday
                          ? "inset 0 0 0 1.5px rgba(0,170,255,0.55)"
                          : "none",
                    }}
                  >{fmtDay(d.getDate())}</button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", paddingTop: "0.7rem", borderTop: "1px solid var(--border)" }}>
              <button type="button" className="dr-dp-foot" onClick={() => { const t = new Date(); t.setHours(0,0,0,0); if (!isDisabled(t)) { onChange(ymd(t)); setOpen(false); } }}
                style={footerBtn}>{ar ? "اليوم" : "Today"}</button>
              <button type="button" className="dr-dp-foot" onClick={() => { onChange(""); setOpen(false); }}
                style={{ ...footerBtn, color: "var(--text-muted)" }}>{ar ? "مسح" : "Clear"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: CSSProperties = {
  width: 32, height: 32, borderRadius: 10,
  background: "var(--bg-surface-2)", border: "1px solid var(--border)",
  color: "var(--text-primary)", cursor: "pointer", fontSize: "1.15rem", fontWeight: 800,
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "inherit", transition: "all 0.15s",
};

const footerBtn: CSSProperties = {
  flex: 1, padding: "0.55rem 0.75rem", borderRadius: 10,
  background: "var(--bg-surface-2)", border: "1px solid var(--border)",
  color: "var(--text-primary)", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
  fontFamily: "Cairo, sans-serif", transition: "all 0.15s",
};
