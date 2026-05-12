# AI Inbox Copilot — UI/UX Polish Plan

Incremental polish from the current functional baseline: sign-in → folder switch → real Gmail data → read / reply / forward / compose / archive / trash / mark-unread. Every item is grounded in a specific gap in the code today, not generic UX advice. Verified against the codebase by Codex CLI.

---

## Implementation guardrails

- Do not add placeholder UI for AI features; keep the app grounded in Gmail-backed behavior that works today.
- Preserve current read / reply / forward / compose / archive / trash / mark-unread behavior before layering on visual polish.
- Prefer optimistic updates only when there is a reliable rollback path and a clear failure toast.
- Keyboard shortcuts must not fire while the user is typing in `input`, `textarea`, `select`, `[contenteditable]`, or inside a modal unless the shortcut is explicitly modal-scoped.
- Every new modal, toast, menu, and keyboard interaction needs keyboard and screen-reader behavior, not just pointer behavior.
- Keep route changes and UI-only polish separate where practical; backend/API coupling should be isolated to the items that require it.
- Do not mount expensive email iframes or large `srcDoc` payloads unless the message is visible or intentionally expanded.

## Acceptance criteria pattern

Each implementation pass should add concrete acceptance criteria before starting the code change. Use this shape:

```md
Acceptance criteria:
- User-visible behavior changes immediately when the action succeeds optimistically.
- API failure restores the previous local state.
- The toast explains the failure and offers the next useful action when one exists.
- Keyboard-only users can reach and dismiss the interaction.
```

---

## P0 — High impact, low effort

1. **Auto mark-as-read on thread open.** The Mark-Unread button works, but reading a thread doesn't clear unread — so the inbox unread count stays stuck after you've read everything. Fire `POST /api/threads/{id}/modify { action: "mark-read" }` when a thread with unread messages is selected; update local state optimistically. *Effort: moderate (touches interaction state).* Acceptance: unread styling and count update immediately; API failure restores unread state and shows a dismissible toast.
2. **Optimistic Archive/Trash.** Today the card stays visible until `runSync` completes (~1–2s). Remove the thread from local state immediately; restore on API error. *See Risk #1.* Acceptance: card disappears immediately from the active folder; failure restores it to the original position.
3. **Keyboard shortcuts (Gmail parity).** Minimum: `j`/`k` (next/prev thread), `r` (reply), `e` (archive), `#` (trash), `c` (compose), `/` (focus search), `Esc` (close dialog/discard). Acceptance: shortcuts are ignored while typing in inputs/textareas/selects/contenteditable areas and do not conflict with open modal behavior.
4. **`Cmd/Ctrl+Enter` to send** in both `ReplyComposer` and `ComposeDialog`. One keydown handler each. Acceptance: shortcut sends only when the form is valid and does not double-submit while a send request is pending.
5. **Modal focus hygiene for `ComposeDialog`.** Auto-focus `To` field (or `body` for Forward), trap `Tab` inside, `Esc` closes. Currently focus can escape the modal. *Effort: moderate (focus semantics).* Acceptance: modal uses `role="dialog"` and `aria-modal="true"`; icon-only controls have accessible labels; focus returns to the opener on close.
6. **Unify error toasts.** The action-error toast has a dismiss `X`; the sync-error toast doesn't. Add dismiss + a "Retry" button that re-invokes `runSync(activeNav)`. Acceptance: action and sync failures share one toast pattern; retry is present only when retrying is safe.
7. **Disable `Send` until `To` looks like an email.** Simple regex check + greyed-out helper text. Saves a round-trip and a red toast. Acceptance: invalid recipients prevent send by click and keyboard shortcut; helper text explains the blocked state.

## P1 — Meaningful UX gains, moderate effort

