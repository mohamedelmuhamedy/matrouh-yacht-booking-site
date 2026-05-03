import { Router } from "express";
import { db, bookings, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import express from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const TICKETS_DIR = path.resolve(process.cwd(), "data", "tickets");
function ensureDir() {
  try { fs.mkdirSync(TICKETS_DIR, { recursive: true }); } catch {}
}
ensureDir();

export async function ensureTicketToken(bookingId: number): Promise<string | null> {
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (!b) return null;
  if (b.ticketToken && b.ticketToken.length >= 16) return b.ticketToken;
  const token = crypto.randomBytes(16).toString("hex");
  await db.update(bookings).set({ ticketToken: token, updatedAt: new Date() }).where(eq(bookings.id, bookingId));
  return token;
}

const PUBLIC_SETTING_KEYS = new Set([
  "brand_name", "brand_short_name", "brand_tagline_ar", "brand_tagline_en",
  "logo_url", "phone_number", "whatsapp_number", "instagram_url", "facebook_url",
  "address_ar", "address_en", "maps_url",
  "card_display_name_ar", "card_display_name_en",
]);

// Public PDF download — declared BEFORE the JSON route so Express does not
// match `.pdf` as part of the :token param.
router.get("/tickets/:token.pdf", async (req, res) => {
  try {
    const token = String(req.params.token || "").trim();
    if (!token || token.length < 16) return res.status(404).end();
    const [b] = await db.select().from(bookings).where(eq(bookings.ticketToken, token));
    if (!b) return res.status(404).end();
    if (b.status !== "confirmed" && b.status !== "completed") return res.status(403).end();
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
    if (b.status !== "confirmed" && b.status !== "completed") {
      return res.status(403).json({ error: "Ticket not yet available" });
    }
    const settingsRows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      if (PUBLIC_SETTING_KEYS.has(row.key)) settings[row.key] = row.value || "";
    }
    const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
    const pdfAvailable = fs.existsSync(pdfPath);
    return res.json({
      id: b.id,
      ticketToken: b.ticketToken,
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
      issuedAt: b.updatedAt,
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
      if (b.status !== "confirmed" && b.status !== "completed") {
        return res.status(400).json({ error: "Booking must be confirmed first" });
      }
      const token = await ensureTicketToken(id);
      if (!token) return res.status(500).json({ error: "Token issuance failed" });
      const body = req.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length < 1000) {
        return res.status(400).json({ error: "PDF body missing or too small" });
      }
      // Validate PDF magic header
      if (body.slice(0, 4).toString("utf8") !== "%PDF") {
        return res.status(400).json({ error: "Invalid PDF file" });
      }
      ensureDir();
      const pdfPath = path.join(TICKETS_DIR, `${token}.pdf`);
      fs.writeFileSync(pdfPath, body);
      return res.json({ ok: true, token, url: `/api/tickets/${token}.pdf`, bytes: body.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to store ticket PDF";
      return res.status(500).json({ error: msg });
    }
  }
);

export default router;
