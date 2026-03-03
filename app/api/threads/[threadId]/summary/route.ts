import { NextRequest, NextResponse } from "next/server";

import { getThreadMessages, summarizeThread } from "@/lib/copilot";
import { getStore } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const { threadId } = await context.params;
  const store = await getStore();
  const thread = store.threads.find((item) => item.id === threadId);

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  const summary = await summarizeThread(thread, getThreadMessages(store, threadId));
  return NextResponse.json(summary);
}
