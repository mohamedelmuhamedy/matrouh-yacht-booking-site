import { useState } from "react";
import { useLocation } from "wouter";
import { apiUrl } from "../lib/api";

interface QuizMatch {
  id: number; slug: string; titleAr: string; titleEn: string;
  priceEGP: number; durationAr: string; imageUrl: string | null;
  score: number; reasons: string[];
}
interface QuizResult {
  matches: QuizMatch[];
  promo: { code: string; discountType: string; discountValue: number } | null;
}

type Step = number;

const VIBES = [
  { value: "relax", icon: "🧘", label: "استرخاء" },
  { value: "adventure", icon: "🏃", label: "مغامرة" },
  { value: "family", icon: "👨‍👩‍👧", label: "عائلة" },
  { value: "romantic", icon: "💕", label: "رومانسية" },
  { value: "party", icon: "🎉", label: "سهرة" },
];

const BUDGETS = [
  { value: "low", label: "أقل من 2000 ج.م", icon: "💰" },
  { value: "mid", label: "2000 – 5000 ج.م", icon: "💰💰" },
  { value: "high", label: "أكثر من 5000 ج.م", icon: "💰💰💰" },
];

const ENVIRONMENTS = [
  { value: "water", icon: "🌊", label: "مياه وبحر" },
  { value: "desert", icon: "🏜️", label: "صحراء وسفاري" },
  { value: "both", icon: "🌍", label: "كلاهما" },
];

