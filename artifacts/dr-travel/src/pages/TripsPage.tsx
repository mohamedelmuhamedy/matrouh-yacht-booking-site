import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import { useCurrency } from "../context/CurrencyContext";
import { formatPrice, CurrencyCode } from "../data/currencies";
import { storageObjectUrl } from "../lib/api";
import SeoHead from "../components/SeoHead";

function useIsMobile() {
  const [m, setM] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
}

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
  const { packages: allPackages, categories: dbCategories, settings } = useSiteData();
  const seoTitle = lang === "ar"
    ? "الرحلات والباقات | DR Travel"
    : "Trips & Packages | DR Travel";
  const seoDesc = lang === "ar"
    ? "تصفح كل الرحلات السياحية والباقات المتوفرة لدى DR Travel — أسعار، فئات، تواريخ، وتفاصيل كاملة."
    : "Browse all DR Travel trips and packages — prices, categories, dates, and full details.";
  const { currency } = useCurrency();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const ar = lang === "ar";

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating">("default");

  const CATEGORIES = useMemo(() => {
    const all = { id: "all", labelAr: "الكل", labelEn: "All" };
    const dynamic = dbCategories.map(cat => ({
      id: cat.slug,
      labelAr: cat.nameAr,
      labelEn: cat.nameEn,
    }));
    return [all, ...dynamic];
  }, [dbCategories]);

  const packages = useMemo(() => {
    let result = (allPackages || []).filter(p => p.status === "published" && p.active);

    if (activeCategory !== "all") {
      result = result.filter(p => {
        const c = (p.category || "").toLowerCase();
        return c === activeCategory || c.includes(activeCategory);
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
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: packages.map((pkg, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: ar ? pkg.titleAr : pkg.titleEn,
      url: `https://www.drtravel-matrouh.com/packages/${pkg.slug}`,
    })),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", fontFamily: "Cairo, sans-serif", direction: ar ? "rtl" : "ltr" }}>
      <SeoHead title={seoTitle} description={seoDesc} lang={ar ? "ar" : "en"} path="/trips" structuredData={itemListSchema} />

      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, var(--bg-page) 0%, var(--bg-page-2) 100%)", borderBottom: "1px solid var(--border)", paddingTop: isMobile ? "4.5rem" : "5.5rem", paddingBottom: "2rem", paddingInline: isMobile ? "1rem" : "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <button onClick={() => navigate("/")}
            style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.45rem 1rem", borderRadius: "50px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem", fontFamily: "Cairo, sans-serif", marginBottom: "1.5rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            {ar ? "← الرئيسية" : "← Home"}
          </button>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: isMobile ? "1.75rem" : "2.5rem", margin: "0 0 0.5rem", lineHeight: 1.2 }}>
            {ar ? "تفاصيل الرحلات" : "Trip Details"}
          </h1>
          <p style={{ color: "var(--section-subtitle)", fontSize: isMobile ? "0.9rem" : "1rem", margin: 0 }}>
            {ar ? "استكشف جميع باقاتنا السياحية في مرسى مطروح" : "Explore all our tourism packages in Marsa Matruh"}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: isMobile ? "1.5rem 1rem" : "2rem 2rem" }}>

        {/* Search + Sort */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "220px", position: "relative" }}>
            <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", insetInlineStart: "0.85rem", color: "var(--text-muted)", fontSize: "1rem", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? "ابحث عن رحلة..." : "Search trips..."}
              style={{ width: "100%", background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem 1rem 0.75rem 2.5rem", color: "var(--text-primary)", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box", outline: "none" }}
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "0.75rem 1rem", color: "var(--text-primary)", fontSize: "0.85rem", fontFamily: "Cairo, sans-serif", cursor: "pointer", outline: "none" }}>
            <option value="default">{ar ? "الترتيب الافتراضي" : "Default"}</option>
            <option value="price-asc">{ar ? "السعر: الأقل" : "Price: Low"}</option>
            <option value="price-desc">{ar ? "السعر: الأعلى" : "Price: High"}</option>
            <option value="rating">{ar ? "الأعلى تقييماً" : "Top Rated"}</option>
          </select>
        </div>

        {/* Category Filter */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{
                background: activeCategory === cat.id ? "rgba(0,170,255,0.2)" : "var(--bg-surface)",
                border: `1px solid ${activeCategory === cat.id ? "rgba(0,170,255,0.5)" : "var(--border)"}`,
                color: activeCategory === cat.id ? "#00AAFF" : "var(--text-muted)",
                padding: "0.5rem 1.1rem",
                borderRadius: "50px",
                cursor: "pointer",
                fontSize: "0.83rem",
                fontWeight: activeCategory === cat.id ? 700 : 500,
                fontFamily: "Cairo, sans-serif",
                transition: "all 0.2s",
              }}>
              {ar ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
          {ar ? `${packages.length} رحلة` : `${packages.length} trips`}
        </p>

        {/* Package Grid */}
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
            <p style={{ fontSize: "1.1rem" }}>{ar ? "لا توجد رحلات مطابقة" : "No trips found"}</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
            {packages.map(pkg => {
              const title = ar ? pkg.titleAr : pkg.titleEn;
              const desc = ar ? pkg.descriptionAr : pkg.descriptionEn;
              const badge = ar ? pkg.badgeAr : pkg.badgeEn;
              const rawImg = pkg.images?.[0] ?? "";
              const imgSrc = rawImg
                ? storageObjectUrl(rawImg)
                : null;

              return (
                <div
                  key={pkg.id}
                  className="trip-card"
                  onClick={() => navigate(`/packages/${pkg.slug}`)}>

                  {/* Image */}
                  <div className="trip-card-img-wrap" style={{ background: imgSrc ? "var(--bg-page-2)" : pkg.color || "#00AAFF" }}>
                    {imgSrc ? (
                      <img src={imgSrc} alt={title} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
                        {pkg.icon || "🏖️"}
                      </div>
                    )}
                    {badge && (
                      <div className="trip-card-badge" style={{ background: pkg.badgeColor || "#FF6B35" }}>
                        {badge}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "1.15rem 1.15rem 1.25rem" }}>
                    <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.02rem", margin: "0 0 0.4rem", lineHeight: 1.3 }}>{title}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0 0 0.95rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--bg-surface-2)" }}>
                      <div>
                        <span style={{ color: "#00AAFF", fontWeight: 800, fontSize: "1.1rem", fontFamily: "Montserrat, sans-serif" }}>
                          {formatPrice(pkg.priceEGP, curr, lang, settings)}
                        </span>
                        {pkg.maxPriceEGP && (
                          <span style={{ color: "var(--section-subtitle)", fontSize: "0.78rem" }}> – {formatPrice(pkg.maxPriceEGP, curr, lang, settings)}</span>
                        )}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginInlineStart: "0.3rem" }}>
                          {ar ? "/ شخص" : "/ person"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#FFD700", fontSize: "0.82rem", background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.18)", borderRadius: "50px", padding: "0.2rem 0.6rem" }}>
                        <StarIcon />
                        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{pkg.rating?.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
                      {pkg.includesMeals && (
                        <span className="trip-card-tag" style={{ background: "rgba(0,200,100,0.1)", border: "1px solid rgba(0,200,100,0.22)", color: "#00C864" }}>
                          <CheckIcon /> {ar ? "وجبات" : "Meals"}
                        </span>
                      )}
                      {pkg.familyFriendly && (
                        <span className="trip-card-tag" style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.22)", color: "#FF6B35" }}>
                          {ar ? "عائلي" : "Family"}
                        </span>
                      )}
                      {(pkg as any).showDuration !== false && pkg.durationAr && (
                        <span className="trip-card-tag" style={{ background: "rgba(0,170,255,0.16)", border: "1px solid rgba(0,170,255,0.36)", color: "#00AAFF", fontWeight: 800 }}>
                          📅 {ar ? pkg.durationAr : pkg.durationEn}
                        </span>
                      )}
                    </div>

                    {/* CTA */}
                    <div className="trip-card-cta">
                      <span>{ar ? "عرض التفاصيل" : "View Details"}</span>
                      <span className="trip-card-cta-arrow">{ar ? "←" : "→"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
