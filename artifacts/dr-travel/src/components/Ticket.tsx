import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { resolveApiAssetUrl } from "../lib/api";

export interface TicketData {
  id: number;
  ticketToken: string | null;
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
  issuedAt?: string | Date | null;
  createdAt?: string | Date | null;
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
    <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: `1px solid ${accent ? accent + "33" : "#e5e7eb"}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: BRAND.navy, lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

export interface TicketProps {
  data: TicketData;
  lang: "ar" | "en";
  publicUrl: string;
}

export default function Ticket({ data, lang, publicUrl }: TicketProps) {
  const ar = lang === "ar";
  const dir = ar ? "rtl" : "ltr";
  const s = data.settings || {};
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    if (!publicUrl) return;
    QRCode.toDataURL(publicUrl, {
      margin: 0, width: 320, color: { dark: BRAND.navy, light: "#ffffff" },
      errorCorrectionLevel: "M",
    }).then(setQrUrl).catch(() => setQrUrl(""));
  }, [publicUrl]);

  const brand = s.brand_name || "DR Travel";
  const tagline = ar
    ? (s.brand_tagline_ar || "يخت · سفاري · أنشطة بحرية")
    : (s.brand_tagline_en || "Yacht · Safari · Water Activities");
  const logoSrc = resolveApiAssetUrl(s.logo_url);
  const phone = s.phone_number || s.whatsapp_number || "";
  const addr = ar ? (s.address_ar || "مرسى مطروح، مصر") : (s.address_en || "Marsa Matruh, Egypt");

  const pkg = ar ? (data.packageNameAr || data.packageName) : (data.packageName || data.packageNameAr);
  const ticketNo = `DRT-${String(data.id).padStart(5, "0")}`;
  const issuedAt = data.issuedAt ? new Date(data.issuedAt) : (data.createdAt ? new Date(data.createdAt) : new Date());
  const issuedStr = issuedAt.toLocaleString(ar ? "ar-EG" : "en-GB", {
    year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit",
  });
  const totalGuests = (data.adults || 0) + (data.children || 0) + (data.infants || 0);
  const priceLabel = data.priceAtBooking
    ? `${data.priceAtBooking.toLocaleString(ar ? "ar-EG" : "en-US")} ${data.currency || "EGP"}`
    : "—";

  const T = ar ? {
    ticket: "تذكرة الحجز", confirmed: "مؤكدة", number: "رقم التذكرة", issued: "تاريخ الإصدار",
    customer: "بيانات العميل", trip: "تفاصيل الرحلة", group: "عدد الأفراد",
    name: "الاسم", phone: "الهاتف", pkg: "الباقة", date: "تاريخ الرحلة",
    adults: "بالغون", children: "أطفال", infants: "رضع", total: "الإجمالي", price: "إجمالي السعر",
    notesLbl: "ملاحظات", notice: "يرجى التواجد قبل ٣٠ دقيقة من موعد الانطلاق",
    verify: "امسح الكود للتحقق من التذكرة", verifyShort: "تحقق",
    contact: "للاستفسار", brand: brand, tagline,
  } : {
    ticket: "Booking Ticket", confirmed: "Confirmed", number: "Ticket No.", issued: "Issued",
    customer: "Customer Details", trip: "Trip Details", group: "Group Size",
    name: "Name", phone: "Phone", pkg: "Package", date: "Trip Date",
    adults: "Adults", children: "Children", infants: "Infants", total: "Total", price: "Total Price",
    notesLbl: "Notes", notice: "Please arrive 30 minutes before departure",
    verify: "Scan to verify this ticket", verifyShort: "Verify",
    contact: "For inquiries", brand, tagline,
  };

  return (
    <div
      data-ticket-root
      dir={dir}
      style={{
        width: 800,
        minHeight: 1130,
        background: BRAND.paper,
        fontFamily: ar ? "Cairo, sans-serif" : "Montserrat, Cairo, sans-serif",
        color: BRAND.navy,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 12px 48px rgba(13,27,42,0.12)",
        borderRadius: 18,
      }}
    >
      {/* top gold band */}
      <div style={{ height: 8, background: `linear-gradient(90deg, ${BRAND.gold}, ${BRAND.ocean}, ${BRAND.gold})` }} />

      {/* header */}
      <div style={{
        position: "relative",
        background: `linear-gradient(135deg, ${BRAND.navy} 0%, #14253a 60%, #0a1520 100%)`,
        color: "white",
        padding: "28px 36px 36px",
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
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "Montserrat, sans-serif", letterSpacing: 1 }}>{ticketNo}</div>
            <div style={{
              display: "inline-block", marginTop: 6,
              background: `linear-gradient(135deg, ${BRAND.gold}, #b8951e)`, color: BRAND.navy,
              padding: "3px 12px", borderRadius: 50, fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
            }}>✓ {T.confirmed}</div>
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
      <div style={{ position: "relative", height: 24, background: BRAND.paper }}>
        <div style={{ position: "absolute", top: "50%", insetInlineStart: 16, insetInlineEnd: 16, height: 0, borderTop: `2px dashed ${BRAND.gold}66`, transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", insetInlineStart: -12, width: 24, height: 24, background: BRAND.navy, borderRadius: "50%", transform: "translateY(-50%)" }} />
        <div style={{ position: "absolute", top: "50%", insetInlineEnd: -12, width: 24, height: 24, background: BRAND.navy, borderRadius: "50%", transform: "translateY(-50%)" }} />
      </div>

      {/* body */}
      <div style={{ padding: "8px 36px 24px" }}>

        {/* customer block */}
        <SectionTitle accent={BRAND.ocean}>{T.customer}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 22 }}>
          <StatField label={T.name} value={data.name} accent={BRAND.ocean} />
          <StatField label={T.phone} value={<span style={{ direction: "ltr", display: "inline-block", fontFamily: "Montserrat, sans-serif" }}>{data.phone}</span>} accent={BRAND.ocean} />
        </div>

        {/* trip block */}
        <SectionTitle accent={BRAND.gold}>{T.trip}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 14 }}>
          <StatField label={T.pkg} value={pkg || "—"} accent={BRAND.gold} />
          <StatField label={T.date} value={formatDate(data.date, lang)} accent={BRAND.gold} />
        </div>

        {/* group block */}
        <SectionTitle accent="#10B981">{T.group}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 22 }}>
          <StatField label={T.adults} value={data.adults} accent="#10B981" />
          <StatField label={T.children} value={data.children} accent="#10B981" />
          <StatField label={T.infants} value={data.infants} accent="#10B981" />
          <StatField label={T.total} value={totalGuests} accent="#10B981" />
        </div>

        {/* price + qr row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 18, marginBottom: 14 }}>
          <div style={{
            background: `linear-gradient(135deg, ${BRAND.navy}, #14253a)`, color: "white",
            borderRadius: 14, padding: "18px 22px", display: "flex", flexDirection: "column", justifyContent: "center",
          }}>
            <div style={{ fontSize: 11, color: BRAND.gold, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{T.price}</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 4, fontFamily: "Montserrat, sans-serif" }}>{priceLabel}</div>
            {data.notes ? (
              <div style={{ marginTop: 14, fontSize: 12, opacity: 0.85, lineHeight: 1.6 }}>
                <strong style={{ color: BRAND.gold }}>{T.notesLbl}:</strong> {data.notes}
              </div>
            ) : null}
          </div>
          <div style={{
            background: "white", border: `2px solid ${BRAND.gold}33`, borderRadius: 14,
            padding: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {qrUrl ? <img src={qrUrl} alt="QR" style={{ width: 160, height: 160 }} /> : <div style={{ width: 160, height: 160, background: "#f3f4f6", borderRadius: 8 }} />}
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

      {/* footer */}
      <div style={{
        marginTop: "auto", padding: "16px 36px 22px",
        borderTop: `1px solid ${BRAND.gold}33`, display: "flex", justifyContent: "space-between",
        alignItems: "center", fontSize: 11, color: "#4b5563", flexWrap: "wrap", gap: 8,
      }}>
        <div>{T.contact}: <strong style={{ color: BRAND.navy, direction: "ltr", display: "inline-block", fontFamily: "Montserrat, sans-serif" }}>{phone}</strong></div>
        <div style={{ color: "#6b7280" }}>📍 {addr}</div>
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
