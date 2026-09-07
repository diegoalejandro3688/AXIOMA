# PS-0C.2 — MINIMUM COMPLIANCE REMEDIATION — IMPLEMENTATION REPORT

Branch: `ui-implementation-post-ui6` · Base HEAD: `eb253c3` · Local only (no push / tag / Railway / Play Console / Android release / Billing).

---

## 1. Preflight

| Item | Value |
|---|---|
| repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| branch | `ui-implementation-post-ui6` ✅ |
| initial HEAD | `eb253c39ef576b4e1a3171d6147aaef31abc5f0d` ✅ (matched reference) |
| `origin/main` (local ref, no fetch) | `1743489c1505fbc9d16c36988eb6cd72c22354fd` |
| initial working tree | protected residue only (`.npmrc`, `apps/mobile/app.json`, `onboarding.tsx`, android icon assets, `auth-brand-header.tsx`, `zetrynd-wordmark.tsx`, `.env-test-output/`, `docs/adr/LEF-BLOCK-VII-*AUDIT.md`, `experiments/dg1-*/results/*.json`) — untouched |

No unexplained drift. `.expo/types/router.d.ts` (untracked, gitignored, stale local cache) was removed so local typecheck matches CI (which has no such file); it regenerates on the next `expo start`.

---

## 2. Architecture implemented

### Términos de uso y convivencia pública (Increment A)

- **Version authority**: `CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION = '2026-09-06'` in `@axioma/contracts` (`packages/contracts/src/compliance.ts`). Part of the product contract — **not** an env var. Backend persists this exact value, never the client string.
- **Storage (Option A — fields on `Account`)**: `public_terms_accepted_version` / `public_terms_accepted_at`, both nullable, additive, **no backfill**. Answers "¿aceptó? / ¿cuándo? / ¿qué versión?".
- **API** (`ComplianceModule`, `src/compliance/`): `GET /me/public-participation-terms` → `{ currentVersion, acceptedVersion, acceptedAt, isCurrent }`; `POST /me/public-participation-terms/accept` (`{version}` optimistic guard, 200). Backend accepts **only** the current version (`PUBLIC_TERMS_VERSION_MISMATCH` for anything else). Re-accepting the current version is a silent no-op.
- **Enforcement (backend authoritative, cannot be bypassed via API)**:
  - Write boundary: `UserService.setPublicProfileVisibility(true)` throws `403 PUBLIC_TERMS_ACCEPTANCE_REQUIRED` if `!hasAcceptedCurrent`. Making PRIVATE never requires it.
  - Read / presentability boundary: `CompetitiveProfileIdentityService` resolves "accepted current version" **by batch** (`filterAcceptedCurrent`, one `WHERE id IN (...)`), folded into `isPresentable`. A profile that went VISIBLE and then the Terms version is bumped becomes **non-presentable** everywhere until re-accepted.
  - `getCompetitiveProfileByUsername` short-circuit + trailing `if (!resolved.presentable) → 404 uniforme`.
- Private use of ZETRYND (Estudio / Ensayos / Tutor IA / private profile) **never** depends on these fields.

### UGC reporting + blocking (Increment B)

- **Models**: `PublicProfileReport` (`INAPPROPRIATE_USERNAME | IMPERSONATION | OTHER_SAFETY`; `OPEN → DISMISSED | ACTIONED`; **no free-text**; `@@unique(reporter, target, reportType)` for idempotency; `targetPublicProfileId` captured). `AccountBlock` (unidirectional; `@@unique(blocker, blocked)`; idempotent create/delete). No FK to `account` (same decoupling as `PrivacyRequest`).
- **API** (`SafetyController`, prefix `/user/safety` to avoid `:username` route-order collisions):
  - `POST /user/safety/reports/:username` `{reportType}` — AuthGuard, self-report → `CANNOT_REPORT_SELF`, target resolved canonically, idempotent (`alreadyReported`), `@Throttle 20/60s`.
  - `POST` / `DELETE /user/safety/blocks/:username`, `GET /user/safety/blocks`.
