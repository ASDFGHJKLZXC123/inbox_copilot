# Build Prompt: AI Inbox Copilot — Frontend

You are building the **frontend** of **AI Inbox Copilot**, a Superhuman/Grammarly-adjacent inbox assistant. This prompt is the spec for the client-side surface area only: pages, components, hooks, client-side state, and the contracts the frontend depends on from the backend.

> **This document is authoritative for the frontend.** If a prior prototype exists in the working tree (older components, older `lib/types.ts`, older hooks), **the contracts in this document supersede it**. Do not reconcile with the older code; replace it.

> **Backend assumption.** The backend (API routes, Gmail/AI adapters, JSON persistence, auth, SSE emitter, webhooks) is specified separately and is assumed to exist. The frontend depends only on the API contracts in §5 below. Do not reach into backend modules from client components — call the documented routes.

---

## 1. Goal

A single-user, single-account web UI that lets a signed-in Google user:

- Read Gmail (Inbox / Sent / Drafts / Archive / Trash).
- Compose, reply, forward, send.
- Archive, trash, mark unread/read.
- Summarize a thread with AI.
- Generate a draft reply with AI (tone + clarifying-question option).
- Revise a draft from a natural-language instruction.
- Schedule, complete, and delete follow-up reminders for threads.
- Search the local mailbox via a backend keyword route.
- Clear the local cache.
- Enable Gmail live sync and see live refreshes via SSE.

Desktop only (1280×800+). Slate-* dark palette only.

---

## 2. Hard constraints

- **Stack:** Next.js 15+ App Router, TypeScript strict mode, React 18+, Tailwind CSS, Auth.js v5 (NextAuth) — client side uses `useSession`, `signIn`, `signOut`. Vitest for component tests.
- **No backwards-compat shims, no feature flags.** Build the right thing once.
- **No placeholder UI for AI features** — every AI button must call a real route.
- **Single user, single account.** No multi-account UI.
- **No client component fetches the user's session via anything other than `useSession` or props from `InboxView`.** No child component talks to NextAuth directly.

---

## 3. Out of scope (frontend)

- Multi-account UI.
- Rich-text compose (plain-text body only).
- Light mode (slate-* dark only).
- Mobile-optimized layout (desktop is the whole MVP).
- Multi-provider UI (Microsoft is backend-only).
- Real notification delivery for reminders (in-app UI only).
- Send attachments (receive/list only).

---

## 4. Project layout (frontend surface)

```
.
├── app/
│   ├── inbox/page.tsx        # renders InboxView when authenticated
│   ├── layout.tsx
│   └── page.tsx              # renders SignInGate when signed-out; redirects to /inbox when signed-in
├── components/
│   └── inbox/
│       ├── InboxView.tsx          # root; owns shared state, mounts panel slots
│       ├── Sidebar.tsx            # nav, sign-in/out, account menu
│       ├── EmailList.tsx          # thread list + filter + search input
│       ├── EmailDetail.tsx        # thread header + messages + reply composer slot
│       ├── EmailMessage.tsx       # one message body (iframe-rendered HTML)
│       ├── ReplyComposer.tsx      # textarea + send/discard
│       ├── ComposeDialog.tsx      # new/forward modal
│       ├── AppToast.tsx           # toast queue UI
│       ├── AiThreadPanel.tsx      # summary / draft / revise UI
│       ├── ReminderThreadPanel.tsx
│       ├── InboxSearchResults.tsx
│       ├── ClearCacheAction.tsx
│       └── LiveSyncPanel.tsx      # SSE status + subscription mgmt
├── hooks/
│   ├── use-inbox-stream.ts
│   ├── use-feature-seq-ref.ts
│   ├── use-toast-queue.ts
│   └── use-global-keymap.ts
└── lib/
    ├── api.ts                # tiny fetch helpers for client
    ├── schemas.ts            # Zod schemas (shared with server)
    └── types.ts              # SanitizedInboxStore, Thread, Message, Reminder, etc.
```

---

## 5. Backend contracts the frontend depends on

Treat the following as fixed. The frontend MUST send and accept exactly these shapes.

### Shared types (`lib/types.ts`)

