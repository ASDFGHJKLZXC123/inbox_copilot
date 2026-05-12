import Anthropic from "@anthropic-ai/sdk";

import {
  DraftOptions,
  DraftReply,
  DraftReplyResult,
  InboxStore,
  Message,
  Thread,
  ThreadSummary,
  ThreadSummaryResult
} from "@/lib/types";

function latestMessage(messages: Message[]): Message | undefined {
  return [...messages].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
}

export function getThreadMessages(store: InboxStore, threadId: string): Message[] {
  return store.messages.filter((message) => message.threadId === threadId);
}

function heuristicSummary(thread: Thread, messages: Message[]): ThreadSummary {
  const latest = latestMessage(messages);
  const unreadCount = messages.filter((message) => message.isUnread).length;
  const labelSet = Array.from(new Set(messages.flatMap((message) => message.labels)));
  const sender = latest?.from ?? thread.participants[0] ?? "unknown sender";

  let action = "Archive when complete.";
  if (thread.status === "needs_reply") {
    action = `Reply to ${sender}${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}.`;
  } else if (thread.status === "waiting_on") {
    action = thread.waitingOn
      ? `Waiting on ${thread.waitingOn}. Set a follow-up if it slips.`
      : "Waiting on the other side. Keep a follow-up reminder.";
  }

  const bullets = [
    latest ? `Latest: ${latest.snippet}` : "No recent message preview available.",
    `Participants: ${thread.participants.join(", ")}`,
    labelSet.length ? `Tags: ${labelSet.join(", ")}` : "No tags on this thread yet."
  ];

  return {
    headline: `${thread.subject} needs ${thread.status === "done" ? "no immediate action" : "attention"}.`,
    action,
    bullets
  };
}

function heuristicDraft(thread: Thread, messages: Message[], options: DraftOptions): DraftReply {
  const latest = latestMessage(messages);
  const introByTone: Record<DraftOptions["tone"], string> = {
    concise: "Thanks for the note.",
    friendly: "Thanks for reaching out.",
    formal: "Thank you for the update."
  };

  const nextStep = thread.status === "waiting_on"
    ? "I am tracking this and will follow up if the timeline shifts."
    : "I will review this and send the next step shortly.";

  const clarifying = options.askClarifyingQuestion
    ? "\n\nBefore I finalize this, could you clarify the key deadline or decision you need from me?"
    : "";

  const body = [
    `Subject: Re: ${thread.subject}`,
    "",
    `Hi ${latest?.from.split("@")[0] ?? "there"},`,
    "",
    introByTone[options.tone],
    latest?.snippet ? `I saw your latest note: "${latest.snippet}"` : "I reviewed the thread.",
    nextStep + clarifying,
    "",
    options.tone === "formal" ? "Best regards," : "Best,",
    "You"
  ].join("\n");

  return {
    subject: `Re: ${thread.subject}`,
    body
  };
}

function heuristicReviseDraft(draft: DraftReply, instruction: string): DraftReply {
  const normalized = instruction.toLowerCase();
  let nextBody = draft.body;

  if (normalized.includes("short")) {
    const lines = draft.body
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean);
    nextBody = lines.slice(0, Math.min(lines.length, 6)).join("\n");
  } else if (normalized.includes("formal")) {
    nextBody = draft.body
      .replace(/^Hi\b/m, "Hello")
      .replace(/\bThanks for\b/g, "Thank you for")
      .replace(/\bBest,\b/g, "Best regards,");
  } else if (normalized.includes("friendly")) {
    nextBody = draft.body
      .replace(/^Hello\b/m, "Hi")
      .replace(/\bThank you for\b/g, "Thanks for")
      .replace(/\bBest regards,\b/g, "Best,");
  } else if (normalized.includes("question")) {
    nextBody = `${draft.body}\n\nCould you clarify the main deadline you want me to work toward?`;
  }

  return {
    ...draft,
    body: nextBody
  };
}

