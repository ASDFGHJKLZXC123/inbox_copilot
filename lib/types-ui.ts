import type { Session } from "next-auth";

import type { Message, Thread } from "@/lib/types";

// ─── Toast ────────────────────────────────────────────────────────────
export type ToastVariant = "info" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
  retry?: () => void;
}

export interface ToastPushOptions {
  id?: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  retry?: () => void;
}

// ─── UI Session (next-auth → mockup shape adapter) ────────────────────
export interface UiSessionUser {
  email: string;
  name: string;
  initial: string;
}

export interface UiSession {
  status: "authenticated";
  user: UiSessionUser;
  authError?: string;
}

// ─── Thread card (UI projection) ──────────────────────────────────────
export interface ThreadCard {
  id: string;
  subject: string;
  preview: string;
  participants: string[];
  lastMessageAt: string;
  unreadCount: number;
  labels: string[];
  hasAttachment: boolean;
}

// ─── Search ───────────────────────────────────────────────────────────
export interface SearchResultApi {
  thread: Thread;
  score: number;
  unreadCount: number;
}

export interface SearchResult {
  thread: ThreadCard;
  score: number;
  unreadCount: number;
}

// ─── Live sync ────────────────────────────────────────────────────────
export type SyncStatus = "connected" | "refreshed" | "disconnected" | "off";

// ─── Navigation ───────────────────────────────────────────────────────
export type NavId = "inbox" | "sent" | "drafts" | "archive" | "trash";
export type ModifyAction = "archive" | "trash" | "mark-unread" | "mark-read";
export type Tone = "concise" | "friendly" | "formal";
export type ComposeMode = "new" | "forward" | "reply";

// ─── Adapters ─────────────────────────────────────────────────────────
export function toUiSession(s: Session | null): UiSession | null {
  if (s?.user?.email == null) return null;
  const name = s.user.name?.trim() || s.user.email.split("@")[0];
  return {
    status: "authenticated",
    user: {
      email: s.user.email,
      name,
      initial: name[0]?.toUpperCase() ?? "?",
    },
    authError: s.authError,
  };
}

export function toThreadCard(thread: Thread, allMessages: Message[]): ThreadCard {
  const tm = allMessages
    .filter((m) => m.threadId === thread.id)
    .slice()
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  const latest = tm[tm.length - 1];
  const unreadCount = tm.filter((m) => m.isUnread).length;
  const labels = Array.from(new Set(tm.flatMap((m) => m.labels.map((l) => l.toUpperCase()))));
  return {
    id: thread.id,
    subject: thread.subject,
    preview: latest?.bodyPreview ?? latest?.snippet ?? "",
    participants: thread.participants,
    lastMessageAt: thread.lastMessageAt,
    unreadCount,
    labels,
    hasAttachment: tm.some((m) => (m.attachments?.length ?? 0) > 0),
  };
}

export function buildThreadCards(threads: Thread[], messages: Message[]): ThreadCard[] {
  const byThread = new Map<string, Message[]>();
  for (const m of messages) {
    const list = byThread.get(m.threadId) ?? [];
    list.push(m);
    byThread.set(m.threadId, list);
  }
  return threads.map((t) => {
    const tm = (byThread.get(t.id) ?? [])
      .slice()
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    const latest = tm[tm.length - 1];
    const unreadCount = tm.filter((m) => m.isUnread).length;
    const labels = Array.from(new Set(tm.flatMap((m) => m.labels.map((l) => l.toUpperCase()))));
    return {
      id: t.id,
      subject: t.subject,
      preview: latest?.bodyPreview ?? latest?.snippet ?? "",
      participants: t.participants,
      lastMessageAt: t.lastMessageAt,
      unreadCount,
      labels,
      hasAttachment: tm.some((m) => (m.attachments?.length ?? 0) > 0),
    };
  });
}