```ts
type ProviderType = "google" | "microsoft";
type NavId = "inbox" | "sent" | "drafts" | "archive" | "trash";
type Tone = "concise" | "friendly" | "formal";

interface MessageAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

interface Message {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  snippet: string;
  bodyHtml?: string;
  bodyText?: string;
  receivedAt: string;
  unread: boolean;
  labels: string[];
  attachments: MessageAttachment[];
  messageIdHeader?: string;
}

interface Thread {
  id: string;
  provider: ProviderType;
  email: string;
  subject: string;
  participants: string[];
  lastMessageAt: string;
  labels: string[];     // includes INBOX | SENT | TRASH | DRAFT
  unreadCount: number;
  messageIds: string[];
}

interface Reminder {
  id: string;
  threadId: string;
  dueAt: string;        // ISO 8601 with timezone (RFC 3339)
  reason: string;
  completed: boolean;
  createdAt: string;
}

interface ProviderSubscription {
  id: string;
  provider: ProviderType;
  email: string;
  externalId?: string;
  resourceId?: string;
  notificationUrl: string;
  status: "active" | "expired" | "error";
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// What the server returns over HTTP — tokens stripped.
type SanitizedInboxStore = {
  connections: Array<{ provider: ProviderType; email: string; scope?: string; updatedAt: string }>;
  threads: Thread[];
  messages: Message[];
  reminders: Reminder[];
  subscriptions: ProviderSubscription[];
};

interface DraftReply { subject: string; body: string }
type CopilotSource = "claude" | "gemini" | "fallback";
interface CopilotMeta { source: CopilotSource; model?: string }
interface ThreadSummaryResult { meta: CopilotMeta; summary: { headline: string; action: string; bullets: string[] } }
interface DraftReplyResult { meta: CopilotMeta; draft: DraftReply }

type InboxEvent = { type: "sync"; provider: ProviderType; email?: string };
```

### Zod request schemas (`lib/schemas.ts`)

The frontend sends bodies matching these. The backend validates with the same module.

- `DraftRequestSchema`: `{ tone: Tone (default "concise"), askClarifyingQuestion: boolean (default false) }`.
- `ReviseRequestSchema`: `{ draft: { subject: string, body: string }, instruction: string (1..2000) }`. **The field is `draft`, NOT `currentDraft`.** This trips up anyone copying older prototype code.
- `ReminderCreateSchema`: `{ threadId: string, dueAt: z.string().datetime(), reason: string (1..1000) }`. `datetime()` requires RFC 3339 with timezone — coerce client `<input type="datetime-local">` via `new Date(v).toISOString()`.
- `SearchRequestSchema`: `{ query: string (1..500) }`.
- `SendRequestSchema`: `{ to: string[] (>=1 valid email), cc?: string[], bcc?: string[], subject: string, body: string, threadId?: string, inReplyToMessageId?: string }`.
- `ModifyRequestSchema`: `{ action: "archive" | "trash" | "untrash" | "unarchive" | "mark-read" | "mark-unread" }`.

All errors return `{ error: string }`. Treat any non-2xx as an error and route through the toast queue (except `meta.source === "fallback"` on AI responses, which is success).

