# Functional Feature Implementation Plan

This plan covers the functional features that are claimed or partially supported by the codebase but are not fully exposed in the active `/inbox` UI.

## Scope

Features to implement:

- AI thread summarization.
- AI draft reply generation.
- Draft revision from natural-language instructions.
- Reminder scheduling UI.
- Keyword search through `/api/search`.
- Clear cache from UI.
- Subscription creation UI.
- Webhook/SSE refresh UI.

## Current Situation

The active app route redirects from `app/page.tsx` to `app/inbox/page.tsx`, which renders `components/inbox/InboxView.tsx`.

The active inbox UI currently supports:

- Google sign-in.
- Gmail sync through `/api/inbox/sync`.
- Browsing Inbox, Sent, Drafts, Archive, and Trash.
- Reading thread messages.
- Client-side list search/filtering.
- New message compose.
- Thread reply.
- Forward.
- Gmail send.
- Archive, trash, and mark unread.
- Local persistence in `.data/inbox.json`.

Several functional features already exist as backend routes or older dashboard wiring, but they are not exposed in the active inbox UI.

## Target Files

Primary UI integration:

- `components/inbox/InboxView.tsx`

Reference implementation from older UI:

- `components/dashboard.tsx`

Existing backend routes:

- `app/api/threads/[threadId]/summary/route.ts`
- `app/api/threads/[threadId]/draft/route.ts`
- `app/api/threads/[threadId]/draft/revise/route.ts`
- `app/api/reminders/route.ts`
- `app/api/reminders/[id]/route.ts`
- `app/api/search/route.ts`
- `app/api/inbox/cache/route.ts`
- `app/api/inbox/subscriptions/route.ts`
- `app/api/inbox/stream/route.ts`

## Phase 1: AI Thread Tools

Add AI actions to the selected thread detail area.

Features:

- Add a `Summarize` button.
- Add a `Draft Reply` button.
- Add a tone selector with `concise`, `friendly`, and `formal`.
- Add an `Ask clarifying question` toggle.
- Display summary output in a compact panel near the selected thread.
- Display generated draft in an AI draft panel or make it available to the reply composer.
- Add a revision input for instructions such as `make it warmer`, `shorten this`, or `make it more formal`.
- Add a `Revise Draft` button that calls `/api/threads/[threadId]/draft/revise`.

Implementation details:

- Reuse the state shape from `components/dashboard.tsx`: `summaryResult`, `draftResult`, `tone`, `askClarifyingQuestion`, and pending states.
- Clear summary and draft state when `selectedThreadId` changes.
- Route all AI failures through the existing toast surface in `InboxView.tsx`.
- Add loading skeletons while summary or draft generation is pending.
- Prefer requiring a `Use Draft` action before placing generated text into the reply composer, so AI text does not overwrite user text unexpectedly.

Acceptance criteria:

- Clicking `Summarize` returns and displays a summary for the selected thread.
- Clicking `Draft Reply` generates text for the selected thread.
- The generated draft can be inserted into the reply composer.
- Revision updates the current draft without changing the selected thread.
- Switching threads clears stale AI output.

## Phase 2: Reminder Scheduling UI

Add a reminder action inside the selected thread toolbar or detail area.

Features:

- Add a `Set reminder` action.
- Add a reminder form with due date/time and reason.
- Display reminders for the current thread.
- Add actions to mark reminders complete.
- Add actions to delete reminders.
- Show a pending reminder indicator in the thread list when a thread has active reminders.

Implementation details:

- Use `POST /api/reminders` to create reminders.
- Use `GET /api/reminders` if a full reminder refresh is needed.
- Use `PATCH /api/reminders/[id]` to mark reminders complete.
- Use `DELETE /api/reminders/[id]` to delete reminders.
- Store reminder updates in local `store.reminders` state after API responses.
- Keep reminders as in-app records for now; actual notification delivery is a separate backend delivery feature.

Acceptance criteria:

- User can schedule a reminder for the selected thread.
- Reminder appears without a full page refresh.
- Completed reminders update in the UI.
- Deleted reminders disappear from the UI.
- Threads with active reminders are visually distinguishable.

## Phase 3: Keyword Search Through `/api/search`

Replace or supplement the current client-side list search with backend keyword search.

Features:

- Keep the current search input.
- Call `/api/search` when a query is submitted or after a short debounce.
- Show backend search results.
- Select the correct thread when a result is clicked.
- Restore normal mailbox view when the search query is empty.

Implementation details:

- Add `searchResults`, `searchPending`, and `isSearchMode` state.
- Keep the `Unread` filter separate from backend search to avoid confusing state.
- For empty query, clear search results and return to the active mailbox label.
- If a search result references a thread already loaded in `store`, select it directly.
- If a search result references a thread not present in the current label view, either hydrate it into the visible list or show a minimal result row that can still select/display the thread.

