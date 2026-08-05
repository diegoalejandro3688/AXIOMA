import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueDefinitionRepository } from './league-definition.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import type { SeasonLeagueParticipation } from '../generated/prisma/client';

/**
 * Namespace de advisory lock DISTINTO a los de ADR-0019 (`19`) y Bloque III
 * 4.c (`20`) -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §9.3. Serializa por
 * (temporada, tier): protege la capacidad de `league_group` bajo
 * concurrencia real (precisión obligatoria del Product Owner) -- dos
 * inscripciones concurrentes al mismo tier de la misma temporada nunca leen
 * "1 cupo libre" y lo ocupan ambas. Bloqueante (`pg_advisory_xact_lock`),
 * mismo criterio que `ChallengeService.claim` -- una segunda solicitud
 * simplemente espera, no se rechaza.
 */
const LEAGUE_ENROLLMENT_LOCK_NAMESPACE = 21;

/** Única política de asignación inicial conocida en este incremento -- ver §9.2. */
const ASSIGNMENT_POLICY_VERSION = 'v1-lowest-tier';

export type EnrollmentOutcome = { participation: SeasonLeagueParticipation; created: boolean } | { outcome: 'NO_ACTIVE_SEASON' };

/**
 * Bloque IV, Incremento 1 ("Fundación de temporadas y ligas") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9. Resuelve "buscar grupo abierto con
 * cupo, o crear uno nuevo, e inscribir la participación" como una única
 * transacción protegida por el advisory lock de arriba -- ninguna otra
 * escritura de este flujo ocurre fuera de esa transacción.
 */
@Injectable()
export class LeagueEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonRepo: GameSeasonRepository,
    private readonly leagueDefinitionRepo: LeagueDefinitionRepository,
    private readonly leagueGroupRepo: LeagueGroupRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
  ) {}

  /**
   * Idempotente: una cuenta ya inscrita en la temporada activa recibe su
   * misma participación, sin crear una segunda ni lanzar error, incluso
   * bajo una carrera real de dos solicitudes concurrentes (Gate de
   * inscripción idempotente, §9.9).
   */
  async joinActiveSeason(accountId: string): Promise<EnrollmentOutcome> {
    const season = await this.seasonRepo.findActive();
    if (!season) return { outcome: 'NO_ACTIVE_SEASON' };

    // Idempotencia rápida sin lock: si ya existe, no hace falta serializar nada.
    const existing = await this.participationRepo.findByAccountAndSeason(accountId, season.id);
    if (existing) return { participation: existing, created: false };

    const targetLeagueDefinition = await this.resolveTargetTier(accountId);
    if (!targetLeagueDefinition) return { outcome: 'NO_ACTIVE_SEASON' };

    return this.prisma.$transaction(
      async (tx) => {
        // $executeRaw, no $queryRaw: pg_advisory_xact_lock devuelve `void`.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LEAGUE_ENROLLMENT_LOCK_NAMESPACE}, hashtext(${season.id + ':' + targetLeagueDefinition.id}))`;

        // Re-chequeo de idempotencia YA bajo el lock -- la consulta de
        // arriba (sin lock) es solo una optimización para el camino feliz.
        const alreadyJoined = await this.participationRepo.findByAccountAndSeason(accountId, season.id, tx);
        if (alreadyJoined) return { participation: alreadyJoined, created: false };

        let group = await this.leagueGroupRepo.findOpenGroup(tx, season.id, targetLeagueDefinition.id);
        if (!group) {
          const groupNumber = await this.leagueGroupRepo.nextGroupNumber(tx, season.id, targetLeagueDefinition.id);
          group = await this.leagueGroupRepo.create(tx, {
            gameSeasonId: season.id,
            leagueDefinitionId: targetLeagueDefinition.id,
            groupNumber,
            capacity: targetLeagueDefinition.participantGroupSize,
            assignmentPolicyVersion: ASSIGNMENT_POLICY_VERSION,
          });
        }

        const { participation, created } = await this.participationRepo.createIdempotent(tx, {
          gameSeasonId: season.id,
          accountId,
          leagueDefinitionId: targetLeagueDefinition.id,
          leagueGroupId: group.id,
          joinedAt: new Date(),
        });

        if (created) {
          const count = await this.leagueGroupRepo.countParticipants(tx, group.id);
          if (count >= group.capacity) {
            await this.leagueGroupRepo.markFull(tx, group.id);
          }
        }

        return { participation, created };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /**
   * §9.2 -- estudiante nuevo: tier más bajo, sin excepción. Estudiante
   * recurrente: el tier de su última participación (el ascenso/descenso real
   * es responsabilidad de Incremento 2, no de este método).
   */
  private async resolveTargetTier(accountId: string) {
    const mostRecent = await this.participationRepo.findMostRecentByAccountId(accountId);
    if (mostRecent) {
      const previousTier = await this.leagueDefinitionRepo.findById(mostRecent.leagueDefinitionId);
      if (previousTier && previousTier.status === 'ACTIVE') return previousTier;
    }
    return this.leagueDefinitionRepo.findLowestActiveTier();
  }
}
