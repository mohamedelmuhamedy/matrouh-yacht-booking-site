import type { Request } from "express";
import { db, adminAuditLog } from "@workspace/db";

export interface AuditEntry {
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    const admin = (req as unknown as { admin?: { username?: string } }).admin;
    await db.insert(adminAuditLog).values({
      adminUsername: admin?.username ?? "",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
      ip: (req.ip ?? "").slice(0, 64),
      userAgent: String(req.headers["user-agent"] ?? "").slice(0, 256),
    });
  } catch (err) {
    console.error("[audit] failed:", err);
  }
}
