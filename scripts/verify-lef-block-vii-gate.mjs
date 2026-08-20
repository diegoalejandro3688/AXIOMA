#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque VII (Plataforma Editorial, Learning Experience
 * Foundation) -- ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §13.7.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio EXACTO que
 * verify-lef-block-vi-gate.mjs y verify-lef-block-v-gate.mjs. Este archivo NO
 * reimplementa ninguna de las 663 aserciones que ya viven en los seis gates de
 * los Incrementos 1-6 (103 + 87 + 117 + 137 + 100 + 119): las INVOCA como
 * subprocesos y agrega su resultado. Las únicas aserciones propias de este
 * archivo son las comprobaciones estáticas transversales de no-alcance del
 * punto 4 de §13.7, que por definición ningún gate de incremento puede hacer
 * (miran el repositorio completo, no un incremento).
 *
 * ORDEN, literal de §13.7 ("Encadena, en este orden")
 * ---------------------------------------------------
 *   1. `verify:education-published-immutability-gate` (Incremento 1) como
 *      PRIMER ESLABÓN -- materializa la secuenciación obligatoria de §10: si la
 *      migración del Incremento 1 está ausente o revertida en cualquiera de sus
 *      dos mitades (triggers de inmutabilidad O índices únicos parciales de
 *      unicidad), falla TODO el bloque, no solo el Incremento 1. Este gate no
 *      necesita backend: habla con PostgreSQL directamente.
 *   2. Los gates de los Incrementos 2-6, en orden de dependencia
 *      (identidad -> transiciones -> autoría -> matriz -> CLI).
 *   3. La regresión completa de Bloques I-VI, en PASS limpio de extremo a
 *      extremo (ver la nota sobre el alias, abajo).
 *   4. Comprobaciones estáticas transversales de no-alcance (§13.7 punto 4),
 *      mismo método de inspección que `LEF-BLOCK-V-CLOSURE-REPORT.md:19`.
 *
 * PASO 0 -- PREPARACIÓN, NO ES UNA ASERCIÓN
 * -----------------------------------------
 * Los gates de los Incrementos 2-6 levantan `apps/backend/dist/main.js`. El
 * orden literal de §13.7 pone la regresión heredada (que es quien construye) en
 * el paso 3, DESPUÉS de ellos. Para que los pasos 1-2 no puedan validar un
 * `dist/` obsoleto, se construye contracts+backend una vez antes de empezar.
 * Es una preparación del entorno, no una comprobación: no duplica ninguna
 * aserción (el `typecheck`/`lint`/`build` con valor de aserción sigue viviendo,
 * sin cambios, dentro de la regresión heredada del paso 3).
 *
 * POR QUÉ EL PASO 3 INVOCA `verify-lef-block-vi-gate.mjs` Y NO EL ALIAS
 * --------------------------------------------------------------------
 * §13.7 punto 3 nombra `verify:learning-experience-foundation-gate`, "que a su
 * vez encadena `verify:lef-block-vi-gate` y anteriores". HOY el alias es
 * exactamente eso: un reenvío de una línea a `verify-lef-block-vi-gate.mjs`.
 * Pero §13.7 también dice que "al cerrarse el bloque" ese alias se actualizará
 * para apuntar a Bloque VII -- y en ese momento invocar el alias desde aquí
 * sería una RECURSIÓN INFINITA. Se invoca por tanto el gate de Bloque VI
 * directamente: es la MISMA ejecución que el alias produce hoy, es lo que la
 * propia §13.7 describe como su contenido ("encadena verify:lef-block-vi-gate
 * y anteriores"), y es el patrón literal del precedente
 * (`verify-lef-block-vi-gate.mjs` invoca `verify-lef-block-v-gate.mjs`
 * directamente, no el alias). Este archivo NO toca el alias: su actualización
 * pertenece al cierre formal (§13.8), no a §13.7.
 *
 * ESA CADENA YA CUBRE, TRANSITIVAMENTE Y SIN DUPLICAR EJECUCIÓN
 * ------------------------------------------------------------
 *   - `pnpm -r run typecheck` y `pnpm -r run lint` (incluye apps/mobile),
 *     build de contracts y backend, `prisma generate`, `prisma migrate deploy`
 *     y la doble pasada de `prisma/seed.ts` que prueba su idempotencia
 *     (§13.8 puntos 20 y 21) -- todo ello en la base M1 de la cadena;
 *   - EDUCATION, PROGRESS, Pregunta rápida, GAMIFICATION, AUTH/USER/PRIVACY;
 *   - Bloque VI (Tutor IA) completo, incluido
 *     `verify:ai-answerkey-isolation-gate` con su control positivo.
 *
 * PROTOCOLO DE COSTE CERO -- REGLA INNEGOCIABLE, HEREDADA DE BLOQUE VI
 * -------------------------------------------------------------------
 * Este gate NUNCA gasta dinero real. Tres mecanismos independientes:
 *   (a) `ANTHROPIC_API_KEY` se ELIMINA del entorno de todos los procesos que
 *       este script lanza. No se "confía" en que no esté: se borra.
 *   (b) `AI_PROVIDER_IMPL=fake` se fuerza en cada backend levantado aquí, y
 *       ANTES de cada gate se verifica la IDENTIDAD REAL DEL PROCESO contra
 *       `GET /ai/_internal/effective-provider`, que devuelve la implementación
 *       que resolvió la inyección de dependencias (`impl`), no la variable de
 *       entorno. Si no coincide, el gate ABORTA sin ejecutar nada.
 *   (c) el gate de Bloque VI encadenado en el paso 3 aplica el mismo protocolo
 *       a sus propios procesos, y excluye estructuralmente la PARTE B de
 *       `verify-ai-anthropic-integration-gate` (la única con llamadas reales).
 *
 * FAIL-FAST -- mismo criterio que Bloques V y VI: a la primera garantía rota se
 * imprime el resumen y se sale con código 1. No se sigue ejecutando a ciegas
 * tras un fallo estructural.
 *
 * Uso: node scripts/verify-lef-block-vii-gate.mjs
 * (equivalente a `pnpm run verify:lef-block-vii-gate` desde la raíz del repo)
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../apps/backend', import.meta.url));
const SRC_DIR = join(BACKEND_DIR, 'src');

const useShell = process.platform === 'win32';
const REQUIRED_ENV = ['DATABASE_URL', 'INTERNAL_OPS_KEY'];
const results = [];

function logStep(name) {
  console.log(`\n=== ${name} ===`);
}

function record(name, status, note = '') {
  results.push({ name, status, note });
}

function printSummaryAndExit(exitCode) {
  console.log('\n\n=== Resumen -- Gate consolidado Bloque VII (LEF, Plataforma Editorial) ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(
    exitCode === 0
      ? '\nGate consolidado Bloque VII (LEF, Plataforma Editorial): PASS\n'
      : '\nGate consolidado Bloque VII (LEF, Plataforma Editorial): FAIL\n',
  );
  process.exit(exitCode);
}

function describeFailure(result) {
  if (result.error) return `no se pudo iniciar el proceso -- ${result.error.code ?? result.error.name}: ${result.error.message}`;
  if (result.signal) return `terminado por señal ${result.signal}`;
  return `código de salida ${result.status}`;
}

/** Capa (a) del protocolo de coste cero. */
function baseEnv(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

function runOnce(name, command, args, opts = {}) {
  logStep(name);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: useShell, ...opts });
  if (result.error || result.status !== 0) {
    record(name, 'FAIL', describeFailure(result));
    printSummaryAndExit(1);
  }
  record(name, 'PASS');
}

