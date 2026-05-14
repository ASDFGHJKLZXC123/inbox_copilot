export type ProviderType = "google" | "microsoft";

export type ThreadStatus = "needs_reply" | "waiting_on" | "done";

export interface UserAccount {
  id: string;
  email: string;
  name?: string;
  provider: ProviderType;
  lastSyncedAt?: string;
}

export interface OAuthConnection {
  id: string;
  email: string;
  provider: ProviderType;
  providerAccountId?: string;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpires?: number;
  scope?: string;
  tokenType?: string;
  updatedAt: string;
}

export interface ProviderSubscription {
  id: string;
  provider: ProviderType;
  email: string;
  externalId?: string;
  resourceId?: string;
  notificationUrl: string;
  clientState?: string;
  status: "active" | "expired" | "error";
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  provider: ProviderType;
  email?: string;
  receivedAt: string;
  eventType: string;
  note?: string;
}

export interface MessageAttachment {
  filename: string;
  mimeType: string;
  size: number;
}

export interface Message {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  snippet: string;
  bodyPreview: string;
  bodyHtml?: string;
  bodyText?: string;
  attachments?: MessageAttachment[];
  receivedAt: string;
  isUnread: boolean;
  labels: string[];
}

export interface Reminder {
  id: string;
  threadId: string;
  dueAt: string;
  reason: string;
  completed: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  participants: string[];
  messageIds: string[];
  lastMessageAt: string;
  status: ThreadStatus;
  waitingOn?: string;
}

export interface InboxStore {
  accounts: UserAccount[];
  connections: OAuthConnection[];
  messages: Message[];
  reminders: Reminder[];
  subscriptions: ProviderSubscription[];
  threads: Thread[];
  webhookEvents: WebhookEvent[];
}

export interface ThreadSummary {
  headline: string;
  action: string;
  bullets: string[];
}

export interface CopilotMeta {
  model?: string;
  source: "gemini" | "claude" | "fallback";
}

export type SanitizedInboxStore = Omit<InboxStore, "connections"> & {
  connections: Omit<OAuthConnection, "accessToken" | "refreshToken">[];
};

export interface ThreadSummaryResult {
  meta: CopilotMeta;
  summary: ThreadSummary;
}

export interface DraftOptions {
  tone: "concise" | "friendly" | "formal";
  askClarifyingQuestion: boolean;
}

export interface DraftReply {
  subject: string;
  body: string;
}

export interface DraftReplyResult {
  draft: DraftReply;
  meta: CopilotMeta;
}