### Routes

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/inbox/sync` | `{ label?: NavId }` | `SanitizedInboxStore` |
| DELETE | `/api/inbox/cache` | — | `SanitizedInboxStore` (empty). Does NOT invalidate session — client must call `signOut`. |
| GET | `/api/inbox/stream` | — | `text/event-stream`. `event: ping` keep-alive every 25s; `event: sync` with `InboxEvent` payload. |
| GET | `/api/inbox/subscriptions` | — | `ProviderSubscription[]` |
| POST | `/api/inbox/subscriptions` | `{ provider: ProviderType; email?: string }` | `ProviderSubscription[]`. `502` with human-readable message if `GOOGLE_PUBSUB_TOPIC` missing. |
| POST | `/api/threads/[threadId]/modify` | `ModifyRequestSchema` | `SanitizedInboxStore` |
| POST | `/api/threads/[threadId]/summary` | — | `ThreadSummaryResult` |
| POST | `/api/threads/[threadId]/draft` | `DraftRequestSchema` | `DraftReplyResult` |
| POST | `/api/threads/[threadId]/draft/revise` | `ReviseRequestSchema` | `DraftReplyResult` |
| GET | `/api/reminders` | — | `Reminder[]` |
| POST | `/api/reminders` | `ReminderCreateSchema` | `Reminder[]` (full updated list) |
| PATCH | `/api/reminders/[id]` | `{ completed: boolean }` | `Reminder[]` |
| DELETE | `/api/reminders/[id]` | — | `Reminder[]` |
| POST | `/api/search` | `SearchRequestSchema` | `Array<{ thread: Thread; score: number; unreadCount: number }>` |
| POST | `/api/send` | `SendRequestSchema` | `{ id, threadId }` (after a post-send sync completes server-side) |
| GET | `/api/attachments/[messageId]/[attachmentId]` | — | streams the file with `Content-Disposition: attachment` |

`lib/api.ts` is a thin client wrapper: a single `apiFetch<T>(path, init)` that throws on non-2xx with the server's `error` string, and per-route helpers that call it.

---

## 6. Auth surface (client side)

- The frontend uses Auth.js v5 client APIs: `useSession`, `signIn("google")`, `signOut`.
- The middleware (backend concern) protects `/inbox`.
- `app/page.tsx` MUST render `SignInGate` for signed-out users and redirect to `/inbox` for signed-in users — do **not** have `/` blindly redirect to `/inbox` or you create a `/ → /inbox → /` bounce loop.
- `session.authError === "RefreshAccessTokenError"` surfaces in the UI as a scope-mismatch / reauth banner (polish pass).

---

## 7. Frontend architecture: `components/inbox/InboxView.tsx`

`InboxView` is the **only** owner of cross-feature state. Every panel receives what it needs via typed props; no child reaches into NextAuth or fetches its own session.

### State InboxView owns

```ts
const [activeNav, setActiveNav] = useState<NavId>("inbox");
const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
const [searchQuery, setSearchQuery] = useState("");
const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
const [showComposer, setShowComposer] = useState(false);
const [compose, setCompose] = useState<ComposeState | null>(null);
const [store, setStore] = useState<SanitizedInboxStore | null>(null);
const [syncing, setSyncing] = useState(false);
const [modifying, setModifying] = useState(false);

// Lifted out of ReplyComposer so AiThreadPanel.onUseDraft can write to it.
const [replyDraftsByThread, setReplyDraftsByThread] = useState<Record<string, string>>({});
const setReplyText = (threadId: string, text: string) =>
  setReplyDraftsByThread(prev => ({ ...prev, [threadId]: text }));

// Set of thread IDs with optimistic actions in flight (archive/trash/reminder mutation).
// LiveSyncPanel defers refresh while non-empty.
const pendingOptimisticThreadIdsRef = useRef<Set<string>>(new Set());

