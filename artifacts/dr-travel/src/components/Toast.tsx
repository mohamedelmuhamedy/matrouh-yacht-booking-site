import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const COLORS = {
  success: { bg: "#16a34a", icon: "✓" },
  error: { bg: "#dc2626", icon: "✕" },
  info: { bg: "#0066cc", icon: "ℹ" },
  warning: { bg: "#d97706", icon: "⚠" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, "warning"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <div style={{
        position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
        zIndex: 99999, display: "flex", flexDirection: "column", gap: "0.5rem",
        alignItems: "center", pointerEvents: "none",
      }}>
        {toasts.map(toast => {
          const c = COLORS[toast.type];
          return (
            <div key={toast.id} style={{
              background: c.bg, color: "white", padding: "0.75rem 1.25rem",
              borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
              display: "flex", alignItems: "center", gap: "0.5rem",
              fontSize: "0.9rem", fontWeight: 600, fontFamily: "Cairo, sans-serif",
              animation: "slideUpFade 0.3s ease", minWidth: "200px", maxWidth: "400px",
              pointerEvents: "auto",
            }}>
              <span style={{ fontWeight: 900, fontSize: "1rem" }}>{c.icon}</span>
              {toast.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
