# COSMETICS V1 — CLOSURE REPORT

**Increment:** COSMETICS V1 — Catalog completion + assets source of truth + unlocks +
leagues + product-surface cleanup.
**Mode:** CONTROLLED OPTION 1 (per Product/TPM blocker decision). No re-architecture.
**Date:** 2026-08-30.
**Verdict:** READY FOR PRODUCT/TPM REVIEW.

---

## A. Environment

| Item | Value |
| --- | --- |
| Monorepo | pnpm workspace — `apps/backend` (NestJS + Prisma 7.9.1 / Postgres), `apps/mobile` (Expo Router), `packages/contracts` (Zod) |
| Runtime DB (dev) | `axioma_dev` |
| Gates DB | `axioma_gates_dev` (via `.env.gates`, server `http://127.0.0.1:3001`) |
| Object storage | MinIO / S3, bucket `axioma-content-dev` (private, signed reads), endpoint from `OBJECT_STORAGE_*` |
| Branch HEAD at start | `a05e4b7` `feat(exams): add Ciencias Biology exam content` |
| Asset pack consumed | `ASSETS ZETRYND V1 zip oficial.zip` — 43 files (see §M for the `oficial(2)` naming note) |

---

## B. Architecture preservation (nothing rebuilt)

All COSMETICS V1 behaviour reuses existing infrastructure. No new domain, scheduler,
worker architecture, or parallel delivery path was introduced.

| Concern | Existing mechanism reused |
| --- | --- |
| Catalog | `CosmeticItem` (immutable rows), `CosmeticItemRepository` |
| Ownership | `InventoryItem` `UNIQUE(accountId, cosmeticItemId)`, `createIdempotent` |
| Equipment | `EquippedCosmetic` `@@id([publicProfileId, cosmeticSlot])` |
| Reward delivery | ADR-0019 — `RewardBundle`/`RewardBundleItem`, `RewardGrant` (`idempotencyKey = reward:{source}:{id}`), `RewardEvaluationWorker.deliverBundleComponents(...)` |
| Level rewards | `LevelDefinition.rewardBundleId` → `RewardEvaluationWorker` (grants every level ≤ current) |
| League enrollment | `LeagueEnrollmentService.joinActiveSeason` (advisory lock namespace 21) |
| Season lifecycle | `SeasonTransitionService` (SCHEDULED→ACTIVE→FINALIZED) — untouched |

**Additive-only changes to shared contracts:**

1. `RewardSourceEntityType` enum — new value `LEAGUE` (pure `ALTER TYPE ... ADD VALUE`,
   same pattern as `20260822120000_cosmetics_starter1_reward_source`).
   Migration `20260830120000_cosmetics_v1_league_reward_source`.
2. `LeagueDefinitionRepository.findAdjacentActiveTier(fromTierOrder, direction, tx?)` —
   one new read-only query primitive (resolve adjacent ACTIVE `LeagueDefinition` by
   `tierOrder`). No write methods added; `LeagueDefinition` rows stay immutable.
3. `LeagueEnrollmentService` — constructor gains `RewardBundleRepository` +
   `RewardEvaluationWorker`; new private `deliverLeagueFrameReward(...)`; `resolveTargetTier`
   now consults the most recent participation (PROMOTED→up, DEMOTED→down, else same tier).

No changes to Premium, Tutor IA, Railway, cron, or season orchestration.

---

## C. Asset source of truth

- 43 approved assets committed to `apps/backend/assets/cosmetics/v1/`
  (`avatars/` 26, `frames/` 14, `banners/` 3). Versioned in-repo. No `Downloads/`
  paths, no absolute paths.
- Single manifest / source of truth: `apps/backend/src/gamification/cosmetics-v1-catalog.ts`
  (`COSMETICS_V1` = 49 entries; `COSMETICS_V1_NEW` = 43; `LEAGUE_V1` = 7;
  `COSMETICS_V1_LEVEL_REWARDS` = 10). Compile-time invariants throw on any count drift
  or duplicate itemKey.
