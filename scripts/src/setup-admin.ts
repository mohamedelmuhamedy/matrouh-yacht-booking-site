/**
 * Setup script: Create or update an admin user in the database.
 *
 * Usage:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=mypassword pnpm --filter @workspace/scripts run setup-admin
 *
 * Or with display name:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD=mypassword ADMIN_DISPLAY_NAME="Admin User" ADMIN_EMAIL=admin@example.com \
 *     pnpm --filter @workspace/scripts run setup-admin
 */
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { adminUsers } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

async function setupAdmin() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME || "";
  const email = process.env.ADMIN_EMAIL || "";

  if (!username || !password) {
    console.error("ERROR: ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.");
    console.error("Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=mypassword pnpm --filter @workspace/scripts run setup-admin");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters long.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers)
      .where(eq(adminUsers.username, username));

    if (existing) {
      await db.update(adminUsers)
        .set({ passwordHash, displayName, email, isActive: true, updatedAt: new Date() })
        .where(eq(adminUsers.id, existing.id));
      console.log(`✅ Admin user '${username}' updated successfully.`);
    } else {
      await db.insert(adminUsers).values({ username, passwordHash, displayName, email, isActive: true });
      console.log(`✅ Admin user '${username}' created successfully.`);
    }

    console.log("\nAdmin Panel: /admin");
    console.log(`Username: ${username}`);
    console.log("Password: [as provided]");
  } catch (err: any) {
    console.error("ERROR creating admin user:", err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setupAdmin();
