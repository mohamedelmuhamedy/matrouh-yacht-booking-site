import { Router } from "express";
import { db, bookings, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, getJwtSecret } from "../middleware/auth";
import {
  generateTicketNumber,
  signTicket,
  verifyTicketSignature,
  verifyTicketNumberChecksum,
} from "../lib/ticketSecurity";

// Strict admin detection — only tokens that look like admin login tokens
// (carry numeric `userId` + `username` AND have no `kind` field) count.
// Visitor / referral tokens are signed with the same JWT_SECRET but carry
// `kind: "visitor"`; treating them as admin would leak customer phone numbers.
function isAdminRequest(req: express.Request): boolean {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return false;
  try {
    const decoded = jwt.verify(h.slice(7), getJwtSecret()) as Record<string, unknown>;
    if (!decoded || typeof decoded !== "object") return false;
    if ("kind" in decoded && decoded.kind !== "admin") return false;
    return typeof decoded.userId === "number" && typeof decoded.username === "string";
  } catch {
    return false;
  }
}

function maskPhone(phone: string | null | undefined): string {
  const p = String(phone ?? "");
  if (p.length < 4) return p;
  return p.slice(0, 2) + "*".repeat(Math.max(0, p.length - 4)) + p.slice(-2);
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

// Caller may pass a Drizzle transaction handle (`tx`) so the read+update
// happen inside the caller's transaction; otherwise we use the global `db`.
// Type matches what `db.transaction(async (tx) => ...)` hands back.
type DbLike = typeof db;
export async function ensureTicketToken(
  bookingId: number,
  txArg?: DbLike,
): Promise<IssuedTicket | null> {
  const conn: DbLike = txArg ?? db;
  const [b] = await conn.select().from(bookings).where(eq(bookings.id, bookingId));
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
    await conn.update(bookings).set(updates).where(eq(bookings.id, bookingId));
  }

  const signature = signTicket({ bookingId, ticketToken: token, ticketNumber });
  return { token, ticketNumber, signature };
}

const PUBLIC_SETTING_KEYS = new Set([
  "brand_name", "brand_short_name", "brand_tagline_ar", "brand_tagline_en",
  "logo_url", "phone_number", "whatsapp_number", "instagram_url", "facebook_url",
  "address_ar", "address_en", "maps_url",
  "card_display_name_ar", "card_display_name_en",
  // Admin-customizable WhatsApp templates for the "send ticket image" flow
  // on the bookings admin page (BookingsPage.tsx -> sendTicketImageWhatsApp).
  "wa_image_message_ar", "wa_image_message_en",
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
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: "PDF not yet generated" });
    const stat = fs.statSync(pdfPath);
    const disposition = String(req.query.download || "") === "1" ? "attachment" : "inline";
    const safeName = b.ticketNumber || `dr-travel-ticket-${b.id}`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(stat.size));
    res.setHeader("Content-Disposition", `${disposition}; filename="${safeName}.pdf"`);
    res.setHeader("Cache-Control", "private, max-age=300");
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
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).json({ error: "Not found" });

    // PII redaction: a leaked ticket URL should not expose the customer's
    // full phone number or admin notes. Admins (with a valid JWT) get the
    // raw record; everyone else gets a masked phone and no admin notes.
    const adminAccess = isAdminRequest(req);
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
      phone: adminAccess ? b.phone : maskPhone(b.phone),
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
  express.raw({ type: "application/pdf", limit: "30mb" }),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
      const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
      if (!b) return res.status(404).json({ error: "Booking not found" });
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
