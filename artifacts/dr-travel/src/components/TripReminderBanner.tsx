// Pre-trip reminder banner shown on the homepage.
//
// The public site has no real customer login, so "logged-in customer" is
// approximated by the set of ticket tokens the user has previously opened
// on this device (see ../lib/myTickets). The token itself is the proof of
// ownership required to view the ticket, so anyone with the token is, by
// design, the legitimate viewer of that booking. This is therefore a
// possession-token fallback rather than a real session model.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "../LanguageContext";
import { apiFetch } from "../lib/api";
import { readStoredTickets, forgetTicket } from "../lib/myTickets";

interface UpcomingTicket {
  token: string;
  bookingId: number;
  date: string;
  packageName: string;
  packageNameAr: string;
  meetingTime: string;
  hoursUntil: number;
}

function hoursUntilDate(dateStr: string, meetingTime: string): number {
  // dateStr "YYYY-MM-DD"; meetingTime optional "HH:MM"
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return Infinity;
  const time = /^\d{2}:\d{2}/.test(meetingTime) ? meetingTime : "08:00";
  const target = new Date(`${dateStr}T${time}:00`);
  if (Number.isNaN(target.getTime())) return Infinity;
  return (target.getTime() - Date.now()) / (1000 * 60 * 60);
}

export default function TripReminderBanner() {
  const { lang, t } = useLanguage();
  const [, navigate] = useLocation();
  const [upcoming, setUpcoming] = useState<UpcomingTicket | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const ar = lang === "ar";
  const R = t.tripReminder;

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredTickets();
    if (stored.length === 0) return;

    const dismissedKey = sessionStorage.getItem("trip-reminder-dismissed-v1") ?? "";

    (async () => {
      const candidates: UpcomingTicket[] = [];
      for (const entry of stored) {
        try {
          const r = await apiFetch(`/api/tickets/${encodeURIComponent(entry.token)}`);
          if (!r.ok) {
            if (r.status === 404 || r.status === 403) {
              // Stale token — purge to keep storage tidy
              if (r.status === 404) forgetTicket(entry.token);
            }
            continue;
          }
          const d = await r.json();
          if (d?.status !== "confirmed" || d?.ticketUsedAt) continue;
          const hrs = hoursUntilDate(d.date || "", d.meetingTime || "");
          if (hrs > 24 || hrs < -2) continue;
          candidates.push({
            token: entry.token,
            bookingId: d.id,
            date: d.date || "",
            packageName: d.packageName || "",
            packageNameAr: d.packageNameAr || "",
            meetingTime: d.meetingTime || "",
            hoursUntil: hrs,
          });
        } catch {
          /* ignore */
        }
      }

      if (cancelled) return;
      candidates.sort((a, b) => a.hoursUntil - b.hoursUntil);
      const next = candidates[0] ?? null;
      if (next && dismissedKey === next.token) {
        setUpcoming(null);
        return;
      }
      setUpcoming(next);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!upcoming || dismissed) return null;

  const pkg = ar ? upcoming.packageNameAr || upcoming.packageName : upcoming.packageName || upcoming.packageNameAr;
  const hours = Math.max(0, Math.round(upcoming.hoursUntil));
  const subline = R.subline
    .replace("{pkg}", pkg || (ar ? "رحلتك" : "Your trip"))
    .replace("{hours}", String(hours));

  const dismiss = () => {
    sessionStorage.setItem("trip-reminder-dismissed-v1", upcoming.token);
    setDismissed(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 78,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 950,
        width: "min(94vw, 540px)",
        background: "linear-gradient(135deg,#0d2742,#0a3a52)",
        border: "1px solid rgba(0,170,255,0.45)",
        borderRadius: 14,
        boxShadow: "0 10px 32px rgba(0,170,255,0.25), 0 4px 12px rgba(0,0,0,0.5)",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.85rem",
        direction: ar ? "rtl" : "ltr",
        fontFamily: ar ? "Cairo, sans-serif" : "Montserrat, sans-serif",
        animation: "tripReminderIn 0.4s ease",
      }}
    >
      <style>{`@keyframes tripReminderIn{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}`}</style>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.92rem", fontWeight: 800, color: "#fff", marginBottom: 2 }}>
          {R.headline}
        </div>
        <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis" }}>
          {subline}
        </div>
      </div>
      <button
        onClick={() => navigate(`/ticket/${upcoming.token}`)}
        style={{
          background: "linear-gradient(135deg,#00AAFF,#0066cc)",
          border: "none",
          color: "#fff",
          padding: "0.55rem 0.95rem",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "0.82rem",
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {R.cta}
      </button>
      <button
        onClick={dismiss}
        aria-label={R.dismiss}
        title={R.dismiss}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.5)",
          fontSize: "1.05rem",
          cursor: "pointer",
          padding: "2px 6px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
