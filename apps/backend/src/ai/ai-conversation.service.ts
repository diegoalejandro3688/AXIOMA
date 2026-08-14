import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AiConversationRepository } from './ai-conversation.repository';
import { AiMessageRepository } from './ai-message.repository';
import { AiUsageLedgerRepository } from './ai-usage-ledger.repository';
import { AiGenerationClaimRepository } from './ai-generation-claim.repository';
import { AiResponseReportRepository } from './ai-response-report.repository';
import { AiRetentionService } from './ai-retention.service';
import { AiEntitlementService, type AiEntitlement } from './ai-entitlement.service';
import { AiCircuitBreakerService } from './ai-circuit-breaker.service';
import { AiAcademicContextBuilder, type AcademicContextRefInput, type ResolvedAcademicContextRef } from './ai-academic-context-builder.service';
import { AI_PROVIDER, AiProviderTechnicalError, type AiAssistanceMode, type AiProvider } from './ai-provider';
import { TransactionRunnerService } from '../platform/prisma/transaction-runner.service';
import { Prisma } from '../generated/prisma/client';
import type { AiConversation, AiMessage, AiResponseReport, AiResponseReportType, AiUsageLedgerEntry } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const SERIALIZATION_CONFLICT_CODE = 'P2034';
/**
 * SQLSTATE de Postgres para `serialization_failure`. `@prisma/adapter-pg` lo
 * mapea explícitamente a `{ kind: 'TransactionWriteConflict' }` y ADEMÁS
 * conserva el código crudo en `originalCode` -- ver
 * `node_modules/@prisma/adapter-pg/dist/index.js` (`convertDriverError`:
 * `{ originalCode: error.code, originalMessage: error.message, ...mapDriverError(error) }`,
 * y `mapDriverError`: `case '40001': return { kind: 'TransactionWriteConflict' }`).
 */
const SERIALIZATION_CONFLICT_SQLSTATE = '40001';
/**
 * Nombre/forma del error que el runtime de Prisma 7 deja escapar cuando el
 * conflicto de serialización lo detecta Postgres en el `COMMIT` y no en una
 * sentencia intermedia: en ese caso NO se traduce a
 * `PrismaClientKnownRequestError`/P2034. Ver
 * `node_modules/@prisma/driver-adapter-utils/dist/index.js`:
 * `isDriverAdapterError(error) { return error['name'] === 'DriverAdapterError' && typeof error['cause'] === 'object'; }`.
 * `DriverAdapterError` NO es API pública estable (no se reexporta desde
 * `@prisma/client`), así que se replica ESA MISMA comprobación estructural en
 * vez de un `instanceof` contra una clase interna.
 */
const DRIVER_ADAPTER_ERROR_NAME = 'DriverAdapterError';
const DRIVER_ADAPTER_WRITE_CONFLICT_KIND = 'TransactionWriteConflict';
const MAX_SERIALIZABLE_RETRIES = 3;
/** Backoff acotado entre reintentos de conflicto serializable -- mismo criterio que XpGrantService.runSerializable. */
const RETRY_BACKOFF_MS = [25, 75, 150];

/**
 * Ventana durante la cual una reserva de admisión (`AiGenerationClaim`)
 * cuenta contra cuota/turnos sin haberse resuelto todavía -- recuperación
 * ante caídas (ver reporte de auditoría de concurrencia, Incremento 3).
 * Deliberadamente mucho mayor que `GENERATION_LEASE_TTL_MS`: nunca debe
 * expirar mientras una generación física sigue legítimamente en curso.
 */
const RESERVATION_TTL_MS = 60_000;
/** Mayor que el presupuesto total de AnthropicAiProvider (8000ms por defecto) + margen -- ver AiGenerationClaim.generationLeaseExpiresAt. */
const GENERATION_LEASE_TTL_MS = 15_000;
/** Cuánto espera (acotado) una petición que perdió la carrera del lease de generación antes de devolver 503 sin haber llamado nunca al proveedor. */
const LOSER_POLL_TIMEOUT_MS = 10_000;
const LOSER_POLL_INTERVAL_MS = 250;

/**
 * Mismo mensaje/código uniforme para "no existe" y "existe pero no es tuya"
 * -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §21 ("cuenta B... no puede
 * inferir existencia"), mismo criterio ya usado en ADR-0021/todo el
 * proyecto para recursos privados ajenos.
 */
const CONVERSATION_NOT_FOUND_MESSAGE = 'Esta conversación no existe o no está disponible.';

/**
 * Incremento 6 (revisión del Product Owner, 2026-08-12) -- código público
 * ESTABLE para "el proveedor rehusó generar una respuesta por seguridad"
 * (`AiProviderErrorCategory === 'provider_safety_refusal'`). Distinto de un
 * fallo técnico genérico (503) -- ver `completeAssistantReply`: el
 * proveedor SÍ respondió, simplemente no produjo una respuesta pedagógica
 * utilizable. Mismo criterio de whitelisting que el resto del dominio: el
 * mensaje público es SIEMPRE este texto propio de Axioma, NUNCA el mensaje
 * crudo de `AiProviderTechnicalError`/del SDK (que puede describir
 * internamente la causa, pero solo se loguea -- ver AnthropicAiProvider.
 * logObservability -- nunca se propaga al cliente).
 */
