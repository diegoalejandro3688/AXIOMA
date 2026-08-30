/**
 * COSMETICS-V1 -- FUENTE DE VERDAD ÚNICA y versionada del catálogo productivo
 * V1 (49 cosméticos activos), su Starter Kit (32), los rewards de nivel/liga
 * y las 7 ligas productivas. Ver el master prompt "COSMETICS V1 — CATALOG
 * COMPLETION" y la decisión Product/TPM sobre los blockers B1/B2/B3.
 *
 * Este archivo es DATA ESTÁTICA -- NO introduce una entidad DB nueva. Lo
 * consumen: `scripts/seed-cosmetics-v1.ts` (upload + ensure), el gate
 * `verify-cosmetics-v1-catalog-gate.ts`, y `CosmeticEquipmentService`
 * (deriva la lista de Starter Kit de aquí, sin una segunda fuente de verdad).
 *
 * Reglas de `itemKey` (master prompt §18): estables, lowercase, kebab-case,
 * semánticos, sin timestamps, sin `asset1`/`asset2` para ítems nuevos. Los 6
 * ítems ya productivos (`legacy: true`) conservan su `itemKey` histórico y NO
 * se recrean -- solo se reconcilian (nombre neutro, ACTIVE/PUBLIC, starter).
 *
 * Object keys (§17): DETERMINÍSTICOS -- `cosmetics/v1/<grupo>/<slug>.webp`.
 * Nunca `Date.now()`. Se suben al bucket privado `OBJECT_STORAGE_BUCKET` y se
 * resuelven bajo demanda vía `ObjectStorageService.resolveAssetUrl`
 * (URL firmada de corta duración, ADR-0010) -- exactamente el mismo pipeline
 * que el contenido educativo, sin un segundo resolver.
 */

export type CosmeticV1ItemType = 'AVATAR' | 'AVATAR_FRAME' | 'PROFILE_BANNER';

/** Clasificación EDITORIAL únicamente (§3) -- nunca se persiste como columna. */
export type CosmeticV1Category = 'human' | 'symbol' | 'historic' | 'league-frame' | 'level-frame' | 'banner';

export type CosmeticV1Unlock =
  | { kind: 'starter' }
  | { kind: 'level'; level: number }
  | { kind: 'league'; leagueKey: string };

export interface CosmeticV1Entry {
  itemKey: string;
  itemType: CosmeticV1ItemType;
  /** Nombre público NEUTRAL (§4: sin etiquetas de etnia). */
  name: string;
  description?: string;
  category: CosmeticV1Category;
  /** Archivo fuente en `assets/cosmetics/v1/<grupo>/`. `null` para los 6 ítems legacy reusados. */
  assetFile: string | null;
  /** Object key determinístico. `null` para los legacy (conservan su `assetReference` histórico). */
  objectKey: string | null;
  unlock: CosmeticV1Unlock;
  /** Ítem ya productivo -- se reconcilia, nunca se recrea ni se re-sube su asset. */
  legacy?: true;
}

/** Directorio raíz de los assets V1 versionados en el repo (relativo a `apps/backend/`). */
export const COSMETICS_V1_ASSET_DIR = 'assets/cosmetics/v1';

const AVATAR_DIR = `${COSMETICS_V1_ASSET_DIR}/avatars`;
const FRAME_DIR = `${COSMETICS_V1_ASSET_DIR}/frames`;
const BANNER_DIR = `${COSMETICS_V1_ASSET_DIR}/banners`;

const STARTER: CosmeticV1Unlock = { kind: 'starter' };
const RARITY = 'COMMON';

// ---------------------------------------------------------------------------
// 30 AVATAR (10 humanos + 15 símbolos + 5 históricos) -- TODOS Starter Kit
// ---------------------------------------------------------------------------

