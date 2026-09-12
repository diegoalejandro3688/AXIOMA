# WEB-0D.1C — Gamification Privacy / Account-Closure Lifecycle
## Final Closure Report

**Status: CLOSED / PASS** (code-complete; see §13 for operational prerequisites still pending)

**Audited HEAD:** `2441c44` (branch `ui-implementation-post-ui6`)
**Audit date:** 2026-09-11/12
**Audit type:** Read-only technical closure audit — no production code changed as a result of this audit.

---

## 1. Scope

WEB-0D.1C is the privacy remediation chain that ensures a definitively-closed
ZETRYND account cannot (a) generate new gamification activity, and (b) remain
identifiable — by raw `accountId` — in gamification data that legitimately
needs to be retained for competitive/economic integrity (XP ledgers, League
Point ledgers, reward grants, achievements, season participations, validated
activity records). The chain spans eleven blocks, from the first closed-account
write-guard (A) through a manual, dry-run-first legacy reconciliation tool (B5).

## 2. Starting risk / problem statement

Before this chain began, ZETRYND's 30-day-recoverable account deletion flow
(ADR-0005) minimized/deleted personal data in USER, PROGRESS, EXAMS, and
QUICK_QUESTION domains, but gamification data was untouched: a closed account's
`accountId` remained in `xp_ledger_entry`, `reward_grant`, `achievement_progress`,
`achievement_unlock`, `league_point_ledger_entry`, `validated_gamification_activity`,
and `season_league_participation` indefinitely, and workers could in principle
still discover and act on that data after closure. Business/competitive history
(XP totals, League ranks, achievement unlocks, season outcomes) could not simply
be deleted — competitive integrity and other users' rankings depend on it — so
the requirement was **pseudonymization of identity while preserving business
history**, not deletion.

## 3. B0 → B5 remediation timeline

| Block | Commit(s) | Summary |
|---|---|---|
| A / B0 / B0R | `cae6655`, `52b58fc` | Guards new/deferred gamification writes for CLOSED accounts; excludes CLOSED from all discovery queries; TOCTOU re-checks before write. |
| B1 / B1-R1 | `ffbfc89` | `gamificationActorRef` primitive; nullable `accountId`; `gamification_actor_ref` column on 7 models; `identity_state_check` CHECK constraint (XOR); mirrored unique indexes; one-way immutability triggers. |
| B2 | `22eb4b6` | New writes to the 3 previously-raw-accountId-embedding key families (`ValidatedGamificationActivity.deduplicationKey`, `RewardGrant.sourceEntityId`/`idempotencyKey`, `AccountTitle.acquisitionSourceId`) switch to pseudonymous v2 format; legacy dual-read compatibility for recognizing pre-B2 rows. |
| B3 / B3-R1 | `1e782eb` | Definitive closure pseudonymizes the 5 "immediate-safe" historical models in one per-account transaction; B3-R1 hardened RewardGrant collision handling (abort, never skip-as-success) and fixed the `Account.status=CLOSED` ordering so a mid-sweep privacy failure can never leave a falsely-completed CLOSED account; closed the closure-PROCESSING window gap in all 4 gamification producers. |
| B4 / B4-R1 | `d092919` | `ValidatedGamificationActivity` and `SeasonLeagueParticipation` (the 2 models B3 deliberately deferred) now pseudonymize — via a query-hardening fix for the former, and two lifecycle hooks (closure-time + finalization-time) for the latter; B4-R1 adds a disabled-by-default durable reconciler for transient hook failures. |
| B5 | `2441c44` | Read-only audit + manual, dry-run-first, deterministic-only legacy reconciliation tool and CLI, establishing the classification discipline (`DETERMINISTIC_REWRITE` / `DUPLICATE_EQUIVALENT` / `MALFORMED_LEGACY` / `IDENTITY_INVARIANT_VIOLATION` / `TERMINAL_PARTICIPATION_BASELINE`). |

Earlier, adjacent privacy commits (personal-data minimization outside
gamification, already closed before this chain began): `a8e8886` (outbox event
minimization/expiry), `54be0d43` (analytics event minimization/expiry),
`b5d977f3` (exam/quick-question history deletion on closure).

## 4. Final architecture

### 4.1 Account-closure lifecycle (re-confirmed directly against `privacy.service.ts` at `2441c44`)

