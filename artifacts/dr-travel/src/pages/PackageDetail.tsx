import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { useSiteData, type DBPackage } from "../context/SiteDataContext";
import { getPackageBySlug, getSimilarPackages, PACKAGES_DATA } from "../data/packages";
import { formatPrice } from "../data/currencies";
import { usePersonalization } from "../hooks/usePersonalization";
import { apiFetch, storageObjectUrl } from "../lib/api";

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
  const { packages: dbPackages, packagesLoading, settings, refetchPackages } = useSiteData();
  const ar = lang === "ar";

  const slug = params?.slug;

  // Find package: DB first, then static fallback
  const dbPkg = dbPackages.find(p => p.slug === slug);
  const staticPkg = slug ? getPackageBySlug(slug) : null;
  const pkg: DBPackage | null = dbPkg ?? (staticPkg ? (staticPkg as unknown as DBPackage) : null);

  const [activeImg, setActiveImg] = useState(0);
  const [brokenImgs, setBrokenImgs] = useState<Set<number>>(new Set());
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isXs, setIsXs] = useState(window.innerWidth < 480);
  const touchStartX = useRef(0);
  const wasSwiping = useRef(false);

  // ── Lightbox state ──
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const lbTouchX = useRef(0);
  const lightboxIdxRef = useRef(0);
  const lightboxOpenRef = useRef(false);

  // ── Booking modal state ──
  const [showBook, setShowBook] = useState(false);
  const [bookForm, setBookForm] = useState({ name: "", phone: "", people: "1", date: "", notes: "" });
  const [bookErrors, setBookErrors] = useState<Record<string, string>>({});
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [bookDone, setBookDone] = useState(false);
  const [bookWaUrl, setBookWaUrl] = useState("");
  const [bookSubmitError, setBookSubmitError] = useState("");

  const closeBookModal = () => {
    if (bookSubmitting) return;
    setShowBook(false);
    setTimeout(() => {
      setBookDone(false);
      setBookForm({ name: "", phone: "", people: "1", date: "", notes: "" });
      setBookErrors({});
      setBookSubmitError("");
    }, 300);
  };

  const validateBook = () => {
    const e: Record<string, string> = {};
    if (!bookForm.name.trim()) e.name = ar ? "الاسم مطلوب" : "Name is required";
    if (!bookForm.phone.trim()) e.phone = ar ? "رقم الهاتف مطلوب" : "Phone is required";
    else if (!/^01[0-9]{9}$/.test(bookForm.phone.replace(/\s/g, ""))) e.phone = ar ? "رقم غير صحيح (01XXXXXXXXX)" : "Invalid phone (01XXXXXXXXX)";
    if (!bookForm.people || parseInt(bookForm.people) < 1) e.people = ar ? "عدد الأفراد مطلوب" : "Number of people required";
    if (!bookForm.date) e.date = ar ? "تاريخ الرحلة مطلوب" : "Trip date is required";
    return e;
  };

  const handleBookSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validateBook();
    setBookErrors(errs);
    setBookSubmitError("");
    if (Object.keys(errs).length > 0) return;
    setBookSubmitting(true);
    const pkgName = ar ? (pkg?.titleAr ?? "") : (pkg?.titleEn ?? "");
    try {
      const response = await apiFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bookForm.name, phone: bookForm.phone,
          packageId: pkg?.id,
          packageName: pkgName,
          packageNameAr: pkg?.titleAr ?? "",
          date: bookForm.date || "",
          adults: bookForm.people,
          children: "0", infants: "0",
          notes: bookForm.notes,
          currency,
          priceAtBooking: pkg ? pkg.priceEGP * (parseInt(bookForm.people) || 1) : null,
        }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const fallbackMessage = ar
          ? "تعذر إرسال طلب الحجز الآن. برجاء مراجعة البيانات أو المحاولة مرة أخرى."
          : "We couldn't submit your booking right now. Please try again.";
        const serverMessage =
          typeof errorBody?.error === "string" && errorBody.error.trim().length > 0
            ? errorBody.error
            : "";
        throw new Error(ar ? fallbackMessage : serverMessage || fallbackMessage);
      }
    } catch (error) {
      setBookSubmitting(false);
      setBookSubmitError(
        error instanceof Error && error.message
          ? error.message
          : ar
            ? "تعذر إرسال طلب الحجز الآن. حاول مرة أخرى بعد قليل."
            : "We couldn't submit your booking right now. Please try again.",
      );
      return;
    }
    const waMsg = t.booking.waMessage(
      pkgName, bookForm.name, bookForm.phone,
      bookForm.date || (ar ? "غير محدد" : "TBD"),
      bookForm.people, "0", "0", bookForm.notes
    );
    setBookWaUrl(`https://wa.me/201205756024?text=${encodeURIComponent(waMsg)}`);
    setBookSubmitting(false);
    setBookDone(true);
  };

  // Convert a stored image path to the correct API URL
  // - Already a full http/https URL or an /api/ path → use as-is
  // - Raw objectPath (e.g. "objects/uploads/uuid") → wrap in storage endpoint
  const toImgUrl = (path: string): string => {
    return storageObjectUrl(path);
  };

  // Derive a stable image count and safe index BEFORE any navigation callbacks
  const imgs = (pkg?.images ?? []).map(toImgUrl);
  const imgCount = imgs.length;
  const safeImg = imgCount > 0 ? Math.min(Math.max(activeImg, 0), imgCount - 1) : 0;

  // Use refs so the keyboard/swipe handlers always see the latest values
  const imgCountRef = useRef(imgCount);
  imgCountRef.current = imgCount;
  const safeImgRef = useRef(safeImg);
  safeImgRef.current = safeImg;

  const prevImg = () => {
    const n = imgCountRef.current;
    if (n <= 1) return;
    setActiveImg(i => {
      const cur = Math.min(Math.max(i, 0), n - 1);
      return cur <= 0 ? n - 1 : cur - 1;
    });
  };
  const nextImg = () => {
    const n = imgCountRef.current;
    if (n <= 1) return;
    setActiveImg(i => {
      const cur = Math.min(Math.max(i, 0), n - 1);
      return cur >= n - 1 ? 0 : cur + 1;
    });
  };

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsXs(window.innerWidth < 480);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (slug) {
      void refetchPackages({ silent: true });
    }
  }, [slug, refetchPackages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxOpenRef.current) {
        if (e.key === "Escape") { setLightboxOpen(false); lightboxOpenRef.current = false; }
        if (e.key === "ArrowRight") setLightboxIdx(i => { const n = i >= imgCountRef.current - 1 ? 0 : i + 1; lightboxIdxRef.current = n; return n; });
        if (e.key === "ArrowLeft") setLightboxIdx(i => { const n = i <= 0 ? imgCountRef.current - 1 : i - 1; lightboxIdxRef.current = n; return n; });
      } else {
        if (imgCountRef.current < 2) return;
        if (e.key === "ArrowLeft") nextImg();
        if (e.key === "ArrowRight") prevImg();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sync ref and body scroll lock with lightbox state
  useEffect(() => {
    lightboxOpenRef.current = lightboxOpen;
    lightboxIdxRef.current = lightboxIdx;
    document.body.style.overflow = lightboxOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxOpen, lightboxIdx]);

  const openLightbox = (idx: number) => { setLightboxIdx(idx); lightboxIdxRef.current = idx; setLightboxOpen(true); };
  const closeLightbox = () => { setLightboxOpen(false); lightboxOpenRef.current = false; };
  const lbPrev = () => setLightboxIdx(i => { const n = i <= 0 ? imgCount - 1 : i - 1; lightboxIdxRef.current = n; return n; });
  const lbNext = () => setLightboxIdx(i => { const n = i >= imgCount - 1 ? 0 : i + 1; lightboxIdxRef.current = n; return n; });

  // Reset gallery state whenever the package slug changes
  useEffect(() => {
    setActiveImg(0);
    setBrokenImgs(new Set());
  }, [slug]);

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
  const formatPkgPrice = (priceEGP: number) => formatPrice(priceEGP, currency, lang, settings);

  const waMsg = encodeURIComponent(
    ar ? `مرحباً DR Travel 👋\nأريد الاستفسار عن: ${title}\n💰 السعر: ${formatPkgPrice(pkg.priceEGP)}/فرد`
       : `Hello DR Travel 👋\nI'd like to inquire about: ${title}\n💰 Price: ${formatPkgPrice(pkg.priceEGP)}/person`
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
          ? `${formatPkgPrice(pkg.priceEGP)} — ${formatPkgPrice(pkg.maxPriceEGP!)}`
          : formatPkgPrice(pkg.priceEGP)}
      </div>
      <div style={{ color: "#667788", fontSize: "0.78rem", marginBottom: "1.25rem" }}>{duration}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <button
          onClick={() => setShowBook(true)}
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
          { label: ar ? `${pkg.minGroupSize}–${pkg.maxGroupSize} أشخاص` : `${pkg.minGroupSize}–${pkg.maxGroupSize} persons` },
          { label: ar ? (pkg.familyFriendly ? "مناسبة للعائلات ✓" : "غير مخصصة للعائلات") : (pkg.familyFriendly ? "Family Friendly ✓" : "Not family-focused") },
          { label: ar ? (pkg.foreignerFriendly ? "مناسبة للأجانب ✓" : "للمصريين بشكل رئيسي") : (pkg.foreignerFriendly ? "Foreigner Friendly ✓" : "Primarily for Egyptians") },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#8899aa", fontSize: "0.78rem" }}>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0D1B2A", fontFamily: "Cairo, sans-serif", overflowX: "hidden" }}>

      {/* Back button */}
      <div style={{ position: "fixed", top: isMobile ? "70px" : "80px", insetInlineStart: isMobile ? "0.75rem" : "1rem", zIndex: 100 }}>
        <button onClick={() => navigate("/trips")}
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", padding: isMobile ? "0.45rem 0.85rem" : "0.5rem 1rem", borderRadius: "50px", cursor: "pointer", fontWeight: 600, fontSize: isMobile ? "0.76rem" : "0.82rem", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", gap: "0.35rem", whiteSpace: "nowrap" }}>
          {ar ? "← الباقات" : "← Packages"}
        </button>
      </div>

      {/* Hero gallery */}
      <div style={{ position: "relative" }}>
        <div
          style={{ position: "relative", height: isMobile ? "42vh" : "52vh", minHeight: isMobile ? "260px" : "360px", overflow: "hidden", cursor: imgCount > 0 && !brokenImgs.has(safeImg) ? "zoom-in" : "default" }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; wasSwiping.current = false; }}
          onTouchEnd={e => {
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 12) { wasSwiping.current = true; if (Math.abs(diff) > 40) { if (diff > 0) nextImg(); else prevImg(); } }
          }}
          onClick={() => {
            if (wasSwiping.current) { wasSwiping.current = false; return; }
            if (imgCount > 0 && !brokenImgs.has(safeImg)) openLightbox(safeImg);
          }}
        >
          {/* Image — key forces fresh element on index change, preventing display:none bleed-over */}
          {imgCount > 0 && !brokenImgs.has(safeImg) ? (
            <img
              key={safeImg}
              src={imgs[safeImg]}
              alt={title}
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.3s" }}
              onError={() => setBrokenImgs(prev => new Set(prev).add(safeImg))}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${pkg.color}20, #0D1B2A)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "6rem" }}>
              {pkg.icon}
            </div>
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 65%, rgba(13,27,42,0.92) 100%)" }} />

          {/* Zoom-in icon — indicates the image is clickable */}
          {imgCount > 0 && !brokenImgs.has(safeImg) && (
            <div style={{ position: "absolute", top: "0.75rem", insetInlineStart: "0.75rem", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "50%", width: isMobile ? 34 : 40, height: isMobile ? 34 : 40, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
              <svg width={isMobile ? 15 : 18} height={isMobile ? 15 : 18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
          )}

          {/* Prev / Next arrows — only shown when there are multiple valid images */}
          {imgCount > 1 && (<>
            <button onClick={e => { e.stopPropagation(); prevImg(); }}
              style={{ position: "absolute", top: "50%", insetInlineStart: "0.85rem", transform: "translateY(-50%)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1rem" : "1.2rem", zIndex: 10, transition: "all 0.2s" }}>
              ‹
            </button>
            <button onClick={e => { e.stopPropagation(); nextImg(); }}
              style={{ position: "absolute", top: "50%", insetInlineEnd: "0.85rem", transform: "translateY(-50%)", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)", color: "white", width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1rem" : "1.2rem", zIndex: 10, transition: "all 0.2s" }}>
              ›
            </button>

            {/* Counter badge: always safeImg + 1 */}
            <div style={{ position: "absolute", top: "0.85rem", insetInlineEnd: "0.85rem", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", color: "white", fontSize: "0.72rem", fontWeight: 700, padding: "0.25rem 0.65rem", borderRadius: "50px", fontFamily: "Montserrat, sans-serif" }}>
              {safeImg + 1} / {imgCount}
            </div>
          </>)}

          <div style={{ position: "absolute", bottom: isMobile ? "2rem" : "3rem", left: 0, right: 0, padding: isMobile ? "0 1rem" : "0 2rem", textAlign: "center" }}>
            <h1 style={{ fontSize: isMobile ? (isXs ? "1.3rem" : "1.55rem") : "2.2rem", fontWeight: 900, color: "white", margin: 0, lineHeight: 1.25, padding: isMobile ? "0 0.5rem" : "0", wordBreak: "break-word", textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.95)" }}>{title}</h1>
          </div>
        </div>

        {/* Thumbnail strip */}
        {imgCount > 1 && (
          <div style={{ background: "#0a1520", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0.65rem 1rem", display: "flex", gap: "0.5rem", overflowX: "auto" }}>
            {imgs.map((img, i) => (
              <button key={i} onClick={() => { setActiveImg(i); openLightbox(i); }}
                style={{ flexShrink: 0, width: isMobile ? 56 : 72, height: isMobile ? 42 : 54, borderRadius: 8, overflow: "hidden", border: `2px solid ${i === safeImg ? pkg.color : "transparent"}`, cursor: "zoom-in", padding: 0, transition: "border-color 0.2s", opacity: i === safeImg ? 1 : 0.55 }}>
                {!brokenImgs.has(i) ? (
                  <img src={img} alt={`View ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => setBrokenImgs(prev => new Set(prev).add(i))} />
                ) : (
                  <div style={{ width: "100%", height: "100%", background: `${pkg.color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>{pkg.icon}</div>
                )}
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
              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem" }}>{pkg.rating} ★ ({pkg.reviewCount})</span>
              <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.28rem 0.75rem", borderRadius: "50px", fontSize: "0.74rem" }}>{duration}</span>
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
                <h2 style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.9rem" }}>{ar ? "لماذا هذه الرحلة؟" : "Why This Trip?"}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {whyTrip.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", color: "#c7d2e8", fontSize: "0.85rem" }}>
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
                    <div style={{ color: "#25D366", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>{ar ? "يشمل" : "Includes"}</div>
                    {includes.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem", marginBottom: "0.45rem", color: "#8899aa", fontSize: "0.8rem" }}>
                        <span style={{ flexShrink: 0, marginTop: "2px" }}><CheckIcon /></span>{item}
                      </div>
                    ))}
                  </div>
                )}
                {excludes.length > 0 && (
                  <div style={{ background: "rgba(255,107,107,0.05)", border: "1px solid rgba(255,107,107,0.15)", borderRadius: "14px", padding: "1.1rem" }}>
                    <div style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>{ar ? "لا يشمل" : "Not Included"}</div>
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
                <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.75rem" }}>{ar ? "ماذا تحضر معك؟" : "What to Bring?"}</div>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {whatToBring.map((item, i) => (
                    <span key={i} style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.3rem 0.75rem", borderRadius: "50px", fontSize: "0.75rem" }}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            {showCancellation && cancellation && (
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "1.1rem" }}>
                <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.5rem" }}>{ar ? "سياسة الإلغاء" : "Cancellation Policy"}</div>
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
                <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem" }}>{pkg.rating} ★ ({pkg.reviewCount})</span>
                <span style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#aabbcc", padding: "0.3rem 0.9rem", borderRadius: "50px", fontSize: "0.78rem" }}>{duration}</span>
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
                  <h2 style={{ color: "white", fontWeight: 700, fontSize: "1.05rem", marginBottom: "1.1rem" }}>{ar ? "لماذا هذه الرحلة؟" : "Why This Trip?"}</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                    {whyTrip.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#c7d2e8", fontSize: "0.88rem" }}>
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
                      <div style={{ color: "#25D366", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.85rem" }}>{ar ? "يشمل" : "Includes"}</div>
                      {includes.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", color: "#8899aa", fontSize: "0.83rem" }}>
                          <span style={{ flexShrink: 0, marginTop: "2px" }}><CheckIcon /></span>{item}
                        </div>
                      ))}
                    </div>
                  )}
                  {excludes.length > 0 && (
                    <div style={{ background: "rgba(255,107,107,0.05)", border: "1px solid rgba(255,107,107,0.15)", borderRadius: "16px", padding: "1.25rem" }}>
                      <div style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.85rem" }}>{ar ? "لا يشمل" : "Not Included"}</div>
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
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.85rem" }}>{ar ? "ماذا تحضر معك؟" : "What to Bring?"}</div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {whatToBring.map((item, i) => (
                      <span key={i} style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", padding: "0.35rem 0.85rem", borderRadius: "50px", fontSize: "0.78rem" }}>{item}</span>
                    ))}
                  </div>
                </div>
              )}

              {showCancellation && cancellation && (
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "1.25rem" }}>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.6rem" }}>{ar ? "سياسة الإلغاء" : "Cancellation Policy"}</div>
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "white", fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ar ? s.titleAr : s.titleEn}</div>
                        <div style={{ color: s.color, fontWeight: 700, fontSize: "0.78rem", fontFamily: "Montserrat, sans-serif" }}>{formatPrice(s.priceEGP, currency, lang, settings)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    {/* ===== BOOKING MODAL ===== */}
    {showBook && (
      <div className="book-modal-backdrop" onClick={closeBookModal}>
        <div className="book-modal-card" dir={ar ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem" }}>
            <div>
              <h3 style={{ color: "white", fontWeight: 900, fontSize: "1.15rem", margin: "0 0 0.25rem" }}>
                {ar ? "احجز رحلتك الآن" : "Book Your Trip"}
              </h3>
              <p style={{ color: "#667788", fontSize: "0.78rem", margin: 0, lineHeight: 1.5 }}>
                {ar ? "أكمل البيانات وسنتواصل معك فوراً" : "Fill in your details and we'll contact you right away"}
              </p>
            </div>
            <button onClick={closeBookModal}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.55)", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0, fontFamily: "monospace" }}>
              ✕
            </button>
          </div>

          {/* Package preview chip */}
          <div style={{ background: `${pkg.color}12`, border: `1px solid ${pkg.color}28`, borderRadius: "14px", padding: "0.9rem 1.1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: "0.88rem", marginBottom: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
              <div style={{ color: pkg.color, fontWeight: 800, fontSize: "0.85rem", fontFamily: "Montserrat, sans-serif" }}>
                {hasMaxPrice
                  ? `${formatPkgPrice(pkg.priceEGP)} — ${formatPkgPrice(pkg.maxPriceEGP!)}`
                  : formatPkgPrice(pkg.priceEGP)}
                <span style={{ color: "#8899aa", fontWeight: 400, fontFamily: "Cairo, sans-serif", fontSize: "0.75rem" }}> / {ar ? "فرد" : "person"}</span>
              </div>
            </div>
          </div>

          {!bookDone ? (
            <form onSubmit={handleBookSubmit} noValidate>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                {/* Name */}
                <div>
                  <label className="book-label">{ar ? "الاسم الكامل *" : "Full Name *"}</label>
                  <input className={`book-field${bookErrors.name ? " book-error" : ""}`}
                    placeholder={ar ? "مثال: أحمد محمد" : "e.g. Ahmed Mohamed"}
                    value={bookForm.name}
                    onChange={e => { setBookForm(f => ({ ...f, name: e.target.value })); setBookErrors(x => ({ ...x, name: "" })); setBookSubmitError(""); }} />
                  {bookErrors.name && <div style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{bookErrors.name}</div>}
                </div>

                {/* Phone */}
                <div>
                  <label className="book-label">{ar ? "رقم الهاتف *" : "Phone Number *"}</label>
                  <input className={`book-field${bookErrors.phone ? " book-error" : ""}`}
                    type="tel" dir="ltr" placeholder="01XXXXXXXXX"
                    value={bookForm.phone}
                    onChange={e => { setBookForm(f => ({ ...f, phone: e.target.value })); setBookErrors(x => ({ ...x, phone: "" })); setBookSubmitError(""); }} />
                  {bookErrors.phone && <div style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{bookErrors.phone}</div>}
                </div>

                {/* People + Date */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div>
                    <label className="book-label">{ar ? "عدد الأفراد *" : "No. of People *"}</label>
                    <input className={`book-field${bookErrors.people ? " book-error" : ""}`}
                      type="number" min="1" max="50" dir="ltr"
                      value={bookForm.people}
                      onChange={e => { setBookForm(f => ({ ...f, people: e.target.value })); setBookErrors(x => ({ ...x, people: "" })); setBookSubmitError(""); }} />
                    {bookErrors.people && <div style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{bookErrors.people}</div>}
                  </div>
                  <div>
                    <label className="book-label">{ar ? "تاريخ الرحلة" : "Trip Date"}</label>
                    <input className={`book-field${bookErrors.date ? " book-error" : ""}`}
                      type="date" dir="ltr"
                      min={new Date().toISOString().split("T")[0]}
                      value={bookForm.date}
                      onChange={e => { setBookForm(f => ({ ...f, date: e.target.value })); setBookErrors(x => ({ ...x, date: "" })); setBookSubmitError(""); }} />
                    {bookErrors.date && <div style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{bookErrors.date}</div>}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="book-label">{ar ? "ملاحظات (اختياري)" : "Notes (optional)"}</label>
                  <textarea className="book-field" rows={2} style={{ resize: "vertical" }}
                    placeholder={ar ? "أي طلبات خاصة أو ملاحظات..." : "Any special requests or notes..."}
                    value={bookForm.notes}
                    onChange={e => { setBookForm(f => ({ ...f, notes: e.target.value })); setBookSubmitError(""); }} />
                </div>

                {bookSubmitError && (
                  <div style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(248,113,113,0.4)", color: "#fecaca", borderRadius: "12px", padding: "0.85rem 1rem", fontSize: "0.82rem", lineHeight: 1.7 }}>
                    {bookSubmitError}
                  </div>
                )}

                {/* Estimated price */}
                {bookForm.people && parseInt(bookForm.people) > 0 && (
                  <div style={{ background: `${pkg.color}0d`, border: `1px solid ${pkg.color}22`, borderRadius: "10px", padding: "0.7rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#8899aa", fontSize: "0.8rem" }}>{ar ? "السعر التقديري" : "Estimated Price"}</span>
                    <span style={{ color: pkg.color, fontWeight: 800, fontFamily: "Montserrat, sans-serif", fontSize: "0.95rem" }}>
                      {formatPkgPrice(pkg.priceEGP * (parseInt(bookForm.people) || 1))}
                    </span>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={bookSubmitting}
                  style={{ background: bookSubmitting ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg,${pkg.color},${pkg.color}cc)`, color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", cursor: bookSubmitting ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {bookSubmitting ? (ar ? "⏳ جاري الإرسال..." : "⏳ Sending...") : (ar ? "📩 أرسل طلب الحجز" : "📩 Send Booking Request")}
                </button>

              </div>
            </form>

          ) : (
            /* Success state */
            <div style={{ textAlign: "center", padding: "0.5rem 0 0.25rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
              <h3 style={{ color: "white", fontWeight: 900, fontSize: "1.1rem", margin: "0 0 0.6rem" }}>
                {ar ? "تم استلام طلب الحجز!" : "Booking Request Received!"}
              </h3>
              <p style={{ color: "#8899aa", fontSize: "0.85rem", lineHeight: 1.75, margin: "0 0 1.5rem" }}>
                {ar
                  ? "سيتواصل معك فريق DR Travel خلال ساعة لتأكيد الحجز. يمكنك التأكيد الفوري عبر واتساب."
                  : "DR Travel team will contact you within an hour to confirm. You can also confirm instantly via WhatsApp."}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <a href={bookWaUrl} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none", fontFamily: "Cairo, sans-serif" }}>
                  <WhatsAppIcon /> {ar ? "تأكيد عبر واتساب" : "Confirm on WhatsApp"}
                </a>
                <button onClick={closeBookModal}
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", padding: "0.85rem", borderRadius: "14px", fontWeight: 700, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.88rem" }}>
                  {ar ? "إغلاق" : "Close"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    )}

    {/* ===== LIGHTBOX ===== */}
    {lightboxOpen && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.96)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
        onClick={closeLightbox}
      >
        {/* Close button */}
        <button
          onClick={e => { e.stopPropagation(); closeLightbox(); }}
          style={{ position: "absolute", top: "1rem", insetInlineEnd: "1rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white", width: 48, height: 48, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", fontWeight: 300, zIndex: 10, lineHeight: 1, fontFamily: "monospace" }}
        >✕</button>

        {/* Counter */}
        {imgCount > 1 && (
          <div style={{ position: "absolute", top: "1.1rem", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "white", fontSize: "0.8rem", fontWeight: 700, padding: "0.3rem 0.9rem", borderRadius: "50px", fontFamily: "Montserrat, sans-serif", zIndex: 10 }}>
            {lightboxIdx + 1} / {imgCount}
          </div>
        )}

        {/* Image container — stops click from closing when clicking image */}
        <div
          style={{ position: "relative", maxWidth: "95vw", maxHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.stopPropagation()}
          onTouchStart={e => { lbTouchX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            const diff = lbTouchX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 40) { if (diff > 0) lbNext(); else lbPrev(); }
          }}
        >
          <img
            src={imgs[lightboxIdx]}
            alt={`${title} — ${lightboxIdx + 1}`}
            style={{ maxWidth: "95vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 60px rgba(0,0,0,0.7)", userSelect: "none", WebkitUserSelect: "none" }}
            draggable={false}
          />
        </div>

        {/* Prev button */}
        {imgCount > 1 && (
          <button
            onClick={e => { e.stopPropagation(); lbPrev(); }}
            style={{ position: "absolute", top: "50%", insetInlineStart: "0.75rem", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", width: isMobile ? 48 : 58, height: isMobile ? 48 : 58, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1.5rem" : "1.8rem", fontWeight: 300, zIndex: 10, transition: "background 0.15s", lineHeight: 1 }}
          >‹</button>
        )}

        {/* Next button */}
        {imgCount > 1 && (
          <button
            onClick={e => { e.stopPropagation(); lbNext(); }}
            style={{ position: "absolute", top: "50%", insetInlineEnd: "0.75rem", transform: "translateY(-50%)", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "white", width: isMobile ? 48 : 58, height: isMobile ? 48 : 58, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? "1.5rem" : "1.8rem", fontWeight: 300, zIndex: 10, transition: "background 0.15s", lineHeight: 1 }}
          >›</button>
        )}

        {/* Thumbnail strip at bottom */}
        {imgCount > 1 && (
          <div
            style={{ position: "absolute", bottom: "1.25rem", left: 0, right: 0, display: "flex", gap: "0.5rem", justifyContent: "center", padding: "0 1rem", overflowX: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {imgs.map((img, i) => (
              !brokenImgs.has(i) && (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                  style={{ flexShrink: 0, width: isMobile ? 46 : 60, height: isMobile ? 34 : 44, borderRadius: 6, overflow: "hidden", border: `2px solid ${i === lightboxIdx ? pkg.color : "rgba(255,255,255,0.2)"}`, cursor: "pointer", padding: 0, opacity: i === lightboxIdx ? 1 : 0.5, transition: "all 0.2s" }}
                >
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
                </button>
              )
            ))}
          </div>
        )}

        {/* Swipe hint — mobile only, shown briefly */}
        {isMobile && imgCount > 1 && (
          <div style={{ position: "absolute", bottom: isMobile ? "5.5rem" : "6rem", left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.35)", fontSize: "0.72rem", fontFamily: "Cairo, sans-serif", whiteSpace: "nowrap", pointerEvents: "none" }}>
            {ar ? "← اسحب للتنقل →" : "← Swipe to navigate →"}
          </div>
        )}
      </div>
    )}

    </div>
  );
}