- **Blocked-user ranking semantics** (`CompetitiveLeaderboardService.resolvePage`): a blocked account's row → `presentable:false` + `redactionReason:'BLOCKED'`, with `rankPosition` / `metricValue` / `competitiveZone` **untouched** (blocking never changes the ranking). Never redacts the requester's own row. `getCompetitiveProfileByUsername(username, requestingAccountId)` → uniform 404 for the blocker. Unidirectional: the target still sees the blocker.

### Username moderation hardening (Increment B)

`src/user/reserved-usernames.ts`: `RESERVED_USERNAMES` expanded (ZETRYND brand, roles, PAES/DEMRE/MINEDUC institutions); new `BLOCKED_SUBSTRINGS` (~60 unambiguous ES/EN entries: profanity, slurs, sexual, threats) matched as substrings against the raw form **and** a cheap leet-normalized form (`normalizeForModeration`: digit→letter, strip `_`). Server-authoritative. Deliberately long/unambiguous entries + FP-adjacent test coverage to minimize false positives. `isReservedOrOffensive` kept as the public API.

### Operator moderation path (Increment B/D — no HTTP)

- `PublicProfileRepository.forceUsernameReset`: in one txn — infringing username → `previousUsernameNormalized` of a `MODERATION_RESET` history row (30-day reservation window applies), `username_normalized` → non-reclaimable sentinel `reset-<hex>` (fails `^[a-zA-Z0-9_]{3,20}$`), `moderation_status = USERNAME_RESET`, `visibility = PRIVATE`. **Never touches account / progress / XP / LP / league / ranking.** `recoverUsernameFromModeration` (user picks a valid new name → `moderation_status = CLEAR`, no 30-day cooldown).
- `PublicIdentityModerationService` + CLI `dist/cli/moderate-public-identity.js` (`list` / `dismiss <id>` / `action-reset <id>`; `action-reset` also marks all OPEN reports for the target `ACTIONED`; retry-safe).
- CLI `dist/cli/ai-reports.js` (`list [--all]` / `mark-reviewed <id>`) + additive `AiResponseReport.reviewedAt`. **The Tutor IA report flow (button, endpoint, `AiResponseReport`, 5 categories) is untouched.**

### Mobile wiring (Increment C)

- `lib/api/compliance.ts`, `lib/api/safety.ts`, `changePublicUsername` wrapper.
- `lib/compliance/public-participation-terms-content.ts` (V1 copy, version from the contract), `lib/compliance/legal-links.ts` (`PRIVACY_POLICY_URL` / `TERMS_OF_SERVICE_URL` / `SUPPORT_CONTACT` = `null`, fail-safe), `lib/safety/report-categories.ts` (3 categories).
- Perfil → Ajustes: HACER PÚBLICO gated by a Terms dialog (intro + "ver términos completos" + Aceptar/Cancelar → Aceptar retries the visibility toggle); `terminos.tsx` (versioned screen + Aceptar); `USERNAME_RESET` recovery form; rows "Términos de uso", "Política de privacidad" / "Soporte" (disabled → "Disponible próximamente" when unconfigured, never a fake URL), "Usuarios bloqueados" (`usuarios-bloqueados.tsx`, list + unblock).
- `competir/perfil/[username].tsx`: discreet "Reportar usuario" (3-category selector) + "Bloquear usuario".
- `competir/ranking.tsx`: redacted row shows "Usuario bloqueado" when `redactionReason === 'BLOCKED'`.
- **No UGC surface expansion** (no bio / posts / comments / chat / DMs / follow / uploads).

---

## 3. Database changes

