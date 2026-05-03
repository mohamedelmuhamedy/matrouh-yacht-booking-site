import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Cap { id: number; packageId: number; date: string; maxSeats: number; notes: string; }
interface Pkg { id: number; titleAr: string; }

export default function AdminCapacityPage() {
  const [rows, setRows] = useState<Cap[]>([]);
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ packageId: "", date: "", maxSeats: "10", notes: "" });

  const load = async () => {
    setLoading(true);
    const [a, b] = await Promise.all([
      adminFetch("/admin/capacity").then(r => r.json()),
      adminFetch("/admin/packages").then(r => r.json()),
    ]);
    setRows(a); setPackages(b);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await adminFetch("/admin/capacity", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: Number(form.packageId), date: form.date,
        maxSeats: Number(form.maxSeats), notes: form.notes,
      }),
    });
    if (r.ok) { setForm({ packageId: "", date: "", maxSeats: "10", notes: "" }); load(); }
    else alert((await r.json()).error || "خطأ");
  };

  const remove = async (id: number) => {
    if (!confirm("حذف القيد؟")) return;
    await adminFetch(`/admin/capacity/${id}`, { method: "DELETE" });
    load();
  };

  const pkgName = (id: number) => packages.find(p => p.id === id)?.titleAr || `#${id}`;

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>🪑 السعة لكل تاريخ</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
        حدد الحد الأقصى للحجوزات (Adults+Children) لكل باقة في تاريخ معين. لو مش محدد لباقة + تاريخ، السعة بدون حد.
      </p>

      <form onSubmit={save} style={{ background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 12, marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <select required className="form-input" value={form.packageId} onChange={e => setForm({ ...form, packageId: e.target.value })}>
          <option value="">— اختر الباقة —</option>
          {packages.map(p => <option key={p.id} value={p.id}>{p.titleAr}</option>)}
        </select>
        <input required type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        <input required type="number" min={0} className="form-input" placeholder="السعة القصوى" value={form.maxSeats} onChange={e => setForm({ ...form, maxSeats: e.target.value })} />
        <input className="form-input" placeholder="ملاحظات" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" style={{ background: "#10B981", color: "white", border: "none", padding: "0.6rem", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>💾 احفظ</button>
      </form>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
        rows.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لم تحدد قيود سعة بعد — كل التواريخ متاحة بدون حد</div> :
        <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
              <th style={th}>الباقة</th><th style={th}>التاريخ</th><th style={th}>السعة</th><th style={th}>ملاحظات</th><th style={th}></th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{pkgName(r.packageId)}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}><strong>{r.maxSeats}</strong> مقعد</td>
                  <td style={td}>{r.notes || "—"}</td>
                  <td style={td}><button onClick={() => remove(r.id)} style={{ background: "#EF4444", color: "white", border: "none", padding: "0.3rem 0.6rem", borderRadius: 6, cursor: "pointer", fontSize: "0.75rem" }}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}

const th: React.CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem", fontWeight: 800 };
const td: React.CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" };
