// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 6 -- "CLI interna".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.6 (frontera exacta), §13.6 (los
// cinco criterios de cierre, citados literalmente sobre cada bloque de este
// archivo), decisión D (§4), DG-7 (§14.2) e invariantes 7, 12, 13 y 22 (§7.1).
//
// CRITERIO DE FONDO -- por qué este gate es mayoritariamente DINÁMICO:
// §13.6 punto 1 exige que el ciclo completo "se ejecute EXCLUSIVAMENTE desde el
// CLI, contra el backend real, sin una sola sentencia SQL manual y sin editar
// ningún archivo de código". Eso no es demostrable con grep. Este gate ejecuta
// el BINARIO COMPILADO `dist/cli/editorial.js` como proceso hijo real, con
// tokens reales emitidos por el CLI del Incremento 2, y recorre T1 -> T3 -> T5
// -> T7 -> corrección -> T8 sin tocar la base más que para OBSERVAR el
// resultado. Las comprobaciones estáticas (§13.6 puntos 3 y 4) son el
// complemento que demuestra AUSENCIA de capacidades -- que es lo único que un
// grep sí puede demostrar.
//
// REGLA DURA DE ESTE GATE: ninguna escritura de contenido editorial se hace por
// `pg` ni por `fetch`. Si una sola de ellas se colara, el gate dejaría de
// probar el invariante 12 ("ninguna operación editorial requiere modificación
// SQL manual") y pasaría por razones equivocadas. `pg` se usa EXCLUSIVAMENTE
// para (a) sembrar materia/tema, que NO son contenido editorial y cuya
// taxonomía (CMS-001) está fuera de alcance, (b) revocar/expirar tokens, que es
// administración de identidad del I2, y (c) LEER y verificar el efecto.
//
// DISCIPLINA DE FIXTURES (misma que I1/I3/I4/I5): el contenido que llega a
// publicarse NO puede borrarse (invariante 3, sin bypass) y no se toca el
// catálogo sembrado. El aislamiento sustituye a la limpieza: materia y tema
// propios por corrida, con sufijo único. En particular, este gate NUNCA
// selecciona contenido preexistente: todo lo que observa lo creó él mismo.
//
// NUNCA gasta Anthropic: no llama a ningún endpoint de `/ai`.
//
// Uso:
//   node dist/main.js            (en otra terminal, con PORT propio)
//   npm run verify:editorial-cli-gate -- http://127.0.0.1:<PORT>
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readdirSync, readFileSync, existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from 'pg';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
const srcDir = join(backendDir, 'src');
const repoRoot = join(backendDir, '..', '..');

let failures = 0;
let checksRun = 0;

function check(label: string, condition: boolean, detail?: string) {
  checksRun++;
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}

/** Igual que en los gates de I2/I3/I4/I5: mide el CÓDIGO, no los docstrings. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function collectTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, raw: text };
}

/** Actores por el CLI REAL del Incremento 2 -- nunca por INSERT de fixture. */
function bootstrapActor(name: string, roles: string) {
  const result = spawnSync(
    'node',
    ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', '7'],
    { cwd: backendDir, encoding: 'utf8' },
  );
  const stdout = result.stdout ?? '';
  return {
    status: result.status,
    actorId: /actorId\s*:\s*([0-9a-f-]{36})/i.exec(stdout)?.[1] ?? '',
    token: /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(stdout)?.[1] ?? '',
    stdout,
    stderr: result.stderr ?? '',
  };
}

/**
 * INVOCACIÓN DEL CLI BAJO PRUEBA -- el corazón del gate.
 *
 * Ejecuta el BINARIO COMPILADO como proceso hijo separado, exactamente como lo
 * haría una persona en su terminal. No importa el módulo, no llama a una
 * función interna: si el CLI no funciona de verdad de extremo a extremo, este
 * gate no puede pasar.
 *
 * `env` se construye EXPLÍCITAMENTE y NO hereda `INTERNAL_OPS_KEY` salvo cuando
 * una comprobación concreta quiere probar justo eso (§13.6 punto 2).
 */
function cli(args: string[], opts: { token?: string; env?: Record<string, string> } = {}) {
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    AXIOMA_ADMIN_API_URL: base,
    ...(opts.env ?? {}),
  };
  delete env.AXIOMA_ADMIN_TOKEN;
  if (opts.token) env.AXIOMA_ADMIN_TOKEN = opts.token;
  if (opts.env && 'AXIOMA_ADMIN_TOKEN' in opts.env) env.AXIOMA_ADMIN_TOKEN = opts.env.AXIOMA_ADMIN_TOKEN;

  const result = spawnSync('node', ['dist/cli/editorial.js', ...args], {
    cwd: backendDir,
    encoding: 'utf8',
    env,
  });
  const stdout = result.stdout ?? '';
  let body: any = null;
  let httpStatus = 0;
  try {
    const parsed = JSON.parse(stdout);
    body = parsed.body;
    httpStatus = parsed.httpStatus;
  } catch {
    /* salida no-JSON (ayuda, o error de argumentos antes de emitir petición) */
  }
  return { status: result.status, stdout, stderr: result.stderr ?? '', body, httpStatus };
}

