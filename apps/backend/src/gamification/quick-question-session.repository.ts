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

  create(accountId: string): Promise<QuickQuestionSession> {
    return this.prisma.quickQuestionSession.create({ data: { accountId } });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<QuickQuestionSession | null> {
    return (tx ?? this.prisma).quickQuestionSession.findUnique({ where: { id } });
  }

  /**
   * 4.b: fija la pregunta pendiente tras la selección server-side (`/next`).
   * Sin cambio de `status` -- el trigger de transición lo permite libremente
   * mientras la sesión siga ACTIVE.
   */
  setCurrentQuestion(id: string, questionVersionId: string, presentedAt: Date): Promise<QuickQuestionSession> {
    return this.prisma.quickQuestionSession.update({
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

  /** 4.c: cierre forward-only -- descarta cualquier pregunta pendiente, sin crear intento ni publicar actividad (§13.4). */
  close(id: string, closedAt: Date): Promise<QuickQuestionSession> {
    return this.prisma.quickQuestionSession.update({
      where: { id },
      data: { status: 'CLOSED', closedAt, currentQuestionVersionId: null, currentPresentedAt: null },
    });
  }
}
