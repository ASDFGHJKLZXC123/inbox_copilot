import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["google", "microsoft"]);
export const threadStatusEnum = pgEnum("thread_status", ["needs_reply", "waiting_on", "done"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "error"]);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name"),
    provider: providerEnum("provider").notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
  },
  (t) => ({
    uniqEmailProvider: uniqueIndex("accounts_email_provider_uniq").on(t.email, t.provider)
  })
);

export const connections = pgTable(
  "connections",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    provider: providerEnum("provider").notNull(),
    providerAccountId: text("provider_account_id"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpires: integer("access_token_expires"),
    scope: text("scope"),
    tokenType: text("token_type"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
  },
  (t) => ({
    uniqEmailProvider: uniqueIndex("connections_email_provider_uniq").on(t.email, t.provider)
  })
);

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  provider: providerEnum("provider").notNull(),
  email: text("email").notNull(),
  externalId: text("external_id"),
  resourceId: text("resource_id"),
  notificationUrl: text("notification_url").notNull(),
  clientState: text("client_state"),
  status: subscriptionStatusEnum("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  participants: jsonb("participants").$type<string[]>().notNull(),
  messageIds: jsonb("message_ids").$type<string[]>().notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull(),
  status: threadStatusEnum("status").notNull(),
  waitingOn: text("waiting_on")
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  subject: text("subject").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddresses: jsonb("to_addresses").$type<string[]>().notNull(),
  snippet: text("snippet").notNull(),
  bodyPreview: text("body_preview").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  isUnread: boolean("is_unread").notNull(),
  labels: jsonb("labels").$type<string[]>().notNull()
});

export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  email: text("email").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
  completed: boolean("completed").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  lastDeliveryError: text("last_delivery_error")
});

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: providerEnum("provider").notNull(),
  email: text("email"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  eventType: text("event_type").notNull(),
  note: text("note")
});