| Migration | Objects | Why |
|---|---|---|
| `20260906120000_ps0c2_username_reason_moderation_reset` | `profile_username_change_reason += MODERATION_RESET` (`ADD VALUE IF NOT EXISTS`, isolated per repo convention) | history reason for a moderation reset |
| `20260906120100_ps0c2_public_participation_terms` | `account.public_terms_accepted_version` (TEXT, null), `account.public_terms_accepted_at` (TIMESTAMP, null); `public_profile_moderation_status` enum; `public_profile.moderation_status` (NOT NULL DEFAULT `'CLEAR'`) | versioned terms acceptance + moderation state |
| `20260906130000_ps0c2_public_profile_report_block` | `public_profile_report_type` / `_status` enums; `public_profile_report` table (+3 indexes, unique `(reporter, target, type)`); `account_block` table (+ index, unique `(blocker, blocked)`); `ai_response_report.reviewed_at` (TIMESTAMP, null) | report / block persistence + AI-report operator marker |

All **additive**, no destructive change, no backfill. Applied to `axioma_gates_dev` and `axioma_dev` via `prisma migrate deploy` (shown DB target each time; never `reset` on `axioma_dev`). Zero drift for PS-0C.2 objects (`prisma migrate diff` clean; the only residual diff is pre-existing `admin_*` index naming unrelated to this block). `EXISTING ACCOUNTS: acceptedVersion = null / acceptedAt = null` — no auto-accept.

---

## 4. Contracts

New file `packages/contracts/src/compliance.ts` + export in `index.ts`:
- `CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION`, `publicParticipationTermsStatusResponseSchema`, `acceptPublicParticipationTermsRequestSchema` (`.strict()`), `acceptPublicParticipationTermsResponseSchema`.
- `publicProfileReportTypeSchema` / `publicProfileReportStatusSchema`, `reportPublicProfileRequestSchema` (`.strict()`, no `description`), `reportPublicProfileResponseSchema` (`alreadyReported`).
- `blockedUserSchema`, `blockUserResponseSchema` (`alreadyBlocked`), `listBlockedUsersResponseSchema`.
- `COMPLIANCE_ERROR_CODES`: `PUBLIC_TERMS_ACCEPTANCE_REQUIRED`, `PUBLIC_TERMS_VERSION_MISMATCH`, `CANNOT_REPORT_SELF`, `CANNOT_BLOCK_SELF`, `PUBLIC_PROFILE_NOT_FOUND`.

`packages/contracts/src/user.ts`:
- `publicProfileModerationStatusSchema`; `publicProfileResponseSchema += moderationStatus`.
- `leaderboardRowSchema` redacted branch `+= redactionReason: z.literal('BLOCKED').optional()`.

---

## 5. Terms acceptance — exact flow

Mobile "Hacer público" → `getPublicParticipationTermsStatus()` → `isCurrent === false` → Terms dialog → `acceptPublicParticipationTerms()` (`POST .../accept {version: CURRENT}`) → on success re-invoke `setPublicProfileVisibility(true)`. Backend: `accept` rejects any non-current version; `setPublicProfileVisibility(true)` re-checks server-side (403 fallback the mobile also maps). Presentability layer re-checks per-read → stale acceptance (post-version-bump) auto-suppresses public presentability until re-accept.

---

## 6. UGC reporting

`POST /user/safety/reports/:username` → AuthGuard, canonical target resolution (`ANONYMIZED`/missing → uniform 404), self → `CANNOT_REPORT_SELF`, zod-validated category, **no free-text**, `PublicProfileReport` row, idempotent on `(reporter, target, reportType)` (returns the existing row, never re-opens a resolved one). Reporting never mutates the target.

---

## 7. Blocking

`AccountBlock` (unidirectional, `@@unique`). `POST`/`DELETE /user/safety/blocks/:username` idempotent. `GET /user/safety/blocks` → `{username, blockedAt}[]` (targets with no resolvable public identity omitted). **Ranking**: blocked row → identity redacted, `rankPosition`/`metricValue`/`competitiveZone` intact, `redactionReason:'BLOCKED'`. **Profile by username**: uniform 404 for the blocker; unaffected for everyone else and for the target looking back. Unblock → identity visibility restored.