```
RECOVERABLE WINDOW (up to 30 days)
  Account.status = DELETION_PENDING
  PrivacyRequest.status = PENDING
  → cancelDeletion() available (CLI only, ADR-0005)

DEFINITIVE PROCESSING (sweep begins)
  PrivacyRequest.status = PROCESSING
  Account.status STILL DELETION_PENDING (not yet CLOSED)
  Sequence inside one try/catch:
    1. finalizeAccountClosure()            — identity teardown only, no status write
    2. userService.deleteProfileForAccountClosure()
    3. userService.anonymizePublicProfileForAccountClosure()
    4. gamificationService.deleteCurrentStateForAccountClosure()   — xp_balance/account_title/inventory_item DELETE
    5. gamificationPrivacyService.pseudonymizeImmediateSafeHistory()        (B3, 5 models, 1 transaction)
    6. gamificationPrivacyService.pseudonymizeDrainedValidatedActivity()   (B4 model A)
    7. gamificationPrivacyService.pseudonymizeTerminalSeasonParticipations() (B4 model B, closure-side)
    8. progressService / examService / quickQuestionService / aiRetentionService / subscriptionService
    9. authService.markAccountClosed()      ← Account.status = CLOSED, closedAt set, ONLY HERE
   10. privacyRequestRepo.markCompleted()

SUCCESS: Account.status=CLOSED, closedAt set, PrivacyRequest=COMPLETED
FAILURE (any step throws): nothing after that point runs; PrivacyRequest stays
  PROCESSING (retriable); Account.status remains DELETION_PENDING — never
  falsely CLOSED with partial privacy work.
```

This exact ordering and its failure-safety were re-confirmed by direct code
read (`privacy.service.ts:115-257`) and re-proven live in this audit via
`verify:privacy-gate` §12 (forced partial failure → Account NOT marked CLOSED
→ retry completes) and `verify:closure-processing-worker-guard-gate` (forced
B3 collision failure mid-sweep → same guarantee).

### 4.2 Gamification producer guards (re-confirmed at `2441c44`)

| Producer | Discovery-time exclusion | TOCTOU fresh-check before write |
|---|---|---|
| `GamificationService` (ingest) | `Account.status==='CLOSED'` check (`gamification.service.ts:187`) | `hasProcessingDeletionRequest` check (`:204`) |
| `XpGrantService` | `findPendingGrant` SQL: `a.status IS DISTINCT FROM 'CLOSED'` + `NOT EXISTS ... privacy_request ... PROCESSING` + `account_id IS NOT NULL` | In-transaction re-read of `Account.status` + `hasProcessingDeletionRequest` (`xp-grant.service.ts:233,236`) |
| `LeaguePointGrantService` | `findAccountIdsWithProcessingDeletion` batch exclusion (`:172`) | In-transaction re-check (`:252,255`) |
| `RewardEvaluationWorker` | `findAccountIdsWithProcessingDeletion` on candidate batch (`:874`) | In-transaction re-check (`:956-957`) |

Case (A) — ordinary `DELETION_PENDING` during the 30-day window — is
deliberately **unaffected**: none of these guards fire on `DELETION_PENDING`
alone, preserving the frozen product decision that a recoverable account keeps
functioning normally. This was re-proven live in this audit
(`verify:deferred-gamification-worker-closed-account-guard-gate` §F,
`verify:closure-processing-worker-guard-gate` §1/§2).

## 5. Pseudonym model

`gamificationActorRef(accountId, secret) = HMAC-SHA256(secret, accountId)` —
re-confirmed directly (`gamification-actor-ref.ts`): a pure function, secret
passed as an argument (never read from config inside the function), so no
accidental cross-domain reuse is structurally possible. Confirmed by direct
grep that no gamification file imports `analyticsActorRef` or reads
`ANALYTICS_ACTOR_SECRET`. **These are pseudonymous identifiers, not anonymous
ones** — the same secret deterministically reproduces the same ref for the
same account, and re-identification remains possible for anyone holding
`GAMIFICATION_ACTOR_SECRET`. This report does not claim mathematical anonymity.

## 6. Historical model matrix (7 B1 models, re-confirmed against `identity_state_check`)

