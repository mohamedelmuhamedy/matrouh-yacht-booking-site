import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, adminUsers, adminUserPermissions } from "@workspace/db";
import { desc, eq, ne, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole, getCurrentRole } from "../middleware/roles";
import {
  ADMIN_PERMISSION_DEFINITIONS,
  sanitizeAssignablePermissions,
  getAdminAccess,
} from "../lib/adminPermissions";
import { recordAudit } from "../lib/audit";

const router = Router();

function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 50);
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, 200);
}

function publicUser(row: typeof adminUsers.$inferSelect, permissions: string[]) {
  const { passwordHash: _passwordHash, ...safe } = row as any;
  return {
    ...safe,
    isSuperAdmin: row.role === "super",
    permissions: row.role === "super" ? ADMIN_PERMISSION_DEFINITIONS.map((p) => p.key) : permissions,
  };
}

async function permissionsForUsers(userIds: number[]): Promise<Map<number, string[]>> {
  const out = new Map<number, string[]>();
  if (userIds.length === 0) return out;
  const rows = await db.select().from(adminUserPermissions);
  for (const row of rows) {
    if (!userIds.includes(row.userId)) continue;
    const arr = out.get(row.userId) ?? [];
    arr.push(row.permission);
    out.set(row.userId, arr);
  }
  return out;
}

async function emailTaken(email: string, excludeId?: number): Promise<boolean> {
  if (!email) return false;
  const rows = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(excludeId ? and(eq(adminUsers.email, email), ne(adminUsers.id, excludeId)) : eq(adminUsers.email, email));
  return rows.length > 0;
}

router.get("/admin/permissions", authMiddleware, requireRole("super"), async (_req, res) => {
  return res.json(ADMIN_PERMISSION_DEFINITIONS);
});

router.get("/admin/users", authMiddleware, requireRole("super"), async (_req, res) => {
  try {
    const rows = await db.select().from(adminUsers).orderBy(desc(adminUsers.createdAt));
    const byUser = await permissionsForUsers(rows.map((u) => u.id));
    return res.json(rows.map((row) => publicUser(row, byUser.get(row.id) ?? [])));
  } catch (err) {
    console.error("[admin-users] list:", err);
    return res.status(500).json({ error: "Failed to list users" });
  }
});

router.post("/admin/users", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const b = req.body ?? {};
    const username = normalizeUsername(b.username);
    const email = normalizeEmail(b.email);
    const password = String(b.password ?? "");
    const displayName = String(b.displayName ?? "").trim().slice(0, 200);
    const permissions = sanitizeAssignablePermissions(b.permissions);

    if (!username || !/^[a-z0-9_.-]{3,50}$/.test(username)) {
      return res.status(400).json({ error: "اسم المستخدم غير صالح" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    }
    if (email && await emailTaken(email)) {
      return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(adminUsers).values({
        username,
        passwordHash,
        role: "admin",
        email,
        displayName,
        isActive: b.isActive !== false,
      }).returning();

      if (permissions.length > 0) {
        await tx.insert(adminUserPermissions).values(
          permissions.map((permission) => ({ userId: row.id, permission })),
        );
      }
      return row;
    });

    await recordAudit(req, {
      action: "admin_user.create",
      entity: "admin_user",
      entityId: created.id,
      metadata: { username, permissions },
    });
    return res.status(201).json(publicUser(created, permissions));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني موجود بالفعل" });
    }
    console.error("[admin-users] create:", err);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/admin/users/:id", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const me = (req as any).admin;
    const b = req.body ?? {};
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (!existing) return res.status(404).json({ error: "User not found" });

    const patch: Partial<typeof adminUsers.$inferInsert> = { updatedAt: new Date() };
    if (typeof b.email === "string") {
      const email = normalizeEmail(b.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "البريد الإلكتروني غير صالح" });
      }
      if (email && await emailTaken(email, id)) {
        return res.status(409).json({ error: "البريد الإلكتروني مستخدم بالفعل" });
      }
      patch.email = email;
    }
    if (typeof b.displayName === "string") patch.displayName = b.displayName.trim().slice(0, 200);
    if (typeof b.isActive === "boolean") {
      if (id === me.userId && !b.isActive) {
        return res.status(400).json({ error: "لا يمكنك تعطيل حسابك" });
      }
      if (existing.role === "super" && !b.isActive) {
        return res.status(400).json({ error: "لا يمكن تعطيل حساب المدير العام" });
      }
      patch.isActive = b.isActive;
    }
    if (typeof b.password === "string" && b.password.length > 0) {
      if (b.password.length < 8) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      }
      patch.passwordHash = await bcrypt.hash(b.password, 12);
    }

    const requestedPermissions = Object.prototype.hasOwnProperty.call(b, "permissions")
      ? sanitizeAssignablePermissions(b.permissions)
      : null;
    if (existing.role === "super" && requestedPermissions) {
      return res.status(400).json({ error: "المدير العام يمتلك كل الصلاحيات تلقائياً" });
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx.update(adminUsers).set(patch).where(eq(adminUsers.id, id)).returning();
      if (!row) return null;
      if (requestedPermissions) {
        await tx.delete(adminUserPermissions).where(eq(adminUserPermissions.userId, id));
        if (requestedPermissions.length > 0) {
          await tx.insert(adminUserPermissions).values(
            requestedPermissions.map((permission) => ({ userId: id, permission })),
          );
        }
      }
      return row;
    });

    if (!updated) return res.status(404).json({ error: "User not found" });
    const access = await getAdminAccess(id);
    await recordAudit(req, {
      action: "admin_user.update",
      entity: "admin_user",
      entityId: id,
      metadata: { username: updated.username, permissions: access?.permissions ?? [] },
    });
    return res.json(publicUser(updated, access?.permissions ?? []));
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ error: "اسم المستخدم أو البريد الإلكتروني موجود بالفعل" });
    }
    console.error("[admin-users] update:", err);
    return res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/admin/users/:id", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const me = (req as any).admin;
    if (id === me.userId) return res.status(400).json({ error: "لا يمكنك حذف حسابك" });
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    if (!existing) return res.status(404).json({ error: "User not found" });
    if (existing.role === "super") return res.status(400).json({ error: "لا يمكن حذف المدير العام" });
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    await recordAudit(req, {
      action: "admin_user.delete",
      entity: "admin_user",
      entityId: id,
      metadata: { username: existing.username },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[admin-users] delete:", err);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

// Get current user's role and permissions (used by frontend to gate UI)
router.get("/admin/whoami", authMiddleware, async (req, res) => {
  try {
    const role = await getCurrentRole(req);
    const access = await getAdminAccess((req as any).admin.userId);
    return res.json({
      role: role || "admin",
      isSuperAdmin: access?.isSuperAdmin ?? false,
      permissions: access?.permissions ?? [],
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
