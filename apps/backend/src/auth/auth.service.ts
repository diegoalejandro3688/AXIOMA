import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ANALYTICS_SCHEMA_VERSION } from '@axioma/contracts';
import { AccountRepository } from './account.repository';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthSessionRepository } from './auth-session.repository';
import { IDENTITY_PROVIDER, IdentityProvider } from './identity-provider/identity-provider.interface';
import { OutboxService } from '../platform/outbox/outbox.service';
import type { Account, AccountStatus } from '../generated/prisma/client';

const SOURCE_DOMAIN = 'AUTH';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const PROVIDER_CODE = 'firebase';

export interface SessionResult {
  sessionId: string;
  accountId: string;
  status: AccountStatus;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(IDENTITY_PROVIDER) private readonly identityProvider: IdentityProvider,
    private readonly accountRepo: AccountRepository,
    private readonly authIdentityRepo: AuthIdentityRepository,
    private readonly authSessionRepo: AuthSessionRepository,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Único punto de creación/vinculación de cuentas. Nunca fusiona dos UID de
   * Firebase distintos aunque compartan email -- eso es responsabilidad de
   * un flujo explícito futuro, no de este método.
   */
  async createSession(idToken: string): Promise<SessionResult> {
    const identity = await this.identityProvider.verifyToken(idToken);
    const emailNormalized = identity.email.trim().toLowerCase();

    let account: Account;
    const existing = await this.authIdentityRepo.findByProviderSubject(
      PROVIDER_CODE,
      identity.providerSubject,
    );

    if (existing) {
      const found = await this.accountRepo.findById(existing.accountId);
      if (!found) throw new UnauthorizedException('Token inválido o expirado');
      account = found;

      await this.authIdentityRepo.touchLastUsed(
        existing.id,
        identity.emailVerified ? new Date() : existing.emailVerifiedAt,
      );

      if (identity.emailVerified && account.status === 'PENDING') {
        account = await this.accountRepo.updateStatus(account.id, 'ACTIVE');
        await this.publishEvent('account_verified', account.id);
      }
    } else {
      // UID nuevo -- si el email ya está vinculado a OTRA cuenta, se rechaza.
      // Nunca se fusiona automáticamente, ni con ambos correos verificados.
      const conflict = await this.authIdentityRepo.findAnyByEmail(emailNormalized);
      if (conflict) {
        throw new ConflictException('No fue posible completar el inicio de sesión con este método.');
      }

      account = await this.accountRepo.create(identity.emailVerified ? 'ACTIVE' : 'PENDING');
      await this.authIdentityRepo.create({
        accountId: account.id,
        providerCode: PROVIDER_CODE,
        providerSubject: identity.providerSubject,
        emailNormalized,
        emailVerifiedAt: identity.emailVerified ? new Date() : null,
      });
      await this.publishEvent('account_registered', account.id);
    }

    await this.accountRepo.touchLastAuthenticated(account.id);

    const session = await this.authSessionRepo.create({
      accountId: account.id,
      sessionVersion: account.sessionVersion,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    });

    return { sessionId: session.id, accountId: account.id, status: account.status };
  }

  /**
   * Valida ESTA sesión específica a partir de su sessionId opaco (RC1A --
   * docs/adr/ZETRYND-V1-RC1A-AUTH-SESSION-LIFECYCLE.md). El sessionId (UUID
   * v4) es la credencial autoritativa de las peticiones autenticadas: el
   * idToken de Firebase se verificó una única vez en `createSession` y NO se
   * revalida aquí -- expira en ~1 h y la sesión de ZETRYND vive 30 días.
   *
   * La propiedad es intrínseca: la fila `AuthSession` ya lleva su propio
   * `accountId`, así que no hace falta cruzar contra la identidad del token.
   * Sigue comprobando expiración, revocación explícita (`revokedAt`, p. ej.
   * logout) y el cerrojo global `sessionVersion` frente a `Account`
   * (lo incrementan el borrado de cuenta y la reactivación, y un operador
   * puede subirlo a mano para matar todas las sesiones de una cuenta).
   */
  async validateSession(sessionId: string): Promise<SessionResult> {
    const session = await this.authSessionRepo.findById(sessionId);
    if (!session) throw new UnauthorizedException('Sesión inválida');
    if (session.revokedAt) throw new UnauthorizedException('Sesión inválida');
    if (session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Sesión inválida');

    const account = await this.accountRepo.findById(session.accountId);
    if (!account) throw new UnauthorizedException('Sesión inválida');
    if (session.sessionVersion !== account.sessionVersion) {
      throw new UnauthorizedException('Sesión inválida');
    }

    await this.authSessionRepo.touchLastSeen(session.id);

    return { sessionId: session.id, accountId: account.id, status: account.status };
  }

  async logout(sessionId: string): Promise<void> {
    await this.authSessionRepo.revoke(sessionId);
  }

  /**
   * Eliminación coordinada (parte síncrona -- ver ADR-0004 para lo que
   * queda diferido a Privacy Foundation): pasa la cuenta a DELETION_PENDING,
   * invalida todas las sesiones, y deshabilita TODAS las identidades
   * vinculadas en el proveedor (no solo la usada para pedir la eliminación).
   */
  async requestAccountDeletion(accountId: string): Promise<void> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) throw new NotFoundException();
    if (account.status === 'CLOSED') {
      throw new ConflictException('La cuenta ya fue cerrada definitivamente.');
    }
    if (account.status === 'DELETION_PENDING') {
      throw new ConflictException('Ya existe una solicitud de eliminación en curso para esta cuenta.');
    }

