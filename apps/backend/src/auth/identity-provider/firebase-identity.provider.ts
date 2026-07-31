import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { IdentityProvider, VerifiedIdentity } from './identity-provider.interface';

/**
 * Única clase del dominio AUTH que importa el SDK de Firebase.
 * Credenciales de la cuenta de servicio vía FIREBASE_SERVICE_ACCOUNT_JSON
 * (variable de entorno / gestor de secretos) -- nunca en el repo.
 */
@Injectable()
export class FirebaseIdentityProvider implements IdentityProvider {
  private readonly logger = new Logger(FirebaseIdentityProvider.name);
  private readonly auth: Auth;

  constructor(config: ConfigService) {
    const serviceAccountJson = config.getOrThrow<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    const serviceAccount = JSON.parse(serviceAccountJson);

    const app =
      getApps()[0] ??
      initializeApp({
        credential: cert(serviceAccount),
      });

    this.auth = getAuth(app);
  }

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    try {
      const decoded = await this.auth.verifyIdToken(token);
      return {
        providerSubject: decoded.uid,
        email: decoded.email ?? '',
        emailVerified: decoded.email_verified ?? false,
      };
    } catch {
      this.logger.warn('Falló la verificación de un idToken de Firebase');
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async disableUser(providerSubject: string): Promise<void> {
    await this.auth.updateUser(providerSubject, { disabled: true });
  }

  async enableUser(providerSubject: string): Promise<void> {
    await this.auth.updateUser(providerSubject, { disabled: false });
  }

  async deleteUser(providerSubject: string): Promise<void> {
    await this.auth.deleteUser(providerSubject);
  }
}
