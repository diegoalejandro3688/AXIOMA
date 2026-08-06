import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { OutboxService } from '../platform/outbox/outbox.service';
import { GAMIFICATION_SCHEMA_VERSION } from '@axioma/contracts';
import { QuickQuestionSessionRepository } from './quick-question-session.repository';
import { QuickQuestionAttemptRepository } from './quick-question-attempt.repository';
import { QuestionVersionRepository } from '../education/question-version.repository';
import { AnswerOptionRepository } from '../education/answer-option.repository';
import { Prisma } from '../generated/prisma/client';
import type { QuickQuestionSession, QuickQuestionAttempt, QuestionVersion } from '../generated/prisma/client';

/**
 * Namespace de advisory lock DISTINTO a los ya en uso (19 ADR-0019, 20
 * reclamación de desafíos, 21 inscripción de liga, 22 finalización de
 * ranking) -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.
 *
 * Dos claves de lock DISTINTAS dentro del mismo namespace: `qq-account:{id}`
 * serializa la apertura idempotente de sesión (precisión #1 -- una sola
 * ACTIVE por cuenta); `qq-session:{id}` serializa `next`/`answer`/`close`
 * sobre una sesión YA existente (precisión #3 -- las tres comparten la
 * misma exclusión mutua). `pg_advisory_xact_lock` BLOQUEANTE (no `_try_`),
 * mismo criterio que `ChallengeService.claim`/`LeagueEnrollmentService`:
 * una segunda solicitud simplemente espera, no se rechaza.
 */
const QUICK_QUESTION_LOCK_NAMESPACE = 23;

export type OpenSessionOutcome = { session: QuickQuestionSession; created: boolean };

export type NextOutcome =
  | { outcome: 'QUESTION_PRESENTED'; session: QuickQuestionSession; questionVersion: QuestionVersion }
  | { outcome: 'NO_QUESTIONS_AVAILABLE'; session: QuickQuestionSession };

export type AnswerOutcome = { attempt: QuickQuestionAttempt; created: boolean };

/**
 * Bloque IV, Incremento 4, sub-incremento 4.b ("Motor de sesión de Pregunta
 * rápida") -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.2-13.3. Sin HTTP
 * todavía (4.c). Reutiliza el MECANISMO de corrección de EDUCATION
 * (QuestionVersionRepository/AnswerOptionRepository), nunca crea lógica de
 * corrección propia ni escribe en PROGRESS.
 *
 * Precisión obligatoria del Product Owner: "Advisory lock, relectura,
 * decisión y escritura deben ejecutarse dentro del mismo tx" -- `next`,
 * `answer` y `close` son, cada uno, una ÚNICA `$transaction` que abre el
 * lock como primer paso y termina con la escritura (si la hay) como último;
 * ninguna lectura de decisión ocurre fuera de esa transacción.
 */
