"use server";

import { draftReply, getThreadMessages, reviseDraft, summarizeThread } from "@/lib/copilot";
import { getStore } from "@/lib/db";
import { DraftOptions, DraftReply, DraftReplyResult, ThreadSummaryResult } from "@/lib/types";

export async function summarizeThreadAction(threadId: string): Promise<ThreadSummaryResult> {
  const store = await getStore();
  const thread = store.threads.find((t) => t.id === threadId);

  if (!thread) {
    return {
      meta: { source: "fallback" },
      summary: {
        headline: "Thread not found.",
        action: "No action available.",
        bullets: ["The requested thread could not be located.", "It may have been removed or not yet synced.", "Try refreshing your inbox."]
      }
    };
  }

  const messages = getThreadMessages(store, threadId);
  return summarizeThread(thread, messages);
}

export async function draftReplyAction(threadId: string, options: DraftOptions): Promise<DraftReplyResult> {
  const store = await getStore();
  const thread = store.threads.find((t) => t.id === threadId);

  if (!thread) {
    return {
      draft: {
        subject: "Thread not found",
        body: "The requested thread could not be located. Please refresh your inbox and try again."
      },
      meta: { source: "fallback" }
    };
  }

  const messages = getThreadMessages(store, threadId);
  return draftReply(thread, messages, options);
}

export async function reviseDraftAction(
  threadId: string,
  currentDraft: DraftReply,
  instruction: string
): Promise<DraftReplyResult> {
  const store = await getStore();
  const thread = store.threads.find((t) => t.id === threadId);

  if (!thread) {
    return {
      draft: currentDraft,
      meta: { source: "fallback" }
    };
  }

  const messages = getThreadMessages(store, threadId);
  return reviseDraft(thread, messages, currentDraft, instruction);
}
