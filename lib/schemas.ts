import { z } from "zod";

export const SyncRequestSchema = z.object({
  provider: z.enum(["google", "microsoft"]),
  email: z.string().email().optional(),
  label: z.enum(["inbox", "sent", "drafts", "archive", "trash"]).optional()
});

export const SearchRequestSchema = z.object({
  query: z.string().min(1).max(500)
});

export const ReminderCreateSchema = z.object({
  threadId: z.string().min(1),
  dueAt: z.string().datetime(),
  reason: z.string().min(1).max(1000)
});

export const DraftRequestSchema = z.object({
  tone: z.enum(["concise", "friendly", "formal"]).default("concise"),
  askClarifyingQuestion: z.boolean().default(false)
});

export const ReviseRequestSchema = z.object({
  draft: z.object({ subject: z.string(), body: z.string() }),
  instruction: z.string().min(1).max(2000)
});

export const ThreadStatusUpdateSchema = z.object({
  status: z.enum(["needs_reply", "waiting_on", "done"]),
  waitingOn: z.string().max(500).optional()
});