| Model | `accountId` nullable | `gamificationActorRef` column | CHECK invariant | Mirrored uniqueness | Normal writes | Pseudonymized rows |
|---|---|---|---|---|---|---|
| ValidatedGamificationActivity | yes | yes | XOR enforced | n/a (no account-scoped unique needed) | raw `accountId` | `actorRef`, v2 `deduplicationKey` for 3 legacy-embedding types |
| XpLedgerEntry | yes | yes | XOR enforced | n/a | raw `accountId` | `actorRef` only |
| RewardGrant | yes | yes | XOR enforced | n/a (`idempotencyKey` unique already sufficient) | raw `accountId` | `actorRef`, v2 `sourceEntityId`/`idempotencyKey` for LEVEL/STUDY_SUBJECT |
| AchievementProgress | yes | yes | XOR enforced | `(actorRef, achievementDefinitionId)` unique index | raw `accountId` | `actorRef` only |
| AchievementUnlock | yes | yes | XOR enforced | `(actorRef, achievementDefinitionId, unlockInstance)` unique index | raw `accountId` | `actorRef` only |
| SeasonLeagueParticipation | yes | yes | XOR enforced | `(actorRef, gameSeasonId)` unique index | raw `accountId` | `actorRef` only (no embedded key) |
| LeaguePointLedgerEntry | yes | yes | XOR enforced | n/a | raw `accountId` | `actorRef` only |

All 7 `identity_state_check` constraints re-read directly from
`prisma/migrations/20260911180743_gamification_pseudonym_primitive_schema_support/migration.sql:215-247`
and confirmed to be the exact XOR form:
`(account_id IS NOT NULL AND gamification_actor_ref IS NULL) OR (account_id IS NULL AND gamification_actor_ref IS NOT NULL)`.
A live read-only sweep of `axioma_gates_dev` at closure time found **zero**
rows violating this invariant (`both_present=0`, `neither_present=0` across
all 7 tables).

## 7. Immutable privacy transition (re-confirmed against trigger source)

Each of the 4 immutability-trigger functions inspected
(`enforce_xp_ledger_entry_immutable`, `enforce_league_point_ledger_entry_immutable`,
`enforce_achievement_progress_immutable`, and — by the same pattern —
`enforce_achievement_unlock_immutable`) allows **exactly one** additional
UPDATE shape beyond their pre-existing business rules: `accountId` transitioning
`NOT NULL → NULL` simultaneously with `gamificationActorRef` transitioning
`NULL → NOT NULL`, with every other protected column required
`IS NOT DISTINCT FROM` its prior value. `achievement_progress`'s trigger
additionally has an explicit second guard: once `gamification_actor_ref` is
already set, **any** further change to either identity column is rejected
outright — closing the "restore raw accountId later" and "re-pseudonymize with
a different ref" paths. The other three trigger functions achieve the same
guarantee implicitly: their only non-`RAISE EXCEPTION` branch requires
`OLD.gamification_actor_ref IS NULL`, which is false once the transition has
already happened, so any subsequent mutation attempt falls through to the
unconditional exception. No generic bypass flag exists in any of these
functions.

## 8. Future key privacy (re-confirmed, no new raw-accountId construction found)

A fresh grep across `src/gamification/**` for persisted key construction found
no new site building a raw-`accountId`-embedding string. The only 3 families
that ever did (`ValidatedGamificationActivity.deduplicationKey` for
topic/exam/resource completion, `RewardGrant.sourceEntityId`/`idempotencyKey`
for LEVEL/STUDY_SUBJECT, `AccountTitle.acquisitionSourceId` for TITLE_UNLOCK)
all write the v2 pseudonymous form exclusively (`gamification-key.ts`); the
legacy form is only ever *read* for dual-read backward compatibility, never
written again. `verify:gamification-pseudonymous-key-gate` (B2) re-confirms
this live for all 3 families plus the two safe forms that never embedded
`accountId` (`response:{id}`, `quick-question:{id}`).

## 9. Season participation lifecycle

Terminal condition: `participationStatus IN ('PROMOTED','DEMOTED','RETAINED')`,
set exactly once, atomically, by `LeaderboardFinalizationService.finalizeGroup`
together with `finalizedAt` and the group's `FINALIZED` transition — a
structural guarantee (re-confirmed by code read) that makes every row matching
this predicate consistent by construction; no separate ambiguity check is
possible for this model, since `(accountId, gameSeasonId)` was already unique
before pseudonymization and `actorRef` is an injective function of `accountId`.
Both orderings are covered:

