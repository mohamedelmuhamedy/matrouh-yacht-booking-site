import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { CURRENCIES, CURRENCY_LIST } from "../data/currencies";

export default function CurrencySwitcher() {
  const { lang } = useLanguage();
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cfg = CURRENCIES[currency];
  const symbol = lang === "ar" ? cfg.symbolAr : cfg.symbolEn;
  const showSymbol = symbol !== currency;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", padding: "0.35rem 0.65rem", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700, fontFamily: "Montserrat, sans-serif", transition: "all 0.2s", flexShrink: 0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}>
        {showSymbol && <span>{symbol}</span>}
        <span>{currency}</span>
        <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", insetInlineEnd: 0, background: "#0d1b2a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", minWidth: "140px", zIndex: 1000 }}>
          {CURRENCY_LIST.map(c => {
            const cfg = CURRENCIES[c];
            const sym = lang === "ar" ? cfg.symbolAr : cfg.symbolEn;
            const name = lang === "ar" ? cfg.nameAr : cfg.nameEn;
            const active = c === currency;
            return (
              <button key={c} onClick={() => { setCurrency(c); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: "0.6rem", width: "100%", background: active ? "rgba(0,170,255,0.1)" : "transparent", border: "none", padding: "0.7rem 1rem", cursor: "pointer", color: active ? "#00AAFF" : "rgba(255,255,255,0.7)", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", textAlign: "inherit", transition: "background 0.15s" }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: "0.85rem" }}>{sym}</span>
                <span>{name}</span>
                {active && <span style={{ marginInlineStart: "auto", fontSize: "0.7rem" }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
