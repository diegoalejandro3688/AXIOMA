/**
 * AVATARES HISTÓRICOS V1 -- seed NARROW e IDEMPOTENTE de las 5
 * `reward_bundle` canónicas de avatar histórico (`cosmetics-v1-historic-*`).
 *
 * Motivación (PROD-SYNC-2B.1): producción quedó con el catálogo cosmético V1
 * completo (49 `cosmetic_item` ACTIVE) pero SIN los 5 `reward_bundle` de
 * avatar histórico que `avatars:reconcile-historical-v1` /
 * `RewardEvaluationWorker.evaluateHistoricalAvatars` resuelven por
 * `bundleKey`. `cosmetics:seed-v1` crea esos 5 bundles pero SÓLO como parte
 * de un recorrido mucho más amplio (subida a object storage, upsert de las 7
 * `LeagueDefinition` en vivo, 70 `LevelDefinition`, etc.) -- fuera del
 * alcance de sincronización aprobado. Este comando es la remediación
 * ESTRECHA y CANÓNICA de esa única brecha.
 *
 * Contrato (idéntico a `seed-cosmetics-v1.ts` §6b y al fixture de
 * `verify-historical-avatar-subject-unlock-gate.ts`):
 *   bundleKey  = `cosmetics-v1-historic-${itemKey}`
 *   name       = `Avatar histórico: ${itemKey}`
 *   status     = ACTIVE
 *   items      = [ { componentType: 'COSMETIC', referenceId: <cosmetic_item.id>, xpAmount: null } ]
 * donde `itemKey` recorre EXACTAMENTE las claves de `HISTORIC_AVATAR_SUBJECT_MAP`
 * (fuente de verdad única y congelada -- 5 entradas).
 *
 * SÓLO BASE DE DATOS: sin cliente S3, sin ObjectStorageService, sin
 * PutObject, sin subir assets. NO crea/edita `cosmetic_item`,
 * `league_definition`, `level_definition`, `inventory_item`, `reward_grant`
 * ni ninguna fila de cuenta. Exactamente 5 `reward_bundle` (+ 5
 * `reward_bundle_item`) como techo absoluto.
 *
 * FAIL-CLOSED: antes de crear un bundle, el `cosmetic_item` canónico debe
 * existir con `itemType=AVATAR`, `status=ACTIVE`, `visibilityStatus=PUBLIC`,
 * y la materia mapeada debe existir. Si un `reward_bundle` con ese
 * `bundleKey` ya existe pero DIVERGE del contrato congelado (nombre,
 * status, o el conjunto de items), el comando FALLA sin sobrescribir nada
 * y sin escrituras parciales.
 *
 * IDEMPOTENTE: primera corrida real crea sólo los bundles ausentes; la
 * segunda no cambia nada (5 ALREADY_OK, 0 creados). Los 5 creates ocurren
 * en UNA transacción acotada.
 *
 * Uso:
 *   pnpm --filter @axioma/backend avatars:seed-historical-bundles-v1
 *   pnpm --filter @axioma/backend avatars:seed-historical-bundles-v1 -- --dry-run
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { CosmeticItemRepository } from '../src/gamification/cosmetic-item.repository';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { SubjectRepository } from '../src/education/subject.repository';
import { HISTORIC_AVATAR_SUBJECT_MAP } from '../src/gamification/cosmetics-v1-catalog';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export type HistoricalAvatarBundleOutcome = 'WOULD_CREATE' | 'ALREADY_OK';

export interface HistoricalAvatarBundlePlanEntry {
  itemKey: string;
  subjectKey: string;
  bundleKey: string;
  cosmeticItemId: string;
  outcome: HistoricalAvatarBundleOutcome;
}

export interface SeedHistoricalAvatarBundlesResult {
  created: number;
  alreadyOk: number;
  entries: HistoricalAvatarBundlePlanEntry[];
}

function bundleKeyFor(itemKey: string): string {
  return `cosmetics-v1-historic-${itemKey}`;
}
function bundleNameFor(itemKey: string): string {
  return `Avatar histórico: ${itemKey}`;
}

class DivergenceError extends Error {}

/**
 * Compara un `reward_bundle` existente (con `items`) contra el contrato
 * congelado. Lanza `DivergenceError` si diverge; retorna en silencio si ya
 * está correcto.
 */
function assertExistingBundleMatchesContract(
  bundle: { bundleKey: string; name: string; status: string; items: Array<{ componentType: string; referenceId: string | null; xpAmount: number | null }> },
  expectedName: string,
  expectedCosmeticItemId: string,
): void {
  if (bundle.status !== 'ACTIVE') {
    throw new DivergenceError(`"${bundle.bundleKey}" ya existe con status=${bundle.status} (se esperaba ACTIVE).`);
  }
  if (bundle.name !== expectedName) {
    throw new DivergenceError(`"${bundle.bundleKey}" ya existe con name="${bundle.name}" (se esperaba "${expectedName}").`);
  }
  if (bundle.items.length !== 1) {
    throw new DivergenceError(`"${bundle.bundleKey}" ya existe con ${bundle.items.length} item(s) (se esperaba exactamente 1 COSMETIC).`);
  }
  const [item] = bundle.items;
  if (item.componentType !== 'COSMETIC' || item.xpAmount !== null) {
    throw new DivergenceError(`"${bundle.bundleKey}": item con componentType=${item.componentType}/xpAmount=${item.xpAmount} (se esperaba COSMETIC/null).`);
  }
  if (item.referenceId !== expectedCosmeticItemId) {
    throw new DivergenceError(
      `"${bundle.bundleKey}": item apunta a cosmetic_item ${item.referenceId} (se esperaba ${expectedCosmeticItemId}). ` +
        `Conflicto semántico -- revisar manualmente, no se sobrescribe.`,
    );
  }
}

