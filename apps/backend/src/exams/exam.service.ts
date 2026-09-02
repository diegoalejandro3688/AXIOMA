import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AnswerOptionRepository } from '../education/answer-option.repository';
import { EntitlementService } from '../entitlement/entitlement.service';
import { Prisma } from '../generated/prisma/client';
import type { AnswerOption, Exam, ExamAttempt, ExamPassage } from '../generated/prisma/client';
import { PREMIUM_REQUIRED_CODE, type ExamAttemptScore } from '@axioma/contracts';
import { ExamRepository } from './exam.repository';
import { ExamQuestionRepository, type ExamQuestionWithVersion } from './exam-question.repository';
import { ExamPassageRepository } from './exam-passage.repository';
import { ExamAttemptRepository } from './exam-attempt.repository';
import { ExamAttemptAnswerRepository } from './exam-attempt-answer.repository';
import { ExamScoringService } from './exam-scoring.service';

/**
 * Motor del dominio EXAMS / Ensayos V1 (ENSAYOS-F1, ADR-0024).
 *
 * Aislamiento CRÍTICO (ADR-0024 §isolation): reutiliza `AnswerOptionRepository`
 * de EDUCATION SOLO para resolver `isCorrect` server-side -- nunca escribe en
 * `student_response`/`curriculum_topic_progress`, nunca publica al outbox,
 * nunca otorga XP/LP. Un intento de ensayo completo no muta nada fuera de las
 * cuatro tablas propias (`exam`/`exam_question`/`exam_attempt`/
 * `exam_attempt_answer`).
 *
 * Advisory lock namespace 24 (distinto de 19-23 ya en uso). Dos claves:
 * `exam-start:{accountId}:{examId}` serializa el inicio idempotente de intento;
 * `exam-attempt:{attemptId}` serializa toda lectura/mutación de un intento ya
 * existente (relectura, decisión y escritura en la misma transacción -- mismo
 * criterio que `QuickQuestionService`).
 *
 * Reloj server-authoritative: `expiresAt` se PERSISTE al iniciar
 * (`startedAt + durationSeconds`), nunca se deriva en lectura. Expiración por
 * transición PEREZOSA: cualquier lectura/mutación que encuentre
 * `now >= expiresAt` en un intento `ACTIVE` lo transiciona a `EXPIRED` antes de
 * continuar (sin cron, sin job de fondo). Sin pausa en V1.
 */
const EXAM_LOCK_NAMESPACE = 24;
const TX_OPTIONS = { timeout: 30_000, maxWait: 30_000 } as const;

/**
 * ENSAYOS-F2 -- forma canónica de un valor JSON para comparar contenido de
 * pasajes con independencia del orden de claves de objeto. El orden de los
 * arrays SÍ es significativo (los bloques y las filas de tabla son ordenados).
 */
function canonicalizeJson(value: unknown): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === 'object') {
      return Object.keys(v as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = normalize((v as Record<string, unknown>)[k]);
          return acc;
        }, {});
    }
    return v;
  };
  return JSON.stringify(normalize(value));
}

export type ExamAttemptQuestionView = {
  questionVersionId: string;
  displayOrder: number;
  stemContent: Prisma.JsonValue;
  answerOptions: AnswerOption[];
  selectedAnswerOptionId: string | null;
  /** ENSAYOS-F2 -- `id` del `ExamPassage` que acompaña a esta pregunta, o `null`. */
  passageId: string | null;
};

export type ExamAttemptReviewQuestionView = ExamAttemptQuestionView & {
  correctAnswerOptionId: string;
  isCorrect: boolean;
  explanationContent: Prisma.JsonValue;
};

/**
 * PREMIUM V1 (C1.2) -- resultado interno de la transaccion de `startAttempt`.
 * El `403 PREMIUM_REQUIRED` NUNCA se lanza dentro de la `$transaction`: eso
 * haria rollback del `markExpired` de un intento vencido. La transaccion
 * devuelve este sentinel y el 403 se lanza DESPUES del commit.
 */
