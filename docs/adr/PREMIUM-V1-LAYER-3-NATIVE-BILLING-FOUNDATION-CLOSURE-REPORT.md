# PREMIUM V1 · Layer 3 · C3.5A — Native Google Play Billing Foundation · Closure Report

**Status: CLOSED & APPROVED** · 2026-09-03
Commit: `feat(premium): add native google play billing foundation`
Branch `ui-implementation-post-ui6` · HEAD before this increment `b432cfe`.

C3.5A establishes **only** the native IAP bridge foundation:

- native IAP bridge (`expo-iap@5.5.0`) installed and pinned exactly;
- Expo autolinking recognises `ExpoIapModule` **without** a config plugin;
- Android compiles `expo-iap`;
- the **actual** Gradle graph resolves **Google Play Billing Library 9.1.0**;
- the native debug binary runs on the physical Samsung with **no regression** to existing ZETRYND functionality;
- the release JS/native structure can produce an AAB under a validated local build workaround.

**No** real Google Play checkout, product, `ProductDetails`, restore, License Tester, Internal Track, RTDN cloud delivery, production signing or production-Billing readiness is claimed — those are later gates.

---

## A. Repository changes (this commit)

| File | Change |
|---|---|
| `apps/mobile/package.json` | `+ "expo-iap": "5.5.0"` — **exact pin**, in `dependencies`, alphabetical. Nothing else changed (the `android`/`ios` scripts a raw `expo prebuild` tries to rewrite to `expo run:*` were **not** kept). |
| `pnpm-lock.yaml` | Only the `expo-iap@5.5.0` resolution: importer specifier `5.5.0`, package entry + `integrity` sha512, snapshot with runtime deps **`expo` / `react` 19.1.0 / `react-native` 0.81.5 only** (the Amazon appstore peers are optional and not installed). No unrelated lockfile churn. |
| `package.json` (root) | `+ "verify:premium-native-billing-foundation-gate": "node scripts/verify-premium-native-billing-foundation-gate.mjs"` (root `verify:*-gate` convention). |
| `scripts/verify-premium-native-billing-foundation-gate.mjs` | New **static** gate (see §B). |
| `docs/adr/PREMIUM-V1-LAYER-3-BILLING-ARCHITECTURE.md` | §B.1 records PBL **9.1.0** resolved; §D.1 note updated; §N C3.5A row + §N.1 marked **DONE**. |
| `docs/adr/PREMIUM-V1-LAYER-3-NATIVE-BILLING-FOUNDATION-CLOSURE-REPORT.md` | This report. |

**Not touched / not staged:** `apps/mobile/app.json` (protected residue — no `expo-iap` plugin added, see §F); `apps/mobile/android/**` (CNG-generated, gitignored); `.npmrc`, `apps/mobile/app/onboarding.tsx`, the four `apps/mobile/assets/*` icons, `apps/mobile/components/auth/auth-brand-header.tsx`, and the other pre-existing residue. No `metro.config.js`. No `.env*`. No APK/AAB.

### IAP library decision

`expo-iap@5.5.0` — the **maintained OpenIAP** package (`hyodotdev/openiap` → `libraries/expo-iap`; the old `hyochan/expo-iap` repo is archived). `latest` on the registry = `5.5.0` (published 2026-08-31). It is an **Expo Module** (`expo-module.config.json` → Android `expo.modules.iap.ExpoIapModule`), conforms to the OpenIAP spec, new-architecture native. Peers `expo/react/react-native: *` → no version conflict with SDK ~54.0.36 / RN 0.81.5 / React 19.1.0. Exact pin per the C3.0 invariant. **No RevenueCat / `react-native-purchases` / second IAP library / second entitlement authority** (C3.0 §D architecture: `expo-iap`/OpenIAP client bridge + ZETRYND NestJS authoritative backend).

---

## B. Static verification run in this session

| Check | Result |
|---|---|
| `pnpm run verify:premium-native-billing-foundation-gate` (new) | **PASS** — 22/22 |
| `pnpm --filter @axioma/mobile typecheck` | **PASS** (`tsc --noEmit`, clean) |
| `pnpm --filter @axioma/mobile lint` | **PASS** (`eslint app lib components`, clean) |
| `verify:premium-paywall-gate` (mobile) | **PASS** (PREMIUM V1 C2.1) |
| `verify:entitlement-mobile-gate` (mobile) | **PASS** (PREMIUM V1 C2.0) |
| `verify:study-premium-gating-gate` (mobile) | **PASS** (PREMIUM V1 C2.2) |
| `verify:exam-premium-gating-gate` (mobile) | **PASS** (PREMIUM V1 C2.3) |
| `verify:ai-premium-gating-gate` (mobile) | **PASS** (PREMIUM V1 C2.4) |
| `verify:ai-mobile-gate` (mobile) | **PASS** (LEF Bloque VI I8) |
| `git diff --check` | **clean** (only pre-existing CRLF advisories) |

