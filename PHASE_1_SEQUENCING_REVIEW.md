# Phase 1 Sequencing Review

Decision record from the Codex verification pass on the proposed Workstream B → (A + C parallel) sequencing. Generated 2026-05-11 after Phase 0 (commit `93f2d12`) was committed and PR #1 opened against `main`.

## Proposed sequencing (pre-review)

> Audit trail of the initial proposal. **The "Agreed resolution" section below supersedes any conflict here** (notably: A/C branch off post-B `main`, not `port/phase-0`).

1. **Now**: spawn Team B (Workstream B — sign-in gate). Brief verbatim from `FRONTEND_PORT_PLAN.md` Appendix C.3. Isolate in a git worktree off `port/phase-0`. Lead reviews the PR.
2. **After B lands**: spawn Team A and Team C in parallel. Each branches from updated `port/phase-0`. Briefs from Appendix C.2 and C.4.
3. **After A and C merge**: Phase 2 integration (Appendix C.5), kept in the lead conversation.

## Codex findings (verified against the plan)

| # | Finding | Cited line | Status |
|---|---|---|---|
| 1 | Don't merge B's PR into `port/phase-0` while PR #1 is still open — the open Phase 0 PR's diff would absorb B's commits and become unreviewable. | B.7 line 1126; C.6 line 1366 | **Real blocker** |
| 2 | Proposed flow omits the retarget+rebase step. Once PR #1 merges to `main`, any open workstream branch needs `gh pr edit <num> --base main && git rebase main`. | C.6 line 1357 | **Real gap** |
| 3 | Merge order tension is in the plan itself. Parallelization checklist (line 242) says strict A → B → C. C.6 (line 1366) softens to "any order, A-first recommended." B-first contradicts the recommendation but is not strictly forbidden. | lines 242, 1366 | **Plan ambiguity — soft** |
| 4 | "B → either of A or C lead" reviewer assignment doesn't fit a single-lead setup. Pragmatically collapses to lead-reviews-B. | line 1133 | **Purist read; not blocking** |
| 5 | "A inherits B's middleware → tier-2 verification needs a session" — overstated. Plan explicitly anticipates this (line 878) and gives three workarounds (test session mocking, Microsoft sign-in, shared Google account at Phase 2). Known trade-off, not a new risk. | line 878 | **Overstated** |

## Agreed resolution

- **Spawn Team B now.** B branches from `port/phase-0`. B opens its PR targeting `port/phase-0`.
- **Hold B's merge until PR #1 lands on `main`.** Once Phase 0 is on `main`:
  1. `gh pr edit <B-pr-num> --base main`
  2. `git rebase main` on B's branch
  3. Re-verify (typecheck + tests), then merge B to `main`.
- **A and C are kicked off in parallel after B lands.** Each branches from the post-B `main` (`git worktree add -b port/inbox ../inbox-port origin/main`, etc.). A and C target `main` directly — no retarget needed. **Rebase-only rule**: if a sister workstream merges first, the other rebases on `main` (`git fetch origin main && git rebase origin/main && git push --force-with-lease`). Retarget is only required for branches whose base merged into another base.
- **Lead reviews all three** PRs (single-lead deviation from B.7 line 1133, intentional).
- **PR merge strategy: `gh pr merge --merge`** (preserves per-commit history) for Phase 0, B, A, C, and Phase 2. No squash, no rebase-merge — keeps the audit trail of per-step work intact.
- **Screenshots per workstream PR** (resolves B.7 / C.3 / C.4 inconsistencies):
  - **B**: 2 screenshots — mockup `/signin` vs rendered `/signin` at 1280px viewport. Supersedes C.3 line 1254 ("one screenshot").
  - **A**: 2 screenshots — mockup inbox vs rendered `/inbox` at 1280px. Per B.7 + C.2.
  - **C**: 7 side-by-side composites — one per section (Account, AI, Notifications, Appearance, Keyboard, Connected, Privacy), each composite = mockup section + rendered section. Per C.4 line 1288. Treats B.7's "2 screenshots" as the per-screen rule and C.4's "7 sections" as the per-screen count for Preferences specifically.
