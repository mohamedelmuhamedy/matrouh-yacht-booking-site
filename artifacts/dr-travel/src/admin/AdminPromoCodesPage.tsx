import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Promo {
  id: number; code: string; discountType: "percent" | "fixed";
  discountValue: number; maxUses: number; usedCount: number;
  minBookingValue: number; packageId: number | null;
  validFrom: string | null; validTo: string | null;
  active: boolean; notes: string;
}

const empty = { code: "", discountType: "percent" as "percent" | "fixed", discountValue: 10, maxUses: 0, minBookingValue: 0, packageId: "", validFrom: "", validTo: "", active: true, notes: "" };

export default function AdminPromoCodesPage() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await adminFetch("/admin/promo-codes");
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: any = {
      ...form,
      packageId: form.packageId ? Number(form.packageId) : null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
    };
    const url = editId ? `/admin/promo-codes/${editId}` : "/admin/promo-codes";
    const r = await adminFetch(url, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { setShowForm(false); setForm(empty); setEditId(null); load(); }
    else alert((await r.json()).error || "خطأ");
  };

  const edit = (p: Promo) => {
    setEditId(p.id);
    setForm({
      code: p.code, discountType: p.discountType, discountValue: p.discountValue,
      maxUses: p.maxUses, minBookingValue: p.minBookingValue,
      packageId: p.packageId ? String(p.packageId) : "",
      validFrom: p.validFrom?.slice(0, 10) || "", validTo: p.validTo?.slice(0, 10) || "",
      active: p.active, notes: p.notes,
    });
    setShowForm(true);
  };

  const remove = async (id: number) => {
    if (!confirm("حذف الكود؟")) return;
    await adminFetch(`/admin/promo-codes/${id}`, { method: "DELETE" });
    load();
  };

  const td: React.CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, color: "var(--text-primary)" }}>🎟️ أكواد الخصم</h2>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(empty); }}
          style={{ background: "linear-gradient(135deg,#00AAFF,#0086C9)", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>
          + كود جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: "var(--bg-surface-solid)", padding: "1.25rem", borderRadius: 14, marginBottom: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
            <Field label="الكود"><input required className="form-input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="النوع">
              <select className="form-input" value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value as any })}>
                <option value="percent">نسبة %</option>
                <option value="fixed">مبلغ ثابت</option>
              </select>
            </Field>
            <Field label="القيمة"><input type="number" className="form-input" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: Number(e.target.value) })} /></Field>
            <Field label="الحد الأقصى للاستخدام (0 = ∞)"><input type="number" className="form-input" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: Number(e.target.value) })} /></Field>
            <Field label="الحد الأدنى للحجز"><input type="number" className="form-input" value={form.minBookingValue} onChange={e => setForm({ ...form, minBookingValue: Number(e.target.value) })} /></Field>
            <Field label="الباقة (اختياري)"><input type="number" className="form-input" placeholder="ID" value={form.packageId} onChange={e => setForm({ ...form, packageId: e.target.value })} /></Field>
            <Field label="ساري من"><input type="date" className="form-input" value={form.validFrom} onChange={e => setForm({ ...form, validFrom: e.target.value })} /></Field>
            <Field label="ساري إلى"><input type="date" className="form-input" value={form.validTo} onChange={e => setForm({ ...form, validTo: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: "0.85rem" }}>
            <Field label="ملاحظات"><textarea className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.85rem", color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> مفعّل
          </label>
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
            <button type="submit" style={{ background: "#10B981", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: 10, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>💾 حفظ</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(empty); }}
              style={{ background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "0.6rem 1.2rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>إلغاء</button>
          </div>
        </form>
      )}

      <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳ جار التحميل...</div> :
          rows.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لا توجد أكواد بعد</div> :
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
                <th style={td}>الكود</th><th style={td}>الخصم</th><th style={td}>الاستخدام</th>
                <th style={td}>الحالة</th><th style={td}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td style={td}><code style={{ background: "rgba(0,170,255,0.1)", padding: "2px 8px", borderRadius: 6, fontWeight: 700, color: "#00AAFF" }}>{p.code}</code></td>
                  <td style={td}>{p.discountValue}{p.discountType === "percent" ? "%" : " ج.م"}</td>
                  <td style={td}>{p.usedCount}/{p.maxUses || "∞"}</td>
                  <td style={td}>{p.active ? "✅" : "⏸️"}</td>
                  <td style={td}>
                    <button onClick={() => edit(p)} style={iconBtn}>✏️</button>
                    <button onClick={() => remove(p.id)} style={iconBtn}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}

const iconBtn: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", marginInlineEnd: 4 };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block" }}>
    <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
    {children}
  </label>;
}
