import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 5000);
const API_PORT = Number(process.env.API_PORT ?? 3001);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isWindows = process.platform === "win32";

function commandWithEnv(env: Record<string, string | number>, command: string): string {
  if (isWindows) {
    const assignments = Object.entries(env)
      .map(([key, value]) => `set "${key}=${value}"`)
      .join(" && ");
    return `${assignments} && ${command}`;
  }

  const assignments = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  return `${assignments} ${command}`;
}

export default defineConfig({
  testDir: "./tests",
  outputDir: "./tests/.output",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
  },
  webServer: process.env.PLAYWRIGHT_NO_SERVER
    ? undefined
    : [
        {
          command: commandWithEnv({ PORT: API_PORT }, "pnpm --filter @workspace/api-server run dev"),
          url: `http://localhost:${API_PORT}/api/site-data`,
          cwd: "../..",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: commandWithEnv(
            { PORT, API_PORT },
            "pnpm --filter @workspace/dr-travel run dev",
          ),
          url: BASE_URL,
          cwd: "../..",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
        },
      ],
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: "tests/.auth/admin.json",
      },
    },
  ],
});
