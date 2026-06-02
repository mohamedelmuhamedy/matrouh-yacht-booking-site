import { Router } from "express";
import { db, bookings, siteSettings, manualTickets } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, getJwtSecret } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { recordAudit } from "../lib/audit";
import { canIssueTicketForBooking } from "../lib/payments";
import {
  generateTicketNumber,
  signTicket,
  verifyTicketSignature,
  verifyTicketNumberChecksum,
} from "../lib/ticketSecurity";

function isAdminRequest(req: express.Request): boolean {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return false;
  try {
    const decoded = jwt.verify(h.slice(7), getJwtSecret()) as Record<string, unknown>;
    if (!decoded || typeof decoded !== "object") return false;
    if (decoded.kind !== "admin") return false;
    return typeof decoded.userId === "number" && typeof decoded.username === "string";
  } catch {
    return false;
  }
}

function maskPhone(phone: string | null | undefined): string {
  const p = String(phone ?? "");
  if (p.length < 4) return p;
  return p.slice(0, 2) + "•".repeat(Math.max(0, p.length - 4)) + p.slice(-2);
}

function firstNameOnly(name: string | null | undefined): string {
  return String(name ?? "").trim().split(/\s+/)[0] || "";
}

const router = Router();

const TICKETS_DIR = path.resolve(process.cwd(), "data", "tickets");
function ensureDir() {
  try { fs.mkdirSync(TICKETS_DIR, { recursive: true }); } catch {}
}
ensureDir();

