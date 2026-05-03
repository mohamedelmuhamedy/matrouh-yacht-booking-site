import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useLanguage } from "../LanguageContext";
import { apiFetch } from "../lib/api";

type VerifyStatus = "valid" | "used" | "cancelled" | "invalid" | "loading";

interface VerifyResponse {
  status: Exclude<VerifyStatus, "loading">;
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

export default function VerifyPage() {
  const [, params] = useRoute("/verify/:token");
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const [state, setState] = useState<VerifyStatus>("loading");
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [marking, setMarking] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const isAdmin = !!adminToken;

  const token = params?.token || "";
  const sig = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("sig") || ""
    : "";

  const load = async () => {
    if (!token) { setState("invalid"); return; }
    setState("loading");
    try {
      const r = await apiFetch(`/api/tickets/verify/${encodeURIComponent(token)}?sig=${encodeURIComponent(sig)}`);
      const j = await r.json() as VerifyResponse;
      setData(j);
      setState(j.status);
    } catch {
      setState("invalid");
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const markUsed = async () => {
    if (!token || !adminToken) return;
    setMarking(true);
    setFeedback(null);
    try {
      const r = await apiFetch(`/api/admin/tickets/${encodeURIComponent(token)}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      });
      if (!r.ok) throw new Error();
      setFeedback({ kind: "ok", msg: ar ? "تم تأكيد الدخول" : "Entry confirmed" });
      await load();
    } catch {
      setFeedback({ kind: "err", msg: ar ? "فشل تأكيد الدخول" : "Failed to confirm entry" });
    } finally {
      setMarking(false);
    }
  };

  const T = ar ? {
    verify: "التحقق من التذكرة",
    valid: "صالحة",
    used: "مستخدمة",
    cancelled: "ملغاة",
    invalid: "غير صالحة",
    loading: "جاري التحقق...",
    descValid: "هذه التذكرة أصلية وصالحة للدخول.",
    descUsed: "تم استخدام هذه التذكرة عند الدخول مسبقاً.",
    descCancelled: "هذا الحجز ملغى.",
    descInvalid: "لم نتمكن من التحقق من هذه التذكرة. قد تكون مزوّرة أو منتهية الصلاحية.",
    ticketNo: "رقم التذكرة",
    customer: "العميل",
    pkg: "الباقة",
    date: "التاريخ",
    group: "العدد",
    issued: "تاريخ الإصدار",
    usedAt: "تاريخ الاستخدام",
    confirmEntry: "✓ تأكيد الدخول",
    confirming: "جاري التأكيد...",
    adminNote: "هذه الأداة للموظفين فقط — سجّل الدخول من لوحة الإدارة لتأكيد الدخول.",
    adminLogin: "تسجيل الدخول",
    poweredBy: "DR Travel · نظام تذاكر مؤمَّن",
  } : {
    verify: "Ticket Verification",
    valid: "Valid",
    used: "Used",
    cancelled: "Cancelled",
    invalid: "Invalid",
    loading: "Verifying...",
    descValid: "This ticket is authentic and valid for entry.",
    descUsed: "This ticket has already been used at the gate.",
    descCancelled: "This booking is cancelled.",
    descInvalid: "We could not verify this ticket. It may be forged or expired.",
    ticketNo: "Ticket No.",
    customer: "Customer",
    pkg: "Package",
    date: "Date",
    group: "Group",
    issued: "Issued",
    usedAt: "Used at",
    confirmEntry: "✓ Confirm entry",
    confirming: "Confirming...",
    adminNote: "Staff only — sign in to the admin panel to confirm entry.",
    adminLogin: "Sign in",
    poweredBy: "DR Travel · Secure Ticketing",
  };

  const meta = (() => {
    switch (state) {
      case "valid": return { color: "#10B981", icon: "✅", label: T.valid, desc: T.descValid };
      case "used": return { color: "#F59E0B", icon: "🟡", label: T.used, desc: T.descUsed };
      case "cancelled": return { color: "#EF4444", icon: "🚫", label: T.cancelled, desc: T.descCancelled };
      case "invalid": return { color: "#EF4444", icon: "❌", label: T.invalid, desc: T.descInvalid };
      default: return { color: "#94A3B8", icon: "⏳", label: T.loading, desc: "" };
    }
  })();

  const t = data?.ticket;
  const pkgName = ar ? (t?.packageNameAr || t?.packageName) : (t?.packageName || t?.packageNameAr);

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${NAVY} 0%, #14253a 60%, #0a1520 100%)`,
      padding: "24px 14px 60px",
      display: "flex", flexDirection: "column", alignItems: "center",
      fontFamily: ar ? "Cairo, sans-serif" : "Montserrat, Cairo, sans-serif",
      color: "white",
    }}>
      <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", marginTop: 6 }}>
          <div style={{ fontSize: 12, color: GOLD, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>DR TRAVEL</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{T.verify}</div>
        </div>

        <div style={{
          background: "white", color: NAVY, borderRadius: 18, padding: "26px 22px",
          boxShadow: "0 16px 56px rgba(0,0,0,0.35)",
          textAlign: "center", border: `3px solid ${meta.color}`,
        }}>
          <div style={{ fontSize: 56, marginBottom: 4 }}>{meta.icon}</div>
          <div style={{
            display: "inline-block", background: meta.color, color: "white",
            padding: "5px 18px", borderRadius: 50, fontSize: 13, fontWeight: 800, letterSpacing: 1,
            textTransform: "uppercase",
          }}>{meta.label}</div>
          <div style={{ marginTop: 10, color: "#475569", fontSize: 14, lineHeight: 1.6, fontWeight: 600 }}>
            {meta.desc}
          </div>

          {t && (
            <div style={{
              marginTop: 18, textAlign: ar ? "right" : "left",
              background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <Row label={T.ticketNo} value={<code style={{ direction: "ltr", display: "inline-block", color: NAVY, fontWeight: 800 }}>{t.ticketNumber}</code>} />
              <Row label={T.customer} value={t.firstName} />
              <Row label={T.pkg} value={pkgName || "—"} />
              <Row label={T.date} value={t.date} />
              <Row label={T.group} value={`${t.adults + t.children + t.infants}`} />
              {t.issuedAt && <Row label={T.issued} value={new Date(t.issuedAt).toLocaleString(ar ? "ar-EG" : "en-GB")} />}
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

          {/* Admin actions */}
          {state === "valid" && (
            isAdmin ? (
              <button onClick={markUsed} disabled={marking}
                style={{
                  marginTop: 16, width: "100%", padding: "14px 20px", background: NAVY, color: GOLD,
                  border: `2px solid ${GOLD}`, borderRadius: 12, fontWeight: 800, fontSize: 16,
                  cursor: marking ? "wait" : "pointer", fontFamily: "inherit",
                  letterSpacing: 0.5,
                }}>
                {marking ? T.confirming : T.confirmEntry}
              </button>
            ) : (
              <div style={{ marginTop: 16, padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, color: "#92400e", fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>
                {T.adminNote}{" "}
                <a href="/admin" style={{ color: "#92400e", textDecoration: "underline", fontWeight: 800 }}>{T.adminLogin}</a>
              </div>
            )
          )}
        </div>

        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 6, letterSpacing: 1 }}>
          🔒 {T.poweredBy}
        </div>
      </div>
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