### The new gate — `verify-premium-native-billing-foundation-gate.mjs`

Static, reproducible, Node-only. **It does NOT run Gradle, compile Android, or touch a device** — that evidence is external (§C–§E). It asserts only what a static repo can prove:

- **A** — `expo-iap` pinned **exactly** `5.5.0` in `apps/mobile/package.json` `dependencies` (no `^`/`~`/range).
- **B** — `pnpm-lock.yaml` has the `expo-iap@5.5.0` resolution (importer specifier + package entry + sha512 integrity); its npm deps are `expo`/`react`/`react-native` only; no `react-native-purchases`/RevenueCat.
- **C** — the installed `expo-iap@5.5.0` declares, for Android, `io.github.hyochan.openiap:openiap-google` at the version from `openiap-versions.json` (`google: "3.5.0"`); the module does **not** declare `com.android.billingclient:billing` directly (it arrives transitively). **The gate explicitly does NOT claim to prove the runtime-resolved PBL version** — that is the external `dependencyInsight` evidence in §C.
- **D** — `expo-module.config.json` declares the Android module `expo.modules.iap.ExpoIapModule` → Expo autolinks it **without** a config plugin.
- **E** — `apps/mobile/app.json` untouched: `android.package === "com.zetrynd.app"`, `plugins` is exactly `["expo-router"]` (no `"expo-iap"`).
- **F** — no file in `apps/mobile/{app,lib,components}` imports `expo-iap` or any billing-flow API (`launchBillingFlow`, `queryProductDetails`, `requestPurchase`, `initConnection`, …) — C3.5A adds **zero** JS orchestration.
- **G** — no `apps/mobile/metro.config.js`; `apps/mobile/android/` not tracked by git.

---

## C. Real external native evidence (executed on the Product Owner's Windows machine)

> Reproduced here verbatim as **externally-supplied real evidence**. The agent's own execution sandbox cannot run a JVM `Selector.open()` (AF_UNIX unsupported) → Gradle cannot run in-session; this is an environment limitation, not a product defect.

### C.1 JDK (environment setup only — not a repo dependency)

The Android Studio bundled JBR was **Java 25**; Gradle/Groovy rejected it:
```
Unsupported class file major version 69
```
**Temurin JDK 17.0.20.101** was installed and used successfully. No repository JDK dependency or permanent config was added (the repo has no such convention).

### C.2 Actual Play Billing Library resolution — `gradlew.bat :app:dependencyInsight`

```
> .\gradlew.bat :app:dependencyInsight --dependency com.android.billingclient:billing --configuration debugRuntimeClasspath

com.android.billingclient:billing:9.1.0
\--- io.github.hyochan.openiap:openiap-google:3.5.0
     \--- project :expo-iap
          \--- project :expo
               \--- debugRuntimeClasspath

BUILD SUCCESSFUL in 1m 48s
```

**Proven from the ACTUAL Gradle graph (not Maven metadata):**
`expo-iap 5.5.0` → `openiap-google 3.5.0` → **Google Play Billing Library `9.1.0`** — the latest supported PBL generation (C3.0 §B.1 target: PBL ≥ 8, preferably 9.x → **met**).

### C.3 Debug native build — `gradlew.bat :app:assembleDebug`