const AI_SAFETY_BLOCKED_CODE = 'AI_SAFETY_BLOCKED';
const AI_SAFETY_BLOCKED_MESSAGE = 'El Tutor IA no puede responder a esta solicitud. Intenta reformular tu mensaje.';

/**
 * Hallazgo correctivo de concurrencia (Fase B) -- mensaje público para el caso
 * en que el conflicto de serialización de la ADMISIÓN persiste tras agotar los
 * `MAX_SERIALIZABLE_RETRIES`. Deliberadamente NO se traduce a 409 de
 * cuota/turnos: un conflicto de escritura no resuelto no es evidencia de que
 * ESTA operación deba perder por regla de negocio (nadie confirmó todavía).
 * Es una degradación TÉCNICA, mismo estilo/patrón que los otros 503 del
 * dominio (circuit breaker, fallo técnico del proveedor, espera de lease
 * agotada): mensaje propio de Axioma, accionable, y NUNCA el
 * `DriverAdapterError`, el SQLSTATE ni ningún detalle interno de Prisma (que
 * solo se loguean, igual que en AnthropicAiProvider.logObservability).
 */
const AI_ADMISSION_CONTENTION_MESSAGE = 'El Tutor IA está recibiendo muchas solicitudes en este momento. Vuelve a intentarlo en unos segundos.';

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

/**
 * Comprobación ESTRUCTURAL de `DriverAdapterError` -- réplica literal de
 * `isDriverAdapterError()` de `@prisma/driver-adapter-utils` (ver constante
 * `DRIVER_ADAPTER_ERROR_NAME`). Deliberadamente NO usa `instanceof`: esa clase
 * es interna del runtime de Prisma, no forma parte de la API pública de
 * `@prisma/client` y puede venir de otra copia del paquete.
 */
function isDriverAdapterErrorShape(error: unknown): error is { name: string; cause: Record<string, unknown> } {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; cause?: unknown };
  return candidate.name === DRIVER_ADAPTER_ERROR_NAME && typeof candidate.cause === 'object' && candidate.cause !== null;
}

/**
 * Hallazgo correctivo de concurrencia (Fase B) -- el predicado original solo
 * reconocía `P2034`, que es como Prisma traduce un conflicto de serialización
 * detectado en una SENTENCIA intermedia. Cuando Postgres lo detecta en el
 * `COMMIT` de la transacción SERIALIZABLE (caso real de `admitNewOperation`,
 * que solo hace 4 counts + 1 insert y por tanto casi siempre falla EN EL
 * COMMIT), Prisma 7 + `@prisma/adapter-pg` lo dejan escapar como
 * `DriverAdapterError` sin traducir -- se propagaba como 500 genérico en vez
 * de entrar al retry acotado ya existente.
 */
function isSerializationConflict(error: unknown): boolean {
  // Señal 1 (primaria, documentada): traducción de Prisma para conflictos detectados en sentencia intermedia.
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_CONFLICT_CODE) return true;

  // Señal 2 (primaria): forma estructural del DriverAdapterError sin traducir -- conflicto detectado en el COMMIT.
  if (isDriverAdapterErrorShape(error)) {
    const cause = error.cause as { kind?: unknown; code?: unknown; originalCode?: unknown };
    if (cause.kind === DRIVER_ADAPTER_WRITE_CONFLICT_KIND) return true;
    // SQLSTATE crudo preservado por adapter-pg junto al `kind` mapeado (`originalCode`),
    // y en `code` para el `kind: 'postgres'` genérico (rama `default` de `mapDriverError`).
    if (cause.originalCode === SERIALIZATION_CONFLICT_SQLSTATE) return true;
    if (cause.kind === 'postgres' && cause.code === SERIALIZATION_CONFLICT_SQLSTATE) return true;
  }

  // Señal 3 (ÚLTIMO RECURSO, nunca criterio primario): red de seguridad textual. Justificación explícita:
  // `DriverAdapterError` es interno y no estable; si una versión futura del runtime lo re-envolviera en otro
  // error (perdiendo `name`/`cause` pero conservando el texto), la degradación correcta es volver a reintentar,
  // no devolver un 500. El coste de un falso positivo está acotado por construcción (máx. 3 reintentos de una
  // transacción idempotente de admisión) y el de un falso negativo es el bug que este fix corrige. NUNCA se
  // apoya en el texto libre del driver: solo en el identificador de `kind` de Prisma, que es un token estable.
  return error instanceof Error && error.message.includes(DRIVER_ADAPTER_WRITE_CONFLICT_KIND);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** "YYYY-MM-DDT00:00:00Z" a "YYYY-MM-DDT23:59:59.999Z" -- día calendario UTC, mismo criterio EXACTO que utcDayRange() en xp-grant.service.ts/league-point-grant.service.ts (daily_cap). Duplicado deliberadamente (mismo patrón que esos dos archivos, que tampoco comparten un util). */
