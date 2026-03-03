"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

import {
  DraftReply,
  DraftReplyResult,
  InboxStore,
  ThreadSummary,
  ThreadSummaryResult
} from "@/lib/types";

interface SearchResult {
  thread: InboxStore["threads"][number];
  score: number;
  unreadCount: number;
}

const defaultSummary: ThreadSummary | null = null;
const defaultDraft: DraftReply | null = null;

export function Dashboard({ initialStore }: { initialStore: InboxStore }) {
  const { data: session, status: sessionStatus } = useSession();
  const [store, setStore] = useState(initialStore);
  const [selectedThreadId, setSelectedThreadId] = useState(initialStore.threads[0]?.id ?? "");
  const [summary, setSummary] = useState<ThreadSummary | null>(defaultSummary);
  const [draft, setDraft] = useState<DraftReply | null>(defaultDraft);
  const [summarySource, setSummarySource] = useState<string>("");
  const [draftSource, setDraftSource] = useState<string>("");
  const [draftEditInstruction, setDraftEditInstruction] = useState("");
  const [tone, setTone] = useState<"concise" | "friendly" | "formal">("concise");
  const [askClarifyingQuestion, setAskClarifyingQuestion] = useState(false);
  const [syncEmail, setSyncEmail] = useState("you@example.com");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [reminderDate, setReminderDate] = useState("");
  const [reminderReason, setReminderReason] = useState("Follow up if no reply");
  const [status, setStatus] = useState("Ready");
  const [isPending, startTransition] = useTransition();

  const selectedThread = store.threads.find((thread) => thread.id === selectedThreadId) ?? store.threads[0];
  const selectedMessages = store.messages.filter((message) => message.threadId === selectedThread?.id);
  const selectedReminders = store.reminders.filter((reminder) => reminder.threadId === selectedThread?.id);

  useEffect(() => {
    if (!selectedThread && store.threads[0]) {
      setSelectedThreadId(store.threads[0].id);
    }
  }, [selectedThread, store.threads]);

  useEffect(() => {
    if (session?.user?.email) {
      setSyncEmail(session.user.email);
    }
  }, [session?.user?.email]);

  async function syncGoogle() {
    setStatus("Syncing google inbox...");

    const response = await fetch("/api/inbox/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ provider: "google", email: syncEmail })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Sync failed: ${payload.error}` : "Sync failed");
      return;
    }

    const nextStore = (await response.json()) as InboxStore;
    setStore(nextStore);
    setSelectedThreadId((current) => current || nextStore.threads[0]?.id || "");
    setStatus("Google inbox synced");
  }

  async function clearCache() {
    const confirmed = window.confirm(
      "This will permanently delete ALL your data:\n\n" +
      "• Synced emails, threads, and messages\n" +
      "• OAuth connections and saved tokens\n" +
      "• Reminders and webhook subscriptions\n" +
      "• Search history and webhook event logs\n\n" +
      "You will be signed out. Continue?"
    );
    if (!confirmed) {
      return;
    }

    setStatus("Deleting all user data...");
    const response = await fetch("/api/inbox/cache", {
      method: "DELETE"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Clear failed: ${payload.error}` : "Clear failed");
      return;
    }

    const nextStore = (await response.json()) as InboxStore;
    setStore(nextStore);
    setSelectedThreadId("");
    setSummary(null);
    setDraft(null);
    setSummarySource("");
    setDraftSource("");
    setDraftEditInstruction("");
    setSearchResults([]);
    setSearchQuery("");
    setReminderDate("");
    setReminderReason("Follow up if no reply");
    setSyncEmail("you@example.com");
    setStatus("All data deleted");
    await signOut({ redirect: false });
  }

  async function generateSummary() {
    if (!selectedThread) {
      return;
    }

    setStatus("Generating summary...");
    const response = await fetch(`/api/threads/${selectedThread.id}/summary`, { method: "POST" });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Summary failed: ${payload.error}` : "Summary failed");
      return;
    }
    const payload = (await response.json()) as ThreadSummaryResult;
    setSummary(payload.summary);
    setSummarySource(payload.meta.model ? `${payload.meta.source} (${payload.meta.model})` : payload.meta.source);
    setStatus("Summary ready");
  }

  async function generateDraft() {
    if (!selectedThread) {
      return;
    }

    setStatus("Drafting reply...");
    const response = await fetch(`/api/threads/${selectedThread.id}/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ tone, askClarifyingQuestion })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Draft failed: ${payload.error}` : "Draft failed");
      return;
    }
    const payload = (await response.json()) as DraftReplyResult;
    setDraft(payload.draft);
    setDraftSource(payload.meta.model ? `${payload.meta.source} (${payload.meta.model})` : payload.meta.source);
    setStatus("Draft ready");
  }

  async function createReminder() {
    if (!selectedThread || !reminderDate) {
      return;
    }

    setStatus("Scheduling reminder...");
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        threadId: selectedThread.id,
        dueAt: new Date(reminderDate).toISOString(),
        reason: reminderReason
      })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Reminder failed: ${payload.error}` : "Reminder failed");
      return;
    }
    const reminders = (await response.json()) as InboxStore["reminders"];
    setStore((current) => ({ ...current, reminders }));
    setStatus("Reminder scheduled");
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setStatus("Searching...");
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: searchQuery })
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Search failed: ${payload.error}` : "Search failed");
      return;
    }
    setSearchResults((await response.json()) as SearchResult[]);
    setStatus("Search ready");
  }

  async function copyDraft() {
    if (!draft?.body) {
      setStatus("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(draft.body);
      setStatus("Draft copied");
    } catch {
      setStatus("Copy failed");
    }
  }

  async function applyDraftEdit() {
    if (!selectedThread || !draft) {
      setStatus("Generate a draft first");
      return;
    }

    if (!draftEditInstruction.trim()) {
      setStatus("Add an edit instruction first");
      return;
    }

    setStatus("Applying draft edit...");
    const response = await fetch(`/api/threads/${selectedThread.id}/draft/revise`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentDraft: draft,
        instruction: draftEditInstruction
      })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(payload?.error ? `Edit failed: ${payload.error}` : "Edit failed");
      return;
    }

    const payload = (await response.json()) as DraftReplyResult;
    setDraft(payload.draft);
    setDraftSource(payload.meta.model ? `${payload.meta.source} (${payload.meta.model})` : payload.meta.source);
    setStatus("Draft updated");
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">AI Inbox Copilot</p>
        <div className="hero-grid">
          <div>
            <h1>Clear the inbox with summaries, drafts, reminders, and fast search.</h1>
            <p className="subtle">
              OAuth is wired with Auth.js for Google and Microsoft, inbox sync is stored locally, and the copilot
              layer is structured so real provider APIs and embeddings can drop in next.
            </p>
          </div>
          <div className="auth-card">
            <p>OAuth sign-in</p>
            <div className="stack">
              <button onClick={() => signIn("google")} className="secondary-button" type="button">
                Connect Google
              </button>
            </div>
            <p className="muted">
              {sessionStatus === "authenticated"
                ? `Signed in as ${session?.user?.email ?? "unknown"} via ${session?.user?.provider ?? "provider"}.`
                : "Set Google client IDs in `.env.local`, then sign in before syncing a live inbox."}
            </p>
            {session?.authError ? <p className="muted">Auth token refresh issue: {session.authError}</p> : null}
          </div>
        </div>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <div className="panel search-panel">
            <p className="panel-label">Inbox Sync</p>
            <input
              className="input"
              value={syncEmail}
              onChange={(event) => setSyncEmail(event.target.value)}
              placeholder="Inbox email"
            />
            <div className="inline-actions">
              <button onClick={() => void syncGoogle()} className="button" type="button">
                Sync Gmail
              </button>
              <button onClick={() => void clearCache()} className="secondary-button" type="button">
                Delete All Data
              </button>
            </div>
            <p className="muted">Sign in with Google above, then sync Gmail.</p>
          </div>

          <div className="panel">
            <p className="panel-label">Search</p>
            <div className="inline-actions">
              <input
                className="input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Keyword search"
              />
              <button
                className="button"
                type="button"
                onClick={() => startTransition(() => void runSearch())}
                disabled={isPending}
              >
                Find
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="results">
                {searchResults.map((result) => (
                  <button
                    key={result.thread.id}
                    className="result"
                    type="button"
                    onClick={() => setSelectedThreadId(result.thread.id)}
                  >
                    <span>{result.thread.subject}</span>
                    <span className="muted">
                      score {result.score} · unread {result.unreadCount}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">Keyword-first today; add vector search beside this route next.</p>
            )}
          </div>

          <div className="panel thread-panel">
            <p className="panel-label">Threads</p>
            <div className="thread-list">
              {store.threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  className={`thread-item ${thread.id === selectedThread?.id ? "active" : ""}`}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  <span>{thread.subject}</span>
                  <span className="muted">
                    {thread.status.replace("_", " ")} · {new Date(thread.lastMessageAt).toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="detail">
          <div className="panel summary-panel">
            <div className="detail-header">
              <div>
                <p className="panel-label">Selected Thread</p>
                <h2>{selectedThread?.subject ?? "No thread selected"}</h2>
              </div>
              <span className="status-pill">{status}</span>
            </div>
            {selectedThread ? (
              <>
                <p className="subtle">
                  {selectedThread.participants.join(", ")} · {selectedThread.status.replace("_", " ")}
                </p>
                {selectedThread.waitingOn ? <p className="waiting">Waiting on: {selectedThread.waitingOn}</p> : null}
                <div className="inline-actions">
                  <button className="button" type="button" onClick={() => void generateSummary()}>
                    Summarize Thread
                  </button>
                  <button className="secondary-button" type="button" onClick={() => void generateDraft()}>
                    Draft Reply
                  </button>
                </div>
              </>
            ) : null}
          </div>

          <div className="detail-grid">
            <div className="panel draft-panel">
              <p className="panel-label">Summary</p>
              {summarySource ? <p className="muted">Source: {summarySource}</p> : null}
              {summary ? (
                <div className="stack">
                  <h3>{summary.headline}</h3>
                  <p>{summary.action}</p>
                  <ul className="summary-list">
                    {summary.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="muted">Generate a short, actionable thread summary.</p>
              )}
            </div>

            <div className="panel">
              <p className="panel-label">Draft</p>
              {draftSource ? <p className="muted">Source: {draftSource}</p> : null}
              <div className="inline-actions">
                <select className="input" value={tone} onChange={(event) => setTone(event.target.value as typeof tone)}>
                  <option value="concise">Concise</option>
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                </select>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={askClarifyingQuestion}
                    onChange={(event) => setAskClarifyingQuestion(event.target.checked)}
                  />
                  Ask clarifying question
                </label>
                <button className="secondary-button" type="button" onClick={() => void copyDraft()}>
                  Copy Draft
                </button>
              </div>
              <div className="stack">
                <input
                  className="input"
                  value={draftEditInstruction}
                  onChange={(event) => setDraftEditInstruction(event.target.value)}
                  placeholder="Tell the AI how to edit this draft"
                />
                <button className="secondary-button" type="button" onClick={() => void applyDraftEdit()}>
                  Apply Edit
                </button>
              </div>
              {draft ? (
                <textarea
                  className="draft-box draft-editor"
                  value={draft.body}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, body: event.target.value } : current))
                  }
                />
              ) : (
                <p className="muted">Generate a reply draft.</p>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <div className="panel">
              <p className="panel-label">Follow-up Reminder</p>
              <div className="stack">
                <input
                  className="input"
                  type="datetime-local"
                  value={reminderDate}
                  onChange={(event) => setReminderDate(event.target.value)}
                />
                <input
                  className="input"
                  value={reminderReason}
                  onChange={(event) => setReminderReason(event.target.value)}
                />
                <button className="button" type="button" onClick={() => void createReminder()}>
                  Schedule Follow-up
                </button>
              </div>
            </div>

            <div className="panel">
              <p className="panel-label">Current Reminders</p>
              {selectedReminders.length ? (
                <div className="stack">
                  {selectedReminders.map((reminder) => (
                    <div className="reminder" key={reminder.id}>
                      <strong>{new Date(reminder.dueAt).toLocaleString()}</strong>
                      <span>{reminder.reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No follow-up scheduled on this thread.</p>
              )}
            </div>
          </div>

          <div className="panel messages-panel">
            <p className="panel-label">Messages</p>
            <div className="stack">
              {selectedMessages.map((message) => (
                <article key={message.id} className="message-card">
                  <div className="message-header">
                    <strong>{message.from}</strong>
                    <span className="muted">{new Date(message.receivedAt).toLocaleString()}</span>
                  </div>
                  <p>{message.snippet}</p>
                  <p className="muted">{message.bodyPreview}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
