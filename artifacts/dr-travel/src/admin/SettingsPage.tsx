import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import logoFallback from "@assets/435995000_395786973220549_2208241063212175938_n_1773309907139.jpg";
import { resolveApiAssetUrl, storageObjectApiPath } from "../lib/api";

const DEFAULTS: Record<string, string> = {
  business_name_ar: "DR Travel",
  business_name_en: "DR Travel",
  location_ar: "مرسى مطروح، مصر",
  location_en: "Marsa Matruh, Egypt",
  maps_url: "https://maps.google.com/?q=Mersa+Matruh,+Egypt",
  whatsapp_number: "201205756024",
  phone_number: "+20 120 575 6024",
  facebook_url: "https://facebook.com/Drtrave",
  instagram_url: "https://instagram.com/drtravel_marsamatrouh",
  tiktok_url: "https://tiktok.com/@drtravel.marsa.matrouh",
  default_currency: "EGP",
  usd_rate: "50",
  sar_rate: "13.3",
  hero_title_primary_ar: "اكتشف جمال مرسى",
  hero_title_accent_ar: "مطروح",
  hero_title_primary_en: "Discover the Beauty of",
  hero_title_accent_en: "Marsa Matruh",
  hero_subtitle_ar: "سفاري الصحراء · رحلات يخت فاخرة · رياضات مائية · باراشوت · أكوا بارك",
  hero_subtitle_en: "Desert Safari · Luxury Yacht Trips · Water Sports · Parasailing · Aqua Park",
  hero_overlay_opacity: "0.65",
  show_ai_assistant: "true",
  show_compare_feature: "true",
  show_testimonials: "true",
  show_scroll_indicator: "true",
  show_hero_pagination: "true",
};

type FieldDef = { key: string; label: string; placeholder?: string; type?: "boolean" | "text" | "select"; hint?: string; options?: { value: string; label: string }[] };

