import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";

const EMPTY_PKG = {
  slug: "", icon: "🏖️", titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "",
  longDescriptionAr: "", longDescriptionEn: "", category: "safari",
  priceEGP: 0, maxPriceEGP: 0, durationAr: "", durationEn: "", color: "#00AAFF",
  badgeAr: "", badgeEn: "", badgeColor: "#C9A84C", featured: false, popular: false,
  familyFriendly: false, foreignerFriendly: false, childrenFriendly: false,
  experienceLevel: "easy", rating: 4.5, reviewCount: 0,
  images: [] as string[],
  includesAr: [] as string[], includesEn: [] as string[],
  excludesAr: [] as string[], excludesEn: [] as string[],
  whatToBringAr: [] as string[], whatToBringEn: [] as string[],
  suitableFor: [] as string[],
  itineraryAr: [] as { title: string; desc: string }[],
  itineraryEn: [] as { title: string; desc: string }[],
  whyThisTripAr: [] as { icon: string; text: string }[],
  whyThisTripEn: [] as { icon: string; text: string }[],
  faq: [] as { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[],
  cancellationAr: "", cancellationEn: "",
  includesMeals: false, includesTransport: false, includesAccommodation: false,
  minGroupSize: 1, maxGroupSize: 20, active: true, sortOrder: 0,
  status: "draft" as "draft" | "published" | "archived",
};

type FormData = typeof EMPTY_PKG;

function mapApiToForm(data: Record<string, any>): FormData {
  const safeArr = (v: any): any[] => {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
  };
  const safeStr = (v: any, def = ""): string =>
    v !== null && v !== undefined ? String(v) : def;
  const safeBool = (v: any, def = false): boolean =>
    v !== null && v !== undefined ? Boolean(v) : def;
  const safeNum = (v: any, def = 0): number =>
    v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v) : def;

  return {
    slug: safeStr(data.slug),
    icon: safeStr(data.icon, "🏖️"),
    titleAr: safeStr(data.titleAr),
    titleEn: safeStr(data.titleEn),
    descriptionAr: safeStr(data.descriptionAr),
    descriptionEn: safeStr(data.descriptionEn),
    longDescriptionAr: safeStr(data.longDescriptionAr),
    longDescriptionEn: safeStr(data.longDescriptionEn),
    category: safeStr(data.category, "safari"),
    priceEGP: safeNum(data.priceEGP),
    maxPriceEGP: safeNum(data.maxPriceEGP),
    durationAr: safeStr(data.durationAr),
    durationEn: safeStr(data.durationEn),
    color: safeStr(data.color, "#00AAFF"),
    badgeAr: safeStr(data.badgeAr),
    badgeEn: safeStr(data.badgeEn),
    badgeColor: safeStr(data.badgeColor, "#C9A84C"),
    featured: safeBool(data.featured),
    popular: safeBool(data.popular),
    familyFriendly: safeBool(data.familyFriendly),
    foreignerFriendly: safeBool(data.foreignerFriendly),
    childrenFriendly: safeBool(data.childrenFriendly),
    experienceLevel: safeStr(data.experienceLevel, "easy"),
    rating: safeNum(data.rating, 4.5),
    reviewCount: safeNum(data.reviewCount),
    images: safeArr(data.images) as string[],
    includesAr: safeArr(data.includesAr) as string[],
    includesEn: safeArr(data.includesEn) as string[],
    excludesAr: safeArr(data.excludesAr) as string[],
    excludesEn: safeArr(data.excludesEn) as string[],
    whatToBringAr: safeArr(data.whatToBringAr) as string[],
    whatToBringEn: safeArr(data.whatToBringEn) as string[],
    suitableFor: safeArr(data.suitableFor) as string[],
    itineraryAr: safeArr(data.itineraryAr) as { title: string; desc: string }[],
    itineraryEn: safeArr(data.itineraryEn) as { title: string; desc: string }[],
    whyThisTripAr: safeArr(data.whyThisTripAr) as { icon: string; text: string }[],
    whyThisTripEn: safeArr(data.whyThisTripEn) as { icon: string; text: string }[],
    faq: safeArr(data.faq) as { questionAr: string; questionEn: string; answerAr: string; answerEn: string }[],
    cancellationAr: safeStr(data.cancellationAr),
    cancellationEn: safeStr(data.cancellationEn),
    includesMeals: safeBool(data.includesMeals),
    includesTransport: safeBool(data.includesTransport),
    includesAccommodation: safeBool(data.includesAccommodation),
    minGroupSize: safeNum(data.minGroupSize, 1),
    maxGroupSize: safeNum(data.maxGroupSize, 20),
    active: safeBool(data.active, true),
    sortOrder: safeNum(data.sortOrder),
    status: (["draft", "published", "archived"].includes(data.status) ? data.status : "draft") as FormData["status"],
  };
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px",
  border: "1.5px solid #d0dce8", outline: "none", fontSize: "0.88rem",
  fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
  color: "#0D1B2A", background: "white",
};
const labelSt: React.CSSProperties = {
  display: "block", color: "#667788", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.3rem",
};
const cardSt: React.CSSProperties = {
  background: "#f9fafb", border: "1.5px solid #e0e8f0", borderRadius: "10px",
  padding: "1rem", marginBottom: "0.75rem",
};
const addBtnSt: React.CSSProperties = {
  width: "100%", padding: "0.6rem", background: "#00AAFF10",
  border: "2px dashed #00AAFF40", borderRadius: "8px", cursor: "pointer",
  color: "#00AAFF", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.85rem",
};
const rmBtnSt: React.CSSProperties = {
  background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: "6px",
  color: "#EF4444", cursor: "pointer", padding: "0.3rem 0.6rem", fontSize: "0.8rem", fontWeight: 700,
};

