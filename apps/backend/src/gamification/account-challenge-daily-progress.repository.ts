import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AccountChallengeDailyProgress } from '../generated/prisma/client';

/**
 * Único punto de acceso a `account_challenge_daily_progress` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.12/§4.16 (Incremento 4). `localDate`
 * es el día calendario UTC (§4.16(a) -- corrección: NO es zona horaria de
 * cuenta como decía la redacción original de §4.12) -- resolverlo es
 * responsabilidad del llamador (`utcDayKey`), no de este repositorio.
 *
 * `upsertContribution` es un primitivo de PERSISTENCIA: incrementa
 * `contributionCount` en 1 para (accountChallengeId, localDate) vía
 * `UPSERT` atómico -- no decide si la contribución es elegible ni verifica
 * el tope diario configurado en `challenge_definition`. Esas decisiones son
 * evaluación/progresión y viven en el worker de evaluación (Bloque III, 4.b).
 *
 * `tx` es OBLIGATORIO en `upsertContribution` (§4.16(d), corrección sobre
 * 4.a): debe ser el MISMO `Prisma.TransactionClient` con el que el llamador
 * ya leyó esta misma fila para comparar contra `daily_cap` y con el que
 * inserta la deduplicación de evento -- de lo contrario el `SELECT` y el
 * `UPSERT` podrían correr en conexiones distintas, reabriendo la condición
 * de carrera que `SERIALIZABLE` existe para prevenir (mismo razonamiento
 * que `xp-grant.service.ts`). Los métodos de lectura aceptan `tx` opcional
 * por la misma razón cuando se usan dentro de esa transacción.
 */
@Injectable()
export class AccountChallengeDailyProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertContribution(tx: Prisma.TransactionClient, accountChallengeId: string, localDate: Date): Promise<AccountChallengeDailyProgress> {
    return tx.accountChallengeDailyProgress.upsert({
      where: { accountChallengeId_localDate: { accountChallengeId, localDate } },
      create: { accountChallengeId, localDate, contributionCount: 1 },
      update: { contributionCount: { increment: 1 } },
    });
  }

  findByAccountChallengeAndDate(
    accountChallengeId: string,
    localDate: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AccountChallengeDailyProgress | null> {
    return (tx ?? this.prisma).accountChallengeDailyProgress.findUnique({
      where: { accountChallengeId_localDate: { accountChallengeId, localDate } },
    });
  }

  findByAccountChallengeId(accountChallengeId: string): Promise<AccountChallengeDailyProgress[]> {
    return this.prisma.accountChallengeDailyProgress.findMany({
      where: { accountChallengeId },
      orderBy: { localDate: 'asc' },
    });
  }
}
