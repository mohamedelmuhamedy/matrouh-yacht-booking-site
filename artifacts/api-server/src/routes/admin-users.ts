import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, adminUsers } from "@workspace/db";
import { desc, eq, ne } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole, getCurrentRole } from "../middleware/roles";

const router = Router();

const VALID_ROLES = ["super", "admin", "operator", "viewer"];

router.get("/admin/users", authMiddleware, requireRole("super"), async (_req, res) => {
  try {
    const rows = await db.select({
      id: adminUsers.id,
      username: adminUsers.username,
      email: adminUsers.email,
      displayName: adminUsers.displayName,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    }).from(adminUsers).orderBy(desc(adminUsers.createdAt));
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Failed to list" });
  }
});

router.post("/admin/users", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const b = req.body ?? {};
    const username = String(b.username ?? "").trim().toLowerCase().slice(0, 50);
    const password = String(b.password ?? "");
    const role = VALID_ROLES.includes(b.role) ? b.role : "operator";
    if (!username || !/^[a-z0-9_.-]{3,50}$/.test(username)) return res.status(400).json({ error: "اسم مستخدم غير صالح" });
    if (password.length < 6) return res.status(400).json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    const passwordHash = await bcrypt.hash(password, 12);
    const [row] = await db.insert(adminUsers).values({
      username,
      passwordHash,
      role,
      email: String(b.email ?? "").trim().slice(0, 200),
      displayName: String(b.displayName ?? "").trim().slice(0, 200),
      isActive: b.isActive !== false,
    }).returning();
    const { passwordHash: _, ...safe } = row as any;
    return res.status(201).json(safe);
  } catch (err: any) {
    if (err?.code === "23505") return res.status(409).json({ error: "اسم المستخدم موجود" });
    console.error("[admin-users] create:", err);
    return res.status(500).json({ error: "Failed to create" });
  }
});

router.put("/admin/users/:id", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const me = (req as any).admin;
    const b = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.role === "string" && VALID_ROLES.includes(b.role)) {
      // Prevent demoting yourself (last super)
      if (id === me.userId && b.role !== "super") return res.status(400).json({ error: "لا يمكنك تخفيض رتبتك" });
      patch.role = b.role;
    }
    if (typeof b.isActive === "boolean") {
      if (id === me.userId && !b.isActive) return res.status(400).json({ error: "لا يمكنك تعطيل حسابك" });
      patch.isActive = b.isActive;
    }
    if (typeof b.email === "string") patch.email = b.email.trim().slice(0, 200);
    if (typeof b.displayName === "string") patch.displayName = b.displayName.trim().slice(0, 200);
    if (typeof b.password === "string" && b.password.length >= 6) {
      patch.passwordHash = await bcrypt.hash(b.password, 12);
    }
    const [row] = await db.update(adminUsers).set(patch).where(eq(adminUsers.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    const { passwordHash: _, ...safe } = row as any;
    return res.json(safe);
  } catch (err) {
    console.error("[admin-users] update:", err);
    return res.status(500).json({ error: "Failed to update" });
  }
});

router.delete("/admin/users/:id", authMiddleware, requireRole("super"), async (req, res) => {
  try {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const me = (req as any).admin;
    if (id === me.userId) return res.status(400).json({ error: "لا يمكنك حذف حسابك" });
    await db.delete(adminUsers).where(eq(adminUsers.id, id));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// Get current user's role (used by frontend to gate UI)
router.get("/admin/whoami", authMiddleware, async (req, res) => {
  try {
    const role = await getCurrentRole(req);
    return res.json({ role: role || "admin" });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

export default router;