Acceptance criteria:

- Search uses `/api/search`, not only local filtering.
- Empty query restores normal mailbox list.
- No-result state is shown.
- Search result click selects the correct thread.

## Phase 4: Clear Cache From UI

Add a destructive cache-clearing action in the user/account area.

Features:

- Add a `Clear local cache` action.
- Show a strong confirmation dialog.
- Call `DELETE /api/inbox/cache`.
- Reset local UI state after successful deletion.
- Sign the user out or require reconnection after deletion.

Implementation details:

- Reuse the confirmation copy from `components/dashboard.tsx`.
- After success, clear `store`, selected thread, composer, search, AI state, reminders, and toast state.
- Use the toast surface for failures.
- Keep this action away from primary inbox actions to avoid accidental use.

Acceptance criteria:

- User cannot clear cache with one accidental click.
- Data clears from the UI immediately after successful API response.
- Error path is visible.
- User understands that local synced data and stored OAuth connections are removed.

## Phase 5: Subscription Creation UI

Expose backend subscription setup as an explicit mailbox watch feature.

Features:

- Add an `Enable live sync` or `Create mailbox watch` action in settings/account area.
- Display current subscription status.
- Display provider, email, last updated time, and expiration if available.
- Call `POST /api/inbox/subscriptions`.
- Call `GET /api/inbox/subscriptions` to show existing subscriptions.
- Show useful errors for missing provider configuration.

Implementation details:

- First implementation should support Google from the active UI.
- Gmail watch requires `GOOGLE_PUBSUB_TOPIC`.
- Google webhook delivery requires a public push endpoint and valid Pub/Sub OIDC configuration.
- Microsoft support should remain backend-only until Microsoft sign-in is exposed in the active UI.
- Treat this as an advanced setup control, not an always-on default.

Acceptance criteria:

- User can create a Gmail watch subscription from the UI when environment variables are configured.
- Missing configuration produces a clear error.
- Existing subscriptions are visible.
- Subscription creation does not interrupt normal manual refresh.

## Phase 6: Webhook/SSE Refresh UI

Connect the active UI to `/api/inbox/stream`.

Features:

- Open `EventSource("/api/inbox/stream")` when authenticated.
- Listen for `sync` events.
- Refresh the active mailbox label after a sync event.
- Show a subtle live status such as connected, waiting, refreshed, or disconnected.
- Let browser `EventSource` handle reconnect behavior.

Implementation details:

- Add an authenticated `useEffect` in `InboxView.tsx`.
- Clean up the `EventSource` on unmount or sign-out.
- Avoid closing the reply composer or compose dialog during background refresh.
- If the event provider is Google, refresh the active label.
- If the event provider is not currently active or supported by the UI, ignore it for now.
- Manual refresh must continue to work even if SSE fails.

Acceptance criteria:

- Webhook-triggered backend sync updates the UI without manual refresh.
- SSE disconnect does not break normal manual refresh.
- Compose and reply state are not lost during background refresh.
- User can see live sync status without the UI becoming noisy.

## Recommended Implementation Order

1. AI summary, draft, and draft revision.
2. Reminder scheduling UI.
3. Backend keyword search.
4. Clear cache UI.
5. SSE refresh.
6. Subscription creation UI.

Reasoning:

- AI tools, reminders, search, and clear cache are immediately useful in local development.
- SSE refresh depends on the existing backend emitter but is still manageable locally.
- Subscription creation depends most heavily on external configuration, public webhook URLs, and Google Pub/Sub setup.

## Product Decisions To Confirm

These should be confirmed before implementation to avoid unnecessary rework:

- Where AI output should live: inline above messages, below messages, or in a side drawer.
- Whether generated drafts should be inserted automatically into the reply composer or require a `Use Draft` action.
- Whether reminders should remain in-app records for now or include real notification delivery.
- Whether live sync should be enabled automatically after sign-in or manually through a settings action.

Recommended defaults:

- Put AI output in an inline panel near the thread detail.
- Require `Use Draft` before inserting AI text into the reply composer.
- Keep reminders as in-app records for now.
- Make live sync manually enabled until webhook setup is confirmed.

## Team Distribution Plan

If this work is distributed across a small team, split it into four workstreams so contributors can work mostly in separate files and avoid repeated conflicts in `InboxView.tsx`.

## Workstream 1: Inbox UI Owner

Primary responsibility:

- Own final integration in `components/inbox/InboxView.tsx`.

Work:

