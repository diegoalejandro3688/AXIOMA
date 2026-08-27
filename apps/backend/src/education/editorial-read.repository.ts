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
 * TODO el contenido editorial, `isCorrect` incluido -- necesario para que
 * `import-content.ts` (CONTENT-4.2) pueda decidir CREATE/NO-OP/NEW VERSION
 * sin usar el lector de ESTUDIANTE (que omite `isCorrect` a propósito,
 * ADR-0012).
 *
 * `latestVersion` (CONTENT-4.6A) -- además de `publishedVersion` (que sigue
 * existiendo, sin cambio de comportamiento), se devuelve la versión con
 * `createdAt` más reciente SEA CUAL SEA su `editorialStatus`. Cierra el hueco
 * de CONTENT-4.6: una identidad cuya única versión quedó en DRAFT/IN_REVIEW/
 * APPROVED (interrupción de red/429 a mitad de workflow) antes era
 * INDISTINGUIBLE de "no existe" -- ahora `latestVersion` la hace visible para
 * que el importer pueda comparar su contenido y decidir si reanudar el
 * workflow con seguridad. Ver `packages/contracts/src/editorial.ts` para el
 * razonamiento completo.
 *
 * Al menos 0 y a lo sumo 1 fila PUBLISHED por identidad -- lo garantiza el
 * índice único parcial del Incremento 1 (invariante 2), no una suposición de
 * esta consulta. `latestVersion` no depende de esa garantía: es simplemente
 * `ORDER BY created_at DESC LIMIT 1` sobre todas las versiones de la
 * identidad, ninguna fila especial.
 */
@Injectable()
export class EditorialReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findQuestionByKeyWithVersions(questionKey: string) {
    const row = await this.prisma.question.findUnique({
      where: { questionKey },
      select: {
        id: true,
        questionKey: true,
        versions: {
          orderBy: { createdAt: 'desc' },
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
    const project = (v: (typeof row.versions)[number] | undefined) =>
      v
        ? {
            versionId: v.id,
            editorialStatus: v.editorialStatus,
            stemContent: v.stemContent,
            explanationContent: v.explanationContent,
            answerOptions: v.answerOptions,
          }
        : null;
    const latest = row.versions[0];
    const published = row.versions.find((v) => v.editorialStatus === 'PUBLISHED');
    return {
      questionId: row.id,
      questionKey: row.questionKey,
      publishedVersion: project(published),
      latestVersion: project(latest),
    };
  }

  async findLearningResourceByKeyWithVersions(resourceKey: string) {
    const row = await this.prisma.learningResource.findUnique({
      where: { resourceKey },
      select: {
        id: true,
        resourceKey: true,
        resourceType: true,
        versions: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, editorialStatus: true, title: true, contentBlocks: true },
        },
      },
    });
    if (!row) return null;
    const project = (v: (typeof row.versions)[number] | undefined) =>
      v ? { versionId: v.id, editorialStatus: v.editorialStatus, title: v.title, contentBlocks: v.contentBlocks } : null;
    const latest = row.versions[0];
    const published = row.versions.find((v) => v.editorialStatus === 'PUBLISHED');
    return {
      resourceId: row.id,
      resourceKey: row.resourceKey,
      resourceType: row.resourceType,
      publishedVersion: project(published),
      latestVersion: project(latest),
    };
  }
}
