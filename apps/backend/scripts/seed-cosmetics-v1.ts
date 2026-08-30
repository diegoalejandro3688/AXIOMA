/**
 * COSMETICS-V1 -- seed REPRODUCIBLE e IDEMPOTENTE del catálogo productivo V1.
 * Reemplaza los scripts ad-hoc `seed-asset1/2-*.ts` (paths personales de
 * Downloads, keys con `Date.now()`) por una única fuente de verdad versionada
 * (`src/gamification/cosmetics-v1-catalog.ts` + `assets/cosmetics/v1/`).
 *
 * Correr N veces produce el MISMO estado: sin CosmeticItem duplicados, sin
 * RewardBundle/RewardBundleItem duplicados, sin InventoryItem tocado, sin
 * objetos MinIO huérfanos (keys determinísticos, PutObject sobrescribe).
 *
 * Reutiliza EXCLUSIVAMENTE la arquitectura existente:
 *   - ObjectStorageService (bucket privado + URL firmada, ADR-0010)
 *   - CosmeticItem / RewardBundle / RewardBundleItem
 *   - LevelDefinition.rewardBundleId -> RewardEvaluationWorker (marcos/banners de nivel)
 *   - LeagueDefinition.rewardBundleId -> LeagueEnrollmentService (marcos de liga)
 *   - status = RETIRED para retirar los 3 marcos legacy
 *
 * NO crea entidades nuevas, NO añade endpoints, NO añade schedulers.
 *
 * Uso:
 *   pnpm --filter @axioma/backend cosmetics:seed-v1            (upload + ensure)
 *   pnpm --filter @axioma/backend cosmetics:seed-v1 -- --dry-run   (valida assets, no escribe)
 */
import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '../src/generated/prisma/client';
import { readWebpMetadata } from '../src/platform/webp-metadata';
import { levelLadderThresholds } from '../src/gamification/level-thresholds';
import {
  COSMETICS_V1,
  COSMETICS_V1_NEW,
  COSMETICS_V1_STARTER_ITEM_KEYS,
  COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS,
  LEAGUE_V1,
  LEAGUE_V1_PARTICIPANT_GROUP_SIZE,
  LEAGUE_V1_PROMOTION_RULE,
  LEAGUE_V1_DEMOTION_RULE,
  RARITY_CLASS_V1,
  type CosmeticV1Entry,
} from '../src/gamification/cosmetics-v1-catalog';

const BACKEND_DIR = join(__dirname, '..');

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

// --- 1. Validación de assets (dimensiones / formato / alpha / hashes) ----------

interface ValidatedAsset {
  entry: CosmeticV1Entry;
  path: string;
  body: Buffer;
  md5: string;
}

function expectedSpec(entry: CosmeticV1Entry): { w: number; h: number; alpha: boolean } {
  if (entry.itemType === 'AVATAR') return { w: 1024, h: 1024, alpha: false };
  if (entry.itemType === 'AVATAR_FRAME') return { w: 1024, h: 1024, alpha: true };
  return { w: 1500, h: 500, alpha: false }; // PROFILE_BANNER, 3:1
}

function assetDir(entry: CosmeticV1Entry): string {
  if (entry.itemType === 'AVATAR') return 'assets/cosmetics/v1/avatars';
  if (entry.itemType === 'AVATAR_FRAME') return 'assets/cosmetics/v1/frames';
  return 'assets/cosmetics/v1/banners';
}

