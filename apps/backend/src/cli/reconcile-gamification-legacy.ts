import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { GamificationLegacyReconciliationService } from '../gamification/gamification-legacy-reconciliation.service';

/**
 * WEB-0D.1C-B5 -- herramienta interna de operaciones, INVOCACIÓN MANUAL
 * EXCLUSIVA (mismo criterio que `recover-account.ts`) -- NUNCA conectada a
 * ningún scheduler/startup/endpoint HTTP. Clasifica y, solo si se pide
 * explícitamente, repara el subconjunto DETERMINISTIC_REWRITE de anomalías
 * legado dejadas por B3/B4 (ver el reporte de B5 §D/§F/§13).
 *
 * `--dry-run` es el comportamiento POR DEFECTO -- clasifica y cuenta, CERO
 * mutaciones. `--apply` requiere pasarse explícitamente para mutar. Nunca
 * hay un tercer modo ni una bandera que habilite `--apply` implícitamente.
 *
 * Uso:
 *   node dist/cli/reconcile-gamification-legacy.js --dry-run
 *   node dist/cli/reconcile-gamification-legacy.js --apply [--limit N]
 *
 * Nunca imprime accountId crudo, actorRef, ni claves completas -- solo IDs
 * de fila, modelo, tipo de negocio y conteos (ver el reporte de B5 §14/§18).
 */
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  if (apply && args.includes('--dry-run')) {
    console.error('No se puede combinar --apply con --dry-run en la misma invocación.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const service = app.get(GamificationLegacyReconciliationService);
    const result = await service.reconcile({ apply, limit });

    console.log(`Modo: ${result.applied ? 'APPLY' : 'DRY-RUN'}`);
    console.log(`Resumen de auditoría: ${JSON.stringify(result.report.summary, null, 2)}`);
    console.log(`  RewardGrant/ValidatedActivity deterministas: ${result.report.deterministic.length}`);
    console.log(`  Duplicados/colisiones (DUPLICATE_EQUIVALENT, preservados): ${result.report.duplicates.length}`);
    console.log(`  Malformados (MALFORMED_LEGACY, preservados): ${result.report.malformed.length}`);
    console.log(`  Violaciones de invariante de identidad (preservadas): ${result.report.identityViolations.length}`);
    console.log(`  Línea base de participaciones terminales (TERMINAL_PARTICIPATION_BASELINE): ${result.report.terminalParticipationBaseline.length}`);

    if (result.applied) {
      if (result.secretMissing) {
        console.error('GAMIFICATION_ACTOR_SECRET ausente -- cero mutaciones, candidatos siguen descubribles.');
        process.exitCode = 1;
        return;
      }
      console.log(`Cuentas reparadas por completo: ${result.accountsFullyRepaired}`);
      console.log(`Cuentas PARCIALES (PARTIAL_RECONCILIATION_REQUIRED -- fila(s) ambigua(s) preservada(s) para la MISMA cuenta): ${result.accountsPartial}`);
      console.log(`RewardGrant reparados: ${result.rewardGrantRepaired}`);
      console.log(`ValidatedGamificationActivity reparados: ${result.validatedActivityRepaired}`);
      console.log(`SeasonLeagueParticipation reparados: ${result.seasonParticipationRepaired}`);
    } else {
      console.log('Ninguna mutación realizada (dry-run). Vuelva a ejecutar con --apply para reconciliar el subconjunto determinista.');
    }
  } catch (error) {
    console.error('No se pudo completar la reconciliación:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
