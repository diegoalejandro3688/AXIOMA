import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import type { QuickQuestionSession } from '../generated/prisma/client';

/**
 * Único punto de acceso a `quick_question_session` -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md §13.1 (Bloque IV, Incremento 4,
 * sub-incremento 4.a). Sin selección de preguntas, sin corrección, sin
 * publicación -- eso pertenece a `QuickQuestionService` (4.b).
 *
 * Forward-only (`ACTIVE -> CLOSED`) reforzado por
 * `enforce_quick_question_session_status_transition` (migración SQL) --
 * `close()` es la única transición expuesta aquí, deliberadamente sin
 * `update()` genérico.
 */
@Injectable()
export class QuickQuestionSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** `tx` opcional -- QuickQuestionService.openSession (4.b) lo pasa para crear dentro de la transacción bloqueada por cuenta (§13, precisión #1/#3). */
  create(accountId: string, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession> {
    return (tx ?? this.prisma).quickQuestionSession.create({ data: { accountId } });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession | null> {
    return (tx ?? this.prisma).quickQuestionSession.findUnique({ where: { id } });
  }

  /**
   * Única `QuickQuestionSession` `ACTIVE` de una cuenta -- respaldada por
   * `quick_question_session_one_active_per_account` (índice único parcial,
   * migración SQL de 4.b, mismo criterio que `game_season_single_active`
   * salvo que aquí es POR CUENTA, no global). `tx` opcional -- usado para
   * la relectura bajo advisory lock en `openSession`.
   */
  findActiveByAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession | null> {
    return (tx ?? this.prisma).quickQuestionSession.findFirst({ where: { accountId, status: 'ACTIVE' } });
  }

  /**
   * 4.b: fija la pregunta pendiente tras la selección server-side (`/next`).
   * Sin cambio de `status` -- el trigger de transición lo permite libremente
   * mientras la sesión siga ACTIVE. `tx` opcional -- QuickQuestionService.next
   * lo pasa para escribir dentro de la transacción bloqueada por sesión.
   */
  setCurrentQuestion(id: string, questionVersionId: string, presentedAt: Date, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession> {
    return (tx ?? this.prisma).quickQuestionSession.update({
      where: { id },
      data: { currentQuestionVersionId: questionVersionId, currentPresentedAt: presentedAt },
    });
  }

  /**
   * 4.b: limpia la pregunta pendiente al finalizar un intento (`/answers`) --
   * `tx` OBLIGATORIO, misma transacción que crea el `quick_question_attempt`
   * correspondiente (§13.3 punto 4, corregido 2026-08-06: la transacción
   * cubre EXCLUSIVAMENTE estas dos tablas propias, la publicación del evento
   * ocurre después, best-effort, fuera de ella).
   */
  clearCurrentQuestion(tx: Prisma.TransactionClient, id: string): Promise<QuickQuestionSession> {
    return tx.quickQuestionSession.update({
      where: { id },
      data: { currentQuestionVersionId: null, currentPresentedAt: null },
    });
  }

  /**
   * Cierre forward-only -- descarta cualquier pregunta pendiente, sin crear
   * intento ni publicar actividad (§13.4). `tx` opcional -- QuickQuestionService.close
   * (4.b) lo pasa para escribir dentro de la transacción bloqueada por sesión.
   */
  close(id: string, closedAt: Date, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession> {
    return (tx ?? this.prisma).quickQuestionSession.update({
      where: { id },
      data: { status: 'CLOSED', closedAt, currentQuestionVersionId: null, currentPresentedAt: null },
    });
  }
}
