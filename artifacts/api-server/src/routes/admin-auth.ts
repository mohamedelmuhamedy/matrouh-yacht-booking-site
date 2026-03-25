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

export default router;