const { toasts, push: showToast, dismiss } = useToastQueue({ defaultDurationMs: 5000 });
```

### State the panels own internally

- `AiThreadPanel`: `summaryResult`, `draftResult`, `tone`, `askClarifyingQuestion`, `reviseInstruction`, `summaryPending`, `draftPending`, `lastRequestId` (via `useFeatureSeqRef`).
- `ReminderThreadPanel`: form state, per-action pending flags. The reminder list itself is derived from `store.reminders` filtered by `threadId`.
- `InboxSearchResults`: results array, pending flag, debounce timer, abort controller.
- `LiveSyncPanel`: connection status, subscription list, subscription form state.
- `ClearCacheAction`: confirmation modal state, typed-confirmation text.

### Effect: clear-on-thread-change

```ts
useEffect(() => {
  // InboxView clears: showComposer state if open without unsent text, ai-seed value, etc.
  // AI panel internal state, reminder form state, search-pending-for-old-thread, etc.
  // are owned by each panel's own useEffect keyed on the same threadId prop.
}, [selectedThreadId]);
```

### Clear-cache cascade

On success of `DELETE /api/inbox/cache`:

```ts
setStore(empty);
setSelectedThreadId(null);
setCompose(null);
setShowComposer(false);
setSearchQuery("");
setActiveFilter("all");
setReplyDraftsByThread({});
pendingOptimisticThreadIdsRef.current.clear();
await signOut({ redirect: false });
```

---

## 8. Component contracts

### `Sidebar`
Props: `activeNav`, `setActiveNav`, `session`, `onSignOut`, `onOpenAccountMenu`. Renders folder nav + account footer with menu trigger.

### `EmailList`
Props: `cards`, `selectedThreadId`, `setSelectedThreadId`, `activeFilter`, `setActiveFilter`, `searchQuery`, `setSearchQuery`, `syncing`, `onRefresh`, `isSearchMode`, `hasActiveReminder: (threadId: string) => boolean`.
- Renders the active-folder thread list, the search input, the Unread filter chip.
- When `isSearchMode` is true, the filter chip is visible but disabled (search dominates).
- Each row shows a small badge when `hasActiveReminder(thread.id)` is true.

### `EmailDetail`
Props: `card`, `threadMessages`, `showComposer`, `setShowComposer`, `position`, `total`, `onPrev`, `onNext`, `onModify`, `onForward`, `onSendReply`, `onError`, `replyText`, `setReplyText`, `modifying`, `syncing`, **`aiPanelSlot: ReactNode`**, **`reminderPanelSlot: ReactNode`**.
- Renders thread header, message bodies, reply composer, action buttons.
- Mounts the AI panel inline between subject row and message list via `aiPanelSlot`.
- Mounts the reminder panel inside the detail toolbar via `reminderPanelSlot`.
- **Why slots, not direct mounts:** `EmailDetail` does not own AI/reminder state and should not re-render when AI panel updates. The parent passes pre-bound elements.

### `EmailMessage`
Renders one message body. HTML bodies render in an `<iframe srcDoc>` for isolation; plain-text bodies render with `white-space: pre-wrap`. Attachment row below the body lists `MessageAttachment[]` and links to `/api/attachments/...`.

### `ReplyComposer`
Props: `recipientLabel`, `body`, `setBody`, `onDiscard`, `onSend`, `onError`.
- Controlled by parent (`replyText` is lifted).
- `Cmd/Ctrl+Enter` sends.
- Discard with non-empty body asks for confirmation.

### `ComposeDialog`
Props: `mode: "new" | "forward"`, `initial`, `onClose`, `onSend`, `onError`.
- `role="dialog"`, `aria-modal="true"`.
- Tab trap, Esc closes (with discard confirm if body non-empty).
- Auto-focus `To` (new) or `body` (forward).
- Greys out Send until at least one recipient looks like an email.

### `AppToast`
Props: `toasts`, `dismiss`.
- Renders the queue at fixed bottom-right.
- Each toast has a close button and optional Retry action.
- `aria-live="polite"` for the container.

### `AiThreadPanel`
Props: `selectedThreadId`, `replyHasUserContent: boolean`, `onUseDraft: (draft: DraftReply) => void`, `onError`.
- Renders Summarize and Draft Reply buttons, tone selector, clarifying-question toggle, revision input, Revise Draft button.
- Disables all buttons while no thread is selected.
- Sends `{ tone, askClarifyingQuestion }` to draft; sends `{ draft: <current>, instruction }` to revise (the field is `draft`, not `currentDraft`).
- "Use Draft" calls `onUseDraft(draftResult.draft)`. If `replyHasUserContent`, calls `window.confirm` first.
- Clears all internal state when `selectedThreadId` changes (own `useEffect`).
- Renders a "Heuristic fallback (no AI key configured)" badge when `meta.source === "fallback"`.
- All non-2xx responses surface via `onError`.
- Uses `useFeatureSeqRef` to ignore stale responses after thread switch.

### `ReminderThreadPanel`
Props: `selectedThreadId`, `reminders: Reminder[]`, `onRemindersChange: (next: Reminder[]) => void`, `onError`.
- Form: `<input type="datetime-local">` + reason field. Coerce to ISO via `new Date(value).toISOString()` before POSTing.
- Lists reminders filtered to the current thread; mark-complete and delete actions.
- The "thread has reminder" indicator is exposed as an exported pure helper:

```ts
export function hasActiveReminder(threadId: string, reminders: Reminder[]): boolean;
```

`EmailList` imports this helper to render the row badge.

### `InboxSearchResults`
Props: `query`, `selectedThreadId`, `onSelectThread: (thread: Thread) => void`, `onError`.
- Custom hook `useInboxSearch(query)` owns the 300ms debounce, abort, sequence ref.
- Empty `query` → render nothing; parent treats `isSearchMode = false`.
- Loading / empty / error states each have explicit copy:
  - empty: `"No matches in your synced mail. Try refreshing or expanding sync."`
  - error: routed via `onError`.
- Clicking a result calls `onSelectThread(result.thread)`. Parent merges the thread into the visible list if not already there.

### `LiveSyncPanel`
Props: `sessionStatus`, `userEmail`, `provider: "google"`, `activeNav`, `runSync: (label: NavId) => Promise<void>`, `pendingOptimisticThreadIdsRef`, `hasOpenComposer: boolean`, `onError`.
- Uses `useInboxStream({ enabled: sessionStatus === "authenticated", onSync, onStatusChange })`.
- Filtering rules in `onSync`:
  1. `event.type === "sync"`.
  2. `event.provider === provider`.
  3. If both `event.email` and `userEmail` are set, require case-insensitive match.
  4. Defer refresh while `pendingOptimisticThreadIdsRef.current.size > 0`; coalesce multiple events into one refresh.
  5. Never refresh while `hasOpenComposer && document.activeElement` is inside the composer (avoids focus theft).
- Renders status pill: `connected | refreshed | disconnected | off`.
- Subscription section: list existing subscriptions from `GET /api/inbox/subscriptions`; "Enable live sync" button POSTs to the same route. 502 errors render inline + toast.

### `ClearCacheAction`
Props: `onCleared: () => Promise<void>`, `onError`.
- Mounted from the account menu (Sidebar footer), never from a primary toolbar.
- Two-step confirmation: modal with typed-confirmation input (`"delete"`).
- On success: calls `onCleared()` (the parent's cascade).

---

## 9. Hooks

### `hooks/use-inbox-stream.ts`

```ts
function useInboxStream(opts: {
  enabled: boolean;
  onSync: (event: InboxEvent) => void;
  onStatusChange?: (status: "connecting" | "open" | "closed" | "error") => void;
}): void;
```

- Owns the `EventSource`; reconnects with exponential backoff (1s → 30s cap).
- Passes the parsed event payload to `onSync` (this is critical — earlier prototypes called `onSync()` with no args, which made provider/email filtering impossible).
- Closes cleanly when `enabled` flips to false or on unmount.

### `hooks/use-feature-seq-ref.ts`

Tiny helper to guard against stale async results: returns a monotonically incremented `next()` and a `current` accessor. Used by AI panel and search hook to ignore responses for a request older than the latest.

### `hooks/use-toast-queue.ts`

Replaces a single `toastError` string with a FIFO queue. API:

```ts
const { toasts, push, dismiss } = useToastQueue({ defaultDurationMs: 5000 });
push({ id?: string; message: string; variant?: "error" | "info"; durationMs?: number; retry?: () => void });
```

- Auto-dismiss after `durationMs`.
- Keyed `id` lets re-pushes replace an existing toast instead of stacking.
- Toasts are rendered by `AppToast`.

### `hooks/use-global-keymap.ts`

Document-level `keydown` handler with a built-in skip rule:

```ts
function isTypingTarget(el: EventTarget | null): boolean;
// returns true if focus is inside input, textarea, select, [contenteditable="true"], or inside an open dialog (role="dialog")
```

The hook accepts a map of `{ key: () => void }` and respects the skip rule globally. No feature panel may register its own document-level listener.

Default bindings:
- `j` / `k` → next/prev thread
- `r` → open reply
- `e` → archive
- `#` → trash
- `c` → compose
- `/` → focus search input
- `Esc` → close dialog or discard reply
- `Cmd/Ctrl+Enter` → send (only when reply or compose has valid recipients)

