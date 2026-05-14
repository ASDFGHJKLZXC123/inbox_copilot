"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import type { DraftReply, Reminder, SanitizedInboxStore } from "@/lib/types";
import {
  buildThreadCards,
  toUiSession,
  type ComposeMode,
  type ModifyAction,
  type NavId,
  type SearchResult,
  type ThreadCard,
  type UiSession,
} from "@/lib/types-ui";
import { api } from "@/lib/ui/api";
import { useFeatureSeqRef, useGlobalKeymap, useToastQueue } from "@/lib/ui/hooks";
import { ClearCacheDialog } from "@/components/ui/ClearCacheAction";
import * as I from "@/components/ui/icons";

import { AiThreadPanel } from "./AiThreadPanel";
import { AppToast } from "./AppToast";
import { ComposeDialog, type ComposeDialogInitial, type ComposePayload } from "./ComposeDialog";
import { EmailDetailPanel } from "./EmailDetailPanel";
import { InboxSearchResults } from "./InboxSearchResults";
import { LiveSyncPanel } from "./LiveSyncPanel";
import { ReminderThreadPanel } from "./ReminderThreadPanel";
import { Sidebar } from "./Sidebar";
import { ThreadListPanel } from "./ThreadListPanel";
import { fullTimestamp } from "./helpers";

interface ComposeState {
  mode: ComposeMode;
  initial?: ComposeDialogInitial;
}

export interface InboxViewProps {
  /**
   * Synthetic preview slot — when provided, skips the network fetch + auth
   * gate and renders against the supplied store + session. Used by
   * `tests/visual/inbox/` and the dev-only preview route. Production rendering
   * never sets this prop (the live page route renders `<InboxView />` plain).
   */
  preview?: {
    store: SanitizedInboxStore;
    session: UiSession;
  };
}