- **A's and C's tier-2 verification workaround: option 3 — defer real-OAuth verification to Phase 2.** Once B's middleware lands, both `/inbox` and `/preferences` page-route fetches against `/api/inbox/*` require a NextAuth session. For Phase 1, A and C verify by:
  - **Tier 1 (mandatory)**: `npm run typecheck && npm run test:unit && npm run test:api` all green.
  - **Visual smoke (substitute for HTTP smoke, per B.1 line 882)**: render the components with synthetic props via either (a) a Vitest-rendered story under `tests/visual/<workstream>/` (no real fetch, props hand-built from the mockup's `mockData.jsx` shapes), or (b) a dev-only local route at `app/dev/<workstream>-preview/page.tsx` that imports the component with synthetic props inline. Either path renders without hitting `/api/*`, so the middleware does not need to be touched. The dev-only preview route must NOT ship — delete it before commit, OR if kept temporarily, place it behind a `process.env.NEXT_PUBLIC_ENABLE_DEV_PREVIEW === "true"` guard so prod builds tree-shake it.
  - **HTTP smoke against real `/api/inbox/*`**: deferred to Phase 2 when the lead provides a Google account. No middleware-matcher edits, no test-session-mocking lifted into a prod helper, no Microsoft creds committed.
  - **Acceptance for A/C PRs**: Tier 1 green + at least one visual-smoke artifact (vitest snapshot or screenshot of the dev preview route) covering the workstream's primary screen. The PR body lists which synthetic-props path was used.
  - Rationale for option 3 over option 1 (test session mocking) or any middleware-matcher edit: avoids scope creep into auth wiring during a UI port; avoids the risk of an "I forgot to revert middleware.ts" PR; defers all real-auth concerns to the single Phase 2 pass where they belong.
- **Codex verification pass before every workstream merge.** Template:
  ```
  /Applications/Codex.app/Contents/Resources/codex exec "Verify commit <SHA> on branch <branch>
  against main. Skip build/typecheck (those pass). For each finding return:
  file:line, severity (blocker | important | nit), one-line fix. Check:
  (a) every prop interface in Appendix <A.4 | A.5 | A.6> matches the implementation;
  (b) every API call routes through lib/ui/api.ts (no raw fetch); (c) backend wiring
  rules in Appendix <B.3 | B.4 | B.5> are followed; (d) scope tripwires in B.7
  (line 1137-1144) not crossed. Report PASS or DIVERGENCE per section." > /tmp/codex-<workstream>.log 2>&1
  ```
  Triage per B.6 (blocker → fix; important → fix or open dated issue; nit → `port-polish` issue; disagreement → lead arbitrates with mockup as ground truth).
  **Spot-check rule**: pick one PASS per pass and independently verify one of its strongest claims (e.g. for icon parity, diff one long SVG path; for API parity, open one route handler and check a field name). False-positive PASSes are the failure mode this guards against.

## Plan inconsistencies arbitrated here

The plan contradicts itself in a few places. This doc fixes the call so workstream agents don't have to choose:

| Inconsistency | Plan locations | Arbitrated outcome |
|---|---|---|
| C exclusive write set omits `components/preferences/ui/*.tsx`, but B.5 + C.4 require those 9 primitive files. | line 192-193 (write set) vs line 1082 (B.5) vs line 1283 (C.4) | **C's write set INCLUDES `components/preferences/ui/{Card,Row,Section,Toggle,Segmented,Slider,ToneCards,ThemeSwatch,SecondaryButton}.tsx`** (9 files). Plan body is wrong; B.5 governs. |
| Screenshot count per PR | B.7 line 1148 (2) vs C.3 line 1254 (1) vs C.4 line 1288 (7) | See "Screenshots per workstream PR" rule above. |
| Merge order | line 242 (strict A→B→C) vs line 1366 (any order, A-first recommended) | B-first per this doc's sequencing; A and C may merge in either order after. |
| Workstream B reviewer assignment | line 1133 ("A or C lead") | Single-lead model: lead reviews B (and A and C). |

## Open question (deferred)

The plan's parallelization checklist recommends A merging first as the "largest-first conflict surfacer." Our sequencing puts B first as the auth-gate enabler. If A's PR surfaces large conflicts that B should have adapted to, we revisit the sequencing — but absent evidence, B-first stands.