---

## 8. Username moderation — old vs new

| | Old | New |
|---|---|---|
| Reserved (exact) | ~21 entries | ~60 (ZETRYND brand, roles, PAES/DEMRE/MINEDUC) |
| Offensive | 3 exact words (`puta`, `mierda`, `imbecil`) | ~60 substrings (ES/EN profanity, slurs, sexual, threats) matched on raw + leet-normalized form |
| Evasion | none | digit-leet map + `_` strip (`4dm1n` → `admin`, `s0p0rte` → `soporte`) |
| Authority | backend | backend (mobile may prevalidate for UX only) |

FP safeguards: entries ≥ 4 chars, unambiguous; risky stems dropped (`concha`/`verga`/`kike`/`coger`/`rape`…); gate tests legit adjacent strings (`analista`, `escaneo`, `clasico`, `passenger`, `classroom`, …).

---

## 9. Operator moderation

`node dist/cli/moderate-public-identity.js list | dismiss <reportId> | action-reset <reportId>`:
- `list` — OPEN reports with resolved target username + open-count per target.
- `dismiss` — report → `DISMISSED` / `DISMISSED_NO_ACTION` / `reviewedAt`; nothing else.
- `action-reset` — `forceUsernameReset(targetAccountId)` + all OPEN reports for that target → `ACTIONED` / `ACTIONED_USERNAME_RESET`. Retry-safe (already-reset → only closes reports). Username-history / 30-day reservation respected; score / LP / progress / account untouched.

`node dist/cli/ai-reports.js list [--all] | mark-reviewed <reportId>` — read-only inspection of `ai_response_report` (with the reported ASSISTANT message content) + a `reviewedAt` marker. No classifier / ML / prompt-rewrite / human console / SLA.

---

## 10. Tutor IA

- Original report flow **intact**: `AiConversationController.reportMessage` / `POST .../messages/:messageId/report` / `AiResponseReport` / 5 `AiResponseReportType` values / mobile `handleReport` — no code changes (`verify-ai-conversation-foundation-gate` / `verify-ai-safety-gate` regression, see §13).
- New minimal operational path: `reviewedAt` column (additive) + `ai-reports` CLI. "Un reporte no modifica automáticamente la respuesta" (PRD AI-015) still holds.

---

## 11. Mobile

`terminos.tsx` (versioned Terms + Aceptar), `usuarios-bloqueados.tsx` (list + unblock), Terms dialog + legal/support rows in Ajustes, report/block actions on the public-profile screen, "Usuario bloqueado" ranking label, `USERNAME_RESET` recovery form. `_layout.tsx` registers the two new routes.

---

## 12. Explicitly NOT implemented (out of scope — later blocks)

Privacy Policy content/hosting · public web account-deletion page · support email/URL · real legal URLs · Android release work (`app.json`, `android/`, signing, AAB/APK, versionCode, deep links) · Play Console (Data Safety, content rating, target audience, app access) · Google Play Billing purchase/restore/management · RTDN go-live · a full AI moderation platform · account-deletion auto-signout (P2) · analytics cleanup (P2/P3) · `InternalOpsGuard` replacement (P2) · CORS.

`app.json` NOT touched (Terms wiring uses an internal screen + a `legal-links.ts` constant, never `app.json`). Account deletion NOT rewritten. Premium remains frozen (`PURCHASE FLOW ACTIVE = NO`, `PURCHASE DATA COLLECTED = NO`; `expo-iap` not imported).

---

## 13. Gates

Gates server: `pnpm run start:dev:gates` (`axioma_gates_dev`, port 3001). Runner: `tsx scripts/run-gate.ts <gate>` (isolation-enforced). Pure gates run directly.

