import { useEffect, useRef, useState } from "react";

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
  { name: "أحمد محمد", initials: "أم", review: "تجربة رائعة جداً! السفاري كانت مذهلة والفريق محترف للغاية. سنعود بالتأكيد!", stars: 5 },
  { name: "فاطمة علي", initials: "فع", review: "رحلة اليخت كانت حلماً! المنظر من البحر لا يُوصف. شكراً DR Travel على هذه الذكرى الجميلة.", stars: 5 },
  { name: "عمر حسين", initials: "عح", review: "أفضل سعر وأفضل خدمة. البراشوت كانت تجربة لا تُنسى فوق البحر الأبيض المتوسط.", stars: 5 },
  { name: "نور الدين", initials: "نر", review: "عائلتي استمتعت جداً بالباقة الشاملة. الأولاد مبسوطين جداً من الأكوا بارك والألعاب المائية.", stars: 5 },
  { name: "سارة أحمد", initials: "سأ", review: "خدمة ممتازة ومحترفة. الحجز كان سهل والفريق رد على كل استفساراتنا بسرعة عبر واتساب.", stars: 5 },
  { name: "محمود عبد الله", initials: "مع", review: "جربت الباقة الكاملة مع أصحابي وكانت أجمل تجربة في حياتنا. مرسى مطروح جنة!", stars: 5 },
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
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
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
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref}>{count.toLocaleString("ar-EG")}</span>;
}

