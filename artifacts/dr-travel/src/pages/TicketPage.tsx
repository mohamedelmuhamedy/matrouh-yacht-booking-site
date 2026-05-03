import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useLanguage } from "../LanguageContext";
import Ticket, { type TicketData } from "../components/Ticket";
import { apiFetch } from "../lib/api";
import { rememberTicket } from "../lib/myTickets";
import { getPushPermission, linkPushSubscriptionToTicket } from "../hooks/usePushNotifications";

export default function TicketPage() {
  const [, params] = useRoute("/ticket/:token");
  const { lang, t: tr } = useLanguage();
  const ar = lang === "ar";
  const T = tr.ticket;
  const [data, setData] = useState<TicketData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const token = params?.token || "";

  useEffect(() => {
    if (!token) { setError("invalid"); setLoading(false); return; }
    apiFetch(`/api/tickets/${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: TicketData) => { setData(d); setLoading(false); })
      .catch((s) => { setError(String(s)); setLoading(false); });
  }, [token]);

  useEffect(() => {
    if (!data) return;
    document.title = `${T.pageTitle} · DRT-${String(data.id).padStart(5, "0")}`;
    if (token) rememberTicket(token);
    if (token && data.status === "confirmed" && getPushPermission() === "granted") {
      linkPushSubscriptionToTicket(token).catch(() => {});
    }
  }, [data, T.pageTitle, token]);

  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${token}`
    : "";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif" }}>
        <div style={{ fontSize: "1.1rem" }}>{T.loading}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "Cairo, sans-serif", flexDirection: "column", gap: 10, padding: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>🎫</div>
        <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{T.unavailableTitle}</div>
        <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>{T.unavailableHint}</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0D1B2A 0%, #14253a 100%)",
        padding: "24px 12px 60px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 820, display: "flex", justifyContent: "center" }}>
        <div style={{ transform: typeof window !== "undefined" && window.innerWidth < 860 ? `scale(${Math.min(1, (window.innerWidth - 24) / 800)})` : "none", transformOrigin: "top center" }}>
          <Ticket data={data} lang={lang} publicUrl={publicUrl} />
        </div>
      </div>
      <button
        onClick={() => window.print()}
        style={{
          background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.25)",
          padding: "0.6rem 1.4rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo, sans-serif",
          fontWeight: 700, fontSize: "0.9rem",
        }}
      >
        {T.print}
      </button>
      <style>{`
        @media print {
          body { background: white !important; }
          button { display: none !important; }
          [data-ticket-root] { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
