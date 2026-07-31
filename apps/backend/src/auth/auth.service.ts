import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountRepository } from './account.repository';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthSessionRepository } from './auth-session.repository';
import { IDENTITY_PROVIDER, IdentityProvider } from './identity-provider/identity-provider.interface';
import type { Account, AccountStatus } from '../generated/prisma/client';

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
   * Valida ESTA sesión específica: propiedad, expiración, revocación y
   * sessionVersion. No basta con que exista alguna sesión activa de la cuenta.
   */
  async validateSession(idToken: string, sessionId: string): Promise<SessionResult> {
    const identity = await this.identityProvider.verifyToken(idToken);

    const authIdentity = await this.authIdentityRepo.findByProviderSubject(
      PROVIDER_CODE,
      identity.providerSubject,
    );
    if (!authIdentity) throw new UnauthorizedException('Sesión inválida');

    const session = await this.authSessionRepo.findById(sessionId);
    if (!session) throw new UnauthorizedException('Sesión inválida');
    if (session.accountId !== authIdentity.accountId) throw new UnauthorizedException('Sesión inválida');
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
}
