import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  InboxStore,
  Message,
  OAuthConnection,
  ProviderSubscription,
  Reminder,
  Thread,
  UserAccount,
  WebhookEvent
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "inbox.json");

const seedStore: InboxStore = {
  accounts: [],
  connections: [],
  messages: [
    {
      id: "msg_seed_1",
      threadId: "thread_seed_1",
      subject: "Q2 hiring plan review",
      from: "alex@acme.co",
      to: ["you@example.com"],
      snippet: "Can you confirm the hiring plan before Thursday's meeting?",
      bodyPreview:
        "We need a fast call on engineering headcount. Please send your updated recommendation and any open risks.",
      receivedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      isUnread: true,
      labels: ["important", "work"]
    },
    {
      id: "msg_seed_2",
      threadId: "thread_seed_1",
      subject: "Re: Q2 hiring plan review",
      from: "you@example.com",
      to: ["alex@acme.co"],
      snippet: "I can send the updated plan this afternoon.",
      bodyPreview:
        "I am tightening the hiring plan and will send the updated recommendation, including tradeoffs, later today.",
      receivedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      isUnread: false,
      labels: ["sent"]
    },
    {
      id: "msg_seed_3",
      threadId: "thread_seed_2",
      subject: "Customer renewal contract",
      from: "finance@northstar.io",
      to: ["you@example.com"],
      snippet: "Waiting on legal approval before we can sign.",
      bodyPreview:
        "We are aligned on pricing, but legal still needs to review the revised language. We expect to have an update next week.",
      receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      isUnread: false,
      labels: ["finance"]
    }
  ],
  reminders: [
    {
      id: "reminder_seed_1",
      threadId: "thread_seed_2",
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
      reason: "Follow up if legal has not responded",
      completed: false
    }
  ],
  subscriptions: [],
  threads: [
    {
      id: "thread_seed_1",
      subject: "Q2 hiring plan review",
      participants: ["alex@acme.co", "you@example.com"],
      messageIds: ["msg_seed_2", "msg_seed_1"],
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      status: "needs_reply"
    },
    {
      id: "thread_seed_2",
      subject: "Customer renewal contract",
      participants: ["finance@northstar.io", "you@example.com"],
      messageIds: ["msg_seed_3"],
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      status: "waiting_on",
      waitingOn: "Legal approval from Northstar"
    }
  ],
  webhookEvents: []
};

const emptyStore: InboxStore = {
  accounts: [],
  connections: [],
  messages: [],
  reminders: [],
  subscriptions: [],
  threads: [],
  webhookEvents: []
};

function normalizeStore(store: Partial<InboxStore>): InboxStore {
  return {
    accounts: store.accounts ?? [],
    connections: store.connections ?? [],
    messages: store.messages ?? [],
    reminders: store.reminders ?? [],
    subscriptions: store.subscriptions ?? [],
    threads: store.threads ?? [],
    webhookEvents: store.webhookEvents ?? []
  };
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(STORE_PATH, "utf8");
  } catch {
    await writeFile(STORE_PATH, JSON.stringify(seedStore, null, 2), "utf8");
  }
}

export async function getStore(): Promise<InboxStore> {
  await ensureStore();
  const raw = await readFile(STORE_PATH, "utf8");
  return normalizeStore(JSON.parse(raw) as Partial<InboxStore>);
}

export async function saveStore(store: InboxStore): Promise<void> {
  await ensureStore();
  await writeFile(STORE_PATH, JSON.stringify(normalizeStore(store), null, 2), "utf8");
}

export async function clearStore(): Promise<InboxStore> {
  await saveStore(emptyStore);
  return emptyStore;
}

export function sanitizeStore(store: InboxStore): InboxStore {
  return {
    ...store,
    connections: store.connections.map((connection) => ({
      ...connection,
      accessToken: undefined,
      refreshToken: undefined
    }))
  };
}

function mergeThread(existing: Thread | undefined, incoming: Thread): Thread {
  if (!existing) {
    return incoming;
  }

  const messageIds = Array.from(new Set([...existing.messageIds, ...incoming.messageIds]));

  return {
    ...existing,
    ...incoming,
    messageIds
  };
}

