"use client";

import { signIn } from "next-auth/react";
import { ThreadList } from "@/components/thread-list";
import type { InboxStore, Reminder, Thread } from "@/lib/types";

interface SearchResult {
  thread: InboxStore["threads"][number];
  score: number;
  unreadCount: number;
}

interface SidebarPanelsProps {
  syncEmail: string;
  onSyncEmailChange: (value: string) => void;
  onSyncGoogle: () => void;
  onClearCache: () => void;
  /** True while a Gmail sync is in flight — shows loading skeleton in thread list. */
  syncPending?: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  searchPending: boolean;
  searchResults: SearchResult[];
  threads: Thread[];
  reminders: Reminder[];
  selectedThreadId: string | null;
  onSelectThread: (id: string) => void;
}

export function SidebarPanels({
  syncEmail,
  onSyncEmailChange,
  onSyncGoogle,
  onClearCache,
  syncPending = false,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  searchPending,
  searchResults,
  threads,
  reminders,
  selectedThreadId,
  onSelectThread,
}: SidebarPanelsProps) {
  const hasSearchResults = searchResults.length > 0;

  return (
    <aside className="sidebar" style={{ paddingRight: "20px" }}>
      {/* ── Inbox Sync ──────────────────────────────────────────────────── */}
      <div className="panel search-panel">
        <p className="panel-label">Inbox Sync</p>
        <input
          className="input"
          value={syncEmail}
          onChange={(e) => onSyncEmailChange(e.target.value)}
          placeholder="Inbox email"
        />
        <div className="inline-actions">
          <button
            onClick={onSyncGoogle}
            className="button"
            type="button"
            disabled={syncPending}
            style={{ opacity: syncPending ? 0.65 : 1 }}
          >
            {syncPending ? "Syncing…" : "Sync Gmail"}
          </button>
          <button onClick={onClearCache} className="secondary-button" type="button">
            Delete All Data
          </button>
        </div>
        <p className="muted">Sign in with Google above, then sync Gmail.</p>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="panel">
        <p className="panel-label">Search</p>
        <div className="inline-actions">
          <input
            className="input"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Keyword search"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
          <button
            className="button"
            type="button"
            onClick={onSearch}
            disabled={searchPending}
            style={{ opacity: searchPending ? 0.65 : 1 }}
          >
            {searchPending ? "…" : "Find"}
          </button>
        </div>

        {/* Search results list */}
        {hasSearchResults ? (
          <div className="results">
            {searchResults.map((r) => (
              <button
                key={r.thread.id}
                className="result"
                type="button"
                onClick={() => onSelectThread(r.thread.id)}
                style={{
                  background:
                    r.thread.id === selectedThreadId
                      ? "var(--accent-soft)"
                      : undefined,
                  borderColor:
                    r.thread.id === selectedThreadId
                      ? "rgba(161, 67, 31, 0.4)"
                      : undefined,
                }}
              >
                <span>{r.thread.subject}</span>
                <span className="muted">
                  score {r.score} · unread {r.unreadCount}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">
            Keyword-first today; add vector search beside this route next.
          </p>
        )}
      </div>

      {/* ── Thread list ─────────────────────────────────────────────────── */}
      <div className="panel thread-panel">
        <p className="panel-label">
          Threads
          {threads.length > 0 ? (
            <span
              style={{
                marginLeft: "8px",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "#6d625a",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {threads.length}
            </span>
          ) : null}
        </p>
        <ThreadList
          threads={threads}
          reminders={reminders}
          selectedId={selectedThreadId}
          onSelect={onSelectThread}
          loading={syncPending}
          searchQuery={hasSearchResults ? searchQuery : ""}
          isSearchResult={hasSearchResults}
          onConnectAccount={() => void signIn("google")}
        />
      </div>
    </aside>
  );
}
