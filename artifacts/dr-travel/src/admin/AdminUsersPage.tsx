import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface User {
  id: number; username: string; email: string; displayName: string;
  role: "super" | "admin" | "operator" | "viewer"; isActive: boolean;
  lastLoginAt: string | null;
}

const ROLE_LABELS: Record<string, string> = { super: "مدير عام", admin: "مدير", operator: "موظف", viewer: "قارئ فقط" };
const ROLE_COLORS: Record<string, string> = { super: "#7C3AED", admin: "#00AAFF", operator: "#10B981", viewer: "#64748B" };

export default function AdminUsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", displayName: "", email: "", role: "operator" });

  const load = async () => {
    setLoading(true);
    const r = await adminFetch("/admin/users");
    if (r.status === 403) { setForbidden(true); setLoading(false); return; }
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await adminFetch("/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) { setForm({ username: "", password: "", displayName: "", email: "", role: "operator" }); load(); }
    else alert((await r.json()).error || "خطأ");
  };

  const update = async (id: number, patch: any) => {
    const r = await adminFetch(`/admin/users/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) alert((await r.json()).error || "خطأ");
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("حذف المستخدم؟")) return;
    const r = await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
    if (!r.ok) alert((await r.json()).error || "خطأ");
    load();
  };

  const resetPwd = async (id: number) => {
    const np = prompt("كلمة المرور الجديدة (6 أحرف على الأقل):");
    if (!np || np.length < 6) return;
    update(id, { password: np });
  };

  if (forbidden) return <div style={{ padding: "2rem", textAlign: "center", color: "#EF4444", fontWeight: 700 }}>🔒 هذه الصفحة للمدير العام فقط</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>👥 إدارة المستخدمين</h2>

      <form onSubmit={create} style={{ background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 12, marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <input required className="form-input" placeholder="اسم مستخدم" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} />
        <input required type="password" className="form-input" placeholder="كلمة مرور (6+)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input className="form-input" placeholder="الاسم المعروض" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
        <input className="form-input" placeholder="البريد" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <select className="form-input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="viewer">قارئ فقط</option>
          <option value="operator">موظف</option>
          <option value="admin">مدير</option>
          <option value="super">مدير عام</option>
        </select>
        <button type="submit" style={{ background: "#10B981", color: "white", border: "none", padding: "0.6rem", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif" }}>+ أضف مستخدم</button>
      </form>

      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
        <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
              <th style={th}>المستخدم</th><th style={th}>الاسم</th><th style={th}>الدور</th><th style={th}>الحالة</th><th style={th}>آخر دخول</th><th style={th}>إجراء</th>
            </tr></thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id}>
                  <td style={td}><strong>{u.username}</strong>{u.email && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>}</td>
                  <td style={td}>{u.displayName || "—"}</td>
                  <td style={td}>
                    <select value={u.role} onChange={e => update(u.id, { role: e.target.value })} style={{ background: ROLE_COLORS[u.role] + "22", color: ROLE_COLORS[u.role], border: "1px solid " + ROLE_COLORS[u.role] + "55", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <button onClick={() => update(u.id, { isActive: !u.isActive })} style={{ background: u.isActive ? "#10B98122" : "#EF444422", color: u.isActive ? "#10B981" : "#EF4444", border: "none", padding: "3px 10px", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                      {u.isActive ? "✅ مفعّل" : "⏸️ معطل"}
                    </button>
                  </td>
                  <td style={td}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar-EG") : "—"}</td>
                  <td style={td}>
                    <button onClick={() => resetPwd(u.id)} style={iconBtn} title="إعادة تعيين كلمة المرور">🔑</button>
                    <button onClick={() => remove(u.id)} style={iconBtn} title="حذف">🗑️</button>
                  </td>
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
const iconBtn: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", cursor: "pointer", marginInlineEnd: 4 };