@Injectable()
export class QuickQuestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly sessionRepo: QuickQuestionSessionRepository,
    private readonly attemptRepo: QuickQuestionAttemptRepository,
    private readonly questionVersionRepo: QuestionVersionRepository,
    private readonly answerOptionRepo: AnswerOptionRepository,
  ) {}

  /**
   * Precisión #1: una sola `QuickQuestionSession` `ACTIVE` por cuenta.
   * Idempotente bajo concurrencia real: lectura rápida sin lock (camino
   * feliz, sin serializar nada si ya existe), y bajo el lock una RELECTURA
   * antes de crear -- mismo criterio documentado en `AccountChallengeRepository`
   * (verificar-antes-de-crear dentro de una transacción explícita, en vez
   * de recuperarse de P2002, que no funciona sobre una transacción ya
   * abortada). El índice único parcial (`quick_question_session_one_active_per_account`)
   * es el respaldo final de base de datos.
   */
  async openSession(accountId: string): Promise<OpenSessionOutcome> {
    const existing = await this.sessionRepo.findActiveByAccountId(accountId);
    if (existing) return { session: existing, created: false };

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUICK_QUESTION_LOCK_NAMESPACE}, hashtext(${'qq-account:' + accountId}))`;

        const reread = await this.sessionRepo.findActiveByAccountId(accountId, tx);
        if (reread) return { session: reread, created: false };

        const session = await this.sessionRepo.create(accountId, tx);
        return { session, created: true };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /**
   * Selección server-side (§13.2). Doble `/next` sin responder de por medio
   * devuelve la MISMA pregunta pendiente, sin generar otra (máquina de
   * estados, §13). Sin preguntas elegibles restantes -> `NO_QUESTIONS_AVAILABLE`,
   * la sesión permanece `ACTIVE` y sin pregunta pendiente (precisión #5) --
   * nunca un error, el cliente puede reintentar más tarde si se publica
   * contenido nuevo.
   */
  async next(accountId: string, sessionId: string): Promise<NextOutcome> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUICK_QUESTION_LOCK_NAMESPACE}, hashtext(${'qq-session:' + sessionId}))`;

        const session = await this.loadOwnedSession(tx, accountId, sessionId);
        if (session.status !== 'ACTIVE') {
          throw new ConflictException('Esta sesión de Pregunta rápida ya está cerrada.');
        }

        if (session.currentQuestionVersionId) {
          const pending = await this.questionVersionRepo.findByIdWithQuestionStatus(session.currentQuestionVersionId, tx);
          if (!pending) {
            throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
          }
          return { outcome: 'QUESTION_PRESENTED' as const, session, questionVersion: pending };
        }

        const excludeIds = await this.attemptRepo.findQuestionVersionIdsBySession(sessionId, tx);
        const candidate = await this.questionVersionRepo.findRandomEligible(excludeIds, tx);
        if (!candidate) {
          return { outcome: 'NO_QUESTIONS_AVAILABLE' as const, session };
        }

        const updated = await this.sessionRepo.setCurrentQuestion(sessionId, candidate.id, new Date(), tx);
        return { outcome: 'QUESTION_PRESENTED' as const, session: updated, questionVersion: candidate };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /**
   * Corrección server-side reutilizando EDUCATION (§13.3). El replay por
   * `operationId` se verifica ANTES de mirar el estado de la sesión --
   * precisión #4: una segunda solicitud con el MISMO `operationId` debe
   * seguir siendo un replay exitoso incluso si, mientras esperaba el lock,
   * la primera ya limpió `currentQuestionVersionId`. Una solicitud con
   * `operationId` DISTINTO que llega después de que la pregunta pendiente
   * ya fue consumida recibe un conflicto controlado (409), nunca un 500 ni
   * una aceptación silenciosa -- consecuencia natural de la serialización
   * por lock, sin caso especial adicional.
   */
  async answer(accountId: string, sessionId: string, answerOptionId: string, operationId: string): Promise<AnswerOutcome> {
    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUICK_QUESTION_LOCK_NAMESPACE}, hashtext(${'qq-session:' + sessionId}))`;

        const session = await this.loadOwnedSession(tx, accountId, sessionId);

        const existing = await this.attemptRepo.findByOperationId(operationId, tx);
        if (existing) {
          if (existing.sessionId !== sessionId) {
            throw new BadRequestException('Este operationId ya fue usado en otra sesión de Pregunta rápida.');
          }
          return { attempt: existing, created: false };
        }

        if (session.status !== 'ACTIVE') {
          throw new ConflictException('Esta sesión de Pregunta rápida ya está cerrada.');
        }
        if (!session.currentQuestionVersionId) {
          throw new ConflictException('No hay ninguna pregunta pendiente para responder en esta sesión.');
        }

        const answerOption = await this.answerOptionRepo.findById(answerOptionId, tx);
        if (!answerOption || answerOption.questionVersionId !== session.currentQuestionVersionId) {
          throw new BadRequestException('La alternativa no pertenece a la pregunta pendiente de esta sesión.');
        }

        const attempt = await this.attemptRepo.create(tx, {
          sessionId,
          accountId,
          questionVersionId: session.currentQuestionVersionId,
          answerOptionId,
          isCorrect: answerOption.isCorrect,
          presentedAt: session.currentPresentedAt ?? new Date(),
          operationId,
        });
        await this.sessionRepo.clearCurrentQuestion(tx, sessionId);

        return { attempt, created: true };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );

    // Publicación best-effort, POST-COMMIT, fuera de la transacción de
    // arriba (§13.3 punto 4-5, corregido conforme a ADR-0006: OutboxService
    // usa el cliente Prisma global, no puede participar en esa transacción).
    // GARANTÍA LIMITADA, documentada y aceptada: si el proceso cae
    // exactamente aquí -- entre el commit de arriba y este publish -- el
    // intento queda registrado correctamente (nunca se pierde ni se
    // corrompe) pero este evento puntual no se publica, sin reintento
    // automático. Solo se publica en el camino de creación real (`created
    // === true`), nunca en el replay -- mismo criterio ya usado por
    // PROGRESS al publicar el evento equivalente de respuesta académica.
    if (result.created) {
      await this.outbox.publish({
        eventKey: 'quick_question_answered',
        schemaVersion: GAMIFICATION_SCHEMA_VERSION,
        sourceDomain: 'GAMIFICATION',
        aggregateId: accountId,
        occurredAt: result.attempt.respondedAt,
        payload: {
          accountId,
          quickQuestionAttemptId: result.attempt.id,
          quickQuestionSessionId: result.attempt.sessionId,
          questionVersionId: result.attempt.questionVersionId,
          isCorrect: result.attempt.isCorrect,
        },
      });
    }

    return result;
  }

  /**
   * Cierre forward-only, idempotente: una sesión ya `CLOSED` se devuelve
   * sin cambios (no error, mismo criterio que "quitar un equipamiento ya
   * vacío" en `TitleEquipmentService`) -- evita que un segundo `close`
   * pise `closedAt` con un timestamp nuevo. Descarta cualquier pregunta
   * pendiente sin crear intento ni publicar actividad (§13.4, ya
   * garantizado por `QuickQuestionSessionRepository.close`).
   */
  async close(accountId: string, sessionId: string): Promise<QuickQuestionSession> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUICK_QUESTION_LOCK_NAMESPACE}, hashtext(${'qq-session:' + sessionId}))`;

        const session = await this.loadOwnedSession(tx, accountId, sessionId);
        if (session.status === 'CLOSED') return session;

        return this.sessionRepo.close(sessionId, new Date(), tx);
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /** `accountId` únicamente para verificar pertenencia -- una sesión ajena o inexistente produce el MISMO 404, nunca filtra existencia (mismo criterio que `ChallengeService.claim`). */
  private async loadOwnedSession(tx: Prisma.TransactionClient, accountId: string, sessionId: string): Promise<QuickQuestionSession> {
    const session = await this.sessionRepo.findById(sessionId, tx);
    if (!session || session.accountId !== accountId) {
      throw new NotFoundException('Esta sesión de Pregunta rápida no existe o no pertenece a tu cuenta.');
    }
    return session;
  }
}