---

## 10. Build order (frontend)

Each step ships independently and leaves the app in a runnable state. Assumes the backend routes exist (stub them with static fixtures if needed during frontend-first development).

1. **Project bootstrap.** Install client deps: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `next-auth@beta`, `zod`, `@phosphor-icons/react`. Dev: `vitest`, `@vitejs/plugin-react`. Configure Tailwind for slate-* dark palette. Add `app/page.tsx` (SignInGate when signed-out, redirect to `/inbox` when signed-in). Add stub `InboxView` rendering "Hello".
2. **Auth wiring.** `useSession` in `app/page.tsx` and `InboxView`. `SignInGate` component with `signIn("google")` button. No child component fetches its own session.
3. **Shared types + api helper.** `lib/types.ts`, `lib/schemas.ts`, `lib/api.ts`. The api helper throws on non-2xx with the server's `error` string.
4. **Inbox shell.** `InboxView` owns state per §7. `Sidebar` + `EmailList` + empty `EmailDetail` wired against `POST /api/inbox/sync`. End of step: signed-in user can browse folders and see thread metadata.
5. **Message bodies + attachments.** `EmailMessage` (iframe `srcDoc`), attachments row, links to `/api/attachments/[messageId]/[attachmentId]`. End of step: full bodies render, attachments download.
6. **Send / reply / forward / compose.** `ReplyComposer`, `ComposeDialog`. Lift `replyText` into `InboxView` from day one. `Cmd/Ctrl+Enter` sends. End of step: full send/reply/forward works against `/api/send`.
7. **Modify.** Archive/trash/mark-unread/mark-read buttons in `EmailDetail` calling `/api/threads/[threadId]/modify`. End of step: action toolbar works.
8. **Toast queue + keymap.** `use-toast-queue`, `use-global-keymap`, `AppToast`. Wire all existing error paths through `showToast`. End of step: every error is keyboard-dismissible.
9. **AI panel.** `AiThreadPanel.tsx` mounted via `aiPanelSlot` in `EmailDetail`. Calls `/api/threads/[threadId]/summary`, `/draft`, `/draft/revise`. End of step: Summarize, Draft Reply (tone + clarifying), Revise, Use Draft all work; fallback badge shows when `meta.source === "fallback"`.
10. **Reminders.** `ReminderThreadPanel.tsx` + exported `hasActiveReminder` helper imported by `EmailList`. End of step: schedule, complete, delete; row badge appears.
11. **Search.** `InboxSearchResults.tsx` + `useInboxSearch`. `EmailList` hides its own list when `isSearchMode` is true. End of step: keyword search works; no-results copy honestly says local-only scope.
12. **Clear cache.** `ClearCacheAction.tsx` in the account menu. Wire the post-clear cascade in `InboxView`. End of step: user can wipe local store and is signed out.
13. **SSE refresh.** `hooks/use-inbox-stream.ts`. `LiveSyncPanel.tsx` (status pill only, no subscription form yet). Acceptance: a dev-only emit-sync trigger or a real webhook refreshes the UI within 2s without losing composer state.
14. **Subscriptions UI.** Subscription section of `LiveSyncPanel` against `GET`/`POST /api/inbox/subscriptions`. End of step: with backend env configured, "Enable live sync" creates a Gmail watch and live refreshes work end-to-end.
15. **Optimistic archive/trash + undo.** Add `pendingOptimisticThreadIdsRef` plumbing; `LiveSyncPanel` defers while non-empty; 5s undo toast for archive/trash via the toast queue's `retry` slot.
16. **Polish pass.** Scope-mismatch banner when `session.authError === "RefreshAccessTokenError"`. Skeleton loaders during folder switch. Smart timestamps. Empty states. Accessibility sweep (focus traps, `aria-live`, focus return). Mobile is explicitly deferred.

