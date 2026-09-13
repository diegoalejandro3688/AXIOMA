import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ANALYTICS_SCHEMA_VERSION } from '@axioma/contracts';
import { AuthService } from '../auth/auth.service';
import { OutboxService } from '../platform/outbox/outbox.service';
import { UserService } from '../user/user.service';
import { ProgressService } from '../progress/progress.service';
import { AiRetentionService } from '../ai/ai-retention.service';
import { SubscriptionService } from '../subscription/subscription.service';
// WEB-0D.1B-P0A -- el cierre definitivo también elimina el historial personal
// de Ensayos (PAES) y de Pregunta rápida, mismo criterio que USER/PROGRESS/AI.
import { ExamService } from '../exams/exam.service';
import { QuickQuestionService } from '../gamification/quick-question.service';
import { GamificationService } from '../gamification/gamification.service';
import { GamificationPrivacyService } from '../gamification/gamification-privacy.service';
import { ModerationPrivacyService } from '../user/moderation-privacy.service';
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
    private readonly subscriptionService: SubscriptionService,
    private readonly examService: ExamService,
    private readonly quickQuestionService: QuickQuestionService,
    private readonly gamificationService: GamificationService,
    private readonly gamificationPrivacyService: GamificationPrivacyService,
    private readonly moderationPrivacyService: ModerationPrivacyService,
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
        // WEB-0D.1C-B3-R1 §3 -- `finalizeAccountClosure` YA NO marca
        // `Account.status = CLOSED` (ver ese método en AuthService). Solo
        // desvincula/anonimiza identidades -- terminal e idempotente ante
        // reintento. El estado CLOSED en sí se marca al FINAL de este
        // bloque (`markAccountClosed`, justo antes de `markCompleted`), una
        // vez que TODOS los pasos -- incluida la pseudonimización de B3 --
        // completaron sin excepción. Así, un fallo en cualquier paso
        // posterior nunca deja la cuenta en un CLOSED falsamente completo.
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
        // WEB-0D.1C-A -- borrado de propiedad/estado ACTUAL de GAMIFICATION
        // sin propósito tras el cierre (xp_balance, account_title,
        // inventory_item) -- DEBE ejecutarse DESPUÉS de
        // anonymizePublicProfileForAccountClosure: esa llamada ya vació
        // equipped_title/equipped_cosmetic para este perfil, condición
        // necesaria para que account_title/inventory_item.deleteByAccountId
        // no choque con su FK `ON DELETE RESTRICT`. NO toca ningún ledger
        // histórico (xp_ledger_entry, league_point_ledger_entry,
        // validated_gamification_activity, reward_grant, achievement_unlock)
        // ni season_league_participation/leaderboard_entry ni
        // account_challenge* -- fuera de alcance de este bloque (ver
        // WEB-0D.1C-B). Mismo criterio "dentro del mismo try, antes de
        // markCompleted" que el resto: si falla, la solicitud queda
        // PROCESSING para reintento, nunca se marca completada a medias.
        await this.gamificationService.deleteCurrentStateForAccountClosure(request.accountId);
        // WEB-0D.1C-B3 (+ B3-R1) -- pseudonimización histórica
        // INMEDIATA-SEGURA (XpLedgerEntry/RewardGrant/AchievementProgress/
        // AchievementUnlock/LeaguePointLedgerEntry) en UNA sola transacción
        // por cuenta -- DEBE ejecutarse DESPUÉS de
        // deleteCurrentStateForAccountClosure (misma razón exacta que esa
        // llamada respecto de anonymizePublicProfile: opera sobre estado
        // YA sin equipped_*/ownership vivo). `Account.status` sigue
        // DELETION_PENDING en este punto (el CLOSED se marca al final, ver
        // `markAccountClosed` más abajo) -- si esto falla (p.ej.
        // GAMIFICATION_ACTOR_SECRET ausente, o una colisión de RewardGrant
        // que exige reconciliación en B5, ver `RewardGrantReconciliationRequiredError`),
        // la transacción completa de las 5 familias se revierte, la
        // solicitud queda PROCESSING para reintento, y la cuenta NUNCA
        // llega a marcarse CLOSED con un historial parcialmente
        // pseudonimizado -- ver el reporte de B3-R1 §D/§E/§G/§H.
        // ValidatedGamificationActivity/SeasonLeagueParticipation quedan
        // fuera de ESTA llamada específica (semántica de las 5 familias de
        // B3 sin modificar, por instrucción explícita de B4) -- se
        // pseudonimizan en los DOS pasos siguientes, cada uno en su propia
        // transacción independiente.
        await this.gamificationPrivacyService.pseudonymizeImmediateSafeHistory(request.accountId);
        // WEB-0D.1C-B4 -- MODELO A: ValidatedGamificationActivity. Seguro
        // para CUALQUIER fila de esta cuenta ya CLOSED (ver el reporte de
        // B4 §C: el hardening de `findPendingGrant` con `account_id IS NOT
        // NULL` cierra el único punto ciego real). Si falla (secreto
        // ausente o colisión legacy->v2 que exige reconciliación en B5),
        // misma consistencia eventual que cada paso anterior: la solicitud
        // queda PROCESSING para reintento, la cuenta nunca llega a marcarse
        // CLOSED con esto a medias.
        await this.gamificationPrivacyService.pseudonymizeDrainedValidatedActivity(request.accountId);
        // WEB-0D.1C-B4 -- MODELO B (lado de cierre): SeasonLeagueParticipation
        // que YA era terminal (temporada/grupo ya finalizado) en el momento
        // de este cierre. El caso inverso (participación que se vuelve
        // terminal DESPUÉS de que esta cuenta ya cerró) lo cubre
        // `LeaderboardFinalizationService.finalizeGroup` por su cuenta, en
        // el momento exacto en que la finalización ocurre -- ver el reporte
        // de B4 §J. Participaciones todavía ACTIVE en una temporada en
        // curso permanecen intencionalmente identificables (ver B4 §H): el
        // ranking en vivo las necesita, y la cuenta CLOSED ya está excluida
        // de toda salida pública/en vivo por las protecciones existentes
        // (WEB-0D.1C-A/B0).
        await this.gamificationPrivacyService.pseudonymizeTerminalSeasonParticipations(request.accountId);
        // F1-A.4 -- moderación/trust-and-safety (PublicProfileReport/
        // AccountBlock). Opción B de F1-A.3: se retiene el historial (valor
        // de seguridad estructural -- patrones de reporte/bloqueo) pero el
        // identificador directo de la cuenta que cierra se reemplaza por un
        // pseudónimo estable (dominio de secreto propio, ver
        // `moderation-actor-ref.ts`). Mismo criterio de fallo que los tres
        // pasos de gamificación anteriores: si `MODERATION_ACTOR_SECRET`
        // falta o hay una colisión inesperada, esto lanza, la solicitud
        // queda PROCESSING para reintento, y la cuenta nunca llega a
        // marcarse CLOSED con moderación a medio pseudonimizar.
        await this.moderationPrivacyService.pseudonymizeForAccountClosure(request.accountId);
        // Dato personal de PROGRESS (respuestas y avance) -- mismo criterio
        // que USER arriba: dentro del mismo try, antes de markCompleted. Si
        // falla, la solicitud queda PROCESSING para reintento -- nunca se
        // marca completada con una eliminación parcial (ver ADR-0014, punto 2).
        await this.progressService.deleteProgressForAccountClosure(request.accountId);
        // WEB-0D.1B-P0A -- dato personal ACADÉMICO adicional detectado por la
        // auditoría de privacidad WEB-0D.1: el historial de Ensayos PAES
        // (ExamAttempt/ExamAttemptAnswer) y de Pregunta rápida
        // (QuickQuestionSession/QuickQuestionAttempt) quedaba indefinidamente
        // ligado al UUID de una cuenta ya cerrada -- mismo criterio "dentro
        // del mismo try, antes de markCompleted" que USER/PROGRESS arriba: si
        // falla, la solicitud queda PROCESSING para reintento, nunca se marca
        // completada con una eliminación parcial. NO toca XP/LP/liga/
        // temporada/logros/títulos/cosméticos ni ningún otro dominio --
        // exclusivamente estas cuatro tablas académicas.
        await this.examService.deleteAttemptsForAccountClosure(request.accountId);
        await this.quickQuestionService.deleteSessionsForAccountClosure(request.accountId);
        // LEF Bloque VI, Incremento 7 -- dato personal del Tutor IA (conversaciones/mensajes/reportes/reservas
        // efímeras): se elimina por completo, mismo criterio que USER/PROGRESS arriba. El usage ledger de la
        // cuenta NO se borra aquí -- se DESVINCULA (conversationId/assistantMessageId/operationId -> NULL) y sigue
        // su propia política independiente de 90 días desde occurredAt (ver AiRetentionService, política del
        // Product Owner 2026-08-12) -- Account nunca se borra al cerrar una cuenta, así que accountId permanece
        // válido en esas filas sin ningún FK roto.
        await this.aiRetentionService.deleteAllForAccountClosure(request.accountId);
        // PB-1B -- minimizacion de datos de FACTURACION en el cierre DEFINITIVO
        // (nunca al SOLICITAR la eliminacion; `finalizeAccountClosure` ya dejo
        // la cuenta CLOSED). Pone a NULL los campos diagnosticos de
        // `AccountSubscription` y NADA MAS: NUNCA borra filas (ni PENDING),
        // NUNCA muta `state`, NUNCA cancela la suscripcion de Google Play. El
        // ciclo de vida de Google sigue reconciliando para la cuenta cerrada;
        // la purga real de filas terminales y la limpieza de
        // `obfuscatedAccountId` viven en el barrido de retencion. Mismo
        // criterio "dentro del mismo try, antes de markCompleted" que
        // USER/PROGRESS/AI: si falla, la solicitud queda PROCESSING para
        // reintento, nunca se marca completada a medias.
        await this.subscriptionService.applyAccountClosure(request.accountId);
        // WEB-0D.1C-B3-R1 §3 -- marca el estado terminal SOLO ahora, una vez
        // que TODOS los pasos anteriores (incluida la pseudonimización de
        // B3) completaron sin excepción. Antes de este cambio,
        // `finalizeAccountClosure` marcaba CLOSED como su PRIMER paso --
        // un fallo posterior (p.ej. en B3) dejaba la cuenta CLOSED de forma
        // falsamente completa mientras la solicitud seguía PROCESSING. Ver
        // `AuthService.markAccountClosed` para el detalle de por qué esto
        // no debilita B0/B0R ni la revocación de sesión (ya ocurrida en
        // `requestAccountDeletion`).
        await this.authService.markAccountClosed(request.accountId);
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
