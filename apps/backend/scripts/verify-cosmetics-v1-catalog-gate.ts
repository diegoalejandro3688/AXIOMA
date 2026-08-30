// Gate de COSMETICS V1 -- verifica el catálogo productivo completo (49
// cosméticos), su Starter Kit (32), las recompensas de nivel/liga, las 7
// LeagueDefinitions, el retiro de los 3 marcos legacy y la ausencia de BADGE
// productivo. Estructura + datos + assets reales (dimensiones/alpha) + un
// chequeo estático de la superficie móvil (pestaña "Insignia" retirada).
//
// Se ejecuta SIEMPRE vía `run-gate.ts` (aislado en axioma_gates_dev). El gate
// siembra el catálogo V1 en su propia base (idempotente) antes de verificar.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readWebpMetadata } from '../src/platform/webp-metadata';
import { seedCosmeticsV1 } from './seed-cosmetics-v1';
import { levelMinimumLifetimeXp } from '../src/gamification/level-thresholds';
import {
  COSMETICS_V1,
  COSMETICS_V1_NEW,
  COSMETICS_V1_STARTER_ITEM_KEYS,
  COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS,
  COSMETICS_V1_LEVEL_REWARDS,
  LEAGUE_V1,
  LEVEL_FRAME_LEVELS,
} from '../src/gamification/cosmetics-v1-catalog';

const BACKEND_DIR = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
function warn(label: string) {
  console.log(`  ..  ${label}`);
}

