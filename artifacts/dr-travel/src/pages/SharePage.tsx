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
    document.title = "DR Travel | مرسى مطروح - يخت سياحة وسفاري";
  }, []);

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
  const siteUrl = "https://www.drtravel-matrouh.com";
  const logoUrl = settings.logo_url || `${siteUrl}/icon-512.png`;
  const phone = settings.whatsapp_number || "201205756024";
  const cardStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: cardName,
    url: `${siteUrl}/card`,
    logo: logoUrl,
    image: logoUrl,
    telephone: `+${phone}`,
    description: "DR Travel في مرسى مطروح: رحلات يخت سياحة وسفاري وتجارب بحرية مناسبة للحجز السريع عبر QR.",
    sameAs: [settings.instagram_url, settings.tiktok_url].filter(Boolean),
  };
  return (
    <>
      <SeoHead
        title="DR Travel | مرسى مطروح - يخت سياحة وسفاري"
        description={cardTagline || "بطاقة DR Travel الرقمية للحجز السريع في مرسى مطروح: رحلات يخت سياحة وسفاري وتجارب بحرية مع روابط التواصل والموقع."}
        path="/card"
        lang={ar ? "ar" : "en"}
        image={logoUrl}
        structuredData={cardStructuredData}
      />
      <ShareCard settings={settings} />
    </>
  );
}
