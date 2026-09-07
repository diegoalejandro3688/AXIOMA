// PS-0C.2 (Increment A) -- gate de los "Términos de uso y convivencia
// pública". HTTP contra el servidor de gates ya compilado + Postgres directo
// para fixtures/inspección (mismo patrón que verify-public-profile-gate.ts).
//
// Cubre PS-0C.2 §46 (13 aserciones).
import 'dotenv/config';
import { Client } from 'pg';
import { CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION } from '@axioma/contracts';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) console.log(`  OK  ${label}`);
  else { console.error(`FALLO  ${label}`); failures += 1; }
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

async function newSession(tag: string) {
  const uid = `ps0c2-terms-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const s = await req('POST', '/auth/session', {}, { idToken });
  if (s.status !== 200) throw new Error(`sesión falló: ${s.status} ${JSON.stringify(s.body)}`);
  return { accountId: s.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': s.body.sessionId } };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const CURRENT = CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION;

  console.log('=== PS-0C.2 -- gate de Términos de participación pública ===\n');

  const a = await newSession('a');

  // 1. cuenta nueva no tiene aceptación
  let st = await req('GET', '/me/public-participation-terms', a.headers);
  check('1. cuenta nueva: acceptedVersion null', st.status === 200 && st.body.acceptedVersion === null && st.body.acceptedAt === null);
  check('3. status devuelve currentVersion', st.body.currentVersion === CURRENT);
  check('   isCurrent = false para cuenta nueva', st.body.isCurrent === false);

  // 2. uso privado sigue posible sin aceptar (estudio/ensayos/IA no dependen de esto)
  const me = await req('GET', '/auth/me', a.headers);
  check('2. uso privado disponible sin aceptar (GET /auth/me 200)', me.status === 200);
  const claim = await req('POST', '/user/public-profile', a.headers, { username: `ps0c2a${Date.now() % 100000}` });
  check('   reclamar username (crea PRIVATE) no exige aceptación', claim.status === 201 || claim.status === 200);

  // 7 + 8. sin Términos vigentes -> no se puede publicar (hacer visible); bypass directo por API falla
  const vis1 = await req('PATCH', '/user/public-profile/visibility', a.headers, { visible: true });
  check('7/8. HACER VISIBLE sin Términos -> 403 PUBLIC_TERMS_ACCEPTANCE_REQUIRED',
    vis1.status === 403 && vis1.body?.error?.code === 'PUBLIC_TERMS_ACCEPTANCE_REQUIRED');
  const stillPrivate = await pg.query('SELECT visibility_status FROM public_profile WHERE account_id=$1', [a.accountId]);
  check('   perfil sigue PRIVATE tras el intento bloqueado', stillPrivate.rows[0]?.visibility_status === 'PRIVATE');

  // 6. no se puede forjar una versión antigua/futura
  const forgeOld = await req('POST', '/me/public-participation-terms/accept', a.headers, { version: '2000-01-01' });
  check('6a. versión antigua rechazada (PUBLIC_TERMS_VERSION_MISMATCH)',
    forgeOld.status === 400 && forgeOld.body?.error?.code === 'PUBLIC_TERMS_VERSION_MISMATCH');
  const forgeFuture = await req('POST', '/me/public-participation-terms/accept', a.headers, { version: '2999-12-31' });
  check('6b. versión futura rechazada', forgeFuture.status === 400 && forgeFuture.body?.error?.code === 'PUBLIC_TERMS_VERSION_MISMATCH');
  const forged = await pg.query('SELECT public_terms_accepted_version FROM account WHERE id=$1', [a.accountId]);
  check('   ninguna aceptación forjada se persistió', forged.rows[0]?.public_terms_accepted_version === null);

  // 4 + 5. aceptar la versión vigente persiste timestamp + versión EXACTA del backend
  const accept = await req('POST', '/me/public-participation-terms/accept', a.headers, { version: CURRENT });
  check('4/5. aceptar vigente -> 200 isCurrent=true', accept.status === 200 && accept.body.isCurrent === true && accept.body.acceptedVersion === CURRENT && typeof accept.body.acceptedAt === 'string');
  const persisted = await pg.query('SELECT public_terms_accepted_version, public_terms_accepted_at FROM account WHERE id=$1', [a.accountId]);
  check('   persistido: versión = vigente, timestamp presente',
    persisted.rows[0]?.public_terms_accepted_version === CURRENT && persisted.rows[0]?.public_terms_accepted_at !== null);

  // 9. aceptada -> publicar (hacer visible) funciona
  const vis2 = await req('PATCH', '/user/public-profile/visibility', a.headers, { visible: true });
  check('9. con Términos vigentes -> HACER VISIBLE 200', vis2.status === 200 && vis2.body.visibilityStatus === 'VISIBLE');

  // 10 + 11. subir la "versión vigente" en la DB deja la aceptación previa OBSOLETA -> no presentable
  await pg.query("UPDATE account SET public_terms_accepted_version = '2020-01-01' WHERE id=$1", [a.accountId]);
  st = await req('GET', '/me/public-participation-terms', a.headers);
  check('10. aceptación de versión no vigente -> isCurrent=false', st.body.isCurrent === false && st.body.acceptedVersion === '2020-01-01');
  // el perfil de A está VISIBLE; un tercero B ya no debe verlo (terms obsoletos)
  const b = await newSession('b');
  const username = (await pg.query('SELECT username_normalized FROM public_profile WHERE account_id=$1', [a.accountId])).rows[0].username_normalized;
  const bView = await req('GET', `/user/public-profile/${username}/competitive-profile`, b.headers);
  check('11. aceptación obsoleta suprime la presentabilidad pública (404 uniforme)', bView.status === 404);

  // 12. re-aceptar la versión vigente restaura la elegibilidad
  const reaccept = await req('POST', '/me/public-participation-terms/accept', a.headers, { version: CURRENT });
  check('12a. re-aceptar vigente -> isCurrent=true', reaccept.status === 200 && reaccept.body.isCurrent === true);
  const bView2 = await req('GET', `/user/public-profile/${username}/competitive-profile`, b.headers);
  check('12b. perfil vuelve a ser presentable para un tercero', bView2.status === 200 && bView2.body.username === username);

  // 13. sin auto-aceptación retroactiva: una cuenta nueva con username público nunca queda aceptada sola
  const c = await newSession('c');
  await req('POST', '/user/public-profile', c.headers, { username: `ps0c2c${Date.now() % 100000}` });
  const cStatus = await req('GET', '/me/public-participation-terms', c.headers);
  check('13. sin auto-aceptación retroactiva (cuenta con username pero sin aceptar -> null)', cStatus.body.acceptedVersion === null);

  await pg.end();
  if (failures > 0) { console.error(`\n${failures} verificación(es) fallida(s).`); process.exit(1); }
  console.log('\nTodas las verificaciones pasaron.');
}

main().catch((e) => { console.error(e); process.exit(1); });
