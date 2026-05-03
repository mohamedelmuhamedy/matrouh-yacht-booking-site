import { test, expect } from "@playwright/test";

async function getTheme(page: import("@playwright/test").Page) {
  return page.evaluate(() => document.documentElement.getAttribute("data-theme"));
}

async function seedDarkTheme(page: import("@playwright/test").Page) {
  // Visit a lightweight page first, seed localStorage, then navigate. This
  // avoids `addInitScript` (which would also re-run on `page.reload()` and
  // mask the persistence behaviour we're trying to verify).
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.setItem("dr-theme", "dark"));
  await page.reload();
}

test.describe("theme toggle persistence", () => {
  test("toggling switches data-theme attribute", async ({ page }) => {
    await seedDarkTheme(page);
    await expect.poll(() => getTheme(page)).toBe("dark");

    const toggle = page.locator("[data-theme-switch]").first();
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect.poll(() => getTheme(page)).toBe("light");

    await toggle.click();
    await expect.poll(() => getTheme(page)).toBe("dark");
  });

  test("preference persists across reload", async ({ page }) => {
    await seedDarkTheme(page);
    await expect.poll(() => getTheme(page)).toBe("dark");

    await page.locator("[data-theme-switch]").first().click();
    await expect.poll(() => getTheme(page)).toBe("light");
    expect(await page.evaluate(() => localStorage.getItem("dr-theme"))).toBe("light");

    await page.reload();
    await expect.poll(() => getTheme(page)).toBe("light");
    expect(await page.evaluate(() => localStorage.getItem("dr-theme"))).toBe("light");
  });
});
