import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { LearningResourceType, Prisma } from '../generated/prisma/client';
import type { Cms013LearningResourceInput, Cms013QuestionInput } from './cms013-content-validation';

/**
 * Repositorio de ESCRITURA DE CONTENIDO editorial -- LEF Bloque VII,
 * Incremento 4 (T1 crear borrador, T2 editar en `DRAFT`).
 * Ver LEF-BLOCK-VII-DEFINITION.md §8.2, §8.4, §12.4.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN ARCHIVO NUEVO Y NO MÉTODOS EN LOS REPOSITORIOS EXISTENTES
 * ---------------------------------------------------------------------------
 * Exactamente el mismo criterio que `editorial-version.repository.ts` ya
 * estableció en el Incremento 3: `question-version.repository.ts`,
 * `learning-resource-version.repository.ts`, `question.repository.ts` y
 * `answer-option.repository.ts` contienen los CUATRO LECTORES de contenido de
 * §11.1, cuyo predicado de elegibilidad debe conservarse BYTE-IDÉNTICO
 * (invariante 19). Manteniendo la escritura de autoría en un archivo propio,
 * esos archivos quedan sin tocar ni un byte y el gate puede verificarlo por
 * diff, no por lectura.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTE REPOSITORIO NO PUEDE HACER, POR CONSTRUCCIÓN
 * ---------------------------------------------------------------------------
 *  - No escribe NUNCA `editorialStatus` distinto de `DRAFT` en una creación, y
 *    no lo escribe EN ABSOLUTO en una edición: cambiar de estado es una
 *    TRANSICIÓN y vive en `editorial-transition.service.ts` (invariante 4,
 *    lista cerrada de §8.4). Ninguna firma de este archivo admite un estado.
 *  - No escribe NUNCA `publishedAt`: lo fija T7, y solo T7.
 *  - No admite `id` del llamador en ninguna creación: los identificadores los
 *    genera PostgreSQL vía `@default(uuid())`. Un cliente que eligiera el `id`
 *    podría apuntar deliberadamente a una fila publicada.
 *  - No borra nada. No existe ningún método `delete`.
 *
 * Todos los métodos de escritura EXIGEN `Prisma.TransactionClient`: el efecto
 * y su registro de auditoría comparten transacción (§9.3, "si la transacción
 * falla no hay registro; si hay registro, el efecto ocurrió").
 *
 * DEFENSA EN PROFUNDIDAD, NO SUSTITUCIÓN: si algo intentara editar una versión
 * que ya alcanzó publicación, los triggers del Incremento 1 lo rechazarían en
 * PostgreSQL. El servicio comprueba `DRAFT` antes para dar un error de dominio
 * legible; la base sigue siendo la autoridad final (§7.2, nota de rigor).
 */
