import { test, expect, type Page } from "@playwright/test";

type ThemeName = "light" | "dark";

const PUBLIC_PAGES: { path: string; name: string }[] = [
  { path: "/", name: "home" },
  { path: "/trips", name: "trips" },
];

const ADMIN_PAGE = { path: "/admin/dashboard", name: "admin-dashboard" };
const THEMES: ThemeName[] = ["dark", "light"];

async function setThemeBeforeLoad(page: Page, theme: ThemeName) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("dr-theme", t);
    } catch {}
  }, theme);
}

async function settle(page: Page) {
  // Allow fonts, images, and intersection-observer-driven animations to finish.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test.describe("visual snapshots — public pages", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    for (const theme of THEMES) {
      test(`${name} (${theme})`, async ({ page }) => {
        await setThemeBeforeLoad(page, theme);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
          .toBe(theme);
        await settle(page);

        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          fullPage: true,
          mask: [
            page.locator("video"),
            page.locator("[data-skip-snapshot]"),
            page.locator(".scroll-progress"),
          ],
        });
      });
    }
  }
});

test.describe("visual snapshots — admin shell", () => {
  for (const theme of THEMES) {
    test(`${ADMIN_PAGE.name} (${theme})`, async ({ page }) => {
      await setThemeBeforeLoad(page, theme);
      await page.goto(ADMIN_PAGE.path, { waitUntil: "domcontentloaded" });

      // Strictly require that the admin storage state from global.setup.ts
      // produced a real authenticated session — never fall back to the login
      // screen, otherwise dashboard regressions would slip through silently.
      await page.waitForURL(/\/admin\/dashboard/, { timeout: 15_000 });
      expect(new URL(page.url()).pathname).toMatch(/\/admin\/dashboard/);

      // Wait for a dashboard-only marker to be visible. The greeting header
      // ("مرحباً <username>") only renders for authenticated users on the
      // dashboard route, so its presence guarantees the admin shell rendered.
      await expect(page.getByRole("heading", { name: /مرحباً/ })).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("text=DR TRAVEL · Admin").first()).toBeVisible();

      await expect
        .poll(() => page.evaluate(() => document.documentElement.getAttribute("data-theme")))
        .toBe(theme);
      await settle(page);

      await expect(page).toHaveScreenshot(`${ADMIN_PAGE.name}-${theme}.png`, {
        fullPage: true,
        mask: [page.locator("[data-skip-snapshot]")],
      });
    });
  }
});
