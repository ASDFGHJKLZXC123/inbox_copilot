import { NextRequest, NextResponse } from "next/server";

import { parseBody } from "@/lib/api";
import { addReminder, getStore } from "@/lib/db";
import { ReminderCreateSchema } from "@/lib/schemas";

function makeId(): string {
  return `reminder_${Math.random().toString(36).slice(2, 10)}`;
}

export async function GET(): Promise<NextResponse> {
  const store = await getStore();
  return NextResponse.json(store.reminders);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const parsed = await parseBody(request, ReminderCreateSchema);
  if (parsed.error) return parsed.error;
  const { threadId, dueAt, reason } = parsed.data;

  const store = await addReminder({
    id: makeId(),
    threadId,
    dueAt,
    reason,
    completed: false
  });

  return NextResponse.json(store.reminders);
}
