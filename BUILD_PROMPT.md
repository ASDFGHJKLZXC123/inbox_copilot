# Build Prompt: AI Inbox Copilot (from scratch)

You are building **AI Inbox Copilot**, a Superhuman/Grammarly-adjacent inbox assistant. Build it from an empty directory. This prompt is the spec — everything you need to make consistent decisions without re-deriving them.

> **This document is authoritative.** If a prior prototype exists in the working tree (older route handlers, older `lib/types.ts`, older components), **the contracts in this document supersede it**. Do not reconcile with the older code; replace it. Where this prompt and existing code disagree (request/response shapes, field names, model names, env-var names, modify actions, etc.), the prompt wins.

---

## 1. Goal

A single-user, single-account web app that lets a signed-in Google user:

- Read Gmail (Inbox / Sent / Drafts / Archive / Trash).
- Compose, reply, forward, send.
- Archive, trash, mark unread/read.
- Summarize a thread with AI.
- Generate a draft reply with AI (tone + clarifying-question option).
- Revise a draft from a natural-language instruction.
- Schedule, complete, and delete follow-up reminders for threads.
- Search the local mailbox via a backend keyword route.
- Clear the local cache.
- Enable a Gmail Pub/Sub watch so backend webhooks trigger a live refresh through SSE.

This is an MVP. Local JSON persistence, single-user, no multi-tenant concerns, no horizontal scaling. Build everything in one Next.js app.

---

## 2. Hard constraints

- **Stack:** Next.js 15+ App Router, TypeScript strict mode, React 18+, Tailwind CSS, Auth.js v5 (NextAuth) with Google provider, vitest for tests, Zod for input validation.
- **Persistence:** a single JSON file at `.data/inbox.json` mediated by `lib/db.ts`. No real database. Drizzle config may be present but is not required to be wired.
- **Scope for Gmail OAuth:** `https://www.googleapis.com/auth/gmail.modify` (NOT `gmail.readonly` — readonly cannot send/archive/trash; pin this once, do not regress).
- **AI provider order:** Claude (`@anthropic-ai/sdk`) when `ANTHROPIC_API_KEY` is set, then Gemini (`@google/generative-ai`) when `GEMINI_API_KEY` is set, then **heuristic template fallback** when neither key is present (and as the last-resort when both providers error). The heuristic fallback must always work — the app must not require an AI key to run. This ordering is canonical; do not flip it elsewhere.
- **Token storage:** encrypted at rest with AES-256-GCM when `ENCRYPTION_KEY` (32 bytes base64) is set; plaintext otherwise; format `enc:v1:<iv>:<ciphertext>:<tag>`.
- **No backwards-compat shims, no feature flags.** Build the right thing once.
- **No placeholder UI for AI features** — AI features must be backed by a real route call.
- **Single user, single account.** Microsoft adapter code may exist for symmetry but is backend-only and not exposed in the UI.

---

## 3. Out of scope

- Multi-account UI.
- Real notification delivery for reminders (in-app records only).
- Send attachments (receive/list only).
- Light mode (slate-* dark only).
- Server-side Gmail `q=` search (local-store keyword only).
- Rich-text compose (plain-text body only).
- Mobile-optimized layout (desktop 1280×800+; mobile is a follow-up).
- Multi-provider UI.
- Drizzle-backed Postgres (the JSON store is the source of truth).

---

## 4. Environment variables

