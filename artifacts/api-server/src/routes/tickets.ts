import { Router } from "express";
import { db, bookings, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import { authMiddleware } from "../middleware/auth";
import {
  generateTicketNumber,
  signTicket,
  verifyTicketSignature,
  verifyTicketNumberChecksum,
} from "../lib/ticketSecurity";

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

export async function ensureTicketToken(bookingId: number): Promise<IssuedTicket | null> {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) return null;

  let token = b.ticketToken && b.ticketToken.length >= 16 ? b.ticketToken : null;
  let ticketNumber = b.ticketNumber || null;

  const updates: Record<string, unknown> = {};
  if (!token) {
    token = crypto.randomBytes(16).toString("hex");
    updates.ticketToken = token;
  }
  if (!ticketNumber) {
    ticketNumber = generateTicketNumber(bookingId, token);
    updates.ticketNumber = ticketNumber;
  }
  if (!b.ticketIssuedAt && (updates.ticketToken || updates.ticketNumber)) {
    updates.ticketIssuedAt = new Date();
  }
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(bookings).set(updates).where(eq(bookings.id, bookingId));
  }

  const signature = signTicket({ bookingId, ticketToken: token, ticketNumber });
  return { token, ticketNumber, signature };
}

const PUBLIC_SETTING_KEYS = new Set([
  "brand_name", "brand_short_name", "brand_tagline_ar", "brand_tagline_en",
  "logo_url", "phone_number", "whatsapp_number", "instagram_url", "facebook_url",
  "address_ar", "address_en", "maps_url",
  "card_display_name_ar", "card_display_name_en",
]);

// ── Public verify endpoint (lightweight, signature-checked) ──────────────
router.get("/tickets/verify/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    const sig = String(req.query.sig || "").trim().toUpperCase();
    if (!token || token.length < 16) {
      return res.json({ status: "invalid", reason: "bad_token" });
    }
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b || !b.ticketNumber) {
      return res.json({ status: "invalid", reason: "not_found" });
    }
    if (!verifyTicketNumberChecksum(b.ticketNumber)) {
      return res.json({ status: "invalid", reason: "bad_number" });
    }
    const sigOk = verifyTicketSignature(
      { bookingId: b.id, ticketToken: token, ticketNumber: b.ticketNumber },
      sig,
    );
    if (!sigOk) {
      return res.json({ status: "invalid", reason: "bad_signature" });
    }

    let derivedStatus: "valid" | "used" | "cancelled" | "invalid" = "valid";
    if (b.status === "cancelled") derivedStatus = "cancelled";
    else if (b.ticketUsedAt) derivedStatus = "used";
    else if (b.status !== "confirmed") {
      derivedStatus = "invalid";
    }

    return res.json({
      status: derivedStatus,
      ticket: {
        bookingId: b.id,
        firstName: (b.name || "").split(/\s+/)[0] || "",
        packageName: b.packageName,
        packageNameAr: b.packageNameAr,
        date: b.date,
        adults: b.adults,
        children: b.children,
        infants: b.infants,
        ticketNumber: b.ticketNumber,
        bookingStatus: b.status,
        usedAt: b.ticketUsedAt,
        issuedAt: b.ticketIssuedAt || b.updatedAt,
      },
    });
  } catch (err) {
    console.error("[tickets.verify] error:", err);
    return res.status(500).json({ status: "invalid", reason: "server_error" });
  }
});

// Public PDF download — declared BEFORE the JSON route so Express does not
// match `.pdf` as part of the :token param.
router.get("/tickets/:token.pdf", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(404).end();
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).end();
    if (b.status !== "confirmed") return res.status(403).end();
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "PDF not yet generated" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="dr-travel-ticket-${b.id}.pdf"`);
    res.setHeader("Cache-Control", "private, max-age=300");
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
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Not found" });
    if (b.status !== "confirmed") {
      return res.status(403).json({ error: "Ticket not yet available" });
    }
    const settingsRows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      if (PUBLIC_SETTING_KEYS.has(row.key)) settings[row.key] = row.value || "";
    }
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    const pdfAvailable = fs.existsSync(pdfPath);

    let ticketNumber = b.ticketNumber || "";
    if (!ticketNumber) {
      const issued = await ensureTicketToken(b.id);
      if (issued) ticketNumber = issued.ticketNumber;
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
      status: b.status,
      meetingTime: b.meetingTime,
      pickupLocation: b.pickupLocation,
      pickupLocationAr: b.pickupLocationAr,
      supervisorName: b.supervisorName,
      supervisorPhone: b.supervisorPhone,
      issuedAt: b.ticketIssuedAt || b.updatedAt,
      createdAt: b.createdAt,
      pdfAvailable,
      pdfUrl: pdfAvailable ? `/api/tickets/${token}.pdf` : null,
      settings,
    });
  } catch (err) {
    console.error("[tickets.json] error:", err);
    return res.status(500).json({ error: "Failed to load ticket" });
  }
});

// Admin marks a ticket as used at the gate
router.post("/admin/tickets/:token/use", authMiddleware, async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(400).json({ error: "Invalid token" });
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Booking not found" });
    if (b.status === "cancelled") {
      return res.status(409).json({ error: "Booking is cancelled", status: "cancelled" });
    }
    if (b.status !== "confirmed") {
      return res.status(409).json({ error: "Booking not confirmed", status: b.status });
    }
    if (b.ticketUsedAt) {
      return res.json({
        ok: true,
        already: true,
        status: "used",
        ticketUsedAt: b.ticketUsedAt,
        ticketUsedBy: b.ticketUsedBy,
      });
    }
    const adminUser = (req as any).admin?.username || "admin";
    const usedAt = new Date();
    await db.update(bookings)
      .set({ ticketUsedAt: usedAt, ticketUsedBy: adminUser, updatedAt: usedAt })
      .where(eq(bookings.id, b.id));
    return res.json({ ok: true, already: false, status: "used", ticketUsedAt: usedAt, ticketUsedBy: adminUser });
  } catch (err) {
    console.error("[tickets.use] error:", err);
    return res.status(500).json({ error: "Failed to mark ticket as used" });
  }
});

// Admin uploads/refreshes generated PDF for a booking
router.post(
  "/admin/bookings/:id/ticket-pdf",
  authMiddleware,
  express.raw({ type: "application/pdf", limit: "10mb" }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!b) return res.status(404).json({ error: "Booking not found" });
      if (b.status !== "confirmed") {
        return res.status(400).json({ error: "Booking must be confirmed first" });
      }
      const issued = await ensureTicketToken(id);
      if (!issued) return res.status(500).json({ error: "Token issuance failed" });
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 1000) {
        return res.status(400).json({ error: "PDF body missing or too small" });
      }
      // Validate PDF magic header
      if (body.slice(0, 4).toString("utf8") !== "%PDF") {
        return res.status(400).json({ error: "Invalid PDF file" });
      }
      ensureDir();
      const pdfPath = path.join(TICKETS_DIR, `${issued.token}.pdf`);
      fs.writeFileSync(pdfPath, body);
      return res.json({
        ok: true,
        token: issued.token,
        ticketNumber: issued.ticketNumber,
        signature: issued.signature,
        url: `/api/tickets/${issued.token}.pdf`,
        bytes: body.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to store ticket PDF";
      return res.status(500).json({ error: msg });
    }
  }
);

export default router;
