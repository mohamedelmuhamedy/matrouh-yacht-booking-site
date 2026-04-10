import { useState, useEffect, useRef } from "react";
import { isPushSupported, getPushPermission, subscribeToPush } from "../hooks/usePushNotifications";

const DISMISSED_KEY = "push-prompt-dismissed-v3";

const ERROR_MESSAGES: Record<string, string> = {
  push_service_error: "تعذّر الاتصال بخدمة الإشعارات. تأكد من اتصالك بالإنترنت أو جرّب متصفحاً آخر.",
  permission_denied:  "تم رفض إذن الإشعارات. يمكنك تفعيلها لاحقاً من إعدادات المتصفح.",
  permission_dismissed: "لم يتم منح الإذن. يمكنك تفعيل الإشعارات لاحقاً.",
  network_error:      "خطأ في الشبكة. تحقق من اتصالك بالإنترنت وأعد المحاولة.",
  server_error:       "تعذّر الاتصال بالسيرفر. يرجى المحاولة لاحقاً.",
  sw_error:           "تعذّر تحميل Service Worker. تأكد من أن المتصفح محدّث.",
  not_supported:      "المتصفح الحالي لا يدعم الإشعارات الفورية.",
  unknown:            "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.",
};

export default function PushPrompt() {
  const [visible, setVisible]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [status,  setStatus]    = useState<"idle" | "ok" | "error">("idle");
  const [errMsg,  setErrMsg]    = useState("");
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    const perm = getPushPermission();
    if (perm !== "default") return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Clean up auto-dismiss timer on unmount
  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  const scheduleAutoDismiss = (delay: number) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(dismiss, delay);
  };

  const allow = async () => {
    setLoading(true);
    setStatus("idle");
    const result = await subscribeToPush();
    setLoading(false);

    if (result.ok) {
      setStatus("ok");
      scheduleAutoDismiss(2000);
    } else {
      const code = result.errorCode ?? "unknown";
      setErrMsg(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown);
      setStatus("error");
      // Auto-dismiss after 6 s; user can also close manually
      scheduleAutoDismiss(6000);
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, width: "min(95vw, 390px)",
      background: "linear-gradient(135deg,#0D1B2A,#0a2040)",
      border: "1px solid rgba(0,170,255,0.3)",
      borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      padding: "1.1rem 1.25rem",
      fontFamily: "Cairo, sans-serif", direction: "rtl",
      animation: "slideUpFadeIn 0.4s ease",
    }}>
      <style>{`@keyframes slideUpFadeIn{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>

      {/* Close button — always visible */}
      <button
        onClick={dismiss}
        aria-label="إغلاق"
        style={{
          position: "absolute", top: 10, left: 12,
          background: "none", border: "none",
          color: "rgba(255,255,255,0.45)", fontSize: "1.1rem",
          cursor: "pointer", lineHeight: 1, padding: "2px 6px",
          borderRadius: 4,
        }}
      >
        ✕
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem" }}>
        <div style={{ fontSize: "2rem", lineHeight: 1, marginTop: 2 }}>
          {status === "ok" ? "✅" : status === "error" ? "⚠️" : "🔔"}
        </div>

        <div style={{ flex: 1, paddingLeft: 0 }}>
          {status === "ok" && (
            <p style={{ margin: 0, fontWeight: 700, color: "#4ade80", fontSize: "0.92rem" }}>
              تم تفعيل الإشعارات بنجاح!
            </p>
          )}

          {status === "error" && (
            <>
              <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "#fbbf24", fontSize: "0.88rem" }}>
                تعذّر تفعيل الإشعارات
              </p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                {errMsg}
              </p>
            </>
          )}

          {status === "idle" && (
            <>
              <p style={{ margin: "0 0 0.25rem", fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                ابق على اطلاع دائم
              </p>
              <p style={{ margin: "0 0 0.9rem", color: "rgba(255,255,255,0.65)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                فعّل الإشعارات لتصلك عروض رحلات اليخت والسفاري فور نشرها
              </p>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onClick={allow}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: loading ? "rgba(0,170,255,0.5)" : "#00AAFF",
                    color: "#fff", border: "none", borderRadius: 8,
                    padding: "0.55rem 1rem", fontSize: "0.82rem", fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontFamily: "Cairo, sans-serif",
                  }}
                >
                  {loading ? "جارٍ التفعيل..." : "السماح بالإشعارات"}
                </button>
                <button
                  onClick={dismiss}
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.08)",
                    color: "rgba(255,255,255,0.6)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8, padding: "0.55rem 1rem",
                    fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    fontFamily: "Cairo, sans-serif",
                  }}
                >
                  لاحقاً
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
