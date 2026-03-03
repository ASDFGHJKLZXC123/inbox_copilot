import { NextRequest, NextResponse } from "next/server";

import { draftReply, getThreadMessages } from "@/lib/copilot";
import { getStore } from "@/lib/db";
import { DraftOptions } from "@/lib/types";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const body = (await request.json()) as Partial<DraftOptions>;
  const store = await getStore();
  const thread = store.threads.find((item) => item.id === threadId);

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  const draft = await draftReply(thread, getThreadMessages(store, threadId), {
    tone: body.tone ?? "concise",
    askClarifyingQuestion: Boolean(body.askClarifyingQuestion)
  });

  return NextResponse.json(draft);
}
