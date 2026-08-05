import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';

/**
 * Transición de temporadas -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.6.
 * Solo conoce SCHEDULED->ACTIVE y ACTIVE->FINALIZED; PROMOTED/DEMOTED/
 * RETAINED (cálculo de ascenso/descenso) es responsabilidad de Incremento 2
 * (ranking), no de este servicio.
 */
@Injectable()
export class SeasonTransitionService {
  private readonly logger = new Logger(SeasonTransitionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonRepo: GameSeasonRepository,
    private readonly groupRepo: LeagueGroupRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
  ) {}

  /**
   * Cierra toda temporada ACTIVE cuyo `endsAt` ya pasó -- en una sola
   * transacción por temporada (§9.6): bloquea sus grupos, termina sus
   * participaciones. Ninguna fila de `league_point_ledger_entry` se toca
   * (§9.8) -- el trigger `enforce_league_point_ledger_entry_window` impide
   * además que cualquier otorgamiento concurrente confirme después de este
   * cierre (§9.5).
   */
  async closeExpiredSeasons(): Promise<{ closed: number }> {
    const now = new Date();
    const expired = await this.seasonRepo.findActiveExpired(now);

    let closed = 0;
    for (const season of expired) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await this.seasonRepo.finalize(tx, season.id, now);
          await this.groupRepo.lockAllForSeason(tx, season.id, now);
          await this.participationRepo.endAllForSeason(tx, season.id, now);
        });
        closed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo cerrar la temporada ${season.id}: ${message}`);
      }
    }
    return { closed };
  }

  /**
   * Activa toda temporada SCHEDULED cuyo `startsAt` ya llegó -- salvo que ya
   * exista otra temporada ACTIVE (el índice único parcial lo impediría de
   * todos modos; aquí se evita incluso el intento, dejando un aviso). Un
   * solapamiento de calendario entre temporadas es un error de
   * configuración operativa, no un caso que este incremento deba resolver
   * automáticamente.
   */
  async activateScheduledSeasons(): Promise<{ activated: number; skippedOverlap: number }> {
    const now = new Date();
    const ready = await this.seasonRepo.findScheduledReadyToActivate(now);

    let activated = 0;
    let skippedOverlap = 0;
    for (const season of ready) {
      const currentlyActive = await this.seasonRepo.findActive();
      if (currentlyActive) {
        skippedOverlap++;
        this.logger.warn(`Temporada ${season.id} lista para activarse, pero ${currentlyActive.id} sigue ACTIVE -- omitida.`);
        continue;
      }
      await this.prisma.$transaction(async (tx) => {
        await this.seasonRepo.activate(tx, season.id);
      });
      activated++;
    }
    return { activated, skippedOverlap };
  }
}
