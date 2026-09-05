import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { GameSeasonRepository } from './game-season.repository';
import { LeagueDefinitionRepository } from './league-definition.repository';
import { LeagueGroupRepository } from './league-group.repository';
import { SeasonLeagueParticipationRepository } from './season-league-participation.repository';
import { RewardBundleRepository } from './reward-bundle.repository';
import { RewardEvaluationWorker } from './reward-evaluation.worker';
import type { LeagueDefinition, SeasonLeagueParticipation } from '../generated/prisma/client';

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

/** Vista sin IDs internos de una participación ya resuelta -- ver `describeParticipation`. */
export type EnrolledParticipationView = {
  leagueName: string;
  /** COMPETITIVE V1 -- `tierOrder` del tier actual (1..7). Dato de producto, nunca un id interno. */
  leagueTier: number;
  /**
   * COMPETITIVE V1 (parche final de QA) -- saldo VIVO de puntos de liga
   * (`season_league_participation.league_points`), el balance denormalizado
   * y autoritativo que `LeaguePointGrantService` incrementa ~cada minuto.
   * Se expone aquí para que la tarjeta de Liga muestre LP al instante, sin
   * esperar al recálculo del leaderboard (:00/:15/:30/:45). La POSICIÓN
   * sigue viniendo del leaderboard (`competitive-profile`), nunca de aquí.
   */
  leaguePoints: number;
  joinedAt: Date;
  participationStatus: SeasonLeagueParticipation['participationStatus'];
  /** COMPETITIVE V1 -- ventana de la temporada (solo fechas, nunca el id de `game_season`). */
  season: { startsAt: Date; endsAt: Date };
};

export type ParticipationStatusOutcome =
  | ({ kind: 'ENROLLED' } & EnrolledParticipationView)
  | { kind: 'NOT_ENROLLED' }
  | { kind: 'NO_ACTIVE_SEASON' };

/**
 * Bloque IV, Incremento 1 ("Fundación de temporadas y ligas") -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §9. Resuelve "buscar grupo abierto con
 * cupo, o crear uno nuevo, e inscribir la participación" como una única
 * transacción protegida por el advisory lock de arriba -- ninguna otra
 * escritura de este flujo ocurre fuera de esa transacción.
 */
@Injectable()
export class LeagueEnrollmentService {
  private readonly logger = new Logger(LeagueEnrollmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonRepo: GameSeasonRepository,
    private readonly leagueDefinitionRepo: LeagueDefinitionRepository,
    private readonly leagueGroupRepo: LeagueGroupRepository,
    private readonly participationRepo: SeasonLeagueParticipationRepository,
    private readonly rewardBundleRepo: RewardBundleRepository,
    private readonly rewardEvaluationWorker: RewardEvaluationWorker,
  ) {}

