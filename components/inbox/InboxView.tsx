"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Archive,
  ArrowsClockwise,
  ArrowsOutLineHorizontal,
  ArrowUUpLeft,
  CaretLeft,
  CaretRight,
  CaretUp,
  EnvelopeOpen,
  EnvelopeSimple,
  FileText,
  MagnifyingGlass,
  PaperPlaneRight,
  PaperPlaneTilt,
  Paperclip,
  PencilSimple,
  Sparkle,
  Trash,
  Tray,
  X,
} from "@phosphor-icons/react";

import type { Message, MessageAttachment, SanitizedInboxStore, Thread } from "@/lib/types";
import { Skeleton, ThreadRowSkeleton } from "@/components/ui/skeleton";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function initials(value: string | undefined | null): string {
  if (!value) return "?";
  const cleaned = value.replace(/<[^>]+>/g, "").trim();
  const parts = cleaned.split(/[@\s.]+/).filter(Boolean);
  if (parts.length === 0) return cleaned.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function displayName(addr: string | undefined): string {
  if (!addr) return "Unknown";
  return addr.replace(/<[^>]+>/g, "").trim() || addr;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(Math.max(diffMs, 0) / (1000 * 60));
  const diffHours = Math.floor(Math.max(diffMs, 0) / (1000 * 60 * 60));
  const diffDays = Math.floor(Math.max(diffMs, 0) / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffHours < 12) return `${diffHours}h`;

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (isYesterday) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const normalized = trimmed.replace(/<[^>]+>/g, "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function isValidRecipientList(raw: string): boolean {
  const entries = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (entries.length === 0) return false;
  return entries.every(looksLikeEmail);
}

interface ThreadCardData {
  thread: Thread;
  latest: Message | undefined;
  unread: boolean;
}

function buildThreadCards(
  threads: Thread[],
  messagesById: Map<string, Message>
): ThreadCardData[] {
  return threads
    .map((thread) => {
      const msgs = thread.messageIds
        .map((id) => messagesById.get(id))
        .filter((m): m is Message => Boolean(m));
      const latest = msgs.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
      return {
        thread,
        latest,
        unread: msgs.some((m) => m.isUnread),
      };
    })
    .sort((a, b) =>
      (b.latest?.receivedAt ?? b.thread.lastMessageAt).localeCompare(
        a.latest?.receivedAt ?? a.thread.lastMessageAt
      )
    );
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

type NavId = "inbox" | "sent" | "drafts" | "archive" | "trash";

const navItems: Array<{ id: NavId; label: string; Icon: typeof Tray; iconWeight?: "fill" }> = [
  { id: "inbox", label: "Inbox", Icon: Tray, iconWeight: "fill" },
  { id: "sent", label: "Sent", Icon: PaperPlaneTilt },
  { id: "drafts", label: "Drafts", Icon: FileText },
  { id: "archive", label: "Archive", Icon: Archive },
  { id: "trash", label: "Trash", Icon: Trash },
];

const NAV_LABELS: Record<NavId, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  archive: "Archive",
  trash: "Trash",
};

function Sidebar({
  activeNav,
  setActiveNav,
  unreadCount,
  userEmail,
  userName,
  onSignOut,
  onCompose,
}: {
  activeNav: NavId;
  setActiveNav: (v: NavId) => void;
  unreadCount: number;
  userEmail: string | undefined;
  userName: string | undefined;
  onSignOut: () => void;
  onCompose: () => void;
}) {
  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <EnvelopeOpen size={24} weight="fill" className="text-purple-400" />
          <span className="font-bold text-lg tracking-tight text-slate-100">
            Mail<span className="text-purple-400">Copilot</span>
          </span>
        </div>
      </div>

      <div className="p-4">
        <button
          type="button"
          onClick={onCompose}
          className="w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-semibold rounded-lg h-9 px-4 flex items-center justify-center gap-2 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          <PencilSimple size={16} weight="bold" />
          New Message
        </button>
      </div>

      <div className="flex-1 overflow-y-auto inbox-scroll py-2 px-3 space-y-6">
        <nav className="space-y-1" aria-label="Main navigation">
          {navItems.map(({ id, label, Icon, iconWeight }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveNav(id)}
              aria-current={activeNav === id ? "page" : undefined}
              className={`flex items-center justify-between px-3 h-9 text-sm font-medium rounded-md w-full transition-colors ${
                activeNav === id
                  ? "bg-sky-900/40 text-sky-300"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} weight={iconWeight ?? "regular"} />
                {label}
              </div>
              {id === "inbox" && unreadCount > 0 && (
                <span className="bg-sky-900/40 text-sky-300 py-0.5 px-2 rounded-full text-xs">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center gap-3 w-full hover:bg-slate-800 active:bg-slate-700 p-2 rounded-md transition-colors"
          title="Sign out"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {initials(userName ?? userEmail)}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium text-slate-100 truncate">
              {userName ?? userEmail ?? "Signed in"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">{userEmail ?? ""}</div>
          </div>
          <CaretUp size={14} className="text-slate-500 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// ─── Email list panel ──────────────────────────────────────────────────────────

function EmailList({
  title,
  cards,
  selectedThreadId,
  setSelectedThreadId,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  syncing,
  onRefresh,
}: {
  title: string;
  cards: ThreadCardData[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeFilter: "all" | "unread";
  setActiveFilter: (v: "all" | "unread") => void;
  syncing: boolean;
  onRefresh: () => void;
}) {
  const filtered = cards.filter(({ thread, latest, unread }) => {
    if (activeFilter === "unread" && !unread) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(q) ||
      (latest?.from ?? "").toLowerCase().includes(q) ||
      (latest?.snippet ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-[380px] bg-slate-900 border-r border-slate-800 flex flex-col h-full flex-shrink-0 z-10">
      <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xl font-semibold text-slate-100">{title}</div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={syncing}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
            aria-label="Refresh inbox"
          >
            <ArrowsClockwise size={16} className={syncing ? "animate-spin" : undefined} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="inbox-search" className="sr-only">
            Search emails
          </label>
          <div className="relative group flex-1 min-w-0">
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
              aria-hidden="true"
            >
              <MagnifyingGlass
                size={16}
                className="text-slate-500 group-focus-within:text-sky-400 transition-colors"
              />
            </div>
            <input
              id="inbox-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-800 focus:ring-2 focus:ring-sky-400 focus:border-sky-400 text-sm transition-all"
              placeholder="Search emails..."
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center text-xs font-medium text-slate-400">
        <div className="flex items-center gap-4">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              aria-pressed={activeFilter === f}
              className={`flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-medium transition-colors ${
                activeFilter === f
                  ? "bg-slate-800 text-slate-100 font-semibold shadow-sm border border-slate-700"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              }`}
            >
              {f === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto inbox-scroll">
        {syncing && filtered.length === 0 ? (
          <div className="px-4 py-4 space-y-3" role="status" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <ThreadRowSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10">
            {cards.length === 0 ? (
              <div className="text-center text-sm text-slate-400">
                <div className="text-lg font-semibold text-slate-300">No messages yet.</div>
                <p className="mt-1 text-slate-500">
                  {cards.length === 0
                    ? `No messages are currently in ${title.toLowerCase()}.`
                    : "No matches found. Try a different search term."}
                </p>
              </div>
            ) : (
              <div className="text-center text-sm text-slate-500">No matches found.</div>
            )}
          </div>
        ) : (
          filtered.map(({ thread, latest, unread }) => (
            <div
              key={thread.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedThreadId(thread.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedThreadId(thread.id);
                }
              }}
              aria-selected={selectedThreadId === thread.id}
              aria-label={`Email from ${displayName(latest?.from)}: ${thread.subject}`}
              className={`relative px-4 py-4 border-b cursor-pointer transition-colors group ${
                selectedThreadId === thread.id
                  ? "border-sky-900/60 bg-sky-900/20 border-l-4 border-l-sky-400"
                  : "border-slate-800 hover:bg-slate-800/50"
              }`}
            >
              {unread && selectedThreadId !== thread.id && (
                <div
                  className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-sky-400"
                  aria-hidden="true"
                />
              )}
              <div className={selectedThreadId === thread.id ? "pl-1" : "pl-2"}>
                <div className="flex justify-between items-baseline mb-1">
                  <span
                    className={`text-sm leading-snug truncate pr-2 ${
                      unread ? "font-bold text-slate-100" : "font-medium text-slate-300"
                    }`}
                  >
                    {displayName(latest?.from)}
                  </span>
                  <span
                    className={`text-xs whitespace-nowrap ${
                      unread ? "font-medium text-sky-300" : "text-slate-500"
                    }`}
                  >
                    {latest ? formatTime(latest.receivedAt) : ""}
                  </span>
                </div>
                <div
                  className={`text-sm mb-1 truncate ${
                    unread ? "font-semibold text-slate-100" : "font-medium text-slate-200"
                  }`}
                >
                  {thread.subject || "(no subject)"}
                </div>
                <p className="text-sm text-slate-400 line-clamp-2 leading-normal">
                  {latest?.snippet ?? ""}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Reply composer ────────────────────────────────────────────────────────────

function ReplyComposer({
  recipientLabel,
  onDiscard,
  onSend,
  onError,
}: {
  recipientLabel: string;
  onDiscard: () => void;
  onSend: (text: string) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend(): Promise<void> {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await onSend(replyText);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  function requestDiscard() {
    if (!replyText.trim()) {
      onDiscard();
      return;
    }
    if (window.confirm("Discard this reply draft?")) onDiscard();
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.4)] z-20">
      <div className="max-w-4xl mx-auto p-4">
        <div className="border border-slate-700 rounded-xl bg-slate-900 shadow-sm focus-within:ring-2 focus-within:ring-sky-400 focus-within:border-sky-400 transition-all overflow-hidden flex flex-col">
          <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-800 bg-slate-900/60">
            Reply to <span className="text-slate-200">{recipientLabel}</span>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sending && replyText.trim()) {
                e.preventDefault();
                void handleSend();
              }
            }}
            className="w-full p-4 text-sm text-slate-200 placeholder-slate-500 bg-transparent border-none focus:outline-none focus:ring-0 resize-none min-h-[120px]"
            placeholder="Write a reply…"
            disabled={sending}
            aria-label={`Reply to ${recipientLabel}`}
          />

          <div className="px-4 py-3 bg-slate-900 flex justify-end items-center gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={requestDiscard}
              disabled={sending}
              className="h-9 px-3 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 active:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || replyText.trim().length === 0}
              className="inline-flex items-center gap-2 h-9 px-5 text-sm font-semibold text-white rounded-md transition-colors bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {sending ? "Sending…" : "Send"}
              <PaperPlaneRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compose dialog ────────────────────────────────────────────────────────────

function ComposeDialog({
  initial,
  onClose,
  onSent,
  onError,
}: {
  initial: { to: string; subject: string; body: string; threadId?: string };
  onClose: () => void;
  onSent: () => void;
  onError: (message: string) => void;
}) {
  const [to, setTo] = useState(initial.to);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [sending, setSending] = useState(false);

  const hasChanges = to !== initial.to || subject !== initial.subject || body !== initial.body;
  const canSend = isValidRecipientList(to);

  function requestClose() {
    if (hasChanges && !window.confirm("Discard this draft?")) return;
    onClose();
  }

  async function send(): Promise<void> {
    if (!canSend) {
      onError("Recipient must be a valid email address (example: person@example.com).");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body, threadId: initial.threadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Send failed");
      onSent();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-100">New Message</div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close compose"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto">
          <div className="flex items-center border-b border-slate-800 pb-2">
            <label htmlFor="compose-to" className="w-16 text-xs text-slate-500">
              To
            </label>
            <input
              id="compose-to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
              aria-invalid={to.length > 0 && !canSend}
              aria-describedby="compose-to-help"
            />
          </div>
          <p
            id="compose-to-help"
            className={`px-5 text-xs ${to.length > 0 && !canSend ? "text-red-300" : "text-slate-500"}`}
          >
            Use a valid email address, or comma-separated recipients.
          </p>
          <div className="flex items-center border-b border-slate-800 pb-2">
            <label htmlFor="compose-subject" className="w-16 text-xs text-slate-500">
              Subject
            </label>
            <input
              id="compose-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="(no subject)"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            />
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={12}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sending && canSend) {
                e.preventDefault();
                void send();
              }
            }}
            aria-label="Compose message body"
          />
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={requestClose}
            disabled={sending}
            className="h-9 px-3 text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !canSend}
            className="inline-flex items-center gap-2 h-9 px-5 text-sm font-semibold text-white rounded-md transition-colors bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {sending ? "Sending…" : "Send"}
            <PaperPlaneRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email body renderer ───────────────────────────────────────────────────────

const IFRAME_BASE_STYLES = `
  html, body { margin: 0; padding: 0; background: #0f172a; color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px; line-height: 1.6; word-wrap: break-word; }
  body { padding: 4px 0; }
  a { color: #7dd3fc; }
  img { max-width: 100%; height: auto; }
  table { max-width: 100%; }
  blockquote { border-left: 3px solid #334155; margin: 8px 0; padding: 0 0 0 12px; color: #94a3b8; }
  pre, code { background: #1e293b; padding: 2px 4px; border-radius: 4px; }
  pre { padding: 8px; overflow-x: auto; }
`;

function buildSrcDoc(html: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>${IFRAME_BASE_STYLES}</style></head><body>${html}</body></html>`;
}

function EmailBody({ message }: { message: Message }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState(120);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc?.body) return;
        const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
        if (h > 0) setHeight(h);
      } catch {
        // cross-origin shouldn't happen with srcDoc but be defensive
      }
    };

    const onLoad = () => {
      measure();
      const doc = iframe.contentDocument;
      if (!doc) return;
      const observer = new ResizeObserver(measure);
      observer.observe(doc.documentElement);
      doc.querySelectorAll("img").forEach((img) => {
        img.addEventListener("load", measure);
        img.addEventListener("error", measure);
      });
      iframe.dataset.observer = "1";
    };

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [message.bodyHtml]);

  if (message.bodyHtml) {
    return (
      <iframe
        ref={iframeRef}
        title={`Email body ${message.id}`}
        sandbox="allow-same-origin allow-popups"
        srcDoc={buildSrcDoc(message.bodyHtml)}
        style={{ width: "100%", border: "none", height, background: "transparent" }}
      />
    );
  }

  const text = message.bodyText ?? message.bodyPreview ?? message.snippet ?? "";
  return (
    <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
      {text || "(no preview available)"}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentsRow({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {attachments.map((att, i) => (
        <div
          key={`${att.filename}-${i}`}
          className="inline-flex items-center gap-2 h-8 px-3 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md"
        >
          <Paperclip size={12} className="text-slate-400" />
          <span className="truncate max-w-[200px]">{att.filename || att.mimeType}</span>
          <span className="text-slate-500">{formatBytes(att.size)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Email detail panel ────────────────────────────────────────────────────────

function EmailDetail({
  card,
  threadMessages,
  showComposer,
  setShowComposer,
  position,
  total,
  onPrev,
  onNext,
  onModify,
  onForward,
  onSendReply,
  onError,
  modifying,
  syncing,
}: {
  card: ThreadCardData | null;
  threadMessages: Message[];
  showComposer: boolean;
  setShowComposer: (v: boolean) => void;
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onModify: (action: "archive" | "trash" | "mark-unread") => void;
  onForward: (message: Message) => void;
  onSendReply: (text: string) => Promise<void>;
  onError: (message: string) => void;
  modifying: boolean;
  syncing: boolean;
}) {
  const latestMessage = threadMessages[threadMessages.length - 1];
  const replyTarget = latestMessage ? displayName(latestMessage.from) : "";
  return (
    <main className="flex-1 flex flex-col bg-slate-950 min-w-0 h-full relative">
      <header className="h-16 px-6 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-md p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => onModify("archive")}
              disabled={!card || modifying}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100 active:bg-slate-600 rounded transition-all disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Archive"
              title="Archive"
            >
              <Archive size={16} />
            </button>
            <button
              type="button"
              onClick={() => onModify("trash")}
              disabled={!card || modifying}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-red-400 active:bg-red-900/30 rounded transition-all disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Move to trash"
              title="Move to trash"
            >
              <Trash size={16} />
            </button>
            <button
              type="button"
              onClick={() => onModify("mark-unread")}
              disabled={!card || modifying}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-slate-100 active:bg-slate-600 rounded transition-all disabled:opacity-40 disabled:hover:bg-transparent"
              aria-label="Mark as unread"
              title="Mark as unread"
            >
              <EnvelopeSimple size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {total > 0 && (
            <span className="text-sm text-slate-400">
              {position} of {total}
            </span>
          )}
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={position <= 1}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Previous email"
            >
              <CaretLeft size={15} />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={position >= total}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700 rounded-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Next email"
            >
              <CaretRight size={15} />
            </button>
          </div>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto inbox-scroll bg-slate-950"
        style={{ paddingBottom: showComposer ? "260px" : "0" }}
      >
        {!card ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            <div className="text-center">
              <div className="text-base font-medium text-slate-300">No thread selected</div>
              <div className="mt-1">Select an email from the list to read messages.</div>
            </div>
          </div>
        ) : threadMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            {syncing ? (
              <div className="max-w-4xl w-full mx-auto px-8 py-8 space-y-4">
                <Skeleton width="45%" height="1.75rem" />
                <Skeleton height="10rem" />
                <Skeleton height="8rem" />
              </div>
            ) : (
              <div className="text-center">
                <div className="text-base font-medium text-slate-300">No messages available.</div>
                <div className="mt-1">This thread is currently empty.</div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
            <div className="text-2xl font-bold text-slate-100">
              {card.thread.subject || "(no subject)"}
            </div>

            <div className="space-y-6">
              {threadMessages.map((message, i) => {
                const isLatest = i === threadMessages.length - 1;
                return (
                  <div
                    key={message.id}
                    className={`border border-slate-800 rounded-xl bg-slate-900 shadow-sm overflow-hidden relative ${
                      isLatest ? "" : "opacity-90"
                    }`}
                  >
                    {isLatest && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-400" />
                    )}
                    <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 font-semibold text-sm flex-shrink-0">
                          {initials(message.from)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-semibold text-slate-100">
                              {displayName(message.from)}
                            </div>
                          </div>
                          {message.to.length > 0 && (
                            <div className="text-sm text-slate-400 mt-0.5">
                              to {message.to.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-400">
                          {formatFullDate(message.receivedAt)}
                        </span>
                        {isLatest && (
                          <button
                            type="button"
                            onClick={() => setShowComposer(true)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700 rounded transition-colors"
                            aria-label="Reply"
                            title="Reply"
                          >
                            <ArrowUUpLeft size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      <EmailBody message={message} />
                      {message.attachments && message.attachments.length > 0 && (
                        <AttachmentsRow attachments={message.attachments} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!showComposer && latestMessage && (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposer(true)}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 active:bg-slate-700 transition-colors shadow-sm"
                >
                  <ArrowUUpLeft size={16} /> Reply
                </button>
                <button
                  type="button"
                  onClick={() => onForward(latestMessage)}
                  className="inline-flex items-center gap-2 h-9 px-4 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:border-slate-600 active:bg-slate-700 transition-colors shadow-sm"
                >
                  <ArrowsOutLineHorizontal size={16} /> Forward
                </button>
              </div>
            )}

            <div className="h-8" />
          </div>
        )}
      </div>

      {showComposer && card && (
        <ReplyComposer
          recipientLabel={replyTarget || "this thread"}
          onDiscard={() => setShowComposer(false)}
          onSend={async (text) => {
            await onSendReply(text);
            setShowComposer(false);
          }}
          onError={onError}
        />
      )}
    </main>
  );
}

// ─── Sign-in gate ──────────────────────────────────────────────────────────────

function SignInGate({ error }: { error?: string }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-200">
      <div className="max-w-sm w-full px-6 py-8 rounded-xl border border-slate-800 bg-slate-900 text-center space-y-5">
        <div className="flex items-center justify-center gap-2 text-slate-100">
          <EnvelopeOpen size={28} weight="fill" className="text-purple-400" />
          <span className="font-bold text-xl">
            Mail<span className="text-purple-400">Copilot</span>
          </span>
        </div>
        <p className="text-sm text-slate-400">
          Sign in with your Google account to load your real Gmail inbox.
        </p>
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => signIn("google")}
          className="w-full bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-sm font-semibold rounded-lg h-10 px-4 flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <Sparkle size={16} weight="fill" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function AppToast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed bottom-4 right-4 max-w-sm px-4 py-3 rounded-lg bg-red-900/40 border border-red-900/60 text-red-200 text-xs shadow-lg z-30"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center text-red-300 hover:text-red-100"
      >
        <X size={12} />
      </button>
      <div className="font-semibold mb-1">Action failed</div>
      <div className="text-red-300/90 pr-4">{message}</div>
    </div>
  );
}

// ─── Root inbox view ───────────────────────────────────────────────────────────

interface ComposeState {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

export function InboxView() {
  const { data: session, status } = useSession();
  const [activeNav, setActiveNav] = useState<NavId>("inbox");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [showComposer, setShowComposer] = useState(false);
  const [store, setStore] = useState<SanitizedInboxStore | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [modifying, setModifying] = useState(false);
  const syncSeqRef = useRef(0);

  useEffect(() => {
    if (!toastError) return;
    const timer = window.setTimeout(() => setToastError(null), 5000);
    return () => window.clearTimeout(timer);
  }, [toastError]);

  function showToast(message: string): void {
    setToastError(message);
  }

  async function runSync(label: NavId = activeNav): Promise<void> {
    const seq = ++syncSeqRef.current;
    setSyncing(true);
    setToastError(null);
    try {
      const res = await fetch("/api/inbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", label }),
      });
      const data = await res.json();
      if (seq !== syncSeqRef.current) return;
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Sync failed");
      }
      setStore(data as SanitizedInboxStore);
    } catch (err) {
      if (seq !== syncSeqRef.current) return;
      showToast(err instanceof Error ? `Couldn’t sync Gmail: ${err.message}` : "Couldn’t sync Gmail");
    } finally {
      if (seq === syncSeqRef.current) setSyncing(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    setSelectedThreadId(null);
    setStore(null);
    setShowComposer(false);
    void runSync(activeNav);
  }, [status, activeNav]); // eslint-disable-line react-hooks/exhaustive-deps

  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of store?.messages ?? []) map.set(m.id, m);
    return map;
  }, [store]);

  const cards = useMemo(
    () => buildThreadCards(store?.threads ?? [], messagesById),
    [store, messagesById]
  );

  useEffect(() => {
    if (selectedThreadId && cards.some((c) => c.thread.id === selectedThreadId)) return;
    setSelectedThreadId(cards[0]?.thread.id ?? null);
  }, [cards, selectedThreadId]);

  const selectedCard = cards.find((c) => c.thread.id === selectedThreadId) ?? null;
  const selectedMessages: Message[] = selectedCard
    ? selectedCard.thread.messageIds
        .map((id) => messagesById.get(id))
        .filter((m): m is Message => Boolean(m))
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
    : [];

  const unreadCount = cards.filter((c) => c.unread).length;
  const position = selectedThreadId
    ? cards.findIndex((c) => c.thread.id === selectedThreadId) + 1
    : 0;

  function gotoPrev(): void {
    const idx = cards.findIndex((c) => c.thread.id === selectedThreadId);
    if (idx > 0) setSelectedThreadId(cards[idx - 1].thread.id);
  }
  function gotoNext(): void {
    const idx = cards.findIndex((c) => c.thread.id === selectedThreadId);
    if (idx >= 0 && idx < cards.length - 1) setSelectedThreadId(cards[idx + 1].thread.id);
  }

  function openNewMessage(): void {
    setToastError(null);
    setCompose({ to: "", subject: "", body: "" });
  }

  function openForward(message: Message): void {
    setToastError(null);
    const quoted = [
      "",
      "",
      "---------- Forwarded message ----------",
      `From: ${message.from}`,
      `Date: ${formatFullDate(message.receivedAt)}`,
      `Subject: ${message.subject}`,
      `To: ${message.to.join(", ")}`,
      "",
      message.bodyText ?? message.bodyPreview ?? message.snippet ?? "",
    ].join("\n");
    setCompose({
      to: "",
      subject: message.subject.startsWith("Fwd:") ? message.subject : `Fwd: ${message.subject}`,
      body: quoted,
    });
  }

  async function sendReply(text: string): Promise<void> {
    if (!selectedCard) throw new Error("No thread selected");
    const latest = selectedMessages[selectedMessages.length - 1];
    if (!latest) throw new Error("Thread has no messages");
    const subject = selectedCard.thread.subject.toLowerCase().startsWith("re:")
      ? selectedCard.thread.subject
      : `Re: ${selectedCard.thread.subject}`;
    const folderAtSend = activeNav;
    const res = await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: latest.from,
        subject,
        body: text,
        threadId: selectedCard.thread.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : "Send failed");
    void runSync(folderAtSend);
  }

  async function modifyThread(action: "archive" | "trash" | "mark-unread"): Promise<void> {
    if (!selectedThreadId) return;
    setModifying(true);
    setToastError(null);
    const folderAtAction = activeNav;
    try {
      const res = await fetch(
        `/api/threads/${encodeURIComponent(selectedThreadId)}/modify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : `${action} failed`);
      await runSync(folderAtAction);
    } catch (e) {
      showToast(e instanceof Error ? `${action} failed: ${e.message}` : `${action} failed`);
    } finally {
      setModifying(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        Loading…
      </div>
    );
  }

  if (status !== "authenticated") {
    return <SignInGate />;
  }

  return (
    <div className="inbox-page bg-slate-950 text-slate-200 h-screen w-screen overflow-hidden flex antialiased">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        unreadCount={unreadCount}
        userEmail={session?.user?.email ?? undefined}
        userName={session?.user?.name ?? undefined}
        onSignOut={() => signOut()}
        onCompose={openNewMessage}
      />
      <EmailList
        title={NAV_LABELS[activeNav]}
        cards={cards}
        selectedThreadId={selectedThreadId}
        setSelectedThreadId={(id) => {
          setSelectedThreadId(id);
          setShowComposer(false);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        syncing={syncing}
        onRefresh={() => void runSync(activeNav)}
      />
      <EmailDetail
        card={selectedCard}
        threadMessages={selectedMessages}
        showComposer={showComposer}
        setShowComposer={setShowComposer}
        position={position}
        total={cards.length}
        onPrev={gotoPrev}
        onNext={gotoNext}
        onModify={(action) => void modifyThread(action)}
        onForward={openForward}
        onSendReply={sendReply}
        onError={showToast}
        modifying={modifying}
        syncing={syncing}
      />
      {compose && (
        <ComposeDialog
          initial={compose}
          onClose={() => setCompose(null)}
          onError={showToast}
          onSent={() => {
            const folderAtSend = activeNav;
            setCompose(null);
            void runSync(folderAtSend);
          }}
        />
      )}
      {toastError && <AppToast message={toastError} onClose={() => setToastError(null)} />}
    </div>
  );
}
