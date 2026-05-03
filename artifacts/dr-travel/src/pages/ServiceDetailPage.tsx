import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import { apiFetch, resolveApiAssetUrl } from "../lib/api";
import { buildFeatureFromText, isFeatureItem, type FeatureItem } from "../lib/featureVisuals";

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
  features?: FeatureItem[];
  ctaTextAr: string;
  ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
}

// Build the effective feature list:
// 1. Prefer the rich `features` array (admin-edited per-feature visuals).
// 2. Fall back to the legacy AR/EN string arrays + auto-detected visuals.
function getEffectiveFeatures(service: DBService): FeatureItem[] {
  if (Array.isArray(service.features) && service.features.some(isFeatureItem)) {
    return service.features.filter(isFeatureItem);
  }
  const arLen = service.featuresAr?.length || 0;
  const enLen = service.featuresEn?.length || 0;
  const max = Math.max(arLen, enLen);
  const out: FeatureItem[] = [];
  for (let i = 0; i < max; i++) {
    const ar = service.featuresAr?.[i] || "";
    const en = service.featuresEn?.[i] || "";
    if (!ar && !en) continue;
    out.push(buildFeatureFromText(ar, en));
  }
  return out;
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
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--app-font-sans, Cairo, sans-serif)", color: "var(--section-subtitle)", background: "var(--bg-page)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
          <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--app-font-sans, Cairo, sans-serif)", padding: "2rem", textAlign: "center", background: "var(--bg-page)" }}>
        <div>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
          <h1 style={{ color: "white", fontSize: "1.5rem", marginBottom: "0.5rem" }}>{ar ? "الخدمة غير موجودة" : "Service not found"}</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>{ar ? "ربما تم حذف هذه الخدمة أو تغيير رابطها." : "This service may have been removed or its link changed."}</p>
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
  const featureItems = getEffectiveFeatures(service);
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
    <main dir={ar ? "rtl" : "ltr"} style={{ fontFamily: "var(--app-font-sans, Cairo, sans-serif)", background: "var(--bg-page)", minHeight: "100vh", color: "white" }}>

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
                  background: "var(--border)", color: "white",
                  border: "1.5px solid var(--border-strong)", borderRadius: 14,
                  padding: "0.95rem 1.65rem", cursor: "pointer",
                  fontWeight: 700, fontFamily: "inherit", fontSize: "0.95rem",
                  display: "inline-flex", alignItems: "center", gap: "0.55rem",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,211,102,0.85)"; e.currentTarget.style.borderColor = "#25D366"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "var(--border)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
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
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
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

        {featureItems.length > 0 && (
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
              {featureItems.map((feat, i) => {
                const v = { icon: feat.icon, image: feat.image, tint: feat.tint };
                const label = ar ? (feat.titleAr || feat.titleEn) : (feat.titleEn || feat.titleAr);
                return (
                  <div
                    key={i}
                    className="dr-feature-card"
                    style={{
                      position: "relative",
                      borderRadius: 16,
                      overflow: "hidden",
                      height: 165,
                      border: `1px solid var(--border)`,
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
                      e.currentTarget.style.borderColor = "var(--border)";
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
                        boxShadow: `0 6px 18px ${v.tint}88, inset 0 0 0 1px var(--border-strong)`,
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
                        {label}
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
              border: "1.5px solid var(--border-strong)",
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
              e.currentTarget.style.borderColor = "var(--border-strong)";
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