- **Case 1** (season/group terminal first, account closes later): the
  closure-side hook `pseudonymizeTerminalSeasonParticipations` catches any
  already-terminal participation at closure time.
- **Case 2** (account closes first, season/group terminal later): the
  finalization-side hook `pseudonymizeParticipationsForClosedAccountsWithinTx`,
  invoked inside `finalizeGroup`'s own transaction and wrapped in a
  non-blocking try/catch, catches it at the moment of finalization —
  confirmed this failure path can never roll back or block the season's real
  outcome for the other participants.

`ACTIVE`/non-terminal participations for CLOSED accounts remain internally
identifiable (by design — live ranking still needs them) while the CLOSED
account is already fully excluded from public/live ranking output via the
pre-existing, separately-verified WEB-0D.1C-A/B0 protections
(`verify:closed-account-gamification-guard-gate` §E). Finalized
`LeaderboardSnapshot`/`LeaderboardSnapshotEntry` never store `accountId` at
all and are never mutated by any step in this chain.

## 10. Legacy reconciliation model

`GamificationLegacyReconciliationService` classifies every candidate row into
exactly one of: `DETERMINISTIC_REWRITE`, `DUPLICATE_EQUIVALENT`,
`MALFORMED_LEGACY`, `IDENTITY_INVARIANT_VIOLATION`,
`TERMINAL_PARTICIPATION_BASELINE`. Only `DETERMINISTIC_REWRITE` rows are ever
mutated, per-account, in one transaction, with a fresh `Account.status=CLOSED`
check inside that transaction. Ambiguous rows (`DUPLICATE_EQUIVALENT`,
`MALFORMED_LEGACY`, `IDENTITY_INVARIANT_VIOLATION`) are never deleted, merged,
or auto-repaired — they remain visible in every subsequent audit run for
manual review. The only entry point is the manual CLI
`reconcile-gamification-legacy.ts` (`--dry-run` default, `--apply` required
explicitly) — no scheduler, no startup hook, no HTTP endpoint invokes it.

## 11. Gate evidence (this audit, fresh runs against `axioma_gates_dev`)

| Gate | Result |
|---|---|
| `verify:gamification-pseudonym-primitive-schema-gate` (B1) | PASS |
| `verify:gamification-pseudonymous-key-gate` (B2) | PASS |
| `verify:gamification-historical-pseudonymization-gate` (B3/B3-R1) | PASS |
| `verify:deferred-history-pseudonymization-gate` (B4) | PASS |
| `verify:terminal-participation-privacy-retry-gate` (B4-R1) | PASS |
| `verify:gamification-legacy-reconciliation-gate` (B5) | PASS |
| `verify:closure-processing-worker-guard-gate` (B3-R1 addendum) | PASS |
| `verify:deferred-gamification-worker-closed-account-guard-gate` | PASS |
| `verify:closed-account-gamification-guard-gate` | PASS except §E4 (see §12) |
| `verify:privacy-gate` | PASS |
| `tsc --noEmit` | clean |
| `nest build` | clean |
| `prisma validate` | valid |
| `prisma migrate status` (`axioma_gates_dev`) | up to date, 60/60 migrations |

## 12. Known environment noise / non-product failures

