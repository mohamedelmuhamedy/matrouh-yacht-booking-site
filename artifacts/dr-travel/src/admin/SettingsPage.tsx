import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

const SETTING_GROUPS = [
  {
    title: "بيانات الشركة",
    icon: "🏢",
    keys: [
      { key: "business_name_ar", label: "اسم الشركة (عربي)", placeholder: "DR Travel" },
      { key: "business_name_en", label: "Business Name (English)", placeholder: "DR Travel" },
      { key: "location_ar", label: "الموقع (عربي)", placeholder: "مرسى مطروح، مصر" },
      { key: "location_en", label: "Location (English)", placeholder: "Marsa Matruh, Egypt" },
    ],
  },
  {
    title: "معلومات التواصل",
    icon: "📞",
    keys: [
      { key: "whatsapp_number", label: "رقم واتساب (مع كود الدولة)", placeholder: "201205756024" },
      { key: "phone_number", label: "رقم الهاتف (للعرض)", placeholder: "01205756024" },
    ],
  },
  {
    title: "روابط التواصل الاجتماعي",
    icon: "📱",
    keys: [
      { key: "facebook_url", label: "رابط Facebook", placeholder: "https://facebook.com/Drtrave" },
      { key: "instagram_url", label: "رابط Instagram", placeholder: "https://instagram.com/drtravel_marsamatrouh" },
      { key: "tiktok_url", label: "رابط TikTok", placeholder: "https://tiktok.com/@drtravel.marsa.matrouh" },
    ],
  },
  {
    title: "العملات وأسعار الصرف",
    icon: "💰",
    keys: [
      { key: "default_currency", label: "العملة الافتراضية", placeholder: "EGP" },
      { key: "usd_rate", label: "سعر الدولار (1 USD = كم جنيه)", placeholder: "50" },
      { key: "sar_rate", label: "سعر الريال (1 SAR = كم جنيه)", placeholder: "13.5" },
    ],
  },
  {
    title: "نص الهيرو (الصفحة الرئيسية)",
    icon: "🎯",
    keys: [
      { key: "hero_title_ar", label: "عنوان الهيرو (عربي)", placeholder: "اكتشف مرسى مطروح" },
      { key: "hero_title_en", label: "Hero Title (English)", placeholder: "Discover Marsa Matruh" },
      { key: "hero_subtitle_ar", label: "نص الهيرو (عربي)", placeholder: "تجارب لا تُنسى في عالم البحر الأزرق" },
      { key: "hero_subtitle_en", label: "Hero Subtitle (English)", placeholder: "Unforgettable experiences in the blue sea" },
    ],
  },
  {
    title: "ميزات الموقع",
    icon: "✨",
    keys: [
      { key: "show_ai_assistant", label: "إظهار المساعد الذكي", placeholder: "true" },
      { key: "show_compare_feature", label: "إظهار مقارنة الباقات", placeholder: "true" },
      { key: "show_testimonials", label: "إظهار التقييمات", placeholder: "true" },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  const loadSettings = () => {
    setLoading(true);
    setLoadError("");
    adminFetch("/admin/settings")
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data && typeof data === "object" && !Array.isArray(data)) {
          setSettings(data);
        } else {
          setSettings({});
        }
      })
      .catch(e => setLoadError(e.message || "فشل تحميل الإعدادات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const update = (key: string, value: string) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaveStatus("idle");
  };

  const save = async () => {
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");
    try {
      const r = await adminFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSaveError(err.error || "فشل الحفظ");
        setSaveStatus("error");
        return;
      }
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e: any) {
      setSaveError(e.message || "خطأ في الاتصال");
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const inputBase: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    border: "1.5px solid #d0dce8",
    outline: "none",
    fontSize: "0.92rem",
    fontFamily: "Cairo, sans-serif",
    boxSizing: "border-box",
    color: "#0D1B2A",
    background: "white",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const totalFilled = SETTING_GROUPS.flatMap(g => g.keys).filter(({ key }) => settings[key]?.trim()).length;
  const totalKeys = SETTING_GROUPS.flatMap(g => g.keys).length;

  if (loading) return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>إعدادات الموقع</h2>
      </div>
      <div style={{ textAlign: "center", padding: "3rem", color: "#667788", background: "white", borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⏳</div>
        <div style={{ fontWeight: 700 }}>جاري تحميل الإعدادات...</div>
      </div>
    </div>
  );

  if (loadError) return (
    <div>
      <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 1.5rem" }}>إعدادات الموقع</h2>
      <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>⚠️</div>
        <div style={{ color: "#DC2626", fontWeight: 700, marginBottom: "0.5rem" }}>فشل تحميل الإعدادات</div>
        <div style={{ color: "#667788", fontSize: "0.88rem", marginBottom: "1rem" }}>{loadError}</div>
        <button onClick={loadSettings}
          style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
          🔄 إعادة المحاولة
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.25rem" }}>إعدادات الموقع</h2>
          <div style={{ color: "#667788", fontSize: "0.82rem" }}>
            مكتمل: <strong style={{ color: "#10B981" }}>{totalFilled}</strong> / {totalKeys} حقل
          </div>
        </div>
        <button onClick={save} disabled={saving}
          style={{
            background: saveStatus === "success"
              ? "linear-gradient(135deg,#10B981,#059669)"
              : saveStatus === "error"
                ? "linear-gradient(135deg,#EF4444,#DC2626)"
                : "linear-gradient(135deg,#00AAFF,#0066cc)",
            color: "white", border: "none", borderRadius: "10px",
            padding: "0.7rem 1.75rem", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem",
            display: "flex", alignItems: "center", gap: "0.5rem",
            transition: "background 0.3s", opacity: saving ? 0.7 : 1,
          }}>
          {saving ? "⏳ جاري الحفظ..." : saveStatus === "success" ? "✅ تم الحفظ!" : saveStatus === "error" ? "❌ فشل الحفظ" : "💾 حفظ جميع الإعدادات"}
        </button>
      </div>

      {saveStatus === "error" && saveError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#DC2626", fontWeight: 600, fontSize: "0.88rem" }}>
          ⚠️ {saveError}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {SETTING_GROUPS.map(group => (
          <div key={group.title}
            style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
              {group.icon} {group.title}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {group.keys.map(({ key, label, placeholder }) => {
                const val = settings[key] ?? "";
                const hasValue = val.trim().length > 0;
                return (
                  <div key={key}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#445566", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                      {label}
                      {hasValue && <span style={{ color: "#10B981", fontSize: "0.72rem", fontWeight: 800 }}>✓ محفوظ</span>}
                    </label>
                    <input
                      style={{
                        ...inputBase,
                        borderColor: hasValue ? "#00AAFF50" : "#d0dce8",
                        background: "white",
                        color: "#0D1B2A",
                        fontWeight: hasValue ? 500 : 400,
                      }}
                      value={val}
                      placeholder={placeholder}
                      onChange={e => update(key, e.target.value)}
                      onFocus={e => {
                        e.target.style.borderColor = "#00AAFF";
                        e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.12)";
                      }}
                      onBlur={e => {
                        const v = settings[key];
                        e.target.style.borderColor = v?.trim() ? "#00AAFF50" : "#d0dce8";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    {hasValue && (
                      <div style={{ marginTop: "0.3rem", fontSize: "0.75rem", color: "#667788", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <span style={{ fontWeight: 600, color: "#0D1B2A" }}>القيمة الحالية:</span>
                        <span style={{ color: "#445566" }}>{val.length > 50 ? val.substring(0, 50) + "..." : val}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1.25rem", textAlign: "center" }}>
        <button onClick={save} disabled={saving}
          style={{ background: saveStatus === "success" ? "linear-gradient(135deg,#10B981,#059669)" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "12px", padding: "0.85rem 3rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "1rem", transition: "background 0.3s" }}>
          {saving ? "⏳ جاري الحفظ..." : saveStatus === "success" ? "✅ تم الحفظ!" : "💾 حفظ جميع الإعدادات"}
        </button>
      </div>
    </div>
  );
}
