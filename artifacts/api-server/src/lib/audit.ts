import type { Request } from "express";
import { db, adminAuditLog } from "@workspace/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
  before?: unknown;
  after?: unknown;
}

export async function recordAudit(
  req: Request,
  entry: AuditEntry,
  tx?: Tx,
): Promise<void> {
  const admin = (req as unknown as { admin?: { username?: string; userId?: number } }).admin;
  const merged: Record<string, unknown> = { ...(entry.metadata ?? {}) };
  if (typeof entry.before !== "undefined") merged.before = entry.before;
  if (typeof entry.after !== "undefined") merged.after = entry.after;

  const target = tx ?? db;
  try {
    await target.insert(adminAuditLog).values({
      adminUsername: admin?.username ?? "",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: Object.keys(merged).length ? merged : null,
      ip: (req.ip ?? "").slice(0, 64),
      userAgent: String(req.headers["user-agent"] ?? "").slice(0, 256),
    });
  } catch (err) {
    console.error(
      `[audit] failed to record action=${entry.action} entity=${entry.entity}`,
      err,
    );
    throw err;
  }
}
