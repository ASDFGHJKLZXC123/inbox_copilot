# Build Script v2 — AI Inbox Copilot Remediation

A step-by-step, copy-pasteable execution script for the remediation plan in `REMEDIATION_PLAN.md`. Each step lists exact commands, exact file changes (diffs or full files), a verification command, and (for risky phases) a rollback note. Decision points the user must answer are marked **⚠️ DECIDE**. External prerequisites are marked **🔑 PREREQ**.

> **What changed in v2** (vs. v1, based on review feedback): added Phase 1 Baseline Fix (the original baseline fails `npm test`); pulled out Phase 3 Data Contract so decisions and the storage interface are written down before Drizzle code is touched; replaced the broken `npx drizzle-kit migrate` Docker entrypoint with a programmatic `migrate()` script that runs without devDeps; moved OpenTelemetry to the roadmap (Phase 8); added per-phase Definition-of-Done blocks; added rollback notes for the three risky phases (jose, Persistence, Reminder delivery); softened Auth.js wording (stay on v5 beta).

> **How to use this script.** Read the **Decision Index** below and resolve every ⚠️ DECIDE *before* the phase that needs it. Then execute phases 1 → 7 in order. Each phase has a Definition of Done that gates merging the next.

---

## Decision Index

| ID | Question | Recommended | Resolved in | Required by |
| --- | --- | --- | --- | --- |
| D1 | **Lint tool**: Biome v2, or ESLint v9 + Prettier v3? | Biome v2 | Day 1 (before Phase 2.3) | Phase 2.3 |
| D2 | **Email provider for reminders**: Resend, AWS SES, or log-only (no email)? | Resend | Phase 3 | Phase 5.1 |
| D3 | **Reminder recipient**: (a) add `email` field to reminder; (b) email the only connection in the store; (c) global `REMINDER_TO_ADDRESS` env var? | (a) add `email` field — future-proofs multi-user | Phase 3 | Phase 4 (schema), Phase 5.1 |
| D4 | **Inbox UI**: keep `components/dashboard.tsx`, or `components/inbox/InboxView.tsx`? | Whichever is more recent — pick one and delete the other in same PR | Phase 3 | Phase 6.4 (contrast CI), Phase 7.1 (SSE), Phase 7.2 (cleanup) |
| D5 | **Storage cutover**: keep JSON as a permanent dev fallback (toggled by `DATABASE_URL`), or Postgres-only after Phase 4? | Keep JSON as fallback | Phase 3 | Phase 4 |
| D6 | **Postgres host**: Neon, Supabase, self-hosted, or local Docker? | Neon for managed; Postgres 16 in `docker-compose.yml` for local | Phase 3 | Phase 4 |
| D7 | **Tracing backend** (OpenTelemetry): Honeycomb / Tempo / Jaeger / Datadog / skip? | Skip for now — Pino logs cover MVP observability | Phase 8 (roadmap) | Phase 8 only |
| D8 | **Zod major upgrade** (3 → 4): now or defer? | Defer to Phase 6.5 | Phase 6 | Phase 6.5 |

🔑 **PREREQ if D2 = Resend**: create a Resend account, verify a sending domain, generate an API key.
🔑 **PREREQ for Phase 4**: a `DATABASE_URL` connection string for an empty Postgres 16+ database.

---

## Phase 1 — Baseline Fix

**Why this phase exists.** The current `npm test` fails: `vitest.config.ts:14` includes `**/*.test.ts`, which matches `tests/contrast/inbox-contrast.test.ts`, but `@playwright/test` is not installed. Vitest tries to import a Playwright test file and crashes. Every later phase's "Verify" step assumes `npm test` is green; this phase makes that assumption true.

### 1.1 — Exclude Playwright tests from Vitest

**Edit** `vitest.config.ts`:
```diff
   test: {
     environment: "node",
     globals: true,
     include: ["**/*.test.ts", "**/*.spec.ts"],
-    exclude: ["node_modules", ".next"]
+    exclude: ["node_modules", ".next", "tests/contrast/**"]
   }
```

### 1.2 — Install Playwright + missing test deps

```bash
npm i -D @playwright/test@^1 concurrently@^9 wait-on@^8
npx playwright install --with-deps chromium
```

### 1.3 — Split test scripts

**Edit** `package.json`:
```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "typecheck": "tsc --noEmit",
-    "test": "vitest run",
-    "test:watch": "vitest",
+    "test": "vitest run",
+    "test:watch": "vitest",
+    "test:unit": "vitest run lib",
+    "test:api": "vitest run tests/api --passWithNoTests",
     "test:contrast": "playwright test --config=tests/contrast/playwright.config.ts",
     "test:contrast:ci": "concurrently --kill-others --success first \"next dev\" \"wait-on http://localhost:3000 && npm run test:contrast\""
   }
```

> `test:api --passWithNoTests` is a stub for now; Phase 6 fills the directory.

### Definition of Done — Phase 1

1. `npm run typecheck` passes.
2. `npm test` passes (covers `lib/__tests__/**` only at this point; `tests/contrast/**` is excluded).
3. `npm run build` succeeds.
4. `npm run test:contrast` runs without "command not found" (Playwright installed); the contrast test itself may still fail until Phase 6.4 — that's acceptable.

### Phase 1 Rollback

Trivial: revert the three files (`vitest.config.ts`, `package.json`, `package-lock.json`).

---

## Phase 2 — Foundation

Four small, low-risk PRs. Each is ~10 minutes once D1 is decided. No runtime behavior changes except logging.

### 2.1 — Fix `.env.example`

