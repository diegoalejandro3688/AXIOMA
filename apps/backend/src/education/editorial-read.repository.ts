import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';

/**
 * Lectura administrativa COMPLETA por clave estable -- CONTENT-4.2B.
 *
 * Archivo PROPIO, separado de `editorial-authoring.repository.ts` a
 * propósito: ese repositorio es de ESCRITURA (T1/T2) y su gate (I4) escanea
 * su código fuente para comprobar que TODO `editorialStatus` que escribe es
 * `'DRAFT'` -- un filtro de LECTURA `editorialStatus: 'PUBLISHED'` en el
 * mismo archivo produciría un falso positivo en esa comprobación (el gate no
 * distingue lectura de escritura por regex). Mismo criterio de separación
 * por archivo que ya usa el propio `editorial-authoring.repository.ts` en su
 * docstring para justificar por qué NO comparte archivo con los cuatro
 * lectores de contenido de §11.1 (invariante 19).
 *
 * Distinto de `findQuestionVersionForAuthoring`/
 * `findLearningResourceVersionForAuthoring` (que resuelven por `versionId` y
 * sirven a T2/CMS-013, y a las que les falta `stemContent`/`title` porque no
 * los necesitan): estos dos métodos resuelven por CLAVE ESTABLE y devuelven
 * la versión PUBLISHED actual (si existe) con TODO su contenido editorial,
 * `isCorrect` incluido -- necesario para que `import-content.ts`
 * (CONTENT-4.2) pueda decidir CREATE/NO-OP/NEW VERSION sin usar el lector de
 * ESTUDIANTE (que omite `isCorrect` a propósito, ADR-0012).
 *
 * Al menos 0 y a lo sumo 1 fila PUBLISHED por identidad -- lo garantiza el
 * índice único parcial del Incremento 1 (invariante 2), no una suposición de
 * esta consulta.
 */
@Injectable()
export class EditorialReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionByKeyWithPublishedVersion(questionKey: string) {
    const row = await this.prisma.question.findUnique({
      where: { questionKey },
      select: {
        id: true,
        questionKey: true,
        versions: {
          where: { editorialStatus: 'PUBLISHED' },
          select: {
            id: true,
            editorialStatus: true,
            stemContent: true,
            explanationContent: true,
            answerOptions: { select: { content: true, isCorrect: true }, orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    });
    if (!row) return null;
    const published = row.versions[0] ?? null;
    return {
      questionId: row.id,
      questionKey: row.questionKey,
      publishedVersion: published
        ? {
            versionId: published.id,
            editorialStatus: published.editorialStatus,
            stemContent: published.stemContent,
            explanationContent: published.explanationContent,
            answerOptions: published.answerOptions,
          }
        : null,
    };
  }

  async findLearningResourceByKeyWithPublishedVersion(resourceKey: string) {
    const row = await this.prisma.learningResource.findUnique({
      where: { resourceKey },
      select: {
        id: true,
        resourceKey: true,
        resourceType: true,
        versions: {
          where: { editorialStatus: 'PUBLISHED' },
          select: { id: true, editorialStatus: true, title: true, contentBlocks: true },
        },
      },
    });
    if (!row) return null;
    const published = row.versions[0] ?? null;
    return {
      resourceId: row.id,
      resourceKey: row.resourceKey,
      resourceType: row.resourceType,
      publishedVersion: published
        ? { versionId: published.id, editorialStatus: published.editorialStatus, title: published.title, contentBlocks: published.contentBlocks }
        : null,
    };
  }
}