---

## 11. Acceptance criteria

### Core mail
- Sign-in completes and redirects to `/inbox`. Signing out returns to the gate.
- Switching folders re-fetches and shows skeletons during load.
- Selecting a thread opens its messages, marks unread as read on open (optimistic), and decrements the folder's unread count.
- Reply, Forward, Compose send via the backend and the new message appears in Sent after the post-send sync.
- Archive / Trash remove the thread from the current list immediately; failures restore it with a toast.

### AI panel
- Summarize / Draft / Revise call the correct routes with the correct shapes (`draft` not `currentDraft`).
- Switching threads aborts in-flight AI requests and clears all panel state.
- Use Draft prompts before overwriting non-empty reply text.
- `meta.source === "fallback"` renders an inline badge, not a toast.
- All AI failures route through the toast queue.

### Reminders
- Datetime input value is converted to ISO with timezone before POST.
- New reminders appear in the panel and the row badge without a page refresh.
- Mark complete and delete update state immediately on success.
- An empty list shows "No follow-ups scheduled on this thread."

### Search
- A non-empty query (after 300ms debounce) replaces the thread list with results.
- Empty query restores the normal folder view.
- Clicking a result selects the thread; if the thread is not in the current loaded list, the parent merges it before selecting.
- The Unread filter chip is disabled in search mode.
- No-results state explicitly says local-only scope.

