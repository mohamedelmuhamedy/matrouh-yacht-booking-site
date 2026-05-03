import { Router } from "express";
import { db, adminAuditLog } from "@workspace/db";
import { and, desc, eq, lte, gte, type SQL } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/admin/audit", authMiddleware, async (req, res) => {
  try {
    const limitRaw = Number.parseInt(String(req.query.limit ?? "100"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(500, limitRaw)) : 100;

    const filters: SQL[] = [];
    if (typeof req.query.action === "string" && req.query.action.trim()) {
      filters.push(eq(adminAuditLog.action, req.query.action.trim()));
    }
    if (typeof req.query.entity === "string" && req.query.entity.trim()) {
      filters.push(eq(adminAuditLog.entity, req.query.entity.trim()));
    }
    if (typeof req.query.entityId === "string" && req.query.entityId.trim()) {
      const n = Number.parseInt(req.query.entityId, 10);
      if (Number.isFinite(n)) filters.push(eq(adminAuditLog.entityId, n));
    }
    if (typeof req.query.since === "string" && req.query.since.trim()) {
      const d = new Date(req.query.since);
      if (!isNaN(d.getTime())) filters.push(gte(adminAuditLog.createdAt, d));
    }
    if (typeof req.query.until === "string" && req.query.until.trim()) {
      const d = new Date(req.query.until);
      if (!isNaN(d.getTime())) filters.push(lte(adminAuditLog.createdAt, d));
    }

    const where = filters.length ? and(...filters) : undefined;
    const rows = await db
      .select()
      .from(adminAuditLog)
      .where(where)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit);
    return res.json({ rows, count: rows.length, limit });
  } catch (err) {
    console.error("[admin-audit] error:", err);
    return res.status(500).json({ error: "Failed to load audit log" });
  }
});

export default router;