function threadContext(thread: Thread, messages: Message[]): string {
  const ordered = [...messages].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const history = ordered
    .map((message, index) =>
      [
        `Message ${index + 1}`,
        `From: ${message.from}`,
        `To: ${message.to.join(", ")}`,
        `Received: ${message.receivedAt}`,
        `Subject: ${message.subject}`,
        `Snippet: ${message.snippet}`,
        `Preview: ${message.bodyPreview}`
      ].join("\n")
    )
    .join("\n\n");

  return [
    `Thread subject: ${thread.subject}`,
    `Thread status: ${thread.status}`,
    `Participants: ${thread.participants.join(", ")}`,
    thread.waitingOn ? `Waiting on: ${thread.waitingOn}` : "",
    "Messages:",
    history || "No messages available."
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Provider detection ────────────────────────────────────────────────────

function geminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function claudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function claudeModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
}

// ─── JSON parsing helpers ──────────────────────────────────────────────────

function parseJsonBlock<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

// ─── Gemini ────────────────────────────────────────────────────────────────

function extractGeminiText(payload: unknown): string {
  const data = payload as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  return (
    data.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      cache: "no-store"
    }
  );

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  const text = extractGeminiText(payload);
  if (!text) throw new Error("Gemini returned an empty response");

  return text;
}

// ─── Claude ────────────────────────────────────────────────────────────────

async function generateWithClaude(systemPrompt: string, userContent: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: claudeModel(),
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" }
      }
    ],
    messages: [{ role: "user", content: userContent }]
  });

  const block = response.content[0];
  if (block?.type !== "text" || !block.text) {
    throw new Error("Claude returned an empty response");
  }

  return block.text;
}

// ─── Summarize thread ──────────────────────────────────────────────────────

export async function summarizeThread(thread: Thread, messages: Message[]): Promise<ThreadSummaryResult> {
  const context = threadContext(thread, messages);

  if (claudeEnabled()) {
    const systemPrompt = [
      "You are an AI inbox copilot. Read the email thread context and return only valid JSON.",
      'JSON schema: {"headline": string, "action": string, "bullets": string[]}',
      "Requirements:",
      "- Keep the headline short and concrete.",
      "- Make the action specific and actionable.",
      "- Return exactly 3 bullets.",
      "- Do not include markdown or code fences."
    ].join("\n");

    try {
      const raw = await generateWithClaude(systemPrompt, context);
      const parsed = parseJsonBlock<ThreadSummary>(raw);

      if (parsed?.headline && parsed?.action && Array.isArray(parsed.bullets)) {
        return {
          meta: { model: claudeModel(), source: "claude" },
          summary: { headline: parsed.headline, action: parsed.action, bullets: parsed.bullets.slice(0, 3) }
        };
      }
    } catch {
      // Fall through to Gemini or heuristics
    }
  }

  if (geminiEnabled()) {
    const prompt = [
      "You are an AI inbox copilot. Read the email thread context and return only valid JSON.",
      'JSON schema: {"headline": string, "action": string, "bullets": string[]}',
      "Requirements:",
      "- Keep the headline short and concrete.",
      "- Make the action specific and actionable.",
      "- Return exactly 3 bullets.",
      "- Do not include markdown or code fences unless absolutely necessary.",
      "",
      context
    ].join("\n");

    try {
      const raw = await generateWithGemini(prompt);
      const parsed = parseJsonBlock<ThreadSummary>(raw);

      if (parsed?.headline && parsed?.action && Array.isArray(parsed.bullets)) {
        return {
          meta: { model: geminiModel(), source: "gemini" },
          summary: { headline: parsed.headline, action: parsed.action, bullets: parsed.bullets.slice(0, 3) }
        };
      }
    } catch {
      // Fall through to heuristics
    }
  }

  return {
    meta: { source: "fallback" },
    summary: heuristicSummary(thread, messages)
  };
}

// ─── Draft reply ───────────────────────────────────────────────────────────

