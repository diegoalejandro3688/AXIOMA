import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AccountChallengeRepository, type AccountChallengeWithDefinition } from './account-challenge.repository';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { RewardBundleRepository } from './reward-bundle.repository';
import { RewardEvaluationWorker } from './reward-evaluation.worker';
import { parseCompletionRule, parseEligibilityRule } from './challenge-rule';
import { Prisma } from '../generated/prisma/client';
import type { AccountChallenge, ChallengeDefinition } from '../generated/prisma/client';

/** Un `account_challenge` ya resuelto para el listado, con la vista previa de recompensa (§20). */
export type ChallengeListItem = AccountChallengeWithDefinition & { rewardXpBonus: number | null };

/**
 * Namespace de advisory lock DISTINTO al de ADR-0019 (`19`, por cuenta) --
 * este serializa por `account_challenge.id`, un recurso más angosto.
 * Corrección encontrada al gatear 4.c: `deliverXpBonusComponent`/
 * `deliverTitleComponent` (worker, 1.c/3.a) asumen serialización externa
 * (el advisory lock POR CUENTA de `processAccount`, ADR-0019 §1) -- nunca
 * se diseñaron para tolerar dos llamadas verdaderamente concurrentes sobre
 * el MISMO componente. El endpoint HTTP de claim no tiene ese lock: dos
 * solicitudes de claim simultáneas para el mismo `account_challenge`
 * pueden ambas ver un componente `PENDING`, y la segunda en confirmar
 * `markDelivered` choca contra el trigger de inmutabilidad
 * (`reward_grant_component` ya `DELIVERED`), propagando un 500 en vez de
 * resolverse de forma idempotente. Se serializa aquí, en el punto de
 * entrada de 4.c, sin modificar el mecanismo de entrega ya cerrado.
 */
const CHALLENGE_CLAIM_LOCK_NAMESPACE = 20;

/**
 * Bloque III, Incremento 4, sub-incremento 4.c ("Reclamación explícita") --
 * ver docs/adr/BLOCK-III-DEFINITION.md §4.17. Orquesta el flujo de claim
 * (7 pasos fijos de §4.17); `AccountChallengeRepository.claim` es la única
 * escritura de `CLAIMED`, siempre DESPUÉS de confirmar la entrega.
 *
 * `accountId` se usa ÚNICAMENTE para verificar pertenencia -- mismo
 * criterio que `TitleEquipmentService.equipTitle`: un `accountChallengeId`
 * ajeno o inexistente produce el MISMO 404, nunca filtra existencia vía el
 * código de error (Gate 37).
 */
