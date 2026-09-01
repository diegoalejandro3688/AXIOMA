# COMPETIR V1 — CLOSURE REPORT

**Increment:** COMPETIR V1 — competitive experience refinement on top of the already-closed
LEF Block IV foundation: league visual identity, redesigned Liga card and Ranking, the
reusable Challenge row + compact hub preview + full Challenges screen, the
server-authoritative Quick Question 45 s timer + feedback, the correctness-conditioned
League Points economy, and the live-LP focus-refresh fix.
**Mode:** refinement pass on existing infrastructure. No re-architecture, no schema change,
no Prisma migration. Additive contract changes only.
**Date:** 2026-08-31.
**Base of closure:** `506692e12effc72ce2cfa329e93f2c35ed94f45d` — `style(competitive): tighten league card spacing`.
**Verdict:** **APPROVED / CLOSED.**

Formal final audit (read-only, full gate suite + product-lock inspection) returned
**APPROVED FOR FORMAL CLOSURE** with **no blockers**. This document is the closure record.

---

## A. Environment

| Item | Value |
| --- | --- |
| Monorepo | pnpm workspace — `apps/backend` (NestJS + Prisma 7.9.1 / Postgres), `apps/mobile` (Expo Router), `packages/contracts` (Zod) |
| Repo root | `C:/Users/usuario 4/Downloads/AXIOMA/app` |
| Branch | `ui-implementation-post-ui6` |
| Runtime DB (dev) | `axioma_dev` |
| Gates DB | `axioma_gates_dev` (via `.env.gates`, server `http://127.0.0.1:3001`) |
| HEAD at closure | `506692e` — `style(competitive): tighten league card spacing` |
| Relationship to LEF Block IV | Block IV ("Competir" foundation) was closed and tagged `lef-block-4-competir-complete`. COMPETIR V1 is a refinement pass on top of it, sibling to `DESAFIOS-V1-CLOSURE-REPORT.md` and `COSMETICS-V1-CLOSURE-REPORT.md`. |
| `git status` at closure | 8 modified + 6 untracked — **all** pre-existing unrelated residue (`.npmrc`, `apps/mobile/app.json`, `onboarding.tsx`, branding icons, `auth-brand-header.tsx`, `.env-test-output/`, `zetrynd-wordmark.tsx`, `LEF-BLOCK-VII-*` docs, `experiments/dg1-*`). **Left untouched.** |

---

## B. Scope closed — what constitutes Competir V1