    await this.accountRepo.markDeletionPending(accountId);
    await this.accountRepo.incrementSessionVersion(accountId);
    await this.authSessionRepo.revokeAllByAccountId(accountId);

    const identities = await this.authIdentityRepo.findAllByAccountId(accountId);
    for (const identity of identities) {
      if (!identity.unlinkedAt) {
        await this.identityProvider.disableUser(identity.providerSubject);
      }
    }
  }

  /**
   * Mecánica de reactivación (llamada por PrivacyService tras validar
   * elegibilidad -- este método no conoce PrivacyRequest ni el plazo de 30
   * días, solo ejecuta la reversión sobre AUTH). Reactiva todas las
   * identidades vinculadas, restaura el estado según verificación de email,
   * limpia la marca de eliminación, e incrementa sessionVersion otra vez
   * (las sesiones previas a la solicitud de eliminación siguen revocadas;
   * esto solo garantiza que ninguna sesión intermedia quede utilizable).
   */
  async reactivateAccount(accountId: string): Promise<void> {
    const account = await this.accountRepo.findById(accountId);
    if (!account) throw new NotFoundException();
    if (account.status !== 'DELETION_PENDING') {
      throw new ConflictException('No hay una eliminación pendiente para esta cuenta.');
    }

    const identities = await this.authIdentityRepo.findAllByAccountId(accountId);
    for (const identity of identities) {
      if (!identity.unlinkedAt) {
        await this.identityProvider.enableUser(identity.providerSubject);
      }
    }

    const hasVerifiedEmail = identities.some((identity) => identity.emailVerifiedAt !== null);
    await this.accountRepo.restoreFromDeletion(accountId, hasVerifiedEmail ? 'ACTIVE' : 'PENDING');
    await this.accountRepo.incrementSessionVersion(accountId);
  }

  /**
   * Cierre definitivo (llamado por PrivacyService desde el barrido, cuando
   * el plazo de 30 días ya venció). Irreversible: a diferencia de
   * disableUser, deleteUser no tiene vuelta atrás.
   */
  async finalizeAccountClosure(accountId: string): Promise<void> {
    const identities = await this.authIdentityRepo.findAllByAccountId(accountId);
    for (const identity of identities) {
      if (!identity.unlinkedAt) {
        await this.identityProvider.deleteUser(identity.providerSubject);
        await this.authIdentityRepo.markUnlinked(identity.id);
        await this.authIdentityRepo.anonymizeEmail(identity.id);
      }
    }
    await this.accountRepo.markClosed(accountId);
  }

  /** Barrido de datos temporales: sesiones ya vencidas no tienen valor, se eliminan. */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.authSessionRepo.deleteExpired();
    return result.count;
  }

  /**
   * Publica un hecho ya ocurrido para ANALYTICS -- ver ADR-0006. Llamado
   * DESPUÉS de que el cambio de estado ya confirmó; best-effort, nunca
   * puede hacer fallar la operación de AUTH (OutboxService ya se encarga
   * de no propagar el error).
   */
  private async publishEvent(eventKey: 'account_registered' | 'account_verified', accountId: string) {
    await this.outbox.publish({
      eventKey,
      schemaVersion: ANALYTICS_SCHEMA_VERSION,
      sourceDomain: SOURCE_DOMAIN,
      aggregateId: accountId,
      payload: { accountId },
    });
  }
}
