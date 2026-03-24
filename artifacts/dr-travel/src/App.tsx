import { useEffect, useRef, useState } from "react";
import logoImg from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";
import { LanguageProvider, useLanguage } from "./LanguageContext";

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

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div ref={ref} className={`fade-in-up ${isVisible ? "visible" : ""}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ===== SCROLL PROGRESS =====
function ScrollProgress() {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setWidth(total > 0 ? (window.scrollY / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className="scroll-progress" style={{ width: `${width}%` }} />;
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
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeSection, setActiveSection] = useState("#hero");

  const navLinks = [
    { label: t.nav.home, href: "#hero" },
    { label: t.nav.services, href: "#services" },
    { label: t.nav.packages, href: "#packages" },
    { label: t.nav.booking, href: "#booking" },
    { label: t.nav.contact, href: "#footer" },
  ];

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
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  const textAlign = lang === "ar" ? "right" : "left";

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }} onClick={() => scrollTo("#hero")}>
          <div style={{ position: "relative" }}>
            <img src={logoImg} alt="DR Travel" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,170,255,0.5)", boxShadow: "0 0 16px rgba(0,170,255,0.3)" }} />
            <span style={{ position: "absolute", bottom: 0, left: 0, width: 11, height: 11, borderRadius: "50%", background: "#25D366", border: "2px solid #0a1520" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#00AAFF", letterSpacing: "1.5px", lineHeight: 1.1 }}>DR TRAVEL</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.5px" }}>Yousef Mostafa</div>
          </div>
        </div>

        {/* Desktop links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            {navLinks.map(link => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                className={`nav-link ${activeSection === link.href ? "active" : ""}`}>
                {link.label}
              </button>
            ))}
            <LangSwitcher />
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.55rem 1.25rem", borderRadius: "50px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.3s", boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 22px rgba(37,211,102,0.45)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(37,211,102,0.3)"; }}>
              <WhatsAppIcon /> {t.nav.whatsapp}
            </a>
          </div>
        )}

        {/* Mobile: lang switcher + hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <LangSwitcher />
            <button onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", display: "flex", flexDirection: "column", gap: "5px" }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 24, height: 2, background: "white", display: "block", borderRadius: "2px", transition: "all 0.3s",
                  transform: i === 0 && menuOpen ? "rotate(45deg) translate(5px,5px)" : i === 2 && menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none",
                  opacity: i === 1 && menuOpen ? 0 : 1 }} />
              ))}
            </button>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isMobile && (
        <div style={{ overflow: "hidden", maxHeight: menuOpen ? "400px" : "0", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)", background: "rgba(8,16,26,0.98)", backdropFilter: "blur(20px)" }}>
          <div style={{ padding: "0.75rem 1.5rem 1.25rem", borderTop: "1px solid rgba(0,170,255,0.15)" }}>
            {navLinks.map(link => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                style={{ display: "block", width: "100%", background: "none", border: "none", color: activeSection === link.href ? "#00AAFF" : "rgba(255,255,255,0.8)", padding: "0.8rem 0", fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, textAlign, borderBottom: "1px solid rgba(255,255,255,0.06)", transition: "color 0.2s" }}>
                {link.label}
              </button>
            ))}
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.85rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none", marginTop: "1rem", fontFamily: "Cairo, sans-serif" }}>
              <WhatsAppIcon /> {t.nav.whatsappMobile}
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

// ===== HERO =====
function Hero() {
  const { t } = useLanguage();
  return (
    <section id="hero" className="hero-bg" style={{ paddingTop: "80px" }}>
      <div style={{ textAlign: "center", padding: "3rem 1.5rem 5rem", zIndex: 1, maxWidth: "860px", margin: "0 auto", position: "relative" }}>
        <FadeInSection>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "50px", padding: "0.35rem 1.1rem", marginBottom: "1.75rem" }}>
            <span style={{ fontSize: "0.7rem" }}>✦</span>
            <span style={{ color: "#C9A84C", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "1px" }}>{t.hero.badge}</span>
            <span style={{ fontSize: "0.7rem" }}>✦</span>
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <div className="animate-float" style={{ marginBottom: "1.75rem" }}>
            <img src={logoImg} alt="DR Travel" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", margin: "0 auto", display: "block", border: "3px solid rgba(0,170,255,0.6)", boxShadow: "0 0 0 8px rgba(0,170,255,0.08), 0 0 40px rgba(0,170,255,0.35)" }} />
          </div>
        </FadeInSection>

        <FadeInSection delay={200}>
          <h1 style={{ fontSize: "3.5rem", fontWeight: 900, color: "white", marginBottom: "1rem", lineHeight: 1.15, letterSpacing: "-0.5px" }} className="hero-title">
            {t.hero.title1}<br />
            <span style={{ background: "linear-gradient(135deg,#00AAFF,#C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{t.hero.title2}</span>
          </h1>
        </FadeInSection>

        <FadeInSection delay={300}>
          <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.6)", marginBottom: "2.5rem", lineHeight: 1.8 }}>
            {t.hero.subtitle}
          </p>
        </FadeInSection>

        <FadeInSection delay={400}>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#packages" onClick={e => { e.preventDefault(); document.querySelector("#packages")?.scrollIntoView({ behavior: "smooth" }); }}
              style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", padding: "0.95rem 2.5rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", boxShadow: "0 8px 28px rgba(0,170,255,0.35)", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 36px rgba(0,170,255,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(0,170,255,0.35)"; }}>
              {t.hero.cta1}
            </a>
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "0.95rem 2.5rem", borderRadius: "14px", fontWeight: 700, fontSize: "1rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.13)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>
              <WhatsAppIcon /> {t.hero.cta2}
            </a>
          </div>
        </FadeInSection>
      </div>

      <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", opacity: 0.5 }}>
        <div style={{ width: 28, height: 44, borderRadius: "14px", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6px" }}>
          <div style={{ width: 4, height: 10, borderRadius: "2px", background: "white", animation: "scrollDot 1.8s ease-in-out infinite" }} />
        </div>
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
  return (
    <section id="services" style={{ padding: "6rem 1.5rem", background: "#0D1B2A" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.services.sectionLabel}</div>
            <h2 className="section-title">{t.services.sectionTitle}</h2>
            <p className="section-subtitle">{t.services.sectionSubtitle}</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1.25rem" }}>
          {t.services.items.map((service, i) => (
            <FadeInSection key={i} delay={i * 70}>
              <div className="service-card">
                <div className="service-icon-wrap">{service.icon}</div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "white", marginBottom: "0.6rem" }}>{service.name}</h3>
                <p style={{ color: "#667788", fontSize: "0.875rem", lineHeight: 1.8 }}>{service.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== PACKAGES + BOOKING =====
function PackagesAndBooking() {
  const { t, lang } = useLanguage();
  const PACKAGES = t.packages.items;
  type PkgType = typeof PACKAGES[0];

  const [selectedPkg, setSelectedPkg] = useState<PkgType | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", date: "", adults: "1", children: "0", infants: "0", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bookingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setSelectedPkg(null); }, [lang]);

  const today = new Date().toISOString().split("T")[0];
  const bk = t.booking;
  const estimatedPrice = selectedPkg ? selectedPkg.priceNum * (parseInt(form.adults) || 1) : 0;

  const selectPkg = (pkg: PkgType) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setShowModal(true);
  };

  const waMessage = encodeURIComponent(
    bk.waMessage(
      selectedPkg?.name ?? "",
      form.name, form.phone, form.date,
      form.adults, form.children, form.infants, form.notes
    )
  );

  const inp = (field: string) => ({ className: `form-input${errors[field] ? " error" : ""}` });
  const labelStyle = { display: "block" as const, color: "#8899aa", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" };

  return (
    <section id="packages" style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg,#0a1520 0%,#0D1B2A 100%)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.packages.sectionLabel}</div>
            <h2 className="section-title">{t.packages.sectionTitle}</h2>
            <p className="section-subtitle">{t.packages.sectionSubtitle}</p>
          </div>
        </FadeInSection>

        {/* Package cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: "1.25rem" }}>
          {PACKAGES.map((pkg, i) => (
            <FadeInSection key={pkg.id} delay={i * 80}>
              <div className={`pkg-card${pkg.featured ? " featured" : ""}${selectedPkg?.id === pkg.id ? " selected" : ""}`} onClick={() => selectPkg(pkg)}>
                {pkg.badge && (
                  <div style={{ position: "absolute", top: "1rem", left: "1rem", background: pkg.badgeColor!, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.25rem 0.75rem", borderRadius: "50px", fontSize: "0.72rem", fontWeight: 800 }}>
                    {pkg.badge}
                  </div>
                )}
                {selectedPkg?.id === pkg.id && (
                  <div style={{ position: "absolute", top: "1rem", right: "1rem", width: 26, height: 26, borderRadius: "50%", background: pkg.featured ? "#C9A84C" : "#00AAFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckIcon />
                  </div>
                )}
                <div style={{ paddingTop: pkg.badge ? "1.75rem" : "0.25rem", textAlign: "center", marginBottom: "1.25rem" }}>
                  <div style={{ fontSize: "2.75rem", marginBottom: "0.75rem" }}>{pkg.icon}</div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "white", marginBottom: "0.4rem" }}>{pkg.name}</h3>
                  <p style={{ color: "#667788", fontSize: "0.82rem", lineHeight: 1.6 }}>{pkg.desc}</p>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {pkg.includes.map((item, j) => (
                    <li key={j} style={{ color: "#99aabb", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: pkg.featured ? "#C9A84C" : "#00AAFF", flexShrink: 0, display: "flex" }}><CheckIcon /></span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ color: "#667788", fontSize: "0.75rem", marginBottom: "0.2rem" }}>⏱ {pkg.duration}</div>
                    <div style={{ color: pkg.featured ? "#C9A84C" : "#00AAFF", fontSize: "0.95rem", fontWeight: 800 }}>{pkg.price}</div>
                  </div>
                  <div style={{ background: selectedPkg?.id === pkg.id ? (pkg.featured ? "#C9A84C" : "#00AAFF") : "rgba(255,255,255,0.06)", color: selectedPkg?.id === pkg.id ? (pkg.featured ? "#0D1B2A" : "white") : "#667788", border: `1px solid ${selectedPkg?.id === pkg.id ? "transparent" : "rgba(255,255,255,0.1)"}`, borderRadius: "10px", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 700, transition: "all 0.3s", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
                    {selectedPkg?.id === pkg.id ? t.packages.selectedBtn : t.packages.selectBtn}
                  </div>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>

        {/* Booking panel */}
        <div id="booking" ref={bookingRef} className={`booking-panel ${selectedPkg ? "open" : "closed"}`}>
          <div style={{ marginTop: "2rem", background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.15)", borderRadius: "20px", padding: isMobile ? "1.25rem" : "2.5rem" }}>
            {selectedPkg && (
              <>
                {/* Panel header */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", paddingBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "14px", background: `${selectedPkg.color}15`, border: `1px solid ${selectedPkg.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", flexShrink: 0 }}>
                    {selectedPkg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#667788", fontSize: "0.78rem", marginBottom: "0.2rem" }}>{bk.selectedPackage}</div>
                    <div style={{ color: "white", fontWeight: 800, fontSize: "1.1rem" }}>{selectedPkg.name}</div>
                    <div style={{ color: selectedPkg.color, fontSize: "0.85rem", fontWeight: 700 }}>{selectedPkg.price}</div>
                  </div>
                  <button onClick={() => setSelectedPkg(null)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#667788", width: 36, height: 36, borderRadius: "10px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,100,100,0.15)"; (e.currentTarget as HTMLElement).style.color = "#ff6b6b"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#667788"; }}>
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
                      <input type="date" {...inp("date")} style={{ colorScheme: "dark" }} min={today} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
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
                          <label style={{ display: "block", color: "#8899aa", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem" }}>{f.label}</label>
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

                    {/* Submit */}
                    <button type="submit"
                      style={{ background: `linear-gradient(135deg, ${selectedPkg.color}, ${selectedPkg.color}bb)`, color: selectedPkg.featured ? "#0D1B2A" : "white", border: "none", padding: "1rem", borderRadius: "14px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", boxShadow: `0 8px 24px ${selectedPkg.color}40`, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 14px 32px ${selectedPkg.color}55`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${selectedPkg.color}40`; }}>
                      <WhatsAppIcon /> {bk.submitBtn}
                    </button>
                  </form>

                  {/* Summary sidebar */}
                  <div style={{ width: isMobile ? "100%" : "210px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.25rem" }}>
                    <div style={{ color: "#8899aa", fontSize: "0.75rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase" as const, letterSpacing: "1px" }}>{bk.summaryTitle}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {selectedPkg.includes.map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#aabbcc", fontSize: "0.82rem" }}>
                          <span style={{ color: selectedPkg.color, flexShrink: 0, display: "flex" }}><CheckIcon /></span>
                          {item}
                        </div>
                      ))}
                    </div>
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "1.25rem", paddingTop: "1.25rem" }}>
                      <div style={{ color: "#667788", fontSize: "0.75rem", marginBottom: "0.4rem" }}>⏱ {selectedPkg.duration}</div>
                      {estimatedPrice > 0 && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <div style={{ color: "#667788", fontSize: "0.72rem", marginBottom: "0.25rem" }}>{bk.estimatedPrice}</div>
                          <div style={{ color: selectedPkg.color, fontSize: "1.3rem", fontWeight: 900, fontFamily: "Montserrat, sans-serif" }}>
                            {estimatedPrice.toLocaleString(bk.locale)} <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{bk.currency}</span>
                          </div>
                          <div style={{ color: "#445566", fontSize: "0.7rem", marginTop: "0.2rem" }}>{bk.priceNote}</div>
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

      {/* Success modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>{bk.modal.emoji}</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", marginBottom: "0.75rem" }}>{bk.modal.title}</h3>
            <p style={{ color: "#8899aa", fontSize: "0.95rem", marginBottom: "2rem", lineHeight: 1.8 }}>
              {bk.modal.thankYou} <strong style={{ color: "white" }}>{form.name}</strong>!<br />
              {bk.modal.msg} <strong style={{ color: "#00AAFF" }}>{form.phone}</strong> {bk.modal.within}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexDirection: "column" }}>
              <a href={`https://wa.me/201205756024?text=${waMessage}`} target="_blank" rel="noreferrer"
                style={{ background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "1rem", borderRadius: "14px", fontWeight: 700, textDecoration: "none", fontSize: "1rem", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <WhatsAppIcon /> {bk.modal.confirmBtn}
              </a>
              <button onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#667788", padding: "0.8rem", borderRadius: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", transition: "all 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#667788"; }}>
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
  const { t } = useLanguage();
  return (
    <section id="whyus" style={{ padding: "6rem 1.5rem", background: "#0D1B2A" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.whyUs.sectionLabel}</div>
            <h2 className="section-title">{t.whyUs.sectionTitle}</h2>
            <p className="section-subtitle">{t.whyUs.sectionSubtitle}</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "1.25rem" }}>
          {t.whyUs.items.map((f, i) => (
            <FadeInSection key={i} delay={i * 70}>
              <div className="why-card" style={{ position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: `${f.color}08`, border: `1px solid ${f.color}15` }} />
                <div style={{ width: 56, height: 56, borderRadius: "14px", background: `${f.color}10`, border: `1px solid ${f.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem", marginBottom: "1rem", position: "relative" }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "white", marginBottom: "0.6rem" }}>{f.title}</h3>
                <p style={{ color: "#667788", fontSize: "0.85rem", lineHeight: 1.8 }}>{f.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== REVIEWS =====
function ReviewCard({ review, colorIndex }: { review: { name: string; initials: string; review: string; stars: number }; colorIndex: number }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "18px", padding: "1.5rem", minWidth: "300px", maxWidth: "320px", flexShrink: 0, transition: "all 0.3s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,170,255,0.25)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,170,255,0.12)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: 800, color: "white", flexShrink: 0 }}>
          {review.initials}
        </div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{review.name}</div>
          <div style={{ color: "#C9A84C", fontSize: "0.8rem" }}>{"★".repeat(review.stars)}</div>
        </div>
      </div>
      <p style={{ color: "#8899aa", fontSize: "0.875rem", lineHeight: 1.85, margin: 0 }}>"{review.review}"</p>
    </div>
  );
}

function Reviews() {
  const { t } = useLanguage();
  const track1Ref = useRef<HTMLDivElement>(null);
  const track2Ref = useRef<HTMLDivElement>(null);
  const half = Math.ceil(t.reviews.items.length / 2);
  const row1 = t.reviews.items.slice(0, half);
  const row2 = t.reviews.items.slice(half);

  return (
    <section id="reviews" style={{ padding: "6rem 0", background: "linear-gradient(180deg,#0D1B2A,#0a1520)", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingInline: "1.5rem" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div className="section-label">{t.reviews.sectionLabel}</div>
            <h2 className="section-title">{t.reviews.sectionTitle}</h2>
            <p className="section-subtitle">{t.reviews.sectionSubtitle}</p>
          </div>
        </FadeInSection>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", overflow: "hidden" }}>
        {/* Row 1: scroll right */}
        <div ref={track1Ref} className="reviews-track" style={{ display: "flex", gap: "1.25rem", paddingInline: "1.5rem", animation: "scrollRight 60s linear infinite" }}>
          {[...row1, ...row1].map((r, i) => <ReviewCard key={i} review={r} colorIndex={i} />)}
        </div>
        {/* Row 2: scroll left */}
        <div ref={track2Ref} className="reviews-track" style={{ display: "flex", gap: "1.25rem", paddingInline: "1.5rem", animation: "scrollLeft 55s linear infinite" }}>
          {[...row2, ...row2].map((r, i) => <ReviewCard key={i} review={r} colorIndex={i + 4} />)}
        </div>
      </div>
    </section>
  );
}

// ===== FOOTER =====
function Footer() {
  const { t, lang } = useLanguage();
  const f = t.footer;
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const socialLinks = [
    { label: "Facebook", href: "https://facebook.com/Drtrave", icon: <FacebookIcon />, color: "#1877F2", bg: "rgba(24,119,242,0.12)" },
    { label: "Instagram", href: "https://instagram.com/drtravel_marsamatrouh", icon: <InstagramIcon />, color: "#E1306C", bg: "rgba(225,48,108,0.12)" },
    { label: "TikTok", href: "https://tiktok.com/@drtravel.marsa.matrouh", icon: <TikTokIcon />, color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
    { label: "WhatsApp", href: "https://wa.me/201205756024", icon: <WhatsAppIcon />, color: "#25D366", bg: "rgba(37,211,102,0.12)" },
  ];

  const arrowChar = lang === "ar" ? "▶" : "▷";

  return (
    <footer id="footer" style={{ background: "linear-gradient(180deg,#0a1520 0%,#060d16 100%)", borderTop: "1px solid rgba(0,170,255,0.1)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 1.5rem 2.5rem" }}>
        <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "3rem", marginBottom: "3rem" }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "1.25rem" }}>
              <img src={logoImg} alt="DR Travel" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,170,255,0.4)", boxShadow: "0 0 20px rgba(0,170,255,0.2)" }} />
              <div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, color: "#00AAFF", fontSize: "1.05rem", letterSpacing: "1.5px" }}>DR TRAVEL</div>
                <div style={{ color: "#445566", fontSize: "0.65rem" }}>Yacht Tourism & Safari</div>
              </div>
            </div>
            <p style={{ color: "#445566", fontSize: "0.875rem", lineHeight: 2, marginBottom: "1.5rem" }}>{f.brandDesc}</p>
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
            <h4 style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 3, height: 16, background: "#00AAFF", borderRadius: 2, display: "inline-block" }} /> {f.quickLinksTitle}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {f.quickLinks.map(link => (
                <a key={link.href} href={link.href}
                  onClick={e => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" }); }}
                  style={{ color: "#445566", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.25s", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#00AAFF"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#445566"; }}>
                  <span style={{ color: "#00AAFF", fontSize: "0.45rem" }}>{arrowChar}</span> {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "white", fontWeight: 700, fontSize: "0.9rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: 3, height: 16, background: "#00AAFF", borderRadius: 2, display: "inline-block" }} /> {f.contactTitle}
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { href: "tel:+201205756024", icon: <PhoneIcon />, text: "01205756024", hoverColor: "#00AAFF", bg: "rgba(0,170,255,0.08)", borderColor: "rgba(0,170,255,0.2)", iconColor: "#00AAFF" },
                { href: "https://wa.me/201205756024", icon: <WhatsAppIcon />, text: f.whatsappLabel, hoverColor: "#25D366", bg: "rgba(37,211,102,0.08)", borderColor: "rgba(37,211,102,0.2)", iconColor: "#25D366" },
              ].map((item, i) => (
                <a key={i} href={item.href} target={i === 1 ? "_blank" : undefined} rel="noreferrer"
                  style={{ color: "#445566", textDecoration: "none", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.75rem", transition: "color 0.3s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = item.hoverColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = "#445566")}>
                  <span style={{ width: 34, height: 34, borderRadius: "8px", background: item.bg, border: `1px solid ${item.borderColor}`, display: "flex", alignItems: "center", justifyContent: "center", color: item.iconColor, flexShrink: 0 }}>{item.icon}</span>
                  {item.text}
                </a>
              ))}
              <a href="https://maps.google.com/?q=Mersa+Matruh,+Egypt" target="_blank" rel="noreferrer"
                style={{ color: "#445566", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", transition: "color 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#C9A84C")}
                onMouseLeave={e => (e.currentTarget.style.color = "#445566")}>
                <span style={{ width: 34, height: 34, borderRadius: "8px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C9A84C", flexShrink: 0 }}><LocationIcon /></span>
                {f.locationLabel}
              </a>
              <div style={{ background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.1)", borderRadius: "10px", padding: "0.85rem" }}>
                <div style={{ color: "#00AAFF", fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.35rem" }}>{f.workingHours}</div>
                <div style={{ color: "#445566", fontSize: "0.78rem", lineHeight: 1.9, whiteSpace: "pre-line" }}>{f.workingHoursDetails}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(0,170,255,0.2),transparent)", marginBottom: "1.5rem" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "#2a3845", fontSize: "0.78rem", margin: 0 }}>{f.copyright}</p>
          <button onClick={scrollToTop}
            style={{ background: "rgba(0,170,255,0.07)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", width: 36, height: 36, borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#00AAFF"; (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,170,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#00AAFF"; }}>
            ↑
          </button>
        </div>
      </div>

      {/* Developer strip */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.03)", background: "rgba(0,0,0,0.2)", padding: "0.85rem 1.5rem" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ color: "#1e2d3d", fontSize: "0.73rem" }}>{f.devLabel}</span>
          <a href={`https://wa.me/201007752842?text=${encodeURIComponent(f.devWaMessage)}`} target="_blank" rel="noreferrer"
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

// ===== INNER APP (uses context) =====
function AppInner() {
  const { t } = useLanguage();
  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "Cairo, sans-serif" }}>
      <ScrollProgress />
      <Navbar />
      <Hero />
      <StatsBar />
      <Services />
      <PackagesAndBooking />
      <WhyUs />
      <Reviews />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

// ===== APP =====
export default function App() {
  return (
    <LanguageProvider>
      <AppInner />
    </LanguageProvider>
  );
}
