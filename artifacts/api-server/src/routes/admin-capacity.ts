import { Router } from "express";
import { db, packageCapacity, bookings } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.get("/admin/capacity", authMiddleware, async (req, res) => {
  try {
    const filters = [];
    if (typeof req.query.packageId === "string") {
      const pid = Number.parseInt(req.query.packageId, 10);
      if (Number.isFinite(pid)) filters.push(eq(packageCapacity.packageId, pid));
    }
    const rows = await db.select().from(packageCapacity)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(packageCapacity.date));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to list" });
  }
});

router.post("/admin/capacity", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const b = req.body ?? {};
    const packageId = Number.parseInt(String(b.packageId), 10);
    const date = String(b.date ?? "").trim().slice(0, 64);
    const maxSeats = Math.max(0, Number.parseInt(String(b.maxSeats ?? 0), 10) || 0);
    const notes = String(b.notes ?? "").slice(0, 500);
    if (!Number.isFinite(packageId) || packageId <= 0) return res.status(400).json({ error: "packageId مطلوب" });
    if (!date) return res.status(400).json({ error: "التاريخ مطلوب" });

    // Upsert
    const existing = await db.select().from(packageCapacity).where(and(
      eq(packageCapacity.packageId, packageId),
      eq(packageCapacity.date, date),
    ));
    if (existing.length > 0) {
      const [row] = await db.update(packageCapacity)
        .set({ maxSeats, notes, updatedAt: new Date() })
        .where(eq(packageCapacity.id, existing[0].id))
        .returning();
      return res.json(row);
    }
    const [row] = await db.insert(packageCapacity).values({ packageId, date, maxSeats, notes }).returning();
    return res.status(201).json(row);
  } catch (err) {
    console.error("[capacity] create:", err);
    return res.status(500).json({ error: "Failed to upsert" });
  }
});

router.delete("/admin/capacity/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(packageCapacity).where(eq(packageCapacity.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Public availability check
router.get("/availability", async (req, res) => {
  try {
    const packageId = Number.parseInt(String(req.query.packageId ?? ""), 10);
    const date = String(req.query.date ?? "").trim().slice(0, 64);
    if (!Number.isFinite(packageId) || !date) return res.status(400).json({ error: "packageId and date required" });

    const [cap] = await db.select().from(packageCapacity).where(and(
      eq(packageCapacity.packageId, packageId),
      eq(packageCapacity.date, date),
    ));
    if (!cap || cap.maxSeats <= 0) {
      return res.json({ unlimited: true, available: true });
    }

    const result = await db
      .select({ total: sql<number>`COALESCE(SUM(${bookings.adults} + ${bookings.children}), 0)` })
      .from(bookings)
      .where(and(
        eq(bookings.packageId, packageId),
        eq(bookings.date, date),
        sql`${bookings.status} NOT IN ('cancelled', 'payment_expired')`,
      ));
    const booked = Number(result[0]?.total ?? 0);
    const remaining = Math.max(0, cap.maxSeats - booked);
    return res.json({
      unlimited: false,
      maxSeats: cap.maxSeats,
      booked,
      remaining,
      available: remaining > 0,
    });
  } catch (err) {
    console.error("[availability] check:", err);
    return res.status(500).json({ error: "Check failed" });
  }
});

// Internal helper: returns null if unlimited/available, else error message
export async function checkCapacity(packageId: number, date: string, requested: number): Promise<{ ok: true } | { ok: false; reason: string; remaining: number }> {
  const [cap] = await db.select().from(packageCapacity).where(and(
    eq(packageCapacity.packageId, packageId),
    eq(packageCapacity.date, date),
  ));
  if (!cap || cap.maxSeats <= 0) return { ok: true };
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${bookings.adults} + ${bookings.children}), 0)` })
    .from(bookings)
    .where(and(
      eq(bookings.packageId, packageId),
      eq(bookings.date, date),
      sql`${bookings.status} NOT IN ('cancelled', 'payment_expired')`,
    ));
  const booked = Number(result[0]?.total ?? 0);
  const remaining = Math.max(0, cap.maxSeats - booked);
  if (remaining < requested) {
    return { ok: false, reason: `المقاعد المتاحة لهذا اليوم ${remaining} فقط`, remaining };
  }
  return { ok: true };
}

export default router;
