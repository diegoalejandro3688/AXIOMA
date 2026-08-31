/**
 * DESAFÍOS V1 -- aprovisionamiento DETERMINISTA e IDEMPOTENTE del contenido
 * de desafíos (último bloque de contenido V1).
 *
 * NO es arquitectura nueva:
 *   - cada fila es una `challenge_definition` normal (§4.8, inmutable por fila);
 *   - la regla de completitud es la existente `CUMULATIVE_COUNT`;
 *   - la elegibilidad es la existente `ALL_ACCOUNTS`;
 *   - las recompensas son `reward_bundle` + `reward_bundle_item` (`XP_BONUS`)
 *     entregadas por el `RewardEvaluationWorker` vía `CHALLENGE_CLAIM`;
 *   - NO hay cron/scheduler -- el horizonte de 365 días diarios se
 *     pre-provisiona (§9/§10/§24).
 *
 * Correr N veces produce el MISMO estado:
 *   - sin `challenge_definition` duplicadas (clave determinista `v1-...`);
 *   - sin `reward_bundle` duplicados (`bundleKey` `challenge-v1-xp-*`);
 *   - una fila V1 preexistente que NO coincide exactamente con su
 *     configuración inmutable esperada => FALLA ruidosamente, nunca se
 *     muta en silencio (§14).
 *
 * Uso:
 *   pnpm --filter @axioma/backend challenges:seed-v1
 *   pnpm --filter @axioma/backend challenges:seed-v1 -- --dry-run
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { parseCompletionRule, parseEligibilityRule } from '../src/gamification/challenge-rule';
import {
  CHALLENGE_V1_REWARD_BUNDLES,
  generateChallengeV1Definitions,
  type GeneratedChallengeV1Definition,
} from '../src/gamification/challenges-v1-catalog';

export interface SeedChallengesV1Result {
  rewardBundlesEnsured: number;
  definitionsExpected: number;
  definitionsCreated: number;
  definitionsMatched: number;
  dailyCount: number;
  weeklyCount: number;
}

class ImmutableContradictionError extends Error {}

export async function seedChallengesV1(opts: { dryRun?: boolean } = {}): Promise<SeedChallengesV1Result> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    return await run(prisma, opts.dryRun ?? false);
  } finally {
    await prisma.$disconnect();
  }
}

async function run(prisma: PrismaClient, dryRun: boolean): Promise<SeedChallengesV1Result> {
  const log = (m: string) => console.log(m);
  log(`\n=== DESAFÍOS V1 SEED${dryRun ? ' (dry-run)' : ''} ===`);

  // --- 1. Bundles de recompensa canónicos (XP_BONUS únicamente) ---
  const bundleIdByKey = new Map<string, string>();
  for (const spec of CHALLENGE_V1_REWARD_BUNDLES) {
    const existing = await prisma.rewardBundle.findUnique({ where: { bundleKey: spec.bundleKey }, include: { items: true } });
    if (existing) {
      const xpItems = existing.items.filter((i) => i.componentType === 'XP_BONUS');
      const forbidden = existing.items.filter((i) => i.componentType !== 'XP_BONUS');
      if (forbidden.length > 0) {
        throw new ImmutableContradictionError(
          `reward_bundle "${spec.bundleKey}" contiene componentes no permitidos en V1 (${forbidden.map((i) => i.componentType).join(', ')}).`,
        );
      }
      if (xpItems.length !== 1 || xpItems[0]!.xpAmount !== spec.xpAmount) {
        throw new ImmutableContradictionError(
          `reward_bundle "${spec.bundleKey}" no coincide: esperado 1 XP_BONUS de ${spec.xpAmount}, encontrado ${xpItems.map((i) => i.xpAmount).join(', ') || 'ninguno'}.`,
        );
      }
      bundleIdByKey.set(spec.bundleKey, existing.id);
      continue;
    }
    if (dryRun) {
      log(`  [dry-run] crearía reward_bundle "${spec.bundleKey}" (XP_BONUS ${spec.xpAmount})`);
      bundleIdByKey.set(spec.bundleKey, '(dry-run)');
      continue;
    }
    const created = await prisma.rewardBundle.create({
      data: {
        bundleKey: spec.bundleKey,
        name: spec.name,
        items: { create: [{ componentType: 'XP_BONUS', xpAmount: spec.xpAmount }] },
      },
    });
    bundleIdByKey.set(spec.bundleKey, created.id);
    log(`  + reward_bundle "${spec.bundleKey}" (XP_BONUS ${spec.xpAmount})`);
  }
  log(`  reward bundles OK: ${bundleIdByKey.size}/${CHALLENGE_V1_REWARD_BUNDLES.length}`);

  // --- 2. Definiciones deterministas ---
  const generated = generateChallengeV1Definitions();
  const dailyCount = generated.filter((d) => d.challengeType === 'DAILY').length;
  const weeklyCount = generated.filter((d) => d.challengeType === 'WEEKLY').length;
  log(`  generadas: ${generated.length} (DAILY ${dailyCount} + WEEKLY ${weeklyCount})`);

  // Validación de reglas (defensa en profundidad -- deben parsear con la misma gramática que el worker).
  for (const d of generated) {
    parseEligibilityRule(d.eligibilityRule);
    if (parseCompletionRule(d.completionRule).targetValue !== d.targetValue) {
      throw new Error(`generador inconsistente: ${d.challengeKey} completion_rule vs targetValue`);
    }
  }

  const existingRows = await prisma.challengeDefinition.findMany({ where: { challengeKey: { startsWith: 'v1-' } } });
  const existingByKey = new Map(existingRows.map((r) => [r.challengeKey, r]));

  let matched = 0;
  const toCreate: GeneratedChallengeV1Definition[] = [];
  for (const d of generated) {
    const row = existingByKey.get(d.challengeKey);
    if (!row) {
      toCreate.push(d);
      continue;
    }
    const expectedBundleId = bundleIdByKey.get(d.rewardBundleKey)!;
    const mismatches: string[] = [];
    if (row.challengeType !== d.challengeType) mismatches.push(`challengeType ${row.challengeType} != ${d.challengeType}`);
    if (row.eligibilityRule !== d.eligibilityRule) mismatches.push('eligibilityRule');
    if (row.completionRule !== d.completionRule) mismatches.push('completionRule');
    if (row.startsAt.getTime() !== d.startsAt.getTime()) mismatches.push(`startsAt ${row.startsAt.toISOString()} != ${d.startsAt.toISOString()}`);
    if (row.endsAt.getTime() !== d.endsAt.getTime()) mismatches.push(`endsAt ${row.endsAt.toISOString()} != ${d.endsAt.toISOString()}`);
    if (row.dailyCap !== d.dailyCap) mismatches.push(`dailyCap ${row.dailyCap} != ${d.dailyCap}`);
    if (!dryRun && row.rewardBundleId !== expectedBundleId) mismatches.push('rewardBundleId');
    if (mismatches.length > 0) {
      throw new ImmutableContradictionError(
        `challenge_definition "${d.challengeKey}" ya existe y CONTRADICE la configuración V1 inmutable: ${mismatches.join('; ')}. No se muta.`,
      );
    }
    matched++;
  }

  if (dryRun) {
    log(`  [dry-run] crearía ${toCreate.length} challenge_definition, ${matched} coinciden exactas`);
  } else if (toCreate.length > 0) {
    // Lotes -- createMany es una sola sentencia; sin `skipDuplicates` porque ya filtramos.
    const BATCH = 500;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const slice = toCreate.slice(i, i + BATCH);
      await prisma.challengeDefinition.createMany({
        data: slice.map((d) => ({
          challengeKey: d.challengeKey,
          name: d.name,
          description: d.description,
          challengeType: d.challengeType,
          eligibilityRule: d.eligibilityRule,
          completionRule: d.completionRule,
          rewardBundleId: bundleIdByKey.get(d.rewardBundleKey)!,
          startsAt: d.startsAt,
          endsAt: d.endsAt,
          dailyCap: d.dailyCap,
        })),
      });
    }
    log(`  + ${toCreate.length} challenge_definition creadas, ${matched} coincidían exactas`);
  } else {
    log(`  challenge_definition sin cambios: ${matched} ya presentes y exactas (idempotente)`);
  }

  return {
    rewardBundlesEnsured: bundleIdByKey.size,
    definitionsExpected: generated.length,
    definitionsCreated: dryRun ? 0 : toCreate.length,
    definitionsMatched: matched,
    dailyCount,
    weeklyCount,
  };
}

// CLI
if (require.main === module) {
  seedChallengesV1({ dryRun: process.argv.slice(2).includes('--dry-run') })
    .then((r) => {
      console.log('\n=== RESUMEN ===');
      console.log(JSON.stringify(r, null, 2));
      console.log('=== DESAFÍOS V1 SEED COMPLETO ===');
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