@Injectable()
export class EditorialAuthoringRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // Lecturas de apoyo -- validación de referencias canónicas antes de escribir.
  // ==========================================================================

  /** Materia + tema, con el `subjectId` del tema para comprobar consistencia. */
  async findSubject(subjectId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).subject.findUnique({ where: { id: subjectId }, select: { id: true, status: true } });
  }

  async findTopic(topicId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).curriculumTopic.findUnique({
      where: { id: topicId },
      select: { id: true, subjectId: true },
    });
  }

  async findQuestionIdentity(questionId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).question.findUnique({
      where: { id: questionId },
      select: { id: true, primarySubjectId: true, questionType: true, status: true },
    });
  }

  async findLearningResourceIdentity(resourceId: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).learningResource.findUnique({
      where: { id: resourceId },
      select: { id: true, primarySubjectId: true, status: true },
    });
  }

  /**
   * Estado de edición de una versión de pregunta: lo que T2 necesita para
   * decidir, y lo que CMS-013 necesita para evaluar en T3.
   */
  async findQuestionVersionForAuthoring(
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    | (Cms013QuestionInput & { versionId: string; questionId: string; editorialStatus: string; primarySubjectId: string })
    | null
  > {
    const row = await (tx ?? this.prisma).questionVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        questionId: true,
        curriculumTopicId: true,
        explanationContent: true,
        editorialStatus: true,
        question: { select: { primarySubjectId: true } },
        answerOptions: { select: { content: true, isCorrect: true }, orderBy: { displayOrder: 'asc' } },
      },
    });
    if (!row) return null;
    return {
      versionId: row.id,
      questionId: row.questionId,
      primarySubjectId: row.question.primarySubjectId,
      editorialStatus: row.editorialStatus,
      curriculumTopicId: row.curriculumTopicId,
      explanationContent: row.explanationContent,
      answerOptions: row.answerOptions.map((o) => ({ content: o.content, isCorrect: o.isCorrect })),
    };
  }

  async findLearningResourceVersionForAuthoring(
    versionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    | (Cms013LearningResourceInput & {
        versionId: string;
        learningResourceId: string;
        editorialStatus: string;
        primarySubjectId: string;
      })
    | null
  > {
    const row = await (tx ?? this.prisma).learningResourceVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        learningResourceId: true,
        curriculumTopicId: true,
        title: true,
        contentBlocks: true,
        editorialStatus: true,
        learningResource: { select: { primarySubjectId: true } },
      },
    });
    if (!row) return null;
    return {
      versionId: row.id,
      learningResourceId: row.learningResourceId,
      primarySubjectId: row.learningResource.primarySubjectId,
      editorialStatus: row.editorialStatus,
      curriculumTopicId: row.curriculumTopicId,
      title: row.title,
      contentBlocks: row.contentBlocks,
    };
  }

  async findQuestionByKey(questionKey: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).question.findUnique({ where: { questionKey }, select: { id: true } });
  }

  async findLearningResourceByKey(resourceKey: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).learningResource.findUnique({ where: { resourceKey }, select: { id: true } });
  }

  // ==========================================================================
  // T1 -- creación. SIEMPRE en `DRAFT`, `publishedAt` nulo (§8.2, fila T1).
  // ==========================================================================

  /** Crea la identidad lógica estable de una pregunta. Sin versión todavía. */
  async createQuestionIdentity(
    tx: Prisma.TransactionClient,
    input: { questionKey: string; primarySubjectId: string },
  ): Promise<{ id: string }> {
    return tx.question.create({
      data: {
        questionKey: input.questionKey,
        primarySubjectId: input.primarySubjectId,
        // `SINGLE_CHOICE` es el ÚNICO valor del enum en M1 (ADR-0012, DM-D124).
        // No se expone en el contrato: ofrecer un campo con un solo valor
        // posible sugeriría que hay más, y habilitar otros tipos es una
        // decisión Nivel 2/3 separada, no una extensión silenciosa.
        questionType: 'SINGLE_CHOICE',
      },
      select: { id: true },
    });
  }

  /**
   * Crea una versión `DRAFT` de una pregunta y sus alternativas.
   *
   * ORDEN OBLIGATORIO, el mismo que `prisma/seed.ts:123-140` ya ejerce: la
   * versión nace en `DRAFT` y las alternativas se insertan MIENTRAS sigue en
   * `DRAFT`. Insertar un `answer_option` en una versión publicada está
   * prohibido (invariante 2). Aquí eso no puede ocurrir porque la versión
   * acaba de nacer en `DRAFT` y nada de este archivo la publica.
   */
  async createQuestionVersion(
    tx: Prisma.TransactionClient,
    input: {
      questionId: string;
      curriculumTopicId: string;
      stemContent: Prisma.InputJsonValue;
      explanationContent: Prisma.InputJsonValue;
      answerOptions: ReadonlyArray<{ content: Prisma.InputJsonValue; isCorrect: boolean }>;
    },
  ): Promise<{ id: string }> {
    const version = await tx.questionVersion.create({
      data: {
        questionId: input.questionId,
        curriculumTopicId: input.curriculumTopicId,
        stemContent: input.stemContent,
        explanationContent: input.explanationContent,
        editorialStatus: 'DRAFT',
        // `publishedAt` NO se escribe: queda nulo (§8.2, fila T1).
      },
      select: { id: true },
    });
    await tx.answerOption.createMany({
      data: input.answerOptions.map((option, index) => ({
        questionVersionId: version.id,
        content: option.content,
        // `displayOrder` es el índice del arreglo: sin huecos, sin duplicados.
        displayOrder: index,
        isCorrect: option.isCorrect,
      })),
    });
    return version;
  }

  async createLearningResourceIdentity(
    tx: Prisma.TransactionClient,
    input: { resourceKey: string; primarySubjectId: string; resourceType: LearningResourceType },
  ): Promise<{ id: string }> {
    return tx.learningResource.create({
      data: {
        resourceKey: input.resourceKey,
        primarySubjectId: input.primarySubjectId,
        resourceType: input.resourceType,
      },
      select: { id: true },
    });
  }

  async createLearningResourceVersion(
    tx: Prisma.TransactionClient,
    input: {
      learningResourceId: string;
      curriculumTopicId: string;
      title: string;
      contentBlocks: Prisma.InputJsonValue;
    },
  ): Promise<{ id: string }> {
    return tx.learningResourceVersion.create({
      data: {
        learningResourceId: input.learningResourceId,
        curriculumTopicId: input.curriculumTopicId,
        title: input.title,
        contentBlocks: input.contentBlocks,
        editorialStatus: 'DRAFT',
      },
      select: { id: true },
    });
  }

  // ==========================================================================
  // T2 -- edición en `DRAFT`. Solo columnas de CONTENIDO y clasificación.
  //
  // Las columnas ausentes de estas firmas -- `id`, `questionId`/
  // `learningResourceId`, `editorialStatus`, `publishedAt`, `createdAt` -- son
  // EXACTAMENTE las que §8.4 declara inmutables sobre una fila publicada, y
  // aquí se excluyen por la misma razón de fondo: no son contenido. Es la
  // clasificación de columnas que el Incremento 1 ya fijó, REUTILIZADA, no
  // reinventada. `updatedAt` lo escribe Prisma (`@updatedAt`).
  // ==========================================================================

  async updateQuestionVersionContent(
    tx: Prisma.TransactionClient,
    versionId: string,
    input: {
      curriculumTopicId?: string;
      stemContent?: Prisma.InputJsonValue;
      explanationContent?: Prisma.InputJsonValue;
      answerOptions?: ReadonlyArray<{ content: Prisma.InputJsonValue; isCorrect: boolean }>;
    },
  ): Promise<void> {
    const data: Prisma.QuestionVersionUpdateInput = {};
    if (input.curriculumTopicId !== undefined) {
      data.curriculumTopic = { connect: { id: input.curriculumTopicId } };
    }
    if (input.stemContent !== undefined) data.stemContent = input.stemContent;
    if (input.explanationContent !== undefined) data.explanationContent = input.explanationContent;
    if (Object.keys(data).length > 0) {
      await tx.questionVersion.update({ where: { id: versionId }, data });
    }

    if (input.answerOptions !== undefined) {
      // REEMPLAZO COMPLETO del conjunto -- ver el docstring del contrato: cuál
      // alternativa es la correcta depende de todas, y un parche individual
      // haría representable un intermedio con cero o dos correctas.
      //
      // `deleteMany` aquí es seguro y NO es un bypass de inmutabilidad: el
      // servicio ya comprobó que la versión está en `DRAFT`, y si no lo
      // estuviera `trg_answer_option_published_parent_immutable` rechazaría
      // tanto el DELETE como el INSERT. Ningún trigger se desactiva.
      await tx.answerOption.deleteMany({ where: { questionVersionId: versionId } });
      await tx.answerOption.createMany({
        data: input.answerOptions.map((option, index) => ({
          questionVersionId: versionId,
          content: option.content,
          displayOrder: index,
          isCorrect: option.isCorrect,
        })),
      });
    }
  }

  async updateLearningResourceVersionContent(
    tx: Prisma.TransactionClient,
    versionId: string,
    input: { curriculumTopicId?: string; title?: string; contentBlocks?: Prisma.InputJsonValue },
  ): Promise<void> {
    const data: Prisma.LearningResourceVersionUpdateInput = {};
    if (input.curriculumTopicId !== undefined) {
      data.curriculumTopic = { connect: { id: input.curriculumTopicId } };
    }
    if (input.title !== undefined) data.title = input.title;
    if (input.contentBlocks !== undefined) data.contentBlocks = input.contentBlocks;
    if (Object.keys(data).length === 0) return;
    await tx.learningResourceVersion.update({ where: { id: versionId }, data });
  }
}
