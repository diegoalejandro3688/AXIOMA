# DESAFÍOS V1 — IMPLEMENTATION REPORT

**Increment:** DESAFÍOS V1 — final V1 content block.
**Mode:** content completion + minimal integration on existing Challenge infrastructure. No architecture rebuild.
**Date:** 2026-08-30.
**Verdict:** READY FOR PRODUCT/TPM REVIEW.

---

## A. Environment

| Item | Value |
| --- | --- |
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD at start | `bb543dd49f896456f4ec18c68b5e0d182e171d6e` — `feat(cosmetics): complete V1 catalog and progression rewards` |
| Runtime DB (dev) | `axioma_dev` |
| Gate DB | `axioma_gates_dev` (via `.env.gates`) |
| `git status` at start | 9 modified + 7 untracked — all pre-existing unrelated residue (`.npmrc`, `apps/mobile/app.json`, `onboarding.tsx`, branding icons, `auth-brand-header.tsx`, `apps/mobile/package.json`, `zetrynd-wordmark.tsx`, `.env-test-output/`, `LEF-BLOCK-VII-*` docs, `experiments/dg1-*`). **Left untouched.** |

---

## B. Architecture preservation

**Reused, not rebuilt:**

| Concern | Existing mechanism |
| --- | --- |
| Catalog rows | `ChallengeDefinition` (immutable per row, §4.8) — one row per template per period |
| Objective | Existing `CUMULATIVE_COUNT` completion rule + `ALL_ACCOUNTS` eligibility rule (`challenge-rule.ts`) |
| Per-user instance | `AccountChallenge` + `createIdempotent` (§4.16(d)) |
| Progress engine | `RewardEvaluationWorker.evaluateChallenges` — driven off `xp_ledger_entry` `OTORGAMIENTO` events, cron every minute |
| Daily cap / dedup | `AccountChallengeDailyProgress` + `AccountChallengeConsumedEvent` |
| Claim | `POST /gamification/me/challenges/:id/claim` — advisory lock ns 20, `ChallengeService.claim` unchanged |
| Reward delivery | `RewardBundle` / `RewardBundleItem` (`XP_BONUS`) → `RewardEvaluationWorker.deliverBundleComponents(…, 'CHALLENGE_CLAIM', accountChallengeId)` → `RewardGrant` `reward:CHALLENGE_CLAIM:{id}` |

**Explicitly NOT created** (§35): no `ChallengeTemplate`/`ChallengePeriod` DB model, no `ChallengeScheduler`, no cron, no `ChallengeMetric` abstraction, no subject/correctness/LP/accuracy metrics, no new objective consumer, no new event-bus path, no accept/decline flow, no reroll, no challenge detail screen, no challenge admin API, no Premium hooks, no analytics, no second reward engine, no second progress ledger, no schema migration.

**Schema changes:** none. **Contract change:** one additive nullable field (`ChallengeSummary.rewardXpBonus`).

---

## C. Template catalog

Single source of truth: [`apps/backend/src/gamification/challenges-v1-catalog.ts`](../../apps/backend/src/gamification/challenges-v1-catalog.ts). 13 templates, compile-time invariants (13 total / 9 DAILY / 4 WEEKLY / 3 per tier / reward-by-tier). All public copy Spanish, metric term **"actividades de estudio"** (honest — the worker counts valid XP-earning activity events, not correct answers / subjects / XP amount / LP / wins).

| # | templateKey | name | type / tier | target | reward |
| --- | --- | --- | --- | --- | --- |
| 1 | `daily-easy-primer-impulso` | Primer impulso | DAILY / easy | 3 | +10 XP |
| 2 | `daily-easy-calentamiento` | Calentamiento | DAILY / easy | 2 | +10 XP |
| 3 | `daily-easy-primer-paso` | Primer paso | DAILY / easy | 4 | +10 XP |
| 4 | `daily-medium-ritmo-constante` | Ritmo constante | DAILY / medium | 6 | +20 XP |
| 5 | `daily-medium-sigue-avanzando` | Sigue avanzando | DAILY / medium | 5 | +20 XP |
| 6 | `daily-medium-en-marcha` | En marcha | DAILY / medium | 7 | +20 XP |
| 7 | `daily-hard-sesion-completa` | Sesión completa | DAILY / high | 10 | +30 XP |
| 8 | `daily-hard-jornada-productiva` | Jornada productiva | DAILY / high | 8 | +30 XP |
| 9 | `daily-hard-a-fondo` | A fondo | DAILY / high | 12 | +30 XP |
| 10 | `weekly-constancia-semanal` | Constancia semanal | WEEKLY | 40 | +100 XP |
| 11 | `weekly-semana-en-marcha` | Semana en marcha | WEEKLY | 35 | +100 XP |
| 12 | `weekly-objetivo-semanal` | Objetivo semanal | WEEKLY | 45 | +100 XP |
| 13 | `weekly-gran-semana` | Gran semana | WEEKLY | 50 | +100 XP |

