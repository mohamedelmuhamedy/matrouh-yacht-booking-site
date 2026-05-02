import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiUrl, resolveApiAssetUrl } from "../lib/api";
import { buildFeatureFromText, getFeatureVisual, type FeatureItem } from "../lib/featureVisuals";

type FormState = {
  slug: string;
  icon: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  longDescriptionAr: string;
  longDescriptionEn: string;
  imageUrl: string;
  aboutImageUrl: string;
  featuresImageUrl: string;
  ctaImageUrl: string;
  color: string;
  features: FeatureItem[];
  ctaTextAr: string;
  ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  slug: "",
  icon: "✨",
  titleAr: "",
  titleEn: "",
  descriptionAr: "",
  descriptionEn: "",
  longDescriptionAr: "",
  longDescriptionEn: "",
  imageUrl: "",
  aboutImageUrl: "",
  featuresImageUrl: "",
  ctaImageUrl: "",
  color: "#00AAFF",
  features: [],
  ctaTextAr: "احجز الآن",
  ctaTextEn: "Book Now",
  ctaLink: "/trips",
  sortOrder: 0,
  isActive: true,
};

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.85rem",
  borderRadius: 8,
  border: "1.5px solid #d0dce8",
  outline: "none",
  fontSize: "0.88rem",
  fontFamily: "Cairo, sans-serif",
  boxSizing: "border-box",
  color: "#0D1B2A",
  background: "white",
};
const labelSt: React.CSSProperties = {
  display: "block",
  color: "#667788",
  fontWeight: 700,
  fontSize: "0.78rem",
  marginBottom: "0.3rem",
};
const sectionSt: React.CSSProperties = {
  background: "white",
  borderRadius: 14,
  padding: "1.25rem",
  marginBottom: "1rem",
  border: "1.5px solid #e0e8f0",
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};
const ghostBtnSt: React.CSSProperties = {
  background: "white",
  color: "#475569",
  border: "1px solid #d0dce8",
  borderRadius: 8,
  padding: "0.4rem 0.75rem",
  cursor: "pointer",
  fontFamily: "Cairo, sans-serif",
  fontSize: "0.76rem",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
  whiteSpace: "nowrap",
};

type ImageField = "imageUrl" | "aboutImageUrl" | "featuresImageUrl" | "ctaImageUrl";

function uploadFile(file: File): Promise<{ url: string } | { error: string }> {
  return new Promise((resolve) => {
    const token = localStorage.getItem("admin_token");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiUrl("/api/admin/storage/upload"));
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { publicUrl, url } = JSON.parse(xhr.responseText);
          resolve({ url: publicUrl || url });
        } catch { resolve({ error: "خطأ في استجابة الخادم" }); }
      } else {
        try { resolve({ error: JSON.parse(xhr.responseText)?.error || `فشل الرفع (${xhr.status})` }); }
        catch { resolve({ error: `فشل الرفع (${xhr.status})` }); }
      }
    };
    xhr.onerror = () => resolve({ error: "خطأ في الاتصال بالخادم" });
    xhr.send(file);
  });
}

