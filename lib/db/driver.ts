import type {
  InboxStore,
  Message,
  OAuthConnection,
  ProviderSubscription,
  Reminder,
  SanitizedInboxStore,
  Thread,
  UserAccount,
  WebhookEvent
} from "@/lib/types";

/**
 * StorageDriver is the persistence contract Phase 4 implements twice:
 *   1. JSON driver — wraps `.data/inbox.json` (current behavior).
 *   2. Postgres driver — Drizzle queries against the schema in `db/schema.ts`.
 *
 * Phase 5.1 reminder-delivery methods (`listDueReminders`,
 * `markReminderDelivered`, `recordDeliveryFailure`) and the `Reminder.email`
 * field are intentionally part of this interface. The current `lib/db.ts` does
 * not yet implement them — Phase 4 (PR-B) and Phase 5.1 add them. Until then,
 * a structural conformance check against `lib/db.ts` will fail by design.
 */
export interface StorageDriver {
  // Reads
  getStore(): Promise<InboxStore>;
  getConnection(input: {
    provider: OAuthConnection["provider"];
    email?: string;
  }): Promise<OAuthConnection | undefined>;
  listConnections(): Promise<OAuthConnection[]>;
  listSubscriptions(): Promise<ProviderSubscription[]>;
  getSubscriptionByExternalId(
    provider: ProviderSubscription["provider"],
    externalId: string
  ): Promise<ProviderSubscription | undefined>;
  /** Phase 5.1 — reminders due for delivery (`dueAt <= now && !deliveredAt`). */
  listDueReminders(now: Date): Promise<Reminder[]>;

  // Writes
  saveStore(store: InboxStore): Promise<void>;
  clearStore(): Promise<InboxStore>;
  upsertSyncedInbox(input: {
    account: UserAccount;
    threads: Thread[];
    messages: Message[];
  }): Promise<InboxStore>;
  addReminder(reminder: Reminder): Promise<InboxStore>;
  deleteReminder(id: string): Promise<InboxStore>;
  updateReminder(id: string, patch: Partial<Pick<Reminder, "completed">>): Promise<InboxStore>;
  /** Phase 5.1 — sets `deliveredAt`. */
  markReminderDelivered(id: string, at: string): Promise<void>;
  /** Phase 5.1 — bumps `deliveryAttempts`, records `lastDeliveryError`. */
  recordDeliveryFailure(id: string, message: string): Promise<void>;
  upsertConnection(connection: OAuthConnection): Promise<InboxStore>;
  upsertSubscription(subscription: ProviderSubscription): Promise<InboxStore>;
  updateThreadStatus(
    threadId: string,
    status: Thread["status"],
    waitingOn?: string
  ): Promise<InboxStore>;
  addWebhookEvent(event: WebhookEvent): Promise<InboxStore>;

  // Pure helper, no I/O
  searchThreads(store: InboxStore, query: string): Array<{ thread: Thread; score: number }>;
}

/** Pure helper — strips access/refresh tokens from connections. Stays the same across drivers. */
export function sanitizeStore(store: InboxStore): SanitizedInboxStore {
  return {
    ...store,
    connections: store.connections.map(({ accessToken: _a, refreshToken: _r, ...rest }) => rest)
  };
}