- Add clear cache entry point.
- Add backend search entry point.
- Add reminder panel entry point.
- Add AI panel shell.
- Own the selected-thread state contract shared by the new panels.
- Own final UX integration and spacing in the active inbox screen.

Rationale:

- Most visible features touch the active inbox screen.
- One person should own the final composition of panels, toolbars, and state wiring.

Conflict guidance:

- Other workstreams should avoid direct edits to `InboxView.tsx` except through agreed integration points.
- Prefer new components under `components/inbox/` for feature-specific logic.

## Workstream 2: AI Features Owner

Primary responsibility:

- Build the AI thread tools as a separate component.

Recommended file:

- `components/inbox/AiThreadPanel.tsx`

Work:

- Add summary UI.
- Add draft generation UI.
- Add tone selector.
- Add `Ask clarifying question` toggle.
- Add `Use Draft` flow.
- Add draft revision input.
- Add loading and error states.

Existing routes to use:

- `/api/threads/[threadId]/summary`
- `/api/threads/[threadId]/draft`
- `/api/threads/[threadId]/draft/revise`

Dependency notes:

- AI summary is independent.
- AI draft generation is mostly independent but needs a selected thread and a UI location for output.
- Draft revision depends on having a draft object, so it should be implemented after or alongside draft generation.

Acceptance ownership:

- Summary and draft output must clear when the selected thread changes.
- Generated text should not overwrite a user-written reply unless the user clicks `Use Draft`.

## Workstream 3: Reminder, Search, And Cache Owner

Primary responsibility:

- Build the smaller functional panels and actions that do not depend on AI.

Recommended files:

- `components/inbox/ReminderThreadPanel.tsx`
- `components/inbox/InboxSearchResults.tsx`
- Optional: `components/inbox/ClearCacheAction.tsx`

Work:

- Add reminder scheduling UI.
- Add complete reminder action.
- Add delete reminder action.
- Add active reminder indicator for threads.
- Add backend keyword search through `/api/search`.
- Add clear cache confirmation and reset behavior.

Existing routes to use:

- `POST /api/reminders`
- `GET /api/reminders`
- `PATCH /api/reminders/[id]`
- `DELETE /api/reminders/[id]`
- `POST /api/search`
- `DELETE /api/inbox/cache`

Dependency notes:

- Clear cache is independent.
- Keyword search is independent.
- Reminder scheduling UI is independent, except real reminder delivery is out of scope for this batch.

Acceptance ownership:

- Search must use `/api/search`, not only local filtering.
- Empty search must restore normal mailbox view.
- Reminder changes must update UI state without full page refresh.
- Clear cache must require confirmation and visibly reset local UI state.

## Workstream 4: Live Sync And Subscriptions Owner

Primary responsibility:

- Build live refresh behavior and provider subscription controls.

Recommended file:

- `components/inbox/LiveSyncPanel.tsx`

Work:

- Add SSE `EventSource` client for `/api/inbox/stream`.
- Add live sync status display.
- Refresh active mailbox label after `sync` events.
- Add subscription creation action.
- Add subscription list/status view.
- Handle missing environment configuration errors.

Existing routes to use:

- `GET /api/inbox/stream`
- `GET /api/inbox/subscriptions`
- `POST /api/inbox/subscriptions`

Dependency notes:

- Webhook/SSE refresh UI can be wired independently, but it only becomes valuable when backend sync events are emitted.
- Subscription creation is not fully independent because it depends on provider configuration, public webhook URLs, and a useful refresh path.
- Subscription UI should come after basic SSE refresh is working.

Acceptance ownership:

- SSE disconnect must not break manual refresh.
- Background refresh must not close compose or reply drafts.
- Missing `GOOGLE_PUBSUB_TOPIC` or webhook configuration must produce a useful error.
- Existing subscriptions should be visible after creation.

## Recommended Team Execution Order

1. Inbox UI Owner creates empty component slots and prop contracts in `InboxView.tsx`.
2. AI Features Owner builds `AiThreadPanel`.
3. Reminder/Search/Cache Owner builds reminder, search, and clear-cache components.
4. Inbox UI Owner wires components into selected-thread state and final layout.
5. Live Sync/Subscriptions Owner adds SSE status and refresh behavior.
6. Live Sync/Subscriptions Owner adds subscription creation UI after SSE refresh is stable.

## Coordination Rules

- Keep `InboxView.tsx` edits concentrated with the Inbox UI Owner.
- Put feature behavior in separate components under `components/inbox/`.
- Avoid changing existing API routes unless a route is proven insufficient.
- Share selected-thread data through explicit props rather than importing global state.
- Route user-visible errors through the existing toast surface.
- Clear feature-specific state when `selectedThreadId` changes.
- Do not implement live subscription setup before confirming Google Pub/Sub and public webhook configuration.