- Deterministic object keys — no `Date.now()`:
  `cosmetics/v1/avatars/<itemKey>.webp`, `cosmetics/v1/frames/<itemKey>.webp`,
  `cosmetics/v1/banners/<itemKey>.webp`.
- Upload is idempotent (`PutObjectCommand` same key overwrites). Re-running the seed
  creates **zero** new objects and **zero** orphans (verified: exactly 43 objects under
  `cosmetics/v1/`, no orphans, no missing).
- `CosmeticItem.assetReference` for every new item = its object key (portable,
  resolved at read time by the existing `ObjectStorageService.resolveAssetUrl` →
  `getSignedReadUrl`). No second resolver, no hard-coded `http://localhost:9000`.
- The 6 pre-existing productive cosmetics keep their existing public-bucket URLs
  untouched — only `name`/`status`/`visibility` reconciled, never `assetReference`.

**Technical transformations applied to artwork:** none. Files were copied byte-for-byte.
No re-encode, crop, recolor, or resize. Validated programmatically before upload
(`apps/backend/src/platform/webp-metadata.ts`): RIFF/WEBP container, dimensions,
format, alpha channel presence, file existence, duplicate-filename and duplicate-hash
detection, size bounds.

| Type | Spec enforced | Result |
| --- | --- | --- |
| Avatars (26) | 1024×1024 WebP, RGB | pass |
| Frames (14) | 1024×1024 WebP, RGBA (real alpha) | pass — all 14 carry an alpha channel |
| Banners (3) | 1500×500 WebP, RGB (3:1) | pass |

---

## D. Catalog (Product Lock §3 — 49 productive active cosmetics)

Verified in `axioma_dev`:

| `itemType` | Count | Composition |
| --- | --- | --- |
| `AVATAR` | 30 | 10 human (1 existing "Estudiante con lentes" + 9 "Estudiante 02".."Estudiante 10", no ethnicity labels), 15 symbol (existing Búho/Pi/Astrolabio + 12 new), 5 historic (Euclides, Pitágoras, Marie Curie, William Shakespeare, Napoleón Bonaparte) |
| `AVATAR_FRAME` | 14 | 7 league (Bronce…Gran Maestro) + 7 level (10,20,30,40,50,60,70) |
| `PROFILE_BANNER` | 5 | existing Templo del Conocimiento + Observatorio del Horizonte + new Biblioteca de los Ecos + Laboratorio de la Aurora + Sala del Atlas |
| `BADGE` | 0 | — |
| **Total** | **49** | — |

- All 49 present, none missing. No duplicate `item_key`. No duplicate `LeagueDefinition`.
- Historic set contains **no** Gabriela Mistral, Julio César, or Cervantes.
- Banner name is "Sala del Atlas" (not "Cámara del Firmamento").
- itemKeys: stable, lowercase, kebab-case, semantic, no timestamps, no `asset1`/`asset2`
  prefixes for new items. Legacy itemKeys preserved for the 6 reused items.
- No `category` column added to Prisma — editorial classification lives only in the
  TS manifest.
- No rarity system. New items are `rarityClass = COMMON`; no Common/Rare/Epic display,
  colours, probabilities, or drop rates.

---

## E. Starter Kit (§10)

- `STARTER_COSMETIC_ITEM_KEYS` in `cosmetic-equipment.service.ts` now derives from
  `COSMETICS_V1_STARTER_ITEM_KEYS` (single source of truth in the manifest —
  `.filter(unlock.kind === 'starter')`). No duplicated list.
- Starter total = **32** — 30 AVATAR + 2 PROFILE_BANNER (Templo, Observatorio).
- No frames, no badges, no new banners in the starter kit.

---

## F. Level ladder & level rewards (Blocker B1)