type StartAttemptOutcome = { kind: 'ATTEMPT'; attempt: ExamAttempt } | { kind: 'PREMIUM_REQUIRED' };

export type ExamListItemView = { exam: Exam; questionCount: number };
export type ExamAttemptResultView = { attempt: ExamAttempt; score: ExamAttemptScore };
export type ExamAttemptQuestionsView = { attempt: ExamAttempt; passages: ExamPassage[]; questions: ExamAttemptQuestionView[] };
export type ExamAttemptReviewView = {
  attempt: ExamAttempt;
  score: ExamAttemptScore;
  passages: ExamPassage[];
  questions: ExamAttemptReviewQuestionView[];
};

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly examRepo: ExamRepository,
    private readonly examQuestionRepo: ExamQuestionRepository,
    private readonly examPassageRepo: ExamPassageRepository,
    private readonly attemptRepo: ExamAttemptRepository,
    private readonly answerRepo: ExamAttemptAnswerRepository,
    private readonly answerOptionRepo: AnswerOptionRepository,
    private readonly scoring: ExamScoringService,
    private readonly entitlementService: EntitlementService,
  ) {}

  // --- Lectura de catálogo ---

  async listPublishedExams(): Promise<ExamListItemView[]> {
    const exams = await this.examRepo.listPublished();
    return Promise.all(
      exams.map(async (exam) => ({ exam, questionCount: await this.examQuestionRepo.countByExamId(exam.id) })),
    );
  }

  async getPublishedExam(examId: string): Promise<ExamListItemView> {
    const exam = await this.examRepo.findById(examId);
    // Un ensayo no publicado produce el MISMO 404 que uno inexistente -- nunca filtra su existencia.
    if (!exam || exam.status !== 'PUBLISHED') {
      throw new NotFoundException('Este ensayo no existe o no está disponible.');
    }
    return { exam, questionCount: await this.examQuestionRepo.countByExamId(exam.id) };
  }

  // --- Intentos ---

  /**
   * Inicia un intento, o REANUDA el `ACTIVE` no expirado que ya exista para
   * `(cuenta, ensayo)` -- idempotente ante doble toque / reintento de red. Si
   * el intento previo expiró, lo transiciona a `EXPIRED` y crea uno nuevo.
   *
   * PREMIUM V1 (C1.2): CREAR un intento nuevo exige tier `PREMIUM`. REANUDAR
   * un `ACTIVE` vigente NO lo exige -- una cuenta que perdió Premium con un
   * ensayo en curso puede terminarlo. El `403 PREMIUM_REQUIRED` se lanza
   * DESPUÉS del commit (ver `StartAttemptOutcome`): así, si el intento previo
   * había vencido, su transición a `EXPIRED` queda persistida igualmente.
   */
  async startAttempt(accountId: string, examId: string): Promise<ExamAttempt> {
    // Camino rápido sin lock -- valida disponibilidad antes de serializar nada.
    await this.getPublishedExam(examId);

    const outcome = await this.prisma.$transaction(async (tx): Promise<StartAttemptOutcome> => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${EXAM_LOCK_NAMESPACE}, hashtext(${'exam-start:' + accountId + ':' + examId}))`;

      const exam = await this.examRepo.findById(examId, tx);
      if (!exam || exam.status !== 'PUBLISHED') {
        throw new ConflictException('Este ensayo ya no está disponible.');
      }

      const existing = await this.attemptRepo.findActiveByAccountAndExam(accountId, examId, tx);
      if (existing) {
        if (Date.now() < existing.expiresAt.getTime()) {
          return { kind: 'ATTEMPT', attempt: existing }; // reanuda -- FREE o PREMIUM, sin gate
        }
        await this.attemptRepo.markExpired(existing.id, tx);
      }

      // Gate de creación. NO se lanza aquí: un `throw` haría rollback del
      // `markExpired` de arriba. Se devuelve el sentinel y el 403 se lanza
      // tras el commit.
      const { tier } = await this.entitlementService.getEntitlement(accountId);
      if (tier === 'FREE') {
        return { kind: 'PREMIUM_REQUIRED' };
      }

      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + exam.durationSeconds * 1000);
      return { kind: 'ATTEMPT', attempt: await this.attemptRepo.create({ accountId, examId, startedAt, expiresAt }, tx) };
    }, TX_OPTIONS);

    if (outcome.kind === 'PREMIUM_REQUIRED') {
      throw new ForbiddenException({
        code: PREMIUM_REQUIRED_CODE,
        message: 'Los Ensayos PAES son parte de ZETRYND Premium.',
      });
    }
    return outcome.attempt;
  }

  /** Estado de un intento (con transición perezosa a EXPIRED si corresponde). */
  async getAttemptState(accountId: string, attemptId: string): Promise<ExamAttempt> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);
      const attempt = await this.loadOwnedAttempt(tx, accountId, attemptId);
      return this.refreshExpiry(tx, attempt);
    }, TX_OPTIONS);
  }

  /** Entrega ordenada de preguntas de un intento ACTIVE -- SIN pauta (§delivery). */
  async getAttemptQuestions(accountId: string, attemptId: string): Promise<ExamAttemptQuestionsView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);
      const attempt = await this.refreshExpiry(tx, await this.loadOwnedAttempt(tx, accountId, attemptId));
      if (attempt.status !== 'ACTIVE') {
        throw new ConflictException('Este intento ya finalizó -- usa la revisión para ver tus respuestas.');
      }

      const links = await this.examQuestionRepo.findByExamIdOrdered(attempt.examId, tx);
      const passages = await this.examPassageRepo.findByExamIdOrdered(attempt.examId, tx);
      const answers = await this.answerRepo.findByAttemptId(attemptId, tx);
      const selectedByQuestion = new Map(answers.map((a) => [a.questionVersionId, a.answerOptionId]));

      const questions = links.map((link) => this.toQuestionView(link, selectedByQuestion));
      return { attempt, passages, questions };
    }, TX_OPTIONS);
  }

  /**
   * Crea o CAMBIA la selección de una pregunta. Permitido solo mientras el
   * intento siga `ACTIVE` y no expirado. `operationId` -- idempotencia de
   * transporte: un reintento con el MISMO id es un no-op que devuelve el
   * estado vigente; un id distinto sobre la misma pregunta es un cambio
   * deliberado.
   */
  async upsertAnswer(
    accountId: string,
    attemptId: string,
    questionVersionId: string,
    answerOptionId: string,
    operationId: string,
  ): Promise<{ questionVersionId: string; selectedAnswerOptionId: string; attemptStatus: ExamAttempt['status'] }> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);

      // Replay ANTES de mirar el estado del intento -- mismo criterio que
      // QuickQuestionService.answer: un reintento de red debe seguir siendo un
      // replay exitoso.
      const replay = await this.answerRepo.findByOperationId(operationId, tx);
      if (replay) {
        if (replay.attemptId !== attemptId) {
          throw new BadRequestException('Este operationId ya fue usado en otro intento de ensayo.');
        }
        return {
          questionVersionId: replay.questionVersionId,
          selectedAnswerOptionId: replay.answerOptionId,
          attemptStatus: 'ACTIVE' as const,
        };
      }

      const attempt = await this.refreshExpiry(tx, await this.loadOwnedAttempt(tx, accountId, attemptId));
      if (attempt.status === 'EXPIRED') {
        throw new ConflictException('El tiempo de este ensayo se agotó -- ya no puedes responder.');
      }
      if (attempt.status !== 'ACTIVE') {
        throw new ConflictException('Este intento ya fue entregado -- sus respuestas son inmutables.');
      }

      const belongs = await this.examQuestionRepo.belongsToExam(attempt.examId, questionVersionId, tx);
      if (!belongs) {
        throw new BadRequestException('Esa pregunta no pertenece a este ensayo.');
      }

      const answerOption = await this.answerOptionRepo.findById(answerOptionId, tx);
      if (!answerOption || answerOption.questionVersionId !== questionVersionId) {
        throw new BadRequestException('La alternativa no pertenece a esa pregunta.');
      }

      const saved = await this.answerRepo.upsert(tx, {
        attemptId,
        accountId,
        questionVersionId,
        answerOptionId,
        isCorrect: answerOption.isCorrect,
        operationId,
      });
      return { questionVersionId, selectedAnswerOptionId: saved.answerOptionId, attemptStatus: 'ACTIVE' as const };
    }, TX_OPTIONS);
  }

  /**
   * Finalización explícita. `ACTIVE -> COMPLETED`. Idempotente: un intento ya
   * `COMPLETED` devuelve su resultado sin cambios. Un intento `EXPIRED` NO se
   * convierte falsamente en `COMPLETED` -- se devuelve su resultado con el
   * status real y el puntaje calculado con las respuestas existentes.
   */
  async submitAttempt(accountId: string, attemptId: string): Promise<ExamAttemptResultView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);
      let attempt = await this.refreshExpiry(tx, await this.loadOwnedAttempt(tx, accountId, attemptId));

      if (attempt.status === 'ACTIVE') {
        attempt = await this.attemptRepo.markCompleted(attemptId, new Date(), tx);
      }

      const score = await this.computeScore(tx, attempt);
      return { attempt, score };
    }, TX_OPTIONS);
  }

  async getResult(accountId: string, attemptId: string): Promise<ExamAttemptResultView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);
      const attempt = await this.refreshExpiry(tx, await this.loadOwnedAttempt(tx, accountId, attemptId));
      const score = await this.computeScore(tx, attempt);
      return { attempt, score };
    }, TX_OPTIONS);
  }

  /** Revisión completa -- SOLO tras COMPLETED/EXPIRED. Recién aquí se revelan alternativa correcta, `isCorrect` y explicación. */
  async getReview(accountId: string, attemptId: string): Promise<ExamAttemptReviewView> {
    return this.prisma.$transaction(async (tx) => {
      await this.lockAttempt(tx, attemptId);
      const attempt = await this.refreshExpiry(tx, await this.loadOwnedAttempt(tx, accountId, attemptId));
      if (attempt.status === 'ACTIVE') {
        throw new ConflictException('La revisión está disponible solo cuando el ensayo finaliza.');
      }

      const links = await this.examQuestionRepo.findByExamIdOrdered(attempt.examId, tx);
      const passages = await this.examPassageRepo.findByExamIdOrdered(attempt.examId, tx);
      const answers = await this.answerRepo.findByAttemptId(attemptId, tx);
      const selectedByQuestion = new Map(answers.map((a) => [a.questionVersionId, a.answerOptionId]));

      const questions: ExamAttemptReviewQuestionView[] = links.map((link) => {
        const base = this.toQuestionView(link, selectedByQuestion);
        const correct = link.questionVersion.answerOptions.find((o) => o.isCorrect);
        return {
          ...base,
          correctAnswerOptionId: correct?.id ?? link.questionVersion.answerOptions[0]?.id ?? '',
          isCorrect: base.selectedAnswerOptionId != null && base.selectedAnswerOptionId === correct?.id,
          explanationContent: link.questionVersion.explanationContent,
        };
      });

      const score = await this.computeScore(tx, attempt);
      return { attempt, score, passages, questions };
    }, TX_OPTIONS);
  }

  // --- Escritura de definición (ENSAYOS-M1-B: expuesta vía `/administration/exams`, delegada a este servicio) ---

  /**
   * Idempotente por `examKey`. Si el ensayo ya existe, sus atributos
   * estructurales (`title`/`subjectId`/`durationSeconds`) deben COINCIDIR --
   * una divergencia es 409, nunca una sobrescritura silenciosa (mismo criterio
   * que `EditorialTaxonomyService.resolveOrCreateSubject`).
   */
  async resolveOrCreateExam(input: {
    examKey: string;
    title: string;
    subjectId: string;
    durationSeconds: number;
  }): Promise<{ exam: Exam; created: boolean }> {
    const existing = await this.examRepo.findByKey(input.examKey);
    if (existing) {
      if (
        existing.title !== input.title ||
        existing.subjectId !== input.subjectId ||
        existing.durationSeconds !== input.durationSeconds
      ) {
        throw new ConflictException(
          `Ya existe un Exam con examKey "${input.examKey}" pero con atributos estructurales distintos -- no se sobrescribe.`,
        );
      }
      return { exam: existing, created: false };
    }
    return { exam: await this.examRepo.create(input), created: true };
  }

  /**
   * Idempotente por `(examId, questionVersionId)`. Un segundo link de la misma
   * pregunta con el MISMO `displayOrder` es NO-OP; con un `displayOrder`
   * distinto es 409. Un `displayOrder` ya ocupado por OTRA pregunta del mismo
   * ensayo es 409. El trigger `enforce_exam_question_version_published` es el
   * respaldo final (la versión debe estar PUBLISHED).
   */
  async linkQuestionIdempotent(input: {
    examId: string;
    questionVersionId: string;
    displayOrder: number;
    passageId?: string | null;
  }): Promise<{ link: Awaited<ReturnType<ExamQuestionRepository['link']>>; created: boolean }> {
    const exam = await this.examRepo.findById(input.examId);
    if (!exam) throw new NotFoundException('Ese ensayo no existe.');

    const passageId = input.passageId ?? null;
    if (passageId !== null) {
      // ENSAYOS-F2 -- el pasaje debe existir y pertenecer al MISMO ensayo
      // (el trigger `enforce_exam_question_passage_consistency` es el respaldo).
      const passage = await this.examPassageRepo.findById(passageId);
      if (!passage) throw new NotFoundException(`El texto ${passageId} no existe.`);
      if (passage.examId !== input.examId) {
        throw new ConflictException(`El texto ${passageId} pertenece a otro ensayo -- una pregunta no puede referenciar un texto ajeno.`);
      }
    }

    const byVersion = await this.examQuestionRepo.findByExamAndVersion(input.examId, input.questionVersionId);
    if (byVersion) {
      if (byVersion.displayOrder !== input.displayOrder) {
        throw new ConflictException(
          `La pregunta ${input.questionVersionId} ya está vinculada al ensayo en la posición ${byVersion.displayOrder}, no ${input.displayOrder}.`,
        );
      }
      if ((byVersion.passageId ?? null) !== passageId) {
        throw new ConflictException(
          `La pregunta ${input.questionVersionId} ya está vinculada con un texto distinto -- no se reasigna en silencio.`,
        );
      }
      return { link: byVersion, created: false };
    }
    const byOrder = await this.examQuestionRepo.findByExamAndOrder(input.examId, input.displayOrder);
    if (byOrder) {
      throw new ConflictException(`La posición ${input.displayOrder} del ensayo ya está ocupada por otra pregunta.`);
    }
    return { link: await this.examQuestionRepo.link({ ...input, passageId }), created: true };
  }

  /**
   * ENSAYOS-F2 -- resolver-o-crear un `ExamPassage` por `(examId, passageKey)`.
   * Idempotente: `passageKey` existente con `title` / `displayOrder` / contenido
   * canónico IDÉNTICOS -> NO-OP con el mismo `id`. Divergencia estructural -> 409,
   * nunca sobrescritura (mismo criterio que `resolveOrCreateExam`). Sobre un
   * ensayo ya PUBLISHED cualquier INSERT/UPDATE de pasaje lo rechaza el trigger
   * `enforce_exam_passage_frozen_after_publish` -- aquí no se intenta.
   */
  async resolveOrCreatePassage(input: {
    examId: string;
    passageKey: string;
    displayOrder: number;
    title: string;
    content: unknown;
  }): Promise<{ passage: ExamPassage; created: boolean }> {
    const exam = await this.examRepo.findById(input.examId);
    if (!exam) throw new NotFoundException('Ese ensayo no existe.');

    const existing = await this.examPassageRepo.findByExamAndKey(input.examId, input.passageKey);
    if (existing) {
      const structuralMismatch =
        existing.title !== input.title ||
        existing.displayOrder !== input.displayOrder ||
        canonicalizeJson(existing.content) !== canonicalizeJson(input.content);
      if (structuralMismatch) {
        throw new ConflictException(
          `Ya existe un texto con passageKey "${input.passageKey}" en este ensayo pero con contenido/atributos distintos -- no se sobrescribe.`,
        );
      }
      return { passage: existing, created: false };
    }

    const byOrder = await this.examPassageRepo.findByExamAndOrder(input.examId, input.displayOrder);
    if (byOrder) {
      throw new ConflictException(`La posición ${input.displayOrder} de textos de este ensayo ya está ocupada por otro texto.`);
    }

    const passage = await this.examPassageRepo.create({
      examId: input.examId,
      passageKey: input.passageKey,
      displayOrder: input.displayOrder,
      title: input.title,
      content: input.content as Prisma.InputJsonValue,
    });
    return { passage, created: true };
  }

  /** Idempotente. `DRAFT -> PUBLISHED`; `PUBLISHED` es NO-OP; `RETIRED` es 409. */
  async ensureExamPublished(examId: string): Promise<{ exam: Exam; alreadyPublished: boolean }> {
    const exam = await this.examRepo.findById(examId);
    if (!exam) throw new NotFoundException('Ese ensayo no existe.');
    if (exam.status === 'PUBLISHED') return { exam, alreadyPublished: true };
    if (exam.status === 'RETIRED') throw new ConflictException('Un ensayo retirado no puede volver a publicarse.');
    return { exam: await this.examRepo.publish(examId), alreadyPublished: false };
  }

  // --- Internos ---

  private async lockAttempt(tx: Prisma.TransactionClient, attemptId: string): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${EXAM_LOCK_NAMESPACE}, hashtext(${'exam-attempt:' + attemptId}))`;
  }

  /** `accountId` solo para verificar pertenencia -- un intento ajeno o inexistente produce el MISMO 404, nunca filtra existencia. */
  private async loadOwnedAttempt(tx: Prisma.TransactionClient, accountId: string, attemptId: string): Promise<ExamAttempt> {
    const attempt = await this.attemptRepo.findById(attemptId, tx);
    if (!attempt || attempt.accountId !== accountId) {
      throw new NotFoundException('Este intento de ensayo no existe o no pertenece a tu cuenta.');
    }
    return attempt;
  }

  /** Transición perezosa a EXPIRED. Idempotente -- un intento ya cerrado se devuelve sin cambios. */
  private async refreshExpiry(tx: Prisma.TransactionClient, attempt: ExamAttempt): Promise<ExamAttempt> {
    if (attempt.status === 'ACTIVE' && Date.now() >= attempt.expiresAt.getTime()) {
      return this.attemptRepo.markExpired(attempt.id, tx);
    }
    return attempt;
  }

  private async computeScore(tx: Prisma.TransactionClient, attempt: ExamAttempt): Promise<ExamAttemptScore> {
    const totalQuestions = await this.examQuestionRepo.countByExamId(attempt.examId, tx);
    const answers = await this.answerRepo.findByAttemptId(attempt.id, tx);
    const answersCorrect = answers.filter((a) => a.isCorrect).length;
    return this.scoring.score({ totalQuestions, answersCorrect, answersTotal: answers.length });
  }

  private toQuestionView(link: ExamQuestionWithVersion, selectedByQuestion: Map<string, string>): ExamAttemptQuestionView {
    return {
      questionVersionId: link.questionVersionId,
      displayOrder: link.displayOrder,
      stemContent: link.questionVersion.stemContent,
      answerOptions: link.questionVersion.answerOptions,
      selectedAnswerOptionId: selectedByQuestion.get(link.questionVersionId) ?? null,
      passageId: link.passageId ?? null,
    };
  }
}