export async function seedHistoricalAvatarBundlesV1({ dryRun }: { dryRun: boolean }): Promise<SeedHistoricalAvatarBundlesResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;

  try {
    const cosmeticItemRepo = new CosmeticItemRepository(prisma);
    const bundleRepo = new RewardBundleRepository(prisma);
    const subjectRepo = new SubjectRepository(prisma);

    console.log(`=== AVATARES HISTÓRICOS V1 -- seed de reward bundles ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

    const map = Object.entries(HISTORIC_AVATAR_SUBJECT_MAP);
    if (map.length !== 5) {
      throw new Error(`HISTORIC_AVATAR_SUBJECT_MAP debe tener exactamente 5 entradas, tiene ${map.length}.`);
    }

    const entries: HistoricalAvatarBundlePlanEntry[] = [];
    // Bundles a crear, resueltos ANTES de cualquier escritura (fail-closed).
    const toCreate: Array<{ bundleKey: string; name: string; cosmeticItemId: string }> = [];

    for (const [itemKey, subjectKey] of map) {
      // --- FAIL-CLOSED 1: cosmetic_item canónico ---
      const cosmetic = await cosmeticItemRepo.findByItemKey(itemKey);
      if (!cosmetic) {
        throw new Error(`cosmetic_item "${itemKey}" no existe -- este comando NO crea cosméticos. Corre el pipeline de catálogo primero.`);
      }
      if (cosmetic.itemType !== 'AVATAR') {
        throw new Error(`cosmetic_item "${itemKey}" tiene itemType=${cosmetic.itemType} (se esperaba AVATAR).`);
      }
      if (cosmetic.status !== 'ACTIVE') {
        throw new Error(`cosmetic_item "${itemKey}" tiene status=${cosmetic.status} (se esperaba ACTIVE).`);
      }
      if (cosmetic.visibilityStatus !== 'PUBLIC') {
        throw new Error(`cosmetic_item "${itemKey}" tiene visibilityStatus=${cosmetic.visibilityStatus} (se esperaba PUBLIC).`);
      }

      // --- FAIL-CLOSED 2: materia canónica mapeada ---
      const subject = await subjectRepo.findByKey(subjectKey);
      if (!subject) {
        throw new Error(`avatar histórico "${itemKey}": materia canónica "${subjectKey}" no existe.`);
      }

      const bundleKey = bundleKeyFor(itemKey);
      const expectedName = bundleNameFor(itemKey);
      const existing = await bundleRepo.findByBundleKey(bundleKey);

      if (existing) {
        assertExistingBundleMatchesContract(
          { bundleKey, name: existing.name, status: existing.status, items: existing.items.map((i) => ({ componentType: i.componentType, referenceId: i.referenceId, xpAmount: i.xpAmount })) },
          expectedName,
          cosmetic.id,
        );
        console.log(`  =  ALREADY_OK  "${bundleKey}" -> ${itemKey} (${subjectKey})`);
        entries.push({ itemKey, subjectKey, bundleKey, cosmeticItemId: cosmetic.id, outcome: 'ALREADY_OK' });
        continue;
      }

      console.log(`  +  ${dryRun ? 'WOULD_CREATE' : 'CREATE'}    "${bundleKey}" -> ${itemKey} (${subjectKey})`);
      entries.push({ itemKey, subjectKey, bundleKey, cosmeticItemId: cosmetic.id, outcome: 'WOULD_CREATE' });
      toCreate.push({ bundleKey, name: expectedName, cosmeticItemId: cosmetic.id });
    }

    const alreadyOk = entries.filter((e) => e.outcome === 'ALREADY_OK').length;

    if (dryRun) {
      console.log(`\n=== DRY RUN OK: ${toCreate.length} WOULD_CREATE, ${alreadyOk} ALREADY_OK (0 escrituras) ===`);
      return { created: 0, alreadyOk, entries };
    }

    let created = 0;
    if (toCreate.length > 0) {
      // Los N creates faltantes en UNA transacción acotada (sin locks largos:
      // 5 INSERT + 5 INSERT como máximo).
      await prisma.$transaction(
        toCreate.map((b) =>
          (prisma as unknown as PrismaClient).rewardBundle.create({
            data: {
              bundleKey: b.bundleKey,
              name: b.name,
              items: { create: [{ componentType: 'COSMETIC', referenceId: b.cosmeticItemId }] },
            },
          }),
        ),
      );
      created = toCreate.length;
    }

    console.log(`\n=== SEED COMPLETO: ${created} bundle(s) creado(s), ${alreadyOk} ya existente(s) sin divergencia ===`);
    return { created, alreadyOk, entries };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  seedHistoricalAvatarBundlesV1({ dryRun }).catch((error: unknown) => {
    const isDivergence = error instanceof DivergenceError;
    console.error(`\nERROR${isDivergence ? ' (DIVERGENCE, fail-closed)' : ''}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
