# AI Inbox Copilot — Remediation Plan

A concrete plan to close the gaps identified in the project audit, using **current stable** technology (as of early 2026). Where the project already uses a modern choice, we keep it. Where it uses something outdated, beta, or missing, we upgrade.

---

## Current Stack Snapshot

| Layer | Today | Status |
| --- | --- | --- |
| Framework | Next.js 15.5 + React 19 (App Router) | ✅ current |
| Language | TypeScript 5.8 | ✅ current |
| Auth | next-auth `5.0.0-beta.25` | 🟡 beta — **stay on v5 beta**; bump within beta carefully; track GA but don't block on it (v5 has been beta-stable for an extended period and is actively maintained) |
| Validation | Zod 3.24 | ⚠️ behind — upgrade to **Zod 4** (stable, breaking changes are minor for our usage) |
| LLM SDK | `@anthropic-ai/sdk ^0.37` | ⚠️ behind — bump to latest minor |
| Test runner | Vitest 2.1 | ✅ current |
| Styling | Tailwind 3.4 | ⚠️ Tailwind 4 is stable; upgrade is non-trivial — defer |
| Storage | `.data/inbox.json` | ❌ not production-grade — see Gap 2 |
| Lint | none | ❌ — see Gap 13 |
| Logging | `console.*` | ❌ — see Gap 7/8 |
| Runtime | Node 20-alpine in Docker | ✅ current LTS (Node 22 LTS optional, both fine) |

---

## Tech Decisions At a Glance

| Concern | Choice | Why this, not the alternatives |
| --- | --- | --- |
| Scheduler (reminders, watch renewal) | **`node-cron`** in-process, escalation path to **BullMQ + Redis** | Single-container deployment doesn't need a queue. `node-cron` is tiny, maintained, and matches the JSON-file storage model. BullMQ is the modern Node queue when you need multi-instance / retries / DLQs. Avoid `agenda` (stagnant). |
| Email delivery (reminders, alerts) | **Resend** (preferred) or **AWS SES** | Resend is the modern transactional API with React-email templating. SES if you're already on AWS. Avoid SendGrid (acquisition uncertainty) and Mailgun (older API). |
| Postgres ORM + migrations | **Drizzle ORM** + `drizzle-kit` + `postgres` driver | TypeScript-first, generates SQL you can read, lightweight, migrations are real `.sql` files. Prisma works but is heavier and has a Rust binary. Avoid TypeORM (legacy). |
| Logging | **Pino** | Fastest structured logger in Node, JSON-by-default, low overhead, large ecosystem. Winston is older and slower. Avoid `bunyan` (unmaintained). |
| JWT / JWK handling | **`jose`** | Node-native, modern, types include `JWK` properly. Replaces hand-rolled `crypto.createPublicKey({ format: "jwk" })` and avoids `jsonwebtoken` (older, no native JWK). |
| Rate limiting | **`rate-limiter-flexible`** (in-memory or Redis backend) | Works in self-hosted Docker without locking you into Upstash. Switch backend to Redis when you scale beyond one instance. |
| Tracing / metrics (roadmap, **deferred to Phase 8**) | **OpenTelemetry** (`@opentelemetry/api` + Node SDK) | Vendor-neutral standard when you turn it on. For the MVP, structured Pino logs cover observability needs; turn OTel on once a tracing backend (Tempo, Jaeger, Honeycomb, Datadog, etc.) is provisioned. Avoid proprietary-first SDKs. |
| HTTP mocking in tests | **MSW v2** | Intercepts at the request layer, works with `fetch`, supports Node + browser. Avoid `nock` (older, fetch support is awkward). |
| Lint + format | **Biome v1.9+** (single tool) — *or* ESLint v9 + Prettier 3 if you want the established stack | Biome is one binary, Rust-fast, replaces ESLint+Prettier for ~95% of rules. Next.js 15 still ships ESLint config; either is defensible. |
| API documentation | **`zod-to-openapi`** + **Scalar** UI | Generate OpenAPI 3.1 from the Zod schemas you already have, serve interactive docs with Scalar (modern Swagger-UI replacement). |
| Embeddings (roadmap) | **pgvector** + **Voyage AI** embeddings | pgvector is now the de-facto standard, included in major Postgres hosts. Voyage AI is Anthropic-recommended; OpenAI `text-embedding-3-small` is a fine alternative. Avoid bolting on a separate vector DB before pgvector is exhausted. |

---

## Gap 1 — Reminder Delivery