export async function draftReply(
  thread: Thread,
  messages: Message[],
  options: DraftOptions
): Promise<DraftReplyResult> {
  const context = threadContext(thread, messages);
  const toneGuidance: Record<DraftOptions["tone"], string> = {
    concise: "Keep it tight, direct, and efficient. Prefer short paragraphs and minimal pleasantries.",
    friendly: "Sound warm, collaborative, and human. Use natural phrasing and mild warmth.",
    formal: "Sound polished, precise, and professional. Use more structured business language."
  };

  const requirements = [
    `- Tone: ${options.tone}. ${toneGuidance[options.tone]}`,
    `- Ask a clarifying question: ${options.askClarifyingQuestion ? "yes" : "no"}.`,
    "- Write a realistic reply email, not analysis.",
    "- The body should be ready to paste into an email client.",
    "- Include a greeting and sign-off.",
    "- If clarification is requested, include exactly one concrete clarifying question near the end.",
    "- Do not include markdown or code fences unless absolutely necessary."
  ].join("\n");

  if (claudeEnabled()) {
    const systemPrompt = [
      "You are an AI inbox copilot drafting an email reply. Return only valid JSON.",
      'JSON schema: {"subject": string, "body": string}',
      "Requirements:",
      requirements
    ].join("\n");

    try {
      const raw = await generateWithClaude(systemPrompt, context);
      const parsed = parseJsonBlock<DraftReply>(raw);

      if (parsed?.subject && parsed?.body) {
        return {
          draft: { subject: parsed.subject, body: parsed.body },
          meta: { model: claudeModel(), source: "claude" }
        };
      }
    } catch {
      // Fall through
    }
  }

  if (geminiEnabled()) {
    const prompt = [
      "You are an AI inbox copilot drafting an email reply. Return only valid JSON.",
      'JSON schema: {"subject": string, "body": string}',
      "Requirements:",
      requirements,
      "",
      context
    ].join("\n");

    try {
      const raw = await generateWithGemini(prompt);
      const parsed = parseJsonBlock<DraftReply>(raw);

      if (parsed?.subject && parsed?.body) {
        return {
          draft: { subject: parsed.subject, body: parsed.body },
          meta: { model: geminiModel(), source: "gemini" }
        };
      }
    } catch {
      // Fall through
    }
  }

  return {
    draft: heuristicDraft(thread, messages, options),
    meta: { source: "fallback" }
  };
}

// ─── Revise draft ──────────────────────────────────────────────────────────

export async function reviseDraft(
  thread: Thread,
  messages: Message[],
  currentDraft: DraftReply,
  instruction: string
): Promise<DraftReplyResult> {
  const context = threadContext(thread, messages);
  const draftBlock = [
    "Current draft subject:",
    currentDraft.subject,
    "",
    "Current draft body:",
    currentDraft.body,
    "",
    "User edit instruction:",
    instruction
  ].join("\n");

  if (claudeEnabled()) {
    const systemPrompt = [
      "You are an AI inbox copilot revising an email draft. Return only valid JSON.",
      'JSON schema: {"subject": string, "body": string}',
      "Requirements:",
      "- Apply the user's requested edit to the existing draft.",
      "- Preserve the core intent unless the instruction explicitly changes it.",
      "- Return a polished email draft ready to send.",
      "- Do not include analysis or commentary.",
      "- Do not include markdown or code fences unless absolutely necessary.",
      "",
      "Thread context:",
      context
    ].join("\n");

    try {
      const raw = await generateWithClaude(systemPrompt, draftBlock);
      const parsed = parseJsonBlock<DraftReply>(raw);

      if (parsed?.subject && parsed?.body) {
        return {
          draft: { subject: parsed.subject, body: parsed.body },
          meta: { model: claudeModel(), source: "claude" }
        };
      }
    } catch {
      // Fall through
    }
  }

  if (geminiEnabled()) {
    const prompt = [
      "You are an AI inbox copilot revising an email draft. Return only valid JSON.",
      'JSON schema: {"subject": string, "body": string}',
      "Requirements:",
      "- Apply the user's requested edit to the existing draft.",
      "- Preserve the core intent unless the instruction explicitly changes it.",
      "- Return a polished email draft ready to send.",
      "- Do not include analysis or commentary.",
      "- Do not include markdown or code fences unless absolutely necessary.",
      "",
      "Thread context:",
      context,
      "",
      draftBlock
    ].join("\n");

    try {
      const raw = await generateWithGemini(prompt);
      const parsed = parseJsonBlock<DraftReply>(raw);

      if (parsed?.subject && parsed?.body) {
        return {
          draft: { subject: parsed.subject, body: parsed.body },
          meta: { model: geminiModel(), source: "gemini" }
        };
      }
    } catch {
      // Fall through
    }
  }

  return {
    draft: heuristicReviseDraft(currentDraft, instruction),
    meta: { source: "fallback" }
  };
}
