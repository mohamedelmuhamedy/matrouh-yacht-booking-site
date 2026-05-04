import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../LanguageContext";
import { useSiteData } from "../context/SiteDataContext";
import SeoHead from "../components/SeoHead";

type Bullet = { icon: string; titleAr: string; titleEn: string; descAr: string; descEn: string };
type Stat = { icon: string; value: string; labelAr: string; labelEn: string };
const MOBILE_MOTION_QUERY = "(max-width: 768px)";

function mobileMotionDisabled() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(MOBILE_MOTION_QUERY).matches;
}

interface WhyUsCard {
  id: number;
  slug: string;
  icon: string;
  color: string;
  titleAr: string; titleEn: string;
  shortDescAr: string; shortDescEn: string;
  heroImageUrl: string | null;
  accentImageUrl: string | null;
  introAr: string; introEn: string;
  bodyAr: string; bodyEn: string;
  bullets: Bullet[];
  stats: Stat[];
  galleryImages: string[];
  ctaTextAr: string; ctaTextEn: string;
  ctaLink: string;
  isActive: boolean;
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function useInView<T extends HTMLElement>(threshold = 0.18): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => mobileMotionDisabled());
  useEffect(() => {
    if (mobileMotionDisabled() || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    if (!ref.current || seen) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setSeen(true); obs.disconnect(); } });
    }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [seen, threshold]);
  return [ref, seen];
}

function Reveal({ children, delay = 0, from = "up" }: { children: React.ReactNode; delay?: number; from?: "up" | "left" | "right" | "scale" }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const transforms = {
    up: "translateY(40px)",
    left: "translateX(-40px)",
    right: "translateX(40px)",
    scale: "scale(0.92)",
  };
  return (
    <div ref={ref} className="wu-reveal" style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "none" : transforms[from],
      transition: `opacity 0.85s cubic-bezier(.2,.8,.2,1) ${delay}ms, transform 0.85s cubic-bezier(.2,.8,.2,1) ${delay}ms`,
      willChange: "opacity, transform",
    }}>{children}</div>
  );
}

