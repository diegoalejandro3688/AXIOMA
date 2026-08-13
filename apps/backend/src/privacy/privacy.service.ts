import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ANALYTICS_SCHEMA_VERSION } from '@axioma/contracts';
import { AuthService } from '../auth/auth.service';
import { OutboxService } from '../platform/outbox/outbox.service';
import { UserService } from '../user/user.service';
import { ProgressService } from '../progress/progress.service';
import { AiRetentionService } from '../ai/ai-retention.service';
import { PrivacyRequestRepository } from './privacy-request.repository';
import type { PrivacyRequest } from '../generated/prisma/client';

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, política de retención ya aprobada
const STUCK_PROCESSING_THRESHOLD_MS = 60 * 60 * 1000; // 1 hora sin completar = atascada, candidata a reintento
const SOURCE_DOMAIN = 'PRIVACY';

/**
 * PRIVACY coordina; nunca toca las tablas de AUTH ni de USER directamente
 * -- todas las validaciones y cambios pasan por los métodos públicos de
 * cada dominio propietario.
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly privacyRequestRepo: PrivacyRequestRepository,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly progressService: ProgressService,
    private readonly aiRetentionService: AiRetentionService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Punto de entrada único para solicitar la eliminación de una cuenta.
   * AuthService valida el estado de la cuenta (lanza si ya está CLOSED o
   * ya tiene una eliminación en curso) y ejecuta la mecánica síncrona.
   */
  async requestAccountDeletion(accountId: string): Promise<void> {
    await this.authService.requestAccountDeletion(accountId);
    const request = await this.privacyRequestRepo.create({
      accountId,
      scheduledFor: new Date(Date.now() + RECOVERY_WINDOW_MS),
    });
    // ADR-0018 §5: retiro INMEDIATO al solicitar, no al completarse --
    // excluye el perfil público de toda superficie desde ya, sin esperar
    // los 30 días de plazo de recuperación. No libera el username todavía
    // (ver anonymizePublicProfileForAccountClosure, en el barrido).
    await this.userService.retirePublicProfileForAccountClosureRequest(accountId);
    this.logger.log(`PrivacyRequest ${request.id} creada para account ${accountId}`);
    await this.publishEvent('account_deletion_requested', accountId);
  }

  /**
   * Recuperación dentro del plazo. Sin endpoint HTTP (ver ADR-0005) --
   * invocable solo vía el CLI interno (src/cli/recover-account.ts) hasta
   * que exista un mecanismo real de prueba de titularidad (enlace, código,
   * reautenticación o soporte humano con proceso propio).
   *
   * Seguro ante reintentos, pero NO estrictamente idempotente: repetir la
   * llamada no corrompe estado ni reprocesa nada, pero la segunda vez
   * responde con un error claro (409), no con el mismo resultado de éxito
   * silencioso -- ver ADR-0005 para la distinción.
   */
  async cancelDeletion(accountId: string): Promise<void> {
    const request = await this.privacyRequestRepo.findActiveByAccountId(accountId);
    if (!request) {
      throw new ConflictException('No hay una solicitud de eliminación activa para esta cuenta.');
    }
    if (request.status === 'PROCESSING') {
      throw new ConflictException('El cierre definitivo ya comenzó a ejecutarse; no se puede revertir.');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Esta solicitud de eliminación ya fue resuelta.');
    }
    if (request.scheduledFor.getTime() <= Date.now()) {
      throw new ConflictException('El plazo de recuperación de 30 días ya venció.');
    }

    // AuthService.reactivateAccount valida a su vez que la cuenta siga en
    // DELETION_PENDING -- doble verificación entre el estado de PRIVACY
    // (esta solicitud) y el estado de AUTH (la cuenta), cada uno desde su
    // propio dominio.
    await this.authService.reactivateAccount(accountId);
    // ADR-0018 §5: reactivación en espejo -- el perfil público (si existía
    // y quedó RETIRED al solicitar el cierre) vuelve a ACTIVE. Permanece
    // PRIVATE (ver UserService.reactivatePublicProfileForAccountRecovery),
    // nunca se restaura VISIBLE automáticamente.
    await this.userService.reactivatePublicProfileForAccountRecovery(accountId);
    await this.privacyRequestRepo.markCancelled(request.id);
    this.logger.log(`PrivacyRequest ${request.id} cancelada (cuenta recuperada) para account ${accountId}`);
    await this.publishEvent('account_recovered', accountId);
  }

  /**
   * Cierre definitivo. Procesa solicitudes vencidas (PENDING) y solicitudes
   * atascadas (PROCESSING hace más de una hora sin completar -- un intento
   * previo se cayó a mitad de camino). Nunca marca CLOSED hasta que
   * finalizeAccountClosure complete SIN excepción -- si falla (Firebase
   * caído, error de Postgres, lo que sea), la solicitud queda en
   * PROCESSING para el próximo intento, no se pierde ni se marca como
   * completada a medias.
   */
  async runAccountDeletionSweep(): Promise<{ processed: number; failed: number }> {
    const now = new Date();
    const due = await this.privacyRequestRepo.findDue(now);
    const stuck = await this.privacyRequestRepo.findStuckProcessing(
      new Date(now.getTime() - STUCK_PROCESSING_THRESHOLD_MS),
    );
    const candidates: PrivacyRequest[] = [...due, ...stuck];

    let processed = 0;
    let failed = 0;

    for (const request of candidates) {
      await this.privacyRequestRepo.markProcessing(request.id, request.processingStartedAt);

      try {
        await this.authService.finalizeAccountClosure(request.accountId);
        // Dato personal de USER -- se elimina por completo (no se
        // anonimiza, no hay necesidad de conservar la fila). Dentro del
        // mismo try: si fallara, la solicitud queda PROCESSING para
        // reintento, igual que un fallo de finalizeAccountClosure (ver
        // ADR-0008). Seguro si la cuenta nunca inicializó su perfil.
        await this.userService.deleteProfileForAccountClosure(request.accountId);
        // public_profile (ADR-0018) NO se elimina -- se ANONIMIZA (terminal,
        // no reversible): a diferencia de UserProfile, es una identidad
        // pública referenciada por bloques futuros (Competir, Gamificación
        // Avanzada); conserva la fila para integridad referencial, limpia
        // avatarReference, y deja el username sujeto a su ventana de
        // reserva (ver comentario de deuda diferida en el modelo Prisma).
        // Mismo criterio de "dentro del mismo try, antes de markCompleted"
        // que el resto de este bloque.
        await this.userService.anonymizePublicProfileForAccountClosure(request.accountId);
        // Dato personal de PROGRESS (respuestas y avance) -- mismo criterio
        // que USER arriba: dentro del mismo try, antes de markCompleted. Si
        // falla, la solicitud queda PROCESSING para reintento -- nunca se
        // marca completada con una eliminación parcial (ver ADR-0014, punto 2).
        await this.progressService.deleteProgressForAccountClosure(request.accountId);
        // LEF Bloque VI, Incremento 7 -- dato personal del Tutor IA (conversaciones/mensajes/reportes/reservas
        // efímeras): se elimina por completo, mismo criterio que USER/PROGRESS arriba. El usage ledger de la
        // cuenta NO se borra aquí -- se DESVINCULA (conversationId/assistantMessageId/operationId -> NULL) y sigue
        // su propia política independiente de 90 días desde occurredAt (ver AiRetentionService, política del
        // Product Owner 2026-08-12) -- Account nunca se borra al cerrar una cuenta, así que accountId permanece
        // válido en esas filas sin ningún FK roto.
        await this.aiRetentionService.deleteAllForAccountClosure(request.accountId);
        await this.privacyRequestRepo.markCompleted(request.id);
        processed++;
        this.logger.log(
          `PrivacyRequest ${request.id} completada (cierre definitivo) para account ${request.accountId}`,
        );
        await this.publishEvent('account_deletion_completed', request.accountId);
      } catch (error) {
        failed++;
        this.logger.error(
          `PrivacyRequest ${request.id} falló durante el cierre definitivo -- queda en PROCESSING para reintento: ${error}`,
        );
        // No se relanza: el barrido sigue con las demás solicitudes.
      }
    }

    return { processed, failed };
  }

  /** Barrido de datos temporales existentes (hoy: sesiones vencidas). */
  async runSessionCleanupSweep(): Promise<{ deleted: number }> {
    const deleted = await this.authService.cleanupExpiredSessions();
    return { deleted };
  }

  /**
   * LEF Bloque VI, Incremento 7 -- barrido de retención del Tutor IA, TRES
   * políticas independientes en una sola llamada (ver `AiRetentionService`):
   * conversaciones expiradas (90 días desde última actividad), entradas de
   * ledger expiradas (90 días propios desde `occurredAt`), y reservas de
   * generación huérfanas/expiradas. Cada una es su propio barrido acotado
   * por batch e idempotente -- un fallo aislado en una conversación nunca
   * detiene a las demás (ver `AiRetentionService.purgeExpiredConversations`).
   */
  async runAiRetentionSweep(): Promise<{ conversations: { purged: number; failed: number }; ledgerEntries: { deleted: number }; claims: { deleted: number } }> {
    const conversations = await this.aiRetentionService.purgeExpiredConversations();
    const ledgerEntries = await this.aiRetentionService.purgeExpiredLedgerEntries();
    const claims = await this.aiRetentionService.cleanupExpiredClaims();
    return { conversations, ledgerEntries, claims };
  }

  /**
   * Publica un hecho ya ocurrido para ANALYTICS -- ver ADR-0006. Llamado
   * DESPUÉS de que el cambio de estado ya confirmó; best-effort, nunca
   * puede hacer fallar la operación de PRIVACY.
   */
  private async publishEvent(
    eventKey: 'account_deletion_requested' | 'account_deletion_completed' | 'account_recovered',
    accountId: string,
  ) {
    await this.outbox.publish({
      eventKey,
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      sourceDomain: SOURCE_DOMAIN,
      aggregateId: accountId,
      payload: { accountId },
    });
  }
}
