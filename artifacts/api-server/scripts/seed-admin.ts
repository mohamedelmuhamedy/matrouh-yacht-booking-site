#!/usr/bin/env tsx
/**
 * Admin seed script: creates or updates the configured admin user.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server seed-admin --username=admin --password=yourpassword
 */

import { seedAdmin } from "../src/lib/seedAdmin";

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith("--"))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split("=");
      return [key, value.join("=")];
    }),
);

async function main(): Promise<void> {
  const username = args.username || process.env.ADMIN_USERNAME || "admin";
  await seedAdmin({
    username,
    password: args.password || process.env.ADMIN_PASSWORD,
    displayName:
      args.display ||
      process.env.ADMIN_DISPLAY_NAME ||
      process.env.ADMIN_DISPLAY ||
      "Admin",
    email: args.email || process.env.ADMIN_EMAIL || "",
    role: args.role || process.env.ADMIN_ROLE || "super",
  });

  console.log(`You can now login at /admin/login with username="${username}"`);
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
