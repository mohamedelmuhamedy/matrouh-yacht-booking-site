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

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", color: "#667788" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
          <div>{ar ? "جاري التحميل..." : "Loading..."}</div>
        </div>
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", padding: "2rem", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
          <h1 style={{ color: "#0D1B2A", fontSize: "1.5rem", marginBottom: "0.5rem" }}>{ar ? "الخدمة غير موجودة" : "Service not found"}</h1>
          <p style={{ color: "#667788", marginBottom: "1.5rem" }}>{ar ? "ربما تم حذف هذه الخدمة أو تغيير رابطها." : "This service may have been removed or its link changed."}</p>
          <button
            onClick={() => navigate("/")}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 1.5rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
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
  const color = service.color || "#00AAFF";
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
    <div dir={ar ? "rtl" : "ltr"} style={{ fontFamily: "var(--app-font-sans, Cairo, sans-serif)", background: "#f7f9fb", minHeight: "100vh" }}>
      {/* Hero */}
      <section style={{
        background: heroImage
          ? `linear-gradient(135deg, rgba(13,27,42,0.85), rgba(13,27,42,0.6)), url(${heroImage}) center/cover`
          : `linear-gradient(135deg, ${color}25, #0D1B2A)`,
        color: "white",
        padding: "4rem 1.5rem 3rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <button
          onClick={() => navigate("/")}
          style={{ position: "absolute", top: 16, [ar ? "right" : "left"]: 16, background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, padding: "0.5rem 0.95rem", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, backdropFilter: "blur(8px)" } as React.CSSProperties}>
          {ar ? "← الرئيسية" : "← Home"}
        </button>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: "5rem", marginBottom: "0.75rem", filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>{service.icon}</div>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 900, margin: "0 0 0.75rem", textShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>{title}</h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.7, color: "#e0e8f0", maxWidth: 640, margin: "0 auto" }}>{desc}</p>
        </div>
      </section>

      {/* Content */}
      <section style={{ maxWidth: 900, margin: "-2rem auto 0", padding: "0 1rem 3rem", position: "relative", zIndex: 2 }}>
        <div style={{ background: "white", borderRadius: 20, padding: "2rem 1.75rem", boxShadow: "0 8px 32px rgba(13,27,42,0.08)", border: "1px solid #e0e8f0" }}>

          {longDesc && (
            <div style={{ marginBottom: features.length ? "2rem" : "1rem" }}>
              <h2 style={{ color: "#0D1B2A", fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.85rem", paddingBottom: "0.6rem", borderBottom: `3px solid ${color}` }}>
                {ar ? "نبذة عن الخدمة" : "About this Service"}
              </h2>
              <p style={{ color: "#445566", fontSize: "1rem", lineHeight: 1.9, margin: 0, whiteSpace: "pre-line" }}>{longDesc}</p>
            </div>
          )}

          {features.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ color: "#0D1B2A", fontSize: "1.2rem", fontWeight: 800, margin: "0 0 1rem", paddingBottom: "0.6rem", borderBottom: `3px solid ${color}` }}>
                {ar ? "ما يميز هذه الخدمة" : "What's Included"}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                {features.map((feat, i) => (
                  <div key={i} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 12, padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.65rem", color: "#0D1B2A", fontWeight: 600, fontSize: "0.92rem" }}>
                    <span style={{ background: color, color: "white", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", flexShrink: 0 }}>✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div style={{ marginTop: "2rem", padding: "1.5rem", background: `linear-gradient(135deg, ${color}15, ${color}05)`, borderRadius: 16, border: `1.5px solid ${color}30`, textAlign: "center" }}>
            <h3 style={{ color: "#0D1B2A", fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.4rem" }}>
              {ar ? "جاهز تبدأ تجربتك؟" : "Ready to start your experience?"}
            </h3>
            <p style={{ color: "#667788", fontSize: "0.9rem", margin: "0 0 1rem" }}>
              {ar ? "احجز الآن أو تواصل معنا للاستفسار" : "Book now or contact us with any questions"}
            </p>
            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={handleCta}
                style={{ background: color, color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.75rem", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: "0.95rem", boxShadow: `0 4px 16px ${color}55` }}>
                {ctaText}
              </button>
              {whatsapp && (
                <button
                  onClick={handleWhatsApp}
                  style={{ background: "#25D366", color: "white", border: "none", borderRadius: 12, padding: "0.85rem 1.5rem", cursor: "pointer", fontWeight: 800, fontFamily: "inherit", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.45rem", boxShadow: "0 4px 16px rgba(37,211,102,0.4)" }}>
                  💬 {ar ? "واتساب" : "WhatsApp"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
