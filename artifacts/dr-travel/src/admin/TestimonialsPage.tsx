import { useEffect, useState, useMemo } from "react";
import { adminFetch } from "./AdminContext";

const EMPTY: TestimonialForm = {
  nameAr: "", nameEn: "", textAr: "", textEn: "",
  rating: 5, packageName: "", avatar: "", isVisible: true, sortOrder: 0,
};

interface TestimonialForm {
  nameAr: string; nameEn: string; textAr: string; textEn: string;
  rating: number; packageName: string; avatar: string; isVisible: boolean; sortOrder: number;
}

interface Testimonial extends TestimonialForm { id: number; createdAt?: string; }

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialForm>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [search, setSearch] = useState("");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px",
    border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
  };

  const load = () => {
    setLoading(true);
    setLoadError("");
    adminFetch("/admin/testimonials")
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(e => setLoadError(e.message || "فشل تحميل التقييمات"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterVisible === "visible") list = list.filter(i => i.isVisible);
    else if (filterVisible === "hidden") list = list.filter(i => !i.isVisible);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.nameAr?.toLowerCase().includes(q) ||
        i.nameEn?.toLowerCase().includes(q) ||
        i.textAr?.toLowerCase().includes(q) ||
        i.textEn?.toLowerCase().includes(q) ||
        i.packageName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, search, filterVisible]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setSaveError("");
    setShowForm(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      nameAr: item.nameAr || "",
      nameEn: item.nameEn || "",
      textAr: item.textAr || "",
      textEn: item.textEn || "",
      rating: item.rating ?? 5,
      packageName: item.packageName || "",
      avatar: item.avatar || "",
      isVisible: item.isVisible ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setSaveError("");
    setShowForm(true);
  };

  const save = async () => {
    if (!form.nameAr?.trim()) { setSaveError("الاسم (عربي) مطلوب"); return; }
    if (!form.textAr?.trim()) { setSaveError("نص التقييم (عربي) مطلوب"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const r = editing
        ? await adminFetch(`/admin/testimonials/${editing.id}`, { method: "PUT", body: JSON.stringify(form) })
        : await adminFetch("/admin/testimonials", { method: "POST", body: JSON.stringify(form) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setSaveError(err.error || "فشل الحفظ");
        return;
      }
      setShowForm(false);
      load();
    } catch (e: any) {
      setSaveError(e.message || "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("هل تريد حذف هذا التقييم نهائياً؟")) return;
    try {
      await adminFetch(`/admin/testimonials/${id}`, { method: "DELETE" });
      load();
    } catch { alert("فشل الحذف"); }
  };

  const toggleVisible = async (item: Testimonial) => {
    try {
      await adminFetch(`/admin/testimonials/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ ...item, isVisible: !item.isVisible }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isVisible: !item.isVisible } : i));
    } catch { alert("فشل التحديث"); }
  };

  const F = ({ label, children }: any) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", color: "#0D1B2A", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );

  const visibleCount = items.filter(i => i.isVisible).length;
  const hiddenCount = items.filter(i => !i.isVisible).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.25rem" }}>
            التقييمات
          </h2>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "#667788" }}>
            <span>المجموع: <strong style={{ color: "#0D1B2A" }}>{items.length}</strong></span>
            <span>ظاهر: <strong style={{ color: "#10B981" }}>{visibleCount}</strong></span>
            <span>مخفي: <strong style={{ color: "#F59E0B" }}>{hiddenCount}</strong></span>
          </div>
        </div>
        <button onClick={openNew}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
          + إضافة تقييم
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ background: "white", borderRadius: "12px", padding: "1rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ flex: 1, minWidth: 200, padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.88rem", fontFamily: "Cairo, sans-serif" }}
          placeholder="🔍 بحث بالاسم أو نص التقييم..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {(["all", "visible", "hidden"] as const).map(f => {
            const labels = { all: "الكل", visible: "الظاهر", hidden: "المخفي" };
            const colors = { all: "#0D1B2A", visible: "#10B981", hidden: "#F59E0B" };
            return (
              <button key={f} onClick={() => setFilterVisible(f)}
                style={{ padding: "0.45rem 0.9rem", border: `1.5px solid ${filterVisible === f ? colors[f] : "#e0e8f0"}`, borderRadius: "8px", cursor: "pointer", background: filterVisible === f ? `${colors[f]}12` : "transparent", color: filterVisible === f ? colors[f] : "#667788", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", transition: "all 0.2s" }}>
                {labels[f]}
              </button>
            );
          })}
        </div>
        {(search || filterVisible !== "all") && (
          <button onClick={() => { setSearch(""); setFilterVisible("all"); }}
            style={{ padding: "0.45rem 0.75rem", border: "1px solid #e0e8f0", borderRadius: "8px", cursor: "pointer", background: "#f9fafb", color: "#667788", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
            مسح الفلتر
          </button>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "580px", maxHeight: "92vh", overflowY: "auto", direction: "rtl" }}>
            <h3 style={{ margin: "0 0 1.5rem", color: "#0D1B2A", fontWeight: 900 }}>{editing ? "تعديل تقييم" : "تقييم جديد"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الاسم (عربي) *">
                <input style={inputStyle} value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
              </F>
              <F label="Name (English)">
                <input style={inputStyle} value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} />
              </F>
            </div>
            <F label="نص التقييم (عربي) *">
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={form.textAr} onChange={e => setForm(f => ({ ...f, textAr: e.target.value }))} />
            </F>
            <F label="Review Text (English)">
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={form.textEn} onChange={e => setForm(f => ({ ...f, textEn: e.target.value }))} />
            </F>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <F label="التقييم (1-5) ⭐">
                <input type="number" min={1} max={5} style={inputStyle} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: parseInt(e.target.value) || 5 }))} />
              </F>
              <F label="اسم الباقة">
                <input style={inputStyle} value={form.packageName} onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))} />
              </F>
              <F label="الترتيب">
                <input type="number" style={inputStyle} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </F>
            </div>
            <F label="رابط الصورة (اختياري)">
              <input style={inputStyle} placeholder="https://..." value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
            </F>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <input type="checkbox" id="vis-modal" checked={form.isVisible} onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#10B981" }} />
              <label htmlFor="vis-modal" style={{ color: "#0D1B2A", fontWeight: 600, cursor: "pointer" }}>ظاهر للزوار 👁️</label>
            </div>
            {saveError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "0.6rem 1rem", marginBottom: "1rem", color: "#DC2626", fontSize: "0.88rem" }}>
                ⚠️ {saveError}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, background: saving ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.75rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
                {saving ? "⏳ جاري الحفظ..." : "💾 حفظ"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "0.75rem 1.5rem", background: "#f0f4f8", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "#667788" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <div>جاري تحميل التقييمات...</div>
        </div>
      ) : loadError ? (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <div style={{ color: "#DC2626", fontWeight: 700, marginBottom: "0.75rem" }}>فشل تحميل التقييمات</div>
          <div style={{ color: "#667788", fontSize: "0.88rem", marginBottom: "1rem" }}>{loadError}</div>
          <button onClick={load}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: 16, padding: "3rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>
            {items.length === 0 ? "💬" : "🔍"}
          </div>
          <div style={{ color: "#0D1B2A", fontWeight: 700, marginBottom: "0.5rem" }}>
            {items.length === 0 ? "لا توجد تقييمات بعد" : "لا توجد نتائج للبحث"}
          </div>
          <div style={{ color: "#667788", fontSize: "0.88rem" }}>
            {items.length === 0 ? "ابدأ بإضافة تقييم جديد" : "جرب تغيير كلمات البحث أو إلغاء الفلتر"}
          </div>
        </div>
      ) : (
        <>
          {(search || filterVisible !== "all") && (
            <div style={{ color: "#667788", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              عرض {filtered.length} من {items.length} تقييم
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {filtered.map(item => (
              <div key={item.id}
                style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: item.isVisible ? 1 : 0.55, transition: "opacity 0.2s", border: item.isVisible ? "none" : "1.5px dashed #e0e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "0.95rem" }}>{item.nameAr}</div>
                    {item.nameEn && <div style={{ color: "#99aabb", fontSize: "0.78rem" }}>{item.nameEn}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                    <div style={{ color: "#F59E0B", fontSize: "0.9rem" }}>{"⭐".repeat(Math.min(item.rating, 5))}</div>
                    {!item.isVisible && <span style={{ background: "#F59E0B15", color: "#F59E0B", borderRadius: 50, padding: "0.15rem 0.5rem", fontSize: "0.7rem", fontWeight: 700 }}>مخفي</span>}
                  </div>
                </div>
                <p style={{ color: "#667788", fontSize: "0.85rem", lineHeight: 1.7, margin: "0 0 0.5rem", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.textAr}
                </p>
                {item.packageName && (
                  <div style={{ background: "#00AAFF10", color: "#00AAFF", borderRadius: "50px", padding: "0.2rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, display: "inline-block", marginBottom: "0.75rem" }}>
                    {item.packageName}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button onClick={() => toggleVisible(item)}
                    style={{ flex: 1, padding: "0.4rem", border: "1px solid #e0e8f0", borderRadius: "8px", cursor: "pointer", background: item.isVisible ? "#f9fafb" : "#10B98110", fontSize: "0.78rem", fontFamily: "Cairo, sans-serif", color: item.isVisible ? "#667788" : "#10B981", fontWeight: 600 }}>
                    {item.isVisible ? "🙈 إخفاء" : "👁️ إظهار"}
                  </button>
                  <button onClick={() => openEdit(item)}
                    style={{ padding: "0.4rem 0.75rem", border: "1px solid #00AAFF30", borderRadius: "8px", cursor: "pointer", background: "#00AAFF08", color: "#00AAFF", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                    ✏️ تعديل
                  </button>
                  <button onClick={() => del(item.id)}
                    style={{ padding: "0.4rem 0.75rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem" }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
