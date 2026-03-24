import { useState } from "react";
import { useLanguage } from "../LanguageContext";

interface LoyaltyLevel {
  nameAr: string;
  nameEn: string;
  icon: string;
  minReferrals: number;
  discountAr: string;
  discountEn: string;
  color: string;
  perks: { ar: string; en: string }[];
}

const LEVELS: LoyaltyLevel[] = [
  {
    nameAr: "عميل جديد",
    nameEn: "New Member",
    icon: "🌟",
    minReferrals: 0,
    discountAr: "٥٪ خصم على أول حجز",
    discountEn: "5% off your first booking",
    color: "#667788",
    perks: [
      { ar: "خصم ٥٪ على الباقة الأولى", en: "5% off first package" },
      { ar: "أولوية الرد على واتساب", en: "Priority WhatsApp support" },
    ],
  },
  {
    nameAr: "عميل مميز",
    nameEn: "Premium Member",
    icon: "💎",
    minReferrals: 3,
    discountAr: "١٠٪ خصم + هدية ترحيب",
    discountEn: "10% off + welcome gift",
    color: "#00AAFF",
    perks: [
      { ar: "خصم ١٠٪ على جميع الباقات", en: "10% off all packages" },
      { ar: "هدية ترحيب مجانية", en: "Free welcome gift" },
      { ar: "أولوية الحجز في المواسم", en: "Priority booking in season" },
    ],
  },
  {
    nameAr: "VIP Traveler",
    nameEn: "VIP Traveler",
    icon: "👑",
    minReferrals: 8,
    discountAr: "١٥٪ خصم + تجربة خاصة",
    discountEn: "15% off + exclusive experience",
    color: "#C9A84C",
    perks: [
      { ar: "خصم ١٥٪ على جميع الباقات", en: "15% off all packages" },
      { ar: "تجربة VIP حصرية", en: "Exclusive VIP experience" },
      { ar: "مرشد خاص لك", en: "Private dedicated guide" },
      { ar: "إفطار مجاني في رحلات الإقامة", en: "Free breakfast on stay trips" },
    ],
  },
];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "DRT-";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function ReferralSection() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [code] = useState(() => {
    const saved = localStorage.getItem("drtravel-referral-code");
    if (saved) return saved;
    const c = generateCode();
    localStorage.setItem("drtravel-referral-code", c);
    return c;
  });
  const [copied, setCopied] = useState(false);
  const mockReferrals = 1;
  const mockBalance = 350;

  const currentLevel = LEVELS.reduce((acc, level) =>
    mockReferrals >= level.minReferrals ? level : acc, LEVELS[0]);
  const nextLevel = LEVELS.find(l => l.minReferrals > mockReferrals);

  const T = {
    title: ar ? "برنامج الإحالة والولاء" : "Referral & Loyalty Program",
    subtitle: ar ? "شارك DR Travel مع أصدقائك واحصل على مكافآت حصرية" : "Share DR Travel with friends and earn exclusive rewards",
    yourCode: ar ? "كود الإحالة الخاص بك" : "Your Referral Code",
    copy: ar ? "انسخ" : "Copy",
    copied: ar ? "تم النسخ ✓" : "Copied ✓",
    share: ar ? "شارك عبر واتساب" : "Share via WhatsApp",
    yourStats: ar ? "إحصائياتك" : "Your Stats",
    referrals: ar ? "إحالة" : "Referrals",
    balance: ar ? "رصيدك" : "Your Balance",
    egp: ar ? "ج.م" : "EGP",
    currentLevel: ar ? "مستواك الحالي" : "Current Level",
    nextLevel: ar ? "المستوى التالي" : "Next Level",
    referralsNeeded: ar ? "إحالات للترقية" : "referrals to upgrade",
    perks: ar ? "المزايا" : "Perks",
    levels: ar ? "مستويات البرنامج" : "Program Levels",
    howItWorks: ar ? "كيف يعمل؟" : "How It Works?",
    steps: ar
      ? ["شارك كودك مع أصدقائك أو عائلتك", "عند حجز أي باقة بكودك، تحصل على مكافأة", "تراكم المكافآت وارتقِ للمستوى التالي"]
      : ["Share your code with friends or family", "When they book using your code, you earn a reward", "Accumulate rewards and level up"],
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const waText = ar
    ? `مرحباً! 👋 استخدم كودي ${code} عند الحجز مع DR Travel واحصل على خصم خاص! 🎉 www.drtravel.com`
    : `Hello! 👋 Use my code ${code} when booking with DR Travel to get a special discount! 🎉 www.drtravel.com`;

  return (
    <section id="referral" style={{ padding: "6rem 1.5rem", background: "linear-gradient(180deg,#0a1520,#0D1B2A)" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div className="section-label">✦ {ar ? "مكافآت وولاء" : "Rewards & Loyalty"}</div>
          <h2 className="section-title">{T.title}</h2>
          <p className="section-subtitle">{T.subtitle}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>

          {/* Referral code card */}
          <div style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: "20px", padding: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(201,168,76,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem" }}>🎁</div>
              <div style={{ color: "white", fontWeight: 700 }}>{T.yourCode}</div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.3)", border: "1px dashed rgba(201,168,76,0.4)", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.3rem", color: "#C9A84C", letterSpacing: "3px" }}>{code}</span>
              <button onClick={copyCode}
                style={{ background: copied ? "rgba(37,211,102,0.2)" : "rgba(201,168,76,0.15)", border: `1px solid ${copied ? "rgba(37,211,102,0.4)" : "rgba(201,168,76,0.3)"}`, color: copied ? "#25D366" : "#C9A84C", padding: "0.4rem 0.85rem", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "Cairo, sans-serif", transition: "all 0.2s" }}>
                {copied ? T.copied : T.copy}
              </button>
            </div>

            <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", background: "linear-gradient(135deg,#25D366,#128C4E)", color: "white", padding: "0.85rem", borderRadius: "12px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem", fontFamily: "Cairo, sans-serif" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {T.share}
            </a>
          </div>

          {/* Stats + level card */}
          <div style={{ background: `${currentLevel.color}08`, border: `1px solid ${currentLevel.color}25`, borderRadius: "20px", padding: "2rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: currentLevel.color, fontFamily: "Montserrat, sans-serif" }}>{mockReferrals}</div>
                <div style={{ color: "#667788", fontSize: "0.78rem" }}>{T.referrals}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#C9A84C", fontFamily: "Montserrat, sans-serif" }}>{mockBalance}</div>
                <div style={{ color: "#667788", fontSize: "0.78rem" }}>{T.balance} ({T.egp})</div>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ color: "#667788", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{T.currentLevel}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>{currentLevel.icon}</span>
                <span style={{ color: currentLevel.color, fontWeight: 800, fontSize: "1rem" }}>{ar ? currentLevel.nameAr : currentLevel.nameEn}</span>
              </div>
            </div>

            {nextLevel && (
              <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ color: "#667788", fontSize: "0.72rem", marginBottom: "0.25rem" }}>{T.nextLevel}: {ar ? nextLevel.nameAr : nextLevel.nameEn} {nextLevel.icon}</div>
                <div style={{ color: "#aabbcc", fontSize: "0.78rem" }}>{nextLevel.minReferrals - mockReferrals} {T.referralsNeeded}</div>
              </div>
            )}

            <div>
              <div style={{ color: "#667788", fontSize: "0.72rem", marginBottom: "0.5rem" }}>{T.perks}:</div>
              {currentLevel.perks.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#8899aa", fontSize: "0.78rem", marginBottom: "0.3rem" }}>
                  <span style={{ color: currentLevel.color }}>✓</span> {ar ? p.ar : p.en}
                </div>
              ))}
            </div>
          </div>

          {/* Loyalty levels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
            <div style={{ color: "white", fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.25rem" }}>{T.levels}</div>
            {LEVELS.map((level, i) => (
              <div key={i} style={{ background: level === currentLevel ? `${level.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${level === currentLevel ? `${level.color}40` : "rgba(255,255,255,0.06)"}`, borderRadius: "14px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <span style={{ fontSize: "1.5rem" }}>{level.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: level.color, fontWeight: 700, fontSize: "0.9rem" }}>{ar ? level.nameAr : level.nameEn}</div>
                  <div style={{ color: "#667788", fontSize: "0.75rem" }}>{ar ? level.discountAr : level.discountEn}</div>
                </div>
                {level === currentLevel && <div style={{ background: level.color, color: "#0D1B2A", fontSize: "0.65rem", fontWeight: 800, padding: "0.2rem 0.6rem", borderRadius: "50px" }}>{ar ? "مستواك" : "Your Level"}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginTop: "2.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.5rem 2rem" }}>
          <div style={{ color: "white", fontWeight: 700, marginBottom: "1.25rem" }}>{T.howItWorks}</div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {T.steps.map((step, i) => (
              <div key={i} style={{ flex: "1 1 200px", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(0,170,255,0.15)", border: "1px solid rgba(0,170,255,0.3)", color: "#00AAFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "0.8rem", flexShrink: 0, fontFamily: "Montserrat, sans-serif" }}>{i + 1}</div>
                <div style={{ color: "#8899aa", fontSize: "0.83rem", lineHeight: 1.7 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
