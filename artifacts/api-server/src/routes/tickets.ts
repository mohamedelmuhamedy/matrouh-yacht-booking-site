import { Router } from "express";
import { db, bookings, siteSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

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
      issuedAt: b.updatedAt,
      createdAt: b.createdAt,
      settings,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load ticket" });
  }
});

export default router;
