import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api";
import { deleteReminder, getStore, sanitizeStore, updateReminder } from "@/lib/db";

const ReminderCompleteSchema = z.object({
  completed: z.boolean()
});

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  const store = await getStore();
  const reminder = store.reminders.find((item) => item.id === id);

  if (!reminder) {
    return NextResponse.json({ error: "reminder not found" }, { status: 404 });
  }

  const updated = await deleteReminder(id);
  return NextResponse.json(sanitizeStore(updated));
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params;

  const parsed = await parseBody(request, ReminderCompleteSchema);
  if (parsed.error) return parsed.error;
  const { completed } = parsed.data;

  const store = await getStore();
  const reminder = store.reminders.find((item) => item.id === id);

  if (!reminder) {
    return NextResponse.json({ error: "reminder not found" }, { status: 404 });
  }

  const updated = await updateReminder(id, { completed });
  return NextResponse.json(sanitizeStore(updated));
}
