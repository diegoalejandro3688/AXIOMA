#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque VI (Tutor IA, Learning Experience Foundation) --
 * ver docs/adr/LEF-BLOCK-VI-DEFINITION.md y
 * docs/adr/LEF-BLOCK-VI-CLOSURE-REPORT.md.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio EXACTO que
 * verify-lef-block-v-gate.mjs y verify-lef-block-iv-gate.mjs:
 *
 * 1. Reutiliza el gate consolidado del Bloque V (LEF) TAL CUAL (que a su vez
 *    encadena Bloque IV -> III -> II -> I -> M1) -- no se reimplementa nada de
 *    eso, se invoca como un solo paso. Esto YA cubre, transitivamente y SIN
 *    duplicar ejecución:
 *    - typecheck/lint recursivos (`pnpm -r run typecheck/lint`, incluye
 *      apps/mobile) y build de contracts/backend (vía la base M1);
 *    - la regresión completa LEF I-V exigida por el Decision Gate 8 de §18.
 * 2. Agrega los gates propios de los Incrementos 1-8 de Bloque VI. NINGUNA
 *    aserción se duplica aquí: este archivo solo invoca los gates existentes y
 *    agrega su resultado.
 *
 * PROTOCOLO DE COSTE CERO -- REGLA INNEGOCIABLE DE ESTE GATE
 * ---------------------------------------------------------
 * Este gate NUNCA gasta dinero real. Dos mecanismos independientes lo
 * garantizan (defensa en capas, decisión L):
 *
 *   (a) `ANTHROPIC_API_KEY` se ELIMINA del entorno de todos los procesos que
 *       este script lanza (backend y gates). No se "confía" en que no esté
 *       configurada: se borra explícitamente.
 *   (b) `AI_PROVIDER_IMPL=fake` se fuerza en cada backend levantado aquí, y
 *       ANTES de cada bloque de gates se verifica la IDENTIDAD REAL DEL
 *       PROCESO contra `GET /ai/_internal/effective-provider` -- que NO lee la
 *       variable de entorno, sino la implementación que resolvió realmente la
 *       inyección de dependencias (`impl === 'FakeAiProvider'`). Si la
 *       identidad no coincide, el gate ABORTA antes de ejecutar nada.
 *
 * EXCLUSIÓN EXPLÍCITA -- `verify-ai-anthropic-integration-gate` PARTE B
 * --------------------------------------------------------------------
 * De ese gate se ejecuta ÚNICAMENTE la PARTE A (pruebas deterministas del
 * adaptador con un cliente Anthropic falso inyectado: deadline total,
 * reintento acotado, clasificación de categorías de error -- sin red, sin
 * coste). La PARTE B (integración real mínima contra la API de Anthropic) se
 * EXCLUYE deliberadamente de este consolidado porque:
 *   - realiza llamadas REALES facturables al proveedor, y este gate está
 *     diseñado para ser ejecutable de forma rutinaria y repetida;
 *   - §18 y §22 de la definición del bloque establecen que las llamadas reales
 *     "se reservan a un gate de integración explícitamente identificado,
 *     ejecutado deliberadamente y por separado -- nunca como parte de la
 *     regresión rutinaria";
 *   - su criterio de cierre es "ejecutado al menos una vez, documentado"
 *     (§22), no "ejecutado en cada regresión". Esa ejecución ya ocurrió y está
 *     documentada en el reporte de cierre del Incremento 2.
 * El propio gate hace la PARTE B OPT-IN estricta (requiere `ANTHROPIC_API_KEY`
 * Y una base URL como argumento); aquí se le niegan ambas cosas, de modo que
 * la exclusión es estructural y no depende de una bandera.
 *
 * EXCLUSIÓN EXPLÍCITA -- evaluación pedagógica real (V3..V6_1)
 * ------------------------------------------------------------
 * Las evaluaciones pedagógicas reales de `experiments/tutor-pedagogy-*-eval/`
 * NO se re-ejecutan aquí y NO forman parte de este gate. Son evidencia ya
 * versionada y congelada (ver §30 de la definición del bloque): re-ejecutarlas
 * gastaría dinero real y produciría artefactos nuevos que competirían con la
 * evidencia congelada. El resultado vigente (V6_1, PASS) se referencia como
 * documento, no como paso ejecutable.
 *
 * Uso: node scripts/verify-lef-block-vi-gate.mjs
 * (equivalente a `pnpm run verify:lef-block-vi-gate` desde la raíz del repo)
 */

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../apps/backend', import.meta.url));
const MOBILE_DIR = fileURLToPath(new URL('../apps/mobile', import.meta.url));

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
  console.log('\n\n=== Resumen -- Gate consolidado Bloque VI (LEF, Tutor IA) ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(
    exitCode === 0
      ? '\nGate consolidado Bloque VI (LEF, Tutor IA): PASS\n'
      : '\nGate consolidado Bloque VI (LEF, Tutor IA): FAIL\n',
  );
  process.exit(exitCode);
}