function FadeInSection({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, isVisible } = useIntersectionObserver();
  return (
    <div
      ref={ref}
      className={`fade-in-up ${isVisible ? "visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
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
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #00AAFF, #0D1B2A)",
            border: "2px solid #00AAFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", flexShrink: 0
          }}>🚢</div>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: "1rem", color: "#00AAFF", letterSpacing: "1px", whiteSpace: "nowrap" }}>DR TRAVEL</div>
            <div style={{ fontSize: "0.65rem", color: "#C0C0C0", whiteSpace: "nowrap" }}>Yacht Tourism & Safari</div>
          </div>
        </div>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                style={{
                  background: "none", border: "none", color: "#ffffff", fontSize: "0.9rem",
                  cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600,
                  transition: "color 0.3s", padding: "0.25rem 0", whiteSpace: "nowrap"
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00AAFF")}
                onMouseLeave={e => (e.currentTarget.style.color = "#ffffff")}
              >
                {link.label}
              </button>
            ))}
            <a
              href="https://wa.me/201205756024"
              target="_blank"
              rel="noreferrer"
              style={{
                background: "#25D366", color: "white", padding: "0.5rem 1.25rem",
                borderRadius: "50px", fontWeight: 700, fontSize: "0.85rem",
                textDecoration: "none", fontFamily: "Montserrat, sans-serif",
                display: "flex", alignItems: "center", gap: "0.4rem", whiteSpace: "nowrap",
                transition: "transform 0.3s"
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <span>📱</span> واتساب
            </a>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: "5px", padding: "5px", flexShrink: 0 }}
          >
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", transform: menuOpen ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", opacity: menuOpen ? 0 : 1 }} />
            <span style={{ width: 24, height: 2, background: "white", display: "block", transition: "all 0.3s", transform: menuOpen ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{ background: "rgba(13,27,42,0.98)", borderTop: "1px solid rgba(0,170,255,0.2)", padding: "0.5rem 1rem 1rem" }}>
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              style={{
                display: "block", width: "100%", background: "none", border: "none",
                color: "white", padding: "0.75rem 0.5rem", fontSize: "1rem",
                cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, textAlign: "right",
                borderBottom: "1px solid rgba(255,255,255,0.07)"
              }}
            >
              {link.label}
            </button>
          ))}
          <a
            href="https://wa.me/201205756024"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "block", background: "#25D366", color: "white", padding: "0.75rem 1rem",
              borderRadius: "10px", fontWeight: 700, textDecoration: "none", textAlign: "center",
              marginTop: "0.75rem", fontFamily: "Cairo, sans-serif"
            }}
          >
            📱 تواصل على واتساب
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
        {/* Logo */}
        <div className="animate-float" style={{ marginBottom: "1.5rem" }}>
          <div style={{
            width: 110, height: 110, borderRadius: "50%", margin: "0 auto",
            background: "linear-gradient(135deg, #00AAFF 0%, #0D1B2A 100%)",
            border: "3px solid #00AAFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "3rem", boxShadow: "0 0 30px rgba(0, 170, 255, 0.4)"
          }}>🚢</div>
        </div>

        <h1 className="hero-title" style={{ fontSize: "3rem", fontWeight: 900, color: "white", marginBottom: "1rem", lineHeight: 1.3 }}>
          اكتشف جمال مرسى مطروح
        </h1>

        <p style={{ fontSize: "1.25rem", color: "#00AAFF", fontWeight: 700, marginBottom: "2.5rem", letterSpacing: "0.5px" }}>
          سفاري | يخت | ألعاب مائية | رحلات بحرية
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="#booking"
            onClick={e => { e.preventDefault(); document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" }); }}
            style={{
              background: "linear-gradient(135deg, #C9A84C, #e8c76b)",
              color: "#0D1B2A", padding: "0.9rem 2.5rem", borderRadius: "50px",
              fontWeight: 800, fontSize: "1.05rem", textDecoration: "none",
              fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease",
              boxShadow: "0 4px 20px rgba(201, 168, 76, 0.4)"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            احجز الآن 🚀
          </a>
          <a
            href="https://wa.me/201205756024"
            target="_blank"
            rel="noreferrer"
            style={{
              background: "#25D366", color: "white", padding: "0.9rem 2.5rem", borderRadius: "50px",
              fontWeight: 800, fontSize: "1.05rem", textDecoration: "none",
              fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease",
              boxShadow: "0 4px 20px rgba(37, 211, 102, 0.4)"
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            تواصل على واتساب 📱
          </a>
        </div>
      </div>

      {/* Wave divider */}
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
                <AnimatedCounter target={stat.count} />
                {stat.label}
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
                  <div style={{
                    position: "absolute", top: "1rem", left: "1rem",
                    background: pkg.badgeColor, color: pkg.featured ? "#0D1B2A" : "white",
                    padding: "0.3rem 0.8rem", borderRadius: "50px", fontSize: "0.75rem", fontWeight: 700
                  }}>
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
                  <p style={{ color: "#C0C0C0", fontSize: "0.75rem", marginBottom: "1rem", lineHeight: 1.5 }}>
                    للاستفسار والتخصيص تواصل معنا على واتساب
                  </p>
                  <button
                    onClick={() => onBook(pkg.name)}
                    style={{
                      width: "100%", background: pkg.featured ? "linear-gradient(135deg, #C9A84C, #e8c76b)" : "#00AAFF",
                      color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: "0.8rem",
                      borderRadius: "10px", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
                      fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease"
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.3)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                  >
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
  const [form, setForm] = useState({
    name: "", phone: "", package: defaultPackage || "", date: "",
    adults: "1", children: "0", infants: "0", notes: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showModal, setShowModal] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  useEffect(() => {
    if (defaultPackage) setForm(f => ({ ...f, package: defaultPackage }));
  }, [defaultPackage]);

  useEffect(() => {
    const pkg = PACKAGES.find(p => p.name === form.package);
    const adults = parseInt(form.adults) || 1;
    if (pkg) {
      setEstimatedPrice(pkg.priceNum * adults);
    } else {
      setEstimatedPrice(0);
    }
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
    if (Object.keys(newErrors).length === 0) {
      setShowModal(true);
    }
  };

  const waMessage = encodeURIComponent(
    `مرحباً، أريد حجز رحلة 🚀\n` +
    `الاسم: ${form.name}\n` +
    `الهاتف: ${form.phone}\n` +
    `الباقة: ${form.package}\n` +
    `التاريخ: ${form.date}\n` +
    `البالغون: ${form.adults} | الأطفال: ${form.children} | الرضع: ${form.infants}\n` +
    (form.notes ? `ملاحظات: ${form.notes}` : "")
  );

  const inputStyle = (field: string) => ({
    ...{} as React.CSSProperties,
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
                {/* Name */}
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>الاسم الكامل *</label>
                  <input
                    type="text"
                    style={inputStyle("name")}
                    placeholder="مثال: محمد أحمد"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.name ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }}
                  />
                  {errors.name && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>رقم الهاتف *</label>
                  <input
                    type="tel"
                    style={inputStyle("phone")}
                    placeholder="01X XXXX XXXX"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.phone ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }}
                  />
                  {errors.phone && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.phone}</p>}
                </div>

                {/* Package */}
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>الباقة المطلوبة *</label>
                  <select
                    style={{ ...inputStyle("package"), cursor: "pointer" }}
                    value={form.package}
                    onChange={e => setForm({ ...form, package: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.package ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }}
                  >
                    <option value="">اختر الباقة</option>
                    {PACKAGES.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    <option value="أخرى">أخرى (اكتب في الملاحظات)</option>
                  </select>
                  {errors.package && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.package}</p>}
                </div>

                {/* Date */}
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>تاريخ الرحلة *</label>
                  <input
                    type="date"
                    style={{ ...inputStyle("date"), colorScheme: "dark" }}
                    min={today}
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.date ? "#ff6b6b" : "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }}
                  />
                  {errors.date && <p style={{ color: "#ff6b6b", fontSize: "0.8rem", marginTop: "0.3rem" }}>{errors.date}</p>}
                </div>

                {/* People counts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.8rem", marginBottom: "0.4rem", fontWeight: 600 }}>بالغون *</label>
                    <input type="number" min="1" style={inputStyle("adults")} value={form.adults}
                      onChange={e => setForm({ ...form, adults: e.target.value })}
                      onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }} />
                    {errors.adults && <p style={{ color: "#ff6b6b", fontSize: "0.75rem", marginTop: "0.2rem" }}>{errors.adults}</p>}
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.8rem", marginBottom: "0.4rem", fontWeight: 600 }}>أطفال 6-12</label>
                    <input type="number" min="0" style={inputStyle("")} value={form.children}
                      onChange={e => setForm({ ...form, children: e.target.value })}
                      onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }} />
                  </div>
                  <div>
                    <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.8rem", marginBottom: "0.4rem", fontWeight: 600 }}>رضع 0-5</label>
                    <input type="number" min="0" style={inputStyle("")} value={form.infants}
                      onChange={e => setForm({ ...form, infants: e.target.value })}
                      onFocus={e => { e.target.style.borderColor = "#00AAFF"; }}
                      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; }} />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: "block", color: "#C0C0C0", fontSize: "0.85rem", marginBottom: "0.4rem", fontWeight: 600 }}>ملاحظات إضافية</label>
                  <textarea
                    style={{ ...inputStyle(""), minHeight: "100px", resize: "vertical" as const }}
                    placeholder="أي طلبات خاصة أو استفسارات..."
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.15)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.2)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Price estimator */}
                {estimatedPrice > 0 && (
                  <div style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.3)", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
                    <span style={{ color: "#C0C0C0", fontSize: "0.9rem" }}>السعر التقديري: </span>
                    <span style={{ color: "#00AAFF", fontSize: "1.25rem", fontWeight: 800 }}>
                      {estimatedPrice.toLocaleString("ar-EG")} جنيه
                    </span>
                    <span style={{ color: "#C0C0C0", fontSize: "0.75rem", display: "block", marginTop: "0.25rem" }}>* سعر تقريبي للبالغين فقط</span>
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    width: "100%", background: "linear-gradient(135deg, #C9A84C, #e8c76b)",
                    color: "#0D1B2A", border: "none", padding: "1rem",
                    borderRadius: "12px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer",
                    fontFamily: "Cairo, sans-serif", transition: "all 0.3s ease",
                    boxShadow: "0 4px 20px rgba(201, 168, 76, 0.3)"
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(201, 168, 76, 0.5)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(201, 168, 76, 0.3)"; }}
                >
                  احجز الآن 🚀
                </button>
              </div>
            </form>
          </div>
        </FadeInSection>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", marginBottom: "0.75rem" }}>
              تم استلام طلبك!
            </h3>
            <p style={{ color: "#C0C0C0", fontSize: "1rem", marginBottom: "2rem", lineHeight: 1.7 }}>
              شكراً {form.name}! سنتواصل معك خلال ساعة على الرقم {form.phone}
            </p>
            <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
              <a
                href={`https://wa.me/201205756024?text=${waMessage}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#25D366", color: "white", padding: "0.9rem 1.5rem",
                  borderRadius: "12px", fontWeight: 700, textDecoration: "none",
                  fontSize: "1rem", fontFamily: "Cairo, sans-serif", display: "block", textAlign: "center"
                }}
              >
                📱 تأكيد الحجز عبر واتساب
              </a>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "#C0C0C0",
                  padding: "0.75rem 1.5rem", borderRadius: "12px", cursor: "pointer",
                  fontFamily: "Cairo, sans-serif", fontSize: "0.9rem"
                }}
              >
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

