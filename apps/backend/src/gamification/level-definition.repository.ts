import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { LevelDefinition } from '../generated/prisma/client';

/**
 * Único punto de acceso a `level_definition` -- ver
 * docs/adr/BLOCK-II-DEFINITION.md (incremento "Progresión visible").
 * Escalera de solo lectura para este incremento: la creación/edición de
 * niveles es un proceso de configuración (seed), no una operación expuesta
 * por API todavía -- ninguna Plataforma Editorial existe (Bloque VII).
 */
@Injectable()
export class LevelDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Ordenada ascendente por levelNumber -- el orden es parte del contrato de uso de ProgressionService. */
  findAllActiveOrderedByLevelNumber(): Promise<LevelDefinition[]> {
    return this.prisma.levelDefinition.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { levelNumber: 'asc' },
    });
  }

  create(input: { levelNumber: number; levelName?: string | null; minimumLifetimeXp: number }): Promise<LevelDefinition> {
    return this.prisma.levelDefinition.create({ data: input });
  }

  findByLevelNumber(levelNumber: number): Promise<LevelDefinition | null> {
    return this.prisma.levelDefinition.findUnique({ where: { levelNumber } });
  }
}
