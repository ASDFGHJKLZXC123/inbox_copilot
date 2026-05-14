// Capture a 1280px viewport screenshot of the dev inbox preview route and
// the mockup `.archive/email-copilot-mockup/index.html`. Output to tests/visual/inbox/.
//
// Usage: node tests/visual/inbox/capture.mjs
// Assumes `npm run dev` is running on PORT (default 3000) and that
// NEXT_PUBLIC_ENABLE_DEV_PREVIEW=true was set in the dev server env.

import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ?? "3000";
const MOCKUP_PORT = process.env.MOCKUP_PORT ?? "4321";
const mockupUrl = `http://localhost:${MOCKUP_PORT}/index.html`;
const renderedUrl = `http://localhost:${PORT}/dev/inbox-preview`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
});

try {
  // Rendered Next.js inbox via the dev preview route
  {
    const page = await ctx.newPage();
    await page.goto(renderedUrl, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(__dirname, "inbox-rendered-1280.png"),
      fullPage: false,
    });
    await page.close();
  }

  // Mockup
  {
    const page = await ctx.newPage();
    await page.goto(mockupUrl, { waitUntil: "load", timeout: 30_000 });
    // The mockup uses Babel in-browser; wait for the Sidebar to mount.
    try {
      await page.waitForSelector("aside", { timeout: 15_000 });
    } catch {
      // Fall through; still screenshot whatever rendered for debugging.
    }
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(__dirname, "inbox-mockup-1280.png"),
      fullPage: false,
    });
    await page.close();
  }

  console.log("OK");
} finally {
  await browser.close();
}
