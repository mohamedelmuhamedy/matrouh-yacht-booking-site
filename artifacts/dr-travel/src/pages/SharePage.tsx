import { useEffect } from "react";
import { useSiteData } from "../context/SiteDataContext";
import { useLanguage } from "../LanguageContext";
import { apiUrl } from "../lib/api";
import ShareCard from "../components/ShareCard";
import SeoHead from "./../components/SeoHead";

function readSourceFromUrl(): string {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("s") || params.get("utm_source") || "";
  return raw.slice(0, 32).replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

function recordScan(source: string) {
  if (typeof window === "undefined") return;
  const url = apiUrl("/api/share/scan");
  const payload = JSON.stringify({ source, target: "card" });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(url, blob)) return;
    }
  } catch { /* fall through to fetch */ }
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch { /* ignore */ }
}

export default function SharePage() {
  const { settings } = useSiteData();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  useEffect(() => {
    const name = (ar ? settings.card_display_name_ar : settings.card_display_name_en)
      || settings.brand_name
      || "DR Travel";
    const tagline = (ar ? settings.card_tagline_ar : settings.card_tagline_en)
      || (ar ? settings.brand_tagline_ar : settings.brand_tagline_en)
      || "";
    document.title = tagline ? `${name} — ${tagline}` : name;
  }, [ar, settings]);

  useEffect(() => {
    // Defer scan recording to next tick so it never blocks paint.
    const handle = window.setTimeout(() => {
      recordScan(readSourceFromUrl());
    }, 0);
    return () => window.clearTimeout(handle);
    // Record once per page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardName = (ar ? settings.card_display_name_ar : settings.card_display_name_en) || settings.brand_name || "DR Travel";
  const cardTagline = (ar ? settings.card_tagline_ar : settings.card_tagline_en) || (ar ? settings.brand_tagline_ar : settings.brand_tagline_en) || "";
  return (
    <>
      <SeoHead
        title={cardTagline ? `${cardName} — ${cardTagline}` : cardName}
        description={cardTagline || (ar ? "بطاقة المشاركة الرسمية" : "Official share card")}
        path="/card"
        lang={ar ? "ar" : "en"}
        image={settings.logo_url || undefined}
      />
      <ShareCard settings={settings} />
    </>
  );
}
