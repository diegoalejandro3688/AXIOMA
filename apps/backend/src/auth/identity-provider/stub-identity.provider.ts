import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityProvider, VerifiedIdentity } from './identity-provider.interface';

/**
 * Implementación de IdentityProvider sin dependencia de un proyecto Firebase
 * real -- solo para desarrollo/pruebas locales (AUTH_IDENTITY_PROVIDER=stub).
 * NUNCA debe activarse en staging/producción -- ver auth.module.ts.
 *
 * Los tokens se codifican de forma determinística (sin estado en memoria)
 * para que puedan generarse desde un proceso externo (ej. un script de
 * verificación) sin necesitar acceso a la instancia real que corre dentro
 * del servidor -- solo el estado de disabled/deleted vive en esta instancia,
 * porque eso sí lo controla el propio backend en tiempo de ejecución.
 */
@Injectable()
export class StubIdentityProvider implements IdentityProvider {
  private readonly disabled = new Set<string>();
  private readonly deleted = new Set<string>();

  static encode(identity: VerifiedIdentity): string {
    const payload = JSON.stringify(identity);
    return `stub:${Buffer.from(payload, 'utf-8').toString('base64url')}`;
  }

  private static decode(token: string): VerifiedIdentity | null {
    if (!token.startsWith('stub:')) return null;
    try {
      const payload = Buffer.from(token.slice('stub:'.length), 'base64url').toString('utf-8');
      const parsed = JSON.parse(payload);
      if (typeof parsed.providerSubject !== 'string' || typeof parsed.email !== 'string') return null;
      return parsed as VerifiedIdentity;
    } catch {
      return null;
    }
  }

  /** Conveniencia para pruebas dentro del mismo proceso. */
  issueTestToken(identity: VerifiedIdentity): string {
    return StubIdentityProvider.encode(identity);
  }

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    const identity = StubIdentityProvider.decode(token);
    if (!identity) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    if (this.deleted.has(identity.providerSubject) || this.disabled.has(identity.providerSubject)) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return identity;
  }

  async disableUser(providerSubject: string): Promise<void> {
    this.disabled.add(providerSubject);
  }

  async enableUser(providerSubject: string): Promise<void> {
    this.disabled.delete(providerSubject);
  }

  async deleteUser(providerSubject: string): Promise<void> {
    this.deleted.add(providerSubject);
  }
}
