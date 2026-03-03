import { NextRequest, NextResponse } from "next/server";

import { getThreadMessages, reviseDraft } from "@/lib/copilot";
import { getStore } from "@/lib/db";
import { DraftReply } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const body = (await request.json()) as {
    currentDraft?: DraftReply;
    instruction?: string;
  };
  const store = await getStore();
  const thread = store.threads.find((item) => item.id === threadId);

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  if (!body.currentDraft?.body || !body.currentDraft?.subject) {
    return NextResponse.json({ error: "currentDraft is required" }, { status: 400 });
  }

  if (!body.instruction?.trim()) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }

  const result = await reviseDraft(thread, getThreadMessages(store, threadId), body.currentDraft, body.instruction);
  return NextResponse.json(result);
}