8. **Skeleton loaders during folder switch.** Replace the centered "Loading sent…" string with 5–6 skeleton thread cards (greyed rects matching real card height). Acceptance: skeleton shape matches real cards closely enough that layout does not jump when content arrives.
9. **Compose recipient chips + CC/BCC reveal.** Replace `<input type="email">` for `To` with chip-style tokens (`x` to remove). Hide CC/BCC behind a "Cc Bcc" toggle, Gmail-style. Backend (`/api/send`) already accepts `cc`/`bcc`. Acceptance: Enter/comma creates chips; Backspace removes the previous empty chip; invalid chips are visually flagged.
9b. **Undo toast for Archive/Trash.** *Added per Codex.* After an action, show a 5-second toast with "Undo" that POSTs the inverse: archive → `addLabelIds: ["INBOX"]`; trash → `threads/{id}/untrash`. Extend `/api/threads/[id]/modify` schema with `untrash` (and `unarchive` mapping to `addLabelIds: INBOX`). Depends on #2. Acceptance: undo restores the thread to its previous folder/list position and reports failure if the inverse action fails.
10. **Smarter timestamps.** Add weekday names for "this week" ("Mon"), and a `<time title>` tooltip with the full timestamp on hover. Acceptance: machine-readable `dateTime` is present and full timestamp is available on hover/focus.
11. **Attachment downloads.** Attachment chips show name+size but aren't clickable. Need: (a) extend `MessageAttachment` (in `lib/types.ts`) with `attachmentId` — Codex flagged this missing field in the first review; (b) new route `GET /api/attachments/{messageId}/{attachmentId}` that streams the Gmail attachment payload; (c) wire chip → download. Acceptance: clicking a chip downloads the original file; route rejects missing/unauthorized attachment access.
12. **Inline image lazy-load + click-to-expand.** Add `loading="lazy"` to images in the email body srcDoc base styles. Clicking an inline image opens a lightbox overlay. Acceptance: lightbox is keyboard dismissible, traps focus while open, and does not expand tracking pixels or broken images.
13. **Confirm before discarding a non-empty draft** in both `ReplyComposer` and `ComposeDialog`. One-line check per Discard handler. Acceptance: empty drafts close immediately; non-empty drafts require confirmation; keyboard `Esc` follows the same rule.
13b. **Draft autosave to `localStorage`.** *Added per Codex.* Persist compose/reply body keyed by `threadId` (or `"new"` for fresh composes) so accidental close/reload doesn't lose typing. Restore on dialog open. Clear on successful send. Depends on #13. Acceptance: reload restores unsent body/recipients; successful send clears saved draft; user can discard and clear saved draft intentionally.
14. **Background auto-refresh via SSE.** `/api/inbox/stream` and `hooks/use-inbox-stream.ts` already exist and ship a working SSE channel — they're just not wired into the new `InboxView`. Subscribe and trigger a quiet `runSync(activeNav)` on each `sync` event. *See Risk #2.* Depends on stable optimistic state from #1/#2/#9b. Acceptance: events for other accounts/providers/folders are ignored and refresh does not steal focus or reset the selected thread unnecessarily.
15. **Scope-mismatch banner.** Users who signed in before the `gmail.modify` upgrade only discover the problem when send/archive 403s. Detect `session.authError` (or a heuristic on first 403) and show a top banner: "Re-sign in to enable Send + Archive." Acceptance: banner is visible before repeated action failures when detectable; first 403 fallback shows the banner and a specific re-auth action.
16. **Mobile responsive layout.** *Promoted from P2 per Codex.* Sidebar 256px + list 380px + detail flex doesn't fit phones. Below ~768px, stack to single-pane with a back button (sidebar → drawer). Acceptance: mobile supports folder nav, thread list, thread detail, compose, reply, and search without horizontal scrolling.
16b. **Empty states for every major surface.** Add specific states for empty inbox, empty sent, empty archive/trash, empty search results, no account connected, and scope mismatch. Acceptance: empty states explain why the view is empty and expose the next useful action where applicable.
16c. **Load more threads / pagination.** If the active folder has more than the first loaded page, expose a "Load more" control or infinite-load sentinel. Preserve active folder and search state while appending results. Acceptance: loading more appends without clearing selection, duplicating threads, or losing scroll position.

## P2 — Larger scope; later passes

