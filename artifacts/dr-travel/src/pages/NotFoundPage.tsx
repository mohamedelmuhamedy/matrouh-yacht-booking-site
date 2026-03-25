import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import logoImg from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";

export default function NotFoundPage() {
  const [, navigate] = useLocation();
  const { lang } = useLanguage();
  const ar = lang === "ar";

  return (
    <div style={{
      minHeight: "100vh", background: "#0D1B2A", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "Cairo, sans-serif", direction: ar ? "rtl" : "ltr",
      padding: "2rem",
    }}>
      <div style={{ textAlign: "center", maxWidth: "500px" }}>
        <img src={logoImg} alt="DR Travel" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: "1.5rem", border: "2px solid rgba(0,170,255,0.4)" }} />

        <div style={{ fontSize: "6rem", fontWeight: 900, color: "#00AAFF", fontFamily: "Montserrat, sans-serif", lineHeight: 1, marginBottom: "0.5rem" }}>
          404
        </div>
        <h1 style={{ color: "white", fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.75rem" }}>
          {ar ? "الصفحة غير موجودة" : "Page Not Found"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem", lineHeight: 1.8, marginBottom: "2rem" }}>
          {ar
            ? "عذراً، الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها."
            : "Sorry, the page you're looking for doesn't exist or may have been moved."}
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/")}
            style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.85rem 2rem", borderRadius: "12px", fontWeight: 700, fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
            {ar ? "🏠 الرئيسية" : "🏠 Home"}
          </button>
          <button onClick={() => navigate("/#packages")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", padding: "0.85rem 2rem", borderRadius: "12px", fontWeight: 600, fontSize: "1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif" }}>
            {ar ? "🏖️ الباقات" : "🏖️ Packages"}
          </button>
        </div>
      </div>
    </div>
  );
}
