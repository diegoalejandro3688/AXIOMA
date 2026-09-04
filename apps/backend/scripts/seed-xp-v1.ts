/**
 * XP ECONOMY V1 -- seed REPRODUCIBLE e IDEMPOTENTE de la configuración
 * productiva de XP normal. Correr N veces produce el MISMO estado: sin
 * programas/versiones/reglas duplicadas, sin divergencia silenciosa.
 *
 * Configura EXACTAMENTE (decisión Product/TPM, ver `xp-v1-config.ts`):
 *   RESPUESTA_VALIDADA      baseXp = 2    dailyCap = null
 *   QUICK_QUESTION_ANSWERED baseXp = 2    dailyCap = null
 *   RECURSO_COMPLETADO      baseXp = 20   dailyCap = null
 *   TEMA_COMPLETADO         baseXp = 20   dailyCap = null
 *   ENSAYO_COMPLETADO       baseXp = 100  dailyCap = null
 *
 * Reutiliza EXCLUSIVAMENTE `GamificationProgram`/`GamificationProgramVersion`/
 * `XpRule`, ya existentes. NO toca `validated_gamification_activity`,
 * `xp_grant_attempt`, `xp_ledger_entry`, `xp_balance`, `level_definition`,
 * `reward_bundle`, `challenge_definition`, ni ninguna tabla de Competir.
 *
 * CUTOVER OBLIGATORIO -- XP-V1A probó que la elegibilidad de una actividad
 * compara `activity.occurredAt` (nunca "ahora") contra `XpRule.effectiveFrom`
 * Y `GamificationProgramVersion.effectiveFrom`. Este script NUNCA usa
 * `new Date()` como cutover por defecto -- exige `--effective-from` (ISO 8601
 * UTC explícito) y falla cerrado si falta o es inválido. El mismo instante T
 * se escribe, byte-idéntico, en la versión Y en las 5 reglas.
 *
 * ATOMICIDAD -- la escritura real (programa nuevo si aplica + versión nueva
 * si aplica + las 5 reglas) ocurre DENTRO de una única transacción Prisma:
 * production nunca queda en un estado intermedio observable donde `xp-core`
 * exista/esté ACTIVE con solo un subconjunto de las 5 reglas canónicas
 * escrito. Un conflicto detectado en cualquier paso hace `throw` dentro de
 * la transacción -- todo lo creado en ESTA corrida se revierte; las filas ya
 * existentes de una corrida ANTERIOR exitosa nunca se tocan.
 *
 * Uso:
 *   pnpm --filter @axioma/backend xp:seed-v1 -- --effective-from=2026-10-01T00:00:00.000Z
 *   pnpm --filter @axioma/backend xp:seed-v1 -- --dry-run --effective-from=2026-10-01T00:00:00.000Z
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import {
  XP_V1_PROGRAM_KEY,
  XP_V1_PROGRAM_NAME,
  XP_V1_PROGRAM_TYPE,
  XP_V1_VERSION_LABEL,
  XP_V1_RULES,
} from '../src/gamification/xp-v1-config';

const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

class SeedConflictError extends Error {}

/**
 * Falla cerrado ante CUALQUIER ambigüedad -- nunca normaliza un valor sin
 * `Z` explícito (evita interpretar silenciosamente hora local como UTC).
 * Único punto de entrada del cutover T para todo el seed: la MISMA instancia
 * `Date` se reutiliza para la versión y las 5 reglas -- nunca se llama
 * `new Date()` una segunda vez.
 */
export function parseAndValidateExplicitUtcCutover(raw: string | undefined): Date {
  if (!raw) {
    throw new Error(
      'Falta --effective-from=<instante UTC ISO 8601, ej. 2026-10-01T00:00:00.000Z>. ' +
        'No existe un valor por defecto -- el cutover de XP V1 debe ser explícito (ver docs/XP-V1A).',
    );
  }
  if (!ISO_UTC_PATTERN.test(raw)) {
    throw new Error(
      `--effective-from="${raw}" no es un instante UTC ISO 8601 explícito (se exige el sufijo "Z", ` +
        'nunca un offset u hora local ambigua). Ejemplo válido: 2026-10-01T00:00:00.000Z',
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`--effective-from="${raw}" no es una fecha válida.`);
  }
  return parsed;
}