### Clear cache
- Reachable only from the account menu.
- Modal requires typing the word `delete` to enable the destructive button.
- On success: store empties, user is signed out via `signOut({ redirect: false })`, the gate reappears.
- On failure: nothing local changes; error toast.

### SSE + subscriptions
- An emitter event with `provider: "google"` and matching `email` triggers `runSync(activeNav)` within 2 seconds.
- Events for other providers/emails are dropped.
- Refresh never closes an open compose dialog, never resets `selectedThreadId` to null, never loses reply draft text.
- Refresh is deferred while any optimistic action is pending; multiple deferred events coalesce into one refresh.
- `Enable live sync` with the backend reporting missing `GOOGLE_PUBSUB_TOPIC` shows the 502 message inline AND in a toast.

### Accessibility
- Every dialog: `role="dialog"`, `aria-modal="true"`, focus moves in on open, focus returns to opener on close, `Esc` closes.
- Toast container: `aria-live="polite"`.
- Icon-only buttons have `aria-label`.
- Keyboard shortcuts respect the typing-target rule globally.

---

## 12. Known pitfalls (do not regress)

- **`currentDraft` vs `draft`.** The revise route requires `{ draft, instruction }`. An older prototype dashboard sent `{ currentDraft, instruction }` — anyone porting from it will ship a 400. Pin in `lib/schemas.ts` and `AiThreadPanel.tsx`.
- **`hooks/use-inbox-stream.ts` callback signature.** Pass the parsed event to `onSync`, not `()`. SSE filtering depends on this.
- **`DELETE /api/inbox/cache` does not invalidate the session.** Client must call `signOut`.
- **Reminder timezone.** `<input type="datetime-local">` has no timezone. Always coerce via `new Date(value).toISOString()`.
- **`runSync` is not stateless.** It replaces `store` wholesale, which re-derives `cards`, which can reset `selectedThreadId`. Guard the auto-pick effect on `!isSearchMode`, and freeze the selected thread across background refreshes.
- **Single-string toast loses messages.** Use the queue from day one; do not start with `useState<string | null>(null)` and "upgrade later."
- **`EmailDetail` referencing parent variables.** Every value (including `showToast`) must arrive as a prop. `EmailDetail` is a separate React component; closures from `InboxView` are not in scope.
- **Server-side search is local-only.** Be explicit about this in the empty-state copy.
- **Mobile is out of scope.** Do not half-build a responsive layout; the desktop layout is the whole MVP.
- **Do not add placeholder AI UI** that calls no route. Either wire it or omit it.
- **No child component fetches its own session.** All cross-feature state flows through `InboxView` props.
- **`app/page.tsx` must branch on session.** Do not unconditionally redirect to `/inbox` — that creates a `/ → /inbox → /` bounce loop for signed-out users.

---

## 13. Definition of done (frontend)

The frontend runs locally with `npm run dev` against the documented backend routes, and a signed-in Google user can:

1. Browse Inbox, Sent, Drafts, Archive, Trash.
2. Read any thread (full bodies, attachments).
3. Send a new email, reply to a thread, forward a message.
4. Archive, trash, mark unread/read.
5. Click Summarize and see a 3-bullet summary (or heuristic fallback badge) for any thread.
6. Click Draft Reply with a tone selected, see a draft, click Use Draft, send it.
7. Click Revise Draft with a plain-language instruction and see the draft change.
8. Schedule a reminder on a thread; see the badge on the row; complete or delete it.
9. Type in the search input and see results within ~500ms; click a result to open it.
10. Open the account menu, clear the local cache, confirm sign-out happens.
11. Optionally: enable Gmail watch and see the inbox refresh automatically when new mail arrives, without losing in-flight reply text.

Type-check (`tsc --noEmit`) and Vitest component tests both pass.
