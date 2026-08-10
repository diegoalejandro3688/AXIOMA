import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { CurriculumTopic } from '../generated/prisma/client';

/**
 * Repositorio propio del agregado CurriculumTopic (dominio EDUCATION).
 * Único punto de acceso a la tabla curriculum_topic -- ningún otro módulo
 * consulta esta tabla directamente vía PrismaService.
 *
 * `subjectId` (ADR-0012) es obligatorio e inmutable una vez fijado --
 * aplicado por el trigger `enforce_curriculum_topic_subject_consistency`,
 * no por este repositorio (defensa en profundidad, ver ADR-0012 punto 4).
 */
@Injectable()
export class CurriculumTopicRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<CurriculumTopic | null> {
    return this.prisma.curriculumTopic.findUnique({ where: { id } });
  }

  findByCode(code: string): Promise<CurriculumTopic | null> {
    return this.prisma.curriculumTopic.findUnique({ where: { code } });
  }

  /** Nodos de nivel superior (sin padre) dentro de una materia. */
  findRootsBySubjectId(subjectId: string): Promise<CurriculumTopic[]> {
    return this.prisma.curriculumTopic.findMany({
      where: { subjectId, parentId: null },
      orderBy: { order: 'asc' },
    });
  }

  findChildren(parentId: string | null): Promise<CurriculumTopic[]> {
    return this.prisma.curriculumTopic.findMany({
      where: { parentId },
      orderBy: { order: 'asc' },
    });
  }

  count(): Promise<number> {
    return this.prisma.curriculumTopic.count();
  }

  /**
   * LEF Bloque V, Incremento 3 ("Resumen académico privado") -- total de
   * temas por materia, para toda la base de temas (independiente de
   * progreso de cualquier cuenta). Es el DENOMINADOR de "temas
   * completados/N" en el resumen -- una sola consulta agregada, sin N+1
   * por materia.
   */
  async countAllGroupedBySubjectId(): Promise<Map<string, number>> {
    const rows = await this.prisma.curriculumTopic.groupBy({ by: ['subjectId'], _count: { _all: true } });
    return new Map(rows.map((r) => [r.subjectId, r._count._all]));
  }
}