**Problem.** `app/api/reminders/*` stores reminders. Nothing fires at `dueAt`.

**Tech.** `node-cron` (scheduling) + Resend (`resend` npm package) (email).

**Implementation.**
1. `npm i node-cron resend` and `npm i -D @types/node-cron`.
2. New file `lib/scheduler.ts`:
   - Export `startScheduler()` that runs every minute via `cron.schedule("* * * * *", tick)`.
   - `tick()` queries `lib/db.ts` for reminders where `dueAt <= now() && !deliveredAt`.
   - For each due reminder, send via `resend.emails.send(...)`, then `markDelivered(id, sentAt)`.
3. New `lib/db.ts` field on `Reminder`: `deliveredAt?: string`. Add `markReminderDelivered(id)`.
4. Boot the scheduler from `instrumentation.ts` (Next.js 15 supports `register()` for one-time process init):
   ```ts
   // instrumentation.ts
   export async function register() {
     if (process.env.NEXT_RUNTIME === "nodejs") {
       const { startScheduler } = await import("./lib/scheduler");
       startScheduler();
     }
   }
   ```
5. Env vars added to `.env.example`: `RESEND_API_KEY`, `REMINDER_FROM_ADDRESS`.
6. **Multi-instance escalation:** if you ever run >1 container, replace `node-cron` with **BullMQ** (`bullmq` + Redis) so only one worker fires each reminder. Until then, in-process is correct.

**Files touched:** `lib/scheduler.ts` (new), `lib/db.ts`, `instrumentation.ts` (new), `.env.example`, `package.json`.

---

## Gap 2 — Migrations Are Orphaned (and Storage Is a JSON File)

**Problem.** `migrations/*.sql` exist with no runner. `.data/inbox.json` is the real store. Not viable past one user.

**Tech.** **Drizzle ORM** + `drizzle-kit` + `postgres` (driver) + Postgres 16+.

**Why Drizzle.** Generates plain SQL migrations (you can read and edit them), the schema lives in TypeScript, queries return inferred types end-to-end, no Rust binary, no separate engine process. Prisma is a fine alternative if your team prefers a higher-level DSL — but Drizzle is the modern lightweight pick.

**Implementation.**
1. `npm i drizzle-orm postgres` and `npm i -D drizzle-kit`.
2. New `db/schema.ts` with tables for `connections`, `threads`, `messages`, `reminders`, `webhook_events` — mirroring the shapes already in `lib/types.ts`.
3. New `drizzle.config.ts` pointing at `db/schema.ts`, output dir `migrations/`.
4. Drop the two hand-written SQL files (or fold their intent into the generated baseline).
5. New `db/client.ts` exporting a `postgres()` connection + `drizzle()` instance.
6. **Refactor `lib/db.ts` behind a storage interface**:
   ```ts
   // lib/db.ts becomes a thin facade
   const driver = process.env.DATABASE_URL ? pgDriver : jsonDriver;
   ```
   - Keep the JSON driver for local dev / no-DB mode.
   - Add `pgDriver` that uses Drizzle queries.
   - All call sites (`app/api/**`) keep importing the same functions.
7. Migration commands: `drizzle-kit generate`, `drizzle-kit migrate`. Wire into `package.json`:
   ```json
   "db:generate": "drizzle-kit generate",
   "db:migrate": "drizzle-kit migrate",
   "db:studio": "drizzle-kit studio"
   ```
8. Dockerfile: run `db:migrate` on container start (entrypoint script) when `DATABASE_URL` is set.

**Files touched:** `db/` (new dir), `lib/db.ts`, `migrations/` (regenerated), `drizzle.config.ts` (new), `Dockerfile`, `.env.example`.

---

## Gap 3 — Missing Dev Dependencies

**Problem.** `package.json` references `concurrently` and `wait-on` in `test:contrast:ci` but neither is installed.

**Fix.** `npm i -D concurrently wait-on`. Both packages are stable, widely used, no modern replacement needed.

---

## Gap 4 — Missing Env Vars in `.env.example`

**Problem.** `lib/copilot.ts` reads `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` but they're not in `.env.example`.

**Fix.** Add to `.env.example`:
```
# Optional — enables Claude-backed copilot. Falls back to Gemini, then heuristics.
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6
```
While editing the file, also add the new vars introduced by other gaps in this plan: `RESEND_API_KEY`, `REMINDER_FROM_ADDRESS`, `DATABASE_URL`, `REDIS_URL` (if BullMQ), `RATE_LIMIT_REDIS_URL` (optional), `OTEL_EXPORTER_OTLP_ENDPOINT` (optional).

