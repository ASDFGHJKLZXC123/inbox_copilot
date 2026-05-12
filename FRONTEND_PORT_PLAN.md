# Frontend Port Plan — Email Copilot mockup → Next.js

## Goal
Replace the current Next.js UI in `app/` + `components/` with the design from `Email Copilot/`, **without** breaking the existing backend: API routes under `app/api/**`, next-auth, Drizzle DB, server actions, and types in `lib/`. Result must `npm run typecheck` clean and `npm test` green.

## Source / target
- **Mockup**: `Email Copilot/index.html` + `Email Copilot/src/*.jsx` (19 files, ~4500 LOC, in-browser Babel, mock data only)
- **Current**: Next.js 15 + React 19 + TS, Tailwind, next-auth, Drizzle. Inbox lives at `/inbox`; main components in `components/inbox/`.
- **Stack constraint**: keep TypeScript strict, keep Tailwind v3, keep next-auth, keep all API routes untouched.

## Strategy
The work splits into **3 phases**. Phase 0 must finish before Phase 1; Phase 1 has 3 independent workstreams that run in parallel; Phase 2 is final integration.

```
Phase 0  (sequential)
  └─→ Phase 1  ─┬─ Workstream A: Inbox screen
                ├─ Workstream B: Sign-in gate
                └─ Workstream C: Preferences page
       └─→ Phase 2  (sequential)
```

Parallel safety: each workstream in Phase 1 has an **exclusive write set** — no two workstreams modify the same file. Cross-screen links are stubbed via routing (`<Link href="/preferences">`), not direct imports, so workstreams don't need each other's components.

---

## Phase 0 — Shared foundation (must run first, ~1 session)

**Why first**: All three screens import these. If parallel workers each port `icons.tsx` their own way, you get three conflicting versions.

### Tasks

1. **Read all mockup files**
   - Path: `Email Copilot/src/*.jsx` — all 19 files
   - Notes: pay attention to `mockData.jsx` (data shapes), `hooks.jsx` (toast queue + global keymap + sleep + seq ref), `icons.jsx` (icon set), and `index.html` (Tailwind config, animations, scrollbar styles, font setup).

