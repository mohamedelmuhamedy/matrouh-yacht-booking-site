import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useLanguage } from "../LanguageContext";
import { apiFetch } from "../lib/api";
import { useAdmin } from "./AdminContext";

type ScanStatus = "valid" | "used" | "cancelled" | "invalid";

interface VerifyResponse {
  status: ScanStatus;
  reason?: string;
  ticket?: {
    bookingId: number;
    firstName: string;
    packageName: string;
    packageNameAr: string;
    date: string;
    adults: number;
    children: number;
    infants: number;
    ticketNumber: string;
    bookingStatus: string;
    usedAt: string | null;
    issuedAt: string | null;
  };
}

const NAVY = "#0D1B2A";
const GOLD = "#C9A84C";
const SCANNER_ID = "dr-ticket-scanner";

function parseScanned(text: string): { token: string; sig: string } | null {
  try {
    const url = text.startsWith("http") ? new URL(text) : new URL(text, window.location.origin);
    const m = url.pathname.match(/\/verify\/([A-Za-z0-9]+)/);
    if (!m) return null;
    const sig = url.searchParams.get("sig") || "";
    return { token: m[1], sig };
  } catch {
    const m = text.match(/verify\/([A-Za-z0-9]+)(?:\?sig=([A-Za-z0-9]+))?/);
    if (!m) return null;
    return { token: m[1], sig: m[2] || "" };
  }
}