| Name | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | yes | Auth.js v5 cookie signing. (Auth.js v5 uses `AUTH_SECRET`; `NEXTAUTH_SECRET` is a legacy alias — do not use it.) |
| `AUTH_URL` | yes | e.g. `http://localhost:3000`. (Legacy `NEXTAUTH_URL` is also accepted but use `AUTH_URL`.) |
| `GOOGLE_CLIENT_ID` | yes | OAuth client |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth client |
| `ANTHROPIC_API_KEY` | optional | Enables Claude as the primary AI provider |
| `GEMINI_API_KEY` | optional | Enables Gemini as the secondary AI provider |
| `GEMINI_MODEL` | optional | Defaults to `gemini-2.5-flash` |
| `ENCRYPTION_KEY` | optional | 32 random bytes base64; encrypts tokens at rest |
| `GOOGLE_PUBSUB_TOPIC` | conditional | Required to create a Gmail watch subscription. Without it, `/api/inbox/subscriptions` returns 502 with a setup message. |
| `GOOGLE_PUSH_ENDPOINT` | conditional | Publicly reachable HTTPS URL for the Pub/Sub push subscription (the `/api/webhooks/google` route). Required for subscription creation in production. |
| `GOOGLE_PUBSUB_AUDIENCE` | conditional | OIDC audience used to verify Pub/Sub push tokens at `/api/webhooks/google`. Required whenever real webhooks are accepted. |
| `MICROSOFT_WEBHOOK_URL` | optional | Backend-only; never required by the UI |

Without `GEMINI_API_KEY` and `ANTHROPIC_API_KEY`, AI routes return `meta.source === "fallback"` and a heuristic summary/draft. The UI must surface this as a small badge, not an error toast.

---

## 5. Project layout

```
.
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── inbox/
│   │   │   ├── sync/route.ts
│   │   │   ├── sync/all/route.ts
│   │   │   ├── cache/route.ts
│   │   │   ├── stream/route.ts
│   │   │   └── subscriptions/route.ts
│   │   ├── threads/[threadId]/
│   │   │   ├── modify/route.ts
│   │   │   ├── summary/route.ts
│   │   │   ├── draft/route.ts
│   │   │   └── draft/revise/route.ts
│   │   ├── reminders/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── search/route.ts
│   │   ├── send/route.ts
│   │   ├── attachments/[messageId]/[attachmentId]/route.ts
│   │   ├── dev/emit-sync/route.ts          # dev-only; 404s outside development
│   │   └── webhooks/
│   │       ├── google/route.ts
│   │       └── microsoft/route.ts
│   ├── inbox/page.tsx
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
├── lib/
│   ├── auth.ts                    # NextAuth config + session augmentation
│   ├── db.ts                      # JSON store mediator (getStore / setStore)
│   ├── connections.ts             # token refresh + lookup
│   ├── crypto.ts                  # AES-256-GCM + format wrapper
│   ├── copilot.ts                 # AI provider selection + prompts
│   ├── api.ts                     # tiny fetch helpers for client
│   ├── inbox-emitter.ts           # SSE pub/sub for stream route
│   ├── logger.ts
│   ├── schemas.ts                 # Zod schemas
│   └── types.ts                   # SanitizedInboxStore, Thread, Message, Reminder, etc.
├── providers/adapters.ts          # gmail + microsoft graph adapters (typed seam)
├── auth.ts                        # re-exports next-auth handlers
├── middleware.ts                  # protects /inbox
├── drizzle.config.ts              # optional
├── docker-compose.yml             # optional
├── package.json
└── tsconfig.json
```

---

## 6. Data model (`lib/types.ts` and `lib/schemas.ts`)

### Types

```ts
type ProviderType = "google" | "microsoft";
type NavId = "inbox" | "sent" | "drafts" | "archive" | "trash";
type Tone = "concise" | "friendly" | "formal";

interface Connection {
  provider: ProviderType;
  email: string;
  accessToken: string;        // encrypted at rest if ENCRYPTION_KEY set
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  updatedAt: string;
}

interface MessageAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;       // required so /api/attachments can stream it
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
  messageIdHeader?: string;   // for In-Reply-To threading later
}

interface Thread {
  id: string;
  provider: ProviderType;
  email: string;              // account that owns this thread
  subject: string;
  participants: string[];
  lastMessageAt: string;
  labels: string[];           // includes INBOX | SENT | TRASH | DRAFT
  unreadCount: number;
  messageIds: string[];
}

interface Reminder {
  id: string;
  threadId: string;
  dueAt: string;              // ISO 8601 with timezone (RFC 3339)
  reason: string;             // 1..1000 chars
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

interface InboxStore {
  connections: Connection[];
  threads: Thread[];
  messages: Message[];
  reminders: Reminder[];
  subscriptions: ProviderSubscription[];
}

type SanitizedInboxStore = Omit<InboxStore, "connections"> & {
  connections: Array<Omit<Connection, "accessToken" | "refreshToken">>;
};
```

