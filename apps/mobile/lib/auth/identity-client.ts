/**
 * Contrato de cliente de identidad -- ver ADR-0013. Espejo mobile de la
 * interfaz `IdentityProvider` del backend (ADR-0004): dos implementaciones
 * intercambiables (`StubIdentityClient`, `FirebaseIdentityClient`), la misma
 * forma para que `AuthProvider` no distinga cuál está activa.
 */
export interface IdentityClient {
  signIn(email: string, password: string): Promise<{ idToken: string }>;
  signUp(email: string, password: string): Promise<{ idToken: string }>;
  signOut(): Promise<void>;
}