function Reviews() {
  const doubled = [...REVIEWS, ...REVIEWS];

  return (
    <section style={{ padding: "5rem 0", background: "#0a1520", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem" }}>
        <FadeInSection>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 className="section-title">آراء عملائنا</h2>
            <p className="section-subtitle">ما يقوله عملاؤنا عن تجربتهم معنا</p>
          </div>
        </FadeInSection>
      </div>

      <div style={{ overflow: "hidden", padding: "1rem 0" }}>
        <div className="reviews-track">
          {doubled.map((review, i) => (
            <div key={i} className="review-card">
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "linear-gradient(135deg, #00AAFF, #0078cc)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.9rem", fontWeight: 700, color: "white", flexShrink: 0
                }}>
                  {review.initials}
                </div>
                <div>
                  <div style={{ color: "white", fontWeight: 700, fontSize: "0.95rem" }}>{review.name}</div>
                  <div style={{ color: "#FFD700", fontSize: "0.85rem" }}>{"⭐".repeat(review.stars)}</div>
                </div>
              </div>
              <p style={{ color: "#C0C0C0", fontSize: "0.9rem", lineHeight: 1.7 }}>{review.review}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="footer" style={{ background: "#0D1B2A", borderTop: "1px solid rgba(0,170,255,0.2)", padding: "4rem 1.5rem 0" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2.5rem", marginBottom: "3rem" }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg, #00AAFF, #0D1B2A)",
                border: "2px solid #00AAFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem"
              }}>🚢</div>
              <div>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, color: "#00AAFF", fontSize: "1rem" }}>DR TRAVEL</div>
                <div style={{ color: "#C0C0C0", fontSize: "0.7rem" }}>Yacht Tourism & Safari</div>
              </div>
            </div>
            <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.8, marginBottom: "1rem" }}>
              وجهتك الأولى للسياحة الفاخرة في مرسى مطروح. نقدم أفضل تجارب السفاري واليخوت والأنشطة البحرية.
            </p>
            <p style={{ color: "#555", fontSize: "0.8rem" }}>© 2025 DR Travel. جميع الحقوق محفوظة</p>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: "#00AAFF", fontWeight: 700, fontSize: "1rem", marginBottom: "1.25rem" }}>اتصل بنا</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <a href="tel:+201205756024" style={{ color: "#C0C0C0", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#00AAFF")} onMouseLeave={e => (e.currentTarget.style.color = "#C0C0C0")}>
                📞 01205756024
              </a>
              <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
                style={{ color: "#C0C0C0", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#25D366")} onMouseLeave={e => (e.currentTarget.style.color = "#C0C0C0")}>
                📱 واتساب: 01205756024
              </a>
              <div style={{ color: "#C0C0C0", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                📍 مرسى مطروح، مصر
              </div>
            </div>
          </div>

          {/* Social */}
          <div>
            <h4 style={{ color: "#00AAFF", fontWeight: 700, fontSize: "1rem", marginBottom: "1.25rem" }}>تابعنا</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[
                { label: "Facebook", href: "https://facebook.com/Drtrave", icon: "👍" },
                { label: "Instagram", href: "https://instagram.com/drtravel_marsamatrouh", icon: "📸" },
                { label: "TikTok", href: "https://tiktok.com/@drtravel.marsa.matrouh", icon: "🎵" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                  style={{ color: "#C0C0C0", textDecoration: "none", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem", transition: "color 0.3s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#00AAFF")} onMouseLeave={e => (e.currentTarget.style.color = "#C0C0C0")}>
                  {s.icon} {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "1.25rem 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {["💳 Visa", "💳 Mastercard", "💳 Meeza"].map(p => (
              <span key={p} style={{ color: "#555", fontSize: "0.8rem", background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.7rem", borderRadius: "6px" }}>{p}</span>
            ))}
          </div>
          <span style={{ color: "#555", fontSize: "0.8rem" }}>صُمِّم بـ ❤️ لمرسى مطروح</span>
        </div>
      </div>
    </footer>
  );
}

function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/201205756024"
      target="_blank"
      rel="noreferrer"
      className="animate-pulse-green"
      style={{
        position: "fixed", bottom: "2rem", left: "1.5rem", zIndex: 9998,
        background: "#25D366", color: "white", width: 58, height: 58, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.75rem", textDecoration: "none",
        boxShadow: "0 4px 20px rgba(37, 211, 102, 0.5)",
        transition: "transform 0.3s ease"
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      title="تواصل معنا على واتساب"
    >
      📱
    </a>
  );
}

export default function App() {
  const [selectedPackage, setSelectedPackage] = useState("");

  const handleBookPackage = (pkgName: string) => {
    setSelectedPackage(pkgName);
    setTimeout(() => {
      document.querySelector("#booking")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