function parseArgs(argv: string[]): { dryRun: boolean; effectiveFrom: Date } {
  const dryRun = argv.includes('--dry-run');
  const effectiveFromArg = argv.find((a) => a.startsWith('--effective-from='));
  const effectiveFrom = parseAndValidateExplicitUtcCutover(effectiveFromArg?.split('=').slice(1).join('='));
  return { dryRun, effectiveFrom };
}

export interface SeedXpV1Result {
  programAction: 'REUSA' | 'CREA';
  versionAction: 'REUSA' | 'CREA';
  rulesCreated: number;
  rulesReused: number;
}

async function planDryRun(prisma: PrismaClient, effectiveFrom: Date): Promise<void> {
  const existingProgram = await prisma.gamificationProgram.findUnique({ where: { programKey: XP_V1_PROGRAM_KEY } });
  console.log(existingProgram ? `  REUSA  gamification_program "${XP_V1_PROGRAM_KEY}" -- ${existingProgram.id}` : `  CREARÍA  gamification_program "${XP_V1_PROGRAM_KEY}" (status=ACTIVE)`);

  const existingVersion = existingProgram
    ? await prisma.gamificationProgramVersion.findUnique({
        where: { gamificationProgramId_versionLabel: { gamificationProgramId: existingProgram.id, versionLabel: XP_V1_VERSION_LABEL } },
      })
    : null;
  console.log(
    existingVersion
      ? `  REUSA  gamification_program_version "${XP_V1_VERSION_LABEL}" -- ${existingVersion.id}`
      : `  CREARÍA  gamification_program_version "${XP_V1_VERSION_LABEL}" (APPROVED, effectiveFrom=${effectiveFrom.toISOString()})`,
  );

  for (const rule of XP_V1_RULES) {
    const existingRule =
      existingVersion &&
      (await prisma.xpRule.findUnique({
        where: { programVersionId_activityType: { programVersionId: existingVersion.id, activityType: rule.activityType } },
      }));
    console.log(
      existingRule
        ? `  REUSA  ${rule.activityType.padEnd(24)} +${rule.baseXp} XP -- regla ${existingRule.id} ya vigente`
        : `  CREARÍA  ${rule.activityType.padEnd(24)} +${rule.baseXp} XP (sin cap), effectiveFrom=${effectiveFrom.toISOString()}`,
    );
  }
  console.log('\n[dry-run] nada escrito.');
}

