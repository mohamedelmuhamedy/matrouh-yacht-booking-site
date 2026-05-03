import { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { type SiteSettings } from "../context/SiteDataContext";
import { resolveApiAssetUrl } from "../lib/api";
import { ShareCardQRBadge } from "./ShareCardQR";
import logoFallback from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";

function LanguagePill() {
  const { lang, setLang } = useLanguage();
  return (
    <div style={{
      position: "absolute", top: "1rem",
      insetInlineEnd: "1rem",
      display: "inline-flex", padding: 4,
      background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.18)",
      borderRadius: 999, gap: 2, backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)", zIndex: 5,
    }}>
      {(["ar", "en"] as const).map(code => {
        const active = lang === code;
        return (
          <button key={code} type="button" onClick={() => setLang(code)}
            style={{
              padding: "0.3rem 0.85rem", borderRadius: 999,
              background: active ? "rgba(255,255,255,0.95)" : "transparent",
              color: active ? "#0D1B2A" : "rgba(255,255,255,0.85)",
              border: "none", cursor: "pointer",
              fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "0.78rem",
              transition: "background 0.2s",
            }}>
            {code === "ar" ? "العربية" : "English"}
          </button>
        );
      })}
    </div>
  );
}

export const GRADIENT_PRESETS: { value: string; labelAr: string; labelEn: string; css: string }[] = [
  { value: "ocean",    labelAr: "محيط",       labelEn: "Ocean",    css: "linear-gradient(160deg,#0D1B2A 0%,#10243a 50%,#1a3a5c 100%)" },
  { value: "gold",     labelAr: "ذهبي",       labelEn: "Gold",     css: "linear-gradient(160deg,#1a1208 0%,#3a2a10 50%,#C9A84C 100%)" },
  { value: "sunset",   labelAr: "غروب",       labelEn: "Sunset",   css: "linear-gradient(160deg,#2d0e2e 0%,#7a2d3f 50%,#F97316 100%)" },
  { value: "forest",   labelAr: "غابة",       labelEn: "Forest",   css: "linear-gradient(160deg,#0a1f0e 0%,#0e3a1f 50%,#16a34a 100%)" },
  { value: "midnight", labelAr: "منتصف الليل", labelEn: "Midnight", css: "linear-gradient(160deg,#000 0%,#0D1B2A 50%,#1a1a2e 100%)" },
  { value: "aurora",   labelAr: "شفق",        labelEn: "Aurora",   css: "linear-gradient(160deg,#0a0e2a 0%,#5b21b6 50%,#06B6D4 100%)" },
];

export const THEME_OPTIONS: { value: string; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
  { value: "glass",   labelAr: "زجاجي",   labelEn: "Glass",   descAr: "بطاقة شفافة بطبقة ضبابية فوق الخلفية", descEn: "Translucent card with blur over the background" },
  { value: "solid",   labelAr: "مصمت",    labelEn: "Solid",   descAr: "بطاقة بلون داكن واضح وحدود ناعمة",     descEn: "Dark opaque card with soft borders" },
  { value: "minimal", labelAr: "بسيط",    labelEn: "Minimal", descAr: "بدون بطاقة — العناصر فوق الخلفية مباشرة", descEn: "No card — content sits directly on the background" },
];

function isSafeImageUrl(raw: string): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  if (v.startsWith("javascript:") || v.startsWith("data:") || v.startsWith("vbscript:")) return false;
  if (v.startsWith("/") || v.startsWith("http://") || v.startsWith("https://")) return true;
  return false;
}

function safeHref(raw: string, allowed: ("http" | "tel" | "mailto")[]): string {
  const v = (raw || "").trim();
  if (!v) return "#";
  const lower = v.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) return "#";
  if (allowed.includes("http") && (lower.startsWith("http://") || lower.startsWith("https://"))) return v;
  if (allowed.includes("http") && !/^[a-z][a-z0-9+.-]*:/.test(lower)) return `https://${v}`;
  if (allowed.includes("tel") && lower.startsWith("tel:")) return v;
  if (allowed.includes("mailto") && lower.startsWith("mailto:")) return v;
  return "#";
}