**Diff**:
```diff
 # AI providers (at least one required for AI features)
 GEMINI_API_KEY=
 GEMINI_MODEL=gemini-2.5-flash
 ANTHROPIC_API_KEY=
+ANTHROPIC_MODEL=claude-sonnet-4-6
@@ end of file
+
+# Logging (optional)
+LOG_LEVEL=info
+
+# Postgres (optional; falls back to .data/inbox.json when unset)
+DATABASE_URL=
+
+# Reminder email delivery (optional; reminders are stored but not delivered without these)
+RESEND_API_KEY=
+REMINDER_FROM_ADDRESS=
+
+# OpenTelemetry (optional, see Phase 8)
+# OTEL_EXPORTER_OTLP_ENDPOINT=
+# OTEL_SERVICE_NAME=ai-inbox-copilot
```

**Verify** — every env var read by code appears in `.env.example`:
```bash
diff <(grep -oE '^[A-Z_]+' .env.example | sort -u) \
     <(grep -rEho 'process\.env\.[A-Z_]+' app lib providers middleware.ts \
       | sed 's/process\.env\.//' | sort -u)
# Lines printed only on the right are env vars read but not documented.
```

### 2.2 — Add Pino + replace silent catches

```bash
npm i pino@^9
npm i -D pino-pretty@^11
```

**New file** `lib/logger.ts`:
```ts
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: process.env.OTEL_SERVICE_NAME ?? "ai-inbox-copilot" },
  redact: {
    paths: [
      "*.accessToken",
      "*.refreshToken",
      "*.password",
      "headers.authorization",
      "headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[redacted]",
  },
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});
```

**Edit** `lib/db.ts:34-36` — replace the silent catch:
```diff
-    }).catch(() => {
-      // Prevent unhandled rejection from breaking the queue
-    });
+    }).catch((err) => {
+      logger.error({ err }, "inbox write queue error");
+    });
```
Add `import { logger } from "@/lib/logger";` at the top of the file.

**Edit** `app/api/webhooks/google/route.ts` — replace each empty `catch {}` block (3 locations: ~lines 80, 104, 120) with logged variants. Pattern:
```diff
-  } catch {
-    return false;
-  }
+  } catch (err) {
+    logger.warn({ err, step: "jwt-decode" /* or "jwks-fetch", "sig-verify" */ }, "google webhook jwt verification step failed");
+    return false;
+  }
```

Also replace the "sync_error" silent catch at `app/api/webhooks/google/route.ts:179`:
```diff
-  } catch {
+  } catch (err) {
+    logger.error({ err, email: payload.emailAddress }, "google webhook sync failed");
     await addWebhookEvent({...});
   }
```

Repeat the same pattern for `app/api/webhooks/microsoft/route.ts`.

### 2.3 — Add Biome v2 + lint step

⚠️ **DECIDE D1**. If ESLint, see the alternate block below.

```bash
npm i -D --save-exact @biomejs/biome@^2
npx biome init
```

