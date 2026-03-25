import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { adminFetch } from "./AdminContext";

const EMPTY_PKG = {
  slug: "", icon: "🏖️", titleAr: "", titleEn: "", descriptionAr: "", descriptionEn: "",
  longDescriptionAr: "", longDescriptionEn: "", category: "safari",
  priceEGP: 0, maxPriceEGP: 0, durationAr: "", durationEn: "", color: "#00AAFF",
  badgeAr: "", badgeEn: "", badgeColor: "", featured: false, popular: false,
  familyFriendly: false, foreignerFriendly: false, childrenFriendly: false,
  experienceLevel: "easy", rating: 4.5, reviewCount: 0,
  images: [] as string[],
  includesAr: [] as string[], includesEn: [] as string[],
  excludesAr: [] as string[], excludesEn: [] as string[],
  cancellationAr: "", cancellationEn: "",
  includesMeals: false, includesTransport: false, includesAccommodation: false,
  minGroupSize: 1, maxGroupSize: 20, active: true, sortOrder: 0,
  status: "draft" as "draft" | "published" | "archived",
};

type FormData = typeof EMPTY_PKG;

export default function PackageFormPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!params.id && params.id !== "new";
  const [form, setForm] = useState<FormData>({ ...EMPTY_PKG });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("basic");

  const [imgInput, setImgInput] = useState("");
  const [incArInput, setIncArInput] = useState("");
  const [incEnInput, setIncEnInput] = useState("");
  const [excArInput, setExcArInput] = useState("");
  const [excEnInput, setExcEnInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit) {
      adminFetch(`/admin/packages/${params.id}`).then(r => r.json()).then(data => {
        setForm({
          ...EMPTY_PKG, ...data,
          images: data.images || [],
          includesAr: data.includesAr || [], includesEn: data.includesEn || [],
          excludesAr: data.excludesAr || [], excludesEn: data.excludesEn || [],
          badgeAr: data.badgeAr || "", badgeEn: data.badgeEn || "", badgeColor: data.badgeColor || "",
        });
      }).finally(() => setLoading(false));
    }
  }, [params.id]);

  const set = (key: keyof FormData, val: any) => setForm(f => ({ ...f, [key]: val }));
  const toggle = (key: keyof FormData) => setForm(f => ({ ...f, [key]: !f[key] }));

  const save = async () => {
    setError("");
    if (!form.slug || !form.titleAr || !form.titleEn) {
      setError("الـ slug والعنوانان (عربي وإنجليزي) مطلوبة");
      return;
    }
    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const path = isEdit ? `/admin/packages/${params.id}` : "/admin/packages";
      const r = await adminFetch(path, { method, body: JSON.stringify(form) });
      if (!r.ok) {
        const err = await r.json();
        setError(err.error || "خطأ في الحفظ");
        return;
      }
      navigate("/admin/packages");
    } catch (e: any) {
      setError(e.message);
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
        const err = await reqRes.json();
        setUploadError(err.error || "فشل طلب رفع الصورة");
        return;
      }
      const { uploadURL, objectPath } = await reqRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
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

  const inputSt: React.CSSProperties = { width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.88rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" };
  const labelSt: React.CSSProperties = { display: "block", color: "#667788", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.3rem" };
  const F = ({ label, children }: any) => (
    <div style={{ marginBottom: "0.9rem" }}>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  );
  const ArrField = ({ label, items, onAdd, onRemove, inputVal, setInputVal, placeholder }: any) => (
    <div style={{ marginBottom: "0.9rem" }}>
      <label style={labelSt}>{label}</label>
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
          <button type="button" onClick={() => onRemove(i)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
        </div>
      ))}
    </div>
  );

  const TABS = [
    { id: "basic", label: "أساسي" },
    { id: "media", label: "الصور" },
    { id: "includes", label: "يشمل / لا يشمل" },
    { id: "flags", label: "خيارات" },
  ];

  if (loading) return <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div>;

  return (
    <div style={{ maxWidth: "860px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.3rem", margin: 0 }}>
          {isEdit ? "تعديل باقة" : "باقة جديدة"}
        </h2>
        <button onClick={() => navigate("/admin/packages")}
          style={{ background: "#f0f4f8", border: "none", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", color: "#667788", fontWeight: 600 }}>
          ← رجوع
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", background: "white", borderRadius: "12px", padding: "0.4rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "0.55rem", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem", background: tab === t.id ? "#00AAFF" : "transparent", color: tab === t.id ? "white" : "#667788", transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {/* Basic Tab */}
        {tab === "basic" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="Slug (معرّف فريد - بالإنجليزية)">
                <input style={inputSt} value={form.slug} placeholder="full-safari" onChange={e => set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
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
              <F label="الوصف المختصر (عربي)">
                <textarea style={{ ...inputSt, minHeight: "80px", resize: "vertical" }} value={form.descriptionAr} onChange={e => set("descriptionAr", e.target.value)} />
              </F>
              <F label="Short Description (English)">
                <textarea style={{ ...inputSt, minHeight: "80px", resize: "vertical" }} value={form.descriptionEn} onChange={e => set("descriptionEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الوصف الكامل (عربي)">
                <textarea style={{ ...inputSt, minHeight: "120px", resize: "vertical" }} value={form.longDescriptionAr} onChange={e => set("longDescriptionAr", e.target.value)} />
              </F>
              <F label="Full Description (English)">
                <textarea style={{ ...inputSt, minHeight: "120px", resize: "vertical" }} value={form.longDescriptionEn} onChange={e => set("longDescriptionEn", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <F label="الفئة">
                <select style={inputSt} value={form.category} onChange={e => set("category", e.target.value)}>
                  <option value="safari">سفاري</option><option value="yacht">يخت</option>
                  <option value="complete">شاملة</option><option value="family">عائلية</option>
                </select>
              </F>
              <F label="السعر الأدنى (جنيه)">
                <input type="number" style={inputSt} value={form.priceEGP} onChange={e => set("priceEGP", parseInt(e.target.value))} />
              </F>
              <F label="السعر الأقصى (جنيه)">
                <input type="number" style={inputSt} value={form.maxPriceEGP} onChange={e => set("maxPriceEGP", parseInt(e.target.value))} />
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
                <input type="color" style={{ ...inputSt, height: "42px", cursor: "pointer" }} value={form.color} onChange={e => set("color", e.target.value)} />
              </F>
              <F label="شارة (عربي)">
                <input style={inputSt} value={form.badgeAr} placeholder="مثلاً: الأكثر طلباً" onChange={e => set("badgeAr", e.target.value)} />
              </F>
              <F label="Badge (English)">
                <input style={inputSt} value={form.badgeEn} placeholder="Most Popular" onChange={e => set("badgeEn", e.target.value)} />
              </F>
              <F label="لون الشارة">
                <input type="color" style={{ ...inputSt, height: "42px", cursor: "pointer" }} value={form.badgeColor || "#C9A84C"} onChange={e => set("badgeColor", e.target.value)} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
              <F label="التقييم">
                <input type="number" step="0.1" min="1" max="5" style={inputSt} value={form.rating} onChange={e => set("rating", parseFloat(e.target.value))} />
              </F>
              <F label="عدد التقييمات">
                <input type="number" style={inputSt} value={form.reviewCount} onChange={e => set("reviewCount", parseInt(e.target.value))} />
              </F>
              <F label="الترتيب">
                <input type="number" style={inputSt} value={form.sortOrder} onChange={e => set("sortOrder", parseInt(e.target.value))} />
              </F>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="نص الإلغاء (عربي)">
                <textarea style={{ ...inputSt, minHeight: "60px" }} value={form.cancellationAr} onChange={e => set("cancellationAr", e.target.value)} />
              </F>
              <F label="Cancellation Policy (English)">
                <textarea style={{ ...inputSt, minHeight: "60px" }} value={form.cancellationEn} onChange={e => set("cancellationEn", e.target.value)} />
              </F>
            </div>
            <F label="حالة النشر">
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {(["draft", "published", "archived"] as const).map(s => {
                  const labels = { draft: "مسودة 📝", published: "منشور ✅", archived: "مؤرشف 🗃️" };
                  const colors = { draft: "#F59E0B", published: "#10B981", archived: "#6B7280" };
                  return (
                    <label key={s} style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.9rem", borderRadius: "8px", border: `2px solid ${form.status === s ? colors[s] : "#e0e8f0"}`, background: form.status === s ? `${colors[s]}12` : "transparent", cursor: "pointer", transition: "all 0.2s" }}>
                      <input type="radio" name="status" value={s} checked={form.status === s} onChange={() => set("status", s)} style={{ accentColor: colors[s] }} />
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: form.status === s ? colors[s] : "#667788" }}>{labels[s]}</span>
                    </label>
                  );
                })}
              </div>
            </F>
          </div>
        )}

        {/* Media Tab */}
        {tab === "media" && (
          <div>
            {/* File Upload */}
            <div style={{ marginBottom: "1.25rem", background: "#f0f7ff", border: "2px dashed #00AAFF40", borderRadius: "12px", padding: "1.25rem" }}>
              <div style={{ color: "#0066cc", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" }}>📁 رفع صورة من الجهاز</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }}
              />
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ background: uploading ? "#aaa" : "#00AAFF", color: "white", border: "none", padding: "0.6rem 1.25rem", borderRadius: "8px", cursor: uploading ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
                {uploading ? "جاري الرفع..." : "اختر صورة"}
              </button>
              <span style={{ color: "#8899aa", fontSize: "0.78rem", marginRight: "0.75rem" }}>JPG / PNG / WebP — حد أقصى 10MB</span>
              {uploadError && <div style={{ color: "#DC2626", fontSize: "0.8rem", marginTop: "0.5rem" }}>{uploadError}</div>}
            </div>

            {/* URL Input */}
            <ArrField label="أو أضف رابط صورة (URL)" items={form.images}
              onAdd={(v: string) => addToArr("images", v)} onRemove={(i: number) => removeFromArr("images", i)}
              inputVal={imgInput} setInputVal={setImgInput} placeholder="https://images.unsplash.com/..." />

            {/* Previews */}
            {form.images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
                {form.images.map((url, i) => (
                  <div key={i} style={{ position: "relative", borderRadius: "10px", overflow: "hidden" }}>
                    <img src={url} alt={`img-${i}`}
                      style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).parentElement!.style.background = "#f0f4f8"; (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button type="button" onClick={() => removeFromArr("images", i)}
                      style={{ position: "absolute", top: 4, insetInlineEnd: 4, background: "rgba(220,38,38,0.9)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "white", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                    {i === 0 && <div style={{ position: "absolute", bottom: 4, insetInlineStart: 4, background: "#00AAFF", color: "white", fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "4px", fontWeight: 700 }}>رئيسية</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Includes/Excludes Tab */}
        {tab === "includes" && (
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
        )}

        {/* Flags Tab */}
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
                <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: form[key] ? "#00AAFF08" : "#f9fafb", border: `1.5px solid ${form[key] ? "#00AAFF30" : "#e0e8f0"}`, borderRadius: "10px", padding: "0.75rem 1rem", cursor: "pointer", transition: "all 0.2s" }}>
                  <input type="checkbox" checked={form[key] as boolean} onChange={() => toggle(key)} style={{ accentColor: "#00AAFF", width: 16, height: 16 }} />
                  <span style={{ color: form[key] ? "#00AAFF" : "#667788", fontWeight: 700, fontSize: "0.85rem" }}>{label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "1.25rem" }}>
              <F label="مستوى الصعوبة">
                <select style={inputSt} value={form.experienceLevel} onChange={e => set("experienceLevel", e.target.value)}>
                  <option value="easy">سهل</option><option value="moderate">متوسط</option><option value="hard">صعب</option>
                </select>
              </F>
              <F label="الحد الأدنى للمجموعة">
                <input type="number" style={inputSt} value={form.minGroupSize} onChange={e => set("minGroupSize", parseInt(e.target.value))} />
              </F>
              <F label="الحد الأقصى للمجموعة">
                <input type="number" style={inputSt} value={form.maxGroupSize} onChange={e => set("maxGroupSize", parseInt(e.target.value))} />
              </F>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#DC2626", borderRadius: "10px", padding: "0.75rem 1rem", marginTop: "1rem", textAlign: "center" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: "0.85rem", background: saving ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "12px", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 800, fontSize: "1rem" }}>
          {saving ? "جاري الحفظ..." : isEdit ? "💾 حفظ التعديلات" : "✅ إنشاء الباقة"}
        </button>
        <button onClick={() => navigate("/admin/packages")}
          style={{ padding: "0.85rem 1.5rem", background: "#f0f4f8", border: "none", borderRadius: "12px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "#667788" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