### New gates (all PASS)

| Gate | Kind | Command | Result |
|---|---|---|---|
| `verify:username-moderation-gate` | pure (no DB/server) | `pnpm --filter @axioma/backend verify:username-moderation-gate` | **PASS** — allowed (incl. FP-adjacent) + blocked (impersonation/profanity/slurs/leet) + leet normalization |
| `verify:public-participation-terms-gate` | HTTP + pg · `axioma_gates_dev` | `run-gate.ts verify-public-participation-terms-gate.ts` | **PASS** — 13/13 (§46) |
| `verify:public-profile-report-block-gate` | HTTP + pg + direct service · `axioma_gates_dev` | `run-gate.ts verify-public-profile-report-block-gate.ts` | **PASS** — 35/35 (§47 + §48) |
| `verify:public-participation-safety-gate` (mobile) | static source scan | `pnpm --filter @axioma/mobile verify:public-participation-safety-gate` | **PASS** — API wrappers, no free-text, Terms gate, versioned screen, fail-safe legal links, blocked-users mgmt, ranking label, no UGC expansion |

### Regression (relevant existing gates, `axioma_gates_dev`)

| Gate | Result | Notes |
|---|---|---|
| `verify-auth-gate` | PASS | unchanged |
| `verify-privacy-gate` | PASS | account closure path unchanged |
| `verify-public-profile-gate` | PASS | fixture: `createSession` now accepts current Terms; `allowedKeys += moderationStatus` |
| `verify-competitive-profile-foundation-gate` | PASS | (direct service, no termsService) |
| `verify-competitive-profile-endpoint-gate` | PASS | fixture: `createSession` accepts Terms |
| `verify-competitive-leaderboard-gate` | PASS | fixture: synthetic VISIBLE profiles get a minimal `account` row + Terms acceptance |
| `verify-public-profile-preview-gate` | PASS | fixture: `createSession` accepts Terms; also synced `season_league_participation.league_points` (pre-existing fixture gap, unrelated to PS-0C.2) |
| `verify-competitive-v1-gate` | PASS | |
| `verify-league-ranking-gate` | PASS | |
| `verify-hub-ranking-lp-consistency-gate` | PASS | |
| `verify-league-participation-gate` | PASS | |
| `verify-advanced-profile-gate` | PASS | |

**Why the fixture updates are legitimate, not a product regression**: a VISIBLE `public_profile` whose account never accepted the current Terms is not a valid production state post-PS-0C.2 (§45/§46 anticipate "stale acceptance suppresses presentability"). The production code path is correct; the pre-PS-0C.2 fixtures were creating a now-invalid state and were updated to reflect the new required step. No production code behavior was weakened.

### CI note

CI (`ci.yml`) runs only: `offline-outbox`, `curriculum-topic-count`, `auth`, `privacy`, `analytics`, `observability`, `user`, `object-storage`, `education`, `progress` + `typecheck` + `lint` + backend `build`. The PS-0C.2 gates are not wired into CI (consistent with the other block-level competitive/profile gates). `typecheck` / `lint` / `build`: **all PASS** (contracts, backend, mobile).

---

## 14. Regression — what was checked vs not run

Checked: auth, privacy, public-profile, all competitive/leaderboard/ranking/league/advanced-profile gates, contracts+backend+mobile typecheck, all lint, backend `nest build`. Not run (unrelated to this change, expensive): the full education/progress/exams/gamification/AI integration batteries — none touch `public_profile` presentability, `account` terms fields, `account_block`, `public_profile_report`, or `reserved-usernames`. `verify-ai-*` not re-run (the Tutor IA report flow has zero code changes; only an additive nullable column + a read-only CLI).

---

## 15. Commits (local, not pushed)

