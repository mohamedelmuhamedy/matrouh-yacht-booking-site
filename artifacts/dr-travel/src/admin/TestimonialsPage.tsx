import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

const EMPTY = { nameAr: "", nameEn: "", textAr: "", textEn: "", rating: 5, packageName: "", avatar: "", isVisible: true, sortOrder: 0 };

export default function TestimonialsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminFetch("/admin/testimonials").then(r => r.json()).then(data => {
      setItems(Array.isArray(data) ? data : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...EMPTY }); setShowForm(true); };
  const openEdit = (item: any) => {
    setEditing(item);
    setForm({ nameAr: item.nameAr, nameEn: item.nameEn, textAr: item.textAr, textEn: item.textEn, rating: item.rating, packageName: item.packageName, avatar: item.avatar, isVisible: item.isVisible, sortOrder: item.sortOrder });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await adminFetch(`/admin/testimonials/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
      } else {
        await adminFetch("/admin/testimonials", { method: "POST", body: JSON.stringify(form) });
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm("حذف هذا التقييم؟")) return;
    await adminFetch(`/admin/testimonials/${id}`, { method: "DELETE" });
    load();
  };

  const toggleVisible = async (item: any) => {
    await adminFetch(`/admin/testimonials/${item.id}`, { method: "PUT", body: JSON.stringify({ ...item, isVisible: !item.isVisible }) });
    load();
  };

  const F = ({ label, children }: any) => (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", color: "#0D1B2A", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
  const inputStyle: React.CSSProperties = { width: "100%", padding: "0.65rem 0.9rem", borderRadius: "8px", border: "1.5px solid #e0e8f0", outline: "none", fontSize: "0.9rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.4rem", margin: 0 }}>
          التقييمات <span style={{ color: "#00AAFF" }}>({items.length})</span>
        </h2>
        <button onClick={openNew}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.65rem 1.25rem", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          + إضافة تقييم
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "20px", padding: "2rem", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto", direction: "rtl" }}>
            <h3 style={{ margin: "0 0 1.5rem", color: "#0D1B2A", fontWeight: 900 }}>{editing ? "تعديل تقييم" : "تقييم جديد"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <F label="الاسم (عربي)">
                <input style={inputStyle} value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} />
              </F>
              <F label="Name (English)">
                <input style={inputStyle} value={form.nameEn} onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))} />
              </F>
            </div>
            <F label="نص التقييم (عربي)">
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={form.textAr} onChange={e => setForm(f => ({ ...f, textAr: e.target.value }))} />
            </F>
            <F label="Review Text (English)">
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} value={form.textEn} onChange={e => setForm(f => ({ ...f, textEn: e.target.value }))} />
            </F>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <F label="التقييم (1-5)">
                <input type="number" min={1} max={5} style={inputStyle} value={form.rating} onChange={e => setForm(f => ({ ...f, rating: parseInt(e.target.value) }))} />
              </F>
              <F label="اسم الباقة">
                <input style={inputStyle} value={form.packageName} onChange={e => setForm(f => ({ ...f, packageName: e.target.value }))} />
              </F>
              <F label="الترتيب">
                <input type="number" style={inputStyle} value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) }))} />
              </F>
            </div>
            <F label="رابط الصورة (اختياري)">
              <input style={inputStyle} placeholder="https://..." value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))} />
            </F>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <input type="checkbox" id="vis" checked={form.isVisible} onChange={e => setForm(f => ({ ...f, isVisible: e.target.checked }))} />
              <label htmlFor="vis" style={{ color: "#0D1B2A", fontWeight: 600, cursor: "pointer" }}>ظاهر للزوار</label>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "10px", padding: "0.75rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.95rem" }}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "0.75rem 1.5rem", background: "#f0f4f8", border: "none", borderRadius: "10px", cursor: "pointer", fontFamily: "Cairo, sans-serif", fontWeight: 700, color: "#667788" }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <div style={{ textAlign: "center", padding: "3rem", color: "#667788" }}>جاري التحميل...</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {items.map(item => (
            <div key={item.id} style={{ background: "white", borderRadius: "16px", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", opacity: item.isVisible ? 1 : 0.5, transition: "opacity 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#0D1B2A", fontSize: "0.95rem" }}>{item.nameAr}</div>
                  <div style={{ color: "#99aabb", fontSize: "0.78rem" }}>{item.nameEn}</div>
                </div>
                <div style={{ color: "#F59E0B", fontSize: "1rem" }}>{"⭐".repeat(item.rating)}</div>
              </div>
              <p style={{ color: "#667788", fontSize: "0.85rem", lineHeight: 1.7, margin: "0 0 0.5rem" }}>{item.textAr}</p>
              {item.packageName && <div style={{ background: "#00AAFF10", color: "#00AAFF", borderRadius: "50px", padding: "0.2rem 0.75rem", fontSize: "0.78rem", fontWeight: 600, display: "inline-block", marginBottom: "0.75rem" }}>{item.packageName}</div>}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button onClick={() => toggleVisible(item)}
                  style={{ flex: 1, padding: "0.4rem", border: "1px solid #e0e8f0", borderRadius: "8px", cursor: "pointer", background: "#f9fafb", fontSize: "0.8rem", fontFamily: "Cairo, sans-serif" }}>
                  {item.isVisible ? "🙈 إخفاء" : "👁️ إظهار"}
                </button>
                <button onClick={() => openEdit(item)}
                  style={{ padding: "0.4rem 0.75rem", border: "1px solid #00AAFF30", borderRadius: "8px", cursor: "pointer", background: "#00AAFF08", color: "#00AAFF", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                  ✏️ تعديل
                </button>
                <button onClick={() => del(item.id)}
                  style={{ padding: "0.4rem 0.75rem", border: "1px solid #FCA5A5", borderRadius: "8px", cursor: "pointer", background: "#FEF2F2", color: "#EF4444", fontFamily: "Cairo, sans-serif", fontSize: "0.8rem" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
