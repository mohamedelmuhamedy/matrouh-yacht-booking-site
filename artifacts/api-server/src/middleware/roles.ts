import { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export type Role = "super" | "admin" | "operator" | "viewer";

const ROLE_RANK: Record<string, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
  super: 4,
};

export async function getCurrentRole(req: Request): Promise<Role | null> {
  const admin = (req as any).admin;
  if (!admin?.userId) return null;
  const [u] = await db.select().from(adminUsers).where(eq(adminUsers.id, admin.userId));
  if (!u || !u.isActive) return null;
  return (u.role as Role) || "viewer";
}

export function requireRole(min: Role) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = await getCurrentRole(req);
      if (!role) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      if ((ROLE_RANK[role] || 0) < (ROLE_RANK[min] || 0)) {
        res.status(403).json({ error: "Insufficient privileges", requiredRole: min });
        return;
      }
      (req as any).adminRole = role;
      next();
    } catch {
      res.status(500).json({ error: "Role check failed" });
    }
  };
}
