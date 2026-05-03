import { Router } from "express";
import { db, abandonedCarts, bookings } from "@workspace/db";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

function normalizePhone(raw: string): string {
  return String(raw || "").replace(/[\s\-().]/g, "");
}

router.get("/admin/abandoned-carts", authMiddleware, async (req, res) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : "active";
    const filters = [];
    if (status && status !== "all") filters.push(eq(abandonedCarts.status, status));
    const rows = await db
      .select()
      .from(abandonedCarts)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(abandonedCarts.updatedAt));
    return res.json(rows);
  } catch (err) {
    console.error("[abandoned-carts] list:", err);
    return res.status(500).json({ error: "Failed to list" });
  }
});

router.put("/admin/abandoned-carts/:id", authMiddleware, requireRole("operator"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.status === "string" && ["active", "contacted", "recovered", "lost"].includes(b.status)) {
      patch.status = b.status;
      if (b.status === "contacted") patch.contactedAt = new Date();
    }
    if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 500);
    const [row] = await db.update(abandonedCarts).set(patch).where(eq(abandonedCarts.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    return res.json(row);
  } catch (err) {
    console.error("[abandoned-carts] update:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/abandoned-carts/:id", authMiddleware, requireRole("admin"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    await db.delete(abandonedCarts).where(eq(abandonedCarts.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Stats summary
router.get("/admin/abandoned-carts/stats", authMiddleware, async (_req, res) => {
  try {
    const rows = await db.select({
      status: abandonedCarts.status,
      count: sql<number>`COUNT(*)`,
      totalValue: sql<number>`COALESCE(SUM(${abandonedCarts.estimatedValue}), 0)`,
    }).from(abandonedCarts).groupBy(abandonedCarts.status);
    const byStatus: Record<string, { count: number; totalValue: number }> = {};
    rows.forEach(r => {
      byStatus[r.status] = { count: Number(r.count), totalValue: Number(r.totalValue) };
    });
    return res.json({ byStatus });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

// Public: track an abandoned cart (debounced from frontend)
router.post("/abandoned-carts/track", async (req, res) => {
  try {
    const b = req.body ?? {};
    const sessionKey = String(b.sessionKey ?? "").trim().slice(0, 64);
    if (!sessionKey || sessionKey.length < 8) return res.status(400).json({ error: "Invalid session" });

    const name = String(b.name ?? "").trim().slice(0, 200);
    const phoneRaw = String(b.phone ?? "").trim().slice(0, 32);
    const phone = normalizePhone(phoneRaw);
    const packageId = b.packageId ? Number.parseInt(String(b.packageId), 10) || null : null;
    const packageName = String(b.packageName ?? "").trim().slice(0, 200);
    const date = String(b.date ?? "").trim().slice(0, 64);
    const adults = Math.max(1, Math.min(50, Number.parseInt(String(b.adults ?? 1), 10) || 1));
    const children = Math.max(0, Math.min(50, Number.parseInt(String(b.children ?? 0), 10) || 0));
    const estimatedValue = Math.max(0, Number.parseInt(String(b.estimatedValue ?? 0), 10) || 0);

    // Need at least phone or name to be useful for recovery
    if (!phone && !name) return res.json({ skipped: true });

    // Upsert by session_key
    const [existing] = await db.select().from(abandonedCarts).where(eq(abandonedCarts.sessionKey, sessionKey));
    if (existing) {
      const [row] = await db.update(abandonedCarts).set({
        name: name || existing.name,
        phone: phone || existing.phone,
        packageId: packageId ?? existing.packageId,
        packageName: packageName || existing.packageName,
        date: date || existing.date,
        adults,
        children,
        estimatedValue: estimatedValue || existing.estimatedValue,
        // Don't reset status if already contacted/recovered
        status: existing.status === "active" ? "active" : existing.status,
        updatedAt: new Date(),
      }).where(eq(abandonedCarts.id, existing.id)).returning();
      return res.json({ id: row.id, updated: true });
    }
    const [row] = await db.insert(abandonedCarts).values({
      sessionKey, name, phone, packageId, packageName, date, adults, children, estimatedValue, status: "active",
    }).returning();
    return res.json({ id: row.id, created: true });
  } catch (err) {
    console.error("[abandoned-carts] track:", err);
    return res.status(500).json({ error: "Track failed" });
  }
});

// Internal: mark cart as recovered when a matching booking succeeds
export async function markCartRecovered(opts: {
  sessionKey?: string;
  phone?: string;
  packageId?: number | null;
  date?: string;
  bookingId: number;
}): Promise<void> {
  try {
    const phone = opts.phone ? normalizePhone(opts.phone) : "";
    if (opts.sessionKey) {
      await db.update(abandonedCarts).set({
        status: "recovered",
        recoveredBookingId: opts.bookingId,
        updatedAt: new Date(),
      }).where(and(
        eq(abandonedCarts.sessionKey, opts.sessionKey),
        ne(abandonedCarts.status, "recovered"),
      ));
      return;
    }
    if (phone && opts.date) {
      await db.update(abandonedCarts).set({
        status: "recovered",
        recoveredBookingId: opts.bookingId,
        updatedAt: new Date(),
      }).where(and(
        eq(abandonedCarts.phone, phone),
        eq(abandonedCarts.date, opts.date),
        ne(abandonedCarts.status, "recovered"),
      ));
    }
  } catch (err) {
    console.error("[abandoned-carts] mark recovered:", err);
  }
}

export default router;
