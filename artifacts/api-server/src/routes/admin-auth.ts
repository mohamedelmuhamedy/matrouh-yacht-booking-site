import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { getJwtSecret } from "../middleware/auth";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const [adminUser] = await db.select().from(adminUsers)
      .where(eq(adminUsers.username, username));

    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, adminUser.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await db.update(adminUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminUsers.id, adminUser.id));

    const secret = getJwtSecret();
    const token = jwt.sign(
      { userId: adminUser.id, username: adminUser.username },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      username: adminUser.username,
      displayName: adminUser.displayName || adminUser.username,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/admin/me", authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).admin;
    const [adminUser] = await db.select().from(adminUsers)
      .where(eq(adminUsers.id, userId));
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({
      username: adminUser.username,
      displayName: adminUser.displayName || adminUser.username,
      email: adminUser.email,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/admin/change-password", authMiddleware, async (req, res) => {
  try {
    const { userId } = (req as any).admin;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const [adminUser] = await db.select().from(adminUsers).where(eq(adminUsers.id, userId));
    if (!adminUser) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, adminUser.passwordHash);
    if (!valid) return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(adminUsers)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(adminUsers.id, userId));

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