```
> Task :expo-iap:compileDebugKotlin
BUILD SUCCESSFUL in 10m 48s
264 actionable tasks: 240 executed, 24 up-to-date
```
APK produced: `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

### Generated native baseline observed

Expo SDK ~54.0.36 · RN 0.81.5 · React 19.1 · new architecture (default true) · Hermes · `applicationId com.zetrynd.app` · compileSdk 36 · targetSdk 36 · minSdk 24 · Kotlin 2.1.20 · AGP 8.11.0 · Gradle 8.14.3 · NDK 27.1.12297006. `expo prebuild -p android --clean` succeeded; `android/` is gitignored/CNG and **not committed**.

---

## D. Physical Samsung QA — PASS

Device `R5CW71R7MTP` (`adb devices` → `R5CW71R7MTP device`). Backend + Metro running; `adb reverse` for `tcp:3000`, `tcp:8081`, `tcp:9000`.

```
adb -s R5CW71R7MTP install -r .\app\build\outputs\apk\debug\app-debug.apk
Success
```

Manual smoke verified by the Product Owner:

- login OK · Inicio OK · Estudio OK · Premium/paywall OK · Competir OK · Tutor IA OK · Perfil OK · app reopen OK
- **no crash · no "native module not found" · no `ExpoIapModule` error**

**No purchase / `ProductDetails` / restore flow was tested** — that belongs to C3.5B, after Play Console / product / License Tester availability.

---

## E. Structural release / AAB probe — succeeded (structural only)

`gradlew.bat :app:bundleRelease`:
```
BUILD SUCCESSFUL in 9m 25s
411 actionable tasks: 89 executed, 322 up-to-date
Test-Path .\app\build\outputs\bundle\release\app-release.aab  → True
app-release.aab  size 56,425,876 bytes  2026-09-03 14:51:47
```
A standalone Metro release probe also succeeded:
```
npx expo export --platform android --output-dir <temp> --clear
Android Bundled ... expo-router/entry.js (1346 modules)  ·  37 assets  ·  Hermes bundle produced
Export completed successfully
```

**This is a structural probe only.** Production signing is **not** ready — the release config still uses `signingConfigs.debug` (blocker **Q-3** / C3.4-KS). The generated release configuration is **not** evidence of production-signing readiness.

### Two release-build findings (pre-existing / local-build ergonomics — NOT Billing defects)

1. **Metro monorepo resolution** — the initial raw `bundleRelease` exposed that Expo Router's entry is hoisted at the repo root while the workspace package `@axioma/contracts` is linked from `apps/mobile`; making both visible at once (with automatic workspace-root behaviour disabled) required a **temporary, non-committed** `metro.config.js` probe.
2. **Windows path-length limit** — CMake/Ninja failed on `react-native-safe-area-context` generated code with *"Filename longer than 260 characters"* because the repo lives under a long path (`C:\Users\usuario 4\Downloads\AXIOMA\app\…`); a temporary `subst X:` mapping was used for the structural build.

**None of these workarounds remain.** The temporary `metro.config.js` was deleted; `EXPO_NO_METRO_WORKSPACE_ROOT` was removed; the `subst X:` drive was removed. They are **not** Billing defects. If a permanent release-build ergonomics fix is wanted (a committed `metro.config.js` with explicit `watchFolders`/`nodeModulesPaths`, or moving the repo to a short path), it should be handled as a **separate** increment — it is out of scope for C3.5A.

---

## F. Blockers / deferred items

| Item | State |
|---|---|
| **expo-iap config plugin** (`"expo-iap"` in `app.json` `plugins`) | **Deferred to C3.5B.** Not needed for C3.5A — autolinking links `ExpoIapModule` and the module's own `android/build.gradle` brings `openiap-google` → PBL 9.1.0 into the native graph (proven by `assembleDebug` + `dependencyInsight`). The plugin adds `<uses-permission android:name="com.android.vending.BILLING"/>` and normalises generated gradle so `expo run:android` can parse the app id — both only matter for real billing calls. Adding it will collide with the **protected** `apps/mobile/app.json` residue (`AXIOMA`→`ZETRYND` rename, `+android.package`, `+versionCode`, adaptiveIcon changes) → **C3.5B must reconcile that protected file in a controlled increment.** No `app.config.*` workaround was created. |
| **Google Play Console account** (B-0) | Does **not** exist. Blocks the first Play upload, C3.4B (create `zetrynd_premium`), License Testers, real `ProductDetails`. |
| **C3.4B** — create/activate the Play product | Deferred (needs B-0 + a Billing-enabled build uploaded). |
| **C3.5B** — purchase / restore / `obfuscatedAccountId` + real Samsung Billing QA | Deferred (needs C3.4B). Pure `BillingState`/flow mobile gates may proceed independently. |
| **Production signing / Internal Track** (C3.4-KS, Q-3) | Still pending. Release still `signingConfigs.debug`. Required before Layer 3 closure (C3.8), not before the first Billing QA. |
| **RTDN real cloud delivery** | Deferred (needs the public HTTPS backend + Pub/Sub push subscription — C3.4A runbook §5, blocked on hosting). |
| Permanent release-build ergonomics (Metro monorepo config / long-path) | Separate increment if wanted — not a Billing defect. |

---

## Explicit non-claims

C3.5A does **NOT** claim: a Google Play product exists · Play Console is configured · a purchase succeeds · `ProductDetails` succeeds · restore succeeds · License Tester works · Internal Track works · RTDN real cloud delivery works · production signing is ready · production Billing is ready.
