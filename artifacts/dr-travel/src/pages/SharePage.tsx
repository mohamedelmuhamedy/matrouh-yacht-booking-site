import { useEffect } from "react";
import { useSiteData } from "../context/SiteDataContext";
import { useLanguage } from "../LanguageContext";
import ShareCard from "../components/ShareCard";

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

  return <ShareCard settings={settings} />;
}
