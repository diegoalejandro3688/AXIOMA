import type { IdentityClient } from './identity-client';

/**
 * Contraparte cliente de `StubIdentityProvider` del backend -- ver ADR-0004 y
 * ADR-0013. Genera tokens en el MISMO formato que
 * `apps/backend/src/auth/identity-provider/stub-identity.provider.ts`
 * (`stub:` + base64url de `{providerSubject, email, emailVerified}`), sin red
 * y sin depender de ninguna instancia del backend en ejecución para generar
 * el token -- solo `POST /auth/session` habla con el backend.
 *
 * `providerSubject` se deriva DETERMINÍSTICAMENTE del email (mismo email ->
 * mismo UID simulado -> misma cuenta al reutilizar sesión), igual que el
 * `StubIdentityProvider` real trataría el mismo UID en llamadas repetidas.
 *
 * La contraseña se ignora deliberadamente -- el stub no simula verificación
 * de credenciales, solo identidad. Documentado, no oculto: NUNCA debe
 * activarse en producción (mismo criterio que el stub del backend).
 */
export class StubIdentityClient implements IdentityClient {
  private encode(email: string): { idToken: string } {
    const providerSubject = `stub-mobile-${email.toLowerCase().trim()}`;
    const payload = JSON.stringify({ providerSubject, email, emailVerified: true });
    const idToken = `stub:${base64UrlEncode(payload)}`;
    return { idToken };
  }

  async signIn(email: string): Promise<{ idToken: string }> {
    return this.encode(email);
  }

  async signUp(email: string): Promise<{ idToken: string }> {
    return this.encode(email);
  }

  async signOut(): Promise<void> {
    // Sin estado de servidor que limpiar -- el logout real ocurre contra
    // Axioma (POST /auth/logout), no contra el proveedor de identidad.
  }
}

function base64UrlEncode(value: string): string {
  const base64 =
    typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(value)))
      : Buffer.from(value, 'utf-8').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
