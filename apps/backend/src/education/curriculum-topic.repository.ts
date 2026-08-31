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

  /**
   * Bloque V/Progreso batch -- qué subconjunto de los ids solicitados
   * corresponde a un tema real, en una sola consulta `IN`. Usado por
   * `ProgressService.getTopicsProgressBatch` para omitir en silencio ids
   * que no existen (nunca sintetizar `NOT_STARTED` para un tema
   * inexistente -- sería semánticamente falso: "sin empezar" implica que
   * SÍ se podría empezar).
   */
  async findExistingIds(ids: string[]): Promise<Set<string>> {
    const rows = await this.prisma.curriculumTopic.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
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

  /**
   * STUDY CONTENT MOBILE REACHABILITY -- unidades CANÓNICAS del catálogo V1:
   * nodos raíz de la materia que tienen al menos un hijo (Recurso) con una
   * `learning_resource_version` PUBLISHED. Es exactamente la forma que el
   * importer del manifest produce para cada una de las 20 unidades
   * canónicas (Unidad -> 98 Recursos hijos, cada Recurso con recurso
   * publicado), y NUNCA la de los 4 topics raíz legacy del seed
   * (`M1.NUMEROS.PORCENTAJES` cuelga su contenido del propio nodo raíz y sus
   * hijos no tienen recurso publicado; `C1.BIOLOGIA.CELULA` /
   * `L1.LECTURA.INFERENCIA` / `H1.CHILE.SIGLO20.ISI` no tienen hijos).
   *
   * Filtro puramente de LECTURA -- no borra, deprecia ni reparenta nada; la
   * base de datos y el manifest siguen siendo la autoridad. Deriva la
   * identidad "unidad canónica" de la estructura de contenido publicado ya
   * presente, sin una lista de 20 códigos mantenida a mano.
   */
  findCanonicalUnitRootsBySubjectId(subjectId: string): Promise<CurriculumTopic[]> {
    return this.prisma.curriculumTopic.findMany({
      where: {
        subjectId,
        parentId: null,
        children: {
          some: {
            learningResourceVersions: { some: { editorialStatus: 'PUBLISHED' } },
          },
        },
      },
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
