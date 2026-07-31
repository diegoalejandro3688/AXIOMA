import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IdentityProvider, VerifiedIdentity } from './identity-provider.interface';

interface StubTestIdentity extends VerifiedIdentity {
  /**
   * Solo para pruebas de recuperación ante fallos parciales (ver
   * docs/adr/0005-privacy-foundation.md): cuántas veces debe fallar
   * deleteUser() para este providerSubject antes de tener éxito, simulando
   * una falla transitoria real de Firebase durante el cierre definitivo.
   */
  simulateDeleteFailures?: number;
}

/**
 * Implementación de IdentityProvider sin dependencia de un proyecto Firebase
 * real -- solo para desarrollo/pruebas locales (AUTH_IDENTITY_PROVIDER=stub).
 * NUNCA debe activarse en staging/producción -- ver auth.module.ts.
 *
 * Los tokens se codifican de forma determinística (sin estado en memoria)
 * para que puedan generarse desde un proceso externo (ej. un script de
 * verificación) sin necesitar acceso a la instancia real que corre dentro
 * del servidor -- solo el estado de disabled/deleted/fallas pendientes vive
 * en esta instancia, porque eso sí lo controla el propio backend en tiempo
 * de ejecución.
 */
@Injectable()
export class StubIdentityProvider implements IdentityProvider {
  private readonly disabled = new Set<string>();
  private readonly deleted = new Set<string>();
  private readonly deleteFailuresRemaining = new Map<string, number>();

  static encode(identity: StubTestIdentity): string {
    const payload = JSON.stringify(identity);
    return `stub:${Buffer.from(payload, 'utf-8').toString('base64url')}`;
  }

  private static decode(token: string): StubTestIdentity | null {
    if (!token.startsWith('stub:')) return null;
    try {
      const payload = Buffer.from(token.slice('stub:'.length), 'base64url').toString('utf-8');
      const parsed = JSON.parse(payload);
      if (typeof parsed.providerSubject !== 'string' || typeof parsed.email !== 'string') return null;
      return parsed as StubTestIdentity;
    } catch {
      return null;
    }
  }

  /** Conveniencia para pruebas dentro del mismo proceso. */
  issueTestToken(identity: StubTestIdentity): string {
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
    if (identity.simulateDeleteFailures && identity.simulateDeleteFailures > 0) {
      this.deleteFailuresRemaining.set(identity.providerSubject, identity.simulateDeleteFailures);
    }
    return {
      providerSubject: identity.providerSubject,
      email: identity.email,
      emailVerified: identity.emailVerified,
    };
  }

  async disableUser(providerSubject: string): Promise<void> {
    this.disabled.add(providerSubject);
  }

  async enableUser(providerSubject: string): Promise<void> {
    this.disabled.delete(providerSubject);
  }

  async deleteUser(providerSubject: string): Promise<void> {
    const remaining = this.deleteFailuresRemaining.get(providerSubject) ?? 0;
    if (remaining > 0) {
      this.deleteFailuresRemaining.set(providerSubject, remaining - 1);
      throw new Error(`Fallo simulado de deleteUser para ${providerSubject} (quedan ${remaining - 1})`);
    }
    this.deleted.add(providerSubject);
  }
}
