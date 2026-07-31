// Ejecuta contra un servidor YA levantado (node dist/main.js, con
// AUTH_IDENTITY_PROVIDER=stub) -- no usa NestFactory aqui, porque tsx/esbuild
// no emite los metadatos de decoradores que la inyeccion de dependencias de
// NestJS necesita (ver hallazgo documentado en ADR-0004).
import 'dotenv/config';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 1. Creación de cuenta nueva (email verificado -> ACTIVE) ---');
  const uidA = `uid-a-${Date.now()}`;
  const emailA = `a-${Date.now()}@example.com`;
  const tokenA1 = token({ providerSubject: uidA, email: emailA, emailVerified: true });
  const r1 = await post('/auth/session', { idToken: tokenA1 });
  check('status 200', r1.status === 200);
  check('status ACTIVE', r1.body?.status === 'ACTIVE');
  const accountA = r1.body?.accountId;
  const sessionA1 = r1.body?.sessionId;
  check('sessionId y accountId presentes', Boolean(accountA && sessionA1));

  console.log('--- 2. Mismo UID otra vez -> reutiliza la cuenta, no duplica ---');
  const r2 = await post('/auth/session', { idToken: tokenA1 });
  check('misma accountId', r2.body?.accountId === accountA);
  const sessionA2 = r2.body?.sessionId;
  check('sessionId distinto (nueva sesión)', sessionA2 !== sessionA1);

  console.log('--- 3. Cuenta nueva con email NO verificado -> PENDING ---');
  const uidB = `uid-b-${Date.now()}`;
  const emailB = `b-${Date.now()}@example.com`;
  const tokenB = token({ providerSubject: uidB, email: emailB, emailVerified: false });
  const r3 = await post('/auth/session', { idToken: tokenB });
  check('status PENDING', r3.body?.status === 'PENDING');

  console.log('--- 4. UID nuevo con email ya vinculado a otra cuenta -> rechazo genérico, NO fusiona ---');
  const uidC = `uid-c-${Date.now()}`;
  const tokenC = token({ providerSubject: uidC, email: emailA, emailVerified: true });
  const r4 = await post('/auth/session', { idToken: tokenC });
  check('status 409', r4.status === 409);
  check('mensaje genérico (no confirma que la cuenta existe)', !JSON.stringify(r4.body).includes(emailA));

  console.log('--- 5. /auth/me sin headers -> 401 ---');
  const r5 = await get('/auth/me');
  check('status 401', r5.status === 401);

  console.log('--- 6. /auth/me con idToken + sessionId válidos -> 200 ---');
  const r6 = await get('/auth/me', { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionA2 });
  check('status 200', r6.status === 200);
  check('accountId correcto', r6.body?.accountId === accountA);

  console.log('--- 7. /auth/me con idToken válido pero sessionId de OTRA cuenta -> 401 (ownership) ---');
  const rB = await post('/auth/session', { idToken: tokenB });
  const sessionB = rB.body?.sessionId;
  const r7 = await get('/auth/me', { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionB });
  check('status 401', r7.status === 401);

  console.log('--- 8. /auth/me con sessionId inexistente -> 401 ---');
  const r8 = await get('/auth/me', {
    authorization: `Bearer ${tokenA1}`,
    'x-session-id': '00000000-0000-0000-0000-000000000000',
  });
  check('status 401', r8.status === 401);

  console.log('--- 9. Sesión expirada -> 401 (fixture directa en Postgres) ---');
  await pg.query('UPDATE auth_session SET expires_at = now() - interval \'1 day\' WHERE id = $1', [sessionA2]);
  const r9 = await get('/auth/me', { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionA2 });
  check('status 401 (expirada)', r9.status === 401);

  console.log('--- 10. Logout revoca la sesión específica ---');
  const rNewSession = await post('/auth/session', { idToken: tokenA1 });
  const sessionA3 = rNewSession.body?.sessionId;
  const rLogout = await post('/auth/logout', {}, { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionA3 });
  check('logout status 204', rLogout.status === 204);
  const rAfterLogout = await get('/auth/me', { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionA3 });
  check('sesión ya no sirve tras logout', rAfterLogout.status === 401);

  console.log('--- 11. sessionVersion: invalidación global ---');
  const rSessionX = await post('/auth/session', { idToken: tokenA1 });
  const sessionX = rSessionX.body?.sessionId;
  const before = await pg.query('SELECT session_version FROM account WHERE id = $1', [accountA]);
  await pg.query('UPDATE account SET session_version = session_version + 1 WHERE id = $1', [accountA]);
  const rAfterBump = await get('/auth/me', { authorization: `Bearer ${tokenA1}`, 'x-session-id': sessionX });
  check('sesión previa inválida tras incrementar sessionVersion', rAfterBump.status === 401);
  check('(dato) sessionVersion antes', Number(before.rows[0].session_version) >= 1);

  console.log('--- 12. Eliminación coordinada: movida a Privacy Foundation (Paso 5) ---');
  console.log('   Ver scripts/verify-privacy-gate.ts -- POST /privacy/account-deletion reemplaza');
  console.log('   a POST /auth/account/deletion (retirado). Cobertura completa ahí.');

  console.log('--- 13. Rate limiting en /auth/session (límite 10/60s) ---');
  let sawTooManyRequests = false;
  for (let i = 0; i < 15; i++) {
    const t = token({ providerSubject: `uid-rate-${Date.now()}-${i}`, email: `rate${i}@example.com`, emailVerified: true });
    const r = await post('/auth/session', { idToken: t });
    if (r.status === 429) {
      sawTooManyRequests = true;
      break;
    }
  }
  check('429 tras exceder el límite', sawTooManyRequests);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de AUTH pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