const HUMAN_AVATARS: CosmeticV1Entry[] = ([
  // 1 ya productivo: `asset2-avatar-humano-lentes` ("Estudiante con lentes"), abajo en LEGACY_REUSED.
  ['avatar-human-02', 'Estudiante 02', 'avatar humana 1.1.webp'],
  ['avatar-human-03', 'Estudiante 03', 'avatar humana afrodescendiente 1.webp'],
  ['avatar-human-04', 'Estudiante 04', 'avatar humana latina 1.webp'],
  ['avatar-human-05', 'Estudiante 05', 'avatar humana rubia 1.webp'],
  ['avatar-human-06', 'Estudiante 06', 'avatar humano afroamericano 1.webp'],
  ['avatar-human-07', 'Estudiante 07', 'avatar humano asiatico 1.webp'],
  ['avatar-human-08', 'Estudiante 08', 'avatar humano latino 1.webp'],
  ['avatar-human-09', 'Estudiante 09', 'avatar humano rubio 1.webp'],
  ['avatar-human-10', 'Estudiante 10', 'avatar mujer asiatica 1.webp'],
] as Array<[string, string, string]>).map(([itemKey, name, assetFile]) => ({
  itemKey,
  itemType: 'AVATAR' as const,
  name,
  category: 'human' as const,
  assetFile,
  objectKey: `cosmetics/v1/avatars/${itemKey}.webp`,
  unlock: STARTER,
}));

const SYMBOL_AVATARS: CosmeticV1Entry[] = ([
  // 3 ya productivos: Búho / Pi / Astrolabio, abajo en LEGACY_REUSED.
  ['avatar-symbol-adn', 'ADN', 'avatar simbolo adn 1.webp'],
  ['avatar-symbol-atomo', 'Átomo', 'avatar simbolo atomo 1.webp'],
  ['avatar-symbol-proporcion-aurea', 'Proporción áurea', 'avatar simbolo aureo 1.webp'],
  ['avatar-symbol-caballo', 'Caballo', 'avatar simbolo caballo 1.webp'],
  ['avatar-symbol-compas', 'Compás', 'avatar simbolo compas 1.webp'],
  ['avatar-symbol-corona-laureles', 'Corona de laureles', 'avatar simbolo corona de laureles 1.webp'],
  ['avatar-symbol-libro', 'Libro', 'avatar simbolo libro 1.webp'],
  ['avatar-symbol-microscopio', 'Microscopio', 'avatar simbolo microscopio 1.webp'],
  ['avatar-symbol-pluma', 'Pluma', 'avatar simbolo pluma 1.webp'],
  ['avatar-symbol-reloj-arena', 'Reloj de arena', 'avatar simbolo reloj de arena 1.webp'],
  ['avatar-symbol-telescopio', 'Telescopio', 'avatar simbolo telescopio 1.webp'],
  ['avatar-symbol-tigre', 'Tigre', 'avatar simbolo tigre 1.webp'],
] as Array<[string, string, string]>).map(([itemKey, name, assetFile]) => ({
  itemKey,
  itemType: 'AVATAR' as const,
  name,
  category: 'symbol' as const,
  assetFile,
  objectKey: `cosmetics/v1/avatars/${itemKey}.webp`,
  unlock: STARTER,
}));

const HISTORIC_AVATARS: CosmeticV1Entry[] = ([
  ['avatar-historic-euclides', 'Euclides', 'avatar euclides 1.webp'],
  ['avatar-historic-pitagoras', 'Pitágoras', 'avatar pitagoras 1.webp'],
  ['avatar-historic-marie-curie', 'Marie Curie', 'avatar marie curie 1.webp'],
  ['avatar-historic-shakespeare', 'William Shakespeare', 'avatar shakespeare 1.webp'],
  ['avatar-historic-napoleon', 'Napoleón Bonaparte', 'avatar napoleon 1.webp'],
] as Array<[string, string, string]>).map(([itemKey, name, assetFile]) => ({
  itemKey,
  itemType: 'AVATAR' as const,
  name,
  category: 'historic' as const,
  assetFile,
  objectKey: `cosmetics/v1/avatars/${itemKey}.webp`,
  unlock: STARTER,
}));

// ---------------------------------------------------------------------------
// 14 AVATAR_FRAME (7 de liga + 7 de nivel) -- ninguno Starter Kit
// ---------------------------------------------------------------------------

