import { useEffect, useRef, useState } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiUrl } from "../lib/api";
import ShareCard, { GRADIENT_PRESETS, THEME_OPTIONS } from "../components/ShareCard";
import { AdminQRSection } from "../components/ShareCardQR";
import ShareCardScanStats from "../components/ShareCardScanStats";
import { type SiteSettings } from "../context/SiteDataContext";

const QR_SOURCE_PRESETS = [
  { value: "flyer",   labelAr: "فلاير",      labelEn: "Flyer" },
  { value: "boat",    labelAr: "المركب",     labelEn: "Boat" },
  { value: "office",  labelAr: "المكتب",     labelEn: "Office" },
  { value: "digital", labelAr: "رقمي",       labelEn: "Digital" },
];

const inputBase: React.CSSProperties = {
  width: "100%", padding: "0.7rem 0.9rem", borderRadius: "10px",
  border: "1.5px solid var(--border)", outline: "none", fontSize: "0.9rem",
  fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
  color: "var(--text-primary)", background: "var(--bg-surface-solid)",
};

const labelStyle: React.CSSProperties = {
  display: "block", color: "var(--text-muted)", fontWeight: 800, fontSize: "0.82rem", marginBottom: "0.4rem",
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface-solid)", borderRadius: "14px", border: "1.5px solid var(--border)",
  padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem",
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onChange(!checked); }}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: checked ? "#00AAFF" : "var(--border)",
        transition: "background 0.25s", flexShrink: 0, padding: 0,
      }}
      role="switch" aria-checked={checked}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 20, height: 20, borderRadius: "50%", background: "var(--bg-surface-solid)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)", transition: "left 0.25s",
      }} />
    </button>
  );
}

const LINK_FIELDS: { key: string; toggleKey: string; valueKey: string; labelAr: string; labelEn: string; placeholder: string; type?: "url" | "tel" | "email" }[] = [
  { key: "whatsapp",  toggleKey: "card_show_whatsapp",  valueKey: "whatsapp_number", labelAr: "واتساب",                     labelEn: "WhatsApp",        placeholder: "201205756024",          type: "tel" },
  { key: "phone",     toggleKey: "card_show_phone",     valueKey: "phone_number",    labelAr: "رقم الهاتف",                  labelEn: "Phone",           placeholder: "+20 120 575 6024",      type: "tel" },
  { key: "facebook",  toggleKey: "card_show_facebook",  valueKey: "facebook_url",    labelAr: "Facebook",                   labelEn: "Facebook",        placeholder: "https://facebook.com/...", type: "url" },
  { key: "instagram", toggleKey: "card_show_instagram", valueKey: "instagram_url",   labelAr: "Instagram",                  labelEn: "Instagram",       placeholder: "https://instagram.com/...", type: "url" },
  { key: "tiktok",    toggleKey: "card_show_tiktok",    valueKey: "tiktok_url",      labelAr: "TikTok",                     labelEn: "TikTok",          placeholder: "https://tiktok.com/@...", type: "url" },
  { key: "email",     toggleKey: "card_show_email",     valueKey: "card_email",      labelAr: "البريد الإلكتروني",            labelEn: "Email",           placeholder: "hello@drtravel.com",    type: "email" },
  { key: "website",   toggleKey: "card_show_website",   valueKey: "card_website_url",labelAr: "الموقع الإلكتروني",            labelEn: "Website",         placeholder: "https://drtravel.com",  type: "url" },
  { key: "maps",      toggleKey: "card_show_maps",      valueKey: "maps_url",        labelAr: "موقع جوجل ماب",               labelEn: "Google Maps",     placeholder: "https://maps.google.com/?q=...", type: "url" },
];

const SOLID_COLOR_PRESETS = ["#0D1B2A", "#10243a", "#1a3a5c", "#0e3a1f", "#3a2a10", "#2d0e2e", "#000000"];
const ACCENT_COLOR_PRESETS = ["#00AAFF", "#C9A84C", "#25D366", "#A855F7", "#EC4899", "#F97316", "#16a34a", "#06B6D4"];

