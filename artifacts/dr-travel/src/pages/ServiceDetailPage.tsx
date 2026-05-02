import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import { apiFetch, resolveApiAssetUrl } from "../lib/api";

export interface DBService {
  id: number;
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr: string;
  longDescriptionEn: string;
  imageUrl: string | null;
  aboutImageUrl: string | null;
  featuresImageUrl: string | null;
  ctaImageUrl: string | null;
  color: string;
  featuresAr: string[];
  featuresEn: string[];
  ctaTextAr: string;
  ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

// ── Keyword → visual mapping for feature chips ────────────────────────────────
// Each feature string is matched against AR/EN keywords and assigned a real
// stock photo background, themed icon, and tint colour. Falls back to a neutral
// ocean visual if nothing matches.
type FeatureVisual = { icon: string; image: string; tint: string };

const FEATURE_VISUAL_MAP: Array<{ keywords: string[] } & FeatureVisual> = [
  { keywords: ["يخت", "قارب", "مركب", "yacht", "boat", "vessel"], icon: "⛵", image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=600&auto=format&fit=crop&q=80", tint: "#0077B6" },
  { keywords: ["كابن", "كابتن", "طاقم", "بحار", "captain", "crew", "sailor", "skipper", "helm"], icon: "🧭", image: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=600&auto=format&fit=crop&q=80", tint: "#264653" },
  { keywords: ["مشروب", "وجب", "طعام", "قهو", "أكل", "drink", "food", "meal", "snack", "coffee", "refresh", "beverage"], icon: "🥤", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&auto=format&fit=crop&q=80", tint: "#E76F51" },
  { keywords: ["غطس", "غوص", "snorkel", "dive", "diving", "scuba"], icon: "🤿", image: "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?w=600&auto=format&fit=crop&q=80", tint: "#00B4D8" },
  { keywords: ["معد", "أدوات", "تجهيز", "equipment", "gear", "kit"], icon: "🎒", image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80", tint: "#2A9D8F" },
  { keywords: ["مكيف", "تكييف", "راحة", "air condition", "air-condition", "comfort", "cooling"], icon: "❄️", image: "https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=600&auto=format&fit=crop&q=80", tint: "#48CAE4" },
  { keywords: ["صحرا", "سفاري", "كثبان", "desert", "safari", "dune", "sand"], icon: "🏜️", image: "https://images.unsplash.com/photo-1473580044384-7ba9967e16a0?w=600&auto=format&fit=crop&q=80", tint: "#E9C46A" },
  { keywords: ["جيب", "سيارة", "دفع", "jeep", "4x4", "suv", "off-road", "offroad"], icon: "🚙", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80", tint: "#bc6c25" },
  { keywords: ["شاطئ", "بحر", "رمال", "beach", "shore", "ocean", "sea"], icon: "🏖️", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80", tint: "#0096C7" },
  { keywords: ["غروب", "شروق", "منظر", "إطلالة", "sunset", "sunrise", "view", "scenic", "panorama"], icon: "🌅", image: "https://images.unsplash.com/photo-1495344517868-8ebaf0a2044a?w=600&auto=format&fit=crop&q=80", tint: "#F4A261" },
  { keywords: ["صيد", "سمك", "fish", "fishing", "catch"], icon: "🎣", image: "https://images.unsplash.com/photo-1545566239-0789ed1f6e3a?w=600&auto=format&fit=crop&q=80", tint: "#1D3557" },
  { keywords: ["موسيق", "حفل", "ترفيه", "أغاني", "music", "party", "entertain", "dj"], icon: "🎶", image: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=600&auto=format&fit=crop&q=80", tint: "#9D4EDD" },
  { keywords: ["خيم", "مبيت", "مخيم", "نار", "camp", "tent", "overnight", "bonfire"], icon: "⛺", image: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=80", tint: "#6A994E" },
  { keywords: ["كواد", "بيك", "دراج", "quad", "atv", "buggy", "bike"], icon: "🏍️", image: "https://images.unsplash.com/photo-1571992072039-c6f78fcc7ae6?w=600&auto=format&fit=crop&q=80", tint: "#D62828" },
  { keywords: ["جمل", "خيل", "حصان", "camel", "horse", "ride"], icon: "🐪", image: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=600&auto=format&fit=crop&q=80", tint: "#A0522D" },
  { keywords: ["سعر", "خصم", "عرض", "تخفيض", "price", "discount", "offer", "deal"], icon: "💎", image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80", tint: "#C9A84C" },
  { keywords: ["أمان", "تأمين", "حماية", "safe", "safety", "secure", "insurance"], icon: "🛡️", image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80", tint: "#2D6A4F" },
  { keywords: ["وقت", "ساعة", "مدة", "time", "hour", "duration", "schedule"], icon: "🕒", image: "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=600&auto=format&fit=crop&q=80", tint: "#5E548E" },
  { keywords: ["صور", "تصوير", "كاميرا", "photo", "camera", "shoot", "shot"], icon: "📸", image: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&auto=format&fit=crop&q=80", tint: "#7209B7" },
  { keywords: ["دليل", "مرشد", "guide", "tour"], icon: "🧑‍✈️", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80", tint: "#3D348B" },
  { keywords: ["نقل", "مواصلات", "توصيل", "transport", "transfer", "pickup", "shuttle"], icon: "🚐", image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=600&auto=format&fit=crop&q=80", tint: "#457B9D" },
  { keywords: ["فندق", "إقامة", "غرف", "hotel", "stay", "accommodation", "room", "resort"], icon: "🏨", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&auto=format&fit=crop&q=80", tint: "#264653" },
  { keywords: ["مسبح", "حمام سباحة", "pool", "swim", "swimming"], icon: "🏊", image: "https://images.unsplash.com/photo-1563299796-17596ed6b017?w=600&auto=format&fit=crop&q=80", tint: "#0096C7" },
  { keywords: ["سبا", "مساج", "استرخاء", "spa", "massage", "relax", "wellness"], icon: "💆", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80", tint: "#B5838D" },
];

const DEFAULT_FEATURE_VISUAL: FeatureVisual = {
  icon: "✨",
  image: "https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=600&auto=format&fit=crop&q=80",
  tint: "#00AAFF",
};

function getFeatureVisual(text: string): FeatureVisual {
  const lower = (text || "").toLowerCase();
  for (const entry of FEATURE_VISUAL_MAP) {
    if (entry.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return { icon: entry.icon, image: entry.image, tint: entry.tint };
    }
  }
  return DEFAULT_FEATURE_VISUAL;
}

export default function ServiceDetailPage() {
  const [, params] = useRoute("/services/:slug");
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const { settings } = useSiteData();
  const ar = lang === "ar";

  const [service, setService] = useState<DBService | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const slug = params?.slug;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    apiFetch(`/api/services/${encodeURIComponent(slug)}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error(`Service API ${r.status}`);
        return r.json();
      })
      .then(data => { if (data) setService(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [slug]);

  const goHome = () => navigate("/#services");

  if (loading) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--app-font-sans, Cairo, sans-serif)", color: "#667788", background: "#0D1B2A" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
          <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--app-font-sans, Cairo, sans-serif)", padding: "2rem", textAlign: "center", background: "#0D1B2A" }}>
        <div>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
          <h1 style={{ color: "white", fontSize: "1.5rem", marginBottom: "0.5rem" }}>{ar ? "الخدمة غير موجودة" : "Service not found"}</h1>
          <p style={{ color: "#99aabb", marginBottom: "1.5rem" }}>{ar ? "ربما تم حذف هذه الخدمة أو تغيير رابطها." : "This service may have been removed or its link changed."}</p>
          <button
            onClick={() => navigate("/")}
            style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.75rem", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: "0.95rem", boxShadow: "0 4px 16px rgba(0,170,255,0.35)" }}>
            {ar ? "العودة للرئيسية" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const title = ar ? service.titleAr : (service.titleEn || service.titleAr);
  const desc = ar ? service.descriptionAr : (service.descriptionEn || service.descriptionAr);
  const longDesc = ar ? service.longDescriptionAr : (service.longDescriptionEn || service.longDescriptionAr);
  const features = ar ? service.featuresAr : (service.featuresEn?.length ? service.featuresEn : service.featuresAr);
  const ctaText = ar ? service.ctaTextAr : (service.ctaTextEn || service.ctaTextAr);
  const ctaLink = service.ctaLink || "/trips";
  const heroImage = service.imageUrl ? resolveApiAssetUrl(service.imageUrl) : "";
  const aboutImage = service.aboutImageUrl ? resolveApiAssetUrl(service.aboutImageUrl) : "";
  const featuresImage = service.featuresImageUrl ? resolveApiAssetUrl(service.featuresImageUrl) : "";
  const ctaImage = service.ctaImageUrl ? resolveApiAssetUrl(service.ctaImageUrl) : "";
  const accent = service.color || "#00AAFF";
  const whatsapp = settings.whatsapp_number || "";

  const handleCta = () => {
    if (ctaLink.startsWith("/")) {
      navigate(ctaLink);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.open(ctaLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleWhatsApp = () => {
    if (!whatsapp) return;
    const cleaned = whatsapp.replace(/[^\d]/g, "");
    const number = cleaned.startsWith("0") ? "20" + cleaned.slice(1) : cleaned;
    const msg = encodeURIComponent(ar ? `مرحبا، أريد الاستفسار عن خدمة: ${title}` : `Hello, I'd like to ask about: ${title}`);
    window.open(`https://wa.me/${number}?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  // Section banner — reusable hero strip with image + dark overlay + label
  const SectionBanner = ({ image, label, title, height = 150 }: { image: string; label: string; title: string; height?: number }) => (
    <div style={{
      position: "relative",
      borderRadius: 16,
      overflow: "hidden",
      height,
      marginBottom: "1.25rem",
      background: image
        ? `linear-gradient(${ar ? "270deg" : "90deg"}, rgba(13,27,42,0.92) 0%, rgba(13,27,42,0.55) 70%, rgba(13,27,42,0.35) 100%), url(${image}) center/cover`
        : `linear-gradient(135deg, ${accent}30 0%, rgba(13,27,42,0.85) 100%)`,
      border: `1px solid ${accent}25`,
      boxShadow: `0 6px 28px rgba(0,0,0,0.35)`,
      display: "flex",
      alignItems: "center",
      padding: "1.4rem 1.75rem",
    }}>
      <div style={{ position: "relative", maxWidth: "70%" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.7rem", fontWeight: 800,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color: accent, marginBottom: "0.45rem",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          <span style={{ width: 22, height: 2, background: accent, borderRadius: 2 }} />
          {label}
        </div>
        <h2 style={{
          fontSize: "clamp(1.25rem, 2.5vw, 1.55rem)", fontWeight: 900, color: "white",
          margin: 0, lineHeight: 1.2,
          textShadow: "0 2px 12px rgba(0,0,0,0.65)",
        }}>
          {title}
        </h2>
      </div>
    </div>
  );

  return (
    <main dir={ar ? "rtl" : "ltr"} style={{ fontFamily: "var(--app-font-sans, Cairo, sans-serif)", background: "#0D1B2A", minHeight: "100vh", color: "white" }}>

      {/* Floating back-to-home button — always visible while scrolling */}
      <button
        onClick={goHome}
        aria-label={ar ? "العودة للصفحة الرئيسية" : "Back to home"}
        style={{
          position: "fixed",
          top: "84px",
          [ar ? "right" : "left"]: "1.25rem",
          zIndex: 50,
          background: "rgba(13,27,42,0.85)",
          backdropFilter: "blur(12px)",
          color: "white",
          border: `1.5px solid ${accent}55`,
          borderRadius: 50,
          padding: "0.6rem 1.1rem",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "0.85rem",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
          transition: "all 0.25s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `linear-gradient(135deg, ${accent}, ${accent}cc)`;
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.borderColor = accent;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(13,27,42,0.85)";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.borderColor = `${accent}55`;
        }}
      >
        <span style={{ fontSize: "1.1rem" }}>{ar ? "→" : "←"}</span>
        <span>{ar ? "الرئيسية" : "Home"}</span>
      </button>

      {/* HERO — full-width parallax with deep gradient overlay */}
      <section style={{
        position: "relative",
        minHeight: "62vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "8rem 1.5rem 5rem",
        overflow: "hidden",
        background: heroImage
          ? `linear-gradient(135deg, rgba(13,27,42,0.78) 0%, rgba(13,27,42,0.55) 50%, rgba(8,16,26,0.92) 100%), url(${heroImage}) center/cover fixed`
          : `radial-gradient(ellipse at 30% 0%, ${accent}38 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(201,168,76,0.18) 0%, transparent 50%), #0D1B2A`,
        borderBottom: `1px solid ${accent}30`,
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: "-100px", insetInlineStart: "-100px", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${accent}25, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-150px", insetInlineEnd: "-150px", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, rgba(201,168,76,0.15), transparent 70%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 880, margin: "0 auto", zIndex: 2 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.55rem",
            background: `${accent}20`, border: `1.5px solid ${accent}55`,
            color: "white", padding: "0.5rem 1.1rem", borderRadius: 50,
            fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.5px",
            marginBottom: "1.5rem",
            backdropFilter: "blur(8px)",
            boxShadow: `0 4px 20px ${accent}30`,
          }}>
            <span style={{ fontSize: "1.1rem" }}>{service.icon}</span>
            <span>{ar ? "خدماتنا" : "Our Services"}</span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.2rem, 5.5vw, 3.6rem)", fontWeight: 900,
            margin: "0 0 1.1rem", lineHeight: 1.1, letterSpacing: "-0.5px",
            background: `linear-gradient(135deg, #ffffff 0%, ${accent} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: heroImage ? "0 4px 30px rgba(0,0,0,0.5)" : "none",
          }}>
            {title}
          </h1>

          <p style={{
            fontSize: "1.1rem", lineHeight: 1.85, color: "#cbd5e1",
            maxWidth: 640, margin: "0 auto 2rem",
            textShadow: heroImage ? "0 2px 8px rgba(0,0,0,0.6)" : "none",
          }}>
            {desc}
          </p>

          {/* Quick CTAs in hero */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleCta}
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                color: "white", border: "none", borderRadius: 14,
                padding: "0.95rem 2rem", cursor: "pointer",
                fontWeight: 800, fontFamily: "inherit", fontSize: "0.98rem",
                boxShadow: `0 8px 24px ${accent}55`,
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
            >
              {ctaText}
            </button>
            {whatsapp && (
              <button
                onClick={handleWhatsApp}
                style={{
                  background: "rgba(255,255,255,0.08)", color: "white",
                  border: "1.5px solid rgba(255,255,255,0.2)", borderRadius: 14,
                  padding: "0.95rem 1.65rem", cursor: "pointer",
                  fontWeight: 700, fontFamily: "inherit", fontSize: "0.95rem",
                  display: "inline-flex", alignItems: "center", gap: "0.55rem",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,211,102,0.85)"; e.currentTarget.style.borderColor = "#25D366"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              >
                💬 {ar ? "استفسر الآن" : "Ask now"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section style={{ maxWidth: 980, margin: "0 auto", padding: "4rem 1.5rem 2rem" }}>

        {longDesc && (
          <div style={{ marginBottom: "3.5rem" }}>
            <SectionBanner
              image={aboutImage}
              label={ar ? "نبذة عن الخدمة" : "About this service"}
              title={ar ? "اعرف أكتر عن تجربتنا" : "Learn more about us"}
            />
            <div style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "1.75rem 2rem",
            }}>
              <p style={{
                color: "#cbd5e1", fontSize: "1.05rem", lineHeight: 2,
                margin: 0, whiteSpace: "pre-line",
              }}>
                {longDesc}
              </p>
            </div>
          </div>
        )}

        {features.length > 0 && (
          <div style={{ marginBottom: "3.5rem" }}>
            <SectionBanner
              image={featuresImage}
              label={ar ? "ما يميز هذه الخدمة" : "What's included"}
              title={ar ? "كل اللي هتلاقيه معانا" : "Everything you'll get"}
            />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: "0.85rem",
            }}>
              {features.map((feat, i) => {
                const v = getFeatureVisual(feat);
                return (
                  <div
                    key={i}
                    className="dr-feature-card"
                    style={{
                      position: "relative",
                      borderRadius: 16,
                      overflow: "hidden",
                      height: 165,
                      border: `1px solid rgba(255,255,255,0.10)`,
                      background: `#0D1B2A`,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                      transition: "transform 0.35s cubic-bezier(.2,.7,.2,1), box-shadow 0.35s, border-color 0.35s",
                      cursor: "default",
                      animation: `dr-feat-fade-in 0.5s cubic-bezier(.2,.7,.2,1) ${i * 60}ms both`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.boxShadow = `0 16px 40px ${v.tint}55`;
                      e.currentTarget.style.borderColor = `${v.tint}aa`;
                      const img = e.currentTarget.querySelector(".dr-feat-img") as HTMLDivElement | null;
                      if (img) img.style.transform = "scale(1.08)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.4)";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                      const img = e.currentTarget.querySelector(".dr-feat-img") as HTMLDivElement | null;
                      if (img) img.style.transform = "scale(1)";
                    }}
                  >
                    {/* zooming background image */}
                    <div
                      className="dr-feat-img"
                      style={{
                        position: "absolute", inset: 0,
                        backgroundImage: `url(${v.image})`,
                        backgroundSize: "cover", backgroundPosition: "center",
                        transition: "transform 0.6s cubic-bezier(.2,.7,.2,1)",
                      }}
                    />
                    {/* dark gradient + colour wash overlay */}
                    <div style={{
                      position: "absolute", inset: 0,
                      background: `linear-gradient(180deg, rgba(13,27,42,0.15) 0%, rgba(13,27,42,0.55) 50%, rgba(13,27,42,0.95) 100%), linear-gradient(135deg, ${v.tint}25 0%, transparent 60%)`,
                      pointerEvents: "none",
                    }} />
                    {/* content */}
                    <div style={{
                      position: "absolute", inset: 0,
                      padding: "0.95rem 1rem",
                      display: "flex", flexDirection: "column", justifyContent: "space-between",
                    }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `linear-gradient(135deg, ${v.tint}, ${v.tint}cc)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem",
                        boxShadow: `0 6px 18px ${v.tint}88, inset 0 0 0 1px rgba(255,255,255,0.2)`,
                      }}>
                        {v.icon}
                      </div>
                      <div style={{
                        color: "white", fontWeight: 800,
                        fontSize: "0.95rem", lineHeight: 1.35,
                        textShadow: "0 2px 10px rgba(0,0,0,0.85)",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}>
                        {feat}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA card with optional cover image */}
        <div style={{
          position: "relative",
          padding: "3rem 2rem",
          borderRadius: 22,
          border: `1.5px solid ${accent}45`,
          textAlign: "center",
          overflow: "hidden",
          background: ctaImage
            ? `linear-gradient(135deg, rgba(13,27,42,0.85) 0%, rgba(13,27,42,0.7) 100%), url(${ctaImage}) center/cover`
            : `linear-gradient(135deg, ${accent}22 0%, rgba(201,168,76,0.1) 100%)`,
          boxShadow: `0 12px 50px ${accent}20`,
        }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, ${accent}12 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{service.icon}</div>
            <h3 style={{ color: "white", fontSize: "1.6rem", fontWeight: 900, margin: "0 0 0.5rem", textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
              {ar ? "جاهز تبدأ تجربتك؟" : "Ready to start your experience?"}
            </h3>
            <p style={{ color: "#cbd5e1", fontSize: "1rem", margin: "0 0 1.75rem", textShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
              {ar ? "احجز الآن أو تواصل معنا للاستفسار" : "Book now or contact us with any questions"}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleCta}
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                  color: "white", border: "none", borderRadius: 14,
                  padding: "1rem 2.25rem", cursor: "pointer",
                  fontWeight: 800, fontFamily: "inherit", fontSize: "1rem",
                  boxShadow: `0 8px 24px ${accent}66`,
                  transition: "transform 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
              >
                {ctaText}
              </button>
              {whatsapp && (
                <button
                  onClick={handleWhatsApp}
                  style={{
                    background: "#25D366", color: "white", border: "none",
                    borderRadius: 14, padding: "1rem 1.75rem", cursor: "pointer",
                    fontWeight: 800, fontFamily: "inherit", fontSize: "1rem",
                    display: "inline-flex", alignItems: "center", gap: "0.55rem",
                    boxShadow: "0 8px 24px rgba(37,211,102,0.5)",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  💬 {ar ? "واتساب" : "WhatsApp"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom back-to-home */}
        <div style={{ marginTop: "3rem", textAlign: "center", paddingBottom: "1rem" }}>
          <button
            onClick={goHome}
            style={{
              background: "transparent",
              color: "#cbd5e1",
              border: "1.5px solid rgba(255,255,255,0.18)",
              borderRadius: 14,
              padding: "0.95rem 2rem",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.95rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.55rem",
              transition: "all 0.25s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${accent}20`;
              e.currentTarget.style.borderColor = accent;
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
              e.currentTarget.style.color = "#cbd5e1";
            }}
          >
            <span>{ar ? "→" : "←"}</span>
            <span>{ar ? "تصفح كل الخدمات" : "Browse all services"}</span>
          </button>
        </div>
      </section>
    </main>
  );
}
