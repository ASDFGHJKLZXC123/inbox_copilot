"use server";

import { randomUUID } from "node:crypto";

import { resolveStoredConnection } from "@/lib/connections";
import { addReminder, getStore, sanitizeStore, upsertSyncedInbox } from "@/lib/db";
import { Reminder, SanitizedInboxStore } from "@/lib/types";
import { syncProviderInbox } from "@/providers/adapters";

export async function addReminderAction(
  threadId: string,
  dueAt: string,
  reason: string
): Promise<SanitizedInboxStore> {
  const reminder: Reminder = {
    id: randomUUID(),
    threadId,
    dueAt,
    reason,
    completed: false
  };

  const store = await addReminder(reminder);
  return sanitizeStore(store);
}

export async function syncInboxAction(provider: "google" | "microsoft"): Promise<SanitizedInboxStore> {
  const connection = await resolveStoredConnection({ provider });

  if (!connection?.accessToken) {
    const store = await getStore();
    return sanitizeStore(store);
  }

  const synced = await syncProviderInbox(provider, connection.email, connection.accessToken, "inbox");
  const store = await upsertSyncedInbox(synced);
  return sanitizeStore(store);
}