---

## Gap 5 + 6 — Missing API Route and Lib Tests

**Tech.** Vitest (already there) + **MSW v2** for mocking Gmail / Anthropic / Microsoft Graph.

**Implementation.**
1. `npm i -D msw@^2`.
2. `tests/setup/msw.ts` — declare handlers for `googleapis.com`, `graph.microsoft.com`, `api.anthropic.com`, `generativelanguage.googleapis.com`.
3. New test files mirroring `app/api/**`:
   - `tests/api/health.test.ts`
   - `tests/api/inbox-sync.test.ts`
   - `tests/api/threads-summary.test.ts`
   - `tests/api/threads-draft.test.ts`
   - `tests/api/threads-draft-revise.test.ts`
   - `tests/api/reminders.test.ts`
   - `tests/api/search.test.ts`
   - `tests/api/webhooks-google.test.ts` — include a JWT verification round-trip
   - `tests/api/webhooks-microsoft.test.ts` — include validation token + clientState path
   - `tests/api/inbox-stream.test.ts` — assert SSE headers + ping
4. App Router routes export `GET`/`POST` etc. — call them directly:
   ```ts
   import { POST } from "@/app/api/reminders/route";
   const res = await POST(new Request("http://x", { method: "POST", body: JSON.stringify({...}) }));
   expect(res.status).toBe(200);
   ```
5. Lib tests: `lib/__tests__/api.test.ts`, `auth.test.ts`, `connections.test.ts`, `oauth.test.ts`, `inbox-emitter.test.ts`, `schemas.test.ts`.
6. CI: existing workflow already runs `vitest run` — these are picked up automatically.

---

## Gap 7 + 8 — Silent Error Handling

**Tech.** **Pino** (`pino` + `pino-pretty` for dev).

**Implementation.**
1. `npm i pino` and `npm i -D pino-pretty`.
2. New `lib/logger.ts`:
   ```ts
   import pino from "pino";
   export const logger = pino({
     level: process.env.LOG_LEVEL ?? "info",
     transport: process.env.NODE_ENV === "development"
       ? { target: "pino-pretty" }
       : undefined,
   });
   ```
3. Replace silent catches:
   - `app/api/webhooks/google/route.ts:80, 105, 120` — `catch (err) { logger.warn({ err }, "jwt verification step failed"); return false; }`
   - `lib/db.ts:34-36` — `.catch((err) => logger.error({ err }, "write queue failure"))`
4. Replace any remaining `console.*` in production paths with `logger.*`.

---

## Gap 9 — Unsafe JWT/JWK Cast

**Problem.** `app/api/webhooks/google/route.ts:54` — `jwk as unknown as NodeJsonWebKey`.

**Tech.** **`jose`** library — Node-native, fully typed.

**Implementation.**
1. `npm i jose`.
2. Rewrite the JWKS fetch + verification using `createRemoteJWKSet` and `jwtVerify`:
   ```ts
   import { createRemoteJWKSet, jwtVerify } from "jose";
   const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
   const { payload } = await jwtVerify(token, JWKS, {
     issuer: ["accounts.google.com", "https://accounts.google.com"],
     audience: process.env.GOOGLE_PUBSUB_AUDIENCE,
   });
   ```
3. Delete the hand-rolled JWKS cache and `crypto.createPublicKey` plumbing — `jose` handles caching and rotation.
4. Removes the unsafe cast and replaces ~80 lines of code with ~10.

---

## Gap 10 — No Rate Limiting / Tracing

**Rate limiting (in scope — Phase 5.2).**
- Tech: **`rate-limiter-flexible`** (works in-memory; switch to Redis when scaling).
- Implementation: `npm i rate-limiter-flexible`; new `lib/rate-limit.ts` with limiters per route class (auth: 10/min/IP; sync: 20/min/IP; search: 60/min/IP; default: 120/min/IP); apply in `middleware.ts` via `limiter.consume(ipKey(req))`.

