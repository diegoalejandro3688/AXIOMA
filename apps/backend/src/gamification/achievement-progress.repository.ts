import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { AchievementProgress } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Único punto de acceso a `achievement_progress` -- ver
 * docs/adr/BLOCK-III-DEFINITION.md §4.7 (excepción controlada A1) y
 * sub-incremento 2.b. `achievementVersionId` fijo desde la creación,
 * `progressStatus = COMPLETED` terminal -- ambos respaldados por el
 * trigger `enforce_achievement_progress_immutable` (base de datos), no
 * solo por disciplina de este repositorio.
 *
 * `markCompleted` acepta un `tx` OBLIGATORIO (a diferencia del resto de
 * métodos): la transición a `COMPLETED` debe ocurrir en la MISMA
 * transacción que crea el `achievement_unlock` correspondiente (precisión
 * obligatoria del Product Owner, sub-incremento 2.b) -- nunca puede quedar
 * una fila `COMPLETED` sin su unlock. Ver `RewardEvaluationWorker`.
 */
@Injectable()
export class AchievementProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotente por `UNIQUE(accountId, achievementDefinitionId)` -- mismo
   * patrón que `RewardGrantRepository.createIdempotent` (transacción
   * enteramente interna, sin `tx` externo, porque una segunda lectura tras
   * P2002 es segura: no hay una transacción de otro llamador que reutilizar).
   */
  async createIdempotent(input: {
    accountId: string;
    achievementDefinitionId: string;
    achievementVersionId: string;
    currentValue: number;
    targetValue: number;
    lastActivityId?: string | null;
  }): Promise<{ progress: AchievementProgress; created: boolean }> {
    try {
      const progress = await this.prisma.achievementProgress.create({ data: input });
      return { progress, created: true };
    } catch (error) {
      const isUniqueViolation = error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
      if (isUniqueViolation) {
        const existing = await this.prisma.achievementProgress.findUnique({
          where: { accountId_achievementDefinitionId: { accountId: input.accountId, achievementDefinitionId: input.achievementDefinitionId } },
        });
        if (existing) return { progress: existing, created: false };
      }
      throw error;
    }
  }

  findByAccountAndDefinition(accountId: string, achievementDefinitionId: string): Promise<AchievementProgress | null> {
    return this.prisma.achievementProgress.findUnique({
      where: { accountId_achievementDefinitionId: { accountId, achievementDefinitionId } },
    });
  }

  findById(id: string): Promise<AchievementProgress | null> {
    return this.prisma.achievementProgress.findUnique({ where: { id } });
  }

  /** Recompute puro mientras sigue IN_PROGRESS -- el trigger rechaza esta llamada si la fila ya es COMPLETED. */
  updateCurrentValue(id: string, currentValue: number, lastActivityId?: string | null): Promise<AchievementProgress> {
    return this.prisma.achievementProgress.update({ where: { id }, data: { currentValue, lastActivityId } });
  }

  /**
   * Transición terminal IN_PROGRESS -> COMPLETED. DEBE ejecutarse en la
   * misma transacción (`tx`) que crea el `achievement_unlock` -- ver
   * comentario de clase. No valida aquí que el llamador cumpla esto (no es
   * técnicamente posible desde el repositorio); la garantía la construye
   * `RewardEvaluationWorker` envolviendo ambas llamadas en un único
   * `TransactionRunnerService.run(...)`.
   */
  markCompleted(tx: Prisma.TransactionClient, id: string, currentValue: number, lastActivityId?: string | null): Promise<AchievementProgress> {
    return tx.achievementProgress.update({
      where: { id },
      data: { currentValue, lastActivityId, progressStatus: 'COMPLETED' },
    });
  }
}
