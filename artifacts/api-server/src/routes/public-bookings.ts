import { Router } from "express";
import { db, bookings } from "@workspace/db";
import { createReferralRewardIfNeeded } from "./admin-rewards";

const router = Router();

router.post("/bookings", async (req, res) => {
  try {
    const { name, phone, packageId, packageName, packageNameAr, date, adults, children, infants, notes, currency, priceAtBooking, referralCode } = req.body;
    if (!name || !phone || !date) {
      return res.status(400).json({ error: "Name, phone, and date are required" });
    }
    const [booking] = await db.insert(bookings).values({
      name, phone,
      packageId: packageId ? parseInt(packageId) : null,
      packageName: packageName || "",
      packageNameAr: packageNameAr || "",
      date, adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
      notes: notes || "", currency: currency || "EGP",
      priceAtBooking: priceAtBooking ? parseInt(priceAtBooking) : null,
      referralCode: (referralCode || "").toUpperCase().trim(),
      status: "new"
    }).returning();

    if (referralCode) {
      await createReferralRewardIfNeeded(booking.id, (referralCode || "").toUpperCase().trim(), name, packageName || packageNameAr || "");
    }

    return res.status(201).json({ success: true, id: booking.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to create booking" });
  }
});

export default router;
