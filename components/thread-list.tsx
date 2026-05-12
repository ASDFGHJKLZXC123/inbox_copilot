"use client";

import { useMemo } from "react";
import type { Reminder, Thread } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { ThreadRowSkeleton } from "@/components/ui/skeleton";

interface ThreadListProps {
  threads: Thread[];
  reminders: Reminder[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Pass true while an inbox sync is in flight. */
  loading?: boolean;
  /** If provided, shows a "no results" empty state instead of the default one. */
  searchQuery?: string;
  /** When true the list is the result of a search (may be empty). */
  isSearchResult?: boolean;
  onConnectAccount?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Returns true when any message in a thread has been tagged as unread.
 *  Because Thread itself does not carry unreadCount we derive it from the
 *  thread status — the server marks `needs_reply` threads as "unread" for
 *  display purposes.  Callers may override by passing explicit unread IDs. */
function isUnread(thread: Thread): boolean {
  return thread.status === "needs_reply";
}

export function ThreadList({
  threads,
  reminders,
  selectedId,
  onSelect,
  loading = false,
  searchQuery = "",
  isSearchResult = false,
  onConnectAccount,
}: ThreadListProps) {
  // Sort threads by most recent message, memoized so it only re-runs when the
  // threads array reference changes (i.e. after a sync).
  const sortedThreads = useMemo(
    () =>
      [...threads].sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      ),
    [threads]
  );

  // Build a Set of threadIds that have at least one pending reminder so the
  // lookup inside the render loop is O(1).
  const pendingReminderThreadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of reminders) {
      if (!r.completed) ids.add(r.threadId);
    }
    return ids;
  }, [reminders]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="thread-list" style={{ display: "grid", gap: "10px" }} aria-busy="true" aria-label="Loading threads">
        {Array.from({ length: 5 }).map((_, i) => (
          <ThreadRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  // ── Empty: search returned nothing ────────────────────────────────────────
  if (isSearchResult && sortedThreads.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title={searchQuery ? `No results for "${searchQuery}"` : "No results"}
        description="Try different keywords or check your spelling."
      />
    );
  }

  // ── Empty: inbox has no threads at all ────────────────────────────────────
  if (sortedThreads.length === 0) {
    return (
      <EmptyState
        icon="📬"
        title="Your inbox is empty"
        description="Connect a Google or Microsoft account to sync your mail."
        action={
          onConnectAccount
            ? { label: "Connect Account", onClick: onConnectAccount }
            : undefined
        }
      />
    );
  }

  // ── Thread list ────────────────────────────────────────────────────────────
  return (
    <div className="thread-list">
      {sortedThreads.map((thread) => {
        const active = thread.id === selectedId;
        const unread = isUnread(thread);
        const hasReminder = pendingReminderThreadIds.has(thread.id);

        return (
          <button
            key={thread.id}
            type="button"
            className="thread-item"
            onClick={() => onSelect(thread.id)}
            style={{
              // Selected: warm tinted background + left accent border
              background: active ? "var(--accent-soft, #f0d6c6)" : "rgba(255, 255, 255, 0.56)",
              borderColor: active ? "rgba(161, 67, 31, 0.45)" : "rgba(77, 54, 34, 0.14)",
              borderLeftWidth: active ? "3px" : "1px",
              borderLeftColor: active ? "#a1431f" : "rgba(77, 54, 34, 0.14)",
              paddingLeft: active ? "11px" : "13px", // compensate for the wider border
              transition: "background 0.15s ease, border-color 0.15s ease",
            }}
            aria-pressed={active}
          >
            {/* Subject row: unread dot + subject text + reminder badge */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
              }}
            >
              {/* Unread dot */}
              {unread ? (
                <span
                  aria-label="Unread"
                  style={{
                    display: "inline-block",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#2563eb",
                    flexShrink: 0,
                  }}
                />
              ) : null}

              {/* Subject */}
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: unread ? 700 : 400,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {thread.subject}
              </span>

              {/* Reminder indicator */}
              {hasReminder ? (
                <span
                  aria-label="Pending reminder"
                  title="Reminder scheduled"
                  style={{
                    fontSize: "0.8rem",
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  🔔
                </span>
              ) : null}
            </span>

            {/* Meta row */}
            <span
              className="muted"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.8rem",
              }}
            >
              {thread.status.replace("_", " ")} · {formatDate(thread.lastMessageAt)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
