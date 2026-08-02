import type { IdentityClient } from './identity-client';

/**
 * Cliente real de Firebase Authentication -- ver ADR-0004 (proveedor elegido)
 * y ADR-0013 (integración mobile, diferida sin bloquear: sin proyecto real
 * provisto todavía). Nunca se construye si no se selecciona explícitamente
 * (`EXPO_PUBLIC_AUTH_IDENTITY_CLIENT=firebase`) -- mismo criterio que
 * `FirebaseIdentityProvider` del backend, que tampoco se instancia en modo stub.
 *
 * Persistencia de sesión propia del SDK de Firebase deliberadamente NO
 * configurada aquí -- Axioma ya persiste su propio `idToken`/`sessionId` vía
 * `expo-secure-store` (`session-storage.ts`); afinar la persistencia nativa
 * del SDK de Firebase (ej. `getReactNativePersistence`) queda pendiente hasta
 * que exista un proyecto real contra el cual validarla (mismo tipo de
 * pendiente no bloqueante que ADR-0004 dejó para Firebase Admin).
 */
export class FirebaseIdentityClient implements IdentityClient {
  private authPromise: ReturnType<typeof this.initAuth> | null = null;

  private async initAuth() {
    const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

    if (!apiKey || !authDomain || !projectId || !appId) {
      throw new Error(
        'FirebaseIdentityClient requiere EXPO_PUBLIC_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/APP_ID -- ' +
          'proyecto Firebase real todavía no provisto (ver ADR-0013, Decision Gate 3). ' +
          'Mientras tanto, usa EXPO_PUBLIC_AUTH_IDENTITY_CLIENT=stub (default).',
      );
    }

    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } = await import(
      'firebase/auth'
    );

    const app = getApps().length > 0 ? getApp() : initializeApp({ apiKey, authDomain, projectId, appId });
    const auth = getAuth(app);
    return { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut };
  }

  private getAuth() {
    if (!this.authPromise) this.authPromise = this.initAuth();
    return this.authPromise;
  }

  async signIn(email: string, password: string): Promise<{ idToken: string }> {
    const { auth, signInWithEmailAndPassword } = await this.getAuth();
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    return { idToken };
  }

  async signUp(email: string, password: string): Promise<{ idToken: string }> {
    const { auth, createUserWithEmailAndPassword } = await this.getAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    return { idToken };
  }

  async signOut(): Promise<void> {
    const { auth, signOut } = await this.getAuth();
    await signOut(auth);
  }
}
