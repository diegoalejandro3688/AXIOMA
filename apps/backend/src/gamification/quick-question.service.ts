import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { OutboxService } from '../platform/outbox/outbox.service';
import { GAMIFICATION_SCHEMA_VERSION } from '@axioma/contracts';
import { QuickQuestionSessionRepository } from './quick-question-session.repository';
import { QuickQuestionAttemptRepository } from './quick-question-attempt.repository';
import { QuestionVersionRepository, type QuestionVersionWithAnswerOptions } from '../education/question-version.repository';
import { AnswerOptionRepository } from '../education/answer-option.repository';
import { Prisma } from '../generated/prisma/client';
import type { QuickQuestionSession, QuickQuestionAttempt } from '../generated/prisma/client';

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

/**
 * COMPETITIVE V1, Incremento 9 -- ventana AUTORITATIVA de la pregunta
 * rápida. ÚNICA fuente de verdad del backend. La deadline se deriva SIEMPRE
 * de `currentPresentedAt + este valor`, calculada con el reloj del servidor
 * -- nunca con un timestamp/`secondsRemaining` enviado por el cliente.
 */
export const QUICK_QUESTION_TIME_LIMIT_MS = 45_000;

/** Instante autoritativo de expiración de una pregunta presentada en `presentedAt`. */
export function quickQuestionDeadline(presentedAt: Date): Date {
  return new Date(presentedAt.getTime() + QUICK_QUESTION_TIME_LIMIT_MS);
}

/** `true` si la ventana ya expiró según el reloj del servidor (`now`). */
export function isQuickQuestionExpired(presentedAt: Date | null, now: Date): boolean {
  if (!presentedAt) return true; // pendiente sin `presentedAt`: integridad rota -> se trata como expirada.
  return now.getTime() >= quickQuestionDeadline(presentedAt).getTime();
}

export type OpenSessionOutcome = { session: QuickQuestionSession; created: boolean };

export type NextOutcome =
  | {
      outcome: 'QUESTION_PRESENTED';
      session: QuickQuestionSession;
      questionVersion: QuestionVersionWithAnswerOptions;
      /** `currentPresentedAt + 45 s` -- ventana autoritativa de ESTA presentación. */
      deadlineAt: Date;
    }
  | { outcome: 'NO_QUESTIONS_AVAILABLE'; session: QuickQuestionSession };

/**
 * COMPETITIVE V1, Incremento 9 -- `answer` deja de ser un único resultado:
 *  - `ANSWERED` -- llegó dentro de la ventana; ruta normal (intento + evento
 *    `quick_question_answered` + economía LP actual).
 *  - `TIMED_OUT` -- llegó DESPUÉS de la deadline autoritativa: NO crea
 *    intento, NO emite evento, **0 LP**; se resuelve como timeout y devuelve
 *    la clave para revelar la correcta.
 */
export type AnswerOutcome =
  | {
      outcome: 'ANSWERED';
      attempt: QuickQuestionAttempt;
      created: boolean;
      explanationContent: Prisma.JsonValue | null;
      /** id de la alternativa CORRECTA -- SOLO tras responder/timeout, nunca en `/next`. */
      correctAnswerOptionId: string;
    }
  | { outcome: 'TIMED_OUT'; correctAnswerOptionId: string };

