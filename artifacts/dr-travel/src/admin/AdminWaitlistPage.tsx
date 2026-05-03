import { useEffect, useState } from "react";
import { adminFetch } from "./AdminContext";

interface Entry {
  id: number; name: string; phone: string; packageId: number | null; packageName: string;
  date: string; groupSize: number; notes: string;
  status: "pending" | "notified" | "converted" | "cancelled";
  notifiedAt: string | null; createdAt: string;
}

const LABELS: Record<string, string> = { pending: "في الانتظار", notified: "تم الإخطار", converted: "تم التحويل", cancelled: "ملغي" };
const COLORS: Record<string, string> = { pending: "#F59E0B", notified: "#3B82F6", converted: "#10B981", cancelled: "#EF4444" };

export default function AdminWaitlistPage() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await adminFetch("/admin/waitlist");
    setRows(await r.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: number, status: string) => {
    await adminFetch(`/admin/waitlist/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("حذف؟")) return;
    await adminFetch(`/admin/waitlist/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>📋 قائمة الانتظار</h2>
      {loading ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>⏳</div> :
        rows.length === 0 ? <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>لا توجد طلبات</div> :
        <div style={{ background: "var(--bg-surface-solid)", borderRadius: 14, overflow: "auto", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-page-2)", textAlign: "right" }}>
                <th style={th}>الاسم</th><th style={th}>الهاتف</th><th style={th}>الباقة</th>
                <th style={th}>التاريخ</th><th style={th}>عدد</th><th style={th}>الحالة</th><th style={th}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.name}</td>
                  <td style={td}><a href={`https://wa.me/2${r.phone}`} target="_blank" style={{ color: "#10B981", textDecoration: "none" }}>{r.phone}</a></td>
                  <td style={td}>{r.packageName || `#${r.packageId || "؟"}`}</td>
                  <td style={td}>{r.date}</td>
                  <td style={td}>{r.groupSize}</td>
                  <td style={td}><span style={{ background: COLORS[r.status] + "22", color: COLORS[r.status], padding: "3px 8px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700 }}>{LABELS[r.status]}</span></td>
                  <td style={td}>
                    {r.status === "pending" && <button onClick={() => update(r.id, "notified")} style={btn("#3B82F6")}>📨 أُخطر</button>}
                    {r.status === "notified" && <button onClick={() => update(r.id, "converted")} style={btn("#10B981")}>✓ تحوّل</button>}
                    <button onClick={() => remove(r.id)} style={btn("#64748B")}>🗑️</button>
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
function btn(color: string): React.CSSProperties {
  return { background: color, color: "white", border: "none", padding: "0.35rem 0.65rem", borderRadius: 6, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "Cairo,sans-serif", marginInlineEnd: 4 };
}
