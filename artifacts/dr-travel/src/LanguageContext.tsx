import { createContext, useContext, useEffect, useState } from "react";
import { ar } from "./translations/ar";
import { en } from "./translations/en";
import type { Translations } from "./translations/ar";

type Lang = "ar" | "en";

const LANGUAGE_STORAGE_KEY = "drtravel-lang";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  t: ar,
});

function detectInitialLang(): Lang {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Lang | null;
  if (saved === "ar" || saved === "en") return saved;

  const browserLang = (
    navigator.languages?.[0] ??
    navigator.language ??
    ""
  ).toLowerCase();

  return browserLang.startsWith("ar") ? "ar" : "en";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectInitialLang());

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
  };

  const t = lang === "ar" ? ar : en;

  useEffect(() => {
    document.documentElement.dir = t.dir;
    document.documentElement.lang = t.lang;
  }, [t.dir, t.lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
