import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "inbox-reminders-test-"));
  process.env.DATA_DIR = tmpDir;
  vi.resetModules();
});

afterEach(async () => {
  delete process.env.DATA_DIR;
  await rm(tmpDir, { recursive: true, force: true });
});

function jsonReq(body: unknown): Request {
  return new Request("http://test/api/reminders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/reminders", () => {
  it("creates a reminder with a valid body", async () => {
    const { POST } = await import("@/app/api/reminders/route");
    const dueAt = new Date(Date.now() + 60_000).toISOString();
    const res = await POST(
      jsonReq({ threadId: "thread_seed_1", dueAt, reason: "follow up" }) as never
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      threadId: string;
      reason: string;
      completed: boolean;
    }>;
    expect(Array.isArray(body)).toBe(true);
    const created = body.find((r) => r.reason === "follow up");
    expect(created).toBeDefined();
    expect(created?.threadId).toBe("thread_seed_1");
    expect(created?.completed).toBe(false);
  });

  it("rejects a body missing reason with 400", async () => {
    const { POST } = await import("@/app/api/reminders/route");
    const dueAt = new Date(Date.now() + 60_000).toISOString();
    const res = await POST(jsonReq({ threadId: "t1", dueAt }) as never);

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Validation failed");
  });

  it("rejects a malformed dueAt with 400", async () => {
    const { POST } = await import("@/app/api/reminders/route");
    const res = await POST(
      jsonReq({ threadId: "t1", dueAt: "not-a-date", reason: "x" }) as never
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/reminders", () => {
  it("returns the reminders array", async () => {
    const { GET } = await import("@/app/api/reminders/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown;
    expect(Array.isArray(body)).toBe(true);
    // The seed store writes one reminder on first read; new tmpDir per test
    // means GET always sees the seed reminder (length >= 1).
    expect((body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});