function describeFailure(result) {
  if (result.error) return `no se pudo iniciar el proceso -- ${result.error.code ?? result.error.name}: ${result.error.message}`;
  if (result.signal) return `terminado por señal ${result.signal}`;
  return `código de salida ${result.status}`;
}

/**
 * Entorno base de TODOS los procesos que lanza este script.
 * `ANTHROPIC_API_KEY` se elimina explícitamente (capa (a) del protocolo de
 * coste cero) -- no se asume que no esté configurada en la sesión.
 */
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

  const deadline = Date.now() + 30_000;
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

/**
 * Capa (b) del protocolo de coste cero: identidad REAL del proceso.
 * `GET /ai/_internal/effective-provider` devuelve la implementación que
 * resolvió la DI (`impl`), no la variable de entorno -- por eso sirve como
 * prueba y no como declaración de intenciones.
 */
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

  // 1. Gate consolidado del Bloque V (LEF) completo -- encadena IV -> III -> II -> I -> M1,
  //    incluye typecheck/lint/build recursivos. Cubre el Decision Gate 8 de §18
  //    ("regresión consolidada LEF I-V en PASS").
  runOnce(
    'Regresión LEF I-V (gate consolidado Bloque V, encadena IV/III/II/I/M1 + typecheck/lint/build)',
    'node',
    ['scripts/verify-lef-block-v-gate.mjs'],
    { cwd: ROOT, env: baseEnv() },
  );

  const aiEnv = baseEnv({
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
    // Capa (b): proveedor fake forzado. Verificado además contra la identidad
    // real del proceso antes de cada gate (assertFakeProviderIdentity).
    AI_PROVIDER_IMPL: 'fake',
    AI_GENERATION_DISABLED: 'false',
  });

  // 2. Incremento 2 -- PARTE A del gate de integración de proveedor.
  //    Sin backend, sin red y sin ANTHROPIC_API_KEY (baseEnv la elimina): el
  //    propio gate imprime SKIP de la PARTE B y sale en 0. Tampoco se le pasa
  //    base URL, de modo que la exclusión de la PARTE B es doble y estructural.
  runOnce(
    'Incremento 2 -- Integración de proveedor, PARTE A determinista (cliente falso, sin red, sin coste; PARTE B EXCLUIDA)',
    'npx',
    ['tsx', 'scripts/verify-ai-anthropic-integration-gate.ts'],
    { cwd: BACKEND_DIR, env: aiEnv },
  );

  // 3. Gates propios de Bloque VI contra backend real + Postgres real +
  //    FakeAiProvider. Cada uno con su propia instancia de backend en un puerto
  //    nuevo -- mismo motivo que en todos los bloques anteriores: el rate
  //    limiting de /auth/session es por proceso.
  await runBackendGate('Incremento 1 -- Fundación conversacional', aiEnv, 3141, 'scripts/verify-ai-conversation-foundation-gate.ts');
  await runBackendGate('Incremento 3 -- Cuotas, idempotencia y control de coste', aiEnv, 3142, 'scripts/verify-ai-quota-gate.ts');
  await runBackendGate('Incremento 3 -- Carreras de admisión de cuota/turnos (conflictos serializables, commit 29088e7)', aiEnv, 3143, 'scripts/verify-ai-admission-race-gate.ts');
  await runBackendGate('Incremento 4 -- Contexto académico mínimo', aiEnv, 3144, 'scripts/verify-ai-academic-context-gate.ts');
  await runBackendGate('Incremento 5 -- Comportamiento pedagógico (garantías deterministas)', aiEnv, 3145, 'scripts/verify-ai-pedagogy-gate.ts');
  await runBackendGate('Incremento 6 -- Seguridad general y reportes de respuesta', aiEnv, 3146, 'scripts/verify-ai-safety-gate.ts');
  await runBackendGate('Garantía permanente de bloque -- aislamiento del answerKey/pauta oficial (§29.2)', aiEnv, 3147, 'scripts/verify-ai-answerkey-isolation-gate.ts');
  await runBackendGate('Incremento 7 -- Privacidad, retención y borrado', aiEnv, 3148, 'scripts/verify-ai-privacy-retention-gate.ts');
  await runBackendGate('Incremento 8 (§28.1) -- GET /ai/me/status', aiEnv, 3149, 'scripts/verify-ai-status-gate.ts');

  // 4. Gate propio del Incremento 8 (mobile, lógica pura + estático, sin backend).
  runOnce('Incremento 8 -- Superficie móvil del Tutor IA', 'pnpm', ['run', 'verify:ai-mobile-gate'], { cwd: MOBILE_DIR, env: baseEnv() });

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
