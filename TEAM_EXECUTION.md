# Team Execution Plan v2 — AI Inbox Copilot Remediation

How to staff and run the work in `BUILD_SCRIPT.md`. The build script is the *what*; this is the *who, when, and how*.

> **Reading order**: `REMEDIATION_PLAN.md` (strategy + tech choices) → `BUILD_SCRIPT.md` (step-by-step instructions, v2) → this doc (team execution, v2).

> **What changed in v2**: phases renumbered (1 Baseline / 2 Foundation / 3 Data Contract / 4 Persistence / 5 Reliability / 6 Coverage / 7 Polish / 8 Roadmap); waves restructured to match; OpenTelemetry moved to Phase 8; D4 hard-gates SSE wiring (Phase 7.1) and contrast-CI (Phase 6.4); Phase 3 (Data Contract) is the new collaborative-decisions session that replaces the old Phase-0 decisions block.

---

## Team Shape

Recommended: **5 people** — 1 tech lead + 4 engineers. Scales down to 3 (collapse Frontend and Quality into one engineer) or up to 6+ (split test work by route family).

| Role | Owns | Why this split |
| --- | --- | --- |
| **TL** | Architecture, security-sensitive code, all reviews, D-decisions, unblocking, weekly demo | Single decision-maker on cross-cutting concerns; writes the highest-risk PRs personally |
| **Engineer A — Platform** | Postgres/Drizzle, Docker, infra, env vars, migration runner | Owns shared files (`package.json`, `.env.example`, `Dockerfile`) to prevent merge churn |
| **Engineer B — Reliability** | Logger, scheduler, reminders, rate limiting, webhook business logic, roadmap renewals | Backend depth; sequenced after A's schema lands |
| **Engineer C — Frontend** | SSE wiring, UI consolidation, OpenAPI viewer, design-facing docs | Almost no overlap with backend files |
| **Engineer D — Quality** | Test infra (Playwright, MSW, Vitest), CI workflow, Biome setup, schema tightening | Test files don't conflict; Biome/lint is centralized |

If you only have **3 engineers**: TL + A + B + (C∪D) — Frontend & Quality combine, Wave 3 stretches one extra week.

If you have **6+**: split Engineer D into D1 (route tests) and D2 (lib + contrast tests); add Engineer E for docs (Phase 7.4) and OpenAPI registration grunt work.

---

## Workstream Ownership

| Stream | Owner | Phases (from `BUILD_SCRIPT.md` v2) | Files mostly owned |
| --- | --- | --- | --- |
| Platform | A | 1.x (baseline), 2.1 (env), 3.3 (StorageDriver interface), 4.x (Persistence), 7.4 (postgres-runbook), Phase 8 (OTel + Gmail watch) | `package.json`, `.env.example`, `db/`, `migrations/`, `Dockerfile`, `scripts/migrate.mjs`, `instrumentation.ts` |
| Reliability | B | 2.2 (Pino + silent catches), 5.x (scheduler + rate limit), 6.5 (schema tightening — reminder paths) | `lib/logger.ts`, `lib/scheduler.ts`, `lib/rate-limit.ts`, `lib/db/*-driver.ts` (mutation methods), `middleware.ts` |
| Frontend | C | 3.2 (reminder UI surface review), 7.1 (SSE), 7.2 (UI consolidation), 7.3 (OpenAPI viewer) | `components/**`, `hooks/**`, `app/api-docs/**`, `app/inbox/**` |
| Quality | D | 2.3 (Biome + lint CI), 6.x (test infra + route tests + contrast in CI) | `tests/**`, `lib/__tests__/**`, `vitest.config.ts`, `vitest.setup.ts`, `biome.json`, `.github/workflows/ci.yml` |
| Security / Auth | TL | 2.4 (jose webhook rewrite), 3.1 (decision facilitation), webhook test review, 7.4 (encryption-key.md) | `app/api/webhooks/**`, `lib/crypto.ts`, `docs/encryption-key.md`, `docs/decisions.md` |

---

## Wave Plan

Three waves of 1–1.5 weeks each. Each wave ends with a green build and a 20-minute demo.

### Wave 1 — Baseline + Foundation (Week 1)

**Goal**: `npm test` actually passes; foundation merged; CI runs lint + typecheck + tests on every PR. No runtime behavior changes (apart from logging).