| Area | Delivered |
| --- | --- |
| **Liga** | Real per-league emblem identity; redesigned active card (`LIGA ACTUAL` · name · emblem · `#rank` · live LP + trophy · backend zone · countdown · "Ver ranking"); finalized-season card (outcome · final rank from immutable history where available · final LP; no live zone/countdown/CTA). |
| **Ranking** | `TU POSICIÓN` summary card (emblem · rank · LP trophy · zone); top-3 modest emphasis (never gold for #1); rows 4–30 compact (avatar/frame/username/rank/LP/zone); current-user highlight + "Tú"; privacy/redaction preserved (discriminated union rendered verbatim); profile navigation only from presentable rows; "Ver más" pagination unchanged; zones backend-authoritative. |
| **Challenges** | 13-template V1 catalog (XP_BONUS only); 3 DAILY + 1 WEEKLY active at any instant; reusable `<ChallengeRow>` (`compact`/`full`) + `useChallengeClaim`; compact hub preview (1 DAILY + 1 WEEKLY, deterministic `challengeKey` ASC, one card, real CTA); full `desafios.tsx` screen (all DAILY + all WEEKLY, `challengeKey` ASC, shared components, no tabs/filters/stats/history/streaks). |
| **Quick Question** | Server-authoritative 45 s timer; explicit authoritative `POST /timeout`; correct → +2 LP, incorrect → 0, timeout → 0; correct-option reveal only after answer or confirmed timeout; feedback headlines + LP representation; visual clock icon in the timer pill; no auto-next. |
| **LP economy** | `RESPUESTA_VALIDADA` +1 (unconditional), `QUICK_QUESTION_ANSWERED` +2 iff correct, incorrect/timeout 0, `TEMA_COMPLETADO` +5; no daily cap; grants exactly once; correctness filter scoped to `QUICK_QUESTION_ANSWERED` only. |
| **Season context** | First 7-day season provisioning + hourly transition (activate/close) + per-minute ranking calculation/finalization, all via existing schedulers. |
| **Mobile navigation** | `competir/_layout.tsx` — 5 registered screens (`index`, `ranking`, `desafios`, `perfil/[username]`, `quick-question`); no nonexistent routes; no disabled temporary CTA; Loading/Error/Empty per section. |
| **Cosmetic / league-visual integration** | 7 league emblems + universal LP trophy asset; league frame granted permanently on first entry via the generic reward mechanism; manual equip; demotion never revokes; equipped frame never redefines current league. |

---

## C. Product lock — final decisions (frozen)

### C.1 Leagues

Exactly **7**, one tier per league, `tierOrder` 1–7 strict
(`apps/backend/src/gamification/cosmetics-v1-catalog.ts` → `LEAGUE_V1`):

| # | leagueKey | name |
| --- | --- | --- |
| 1 | `bronce` | Bronce |
| 2 | `plata` | Plata |
| 3 | `oro` | Oro |
| 4 | `esmeralda` | Esmeralda |
| 5 | `diamante` | Diamante |
| 6 | `maestro` | Maestro |
| 7 | `gran-maestro` | Gran Maestro |

**No subdivisions** (`Bronce II/III`, etc.). One division per league.

### C.2 Season / group / promotion grammar

| Parameter | Value | Source |
| --- | --- | --- |
| Season duration | **7 days** | `LEAGUE_V1_SEASON_DURATION_DAYS = 7` |
| Group size | **30** | `LEAGUE_V1_PARTICIPANT_GROUP_SIZE = 30` |
| Promotion | **top 6** (`top-percent:20` → `floor(30·0.20) = 6`) — ranks 1–6 | `LEAGUE_V1_PROMOTION_RULE` |
| Retention | ranks **7–24** | derived |
| Demotion | **bottom 6** (`bottom-percent:20`) — ranks 25–30 | `LEAGUE_V1_DEMOTION_RULE` |
| Bronce | **cannot demote** (`isLowestTier` → DEMOTION resolves to RETENTION) | `promotion-grammar.ts` |
| Gran Maestro | **cannot promote** (`isHighestTier` → PROMOTION resolves to RETENTION) | `promotion-grammar.ts` |
| G < 3 | 100 % RETENTION | `MINIMUM_PARTICIPANTS_FOR_PROMOTION = 3` |

**Promotion grammar is a single shared authority.** `apps/backend/src/gamification/promotion-grammar.ts`
(pure, no imports) is the sole home of the percentages / minimum-participants / tier-edge
rules. It is consumed identically by **all** callers:

- `leaderboard-finalization.service.ts` — persisted group close (`participationStatus`, snapshot outcome)
- `user/competitive-context.service.ts` — own live zone
- `user/competitive-leaderboard.service.ts` — every ranking-row live zone

No caller re-implements `parseTopPercent` / `parseBottomPercent` / zone math.

### C.3 LP economy (frozen)

Source of truth: `apps/backend/src/gamification/competitive-v1-config.ts` → `LEAGUE_POINT_RULES_V1`,
seeded idempotently by `competitive:seed-v1`.

| Activity / outcome | LP | Correctness-conditioned? |
| --- | --- | --- |
| `RESPUESTA_VALIDADA` (any validated Study answer) | **+1** | **No** — "actividad validada", never "respuesta correcta" (same semantics as XP) |
| `QUICK_QUESTION_ANSWERED`, correct, within 45 s | **+2** | Yes |
| `QUICK_QUESTION_ANSWERED`, incorrect, within 45 s | **0** (`NOT_REWARDABLE`, no ledger row) | Yes |
| Quick Question timeout (explicit `/timeout` or late `/answers`) | **0** — no reward event emitted | n/a |
| `TEMA_COMPLETADO` (resource/topic completion) | **+5** | No |

- **No daily cap** (`dailyCap: null` on all three rules).
- **Grants exactly once** — `idempotencyKey = league-grant:{participation.id}:{activity.id}`,
  `createIdempotent` + serializable retry; replay returns the same entry, balance not re-incremented.
- **Incorrect Quick Question**: the correctness filter lives **only** in
  `LeaguePointGrantService.grantForActivity`, guarded by
  `activity.activityType === 'QUICK_QUESTION_ANSWERED'`. `isCorrect` is read transiently from the
  existing `quick_question_attempt.isCorrect` column (`NOT NULL`) via `sourceEntityId`.
  **No schema change, no new column.** The domain fact is preserved: `quick_question_answered`
  is still emitted and still becomes a `ValidatedGamificationActivity` for an incorrect answer
  (XP and challenge "active-day" signals legitimately use it); only the LP grant is skipped.
- **Timeout**: structurally 0 LP — no `quick_question_answered` event → no activity → no grant.

### C.4 Quick Question (frozen)

- **45 seconds**, fixed — single backend constant `QUICK_QUESTION_TIME_LIMIT_MS = 45_000`.
- **Deadline is server-authoritative**, derived from `QuickQuestionSession.currentPresentedAt`
  (`currentPresentedAt + 45 s`, server clock). The client cannot set, reset, or extend it;
  `secondsRemaining`/timestamps sent by a client are ignored.
- `/next` **never** exposes the answer key (`correctAnswerOptionId` / `isCorrect`).
- **`/next` replay before expiry** re-presents the same pending question with **its original
  `deadlineAt`** (`currentPresentedAt` untouched — no new window).
- **Background / resume does not create a new 45 s window** — the mobile timer is derived from
  `Date.parse(deadlineAt)`, not `Date.now() + 45s`.
- **An answer after the deadline is not accepted as an answer** — it resolves as `TIMED_OUT`
  (no attempt, no event, 0 LP). A stale or modified client cannot answer late and earn a reward.
- **Explicit `POST /timeout` is authoritative**: `TIMED_OUT` (question consumed, 0 LP, returns
  the key for the reveal) / `NOT_EXPIRED` (returns `deadlineAt`, consumes nothing) /
  `NO_PENDING_QUESTION` (stable replay, `200`, never `500`).
- **The timed-out question is consumed** (`currentQuestionVersionId → null`) and does not
  reappear as the same pending question with the old deadline.
- **The answer key is returned only after the outcome is confirmed** (`ANSWERED` or a
  confirmed `TIMED_OUT`).
- **No fake `StudentResponse`, no fake `answerOptionId`, no fake incorrect attempt** — the
  answered-vs-timed-out distinction is the presence/absence of a `QuickQuestionAttempt` row.
- **Timeout is replay-safe**; **answer-vs-timeout is serialized** — `answer()`, `timeout()`,
  `next()`, `close()` all take `pg_advisory_xact_lock(23, 'qq-session:{id}')` (blocking, same
  lock) → a single authoritative outcome, loser gets `409` / `NO_PENDING_QUESTION`, never a
  half state, never `500`.
- **No auto-next** — "Siguiente pregunta" is an explicit `onPress`.
- Feedback: correct → "Respuesta correcta"; incorrect → "Respuesta incorrecta"; timeout →
  "Se acabó el tiempo". The correct option is revealed after the outcome; the chosen-wrong
  option is marked; adornments (check / x-circle) so the reveal is not colour-only.

### C.5 Challenges (frozen)

Source of truth: `apps/backend/src/gamification/challenges-v1-catalog.ts` (compile-time asserted).

- **13 templates** = 9 DAILY (3 easy / 3 medium / 3 high) + 4 WEEKLY.
- DAILY easy → **+10 XP**, medium → **+20 XP**, high → **+30 XP**; WEEKLY → **+100 XP**.
- **3 DAILY (one per difficulty) + 1 WEEKLY active** at any instant (deterministic per-period generator).
- Objective = cumulative **study-activity count** (`CUMULATIVE_COUNT`, `ALL_ACCOUNTS`); the
  worker counts valid `OTORGAMIENTO` XP events — never correct answers / subject / XP amount / LP.
- **Manual claim** (`POST /gamification/me/challenges/:id/claim`, advisory lock ns 20) — unchanged.
- Rewards **`XP_BONUS` only** — never COSMETIC / TITLE / LP.
- **No public difficulty / rarity** — `difficulty` is editorial-only, never a column, never surfaced.
- COMPLETED-unclaimed stays claimable; CLAIMED stays visible ("✓ Completado", quiet) until
  the backend stops returning it (no mobile expiration rule).
- Hub preview: exactly 1 DAILY + 1 WEEKLY, `firstByKey` = minimum `challengeKey` per type;
  one compact card; real `Pressable` CTA → `/(tabs)/competir/desafios`.
- Full screen: all DAILY + all WEEKLY, `challengeKey` ASC, `<ChallengeRow variant="full">` +
  `useChallengeClaim`; no tabs / filters / stats / history / streaks / `acceptedAt`.

### C.6 Ranking (frozen)

- Rank + zones are **backend-authoritative** (`CompetitiveContext` / `LeaderboardRow`,
  `promotion-grammar`). Mobile never computes rank or zone.
- **LP is the ranking metric** (`metricValue`).
- Top 3 modest emphasis (extra padding + sober accent border) — **never gold for #1**.
- Rows 4–30 compact: avatar / frame / username / `#rank` / level / `<RowLp>` / zone indicator.
- Current-user highlight (accent surface + border) + "Tú" badge.
- Privacy: `presentable: true|false` discriminated union rendered verbatim; redacted rows are
  a plain `View` (never `Pressable`), showing only `#rank` + "Perfil privado" + zone.
- Profile navigation only from a presentable row. "Ver más" pagination unchanged.

### C.7 Liga card (frozen)

Active: `LIGA ACTUAL` · league name (protagonist) · real `<LeagueEmblem tier>` ·
`#rank` (or "Actualizando posición…", never `#0`) · `<LeagueTrophy>` + `view.leaguePoints`
(live participation balance) · zone chip from `ctx.competitiveZone` only · `seasonCountdown` ·
"Ver ranking". **No** XP-to-next-league progress. **No** fake subdivisions.

Finalized: `TEMPORADA FINALIZADA` · outcome pill (Ascendiste / Te mantuviste / Descendiste /
Temporada finalizada) · `#finalRank` from `getLeagueHistory()` immutable snapshot (rendered
only when the snapshot exists) · final LP. **No** live zone, **no** countdown, **no**
"Ver ranking final" CTA.

Current-league text is authoritative and **independent of the equipped cosmetic frame** —
the hub uses `view.leagueTier` from `getLeagueParticipation`, never `cosmeticSlot === 'AVATAR_FRAME'`.

---

## D. Implementation history (Git — documented, not rewritten)

| Commit | Message |
| --- | --- |
| `0382581` | `feat(competitive): add league visual assets` |
| `804934d` | `feat(competitive): expose league context and answer key` |
| `3b5c18a` | `feat(competitive): redesign league card` |
| `0e2c4ba` | `feat(competitive): redesign league ranking` |
| `fc6c0fc` | `refactor(challenges): extract reusable challenge rows` |
| `1c9162a` | `feat(challenges): compact competitive challenge preview` |
| `111a298` | `feat(challenges): add full competitive challenges screen` |
| `e6ac536` | `feat(competitive): add quick question timed feedback` |
| `357f103` | `feat(competitive): enforce quick question timeout` |
| `c021c22` | `fix(competitive): reward quick question correctness` |
| `348bb60` | `fix(competitive): polish mobile hub and live league state` |
| `506692e` | `style(competitive): tighten league card spacing` |

12 sequential commits, `0382581^..506692e`, no gaps, conventional-commit messages, each with
the `Co-Authored-By: Claude Sonnet 5` trailer. Changeset = 48 files; a targeted scan confirms
**no** protected-residue path appears in any of the 12 diffs. No push.

---

## E. Contracts / data model

All Competir contract changes are **additive** and coordinated (single consumer — the mobile
client — updated in the same commit):

| Change | File | Nature |
| --- | --- | --- |
| `competitiveContextSchema += leagueTier: z.number().int().positive()` | `packages/contracts/src/user.ts` | additive field |
| `competitiveContextSchema += competitiveZone: competitiveZoneSchema` (enum def hoisted, schema identical) | `user.ts` | additive field |
| `quickQuestionNextResponseSchema.QUESTION_PRESENTED += deadlineAt: isoDateTime` | `quick-question.ts` | additive field |
| `answerQuickQuestionResponseSchema`: flat `{isCorrect, explanationContent}` → `discriminatedUnion('outcome', [ANSWERED{…}, TIMED_OUT{…}])` | `quick-question.ts` | **shape change** — old fields survive inside `ANSWERED` + a new tag |
| `timeoutQuickQuestionBodySchema` / `timeoutQuickQuestionResponseSchema` (new) + `POST /…/timeout` | `quick-question.ts` + controller | additive endpoint |

- The `answerQuickQuestionResponseSchema` union is a **deliberate, coordinated** shape change
  authorized by the Increment 9 spec (single consumer, producer + consumer updated in
  `357f103`, no external API consumers). Not an unintended break.
- `leagueTier` / `competitiveZone` / `deadlineAt` are additive-required on **response**
  schemas whose backend producers were updated in lockstep. No persisted payloads.
- **`/next` does not leak the answer key** — controller builds the response without
  `correctAnswerOptionId` / `isCorrect`; gates assert absence.
- **No Prisma migration, no `schema.prisma` change, no `*.sql`, nothing under
  `apps/backend/prisma/`** in the entire changeset. Increment 9 recovered the deadline from
  the existing `QuickQuestionSession.currentPresentedAt`; Increment 10 recovered correctness
  from the existing `quick_question_attempt.isCorrect`. **No schema drift attributable to this block.**

---

## F. Gate evidence (final audit)

All commands run at HEAD `506692e` against `axioma_gates_dev` (server on `:3001`).

| Gate | Result |
| --- | --- |
| `packages/contracts` build | **PASS** |
| backend `typecheck` / `lint` | **PASS** / **PASS** |
| mobile `typecheck` / `lint` | **PASS** / **PASS** |
| `verify:competitive-v1-gate` | **PASS** |
| `verify:league-season-foundation-gate` | **PASS** |
| `verify:league-ranking-gate` | **PASS** |
| `verify:league-participation-gate` (backend) | **PASS** |
| `verify:competitive-leaderboard-gate` | **PASS** |
| `verify:competitive-profile-foundation-gate` | **PASS** |
| `verify:competitive-profile-endpoint-gate` | **PASS** (after one auth-throttler 429 retry) |
| `verify:quick-question-foundation-gate` | **PASS** |
| `verify:quick-question-http-gate` | **PASS** |
| `verify:quick-question-engine-gate` | **FLAKY** — 5/8 runs pass; both failure modes non-product (see §G.1) |
| `verify:challenge-foundation-gate` / `-progress-gate` / `-claim-gate` / `challenges-v1-catalog-gate` | **PASS** |
| `verify:gamification-progression-gate` | **PASS** |
| `verify:gamification-serialization-conflict-gate` | **PASS** |
| `verify:gamification-integration-gate` | **FAIL — pre-existing, signature unchanged** (see §G.2) |
| mobile `verify:league-visual-gate` | **PASS** |
| mobile `verify:league-participation-gate` | **PASS** |
| mobile `verify:leaderboard-gate` | **PASS** |
| mobile `verify:challenges-gate` | **PASS** |
| mobile `verify:quick-question-gate` | **PASS** |
| mobile `verify:competitive-profile-gate` | **PASS** |
| `git diff --check` | **clean** (CRLF advisories only) |

Every substantive assertion — deadline authority, timeout consumption, 0-LP guarantee,
no fake attempt/event, answer-vs-timeout race, replay safety, `correctAnswerOptionId` only
post-outcome, LP amounts 1/2/5, correctness scoped to `QUICK_QUESTION_ANSWERED`, challenge
catalog counts/rewards, zone grammar single authority, redaction/pagination, focus refresh,
no optimistic LP — passes.

---

## G. Known non-blocking gate issues (documented, NOT fixed here)

### G.1 `verify:quick-question-engine-gate` — FLAKY, NON-BLOCKING TEST/INFRA DEBT

Two independent non-product causes:

**A. Shared-DB contamination.** `axioma_gates_dev` contains **14 orphan `PUBLISHED`
`question_version` rows with no `answer_option`** (`GATE.NEWCONTENT.Q.*` / `GATE.EDU.UNIT.Q0.*`,
created Aug 29–31 by **EDUCATION/content gates**, undeletable since LEF Block VII).
`service.next()` random-selects across all ~507 published rows; a ~2.8 % hit on an orphan
makes the gate's `answerOptionForQuestion` helper throw. Not caused by any Competir commit;
not a production-possible state (the editorial workflow forbids publishing a
`question_version` without an answer option).

**B. Over-specified assertion (Increment 9, §12b-G).**
`tNext3.questionVersion.id !== tNext1.questionVersion.id` after an explicit `/timeout`.
By design the explicit `/timeout` path leaves no attempt trace, so there is **no productive
global no-repeat rule**, and a re-pick from the 3-fixture isolated pool can legitimately
select the same question ~1/3 of the time. The substantive timeout invariants around it
(question consumed, old deadline not re-served, `currentPresentedAt` fresh) pass on **every** run.

**Classification: NON-BLOCKING TEST/INFRA DEBT.** Recommended follow-up: assert on
`deadlineAt` / `currentPresentedAt` freshness + consumption only (or enlarge the isolated pool);
purge the 14 orphan rows (owned by the EDUCATION gates).

### G.2 `verify:gamification-integration-gate` — PRE-EXISTING / OUT OF SCOPE

7 failing assertions, all in the `curriculum_topic_completed` chain:

```
FALLO  topicStatus COMPLETED
FALLO  exactamente 1 evento curriculum_topic_completed publicado
FALLO  payload.curriculumTopicId coincide con el tema real
FALLO  relay procesó al menos los 3 eventos nuevos (2 respuestas + 1 completado)
FALLO  validated_gamification_activity creada para el tema completado
FALLO  sourceEntityType == CurriculumTopicProgress
FALLO  sourceEntityId == curriculumTopicId
```

Cause: the `M1.NUMEROS.PORCENTAJES` fixture expects topic completion after 2 published
questions while the real topic now has 12. Signature identical to the long-standing known
failure. **Not caused by Competir. Not fixed (per instruction).**

---

## H. Android QA evidence

Physical device: **Samsung SM-A546E** — `R5CW71R7MTP`. No emulator.

**Directly confirmed:**

- Competir hub renders correctly; **dark mode correct**.
- Bronce league emblem renders.
- Live rank + LP visible on the hub.
- **Live LP consistency PASS** — after the focus-refresh fix: hub `#2 / 2 LP` == Ranking
  `#2 / 2 LP`. The originally-observed Android bug (hub `0 LP / Actualizando…` vs Ranking
  `10 LP / #1`) is **resolved architecturally** — root cause was "hub never refetched on
  focus" (the tab screen stays mounted; the pre-existing `useFocusEffect` only advanced the
  countdown clock). Fixed by a silent `useFocusEffect` → `loadLeague({ silent: true })` that
  keeps the last good data while it revalidates. **No polling, no optimistic `+2`, no local
  LP arithmetic** — LP always renders from `view.leaguePoints` (live participation balance).
  A known rank is not discarded during the silent refresh.
