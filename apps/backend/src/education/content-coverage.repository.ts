import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { EditorialStatus } from '../generated/prisma/client';

/**
 * Clave de agregación: un tema y un estado editorial.
 * `_all` es el número de versiones de ese tema en ese estado.
 */
export interface CoverageCountRow {
  curriculumTopicId: string;
  editorialStatus: EditorialStatus;
  count: number;
}

/** `updated_at` más reciente de las versiones de un tema. */
export interface CoverageFreshnessRow {
  curriculumTopicId: string;
  lastUpdatedAt: Date;
}

/**
 * Agregaciones de cobertura de contenido -- LEF Bloque VII, Incremento 5.
 * Ver LEF-BLOCK-VII-DEFINITION.md §12.5, §13.5, decisión E e invariante 14.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ VIVE EN `education/` Y NO EN LA CAPA ADMINISTRATIVA
 * ---------------------------------------------------------------------------
 * Mismo criterio que `editorial-transition.service.ts` (I3) y
 * `editorial-authoring.service.ts` (I4): MC §6.17 prohíbe que ADMINISTRATION
 * lea o escriba directamente en tablas autoritativas de otro dominio. La
 * capa administrativa SOLICITA; EDUCATION es la dueña de `question_version`,
 * `learning_resource_version`, `curriculum_topic` y `subject`. El controller
 * HTTP no toca este repositorio: habla con `ContentCoverageService`.
 *
 * ---------------------------------------------------------------------------
 * RELACIÓN CON `countPublishedByTopicId` -- §12.5, decisión E
 * ---------------------------------------------------------------------------
 * §12.5 ordena "reutiliza/expone `countPublishedByTopicId`
 * (`question-version.repository.ts:82`) como precedente, SIN DUPLICAR SU
 * LÓGICA". Eso es literalmente lo que hace este archivo:
 *
 *  - El PRECEDENTE que se reutiliza es su forma: un `count` de Prisma sobre
 *    `question_version` filtrado por `curriculumTopicId` + `editorialStatus`.
 *    Aquí se GENERALIZA a "todos los temas x los cuatro estados" con un
 *    `groupBy`, exactamente como `CurriculumTopicRepository.countAllGroupedBySubjectId`
 *    (Bloque V, Incremento 3) generalizó su propio conteo "sin N+1 por materia".
 *  - NO se duplica su lógica: `countPublishedByTopicId` sigue existiendo,
 *    byte-idéntico, y sigue siendo el único punto de entrada de PROGRESS
 *    (ADR-0014 punto 6). Este repositorio NO lo reimplementa ni lo reemplaza;
 *    tampoco lo llama en bucle, porque N llamadas por tema serían justamente
 *    la duplicación operativa que el precedente de Bloque V ya descartó.
 *
 * ---------------------------------------------------------------------------
 * REGLA DURA -- invariante 14
 * ---------------------------------------------------------------------------
 * Este repositorio SOLO ejecuta `groupBy` y `aggregate`. No existe en él
 * ningún `create`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`
 * ni `$executeRaw`. La matriz no materializa nada: se calcula en lectura.
 * Verificado estáticamente por `verify:content-coverage-matrix-gate`.
 */
@Injectable()
export class ContentCoverageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Los CUATRO estados que §12.5 nombra. `DEPRECATED` y `ARCHIVED` quedan
   * fuera a propósito: el primero no se pide, y el segundo es inalcanzable
   * por ninguna ruta de Bloque VII (invariante 21).
   */
  private static readonly COUNTED_STATUSES: EditorialStatus[] = ['PUBLISHED', 'DRAFT', 'IN_REVIEW', 'APPROVED'];

  /** Conteo de `question_version` por (tema, estado), en UNA sola consulta. */
  async countQuestionVersionsByTopicAndStatus(): Promise<CoverageCountRow[]> {
    const rows = await this.prisma.questionVersion.groupBy({
      by: ['curriculumTopicId', 'editorialStatus'],
      where: { editorialStatus: { in: ContentCoverageRepository.COUNTED_STATUSES } },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      curriculumTopicId: r.curriculumTopicId,
      editorialStatus: r.editorialStatus,
      count: r._count._all,
    }));
  }

  /** Ídem para `learning_resource_version`. §8.2/§8.4 tratan ambas familias en paralelo. */
  async countLearningResourceVersionsByTopicAndStatus(): Promise<CoverageCountRow[]> {
    const rows = await this.prisma.learningResourceVersion.groupBy({
      by: ['curriculumTopicId', 'editorialStatus'],
      where: { editorialStatus: { in: ContentCoverageRepository.COUNTED_STATUSES } },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      curriculumTopicId: r.curriculumTopicId,
      editorialStatus: r.editorialStatus,
      count: r._count._all,
    }));
  }

  /**
   * "Última actualización" por tema (§12.5), en las dos familias.
   *
   * Se agrega sobre TODOS los estados, no solo los cuatro contados: la
   * pregunta que responde es "cuándo se tocó por última vez el contenido de
   * este tema", y una versión retirada también fue tocada. Es un `max` de
   * `updated_at`; ningún contenido académico sale de aquí.
   */
  async lastQuestionVersionUpdateByTopic(): Promise<CoverageFreshnessRow[]> {
    const rows = await this.prisma.questionVersion.groupBy({
      by: ['curriculumTopicId'],
      _max: { updatedAt: true },
    });
    return rows
      .filter((r): r is typeof r & { _max: { updatedAt: Date } } => r._max.updatedAt !== null)
      .map((r) => ({ curriculumTopicId: r.curriculumTopicId, lastUpdatedAt: r._max.updatedAt }));
  }

  async lastLearningResourceVersionUpdateByTopic(): Promise<CoverageFreshnessRow[]> {
    const rows = await this.prisma.learningResourceVersion.groupBy({
      by: ['curriculumTopicId'],
      _max: { updatedAt: true },
    });
    return rows
      .filter((r): r is typeof r & { _max: { updatedAt: Date } } => r._max.updatedAt !== null)
      .map((r) => ({ curriculumTopicId: r.curriculumTopicId, lastUpdatedAt: r._max.updatedAt }));
  }

  /**
   * Todos los temas, con su materia. Es la ESPINA de la matriz: un tema sin
   * ninguna versión debe aparecer igualmente, con ceros -- ese hueco es
   * exactamente lo que `CMS-002` existe para hacer visible.
   *
   * No se reutiliza `CurriculumTopicRepository.findRootsBySubjectId`/
   * `findChildren` porque recorrer el árbol por niveles serían N+1 consultas
   * para construir una tabla plana; la matriz necesita todos los temas de una
   * vez y conserva `parentId` para que la jerarquía siga siendo legible.
   */
  findAllTopics(): Promise<
    { id: string; code: string; name: string; order: number; parentId: string | null; subjectId: string }[]
  > {
    return this.prisma.curriculumTopic.findMany({
      select: { id: true, code: true, name: true, order: true, parentId: true, subjectId: true },
      orderBy: [{ subjectId: 'asc' }, { order: 'asc' }],
    });
  }
}
