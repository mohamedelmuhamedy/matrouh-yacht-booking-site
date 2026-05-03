import { Router } from "express";
import { db, qrScans } from "@workspace/db";
import { gte, sql } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const SOURCE_MAX = 32;
const TARGET_MAX = 32;

function sanitizeShortId(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  // Allow alphanumerics, dash, underscore, dot — keeps logs safe & cardinality bounded.
  return value.trim().slice(0, max).replace(/[^a-zA-Z0-9._-]/g, "").toLowerCase();
}

// Public: lightweight scan record. Fire-and-forget from the share page.
// We deliberately do NOT persist user-agent or referer — only the channel tag —
// to keep the privacy claim shown to admins ("only the channel tag is kept") honest.
router.post("/share/scan", async (req, res) => {
  // Acknowledge first; never block the public /card load.
  res.status(204).end();

  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const source = sanitizeShortId(body.source ?? req.query.s, SOURCE_MAX);
    const target = sanitizeShortId(body.target ?? "card", TARGET_MAX) || "card";

    await db.insert(qrScans).values({ source, target });
  } catch (err) {
    console.error("[share/scan] failed to record scan", err);
  }
});

router.get("/admin/share/scan-stats", authMiddleware, async (_req, res) => {
  try {
    const now = new Date();
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrScans);

    const [last7Row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrScans)
      .where(gte(qrScans.createdAt, day7));

    const [last30Row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(qrScans)
      .where(gte(qrScans.createdAt, day30));

    const bySource = await db
      .select({
        source: qrScans.source,
        total: sql<number>`count(*)::int`,
        last7: sql<number>`count(*) filter (where ${qrScans.createdAt} >= ${day7})::int`,
        last30: sql<number>`count(*) filter (where ${qrScans.createdAt} >= ${day30})::int`,
      })
      .from(qrScans)
      .groupBy(qrScans.source)
      .orderBy(sql`count(*) desc`);

    const dailyRows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${qrScans.createdAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(qrScans)
      .where(gte(qrScans.createdAt, day30))
      .groupBy(sql`date_trunc('day', ${qrScans.createdAt})`)
      .orderBy(sql`date_trunc('day', ${qrScans.createdAt})`);

    return res.json({
      total: totalRow?.count ?? 0,
      last7: last7Row?.count ?? 0,
      last30: last30Row?.count ?? 0,
      bySource: bySource.map(r => ({
        source: r.source || "",
        total: r.total,
        last7: r.last7,
        last30: r.last30,
      })),
      daily: dailyRows,
    });
  } catch (err) {
    console.error("[admin/share/scan-stats]", err);
    return res.status(500).json({ error: "Failed to fetch scan stats" });
  }
});

export default router;
