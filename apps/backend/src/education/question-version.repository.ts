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
      SELECT "id" FROM "question_version"
      WHERE "editorial_status" = 'PUBLISHED'
        AND "id" != ALL(${excludeQuestionVersionIds}::uuid[])
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
}