function validateAssets(): ValidatedAsset[] {
  const validated: ValidatedAsset[] = [];
  const seenHashes = new Map<string, string>();
  const seenKeys = new Set<string>();

  for (const entry of COSMETICS_V1_NEW) {
    if (!entry.assetFile || !entry.objectKey) fail(`"${entry.itemKey}": entrada nueva sin assetFile/objectKey.`);
    if (seenKeys.has(entry.objectKey)) fail(`objectKey duplicado: ${entry.objectKey}`);
    seenKeys.add(entry.objectKey);

    const path = join(BACKEND_DIR, assetDir(entry), entry.objectKey.split('/').pop()!);
    if (!existsSync(path)) fail(`asset no encontrado para "${entry.itemKey}": ${path}`);
    const body = readFileSync(path);
    const md5 = createHash('md5').update(body).digest('hex');
    const dup = seenHashes.get(md5);
    if (dup) fail(`hash duplicado: "${entry.itemKey}" y "${dup}" comparten bytes (${md5}).`);
    seenHashes.set(md5, entry.itemKey);

    const meta = readWebpMetadata(body);
    const spec = expectedSpec(entry);
    if (meta.format !== 'webp') fail(`"${entry.itemKey}": no es WebP.`);
    if (meta.width !== spec.w || meta.height !== spec.h) {
      fail(`"${entry.itemKey}": dimensiones ${meta.width}x${meta.height}, se esperaba ${spec.w}x${spec.h}.`);
    }
    if (meta.hasAlpha !== spec.alpha) {
      fail(`"${entry.itemKey}": alpha=${meta.hasAlpha}, se esperaba ${spec.alpha} (${entry.itemType}).`);
    }
    if (body.length < 2_000 || body.length > 2_000_000) {
      fail(`"${entry.itemKey}": tamaño inusual (${body.length} bytes).`);
    }
    validated.push({ entry, path, body, md5 });
  }

  // Sanidad global de itemKeys (49) + starter (32).
  if (new Set(COSMETICS_V1.map((e) => e.itemKey)).size !== 49) fail('catálogo V1: itemKey duplicado.');
  if (COSMETICS_V1_STARTER_ITEM_KEYS.length !== 32) fail(`Starter Kit: ${COSMETICS_V1_STARTER_ITEM_KEYS.length} claves, se esperaba 32.`);
  console.log(`  ${validated.length} assets nuevos validados (dimensiones/formato/alpha/hashes OK).`);
  return validated;
}

// --- 2. Object storage (bucket privado, keys determinísticos) ------------------

async function ensureBucket(s3: S3Client, bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`  Bucket "${bucket}" creado (no existía).`);
  }
}

async function uploadAll(s3: S3Client, bucket: string, assets: ValidatedAsset[]) {
  for (const a of assets) {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: a.entry.objectKey!, Body: a.body, ContentType: 'image/webp' }));
  }
  console.log(`  ${assets.length} objetos subidos a "${bucket}" (keys determinísticos, sin duplicar).`);
}

// --- 3-7. DB ------------------------------------------------------------------

