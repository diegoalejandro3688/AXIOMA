import type { IdentityClient } from './identity-client';
import { StubIdentityClient } from './stub-identity-client';
import { FirebaseIdentityClient } from './firebase-identity-client';

/**
 * `EXPO_PUBLIC_AUTH_IDENTITY_CLIENT` ("stub" por defecto) selecciona la
 * implementación -- mismo espíritu que `AUTH_IDENTITY_PROVIDER` del backend
 * (ADR-0004). Ver ADR-0013, Decision Gate 3: no bloquea el desarrollo sin un
 * proyecto Firebase real.
 */
export function createIdentityClient(): IdentityClient {
  const mode = process.env.EXPO_PUBLIC_AUTH_IDENTITY_CLIENT ?? 'stub';
  if (mode === 'firebase') return new FirebaseIdentityClient();
  return new StubIdentityClient();
}
