/**
 * LP-V1-HOTFIX -- retiro NO DESTRUCTIVO de las 2 reglas de League Points que
 * el catálogo histórico de `competitive-v1-config.ts` declaraba
 * incorrectamente para actividades de ESTUDIO (`RESPUESTA_VALIDADA`,
 * `TEMA_COMPLETADO`). LP es moneda EXCLUSIVAMENTE competitiva -- ver
 * `LEAGUE_POINT_RULES_V1_STUDY_RETIRED` para el detalle de la auditoría de
 * origen que probó que ambos `activityType` se emiten EXCLUSIVAMENTE desde
 * `ProgressService` (dominio Estudio), nunca desde ninguna vía de Competir.
 *
 * Este script NO elimina ninguna fila `league_point_rule` ni ningún
 * `league_point_ledger_entry` ya otorgado -- fija `effectiveUntil` (campo ya
 * existente, mismo mecanismo de ventana temporal que
 * `LeaguePointRuleRepository.findApplicableRule` ya usa para TODAS las
 * reglas) a un cutoff T explícito. Toda actividad con `occurredAt < T` sigue
 * viendo la regla histórica como vigente (el LP ya otorgado ANTES de T
 * permanece intacto y auditable); toda actividad con `occurredAt >= T` deja
 * de encontrar una regla aplicable para estos 2 `activityType` -- 0 LP,
 * para siempre, sin necesidad de una segunda condición de filtro en el
 * código de otorgamiento.
 *
 * Corrección retroactiva (revertir LP YA otorgado) queda EXPLÍCITAMENTE
 * fuera de este script -- ver el informe de LP-V1-HOTFIX, sección de diseño
 * de remediación. Este script SOLO previene otorgamientos futuros.
 *
 * Escritura EXCLUSIVA: `league_point_rule.effective_until` de las 2 filas
 * retiradas (si existen y coinciden con los valores canónicos históricos).
 * NUNCA escribe `league_point_ledger_entry`, `season_league_participation`,
 * `league_group`, `game_season`, ninguna tabla de XP, ni ninguna tabla de
 * Challenge/Cosmetics/Study/Exam.
 *
 * Uso:
 *   pnpm --filter @axioma/backend competitive:hotfix-study-lp-boundary-v1 -- --effective-at=2026-10-01T00:00:00.000Z
 *   pnpm --filter @axioma/backend competitive:hotfix-study-lp-boundary-v1 -- --dry-run --effective-at=2026-10-01T00:00:00.000Z
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { LEAGUE_POINT_RULES_V1_STUDY_RETIRED } from '../src/gamification/competitive-v1-config';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Mismo criterio EXACTO de fail-closed que `seed-xp-v1.ts`'s `parseAndValidateExplicitUtcCutover` -- nunca un default a `new Date()`. */
export function parseAndValidateExplicitEffectiveAt(raw: string | undefined): Date {
  if (!raw) {
    throw new Error(
      'Falta --effective-at=<instante UTC ISO 8601, ej. 2026-10-01T00:00:00.000Z>. ' +
        'No existe un valor por defecto -- el cutoff de la remediación LP debe ser explícito.',
    );
  }
  if (!ISO_UTC_PATTERN.test(raw)) {
    throw new Error(
      `--effective-at="${raw}" no es un instante UTC ISO 8601 explícito (se exige el sufijo "Z"). Ejemplo válido: 2026-10-01T00:00:00.000Z`,
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--effective-at="${raw}" no es una fecha válida.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): { dryRun: boolean; effectiveAt: Date } {
  const dryRun = argv.includes('--dry-run');
  const effectiveAtArg = argv.find((a) => a.startsWith('--effective-at='));
  const effectiveAt = parseAndValidateExplicitEffectiveAt(effectiveAtArg?.split('=').slice(1).join('='));
  return { dryRun, effectiveAt };
}

export interface HotfixResult {
  retired: number;
  reused: number;
  conflicts: number;
  alreadyAbsent: number;
}

export async function hotfixStudyLpBoundary({ dryRun, effectiveAt }: { dryRun: boolean; effectiveAt: Date }): Promise<HotfixResult> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  console.log(`=== LP-V1-HOTFIX -- retiro de reglas LP de Estudio ${dryRun ? '(DRY RUN, no escribe)' : ''} ===`);
  console.log(`  cutoff T = ${effectiveAt.toISOString()}\n`);

  let retired = 0;
  let reused = 0;
  let conflicts = 0;
  let alreadyAbsent = 0;

  try {
    for (const canonical of LEAGUE_POINT_RULES_V1_STUDY_RETIRED) {
      const activeRules = await prisma.leaguePointRule.findMany({
        where: { activityType: canonical.activityType, status: 'ACTIVE' },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (activeRules.length === 0) {
        alreadyAbsent++;
        console.log(`  AUSENTE  ${canonical.activityType.padEnd(24)} -- ninguna regla ACTIVE existe ya (nada que retirar)`);
        continue;
      }

      // La regla vigente (sin effectiveUntil, o effectiveUntil > ahora) es la
      // única candidata a retiro -- una ya retirada con effectiveUntil <= ahora
      // no es relevante para esta corrida.
      const now = new Date();
      const candidate = activeRules.find((r) => r.effectiveUntil === null || r.effectiveUntil > now);

      if (!candidate) {
        alreadyAbsent++;
        console.log(`  AUSENTE  ${canonical.activityType.padEnd(24)} -- ya retirada previamente, nada pendiente`);
        continue;
      }

      if (candidate.effectiveUntil !== null) {
        // Ya tiene un effectiveUntil futuro fijado por una corrida anterior.
        if (candidate.effectiveUntil.getTime() === effectiveAt.getTime()) {
          reused++;
          console.log(`  REUSA  ${canonical.activityType.padEnd(24)} -- ya retirada con el MISMO T (${candidate.id})`);
          continue;
        }
        conflicts++;
        console.error(
          `  CONFLICTO  ${canonical.activityType}: ya tiene effectiveUntil=${candidate.effectiveUntil.toISOString()} ` +
            `(regla ${candidate.id}), distinto del T solicitado (${effectiveAt.toISOString()}). No se sobrescribe en silencio.`,
        );
        continue;
      }

      if (candidate.basePoints !== canonical.basePoints || candidate.ruleVersion !== canonical.ruleVersion) {
        conflicts++;
        console.error(
          `  CONFLICTO  ${canonical.activityType}: la regla vigente (${candidate.id}) tiene basePoints=${candidate.basePoints}, ` +
            `ruleVersion=${candidate.ruleVersion} -- no coincide con los valores canónicos históricos esperados ` +
            `(basePoints=${canonical.basePoints}, ruleVersion=${canonical.ruleVersion}). Resuélvelo manualmente antes de re-ejecutar.`,
        );
        continue;
      }

      if (dryRun) {
        retired++;
        console.log(`  RETIRARÍA  ${canonical.activityType.padEnd(24)} -- regla ${candidate.id} (effectiveUntil -> ${effectiveAt.toISOString()})`);
        continue;
      }

      await prisma.leaguePointRule.update({
        where: { id: candidate.id },
        data: { effectiveUntil: effectiveAt },
      });
      retired++;
      console.log(`  RETIRA  ${canonical.activityType.padEnd(24)} -- regla ${candidate.id} (effectiveUntil = ${effectiveAt.toISOString()})`);
    }

    console.log(`\n  Retiradas: ${retired}. Reutilizadas (ya retiradas, mismo T): ${reused}. Ausentes: ${alreadyAbsent}. Conflictos: ${conflicts}.`);

    if (conflicts > 0) {
      console.error('\n=== LP-V1-HOTFIX -- remediación INCOMPLETA por conflicto(s) ===');
      process.exitCode = 1;
    } else {
      console.log(dryRun ? '\n=== LP-V1-HOTFIX -- DRY RUN OK ===' : '\n=== LP-V1-HOTFIX -- OK ===');
    }

    return { retired, reused, conflicts, alreadyAbsent };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const { dryRun, effectiveAt } = parseArgs(process.argv.slice(2));
  hotfixStudyLpBoundary({ dryRun, effectiveAt }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