const SETTING_GROUPS: { title: string; icon: string; keys: FieldDef[]; section: string }[] = [
  {
    title: "بيانات الشركة",
    icon: "🏢",
    section: "company",
    keys: [
      { key: "business_name_ar", label: "اسم الشركة (عربي)", placeholder: "DR Travel" },
      { key: "business_name_en", label: "Business Name (English)", placeholder: "DR Travel" },
      { key: "location_ar", label: "الموقع (عربي)", placeholder: "مرسى مطروح، مصر" },
      { key: "location_en", label: "Location (English)", placeholder: "Marsa Matruh, Egypt" },
      { key: "maps_url", label: "رابط Google Maps", placeholder: "https://maps.google.com/?q=...", hint: "يظهر في الفوتر كرابط قابل للضغط — انسخ الرابط من Google Maps مباشرة" },
    ],
  },
  {
    title: "معلومات التواصل",
    icon: "📞",
    section: "contact",
    keys: [
      { key: "whatsapp_number", label: "رقم واتساب (مع كود الدولة)", placeholder: "201205756024" },
      { key: "phone_number", label: "رقم الهاتف (للعرض)", placeholder: "+20 120 575 6024" },
    ],
  },
  {
    title: "روابط التواصل الاجتماعي",
    icon: "📱",
    section: "social",
    keys: [
      { key: "facebook_url", label: "رابط Facebook", placeholder: "https://facebook.com/Drtrave" },
      { key: "instagram_url", label: "رابط Instagram", placeholder: "https://instagram.com/drtravel" },
      { key: "tiktok_url", label: "رابط TikTok", placeholder: "https://tiktok.com/@drtravel" },
    ],
  },
  {
    title: "العملات وأسعار الصرف",
    icon: "💰",
    section: "currencies",
    keys: [
      { key: "default_currency", label: "العملة الافتراضية", placeholder: "EGP" },
      { key: "usd_rate", label: "سعر الدولار (1 USD = كم جنيه)", placeholder: "50" },
      { key: "sar_rate", label: "سعر الريال (1 SAR = كم جنيه)", placeholder: "13.5" },
    ],
  },
  {
    title: "نص الهيرو — الصفحة الرئيسية",
    icon: "🎯",
    section: "hero",
    keys: [
      { key: "hero_title_primary_ar", label: "عنوان الهيرو — الجزء الرئيسي (عربي)", placeholder: "اكتشف جمال مرسى", hint: "يظهر بلون أبيض في العنوان الكبير" },
      { key: "hero_title_accent_ar", label: "عنوان الهيرو — الجزء المميز (عربي)", placeholder: "مطروح", hint: "يظهر بـ gradient أزرق-ذهبي مميز" },
      { key: "hero_title_primary_en", label: "Hero Title — Primary Part (English)", placeholder: "Discover the Beauty of", hint: "Displayed in white" },
      { key: "hero_title_accent_en", label: "Hero Title — Accent Part (English)", placeholder: "Marsa Matruh", hint: "Displayed with blue-gold gradient accent" },
      { key: "hero_subtitle_ar", label: "نص الهيرو الفرعي (عربي)", placeholder: "سفاري الصحراء · رحلات يخت فاخرة..." },
      { key: "hero_subtitle_en", label: "Hero Subtitle (English)", placeholder: "Desert Safari · Luxury Yacht Trips..." },
      {
        key: "hero_overlay_opacity", label: "شدة الطبقة الداكنة على الهيرو", type: "select",
        hint: "تتحكم في درجة التعتيم فوق صور وفيديوهات الهيرو — قلّلها لترى الفيديو بوضوح أكبر",
        options: [
          { value: "0",    label: "بدون تعتيم (0%)" },
          { value: "0.25", label: "خفيف جداً (25%)" },
          { value: "0.45", label: "خفيف (45%)" },
          { value: "0.65", label: "متوسط (65%) — الافتراضي" },
          { value: "0.82", label: "قوي (82%)" },
          { value: "1",    label: "كامل (100%)" },
        ],
      },
    ],
  },
  {
    title: "ميزات الموقع",
    icon: "✨",
    section: "features",
    keys: [
      { key: "show_ai_assistant", label: "المساعد الذكي", type: "boolean", hint: "إظهار أو إخفاء زر المساعد الذكي في الموقع" },
      { key: "show_compare_feature", label: "مقارنة الباقات", type: "boolean", hint: "إظهار أو إخفاء أداة مقارنة الباقات" },
      { key: "show_testimonials", label: "قسم التقييمات", type: "boolean", hint: "إظهار أو إخفاء قسم آراء العملاء" },
      { key: "show_scroll_indicator", label: "علامة التمرير (Scroll Indicator)", type: "boolean", hint: "إظهار أو إخفاء علامة السهم المتحركة أسفل الهيرو" },
      { key: "show_hero_pagination", label: "نقاط تصفح الهيرو (Pagination Dots)", type: "boolean", hint: "إظهار أو إخفاء النقاط أسفل صور الهيرو عند وجود أكتر من صورة" },
    ],
  },
];