function utcDayRange(at: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Señales internas de rechazo en admisión -- nunca cruzan el límite del servicio, se traducen a ConflictException con el mensaje correspondiente. */
class TurnLimitExceededError extends Error {}
class DailyQuotaExceededError extends Error {}
/** Señal interna: OTRA petición concurrente con el MISMO operationId ya existe (ganó la admisión, o incluso ya completó el ciclo entero) -- ver admitNewOperation. Nunca un rechazo real. */
class OperationAlreadyExistsError extends Error {}

export interface DailyQuotaView {
  limit: number;
  consumed: number;
  remaining: number;
  resetAt: Date;
}

/** Eco mínimo, no sensible -- ver `aiAcademicContextSummarySchema` (packages/contracts). */
export interface AcademicContextSummaryView {
  subjectName: string;
  topicName: string;
}

export interface AiConversationSummaryView {
  conversation: AiConversation;
  turnCount: number;
  maxTurns: number;
  dailyQuota: DailyQuotaView;
  academicContext: AcademicContextSummaryView | null;
}

export interface AiConversationDetailView extends AiConversationSummaryView {
  messages: AiMessage[];
}

/**
 * Estado de cuenta (Incremento 8) -- SOLO lectura. Deliberadamente NO
 * incluye `turnCount`/`maxTurns` (conceptos por conversación) ni el
 * `AiEntitlement` crudo (tier interno): `dailyQuota.limit` ya es la única
 * proyección del entitlement que el cliente necesita.
 */
export interface AiAccountStatusView {
  dailyQuota: DailyQuotaView;
}

export interface SendAiMessageView {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
  turnCount: number;
  maxTurns: number;
  dailyQuota: DailyQuotaView;
  academicContext: AcademicContextSummaryView | null;
}

/**
 * LEF Bloque VI, Incrementos 1-3 -- ver docs/adr/LEF-BLOCK-VI-DEFINITION.md
 * §21/§22. Incremento 3 ("Cuotas, idempotencia y control de coste") añade:
 * cuota diaria de consultas (independiente del límite de turnos por
 * conversación, decisión B/Incremento 3), ledger append-only de consumo
 * (`AiUsageLedgerEntry`), circuit breaker operativo, y (revisión de
 * concurrencia real) admisión serializada + lease de generación
 * (`AiGenerationClaim`). SIN contexto académico, SIN pedagogía avanzada, SIN
 * actividades protegidas, SIN retención/borrado, SIN mobile, SIN billing.
 *
 * MODELO DE TRES EVENTOS (contractual): (1) solicitud válida; (2) intento
 * técnico de generación (puede repetirse, ver Incremento 2); (3) consulta
 * consumida -- ÚNICAMENTE cuando existe una respuesta ASSISTANT utilizable
 * persistida para esa operación lógica. Un bloqueo de admisión, un error
 * previo al proveedor, un timeout, un fallo del proveedor sin respuesta
 * utilizable, un reintento técnico de la MISMA operación o un replay
 * idempotente NUNCA consumen.
 *
 * CONCURRENCIA REAL (revisión de auditoría, Incremento 3) -- dos carreras
 * distintas, dos mecanismos distintos, ambos sobre `AiGenerationClaim`
 * (tabla EFÍMERA/mutable, nunca un ledger histórico):
 *
 * 1. ADMISIÓN (operationId DISTINTOS compitiendo por el mismo cupo de
 *    cuota/turnos): `admitNewOperation` corre en una transacción
 *    SERIALIZABLE (mismo patrón que `XpGrantService.runSerializable`) que
 *    cuenta `AiUsageLedgerEntry` YA confirmadas + `AiGenerationClaim`
 *    ACTIVAS (reserva no expirada) antes de admitir -- y crea la reserva
 *    dentro de esa misma transacción corta. Garantiza `consumed <= límite`
 *    y `turnCount <= maxTurns` de forma ABSOLUTA, nunca solo "probable" --
 *    nunca se abre mientras se llama al proveedor.
 * 2. GENERACIÓN EN VUELO (mismo operationId, dos peticiones concurrentes
 *    reintentando la misma operación pendiente): `tryAcquireGenerationLease`
 *    adquiere un lease ATÓMICO (UPDATE condicional en Postgres, nunca un
 *    Map/mutex en memoria -- funciona igual con múltiples instancias del
 *    backend) INMEDIATAMENTE antes de invocar a `AiProvider`. Quien no lo
 *    adquiere NUNCA llama al proveedor -- espera acotadamente
 *    (`waitForConcurrentCompletion`) el resultado de quien sí lo tiene, o
 *    devuelve 503 sin coste externo si el plazo se agota.
 *
 * Garantías distinguidas explícitamente (ver reporte de auditoría): "exactly-
 * once DB consumption" se mantiene SIEMPRE (unicidad de
 * `AiUsageLedgerEntry.operationId` + transacción atómica con el ASSISTANT).
 * "At-most-once llamada física al proveedor" se garantiza bajo concurrencia
 * NORMAL (sin caídas de proceso) vía el lease. Frente a una caída real entre
 * el éxito del proveedor y la persistencia (`persistConsumedReply`), el
 * lease expira (`GENERATION_LEASE_TTL_MS`) y un reintento POSTERIOR sí puede
 * volver a invocar al proveedor -- el resultado de la llamada perdida se
 * descarta, nunca se persiste dos veces. No es "exactly-once" universal
 * frente a cualquier caída; es una decisión deliberada, documentada,
 * proporcionada a la complejidad que I3 justifica.
 *
 * ATOMICIDAD del consumo: el `AiMessage` ASSISTANT + `AiUsageLedgerEntry` +
 * el borrado de `AiGenerationClaim` se crean/eliminan en la MISMA
 * transacción (`persistConsumedReply`) -- nunca un ASSISTANT sin su
 * consumo, ni un consumo sin su ASSISTANT. La llamada al proveedor sigue
 * SIEMPRE fuera de cualquier transacción explícita.
 */
@Injectable()
export class AiConversationService {
  private readonly logger = new Logger(AiConversationService.name);

  constructor(
    private readonly conversationRepo: AiConversationRepository,
    private readonly messageRepo: AiMessageRepository,
    private readonly usageLedgerRepo: AiUsageLedgerRepository,
    private readonly claimRepo: AiGenerationClaimRepository,
    private readonly responseReportRepo: AiResponseReportRepository,
    private readonly retentionService: AiRetentionService,
    private readonly entitlementService: AiEntitlementService,
    private readonly circuitBreaker: AiCircuitBreakerService,
    private readonly contextBuilder: AiAcademicContextBuilder,
    private readonly txRunner: TransactionRunnerService,
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
  ) {}

  /**
   * Incremento 7 -- borrado manual, propio de la cuenta ("me"). Mismo
   * criterio 404-uniforme que el resto del dominio (`findByIdForAccount`):
   * conversación inexistente y conversación de otra cuenta son
   * INDISTINGUIBLES para quien pregunta -- cuenta B nunca puede inferir que
   * la conversación de A existe. La eliminación real (mensajes, reportes,
   * desvinculación del ledger, claims) vive en `AiRetentionService`
   * (reutilizada también por el barrido de retención y el cierre de
   * cuenta) -- este método SOLO añade la verificación de ownership.
   */
  async deleteConversation(accountId: string, conversationId: string): Promise<void> {
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);
    await this.retentionService.deleteConversationForAccount(conversationId);
  }

  /**
   * `ref` -- Incremento 4, punto de entrada 2 ("entrada contextual desde
   * Estudio"). Resuelto y VALIDADO por `AiAcademicContextBuilder` ANTES de
   * crear la fila -- una referencia inválida/inexistente/ajena nunca llega a
   * persistirse (`NotFoundException`/`BadRequestException`, nunca se llama
   * al proveedor). `ref` ausente/vacío = punto de entrada 1 (pestaña
   * dedicada, sin contexto).
   */
  async createConversation(accountId: string, ref: AcademicContextRefInput = {}): Promise<AiConversationSummaryView> {
    const resolvedRef = await this.contextBuilder.resolveContextRef(ref);
    const conversation = await this.conversationRepo.create(accountId, resolvedRef);
    const entitlement = await this.entitlementService.getEntitlement(accountId);
    const [dailyQuota, academicContext] = await Promise.all([
      this.getDailyQuotaView(accountId, entitlement),
      this.getAcademicContextSummary(accountId, resolvedRef),
    ]);
    return { conversation, turnCount: 0, maxTurns: entitlement.maxTurns, dailyQuota, academicContext };
  }

  /**
   * Incremento 8 (cierre del hueco detectado en la verificación práctica) --
   * estado de cuenta del Tutor, SIN conversación previa. Es una operación
   * PURAMENTE DE LECTURA: no crea conversación, no crea mensaje, no escribe
   * en `ai_usage_ledger` (solo lo CUENTA, vía `getDailyQuotaView`), no toca
   * `AiGenerationClaim`, y NUNCA invoca a `AiProvider` (ni siquiera al fake:
   * este método no tiene ninguna referencia al proveedor).
   *
   * Reutiliza EXACTAMENTE la misma `getDailyQuotaView` que ya alimenta
   * `createConversation`/`listConversations`/`getConversation`/`sendMessage`
   * -- la fórmula de cuota (día UTC + ledger + entitlement) existe en UN
   * solo lugar y no se duplica aquí ni en el controller.
   */
  async getAccountStatus(accountId: string): Promise<AiAccountStatusView> {
    const entitlement = await this.entitlementService.getEntitlement(accountId);
    const dailyQuota = await this.getDailyQuotaView(accountId, entitlement);
    return { dailyQuota };
  }

  async listConversations(accountId: string): Promise<AiConversationSummaryView[]> {
    const conversations = await this.conversationRepo.listByAccountId(accountId);
    const entitlement = await this.entitlementService.getEntitlement(accountId);
    const dailyQuota = await this.getDailyQuotaView(accountId, entitlement);
    return Promise.all(
      conversations.map(async (conversation) => ({
        conversation,
        turnCount: await this.messageRepo.countByConversationIdAndRole(conversation.id, 'ASSISTANT'),
        maxTurns: entitlement.maxTurns,
        dailyQuota,
        academicContext: await this.getAcademicContextSummary(accountId, this.refFromConversation(conversation)),
      })),
    );
  }

  async getConversation(accountId: string, conversationId: string): Promise<AiConversationDetailView> {
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);

    const entitlement = await this.entitlementService.getEntitlement(accountId);
    const [messages, turnCount, dailyQuota, academicContext] = await Promise.all([
      this.messageRepo.listByConversationId(conversationId),
      this.messageRepo.countByConversationIdAndRole(conversationId, 'ASSISTANT'),
      this.getDailyQuotaView(accountId, entitlement),
      this.getAcademicContextSummary(accountId, this.refFromConversation(conversation)),
    ]);

    return { conversation, messages, turnCount, maxTurns: entitlement.maxTurns, dailyQuota, academicContext };
  }

  async sendMessage(
    accountId: string,
    conversationId: string,
    input: { content: string; operationId: string; requestedMode?: AiAssistanceMode | null },
  ): Promise<SendAiMessageView> {
    // 404 uniforme -- misma verificación de propiedad que getConversation, nunca solo por id.
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);

    // 1. Replay exacto por operationId -- idempotencia de transporte, mismo criterio que ProgressService.submitResponse (ADR-0014).
    const existingUserMessage = await this.messageRepo.findByOperationId(input.operationId);
    if (existingUserMessage) {
      if (existingUserMessage.conversationId !== conversationId) {
        // Mismo operationId reutilizado en otra conversación -- nunca se mezclan operaciones distintas bajo la misma clave de idempotencia.
        throw new ConflictException('Este operationId ya fue usado en otra conversación.');
      }
      return this.resolveExistingOperation(accountId, existingUserMessage);
    }

    const entitlement = await this.entitlementService.getEntitlement(accountId);

    // 2-3. Admisión ATÓMICA (límite de turnos + cuota diaria) -- ver docstring de la clase. Reserva un cupo (AiGenerationClaim) ANTES de crear el mensaje USER.
    try {
      await this.admitNewOperation(accountId, conversationId, input.operationId, entitlement);
    } catch (error) {
      if (error instanceof TurnLimitExceededError) {
        throw new ConflictException('Se alcanzó el límite de turnos de esta conversación. Inicia una conversación nueva para continuar.');
      }
      if (error instanceof DailyQuotaExceededError) {
        throw new ConflictException('Se alcanzó el límite diario de consultas al Tutor IA. Vuelve a intentarlo cuando se reinicie tu cuota.');
      }
      if (error instanceof OperationAlreadyExistsError || isUniqueConstraintViolation(error)) {
        // Carrera real: OTRA petición concurrente con el MISMO operationId ya existe (ganó la admisión, o incluso ya completó el ciclo entero) --
        // NUNCA un rechazo real, es el mismo caso que un replay/retry. Esperar acotadamente a que el USER exista y delegar en la misma ruta
        // que cualquier operación ya vista (que a su vez detecta correctamente si ya está completa -- replay puro -- o todavía pendiente).
        const winnerUserMessage = await this.waitForUserMessageByOperationId(input.operationId);
        if (winnerUserMessage) return this.resolveExistingOperation(accountId, winnerUserMessage);
        throw new ServiceUnavailableException('El Tutor IA está procesando esta operación. Vuelve a intentarlo en unos segundos.');
      }
      throw error;
    }

    // 4. Insertar el mensaje USER -- durable de inmediato, independiente del resultado del proveedor.
    const userMessage = await this.createUserMessageWithRetry(conversationId, input);

    return this.completeAssistantReply(accountId, userMessage, entitlement);
  }

  /**
   * Incremento 6 (PRD AI-015) -- mecanismo MÍNIMO de reporte, ver
   * `AiResponseReport`. "Un reporte no modifica automáticamente la
   * respuesta" -- este método NUNCA toca `AiMessage.content`, solo persiste
   * el reporte. Mismo criterio de ownership 404-uniforme que el resto del
   * dominio (conversación ajena/inexistente -> mismo mensaje/código que
   * `getConversation`). Solo mensajes `ASSISTANT` son reportables -- reportar
   * el propio mensaje del estudiante no tiene sentido de producto.
   */
  async reportMessage(
    accountId: string,
    conversationId: string,
    messageId: string,
    input: { reportType: AiResponseReportType; description?: string },
  ): Promise<AiResponseReport> {
    const conversation = await this.conversationRepo.findByIdForAccount(conversationId, accountId);
    if (!conversation) throw new NotFoundException(CONVERSATION_NOT_FOUND_MESSAGE);

    const message = await this.messageRepo.findById(messageId);
    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Este mensaje no existe o no está disponible.');
    }
    if (message.role !== 'ASSISTANT') {
      throw new BadRequestException('Solo se puede reportar una respuesta del Tutor.');
    }

    return this.responseReportRepo.create({
      assistantMessageId: messageId,
      accountId,
      reportType: input.reportType,
      description: input.description ?? null,
    });
  }

  /** Espera acotada (poll) a que OTRA petición concurrente, que ganó la reserva de admisión para el MISMO operationId, termine de crear el mensaje USER. Nunca llama al proveedor. */
  private async waitForUserMessageByOperationId(operationId: string): Promise<AiMessage | null> {
    const deadline = Date.now() + LOSER_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const found = await this.messageRepo.findByOperationId(operationId);
      if (found) return found;
      await sleep(LOSER_POLL_INTERVAL_MS);
    }
    return null;
  }

  /**
   * Admisión serializada (turnos + cuota) -- ver docstring de la clase,
   * mecanismo 1. Cuenta ASSISTANT ya persistidos + reservas activas
   * (`AiGenerationClaim` no expiradas) DENTRO de la misma transacción
   * SERIALIZABLE que crea la reserva -- nunca dos operaciones distintas
   * pueden observar el mismo cupo "libre" y admitirse ambas.
   *
   * Primero re-verifica, DENTRO de la misma transacción, que ningún
   * `AiMessage` con este `operationId` exista ya -- cierra una carrera real
   * (ver reporte de auditoría de concurrencia): la comprobación NO
   * transaccional al inicio de `sendMessage` puede quedar obsoleta si, entre
   * esa lectura y este punto, OTRA petición concurrente con el MISMO
   * operationId ya ganó la admisión, creó el USER, generó la respuesta Y
   * borró su propia reserva (ciclo completo) -- sin esta re-verificación, la
   * reserva ya eliminada dejaría de bloquear el `INSERT` por PK, permitiendo
   * una segunda admisión fantasma para una operación que ya terminó.
   */
  private async admitNewOperation(accountId: string, conversationId: string, operationId: string, entitlement: AiEntitlement): Promise<void> {
    await this.runSerializable(async (tx) => {
      const alreadyExists = await this.messageRepo.findByOperationId(operationId, tx);
      if (alreadyExists) throw new OperationAlreadyExistsError();

      const now = new Date();
      const { start, end } = utcDayRange(now);
      const [turnCount, activeTurnReservations, consumedToday, activeQuotaReservations] = await Promise.all([
        this.messageRepo.countByConversationIdAndRole(conversationId, 'ASSISTANT', tx),
        this.claimRepo.countActiveReservationsForConversation(tx, conversationId, now),
        this.usageLedgerRepo.countConsumedToday(accountId, start, end, tx),
        this.claimRepo.countActiveReservationsForAccount(tx, accountId, now),
      ]);

      if (turnCount + activeTurnReservations >= entitlement.maxTurns) {
        throw new TurnLimitExceededError();
      }
      if (consumedToday + activeQuotaReservations >= entitlement.dailyRequestLimit) {
        throw new DailyQuotaExceededError();
      }

      await this.claimRepo.create({ operationId, accountId, conversationId, reservationExpiresAt: new Date(now.getTime() + RESERVATION_TTL_MS) }, tx);
    });
  }

  /** Operación ya vista antes (mismo operationId) -- replay puro si ya está completa, o reintento del paso de generación si quedó parcial. NUNCA re-verifica cuota ni límite de turnos -- la reserva de admisión ya existe (mismo criterio que I1 para el límite de turnos, extendido a la cuota diaria). */
  private async resolveExistingOperation(accountId: string, userMessage: AiMessage): Promise<SendAiMessageView> {
    const entitlement = await this.entitlementService.getEntitlement(accountId);
    const nextSequenceMessage = await this.messageRepo.findBySequence(userMessage.conversationId, userMessage.sequence + 1);
    if (nextSequenceMessage && nextSequenceMessage.role === 'ASSISTANT') {
      // Operación ya completada -- replay puro, el proveedor NUNCA se invoca de nuevo (invariante 11/12 del bloque). Tampoco se vuelve a consumir cuota (la fila del ledger ya existe, se lee tal cual).
      return this.buildSendMessageView(accountId, userMessage, nextSequenceMessage, entitlement);
    }
    // USER existe, ASSISTANT todavía no -- fallo parcial anterior; reintenta ÚNICAMENTE la generación, sin duplicar el mensaje USER ni re-chequear admisión.
    return this.completeAssistantReply(accountId, userMessage, entitlement);
  }

  private async createUserMessageWithRetry(
    conversationId: string,
    input: { content: string; operationId: string; requestedMode?: AiAssistanceMode | null },
    attempt = 0,
  ): Promise<AiMessage> {
    const sequence = await this.messageRepo.nextSequence(conversationId);
    try {
      return await this.messageRepo.create({
        conversationId,
        role: 'USER',
        content: input.content,
        sequence,
        operationId: input.operationId,
        requestedMode: input.requestedMode ?? null,
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;

      // Carrera real -- dos causas posibles, distinguidas por consulta directa (nunca se asume cuál fue):
      // (a) el MISMO operationId ganó en otra petición concurrente -- releer y tratar como replay.
      const winner = await this.messageRepo.findByOperationId(input.operationId);
      if (winner) return winner;
      // (b) colisión de secuencia por concurrencia real dentro de la misma conversación -- reintentar con la secuencia recalculada (acotado, evita bucle infinito ante un fallo persistente real).
      if (attempt >= 3) throw error;
      return this.createUserMessageWithRetry(conversationId, input, attempt + 1);
    }
  }

  /**
   * Fase "provider call" -- adquiere el lease de generación (mecanismo 2 de
   * la docstring de la clase) antes de invocar al proveedor. Quien no lo
   * adquiere NUNCA llama al proveedor.
   */
  private async completeAssistantReply(accountId: string, userMessage: AiMessage, entitlement: AiEntitlement): Promise<SendAiMessageView> {
    if (this.circuitBreaker.isGenerationDisabled()) {
      // Degradación controlada idéntica a un fallo técnico del proveedor -- el proveedor NUNCA se invoca, cero consumo, USER sigue persistido y reintentable.
      throw new ServiceUnavailableException('El Tutor IA no está disponible en este momento. Puedes reintentar.');
    }

    const operationId = userMessage.operationId!;
    const now = new Date();
    const leaseAcquired = await this.claimRepo.tryAcquireGenerationLease(operationId, new Date(now.getTime() + GENERATION_LEASE_TTL_MS), now);

    if (!leaseAcquired) {
      // Otra petición física está generando AHORA MISMO para esta misma operación -- esperar acotadamente su resultado en vez de pagar una segunda llamada al proveedor.
      const winnerAssistant = await this.waitForConcurrentCompletion(userMessage);
      if (winnerAssistant) return this.buildSendMessageView(accountId, userMessage, winnerAssistant, entitlement);
      throw new ServiceUnavailableException('El Tutor IA está procesando esta operación. Vuelve a intentarlo en unos segundos.');
    }

    const priorMessages = (await this.messageRepo.listByConversationId(userMessage.conversationId)).filter((m) => m.id !== userMessage.id);

    // Incremento 4 -- resuelto EN VIVO desde la referencia guardada en la conversación (nunca desde una copia). `null` si la conversación no tiene contexto asociado (punto de entrada 1).
    const conversation = await this.conversationRepo.findByIdForAccount(userMessage.conversationId, accountId);
    const academicContext = conversation ? await this.contextBuilder.buildContextPackage(accountId, this.refFromConversation(conversation)) : null;

    let reply: Awaited<ReturnType<AiProvider['generateReply']>>;
    try {
      reply = await this.provider.generateReply(
        priorMessages.map((m) => ({ role: m.role, content: m.content })),
        userMessage.content,
        academicContext,
        // Incremento 5 -- leído del propio mensaje USER YA persistido (nunca del body de la petición actual), para que un retry/replay de la MISMA operación reutilice el mismo modo, nunca uno distinto.
        userMessage.requestedMode as AiAssistanceMode | null,
      );
    } catch (error) {
      // Libera el lease de inmediato -- un reintento inmediato del mismo operationId no debe esperar GENERATION_LEASE_TTL_MS.
      await this.claimRepo.releaseGenerationLease(operationId);
      if (error instanceof AiProviderTechnicalError) {
        // Incremento 6 (revisión Product Owner) -- un bloqueo de seguridad NATIVO del proveedor NUNCA es "servicio no disponible":
        // el proveedor SÍ respondió, simplemente no hay respuesta pedagógica utilizable. Outcome de aplicación estable y distinto
        // (422/AI_SAFETY_BLOCKED), nunca el mismo 503 que un fallo técnico real -- pero mismo criterio de cero consumo/cero ASSISTANT/
        // cero ledger que cualquier otro AiProviderTechnicalError (el mensaje USER YA está persistido y sigue estándolo, reintentable).
        if (error.category === 'provider_safety_refusal') {
          throw new UnprocessableEntityException({ code: AI_SAFETY_BLOCKED_CODE, message: AI_SAFETY_BLOCKED_MESSAGE });
        }
        // Degradación controlada (invariante 14) -- el mensaje USER YA está persistido y sigue estándolo; el estudiante puede reintentar con el mismo operationId sin duplicar nada. Cero consumo.
        throw new ServiceUnavailableException('El Tutor IA no está disponible en este momento. Puedes reintentar.');
      }
      throw error;
    }

    const { assistantMessage } = await this.persistConsumedReply(accountId, userMessage, reply);

    const now2 = new Date();
    await this.conversationRepo.touchLastMessageAt(userMessage.conversationId, now2);

    return this.buildSendMessageView(accountId, userMessage, assistantMessage, entitlement);
  }

  /** Espera acotada (poll) a que la petición que sí tiene el lease de generación termine -- nunca llama al proveedor. */
  private async waitForConcurrentCompletion(userMessage: AiMessage): Promise<AiMessage | null> {
    const deadline = Date.now() + LOSER_POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const next = await this.messageRepo.findBySequence(userMessage.conversationId, userMessage.sequence + 1);
      if (next && next.role === 'ASSISTANT') return next;
      await sleep(LOSER_POLL_INTERVAL_MS);
    }
    return null;
  }

  /**
   * Fase "after provider": persiste el ASSISTANT + la fila de consumo +
   * borra la reserva/lease, en UNA transacción atómica (ver docstring de la
   * clase). `userMessage.operationId` nunca es null aquí -- solo los
   * mensajes USER llegan a esta función, y `operationId` es obligatorio en
   * la creación de todo mensaje USER.
   */
  private async persistConsumedReply(
    accountId: string,
    userMessage: AiMessage,
    reply: Awaited<ReturnType<AiProvider['generateReply']>>,
  ): Promise<{ assistantMessage: AiMessage; ledgerEntry: AiUsageLedgerEntry }> {
    const operationId = userMessage.operationId!;
    const occurredAt = new Date();

    try {
      return await this.txRunner.run(async (tx) => {
        const assistantSequence = await this.messageRepo.nextSequence(userMessage.conversationId, tx);
        const assistantMessage = await this.messageRepo.create(
          {
            conversationId: userMessage.conversationId,
            role: 'ASSISTANT',
            content: reply.content,
            sequence: assistantSequence,
          },
          tx,
        );

        const ledgerEntry = await this.usageLedgerRepo.create(
          {
            accountId,
            conversationId: userMessage.conversationId,
            assistantMessageId: assistantMessage.id,
            operationId,
            provider: reply.usage?.provider ?? 'unknown',
            model: reply.usage?.model ?? 'unknown',
            promptVersion: reply.usage?.promptVersion ?? 'unknown',
            inputTokens: reply.usage?.inputTokens ?? null,
            outputTokens: reply.usage?.outputTokens ?? null,
            attempts: reply.usage?.attempts ?? 1,
            latencyMs: reply.usage?.latencyMs ?? 0,
            occurredAt,
          },
          tx,
        );

        await this.claimRepo.deleteByOperationId(operationId, tx);

        return { assistantMessage, ledgerEntry };
      });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;

      // Carrera real: otra petición concurrente reintentando la MISMA operación pendiente ya ganó -- releer FUERA de cualquier transacción (mismo patrón que XpGrantService.grantForActivity) y devolver su resultado, nunca duplicar el consumo.
      const existingLedgerEntry = await this.usageLedgerRepo.findByOperationId(operationId);
      // assistantMessageId nunca es null aquí -- esta fila se creó hace instantes (misma operación, carrera de INSERT),
      // la desvinculación de Incremento 7 solo ocurre al eliminar una conversación, imposible en esta ventana.
      if (existingLedgerEntry?.assistantMessageId) {
        const winnerAssistant = await this.messageRepo.findById(existingLedgerEntry.assistantMessageId);
        if (winnerAssistant) return { assistantMessage: winnerAssistant, ledgerEntry: existingLedgerEntry };
      }
      throw error;
    }
  }

  private async buildSendMessageView(accountId: string, userMessage: AiMessage, assistantMessage: AiMessage, entitlement: AiEntitlement): Promise<SendAiMessageView> {
    const conversation = await this.conversationRepo.findByIdForAccount(userMessage.conversationId, accountId);
    const [turnCount, dailyQuota, academicContext] = await Promise.all([
      this.messageRepo.countByConversationIdAndRole(userMessage.conversationId, 'ASSISTANT'),
      this.getDailyQuotaView(accountId, entitlement),
      conversation ? this.getAcademicContextSummary(accountId, this.refFromConversation(conversation)) : Promise.resolve(null),
    ]);
    return { userMessage, assistantMessage, turnCount, maxTurns: entitlement.maxTurns, dailyQuota, academicContext };
  }

  private async getDailyQuotaView(accountId: string, entitlement: AiEntitlement): Promise<DailyQuotaView> {
    const { start, end } = utcDayRange(new Date());
    const consumed = await this.usageLedgerRepo.countConsumedToday(accountId, start, end);
    return { limit: entitlement.dailyRequestLimit, consumed, remaining: Math.max(0, entitlement.dailyRequestLimit - consumed), resetAt: end };
  }

  private refFromConversation(conversation: AiConversation): ResolvedAcademicContextRef {
    return { contextQuestionVersionId: conversation.contextQuestionVersionId, contextCurriculumTopicId: conversation.contextCurriculumTopicId };
  }

  /** Eco mínimo (subjectName/topicName) para la respuesta HTTP -- ver `AcademicContextSummaryView`. Reusa `buildContextPackage` (misma resolución en vivo) y descarta el resto del paquete. */
  private async getAcademicContextSummary(accountId: string, ref: ResolvedAcademicContextRef): Promise<AcademicContextSummaryView | null> {
    const full = await this.contextBuilder.buildContextPackage(accountId, ref);
    if (!full) return null;
    return { subjectName: full.subjectName, topicName: full.topicName };
  }

  /**
   * Aislamiento SERIALIZABLE -- mismo criterio EXACTO que
   * `XpGrantService.runSerializable` (Bloque I): un conteo seguido de un
   * INSERT dentro de una transacción normal no impide que dos transacciones
   * concurrentes lean el mismo total "bajo el tope" antes de que cualquiera
   * confirme. Ante conflicto real, Postgres aborta una de las dos --
   * reintento acotado (máx. 3, backoff fijo pequeño).
   *
   * IMPORTANTE (hallazgo correctivo Fase B): el conflicto NO siempre llega
   * como `P2034`. Ver `isSerializationConflict` -- aquí casi siempre lo
   * detecta Postgres en el COMMIT y llega como `DriverAdapterError`
   * (`cause.kind === 'TransactionWriteConflict'`). Si tras agotar los
   * reintentos el conflicto persiste, se degrada a 503 técnico
   * (`AI_ADMISSION_CONTENTION_MESSAGE`), NUNCA a un 409 de cuota/turnos.
   *
   * Este retry es COMPLETAMENTE INDEPENDIENTE del retry de red del proveedor
   * Anthropic (`AnthropicAiProvider`): aquel es sobre llamadas HTTP externas,
   * este es sobre conflictos de aislamiento de Postgres.
   */
  private async runSerializable<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
      attempt++;
      try {
        return await this.txRunner.run(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (!isSerializationConflict(error)) throw error;
        if (attempt >= MAX_SERIALIZABLE_RETRIES) {
          // Retries AGOTADOS con el conflicto todavía sin resolver -- ver AI_ADMISSION_CONTENTION_MESSAGE.
          // La transacción abortó ENTERA (ningún AiGenerationClaim creado), y `admitNewOperation` es el paso
          // PREVIO a crear el mensaje USER: por construcción no hay USER nuevo, no hay ASSISTANT, no hay fila
          // de ledger y el proveedor nunca se invoca. Solo el detalle interno se loguea, jamás se propaga.
          this.logger.error(
            `Conflicto serializable en admisión NO resuelto tras ${MAX_SERIALIZABLE_RETRIES} intentos -- degradando a 503: ${String(error)}`,
          );
          throw new ServiceUnavailableException(AI_ADMISSION_CONTENTION_MESSAGE);
        }
        const cause = error instanceof Prisma.PrismaClientKnownRequestError ? (error.meta?.cause ?? error.message) : String(error);
        this.logger.warn(`Conflicto serializable en admisión (intento ${attempt}/${MAX_SERIALIZABLE_RETRIES}): ${cause} -- reintentando`);
        const backoffIndex = Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1);
        await sleep(RETRY_BACKOFF_MS[backoffIndex] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!);
      }
    }
  }
}
