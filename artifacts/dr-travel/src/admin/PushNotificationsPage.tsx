import { useState, useEffect } from "react";
import { adminFetch } from "./AdminContext";

export default function PushNotificationsPage() {
  const [title, setTitle]   = useState("");
  const [body,  setBody]    = useState("");
  const [url,   setUrl]     = useState("/");
  const [count, setCount]   = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error,  setError]  = useState("");

  useEffect(() => {
    adminFetch("/admin/push/stats")
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(d => setCount(d.count ?? 0))
      .catch(() => setCount(0));
  }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) { setError("العنوان والرسالة مطلوبان"); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await adminFetch("/admin/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), url: url.trim() || "/" }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "فشل الإرسال"); return; }
      setResult(d);
      setTitle(""); setBody(""); setUrl("/");
    } catch {
      setError("خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: 12, padding: "1.5rem",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: "1.25rem",
  };
  const label: React.CSSProperties = {
    display: "block", fontWeight: 700, color: "#374151",
    fontSize: "0.85rem", marginBottom: "0.4rem",
  };
  const input: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8,
    padding: "0.65rem 0.85rem", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", outline: "none",
    boxSizing: "border-box", color: "#111",
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0D1B2A", marginBottom: "1.5rem" }}>
        📢 إشعارات Push
      </h1>

      {/* Stats */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 12,
            background: "linear-gradient(135deg,#0D1B2A,#1e3a5f)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem",
          }}>🔔</div>
          <div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#0D1B2A", lineHeight: 1 }}>
              {count === null ? "..." : count.toLocaleString("ar")}
            </div>
            <div style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 2 }}>
              مشترك في الإشعارات
            </div>
          </div>
        </div>
      </div>

      {/* Compose form */}
      <div style={card}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0D1B2A", marginBottom: "1.2rem", margin: "0 0 1.2rem" }}>
          إرسال إشعار جديد
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={label}>العنوان *</label>
          <input
            style={input}
            placeholder="مثال: عرض خاص على رحلة اليخت"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={label}>الرسالة *</label>
          <textarea
            style={{ ...input, resize: "vertical", minHeight: 90 } as React.CSSProperties}
            placeholder="نص الإشعار الذي سيراه المستخدم..."
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={label}>رابط عند الضغط (اختياري)</label>
          <input
            style={input}
            placeholder="/"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem 1rem", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "0.75rem 1rem", color: "#15803d", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ✅ أُرسل إلى <strong>{result.sent}</strong> مشترك
            {result.failed > 0 && ` · فشل ${result.failed}`}
          </div>
        )}

        <button
          onClick={send}
          disabled={loading || !title.trim() || !body.trim()}
          style={{
            width: "100%", background: loading ? "#93c5fd" : "#0D1B2A",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Cairo, sans-serif",
            transition: "background 0.2s",
          }}
        >
          {loading ? "جارٍ الإرسال..." : "📤 إرسال لجميع المشتركين"}
        </button>
      </div>

      <p style={{ color: "#9CA3AF", fontSize: "0.75rem", textAlign: "center" }}>
        الإشعارات تصل فورياً للمستخدمين الذين سمحوا بها في متصفحاتهم أو التطبيق المثبَّت
      </p>
    </div>
  );
}
