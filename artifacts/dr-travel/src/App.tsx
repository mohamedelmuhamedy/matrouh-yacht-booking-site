import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import logoImg from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";
import { LanguageProvider, useLanguage } from "./LanguageContext";
import { CurrencyProvider, useCurrency } from "./context/CurrencyContext";
import { SiteDataProvider, useSiteData, type DBPackage, type DBTestimonial, type SiteSettings } from "./context/SiteDataContext";
import CurrencySwitcher from "./components/CurrencySwitcher";
import ThemeSwitch from "./components/ThemeSwitch";
import CompareModal from "./components/CompareModal";
import AIAssistant from "./components/AIAssistant";
import CustomerPhotosGallery from "./components/CustomerPhotosGallery";
import PackageDetail from "./pages/PackageDetail";
import RewardsPage from "./pages/RewardsPage";
import TripsPage from "./pages/TripsPage";
import GalleryPage from "./pages/GalleryPage";
import GalleryDetailPage from "./pages/GalleryDetailPage";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import WhyUsDetailPage from "./pages/WhyUsDetailPage";
import SharePage from "./pages/SharePage";
import TicketPage from "./pages/TicketPage";
import VerifyPage from "./pages/VerifyPage";
import ReviewPage from "./pages/ReviewPage";
import QuizPage from "./pages/QuizPage";
import SeoHead from "./components/SeoHead";
import NotFoundPage from "./pages/NotFoundPage";
// AdminRouter is loaded lazily so the public bundle never ships the admin
// pages or their dependencies (jspdf, html2canvas, html5-qrcode, etc.).
const AdminRouter = lazy(() => import("./admin/AdminRouter"));
import PushPrompt from "./components/PushPrompt";
import TripReminderBanner from "./components/TripReminderBanner";
import { PACKAGES_DATA } from "./data/packages";
import HeroSlider from "./components/HeroSlider";
import DatePicker from "./components/DatePicker";
import { formatPrice, CurrencyCode } from "./data/currencies";
import { apiFetch, resolveApiAssetUrl } from "./lib/api";
import {
  getFontStack,
  loadGoogleFonts,
  resolveArabicFont,
  resolveEnglishFont,
} from "./lib/siteFonts";

interface DisplayPkg {
  id: number;
  slug: string;
  icon: string;
  name: string;
  titleAr: string;
  includes: string[];
  duration: string;
  showDuration: boolean;
  price: string;
  priceNum: number;
  maxPriceNum: number | null;
  badge: string | null;
  badgeColor: string | null;
  featured: boolean;
  desc: string;
  color: string;
  whyThisTripAr: { icon: string; text: string }[];
  whyThisTripEn: { icon: string; text: string }[];
  images?: string[];
}

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __drTravelInstallPrompt?: DeferredInstallPrompt | null;
  }
}

function dbPkgToDisplay(pkg: DBPackage, lang: string, currency: string, settings: SiteSettings): DisplayPkg {
  const curr = currency as CurrencyCode;
  const ar = lang === "ar";
  const hasMax = typeof pkg.maxPriceEGP === "number" && pkg.maxPriceEGP > 0;
  const priceLabel = hasMax
    ? `${formatPrice(pkg.priceEGP, curr, lang, settings)} – ${formatPrice(pkg.maxPriceEGP!, curr, lang, settings)}`
    : formatPrice(pkg.priceEGP, curr, lang, settings);
  return {
    id: pkg.id,
    slug: pkg.slug,
    icon: pkg.icon,
    name: ar ? pkg.titleAr : pkg.titleEn,
    titleAr: pkg.titleAr,
    includes: (ar ? pkg.includesAr : pkg.includesEn).slice(0, 5),
    duration: ar ? pkg.durationAr : pkg.durationEn,
    showDuration: (pkg as any).showDuration !== false,
    price: priceLabel,
    priceNum: pkg.priceEGP,
    maxPriceNum: hasMax ? pkg.maxPriceEGP! : null,
    badge: ar ? pkg.badgeAr : pkg.badgeEn,
    badgeColor: pkg.badgeColor,
    featured: pkg.featured,
    desc: ar ? pkg.descriptionAr : pkg.descriptionEn,
    color: pkg.color,
    whyThisTripAr: pkg.whyThisTripAr ?? [],
    whyThisTripEn: pkg.whyThisTripEn ?? [],
    images: pkg.images ?? [],
  };
}

function testimonialToReview(t: DBTestimonial, lang: string) {
  const ar = lang === "ar";
  return {
    name: ar ? t.nameAr : (t.nameEn || t.nameAr),
    initials: (t.avatar && t.avatar.length <= 4 ? t.avatar : "") || (t.nameAr || t.nameEn || "؟").slice(0, 2),
    avatarUrl: t.avatar && (t.avatar.startsWith("http") || t.avatar.startsWith("/")) ? t.avatar : "",
    image: t.imageUrl || "",
    review: ar ? t.textAr : (t.textEn || t.textAr),
    stars: t.rating,
  };
}

function useSiteFonts(settings: SiteSettings) {
  const arabicFont = resolveArabicFont(settings.font_arabic);
  const englishFont = resolveEnglishFont(settings.font_en);

  useEffect(() => {
    loadGoogleFonts([arabicFont, englishFont]);
    document.documentElement.style.setProperty("--app-font-arabic", getFontStack(arabicFont, "arabic"));
    document.documentElement.style.setProperty("--app-font-en", getFontStack(englishFont, "english"));
  }, [arabicFont, englishFont]);
}

const AVATAR_COLORS = [
  "linear-gradient(135deg,#00AAFF,#0066cc)", "linear-gradient(135deg,#C9A84C,#9a6e1c)",
  "linear-gradient(135deg,#25D366,#128C4E)", "linear-gradient(135deg,#FF6B6B,#cc3333)",
  "linear-gradient(135deg,#A855F7,#6d28d9)", "linear-gradient(135deg,#F97316,#c2410c)",
  "linear-gradient(135deg,#06B6D4,#0e7490)", "linear-gradient(135deg,#EC4899,#be185d)",
];

// ===== ICONS =====
const FacebookIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);
const TikTokIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);
const PhoneIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);
const LocationIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
  </svg>
);
const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

// ===== HOOKS =====
function useIntersectionObserver() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

function AnimatedCounter({ target, duration = 1800, locale }: { target: number; duration?: number; locale: string }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useIntersectionObserver();
  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);
  return <span ref={ref}>{count.toLocaleString(locale)}</span>;
}

function FadeInSection({ children, delay = 0, fillHeight = false }: { children: React.ReactNode; delay?: number; fillHeight?: boolean }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div
      ref={ref}
      className={`fade-in-up ${isVisible ? "visible" : ""}`}
      style={{ transitionDelay: `${delay}ms`, ...(fillHeight ? { height: "100%" } : {}) }}
    >
      {children}
    </div>
  );
}

// ===== SCROLL PROGRESS =====
function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let rafId = 0;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!barRef.current) return;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        barRef.current.style.width = `${total > 0 ? (window.scrollY / total) * 100 : 0}%`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(rafId); };
  }, []);
  return <div ref={barRef} className="scroll-progress" style={{ width: "0%" }} />;
}

// ===== LANGUAGE SWITCHER =====
function LangSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const isAr = lang === "ar";
  return (
    <button
      onClick={() => setLang(isAr ? "en" : "ar")}
      title={t.langSwitcher.tooltip}
      style={{
        display: "flex", alignItems: "center", gap: "0.35rem",
        background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.25)",
        borderRadius: "8px", padding: "0.35rem 0.75rem", cursor: "pointer",
        color: "#00AAFF", fontSize: "0.78rem", fontWeight: 800,
        fontFamily: "Montserrat, Cairo, sans-serif", letterSpacing: "0.5px",
        transition: "all 0.25s", flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.18)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.5)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.08)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.25)";
      }}
    >
      <GlobeIcon />
      {t.langSwitcher.label}
    </button>
  );
}