/** Las 7 ligas productivas V1 (§7, sin subdivisiones). `tierOrder` 1..7 estricto. */
export const LEAGUE_V1: Array<{ leagueKey: string; name: string; tierOrder: number; frameItemKey: string; frameAssetFile: string }> = [
  { leagueKey: 'bronce', name: 'Bronce', tierOrder: 1, frameItemKey: 'frame-league-bronce', frameAssetFile: 'marco bronce v1.webp' },
  { leagueKey: 'plata', name: 'Plata', tierOrder: 2, frameItemKey: 'frame-league-plata', frameAssetFile: 'marco plata v1.webp' },
  { leagueKey: 'oro', name: 'Oro', tierOrder: 3, frameItemKey: 'frame-league-oro', frameAssetFile: 'marco oro v1.webp' },
  { leagueKey: 'esmeralda', name: 'Esmeralda', tierOrder: 4, frameItemKey: 'frame-league-esmeralda', frameAssetFile: 'marco esmeralda v1.webp' },
  { leagueKey: 'diamante', name: 'Diamante', tierOrder: 5, frameItemKey: 'frame-league-diamante', frameAssetFile: 'marco diamante v1.webp' },
  { leagueKey: 'maestro', name: 'Maestro', tierOrder: 6, frameItemKey: 'frame-league-maestro', frameAssetFile: 'marco maestro v1.webp' },
  { leagueKey: 'gran-maestro', name: 'Gran Maestro', tierOrder: 7, frameItemKey: 'frame-league-gran-maestro', frameAssetFile: 'marco gran maestro v1.webp' },
];

/** §6: participantes por grupo y regla de promoción/descenso -- 6/6 exactos en un grupo de 30. */
export const LEAGUE_V1_PARTICIPANT_GROUP_SIZE = 30;
export const LEAGUE_V1_PROMOTION_RULE = 'top-percent:20';
export const LEAGUE_V1_DEMOTION_RULE = 'bottom-percent:20';
/** §6: duración de temporada. Aplicada al crear cada `game_season` (no es un campo de LeagueDefinition). */
export const LEAGUE_V1_SEASON_DURATION_DAYS = 7;

const LEAGUE_FRAMES: CosmeticV1Entry[] = LEAGUE_V1.map((l) => ({
  itemKey: l.frameItemKey,
  itemType: 'AVATAR_FRAME' as const,
  name: `Marco ${l.name}`,
  category: 'league-frame' as const,
  assetFile: l.frameAssetFile,
  objectKey: `cosmetics/v1/frames/${l.frameItemKey}.webp`,
  unlock: { kind: 'league', leagueKey: l.leagueKey },
}));

/** §6: marcos de nivel (obtención permanente, una vez, nunca autoequip). */
export const LEVEL_FRAME_LEVELS = [10, 20, 30, 40, 50, 60, 70] as const;

const LEVEL_FRAMES: CosmeticV1Entry[] = LEVEL_FRAME_LEVELS.map((level) => ({
  itemKey: `frame-level-${level}`,
  itemType: 'AVATAR_FRAME' as const,
  name: `Marco Nivel ${level}`,
  category: 'level-frame' as const,
  assetFile: `marco nivel ${level} v1.webp`,
  objectKey: `cosmetics/v1/frames/frame-level-${level}.webp`,
  unlock: { kind: 'level', level },
}));

// ---------------------------------------------------------------------------
// 5 PROFILE_BANNER (2 legacy starter + 3 nuevos desbloqueables por nivel)
// ---------------------------------------------------------------------------

const NEW_BANNERS: CosmeticV1Entry[] = [
  ['banner-biblioteca-ecos', 'Biblioteca de los Ecos', 'banner biblioteca v1.webp', 15],
  ['banner-laboratorio-aurora', 'Laboratorio de la Aurora', 'banner laboratorio v1.webp', 35],
  ['banner-sala-atlas', 'Sala del Atlas', 'banner sala del atlas v1.webp', 55],
].map(([itemKey, name, assetFile, level]) => ({
  itemKey: itemKey as string,
  itemType: 'PROFILE_BANNER' as const,
  name: name as string,
  category: 'banner' as const,
  assetFile: assetFile as string,
  objectKey: `cosmetics/v1/banners/${itemKey}.webp`,
  unlock: { kind: 'level' as const, level: level as number },
}));

// ---------------------------------------------------------------------------
// 6 ítems YA PRODUCTIVOS -- reconciliar, NO recrear ni re-subir (§2/§15)
// ---------------------------------------------------------------------------