function ImageUploadField({
  label, value, onChange, hint, onReset,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  onReset?: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { error: toastErr } = useToast();
  const preview = value ? resolveApiAssetUrl(value) : "";

  const handlePick = () => fileRef.current?.click();
  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toastErr("الرجاء اختيار صورة فقط");
      return;
    }
    setUploading(true);
    const r = await uploadFile(file);
    if ("url" in r) onChange(r.url);
    else toastErr(r.error);
    setUploading(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
        <label style={labelSt}>{label}</label>
        {onReset && (
          <button type="button" onClick={onReset}
            title="استعادة الافتراضي (إزالة الصورة)"
            style={{ background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.72rem", fontWeight: 700, padding: 0 }}>
            ↺ افتراضي
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div style={{
        display: "flex", gap: "0.6rem", alignItems: "center",
        padding: "0.6rem", border: "1.5px dashed #d0dce8", borderRadius: 10,
        background: "#fafbfc",
      }}>
        {preview ? (
          <img src={preview} alt="" style={{ width: 64, height: 48, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#eef" }} />
        ) : (
          <div style={{ width: 64, height: 48, borderRadius: 6, background: "#eef2f7", display: "flex", alignItems: "center", justifyContent: "center", color: "#aabbcc", flexShrink: 0, fontSize: "1.3rem" }}>🖼️</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <button type="button" onClick={handlePick} disabled={uploading}
              style={{ background: uploading ? "#94a3b8" : "#00AAFF", color: "white", border: "none", borderRadius: 6, padding: "0.4rem 0.85rem", cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "Cairo, sans-serif" }}>
              {uploading ? "جاري الرفع..." : (preview ? "تغيير" : "📁 رفع صورة")}
            </button>
            {preview && (
              <button type="button" onClick={() => onChange("")}
                style={{ background: "white", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "0.4rem 0.85rem", cursor: "pointer", fontWeight: 700, fontSize: "0.8rem", fontFamily: "Cairo, sans-serif" }}>
                حذف
              </button>
            )}
          </div>
          {hint && <div style={{ color: "#94a3b8", fontSize: "0.7rem", marginTop: "0.3rem" }}>{hint}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Per-feature compact editor card ────────────────────────────────────────
function FeatureEditorCard({
  feat, index, total, onChange, onRemove, onMove, onAutoSuggest,
}: {
  feat: FeatureItem;
  index: number;
  total: number;
  onChange: (next: FeatureItem) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onAutoSuggest: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { error: toastErr } = useToast();

  const preview = feat.image ? resolveApiAssetUrl(feat.image) : "";

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toastErr("الرجاء اختيار صورة فقط");
      return;
    }
    setUploading(true);
    const r = await uploadFile(file);
    if ("url" in r) onChange({ ...feat, image: r.url });
    else toastErr(r.error);
    setUploading(false);
  };

  return (
    <div style={{
      background: "#f8fafc",
      border: "1.5px solid #e2e8f0",
      borderRadius: 12,
      padding: "0.85rem",
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      gap: "0.85rem",
    }}>
      {/* Left: image preview + upload */}
      <div>
        <div style={{
          width: "100%", height: 90, borderRadius: 10, overflow: "hidden",
          background: preview ? `url(${preview}) center/cover` : `linear-gradient(135deg, ${feat.tint}33, ${feat.tint}aa)`,
          border: "1px solid #d0dce8",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: preview ? 0 : "1.8rem", color: "white",
          marginBottom: "0.35rem",
        }}>
          {!preview && feat.icon}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ ...ghostBtnSt, background: uploading ? "#cbd5e1" : "#00AAFF", color: "white", border: "none", justifyContent: "center" }}>
            {uploading ? "..." : (preview ? "📁 تغيير" : "📁 رفع صورة")}
          </button>
          {preview && (
            <button type="button" onClick={() => onChange({ ...feat, image: "" })}
              style={{ ...ghostBtnSt, color: "#dc2626", borderColor: "#fca5a5", justifyContent: "center" }}>
              🗑 حذف الصورة
            </button>
          )}
        </div>
      </div>

      {/* Right: text + meta + actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label style={{ ...labelSt, marginBottom: 2, fontSize: "0.7rem" }}>العنوان بالعربية</label>
            <input style={inputSt} value={feat.titleAr}
              onChange={e => onChange({ ...feat, titleAr: e.target.value })}
              placeholder="مثال: يخت فاخر مكيّف" />
          </div>
          <div>
            <label style={{ ...labelSt, marginBottom: 2, fontSize: "0.7rem" }}>Title (English)</label>
            <input style={inputSt} dir="ltr" value={feat.titleEn}
              onChange={e => onChange({ ...feat, titleEn: e.target.value })}
              placeholder="e.g. Luxury yacht" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "70px 80px 1fr auto", gap: "0.5rem", alignItems: "end" }}>
          <div>
            <label style={{ ...labelSt, marginBottom: 2, fontSize: "0.7rem" }}>أيقونة</label>
            <input style={{ ...inputSt, fontSize: "1.2rem", textAlign: "center", padding: "0.35rem" }}
              value={feat.icon} maxLength={4}
              onChange={e => onChange({ ...feat, icon: e.target.value })} />
          </div>
          <div>
            <label style={{ ...labelSt, marginBottom: 2, fontSize: "0.7rem" }}>اللون</label>
            <input type="color" style={{ ...inputSt, padding: "0.15rem", height: 36 }}
              value={feat.tint}
              onChange={e => onChange({ ...feat, tint: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "end", paddingBottom: 1 }}>
            <button type="button" onClick={onAutoSuggest} title="إعادة اقتراح من العنوان"
              style={{ ...ghostBtnSt, color: "#0369a1", borderColor: "#bae6fd", background: "#f0f9ff" }}>
              💡 اقتراح
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.25rem", alignItems: "end", paddingBottom: 1 }}>
            <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
              title="تحريك لأعلى"
              style={{ ...ghostBtnSt, padding: "0.4rem 0.55rem", opacity: index === 0 ? 0.4 : 1, cursor: index === 0 ? "not-allowed" : "pointer" }}>
              ▲
            </button>
            <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
              title="تحريك لأسفل"
              style={{ ...ghostBtnSt, padding: "0.4rem 0.55rem", opacity: index === total - 1 ? 0.4 : 1, cursor: index === total - 1 ? "not-allowed" : "pointer" }}>
              ▼
            </button>
            <button type="button" onClick={onRemove} title="حذف الميزة"
              style={{ ...ghostBtnSt, color: "#dc2626", borderColor: "#fca5a5", padding: "0.4rem 0.55rem" }}>
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminServiceFormPage() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { success, error: toastError } = useToast();

  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null && !isNaN(editId);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    adminFetch(`/admin/services/${editId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        // Build features list: prefer rich array, else build from old AR/EN strings.
        let features: FeatureItem[] = [];
        if (Array.isArray(d.features) && d.features.length) {
          features = d.features.map((x: any) => ({
            titleAr: String(x?.titleAr ?? ""),
            titleEn: String(x?.titleEn ?? ""),
            icon: String(x?.icon ?? "✨"),
            image: String(x?.image ?? ""),
            tint: String(x?.tint ?? "#00AAFF"),
          }));
        } else {
          const arArr: string[] = Array.isArray(d.featuresAr) ? d.featuresAr : [];
          const enArr: string[] = Array.isArray(d.featuresEn) ? d.featuresEn : [];
          const max = Math.max(arArr.length, enArr.length);
          for (let i = 0; i < max; i++) {
            const ar = arArr[i] || "";
            const en = enArr[i] || "";
            if (!ar && !en) continue;
            features.push(buildFeatureFromText(ar, en));
          }
        }
        setForm({
          slug: d.slug || "",
          icon: d.icon || "✨",
          titleAr: d.titleAr || "",
          titleEn: d.titleEn || "",
          descriptionAr: d.descriptionAr || "",
          descriptionEn: d.descriptionEn || "",
          longDescriptionAr: d.longDescriptionAr || "",
          longDescriptionEn: d.longDescriptionEn || "",
          imageUrl: d.imageUrl || "",
          aboutImageUrl: d.aboutImageUrl || "",
          featuresImageUrl: d.featuresImageUrl || "",
          ctaImageUrl: d.ctaImageUrl || "",
          color: d.color || "#00AAFF",
          features,
          ctaTextAr: d.ctaTextAr || "احجز الآن",
          ctaTextEn: d.ctaTextEn || "Book Now",
          ctaLink: d.ctaLink || "/trips",
          sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
          isActive: d.isActive !== false,
        });
      })
      .catch(() => toastError("فشل تحميل بيانات الخدمة"))
      .finally(() => setLoading(false));
  }, [editId]);

  const setImg = (key: ImageField) => (url: string) => setForm(f => ({ ...f, [key]: url }));
  const resetImg = (key: ImageField) => () => setForm(f => ({ ...f, [key]: "" }));

  // ── Feature editor handlers ──────────────────────────────────────────────
  const addFeature = () => {
    setForm(f => ({ ...f, features: [...f.features, buildFeatureFromText("ميزة جديدة", "New feature")] }));
  };
  const updateFeature = (i: number, next: FeatureItem) => {
    setForm(f => {
      const copy = f.features.slice();
      copy[i] = next;
      return { ...f, features: copy };
    });
  };
  const removeFeature = (i: number) => {
    setForm(f => ({ ...f, features: f.features.filter((_, idx) => idx !== i) }));
  };
  const moveFeature = (i: number, dir: -1 | 1) => {
    setForm(f => {
      const j = i + dir;
      if (j < 0 || j >= f.features.length) return f;
      const copy = f.features.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return { ...f, features: copy };
    });
  };
  const autoSuggestFeature = (i: number) => {
    setForm(f => {
      const copy = f.features.slice();
      const cur = copy[i];
      const v = getFeatureVisual([cur.titleAr, cur.titleEn].filter(Boolean).join(" "));
      copy[i] = { ...cur, icon: v.icon, image: v.image, tint: v.tint };
      return { ...f, features: copy };
    });
  };
  const resetAllFeatureVisuals = () => {
    if (!confirm("هترجع كل الأيقونات والصور والألوان لاقتراحاتها التلقائية بناءً على عناوين المميزات. تأكيد؟")) return;
    setForm(f => ({
      ...f,
      features: f.features.map(x => {
        const v = getFeatureVisual([x.titleAr, x.titleEn].filter(Boolean).join(" "));
        return { ...x, icon: v.icon, image: v.image, tint: v.tint };
      }),
    }));
  };
  const clearAllFeatures = () => {
    if (!confirm("هتمسح كل المميزات المضافة. تأكيد؟")) return;
    setForm(f => ({ ...f, features: [] }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.titleAr.trim()) {
      toastError("المعرف (Slug) والعنوان بالعربية مطلوبان");
      return;
    }
    setSaving(true);
    // Sanitize features client-side: drop empties, trim.
    const features = form.features
      .map(x => ({
        titleAr: (x.titleAr || "").trim(),
        titleEn: (x.titleEn || "").trim(),
        icon: (x.icon || "✨").trim() || "✨",
        image: (x.image || "").trim(),
        tint: (x.tint || "#00AAFF").trim(),
      }))
      .filter(x => x.titleAr || x.titleEn);
    // Also derive legacy AR/EN string arrays so older consumers stay in sync.
    const featuresAr = features.map(x => x.titleAr || x.titleEn).filter(Boolean);
    const featuresEn = features.map(x => x.titleEn || x.titleAr).filter(Boolean);
    const payload = {
      ...form,
      features,
      featuresAr,
      featuresEn,
      sortOrder: Number(form.sortOrder) || 0,
      imageUrl: form.imageUrl.trim() || null,
      aboutImageUrl: form.aboutImageUrl.trim() || null,
      featuresImageUrl: form.featuresImageUrl.trim() || null,
      ctaImageUrl: form.ctaImageUrl.trim() || null,
    };
    try {
      const r = isEdit
        ? await adminFetch(`/admin/services/${editId}`, { method: "PUT", body: JSON.stringify(payload) })
        : await adminFetch("/admin/services", { method: "POST", body: JSON.stringify(payload) });
      if (r.ok) {
        success(isEdit ? "تم حفظ التعديلات ✅" : "تم إنشاء الخدمة ✅");
        navigate("/admin/services");
      } else {
        const d = await r.json().catch(() => ({}));
        toastError(d.error || "فشل الحفظ");
      }
    } catch {
      toastError("حدث خطأ في الاتصال");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", color: "#667788", padding: "4rem 1rem", fontFamily: "Cairo, sans-serif" }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>

      <div style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.2rem" }}>
            {isEdit ? "تعديل خدمة" : "خدمة جديدة"}
          </h1>
          <p style={{ color: "#667788", fontSize: "0.82rem", margin: 0 }}>
            {isEdit ? "حدّث بيانات الخدمة وصفحة تفاصيلها" : "أضف خدمة جديدة تظهر في الصفحة الرئيسية"}
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/services")}
          style={{ background: "white", color: "#445566", border: "1px solid #d0dce8", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
          ← رجوع
        </button>
      </div>

      <form onSubmit={handleSubmit}>

        {/* Basics */}
        <div style={sectionSt}>
          <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            المعلومات الأساسية
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "120px 100px 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <div>
              <label style={labelSt}>الأيقونة (Emoji) *</label>
              <input style={{ ...inputSt, fontSize: "1.5rem", textAlign: "center", padding: "0.4rem" }} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4} />
            </div>
            <div>
              <label style={labelSt}>اللون</label>
              <input type="color" style={{ ...inputSt, padding: "0.2rem", height: 44 }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>المعرف (Slug) *</label>
              <input style={inputSt} placeholder="desert-safari" dir="ltr" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} disabled={isEdit} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <div>
              <label style={labelSt}>العنوان بالعربية *</label>
              <input style={inputSt} value={form.titleAr} onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Title (English)</label>
              <input style={inputSt} dir="ltr" value={form.titleEn} onChange={e => setForm(f => ({ ...f, titleEn: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <div>
              <label style={labelSt}>الوصف القصير بالعربية *</label>
              <textarea style={{ ...inputSt, minHeight: 70, resize: "vertical" }} value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Short description (EN)</label>
              <textarea style={{ ...inputSt, minHeight: 70, resize: "vertical" }} dir="ltr" value={form.descriptionEn} onChange={e => setForm(f => ({ ...f, descriptionEn: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Cover images for the detail page sections */}
        <div style={sectionSt}>
          <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "0.4rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            🖼️ صور غلاف صفحة التفاصيل
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 1rem" }}>
            كل صورة بتظهر كخلفية احترافية للسيكشن المخصص لها. اضغط <b>"↺ افتراضي"</b> لإزالة الصورة وعرض تدرج لوني بسيط بدلاً منها.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <ImageUploadField
              label="🌅 صورة الغلاف الرئيسية (الهيدر)"
              value={form.imageUrl}
              onChange={setImg("imageUrl")}
              onReset={resetImg("imageUrl")}
              hint="بتظهر خلف العنوان في أعلى الصفحة"
            />
            <ImageUploadField
              label="📖 صورة سيكشن (نبذة عن الخدمة)"
              value={form.aboutImageUrl}
              onChange={setImg("aboutImageUrl")}
              onReset={resetImg("aboutImageUrl")}
              hint="بتظهر فوق الوصف الطويل"
            />
            <ImageUploadField
              label="✨ صورة سيكشن (المميزات)"
              value={form.featuresImageUrl}
              onChange={setImg("featuresImageUrl")}
              onReset={resetImg("featuresImageUrl")}
              hint="بتظهر فوق قائمة المميزات"
            />
            <ImageUploadField
              label="🎯 صورة سيكشن (دعوة الحجز)"
              value={form.ctaImageUrl}
              onChange={setImg("ctaImageUrl")}
              onReset={resetImg("ctaImageUrl")}
              hint="بتظهر خلف زر الحجز و الواتساب"
            />
          </div>
        </div>

        {/* Long descriptions */}
        <div style={sectionSt}>
          <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            الوصف الطويل
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <div>
              <label style={labelSt}>الوصف الطويل بالعربية</label>
              <textarea style={{ ...inputSt, minHeight: 130, resize: "vertical" }} value={form.longDescriptionAr} onChange={e => setForm(f => ({ ...f, longDescriptionAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Long description (EN)</label>
              <textarea style={{ ...inputSt, minHeight: 130, resize: "vertical" }} dir="ltr" value={form.longDescriptionEn} onChange={e => setForm(f => ({ ...f, longDescriptionEn: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Features — rich editor */}
        <div style={sectionSt}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", margin: 0 }}>
              ✨ مميزات الخدمة
            </h2>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {form.features.length > 0 && (
                <button type="button" onClick={resetAllFeatureVisuals}
                  title="ترجع كل أيقونة وصورة ولون لاقتراح الافتراضي بناءً على العنوان"
                  style={{ ...ghostBtnSt, color: "#0369a1", borderColor: "#bae6fd", background: "#f0f9ff" }}>
                  ↺ استعادة الاقتراحات الافتراضية
                </button>
              )}
              {form.features.length > 0 && (
                <button type="button" onClick={clearAllFeatures}
                  style={{ ...ghostBtnSt, color: "#dc2626", borderColor: "#fca5a5" }}>
                  🗑 مسح كل المميزات
                </button>
              )}
            </div>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "0 0 1rem" }}>
            كل ميزة لها عنوان عربي/إنجليزي + أيقونة + لون + صورة خلفية. أضف الصورة بنفسك أو اضغط <b>💡 اقتراح</b> لاختيار صورة وأيقونة ولون تلقائيًا حسب العنوان.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
            {form.features.map((feat, i) => (
              <FeatureEditorCard
                key={i}
                feat={feat}
                index={i}
                total={form.features.length}
                onChange={(next) => updateFeature(i, next)}
                onRemove={() => removeFeature(i)}
                onMove={(dir) => moveFeature(i, dir)}
                onAutoSuggest={() => autoSuggestFeature(i)}
              />
            ))}
            {form.features.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", padding: "1.25rem", background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10 }}>
                لا توجد مميزات بعد. اضغط "+ إضافة ميزة" لإضافة أول ميزة.
              </div>
            )}
          </div>

          <button type="button" onClick={addFeature}
            style={{
              marginTop: "0.85rem",
              width: "100%",
              background: "white",
              color: "#0369a1",
              border: "1.5px dashed #00AAFF",
              borderRadius: 10,
              padding: "0.7rem",
              cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
              fontSize: "0.88rem",
              fontWeight: 700,
            }}>
            + إضافة ميزة
          </button>
        </div>

        {/* CTA & misc */}
        <div style={sectionSt}>
          <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            زر الإجراء (CTA) والترتيب
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <div>
              <label style={labelSt}>نص الزر بالعربية</label>
              <input style={inputSt} value={form.ctaTextAr} onChange={e => setForm(f => ({ ...f, ctaTextAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Button text (EN)</label>
              <input style={inputSt} dir="ltr" value={form.ctaTextEn} onChange={e => setForm(f => ({ ...f, ctaTextEn: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>رابط الزر</label>
              <input style={inputSt} dir="ltr" placeholder="/trips" value={form.ctaLink} onChange={e => setForm(f => ({ ...f, ctaLink: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", alignItems: "end" }}>
            <div>
              <label style={labelSt}>ترتيب العرض (الأقل أولاً)</label>
              <input type="number" style={inputSt} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <div>
              <label style={{ ...labelSt, display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", marginBottom: 0, marginTop: "0.6rem" }}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} style={{ width: 18, height: 18, cursor: "pointer" }} />
                <span style={{ color: "#0D1B2A", fontSize: "0.9rem" }}>الخدمة مرئية للعملاء</span>
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" onClick={() => navigate("/admin/services")}
            style={{ background: "white", color: "#445566", border: "1px solid #d0dce8", borderRadius: 10, padding: "0.7rem 1.4rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", fontWeight: 600 }}>
            إلغاء
          </button>
          <button type="submit" disabled={saving}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 1.75rem", cursor: saving ? "not-allowed" : "pointer", fontWeight: 800, fontFamily: "Cairo, sans-serif", fontSize: "0.92rem", opacity: saving ? 0.7 : 1 }}>
            {saving ? "جاري الحفظ..." : (isEdit ? "حفظ التعديلات" : "إنشاء الخدمة")}
          </button>
        </div>
      </form>
    </div>
  );
}
