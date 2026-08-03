import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  topicProgressResponseSchema,
  submitResponseResponseSchema,
  GAMIFICATION_SCHEMA_VERSION,
  type TopicProgressResponse,
  type SubmitResponseResponse,
} from '@axioma/contracts';
import { Prisma } from '../generated/prisma/client';
import type { StudentResponse } from '../generated/prisma/client';
import { CurriculumTopicProgressRepository } from './curriculum-topic-progress.repository';
import { StudentResponseRepository } from './student-response.repository';
import { CurriculumTopicRepository } from '../education/curriculum-topic.repository';
import { QuestionVersionRepository } from '../education/question-version.repository';
import { AnswerOptionRepository } from '../education/answer-option.repository';
import { OutboxService } from '../platform/outbox/outbox.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Conflicto real (ADR-0014, punto 4): un segundo envío con una alternativa
 * DISTINTA a la ya registrada. No es una `HttpException` -- el controlador
 * la captura explícitamente para construir el cuerpo 409 con
 * `existingResponse`, sin depender del filtro global (que no expone campos
 * fuera de `{code, message, issues}`, ver ADR-0007).
 */
export class ResponseConflictError extends Error {
  constructor(public readonly existingResponse: StudentResponse) {
    super('La alternativa enviada difiere de la respuesta ya registrada para esta pregunta.');
  }
}

export interface SubmitResponseInput {
  questionVersionId: string;
  answerOptionId: string;
  operationId: string;
}

