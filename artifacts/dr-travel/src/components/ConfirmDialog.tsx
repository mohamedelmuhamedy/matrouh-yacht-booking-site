interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen, title, message, confirmLabel = "Confirm", cancelLabel = "Cancel",
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={onCancel}>
      <div style={{
        background: "#1a2535", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px",
        padding: "1.75rem", maxWidth: "420px", width: "100%", boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: "white", fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem", fontFamily: "Cairo, sans-serif" }}>
          {title}
        </h3>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: "1.5rem", fontFamily: "Cairo, sans-serif" }}>
          {message}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
            color: "white", padding: "0.6rem 1.25rem", borderRadius: "8px", cursor: "pointer",
            fontFamily: "Cairo, sans-serif", fontWeight: 600, fontSize: "0.875rem", transition: "all 0.2s",
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            background: danger ? "#dc2626" : "#00AAFF", border: "none",
            color: "white", padding: "0.6rem 1.25rem", borderRadius: "8px", cursor: "pointer",
            fontFamily: "Cairo, sans-serif", fontWeight: 700, fontSize: "0.875rem", transition: "all 0.2s",
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