function mergeMessage(existing: Message | undefined, incoming: Message): Message {
  return existing ? { ...existing, ...incoming } : incoming;
}

function mergeConnection(existing: OAuthConnection | undefined, incoming: OAuthConnection): OAuthConnection {
  return existing ? { ...existing, ...incoming, updatedAt: incoming.updatedAt } : incoming;
}

function mergeSubscription(
  existing: ProviderSubscription | undefined,
  incoming: ProviderSubscription
): ProviderSubscription {
  return existing ? { ...existing, ...incoming, updatedAt: incoming.updatedAt } : incoming;
}

export async function upsertSyncedInbox(input: {
  account: UserAccount;
  threads: Thread[];
  messages: Message[];
}): Promise<InboxStore> {
  const store = await getStore();
  const accounts = [...store.accounts];
  const accountIndex = accounts.findIndex(
    (account) => account.email === input.account.email && account.provider === input.account.provider
  );

  if (accountIndex >= 0) {
    accounts[accountIndex] = { ...accounts[accountIndex], ...input.account };
  } else {
    accounts.push(input.account);
  }

  const messageMap = new Map(store.messages.map((message) => [message.id, message]));
  for (const message of input.messages) {
    messageMap.set(message.id, mergeMessage(messageMap.get(message.id), message));
  }

  const threadMap = new Map(store.threads.map((thread) => [thread.id, thread]));
  for (const thread of input.threads) {
    threadMap.set(thread.id, mergeThread(threadMap.get(thread.id), thread));
  }

  const nextStore: InboxStore = {
    ...store,
    accounts,
    messages: Array.from(messageMap.values()).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    threads: Array.from(threadMap.values()).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  };

  await saveStore(nextStore);
  return nextStore;
}

export async function addReminder(reminder: Reminder): Promise<InboxStore> {
  const store = await getStore();
  const nextStore: InboxStore = {
    ...store,
    reminders: [reminder, ...store.reminders]
  };
  await saveStore(nextStore);
  return nextStore;
}

export async function upsertConnection(connection: OAuthConnection): Promise<InboxStore> {
  const store = await getStore();
  const connectionMap = new Map(store.connections.map((item) => [item.id, item]));
  connectionMap.set(connection.id, mergeConnection(connectionMap.get(connection.id), connection));

  const nextStore: InboxStore = {
    ...store,
    connections: Array.from(connectionMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  };

  await saveStore(nextStore);
  return nextStore;
}

export async function getConnection(input: {
  provider: OAuthConnection["provider"];
  email?: string;
}): Promise<OAuthConnection | undefined> {
  const store = await getStore();

  return store.connections.find((connection) => {
    if (connection.provider !== input.provider) {
      return false;
    }

    if (!input.email) {
      return true;
    }

    return connection.email.toLowerCase() === input.email.toLowerCase();
  });
}

export async function listConnections(): Promise<OAuthConnection[]> {
  const store = await getStore();
  return store.connections;
}

export async function upsertSubscription(subscription: ProviderSubscription): Promise<InboxStore> {
  const store = await getStore();
  const subscriptionMap = new Map(store.subscriptions.map((item) => [item.id, item]));
  subscriptionMap.set(subscription.id, mergeSubscription(subscriptionMap.get(subscription.id), subscription));

  const nextStore: InboxStore = {
    ...store,
    subscriptions: Array.from(subscriptionMap.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  };

  await saveStore(nextStore);
  return nextStore;
}

export async function listSubscriptions(): Promise<ProviderSubscription[]> {
  const store = await getStore();
  return store.subscriptions;
}

export async function getSubscriptionByExternalId(
  provider: ProviderSubscription["provider"],
  externalId: string
): Promise<ProviderSubscription | undefined> {
  const store = await getStore();
  return store.subscriptions.find(
    (subscription) => subscription.provider === provider && subscription.externalId === externalId
  );
}

export async function addWebhookEvent(event: WebhookEvent): Promise<InboxStore> {
  const store = await getStore();
  const nextStore: InboxStore = {
    ...store,
    webhookEvents: [event, ...store.webhookEvents].slice(0, 100)
  };

  await saveStore(nextStore);
  return nextStore;
}
