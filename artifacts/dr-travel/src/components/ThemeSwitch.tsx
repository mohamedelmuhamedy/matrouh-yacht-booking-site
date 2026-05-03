import { useTheme } from "../context/ThemeContext";

interface ThemeSwitchProps {
  size?: "sm" | "md";
  labelAr?: string;
  labelEn?: string;
}

export default function ThemeSwitch({
  size = "md",
  labelAr = "تبديل المظهر",
  labelEn = "Toggle theme",
}: ThemeSwitchProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const trackW = size === "sm" ? 48 : 54;
  const trackH = size === "sm" ? 26 : 30;
  const knobD = trackH - 6;
  const iconSize = size === "sm" ? 12 : 14;
  const knobOffset = isDark ? 3 : trackW - knobD - 3;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={`${labelAr} / ${labelEn}`}
      title={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      onClick={toggleTheme}
      className={`theme-switch ${isDark ? "is-dark" : "is-light"}`}
      data-theme-switch
      style={{
        position: "relative",
        width: trackW,
        height: trackH,
        borderRadius: trackH,
        border: "1px solid var(--border-strong)",
        background: isDark
          ? "linear-gradient(135deg, #0a1830 0%, #142847 100%)"
          : "linear-gradient(135deg, #cfe9ff 0%, #fde9b6 100%)",
        cursor: "pointer",
        padding: 0,
        outline: "none",
        boxSizing: "border-box",
        transition: "background 0.3s ease, border-color 0.25s ease, box-shadow 0.25s ease",
        flexShrink: 0,
        display: "inline-block",
        verticalAlign: "middle",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          insetInlineStart: knobOffset,
          width: knobD,
          height: knobD,
          borderRadius: "50%",
          background: isDark
            ? "linear-gradient(135deg, #f8fafc 0%, #c7d2dc 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #ffe9a8 100%)",
          color: isDark ? "#0D1B2A" : "#a8842c",
          boxShadow: isDark
            ? "0 2px 8px rgba(0,0,0,0.45), inset 0 -1px 2px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(201,168,76,0.45), inset 0 -1px 2px rgba(168,132,44,0.2)",
          transform: "translateY(-50%)",
          transition: "inset-inline-start 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, color 0.3s ease, box-shadow 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {isDark ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        )}
      </span>
    </button>
  );
}
