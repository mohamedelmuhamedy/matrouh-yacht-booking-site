import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiUrl } from "../lib/api";

type Bullet = { icon: string; titleAr: string; titleEn: string; descAr: string; descEn: string };
type Stat = { icon: string; value: string; labelAr: string; labelEn: string };

type FormState = {
  slug: string;
  icon: string;
  color: string;
  titleAr: string; titleEn: string;
  shortDescAr: string; shortDescEn: string;
  heroImageUrl: string;
  accentImageUrl: string;
  introAr: string; introEn: string;
  bodyAr: string; bodyEn: string;
  bullets: Bullet[];
  stats: Stat[];
  galleryImages: string[];
  ctaTextAr: string; ctaTextEn: string;
  ctaLink: string;
  sortOrder: number;
  isActive: boolean;
};

const EMPTY: FormState = {
  slug: "", icon: "✨", color: "#00AAFF",
  titleAr: "", titleEn: "",
  shortDescAr: "", shortDescEn: "",
  heroImageUrl: "", accentImageUrl: "",
  introAr: "", introEn: "",
  bodyAr: "", bodyEn: "",
  bullets: [],
  stats: [],
  galleryImages: [],
  ctaTextAr: "احجز رحلتك الآن",
  ctaTextEn: "Book Your Trip Now",
  ctaLink: "/trips",
  sortOrder: 0,
  isActive: true,
};

const inputSt: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem", borderRadius: 8,
  border: "1.5px solid #d0dce8", outline: "none", fontSize: "0.88rem",
  fontFamily: "Cairo, sans-serif", boxSizing: "border-box", color: "var(--text-primary)", background: "var(--bg-surface-solid)",
};
const labelSt: React.CSSProperties = {
  display: "block", color: "var(--section-subtitle)", fontWeight: 700, fontSize: "0.78rem", marginBottom: "0.3rem",
};
const sectionSt: React.CSSProperties = {
  background: "var(--bg-surface-solid)", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem",
  border: "1.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};
const ghostBtnSt: React.CSSProperties = {
  background: "var(--bg-surface-solid)", color: "#475569", border: "1px solid #d0dce8", borderRadius: 8,
  padding: "0.4rem 0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
  fontSize: "0.76rem", fontWeight: 700,
};

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
    xhr.onerror = () => resolve({ error: "خطأ في الاتصال" });
    xhr.send(file);
  });
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { error: toastError } = useToast();
  const [busy, setBusy] = useState(false);
  async function pick(file: File) {
    setBusy(true);
    const r = await uploadFile(file);
    setBusy(false);
    if ("error" in r) toastError(r.error);
    else onChange(r.url);
  }
  return (
    <div>
      <label style={labelSt}>{label}</label>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch", flexWrap: "wrap" }}>
        {value && <img src={value} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", border: "1.5px solid #d0dce8" }} />}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="رابط الصورة (URL)" style={{ ...inputSt, flex: 1, minWidth: 200 }} dir="ltr" />
        <label style={{ ...ghostBtnSt, opacity: busy ? 0.6 : 1, display: "inline-flex", alignItems: "center" }}>
          {busy ? "..." : "📷 رفع"}
          <input type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
        {value && <button type="button" onClick={() => onChange("")} style={{ ...ghostBtnSt, color: "#dc2626" }}>حذف</button>}
      </div>
    </div>
  );
}