export function InboxView({ preview }: InboxViewProps = {}) {
  const router = useRouter();
  const nextAuth = useSession();
  const liveSession = useMemo(() => toUiSession(nextAuth.data ?? null), [nextAuth.data]);
  const session: UiSession | null = preview?.session ?? liveSession;

  const [store, setStore] = useState<SanitizedInboxStore | null>(preview?.store ?? null);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavId>("inbox");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [showComposer, setShowComposer] = useState(false);
  const [compose, setCompose] = useState<ComposeState | null>(null);
  const [showClearCache, setShowClearCache] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const [replyDraftsByThread, setReplyDraftsByThread] = useState<Record<string, string>>({});
  const setReplyText = useCallback((threadId: string, text: string) => {
    setReplyDraftsByThread((prev) => ({ ...prev, [threadId]: text }));
  }, []);

  const { toasts, push: showToast, dismiss } = useToastQueue({ defaultDurationMs: 5000 });

  // Initial fetch of the inbox (skipped in preview mode)
  useEffect(() => {
    if (preview) return;
    if (nextAuth.status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getInbox();
        if (cancelled) return;
        setStore(s);
        setStoreError(null);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load inbox";
        setStoreError(message);
        showToast({ message, variant: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preview, nextAuth.status, showToast]);

  // Live sync state
  const [syncStatus, setSyncStatus] = useState<"connected" | "refreshed" | "disconnected" | "off">(
    "off",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    if (store.subscriptions.length === 0) {
      setSyncStatus("off");
    } else {
      setSyncStatus((prev) => (prev === "refreshed" ? prev : "connected"));
    }
  }, [store]);

  // Derive UI state from the store
  const threads = store?.threads ?? [];
  const messages = store?.messages ?? [];
  const reminders = store?.reminders ?? [];
  const subscriptions = store?.subscriptions ?? [];

  const allCards: ThreadCard[] = useMemo(
    () => buildThreadCards(threads, messages),
    [threads, messages],
  );

  const folderCounts = useMemo(() => {
    const inboxUnread = allCards
      .filter((c) => c.labels.includes("INBOX"))
      .reduce((s, c) => s + c.unreadCount, 0);
    return { inbox: inboxUnread } as Partial<Record<NavId, number>>;
  }, [allCards]);

  // Folder filter (the prototype only seeds INBOX; sent/drafts/archive/trash are empty)
  const cards = useMemo(() => {
    if (activeNav === "inbox") return allCards.filter((c) => c.labels.includes("INBOX"));
    return [];
  }, [allCards, activeNav]);

  // Search (debounced) — uses api.search
  const [searchPending, setSearchPending] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const searchSeq = useFeatureSeqRef();

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchPending(false);
      return;
    }
    setSearchPending(true);
    const req = searchSeq.next();
    const timer = window.setTimeout(async () => {
      try {
        const apiResults = await api.search(q);
        if (!searchSeq.matches(req)) return;
        // Lift Thread → ThreadCard via the local cards list (recommended path
        // per Appendix A.1). If a result thread isn't yet in `allCards`,
        // synthesize a minimal ThreadCard so the result is still selectable.
        const cardById = new Map(allCards.map((c) => [c.id, c]));
        const lifted: SearchResult[] = apiResults.map((r) => {
          const card = cardById.get(r.thread.id);
          if (card) return { thread: card, score: r.score, unreadCount: r.unreadCount };
          const fallback: ThreadCard = {
            id: r.thread.id,
            subject: r.thread.subject,
            preview: "",
            participants: r.thread.participants,
            lastMessageAt: r.thread.lastMessageAt,
            unreadCount: r.unreadCount,
            labels: [],
            hasAttachment: false,
          };
          return { thread: fallback, score: r.score, unreadCount: r.unreadCount };
        });
        setSearchResults(lifted);
        setSearchPending(false);
      } catch (err) {
        if (!searchSeq.matches(req)) return;
        setSearchPending(false);
        const message = err instanceof Error ? err.message : "Search failed";
        showToast({ message, variant: "error" });
      }
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, allCards]);

  const isSearchMode = searchQuery.trim().length > 0;

  const selectedCard = cards.find((c) => c.id === selectedThreadId) ?? cards[0] ?? null;
  const threadMessages = useMemo(() => {
    if (!selectedCard) return [];
    return messages
      .filter((m) => m.threadId === selectedCard.id)
      .slice()
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
  }, [messages, selectedCard]);

  // Auto-pick first thread when none selected (guarded against search mode)
  useEffect(() => {
    if (isSearchMode) return;
    if (!cards.length) return;
    if (!cards.find((c) => c.id === selectedThreadId)) {
      setSelectedThreadId(cards[0].id);
    }
  }, [cards, selectedThreadId, isSearchMode]);

  // Visible / position
  const visibleCards =
    activeFilter === "unread" && !isSearchMode ? cards.filter((c) => c.unreadCount > 0) : cards;
  const position = Math.max(
    1,
    visibleCards.findIndex((c) => c.id === selectedCard?.id) + 1,
  );
  const total = visibleCards.length;

  // Clear reminder open / composer scope on thread change
  useEffect(() => {
    setReminderOpen(false);
  }, [selectedThreadId]);

  // Mark-read-on-open (A.7: "opening unread thread marks it read").
  // Optimistic local update; background API call with no rollback toast —
  // if the server mark-read fails, the next /api/inbox/sync reconciles.
  //
  // Deps are intentionally [selectedCard?.id, preview] only — NOT unreadCount.
  // The toolbar's "Mark unread" action (onModify) flips unreadCount back to
  // > 0 on the currently-open thread; if unreadCount were a dep, this effect
  // would re-fire and immediately re-mark-read, breaking the toolbar action.
  // unreadCount is read from the closure at effect-run time, so the guard
  // still skips when the thread is already read.
  useEffect(() => {
    if (preview) return;
    if (!selectedCard) return;
    if (selectedCard.unreadCount === 0) return;
    const id = selectedCard.id;
    setStore((prev) =>
      prev
        ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.threadId === id ? { ...m, isUnread: false } : m,
            ),
          }
        : prev,
    );
    let cancelled = false;
    api.modifyThread(id, { action: "mark-read" }).catch((err) => {
      if (!cancelled) console.warn("[mark-read-on-open] background call failed:", err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCard?.id, preview]);

  // Sync / refresh — routed through api. Per B.3 line 1015, post-modify sync
  // should be POST (`api.syncInbox`) so the provider state is re-pulled and
  // returned as a label-scoped slice. When a real session is present we POST;
  // when one is missing (dev preview, no provider creds yet) we fall back to
  // GET `api.getInbox` so the helper still works for Tier 2 verification.
  const runSync = useCallback(
    async (label: NavId) => {
      setSyncing(true);
      try {
        const email = session?.user.email;
        const fresh = email
          ? await api.syncInbox({ provider: "google", email, label })
          : await api.getInbox();
        setStore(fresh);
        showToast({
          id: "sync",
          message: `Mailbox refreshed · ${label}`,
          variant: "info",
          durationMs: 1800,
        });
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        showToast({ message, variant: "error" });
      } finally {
        setSyncing(false);
      }
    },
    [session, showToast],
  );

  const onPrev = () => {
    const idx = visibleCards.findIndex((c) => c.id === selectedCard?.id);
    if (idx > 0) setSelectedThreadId(visibleCards[idx - 1].id);
  };
  const onNext = () => {
    const idx = visibleCards.findIndex((c) => c.id === selectedCard?.id);
    if (idx >= 0 && idx < visibleCards.length - 1) setSelectedThreadId(visibleCards[idx + 1].id);
  };

  // Optimistic modify with snapshot-rollback (per B.3)
  const onModify = async (action: ModifyAction) => {
    if (!selectedCard || !store) return;
    const id = selectedCard.id;
    const snapshot = store;
    const verb =
      action === "archive"
        ? "Archived"
        : action === "trash"
          ? "Trashed"
          : action === "mark-unread"
            ? "Marked unread"
            : "Marked read";

    if (action === "archive" || action === "trash") {
      // Remove from the inbox view optimistically. The user-visible effect
      // is "the row disappears". On failure we restore the entire store.
      setStore({
        ...snapshot,
        messages: snapshot.messages.map((m) =>
          m.threadId === id ? { ...m, labels: m.labels.filter((l) => l.toUpperCase() !== "INBOX") } : m,
        ),
      });
    } else if (action === "mark-unread" || action === "mark-read") {
      const target = action === "mark-unread";
      setStore({
        ...snapshot,
        messages: snapshot.messages.map((m) =>
          m.threadId === id ? { ...m, isUnread: target } : m,
        ),
      });
    }

    setModifying(true);
    try {
      await api.modifyThread(id, { action });
      await runSync(activeNav); // per B.3: POST sync returns label-scoped slice; replaces threads
      showToast({
        id: `modify_${id}`,
        message: `${verb} "${selectedCard.subject}"`,
        retry: () => setStore(snapshot),
      });
    } catch (err) {
      setStore(snapshot);
      const message = err instanceof Error ? err.message : `${action} failed`;
      showToast({ message, variant: "error" });
    } finally {
      setModifying(false);
    }
  };

  // Compose lifecycle
  const openCompose = (initial?: ComposeDialogInitial & { mode?: ComposeMode }) => {
    setCompose({ mode: initial?.mode ?? "new", initial });
  };
  const closeCompose = () => setCompose(null);

  const onComposeSend = async (payload: ComposePayload) => {
    try {
      await api.send({
        to: payload.to.join(", "),
        cc: payload.cc.length ? payload.cc.join(", ") : undefined,
        bcc: payload.bcc.length ? payload.bcc.join(", ") : undefined,
        subject: payload.subject,
        body: payload.body,
      });
      closeCompose();
      showToast({ message: `Message sent to ${payload.to.join(", ")}`, durationMs: 2500 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      showToast({ message, variant: "error" });
      throw err;
    }
  };

  // Reply send
  const onSendReply = async () => {
    if (!selectedCard) return;
    const body = (replyDraftsByThread[selectedCard.id] ?? "").trim();
    if (!body) return;
    const to =
      selectedCard.participants[0] ??
      threadMessages[threadMessages.length - 1]?.from ??
      "";
    try {
      await api.send({
        to,
        subject: selectedCard.subject.startsWith("Re:")
          ? selectedCard.subject
          : `Re: ${selectedCard.subject}`,
        body,
        threadId: selectedCard.id,
      });
      showToast({ message: "Reply sent.", durationMs: 2500 });
      setReplyText(selectedCard.id, "");
      setShowComposer(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Reply failed";
      showToast({ message, variant: "error" });
      throw err;
    }
  };

  // AI draft → reply
  const onUseDraft = (draft: DraftReply) => {
    if (!selectedCard) return;
    setReplyText(selectedCard.id, draft.body);
    setShowComposer(true);
    showToast({ message: "Draft loaded into reply.", durationMs: 2200 });
  };

  // Forward
  const onForward = () => {
    if (!selectedCard) return;
    const last = threadMessages[threadMessages.length - 1];
    if (!last) return;
    openCompose({
      mode: "forward",
      subject: `Fwd: ${selectedCard.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${last.from}\nDate: ${fullTimestamp(last.receivedAt)}\nSubject: ${last.subject}\n\n${last.bodyText ?? last.snippet ?? ""}`,
    });
  };

  // Clear cache: ClearCacheDialog wipes + signs out. We just reset local UI.
  const onClearCacheClosed = () => {
    setShowClearCache(false);
  };

  // Live sync
  const enableSync = async () => {
    if (!session?.user.email) return;
    try {
      const subs = await api.renewSubscription({
        provider: "google",
        email: session.user.email,
      });
      setStore((prev) => (prev ? { ...prev, subscriptions: subs } : prev));
      showToast({ message: "Subscription renewed", durationMs: 2400 });
      setSyncStatus("connected");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Renew failed";
      showToast({ message, variant: "error" });
    }
  };

  const simulateInbound = async () => {
    // Per B.3: re-triggers api.syncInbox (POST) — pulls new mail from the provider.
    // No-op without a session (e.g. dev preview route); the panel button is gated
    // by syncStatus anyway, but guard defensively.
    if (!session?.user.email) return;
    setSyncStatus("refreshed");
    try {
      const fresh = await api.syncInbox({
        provider: "google",
        email: session.user.email,
        label: activeNav,
      });
      setStore(fresh);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      showToast({ message, variant: "error" });
    }
    window.setTimeout(() => setSyncStatus((s) => (s === "refreshed" ? "connected" : s)), 1800);
  };

  // Reminders — child writes back; the panel internally calls the API
  const onRemindersChange = (next: Reminder[]) => {
    setStore((prev) => (prev ? { ...prev, reminders: next } : prev));
  };

  // Search input ref for `/` keymap
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global keymap
  useGlobalKeymap({
    j: onNext,
    k: onPrev,
    r: () => setShowComposer(true),
    e: () => void onModify("archive"),
    "#": () => void onModify("trash"),
    c: () => openCompose(),
    "/": () => searchInputRef.current?.focus(),
    Escape: () => {
      setShowComposer(false);
      setAccountMenuOpen(false);
    },
  });

  const hasReminder = (tid: string) =>
    reminders.some((r) => r.threadId === tid && !r.completed);

  const replyHasUserContent = !!(replyDraftsByThread[selectedCard?.id ?? ""] ?? "").trim();

  // ── Render ────────────────────────────────────────────────────────────

  if (!session) {
    // Authenticated session not yet available; keep the layout dark to avoid flash.
    return (
      <div className="inbox-page h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-500 text-[12px]">
        Loading…
      </div>
    );
  }

  if (!store) {
    return (
      <div className="inbox-page h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-500 text-[12px]">
        {storeError ?? "Loading inbox…"}
      </div>
    );
  }

  const handleSignOut = () => {
    void signOut({ callbackUrl: "/signin" });
  };
  const handleOpenPreferences = () => {
    // Workstream C owns this route; until it lands the typed-routes check
    // doesn't know about /preferences. Cast keeps Workstream A free of any
    // cross-workstream type coupling.
    router.push("/preferences" as never);
  };

  return (
    <div className="inbox-page h-screen w-screen flex bg-slate-950 text-slate-200">
      <Sidebar
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        session={session}
        folderCounts={folderCounts}
        onCompose={() => openCompose()}
        onSignOut={handleSignOut}
        onClearCache={() => setShowClearCache(true)}
        onOpenPreferences={handleOpenPreferences}
        accountMenuOpen={accountMenuOpen}
        setAccountMenuOpen={setAccountMenuOpen}
      />

      {/* Middle column: list or search results */}
      <section className="w-[392px] flex-shrink-0 border-r border-slate-800/80 bg-slate-950 flex flex-col min-h-0">
        {!isSearchMode ? (
          <ThreadListPanel
            cards={cards}
            selectedThreadId={selectedCard?.id ?? null}
            setSelectedThreadId={setSelectedThreadId}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            syncing={syncing}
            onRefresh={() => void runSync(activeNav)}
            isSearchMode={isSearchMode}
            hasActiveReminder={hasReminder}
            activeNav={activeNav}
            searchInputRef={searchInputRef}
          />
        ) : (
          <>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800/80">
              <h2 className="text-[14px] font-semibold text-slate-100">Search</h2>
              <button
                onClick={() => setSearchQuery("")}
                className="ml-auto text-[11.5px] text-slate-500 hover:text-slate-200"
              >
                Clear
              </button>
            </div>
            <div className="px-3 pt-3 pb-2.5 border-b border-slate-800/60 space-y-2.5">
              <div className="relative">
                <I.Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search mail"
                  autoFocus
                  className="w-full h-8 pl-8 pr-14 bg-slate-900 border border-slate-800 rounded-md text-[12.5px] text-slate-200 placeholder:text-slate-500 focus:border-slate-700 focus-ring"
                />
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2">esc</kbd>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-6 px-2.5 rounded-full bg-slate-900/50 text-slate-600 border border-slate-800/60 text-[11.5px] font-medium flex items-center">
                  All
                </span>
                <span className="h-6 px-2.5 rounded-full bg-slate-900/50 text-slate-600 border border-slate-800/60 text-[11.5px] font-medium flex items-center">
                  Unread
                </span>
                <span className="ml-auto text-[10.5px] text-slate-500 italic">Search active</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <InboxSearchResults
                query={searchQuery}
                results={searchResults}
                pending={searchPending}
                selectedThreadId={selectedCard?.id ?? null}
                onSelectThread={(t) => {
                  setSelectedThreadId(t.id);
                }}
                hasActiveReminder={hasReminder}
              />
            </div>
          </>
        )}
      </section>

      {/* Detail */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Top status bar */}
        <div className="h-9 px-4 flex items-center gap-2 border-b border-slate-800/80 bg-slate-950">
          <span className="text-[11px] text-slate-500">
            <span className="text-slate-400 font-medium">{session.user.email}</span>
            <span className="mx-1.5 text-slate-700">/</span>
            <span className="capitalize">{activeNav}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <LiveSyncPanel
              status={syncStatus}
              lastSyncedAt={lastSyncedAt}
              subscriptions={subscriptions}
              onEnable={enableSync}
              onSimulateEvent={simulateInbound}
            />
          </div>
        </div>

        <EmailDetailPanel
          card={selectedCard}
          threadMessages={threadMessages}
          showComposer={showComposer}
          setShowComposer={setShowComposer}
          position={position}
          total={total}
          onPrev={onPrev}
          onNext={onNext}
          onModify={onModify}
          onForward={onForward}
          onSendReply={onSendReply}
          onError={(msg) => showToast({ message: msg, variant: "error" })}
          replyText={replyDraftsByThread[selectedCard?.id ?? ""] ?? ""}
          setReplyText={(t) => {
            if (selectedCard) setReplyText(selectedCard.id, t);
          }}
          modifying={modifying}
          syncing={syncing}
          aiPanelSlot={
            <AiThreadPanel
              selectedThreadId={selectedCard?.id ?? null}
              threadMessages={threadMessages}
              replyHasUserContent={replyHasUserContent}
              onUseDraft={onUseDraft}
              onError={(msg) => showToast({ message: msg, variant: "error" })}
            />
          }
          reminderPanelSlot={
            <ReminderThreadPanel
              selectedThreadId={selectedCard?.id ?? null}
              reminders={reminders}
              onRemindersChange={onRemindersChange}
              onError={(msg) => showToast({ message: msg, variant: "error" })}
              open={reminderOpen}
              setOpen={setReminderOpen}
            />
          }
          authError={session.authError}
        />
      </div>

      {/* Overlays */}
      {compose && (
        <ComposeDialog
          mode={compose.mode}
          initial={compose.initial}
          onClose={closeCompose}
          onSend={onComposeSend}
          onError={(msg) => showToast({ message: msg, variant: "error" })}
        />
      )}
      <ClearCacheDialog
        open={showClearCache}
        onClose={onClearCacheClosed}
        onError={(msg) => showToast({ message: msg, variant: "error" })}
      />

      <AppToast toasts={toasts} dismiss={dismiss} />
    </div>
  );
}