All 13 use `completionRule = {schemaVersion:'v1', type:'CUMULATIVE_COUNT', targetValue:<t>}`, `eligibilityRule = {schemaVersion:'v1', type:'ALL_ACCOUNTS'}`, `dailyCap = null`.

---

## D. Provisioning

| Item | Value |
| --- | --- |
| Generator | `generateChallengeV1Definitions()` — deterministic, no `Date.now()`, no randomness, no local paths; re-run produces byte-identical output |
| Seed | [`apps/backend/scripts/seed-challenges-v1.ts`](../../apps/backend/scripts/seed-challenges-v1.ts) — `pnpm --filter @axioma/backend challenges:seed-v1 [-- --dry-run]` |
| Canonical start | 2026-08-30T00:00:00Z |
| Daily horizon | 365 periods → 2026-08-30 … 2027-08-30 (exclusive) |
| Daily windows | `[day 00:00Z, next day 00:00Z)` — exactly 24h |
| **Daily definitions** | **1095** (365 × 3: one easy + one medium + one high per day) |
| Weekly boundary | ISO-8601, Monday 00:00 UTC. First week = Monday 2026-08-24 (`weekIndex 0`, contains the start date) |
| Weekly windows | 7 days, Monday-aligned |
| **Weekly definitions** | **53** (derived from the range: every Monday-week intersecting the daily horizon; the gate recomputes this, never hardcodes it) |
| **Total generated** | **1148** |
| Daily rotation | `dayIndex % 3` per tier (§11) — 3 stable daily combinations. Day 0 (2026-08-30) = Primer impulso / Ritmo constante / Sesión completa |
| Weekly rotation | `weekIndex % 4` (§12) — Constancia semanal → Semana en marcha → Objetivo semanal → Gran semana. `weekIndex 0` = week of 2026-08-24 → `v1-weekly-constancia-semanal-2026-W35` |
| challengeKey (daily) | `v1-daily-<slug>-YYYY-MM-DD` e.g. `v1-daily-primer-impulso-2026-08-30` |
| challengeKey (weekly) | `v1-weekly-<slug>-YYYY-Www` e.g. `v1-weekly-constancia-semanal-2026-W35` |
| Immutability (§14) | existing `v1-*` row → verify exact match of `challengeType` / `eligibilityRule` / `completionRule` / `startsAt` / `endsAt` / `dailyCap` / `rewardBundleId`; exact → no-op; contradiction → **throw** (`ImmutableContradictionError`), never silent mutation. New periods = new rows. |

At any normal instant: exactly **3 DAILY (one easy + one medium + one high) + 1 WEEKLY = 4 active** (`findActiveContainingInstant`).

---

## E. Rewards

| Bundle key | Component | Amount | Bound to |
| --- | --- | --- | --- |
| `challenge-v1-xp-10` | `XP_BONUS` | 10 | 365 daily-easy definitions |
| `challenge-v1-xp-20` | `XP_BONUS` | 20 | 365 daily-medium definitions |
| `challenge-v1-xp-30` | `XP_BONUS` | 30 | 365 daily-high definitions |
| `challenge-v1-xp-100` | `XP_BONUS` | 100 | 53 weekly definitions |

