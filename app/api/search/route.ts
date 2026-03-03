import { NextRequest, NextResponse } from "next/server";

import { searchThreads } from "@/lib/copilot";
import { getStore } from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as { query?: string };

  if (!body.query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const store = await getStore();
  const results = searchThreads(store, body.query).map((result) => ({
    ...result,
    unreadCount: store.messages.filter((message) => message.threadId === result.thread.id && message.isUnread).length
  }));

  return NextResponse.json(results);
}
