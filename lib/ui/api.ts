import type {
  DraftReply,
  DraftReplyResult,
  ProviderSubscription,
  ProviderType,
  Reminder,
  SanitizedInboxStore,
  ThreadSummaryResult,
} from "@/lib/types";
import type { ModifyAction, NavId, SearchResultApi, Tone } from "@/lib/types-ui";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON; fall back to status line.
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface Api {
  getInbox(): Promise<SanitizedInboxStore>;
  syncInbox(body: { provider: ProviderType; email?: string; label?: NavId }): Promise<SanitizedInboxStore>;
  clearCache(): Promise<SanitizedInboxStore>;

  listSubscriptions(): Promise<ProviderSubscription[]>;
  renewSubscription(body: { provider: ProviderType; email: string }): Promise<ProviderSubscription[]>;

  summarizeThread(threadId: string): Promise<ThreadSummaryResult>;
  draftReply(threadId: string, body: { tone: Tone; askClarifyingQuestion: boolean }): Promise<DraftReplyResult>;
  reviseDraft(threadId: string, body: { draft: DraftReply; instruction: string }): Promise<DraftReplyResult>;
  modifyThread(threadId: string, body: { action: ModifyAction }): Promise<{ ok: true }>;

  createReminder(body: { threadId: string; dueAt: string; reason: string }): Promise<Reminder[]>;
  completeReminder(id: string, body: { completed: boolean }): Promise<SanitizedInboxStore>;
  deleteReminder(id: string): Promise<SanitizedInboxStore>;

  search(query: string): Promise<SearchResultApi[]>;
  send(body: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    threadId?: string;
  }): Promise<{ ok: true }>;
}

export const api: Api = {
  getInbox: () => request<SanitizedInboxStore>("/api/inbox/sync"),

  syncInbox: (body) =>
    request<SanitizedInboxStore>("/api/inbox/sync", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  clearCache: () => request<SanitizedInboxStore>("/api/inbox/cache", { method: "DELETE" }),

  listSubscriptions: () => request<ProviderSubscription[]>("/api/inbox/subscriptions"),

  renewSubscription: (body) =>
    request<ProviderSubscription[]>("/api/inbox/subscriptions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  summarizeThread: (threadId) =>
    request<ThreadSummaryResult>(`/api/threads/${encodeURIComponent(threadId)}/summary`, {
      method: "POST",
    }),

  draftReply: (threadId, body) =>
    request<DraftReplyResult>(`/api/threads/${encodeURIComponent(threadId)}/draft`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  reviseDraft: (threadId, body) =>
    request<DraftReplyResult>(`/api/threads/${encodeURIComponent(threadId)}/draft/revise`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  modifyThread: (threadId, body) =>
    request<{ ok: true }>(`/api/threads/${encodeURIComponent(threadId)}/modify`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createReminder: (body) =>
    request<Reminder[]>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  completeReminder: (id, body) =>
    request<SanitizedInboxStore>(`/api/reminders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  deleteReminder: (id) =>
    request<SanitizedInboxStore>(`/api/reminders/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),

  search: (query) =>
    request<SearchResultApi[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query }),
    }),

  send: (body) =>
    request<{ ok: true }>("/api/send", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
