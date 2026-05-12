# Inbox Copilot

A pragmatic MVP for a inbox assistant built with Next.js.

## Included

- Google OAuth sign-in via Auth.js
- Inbox sync and local storage for message metadata, threads, and reminders
- Thread summarization that returns short, actionable output
- Draft reply generation with tone controls and clarifying-question mode
- Draft revision from natural-language user edit instructions
- Follow-up reminders for "waiting on" threads
- Keyword-first search, with a clear seam to add embeddings later
- Persisted OAuth connections for sessionless sync and webhook-triggered refresh
- Backend scaffolding for Gmail watch and Microsoft Graph subscriptions

## Stack

- Next.js App Router
- TypeScript
- Local JSON persistence in `.data/inbox.json`
- Real Gmail API ingestion in the current UI, with Microsoft Graph adapter code still present in `providers/adapters.ts`
- Stored connection refresh logic in `lib/connections.ts`
- Gemini-backed summaries and draft generation in `lib/copilot.ts`

## Run

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set the required env vars for the current UI:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL=http://localhost:3000`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. Optional:
   - `GEMINI_API_KEY` for LLM-backed summaries and drafts
   - `GEMINI_MODEL` to override the default Gemini model
5. Start the app: `npm run dev`

## Google OAuth Setup

To run the app with Google sign-in and real Gmail sync, configure a Google Cloud project with OAuth and Gmail access.

1. Create or select a Google Cloud project.
2. Enable this Google API for that project:
   - `Gmail API`
3. Configure the OAuth consent screen.
   - Add your app name and support email.
   - If the app is in testing mode, add your Google account as a test user.
4. Create an OAuth 2.0 Client ID credential.
   - Application type: `Web application`
   - Authorized redirect URI:
     - `http://localhost:3000/api/auth/callback/google`
5. Copy the client values into `.env.local`:

```bash
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

6. Start the app with `npm run dev`.
7. Open `http://localhost:3000`, click `Connect Google`, then click `Sync Gmail`.

### Required Google APIs and Scopes

This code requires:

- Google API:
  - `Gmail API`
- OAuth scopes requested by the app:
  - `openid`
  - `email`
  - `profile`
  - `https://www.googleapis.com/auth/gmail.modify`

Google may also return standard userinfo scopes as part of the granted token set, but the key app-specific mailbox permission is `gmail.modify` (read + send + label modifications; superset of `gmail.readonly`).

Without the `Gmail API` enabled, Google sign-in may succeed, but Gmail sync will fail when the app calls the Gmail REST API.

## Architecture decisions

See `docs/decisions.md` for the locked decisions (D1–D8) and the Reminder data-model contract that gates Phases 4 and 5 of the remediation plan.

## Notes

- The current UI uses Google sign-in and Gmail sync. Microsoft Graph backend code still exists, but it is not exposed in the current interface.
- Summary and draft generation use Gemini when `GEMINI_API_KEY` is set. Without it, the app falls back to the old heuristic templates.
- OAuth connections are also persisted in `.data/inbox.json` so `/api/inbox/sync/all` and webhook handlers can refresh tokens without an active browser session.
- The local app "cache" and persisted inbox state live in `.data/inbox.json`.
- OAuth tokens in `connections` are encrypted at rest with AES-256-GCM when `ENCRYPTION_KEY` is set (32 random bytes, base64-encoded). Without the key, tokens fall back to plaintext (legacy MVP behavior). Even encrypted, do not share `.data/inbox.json` outside of trusted contexts.
- A sanitized upload-safe copy can be created at `.data/inbox.upload.json`, with `accessToken` and `refreshToken` removed from all stored connections.
- The app can clear the local cache from the UI, or you can call `DELETE /api/inbox/cache` to wipe `.data/inbox.json` back to an empty store.
- Gmail requires `gmail.modify` (covers read, send, and label modifications). The Google auth flow also includes standard OpenID profile scopes.
- Gmail sync explicitly merges `INBOX` and `SENT` thread IDs so outbound replies are included in the local thread model.
- Backend-only subscription routes still exist: create subscriptions with `POST /api/inbox/subscriptions`; list them with `GET /api/inbox/subscriptions`.
- Backend-only bulk refresh still exists at `POST /api/inbox/sync/all`.
- Backend webhook routes still exist at `/api/webhooks/google` and `/api/webhooks/microsoft`.
- Gmail watch requires `GOOGLE_PUBSUB_TOPIC`. Microsoft Graph validation uses `MICROSOFT_WEBHOOK_URL`. Both webhook URLs must be publicly reachable in production.
- If you want to test sync before wiring OAuth in the UI, `POST /api/inbox/sync` also accepts an `accessToken` in the request body.
- Set `GEMINI_API_KEY` to enable real LLM output. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.
- Set `ENCRYPTION_KEY` to encrypt OAuth tokens at rest in `.data/inbox.json` (AES-256-GCM, format `enc:v1:...`). Existing plaintext tokens are transparently re-encrypted on the next mutation. Rotating the key invalidates existing encrypted tokens — users will need to reconnect.
- Search is keyword-based today. The `/api/search` route is the right insertion point for embeddings or hybrid retrieval.