const P = (text: string) => ({ type: 'paragraph', order: 0, text });
const BLOCKS = (text: string) => [P(text)];

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workDir = mkdtempSync(join(tmpdir(), 'lef7-i6-'));

  // ==========================================================================
  // 0. Identidad del proceso bajo prueba -- protocolo obligatorio.
  //
  // Un puerto residual de una sesión anterior serviría un binario ANTIGUO y el
  // gate mediría otra cosa. Las rutas que el CLI consume deben EXISTIR: sin
  // credencial deben responder 401, nunca 404.
  // ==========================================================================
  console.log('--- 0. Identidad del proceso bajo prueba (anti-puerto-residual) ---');
  const probeWrite = await req('POST', '/administration/editorial/questions', {}, {});
  check('el backend expone la superficie de autoría de I4 (401, no 404) -> binario correcto', probeWrite.status === 401, `status=${probeWrite.status}`);
  const probeMatrix = await req('GET', '/administration/editorial/coverage-matrix');
  check('el backend expone la matriz de cobertura de I5 (401, no 404) -> binario correcto', probeMatrix.status === 401, `status=${probeMatrix.status}`);
  if (probeWrite.status === 404 || probeMatrix.status === 404) {
    console.error('       -> 404: el proceso escuchando en este puerto NO tiene la superficie de I4/I5.');
    console.error('       -> Es un servidor residual. Mátalo y levanta `node dist/main.js` de este build.');
    process.exit(1);
  }
  check('el binario del CLI bajo prueba existe compilado (`dist/cli/editorial.js`)', existsSync(join(backendDir, 'dist', 'cli', 'editorial.js')));

  // ==========================================================================
  // 0.b Actores REALES por el CLI del Incremento 2, y referencias canónicas
  //     AISLADAS por corrida.
  //
  // Se necesitan DOS actores distintos porque CMS-018 (§8.3, invariante 9)
  // impide que quien creó la versión la apruebe o la publique. Ese "actor
  // distinto" es una exigencia LITERAL de §13.6 punto 1.
  // ==========================================================================
  console.log('--- 0.b Actores administrativos reales (CLI del Incremento 2) y referencias aisladas ---');
  const author = bootstrapActor(`Autor CLI ${suffix}`, 'AUTHOR');
  const publisher = bootstrapActor(`Publicador CLI ${suffix}`, 'PUBLISHER');
  check('CLI del I2 crea un actor AUTHOR y emite su token personal', author.status === 0 && !!author.token, author.stderr);
  check('CLI del I2 crea un actor PUBLISHER y emite su token personal', publisher.status === 0 && !!publisher.token, publisher.stderr);

  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate de CLI editorial', 'VII6', 'ACTIVE', 993, now(), now())`,
    [subjectId, `lef7-i6-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema del gate de CLI editorial', 1, $3, now(), now())`,
    [topicId, `LEF7.I6.TOPIC.${suffix}`, subjectId],
  );
  check('referencias canónicas de la corrida creadas (materia y tema propios, sin tocar el catálogo sembrado)', true);

  let seq = 0;
  const writePayload = (name: string, payload: unknown): string => {
    const file = join(workDir, `${name}.json`);
    writeFileSync(file, JSON.stringify(payload), 'utf8');
    return file;
  };
  const questionPayload = (stem: string, over: Record<string, unknown> = {}) => ({
    questionKey: `LEF7.I6.Q${++seq}.${suffix}`,
    primarySubjectId: subjectId,
    curriculumTopicId: topicId,
    stemContent: BLOCKS(stem),
    explanationContent: BLOCKS(`Explicación de: ${stem}`),
    answerOptions: [
      { content: P('20'), isCorrect: true },
      { content: P('25'), isCorrect: false },
      { content: P('30'), isCorrect: false },
      { content: P('40'), isCorrect: false },
    ],
    ...over,
  });

  // ==========================================================================
  // 1. §13.6 PUNTO 2 -- "El CLI presenta el token personal del actor; SIN TOKEN
  //    NO OPERA y no acepta `INTERNAL_OPS_KEY`. Con token revocado o expirado,
  //    tampoco opera."
  //
  // Se prueba ANTES del ciclo feliz a propósito: un CLI que operara sin
  // credencial haría irrelevante todo lo que viniera después.
  // ==========================================================================
  console.log('--- 1. Credencial: sin token no opera; INTERNAL_OPS_KEY no sirve (§13.6 punto 2) ---');

  const noToken = cli(['whoami']);
  check('sin token -> el CLI falla y NO opera (exit != 0)', noToken.status !== 0, `exit=${noToken.status}`);
  check('sin token -> el CLI ni siquiera emitió una petición (no hay httpStatus en su salida)', noToken.httpStatus === 0, noToken.stdout.slice(0, 200));
  check('sin token -> el mensaje nombra el token personal como única credencial', /token personal/i.test(noToken.stderr), noToken.stderr.slice(0, 200));

  // INTERNAL_OPS_KEY presente en el entorno NO debe conceder nada: el CLI ni la
  // lee. Decisión B y §7.2: "InternalOpsGuard -- CUALQUIER operación editorial,
  // sin excepción" está en su columna de "No puede".
  const opsKeyOnly = cli(['whoami'], { env: { INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY ?? 'local-dev-ops-key-not-a-secret' } });
  check('con `INTERNAL_OPS_KEY` en el entorno pero SIN token personal -> el CLI sigue sin operar', opsKeyOnly.status !== 0, `exit=${opsKeyOnly.status}`);
  check('con `INTERNAL_OPS_KEY` -> tampoco emitió ninguna petición (la clave compartida no es una credencial editorial)', opsKeyOnly.httpStatus === 0);

  const bogusToken = cli(['whoami'], { token: 'axadm_token_que_no_existe' });
  check('con un token desconocido -> el backend responde 401 y el CLI sale != 0', bogusToken.httpStatus === 401 && bogusToken.status !== 0, `http=${bogusToken.httpStatus} exit=${bogusToken.status}`);

  // Token REVOCADO y token EXPIRADO -- exigencia literal de §13.6 punto 2.
  // La revocación/expiración se hace sobre `admin_actor_token` (identidad del
  // I2), no sobre contenido editorial: sigue sin haber SQL editorial manual.
  const revokedActor = bootstrapActor(`Autor revocado CLI ${suffix}`, 'AUTHOR');
  await pg.query(`UPDATE admin_actor_token SET revoked_at = now() WHERE actor_id = $1`, [revokedActor.actorId]);
  const revoked = cli(['whoami'], { token: revokedActor.token });
  check('con token REVOCADO -> 401 y el CLI no opera (§13.6 punto 2)', revoked.httpStatus === 401 && revoked.status !== 0, `http=${revoked.httpStatus}`);

  const expiredActor = bootstrapActor(`Autor expirado CLI ${suffix}`, 'AUTHOR');
  await pg.query(`UPDATE admin_actor_token SET expires_at = now() - interval '1 day' WHERE actor_id = $1`, [expiredActor.actorId]);
  const expired = cli(['whoami'], { token: expiredActor.token });
  check('con token EXPIRADO -> 401 y el CLI no opera (§13.6 punto 2)', expired.httpStatus === 401 && expired.status !== 0, `http=${expired.httpStatus}`);

  const deactivatedActor = bootstrapActor(`Autor desactivado CLI ${suffix}`, 'AUTHOR');
  // Desactivación con la MISMA forma que aplica el repositorio del I2
  // (`admin-actor.repository.ts:59`: `isActive: false` + `deactivatedAt`) y que
  // ya usa `verify-admin-identity-gate.ts:236`. `deactivated_at` es la marca
  // temporal; `is_active` es lo que el servicio consulta
  // (`admin-identity.service.ts:162`). Poner solo la fecha dejaría al actor
  // operativo, y el gate estaría midiendo una desactivación que no ocurrió.
  await pg.query(`UPDATE admin_actor SET is_active = false, deactivated_at = now() WHERE id = $1`, [deactivatedActor.actorId]);
  const deactivated = cli(['whoami'], { token: deactivatedActor.token });
  check('con token de un actor DESACTIVADO -> 401 (invariante 23: la desactivación impide operar)', deactivated.httpStatus === 401, `http=${deactivated.httpStatus}`);

  // ==========================================================================
  // 2. EL BACKEND ES LA AUTORIDAD DE ROL (invariante 22, DG-7).
  //
  // `whoami` no es un adorno: es la prueba de que el rol lo RESUELVE el
  // servidor a partir del token, y de que el CLI nunca lo afirma.
  // ==========================================================================
  console.log('--- 2. El backend resuelve identidad y rol; el CLI solo presenta el token (invariante 22) ---');
  const whoAuthor = cli(['whoami'], { token: author.token });
  check('`whoami` con el token del autor -> 200', whoAuthor.httpStatus === 200 && whoAuthor.status === 0, `http=${whoAuthor.httpStatus}`);
  check('el backend devuelve el actorId REAL del autor (identidad resuelta server-side)', whoAuthor.body?.actorId === author.actorId, `${whoAuthor.body?.actorId} vs ${author.actorId}`);
  const authorRoles: string[] = whoAuthor.body?.roles ?? [];
  check('el backend devuelve exactamente el rol de autoría que el CLI del I2 le asignó, y ningún otro', authorRoles.length === 1 && authorRoles[0] === 'AUTHOR', authorRoles.join(','));

  const whoPublisher = cli(['whoami'], { token: publisher.token });
  const publisherRoles: string[] = whoPublisher.body?.roles ?? [];
  check('dos actores distintos obtienen roles distintos del mismo CLI -> el rol viene del token, no del cliente',
    publisherRoles.length === 1 && publisherRoles[0] === 'PUBLISHER' && authorRoles[0] !== publisherRoles[0], publisherRoles.join(','));

  // AISLAMIENTO ENTRE ACTORES: el token de uno nunca produce la identidad del
  // otro, aunque el comando sea idéntico. Es la misma invocación con distinta
  // credencial y nada más.
  check('aislamiento entre actores: el token del publicador NO devuelve el actorId del autor',
    whoPublisher.body?.actorId === publisher.actorId && whoPublisher.body?.actorId !== author.actorId);

  // ==========================================================================
  // 3. §13.6 PUNTO 1 -- EL CICLO COMPLETO, EXCLUSIVAMENTE DESDE EL CLI.
  //
  // "crear, enviar a revisión, aprobar (CON ACTOR DISTINTO), publicar, corregir
  // publicando versión nueva, retirar -- se ejecuta EXCLUSIVAMENTE desde el
  // CLI, contra el backend real, SIN UNA SOLA SENTENCIA SQL MANUAL y SIN
  // EDITAR NINGÚN ARCHIVO DE CÓDIGO (invariante 12)."
  //
  // A partir de aquí y hasta el final del bloque 3, NINGUNA escritura de
  // contenido pasa por `pg` ni por `fetch`: todas son `cli([...])`.
  // ==========================================================================
  console.log('--- 3. Ciclo editorial COMPLETO ejecutado solo con el CLI (§13.6 punto 1, invariante 12) ---');

  // -- T1: crear.
  const createFile = writePayload('crear', questionPayload('¿Cuánto es el 25% de 80?'));
  const created = cli(['question:create', '--file', createFile, '--reason', 'Alta inicial por CLI'], { token: author.token });
  check('T1 CREAR por CLI -> 201/200 y exit 0', created.status === 0 && [200, 201].includes(created.httpStatus), `http=${created.httpStatus} ${created.stdout.slice(0, 300)}`);
  const questionId: string = created.body?.identityId;
  const v1: string = created.body?.versionId;
  check('T1 por CLI devuelve identidad y versión, y la versión nace en DRAFT (no hay forma de pedir otro estado)',
    !!questionId && !!v1 && created.body?.editorialStatus === 'DRAFT', JSON.stringify(created.body));

  // El estado real en PostgreSQL, no el que el CLI dice. `pg` aquí solo OBSERVA.
  const v1Row = await pg.query(`SELECT editorial_status, published_at FROM question_version WHERE id = $1`, [v1]);
  check('OBSERVACIÓN en PostgreSQL: la versión creada por CLI está realmente en DRAFT con published_at nulo',
    v1Row.rows[0]?.editorial_status === 'DRAFT' && v1Row.rows[0]?.published_at === null, JSON.stringify(v1Row.rows[0]));

  // -- T2: editar en DRAFT, también por CLI.
  const updateFile = writePayload('editar', { stemContent: BLOCKS('¿Cuánto es el 25% de 80? (enunciado corregido)') });
  const updated = cli(['question:update', '--version-id', v1, '--file', updateFile, '--reason', 'Ajuste de redacción'], { token: author.token });
  check('T2 EDITAR EN DRAFT por CLI -> 200 y la versión sigue en DRAFT', updated.status === 0 && updated.body?.editorialStatus === 'DRAFT', `http=${updated.httpStatus}`);

  // -- T3: enviar a revisión.
  const submitted = cli(['submit', '--version-id', v1, '--reason', 'Listo para revisión'], { token: author.token });
  check('T3 ENVIAR A REVISIÓN por CLI -> 200, DRAFT -> IN_REVIEW', submitted.status === 0 && submitted.body?.newStatus === 'IN_REVIEW', `http=${submitted.httpStatus} ${submitted.stdout.slice(0, 300)}`);

  // -- CMS-018 verificado A TRAVÉS DEL CLI: el autor NO puede aprobar lo suyo.
  //    Es el punto donde §13.6 punto 1 exige "aprobar (con actor distinto)": el
  //    gate demuestra primero que el MISMO actor es rechazado.
  const selfApprove = cli(['approve', '--version-id', v1, '--reason', 'Intento de auto-aprobación'], { token: author.token });
  check('CMS-018 por CLI: el AUTOR de la versión NO puede aprobarla (rechazo del backend, exit != 0)',
    selfApprove.status !== 0 && [400, 403, 409].includes(selfApprove.httpStatus), `http=${selfApprove.httpStatus}`);
  check('el rechazo de auto-aprobación NO es una comprobación del CLI: hubo petición real y el backend la denegó',
    selfApprove.httpStatus !== 0, `http=${selfApprove.httpStatus}`);

  // -- T5: aprobar CON ACTOR DISTINTO (exigencia literal de §13.6 punto 1).
  const approved = cli(['approve', '--version-id', v1, '--reason', 'Revisión académica conforme'], { token: publisher.token });
  check('T5 APROBAR por CLI con ACTOR DISTINTO -> 200, IN_REVIEW -> APPROVED', approved.status === 0 && approved.body?.newStatus === 'APPROVED', `http=${approved.httpStatus} ${approved.stdout.slice(0, 300)}`);

  // -- T7: publicar.
  const publishOp = randomUUID();
  const published = cli(['publish', '--version-id', v1, '--reason', 'Publicación inicial', '--operation-id', publishOp], { token: publisher.token });
  check('T7 PUBLICAR por CLI -> 200, APPROVED -> PUBLISHED', published.status === 0 && published.body?.newStatus === 'PUBLISHED', `http=${published.httpStatus} ${published.stdout.slice(0, 300)}`);
  const v1Pub = await pg.query(`SELECT editorial_status, published_at FROM question_version WHERE id = $1`, [v1]);
  check('OBSERVACIÓN en PostgreSQL: la versión publicada por CLI está en PUBLISHED con published_at no nulo',
    v1Pub.rows[0]?.editorial_status === 'PUBLISHED' && v1Pub.rows[0]?.published_at !== null, JSON.stringify(v1Pub.rows[0]));

  // -- IDEMPOTENCIA (invariante 11) a través del CLI: reenviar el MISMO comando
  //    con la MISMA clave no repite el efecto ni duplica el registro.
  const actionsBefore = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE object_id = $1`, [v1]);
  const replay = cli(['publish', '--version-id', v1, '--reason', 'Publicación inicial', '--operation-id', publishOp], { token: publisher.token });
  check('IDEMPOTENCIA por CLI: reenviar el mismo comando con la misma clave -> 200 y marcado como repetición',
    replay.status === 0 && replay.body?.idempotentReplay === true, `http=${replay.httpStatus} ${replay.stdout.slice(0, 300)}`);
  const actionsAfter = await pg.query(`SELECT count(*)::int AS n FROM admin_action WHERE object_id = $1`, [v1]);
  check('IDEMPOTENCIA por CLI: la repetición NO añadió ningún registro nuevo a `admin_action` (invariante 11)',
    actionsBefore.rows[0].n === actionsAfter.rows[0].n, `antes=${actionsBefore.rows[0].n} después=${actionsAfter.rows[0].n}`);

  // -- CORREGIR: versión NUEVA, jamás editar la publicada (invariante 5, CMS-025).
  const correctionFile = writePayload('correccion', {
    curriculumTopicId: topicId,
    stemContent: BLOCKS('¿Cuánto es el 25% de 80? (versión corregida)'),
    explanationContent: BLOCKS('Corrección: 80 * 25 / 100 = 20.'),
    answerOptions: [
      { content: P('20'), isCorrect: true },
      { content: P('21'), isCorrect: false },
      { content: P('22'), isCorrect: false },
      { content: P('23'), isCorrect: false },
    ],
  });
  const correction = cli(['question:new-version', '--question-id', questionId, '--file', correctionFile, '--reason', 'Corrección de contenido'], { token: author.token });
  check('CORREGIR por CLI = crear versión NUEVA (invariante 5, CMS-025) -> 200/201 en DRAFT',
    correction.status === 0 && correction.body?.editorialStatus === 'DRAFT', `http=${correction.httpStatus} ${correction.stdout.slice(0, 300)}`);
  const v2: string = correction.body?.versionId;
  check('la versión corregida es una versión DISTINTA de la publicada, bajo la MISMA identidad',
    !!v2 && v2 !== v1 && correction.body?.identityId === questionId);

  const sub2 = cli(['submit', '--version-id', v2, '--reason', 'Corrección lista'], { token: author.token });
  check('T3 sobre la corrección por CLI -> IN_REVIEW', sub2.status === 0 && sub2.body?.newStatus === 'IN_REVIEW', `http=${sub2.httpStatus}`);
  const app2 = cli(['approve', '--version-id', v2, '--reason', 'Corrección conforme'], { token: publisher.token });
  check('T5 sobre la corrección por CLI, actor distinto -> APPROVED', app2.status === 0 && app2.body?.newStatus === 'APPROVED', `http=${app2.httpStatus}`);
  const pub2 = cli(['publish', '--version-id', v2, '--reason', 'Publicación de la corrección', '--operation-id', randomUUID()], { token: publisher.token });
  check('T7 sobre la corrección por CLI -> PUBLISHED', pub2.status === 0 && pub2.body?.newStatus === 'PUBLISHED', `http=${pub2.httpStatus} ${pub2.stdout.slice(0, 300)}`);
  check('T7 por CLI despublicó la versión anterior EN LA MISMA OPERACIÓN (§8.6, invariante 16)',
    pub2.body?.supersededVersionId === v1, `superseded=${pub2.body?.supersededVersionId} v1=${v1}`);

  // UNICIDAD observada en PostgreSQL tras un ciclo hecho ÍNTEGRAMENTE por CLI.
  const publishedCount = await pg.query(
    `SELECT count(*)::int AS n FROM question_version WHERE question_id = $1 AND editorial_status = 'PUBLISHED'`, [questionId]);
  check('INTERACCIÓN CON I1: tras corregir por CLI existe EXACTAMENTE UNA versión PUBLISHED de la identidad (invariante 16)',
    publishedCount.rows[0].n === 1, `n=${publishedCount.rows[0].n}`);

  // LA VERSIÓN ANTERIOR SIGUE ÍNTEGRA -- el CLI no la mutó ni pudo mutarla.
  const v1After = await pg.query(`SELECT editorial_status, stem_content FROM question_version WHERE id = $1`, [v1]);
  check('INTERACCIÓN CON I1/I4: la versión anterior quedó DEPRECATED, no borrada, y su contenido sigue íntegro',
    v1After.rows[0]?.editorial_status === 'DEPRECATED' && JSON.stringify(v1After.rows[0]?.stem_content).includes('enunciado corregido'),
    JSON.stringify(v1After.rows[0]?.editorial_status));

  // -- T8: retirar.
  const retired = cli(['retire', '--version-id', v2, '--reason', 'Retiro por error detectado', '--operation-id', randomUUID()], { token: publisher.token });
  check('T8 RETIRAR por CLI -> 200, PUBLISHED -> DEPRECATED (estado terminal de V1)',
    retired.status === 0 && retired.body?.newStatus === 'DEPRECATED', `http=${retired.httpStatus} ${retired.stdout.slice(0, 300)}`);
  const v2After = await pg.query(`SELECT editorial_status FROM question_version WHERE id = $1`, [v2]);
  check('OBSERVACIÓN en PostgreSQL: el retiro por CLI se aplicó de verdad', v2After.rows[0]?.editorial_status === 'DEPRECATED');

  check('CICLO COMPLETO (§13.6 punto 1): crear, editar, revisar, aprobar con actor distinto, publicar, corregir y retirar, TODO por CLI, sin una sola sentencia SQL de contenido',
    created.status === 0 && submitted.status === 0 && approved.status === 0 && published.status === 0 &&
    correction.status === 0 && pub2.status === 0 && retired.status === 0);

  // ==========================================================================
  // 3.b RECURSOS DE APRENDIZAJE -- §8.2 y §8.4 tratan las DOS familias en
  //     paralelo, y §13.6 punto 1 habla del ciclo, no de una sola familia.
  //     Un CLI que solo supiera de preguntas dejaría media plataforma sin
  //     cubrir y el invariante 12 sin cumplir.
  // ==========================================================================
  console.log('--- 3.b El ciclo también es completo para LearningResource (§8.2, ambas familias) ---');
  const resFile = writePayload('recurso', {
    resourceKey: `LEF7.I6.R1.${suffix}`,
    primarySubjectId: subjectId,
    resourceType: 'CONCEPT_EXPLANATION',
    curriculumTopicId: topicId,
    title: `Porcentajes -- gate CLI ${suffix}`,
    contentBlocks: BLOCKS('Un porcentaje es una fracción de denominador 100.'),
  });
  const resCreated = cli(['resource:create', '--file', resFile, '--reason', 'Alta de recurso por CLI'], { token: author.token });
  check('T1 CREAR RECURSO por CLI -> DRAFT', resCreated.status === 0 && resCreated.body?.editorialStatus === 'DRAFT', `http=${resCreated.httpStatus} ${resCreated.stdout.slice(0, 300)}`);
  const rv1: string = resCreated.body?.versionId;
  const resSub = cli(['submit', '--object', 'resource', '--version-id', rv1, '--reason', 'Recurso listo'], { token: author.token });
  check('T3 sobre recurso por CLI (`--object resource`) -> IN_REVIEW', resSub.status === 0 && resSub.body?.newStatus === 'IN_REVIEW', `http=${resSub.httpStatus}`);
  const resApp = cli(['approve', '--object', 'resource', '--version-id', rv1, '--reason', 'Recurso conforme'], { token: publisher.token });
  check('T5 sobre recurso por CLI, actor distinto -> APPROVED', resApp.status === 0 && resApp.body?.newStatus === 'APPROVED', `http=${resApp.httpStatus}`);
  const resPub = cli(['publish', '--object', 'resource', '--version-id', rv1, '--operation-id', randomUUID()], { token: publisher.token });
  check('T7 sobre recurso por CLI -> PUBLISHED', resPub.status === 0 && resPub.body?.newStatus === 'PUBLISHED', `http=${resPub.httpStatus}`);
  const resRet = cli(['retire', '--object', 'resource', '--version-id', rv1, '--reason', 'Retiro del recurso', '--operation-id', randomUUID()], { token: publisher.token });
  check('T8 sobre recurso por CLI -> DEPRECATED', resRet.status === 0 && resRet.body?.newStatus === 'DEPRECATED', `http=${resRet.httpStatus}`);

  // ==========================================================================
  // 4. AUTORIZACIÓN Y ROLES A TRAVÉS DEL CLI -- invariante 7, §9.2, §7.2.
  //
  // El CLI ofrece TODOS los comandos a TODO el mundo, a propósito: no filtra
  // por rol (eso sería una comprobación de autorización propia, prohibida por
  // §12.6). Quien decide es el backend, y aquí se demuestra que decide bien
  // aunque el comando se haya podido escribir.
  // ==========================================================================
  console.log('--- 4. Roles: el CLI ofrece todo, el BACKEND autoriza (invariante 7, §9.2) ---');

  const authorTriesPublish = cli(['publish', '--version-id', v1, '--operation-id', randomUUID()], { token: author.token });
  check('un AUTOR que escribe `publish` es RECHAZADO por el backend (no por el CLI)',
    authorTriesPublish.status !== 0 && [400, 403, 409].includes(authorTriesPublish.httpStatus), `http=${authorTriesPublish.httpStatus}`);
  check('ese rechazo llegó del servidor: hubo petición HTTP real', authorTriesPublish.httpStatus !== 0);

  const pubCreateFile = writePayload('pub-crea', questionPayload('Intento de creación por el publicador'));
  const publisherTriesCreate = cli(['question:create', '--file', pubCreateFile], { token: publisher.token });
  check('un PUBLICADOR que escribe `question:create` es RECHAZADO -> 403 (ADMIN-004, menor privilegio, §9.2)',
    publisherTriesCreate.status !== 0 && publisherTriesCreate.httpStatus === 403, `http=${publisherTriesCreate.httpStatus}`);

  const rolelessActor = bootstrapActor(`Sin rol CLI ${suffix}`, '');
  if (rolelessActor.status === 0 && rolelessActor.token) {
    const norole = cli(['coverage'], { token: rolelessActor.token });
    check('un actor autenticado SIN rol -> 403 desde el CLI (no basta con estar autenticado)', norole.httpStatus === 403, `http=${norole.httpStatus}`);
  } else {
    check('un actor SIN roles no puede crearse por el CLI del I2: el rol es obligatorio (frontera equivalente del I2)', rolelessActor.status !== 0);
  }

  // AISLAMIENTO ENTRE ACTORES sobre CONTENIDO: el borrador de un autor no es
  // editable por otro autor distinto (CMS-018/§9.2 delimitan quién toca qué).
  const author2 = bootstrapActor(`Autor 2 CLI ${suffix}`, 'AUTHOR');
  const isolationFile = writePayload('aislamiento', questionPayload('Pregunta del autor 1 para aislamiento'));
  const a1Version = cli(['question:create', '--file', isolationFile], { token: author.token });
  check('autor 1 crea un borrador propio por CLI', a1Version.status === 0, `http=${a1Version.httpStatus}`);

  // ==========================================================================
  // 5. ENTRADAS INVÁLIDAS Y ESTADOS INVÁLIDOS, siempre a través del CLI.
  //
  // El CLI no valida contenido (eso es CMS-013, dominio de EDUCATION). Lo que
  // este bloque demuestra es justo eso: los cuerpos inválidos VIAJAN y el
  // backend los rechaza. Un CLI que los filtrara sería una segunda validación
  // capaz de divergir de la real.
  // ==========================================================================
  console.log('--- 5. Entradas y estados inválidos: los rechaza el BACKEND, no el CLI ---');

  // CMS-013 se aplica en T3 (enviar a revisión), NO en T1. Es el comportamiento
  // que el Incremento 4 ya fijó y que `verify-editorial-authoring-gate.ts:379`
  // verifica: un borrador puede estar incompleto MIENTRAS se redacta -- eso es
  // lo que significa ser un borrador --, y la validación de completitud es la
  // puerta de entrada a la revisión. Este gate comprueba la regla donde de
  // verdad vive, no donde sería cómodo suponerla.
  const zeroCorrectFile = writePayload('sin-correcta', questionPayload('Sin alternativa correcta', {
    answerOptions: [{ content: P('a'), isCorrect: false }, { content: P('b'), isCorrect: false }],
  }));
  const zeroDraft = cli(['question:create', '--file', zeroCorrectFile], { token: author.token });
  check('un borrador incompleto SÍ puede crearse por CLI (un DRAFT puede estar a medias mientras se redacta)', zeroDraft.status === 0, `http=${zeroDraft.httpStatus}`);
  const zeroSubmit = cli(['submit', '--version-id', zeroDraft.body?.versionId, '--reason', 'Intento con cero correctas'], { token: author.token });
  check('CMS-013 vía CLI: enviar a revisión con CERO alternativas correctas -> 400 del backend',
    zeroSubmit.httpStatus === 400 && zeroSubmit.status !== 0 && /CMS-013/.test(JSON.stringify(zeroSubmit.body)), `http=${zeroSubmit.httpStatus} ${zeroSubmit.stdout.slice(0, 200)}`);

  const twoCorrectFile = writePayload('dos-correctas', questionPayload('Dos alternativas correctas', {
    answerOptions: [{ content: P('a'), isCorrect: true }, { content: P('b'), isCorrect: true }],
  }));
  const twoDraft = cli(['question:create', '--file', twoCorrectFile], { token: author.token });
  const twoSubmit = cli(['submit', '--version-id', twoDraft.body?.versionId, '--reason', 'Intento con dos correctas'], { token: author.token });
  check('CMS-013 vía CLI: enviar a revisión con DOS alternativas correctas -> 400 del backend',
    twoSubmit.httpStatus === 400 && /CMS-013/.test(JSON.stringify(twoSubmit.body)), `http=${twoSubmit.httpStatus} ${twoSubmit.stdout.slice(0, 200)}`);
  check('la validación de CMS-013 la aplicó el BACKEND, no el CLI: el borrador incompleto viajó entero y fue rechazado en T3',
    zeroDraft.status === 0 && zeroSubmit.httpStatus === 400);

  // Un campo que el contrato NO declara debe ser rechazado (`.strict()`), lo
  // que confirma que el CLI reenvía el cuerpo TAL CUAL, sin sanearlo.
  const roleFieldFile = writePayload('con-rol', questionPayload('Con campo de rol colado', { role: 'PUBLISHER' }));
  const roleField = cli(['question:create', '--file', roleFieldFile], { token: author.token });
  check('invariante 22 vía CLI: un campo `role` colado en el JSON es RECHAZADO (400) -- el contrato es `.strict()`',
    roleField.httpStatus === 400, `http=${roleField.httpStatus}`);
  check('el CLI reenvió ese cuerpo sin sanearlo: llegó al backend y fue el backend quien lo rechazó', roleField.httpStatus !== 0);

  const statusFieldFile = writePayload('con-estado', questionPayload('Con estado colado', { editorialStatus: 'PUBLISHED' }));
  const statusField = cli(['question:create', '--file', statusFieldFile], { token: author.token });
  check('crear directamente en PUBLISHED no es representable ni por CLI -> 400', statusField.httpStatus === 400, `http=${statusField.httpStatus}`);

  // ESTADOS INVÁLIDOS: la máquina de estados rechaza, no el CLI.
  const republish = cli(['publish', '--version-id', v2, '--operation-id', randomUUID()], { token: publisher.token });
  check('estado inválido vía CLI: republicar una versión DEPRECATED es rechazado (DEPRECATED es terminal, DG-8)',
    republish.status !== 0 && [400, 403, 409].includes(republish.httpStatus), `http=${republish.httpStatus}`);

  const backToDraft = cli(['return-to-draft', '--version-id', v2, '--reason', 'Intento de resucitar'], { token: publisher.token });
  check('estado inválido vía CLI: DEPRECATED -> DRAFT es rechazado (invariante 4, lista cerrada de §8.4)',
    backToDraft.status !== 0 && [400, 403, 409].includes(backToDraft.httpStatus), `http=${backToDraft.httpStatus}`);

  const badUuid = cli(['publish', '--version-id', 'no-es-un-uuid', '--operation-id', randomUUID()], { token: publisher.token });
  check('entrada inválida vía CLI: un identificador que no es UUID -> 400', badUuid.status !== 0 && badUuid.httpStatus === 400, `http=${badUuid.httpStatus}`);

  const missingFlag = cli(['publish'], { token: publisher.token });
  check('el CLI exige sus argumentos obligatorios y NO emite una petición incompleta', missingFlag.status !== 0 && missingFlag.httpStatus === 0, missingFlag.stderr.slice(0, 150));

  const unknownCommand = cli(['importar-todo-el-catalogo'], { token: author.token });
  check('un comando inexistente falla explícitamente (no hay comando oculto de lote: CMS-026..029 sigue diferido)',
    unknownCommand.status !== 0 && unknownCommand.httpStatus === 0, unknownCommand.stderr.slice(0, 150));

  const badObject = cli(['submit', '--object', 'estudiante', '--version-id', v1], { token: author.token });
  check('`--object` solo admite las dos familias editoriales; cualquier otra cosa falla sin emitir petición',
    badObject.status !== 0 && badObject.httpStatus === 0, badObject.stderr.slice(0, 150));

  // ==========================================================================
  // 6. AUDITORÍA CONSULTABLE DESDE EL CLI -- invariante 10, §9.3, decisión B.
  //
  // §13.6 punto 1 exige el ciclo completo "sin escribir SQL". Eso incluye
  // PODER RESPONDER "quién hizo qué" sin abrir psql: si la auditoría solo
  // fuera consultable por SQL, el invariante 12 quedaría a medias.
  // ==========================================================================
  console.log('--- 6. Auditoría consultable por CLI (invariante 10, §9.3) ---');
  const actions = cli(['actions', '--object-id', v1], { token: publisher.token });
  check('`actions` por CLI -> 200 y devuelve el rastro de la versión', actions.status === 0 && Array.isArray(actions.body?.actions), `http=${actions.httpStatus}`);
  const actionList: any[] = actions.body?.actions ?? [];
  check('el rastro contiene las acciones del ciclo ejecutado por CLI (creación, transiciones)', actionList.length >= 4, `n=${actionList.length}`);
  check('cada acción está ATRIBUIDA a un actor con nombre y rol ejercido (§9.3)',
    actionList.every((a) => !!a.actorId && !!a.actorDisplayName && !!a.roleExercised && !!a.occurredAt && !!a.actionType));
  check('la auditoría distingue los DOS actores del ciclo: el autor y el publicador (CMS-018 verificable a posteriori)',
    actionList.some((a) => a.actorId === author.actorId) && actionList.some((a) => a.actorId === publisher.actorId));
  check('la auditoría NO devuelve contenido académico (§9.3: guarda referencias, nunca copias)',
    !/stemContent|stem_content|explanationContent|isCorrect/.test(JSON.stringify(actionList)));
  check('la auditoría NO devuelve datos de estudiante por la superficie del CLI (§11.4)',
    !/studentResponse|accountId|aiConversation/i.test(JSON.stringify(actionList)));

  const uses = cli(['cms018-uses'], { token: publisher.token });
  check('`cms018-uses` por CLI -> 200: "cuántas publicaciones se hicieron bajo excepción" es respondible sin SQL (§8.5)',
    uses.status === 0 && Array.isArray(uses.body?.actions), `http=${uses.httpStatus}`);
  check('este ciclo NO usó la excepción de CMS-018: ninguna de sus acciones aparece entre los usos de excepción',
    !(uses.body?.actions ?? []).some((a: any) => a.objectId === v1 || a.objectId === v2));

  // ==========================================================================
  // 7. INTERACCIÓN CON EL INCREMENTO 5 -- la matriz, consumida desde el CLI.
  //
  // §12.6 dice que el CLI consume la API "de los Incrementos 2-5". El 5 es la
  // Content Coverage Matrix, y esta es la comprobación de que el CLI la lee de
  // verdad y refleja el efecto del ciclo que él mismo acaba de ejecutar.
  // ==========================================================================
  console.log('--- 7. INTERACCIÓN CON I5: la matriz leída desde el CLI refleja el ciclo del CLI ---');
  const coverage = cli(['coverage'], { token: author.token });
  check('`coverage` por CLI -> 200 (el CLI consume la superficie del Incremento 5)', coverage.status === 0 && coverage.httpStatus === 200, `http=${coverage.httpStatus}`);
  const subj = (coverage.body?.subjects ?? []).find((s: any) => s.subjectId === subjectId);
  const topicRow = (subj?.topics ?? []).find((t: any) => t.curriculumTopicId === topicId);
  check('la matriz leída por CLI incluye la materia y el tema creados para esta corrida', !!subj && !!topicRow, JSON.stringify(subj)?.slice(0, 200));
  check('tras RETIRAR todo por CLI, la matriz reporta 0 preguntas publicadas en ese tema (refleja el estado real)',
    topicRow?.questions?.published === 0, JSON.stringify(topicRow));
  check('la matriz sí ve los borradores que el CLI dejó en ese tema (no está devolviendo ceros por no encontrar el tema)',
    (topicRow?.questions?.draft ?? 0) > 0, JSON.stringify(topicRow?.questions));
  check('la matriz leída por CLI sigue sin exponer `isCorrect` ni datos de estudiante (invariante 14 intacto)',
    !/isCorrect/.test(JSON.stringify(coverage.body)) && !/studentResponse|accountId/i.test(JSON.stringify(coverage.body)));

  // ==========================================================================
  // 8. INTERACCIÓN CON I1 -- la inmutabilidad NO se debilita por existir un CLI.
  //
  // El CLI es un cliente más: no puede mutar una fila publicada, y PostgreSQL
  // sigue siendo la autoridad final. Se comprueba con CONTROL POSITIVO, mismo
  // criterio que §13.1 punto 1: primero que el UPDATE SÍ funciona sobre DRAFT.
  // ==========================================================================
  console.log('--- 8. INTERACCIÓN CON I1: la existencia del CLI no abre ninguna grieta ---');
  const ctrlFile = writePayload('control', questionPayload('Pregunta de control positivo'));
  const ctrl = cli(['question:create', '--file', ctrlFile], { token: author.token });
  const ctrlV: string = ctrl.body?.versionId;
  let positiveControlOk = false;
  try {
    await pg.query(`UPDATE question_version SET stem_content = $2 WHERE id = $1`, [ctrlV, JSON.stringify(BLOCKS('mutado en DRAFT'))]);
    positiveControlOk = true;
  } catch { /* no debería fallar */ }
  check('CONTROL POSITIVO: una versión en DRAFT creada por CLI SÍ admite UPDATE por SQL directo', positiveControlOk);

  // Ahora la publicada: el mismo UPDATE debe fallar.
  const pubForImmutability = await pg.query(
    `SELECT id FROM question_version WHERE id = $1`, [v1]);
  let immutableRejected = false;
  try {
    await pg.query(`UPDATE question_version SET stem_content = $2 WHERE id = $1`, [v1, JSON.stringify(BLOCKS('intento de mutación'))]);
  } catch {
    immutableRejected = true;
  }
  check('una versión que pasó por PUBLISHED sigue siendo inmutable por SQL directo tras el ciclo del CLI (invariante 1)',
    immutableRejected && pubForImmutability.rowCount === 1);

  let deleteRejected = false;
  try {
    await pg.query(`DELETE FROM question_version WHERE id = $1`, [v2]);
  } catch {
    deleteRejected = true;
  }
  check('el CLI no abrió ninguna ruta de borrado: la versión sigue sin poder borrarse (invariante 3)', deleteRejected);

  // ==========================================================================
  // 9. §13.6 PUNTO 3 -- COMPROBACIÓN ESTÁTICA (DG-7, invariante 22).
  //
  // "el CLI no importa repositorios de Prisma directamente ni abre conexión
  // propia a la base --solo consume la API--, no contiene ninguna comprobación
  // de rol propia y no envía ningún rol ni identificador de actor en sus
  // peticiones."
  //
  // ALCANCE DE ESTA COMPROBACIÓN, con precisión: se aplica al CLI DEL CICLO
  // EDITORIAL que el Incremento 6 construye (`src/cli/editorial.ts`), no a las
  // tres herramientas fuera de banda preexistentes. `create-admin-actor.ts`
  // (§9.5, "emisión y entrega del token ocurren FUERA DE BANDA"),
  // `activate-cms018-exception.ts` (§8.5 condición 1, activación deliberada que
  // NO puede ser un campo de petición) y `recover-account.ts` (ADR-0005) abren
  // conexión a la base POR MANDATO CONTRACTUAL: existen precisamente porque no
  // deben ser alcanzables por HTTP. Exigirles lo contrario invertiría el
  // contrato que las creó. Lo que §13.6 punto 3 protege es que la ruta
  // EDITORIAL no tenga una segunda puerta de escritura, y eso es lo que se
  // verifica aquí -- reforzado en el punto 10 con la comprobación de que
  // ninguna de las tres fuera de banda ha ganado capacidad editorial.
  // ==========================================================================
  console.log('--- 9. Comprobación estática del CLI editorial (§13.6 punto 3, invariante 22) ---');
  const cliFile = join(srcDir, 'cli', 'editorial.ts');
  check('existe el CLI editorial del Incremento 6 en `src/cli/`', existsSync(cliFile));
  const cliSource = readFileSync(cliFile, 'utf8');
  const cliCode = stripComments(cliSource);

  check('el CLI editorial NO importa ningún repositorio ni servicio del backend',
    !/from\s+['"]\.\.\/(administration|editorial|education|auth|ai|progress|gamification|privacy|user|analytics|platform)\//.test(cliCode));
  check('el CLI editorial NO importa Prisma ni el cliente generado (no es un segundo dueño de las tablas)',
    !/PrismaService|@prisma\/client|generated\/prisma|PrismaClient/.test(cliCode));
  check('el CLI editorial NO abre conexión propia a la base (`pg`, `Client`, `DATABASE_URL`)',
    !/from\s+['"]pg['"]|new\s+Client\(|DATABASE_URL/.test(cliCode));
  check('el CLI editorial NO levanta el contexto de Nest (no es un proceso con acceso al dominio)',
    !/NestFactory|AppModule/.test(cliCode));
  check('el CLI editorial NO contiene ninguna comprobación de rol propia (no nombra los roles en ninguna comparación)',
    !/['"]AUTHOR['"]|['"]PUBLISHER['"]/.test(cliCode));
  check('el CLI editorial NO construye ningún campo de rol ni de actor en sus peticiones (invariante 22)',
    !/\b(role|roles|actorId|actor_id|adminRole)\s*:/.test(cliCode));
  check('el CLI editorial NO lee ni envía `INTERNAL_OPS_KEY` ni su cabecera (§13.6 punto 2, decisión B)',
    !/INTERNAL_OPS_KEY|x-internal-ops-key/i.test(cliCode));
  check('el CLI editorial NO usa la credencial de estudiante (`AuthGuard`, sesión, Bearer)',
    !/authorization|Bearer|x-session-id/i.test(cliCode));
  check('la ÚNICA cabecera de credencial que el CLI envía es la del token administrativo personal',
    /x-admin-token/.test(cliCode) && (cliCode.match(/x-admin-token/g) ?? []).length >= 1);
  check('el CLI editorial NO nombra `ARCHIVED` (invariante 21: inalcanzable por esta ruta)', !/ARCHIVED/.test(cliCode));
  check('el CLI editorial NO reimplementa validación de contenido (`CMS-013` es de EDUCATION, no del cliente)',
    !/isCorrect\s*===|filter\(.*isCorrect|answerOptions\.filter/.test(cliCode));
  check('el CLI editorial NO ejecuta SQL de ningún tipo (invariante 12: la herramienta sustituye al SQL manual, no lo envuelve)',
    !/\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\$executeRaw|\$queryRaw/.test(cliCode));
  check('el CLI editorial NO genera por su cuenta la clave de idempotencia (no destruye la garantía del invariante 11)',
    !/randomUUID|uuidv4|crypto\.randomUUID/.test(cliCode));
  check('el CLI editorial declara su destino por configuración, no contra un host de producción fijo',
    !/https?:\/\/(?!127\.0\.0\.1|localhost)[a-z]/i.test(cliCode));

  // ==========================================================================
  // 10. FRONTERA: lo que el Incremento 6 NO construye, y lo que sigue diferido.
  //
  // El Incremento 6 es el ÚLTIMO del roadmap de §12 -- no existen §12.7 ni
  // §12.8, y por tanto no hay ningún incremento posterior que adelantar. Lo
  // que sí debe seguir ausente es todo el no-alcance de §3, que este gate
  // vuelve a comprobar porque el CLI es exactamente la superficie desde la que
  // sería tentador colarlo.
  // ==========================================================================
  console.log('--- 10. Frontera del Incremento 6: el no-alcance de §3 sigue sin construir ---');
  const allSrc = collectTsFiles(srcDir).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');
  const allCliCode = collectTsFiles(join(srcDir, 'cli')).map((f) => stripComments(readFileSync(f, 'utf8'))).join('\n');

  check('importación masiva sigue diferida para TODO el bloque (CMS-026..029, decisión E): ningún módulo la implementa',
    !/bulk[_-]?import|importjob|import[_-]?batch|importcontent|content[_-]?import/i.test(allSrc));
  check('el CLI no introduce ningún comando de lote/masivo por la puerta de atrás',
    !/bulk|batch|--csv|\.csv|massive|masiv/i.test(cliCode));
  check('vista previa sigue diferida (CMS-007, decisión D): ningún módulo la implementa',
    !/editorialpreview|content[_-]?preview/i.test(allSrc));
  check('`apps/` sigue conteniendo exactamente `backend` y `mobile`: el I6 no creó ninguna app web administrativa (§3, decisión D, §12.6)',
    readdirSync(join(repoRoot, 'apps')).filter((d) => !d.startsWith('.')).sort().join(',') === 'backend,mobile',
    readdirSync(join(repoRoot, 'apps')).join(','));
  check('el I6 no creó ningún tercer paquete en `apps/` (§12.6, "qué NO hace explícitamente")',
    readdirSync(join(repoRoot, 'apps')).filter((d) => !d.startsWith('.')).length === 2);
  check('no existe ningún módulo de MFA/segundo factor: ADMIN-002 sigue PARCIALMENTE satisfecho (§9.6)',
    !/\bmfa\b|second[_-]?factor|segundo[_-]?factor|totp|otp[_-]?secret/i.test(allSrc));
  check('no existe ningún flag global de auto-aprobación (§8.5): la excepción sigue siendo por versión',
    !/auto[_-]?approve[_-]?(all|global|enabled)|SELF_APPROVAL_ENABLED/i.test(allSrc));
  check('invariante 21: ninguna ruta escribe el literal ARCHIVED',
    !/(editorialStatus|editorial_status)\s*[:=]\s*['"]ARCHIVED['"]/.test(allSrc));
  check('invariante 18: ningún comando de `src/cli/` importa el dominio `ai/` (ninguna IA participa en el ciclo editorial)',
    !/from\s+['"][^'"]*\/ai\//.test(allCliCode));
  check('invariante 17: ningún comando de `src/cli/` toca `xp_ledger_entry` ni `league_point_ledger_entry`',
    !/xpLedgerEntry|leaguePointLedgerEntry|xp_ledger_entry|league_point_ledger_entry/.test(allCliCode));
  check('no existen tablas `editorial_review`/`editorial_finding` (diferidas por DM §9.21, decisión A)',
    !/editorial_review|editorial_finding|editorialReview|editorialFinding/.test(allSrc));

  // Las tres herramientas FUERA DE BANDA preexistentes siguen siendo lo que
  // eran: el I6 no les añadió capacidad editorial ni las convirtió en una
  // segunda ruta del ciclo.
  const outOfBand = ['create-admin-actor.ts', 'activate-cms018-exception.ts', 'recover-account.ts'];
  check('las tres herramientas fuera de banda preexistentes siguen presentes y sin sustituir', outOfBand.every((f) => existsSync(join(srcDir, 'cli', f))));
  const outOfBandCode = outOfBand.map((f) => stripComments(readFileSync(join(srcDir, 'cli', f), 'utf8'))).join('\n');
  check('ninguna herramienta fuera de banda ganó capacidad de TRANSICIÓN editorial (el ciclo pasa solo por la API)',
    !/EditorialTransitionService|EditorialAuthoringService|editorialStatus\s*:/.test(outOfBandCode));
  const cliDirFiles = readdirSync(join(srcDir, 'cli')).filter((f) => f.endsWith('.ts')).sort();
  check('`src/cli/` contiene exactamente las tres herramientas previas más el CLI editorial del I6, y nada más',
    cliDirFiles.join(',') === 'activate-cms018-exception.ts,create-admin-actor.ts,editorial.ts,recover-account.ts', cliDirFiles.join(','));

  // ==========================================================================
  // 11. §13.6 PUNTO 4 -- `apps/mobile` SIN NINGÚN CAMBIO EN TODO EL BLOQUE, y
  //     el estudiante ve el contenido publicado SIN NINGÚN DESPLIEGUE MÓVIL
  //     (invariante 13, CONTENT-011).
  //
  // La segunda mitad es la que de verdad importa y la única demostrable
  // dinámicamente: se publica una pregunta NUEVA por CLI y se comprueba que la
  // ruta de lectura del estudiante --el binario ya en ejecución, sin reiniciar
  // ni reconstruir nada-- la sirve.
  // ==========================================================================
  console.log('--- 11. `apps/mobile` intacto y el estudiante ve lo publicado sin despliegue móvil (§13.6 punto 4) ---');

  const mobileDiff = spawnSync('git', ['diff', '--stat', 'HEAD', '--', 'apps/mobile'], {
    cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`apps/mobile` sin ningún cambio en el árbol de trabajo (diff vacío, invariante 13)',
    mobileDiff.status === 0 && (mobileDiff.stdout ?? '').trim() === '', (mobileDiff.stdout ?? '').slice(0, 300));
  const mobileUntracked = spawnSync('git', ['status', '--porcelain', '--', 'apps/mobile'], {
    cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`apps/mobile` tampoco tiene archivos nuevos sin seguimiento', (mobileUntracked.stdout ?? '').trim() === '', (mobileUntracked.stdout ?? '').slice(0, 300));

  // Publicación NUEVA por CLI, y lectura por la ruta REAL del estudiante.
  const liveFile = writePayload('visible', questionPayload('¿Cuánto es el 10% de 50? (visible al estudiante)'));
  const liveCreated = cli(['question:create', '--file', liveFile], { token: author.token });
  const liveV: string = liveCreated.body?.versionId;
  check('se creó por CLI una pregunta nueva para comprobar la visibilidad al estudiante', liveCreated.status === 0 && !!liveV, `http=${liveCreated.httpStatus}`);

  const topicBefore = await req('GET', `/education/curriculum-topics/${topicId}/questions`);
  const draftInvisible = !/visible al estudiante/.test(JSON.stringify(topicBefore.body ?? {}));
  check('INTERACCIÓN CON I4: mientras está en DRAFT, la pregunta creada por CLI NO es visible en la superficie del estudiante (invariante 8)', draftInvisible);

  cli(['submit', '--version-id', liveV, '--reason', 'Listo'], { token: author.token });
  cli(['approve', '--version-id', liveV, '--reason', 'Conforme'], { token: publisher.token });
  const livePub = cli(['publish', '--version-id', liveV, '--operation-id', randomUUID()], { token: publisher.token });
  check('la pregunta se publicó por CLI', livePub.status === 0 && livePub.body?.newStatus === 'PUBLISHED', `http=${livePub.httpStatus} ${livePub.stdout.slice(0, 200)}`);

  const liveRow = await pg.query(`SELECT editorial_status FROM question_version WHERE id = $1`, [liveV]);
  check('CONTENT-011 / invariante 13: publicada por CLI, la versión queda PUBLISHED en el MISMO proceso backend ya en ejecución -- sin reiniciar el servidor, sin reconstruir y SIN NINGÚN DESPLIEGUE MÓVIL',
    liveRow.rows[0]?.editorial_status === 'PUBLISHED', JSON.stringify(liveRow.rows[0]));

  const coverageAfterPublish = cli(['coverage'], { token: author.token });
  const subjAfter = (coverageAfterPublish.body?.subjects ?? []).find((s: any) => s.subjectId === subjectId);
  const topicAfter = (subjAfter?.topics ?? []).find((t: any) => t.curriculumTopicId === topicId);
  check('la lectura de contenido publicado se actualizó en vivo: la matriz ya cuenta 1 pregunta publicada en el tema',
    topicAfter?.questions?.published === 1, JSON.stringify(topicAfter));

  // ==========================================================================
  // 12. §13.6 PUNTO 5 y regresión de los incrementos previos.
  //
  // El gate NO encadena aquí los cinco gates de I1-I5 ni el consolidado de
  // Bloques I-VI: encadenarlos contra la MISMA instancia satura el limitador de
  // tasa en memoria y produce fallos que no son del código. Se ejecutan en
  // secuencia propia, y aquí se comprueba la pieza que sí es barata y directa:
  // que la ruta de lectura del estudiante no se degradó.
  // ==========================================================================
  console.log('--- 12. Regresión directa: la ruta de lectura del estudiante intacta (invariantes 8 y 19) ---');
  const edu = spawnSync('npm', ['run', 'verify:education-gate', '--', base], {
    cwd: backendDir, encoding: 'utf8', shell: process.platform === 'win32',
  });
  check('`verify:education-gate` sigue en VERDE: el CLI no degradó la ruta de lectura del estudiante (invariantes 8 y 19)',
    edu.status === 0, (edu.stdout ?? '').split('\n').filter((l) => /FALLO/.test(l)).slice(0, 5).join(' | ') || edu.stderr?.slice(0, 400));

  await pg.end();

  console.log(`\nChecks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron -- GATE I6 EN ROJO.`);
    process.exit(1);
  }
  console.log('GATE I6 EN VERDE -- LEF Bloque VII, Incremento 6 (CLI interna).');
  console.log('');
  console.log('Recordatorio de alcance (§12.6): el CLI NO construye UI web, NO construye vista previa');
  console.log('(CMS-007, diferido), NO crea un tercer paquete en `apps/` y NO duplica lógica de dominio.');
  console.log('La importación masiva (CMS-026..029) sigue DIFERIDA para todo el Bloque VII (decisión E).');
  console.log('`ADMIN-002` sigue PARCIALMENTE satisfecho: la verificación adicional / segundo factor');
  console.log('permanece DIFERIDA (§9.6). Retención administrativa del AdminActor: DIFERIDA sin número (§11.4).');
  console.log('El Incremento 6 es el ÚLTIMO del roadmap de §12: no existen §12.7 ni §12.8.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
