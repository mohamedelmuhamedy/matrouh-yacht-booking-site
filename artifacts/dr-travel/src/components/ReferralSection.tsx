import { useState, useEffect } from "react";
import { useLanguage } from "../LanguageContext";

interface CodeInfo {
  code: string; nameAr: string; nameEn: string;
  usedCount: number; approvedCount: number; isActive: boolean;
}

const API = "/api";

export default function ReferralSection() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [phase, setPhase] = useState<"loading" | "found" | "register" | "none">("loading");
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [regForm, setRegForm] = useState({ nameAr: "", nameEn: "", phone: "" });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  /* ── load saved code on mount ── */
  useEffect(() => {
    const saved = localStorage.getItem("drtravel-referral-code");
    if (saved) {
      verifyCode(saved);
    } else {
      setPhase("none");
    }
  }, []);

  const verifyCode = async (code: string) => {
    setPhase("loading");
    try {
      const r = await fetch(`${API}/referral/verify?code=${encodeURIComponent(code)}`);
      if (r.ok) {
        const data = await r.json();
        setCodeInfo({
          code: data.code,
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          usedCount: data.usedCount ?? 0,
          approvedCount: data.approvedCount ?? 0,
          isActive: data.isActive ?? true,
        });
        localStorage.setItem("drtravel-referral-code", data.code);
        setPhase("found");
      } else {
        localStorage.removeItem("drtravel-referral-code");
        setPhase("none");
      }
    } catch {
      setPhase("none");
    }
  };

  const selfRegister = async () => {
    if (!regForm.nameAr.trim()) { setRegError(ar ? "الاسم مطلوب" : "Name required"); return; }
    setRegLoading(true);
    setRegError("");
    try {
      const r = await fetch(`${API}/referral/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regForm),
      });
      if (r.ok) {
        const data = await r.json();
        await verifyCode(data.code);
      } else {
        const err = await r.json().catch(() => ({}));
        setRegError(err.error || (ar ? "فشل التسجيل" : "Registration failed"));
      }
    } catch {
      setRegError(ar ? "خطأ في الاتصال" : "Connection error");
    }
    setRegLoading(false);
  };

  const copyCode = () => {
    if (!codeInfo) return;
    navigator.clipboard.writeText(codeInfo.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const waText = codeInfo
    ? (ar
      ? `مرحباً! 👋 استخدم كودي ${codeInfo.code} عند الحجز مع DR Travel واحصل على خصم خاص! 🎉`
      : `Hello! 👋 Use my code ${codeInfo.code} when booking with DR Travel for a special discount! 🎉`)
    : "";

  const T = {
    title: ar ? "برنامج الإحالة والمكافآت" : "Referral & Rewards Program",
    subtitle: ar ? "شارك DR Travel مع أصدقائك واحصل على مكافآت حصرية" : "Share DR Travel with friends and earn exclusive rewards",
    yourCode: ar ? "كود الإحالة الخاص بك" : "Your Referral Code",
    copy: ar ? "نسخ" : "Copy",
    copied: ar ? "✓ تم النسخ" : "✓ Copied",
    share: ar ? "شارك عبر واتساب" : "Share via WhatsApp",
    usedCount: ar ? "مرة استُخدم" : "times used",
    approvedCount: ar ? "مكافأة معتمدة" : "approved rewards",
    registerTitle: ar ? "احصل على كود الإحالة" : "Get Your Referral Code",
    registerSubtitle: ar ? "سجّل بياناتك واحصل على كودك الخاص فوراً" : "Register your info and get your code instantly",
    nameArLabel: ar ? "اسمك (عربي) *" : "Your Name (Arabic) *",
    nameEnLabel: ar ? "اسمك (إنجليزي)" : "Your Name (English)",
    phoneLabel: ar ? "رقم هاتفك" : "Your Phone Number",
    registerBtn: ar ? "احصل على كودي الآن" : "Get My Code Now",
    howTitle: ar ? "كيف يعمل؟" : "How It Works?",
    steps: ar
      ? ["شارك كودك مع أصدقائك أو عائلتك", "عند حجزهم بكودك تحصل على مكافأة", "الأدمن يوافق على مكافأتك وتستلمها"]
      : ["Share your code with friends or family", "When they book with your code, you earn a reward", "Admin approves your reward and you receive it"],
    perks: ar
      ? ["مكافأة نقدية أو خصم على حجزك القادم", "اعتماد المكافآت يدوياً من فريق DR Travel", "كود خاص بك بشكل دائم"]
      : ["Cash reward or discount on your next booking", "Rewards manually approved by DR Travel team", "A permanent personal code just for you"],
  };

  return (
    <section id="referral" style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg,#0a1520,#0D1B2A)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div className="section-label">✦ {ar ? "مكافآت وإحالة" : "Rewards & Referral"}</div>
          <h2 className="section-title">{T.title}</h2>
          <p className="section-subtitle">{T.subtitle}</p>
        </div>

        {phase === "loading" && (
          <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            <div style={{ fontFamily: "Cairo, sans-serif" }}>{ar ? "جاري التحميل..." : "Loading..."}</div>
          </div>
        )}

        {/* ── CODE FOUND: Show dashboard ── */}
        {phase === "found" && codeInfo && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>

            {/* Code card */}
            <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "20px", padding: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🎁</div>
                <div>
                  <div style={{ color: "white", fontWeight: 700 }}>{T.yourCode}</div>
                  <div style={{ color: "#667788", fontSize: "0.75rem" }}>{codeInfo.nameAr}</div>
                </div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", border: "1px dashed rgba(201,168,76,0.4)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.3rem", color: "#C9A84C", letterSpacing: "3px" }}>{codeInfo.code}</span>
                <button onClick={copyCode}
                  style={{ background: copied ? "rgba(37,211,102,0.2)" : "rgba(201,168,76,0.15)", border: `1px solid ${copied ? "rgba(37,211,102,0.4)" : "rgba(201,168,76,0.3)"}`, color: copied ? "#25D366" : "#C9A84C", padding: "0.4rem 0.85rem", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "Cairo, sans-serif", transition: "all 0.2s" }}>
                  {copied ? T.copied : T.copy}
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
                <div style={{ background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.15)", borderRadius: "12px", padding: "0.85rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#00AAFF", fontFamily: "Montserrat, sans-serif" }}>{codeInfo.usedCount}</div>
                  <div style={{ color: "#667788", fontSize: "0.72rem", marginTop: "0.15rem" }}>{T.usedCount}</div>
                </div>
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: "12px", padding: "0.85rem", textAlign: "center" }}>
                  <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#10B981", fontFamily: "Montserrat, sans-serif" }}>{codeInfo.approvedCount}</div>
                  <div style={{ color: "#667788", fontSize: "0.72rem", marginTop: "0.15rem" }}>{T.approvedCount}</div>
                </div>
              </div>

              <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.85rem", borderRadius: "12px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem", fontFamily: "Cairo, sans-serif" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {T.share}
              </a>
            </div>

            {/* How it works + perks */}
            <div>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "1.75rem", marginBottom: "1rem" }}>
                <div style={{ color: "white", fontWeight: 700, marginBottom: "1.25rem" }}>⚙️ {T.howTitle}</div>
                {T.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.85rem", marginBottom: "0.9rem", alignItems: "flex-start" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.3)", color: "#00AAFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.78rem", flexShrink: 0, fontFamily: "Montserrat, sans-serif" }}>{i + 1}</div>
                    <div style={{ color: "#8899aa", fontSize: "0.84rem", lineHeight: 1.6, paddingTop: "0.2rem" }}>{step}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: "20px", padding: "1.5rem" }}>
                <div style={{ color: "#C9A84C", fontWeight: 700, marginBottom: "1rem" }}>🏆 {ar ? "مزايا الكود" : "Code Benefits"}</div>
                {T.perks.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", alignItems: "flex-start" }}>
                    <span style={{ color: "#C9A84C", fontSize: "0.9rem", flexShrink: 0, marginTop: "0.05rem" }}>✦</span>
                    <span style={{ color: "#8899aa", fontSize: "0.83rem", lineHeight: 1.5 }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NO CODE: show registration form ── */}
        {(phase === "none" || phase === "register") && (
          <div style={{ maxWidth: "540px", margin: "0 auto" }}>
            <div style={{ background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.15)", borderRadius: "24px", padding: "2.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎁</div>
              <h3 style={{ color: "white", fontWeight: 800, fontSize: "1.2rem", margin: "0 0 0.5rem" }}>{T.registerTitle}</h3>
              <p style={{ color: "#667788", fontSize: "0.88rem", margin: "0 0 2rem", lineHeight: 1.7 }}>{T.registerSubtitle}</p>

              <div style={{ display: "grid", gap: "0.85rem", textAlign: "right" }}>
                <div>
                  <label style={{ display: "block", color: "#8899aa", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>{T.nameArLabel}</label>
                  <input className="form-input" placeholder={ar ? "اسمك الكامل بالعربي" : "اسمك الكامل بالعربي"}
                    value={regForm.nameAr} onChange={e => setRegForm(p => ({ ...p, nameAr: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#8899aa", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>{T.nameEnLabel}</label>
                  <input className="form-input" style={{ direction: "ltr" }} placeholder="Your full name in English"
                    value={regForm.nameEn} onChange={e => setRegForm(p => ({ ...p, nameEn: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#8899aa", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.4rem" }}>{T.phoneLabel}</label>
                  <input className="form-input" type="tel" placeholder="01xxxxxxxxx"
                    value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>

              {regError && (
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "0.6rem 1rem", marginTop: "1rem", color: "#FCA5A5", fontSize: "0.83rem" }}>
                  ⚠️ {regError}
                </div>
              )}

              <button onClick={selfRegister} disabled={regLoading}
                style={{ width: "100%", marginTop: "1.5rem", background: regLoading ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "12px", padding: "1rem", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "1rem", cursor: regLoading ? "not-allowed" : "pointer", transition: "all 0.3s" }}>
                {regLoading ? (ar ? "⏳ جاري التسجيل..." : "⏳ Registering...") : T.registerBtn}
              </button>

              <p style={{ color: "#44556699", fontSize: "0.75rem", marginTop: "1.25rem", lineHeight: 1.6 }}>
                {ar ? "بالتسجيل توافق على استخدام كودك حصرياً لإحالة الأصدقاء لـ DR Travel" : "By registering you agree to use your code exclusively for referring friends to DR Travel"}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
