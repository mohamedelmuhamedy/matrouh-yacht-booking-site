import { useState, useEffect } from "react";
import { adminFetch } from "./AdminContext";

interface SendResult {
  sent: number;
  failed: number;
  total: number;
  message?: string;
  details?: { endpoint: string; status: number | string; ok: boolean }[];
}

export default function PushNotificationsPage() {
  const [title, setTitle]   = useState("");
  const [body,  setBody]    = useState("");
  const [url,   setUrl]     = useState("/");
  const [stats, setStats]   = useState<{ count: number; vapidConfigured: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error,  setError]  = useState("");

  const loadStats = () => {
    adminFetch("/admin/push/stats")
      .then(r => r.ok ? r.json() : { count: 0, vapidConfigured: false })
      .then(d => setStats(d))
      .catch(() => setStats({ count: 0, vapidConfigured: false }));
  };

  useEffect(() => { loadStats(); }, []);

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
      if (!r.ok) { setError(d.error ?? "فشل الإرسال"); setLoading(false); return; }
      setResult(d);
      setTitle(""); setBody(""); setUrl("/");
      loadStats();
    } catch {
      setError("خطأ في الاتصال بالسيرفر");
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
  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8,
    padding: "0.65rem 0.85rem", fontSize: "0.9rem",
    fontFamily: "Cairo, sans-serif", outline: "none",
    boxSizing: "border-box", color: "#111",
  };

  const vapidOk = stats?.vapidConfigured !== false;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#0D1B2A", marginBottom: "1.5rem" }}>
        📢 إشعارات Push
      </h1>

      {/* VAPID warning */}
      {!vapidOk && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 10, padding: "1rem", marginBottom: "1rem", color: "#92400e", fontSize: "0.85rem" }}>
          ⚠️ مفاتيح VAPID غير مهيأة — لن يعمل الإرسال. تأكد من إضافة VAPID_PUBLIC_KEY و VAPID_PRIVATE_KEY
        </div>
      )}

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
              {stats === null ? "..." : stats.count.toLocaleString("ar")}
            </div>
            <div style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 2 }}>
              مشترك في الإشعارات
            </div>
          </div>
          <div style={{ marginRight: "auto" }}>
            <button onClick={loadStats} style={{
              background: "rgba(0,170,255,0.08)", border: "1px solid rgba(0,170,255,0.2)",
              borderRadius: 8, padding: "0.4rem 0.8rem", color: "#0066cc",
              fontSize: "0.75rem", cursor: "pointer", fontFamily: "Cairo, sans-serif",
            }}>
              تحديث
            </button>
          </div>
        </div>
      </div>

      {/* Compose form */}
      <div style={card}>
        <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#0D1B2A", margin: "0 0 1.2rem" }}>
          إرسال إشعار جديد
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <label style={label}>العنوان *</label>
          <input
            style={inputStyle}
            placeholder="مثال: عرض خاص على رحلة اليخت"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={label}>الرسالة *</label>
          <textarea
            style={{ ...inputStyle, resize: "vertical", minHeight: 90 } as React.CSSProperties}
            placeholder="نص الإشعار الذي سيراه المستخدم..."
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={200}
          />
        </div>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={label}>رابط عند الضغط (اختياري)</label>
          <input
            style={inputStyle}
            placeholder="/"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "0.75rem 1rem", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>
            ❌ {error}
          </div>
        )}

        {result && (
          <div style={{ background: result.failed === 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${result.failed === 0 ? "#86efac" : "#fcd34d"}`, borderRadius: 8, padding: "0.9rem 1rem", marginBottom: "1rem" }}>
            <div style={{ color: result.failed === 0 ? "#15803d" : "#92400e", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.4rem" }}>
              {result.total === 0
                ? "⚠️ لا يوجد مشتركون بعد"
                : result.failed === 0
                ? `✅ أُرسل بنجاح إلى ${result.sent} مشترك`
                : `⚠️ أُرسل إلى ${result.sent} · فشل ${result.failed} (من ${result.total})`}
            </div>
            {result.details && result.details.length > 0 && (
              <div style={{ fontSize: "0.75rem", color: "#6B7280", borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                {result.details.map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.2rem" }}>
                    <span>{d.ok ? "✅" : "❌"}</span>
                    <span style={{ fontFamily: "monospace" }}>...{d.endpoint}</span>
                    <span style={{ color: d.ok ? "#15803d" : "#b91c1c" }}>HTTP {d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={send}
          disabled={loading || !title.trim() || !body.trim() || !vapidOk}
          style={{
            width: "100%", background: loading ? "#93c5fd" : "#0D1B2A",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "0.75rem", fontSize: "0.95rem", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Cairo, sans-serif",
            transition: "background 0.2s",
          }}
        >
          {loading ? "جارٍ الإرسال..." : `📤 إرسال لجميع المشتركين (${stats?.count ?? 0})`}
        </button>
      </div>

      <p style={{ color: "#9CA3AF", fontSize: "0.75rem", textAlign: "center" }}>
        الإشعارات تصل فورياً للمستخدمين الذين سمحوا بها في متصفحاتهم.
        تأكد من أن المستخدم فعّل الإشعارات بعد تحديث الموقع لضمان تشغيل الـ service worker الجديد.
      </p>
    </div>
  );
}
