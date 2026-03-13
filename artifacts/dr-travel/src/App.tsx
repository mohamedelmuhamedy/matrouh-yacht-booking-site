import { useEffect, useRef, useState } from "react";
import logoImg from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";

const PACKAGES = [
  {
    id: 1,
    icon: "🏜️",
    name: "باقة السفاري الكاملة",
    includes: ["سفاري صحراوية", "براشوت", "غداء"],
    duration: "يوم كامل (8 ساعات)",
    price: "يبدأ من 350 جنيه/فرد",
    priceNum: 350,
    badge: "الأكثر طلباً",
    badgeColor: "#C9A84C",
    featured: true,
  },
  {
    id: 2,
    icon: "🚢",
    name: "باقة اليخت الفاخر",
    includes: ["رحلة يخت", "ألعاب مائية", "وجبة خفيفة"],
    duration: "4 ساعات",
    price: "يبدأ من 500 جنيه/فرد",
    priceNum: 500,
    badge: null,
    featured: false,
  },
  {
    id: 3,
    icon: "⭐",
    name: "الباقة الشاملة",
    includes: ["سفاري", "يخت", "أكوا بارك", "إقامة"],
    duration: "يومين / ليلة",
    price: "يبدأ من 1200 جنيه/فرد",
    priceNum: 1200,
    badge: "قيمة استثنائية",
    badgeColor: "#00AAFF",
    featured: false,
  },
  {
    id: 4,
    icon: "👨‍👩‍👧‍👦",
    name: "باقة العائلة",
    includes: ["سفاري", "ألعاب مائية", "أكوا بارك"],
    duration: "يوم كامل",
    price: "يبدأ من 1000 جنيه للعائلة (4 أفراد)",
    priceNum: 1000,
    badge: null,
    featured: false,
  },
];

const SERVICES = [
  { icon: "🏜️", name: "سفاري صحراوية", desc: "مغامرة لا تُنسى في صحراء مطروح" },
  { icon: "🚢", name: "رحلات يخت", desc: "إبحر على متن يخت فاخر في البحر المتوسط" },
  { icon: "🌊", name: "ألعاب مائية", desc: "إثارة وتشويق على شواطئ مطروح" },
  { icon: "🪂", name: "براشوت", desc: "حلق فوق البحر وشاهد مطروح من الأعلى" },
  { icon: "🎡", name: "أكوا بارك", desc: "مرح لا نهاية له للعائلات والأطفال" },
  { icon: "🏠", name: "شقق للإيجار", desc: "إقامة مريحة بأسعار تناسب جميع الميزانيات" },
];