17. **Light-mode theme.** Codebase is hardcoded slate-* dark. Parameterize via CSS variables; iframe email body styles need a parallel light palette.
18. **Server-side Gmail search.** Today's search filters loaded threads client-side. Wire to Gmail's `q=` parameter so it searches the entire mailbox, not just the current page. Depends on #16c if search result pagination is supported.
19. **"Show quoted text" collapse.** Detect `<blockquote>` / `gmail_quote` in the email HTML and collapse them behind a `…` toggle inside the iframe.
20. **Rich-text compose.** Upgrade send to `multipart/alternative` (HTML + plain) and add a small format toolbar (bold/italic/link/list). Big change; pairs naturally with attachment send. Depends on #13/#13b so draft-loss behavior is solved first.
21. **Proper reply threading headers.** Add `In-Reply-To` and `References` headers in `/api/send` for replies (sourced from original message's `Message-ID`). Codex flagged this twice; needed for non-Gmail clients to thread correctly. Requires capturing `Message-ID` in the Gmail adapter.
22. **Lazy-mount iframes for long threads.** For threads with 10+ messages, only mount the iframe for the latest 2–3; older messages render as static text previews until clicked. Acceptance: long threads avoid mounting every iframe up front; expanding older messages is explicit and preserves scroll position.
23. **Email rendering performance budget.** Avoid re-rendering iframe `srcDoc` on unrelated state changes, cap/virtualize very tall message bodies where practical, and avoid eager work for hidden messages. Acceptance: selecting, archiving, and typing in compose do not cause all visible message iframes to remount.

## Out of scope (acknowledged)

- **Send attachments** — needs file upload + `multipart/mixed`; pairs with #20.
- **AI features** (Copilot Summary, smart drafts) — explicitly removed earlier per the no-placeholder rule.
- **Spam folder** — `gmail.modify` covers it but no nav item; add only if requested.
- **Multi-account UI** — backend supports it; UI is single-account by design.

---

## Risk notes (from Codex review)

1. **Optimistic archive/trash needs careful failure-restore.** If the API errors after the card is removed from local state, the UI must surface a clear "couldn't archive — restored" toast and put the card back in its original position. Without this, a 403 leaves the user thinking the action succeeded.
2. **SSE auto-refresh must narrow event filtering.** `/api/inbox/stream` emits events for all providers/accounts. Filter by `email` / `provider` matching the signed-in user, and ignore events for folders other than `activeNav`, or refreshes will fire constantly.
3. **Keyboard shortcuts must be context-aware.** Global handlers that ignore the active element will break compose/reply typing and modal interactions. Treat shortcut dispatch as an explicit state machine, not a document-wide catch-all.
4. **Undo and SSE can fight each other.** If SSE refresh runs immediately after an optimistic archive/trash, it may reinsert or remove a thread before the undo window expires. Defer or reconcile refreshes for threads with pending optimistic actions.
5. **Mobile layout can expose hidden state bugs.** Single-pane navigation needs a clear selected-thread/back-stack model; otherwise folder switches, search, and compose can leave stale detail panes visible.

## Effort calibration (from Codex)

- P0 #1 and #5 are **moderate**, not small (touch interaction state + focus semantics).
- P1 #11 and #14 are **medium** (model + backend/UI coupling).
- P1 #12 is **medium-high** (lightbox UX work).
- P2 #20 and #21 are **genuinely large** (multi-subtask).

## Accessibility checklist

- Dialogs use `role="dialog"` and `aria-modal="true"`.
- Focus moves into dialogs on open and returns to the opener on close.
- Toasts use an appropriate live region and remain dismissible.
- Icon-only buttons have accessible names.
- Thread rows and action buttons have visible focus states.
- Keyboard shortcuts are discoverable and disabled while typing.
- Lightbox, compose, and discard-confirmation flows work without a mouse.

## Regression checklist

- Inbox, Sent, Archive, Trash, and Search still load Gmail-backed data.
- Archive/trash/mark-read/mark-unread still sync with Gmail after local optimistic updates.
- Reply preserves the intended thread context.
- Forward opens compose with the expected subject/body.
- Compose send works with To, CC, and BCC after recipient chip changes.
- Scope/permission failures produce a banner or toast that tells the user to re-sign in.

## QA checklist

- Desktop: inbox, sent, archive, trash, search, compose, reply, forward.
- Mobile: sidebar/drawer, thread list, thread detail, back button, compose, reply.
- Keyboard-only: navigate threads, open thread, reply, send, archive, trash, close modal.
- Error paths: 401/403 Gmail scope error, network failure, send failure, attachment failure.
- Long content: 10+ message thread, inline images, large email body, attachments.
- Empty states: empty folder, empty search result, no connected account, scope mismatch.

## Dependency notes

- #9b depends on #2 because undo needs the same optimistic state model and rollback path.
- #13b depends on #13 because autosave and discard confirmation must agree on when a draft is intentionally cleared.
- #14 should wait until #1/#2/#9b are stable so SSE refresh does not fight optimistic state.
- #16 should be implemented before deeper compose polish if mobile is a supported target.
- #18 depends on #16c if Gmail search results need pagination or "load more".
- #20 should wait until draft-loss protections (#13/#13b) are in place.
- #22/#23 should be considered before adding richer email rendering features that increase iframe cost.

## Execution order

P0-A state correctness: #1 / #2 / #6 / #7.

P0-B input ergonomics: #3 / #4 / #5.

P1 visible polish: #8 / #9 / #9b / #10 / #13 / #13b / #15 / #16 / #16b / #16c.

P1 coupled backend/UI work: #11 / #12 / #14.

P2 individually: #17-#23.