- `V1_MAX_LEVEL = 70`. Formula `minimumLifetimeXp(n) = 25·n·(n+1) − 50`
  (`apps/backend/src/gamification/level-thresholds.ts`).
- `prisma/seed.ts::seedLevelLadder` seeds a `LevelDefinition` row for **every** integer
  1..70 (upsert; existing levels 1–10 preserved numerically).
- Verified in `axioma_dev`: 70 rows, every threshold matches the formula.
  Checkpoints confirmed: 10→2700, 15→5950, 20→10450, 30→23200, 35→31450, 40→40950,
  50→63700, 55→76950, 60→91450, 70→124200.
- Reward-bearing levels (existing `LevelDefinition.rewardBundleId` → `RewardEvaluationWorker`):

  | Level | Reward | itemKey |
  | --- | --- | --- |
  | 10 | Level Frame 10 | `frame-level-10` |
  | 15 | Biblioteca de los Ecos (banner) | `banner-biblioteca-ecos` |
  | 20 | Level Frame 20 | `frame-level-20` |
  | 30 | Level Frame 30 | `frame-level-30` |
  | 35 | Laboratorio de la Aurora (banner) | `banner-laboratorio-aurora` |
  | 40 | Level Frame 40 | `frame-level-40` |
  | 50 | Level Frame 50 | `frame-level-50` |
  | 55 | Sala del Atlas (banner) | `banner-sala-atlas` |
  | 60 | Level Frame 60 | `frame-level-60` |
  | 70 | Level Frame 70 | `frame-level-70` |

  All 10 bundles verified to contain exactly the expected single COSMETIC component.
  `rewardBundleId` is only written when currently `NULL` (idempotent, never clobbers).
- Permanent, idempotent, no auto-equip (delivery via `inventoryItemRepo.createIdempotent`).
- No second leveling system.

---

## G. League configuration (Blockers B2 + B3)

Seven productive `LeagueDefinition` rows, verified in `axioma_dev`:

| tierOrder | leagueKey | name | group | promotion | demotion | reward bundle |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `bronce` | Bronce | 30 | top-percent:20 | bottom-percent:20 | `frame-league-bronce` |
| 2 | `plata` | Plata | 30 | top-percent:20 | bottom-percent:20 | `frame-league-plata` |
| 3 | `oro` | Oro | 30 | top-percent:20 | bottom-percent:20 | `frame-league-oro` |
| 4 | `esmeralda` | Esmeralda | 30 | top-percent:20 | bottom-percent:20 | `frame-league-esmeralda` |
| 5 | `diamante` | Diamante | 30 | top-percent:20 | bottom-percent:20 | `frame-league-diamante` |
| 6 | `maestro` | Maestro | 30 | top-percent:20 | bottom-percent:20 | `frame-league-maestro` |
| 7 | `gran-maestro` | Gran Maestro | 30 | top-percent:20 | bottom-percent:20 | `frame-league-gran-maestro` |

- No subdivisions. Group size 30. `top-percent:20` / `bottom-percent:20` = positions
  1–6 PROMOTED, 25–30 DEMOTED, 7–24 RETAINED (§6).
- **B3 — league reward source:** new additive `RewardSourceEntityType.LEAGUE`.
  `SYSTEM_STARTER`/`LEVEL`/`ACHIEVEMENT_UNLOCK`/`CHALLENGE_CLAIM` are **not** misused.
  `sourceEntityId = LeagueDefinition.id` → `idempotencyKey = reward:LEAGUE:{leagueDefinitionId}`.
  A user entering the same league across multiple seasons receives **no** duplicate
  inventory ownership.
- **B2 — minimal adjacent-tier enrollment** (`LeagueEnrollmentService.resolveTargetTier`):
  - new competitive user → Bronce;
  - recurring user → tier of most recent participation, then
    PROMOTED → `findAdjacentActiveTier(up)`, DEMOTED → `findAdjacentActiveTier(down)`,
    any other status (RETAINED / SEASON_ENDED / ACTIVE) → same tier;
  - boundary: Bronce + DEMOTED → Bronce; Gran Maestro + PROMOTED → Gran Maestro
    (the `?? fromTier` fallback).
  - one new repository primitive only (`findAdjacentActiveTier`). No re-tiering job,
    no subdivisions.
