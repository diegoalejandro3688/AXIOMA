// Mismo patrón que verify-auth-gate.ts: prueba contra el servidor real ya
// compilado y corriendo, por HTTP + acceso directo a Postgres para fixtures.
// La recuperación (cancelDeletion) ya NO tiene endpoint HTTP -- se invoca
// vía el CLI compilado (dist/cli/recover-account.js), igual que lo haría un
// operador real. Ver ADR-0005.
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
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

/** Invoca el CLI real (compilado), igual que lo haría un operador. */
function recoverAccountViaCli(accountId: string): { ok: boolean; output: string } {
  try {
    const output = execFileSync('node', ['dist/cli/recover-account.js', accountId], {
      encoding: 'utf-8',
      env: process.env,
    });
    return { ok: true, output };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 1. Solicitud de eliminación crea PrivacyRequest y coordina AUTH ---');
  const uidA = `priv-a-${Date.now()}`;
  const emailA = `priv-a-${Date.now()}@example.com`;
  const tokenA = token({ providerSubject: uidA, email: emailA, emailVerified: true });
  const rSession = await post('/auth/session', { idToken: tokenA });
  const accountA = rSession.body?.accountId;
  const sessionA = rSession.body?.sessionId;

  const rDeletion = await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenA}`, 'x-session-id': sessionA },
  );
  check('status 202', rDeletion.status === 202);

  const accountRow = await pg.query('SELECT status FROM account WHERE id = $1', [accountA]);
  check('Account.status DELETION_PENDING', accountRow.rows[0]?.status === 'DELETION_PENDING');

  const requestRow1 = await pg.query(
    "SELECT id, status, scheduled_for FROM privacy_request WHERE account_id = $1 ORDER BY requested_at DESC LIMIT 1",
    [accountA],
  );
  const request1 = requestRow1.rows[0];
  check('PrivacyRequest creada, status PENDING', request1?.status === 'PENDING');
  const daysUntilScheduled = (new Date(request1.scheduled_for).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  check('scheduledFor ~30 días en el futuro', daysUntilScheduled > 29 && daysUntilScheduled < 31);

  console.log('--- 2. Tras la solicitud: sesión revocada e identidad deshabilitada ---');
  const rMeAfterDeletion = await get('/auth/me', { authorization: `Bearer ${tokenA}`, 'x-session-id': sessionA });
  check('sesión previa ya no sirve', rMeAfterDeletion.status === 401);
  const tokenA2 = token({ providerSubject: uidA, email: emailA, emailVerified: true });
  const rNewSessionBlocked = await post('/auth/session', { idToken: tokenA2 });
  check('no se puede crear sesión nueva (identidad deshabilitada)', rNewSessionBlocked.status === 401);

  console.log('--- 3. Recuperación vía CLI (no hay endpoint HTTP -- ver ADR-0005) ---');
  const recovery1 = recoverAccountViaCli(accountA);
  check('CLI recupera la cuenta', recovery1.ok);

  const accountAfterRecovery = await pg.query(
    'SELECT status, deletion_requested_at FROM account WHERE id = $1',
    [accountA],
  );
  check('Account.status vuelve a ACTIVE (email estaba verificado)', accountAfterRecovery.rows[0]?.status === 'ACTIVE');
  check('deletionRequestedAt limpiado', accountAfterRecovery.rows[0]?.deletion_requested_at === null);

  const request1After = await pg.query('SELECT status FROM privacy_request WHERE id = $1', [request1.id]);
  check('PrivacyRequest CANCELLED', request1After.rows[0]?.status === 'CANCELLED');

  // NOTA: no verificamos aquí "puede crear sesión de nuevo" -- el CLI corre en un
  // PROCESO SEPARADO del servidor HTTP, y StubIdentityProvider guarda
  // disabled/deleted en memoria por proceso. enableUser() ejecutado por el CLI no
  // puede afectar la memoria del servidor. Con Firebase real esto SÍ sería
  // verificable (el estado vive en Firebase, compartido entre procesos) -- es una
  // limitación de aislamiento de procesos del stub, no del mecanismo de
  // recuperación. Lo que sí es válido entre procesos (Postgres, infraestructura
  // real y compartida) ya se verificó arriba: Account.status y PrivacyRequest.status.
  // recovery1.ok === true ya es evidencia indirecta válida de que reactivateAccount()
  // completó su bucle sobre TODAS las identidades sin lanzar excepción -- si
  // enableUser() hubiera fallado para alguna, cancelDeletion() habría fallado también.

  console.log('--- 4. Recuperación es segura ante reintento (NO idempotente en sentido estricto) ---');
  const recovery2 = recoverAccountViaCli(accountA);
  check('segunda recuperación por CLI falla limpio (sin solicitud activa)', !recovery2.ok);
  check('mensaje de error claro', recovery2.output.includes('No se pudo recuperar'));

  console.log('--- 5. Rechazo: recuperación fuera de plazo (30 días vencidos, sweep aún no corrió) ---');
  const uidB = `priv-b-${Date.now()}`;
  const emailB = `priv-b-${Date.now()}@example.com`;
  const tokenB = token({ providerSubject: uidB, email: emailB, emailVerified: true });
  const rSessionB = await post('/auth/session', { idToken: tokenB });
  const accountB = rSessionB.body?.accountId;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenB}`, 'x-session-id': rSessionB.body?.sessionId },
  );
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [accountB],
  );
  const recoveryExpired = recoverAccountViaCli(accountB);
  check('plazo vencido -> CLI falla', !recoveryExpired.ok);

  console.log('--- 6. Rechazo: borrado ya en curso (PROCESSING) no se puede revertir ---');
  const uidC = `priv-c-${Date.now()}`;
  const emailC = `priv-c-${Date.now()}@example.com`;
  const tokenC = token({ providerSubject: uidC, email: emailC, emailVerified: true });
  const rSessionC = await post('/auth/session', { idToken: tokenC });
  const accountC = rSessionC.body?.accountId;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenC}`, 'x-session-id': rSessionC.body?.sessionId },
  );
  await pg.query("UPDATE privacy_request SET status = 'PROCESSING', processing_started_at = now() WHERE account_id = $1", [
    accountC,
  ]);
  const recoveryProcessing = recoverAccountViaCli(accountC);
  check('en PROCESSING -> CLI falla', !recoveryProcessing.ok);
  await pg.query("UPDATE privacy_request SET status = 'PENDING', processing_started_at = NULL WHERE account_id = $1", [
    accountC,
  ]);

  console.log('--- 7. Barrido de cierre definitivo (fixture: solicitud vencida) ---');
  const uidD = `priv-d-${Date.now()}`;
  const emailD = `priv-d-${Date.now()}@example.com`;
  const tokenD = token({ providerSubject: uidD, email: emailD, emailVerified: true });
  const rSessionD = await post('/auth/session', { idToken: tokenD });
  const accountD = rSessionD.body?.accountId;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenD}`, 'x-session-id': rSessionD.body?.sessionId },
  );
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [accountD],
  );

  const identityDBefore = await pg.query(
    'SELECT id, email_normalized FROM auth_identity WHERE account_id = $1',
    [accountD],
  );

  const rSweep = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('sweep status 200', rSweep.status === 200);
  check('sweep procesó al menos 1 cuenta', rSweep.body?.deletion?.processed >= 1);

  const accountDAfter = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [accountD]);
  check('Account.status CLOSED', accountDAfter.rows[0]?.status === 'CLOSED');
  check('closedAt seteado', accountDAfter.rows[0]?.closed_at !== null);

  const identityDAfter = await pg.query(
    'SELECT unlinked_at, email_normalized FROM auth_identity WHERE id = $1',
    [identityDBefore.rows[0].id],
  );
  check('AuthIdentity.unlinkedAt seteado', identityDAfter.rows[0]?.unlinked_at !== null);
  check(
    'email anonimizado (ya no es el original)',
    identityDAfter.rows[0]?.email_normalized !== identityDBefore.rows[0]?.email_normalized &&
      String(identityDAfter.rows[0]?.email_normalized).startsWith('anonymized-'),
  );

  const requestDAfter = await pg.query(
    "SELECT status FROM privacy_request WHERE account_id = $1 ORDER BY requested_at DESC LIMIT 1",
    [accountD],
  );
  check('PrivacyRequest COMPLETED', requestDAfter.rows[0]?.status === 'COMPLETED');

  console.log('--- 8. Cuenta cerrada ya no es recuperable ---');
  const recoveryClosed = recoverAccountViaCli(accountD);
  check('cuenta CLOSED -> CLI falla', !recoveryClosed.ok);

  console.log('--- 9. Endpoint de barrido exige clave de operaciones ---');
  const rSweepNoKey = await post('/privacy/_internal/sweep', {});
  check('sin clave -> 401', rSweepNoKey.status === 401);

  console.log('--- 10. Barrido de sesiones vencidas (dato temporal real) ---');
  const uidE = `priv-e-${Date.now()}`;
  const emailE = `priv-e-${Date.now()}@example.com`;
  const tokenE = token({ providerSubject: uidE, email: emailE, emailVerified: true });
  const rSessionE = await post('/auth/session', { idToken: tokenE });
  const sessionE = rSessionE.body?.sessionId;
  await pg.query("UPDATE auth_session SET expires_at = now() - interval '1 day' WHERE id = $1", [sessionE]);
  const rSweep2 = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('barrido de sesiones reporta al menos 1 eliminada', rSweep2.body?.sessions?.deleted >= 1);
  const sessionEAfter = await pg.query('SELECT id FROM auth_session WHERE id = $1', [sessionE]);
  check('la sesión vencida ya no existe en la tabla', sessionEAfter.rowCount === 0);

  console.log('--- 11. Barrido es seguro ante reintento (correrlo de nuevo no falla) ---');
  const rSweep3 = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('segundo barrido inmediato -> 200, sin error', rSweep3.status === 200);

  console.log('--- 12. Fallo parcial real: deleteUser falla, NO se marca CLOSED, reintento exitoso completa ---');
  const uidF = `priv-f-${Date.now()}`;
  const emailF = `priv-f-${Date.now()}@example.com`;
  // simulateDeleteFailures: 1 -> el primer deleteUser para este UID falla, el segundo (reintento) funciona
  const tokenF = token({
    providerSubject: uidF,
    email: emailF,
    emailVerified: true,
    simulateDeleteFailures: 1,
  } as never);
  const rSessionF = await post('/auth/session', { idToken: tokenF });
  const accountF = rSessionF.body?.accountId;
  await post(
    '/privacy/account-deletion',
    {},
    { authorization: `Bearer ${tokenF}`, 'x-session-id': rSessionF.body?.sessionId },
  );
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [accountF],
  );

  const rSweepFail = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('primer intento del barrido reporta 1 fallo', rSweepFail.body?.deletion?.failed >= 1);

  const requestFAfterFail = await pg.query(
    "SELECT status, processing_started_at FROM privacy_request WHERE account_id = $1 ORDER BY requested_at DESC LIMIT 1",
    [accountF],
  );
  check('PrivacyRequest queda en PROCESSING (no se pierde)', requestFAfterFail.rows[0]?.status === 'PROCESSING');
  check('processingStartedAt quedó registrado', requestFAfterFail.rows[0]?.processing_started_at !== null);

  const accountFAfterFail = await pg.query('SELECT status FROM account WHERE id = $1', [accountF]);
  check(
    'Account NO se marca CLOSED tras el fallo parcial',
    accountFAfterFail.rows[0]?.status === 'DELETION_PENDING',
  );

  const identityFAfterFail = await pg.query('SELECT unlinked_at FROM auth_identity WHERE account_id = $1', [
    accountF,
  ]);
  check(
    'AuthIdentity tampoco quedó unlinked tras el fallo',
    identityFAfterFail.rows[0]?.unlinked_at === null,
  );

  // Inmediatamente después, la solicitud sigue "recién" en PROCESSING (no atascada
  // todavía) -- findStuckProcessing no la recogería. Forzamos que parezca atascada
  // hace más de una hora para simular que el reintento automático la retoma.
  await pg.query(
    "UPDATE privacy_request SET processing_started_at = now() - interval '2 hours' WHERE account_id = $1",
    [accountF],
  );

  const rSweepRetry = await post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
  check('reintento del barrido procesa la solicitud atascada', rSweepRetry.body?.deletion?.processed >= 1);

  const accountFAfterRetry = await pg.query('SELECT status, closed_at FROM account WHERE id = $1', [accountF]);
  check('tras el reintento exitoso, Account.status CLOSED', accountFAfterRetry.rows[0]?.status === 'CLOSED');

  const requestFAfterRetry = await pg.query('SELECT status FROM privacy_request WHERE account_id = $1', [accountF]);
  check('PrivacyRequest COMPLETED tras el reintento', requestFAfterRetry.rows[0]?.status === 'COMPLETED');

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de PRIVACY pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