export function getCardBackground(settings: SiteSettings): React.CSSProperties {
  const type = settings.card_bg_type || "gradient";
  if (type === "image" && isSafeImageUrl(settings.card_bg_image_url || "")) {
    const url = resolveApiAssetUrl(settings.card_bg_image_url);
    const safeUrl = String(url).replace(/[)\\"']/g, encodeURIComponent);
    return {
      backgroundImage: `linear-gradient(rgba(13,27,42,0.45), rgba(13,27,42,0.7)), url("${safeUrl}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    };
  }
  if (type === "solid") {
    return { background: settings.card_bg_color || "#0D1B2A" };
  }
  const preset = GRADIENT_PRESETS.find(g => g.value === (settings.card_bg_gradient || "ocean")) || GRADIENT_PRESETS[0];
  return { background: preset.css };
}

const FacebookIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>);
const InstagramIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>);
const TikTokIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>);
const WhatsAppIcon = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>);
const PhoneIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>);
const LocationIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>);
const GlobeIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>);
const MailIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>);
const ShareIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>);
const CopyIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>);
const ArrowIcon = ({ flip }: { flip?: boolean }) => (<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ transform: flip ? "scaleX(-1)" : undefined }}><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>);

interface LinkConfig {
  key: string;
  show: boolean;
  href: string;
  icon: React.ReactNode;
  labelAr: string;
  labelEn: string;
  color: string;
  external: boolean;
}

function buildLinks(settings: SiteSettings): LinkConfig[] {
  const isOn = (key: string, def = "true") => (settings[key] ?? def) === "true";
  const waNum = settings.whatsapp_number || "";
  const phone = settings.phone_number || "";
  const cleanWa = waNum.replace(/\D/g, "");

  const facebook = safeHref(settings.facebook_url || "", ["http"]);
  const instagram = safeHref(settings.instagram_url || "", ["http"]);
  const tiktok = safeHref(settings.tiktok_url || "", ["http"]);
  const website = safeHref(settings.card_website_url || "", ["http"]);
  const maps = safeHref(settings.maps_url || "", ["http"]);
  const email = (settings.card_email || "").trim();
  const emailHref = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}` : "#";
  const emailValid = emailHref !== "#";
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "#";

  const list: LinkConfig[] = [
    { key: "whatsapp",  show: isOn("card_show_whatsapp")  && !!cleanWa,                  href: `https://wa.me/${cleanWa}`, icon: <WhatsAppIcon />,  labelAr: "واتساب",         labelEn: "WhatsApp",  color: "#25D366", external: true },
    { key: "phone",     show: isOn("card_show_phone")     && !!phone,                    href: phoneHref,                  icon: <PhoneIcon />,    labelAr: "اتصل بنا",        labelEn: "Call us",   color: "#00AAFF", external: false },
    { key: "facebook",  show: isOn("card_show_facebook")  && facebook !== "#",           href: facebook,                   icon: <FacebookIcon />, labelAr: "فيسبوك",          labelEn: "Facebook",  color: "#1877F2", external: true },
    { key: "instagram", show: isOn("card_show_instagram") && instagram !== "#",          href: instagram,                  icon: <InstagramIcon />,labelAr: "إنستجرام",        labelEn: "Instagram", color: "#E1306C", external: true },
    { key: "tiktok",    show: isOn("card_show_tiktok")    && tiktok !== "#",             href: tiktok,                     icon: <TikTokIcon />,   labelAr: "تيك توك",         labelEn: "TikTok",    color: "#000000", external: true },
    { key: "email",     show: isOn("card_show_email")     && emailValid,                 href: emailHref,                  icon: <MailIcon />,     labelAr: "البريد الإلكتروني", labelEn: "Email",     color: "#EA4335", external: false },
    { key: "website",   show: isOn("card_show_website")   && website !== "#",            href: website,                    icon: <GlobeIcon />,    labelAr: "الموقع الإلكتروني", labelEn: "Website",   color: "#0EA5E9", external: true },
    { key: "maps",      show: isOn("card_show_maps")      && maps !== "#",               href: maps,                       icon: <LocationIcon />, labelAr: "موقعنا على الخريطة", labelEn: "Find us on Maps", color: "#C9A84C", external: true },
  ];
  return list.filter(l => l.show);
}

export default function ShareCard({ settings, mainSiteUrl }: { settings: SiteSettings; mainSiteUrl?: string }) {
  const { lang, t } = useLanguage();
  const ar = lang === "ar";
  const [copied, setCopied] = useState(false);

  const accent = settings.card_accent_color || "#00AAFF";
  const theme = settings.card_theme || "glass";
  const logoSrc = resolveApiAssetUrl(settings.logo_url) || logoFallback;

  const displayName = (ar ? settings.card_display_name_ar : settings.card_display_name_en)
    || settings.brand_name
    || "DR Travel";
  const tagline = (ar ? settings.card_tagline_ar : settings.card_tagline_en)
    || (ar ? settings.brand_tagline_ar : settings.brand_tagline_en)
    || "";
  const bio = (ar ? settings.card_bio_ar : settings.card_bio_en) || "";

  const links = buildLinks(settings);

  const cardBgStyle: React.CSSProperties = (() => {
    if (theme === "minimal") return { background: "transparent", border: "none", boxShadow: "none", backdropFilter: "none" };
    if (theme === "solid")   return { background: "rgba(13,27,42,0.92)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 60px rgba(0,0,0,0.5)" };
    return { background: "rgba(13,27,42,0.55)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 30px 60px rgba(0,0,0,0.45)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)" } as React.CSSProperties;
  })();

  const buttonBaseStyle = (color: string): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: "0.85rem",
    background: theme === "minimal" ? "rgba(13,27,42,0.55)" : "rgba(255,255,255,0.06)",
    border: `1px solid ${color}40`,
    color: "#fff", textDecoration: "none",
    padding: "0.95rem 1.1rem", borderRadius: "14px",
    fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem",
    transition: "transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s",
    cursor: "pointer", width: "100%", textAlign: ar ? "right" : "left", direction: ar ? "rtl" : "ltr",
    backdropFilter: theme === "minimal" ? "blur(8px)" : undefined,
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const onShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: displayName, text: tagline, url: shareUrl });
        return;
      }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* ignore */ }
  };

  const visitHref = mainSiteUrl
    || (typeof window !== "undefined" ? `${window.location.origin}/` : "/");

  const showQrBadge = (settings.card_qr_show_on_card ?? "false") === "true";
  const qrFg = settings.card_qr_fg || "#0D1B2A";
  const qrBg = settings.card_qr_bg || "#FFFFFF";
  const qrUrl = typeof window !== "undefined" ? `${window.location.origin}/card` : "/card";

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh", width: "100%",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "2.5rem 1rem 3rem", position: "relative",
        fontFamily: "Cairo, sans-serif", color: "#fff",
        ...getCardBackground(settings),
      }}
    >
      <LanguagePill />
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{
          ...cardBgStyle,
          borderRadius: "26px",
          padding: theme === "minimal" ? "1.5rem 0.5rem 0.5rem" : "2rem 1.5rem 1.5rem",
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "0.85rem",
        }}>
          <img
            src={logoSrc}
            alt={displayName}
            style={{
              width: 110, height: 110, borderRadius: "50%",
              objectFit: "cover",
              border: `3px solid ${accent}`,
              boxShadow: `0 0 36px ${accent}55`,
              background: "#0a1520",
            }}
          />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "0.35rem", padding: "0 0.5rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 900, letterSpacing: "0.5px", lineHeight: 1.2 }}>
              {displayName}
            </h1>
            {tagline && (
              <div style={{ color: accent, fontSize: "0.92rem", fontWeight: 700 }}>{tagline}</div>
            )}
            {bio && (
              <p style={{ margin: "0.4rem 0 0", color: "rgba(255,255,255,0.78)", fontSize: "0.9rem", lineHeight: 1.7, whiteSpace: "pre-line" }}>{bio}</p>
            )}
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
            {links.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", textAlign: "center", padding: "1rem" }}>
                {ar ? "لم يتم تفعيل أي روابط بعد" : "No links enabled yet"}
              </div>
            )}
            {links.map(link => (
              <a
                key={link.key}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                style={buttonBaseStyle(link.color)}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.background = `${link.color}28`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${link.color}cc`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 24px ${link.color}40`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.background = theme === "minimal" ? "rgba(13,27,42,0.55)" : "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = `${link.color}40`;
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <span style={{
                  width: 38, height: 38, borderRadius: "11px",
                  background: `${link.color}26`, color: link.color,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{link.icon}</span>
                <span style={{ flex: 1 }}>{ar ? link.labelAr : link.labelEn}</span>
                <span style={{ opacity: 0.5, color: "#fff" }}><ArrowIcon flip={ar} /></span>
              </a>
            ))}
          </div>
        </div>

        {showQrBadge && (
          <ShareCardQRBadge
            url={qrUrl}
            fg={qrFg}
            bg={qrBg}
            accent={accent}
            logoSrc={logoSrc}
            label={t.shareCardQr.badgeLabel}
          />
        )}

        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={onShare}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              background: accent, color: "#0a1520",
              border: "none", borderRadius: "14px",
              padding: "0.95rem 1rem",
              fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "0.92rem",
              cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: `0 10px 24px ${accent}55`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
          >
            <ShareIcon />
            {copied ? (ar ? "تم النسخ ✓" : "Copied ✓") : (ar ? "شارك البطاقة" : "Share this card")}
          </button>
          <a
            href={visitHref}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              background: "rgba(255,255,255,0.08)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.18)", borderRadius: "14px",
              padding: "0.95rem 1rem", textDecoration: "none",
              fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "0.92rem",
              transition: "background 0.2s, transform 0.2s",
              backdropFilter: "blur(8px)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            <GlobeIcon />
            {ar ? "زيارة الموقع الرئيسي" : "Visit main site"}
          </a>
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: "0.72rem", marginTop: "0.25rem" }}>
          © {new Date().getFullYear()} {settings.brand_short_name || settings.brand_name || "DR Travel"}
        </div>
      </div>
    </div>
  );
}