### Zod schemas (`lib/schemas.ts`)

- `DraftRequestSchema`: `{ tone: Tone (default "concise"), askClarifyingQuestion: boolean (default false) }`.
- `ReviseRequestSchema`: `{ draft: { subject: string, body: string }, instruction: string (1..2000) }`. **The field is `draft`, NOT `currentDraft`.** This trips up anyone copying older prototype code.
- `ReminderCreateSchema`: `{ threadId: string, dueAt: z.string().datetime(), reason: string (1..1000) }`. `datetime()` requires RFC 3339 with timezone — coerce client `<input type="datetime-local">` via `new Date(v).toISOString()`.
- `SearchRequestSchema`: `{ query: string (1..500) }`.
- `SendRequestSchema`: `{ to: string[] (>=1 valid email), cc?: string[], bcc?: string[], subject: string, body: string, threadId?: string, inReplyToMessageId?: string }`.
- `ModifyRequestSchema`: `{ action: "archive" | "trash" | "untrash" | "unarchive" | "mark-read" | "mark-unread" }`.

---

## 7. Persistence (`lib/db.ts`)

- `getStore(): Promise<InboxStore>` — reads `.data/inbox.json`, creates an empty store if missing, transparently decrypts encrypted tokens.
- `setStore(store: InboxStore): Promise<void>` — writes atomically (write to `.tmp` then rename), encrypts tokens if `ENCRYPTION_KEY` is set.
- `clearStore(): Promise<SanitizedInboxStore>` — atomically replaces `.data/inbox.json` with an empty store and returns the sanitized (token-stripped) empty store. The cache DELETE route forwards this return value to the client.
- `sanitizeStore(store: InboxStore): SanitizedInboxStore` — strips `accessToken` / `refreshToken` from `connections` before returning over HTTP.
- `searchThreads(store, query): Array<{ thread, score, unreadCount }>` — case-insensitive keyword scan over `subject`, `participants`, message `snippet`/`bodyText`. Order by score desc, limit 50.

Concurrency: single-writer serialization via a simple in-memory `Promise` chain. The MVP only sees one writer at a time (the active session); do not over-engineer.

---

## 8. Crypto (`lib/crypto.ts`)

- `encryptToken(plaintext: string): string` → `enc:v1:<base64 iv>:<base64 ct>:<base64 tag>`.
- `decryptToken(value: string): string` — passthrough if value does not start with `enc:v1:`.
- Algorithm: AES-256-GCM with 12-byte random IV, 16-byte tag.
- Use Node's `crypto.subtle` or `node:crypto`; do not pull a dependency.
- Key derivation: none; the env var `ENCRYPTION_KEY` is itself the 32-byte base64 key.
- Rotating the key invalidates existing tokens — that is acceptable; users reconnect.

---

## 9. Auth (`lib/auth.ts`, `auth.ts`)

- Auth.js v5, Google provider.
- Scopes: `openid email profile https://www.googleapis.com/auth/gmail.modify`.
- `jwt` callback: persist `accessToken`, `refreshToken`, `expiresAt`, `email`. On token expiry, refresh via Google's token endpoint; set `session.authError = "RefreshAccessTokenError"` on failure.
- `session` callback: pass `email`, `accessToken`, `authError` to client.
- Persist the connection in the JSON store on successful sign-in (provider, email, encrypted tokens) so webhook handlers can sync without a browser session.
- `middleware.ts`: protect `/inbox`; redirect unauthenticated requests to `/`. **`/` must render the `SignInGate` for signed-out users and redirect to `/inbox` for signed-in users** — do not have `/` blindly redirect to `/inbox` or you create a `/ → /inbox → /` bounce loop.

---

## 10. Provider adapter (`providers/adapters.ts`)

