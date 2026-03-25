import { useState, FormEvent } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "./AdminContext";

export default function LoginPage() {
  const { login } = useAdmin();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "خطأ في تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0D1B2A 0%,#0a2040 100%)", fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <div style={{ background: "white", borderRadius: "20px", padding: "3rem 2.5rem", width: "100%", maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔐</div>
          <h1 style={{ color: "#0D1B2A", fontWeight: 900, fontSize: "1.5rem", margin: "0 0 0.3rem" }}>لوحة الإدارة</h1>
          <p style={{ color: "#667788", fontSize: "0.85rem", margin: 0 }}>DR Travel Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", color: "#0D1B2A", fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.9rem" }}>
              اسم المستخدم
            </label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              required autoComplete="username"
              style={{ width: "100%", padding: "0.8rem 1rem", borderRadius: "10px", border: "2px solid #e0e8f0", outline: "none", fontSize: "0.95rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#00AAFF"}
              onBlur={e => e.target.style.borderColor = "#e0e8f0"} />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", color: "#0D1B2A", fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.9rem" }}>
              كلمة المرور
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{ width: "100%", padding: "0.8rem 1rem", borderRadius: "10px", border: "2px solid #e0e8f0", outline: "none", fontSize: "0.95rem", fontFamily: "Cairo, sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "#00AAFF"}
              onBlur={e => e.target.style.borderColor = "#e0e8f0"} />
          </div>

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "0.9rem", background: loading ? "#aaa" : "linear-gradient(135deg,#00AAFF,#0066cc)", color: "white", border: "none", borderRadius: "12px", fontWeight: 800, fontSize: "1rem", fontFamily: "Cairo, sans-serif", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.3s", boxShadow: "0 6px 20px rgba(0,170,255,0.3)" }}>
            {loading ? "جاري الدخول..." : "دخول →"}
          </button>
        </form>

      </div>
    </div>
  );
}