- Bundles are ensured idempotently by `bundleKey` (no duplication on re-seed). A pre-existing bundle with a wrong amount or any non-`XP_BONUS` component → **throw**.
- **No V1 challenge reward contains COSMETIC / TITLE / LP.** Verified at catalog level and DB level (0 non-`XP_BONUS` components on any `v1-*` definition's bundle).
- Provenance: `RewardSourceEntityType.CHALLENGE_CLAIM`, `sourceEntityId = account_challenge.id`, `idempotencyKey = reward:CHALLENGE_CLAIM:{id}` — existing mechanism, unchanged.
- Delivery creates a `BONO` `xp_ledger_entry`, which is **excluded** from challenge progress → no farming loop.

---

## F. Materialisation

Gap fixed (§15): `GET /gamification/me/challenges` previously returned only already-materialised rows, so the section could look empty while valid ACTIVE definitions existed.

`ChallengeService.listForAccount(accountId)` now, before returning:

1. `findActiveContainingInstant(now)` → active definitions;
2. parse `eligibilityRule` / `completionRule` with the **same grammar** as the worker (`challenge-rule.ts`);
3. for `ALL_ACCOUNTS` definitions → `accountChallengeRepo.createIdempotent(tx, …)` (existing primitive) inside a per-definition transaction;
4. return the visible set.

- **No accept button, no new endpoint, no new assignment model** — this completes the existing auto-assignment design (§4.14's second trigger, previously unimplemented).
- **Idempotent:** repeated GETs never duplicate `account_challenge` (`UNIQUE(accountId, challengeDefinitionId, periodStart)`; concurrent-GET loser catches `P2002`).
- **Invalid-definition isolation (§16):** a stale definition with obsolete non-JSON rule grammar is logged (`WARN`) and skipped — it never breaks the listing or the materialisation of valid V1 definitions. Pre-existing drift (`catalog-gate-challenge-*` in `axioma_dev`) left untouched.

`claim` also now returns `rewardXpBonus` (derived from the definition's bundle). `ChallengeService.claim` logic itself is unchanged (advisory lock, 404/409/503, idempotency, retry).

---

## G. Visibility / expiry (§17)

Read-filtering only — **no `EXPIRED` state, no migration, no mutation of `challengeStatus` or deletion of history.**

| Period | `ACCEPTED` | `IN_PROGRESS` | `COMPLETED` (unclaimed) | `CLAIMED` |
| --- | --- | --- | --- | --- |
| current (`periodEnd > now`) | visible | visible | visible | visible |
| past (`periodEnd <= now`) | **hidden** | **hidden** | **visible & still claimable** | **hidden** |

Old unfinished/claimed challenges stay out of Competir; a legitimately-completed reward remains claimable later.

---

## H. Mobile

Additive only — no redesign, no new navigation, no challenge detail screen.

| Surface | Change |
| --- | --- |
| `lib/challenges/challenge-card-view.ts` (new) | Pure helpers (RN/Expo-free, gateable): `challengeTypeLabel` (Diario/Semanal), `formatCountdown` (local, clamps at 0, "1 d 6 h restantes" / "6 h restantes" / "30 min restantes", `null` when past), `formatRewardXp` ("+10 XP"), `claimCtaLabel` ("Reclamar +20 XP"), `isPastPeriod` |
| `app/(tabs)/competir/index.tsx` | Card header row: name + **Diario / Semanal** badge (§18). Reward preview line "Recompensa: +N XP" (§20). Countdown in the meta row while the period is active; none for past rows (§19). Claim CTA now "Reclamar +N XP" (§20). Existing progress bar / status / claim locking / error handling / section hierarchy (Liga → Pregunta rápida → Desafíos) unchanged. |
| `app/(tabs)/index.tsx` "Desafíos de hoy" | **No code change.** After the GET fix it naturally receives the 3 materialised DAILY challenges via the existing `groupChallenges(...).active.filter(challengeType === 'DAILY')`. No WEEKLY on Home (unchanged filter). |

Contract: `ChallengeSummary.rewardXpBonus: number | null` (additive, nullable).

---

## I. Gates

| Command | Result | Evidence | Gate-DB mutation |
| --- | --- | --- | --- |
| `verify:challenges-v1-catalog-gate` (**new**) | **PASS** | A–AA below | Yes — seeds `v1-*` definitions + bundles into `axioma_gates_dev`, reactivates `v1-*` rows, retires foreign ACTIVE definitions, creates account fixtures, temporary immutability probe (restored). Documented in the gate header. |
| `verify:challenge-foundation-gate` | PASS | schema / triggers / CHECKs | Yes (own fixtures) |
| `verify:challenge-progress-gate` | PASS | worker 4.b end-to-end | Yes (own fixtures; retires non-`gate-4b-*` ACTIVE defs) |
| `verify:challenge-claim-gate` | PASS | endpoints, claim idempotency | Yes (own fixtures; needs gates server) |
| mobile `verify:challenges-gate` | PASS | `group-challenges` + `claim-outcome` + new §18/§19/§20 helper coverage | No |
| mobile `verify:leaderboard-gate` | PASS | unaffected | No |
| mobile `verify:competitive-profile-gate` | PASS | unaffected | No |
| `verify:personalization-catalog-gate` | PASS | `challenge_definition` unlock-source path unaffected | Yes (own fixtures) |
| `@axioma/contracts` build (`tsc`) | PASS | — | — |
| `@axioma/backend` typecheck (`tsc --noEmit`) | PASS | — | — |
| `@axioma/backend` build (`nest build`) | PASS | — | — |
| `@axioma/mobile` `tsc --noEmit` | PASS | — | — |
| ESLint — all touched backend/contracts/mobile paths | PASS | — | — |
| `git diff --check` | clean | — | — |

**New gate coverage (A–AA):**

- **A–H** catalog: 13 templates, unique keys, 9 DAILY / 4 WEEKLY, 3/3/3 tier split, exact targets by approved name, exact rewards 10/20/30/100, no TITLE/COSMETIC/LP, "actividades de estudio" copy.
- **I** 365 daily periods → 1095 DAILY defs. **J** exactly 3 DAILY defs per calendar day. **K** one easy + one medium + one high per day. **L** 53 weekly (recomputed from range), one per ISO-Monday week, no same-week overlap. **M** daily windows exactly 24h. **N** weekly windows exactly 7 days, Monday-UTC aligned. **O** challengeKey deterministic, unique, format-checked.
- **P** second seed run: 0 created, all 1148 matched. **Q** a `v1-*` row contradicting its immutable config makes the seed **throw** and does **not** mutate it.
- **R** `listForAccount` materialises for an account with no prior rows. **S** first GET → exactly 3 DAILY + 1 WEEKLY, all `ACCEPTED`, `rewardXpBonus` ∈ {10,20,30,100}. **T** repeated GET → still 4 rows, no duplication. **U** an invalid legacy definition does not break the valid V1 listing (logged + skipped).
- **V** past `ACCEPTED`/`IN_PROGRESS` hidden. **W** past `CLAIMED` hidden. **X** past `COMPLETED`-unclaimed visible & claimable; no history row deleted/mutated.
- **Y** claim → `CLAIMED`, `reward_grant` with `CHALLENGE_CLAIM` + `reward:CHALLENGE_CLAIM:{id}` key, `BONO` +10 XP delivered, second claim idempotent (one `reward_grant`).
- **Z** one `OTORGAMIENTO` event progresses all 4 overlapping challenges (3 DAILY + 1 WEEKLY) simultaneously.
- **AA** a `BONO` XP event does **not** feed challenge progress.

---

## J. DB reconciliation (`axioma_dev`, after seed)

| Item | Expected | Actual |
| --- | --- | --- |
| Templates in source of truth | 13 (9 DAILY + 4 WEEKLY) | 13 |
| Generator output | 1148 (1095 + 53) | 1148 |
| `v1-daily-*` definitions | 1095, all `ACTIVE` | 1095 `ACTIVE` |
| `v1-weekly-*` definitions | 53, all `ACTIVE` | 53 `ACTIVE` |
| Active V1 at current instant | 3 DAILY (10/20/30 XP) + 1 WEEKLY (100 XP) | exactly that |
| Reward bundles | 4 × `challenge-v1-xp-*`, one `XP_BONUS` each | 4 (10→365 defs, 20→365, 30→365, 100→53) |
| Non-`XP_BONUS` components on V1 defs | 0 | 0 |
| Duplicate `challengeKey` | 0 | 0 |
| `account_challenge` rows in dev | 0 (nobody has opened Desafíos) | 0 |
| Fixture drift (`catalog-gate-challenge-*`) | untouched | 2 rows untouched (1 RETIRED, 1 ACTIVE with obsolete grammar — skipped by materialisation) |

Second seed run against `axioma_dev`: fully idempotent (0 created, 1148 matched).

---

## K. Manual Android verification

**Not performed** — no Android device/emulator in this environment. Additionally, `axioma_dev` has **zero productive `xp_rule` rows** (see Release Preparation blocker 1), so live challenge progress cannot be exercised on-device even manually: challenge progress is 100% downstream of `OTORGAMIENTO` XP ledger events, which are never produced without an XP economy.

Per §34, no XP rules were invented to force manual progress. End-to-end progress, claim, overlap, and BONO-exclusion are covered by the new gate against real Postgres (§I, checks Y/Z/AA).

**Outstanding for QA when a device + XP economy are available** (§34 checklist): Home "Desafíos de hoy" populated; Competir shows 3 daily + 1 weekly; Diario/Semanal label; targets; XP reward; countdown sanity; progress bar with real XP events; COMPLETED → claim CTA; double-tap protection; claimed state; no Liga / Pregunta rápida regression.

---

## L. Release Preparation blockers — recorded, NOT solved here

### 1. CANONICAL XP ECONOMY CONFIGURATION — RELEASE PREPARATION BLOCKER

`axioma_dev` has no productive `xp_rule` / gamification program configuration. Challenge progress (and level progress, streaks, league points) all depend on `OTORGAMIENTO` XP ledger events that `XpGrantService` only produces when an activity matches an active `xp_rule`. DESAFÍOS V1 deliberately does **not** define XP-per-answer / per-question / per-topic / per-quick-question values (§23). A separate increment must author the canonical productive XP economy. This does not block the DESAFÍOS V1 catalog/provisioning/materialisation, which are complete and gate-verified.

### 2. CHALLENGE PERIOD ORCHESTRATION — RELEASE PREPARATION BLOCKER

The deterministic 365-day horizon (2026-08-30 → 2027-08-30) is sufficient for V1. There is **no** recurring challenge-generation cron (§9/§24 — none was built). Before the horizon is exhausted, Release Preparation must either extend the finite horizon (re-run the generator with a later end date) or add automatic provisioning. Separate from blocker 3.

### 3. COMPETITIVE SEASON ORCHESTRATION — RELEASE PREPARATION BLOCKER

Pre-existing, unrelated to challenge provisioning (`GameSeason` creation/finalization cadence). Not touched.

### 4. CHALLENGE ANALYTICS — RELEASE PREPARATION

No challenge analytics exist (assignment/materialisation, completion, claim, claim-failure, section-view). None added in this content block (§25). Recorded for a future instrumentation increment.

---

## M. Git

**Files changed / staged (DESAFÍOS V1 only):**

New:
- `apps/backend/src/gamification/challenges-v1-catalog.ts`
- `apps/backend/scripts/seed-challenges-v1.ts`
- `apps/backend/scripts/verify-challenges-v1-catalog-gate.ts`
- `apps/mobile/lib/challenges/challenge-card-view.ts`
- `docs/adr/DESAFIOS-V1-CLOSURE-REPORT.md`

Modified:
- `apps/backend/src/gamification/challenge.service.ts` (eager materialisation, visibility filter, reward preview)
- `apps/backend/src/gamification/challenge.controller.ts` (pass `rewardXpBonus`)
- `apps/backend/package.json` (2 scripts: `challenges:seed-v1`, `verify:challenges-v1-catalog-gate`)
- `packages/contracts/src/gamification.ts` (`ChallengeSummary.rewardXpBonus`)
- `apps/mobile/app/(tabs)/competir/index.tsx` (label / countdown / reward preview / CTA)
- `apps/mobile/scripts/verify-challenges-gate.ts` (fixture field + §18/§19/§20 coverage)

**Not staged:** all pre-existing residue (`.npmrc`, `app.json`, `onboarding.tsx`, icons, `auth-brand-header.tsx`, `apps/mobile/package.json`, `zetrynd-wordmark.tsx`, `.env-test-output/`, `LEF-BLOCK-VII-*`, `experiments/dg1-*`).

`git diff --check`: clean. One commit. **No push. No amend. No Railway.**

---

## N. Final verdict

DESAFÍOS V1 is content-complete on the existing Challenge infrastructure: 13 editorial templates, deterministic 1148-row 365-day provisioning, eager auto-assignment on GET, period-aware visibility, reward preview, and additive mobile polish — all gate-verified end-to-end against real Postgres, with the existing progress/claim/anti-farming behaviour intact and no schema or architecture change.

Live on-device demonstration is gated by the **CANONICAL XP ECONOMY CONFIGURATION** Release Preparation blocker (no productive XP rules in `axioma_dev`), which is out of scope for this content block by design.

READY FOR PRODUCT/TPM REVIEW