const REVIEWS = [
  { name: "أحمد الشيخ", initials: "أش", review: "والله تجربة من التحفة! السفاري كانت خيال وناس DR Travel محترمين جداً وشاطرين. هنرجع تاني متأكد 💯", stars: 5 },
  { name: "فاطمة سمير", initials: "فس", review: "اليخت كان حلم بجد! المنظر من البحر ماشفتوش في حياتي. الخدمة تمام والأسعار معقولة جداً. شكراً يا DR Travel!", stars: 5 },
  { name: "محمد ربيع", initials: "مر", review: "صحابي وأنا رحنا على باقة السفاري وكانت أحلى يوم في الصيف ده. البراشوت فوق البحر حاجة مش طبيعية أوي 🔥", stars: 5 },
  { name: "نورهان طارق", initials: "نط", review: "أخدت الباقة الشاملة مع عيلتي والعيال فرحوا جداً. الأكوا بارك كان تحفة والتعامل ممتاز من أول لآخر.", stars: 5 },
  { name: "كريم الجمل", initials: "كج", review: "أول مرة أروح مطروح وبقوا عاملين الحجة ليها. السفاري والألعاب المائية في يوم واحد؟ جامدين بجد!", stars: 5 },
  { name: "سلمى حسن", initials: "سح", review: "خدمة على مستوى عالي جداً. الواتساب بيردوا في الحال وبيشرحوا كل حاجة بالتفصيل. الرحلة عدت تمام تمام 🌊", stars: 5 },
  { name: "عمرو فتحي", initials: "عف", review: "عملت مفاجأة لمراتي وأخدناها على اليخت. كانت أجمل مفاجأة في حياتها! شكراً للفريق على التنظيم الرائع.", stars: 5 },
  { name: "دينا البسيوني", initials: "دب", review: "البحر في مطروح مختلف عن أي حاجة تانية. وركوب اليخت مع DR Travel زاد الموضوع جمال. هنفضل نيجي كل سنة!", stars: 5 },
  { name: "يوسف السيد", initials: "يس", review: "الأسعار مناسبة جداً مقارنة بالخدمة اللي بيقدموها. جربت البراشوت للمرة الأولى وكانت أدرينالين خالص 🪂", stars: 5 },
  { name: "ريم عبدالعزيز", initials: "رع", review: "رحلة اليخت كانت منظمة أوي. في وجبة وألعاب مائية وموسيقى. احساس أننا في فيلا على البحر! تجربة ٥ نجوم.", stars: 5 },
  { name: "إسلام جابر", initials: "إج", review: "جبت عيلتي كلها، الكبار والصغار، وكلهم استمتعوا. الأولاد من الأكوا بارك والكبار من السفاري. تنظيم ممتاز!", stars: 5 },
  { name: "منى الشرقاوي", initials: "مش", review: "كنا خايفين الأول بس لما وصلنا الفريق كان متفهم ومحترف جداً. الرحلة عدت أحسن من توقعاتنا بكتير! 🚢", stars: 5 },
  { name: "طارق عوض", initials: "طع", review: "سنة على سنة بنيجي مطروح عند DR Travel. ناس بيستاهلوا الثقة. ما غيرناش ولا هنغير! كل سنة أحسن من اللي قبلها.", stars: 5 },
  { name: "آية الزهراء", initials: "آز", review: "البراشوت كانت الأكشن اللي كنت محتاجاه 😂 المنظر من فوق ده فيلم حقيقي. والتعامل محترم وآمن جداً.", stars: 5 },
  { name: "مصطفى البنا", initials: "مب", review: "حجزت للشركة بتاعتنا يوم تيم بيلدينج. الكل قال إنه أحسن نشاط عملناه في حياتنا. شكراً DR Travel على الاحترافية!", stars: 5 },
  { name: "هدير عصام", initials: "هع", review: "الشقة كانت نضيفة وقريبة من البحر. والرحلات اللي حجزناها معاهم كانت رهيبة. الباقة الشاملة تستاهل كل قرش!", stars: 5 },
  { name: "عبدالرحمن قاسم", initials: "عق", review: "من أحسن الشركات السياحية في مطروح بدون مجاملة. بيهتموا بكل تفصيلة ومعندكش قلق على حاجة 👍", stars: 5 },
  { name: "لمياء إبراهيم", initials: "لإ", review: "زوجي فاجأني برحلة اليخت وكانت أجمل مفاجأة في حياتي! الغروب من على اليخت ده منظر ماشوفوش في حياتك! 🌅", stars: 5 },
  { name: "شادي المصري", initials: "شم", review: "الألعاب المائية كانت تحفة خصوصاً الجت سكي. والسفاري في آخر النهار على الرمال كانت تجربة فريدة أوي!", stars: 5 },
  { name: "نادين سعد", initials: "نس", review: "حجزت أونلاين وتم التواصل في نفس اليوم. فريق عمل محترم ومنظم. الرحلة كانت فوق التوقعات بكتير! ⭐⭐⭐⭐⭐", stars: 5 },
  { name: "وليد منصور", initials: "وم", review: "عملت عيد ميلاد أختي على اليخت. كانت مفاجأة ما تتصورش. قالت أحسن عيد ميلاد في حياتها. شكراً يا DR Travel!", stars: 5 },
  { name: "إيمان السبكي", initials: "إس", review: "كل سنة بنيجي مطروح وبنحجز مع DR Travel مباشرة. ناس موثوقة ومحترفة وأسعار مناسبة. فضلوا كده!", stars: 5 },
];

