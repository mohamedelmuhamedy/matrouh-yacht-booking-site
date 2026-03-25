import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

const SETTING_GROUPS = [
  {
    title: "بيانات الشركة",
    icon: "🏢",
    keys: [
      { key: "business_name_ar", label: "اسم الشركة (عربي)" },
      { key: "business_name_en", label: "Business Name (English)" },
      { key: "location_ar", label: "الموقع (عربي)" },
      { key: "location_en", label: "Location (English)" },
    ]
  },
  {
    title: "معلومات التواصل",
    icon: "📞",
    keys: [
      { key: "whatsapp_number", label: "رقم واتساب (مع كود الدولة)" },
      { key: "phone_number", label: "رقم الهاتف (للعرض)" },
    ]
  },
  {
    title: "روابط التواصل الاجتماعي",
    icon: "📱",
    keys: [
      { key: "facebook_url", label: "رابط Facebook" },
      { key: "instagram_url", label: "رابط Instagram" },
      { key: "tiktok_url", label: "رابط TikTok" },
    ]
  },
  {
    title: "العملات وأسعار الصرف",
    icon: "💰",
    keys: [
      { key: "default_currency", label: "العملة الافتراضية (EGP / USD / SAR)" },
      { key: "usd_rate", label: "سعر الدولار (1 USD = كم جنيه)" },
      { key: "sar_rate", label: "سعر الريال (1 SAR = كم جنيه)" },
    ]
  },
  {
    title: "نص الهيرو (الصفحة الرئيسية)",
    icon: "🎯",
    keys: [
      { key: "hero_title_ar", label: "عنوان الهيرو (عربي)" },
      { key: "hero_title_en", label: "Hero Title (English)" },
      { key: "hero_subtitle_ar", label: "نص الهيرو (عربي)" },
      { key: "hero_subtitle_en", label: "Hero Subtitle (English)" },
    ]
  },
  {
    title: "الميزات",
    icon: "✨",
    keys: [
      { key: "show_ai_assistant", label: "إظهار المساعد الذكي (true/false)" },
      { key: "show_compare_feature", label: "إظهار مقارنة الباقات (true/false)" },
      { key: "show_testimonials", label: "إظهار التقييمات (true/false)" },
    ]
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminFetch("/admin/settings").then(r => r.json()).then(data => {
      setSettings(data || {});
    }).finally(() => setLoading(false));
  }, []);

  const update = (key: string, value: string) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await adminFetch("/admin/settings", { method: "PUT", body: JSON.stringify(settings) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 1rem", borderRadius: "10px",
    border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
    transition: "border-color 0.2s", background: "white",
  };

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>إعدادات الموقع</h2>
        <button onClick={save} disabled={saving}
          style={{
            background: saved ? "linear-gradient(135deg,#25D366,#128C4E)" : "linear-gradient(135deg,#00AAFF,#0066cc)",
            color: "white", border: "none", borderRadius: "10px",
            padding: "0.7rem 1.5rem", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem",
            display: "flex", alignItems: "center", gap: "0.5rem", transition: "background 0.3s"
          }}>
          {saving ? "جاري الحفظ..." : saved ? "✅ تم الحفظ!" : "💾 حفظ جميع الإعدادات"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {SETTING_GROUPS.map(group => (
          <div key={group.title} style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {group.icon} {group.title}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {group.keys.map(({ key, label }) => (
                <div key={key}>
                  <label style={{ display: "block", color: "#667788", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.35rem" }}>{label}</label>
                  <input
                    style={inputStyle}
                    value={settings[key] || ""}
                    onChange={e => update(key, e.target.value)}
                    onFocus={e => e.target.style.borderColor = "#00AAFF"}
                    onBlur={e => e.target.style.borderColor = "#e0e8f0"}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
