import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { useSiteData } from "../context/SiteDataContext";
import { formatPrice } from "../data/currencies";
import type { PackageData } from "../data/packages";

interface Props {
  packages: PackageData[];
  onClose: () => void;
  onBook: (pkg: PackageData) => void;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
);
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff6b6b"><path d="M18.3 5.71a.996.996 0 00-1.41 0L12 10.59 7.11 5.7A.996.996 0 105.7 7.11L10.59 12 5.7 16.89a.996.996 0 101.41 1.41L12 13.41l4.89 4.89a.996.996 0 101.41-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>
);

export default function CompareModal({ packages, onClose, onBook }: Props) {
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const { categories, settings } = useSiteData();

  const ar = lang === "ar";

  const categoryName = (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (cat) return ar ? cat.nameAr : cat.nameEn;
    return slug;
  };

  const ct = ar ? {
    title: "مقارنة الباقات",
    price: "السعر / فرد",
    duration: "المدة",
    category: "النوع",
    includes: "يشمل",
    familyFriendly: "مناسبة للعائلات",
    foreignerFriendly: "مناسبة للأجانب",
    childrenFriendly: "مناسبة للأطفال",
    mealsIncluded: "وجبات مشمولة",
    accommodation: "إقامة مشمولة",
    transport: "مواصلات مشمولة",
    experience: "مستوى التجربة",
    rating: "التقييم",
    book: "احجز الآن",
    yes: "نعم",
    no: "لا",
    easy: "سهل",
    moderate: "متوسط",
    adventurous: "مغامرة",
    close: "إغلاق",
  } : {
    title: "Compare Packages",
    price: "Price / Person",
    duration: "Duration",
    category: "Type",
    includes: "Includes",
    familyFriendly: "Family Friendly",
    foreignerFriendly: "Foreigner Friendly",
    childrenFriendly: "Children Friendly",
    mealsIncluded: "Meals Included",
    accommodation: "Accommodation",
    transport: "Transport",
    experience: "Experience Level",
    rating: "Rating",
    book: "Book Now",
    yes: "Yes",
    no: "No",
    easy: "Easy",
    moderate: "Moderate",
    adventurous: "Adventurous",
    close: "Close",
  };

  const expLabels: Record<string, string> = {
    easy: ct.easy, moderate: ct.moderate, adventurous: ct.adventurous,
  };

  const BoolCell = ({ val }: { val: boolean }) => (
    <div style={{ display: "flex", justifyContent: "center" }}>
      {val ? <CheckIcon /> : <XIcon />}
    </div>
  );

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `140px repeat(${packages.length}, 1fr)`,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  };
  const cellStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    fontSize: "0.82rem",
    color: "#aabbcc",
    textAlign: "center",
  };
  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    color: "#667788",
    fontWeight: 600,
    textAlign: lang === "ar" ? "right" : "left",
    fontSize: "0.75rem",
    background: "rgba(0,0,0,0.2)",
  };

  const rows: { label: string; render: (pkg: PackageData) => React.ReactNode }[] = [
    { label: ct.price, render: pkg => <span style={{ color: pkg.color, fontWeight: 800 }}>{formatPrice(pkg.priceEGP, currency, lang, settings)}</span> },
    { label: ct.duration, render: pkg => lang === "ar" ? pkg.durationAr : pkg.durationEn },
    { label: ct.category, render: pkg => categoryName(pkg.category) },
    { label: ct.experience, render: pkg => expLabels[pkg.experienceLevel] },
    { label: ct.rating, render: pkg => `${pkg.rating} ⭐ (${pkg.reviewCount})` },
    { label: ct.familyFriendly, render: pkg => <BoolCell val={pkg.familyFriendly} /> },
    { label: ct.foreignerFriendly, render: pkg => <BoolCell val={pkg.foreignerFriendly} /> },
    { label: ct.childrenFriendly, render: pkg => <BoolCell val={pkg.childrenFriendly} /> },
    { label: ct.mealsIncluded, render: pkg => <BoolCell val={pkg.includesMeals} /> },
    { label: ct.accommodation, render: pkg => <BoolCell val={pkg.includesAccommodation} /> },
    { label: ct.transport, render: pkg => <BoolCell val={pkg.includesTransport} /> },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={onClose}>
      <div style={{ background: "#0d1b2a", border: "1px solid rgba(0,170,255,0.2)", borderRadius: "24px", maxWidth: "900px", width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#0d1b2a", zIndex: 1 }}>
          <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem" }}>{ct.title}</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#667788", width: 34, height: 34, borderRadius: "8px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Package headers */}
        <div style={{ padding: "0 0.75rem" }}>
          <div style={{ ...rowStyle, padding: "1rem 0.25rem", border: "none" }}>
            <div />
            {packages.map(pkg => (
              <div key={pkg.id} style={{ padding: "0.5rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{pkg.icon}</div>
                <div style={{ color: pkg.color, fontWeight: 800, fontSize: "0.9rem", lineHeight: 1.3 }}>
                  {lang === "ar" ? pkg.titleAr : pkg.titleEn}
                </div>
              </div>
            ))}
          </div>

          {/* Includes list */}
          <div style={{ ...rowStyle, alignItems: "start" }}>
            <div style={headerCellStyle}>{ct.includes}</div>
            {packages.map(pkg => {
              const items = lang === "ar" ? pkg.includesAr : pkg.includesEn;
              return (
                <div key={pkg.id} style={{ ...cellStyle, textAlign: lang === "ar" ? "right" : "left" }}>
                  {items.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.35rem", justifyContent: lang === "ar" ? "flex-end" : "flex-start" }}>
                      <span style={{ color: pkg.color, flexShrink: 0, marginTop: "2px" }}><CheckIcon /></span>
                      <span style={{ fontSize: "0.78rem", color: "#8899aa" }}>{item}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Comparison rows */}
          {rows.map((row, idx) => (
            <div key={idx} style={{ ...rowStyle, background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              <div style={headerCellStyle}>{row.label}</div>
              {packages.map(pkg => (
                <div key={pkg.id} style={cellStyle}>{row.render(pkg)}</div>
              ))}
            </div>
          ))}

          {/* Book buttons */}
          <div style={{ ...rowStyle, padding: "1.25rem 0", border: "none" }}>
            <div />
            {packages.map(pkg => (
              <div key={pkg.id} style={{ padding: "0 0.5rem" }}>
                <button onClick={() => onBook(pkg)}
                  style={{ width: "100%", background: `linear-gradient(135deg,${pkg.color},${pkg.color}cc)`, color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: "0.75rem 0.5rem", borderRadius: "12px", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.2s" }}>
                  {ct.book}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
