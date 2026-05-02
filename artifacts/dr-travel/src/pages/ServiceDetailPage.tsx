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
  const SectionBanner = ({ image, label, title, height = 180 }: { image: string; label: string; title: string; height?: number }) => (
    <div style={{
      position: "relative",
      borderRadius: 18,
      overflow: "hidden",
      height,
      marginBottom: "1.5rem",
      background: image
        ? `linear-gradient(135deg, rgba(13,27,42,0.55) 0%, rgba(13,27,42,0.85) 100%), url(${image}) center/cover`
        : `linear-gradient(135deg, ${accent}40 0%, rgba(13,27,42,0.85) 100%)`,
      border: `1px solid ${accent}30`,
      boxShadow: `0 6px 30px rgba(0,0,0,0.35)`,
      display: "flex",
      alignItems: "flex-end",
      padding: "1.5rem 1.75rem",
    }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(0deg, rgba(13,27,42,0.6) 0%, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative" }}>
        <div style={{
          display: "inline-block",
          fontSize: "0.72rem", fontWeight: 800,
          letterSpacing: "1.5px", textTransform: "uppercase",
          color: accent, marginBottom: "0.4rem",
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          {label}
        </div>
        <h2 style={{
          fontSize: "1.5rem", fontWeight: 900, color: "white",
          margin: 0, lineHeight: 1.2,
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
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
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1rem",
            }}>
              {features.map((feat, i) => (
                <div
                  key={i}
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                    border: `1px solid ${accent}30`,
                    borderRadius: 14,
                    padding: "1.1rem 1.2rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.85rem",
                    color: "#e2e8f0",
                    fontWeight: 600,
                    fontSize: "0.97rem",
                    transition: "all 0.25s",
                    backdropFilter: "blur(6px)",
                    cursor: "default",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${accent}18 0%, ${accent}05 100%)`;
                    e.currentTarget.style.borderColor = `${accent}80`;
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = `0 10px 30px ${accent}25`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)";
                    e.currentTarget.style.borderColor = `${accent}30`;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    color: "white", borderRadius: "50%",
                    width: 32, height: 32,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.9rem", fontWeight: 800, flexShrink: 0,
                    boxShadow: `0 4px 12px ${accent}55`,
                  }}>
                    ✓
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
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
