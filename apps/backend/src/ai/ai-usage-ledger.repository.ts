import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AiUsageLedgerEntry, Prisma } from '../generated/prisma/client';

type Client = PrismaService | Prisma.TransactionClient;

/**
 * Único punto de acceso a `ai_usage_ledger` -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión, Incremento 3). Libro
 * mayor APPEND-ONLY e INMUTABLE (triggers
 * `enforce_ai_usage_ledger_entry_immutable`/`_no_delete`) -- este
 * repositorio nunca expone un `update` ni un `delete`. Todos los métodos
 * aceptan un cliente Prisma opcional (`tx`) para poder ejecutarse dentro de
 * la transacción que también persiste el `AiMessage` ASSISTANT -- mismo
 * patrón exacto que `XpLedgerEntryRepository` (Bloque I).
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
}