Mostly serial because of shared-file collisions; parallel where it doesn't conflict.

| Order | PR | Owner | Reviewer | Blocks |
| --- | --- | --- | --- | --- |
| 1 | Phase 1 (Baseline Fix — vitest exclude, Playwright install, split scripts) | A | TL | Everything (every later phase's "Verify" assumes `npm test` is green) |
| 2 | Phase 2.1 + 2.2 bundled (env + Pino + silent catches) | A (env) and B (Pino) — can co-author or split into two PRs | TL | Phase 2.4, all logging in later phases |
| 3 | Phase 2.4 (`jose` webhook rewrite) | TL (with B pairing) | A | Webhook integration tests (Phase 6) |
| 4 | Phase 2.3 (Biome + lint in CI) | D | TL | Lints all later code; lands last in Wave 1 to avoid re-format churn |

**Parallel non-conflicting work**: C drafts `docs/encryption-key.md` and `docs/troubleshooting.md` (Phase 7.4) — those files don't exist yet, zero merge risk. C also surveys both inbox UIs and prepares a one-pager for the Phase-3 D4 decision.

**Wave 1 done when**:
- `npm run lint && npm run typecheck && npm test && npm run build` all pass on `main`.
- A malformed Pub/Sub push to `/api/webhooks/google` returns 401 and emits a `logger.warn` line with a `JOSEError` code.
- CI on `main` shows three green steps: `Lint`, `Typecheck`, `Unit tests` (and `Docker build`).

### Wave 2 — Data Contract + Persistence (Weeks 2–2.5)

**Goal**: every cross-cutting decision is written down once; Postgres path works end-to-end behind `DATABASE_URL` (JSON path still works without it).

Wave 2 starts with a **single 60-minute decisions session** (TL + A + B + C + design rep + ops rep) to resolve D2–D6 in one sitting. Output: a complete `docs/decisions.md` and the locked Reminder data-model contract from Phase 3.2. Without that artifact, Phase 4 cannot start.

| Stream | PRs | Notes |
| --- | --- | --- |
| All hands | Phase 3.1 (decisions) + 3.2 (reminder contract) + 3.4 (README link) — bundled, doc-only PR | TL drives the session; Engineer A authors the doc |
| Platform (A) | Phase 3.3 (`lib/db/driver.ts` interface) → Phase 4.1–4.4 (install, schema, migration files, programmatic `migrate.mjs`) → **Phase 4.5 (PR-A: read driver)** → **Phase 4.6 (PR-B: write driver)** → 4.7 import script → 4.8 Dockerfile | The driver refactor is the biggest single change. Splitting reads (PR-A) and writes (PR-B) halves review burden and revert blast radius. |
| Reliability (B) | Waits for Phase 3 to lock the reminder contract; then prepares Phase 5.1 against the locked schema (no new files merged in Wave 2 — kept as a draft branch ready to merge in Wave 3) | B reviews PR-A and PR-B since `listDueReminders`, `markReminderDelivered`, `recordDeliveryFailure` will be called by 5.1 |
| Frontend (C) | Phase 7.2 (UI consolidation per D4 — now safe to do because D4 is locked) | Independent of backend |
| Quality (D) | Phase 6.1–6.3 (MSW + canonical reminder test) + Phase 6.5 schema tightening for the `reminders` and `inbox/cache` routes | Lands the test pattern; Wave 3 fans out remaining route tests |

**Wave 2 done when**:
- `docs/decisions.md` exists with D1–D6 resolved (D7 deferred, D8 deferred).
- With `DATABASE_URL` set against staging Postgres: sync writes to Postgres, reminder CRUD works, switching back to JSON (unset `DATABASE_URL`) still works.
- The canonical UI is the only one in `components/` (the other has been deleted).
- `tests/api/reminders.test.ts` runs in CI and passes.

### Wave 3 — Reliability + Coverage + Polish (Weeks 3–3.5)

**Goal**: reminders deliver via email; rate limiting on; tests cover all routes; OpenAPI docs render; ship-ready.

| Stream | PRs | Notes |
| --- | --- | --- |
| Platform (A) | Phase 4.7 import script (if not done in Wave 2); 7.4 `postgres-runbook.md`; ramp into Phase 8 (Gmail watch renewal) if time permits | Independent of others |
| Reliability (B) | Phase 5.1 (scheduler + Resend) merged on Day 1 of Wave 3; then Phase 5.2 (rate limit) | B and any A-OTel-spike both touch `middleware.ts` — TL serializes the queue |
| Frontend (C) | Phase 7.1 (SSE wiring — now safe because D4 is locked); Phase 7.3 (OpenAPI + Scalar at `/api-docs`) | 7.3 reuses Zod schemas D is also touching for tightening — coordinate via TL |
| Quality (D) | Phase 6.4 route-tests blitz (split by route family — health, inbox, threads, reminders-id, search, webhooks); Phase 6.4 contrast-CI workflow (now safe because D4 is locked); Phase 6.5 remaining schema tightening; Phase 6.5 D8 (Zod 4) if pulled forward | Within D's scope, route tests parallelize as sub-tasks |
| TL | Final verification (`BUILD_SCRIPT.md` Final Verification block); release notes; on-call doc; retro scheduling | — |

**Wave 3 done when**:
- The "Final Verification" block at the bottom of `BUILD_SCRIPT.md` passes from a clean clone.
- A reminder created with `dueAt = now + 90s` is delivered to the recipient within 2 minutes on staging.
- CI is green on `main` for 24 hours of merges.
- `/api-docs` renders the Scalar viewer with all routes registered.

---

## Decision Ownership

| Decision | Resolver | Deadline | Cost of getting wrong |
| --- | --- | --- | --- |
| D1 (Biome vs ESLint) | TL + D | Day 1 of Wave 1 (before Phase 2.3) | Low — one-day swap |
| D2 (email provider) | TL + B + product | Wave 2 decisions session (Phase 3) | Medium — vendor cost & deliverability |
| D3 (reminder recipient) | TL + B | Wave 2 decisions session (Phase 3) | Medium — schema migration if reversed |
| D4 (canonical inbox UI) | TL + C + design | Wave 2 decisions session (Phase 3) | Medium — visual regression risk; **hard-gates SSE & contrast-CI** |
| D5 (Postgres-only vs JSON dual) | TL + A | Wave 2 decisions session (Phase 3) | High — affects test infra and rollout |
| D6 (Postgres host) | TL + ops | Wave 2 decisions session (Phase 3) | Low — easy to switch later |
| D7 (tracing backend) | TL + ops | Phase 8 (deferred) | Low — feature is opt-in |
| D8 (Zod 3 → 4) | TL + D | Phase 6.5 (in Wave 3) | Low — mechanical |

---

## Risk Hotspots

Five places where a bad PR could silently break production. Treat each with extra care.

1. **`lib/db.ts` driver refactor (Phase 4.5/4.6)** — biggest blast radius. Split into PR-A (reads) and PR-B (writes). A pairs with B since B's reminder code depends on the new methods. The `DATABASE_URL` env var is the implicit feature flag — JSON mode keeps working in dev throughout.
2. **`jose` webhook rewrite (Phase 2.4)** — security-critical. TL writes; B reviews; the same PR adds an integration test that signs a JWT with a local key and serves a matching JWKS via MSW. Manual smoke against real Pub/Sub before merge. **Rollback noted in BUILD_SCRIPT § Phase 2 Rollback.**
3. **`middleware.ts` collisions** — three streams could touch it (Phase 5.2 rate limit, Phase 8 OTel request-id, existing auth). Rule: **one open PR against `middleware.ts` at a time**. TL maintains the queue in the channel.
4. **`package.json` + `.env.example`** — high merge-conflict risk because every stream adds deps/vars. A owns both. Engineers send dep names + env vars to A in their PR descriptions; A batches them into the bundled PRs in Waves 1 and 2.
5. **Test data drift (Phase 6)** — MSW handlers rot when external APIs change. D owns the single source of truth at `tests/setup/msw.ts`; engineers extend rather than fork. Any new external HTTP call in production code requires a matching MSW handler in the same PR.

---

## Cadence

- **Async daily** (written, in a channel) — what merged, what's blocked, what's next. No daily meeting.
- **Wave-2 decisions session** (60 min, start of Week 2) — one and only one all-hands meeting; output is `docs/decisions.md`.
- **Twice-weekly 30-min sync** (Mon + Thu) — blockers and cross-stream coordination only. If there's nothing to coordinate, cancel.
- **End-of-wave demo** (Fri of each wave) — 20 min, run the wave's verification commands live in front of the team. Anyone outside the team is welcome.
- **Code review SLO**: 4 business hours for PRs <300 LOC; 1 business day for larger. TL is on every PR; one peer reviewer required before merge.
- **Branch strategy**: short-lived `chore/phase-N.M-stream-task` branches off `main` (e.g. `chore/phase-4.5-pg-driver-reads`). No long-lived feature branches. Wave plan keeps PRs small enough to merge in 1–3 days each.
- **Decision log**: `docs/decisions.md` is the source of truth — append a one-line entry whenever a D-decision is resolved or a hotspot tradeoff is made. Future contributors will thank you.

---

## Definition of Done

Two layers — per PR (every merge), and per phase (gates the next phase).

### Per PR

A PR is mergeable when **all** are true:

1. CI green: lint + typecheck + tests + Docker build.
2. New behavior covered by at least one test, **or** the PR body says "doc-only / config-only" with a one-sentence justification.
3. `.env.example` and README updated if any user-facing surface changed.
4. The verification command from the corresponding `BUILD_SCRIPT.md` step has been run locally and pasted in the PR description.
5. Two approvals (TL + 1 peer) before merge.
6. Linked back to the `BUILD_SCRIPT.md` step (e.g., "Implements Phase 4.5 (driver reads).").

### Per phase

Each phase has a Definition of Done block in `BUILD_SCRIPT.md`. **The next phase cannot start until the current phase's DoD is met on `main`.** TL signs off.

---

## Kickoff Checklist (Day 1)

Before the team writes any code, the TL completes:

- [ ] Resolve D1 (lint tool — needed for Phase 2.3 in Wave 1).
- [ ] Confirm 🔑 PREREQs from BUILD_SCRIPT.md: Resend account decision (if D2 = Resend, get keys ready before Wave 3), Postgres connection string (per D6, ready before Wave 2 decisions session).
- [ ] Schedule the Wave-2 decisions session (60 min, mid-Week 2).
- [ ] Schedule the two weekly syncs and the three end-of-wave demos.
- [ ] Open the standing channel; pin links to `REMEDIATION_PLAN.md`, `BUILD_SCRIPT.md` v2, this file, and (once it exists) `docs/decisions.md`.
- [ ] Assign engineers to streams (above).
- [ ] Set CODEOWNERS to enforce TL review on `app/api/webhooks/**`, `lib/crypto.ts`, `middleware.ts`, `lib/db.ts`, `lib/db/**`, `db/**`, `migrations/**`, `scripts/migrate.mjs`, `docs/decisions.md`.

---

## When to Slip the Timeline (and What to Cut First)

The 3–4 week plan assumes no surprises. If you're behind by end of Wave 2, cut in this order — none of these block the production path:

1. **Phase 7.3 (OpenAPI + Scalar)** — nice-to-have; defer to a post-launch PR.
2. **Phase 8 items** — explicitly out of scope for this remediation (includes OTel, embeddings, Gmail watch renewal).
3. **Phase 6 lib tests for `oauth.ts` and `inbox-emitter.ts`** — small modules; defer if route tests are eating the time.
4. **Phase 6.5 D8 (Zod 4)** — purely mechanical; defer to a post-launch PR.

What you must **not** cut:

- **Phase 1 (Baseline)** — every later phase assumes `npm test` is green.
- **Phase 2.4 (`jose` rewrite)** — security correctness.
- **Phase 3 (Data Contract)** — without it, Phases 4 and 5 drift into N reinterpretations.
- **Phase 4 (Persistence)** — unblocks every multi-user story.
- **Phase 5.1 (reminder delivery)** — the core feature was unfinished without it.
- **Phase 6.4 webhook tests** — webhook security regressions are silent.

---

## After Ship — Retrospective Template

15 minutes, the Friday after Wave 3 ships. Five questions, three minutes each:

1. Which decisions (D1–D8) would we resolve differently in hindsight?
2. Where did the wave plan slip, and what was the leading indicator we missed?
3. Which PR was hardest to review, and what would have made it easier?
4. What did `BUILD_SCRIPT.md` v2 get wrong (so v3, if there is one, gets it right)?
5. What follow-up work do we want to schedule before we forget? (Open `/schedule` candidates: Phase 8 items, Tailwind 4 upgrade, Anthropic SDK bump, Auth.js v5 GA tracking.)