**Replace** `biome.json` with:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**/*.{ts,tsx,js,jsx,json,md}"],
    "ignore": [".next", "node_modules", ".data", "migrations", "tsconfig.tsbuildinfo", "*.lock", "package-lock.json"]
  },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 110 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": { "noExplicitAny": "warn" },
      "style": { "noNonNullAssertion": "warn" },
      "correctness": { "noUnusedVariables": "error" }
    }
  },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always", "trailingCommas": "es5" } }
}
```

**Edit** `package.json` scripts:
```diff
+    "lint": "biome check .",
+    "lint:fix": "biome check --write ."
```

Run once and fix:
```bash
npm run lint:fix
npm run lint
```

**Edit** `.github/workflows/ci.yml` — add a lint step before tests:
```diff
       - run: npm ci

+      - name: Lint
+        run: npm run lint
+
       - name: Typecheck
         run: npm run typecheck
```

**Alternate (ESLint, if D1 ≠ Biome)**:
```bash
npm i -D eslint@^9 eslint-config-next@^15 prettier@^3 eslint-config-prettier@^9
```
Use Next.js' flat-config preset; same `lint`/`lint:fix` scripts and CI step.

### 2.4 — Replace hand-rolled JWT/JWK with `jose`

```bash
npm i jose@^5
```

**Replace** the entire JWKS + verification block in `app/api/webhooks/google/route.ts` (lines 1–123) with:

```ts
import { Buffer } from "node:buffer";
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { resolveStoredConnection } from "@/lib/connections";
import { addWebhookEvent, upsertSyncedInbox } from "@/lib/db";
import inboxEmitter from "@/lib/inbox-emitter";
import { logger } from "@/lib/logger";
import { syncProviderInbox } from "@/providers/adapters";

export const runtime = "nodejs";

interface GmailPushEnvelope {
  message?: { data?: string; messageId?: string };
}

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"), {
  cacheMaxAge: 60 * 60 * 1000,
  cooldownDuration: 30 * 1000,
});

const VALID_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

async function verifyGoogleOidcJwt(token: string, expectedAudience?: string): Promise<boolean> {
  try {
    await jwtVerify(token, GOOGLE_JWKS, {
      issuer: VALID_ISSUERS,
      audience: expectedAudience,
      algorithms: ["RS256"],
      clockTolerance: 5,
    });
    return true;
  } catch (err) {
    if (err instanceof joseErrors.JOSEError) {
      logger.warn({ err: { code: err.code, message: err.message } }, "google webhook jwt verify rejected");
    } else {
      logger.warn({ err }, "google webhook jwt verify error");
    }
    return false;
  }
}
```

Keep the existing `POST` handler **unchanged** — it already calls `verifyGoogleOidcJwt(bearer, expectedAudience)` and the signature is preserved.

### Definition of Done — Phase 2

1. `npm run lint && npm run typecheck && npm test && npm run build` all pass.
2. `grep -RnE 'catch\s*\{?\s*\}' app/api lib` prints nothing in production code.
3. Manual: a malformed Pub/Sub push to `/api/webhooks/google` returns 401 and logs a `logger.warn` line with `code: "ERR_JWT_INVALID"` (or similar `JOSEError` code). A real OIDC token (signed by Google) returns 200.
4. CI workflow now has a `Lint` step and it passes.

### Phase 2 Rollback

- **Pino**: trivial — revert `lib/logger.ts` and the catch-block edits. Old behavior was silent catches; reverting restores them.
- **Biome**: trivial — uninstall, remove `biome.json`, remove `lint`/`lint:fix` scripts, remove the CI step.
- **`jose` rewrite (highest risk in this phase)**: the **previous JWKS-cache implementation is preserved in git history at the parent commit**. To roll back:
  ```bash
  git revert <jose-commit-sha>
  ```
  No data corruption is possible — the change is signature-validation logic only. If a regression is suspected in production, set the route to deny-all temporarily (`return NextResponse.json({error:"down"}, {status:503})` at the top of `POST`) until the revert lands.

---

## Phase 3 — Data Contract

**Why this phase exists.** Phases 4 and 5 touch the storage layer, the API surface, the UI, the seed data, the import script, and the test fixtures all at once. If decisions D2–D6 and the storage interface aren't written down first, those phases drift into N parallel reinterpretations. This phase produces three concrete artifacts that lock everything down: `docs/decisions.md`, the `Reminder` data-model contract, and the `StorageDriver` TypeScript interface.

This phase is **doc-and-types only** — no runtime behavior changes.

### 3.1 — Resolve and record decisions

⚠️ **DECIDE D2, D3, D4, D5, D6** with the relevant stakeholders. Recommended answers in the Decision Index above.

**New file** `docs/decisions.md`:
```markdown
# Architecture Decisions

| ID | Date | Decision | Rationale |
| --- | --- | --- | --- |
| D1 | 2026-MM-DD | Lint with Biome v2 | Single binary; replaces ESLint+Prettier for ~95% of rules at this project size. |
| D2 | 2026-MM-DD | Email reminders via Resend | Modern transactional API; React-email templating if needed later. |
| D3 | 2026-MM-DD | Reminders carry an `email` field for the recipient | Future-proofs multi-user; explicit beats implicit lookup. |
| D4 | 2026-MM-DD | Canonical inbox UI: <InboxView | Dashboard> | <one sentence why> |
| D5 | 2026-MM-DD | Storage: JSON in dev (no DATABASE_URL), Postgres in prod (DATABASE_URL set) | Keeps the local-first dev loop; Postgres opt-in. |
| D6 | 2026-MM-DD | Postgres host: <Neon | Supabase | self-hosted | local Docker> | <one sentence why> |
| D7 | DEFERRED | OpenTelemetry: skip for MVP | Pino structured logs cover observability needs; revisit when a tracing backend is provisioned. |
| D8 | DEFERRED | Zod 3 → 4: defer to Phase 6.5 | Mechanical upgrade; not blocking. |
```

### 3.2 — Lock the Reminder data-model contract

A schema change to `Reminder` cascades through every layer. Document them once, in one place, before writing any code.

**New file section** in `docs/decisions.md` (append):
```markdown
## Reminder Data Model (locked Phase 3)

The `Reminder` entity gains four fields to support delivery (Phase 5.1):

| Field | Type | Required | Default | Reason |
| --- | --- | --- | --- | --- |
| `email` | string (email) | yes | — | Recipient for delivery (D3) |
| `deliveredAt` | ISO timestamp | no | null | Set when scheduler successfully sends |
| `deliveryAttempts` | integer | no | 0 | Retry counter |
| `lastDeliveryError` | string | no | null | Last failure message for debugging |

### Surfaces affected (every one must be updated atomically in Phase 4):

1. `lib/types.ts` — `Reminder` interface gains the four fields.
2. `lib/schemas.ts` — `ReminderCreateSchema` gains required `email`.
3. JSON store seed data (`lib/db.ts:84-92`) — existing seed reminder gets `email: "you@example.com"`.
4. JSON store on-disk migration: a one-time read-modify-write on first boot to backfill `email` (use the only connection's email; if none, drop the reminder with a logger.warn).
5. Postgres schema (`db/schema.ts`) — table mirrors the four columns with NOT NULL on `email`, defaults on `deliveryAttempts`.
6. `app/api/reminders/route.ts` (POST) — pass `email` through; reject body without it (Zod handles this).
7. UI form (`components/<canonical>.tsx` per D4) — add `email` input, default-fill from session.
8. Tests — fixtures include `email`.
9. Import script (`scripts/import-json-to-postgres.ts`) — handle legacy reminders missing `email` (skip or backfill).
```

### 3.3 — Define the `StorageDriver` interface

**New file** `lib/db/driver.ts`:
```ts
import type {
  InboxStore, Reminder, OAuthConnection, ProviderSubscription,
  Thread, UserAccount, Message, WebhookEvent, SanitizedInboxStore,
} from "@/lib/types";

export interface StorageDriver {
  // Reads
  getStore(): Promise<InboxStore>;
  getConnection(input: { provider: OAuthConnection["provider"]; email?: string }): Promise<OAuthConnection | undefined>;
  listConnections(): Promise<OAuthConnection[]>;
  listSubscriptions(): Promise<ProviderSubscription[]>;
  getSubscriptionByExternalId(provider: ProviderSubscription["provider"], externalId: string): Promise<ProviderSubscription | undefined>;
  listDueReminders(now: Date): Promise<Reminder[]>;        // new for Phase 5.1

  // Writes
  saveStore(store: InboxStore): Promise<void>;
  clearStore(): Promise<InboxStore>;
  upsertSyncedInbox(input: { account: UserAccount; threads: Thread[]; messages: Message[] }): Promise<InboxStore>;
  addReminder(reminder: Reminder): Promise<InboxStore>;
  deleteReminder(id: string): Promise<InboxStore>;
  updateReminder(id: string, patch: Partial<Pick<Reminder, "completed">>): Promise<InboxStore>;
  markReminderDelivered(id: string, at: string): Promise<void>;          // new for Phase 5.1
  recordDeliveryFailure(id: string, message: string): Promise<void>;     // new for Phase 5.1
  upsertConnection(connection: OAuthConnection): Promise<InboxStore>;
  upsertSubscription(subscription: ProviderSubscription): Promise<InboxStore>;
  updateThreadStatus(threadId: string, status: Thread["status"], waitingOn?: string): Promise<InboxStore>;
  addWebhookEvent(event: WebhookEvent): Promise<InboxStore>;

  // Pure helper (no I/O)
  searchThreads(store: InboxStore, query: string): Array<{ thread: Thread; score: number }>;
  // searchThreads stays pure for the JSON impl; the PG impl should accept a db handle separately or override at the route level.
}

// Pure helper exported as-is from both drivers
export function sanitizeStore(store: InboxStore): SanitizedInboxStore {
  return {
    ...store,
    connections: store.connections.map(({ accessToken: _a, refreshToken: _r, ...rest }) => rest),
  };
}
```

This interface is the contract Phase 4 will implement twice (JSON driver and Postgres driver). Phase 5 will call only methods on this interface — never the underlying drivers directly.

### 3.4 — Update README

Add to README:
```markdown
## Architecture decisions

See `docs/decisions.md` for the locked decisions (D1–D8) and the Reminder data-model contract.
```

### Definition of Done — Phase 3

1. `docs/decisions.md` exists with D1–D6 resolved (D7/D8 marked DEFERRED) and the Reminder contract section filled in.
2. `lib/db/driver.ts` compiles (`npm run typecheck` passes).
3. The current `lib/db.ts` exports satisfy the `StorageDriver` interface — verify by adding (temporarily) `const _check: StorageDriver = require("@/lib/db");` to a scratch file, typecheck, then remove. (Phase 4 makes this permanent.)
4. README links to `docs/decisions.md`.

### Phase 3 Rollback

Trivial: delete the new files and revert the README edit. No runtime impact.

---

## Phase 4 — Persistence: Drizzle + Postgres

The largest phase, and the highest blast radius. **Split into two PRs**: read methods first (low risk, easily revertible), then write methods (higher risk).

🔑 **PREREQ**: `DATABASE_URL` for an empty Postgres 16+ database (per D6).

### 4.1 — Install

```bash
npm i drizzle-orm@^0.36 postgres@^3
npm i -D drizzle-kit@^0.28 @types/pg
```

### 4.2 — Schema mirroring `lib/types.ts` (with Phase 3 reminder additions)

**New file** `db/schema.ts` — same as v1 of this doc; **the `reminders` table includes the four fields locked in Phase 3.2** (`email NOT NULL`, `delivered_at`, `delivery_attempts NOT NULL DEFAULT 0`, `last_delivery_error`). Full schema:

```ts
import { boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const providerEnum = pgEnum("provider", ["google", "microsoft"]);
export const threadStatusEnum = pgEnum("thread_status", ["needs_reply", "waiting_on", "done"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "error"]);

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  provider: providerEnum("provider").notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
}, (t) => ({ uniqEmailProvider: uniqueIndex("accounts_email_provider_uniq").on(t.email, t.provider) }));

export const connections = pgTable("connections", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  provider: providerEnum("provider").notNull(),
  providerAccountId: text("provider_account_id"),
  accessToken: text("access_token"),       // encrypted at rest by lib/crypto
  refreshToken: text("refresh_token"),     // encrypted at rest by lib/crypto
  accessTokenExpires: integer("access_token_expires"),
  scope: text("scope"),
  tokenType: text("token_type"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => ({ uniqEmailProvider: uniqueIndex("connections_email_provider_uniq").on(t.email, t.provider) }));

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(),
  provider: providerEnum("provider").notNull(),
  email: text("email").notNull(),
  externalId: text("external_id"),
  resourceId: text("resource_id"),
  notificationUrl: text("notification_url").notNull(),
  clientState: text("client_state"),
  status: subscriptionStatusEnum("status").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const threads = pgTable("threads", {
  id: text("id").primaryKey(),
  subject: text("subject").notNull(),
  participants: jsonb("participants").$type<string[]>().notNull(),
  messageIds: jsonb("message_ids").$type<string[]>().notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull(),
  status: threadStatusEnum("status").notNull(),
  waitingOn: text("waiting_on"),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  subject: text("subject").notNull(),
  fromAddress: text("from_address").notNull(),
  toAddresses: jsonb("to_addresses").$type<string[]>().notNull(),
  snippet: text("snippet").notNull(),
  bodyPreview: text("body_preview").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  isUnread: boolean("is_unread").notNull(),
  labels: jsonb("labels").$type<string[]>().notNull(),
});

export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull(),
  email: text("email").notNull(),                                                  // D3
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
  completed: boolean("completed").notNull().default(false),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),                  // Phase 5.1
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),             // Phase 5.1
  lastDeliveryError: text("last_delivery_error"),                                  // Phase 5.1
});

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: providerEnum("provider").notNull(),
  email: text("email"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  eventType: text("event_type").notNull(),
  note: text("note"),
});
```

### 4.3 — Drizzle config + client + programmatic migrator

**New file** `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
```

**New file** `db/client.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 10, idle_timeout: 30 }) : null;

export const db = sql ? drizzle(sql, { schema }) : null;
export const isPostgresEnabled = sql !== null;
```

**New file** `scripts/migrate.mjs` — **runs at production runtime without dev tooling** (uses `migrate()` from the prod-installed `drizzle-orm` package; does NOT shell out to `drizzle-kit`):
```js
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL not set; skipping migrations");
  process.exit(0);
}

const sql = postgres(url, { max: 1 });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./migrations" });
  console.log("migrations applied");
} finally {
  await sql.end();
}
```

> Why `.mjs` and not `.ts`: avoids needing `tsx` or `ts-node` in the runtime container. `drizzle-orm` and `postgres` are runtime deps already.

### 4.4 — Generate baseline migration; remove orphaned SQL

```bash
rm migrations/001_create_kv_store.sql migrations/002_postgresql_schema.sql
npx drizzle-kit generate    # writes migrations/0000_*.sql
```

Add scripts to `package.json`:
```diff
+    "db:generate": "drizzle-kit generate",
+    "db:migrate": "node scripts/migrate.mjs",
+    "db:studio": "drizzle-kit studio"
```

> `db:generate` and `db:studio` use `drizzle-kit` (devDep, OK in dev). `db:migrate` uses the runtime script — works in prod containers.

### 4.5 — PR-A: Read-path driver

**New file** `lib/db/json-driver.ts` — move all current `lib/db.ts` contents here, unchanged behaviorally. Export the same function names. Confirms type-checks against `StorageDriver` from Phase 3.

**New file** `lib/db/pg-driver.ts` — implement **only the read methods** of `StorageDriver`:
- `getStore`, `getConnection`, `listConnections`, `listSubscriptions`, `getSubscriptionByExternalId`, `listDueReminders`, `searchThreads`.
- Write methods: throw `new Error("pg-driver: write method not yet implemented")` placeholders.

**Replace** `lib/db.ts` with the facade:
```ts
import { isPostgresEnabled } from "@/db/client";
import * as json from "./db/json-driver";
import * as pg from "./db/pg-driver";

const driver = isPostgresEnabled ? pg : json;

export const {
  getStore, getConnection, listConnections, listSubscriptions,
  getSubscriptionByExternalId, listDueReminders, searchThreads,
  // writes still routed to json for now (PR-B switches them):
} = driver;

// Writes still come from JSON until PR-B
export const {
  saveStore, clearStore, upsertSyncedInbox, addReminder, deleteReminder,
  updateReminder, markReminderDelivered, recordDeliveryFailure,
  upsertConnection, upsertSubscription, updateThreadStatus, addWebhookEvent,
} = json;

export { sanitizeStore } from "./db/driver";
```

**PR-A merge gate**: `npm test`, `npm run build`, and a smoke test against Postgres for read paths only.

### 4.6 — PR-B: Write-path driver

Implement the write methods in `lib/db/pg-driver.ts`. Then update `lib/db.ts` to route writes through `driver` as well:
```ts
const driver = isPostgresEnabled ? pg : json;
export const {
  getStore, getConnection, listConnections, listSubscriptions,
  getSubscriptionByExternalId, listDueReminders, searchThreads,
  saveStore, clearStore, upsertSyncedInbox, addReminder, deleteReminder,
  updateReminder, markReminderDelivered, recordDeliveryFailure,
  upsertConnection, upsertSubscription, updateThreadStatus, addWebhookEvent,
} = driver;
```

### 4.7 — JSON → Postgres import script (optional but recommended)

**New file** `scripts/import-json-to-postgres.ts`:
```ts
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../db/client";
import * as schema from "../db/schema";
import type { InboxStore } from "../lib/types";

if (!db) throw new Error("DATABASE_URL not set");

const raw = await readFile(path.join(process.cwd(), ".data", "inbox.json"), "utf8");
const store = JSON.parse(raw) as InboxStore;

await db.transaction(async (tx) => {
  if (store.accounts.length) await tx.insert(schema.accounts).values(store.accounts).onConflictDoNothing();
  if (store.connections.length) await tx.insert(schema.connections).values(store.connections).onConflictDoNothing();
  if (store.subscriptions.length) await tx.insert(schema.subscriptions).values(store.subscriptions).onConflictDoNothing();
  if (store.threads.length) await tx.insert(schema.threads).values(store.threads).onConflictDoNothing();
  if (store.messages.length) await tx.insert(schema.messages).values(
    store.messages.map(m => ({ ...m, fromAddress: m.from, toAddresses: m.to }))
  ).onConflictDoNothing();
  if (store.reminders.length) await tx.insert(schema.reminders).values(
    store.reminders.map(r => ({ ...r, email: r.email ?? "" })) // legacy backfill per Phase 3.2
  ).onConflictDoNothing();
  if (store.webhookEvents.length) await tx.insert(schema.webhookEvents).values(store.webhookEvents).onConflictDoNothing();
});
console.log("Import complete.");
```

Add: `"db:import-json": "tsx scripts/import-json-to-postgres.ts"` and `npm i -D tsx`.

### 4.8 — Dockerfile: run migrations on startup (no devDeps needed)

**Edit** `Dockerfile`:
```diff
 USER nextjs
 EXPOSE 3000

+COPY --chown=nextjs:nodejs migrations ./migrations
+COPY --chown=nextjs:nodejs scripts/migrate.mjs ./scripts/migrate.mjs
+COPY --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh
+# Migration runner uses drizzle-orm + postgres (already in production deps).
+# No drizzle-kit at runtime. No tsx at runtime.
+
 HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
   CMD wget -qO- http://localhost:3000/api/health || exit 1

-CMD ["node", "server.js"]
+ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
+CMD ["node", "server.js"]
```

> The `RUN chmod +x` is unnecessary since we invoke via `/bin/sh /docker-entrypoint.sh`.

**New file** `docker-entrypoint.sh`:
```sh
#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  node /app/scripts/migrate.mjs
fi
exec "$@"
```

### Definition of Done — Phase 4

1. `npm run lint && npm run typecheck && npm test && npm run build` all pass.
2. `npm run db:generate` produces a clean diff (no schema drift).
3. With `DATABASE_URL` set against an empty Postgres 16: `npm run db:migrate` succeeds, then `npm run dev` boots, then sync writes to Postgres tables (verify in `db:studio`).
4. Without `DATABASE_URL`: `npm run dev` boots and the JSON store still works exactly as before.
5. `docker build -t inbox:local . && docker run --rm -e DATABASE_URL=$DATABASE_URL -p 3000:3000 inbox:local` boots; logs show "migrations applied" before "ready - started server".

### Phase 4 Rollback

- **Quick**: unset `DATABASE_URL` on the runtime. The JSON driver resumes immediately. No data is lost (Postgres tables remain).
- **Schema rollback**: take a `pg_dump` **before** running `db:migrate` in production. To roll back, restore the dump or apply `drizzle-kit drop` against the migration to reverse it.
- **Driver-refactor revert**: PR-A and PR-B are separate commits — revert PR-B first if writes regress; revert PR-A too if reads regress. The orphan `lib/db.ts` content remains in git history at the parent of PR-A.

---

## Phase 5 — Reliability

### 5.1 — Reminder delivery (uses D2, D3 from Phase 3)

```bash
npm i node-cron@^3 resend@^4
npm i -D @types/node-cron
```

**New file** `lib/scheduler.ts`:
```ts
import cron from "node-cron";
import { Resend } from "resend";
import { logger } from "@/lib/logger";
import { listDueReminders, markReminderDelivered, recordDeliveryFailure } from "@/lib/db";

let started = false;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.REMINDER_FROM_ADDRESS;
const MAX_ATTEMPTS = 5;

async function tick(): Promise<void> {
  if (!resend || !FROM) {
    logger.debug("scheduler: resend not configured; skipping delivery");
    return;
  }
  const due = await listDueReminders(new Date());
  for (const r of due) {
    if (r.deliveryAttempts >= MAX_ATTEMPTS) {
      logger.warn({ reminderId: r.id, attempts: r.deliveryAttempts }, "reminder exceeded max attempts; skipping");
      continue;
    }
    try {
      await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: `Reminder: ${r.reason}`,
        text: `You asked to be reminded about thread ${r.threadId}: ${r.reason}\n\nDue: ${r.dueAt}`,
      });
      await markReminderDelivered(r.id, new Date().toISOString());
      logger.info({ reminderId: r.id }, "reminder delivered");
    } catch (err) {
      await recordDeliveryFailure(r.id, String(err));
      logger.error({ err, reminderId: r.id }, "reminder delivery failed");
    }
  }
}

export function startScheduler(): void {
  if (started) return;
  started = true;
  cron.schedule("* * * * *", tick, { timezone: "UTC" });
  logger.info("scheduler started (every 1m, UTC)");
}
```

**New file** `instrumentation.ts` (project root):
```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
```

**Edit** `lib/schemas.ts` — `email` is required per D3:
```diff
 export const ReminderCreateSchema = z.object({
   threadId: z.string().min(1),
+  email: z.string().email(),
   dueAt: z.string().datetime(),
   reason: z.string().min(1).max(1000)
 });
```

Update `app/api/reminders/route.ts` to pass `email` through to `addReminder`. Update the UI form per D4 to include the `email` input (default-fill from session.user.email).

### 5.2 — Rate limiting

```bash
npm i rate-limiter-flexible@^5
```

**New file** `lib/rate-limit.ts`:
```ts
import { RateLimiterMemory } from "rate-limiter-flexible";

const limiters = {
  auth:    new RateLimiterMemory({ points: 10, duration: 60 }),
  sync:    new RateLimiterMemory({ points: 20, duration: 60 }),
  search:  new RateLimiterMemory({ points: 60, duration: 60 }),
  default: new RateLimiterMemory({ points: 120, duration: 60 }),
};

export function pickLimiter(pathname: string) {
  if (pathname.startsWith("/api/auth")) return limiters.auth;
  if (pathname.startsWith("/api/inbox/sync") || pathname.startsWith("/api/inbox/subscriptions")) return limiters.sync;
  if (pathname.startsWith("/api/search")) return limiters.search;
  return limiters.default;
}

export function ipKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";
}
```

**Edit** `middleware.ts`:
```diff
 import { NextRequest, NextResponse } from "next/server";
 import { getToken } from "next-auth/jwt";
+import { pickLimiter, ipKey } from "@/lib/rate-limit";
+import { logger } from "@/lib/logger";

 ...

 export async function middleware(request: NextRequest): Promise<NextResponse> {
   const { pathname } = request.nextUrl;

   if (!pathname.startsWith("/api/") || isPublic(pathname)) {
     return NextResponse.next();
   }

+  const limiter = pickLimiter(pathname);
+  try {
+    await limiter.consume(ipKey(request));
+  } catch {
+    logger.warn({ pathname, ip: ipKey(request) }, "rate limit exceeded");
+    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
+  }
+
   const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
   ...
```

> Webhooks are excluded by `isPublic()` — they bypass rate limiting (correct: signature-verified instead).

### Definition of Done — Phase 5

1. `npm run lint && npm run typecheck && npm test && npm run build` all pass.
2. With `RESEND_API_KEY` and `REMINDER_FROM_ADDRESS` set: create a reminder with `dueAt = now + 90s`. Within 2 minutes, logs show `"reminder delivered"` and the email arrives at the recipient.
3. Without `RESEND_API_KEY`: scheduler logs `"scheduler: resend not configured; skipping delivery"` once per minute; reminders accumulate in storage.
4. Rate limit smoke: 70 rapid requests to `/api/search` (authenticated) yield ≥10 responses with HTTP 429.

### Phase 5 Rollback

- **Reminder delivery**: set `RESEND_API_KEY=""` (empty) in env. Scheduler still runs but no-ops on delivery. Reminders stay in storage. No data loss.
- **Scheduler boot**: delete `instrumentation.ts` to stop the scheduler from starting at all. Reminders stay in storage.
- **Rate limiting**: revert the `middleware.ts` diff. No state to clean up (in-memory limiter dies with the process).

---

## Phase 6 — Coverage (Tests)

### 6.1 — Install MSW v2

```bash
npm i -D msw@^2
```

### 6.2 — Test setup files

**New file** `tests/setup/msw.ts`:
```ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/profile", () =>
    HttpResponse.json({ emailAddress: "test@example.com" })
  ),
  http.get("https://gmail.googleapis.com/gmail/v1/users/me/threads", () =>
    HttpResponse.json({ threads: [{ id: "t1", snippet: "hi" }] })
  ),
  http.post("https://api.anthropic.com/v1/messages", () =>
    HttpResponse.json({ content: [{ type: "text", text: "{\"headline\":\"ok\",\"action\":\"reply\",\"bullets\":[]}" }] })
  ),
  http.post("https://generativelanguage.googleapis.com/v1beta/models/*", () =>
    HttpResponse.json({ candidates: [{ content: { parts: [{ text: "{}" }] } }] })
  ),
];

export const server = setupServer(...handlers);
```

**New file** `vitest.setup.ts`:
```ts
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./tests/setup/msw";

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Edit** `vitest.config.ts`:
```diff
   test: {
     environment: "node",
     globals: true,
     include: ["**/*.test.ts", "**/*.spec.ts"],
-    exclude: ["node_modules", ".next", "tests/contrast/**"]
+    exclude: ["node_modules", ".next", "tests/contrast/**"],
+    setupFiles: ["./vitest.setup.ts"]
   }
```

### 6.3 — Canonical API route test (template)

**New file** `tests/api/reminders.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { POST as createReminder, GET as listReminders } from "@/app/api/reminders/route";
import { clearStore } from "@/lib/db";

beforeEach(async () => { await clearStore(); });

function jsonReq(method: string, body: unknown) {
  return new Request("http://test/api/reminders", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reminders", () => {
  it("creates a reminder with valid body", async () => {
    const res = await createReminder(jsonReq("POST", {
      threadId: "t1", email: "u@example.com",
      dueAt: new Date(Date.now() + 60_000).toISOString(),
      reason: "follow up",
    }));
    expect(res.status).toBe(200);
  });

  it("rejects missing email with 400", async () => {
    const res = await createReminder(jsonReq("POST", {
      threadId: "t1",
      dueAt: new Date().toISOString(),
      reason: "x",
    }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/reminders", () => {
  it("returns the reminders list", async () => {
    const res = await listReminders(new Request("http://test/api/reminders"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.reminders)).toBe(true);
  });
});
```

### 6.4 — Apply pattern to remaining routes (checklist) — HARD-GATED on D4

> The contrast tests in 6.4.x require D4 (canonical UI) resolved in Phase 3. UI route tests target the canonical UI; do not start until D4 is locked.

Routes (one test file each):
- [ ] `tests/api/health.test.ts`
- [ ] `tests/api/inbox-sync.test.ts` (mock provider responses via MSW)
- [ ] `tests/api/inbox-stream.test.ts` (assert `text/event-stream` content-type + first ping)
- [ ] `tests/api/inbox-subscriptions.test.ts`
- [ ] `tests/api/inbox-cache.test.ts`
- [ ] `tests/api/threads.test.ts` (status update PATCH)
- [ ] `tests/api/threads-summary.test.ts`
- [ ] `tests/api/threads-draft.test.ts`
- [ ] `tests/api/threads-draft-revise.test.ts`
- [ ] `tests/api/reminders-id.test.ts` (PATCH + DELETE)
- [ ] `tests/api/search.test.ts`
- [ ] `tests/api/webhooks-google.test.ts` — sign a test JWT with a local key, configure MSW to serve a matching JWKS.
- [ ] `tests/api/webhooks-microsoft.test.ts` — assert validation token + clientState path.

Lib tests:
- [ ] `lib/__tests__/api.test.ts` (parseBody — happy path, invalid JSON, schema fail).
- [ ] `lib/__tests__/connections.test.ts` (token expiry refresh logic; mock token endpoint via MSW).
- [ ] `lib/__tests__/oauth.test.ts`.
- [ ] `lib/__tests__/inbox-emitter.test.ts` (subscribe → emit → receive).
- [ ] `lib/__tests__/schemas.test.ts` (parse valid + invalid for every schema).

Then **add Playwright/contrast to CI** (HARD-GATED on D4 — contrast tests target the canonical UI; running them against the non-canonical UI is wasted runs and confusing failures):

**Edit** `.github/workflows/ci.yml`:
```diff
   build:
     name: Docker build
     runs-on: ubuntu-latest
     needs: test
     ...
+
+  contrast:
+    name: Contrast tests
+    runs-on: ubuntu-latest
+    needs: test
+    steps:
+      - uses: actions/checkout@v4
+      - uses: actions/setup-node@v4
+        with: { node-version: "20", cache: "npm" }
+      - run: npm ci
+      - run: npx playwright install --with-deps chromium
+      - run: npm run test:contrast:ci
```

### 6.5 — Schema tightening + optional Zod 4

Add to `lib/schemas.ts`:
```ts
export const ReminderIdParamSchema = z.object({ id: z.string().uuid() });
export const InboxCacheClearSchema = z.object({ confirm: z.literal(true) });
export const ThreadIdParamSchema = z.object({ threadId: z.string().min(1) });
export const SummaryRequestSchema = z.object({ force: z.boolean().optional().default(false) });
```

Apply via `parseBody` (and a `parseParams` helper for path params).

⚠️ **DECIDE D8**. If upgrading Zod 3 → 4: `npm i zod@^4` and apply mechanical changes (`z.string().email()` → `z.email()`; `z.string().datetime()` → `z.iso.datetime()` in `ReminderCreateSchema`).

### Definition of Done — Phase 6

1. `npm run lint && npm run typecheck && npm test && npm run build` all pass.
2. Coverage: every API route has at least one test file under `tests/api/`. Every lib module has at least one test file under `lib/__tests__/`.
3. CI shows three jobs green: `test`, `build`, `contrast`.
4. Schema-tightening commits include both the schema definition and the route that uses it (no orphaned schemas).

### Phase 6 Rollback

- Tests are additive — deleting test files does not affect runtime.
- Zod 4 (if applied) — revert via `npm i zod@^3` and the two mechanical reversions.

---

## Phase 7 — Polish

### 7.1 — Wire up SSE hook — HARD-GATED on D4

In the canonical UI component (per D4), import and use `hooks/use-inbox-stream.ts`. On each `sync` event, trigger the existing inbox refresh function. Remove (or scale down) any polling interval that's now redundant.

If D4 means "delete `hooks/use-inbox-stream.ts`": `git rm hooks/use-inbox-stream.ts` instead.

### 7.2 — UI consolidation (D4)

```bash
# If keeping InboxView:
git rm components/dashboard.tsx
# Then update app/inbox/page.tsx to render <InboxView />.

# If keeping Dashboard:
git rm -r components/inbox/
```

### 7.3 — OpenAPI + Scalar docs

```bash
npm i @asteasolutions/zod-to-openapi @scalar/api-reference-react
```

**New file** `lib/openapi.ts`:
```ts
import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import {
  SyncRequestSchema, SearchRequestSchema, ReminderCreateSchema,
  DraftRequestSchema, ReviseRequestSchema, ThreadStatusUpdateSchema,
} from "@/lib/schemas";

const registry = new OpenAPIRegistry();
registry.registerPath({ method: "post", path: "/api/inbox/sync", request: { body: { content: { "application/json": { schema: SyncRequestSchema } } } }, responses: { 200: { description: "synced" } } });
registry.registerPath({ method: "post", path: "/api/search",     request: { body: { content: { "application/json": { schema: SearchRequestSchema } } } }, responses: { 200: { description: "results" } } });
registry.registerPath({ method: "post", path: "/api/reminders",  request: { body: { content: { "application/json": { schema: ReminderCreateSchema } } } }, responses: { 200: { description: "created" } } });
// ... repeat for each route ...

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "AI Inbox Copilot API", version: "0.1.0" },
  });
}
```

**New file** `app/api/openapi/route.ts`:
```ts
import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi";
export function GET() { return NextResponse.json(buildOpenApiDocument()); }
```

**New file** `app/api-docs/page.tsx`:
```tsx
"use client";
import { ApiReferenceReact } from "@scalar/api-reference-react";
export default function ApiDocs() {
  return <ApiReferenceReact configuration={{ spec: { url: "/api/openapi" } }} />;
}
```

### 7.4 — Documentation files

Create:
- `docs/microsoft-entra-setup.md` — Entra app registration, scopes, redirect URI, env vars.
- `docs/postgres-runbook.md` — `DATABASE_URL`, `npm run db:migrate` (now uses the runtime script), `db:studio`, switching from JSON, backup/restore.
- `docs/encryption-key.md` — generation (`openssl rand -base64 32`), `ENCRYPTION_KEY`, rotation effects, sketch of a re-encrypt script.
- `docs/troubleshooting.md` — Gmail watch 7-day expiry (link to Phase 8 renewal), refresh token failures, webhook signature failures, SSE proxy buffering, Resend deliverability.

Add a "Documentation" section to README linking to all four plus `/api-docs` and `docs/decisions.md`.

### Definition of Done — Phase 7

1. `npm run lint && npm run typecheck && npm test && npm run build` all pass.
2. `app/api/openapi/route.ts` returns valid OpenAPI 3.1 JSON (`curl localhost:3000/api/openapi | jq .openapi` prints `"3.1.0"`).
3. `/api-docs` renders the Scalar viewer locally with all registered routes visible.
4. Both `app/inbox/page.tsx` and the canonical UI compile and render without console errors.
5. README links to the four new docs and to `docs/decisions.md`.

### Phase 7 Rollback

- 7.1 SSE: revert the component edit to restore polling.
- 7.2 UI consolidation: `git revert` the deletion commit (the deleted UI is in git history).
- 7.3 OpenAPI viewer: delete `app/api-docs/page.tsx` and `app/api/openapi/route.ts` — they're isolated routes.

---

## Phase 8 — Roadmap (Out of Scope for This Remediation)

Listed for completeness; not part of the build script's "ship" target.

| Item | Tech | When |
| --- | --- | --- |
| **OpenTelemetry tracing** (was Phase 3.3 in v1) | `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`. Boot from `instrumentation.ts` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Add a request-id header in `middleware.ts`. | When a tracing backend exists (D7 resolved). |
| **Embeddings search** | pgvector (`CREATE EXTENSION vector`) + Voyage AI `voyage-3` embeddings; `vector(1024)` column on `messages`; ANN with cosine; blend with keyword score. | Once Postgres (Phase 4) has soaked. |
| **Microsoft Graph UI surface** | No new tech — provider radio on the Connect screen; backend already supports `syncProviderInbox("microsoft", ...)`. | After Phase 7. |
| **Encryption key rotation** | `scripts/rotate-encryption-key.ts` (read with `OLD_ENCRYPTION_KEY`, re-encrypt with `ENCRYPTION_KEY`, transactional update across all `connections`). | When operationally needed. |
| **Gmail watch auto-renewal** | Second `cron.schedule("0 */6 * * *", ...)` in `lib/scheduler.ts` — find connections whose `watchExpiry < now + 24h`, re-`watch()` them. | After Phase 5 has soaked. |

---

## Final Verification (after Phases 1–7)

```bash
npm ci
npm run lint
npm run typecheck
npm test                    # vitest, contrast excluded
npm run test:contrast       # if a dev server is running on :3000
npm run build
docker build -t inbox:local .
docker run --rm -p 3000:3000 \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -e ENCRYPTION_KEY=$(openssl rand -base64 32) \
  -e DATABASE_URL=$DATABASE_URL \
  -e RESEND_API_KEY=$RESEND_API_KEY \
  -e REMINDER_FROM_ADDRESS=$REMINDER_FROM_ADDRESS \
  inbox:local
curl -fsS http://localhost:3000/api/health
curl -fsS http://localhost:3000/api/openapi | jq -r .openapi   # expect "3.1.0"
```

If all commands above succeed, `/api/health` returns `{"status":"ok",...}`, and the Docker container's startup logs show `"migrations applied"` followed by `"scheduler started (every 1m, UTC)"`, the remediation is complete.
