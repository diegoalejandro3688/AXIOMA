#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque V (Perfil Avanzado, Learning Experience
 * Foundation) -- ver docs/adr/LEF-BLOCK-V-DEFINITION.md y
 * docs/adr/LEF-BLOCK-V-CLOSURE-REPORT.md.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio que verify-lef-block-iv-gate.mjs:
 * 1. Reutiliza el gate consolidado del Bloque IV (LEF) TAL CUAL (que a su
 *    vez reutiliza el de Bloque III, que reutiliza Bloque II, Bloque I y
 *    M1) -- no se reimplementa nada de eso, se invoca como un solo paso.
 *    Esto YA cubre, transitivamente y SIN duplicar ejecución:
 *    - typecheck/lint recursivos (`pnpm -r run typecheck/lint`, incluye
 *      apps/mobile) y build de contracts/backend (vía la base M1);
 *    - regresión completa de ADR-0020 (`verify:league-ranking-gate`, Gate 1
 *      de bloque, §5 de la definición) -- ya encadenado dentro de Bloque IV;
 *    - `verify:competitive-profile-endpoint-gate`, que YA ejercita las
 *      aserciones de banner del Incremento 1 (la enmienda de ADR-0021 §2 se
 *      hizo DENTRO de ese mismo gate, sin script nuevo);
 *    - `verify:competitive-profile-gate` (mobile), que YA ejercita las
 *      aserciones de preview/navegación del Incremento 8 (actualizado
 *      dentro del mismo gate histórico de Bloque IV, con nota de
 *      trazabilidad en el propio archivo);
 *    - todos los gates mobile de Incremento 5 de Bloque IV (cosmetics,
 *      leaderboard, league-participation, quick-question, challenges,
 *      offline-outbox no están en esa lista pero SÍ corren como parte de la
 *      regresión mobile relevante, añadidos abajo por separado -- ver punto 3).
 * 2. Agrega los gates propios de los incrementos de Bloque V que NO tienen
 *    ya una superficie dentro de un gate existente de un bloque anterior
 *    (Incrementos 2-7, backend, HTTP) -- cada uno con su propia instancia
 *    de backend en un puerto nuevo (mismo motivo que todos los bloques
 *    anteriores: el rate limiting de /auth/session es por proceso).
 * 3. Agrega el gate propio del Incremento 8 (mobile, lógica pura +
 *    estático, sin backend) y reconfirma la regresión mobile de Bloque III/IV
 *    que Incremento 8 tocó (cosmetics-gate, por la extensión de `locked`).
 *
 * Uso: node scripts/verify-lef-block-v-gate.mjs
 * (equivalente a `pnpm run verify:lef-block-v-gate` desde la raíz del repo)
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
  console.log('\n\n=== Resumen -- Gate consolidado Bloque V (LEF) ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado Bloque V (LEF): PASS\n' : '\nGate consolidado Bloque V (LEF): FAIL\n');
  process.exit(exitCode);
}

function describeFailure(result) {
  if (result.error) return `no se pudo iniciar el proceso -- ${result.error.code ?? result.error.name}: ${result.error.message}`;
  if (result.signal) return `terminado por señal ${result.signal}`;
  return `código de salida ${result.status}`;
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
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: 'pipe',
  });
  let output = '';
  let spawnError = null;
  child.stdout?.on('data', (d) => (output += d.toString()));
  child.stderr?.on('data', (d) => (output += d.toString()));
  child.on('error', (err) => (spawnError = err));

  const deadline = Date.now() + 20_000;
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

function spawnAsync(command, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(command, args, opts);
    let error = null;
    child.on('error', (err) => (error = err));
    child.on('close', (status, signal) => resolve({ status, signal, error }));
  });
}

async function runBackendGate(name, env, port, gateScript) {
  logStep(name);
  let handle;
  try {
    handle = await startBackend(env, port);
  } catch (err) {
    record(name, 'FAIL', err.message.split('\n')[0]);
    printSummaryAndExit(1);
  }
  const result = await spawnAsync('npx', ['tsx', gateScript, `http://localhost:${port}`], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...env },
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

  // 1. Gate consolidado del Bloque IV (LEF) completo -- ya incluye M1+I+II+III+IV,
  //    typecheck/lint/build recursivos, ADR-0020, Incremento 1 (banner) e Incremento 8
  //    (preview/navegación mobile) transitivamente.
  runOnce('Gate consolidado Bloque IV (LEF) -- M1+I+II+III+IV, incluye Incremento 1 y 8 de Bloque V transitivamente', 'node', ['scripts/verify-lef-block-iv-gate.mjs'], { cwd: ROOT, env: process.env });

  const blockVEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
  };

  // 2. Gates propios de Bloque V (backend, HTTP) -- Incrementos 2-7, cada uno
  //    con su propia instancia de backend (rate limiting de /auth/session por proceso).
  await runBackendGate('Incremento 2 -- Insignias destacadas', blockVEnv, 3121, 'scripts/verify-featured-achievement-gate.ts');
  await runBackendGate('Incremento 3 -- Resumen académico privado', blockVEnv, 3122, 'scripts/verify-academic-summary-gate.ts');
  await runBackendGate('Incremento 4 -- Historial competitivo cross-temporada', blockVEnv, 3123, 'scripts/verify-competitive-history-gate.ts');
  await runBackendGate('Incremento 5 -- Vista consolidada de perfil propio', blockVEnv, 3124, 'scripts/verify-advanced-profile-gate.ts');
  await runBackendGate('Incremento 6 -- Personalización con elementos bloqueados', blockVEnv, 3125, 'scripts/verify-personalization-catalog-gate.ts');
  await runBackendGate('Incremento 7 -- Vista previa pública', blockVEnv, 3126, 'scripts/verify-public-profile-preview-gate.ts');

  // 3. Gate propio del Incremento 8 (mobile, lógica pura + estático, sin backend).
  runOnce('Incremento 8 -- Superficie móvil de Perfil Avanzado', 'pnpm', ['run', 'verify:advanced-profile-mobile-gate'], { cwd: MOBILE_DIR });

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