// ===== NAVBAR =====
function Navbar() {
  const { t, lang } = useLanguage();
  const { settings } = useSiteData();
  const logoSrc = resolveApiAssetUrl(settings.logo_url) || logoImg;
  const [location, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeSection, setActiveSection] = useState("#hero");
  const ar = lang === "ar";

  const navLinks = [
    { label: t.nav.home, href: "#hero" },
    { label: t.nav.services, href: "#services" },
    { label: t.nav.packages, href: "#packages" },
    { label: t.nav.booking, href: "#booking" },
    { label: t.nav.contact, href: "#footer" },
  ];
  const [pwaPrompt, setPwaPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !("MSStream" in window);
  const [isInstalled, setIsInstalled] = useState(
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as any).standalone)
  );
  useEffect(() => {
    const syncStoredPrompt = () => {
      setPwaPrompt(window.__drTravelInstallPrompt ?? null);
    };
    const onPrompt = (event: Event) => {
      const deferredPrompt = event as DeferredInstallPrompt;
      deferredPrompt.preventDefault();
      window.__drTravelInstallPrompt = deferredPrompt;
      setPwaPrompt(deferredPrompt);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setPwaPrompt(null);
      window.__drTravelInstallPrompt = null;
    };
    syncStoredPrompt();
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("drtravel-install-available", syncStoredPrompt as EventListener);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("drtravel-install-available", syncStoredPrompt as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const handleInstallApp = () => {
    const deferredPrompt = pwaPrompt ?? window.__drTravelInstallPrompt ?? null;

    // 1. Native PWA prompt available — Android / Desktop Chrome/Edge → fire immediately, no modal
    if (deferredPrompt) {
      deferredPrompt.prompt();
      void deferredPrompt.userChoice.then((result) => {
        if (result.outcome === "accepted") {
          setPwaPrompt(null);
          setIsInstalled(true);
          window.__drTravelInstallPrompt = null;
        }
      });
      return;
    }
    // 2. App already installed → just open the app root
    if (isInstalled) {
      window.open(window.location.href, "_blank");
      return;
    }
    // 3. iOS Safari → Add to Home Screen guide only
    if (isIOS) { setShowIOSGuide(true); return; }
    // 4. Desktop browsers without a prompt rely on their own install UI
  };
  const installBtnLabel = isInstalled
    ? (ar ? "فتح التطبيق" : "Open App")
    : (ar ? "تحميل التطبيق" : "Install App");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
      const sections = ["hero", "services", "packages", "booking", "footer"];
      for (const id of sections.reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY >= el.offsetTop - 120) { setActiveSection(`#${id}`); break; }
      }
    };
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onResize); };
  }, []);

  const scrollTo = (id: string) => {
    setMenuOpen(false);
    if (location !== "/" && location !== "") {
      navigate("/" + id);
      return;
    }
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const textAlign = lang === "ar" ? "right" : "left";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }} onClick={() => { if (location === "/" || location === "") { scrollTo("#hero"); } else { navigate("/"); } }}>
          <div style={{ position: "relative" }}>
            <img src={logoSrc} alt="DR Travel" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,170,255,0.5)", boxShadow: "0 0 16px rgba(0,170,255,0.3)" }} />
            <span style={{ position: "absolute", bottom: 0, left: 0, width: 11, height: 11, borderRadius: "50%", background: "#25D366", border: "2px solid #0a1520" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#00AAFF", letterSpacing: "1.5px", lineHeight: 1.1 }}>{settings.brand_name || "DR TRAVEL"}</div>
            <div style={{ fontSize: "0.6rem", color: "var(--text-muted)", letterSpacing: "0.5px" }}>{settings.dev_name || "Yousef Mostafa"}</div>
          </div>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
            {navLinks.map(link => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className={`nav-link ${activeSection === link.href ? "active" : ""}`}>
                {link.label}
              </button>
            ))}
            {/* Rewards & Referral */}
            <button onClick={() => navigate("/rewards")}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", padding: "0.4rem 0.95rem", borderRadius: "50px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.8rem", transition: "all 0.2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.12)"; }}>
              🎁 {ar ? "الإحالة والمكافآت" : "Rewards"}
            </button>
            {/* Install App — platform-aware */}
            <button onClick={handleInstallApp}
              style={{ background: isInstalled ? "linear-gradient(135deg,#10B981,#065F46)" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.45rem 0.95rem", borderRadius: "50px", cursor: "pointer", fontWeight: 700, fontSize: "0.78rem", fontFamily: "Cairo, sans-serif", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {isInstalled ? "✓" : "📲"} {installBtnLabel}
            </button>
            <CurrencySwitcher />
            <LangSwitcher />
            <ThemeSwitch size="sm" />
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.55rem 1.25rem", borderRadius: "50px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.3s", boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 22px rgba(37,211,102,0.45)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(37,211,102,0.3)"; }}>
              <WhatsAppIcon /> {t.nav.whatsapp}
            </a>
          </div>
        )}

        {/* Mobile: currency + lang switcher + hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <CurrencySwitcher />
            <LangSwitcher />
            <ThemeSwitch size="sm" />
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", flexDirection: "column", gap: "5px" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 24, height: 2, background: scrolled ? "var(--text-primary)" : "#ffffff", display: "block", borderRadius: "2px", transition: "all 0.3s",
                  transform: i === 0 && menuOpen ? "rotate(45deg) translate(5px,5px)" : i === 2 && menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none",
                  opacity: i === 1 && menuOpen ? 0 : 1 }} />
              ))}
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isMobile && (
        <div style={{ overflow: "hidden", maxHeight: menuOpen ? "500px" : "0", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)", background: "var(--navbar-mobile)", backdropFilter: "blur(20px)" }}>
          <div style={{ padding: "0.75rem 1.5rem 1.25rem", borderTop: "1px solid var(--border)" }}>
            {navLinks.map(link => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                style={{ display: "block", width: "100%", background: "none", border: "none", color: activeSection === link.href ? "#00AAFF" : "var(--text-primary)", padding: "0.8rem 0", fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, textAlign, borderBottom: "1px solid var(--border)", transition: "color 0.2s" }}>
                {link.label}
              </button>
            ))}
            {/* Rewards & Referral */}
            <button onClick={() => { setMenuOpen(false); navigate("/rewards"); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", padding: "0.85rem", borderRadius: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem", marginTop: "0.5rem" }}>
              🎁 {ar ? "الإحالة والمكافآت" : "Rewards & Referral"}
            </button>
            {/* Install App — platform-aware */}
            <button onClick={() => { setMenuOpen(false); handleInstallApp(); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", width: "100%", background: isInstalled ? "linear-gradient(135deg,#10B981,#065F46)" : "linear-gradient(135deg,#00AAFF,#0066cc)", border: "none", borderRadius: "10px", color: "white", padding: "0.85rem 1rem", fontSize: "0.95rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, marginTop: "0.5rem" }}>
              {isInstalled ? "✓" : "📲"} {isInstalled ? installBtnLabel : (ar ? `تحميل تطبيق ${settings.brand_short_name || "DR Travel"}` : `Install ${settings.brand_short_name || "DR Travel"} App`)}
            </button>
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.85rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none", marginTop: "0.75rem", fontFamily: "Cairo, sans-serif" }}>
              <WhatsAppIcon /> {t.nav.whatsappMobile}
            </a>
          </div>
        </div>
      )}

      {/* iOS Add-to-Home-Screen guide — only shown on iPhone/iPad */}
      {showIOSGuide && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowIOSGuide(false)}>
          <div style={{ background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: "20px 20px 0 0", padding: "2rem 1.5rem 3rem", maxWidth: 420, width: "100%", direction: ar ? "rtl" : "ltr", fontFamily: "Cairo,sans-serif" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📲</div>
              <h3 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "1.2rem", margin: 0 }}>
                {ar ? `تثبيت تطبيق ${settings.brand_short_name || "DR Travel"}` : `Install ${settings.brand_short_name || "DR Travel"} App`}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "0.4rem 0 0", fontWeight: 400 }}>
                {isIOS
                  ? (ar ? "لا يدعم Safari التثبيت المباشر — اتبع الخطوات:" : "Safari doesn't support direct install — follow these steps:")
                  : (ar ? "لو لم تظهر نافذة التثبيت تلقائيًا، يمكنك التثبيت يدويًا من قائمة المتصفح." : "If the install prompt doesn't appear automatically, you can install the app from your browser menu.")}
              </p>
            </div>
            {isIOS ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-surface-2)", borderRadius: "12px", padding: "0.9rem 1rem" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>⬆️</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {ar ? 'اضغط على زر المشاركة في شريط Safari السفلي' : 'Tap the Share button at the bottom of Safari'}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-surface-2)", borderRadius: "12px", padding: "0.9rem 1rem" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>🏠</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {ar ? 'مرر للأسفل واختر "إضافة إلى الشاشة الرئيسية"' : 'Scroll down, tap "Add to Home Screen"'}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-surface-2)", borderRadius: "12px", padding: "0.9rem 1rem" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>✅</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {ar ? 'اضغط "إضافة" في الزاوية العلوية اليمنى' : 'Tap "Add" in the top-right corner'}
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-surface-2)", borderRadius: "12px", padding: "0.9rem 1rem" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>⋮</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {ar ? "افتح قائمة المتصفح من زر ⋮ أو ⋯" : "Open your browser menu using ⋮ or ⋯"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "var(--bg-surface-2)", borderRadius: "12px", padding: "0.9rem 1rem" }}>
                  <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>⬇️</span>
                  <span style={{ color: "var(--text-primary)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    {ar ? 'اختر "Install app" أو "Add to Home Screen"' : 'Choose "Install app" or "Add to Home Screen"'}
                  </span>
                </div>
              </div>
            )}
            <button onClick={() => setShowIOSGuide(false)}
              style={{ display: "block", width: "100%", marginTop: "1.5rem", background: "var(--bg-surface-2)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", borderRadius: "12px", padding: "0.85rem", cursor: "pointer", fontFamily: "Cairo,sans-serif", fontWeight: 700, fontSize: "1rem" }}>
              {ar ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ===== HERO =====
function Hero() {
  const { t, lang } = useLanguage();
  const { settings } = useSiteData();
  const [, navigate] = useLocation();
  const logoSrc = resolveApiAssetUrl(settings.logo_url) || logoImg;
  const ar = lang === "ar";
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [heroSlides, setHeroSlides] = useState<{ id: number; url: string; type: string; duration: number; sortOrder: number; videoStart?: number | null; videoEnd?: number | null }[]>([]);
  const [heroTransition, setHeroTransition] = useState<"fade" | "slide" | "zoom" | "dissolve">("fade");
  const [heroActive, setHeroActive] = useState(0);
  const [heroTotal, setHeroTotal] = useState(0);
  const heroGoToRef = useRef<((i: number) => void) | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    apiFetch("/api/hero-slides").then(r => r.json()).then(d => {
      if (Array.isArray(d)) setHeroSlides(d.map(slide => ({ ...slide, url: resolveApiAssetUrl(slide.url) })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (settings.hero_transition) {
      setHeroTransition(settings.hero_transition as any);
    }
  }, [settings.hero_transition]);

  const titleMain = ar
    ? (settings.hero_title_primary_ar || (() => {
        const w = (settings.hero_title_ar || `${t.hero.title1} ${t.hero.title2}`).split(" ");
        return w.slice(0, -1).join(" ");
      })())
    : (settings.hero_title_primary_en || (() => {
        const w = (settings.hero_title_en || `${t.hero.title1} ${t.hero.title2}`).split(" ");
        return w.slice(0, -1).join(" ");
      })());
  const titleHighlight = ar
    ? (settings.hero_title_accent_ar || (() => {
        const w = (settings.hero_title_ar || `${t.hero.title1} ${t.hero.title2}`).split(" ");
        return w[w.length - 1];
      })())
    : (settings.hero_title_accent_en || (() => {
        const w = (settings.hero_title_en || `${t.hero.title1} ${t.hero.title2}`).split(" ");
        return w[w.length - 1];
      })());
  const subtitle = ar
    ? (settings.hero_subtitle_ar || t.hero.subtitle)
    : (settings.hero_subtitle_en || t.hero.subtitle);

  return (
    <section id="hero" className="hero-bg" style={{ paddingTop: "80px", position: "relative", overflow: "hidden" }}>
      <HeroSlider
        slides={heroSlides}
        transition={heroTransition}
        fallbackBgUrl={resolveApiAssetUrl(settings.hero_bg_url)}
        showPagination={settings.show_hero_pagination !== "false"}
        onActiveChange={(a, t) => { setHeroActive(a); setHeroTotal(t); }}
        goToRef={heroGoToRef}
        overlayOpacity={parseFloat(settings.hero_overlay_opacity ?? "0.65")}
      />
      <div style={{ textAlign: "center", padding: "3rem 1.5rem 2rem", zIndex: 1, maxWidth: "860px", margin: "0 auto", position: "relative" }}>
        <FadeInSection>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "50px", padding: "0.35rem 1.1rem", marginBottom: isMobile ? "1rem" : "1.75rem" }}>
            <span style={{ fontSize: "0.7rem" }}>✦</span>
            <span style={{ color: "#C9A84C", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "1px" }}>{t.hero.badge}</span>
            <span style={{ fontSize: "0.7rem" }}>✦</span>
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <div className="animate-float" style={{ marginBottom: isMobile ? "1rem" : "1.75rem" }}>
            <img src={logoSrc} alt="DR Travel" style={{ width: isMobile ? 95 : 120, height: isMobile ? 95 : 120, borderRadius: "50%", objectFit: "cover", margin: "0 auto", display: "block", border: "3px solid rgba(0,170,255,0.6)", boxShadow: "0 0 0 8px rgba(0,170,255,0.08), 0 0 40px rgba(0,170,255,0.35)" }} />
          </div>
        </FadeInSection>

        <FadeInSection delay={200}>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 900, color: "white", marginBottom: "1rem", lineHeight: 1.15, letterSpacing: "-0.5px" }} className="hero-title">
            {titleMain}<br />
            <span style={{ background: "linear-gradient(135deg,#00AAFF,#C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{titleHighlight}</span>
          </h1>
        </FadeInSection>

        <FadeInSection delay={300}>
          <p style={{ fontSize: isMobile ? "0.95rem" : "1.1rem", color: "rgba(255,255,255,0.85)", marginBottom: isMobile ? "1.5rem" : "2.5rem", lineHeight: 1.8 }}>
            {subtitle}
          </p>
        </FadeInSection>

        <FadeInSection delay={400}>
          <div style={{ display: "flex", gap: "0.85rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#packages" onClick={e => { e.preventDefault(); document.querySelector("#packages")?.scrollIntoView({ behavior: "smooth" }); }}
              style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", padding: "0.95rem 2.5rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", boxShadow: "0 8px 28px rgba(0,170,255,0.35)", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 36px rgba(0,170,255,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,170,255,0.35)"; }}>
              {t.hero.cta1}
            </a>
            <button onClick={() => navigate("/trips")}
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", color: "white", padding: "0.95rem 2.5rem", borderRadius: "14px", fontWeight: 700, fontSize: "1rem", fontFamily: "Cairo, sans-serif", cursor: "pointer", transition: "all 0.3s", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.18)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              🗺️ {ar ? "تفاصيل الرحلات" : "Trip Details"}
            </button>
            <button onClick={() => navigate("/gallery")}
              style={{ background: "rgba(201,168,76,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(201,168,76,0.3)", color: "#C9A84C", padding: "0.95rem 2.5rem", borderRadius: "14px", fontWeight: 700, fontSize: "1rem", fontFamily: "Cairo, sans-serif", cursor: "pointer", transition: "all 0.3s", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.2)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(201,168,76,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              📸 {ar ? "الجاليري" : "Gallery"}
            </button>
          </div>
        </FadeInSection>

        {/* Unified bottom stack: pagination dots + scroll indicator */}
        {(settings.show_hero_pagination !== "false" && heroTotal > 1 || settings.show_scroll_indicator !== "false") && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            gap: isMobile ? "16px" : "12px",
            marginTop: isMobile ? "1.25rem" : "2rem",
          }}>
            {/* Pagination dots — in flow, not absolute */}
            {settings.show_hero_pagination !== "false" && heroTotal > 1 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {Array.from({ length: heroTotal }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => heroGoToRef.current?.(i)}
                    style={{
                      width: i === heroActive ? 24 : 8, height: 8, borderRadius: 4, border: "none",
                      background: i === heroActive ? "#00AAFF" : "var(--text-muted)",
                      cursor: "pointer", padding: 0,
                      transition: "all 0.4s ease",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Scroll indicator */}
            {settings.show_scroll_indicator !== "false" && (
              <div style={{ opacity: 0.5 }}>
                <div style={{ width: 28, height: 44, borderRadius: "14px", border: "2px solid var(--text-muted)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6px" }}>
                  <div style={{ width: 4, height: 10, borderRadius: "2px", background: "white", animation: "scrollDot 1.8s ease-in-out infinite" }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="wave-container">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "60px" }}>
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#0D1B2A" />
        </svg>
      </div>
    </section>
  );
}

// ===== STATS =====
function StatsBar() {
  const { t } = useLanguage();
  return (
    <section className="stats-section" style={{ padding: "3rem 1.5rem", position: "relative" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "2rem", position: "relative", zIndex: 1 }}>
        {t.stats.map((stat, i) => (
          <FadeInSection key={i} delay={i * 80}>
            <div style={{ textAlign: "center", color: "#0D1B2A" }}>
              <div style={{ fontSize: "2.25rem", marginBottom: "0.4rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "2.25rem", fontWeight: 900, lineHeight: 1, fontFamily: "Montserrat, sans-serif" }}>
                <AnimatedCounter target={stat.count} locale={t.booking.locale} />
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, opacity: 0.8, marginTop: "0.25rem" }}>{stat.label}</div>
            </div>
          </FadeInSection>
        ))}
      </div>
    </section>
  );
}

// ===== SERVICES =====
function Services() {
  const { t } = useLanguage();
  const { settings, services: dbServices } = useSiteData();
  const { lang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";
  const linkToTrips = settings.services_link_to_trips === "true";
  const detailPagesEnabled = settings.services_detail_pages_enabled !== "false";
  const uniformCards = settings.uniform_home_cards === "true";

  // Use DB services when available; fallback to translations for safety
  const items = dbServices.length > 0
    ? dbServices.map(s => ({
        slug: s.slug,
        icon: s.icon,
        name: ar ? s.titleAr : (s.titleEn || s.titleAr),
        desc: ar ? s.descriptionAr : (s.descriptionEn || s.descriptionAr),
      }))
    : t.services.items.map((s) => ({
        slug: undefined as string | undefined,
        icon: s.icon,
        name: s.name,
        desc: s.desc,
      }));

  const handleServiceClick = (slug?: string) => {
    if (linkToTrips) {
      navigate("/trips");
    } else if (slug && detailPagesEnabled) {
      navigate(`/services/${slug}`);
    } else {
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section id="services" style={{ padding: "6rem 1.5rem", background: "var(--bg-page)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.services.sectionLabel}</div>
            <h2 className="section-title">{t.services.sectionTitle}</h2>
            <p className="section-subtitle">{t.services.sectionSubtitle}</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1.25rem", ...(uniformCards ? { gridAutoRows: "1fr" } : {}) }}>
          {items.map((service, i) => {
            const clickable = linkToTrips || (Boolean(service.slug) && detailPagesEnabled);
            return (
              <FadeInSection key={service.slug ?? i} delay={i * 70} fillHeight={uniformCards}>
                <div
                  className="service-card"
                  onClick={clickable ? () => handleServiceClick(service.slug) : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleServiceClick(service.slug); } } : undefined}
                  role={clickable ? "link" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  style={{
                    ...(clickable ? { cursor: "pointer" } : {}),
                    ...(uniformCards ? { height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" } : {}),
                  }}
                  aria-label={clickable ? service.name : undefined}
                >
                  <div className="service-icon-wrap">{service.icon}</div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.6rem" }}>{service.name}</h3>
                  <p style={{ color: "var(--section-subtitle)", fontSize: "0.875rem", lineHeight: 1.8, ...(uniformCards ? { flex: 1 } : {}) }}>{service.desc}</p>
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===== COMPARE BAR =====
function CompareBar({ packages, onOpen, onClear, lang }: { packages: DisplayPkg[]; onOpen: () => void; onClear: () => void; lang: string }) {
  if (packages.length === 0) return null;
  const ar = lang === "ar";
  return (
    <div style={{ position: "fixed", bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 990, background: "var(--navbar-mobile)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--border)", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem", flexShrink: 0 }}>
          {ar ? `${packages.length} باقات للمقارنة` : `${packages.length} packages to compare`}
        </span>
        {packages.map(p => (
          <span key={p.id} style={{ background: `${p.color}15`, border: `1px solid ${p.color}30`, color: p.color, padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.78rem", fontWeight: 700 }}>
            {p.icon} {p.name}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
        <button onClick={onClear}
          style={{ background: "transparent", border: "1px solid var(--border-strong)", color: "var(--text-primary)", padding: "0.55rem 1rem", borderRadius: "10px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
          {ar ? "مسح" : "Clear"}
        </button>
        <button onClick={onOpen}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.55rem 1.5rem", borderRadius: "10px", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.88rem" }}>
          {ar ? "قارن الآن" : "Compare Now"}
        </button>
      </div>
    </div>
  );
}

// ===== PACKAGES + BOOKING =====
function PackagesAndBooking() {
  const { t, lang } = useLanguage();
  const { currency } = useCurrency();
  const { packages: dbPackages, settings } = useSiteData();
  const showCompareFeature = settings.show_compare_feature !== "false";
  const [, navigate] = useLocation();

  const allDbPkgs = dbPackages.length > 0 ? dbPackages : (PACKAGES_DATA as unknown as DBPackage[]);
  const PACKAGES: DisplayPkg[] = allDbPkgs.map(p => dbPkgToDisplay(p, lang, currency, settings));

  const [selectedPkg, setSelectedPkg] = useState<DisplayPkg | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", date: "", adults: "1", children: "0", infants: "0", notes: "", referralCode: "", promoCode: "" });
  const [referralStatus, setReferralStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [referralName, setReferralName] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [promoInfo, setPromoInfo] = useState<{ discount: number; finalAmount: number; error?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [showPackages, setShowPackages] = useState(false);
  const [pkgAnimKey, setPkgAnimKey] = useState(0);
  const bookingRef = useRef<HTMLDivElement>(null);
  const packagesRef = useRef<HTMLDivElement>(null);

  const handleShowPackages = () => {
    if (!showPackages) {
      setShowPackages(true);
      setPkgAnimKey(k => k + 1);
      setTimeout(() => {
        packagesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 80);
    } else {
      setShowPackages(false);
      setSelectedPkg(null);
    }
  };

  const toggleCompare = (pkgId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompareIds(prev =>
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : prev.length < 3 ? [...prev, pkgId] : prev
    );
  };

  const viewDetails = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/packages/${slug}`);
  };

  const comparePkgData = compareIds
    .map(id => allDbPkgs.find(pkg => pkg.id === id))
    .filter((pkg): pkg is DBPackage => Boolean(pkg));
  const compareDisplayPackages = compareIds
    .map(id => PACKAGES.find(pkg => pkg.id === id))
    .filter((pkg): pkg is DisplayPkg => Boolean(pkg));

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setSelectedPkg(null); }, [lang]);

  /* ── Referral code debounced verify ── */
  useEffect(() => {
    const code = form.referralCode.trim().toUpperCase();
    if (!code) { setReferralStatus("idle"); setReferralName(""); return; }
    if (code.length < 4) return;
    setReferralStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch(`/api/referral/verify?code=${encodeURIComponent(code)}`);
        if (r.ok) {
          const data = await r.json();
          setReferralStatus("valid");
          setReferralName(lang === "ar" ? data.nameAr : (data.nameEn || data.nameAr));
        } else { setReferralStatus("invalid"); setReferralName(""); }
      } catch { setReferralStatus("invalid"); setReferralName(""); }
    }, 600);
    return () => clearTimeout(t);
  }, [form.referralCode, lang]);

  /* ── Promo code debounced verify ── */
  useEffect(() => {
    const code = form.promoCode.trim().toUpperCase();
    if (!code) { setPromoStatus("idle"); setPromoInfo(null); return; }
    if (code.length < 3) return;
    const baseAmount = selectedPkg ? selectedPkg.priceNum * (parseInt(form.adults) || 1) : 0;
    setPromoStatus("checking");
    const tm = setTimeout(async () => {
      try {
        const r = await apiFetch("/api/promo-codes/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, packageId: selectedPkg?.id, baseAmount }),
        });
        const data = await r.json();
        if (data.valid) {
          setPromoStatus("valid");
          setPromoInfo({ discount: data.discount, finalAmount: data.finalAmount });
        } else {
          setPromoStatus("invalid");
          setPromoInfo({ discount: 0, finalAmount: baseAmount, error: data.error });
        }
      } catch { setPromoStatus("invalid"); setPromoInfo(null); }
    }, 500);
    return () => clearTimeout(tm);
  }, [form.promoCode, selectedPkg?.id, form.adults]);

  const today = new Date().toISOString().split("T")[0];
  const bk = t.booking;
  const estimatedPrice = selectedPkg ? selectedPkg.priceNum * (parseInt(form.adults) || 1) : 0;

  // Abandoned-cart tracking: stable session key + debounced POST when form has phone or name
  const sessionKeyRef = useRef<string>("");
  if (!sessionKeyRef.current) {
    try {
      const k = sessionStorage.getItem("drt_cart_session");
      if (k && k.length >= 8) sessionKeyRef.current = k;
      else {
        const nk = "drt-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
        sessionStorage.setItem("drt_cart_session", nk);
        sessionKeyRef.current = nk;
      }
    } catch { sessionKeyRef.current = "drt-" + Math.random().toString(36).slice(2, 12); }
  }
  useEffect(() => {
    if (!selectedPkg) return;
    if (!form.phone.trim() && !form.name.trim()) return;
    const t = setTimeout(() => {
      apiFetch("/api/abandoned-carts/track", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey: sessionKeyRef.current,
          name: form.name, phone: form.phone,
          packageId: selectedPkg.id,
          packageName: selectedPkg.titleAr || selectedPkg.name || "",
          date: form.date,
          adults: parseInt(form.adults) || 1,
          children: parseInt(form.children) || 0,
          estimatedValue: estimatedPrice || 0,
        }),
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [form.name, form.phone, form.date, form.adults, form.children, selectedPkg?.id, estimatedPrice]);


  const selectPkg = (pkg: DisplayPkg) => {
    if (selectedPkg?.id === pkg.id) { setSelectedPkg(null); return; }
    setSelectedPkg(pkg);
    setTimeout(() => bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = bk.errors.nameRequired;
    if (!form.phone.trim()) e.phone = bk.errors.phoneRequired;
    else if (!/^01[0-9]{9}$/.test(form.phone.replace(/\s/g, ""))) e.phone = bk.errors.phoneInvalid;
    if (!selectedPkg) e.pkg = bk.errors.pkgRequired;
    if (!form.date) e.date = bk.errors.dateRequired;
    if (!form.adults || parseInt(form.adults) < 1) e.adults = bk.errors.adultsRequired;
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      try {
        const r = await apiFetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name, phone: form.phone,
            packageId: selectedPkg?.id,
            packageName: selectedPkg?.name ?? "",
            packageNameAr: selectedPkg?.titleAr ?? selectedPkg?.name ?? "",
            date: form.date, adults: form.adults,
            children: form.children, infants: form.infants,
            notes: form.notes, currency: "EGP",
            priceAtBooking: estimatedPrice || null,
            referralCode: referralStatus === "valid" ? form.referralCode.trim().toUpperCase() : undefined,
            promoCode: promoStatus === "valid" ? form.promoCode.trim().toUpperCase() : undefined,
            sessionKey: sessionKeyRef.current,
          }),
        });
        if (r.status === 409) {
          const data = await r.json().catch(() => ({}));
          if (data.error === "CAPACITY_FULL") {
            const join = window.confirm(
              lang === "ar"
                ? `للأسف هذا التاريخ ممتلئ (${data.bookedSeats || 0}/${data.maxSeats || 0}). هل ترغب في الانضمام لقائمة الانتظار؟ سنخطرك فور توفر مقاعد.`
                : `This date is full (${data.bookedSeats || 0}/${data.maxSeats || 0}). Would you like to join the waitlist? We'll notify you when seats open up.`
            );
            if (join) {
              const wr = await apiFetch("/api/waitlist", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: form.name, phone: form.phone,
                  packageId: selectedPkg?.id, packageName: selectedPkg?.name ?? "",
                  date: form.date,
                  groupSize: (parseInt(form.adults) || 1) + (parseInt(form.children) || 0),
                  notes: form.notes,
                }),
              });
              alert(wr.ok
                ? (lang === "ar" ? "✅ تم تسجيلك في قائمة الانتظار. سنتواصل معك قريباً." : "✅ You've been added to the waitlist. We'll contact you soon.")
                : (lang === "ar" ? "حدث خطأ، يرجى المحاولة مرة أخرى." : "Error, please try again."));
            }
            return;
          }
        }
        setShowModal(true);
      } catch {
        setShowModal(true);
      }
    }
  };

  const waMessage = encodeURIComponent(
    bk.waMessage(
      selectedPkg?.name ?? "",
      form.name, form.phone, form.date,
      form.adults, form.children, form.infants, form.notes
    )
  );

  const inp = (field: string) => ({ className: `form-input${errors[field] ? " error" : ""}` });
  const labelStyle = { display: "block" as const, color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" };

  return (
    <section id="packages" style={{ padding: `6rem 1.5rem ${showPackages ? "6rem" : "2.5rem"}`, background: "linear-gradient(180deg, var(--bg-page-2) 0%, var(--bg-page) 100%)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: showPackages ? "3.5rem" : "1.5rem" }}>
            <div className="section-label">{t.packages.sectionLabel}</div>
            <h2 className="section-title">{t.packages.sectionTitle}</h2>
            <p className="section-subtitle">{t.packages.sectionSubtitle}</p>

            {/* Show / Hide Packages CTA */}
            <div style={{ marginTop: "2rem" }}>
              <button className={`show-pkg-btn ${showPackages ? "hide" : "show"}`} onClick={handleShowPackages}>
                {showPackages
                  ? <>{lang === "ar" ? "⬆ إخفاء الباقات" : "⬆ Hide Packages"}</>
                  : <>{lang === "ar" ? "⬇ عرض الباقات" : "⬇ Show Packages"}</>
                }
              </button>
              {!showPackages && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.85rem" }}>
                  {lang === "ar" ? `${PACKAGES.length} باقات متاحة — اضغط لاستعراضها` : `${PACKAGES.length} packages available — click to explore`}
                </p>
              )}
            </div>
          </div>
        </FadeInSection>

        {/* Package cards — wrapped in animated reveal container */}
        <div ref={packagesRef} className={`pkg-grid-wrap ${showPackages ? "pkg-visible" : "pkg-hidden"}`}>
          <div key={pkgAnimKey} className="pkg-grid">
          {PACKAGES.map((pkg, i) => {
            const inCompare = compareIds.includes(pkg.id);
            const whyTrip = lang === "ar" ? pkg.whyThisTripAr : pkg.whyThisTripEn;
            return (
              <div key={pkg.id} className="pkg-card-anim" style={{ animationDelay: `${i * 75}ms` }}>
                <div
                  role={pkg.slug ? "link" : undefined}
                  tabIndex={pkg.slug ? 0 : undefined}
                  onClick={() => { if (pkg.slug) navigate(`/packages/${pkg.slug}`); }}
                  onKeyDown={e => { if (pkg.slug && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); navigate(`/packages/${pkg.slug}`); } }}
                  className={`pkg-card${pkg.featured ? " featured" : ""}${selectedPkg?.id === pkg.id ? " selected" : ""}`}
                  style={{ cursor: pkg.slug ? "pointer" : "default" }}>
                  {pkg.badge && (
                    <div style={{ position: "absolute", top: "1rem", insetInlineStart: "1rem", background: pkg.badgeColor!, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 800 }}>
                      {pkg.badge}
                    </div>
                  )}
                  {selectedPkg?.id === pkg.id && (
                    <div style={{ position: "absolute", top: "1rem", insetInlineEnd: "1rem", width: 26, height: 26, borderRadius: "50%", background: pkg.featured ? "#C9A84C" : "#00AAFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <CheckIcon />
                    </div>
                  )}
                  <div style={{ paddingTop: pkg.badge ? "1.75rem" : "0.25rem", textAlign: "center", marginBottom: "1.25rem" }}>
                    <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>{pkg.icon}</div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.4rem" }}>{pkg.name}</h3>
                    <p style={{ color: "var(--section-subtitle)", fontSize: "0.82rem", lineHeight: 1.6 }}>{pkg.desc}</p>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {pkg.includes.map((item, j) => (
                      <li key={j} style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: pkg.featured ? "#C9A84C" : "#00AAFF", flexShrink: 0, display: "flex" }}><CheckIcon /></span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Why this trip — mini */}
                  {whyTrip.length > 0 && (
                    <div style={{ background: "var(--bg-surface-sunk)", borderRadius: "10px", padding: "0.65rem 0.85rem", marginBottom: "1rem" }}>
                      <div style={{ color: pkg.featured ? "#C9A84C" : "#00AAFF", fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                        {lang === "ar" ? "لماذا هذه الرحلة؟" : "Why this trip?"}
                      </div>
                      {whyTrip.slice(0, 2).map((w, wi) => (
                        <div key={wi} style={{ color: "var(--section-subtitle)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.2rem" }}>
                          <span style={{ fontSize: "0.8rem" }}>{w.icon}</span> {w.text}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pkg-card__footer" style={{ borderTop: "1px solid var(--bg-surface-2)", paddingTop: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div>
                        {pkg.showDuration && pkg.duration && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: pkg.featured ? "rgba(201,168,76,0.14)" : "rgba(0,170,255,0.12)", border: `1px solid ${pkg.featured ? "rgba(201,168,76,0.35)" : "rgba(0,170,255,0.3)"}`, color: pkg.featured ? "#C9A84C" : "#00AAFF", fontSize: "0.78rem", fontWeight: 800, padding: "0.25rem 0.65rem", borderRadius: "50px", marginBottom: "0.4rem" }}>📅 {pkg.duration}</div>
                        )}
                        <div style={{ color: pkg.featured ? "#C9A84C" : "#00AAFF", fontSize: "0.95rem", fontWeight: 800 }}>
                          {formatPrice(pkg.priceNum, currency as CurrencyCode, lang, settings)}
                        </div>
                      </div>
                      <button onClick={e => { e.stopPropagation(); selectPkg(pkg); }} style={{ background: selectedPkg?.id === pkg.id ? (pkg.featured ? "#C9A84C" : "linear-gradient(135deg,#00AAFF,#0086C9)") : "var(--bg-surface-2)", color: selectedPkg?.id === pkg.id ? (pkg.featured ? "#0D1B2A" : "white") : "var(--text-primary)", border: `1.5px solid ${selectedPkg?.id === pkg.id ? "transparent" : "var(--border-strong)"}`, borderRadius: "12px", padding: "0.85rem 1.6rem", fontSize: "0.95rem", fontWeight: 800, transition: "all 0.3s", cursor: "pointer", fontFamily: "Cairo, sans-serif", boxShadow: selectedPkg?.id === pkg.id ? "0 8px 22px rgba(0,170,255,0.35)" : "none", minWidth: 120 }}>
                        {selectedPkg?.id === pkg.id ? t.packages.selectedBtn : t.packages.selectBtn}
                      </button>
                    </div>
                    {/* Action buttons row */}
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {pkg.slug && (
                        <button onClick={e => viewDetails(pkg.slug, e)}
                          style={{ flex: 1, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "0.45rem 0.5rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "Cairo, sans-serif", fontWeight: 600, transition: "all 0.2s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                          🔍 {lang === "ar" ? "التفاصيل" : "Details"}
                        </button>
                      )}
                      <button onClick={e => toggleCompare(pkg.id, e)}
                        style={{ flex: 1, background: inCompare ? `${pkg.color}20` : "var(--bg-surface)", border: `1px solid ${inCompare ? `${pkg.color}50` : "var(--border)"}`, color: inCompare ? pkg.color : "var(--text-secondary)", padding: "0.45rem 0.5rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.75rem", fontFamily: "Cairo, sans-serif", fontWeight: 600, transition: "all 0.2s" }}>
                        {inCompare ? "✓" : "⇆"} {lang === "ar" ? "قارن" : "Compare"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Booking panel */}
        <div id="booking" ref={bookingRef} className={`booking-panel ${selectedPkg ? "open" : "closed"}`}>
          <div style={{ marginTop: "2rem", background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.15)", borderRadius: "20px", padding: isMobile ? "1.25rem" : "2.5rem" }}>
            {selectedPkg && (
              <>
                {/* Panel header */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--bg-surface-2)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "14px", background: `${selectedPkg.color}15`, border: `1px solid ${selectedPkg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                    {selectedPkg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "var(--section-subtitle)", fontSize: "0.78rem", marginBottom: "0.2rem" }}>{bk.selectedPackage}</div>
                    <div style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: "1.1rem" }}>{selectedPkg.name}</div>
                    <div style={{ color: selectedPkg.color, fontSize: "0.85rem", fontWeight: 700 }}>{selectedPkg.price}</div>
                  </div>
                  <button onClick={() => setSelectedPkg(null)}
                    style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", color: "var(--section-subtitle)", width: 36, height: 36, borderRadius: "10px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,100,100,0.15)"; (e.currentTarget as HTMLElement).style.color = "#ff6b6b"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; (e.currentTarget as HTMLElement).style.color = "var(--section-subtitle)"; }}>
                    ✕
                  </button>
                </div>

                {/* Form + Summary */}
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: isMobile ? "1.5rem" : "2rem", alignItems: "start" }}>
                  <form onSubmit={handleSubmit} noValidate style={{ display: "grid", gap: "1rem" }}>
                    {/* Name + Phone */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.85rem" }}>
                      <div>
                        <label style={labelStyle}>{bk.nameFull}</label>
                        <input type="text" {...inp("name")} placeholder={bk.namePlaceholder} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        {errors.name && <p style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{errors.name}</p>}
                      </div>
                      <div>
                        <label style={labelStyle}>{bk.phone}</label>
                        <input type="tel" {...inp("phone")} placeholder={bk.phonePlaceholder} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                        {errors.phone && <p style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label style={labelStyle}>{bk.date}</label>
                      <DatePicker
                        value={form.date}
                        onChange={v => setForm({ ...form, date: v })}
                        min={today}
                        lang={lang as "ar" | "en"}
                        hasError={!!errors.date}
                      />
                      {errors.date && <p style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.3rem" }}>{errors.date}</p>}
                    </div>

                    {/* People */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.75rem" }}>
                      {[
                        { label: bk.adults, key: "adults", min: "1" },
                        { label: bk.children, key: "children", min: "0" },
                        { label: bk.infants, key: "infants", min: "0" },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>{f.label}</label>
                          <input type="number" min={f.min} {...inp(f.key)} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                          {errors[f.key] && <p style={{ color: "#ff6b6b", fontSize: "0.72rem", marginTop: "0.25rem" }}>{errors[f.key]}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={labelStyle}>{bk.notes}</label>
                      <textarea className="form-input" style={{ minHeight: "90px", resize: "vertical" as const }} placeholder={bk.notesPlaceholder}
                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    {/* Referral code */}
                    <div>
                      <label style={labelStyle}>{lang === "ar" ? "كود الإحالة (اختياري)" : "Referral Code (optional)"}</label>
                      <div style={{ position: "relative" }}>
                        <input className="form-input"
                          style={{ fontFamily: "Montserrat, monospace", letterSpacing: "2px", fontWeight: 700, fontSize: "0.95rem",
                            borderColor: referralStatus === "valid" ? "#10B981" : referralStatus === "invalid" ? "#EF4444" : undefined,
                            color: referralStatus === "valid" ? "#10B981" : undefined,
                            paddingInlineEnd: referralStatus !== "idle" ? "2.5rem" : undefined }}
                          placeholder="DRT-XXXXXX"
                          value={form.referralCode}
                          onChange={e => setForm({ ...form, referralCode: e.target.value.toUpperCase() })} />
                        {referralStatus === "checking" && (
                          <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--section-subtitle)", fontSize: "0.75rem" }}>⏳</span>
                        )}
                        {referralStatus === "valid" && (
                          <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#10B981", fontSize: "1rem" }}>✓</span>
                        )}
                        {referralStatus === "invalid" && (
                          <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#EF4444", fontSize: "1rem" }}>✗</span>
                        )}
                      </div>
                      {referralStatus === "valid" && referralName && (
                        <p style={{ color: "#10B981", fontSize: "0.75rem", marginTop: "0.3rem" }}>
                          ✅ {lang === "ar" ? `كود صحيح — إحالة ${referralName}` : `Valid code — ${referralName}'s referral`}
                        </p>
                      )}
                      {referralStatus === "invalid" && (
                        <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.3rem" }}>
                          {lang === "ar" ? "كود غير صحيح أو غير مفعّل" : "Invalid or inactive code"}
                        </p>
                      )}
                    </div>

                    {/* Promo / discount code */}
                    <div>
                      <label style={labelStyle}>{lang === "ar" ? "كود خصم (اختياري)" : "Promo Code (optional)"}</label>
                      <div style={{ position: "relative" }}>
                        <input className="form-input"
                          style={{ fontFamily: "Montserrat, monospace", letterSpacing: "2px", fontWeight: 700, fontSize: "0.95rem",
                            borderColor: promoStatus === "valid" ? "#10B981" : promoStatus === "invalid" ? "#EF4444" : undefined,
                            color: promoStatus === "valid" ? "#10B981" : undefined,
                            paddingInlineEnd: promoStatus !== "idle" ? "2.5rem" : undefined }}
                          placeholder="SUMMER20"
                          value={form.promoCode}
                          onChange={e => setForm({ ...form, promoCode: e.target.value.toUpperCase() })} />
                        {promoStatus === "checking" && <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--section-subtitle)", fontSize: "0.75rem" }}>⏳</span>}
                        {promoStatus === "valid" && <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#10B981", fontSize: "1rem" }}>✓</span>}
                        {promoStatus === "invalid" && <span style={{ position: "absolute", insetInlineEnd: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#EF4444", fontSize: "1rem" }}>✗</span>}
                      </div>
                      {promoStatus === "valid" && promoInfo && (
                        <p style={{ color: "#10B981", fontSize: "0.78rem", marginTop: "0.3rem", fontWeight: 700 }}>
                          ✅ {lang === "ar" ? `خصم ${promoInfo.discount.toLocaleString("ar-EG")} ج.م — السعر النهائي ${promoInfo.finalAmount.toLocaleString("ar-EG")} ج.م` : `Discount EGP ${promoInfo.discount} — Final EGP ${promoInfo.finalAmount}`}
                        </p>
                      )}
                      {promoStatus === "invalid" && promoInfo?.error && (
                        <p style={{ color: "#EF4444", fontSize: "0.75rem", marginTop: "0.3rem" }}>{promoInfo.error}</p>
                      )}
                    </div>

                    {/* Submit */}
                    <button type="submit"
                      style={{ background: `linear-gradient(135deg, ${selectedPkg.color}, ${selectedPkg.color}bb)`, color: selectedPkg.featured ? "#0D1B2A" : "white", border: "none", padding: "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", boxShadow: `0 8px 24px ${selectedPkg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 32px ${selectedPkg.color}55`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${selectedPkg.color}40`; }}>
                      <WhatsAppIcon /> {bk.submitBtn}
                    </button>
                  </form>

                  {/* Summary sidebar */}
                  <div style={{ width: isMobile ? "100%" : "210px", background: "var(--bg-surface)", border: "1px solid var(--bg-surface-2)", borderRadius: "16px", padding: "1.25rem" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase" as const, letterSpacing: "1px" }}>{bk.summaryTitle}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {selectedPkg.includes.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                          <span style={{ color: selectedPkg.color, flexShrink: 0, display: "flex" }}><CheckIcon /></span>
                          {item}
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid var(--bg-surface-2)", marginTop: "1.25rem", paddingTop: "1.25rem" }}>
                      {selectedPkg.showDuration && selectedPkg.duration && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: `${selectedPkg.color}1f`, border: `1px solid ${selectedPkg.color}55`, color: selectedPkg.color, fontSize: "0.78rem", fontWeight: 800, padding: "0.3rem 0.7rem", borderRadius: "50px", marginBottom: "0.6rem" }}>📅 {selectedPkg.duration}</div>
                      )}
                      {estimatedPrice > 0 && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <div style={{ color: "var(--section-subtitle)", fontSize: "0.72rem", marginBottom: "0.25rem" }}>{bk.estimatedPrice}</div>
                          <div style={{ color: selectedPkg.color, fontSize: "1.3rem", fontWeight: 900, fontFamily: "Montserrat, sans-serif" }}>
                            {formatPrice(estimatedPrice, currency as CurrencyCode, lang, settings)}
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.2rem" }}>{bk.priceNote}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compare bar */}
      {showCompareFeature && <CompareBar packages={compareDisplayPackages} onOpen={() => setShowCompare(true)} onClear={() => setCompareIds([])} lang={lang} />}

      {/* Compare modal */}
      {showCompare && comparePkgData.length > 0 && (
        <CompareModal packages={comparePkgData} onClose={() => setShowCompare(false)}
          onBook={(pkg) => { setShowCompare(false); const tpkg = PACKAGES.find(p => p.id === pkg.id); if (tpkg) selectPkg(tpkg); }} />
      )}

      {/* Success modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>{bk.modal.emoji}</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>{bk.modal.title}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem", lineHeight: 1.8 }}>
              {bk.modal.thankYou} <strong style={{ color: "var(--text-primary)" }}>{form.name}</strong>!<br />
              {bk.modal.msg} <strong style={{ color: "#00AAFF" }}>{form.phone}</strong> {bk.modal.within}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
              <a href={`https://wa.me/201205756024?text=${waMessage}`} target="_blank" rel="noreferrer"
                style={{ background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "1rem", borderRadius: "14px", fontWeight: 700, textDecoration: "none", fontSize: "1rem", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <WhatsAppIcon /> {bk.modal.confirmBtn}
              </a>
              <button onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "1px solid var(--border-strong)", color: "var(--section-subtitle)", padding: "0.8rem", borderRadius: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLElement).style.color = "var(--section-subtitle)"; }}>
                {bk.modal.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ===== WHY US =====
function WhyUs() {
  const { t, lang } = useLanguage();
  const { whyUsCards, settings } = useSiteData();
  const [, navigate] = useLocation();
  const isAr = lang === "ar";
  const uniformCards = settings.uniform_home_cards === "true";

  const items = whyUsCards
    .filter(c => c.isActive)
    .map(c => ({
      slug: c.slug,
      icon: c.icon,
      color: c.color,
      title: isAr ? c.titleAr : (c.titleEn || c.titleAr),
      desc: isAr ? c.shortDescAr : (c.shortDescEn || c.shortDescAr),
    }));

  if (items.length === 0) return null;

  return (
    <section id="whyus" style={{ padding: "6rem 1.5rem", background: "var(--bg-page)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.whyUs.sectionLabel}</div>
            <h2 className="section-title">{(settings.brand_short_name && settings.brand_short_name !== "DR Travel") ? t.whyUs.sectionTitle.split("DR Travel").join(settings.brand_short_name) : t.whyUs.sectionTitle}</h2>
            <p className="section-subtitle">{t.whyUs.sectionSubtitle}</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1.25rem", ...(uniformCards ? { gridAutoRows: "1fr" } : {}) }}>
          {items.map((f, i) => {
            const clickable = !!f.slug;
            const onClick = clickable ? () => { navigate(`/why-us/${f.slug}`); window.scrollTo({ top: 0 }); } : undefined;
            return (
              <FadeInSection key={f.slug || i} delay={i * 70} fillHeight={uniformCards}>
                <div
                  className="why-card"
                  onClick={onClick}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
                  style={{
                    position: "relative", overflow: "hidden",
                    cursor: clickable ? "pointer" : "default",
                    transition: "transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease",
                    ...(uniformCards ? { height: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box" } : {}),
                  }}
                  onMouseEnter={clickable ? (e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 18px 40px ${f.color}25`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${f.color}55`;
                  } : undefined}
                  onMouseLeave={clickable ? (e) => {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "";
                    (e.currentTarget as HTMLElement).style.borderColor = "";
                  } : undefined}
                >
                  <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: `${f.color}08`, border: `1px solid ${f.color}15` }} />
                  <div style={{ width: 56, height: 56, borderRadius: "14px", background: `${f.color}10`, border: `1px solid ${f.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: "1rem", position: "relative" }}>
                    {f.icon}
                  </div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.6rem" }}>{f.title}</h3>
                  <p style={{ color: "var(--section-subtitle)", fontSize: "0.85rem", lineHeight: 1.8, ...(uniformCards ? { flex: 1 } : {}) }}>{f.desc}</p>
                  {clickable && (
                    <div style={{ marginTop: "1rem", color: f.color, fontSize: "0.82rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem", ...(uniformCards ? { alignSelf: "flex-start" } : {}) }}>
                      {isAr ? "اعرف أكتر" : "Learn more"} {isAr ? "←" : "→"}
                    </div>
                  )}
                </div>
              </FadeInSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===== REVIEWS =====
function ReviewCard({ review, colorIndex }: { review: { name: string; initials: string; avatarUrl?: string; image?: string; review: string; stars: number }; colorIndex: number }) {
  const stars = Math.max(1, Math.min(5, review.stars || 5));
  const imgSrc = review.image ? resolveApiAssetUrl(review.image) || review.image : "";
  const avatarSrc = review.avatarUrl ? resolveApiAssetUrl(review.avatarUrl) || review.avatarUrl : "";
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "18px", padding: "1.35rem 1.5rem", minWidth: "280px", maxWidth: "340px", flexShrink: 0, transition: "all 0.3s", display: "flex", flexDirection: "column", gap: "0.85rem" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.3)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,170,255,0.14)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-surface-2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {avatarSrc ? (
          <img src={avatarSrc} alt={review.name}
            style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "2px solid var(--border-strong)" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            {review.initials}
          </div>
        )}
        <div>
          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.92rem", marginBottom: "0.2rem" }}>{review.name}</div>
          <div style={{ display: "flex", gap: "1px" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: i < stars ? "#C9A84C" : "#2a3a4a", fontSize: "0.85rem" }}>★</span>
            ))}
          </div>
        </div>
      </div>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.9, margin: 0, fontStyle: "italic" }}>"{review.review}"</p>
      {imgSrc && (
        <img src={imgSrc} alt=""
          style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}
    </div>
  );
}

// ===== PUBLIC REVIEW SUBMIT FORM =====
function ReviewSubmitForm() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Revoke any blob: object URL when preview changes or component unmounts to avoid memory leaks.
  useEffect(() => {
    return () => { if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const clearPreview = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setImageUrl("");
  };

  const reset = () => {
    setName(""); setText(""); setRating(5); setHoverRating(0);
    clearPreview(); setError(""); setDone(false);
  };

  const closeModal = () => { setOpen(false); setTimeout(reset, 300); };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp)$/i.test(file.type)) {
      setError(ar ? "صور JPG / PNG / WEBP فقط" : "JPG / PNG / WEBP only");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(ar ? "حجم الصورة كبير جداً (الحد 8 MB)" : "Image too large (max 8 MB)");
      return;
    }
    setError("");
    setUploading(true);
    if (imagePreview && imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
    try {
      const r = await apiFetch("/api/testimonials/upload", {
        method: "POST",
        headers: { "Content-Type": file.type, "x-content-type": file.type },
        body: file,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || (ar ? "فشل رفع الصورة" : "Upload failed"));
      }
      const data = await r.json();
      setImageUrl(data.proxyUrl || data.url || "");
    } catch (e: any) {
      setError(e.message || (ar ? "فشل رفع الصورة" : "Upload failed"));
      setImagePreview("");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!name.trim()) { setError(ar ? "الاسم مطلوب" : "Name is required"); return; }
    if (text.trim().length < 8) { setError(ar ? "اكتب رأيك بشكل أوسع شوية" : "Tell us a bit more"); return; }
    setError("");
    setSubmitting(true);
    try {
      const body: any = ar
        ? { nameAr: name.trim(), textAr: text.trim(), rating, imageUrl }
        : { nameAr: name.trim(), nameEn: name.trim(), textAr: text.trim(), textEn: text.trim(), rating, imageUrl };
      const r = await apiFetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || (ar ? "فشل إرسال التقييم" : "Submission failed"));
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message || (ar ? "فشل الإرسال" : "Submission failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginTop: "2rem", paddingInline: "1.5rem" }}>
        <button onClick={() => setOpen(true)}
          style={{ background: "linear-gradient(135deg,#C9A84C,#a8842c)", color: "#0D1B2A", border: "none", borderRadius: "999px", padding: "0.85rem 2rem", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 8px 24px rgba(201,168,76,0.35)", transition: "transform 0.2s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
          ✍️ {ar ? "اكتب رأيك" : "Write a review"}
        </button>
      </div>

      {open && (
        <div onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(6px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", direction: ar ? "rtl" : "ltr" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--bg-surface-solid)", border: "1px solid var(--border-strong)", borderRadius: 22, padding: "1.75rem", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 30px 60px rgba(0,0,0,0.6)", fontFamily: "Cairo, sans-serif" }}>

            {done ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
                <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎉</div>
                <h3 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.2rem", marginBottom: "0.6rem" }}>
                  {ar ? "شكراً لك!" : "Thank you!"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                  {ar ? "تم استلام تقييمك وسيظهر بعد الموافقة عليه من إدارة الموقع." : "Your review has been received and will appear once approved by our team."}
                </p>
                <button onClick={closeModal}
                  style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 1.75rem", fontFamily: "Cairo, sans-serif", fontWeight: 700, cursor: "pointer", fontSize: "0.92rem" }}>
                  {ar ? "إغلاق" : "Close"}
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                  <h3 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.15rem", margin: 0 }}>
                    ✍️ {ar ? "شاركنا تجربتك" : "Share your experience"}
                  </h3>
                  <button onClick={closeModal}
                    style={{ background: "var(--border)", border: "1px solid var(--border-strong)", color: "var(--text-secondary)", borderRadius: 8, padding: "0.3rem 0.7rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
                    ✕
                  </button>
                </div>

                {/* Stars */}
                <div style={{ marginBottom: "1.1rem" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>
                    {ar ? "كم نجمة تستاهل تجربتك؟" : "How many stars?"}
                  </label>
                  <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", padding: "0.5rem" }}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} type="button"
                        onMouseEnter={() => setHoverRating(n)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(n)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "2.2rem", lineHeight: 1, transition: "transform 0.15s" }}>
                        <span style={{ color: n <= (hoverRating || rating) ? "#C9A84C" : "#2a3a4a", textShadow: n <= (hoverRating || rating) ? "0 0 12px rgba(201,168,76,0.5)" : "none", display: "inline-block", transform: n <= (hoverRating || rating) ? "scale(1.05)" : "scale(1)" }}>★</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                    {ar ? "اسمك" : "Your name"} *
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} maxLength={80}
                    placeholder={ar ? "اكتب اسمك..." : "Your name..."}
                    style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, border: "1.5px solid var(--input-border)", outline: "none", fontFamily: "Cairo, sans-serif", fontSize: "0.92rem", background: "var(--input-bg)", color: "var(--input-text)", boxSizing: "border-box" }} />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                    {ar ? "رأيك في الرحلة" : "Your review"} *
                  </label>
                  <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1500} rows={5}
                    placeholder={ar ? "احكي لنا عن تجربتك..." : "Tell us about your experience..."}
                    style={{ width: "100%", padding: "0.7rem 0.9rem", borderRadius: 10, border: "1.5px solid var(--input-border)", outline: "none", fontFamily: "Cairo, sans-serif", fontSize: "0.92rem", background: "var(--input-bg)", color: "var(--input-text)", boxSizing: "border-box", resize: "vertical", lineHeight: 1.8 }} />
                  <div style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginTop: "0.25rem", textAlign: ar ? "left" : "right" }}>
                    {text.length} / 1500
                  </div>
                </div>

                <div style={{ marginBottom: "1.1rem" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                    {ar ? "صورة من الرحلة (اختياري)" : "Photo from your trip (optional)"}
                  </label>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {imagePreview ? (
                    <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
                      <img src={imagePreview} alt="preview"
                        style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border-strong)" }} />
                      <button type="button"
                        onClick={clearPreview}
                        style={{ position: "absolute", top: 8, [ar ? "left" : "right"]: 8, background: "rgba(0,0,0,0.7)", color: "white", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontWeight: 900 }}>
                        ✕
                      </button>
                      {uploading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                          ⏳ {ar ? "جاري الرفع..." : "Uploading..."}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                      style={{ width: "100%", padding: "1rem", borderRadius: 12, border: "1.5px dashed var(--border-strong)", background: "var(--bg-surface)", color: "var(--text-secondary)", cursor: uploading ? "wait" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.9rem" }}>
                      {uploading ? `⏳ ${ar ? "جاري الرفع..." : "Uploading..."}` : `📸 ${ar ? "اضغط لاختيار صورة" : "Tap to choose a photo"}`}
                    </button>
                  )}
                </div>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "0.7rem 1rem", marginBottom: "1rem", color: "#FCA5A5", fontSize: "0.85rem", fontWeight: 600 }}>
                    ⚠️ {error}
                  </div>
                )}

                <button onClick={submit} disabled={submitting || uploading}
                  style={{ width: "100%", background: submitting ? "var(--border)" : "linear-gradient(135deg,#C9A84C,#a8842c)", color: submitting ? "var(--text-muted)" : "#0D1B2A", border: "none", borderRadius: 12, padding: "0.95rem", cursor: submitting ? "wait" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 900, fontSize: "1rem", boxShadow: submitting ? "none" : "0 8px 24px rgba(201,168,76,0.3)" }}>
                  {submitting ? `⏳ ${ar ? "جاري الإرسال..." : "Submitting..."}` : `🚀 ${ar ? "إرسال التقييم" : "Submit review"}`}
                </button>
                <div style={{ color: "var(--text-muted)", fontSize: "0.74rem", textAlign: "center", marginTop: "0.85rem", lineHeight: 1.6 }}>
                  {ar ? "سيتم مراجعة تقييمك من الإدارة قبل نشره." : "Your review will be reviewed by our team before being published."}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Reviews() {
  const { t, lang } = useLanguage();
  const { testimonials: dbTestimonials } = useSiteData();
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);

  const reviews = dbTestimonials.length > 0
    ? dbTestimonials.filter(t => t.isVisible).map(t => testimonialToReview(t, lang))
    : t.reviews.items;

  const half = Math.ceil(reviews.length / 2);
  const row1 = reviews.slice(0, half);
  const row2 = reviews.slice(half);

  return (
    <section id="reviews" style={{ padding: "6rem 0", background: "linear-gradient(180deg, var(--bg-page), var(--bg-page-2))", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingInline: "1.5rem" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.reviews.sectionLabel}</div>
            <h2 className="section-title">{t.reviews.sectionTitle}</h2>
            <p className="section-subtitle">{t.reviews.sectionSubtitle}</p>
          </div>
        </FadeInSection>
      </div>

      <div className="reviews-tracks-wrap" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflow: "hidden" }}>
        {/* Row 1: content scrolls left (scrollRight animation) — seamless via item duplication */}
        <div ref={track1Ref} className="reviews-track" style={{ paddingInline: "1.5rem", animation: "scrollRight 50s linear infinite" }}>
          {[...row1, ...row1].map((r, i) => <ReviewCard key={i} review={r} colorIndex={i} />)}
        </div>
        {/* Row 2: content scrolls right (scrollLeft animation) — seamless via item duplication */}
        <div ref={track2Ref} className="reviews-track" style={{ paddingInline: "1.5rem", animation: "scrollLeft 45s linear infinite" }}>
          {[...row2, ...row2].map((r, i) => <ReviewCard key={i} review={r} colorIndex={i + 4} />)}
        </div>
      </div>

      <ReviewSubmitForm />
    </section>
  );
}

// ===== FOOTER =====
function Footer() {
  const { t, lang } = useLanguage();
  const { settings } = useSiteData();
  const logoSrc = resolveApiAssetUrl(settings.logo_url) || logoImg;
  const f = t.footer;
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const waNum = settings.whatsapp_number || "201205756024";
  const phone = settings.phone_number || "+20 120 575 6024";
  const showMap = settings.show_footer_map === "true";
  const brandShort = settings.brand_short_name || "DR Travel";
  const brandify = (s: string) => brandShort === "DR Travel" ? s : s.split("DR Travel").join(brandShort);
  const DEFAULT_DEV_URL = "https://wa.me/201007752842";
  const devContactHref = (() => {
    const raw = settings.dev_contact_url || DEFAULT_DEV_URL;
    try {
      const u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_DEV_URL;
    } catch { return DEFAULT_DEV_URL; }
    const sep = raw.includes("?") ? "&" : "?";
    return `${raw}${sep}text=${encodeURIComponent(brandify(f.devWaMessage))}`;
  })();
  const DEFAULT_MAPS_URL = "https://maps.google.com/?q=Mersa+Matruh,+Egypt";
  const mapsUrl = (() => {
    const raw = settings.maps_url || DEFAULT_MAPS_URL;
    try {
      const u = new URL(raw);
      if (u.protocol === "http:" || u.protocol === "https:") return raw;
    } catch { /* ignore */ }
    return DEFAULT_MAPS_URL;
  })();
  const mapQuery = (() => {
    try {
      const u = new URL(mapsUrl);
      const q = u.searchParams.get("q") || u.searchParams.get("query");
      if (q) return q;
    } catch { /* ignore */ }
    return lang === "ar" ? (settings.location_ar || "مرسى مطروح، مصر") : (settings.location_en || "Marsa Matruh, Egypt");
  })();
  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&hl=${lang}&z=12&output=embed`;
  const socialLinks = [
    { label: "Facebook", href: settings.facebook_url || "https://facebook.com/Drtrave", icon: <FacebookIcon />, color: "#1877F2", bg: "rgba(24,119,242,0.12)" },
    { label: "Instagram", href: settings.instagram_url || "https://instagram.com/drtravel_marsamatrouh", icon: <InstagramIcon />, color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
    { label: "TikTok", href: settings.tiktok_url || "https://tiktok.com/@drtravel.marsa.matrouh", icon: <TikTokIcon />, color: "#ffffff", bg: "var(--border)" },
    { label: "WhatsApp", href: `https://wa.me/${waNum}`, icon: <WhatsAppIcon />, color: "#25D366", bg: "rgba(37,211,102,0.12)" },
  ];

  const arrowChar = lang === "ar" ? "▶" : "▷";

  return (
    <footer id="footer" style={{ background: "linear-gradient(180deg, var(--bg-page-2) 0%, var(--bg-page) 100%)", borderTop: "1px solid rgba(0,170,255,0.1)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 1.5rem 2.5rem" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.25rem" }}>
              <img src={logoSrc} alt="DR Travel" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,170,255,0.4)", boxShadow: "0 0 20px rgba(0,170,255,0.2)" }} />
              <div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#00AAFF", fontSize: "1.05rem", letterSpacing: "1.5px" }}>{settings.brand_name || "DR TRAVEL"}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>{lang === "ar" ? (settings.brand_tagline_ar || "يخت سياحة وسفاري · مرسى مطروح") : (settings.brand_tagline_en || "Yacht Tourism & Safari")}</div>
              </div>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 2, marginBottom: "1.5rem" }}>{brandify(f.brandDesc)}</p>
            <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" title={s.label}
                  style={{ width: 40, height: 40, borderRadius: "10px", background: s.bg, color: s.color, border: `1px solid ${s.color}33`, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "all 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${s.color}40`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 3, height: 16, background: "#00AAFF", borderRadius: 2, display: "inline-block" }} /> {f.quickLinksTitle}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {f.quickLinks.map(link => (
                <a key={link.href} href={link.href}
                  onClick={e => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" }); }}
                  style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.25s", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00AAFF"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                  <span style={{ color: "#00AAFF", fontSize: "0.45rem" }}>{arrowChar}</span> {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 3, height: 16, background: "#00AAFF", borderRadius: 2, display: "inline-block" }} /> {f.contactTitle}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { href: `tel:${phone}`, icon: <PhoneIcon />, text: phone, hoverColor: "#00AAFF", bg: "rgba(0,170,255,0.08)", borderColor: "rgba(0,170,255,0.2)", iconColor: "#00AAFF" },
                { href: `https://wa.me/${waNum}`, icon: <WhatsAppIcon />, text: lang === "ar" ? `واتساب: ${phone}` : `WhatsApp: ${phone}`, hoverColor: "#25D366", bg: "rgba(37,211,102,0.08)", borderColor: "rgba(37,211,102,0.2)", iconColor: "#25D366" },
              ].map((item, i) => (
                <a key={i} href={item.href} target={i === 1 ? "_blank" : undefined} rel="noreferrer"
                  style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.75rem", transition: "color 0.3s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = item.hoverColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                  <span style={{ width: 34, height: 34, borderRadius: "8px", background: item.bg, border: `1px solid ${item.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: item.iconColor, flexShrink: 0 }}>{item.icon}</span>
                  {item.text}
                </a>
              ))}
              <a href={mapsUrl} target="_blank" rel="noreferrer"
                style={{ color: "var(--text-muted)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", transition: "color 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#C9A84C")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                <span style={{ width: 34, height: 34, borderRadius: "8px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", flexShrink: 0 }}><LocationIcon /></span>
                {lang === "ar" ? (settings.location_ar || f.locationLabel) : (settings.location_en || f.locationLabel)}
              </a>
              <div style={{ background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.1)", borderRadius: "10px", padding: "0.85rem" }}>
                <div style={{ color: "#00AAFF", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.35rem" }}>{f.workingHours}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.9, whiteSpace: "pre-line" }}>{f.workingHoursDetails}</div>
              </div>
            </div>
          </div>

          {/* Map (optional) */}
          {showMap && (
            <div>
              <h4 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: 3, height: 16, background: "#C9A84C", borderRadius: 2, display: "inline-block" }} />
                {lang === "ar" ? "موقعنا على الخريطة" : "Find us on the map"}
              </h4>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={lang === "ar" ? "افتح موقعنا في Google Maps" : "Open our location in Google Maps"}
                style={{
                  display: "block", position: "relative", width: "100%", aspectRatio: "16 / 11",
                  borderRadius: "12px", overflow: "hidden",
                  border: "1px solid rgba(201,168,76,0.25)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                  textDecoration: "none", transition: "transform 0.3s, box-shadow 0.3s, border-color 0.3s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 32px rgba(201,168,76,0.25)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.55)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.35)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,168,76,0.25)";
                }}
              >
                <iframe
                  title="DR Travel location"
                  src={embedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, pointerEvents: "none", filter: "saturate(0.9) contrast(0.95)" }}
                />
                <span aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
                <span style={{
                  position: "absolute", insetInlineStart: 12, bottom: 12,
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  background: "rgba(201,168,76,0.95)", color: "var(--bg-page-2)",
                  fontSize: "0.72rem", fontWeight: 800,
                  padding: "0.35rem 0.7rem", borderRadius: "999px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}>
                  <span style={{ display: "inline-flex", width: 14, height: 14 }}><LocationIcon /></span>
                  {lang === "ar" ? "افتح في Google Maps" : "Open in Google Maps"}
                </span>
              </a>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(0,170,255,0.2),transparent)", marginBottom: "1.5rem" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "#2a3845", fontSize: "0.78rem", margin: 0 }}>{brandify(f.copyright)}</p>
          <button onClick={scrollToTop}
            style={{ background: "rgba(0,170,255,0.07)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", width: 36, height: 36, borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00AAFF"; (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#00AAFF"; }}>
            ↑
          </button>
        </div>
      </div>

      {/* Developer strip */}
      <div style={{ borderTop: "1px solid var(--bg-surface)", background: "rgba(0,0,0,0.2)", padding: "0.85rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ color: "#1e2d3d", fontSize: "0.73rem" }}>{f.devLabel}{settings.dev_name ? ` — ${settings.dev_name}` : ""}</span>
          <a href={devContactHref} target="_blank" rel="noreferrer"
            style={{ color: "#25D366", textDecoration: "none", fontSize: "0.73rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.35rem", border: "1px solid rgba(37,211,102,0.18)", borderRadius: "20px", padding: "0.2rem 0.7rem", background: "rgba(37,211,102,0.05)", transition: "all 0.3s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,211,102,0.12)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(37,211,102,0.05)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            {f.devContact}
          </a>
        </div>
      </div>
    </footer>
  );
}

// ===== WHATSAPP FLOAT =====
function WhatsAppFloat() {
  const { t } = useLanguage();
  return (
    <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer" className="wa-float animate-pulse-green" title={t.waFloat}>
      <WhatsAppIcon />
    </a>
  );
}

// ===== HOME PAGE =====
function HomePage() {
  const { t } = useLanguage();
  const { settings } = useSiteData();
  const showAI = settings.show_ai_assistant !== "false";
  const showTestimonials = settings.show_testimonials !== "false";
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    let attempts = 0;
    const tryScroll = () => {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (attempts++ < 20) {
        setTimeout(tryScroll, 100);
      }
    };
    tryScroll();
  }, []);
  const ar = t.lang === "ar";
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <SeoHead
        title={ar ? `${settings.brand_name || "DR Travel"} | رحلات وباقات سياحية` : `${settings.brand_name || "DR Travel"} | Trips & Travel Packages`}
        description={ar ? (settings.brand_tagline_ar || "احجز رحلتك القادمة مع DR Travel — باقات سياحية مميزة بأسعار تنافسية.") : (settings.brand_tagline_en || "Book your next trip with DR Travel — curated travel packages at competitive prices.")}
        path="/"
        lang={ar ? "ar" : "en"}
        image={settings.logo_url || undefined}
      />
      <ScrollProgress />
      <Navbar />
      <Hero />
      <TripReminderBanner />
      <StatsBar />
      <Services />

      <PackagesAndBooking />
      <WhyUs />
      {showTestimonials && <Reviews />}
      <CustomerPhotosGallery />
      <Footer />
      <WhatsAppFloat />
      {showAI && <AIAssistant />}
    </div>
  );
}

// ===== DETAIL PAGE WRAPPER =====
function DetailPageWrapper() {
  const { t } = useLanguage();
  const { settings } = useSiteData();
  const showAI = settings.show_ai_assistant !== "false";
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <PackageDetail />
      {showAI && <AIAssistant />}
    </div>
  );
}

// ===== TRIPS PAGE WRAPPER =====
function TripsPageWrapper() {
  const { t } = useLanguage();
  const { settings } = useSiteData();
  const showAI = settings.show_ai_assistant !== "false";
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <TripsPage />
      {showAI && <AIAssistant />}
    </div>
  );
}

// ===== GALLERY PAGE WRAPPER =====
function GalleryPageWrapper() {
  const { t } = useLanguage();
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <GalleryPage />
    </div>
  );
}

// ===== GALLERY DETAIL PAGE WRAPPER =====
function GalleryDetailPageWrapper() {
  const { t } = useLanguage();
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <GalleryDetailPage />
    </div>
  );
}

// ===== WHY US DETAIL PAGE WRAPPER =====
function WhyUsDetailPageWrapper() {
  const { t } = useLanguage();
  const { settings } = useSiteData();
  const showAI = settings.show_ai_assistant !== "false";
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <WhyUsDetailPage />
      <Footer />
      <WhatsAppFloat />
      {showAI && <AIAssistant />}
    </div>
  );
}

// ===== SERVICE DETAIL PAGE WRAPPER =====
function ServiceDetailPageWrapper() {
  const { t } = useLanguage();
  const { settings } = useSiteData();
  const showAI = settings.show_ai_assistant !== "false";
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "var(--app-font-sans)" }}>
      <Navbar />
      <ServiceDetailPage />
      <Footer />
      <WhatsAppFloat />
      {showAI && <AIAssistant />}
    </div>
  );
}

const INITIAL_SPLASH_SETTLE_DELAY_MS = 1_000;
const INITIAL_SPLASH_FADE_MS = 600;

function InitialSplashScreen({
  isInitializing,
  settleDelayMs = INITIAL_SPLASH_SETTLE_DELAY_MS,
}: {
  isInitializing: boolean;
  settleDelayMs?: number;
}) {
  useEffect(() => {
    const splash = document.getElementById("splash");
    if (!splash) return undefined;

    if (isInitializing) {
      splash.classList.remove("splash-out");
      return undefined;
    }

    let removeTimeoutId: number | undefined;

    const fadeTimeoutId = window.setTimeout(() => {
      splash.classList.add("splash-out");
      removeTimeoutId = window.setTimeout(() => {
        splash.remove();
      }, INITIAL_SPLASH_FADE_MS);
    }, settleDelayMs);

    return () => {
      window.clearTimeout(fadeTimeoutId);
      if (removeTimeoutId) window.clearTimeout(removeTimeoutId);
    };
  }, [isInitializing, settleDelayMs]);

  return null;
}

function PublicAppShell() {
  const { isInitializing, settings } = useSiteData();
  useSiteFonts(settings);

  return (
    <>
      {!isInitializing && (
        <div className="site-font-scope">
          <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/packages/:slug" component={DetailPageWrapper} />
            <Route path="/trips" component={TripsPageWrapper} />
            <Route path="/rewards" component={RewardsPage} />
            <Route path="/gallery" component={GalleryPageWrapper} />
            <Route path="/gallery/:slug" component={GalleryDetailPageWrapper} />
            <Route path="/services/:slug" component={ServiceDetailPageWrapper} />
            <Route path="/why-us/:slug" component={WhyUsDetailPageWrapper} />
            <Route path="/card" component={SharePage} />
            <Route path="/share" component={SharePage} />
            <Route path="/ticket/:token" component={TicketPage} />
            <Route path="/verify/:token" component={VerifyPage} />
            <Route path="/review/:token" component={ReviewPage} />
            <Route path="/quiz" component={QuizPage} />
            <Route component={NotFoundPage} />
          </Switch>
          <PushPrompt />
        </div>
      )}
      <InitialSplashScreen isInitializing={isInitializing} />
    </>
  );
}
// ===== APP =====
export default function App() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  if (isAdmin) {
    return (
      <>
        <InitialSplashScreen isInitializing={false} settleDelayMs={0} />
        <Suspense fallback={null}>
          <AdminRouter />
        </Suspense>
      </>
    );
  }

  return (
    <LanguageProvider>
      <CurrencyProvider>
        <SiteDataProvider>
          <PublicAppShell />
        </SiteDataProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