- Ranking rows rendered (avatar / frame / username / rank / LP).
- **Trophy readability approved** at the Increment-11 sizes (Liga 26, ranking row 20, QQ +2 22).
- Challenges compact preview approved; full Challenges screen approved.
- Quick Question base layout + timer approved; hub copy "Responde correctamente y gana LP" approved.
- Correct-answer feedback + `+2` LP trophy feedback rendered.
- Final compact League card height approved by the user after `506692e`.

**Not physically exercised (automated-gate + audit coverage only — does NOT block closure):**

- Incorrect-answer feedback path ("Respuesta incorrecta" + "Sin LP").
- Timeout feedback path ("Se acabó el tiempo" + "Sin LP") + LP unchanged.
- Background/resume timer behaviour (no new 45 s window).
- Timer urgency colour transitions (10–6 warning, 5–0 error) and the new clock icon on device.
- Finalized-season league card (requires a season to actually end on the device's data).

These are the same `LeaguePointGrantService` / `QuickQuestionService` logic and gate-asserted
UI strings exercised by passing gates; listed for QA completeness, not as risks.

---

## I. Deferred items — Release Preparation

**Not blockers for Competir V1 closure** (per the approved scope and the final audit).

### I.1 Recurring / automated season provisioning — RELEASE PREPARATION (important)

The current infrastructure can **activate** and **finalize** existing seasons
(`SeasonTransitionScheduler`, hourly) and calculate/finalize group rankings
(`LeaderboardCalculationScheduler` / `LeaderboardFinalizationScheduler`, per minute).
`competitive:ensure-first-season` provisions the **first** 7-day season (explicit, idempotent).

There is **no** job that automatically creates the **next** season row. Consequence: after the
first season finalizes, `getLeagueParticipation` returns a finalized / `NO_ACTIVE_SEASON`
state and the hub shows "TEMPORADA FINALIZADA" with no path back into competition until an
operator re-runs `competitive:ensure-first-season` or the recurrence job is built.
**Before any public launch that expects continuous competition, a productive strategy for
provisioning subsequent seasons must exist.** Self-documented as
`⚪ RELEASE PREPARATION BLOCKER` in `apps/backend/scripts/ensure-first-competitive-season.ts`.

### I.2 Other deferred

- Snapshot-backed final ranking at scale (the finalized card degrades gracefully today —
  it omits the position line when no snapshot exists).
- Difficulty-by-league.
- M2 suitability / preferences.
- Competir-specific analytics.
- Canonical XP economy configuration (shared blocker with DESAFÍOS V1 — challenge/level/streak
  progress all depend on productive `xp_rule` rows that `axioma_dev` does not yet have).
- Academic track / preferences.

None implemented. None block closure.

---

## J. Closure invariants (frozen — do not silently redefine)

**COMPETIR V1 IS CLOSED.** Future work must **not** treat any of the following as a "fix" or
a "correction" of this closure. Each is a product decision; changing it is a **new**
product/versioning decision:

1. **League count and order** — exactly 7: Bronce, Plata, Oro, Esmeralda, Diamante, Maestro,
   Gran Maestro; one tier per league.
2. **Promotion / demotion grammar** — 7-day season, groups of 30, top 6 promote, 7–24 retain,
   bottom 6 demote, Bronce never demotes, Gran Maestro never promotes; `promotion-grammar.ts`
   is the single shared authority.
3. **LP reward rules** — `RESPUESTA_VALIDADA` +1 (unconditional), `QUICK_QUESTION_ANSWERED`
   +2 iff correct, incorrect/timeout 0, `TEMA_COMPLETADO` +5; no daily cap.
4. **Quick Question 45 s authoritative timer** — fixed 45 s, server-authoritative deadline
   from `currentPresentedAt`, client cannot reset, background/resume does not create a new
   window, late answer cannot be rewarded, explicit timeout is authoritative and consumes
   the question.
5. **Challenge V1 catalog / economy** — 13 templates, 3 DAILY + 1 WEEKLY active,
   +10/+20/+30/+100 XP, XP_BONUS only, no public difficulty/rarity.
6. **Ranking LP metric** — LP is the ranking metric; rank and zones are backend-authoritative.

---

## K. Closure gate / orchestrator — decision

**None created.** The repo has **no** closure-orchestrator pattern: there is no
`verify:*-closure` / `verify:*-orchestrator` script, and no closure report in `docs/adr/`
introduces one. The equivalent sibling closures (`DESAFIOS-V1`, `COSMETICS-V1`) added a
**product content gate** only where they shipped new productive catalog content
(`verify:challenges-v1-catalog-gate`, `verify:cosmetics-v1-catalog-gate`). Competir V1 ships
**no new product** — it is a refinement of already-gated behaviour — and its invariants are
already covered by the existing `verify:competitive-v1-gate` plus the per-increment gate
suite listed in §F. Inventing a closure orchestrator here would contradict the repo
convention. Not done.

---

## L. Tag — decision

**No tag created.** The repo tags **block-level** closures
(`lef-block-4-competir-complete`, `lef-block-7-plataforma-editorial-complete`,
`profile-closure-complete`) but **not** sub-feature refinement closures: no
`desafios-v1-complete` or `cosmetics-v1-complete` tag exists despite their closure reports.
Competir V1 is a sibling refinement pass on top of the already-tagged
`lef-block-4-competir-complete`. Following the equivalent prior procedure exactly → no tag.

---

## M. Git

- **Files changed by this closure:** `docs/adr/COMPETIR-V1-CLOSURE-REPORT.md` (new — this file). Nothing else.
- **Staged set:** this one file only. No `git add .`.
- **Protected residue:** untouched, unstaged.
- **One commit:** `docs(competitive): close Competir V1`.
- **No push. No amend. No tag. No Railway interaction. No emulator.**

---

## FINAL VERDICT

Competir V1 delivers the full approved scope on top of the closed LEF Block IV foundation —
7-league product lock, single-authority promotion grammar, redesigned Liga card and Ranking,
the 13-template challenge system with hub preview + full screen, the server-authoritative
Quick Question timer, and the correctness-conditioned LP economy — with no Prisma migration,
no unintended contract break, no residue disturbance. The one Android bug found during QA
(stale hub LP/rank) is architecturally resolved and physically re-confirmed. The full gate
suite is green except one flaky gate (non-product causes) and one pre-existing unrelated
failure with an unchanged signature.

**COMPETIR V1 — CLOSED.**