function CountUp({ target, duration = 1400 }: { target: string; duration?: number }) {
  const [val, setVal] = useState(() => mobileMotionDisabled() ? target : "0");
  const [ref, inView] = useInView<HTMLSpanElement>();
  useEffect(() => {
    if (mobileMotionDisabled()) {
      setVal(target);
      return;
    }
    if (!inView) return;
    // Parse digits
    const m = target.match(/^([\d.,]+)(.*)$/);
    if (!m) { setVal(target); return; }
    const numStr = m[1].replace(/,/g, "");
    const suffix = m[2] || "";
    const num = parseFloat(numStr);
    if (isNaN(num)) { setVal(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = num * eased;
      const formatted = num >= 100 ? Math.round(cur).toString() : cur.toFixed(1).replace(/\.0$/, "");
      setVal(formatted + suffix);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return <span ref={ref}>{val}</span>;
}

export default function WhyUsDetailPage() {
  const [, params] = useRoute("/why-us/:slug");
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const { settings } = useSiteData();
  const [card, setCard] = useState<WhyUsCard | null>(null);
  const [siblings, setSiblings] = useState<WhyUsCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const slug = params?.slug || "";
  const isAr = lang === "ar";

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    setLoading(true); setNotFound(false);
    Promise.all([
      apiFetch(`/api/why-us/${encodeURIComponent(slug)}`).then(r => r.ok ? r.json() : null),
      apiFetch(`/api/why-us`).then(r => r.ok ? r.json() : []),
    ]).then(([single, all]) => {
      if (!single || !single.id) { setNotFound(true); }
      else {
        setCard(single);
        const sibs = (Array.isArray(all) ? all : []).filter((c: WhyUsCard) => c.slug !== slug).slice(0, 4);
        setSiblings(sibs);
      }
    }).catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    if (mobileMotionDisabled()) {
      setScrollY(0);
      return;
    }
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "#00AAFF", fontFamily: "Cairo, sans-serif", direction: isAr ? "rtl" : "ltr" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem", animation: "spin 1.2s linear infinite" }}>✨</div>
          <div>{isAr ? "جاري التحميل..." : "Loading..."}</div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (notFound || !card) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif", direction: isAr ? "rtl" : "ltr", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔍</div>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{isAr ? "الصفحة غير موجودة" : "Page Not Found"}</h1>
          <p style={{ color: "#8b9bab", marginBottom: "1.5rem" }}>{isAr ? "البطاقة اللي بتدور عليها مش موجودة." : "The card you're looking for doesn't exist."}</p>
          <button onClick={() => navigate("/")} style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 1.6rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
            {isAr ? "← العودة للرئيسية" : "← Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const title = isAr ? card.titleAr : (card.titleEn || card.titleAr);
  const shortDesc = isAr ? card.shortDescAr : (card.shortDescEn || card.shortDescAr);
  const intro = isAr ? card.introAr : (card.introEn || card.introAr);
  const body = isAr ? card.bodyAr : (card.bodyEn || card.bodyAr);
  const ctaText = isAr ? card.ctaTextAr : (card.ctaTextEn || card.ctaTextAr);
  const accent = card.color || "#00AAFF";
  const accentSoft = hexToRgba(accent, 0.15);
  const accentMid = hexToRgba(accent, 0.35);
  const heroImg = card.heroImageUrl || "";
  const accentImg = card.accentImageUrl || card.heroImageUrl || "";
  const whatsapp = settings.whatsapp_number || "01205756024";
  const disableMobileMotion = mobileMotionDisabled();

  const ctaHref = card.ctaLink?.startsWith("/") ? card.ctaLink : (card.ctaLink || "/trips");
  const goCta = () => {
    if (ctaHref.startsWith("http")) { window.open(ctaHref, "_blank"); return; }
    navigate(ctaHref);
  };

  return (
    <div className="why-us-detail-page" style={{ background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif", direction: isAr ? "rtl" : "ltr", minHeight: "100vh", overflowX: "hidden" }}>
      <SeoHead
        title={`${title} | DR Travel`}
        description={String(shortDesc || intro || "").slice(0, 160)}
        image={heroImg || undefined}
        path={`/why-us/${slug}`}
        lang={isAr ? "ar" : "en"}
        type="article"
      />
      <style>{`
        @keyframes float-up { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-ring { 0%{transform:scale(.95);opacity:.7} 70%{transform:scale(1.4);opacity:0} 100%{transform:scale(1.4);opacity:0} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes drift { 0%{transform:translate(0,0)} 50%{transform:translate(20px,-15px)} 100%{transform:translate(0,0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 30px ${accentSoft}} 50%{box-shadow:0 0 60px ${accentMid}} }
        .wu-grain::before { content:''; position:absolute; inset:0; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.06'/%3E%3C/svg%3E"); pointer-events:none; }
      `}</style>

      {/* === HERO === */}
      <section style={{ position: "relative", minHeight: "92vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", isolation: "isolate" }} className="wu-grain">
        {/* Background image with parallax */}
        {heroImg && (
          <div className="wu-parallax-bg" style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${heroImg})`,
            backgroundSize: "cover", backgroundPosition: "center",
            transform: disableMobileMotion ? "none" : `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0003})`,
            transition: disableMobileMotion ? "none" : "transform 0.05s linear",
            filter: "saturate(1.05)",
          }} />
        )}
        {/* Gradient overlays */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${isAr ? "to left" : "to right"}, rgba(13,27,42,.95) 0%, rgba(13,27,42,.78) 45%, rgba(13,27,42,.55) 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at ${isAr ? "85%" : "15%"} 50%, ${accentSoft}, transparent 60%)` }} />

        {/* Floating orbs */}
        <div style={{ position: "absolute", top: "15%", [isAr ? "left" : "right"]: "8%", width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${accentMid}, transparent 70%)`, animation: "drift 9s ease-in-out infinite", filter: "blur(28px)" }} />
        <div style={{ position: "absolute", bottom: "12%", [isAr ? "right" : "left"]: "12%", width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${hexToRgba("#00AAFF", 0.3)}, transparent 70%)`, animation: "drift 11s ease-in-out infinite reverse", filter: "blur(24px)" }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, width: "100%", padding: "5rem 1.5rem 3rem", textAlign: isAr ? "right" : "left" }}>
          {/* Breadcrumb */}
          <Reveal delay={0}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", fontSize: "0.82rem", color: "#8b9bab" }}>
              <Link href="/" style={{ color: "#8b9bab", textDecoration: "none" }}>{isAr ? "الرئيسية" : "Home"}</Link>
              <span>/</span>
              <Link href="/#whyus" style={{ color: "#8b9bab", textDecoration: "none" }}>{isAr ? "ليه DR Travel؟" : "Why DR Travel"}</Link>
              <span>/</span>
              <span style={{ color: accent }}>{title}</span>
            </div>
          </Reveal>

          {/* Pulse icon badge */}
          <Reveal delay={120} from="scale">
            <div style={{ position: "relative", display: "inline-flex", marginBottom: "1.75rem" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: accentMid, animation: "pulse-ring 2.6s ease-out infinite" }} />
              <div style={{ position: "relative", width: 92, height: 92, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.7)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.6rem", boxShadow: `0 12px 40px ${accentMid}`, animation: "float-up 3.5s ease-in-out infinite" }}>
                {card.icon}
              </div>
            </div>
          </Reveal>

          {/* Section label */}
          <Reveal delay={200}>
            <div style={{ display: "inline-block", padding: "0.45rem 1rem", borderRadius: 999, background: accentSoft, border: `1px solid ${accentMid}`, color: accent, fontSize: "0.78rem", fontWeight: 700, marginBottom: "1.25rem", letterSpacing: "0.5px" }}>
              ✦ {isAr ? "ليه نختار DR Travel" : "Why Choose DR Travel"}
            </div>
          </Reveal>

          {/* Title */}
          <Reveal delay={300}>
            <h1 style={{
              fontSize: "clamp(2.2rem, 6vw, 4.5rem)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 1.25rem",
              background: `linear-gradient(135deg, #fff 30%, ${accent} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              letterSpacing: "-0.5px",
            }}>
              {title}
            </h1>
          </Reveal>

          {/* Subtitle */}
          <Reveal delay={400}>
            <p style={{ fontSize: "clamp(1rem, 1.7vw, 1.25rem)", color: "#c9d4df", lineHeight: 1.75, maxWidth: 720, margin: 0 }}>
              {shortDesc}
            </p>
          </Reveal>

          {/* CTA buttons */}
          <Reveal delay={520}>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", flexWrap: "wrap" }}>
              <button onClick={goCta} style={{
                background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.8)})`, color: "white", border: "none",
                borderRadius: 12, padding: "0.95rem 1.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
                fontWeight: 800, fontSize: "0.95rem", boxShadow: `0 12px 32px ${accentMid}`,
                animation: "glow 3s ease-in-out infinite",
              }}>
                {ctaText} ←
              </button>
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{
                background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: "0.95rem 1.6rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
                fontWeight: 700, fontSize: "0.95rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
              }}>
                💬 {isAr ? "واتساب" : "WhatsApp"}
              </a>
            </div>
          </Reveal>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "#8b9bab", fontSize: "0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", animation: "float-up 2s ease-in-out infinite" }}>
          <span>{isAr ? "اعرف أكتر" : "Scroll"}</span>
          <span style={{ fontSize: "1.2rem" }}>↓</span>
        </div>
      </section>

      {/* === STATS BAND === */}
      {card.stats.length > 0 && (
        <section style={{ background: "linear-gradient(180deg, #0D1B2A, #0a1623)", borderTop: `1px solid ${accentSoft}`, borderBottom: `1px solid ${accentSoft}`, padding: "3rem 1.5rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))`, gap: "1.5rem" }}>
            {card.stats.map((s, i) => (
              <Reveal key={i} delay={i * 100} from="scale">
                <div style={{ textAlign: "center", padding: "1.25rem", borderRadius: 16, background: `linear-gradient(135deg, ${accentSoft}, transparent)`, border: `1px solid ${accentSoft}` }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, color: accent, lineHeight: 1, marginBottom: "0.4rem" }}>
                    <CountUp target={s.value} />
                  </div>
                  <div style={{ color: "#c9d4df", fontSize: "0.85rem", fontWeight: 600 }}>
                    {isAr ? s.labelAr : (s.labelEn || s.labelAr)}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* === STORY (intro + body + accent image) === */}
      {(intro || body || accentImg) && (
        <section style={{ padding: "5rem 1.5rem", background: "var(--bg-page)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "3rem", alignItems: "center" }} className="wu-story-grid">
            <style>{`@media (max-width: 860px){.wu-story-grid{grid-template-columns:1fr !important; gap:2rem !important}}`}</style>
            <Reveal from="left">
              <div>
                <div style={{ display: "inline-block", padding: "0.35rem 0.85rem", borderRadius: 999, background: accentSoft, color: accent, fontSize: "0.74rem", fontWeight: 700, marginBottom: "1rem" }}>
                  ✦ {isAr ? "حكايتنا" : "Our Story"}
                </div>
                <h2 style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", fontWeight: 900, lineHeight: 1.25, margin: "0 0 1.25rem", color: "var(--text-primary)" }}>
                  {isAr ? "إيه اللي بيخلّينا مختلفين" : "What makes us different"}
                </h2>
                {intro && (
                  <p style={{ fontSize: "1.05rem", lineHeight: 1.95, color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    {intro}
                  </p>
                )}
                {body && (
                  <p style={{ fontSize: "0.96rem", lineHeight: 1.95, color: "var(--text-muted)", margin: 0 }}>
                    {body}
                  </p>
                )}
              </div>
            </Reveal>
            {accentImg && (
              <Reveal from="right" delay={150}>
                <div style={{ position: "relative" }}>
                  {/* Decorative ring */}
                  <div style={{ position: "absolute", inset: -16, borderRadius: 28, border: `2px solid ${accentMid}`, transform: "rotate(-3deg)" }} />
                  <div style={{
                    position: "relative", borderRadius: 24, overflow: "hidden",
                    aspectRatio: "4/5", boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${accentSoft}`,
                  }}>
                    <img src={accentImg} alt={title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")} />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 50%, rgba(13,27,42,0.6))` }} />
                    {/* Corner badge */}
                    <div style={{ position: "absolute", bottom: 18, [isAr ? "right" : "left"]: 18, background: accent, color: "white", padding: "0.55rem 1rem", borderRadius: 12, fontWeight: 800, fontSize: "0.85rem", boxShadow: "0 8px 20px rgba(0,0,0,0.4)" }}>
                      {card.icon} {title}
                    </div>
                  </div>
                </div>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* === BULLETS / KEY POINTS === */}
      {card.bullets.length > 0 && (
        <section style={{ padding: "5rem 1.5rem", background: "var(--bg-page-2)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
                <div style={{ display: "inline-block", padding: "0.35rem 0.85rem", borderRadius: 999, background: accentSoft, color: accent, fontSize: "0.74rem", fontWeight: 700, marginBottom: "0.85rem" }}>
                  ✦ {isAr ? "النقاط المحورية" : "Key Points"}
                </div>
                <h2 style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", fontWeight: 900, color: "var(--text-primary)", margin: "0 0 0.5rem" }}>
                  {isAr ? "كل اللي بيميّزنا" : "Everything that sets us apart"}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>
                  {isAr ? "تفاصيل بنهتم بيها علشانك" : "Details we care about, for you"}
                </p>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {card.bullets.map((b, i) => (
                <Reveal key={i} delay={i * 80} from="up">
                  <div className="wu-bullet"
                    style={{
                      position: "relative", padding: "1.6rem 1.4rem", borderRadius: 18, height: "100%",
                      background: "linear-gradient(180deg, var(--bg-surface), var(--bg-surface-sunk))",
                      border: `1px solid var(--border)`,
                      transition: "all 0.35s ease", cursor: "default", overflow: "hidden",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.borderColor = accentMid;
                      e.currentTarget.style.boxShadow = `0 20px 40px ${accentSoft}, 0 0 0 1px ${accentMid}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Decorative gradient blob */}
                    <div style={{ position: "absolute", top: -30, [isAr ? "left" : "right"]: -30, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${accentSoft}, transparent 70%)`, pointerEvents: "none" }} />
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 56, height: 56, borderRadius: 14, background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.6)})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.7rem", marginBottom: "1rem", boxShadow: `0 8px 22px ${accentMid}` }}>
                        {b.icon}
                      </div>
                      <h3 style={{ color: "var(--text-primary)", fontSize: "1.05rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
                        {isAr ? b.titleAr : (b.titleEn || b.titleAr)}
                      </h3>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.75, margin: 0 }}>
                        {isAr ? b.descAr : (b.descEn || b.descAr)}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === GALLERY === */}
      {card.galleryImages.length > 0 && (
        <section style={{ padding: "5rem 1.5rem", background: "var(--bg-page)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
                <div style={{ display: "inline-block", padding: "0.35rem 0.85rem", borderRadius: 999, background: accentSoft, color: accent, fontSize: "0.74rem", fontWeight: 700, marginBottom: "0.85rem" }}>
                  ✦ {isAr ? "لقطات من تجربتنا" : "Glimpses"}
                </div>
                <h2 style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.4rem)", fontWeight: 900, color: "var(--text-primary)", margin: 0 }}>
                  {isAr ? "صور تحكي القصة" : "Pictures that tell the story"}
                </h2>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
              {card.galleryImages.map((img, i) => (
                <Reveal key={i} delay={i * 70} from="scale">
                  <div style={{ position: "relative", overflow: "hidden", borderRadius: 16, aspectRatio: i % 3 === 0 ? "1/1.2" : "1/1", boxShadow: "0 14px 40px rgba(0,0,0,0.4)", cursor: "pointer", border: `1px solid ${accentSoft}` }}
                    onClick={() => window.open(img, "_blank")}>
                    <img src={img} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.6s ease, filter 0.4s ease" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; e.currentTarget.style.filter = "brightness(1.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.filter = "brightness(1)"; }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.5))", pointerEvents: "none" }} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* === CTA BANNER === */}
      <section style={{ position: "relative", padding: "5rem 1.5rem", overflow: "hidden", background: `linear-gradient(135deg, ${hexToRgba(accent, 0.18)}, rgba(13,27,42,0.95))` }}>
        {heroImg && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${heroImg})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18, filter: "blur(2px)" }} />
        )}
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 0%, ${accentMid}, transparent 60%)` }} />
        <div style={{ position: "relative", maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <Reveal from="scale">
            <div style={{ fontSize: "3rem", marginBottom: "1rem", animation: "float-up 3s ease-in-out infinite" }}>{card.icon}</div>
            <h2 style={{ fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)", fontWeight: 900, color: "white", margin: "0 0 1rem", lineHeight: 1.25 }}>
              {isAr ? "جاهز تجرب الفرق؟" : "Ready to feel the difference?"}
            </h2>
            <p style={{ color: "#d6e0ea", fontSize: "1.05rem", lineHeight: 1.8, margin: "0 0 2rem", maxWidth: 600, marginInline: "auto" }}>
              {isAr ? "احجز رحلتك دلوقتي وعيش تجربة DR Travel من القلب." : "Book your trip now and live the DR Travel experience firsthand."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
              <button onClick={goCta} style={{
                background: `linear-gradient(135deg, ${accent}, ${hexToRgba(accent, 0.75)})`, color: "white", border: "none",
                borderRadius: 12, padding: "1rem 2rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
                fontWeight: 800, fontSize: "1rem", boxShadow: `0 14px 36px ${accentMid}`,
              }}>
                {ctaText} ✦
              </button>
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" style={{
                background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-strong)",
                borderRadius: 12, padding: "1rem 1.8rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
                fontWeight: 700, fontSize: "1rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem",
              }}>
                💬 {isAr ? "تواصل معنا" : "Contact Us"}
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* === SIBLING CARDS === */}
      {siblings.length > 0 && (
        <section style={{ padding: "4rem 1.5rem", background: "var(--bg-page-2)", borderTop: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <Reveal>
              <div style={{ marginBottom: "2rem", textAlign: "center" }}>
                <h3 style={{ color: "var(--text-primary)", fontSize: "1.4rem", fontWeight: 900, margin: "0 0 0.4rem" }}>
                  {isAr ? "اكتشف أكتر" : "Discover More"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
                  {isAr ? "أسباب تانية تخلّيك تختار DR Travel" : "More reasons to choose DR Travel"}
                </p>
              </div>
            </Reveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {siblings.map((s, i) => {
                const sTitle = isAr ? s.titleAr : (s.titleEn || s.titleAr);
                const sDesc = isAr ? s.shortDescAr : (s.shortDescEn || s.shortDescAr);
                return (
                  <Reveal key={s.id} delay={i * 80}>
                    <Link href={`/why-us/${s.slug}`}>
                      <div style={{
                        cursor: "pointer", padding: "1.25rem", borderRadius: 14, height: "100%",
                        background: "var(--bg-surface)", border: "1px solid var(--border)",
                        transition: "all 0.3s ease", position: "relative", overflow: "hidden",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = hexToRgba(s.color, 0.45); e.currentTarget.style.background = "var(--bg-surface)"; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
                      >
                        <div style={{ width: 44, height: 44, borderRadius: 11, background: hexToRgba(s.color, 0.18), border: `1px solid ${hexToRgba(s.color, 0.3)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", marginBottom: "0.75rem" }}>
                          {s.icon}
                        </div>
                        <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "0.94rem", marginBottom: "0.35rem" }}>{sTitle}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{sDesc}</div>
                        <div style={{ marginTop: "0.85rem", color: s.color, fontSize: "0.78rem", fontWeight: 700 }}>
                          {isAr ? "اعرف أكتر ←" : "Learn more →"}
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
