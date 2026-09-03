# ZETRYND V1 · RC1A — Auth Session Lifecycle

**Status:** IMPLEMENTATION COMPLETE · AUTOMATED GATES PASS · **AWAITING PHYSICAL FIREBASE SESSION QA**
**Date:** 2026-09-03 · Branch `ui-implementation-post-ui6` · HEAD before this increment `2985fe4`
**Related:** RC0 Google Play Release Readiness Audit (findings RC0-AUTH-01, RC0-AUTH-02); ADR-0004 (identity provider), ADR-0005 (privacy foundation), ADR-0013 (mobile auth integration).

---

## 1. RC0 finding

**RC0-AUTH-01 (BLOCKER).** The mobile app captured the Firebase **ID token** at login, persisted it verbatim in SecureStore, and re-sent that same token on every authenticated request. The backend `AuthGuard` re-verified the Firebase token on **every** request. Firebase ID tokens expire after **~1 hour**; the ZETRYND server session lives **30 days**. So after ~1 h every authenticated call returned `401`, the global handler wiped the local session, and every cold start past the first hour forced a fresh login. Never caught in QA because the dev **stub** identity provider issues non-expiring tokens.

**RC0-AUTH-02 (MUST FIX).** `firebase/auth` was initialized with bare `getAuth()` — no React Native persistence configured — producing an RN warning and keeping Firebase auth state in memory only.

---

## 2. Existing broken behavior (pre-RC1A)

| Layer | Code | Behavior |
|---|---|---|
| Mobile storage | `session-storage.ts` — SecureStore keys `axioma.v1.session.idToken` + `…sessionId` | raw 1-hour token stored forever |
| Mobile request | `api/client.ts` — `Authorization: Bearer <session.idToken>` + `X-Session-Id: <sessionId>` | stale token re-sent every call |
| Backend guard | `auth.guard.ts` — required **both** headers | — |
| Backend validation | `auth.service.ts` `validateSession(idToken, sessionId)` → `identityProvider.verifyToken(idToken)` on every request | throws once the token's `exp` passes → `401` |

The `verifyToken` call contributed only a redundant cross-check (`session.accountId === authIdentity.accountId`). It was invoked **without `checkRevoked`**, so it never provided per-request Firebase revocation detection.

---

## 3. Options considered

### Option A — Firebase verifies identity only at session creation *(chosen)*
`POST /auth/session` verifies the Firebase ID token once and mints an opaque `AuthSession` (UUID v4, 30-day TTL). Every subsequent request authenticates with that `sessionId` alone (`X-Session-Id`). `validateSession(sessionId)` keeps all session/account checks; an incoming `Authorization` header is ignored (backward compatible).

### Option B — keep the Firebase token on every request
Configure Firebase RN persistence, call `currentUser.getIdToken()` before each request, and on `401` force-refresh once + retry once; backend keeps `verifyIdToken` per request.

### Option C — hybrid
No materially better hybrid exists given the backend already holds a complete session record.

### Comparison

| Dimension | Option A | Option B |
|---|---|---|
| Security vs realistic threat (device compromise) | equal — both `sessionId` and idToken are bearer secrets in the same SecureStore | equal |
| Account disable / revocation | preserved (see §4) | preserved |
| Out-of-band Firebase-console disable | not enforced per-request (same as today — no regression) | would be caught within ≤1 h via refresh failure |
| Logout reliability | unchanged (`revokedAt`) | unchanged |
| Server-side invalidation | unchanged | unchanged |
| Token-theft window | the **designed** 30-day session TTL | ≤1 h token + 30-day session |
| Firebase availability coupling | **none** after login | **permanent** — a Firebase blip → app-wide `401` despite a valid ZETRYND session |
| Mobile complexity | lower — 1 key, 1 header, no refresh, no retry | higher — persistence + single-flight refresh mutex + retry-once + mutation-idempotency reasoning |
| Backend complexity | lower — `validateSession` loses a param, a network call, a repo lookup | unchanged |
| 401 semantics | sharper — `401` ⇔ "session invalid" | ambiguous — "maybe just refresh" |
| Cold start after 24 h | **fixed** | fixed |
| Schema / migration | none | none |
| Compatibility with 50 existing backend gates | pass unchanged (extra header ignored) | pass unchanged |
| Compatibility with installed apps | `sessionId` still read; stale `idToken` ignored + cleaned | needs client update anyway |

