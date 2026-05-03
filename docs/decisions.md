# Architecture Decisions

The locked decisions that gate the remediation phases in `BUILD_SCRIPT.md`. Each row is one decision (D1–D8) with status, choice, and rationale. Any line marked **PROPOSED** is the team's current recommendation but still needs stakeholder sign-off before implementation begins.

| ID | Date | Status | Decision | Rationale |
| --- | --- | --- | --- | --- |
| D1 | 2026-05-02 | RESOLVED | Defer Biome v2 introduction until the working tree is clean of uncommitted changes; keep "Biome v2" as the chosen tool when it lands. | A `biome check --write .` pass against the current branch would re-format every file the user has touched in the working tree. Run it on a clean branch, in its own PR, to keep the diff reviewable. |
| D2 | 2026-05-02 | RESOLVED | Email reminders via **Resend**. | Modern transactional API; React-email templating available later. PREREQ before Phase 5.1: verified sending domain + `RESEND_API_KEY`. |
| D3 | 2026-05-02 | RESOLVED | Reminders carry a required `email` field for the recipient. | Future-proofs multi-user. Schema additions land in Phase 5.1 per the Reminder Data Model contract below. |
| D4 | 2026-05-02 | RESOLVED | Canonical inbox UI: **`components/inbox/InboxView.tsx`**. Delete `components/dashboard.tsx` and its companion `components/{thread-detail,thread-list,reminder-panels,sidebar-panels,draft-panel,hero-section}.tsx` once nothing imports them. | `app/page.tsx` currently redirects to `/inbox`, and `app/inbox/page.tsx` renders `<InboxView />`. `Dashboard` is no longer reachable through a route; keeping it invites drift and breaks the "one inbox UI" rule from the plan. Delete in Phase 7.2. |
| D5 | 2026-05-02 | RESOLVED | Keep JSON store as a permanent dev fallback (toggled by `DATABASE_URL`). | Preserves the local-first dev loop; Postgres opt-in for prod. |
| D6 | 2026-05-02 | RESOLVED | Managed Postgres via **Neon** in prod; Postgres 16 in `docker-compose.yml` for local. | Neon's free tier matches a single-container app; a local Postgres in compose keeps `npm run dev` self-sufficient for contributors. |
| D7 | DEFERRED | DEFERRED | OpenTelemetry tracing — skip for MVP. | Pino structured logs cover MVP observability. Revisit in Phase 8 once a tracing backend (Tempo/Honeycomb/Datadog) is provisioned. |
| D8 | DEFERRED | DEFERRED | Zod 3 → 4 upgrade. | Mechanical change (`z.string().email()` → `z.email()`, `z.string().datetime()` → `z.iso.datetime()`); defer to Phase 6.5. |

## Reminder Data Model (locked Phase 3)

The `Reminder` entity gains four fields to support delivery in Phase 5.1:

| Field | Type | Required | Default | Reason |
| --- | --- | --- | --- | --- |
| `email` | string (email) | yes | — | Recipient for delivery (D3) |
| `deliveredAt` | ISO timestamp | no | null | Set when scheduler successfully sends |
| `deliveryAttempts` | integer | no | 0 | Retry counter; capped at `MAX_ATTEMPTS` |
| `lastDeliveryError` | string | no | null | Last failure message for debugging |

### Surfaces affected (every one must be updated atomically in Phase 4)

1. `lib/types.ts` — `Reminder` interface gains the four fields.
2. `lib/schemas.ts` — `ReminderCreateSchema` gains required `email`.
3. JSON store seed reminder (`lib/db.ts:84-92`) — gains `email: "you@example.com"`.
4. JSON store on-disk migration: a one-time read-modify-write on first boot to backfill `email` (use the only connection's email; if none, drop the reminder with a `logger.warn`).
5. Postgres schema (`db/schema.ts`) — table mirrors the four columns with `NOT NULL` on `email`, default `0` on `deliveryAttempts`.
6. `app/api/reminders/route.ts` (POST) — pass `email` through; reject body without it (Zod handles).
7. UI form (`components/inbox/InboxView.tsx` per D4) — add `email` input, default-fill from `session.user.email`.
8. Tests — fixtures include `email`.
9. Import script (`scripts/import-json-to-postgres.ts`) — handle legacy reminders missing `email` (skip with `logger.warn` or backfill from connection).

## How to use this document

1. When you resolve a **PROPOSED** decision, change its status to **RESOLVED**, set the date to today, and tighten the choice column ("Resend" → "Resend, sending domain `notify.example.com`", etc.).
2. Add a row when a new cross-cutting decision comes up. Don't bury one inside a PR description.
3. Decisions with `DEFERRED` status are tracked here so future contributors can find the trail; promote to `RESOLVED` when the time comes.