const LEGACY_REUSED: CosmeticV1Entry[] = [
  { itemKey: 'asset2-avatar-humano-lentes', itemType: 'AVATAR', name: 'Estudiante con lentes', category: 'human', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
  { itemKey: 'asset1-avatar-buho', itemType: 'AVATAR', name: 'Búho', category: 'symbol', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
  { itemKey: 'asset2-avatar-pi', itemType: 'AVATAR', name: 'Pi', category: 'symbol', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
  { itemKey: 'asset2-avatar-astrolabio', itemType: 'AVATAR', name: 'Astrolabio', category: 'symbol', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
  { itemKey: 'asset1-banner-templo-conocimiento', itemType: 'PROFILE_BANNER', name: 'Templo del Conocimiento', category: 'banner', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
  { itemKey: 'asset2-banner-observatorio-horizonte', itemType: 'PROFILE_BANNER', name: 'Observatorio del Horizonte', category: 'banner', assetFile: null, objectKey: null, unlock: STARTER, legacy: true },
];

// ---------------------------------------------------------------------------
// Catálogo V1 completo (49 ítems) + derivados
// ---------------------------------------------------------------------------

export const COSMETICS_V1: readonly CosmeticV1Entry[] = [
  ...HUMAN_AVATARS,
  ...SYMBOL_AVATARS,
  ...HISTORIC_AVATARS,
  ...LEAGUE_FRAMES,
  ...LEVEL_FRAMES,
  ...NEW_BANNERS,
  ...LEGACY_REUSED,
];

/** Ítems nuevos (con asset a subir) -- excluye los 6 legacy. */
export const COSMETICS_V1_NEW: readonly CosmeticV1Entry[] = COSMETICS_V1.filter((e) => !e.legacy);

/** §10: Starter Kit V1 = 30 AVATAR + 2 PROFILE_BANNER = 32. Derivado, sin segunda fuente de verdad. */
export const COSMETICS_V1_STARTER_ITEM_KEYS: readonly string[] = COSMETICS_V1.filter((e) => e.unlock.kind === 'starter').map((e) => e.itemKey);

/** §11 + §6: mapeo nivel -> itemKey (marcos de nivel + banners de nivel). */
export const COSMETICS_V1_LEVEL_REWARDS: ReadonlyArray<{ level: number; itemKey: string }> = COSMETICS_V1.filter(
  (e): e is CosmeticV1Entry & { unlock: { kind: 'level'; level: number } } => e.unlock.kind === 'level',
).map((e) => ({ level: e.unlock.level, itemKey: e.itemKey }));

export const RARITY_CLASS_V1 = RARITY;
export const ASSET_DIR_BY_ITEM_TYPE: Record<CosmeticV1ItemType, string> = {
  AVATAR: AVATAR_DIR,
  AVATAR_FRAME: FRAME_DIR,
  PROFILE_BANNER: BANNER_DIR,
};

/** §7/§23: los 3 marcos legacy que salen del catálogo productivo V1 (status = RETIRED). */
export const COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS: readonly string[] = [
  'asset1-frame-madera-nivel5',
  'asset2-frame-bronce',
  'asset2-frame-plata',
];

// --- Sanity de compilación: los conteos del Product Lock (§3) ---
const _avatarCount = COSMETICS_V1.filter((e) => e.itemType === 'AVATAR').length;
const _frameCount = COSMETICS_V1.filter((e) => e.itemType === 'AVATAR_FRAME').length;
const _bannerCount = COSMETICS_V1.filter((e) => e.itemType === 'PROFILE_BANNER').length;
if (_avatarCount !== 30 || _frameCount !== 14 || _bannerCount !== 5 || COSMETICS_V1.length !== 49) {
  throw new Error(`cosmetics-v1-catalog: conteos inválidos (AVATAR=${_avatarCount} FRAME=${_frameCount} BANNER=${_bannerCount} total=${COSMETICS_V1.length}); se esperaba 30/14/5/49.`);
}
if (COSMETICS_V1_STARTER_ITEM_KEYS.length !== 32) {
  throw new Error(`cosmetics-v1-catalog: Starter Kit = ${COSMETICS_V1_STARTER_ITEM_KEYS.length}, se esperaba 32.`);
}
if (new Set(COSMETICS_V1.map((e) => e.itemKey)).size !== 49) {
  throw new Error('cosmetics-v1-catalog: itemKey duplicado.');
}
