import { Injectable, Logger } from '@nestjs/common';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { SeasonTransitionService } from './season-transition.service';
import { LeaderboardFinalizationService } from './leaderboard-finalization.service';
import { SeasonProvisioningService } from './season-provisioning.service';
import { SeasonRolloverService } from './season-rollover.service';
import { canonicalWindowContaining } from './season-calendar';

export interface OrchestrationCycleResult {
  readonly now: Date;
  readonly createdSeasonCount: number;
  readonly existingSeasonCount: number;
  readonly conflictCount: number;
  readonly closedSeasonCount: number;
  readonly finalizedGroupCount: number;
  readonly activationDeferred: boolean;
  readonly activatedSeasonCount: number;
  readonly rolledParticipantCount: number;
}

/**
 * PF2-B -- ciclo ÚNICO de orquestación de temporadas semanales, llamable
 * IGUAL desde `onApplicationBootstrap` (catch-up inmediato tras un reinicio
 * tardío) y desde el cron horario de seguridad. No duplica lógica de arranque
 * vs cron.
 *
 * Orden CONGELADO (§21), diseñado para que NINGÚN usuario aterrice en un tier
 * antes de que su ascenso/descenso esté resuelto:
 *
 *   1. provisionHorizon(now)            -- crea las temporadas SCHEDULED que falten
 *   2. closeExpiredSeasons()            -- ACTIVE vencida -> FINALIZED, grupos LOCKED, participaciones SEASON_ENDED
 *   3. finalizePendingGroups()          -- LOCKED -> FINALIZED, SEASON_ENDED -> PROMOTED/DEMOTED/RETAINED + instantánea inmutable
 *   4. GUARDA: si queda CUALQUIER grupo LOCKED o CUALQUIER participación
 *      SEASON_ENDED en el sistema -> NO se activa la sucesora este ciclo
 *      (se reintenta en el siguiente; correctness > estado temporal incorrecto)
 *   5. activateScheduledSeasons()       -- SCHEDULED lista + `startsAt <= now` + no hay otra ACTIVE -> ACTIVE
 *   6. rollover(predecesor)             -- SÓLO los participantes TERMINALES de la temporada inmediatamente anterior
 *
 * Como la sucesora sólo se activa DESPUÉS de que la predecesora está
 * completamente finalizada, un `joinActiveSeason` MANUAL del usuario en la
 * ventana de rollover ya resuelve su tier desde el resultado congelado -- la
 * carrera de "tier equivocado" no puede ocurrir (§4). Sin estado de contrato
 * ni de UI nuevo.
 *
 * Idempotente y multi-instancia: cada paso reutiliza sus propias garantías
 * (índice único de temporada activa, advisory lock de finalización ns 22,
 * unicidad de participación, idempotencia de recompensa). Un ciclo sano a
 * mitad de semana no hace nada.
 */
@Injectable()
export class SeasonOrchestrationService {
  private readonly logger = new Logger(SeasonOrchestrationService.name);

  constructor(
    private readonly seasonRepo: GameSeasonRepository,
    private readonly groupRepo: LeagueGroupRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly transitionService: SeasonTransitionService,
    private readonly finalizationService: LeaderboardFinalizationService,
    private readonly provisioningService: SeasonProvisioningService,
    private readonly rolloverService: SeasonRolloverService,
  ) {}

  async runCycle(now: Date = new Date()): Promise<OrchestrationCycleResult> {
    // 1. Provisión del horizonte canónico.
    const provision = await this.provisioningService.provisionHorizon(now);

    // 2. Cierre de temporadas vencidas.
    const { closed } = await this.transitionService.closeExpiredSeasons(now);

    // 3. Finalización de grupos LOCKED pendientes (resultado + instantánea).
    const { finalized } = await this.finalizationService.finalizePendingGroups();

    // 4. Guarda ACOTADA A LA PREDECESORA CONTIGUA de la temporada canónica
    //    actual: no se activa la sucesora hasta que la predecesora inmediata
    //    no tenga grupos LOCKED ni participaciones SEASON_ENDED. (No es una
    //    guarda global: un grupo LOCKED huérfano de otra temporada no debe
    //    bloquear indefinidamente la orquestación semanal.)
    const currentWindow = canonicalWindowContaining(now);
    const predecessor = await this.seasonRepo.findByExactEndsAt(currentWindow.startsAt);

    let activationDeferred = false;
    let activatedSeasonCount = 0;
    let rolledParticipantCount = 0;

    if (predecessor) {
      const [predLocked, predPending] = await Promise.all([
        this.groupRepo.countLockedForSeason(predecessor.id),
        this.participationRepo.countPendingOutcomeForSeason(predecessor.id),
      ]);
      activationDeferred = predLocked > 0 || predPending > 0;
      if (activationDeferred) {
        this.logger.warn(
          `Activación de sucesora DIFERIDA: la predecesora ${predecessor.seasonKey} tiene ${predLocked} grupo(s) LOCKED + ${predPending} participación(es) SEASON_ENDED sin resultado. Se reintenta el próximo ciclo.`,
        );
      }
    }

    if (!activationDeferred) {
      // 5. Activación de la sucesora lista.
      const { activated } = await this.transitionService.activateScheduledSeasons(now);
      activatedSeasonCount = activated;

      // 6. Rollover -- sólo si la temporada canónica actual está ACTIVE y su
      //    predecesora contigua está FINALIZED.
      const active = await this.seasonRepo.findByKey(currentWindow.seasonKey);
      if (active && active.status === 'ACTIVE' && predecessor && predecessor.status === 'FINALIZED') {
        const result = await this.rolloverService.rollover(predecessor.id, now);
        rolledParticipantCount = result.rolled;
      }
    }

    const result: OrchestrationCycleResult = {
      now,
      createdSeasonCount: provision.created.length,
      existingSeasonCount: provision.existing.length,
      conflictCount: provision.conflicts.length,
      closedSeasonCount: closed,
      finalizedGroupCount: finalized,
      activationDeferred,
      activatedSeasonCount,
      rolledParticipantCount,
    };

    if (
      result.createdSeasonCount > 0 ||
      result.closedSeasonCount > 0 ||
      result.finalizedGroupCount > 0 ||
      result.activatedSeasonCount > 0 ||
      result.rolledParticipantCount > 0 ||
      result.conflictCount > 0 ||
      result.activationDeferred
    ) {
      this.logger.log(
        `Ciclo de orquestación: +${result.createdSeasonCount} temporada(s), ${result.existingSeasonCount} ya presente(s), ` +
          `${result.closedSeasonCount} cerrada(s), ${result.finalizedGroupCount} grupo(s) finalizado(s), ` +
          `${result.activatedSeasonCount} activada(s)${result.activationDeferred ? ' (activación diferida)' : ''}, ` +
          `${result.rolledParticipantCount} participante(s) rolleado(s), ${result.conflictCount} conflicto(s)`,
      );
    }

    return result;
  }
}