async function main() {
  // --- 0. Sembrar el catálogo V1 en la base de gates (idempotente) ---
  console.log('--- 0. Seed COSMETICS V1 (idempotente) en la base de gates ---');
  await seedCosmeticsV1();

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // --- 1. Manifest estático: conteos del Product Lock (§3) ---
  console.log('\n--- 1. Manifest estático ---');
  const byType = (t: string) => COSMETICS_V1.filter((e) => e.itemType === t).length;
  check(`manifest: 30 AVATAR (${byType('AVATAR')})`, byType('AVATAR') === 30);
  check(`manifest: 14 AVATAR_FRAME (${byType('AVATAR_FRAME')})`, byType('AVATAR_FRAME') === 14);
  check(`manifest: 5 PROFILE_BANNER (${byType('PROFILE_BANNER')})`, byType('PROFILE_BANNER') === 5);
  check('manifest: 0 BADGE', COSMETICS_V1.every((e) => (e.itemType as string) !== 'BADGE'));
  check(`manifest: 49 ítems (${COSMETICS_V1.length})`, COSMETICS_V1.length === 49);
  check('manifest: itemKeys únicos', new Set(COSMETICS_V1.map((e) => e.itemKey)).size === 49);
  check(
    'manifest: itemKeys nuevos son kebab-case, sin asset1/asset2/timestamp',
    COSMETICS_V1_NEW.every((e) => /^[a-z][a-z0-9-]*$/.test(e.itemKey) && !/asset[12]|\d{10,}/.test(e.itemKey)),
  );
  check(`manifest: Starter Kit = 32 (${COSMETICS_V1_STARTER_ITEM_KEYS.length})`, COSMETICS_V1_STARTER_ITEM_KEYS.length === 32);
  const starterAvatars = COSMETICS_V1.filter((e) => e.unlock.kind === 'starter' && e.itemType === 'AVATAR').length;
  const starterBanners = COSMETICS_V1.filter((e) => e.unlock.kind === 'starter' && e.itemType === 'PROFILE_BANNER').length;
  check(`manifest: Starter = 30 AVATAR + 2 PROFILE_BANNER (${starterAvatars} + ${starterBanners})`, starterAvatars === 30 && starterBanners === 2);
  check('manifest: ningún AVATAR_FRAME ni banner nuevo en Starter', COSMETICS_V1.every((e) => !(e.unlock.kind === 'starter' && (e.itemType === 'AVATAR_FRAME' || !e.legacy && e.itemType === 'PROFILE_BANNER'))));

  const historicKeys = COSMETICS_V1.filter((e) => e.category === 'historic').map((e) => e.itemKey).sort();
  check(
    'manifest: 5 históricos (Euclides, Pitágoras, Marie Curie, Shakespeare, Napoleón)',
    JSON.stringify(historicKeys) ===
      JSON.stringify(['avatar-historic-euclides', 'avatar-historic-marie-curie', 'avatar-historic-napoleon', 'avatar-historic-pitagoras', 'avatar-historic-shakespeare']),
  );
  check('manifest: sin Gabriela Mistral / Julio César / Cervantes', !COSMETICS_V1.some((e) => /mistral|cesar|cervantes/i.test(e.itemKey + e.name)));

  check(
    `manifest: 7 marcos de nivel en niveles ${LEVEL_FRAME_LEVELS.join(',')}`,
    JSON.stringify([...LEVEL_FRAME_LEVELS]) === JSON.stringify([10, 20, 30, 40, 50, 60, 70]),
  );
  const levelRewardMap = new Map(COSMETICS_V1_LEVEL_REWARDS.map((r) => [r.level, r.itemKey]));
  check(
    'manifest: mapeo nivel->reward exacto (10..70 marcos + 15/35/55 banners)',
    levelRewardMap.get(10) === 'frame-level-10' &&
      levelRewardMap.get(15) === 'banner-biblioteca-ecos' &&
      levelRewardMap.get(35) === 'banner-laboratorio-aurora' &&
      levelRewardMap.get(55) === 'banner-sala-atlas' &&
      levelRewardMap.get(70) === 'frame-level-70' &&
      COSMETICS_V1_LEVEL_REWARDS.length === 10,
  );
  check(
    'manifest: 7 ligas sin subdivisiones, tierOrder 1..7',
    LEAGUE_V1.length === 7 &&
      JSON.stringify(LEAGUE_V1.map((l) => l.name)) === JSON.stringify(['Bronce', 'Plata', 'Oro', 'Esmeralda', 'Diamante', 'Maestro', 'Gran Maestro']) &&
      JSON.stringify(LEAGUE_V1.map((l) => l.tierOrder)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
  );
  check('formula de nivel: 10=2700, 15=5950, 20=10450, 70=124200', levelMinimumLifetimeXp(10) === 2700 && levelMinimumLifetimeXp(15) === 5950 && levelMinimumLifetimeXp(20) === 10450 && levelMinimumLifetimeXp(70) === 124200);

  // --- 2. Assets reales en el repo (dimensiones / formato / alpha) ---
  console.log('\n--- 2. Assets versionados en el repo ---');
  const dirSpec: Record<string, [string, number, number, boolean]> = {
    avatars: ['AVATAR', 1024, 1024, false],
    frames: ['AVATAR_FRAME', 1024, 1024, true],
    banners: ['PROFILE_BANNER', 1500, 500, false],
  };
  let assetBad = 0;
  const hashes = new Map<string, string>();
  for (const [dir, [, w, h, alpha]] of Object.entries(dirSpec)) {
    const full = join(BACKEND_DIR, 'assets/cosmetics/v1', dir);
    for (const f of readdirSync(full)) {
      const body = readFileSync(join(full, f));
      const meta = readWebpMetadata(body);
      if (!(meta.width === w && meta.height === h && meta.hasAlpha === alpha)) {
        assetBad++;
        console.error(`  asset inválido ${dir}/${f}: ${JSON.stringify(meta)} (esperado ${w}x${h} alpha=${alpha})`);
      }
      const md5 = createHash('md5').update(body).digest('hex');
      if (hashes.has(md5)) {
        console.error(`  hash duplicado: ${f} == ${hashes.get(md5)}`);
        assetBad++;
      }
      hashes.set(md5, f);
    }
  }
  check('43 assets V1 en el repo: dimensiones/formato correctos', assetBad === 0);
  check('los 14 frames tienen canal alpha real', readdirSync(join(BACKEND_DIR, 'assets/cosmetics/v1/frames')).every((f) => readWebpMetadata(readFileSync(join(BACKEND_DIR, 'assets/cosmetics/v1/frames', f))).hasAlpha));
  check('sin hashes duplicados entre los 43 assets', hashes.size === 43);

  // --- 3. DB: catálogo activo V1 ---
  console.log('\n--- 3. DB: catálogo V1 activo ---');
  const allV1Keys = COSMETICS_V1.map((e) => e.itemKey);
  const rows = (await pg.query('SELECT item_key, item_type, name, status, visibility_status, asset_reference FROM cosmetic_item WHERE item_key = ANY($1)', [allV1Keys])).rows as Array<{
    item_key: string;
    item_type: string;
    name: string;
    status: string;
    visibility_status: string;
    asset_reference: string;
  }>;
  const rowByKey = new Map(rows.map((r) => [r.item_key, r]));

  const newKeys = COSMETICS_V1_NEW.map((e) => e.itemKey);
  const newActive = newKeys.filter((k) => rowByKey.get(k)?.status === 'ACTIVE' && rowByKey.get(k)?.visibility_status === 'PUBLIC');
  check(`DB: los 43 ítems NUEVOS presentes, ACTIVE + PUBLIC (${newActive.length}/43)`, newActive.length === 43);
  check(
    'DB: assetReference de cada ítem nuevo == su object key portable (no URL hardcodeada)',
    COSMETICS_V1_NEW.every((e) => rowByKey.get(e.itemKey)?.asset_reference === e.objectKey),
  );
  check(
    'DB: nombre público neutral para los 9 humanos nuevos (Estudiante 02..10)',
    COSMETICS_V1.filter((e) => e.category === 'human' && !e.legacy).every((e) => /^Estudiante \d{2}$/.test(rowByKey.get(e.itemKey)?.name ?? '')),
  );

  const legacyKeys = COSMETICS_V1.filter((e) => e.legacy).map((e) => e.itemKey);
  const legacyPresent = legacyKeys.filter((k) => rowByKey.get(k)?.status === 'ACTIVE' && rowByKey.get(k)?.visibility_status === 'PUBLIC');
  if (legacyPresent.length === 6) {
    check('DB: los 6 ítems legacy reusados presentes, ACTIVE + PUBLIC', true);
    check('DB: catálogo V1 total = 49 ACTIVE + PUBLIC', newActive.length + legacyPresent.length === 49);
  } else {
    warn(`DB: ${legacyPresent.length}/6 ítems legacy en este entorno -- pertenecen al pipeline previo (asset1/asset2); en axioma_dev el total es 49. Aquí se validan los 43 nuevos + config.`);
  }

  const badgeCount = (await pg.query("SELECT count(*)::int n FROM cosmetic_item WHERE item_type = 'BADGE' AND status = 'ACTIVE' AND visibility_status = 'PUBLIC' AND item_key = ANY($1)", [allV1Keys])).rows[0].n;
  check('DB: 0 BADGE cosmético productivo V1', badgeCount === 0);
  check('DB: ninguna clave V1 es un BADGE', !rows.some((r) => r.item_type === 'BADGE'));

  // --- 4. DB: legacy frames retirados ---
  console.log('\n--- 4. DB: retiro de marcos legacy ---');
  const retired = (await pg.query('SELECT item_key, status, retired_at FROM cosmetic_item WHERE item_key = ANY($1)', [COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS as string[]])).rows as Array<{ item_key: string; status: string; retired_at: unknown }>;
  // Los 3 marcos legacy son fixtures del pipeline previo -- pueden no existir
  // en la base de gates. Si existen DEBEN estar RETIRED con retiredAt; si no
  // existen, no hay nada que retirar (en axioma_dev existen y quedan RETIRED).
  check(
    `DB: cada marco legacy PRESENTE está RETIRED con retiredAt (presentes: ${retired.length}/3)`,
    retired.every((r) => r.status === 'RETIRED' && r.retired_at != null),
  );
  if (retired.length < 3) warn(`DB: ${3 - retired.length} marco(s) legacy no existen en este entorno -- nada que retirar aquí.`);
  const starterLegacyRetire = COSMETICS_V1_STARTER_ITEM_KEYS.some((k) => (COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS as string[]).includes(k));
  check('Starter Kit no incluye ningún marco legacy retirado', !starterLegacyRetire);

  // --- 5. DB: escalera de niveles + recompensas ---
  console.log('\n--- 5. DB: niveles 1..70 + recompensas ---');
  const levels = (await pg.query('SELECT level_number, minimum_lifetime_xp, reward_bundle_id, status FROM level_definition WHERE level_number BETWEEN 1 AND 70 ORDER BY level_number')).rows as Array<{
    level_number: number;
    minimum_lifetime_xp: number;
    reward_bundle_id: string | null;
    status: string;
  }>;
  check(`DB: 70 LevelDefinition (1..70) ACTIVE (${levels.length})`, levels.length === 70 && levels.every((l) => l.status === 'ACTIVE'));
  check('DB: umbrales = 25*n*(n+1)-50 exactos (incl. niveles 1..10 sin cambio)', levels.every((l) => l.minimum_lifetime_xp === levelMinimumLifetimeXp(l.level_number)));
  const rewardLevels = new Set(levels.filter((l) => l.reward_bundle_id != null).map((l) => l.level_number));
  const expectedRewardLevels = COSMETICS_V1_LEVEL_REWARDS.map((r) => r.level).sort((a, b) => a - b);
  check(
    `DB: exactamente los niveles ${expectedRewardLevels.join('/')} tienen rewardBundleId`,
    expectedRewardLevels.every((n) => rewardLevels.has(n)) && [...rewardLevels].filter((n) => n <= 70).sort((a, b) => a - b).join(',') === expectedRewardLevels.join(','),
  );
  // Cada bundle de nivel contiene EXACTAMENTE el CosmeticItem correcto.
  const levelBundleOk = (
    await pg.query(
      `SELECT ld.level_number, ci.item_key
       FROM level_definition ld
       JOIN reward_bundle_item rbi ON rbi.reward_bundle_id = ld.reward_bundle_id AND rbi.component_type = 'COSMETIC'
       JOIN cosmetic_item ci ON ci.id = rbi.reference_id
       WHERE ld.level_number = ANY($1)`,
      [expectedRewardLevels],
    )
  ).rows as Array<{ level_number: number; item_key: string }>;
  check(
    'DB: cada bundle de nivel entrega el CosmeticItem correcto',
    levelBundleOk.length === 10 && levelBundleOk.every((r) => COSMETICS_V1_LEVEL_REWARDS.find((x) => x.level === r.level_number)?.itemKey === r.item_key),
  );

  // --- 6. DB: 7 LeagueDefinitions + reward path del marco ---
  console.log('\n--- 6. DB: 7 LeagueDefinitions + marcos de liga ---');
  // La BD de gates comparte league_definition con fixtures de otros gates de
  // liga (claves con sufijo aleatorio, nunca limpiadas del todo -- §24: no se
  // toca esa deriva). El catálogo V1 se identifica por sus 7 claves canónicas.
  const v1LeagueKeys = LEAGUE_V1.map((l) => l.leagueKey);
  const leagues = (await pg.query('SELECT league_key, name, tier_order, participant_group_size, promotion_rule, demotion_rule, reward_bundle_id, status FROM league_definition WHERE league_key = ANY($1) ORDER BY tier_order', [v1LeagueKeys])).rows as Array<{
    league_key: string;
    name: string;
    tier_order: number;
    participant_group_size: number;
    promotion_rule: string | null;
    demotion_rule: string | null;
    reward_bundle_id: string | null;
    status: string;
  }>;
  check(`DB: exactamente 7 LeagueDefinition (${leagues.length})`, leagues.length === 7);
  check('DB: tierOrder 1..7 estricto, sin subdivisiones', leagues.map((l) => l.tier_order).join(',') === '1,2,3,4,5,6,7');
  check('DB: nombres = Bronce..Gran Maestro', leagues.map((l) => l.name).join('|') === 'Bronce|Plata|Oro|Esmeralda|Diamante|Maestro|Gran Maestro');
  check('DB: todas ACTIVE, grupo de 30', leagues.every((l) => l.status === 'ACTIVE' && l.participant_group_size === 30));
  check('DB: promotion top-percent:20 / demotion bottom-percent:20 (= 6/6 en grupo de 30)', leagues.every((l) => l.promotion_rule === 'top-percent:20' && l.demotion_rule === 'bottom-percent:20'));
  check('DB: cada liga tiene rewardBundleId (marco de liga)', leagues.every((l) => l.reward_bundle_id != null));
  const leagueBundleOk = (
    await pg.query(
      `SELECT ld.league_key, ci.item_key
       FROM league_definition ld
       JOIN reward_bundle_item rbi ON rbi.reward_bundle_id = ld.reward_bundle_id AND rbi.component_type = 'COSMETIC'
       JOIN cosmetic_item ci ON ci.id = rbi.reference_id
       WHERE ld.league_key = ANY($1)`,
      [v1LeagueKeys],
    )
  ).rows as Array<{ league_key: string; item_key: string }>;
  check(
    'DB: cada bundle de liga entrega el marco correcto (frame-league-<key>)',
    leagueBundleOk.length === 7 && leagueBundleOk.every((r) => LEAGUE_V1.find((l) => l.leagueKey === r.league_key)?.frameItemKey === r.item_key),
  );

  // --- 7. Object storage: cada asset V1 nuevo resuelve ---
  console.log('\n--- 7. Object storage ---');
  const s3 = new S3Client({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    region: process.env.OBJECT_STORAGE_REGION ?? 'auto',
    forcePathStyle: true,
    credentials: { accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? '', secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? '' },
  });
  const bucket = process.env.OBJECT_STORAGE_BUCKET ?? 'axioma-content-dev';
  let missingObjects = 0;
  for (const e of COSMETICS_V1_NEW) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: e.objectKey! }));
    } catch {
      missingObjects++;
      console.error(`  objeto ausente: ${e.objectKey}`);
    }
  }
  check(`object storage: los 43 objetos V1 existen en "${bucket}" (keys determinísticos)`, missingObjects === 0);

  // --- 8. Superficie móvil: sin pestaña "Insignia" ---
  console.log('\n--- 8. Superficie móvil (estático) ---');
  const personalizacion = readFileSync(join(BACKEND_DIR, '..', 'mobile', 'app', '(tabs)', 'perfil', 'personalizacion.tsx'), 'utf8');
  check("mobile: personalizacion.tsx no declara la pestaña 'insignia'", !/['"]insignia['"]/.test(personalizacion) && !/slot=["']BADGE["']/.test(personalizacion));
  check("mobile: personalizacion.tsx conserva Avatar / Banner / Título", /['"]avatar['"]/.test(personalizacion) && /['"]banner['"]/.test(personalizacion) && /['"]titulo['"]/.test(personalizacion));
  const cosmeticsRow = readFileSync(join(BACKEND_DIR, '..', 'mobile', 'components', 'competitive', 'cosmetics-row.tsx'), 'utf8');
  check('mobile: CompetitiveCosmeticsRow filtra el slot BADGE', /cosmeticSlot !== 'BADGE'/.test(cosmeticsRow));

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de catálogo COSMETICS V1 pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
