import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../LanguageContext";
import { useCurrency } from "../context/CurrencyContext";
import { PACKAGES_DATA, type PackageData } from "../data/packages";
import { formatPrice } from "../data/currencies";

interface Message {
  from: "bot" | "user";
  text: string;
  options?: string[];
  packages?: PackageData[];
}

interface UserAnswers {
  groupType?: string;
  hasChildren?: boolean;
  budget?: number;
  tripType?: string;
  isForeigner?: boolean;
}

const WhatsAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function recommendPackages(answers: UserAnswers): PackageData[] {
  const scores = PACKAGES_DATA.map(pkg => {
    let score = 0;
    if (answers.hasChildren && pkg.childrenFriendly) score += 3;
    if (!answers.hasChildren && !pkg.familyFriendly) score += 1;
    if (answers.isForeigner && pkg.foreignerFriendly) score += 2;
    if (answers.budget !== undefined) {
      if (pkg.priceEGP <= answers.budget) score += 2;
      else if (pkg.priceEGP <= answers.budget * 1.3) score += 1;
    }
    if (answers.tripType === "safari" && pkg.category === "safari") score += 3;
    if (answers.tripType === "yacht" && pkg.category === "yacht") score += 3;
    if (answers.tripType === "complete" && pkg.category === "complete") score += 3;
    if (answers.tripType === "family" && pkg.category === "family") score += 3;
    if (pkg.featured) score += 1;
    return { pkg, score };
  });
  return scores.sort((a, b) => b.score - a.score).slice(0, 2).map(s => s.pkg);
}

