import { useState, useEffect } from "react";
import { adminFetch } from "./AdminContext";
import { useToast } from "../components/Toast";
import { apiFetch } from "../lib/api";

interface Category {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  sortOrder: number;
}

const inputSt: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.9rem",
  borderRadius: "8px",
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
  fontSize: "0.8rem",
  marginBottom: "0.3rem",
};

export default function AdminCategoriesPage() {
  const { success, error: toastError } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ slug: "", nameAr: "", nameEn: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nameAr: "", nameEn: "" });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiFetch("/api/categories");
      if (r.ok) setCategories(await r.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.slug.trim() || !form.nameAr.trim() || !form.nameEn.trim()) {
      toastError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch("/admin/categories", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (r.ok) {
        success("تم إضافة الفئة بنجاح");
        setForm({ slug: "", nameAr: "", nameEn: "" });
        load();
      } else {
        const data = await r.json().catch(() => ({}));
        toastError(data.error || "فشل إضافة الفئة");
      }
    } catch {
      toastError("حدث خطأ في الاتصال");
    }
    setSaving(false);
  }

  async function handleUpdate(id: number) {
    if (!editForm.nameAr.trim() || !editForm.nameEn.trim()) {
      toastError("الاسم مطلوب");
      return;
    }
    setSaving(true);
    try {
      const r = await adminFetch(`/admin/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      if (r.ok) {
        success("تم التحديث بنجاح");
        setEditId(null);
        load();
      } else {
        const data = await r.json().catch(() => ({}));
        toastError(data.error || "فشل التحديث");
      }
    } catch {
      toastError("حدث خطأ في الاتصال");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    setSaving(true);
    try {
      const r = await adminFetch(`/admin/categories/${id}`, {
        method: "DELETE",
      });
      if (r.ok) {
        success("تم الحذف");
        setConfirmDelete(null);
        load();
      } else {
        const data = await r.json().catch(() => ({}));
        toastError(data.error || "فشل الحذف");
      }
    } catch {
      toastError("حدث خطأ في الاتصال");
    }
    setSaving(false);
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.25rem" }}>
          إدارة الفئات
        </h1>
        <p style={{ color: "#667788", fontSize: "0.85rem", margin: 0 }}>
          الفئات تظهر في فلاتر صفحة الرحلات ونموذج إضافة الباقة. الباقات المرتبطة لا تتأثر عند الحذف.
        </p>
      </div>

      {/* Add Form */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.5rem", border: "1.5px solid #e0e8f0" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1.1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e8eef4" }}>
          إضافة فئة جديدة
        </h2>
        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.9rem", marginBottom: "0.9rem" }}>
            <div>
              <label style={labelSt}>المعرف (Slug) <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={inputSt}
                placeholder="مثال: safari"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div>
              <label style={labelSt}>الاسم بالعربية <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={inputSt}
                placeholder="سفاري"
                value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div>
              <label style={labelSt}>الاسم بالإنجليزية <span style={{ color: "#EF4444" }}>*</span></label>
              <input
                style={inputSt}
                placeholder="Safari"
                value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                dir="ltr"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{ background: "#00AAFF", color: "white", border: "none", borderRadius: "8px", padding: "0.65rem 1.5rem", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.88rem", opacity: saving ? 0.7 : 1 }}>
            {saving ? "جاري الحفظ..." : "+ إضافة فئة"}
          </button>
        </form>
      </div>

      {/* Categories List */}
      <div style={{ background: "white", borderRadius: "16px", padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #e0e8f0" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "1rem", marginTop: 0, marginBottom: "1.1rem", paddingBottom: "0.75rem", borderBottom: "1px solid #e8eef4" }}>
          الفئات الحالية ({categories.length})
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", color: "#99aabb", padding: "2rem 0", fontSize: "0.9rem" }}>
            جاري التحميل...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: "center", color: "#99aabb", padding: "2.5rem 0", fontSize: "0.9rem", background: "#f9fafb", borderRadius: "10px" }}>
            لا توجد فئات بعد — أضف فئة من الأعلى
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {categories.map(cat => (
              <div
                key={cat.id}
                style={{ background: "#f9fafb", border: "1.5px solid #e0e8f0", borderRadius: "10px", padding: "0.9rem 1rem" }}>

                {editId === cat.id ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
                      <div>
                        <label style={labelSt}>الاسم بالعربية</label>
                        <input style={inputSt} value={editForm.nameAr} onChange={e => setEditForm(f => ({ ...f, nameAr: e.target.value }))} />
                      </div>
                      <div>
                        <label style={labelSt}>الاسم بالإنجليزية</label>
                        <input style={inputSt} value={editForm.nameEn} onChange={e => setEditForm(f => ({ ...f, nameEn: e.target.value }))} dir="ltr" />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        disabled={saving}
                        style={{ background: "#16a34a", color: "white", border: "none", borderRadius: "6px", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        style={{ background: "#f0f4f8", color: "#667788", border: "1px solid #d0dce8", borderRadius: "6px", padding: "0.45rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : confirmDelete === cat.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ color: "#DC2626", fontSize: "0.85rem", flex: 1, fontWeight: 600 }}>
                      تأكيد حذف "{cat.nameAr}"؟ الباقات المرتبطة لن تتأثر.
                    </span>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      disabled={saving}
                      style={{ background: "#DC2626", color: "white", border: "none", borderRadius: "6px", padding: "0.45rem 1rem", cursor: "pointer", fontWeight: 700, fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      تأكيد الحذف
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{ background: "#f0f4f8", color: "#667788", border: "1px solid #d0dce8", borderRadius: "6px", padding: "0.45rem 1rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.82rem" }}>
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                    <span style={{ background: "#e8f4ff", color: "#0077cc", borderRadius: "6px", padding: "0.2rem 0.65rem", fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 600, flexShrink: 0 }}>
                      {cat.slug}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#0D1B2A", fontWeight: 700, fontSize: "0.92rem" }}>{cat.nameAr}</span>
                      <span style={{ color: "#667788", fontSize: "0.83rem", marginInlineStart: "0.5rem" }}>/ {cat.nameEn}</span>
                    </div>
                    <button
                      onClick={() => { setEditId(cat.id); setEditForm({ nameAr: cat.nameAr, nameEn: cat.nameEn }); }}
                      style={{ background: "white", color: "#445566", border: "1px solid #d0dce8", borderRadius: "6px", padding: "0.4rem 0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                      تعديل
                    </button>
                    <button
                      onClick={() => setConfirmDelete(cat.id)}
                      style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FCA5A5", borderRadius: "6px", padding: "0.4rem 0.85rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                      حذف
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