const STATS = [
  { icon: "🚤", count: 200, label: "+ رحلة يخت" },
  { icon: "🏜️", count: 150, label: "+ سفاري صحراوية" },
  { icon: "😊", count: 5000, label: "+ عميل سعيد" },
  { icon: "⭐", count: 5, label: " نجوم تقييم" },
];

function useIntersectionObserver() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, isVisible } = useIntersectionObserver();
  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);
  return <span ref={ref}>{count.toLocaleString("ar-EG")}</span>;
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div ref={ref} className={`fade-in-up ${isVisible ? "visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ===== SOCIAL ICONS SVG =====
const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

const LocationIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("scroll", handleScroll); window.removeEventListener("resize", handleResize); };
  }, []);

  const navLinks = [
    { label: "الرئيسية", href: "#hero" },
    { label: "خدماتنا", href: "#services" },
    { label: "باقاتنا", href: "#packages" },
    { label: "احجز الآن", href: "#booking" },
    { label: "تواصل معنا", href: "#footer" },
  ];

  const scrollTo = (id: string) => {
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <img src={logoImg} alt="DR Travel" style={{ width: 46, height: 46, borderRadius: "50%", objectFit: "cover", boxShadow: "0 0 12px rgba(0,153,230,0.4)", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: "1rem", color: "#00AAFF", letterSpacing: "1px", whiteSpace: "nowrap" }}>DR TRAVEL</div>
            <div style={{ fontSize: "0.65rem", color: "#C0C0C0" }}>Yacht Tourism & Safari</div>
            <div style={{ fontSize: "0.6rem", color: "#C0C0C0", opacity: 0.75 }}>Yousef Mostafa</div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollTo(link.href)}
                style={{ background: "none", border: "none", color: "#ffffff", fontSize: "0.9rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, transition: "color 0.3s", padding: "0.25rem 0", whiteSpace: "nowrap" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00AAFF")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ffffff")}>
                {link.label}
              </button>
            ))}
            <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
              style={{ background: "#25D366", color: "white", padding: "0.5rem 1.25rem", borderRadius: "50px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", gap: "0.5rem", whiteSpace: "nowrap", transition: "transform 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
              <WhatsAppIcon /> واتساب
            </a>
          </div>
        )}

        {isMobile && (
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "5px", padding: "5px", flexShrink: 0 }}>
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        )}
      </div>

      {isMobile && menuOpen && (
        <div style={{ background: "rgba(13,27,42,0.98)", borderTop: "1px solid rgba(0,170,255,0.2)", padding: "0.5rem 1rem 1rem" }}>
          {navLinks.map((link) => (
            <button key={link.href} onClick={() => scrollTo(link.href)}
              style={{ display: "block", width: "100%", background: "none", border: "none", color: "white", padding: "0.75rem 0.5rem", fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, textAlign: "right", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {link.label}
            </button>
          ))}
          <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "#25D366", color: "white", padding: "0.75rem 1rem", borderRadius: "10px", fontWeight: 700, textDecoration: "none", marginTop: "0.75rem", fontFamily: "Cairo, sans-serif" }}>
            <WhatsAppIcon /> تواصل على واتساب
          </a>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section id="hero" className="hero-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", paddingTop: "80px" }}>
      <div style={{ textAlign: "center", padding: "2rem 1.5rem", zIndex: 1, maxWidth: "800px", margin: "0 auto" }}>
        <div className="animate-float" style={{ marginBottom: "1.5rem" }}>
          <img src={logoImg} alt="DR Travel" style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", margin: "0 auto", display: "block", border: "3px solid #00AAFF", boxShadow: "0 0 30px rgba(0, 170, 255, 0.5)" }} />
        </div>
        <h1 className="hero-title" style={{ fontSize: "3rem", fontWeight: 900, color: "white", marginBottom: "1rem", lineHeight: 1.3 }}>
          اكتشف جمال مرسى مطروح
        </h1>
        <p style={{ fontSize: "1.25rem", color: "#00AAFF", fontWeight: 700, marginBottom: "2.5rem", letterSpacing: "0.5px" }}>
          سفاري | يخت | ألعاب مائية | رحلات بحرية
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#booking" onClick={e => { e.preventDefault(); document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{ background: "linear-gradient(135deg, #C9A84C, #e8c76b)", color: "#0D1B2A", padding: "0.9rem 2.5rem", borderRadius: "50px", fontWeight: 800, fontSize: "1.05rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease", boxShadow: "0 4px 20px rgba(201, 168, 76, 0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
            احجز الآن 🚀
          </a>
          <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
            style={{ background: "#25D366", color: "white", padding: "0.9rem 2.5rem", borderRadius: "50px", fontWeight: 800, fontSize: "1.05rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", gap: "0.5rem", transition: "all 0.3s ease", boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
            <WhatsAppIcon /> تواصل على واتساب
          </a>
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

function StatsBar() {
  return (
    <section className="stats-section" style={{ padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "2rem" }}>
        {STATS.map((stat, i) => (
          <FadeInSection key={i} delay={i * 100}>
            <div style={{ textAlign: "center", color: "#0D1B2A" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
              <div style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>
                <AnimatedCounter target={stat.count} />{stat.label}
              </div>
            </div>
          </FadeInSection>
        ))}
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" style={{ padding: "5rem 1.5rem", background: "#0D1B2A" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">خدماتنا</h2>
            <p className="section-subtitle">كل ما تحتاجه لرحلة مثالية في مرسى مطروح</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {SERVICES.map((service, i) => (
            <FadeInSection key={i} delay={i * 80}>
              <div className="service-card">
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{service.icon}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>{service.name}</h3>
                <p style={{ color: "#C0C0C0", fontSize: "0.9rem", lineHeight: 1.7 }}>{service.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function Packages({ onBook }: { onBook: (pkg: string) => void }) {
  return (
    <section id="packages" style={{ padding: "5rem 1.5rem", background: "linear-gradient(180deg, #0D1B2A 0%, #0a1520 100%)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">باقاتنا وأسعارنا</h2>
            <p className="section-subtitle">أسعار تنافسية تناسب جميع الميزانيات</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
          {PACKAGES.map((pkg, i) => (
            <FadeInSection key={pkg.id} delay={i * 100}>
              <div className={`package-card ${pkg.featured ? "featured" : ""}`} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {pkg.badge && (
                  <div style={{ position: "absolute", top: "1rem", left: "1rem", background: pkg.badgeColor, color: pkg.featured ? "#0D1B2A" : "white", padding: "0.3rem 0.8rem", borderRadius: "50px", fontSize: "0.75rem", fontWeight: 700 }}>
                    {pkg.badge}
                  </div>
                )}
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center", paddingTop: pkg.badge ? "1.5rem" : "0" }}>{pkg.icon}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "white", marginBottom: "1rem", textAlign: "center" }}>{pkg.name}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1rem 0", flex: 1 }}>
                  {pkg.includes.map((item, j) => (
                    <li key={j} style={{ color: "#C0C0C0", fontSize: "0.9rem", padding: "0.3rem 0", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ color: "#00AAFF" }}>✓</span> {item}
                    </li>
                  ))}
                </ul>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem", marginTop: "auto" }}>
                  <div style={{ color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.5rem" }}>⏱ {pkg.duration}</div>
                  <div style={{ color: "#00AAFF", fontSize: "1.05rem", fontWeight: 800, marginBottom: "0.75rem" }}>{pkg.price}</div>
                  <button onClick={() => onBook(pkg.name)}
                    style={{ width: "100%", background: pkg.featured ? "linear-gradient(135deg, #C9A84C, #e8c76b)" : "#00AAFF", color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: "0.8rem", borderRadius: "10px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    احجز الآن
                  </button>
                </div>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

function BookingForm({ defaultPackage }: { defaultPackage: string }) {
  const [form, setForm] = useState({ name: "", phone: "", package: defaultPackage || "", date: "", adults: "1", children: "0", infants: "0", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  useEffect(() => { if (defaultPackage) setForm(f => ({ ...f, package: defaultPackage })); }, [defaultPackage]);
  useEffect(() => {
    const pkg = PACKAGES.find(p => p.name === form.package);
    const adults = parseInt(form.adults) || 1;
    setEstimatedPrice(pkg ? pkg.priceNum * adults : 0);
  }, [form.package, form.adults]);

  const today = new Date().toISOString().split("T")[0];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "الاسم الكامل مطلوب";
    if (!form.phone.trim()) newErrors.phone = "رقم الهاتف مطلوب";
    else if (!/^01[0-9]{9}$/.test(form.phone.replace(/\s/g, ""))) newErrors.phone = "رقم الهاتف غير صحيح";
    if (!form.package) newErrors.package = "الباقة مطلوبة";
    if (!form.date) newErrors.date = "تاريخ الرحلة مطلوب";
    if (!form.adults || parseInt(form.adults) < 1) newErrors.adults = "عدد البالغين مطلوب";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) setShowModal(true);
  };

  const waMessage = encodeURIComponent(
    `مرحباً، أريد حجز رحلة 🚀\n` +
    `الاسم: ${form.name}\n` + `الهاتف: ${form.phone}\n` +
    `الباقة: ${form.package}\n` + `التاريخ: ${form.date}\n` +
    `البالغون: ${form.adults} | الأطفال: ${form.children} | الرضع: ${form.infants}\n` +
    (form.notes ? `ملاحظات: ${form.notes}` : "")
  );

  const inputStyle = (field: string) => ({
    background: "rgba(255,255,255,0.07)", border: `1px solid ${errors[field] ? "#ff6b6b" : "rgba(255,255,255,0.2)"}`,
    borderRadius: "10px", padding: "0.85rem 1rem", color: "white",
    width: "100%", fontFamily: "Cairo, sans-serif", fontSize: "0.95rem",
    transition: "all 0.3s ease", direction: "rtl" as const, boxSizing: "border-box" as const
  });

  return (
    <section id="booking" style={{ padding: "5rem 1.5rem", background: "#0a1520" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 className="section-title">احجز رحلتك الآن</h2>
            <p className="section-subtitle">أملأ النموذج وسنتواصل معك خلال ساعة</p>
          </div>
        </FadeInSection>
        <FadeInSection delay={100}>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(0,170,255,0.2)", borderRadius: "20px", padding: "2.5rem" }}>
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: "grid", gap: "1.25rem" }}>
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>الاسم الكامل *</label>
                  <input type="text" style={inputStyle("name")} placeholder="مثال: محمد أحمد" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.name ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }} />
                  {errors.name && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.name}</p>}
                </div>
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>رقم الهاتف *</label>
                  <input type="tel" style={inputStyle("phone")} placeholder="01X XXXX XXXX" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.phone ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }} />
                  {errors.phone && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.phone}</p>}
                </div>
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>الباقة المطلوبة *</label>
                  <select style={{ ...inputStyle("package"), cursor: "pointer" }} value={form.package}
                    onChange={e => setForm({ ...form, package: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                    onBlur={e => { e.target.style.borderColor = errors.package ? "#ff6b6b" : "rgba(255,255,255,0.2)"; }}>
                    <option value="">اختر الباقة</option>
                    {PACKAGES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="أخرى">أخرى (اكتب في الملاحظات)</option>
                  </select>
                  {errors.package && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.package}</p>}
                </div>
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>تاريخ الرحلة *</label>
                  <input type="date" style={{ ...inputStyle("date"), colorScheme: "dark" }} min={today} value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                    onBlur={e => { e.target.style.borderColor = errors.date ? "#ff6b6b" : "rgba(255,255,255,0.2)"; }} />
                  {errors.date && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.date}</p>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  {[{ label: "بالغون *", key: "adults", err: true }, { label: "أطفال 6-12", key: "children", err: false }, { label: "رضع 0-5", key: "infants", err: false }].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.8rem", marginBottom: "0.4rem", fontWeight: 600 }}>{f.label}</label>
                      <input type="number" min={f.key === "adults" ? "1" : "0"} style={inputStyle(f.err ? f.key : "")}
                        value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                        onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }} />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>ملاحظات إضافية</label>
                  <textarea style={{ ...inputStyle(""), minHeight: "100px", resize: "vertical" as const }} placeholder="أي طلبات خاصة أو استفسارات..."
                    value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }} />
                </div>
                {estimatedPrice > 0 && (
                  <div style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
                    <span style={{ color: "#C0C0C0", fontSize: "0.9rem" }}>السعر التقديري: </span>
                    <span style={{ color: "#00AAFF", fontSize: "1.25rem", fontWeight: 800 }}>{estimatedPrice.toLocaleString("ar-EG")} جنيه</span>
                    <span style={{ color: "#C0C0C0", fontSize: "0.75rem", display: "block", marginTop: "0.25rem" }}>* سعر تقريبي للبالغين فقط</span>
                  </div>
                )}
                <button type="submit"
                  style={{ width: "100%", background: "linear-gradient(135deg, #C9A84C, #e8c76b)", color: "#0D1B2A", border: "none", padding: "1rem", borderRadius: "12px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease", boxShadow: "0 4px 20px rgba(201, 168, 76, 0.3)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(201, 168, 76, 0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(201, 168, 76, 0.3)"; }}>
                  احجز الآن 🚀
                </button>
              </div>
            </form>
          </div>
        </FadeInSection>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", marginBottom: "0.75rem" }}>تم استلام طلبك!</h3>
            <p style={{ color: "#C0C0C0", fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.7 }}>
              شكراً {form.name}! سنتواصل معك خلال ساعة على الرقم {form.phone}
            </p>
            <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
              <a href={`https://wa.me/201205756024?text=${waMessage}`} target="_blank" rel="noreferrer"
                style={{ background: "#25D366", color: "white", padding: "0.9rem 1.5rem", borderRadius: "12px", fontWeight: 700, textDecoration: "none", fontSize: "1rem", fontFamily: "Cairo, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", textAlign: "center" }}>
                <WhatsAppIcon /> تأكيد الحجز عبر واتساب
              </a>
              <button onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#C0C0C0", padding: "0.75rem 1.5rem", borderRadius: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem" }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function WhyUs() {
  const features = [
    { icon: "🏆", title: "خبرة وثقة", desc: "سنوات من الخبرة في السياحة بمرسى مطروح" },
    { icon: "💰", title: "أفضل الأسعار", desc: "أسعار تنافسية مع جودة لا تُقارن" },
    { icon: "🕐", title: "دعم 24/7", desc: "فريقنا متاح دائماً للرد على استفساراتك" },
  ];
  return (
    <section style={{ padding: "5rem 1.5rem", background: "#0D1B2A" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">ليه تختار DR Travel؟</h2>
            <p className="section-subtitle">نحن نضمن لك رحلة لا تُنسى بأعلى معايير الجودة</p>
          </div>
        </FadeInSection>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {features.map((f, i) => (
            <FadeInSection key={i} delay={i * 120}>
              <div className="why-card">
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "white", marginBottom: "0.5rem" }}>{f.title}</h3>
                <p style={{ color: "#C0C0C0", fontSize: "0.9rem", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </div>
    </section>
  );
}

const AVATAR_COLORS = [
  "linear-gradient(135deg, #00AAFF, #0066cc)", "linear-gradient(135deg, #C9A84C, #9a6e1c)",
  "linear-gradient(135deg, #25D366, #128C4E)", "linear-gradient(135deg, #FF6B6B, #cc3333)",
  "linear-gradient(135deg, #A855F7, #6d28d9)", "linear-gradient(135deg, #F97316, #c2410c)",
  "linear-gradient(135deg, #06B6D4, #0e7490)", "linear-gradient(135deg, #EC4899, #be185d)",
];

function ReviewCard({ review, colorIndex }: { review: typeof REVIEWS[0]; colorIndex: number }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "1.5rem", minWidth: "300px", maxWidth: "320px", flexShrink: 0, transition: "transform 0.3s, box-shadow 0.3s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,170,255,0.2)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: AVATAR_COLORS[colorIndex % AVATAR_COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem", fontWeight: 800, color: "white", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>
          {review.initials}
        </div>
        <div>
          <div style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", lineHeight: 1.3 }}>{review.name}</div>
          <div style={{ color: "#FFD700", fontSize: "0.8rem", letterSpacing: "1px" }}>{"★".repeat(review.stars)}</div>
        </div>
        <div style={{ marginRight: "auto", fontSize: "1.25rem", opacity: 0.3 }}>❝</div>
      </div>
      <p style={{ color: "#C8D0DB", fontSize: "0.88rem", lineHeight: 1.8, margin: 0 }}>{review.review}</p>
    </div>
  );
}

function Reviews() {
  return (
    <section style={{ padding: "5rem 0", background: "#0a1520", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">آراء عملائنا</h2>
            <p className="section-subtitle">عملاؤنا بيحكوا تجربتهم مع DR Travel بكل صدق</p>
          </div>
        </FadeInSection>
      </div>
      <style>{`
        @keyframes scrollRTL { 0% { transform: translateX(0); } 100% { transform: translateX(-33.333%); } }
        .reviews-row { overflow: hidden; padding: 0.75rem 0; direction: ltr; }
        .reviews-inner { display: flex; gap: 1.25rem; width: max-content; will-change: transform; animation: scrollRTL 60s linear infinite; }
      `}</style>
      <div className="reviews-row">
        <div className="reviews-inner">
          {[...REVIEWS, ...REVIEWS, ...REVIEWS].map((review, i) => (
            <ReviewCard key={i} review={review} colorIndex={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ===== FOOTER — UPGRADED =====
function Footer() {
  const socialLinks = [
    { label: "Facebook", href: "https://facebook.com/Drtrave", icon: <FacebookIcon />, color: "#1877F2" },
    { label: "Instagram", href: "https://instagram.com/drtravel_marsamatrouh", icon: <InstagramIcon />, color: "#E1306C" },
    { label: "TikTok", href: "https://tiktok.com/@drtravel.marsa.matrouh", icon: <TikTokIcon />, color: "#ffffff" },
  ];

  return (
    <footer id="footer" style={{ background: "#0D1B2A", borderTop: "1px solid rgba(0,170,255,0.2)", padding: "4rem 1.5rem 0" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2.5rem", marginBottom: "3rem" }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <img src={logoImg} alt="DR Travel" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, color: "#00AAFF", fontSize: "1rem" }}>DR TRAVEL</div>
                <div style={{ color: "#C0C0C0", fontSize: "0.7rem" }}>Yacht Tourism & Safari</div>
              </div>
            </div>
            <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.8, marginBottom: "1.25rem" }}>
              وجهتك الأولى للسياحة الفاخرة في مرسى مطروح. نقدم أفضل تجارب السفاري واليخوت والأنشطة البحرية.
            </p>
            {/* Social Icons */}
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {socialLinks.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer" title={s.label}
                  style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#C0C0C0", textDecoration: "none", transition: "all 0.3s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = s.color; (e.currentTarget as HTMLElement).style.color = "white"; (e.currentTarget as HTMLElement).style.borderColor = s.color; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${s.color}44`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#C0C0C0"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "#00AAFF", fontWeight: 700, fontSize: "1rem", marginBottom: "1.25rem" }}>اتصل بنا</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <a href="tel:+201205756024"
                style={{ color: "#C0C0C0", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.6rem", transition: "color 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00AAFF")} onMouseLeave={e => (e.currentTarget.style.color = "#C0C0C0")}>
                <span style={{ color: "#00AAFF" }}><PhoneIcon /></span> 01205756024
              </a>
              <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
                style={{ color: "#C0C0C0", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.6rem", transition: "color 0.3s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#25D366")} onMouseLeave={e => (e.currentTarget.style.color = "#C0C0C0")}>
                <span style={{ color: "#25D366" }}><WhatsAppIcon /></span> واتساب: 01205756024
              </a>
              <div style={{ color: "#C0C0C0", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ color: "#C9A84C" }}><LocationIcon /></span> مرسى مطروح، مصر
              </div>
            </div>
          </div>

          {/* Developer Contact */}
          <div>
            <h4 style={{ color: "#00AAFF", fontWeight: 700, fontSize: "1rem", marginBottom: "1.25rem" }}>للتواصل مع المطور</h4>
            <p style={{ color: "#C0C0C0", fontSize: "0.82rem", lineHeight: 1.7, marginBottom: "1rem" }}>
              هل تريد موقعاً مثل هذا لمشروعك؟ تواصل معنا الآن وسنبني لك تجربة رقمية احترافية.
            </p>
            <a href="https://wa.me/201007752842?text=مرحباً، رأيت موقع DR Travel وأريد الاستفسار عن تصميم موقع مشابه"
              target="_blank" rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "linear-gradient(135deg, #25D366, #128C4E)", color: "white", padding: "0.65rem 1.25rem", borderRadius: "50px", fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", fontFamily: "Cairo, sans-serif", transition: "all 0.3s", boxShadow: "0 4px 16px rgba(37,211,102,0.3)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(37,211,102,0.45)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(37,211,102,0.3)"; }}>
              <WhatsAppIcon /> تواصل مع المطور
            </a>
          </div>

        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "1.25rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <p style={{ color: "#555", fontSize: "0.8rem", margin: 0 }}>© 2026 DR Travel — جميع الحقوق محفوظة</p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {["💳 Visa", "💳 Mastercard", "💳 Meeza"].map(p => (
              <span key={p} style={{ color: "#555", fontSize: "0.8rem", background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.7rem", borderRadius: "6px" }}>{p}</span>
            ))}
          </div>
          <span style={{ color: "#555", fontSize: "0.8rem" }}></span>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFloat() {
  return (
    <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer" className="animate-pulse-green"
      style={{ position: "fixed", bottom: "2rem", left: "1.5rem", zIndex: 9998, background: "#25D366", color: "white", width: 58, height: 58, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxShadow: "0 4px 20px rgba(37, 211, 102, 0.5)", transition: "transform 0.3s ease" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      title="تواصل معنا على واتساب">
      <WhatsAppIcon />
    </a>
  );
}

export default function App() {
  const [selectedPackage, setSelectedPackage] = useState("");
  const handleBookPackage = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setTimeout(() => { document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };
  return (
    <div dir="rtl" lang="ar" style={{ fontFamily: "Cairo, sans-serif" }}>
      <Navbar />
      <Hero />
      <StatsBar />
      <Services />
      <Packages onBook={handleBookPackage} />
      <BookingForm defaultPackage={selectedPackage} />
      <WhyUs />
      <Reviews />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
