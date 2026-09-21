import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Prisma, QuestionVersion, AnswerOption } from '../generated/prisma/client';

export type QuestionVersionWithDetails = QuestionVersion & {
  question: { id: string; questionKey: string; questionType: string };
  answerOptions: AnswerOption[];
};

export type QuestionVersionWithQuestionStatus = QuestionVersion & {
  question: { id: string; status: string };
};

export type QuestionVersionWithAnswerOptions = QuestionVersion & {
  answerOptions: AnswerOption[];
};

/**
 * Repositorio propio del agregado QuestionVersion (dominio EDUCATION).
 * `curriculumTopicId` es la clasificación editorial fina, trazable por
 * versión -- ver ADR-0012, invariante 1.
 */
@Injectable()
export class QuestionVersionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.QuestionVersionUncheckedCreateInput): Promise<QuestionVersion> {
    return this.prisma.questionVersion.create({ data });
  }

  /**
   * Todas las versiones publicadas de un tema, con sus alternativas. Solo
   * `PUBLISHED` es servible -- ver EducationService. El repositorio devuelve
   * `AnswerOption` completo (incluye `isCorrect`); la exclusión hacia el
   * cliente ocurre en la capa de mapeo a respuesta (nunca en el repositorio,
   * que debe reflejar el dato real para uso interno futuro de Progress).
   */
  findPublishedByTopicId(curriculumTopicId: string): Promise<QuestionVersionWithDetails[]> {
    return this.prisma.questionVersion.findMany({
      where: { curriculumTopicId, editorialStatus: 'PUBLISHED' },
      orderBy: { publishedAt: 'asc' },
      include: {
        question: { select: { id: true, questionKey: true, questionType: true } },
        answerOptions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }

  /**
   * Uso interno de PROGRESS (ADR-0014) y GAMIFICATION (Bloque IV,
   * Incremento 4) para validar una respuesta: incluye el `status` de la
   * identidad lógica (`question`) -- una pregunta retirada no puede
   * responderse aunque su última versión siga `PUBLISHED`. `tx` opcional --
   * QuickQuestionService (4.b) lo pasa para leer dentro de la misma
   * transacción bloqueada por sesión (§13, "relectura, decisión y
   * escritura en el mismo tx"); PROGRESS sigue sin pasarlo (sin cambios).
   */
  findByIdWithQuestionStatus(id: string, tx?: Prisma.TransactionClient): Promise<QuestionVersionWithQuestionStatus | null> {
    return (tx ?? this.prisma).questionVersion.findUnique({
      where: { id },
      include: { question: { select: { id: true, status: true } } },
    });
  }

  /**
   * Presentación server-side de Pregunta rápida (Bloque IV, Incremento 4,
   * sub-incremento 4.c, §13.4) -- `stemContent`/`answerOptions` para
   * renderizar la pregunta pendiente, SIN `isCorrect` hacia el cliente (esa
   * exclusión ocurre en la capa de mapeo del controller, mismo criterio que
   * EDUCATION). `tx` opcional -- QuickQuestionService lo pasa dentro de la
   * transacción bloqueada por sesión.
   */
  findByIdWithAnswerOptions(id: string, tx?: Prisma.TransactionClient): Promise<QuestionVersionWithAnswerOptions | null> {
    return (tx ?? this.prisma).questionVersion.findUnique({
      where: { id },
      include: { answerOptions: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  /** Conteo de versiones publicadas de un tema -- usado por PROGRESS para determinar completitud (ADR-0014, punto 6). */
  countPublishedByTopicId(curriculumTopicId: string): Promise<number> {
    return this.prisma.questionVersion.count({ where: { curriculumTopicId, editorialStatus: 'PUBLISHED' } });
  }

  /**
   * Selección server-side de Pregunta rápida (Bloque IV, Incremento 4,
   * sub-incremento 4.b, §13.2). `excludeQuestionVersionIds` = toda
   * `questionVersionId` ya presente en `quick_question_attempt` de la
   * sesión actual -- refuerza en la SELECCIÓN lo que
   * `@@unique([sessionId, questionVersionId])` ya refuerza en la
   * ESCRITURA (defensa en profundidad). Sin filtro por materia/dificultad
   * en V1 -- "dificultad" no existe en el esquema hoy (auditoría §12).
   * `tx` opcional -- pasado por QuickQuestionService dentro de la
   * transacción bloqueada por sesión.
   *
   * AR-2B / RQ-01 -- ELEGIBILIDAD AUTOCONTENIDA. La QA física de la release
   * encontró Preguntas rápidas cuyo enunciado dice "según la fuente / el
   * texto / el gráfico" pero sin estímulo visible: el DTO de `/next` sólo
   * entrega `stemContent` + `answerOptions`, nunca un pasaje. Antes esta
   * selección aceptaba CUALQUIER `question_version` PUBLISHED, incluidas las
   * que el importador de Ensayos crea para Comprensión Lectora / ítems con
   * fuente, vinculadas a un `exam_question` con `passage_id` (el estímulo
   * vive en `exam_passage`, sólo servido por el flujo de Ensayos).
   *
   * ALCANCE DELIBERADAMENTE MÍNIMO (verificado contra el contrato CONGELADO
   * de LEF-BLOCK-IV-DEFINITION.md, decisiones aprobadas por el Product Owner
   * sobre los "5 vacíos de §12.4"):
   *   - decisión #2: "preguntas ACTIVAS/elegibles (`editorialStatus = PUBLISHED`)"
   *     -> se añade `question.status = 'ACTIVE'` a la SELECCIÓN (antes sólo se
   *     comprobaba al responder). "activas" es palabra literal del contrato.
   *   - decisión #3: "Exclusión de preguntas de ensayos activos: NO APLICA
   *     **mientras el concepto de 'ensayo' no exista en el esquema**". Ese
   *     concepto YA existe (ADR-0024: `exam`/`exam_passage`/`exam_question`),
   *     así que la condición que dejaba la regla en `NO APLICA` caducó. Se
   *     implementa el CORTE MÍNIMO que resuelve el defecto observado: excluir
   *     las preguntas atadas a un `exam_question` con `passage_id` (las que el
   *     usuario ve "según la fuente" sin fuente).
   * NO se añade filtro por materia/dificultad NI por forma del `curriculum_topic`
   * (el contrato congelado decía "cualquier pregunta `PUBLISHED` de cualquier
   * tema es elegible" y rechazaba filtros de selección más ricos). Ese
   * congelamiento fue SUPERADO explícitamente por vc3 (F03, Quick Subject
   * Selector) SOLO para el camino CON selección de materias -- ver
   * `findRandomEligibleForSubject` (aditiva). Este método (`findRandomEligible`,
   * sin filtro) permanece INTACTO y sigue siendo el camino usado cuando el
   * cliente no envía `subjectKeys` (vc2 / sin selección, backward compatible).
   * No se edita ni un solo enunciado; no hay migración ni flag nuevo.
   */
  async findRandomEligible(excludeQuestionVersionIds: string[], tx?: Prisma.TransactionClient): Promise<QuestionVersionWithAnswerOptions | null> {
    const client = tx ?? this.prisma;
    // Prisma Client no expone ORDER BY random() de forma portable -- SQL
    // crudo SOLO para elegir el id (evita el mapeo manual snake_case ->
    // camelCase que $queryRaw exigiría sobre la fila completa); la fila real
    // se recupera después con el mismo cliente vía Prisma normal (incluye
    // answerOptions -- mismo shape que findByIdWithAnswerOptions, evita una
    // segunda consulta en el llamador). Sin problema de rendimiento
    // conocido con el volumen actual del catálogo.
    const rows = await client.$queryRaw<{ id: string }[]>`
      SELECT qv."id"
      FROM "question_version" qv
      JOIN "question" q ON q."id" = qv."question_id"
      WHERE qv."editorial_status" = 'PUBLISHED'
        AND q."status" = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1 FROM "exam_question" eq
          WHERE eq."question_version_id" = qv."id"
            AND eq."passage_id" IS NOT NULL
        )
        AND qv."id" != ALL(${excludeQuestionVersionIds}::uuid[])
      ORDER BY random()
      LIMIT 1
    `;
    const chosenId = rows[0]?.id;
    if (!chosenId) return null;
    return client.questionVersion.findUnique({
      where: { id: chosenId },
      include: { answerOptions: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  /**
   * vc3 (F03, Quick Subject Selector) -- MISMO predicado de elegibilidad
   * EXACTO que `findRandomEligible` (PUBLISHED + ACTIVE + sin exam_question
   * de Comprensión Lectora sin estímulo), con UN filtro adicional:
   * `Question.primarySubjectId`. ADITIVA -- `findRandomEligible` queda
   * intacta para el camino sin filtro (vc2 / sin selección). Duplicación
   * deliberada y mínima (mismo criterio que `findRandomPracticeQuestionForSubject`
   * frente a `findRandomEligible`): unir por `primarySubjectId` directo
   * -- SIN el requisito de "recurso canónico" (`parent_id`/`learning_resource_version`
   * PUBLISHED) que sí exige Práctica libre, porque el pool de Pregunta
   * rápida nunca tuvo esa restricción y F03 no la introduce.
   */
  async findRandomEligibleForSubject(
    subjectId: string,
    excludeQuestionVersionIds: string[],
    tx?: Prisma.TransactionClient,
  ): Promise<QuestionVersionWithAnswerOptions | null> {
    const client = tx ?? this.prisma;
    const rows = await client.$queryRaw<{ id: string }[]>`
      SELECT qv."id"
      FROM "question_version" qv
      JOIN "question" q ON q."id" = qv."question_id"
      WHERE qv."editorial_status" = 'PUBLISHED'
        AND q."status" = 'ACTIVE'
        AND q."primary_subject_id" = ${subjectId}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM "exam_question" eq
          WHERE eq."question_version_id" = qv."id"
            AND eq."passage_id" IS NOT NULL
        )
        AND qv."id" != ALL(${excludeQuestionVersionIds}::uuid[])
      ORDER BY random()
      LIMIT 1
    `;
    const chosenId = rows[0]?.id;
    if (!chosenId) return null;
    return client.questionVersion.findUnique({
      where: { id: chosenId },
      include: { answerOptions: { orderBy: { displayOrder: 'asc' } } },
    });
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- selección aleatoria server-side de UNA
   * pregunta elegible de una MATERIA para el modo Práctica libre. ADITIVO:
   * NO altera `findRandomEligible` (global, de Pregunta rápida), que
   * conserva exactamente su comportamiento.
   *
   * "Elegible" = mismo pool CANÓNICO que Study / PROFILE-01:
   *   - `question_version.editorial_status = 'PUBLISHED'`;
   *   - `question.status = 'ACTIVE'` (una pregunta retirada nunca se sirve);
   *   - su `curriculum_topic` es un RECURSO canónico: `parent_id IS NOT NULL`
   *     (nunca una unidad raíz ni un topic raíz legacy del seed) con al
   *     menos una `learning_resource_version` PUBLISHED;
   *   - ese recurso pertenece a la materia pedida (`subject_id`);
   *   - `id` no está en `excludeQuestionVersionIds` (las ya vistas en la
   *     ejecución actual del cliente).
   * Quedan fuera por construcción: otras materias, topics legacy, fixtures/
   * zztest (sus recursos no tienen `learning_resource_version` PUBLISHED en
   * el catálogo real), versiones no publicadas, preguntas retiradas.
   *
   * `ORDER BY random()` -- mismo criterio y volumen (~980 preguntas/materia
   * máx. 330) que `findRandomEligible`; sin seed, sin ponderación.
   */
  async findRandomPracticeQuestionForSubject(
    subjectId: string,
    excludeQuestionVersionIds: string[],
  ): Promise<QuestionVersionWithDetails | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT qv."id"
      FROM "question_version" qv
      JOIN "curriculum_topic" resource ON resource."id" = qv."curriculum_topic_id"
      JOIN "question" q ON q."id" = qv."question_id"
      WHERE qv."editorial_status" = 'PUBLISHED'
        AND q."status" = 'ACTIVE'
        AND resource."parent_id" IS NOT NULL
        AND resource."subject_id" = ${subjectId}::uuid
        AND EXISTS (
          SELECT 1 FROM "learning_resource_version" lrv
          WHERE lrv."curriculum_topic_id" = resource."id"
            AND lrv."editorial_status" = 'PUBLISHED'
        )
        AND qv."id" != ALL(${excludeQuestionVersionIds}::uuid[])
      ORDER BY random()
      LIMIT 1
    `;
    const chosenId = rows[0]?.id;
    if (!chosenId) return null;
    return this.findEligiblePracticeQuestionById(chosenId, subjectId);
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- recupera UNA pregunta por id SOLO si
   * cumple exactamente el mismo predicado de elegibilidad canónica que
   * `findRandomPracticeQuestionForSubject` para `subjectId`. Devuelve `null`
   * si no es elegible (materia distinta, no publicada, no canónica,
   * retirada). Usado por el endpoint `.../answer` para validar la pregunta
   * antes de determinar la corrección, y para hidratar la pregunta ya
   * elegida al azar (incluye `question` + `answerOptions`, mismo shape que
   * `findPublishedByTopicId`).
   */
  async findEligiblePracticeQuestionById(
    questionVersionId: string,
    subjectId: string,
  ): Promise<QuestionVersionWithDetails | null> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT qv."id"
      FROM "question_version" qv
      JOIN "curriculum_topic" resource ON resource."id" = qv."curriculum_topic_id"
      JOIN "question" q ON q."id" = qv."question_id"
      WHERE qv."id" = ${questionVersionId}::uuid
        AND qv."editorial_status" = 'PUBLISHED'
        AND q."status" = 'ACTIVE'
        AND resource."parent_id" IS NOT NULL
        AND resource."subject_id" = ${subjectId}::uuid
        AND EXISTS (
          SELECT 1 FROM "learning_resource_version" lrv
          WHERE lrv."curriculum_topic_id" = resource."id"
            AND lrv."editorial_status" = 'PUBLISHED'
        )
      LIMIT 1
    `;
    if (!rows[0]?.id) return null;
    return this.prisma.questionVersion.findUnique({
      where: { id: questionVersionId },
      include: {
        question: { select: { id: true, questionKey: true, questionType: true } },
        answerOptions: { orderBy: { displayOrder: 'asc' } },
      },
    });
  }
}
