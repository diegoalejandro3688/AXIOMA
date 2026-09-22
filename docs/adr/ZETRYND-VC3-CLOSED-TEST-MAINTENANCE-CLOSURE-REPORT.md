# ZETRYND vc3 — Closed Test Maintenance Closure Report

## 1. Scope

Three approved changes for the vc3 Closed Testing maintenance release:

- **F01** — Quick Question timer: 45 s → 60 s universal.
- **F02** — Android navigation bar: remove the gray contrast scrim Android overlays on the edge-to-edge navigation bar.
- **F03** — Quick Subject Selector: let Quick Question be scoped to 2–5 of the 5 catalog subjects.

No other product change is part of vc3.

## 2. Base

`9bc96715eb89d1cd67e4c1fa6e7900073252bb75` — `feat(entitlement): add persistent Play reviewer grant`, branch `ui-implementation-post-ui6`.

## 3. F01 — Quick Timer 60s

- `QUICK_QUESTION_TIME_LIMIT_MS = 60_000` (`apps/backend/src/gamification/quick-question.service.ts`) — sole backend authority, unchanged architecture (`deadlineAt = currentPresentedAt + limit`, server clock only).
- Mobile cosmetic constant (`QUICK_QUESTION_TIME_LIMIT_SECONDS`) updated to match; warning (10s) / urgent (5s) thresholds unchanged.
- Gates: `verify:quick-question-foundation-gate`, `verify:quick-question-engine-gate`, `verify:quick-question-http-gate`, mobile `verify:quick-question-gate` — **PASS**.
- Physical QA on Samsung — **PASS** (per operator report).

## 4. F02 — Android Navigation Bar

- New Expo config plugin `apps/mobile/plugins/with-android-nav-bar-contrast.js`, registered in `app.json → expo.plugins`.
- Sets `android:enforceNavigationBarContrast="false"` on `AppTheme` via `withAndroidStyles` — no immersive/fullscreen, no hidden system bar.
- Physical QA on Samsung — **PASS**: 3-button navigation, dark mode PASS, light mode PASS, gray scrim removed, Back/Home/Recents remain visible and usable.

## 5. F03 — Quick Subject Selector

- 2–5 of the 5 real catalog subjects (`matematica`, `matematica-m2`, `lenguaje`, `ciencias`, `historia`); default = all 5.
- Persistence: local (`AsyncStorage`), namespaced by `accountId` — no backend table, no migration.
- Backend filter is optional and additive (`nextQuickQuestionBodySchema.subjectKeys`) — omitting it preserves vc2 behavior exactly (backward compatible).
- Selection algorithm: subject chosen first (Fisher-Yates shuffle among the selected subjects), then a question within that subject — raw pool size per subject never dominates which subject gets served. Bounded per-subject fallback if the first draw has no eligible content (never unbounded retry).
- A question already presented is never replaced by a later filter change; only the next selection respects the new filter.
- Gates: engine gate section 12d (7/7), mobile gate sections 14–16 (16/16) — **PASS**.
- Physical QA on Samsung — **PASS**: selector visible, 5 subjects default, Quick works physically, subject filtering flow accepted.

## 6. Automated Verification

| Check | Result |
|---|---|
| `verify:quick-question-foundation-gate` | PASS |
| `verify:quick-question-engine-gate` | PASS |
| `verify:quick-question-http-gate` | PASS |
| mobile `verify:quick-question-gate` | PASS |
| backend `tsc --noEmit` | PASS |
| mobile `tsc --noEmit` | PASS |
| lint (touched files, backend + mobile) | PASS |
| F02 prebuild transform (`android:enforceNavigationBarContrast="false"` generated) | confirmed |

## 7. Physical QA

- Device: Samsung real (not emulator).
- Temporary QA package `com.zetrynd.app.qa` (`applicationIdSuffix ".qa"` in the generated `android/app/build.gradle`) used to install alongside the existing Play-signed app without touching its data.
- Temporary suffix removed afterward (see §8 of the QA build block) — generated Android project restored to the clean post-prebuild vc3 state (F02 preserved).
- F01 / F02 / F03 — PASS.
- Light/dark navigation bar — PASS.

## 8. Environment Findings — NOT vc3 Defects

- Local `axioma_dev` schema drift: `season_league_participation.gamification_actor_ref` column missing, causing an internal error on some competitive/profile surfaces during local backend runs.
- Pre-existing, unrelated to F01/F02/F03. No migration or repair was performed as part of vc3.
- Production database was never implicated or touched.

## 9. Safety

- No production database access or mutation.
- No Railway deploy.
- No Google Play Console mutation.
- No Billing / reviewer grant changes.
- `versionCode` remains `2`, `versionName` remains `0.1.0`.
- No push to any remote.

## 10. Final Verdict

**VC3 CLOSED TEST MAINTENANCE — PASS**

**READY FOR ANDROID RELEASE PREP VC3**

No AAB has been built and nothing has been uploaded to Google Play as part of this closure.
