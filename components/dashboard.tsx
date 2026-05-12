"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { signOut, useSession } from "next-auth/react";

import { DraftPanel } from "@/components/draft-panel";
import { HeroSection } from "@/components/hero-section";
import { ReminderPanels } from "@/components/reminder-panels";
import { SidebarPanels } from "@/components/sidebar-panels";
import { ThreadDetail } from "@/components/thread-detail";
import { NoThreadSelected } from "@/components/thread-detail";
import type {
  DraftOptions,
  DraftReplyResult,
  InboxStore,
  ThreadSummaryResult,
} from "@/lib/types";

interface SearchResult {
  thread: InboxStore["threads"][number];
  score: number;
  unreadCount: number;
}

export function Dashboard({ initialStore }: { initialStore: InboxStore }) {
  const { data: session, status: sessionStatus } = useSession();

  // ── Core data ──────────────────────────────────────────────────────────────
  const [store, setStore] = useState(initialStore);
  const [selectedThreadId, setSelectedThreadId] = useState(initialStore.threads[0]?.id ?? "");

  // ── AI results — cleared on thread change to avoid showing stale data ─────
  const [summaryResult, setSummaryResult] = useState<ThreadSummaryResult | null>(null);
  const [draftResult, setDraftResult] = useState<DraftReplyResult | null>(null);

  // ── Draft UI options ───────────────────────────────────────────────────────
  const [tone, setTone] = useState<DraftOptions["tone"]>("concise");
  const [askClarifyingQuestion, setAskClarifyingQuestion] = useState(false);

  // ── Sidebar / search ───────────────────────────────────────────────────────
  const [syncEmail, setSyncEmail] = useState("you@example.com");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // ── Reminders ─────────────────────────────────────────────────────────────
  const [reminderDate, setReminderDate] = useState("");
  const [reminderReason, setReminderReason] = useState("Follow up if no reply");

  // ── Status bar + concurrent transitions ───────────────────────────────────
  const [status, setStatus] = useState("Ready");
  const [syncPending, setSyncPending] = useState(false);
  const [summaryPending, startSummaryTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();
  const [searchPending, startSearchTransition] = useTransition();

  // ── Derived values ─────────────────────────────────────────────────────────
  const selectedThread = useMemo(
    () => store.threads.find((t) => t.id === selectedThreadId) ?? store.threads[0] ?? null,
    [store.threads, selectedThreadId]
  );
  const selectedMessages = useMemo(
    () => store.messages.filter((m) => m.threadId === selectedThread?.id),
    [store.messages, selectedThread?.id]
  );
  const selectedReminders = useMemo(
    () => store.reminders.filter((r) => r.threadId === selectedThread?.id),
    [store.reminders, selectedThread?.id]
  );

  // ── Stale-state fix: clear AI results when the selected thread changes ────
  const prevThreadIdRef = useRef(selectedThreadId);
  useEffect(() => {
    if (prevThreadIdRef.current !== selectedThreadId) {
      prevThreadIdRef.current = selectedThreadId;
      setSummaryResult(null);
      setDraftResult(null);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (session?.user?.email) setSyncEmail(session.user.email);
  }, [session?.user?.email]);

  useEffect(() => {
    if (!selectedThread && store.threads[0]) setSelectedThreadId(store.threads[0].id);
  }, [selectedThread, store.threads]);

  // ── Thread selection — clears stale AI results synchronously ─────────────
  function handleSelectThread(id: string) {
    setSummaryResult(null);
    setDraftResult(null);
    setSelectedThreadId(id);
  }

  // ── API actions ───────────────────────────────────────────────────────────
  async function syncGoogle() {
    setSyncPending(true);
    setStatus("Syncing google inbox...");
    const res = await fetch("/api/inbox/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "google", email: syncEmail }),
    });
    setSyncPending(false);
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      setStatus(p?.error ? `Sync failed: ${p.error}` : "Sync failed");
      return;
    }
    const next = (await res.json()) as InboxStore;
    setStore(next);
    setSelectedThreadId((cur) => cur || next.threads[0]?.id || "");
    setStatus("Google inbox synced");
  }

  async function clearCache() {
    const ok = window.confirm(
      "This will permanently delete ALL your data:\n\n" +
        "• Synced emails, threads, and messages\n• OAuth connections and saved tokens\n" +
        "• Reminders and webhook subscriptions\n• Search history and webhook event logs\n\n" +
        "You will be signed out. Continue?"
    );
    if (!ok) return;
    setStatus("Deleting all user data...");
    const res = await fetch("/api/inbox/cache", { method: "DELETE" });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      setStatus(p?.error ? `Clear failed: ${p.error}` : "Clear failed");
      return;
    }
    setStore((await res.json()) as InboxStore);
    setSelectedThreadId(""); setSummaryResult(null); setDraftResult(null);
    setSearchResults([]); setSearchQuery(""); setReminderDate("");
    setReminderReason("Follow up if no reply"); setSyncEmail("you@example.com");
    setStatus("All data deleted");
    await signOut({ redirect: false });
  }

  function generateSummary() {
    if (!selectedThread) return;
    startSummaryTransition(async () => {
      setStatus("Generating summary...");
      const res = await fetch(`/api/threads/${selectedThread.id}/summary`, { method: "POST" });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus(p?.error ? `Summary failed: ${p.error}` : "Summary failed");
        return;
      }
      setSummaryResult((await res.json()) as ThreadSummaryResult);
      setStatus("Summary ready");
    });
  }

  function generateDraft() {
    if (!selectedThread) return;
    startDraftTransition(async () => {
      setStatus("Drafting reply...");
      const res = await fetch(`/api/threads/${selectedThread.id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone, askClarifyingQuestion }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus(p?.error ? `Draft failed: ${p.error}` : "Draft failed");
        return;
      }
      setDraftResult((await res.json()) as DraftReplyResult);
      setStatus("Draft ready");
    });
  }

  function handleRevise(instruction: string) {
    if (!selectedThread || !draftResult) return;
    startDraftTransition(async () => {
      setStatus("Applying draft edit...");
      const res = await fetch(`/api/threads/${selectedThread.id}/draft/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentDraft: draftResult.draft, instruction }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus(p?.error ? `Edit failed: ${p.error}` : "Edit failed");
        return;
      }
      setDraftResult((await res.json()) as DraftReplyResult);
      setStatus("Draft updated");
    });
  }

  async function createReminder() {
    if (!selectedThread || !reminderDate) return;
    setStatus("Scheduling reminder...");
    const res = await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: selectedThread.id,
        dueAt: new Date(reminderDate).toISOString(),
        reason: reminderReason,
      }),
    });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: string } | null;
      setStatus(p?.error ? `Reminder failed: ${p.error}` : "Reminder failed");
      return;
    }
    const reminders = (await res.json()) as InboxStore["reminders"];
    setStore((cur) => ({ ...cur, reminders }));
    setStatus("Reminder scheduled");
  }

  function runSearch() {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    startSearchTransition(async () => {
      setStatus("Searching...");
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus(p?.error ? `Search failed: ${p.error}` : "Search failed");
        return;
      }
      setSearchResults((await res.json()) as SearchResult[]);
      setStatus("Search ready");
    });
  }

  async function copyDraft() {
    if (!draftResult?.draft.body) { setStatus("Nothing to copy"); return; }
    try { await navigator.clipboard.writeText(draftResult.draft.body); setStatus("Draft copied"); }
    catch { setStatus("Copy failed"); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="shell">
      <HeroSection session={session} sessionStatus={sessionStatus} />

      <section className="workspace" style={{ columnGap: 0 }}>
        <SidebarPanels
          syncEmail={syncEmail}
          onSyncEmailChange={setSyncEmail}
          onSyncGoogle={() => void syncGoogle()}
          onClearCache={() => void clearCache()}
          syncPending={syncPending}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={runSearch}
          searchPending={searchPending}
          searchResults={searchResults}
          threads={store.threads}
          reminders={store.reminders}
          selectedThreadId={selectedThread?.id ?? null}
          onSelectThread={handleSelectThread}
        />

        <section
          className="detail"
          style={{ paddingLeft: "20px", borderLeft: "1px solid rgba(77, 54, 34, 0.14)" }}
        >
          <div className="panel summary-panel">
            <div className="detail-header">
              <div>
                <p className="panel-label">Selected Thread</p>
                <h2 style={{ marginBottom: 0 }}>
                  {selectedThread?.subject ?? "No thread selected"}
                </h2>
              </div>
              <span className="status-pill">{status}</span>
            </div>
            {selectedThread ? (
              <div className="inline-actions" style={{ marginTop: "12px" }}>
                <button
                  className="button"
                  type="button"
                  onClick={generateSummary}
                  disabled={summaryPending}
                  style={{ opacity: summaryPending ? 0.65 : 1 }}
                >
                  {summaryPending ? "Summarizing…" : "Summarize Thread"}
                </button>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={generateDraft}
                  disabled={draftPending}
                  style={{ opacity: draftPending ? 0.65 : 1 }}
                >
                  {draftPending ? "Drafting…" : "Draft Reply"}
                </button>
              </div>
            ) : null}
          </div>

          {selectedThread ? (
            <>
              <ThreadDetail
                thread={selectedThread}
                messages={selectedMessages}
                summaryResult={summaryResult}
                summaryPending={summaryPending}
              />

              <div className="detail-grid">
                <DraftPanel
                  thread={selectedThread}
                  draftResult={draftResult}
                  draftPending={draftPending}
                  tone={tone}
                  askClarifyingQuestion={askClarifyingQuestion}
                  onToneChange={setTone}
                  onAskClarifyingQuestionChange={setAskClarifyingQuestion}
                  onRevise={handleRevise}
                  onCopy={() => void copyDraft()}
                  onDraftBodyChange={(body) =>
                    setDraftResult((cur) => cur ? { ...cur, draft: { ...cur.draft, body } } : cur)
                  }
                />

                <ReminderPanels
                  thread={selectedThread}
                  reminders={selectedReminders}
                  reminderDate={reminderDate}
                  onReminderDateChange={setReminderDate}
                  reminderReason={reminderReason}
                  onReminderReasonChange={setReminderReason}
                  onSchedule={() => void createReminder()}
                />
              </div>
            </>
          ) : (
            <div
              className="panel"
              style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <NoThreadSelected />
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