async function startBackend(env, port) {
  const child = spawn('node', ['dist/main.js'], {
    cwd: BACKEND_DIR,
    env: { ...env, PORT: String(port) },
    stdio: 'pipe',
  });
  let output = '';
  let spawnError = null;
  child.stdout?.on('data', (d) => (output += d.toString()));
  child.stderr?.on('data', (d) => (output += d.toString()));
  child.on('error', (err) => (spawnError = err));

  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    if (spawnError) throw new Error(`No se pudo iniciar el backend en :${port} -- ${spawnError.code ?? spawnError.name}: ${spawnError.message}`);
    try {
      const res = await fetch(`http://localhost:${port}/health/live`);
      if (res.ok) return { child, output: () => output };
    } catch {
      // todavía no está arriba
    }
    await sleep(1000);
  }
  child.kill();
  throw new Error(`El backend no respondió en :${port} a tiempo.\n${output}`);
}

/** Capa (b): identidad REAL del proceso, no la variable de entorno. */
async function assertFakeProviderIdentity(port, opsKey) {
  const res = await fetch(`http://localhost:${port}/ai/_internal/effective-provider`, {
    headers: { 'x-internal-ops-key': opsKey },
  });
  if (!res.ok) throw new Error(`no se pudo leer /ai/_internal/effective-provider en :${port} (HTTP ${res.status})`);
  const body = await res.json();
  if (body.provider !== 'fake' || body.impl !== 'FakeAiProvider') {
    throw new Error(
      `IDENTIDAD DE PROCESO INCORRECTA en :${port} -- provider="${body.provider}" impl="${body.impl}" configured="${body.configured}". ` +
        'Este gate NUNCA debe correr contra un proveedor real. Abortado antes de ejecutar ninguna aserción.',
    );
  }
  console.log(`  identidad de proceso verificada en :${port} -- provider=${body.provider} impl=${body.impl} promptVersion=${body.promptVersion}`);
}

