import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrivacyRequestRepository } from './privacy-request.repository';
import type { PrivacyRequest } from '../generated/prisma/client';

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 días, política de retención ya aprobada
const STUCK_PROCESSING_THRESHOLD_MS = 60 * 60 * 1000; // 1 hora sin completar = atascada, candidata a reintento

/**
 * PRIVACY coordina; nunca toca las tablas de AUTH directamente -- todas las
 * validaciones y cambios sobre `account`/`auth_identity`/`auth_session`
 * pasan por los métodos públicos de AuthService, que es quien los posee.
 */
@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(
    private readonly privacyRequestRepo: PrivacyRequestRepository,
    private readonly authService: AuthService,
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
    this.logger.log(`PrivacyRequest ${request.id} creada para account ${accountId}`);
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
    await this.privacyRequestRepo.markCancelled(request.id);
    this.logger.log(`PrivacyRequest ${request.id} cancelada (cuenta recuperada) para account ${accountId}`);
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
        await this.privacyRequestRepo.markCompleted(request.id);
        processed++;
        this.logger.log(
          `PrivacyRequest ${request.id} completada (cierre definitivo) para account ${request.accountId}`,
        );
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
}
