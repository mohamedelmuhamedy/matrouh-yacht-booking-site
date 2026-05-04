import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, adminUsers } from "@workspace/db";

const VALID_ROLES = new Set(["super", "admin", "operator", "viewer"]);

type AdminSeedRole = "super" | "admin" | "operator" | "viewer";

interface SeedAdminOptions {
  username?: string;
  password?: string;
  displayName?: string;
  email?: string;
  role?: string;
  logger?: Pick<Console, "log" | "warn">;
}

export interface SeedAdminResult {
  username: string;
  role: AdminSeedRole;
  action: "created" | "updated";
}

function normalizeRole(role: string | undefined): AdminSeedRole {
  const normalized = (role || "super").trim().toLowerCase();
  return VALID_ROLES.has(normalized) ? (normalized as AdminSeedRole) : "super";
}

function resolvePassword(input?: string): string {
  const password = input || process.env.ADMIN_PASSWORD;
  if (password) return password;

  throw new Error("ADMIN_PASSWORD is required for automatic admin seeding");
}

export async function seedAdmin(options: SeedAdminOptions = {}): Promise<SeedAdminResult> {
  const logger = options.logger ?? console;
  const username = (options.username || process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const password = resolvePassword(options.password);
  const displayName = options.displayName ?? process.env.ADMIN_DISPLAY_NAME ?? process.env.ADMIN_DISPLAY ?? "Admin";
  const email = options.email ?? process.env.ADMIN_EMAIL ?? "";
  const role = normalizeRole(options.role ?? process.env.ADMIN_ROLE);

  if (!/^[a-z0-9_.-]{3,50}$/.test(username)) {
    throw new Error("ADMIN_USERNAME must be 3-50 chars using letters, numbers, dot, underscore or hyphen");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.username, username));

  if (existing) {
    await db
      .update(adminUsers)
      .set({
        passwordHash,
        displayName,
        email,
        role,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing.id));
    logger.log(`[admin-seed] updated admin user "${username}" with role "${role}"`);
    return { username, role, action: "updated" };
  }

  await db.insert(adminUsers).values({
    username,
    passwordHash,
    displayName,
    email,
    role,
    isActive: true,
  });
  logger.log(`[admin-seed] created admin user "${username}" with role "${role}"`);
  return { username, role, action: "created" };
}

export async function seedAdminFromStartup(): Promise<void> {
  try {
    await seedAdmin();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV === "production") {
      throw new Error(`[admin-seed] ${message}`);
    }
    console.warn(`[admin-seed] skipped: ${message}`);
  }
}
