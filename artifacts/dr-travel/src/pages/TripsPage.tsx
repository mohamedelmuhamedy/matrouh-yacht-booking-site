import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import { useCurrency } from "../context/CurrencyContext";
import { formatPrice, CurrencyCode } from "../data/currencies";
import { storageObjectUrl } from "../lib/api";

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
            {ar ? "تفاصيل الرحلات" : "Trip Details"}
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
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "0.75rem 1rem", color: "white", fontSize: "0.85rem", fontFamily: "Cairo, sans-serif", cursor: "pointer", outline: "none" }}>
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
                background: activeCategory === cat.id ? "rgba(0,170,255,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${activeCategory === cat.id ? "rgba(0,170,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: activeCategory === cat.id ? "#00AAFF" : "#8899aa",
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
        <p style={{ color: "#556677", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
          {ar ? `${packages.length} رحلة` : `${packages.length} trips`}
        </p>

        {/* Package Grid */}
        {packages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 1rem", color: "#556677" }}>
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
                  onClick={() => navigate(`/packages/${pkg.slug}`)}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "18px", overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, border-color 0.2s", position: "relative" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,170,255,0.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)"; }}>

                  {/* Image */}
                  <div style={{ height: "190px", background: imgSrc ? "transparent" : pkg.color || "#00AAFF", position: "relative", overflow: "hidden" }}>
                    {imgSrc ? (
                      <img src={imgSrc} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>
                        {pkg.icon || "🏖️"}
                      </div>
                    )}
                    {badge && (
                      <div style={{ position: "absolute", top: "0.75rem", insetInlineStart: "0.75rem", background: pkg.badgeColor || "#FF6B35", color: "white", borderRadius: "50px", padding: "0.25rem 0.75rem", fontSize: "0.72rem", fontWeight: 700 }}>
                        {badge}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: "1.1rem" }}>
                    <h3 style={{ color: "white", fontWeight: 700, fontSize: "1rem", margin: "0 0 0.4rem", lineHeight: 1.3 }}>{title}</h3>
                    <p style={{ color: "#8899aa", fontSize: "0.82rem", margin: "0 0 0.85rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{desc}</p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <div>
                        <span style={{ color: "#00AAFF", fontWeight: 800, fontSize: "1.05rem" }}>
                          {formatPrice(pkg.priceEGP, curr, lang, settings)}
                        </span>
                        {pkg.maxPriceEGP && (
                          <span style={{ color: "#667788", fontSize: "0.78rem" }}> – {formatPrice(pkg.maxPriceEGP, curr, lang, settings)}</span>
                        )}
                        <span style={{ color: "#556677", fontSize: "0.75rem", marginInlineStart: "0.25rem" }}>
                          {ar ? "/ شخص" : "/ person"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#FFD700", fontSize: "0.8rem" }}>
                        <StarIcon />
                        <span style={{ color: "white" }}>{pkg.rating?.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                      {pkg.includesMeals && (
                        <span style={{ background: "rgba(0,200,100,0.1)", border: "1px solid rgba(0,200,100,0.2)", color: "#00C864", borderRadius: "50px", padding: "0.2rem 0.6rem", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                          <CheckIcon /> {ar ? "وجبات" : "Meals"}
                        </span>
                      )}
                      {pkg.familyFriendly && (
                        <span style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.2)", color: "#FF6B35", borderRadius: "50px", padding: "0.2rem 0.6rem", fontSize: "0.7rem" }}>
                          {ar ? "عائلي" : "Family"}
                        </span>
                      )}
                      {pkg.durationAr && (
                        <span style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.15)", color: "#00AAFF", borderRadius: "50px", padding: "0.2rem 0.6rem", fontSize: "0.7rem" }}>
                          {ar ? pkg.durationAr : pkg.durationEn}
                        </span>
                      )}
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
