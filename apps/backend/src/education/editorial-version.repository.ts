import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { EditorialStatus, Prisma } from '../generated/prisma/client';

/**
 * Vista de una versión editorial, unificada para las DOS familias
 * (`question_version` y `learning_resource_version`), que §8.2 y §8.4 tratan
 * en paralelo con exactamente las mismas transiciones.
 *
 * `identityId` es `question_id` o `learning_resource_id` -- la columna padre
 * sobre la que vive el índice único parcial de unicidad de versión publicada
 * (§8.6, invariante 16).
 */
export interface EditorialVersionRef {
  versionId: string;
  identityId: string;
  editorialStatus: EditorialStatus;
  publishedAt: Date | null;
}

export type EditorialObjectType = 'QUESTION_VERSION' | 'LEARNING_RESOURCE_VERSION';

/**
 * Repositorio de ESCRITURA editorial -- LEF Bloque VII, Incremento 3.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN ARCHIVO NUEVO Y NO MÉTODOS EN LOS REPOSITORIOS EXISTENTES
 * ---------------------------------------------------------------------------
 * `question-version.repository.ts` y `learning-resource-version.repository.ts`
 * contienen dos de los CUATRO LECTORES de contenido de §11.1, cuyo predicado
 * de elegibilidad debe conservarse BYTE-IDÉNTICO (invariante 19). Manteniendo
 * la escritura editorial en un archivo propio, esos dos archivos quedan sin
 * tocar ni un byte y el gate puede verificarlo por diff, no por lectura.
 *
 * Este repositorio SOLO se usa desde `EditorialTransitionService`, que es la
 * autoridad de publicación (invariante 15). Ningún módulo administrativo lo
 * invoca directamente.
 *
 * Todos los métodos de escritura exigen `Prisma.TransactionClient`: el efecto
 * y su registro de auditoría comparten transacción (§9.3), y la despublicación
 * por supersesión de T7 debe ocurrir ANTES de la publicación, en la MISMA
 * transacción (§8.6).
 */
@Injectable()
export class EditorialVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVersion(
    objectType: EditorialObjectType,
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<EditorialVersionRef | null> {
    const client = tx ?? this.prisma;
    if (objectType === 'QUESTION_VERSION') {
      const row = await client.questionVersion.findUnique({
        where: { id: versionId },
        select: { id: true, questionId: true, editorialStatus: true, publishedAt: true },
      });
      return row
        ? {
            versionId: row.id,
            identityId: row.questionId,
            editorialStatus: row.editorialStatus,
            publishedAt: row.publishedAt,
          }
        : null;
    }
    const row = await client.learningResourceVersion.findUnique({
      where: { id: versionId },
      select: { id: true, learningResourceId: true, editorialStatus: true, publishedAt: true },
    });
    return row
      ? {
          versionId: row.id,
          identityId: row.learningResourceId,
          editorialStatus: row.editorialStatus,
          publishedAt: row.publishedAt,
        }
      : null;
  }

  /**
   * La otra versión `PUBLISHED` de la MISMA identidad, si existe -- la que T7
   * debe despublicar ANTES de publicar la nueva (§8.6, invariante 16). El
   * índice único parcial del Incremento 1 garantiza que hay como máximo una.
   */
  async findPublishedSibling(
    objectType: EditorialObjectType,
    identityId: string,
    excludeVersionId: string,
    tx: Prisma.TransactionClient,
  ): Promise<EditorialVersionRef | null> {
    if (objectType === 'QUESTION_VERSION') {
      const row = await tx.questionVersion.findFirst({
        where: { questionId: identityId, editorialStatus: 'PUBLISHED', id: { not: excludeVersionId } },
        select: { id: true, questionId: true, editorialStatus: true, publishedAt: true },
      });
      return row
        ? { versionId: row.id, identityId: row.questionId, editorialStatus: row.editorialStatus, publishedAt: row.publishedAt }
        : null;
    }
    const row = await tx.learningResourceVersion.findFirst({
      where: { learningResourceId: identityId, editorialStatus: 'PUBLISHED', id: { not: excludeVersionId } },
      select: { id: true, learningResourceId: true, editorialStatus: true, publishedAt: true },
    });
    return row
      ? {
          versionId: row.id,
          identityId: row.learningResourceId,
          editorialStatus: row.editorialStatus,
          publishedAt: row.publishedAt,
        }
      : null;
  }

  /**
   * Cambia el estado editorial y NADA MÁS.
   *
   * `publishedAt` solo se escribe cuando el llamador lo pide explícitamente
   * (T7). En T8 NO se toca: §8.2 lo declara un hecho histórico congelado, y el
   * trigger del Incremento 1 rechazaría el UPDATE si se intentara.
   *
   * Ninguna columna de CONTENIDO aparece en este método: corregir contenido
   * publicado es crear una versión NUEVA (invariante 5), y el Incremento 3 no
   * crea ni edita contenido en absoluto.
   */
  async updateEditorialStatus(
    tx: Prisma.TransactionClient,
    objectType: EditorialObjectType,
    versionId: string,
    newStatus: EditorialStatus,
    publishedAt?: Date,
  ): Promise<void> {
    const data = publishedAt !== undefined ? { editorialStatus: newStatus, publishedAt } : { editorialStatus: newStatus };
    if (objectType === 'QUESTION_VERSION') {
      await tx.questionVersion.update({ where: { id: versionId }, data });
      return;
    }
    await tx.learningResourceVersion.update({ where: { id: versionId }, data });
  }
}