export default function AdminShareCardPage() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgError, setBgError] = useState("");
  const [qrSource, setQrSource] = useState("");
  const bgFileRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<SiteSettings>({});
  const { success, error: toastError } = useToast();

  const update = (key: string, value: string) => {
    setSettings(s => {
      const next = { ...s, [key]: value };
      settingsRef.current = next;
      return next;
    });
  };
  const updateBool = (key: string, v: boolean) => update(key, v ? "true" : "false");

  useEffect(() => {
    setLoading(true);
    adminFetch("/admin/settings")
      .then(r => r.ok ? r.json() : {})
      .then((data: SiteSettings) => {
        const merged = data || {};
        setSettings(merged);
        settingsRef.current = merged;
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (override?: SiteSettings, silent = false) => {
    const payload = override ?? settingsRef.current;
    setSaving(true);
    try {
      const r = await adminFetch("/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
      if (!r.ok) {
        if (!silent) toastError("فشل حفظ الإعدادات");
        return false;
      }
      if (!silent) success("تم حفظ بطاقة المشاركة بنجاح ✅");
      return true;
    } catch {
      if (!silent) toastError("خطأ في الاتصال");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const uploadBg = async (file: File) => {
    setBgUploading(true);
    setBgError("");
    try {
      const reqRes = await adminFetch("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        setBgError(err.error || "فشل رفع الصورة");
        return;
      }
      const { uploadURL, publicUrl } = await reqRes.json();
      const uploadRes = await fetch(apiUrl(uploadURL), { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) { setBgError("فشل رفع الملف"); return; }
      if (!publicUrl) { setBgError("لم يتم استلام رابط الملف"); return; }

      const next = { ...settingsRef.current, card_bg_image_url: publicUrl, card_bg_type: "image" };
      settingsRef.current = next;
      setSettings({ ...next });
      const ok = await save(next, true);
      if (ok) success("تم رفع صورة الخلفية وحفظها ✅");
    } catch (e: any) {
      setBgError(e.message || "خطأ في الرفع");
    } finally {
      setBgUploading(false);
      if (bgFileRef.current) bgFileRef.current.value = "";
    }
  };

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/card` : "/card";
  const [copied, setCopied] = useState(false);
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      success("تم نسخ الرابط ✅");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toastError("تعذر نسخ الرابط");
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "var(--section-subtitle)", fontFamily: "Cairo, sans-serif" }}>جاري التحميل...</div>;
  }

  const bgType = settings.card_bg_type || "gradient";
  const accent = settings.card_accent_color || "#00AAFF";
  const theme = settings.card_theme || "glass";

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>🪪 بطاقة المشاركة / Share Card</h2>
        <p style={{ color: "var(--section-subtitle)", fontSize: "0.88rem", margin: 0 }}>
          صفحة بسيطة (Linktree-style) تجمع كل وسائل التواصل في مكان واحد. شارك الرابط مع عملائك على الواتساب أو في البايو.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,440px)", gap: "1.5rem", alignItems: "start" }}
        className="share-card-admin-grid">
        <style>{`
          @media (max-width: 1023px) {
            .share-card-admin-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>

        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Share URL */}
          <div style={{ ...cardStyle, background: "linear-gradient(135deg,#0D1B2A,#10243a)", color: "white", border: "none" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ color: "#00AAFF", fontWeight: 800, fontSize: "0.78rem" }}>🔗 رابط البطاقة العام</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <code style={{ flex: 1, minWidth: 200, background: "rgba(0,0,0,0.3)", color: "#fff", padding: "0.6rem 0.85rem", borderRadius: "10px", fontSize: "0.85rem", direction: "ltr", textAlign: "left", overflow: "auto" }}>
                  {shareUrl}
                </code>
                <button type="button" onClick={copyShareUrl}
                  style={{ background: copied ? "#16a34a" : "#00AAFF", color: copied ? "white" : "var(--bg-page-2)", border: "none", borderRadius: "10px", padding: "0.6rem 1rem", fontWeight: 800, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
                  {copied ? "✓ تم النسخ" : "نسخ الرابط"}
                </button>
                <a href={shareUrl} target="_blank" rel="noreferrer"
                  style={{ background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border-strong)", borderRadius: "10px", padding: "0.6rem 1rem", fontWeight: 700, textDecoration: "none", fontSize: "0.85rem" }}>
                  🌐 افتح
                </a>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div style={cardStyle}>
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontWeight: 900, fontSize: "1.05rem" }}>🪪 الهوية</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>اسم العرض (عربي)</label>
                <input type="text" style={inputBase} value={settings.card_display_name_ar || ""} onChange={e => update("card_display_name_ar", e.target.value)} placeholder={settings.brand_name || "DR Travel"} />
              </div>
              <div>
                <label style={labelStyle}>Display Name (English)</label>
                <input type="text" style={{ ...inputBase, direction: "ltr" }} value={settings.card_display_name_en || ""} onChange={e => update("card_display_name_en", e.target.value)} placeholder={settings.brand_name || "DR Travel"} />
              </div>
              <div>
                <label style={labelStyle}>الوصف القصير (عربي)</label>
                <input type="text" style={inputBase} value={settings.card_tagline_ar || ""} onChange={e => update("card_tagline_ar", e.target.value)} placeholder={settings.brand_tagline_ar || "يخت سياحة وسفاري"} />
              </div>
              <div>
                <label style={labelStyle}>Tagline (English)</label>
                <input type="text" style={{ ...inputBase, direction: "ltr" }} value={settings.card_tagline_en || ""} onChange={e => update("card_tagline_en", e.target.value)} placeholder={settings.brand_tagline_en || "Yacht Tourism & Safari"} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>نبذة (عربي)</label>
                <textarea style={{ ...inputBase, minHeight: 70, resize: "vertical", lineHeight: 1.7 }} value={settings.card_bio_ar || ""} onChange={e => update("card_bio_ar", e.target.value)} placeholder="نقدّم أفضل تجارب السفاري واليخت في مرسى مطروح..." />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Bio (English)</label>
                <textarea style={{ ...inputBase, direction: "ltr", minHeight: 70, resize: "vertical", lineHeight: 1.7 }} value={settings.card_bio_en || ""} onChange={e => update("card_bio_en", e.target.value)} placeholder="We offer the best safari and yacht experiences in Marsa Matruh..." />
              </div>
            </div>
          </div>

          {/* Links */}
          <div style={cardStyle}>
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontWeight: 900, fontSize: "1.05rem" }}>🔗 الروابط ووسائل التواصل</h3>
            <p style={{ margin: 0, color: "var(--section-subtitle)", fontSize: "0.78rem" }}>
              فعّل الزر اللي عايزه يظهر في البطاقة، وامسح القيمة عشان يختفي. كل الروابط مشتركة مع باقي إعدادات الموقع.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {LINK_FIELDS.map(f => {
                const enabled = (settings[f.toggleKey] ?? "true") === "true";
                return (
                  <div key={f.key} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.6rem", alignItems: "center", padding: "0.65rem 0.7rem", background: "var(--bg-surface-sunk)", border: "1.5px solid var(--border)", borderRadius: "12px" }}>
                    <Toggle checked={enabled} onChange={v => updateBool(f.toggleKey, v)} />
                    <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "0.5rem", alignItems: "center" }}>
                      <div style={{ fontWeight: 800, color: "var(--text-primary)", fontSize: "0.85rem" }}>{f.labelAr}</div>
                      <input type={f.type || "text"} style={{ ...inputBase, padding: "0.5rem 0.7rem", fontSize: "0.83rem", direction: f.type === "url" || f.type === "email" ? "ltr" : undefined, opacity: enabled ? 1 : 0.55 }}
                        value={settings[f.valueKey] || ""} onChange={e => update(f.valueKey, e.target.value)} placeholder={f.placeholder} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appearance */}
          <div style={cardStyle}>
            <h3 style={{ margin: 0, color: "var(--text-primary)", fontWeight: 900, fontSize: "1.05rem" }}>🎨 المظهر</h3>

            {/* Theme */}
            <div>
              <label style={labelStyle}>تصميم البطاقة</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "0.5rem" }}>
                {THEME_OPTIONS.map(t => {
                  const active = theme === t.value;
                  return (
                    <button key={t.value} type="button" onClick={() => update("card_theme", t.value)}
                      style={{
                        textAlign: "right", padding: "0.7rem 0.8rem", borderRadius: "12px",
                        border: `2px solid ${active ? "#00AAFF" : "var(--border)"}`,
                        background: active ? "rgba(0,170,255,0.12)" : "var(--bg-surface-solid)",
                        color: "var(--text-primary)", cursor: "pointer", fontFamily: "Cairo, sans-serif",
                        display: "flex", flexDirection: "column", gap: "0.2rem",
                      }}>
                      <span style={{ fontWeight: 800, fontSize: "0.92rem" }}>{t.labelAr} · {t.labelEn}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--section-subtitle)", lineHeight: 1.5 }}>{t.descAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <label style={labelStyle}>اللون المميز (Accent)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                {ACCENT_COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => update("card_accent_color", c)} title={c}
                    style={{ width: 34, height: 34, borderRadius: "10px", background: c, border: accent === c ? "3px solid var(--text-primary)" : "2px solid var(--border-strong)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer" }} />
                ))}
                <input type="color" value={accent} onChange={e => update("card_accent_color", e.target.value)}
                  style={{ width: 50, height: 36, border: "1.5px solid var(--border)", borderRadius: 10, padding: 0, background: "var(--bg-surface-solid)", cursor: "pointer" }} />
                <input type="text" value={accent} onChange={e => update("card_accent_color", e.target.value)} style={{ ...inputBase, width: 110, padding: "0.45rem 0.65rem", fontSize: "0.82rem", direction: "ltr" }} />
              </div>
            </div>

            {/* Background type */}
            <div>
              <label style={labelStyle}>نوع الخلفية</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {[
                  { value: "gradient", label: "تدرّج" },
                  { value: "solid",    label: "لون واحد" },
                  { value: "image",    label: "صورة" },
                ].map(opt => {
                  const active = bgType === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => update("card_bg_type", opt.value)}
                      style={{ padding: "0.55rem 1.1rem", borderRadius: 10, border: `2px solid ${active ? "#00AAFF" : "var(--border)"}`, background: active ? "rgba(0,170,255,0.12)" : "var(--bg-surface-solid)", color: "var(--text-primary)", fontWeight: 800, fontFamily: "Cairo, sans-serif", cursor: "pointer", fontSize: "0.85rem" }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {bgType === "gradient" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px,1fr))", gap: "0.5rem" }}>
                  {GRADIENT_PRESETS.map(g => {
                    const active = (settings.card_bg_gradient || "ocean") === g.value;
                    return (
                      <button key={g.value} type="button" onClick={() => update("card_bg_gradient", g.value)}
                        style={{ padding: "0.6rem", borderRadius: 12, border: `2px solid ${active ? "#00AAFF" : "transparent"}`, background: g.css, color: "#fff", fontWeight: 800, fontFamily: "Cairo, sans-serif", cursor: "pointer", fontSize: "0.78rem", height: 60, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
                        {g.labelAr}
                      </button>
                    );
                  })}
                </div>
              )}

              {bgType === "solid" && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  {SOLID_COLOR_PRESETS.map(c => (
                    <button key={c} type="button" onClick={() => update("card_bg_color", c)} title={c}
                      style={{ width: 34, height: 34, borderRadius: "10px", background: c, border: (settings.card_bg_color || "#0D1B2A") === c ? "3px solid #00AAFF" : "2px solid var(--border-strong)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer" }} />
                  ))}
                  <input type="color" value={settings.card_bg_color || "#0D1B2A"} onChange={e => update("card_bg_color", e.target.value)}
                    style={{ width: 50, height: 36, border: "1.5px solid var(--border)", borderRadius: 10, padding: 0, background: "var(--bg-surface-solid)", cursor: "pointer" }} />
                  <input type="text" value={settings.card_bg_color || "#0D1B2A"} onChange={e => update("card_bg_color", e.target.value)} style={{ ...inputBase, width: 110, padding: "0.45rem 0.65rem", fontSize: "0.82rem", direction: "ltr" }} />
                </div>
              )}

              {bgType === "image" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <input ref={bgFileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) uploadBg(f); }} style={{ display: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => bgFileRef.current?.click()} disabled={bgUploading}
                      style={{ padding: "0.6rem 1.1rem", borderRadius: 10, border: "none", background: "#00AAFF", color: "white", fontWeight: 800, fontFamily: "Cairo, sans-serif", cursor: bgUploading ? "wait" : "pointer", fontSize: "0.85rem" }}>
                      {bgUploading ? "جاري الرفع..." : "📷 رفع صورة خلفية"}
                    </button>
                    {settings.card_bg_image_url && (
                      <button type="button" onClick={() => update("card_bg_image_url", "")}
                        style={{ padding: "0.6rem 1rem", borderRadius: 10, border: "1.5px solid #ef4444", background: "var(--bg-surface-solid)", color: "#ef4444", fontWeight: 700, fontFamily: "Cairo, sans-serif", cursor: "pointer", fontSize: "0.82rem" }}>
                        إزالة الصورة
                      </button>
                    )}
                  </div>
                  {bgError && <div style={{ color: "#ef4444", fontSize: "0.8rem" }}>{bgError}</div>}
                  {settings.card_bg_image_url && (
                    <div style={{ fontSize: "0.78rem", color: "var(--section-subtitle)", direction: "ltr", textAlign: "left", wordBreak: "break-all" }}>
                      {settings.card_bg_image_url}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <AdminQRSection
            url={shareUrl}
            fg={settings.card_qr_fg || "#0D1B2A"}
            bg={settings.card_qr_bg || "#FFFFFF"}
            embedOnCard={(settings.card_qr_show_on_card ?? "false") === "true"}
            logoUrl={settings.logo_url}
            filenameBase={settings.brand_short_name || settings.brand_name || "dr-travel-share"}
            brandAccent={accent}
            source={qrSource}
            sourcePresets={QR_SOURCE_PRESETS}
            onChange={patch => {
              if (patch.fg !== undefined) update("card_qr_fg", patch.fg);
              if (patch.bg !== undefined) update("card_qr_bg", patch.bg);
              if (patch.embedOnCard !== undefined) updateBool("card_qr_show_on_card", patch.embedOnCard);
              if (patch.source !== undefined) setQrSource(patch.source);
            }}
          />

          {/* Scan analytics */}
          <ShareCardScanStats sourcePresets={QR_SOURCE_PRESETS} />

          {/* Save */}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-start", position: "sticky", bottom: 0, background: "var(--bg-surface-2)", padding: "0.5rem 0" }}>
            <button type="button" onClick={() => save()} disabled={saving}
              style={{ padding: "0.85rem 2rem", borderRadius: 12, border: "none", background: saving ? "#a0b4c8" : "#16a34a", color: "white", fontWeight: 900, fontFamily: "Cairo, sans-serif", cursor: saving ? "wait" : "pointer", fontSize: "0.95rem", boxShadow: "0 6px 16px rgba(22,163,74,0.3)" }}>
              {saving ? "جاري الحفظ..." : "💾 حفظ التغييرات"}
            </button>
          </div>
        </div>

        {/* Right: Live preview */}
        <div style={{ position: "sticky", top: "1rem" }}>
          <div style={{ marginBottom: "0.6rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "0.95rem" }}>👁️ معاينة مباشرة</div>
            <div style={{ color: "var(--section-subtitle)", fontSize: "0.75rem" }}>التغييرات تظهر هنا قبل الحفظ</div>
          </div>
          <div style={{ borderRadius: 18, overflow: "hidden", border: "1.5px solid var(--border)", boxShadow: "0 14px 30px rgba(0,0,0,0.12)", maxHeight: "calc(100vh - 8rem)", overflowY: "auto", background: "var(--bg-page-2)" }}>
            <ShareCard settings={settings} />
          </div>
        </div>
      </div>
    </div>
  );
}
