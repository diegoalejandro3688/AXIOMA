import { Injectable, Logger } from '@nestjs/common';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { LeagueEnrollmentService } from './league-enrollment.service';

export interface RolloverResult {
  readonly previousSeasonId: string;
  readonly candidates: number;
  readonly rolled: number;
  readonly alreadyPresent: number;
  readonly notEligible: number;
  readonly failed: number;
}

/** Página de cuentas por lote -- acotado, seguro si una temporada tiene muchas cuentas. */
const ROLLOVER_BATCH_SIZE = 200;

/**
 * PF2-B -- auto-rollover: lleva a las cuentas que participaron en la temporada
 * INMEDIATAMENTE ANTERIOR (con resultado TERMINAL PROMOTED/DEMOTED/RETAINED) a
 * la temporada canónica sucesora, ya ACTIVE.
 *
 * NO duplica NADA: para cada cuenta invoca la ruta canónica
 * `LeagueEnrollmentService.joinActiveSeason(accountId, now, { sourcePreviousSeasonId })`,
 * que resuelve el tier de destino EXCLUSIVAMENTE desde la participación
 * TERMINAL de `previousSeasonId` (PF2-C.3A -- ya NO desde "historial más
 * reciente" por `joinedAt`, que podía quedar ensombrecido por residuo de gate
 * `lpg-season-*`), materializa el grupo perezosamente, crea la participación
 * idempotentemente (`@@unique(accountId, gameSeasonId)`) con `leaguePoints = 0`,
 * y entrega el marco del tier SUPERADO / el terminal de Gran Maestro por el
 * mismo camino `reward:LEAGUE:{accountId}:{leagueId}`. Ascendente se detecta
 * solo por la nueva fila en Diamante+.
 *
 * Idempotente y multi-instancia: correr N veces / desde 2 backends converge a
 * UNA participación por cuenta y CERO marcos duplicados (la unicidad de
 * participación + la idempotencia de recompensa ya existentes hacen el
 * trabajo). Carrera con un `joinActiveSeason` manual del propio usuario ->
 * exactamente una participación (misma `createIdempotent` bajo el mismo
 * advisory lock 21).
 *
 * SÓLO la población de la temporada anterior. NUNCA escanea todas las cuentas
 * del sistema. Una cuenta que no participó la semana pasada NO se
 * auto-inscribe -- su `joinActiveSeason` manual sigue disponible cuando vuelva.
 */
@Injectable()
export class SeasonRolloverService {
  private readonly logger = new Logger(SeasonRolloverService.name);

  constructor(
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly enrollmentService: LeagueEnrollmentService,
  ) {}

  /**
   * @param previousSeasonId  la temporada inmediatamente anterior, YA FINALIZED
   *   y con todos sus grupos/participaciones finalizados (garantizado por
   *   `SeasonOrchestrationService`, que no activa la sucesora hasta entonces).
   */
  async rollover(previousSeasonId: string, now: Date = new Date()): Promise<RolloverResult> {
    let candidates = 0;
    let rolled = 0;
    let alreadyPresent = 0;
    let notEligible = 0;
    let failed = 0;

    let afterAccountId: string | undefined;
    for (;;) {
      const accountIds = await this.participationRepo.findTerminalAccountIdsForSeason(previousSeasonId, {
        take: ROLLOVER_BATCH_SIZE,
        afterAccountId,
      });
      if (accountIds.length === 0) break;

      for (const accountId of accountIds) {
        candidates++;
        try {
          const outcome = await this.enrollmentService.joinActiveSeason(accountId, now, {
            sourcePreviousSeasonId: previousSeasonId,
          });
          if ('outcome' in outcome) {
            if (outcome.outcome === 'NO_TERMINAL_SOURCE_IN_PREVIOUS_SEASON') {
              // PF2-C.3A -- deriva concurrente: la cuenta fue candidata pero ya
              // no tiene resultado terminal en `previousSeasonId`. NUNCA se cae
              // a historial global ni se adivina un tier (§11): se cuenta como
              // fallida y el próximo ciclo la reintenta desde el estado real.
              failed++;
              this.logger.error(
                `Rollover: cuenta ${accountId} sin participación TERMINAL en la temporada predecesora ${previousSeasonId} -- omitida (sin fallback a historial global).`,
              );
            } else {
              // NO_ACTIVE_SEASON -- la sucesora no está ACTIVE. No debería pasar
              // (el orquestador sólo llama tras activarla), pero es un no-op seguro.
              notEligible++;
            }
          } else if (outcome.created) {
            rolled++;
          } else {
            alreadyPresent++;
          }
        } catch (error) {
          failed++;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(`Rollover falló para una cuenta de la temporada ${previousSeasonId}: ${message}`);
        }
      }

      afterAccountId = accountIds[accountIds.length - 1];
      if (accountIds.length < ROLLOVER_BATCH_SIZE) break;
    }

    if (rolled > 0 || failed > 0) {
      this.logger.log(
        `rollover(${previousSeasonId}): ${candidates} candidata(s), ${rolled} inscrita(s), ${alreadyPresent} ya presente(s), ${notEligible} no elegible(s), ${failed} fallida(s)`,
      );
    }

    return { previousSeasonId, candidates, rolled, alreadyPresent, notEligible, failed };
  }
}
