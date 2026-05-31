import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./AdminContext";
import { FALLBACK_PERMISSION_DEFS, type PermissionDefinition } from "./permissions";

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: "super" | "admin" | "operator" | "viewer";
  isSuperAdmin?: boolean;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt?: string;
}

const emptyForm = {
  username: "",
  password: "",
  displayName: "",
  email: "",
  permissions: [] as string[],
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [permissionDefs, setPermissionDefs] = useState<PermissionDefinition[]>(FALLBACK_PERMISSION_DEFS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<User | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editMeta, setEditMeta] = useState({ displayName: "", email: "", password: "" });

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, PermissionDefinition[]>();
    for (const p of permissionDefs.filter(p => p.key !== "users.manage")) {
      const arr = groups.get(p.group) ?? [];
      arr.push(p);
      groups.set(p.group, arr);
    }
    return [...groups.entries()];
  }, [permissionDefs]);

  const load = async () => {
    setLoading(true);
    const [usersRes, permsRes] = await Promise.all([
      adminFetch("/admin/users"),
      adminFetch("/admin/permissions"),
    ]);
    if (usersRes.status === 403 || permsRes.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    if (permsRes.ok) {
      const defs = await permsRes.json();
      if (Array.isArray(defs)) setPermissionDefs(defs);
    }
    if (usersRes.ok) setRows(await usersRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = (key: string) => {
    if (key === "users.manage") return;
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }));
  };

  const toggleEdit = (key: string) => {
    if (key === "users.manage") return;
    setEditPermissions(prev => prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await adminFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    if (r.ok) {
      const created = await r.json();
      setRows(prev => [created, ...prev]);
      setForm(emptyForm);
      return;
    }
    alert((await r.json().catch(() => ({}))).error || "تعذر إنشاء المستخدم");
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setEditPermissions(u.permissions || []);
    setEditMeta({ displayName: u.displayName || "", email: u.email || "", password: "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {
      displayName: editMeta.displayName,
      email: editMeta.email,
    };
    if (!editing.isSuperAdmin) payload.permissions = editPermissions;
    if (editMeta.password.trim()) payload.password = editMeta.password;
    const r = await adminFetch(`/admin/users/${editing.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      alert((await r.json().catch(() => ({}))).error || "تعذر حفظ المستخدم");
      return;
    }
    const updated = await r.json();
    setRows(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditing(null);
  };

  const update = async (id: number, patch: Record<string, unknown>) => {
    const r = await adminFetch(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    if (!r.ok) alert((await r.json().catch(() => ({}))).error || "تعذر التحديث");
    else {
      const updated = await r.json();
      setRows(prev => prev.map(u => u.id === id ? updated : u));
    }
  };

  const remove = async (id: number) => {
    if (!confirm("حذف هذا المستخدم؟")) return;
    const r = await adminFetch(`/admin/users/${id}`, { method: "DELETE" });
    if (!r.ok) alert((await r.json().catch(() => ({}))).error || "تعذر الحذف");
    else setRows(prev => prev.filter(u => u.id !== id));
  };

  if (forbidden) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#EF4444", fontWeight: 800 }}>هذه الصفحة للمدير العام فقط</div>;
  }

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>إدارة المستخدمين والصلاحيات</h2>

      <form onSubmit={create} style={panel}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <input required className="form-input" placeholder="اسم المستخدم" value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} />
          <input required type="password" className="form-input" placeholder="كلمة مرور 8+ أحرف" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          <input className="form-input" placeholder="الاسم المعروض" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} />
          <input type="email" className="form-input" placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>

        <PermissionGrid
          title="صلاحيات الحساب الجديد"
          groups={groupedPermissions}
          selected={form.permissions}
          disabledKeys={[]}
          onToggle={toggle}
        />

        <button type="submit" style={primaryBtn}>إضافة مستخدم</button>
      </form>

      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>جاري التحميل...</div>
      ) : (
        <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
                <th style={th}>المستخدم</th>
                <th style={th}>النوع</th>
                <th style={th}>الصلاحيات</th>
                <th style={th}>الحالة</th>
                <th style={th}>آخر دخول</th>
                <th style={th}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(u => (
                <tr key={u.id}>
                  <td style={td}>
                    <strong>{u.username}</strong>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.displayName || "بدون اسم"}{u.email ? ` · ${u.email}` : ""}</div>
                  </td>
                  <td style={td}>
                    <span style={{ ...pill, background: u.isSuperAdmin ? "#7C3AED22" : "#00AAFF22", color: u.isSuperAdmin ? "#7C3AED" : "#0066cc" }}>
                      {u.isSuperAdmin ? "Super Admin" : "Admin"}
                    </span>
                  </td>
                  <td style={td}>{u.isSuperAdmin ? "كل الصلاحيات" : `${u.permissions?.length || 0} صلاحية`}</td>
                  <td style={td}>
                    <button
                      onClick={() => update(u.id, { isActive: !u.isActive })}
                      disabled={u.isSuperAdmin}
                      style={{ ...smallBtn, color: u.isActive ? "#10B981" : "#EF4444", opacity: u.isSuperAdmin ? 0.5 : 1 }}>
                      {u.isActive ? "مفعّل" : "معطّل"}
                    </button>
                  </td>
                  <td style={td}>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("ar-EG") : "لم يدخل بعد"}</td>
                  <td style={td}>
                    <button onClick={() => openEdit(u)} style={smallBtn}>الصلاحيات</button>
                    {!u.isSuperAdmin && <button onClick={() => remove(u.id)} style={{ ...smallBtn, color: "#EF4444" }}>حذف</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div style={overlay} onClick={() => setEditing(null)}>
          <div style={{ ...modal, maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>تعديل {editing.username}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
              <input className="form-input" placeholder="الاسم المعروض" value={editMeta.displayName} onChange={e => setEditMeta({ ...editMeta, displayName: e.target.value })} />
              <input type="email" className="form-input" placeholder="البريد الإلكتروني" value={editMeta.email} onChange={e => setEditMeta({ ...editMeta, email: e.target.value })} />
              <input type="password" className="form-input" placeholder="كلمة مرور جديدة (اختياري)" value={editMeta.password} onChange={e => setEditMeta({ ...editMeta, password: e.target.value })} />
            </div>
            {editing.isSuperAdmin ? (
              <div style={{ padding: "1rem", borderRadius: 12, background: "#F5F3FF", color: "#5B21B6", fontWeight: 800 }}>
                المدير العام يمتلك كل الصلاحيات تلقائياً.
              </div>
            ) : (
              <PermissionGrid
                title="صلاحيات هذا المستخدم"
                groups={groupedPermissions}
                selected={editPermissions}
                disabledKeys={[]}
                onToggle={toggleEdit}
              />
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <button onClick={() => setEditing(null)} style={secondaryBtn}>إلغاء</button>
              <button onClick={saveEdit} style={primaryBtn}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PermissionGrid({
  title,
  groups,
  selected,
  disabledKeys,
  onToggle,
}: {
  title: string;
  groups: [string, PermissionDefinition[]][];
  selected: string[];
  disabledKeys: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ color: "var(--text-primary)", fontWeight: 900, marginBottom: "0.75rem" }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "0.85rem" }}>
        {groups.map(([group, perms]) => (
          <div key={group} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "0.85rem", background: "var(--bg-surface-sunk)" }}>
            <div style={{ color: "#00AAFF", fontWeight: 900, fontSize: "0.86rem", marginBottom: "0.55rem" }}>{group}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {perms.map(p => {
                const checked = selected.includes(p.key);
                const disabled = disabledKeys.includes(p.key);
                return (
                  <label key={p.key} style={{ display: "flex", alignItems: "center", gap: "0.55rem", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.82rem", opacity: disabled ? 0.55 : 1 }}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(p.key)} />
                    <span>{p.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const panel: React.CSSProperties = { background: "var(--bg-surface-solid)", padding: "1rem", borderRadius: 14, marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const th: React.CSSProperties = { padding: "0.7rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem", fontWeight: 900 };
const td: React.CSSProperties = { padding: "0.7rem", borderBottom: "1px solid var(--border)", fontSize: "0.85rem", verticalAlign: "top" };
const primaryBtn: React.CSSProperties = { background: "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", padding: "0.65rem 1.2rem", borderRadius: 10, fontWeight: 900, cursor: "pointer", fontFamily: "Cairo,sans-serif" };
const secondaryBtn: React.CSSProperties = { background: "var(--bg-surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)", padding: "0.65rem 1.2rem", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontFamily: "Cairo,sans-serif" };
const smallBtn: React.CSSProperties = { background: "var(--bg-surface-solid)", border: "1px solid var(--border)", borderRadius: 8, padding: "0.35rem 0.7rem", cursor: "pointer", marginInlineEnd: 4, fontFamily: "Cairo,sans-serif", fontWeight: 800 };
const pill: React.CSSProperties = { display: "inline-flex", borderRadius: 999, padding: "0.2rem 0.55rem", fontWeight: 900, fontSize: "0.75rem" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" };
const modal: React.CSSProperties = { background: "var(--bg-surface-solid)", borderRadius: 16, padding: "1.25rem", width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" };
