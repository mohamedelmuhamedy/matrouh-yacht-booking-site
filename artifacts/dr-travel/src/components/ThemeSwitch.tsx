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

  const dim = size === "sm" ? 34 : 38;
  const iconSize = size === "sm" ? 16 : 18;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isDark}
      aria-label={`${labelAr} / ${labelEn}`}
      title={isDark ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
      onClick={toggleTheme}
      className="theme-switch"
      data-theme-switch
      style={{
        width: dim,
        height: dim,
        borderRadius: "50%",
        border: "1px solid var(--border-strong)",
        background: "var(--bg-surface-2)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.25s ease, color 0.25s ease, border-color 0.25s ease, transform 0.2s ease, box-shadow 0.25s ease",
        outline: "none",
        padding: 0,
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#00AAFF";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.45)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)";
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(0,170,255,0.30)";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {isDark ? (
        // Moon — currently dark, click to go light
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // Sun — currently light, click to go dark
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
