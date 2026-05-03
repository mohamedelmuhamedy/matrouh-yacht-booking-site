import { useEffect, useState, useMemo, useRef } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { resolveApiAssetUrl } from "../lib/api";

type Status = "pending" | "approved" | "rejected";

const EMPTY: TestimonialForm = {
  nameAr: "", nameEn: "", textAr: "", textEn: "",
  rating: 5, packageName: "", avatar: "", imageUrl: "",
  status: "approved", isVisible: true, sortOrder: 0,
};

interface TestimonialForm {
  nameAr: string; nameEn: string; textAr: string; textEn: string;
  rating: number; packageName: string; avatar: string; imageUrl: string;
  status: Status; isVisible: boolean; sortOrder: number;
}

interface Testimonial extends TestimonialForm {
  id: number;
  source?: string;
  createdAt?: string;
}

const dark = {
  card: "var(--bg-surface-solid)",
  input: "#0d1824",
  border: "var(--border-strong)",
  label: "var(--text-secondary)",
  text: "#ffffff",
  sub: "var(--text-muted)",
};

const STATUS_META: Record<Status, { label: string; color: string; bg: string }> = {
  pending:  { label: "قيد الانتظار", color: "#F59E0B", bg: "#FEF3C7" },
  approved: { label: "مقبول",       color: "#10B981", bg: "#D1FAE5" },
  rejected: { label: "مرفوض",       color: "#EF4444", bg: "#FEE2E2" },
};

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestimonialForm>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDel, setConfirmDel] = useState<Testimonial | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | Status>("pending");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.7rem 0.9rem", borderRadius: "8px",
    border: `1.5px solid ${dark.border}`, outline: "none", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", boxSizing: "border-box",
    background: dark.input, color: dark.text,
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

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter(i => i.status === "pending").length,
    approved: items.filter(i => i.status === "approved").length,
    rejected: items.filter(i => i.status === "rejected").length,
  }), [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (filterStatus !== "all") list = list.filter(i => (i.status || "approved") === filterStatus);
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
  }, [items, search, filterStatus]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setSaveError("");
    setShowForm(true);
  };

  const openEdit = (item: Testimonial) => {
    setEditing(item);
    setForm({
      nameAr: item.nameAr || "", nameEn: item.nameEn || "",
      textAr: item.textAr || "", textEn: item.textEn || "",
      rating: item.rating ?? 5, packageName: item.packageName || "",
      avatar: item.avatar || "", imageUrl: item.imageUrl || "",
      status: (item.status as Status) || "approved",
      isVisible: item.isVisible ?? true,
      sortOrder: item.sortOrder ?? 0,
    });
    setSaveError("");
    setShowForm(true);
  };

  const uploadImage = async (file: File) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/i.test(file.type)) {
      toastError("صور JPG / PNG / WEBP / GIF فقط");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toastError("حجم الصورة كبير جداً (الحد الأقصى 15 MB)");
      return;
    }
    setUploading(true);
    try {
      const r = await adminFetch("/admin/storage/upload", {
        method: "POST",
        headers: { "Content-Type": file.type, "x-content-type": file.type },
        body: file,
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "فشل رفع الصورة");
      }
      const data = await r.json();
      const url = data.proxyUrl || data.url;
      setForm(f => ({ ...f, imageUrl: url }));
      success("تم رفع الصورة ✅");
    } catch (e: any) {
      toastError(e.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
      success(editing ? "تم تحديث التقييم ✅" : "تم إضافة التقييم ✅");
      load();
    } catch (e: any) {
      setSaveError(e.message || "خطأ في الاتصال");
    } finally {
      setSaving(false);
    }
  };

  const del = async (item: Testimonial) => {
    try {
      const r = await adminFetch(`/admin/testimonials/${item.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      success("تم حذف التقييم");
      load();
    } catch { toastError("فشل حذف التقييم"); }
    setConfirmDel(null);
  };

  const approveItem = async (item: Testimonial) => {
    try {
      const r = await adminFetch(`/admin/testimonials/${item.id}/approve`, { method: "POST" });
      if (!r.ok) throw new Error();
      success("تم قبول التقييم ونشره ✅");
      load();
    } catch { toastError("فشل قبول التقييم"); }
  };

  const rejectItem = async (item: Testimonial) => {
    try {
      const r = await adminFetch(`/admin/testimonials/${item.id}/reject`, { method: "POST" });
      if (!r.ok) throw new Error();
      success("تم رفض التقييم");
      load();
    } catch { toastError("فشل رفض التقييم"); }
  };

  const toggleVisible = async (item: Testimonial) => {
    try {
      await adminFetch(`/admin/testimonials/${item.id}`, {
        method: "PUT",
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isVisible: !item.isVisible } : i));
      success(item.isVisible ? "تم إخفاء التقييم" : "تم إظهار التقييم");
    } catch { toastError("فشل تحديث التقييم"); }
  };

  const F = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", color: dark.label, fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.35rem" }}>
        {label}{required && <span style={{ color: "#EF4444", marginRight: "0.25rem" }}>*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: "0 0 0.25rem" }}>التقييمات والآراء</h2>
          <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "var(--section-subtitle)", flexWrap: "wrap" }}>
            <span>المجموع: <strong style={{ color: "#0D1B2A" }}>{counts.all}</strong></span>
            <span>قيد الانتظار: <strong style={{ color: "#F59E0B" }}>{counts.pending}</strong></span>
            <span>مقبول: <strong style={{ color: "#10B981" }}>{counts.approved}</strong></span>
            <span>مرفوض: <strong style={{ color: "#EF4444" }}>{counts.rejected}</strong></span>
          </div>
        </div>
        <button onClick={openNew}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
          + إضافة تقييم
        </button>
      </div>

      {/* Search + Status Filter */}
      <div style={{ background: "white", borderRadius: "12px", padding: "1rem 1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.25rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ flex: 1, minWidth: 200, padding: "0.6rem 0.9rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.88rem", fontFamily: "Cairo, sans-serif", color: "#0D1B2A" }}
          placeholder="🔍 بحث بالاسم أو النص..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {(["pending", "approved", "rejected", "all"] as const).map(s => {
            const labels: Record<string, string> = { all: "الكل", pending: "قيد الانتظار", approved: "مقبول", rejected: "مرفوض" };
            const colors: Record<string, string> = { all: "#0D1B2A", pending: "#F59E0B", approved: "#10B981", rejected: "#EF4444" };
            const c = counts[s as keyof typeof counts];
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ padding: "0.45rem 0.9rem", border: `1.5px solid ${filterStatus === s ? colors[s] : "#e0e8f0"}`, borderRadius: "8px", cursor: "pointer", background: filterStatus === s ? `${colors[s]}12` : "transparent", color: filterStatus === s ? colors[s] : "var(--section-subtitle)", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                {labels[s]}
                <span style={{ background: filterStatus === s ? colors[s] : "#e0e8f0", color: filterStatus === s ? "white" : "var(--section-subtitle)", borderRadius: "50px", padding: "1px 7px", fontSize: "0.7rem", fontWeight: 800, minWidth: 18, textAlign: "center" }}>{c}</span>
              </button>
            );
          })}
        </div>
        {(search || filterStatus !== "pending") && (
          <button onClick={() => { setSearch(""); setFilterStatus("pending"); }}
            style={{ padding: "0.45rem 0.75rem", border: "1px solid #e0e8f0", borderRadius: "8px", cursor: "pointer", background: "#f9fafb", color: "var(--section-subtitle)", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
            مسح
          </button>
        )}
      </div>

      {/* Dark Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={() => setShowForm(false)}>
          <div style={{ background: dark.card, border: `1px solid ${dark.border}`, borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "640px", maxHeight: "92vh", overflowY: "auto", direction: "rtl", boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: 0, color: dark.text, fontWeight: 900, fontSize: "1.15rem" }}>
                {editing ? "✏️ تعديل تقييم" : "➕ تقييم جديد"}
              </h3>
              <button onClick={() => setShowForm(false)}
                style={{ background: "var(--border)", border: `1px solid ${dark.border}`, color: dark.sub, borderRadius: "8px", padding: "0.35rem 0.75rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif" }}>
                ✕ إغلاق
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الاسم (عربي)" required>
                <input style={inputStyle} placeholder="مثال: أحمد محمد" value={form.nameAr}
                  onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
              </F>
              <F label="Name (English)">
                <input style={{ ...inputStyle, direction: "ltr" }} placeholder="e.g. Ahmed Mohamed" value={form.nameEn}
                  onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} />
              </F>
            </div>

            <F label="نص التقييم (عربي)" required>
              <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical", lineHeight: 1.8 }}
                placeholder="اكتب رأي العميل هنا..."
                value={form.textAr} onChange={e => setForm(f => ({ ...f, textAr: e.target.value }))} />
            </F>

            <F label="Review Text (English)">
              <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical", direction: "ltr", lineHeight: 1.8 }}
                placeholder="Write the customer's review in English..."
                value={form.textEn} onChange={e => setForm(f => ({ ...f, textEn: e.target.value }))} />
            </F>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <F label="التقييم (1-5) ⭐">
                <input type="number" min={1} max={5} style={inputStyle} value={form.rating}
                  onChange={e => setForm(f => ({ ...f, rating: Math.min(5, Math.max(1, parseInt(e.target.value) || 5)) }))} />
              </F>
              <F label="اسم الباقة">
                <input style={inputStyle} placeholder="مثال: رحلة اليخت" value={form.packageName}
                  onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))} />
              </F>
              <F label="الترتيب">
                <input type="number" style={inputStyle} value={form.sortOrder}
                  onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </F>
            </div>

            <F label="رابط صورة العميل (الـ Avatar — اختياري)">
              <input style={{ ...inputStyle, direction: "ltr" }} placeholder="https://example.com/avatar.jpg" value={form.avatar}
                onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
            </F>

            {/* Image upload */}
            <F label="صورة مرفقة بالتقييم (اختياري)">
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                {form.imageUrl ? (
                  <div style={{ position: "relative" }}>
                    <img src={resolveApiAssetUrl(form.imageUrl) || form.imageUrl} alt="preview"
                      style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${dark.border}` }} />
                    <button type="button" onClick={() => setForm(f => ({ ...f, imageUrl: "" }))}
                      style={{ position: "absolute", top: -8, left: -8, background: "#EF4444", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontWeight: 900 }}>✕</button>
                  </div>
                ) : null}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    style={{ padding: "0.65rem 1rem", borderRadius: 10, border: `1.5px dashed ${dark.border}`, background: "var(--bg-surface)", color: dark.label, cursor: uploading ? "wait" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.85rem", width: "100%" }}>
                    {uploading ? "⏳ جاري الرفع..." : (form.imageUrl ? "📁 تغيير الصورة" : "📁 رفع صورة")}
                  </button>
                  <input style={{ ...inputStyle, marginTop: "0.5rem", direction: "ltr", fontSize: "0.8rem" }}
                    placeholder="أو ألصق رابط صورة..."
                    value={form.imageUrl}
                    onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))} />
                </div>
              </div>
            </F>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الحالة">
                <select style={inputStyle} value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}>
                  <option value="approved">مقبول</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </F>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", background: "var(--bg-surface)", borderRadius: "10px", border: `1px solid ${dark.border}`, marginTop: "1.6rem" }}>
                <input type="checkbox" id="vis-modal" checked={form.isVisible}
                  onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))}
                  style={{ width: 18, height: 18, accentColor: "#10B981", cursor: "pointer" }} />
                <label htmlFor="vis-modal" style={{ color: dark.label, fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" }}>
                  👁️ ظاهر للزوار
                </label>
              </div>
            </div>

            {saveError && (
              <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", color: "#FCA5A5", fontSize: "0.88rem", fontWeight: 600 }}>
                ⚠️ {saveError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, background: saving ? "var(--border)" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.85rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem", transition: "all 0.2s" }}>
                {saving ? "⏳ جاري الحفظ..." : "💾 حفظ التقييم"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "0.85rem 1.5rem", background: "var(--bg-surface-2)", border: `1px solid ${dark.border}`, borderRadius: "10px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: dark.sub }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--section-subtitle)" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
          <div>جاري تحميل التقييمات...</div>
        </div>
      ) : loadError ? (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚠️</div>
          <div style={{ color: "#DC2626", fontWeight: 700, marginBottom: "0.75rem" }}>فشل تحميل التقييمات</div>
          <div style={{ color: "var(--section-subtitle)", fontSize: "0.88rem", marginBottom: "1rem" }}>{loadError}</div>
          <button onClick={load}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700 }}>
            إعادة المحاولة
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "white", borderRadius: 16, padding: "3rem", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>{items.length === 0 ? "💬" : "🔍"}</div>
          <div style={{ color: "#0D1B2A", fontWeight: 700, marginBottom: "0.5rem" }}>
            {items.length === 0 ? "لا توجد تقييمات بعد" : "لا توجد نتائج"}
          </div>
          <div style={{ color: "var(--section-subtitle)", fontSize: "0.88rem" }}>
            {items.length === 0 ? "ابدأ بإضافة تقييم جديد" : "جرب تغيير كلمات البحث أو التصنيف"}
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
          {filtered.map(item => {
            const status = (item.status as Status) || "approved";
            const meta = STATUS_META[status];
            return (
              <div key={item.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", opacity: item.isVisible || status === "pending" ? 1 : 0.65, transition: "opacity 0.2s", border: status === "pending" ? "1.5px solid #F59E0B" : "1.5px solid transparent", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", alignItems: "flex-start", gap: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flex: 1, minWidth: 0 }}>
                    {item.avatar ? (
                      <img src={item.avatar} alt={item.nameAr} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #e0e8f0", flexShrink: 0 }}
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#00AAFF20,#00AAFF40)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 700, color: "#00AAFF", flexShrink: 0 }}>
                        {item.nameAr?.[0] || "؟"}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "0.92rem", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.nameAr}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.15rem" }}>
                        {item.source === "visitor" && (
                          <span style={{ fontSize: "0.62rem", color: "#9333EA", fontWeight: 700, background: "#F3E8FF", padding: "1px 5px", borderRadius: 4 }}>زائر</span>
                        )}
                        {item.nameEn && <span style={{ color: "#99aabb", fontSize: "0.72rem" }}>{item.nameEn}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", flexShrink: 0 }}>
                    <span style={{ background: meta.bg, color: meta.color, borderRadius: "50px", padding: "0.15rem 0.55rem", fontSize: "0.68rem", fontWeight: 800 }}>{meta.label}</span>
                    <div style={{ color: "#F59E0B", fontSize: "0.85rem", letterSpacing: "1px" }}>{"⭐".repeat(Math.min(item.rating, 5))}</div>
                  </div>
                </div>

                <p style={{ color: "#374151", fontSize: "0.875rem", lineHeight: 1.75, margin: "0 0 0.75rem", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.textAr}
                </p>

                {item.imageUrl && (
                  <img src={resolveApiAssetUrl(item.imageUrl) || item.imageUrl} alt=""
                    style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10, marginBottom: "0.75rem", border: "1px solid #e0e8f0" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}

                {item.packageName && (
                  <div style={{ background: "#EFF6FF", color: "#2563EB", borderRadius: "50px", padding: "0.2rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, display: "inline-block", marginBottom: "0.75rem" }}>
                    📦 {item.packageName}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                  {status === "pending" ? (
                    <>
                      <button onClick={() => approveItem(item)}
                        style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: "8px", cursor: "pointer", background: "linear-gradient(135deg,#10B981,#059669)", color: "white", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", fontWeight: 800 }}>
                        ✅ قبول ونشر
                      </button>
                      <button onClick={() => rejectItem(item)}
                        style={{ flex: 1, padding: "0.5rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", fontWeight: 700 }}>
                        ❌ رفض
                      </button>
                    </>
                  ) : status === "rejected" ? (
                    <button onClick={() => approveItem(item)}
                      style={{ flex: 1, padding: "0.5rem", border: "none", borderRadius: "8px", cursor: "pointer", background: "linear-gradient(135deg,#10B981,#059669)", color: "white", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem", fontWeight: 800 }}>
                      ↩️ استعادة وقبول
                    </button>
                  ) : (
                    <button onClick={() => toggleVisible(item)}
                      style={{ flex: 1, padding: "0.4rem", border: `1px solid ${item.isVisible ? "#e0e8f0" : "#10B981"}`, borderRadius: "8px", cursor: "pointer", background: item.isVisible ? "#f9fafb" : "#10B98110", fontSize: "0.78rem", fontFamily: "Cairo, sans-serif", color: item.isVisible ? "#6B7280" : "#10B981", fontWeight: 600 }}>
                      {item.isVisible ? "🙈 إخفاء" : "👁️ إظهار"}
                    </button>
                  )}
                  <button onClick={() => openEdit(item)}
                    style={{ padding: "0.4rem 0.85rem", border: "1px solid #00AAFF40", borderRadius: "8px", cursor: "pointer", background: "#EFF6FF", color: "#2563EB", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 600 }}>
                    ✏️ تعديل
                  </button>
                  <button onClick={() => setConfirmDel(item)}
                    style={{ padding: "0.4rem 0.75rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.78rem", fontWeight: 700 }}>
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDel !== null}
        title="حذف التقييم"
        message={`هل تريد حذف تقييم "${confirmDel?.nameAr}" نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائياً"
        cancelLabel="إلغاء"
        danger
        onConfirm={() => confirmDel && del(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
