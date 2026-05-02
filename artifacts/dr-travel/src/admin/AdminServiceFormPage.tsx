import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiUrl, resolveApiAssetUrl } from "../lib/api";

const EMPTY = {
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
  featuresAr: "" as string,
  featuresEn: "" as string,
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
  label, value, onChange, hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
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
      <label style={labelSt}>{label}</label>
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

export default function AdminServiceFormPage() {
  const params = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { success, error: toastError } = useToast();

  const editId = params.id ? Number(params.id) : null;
  const isEdit = editId !== null && !isNaN(editId);

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    adminFetch(`/admin/services/${editId}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
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
          featuresAr: Array.isArray(d.featuresAr) ? d.featuresAr.join("\n") : "",
          featuresEn: Array.isArray(d.featuresEn) ? d.featuresEn.join("\n") : "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.titleAr.trim()) {
      toastError("المعرف (Slug) والعنوان بالعربية مطلوبان");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      featuresAr: form.featuresAr.split("\n").map(s => s.trim()).filter(Boolean),
      featuresEn: form.featuresEn.split("\n").map(s => s.trim()).filter(Boolean),
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
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>

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
            كل صورة بتظهر كخلفية احترافية للسيكشن المخصص لها. لو تركتها فاضية، السيكشن يستخدم تدرج لوني بسيط.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <ImageUploadField
              label="🌅 صورة الغلاف الرئيسية (الهيدر)"
              value={form.imageUrl}
              onChange={setImg("imageUrl")}
              hint="بتظهر خلف العنوان في أعلى الصفحة"
            />
            <ImageUploadField
              label="📖 صورة سيكشن (نبذة عن الخدمة)"
              value={form.aboutImageUrl}
              onChange={setImg("aboutImageUrl")}
              hint="بتظهر فوق الوصف الطويل"
            />
            <ImageUploadField
              label="✨ صورة سيكشن (المميزات)"
              value={form.featuresImageUrl}
              onChange={setImg("featuresImageUrl")}
              hint="بتظهر بجانب قائمة المميزات"
            />
            <ImageUploadField
              label="🎯 صورة سيكشن (دعوة الحجز)"
              value={form.ctaImageUrl}
              onChange={setImg("ctaImageUrl")}
              hint="بتظهر خلف زر الحجز و الواتساب"
            />
          </div>
        </div>

        {/* Detail page text content */}
        <div style={sectionSt}>
          <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1rem", paddingBottom: "0.6rem", borderBottom: "1px solid #e8eef4" }}>
            محتوى صفحة التفاصيل
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.85rem" }}>
            <div>
              <label style={labelSt}>الوصف الطويل بالعربية</label>
              <textarea style={{ ...inputSt, minHeight: 130, resize: "vertical" }} value={form.longDescriptionAr} onChange={e => setForm(f => ({ ...f, longDescriptionAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Long description (EN)</label>
              <textarea style={{ ...inputSt, minHeight: 130, resize: "vertical" }} dir="ltr" value={form.longDescriptionEn} onChange={e => setForm(f => ({ ...f, longDescriptionEn: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            <div>
              <label style={labelSt}>المميزات بالعربية (سطر لكل ميزة)</label>
              <textarea style={{ ...inputSt, minHeight: 110, resize: "vertical" }} placeholder="معدات حديثة&#10;مرشدين محترفين" value={form.featuresAr} onChange={e => setForm(f => ({ ...f, featuresAr: e.target.value }))} />
            </div>
            <div>
              <label style={labelSt}>Features (EN — one per line)</label>
              <textarea style={{ ...inputSt, minHeight: 110, resize: "vertical" }} dir="ltr" placeholder="Modern gear&#10;Professional guides" value={form.featuresEn} onChange={e => setForm(f => ({ ...f, featuresEn: e.target.value }))} />
            </div>
          </div>
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