/** COMPETITIVE V1, Incremento 9 -- resultado del endpoint explícito de timeout. */
export type TimeoutOutcome =
  | { outcome: 'TIMED_OUT'; correctAnswerOptionId: string }
  | { outcome: 'NOT_EXPIRED'; deadlineAt: Date }
  | { outcome: 'NO_PENDING_QUESTION' };

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

        // Ids excluidos de la selección: los ya intentados en la sesión y,
        // si aplica, la pregunta que se acaba de consumir por expiración.
        const excludeIds = await this.attemptRepo.findQuestionVersionIdsBySession(sessionId, tx);

        if (session.currentQuestionVersionId) {
          if (!isQuickQuestionExpired(session.currentPresentedAt, new Date())) {
            // §2.A -- todavía dentro de la ventana: MISMA pregunta pendiente,
            // conservando SU deadline original (no se reinicia, no se
            // concede otra ventana).
            const pending = await this.questionVersionRepo.findByIdWithAnswerOptions(session.currentQuestionVersionId, tx);
            if (!pending) {
              throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
            }
            return {
              outcome: 'QUESTION_PRESENTED' as const,
              session,
              questionVersion: pending,
              deadlineAt: quickQuestionDeadline(session.currentPresentedAt ?? new Date()),
            };
          }

          // §2.B -- ya expiró: se consume/finaliza el timeout AUTORITATIVAMENTE
          // (limpiar la pregunta pendiente) SIN crear intento ni emitir
          // `quick_question_answered` (**0 LP**), y se excluye de esta
          // selección. La revelación de la correcta en el timeout la sirve
          // el endpoint explícito `/timeout`; este camino es la red de
          // seguridad para un `/next` sobre una pregunta ya vencida.
          excludeIds.push(session.currentQuestionVersionId);
          await this.sessionRepo.clearCurrentQuestion(tx, sessionId);
        }

        const candidate = await this.questionVersionRepo.findRandomEligible(excludeIds, tx);
        if (!candidate) {
          const cleared = await this.sessionRepo.findById(sessionId, tx);
          return { outcome: 'NO_QUESTIONS_AVAILABLE' as const, session: cleared ?? session };
        }

        const presentedAt = new Date();
        const updated = await this.sessionRepo.setCurrentQuestion(sessionId, candidate.id, presentedAt, tx);
        return {
          outcome: 'QUESTION_PRESENTED' as const,
          session: updated,
          questionVersion: candidate,
          deadlineAt: quickQuestionDeadline(presentedAt),
        };
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  }

  /**
   * COMPETITIVE V1, Incremento 9 -- resolución AUTORITATIVA del timeout de la
   * pregunta pendiente. Comparte la MISMA exclusión mutua (`qq-session:{id}`)
   * que `next`/`answer`/`close` -> answer-vs-timeout tiene un único
   * resultado. NO crea `quick_question_attempt`, NO emite
   * `quick_question_answered` -> **0 LP** garantizado estructuralmente.
   * Idempotente: un segundo intento cae en `NO_PENDING_QUESTION` (200, nunca
   * 500).
   */
  async timeout(accountId: string, sessionId: string): Promise<TimeoutOutcome> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${QUICK_QUESTION_LOCK_NAMESPACE}, hashtext(${'qq-session:' + sessionId}))`;

        const session = await this.loadOwnedSession(tx, accountId, sessionId);
        if (session.status !== 'ACTIVE') {
          throw new ConflictException('Esta sesión de Pregunta rápida ya está cerrada.');
        }
        if (!session.currentQuestionVersionId) {
          return { outcome: 'NO_PENDING_QUESTION' as const };
        }
        if (!isQuickQuestionExpired(session.currentPresentedAt, new Date())) {
          return {
            outcome: 'NOT_EXPIRED' as const,
            deadlineAt: quickQuestionDeadline(session.currentPresentedAt ?? new Date()),
          };
        }

        const correctOption = await this.answerOptionRepo.findCorrectByQuestionVersionId(session.currentQuestionVersionId, tx);
        if (!correctOption) {
          // Integridad rota (pregunta PUBLISHED sin correcta): se consume
          // igual para no dejar la sesión atascada.
          await this.sessionRepo.clearCurrentQuestion(tx, sessionId);
          throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
        }

        await this.sessionRepo.clearCurrentQuestion(tx, sessionId);
        return { outcome: 'TIMED_OUT' as const, correctAnswerOptionId: correctOption.id };
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
          // Replay -- misma pregunta ya resuelta anteriormente, se resuelve
          // su explicación de nuevo (nunca se re-crea el intento ni se
          // vuelve a publicar, ver `result.created` más abajo).
          const questionVersion = await this.questionVersionRepo.findByIdWithQuestionStatus(existing.questionVersionId, tx);
          const correctOption = await this.answerOptionRepo.findCorrectByQuestionVersionId(existing.questionVersionId, tx);
          if (!correctOption) {
            throw new ConflictException('La pregunta de este intento ya no está disponible.');
          }
          return {
            outcome: 'ANSWERED' as const,
            attempt: existing,
            created: false,
            explanationContent: questionVersion?.explanationContent ?? null,
            correctAnswerOptionId: correctOption.id,
          };
        }

        if (session.status !== 'ACTIVE') {
          throw new ConflictException('Esta sesión de Pregunta rápida ya está cerrada.');
        }
        if (!session.currentQuestionVersionId) {
          throw new ConflictException('No hay ninguna pregunta pendiente para responder en esta sesión.');
        }

        // COMPETITIVE V1, Incremento 9 -- la deadline se verifica TAMBIÉN
        // aquí, con el reloj del servidor. Una respuesta que llega después
        // de `currentPresentedAt + 45 s` NO se acepta como respuesta: no
        // crea intento, no emite evento (**0 LP**), se resuelve como
        // timeout. Un cliente viejo/modificado no puede responder tarde y
        // obtener recompensa. La pregunta queda consumida.
        if (isQuickQuestionExpired(session.currentPresentedAt, new Date())) {
          const correctOnTimeout = await this.answerOptionRepo.findCorrectByQuestionVersionId(session.currentQuestionVersionId, tx);
          if (!correctOnTimeout) {
            await this.sessionRepo.clearCurrentQuestion(tx, sessionId);
            throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
          }
          await this.sessionRepo.clearCurrentQuestion(tx, sessionId);
          return { outcome: 'TIMED_OUT' as const, correctAnswerOptionId: correctOnTimeout.id };
        }

        const answerOption = await this.answerOptionRepo.findById(answerOptionId, tx);
        if (!answerOption || answerOption.questionVersionId !== session.currentQuestionVersionId) {
          throw new BadRequestException('La alternativa no pertenece a la pregunta pendiente de esta sesión.');
        }

        // Mismo criterio de defensa en profundidad que PROGRESS
        // (ADR-0014): la pregunta pudo retirarse en la ventana entre
        // presentarse (`/next`) y responderse -- se revalida aquí, no solo
        // en la selección. También es la fuente de `explanationContent`
        // para la respuesta.
        const questionVersion = await this.questionVersionRepo.findByIdWithQuestionStatus(session.currentQuestionVersionId, tx);
        if (!questionVersion || questionVersion.editorialStatus !== 'PUBLISHED' || questionVersion.question.status !== 'ACTIVE') {
          throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
        }

        // COMPETITIVE V1 (Incremento 2) -- alternativa correcta para revelarla
        // en la respuesta. Una pregunta PUBLISHED siempre tiene una; si no,
        // es un problema de integridad y se trata como "no disponible".
        const correctOption = await this.answerOptionRepo.findCorrectByQuestionVersionId(session.currentQuestionVersionId, tx);
        if (!correctOption) {
          throw new ConflictException('La pregunta pendiente de esta sesión ya no está disponible.');
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

        return {
          outcome: 'ANSWERED' as const,
          attempt,
          created: true,
          explanationContent: questionVersion.explanationContent,
          correctAnswerOptionId: correctOption.id,
        };
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
    if (result.outcome === 'ANSWERED' && result.created) {
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