- **§4 — league frame grant on actual enrollment:** `deliverLeagueFrameReward` fires
  only when `joinActiveSeason` actually creates the participation (`result.created`),
  outside the enrollment transaction, best-effort (a delivery failure never rolls back
  enrollment; the grant retries on the next enrollment into that league). No auto-equip.
  Frames stay permanently owned after demotion / later seasons / re-entry;
  `equipped frame != current league` is a valid state.

---

## H. Badge removal (§8 — LOCKED)

- No productive `BADGE` `CosmeticItem` (verified: 0 active BADGE in V1 catalog).
- No BADGE starter, no BADGE reward path.
- Mobile "Insignia" tab removed from `personalizacion.tsx`
  (`PersonalizationTab = 'avatar' | 'banner' | 'titulo'`; the `slot="BADGE"`
  `CosmeticSlotCard` render block deleted).
- `CompetitiveCosmeticsRow` filters out `cosmeticSlot === 'BADGE'` before rendering.
- Enum / schema / migrations / `CosmeticSlot.BADGE` **retained** (latent infra).
- `FeaturedAchievement` and Titles untouched.

---

## I. Legacy frame retirement (§7 — APPROVED)

`asset1-frame-madera-nivel5`, `asset2-frame-bronce`, `asset2-frame-plata`:
`status = RETIRED`, `retiredAt` set (verified in `axioma_dev`).
No hard delete. Historical `InventoryItem` / `EquippedCosmetic` referential integrity
preserved. Removed from the starter kit and all active V1 reward paths. The 14 new
frames are the canonical V1 `AVATAR_FRAME` catalog.

---

## J. Mobile surface

| File | Change |
| --- | --- |
| `app/(tabs)/perfil/personalizacion.tsx` | "Insignia" tab + BADGE slot card removed; doc comment updated (COSMETICS-V1 §12) |
| `components/cosmetics-section.tsx` | `PROFILE_BANNER` preview now renders a non-circular 3:1 `<Image resizeMode="cover">` (`bannerPreview` styles) instead of the circular `<Avatar>`; BADGE branch gone |
| `components/competitive/cosmetics-row.tsx` | filters `cosmeticSlot !== 'BADGE'`; returns `null` when nothing visible |

Ranking rows and the profile header continue to consume `assetReference` through the
existing resolve path — signed URLs for V1 items resolve transparently.

---

## K. Gates

All run green unless listed as pre-existing.

**Backend (via `run-gate.ts` → `axioma_gates_dev`):**

| Gate | Result |
| --- | --- |
| `verify:cosmetic-foundation-gate` | PASS \* |
| `verify:cosmetic-equipment-gate` | PASS |
| `verify:personalization-catalog-gate` | PASS |
| `verify:league-season-foundation-gate` | PASS |
| `verify:league-ranking-gate` | PASS |
| `verify:competitive-leaderboard-gate` | PASS |
| `verify:competitive-profile-foundation-gate` | PASS |
| `verify:competitive-profile-endpoint-gate` | PASS |
| `verify:cosmetics-v1-catalog-gate` (new) | PASS \*\* |

**Mobile:**

| Gate | Result |
| --- | --- |
| `verify:cosmetics-gate` | PASS |
| `verify:leaderboard-gate` | PASS |
| `verify:competitive-profile-gate` | PASS |
| `verify:advanced-profile-mobile-gate` | PASS |

**Build / typecheck / lint:**

