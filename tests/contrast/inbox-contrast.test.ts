/**
 * Contrast regression test for /inbox — dark theme
 *
 * The inbox uses a permanent dark theme: slate-900/950 surfaces,
 * slate-100/200/300 text, and sky-400/500 accents. axe-core evaluates
 * actual computed styles, so the dark theme colors are tested automatically
 * when the page renders.
 *
 * Three test cases are covered:
 *   1. Default page load — audits the dark-theme inbox in its resting state.
 *   2. Selected email — clicks the first email item to trigger the sky-500
 *      selected highlight, then re-audits (tests selected-row contrast).
 *   3. Expanded thread — clicks the second email item (which opens/expands the
 *      thread detail panel) and re-audits interactive-state contrast.
 *
 * Uses @axe-core/playwright to audit the rendered page for WCAG AA
 * color-contrast violations. Scoped to contrast only so failures are
 * always actionable and never noisy.
 *
 * Prerequisites:
 *   npm install --save-dev @axe-core/playwright @playwright/test
 *   npx playwright install chromium   (once)
 *
 * Run:
 *   npm run test:contrast
 *
 * The test assumes the dev server is already running on PORT (default 3000).
 * Start it first with:  npm run dev
 * Or use the one-liner in package.json:  npm run test:contrast:ci
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PORT = process.env.PORT ?? "3000";
const BASE_URL = `http://localhost:${PORT}`;

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Navigates to the dark-theme inbox and waits for it to settle.
 * Throws a descriptive error if the server is not reachable so CI output
 * is immediately actionable.
 */
async function gotoInbox(page: import("@playwright/test").Page) {
  const response = await page.goto(`${BASE_URL}/inbox`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  if (response && !response.ok() && response.status() !== 304) {
    throw new Error(
      `Page returned HTTP ${response.status()} — is the dev server running on port ${PORT}?`
    );
  }
}

/**
 * Runs axe scoped to the color-contrast rule and returns a formatted
 * violation summary string (empty string when there are no violations).
 * Throws with full details if violations are found so that CI prints
 * the complete fg/bg/ratio breakdown rather than a terse assertion diff.
 */
async function auditContrast(
  page: import("@playwright/test").Page,
  label: string
) {
  const results = await new AxeBuilder({ page })
    // Target the full document — the dark theme covers every surface, so
    // scoping to a sub-tree would miss the sidebar and header contrast.
    // Uncomment and adjust if a stable landmark id is added in the future:
    // .include("#inbox-root")
    .withRules(["color-contrast"])
    .analyze();

  // Build a readable summary of every violation before asserting so that
  // a failure in CI prints the full details, not just "expected 0 === 0".
  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => {
        const nodes = v.nodes
          .map((n) => {
            const target = n.target.join(", ");
            const fg =
              n.any?.[0]?.data?.fgColor ??
              n.all?.[0]?.data?.fgColor ??
              "unknown";
            const bg =
              n.any?.[0]?.data?.bgColor ??
              n.all?.[0]?.data?.bgColor ??
              "unknown";
            const ratio =
              n.any?.[0]?.data?.contrastRatio ??
              n.all?.[0]?.data?.contrastRatio ??
              "?";
            return `    selector: ${target}\n    fg: ${fg}  bg: ${bg}  ratio: ${ratio}:1`;
          })
          .join("\n");
        return `[${v.id}] ${v.description}\n${nodes}`;
      })
      .join("\n\n");

    throw new Error(
      `${results.violations.length} contrast violation(s) found [${label}] on ${BASE_URL}/inbox:\n\n${summary}`
    );
  }

  // Explicit pass assertion so the test is never vacuously green.
  expect(results.violations).toHaveLength(0);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe("WCAG AA color-contrast — /inbox (dark theme)", () => {
  // ------------------------------------------------------------------
  // Test 1: default resting state
  // Verifies the dark-theme palette (slate-900/950 surfaces,
  // slate-100/200/300 text, sky-400/500 accents) at page load.
  // ------------------------------------------------------------------
  test("no contrast violations on initial dark-theme inbox load", async ({ page }) => {
    await gotoInbox(page);
    await auditContrast(page, "default state");
  });

  // ------------------------------------------------------------------
  // Test 2: selected email highlight
  // Clicks the first email item so the sky-500 selected-row highlight
  // (bg-sky-50, border-l-sky-500, sky-700 timestamp text on dark surface)
  // is applied before the axe audit runs.
  // ------------------------------------------------------------------
  test("no contrast violations with a selected email item (sky highlight)", async ({ page }) => {
    await gotoInbox(page);

    // The email list items are rendered with role="button" and
    // aria-selected. Click the first one to apply the selected-state
    // dark-theme highlight classes.
    const firstEmailItem = page.locator('[role="button"][aria-selected]').first();
    await firstEmailItem.waitFor({ state: "visible", timeout: 10_000 });
    await firstEmailItem.click();

    // Allow React state updates and any CSS transitions to settle before
    // handing the page to axe.
    await page.waitForTimeout(300);

    await auditContrast(page, "selected email highlight");
  });

  // ------------------------------------------------------------------
  // Test 3: expanded thread / detail panel
  // Clicks the second email item to open/expand the thread detail panel
  // (the inline reading pane that appears on the dark surface). This
  // exercises the contrast of the thread body text, action toolbar, and
  // Copilot summary card rendered against dark backgrounds.
  // ------------------------------------------------------------------
  test("no contrast violations with an expanded thread detail panel", async ({ page }) => {
    await gotoInbox(page);

    // Use the second email item so the selected-state from test 2 does not
    // interfere with this independent test (each test gets a fresh page).
    // Falls back to the first item if the list contains only one entry.
    const emailItems = page.locator('[role="button"][aria-selected]');
    await emailItems.first().waitFor({ state: "visible", timeout: 10_000 });

    const count = await emailItems.count();
    const targetItem = count > 1 ? emailItems.nth(1) : emailItems.first();

    // Click to open/expand the thread detail panel rendered alongside
    // the thread list on the dark-theme surface.
    await targetItem.click();

    // Wait for the detail panel to finish rendering its content before
    // running the axe audit. A short settle period covers CSS transitions
    // and any deferred content (e.g., the Copilot summary card fade-in).
    await page.waitForTimeout(400);

    await auditContrast(page, "expanded thread detail panel");
  });
});
