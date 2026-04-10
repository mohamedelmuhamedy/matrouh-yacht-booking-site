import { useState, useEffect } from "react";
import { isPushSupported, getPushPermission, subscribeToPush } from "../hooks/usePushNotifications";

const DISMISSED_KEY = "push-prompt-dismissed";

export default function PushPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (getPushPermission() !== "default") return; // already granted or denied
    if (sessionStorage.getItem(DISMISSED_KEY)) return; // dismissed this session

    // Show prompt after a small delay so it doesn't hit the user immediately
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const allow = async () => {
    setVisible(false);
    await subscribeToPush();
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, width: "min(95vw, 380px)",
      background: "linear-gradient(135deg,#0D1B2A,#0a2040)",
      border: "1px solid rgba(0,170,255,0.3)",
      borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      padding: "1.1rem 1.25rem",
      fontFamily: "Cairo, sans-serif", direction: "rtl",
      animation: "slideUpFadeIn 0.4s ease",
    }}>
      <style>{`@keyframes slideUpFadeIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1 }}>🔔</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: "0 0 0.25rem", fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
            ابق على اطلاع دائم
          </p>
          <p style={{ margin: "0 0 0.9rem", color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", lineHeight: 1.5 }}>
            فعّل الإشعارات لتصلك عروض رحلات اليخت والسفاري فور نشرها
          </p>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={allow} style={{
              flex: 1, background: "#00AAFF", color: "#fff",
              border: "none", borderRadius: 8, padding: "0.55rem 1rem",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
            }}>
              السماح
            </button>
            <button onClick={dismiss} style={{
              flex: 1, background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.6)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "0.55rem 1rem",
              fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              fontFamily: "Cairo, sans-serif",
            }}>
              لاحقاً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
