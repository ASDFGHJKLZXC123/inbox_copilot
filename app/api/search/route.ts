import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "@/lib/api";
import { getStore, searchThreads } from "@/lib/db";
import { SearchRequestSchema } from "@/lib/schemas";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseBody(request, SearchRequestSchema);
  if (parsed.error) return parsed.error;
  const { query } = parsed.data;

  const store = await getStore();
  const results = searchThreads(store, query).map((result) => ({
    ...result,
    unreadCount: store.messages.filter((message) => message.threadId === result.thread.id && message.isUnread).length
  }));

  return NextResponse.json(results);
}