export default function AdminScannerPage() {
  const { lang, t: tr } = useLanguage();
  const ar = lang === "ar";
  const T = tr.verify;
  const dir = ar ? "rtl" : "ltr";
  const { user } = useAdmin();
  const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const [status, setStatus] = useState<ScanStatus | "loading" | null>(null);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [marking, setMarking] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const lastScanRef = useRef<string>("");

  const stopScanner = async () => {
    const inst = scannerRef.current;
    if (inst) {
      try {
        if (inst.isScanning) await inst.stop();
        await inst.clear();
      } catch {}
    }
    setScanning(false);
  };

  const startingRef = useRef(false);
  const startScanner = async (mode?: "environment" | "user") => {
    if (startingRef.current) return;
    startingRef.current = true;
    setCameraError(null);
    setStatus(null);
    setData(null);
    setFeedback(null);
    lastScanRef.current = "";
    const useMode = mode ?? facingMode;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }
      const inst = scannerRef.current;
      await inst.start(
        { facingMode: useMode },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        async (decoded) => {
          if (!decoded || decoded === lastScanRef.current) return;
          lastScanRef.current = decoded;
          await handleDecoded(decoded);
        },
        () => {}
      );
      setScanning(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setCameraError(msg ? `${T.cameraError} (${msg})` : T.cameraError);
      setScanning(false);
    } finally {
      startingRef.current = false;
    }
  };

  const flipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    const wasScanning = scanning;
    if (wasScanning) {
      await stopScanner();
      setTimeout(() => { startScanner(next); }, 150);
    }
  };

  const handleDecoded = async (decoded: string) => {
    const parsed = parseScanned(decoded);
    if (!parsed) {
      setStatus("invalid");
      setData({ status: "invalid", reason: "bad_payload" });
      setFeedback({ kind: "err", msg: T.scanInvalidPayload });
      try { navigator.vibrate?.([200, 80, 200]); } catch {}
      await stopScanner();
      return;
    }
    setStatus("loading");
    setFeedback(null);
    try {
      const r = await apiFetch(`/api/tickets/verify/${encodeURIComponent(parsed.token)}?sig=${encodeURIComponent(parsed.sig)}`);
      const j = await r.json() as VerifyResponse;
      setData(j);
      setStatus(j.status);
      try {
        if (j.status === "valid") navigator.vibrate?.(120);
        else navigator.vibrate?.([200, 80, 200]);
      } catch {}
    } catch {
      setStatus("invalid");
      setData({ status: "invalid" });
    } finally {
      await stopScanner();
    }
  };

  const markUsed = async () => {
    const t = data?.ticket;
    if (!t || !adminToken) return;
    const parsed = parseScanned(lastScanRef.current);
    if (!parsed) return;
    setMarking(true);
    setFeedback(null);
    try {
      const r = await apiFetch(`/api/admin/tickets/${encodeURIComponent(parsed.token)}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      });
      if (!r.ok) throw new Error();
      // re-fetch verify to update state
      const v = await apiFetch(`/api/tickets/verify/${encodeURIComponent(parsed.token)}?sig=${encodeURIComponent(parsed.sig)}`);
      const j = await v.json() as VerifyResponse;
      setData(j);
      setStatus(j.status);
      setFeedback({ kind: "ok", msg: T.feedbackOk });
      try { navigator.vibrate?.([60, 40, 60, 40, 200]); } catch {}
    } catch {
      setFeedback({ kind: "err", msg: T.feedbackErr });
    } finally {
      setMarking(false);
    }
  };

  const reset = async () => {
    await stopScanner();
    setStatus(null);
    setData(null);
    setFeedback(null);
    lastScanRef.current = "";
    startScanner();
  };

  // Auto-start camera once on mount
  useEffect(() => {
    startScanner();
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const meta = (() => {
    switch (status) {
      case "valid": return { color: "#10B981", icon: "✅", label: T.valid, desc: T.descValid };
      case "used": return { color: "#F59E0B", icon: "🟡", label: T.used, desc: T.descUsed };
      case "cancelled": return { color: "#EF4444", icon: "🚫", label: T.cancelled, desc: T.descCancelled };
      case "invalid": return { color: "#EF4444", icon: "❌", label: T.invalid, desc: T.descInvalid };
      case "loading": return { color: "#94A3B8", icon: "⏳", label: T.loading, desc: "" };
      default: return null;
    }
  })();

  const t = data?.ticket;
  const pkgName = ar ? (t?.packageNameAr || t?.packageName) : (t?.packageName || t?.packageNameAr);
  const groupCount = t ? t.adults + t.children + t.infants : 0;

  if (!user || !adminToken) {
    return (
      <div dir={dir} style={{ padding: 24, fontFamily: "Cairo, sans-serif", color: NAVY }}>
        {T.notSignedIn}
      </div>
    );
  }

  return (
    <div dir={dir} style={{
      maxWidth: 520, margin: "0 auto",
      fontFamily: ar ? "Cairo, sans-serif" : "Montserrat, Cairo, sans-serif",
      color: NAVY, display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ textAlign: "center", paddingTop: 4 }}>
        <div style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>DR TRAVEL</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{T.scannerTitle}</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{T.scannerSubtitle}</div>
      </div>

      {/* Camera viewport */}
      <div style={{
        position: "relative", borderRadius: 18, overflow: "hidden",
        background: "#000", aspectRatio: "1 / 1", width: "100%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
        border: `2px solid ${meta ? meta.color : "rgba(13,27,42,0.15)"}`,
      }}>
        <div id={SCANNER_ID} style={{ width: "100%", height: "100%" }} />
        {!scanning && !meta && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.4)",
          }}>
            {cameraError ? `⚠️ ${cameraError}` : T.scanPrompt}
          </div>
        )}
        {scanning && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 10, textAlign: "center",
            color: "white", fontSize: 12, fontWeight: 700, letterSpacing: 1,
            textShadow: "0 1px 4px rgba(0,0,0,0.8)", pointerEvents: "none",
          }}>
            {T.scanPrompt}
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div style={{ display: "flex", gap: 8 }}>
        {scanning ? (
          <button onClick={stopScanner} style={btnStyleSecondary}>⏸ {T.cameraStop}</button>
        ) : (
          <button onClick={() => startScanner()} style={btnStylePrimary}>📷 {T.cameraStart}</button>
        )}
        <button onClick={flipCamera} style={btnStyleGhost}>🔄 {T.flipCamera}</button>
      </div>

      {cameraError && !scanning && (
        <div style={infoBoxErr}>⚠️ {cameraError}</div>
      )}

      {/* Result card */}
      {meta && (
        <div style={{
          background: "var(--bg-surface-solid)", borderRadius: 18, padding: "22px 20px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
          textAlign: "center", border: `3px solid ${meta.color}`,
        }}>
          <div style={{ fontSize: 56, marginBottom: 4 }}>{meta.icon}</div>
          <div style={{
            display: "inline-block", background: meta.color, color: "white",
            padding: "5px 18px", borderRadius: 50, fontSize: 13, fontWeight: 800, letterSpacing: 1,
            textTransform: "uppercase",
          }}>{meta.label}</div>
          <div style={{ marginTop: 8, color: "#475569", fontSize: 13.5, lineHeight: 1.6, fontWeight: 600 }}>
            {meta.desc}
          </div>

          {t && (
            <div style={{
              marginTop: 16, textAlign: ar ? "right" : "left",
              background: "var(--bg-surface-sunk)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <div style={{
                textAlign: "center", padding: "8px 4px 12px", borderBottom: "1px dashed #cbd5e1", marginBottom: 4,
              }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: NAVY, lineHeight: 1.2 }}>
                  {t.firstName}
                </div>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  marginTop: 8, padding: "6px 14px",
                  background: NAVY, color: GOLD, borderRadius: 999,
                  fontSize: 18, fontWeight: 900,
                }}>
                  👥 {groupCount}
                </div>
              </div>
              <Row label={T.ticketNo} value={<code style={{ direction: "ltr", display: "inline-block", color: NAVY, fontWeight: 800 }}>{t.ticketNumber}</code>} />
              <Row label={T.pkg} value={pkgName || "—"} />
              <Row label={T.date} value={t.date} />
              {t.usedAt && <Row label={T.usedAt} value={new Date(t.usedAt).toLocaleString(ar ? "ar-EG" : "en-GB")} />}
            </div>
          )}

          {feedback && (
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: feedback.kind === "ok" ? "#dcfce7" : "#fee2e2",
              color: feedback.kind === "ok" ? "#166534" : "#991b1b",
              border: `1px solid ${feedback.kind === "ok" ? "#86efac" : "#fecaca"}`,
            }}>{feedback.msg}</div>
          )}

          {status === "valid" && (
            <button onClick={markUsed} disabled={marking}
              style={{
                marginTop: 14, width: "100%", padding: "14px 20px", background: NAVY, color: GOLD,
                border: `2px solid ${GOLD}`, borderRadius: 12, fontWeight: 800, fontSize: 17,
                cursor: marking ? "wait" : "pointer", fontFamily: "inherit", letterSpacing: 0.5,
              }}>
              {marking ? T.confirming : T.confirmEntry}
            </button>
          )}

          <button onClick={reset}
            style={{
              marginTop: 10, width: "100%", padding: "12px 18px",
              background: "var(--bg-surface-solid)", color: NAVY, border: `2px solid ${NAVY}`,
              borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer",
              fontFamily: "inherit",
            }}>
            🔁 {T.scanAgain}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
      <span style={{ color: "#64748b", fontWeight: 700 }}>{label}</span>
      <span style={{ color: NAVY, fontWeight: 700, textAlign: "end", maxWidth: "60%", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

const btnStylePrimary: React.CSSProperties = {
  flex: 1, padding: "12px 14px", background: NAVY, color: GOLD,
  border: `2px solid ${GOLD}`, borderRadius: 12, fontWeight: 800,
  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
};
const btnStyleSecondary: React.CSSProperties = {
  flex: 1, padding: "12px 14px", background: "#fff", color: NAVY,
  border: `2px solid ${NAVY}`, borderRadius: 12, fontWeight: 800,
  fontSize: 14, cursor: "pointer", fontFamily: "inherit",
};
const btnStyleGhost: React.CSSProperties = {
  padding: "12px 14px", background: "rgba(13,27,42,0.06)", color: NAVY,
  border: "1px solid rgba(13,27,42,0.15)", borderRadius: 12, fontWeight: 700,
  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
};
const infoBoxErr: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700,
  background: "#fee2e2", color: "#991b1b", border: "1px solid #fecaca",
};