function spawnAsync(command, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(command, args, opts);
    let error = null;
    child.on('error', (err) => (error = err));
    child.on('close', (status, signal) => resolve({ status, signal, error }));
  });
}

async function runBackendGate(name, env, port, gateScript, extraArgs = []) {
  logStep(name);
  let handle;
  try {
    handle = await startBackend(env, port);
    await assertFakeProviderIdentity(port, env.INTERNAL_OPS_KEY);
  } catch (err) {
    if (handle) handle.child.kill();
    record(name, 'FAIL', err.message.split('\n')[0]);
    printSummaryAndExit(1);
  }
  const result = await spawnAsync('npx', ['tsx', gateScript, `http://localhost:${port}`, ...extraArgs], {
    cwd: BACKEND_DIR,
    env,
    stdio: 'inherit',
    shell: useShell,
  });
  handle.child.kill();
  if (result.error || result.status !== 0) {
    const tail = handle.output().split('\n').filter((l) => l.trim().length > 0).slice(-40).join('\n');
    record(name, 'FAIL', `gate: ${describeFailure(result)}\núltimas líneas del backend:\n${tail}`);
    printSummaryAndExit(1);
  }
  record(name, 'PASS');
}

// ===========================================================================
// PASO 4 -- comprobaciones estáticas transversales de no-alcance (§13.7 p. 4).
// Únicas aserciones PROPIAS de este archivo. Miran el repositorio entero, cosa
// que ningún gate de incremento hace ni puede hacer.
// ===========================================================================

let staticChecks = 0;
let staticFailures = 0;

function check(label, condition, detail) {
  staticChecks++;
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    staticFailures++;
  }
}

