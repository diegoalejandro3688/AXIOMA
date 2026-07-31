// Mismo patrón que los gates anteriores: prueba contra el servidor real ya
// compilado y corriendo, con acceso directo a Postgres para fixtures
// (forzar vencimiento de PrivacyRequest, verificar eliminación completa).
import 'dotenv/config';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3004';
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

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

async function newSession(label: string) {
  const uid = `user-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${uid}@example.com`;
  const idToken = token({ providerSubject: uid, email, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    sessionId: r.body?.sessionId as string,
    idToken,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId },
  };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- 1. POST /user/profile sin sesión -> 401 ---');
  const rNoAuth = await req('POST', '/user/profile', {}, { displayName: 'Sin sesión' });
  check('status 401', rNoAuth.status === 401);

  console.log('--- 2. Primera creación -> 201, timezone default si se omite ---');
  const a = await newSession('a');
  const rCreateA = await req('POST', '/user/profile', a.authHeaders, { displayName: 'María José' });
  check('status 201 en la primera creación', rCreateA.status === 201);
  check('accountId == el de la sesión', rCreateA.body?.accountId === a.accountId);
  check('displayName correcto', rCreateA.body?.displayName === 'María José');
  check('timezone default aplicado (America/Santiago)', rCreateA.body?.timezone === 'America/Santiago');

  console.log('--- 3. Segundo POST -> 200, NO modifica (para eso está PATCH) ---');
  const rCreateA2 = await req('POST', '/user/profile', a.authHeaders, { displayName: 'Otro Nombre Distinto' });
  check('status 200 en la segunda llamada', rCreateA2.status === 200);
  check('displayName NO cambió', rCreateA2.body?.displayName === 'María José');

  console.log('--- 4. Creación concurrente: dos POST simultáneos para una cuenta nueva ---');
  const c = await newSession('concurrent');
  const [rConcA, rConcB] = await Promise.all([
    req('POST', '/user/profile', c.authHeaders, { displayName: 'Concurrente A' }),
    req('POST', '/user/profile', c.authHeaders, { displayName: 'Concurrente B' }),
  ]);
  const statuses = [rConcA.status, rConcB.status].sort();
  check('ningún 500 (nunca falla por violación de unicidad)', rConcA.status !== 500 && rConcB.status !== 500);
  check('exactamente un 201 y un 200', statuses[0] === 200 && statuses[1] === 201);
  check(
    'ambas respuestas muestran el mismo displayName (el ganador de la carrera)',
    rConcA.body?.displayName === rConcB.body?.displayName,
  );
  check(
    'el displayName final es uno de los dos enviados',
    ['Concurrente A', 'Concurrente B'].includes(rConcA.body?.displayName),
  );
  const concurrentCount = await pg.query('SELECT count(*)::int AS n FROM user_profile WHERE account_id = $1', [
    c.accountId,
  ]);
  check('solo existe UNA fila en user_profile para esa cuenta', concurrentCount.rows[0].n === 1);

  console.log('--- 5. GET antes de inicializar -> 404 ---');
  const b = await newSession('b');
  const rGetBefore = await req('GET', '/user/profile', b.authHeaders);
  check('status 404', rGetBefore.status === 404);

  console.log('--- 6. GET después de inicializar -> 200, coincide ---');
  await req('POST', '/user/profile', b.authHeaders, { displayName: 'Cuenta B' });
  const rGetAfter = await req('GET', '/user/profile', b.authHeaders);
  check('status 200', rGetAfter.status === 200);
  check('accountId == el propio (aislamiento entre cuentas)', rGetAfter.body?.accountId === b.accountId);
  check('displayName correcto', rGetAfter.body?.displayName === 'Cuenta B');

  console.log('--- 7. PATCH sin perfil inicializado -> 404 ---');
  const d = await newSession('d');
  const rPatchNoProfile = await req('PATCH', '/user/profile', d.authHeaders, { displayName: 'No existe' });
  check('status 404', rPatchNoProfile.status === 404);

  console.log('--- 8. PATCH válido actualiza displayName y timezone ---');
  await req('POST', '/user/profile', d.authHeaders, { displayName: 'Original D' });
  const rPatchD = await req('PATCH', '/user/profile', d.authHeaders, {
    displayName: 'Actualizado D',
    timezone: 'America/Buenos_Aires',
  });
  check('status 200', rPatchD.status === 200);
  check('displayName actualizado', rPatchD.body?.displayName === 'Actualizado D');
  check('timezone actualizado', rPatchD.body?.timezone === 'America/Buenos_Aires');

  console.log('--- 9. Validación de displayName: límites y contenido ---');
  const invalidNames = [
    { label: 'vacío', value: '' },
    { label: '1 carácter (bajo el mínimo)', value: 'A' },
    { label: '41 caracteres (sobre el máximo)', value: 'A'.repeat(41) },
    { label: 'solo espacios', value: '    ' },
    { label: 'espacio al inicio', value: ' Nombre' },
    { label: 'espacio al final', value: 'Nombre ' },
    { label: 'carácter de control embebido', value: 'Nombre' + String.fromCharCode(7) + 'X' },
  ];
  for (const { label, value } of invalidNames) {
    const r = await req('PATCH', '/user/profile', d.authHeaders, { displayName: value });
    check(`displayName inválido (${label}) -> 400 VALIDATION_ERROR`, r.status === 400 && r.body?.error?.code === 'VALIDATION_ERROR');
  }

  console.log('--- 10. Validación de timezone: no-IANA -> 400 ---');
  const rBadTz = await req('PATCH', '/user/profile', d.authHeaders, { timezone: 'No/Existe' });
  check('timezone inválida -> 400', rBadTz.status === 400 && rBadTz.body?.error?.code === 'VALIDATION_ERROR');

  console.log('--- 11. Unicode: tildes/ñ aceptados; se normaliza a NFC ---');
  // Se construye la forma NFD programáticamente (nunca tipeada literal) --
  // así se garantiza que de verdad es la forma descompuesta (letra base +
  // marca combinante), sin depender de qué forma haya usado el editor.
  const nfcOriginal = 'Niño Núñez'; // literal NFC:ñ=U+00F1, ú=U+00FA
  const nfdName = nfcOriginal.normalize('NFD');
  const nfcName = nfdName.normalize('NFC');
  check('el fixture realmente difiere entre NFD y NFC (si no, la prueba no probaría nada)', nfdName !== nfcName);
  const rUnicode = await req('PATCH', '/user/profile', d.authHeaders, { displayName: nfdName });
  check('displayName con tildes/ñ aceptado', rUnicode.status === 200);
  check('se almacena normalizado a NFC', rUnicode.body?.displayName === nfcName);
  const rUnicodeGet = await req('GET', '/user/profile', d.authHeaders);
  check('el valor persistido sigue siendo NFC tras releer', rUnicodeGet.body?.displayName === nfcName);

  console.log('--- 12. Eliminación completa del perfil al cierre definitivo de la cuenta ---');
  const e = await newSession('e');
  await req('POST', '/user/profile', e.authHeaders, { displayName: 'Cuenta E' });
  await req('POST', '/privacy/account-deletion', e.authHeaders, {});
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [e.accountId],
  );
  const rowBeforeSweep = await pg.query('SELECT count(*)::int AS n FROM user_profile WHERE account_id = $1', [
    e.accountId,
  ]);
  check('el perfil existe antes del barrido', rowBeforeSweep.rows[0].n === 1);

  const rSweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('sweep status 200', rSweep.status === 200);
  check('sweep procesó al menos 1 cuenta', rSweep.body?.deletion?.processed >= 1);

  const rowAfterSweep = await pg.query('SELECT count(*)::int AS n FROM user_profile WHERE account_id = $1', [
    e.accountId,
  ]);
  check('el perfil fue eliminado por completo (no anonimizado, no existe la fila)', rowAfterSweep.rows[0].n === 0);

  console.log('--- 13. Cerrar una cuenta SIN perfil inicializado no falla ---');
  const f = await newSession('f');
  // Deliberadamente sin POST /user/profile.
  await req('POST', '/privacy/account-deletion', f.authHeaders, {});
  await pg.query(
    "UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'",
    [f.accountId],
  );
  const rSweepNoProfile = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('sweep sigue en 200 aunque la cuenta no tenía perfil', rSweepNoProfile.status === 200);
  check('esa cuenta se procesó igual (sin perfil no es un fallo)', rSweepNoProfile.body?.deletion?.processed >= 1);
  const accountFAfter = await pg.query('SELECT status FROM account WHERE id = $1', [f.accountId]);
  check('Account.status CLOSED', accountFAfter.rows[0]?.status === 'CLOSED');

  console.log('--- 14. Repetir el barrido sigue siendo seguro (perfiles ya ausentes) ---');
  const rSweepAgain = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('segundo barrido inmediato -> 200, sin error', rSweepAgain.status === 200);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de USER pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
