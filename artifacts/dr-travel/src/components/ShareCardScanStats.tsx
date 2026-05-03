import { useEffect, useState } from "react";
import { adminFetch } from "../admin/AdminContext";
import { useLanguage } from "../LanguageContext";

interface SourceRow {
  source: string;
  total: number;
  last7: number;
  last30: number;
}

interface ScanStats {
  total: number;
  last7: number;
  last30: number;
  bySource: SourceRow[];
}

interface Preset {
  value: string;
  labelAr: string;
  labelEn: string;
}

interface Props {
  sourcePresets?: Preset[];
}

const numberFmt = (n: number) => n.toLocaleString();

export default function ShareCardScanStats({ sourcePresets = [] }: Props) {
  const { t, lang } = useLanguage();
  const tx = t.shareCardStats;
  const ar = lang === "ar";

  const [stats, setStats] = useState<ScanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const presetLabel = (raw: string): string => {
    const p = sourcePresets.find(pr => pr.value === raw);
    if (!p) return raw;
    return ar ? p.labelAr : p.labelEn;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await adminFetch("/admin/share/scan-stats");
      if (!r.ok) {
        setError(tx.error);
        return;
      }
      const data = (await r.json()) as ScanStats;
      setStats(data);
    } catch {
      setError(tx.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-surface-solid)", borderRadius: 14, border: "1.5px solid var(--border)",
    padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem",
    direction: ar ? "rtl" : "ltr",
  };

  const kpi = (label: string, value: number, accent: string) => (
    <div style={{
      flex: "1 1 120px", minWidth: 120,
      background: "linear-gradient(135deg,#0D1B2A,#10243a)",
      color: "white", borderRadius: 12, padding: "0.85rem 1rem",
      border: `1px solid ${accent}55`, boxShadow: `0 6px 16px ${accent}33`,
    }}>
      <div style={{ color: accent, fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, marginTop: "0.2rem" }}>
        {numberFmt(value)}
      </div>
    </div>
  );

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <h3 style={{ margin: 0, color: "var(--text-primary)", fontWeight: 900, fontSize: "1.05rem" }}>{tx.title}</h3>
        <button type="button" onClick={load} disabled={loading}
          style={{
            padding: "0.45rem 0.9rem", borderRadius: 8,
            border: "1.5px solid var(--border-strong)", background: "var(--bg-surface-solid)",
            color: "var(--text-primary)", fontWeight: 800, fontSize: "0.78rem",
            fontFamily: "Cairo, sans-serif", cursor: loading ? "wait" : "pointer",
          }}>
          {loading ? tx.loading : tx.refresh}
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--section-subtitle)", fontSize: "0.78rem" }}>{tx.description}</p>

      {error && (
        <div style={{
          color: "#b91c1c", background: "#fee2e2",
          padding: "0.55rem 0.7rem", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700,
        }}>{error}</div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.7rem" }}>
        {kpi(tx.total,  stats?.total  ?? 0, "#00AAFF")}
        {kpi(tx.last7,  stats?.last7  ?? 0, "#25D366")}
        {kpi(tx.last30, stats?.last30 ?? 0, "#C9A84C")}
      </div>

      <div>
        <div style={{ color: "var(--text-muted)", fontWeight: 800, fontSize: "0.82rem", marginBottom: "0.5rem" }}>
          {tx.bySource}
        </div>
        {(!stats || stats.bySource.length === 0) ? (
          <div style={{ color: "var(--section-subtitle)", fontSize: "0.82rem", padding: "0.65rem 0.7rem", background: "var(--bg-surface)", borderRadius: 10, border: "1.5px dashed #d0dce8" }}>
            {tx.empty}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface)", color: "var(--text-muted)" }}>
                  <th style={thStyle(ar)}>{tx.sourceColumn}</th>
                  <th style={thStyleNum}>{tx.totalColumn}</th>
                  <th style={thStyleNum}>{tx.last7Column}</th>
                  <th style={thStyleNum}>{tx.last30Column}</th>
                </tr>
              </thead>
              <tbody>
                {stats.bySource.map((row, i) => {
                  const label = row.source ? presetLabel(row.source) : tx.untagged;
                  return (
                    <tr key={row.source || `__none_${i}`} style={{ borderTop: "1px solid #eef2f6" }}>
                      <td style={tdStyle(ar)}>
                        <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{label}</span>
                        {row.source && (
                          <span style={{ color: "var(--section-subtitle)", marginInlineStart: "0.5rem", direction: "ltr", fontSize: "0.78rem" }}>
                            ?s={row.source}
                          </span>
                        )}
                      </td>
                      <td style={tdStyleNum}>{numberFmt(row.total)}</td>
                      <td style={tdStyleNum}>{numberFmt(row.last7)}</td>
                      <td style={tdStyleNum}>{numberFmt(row.last30)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = (ar: boolean): React.CSSProperties => ({
  textAlign: ar ? "right" : "left",
  padding: "0.55rem 0.7rem", fontWeight: 800, fontSize: "0.78rem",
});
const thStyleNum: React.CSSProperties = {
  textAlign: "center",
  padding: "0.55rem 0.7rem", fontWeight: 800, fontSize: "0.78rem",
};
const tdStyle = (ar: boolean): React.CSSProperties => ({
  textAlign: ar ? "right" : "left",
  padding: "0.55rem 0.7rem", color: "var(--text-primary)",
});
const tdStyleNum: React.CSSProperties = {
  textAlign: "center", padding: "0.55rem 0.7rem", color: "var(--text-primary)", fontWeight: 700,
};
