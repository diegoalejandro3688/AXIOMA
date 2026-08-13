import { Injectable, Logger } from '@nestjs/common';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiUsageLedgerRepository } from './ai-usage-ledger.repository';
import { AiGenerationClaimRepository } from './ai-generation-claim.repository';
import { AiResponseReportRepository } from './ai-response-report.repository';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { Prisma } from '../generated/prisma/client';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Decisión C (LEF-BLOCK-VI-DEFINITION.md §11/§27) -- contenido conversacional, 90 días desde la última actividad canónica. */
const CONVERSATION_RETENTION_DAYS = 90;
/** Política final del Product Owner (2026-08-12, Decision Gate de este incremento) -- 90 días desde `occurredAt`, INDEPENDIENTE de la retención conversacional (invariante 17 del bloque). */
const LEDGER_RETENTION_DAYS = 90;

/**
 * Tamaño de lote por ejecución del barrido -- decisión de ingeniería, no
 * contractual (el bloque solo exige "acotada por batch", sin fijar un
 * número). 200 es conservador para una operación que, por conversación,
 * hace varias sentencias DELETE/UPDATE encadenadas (reportes, ledger,
 * claims, mensajes, conversación) -- revisable con evidencia real de
 * volumen, igual que `maxOutputTokens` en `AnthropicAiProvider`.
 */
const DEFAULT_BATCH_SIZE = 200;

export interface ConversationPurgeResult {
  purged: number;
  failed: number;
}

/**
 * LEF Bloque VI, Incremento 7 ("Privacidad, retención y borrado") -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §27 y la política final del Product
 * Owner (2026-08-12, Decision Gate de retención del ledger). Único punto
 * autorizado que ORQUESTA el borrado de contenido del Tutor IA a través de
 * los repositorios de dominio -- nunca queries Prisma sueltas fuera de
 * ellos (mismo criterio que el resto del proyecto).
 *
 * TRES políticas de retención independientes, nunca confundidas entre sí
 * (invariante 17 del bloque):
 * 1. `AiConversation`/`AiMessage`/`AiResponseReport`: 90 días desde la
 *    última actividad canónica de la conversación (`lastMessageAt`, o
 *    `createdAt` si nunca hubo una respuesta exitosa) -- ver
 *    `purgeExpiredConversations`. Los reportes viven y mueren con su
 *    mensaje, sin plazo propio (decisión del Product Owner).
 * 2. `AiUsageLedgerEntry`: 90 días propios desde `occurredAt`, verificados
 *    por el propio trigger de Postgres (`enforce_ai_usage_ledger_entry_no_delete`)
 *    -- ver `purgeExpiredLedgerEntries`. Puede purgarse ANTES o DESPUÉS de
 *    que su conversación de origen ya no exista -- son independientes.
 * 3. `AiGenerationClaim`: estado efímero, sin retención histórica -- ver
 *    `cleanupExpiredClaims`.
 *
 * `purgeConversationContent` es el ÚNICO método que borra el contenido de
 * UNA conversación -- reutilizado por el barrido de retención, el borrado
 * manual (`AiConversationService.deleteConversation`) y el cierre de cuenta
 * (`deleteAllForAccountClosure`), para que el ORDEN correcto de eliminación
 * (reportes -> desvincular ledger -> claims -> mensajes -> conversación,
 * exigido por las FK `Restrict` reales del esquema) viva en un solo lugar.
 */
@Injectable()
export class AiRetentionService {
  private readonly logger = new Logger(AiRetentionService.name);

  constructor(
    private readonly conversationRepo: AiConversationRepository,
    private readonly messageRepo: AiMessageRepository,
    private readonly usageLedgerRepo: AiUsageLedgerRepository,
    private readonly claimRepo: AiGenerationClaimRepository,
    private readonly responseReportRepo: AiResponseReportRepository,
    private readonly txRunner: TransactionRunnerService,
  ) {}

  /**
   * Orden de eliminación para UNA conversación, exigido por las FK reales
   * (`Restrict`) del esquema -- ver auditoría de dependencias del reporte de
   * cierre de este incremento:
   * 1. `AiResponseReport` (FK `Restrict` hacia `AiMessage`).
   * 2. Desvincular `AiUsageLedgerEntry` (única mutación autorizada -- la
   *    fila SOBREVIVE, ver `AiUsageLedgerRepository.detachReferencesForConversationId`).
   * 3. `AiGenerationClaim` (efímero, normalmente ya vacío).
   * 4. `AiMessage` (FK `Restrict` hacia `AiConversation`).
   * 5. `AiConversation`.
   * Todo dentro de UNA transacción -- si cualquier paso falla, nada se
   * pierde a medias (ver `purgeExpiredConversations`, que aísla el fallo de
   * una conversación del resto del batch).
   */
  private async purgeConversationContent(conversationId: string, tx: Prisma.TransactionClient): Promise<void> {
    await this.responseReportRepo.deleteByConversationId(conversationId, tx);
    await this.usageLedgerRepo.detachReferencesForConversationId(conversationId, tx);
    await this.claimRepo.deleteByConversationId(conversationId, tx);
    await this.messageRepo.deleteByConversationId(conversationId, tx);
    await this.conversationRepo.deleteById(conversationId, tx);
  }