**Option B adds a permanent per-request dependency on Firebase reachability and several concurrency-sensitive moving parts, for no security gain over A** — because the revocation controls A relies on already exist and are already enforced. **Rejected.**

---

## 4. Chosen model + security / revocation reasoning

**Option A.** The opaque `AuthSession.id` is the sole authenticated-request credential, carried in `X-Session-Id`. Firebase `verifyToken` runs **only** in `createSession`.

Ownership is **intrinsic** — the `AuthSession` row carries its own `accountId`; there is no second credential to reconcile, so the former `session.accountId === authIdentity.accountId` cross-check is removed. Whoever presents a valid `sessionId` **is** that session's account.

Revocation remains 100% server-authoritative and unchanged:

| Event | Mechanism | Effect on live sessions |
|---|---|---|
| Logout | `authSessionRepo.revoke(sessionId)` → `revokedAt` | that session → `401` |
| Account deletion request | `AuthService.requestAccountDeletion`: `markDeletionPending` + `incrementSessionVersion` + `revokeAllByAccountId` + Firebase `disableUser` (all identities) | **every** live session → `401` immediately |
| Account reactivation | `incrementSessionVersion` again | any intermediate session → `401` |
| 30-day TTL | `expiresAt` check + cron `cleanupExpiredSessions` | expired session → `401`, row deleted |
| Operator kill-switch | one `UPDATE account SET session_version = session_version + 1` | all that account's sessions → `401` |

