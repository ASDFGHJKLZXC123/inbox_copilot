import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "@/lib/api";
import { getStore, sanitizeStore, updateThreadStatus } from "@/lib/db";
import { ThreadStatusUpdateSchema } from "@/lib/schemas";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ threadId: string }> }
): Promise<NextResponse> {
  const { threadId } = await context.params;

  const parsed = await parseBody(request, ThreadStatusUpdateSchema);
  if (parsed.error) return parsed.error;
  const { status, waitingOn } = parsed.data;

  const store = await getStore();
  const thread = store.threads.find((item) => item.id === threadId);

  if (!thread) {
    return NextResponse.json({ error: "thread not found" }, { status: 404 });
  }

  const updated = await updateThreadStatus(threadId, status, waitingOn);
  return NextResponse.json(sanitizeStore(updated));
}