export async function seedCosmeticsV1(opts: { dryRun?: boolean } = {}): Promise<void> {
  const dryRun = opts.dryRun ?? false;
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  if (!endpoint) fail('OBJECT_STORAGE_ENDPOINT no configurado.');
  const bucket = process.env.OBJECT_STORAGE_BUCKET ?? 'axioma-content-dev';

  console.log(`=== COSMETICS V1 SEED -- dry-run: ${dryRun} -- bucket: ${bucket} ===\n`);

  console.log('--- 1. Validación de assets ---');
  const assets = validateAssets();
  if (dryRun) {
    console.log('\n[dry-run] assets válidos. Nada escrito.');
    return;
  }

  const s3 = new S3Client({
    endpoint,
    region: process.env.OBJECT_STORAGE_REGION ?? 'auto',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? '',
    },
  });
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  console.log('\n--- 2. Object storage ---');
  await ensureBucket(s3, bucket);
  await uploadAll(s3, bucket, assets);

  console.log('\n--- 3. Escalera de niveles 1..70 ---');
  for (const { levelNumber, minimumLifetimeXp } of levelLadderThresholds()) {
    await prisma.levelDefinition.upsert({
      where: { levelNumber },
      update: { minimumLifetimeXp, status: 'ACTIVE' },
      create: { levelNumber, minimumLifetimeXp, levelName: null },
    });
  }
  console.log('  70 LevelDefinition aseguradas (formula 25*n*(n+1)-50).');

  console.log('\n--- 4. CosmeticItem (49) ---');
  const cosmeticIdByKey = new Map<string, string>();
  let created = 0;
  let reconciled = 0;
  let legacyMissing = 0;
  for (const entry of COSMETICS_V1) {
    const existing = await prisma.cosmeticItem.findUnique({ where: { itemKey: entry.itemKey } });
    if (entry.legacy) {
      if (!existing) {
        legacyMissing += 1;
        console.warn(`  LEGACY AUSENTE: "${entry.itemKey}" no existe en este entorno -- pertenece al pipeline previo (asset1/asset2). Omitido; no se recrea aquí.`);
        continue;
      }
      const patch: Record<string, unknown> = {};
      if (existing.name !== entry.name) patch.name = entry.name;
      if (existing.status !== 'ACTIVE') patch.status = 'ACTIVE';
      if (existing.visibilityStatus !== 'PUBLIC') patch.visibilityStatus = 'PUBLIC';
      if (Object.keys(patch).length > 0) {
        await prisma.cosmeticItem.update({ where: { id: existing.id }, data: patch });
        reconciled += 1;
      }
      cosmeticIdByKey.set(entry.itemKey, existing.id);
      continue;
    }
    // Ítem nuevo -- assetReference = object key PORTABLE (resuelto por ObjectStorageService).
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (existing.name !== entry.name) patch.name = entry.name;
      if (existing.assetReference !== entry.objectKey) patch.assetReference = entry.objectKey;
      if (existing.status !== 'ACTIVE') patch.status = 'ACTIVE';
      if (existing.visibilityStatus !== 'PUBLIC') patch.visibilityStatus = 'PUBLIC';
      if (Object.keys(patch).length > 0) {
        await prisma.cosmeticItem.update({ where: { id: existing.id }, data: patch });
        reconciled += 1;
      }
      cosmeticIdByKey.set(entry.itemKey, existing.id);
    } else {
      const row = await prisma.cosmeticItem.create({
        data: {
          itemKey: entry.itemKey,
          itemType: entry.itemType,
          name: entry.name,
          description: entry.description ?? null,
          rarityClass: RARITY_CLASS_V1,
          assetReference: entry.objectKey!,
          visibilityStatus: 'PUBLIC',
          status: 'ACTIVE',
        },
      });
      cosmeticIdByKey.set(entry.itemKey, row.id);
      created += 1;
    }
  }
  console.log(`  ${created} creados, ${reconciled} reconciliados, ${legacyMissing} legacy ausentes.`);

  console.log('\n--- 5. Reward bundles: marcos/banners de nivel ---');
  async function ensureCosmeticBundle(bundleKey: string, name: string, cosmeticItemId: string): Promise<string> {
    let bundle = await prisma.rewardBundle.findUnique({ where: { bundleKey }, include: { items: true } });
    if (!bundle) {
      bundle = await prisma.rewardBundle.create({
        data: { bundleKey, name, items: { create: [{ componentType: 'COSMETIC', referenceId: cosmeticItemId }] } },
        include: { items: true },
      });
      return bundle.id;
    }
    const hasItem = bundle.items.some((i) => i.componentType === 'COSMETIC' && i.referenceId === cosmeticItemId);
    if (!hasItem) {
      await prisma.rewardBundleItem.create({ data: { rewardBundleId: bundle.id, componentType: 'COSMETIC', referenceId: cosmeticItemId } });
    }
    return bundle.id;
  }

  for (const entry of COSMETICS_V1.filter((e): e is CosmeticV1Entry & { unlock: { kind: 'level'; level: number } } => e.unlock.kind === 'level')) {
    const cosmeticItemId = cosmeticIdByKey.get(entry.itemKey);
    if (!cosmeticItemId) fail(`level reward: falta CosmeticItem "${entry.itemKey}".`);
    const level = entry.unlock.level;
    const bundleId = await ensureCosmeticBundle(`cosmetics-v1-level-${level}`, `Recompensa de nivel ${level}: ${entry.name}`, cosmeticItemId);
    const lvl = await prisma.levelDefinition.findUnique({ where: { levelNumber: level } });
    if (!lvl) fail(`level ${level} no existe tras la escalera.`);
    if (lvl.rewardBundleId == null) {
      await prisma.levelDefinition.update({ where: { levelNumber: level }, data: { rewardBundleId: bundleId } });
    } else if (lvl.rewardBundleId !== bundleId) {
      console.warn(`  Nivel ${level} ya tiene rewardBundleId=${lvl.rewardBundleId} (distinto) -- NO se sobrescribe.`);
    }
  }
  console.log('  10 niveles con recompensa (10/15/20/30/35/40/50/55/60/70) conectados.');

  console.log('\n--- 6. LeagueDefinition (7) + reward bundles de marco de liga ---');
  for (const league of LEAGUE_V1) {
    const frameId = cosmeticIdByKey.get(league.frameItemKey);
    if (!frameId) fail(`league frame: falta CosmeticItem "${league.frameItemKey}".`);
    const bundleId = await ensureCosmeticBundle(
      `cosmetics-v1-league-${league.leagueKey}`,
      `Marco de liga ${league.name}`,
      frameId,
    );
    await prisma.leagueDefinition.upsert({
      where: { leagueKey: league.leagueKey },
      create: {
        leagueKey: league.leagueKey,
        name: league.name,
        tierOrder: league.tierOrder,
        participantGroupSize: LEAGUE_V1_PARTICIPANT_GROUP_SIZE,
        promotionRule: LEAGUE_V1_PROMOTION_RULE,
        demotionRule: LEAGUE_V1_DEMOTION_RULE,
        rewardBundleId: bundleId,
        status: 'ACTIVE',
      },
      update: {
        name: league.name,
        tierOrder: league.tierOrder,
        participantGroupSize: LEAGUE_V1_PARTICIPANT_GROUP_SIZE,
        promotionRule: LEAGUE_V1_PROMOTION_RULE,
        demotionRule: LEAGUE_V1_DEMOTION_RULE,
        rewardBundleId: bundleId,
        status: 'ACTIVE',
      },
    });
  }
  console.log('  7 LeagueDefinition (Bronce..Gran Maestro, tierOrder 1..7, grupo 30, top/bottom 20%) con marco conectado.');

  console.log('\n--- 7. Retiro de marcos legacy ---');
  const retire = await prisma.cosmeticItem.updateMany({
    where: { itemKey: { in: [...COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS] }, status: 'ACTIVE' },
    data: { status: 'RETIRED', retiredAt: new Date() },
  });
  console.log(`  ${retire.count} marcos legacy retirados (status=RETIRED): ${COSMETICS_V1_LEGACY_RETIRE_ITEM_KEYS.join(', ')} (filas históricas intactas).`);

  console.log('\n--- Resumen ---');
  const [nAvatar, nFrame, nBanner] = await Promise.all([
    prisma.cosmeticItem.count({ where: { itemType: 'AVATAR', status: 'ACTIVE', visibilityStatus: 'PUBLIC', itemKey: { in: COSMETICS_V1.map((e) => e.itemKey) } } }),
    prisma.cosmeticItem.count({ where: { itemType: 'AVATAR_FRAME', status: 'ACTIVE', visibilityStatus: 'PUBLIC', itemKey: { in: COSMETICS_V1.map((e) => e.itemKey) } } }),
    prisma.cosmeticItem.count({ where: { itemType: 'PROFILE_BANNER', status: 'ACTIVE', visibilityStatus: 'PUBLIC', itemKey: { in: COSMETICS_V1.map((e) => e.itemKey) } } }),
  ]);
  console.log(`  V1 ACTIVE+PUBLIC: AVATAR=${nAvatar} AVATAR_FRAME=${nFrame} PROFILE_BANNER=${nBanner} (esperado 30/14/5, menos legacy ausentes).`);
  console.log(`  Starter Kit: ${COSMETICS_V1_STARTER_ITEM_KEYS.length} claves.`);

  await prisma.$disconnect();
  console.log('\n=== COSMETICS V1 SEED COMPLETO ===');
}

// CLI: `pnpm --filter @axioma/backend cosmetics:seed-v1 [-- --dry-run]`
if (require.main === module) {
  seedCosmeticsV1({ dryRun: process.argv.slice(2).includes('--dry-run') }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
