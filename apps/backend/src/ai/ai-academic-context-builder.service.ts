import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { resourceContentBlocksSchema, explanationContentSchema, answerOptionContentSchema } from '@axioma/contracts';
import { CurriculumTopicRepository } from '../education/curriculum-topic.repository';
import { SubjectRepository } from '../education/subject.repository';
import { QuestionVersionRepository } from '../education/question-version.repository';
import { StudentResponseRepository } from '../progress/student-response.repository';
import { CurriculumTopicProgressRepository } from '../progress/curriculum-topic-progress.repository';
import type { AiAcademicContext } from './ai-provider';

/** Resuelto UNA vez, al crear la conversación -- ver AiConversationService.createConversation. */
export interface ResolvedAcademicContextRef {
  contextQuestionVersionId: string | null;
  contextCurriculumTopicId: string | null;
}

/** Referencia mínima/autorizada que el cliente puede enviar -- NUNCA texto/materia/progreso libre (ver contrato `createAiConversationRequestSchema`). */
export interface AcademicContextRefInput {
  questionVersionId?: string;
  curriculumTopicId?: string;
}

type PlainBlock = { type: string; text?: string; latex?: string };

function blockToPlainText(block: PlainBlock): string {
  if (block.type === 'paragraph' || block.type === 'heading') return block.text ?? '';
  if (block.type === 'formula') return block.latex ? `[fórmula: ${block.latex}]` : '';
  if (block.type === 'image') return '[imagen]'; // nunca objectKey/URL hacia el proveedor.
  return '';
}

/** `stemContent`/`explanationContent` -- SIEMPRE un ARRAY de bloques (ver `resourceContentBlocksSchema`/`explanationContentSchema`). */
function blocksToPlainText(schema: { parse: (v: unknown) => unknown }, raw: unknown): string {
  const blocks = schema.parse(raw) as PlainBlock[];
  return blocks
    .map(blockToPlainText)
    .filter((text) => text.length > 0)
    .join(' ');
}

/** Contenido de una alternativa -- UN SOLO bloque, nunca un array (ver `answerOptionContentSchema`, "un solo bloque, texto o fórmula"). */
function singleBlockToPlainText(schema: { parse: (v: unknown) => unknown }, raw: unknown): string {
  return blockToPlainText(schema.parse(raw) as PlainBlock);
}

/**
 * FRONTERA ÚNICA de contexto académico -- LEF Bloque VI, Incremento 4 (ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §24). Ni `AiProvider` ni
 * `AiConversationService` consultan PROGRESS/EDUCATION directamente para
 * construir el paquete que ve el Tutor -- este servicio es el ÚNICO punto
 * autorizado. Dos responsabilidades separadas:
 *
 * 1. `resolveContextRef` (fase ADMISIÓN, al crear la conversación): valida
 *    que la referencia enviada por el cliente sea real y esté disponible
 *    (tema existente, pregunta publicada y de identidad ACTIVA) -- el
 *    cliente SOLO puede enviar un `questionVersionId`/`curriculumTopicId`
 *    (whitelisting estricto, ver contrato); nunca texto de materia/progreso
 *    libre fingiendo ser canónico. Lanza `NotFoundException`/
 *    `BadRequestException` ante una referencia inválida -- ANTES de crear
 *    la conversación, nunca se llega a invocar al proveedor.
 * 2. `buildContextPackage` (fase GENERACIÓN, en cada llamada al proveedor):
 *    re-resuelve los datos EN VIVO desde la referencia ya guardada en
 *    `AiConversation` y produce la representación NEUTRAL (`AiAcademicContext`)
 *    que consume `AiProvider` -- nunca una entidad Prisma.
 *
 * MINIMIZACIÓN ESTRICTA (decisión G/P): nunca incluye
 * displayName/email/timezone/username/ranking/historial competitivo/
 * cosméticos/insignias/perfil completo -- ninguno de esos campos EXISTE
 * siquiera en las fuentes que este servicio consulta (Subject/CurriculumTopic/
 * QuestionVersion/AnswerOption/StudentResponse/CurriculumTopicProgress), así
 * que la exclusión es estructural, no una lista de bloqueo que pueda olvidarse.
 *
 * HALLAZGO DE AUDITORÍA (documentado en el reporte de cierre del Incremento
 * 4): `EducationService.listPublishedQuestions` expone `explanationContent`
 * de forma INCONDICIONAL (sin gating por respuesta del estudiante) -- este
 * builder NUNCA reutiliza ese camino. La alternativa correcta
 * (`AnswerOption.isCorrect`) y la explicación validada
 * (`QuestionVersion.explanationContent`) se incluyen ÚNICAMENTE cuando existe
 * un `StudentResponse` real de ESTA cuenta para ESTA `questionVersionId` --
 * la misma condición que exige `docs/adr/LEF-BLOCK-VI-DEFINITION.md §24`
 * ("pregunta ya respondida"). Es además la precondición determinista sobre la
 * que el Incremento 6 construye el bloqueo de actividades protegidas, sin
 * rediseñar esta frontera.
 */
