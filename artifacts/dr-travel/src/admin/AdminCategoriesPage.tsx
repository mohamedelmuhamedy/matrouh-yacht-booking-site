import { useState, useEffect } from "react";
import { useAdmin } from "./AdminContext";
import { useToast } from "../components/Toast";

interface Category {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

const inputSt: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "0.65rem 0.9rem",
  color: "white",
  fontSize: "0.9rem",
  fontFamily: "Cairo, sans-serif",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const btnSt = (color: string, bg: string): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${color}`,
  color: color,
  borderRadius: "8px",
  padding: "0.45rem 0.9rem",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontFamily: "Cairo, sans-serif",
  fontWeight: 600,
  whiteSpace: "nowrap",
});

export default function AdminCategoriesPage() {
  const { token } = useAdmin();
  const { addToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ slug: "", nameAr: "", nameEn: "", sortOrder: 0 });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nameAr: "", nameEn: "", sortOrder: 0 });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/categories");
      if (r.ok) setCategories(await r.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug || !form.nameAr || !form.nameEn) {
      addToast("يرجى تعبئة جميع الحقول المطلوبة", "error");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        addToast("تم إضافة الفئة بنجاح", "success");
        setForm({ slug: "", nameAr: "", nameEn: "", sortOrder: 0 });
        load();
      } else {
        const err = await r.json();
        addToast(err.error || "فشل الإضافة", "error");
      }
    } catch {
      addToast("حدث خطأ في الاتصال", "error");
    }
    setSaving(false);
  }

  async function handleUpdate(id: number) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (r.ok) {
        addToast("تم التحديث بنجاح", "success");
        setEditId(null);
        load();
      } else {
        const err = await r.json();
        addToast(err.error || "فشل التحديث", "error");
      }
    } catch {
      addToast("حدث خطأ في الاتصال", "error");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        addToast("تم الحذف", "success");
        setConfirmDelete(null);
        load();
      } else {
        const err = await r.json();
        addToast(err.error || "فشل الحذف", "error");
      }
    } catch {
      addToast("حدث خطأ في الاتصال", "error");
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h1 style={{ color: "white", fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.35rem" }}>إدارة الفئات</h1>
      <p style={{ color: "#667788", fontSize: "0.85rem", marginBottom: "2rem" }}>
        الفئات تظهر في قائمة الفلاتر في صفحة الرحلات وفي نموذج إضافة الباقة.
      </p>

      {/* Add Form */}
      <div style={{ background: "rgba(0,170,255,0.04)", border: "1px solid rgba(0,170,255,0.15)", borderRadius: "16px", padding: "1.5rem", marginBottom: "2rem" }}>
        <h2 style={{ color: "#00AAFF", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1.1rem" }}>إضافة فئة جديدة</h2>
        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
            <div>
              <label style={{ color: "#8899aa", fontSize: "0.78rem", display: "block", marginBottom: "0.35rem" }}>
                المعرف (Slug) <span style={{ color: "#ff6b6b" }}>*</span>
              </label>
              <input
                style={inputSt}
                placeholder="مثال: safari"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div>
              <label style={{ color: "#8899aa", fontSize: "0.78rem", display: "block", marginBottom: "0.35rem" }}>
                الاسم بالعربية <span style={{ color: "#ff6b6b" }}>*</span>
              </label>
              <input
                style={inputSt}
                placeholder="سفاري"
                value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ color: "#8899aa", fontSize: "0.78rem", display: "block", marginBottom: "0.35rem" }}>
                الاسم بالإنجليزية <span style={{ color: "#ff6b6b" }}>*</span>
              </label>
              <input
                style={inputSt}
                placeholder="Safari"
                value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{ ...btnSt("#00AAFF", "rgba(0,170,255,0.15)"), padding: "0.65rem 1.2rem" }}>
              {saving ? "..." : "+ إضافة"}
            </button>
          </div>
        </form>
      </div>

      {/* Categories List */}
      {loading ? (
        <div style={{ textAlign: "center", color: "#667788", padding: "2rem" }}>جاري التحميل...</div>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", color: "#667788", padding: "2rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px" }}>
          لا توجد فئات بعد
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1rem 1.25rem" }}>

              {editId === cat.id ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: "0.65rem", alignItems: "end" }}>
                  <div>
                    <label style={{ color: "#8899aa", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>الاسم بالعربية</label>
                    <input style={inputSt} value={editForm.nameAr} onChange={e => setEditForm(f => ({ ...f, nameAr: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ color: "#8899aa", fontSize: "0.75rem", display: "block", marginBottom: "0.25rem" }}>الاسم بالإنجليزية</label>
                    <input style={inputSt} value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))} dir="ltr" />
                  </div>
                  <button onClick={() => handleUpdate(cat.id)} disabled={saving} style={btnSt("#00C864", "rgba(0,200,100,0.12)")}>
                    حفظ
                  </button>
                  <button onClick={() => setEditId(null)} style={btnSt("#8899aa", "rgba(255,255,255,0.05)")}>
                    إلغاء
                  </button>
                </div>
              ) : confirmDelete === cat.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ color: "#ff6b6b", fontSize: "0.88rem", flex: 1 }}>
                    هل أنت متأكد من حذف فئة "{cat.nameAr}"؟ الباقات المرتبطة بها ستظل كما هي.
                  </span>
                  <button onClick={() => handleDelete(cat.id)} disabled={saving} style={btnSt("#ff6b6b", "rgba(255,107,107,0.12)")}>
                    تأكيد الحذف
                  </button>
                  <button onClick={() => setConfirmDelete(null)} style={btnSt("#8899aa", "rgba(255,255,255,0.05)")}>
                    إلغاء
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ background: "rgba(0,170,255,0.1)", border: "1px solid rgba(0,170,255,0.2)", color: "#00AAFF", borderRadius: "6px", padding: "0.2rem 0.6rem", fontSize: "0.78rem", fontFamily: "monospace" }}>
                    {cat.slug}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: "white", fontWeight: 600, fontSize: "0.92rem" }}>{cat.nameAr}</span>
                    <span style={{ color: "#667788", fontSize: "0.82rem", marginInlineStart: "0.5rem" }}>/ {cat.nameEn}</span>
                  </div>
                  <button
                    onClick={() => { setEditId(cat.id); setEditForm({ nameAr: cat.nameAr, nameEn: cat.nameEn, sortOrder: cat.sortOrder }); }}
                    style={btnSt("#8899aa", "rgba(255,255,255,0.04)")}>
                    تعديل
                  </button>
                  <button
                    onClick={() => setConfirmDelete(cat.id)}
                    style={btnSt("#ff6b6b", "rgba(255,107,107,0.06)")}>
                    حذف
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