2. **Port icons** → `components/ui/icons.tsx`
   - Export every icon used in the mockup (`I.Search`, `I.Inbox`, `I.Sparkles`, etc.) as named React components with `{ size, strokeWidth, className }` props.
   - Prefer porting verbatim from `icons.jsx` (it's plain SVG); do not switch to `@phosphor-icons/react` even though the project has it — it'd diverge from the mockup look.

3. **Port hooks** → `lib/ui/hooks.ts`
   - `useToastQueue({ defaultDurationMs })` — returns `{ toasts, push, dismiss }`
   - `useGlobalKeymap(map)` — `j`, `k`, `r`, `e`, `#`, `c`, `/`, `Escape`, etc.
   - `useFeatureSeqRef()` — for racing-request guards.
   - `sleep(ms)` helper (re-export from a `lib/ui/util.ts`).

4. **Port global styles**
   - `app/globals.css`: scrollbar styles, `::selection`, `kbd`, `@keyframes shimmer/spin/sparkle/toastIn/overlayIn/dialogIn`, `.focus-ring`, dark-mode body bg `#020617`, Geist font import.
   - **Do NOT delete `app/inbox/inbox.css` in Phase 0** — Workstream A owns that deletion (it imports the CSS today; deleting in Phase 0 breaks the dev build before A lands). Phase 0 is additive only.
   - `tailwind.config.js`: add `Geist` / `Geist Mono` font families, the `accent` color palette (`#7dd3fc`, `500`, `600`), and any extended spacing the mockup uses.
   - `app/layout.tsx`: add Geist `<link>` preconnect+stylesheet.

7. **Port shared `ClearCacheAction`** → `components/ui/ClearCacheAction.tsx`
   - Renders the confirm dialog and calls `DELETE /api/inbox/cache` via `lib/ui/api.ts`, then `signOut({ redirect: false })`.
   - Imported by both Workstream A (Sidebar's "Clear local cache…" menu item) and Workstream C (Preferences "Reset" section).
   - Lives in Phase 0 (not Workstream A) so C can typecheck independently.

5. **UI types** → `lib/types-ui.ts` (new file, do not touch `lib/types.ts`)
   - `Toast { id?: string; message: string; variant?: 'info' | 'error'; durationMs?: number; retry?: () => void }`
   - `ThreadCard` — UI projection of `Thread` that adds `unreadCount`, `preview`, `labels: string[]`, `hasAttachment` (computed). Keep `Thread` in `lib/types.ts` canonical.
   - Adapter helpers `toThreadCard(thread, messages)`, `toUiSession(nextAuthSession)`.

6. **API adapter** → `lib/ui/api.ts`
   - Thin wrappers around `fetch` for every route the inbox calls. One function per route. Each returns parsed JSON or throws.
   - Routes already in the backend (do not invent new ones). **Shapes below were verified against the actual route handlers — do not "improve" them:**
     - `GET /api/inbox/sync` → `SanitizedInboxStore` (full store; use on initial mount)
     - `POST /api/inbox/sync` `{ provider: 'google' | 'microsoft', email?: string, label?: string }` → **partial** sanitized store: shape is `SanitizedInboxStore` but `threads` and `messages` are **replaced** with only the freshly-synced label's slice (see `app/api/inbox/sync/route.ts:49-53`). Use this when switching folders. Caller must treat the response as authoritative for the current label only — do NOT merge into a cached full store, just swap. Initial mount must use GET, not POST. **Provider caveat**: only Google honors `label`; the Microsoft adapter always reads the inbox folder regardless of the label param (`providers/adapters.ts:362-368`). Surface this in the Sidebar's nav by disabling non-inbox folders for Microsoft accounts, or have the workstream-A author choose a UX (toast saying "Only Gmail supports folder switching" is acceptable).
     - `DELETE /api/inbox/cache` → `SanitizedInboxStore`
     - `GET /api/inbox/subscriptions` → `ProviderSubscription[]`
     - `POST /api/inbox/subscriptions` `{ provider, email }` → `ProviderSubscription[]` (full list, not a single record — see `app/api/inbox/subscriptions/route.ts:44-45`. LiveSyncPanel "Enable" button — verify body shape in the route before wiring)
     - `POST /api/threads/[id]/summary` → `ThreadSummaryResult`
     - `POST /api/threads/[id]/draft` `{ tone, askClarifyingQuestion }` → `DraftReplyResult`
     - `POST /api/threads/[id]/draft/revise` `{ draft: DraftReply, instruction: string }` → `DraftReplyResult` *(field is `draft`, not `currentDraft` — see `lib/schemas.ts:24`)*
     - `POST /api/threads/[id]/modify` `{ action: 'archive' | 'trash' | 'mark-unread' | 'mark-read' }` → `{ ok: true }` *(does NOT return the updated thread; caller must `runSync()` to refresh)*
     - `POST /api/reminders` `{ threadId, dueAt, reason }` → `Reminder[]`
     - `PATCH /api/reminders/[id]` `{ completed: boolean }` → `SanitizedInboxStore` *(returns full sanitized store, not `Reminder[]` — see `app/api/reminders/[id]/route.ts:46`. Mockup's `ReminderThreadPanel` toggle needs this; caller should replace its store with the response)*
     - `DELETE /api/reminders/[id]` → `SanitizedInboxStore` *(not `Reminder[]` — caller updates whole store)*
     - `POST /api/search` `{ query }` → `SearchResult[]`
     - `POST /api/send` `{ threadId?, to, cc?, bcc?, subject, body }` → `{ ok: true }` *(backend accepts `bcc`; ComposeDialog emits it)*
   - **Verify each route's request/response shape before writing the adapter** by opening the corresponding `route.ts` and checking the zod schema or handler. The shapes above were verified once at plan time, but treat the route file as authoritative.

### Phase 0 acceptance
- `npm run typecheck` passes with the new files in place (old components untouched, still compile).
- `npm run dev` still serves the current UI without regressions (Phase 0 only adds files, doesn't replace any).
- Files produced: `components/ui/icons.tsx`, `components/ui/ClearCacheAction.tsx`, `lib/ui/hooks.ts`, `lib/ui/util.ts`, `lib/ui/api.ts`, `lib/types-ui.ts`, edits to `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`.

---

## Phase 1 — Parallel workstreams

Each workstream below is self-contained. The "Exclusive write set" lists every file a workstream may create or modify; do not write outside that set.

### Workstream A — Inbox screen

**Owner**: 1 agent, large workstream. Estimated ~2 sessions.

**Read** (inputs):
- `Email Copilot/src/InboxView.jsx`
- `Email Copilot/src/Sidebar.jsx`
- `Email Copilot/src/EmailList.jsx`
- `Email Copilot/src/EmailDetail.jsx`
- `Email Copilot/src/EmailMessage.jsx`
- `Email Copilot/src/AiThreadPanel.jsx`
- `Email Copilot/src/ReminderThreadPanel.jsx`
- `Email Copilot/src/ReplyComposer.jsx`
- `Email Copilot/src/ComposeDialog.jsx`
- `Email Copilot/src/AppToast.jsx`
- `Email Copilot/src/LiveSyncPanel.jsx`
- `Email Copilot/src/ClearCacheAction.jsx`
- `Email Copilot/src/InboxSearchResults.jsx`
- Phase 0 outputs: `components/ui/icons.tsx`, `lib/ui/{hooks,util,api}.ts`, `lib/types-ui.ts`

**Exclusive write set**:
- `app/inbox/page.tsx` — render `<InboxView />` (server component fetches initial `InboxStore`, passes to client `InboxView`)
- `app/inbox/layout.tsx` — keep, drop the `inbox.css` import
- DELETE `app/inbox/inbox.css`
- `components/inbox/InboxView.tsx` — top-level state owner (port of mockup `InboxView.jsx`)
- `components/inbox/Sidebar.tsx`
- `components/inbox/ThreadListPanel.tsx` (port of `EmailList.jsx`)
- `components/inbox/EmailDetailPanel.tsx` (port of `EmailDetail.jsx`)
- `components/inbox/EmailMessage.tsx`
- `components/inbox/AiThreadPanel.tsx` (NEW)
- `components/inbox/ReminderThreadPanel.tsx` (NEW)
- `components/inbox/ReplyComposer.tsx`
- `components/inbox/ComposeDialog.tsx` (NEW)
- `components/inbox/AppToast.tsx` (NEW)
- `components/inbox/LiveSyncPanel.tsx` (NEW)
- `components/inbox/InboxSearchResults.tsx` (NEW)
- DELETE `components/inbox/CopilotSummary.tsx` (absorbed into `AiThreadPanel`)

**Note**: `ClearCacheAction` is **NOT** in Workstream A — it lives in `components/ui/ClearCacheAction.tsx` as a Phase 0 output so Workstream C can import it without a compile-time dependency on A. A imports from the same Phase 0 path.
- DELETE legacy `components/{dashboard,draft-panel,hero-section,reminder-panels,sidebar-panels,thread-detail,thread-list}.tsx` (all replaced)

**Backend wiring rules**:
- All state lives in `InboxView` (matches mockup spec §7).
- Replace `MOCK.THREADS / MESSAGES / REMINDERS / SUBSCRIPTIONS` with the `InboxStore` from server-side fetch on initial render, then `lib/ui/api.ts` for mutations.
- Replace mock `await sleep(700)` calls with real `await api.sync(...)`, `api.modifyThread(...)`, etc.
- `onSignOut` → next-auth `signOut({ redirect: false })`.
- `session` shape: get from `useSession()`; map to mockup's `{ user: { email, name, initial } }` via `toUiSession()`.
- Search debounce: keep the 280-300ms local debounce, but call `api.search(query)` instead of filtering locally.
- The `LiveSyncPanel` "Simulate event" button: keep it for dev, but `onSimulateEvent` should call `api.sync(...)`, not `MOCK.NOW` magic.
- Optimistic update pattern from `InboxView.jsx` `onModify`: keep, just swap the rollback path (`setThreads(snapshot)`) onto the real API failure case.

**Stubs / placeholders** (for cross-workstream links):
- Sidebar's `onOpenPreferences` button → `router.push('/preferences')` (Next.js link). Workstream C owns that route.
- `SignInGate` is not rendered from here; next-auth handles unauth redirect via middleware.

**Acceptance**:
- `/inbox` renders the new design pixel-close to the mockup.
- All keyboard shortcuts work (`j`, `k`, `r`, `e`, `#`, `c`, `/`, `Escape`).
- Sync, summarize, draft, revise, modify, reminder-create, search, send all hit real API routes.
- `npm run typecheck` clean.
- `npm run test:unit` and `npm run test:api` pass.

---

### Workstream B — Sign-in gate

**Owner**: 1 agent, small workstream. Estimated ~0.3 session.

**Read**:
- `Email Copilot/src/SignInGate.jsx` (40 LOC)
- `Email Copilot/src/App.jsx` (to see how it's gated)
- Phase 0 outputs

**Exclusive write set**:
- `app/(auth)/signin/page.tsx` (NEW) — public route, renders `<SignInGate />`
- `components/auth/SignInGate.tsx` (NEW) — visual port
- `lib/auth.ts` — only the `pages: { signIn: '/signin' }` line in the next-auth config (single-line edit)
- `middleware.ts` — extend the matcher to also protect `/inbox` and `/preferences` so unauthed visits redirect to `/signin`. Current matcher only covers `/api/*` (see `middleware.ts:24,37`), which is why this MUST be in B's write set, not A's. Alternative: skip middleware change and render `<SignInGate />` from a client wrapper in `app/layout.tsx` — but that's outside B's exclusive set and would conflict with Phase 0.

**Backend wiring rules**:
- Replace `onSignIn={() => setSession(MOCK.SESSION)}` with `signIn('google')` from `next-auth/react`.
- Keep the layout identical: dark Slate, the brand chip, single CTA button.

**Acceptance**:
- Visiting `/inbox` or `/preferences` while unauthed redirects to `/signin` with the new design (requires the `middleware.ts` matcher update).
- "Sign in with Google" triggers next-auth's Google OAuth flow.
- `npm run typecheck` clean.

---

### Workstream C — Preferences page

**Owner**: 1 agent, isolated workstream. Estimated ~1.5 sessions (66KB mockup).

**Read**:
- `Email Copilot/src/PreferencesPage.jsx` (1380 LOC)
- Phase 0 outputs

**Exclusive write set**:
- `app/preferences/page.tsx` (NEW) — `'use client'`, renders `<PreferencesPage />`, ESC handler that `router.push('/inbox')`
- `components/preferences/PreferencesPage.tsx` (NEW) — top-level
- `components/preferences/sections/*.tsx` (NEW) — split the 1380 LOC into ~6-8 section components (General, Account, AI, Notifications, Reminders, Privacy, etc. — match the mockup's tabs)

**Backend wiring rules**:
- Most preference fields in the mockup have no backend equivalent yet — **keep them as local state for this port; do not invent new API routes or DB columns**.
- The two fields that DO have backend equivalents:
  - Connected accounts → `GET /api/inbox/subscriptions`
  - "Clear local cache" → import `components/ui/ClearCacheAction.tsx` (Phase 0 output; same component Workstream A uses). No compile-time dependency on A.
- Sign-out button → `signOut({ callbackUrl: '/signin' })`.
- Add a `TODO(prefs-backend)` comment at the top of `PreferencesPage.tsx` listing which fields need backend follow-up.

**Acceptance**:
- `/preferences` route renders the full mockup.
- ESC and the back button return to `/inbox`.
- Account section shows real session email + connected providers.
- `npm run typecheck` clean.

---

## Phase 2 — Integration & verification (sequential, ~0.5 session)

1. **Smoke check the routes**
   - `npm run dev`, manually click through `/signin → /inbox → /preferences → /inbox`.
   - Verify the Sidebar's preferences button navigates correctly.
   - Verify clear-cache from Sidebar (Workstream A) and from Preferences (Workstream C) both work.

2. **Typecheck & tests**
   - `npm run typecheck` — must be clean.
   - `npm test` — `lib` + `tests/api` must pass. Fix any test that asserted on old component shapes by updating the assertion (do not change component behavior to satisfy a stale test).
   - `npm run test:contrast` — if it was passing before, must still pass.

3. **Cleanup**
   - Delete `Email Copilot/` and `Email Copilot.zip` from the repo (move outside the working tree, not `rm -rf`, and confirm with user first).
   - Update README.md screenshots if the user wants them refreshed (ask, don't assume).

4. **Codex verification**
   - User triggers Codex CLI (or asks Claude to invoke it) for a second-opinion review of the port.
   - Suggested codex prompt: *"Review the diff against `main` (or the last commit before the port). Focus on: (a) any backend API call that was wired wrong, (b) any mockup behavior that was silently dropped, (c) any new accessibility regression vs the previous UI, (d) any places where mock data leaked into the real component."*

---

## Parallelization checklist

Before kicking off Phase 1, confirm:

- [ ] Phase 0 PR is merged (or at least committed) so workstream branches start from the same foundation.
- [ ] Each workstream gets its own git branch: `port/inbox`, `port/signin`, `port/preferences`.
- [ ] The list of Phase 0 outputs is locked — no workstream may edit `lib/ui/*`, `components/ui/icons.tsx`, `lib/types-ui.ts`, `app/globals.css`, `tailwind.config.js`. If a workstream finds it needs a new helper, it must (a) make the helper local to the screen, or (b) flag it as a Phase 0 follow-up and the lead merges it before resuming.
- [ ] Cross-workstream links use Next.js routing (`<Link>` / `router.push`), never direct component imports across screens.
- [ ] Each workstream runs `npm run typecheck` on its own branch before opening a PR.
- [ ] PR merge order: A → B → C (largest first to surface most surface-area conflicts early), or whichever finishes first if A blocks on something.

---

## Risk register

| Risk | Mitigation |
|---|---|
| Workstream A introduces a Phase 0 helper others need | Lead reviews; promote to Phase 0 with a quick follow-up commit shared to all branches. |
| Mockup behavior doesn't have a backend route (e.g. "Snooze" toolbar button) | Wire the button to a `TODO(no-backend)` toast; do not invent a route. Track in a follow-up issue. |
| Preferences page leaks mock data into prod build | Acceptance check: grep the diff for `MOCK.` after Workstream C is done — must be zero hits outside test files. |
| Contrast tests fail on dark theme | The mockup is already dark Slate with sky accent; if contrast tests assumed the old palette, update the baseline rather than change the design. |
| Tailwind purge drops mockup classes used only in `srcDoc` strings | Add `safelist` entries in `tailwind.config.js` for any classes built via string concat. |
| ~~Google OAuth scope: `gmail.modify` insufficient for send~~ | **NOT a risk** — Google's `gmail.modify` is a superset that grants `messages.send`. Both codex reviewers initially flagged this; both conceded after checking Google's scope docs. The mockup's "Reconnect to enable send" banner (`EmailDetail.jsx:60-65`) is still useful as a fallback for the runtime 403/`insufficient` path in `app/api/send/route.ts:99-103`, but no `lib/auth.ts` change is needed. |

---

## File inventory (for parallel agents)

**Mockup files** (read-only inputs, never edited):
```
Email Copilot/index.html
Email Copilot/src/App.jsx
Email Copilot/src/InboxView.jsx
Email Copilot/src/Sidebar.jsx
Email Copilot/src/EmailList.jsx
Email Copilot/src/EmailDetail.jsx
Email Copilot/src/EmailMessage.jsx
Email Copilot/src/AiThreadPanel.jsx
Email Copilot/src/ReminderThreadPanel.jsx
Email Copilot/src/ReplyComposer.jsx
Email Copilot/src/ComposeDialog.jsx
Email Copilot/src/AppToast.jsx
Email Copilot/src/LiveSyncPanel.jsx
Email Copilot/src/ClearCacheAction.jsx
Email Copilot/src/InboxSearchResults.jsx
Email Copilot/src/SignInGate.jsx
Email Copilot/src/PreferencesPage.jsx
Email Copilot/src/icons.jsx
Email Copilot/src/hooks.jsx
Email Copilot/src/mockData.jsx
```

**Phase 0 outputs** (shared, frozen after Phase 0):
```
components/ui/icons.tsx
components/ui/ClearCacheAction.tsx
lib/ui/hooks.ts
lib/ui/util.ts
lib/ui/api.ts
lib/types-ui.ts
app/globals.css      (edited)
tailwind.config.js   (edited)
app/layout.tsx       (edited: font preconnect)
```

**Workstream A outputs** (inbox):
```
app/inbox/page.tsx
app/inbox/layout.tsx
components/inbox/InboxView.tsx
components/inbox/Sidebar.tsx
components/inbox/ThreadListPanel.tsx
components/inbox/EmailDetailPanel.tsx
components/inbox/EmailMessage.tsx
components/inbox/AiThreadPanel.tsx
components/inbox/ReminderThreadPanel.tsx
components/inbox/ReplyComposer.tsx
components/inbox/ComposeDialog.tsx
components/inbox/AppToast.tsx
components/inbox/LiveSyncPanel.tsx
components/inbox/InboxSearchResults.tsx
```

**Workstream B outputs** (sign-in):
```
app/(auth)/signin/page.tsx
components/auth/SignInGate.tsx
lib/auth.ts          (edited: pages.signIn)
middleware.ts        (edited: matcher to include /inbox + /preferences)
```

**Workstream C outputs** (preferences):
```
app/preferences/page.tsx
components/preferences/PreferencesPage.tsx
components/preferences/sections/*.tsx
```

**Files to delete after the port**:
```
app/inbox/inbox.css
components/inbox/CopilotSummary.tsx
components/dashboard.tsx
components/draft-panel.tsx
components/hero-section.tsx
components/reminder-panels.tsx
components/sidebar-panels.tsx
components/thread-detail.tsx
components/thread-list.tsx
```

---

## Estimated effort

| Phase / workstream | Sessions | Notes |
|---|---|---|
| Phase 0 | 1 | Foundation must be solid; rushing here breaks parallel work. |
| Workstream A | 2 | Largest; could split into A1 (Sidebar + List) and A2 (Detail + panels + overlays) if needed. |
| Workstream B | 0.3 | Trivial; can be folded into Phase 0 if convenient. |
| Workstream C | 1.5 | The 1380-LOC PreferencesPage is mostly visual; split into section components to keep each file under 300 LOC. |
| Phase 2 | 0.5 | Smoke + typecheck + tests + codex. |
| **Total** | **~5 sessions** | Parallel run can compress wall-clock to ~3 sessions if A/B/C overlap. |

---

# Appendix A — Interface contracts

This appendix locks down the TypeScript shapes that parallel agents need to agree on. Every prop interface here is derived from the mockup's actual usage in `Email Copilot/src/*.jsx`. Agents must implement **exactly these props** — adding fields is fine, renaming or dropping them is not.

## A.1 Shared data types (`lib/types-ui.ts`)

```ts
import type { Reminder, ProviderSubscription, ThreadSummary, DraftReply, CopilotMeta, Thread, Message, SanitizedInboxStore } from "@/lib/types";

// ─── Toast ────────────────────────────────────────────────────────────
export type ToastVariant = "info" | "error";

export interface Toast {
  id: string;                 // auto-generated if omitted at push site
  message: string;
  variant: ToastVariant;
  durationMs: number;         // 0 = persistent
  retry?: () => void;         // shown as "Undo" button
}

export interface ToastPushOptions {
  id?: string;
  message: string;
  variant?: ToastVariant;     // default "info"
  durationMs?: number;        // default from useToastQueue config
  retry?: () => void;
}

// ─── UI Session (next-auth → mockup shape adapter) ────────────────────
export interface UiSessionUser {
  email: string;
  name: string;               // falls back to email local-part
  initial: string;            // single uppercase char from name
}
export interface UiSession {
  status: "authenticated";
  user: UiSessionUser;
  authError?: string;         // from next-auth session.authError
}

// ─── Thread card (UI projection) ──────────────────────────────────────
export interface ThreadCard {
  id: string;
  subject: string;
  preview: string;            // from latest message snippet/bodyPreview
  participants: string[];
  lastMessageAt: string;
  unreadCount: number;
  labels: string[];           // includes "INBOX", "IMPORTANT", etc.
  hasAttachment: boolean;
}

// ─── Search ───────────────────────────────────────────────────────────
// API returns raw Thread (not ThreadCard) and a term-count score (not 0..1).
// The UI must lift Thread → ThreadCard via the local cards list, or via toThreadCard()
// against the store's messages. See `app/api/search/route.ts:13` and `lib/db.ts:413`.
export interface SearchResultApi {
  thread: Thread;             // raw, no preview / labels / hasAttachment
  score: number;              // integer; term occurrence count
  unreadCount: number;
}

// UI-side projection — built client-side after fetching SearchResultApi[].
// InboxSearchResults consumes this shape; `thread.preview` is derived from
// the local card lookup, `score` is rendered as `Math.round(score * 100)` only if
// the workstream chooses to normalize. Recommended: render the raw integer with a
// "matches: N" affordance instead of fake-percentage display.
export interface SearchResult {
  thread: ThreadCard;
  score: number;              // forwarded from API (term count)
  unreadCount: number;
}

// ─── Live sync ────────────────────────────────────────────────────────
export type SyncStatus = "connected" | "refreshed" | "disconnected" | "off";

// ─── Navigation ───────────────────────────────────────────────────────
export type NavId = "inbox" | "sent" | "drafts" | "archive" | "trash";
export type ModifyAction = "archive" | "trash" | "mark-unread" | "mark-read";
export type Tone = "concise" | "friendly" | "formal";
export type ComposeMode = "new" | "forward" | "reply";

// ─── Adapters (helpers, also live in lib/types-ui.ts) ─────────────────
export function toUiSession(s: import("next-auth").Session | null): UiSession | null;
export function toThreadCard(thread: Thread, allMessages: Message[]): ThreadCard;
export function buildThreadCards(threads: Thread[], messages: Message[]): ThreadCard[];
```

## A.2 Hooks (`lib/ui/hooks.ts`)

```ts
import type { Toast, ToastPushOptions } from "@/lib/types-ui";

export function useFeatureSeqRef(): {
  next: () => number;
  current: () => number;
  matches: (n: number) => boolean;
};

export interface UseToastQueueOptions { defaultDurationMs?: number }
export function useToastQueue(opts?: UseToastQueueOptions): {
  toasts: Toast[];
  push: (opts: ToastPushOptions) => string;   // returns the toast id
  dismiss: (id: string) => void;
};

export type KeymapHandler = (e: KeyboardEvent) => void;
export function useGlobalKeymap(map: Record<string, KeymapHandler>): void;
```

`lib/ui/util.ts`: `export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));`

## A.3 API adapter (`lib/ui/api.ts`)

Every function throws on non-2xx with `Error(message)` populated from the route's `{ error }` field. Caller wraps in try/catch and surfaces via toast.

```ts
import type { SanitizedInboxStore, ThreadSummaryResult, DraftReplyResult, DraftReply, Reminder, ProviderSubscription, ProviderType } from "@/lib/types";
import type { ModifyAction, NavId, SearchResult, Tone } from "@/lib/types-ui";

export interface Api {
  // Inbox
  getInbox(): Promise<SanitizedInboxStore>;                                            // GET /api/inbox/sync
  syncInbox(body: { provider: ProviderType; email?: string; label?: NavId }): Promise<SanitizedInboxStore>;
  clearCache(): Promise<SanitizedInboxStore>;                                          // DELETE /api/inbox/cache

  // Subscriptions
  listSubscriptions(): Promise<ProviderSubscription[]>;                                 // GET /api/inbox/subscriptions
  renewSubscription(body: { provider: ProviderType; email: string }): Promise<ProviderSubscription[]>; // POST

  // Threads
  summarizeThread(threadId: string): Promise<ThreadSummaryResult>;
  draftReply(threadId: string, body: { tone: Tone; askClarifyingQuestion: boolean }): Promise<DraftReplyResult>;
  reviseDraft(threadId: string, body: { draft: DraftReply; instruction: string }): Promise<DraftReplyResult>;
  modifyThread(threadId: string, body: { action: ModifyAction }): Promise<{ ok: true }>;

  // Reminders
  createReminder(body: { threadId: string; dueAt: string; reason: string }): Promise<Reminder[]>;
  completeReminder(id: string, body: { completed: boolean }): Promise<SanitizedInboxStore>;
  deleteReminder(id: string): Promise<SanitizedInboxStore>;

  // Search / send
  search(query: string): Promise<SearchResultApi[]>;       // returns the API shape; UI lifts to SearchResult[] via the local cards list
  send(body: { to: string; cc?: string; bcc?: string; subject: string; body: string; threadId?: string }): Promise<{ ok: true }>;
}

export const api: Api;
```

## A.4 Inbox component prop interfaces

```ts
// components/inbox/InboxView.tsx
// **Intentional deviation from mockup**: the mockup's InboxView takes
// { session, onSignOut, onOpenPreferences } (see `Email Copilot/src/InboxView.jsx:4`)
// because App.jsx owns the session + routing. In Next.js the equivalent is:
//   - session: read via `useSession()` from next-auth/react
//   - onSignOut: implementation calls `signOut({ callbackUrl: '/signin' })`
//   - onOpenPreferences: implementation calls `router.push('/preferences')`
// So InboxView takes no props; the formerly-injected callbacks are inlined.
export function InboxView(): JSX.Element;

// components/inbox/Sidebar.tsx
export interface SidebarProps {
  activeNav: NavId;
  setActiveNav: (id: NavId) => void;
  session: UiSession;
  folderCounts: Partial<Record<NavId, number>>;
  onCompose: () => void;
  onSignOut: () => void;
  onClearCache: () => void;
  onOpenPreferences: () => void;     // calls router.push("/preferences")
  accountMenuOpen: boolean;
  setAccountMenuOpen: (open: boolean) => void;
}

// components/inbox/ThreadListPanel.tsx (mockup: EmailList)
export interface ThreadListPanelProps {
  cards: ThreadCard[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string) => void;
  activeFilter: "all" | "unread";
  setActiveFilter: (f: "all" | "unread") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  syncing: boolean;
  onRefresh: () => void;
  isSearchMode: boolean;
  hasActiveReminder: (threadId: string) => boolean;
  activeNav: NavId;
  searchInputRef: React.RefObject<HTMLInputElement>;
}

// components/inbox/EmailDetailPanel.tsx (mockup: EmailDetail)
export interface EmailDetailPanelProps {
  card: ThreadCard | null;
  threadMessages: Message[];
  showComposer: boolean;
  setShowComposer: (open: boolean) => void;
  position: number;                  // 1-indexed
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onModify: (action: ModifyAction) => Promise<void> | void;
  onForward: () => void;
  onSendReply: () => Promise<void>;
  onError: (message: string) => void;
  replyText: string;
  setReplyText: (t: string) => void;
  modifying: boolean;
  syncing: boolean;
  aiPanelSlot: React.ReactNode;       // <AiThreadPanel />
  reminderPanelSlot: React.ReactNode; // <ReminderThreadPanel />
  authError?: string;                 // shows "Reconnect" banner
}

// components/inbox/EmailMessage.tsx
export interface EmailMessageProps {
  message: Message;
  expanded: boolean;
  onToggle: () => void;
  isFirst?: boolean;
}

// components/inbox/AiThreadPanel.tsx
export interface AiThreadPanelProps {
  selectedThreadId: string | null;
  threadMessages: Message[];
  replyHasUserContent: boolean;       // gates "replace your reply?" confirm
  onUseDraft: (draft: DraftReply) => void;
  onError: (message: string) => void;
}

// components/inbox/ReminderThreadPanel.tsx
export interface ReminderThreadPanelProps {
  selectedThreadId: string | null;
  reminders: Reminder[];
  onRemindersChange: (next: Reminder[]) => void; // implementation calls api.completeReminder/deleteReminder/createReminder and replaces with result
  onError: (message: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

// components/inbox/ReplyComposer.tsx
export interface ReplyComposerProps {
  recipientLabel: string;
  body: string;
  setBody: (b: string) => void;
  onDiscard: () => void;
  onSend: () => Promise<void> | void;
  onError: (message: string) => void;
  sending: boolean;
}

// components/inbox/ComposeDialog.tsx
export interface ComposeDialogInitial {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
}
export interface ComposePayload {
  to: string[];      // comma-split client-side
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
}
export interface ComposeDialogProps {
  mode: ComposeMode;
  initial?: ComposeDialogInitial;
  onClose: () => void;
  onSend: (payload: ComposePayload) => void | Promise<void>;
  onError: (message: string) => void;
}

// components/inbox/AppToast.tsx
export interface AppToastProps {
  toasts: Toast[];
  dismiss: (id: string) => void;
}

// components/inbox/LiveSyncPanel.tsx
export interface LiveSyncPanelProps {
  status: SyncStatus;
  lastSyncedAt: string | null;
  subscriptions: ProviderSubscription[];
  onEnable: () => Promise<void> | void;   // calls api.renewSubscription
  onSimulateEvent: () => Promise<void> | void; // dev affordance; calls api.syncInbox
}

// components/inbox/InboxSearchResults.tsx
export interface InboxSearchResultsProps {
  query: string;
  results: SearchResult[];
  pending: boolean;
  selectedThreadId: string | null;
  onSelectThread: (thread: ThreadCard) => void;
  hasActiveReminder: (threadId: string) => boolean;
}

// components/ui/ClearCacheAction.tsx (Phase 0 — shared by inbox + preferences)
export interface ClearCacheActionProps {
  onClose: () => void;          // close the dialog
  onConfirmed?: () => void;     // optional post-success hook (e.g. clear local state)
}
```

## A.5 Sign-in component prop interface

```ts
// components/auth/SignInGate.tsx
export interface SignInGateProps {
  onSignIn: () => void;   // implementation calls signIn("google")
  buildLabel?: string;    // optional "v0.4.2 · build aa12f8e" footer
}
```

## A.6 Preferences sections

The mockup's nav (lines 5-11) gives the seven top-level sections in this order:

| ID | Display label | Component (in `components/preferences/sections/`) | Backend? |
|---|---|---|---|
| `account` | Account | `AccountSection.tsx` | Yes — `useSession()`, `signOut()` |
| `ai` | Copilot AI | `AiSection.tsx` | **No** — local state only (model picker, API keys are stub-only; tone preview is mockup-only) |
| `notifications` | Notifications | `NotificationsSection.tsx` | No — local state |
| `appearance` | Appearance | `AppearanceSection.tsx` | No — local state (density, time format, theme swatches) |
| `keyboard` | Keyboard | `KeyboardSection.tsx` | No — static cheatsheet |
| `connected` | Connected apps | `ConnectedSection.tsx` | Yes — `api.listSubscriptions()` for the providers list |
| `privacy` | Privacy & data | `PrivacySection.tsx` | Yes — uses `<ClearCacheAction />` from `components/ui/` |

```ts
// components/preferences/PreferencesPage.tsx — derived from mockup line 48
export interface PreferencesPageProps {
  session: UiSession;
  onBack: () => void;       // implementation: router.push('/inbox')
  onSignOut: () => void;    // implementation: signOut({ callbackUrl: '/signin' })
}

// Each section's contract — derived from mockup lines 153-159
export interface SectionProps {
  prefs: PreferencesState;
  update: (patch: Partial<PreferencesState>) => void;        // mockup line 54: object-merge style
  updateNotify?: (key: keyof PreferencesState["notifyOn"], value: boolean) => void; // only NotificationsSection needs this; mockup line 59
}

// AccountSection deviates — it takes session + onSignOut, not prefs:
export interface AccountSectionProps {
  session: UiSession;
  onSignOut: () => void;
}

// API key per-provider record — mockup line 20-27 (do NOT collapse the fields; KeyBadge & verify flow read all of them)
export interface PrefApiKey {
  value: string;
  verified: boolean;
  locked: boolean;
  enabled: boolean;
  verifiedAt: string | null;
}

// PreferencesState — **flat** shape, matching mockup DEFAULT_PREFS at line 14-46.
// Do NOT nest into ai/notifications/appearance/privacy groups; the mockup's section
// components reach into prefs directly with flat keys.
export interface PreferencesState {
  // AI
  defaultTone: Tone;
  askClarifyingByDefault: boolean;
  selectedModel: string;                                     // e.g. 'anthropic/claude-haiku-4-5'
  apiKeys: Record<"anthropic" | "openai" | "google" | "xai" | "mistral" | "deepseek" | "cohere" | "meta", PrefApiKey>;
  letCopilotReadAllThreads: boolean;
  autoSummarizeOnOpen: boolean;
  // Notifications
  reminderLeadTime: number;                                  // minutes before due
  toastDuration: number;                                     // seconds
  desktopNotifications: boolean;
  notifyOn: { mentions: boolean; reminders: boolean; sends: boolean; sync: boolean };
  // Appearance
  density: "compact" | "comfortable" | "spacious";
  timeFormat: "12h" | "24h";
  showAvatars: boolean;
  showSnippets: boolean;
  monoStack: string;                                         // e.g. 'Geist Mono'
  // Privacy
  storeDrafts: boolean;
  retentionDays: number;
  shareAnonymizedUsage: boolean;
}

export const DEFAULT_PREFS: PreferencesState; // matches mockup line 14-46 verbatim
```

**TODO(prefs-backend)**: persist `PreferencesState` to a new `user_preferences` table once the product decides which fields graduate beyond cosmetic. Not in scope for this port — for the port, `prefs` lives in `useState(DEFAULT_PREFS)` inside `PreferencesPage`.

## A.7 Manual smoke-test checklist (Phase 2)

Run `npm run dev`, then click through. Each line is a single user-visible expectation:

**Auth**
- [ ] Visit `/inbox` while logged out → redirect to `/signin`
- [ ] Click "Continue with Google" → land at Google consent
- [ ] After consent → land at `/inbox` with sidebar showing user email
- [ ] Sidebar account menu → "Sign out" → land back at `/signin`

**Inbox — read**
- [ ] Inbox renders the list of threads from `GET /api/inbox/sync`
- [ ] Click a thread → detail panel renders messages, latest expanded
- [ ] Press `j` / `k` → moves selection within the list
- [ ] Press `/` → focuses search; type → search results render with highlights
- [ ] Press `Escape` while in search → clears search query

**Inbox — write**
- [ ] Press `r` → reply composer opens, autofocused
- [ ] Type then `⌘+Enter` → send fires; toast "Reply sent"; thread refreshes
- [ ] Press `c` → ComposeDialog opens; To/Subject/Body work; `Cc/Bcc` toggle reveals fields
- [ ] Click Forward toolbar → ComposeDialog opens in forward mode with quoted body

**Inbox — AI**
- [ ] Click "Summarize thread" → pending block, then result with bullets + action
- [ ] Click "Draft reply" → pending block, then draft with subject/body + tone selector
- [ ] Type instruction → "Revise" → draft body updates
- [ ] Click "Use draft" with empty reply → draft loaded into reply composer
- [ ] Click "Use draft" with non-empty reply → confirm dialog, then loaded

**Inbox — organize**
- [ ] Press `e` → archive toast; thread removed from inbox
- [ ] Press `#` → trash toast; thread removed
- [ ] Click "Mark unread" toolbar button → returns to bold/unread state (no keymap exists for this — toolbar only per `InboxView.jsx:227`)
- [ ] Click "Follow-up" → reminder panel opens; create reminder; toggle complete; delete

**EmailMessage rendering** (per `EmailMessage.jsx:91` and below)
- [ ] HTML email opens in sandboxed iframe envelope with light email canvas
- [ ] Remote images blocked by default for unknown senders; "Images blocked" pill renders
- [ ] Click pill → "Load this time", "Always from sender", "Always from @domain" menu
- [ ] "Plain text" view-mode renders bodyText; "Reader" view-mode collapses HTML to text
- [ ] Trusted-domain sender (e.g. an internal address) loads images automatically

**LiveSync**
- [ ] Status pill shows "Live" when subscriptions exist, "Sync off" when empty
- [ ] Click "Renew subscription" → toast, list updates from API
- [ ] Click "Simulate inbound mail" → re-sync fires; "Refreshed" pill briefly

**Preferences**
- [ ] Sidebar gear → `/preferences` renders with seven left-nav sections
- [ ] Each section paints without console errors
- [ ] "Connected apps" lists real subscriptions from API
- [ ] "Privacy & data" → "Clear local cache" → confirm dialog → wipes + signs out
- [ ] Press `Escape` → back to `/inbox`

**Regression**
- [ ] `npm run typecheck` — clean
- [ ] `npm run test:unit` — green
- [ ] `npm run test:api` — green
- [ ] `npm run test:contrast` — green (or update baseline once with rationale)

## A.8 Rollback plan

Phase 0 modifies `app/globals.css`, `tailwind.config.js`, `app/layout.tsx`. Phase 1 deletes 9 legacy components. Reverting is two-pronged depending on which phase is suspect:

1. **Phase 1 broke prod, Phase 0 is fine** — `git revert` the inbox/signin/preferences PRs in reverse merge order. The legacy components were deleted in Phase 1, so the revert restores them. Phase 0 additions are non-breaking on their own (just unused files + benign Tailwind additions); they can stay.

2. **Phase 0 broke prod (e.g. Tailwind purge ate a class, font load failed)** — `git revert` the Phase 0 PR. Existing UI uses `inbox.css`, not the new globals, so it's resilient to losing the new tokens. Note: if Phase 1 PRs landed on top, revert those first.

3. **Permanent escape hatch** — keep a tagged commit `port-base-snapshot` at the pre-port state. To restore the UI surface only **without overwriting backend**, narrow the paths:

   ```sh
   git checkout port-base-snapshot -- \
     components/ \
     app/inbox/ app/page.tsx app/layout.tsx app/globals.css \
     tailwind.config.js
   ```

   Do **NOT** include `lib/`, `app/api/`, `middleware.ts`, `auth.ts`, or `providers/` in this checkout — they contain backend logic that may have evolved after the port landed. Restoring them wholesale will silently revert unrelated backend work.

Do **not** force-push or delete branches during rollback. The legacy components contain non-trivial logic (`dashboard.tsx` is 14KB); recovering them via git history is the only realistic restore path.

## A.9 Per-workstream context budget (rough)

| Workstream | Mockup LOC to read | Components to write | Target session budget |
|---|---|---|---|
| Phase 0 | ~500 (icons + hooks + index.html + mockData type shapes) | 6 files | 1 session, ~150k tokens |
| A | ~2100 (InboxView, Sidebar, EmailList, EmailDetail, EmailMessage, AiThreadPanel, ReminderThreadPanel, ReplyComposer, ComposeDialog, AppToast, LiveSyncPanel, InboxSearchResults) | 13 files | 2 sessions, ~180k tokens each. Split at the AiThreadPanel boundary if needed (A1 = layout+list+detail, A2 = AI/reminder/compose/toast/sync/search) |
| B | ~70 (SignInGate + small App.jsx context) | 2 files + 2 edits | 0.3 session, ~50k tokens |
| C | ~1380 (PreferencesPage) | 1 page + 1 wrapper + 7 sections | 1.5 sessions. The first session reads + writes Account/AI/Notifications; the second writes Appearance/Keyboard/Connected/Privacy. |
| Phase 2 | n/a | smoke + tests + codex | 0.5 session, ~80k tokens |

---

# Appendix B — Execution playbook

Appendix A pins **what** to build (interfaces). Appendix B pins **how** to verify it, the per-workstream specifics that would otherwise force a workstream agent to interrupt the lead, and the cross-cutting process so parallel branches don't collide.

## B.1 Local verification contract

This is the single hardest gap to close async: agents need to know what state they can actually reach without OAuth, real data, or coordination with the lead.

### Required env vars (minimum to run `npm run dev`)
- `AUTH_SECRET` — any 32+ char string; `openssl rand -base64 32`
- `AUTH_URL=http://localhost:3000`

That's it. Without `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, the Google provider is *not registered* in `lib/auth.ts:11-25` and sign-in flow is unreachable — but the UI still renders the sign-in gate and routes work.

### Data persistence
- `lib/db.ts` **always** uses the JSON-file driver at `.data/inbox.json` for runtime page-route reads — irrespective of `DATABASE_URL`. Postgres is only initialized in `db/client.ts:6` when explicitly used (drizzle-kit migrations, certain server actions). **No Postgres needed for the port.**
- First read auto-seeds `.data/inbox.json` with the fixture defined in `lib/db.ts:41` and applied via `ensureStore()` at `lib/db.ts:161`: **2 threads, 3 messages, 1 reminder**. The UI must render correctly against this seed; "empty inbox" assertions in tests should delete or wipe the file first.

### How routes get verified async (three tiers)

**Tier 1 — vitest only (no HTTP, no auth, mandatory for every PR)**
- `npm run test:unit` covers `lib/*` purely in-process.
- `npm run test:api` covers route handlers; existing tests mock auth via NextAuth helpers (see `tests/api/`). Workstreams add tests here for any new logic they introduce, but **do not** rewire auth.
- This is the mandatory floor: every workstream PR must keep both test suites green.

**Tier 2 — UI render with seeded JSON store (no OAuth required)**
- See "Data persistence" above: the JSON driver always runs at `.data/inbox.json` regardless of `DATABASE_URL`, and first read auto-seeds 2 threads / 3 messages / 1 reminder via `lib/db.ts:41` + `:161`.
- This is NOT an empty store. Agents should be aware of the seed when asserting "empty" UI; delete `.data/inbox.json` before the read if a clean slate is required.
- Agents can hand-edit `.data/inbox.json` to inject synthetic fixtures. Use `Email Copilot/src/mockData.jsx` (MOCK.THREADS / MOCK.MESSAGES) as a template — its data structures map cleanly to the backend `Thread` and `Message` types in `lib/types.ts`.
- **Important**: once Workstream B's middleware lands (B.4), `/api/inbox/*` requires a valid NextAuth session for the page-route fetches to succeed. To verify the UI hits the routes via HTTP, an agent must be signed in. Three ways to get a session without Google OAuth:
  1. Use the existing test session mocking pattern from `tests/api/` (lift it into a dev-only helper page if needed; do NOT add a new auth provider to prod).
  2. Sign in with Microsoft if `MICROSOFT_CLIENT_ID/SECRET` are configured (the codepath is the same; `gmail.modify`-specific routes will 401 but everything else works).
  3. Phase 2 lead provides a shared Google test account.
- For workstreams that just need the **UI to render** without hitting the HTTP layer (most of A, all of C's static sections), feed the components synthetic props in a Vitest-rendered story or local route. Acceptable substitute for HTTP verification at workstream-PR time.

**Tier 3 — real OAuth end-to-end (Phase 2 only)**
- Phase 2 lead configures `GOOGLE_CLIENT_ID/SECRET` + a Gmail consented account.
- All routes that hit Gmail (`POST /api/inbox/sync` with google, `POST /api/threads/[id]/modify`, `POST /api/inbox/subscriptions`, `POST /api/send`) verified by hand against a real account.
- AI routes (`summary`, `draft`, `draft/revise`) do NOT need OAuth — they use AI-provider keys (`ANTHROPIC_API_KEY` / `GEMINI_API_KEY`) and fall back to heuristics if both are absent. These can be verified at Tier 1 or 2.

### Route → tier mapping (corrected)

| Route | Auth needed | Verifiable at |
|---|---|---|
| `GET /api/inbox/sync` | NextAuth session (any) | Tier 1 + 2 |
| `POST /api/inbox/sync` (google) | Gmail accessToken | Tier 3 |
| `POST /api/inbox/sync` (microsoft) | Microsoft accessToken | Tier 3 (or Tier 2 with MS creds) |
| `DELETE /api/inbox/cache` | NextAuth session | Tier 1 + 2 |
| `GET /api/inbox/subscriptions` | NextAuth session | Tier 1 + 2 |
| `POST /api/inbox/subscriptions` | Stored OAuth access token (`app/api/inbox/subscriptions/route.ts:29`) | Tier 3 |
| `POST /api/threads/[id]/summary` | NextAuth session; no accessToken | Tier 1 + 2 |
| `POST /api/threads/[id]/draft` | NextAuth session; no accessToken | Tier 1 + 2 |
| `POST /api/threads/[id]/draft/revise` | NextAuth session; no accessToken | Tier 1 + 2 |
| `POST /api/threads/[id]/modify` | Gmail accessToken | Tier 3 |
| `POST /api/reminders` / `PATCH` / `DELETE` | NextAuth session | Tier 1 + 2 |
| `POST /api/search` | NextAuth session | Tier 1 + 2 |
| `POST /api/send` | Gmail accessToken | Tier 3 |

### Test command matrix (every workstream PR must pass these)

| Check | Command | Required? |
|---|---|---|
| Type | `npm run typecheck` | **Yes** |
| Unit | `npm run test:unit` | **Yes** |
| API | `npm run test:api` | **Yes** |
| Contrast | `npm run test:contrast` | Yes if Workstream A or C (touches dark theme) |
| Manual smoke (A.7) | by hand | Phase 2 only |
| Real-OAuth E2E | by hand with Gmail | Phase 2 only, lead-driven |

## B.2 Phase 0 specifics

### Icons to port from `Email Copilot/src/icons.jsx`

The mockup uses these 33 icons (verified by `grep -ohE "I\.[A-Z][a-zA-Z]*" "Email Copilot/src/"*.jsx | sort -u`): `Archive`, `Bell`, `Check`, `ChevronDown`, `ChevronLeft`, `ChevronRight`, `ChevronUp`, `Clock`, `Dot`, `Draft`, `Forward`, `Google`, `Inbox`, `Lightning`, `Lock`, `LogOut`, `More`, `Paperclip`, `Pause`, `Play`, `Radio`, `Refresh`, `Reply`, `Search`, `Send`, `Settings`, `Shield`, `Sparkles`, `Star`, `Trash`, `Unlock`, `Wand`, **`X`** (close-button icon used in toast/dialog/reminder/compose). Plus the Preferences-only set used via `PrefIcon`: `user`, `paint`, `keyboard`, `plug` — port these as `User`, `Paint`, `Keyboard`, `Plug` (4 extra). Export each as `({ size = 14, strokeWidth = 1.6, className }: IconProps) => JSX.Element`. Path data: copy SVG paths verbatim from `icons.jsx`.

### `toUiSession()` algorithm (`lib/types-ui.ts`)
```ts
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
```

### `buildThreadCards()` algorithm
```ts
export function buildThreadCards(threads: Thread[], messages: Message[]): ThreadCard[] {
  const byThread = new Map<string, Message[]>();
  for (const m of messages) {
    const list = byThread.get(m.threadId) ?? [];
    list.push(m);
    byThread.set(m.threadId, list);
  }
  return threads.map((t) => {
    // Sort by receivedAt — Message[] order is not guaranteed; current InboxView.tsx:121 also sorts.
    const tm = (byThread.get(t.id) ?? []).slice().sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
    const latest = tm[tm.length - 1];
    const unreadCount = tm.filter((m) => m.isUnread).length;
    // Normalize labels to UPPERCASE. Gmail provider returns lowercase ("inbox", "important")
    // — see `providers/adapters.ts:312` — but the mockup checks uppercase "INBOX" and
    // "IMPORTANT" (e.g. `InboxView.jsx:79`, `EmailDetail.jsx:95`). Normalize once here.
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
```

### Tailwind safelist
Only one class is built via string concat (`bg-${pill.dot}` in `LiveSyncPanel.jsx:21`). Add to `tailwind.config.js`:
```js
safelist: ["bg-emerald-400", "bg-sky-400", "bg-amber-400", "bg-slate-500"]
```

### Geist font in `app/layout.tsx`
```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
<link
  href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

## B.3 Workstream A specifics

### Visual tolerance
"Pixel-close" = side-by-side with the mockup at 1280px viewport (width fixed by `<meta name="viewport" content="width=1280">` in `Email Copilot/index.html:5`). Acceptable deviations:
- Font weight rounding within ±100
- Spacing within ±2px
- Color drift within 5% of original hex

Tooling: `npm run dev` on one window, `open "Email Copilot/index.html"` on another (or use Chrome's side-by-side). No screenshot diff tool required; visual sign-off is part of the PR review by the lead.

### `authError` → banner state
From `lib/auth.ts:84-95` and `lib/auth.ts:125-126`:

| `session.authError` | Banner | Action |
|---|---|---|
| `undefined` | none | normal |
| `"RefreshAccessTokenError"` | "Your Google connection expired. Reconnect to keep syncing." | button → `signIn("google")` |
| `"MissingRefreshToken"` | "Sign in again to enable AI features." | button → `signIn("google")` |
| anything else | "Auth error — sign out and back in." | button → `signOut()` + `signIn("google")` |

### Optimistic update pattern (modify thread)
```ts
async function onModify(action: ModifyAction) {
  if (!selectedCard) return;
  const id = selectedCard.id;
  const snapshot = store;
  setStore((s) => s && { ...s, threads: s.threads.filter((t) => t.id !== id) });
  setModifying(true);
  try {
    await api.modifyThread(id, { action });
    await runSync(activeNav); // POST sync returns label-scoped slice; replaces threads
  } catch (e) {
    setStore(snapshot); // rollback
    showToast({ message: `${action} failed`, variant: "error" });
  } finally {
    setModifying(false);
  }
}
```

### LiveSyncPanel "Simulate inbound mail"
Keep visible. It's useful in dev and harmless in prod (just re-triggers `api.syncInbox`). Hide only if a future security review flags it.

## B.4 Workstream B specifics

### Middleware matcher + body

Use **segment-bounded** exclusions so future routes like `/api/authz` or `/api/healthcheck` don't accidentally bypass auth:

```ts
export const config = {
  matcher: [
    "/api/((?!auth/|webhooks/|health$|health/).*)", // protect API except /api/auth/*, /api/webhooks/*, /api/health
    "/inbox/:path*",
    "/preferences/:path*",
  ],
};
```

The middleware body must also change. Current behavior (`middleware.ts:24`) skips non-API paths entirely and returns 401 JSON for unauth API. Update to:

```ts
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  if (token) return NextResponse.next();

  // Page routes: redirect to /signin
  if (!pathname.startsWith("/api/")) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  // API routes: keep the 401 JSON shape
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Critical**: do NOT include `/api/auth/*` in the matcher — that breaks the OAuth callback. The segment-bounded negative lookahead `(?!auth/|...)` is what enforces this.

### SignInGate visual completeness
All five elements from `SignInGate.jsx` are required, not optional:
1. Background grid (radial + linear gradients)
2. Brand chip (sky→indigo gradient with lightning icon)
3. Headline + paragraph
4. Continue-with-Google CTA
5. Privacy line ("Read & send scopes only…")

The build-version footer is optional; recommend rendering `process.env.NEXT_PUBLIC_BUILD_SHA` if set, omit otherwise.

## B.5 Workstream C specifics

### Shared primitives location
The mockup defines ~10 reusable primitives inline (`Section`, `Card`, `CardHeader`, `Row`, `Toggle`, `Segmented`, `Slider`, `ToneCards`, `ThemeSwatch`, `SecondaryButton`). Put them in `components/preferences/ui/`:
- `Card.tsx`, `Row.tsx`, `Section.tsx` — layout
- `Toggle.tsx`, `Segmented.tsx`, `Slider.tsx`, `ToneCards.tsx`, `ThemeSwatch.tsx` — controls
- `SecondaryButton.tsx` — buttons

These are NOT Phase 0 (no inbox screen uses them); they're Workstream C-internal.

### API-key verify-flow scope
The mockup has a working `Verify` button per provider that flips `verified: true` after a fake delay. **Port behavior**: render the button, but disable it with `title="API key verification ships with the backend (TODO)"`. The form still accepts keys (stored in local state) — only the verify roundtrip is stubbed.

### Sub-section work split (1.5-session budget)
- **Session 1**: Account, Copilot AI (the heavy one — ProviderModelPicker + ApiKeyInput per provider), Notifications.
- **Session 2**: Appearance, Keyboard (static cheatsheet, easy), Connected apps (wire `api.listSubscriptions`), Privacy & data (re-uses `components/ui/ClearCacheAction.tsx`).

If Session 1 overruns on the model picker, defer ProviderModelPicker styling fidelity — function (selecting a model) is required, exact pixel match of the dropdown is not.

## B.6 Phase 2 specifics

### Codex arbitration
Codex will produce a list of findings during Phase 2 review. Triage rules:
- **Correctness bugs** (wrong API shape, broken keymap, console error) → fix before merge.
- **Visual nits** (spacing 1px off) → defer to a follow-up issue tagged `port-polish`.
- **Scope creep** (codex suggests adding a feature the mockup didn't have) → reject; document in the issue.
- **Disputes** → lead is final arbiter; cite the mockup line as ground truth.

### Cleanup confirmation fallback
If the user is unreachable when Phase 2 needs to delete `Email Copilot/` and `Email Copilot.zip`: **don't delete**. Move them to `.archive/` instead and open a follow-up issue. The mockup is the only ground-truth reference; losing it before the port is fully landed is a real risk.

## B.7 Cross-cutting process

### Branch strategy
- `port/phase-0` branches from `main`. Phase 0 lead opens a PR.
- `port/inbox`, `port/signin`, `port/preferences` branch from **`port/phase-0`** (not main). This carries Phase 0's shared files (icons, hooks, types-ui, api) without requiring a merge first.
- When Phase 0 PR merges to main, workstream branches rebase onto main. If Phase 0 hasn't merged when a workstream is ready, the lead rebases the workstream onto the latest `port/phase-0` HEAD.

### Phase 0 promotion path
If a workstream finds a missing Phase 0 helper:
1. Workstream opens a PR against `port/phase-0` with the new helper.
2. Phase 0 lead reviews + merges to `port/phase-0`.
3. All workstream branches rebase to pick it up.

Never duplicate Phase 0 helpers in workstream branches. If urgent, add it locally with `// TODO(promote-to-phase-0)` and open the promotion PR in the same hour.

### PR target rule
- Workstream PRs must **target `port/phase-0`** (not `main`) until the Phase 0 PR merges. Otherwise a ready workstream PR opened against `main` drags Phase 0 commits into its diff, making review noisy and the workstream PR un-mergable until Phase 0 lands.
- Once Phase 0 merges to `main`, the workstream lead retargets the open PR (`gh pr edit <num> --base main`) and rebases the branch onto the latest `main`.
- Phase 0 itself targets `main` directly.

### PR reviewer assignments
- Phase 0 → Workstream A lead (they're the heaviest consumer of Phase 0 outputs)
- Workstream A → Phase 0 lead + 1 other workstream lead (rotating)
- Workstream B → either of A or C lead
- Workstream C → Phase 0 lead + 1 other workstream lead
- Phase 2 → all leads must approve

### Scope tripwires (page the lead immediately)
A workstream **must** stop and page the lead before:
1. Adding a new API route or modifying any existing `app/api/**` handler.
2. Modifying any `lib/db.ts`, `lib/schemas.ts`, or `lib/types.ts` file.
3. Adding a new dependency to `package.json`.
4. Changing OAuth scopes in `lib/auth.ts`.
5. Modifying `middleware.ts` outside of Workstream B's documented edit.
6. Skipping any item on the test command matrix (B.1).

### Visual regression strategy
- No automated visual diff for this port.
- Each workstream PR includes 2 screenshots in the description: the relevant mockup screen and the rendered Next.js screen, side by side.
- Reviewer confirms within the visual tolerance from B.3.
- The mockup at `Email Copilot/index.html` stays in-repo through Phase 2 as the canonical reference; deleted only after Phase 2 sign-off.

## B.8 Kickoff (optional, 30 min, output is doc edits only)

If the team prefers a synchronous start, the kickoff agenda is:
1. (5 min) Walk through Phase 0 / 1 / 2 phasing on the plan.
2. (10 min) Each workstream lead reads their section + relevant appendix subsections silently.
3. (10 min) Q&A. **Every answer becomes a commit to FRONTEND_PORT_PLAN.md before the meeting ends.** No verbal-only decisions.
4. (5 min) Confirm branch checkout + first commit on each workstream branch.

Output gate: the meeting ends only when each workstream lead has pushed an empty commit on their branch with a message confirming they've read the plan and have no remaining questions. If a lead has questions, those go into the doc, not into Slack.

---

# Appendix C — Session prompts

Five copy-pasteable prompts, one per session, in the order they should run. Each prompt is self-contained — the receiving agent does NOT have prior chat context. Each tells the agent exactly which plan sections to load.

## C.1 — Phase 0 (foundation)

```
Working dir: /Users/f8fq/coding projects/Finished/AI_Inbox_Copilot

Read FRONTEND_PORT_PLAN.md sections:
- "Phase 0 — Shared foundation"
- Appendix A.1 (shared data types)
- Appendix A.2 (hooks)
- Appendix A.3 (API adapter)
- Appendix B.1 (verification contract)
- Appendix B.2 (Phase 0 specifics: icons, algorithms, safelist, Geist)
- Appendix B.7 (branching, PR target, scope tripwires)

Execute Phase 0:
1. `git checkout -b port/phase-0` from main.
2. Baseline: `npm run typecheck` must be green BEFORE you write any code. If it isn't, stop and report.
3. Write the 6 new files and edit the 3 existing files listed in Phase 0's "Files produced".
4. Verify: `npm run typecheck`, `npm run test:unit`, `npm run test:api` all green. `npm run dev` still serves the current (legacy) UI without console errors — Phase 0 is additive, not a replacement.
5. Commit. Open a PR targeting `main` with title "Phase 0: shared foundation for Email Copilot port".

Stop and ask if:
- Baseline typecheck or tests are red before you start.
- Any prop interface in Appendix A doesn't match the corresponding mockup file's actual usage.
- A Phase 0 helper signature would force a non-additive change to legacy components.

Do NOT touch: app/api/**, app/inbox/**, components/dashboard.tsx, lib/db.ts, lib/schemas.ts, lib/types.ts, lib/auth.ts, middleware.ts, providers/**. Phase 0 is additive only.

When done, report: the PR URL, the list of files added, and the typecheck/test output.
```

## C.2 — Workstream A (inbox screen)

Run after C.1's PR is merged to `main`.

```
Working dir: /Users/f8fq/coding projects/Finished/AI_Inbox_Copilot

Read FRONTEND_PORT_PLAN.md sections:
- "Phase 1 — Parallel workstreams" → "Workstream A — Inbox screen"
- Appendix A.1, A.3 (data types and API adapter — already implemented in Phase 0, you're a consumer)
- Appendix A.4 (inbox component prop interfaces)
- Appendix A.7 (smoke-test checklist — your acceptance criteria)
- Appendix B.1 (verification tiers)
- Appendix B.3 (visual tolerance, authError mapping, optimistic-update pattern, LiveSync policy)
- Appendix B.7 (branch + PR rules + scope tripwires)

Execute Workstream A:
1. `git checkout -b port/inbox` from latest `main` (Phase 0 has merged).
2. Implement components/inbox/* per A.4. Delete legacy files listed in Workstream A's exclusive write set.
3. Wire each component to `api` from `lib/ui/api.ts` (do NOT call fetch directly).
4. Verify: typecheck + test:unit + test:api + **test:contrast** all green (test:contrast is mandatory per B.1 for workstream A). Manually walk these A.7 sections at **Tier 2** (seeded JSON store, no OAuth): "Inbox — read", "Inbox — AI" (uses fallback heuristics if no AI keys), "EmailMessage rendering", and the "Regression" block. The "Inbox — write" / "Inbox — organize" / "LiveSync" sections call Gmail-token routes (modify/send/google-sync/subscription renewal) and are **Tier 3**; verify those only if Google OAuth credentials are configured, otherwise note "deferred to Phase 2 Tier 3" in the PR.
5. PR: target `main`. Include two side-by-side screenshots in the PR body: mockup vs new render at 1280px viewport.

Stop and ask if:
- An API route's actual return shape differs from what Appendix A.3 documented.
- The optimistic-update rollback path produces a flicker that's visibly wrong.
- A mockup feature has no backend equivalent at all (page the lead per B.7 tripwire #1).

Tripwires (per B.7): do NOT modify app/api/**, lib/db.ts, lib/schemas.ts, lib/types.ts, lib/auth.ts, middleware.ts. Do NOT add new npm dependencies.

Workstream A may run in 2 sessions. If you split, the natural seam is after Sidebar+ThreadListPanel+EmailDetailPanel land (session 1); AI/Reminder/Compose/Toast/LiveSync/Search in session 2.

When done, report: PR URL, list of files added/deleted, screenshot pair, smoke checklist results.
```

## C.3 — Workstream B (sign-in gate)

Can run in parallel with C.2 / C.4 or after. Branching keyed on **Phase 0**, not A: branch from `port/phase-0` if Phase 0 hasn't merged to `main` yet; otherwise from `main`.

```
Working dir: /Users/f8fq/coding projects/Finished/AI_Inbox_Copilot

Read FRONTEND_PORT_PLAN.md sections:
- "Phase 1 — Parallel workstreams" → "Workstream B — Sign-in gate"
- Appendix A.5 (SignInGate prop interface)
- Appendix B.1 (verification tiers)
- Appendix B.4 (middleware matcher + body — this is the critical part)
- Appendix B.7 (branch + PR rules + tripwires)

Execute Workstream B:
1. Branch `port/signin` from `main` if Phase 0 has merged, otherwise from `port/phase-0`. Per B.7, target `main` if it has merged, else target `port/phase-0`.
2. Create app/(auth)/signin/page.tsx and components/auth/SignInGate.tsx per A.5. Include all 5 visual elements from B.4 (grid, brand chip, headline, CTA, privacy line). Build-version footer is optional.
3. Edit lib/auth.ts ONLY to change `pages.signIn: "/"` to `pages.signIn: "/signin"`. Single-line edit.
4. Edit middleware.ts EXACTLY as shown in B.4 (segment-bounded matcher + new body that redirects page routes and 401s API routes). Do not invent new logic.
5. Verify: typecheck + test:unit + test:api green. Manually verify: visiting /inbox or /preferences while logged out redirects to /signin. The OAuth callback still works (visit /signin → "Continue with Google" → Google consent screen). If you have no Google credentials configured, skip the callback test and note it in the PR.
6. PR with one screenshot.

Stop and ask if:
- The middleware change breaks any existing test in tests/api/.
- /api/auth/* returns 401 or 404 after the matcher change (you bricked OAuth — revert the matcher and ask).

Tripwires (per B.7): the auth.ts and middleware.ts edits are EXPLICITLY in B's write set. Do not edit anything else in lib/ or under app/api/.

When done, report: PR URL, screenshot, confirmation that middleware logic was copied verbatim from B.4.
```

## C.4 — Workstream C (preferences)

Can run in parallel with C.2 / C.3 or after. Branching keyed on **Phase 0**: branch from `port/phase-0` if Phase 0 hasn't merged to `main` yet; otherwise from `main`.

```
Working dir: /Users/f8fq/coding projects/Finished/AI_Inbox_Copilot

Read FRONTEND_PORT_PLAN.md sections:
- "Phase 1 — Parallel workstreams" → "Workstream C — Preferences page"
- Appendix A.6 (PreferencesState flat shape, DEFAULT_PREFS, section contracts)
- Appendix B.1 (verification tiers)
- Appendix B.5 (shared primitives, verify-flow scope, sub-section split)
- Appendix B.7 (branch + PR rules + tripwires)

Execute Workstream C:
1. Branch `port/preferences` from `main` if Phase 0 has merged, otherwise from `port/phase-0`. Target accordingly.
2. Create:
   - app/preferences/page.tsx (with ESC → router.push('/inbox') handler)
   - components/preferences/PreferencesPage.tsx (port of mockup line 48 onward; uses flat PreferencesState from A.6, NOT nested)
   - components/preferences/sections/{Account,Ai,Notifications,Appearance,Keyboard,Connected,Privacy}Section.tsx
   - components/preferences/ui/{Card,Row,Section,Toggle,Segmented,Slider,ToneCards,ThemeSwatch,SecondaryButton}.tsx (shared primitives per B.5)
3. Wire Connected section to `api.listSubscriptions()`. Wire Privacy "Clear local cache" to `components/ui/ClearCacheAction.tsx` (Phase 0 output). API-key Verify button: render but disabled with title="API key verification ships with the backend (TODO)" — see B.5.
4. Verify: typecheck + test:unit + test:api + **test:contrast** all green (test:contrast is mandatory per B.1 for workstream C — Preferences uses the dark theme). Manually verify: /preferences renders all 7 sections without console errors; ESC navigates back; Connected lists real subscriptions; Clear-cache flow opens dialog → wipes → signs out.
5. PR with screenshots of each of the 7 sections.

Stop and ask if:
- A section's port would require a new API route or DB column (per B.7 tripwire #1).
- The 1.5-session budget is at risk on the ProviderModelPicker (per B.5, function over pixel fidelity is acceptable).

Tripwires (per B.7): do NOT add new API routes, schema columns, or DB migrations. Preferences persistence is explicitly out of scope; `prefs` lives in `useState(DEFAULT_PREFS)`.

When done, report: PR URL, 7 screenshots, list of TODO(prefs-backend) markers added.
```

## C.5 — Phase 2 (integration + verification)

Run only after C.2, C.3, C.4 have all merged.

```
Working dir: /Users/f8fq/coding projects/Finished/AI_Inbox_Copilot

Read FRONTEND_PORT_PLAN.md sections:
- "Phase 2 — Integration & verification"
- Appendix A.7 (full smoke-test checklist)
- Appendix B.1 (verification tiers — you'll run Tier 3 here)
- Appendix B.6 (codex arbitration rules + cleanup confirmation fallback)

Execute Phase 2:
1. Branch `port/phase-2` from latest `main` (A + B + C merged).
2. Smoke-check by hand. Split by tier:
   - **Tier 2 (mandatory)**: walk the A.7 "Inbox — read", "Inbox — AI", "EmailMessage rendering", "Preferences", and "Regression" sections against the seeded JSON store. Any failure → file an issue + bisect to the workstream PR that introduced it; do NOT silently patch.
   - **Tier 3 (mandatory if credentials available, otherwise document the gap)**: A.7 "Auth", "Inbox — write", "Inbox — organize", and "LiveSync" sections — these require a real Google account + `GOOGLE_CLIENT_ID/SECRET` configured. Document any scope-related 403s.
3. (Reserved — was redundant with step 2.)
4. Run all four test suites: typecheck, test:unit, test:api, test:contrast.
5. Invoke codex review. **Diff target matters**: do NOT use `origin/main..main` — after A/B/C merge into main, the upstream typically catches up and the diff is empty. Use the pre-port snapshot tag `port-base-snapshot` (created before Phase 0) as the diff base:
   ```
   /Applications/Codex.app/Contents/Resources/codex exec "Review the diff between port-base-snapshot and HEAD (Phase 0 + Workstreams A/B/C all merged). Focus on: (a) any backend API call wired wrong, (b) any mockup behavior silently dropped, (c) accessibility regression vs the previous UI, (d) mock data leaking into real components. For each finding, return: file:line, severity (blocker / important / nit), and a one-line proposed fix."
   ```
   If `port-base-snapshot` doesn't exist, create it before running codex: `git tag port-base-snapshot <pre-Phase-0-commit-sha>`. Triage per B.6: blocker → fix before Phase 2 PR; important → fix or open issue with deadline; nit → port-polish issue; scope creep → reject.
6. Cleanup: confirm with the user before deleting `Email Copilot/` and `Email Copilot.zip`. If user is unreachable, move them to `.archive/` instead (per B.6).
7. Final PR: any small fixes from steps 2-5 bundled.

Stop and ask if:
- A workstream PR introduced a regression and the fix is non-trivial.
- Codex's review surfaces a disagreement with a Workstream's PR that's already merged.
- Real-OAuth E2E fails on a Gmail path that worked pre-port (likely a route shape regression).

When done, report: smoke checklist status, codex findings + triage decisions, cleanup status (deleted vs archived).
```

## C.6 — Orchestration cheat sheet

For the lead (you):

- **Sequential** (recommended for first execution): C.1 → C.2 → C.3 → C.4 → C.5. Each in a fresh Claude Code session.
- **Parallel** (after Phase 0 lands): C.2 + C.3 + C.4 in three concurrent sessions. Use `git worktree add -b` to create the branch **and** the worktree in one command (the branches don't pre-exist):
  ```
  git worktree add -b port/inbox       ../inbox-port  main
  git worktree add -b port/signin      ../signin-port main
  git worktree add -b port/preferences ../prefs-port  main
  ```
  Each worktree is on its own branch; the three Claude Code sessions `cd` into the respective directory. If Phase 0 has not yet merged to main, replace `main` with `port/phase-0` as the source branch.
- **Sub-agent fan-out** (single orchestrator session): use Claude Code's Agent tool with `subagent_type: general-purpose` and `isolation: "worktree"`, three parallel tool calls in one message, each given C.2/C.3/C.4 verbatim as the prompt.

Whichever you pick, the prompts above are designed to be copy-pasted **verbatim**. Do not edit them without committing the change to FRONTEND_PORT_PLAN.md first — they reference plan sections by name, and divergence between prompt and plan breaks the contract.

### Lead checklist (run between sessions)

**Before kicking off C.1:**
- [ ] Create the snapshot tag for rollback + Phase 2 codex diff base: `git tag port-base-snapshot $(git rev-parse HEAD)` on the pre-Phase-0 main HEAD.
- [ ] Confirm `main` is green: `npm run typecheck && npm run test:unit && npm run test:api`.

**After C.1 lands (Phase 0 merged to main):**
- [ ] Notify any Workstream agent currently branched off `port/phase-0` to retarget their PR to `main` and rebase: `gh pr edit <num> --base main && git rebase main`.

**Per workstream PR (A, B, C) — review gate:**
- [ ] Test command matrix from B.1: typecheck + test:unit + test:api green. test:contrast green for A and C.
- [ ] Screenshots present in PR body (mockup vs new render).
- [ ] Diff stays within the workstream's exclusive write set from the plan body — no edits in another workstream's territory.
- [ ] Reviewer assignments (per B.7): Workstream A → Phase 0 lead + 1 other workstream lead; Workstream B → either A or C lead; Workstream C → Phase 0 lead + 1 other workstream lead.

**Merge order:**
- C.1 (Phase 0) must merge first.
- After Phase 0, A / B / C can land in any order. Recommended: A first (largest, surfaces issues that B and C can adapt to), then B, then C.
- C.5 (Phase 2) runs only after all three Workstream PRs have merged to main.

**Scope tripwire response (per B.7):**
If a workstream agent reports hitting any of the 6 tripwires (new API route, schema edit, OAuth scope change, new dependency, middleware change outside B's scope, skipping a test), the lead decides on the spot:
1. Approve as a foundation promotion. If Phase 0 has **not** yet merged: workstream opens a PR against `port/phase-0`. If Phase 0 has **already** merged: workstream opens a small standalone PR against `main` titled "Phase 0 follow-up: <helper>"; other workstreams rebase onto main once it lands.
2. Approve as workstream-local with a justification comment in the PR.
3. Reject → workstream finds a different path within the existing surface.