export default function QuizPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(0);
  const [vibe, setVibe] = useState<string>("");
  const [budget, setBudget] = useState<string>("");
  const [groupSize, setGroupSize] = useState<number>(2);
  const [env, setEnv] = useState<string>("");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/ai/quiz"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vibe: vibe || undefined,
          budget: budget || undefined,
          groupSize,
          prefersWater: env === "water" || env === "both",
          prefersDesert: env === "desert" || env === "both",
        }),
      });
      const data = await r.json();
      setResult(data);
      setStep(4);
    } catch {
      alert("حدث خطأ، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep(0); setVibe(""); setBudget(""); setEnv(""); setGroupSize(2); setResult(null); };

  return (
    <div dir="rtl" style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0D1B2A, #1B263B)",
      fontFamily: "Cairo, sans-serif", padding: "2rem 1rem",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button onClick={() => navigate("/")} style={{
          background: "transparent", color: "white", border: "1px solid rgba(255,255,255,.3)",
          padding: ".5rem 1rem", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo,sans-serif",
          marginBottom: "1rem",
        }}>← الرجوع</button>

        <div style={{
          background: "rgba(255,255,255,.1)", backdropFilter: "blur(10px)",
          borderRadius: 20, padding: "2rem", color: "white", border: "1px solid rgba(255,255,255,.2)",
        }}>
          <h1 style={{ textAlign: "center", margin: "0 0 .5rem", fontSize: "2rem" }}>
            🤖 اعثر على رحلتك المثالية
          </h1>
          <p style={{ textAlign: "center", opacity: .8, margin: "0 0 1.5rem" }}>
            أجب على 4 أسئلة بسيطة وسنرشح لك أفضل الرحلات
          </p>

          {/* Progress */}
          {step < 4 && (
            <div style={{ display: "flex", gap: 4, marginBottom: "2rem" }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: i <= step ? "#00AAFF" : "rgba(255,255,255,.2)",
                }} />
              ))}
            </div>
          )}

          {/* Step 0: Vibe */}
          {step === 0 && (
            <div>
              <h2 style={{ fontSize: "1.3rem", margin: "0 0 1rem" }}>1. ما الجو الذي تبحث عنه؟</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: ".6rem" }}>
                {VIBES.map(v => (
                  <button key={v.value} onClick={() => { setVibe(v.value); setStep(1); }} style={optionBtn(vibe === v.value)}>
                    <div style={{ fontSize: "2rem" }}>{v.icon}</div>
                    <div style={{ fontWeight: 700 }}>{v.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Budget */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: "1.3rem", margin: "0 0 1rem" }}>2. ما ميزانيتك للشخص؟</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: ".6rem" }}>
                {BUDGETS.map(b => (
                  <button key={b.value} onClick={() => { setBudget(b.value); setStep(2); }} style={{ ...optionBtn(budget === b.value), padding: "1rem", flexDirection: "row", textAlign: "right", justifyContent: "flex-start", gap: ".75rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{b.icon}</span>
                    <span style={{ fontWeight: 700 }}>{b.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(0)} style={backBtn}>← السابق</button>
            </div>
          )}

          {/* Step 2: Group size */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: "1.3rem", margin: "0 0 1rem" }}>3. كم عدد الأفراد؟</h2>
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{ fontSize: "4rem", fontWeight: 900, color: "#00AAFF" }}>{groupSize}</div>
                <input type="range" min={1} max={20} value={groupSize}
                       onChange={e => setGroupSize(Number(e.target.value))}
                       style={{ width: "100%", maxWidth: 400 }} />
              </div>
              <div style={{ display: "flex", gap: ".6rem", justifyContent: "space-between" }}>
                <button onClick={() => setStep(1)} style={backBtn}>← السابق</button>
                <button onClick={() => setStep(3)} style={nextBtn}>التالي →</button>
              </div>
            </div>
          )}

          {/* Step 3: Environment */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: "1.3rem", margin: "0 0 1rem" }}>4. ماذا تفضل؟</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: ".6rem" }}>
                {ENVIRONMENTS.map(e => (
                  <button key={e.value} onClick={() => setEnv(e.value)} style={optionBtn(env === e.value)}>
                    <div style={{ fontSize: "2rem" }}>{e.icon}</div>
                    <div style={{ fontWeight: 700 }}>{e.label}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: ".6rem", justifyContent: "space-between", marginTop: "1.5rem" }}>
                <button onClick={() => setStep(2)} style={backBtn}>← السابق</button>
                <button onClick={submit} disabled={loading || !env} style={{
                  ...nextBtn, opacity: !env ? .5 : 1, cursor: !env ? "not-allowed" : "pointer",
                }}>{loading ? "⏳ جاري التحليل..." : "🔮 اعرض رحلتي"}</button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && result && (
            <div>
              <h2 style={{ fontSize: "1.5rem", margin: "0 0 1rem", textAlign: "center" }}>
                ✨ هذه أفضل الرحلات لك
              </h2>

              {result.promo && (
                <div style={{
                  background: "linear-gradient(135deg, #F59E0B, #EF4444)",
                  borderRadius: 12, padding: "1rem", marginBottom: "1rem",
                  textAlign: "center", fontWeight: 800,
                }}>
                  🎁 احصل على خصم باستخدام الكود: <span style={{ background: "rgba(0,0,0,.3)", padding: "4px 10px", borderRadius: 6 }}>{result.promo.code}</span>
                  {result.promo.discountType === "percent" ? ` (خصم ${result.promo.discountValue}%)` : ` (خصم ${result.promo.discountValue} ج.م)`}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {result.matches.map((m, i) => (
                  <div key={m.id} onClick={() => navigate(`/packages/${m.slug}`)} style={{
                    background: "rgba(255,255,255,.1)", borderRadius: 12, padding: "1rem",
                    cursor: "pointer", display: "flex", gap: "1rem", alignItems: "center",
                    border: i === 0 ? "2px solid #00AAFF" : "1px solid rgba(255,255,255,.2)",
                  }}>
                    {m.imageUrl && <img src={m.imageUrl} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".25rem" }}>
                        {i === 0 && <span style={{ background: "#00AAFF", padding: "2px 8px", borderRadius: 4, fontSize: ".7rem", fontWeight: 800 }}>⭐ الأفضل لك</span>}
                        <span style={{ fontSize: ".75rem", opacity: .7 }}>تطابق {m.score}%</span>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", marginBottom: ".25rem" }}>{m.titleAr}</div>
                      <div style={{ fontSize: ".8rem", opacity: .8, marginBottom: ".25rem" }}>
                        {m.priceEGP.toLocaleString("en-US")} ج.م {m.durationAr && `• ${m.durationAr}`}
                      </div>
                      <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                        {m.reasons.map((r, j) => (
                          <span key={j} style={{
                            background: "rgba(0,170,255,.2)", color: "#7DD3FC",
                            padding: "2px 6px", borderRadius: 4, fontSize: ".7rem",
                          }}>{r}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={reset} style={{ ...backBtn, marginTop: "1.5rem", width: "100%" }}>
                🔄 ابدأ من جديد
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function optionBtn(active: boolean): React.CSSProperties {
  return {
    background: active ? "rgba(0,170,255,.3)" : "rgba(255,255,255,.05)",
    border: active ? "2px solid #00AAFF" : "1px solid rgba(255,255,255,.2)",
    color: "white", padding: "1rem", borderRadius: 12, cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", gap: ".4rem",
    fontFamily: "Cairo,sans-serif", transition: "all .2s",
  };
}
const nextBtn: React.CSSProperties = {
  background: "#00AAFF", color: "white", border: "none", padding: ".75rem 1.5rem",
  borderRadius: 10, fontWeight: 800, cursor: "pointer", fontFamily: "Cairo,sans-serif",
  fontSize: "1rem",
};
const backBtn: React.CSSProperties = {
  background: "transparent", color: "white", border: "1px solid rgba(255,255,255,.3)",
  padding: ".75rem 1.5rem", borderRadius: 10, fontWeight: 700, cursor: "pointer",
  fontFamily: "Cairo,sans-serif", marginTop: "1rem",
};