/** Igual que en los gates de I2..I6: mide el CÓDIGO, no los docstrings. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function collectTsFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function readAll(files) {
  return files.map((f) => `/* FILE ${f} */\n` + stripComments(readFileSync(f, 'utf8'))).join('\n');
}

/** Los ficheros que constituyen la superficie EDITORIAL del bloque. */
function editorialSurfaceFiles() {
  return [
    ...collectTsFiles(join(SRC_DIR, 'editorial')),
    ...collectTsFiles(join(SRC_DIR, 'administration')),
    ...collectTsFiles(join(SRC_DIR, 'education')).filter((f) => /editorial|content-coverage/.test(f)),
    ...collectTsFiles(join(SRC_DIR, 'cli')).filter((f) => /editorial|admin/.test(f)),
  ];
}

function runStaticNoScopeChecks() {
  logStep('Paso 4 -- comprobaciones estáticas transversales de no-alcance (§13.7 punto 4)');

  const backendSrc = readAll(collectTsFiles(SRC_DIR));
  const editorialFiles = editorialSurfaceFiles();
  const editorialSrc = readAll(editorialFiles);
  const schema = readFileSync(join(BACKEND_DIR, 'prisma', 'schema.prisma'), 'utf8');
  const migrationsDir = join(BACKEND_DIR, 'prisma', 'migrations');
  const migrationsSql = readdirSync(migrationsDir)
    .filter((d) => statSync(join(migrationsDir, d)).isDirectory())
    .map((d) => {
      const f = join(migrationsDir, d, 'migration.sql');
      return existsSync(f) ? readFileSync(f, 'utf8') : '';
    })
    .join('\n');

  console.log(`  (superficie editorial inspeccionada: ${editorialFiles.length} archivos)`);

  // --- 1. `apps/` sigue conteniendo exactamente `backend` y `mobile` (§3, decisión D).
  const appsDirs = readdirSync(join(ROOT, 'apps'), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  check(
    '`apps/` contiene exactamente `backend` y `mobile` -- ninguna app administrativa nueva (§3, decisión D / DG-2 opción A)',
    appsDirs.length === 2 && appsDirs[0] === 'backend' && appsDirs[1] === 'mobile',
    `apps/ = [${appsDirs.join(', ')}]`,
  );

  // --- 2. No existe módulo de importación masiva (CMS-026..029 diferido).
  const bulkFileNames = collectTsFiles(SRC_DIR).filter((f) => /bulk[-_.]?import|import[-_.]?(job|batch)/i.test(f));
  check(
    'no existe ningún archivo de importación masiva en `apps/backend/src` (CMS-026..029 diferido, §3)',
    bulkFileNames.length === 0,
    bulkFileNames.join(', '),
  );
  const bulkIdentifierHit = /bulk[-_]?import|import[-_]?job|import[-_]?batch/i.exec(backendSrc);
  check(
    'ningún identificador de importación masiva en el código del backend (`bulkImport`, `importJob`, `importBatch`, en cualquier grafía)',
    !bulkIdentifierHit,
    bulkIdentifierHit ? bulkIdentifierHit[0] : undefined,
  );
  check(
    'ninguna tabla de importación masiva en el esquema ni en las migraciones (`bulk_import`, `import_job`, `import_batch`)',
    !/bulk_import|import_job|import_batch/i.test(schema) && !/bulk_import|import_job|import_batch/i.test(migrationsSql),
  );

  // --- 3. No existe superficie de vista previa editorial (CMS-007 diferido, §3).
  check(
    'la superficie editorial no expone ninguna vista previa (`CMS-007` diferido por decisión D, §3)',
    !/preview/i.test(editorialSrc),
    'ocurrencia de /preview/i en código editorial (sin comentarios)',
  );
  const previewEditorialFiles = editorialFiles.filter((f) => /preview/i.test(f));
  check('ningún archivo de vista previa dentro de la superficie editorial', previewEditorialFiles.length === 0, previewEditorialFiles.join(', '));

  // --- 4. El enum `EditorialStatus` no ganó `SCHEDULED` ni perdió `ARCHIVED`.
  const enumBlock = /enum\s+EditorialStatus\s*\{([\s\S]*?)\}/.exec(schema)?.[1] ?? '';
  const enumValues = enumBlock
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[A-Z_]+$/.test(l));
  check(
    'el enum `EditorialStatus` conserva exactamente sus seis valores históricos -- no ganó `SCHEDULED` ni perdió `ARCHIVED` (DG-8, §3)',
    enumValues.length === 6 &&
      ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED', 'ARCHIVED'].every((v) => enumValues.includes(v)),
    `valores = [${enumValues.join(', ')}]`,
  );
  check('el enum `EditorialStatus` NO contiene `SCHEDULED` (publicación programada fuera por decisión A, §3)', !enumValues.includes('SCHEDULED'));

  // --- 5. Ninguna ruta editorial ESCRIBE el literal `ARCHIVED` (invariante 21, DG-8).
  //     `ARCHIVED` sí puede LEERSE/nombrarse para rechazarlo: eso es la garantía,
  //     no su violación. Lo prohibido es asignarlo.
  const archivedWritePatterns = [
    /editorialStatus\s*:\s*['"`]ARCHIVED['"`]/,
    /editorial_status\s*=\s*['"`]ARCHIVED['"`]/i,
    /status\s*:\s*EditorialStatus\.ARCHIVED/,
    /=\s*['"`]ARCHIVED['"`]\s*;/,
  ];
  const archivedWriteHit = archivedWritePatterns.find((p) => p.test(editorialSrc));
  check(
    'ninguna ruta editorial ESCRIBE el literal `ARCHIVED` -- solo lo nombra para rechazarlo (invariante 21, DG-8)',
    !archivedWriteHit,
    archivedWriteHit ? `patrón encontrado: ${archivedWriteHit}` : undefined,
  );
  check(
    'ninguna migración del bloque introduce una escritura de `ARCHIVED`',
    !/=\s*'ARCHIVED'/i.test(migrationsSql) || !/UPDATE[\s\S]{0,200}?=\s*'ARCHIVED'/i.test(migrationsSql),
  );

  // --- 6. No existen tablas `editorial_review` / `editorial_finding` (DM §9.21-9.23 diferidas).
  check(
    'no existen las tablas `editorial_review` ni `editorial_finding` (diferidas por DM §9.21, decisión A)',
    !/editorial_review|editorial_finding|model\s+EditorialReview|model\s+EditorialFinding/i.test(schema) &&
      !/editorial_review|editorial_finding/i.test(migrationsSql),
  );

  // --- 7. Ningún módulo editorial importa el dominio `ai/` (CONTENT-014, MC §6.29).
  const aiImportHit = /from\s+['"][^'"]*\bai\/[^'"]*['"]/.exec(editorialSrc);
  check(
    'ningún módulo editorial importa el dominio `ai/` -- la IA no crea ni publica contenido (CONTENT-014, MC §6.29, §3)',
    !aiImportHit,
    aiImportHit ? aiImportHit[0] : undefined,
  );

  // --- 8. Ninguna escritura editorial sobre los libros mayores de gamificación.
  const ledgerHit = /(xpLedgerEntry|xp_ledger_entry|leaguePointLedgerEntry|league_point_ledger_entry)/.exec(editorialSrc);
  check(
    'ningún módulo editorial toca `xp_ledger_entry` ni `league_point_ledger_entry` (ADR-0016:62, bloque cerrado -- §3)',
    !ledgerHit,
    ledgerHit ? ledgerHit[0] : undefined,
  );

  // --- 9. No existe ningún módulo de MFA / segundo factor (§9.6: DIFERIDO, no construido).
  const mfaFiles = collectTsFiles(SRC_DIR).filter((f) => /\bmfa\b|multi[-_.]?factor|second[-_.]?factor|totp|authenticator/i.test(f));
  check(
    'no existe ningún archivo de MFA / segundo factor en el backend (`ADMIN-002` PARCIALMENTE satisfecho: la parte diferida NO se construyó, §9.6)',
    mfaFiles.length === 0,
    mfaFiles.join(', '),
  );
  const mfaCodeHit = /\b(mfa|MFA|totp|TOTP|secondFactor|SecondFactor|multiFactor|MultiFactor)\b/.exec(backendSrc);
  check(
    'ningún identificador de MFA / segundo factor en el código del backend -- ni construido ni simulado (§3, §9.6)',
    !mfaCodeHit,
    mfaCodeHit ? mfaCodeHit[0] : undefined,
  );

  // --- 10. No existe ningún flag GLOBAL de auto-aprobación (§8.5, DG-10, invariante 24).
  //     La excepción de CMS-018 es por ACTIVACIÓN DELIBERADA y CON MOTIVO POR USO,
  //     registrada en `admin_cms018_exception_activation`; un flag global la
  //     convertiría en el comportamiento por defecto, que es exactamente lo
  //     que DG-10 prohibió.
  const autoApproveEnvHit = /process\.env\.[A-Z0-9_]*(AUTO_APPROVE|SELF_APPROVE|AUTOAPPROVE)[A-Z0-9_]*/.exec(backendSrc);
  check(
    'ninguna variable de entorno de auto-aprobación en el backend (§8.5: la excepción de CMS-018 no es un interruptor global)',
    !autoApproveEnvHit,
    autoApproveEnvHit ? autoApproveEnvHit[0] : undefined,
  );
  const autoApproveFlagHit = /\b(autoApprove|selfApproveEnabled|allowSelfApproval|AUTO_APPROVAL_ENABLED)\b/.exec(backendSrc);
  check(
    'ningún flag global de auto-aprobación en el código del backend (invariante 24, DG-10)',
    !autoApproveFlagHit,
    autoApproveFlagHit ? autoApproveFlagHit[0] : undefined,
  );
  check(
    'la excepción de CMS-018 sigue existiendo como REGISTRO POR USO, no como configuración (tabla `admin_cms018_exception_activation` presente)',
    /admin_cms018_exception_activation/i.test(schema),
  );

  console.log(`\n  Comprobaciones estáticas transversales ejecutadas: ${staticChecks}`);
  if (staticFailures > 0) {
    record('Paso 4 -- estáticas transversales de no-alcance (§13.7 punto 4)', 'FAIL', `${staticFailures} de ${staticChecks} fallaron`);
    printSummaryAndExit(1);
  }
  record('Paso 4 -- estáticas transversales de no-alcance (§13.7 punto 4)', 'PASS', `${staticChecks} comprobaciones`);
}

async function main() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}.\n` +
        'Este script no levanta Postgres/MinIO -- deben estar corriendo y accesibles antes de ejecutarlo.',
    );
    process.exit(1);
  }

  if (process.env.ANTHROPIC_API_KEY) {
    console.log(
      '\nAVISO: ANTHROPIC_API_KEY está presente en la sesión que invoca este gate.\n' +
        '       Se ELIMINARÁ del entorno de todos los procesos hijos (backend y gates).\n' +
        '       Ninguna llamada real al proveedor puede ocurrir dentro de este gate.\n',
    );
  }

  const editorialEnv = baseEnv({
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
    // Capa (b) del protocolo de coste cero, verificada además contra la
    // identidad real del proceso antes de cada gate.
    AI_PROVIDER_IMPL: 'fake',
    AI_GENERATION_DISABLED: 'false',
  });

  // ---- Paso 0: preparación (NO es una aserción; ver cabecera). -------------
  runOnce('Paso 0 (preparación, no aserción) -- build de contracts', 'pnpm', ['--filter', '@axioma/contracts', 'run', 'build'], {
    cwd: ROOT,
    env: baseEnv(),
  });
  runOnce('Paso 0 (preparación, no aserción) -- build de backend', 'pnpm', ['--filter', '@axioma/backend', 'run', 'build'], {
    cwd: BACKEND_DIR,
    env: baseEnv(),
  });

  // ---- Paso 1: PRIMER ESLABÓN, §13.7 punto 1. -----------------------------
  // Sin backend: habla con PostgreSQL directamente. Si la migración del
  // Incremento 1 está ausente o revertida en cualquiera de sus dos mitades,
  // TODO el bloque falla aquí y no se ejecuta nada más (§10, DG-11).
  runOnce(
    'Paso 1 -- Incremento 1: inmutabilidad de la versión publicada + unicidad por identidad (PRIMER ESLABÓN, §10/DG-11)',
    'npx',
    ['tsx', 'scripts/verify-education-published-immutability-gate.ts'],
    { cwd: BACKEND_DIR, env: editorialEnv },
  );

  // ---- Paso 2: Incrementos 2-6, en orden de dependencia. -------------------
  // Cada uno con su propia instancia de backend en un puerto nuevo -- mismo
  // motivo que en todos los bloques anteriores: el rate limiting de
  // /auth/session es POR PROCESO, y encadenar gates contra una única instancia
  // produce falsos rojos por saturación del limitador in-memory.
  await runBackendGate('Paso 2 -- Incremento 2: identidad administrativa (AdminActor, token personal, DG-7/DG-9)', editorialEnv, 3181, 'scripts/verify-admin-identity-gate.ts');
  await runBackendGate('Paso 2 -- Incremento 3: transiciones editoriales con auditoría (T4-T8, CMS-018 y su excepción, DG-8/DG-10)', editorialEnv, 3182, 'scripts/verify-editorial-transitions-gate.ts');
  await runBackendGate('Paso 2 -- Incremento 4: autoría editorial (T1/T2/T3, CMS-013, corrección por versión nueva)', editorialEnv, 3183, 'scripts/verify-editorial-authoring-gate.ts');
  await runBackendGate('Paso 2 -- Incremento 5: Content Coverage Matrix (solo lectura, invariante 14)', editorialEnv, 3184, 'scripts/verify-content-coverage-matrix-gate.ts');
  await runBackendGate('Paso 2 -- Incremento 6: CLI editorial interna (cliente HTTP puro, el servidor es la única autoridad)', editorialEnv, 3185, 'scripts/verify-editorial-cli-gate.ts');

  // ---- Paso 3: regresión completa de Bloques I-VI. ------------------------
  // Ver la nota de cabecera sobre por qué se invoca el gate de Bloque VI
  // directamente y no el alias `verify:learning-experience-foundation-gate`.
  runOnce(
    'Paso 3 -- Regresión LEF I-VI (gate consolidado Bloque VI; encadena V/IV/III/II/I/M1 + typecheck/lint/build + prisma migrate/seed)',
    'node',
    ['scripts/verify-lef-block-vi-gate.mjs'],
    { cwd: ROOT, env: baseEnv() },
  );

  // ---- Paso 4: estáticas transversales de no-alcance. ---------------------
  runStaticNoScopeChecks();

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
