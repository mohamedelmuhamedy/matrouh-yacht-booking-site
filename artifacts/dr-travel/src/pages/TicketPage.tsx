import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useLanguage } from "../LanguageContext";
import Ticket, { type TicketData } from "../components/Ticket";
import { apiFetch } from "../lib/api";

export default function TicketPage() {
  const [, params] = useRoute("/ticket/:token");
  const { lang } = useLanguage();
  const ar = lang === "ar";
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
    const name = ar ? "تذكرة الحجز" : "Booking Ticket";
    document.title = `${name} · DRT-${String(data.id).padStart(5, "0")}`;
  }, [data, ar]);

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/ticket/${token}` : "";

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1B2A", color: "white", fontFamily: "Cairo, sans-serif" }}>
        <div style={{ fontSize: "1.1rem" }}>{ar ? "جاري تحميل التذكرة..." : "Loading ticket..."}</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D1B2A", color: "white", fontFamily: "Cairo, sans-serif", flexDirection: "column", gap: 10, padding: "1rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem" }}>🎫</div>
        <div style={{ fontSize: "1.05rem", fontWeight: 700 }}>{ar ? "هذه التذكرة غير متاحة" : "This ticket is not available"}</div>
        <div style={{ fontSize: "0.9rem", opacity: 0.7 }}>{ar ? "تأكد من الرابط أو تواصل مع DR Travel" : "Please verify the link or contact DR Travel"}</div>
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
          background: "rgba(255,255,255,0.1)", color: "white", border: "1px solid rgba(255,255,255,0.25)",
          padding: "0.6rem 1.4rem", borderRadius: 10, cursor: "pointer", fontFamily: "Cairo, sans-serif",
          fontWeight: 700, fontSize: "0.9rem",
        }}
      >
        🖨 {ar ? "طباعة التذكرة" : "Print Ticket"}
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