@Injectable()
export class AiAcademicContextBuilder {
  constructor(
    private readonly topicRepo: CurriculumTopicRepository,
    private readonly subjectRepo: SubjectRepository,
    private readonly questionVersionRepo: QuestionVersionRepository,
    private readonly studentResponseRepo: StudentResponseRepository,
    private readonly topicProgressRepo: CurriculumTopicProgressRepository,
  ) {}

  /** Fase admisión -- ver docstring de la clase. Nunca llama al proveedor; corre ANTES de crear la conversación. */
  async resolveContextRef(ref: AcademicContextRefInput): Promise<ResolvedAcademicContextRef> {
    if (ref.questionVersionId && ref.curriculumTopicId) {
      throw new BadRequestException('Especifica como máximo un contexto académico (pregunta O tema, nunca ambos).');
    }
    if (ref.questionVersionId) {
      const version = await this.questionVersionRepo.findByIdWithQuestionStatus(ref.questionVersionId);
      if (!version || version.editorialStatus !== 'PUBLISHED' || version.question.status !== 'ACTIVE') {
        throw new NotFoundException('La pregunta de contexto no existe o no está disponible.');
      }
      return { contextQuestionVersionId: version.id, contextCurriculumTopicId: null };
    }
    if (ref.curriculumTopicId) {
      const topic = await this.topicRepo.findById(ref.curriculumTopicId);
      if (!topic) throw new NotFoundException('El tema de contexto no existe.');
      return { contextQuestionVersionId: null, contextCurriculumTopicId: topic.id };
    }
    return { contextQuestionVersionId: null, contextCurriculumTopicId: null };
  }

  /**
   * Fase generación -- re-resuelve EN VIVO (nunca desde una copia
   * almacenada) y devuelve `null` cuando la conversación no tiene contexto
   * académico asociado (punto de entrada 1: pestaña dedicada).
   */
  async buildContextPackage(accountId: string, ref: ResolvedAcademicContextRef): Promise<AiAcademicContext | null> {
    if (ref.contextQuestionVersionId) {
      return this.buildFromQuestion(accountId, ref.contextQuestionVersionId);
    }
    if (ref.contextCurriculumTopicId) {
      return this.buildFromTopic(accountId, ref.contextCurriculumTopicId);
    }
    return null;
  }

  private async buildFromQuestion(accountId: string, questionVersionId: string): Promise<AiAcademicContext | null> {
    const version = await this.questionVersionRepo.findByIdWithQuestionStatus(questionVersionId);
    if (!version) return null; // referencia guardada pero el dato ya no está disponible -- degradación segura, nunca un error de generación.

    const topic = await this.topicRepo.findById(version.curriculumTopicId);
    if (!topic) return null;
    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) return null;

    const detail = await this.questionVersionRepo.findByIdWithAnswerOptions(questionVersionId);
    const options = detail?.answerOptions ?? [];

    const context: AiAcademicContext = {
      subjectName: subject.name,
      topicName: topic.name,
      question: {
        stemText: blocksToPlainText(resourceContentBlocksSchema, version.stemContent),
        options: options.map((option) => singleBlockToPlainText(answerOptionContentSchema, option.content)),
      },
    };

    // Gating estricto -- ver docstring de la clase ("hallazgo de auditoría").
    const studentResponse = await this.studentResponseRepo.findByAccountAndQuestionVersion(accountId, questionVersionId);
    if (studentResponse) {
      const chosenOption = options.find((option) => option.id === studentResponse.answerOptionId);
      context.question!.studentAnswer = {
        chosenOptionText: chosenOption ? singleBlockToPlainText(answerOptionContentSchema, chosenOption.content) : '(alternativa no disponible)',
        isCorrect: studentResponse.isCorrect,
        explanationText: blocksToPlainText(explanationContentSchema, version.explanationContent),
      };
    }

    const progress = await this.topicProgressRepo.findByAccountAndTopic(accountId, topic.id);
    if (progress) context.topicProgressStatus = progress.status;

    return context;
  }

  private async buildFromTopic(accountId: string, curriculumTopicId: string): Promise<AiAcademicContext | null> {
    const topic = await this.topicRepo.findById(curriculumTopicId);
    if (!topic) return null;
    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) return null;

    const context: AiAcademicContext = { subjectName: subject.name, topicName: topic.name };
    const progress = await this.topicProgressRepo.findByAccountAndTopic(accountId, topic.id);
    if (progress) context.topicProgressStatus = progress.status;
    return context;
  }
}