const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: "0.9rem" }}>
    <label style={labelSt}>{label}</label>
    {children}
  </div>
);

const ArrField = ({ label, items, onAdd, onRemove, inputVal, setInputVal, placeholder }: any) => (
  <div style={{ marginBottom: "0.9rem" }}>
    <label style={labelSt}>{label} <span style={{ color: "#99aabb", fontWeight: 400 }}>({items.length})</span></label>
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
      <input style={{ ...inputSt, flex: 1 }} value={inputVal} placeholder={placeholder}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(inputVal); setInputVal(""); } }} />
      <button type="button" onClick={() => { onAdd(inputVal); setInputVal(""); }}
        style={{ padding: "0.5rem 0.9rem", background: "#00AAFF", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>+</button>
    </div>
    {items.map((item: string, i: number) => (
      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f9fafb", borderRadius: "6px", padding: "0.4rem 0.75rem", marginBottom: "0.3rem" }}>
        <span style={{ flex: 1, fontSize: "0.85rem", color: "#0D1B2A" }}>{item}</span>
        <button type="button" onClick={() => onRemove(i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "1rem", lineHeight: 1, fontWeight: 700 }}>×</button>
      </div>
    ))}
  </div>
);

export default function PackageFormPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id && params.id !== "new";
  const pkgId = isEdit ? params.id : null;

  const [form, setForm] = useState<FormData>({ ...EMPTY_PKG });
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("basic");
  const [formKey, setFormKey] = useState(0);

  const [imgInput, setImgInput] = useState("");
  const [incArInput, setIncArInput] = useState("");
  const [incEnInput, setIncEnInput] = useState("");
  const [excArInput, setExcArInput] = useState("");
  const [excEnInput, setExcEnInput] = useState("");
  const [bringArInput, setBringArInput] = useState("");
  const [bringEnInput, setBringEnInput] = useState("");
  const [suitInput, setSuitInput] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "لديك تغييرات غير محفوظة. هل أنت متأكد من المغادرة؟";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const loadPackage = useCallback(async (id: string) => {
    setLoading(true);
    setLoadError("");
    try {
      const r = await adminFetch(`/admin/packages/${id}`);
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const data = await r.json();
      const mapped = mapApiToForm(data);
      setForm(mapped);
      setFormKey(k => k + 1);
      setIsDirty(false);
    } catch (e: any) {
      setLoadError(e.message || "فشل تحميل بيانات الباقة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (pkgId) {
      loadPackage(pkgId);
    }
  }, [pkgId, loadPackage]);

  const set = (key: keyof FormData, val: any) => {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
    setIsDirty(true);
  };
  const toggle = (key: keyof FormData) => {
    setForm(f => ({ ...f, [key]: !f[key] }));
    setSaved(false);
    setIsDirty(true);
  };

  const save = async () => {
    setError("");
    setSaved(false);
    if (!form.slug?.trim()) { setError("الـ Slug مطلوب"); return; }
    if (!form.titleAr?.trim()) { setError("العنوان العربي مطلوب"); return; }
    if (!form.titleEn?.trim()) { setError("العنوان الإنجليزي مطلوب"); return; }
    if (!form.descriptionAr?.trim()) { setError("الوصف المختصر (عربي) مطلوب"); return; }
    if (!form.descriptionEn?.trim()) { setError("Short Description (English) is required"); return; }
    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const path = isEdit ? `/admin/packages/${pkgId}` : "/admin/packages";
      const r = await adminFetch(path, { method, body: JSON.stringify(form) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || "خطأ في الحفظ");
        return;
      }
      setSaved(true);
      setIsDirty(false);
      toastSuccess(isEdit ? "تم تحديث الباقة بنجاح" : "تم إنشاء الباقة بنجاح");
      setTimeout(() => navigate("/admin/packages"), 900);
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const addToArr = (key: keyof FormData, val: string) => {
    if (!val.trim()) return;
    setForm(f => ({ ...f, [key]: [...(f[key] as string[]), val.trim()] }));
  };
  const removeFromArr = (key: keyof FormData, idx: number) => {
    setForm(f => ({ ...f, [key]: (f[key] as string[]).filter((_, i) => i !== idx) }));
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadError("");
    try {
      const reqRes = await adminFetch("/storage/uploads/request-url", {
        method: "POST",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqRes.ok) {
        const err = await reqRes.json().catch(() => ({}));
        setUploadError(err.error || "فشل طلب رفع الصورة");
        return;
      }
      const { uploadURL, objectPath } = await reqRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT", headers: { "Content-Type": file.type }, body: file,
      });
      if (!uploadRes.ok) { setUploadError("فشل رفع الملف إلى التخزين"); return; }
      const publicUrl = `/api/storage/public-objects?path=${encodeURIComponent(objectPath.replace(/^\//, ""))}`;
      setForm(f => ({ ...f, images: [...f.images, publicUrl] }));
    } catch (e: any) {
      setUploadError(e.message || "خطأ في الرفع");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const TABS = [
    { id: "basic", label: "📋 أساسي" },
    { id: "media", label: "🖼️ الصور" },
    { id: "includes", label: "✅ يشمل" },
    { id: "content", label: "📖 المحتوى" },
    { id: "flags", label: "⚙️ خيارات" },
  ];

  if (loading) return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div style={{ height: 28, width: 220, background: "#e0e8f0", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: 36, width: 80, background: "#e0e8f0", borderRadius: 8 }} />
      </div>
      <div style={{ background: "white", borderRadius: 16, padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", padding: "3rem 2rem", color: "#667788" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⏳</div>
          <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>جاري تحميل بيانات الباقة...</div>
          <div style={{ fontSize: "0.85rem", color: "#99aabb" }}>يرجى الانتظار</div>
        </div>
      </div>
    </div>
  );

  if (loadError) return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
        <div style={{ color: "#DC2626", fontWeight: 700, marginBottom: "0.75rem", fontSize: "1rem" }}>فشل تحميل بيانات الباقة</div>
        <div style={{ color: "#667788", fontSize: "0.9rem", marginBottom: "1.5rem" }}>{loadError}</div>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <button onClick={() => pkgId && loadPackage(pkgId)}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
            🔄 إعادة المحاولة
          </button>
          <button onClick={() => navigate("/admin/packages")}
            style={{ background: "#f0f4f8", border: "none", borderRadius: 8, padding: "0.65rem 1.5rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "#667788" }}>
            ← العودة
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 860 }} key={formKey}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.3rem", margin: 0 }}>
            {isEdit ? `تعديل باقة: ${form.titleAr || "..."}` : "إضافة باقة جديدة"}
          </h2>
          {isDirty && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
              <span style={{ color: "#F59E0B", fontSize: "0.78rem", fontWeight: 700 }}>تغييرات غير محفوظة</span>
            </div>
          )}
        </div>
        <button onClick={() => {
          if (isDirty && !window.confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة بدون حفظ؟")) return;
          navigate("/admin/packages");
        }}
          style={{ background: "#f0f4f8", border: "none", borderRadius: 8, padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", color: "#667788", fontWeight: 600 }}>
          ← رجوع
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "white", borderRadius: 12, padding: "0.4rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, minWidth: 80, padding: "0.55rem", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", background: tab === t.id ? "#00AAFF" : "transparent", color: tab === t.id ? "white" : "#667788", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: 16, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>

        {/* ── TAB: BASIC ── */}
        {tab === "basic" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="Slug (معرّف فريد بالإنجليزية) *">
                <input style={inputSt} value={form.slug} placeholder="full-safari"
                  onChange={e => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))} />
              </F>
              <F label="الأيقونة (Emoji)">
                <input style={inputSt} value={form.icon} onChange={e => set("icon", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="العنوان (عربي) *">
                <input style={inputSt} value={form.titleAr} onChange={e => set("titleAr", e.target.value)} />
              </F>
              <F label="Title (English) *">
                <input style={inputSt} value={form.titleEn} onChange={e => set("titleEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الوصف المختصر (عربي) *">
                <textarea style={{ ...inputSt, minHeight: 80, resize: "vertical" }} value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} />
              </F>
              <F label="Short Description (English) *">
                <textarea style={{ ...inputSt, minHeight: 80, resize: "vertical" }} value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الوصف الكامل (عربي)">
                <textarea style={{ ...inputSt, minHeight: 120, resize: "vertical" }} value={form.longDescriptionAr} onChange={e => set("longDescriptionAr", e.target.value)} />
              </F>
              <F label="Full Description (English)">
                <textarea style={{ ...inputSt, minHeight: 120, resize: "vertical" }} value={form.longDescriptionEn} onChange={e => set("longDescriptionEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <F label="الفئة">
                <select style={inputSt} value={form.category} onChange={e => set("category", e.target.value)}>
                  <option value="safari">سفاري</option>
                  <option value="yacht">يخت</option>
                  <option value="complete">شاملة</option>
                  <option value="family">عائلية</option>
                </select>
              </F>
              <F label="السعر الأدنى (جنيه)">
                <input type="number" style={inputSt} value={form.priceEGP} onChange={e => set("priceEGP", parseInt(e.target.value) || 0)} />
              </F>
              <F label="السعر الأقصى (جنيه)">
                <input type="number" style={inputSt} value={form.maxPriceEGP} onChange={e => set("maxPriceEGP", parseInt(e.target.value) || 0)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="المدة (عربي)">
                <input style={inputSt} value={form.durationAr} placeholder="يوم كامل — ٨ ساعات" onChange={e => set("durationAr", e.target.value)} />
              </F>
              <F label="Duration (English)">
                <input style={inputSt} value={form.durationEn} placeholder="Full Day — 8 Hours" onChange={e => set("durationEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
              <F label="اللون الرئيسي">
                <input type="color" style={{ ...inputSt, height: 42, cursor: "pointer" }} value={form.color} onChange={e => set("color", e.target.value)} />
              </F>
              <F label="شارة (عربي)">
                <input style={inputSt} value={form.badgeAr} placeholder="الأكثر طلباً" onChange={e => set("badgeAr", e.target.value)} />
              </F>
              <F label="Badge (English)">
                <input style={inputSt} value={form.badgeEn} placeholder="Most Popular" onChange={e => set("badgeEn", e.target.value)} />
              </F>
              <F label="لون الشارة">
                <input type="color" style={{ ...inputSt, height: 42, cursor: "pointer" }} value={form.badgeColor || "#C9A84C"} onChange={e => set("badgeColor", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <F label="التقييم (1-5)">
                <input type="number" step="0.1" min="1" max="5" style={inputSt} value={form.rating} onChange={e => set("rating", parseFloat(e.target.value) || 4.5)} />
              </F>
              <F label="عدد التقييمات">
                <input type="number" style={inputSt} value={form.reviewCount} onChange={e => set("reviewCount", parseInt(e.target.value) || 0)} />
              </F>
              <F label="الترتيب">
                <input type="number" style={inputSt} value={form.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value) || 0)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="سياسة الإلغاء (عربي)">
                <textarea style={{ ...inputSt, minHeight: 60, resize: "vertical" }} value={form.cancellationAr} onChange={e => set("cancellationAr", e.target.value)} />
              </F>
              <F label="Cancellation Policy (English)">
                <textarea style={{ ...inputSt, minHeight: 60, resize: "vertical" }} value={form.cancellationEn} onChange={e => set("cancellationEn", e.target.value)} />
              </F>
            </div>

            <F label="حالة النشر">
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {(["draft", "published", "archived"] as const).map(s => {
                  const labels = { draft: "مسودة 📝", published: "منشور ✅", archived: "مؤرشف 🗃️" };
                  const colors = { draft: "#F59E0B", published: "#10B981", archived: "#6B7280" };
                  return (
                    <label key={s} style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.9rem", borderRadius: 8, border: `2px solid ${form.status === s ? colors[s] : "#e0e8f0"}`, background: form.status === s ? `${colors[s]}12` : "transparent", cursor: "pointer", transition: "all 0.2s" }}>
                      <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => set("status", s)} style={{ accentColor: colors[s] }} />
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: form.status === s ? colors[s] : "#667788" }}>{labels[s]}</span>
                    </label>
                  );
                })}
              </div>
            </F>
          </div>
        )}

        {/* ── TAB: MEDIA ── */}
        {tab === "media" && (
          <div>
            <div style={{ marginBottom: "1.25rem", background: "#f0f7ff", border: "2px dashed #00AAFF40", borderRadius: 12, padding: "1.25rem" }}>
              <div style={{ color: "#0066cc", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>📁 رفع صورة من الجهاز</div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                style={{ background: uploading ? "#aaa" : "#00AAFF", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: 8, cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
                {uploading ? "جاري الرفع..." : "اختر صورة"}
              </button>
              <span style={{ color: "#8899aa", fontSize: "0.78rem", marginRight: "0.75rem" }}>JPG / PNG / WebP</span>
              {uploadError && <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "0.5rem" }}>{uploadError}</div>}
            </div>

            <ArrField label="أو أضف رابط صورة (URL)" items={form.images}
              onAdd={(v: string) => addToArr("images", v)} onRemove={(i: number) => removeFromArr("images", i)}
              inputVal={imgInput} setInputVal={setImgInput} placeholder="https://images.unsplash.com/..." />

            {form.images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: "0.75rem", marginTop: "0.75rem" }}>
                {form.images.map((url, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#f0f4f8" }}>
                    <img src={url} alt={`img-${i}`}
                      style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={() => removeFromArr("images", i)}
                      style={{ position: "absolute", top: 4, insetInlineEnd: 4, background: "rgba(220,38,38,0.9)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem" }}>×</button>
                    {i === 0 && <div style={{ position: "absolute", bottom: 4, insetInlineStart: 4, background: "#00AAFF", color: "white", fontSize: "0.6rem", padding: "0.1rem 0.4rem", borderRadius: 4, fontWeight: 700 }}>رئيسية</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: INCLUDES ── */}
        {tab === "includes" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <ArrField label="يشمل (عربي)" items={form.includesAr}
                onAdd={(v: string) => addToArr("includesAr", v)} onRemove={(i: number) => removeFromArr("includesAr", i)}
                inputVal={incArInput} setInputVal={setIncArInput} placeholder="غداء مصري أصيل" />
              <ArrField label="Includes (English)" items={form.includesEn}
                onAdd={(v: string) => addToArr("includesEn", v)} onRemove={(i: number) => removeFromArr("includesEn", i)}
                inputVal={incEnInput} setInputVal={setIncEnInput} placeholder="Authentic Egyptian lunch" />
              <ArrField label="لا يشمل (عربي)" items={form.excludesAr}
                onAdd={(v: string) => addToArr("excludesAr", v)} onRemove={(i: number) => removeFromArr("excludesAr", i)}
                inputVal={excArInput} setInputVal={setExcArInput} placeholder="المواصلات" />
              <ArrField label="Excludes (English)" items={form.excludesEn}
                onAdd={(v: string) => addToArr("excludesEn", v)} onRemove={(i: number) => removeFromArr("excludesEn", i)}
                inputVal={excEnInput} setInputVal={setExcEnInput} placeholder="Transportation" />
            </div>
            <hr style={{ border: "none", borderTop: "1.5px solid #e0e8f0", margin: "1.25rem 0" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
              <ArrField label="ماذا تحضر (عربي)" items={form.whatToBringAr}
                onAdd={(v: string) => addToArr("whatToBringAr", v)} onRemove={(i: number) => removeFromArr("whatToBringAr", i)}
                inputVal={bringArInput} setInputVal={setBringArInput} placeholder="نظارة شمسية" />
              <ArrField label="What to Bring (English)" items={form.whatToBringEn}
                onAdd={(v: string) => addToArr("whatToBringEn", v)} onRemove={(i: number) => removeFromArr("whatToBringEn", i)}
                inputVal={bringEnInput} setInputVal={setBringEnInput} placeholder="Sunglasses" />
            </div>
            <ArrField label="مناسبة لـ (Suitable For)" items={form.suitableFor}
              onAdd={(v: string) => addToArr("suitableFor", v)} onRemove={(i: number) => removeFromArr("suitableFor", i)}
              inputVal={suitInput} setInputVal={setSuitInput} placeholder="الأزواج — Couples" />
          </div>
        )}

        {/* ── TAB: CONTENT ── */}
        {tab === "content" && (
          <div>
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                🗓️ برنامج الرحلة (Itinerary)
                <span style={{ color: "#99aabb", fontWeight: 400, fontSize: "0.85rem" }}>{form.itineraryAr.length} يوم</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ color: "#667788", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>البرنامج (عربي)</div>
                  {form.itineraryAr.map((item, i) => (
                    <div key={i} style={cardSt}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#00AAFF", fontWeight: 800, fontSize: "0.8rem" }}>اليوم {i + 1}</span>
                        <button type="button" onClick={() => setForm(f => ({ ...f, itineraryAr: f.itineraryAr.filter((_, j) => j !== i) }))} style={rmBtnSt}>×</button>
                      </div>
                      <input style={{ ...inputSt, marginBottom: "0.4rem" }} value={item.title} placeholder="عنوان اليوم"
                        onChange={e => setForm(f => ({ ...f, itineraryAr: f.itineraryAr.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))} />
                      <textarea style={{ ...inputSt, minHeight: 60, resize: "vertical" }} value={item.desc} placeholder="وصف تفصيلي لليوم"
                        onChange={e => setForm(f => ({ ...f, itineraryAr: f.itineraryAr.map((x, j) => j === i ? { ...x, desc: e.target.value } : x) }))} />
                    </div>
                  ))}
                  <button type="button" style={addBtnSt}
                    onClick={() => setForm(f => ({ ...f, itineraryAr: [...f.itineraryAr, { title: "", desc: "" }] }))}>
                    + إضافة يوم (عربي)
                  </button>
                </div>
                <div>
                  <div style={{ color: "#667788", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>Itinerary (English)</div>
                  {form.itineraryEn.map((item, i) => (
                    <div key={i} style={cardSt}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ color: "#00AAFF", fontWeight: 800, fontSize: "0.8rem" }}>Day {i + 1}</span>
                        <button type="button" onClick={() => setForm(f => ({ ...f, itineraryEn: f.itineraryEn.filter((_, j) => j !== i) }))} style={rmBtnSt}>×</button>
                      </div>
                      <input style={{ ...inputSt, marginBottom: "0.4rem" }} value={item.title} placeholder="Day title"
                        onChange={e => setForm(f => ({ ...f, itineraryEn: f.itineraryEn.map((x, j) => j === i ? { ...x, title: e.target.value } : x) }))} />
                      <textarea style={{ ...inputSt, minHeight: 60, resize: "vertical" }} value={item.desc} placeholder="Detailed day description"
                        onChange={e => setForm(f => ({ ...f, itineraryEn: f.itineraryEn.map((x, j) => j === i ? { ...x, desc: e.target.value } : x) }))} />
                    </div>
                  ))}
                  <button type="button" style={addBtnSt}
                    onClick={() => setForm(f => ({ ...f, itineraryEn: [...f.itineraryEn, { title: "", desc: "" }] }))}>
                    + Add Day (English)
                  </button>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1.5px solid #e0e8f0", margin: "1.25rem 0" }} />

            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem", marginBottom: "1rem" }}>
                ⭐ لماذا هذه الرحلة؟ (Why This Trip?)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ color: "#667788", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>المميزات (عربي)</div>
                  {form.whyThisTripAr.map((item, i) => (
                    <div key={i} style={{ ...cardSt, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input style={{ ...inputSt, width: 50 }} value={item.icon} placeholder="🌊"
                        onChange={e => setForm(f => ({ ...f, whyThisTripAr: f.whyThisTripAr.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) }))} />
                      <input style={{ ...inputSt, flex: 1 }} value={item.text} placeholder="ميزة مميزة"
                        onChange={e => setForm(f => ({ ...f, whyThisTripAr: f.whyThisTripAr.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))} />
                      <button type="button" onClick={() => setForm(f => ({ ...f, whyThisTripAr: f.whyThisTripAr.filter((_, j) => j !== i) }))} style={rmBtnSt}>×</button>
                    </div>
                  ))}
                  <button type="button" style={addBtnSt}
                    onClick={() => setForm(f => ({ ...f, whyThisTripAr: [...f.whyThisTripAr, { icon: "✨", text: "" }] }))}>
                    + إضافة ميزة (عربي)
                  </button>
                </div>
                <div>
                  <div style={{ color: "#667788", fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.5rem" }}>Features (English)</div>
                  {form.whyThisTripEn.map((item, i) => (
                    <div key={i} style={{ ...cardSt, display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input style={{ ...inputSt, width: 50 }} value={item.icon} placeholder="🌊"
                        onChange={e => setForm(f => ({ ...f, whyThisTripEn: f.whyThisTripEn.map((x, j) => j === i ? { ...x, icon: e.target.value } : x) }))} />
                      <input style={{ ...inputSt, flex: 1 }} value={item.text} placeholder="Unique feature"
                        onChange={e => setForm(f => ({ ...f, whyThisTripEn: f.whyThisTripEn.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))} />
                      <button type="button" onClick={() => setForm(f => ({ ...f, whyThisTripEn: f.whyThisTripEn.filter((_, j) => j !== i) }))} style={rmBtnSt}>×</button>
                    </div>
                  ))}
                  <button type="button" style={addBtnSt}
                    onClick={() => setForm(f => ({ ...f, whyThisTripEn: [...f.whyThisTripEn, { icon: "✨", text: "" }] }))}>
                    + Add Feature (English)
                  </button>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1.5px solid #e0e8f0", margin: "1.25rem 0" }} />

            <div>
              <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                ❓ الأسئلة الشائعة (FAQ)
                <span style={{ color: "#99aabb", fontWeight: 400, fontSize: "0.85rem" }}>{form.faq.length} سؤال</span>
              </div>
              {form.faq.map((item, i) => (
                <div key={i} style={{ ...cardSt, borderColor: "#00AAFF20" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ color: "#00AAFF", fontWeight: 800, fontSize: "0.85rem" }}>سؤال {i + 1}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, faq: f.faq.filter((_, j) => j !== i) }))} style={rmBtnSt}>× حذف</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <F label="السؤال (عربي)">
                      <input style={inputSt} value={item.questionAr} placeholder="ما هو وقت الالتقاء؟"
                        onChange={e => setForm(f => ({ ...f, faq: f.faq.map((x, j) => j === i ? { ...x, questionAr: e.target.value } : x) }))} />
                    </F>
                    <F label="Question (English)">
                      <input style={inputSt} value={item.questionEn} placeholder="What is the meeting time?"
                        onChange={e => setForm(f => ({ ...f, faq: f.faq.map((x, j) => j === i ? { ...x, questionEn: e.target.value } : x) }))} />
                    </F>
                    <F label="الإجابة (عربي)">
                      <textarea style={{ ...inputSt, minHeight: 70, resize: "vertical" }} value={item.answerAr} placeholder="الالتقاء في..."
                        onChange={e => setForm(f => ({ ...f, faq: f.faq.map((x, j) => j === i ? { ...x, answerAr: e.target.value } : x) }))} />
                    </F>
                    <F label="Answer (English)">
                      <textarea style={{ ...inputSt, minHeight: 70, resize: "vertical" }} value={item.answerEn} placeholder="Meeting at..."
                        onChange={e => setForm(f => ({ ...f, faq: f.faq.map((x, j) => j === i ? { ...x, answerEn: e.target.value } : x) }))} />
                    </F>
                  </div>
                </div>
              ))}
              <button type="button" style={addBtnSt}
                onClick={() => setForm(f => ({ ...f, faq: [...f.faq, { questionAr: "", questionEn: "", answerAr: "", answerEn: "" }] }))}>
                + إضافة سؤال جديد
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: FLAGS ── */}
        {tab === "flags" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "1rem" }}>
              {[
                { key: "featured" as keyof FormData, label: "باقة مميزة ⭐" },
                { key: "popular" as keyof FormData, label: "الأكثر طلباً 🔥" },
                { key: "familyFriendly" as keyof FormData, label: "مناسبة للعائلة 👨‍👩‍👧" },
                { key: "foreignerFriendly" as keyof FormData, label: "مناسبة للأجانب 🌍" },
                { key: "childrenFriendly" as keyof FormData, label: "مناسبة للأطفال 👶" },
                { key: "includesMeals" as keyof FormData, label: "تشمل وجبات 🍽️" },
                { key: "includesTransport" as keyof FormData, label: "تشمل مواصلات 🚌" },
                { key: "includesAccommodation" as keyof FormData, label: "تشمل إقامة 🏨" },
                { key: "active" as keyof FormData, label: "ظاهرة للزوار 👁️" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: form[key] ? "#00AAFF08" : "#f9fafb", border: `1.5px solid ${form[key] ? "#00AAFF30" : "#e0e8f0"}`, borderRadius: 10, padding: "0.75rem 1rem", cursor: "pointer", transition: "all 0.2s" }}>
                  <input type="checkbox" checked={form[key] as boolean} onChange={() => toggle(key)} style={{ accentColor: "#00AAFF", width: 16, height: 16 }} />
                  <span style={{ color: form[key] ? "#00AAFF" : "#667788", fontWeight: 700, fontSize: "0.85rem" }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "1.25rem" }}>
              <F label="مستوى الصعوبة">
                <select style={inputSt} value={form.experienceLevel} onChange={e => set("experienceLevel", e.target.value)}>
                  <option value="easy">سهل</option>
                  <option value="moderate">متوسط</option>
                  <option value="hard">صعب</option>
                </select>
              </F>
              <F label="الحد الأدنى للمجموعة">
                <input type="number" style={inputSt} value={form.minGroupSize} onChange={e => set("minGroupSize", parseInt(e.target.value) || 1)} />
              </F>
              <F label="الحد الأقصى للمجموعة">
                <input type="number" style={inputSt} value={form.maxGroupSize} onChange={e => set("maxGroupSize", parseInt(e.target.value) || 20)} />
              </F>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: 10, padding: "0.75rem 1rem", marginTop: "1rem", textAlign: "center", fontWeight: 600 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: "0.85rem", background: saved ? "linear-gradient(135deg,#10B981,#059669)" : saving ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: 12, cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "1rem", transition: "background 0.3s" }}>
          {saving ? "⏳ جاري الحفظ..." : saved ? "✅ تم الحفظ!" : isEdit ? "💾 حفظ التعديلات" : "✅ إنشاء الباقة"}
        </button>
        <button onClick={() => {
          if (isDirty && !window.confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة؟")) return;
          navigate("/admin/packages");
        }} disabled={saving}
          style={{ padding: "0.85rem 1.5rem", background: "#f0f4f8", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "#667788" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
