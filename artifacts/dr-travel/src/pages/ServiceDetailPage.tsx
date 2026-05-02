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

  const goHome = () => {
    navigate("/#services");
  };

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

  return (
    <main dir={ar ? "rtl" : "ltr"} style={{ fontFamily: "var(--app-font-sans, Cairo, sans-serif)", background: "#0D1B2A", minHeight: "100vh", color: "white" }}>

      {/* HERO — matches the site's dark navy + gold/blue accent palette */}
      <section style={{
        position: "relative",
        background: heroImage
          ? `linear-gradient(135deg, rgba(13,27,42,0.92) 0%, rgba(13,27,42,0.78) 50%, rgba(8,16,26,0.92) 100%), url(${heroImage}) center/cover`
          : `radial-gradient(ellipse at 30% 0%, ${accent}28 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(201,168,76,0.12) 0%, transparent 50%), #0D1B2A`,
        padding: "7rem 1.5rem 4.5rem",
        textAlign: "center",
        overflow: "hidden",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        {/* Decorative wave bottom */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.15, background: `radial-gradient(circle at 50% 100%, ${accent}, transparent 60%)`, pointerEvents: "none" }} />

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: `${accent}15`, border: `1px solid ${accent}40`,
            color: accent, padding: "0.4rem 1rem", borderRadius: 50,
            fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.5px",
            marginBottom: "1.25rem",
          }}>
            <span style={{ fontSize: "1rem" }}>{service.icon}</span>
            <span>{ar ? "خدماتنا" : "Our Services"}</span>
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 4.5vw, 3rem)", fontWeight: 900,
            margin: "0 0 1rem", lineHeight: 1.15, letterSpacing: "-0.5px",
            background: `linear-gradient(135deg, #ffffff 0%, ${accent} 100%)`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            {title}
          </h1>

          <p style={{
            fontSize: "1.05rem", lineHeight: 1.85, color: "#b8c5d3",
            maxWidth: 640, margin: "0 auto",
          }}>
            {desc}
          </p>
        </div>
      </section>

      {/* CONTENT */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "4rem 1.5rem 2rem" }}>

        {longDesc && (
          <div style={{ marginBottom: features.length ? "3.5rem" : "2rem" }}>
            <div className="section-label" style={{ marginBottom: "0.75rem" }}>
              {ar ? "نبذة عن الخدمة" : "About this service"}
            </div>
            <h2 className="section-title" style={{ fontSize: "1.6rem", marginBottom: "1.25rem", textAlign: ar ? "right" : "left" }}>
              {ar ? "اعرف أكتر" : "Learn more"}
            </h2>
            <p style={{
              color: "#b8c5d3", fontSize: "1.02rem", lineHeight: 2,
              margin: 0, whiteSpace: "pre-line",
            }}>
              {longDesc}
            </p>
          </div>
        )}

        {features.length > 0 && (
          <div style={{ marginBottom: "3.5rem" }}>
            <div className="section-label" style={{ marginBottom: "0.75rem" }}>
              {ar ? "ما يميز هذه الخدمة" : "What's included"}
            </div>
            <h2 className="section-title" style={{ fontSize: "1.6rem", marginBottom: "1.5rem", textAlign: ar ? "right" : "left" }}>
              {ar ? "كل اللي هتلاقيه" : "Everything you'll get"}
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "0.85rem",
            }}>
              {features.map((feat, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${accent}30`,
                    borderRadius: 14,
                    padding: "1rem 1.1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    color: "#dde6ee",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    transition: "all 0.25s",
                    backdropFilter: "blur(6px)",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${accent}12`;
                    e.currentTarget.style.borderColor = `${accent}60`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = `${accent}30`;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                    color: "white", borderRadius: "50%",
                    width: 28, height: 28,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 800, flexShrink: 0,
                    boxShadow: `0 2px 8px ${accent}55`,
                  }}>
                    ✓
                  </span>
                  <span style={{ lineHeight: 1.5 }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA card */}
        <div style={{
          padding: "2.5rem 1.75rem",
          background: `linear-gradient(135deg, ${accent}18 0%, rgba(201,168,76,0.08) 100%)`,
          borderRadius: 20,
          border: `1.5px solid ${accent}35`,
          textAlign: "center",
          boxShadow: `0 8px 40px ${accent}15`,
        }}>
          <h3 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
            {ar ? "جاهز تبدأ تجربتك؟" : "Ready to start your experience?"}
          </h3>
          <p style={{ color: "#99aabb", fontSize: "0.95rem", margin: "0 0 1.5rem" }}>
            {ar ? "احجز الآن أو تواصل معنا للاستفسار" : "Book now or contact us with any questions"}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleCta}
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}dd)`,
                color: "white", border: "none", borderRadius: 12,
                padding: "0.95rem 2rem", cursor: "pointer",
                fontWeight: 800, fontFamily: "inherit", fontSize: "0.98rem",
                boxShadow: `0 6px 20px ${accent}55`,
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
                  borderRadius: 12, padding: "0.95rem 1.65rem", cursor: "pointer",
                  fontWeight: 800, fontFamily: "inherit", fontSize: "0.98rem",
                  display: "inline-flex", alignItems: "center", gap: "0.55rem",
                  boxShadow: "0 6px 20px rgba(37,211,102,0.45)",
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

        {/* Back-to-home link — explicit, large, easy to find */}
        <div style={{ marginTop: "3rem", textAlign: "center", paddingBottom: "1rem" }}>
          <button
            onClick={goHome}
            style={{
              background: "transparent",
              color: "#b8c5d3",
              border: "1.5px solid rgba(255,255,255,0.15)",
              borderRadius: 12,
              padding: "0.85rem 1.75rem",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.92rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.25s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              e.currentTarget.style.color = "#b8c5d3";
            }}
          >
            <span>{ar ? "→" : "←"}</span>
            <span>{ar ? "كل الخدمات" : "All services"}</span>
          </button>
        </div>
      </section>
    </main>
  );
}
