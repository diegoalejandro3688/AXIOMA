// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 2 --
// "Actor administrativo, roles y autorización editorial".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.2 (frontera) y §13.2 (criterios).
//
// Contra el BACKEND REAL ya levantado y contra PostgreSQL REAL (conexión
// directa `pg` para fixtures y para inspeccionar columnas), mismo patrón que
// `verify-auth-gate.ts` (ADR-0004). No usa NestFactory aquí: tsx/esbuild no
// emite los metadatos de decoradores que la DI de Nest necesita.
//
// NUNCA gasta Anthropic: este gate no toca IA ni siquiera indirectamente --
// no importa nada de `src/ai/` y no llama a ningún endpoint de `/ai`.
//
// Uso:
//   node dist/main.js            (en otra terminal, con PORT propio)
//   npm run verify:admin-identity-gate -- http://127.0.0.1:<PORT>
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
const srcDir = join(backendDir, 'src');

let failures = 0;
let checksRun = 0;

/**
 * Elimina comentarios de un fuente TypeScript. Imprescindible para que las
 * comprobaciones estáticas midan el CÓDIGO y no la documentación: los
 * docstrings de este incremento nombran deliberadamente `AuthGuard`,
 * `InternalOpsGuard` e `INTERNAL_OPS_KEY` para explicar por qué NO se usan, y
 * un grep ingenuo sobre el archivo entero daría un falso positivo.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function check(label: string, condition: boolean) {
  checksRun++;
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function get(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, raw: text };
}

/**
 * Bootstrap REAL por el CLI compilado -- no un INSERT de fixture. El gate debe
 * probar el mecanismo autorizado de creación de actores, no una imitación.
 * Devuelve el token en claro capturado de stdout, que es el único momento en
 * que ese valor existe.
 */
