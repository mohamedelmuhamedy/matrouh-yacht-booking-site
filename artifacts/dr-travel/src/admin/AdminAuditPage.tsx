import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "./AdminContext";

interface AuditRow {
  id: number;
  adminUsername: string;
  action: string;
  entity: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (action.trim()) p.set("action", action.trim());
    if (entity.trim()) p.set("entity", entity.trim());
    if (entityId.trim()) p.set("entityId", entityId.trim());
    p.set("limit", "200");
    return p.toString();
  }, [action, entity, entityId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    adminFetch(`/admin/audit?${query}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (Array.isArray(d?.rows)) setRows(d.rows as AuditRow[]);
        else setError(d?.error || "Failed to load");
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div style={{ padding: "1.25rem", fontFamily: "Cairo, sans-serif", color: "var(--text-strong, #fff)" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1rem" }}>سجل التدقيق</h1>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <input aria-label="action" placeholder="الإجراء (action)" value={action} onChange={(e) => setAction(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff" }} />
        <input aria-label="entity" placeholder="النوع (entity)" value={entity} onChange={(e) => setEntity(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff" }} />
        <input aria-label="entityId" placeholder="ID" value={entityId} onChange={(e) => setEntityId(e.target.value)}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1px solid #444", background: "#111", color: "#fff", width: 100 }} />
      </div>

      {loading && <div>جاري التحميل…</div>}
      {error && <div style={{ color: "#f55" }}>{error}</div>}

      {!loading && !error && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
            <thead>
              <tr style={{ background: "#1a1a1a" }}>
                <th style={th}>الوقت</th>
                <th style={th}>المستخدم</th>
                <th style={th}>الإجراء</th>
                <th style={th}>النوع</th>
                <th style={th}>ID</th>
                <th style={th}>IP</th>
                <th style={th}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "1rem", textAlign: "center", color: "#888" }}>لا توجد سجلات</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #222" }}>
                  <td style={td}>{new Date(r.createdAt).toLocaleString("ar-EG")}</td>
                  <td style={td}>{r.adminUsername}</td>
                  <td style={td}><code>{r.action}</code></td>
                  <td style={td}>{r.entity}</td>
                  <td style={td}>{r.entityId ?? "-"}</td>
                  <td style={td}>{r.ip ?? "-"}</td>
                  <td style={{ ...td, maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.metadata ? <code style={{ fontSize: "0.78rem" }}>{JSON.stringify(r.metadata)}</code> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "start", padding: "0.6rem 0.5rem", fontWeight: 600, borderBottom: "1px solid #333" };
const td: React.CSSProperties = { padding: "0.5rem", verticalAlign: "top" };
