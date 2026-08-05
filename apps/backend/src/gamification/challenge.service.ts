import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AccountChallengeRepository, type AccountChallengeWithDefinition } from './account-challenge.repository';
import { ChallengeDefinitionRepository } from './challenge-definition.repository';
import { RewardBundleRepository } from './reward-bundle.repository';
import { RewardEvaluationWorker } from './reward-evaluation.worker';
import type { AccountChallenge, ChallengeDefinition } from '../generated/prisma/client';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountChallengeRepo: AccountChallengeRepository,
    private readonly challengeDefinitionRepo: ChallengeDefinitionRepository,
    private readonly rewardBundleRepo: RewardBundleRepository,
    private readonly rewardEvaluationWorker: RewardEvaluationWorker,
  ) {}

  listForAccount(accountId: string): Promise<AccountChallengeWithDefinition[]> {
    return this.accountChallengeRepo.findByAccountIdWithDefinition(accountId);
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
