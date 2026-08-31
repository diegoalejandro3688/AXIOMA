/**
 * COMPETITIVE V1 -- seed REPRODUCIBLE e IDEMPOTENTE de la configuración
 * productiva de League Points. Correr N veces produce el MISMO estado: sin
 * reglas duplicadas, sin reglas equivalentes solapadas.
 *
 * Configura EXACTAMENTE (decisión Product/TPM, ver `competitive-v1-config.ts`):
 *   RESPUESTA_VALIDADA      basePoints = 1   dailyCap = null
 *   QUICK_QUESTION_ANSWERED basePoints = 2   dailyCap = null
 *   TEMA_COMPLETADO         basePoints = 5   dailyCap = null
 *
 * Reutiliza EXCLUSIVAMENTE `LeaguePointRuleRepository` + el modelo
 * `LeaguePointRule` ya existentes. NO toca `rankingMetric`, NO crea entidades
 * nuevas, NO añade endpoints/schedulers. NO provisiona temporada (eso es
 * `competitive:ensure-first-season`, script aparte).
 *
 * Uso:
 *   pnpm --filter @axioma/backend competitive:seed-v1
 *   pnpm --filter @axioma/backend competitive:seed-v1 -- --dry-run
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { LEAGUE_POINT_RULES_V1, LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM } from '../src/gamification/competitive-v1-config';

async function seedCompetitiveV1({ dryRun }: { dryRun: boolean }): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  console.log(`=== COMPETITIVE V1 -- reglas de League Points ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

  let created = 0;
  let reused = 0;
  let conflicts = 0;

  for (const rule of LEAGUE_POINT_RULES_V1) {
    // Reglas ACTIVE vigentes para este activityType (misma ventana que
    // `LeaguePointRuleRepository.findApplicableRule` evalúa en runtime).
    const activeForType = await prisma.leaguePointRule.findMany({
      where: {
        activityType: rule.activityType,
        status: 'ACTIVE',
        AND: [{ effectiveUntil: null }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const exactMatch = activeForType.find(
      (r) =>
        r.basePoints === rule.basePoints &&
        r.dailyCap === rule.dailyCap &&
        r.ruleVersion === rule.ruleVersion &&
        r.effectiveFrom.getTime() === LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM.getTime(),
    );

    if (exactMatch) {
      reused++;
      console.log(`  REUSA  ${rule.activityType.padEnd(24)} +${rule.basePoints} LP (sin cap) -- regla ${exactMatch.id} ya vigente`);
      continue;
    }

    // Hay una regla ACTIVE distinta para este tipo: NO se crea una segunda
    // (dejaría `findApplicableRule` ambiguo). El operador debe resolverlo.
    const divergent = activeForType.filter((r) => r.basePoints !== rule.basePoints || r.dailyCap !== rule.dailyCap);
    if (divergent.length > 0) {
      conflicts++;
      console.error(
        `  CONFLICTO  ${rule.activityType}: ya existe(n) ${divergent.length} regla(s) ACTIVE con distinta configuración ` +
          `(${divergent.map((r) => `${r.id}=+${r.basePoints}/cap:${r.dailyCap}`).join(', ')}). ` +
          `Retíralas manualmente (status=RETIRED o effectiveUntil) antes de re-ejecutar este seed.`,
      );
      continue;
    }

    if (dryRun) {
      console.log(`  CREARÍA  ${rule.activityType.padEnd(24)} +${rule.basePoints} LP (sin cap), ruleVersion=${rule.ruleVersion}`);
      created++;
      continue;
    }

    const row = await prisma.leaguePointRule.create({
      data: {
        activityType: rule.activityType,
        basePoints: rule.basePoints,
        dailyCap: rule.dailyCap,
        effectiveFrom: LEAGUE_POINT_RULE_V1_EFFECTIVE_FROM,
        effectiveUntil: null,
        ruleVersion: rule.ruleVersion,
      },
    });
    created++;
    console.log(`  CREA   ${rule.activityType.padEnd(24)} +${rule.basePoints} LP (sin cap) -- regla ${row.id}`);
  }

  console.log(`\n  Total: ${created} creada(s), ${reused} reutilizada(s), ${conflicts} conflicto(s).`);
  await prisma.$disconnect();

  if (conflicts > 0) {
    console.error('\n=== COMPETITIVE V1 -- seed INCOMPLETO por conflicto(s) de configuración ===');
    process.exit(1);
  }
  console.log('\n=== COMPETITIVE V1 -- reglas de League Points OK ===');
}

if (require.main === module) {
  seedCompetitiveV1({ dryRun: process.argv.slice(2).includes('--dry-run') }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