@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountChallengeRepo: AccountChallengeRepository,
    private readonly challengeDefinitionRepo: ChallengeDefinitionRepository,
    private readonly rewardBundleRepo: RewardBundleRepository,
    private readonly rewardEvaluationWorker: RewardEvaluationWorker,
  ) {}

  /**
   * §4.14/§15 -- completa el segundo disparador de la materialización
   * perezosa que quedó sin implementar: "el estudiante abre la sección de
   * desafíos". Antes de listar, asegura idempotentemente un
   * `account_challenge` para CADA `challenge_definition` ACTIVA cuya
   * ventana contiene `now` y cuya `eligibility_rule` es `ALL_ACCOUNTS`.
   *
   * NO introduce un botón de aceptar, ni un endpoint nuevo, ni un modelo de
   * asignación nuevo -- reutiliza EXACTAMENTE `createIdempotent` (§4.16(d))
   * y la misma gramática de reglas que el worker (`challenge-rule.ts`).
   *
   * Aislamiento (§16): una definición con `completion_rule`/`eligibility_rule`
   * malformada (deriva de fixtures antiguos en la BD) se registra y se
   * SALTA -- nunca rompe el listado ni la materialización de las válidas.
   * Una carrera entre dos GET concurrentes se resuelve por el `UNIQUE`
   * (§4.14): el perdedor captura `P2002` y continúa.
   */
  async materialiseActiveForAccount(accountId: string, now: Date = new Date()): Promise<void> {
    const definitions = await this.challengeDefinitionRepo.findActiveContainingInstant(now);
    for (const definition of definitions) {
      let targetValue: number;
      try {
        parseEligibilityRule(definition.eligibilityRule);
        targetValue = parseCompletionRule(definition.completionRule).targetValue;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`challenge_definition "${definition.challengeKey}" tiene reglas inválidas, se omite en la materialización: ${message}`);
        continue;
      }

      try {
        await this.prisma.$transaction((tx) =>
          this.accountChallengeRepo.createIdempotent(tx, {
            accountId,
            challengeDefinitionId: definition.id,
            targetValue,
            periodStart: definition.startsAt,
            periodEnd: definition.endsAt,
            acceptedAt: new Date(),
          }),
        );
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`No se pudo materializar el desafío "${definition.challengeKey}" para la cuenta ${accountId}: ${message}`);
      }
    }
  }

  /**
   * §17 -- semántica de visibilidad aprobada. Período actual (`periodEnd >
   * now`): los cuatro estados visibles. Período pasado: solo `COMPLETED`
   * sin reclamar (sigue siendo reclamable más tarde) -- `ACCEPTED`/
   * `IN_PROGRESS`/`CLAIMED` de períodos cerrados se ocultan. Filtrado de
   * LECTURA únicamente: nunca borra filas ni muta `challengeStatus` para
   * cambiar la visibilidad.
   */
  async listForAccount(accountId: string, now: Date = new Date()): Promise<ChallengeListItem[]> {
    await this.materialiseActiveForAccount(accountId, now);
    const rows = await this.accountChallengeRepo.findByAccountIdWithDefinition(accountId);

    const visible = rows.filter((row) => {
      const currentPeriod = row.periodEnd.getTime() > now.getTime();
      if (currentPeriod) return true;
      return row.challengeStatus === 'COMPLETED';
    });

    const rewardByBundleId = new Map<string, number | null>();
    for (const row of visible) {
      const bundleId = row.challengeDefinition.rewardBundleId;
      if (bundleId && !rewardByBundleId.has(bundleId)) {
        rewardByBundleId.set(bundleId, await this.resolveRewardXpBonus(bundleId));
      }
    }

    return visible.map((row) => ({
      ...row,
      rewardXpBonus: row.challengeDefinition.rewardBundleId ? (rewardByBundleId.get(row.challengeDefinition.rewardBundleId) ?? null) : null,
    }));
  }

  /**
   * §20 -- vista previa de recompensa: suma de los montos `XP_BONUS` del
   * bundle. `null` si el bundle no existe o no entrega XP. Derivada del
   * bundle/componentes existentes -- no expone la implementación interna.
   */
  async resolveRewardXpBonus(rewardBundleId: string): Promise<number | null> {
    const bundle = await this.rewardBundleRepo.findById(rewardBundleId);
    if (!bundle) return null;
    const xp = bundle.items
      .filter((item) => item.componentType === 'XP_BONUS' && item.xpAmount != null)
      .reduce((sum, item) => sum + (item.xpAmount ?? 0), 0);
    return xp > 0 ? xp : null;
  }

  /**
   * `pg_advisory_xact_lock` BLOQUEANTE (no `_try_`): una segunda solicitud
   * concurrente simplemente ESPERA a que la primera termine y libere el
   * lock al confirmar su transacción -- no se rechaza ni se salta, mejor
   * UX que "vuelve a intentar" para una acción síncrona iniciada por el
   * estudiante. Al desbloquear, la segunda solicitud ejecuta el mismo
   * método completo y encuentra el estado ya `CLAIMED` (idempotencia real,
   * Gate 39) o continúa normalmente si la primera falló.
   */
  async claim(accountId: string, accountChallengeId: string): Promise<{ accountChallenge: AccountChallenge; definition: ChallengeDefinition }> {
    return this.prisma.$transaction(
      async (tx) => {
        // $executeRaw, no $queryRaw: pg_advisory_xact_lock devuelve `void` --
        // Prisma no puede deserializar esa columna en una fila de resultado.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHALLENGE_CLAIM_LOCK_NAMESPACE}, hashtext(${accountChallengeId}))`;
        return this.claimLocked(accountId, accountChallengeId);
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  private async claimLocked(
    accountId: string,
    accountChallengeId: string,
  ): Promise<{ accountChallenge: AccountChallenge; definition: ChallengeDefinition }> {
    const accountChallenge = await this.accountChallengeRepo.findById(accountChallengeId);
    if (!accountChallenge || accountChallenge.accountId !== accountId) {
      throw new NotFoundException('Este desafío no existe o no pertenece a tu cuenta.');
    }

    const definition = await this.challengeDefinitionRepo.findById(accountChallenge.challengeDefinitionId);
    if (!definition) {
      throw new NotFoundException('La definición de este desafío ya no existe.');
    }

    // Idempotencia real ante doble solicitud (Gate 38/39) -- ya reclamado, nada que reintentar.
    if (accountChallenge.challengeStatus === 'CLAIMED') {
      return { accountChallenge, definition };
    }
    if (accountChallenge.challengeStatus !== 'COMPLETED') {
      throw new ConflictException('Este desafío todavía no está completado.');
    }

    // Sin bundle configurado -- nada que entregar, transición directa (§4.17 paso 3).
    if (definition.rewardBundleId == null) {
      const claimed = await this.accountChallengeRepo.claim(accountChallengeId);
      return { accountChallenge: claimed, definition };
    }

    const bundle = await this.rewardBundleRepo.findById(definition.rewardBundleId);
    if (!bundle) {
      throw new ServiceUnavailableException('La recompensa configurada para este desafío no está disponible. Intenta de nuevo más tarde.');
    }

    // §4.4/Gate 40: sourceEntityType = CHALLENGE_CLAIM, sourceEntityId = account_challenge.id.
    // Mismo mecanismo genérico de entrega que nivel/logros (ADR-0019 §5/§6) -- sin camino paralelo.
    const { allResolved } = await this.rewardEvaluationWorker.deliverBundleComponents(accountId, bundle, 'CHALLENGE_CLAIM', accountChallengeId);
    if (!allResolved) {
      // Gate 41: conserva COMPLETED, nunca CLAIMED sin entrega confirmada -- reintentable con un nuevo POST.
      throw new ServiceUnavailableException('No se pudo completar la entrega de la recompensa. Intenta reclamar de nuevo.');
    }

    const claimed = await this.accountChallengeRepo.claim(accountChallengeId);
    return { accountChallenge: claimed, definition };
  }
}
