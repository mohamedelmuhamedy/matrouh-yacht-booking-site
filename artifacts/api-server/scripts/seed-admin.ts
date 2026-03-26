#!/usr/bin/env tsx
/**
 * Admin seed script — creates or updates the first admin user.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server seed-admin
 *   pnpm --filter @workspace/api-server seed-admin --username=admin --password=yourpassword
 *
 * Environment:
 *   DATABASE_URL must be set (same as api-server).
 */

import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.join("=")];
    })
);

const username  = args.username  || process.env.ADMIN_USERNAME  || "admin";
const password  = args.password  || process.env.ADMIN_PASSWORD  || "yousef1952006";
const display   = args.display   || process.env.ADMIN_DISPLAY   || "Admin";
const email     = args.email     || process.env.ADMIN_EMAIL     || "";

async function main() {
  if (!password || password.length < 6) {
    console.error("❌  Password must be at least 6 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);

  const [existing] = await db.select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, username));

  if (existing) {
    await db.update(adminUsers)
      .set({ passwordHash: hash, displayName: display, email, isActive: true, updatedAt: new Date() })
      .where(eq(adminUsers.id, existing.id));
    console.log(`✅  Updated admin user "${username}" (id=${existing.id})`);
  } else {
    const [created] = await db.insert(adminUsers).values({
      username,
      passwordHash: hash,
      displayName: display,
      email,
      isActive: true,
    }).returning({ id: adminUsers.id });
    console.log(`✅  Created admin user "${username}" (id=${created.id})`);
  }

  console.log(`🔑  You can now login at /admin/login with username="${username}"`);
  process.exit(0);
}

main().catch(err => {
  console.error("❌  Seed failed:", err.message || err);
  process.exit(1);
});