| Check | Result |
| --- | --- |
| `@axioma/contracts` build (`tsc`) | PASS |
| `@axioma/backend` typecheck (`tsc --noEmit`) | PASS |
| `@axioma/backend` build (`nest build`) | PASS |
| `@axioma/mobile` `tsc --noEmit` | PASS |
| ESLint — all touched backend paths | PASS (1 pre-existing unused-import **warning** in `verify-league-season-foundation-gate.ts`: `Prisma`, on a line this increment did not modify) |
| ESLint — all touched mobile paths | PASS |

**\* `verify-cosmetic-foundation-gate.ts` — one assertion adjusted (§L).**
**\*\* `verify-cosmetics-v1-catalog-gate.ts` league checks scoped to the 7 canonical
V1 `leagueKey`s (§L).**

**Known pre-existing failures — NOT touched:**

- `verify:gamification-integration-gate` — `M1.NUMEROS.PORCENTAJES` fixture.
- `verify:curriculum-topic-count` — `axioma_gates_dev` data.

---

## L. Gate adjustments (caused by legitimate new seed data in the shared gates DB)

`verify:cosmetics-v1-catalog-gate` seeds the canonical V1 catalog into
`axioma_gates_dev` (required to assert the 7 level-frame + 3 banner + 7 league-frame
reward paths). That shared DB is also used by other gates, so two pre-existing
assertions that assumed a pristine ladder / league table needed narrowing to their
actual invariant. No production code changed; §24 (no cleanup of pre-existing drift)
respected.

1. **`verify-cosmetic-foundation-gate.ts`** — "reintento no duplica" counted **all**
   `inventory_item` rows for a fresh high-XP test account. With levels 10–70 now
   carrying reward bundles, that account legitimately receives multiple level cosmetics.
   The check now counts rows **for the specific cosmetic granted by that test bundle**
   — which is the actual non-duplication invariant.

2. **`verify-cosmetics-v1-catalog-gate.ts`** — the "exactly 7 LeagueDefinition" /
   tierOrder / rules / bundle checks now filter `WHERE league_key = ANY($1)` with the
   7 canonical V1 keys, because other league gates leave suffixed fixture
   `LeagueDefinition` rows behind (38 total rows in `axioma_gates_dev`). Same
   scoping pattern already used for the cosmetic-item checks.

---

## M. Asset-pack reconciliation & the `oficial(2).zip` naming discrepancy

The blocker decision (§0) named `ASSETS ZETRYND V1 zip oficial(2).zip` as canonical.
**That file does not exist on disk.** Present in `~/Downloads/`:

| Candidate | Files | Status |
| --- | --- | --- |
| `ASSETS ZETRYND V1 zip oficial.zip` | 43 | **complete — matches the §15 manifest exactly; used** |
| `ASSETS ZETRYND V1/` (extracted folder) | 43 | byte-identical content to `oficial.zip` |
| `ASSETS ZETRYND V1 zip.zip` | 41 | incomplete |
| `ASSETS ZETRYND V1 zip 2.zip` | 42 | incomplete |

`oficial.zip` and the extracted folder hash-match on content; the only filename
difference is `avatar simbolo aureo.webp` (zip) vs `avatar simbolo aureo 1.webp`
(folder) — identical bytes. `oficial.zip` was adopted as the canonical set: it is the
only complete, manifest-matching package. **Product/TPM should confirm that
`ASSETS ZETRYND V1 zip oficial.zip` is the intended "official (2)" package** before
production sign-off.

---

## N. DB reconciliation (`axioma_dev`, post-seed, canonical V1 only)

