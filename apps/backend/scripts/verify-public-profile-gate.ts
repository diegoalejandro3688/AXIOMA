// Gate del incremento "Public Profile Foundation" (Bloque II, Learning
// Experience Foundation) -- ver docs/adr/0018-public-profile-foundation.md.
// Prueba contra el servidor real ya compilado y corriendo (endpoints de
// autoservicio /user/public-profile/*, /privacy/*) más acceso directo a
// Postgres para fixtures/inspección y al CLI de recuperación (sin endpoint
// HTTP, ver ADR-0005), mismo patrón que verify-privacy-gate.ts.
//
// Cubre los 8 Decision Gates de la sección "Validación" de ADR-0018. NO
// implementa ni prueba rankings, historial competitivo, títulos
// equipados, cosméticos ni estadísticas públicas -- fuera de alcance.
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { UserService } from '../src/user/user.service';
import { UserProfileRepository } from '../src/user/user-profile.repository';
import { PublicProfileRepository } from '../src/user/public-profile.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

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

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `public-profile-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

function recoverViaCli(accountId: string): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('node', ['dist/cli/recover-account.js', accountId], { encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (error) {
    const e = error as { status?: number; stdout?: Buffer };
    return { status: e.status ?? 1, stdout: e.stdout?.toString() ?? '' };
  }
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Instancia propia de UserService -- necesaria para probar el guard de
  // lifecycleStatus=ACTIVE DIRECTAMENTE: solicitar el cierre de cuenta
  // revoca todas las sesiones de la cuenta de inmediato (AuthService,
  // comportamiento correcto y ya validado -- no un defecto), así que no
  // hay ninguna sesión HTTP válida con la que probar el guard sobre una
  // cuenta ya RETIRED. Mismo patrón de instanciación directa que otros
  // gates (ver verify-gamification-xp-grant-gate.ts).
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const userService = new UserService(new UserProfileRepository(prisma), new PublicProfileRepository(prisma));

  const suffix = Date.now();
  // Username permite máximo 20 caracteres (ADR-0018 §2) -- Date.now() completo
  // (13 dígitos) no cabe junto a un prefijo descriptivo; se usa un sufijo corto.
  const shortSuffix = String(suffix).slice(-6);
  const opsHeaders = { 'x-internal-ops-key': opsKey };

  console.log('--- 1. Creación perezosa e idempotente -- SIEMPRE nace PRIVATE/ACTIVE (Decision Gates 3) ---');
  const alice = await createSession('alice');
  const usernameAlice = `alice_${shortSuffix}`;
  const claim1 = await req('POST', '/user/public-profile', alice.headers, { username: usernameAlice });
  check('primer POST -> 201', claim1.status === 201);
  check('username persistido en forma canónica (minúsculas)', claim1.body?.username === usernameAlice.toLowerCase());
  check('visibilityStatus == PRIVATE al nacer (precisión obligatoria del Product Owner)', claim1.body?.visibilityStatus === 'PRIVATE');
  check('lifecycleStatus == ACTIVE al nacer', claim1.body?.lifecycleStatus === 'ACTIVE');

  const claim2 = await req('POST', '/user/public-profile', alice.headers, { username: `otro_uname_${shortSuffix}` });
  check('segundo POST (con OTRO username) -> 200, no 201 (idempotente, no-op)', claim2.status === 200);
  check('segundo POST NO cambia el username ya reservado', claim2.body?.username === usernameAlice.toLowerCase());

  console.log('--- 1b. Forma canónica única: mayúsculas se normalizan, sin distinguirse de minúsculas ---');
  const bob = await createSession('bob');
  const mixedCaseUsername = `BoB_Mixed_${shortSuffix}`;
  const claimMixed = await req('POST', '/user/public-profile', bob.headers, { username: mixedCaseUsername });
  check('POST con mayúsculas -> 201', claimMixed.status === 201);
  check('se persiste y devuelve en minúsculas -- sin forma de presentación separada', claimMixed.body?.username === mixedCaseUsername.toLowerCase());

  console.log('--- 1c. Nombres reservados y unicidad rechazados (Decision Gate 5) ---');
  const carol = await createSession('carol');
  const reservedAttempt = await req('POST', '/user/public-profile', carol.headers, { username: 'admin' });
  check('username reservado ("admin") -> 409, nunca creado', reservedAttempt.status === 409);

  const carolAgain = await createSession('carol2');
  const duplicateAttempt = await req('POST', '/user/public-profile', carolAgain.headers, { username: usernameAlice });
  check('username ya tomado por otra cuenta -> 409', duplicateAttempt.status === 409);

  console.log('--- 2. Ningún campo prohibido alcanzable (Decision Gate 2) ---');
  const getAlice = await req('GET', '/user/public-profile', alice.headers);
  const exposedKeys = Object.keys(getAlice.body ?? {}).sort();
  const allowedKeys = ['accountId', 'createdAt', 'lifecycleStatus', 'updatedAt', 'username', 'visibilityStatus'].sort();
  check(
    'la respuesta expone EXACTAMENTE los campos autorizados (Data Model §6.5) -- sin avatarReference ni ningún otro campo interno',
    JSON.stringify(exposedKeys) === JSON.stringify(allowedKeys),
  );

  console.log('--- 3. Reversibilidad de visibilidad en ambas direcciones, sin fricción (Decision Gate 4) ---');
  const makeVisible = await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });
  check('PATCH visibility {visible:true} -> 200', makeVisible.status === 200);
  check('visibilityStatus == VISIBLE', makeVisible.body?.visibilityStatus === 'VISIBLE');

  const makePrivateAgain = await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: false });
  check('PATCH visibility {visible:false} -> 200', makePrivateAgain.status === 200);
  check('visibilityStatus == PRIVATE de nuevo (reversible en ambas direcciones)', makePrivateAgain.body?.visibilityStatus === 'PRIVATE');

  console.log('--- 3b. Ocultar visibilidad NO toca lifecycleStatus ni datos de GAMIFICATION (Decision Gate 7) ---');
  const xpBalanceBefore = await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [alice.accountId]);
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: true });
  await req('PATCH', '/user/public-profile/visibility', alice.headers, { visible: false });
  const aliceAfterToggle = await pg.query('SELECT lifecycle_status FROM public_profile WHERE account_id = $1', [alice.accountId]);
  check('lifecycleStatus sigue ACTIVE tras alternar visibilidad varias veces', aliceAfterToggle.rows[0]?.lifecycle_status === 'ACTIVE');
  const xpBalanceAfter = await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [alice.accountId]);
  check('ninguna fila de xp_balance fue creada/tocada por operaciones de visibilidad', xpBalanceBefore.rows[0].n === xpBalanceAfter.rows[0].n);

  console.log('--- 4. Cambio de username: frecuencia, ventana de reserva y nombres reservados (Decision Gate 5) ---');
  const dave = await createSession('dave');
  const daveUsername1 = `dave_${shortSuffix}`;
  await req('POST', '/user/public-profile', dave.headers, { username: daveUsername1 });

  const changeTooSoon = await req('PATCH', '/user/public-profile/username', dave.headers, { username: `dave_2nd_${shortSuffix}` });
  check('cambio de username inmediatamente después de crear -> 409 (cooldown de 30 días)', changeTooSoon.status === 409);

  const reservedChange = await req('PATCH', '/user/public-profile/username', dave.headers, { username: 'axioma' });
  check('cambiar a un nombre reservado -> 409', reservedChange.status === 409);

  // Simula que pasaron 31 días desde el último cambio -- mismo criterio que
  // otros gates (verify-privacy-gate.ts) manipulan timestamps vía SQL en
  // vez de esperar el plazo real.
  await pg.query("UPDATE public_profile SET username_changed_at = now() - interval '31 days' WHERE account_id = $1", [dave.accountId]);
  const daveUsername2 = `dave_ren_${shortSuffix}`;
  const changeAllowed = await req('PATCH', '/user/public-profile/username', dave.headers, { username: daveUsername2 });
  check('cambio de username tras 31 días -> 200', changeAllowed.status === 200);
  check('username actualizado a la nueva forma canónica', changeAllowed.body?.username === daveUsername2.toLowerCase());

  const historyRows = await pg.query(
    'SELECT previous_username_normalized, new_username_normalized, change_reason FROM profile_username_history WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1) ORDER BY changed_at ASC',
    [dave.accountId],
  );
  check('historial: 2 filas (INITIAL_CLAIM + USER_CHANGE) -- append-only', historyRows.rowCount === 2);
  check('primera fila: INITIAL_CLAIM, sin username anterior', historyRows.rows[0].change_reason === 'INITIAL_CLAIM' && historyRows.rows[0].previous_username_normalized === null);
  check(
    'segunda fila: USER_CHANGE, con el username anterior correcto',
    historyRows.rows[1].change_reason === 'USER_CHANGE' && historyRows.rows[1].previous_username_normalized === daveUsername1.toLowerCase(),
  );

  const takenByOldName = await req('POST', '/user/public-profile', (await createSession('dave-impersonator')).headers, { username: daveUsername1 });
  check(
    'el username ANTERIOR de Dave sigue reservado (ventana de reserva, todavía no liberado)',
    takenByOldName.status === 409,
  );

  console.log('--- 5. Retiro/reactivación coordinados con PRIVACY (Decision Gates 6, 8) ---');
  const erin = await createSession('erin');
  const erinUsername = `erin_${shortSuffix}`;
  await req('POST', '/user/public-profile', erin.headers, { username: erinUsername });
  await req('PATCH', '/user/public-profile/visibility', erin.headers, { visible: true });

  const requestDeletion = await req('POST', '/privacy/account-deletion', erin.headers);
  check('POST /privacy/account-deletion -> 202', requestDeletion.status === 202);

  const erinAfterRequest = await pg.query('SELECT visibility_status, lifecycle_status, retired_at FROM public_profile WHERE account_id = $1', [
    erin.accountId,
  ]);
  check('lifecycleStatus == RETIRED INMEDIATAMENTE al solicitar (no espera los 30 días)', erinAfterRequest.rows[0]?.lifecycle_status === 'RETIRED');
  check('visibilityStatus forzado a PRIVATE al retirarse, aunque estaba VISIBLE', erinAfterRequest.rows[0]?.visibility_status === 'PRIVATE');
  check('retiredAt quedó registrado', erinAfterRequest.rows[0]?.retired_at !== null);

  // La sesión HTTP de Erin quedó revocada al solicitar el cierre
  // (AuthService.requestAccountDeletion revoca TODAS las sesiones de la
  // cuenta de inmediato) -- se prueba el guard a nivel de servicio,
  // directamente, sin pasar por AuthGuard.
  const erinProfileDirect = await userService.getPublicProfile(erin.accountId);
  check('el perfil sigue siendo legible directamente (retirado, no borrado)', erinProfileDirect.lifecycleStatus === 'RETIRED');
  let visibilityToggleRejected = false;
  try {
    await userService.setPublicProfileVisibility(erin.accountId, true);
  } catch (error) {
    visibilityToggleRejected = (error as { status?: number }).status === 409;
  }
  check('con el perfil RETIRED, intentar volverlo VISIBLE -> rechazado (409, no silenciosamente ignorado)', visibilityToggleRejected);

  console.log('--- 5b. Recuperación dentro del plazo -- reactiva a ACTIVE, permanece PRIVATE ---');
  const recoverResult = recoverViaCli(erin.accountId);
  check('CLI de recuperación termina sin error', recoverResult.status === 0);
  const erinAfterRecovery = await pg.query('SELECT visibility_status, lifecycle_status, retired_at FROM public_profile WHERE account_id = $1', [
    erin.accountId,
  ]);
  check('lifecycleStatus vuelve a ACTIVE tras recuperar la cuenta', erinAfterRecovery.rows[0]?.lifecycle_status === 'ACTIVE');
  check(
    'visibilityStatus SIGUE PRIVATE tras reactivar -- nunca se restaura VISIBLE automáticamente (Decision Gate 8)',
    erinAfterRecovery.rows[0]?.visibility_status === 'PRIVATE',
  );
  check('retiredAt se limpió', erinAfterRecovery.rows[0]?.retired_at === null);

  console.log('--- 5c. Cierre definitivo completado -- ANONYMIZED, terminal ---');
  const frank = await createSession('frank');
  const frankUsername = `frank_${shortSuffix}`;
  await req('POST', '/user/public-profile', frank.headers, { username: frankUsername });
  const requestFrankDeletion = await req('POST', '/privacy/account-deletion', frank.headers);
  check('POST /privacy/account-deletion (Frank) -> 202', requestFrankDeletion.status === 202);

  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [
    frank.accountId,
  ]);
  const sweepResult = await req('POST', '/privacy/_internal/sweep', opsHeaders);
  check('barrido de PRIVACY responde 200', sweepResult.status === 200);

  const frankAfterSweep = await pg.query(
    'SELECT lifecycle_status, anonymized_at, avatar_reference, username_normalized FROM public_profile WHERE account_id = $1',
    [frank.accountId],
  );
  check('lifecycleStatus == ANONYMIZED tras el cierre definitivo completado', frankAfterSweep.rows[0]?.lifecycle_status === 'ANONYMIZED');
  check('anonymizedAt quedó registrado', frankAfterSweep.rows[0]?.anonymized_at !== null);
  check('avatarReference limpiado', frankAfterSweep.rows[0]?.avatar_reference === null);

  const frankHistoryAfterClosure = await pg.query(
    "SELECT change_reason FROM profile_username_history WHERE public_profile_id = (SELECT id FROM public_profile WHERE account_id = $1) ORDER BY changed_at DESC LIMIT 1",
    [frank.accountId],
  );
  check('última entrada del historial documenta el cierre (ACCOUNT_CLOSURE)', frankHistoryAfterClosure.rows[0]?.change_reason === 'ACCOUNT_CLOSURE');

  console.log('--- 6. Frontera de dominio: PrivacyService NUNCA toca public_profile directamente (verificación estática) ---');
  const privacyServiceSource = readFileSync(join(__dirname, '..', 'src', 'privacy', 'privacy.service.ts'), 'utf8');
  const touchesPublicProfileTableDirectly = /prisma\.publicProfile|publicProfileRepo/.test(privacyServiceSource);
  check(
    'privacy.service.ts NO importa PublicProfileRepository ni referencia prisma.publicProfile -- coordina exclusivamente vía UserService',
    !touchesPublicProfileTableDirectly,
  );
  const callsUserServiceMethods =
    privacyServiceSource.includes('retirePublicProfileForAccountClosureRequest') &&
    privacyServiceSource.includes('reactivatePublicProfileForAccountRecovery') &&
    privacyServiceSource.includes('anonymizePublicProfileForAccountClosure');
  check('privacy.service.ts SÍ invoca los tres métodos públicos de UserService en los puntos correctos', callsUserServiceMethods);

  console.log('--- 7. Sin identidad requerida: llamar sin sesión -> 401 ---');
  const noAuth = await req('GET', '/user/public-profile');
  check('GET /user/public-profile sin sesión -> 401', noAuth.status === 401);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Public Profile Foundation pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
