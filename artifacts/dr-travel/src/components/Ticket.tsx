import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { resolveApiAssetUrl } from "../lib/api";
import { ar as arT } from "../translations/ar";
import { en as enT } from "../translations/en";

export interface TicketData {
  id: number;
  ticketToken: string | null;
  ticketNumber?: string | null;
  ticketSignature?: string | null;
  ticketUsedAt?: string | Date | null;
  ticketUsedBy?: string | null;
  name: string;
  phone: string;
  packageId?: number | null;
  packageName: string;
  packageNameAr: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  notes?: string | null;
  currency: string;
  priceAtBooking?: number | null;
  status: string;
  meetingTime?: string | null;
  pickupLocation?: string | null;
  pickupLocationAr?: string | null;
  supervisorName?: string | null;
  supervisorPhone?: string | null;
  issuedAt?: string | Date | null;
  createdAt?: string | Date | null;
  pdfAvailable?: boolean;
  pdfUrl?: string | null;
  settings: Record<string, string>;
}

const BRAND = {
  navy: "#0D1B2A",
  ocean: "#00AAFF",
  gold: "#C9A84C",
  ink: "#1a2332",
  paper: "#FFFDF7",
};

function formatDate(iso: string, lang: "ar" | "en"): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function formatPhoneIntl(raw: string): string {
  const num = (raw || "").replace(/\D/g, "");
  if (!num) return "";
  if (num.startsWith("20")) return num;
  if (num.startsWith("0")) return "2" + num;
  return num;
}

