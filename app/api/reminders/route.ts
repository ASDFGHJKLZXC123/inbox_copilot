import { NextRequest, NextResponse } from "next/server";

import { addReminder, getStore } from "@/lib/db";

function makeId(): string {
  return `reminder_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET(): Promise<NextResponse> {
  const store = await getStore();
  return NextResponse.json(store.reminders);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    threadId?: string;
    dueAt?: string;
    reason?: string;
  };

  if (!body.threadId || !body.dueAt || !body.reason) {
    return NextResponse.json({ error: "threadId, dueAt, and reason are required" }, { status: 400 });
  }

  const store = await addReminder({
    id: makeId(),
    threadId: body.threadId,
    dueAt: body.dueAt,
    reason: body.reason,
    completed: false
  });

  return NextResponse.json(store.reminders);
}