export default function AdminWhyUsFormPage() {
  const params = useParams<{ id?: string }>();
  const id = params?.id ? Number(params.id) : null;
  const isEdit = id !== null;
  const { success, error: toastError } = useToast();
  const [, navigate] = useLocation();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const r = await adminFetch(`/admin/why-us/${id}`);
      if (r.ok) {
        const c = await r.json();
        setForm({
          slug: c.slug ?? "",
          icon: c.icon ?? "✨",
          color: c.color ?? "#00AAFF",
          titleAr: c.titleAr ?? "", titleEn: c.titleEn ?? "",
          shortDescAr: c.shortDescAr ?? "", shortDescEn: c.shortDescEn ?? "",
          heroImageUrl: c.heroImageUrl ?? "", accentImageUrl: c.accentImageUrl ?? "",
          introAr: c.introAr ?? "", introEn: c.introEn ?? "",
          bodyAr: c.bodyAr ?? "", bodyEn: c.bodyEn ?? "",
          bullets: Array.isArray(c.bullets) ? c.bullets : [],
          stats: Array.isArray(c.stats) ? c.stats : [],
          galleryImages: Array.isArray(c.galleryImages) ? c.galleryImages : [],
          ctaTextAr: c.ctaTextAr ?? "احجز رحلتك الآن",
          ctaTextEn: c.ctaTextEn ?? "Book Your Trip Now",
          ctaLink: c.ctaLink ?? "/trips",
          sortOrder: c.sortOrder ?? 0,
          isActive: c.isActive !== false,
        });
      } else {
        toastError("فشل تحميل البطاقة");
      }
      setLoading(false);
    })();
  }, [id]);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function save() {
    if (!form.titleAr.trim()) { toastError("العنوان بالعربي مطلوب"); return; }
    if (!form.slug.trim()) { toastError("الـ slug مطلوب"); return; }
    setSaving(true);
    try {
      const url = isEdit ? `/admin/why-us/${id}` : `/admin/why-us`;
      const method = isEdit ? "PUT" : "POST";
      const r = await adminFetch(url, { method, body: JSON.stringify(form) });
      if (r.ok) { success(isEdit ? "تم الحفظ" : "تمت الإضافة"); navigate("/admin/why-us"); }
      else { const d = await r.json().catch(() => ({})); toastError(d.error || "فشل الحفظ"); }
    } catch { toastError("حدث خطأ في الاتصال"); }
    setSaving(false);
  }

  if (loading) {
    return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "Cairo, sans-serif" }}>جاري التحميل...</div>;
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ color: "var(--text-primary)", fontWeight: 900, fontSize: "1.5rem", margin: 0 }}>
            {isEdit ? "تعديل بطاقة" : "بطاقة جديدة"}
          </h1>
          <p style={{ color: "var(--section-subtitle)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
            تحكم في كل جزء من البطاقة وصفحة تفاصيلها.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => navigate("/admin/why-us")} style={{ ...ghostBtnSt, padding: "0.6rem 1.2rem", fontSize: "0.85rem" }}>
            إلغاء
          </button>
          <button onClick={save} disabled={saving}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.6rem 1.5rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.9rem", opacity: saving ? 0.7 : 1 }}>
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>

      {/* === Identity === */}
      <div style={sectionSt}>
        <h3 style={{ color: "var(--text-primary)", margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>🆔 الهوية</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
          <div>
            <label style={labelSt}>Slug (إنجليزي بدون مسافات) *</label>
            <input dir="ltr" value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="best-prices" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>أيقونة (Emoji)</label>
            <input value={form.icon} onChange={e => set("icon", e.target.value)} placeholder="🏆" style={{ ...inputSt, fontSize: "1.4rem" }} />
          </div>
          <div>
            <label style={labelSt}>اللون الأساسي</label>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <input type="color" value={form.color} onChange={e => set("color", e.target.value)} style={{ width: 50, height: 38, border: "1.5px solid #d0dce8", borderRadius: 8, cursor: "pointer", padding: 0 }} />
              <input dir="ltr" value={form.color} onChange={e => set("color", e.target.value)} style={inputSt} />
            </div>
          </div>
          <div>
            <label style={labelSt}>ترتيب العرض</label>
            <input type="number" value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value) || 0)} style={inputSt} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => set("isActive", e.target.checked)} />
              مفعّلة
            </label>
          </div>
        </div>
      </div>

      {/* === Card text (home + hero) === */}
      <div style={sectionSt}>
        <h3 style={{ color: "var(--text-primary)", margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>🏷️ نص البطاقة (الرئيسية + الهيرو)</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <div>
            <label style={labelSt}>العنوان عربي *</label>
            <input value={form.titleAr} onChange={e => set("titleAr", e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>العنوان English</label>
            <input dir="ltr" value={form.titleEn} onChange={e => set("titleEn", e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>الوصف القصير عربي (للبطاقة)</label>
            <textarea value={form.shortDescAr} onChange={e => set("shortDescAr", e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelSt}>الوصف القصير English</label>
            <textarea dir="ltr" value={form.shortDescEn} onChange={e => set("shortDescEn", e.target.value)} rows={2} style={{ ...inputSt, resize: "vertical" }} />
          </div>
        </div>
      </div>

      {/* === Images === */}
      <div style={sectionSt}>
        <h3 style={{ color: "var(--text-primary)", margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>🖼️ الصور</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <ImageField label="صورة الهيرو (خلفية أعلى الصفحة)" value={form.heroImageUrl} onChange={v => set("heroImageUrl", v)} />
          <ImageField label="صورة فرعية (داخل قسم الحكاية)" value={form.accentImageUrl} onChange={v => set("accentImageUrl", v)} />
        </div>
      </div>

      {/* === Detail page text === */}
      <div style={sectionSt}>
        <h3 style={{ color: "var(--text-primary)", margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>📝 نصوص صفحة التفاصيل</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
          <div>
            <label style={labelSt}>المقدمة عربي</label>
            <textarea value={form.introAr} onChange={e => set("introAr", e.target.value)} rows={3} style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelSt}>المقدمة English</label>
            <textarea dir="ltr" value={form.introEn} onChange={e => set("introEn", e.target.value)} rows={3} style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelSt}>المتن عربي</label>
            <textarea value={form.bodyAr} onChange={e => set("bodyAr", e.target.value)} rows={5} style={{ ...inputSt, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelSt}>المتن English</label>
            <textarea dir="ltr" value={form.bodyEn} onChange={e => set("bodyEn", e.target.value)} rows={5} style={{ ...inputSt, resize: "vertical" }} />
          </div>
        </div>
      </div>

      {/* === Bullets === */}
      <div style={sectionSt}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: "1rem", fontWeight: 800 }}>✨ النقاط المميزة (Bullets) — {form.bullets.length}</h3>
          <button type="button" onClick={() => set("bullets", [...form.bullets, { icon: "✨", titleAr: "", titleEn: "", descAr: "", descEn: "" }])} style={ghostBtnSt}>
            + إضافة نقطة
          </button>
        </div>
        {form.bullets.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "1rem", background: "var(--bg-surface-sunk)", borderRadius: 8 }}>لا توجد نقاط بعد</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {form.bullets.map((b, i) => (
            <div key={i} style={{ background: "var(--bg-surface-sunk)", borderRadius: 10, padding: "0.85rem", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#475569", fontSize: "0.78rem", fontWeight: 700 }}>نقطة #{i + 1}</span>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {i > 0 && <button type="button" onClick={() => { const a = [...form.bullets]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set("bullets", a); }} style={ghostBtnSt}>↑</button>}
                  {i < form.bullets.length - 1 && <button type="button" onClick={() => { const a = [...form.bullets]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set("bullets", a); }} style={ghostBtnSt}>↓</button>}
                  <button type="button" onClick={() => set("bullets", form.bullets.filter((_, j) => j !== i))} style={{ ...ghostBtnSt, color: "#dc2626" }}>حذف</button>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input value={b.icon} onChange={e => { const a = [...form.bullets]; a[i] = { ...a[i], icon: e.target.value }; set("bullets", a); }} placeholder="✨" style={{ ...inputSt, fontSize: "1.2rem", textAlign: "center" }} />
                <input value={b.titleAr} onChange={e => { const a = [...form.bullets]; a[i] = { ...a[i], titleAr: e.target.value }; set("bullets", a); }} placeholder="عنوان عربي" style={inputSt} />
                <input dir="ltr" value={b.titleEn} onChange={e => { const a = [...form.bullets]; a[i] = { ...a[i], titleEn: e.target.value }; set("bullets", a); }} placeholder="Title English" style={inputSt} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <textarea value={b.descAr} onChange={e => { const a = [...form.bullets]; a[i] = { ...a[i], descAr: e.target.value }; set("bullets", a); }} placeholder="الوصف عربي" rows={2} style={{ ...inputSt, resize: "vertical" }} />
                <textarea dir="ltr" value={b.descEn} onChange={e => { const a = [...form.bullets]; a[i] = { ...a[i], descEn: e.target.value }; set("bullets", a); }} placeholder="Description English" rows={2} style={{ ...inputSt, resize: "vertical" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === Stats === */}
      <div style={sectionSt}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: "1rem", fontWeight: 800 }}>📊 الإحصائيات — {form.stats.length}</h3>
          <button type="button" onClick={() => set("stats", [...form.stats, { icon: "✨", value: "", labelAr: "", labelEn: "" }])} style={ghostBtnSt}>
            + إضافة إحصائية
          </button>
        </div>
        {form.stats.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "1rem", background: "var(--bg-surface-sunk)", borderRadius: 8 }}>لا توجد إحصائيات بعد</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {form.stats.map((s, i) => (
            <div key={i} style={{ background: "var(--bg-surface-sunk)", borderRadius: 10, padding: "0.6rem", border: "1px solid var(--border)", display: "grid", gridTemplateColumns: "50px 90px 1fr 1fr 70px", gap: "0.4rem", alignItems: "center" }}>
              <input value={s.icon} onChange={e => { const a = [...form.stats]; a[i] = { ...a[i], icon: e.target.value }; set("stats", a); }} placeholder="⭐" style={{ ...inputSt, textAlign: "center", fontSize: "1.1rem" }} />
              <input value={s.value} onChange={e => { const a = [...form.stats]; a[i] = { ...a[i], value: e.target.value }; set("stats", a); }} placeholder="5+" style={{ ...inputSt, fontWeight: 700 }} />
              <input value={s.labelAr} onChange={e => { const a = [...form.stats]; a[i] = { ...a[i], labelAr: e.target.value }; set("stats", a); }} placeholder="عربي" style={inputSt} />
              <input dir="ltr" value={s.labelEn} onChange={e => { const a = [...form.stats]; a[i] = { ...a[i], labelEn: e.target.value }; set("stats", a); }} placeholder="English" style={inputSt} />
              <button type="button" onClick={() => set("stats", form.stats.filter((_, j) => j !== i))} style={{ ...ghostBtnSt, color: "#dc2626" }}>حذف</button>
            </div>
          ))}
        </div>
      </div>

      {/* === Gallery === */}
      <div style={sectionSt}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ color: "var(--text-primary)", margin: 0, fontSize: "1rem", fontWeight: 800 }}>🖼️ المعرض — {form.galleryImages.length}</h3>
          <button type="button" onClick={() => set("galleryImages", [...form.galleryImages, ""])} style={ghostBtnSt}>
            + إضافة صورة
          </button>
        </div>
        {form.galleryImages.length === 0 && <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "1rem", background: "var(--bg-surface-sunk)", borderRadius: 8 }}>لا توجد صور في المعرض</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {form.galleryImages.map((img, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ color: "#475569", fontSize: "0.78rem", width: 24 }}>{i + 1}</span>
              <ImageField label="" value={img} onChange={v => { const a = [...form.galleryImages]; a[i] = v; set("galleryImages", a); }} />
              <button type="button" onClick={() => set("galleryImages", form.galleryImages.filter((_, j) => j !== i))} style={{ ...ghostBtnSt, color: "#dc2626", height: "fit-content" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* === CTA === */}
      <div style={sectionSt}>
        <h3 style={{ color: "var(--text-primary)", margin: "0 0 1rem", fontSize: "1rem", fontWeight: 800 }}>🎯 زر الـ CTA</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.85rem" }}>
          <div>
            <label style={labelSt}>نص الزر عربي</label>
            <input value={form.ctaTextAr} onChange={e => set("ctaTextAr", e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>نص الزر English</label>
            <input dir="ltr" value={form.ctaTextEn} onChange={e => set("ctaTextEn", e.target.value)} style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>الرابط</label>
            <input dir="ltr" value={form.ctaLink} onChange={e => set("ctaLink", e.target.value)} placeholder="/trips" style={inputSt} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
        <button onClick={() => navigate("/admin/why-us")} style={{ ...ghostBtnSt, padding: "0.7rem 1.5rem", fontSize: "0.9rem" }}>
          إلغاء
        </button>
        <button onClick={save} disabled={saving}
          style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 10, padding: "0.7rem 2rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.95rem", opacity: saving ? 0.7 : 1 }}>
          {saving ? "جاري الحفظ..." : (isEdit ? "حفظ التعديلات" : "إضافة البطاقة")}
        </button>
      </div>
    </div>
  );
}