**Tracing (DEFERRED to Phase 8 — roadmap).**
- Tech when turned on: **OpenTelemetry** (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`).
- Why deferred: structured Pino logs (Phase 2.2) cover MVP observability. OTel adds value only when a tracing backend (Tempo / Jaeger / Honeycomb / Datadog) is provisioned (D7).
- When ready: extend `instrumentation.ts` to start the OTel SDK in the Node runtime; add a `crypto.randomUUID()` request-id header in `middleware.ts` and propagate into the logger child; configure exporter via `OTEL_EXPORTER_OTLP_ENDPOINT`.

---

## Gap 11 — Unused `hooks/use-inbox-stream.ts`

**Decision required.** Either:
- **Wire it into `Dashboard`** to replace the polling-based sync loop with SSE — the `app/api/inbox/stream` endpoint is already implemented and emits `sync` events.
- **Delete** if the SSE direction was abandoned.

Recommendation: wire it up. The endpoint is in place and SSE is the right pattern here. Plan: modify `components/dashboard.tsx` to call `useInboxStream()` and trigger `refreshInbox()` on each event, in addition to (or replacing) the current polling.

---

## Gap 12 — Two Inbox UIs

**Decision required.** `components/inbox/InboxView.tsx` vs. `components/dashboard.tsx` (used by `app/inbox/page.tsx`).

Recommendation: pick one as canonical, delete the other in the same PR — keeping both invites drift. No new tech needed.

---

## Gap 13 — No Lint Step

**Tech.** **Biome v1.9+** (recommended) or ESLint v9 + Prettier 3.

**Why Biome.** One binary, one config (`biome.json`), Rust-fast, formats and lints in one pass, replaces ~95% of ESLint+Prettier for a project this size. The remaining 5% (e.g., a few ecosystem-specific rules) is rarely worth the dual-tool overhead.

**Implementation (Biome path).**
1. `npm i -D --save-exact @biomejs/biome`.
2. `npx biome init` → tweak `biome.json` (enable `recommended`, set indent style, configure `files.ignore` for `.next`, `node_modules`, `migrations`, `.data`).
3. Add scripts:
   ```json
   "lint": "biome check .",
   "lint:fix": "biome check --write ."
   ```
4. CI: add `npm run lint` step to `.github/workflows/ci.yml` before tests.

**Implementation (ESLint path, if preferred).**
1. `npm i -D eslint@^9 eslint-config-next prettier@^3`.
2. Use the Next.js flat config preset, layer Prettier on top via `eslint-config-prettier`.
3. Same scripts and CI step.

---

## Gap 14 — Contrast Tests Excluded from CI

**Fix.** Add a Playwright job to `.github/workflows/ci.yml`:
```yaml
contrast:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: npm }
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:contrast:ci
```
This depends on Gap 3 being done (`concurrently`/`wait-on` installed).

---

## Gap 15 — Missing Schema Validation on a Few Routes

**No new tech.** Extend the existing `lib/schemas.ts` (Zod) usage:
- `DELETE /api/reminders/[id]` — add a `z.string().uuid()` check on the path param.
- `DELETE /api/inbox/cache` — add a confirmation body schema (`{ confirm: z.literal(true) }`) to prevent accidental wipes.
- `POST /api/threads/[id]/summary` — even if no body, validate path param and (optional) `force: z.boolean()` for cache bust.

While editing, **upgrade Zod to v4** (`npm i zod@^4`). The breaking changes that affect this codebase: `z.string().email()` → `z.email()`, `z.preprocess` signature tweaks. Both are mechanical.

---

## Gaps 16–20 — Documentation

Create a `docs/` directory with focused pages, linked from README:

- `docs/microsoft-entra-setup.md` — register an app in Entra, scopes (`Mail.Read`, `offline_access`, `User.Read`), redirect URI, secret/cert, env vars (`MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`).
- `docs/postgres-runbook.md` — generating the `DATABASE_URL`, `npm run db:migrate`, `db:studio` for inspection, switching from JSON mode (set `DATABASE_URL`, run an import script), backup/restore basics. Recommend **Neon** or **Supabase** for managed Postgres if not self-hosting.
- `docs/encryption-key.md` — generating a key (`openssl rand -base64 32`), setting `ENCRYPTION_KEY`, what rotation breaks, a sketch of a rotate-and-reencrypt script.
- `docs/troubleshooting.md` — Gmail watch expires every 7 days (link to Gap-roadmap renewal job), refresh token failures, webhook signature failures, SSE proxy buffering, common Resend deliverability issues.
- `docs/api-reference.md` — auto-generated. See Gap 21 below.

---

## Gap 21 (added) — Generated API Reference

**Tech.** **`zod-to-openapi`** (or `@asteasolutions/zod-to-openapi`) → emit OpenAPI 3.1 → render with **Scalar** (`@scalar/api-reference-react`).

**Implementation.**
1. `npm i @asteasolutions/zod-to-openapi @scalar/api-reference-react`.
2. New `lib/openapi.ts` — register each route's schemas (extend the existing `lib/schemas.ts`) and export an OpenAPI document.
3. New `app/api/openapi/route.ts` — `GET` returns the generated JSON.
4. New `app/api-docs/page.tsx` — renders Scalar against `/api/openapi`.
5. README link: "API reference: `/api-docs` when running locally."

---

## Roadmap Items (deferred per current README)

These are not bugs — note here for completeness so you know the modern stack when you do them.

| Item | Recommended tech |
| --- | --- |
| Search → embeddings/hybrid retrieval | **pgvector** (Postgres extension) + **Voyage AI `voyage-3`** embeddings (Anthropic-recommended). Hybrid: keep current keyword search, add vector ANN, blend scores. Works naturally once Gap 2 lands Postgres. |
| Microsoft Graph UI surface | No new tech — reuse existing UI components, add provider toggle on the Connect screen. |
| Encryption key rotation | One-shot script `scripts/rotate-encryption-key.ts` that reads with old key, re-encrypts with new key, writes back atomically. Schedule via the same `node-cron` infra from Gap 1 if you want periodic rotation. |
| Gmail watch lifecycle | `node-cron` job that re-`watch`-es every 6 days for any `connections` row whose `watchExpiry` is within 24h. Same scheduler as Gap 1. |

---

## Suggested Execution Order (matches `BUILD_SCRIPT.md` v2)

8 phases, ordered so each ships independently and the next phase has solid ground to stand on.

**Phase 1 — Baseline Fix.** Make `npm test` actually pass: exclude `tests/contrast/**` from Vitest, install `@playwright/test`, split test scripts. Without this, every later "Verify" step is a lie.

**Phase 2 — Foundation.**
- Gap 4: fix `.env.example` (add `ANTHROPIC_MODEL` + new vars introduced by later phases).
- Gap 7/8: add Pino, replace silent catches.
- Gap 13: add Biome + lint script + CI step.
- Gap 9: replace JWT/JWK code with `jose` (rollback note in BUILD_SCRIPT).

**Phase 3 — Data Contract (decisions + interface, no runtime change).**
- Resolve D2–D6 in a single 60-min session; produce `docs/decisions.md`.
- Lock the Reminder data-model contract (every affected surface listed once).
- Define the `StorageDriver` TypeScript interface that Phase 4 will implement.

**Phase 4 — Persistence.**
- Gap 2: Drizzle schema + programmatic migration script (`scripts/migrate.mjs`, no `drizzle-kit` at runtime); JSON / Postgres dual driver behind `DATABASE_URL`. Two PRs: reads first, writes second.
- Phase 7.4 partial: `docs/postgres-runbook.md` lands alongside.

**Phase 5 — Reliability.**
- Gap 1: scheduler + reminder delivery (Resend) — uses the locked schema from Phase 3.
- Gap 10 (rate limiting only — tracing is Phase 8).

**Phase 6 — Coverage.**
- Gap 5/6: API + lib tests via Vitest + MSW.
- Gap 14: contrast tests in CI (HARD-GATED on D4).
- Gap 15: tighten Zod schemas; optional Zod 4 upgrade (D8).

**Phase 7 — Polish.**
- Gap 11: wire SSE hook (HARD-GATED on D4).
- Gap 12: delete the non-canonical inbox UI (D4).
- Gap 21: OpenAPI + Scalar.
- Gaps 16–20: remaining docs (Entra, encryption walkthrough, troubleshooting).

**Phase 8 — Roadmap (out of scope for the remediation ship).**
- OpenTelemetry tracing (D7).
- pgvector + Voyage embeddings.
- Microsoft Graph UI exposure.
- Encryption key rotation script.
- Gmail watch auto-renewal.

---

## Things Explicitly Out of Scope (and why)

- **Tailwind v3 → v4.** Stable, but the upgrade has breaking changes in the engine and config format. Defer until a UI-focused PR.
- **Anthropic SDK major bump.** Worth doing alongside any prompt-caching / extended-thinking work, not as a standalone churn PR.
- **Replacing `node-cron` with BullMQ pre-emptively.** Not needed at one container. Adds Redis as a hard dep.
- **Switching from `next-auth` to a different auth library.** Auth.js v5 is still in beta but actively maintained and beta-stable for an extended period; **stay on v5 beta** and bump within the beta line carefully — don't block on GA.
- **Adopting a UI component library (shadcn/ui, etc.).** A separate design decision, not a gap.
