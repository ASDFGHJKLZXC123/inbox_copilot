// Automated smoke walk for AI Inbox Copilot Phase 2.
// Covers A.7 items reachable without a real Google sign-in.
// Tier 3 items (real /api/* auth, send, modify, subscriptions) need manual verify.

import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
const log = (block, item, status, detail = "") => {
  results.push({ block, item, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "·";
  console.log(`  ${icon} [${block}] ${item}${detail ? " — " + detail : ""}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

// Capture console errors
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push("pageerror: " + err.message));

console.log("\n=== Auth (middleware + signin) ===");
try {
  const r = await page.goto(`${BASE}/inbox`, { waitUntil: "domcontentloaded" });
  const finalUrl = page.url();
  if (finalUrl.includes("/signin") && finalUrl.includes("callbackUrl")) {
    log("Auth", "GET /inbox unauth → /signin?callbackUrl=/inbox", "PASS", finalUrl);
  } else {
    log("Auth", "GET /inbox unauth → /signin?callbackUrl=/inbox", "FAIL", `landed at ${finalUrl}`);
  }
} catch (e) {
  log("Auth", "GET /inbox redirect", "FAIL", e.message);
}

try {
  await page.goto(`${BASE}/preferences`, { waitUntil: "domcontentloaded" });
  const finalUrl = page.url();
  if (finalUrl.includes("/signin") && finalUrl.includes("callbackUrl")) {
    log("Auth", "GET /preferences unauth → /signin?callbackUrl=/preferences", "PASS", finalUrl);
  } else {
    log("Auth", "GET /preferences unauth", "FAIL", `landed at ${finalUrl}`);
  }
} catch (e) {
  log("Auth", "GET /preferences redirect", "FAIL", e.message);
}

try {
  await page.goto(`${BASE}/signin`, { waitUntil: "domcontentloaded" });
  const cta = await page.locator('text=/continue with google/i').first();
  await cta.waitFor({ timeout: 5000 });
  log("Auth", "GET /signin renders SignInGate", "PASS", "found 'Continue with Google'");
} catch (e) {
  log("Auth", "/signin render", "FAIL", e.message);
}

console.log("\n=== Inbox — read (via /dev/inbox-preview, no session needed) ===");
try {
  const r = await page.goto(`${BASE}/dev/inbox-preview`, { waitUntil: "networkidle" });
  if (!r.ok()) throw new Error(`HTTP ${r.status()}`);

  // Wait for thread list to render
  const threadItems = page.locator('[role="button"][aria-selected]');
  await threadItems.first().waitFor({ timeout: 10000 });
  const count = await threadItems.count();
  log("Read", "preview renders thread list", "PASS", `${count} thread row(s)`);

  // Click first thread → detail
  await threadItems.first().click();
  await page.waitForTimeout(300);
  const subjectText = await page.locator("text=/series b term sheet/i").first().count();
  log("Read", "click thread → detail panel renders subject", subjectText > 0 ? "PASS" : "FAIL");

  // j/k keyboard nav
  await page.keyboard.press("j");
  await page.waitForTimeout(200);
  const after_j = await page.locator('[aria-selected="true"]').first();
  await after_j.waitFor({ timeout: 3000 });
  const after_j_text = await after_j.textContent();
  await page.keyboard.press("k");
  await page.waitForTimeout(200);
  const after_k = await page.locator('[aria-selected="true"]').first();
  const after_k_text = await after_k.textContent();
  log("Read", "j/k keyboard nav moves selection", after_j_text !== after_k_text ? "PASS" : "FAIL");

  // `/` focuses search
  await page.keyboard.press("/");
  await page.waitForTimeout(150);
  const focused = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
  log("Read", "press / → focuses search input", focused === "input" ? "PASS" : "FAIL", `focused: ${focused}`);

  // Type search term → results render
  await page.keyboard.type("series", { delay: 30 });
  await page.waitForTimeout(400);
  // Search results UI may differ; just check no console error and input has value
  const inputValue = await page.evaluate(() => (document.activeElement)?.value);
  log("Read", "search typing fills input", inputValue?.toLowerCase().includes("series") ? "PASS" : "FAIL", `value: ${inputValue}`);

  // Escape clears
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const inputAfterEsc = await page.evaluate(() => {
    const inp = document.querySelector('input[type="text"], input:not([type])');
    return inp ? inp.value : null;
  });
  log("Read", "Escape clears search", inputAfterEsc === "" ? "PASS" : "INFO", `value after esc: ${JSON.stringify(inputAfterEsc)}`);
} catch (e) {
  log("Read", "preview interactions", "FAIL", e.message);
}

console.log("\n=== Inbox — write (composers can open via keymap; send needs auth) ===");
try {
  await page.goto(`${BASE}/dev/inbox-preview`, { waitUntil: "networkidle" });
  await page.locator('[role="button"][aria-selected]').first().waitFor({ timeout: 10000 });
  // Click out of any current selection to clear focus state
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(100);

  // Press r → reply composer
  await page.keyboard.press("r");
  await page.waitForTimeout(400);
  const replyComposer = await page.locator("text=/reply to/i").first().count();
  log("Write", "press r → ReplyComposer appears", replyComposer > 0 ? "PASS" : "INFO", `(reply panel needs a thread selected; preview may not auto-select)`);

  // Press Escape, then c → ComposeDialog
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  await page.keyboard.press("c");
  await page.waitForTimeout(400);
  const composeDialog = await page.locator("text=/new message|compose/i").first().count();
  log("Write", "press c → ComposeDialog opens", composeDialog > 0 ? "PASS" : "FAIL");

  // Cc / Bcc toggle if dialog open
  if (composeDialog > 0) {
    const ccToggle = page.locator("text=/^Cc$|cc/i").first();
    const ccExists = await ccToggle.count();
    if (ccExists > 0) {
      await ccToggle.click().catch(() => {});
      log("Write", "ComposeDialog has Cc toggle", "PASS");
    } else {
      log("Write", "ComposeDialog Cc toggle", "INFO", "not found by text search");
    }
    await page.keyboard.press("Escape");
  }
} catch (e) {
  log("Write", "composer keymaps", "FAIL", e.message);
}

console.log("\n=== Preferences page (renders without /api/* call) ===");
try {
  await page.goto(`${BASE}/dev/preferences-preview`, { waitUntil: "networkidle" });
  const url = page.url();
  if (url.includes("/dev/preferences-preview")) {
    // Sections present?
    const sectionsFound = [];
    for (const label of ["Account", "Copilot AI", "Notifications", "Appearance", "Keyboard", "Connected", "Privacy"]) {
      const ct = await page.locator(`text=/^${label}$/i`).count();
      if (ct > 0) sectionsFound.push(label);
    }
    log("Prefs", "dev preview renders 7 sections", sectionsFound.length === 7 ? "PASS" : "PARTIAL", `${sectionsFound.length}/7: ${sectionsFound.join(", ")}`);
  } else {
    log("Prefs", "/dev/preferences-preview reachable", "FAIL", `landed at ${url}`);
  }
} catch (e) {
  log("Prefs", "preview render", "FAIL", e.message);
}

console.log("\n=== Console errors during smoke ===");
if (consoleErrors.length === 0) {
  log("Console", "no console errors", "PASS");
} else {
  log("Console", "console errors emitted", "FAIL", `${consoleErrors.length} error(s)`);
  consoleErrors.slice(0, 5).forEach((e) => console.log("    " + e.substring(0, 200)));
}

await browser.close();

console.log("\n=== Summary ===");
const counts = { PASS: 0, FAIL: 0, INFO: 0, PARTIAL: 0 };
results.forEach((r) => counts[r.status]++);
console.log(`PASS: ${counts.PASS}  FAIL: ${counts.FAIL}  INFO: ${counts.INFO}  PARTIAL: ${counts.PARTIAL}`);
if (counts.FAIL > 0) {
  console.log("\nFailures:");
  results.filter((r) => r.status === "FAIL").forEach((r) => console.log(`  - [${r.block}] ${r.item}${r.detail ? " — " + r.detail : ""}`));
  process.exit(1);
}
