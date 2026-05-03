import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "dr-theme";

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {}
  return "system";
}

function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(p: ThemePreference): Theme {
  return p === "system" ? systemTheme() : p;
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
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
    const onChange = () => setTheme(mq.matches ? "light" : "dark");
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try { localStorage.setItem(STORAGE_KEY, p); } catch {}
    setTheme(resolveTheme(p));
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