export default function AIAssistant() {
  const { lang } = useLanguage();
  const { currency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const ar = lang === "ar";

  const T = {
    title: ar ? "المساعد الذكي 🤖" : "AI Travel Assistant 🤖",
    subtitle: ar ? "سأساعدك تختار الباقة المثالية" : "I'll help you find the perfect package",
    placeholder: ar ? "اختر من الخيارات أدناه..." : "Choose from options below...",
    restart: ar ? "ابدأ من جديد" : "Start over",
    close: ar ? "إغلاق" : "Close",
    bookNow: ar ? "احجز الآن" : "Book Now",
    askWhatsApp: ar ? "استفسر واتساب" : "Ask on WhatsApp",
    viewDetails: ar ? "تفاصيل الباقة" : "Package Details",
    recommended: ar ? "الباقة الموصى بها لك:" : "Recommended packages for you:",
    reason: ar ? "لأنها تناسبك بناءً على اختياراتك" : "Because it matches your preferences",
  };

  const FLOW: { questionAr: string; questionEn: string; options: { labelAr: string; labelEn: string; value: string }[]; key: keyof UserAnswers }[] = [
    {
      questionAr: "مرحباً! 👋 من سيأتي معك في الرحلة؟",
      questionEn: "Hello! 👋 Who will be joining you on this trip?",
      key: "groupType",
      options: [
        { labelAr: "👨‍👩‍👧‍👦 عائلة مع أطفال", labelEn: "👨‍👩‍👧‍👦 Family with children", value: "family" },
        { labelAr: "💑 زوجين أو أصدقاء", labelEn: "💑 Couple or friends", value: "couple" },
        { labelAr: "👥 مجموعة", labelEn: "👥 Group", value: "group" },
        { labelAr: "🙋 بمفردي", labelEn: "🙋 Solo", value: "solo" },
      ],
    },
    {
      questionAr: "هل معك أطفال في الرحلة؟",
      questionEn: "Will there be children on the trip?",
      key: "hasChildren",
      options: [
        { labelAr: "✅ نعم، معي أطفال", labelEn: "✅ Yes, with children", value: "true" },
        { labelAr: "❌ لا، بدون أطفال", labelEn: "❌ No children", value: "false" },
      ],
    },
    {
      questionAr: "ما هي ميزانيتك للفرد تقريباً؟",
      questionEn: "What's your approximate budget per person?",
      key: "budget",
      options: [
        { labelAr: "💰 أقل من ٥٠٠ جنيه", labelEn: "💰 Under 500 EGP", value: "450" },
        { labelAr: "💰 ٥٠٠ – ١٠٠٠ جنيه", labelEn: "💰 500 – 1000 EGP", value: "900" },
        { labelAr: "💰 ١٠٠٠ – ١٥٠٠ جنيه", labelEn: "💰 1000 – 1500 EGP", value: "1400" },
        { labelAr: "💎 أكثر من ١٥٠٠ جنيه", labelEn: "💎 Over 1500 EGP", value: "9999" },
      ],
    },
    {
      questionAr: "ما نوع التجربة التي تبحث عنها؟",
      questionEn: "What type of experience are you looking for?",
      key: "tripType",
      options: [
        { labelAr: "🏜️ سفاري ومغامرة", labelEn: "🏜️ Safari & Adventure", value: "safari" },
        { labelAr: "🚢 رحلة يخت بحرية", labelEn: "🚢 Yacht Sea Trip", value: "yacht" },
        { labelAr: "⭐ تجربة شاملة", labelEn: "⭐ All-Inclusive", value: "complete" },
        { labelAr: "👨‍👩‍👧‍👦 نشاط عائلي", labelEn: "👨‍👩‍👧‍👦 Family Activity", value: "family" },
      ],
    },
    {
      questionAr: "هل أنت زائر من خارج مصر؟",
      questionEn: "Are you visiting from outside Egypt?",
      key: "isForeigner",
      options: [
        { labelAr: "🌍 نعم، زائر أجنبي", labelEn: "🌍 Yes, foreign visitor", value: "true" },
        { labelAr: "🇪🇬 لا، مصري", labelEn: "🇪🇬 No, Egyptian", value: "false" },
      ],
    },
  ];

  const initChat = () => {
    const q = FLOW[0];
    setMessages([{
      from: "bot",
      text: ar ? q.questionAr : q.questionEn,
      options: q.options.map(o => ar ? o.labelAr : o.labelEn),
    }]);
    setStep(0);
    setAnswers({});
    setDone(false);
  };

  useEffect(() => {
    if (open && messages.length === 0) initChat();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOption = (optionLabel: string) => {
    const q = FLOW[step];
    const opt = q.options.find(o => (ar ? o.labelAr : o.labelEn) === optionLabel);
    if (!opt) return;

    const value = opt.value;
    const newAnswers = { ...answers };

    if (q.key === "hasChildren" || q.key === "isForeigner") {
      (newAnswers as any)[q.key] = value === "true";
    } else if (q.key === "budget") {
      (newAnswers as any)[q.key] = parseInt(value);
    } else {
      (newAnswers as any)[q.key] = value;
    }

    setAnswers(newAnswers);

    const userMsg: Message = { from: "user", text: optionLabel };
    const nextStep = step + 1;

    if (nextStep < FLOW.length) {
      const nextQ = FLOW[nextStep];
      const botMsg: Message = {
        from: "bot",
        text: ar ? nextQ.questionAr : nextQ.questionEn,
        options: nextQ.options.map(o => ar ? o.labelAr : o.labelEn),
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
      setStep(nextStep);
    } else {
      const recs = recommendPackages(newAnswers);
      const botMsg: Message = {
        from: "bot",
        text: T.recommended,
        packages: recs,
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
      setDone(true);
    }
  };

  const lastMsg = messages[messages.length - 1];

  return (
    <>
      {/* Floating button — always bottom-right (physical), opposite side from WhatsApp (bottom-left) */}
      <button
        onClick={() => setOpen(!open)}
        style={{ position: "fixed", bottom: "2rem", right: "1.5rem", zIndex: 998, width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 24px rgba(99,102,241,0.55)", transition: "all 0.3s", fontSize: "1.5rem" }}
        title={T.title}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.12) rotate(5deg)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(99,102,241,0.7)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1) rotate(0deg)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(99,102,241,0.55)"; }}>
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat window — anchored to bottom-right above the button */}
      {open && (
        <div style={{ position: "fixed", bottom: "5.5rem", right: "1.5rem", zIndex: 997, width: "min(360px, calc(100vw - 2rem))", background: "#0a1520", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", maxHeight: "520px" }}>

          {/* Header */}
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1))", borderRadius: "20px 20px 0 0", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🤖</div>
            <div>
              <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>{T.title}</div>
              <div style={{ color: "#8899aa", fontSize: "0.72rem" }}>{T.subtitle}</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "bot" ? "flex-start" : "flex-end", gap: "0.5rem" }}>
                {msg.text && (
                  <div style={{
                    background: msg.from === "bot" ? "rgba(99,102,241,0.12)" : "rgba(0,170,255,0.15)",
                    border: `1px solid ${msg.from === "bot" ? "rgba(99,102,241,0.25)" : "rgba(0,170,255,0.25)"}`,
                    borderRadius: msg.from === "bot" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                    padding: "0.6rem 0.9rem",
                    maxWidth: "85%",
                    color: msg.from === "bot" ? "#c7d2fe" : "white",
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                  }}>
                    {msg.text}
                  </div>
                )}

                {/* Quick reply options */}
                {msg.options && i === messages.length - 1 && !done && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" }}>
                    {msg.options.map((opt, j) => (
                      <button key={j} onClick={() => handleOption(opt)}
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: "10px", padding: "0.55rem 0.85rem", color: "#c7d2fe", fontSize: "0.8rem", cursor: "pointer", textAlign: "inherit", fontFamily: "Cairo, sans-serif", transition: "all 0.2s" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.15)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.5)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(99,102,241,0.25)"; }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Package recommendations */}
                {msg.packages && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}>
                    {msg.packages.map(pkg => (
                      <div key={pkg.id} style={{ background: `${pkg.color}10`, border: `1px solid ${pkg.color}33`, borderRadius: "14px", padding: "0.85rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                          <span style={{ fontSize: "1.25rem" }}>{pkg.icon}</span>
                          <span style={{ color: pkg.color, fontWeight: 800, fontSize: "0.85rem" }}>{ar ? pkg.titleAr : pkg.titleEn}</span>
                        </div>
                        <div style={{ color: "#8899aa", fontSize: "0.75rem", marginBottom: "0.5rem" }}>{T.reason}</div>
                        <div style={{ color: pkg.color, fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.65rem" }}>
                          {formatPrice(pkg.priceEGP, currency, lang)} / {ar ? "فرد" : "person"}
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          <a href={`#packages`} onClick={() => setOpen(false)}
                            style={{ flex: 1, background: pkg.color, color: pkg.featured ? "#0D1B2A" : "white", border: "none", padding: "0.5rem 0.6rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif" }}>
                            {T.bookNow}
                          </a>
                          <a href={`https://wa.me/201205756024?text=${encodeURIComponent(ar ? `مرحباً، أريد الاستفسار عن ${pkg.titleAr}` : `Hello, I'd like to inquire about the ${pkg.titleEn}`)}`}
                            target="_blank" rel="noreferrer"
                            style={{ flex: 1, background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", padding: "0.5rem 0.6rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
                            <WhatsAppIcon />{T.askWhatsApp}
                          </a>
                        </div>
                      </div>
                    ))}
                    {/* Restart */}
                    <button onClick={initChat}
                      style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#667788", padding: "0.5rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.78rem", fontFamily: "Cairo, sans-serif" }}>
                      🔄 {T.restart}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
