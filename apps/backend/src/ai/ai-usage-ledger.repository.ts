import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiUsageLedgerEntry, Prisma } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `ai_usage_ledger` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión, Incremento 3) y §27
 * (Incremento 7, privacidad/retención). Libro mayor APPEND-ONLY e INMUTABLE
 * (triggers `enforce_ai_usage_ledger_entry_immutable`/`_no_delete`) -- este
 * repositorio expone SOLO dos excepciones estructuralmente acotadas,
 * autorizadas por el Product Owner (2026-08-12): `detachReferences*`
 * (desvincula `conversationId`/`assistantMessageId`/`operationId` hacia
 * `NULL`, nunca otro campo -- el propio trigger de Postgres lo verifica
 * columna por columna, no es una convención de este repositorio) y
 * `deleteExpired*` (borra filas completas SOLO si ya cumplieron sus propios
 * 90 días desde `occurredAt` -- el propio trigger de Postgres lo verifica
 * fila por fila, no confía en que el llamador calcule el corte
 * correctamente). Ningún otro `update`/`delete` -- cualquier otro intento es
 * rechazado por Postgres, no por disciplina de este archivo. Todos los
 * métodos aceptan un cliente Prisma opcional (`tx`) para poder ejecutarse
 * dentro de una transacción -- mismo patrón exacto que
 * `XpLedgerEntryRepository` (Bloque I).
 */
@Injectable()
export class AiUsageLedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    input: {
      accountId: string;
      conversationId: string;
      assistantMessageId: string;
      operationId: string;
      provider: string;
      model: string;
      promptVersion: string;
      inputTokens: number | null;
      outputTokens: number | null;
      attempts: number;
      latencyMs: number;
      occurredAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<AiUsageLedgerEntry> {
    const client: Client = tx ?? this.prisma;
    return client.aiUsageLedgerEntry.create({ data: input });
  }

  findByOperationId(operationId: string): Promise<AiUsageLedgerEntry | null> {
    return this.prisma.aiUsageLedgerEntry.findUnique({ where: { operationId } });
  }

  /**
   * Cuenta de consultas consumidas por una cuenta dentro de una ventana UTC
   * -- base del control de cuota diaria. Sin `tx` por defecto: la admisión
   * de una operación NUEVA se verifica FUERA de una transacción explícita
   * (ver `AiConversationService`, decisión documentada de no usar
   * SERIALIZABLE aquí -- riesgo de carrera acotado y consistente con el
   * criterio ya aceptado para el límite de turnos de I1).
   */
  countConsumedToday(accountId: string, dayStart: Date, dayEnd: Date, tx?: Prisma.TransactionClient): Promise<number> {
    const client: Client = tx ?? this.prisma;
    return client.aiUsageLedgerEntry.count({
      where: { accountId, occurredAt: { gte: dayStart, lt: dayEnd } },
    });
  }

  findByAccountId(accountId: string): Promise<AiUsageLedgerEntry[]> {
    return this.prisma.aiUsageLedgerEntry.findMany({ where: { accountId }, orderBy: { recordedAt: 'asc' } });
  }

  /**
   * Incremento 7 -- desvincula (hacia `NULL`) las filas de UNA conversación
   * que se está eliminando (borrado manual, purga por retención, o cierre de
   * cuenta) -- la fila de ledger SOBREVIVE, sin contenido conversacional
   * alcanzable. Único UPDATE autorizado -- ver docstring de la clase.
   * Idempotente (`updateMany`, nunca lanza si no hay filas que desvincular).
   */
  async detachReferencesForConversationId(conversationId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client: Client = tx ?? this.prisma;
    await client.aiUsageLedgerEntry.updateMany({
      where: { conversationId },
      data: { conversationId: null, assistantMessageId: null, operationId: null },
    });
  }

  /** Mismo criterio que `detachReferencesForConversationId`, para el cierre de cuenta (todas las conversaciones de una cuenta a la vez). */
  async detachReferencesForAccountId(accountId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client: Client = tx ?? this.prisma;
    await client.aiUsageLedgerEntry.updateMany({
      where: { accountId, conversationId: { not: null } },
      data: { conversationId: null, assistantMessageId: null, operationId: null },
    });
  }

  /**
   * Incremento 7 -- localiza hasta `limit` filas ya expiradas (90 días desde
   * `occurredAt`, política final del Product Owner) para el barrido de
   * purga acotado por batch. Solo IDs -- el contenido no se necesita para
   * decidir qué borrar, y nunca debe aparecer en logs (ver
   * `AiRetentionService`).
   */
  findExpiredIds(cutoff: Date, limit: number, tx?: Prisma.TransactionClient): Promise<string[]> {
    const client: Client = tx ?? this.prisma;
    return client.aiUsageLedgerEntry
      .findMany({ where: { occurredAt: { lt: cutoff } }, take: limit, select: { id: true }, orderBy: { occurredAt: 'asc' } })
      .then((rows) => rows.map((r) => r.id));
  }

  /**
   * Borra las filas indicadas -- SOLO tiene efecto sobre las que ya cumplieron
   * sus 90 días propios (`enforce_ai_usage_ledger_entry_no_delete` lo
   * verifica fila por fila; cualquier id que no haya expirado hace fallar
   * toda la operación, nunca un borrado parcial silencioso). Se espera que
   * el llamador solo pase ids ya obtenidos de `findExpiredIds` con el MISMO
   * corte, por eso una falla aquí es una señal de una condición de carrera
   * real (código propio con un bug), no un caso esperado a atrapar en
   * silencio.
   */
  async deleteByIds(ids: string[], tx?: Prisma.TransactionClient): Promise<number> {
    if (ids.length === 0) return 0;
    const client: Client = tx ?? this.prisma;
    const result = await client.aiUsageLedgerEntry.deleteMany({ where: { id: { in: ids } } });
    return result.count;
  }
}