function StatField({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 12, padding: "14px 16px", border: `1px solid ${accent ? accent + "33" : "#e5e7eb"}`, position: "relative" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.navy, lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

// Procedural guilloche-like SVG background — wavy interlocking lines that
// are very hard to recreate by hand. Rendered as a data URL for crisp html2canvas output.
function guillocheDataUrl(): string {
  const w = 800, h = 1130;
  const lines: string[] = [];
  for (let i = 0; i < 28; i++) {
    const amp = 14 + (i % 7) * 3;
    const freq = 0.012 + (i % 5) * 0.0028;
    const phase = i * 0.6;
    const yBase = 30 + i * 40;
    let d = `M 0 ${yBase}`;
    for (let x = 0; x <= w; x += 6) {
      const y = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * freq * 1.7 + phase * 1.3) * (amp * 0.4);
      d += ` L ${x} ${y.toFixed(2)}`;
    }
    lines.push(`<path d="${d}" fill="none" stroke="${BRAND.gold}" stroke-width="0.4" stroke-opacity="0.18"/>`);
  }
  for (let i = 0; i < 22; i++) {
    const amp = 18 + (i % 5) * 4;
    const freq = 0.010 + (i % 4) * 0.003;
    const phase = i * 0.9 + 1.2;
    const xBase = 30 + i * 36;
    let d = `M ${xBase} 0`;
    for (let y = 0; y <= h; y += 6) {
      const x = xBase + Math.sin(y * freq + phase) * amp + Math.cos(y * freq * 1.4 + phase * 0.9) * (amp * 0.5);
      d += ` L ${x.toFixed(2)} ${y}`;
    }
    lines.push(`<path d="${d}" fill="none" stroke="${BRAND.ocean}" stroke-width="0.4" stroke-opacity="0.10"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${lines.join("")}</svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

// Repeating microtext line: looks like a thin gold stripe at normal size,
// but reveals "DR TRAVEL · AUTHENTIC ·" when zoomed in.
function microtextDataUrl(text: string): string {
  const w = 800, h = 14;
  let line = "";
  for (let i = 0; i < 40; i++) line += text + " · ";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><text x="0" y="10" font-family="Montserrat, Arial, sans-serif" font-size="6" letter-spacing="0.6" fill="${BRAND.gold}" fill-opacity="0.7">${line}</text></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export interface TicketProps {
  data: TicketData;
  lang: "ar" | "en";
  publicUrl: string;
}

export default function Ticket({ data, lang, publicUrl }: TicketProps) {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const T = (ar ? arT : enT).ticket;
  const s = data.settings || {};
  const [qrUrl, setQrUrl] = useState<string>("");

  // Build the QR target: include signature for tamper detection
  const qrTarget = useMemo(() => {
    if (!publicUrl) return "";
    if (data.ticketSignature) {
      const sep = publicUrl.includes("?") ? "&" : "?";
      return `${publicUrl}${sep}sig=${encodeURIComponent(data.ticketSignature)}`;
    }
    return publicUrl;
  }, [publicUrl, data.ticketSignature]);

  useEffect(() => {
    if (!qrTarget) return;
    QRCode.toDataURL(qrTarget, {
      margin: 0, width: 320, color: { dark: BRAND.navy, light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrUrl).catch(() => setQrUrl(""));
  }, [qrTarget]);

  const guilloche = useMemo(guillocheDataUrl, []);
  const microtext = useMemo(() => microtextDataUrl("DR TRAVEL · AUTHENTIC"), []);

  const brand = s.brand_name || "DR Travel";
  const tagline = ar
    ? (s.brand_tagline_ar || "يخت · سفاري · أنشطة بحرية")
    : (s.brand_tagline_en || "Yacht · Safari · Water Activities");
  const logoSrc = resolveApiAssetUrl(s.logo_url);
  const phone = s.phone_number || s.whatsapp_number || "";
  const addr = ar ? (s.address_ar || "مرسى مطروح، مصر") : (s.address_en || "Marsa Matruh, Egypt");

  const pkg = ar ? (data.packageNameAr || data.packageName) : (data.packageName || data.packageNameAr);
  const ticketNo = data.ticketNumber || `DRT-${String(data.id).padStart(5, "0")}`;
  const issuedAt = data.issuedAt ? new Date(data.issuedAt) : (data.createdAt ? new Date(data.createdAt) : new Date());
  const issuedStr = issuedAt.toLocaleString(ar ? "ar-EG" : "en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const totalGuests = (data.adults || 0) + (data.children || 0) + (data.infants || 0);
  const priceLabel = data.priceAtBooking
    ? `${data.priceAtBooking.toLocaleString(ar ? "ar-EG" : "en-US")} ${data.currency || "EGP"}`
    : "—";

  const isUsed = !!data.ticketUsedAt;

  const pickupTxt = ar
    ? (data.pickupLocationAr || data.pickupLocation || "")
    : (data.pickupLocation || data.pickupLocationAr || "");
  const supervisorTxt = data.supervisorName
    ? (data.supervisorPhone ? `${data.supervisorName} · ${data.supervisorPhone}` : data.supervisorName)
    : "";
  const hasOps = !!(data.meetingTime || pickupTxt || supervisorTxt);

  return (
    <div
      data-ticket-root
      dir={dir}
      style={{
        width: 800,
        minHeight: 1130,
        background: BRAND.paper,
        backgroundImage: guilloche,
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        fontFamily: ar ? "Cairo, sans-serif" : "Montserrat, Cairo, sans-serif",
        color: BRAND.navy,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(13,27,42,0.12)",
        borderRadius: 18,
      }}
    >
      {/* Repeated full-page watermark */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        display: "flex", flexWrap: "wrap", alignContent: "flex-start",
        opacity: 0.05, transform: "rotate(-22deg)", transformOrigin: "center",
        fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 38,
        color: BRAND.navy, letterSpacing: 4,
      }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} style={{ width: "33%", textAlign: "center", padding: "30px 0" }}>
            DR TRAVEL · AUTHENTIC
          </span>
        ))}
      </div>

      {/* top gold band */}
      <div style={{ height: 8, background: `linear-gradient(90deg, ${BRAND.gold}, ${BRAND.ocean}, ${BRAND.gold})`, position: "relative", zIndex: 2 }} />

      {/* microtext stripe */}
      <div aria-hidden style={{
        height: 14, backgroundImage: microtext, backgroundRepeat: "repeat-x", backgroundSize: "auto 14px",
        opacity: 0.65, position: "relative", zIndex: 2,
      }} />

      {/* header */}
      <div style={{
        position: "relative", zIndex: 2,
        background: `linear-gradient(135deg, ${BRAND.navy} 0%, #14253a 60%, #0a1520 100%)`,
        color: "white",
        padding: "26px 36px 32px",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", top: -40, insetInlineEnd: -40, width: 160, height: 160, borderRadius: "50%", background: `${BRAND.ocean}22` }} />
        <div style={{ position: "absolute", bottom: -60, insetInlineStart: -30, width: 120, height: 120, borderRadius: "50%", background: `${BRAND.gold}22` }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {logoSrc ? (
              <img
                src={logoSrc} alt={brand} crossOrigin="anonymous"
                style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: `2px solid ${BRAND.gold}` }}
              />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${BRAND.ocean}, ${BRAND.gold})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 }}>✦</div>
            )}
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1.2, fontFamily: "Montserrat, sans-serif" }}>{brand.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: BRAND.gold, fontWeight: 600, letterSpacing: 0.5, marginTop: 2 }}>{tagline}</div>
            </div>
          </div>
          <div style={{ textAlign: ar ? "left" : "right" }}>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: "uppercase" }}>{T.number}</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "Montserrat, sans-serif", letterSpacing: 1, color: BRAND.gold }}>{ticketNo}</div>
            <div style={{
              display: "inline-block", marginTop: 6,
              background: isUsed ? "linear-gradient(135deg, #6b7280, #4b5563)" : `linear-gradient(135deg, ${BRAND.gold}, #b8951e)`,
              color: isUsed ? "white" : BRAND.navy,
              padding: "3px 12px", borderRadius: 50, fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
            }}>{isUsed ? `✓ ${T.used}` : `✓ ${T.confirmed}`}</div>
          </div>
        </div>

        <div style={{ marginTop: 22, fontSize: 30, fontWeight: 900, letterSpacing: 0.5 }}>
          {T.ticket}
        </div>
        <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>
          {T.issued}: {issuedStr}
        </div>
      </div>

      {/* perforated divider */}
      <div style={{ position: "relative", height: 24, zIndex: 2 }}>
        <div style={{ position: "absolute", top: "50%", insetInlineStart: 16, insetInlineEnd: 16, height: 0, borderTop: `2px dashed ${BRAND.gold}66`, transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", insetInlineStart: -12, width: 24, height: 24, background: BRAND.navy, borderRadius: "50%", transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", insetInlineEnd: -12, width: 24, height: 24, background: BRAND.navy, borderRadius: "50%", transform: "translateY(-50%)" }} />
      </div>

      {/* body */}
      <div style={{ padding: "8px 36px 24px", position: "relative", zIndex: 2 }}>

        {/* customer block */}
        <SectionTitle accent={BRAND.ocean}>{T.customer}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 22 }}>
          <StatField label={T.name} value={data.name} accent={BRAND.ocean} />
          <StatField label={T.phone} value={<span style={{ direction: "ltr", display: "inline-block", fontFamily: "Montserrat, sans-serif" }}>{data.phone}</span>} accent={BRAND.ocean} />
        </div>

        {/* trip block */}
        <SectionTitle accent={BRAND.gold}>{T.trip}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: hasOps ? 12 : 14 }}>
          <StatField label={T.pkg} value={pkg || "—"} accent={BRAND.gold} />
          <StatField label={T.date} value={formatDate(data.date, lang)} accent={BRAND.gold} />
          <StatField label={T.meetingTime} value={data.meetingTime || "—"} accent={BRAND.gold} />
        </div>
        {hasOps && (pickupTxt || supervisorTxt) && (
          <div style={{ display: "grid", gridTemplateColumns: pickupTxt && supervisorTxt ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 14 }}>
            {pickupTxt ? <StatField label={T.pickup} value={pickupTxt} accent={BRAND.gold} /> : null}
            {supervisorTxt ? <StatField label={T.supervisor} value={supervisorTxt} accent={BRAND.gold} /> : null}
          </div>
        )}

        {/* group block */}
        <SectionTitle accent="#10B981">{T.group}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          <StatField label={T.adults} value={data.adults} accent="#10B981" />
          <StatField label={T.children} value={data.children} accent="#10B981" />
          <StatField label={T.infants} value={data.infants} accent="#10B981" />
          <StatField label={T.total} value={totalGuests} accent="#10B981" />
        </div>

        {/* price + qr row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 18, marginBottom: 14 }}>
          <div style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, #14253a)`, color: "white",
            borderRadius: 14, padding: "18px 22px", display: "flex", flexDirection: "column", justifyContent: "center",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ fontSize: 11, color: BRAND.gold, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{T.price}</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, fontFamily: "Montserrat, sans-serif" }}>{priceLabel}</div>
            {data.notes ? (
              <div style={{ marginTop: 14, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
                <strong style={{ color: BRAND.gold }}>{T.notesLbl}:</strong> {data.notes}
              </div>
            ) : null}
            {data.ticketSignature ? (
              <div style={{ marginTop: 14, paddingTop: 10, borderTop: `1px dashed ${BRAND.gold}55`, fontSize: 10, opacity: 0.85, fontFamily: "Menlo, Consolas, monospace", letterSpacing: 1 }}>
                <span style={{ color: BRAND.gold, fontWeight: 700 }}>{T.secCode}:</span>{" "}
                <span style={{ direction: "ltr", display: "inline-block", color: "white" }}>{data.ticketSignature}</span>
              </div>
            ) : null}
          </div>
          <div style={{
            background: "white", border: `2px solid ${BRAND.gold}`, borderRadius: 14,
            padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
            position: "relative",
          }}>
            {/* gold seal corner ribbon */}
            <div style={{
              position: "absolute", top: -10, insetInlineStart: -10, width: 56, height: 56, borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, #f5d57a, ${BRAND.gold} 60%, #8b6f1e)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: BRAND.navy, fontWeight: 900, fontSize: 20,
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
              border: "2px solid white",
            }}>✦</div>
            {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 170, height: 170 }} /> : <div style={{ width: 170, height: 170, background: "#f3f4f6", borderRadius: 8 }} />}
            <div style={{ fontSize: 10, color: "#6b7280", textAlign: "center", lineHeight: 1.4, fontWeight: 600 }}>{T.verify}</div>
          </div>
        </div>

        {/* notice */}
        <div style={{
          background: `${BRAND.gold}14`, border: `1.5px solid ${BRAND.gold}55`, borderRadius: 12,
          padding: "12px 16px", marginTop: 14, display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{ fontSize: 22 }}>⏰</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: BRAND.navy, lineHeight: 1.5 }}>{T.notice}</div>
        </div>
      </div>

      {/* security microtext stripe */}
      <div aria-hidden style={{
        height: 14, backgroundImage: microtext, backgroundRepeat: "repeat-x", backgroundSize: "auto 14px",
        opacity: 0.55, position: "relative", zIndex: 2,
      }} />

      {/* footer */}
      <div style={{
        marginTop: "auto", padding: "12px 36px 18px", position: "relative", zIndex: 2,
        borderTop: `1px solid ${BRAND.gold}33`, display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 11, color: "#4b5563", flexWrap: "wrap", gap: 8,
      }}>
        <div>{T.contact}: <strong style={{ color: BRAND.navy, direction: "ltr", display: "inline-block", fontFamily: "Montserrat, sans-serif" }}>{phone}</strong></div>
        <div style={{ color: "#6b7280" }}>📍 {addr}</div>
      </div>
      <div style={{
        background: BRAND.navy, color: BRAND.gold, fontSize: 10, padding: "6px 36px",
        textAlign: "center", letterSpacing: 0.5, fontWeight: 600, position: "relative", zIndex: 2,
      }}>
        🔒 {T.securityFooter}
      </div>
    </div>
  );
}

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ width: 4, height: 18, background: accent, borderRadius: 2 }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: BRAND.navy, letterSpacing: 0.3, textTransform: "uppercase" }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(${"to right"}, ${accent}33, transparent)` }} />
    </div>
  );
}

export { formatPhoneIntl };
