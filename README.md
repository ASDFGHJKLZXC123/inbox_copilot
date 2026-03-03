# AI Inbox Copilot

A pragmatic MVP for a Superhuman/Grammarly-adjacent inbox assistant built with Next.js.

## Included

- OAuth sign-in wiring for Google and Microsoft via Auth.js
- Inbox sync and local storage for message metadata, threads, and reminders
- Thread summarization that returns short, actionable output
- Draft reply generation with tone controls and clarifying-question mode
- Follow-up reminders for "waiting on" threads
- Keyword-first search, with a clear seam to add embeddings later
- Persisted OAuth connections for sessionless sync and webhook-triggered refresh
- Push sync scaffolding for Gmail watch and Microsoft Graph subscriptions

## Stack

- Next.js App Router
- TypeScript
- Local JSON persistence in `.data/inbox.json`
- Real Gmail API and Microsoft Graph ingestion in `providers/adapters.ts`
- Stored connection refresh logic in `lib/connections.ts`
- Gemini-backed summaries and draft generation in `lib/copilot.ts`

## Run

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Set `NEXTAUTH_SECRET` and any OAuth client credentials you have
4. Start the app: `npm run dev`

## Google OAuth Setup

To run the app with Google sign-in and real Gmail sync, configure a Google Cloud project with OAuth and Gmail access.

1. Create or select a Google Cloud project.
2. Enable these Google APIs for that project:
   - `Gmail API`
   - `Google People API` or `Google OAuth profile access` is not directly called by this app, but Google Sign-In uses standard OpenID user info scopes through OAuth.
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
  - `https://www.googleapis.com/auth/gmail.readonly`

Without the `Gmail API` enabled, Google sign-in may succeed, but Gmail sync will fail when the app calls the Gmail REST API.

## Notes

- Sync now uses real Gmail and Microsoft Graph API calls with OAuth access tokens from Auth.js sessions.
- Summary and draft generation use Gemini when `GEMINI_API_KEY` is set. Without it, the app falls back to the old heuristic templates.
- OAuth connections are also persisted in `.data/inbox.json` so `/api/inbox/sync/all` and webhook handlers can refresh tokens without an active browser session.
- The local app "cache" and persisted inbox state live in `.data/inbox.json`.
- Do not upload `.data/inbox.json` directly if you have connected a real inbox, because it may contain plaintext OAuth tokens in `connections`.
- A sanitized upload-safe copy can be created at `.data/inbox.upload.json`, with `accessToken` and `refreshToken` removed from all stored connections.
- The app can clear the local cache from the UI, or you can call `DELETE /api/inbox/cache` to wipe `.data/inbox.json` back to an empty store.
- Gmail requires `gmail.readonly`; Microsoft requires `Mail.Read` and `User.Read`. The configured providers request those scopes.
- Gmail sync explicitly merges `INBOX` and `SENT` thread IDs so outbound replies are included in the local thread model.
- Create provider subscriptions with `POST /api/inbox/subscriptions`; list them with `GET /api/inbox/subscriptions`.
- Trigger a bulk refresh for all stored connections with `POST /api/inbox/sync/all`.
- Gmail push lands at `/api/webhooks/google`; Microsoft Graph notifications land at `/api/webhooks/microsoft`.
- Gmail watch requires `GOOGLE_PUBSUB_TOPIC`. Microsoft Graph validation uses `MICROSOFT_WEBHOOK_URL`. Both webhook URLs must be publicly reachable in production.
- If you want to test sync before wiring OAuth in the UI, `POST /api/inbox/sync` also accepts an `accessToken` in the request body.
- Set `GEMINI_API_KEY` to enable real LLM output. `GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.
- Tokens are stored locally in plaintext in `.data/inbox.json` for this MVP. Move them into encrypted storage before production.
- Search is keyword-based today. The `/api/search` route is the right insertion point for embeddings or hybrid retrieval.
