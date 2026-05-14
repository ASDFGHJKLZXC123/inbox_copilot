/**
 * Playwright configuration scoped to contrast tests only.
 *
 * Covers the permanent dark-theme inbox (slate-900/950 surfaces,
 * slate-100/200/300 text, sky-400/500 accents) across three scenarios:
 * default page load, selected email highlight, and expanded thread panel.
 *
 * Kept separate from any future full Playwright suite so it can run
 * quickly (single browser, no retries on a clean machine) and doesn't
 * collide with the Vitest config that handles unit tests.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Only pick up files inside this directory.
  testDir: ".",
  testMatch: "**/*.test.ts",

  // Each test does a full-page axe scan after waiting for networkidle (which
  // includes the Google Fonts Inter @import in inbox.css). The default 30s
  // is tight on a cold-start dev server; 60s gives headroom without hiding
  // genuine hangs.
  timeout: 60_000,

  // Each test gets one attempt in normal runs; CI can override with
  // the PLAYWRIGHT_RETRIES env var if flakiness is ever introduced.
  retries: process.env.CI ? 1 : 0,

  // Run tests sequentially — they share a dev server and each navigates to
  // the same URL, so parallel workers would not meaningfully reduce runtime.
  workers: 1,

  // Fail fast: a contrast regression is always worth stopping for.
  maxFailures: 1,

  use: {
    // Dev server URL — override with PORT env var to match npm run dev output.
    baseURL: `http://localhost:${process.env.PORT ?? "3000"}`,

    // Headless keeps CI clean; set PWDEBUG=1 locally to see the browser.
    headless: true,

    // Capture a screenshot on failure so you can see what axe was looking at.
    screenshot: "only-on-failure",

    // Generous navigation timeout — Next.js cold starts can be slow.
    navigationTimeout: 30_000,
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Reporter: concise in CI, verbose locally.
  reporter: process.env.CI ? "github" : "list",
});
