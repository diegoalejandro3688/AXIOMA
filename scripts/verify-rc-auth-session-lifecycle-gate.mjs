#!/usr/bin/env node
/**
 * Gate -- ZETRYND V1 Release Candidate, RC1A: CICLO DE VIDA DE SESION AUTH.
 *
 * Verificacion ESTATICA (Node puro, scan de fuente). NO levanta backend, NO
 * toca dispositivos, NO prueba una sesion real de >1 h -- esa evidencia
 * corresponde a la QA fisica en el Samsung (ver
 * docs/adr/ZETRYND-V1-RC1A-AUTH-SESSION-LIFECYCLE.md, seccion QA).
 *
 * Afirma el contrato de credencial elegido (OPCION A) en ambos lados:
 *
 *   BACKEND
 *   A. `auth.guard.ts` exige `x-session-id` y NO exige/lee `Authorization`
 *      como credencial.
 *   B. `auth.service.ts` -> `validateSession(sessionId)` toma UN solo
 *      argumento y su cuerpo NO llama `identityProvider.verifyToken`.
 *   C. `auth.service.ts` -> `createSession` SIGUE llamando `verifyToken`
 *      (la identidad de Firebase se prueba una vez, al crear la sesion).
 *   D. `auth.service.ts` conserva las defensas de revocacion: `revokedAt`,
 *      `expiresAt`, `sessionVersion`.
 *
 *   MOBILE
 *   E. `session-storage.ts` -> `StoredSession` ya NO tiene campo `idToken`;
 *      `KEYS` ya no define `idToken`; la clave legada se borra activamente.
 *   F. `api/client.ts` NO envia header `authorization` desde la sesion
 *      almacenada; envia `x-session-id`.
 *   G. `auth-provider.tsx` -> `saveSession` recibe solo `{ sessionId }`.
 *   H. `firebase-identity-client.ts` usa persistencia en memoria explicita
 *      (`inMemoryPersistence` / `initializeAuth`), NO `getReactNativePersistence`.
 *
 *   ALCANCE (no se toca nada fuera de auth/sesion)
 *   I. El ADR de RC1A existe.
 *   J. Los archivos de auth cambiados no importan `expo-iap` ni APIs de billing.
 *
 * Uso: node scripts/verify-rc-auth-session-lifecycle-gate.mjs
 * (equivalente a `pnpm run verify:rc-auth-session-lifecycle-gate`)
 */
import { readFileSync, existsSync } from 'node:fs';

const rel = (p) => new URL(p, new URL('../', import.meta.url));
const read = (p) => readFileSync(rel(p), 'utf8').replace(/\r\n/g, '\n');
const exists = (p) => existsSync(rel(p));

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

console.log('=== Gate RC1A -- ciclo de vida de sesion auth (estatico) ===\n');

// --- BACKEND ---------------------------------------------------------------
const guard = read('apps/backend/src/auth/auth.guard.ts');
const service = read('apps/backend/src/auth/auth.service.ts');

console.log('--- Backend: AuthGuard ---');
check(
  "A. exige 'x-session-id'",
  /headers\[SESSION_HEADER\]/.test(guard) && /const SESSION_HEADER = 'x-session-id'/.test(guard),
);
check(
  'A. NO lee request.headers.authorization como credencial',
  !/headers\.authorization/.test(guard) && !/Bearer /.test(guard),
);
check(
  'A. delega en validateSession(sessionId) con un solo argumento',
  /validateSession\(sessionId\)/.test(guard),
);
check(
  'A. rechaza un X-Session-Id malformado (no-UUID) antes de tocar la BD -> 401',
  /UUID_RE/.test(guard) && /!UUID_RE\.test\(sessionId\)/.test(guard),
);

console.log('--- Backend: AuthService ---');
const validateBody = (service.match(/async validateSession\([^)]*\)[^{]*\{([\s\S]*?)\n  \}/) || [])[1] || '';
check('B. validateSession toma un solo parametro sessionId', /async validateSession\(sessionId: string\)/.test(service));
check('B. el cuerpo de validateSession NO llama verifyToken', validateBody.length > 0 && !/verifyToken/.test(validateBody));
check('B. el cuerpo de validateSession NO consulta authIdentityRepo', !/authIdentityRepo/.test(validateBody));
const createBody = (service.match(/async createSession\([^)]*\)[^{]*\{([\s\S]*?)\n  \}/) || [])[1] || '';
check('C. createSession SIGUE verificando la identidad de Firebase', /verifyToken\(idToken\)/.test(createBody));
check('D. validateSession conserva la defensa revokedAt', /session\.revokedAt/.test(validateBody));
check('D. validateSession conserva la defensa expiresAt', /session\.expiresAt/.test(validateBody));
check('D. validateSession conserva el cerrojo sessionVersion', /session\.sessionVersion !== account\.sessionVersion/.test(validateBody));

// --- MOBILE ---------------------------------------------------------------
const storage = read('apps/mobile/lib/auth/session-storage.ts');
const client = read('apps/mobile/lib/api/client.ts');
const provider = read('apps/mobile/lib/auth/auth-provider.tsx');
const fbClient = read('apps/mobile/lib/auth/firebase-identity-client.ts');

console.log('--- Mobile: almacenamiento de sesion ---');
check('E. StoredSession ya no declara idToken', /export interface StoredSession \{\s*sessionId: string;\s*\}/.test(storage));
check('E. KEYS ya no define idToken', !/KEYS = \{[^}]*idToken/.test(storage));
check('E. la clave idToken legada se borra activamente', /LEGACY_ID_TOKEN_KEY/.test(storage) && /deleteItemAsync\(LEGACY_ID_TOKEN_KEY\)/.test(storage));

console.log('--- Mobile: cliente de API ---');
check('F. no arma header authorization desde la sesion', !/headers\.authorization\s*=/.test(client) && !/Bearer \$\{session/.test(client));
check("F. envia 'x-session-id' con el sessionId", /headers\['x-session-id'\]\s*=\s*session\.sessionId/.test(client));

console.log('--- Mobile: AuthProvider ---');
check('G. saveSession recibe solo { sessionId }', /saveSession\(\{\s*sessionId: sessionResult\.data\.sessionId\s*\}\)/.test(provider));

console.log('--- Mobile: cliente de identidad Firebase ---');
check('H. usa inMemoryPersistence + initializeAuth', /inMemoryPersistence/.test(fbClient) && /initializeAuth\(/.test(fbClient));
check('H. NO invoca getReactNativePersistence', !/getReactNativePersistence\s*\(/.test(fbClient));

// --- ALCANCE -------------------------------------------------------------
console.log('--- Alcance del incremento ---');
check('I. existe el ADR de RC1A', exists('docs/adr/ZETRYND-V1-RC1A-AUTH-SESSION-LIFECYCLE.md'));
const authFiles = [guard, service, storage, client, provider, fbClient];
check(
  'J. ningun archivo de auth tocado importa expo-iap / APIs de billing',
  !authFiles.some((f) => /expo-iap|launchBillingFlow|requestPurchase|queryProductDetails/.test(f)),
);

console.log('');
if (failures > 0) {
  console.error(`${failures} verificacion(es) fallaron.`);
  process.exit(1);
}
console.log('Todas las verificaciones del gate RC1A pasaron.');