**Known, accepted boundary:** if an operator disables the user **directly in the Firebase console** (not via ZETRYND's deletion flow), the ZETRYND session is not invalidated until its TTL or an explicit `sessionVersion` bump. This is **not a regression** — the pre-RC1A code called `verifyIdToken` without `checkRevoked` and equally would not have detected it within the token's 1-hour life. The supported operator path to terminate a session is ZETRYND's own account-deletion/disable flow or a direct `sessionVersion` bump / session revoke. Consistent with ADR-0004/0005, which already designate ZETRYND account state as the coordination point.

`sessionId` is a v4 UUID (122 bits of randomness), never placed in URLs or query strings, sent only over HTTPS in production, in a custom header that is not logged by default.

### RC0-AUTH-02 resolution

Resolved **by design, not by adding persistence.** Under Option A the Firebase `currentUser` is intentionally ephemeral — Firebase is touched only during `signIn` / `signUp` / `signOut` within a single JS runtime; persisting it across restarts serves no purpose and would leave a Firebase refresh token at rest. `firebase-identity-client.ts` now initializes auth with explicit **in-memory** persistence (`initializeAuth(app, { persistence: inMemoryPersistence })`), which encodes that intent and silences the RN "no AsyncStorage" warning. No new dependency. `getReactNativePersistence` is deliberately **not** used.

---

## 5. Mobile behavior after RC1A

- `StoredSession = { sessionId: string }`. `saveSession` writes only `sessionId` and actively `deleteItemAsync`s the legacy `axioma.v1.session.idToken` key (cleanup for prior installs). `clearSession` deletes both.
- `api/client.ts` sends `X-Session-Id` only; no `Authorization` header from the stored session.
- `auth-provider.tsx` — `establishSession` still receives the Firebase idToken and forwards it to `POST /auth/session`; it just no longer persists it.
- Global `401` handling unchanged: any `401` → `clearSession()` + `unauthenticated`. There is nothing to refresh, so a `401` is unambiguous and cannot trigger a retry loop. Concurrent `401`s are idempotent (`clearSession` + `setStatus` are both idempotent; `cachedSession` collapses to `null`).
- `firebase-identity-client.ts` — in-memory persistence; `getApps().length` guard prevents `initializeAuth` double-init under Fast Refresh.

## 6. Backend behavior after RC1A

- `auth.guard.ts` — requires `X-Session-Id`; missing/empty → `401 "Falta X-Session-Id"`; not a well-formed UUID → `401 "Sesión inválida"` (before any DB call — a malformed credential can no longer surface a Prisma `500`). No `Authorization` requirement.
- `auth.service.ts` — `validateSession(sessionId: string)`: `findById` → not found / `revokedAt` / expired / account missing / `sessionVersion` mismatch → `401 "Sesión inválida"`; else `touchLastSeen` + return `{ sessionId, accountId, status }`.
- `createSession` unchanged — Firebase identity proof preserved, account create/link logic preserved, `Throttle 10/60s` preserved.
- No schema change, no migration. `PREMIUM_REQUIRED` (403) and throttler (429) paths never went through token verification and are untouched.

---

## 7. Automated tests

### `apps/backend/scripts/verify-auth-gate.ts` (integration, live gates server + `axioma_gates_dev`)
- **#6** rewritten: `GET /auth/me` with **only** `X-Session-Id` (no `Authorization`) → `200`.
- **#6b** added — RC0-AUTH-01 regression: `GET /auth/me` with a **garbage/expired `Authorization`** header + a valid `X-Session-Id` → `200` (header ignored, valid session survives).
- **#7** reframed: each session resolves to **its own** account (intrinsic ownership) — `sessionB` → `200` + `accountId === accountB ≠ accountA`.
- **#8** nonexistent `sessionId` → `401`; **#8b** added — malformed non-UUID `X-Session-Id` → `401` (not a Prisma `500`); **#9** expired session → `401`; **#10** logout → `401`; **#11** `sessionVersion` bump → `401` — unchanged, still pass (and now also demonstrate that an ignored `Authorization` header does not rescue an invalid session).
- **#13** rate-limiting on `/auth/session` — unchanged.

### `apps/mobile/scripts/verify-api-client-gate.ts` (deterministic, Node, stubbed `fetch` + stateful SecureStore stub)
- **#0** added: with `sessionId` **and** a legacy `idToken` seeded in the store, `apiRequest` sends `X-Session-Id: <sessionId>`, sends **no** `Authorization` header, and no header carries the legacy token.
- **#0b** added: `POST /auth/session` (`skipAuth`) sends no `X-Session-Id`.
- **#1–#4** (429 humanization, network vs http) — unchanged.

### `scripts/verify-rc-auth-session-lifecycle-gate.mjs` (new static gate, `verify:rc-auth-session-lifecycle-gate`)
Encodes the credential contract on both sides (A–H), that `createSession` still verifies Firebase identity (C), that the revocation defenses remain in `validateSession` (D), and scope (ADR present; no billing imports in touched auth files). Explicitly does **not** attempt to prove a >1 h live session.

---

## 8. Remaining physical QA (blocks CLOSED & APPROVED)

Must be run by the PO on Samsung `R5CW71R7MTP` with the **real Firebase** identity client (`EXPO_PUBLIC_AUTH_IDENTITY_CLIENT=firebase`, `.env.production` values):

1. Build/install the current native app (or a dev build with the Firebase client).
2. Register / log in with a real test account; confirm normal API usage across tabs.
3. Keep the app/session alive **> 1 hour**; make an authenticated request → must succeed.
4. Kill the app; reopen **after the ~1 h token-expiry window** (ideally next day) → must remain authenticated (ZETRYND session still valid).
5. Log out → reopen → logged out.
6. Force an invalid/expired backend session (e.g. server-side `sessionVersion` bump or wait out 30 days) → clean return to the login screen, no loop, no white screen, no crash.
7. Confirm no Premium regression (paywall still shows, `PREMIUM_REQUIRED` still a 403, not treated as auth expiry).

The automated coverage proves the guard no longer depends on the Firebase token; only the physical test proves the real end-to-end > 1 h experience.

---

## 9. Scope exclusions

Not touched by RC1A: production Railway config / env / DB, content import, object storage, `AI_PROVIDER_IMPL`, `NODE_ENV`, `INTERNAL_OPS_KEY`, RTDN production settings (**all RC1B**); Premium, Ads, release-build reproducibility, signing, `app.json`, `apps/mobile/android/`, privacy policy, store assets, protected residue. No dependency added or updated. No push, no tag.

## 10. RC1B — explicitly deferred

**RC1B — Production Backend Verification** is a separate increment: Railway catalog completeness, `AI_PROVIDER_IMPL`, object storage, `NODE_ENV` posture, production env verification. Not started.