  /**
   * Borrado manual -- ver `AiConversationService.deleteConversation`, que ya
   * validó ownership (404 uniforme) ANTES de llamar aquí. Este método asume
   * que `conversationId` ya es legítimamente de la cuenta que pidió el
   * borrado -- nunca vuelve a verificar ownership (esa responsabilidad es
   * exclusiva del llamador, mismo criterio que el resto del dominio).
   */
  async deleteConversationForAccount(conversationId: string): Promise<void> {
    await this.txRunner.run((tx) => this.purgeConversationContent(conversationId, tx));
  }

  /**
   * Barrido de retención -- ver docstring de la clase, política 1. Cada
   * conversación se purga en su PROPIA transacción (nunca el batch entero
   * en una sola) -- un fallo aislado (ej. una fila inesperada) no debe
   * impedir que el resto del lote progrese, mismo criterio que
   * `PrivacyService.runAccountDeletionSweep`. Idempotente: una conversación
   * ya purgada simplemente no vuelve a aparecer en `findExpiredForPurge`.
   * Observable SIN contenido -- solo cuenta filas, nunca loguea
   * id/contenido de mensajes.
   */
  async purgeExpiredConversations(now: Date = new Date(), batchSize: number = DEFAULT_BATCH_SIZE): Promise<ConversationPurgeResult> {
    const cutoff = new Date(now.getTime() - CONVERSATION_RETENTION_DAYS * MS_PER_DAY);
    const candidates = await this.conversationRepo.findExpiredForPurge(cutoff, batchSize);

    let purged = 0;
    let failed = 0;
    for (const conversation of candidates) {
      try {
        await this.txRunner.run((tx) => this.purgeConversationContent(conversation.id, tx));
        purged++;
      } catch (error) {
        failed++;
        this.logger.error(`Purga de retención falló para una conversación -- queda pendiente para el próximo barrido: ${error}`);
      }
    }
    return { purged, failed };
  }

  /**
   * Barrido del ledger -- ver docstring de la clase, política 2.
   * COMPLETAMENTE independiente de `purgeExpiredConversations` -- una fila
   * de ledger puede purgarse mucho después de que su conversación de origen
   * ya no exista (ya desvinculada, `conversationId`/`assistantMessageId`/
   * `operationId` en `NULL`) o, más raramente, mientras la conversación
   * sigue viva (conversación de larga duración con turnos antiguos). El
   * propio trigger de Postgres (`enforce_ai_usage_ledger_entry_no_delete`)
   * es la autoridad final sobre qué filas son elegibles -- este método
   * nunca decide "confía en" su propio cálculo del corte.
   */
  async purgeExpiredLedgerEntries(now: Date = new Date(), batchSize: number = DEFAULT_BATCH_SIZE): Promise<{ deleted: number }> {
    const cutoff = new Date(now.getTime() - LEDGER_RETENTION_DAYS * MS_PER_DAY);
    const ids = await this.usageLedgerRepo.findExpiredIds(cutoff, batchSize);
    const deleted = await this.usageLedgerRepo.deleteByIds(ids);
    return { deleted };
  }

  /** Limpieza de `AiGenerationClaim` huérfanos/expirados -- ver docstring de la clase, política 3. Sin ancla de retención (no es una política de "días"), simplemente basura operativa cuyo TTL ya venció. */
  async cleanupExpiredClaims(now: Date = new Date(), batchSize: number = DEFAULT_BATCH_SIZE): Promise<{ deleted: number }> {
    const deleted = await this.claimRepo.deleteExpired(now, batchSize);
    return { deleted };
  }

  /**
   * Integración con `PrivacyService.runAccountDeletionSweep` (ADR-0005) --
   * mismo patrón EXACTO que `ProgressService.deleteProgressForAccountClosure`:
   * un método público, invocado DENTRO del mismo `try` que el resto de
   * dominios, antes de `markCompleted` (si este método falla, la solicitud
   * queda `PROCESSING` para reintento, nunca se pierde ni se marca
   * completada a medias). PRIVACY nunca toca las tablas de AI directamente.
   *
   * Todas las conversaciones de la cuenta se ELIMINAN por completo (mismo
   * criterio que USER/PROGRESS en el cierre de cuenta -- dato personal
   * eliminado, no anonimizado). El ledger de la cuenta se DESVINCULA (nunca
   * se borra aquí -- sigue su propia política de 90 días, ver política 2) y
   * `accountId` permanece intacto en esas filas: `Account` nunca se borra al
   * cerrar una cuenta (mismo patrón ya vigente para
   * `xp_ledger_entry`/`league_point_ledger_entry`), así que no hay ninguna
   * fila huérfana ni ningún FK roto -- el ledger de una cuenta cerrada sigue
   * siendo una fila válida, solo que sin contenido conversacional
   * alcanzable, hasta cumplir sus propios 90 días.
   */
  async deleteAllForAccountClosure(accountId: string): Promise<void> {
    await this.txRunner.run(async (tx) => {
      await this.responseReportRepo.deleteByAccountId(accountId, tx);
      await this.usageLedgerRepo.detachReferencesForAccountId(accountId, tx);
      await this.claimRepo.deleteByAccountId(accountId, tx);
      await this.messageRepo.deleteByAccountId(accountId, tx);
      await this.conversationRepo.deleteByAccountId(accountId, tx);
    });
  }
}