const inputBase: React.CSSProperties = {
  width: "100%", padding: "0.75rem 1rem", borderRadius: "10px",
  border: "1.5px solid #d0dce8", outline: "none", fontSize: "0.92rem",
  fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
  color: "#0D1B2A", background: "white",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        width: 52, height: 28, borderRadius: 14, border: "none", cursor: "pointer",
        background: checked ? "#00AAFF" : "#d0dce8",
        transition: "background 0.25s", flexShrink: 0, padding: 0,
      }}
      aria-checked={checked}
      role="switch"
      aria-label={checked ? "مفعّل" : "معطّل"}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 27 : 3,
        width: 22, height: 22, borderRadius: "50%", background: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)", transition: "left 0.25s",
      }} />
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [pendingRestore, setPendingRestore] = useState<{ section: string | "all"; label: string } | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoFileRef = useRef<HTMLInputElement>(null);

  const [heroBgUploading, setHeroBgUploading] = useState(false);
  const [heroBgError, setHeroBgError] = useState("");
  const heroBgFileRef = useRef<HTMLInputElement>(null);

  const settingsRef = useRef<Record<string, string>>({});

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
          settingsRef.current = data;
        } else {
          setSettings({});
          settingsRef.current = {};
        }
      })
      .catch(e => setLoadError(e.message || "فشل تحميل الإعدادات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadSettings(); }, []);

  const update = (key: string, value: string) => {
    setSettings(s => {
      const next = { ...s, [key]: value };
      settingsRef.current = next;
      return next;
    });
    setSaveStatus("idle");
  };

  const updateBool = (key: string, value: boolean) => {
    update(key, value ? "true" : "false");
  };

  const save = async (overrideSettings?: Record<string, string>, silent = false) => {
    const payload = overrideSettings ?? settingsRef.current;
    setSaving(true);
    setSaveStatus("idle");
    setSaveError("");
    try {
      const r = await adminFetch("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSaveError(err.error || "فشل الحفظ");
        setSaveStatus("error");
        if (!silent) toastError("فشل حفظ الإعدادات");
        return false;
      }
      setSaveStatus("success");
      if (!silent) toastSuccess("تم حفظ الإعدادات بنجاح ✅");
      setTimeout(() => setSaveStatus("idle"), 3000);
      return true;
    } catch (e: any) {
      setSaveError(e.message || "خطأ في الاتصال");
      setSaveStatus("error");
      if (!silent) toastError("خطأ في الاتصال");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const confirmAndRestore = (section: string | "all", label: string) => {
    setPendingRestore({ section, label });
  };

  const doRestore = async () => {
    if (!pendingRestore) return;
    const { section } = pendingRestore;
    setPendingRestore(null);

    let restored: Record<string, string>;
    if (section === "all") {
      restored = { ...settingsRef.current, ...DEFAULTS };
    } else {
      const group = SETTING_GROUPS.find(g => g.section === section);
      if (!group) return;
      const partial: Record<string, string> = {};
      group.keys.forEach(({ key }) => {
        if (DEFAULTS[key] !== undefined) partial[key] = DEFAULTS[key];
      });
      restored = { ...settingsRef.current, ...partial };
    }

    settingsRef.current = restored;
    setSettings({ ...restored });
    setSaveStatus("idle");

    const ok = await save(restored, true);
    if (ok) toastSuccess("تم استعادة القيم الأصلية وحفظها ✅");
    else toastError("فشل حفظ القيم الأصلية");
  };

  const changePassword = async () => {
    setPwError("");
    setPwSuccess(false);
    if (!pwCurrent.trim()) { setPwError("أدخل كلمة المرور الحالية"); return; }
    if (!pwNew.trim() || pwNew.length < 6) { setPwError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل"); return; }
    if (pwNew !== pwConfirm) { setPwError("كلمة المرور الجديدة وتأكيدها غير متطابقين"); return; }

    setPwSaving(true);
    try {
      const r = await adminFetch("/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPwError(data.error || "فشل تغيير كلمة المرور");
        return;
      }
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      toastSuccess("تم تغيير كلمة المرور بنجاح 🔐");
    } catch (e: any) {
      setPwError(e.message || "خطأ في الاتصال");
    } finally {
      setPwSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setLogoUploading(true);
    setLogoError("");
    try {
      const reqRes = await adminFetch("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        setLogoError(err.error || "فشل طلب رفع الشعار");
        return;
      }
      const { uploadURL, objectPath } = await reqRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT", headers: { "Content-Type": file.type }, body: file,
      });
      if (!uploadRes.ok) { setLogoError("فشل رفع الملف"); return; }

      const logoPath = storageObjectApiPath(objectPath);
      const next = { ...settingsRef.current, logo_url: logoPath };
      settingsRef.current = next;
      setSettings({ ...next });
      const ok = await save(next);
      if (ok) toastSuccess("تم رفع الشعار وحفظه ✅");
    } catch (e: any) {
      setLogoError(e.message || "خطأ في الرفع");
    } finally {
      setLogoUploading(false);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const uploadHeroBg = async (file: File) => {
    setHeroBgUploading(true);
    setHeroBgError("");
    try {
      const reqRes = await adminFetch("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        setHeroBgError(err.error || "فشل طلب رفع الصورة");
        return;
      }
      const { uploadURL, objectPath } = await reqRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT", headers: { "Content-Type": file.type }, body: file,
      });
      if (!uploadRes.ok) { setHeroBgError("فشل رفع الملف"); return; }

      const bgPath = storageObjectApiPath(objectPath);
      const next = { ...settingsRef.current, hero_bg_url: bgPath };
      settingsRef.current = next;
      setSettings({ ...next });
      const ok = await save(next, true);
      if (ok) toastSuccess("تم رفع صورة الخلفية وحفظها ✅");
    } catch (e: any) {
      setHeroBgError(e.message || "خطأ في الرفع");
    } finally {
      setHeroBgUploading(false);
      if (heroBgFileRef.current) heroBgFileRef.current.value = "";
    }
  };

  const totalFilled = SETTING_GROUPS.flatMap(g => g.keys).filter(({ key }) => settings[key]?.trim()).length;
  const totalKeys = SETTING_GROUPS.flatMap(g => g.keys).length;

  if (loading) return (
    <div>
      <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 1.5rem" }}>إعدادات الموقع</h2>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.25rem" }}>إعدادات الموقع</h2>
          <div style={{ color: "#667788", fontSize: "0.82rem" }}>
            مكتمل: <strong style={{ color: "#10B981" }}>{totalFilled}</strong> / {totalKeys} حقل
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => confirmAndRestore("all", "جميع الإعدادات")}
            style={{ background: "#f0f4f8", border: "1px solid #d0dce8", borderRadius: "10px", padding: "0.6rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", color: "#667788", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            🔄 استعادة الكل
          </button>
          <button
            onClick={() => save()}
            disabled={saving}
            style={{
              background: saveStatus === "success"
                ? "linear-gradient(135deg,#10B981,#059669)"
                : saveStatus === "error"
                  ? "linear-gradient(135deg,#EF4444,#DC2626)"
                  : "linear-gradient(135deg,#00AAFF,#0066cc)",
              color: "white", border: "none", borderRadius: "10px",
              padding: "0.65rem 1.75rem", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem",
              display: "flex", alignItems: "center", gap: "0.5rem",
              transition: "background 0.3s", opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "⏳ جاري الحفظ..." : saveStatus === "success" ? "✅ تم الحفظ!" : saveStatus === "error" ? "❌ فشل الحفظ" : "💾 حفظ الإعدادات"}
          </button>
        </div>
      </div>

      {saveStatus === "error" && saveError && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#DC2626", fontWeight: 600, fontSize: "0.88rem" }}>
          ⚠️ {saveError}
        </div>
      )}

      {/* Logo upload section */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.25rem" }}>
        <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
          🖼️ شعار الموقع (Logo)
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          {/* Current logo preview */}
          <div style={{ position: "relative" }}>
            <img
              src={resolveApiAssetUrl(settings.logo_url) || logoFallback}
              alt="Logo"
              style={{ width: 90, height: 90, borderRadius: "50%", objectFit: "cover", border: "3px solid #e0e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
              onError={e => { (e.target as HTMLImageElement).src = logoFallback; }}
            />
            {settings.logo_url && (
              <div style={{ position: "absolute", bottom: 2, right: 2, width: 22, height: 22, background: "#10B981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "white", fontWeight: 900, border: "2px solid white" }}>✓</div>
            )}
          </div>
          <div>
            <div style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.35rem" }}>
              {settings.logo_url ? "تم رفع شعار مخصص" : "لم يُرفع شعار بعد — يُستخدم الشعار الافتراضي"}
            </div>
            <div style={{ color: "#99aabb", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
              ارفع صورة JPG / PNG / WebP (بحد أقصى 10MB)
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <input ref={logoFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }} />
              <button type="button" onClick={() => logoFileRef.current?.click()} disabled={logoUploading}
                style={{ background: logoUploading ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", cursor: logoUploading ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {logoUploading ? "⏳ جاري الرفع..." : "📁 رفع شعار جديد"}
              </button>
              {settings.logo_url && (
                <button type="button" onClick={() => {
                  const next = { ...settingsRef.current, logo_url: "" };
                  settingsRef.current = next;
                  setSettings({ ...next });
                  save(next);
                }}
                  style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "0.55rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, fontSize: "0.82rem" }}>
                  🗑️ حذف الشعار
                </button>
              )}
            </div>
            {logoError && <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "0.5rem" }}>⚠️ {logoError}</div>}
          </div>
        </div>
      </div>

      {/* Hero Background Upload */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.25rem" }}>
        <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
          🏞️ صورة خلفية الهيرو (Hero Background)
        </h3>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 140, height: 80, borderRadius: "10px", overflow: "hidden",
              border: "3px solid #e0e8f0", boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              background: settings.hero_bg_url
                ? `url('${resolveApiAssetUrl(settings.hero_bg_url)}') center/cover`
                : "linear-gradient(135deg,#0D1B2A,#00AAFF40)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {!settings.hero_bg_url && (
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.5rem" }}>🏖️</span>
              )}
            </div>
            {settings.hero_bg_url && (
              <div style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, background: "#10B981", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", color: "white", fontWeight: 900, border: "2px solid white" }}>✓</div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.35rem" }}>
              {settings.hero_bg_url ? "تم رفع صورة خلفية مخصصة" : "لم تُرفع خلفية بعد — يُستخدم صورة البحر الافتراضية"}
            </div>
            <div style={{ color: "#99aabb", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
              ارفع صورة JPG / PNG / WebP عالية الجودة (بحد أقصى 10MB) للظهور في خلفية الصفحة الرئيسية
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <input ref={heroBgFileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeroBg(f); }} />
              <button type="button" onClick={() => heroBgFileRef.current?.click()} disabled={heroBgUploading}
                style={{ background: heroBgUploading ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "8px", padding: "0.55rem 1.25rem", cursor: heroBgUploading ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                {heroBgUploading ? "⏳ جاري الرفع..." : "📁 رفع صورة خلفية"}
              </button>
              {settings.hero_bg_url && (
                <button type="button" onClick={() => {
                  const next = { ...settingsRef.current, hero_bg_url: "" };
                  settingsRef.current = next;
                  setSettings({ ...next });
                  save(next, true).then(ok => ok && toastSuccess("تم حذف الخلفية المخصصة ✅"));
                }}
                  style={{ background: "#FEF2F2", color: "#EF4444", border: "1px solid #FCA5A5", borderRadius: "8px", padding: "0.55rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, fontSize: "0.82rem", flexShrink: 0 }}>
                  🗑️ حذف الخلفية
                </button>
              )}
            </div>
            {heroBgError && <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "0.5rem" }}>⚠️ {heroBgError}</div>}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {SETTING_GROUPS.map(group => {
          const groupHasDefaults = group.keys.some(({ key }) => DEFAULTS[key] !== undefined);
          return (
            <div key={group.section}
              style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
                  {group.icon} {group.title}
                </h3>
                {groupHasDefaults && (
                  <button
                    onClick={() => confirmAndRestore(group.section, group.title)}
                    style={{ background: "none", border: "1px solid #e0e8f0", borderRadius: 8, padding: "0.3rem 0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 600, fontSize: "0.75rem", color: "#99aabb", display: "flex", alignItems: "center", gap: "0.3rem", transition: "all 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#00AAFF"; (e.currentTarget as HTMLElement).style.color = "#00AAFF"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e0e8f0"; (e.currentTarget as HTMLElement).style.color = "#99aabb"; }}>
                    🔄 استعادة الأصل
                  </button>
                )}
              </div>

              {group.section === "features" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {group.keys.map(({ key, label, hint }) => {
                    const isOn = settings[key] === "true";
                    return (
                      <div key={key}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderRadius: 10, background: isOn ? "#f0fdf4" : "#f9fafb", border: `1.5px solid ${isOn ? "#10B98130" : "#e0e8f0"}`, cursor: "pointer", transition: "all 0.2s", userSelect: "none" }}
                        onClick={() => updateBool(key, !isOn)}>
                        <div>
                          <div style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.9rem" }}>{label}</div>
                          {hint && <div style={{ color: "#99aabb", fontSize: "0.75rem", marginTop: "0.15rem" }}>{hint}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: isOn ? "#10B981" : "#99aabb" }}>
                            {isOn ? "مفعّل" : "معطّل"}
                          </span>
                          <Toggle checked={isOn} onChange={v => updateBool(key, v)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                  {group.keys.map(({ key, label, placeholder, hint, type: fieldType, options }) => {
                    const val = settings[key] ?? "";
                    const hasValue = val.trim().length > 0;
                    const isAccent = key.includes("accent");
                    return (
                      <div key={key} style={fieldType === "select" ? { gridColumn: "1 / -1" } : {}}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#445566", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                          {isAccent && (
                            <span style={{ background: "linear-gradient(135deg,#00AAFF,#C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: 900, fontSize: "0.9rem" }}>✦</span>
                          )}
                          {label}
                          {hasValue && <span style={{ color: "#10B981", fontSize: "0.72rem", fontWeight: 800 }}>✓</span>}
                        </label>
                        {hint && (
                          <div style={{ fontSize: "0.73rem", color: "#99aabb", marginBottom: "0.35rem" }}>
                            {hint}
                          </div>
                        )}
                        {fieldType === "select" && options ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {options.map(opt => {
                              const active = (val || DEFAULTS[key]) === opt.value;
                              return (
                                <button key={opt.value} onClick={() => update(key, opt.value)}
                                  style={{ padding: "0.45rem 1rem", borderRadius: 8, fontFamily: "Cairo, sans-serif", fontWeight: active ? 700 : 600, fontSize: "0.82rem", cursor: "pointer", border: `1.5px solid ${active ? "#00AAFF" : "#d0dce8"}`, background: active ? "rgba(0,170,255,0.08)" : "white", color: active ? "#00AAFF" : "#556677", transition: "all 0.18s" }}>
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                        <input
                          style={{
                            ...inputBase,
                            borderColor: hasValue ? (isAccent ? "#C9A84C40" : "#00AAFF40") : "#d0dce8",
                          }}
                          value={val}
                          placeholder={placeholder}
                          onChange={e => update(key, e.target.value)}
                          onFocus={e => {
                            e.target.style.borderColor = isAccent ? "#C9A84C" : "#00AAFF";
                            e.target.style.boxShadow = isAccent ? "0 0 0 3px rgba(201,168,76,0.12)" : "0 0 0 3px rgba(0,170,255,0.12)";
                          }}
                          onBlur={e => {
                            e.target.style.borderColor = settings[key]?.trim() ? (isAccent ? "#C9A84C40" : "#00AAFF40") : "#d0dce8";
                            e.target.style.boxShadow = "none";
                          }}
                        />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {group.section === "hero" && (settings.hero_title_primary_ar || settings.hero_title_accent_ar) && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "#0D1B2A", borderRadius: 10, display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.72rem" }}>معاينة:</span>
                  <span style={{ color: "white", fontWeight: 700, fontSize: "1rem" }}>{settings.hero_title_primary_ar}</span>
                  <span style={{ background: "linear-gradient(135deg,#00AAFF,#C9A84C)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", fontWeight: 900, fontSize: "1.1rem" }}>
                    {settings.hero_title_accent_ar}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom save */}
        <div style={{ textAlign: "center", paddingTop: "0.5rem" }}>
          <button
            onClick={() => save()}
            disabled={saving}
            style={{
              background: saveStatus === "success"
                ? "linear-gradient(135deg,#10B981,#059669)"
                : "linear-gradient(135deg,#00AAFF,#0066cc)",
              color: "white", border: "none", borderRadius: "12px",
              padding: "0.85rem 3rem", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "1rem",
              transition: "background 0.3s",
            }}>
            {saving ? "⏳ جاري الحفظ..." : saveStatus === "success" ? "✅ تم الحفظ!" : "💾 حفظ جميع الإعدادات"}
          </button>
        </div>

        {/* Change Password Section */}
        <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e0e8f0" }}>
          <h3 style={{ color: "#0D1B2A", fontWeight: 800, margin: "0 0 1.25rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "1rem" }}>
            🔐 تغيير كلمة المرور
          </h3>

          {pwSuccess && (
            <div style={{ background: "#f0fdf4", border: "1.5px solid #10B981", borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem", color: "#059669", fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ✅ تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
            </div>
          )}

          {pwError && (
            <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "0.75rem 1rem", marginBottom: "1rem", color: "#DC2626", fontWeight: 600, fontSize: "0.88rem" }}>
              ⚠️ {pwError}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "#445566", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                value={pwCurrent}
                autoComplete="current-password"
                onChange={e => { setPwCurrent(e.target.value); setPwError(""); setPwSuccess(false); }}
                placeholder="••••••••"
                style={{ ...inputBase }}
                onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = "#d0dce8"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#445566", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={pwNew}
                autoComplete="new-password"
                onChange={e => { setPwNew(e.target.value); setPwError(""); setPwSuccess(false); }}
                placeholder="6 أحرف على الأقل"
                style={{ ...inputBase }}
                onFocus={e => { e.target.style.borderColor = "#00AAFF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = "#d0dce8"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#445566", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                value={pwConfirm}
                autoComplete="new-password"
                onChange={e => { setPwConfirm(e.target.value); setPwError(""); setPwSuccess(false); }}
                placeholder="أعد كتابة كلمة المرور الجديدة"
                style={{
                  ...inputBase,
                  borderColor: pwConfirm && pwNew && pwConfirm !== pwNew ? "#EF4444" : pwConfirm && pwNew && pwConfirm === pwNew ? "#10B981" : "#d0dce8",
                }}
                onFocus={e => { e.target.style.boxShadow = "0 0 0 3px rgba(0,170,255,0.12)"; }}
                onBlur={e => { e.target.style.boxShadow = "none"; }}
              />
              {pwConfirm && pwNew && pwConfirm !== pwNew && (
                <div style={{ marginTop: "0.3rem", fontSize: "0.73rem", color: "#EF4444", fontWeight: 600 }}>كلمتا المرور غير متطابقتين</div>
              )}
              {pwConfirm && pwNew && pwConfirm === pwNew && (
                <div style={{ marginTop: "0.3rem", fontSize: "0.73rem", color: "#10B981", fontWeight: 600 }}>✓ متطابقتان</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <button
              onClick={changePassword}
              disabled={pwSaving}
              style={{
                background: pwSaving ? "#aaa" : "linear-gradient(135deg,#7C3AED,#5B21B6)",
                color: "white", border: "none", borderRadius: "10px",
                padding: "0.7rem 2rem", cursor: pwSaving ? "not-allowed" : "pointer",
                fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem",
                boxShadow: "0 4px 16px rgba(124,58,237,0.25)", transition: "all 0.2s",
              }}>
              {pwSaving ? "⏳ جاري التغيير..." : "🔐 تغيير كلمة المرور"}
            </button>
          </div>
        </div>
      </div>

      {/* Restore confirm dialog */}
      <ConfirmDialog
        isOpen={pendingRestore !== null}
        title="استعادة القيم الأصلية"
        message={`هل تريد استعادة القيم الأصلية لـ "${pendingRestore?.label}"؟ سيتم الحفظ تلقائيًا فور الاستعادة.`}
        confirmLabel="استعادة وحفظ"
        cancelLabel="إلغاء"
        onConfirm={doRestore}
        onCancel={() => setPendingRestore(null)}
      />
    </div>
  );
}
