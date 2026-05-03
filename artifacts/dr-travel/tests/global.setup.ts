import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "drtravel2024";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.resolve(HERE, ".auth/admin.json");

setup("authenticate as admin", async ({ page, request, baseURL }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // Authenticate via the API so the admin token is identical to a real
  // sign-in. The visual-admin specs require this to succeed — if the
  // backend isn't reachable or the seed admin is missing, we want to fail
  // fast with a clear message rather than silently snapshotting the login
  // page.
  const res = await request.post(`${baseURL}/api/admin/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  expect(
    res.ok(),
    `admin login failed (${res.status()}). Seed the admin user (pnpm --filter @workspace/scripts run setup-admin) and ensure the API server is running.`,
  ).toBeTruthy();
  const body = await res.json();
  const token = body?.token as string | undefined;
  expect(token, "admin login response missing token").toBeTruthy();

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ([t, theme]) => {
      localStorage.setItem("admin_token", t);
      localStorage.setItem("dr-theme", theme);
    },
    [token!, "dark"] as const,
  );

  await page.context().storageState({ path: AUTH_FILE });
  expect(fs.existsSync(AUTH_FILE)).toBeTruthy();
});