/**
 * Servicio del dominio PROGRESS (Bloque III) -- ver ADR-0014. Lee EDUCATION
 * (nunca escribe); es la única autoridad sobre `isCorrect`, `respondedAt` y
 * el estado de `CurriculumTopicProgress` -- ninguno de los tres se acepta
 * jamás del cliente.
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly topicProgressRepo: CurriculumTopicProgressRepository,
    private readonly responseRepo: StudentResponseRepository,
    private readonly topicRepo: CurriculumTopicRepository,
    private readonly questionVersionRepo: QuestionVersionRepository,
    private readonly answerOptionRepo: AnswerOptionRepository,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * `404` si el tema no existe; `200` con `NOT_STARTED` si existe pero la
   * cuenta no tiene progreso todavía -- son estados de naturaleza distinta,
   * nunca se confunden (ver ADR-0014, precisión 1).
   */
  async getTopicProgress(accountId: string, topicId: string): Promise<TopicProgressResponse> {
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) throw new NotFoundException('Tema no encontrado.');

    const [progress, responses] = await Promise.all([
      this.topicProgressRepo.findByAccountAndTopic(accountId, topicId),
      this.responseRepo.listByAccountAndTopic(accountId, topicId),
    ]);

    return topicProgressResponseSchema.parse({
      curriculumTopicId: topicId,
      status: progress?.status ?? 'NOT_STARTED',
      startedAt: progress?.startedAt.toISOString() ?? null,
      lastActivityAt: progress?.lastActivityAt.toISOString() ?? null,
      completedAt: progress?.completedAt?.toISOString() ?? null,
      responses: responses.map((r) => ({
        questionVersionId: r.questionVersionId,
        answerOptionId: r.answerOptionId,
        isCorrect: r.isCorrect,
        respondedAt: r.respondedAt.toISOString(),
      })),
    });
  }

  async submitResponse(
    accountId: string,
    topicId: string,
    input: SubmitResponseInput,
  ): Promise<{ data: SubmitResponseResponse; created: boolean }> {
    // 1. Replay exacto por operationId -- idempotencia de transporte (ver ADR-0014, punto 4).
    const byOperation = await this.responseRepo.findByOperationId(input.operationId);
    if (byOperation) {
      const status = await this.currentTopicStatus(accountId, topicId);
      return { data: this.toSubmitResponse(byOperation, status), created: false };
    }

    // Validaciones de servidor (ADR-0014, punto 7).
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) throw new NotFoundException('Tema no encontrado.');

    const questionVersion = await this.questionVersionRepo.findByIdWithQuestionStatus(input.questionVersionId);
    if (!questionVersion) throw new NotFoundException('Pregunta no encontrada.');
    if (questionVersion.editorialStatus !== 'PUBLISHED') {
      throw new BadRequestException('La pregunta no está publicada.');
    }
    if (questionVersion.question.status !== 'ACTIVE') {
      throw new BadRequestException('La pregunta fue retirada.');
    }
    if (questionVersion.curriculumTopicId !== topicId) {
      throw new BadRequestException('La pregunta no pertenece a este tema.');
    }

    const answerOption = await this.answerOptionRepo.findById(input.answerOptionId);
    if (!answerOption || answerOption.questionVersionId !== input.questionVersionId) {
      throw new BadRequestException('La alternativa no pertenece a esta pregunta.');
    }

    // 2. Invariante de negocio real: (accountId, questionVersionId).
    const existing = await this.responseRepo.findByAccountAndQuestionVersion(accountId, input.questionVersionId);
    if (existing) {
      return { data: await this.resolveAgainstExisting(existing, input.answerOptionId, accountId, topicId), created: false };
    }

    try {
      const created = await this.responseRepo.create({
        accountId,
        questionVersionId: input.questionVersionId,
        answerOptionId: input.answerOptionId,
        isCorrect: answerOption.isCorrect,
        operationId: input.operationId,
      });
      const { status, justCompleted, completedAt } = await this.recordActivityAndMaybeComplete(accountId, topicId);

      // Publicación best-effort al Outbox de plataforma -- ver
      // docs/adr/0016-gamificacion-fundacion.md. SOLO en este camino: se
      // acaba de crear un StudentResponse real, nunca en replay,
      // idempotencia de negocio o conflicto (esos caminos no crean ningún
      // hecho académico nuevo). `studentResponseId` es la base de la
      // deduplicación de negocio en GAMIFICATION -- ver el mismo ADR.
      await this.outbox.publish({
        eventKey: 'student_response_recorded',
        schemaVersion: GAMIFICATION_SCHEMA_VERSION,
        sourceDomain: 'PROGRESS',
        aggregateId: accountId,
        occurredAt: created.respondedAt,
        payload: {
          accountId,
          studentResponseId: created.id,
          questionVersionId: created.questionVersionId,
          curriculumTopicId: topicId,
          isCorrect: created.isCorrect,
          respondedAt: created.respondedAt.toISOString(),
        },
      });

      // SOLO cuando ESTA llamada es la que transiciona a COMPLETED por
      // primera vez -- nunca en llamadas posteriores mientras el tema ya
      // estaba COMPLETED (evita republicar el mismo hecho en cada
      // respuesta subsiguiente a una unidad ya completada).
      if (justCompleted && completedAt) {
        await this.outbox.publish({
          eventKey: 'curriculum_topic_completed',
          schemaVersion: GAMIFICATION_SCHEMA_VERSION,
          sourceDomain: 'PROGRESS',
          aggregateId: accountId,
          occurredAt: completedAt,
          payload: {
            accountId,
            curriculumTopicId: topicId,
            completedAt: completedAt.toISOString(),
          },
        });
      }

      return { data: this.toSubmitResponse(created, status), created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        // Ganador de la carrera de concurrencia -- re-consultar y aplicar la misma lógica de idempotencia/conflicto. Nunca un 500.
        const winner =
          (await this.responseRepo.findByOperationId(input.operationId)) ??
          (await this.responseRepo.findByAccountAndQuestionVersion(accountId, input.questionVersionId));
        if (winner) {
          return { data: await this.resolveAgainstExisting(winner, input.answerOptionId, accountId, topicId), created: false };
        }
      }
      throw error;
    }
  }

  private async resolveAgainstExisting(
    existing: StudentResponse,
    submittedAnswerOptionId: string,
    accountId: string,
    topicId: string,
  ): Promise<SubmitResponseResponse> {
    if (existing.answerOptionId !== submittedAnswerOptionId) {
      throw new ResponseConflictError(existing);
    }
    const status = await this.currentTopicStatus(accountId, topicId);
    return this.toSubmitResponse(existing, status);
  }

  private async currentTopicStatus(accountId: string, topicId: string): Promise<'IN_PROGRESS' | 'COMPLETED'> {
    const progress = await this.topicProgressRepo.findByAccountAndTopic(accountId, topicId);
    return (progress?.status ?? 'IN_PROGRESS') as 'IN_PROGRESS' | 'COMPLETED';
  }

  /**
   * Transición estrictamente hacia adelante (ADR-0014, punto 6) -- solo
   * puede pasar de IN_PROGRESS a COMPLETED, nunca al revés (reforzado además
   * por el trigger `enforce_curriculum_topic_progress_monotonic`).
   */
  private async recordActivityAndMaybeComplete(
    accountId: string,
    topicId: string,
  ): Promise<{ status: 'IN_PROGRESS' | 'COMPLETED'; justCompleted: boolean; completedAt: Date | null }> {
    const progress = await this.topicProgressRepo.createIfMissing(accountId, topicId);
    const wasAlreadyCompleted = progress.status === 'COMPLETED';
    const [totalPublished, answeredCount] = await Promise.all([
      this.questionVersionRepo.countPublishedByTopicId(topicId),
      this.responseRepo.countDistinctByAccountAndTopic(accountId, topicId),
    ]);

    const shouldComplete = totalPublished > 0 && answeredCount >= totalPublished;
    const nextStatus: 'IN_PROGRESS' | 'COMPLETED' =
      progress.status === 'COMPLETED' ? 'COMPLETED' : shouldComplete ? 'COMPLETED' : 'IN_PROGRESS';
    const completedAt = nextStatus === 'COMPLETED' ? (progress.completedAt ?? new Date()) : null;

    const updated = await this.topicProgressRepo.touchActivity(progress.id, nextStatus, completedAt);
    const justCompleted = !wasAlreadyCompleted && updated.status === 'COMPLETED';
    return { status: updated.status, justCompleted, completedAt: updated.completedAt };
  }

  private toSubmitResponse(response: StudentResponse, topicStatus: 'IN_PROGRESS' | 'COMPLETED'): SubmitResponseResponse {
    return submitResponseResponseSchema.parse({
      questionVersionId: response.questionVersionId,
      answerOptionId: response.answerOptionId,
      isCorrect: response.isCorrect,
      respondedAt: response.respondedAt.toISOString(),
      topicStatus,
    });
  }

  /**
   * Llamado por PrivacyService durante el cierre definitivo (ADR-0014, punto
   * 2). `StudentResponse` primero (no depende de `CurriculumTopicProgress`,
   * pero el orden deja la base más ordenada durante la transacción lógica).
   * Ambos `deleteMany` -- nunca lanzan si no hay filas, seguro ante reintentos.
   */
  async deleteProgressForAccountClosure(accountId: string): Promise<void> {
    await this.responseRepo.deleteByAccountId(accountId);
    await this.topicProgressRepo.deleteByAccountId(accountId);
  }
}
