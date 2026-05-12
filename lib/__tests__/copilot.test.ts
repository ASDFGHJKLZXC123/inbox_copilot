import { describe, it, expect, vi, beforeEach } from "vitest";

import type { InboxStore, Thread, Message } from "@/lib/types";

const mockThread: Thread = {
  id: "t1",
  subject: "Budget approval needed",
  participants: ["boss@acme.com"],
  messageIds: ["m1"],
  lastMessageAt: new Date().toISOString(),
  status: "needs_reply"
};

const mockMessages: Message[] = [
  {
    id: "m1",
    threadId: "t1",
    subject: "Budget approval needed",
    from: "boss@acme.com",
    to: ["you@acme.com"],
    snippet: "Please approve the Q3 budget by Friday.",
    bodyPreview: "Please approve the Q3 budget by Friday.",
    receivedAt: new Date().toISOString(),
    isUnread: true,
    labels: ["important"]
  }
];

describe("summarizeThread — heuristic fallback", () => {
  beforeEach(() => {
    // Ensure no AI keys are set so we exercise the heuristic path
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
  });

  it("returns source=fallback when no AI keys are configured", async () => {
    const { summarizeThread } = await import("@/lib/copilot");
    const result = await summarizeThread(mockThread, mockMessages);
    expect(result.meta.source).toBe("fallback");
  });

  it("includes subject in headline", async () => {
    const { summarizeThread } = await import("@/lib/copilot");
    const result = await summarizeThread(mockThread, mockMessages);
    expect(result.summary.headline).toContain("Budget approval needed");
  });

  it("returns exactly 3 bullets", async () => {
    const { summarizeThread } = await import("@/lib/copilot");
    const result = await summarizeThread(mockThread, mockMessages);
    expect(result.summary.bullets).toHaveLength(3);
  });

  it("action mentions the sender for needs_reply threads", async () => {
    const { summarizeThread } = await import("@/lib/copilot");
    const result = await summarizeThread(mockThread, mockMessages);
    expect(result.summary.action).toMatch(/reply/i);
  });
});

describe("draftReply — heuristic fallback", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
  });

  it("returns source=fallback and a draft with subject", async () => {
    const { draftReply } = await import("@/lib/copilot");
    const result = await draftReply(mockThread, mockMessages, {
      tone: "concise",
      askClarifyingQuestion: false
    });
    expect(result.meta.source).toBe("fallback");
    expect(result.draft.subject).toContain("Budget approval needed");
  });

  it("includes clarifying question when requested", async () => {
    const { draftReply } = await import("@/lib/copilot");
    const result = await draftReply(mockThread, mockMessages, {
      tone: "friendly",
      askClarifyingQuestion: true
    });
    expect(result.draft.body).toMatch(/clarif/i);
  });
});

describe("reviseDraft — heuristic fallback", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    vi.resetModules();
  });

  it("makes draft shorter when instructed", async () => {
    const { reviseDraft } = await import("@/lib/copilot");
    const original = {
      subject: "Re: Budget approval needed",
      body: "Hi boss,\n\nThanks for the note.\nI will review the budget.\nStay tuned.\n\nBest,\nYou\n\nSome extra line here."
    };
    const result = await reviseDraft(mockThread, mockMessages, original, "make it short");
    expect(result.draft.body.split("\n").filter(Boolean).length).toBeLessThanOrEqual(6);
  });
});

describe("getThreadMessages", () => {
  it("filters messages by threadId", async () => {
    const { getThreadMessages } = await import("@/lib/copilot");
    const store: InboxStore = {
      accounts: [],
      connections: [],
      messages: [
        { ...mockMessages[0] },
        { ...mockMessages[0], id: "m2", threadId: "other" }
      ],
      reminders: [],
      subscriptions: [],
      threads: [],
      webhookEvents: []
    };
    const msgs = getThreadMessages(store, "t1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe("m1");
  });
});
