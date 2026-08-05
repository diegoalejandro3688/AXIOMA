import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AccountChallengeDailyProgress } from '../generated/prisma/client';

/**
 * Único punto de acceso a `account_challenge_daily_progress` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.12 (Incremento 4, sub-incremento 4.a).
 * `localDate` es la fecha LOCAL de cuenta (`UserProfile.timezone`,
 * ADR-0008), no UTC -- resolverla es responsabilidad del llamador, no de
 * este repositorio.
 *
 * `upsertContribution` es un primitivo de PERSISTENCIA puro: incrementa
 * `contributionCount` en 1 para (accountChallengeId, localDate) vía
 * `UPSERT` atómico -- no decide si la contribución es elegible, no verifica
 * el tope diario configurado en `challenge_definition`, y no propaga nada a
 * `AccountChallenge.progressValue`. Esas decisiones son evaluación/
 * progresión (§4.12, pasos 3-7) y quedan para el worker de un
 * sub-incremento posterior, que compondrá este primitivo con esa lógica
 * dentro de su propia transacción `SERIALIZABLE`.
 */
@Injectable()
export class AccountChallengeDailyProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertContribution(accountChallengeId: string, localDate: Date): Promise<AccountChallengeDailyProgress> {
    return this.prisma.accountChallengeDailyProgress.upsert({
      where: { accountChallengeId_localDate: { accountChallengeId, localDate } },
      create: { accountChallengeId, localDate, contributionCount: 1 },
      update: { contributionCount: { increment: 1 } },
    });
  }

  findByAccountChallengeAndDate(accountChallengeId: string, localDate: Date): Promise<AccountChallengeDailyProgress | null> {
    return this.prisma.accountChallengeDailyProgress.findUnique({
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
