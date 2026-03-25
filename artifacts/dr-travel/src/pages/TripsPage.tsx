import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import { useCurrency } from "../context/CurrencyContext";
import { formatPrice, CurrencyCode } from "../data/currencies";

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

const CATEGORIES: { id: string; labelAr: string; labelEn: string; icon: string }[] = [
  { id: "all",       labelAr: "الكل",           labelEn: "All",           icon: "🌟" },
  { id: "yacht",     labelAr: "رحلات يخت",       labelEn: "Yacht Trips",   icon: "⛵" },
  { id: "safari",    labelAr: "سفاري",            labelEn: "Safari",        icon: "🏜️" },
  { id: "water",     labelAr: "ألعاب مائية",      labelEn: "Water Sports",  icon: "🤿" },
  { id: "parasail",  labelAr: "براشوت",            labelEn: "Parasailing",   icon: "🪂" },
  { id: "aquapark",  labelAr: "أكوا بارك",         labelEn: "Aqua Park",     icon: "🎢" },
  { id: "family",    labelAr: "عائلي",             labelEn: "Family",        icon: "👨‍👩‍👧‍👦" },
];

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function TripsPage() {
  const { lang } = useLanguage();
  const { packages: allPackages } = useSiteData();
  const { currency } = useCurrency();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const ar = lang === "ar";

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating">("default");

  const packages = useMemo(() => {
    let result = (allPackages || []).filter(p => p.status === "published" && p.active);

    if (activeCategory !== "all") {
      result = result.filter(p => {
        const c = (p.category || "").toLowerCase();
        if (activeCategory === "family") return p.familyFriendly;
        return c.includes(activeCategory);
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.titleAr.toLowerCase().includes(q) ||
        p.titleEn.toLowerCase().includes(q) ||
        (p.descriptionAr || "").toLowerCase().includes(q) ||
        (p.descriptionEn || "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "price-asc") result = [...result].sort((a, b) => a.priceEGP - b.priceEGP);
    if (sortBy === "price-desc") result = [...result].sort((a, b) => b.priceEGP - a.priceEGP);
    if (sortBy === "rating") result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return result;
  }, [allPackages, activeCategory, search, sortBy]);

  const curr = currency as CurrencyCode;

  return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", fontFamily: "Cairo, sans-serif", direction: ar ? "rtl" : "ltr" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, #0a1520 0%, #0D1B2A 100%)", borderBottom: "1px solid rgba(0,170,255,0.1)", paddingTop: isMobile ? "4.5rem" : "5.5rem", paddingBottom: "2rem", paddingInline: isMobile ? "1rem" : "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <button onClick={() => navigate("/")}
            style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.45rem 1rem", borderRadius: "50px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            {ar ? "← الرئيسية" : "← Home"}
          </button>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: isMobile ? "1.75rem" : "2.5rem", margin: "0 0 0.5rem", lineHeight: 1.2 }}>
            🗺️ {ar ? "تفاصيل الرحلات" : "Trip Details"}
          </h1>
          <p style={{ color: "#667788", fontSize: isMobile ? "0.9rem" : "1rem", margin: 0 }}>
            {ar ? "استكشف جميع باقاتنا السياحية في مرسى مطروح" : "Explore all our tourism packages in Marsa Matruh"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: isMobile ? "1.5rem 1rem" : "2rem 2rem" }}>

        {/* Search + Sort */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", insetInlineStart: "0.85rem", color: "#445566", fontSize: "1rem", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن رحلة..." : "Search trips..."}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.75rem 1rem 0.75rem 2.5rem", color: "white", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box", outline: "none" }}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.75rem 1rem", color: "white", fontSize: "0.85rem", fontFamily: "Cairo, sans-serif", cursor: "pointer" }}>
            <option value="default">{ar ? "الترتيب الافتراضي" : "Default Order"}</option>
            <option value="price-asc">{ar ? "السعر: من الأقل" : "Price: Low to High"}</option>
            <option value="price-desc">{ar ? "السعر: من الأعلى" : "Price: High to Low"}</option>
            <option value="rating">{ar ? "الأعلى تقييماً" : "Highest Rated"}</option>
          </select>
        </div>

        {/* Category filters */}
        <div style={{ display: "flex", gap: "0.6rem", marginBottom: "2rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              style={{ flexShrink: 0, background: activeCategory === cat.id ? "#00AAFF" : "rgba(255,255,255,0.04)", border: `1px solid ${activeCategory === cat.id ? "#00AAFF" : "rgba(255,255,255,0.1)"}`, color: activeCategory === cat.id ? "white" : "#8899aa", borderRadius: "50px", padding: "0.5rem 1.1rem", cursor: "pointer", fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", fontWeight: activeCategory === cat.id ? 700 : 500, whiteSpace: "nowrap", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span>{cat.icon}</span>
              <span>{ar ? cat.labelAr : cat.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ color: "#445566", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
          {ar ? `${packages.length} رحلة` : `${packages.length} trip${packages.length !== 1 ? "s" : ""}`}
        </div>

        {/* Package grid */}
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <div style={{ color: "#445566", fontSize: "1rem" }}>
              {ar ? "لا توجد رحلات مطابقة للبحث" : "No trips found matching your search"}
            </div>
            {(search || activeCategory !== "all") && (
              <button onClick={() => { setSearch(""); setActiveCategory("all"); }}
                style={{ marginTop: "1rem", background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.5rem 1.25rem", borderRadius: "50px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600 }}>
                {ar ? "مسح الفلاتر" : "Clear Filters"}
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
            {packages.map(pkg => {
              const title = ar ? pkg.titleAr : pkg.titleEn;
              const desc = ar ? pkg.descriptionAr : pkg.descriptionEn;
              const includes = (ar ? pkg.includesAr : pkg.includesEn).slice(0, 4);
              const duration = ar ? pkg.durationAr : pkg.durationEn;
              const badge = ar ? pkg.badgeAr : pkg.badgeEn;
              const hasMax = typeof pkg.maxPriceEGP === "number" && pkg.maxPriceEGP > 0;
              const priceLabel = hasMax
                ? `${formatPrice(pkg.priceEGP, curr, lang)} – ${formatPrice(pkg.maxPriceEGP!, curr, lang)}`
                : formatPrice(pkg.priceEGP, curr, lang);
              const heroImg = pkg.images && pkg.images.length > 0 ? pkg.images[0] : null;

              return (
                <div key={pkg.id}
                  onClick={() => navigate(`/packages/${pkg.slug}`)}
                  style={{ background: "#0F2035", border: `1px solid ${pkg.color}22`, borderRadius: "20px", overflow: "hidden", cursor: "pointer", transition: "all 0.3s", position: "relative" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = `${pkg.color}55`; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${pkg.color}20`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = `${pkg.color}22`; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>

                  {/* Hero image / fallback */}
                  <div style={{ height: "160px", background: heroImg ? "transparent" : `linear-gradient(135deg, ${pkg.color}20, #0D1B2A)`, position: "relative", overflow: "hidden" }}>
                    {heroImg ? (
                      <img src={heroImg} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.75)" }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "4rem" }}>{pkg.icon}</div>
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #0F2035 100%)" }} />
                    {badge && (
                      <div style={{ position: "absolute", top: "0.75rem", insetInlineStart: "0.75rem", background: pkg.badgeColor || pkg.color, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.2rem 0.65rem", borderRadius: "50px", fontSize: "0.7rem", fontWeight: 800 }}>
                        {badge}
                      </div>
                    )}
                    {pkg.featured && (
                      <div style={{ position: "absolute", top: "0.75rem", insetInlineEnd: "0.75rem", background: "#C9A84C", color: "#0D1B2A", padding: "0.2rem 0.65rem", borderRadius: "50px", fontSize: "0.7rem", fontWeight: 800 }}>
                        ⭐ {ar ? "مميز" : "Featured"}
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "1.1rem" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.6rem" }}>
                      <div>
                        <div style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>{pkg.icon}</div>
                        <h3 style={{ color: "white", fontWeight: 800, fontSize: "1rem", margin: 0, lineHeight: 1.3 }}>{title}</h3>
                      </div>
                      <div style={{ textAlign: "end", flexShrink: 0 }}>
                        <div style={{ color: pkg.color, fontWeight: 800, fontSize: "0.9rem", whiteSpace: "nowrap" }}>{priceLabel}</div>
                        <div style={{ color: "#445566", fontSize: "0.72rem" }}>
                          {hasMax ? (ar ? "للفرد" : "/person") : (ar ? "يبدأ من" : "from")}
                        </div>
                      </div>
                    </div>

                    {desc && (
                      <p style={{ color: "#667788", fontSize: "0.8rem", lineHeight: 1.65, margin: "0 0 0.85rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {desc}
                      </p>
                    )}

                    {includes.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" }}>
                        {includes.map((item, i) => (
                          <div key={i} style={{ color: "#8899aa", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ color: pkg.color, flexShrink: 0 }}><CheckIcon /></span>
                            {item}
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem" }}>
                        {duration && <span style={{ color: "#445566", fontSize: "0.75rem" }}>⏱ {duration}</span>}
                        <span style={{ color: "#445566", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <span style={{ color: "#C9A84C" }}><StarIcon /></span> {pkg.rating}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        {pkg.familyFriendly && <span title={ar ? "مناسبة للعائلات" : "Family Friendly"} style={{ fontSize: "0.9rem" }}>👨‍👩‍👧</span>}
                        {pkg.foreignerFriendly && <span title={ar ? "مناسبة للأجانب" : "Foreigner Friendly"} style={{ fontSize: "0.9rem" }}>🌍</span>}
                      </div>
                    </div>

                    <button
                      style={{ marginTop: "0.85rem", width: "100%", background: `linear-gradient(135deg, ${pkg.color}, ${pkg.color}cc)`, border: "none", borderRadius: "12px", padding: "0.7rem", color: pkg.featured ? "#0D1B2A" : "white", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" }}>
                      {ar ? "عرض التفاصيل ←" : "View Details →"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom padding for mobile nav */}
        <div style={{ height: isMobile ? "5rem" : "3rem" }} />
      </div>
    </div>
  );
}