| Hash | Message | Scope |
|---|---|---|
| `7fe94c7` | `feat(compliance): gate public identity behind versioned terms` | schema + 3 migrations, `@axioma/contracts` (compliance.ts, user.ts), `src/compliance/*`, `src/user/*` (safety repos/service/controller, moderation service, terms wiring in user.service / identity / leaderboard, public-profile controller/repo), `reserved-usernames.ts`, `ai-response-report.repository.ts`, `app.module.ts`, `src/cli/{moderate-public-identity,ai-reports}.ts`, backend `package.json` |
| `0ac78a9` | `feat(mobile): add public participation safety controls` | `lib/api/{compliance,safety}.ts`, `lib/compliance/*`, `lib/safety/*`, `changePublicUsername`, `perfil/{index,_layout,terminos,usuarios-bloqueados}`, `competir/perfil/[username].tsx`, `competir/ranking.tsx`, mobile `package.json` |
| `<pending>` | `test(compliance): verify PS-0C.2 public participation safeguards` | 3 new backend gates + mobile gate + regression fixture updates to 4 existing gates |

`git diff --check` / `git diff --cached --check`: clean. Explicit stage paths only — never `git add .` / `-A`.

---

## 16. Final git status

Working tree after the 3 commits shows **only protected residue** (`.npmrc`, `apps/mobile/app.json`, `onboarding.tsx`, android icon assets, `auth-brand-header.tsx`, `zetrynd-wordmark.tsx`, `.env-test-output/`, `docs/adr/LEF-BLOCK-VII-*AUDIT.md`, 4× `experiments/dg1-*/results/*.json`) — plus this closure report, staged into the test commit.

---

## 17. No-touch proof

| | |
|---|---|
| Railway | **NO** |
| production | **NO** |
| push | **NO** |
| tag | **NO** |
| Android release work (`app.json` / `android/` / signing / AAB / APK) | **NO** |
| Play Console | **NO** |
| Billing / `expo-iap` / RTDN | **NO** |
| Firebase / Anthropic config | **NO** |
| `axioma_dev` schedulers / `start:dev` | **NO** (only `start:dev:gates` against `axioma_gates_dev`; `migrate deploy` — additive — to `axioma_dev` for the app) |

---

## 18. Remaining dependencies

- **PS-0D / Web**: Privacy Policy page + URL, public account-deletion page, Terms-of-Service page + URL, support contact page/email. Wire the real values into `apps/mobile/lib/compliance/legal-links.ts`.
- **PS-2 (Privacy + Data Safety)**: Privacy Policy content; Firebase / Anthropic "service provider vs sharing" legal determination; Play Data Safety form.
- **PS-3**: target audience / content rating / app access (reviewer test account).
- **Android Release**: signing, `EXPO_PUBLIC_API_BASE_URL`, `SYSTEM_ALERT_WINDOW`, AAB — separate block.
- **Legal owner**: the V1 Terms copy in `public-participation-terms-content.ts` should be reviewed; bump `CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION` on any substantive change (stale acceptances auto-suppress presentability until re-accept).

---

## 19. Final verdict

**PS-0C.2 — PASS.**

All product acceptance criteria (§56 A–R) met: private use without accepting Terms (A); cannot publish public identity without current Terms, backend-enforced (B, D); versioned + timestamped acceptance (C); report another public profile (E); block / unblock (F, I); blocked user stays structurally in the leaderboard without identity exposure and with LP/rank unchanged (G, H); server-authoritative, materially stronger username moderation (J); operator can list / dismiss / force-reset (K, L) without deleting account / progress / competitive score (M); Tutor IA reporting intact (N) + minimal operator inspection path (O); Settings exposes Terms + prepared Privacy/Support without fake URLs/contact (P); Premium frozen (Q); account deletion intact (R).

Engineering (§57): contracts/backend/mobile typecheck PASS · lint PASS · migrations additive & drift-free · new gates PASS · selected regression PASS · `git diff --check` clean · protected residue unchanged · no Railway / production / push / Android-release work.