export interface IssuedTicket {
  token: string;
  ticketNumber: string;
  signature: string;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface TicketRecord {
  kind: "booking" | "manual";
  id: number;
  ticketToken: string | null;
  ticketNumber: string | null;
  ticketIssuedAt: Date | null;
  ticketUsedAt: Date | null;
  ticketUsedBy: string | null;
  paymentRequired: boolean;
  paymentStatus: string;
  status: string;
  name: string;
  phone: string;
  packageId: number | null;
  packageName: string;
  packageNameAr: string;
  date: string;
  adults: number;
  children: number;
  infants: number;
  notes: string;
  currency: string;
  priceAtBooking: number | null;
  remainingBalance: string;
  meetingTime: string;
  pickupLocation: string;
  pickupLocationAr: string;
  supervisorName: string;
  supervisorPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

function bookingTicketRecord(b: typeof bookings.$inferSelect): TicketRecord {
  return {
    kind: "booking",
    id: b.id,
    ticketToken: b.ticketToken,
    ticketNumber: b.ticketNumber,
    ticketIssuedAt: b.ticketIssuedAt,
    ticketUsedAt: b.ticketUsedAt,
    ticketUsedBy: b.ticketUsedBy,
    paymentRequired: b.paymentRequired,
    paymentStatus: b.paymentStatus,
    status: b.status,
    name: b.name,
    phone: b.phone,
    packageId: b.packageId,
    packageName: b.packageName,
    packageNameAr: b.packageNameAr,
    date: b.date,
    adults: b.adults,
    children: b.children,
    infants: b.infants,
    notes: b.notes,
    currency: b.currency,
    priceAtBooking: b.priceAtBooking,
    remainingBalance: b.remainingBalance,
    meetingTime: b.meetingTime,
    pickupLocation: b.pickupLocation,
    pickupLocationAr: b.pickupLocationAr,
    supervisorName: b.supervisorName,
    supervisorPhone: b.supervisorPhone,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

function manualTicketRecord(t: typeof manualTickets.$inferSelect): TicketRecord {
  return {
    kind: "manual",
    id: t.id,
    ticketToken: t.ticketToken,
    ticketNumber: t.ticketNumber,
    ticketIssuedAt: t.ticketIssuedAt,
    ticketUsedAt: t.ticketUsedAt,
    ticketUsedBy: t.ticketUsedBy,
    paymentRequired: false,
    paymentStatus: "not_required",
    status: t.status,
    name: t.name,
    phone: t.phone,
    packageId: t.packageId,
    packageName: t.packageName,
    packageNameAr: t.packageNameAr,
    date: t.date,
    adults: t.passengerCount,
    children: 0,
    infants: 0,
    notes: t.notes,
    currency: "EGP",
    priceAtBooking: null,
    remainingBalance: t.remainingBalance,
    meetingTime: t.meetingTime,
    pickupLocation: t.pickupLocation,
    pickupLocationAr: t.pickupLocationAr,
    supervisorName: t.supervisorName,
    supervisorPhone: t.supervisorPhone,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function findTicketByToken(token: string): Promise<TicketRecord | null> {
  const [booking] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
  if (booking) return bookingTicketRecord(booking);
  const [manual] = await db.select().from(manualTickets).where(eq(manualTickets.ticketToken, token));
  if (manual) return manualTicketRecord(manual);
  return null;
}

async function ensureTicketTokenInTx(tx: Tx, bookingId: number): Promise<IssuedTicket | null> {
  const [row] = await tx
    .select({
      id: bookings.id,
      ticketToken: bookings.ticketToken,
      ticketNumber: bookings.ticketNumber,
      ticketIssuedAt: bookings.ticketIssuedAt,
      paymentRequired: bookings.paymentRequired,
      paymentStatus: bookings.paymentStatus,
      status: bookings.status,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .for("update");
  if (!row) return null;
  const guard = canIssueTicketForBooking(row);
  if (!guard.ok) return null;

  let token = row.ticketToken && row.ticketToken.length >= 16 ? row.ticketToken : null;
  let ticketNumber = row.ticketNumber && row.ticketNumber.length > 0 ? row.ticketNumber : null;
  const hasIssuedAt = !!row.ticketIssuedAt;

  const updates: Record<string, unknown> = {};
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    updates.ticketToken = token;
  }
  if (!ticketNumber) {
    ticketNumber = generateTicketNumber(bookingId, token);
    updates.ticketNumber = ticketNumber;
  }
  if (!hasIssuedAt && (updates.ticketToken || updates.ticketNumber)) {
    updates.ticketIssuedAt = new Date();
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await tx.update(bookings).set(updates).where(eq(bookings.id, bookingId));
  }

  const signature = signTicket({ bookingId, ticketToken: token, ticketNumber });
  return { token, ticketNumber, signature };
}

export async function ensureTicketToken(
  bookingId: number,
  txArg?: Tx,
): Promise<IssuedTicket | null> {
  if (txArg) return ensureTicketTokenInTx(txArg, bookingId);
  return db.transaction((tx) => ensureTicketTokenInTx(tx, bookingId));
}

async function ensureManualTicketTokenInTx(tx: Tx, manualTicketId: number): Promise<IssuedTicket | null> {
  const [row] = await tx
    .select({
      id: manualTickets.id,
      ticketToken: manualTickets.ticketToken,
      ticketNumber: manualTickets.ticketNumber,
      ticketIssuedAt: manualTickets.ticketIssuedAt,
    })
    .from(manualTickets)
    .where(eq(manualTickets.id, manualTicketId))
    .for("update");
  if (!row) return null;

  let token = row.ticketToken && row.ticketToken.length >= 16 ? row.ticketToken : null;
  let ticketNumber = row.ticketNumber && row.ticketNumber.length > 0 ? row.ticketNumber : null;
  const updates: Record<string, unknown> = {};
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    updates.ticketToken = token;
  }
  if (!ticketNumber) {
    ticketNumber = generateTicketNumber(manualTicketId, token);
    updates.ticketNumber = ticketNumber;
  }
  if (!row.ticketIssuedAt && (updates.ticketToken || updates.ticketNumber)) {
    updates.ticketIssuedAt = new Date();
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await tx.update(manualTickets).set(updates).where(eq(manualTickets.id, manualTicketId));
  }

  const signature = signTicket({ bookingId: manualTicketId, ticketToken: token, ticketNumber });
  return { token, ticketNumber, signature };
}

export async function ensureManualTicketToken(
  manualTicketId: number,
  txArg?: Tx,
): Promise<IssuedTicket | null> {
  if (txArg) return ensureManualTicketTokenInTx(txArg, manualTicketId);
  return db.transaction((tx) => ensureManualTicketTokenInTx(tx, manualTicketId));
}

const PUBLIC_SETTING_KEYS = new Set([
  "brand_name", "brand_short_name", "brand_tagline_ar", "brand_tagline_en",
  "logo_url", "phone_number", "whatsapp_number", "instagram_url", "facebook_url",
  "address_ar", "address_en", "maps_url",
  "card_display_name_ar", "card_display_name_en",
  "wa_image_message_ar", "wa_image_message_en",
]);

router.get("/tickets/verify/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const sig = String(req.query.sig || "").trim().toUpperCase();
    if (!token || token.length < 16) {
      return res.json({ status: "invalid", reason: "bad_token" });
    }
    const b = await findTicketByToken(token);
    if (!b || !b.ticketNumber) {
      return res.json({ status: "invalid", reason: "not_found" });
    }
    if (!verifyTicketNumberChecksum(b.ticketNumber)) {
      return res.json({ status: "invalid", reason: "bad_number" });
    }
    const sigOk = sig
      ? verifyTicketSignature(
          { bookingId: b.id, ticketToken: token, ticketNumber: b.ticketNumber },
          sig,
        )
      : true;
    if (!sigOk) {
      return res.json({ status: "invalid", reason: "bad_signature" });
    }

    let derivedStatus: "valid" | "used" | "cancelled" | "completed" | "invalid" = "valid";
    if (b.status === "cancelled") derivedStatus = "cancelled";
    else if (b.status === "completed") derivedStatus = "completed";

    return res.json({
      status: derivedStatus,
      ticket: {
        bookingId: b.id,
        name: b.name,
        firstName: firstNameOnly(b.name),
        phone: b.phone,
        packageName: b.packageName,
        packageNameAr: b.packageNameAr,
        date: b.date,
        adults: b.adults,
        children: b.children,
        infants: b.infants,
        ticketNumber: b.ticketNumber,
        bookingStatus: b.status,
        notes: b.notes,
        currency: b.currency,
        priceAtBooking: b.priceAtBooking,
        remainingBalance: b.remainingBalance,
        meetingTime: b.meetingTime,
        pickupLocation: b.pickupLocation,
        pickupLocationAr: b.pickupLocationAr,
        supervisorName: b.supervisorName,
        supervisorPhone: b.supervisorPhone,
        usedAt: b.ticketUsedAt,
        issuedAt: b.ticketIssuedAt || b.updatedAt,
      },
    });
  } catch (err) {
    console.error("[tickets.verify] error:", err);
    return res.status(500).json({ status: "invalid", reason: "server_error" });
  }
});

function checkSig(b: { id: number; ticketNumber: string | null }, token: string, rawSig: unknown): boolean {
  if (!b.ticketNumber) return false;
  const sig = String(rawSig ?? "").trim().toUpperCase();
  if (!sig) return false;
  return verifyTicketSignature(
    { bookingId: b.id, ticketToken: token, ticketNumber: b.ticketNumber },
    sig,
  );
}

router.get("/tickets/:token.pdf", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(404).end();
    const b = await findTicketByToken(token);
    if (!b) return res.status(404).end();
    if (b.kind === "booking") {
      const guard = canIssueTicketForBooking(b);
      if (!guard.ok) return res.status(409).json({ error: guard.reason, code: "PAYMENT_REQUIRED" });
    }

    // Removed authorization check: PDF tickets by token are now fully public.
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "PDF not yet generated" });
    const stat = fs.statSync(pdfPath);
    const disposition = String(req.query.download || "") === "1" ? "attachment" : "inline";
    const safeName = b.ticketNumber || `dr-travel-ticket-${b.id}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(pdfPath).pipe(res);
    return;
  } catch (err) {
    console.error("[tickets.pdf] error:", err);
    return res.status(500).end();
  }
});

router.get("/tickets/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(404).json({ error: "Not found" });
    let b = await findTicketByToken(token);
    if (!b) return res.status(404).json({ error: "Not found" });

    const adminAccess = isAdminRequest(req);
    let ticketNumber = b.ticketNumber || "";
    if (!ticketNumber) {
      if (b.kind === "booking") {
        const guard = canIssueTicketForBooking(b);
        if (!guard.ok) return res.status(409).json({ error: guard.reason, code: "PAYMENT_REQUIRED" });
      }
      const issued = b.kind === "booking"
        ? await ensureTicketToken(b.id)
        : await ensureManualTicketToken(b.id);
      if (issued) {
        ticketNumber = issued.ticketNumber;
        b = { ...b, ticketNumber: issued.ticketNumber, ticketToken: issued.token };
      }
    }

    const sigOk = checkSig({ id: b.id, ticketNumber }, token, req.query.sig);
    const fullAccess = adminAccess || sigOk;

    const settingsRows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      if (PUBLIC_SETTING_KEYS.has(row.key)) settings[row.key] = row.value || "";
    }
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    const pdfAvailable = fs.existsSync(pdfPath);

    if (!fullAccess) {
      // Token-only access: enough to render the holder's own ticket but no
      // notes / supervisor / pickup info — those are admin- or sig-gated.
      const publicSignature = ticketNumber
        ? signTicket({ bookingId: b.id, ticketToken: token, ticketNumber })
        : "";
      return res.json({
        id: b.id,
        ticketToken: b.ticketToken,
        ticketNumber,
        ticketSignature: publicSignature,
        ticketUsedAt: b.ticketUsedAt,
        ticketUsedBy: null,
        name: firstNameOnly(b.name),
        phone: maskPhone(b.phone),
        packageId: b.packageId,
        packageName: b.packageName,
        packageNameAr: b.packageNameAr,
        date: b.date,
        adults: b.adults,
        children: b.children,
        infants: b.infants,
        notes: "",
        currency: b.currency,
        priceAtBooking: b.priceAtBooking,
        remainingBalance: b.remainingBalance,
        status: b.status,
        meetingTime: b.meetingTime,
        pickupLocation: "",
        pickupLocationAr: "",
        supervisorName: "",
        supervisorPhone: "",
        issuedAt: b.ticketIssuedAt || b.updatedAt,
        createdAt: b.createdAt,
        pdfAvailable: false,
        pdfUrl: null,
        settings,
      });
    }

    const signature = ticketNumber
      ? signTicket({ bookingId: b.id, ticketToken: token, ticketNumber })
      : "";

    return res.json({
      id: b.id,
      ticketToken: b.ticketToken,
      ticketNumber,
      ticketSignature: signature,
      ticketUsedAt: b.ticketUsedAt,
      ticketUsedBy: b.ticketUsedBy,
      name: b.name,
      phone: b.phone,
      packageId: b.packageId,
      packageName: b.packageName,
      packageNameAr: b.packageNameAr,
      date: b.date,
      adults: b.adults,
      children: b.children,
      infants: b.infants,
      notes: b.notes,
      currency: b.currency,
      priceAtBooking: b.priceAtBooking,
      remainingBalance: b.remainingBalance,
      status: b.status,
      meetingTime: b.meetingTime,
      pickupLocation: b.pickupLocation,
      pickupLocationAr: b.pickupLocationAr,
      supervisorName: b.supervisorName,
      supervisorPhone: b.supervisorPhone,
      issuedAt: b.ticketIssuedAt || b.updatedAt,
      createdAt: b.createdAt,
      pdfAvailable,
      pdfUrl: pdfAvailable
        ? `/api/tickets/${token}.pdf${signature ? `?sig=${encodeURIComponent(signature)}` : ""}`
        : null,
      settings,
    });
  } catch (err) {
    console.error("[tickets.json] error:", err);
    return res.status(500).json({ error: "Failed to load ticket" });
  }
});

router.post("/admin/tickets/:token/use", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(400).json({ error: "Invalid token" });
    const result = await db.transaction(async (tx) => {
      const [bookingRow] = await tx
        .select({ id: bookings.id, status: bookings.status, ticketUsedAt: bookings.ticketUsedAt })
        .from(bookings)
        .where(eq(bookings.ticketToken, token))
        .for("update");
      if (bookingRow) {
        if (bookingRow.status === "cancelled") return { error: "cancelled" as const, status: "cancelled" };
        if (bookingRow.status === "completed") return { error: "completed" as const, status: "completed" };
        if (bookingRow.ticketUsedAt) {
          return { already: true, ticketUsedAt: bookingRow.ticketUsedAt, status: bookingRow.status, kind: "booking" as const };
        }
        const adminUser = (req as unknown as { admin?: { username?: string } }).admin?.username || "admin";
        const usedAt = new Date();
        const nextStatus = bookingRow.status === "confirmed" ? "confirmed" : "client_confirmed";
        await tx.update(bookings)
          .set({ status: nextStatus, ticketUsedAt: usedAt, ticketUsedBy: adminUser, updatedAt: usedAt })
          .where(eq(bookings.id, bookingRow.id));
        return { id: bookingRow.id, ticketUsedAt: usedAt, ticketUsedBy: adminUser, status: nextStatus, kind: "booking" as const };
      }

      const [manualRow] = await tx
        .select({ id: manualTickets.id, status: manualTickets.status, ticketUsedAt: manualTickets.ticketUsedAt })
        .from(manualTickets)
        .where(eq(manualTickets.ticketToken, token))
        .for("update");
      if (!manualRow) return { error: "not_found" as const };
      if (manualRow.status === "cancelled") return { error: "cancelled" as const, status: "cancelled" };
      if (manualRow.status === "completed") return { error: "completed" as const, status: "completed" };
      if (manualRow.ticketUsedAt) {
        return { already: true, ticketUsedAt: manualRow.ticketUsedAt, status: manualRow.status, kind: "manual" as const };
      }
      const adminUser = (req as unknown as { admin?: { username?: string } }).admin?.username || "admin";
      const usedAt = new Date();
      const nextStatus = manualRow.status === "confirmed" ? "confirmed" : "client_confirmed";
      await tx.update(manualTickets)
        .set({ status: nextStatus, ticketUsedAt: usedAt, ticketUsedBy: adminUser, updatedAt: usedAt })
        .where(eq(manualTickets.id, manualRow.id));
      return { id: manualRow.id, ticketUsedAt: usedAt, ticketUsedBy: adminUser, status: nextStatus, kind: "manual" as const };
    });

    if ("error" in result) {
      if (result.error === "not_found") return res.status(404).json({ error: "Booking not found" });
      if (result.error === "cancelled") {
        return res.status(409).json({ error: "Booking is cancelled", status: "cancelled" });
      }
      return res.status(409).json({ error: "Booking is completed", status: "completed" });
    }
    if ("already" in result && result.already) {
      return res.json({
        ok: true,
        already: true,
        status: "used",
        bookingStatus: result.status,
        ticketUsedAt: result.ticketUsedAt,
      });
    }
    await recordAudit(req, {
      action: "ticket.mark_used",
      entity: result.kind === "manual" ? "manual_ticket" : "booking",
      entityId: result.id,
    });
    return res.json({
      ok: true,
      already: false,
      status: "used",
      bookingStatus: result.status,
      ticketUsedAt: result.ticketUsedAt,
      ticketUsedBy: result.ticketUsedBy,
    });
  } catch (err) {
    console.error("[tickets.use] error:", err);
    return res.status(500).json({ error: "Failed to mark ticket as used" });
  }
});

function escapeXml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

router.get("/admin/tickets/:token/image.svg", authMiddleware, async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(400).json({ error: "Invalid token" });
    const b = await findTicketByToken(token);
    if (!b) return res.status(404).json({ error: "Not found" });
    const ticketNumber = b.ticketNumber || "";
    const verifyUrl = `${(req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol}://${(req.headers["x-forwarded-host"] as string) || req.headers.host || ""}/verify/${token}`;
    const date = b.date ? String(b.date).slice(0, 10) : "";
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1b2a"/>
      <stop offset="100%" stop-color="#1b263b"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect x="40" y="40" width="520" height="820" rx="24" fill="rgba(255,255,255,0.04)" stroke="#00AAFF" stroke-width="2"/>
  <text x="300" y="120" text-anchor="middle" fill="#00AAFF" font-family="Arial, sans-serif" font-size="28" font-weight="bold">DR TRAVEL</text>
  <text x="300" y="160" text-anchor="middle" fill="#ffffff" font-family="Arial, sans-serif" font-size="18">BOARDING TICKET</text>
  <line x1="80" y1="200" x2="520" y2="200" stroke="#00AAFF" stroke-opacity="0.5"/>
  <text x="80" y="260" fill="#8b9bab" font-family="Arial, sans-serif" font-size="14">TICKET NUMBER</text>
  <text x="80" y="295" fill="#ffffff" font-family="monospace" font-size="26" font-weight="bold">${escapeXml(ticketNumber)}</text>
  <text x="80" y="360" fill="#8b9bab" font-family="Arial, sans-serif" font-size="14">PASSENGER</text>
  <text x="80" y="395" fill="#ffffff" font-family="Arial, sans-serif" font-size="22">${escapeXml((b.name || "").split(" ")[0])}</text>
  <text x="80" y="460" fill="#8b9bab" font-family="Arial, sans-serif" font-size="14">PACKAGE</text>
  <text x="80" y="495" fill="#ffffff" font-family="Arial, sans-serif" font-size="20">${escapeXml(String(b.packageName || "").slice(0, 40))}</text>
  <text x="80" y="560" fill="#8b9bab" font-family="Arial, sans-serif" font-size="14">DEPARTURE</text>
  <text x="80" y="595" fill="#ffffff" font-family="Arial, sans-serif" font-size="20">${escapeXml(date)}</text>
  <text x="80" y="660" fill="#8b9bab" font-family="Arial, sans-serif" font-size="14">PASSENGERS</text>
  <text x="80" y="695" fill="#ffffff" font-family="Arial, sans-serif" font-size="20">${(b.adults || 0) + (b.children || 0) + (b.infants || 0)} pax</text>
  <text x="300" y="800" text-anchor="middle" fill="#8b9bab" font-family="monospace" font-size="11">${escapeXml(verifyUrl)}</text>
  <text x="300" y="830" text-anchor="middle" fill="#00AAFF" font-family="Arial, sans-serif" font-size="13">Scan or visit URL above to verify</text>
</svg>`;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    return res.send(svg);
  } catch (err) {
    console.error("[ticket-image] error:", err);
    return res.status(500).json({ error: "Failed to render ticket image" });
  }
});

router.post(
  "/admin/bookings/:id/ticket-pdf",
  authMiddleware,
  requireRole("operator"),
  express.raw({ type: "application/pdf", limit: "30mb" }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!b) return res.status(404).json({ error: "Booking not found" });
      const guard = canIssueTicketForBooking(b);
      if (!guard.ok) return res.status(409).json({ error: guard.reason, code: "PAYMENT_REQUIRED" });
      const issued = await ensureTicketToken(id);
      if (!issued) return res.status(500).json({ error: "Token issuance failed" });
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 1000) {
        return res.status(400).json({ error: "PDF body missing or too small" });
      }
      if (body.slice(0, 4).toString("utf8") !== "%PDF") {
        return res.status(400).json({ error: "Invalid PDF file" });
      }
      ensureDir();
      const pdfPath = path.join(TICKETS_DIR, `${issued.token}.pdf`);
      fs.writeFileSync(pdfPath, body);
      await recordAudit(req, {
        action: "ticket.pdf_upload",
        entity: "booking",
        entityId: id,
        metadata: { bytes: body.length },
      });
      return res.json({
        ok: true,
        token: issued.token,
        ticketNumber: issued.ticketNumber,
        signature: issued.signature,
        url: `/api/tickets/${issued.token}.pdf?sig=${encodeURIComponent(issued.signature)}`,
        bytes: body.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to store ticket PDF";
      return res.status(500).json({ error: msg });
    }
  }
);

export default router;