async function seedXpV1({ dryRun, effectiveFrom }: { dryRun: boolean; effectiveFrom: Date }): Promise<SeedXpV1Result | void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  console.log(`=== XP ECONOMY V1 ${dryRun ? '(DRY RUN, no escribe)' : ''} ===`);
  console.log(`  cutover T = ${effectiveFrom.toISOString()}\n`);

  try {
    if (dryRun) {
      await planDryRun(prisma, effectiveFrom);
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // --- 1. GamificationProgram (xp-core) ---
      let program = await tx.gamificationProgram.findUnique({ where: { programKey: XP_V1_PROGRAM_KEY } });
      let programAction: 'REUSA' | 'CREA' = 'CREA';
      if (program) {
        if (program.status !== 'ACTIVE') {
          throw new SeedConflictError(
            `gamification_program "${XP_V1_PROGRAM_KEY}" existe con status=${program.status} (se esperaba ACTIVE). Resuélvelo manualmente antes de re-ejecutar.`,
          );
        }
        programAction = 'REUSA';
      } else {
        program = await tx.gamificationProgram.create({
          data: { programKey: XP_V1_PROGRAM_KEY, name: XP_V1_PROGRAM_NAME, programType: XP_V1_PROGRAM_TYPE, status: 'ACTIVE' },
        });
      }

      // --- 2. GamificationProgramVersion (v1) ---
      let version = await tx.gamificationProgramVersion.findUnique({
        where: { gamificationProgramId_versionLabel: { gamificationProgramId: program.id, versionLabel: XP_V1_VERSION_LABEL } },
      });
      let versionAction: 'REUSA' | 'CREA' = 'CREA';
      if (version) {
        const matches = version.approvalStatus === 'APPROVED' && version.effectiveFrom?.getTime() === effectiveFrom.getTime() && version.effectiveUntil === null;
        if (!matches) {
          throw new SeedConflictError(
            `gamification_program_version "${XP_V1_VERSION_LABEL}" ya existe (${version.id}) con approvalStatus=${version.approvalStatus}, ` +
              `effectiveFrom=${version.effectiveFrom?.toISOString() ?? 'null'} -- no coincide con el cutover T solicitado (${effectiveFrom.toISOString()}).`,
          );
        }
        versionAction = 'REUSA';
      } else {
        version = await tx.gamificationProgramVersion.create({
          data: {
            gamificationProgramId: program.id,
            versionLabel: XP_V1_VERSION_LABEL,
            approvalStatus: 'APPROVED',
            effectiveFrom,
            effectiveUntil: null,
            approvedAt: new Date(),
          },
        });
      }

      // --- 3. Las 5 XpRule normales ---
      let rulesCreated = 0;
      let rulesReused = 0;
      for (const rule of XP_V1_RULES) {
        const existingRule = await tx.xpRule.findUnique({
          where: { programVersionId_activityType: { programVersionId: version.id, activityType: rule.activityType } },
        });
        if (existingRule) {
          const matches =
            existingRule.status === 'ACTIVE' &&
            existingRule.baseXp === rule.baseXp &&
            existingRule.dailyCap === null &&
            existingRule.effectiveFrom?.getTime() === effectiveFrom.getTime() &&
            existingRule.effectiveUntil === null;
          if (!matches) {
            throw new SeedConflictError(
              `${rule.activityType}: ya existe (${existingRule.id}) con baseXp=${existingRule.baseXp}, dailyCap=${existingRule.dailyCap}, ` +
                `effectiveFrom=${existingRule.effectiveFrom?.toISOString() ?? 'null'}, status=${existingRule.status} -- no coincide con la configuración canónica.`,
            );
          }
          rulesReused++;
          console.log(`  REUSA  ${rule.activityType.padEnd(24)} +${rule.baseXp} XP -- regla ${existingRule.id} ya vigente`);
          continue;
        }
        const row = await tx.xpRule.create({
          data: {
            programVersionId: version.id,
            activityType: rule.activityType,
            baseXp: rule.baseXp,
            dailyCap: null,
            effectiveFrom,
            effectiveUntil: null,
            status: 'ACTIVE',
          },
        });
        rulesCreated++;
        console.log(`  CREA  ${rule.activityType.padEnd(24)} +${rule.baseXp} XP -- regla ${row.id}`);
      }

      console.log(`\n  Programa: ${programAction} (${program.id}). Versión: ${versionAction} (${version.id}).`);
      return { programAction, versionAction, rulesCreated, rulesReused };
    });

    console.log(`  Reglas: ${result.rulesCreated} creada(s), ${result.rulesReused} reutilizada(s), 0 conflicto(s).`);
    console.log('\n=== XP ECONOMY V1 -- OK ===');
    return result;
  } catch (error) {
    if (error instanceof SeedConflictError) {
      console.error(`\n  CONFLICTO  ${error.message}`);
      console.error('\n=== XP ECONOMY V1 -- seed INCOMPLETO por conflicto(s) de configuración ===');
      process.exitCode = 1;
      return;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const { dryRun, effectiveFrom } = parseArgs(process.argv.slice(2));
  seedXpV1({ dryRun, effectiveFrom }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

export { seedXpV1 };
