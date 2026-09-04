import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { LearningResourceProgress } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === UNIQUE_CONSTRAINT_VIOLATION;
}

/**
 * XP-V1B-2 -- Único punto de acceso a `learning_resource_progress`. `NOT_COMPLETED`
 * es la ausencia de fila -- nunca un valor almacenado, mismo criterio que
 * `CurriculumTopicProgressRepository`. Sin método `update`: `completedAt` se
 * fija UNA sola vez, en la creación, y nunca cambia (ningún caller de este
 * repositorio hace un `UPDATE`).
 */
@Injectable()
export class LearningResourceProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountAndResource(accountId: string, learningResourceId: string): Promise<LearningResourceProgress | null> {
    return this.prisma.learningResourceProgress.findUnique({
      where: { accountId_learningResourceId: { accountId, learningResourceId } },
    });
  }

  /**
   * Crea la fila de completitud SI NO EXISTE. `createIdempotent` -- nunca
   * `upsert`: un `upsert` re-escribiría `completedAt` en cada llamada
   * (viola §S: "completedAt es el instante de la PRIMERA completitud,
   * inmutable"). Ante una carrera real de dos solicitudes concurrentes
   * (misma cuenta + mismo recurso), la segunda captura `P2002` y relee la
   * fila que la primera ya creó -- la autoridad final es el `UNIQUE` de la
   * base de datos, nunca un `SELECT` previo sin garantía (§R).
   */
  async createIdempotent(accountId: string, learningResourceId: string): Promise<{ progress: LearningResourceProgress; created: boolean }> {
    try {
      const progress = await this.prisma.learningResourceProgress.create({ data: { accountId, learningResourceId } });
      return { progress, created: true };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        const existing = await this.findByAccountAndResource(accountId, learningResourceId);
        if (existing) return { progress: existing, created: false };
      }
      throw error;
    }
  }

  /** `deleteMany` -- nunca lanza si no hay filas (mismo criterio que `CurriculumTopicProgressRepository.deleteByAccountId`). */
  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await this.prisma.learningResourceProgress.deleteMany({ where: { accountId } });
    return result.count;
  }
}