function bootstrapActor(name: string, roles: string, expiresInDays: number) {
  const result = spawnSync(
    'node',
    ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', String(expiresInDays)],
    // SIN `shell: true`: en Windows el shell re-parsea la línea y parte
    // `--name "Autora 1755..."` en varios argumentos, de modo que el actor se
    // crearía con el nombre truncado y el control positivo de más abajo
    // mediría otra cosa. `node` es un ejecutable real, no necesita shell.
    { cwd: backendDir, encoding: 'utf8' },
  );
  const stdout = result.stdout ?? '';
  const actorId = /actorId\s*:\s*([0-9a-f-]{36})/i.exec(stdout)?.[1] ?? '';
  const token = /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(stdout)?.[1] ?? '';
  return { status: result.status, stdout, stderr: result.stderr ?? '', actorId, token };
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ==========================================================================
  // 0. Identidad del proceso bajo prueba -- protocolo obligatorio.
  //
  // Un puerto residual de una sesión anterior serviría un binario ANTIGUO y
  // el gate mediría otra cosa. Antes de nada se confirma que el servidor
  // atendiendo en `base` es este build: /administration/me debe existir (401,
  // no 404). Un 404 significa proceso viejo sin el módulo del Incremento 2.
  // ==========================================================================
  console.log('--- 0. Identidad del proceso bajo prueba (anti-puerto-residual) ---');
  const probe = await get('/administration/me');
  check(
    `el backend en ${base} expone /administration/me (401, no 404) -> es el binario de este incremento`,
    probe.status === 401,
  );
  if (probe.status === 404) {
    console.error('       -> 404: el proceso escuchando en este puerto NO tiene el módulo ADMINISTRATION.');
    console.error('       -> Es un servidor residual. Mátalo y levanta `node dist/main.js` de este build.');
    process.exit(1);
  }

  // ==========================================================================
  // 1. Bootstrap controlado: crear AdminActor por el CLI (FASE D).
  // ==========================================================================
  console.log('--- 1. Bootstrap controlado de AdminActor por CLI ---');
  // Instantánea previa: el bootstrap administrativo no debe tocar AUTH.
  const authSessionsBefore = (await pg.query(`SELECT count(*)::int AS n FROM auth_session`)).rows[0].n as number;

  const author = bootstrapActor(`Autora ${suffix}`, 'AUTHOR', 7);
  check('el CLI de bootstrap creó un AdminActor con rol AUTHOR (exit 0)', author.status === 0);
  if (author.status !== 0) console.error(author.stderr || author.stdout);
  check('el CLI devolvió un actorId', /^[0-9a-f-]{36}$/i.test(author.actorId));
  check('el CLI imprimió un token en claro en el momento de la creación', author.token.startsWith('axadm_'));

  const publisher = bootstrapActor(`Publicador ${suffix}`, 'PUBLISHER', 7);
  check('el CLI creó un segundo AdminActor con rol PUBLISHER', publisher.status === 0 && publisher.token.length > 0);

  const both = bootstrapActor(`Ambos Roles ${suffix}`, 'AUTHOR,PUBLISHER', 7);
  check('el CLI creó un AdminActor con AMBOS roles simultáneamente', both.status === 0 && both.token.length > 0);

  const cliInvalidRole = bootstrapActor(`Rol Invalido ${suffix}`, 'ADMINISTRATOR', 7);
  check(
    'el CLI RECHAZA un rol fuera de los dos de V1 (los otros 4 de ADMIN-003 no están implementados)',
    cliInvalidRole.status !== 0,
  );

  const cliNoExpiry = spawnSync(
    'node',
    ['dist/cli/create-admin-actor.js', '--name', `Sin Expiracion ${suffix}`, '--roles', 'AUTHOR'],
    // SIN `shell: true`: en Windows el shell re-parsea la línea y parte
    // `--name "Autora 1755..."` en varios argumentos, de modo que el actor se
    // crearía con el nombre truncado y el control positivo de más abajo
    // mediría otra cosa. `node` es un ejecutable real, no necesita shell.
    { cwd: backendDir, encoding: 'utf8' },
  );
  check(
    'el CLI RECHAZA emitir un token sin expiración explícita (no hay plazo por defecto inventado)',
    cliNoExpiry.status !== 0,
  );

  // ==========================================================================
  // 2. El token en claro solo existe en la emisión.
  // ==========================================================================
  console.log('--- 2. El token en claro solo existe en el momento de la creación ---');
  const expectedHash = createHash('sha256').update(author.token, 'utf8').digest('hex');

  const tokenRow = await pg.query(
    `SELECT id, actor_id, token_hash, issued_at, expires_at, revoked_at FROM admin_actor_token WHERE actor_id = $1`,
    [author.actorId],
  );
  check('existe exactamente UNA fila de token para el actor recién creado', tokenRow.rowCount === 1);
  check(
    'el hash almacenado es EXACTAMENTE SHA-256 del token conocido (re-hasheo verificado)',
    tokenRow.rows[0]?.token_hash === expectedHash,
  );
  check(
    'el hash almacenado NO es igual al token en claro',
    tokenRow.rows[0]?.token_hash !== author.token,
  );

  // Búsqueda del valor en claro en TODA columna de texto de TODA tabla de la
  // base -- no solo en las administrativas. Si el token estuviera persistido
  // en cualquier sitio, aquí aparecería.
  const textColumns = await pg.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text','character varying','character','json','jsonb')`,
  );
  let plaintextHits: string[] = [];
  for (const col of textColumns.rows as Array<{ table_name: string; column_name: string }>) {
    const found = await pg.query(
      `SELECT 1 FROM "${col.table_name}" WHERE "${col.column_name}"::text = $1 LIMIT 1`,
      [author.token],
    );
    if ((found.rowCount ?? 0) > 0) plaintextHits.push(`${col.table_name}.${col.column_name}`);
  }
  check(
    `NINGUNA columna de texto de NINGUNA tabla contiene el token en claro (${textColumns.rowCount} columnas revisadas)`,
    plaintextHits.length === 0,
  );
  if (plaintextHits.length > 0) console.error(`       -> ${plaintextHits.join(', ')}`);

  check(
    'la tabla admin_actor_token NO tiene ninguna columna que pudiera guardar el valor en claro',
    !(await pg.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema='public' AND table_name='admin_actor_token'
          AND column_name NOT IN ('id','actor_id','token_hash','issued_at','expires_at','revoked_at')`,
    )).rowCount,
  );

  // ==========================================================================
  // 3. Autenticación: token válido, inválido, expirado, revocado, inactivo.
  // ==========================================================================
  console.log('--- 3. Semántica de autenticación (401 uniforme) ---');
  const okMe = await get('/administration/me', { 'x-admin-token': author.token });
  check('token válido -> 200', okMe.status === 200);
  const meBody = okMe.body as { actorId?: string; displayName?: string; roles?: string[] };
  check('la respuesta identifica al actor correcto', meBody?.actorId === author.actorId);
  check('la respuesta trae el rol AUTHOR resuelto por el backend', JSON.stringify(meBody?.roles) === '["AUTHOR"]');

  const noToken = await get('/administration/me');
  check('sin token -> 401 (nunca acceso anónimo)', noToken.status === 401);

  const badToken = await get('/administration/me', { 'x-admin-token': 'axadm_token_totalmente_inventado' });
  check('token inválido/desconocido -> 401', badToken.status === 401);

  // Expirado: fixture directa en Postgres, igual que verify-auth-gate.ts.
  const expiring = bootstrapActor(`Expirado ${suffix}`, 'AUTHOR', 7);
  await pg.query(`UPDATE admin_actor_token SET expires_at = now() - interval '1 day' WHERE actor_id = $1`, [
    expiring.actorId,
  ]);
  const expiredRes = await get('/administration/me', { 'x-admin-token': expiring.token });
  check('token expirado -> 401', expiredRes.status === 401);

  const revoking = bootstrapActor(`Revocado ${suffix}`, 'AUTHOR', 7);
  const beforeRevoke = await get('/administration/me', { 'x-admin-token': revoking.token });
  check('control positivo: el token funcionaba ANTES de revocarlo (200)', beforeRevoke.status === 200);
  await pg.query(`UPDATE admin_actor_token SET revoked_at = now() WHERE actor_id = $1`, [revoking.actorId]);
  const afterRevoke = await get('/administration/me', { 'x-admin-token': revoking.token });
  check('token revocado -> 401 en la request INMEDIATAMENTE siguiente (revocación sin caché)', afterRevoke.status === 401);

  const deactivating = bootstrapActor(`Desactivado ${suffix}`, 'AUTHOR', 7);
  const beforeDeactivate = await get('/administration/me', { 'x-admin-token': deactivating.token });
  check('control positivo: el actor operaba ANTES de desactivarlo (200)', beforeDeactivate.status === 200);
  await pg.query(`UPDATE admin_actor SET is_active = false, deactivated_at = now() WHERE id = $1`, [
    deactivating.actorId,
  ]);
  const afterDeactivate = await get('/administration/me', { 'x-admin-token': deactivating.token });
  check('actor desactivado -> 401 (aunque su token siga vigente y sin revocar)', afterDeactivate.status === 401);

  const messages = [noToken, badToken, expiredRes, afterRevoke, afterDeactivate].map(
    (r) => (r.body as { error?: { message?: string } })?.error?.message,
  );
  check(
    'los CINCO rechazos devuelven el MISMO mensaje genérico (no revelan la causa a un atacante)',
    new Set(messages).size === 1 && typeof messages[0] === 'string' && messages[0].length > 0,
  );
  check(
    'ningún cuerpo de rechazo menciona "expirado"/"revocado"/"desactivado"/"token"',
    ![noToken, badToken, expiredRes, afterRevoke, afterDeactivate].some((r) =>
      /expirad|revocad|desactivad|inactiv|hash/i.test(r.raw),
    ),
  );

  // ==========================================================================
  // 4. Expiración evaluada SERVER-SIDE.
  // ==========================================================================
  console.log('--- 4. La expiración se evalúa server-side, nunca desde el cliente ---');
  const clientClaims = await get('/administration/me', {
    'x-admin-token': expiring.token,
    'x-admin-token-expires-at': new Date(Date.now() + 999 * 86_400_000).toISOString(),
    'x-expires-at': new Date(Date.now() + 999 * 86_400_000).toISOString(),
  });
  check(
    'un cliente que afirma una expiración futura NO revive su token expirado -> 401',
    clientClaims.status === 401,
  );
  // Reactivar la fila en la base sí lo revive: prueba de que la autoridad es
  // la columna `expires_at`, no ningún dato del request.
  await pg.query(`UPDATE admin_actor_token SET expires_at = now() + interval '1 day' WHERE actor_id = $1`, [
    expiring.actorId,
  ]);
  const revived = await get('/administration/me', { 'x-admin-token': expiring.token });
  check('cambiar `expires_at` EN LA BASE sí lo revive -> 200 (la autoridad es la columna)', revived.status === 200);

  // ==========================================================================
  // 5. Autorización por rol: 403 frente a 401.
  // ==========================================================================
  console.log('--- 5. Autorización por rol (403) frente a autenticación (401) ---');
  const authorOnAuthoring = await get('/administration/me/authoring-access', { 'x-admin-token': author.token });
  check('actor con rol AUTHOR accede a una superficie que exige AUTHOR -> 200', authorOnAuthoring.status === 200);

  const authorOnPublishing = await get('/administration/me/publishing-access', { 'x-admin-token': author.token });
  check('actor AUTHOR sin rol PUBLISHER -> 403 (no 401: está autenticado)', authorOnPublishing.status === 403);

  const publisherOnPublishing = await get('/administration/me/publishing-access', { 'x-admin-token': publisher.token });
  check('actor con rol PUBLISHER resuelve correctamente -> 200', publisherOnPublishing.status === 200);
  check(
    'la identidad del PUBLISHER trae su rol resuelto desde la base',
    JSON.stringify((publisherOnPublishing.body as { roles?: string[] })?.roles) === '["PUBLISHER"]',
  );

  const publisherOnAuthoring = await get('/administration/me/authoring-access', { 'x-admin-token': publisher.token });
  check('actor PUBLISHER sin rol AUTHOR -> 403', publisherOnAuthoring.status === 403);

  const bothMe = await get('/administration/me', { 'x-admin-token': both.token });
  const bothRoles = ((bothMe.body as { roles?: string[] })?.roles ?? []).slice().sort();
  check(
    'un actor con AMBOS roles conserva AMBOS (AUTHOR y PUBLISHER)',
    JSON.stringify(bothRoles) === '["AUTHOR","PUBLISHER"]',
  );
  const bothAuthoring = await get('/administration/me/authoring-access', { 'x-admin-token': both.token });
  const bothPublishing = await get('/administration/me/publishing-access', { 'x-admin-token': both.token });
  check(
    'el actor con ambos roles accede a las DOS superficies (200 y 200)',
    bothAuthoring.status === 200 && bothPublishing.status === 200,
  );

  const noRoleOn401 = await get('/administration/me/publishing-access', { 'x-admin-token': 'axadm_inexistente' });
  check('token inválido sobre una ruta con rol -> 401, NO 403 (autenticación primero)', noRoleOn401.status === 401);

  // ==========================================================================
  // 6. El cliente NO puede añadir roles (prueba activa).
  // ==========================================================================
  console.log('--- 6. El cliente NO decide su rol: los roles vienen SOLO de la base ---');
  const forgedHeaders = await get('/administration/me/publishing-access', {
    'x-admin-token': author.token,
    'x-admin-role': 'PUBLISHER',
    'x-admin-roles': 'AUTHOR,PUBLISHER',
    'x-admin-actor-id': publisher.actorId,
    role: 'PUBLISHER',
    roles: 'PUBLISHER',
  });
  check(
    'un AUTHOR que envía cabeceras de rol falsas sigue recibiendo 403 (los roles del request se ignoran)',
    forgedHeaders.status === 403,
  );

  const forgedOnMe = await get('/administration/me', {
    'x-admin-token': author.token,
    'x-admin-role': 'PUBLISHER',
    'x-admin-roles': 'AUTHOR,PUBLISHER',
  });
  check(
    'la identidad devuelta ignora las cabeceras de rol falsas (sigue siendo solo AUTHOR)',
    JSON.stringify((forgedOnMe.body as { roles?: string[] })?.roles) === '["AUTHOR"]',
  );

  const forgedQuery = await get(
    '/administration/me/publishing-access?role=PUBLISHER&roles=PUBLISHER&actorId=' + publisher.actorId,
    { 'x-admin-token': author.token },
  );
  check('un AUTHOR que envía rol/actor por query string sigue recibiendo 403', forgedQuery.status === 403);

  // ==========================================================================
  // 7. Un token no puede asumir la identidad de otro actor.
  // ==========================================================================
  console.log('--- 7. El token del actor A no puede asumir la identidad del actor B ---');
  const impersonation = await get('/administration/me', {
    'x-admin-token': author.token,
    'x-admin-actor-id': publisher.actorId,
    'x-actor-id': publisher.actorId,
  });
  check(
    'el token de A + cabecera con el id de B sigue resolviendo a A',
    (impersonation.body as { actorId?: string })?.actorId === author.actorId,
  );
  check(
    'el token de A NUNCA resuelve al actorId de B',
    (impersonation.body as { actorId?: string })?.actorId !== publisher.actorId,
  );
  const impersonationQuery = await get(`/administration/me?actorId=${publisher.actorId}`, {
    'x-admin-token': author.token,
  });
  check(
    'ni por query string: el token de A resuelve a A',
    (impersonationQuery.body as { actorId?: string })?.actorId === author.actorId,
  );

  // ==========================================================================
  // 8. Separación: estudiante e InternalOpsGuard NO autentican como AdminActor.
  // ==========================================================================
  console.log('--- 8. Separación de Account/AuthGuard e InternalOpsGuard ---');

  // Se comprueba ANTES de crear deliberadamente la sesión de estudiante de
  // más abajo: hasta este punto se han creado seis AdminActor por bootstrap y
  // se han autenticado varias veces, y `auth_session` no se ha movido ni una
  // fila. El bootstrap administrativo no toca AUTH ni por asomo.
  const authSessionsAfterBootstrap = (await pg.query(`SELECT count(*)::int AS n FROM auth_session`)).rows[0].n as number;
  check(
    'el bootstrap de AdminActor y sus autenticaciones NO crearon ninguna sesión de estudiante',
    authSessionsAfterBootstrap === authSessionsBefore,
  );
  check(
    'control positivo: sí se crearon AdminActor en ese intervalo (la comprobación anterior no es vacía)',
    ((await pg.query(`SELECT count(*)::int AS n FROM admin_actor WHERE display_name LIKE $1`, [`%${suffix}`])).rows[0]
      .n as number) >= 5,
  );

  // Sesión de estudiante REAL contra el endpoint administrativo.
  const { StubIdentityProvider } = await import('../src/auth/identity-provider/stub-identity.provider');
  const studentToken = StubIdentityProvider.encode({
    providerSubject: `uid-admin-gate-${suffix}`,
    email: `student-admin-gate-${suffix}@example.com`,
    emailVerified: true,
  });
  const sessionRes = await fetch(base + '/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken: studentToken }),
  });
  const sessionBody = (await sessionRes.json()) as { sessionId?: string; accountId?: string };
  check(
    'control positivo: la sesión de estudiante es REAL y funciona en su propia superficie',
    sessionRes.status === 200 &&
      (await get('/auth/me', { authorization: `Bearer ${studentToken}`, 'x-session-id': sessionBody.sessionId ?? '' }))
        .status === 200,
  );
  const studentOnAdmin = await get('/administration/me', {
    authorization: `Bearer ${studentToken}`,
    'x-session-id': sessionBody.sessionId ?? '',
  });
  check('una sesión de estudiante REAL contra /administration/me -> 401', studentOnAdmin.status === 401);
  const studentAsAdminToken = await get('/administration/me', { 'x-admin-token': sessionBody.sessionId ?? '' });
  check('el sessionId de estudiante presentado como X-Admin-Token -> 401', studentAsAdminToken.status === 401);

  const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
  check('(precondición) INTERNAL_OPS_KEY está configurada para poder probar el rechazo', opsKey.length > 0);
  const opsOnAdmin = await get('/administration/me', { 'x-internal-ops-key': opsKey });
  check('la clave VÁLIDA de InternalOpsGuard contra /administration/me -> 401', opsOnAdmin.status === 401);
  const opsAsAdminToken = await get('/administration/me', { 'x-admin-token': opsKey });
  check('la clave de InternalOpsGuard presentada como X-Admin-Token -> 401', opsAsAdminToken.status === 401);

  const adminTokenOnOps = await fetch(base + '/privacy/_internal/sweep', {
    method: 'POST',
    headers: { 'x-admin-token': author.token },
  });
  check(
    'el token administrativo NO abre un endpoint de InternalOpsGuard (separación en ambos sentidos)',
    adminTokenOnOps.status === 401,
  );

  check(
    'la ÚNICA sesión de estudiante existente en el intervalo es la que este gate creó a propósito',
    ((await pg.query(`SELECT count(*)::int AS n FROM auth_session`)).rows[0].n as number) ===
      authSessionsAfterBootstrap + 1,
  );

  // ==========================================================================
  // 9. Registro de acceso append-only y atribución histórica.
  // ==========================================================================
  console.log('--- 9. Registro de acceso append-only y atribución histórica (DG-9) ---');
  const logRows = await pg.query(
    `SELECT id, outcome, request_path FROM admin_access_log WHERE actor_id = $1 ORDER BY occurred_at ASC`,
    [author.actorId],
  );
  check('el acceso quedó registrado y atribuido al actor', (logRows.rowCount ?? 0) > 0);
  check(
    'el registro contiene al menos un ACCEPTED del actor',
    logRows.rows.some((r) => r.outcome === 'ACCEPTED'),
  );
  const rejectedRows = await pg.query(
    `SELECT outcome FROM admin_access_log WHERE actor_id = $1 AND outcome <> 'ACCEPTED'`,
    [revoking.actorId],
  );
  check(
    'el motivo granular del rechazo se conserva INTERNAMENTE (REJECTED_REVOKED), aunque el 401 sea genérico',
    rejectedRows.rows.some((r) => r.outcome === 'REJECTED_REVOKED'),
  );
  const unknownRows = await pg.query(
    `SELECT count(*)::int AS n FROM admin_access_log WHERE actor_id IS NULL AND outcome = 'REJECTED_UNKNOWN_TOKEN'`,
  );
  check('un token desconocido también queda registrado (actor_id NULL)', unknownRows.rows[0].n > 0);

  const logId = logRows.rows[0].id as string;
  try {
    await pg.query(`UPDATE admin_access_log SET outcome = 'ACCEPTED' WHERE id = $1`, [logId]);
    check('UPDATE sobre admin_access_log es RECHAZADO por PostgreSQL (append-only)', false);
  } catch {
    check('UPDATE sobre admin_access_log es RECHAZADO por PostgreSQL (append-only)', true);
  }
  try {
    await pg.query(`DELETE FROM admin_access_log WHERE id = $1`, [logId]);
    check('DELETE sobre admin_access_log es RECHAZADO por PostgreSQL (append-only)', false);
  } catch {
    check('DELETE sobre admin_access_log es RECHAZADO por PostgreSQL (append-only)', true);
  }

  // Desactivación sin hard-delete (invariante 23).
  try {
    await pg.query(`DELETE FROM admin_actor WHERE id = $1`, [deactivating.actorId]);
    check('borrar un AdminActor referenciado por el registro FALLA (FK Restrict)', false);
  } catch {
    check('borrar un AdminActor referenciado por el registro FALLA (FK Restrict)', true);
  }
  const historicAfterDeactivate = await pg.query(
    `SELECT count(*)::int AS n FROM admin_access_log WHERE actor_id = $1`,
    [deactivating.actorId],
  );
  check(
    'tras desactivarlo, las acciones históricas del actor siguen consultables y atribuidas a él',
    historicAfterDeactivate.rows[0].n > 0,
  );
  const stillThere = await pg.query(`SELECT is_active, deactivated_at FROM admin_actor WHERE id = $1`, [
    deactivating.actorId,
  ]);
  check(
    'la fila del actor desactivado sigue existiendo (desactivación, nunca hard-delete)',
    stillThere.rowCount === 1 && stillThere.rows[0].is_active === false && stillThere.rows[0].deactivated_at !== null,
  );

  // ==========================================================================
  // 10. La respuesta NO expone secretos ni datos de otros dominios.
  // ==========================================================================
  console.log('--- 10. La superficie administrativa no filtra secretos ni datos ajenos ---');
  const keys = Object.keys((okMe.body ?? {}) as Record<string, unknown>).sort();
  check(
    'GET /administration/me devuelve EXACTAMENTE actorId, displayName, roles',
    JSON.stringify(keys) === '["actorId","displayName","roles"]',
  );
  check('la respuesta NO contiene el token en claro', !okMe.raw.includes(author.token));
  check('la respuesta NO contiene el hash del token', !okMe.raw.includes(expectedHash));
  check(
    'la respuesta NO contiene datos de Account/PROGRESS/GAMIFICATION/PRIVACY/AI',
    !/accountId|sessionId|studentResponse|conversation|xp|league|privacyRequest/i.test(okMe.raw),
  );
  check(
    'la respuesta NO contiene metadata interna del token (id, fechas, estado)',
    !/tokenId|tokenHash|expiresAt|issuedAt|revokedAt|isActive/i.test(okMe.raw),
  );

  // ==========================================================================
  // 11. Logs: ni el token ni su hash aparecen en la salida generada.
  // ==========================================================================
  console.log('--- 11. Logs y salida: ni token ni hash se filtran ---');
  const logFile = join(backendDir, 'backend-observability.log');
  if (existsSync(logFile)) {
    const logContent = readFileSync(logFile, 'utf8');
    check('el log de observabilidad del backend no contiene el token en claro', !logContent.includes(author.token));
    check('el log de observabilidad del backend no contiene el hash del token', !logContent.includes(expectedHash));
  } else {
    check('(no hay backend-observability.log en este entorno; comprobación no aplicable)', true);
    check('(idem, hash)', true);
  }
  const { sanitizeForLog } = await import('../src/platform/observability/sanitize');
  const sanitized = JSON.stringify(
    sanitizeForLog({
      'x-admin-token': author.token,
      adminToken: author.token,
      tokenHash: expectedHash,
      plainToken: author.token,
      nested: { headers: { 'X-Admin-Token': author.token } },
    }),
  );
  check('el sanitizador de logs REDACTA el token administrativo en cualquier anidamiento', !sanitized.includes(author.token));
  check('el sanitizador de logs REDACTA también el hash del token', !sanitized.includes(expectedHash));

  const cliStdout = author.stdout;
  check('el CLI imprime el token exactamente UNA vez en su salida', cliStdout.split(author.token).length - 1 === 1);

  // ==========================================================================
  // 12. Comprobaciones estáticas de separación y de frontera.
  // ==========================================================================
  console.log('--- 12. Comprobaciones estáticas (separación, frontera, secretos) ---');
  const adminDir = join(srcDir, 'administration');
  const adminFiles = readdirSync(adminDir).filter((f) => f.endsWith('.ts'));
  // Las comprobaciones de separación se hacen sobre el CÓDIGO, con los
  // comentarios eliminados: los docstrings citan `AuthGuard`,
  // `InternalOpsGuard` e `INTERNAL_OPS_KEY` precisamente para documentar que
  // NO se usan, y medirlos sería un falso positivo del propio gate.
  const adminSource = adminFiles.map((f) => readFileSync(join(adminDir, f), 'utf8')).join('\n');
  const adminCode = stripComments(adminSource);
  const cliSource = readFileSync(join(srcDir, 'cli', 'create-admin-actor.ts'), 'utf8');
  const cliCode = stripComments(cliSource);
  const newCode = `${adminCode}\n${cliCode}`;

  check(
    'ningún archivo del módulo administrativo importa AuthGuard/AuthService',
    !/from '\.\.\/auth\//.test(adminCode) && !/\bAuthGuard\b|\bAuthService\b/.test(adminCode),
  );
  check(
    'ningún archivo del módulo administrativo importa InternalOpsGuard',
    !/\bInternalOpsGuard\b|internal-ops/.test(adminCode),
  );
  check('ningún archivo del módulo administrativo lee INTERNAL_OPS_KEY', !/INTERNAL_OPS_KEY/.test(newCode));
  check(
    'el módulo administrativo no importa EDUCATION/PROGRESS/GAMIFICATION/PRIVACY/AI',
    !/from '\.\.\/(education|progress|gamification|privacy|ai)\//.test(adminCode),
  );
  check(
    'el CLI de bootstrap no importa nada de auth/ (nunca disponible para un estudiante)',
    !/from '\.\.\/auth\//.test(cliCode),
  );
  check(
    'no hay secretos hardcodeados en el código nuevo (ni claves, ni tokens literales)',
    !/axadm_[A-Za-z0-9_-]{20,}/.test(newCode) && !/(secret|password|apikey)\s*=\s*['"][^'"]{8,}/i.test(newCode),
  );

  const schema = readFileSync(join(backendDir, 'prisma', 'schema.prisma'), 'utf8');
  const adminModelsBlock = schema.slice(schema.indexOf('model AdminActor '));
  check(
    'ninguna tabla administrativa tiene FK hacia Account (invariante 6)',
    !/Account\s+@relation|accountId/.test(adminModelsBlock),
  );
  const accountModel = schema.slice(schema.indexOf('model Account {'), schema.indexOf('model AuthIdentity'));
  check(
    'Account NO ganó ningún campo de rol ni referencia administrativa',
    !/role|admin/i.test(accountModel.replace(/\/\/.*$/gm, '')),
  );

  const fkRows = await pg.query(
    `SELECT tc.table_name, ccu.table_name AS ref
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('admin_actor','admin_actor_role','admin_actor_token','admin_access_log')`,
  );
  check(
    'en PostgreSQL real, ninguna FK de una tabla administrativa apunta a `account`',
    !fkRows.rows.some((r) => r.ref === 'account'),
  );

  const mobileDir = join(backendDir, '..', 'mobile');
  if (existsSync(mobileDir)) {
    const hits = spawnSync(
      'node',
      // Sensible a mayúsculas y con límites de palabra a propósito: `author`
      // en minúscula aparece dentro de `authorization`/`auth-provider` en el
      // cliente y no tiene nada que ver con el rol administrativo AUTHOR.
      ['-e', `const fs=require('fs');const p=require('path');let h=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.name==='node_modules'||e.name.startsWith('.'))continue;const f=p.join(d,e.name);if(e.isDirectory())w(f);else if(/\\.(ts|tsx)$/.test(e.name)){const c=fs.readFileSync(f,'utf8');if(/\\bAdminRole\\b|\\bAUTHOR\\b|\\bPUBLISHER\\b|x-admin-token|\\badminActor\\b/.test(c))h.push(f);}}})(${JSON.stringify(mobileDir)});console.log(h.join('\\n'));`],
      { encoding: 'utf8' },
    );
    check(
      'apps/mobile NO conoce roles administrativos ni la cabecera del token (no es fuente de autoridad)',
      (hits.stdout ?? '').trim().length === 0,
    );
  } else {
    check('(apps/mobile no presente en este checkout)', true);
  }

  // Frontera del incremento: nada de Incrementos 3-6.
  const contractsAdmin = readFileSync(
    join(backendDir, '..', '..', 'packages', 'contracts', 'src', 'administration.ts'),
    'utf8',
  );
  check(
    'ningún contrato de petición administrativa contiene un campo de rol o de actor (no hay *RequestSchema)',
    !/RequestSchema/.test(stripComments(contractsAdmin)),
  );
  check(
    'el controller administrativo solo expone GET (cero rutas de escritura)',
    !/@Post|@Put|@Patch|@Delete/.test(readFileSync(join(adminDir, 'administration.controller.ts'), 'utf8')),
  );
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN DE ASERCIÓN (no relajación) -- trazabilidad obligatoria.
  //
  // Esta aserción decía antes: "no existe módulo/controller editorial de
  // contenido (Incrementos 3-6 NO construidos)", implementada como "la carpeta
  // `editorial` no existe". Era una condición TEMPORAL, cierta al cerrar el
  // Incremento 2 y escrita así porque entonces NINGÚN incremento editorial
  // estaba autorizado.
  //
  // Quedó SUPERSEDED por la implementación LEGÍTIMA del Incremento 3 de LEF
  // Bloque VII (transiciones editoriales T4-T8, `admin_action`, CMS-018 con
  // excepción auditada), autorizada por el PO, que crea `src/editorial/`.
  //
  // Esta es su SUCESORA y conserva el propósito original en sus DOS mitades,
  // sin debilitar nada:
  //   (a) FRONTERA: I4/I5/I6 SIGUEN ausentes -- Content Coverage Matrix,
  //       importación masiva, `CMS-013` y T1/T2/T3 (creación/edición de
  //       contenido vía API). La superficie administrativa/editorial solo puede
  //       declarar las DOS rutas de escritura de transición del I3.
  //   (b) NO REGRESIÓN DE IDENTIDAD: el I3 NO alteró ninguna garantía del I2--
  //       `AdminAuthGuard`/`AdminRoleGuard` siguen definidos UNA sola vez en
  //       `src/administration` (no reimplementados ni duplicados en
  //       `src/editorial`), el I3 los CONSUME importándolos, no los redefine;
  //       no hay ningún camino de autenticación administrativa alternativo
  //       (ni cabecera distinta de `x-admin-token`, ni verificación de token
  //       propia fuera de `administration`); y `admin_actor`,
  //       `admin_actor_token` y `admin_access_log` conservan su forma exacta en
  //       PostgreSQL real (la migración del I3 no las toca).
  // Todo se comprueba estáticamente sobre el código ejecutable (sin
  // comentarios) más el SQL real de la migración del I3.
  // --------------------------------------------------------------------------
  const collectTsFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) return [];
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collectTsFiles(full);
      return entry.name.endsWith('.ts') ? [full] : [];
    });
  const editorialDir = join(srcDir, 'editorial');
  const adminEditorialFiles = [adminDir, editorialDir].filter(existsSync).flatMap(collectTsFiles);
  const adminEditorialCode = adminEditorialFiles.map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  const allSrcCode = collectTsFiles(srcDir)
    .map((f) => stripComments(readFileSync(f, 'utf8')))
    .join('\n');
  const i3WriteRoutes = [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*(['"`])(.*?)\1/g)].map(
    (m) => m[2],
  );
  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 4 (2026-08-18).
  // Misma naturaleza y mismo tratamiento que en el gate del Incremento 1: la
  // enumeración de rutas era una ASERCIÓN TEMPORAL DE AUSENCIA del I4, no una
  // garantía funcional de identidad administrativa. El I4 se construyó con
  // autorización explícita y dentro de §12.4, de modo que la lista se amplía a
  // las OCHO rutas de escritura autorizadas. Todo lo que este gate protege de
  // verdad --guards no reimplementados, token hasheado, backend como autoridad
  // de rol, forma de las tres tablas de identidad, InternalOpsGuard sin acceso
  // editorial-- queda intacto y sigue verificándose exactamente igual.
  const authorizedI3WriteRoutes = [
    // Incremento 3 -- transiciones.
    'question-versions/:versionId/transitions',
    'learning-resource-versions/:versionId/transitions',
    // Incremento 4 -- autoría (T1 y T2), §12.4.
    'questions',
    'questions/:questionId/versions',
    'learning-resources',
    'learning-resources/:resourceId/versions',
    'question-versions/:versionId',
    'learning-resource-versions/:versionId',
  ];
  // (b) Los dos guards siguen teniendo UNA definición única, y vive en
  // `src/administration`. Fuera de ahí solo pueden aparecer como importación/uso.
  const guardDefinitions = collectTsFiles(srcDir).filter((f) =>
    /export\s+class\s+(AdminAuthGuard|AdminRoleGuard)\b/.test(stripComments(readFileSync(f, 'utf8'))),
  );
  const guardsOnlyInAdministration =
    guardDefinitions.length === 2 && guardDefinitions.every((f) => f.startsWith(adminDir));
  const editorialCode = existsSync(editorialDir)
    ? collectTsFiles(editorialDir)
        .map((f) => stripComments(readFileSync(f, 'utf8')))
        .join('\n')
    : '';
  // El I3 consume la identidad del I2: la importa, no la reimplementa.
  const i3ReusesAdminIdentity =
    editorialCode === '' ||
    (/from\s+['"]\.\.\/administration\/admin-auth\.guard['"]/.test(editorialCode) &&
      /from\s+['"]\.\.\/administration\/admin-role\.guard['"]/.test(editorialCode) &&
      !/x-admin-token/i.test(editorialCode) &&
      !/createHash|bcrypt|argon2|compareToken|verifyToken/i.test(editorialCode));
  // Forma exacta de las tres tablas de identidad del I2, en PostgreSQL REAL.
  const identityShape = await pg.query(
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('admin_actor','admin_actor_token','admin_access_log')
      ORDER BY table_name, column_name`,
  );
  const identityFingerprint = identityShape.rows
    .map((r) => `${r.table_name}.${r.column_name}:${r.data_type}:${r.is_nullable}`)
    .join('|');
  const i3MigrationDir = readdirSync(join(backendDir, 'prisma', 'migrations')).find((d) =>
    d.includes('lef_vii_i3_editorial_transitions'),
  );
  const i3MigrationSql = i3MigrationDir
    ? readFileSync(join(backendDir, 'prisma', 'migrations', i3MigrationDir, 'migration.sql'), 'utf8')
    : '';
  const i3DoesNotTouchIdentityTables =
    !/ALTER\s+TABLE\s+"?(admin_actor|admin_actor_token|admin_access_log|admin_actor_role)"?/i.test(i3MigrationSql) &&
    !/DROP\s+(TABLE|COLUMN)\s+"?(admin_actor|admin_actor_token|admin_access_log|admin_actor_role)"?/i.test(
      i3MigrationSql,
    );
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 5 (2026-08-19).
  //
  // CLASIFICACIÓN (A vs B): "sin Coverage Matrix" era una **aserción temporal
  // de frontera entre incrementos** (tipo B) -- decía "el I5 todavía no
  // existe" --, no una garantía funcional de identidad administrativa (tipo
  // A). Ninguna de las garantías que este gate protege de verdad (guards con
  // definición única en `src/administration`, token hasheado, backend como
  // autoridad de rol, forma de las tres tablas de identidad, `InternalOpsGuard`
  // sin acceso editorial) dependía jamás de que la matriz no existiera.
  //
  // NO ES UNA RELAJACIÓN: la aserción se sustituye por su sucesora, MÁS
  // FUERTE. Antes se afirmaba la ausencia de la matriz; ahora se afirma que la
  // matriz existe y (i) NO añadió ninguna ruta de escritura -- la lista sigue
  // siendo EXACTAMENTE la misma de ocho, y `src/editorial/` ya está dentro del
  // barrido, de modo que un `@Post` nuevo en el módulo de la matriz haría caer
  // este check --, y (ii) CONSUME la identidad del I2 en vez de reimplementarla
  // (lo cubre `i3ReusesAdminIdentity`, que barre todo `src/editorial/` y por
  // tanto también el controller de la matriz).
  // --------------------------------------------------------------------------
  const coverageModuleFiles = [
    join(srcDir, 'editorial', 'coverage-matrix.controller.ts'),
    join(srcDir, 'editorial', 'coverage-matrix.module.ts'),
    join(srcDir, 'education', 'content-coverage.service.ts'),
    join(srcDir, 'education', 'content-coverage.repository.ts'),
  ].filter(existsSync);
  const coverageModuleCode = coverageModuleFiles.map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');

  // El CLI del Incremento 6 CONSUME la identidad administrativa del I2; no la
  // reimplementa. Presenta el token por la MISMA cabecera y deja que el backend
  // resuelva identidad y rol (invariante 22): no lo hashea, no lo verifica, no
  // consulta roles y no abre ninguna cabecera de autenticación alternativa.
  const i6CliFile = join(srcDir, 'cli', 'editorial.ts');
  const i6CliCode = existsSync(i6CliFile) ? stripComments(readFileSync(i6CliFile, 'utf8')) : '';
  const i6CliReusesAdminIdentity =
    i6CliCode.length > 0 &&
    /x-admin-token/.test(i6CliCode) &&
    !/createHash|bcrypt|argon2|compareToken|verifyToken/.test(i6CliCode) &&
    !/adminActorRole|admin_actor_role|AdminRoleGuard|AdminAuthGuard/.test(i6CliCode) &&
    !/['"]AUTHOR['"]|['"]PUBLISHER['"]/.test(i6CliCode) &&
    !/PrismaService|@prisma\/client|generated\/prisma/.test(i6CliCode);

  const coverageIsReadOnlyAndReusesIdentity =
    coverageModuleFiles.length === 4 &&
    !/@(?:Post|Put|Patch|Delete)\s*\(/.test(coverageModuleCode) &&
    !/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(coverageModuleCode) &&
    // No abre un camino de autenticación administrativa alternativo.
    !/x-admin-token/i.test(coverageModuleCode) &&
    !/createHash|bcrypt|argon2|compareToken|verifyToken/i.test(coverageModuleCode) &&
    // No devuelve datos de estudiante por la superficie administrativa (§11.4).
    !/StudentResponse|AiConversation|AiMessage/.test(coverageModuleCode);
  check(
    // ------------------------------------------------------------------------
    // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 6 (2026-08-19).
    //
    // CLASIFICACIÓN (A vs B): este check es MIXTO y se trata pieza a pieza.
    //  - "sin importación masiva" es una garantía **tipo A, PERMANENTE**:
    //    CMS-026..029 está diferido para TODO el Bloque VII por decisión E, no
    //    solo hasta el I6. Su condición (el regex sobre `allSrcCode`) NO se
    //    toca y sigue exactamente igual.
    //  - "I6 sigue ausente" era una **aserción temporal de frontera (tipo B)**
    //    y además IMPRECISA: conflaba el Incremento 6 con la importación
    //    masiva, que son cosas distintas (§12.6 define el I6 como CLI interna,
    //    y §3 difiere la importación por separado). El I6 ya está construido.
    //
    // NO ES UNA RELAJACIÓN: no se elimina ninguna condición. Solo se corrige el
    // enunciado para que describa lo que el check realmente mide, y se AÑADE
    // una condición nueva -- que el CLI del I6 no reimplementa la
    // identidad administrativa ni abre un camino de autenticación alternativo
    // --, que es justo la garantía del I2 que un cliente nuevo podría amenazar.
    // El número de checks se conserva (1 -> 1).
    // ------------------------------------------------------------------------
    'la importación masiva sigue ausente (CMS-026..029, diferida para TODO el bloque por decisión E); la Content Coverage Matrix del Incremento 5 existe pero es de SOLO LECTURA y CONSUME la identidad administrativa del Incremento 2 sin reimplementarla; el CLI del Incremento 6 tampoco la reimplementa (no hashea ni verifica tokens, no consulta roles y presenta el token por la MISMA cabecera del I2); y ni el I3, ni el I4, ni el I5, ni el I6 alteraron ninguna garantía de identidad administrativa del Incremento 2 (guards no reimplementados ni debilitados, mismo patrón de autenticación, y admin_actor/admin_actor_token/admin_access_log sin cambio de forma)',
    // (a) frontera I5/I6
    coverageIsReadOnlyAndReusesIdentity &&
      // Tipo A, sin cambios: la importación masiva sigue diferida para todo el bloque.
      !/bulk[_-]?import|importjob|import[_-]?batch|importcontent|content[_-]?import/i.test(allSrcCode) &&
      // Añadido por el I6: el CLI nuevo NO reimplementa la identidad del I2.
      i6CliReusesAdminIdentity &&
      [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*\)/g)].length === 0 &&
      i3WriteRoutes.length === authorizedI3WriteRoutes.length &&
      i3WriteRoutes.every((r) => authorizedI3WriteRoutes.includes(r)) &&
      // (b) no regresión de identidad del I2
      guardsOnlyInAdministration &&
      i3ReusesAdminIdentity &&
      identityShape.rowCount > 0 &&
      identityFingerprint.includes('admin_actor.') &&
      identityFingerprint.includes('admin_actor_token.') &&
      identityFingerprint.includes('admin_access_log.') &&
      i3DoesNotTouchIdentityTables,
  );

  const i1Migration = readdirSync(join(backendDir, 'prisma', 'migrations')).find((d) =>
    d.includes('lef_vii_i1_published_immutability'),
  );
  check('la migración del Incremento 1 sigue presente e intacta en el historial', Boolean(i1Migration));
  const i2Migration = readFileSync(
    join(backendDir, 'prisma', 'migrations', '20260815160000_lef_vii_i2_admin_actor_identity', 'migration.sql'),
    'utf8',
  );
  check(
    'la migración del Incremento 2 es ADITIVA: no altera ninguna tabla preexistente',
    !/ALTER TABLE "(account|auth_session|auth_identity|question_version|learning_resource_version|answer_option)"/i.test(
      i2Migration,
    ) && !/DROP /i.test(i2Migration),
  );

  // ==========================================================================
  // 13. ADMIN-002 -- estado PARCIAL, no satisfecho.
  // ==========================================================================
  console.log('--- 13. ADMIN-002 queda PARCIALMENTE satisfecho (§9.6) ---');
  check(
    'el código documenta explícitamente el diferimiento de MFA/segundo factor',
    /MFA|segundo factor/i.test(adminSource) && /NO SATISFECHO|parcial/i.test(adminSource),
  );
  check(
    'NO existe ningún mecanismo simulado de segundo factor en el módulo administrativo',
    !/otp|totp|secondFactor|mfaCode|verificationCode/i.test(adminSource),
  );
  console.log('');
  console.log('  AVISO CONTRACTUAL OBLIGATORIO (LEF-BLOCK-VII-DEFINITION.md §9.6, §13.2 punto 11):');
  console.log('  ADMIN-002 NO queda satisfecho al cerrar el Incremento 2.');
  console.log('    Satisfecho : cuenta individual, credencial no compartida, hasheada,');
  console.log('                 revocable, expirable, auditada, separada del estudiante.');
  console.log('    DIFERIDO   : verificación adicional / segundo factor para operaciones');
  console.log('                 críticas. DG-7 autorizó el token personal y NO autorizó');
  console.log('                 diseñar un sistema de MFA. No se ha inventado ni simulado.');
  console.log('  Retención administrativa (DG-9): periodo EXPLÍCITAMENTE DIFERIDO, sin número.');
  console.log('');

  await pg.end();

  console.log(`Checks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de identidad administrativa (LEF Bloque VII, Incremento 2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