A typed seam, not a registry. Export two object literals: `gmailAdapter` and `microsoftAdapter`, each conforming to:

```ts
interface ProviderAdapter {
  syncMailbox(connection, options: { label: NavId }): Promise<{ threads: Thread[]; messages: Message[] }>;
  sendMessage(connection, req: SendRequest): Promise<{ id: string; threadId: string }>;
  modifyThread(connection, threadId, action): Promise<void>;
  getAttachment(connection, messageId, attachmentId): Promise<{ filename, mimeType, data: Buffer }>;
  createWatch(connection, opts): Promise<ProviderSubscription>;       // gmail uses Pub/Sub
}
```

Gmail implementation rules:
- Use `googleapis` npm package.
- `syncMailbox` for `inbox` merges `INBOX` AND `SENT` thread IDs so outbound replies appear in the local thread model (this is non-obvious — comment it).
- `sendMessage`: build RFC 2822, base64url-encode, `users.messages.send`. If `threadId` and `inReplyToMessageId` provided, include `In-Reply-To` + `References` headers.
- `modifyThread`:
  - `archive` → removeLabelIds: ["INBOX"]
  - `unarchive` → addLabelIds: ["INBOX"]
  - `trash` → `threads.trash`
  - `untrash` → `threads.untrash`
  - `mark-read` → removeLabelIds: ["UNREAD"]
  - `mark-unread` → addLabelIds: ["UNREAD"]
- `getAttachment` → `users.messages.attachments.get`, decode base64url to Buffer.
- `createWatch` → `users.watch` with `topicName` from `GOOGLE_PUBSUB_TOPIC`. If env var unset, throw a typed error the route can return as 502 with a clear setup message.

**Pub/Sub provisioning is out-of-band.** The app does NOT create the Pub/Sub topic or the push subscription. The operator provisions them (via `gcloud` or Terraform) before the user clicks "Enable live sync":

