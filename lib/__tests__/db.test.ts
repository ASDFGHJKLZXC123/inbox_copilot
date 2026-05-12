import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

// Each test gets its own temp DATA_DIR to avoid cross-test pollution
let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "inbox-test-"));
  process.env.DATA_DIR = tmpDir;
  vi.resetModules();

  // Reset the module so writeQueue and ensureStore are fresh per test
  // (vitest module isolation resets state between test files by default)
});

afterEach(async () => {
  delete process.env.DATA_DIR;
  delete process.env.ENCRYPTION_KEY;
  await rm(tmpDir, { recursive: true, force: true });
});

describe("searchThreads", () => {
  it("returns empty array for blank query", async () => {
    const { searchThreads } = await import("@/lib/db");
    const { getStore } = await import("@/lib/db");
    const store = await getStore();
    expect(searchThreads(store, "   ")).toEqual([]);
  });

  it("finds thread by subject keyword", async () => {
    const { searchThreads, getStore } = await import("@/lib/db");
    const store = await getStore();
    const results = searchThreads(store, "hiring");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].thread.subject).toMatch(/hiring/i);
  });

  it("scores multi-term queries higher than single-term", async () => {
    const { searchThreads, getStore } = await import("@/lib/db");
    const store = await getStore();
    const single = searchThreads(store, "hiring");
    const multi = searchThreads(store, "hiring plan");
    // multi-term result should have equal or higher score
    if (multi.length > 0 && single.length > 0) {
      expect(multi[0].score).toBeGreaterThanOrEqual(single[0].score);
    }
  });

  it("returns no results for unmatched query", async () => {
    const { searchThreads, getStore } = await import("@/lib/db");
    const store = await getStore();
    expect(searchThreads(store, "zzznomatch999")).toEqual([]);
  });
});

describe("sanitizeStore", () => {
  it("strips accessToken and refreshToken from connections", async () => {
    const { sanitizeStore } = await import("@/lib/db");
    const store = {
      accounts: [],
      connections: [
        {
          id: "google:user@example.com",
          email: "user@example.com",
          provider: "google" as const,
          accessToken: "secret-access",
          refreshToken: "secret-refresh",
          updatedAt: new Date().toISOString()
        }
      ],
      messages: [],
      reminders: [],
      subscriptions: [],
      threads: [],
      webhookEvents: []
    };

    const sanitized = sanitizeStore(store);
    const conn = sanitized.connections[0];

    expect("accessToken" in conn).toBe(false);
    expect("refreshToken" in conn).toBe(false);
    expect(conn.email).toBe("user@example.com");
  });
});

describe("addReminder (atomicUpdate)", () => {
  it("appends a reminder without losing existing data", async () => {
    // Dynamic import ensures fresh module state per test since DATA_DIR changed
    const { addReminder, getStore } = await import("@/lib/db");

    const reminder = {
      id: "rem_test_1",
      threadId: "thread_seed_1",
      dueAt: new Date(Date.now() + 86400_000).toISOString(),
      reason: "Test follow-up",
      completed: false
    };

    await addReminder(reminder);
    const store = await getStore();
    expect(store.reminders.find((r) => r.id === "rem_test_1")).toBeDefined();
  });
});

describe("connection token encryption at rest", () => {
  it("writes encrypted tokens to disk but returns plaintext to callers", async () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const { upsertConnection, getConnection } = await import("@/lib/db");

    await upsertConnection({
      id: "google:user@example.com",
      email: "user@example.com",
      provider: "google",
      accessToken: "plain-access-secret-xyz",
      refreshToken: "plain-refresh-secret-abc",
      updatedAt: new Date().toISOString()
    });

    const onDisk = await readFile(path.join(tmpDir, "inbox.json"), "utf8");
    expect(onDisk).not.toContain("plain-access-secret-xyz");
    expect(onDisk).not.toContain("plain-refresh-secret-abc");
    expect(onDisk).toContain("enc:v1:");

    const roundTripped = await getConnection({ provider: "google", email: "user@example.com" });
    expect(roundTripped?.accessToken).toBe("plain-access-secret-xyz");
    expect(roundTripped?.refreshToken).toBe("plain-refresh-secret-abc");
  });

  it("transparently migrates legacy plaintext tokens on next write", async () => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
    const { upsertConnection, getConnection, getStore } = await import("@/lib/db");

    // Seed the file directly with a plaintext-token connection (legacy MVP shape).
    const { writeFile, mkdir } = await import("node:fs/promises");
    await mkdir(tmpDir, { recursive: true });
    await writeFile(
      path.join(tmpDir, "inbox.json"),
      JSON.stringify({
        accounts: [],
        connections: [
          {
            id: "google:legacy@example.com",
            email: "legacy@example.com",
            provider: "google",
            accessToken: "legacy-plain-access",
            refreshToken: "legacy-plain-refresh",
            updatedAt: new Date().toISOString()
          }
        ],
        messages: [],
        reminders: [],
        subscriptions: [],
        threads: [],
        webhookEvents: []
      }),
      "utf8"
    );

    // First read tolerates plaintext (no enc:v1: prefix → pass-through).
    const before = await getStore();
    expect(before.connections[0].accessToken).toBe("legacy-plain-access");

    // Any write triggers re-encryption.
    await upsertConnection({
      id: "google:legacy@example.com",
      email: "legacy@example.com",
      provider: "google",
      accessToken: "legacy-plain-access",
      refreshToken: "legacy-plain-refresh",
      updatedAt: new Date().toISOString()
    });

    const onDisk = await readFile(path.join(tmpDir, "inbox.json"), "utf8");
    expect(onDisk).not.toContain("legacy-plain-access");
    expect(onDisk).toContain("enc:v1:");

    const after = await getConnection({ provider: "google", email: "legacy@example.com" });
    expect(after?.accessToken).toBe("legacy-plain-access");
  });

  it("preserves legacy plaintext-on-disk behavior when ENCRYPTION_KEY is unset", async () => {
    // No ENCRYPTION_KEY in env.
    const { upsertConnection } = await import("@/lib/db");

    await upsertConnection({
      id: "google:nokey@example.com",
      email: "nokey@example.com",
      provider: "google",
      accessToken: "still-plain-access",
      refreshToken: "still-plain-refresh",
      updatedAt: new Date().toISOString()
    });

    const onDisk = await readFile(path.join(tmpDir, "inbox.json"), "utf8");
    expect(onDisk).toContain("still-plain-access");
    expect(onDisk).not.toContain("enc:v1:");
  });
});
