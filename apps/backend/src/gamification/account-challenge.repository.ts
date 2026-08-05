import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AccountChallenge, ChallengeDefinition } from '../generated/prisma/client';

export type AccountChallengeWithDefinition = AccountChallenge & { challengeDefinition: ChallengeDefinition };

/**
 * Único punto de acceso a `account_challenge` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.14/§4.16 (Incremento 4).
 * Idempotente por `UNIQUE(accountId, challengeDefinitionId, periodStart)`
 * (§4.14).
 *
 * `createIdempotent` materializa la fila con `acceptedAt = now()`
 * (asignación automática, §4.14), nunca por acción explícita del
 * estudiante. `tx` es OBLIGATORIO (§4.16(d)): el worker de 4.b materializa
 * dentro de la MISMA transacción que procesa el evento que la disparó, para
 * que un fallo posterior en ese mismo paso revierta también la
 * materialización (nunca queda una fila huérfana de un intento fallido).
 *
 * Verifica existencia ANTES de crear (`findUnique` -> `create`), en vez del
 * patrón "crear y recuperarse de P2002" de `AccountTitleRepository` --
 * corrección encontrada al implementar 4.b: ese patrón asume que un error
 * de restricción única puede recuperarse consultando de nuevo sobre la
 * MISMA conexión, lo cual es cierto para una llamada aislada (autocommit),
 * pero NO dentro de una transacción explícita compartida (§4.16(d)) -- en
 * Postgres, un error dentro de una transacción la deja abortada
 * (`25P02`) y ninguna sentencia posterior sobre ese mismo `tx`, ni
 * siquiera un `SELECT`, se ejecuta hasta el `ROLLBACK`. El lock consultivo
 * por cuenta (ADR-0019 §1) ya serializa todo acceso concurrente a las filas
 * de una misma cuenta dentro de este worker, así que verificar-antes-de-crear
 * no reabre una ventana de carrera real en este flujo.
 *
 * `advanceProgress` (4.b) permite EXCLUSIVAMENTE `ACCEPTED -> IN_PROGRESS`
 * y `IN_PROGRESS -> COMPLETED`. `claim` (4.c, §4.17) permite EXCLUSIVAMENTE
 * `COMPLETED -> CLAIMED` -- lo invoca únicamente `ChallengeService.claim`,
 * y solo DESPUÉS de confirmar que la entrega de recompensa se resolvió por
 * completo (nunca antes). El trigger de Gate 17 (4.a) es la segunda
 * barrera en ambos casos: rechaza cualquier otra transición aunque estos
 * métodos intentaran producirla. Deliberadamente SIN `update()` genérico
 * más allá de estos dos métodos.
 */
@Injectable()
export class AccountChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createIdempotent(
    tx: Prisma.TransactionClient,
    input: {
      accountId: string;
      challengeDefinitionId: string;
      targetValue: number;
      periodStart: Date;
      periodEnd: Date;
      acceptedAt: Date;
    },
  ): Promise<{ accountChallenge: AccountChallenge; created: boolean }> {
    const where = {
      accountId_challengeDefinitionId_periodStart: {
        accountId: input.accountId,
        challengeDefinitionId: input.challengeDefinitionId,
        periodStart: input.periodStart,
      },
    };
    const existing = await tx.accountChallenge.findUnique({ where });
    if (existing) return { accountChallenge: existing, created: false };

    const accountChallenge = await tx.accountChallenge.create({ data: input });
    return { accountChallenge, created: true };
  }

  /**
   * `newProgressValue` ya viene acotado por el llamador (nunca excede
   * `targetValue` -- el CHECK de 4.a lo rechazaría igualmente). Cuando
   * `newProgressValue >= targetValue` y el estado actual es `IN_PROGRESS`,
   * el llamador debe pasar `transitionTo: 'COMPLETED'`; para la primera
   * contribución sobre una fila `ACCEPTED`, `transitionTo: 'IN_PROGRESS'`.
   * Sin cambio de estado, pasar `transitionTo: null` (el trigger de Gate 17
   * acepta actualizar otras columnas sin tocar `challenge_status`).
   */
  async advanceProgress(
    tx: Prisma.TransactionClient,
    id: string,
    newProgressValue: number,
    transitionTo: 'IN_PROGRESS' | 'COMPLETED' | null,
  ): Promise<AccountChallenge> {
    return tx.accountChallenge.update({
      where: { id },
      data: {
        progressValue: newProgressValue,
        ...(transitionTo === 'IN_PROGRESS' ? { challengeStatus: 'IN_PROGRESS' } : {}),
        ...(transitionTo === 'COMPLETED' ? { challengeStatus: 'COMPLETED', completedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Única transición hacia `CLAIMED` (§4.17) -- el llamador (`ChallengeService`)
   * ya verificó `challengeStatus == 'COMPLETED'` y que la entrega de
   * recompensa se resolvió por completo ANTES de invocar esto. Sin `tx`
   * explícito: se invoca DESPUÉS de que `deliverBundleComponents` ya
   * confirmó y committeó la entrega (mismo criterio de dos pasos separados
   * que el resto de este dominio -- completar y entregar nunca comparten
   * una única transacción todo-o-nada aquí, a diferencia de logros).
   */
  claim(id: string): Promise<AccountChallenge> {
    return this.prisma.accountChallenge.update({
      where: { id },
      data: { challengeStatus: 'CLAIMED', claimedAt: new Date() },
    });
  }

  findById(id: string): Promise<AccountChallenge | null> {
    return this.prisma.accountChallenge.findUnique({ where: { id } });
  }

  findByAccountAndChallenge(
    accountId: string,
    challengeDefinitionId: string,
    periodStart: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountChallenge | null> {
    return (tx ?? this.prisma).accountChallenge.findUnique({
      where: { accountId_challengeDefinitionId_periodStart: { accountId, challengeDefinitionId, periodStart } },
    });
  }

  findByAccountId(accountId: string): Promise<AccountChallenge[]> {
    return this.prisma.accountChallenge.findMany({ where: { accountId } });
  }

  /** §4.17 -- lista con `challenge_definition` ya unida, para el endpoint de listado. */
  findByAccountIdWithDefinition(accountId: string): Promise<AccountChallengeWithDefinition[]> {
    return this.prisma.accountChallenge.findMany({
      where: { accountId },
      include: { challengeDefinition: true },
      orderBy: { acceptedAt: 'desc' },
    });
  }
}