- `GOOGLE_PUBSUB_TOPIC` — the topic Gmail's `users.watch` publishes mailbox-change notifications to. The app only references it.
- `GOOGLE_PUSH_ENDPOINT` — the HTTPS URL the Pub/Sub push subscription forwards messages to. In this app, it is `${AUTH_URL}/api/webhooks/google`. The app reads this only to validate setup; the push subscription itself is provisioned externally.
- `GOOGLE_PUBSUB_AUDIENCE` — the OIDC `aud` claim the operator configured on the push subscription. The webhook route at `/api/webhooks/google` verifies incoming push tokens against this value (using Google's public JWKs). Reject with `401` on mismatch.

The MVP's `createWatch` only attaches a Gmail mailbox to the existing topic. It does NOT call the Pub/Sub Admin API. README must include the `gcloud` recipe for creating the topic + push subscription.

Microsoft adapter exists for symmetry; do not wire into the UI.

---

## 11. AI layer (`lib/copilot.ts`)

```ts
type CopilotSource = "claude" | "gemini" | "fallback";
interface CopilotMeta { source: CopilotSource; model?: string }
interface ThreadSummaryResult { meta: CopilotMeta; summary: { headline: string; action: string; bullets: string[] } }
interface DraftReply { subject: string; body: string }
interface DraftReplyResult { meta: CopilotMeta; draft: DraftReply }

export async function summarizeThread(thread: Thread, messages: Message[]): Promise<ThreadSummaryResult>;
export async function generateDraft(thread: Thread, messages: Message[], opts: { tone: Tone; askClarifyingQuestion: boolean }): Promise<DraftReplyResult>;
export async function reviseDraft(thread: Thread, messages: Message[], draft: DraftReply, instruction: string): Promise<DraftReplyResult>;
```

Provider order: Claude → Gemini → heuristic. Each helper catches provider errors and continues to the next.

**Heuristic fallback (must always work):**
- Summary: `headline = subject`; `action = "Reply when ready."`; `bullets = first 3 message snippets truncated to 120 chars`.
- Draft: subject `= "Re: " + thread.subject` (skip if already prefixed); body `= "Hi <first name>,\n\nThanks for your note.\n\n<tone-conditioned closing>"`.
- Revise: append `"\n\n[Revised: " + instruction + "]"` to the body. Crude on purpose — it lets the user verify the round-trip without an API key.

**Prompt construction rules:**
- Truncate per-message body to ~2000 chars to keep token cost predictable.
- Bullets must be ≤ 3 entries, each ≤ 160 chars; enforce after model returns.
- Validate `subject` and `body` are non-empty strings; if empty, fall through to the next provider.

---

## 12. API routes

All routes return JSON. All errors return `{ error: string }` with an appropriate status. All POST/PATCH bodies are validated via the Zod schemas above; failure → `400` with the Zod error message.

### Inbox

- **`POST /api/inbox/sync`** — body `{ label?: NavId, accessToken?: string }`. Calls the appropriate adapter, merges results into the store, returns `SanitizedInboxStore`. `accessToken` body field is for early dev testing; production reads from the session.
- **`POST /api/inbox/sync/all`** — bulk refresh across stored connections (no browser session required). Used by webhook handlers. Returns `{ ok: true, synced: number }`.
- **`DELETE /api/inbox/cache`** — wipes `.data/inbox.json` to empty. Returns `SanitizedInboxStore` (empty). **Does NOT invalidate the NextAuth cookie** — the client is responsible for calling `signOut({ redirect: false })` after.
- **`GET /api/inbox/stream`** — `text/event-stream`. Subscribes to `lib/inbox-emitter`. Emits `event: ping` every 25s for keep-alive and `event: sync` with JSON payload `{ type: "sync"; provider: ProviderType; email?: string }` whenever a webhook hits.
- **`GET /api/inbox/subscriptions`** — returns `ProviderSubscription[]`.
- **`POST /api/inbox/subscriptions`** — body `{ provider: ProviderType; email?: string }`. Creates a watch via the adapter. Returns the updated `ProviderSubscription[]`. Errors: `401` if no connection; `502` with a human-readable message if `GOOGLE_PUBSUB_TOPIC` is missing. Note: this route validates only `GOOGLE_PUBSUB_TOPIC` (the only var `users.watch` directly needs). `GOOGLE_PUBSUB_AUDIENCE` is validated at webhook delivery time inside `/api/webhooks/google` (reject 401 on mismatch). `GOOGLE_PUSH_ENDPOINT` is operator-side metadata — the app does not enforce it at request time.

### Threads

- **`POST /api/threads/[threadId]/modify`** — `ModifyRequestSchema`. Returns `SanitizedInboxStore`.
- **`POST /api/threads/[threadId]/summary`** — no body. Returns `ThreadSummaryResult`. `404` if thread missing.
- **`POST /api/threads/[threadId]/draft`** — `DraftRequestSchema`. Returns `DraftReplyResult`. `404` if thread missing.
- **`POST /api/threads/[threadId]/draft/revise`** — `ReviseRequestSchema`. Returns `DraftReplyResult`. `400` if `draft.body` empty or `instruction` empty; `404` if thread missing.

### Reminders

- **`GET /api/reminders`** → `Reminder[]`.
- **`POST /api/reminders`** — `ReminderCreateSchema`. Returns `Reminder[]` (full updated list).
- **`PATCH /api/reminders/[id]`** — body `{ completed: boolean }`. Returns `Reminder[]`. (Earlier prototype returned the full store here; the new contract is `Reminder[]` for consistency with POST.)
- **`DELETE /api/reminders/[id]`** — no body. Returns `Reminder[]`.

### Search / send / attachments

- **`POST /api/search`** — `SearchRequestSchema`. Returns `Array<{ thread: Thread; score: number; unreadCount: number }>`. Local store scan only.
- **`POST /api/send`** — `SendRequestSchema`. Returns `{ id, threadId }`. Triggers an immediate inbox sync for `inbox`+`sent` and returns after the sync completes.
- **`GET /api/attachments/[messageId]/[attachmentId]`** — streams the file with proper `Content-Type` and `Content-Disposition: attachment; filename="..."`. `404` if not found, `401` if not signed in.

### Webhooks

- **`POST /api/webhooks/google`** — Google Pub/Sub push. Verifies OIDC token signature. Looks up affected connection, calls `inboxEmitter.emit({ type: "sync", provider: "google", email })`. Returns `200`. Errors logged, never throw to the caller (Pub/Sub will retry).
- **`POST /api/webhooks/microsoft`** — symmetric; backend-only.

---

## 13. SSE emitter (`lib/inbox-emitter.ts`)

```ts
type InboxEvent = { type: "sync"; provider: ProviderType; email?: string };
export const inboxEmitter = new EventEmitter();   // or a tiny pub/sub
// Listeners receive the InboxEvent. Stream route forwards as event: sync.
```

The event payload **must** include `provider` and (when known) `email`. Do not omit. Frontend filtering depends on this.

---

## 14. Hooks

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

## 15. Frontend architecture: `components/inbox/InboxView.tsx`

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

## 16. Component contracts

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

## 17. Build order

Each step ships independently and leaves the app in a runnable state. Do not skip ahead.

1. **Project bootstrap.** Install: `next`, `react`, `react-dom`, `typescript`, `tailwindcss`, `next-auth@beta`, `zod`, `googleapis`, `@google/generative-ai`, `@anthropic-ai/sdk`, `@phosphor-icons/react` (icons). Dev: `vitest`, `@vitejs/plugin-react`, `@types/node`, `@types/react`. Configure Tailwind for the slate-* dark palette. Add `app/page.tsx` that renders `SignInGate` when signed-out and redirects to `/inbox` when signed-in (do not unconditionally redirect — see auth section). Add a stub `InboxView` that renders "Hello".
2. **Auth.** NextAuth Google provider with `gmail.modify` scope. Session augmentation. Middleware protects `/inbox`. SignInGate component. Persist the connection in the JSON store on first sign-in.
3. **Persistence + crypto.** `lib/db.ts`, `lib/crypto.ts`, `lib/types.ts`, `lib/schemas.ts`. Tests for round-trip encryption and store atomicity.
4. **Gmail adapter + sync.** `providers/adapters.ts` (gmail half), `/api/inbox/sync`. Wire `runSync` in `InboxView` and render `Sidebar` + `EmailList` + an empty `EmailDetail`. End of step: signed-in user can browse Inbox / Sent / Drafts / Archive / Trash and read thread metadata.
5. **Message bodies + attachments.** `EmailMessage` (iframe `srcDoc`), `AttachmentsRow`, `/api/attachments/[messageId]/[attachmentId]`. End of step: user can read full bodies and download attachments.
6. **Send / reply / forward / compose.** `/api/send`, `ReplyComposer`, `ComposeDialog`. Lift `replyText` into `InboxView` from day one. `Cmd/Ctrl+Enter` to send. End of step: full send/reply/forward works.
7. **Modify.** `/api/threads/[threadId]/modify`, archive/trash/mark-unread/mark-read buttons in `EmailDetail`. End of step: action toolbar works against Gmail.
8. **Toast queue + keymap.** `use-toast-queue`, `use-global-keymap`, `AppToast`. Wire all existing error paths through `showToast`. End of step: every error is keyboard-dismissible.
9. **AI panel.** `lib/copilot.ts` (Claude → Gemini → heuristic). Routes for `summary`, `draft`, `draft/revise`. `AiThreadPanel.tsx` mounted via `aiPanelSlot` in `EmailDetail`. End of step: Summarize, Draft Reply (with tone + clarifying), Revise Draft, Use Draft all work; fallback badge shows when no AI key is set.
10. **Reminders.** `/api/reminders` + `/api/reminders/[id]`. `ReminderThreadPanel.tsx` + `hasActiveReminder` helper imported by `EmailList`. End of step: schedule, complete, delete; row badge appears.
11. **Server-side search.** `/api/search`. `InboxSearchResults.tsx` + `useInboxSearch`. `EmailList` hides its own list when `isSearchMode` is true. End of step: keyword search works, no-results copy is honest about local-only scope.
12. **Clear cache.** `/api/inbox/cache` DELETE. `ClearCacheAction.tsx` in the account menu. Wire the post-clear cascade in `InboxView`. End of step: user can wipe the local store and is signed out.
13. **SSE refresh.** `/api/inbox/stream`, `lib/inbox-emitter.ts`, `hooks/use-inbox-stream.ts`. `LiveSyncPanel.tsx` (status pill only, no subscription form yet). Add a **dev-only** trigger route `POST /api/dev/emit-sync` (guarded by `if (process.env.NODE_ENV !== "development") return 404`) that accepts `{ provider, email? }` and calls `inboxEmitter.emit(...)` — this exists so step 13 is acceptance-testable without a webhook. Acceptance: hitting the dev route triggers a refresh in the UI within 2 seconds without losing composer state.
14. **Subscriptions.** `/api/inbox/subscriptions` GET/POST. Gmail watch via Pub/Sub. Subscription section of `LiveSyncPanel`. Webhook route `/api/webhooks/google` emits to `inboxEmitter` on push. End of step: with `GOOGLE_PUBSUB_TOPIC` and a public push URL, a Gmail event triggers a UI refresh end-to-end.
15. **Optimistic archive/trash + undo.** Add `pendingOptimisticThreadIdsRef` plumbing; `LiveSyncPanel` defers while non-empty; 5s undo toast for archive/trash via the toast queue's `retry` slot.
16. **Polish pass.** Scope-mismatch banner when `session.authError === "RefreshAccessTokenError"`. Skeleton loaders during folder switch. Smart timestamps. Empty states. Accessibility sweep (focus traps, `aria-live`, focus return). Mobile is explicitly deferred.

---

## 18. Acceptance criteria (per surface)

### Core mail
- Sign-in completes and redirects to `/inbox`. Signing out returns to the gate.
- Switching folders re-fetches and shows skeletons during load.
- Selecting a thread opens its messages, marks unread as read on open (optimistic), and decrements the folder's unread count.
- Reply, Forward, Compose send via Gmail and the new message appears in Sent after the post-send sync.
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
- `Enable live sync` with missing `GOOGLE_PUBSUB_TOPIC` shows the route's 502 message inline AND in a toast.

### Accessibility
- Every dialog: `role="dialog"`, `aria-modal="true"`, focus moves in on open, focus returns to opener on close, `Esc` closes.
- Toast container: `aria-live="polite"`.
- Icon-only buttons have `aria-label`.
- Keyboard shortcuts respect the typing-target rule globally.

---

## 19. Known pitfalls (do not regress)

- **`gmail.readonly` vs `gmail.modify`.** The README that ships with the older prototype claims readonly; the real app needs `modify`. Set this in the auth config once and update the README.
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
- **Do not amend commits or skip hooks.** Standard project hygiene.

---

## 20. Definition of done

The app runs locally with `npm run dev`, a signed-in Google user can:

1. Browse Inbox, Sent, Drafts, Archive, Trash.
2. Read any thread (full bodies, attachments).
3. Send a new email, reply to a thread, forward a message.
4. Archive, trash, mark unread/read.
5. Click Summarize and see a 3-bullet summary (or heuristic fallback) for any thread.
6. Click Draft Reply with a tone selected, see a draft, click Use Draft, send it.
7. Click Revise Draft with a plain-language instruction and see the draft change.
8. Schedule a reminder on a thread; see the badge on the row; complete or delete it.
9. Type in the search input and see backend-keyword results within ~500ms; click a result to open it.
10. Open the account menu, clear the local cache, confirm sign-out happens.
11. Optionally: enable Gmail watch (with `GOOGLE_PUBSUB_TOPIC` set + a public push URL) and see the inbox refresh automatically when new mail arrives, without losing in-flight reply text.

Type-check (`tsc --noEmit`) and unit tests (`vitest run`) both pass. The README accurately reflects the live UI's scope (`gmail.modify`, cache-clear is in the UI, AI features wired, etc.).
