import { useTheme } from "../context/ThemeContext";

interface ThemeSwitchProps {
  size?: "sm" | "md";
  labelAr?: string;
  labelEn?: string;
}

export default function ThemeSwitch({ size = "md", labelAr = "تبديل المظهر", labelEn = "Toggle theme" }: ThemeSwitchProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const dims = size === "sm"
    ? { w: 56, h: 28, knob: 22, pad: 3, icon: 12 }
    : { w: 64, h: 34, knob: 26, pad: 4, icon: 14 };

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
        position: "relative",
        width: dims.w,
        height: dims.h,
        minHeight: 40,
        minWidth: 40,
        borderRadius: 999,
        border: "1px solid var(--theme-switch-border, rgba(0,170,255,0.35))",
        background: isDark
          ? "linear-gradient(135deg, #0a1420 0%, #1c2c45 100%)"
          : "linear-gradient(135deg, #C9A84C 0%, #00AAFF 100%)",
        cursor: "pointer",
        padding: dims.pad,
        boxSizing: "content-box",
        flexShrink: 0,
        transition: "background 0.4s ease, border-color 0.3s ease",
        boxShadow: isDark
          ? "inset 0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,170,255,0.15)"
          : "inset 0 1px 4px rgba(13,27,42,0.18), 0 2px 8px rgba(201,168,76,0.25)",
        outline: "none",
      }}
      onFocus={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 3px rgba(0,170,255,0.35)"; }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = isDark
          ? "inset 0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,170,255,0.15)"
          : "inset 0 1px 4px rgba(13,27,42,0.18), 0 2px 8px rgba(201,168,76,0.25)";
      }}
    >
      {/* Stars (visible in dark) */}
      <span aria-hidden style={{
        position: "absolute", top: "50%", insetInlineStart: 8, transform: "translateY(-50%)",
        fontSize: dims.icon, color: "rgba(255,255,255,0.7)",
        opacity: isDark ? 1 : 0,
        transition: "opacity 0.3s ease",
      }}>✦</span>
      {/* Sun/cloud (visible in light) */}
      <span aria-hidden style={{
        position: "absolute", top: "50%", insetInlineEnd: 8, transform: "translateY(-50%)",
        fontSize: dims.icon, color: "#fff",
        opacity: isDark ? 0 : 1,
        transition: "opacity 0.3s ease",
      }}>☀</span>

      {/* Knob */}
      <span style={{
        position: "absolute",
        top: dims.pad,
        insetInlineStart: isDark ? dims.pad : `calc(100% - ${dims.knob + dims.pad}px)`,
        width: dims.knob,
        height: dims.knob,
        borderRadius: "50%",
        background: isDark
          ? "radial-gradient(circle at 30% 30%, #f4f4f5 0%, #d4d4d8 70%, #a1a1aa 100%)"
          : "radial-gradient(circle at 30% 30%, #fff8dc 0%, #f5d76e 60%, #C9A84C 100%)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.6)",
        transition: "inset-inline-start 0.35s cubic-bezier(0.4,0,0.2,1), background 0.35s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: dims.icon,
      }}>
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
