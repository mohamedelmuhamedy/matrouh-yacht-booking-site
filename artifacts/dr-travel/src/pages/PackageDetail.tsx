import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { useSiteData, type DBPackage } from "../context/SiteDataContext";
import { getPackageBySlug, getSimilarPackages, PACKAGES_DATA } from "../data/packages";
import { formatPrice } from "../data/currencies";
import { usePersonalization } from "../hooks/usePersonalization";

const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
);
const XIcon2 = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff6b6b"><path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>
);

export default function PackageDetail() {
  const [, params] = useRoute("/packages/:slug");
  const [, navigate] = useLocation();
  const { lang, t } = useLanguage();
  const { currency } = useCurrency();
  const { trackView } = usePersonalization();
  const { packages: dbPackages, packagesLoading } = useSiteData();
  const ar = lang === "ar";

  const slug = params?.slug;

  // Find package: DB first, then static fallback
  const dbPkg = dbPackages.find(p => p.slug === slug);
  const staticPkg = slug ? getPackageBySlug(slug) : null;
  const pkg: DBPackage | null = dbPkg ?? (staticPkg ? (staticPkg as unknown as DBPackage) : null);

  const [activeImg, setActiveImg] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isXs, setIsXs] = useState(window.innerWidth < 480);
  const touchStartX = { current: 0 };

  const prevImg = () => setActiveImg(i => (i > 0 ? i - 1 : (pkg?.images?.length ?? 1) - 1));
  const nextImg = () => setActiveImg(i => (i < (pkg?.images?.length ?? 1) - 1 ? i + 1 : 0));

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsXs(window.innerWidth < 480);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pkg?.images || pkg.images.length < 2) return;
      if (e.key === "ArrowLeft") nextImg();
      if (e.key === "ArrowRight") prevImg();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pkg]);

  useEffect(() => {
    if (pkg) {
      trackView(Number(pkg.id), pkg.category);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [slug]);

  if (packagesLoading && !staticPkg) {
    return (
      <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#00AAFF", fontSize: "1.1rem", fontFamily: "Cairo, sans-serif" }}>
          {ar ? "جاري التحميل..." : "Loading..."}
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div style={{ minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
        <div style={{ fontSize: "4rem" }}>🔍</div>
        <div style={{ color: "white", fontWeight: 700, fontSize: "1.2rem", textAlign: "center" }}>{ar ? "الباقة غير موجودة" : "Package not found"}</div>
        <button onClick={() => navigate("/")} style={{ background: "#00AAFF", color: "white", border: "none", padding: "0.75rem 2rem", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
          {ar ? "العودة للرئيسية" : "Back to Home"}
        </button>
      </div>
    );
  }

  // Similar packages: from DB first, then static
  const similar = dbPackages.length > 0
    ? dbPackages.filter(p => p.slug !== pkg.slug && p.category === pkg.category).slice(0, 3)
    : getSimilarPackages(staticPkg!).map(p => p as unknown as DBPackage);

  const title = ar ? pkg.titleAr : pkg.titleEn;
  const desc = ar ? pkg.longDescriptionAr : pkg.longDescriptionEn;
  const includes = ar ? (pkg.includesAr || []) : (pkg.includesEn || []);
  const excludes = ar ? (pkg.excludesAr || []) : (pkg.excludesEn || []);
  const itinerary = ar ? (pkg.itineraryAr || []) : (pkg.itineraryEn || []);
  const whyTrip = ar ? (pkg.whyThisTripAr || []) : (pkg.whyThisTripEn || []);
  const whatToBring = ar ? (pkg.whatToBringAr || []) : (pkg.whatToBringEn || []);
  const showCancellation = (pkg as any).hasCancellationPolicy === true;
  const cancellation = ar ? pkg.cancellationAr : pkg.cancellationEn;
  const hasMaxPrice = typeof pkg.maxPriceEGP === "number" && pkg.maxPriceEGP > 0;
  const duration = ar ? pkg.durationAr : pkg.durationEn;
  const faq = (pkg as any).faq || [];

  const waMsg = encodeURIComponent(
    ar ? `مرحباً DR Travel 👋\nأريد الاستفسار عن: ${title}\n💰 السعر: ${formatPrice(pkg.priceEGP, currency, lang)}/فرد`
       : `Hello DR Travel 👋\nI'd like to inquire about: ${title}\n💰 Price: ${formatPrice(pkg.priceEGP, currency, lang)}/person`
  );

  const expLabels: Record<string, { ar: string; en: string }> = {
    easy: { ar: "سهل ومريح", en: "Easy & Comfortable" },
    moderate: { ar: "متوسط المستوى", en: "Moderate" },
    hard: { ar: "مغامرة ومثير", en: "Adventurous & Exciting" },
    adventurous: { ar: "مغامرة ومثير", en: "Adventurous & Exciting" },
  };

  const px = isMobile ? (isXs ? "1rem" : "1.25rem") : "1.5rem";

  const CTACard = () => (
    <div style={{
      background: `${pkg.color}0a`,
      border: `1px solid ${pkg.color}30`,
      borderRadius: "20px",
      padding: isMobile ? "1.25rem" : "1.5rem",
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{ color: "#8899aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
        {hasMaxPrice ? (ar ? "السعر / فرد" : "Price / Person") : (ar ? "السعر / فرد يبدأ من" : "Price / Person starts from")}
      </div>
      <div style={{ color: pkg.color, fontSize: isMobile ? "1.7rem" : "2rem", fontWeight: 900, fontFamily: "Montserrat, sans-serif", marginBottom: "0.25rem" }}>
        {hasMaxPrice
          ? `${formatPrice(pkg.priceEGP, currency, lang)} — ${formatPrice(pkg.maxPriceEGP!, currency, lang)}`
          : formatPrice(pkg.priceEGP, currency, lang)}
      </div>
      <div style={{ color: "#667788", fontSize: "0.78rem", marginBottom: "1.25rem" }}>⏱ {duration}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          onClick={() => { navigate("/"); setTimeout(() => { document.querySelector("#packages")?.scrollIntoView({ behavior: "smooth" }); }, 100); }}
          style={{ background: `linear-gradient(135deg,${pkg.color},${pkg.color}cc)`, color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: isMobile ? "0.95rem 1rem" : "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", width: "100%", boxSizing: "border-box" }}>
          {ar ? "احجز الآن" : "Book Now"}
        </button>
        <a href={`https://wa.me/201205756024?text=${waMsg}`} target="_blank" rel="noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", padding: isMobile ? "0.85rem 1rem" : "0.85rem", borderRadius: "12px", fontWeight: 700, fontSize: "0.88rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }}>
          <WhatsAppIcon /> {ar ? "استفسار واتساب" : "WhatsApp Inquiry"}
        </a>
      </div>

      <div style={{ marginTop: "1.25rem", paddingTop: "1.1rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: isMobile ? "row" : "column", flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? "0.5rem 1rem" : "0.6rem" }}>
        {[
          { icon: "👥", label: ar ? `${pkg.minGroupSize}–${pkg.maxGroupSize} أشخاص` : `${pkg.minGroupSize}–${pkg.maxGroupSize} persons` },
          { icon: "👨‍👩‍👧‍👦", label: ar ? (pkg.familyFriendly ? "مناسبة للعائلات ✓" : "غير مخصصة للعائلات") : (pkg.familyFriendly ? "Family Friendly ✓" : "Not family-focused") },
          { icon: "🌍", label: ar ? (pkg.foreignerFriendly ? "مناسبة للأجانب ✓" : "للمصريين بشكل رئيسي") : (pkg.foreignerFriendly ? "Foreigner Friendly ✓" : "Primarily for Egyptians") },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#8899aa", fontSize: "0.78rem" }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", fontFamily: "Cairo, sans-serif", overflowX: "hidden" }}>

      {/* Back button */}
      <div style={{ position: "fixed", top: isMobile ? "70px" : "80px", insetInlineStart: isMobile ? "0.75rem" : "1rem", zIndex: 100 }}>
        <button onClick={() => navigate("/")}
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", padding: isMobile ? "0.45rem 0.85rem" : "0.5rem 1rem", borderRadius: "50px", cursor: "pointer", fontWeight: 600, fontSize: isMobile ? "0.76rem" : "0.82rem", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
          {ar ? "← العودة" : "← Back"}
        </button>
      </div>

      {/* Hero gallery */}
      <div style={{ position: "relative" }}>
        <div style={{ position: "relative", height: isMobile ? "42vh" : "52vh", minHeight: isMobile ? "260px" : "360px", overflow: "hidden", cursor: pkg.images && pkg.images.length > 1 ? "grab" : "default" }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) { if (diff > 0) nextImg(); else prevImg(); }
          }}>
          {pkg.images && pkg.images.length > 0 ? (
            <img src={pkg.images[activeImg]} alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.55)", transition: "opacity 0.3s" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${pkg.color}20, #0D1B2A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6rem" }}>
              {pkg.icon}
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 30%, #0D1B2A 100%)" }} />

          {/* Arrow buttons */}
          {pkg.images && pkg.images.length > 1 && (<>
            <button onClick={prevImg}
              style={{ position: "absolute", top: "50%", insetInlineStart: "0.85rem", transform: "translateY(-50%)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1rem" : "1.2rem", zIndex: 10, transition: "all 0.2s" }}>
              ‹
            </button>
            <button onClick={nextImg}
              style={{ position: "absolute", top: "50%", insetInlineEnd: "0.85rem", transform: "translateY(-50%)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1rem" : "1.2rem", zIndex: 10, transition: "all 0.2s" }}>
              ›
            </button>

            {/* Image counter badge */}
            <div style={{ position: "absolute", top: "0.85rem", insetInlineEnd: "0.85rem", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "50px", fontFamily: "Montserrat, sans-serif" }}>
              {activeImg + 1} / {pkg.images.length}
            </div>
          </>)}

          <div style={{ position: "absolute", bottom: isMobile ? "2rem" : "3rem", left: 0, right: 0, padding: isMobile ? "0 1rem" : "0 2rem", textAlign: "center" }}>
            <div style={{ fontSize: isMobile ? "2.5rem" : "3.5rem", marginBottom: "0.4rem" }}>{pkg.icon}</div>
            <h1 style={{ fontSize: isMobile ? (isXs ? "1.3rem" : "1.55rem") : "2.2rem", fontWeight: 900, color: "white", margin: 0, lineHeight: 1.25, padding: isMobile ? "0 0.5rem" : "0", wordBreak: "break-word" }}>{title}</h1>
          </div>
        </div>

        {/* Thumbnail strip */}
        {pkg.images && pkg.images.length > 1 && (
          <div style={{ background: "#0a1520", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.65rem 1rem", display: "flex", gap: "0.5rem", overflowX: "auto" }}>
            {pkg.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                style={{ flexShrink: 0, width: isMobile ? 56 : 72, height: isMobile ? 42 : 54, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === activeImg ? pkg.color : "transparent"}`, cursor: "pointer", padding: 0, transition: "border-color 0.2s", opacity: i === activeImg ? 1 : 0.55 }}>
                <img src={img} alt={`View ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? `1.5rem ${px}` : "2rem 1.5rem", boxSizing: "border-box", width: "100%" }}>

        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {pkg.badgeAr && (
                <span style={{ background: pkg.badgeColor || pkg.color, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem", fontWeight: 800 }}>
                  {ar ? pkg.badgeAr : pkg.badgeEn}
                </span>
              )}
              {pkg.familyFriendly && <span style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem", fontWeight: 600 }}>{ar ? "مناسبة للعائلات" : "Family Friendly"}</span>}
              {pkg.foreignerFriendly && <span style={{ background: "rgba(0,170,255,0.12)", border: "1px solid rgba(0,170,255,0.3)", color: "#00AAFF", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem", fontWeight: 600 }}>{ar ? "مناسبة للأجانب" : "Foreigner Friendly"}</span>}
              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem" }}>⭐ {pkg.rating} ({pkg.reviewCount})</span>
              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem" }}>⏱ {duration}</span>
              {expLabels[pkg.experienceLevel] && <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem" }}>{expLabels[pkg.experienceLevel][ar ? "ar" : "en"]}</span>}
            </div>

            <CTACard />

            {desc && (
              <div>
                <h2 style={{ color: "white", fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>{ar ? "عن هذه الرحلة" : "About This Trip"}</h2>
                <p style={{ color: "#8899aa", lineHeight: 1.85, fontSize: "0.88rem", margin: 0 }}>{desc}</p>
              </div>
            )}

            {whyTrip.length > 0 && (
              <div style={{ background: `${pkg.color}08`, border: `1px solid ${pkg.color}25`, borderRadius: "14px", padding: "1.1rem" }}>
                <h2 style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.9rem" }}>{ar ? "لماذا هذه الرحلة؟ 🎯" : "Why This Trip? 🎯"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {whyTrip.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", color: "#c7d2e8", fontSize: "0.85rem" }}>
                      <span style={{ fontSize: "1rem", flexShrink: 0, marginTop: "1px" }}>{(item as any).icon}</span>
                      <span style={{ lineHeight: 1.5 }}>{(item as any).text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(includes.length > 0 || excludes.length > 0) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {includes.length > 0 && (
                  <div style={{ background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)", borderRadius: "14px", padding: "1.1rem" }}>
                    <div style={{ color: "#25D366", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>{ar ? "✅ يشمل" : "✅ Includes"}</div>
                    {includes.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", marginBottom: "0.45rem", color: "#8899aa", fontSize: "0.8rem" }}>
                        <span style={{ flexShrink: 0, marginTop: "2px" }}><CheckIcon /></span>{item}
                      </div>
                    ))}
                  </div>
                )}
                {excludes.length > 0 && (
                  <div style={{ background: "rgba(255,107,107,0.05)", border: "1px solid rgba(255,107,107,0.15)", borderRadius: "14px", padding: "1.1rem" }}>
                    <div style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>{ar ? "❌ لا يشمل" : "❌ Not Included"}</div>
                    {excludes.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", marginBottom: "0.45rem", color: "#8899aa", fontSize: "0.8rem" }}>
                        <span style={{ flexShrink: 0, marginTop: "2px" }}><XIcon2 /></span>{item}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {itinerary.length > 0 && (
              <div>
                <h2 style={{ color: "white", fontWeight: 700, fontSize: "1rem", marginBottom: "1rem" }}>{ar ? "برنامج الرحلة" : "Trip Itinerary"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {itinerary.map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: "0.85rem", paddingBottom: "1rem", position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${pkg.color}20`, border: `2px solid ${pkg.color}50`, display: "flex", alignItems: "center", justifyContent: "center", color: pkg.color, fontWeight: 900, fontSize: "0.75rem", fontFamily: "Montserrat, sans-serif", zIndex: 1 }}>{i + 1}</div>
                        {i < itinerary.length - 1 && <div style={{ width: 2, flex: 1, background: `${pkg.color}20`, marginTop: "4px" }} />}
                      </div>
                      <div style={{ paddingBottom: "0.4rem" }}>
                        <div style={{ color: pkg.color, fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.25rem" }}>{(step as any).title}</div>
                        <div style={{ color: "#8899aa", fontSize: "0.8rem", lineHeight: 1.65 }}>{(step as any).desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {whatToBring.length > 0 && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.1rem" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>{ar ? "🎒 ماذا تحضر معك؟" : "🎒 What to Bring?"}</div>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {whatToBring.map((item, i) => (
                    <span key={i} style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.3rem 0.75rem", borderRadius: "50px", fontSize: "0.75rem" }}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {showCancellation && cancellation && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.1rem" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.5rem" }}>{ar ? "📋 سياسة الإلغاء" : "📋 Cancellation Policy"}</div>
                <p style={{ color: "#8899aa", fontSize: "0.8rem", lineHeight: 1.8, margin: 0 }}>{cancellation}</p>
              </div>
            )}

            {faq.length > 0 && (
              <div>
                <h2 style={{ color: "white", fontWeight: 700, fontSize: "1rem", marginBottom: "0.85rem" }}>{ar ? "أسئلة شائعة" : "Frequently Asked Questions"}</h2>
                {faq.map((f: any, i: number) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", marginBottom: "0.5rem", overflow: "hidden" }}>
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ width: "100%", background: "transparent", border: "none", padding: "0.9rem 1rem", cursor: "pointer", color: "white", fontWeight: 600, fontSize: "0.84rem", fontFamily: "Cairo, sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "inherit", gap: "0.5rem" }}>
                      <span style={{ flex: 1, textAlign: "start" }}>{ar ? f.questionAr : f.questionEn}</span>
                      <span style={{ color: "#00AAFF", transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none", flexShrink: 0, fontSize: "0.75rem" }}>▼</span>
                    </button>
                    {openFaq === i && (
                      <div style={{ padding: "0 1rem 0.9rem", color: "#8899aa", fontSize: "0.8rem", lineHeight: 1.8 }}>
                        {ar ? f.answerAr : f.answerEn}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "2rem", alignItems: "start" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {pkg.badgeAr && (
                  <span style={{ background: pkg.badgeColor || pkg.color, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 800 }}>
                    {ar ? pkg.badgeAr : pkg.badgeEn}
                  </span>
                )}
                {pkg.familyFriendly && <span style={{ background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 600 }}>{ar ? "مناسبة للعائلات" : "Family Friendly"}</span>}
                {pkg.foreignerFriendly && <span style={{ background: "rgba(0,170,255,0.12)", border: "1px solid rgba(0,170,255,0.3)", color: "#00AAFF", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 600 }}>{ar ? "مناسبة للأجانب" : "Foreigner Friendly"}</span>}
                <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem" }}>⭐ {pkg.rating} ({pkg.reviewCount})</span>
                <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem" }}>⏱ {duration}</span>
                {expLabels[pkg.experienceLevel] && <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem" }}>{expLabels[pkg.experienceLevel][ar ? "ar" : "en"]}</span>}
              </div>

              {desc && (
                <div>
                  <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.85rem" }}>{ar ? "عن هذه الرحلة" : "About This Trip"}</h2>
                  <p style={{ color: "#8899aa", lineHeight: 2, fontSize: "0.92rem" }}>{desc}</p>
                </div>
              )}

              {whyTrip.length > 0 && (
                <div style={{ background: `${pkg.color}08`, border: `1px solid ${pkg.color}25`, borderRadius: "16px", padding: "1.5rem" }}>
                  <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.05rem", marginBottom: "1.1rem" }}>{ar ? "لماذا هذه الرحلة؟ 🎯" : "Why This Trip? 🎯"}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {whyTrip.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#c7d2e8", fontSize: "0.88rem" }}>
                        <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{(item as any).icon}</span>
                        <span>{(item as any).text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {itinerary.length > 0 && (
                <div>
                  <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1.25rem" }}>{ar ? "برنامج الرحلة" : "Trip Itinerary"}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, position: "relative" }}>
                    {itinerary.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "1rem", paddingBottom: "1.25rem", position: "relative" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${pkg.color}20`, border: `2px solid ${pkg.color}50`, display: "flex", alignItems: "center", justifyContent: "center", color: pkg.color, fontWeight: 900, fontSize: "0.8rem", fontFamily: "Montserrat, sans-serif", zIndex: 1, flexShrink: 0 }}>{i + 1}</div>
                          {i < itinerary.length - 1 && <div style={{ width: 2, flex: 1, background: `${pkg.color}20`, marginTop: "4px" }} />}
                        </div>
                        <div style={{ paddingBottom: "0.5rem" }}>
                          <div style={{ color: pkg.color, fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.3rem" }}>{(step as any).title}</div>
                          <div style={{ color: "#8899aa", fontSize: "0.83rem", lineHeight: 1.7 }}>{(step as any).desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(includes.length > 0 || excludes.length > 0) && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  {includes.length > 0 && (
                    <div style={{ background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.15)", borderRadius: "16px", padding: "1.25rem" }}>
                      <div style={{ color: "#25D366", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.85rem" }}>{ar ? "✅ يشمل" : "✅ Includes"}</div>
                      {includes.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", color: "#8899aa", fontSize: "0.83rem" }}>
                          <span style={{ flexShrink: 0, marginTop: "2px" }}><CheckIcon /></span>{item}
                        </div>
                      ))}
                    </div>
                  )}
                  {excludes.length > 0 && (
                    <div style={{ background: "rgba(255,107,107,0.05)", border: "1px solid rgba(255,107,107,0.15)", borderRadius: "16px", padding: "1.25rem" }}>
                      <div style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.85rem" }}>{ar ? "❌ لا يشمل" : "❌ Not Included"}</div>
                      {excludes.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", color: "#8899aa", fontSize: "0.83rem" }}>
                          <span style={{ flexShrink: 0, marginTop: "2px" }}><XIcon2 /></span>{item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {whatToBring.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.25rem" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.85rem" }}>{ar ? "🎒 ماذا تحضر معك؟" : "🎒 What to Bring?"}</div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {whatToBring.map((item, i) => (
                      <span key={i} style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.35rem 0.85rem", borderRadius: "50px", fontSize: "0.78rem" }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {cancellation && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.25rem" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.6rem" }}>{ar ? "📋 سياسة الإلغاء" : "📋 Cancellation Policy"}</div>
                  <p style={{ color: "#8899aa", fontSize: "0.83rem", lineHeight: 1.85, margin: 0 }}>{cancellation}</p>
                </div>
              )}

              {faq.length > 0 && (
                <div>
                  <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.1rem", marginBottom: "1rem" }}>{ar ? "أسئلة شائعة" : "Frequently Asked Questions"}</h2>
                  {faq.map((f: any, i: number) => (
                    <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", marginBottom: "0.6rem", overflow: "hidden" }}>
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        style={{ width: "100%", background: "transparent", border: "none", padding: "1rem 1.25rem", cursor: "pointer", color: "white", fontWeight: 600, fontSize: "0.87rem", fontFamily: "Cairo, sans-serif", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ flex: 1, textAlign: "start" }}>{ar ? f.questionAr : f.questionEn}</span>
                        <span style={{ color: "#00AAFF", transition: "transform 0.2s", transform: openFaq === i ? "rotate(180deg)" : "none", flexShrink: 0 }}>▼</span>
                      </button>
                      {openFaq === i && (
                        <div style={{ padding: "0 1.25rem 1rem", color: "#8899aa", fontSize: "0.83rem", lineHeight: 1.85 }}>
                          {ar ? f.answerAr : f.answerEn}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div style={{ position: "sticky", top: "90px" }}>
              <CTACard />

              {similar.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ color: "#8899aa", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.75rem" }}>{ar ? "باقات مشابهة" : "Similar Packages"}</div>
                  {similar.map(s => (
                    <div key={s.slug} onClick={() => navigate(`/packages/${s.slug}`)}
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "0.85rem", marginBottom: "0.6rem", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.75rem" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}>
                      <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ar ? s.titleAr : s.titleEn}</div>
                        <div style={{ color: s.color, fontWeight: 700, fontSize: "0.78rem", fontFamily: "Montserrat, sans-serif" }}>{formatPrice(s.priceEGP, currency, lang)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