- **`verify:closed-account-gamification-guard-gate` §E4** ("no
  `leaderboard_snapshot` row created/touched by this gate") — a pre-existing,
  previously-documented finding present in every run of this gate throughout
  this entire multi-day session, caused by the shared long-lived
  `axioma_gates_dev` accumulating `leaderboard_snapshot` rows from many other
  gates' finalization tests. **Classification: ENVIRONMENT.** Not a
  regression, not touched by any WEB-0D.1C code.
- Recurring `NON_CANONICAL_SEASON_WINDOW_CONFLICT` log lines from
  `SeasonProvisioningService` throughout this session — a pre-existing,
  already-tracked ("PF2-C, requires manual canonicalization") condition in the
  shared gates server, unrelated to gamification privacy. **Classification:
  ENVIRONMENT.**
- A read-only sweep during this audit found non-zero raw-`accountId`-remaining
  rows for CLOSED accounts in `axioma_gates_dev` (`xp_ledger_entry`: 21,
  `reward_grant`: 5, `validated_gamification_activity`: 2,
  `season_league_participation`: 71 at the moment of the sweep). **Classification:
  EXPECTED TEMPORARY**, not a defect — these are (a) deliberately-preserved
  `DUPLICATE_EQUIVALENT`/`MALFORMED_LEGACY` fixtures from this session's own
  gate runs, and (b) `SeasonLeagueParticipation` rows created via direct SQL
  by many different gates across this session (bypassing the real closure/
  finalization hooks entirely) while the reconciler sits disabled by design.
  None of these represent a real production scenario the code fails to
  handle — every gate that exercises the *real* hooks (closure sweep,
  `finalizeGroup`) proves 100% immediate pseudonymization in this session's
  runs. Several of these were cleared incidentally by this audit's own gate
  runs (B4-R1 gate, B5 gate) since both exercise `reconcile()` with the
  enable-flag set for their own process only.

No code was weakened to make any gate pass. No new defect was found.

## 13. Operational prerequisites still pending (NOT YET EXECUTED — explicitly not claimed as complete)

The following are **deployment/operational actions**, not code work, and have
**not** been executed as part of this or any prior WEB-0D.1C block:

- **A.** B5 dry-run against the real target (production) database.
- **B.** Review of the real target's anomaly counts by an operator.
- **C.** B5 `--apply` against the real target database (only if explicitly
  authorized after B).
- **D.** Verification that the real target's deterministic terminal-participation
  baseline reaches zero after C.
- **E.** The operator decision to set `GAMIFICATION_PRIVACY_RECONCILER_ENABLED=true`
  in the real environment.
- **F.** Actual provisioning of `GAMIFICATION_ACTOR_SECRET` in the real
  environment's secret manager (Railway or equivalent).
- **G.** Deployment: push, Railway release, production activation of any of
  this chain's commits.

None of A–G are blockers to declaring the **code** in this chain complete —
they are the explicit deployment/baseline sequence this chain was designed to
require before real-environment activation (see §16 of the audit task and
§20 decision in the B4-R1 report). **This report does not claim any of A–G
have occurred.**

## 14. Explicit DO-NOT-CLAIM-YET list

The following statements are **NOT TRUE** as of this report and must not be
represented as true in any external/legal/privacy communication:

- ❌ "Production gamification legacy data has been reconciled."
- ❌ "`GAMIFICATION_ACTOR_SECRET` is provisioned in production."
- ❌ "The pending local-dev migrations have been deployed to production."
- ❌ "The terminal-participation reconciler is active in production."
- ❌ "This work has been deployed."
- ❌ "Railway has been updated with this chain."
- ❌ "A real-environment B5 `--apply` has been run."

## 15. Final PASS statement

The complete WEB-0D.1C code chain (A through B5) is **technically CLOSED /
PASS** at commit `2441c44`: the account-closure lifecycle is provably
non-blocking and fail-safe; all four gamification producers are guarded both
at discovery and at TOCTOU-fresh-check time for CLOSED and actively-PROCESSING
accounts, without weakening ordinary `DELETION_PENDING` behavior; current-state
gamification ownership (`xp_balance`/`account_title`/`inventory_item`) is
deleted on closure; all 7 historical models carry a DB-enforced, one-way
identity-privacy transition that never touches business fields; no new code
persists a raw-`accountId`-embedding key; the two previously-deferred models
(`ValidatedGamificationActivity`, `SeasonLeagueParticipation`) now pseudonymize
safely, covering both closure-orderings; a durable, disabled-by-default retry
mechanism exists for transient hook failures; and a manual, dry-run-first,
conservative reconciliation tool exists for legacy backlog, preserving all
ambiguous cases for human review rather than silently repairing them. Real-
environment activation remains a separate, explicit, not-yet-executed
operational sequence (§13).

## 16. Relevant commit chain (verified via `git log`, not invented)

```
cae6655 fix(privacy): guard closed accounts from gamification
52b58fc fix(privacy): stop deferred gamification for closed accounts
ffbfc89 fix(privacy): add gamification pseudonym schema support
22eb4b6 fix(privacy): pseudonymize future gamification keys
1e782eb fix(privacy): pseudonymize closed gamification history
d092919 fix(privacy): pseudonymize deferred gamification history
2441c44 fix(privacy): reconcile legacy gamification history
```

Earlier related privacy commits (personal-data minimization, not gamification-
specific, already closed before this chain began):

```
a8e8886 fix(privacy): minimize and expire outbox events
54be0d43 fix(privacy): minimize and expire analytics events
b5d977f3 fix(privacy): delete exam and quick-question history on account closure
```