| Assertion | Expected | Actual |
| --- | --- | --- |
| `AVATAR` active | 30 | 30 (26 new + 4 legacy reused) |
| `AVATAR_FRAME` active | 14 | 14 |
| `PROFILE_BANNER` active | 5 | 5 (3 new + 2 legacy reused) |
| `BADGE` productive | 0 | 0 |
| Total V1 catalog | 49 | 49, none missing |
| `assetReference == objectKey` (new items) | all | all (0 mismatches) |
| Starter itemKeys | 32 | 32 |
| Legacy frames RETIRED w/ `retiredAt` | 3 | 3 |
| `LevelDefinition` 1..70 | 70, formula-exact | 70, 0 threshold mismatches |
| Level reward paths | 10 (7 frame + 3 banner) | 10, bundle contents exact |
| `LeagueDefinition` (V1 keys) | 7, tierOrder 1–7, group 30, 20/20 | 7, exact, all ACTIVE, all with bundles |
| League frame bundles | 7 | 7, contents exact |
| Duplicate itemKeys | 0 | 0 |
| Orphan V1 objects in `cosmetics/v1/` | 0 | 0 (exactly 43 objects) |

Second seed run: fully idempotent (0 objects created, 0 items created, 0 reconciled,
0 retired).

Pre-existing fixture drift in `axioma_gates_dev` (21 fixture `cosmetic_item` rows,
suffixed `LeagueDefinition` rows, synthetic level_definitions, orphan `asset1` MinIO
objects) was **left as-is** per §24 — this increment only avoids creating new drift.

---

## O. Manual verification (§26)

Automated gates exercise the full catalog / equipment / personalization / leaderboard
/ league logic end-to-end against a real Postgres + MinIO. The following are covered
by gates:

- catalog counts & starter ownership (`cosmetics-v1-catalog-gate`,
  `personalization-catalog-gate`);
- equip avatar / frame / banner + same-slot replacement (`cosmetic-equipment-gate`);
- locked items show their unlock requirement (`personalization-catalog-gate`);
- level reward delivery, idempotency, no auto-equip
  (`cosmetic-foundation-gate` §7–8, reconciliation §N);
- league frame reward delivery via `reward:LEAGUE:{id}` (`league-season-foundation-gate`);
- Ranking / profile header cosmetic rendering, non-circular banner preview, no
  "Insignia" tab, BADGE filtered (`cosmetics-gate`, `leaderboard-gate`,
  `competitive-profile-gate`, plus static assertions in `cosmetics-v1-catalog-gate`).

**Not executed in this environment (no Android device / emulator):** on-device
first-load screenshot walkthrough of Personalización and Ranking. Recommended as a
QA pass before production sign-off. No code path is unverified — only the visual
device capture is outstanding.

---

## P. Release-preparation blocker (recorded, NOT built — §5)

### COMPETITIVE SEASON ORCHESTRATION — RELEASE PREPARATION BLOCKER

**Status:** OPEN. Out of scope for COSMETICS V1 by explicit Product/TPM decision.

**What exists:** `SeasonTransitionService` moves a season SCHEDULED→ACTIVE and
ACTIVE→FINALIZED. `LeaderboardFinalizationService` records
PROMOTED/DEMOTED/RETAINED per participant. `LeagueEnrollmentService` places a joining
user in the correct adjacent tier and delivers the league frame.

**What is missing for production:** nothing automatically **creates** the next
`GameSeason`, schedules its window, or triggers finalization on a recurring cadence.
In this increment seasons are driven by controlled 7-day `GameSeason` fixtures only.

**Explicitly deferred (must not be added under COSMETICS V1):** a new cron system, a
second scheduler, automatic recurring season creation, any unrelated background-worker
architecture.

**Recommended follow-up increment:** "Competitive Season Orchestration" — a single
scheduled trigger that (a) creates the next season on the 7-day cadence, (b) invokes
the existing transition + finalization services, (c) has its own gate. No new domain
model required; it wires the services that already exist.

---

## Q. Git

- `git diff --check`: clean.
- Staged: only COSMETICS V1 files (see commit).
- One commit: `feat(cosmetics): complete V1 catalog and progression rewards`.
- No `git add .`, no `reset --hard`, no `clean`, no `stash`, no `amend`, no push.
- No Railway interaction.

---

## FINAL VERDICT

**READY FOR PRODUCT/TPM REVIEW.**