  /**
   * Idempotente: una cuenta ya inscrita en la temporada activa recibe su
   * misma participación, sin crear una segunda ni lanzar error, incluso
   * bajo una carrera real de dos solicitudes concurrentes (Gate de
   * inscripción idempotente, §9.9).
   */
  async joinActiveSeason(accountId: string, now: Date = new Date()): Promise<EnrollmentOutcome> {
    // STABILIZATION-B7 -- temporada CANÓNICA vigente (status ACTIVE Y `now`
    // dentro de la ventana), la misma que resuelve el Ranking. Una temporada
    // ACTIVE fuera de ventana (contaminación, o un tick de scheduler de
    // retraso) nunca es "la temporada a la que inscribirse".
    // PF2-B -- `now` es inyectable para que `SeasonOrchestrationService` corra
    // todo un ciclo (provisión -> cierre -> finalización -> activación ->
    // rollover) sobre UN instante coherente; el default cubre el camino real
    // del controller.
    const season = await this.seasonRepo.findCurrent(now);
    if (!season) return { outcome: 'NO_ACTIVE_SEASON' };

    // Idempotencia rápida sin lock: si ya existe, no hace falta serializar nada.
    const existing = await this.participationRepo.findByAccountAndSeason(accountId, season.id);
    if (existing) return { participation: existing, created: false };

    const resolvedTier = await this.resolveTargetTier(accountId);
    if (!resolvedTier) return { outcome: 'NO_ACTIVE_SEASON' };
    const { target: targetLeagueDefinition, surpassedTier, isTerminalReach } = resolvedTier;

    const result = await this.prisma.$transaction(
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

    // STABILIZATION-B -- marcos de liga son PRESTIGIO: se otorgan por haber
    // SUPERADO un tier, nunca por el mero hecho de jugar en él (empezar en
    // Bronce NO otorga el marco Bronce). El único tier "PROMOTED" desde el
    // que se resolvió `targetLeagueDefinition` es el que se acaba de
    // superar -- ESE es el marco que corresponde entregar aquí, nunca el del
    // tier al que se está ingresando. Excepción terminal: Gran Maestro no
    // tiene un tier superior al que "ascender" para superarlo, así que su
    // propio marco se entrega al alcanzarlo por primera vez (detectado por
    // `surpassedTier` estar vacío exclusivamente por ser el tier más alto,
    // ver `resolveTargetTier`). Fuera de la transacción y "best-effort": un
    // fallo de entrega NUNCA revierte la inscripción -- el grant queda
    // `reward:LEAGUE:{leagueDefinitionId}` y se reintenta en la próxima
    // inscripción/promoción a esa misma liga (idempotente por diseño).
    if (result.created) {
      if (surpassedTier) {
        await this.deliverLeagueFrameReward(accountId, surpassedTier);
      }
      if (isTerminalReach) {
        await this.deliverLeagueFrameReward(accountId, targetLeagueDefinition);
      }
    }
    return result;
  }

  /**
   * §4/§9 -- entrega idempotente del marco de la liga `league` a `accountId`
   * usando EXACTAMENTE el mecanismo genérico existente
   * (`RewardEvaluationWorker.deliverBundleComponents`), fuente `LEAGUE`,
   * `sourceEntityId = league.id`. `idempotencyKey = reward:LEAGUE:{league.id}`
   * -> volver a inscribirse en la misma liga en otra temporada NO duplica la
   * propiedad. Sin bundle configurado -> nada que entregar.
   */
  private async deliverLeagueFrameReward(accountId: string, league: LeagueDefinition): Promise<void> {
    if (!league.rewardBundleId) return;
    try {
      const bundle = await this.rewardBundleRepo.findById(league.rewardBundleId);
      if (!bundle) {
        this.logger.error(`Liga "${league.leagueKey}" referencia un reward_bundle_id inexistente (${league.rewardBundleId}).`);
        return;
      }
      // STABILIZATION-B (bug real encontrado durante la implementación de
      // avatares históricos) -- `deliverBundleComponents` construye
      // `idempotencyKey = reward:{sourceEntityType}:{sourceEntityId}`, SIN
      // `accountId`. `league.id` por sí solo es el MISMO para TODAS las
      // cuentas que superan ese tier -- sin el prefijo de cuenta, la
      // primera cuenta en superar un tier "reserva" esa idempotencyKey
      // globalmente, y `RewardGrantRepository.createIdempotent` devuelve
      // ESA fila existente (de otra cuenta) para cualquier cuenta
      // siguiente, que entonces nunca recibe su propio `inventory_item`
      // (mismo criterio ya usado por LEVEL: `sourceEntityId = accountId:levelNumber`).
      const { allResolved } = await this.rewardEvaluationWorker.deliverBundleComponents(accountId, bundle, 'LEAGUE', `${accountId}:${league.id}`);
      if (!allResolved) {
        this.logger.warn(`Marco de liga "${league.leagueKey}" quedó PENDING para la cuenta ${accountId} -- se reintentará en la próxima inscripción a esa liga.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Fallo entregando el marco de liga "${league.leagueKey}" a la cuenta ${accountId}: ${message}`);
    }
  }

  /**
   * §3 (decisión Product/TPM) -- estudiante nuevo (sin ninguna participación
   * previa): tier más bajo (Bronce), sin excepción. Estudiante recurrente: se
   * parte del tier de su ÚLTIMA participación y se aplica su resultado:
   *   PROMOTED -> tier ACTIVE inmediatamente superior (Gran Maestro: se queda)
   *   DEMOTED  -> tier ACTIVE inmediatamente inferior (Bronce: se queda)
   *   cualquier otro estado (RETAINED / SEASON_ENDED / ACTIVE) -> mismo tier
   * Sin subdivisiones, sin saltos. `LeaderboardFinalizationService` es quien
   * decide PROMOTED/DEMOTED/RETAINED al cerrar el grupo (Incremento 2, ADR-0020).
   */
  /**
   * STABILIZATION-B -- además del tier de destino, resuelve qué marco de
   * liga (si alguno) corresponde entregar en ESTA inscripción:
   * `surpassedTier` = el tier que se acaba de SUPERAR (solo en una
   * transición PROMOTED real, nunca en el ingreso inicial a Bronce ni en
   * RETAINED/DEMOTED); `isTerminalReach` = true solo cuando el destino es el
   * tier más alto ACTIVO (sin `findAdjacentActiveTier(..., 'up')` posible) --
   * cubre la regla terminal de Gran Maestro (se entrega su propio marco al
   * alcanzarlo, dado que no existe un tier superior que "superar").
   */
  private async resolveTargetTier(
    accountId: string,
  ): Promise<{ target: LeagueDefinition; surpassedTier: LeagueDefinition | null; isTerminalReach: boolean } | null> {
    const mostRecent = await this.participationRepo.findMostRecentByAccountId(accountId);
    let target: LeagueDefinition | null = null;
    let surpassedTier: LeagueDefinition | null = null;

    if (mostRecent) {
      const fromTier = await this.leagueDefinitionRepo.findById(mostRecent.leagueDefinitionId);
      if (fromTier && fromTier.status === 'ACTIVE') {
        if (mostRecent.participationStatus === 'PROMOTED') {
          const above = await this.leagueDefinitionRepo.findAdjacentActiveTier(fromTier.tierOrder, 'up');
          target = above ?? fromTier;
          // Solo cuenta como "superado" si REALMENTE hubo un tier superior al
          // que ascender -- si `fromTier` ya era el más alto, no hay marco
          // nuevo que superar por esta vía (cubierto por `isTerminalReach`).
          if (above) surpassedTier = fromTier;
        } else if (mostRecent.participationStatus === 'DEMOTED') {
          target = (await this.leagueDefinitionRepo.findAdjacentActiveTier(fromTier.tierOrder, 'down')) ?? fromTier;
        } else {
          target = fromTier;
        }
      }
    }
    if (!target) target = await this.leagueDefinitionRepo.findLowestActiveTier();
    if (!target) return null;

    const aboveTarget = await this.leagueDefinitionRepo.findAdjacentActiveTier(target.tierOrder, 'up');
    const isTerminalReach = aboveTarget == null;
    return { target, surpassedTier, isTerminalReach };
  }

  /**
   * Bloque IV, Incremento 5, sub-incremento 5.a -- lectura PURA, nunca crea
   * nada (§13, precisión obligatoria del Product Owner: "GET nunca crea
   * participación"). Sin advisory lock -- ninguna escritura posible en este
   * camino. Reutiliza exactamente las mismas dos consultas que el camino
   * rápido (sin lock) de `joinActiveSeason`, nunca una tercera fuente de
   * verdad.
   */
  async getParticipationStatus(accountId: string): Promise<ParticipationStatusOutcome> {
    // STABILIZATION-B7 -- misma temporada canónica vigente que `joinActiveSeason`
    // y que el Ranking (`CompetitiveContextService`/`CompetitiveLeaderboardService`).
    const season = await this.seasonRepo.findCurrent(new Date());
    if (!season) return { kind: 'NO_ACTIVE_SEASON' };

    const participation = await this.participationRepo.findByAccountAndSeason(accountId, season.id);
    if (!participation) return { kind: 'NOT_ENROLLED' };

    return { kind: 'ENROLLED', ...(await this.describeParticipation(participation)) };
  }

  /**
   * Resuelve `leagueName` a partir de `leagueDefinitionId` -- único lugar
   * donde `joinActiveSeason`/`getParticipationStatus` convergen para
   * construir la vista pública. `leagueDefinitionId`/
   * `seasonLeagueParticipationId`/`gameSeasonId`/`leagueGroupId` NUNCA
   * salen de este método hacia el llamador (controller) -- mismo criterio
   * que `competitiveContextSchema` (ADR-0021 §2/§3).
   */
  async describeParticipation(participation: SeasonLeagueParticipation): Promise<EnrolledParticipationView> {
    const [league, season] = await Promise.all([
      this.leagueDefinitionRepo.findById(participation.leagueDefinitionId),
      this.seasonRepo.findById(participation.gameSeasonId),
    ]);
    if (!league) throw new Error(`Participación ${participation.id} referencia un leagueDefinitionId inexistente.`);
    if (!season) throw new Error(`Participación ${participation.id} referencia un gameSeasonId inexistente.`);
    return {
      leagueName: league.name,
      leagueTier: league.tierOrder,
      leaguePoints: participation.leaguePoints,
      joinedAt: participation.joinedAt,
      participationStatus: participation.participationStatus,
      season: { startsAt: season.startsAt, endsAt: season.endsAt },
    };
  }
}
