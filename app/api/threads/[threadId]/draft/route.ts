import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "@/lib/api";
import { draftReply, getThreadMessages } from "@/lib/copilot";
import { getStore } from "@/lib/db";
import { DraftRequestSchema } from "@/lib/schemas";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const { threadId } = await context.params;

  const parsed = await parseBody(request, DraftRequestSchema);
  if (parsed.error) return parsed.error;
  const { tone, askClarifyingQuestion } = parsed.data;

  const store = await getStore();
  const thread = store.threads.find((item) => item.id === threadId);

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  const draft = await draftReply(thread, getThreadMessages(store, threadId), {
    tone: tone ?? "concise",
    askClarifyingQuestion: askClarifyingQuestion ?? false
  });

  return NextResponse.json(draft);
}
