import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import ReferralSection from "../components/ReferralSection";
import logoImg from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";
import CurrencySwitcher from "../components/CurrencySwitcher";
import AIAssistant from "../components/AIAssistant";

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}

function RewardsNavbar() {
  const { t, lang, setLang } = useLanguage();
  const [, navigate] = useLocation();
  const ar = lang === "ar";

  return (
    <nav className="navbar scrolled" style={{ position: "sticky", top: 0, zIndex: 1000 }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", cursor: "pointer" }} onClick={() => navigate("/")}>
          <div style={{ position: "relative" }}>
            <img src={logoImg} alt="DR Travel" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(0,170,255,0.5)", boxShadow: "0 0 16px rgba(0,170,255,0.3)" }} />
            <span style={{ position: "absolute", bottom: 0, left: 0, width: 11, height: 11, borderRadius: "50%", background: "#25D366", border: "2px solid #0a1520" }} />
          </div>
          <div>
            <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "0.95rem", color: "#00AAFF", letterSpacing: "1.5px", lineHeight: 1.1 }}>DR TRAVEL</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)" }}>Yousef Mostafa</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => navigate("/")}
            className="nav-link"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", fontWeight: 600 }}>
            {ar ? "الرئيسية" : "Home"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "50px", padding: "0.3rem 0.85rem" }}>
            <span style={{ fontSize: "0.85rem" }}>🎁</span>
            <span style={{ color: "#C9A84C", fontSize: "0.82rem", fontWeight: 700 }}>
              {ar ? "المكافآت والإحالة" : "Rewards & Referral"}
            </span>
          </div>

          <CurrencySwitcher />

          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.25)", borderRadius: "8px", padding: "0.35rem 0.65rem", cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
            <GlobeIcon />
            {t.langSwitcher.label}
          </button>

          <a href="https://wa.me/201205756024" target="_blank" rel="noreferrer"
            style={{ background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.5rem 1rem", borderRadius: "50px", fontWeight: 700, fontSize: "0.82rem", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <WhatsAppIcon />
            {ar ? "تواصل" : "WhatsApp"}
          </a>
        </div>
      </div>
    </nav>
  );
}

export default function RewardsPage() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div dir={t.dir} lang={t.lang} style={{ fontFamily: "Cairo, sans-serif", minHeight: "100vh", background: "#060d16" }}>
      <RewardsNavbar />

      {/* Page header */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 2rem", background: "linear-gradient(180deg,#0a1520,#0D1B2A)" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.6rem", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "50px", padding: "0.4rem 1.25rem", marginBottom: "1.5rem" }}>
          <span>🎁</span>
          <span style={{ color: "#C9A84C", fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1px" }}>
            {t.lang === "ar" ? "برنامج المكافآت" : "REWARDS PROGRAM"}
          </span>
        </div>
        <button
          onClick={() => navigate("/")}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", margin: "0 auto 1rem" }}>
          {t.lang === "ar" ? "→ العودة للرئيسية" : "← Back to Home"}
        </button>
      </div>

      <ReferralSection />

      {/* Simple footer */}
      <div style={{ textAlign: "center", padding: "2rem 1.5rem", background: "#060d16", borderTop: "1px solid rgba(255,255,255,0.06)", color: "#2a3845", fontSize: "0.8rem" }}>
        © 2024 DR Travel — Marsa Matruh, Egypt
      </div>

      <AIAssistant />
    </div>
  );
}
