import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const PUBLIC_STORAGE_KEY = "dr-theme";
const ADMIN_STORAGE_KEY = "dr-admin-theme";

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
let themeTransitionTimer: number | undefined;

function isAdminPath(): boolean {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function storageKey(): string {
  return isAdminPath() ? ADMIN_STORAGE_KEY : PUBLIC_STORAGE_KEY;
}

function defaultPreference(): ThemePreference {
  return isAdminPath() ? "light" : "system";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(storageKey());
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return defaultPreference();
}

function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(p: ThemePreference): Theme {
  return p === "system" ? systemTheme() : p;
}

function applyTheme(t: Theme, animate = false) {
  const root = document.documentElement;
  const changed = root.getAttribute("data-theme") !== t;
  if (animate && changed) {
    root.classList.add("theme-changing");
    if (themeTransitionTimer) window.clearTimeout(themeTransitionTimer);
    themeTransitionTimer = window.setTimeout(() => {
      root.classList.remove("theme-changing");
      themeTransitionTimer = undefined;
    }, 210);
  }
  root.setAttribute("data-theme", t);
  // Update <meta name="theme-color"> dynamically so the mobile chrome bar follows the theme.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "light" ? "#f6f8fb" : "#0D1B2A");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => readStoredPreference());
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredPreference()));

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system changes when preference is "system".
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = mq.matches ? "light" : "dark";
      setTheme(next);
      applyTheme(next, true);
    };
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    const next = resolveTheme(p);
    setPreferenceState(p);
    try { localStorage.setItem(storageKey(), p); } catch {}
    setTheme(next);
    applyTheme(next, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === "dark" ? "light" : "dark");
  }, [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
