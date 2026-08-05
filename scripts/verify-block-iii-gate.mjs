#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque III (Gamificación Avanzada, Learning
 * Experience Foundation) -- ver docs/adr/BLOCK-III-DEFINITION.md y
 * docs/adr/BLOCK-III-CLOSURE-REPORT.md.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio que verify-block-ii-gate.mjs:
 * 1. Reutiliza el gate consolidado del Bloque II TAL CUAL (que a su vez
 *    reutiliza el del Bloque I completo, que a su vez reutiliza el de M1) --
 *    no se reimplementa nada de eso, se invoca como un solo paso.
 * 2. Agrega los gates propios de los cinco incrementos de este bloque
 *    (Entrega de recompensas, Logros, Títulos, Desafíos, Cosméticos):
 *    - Los gates sin HTTP (schema/entrega/progreso en proceso, sin backend
 *      levantado) corren directamente vía `pnpm run verify:*`, mismo
 *      criterio que "GAMIFICATION schema gate" en verify-block-i-gate.mjs.
 *    - Los gates HTTP (equipamiento de títulos, reclamación de desafíos,
 *      equipamiento de cosméticos) corren cada uno con su propia instancia
 *      de backend en un puerto nuevo (mismo motivo que M1/Bloque I/Bloque
 *      II: el rate limiting de /auth/session es por proceso).
 *
 * Uso: node scripts/verify-block-iii-gate.mjs
 * (equivalente a `pnpm run verify:block-iii-gate` desde la raíz del repo)
 */

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../apps/backend', import.meta.url));

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
  console.log('\n\n=== Resumen — Gate consolidado Bloque III ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado Bloque III: PASS\n' : '\nGate consolidado Bloque III: FAIL\n');
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

  // 1. Gate consolidado del Bloque II completo (que ya incluye Bloque I + M1).
  runOnce('Gate consolidado Bloque II (M1 + Bloque I + Progresión Visible + Public Profile)', 'node', ['scripts/verify-block-ii-gate.mjs'], { cwd: ROOT });

  // 2. Gates sin HTTP -- en proceso, contra Prisma/pg directamente, sin backend levantado.
  runOnce('Incremento 1 -- Entrega de recompensas: fundación', 'pnpm', ['run', 'verify:reward-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 1 -- Entrega de recompensas: worker de evaluación', 'pnpm', ['run', 'verify:reward-evaluation-worker-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 1 -- Entrega de recompensas: XP_BONUS y convergencia', 'pnpm', ['run', 'verify:reward-delivery-xp-bonus-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 2 -- Logros: fundación', 'pnpm', ['run', 'verify:achievement-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 2 -- Logros: progreso y desbloqueo', 'pnpm', ['run', 'verify:achievement-progress-unlock-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 3 -- Títulos: fundación', 'pnpm', ['run', 'verify:title-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 4 -- Desafíos: fundación', 'pnpm', ['run', 'verify:challenge-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 4 -- Desafíos: progreso', 'pnpm', ['run', 'verify:challenge-progress-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 5 -- Cosméticos: fundación', 'pnpm', ['run', 'verify:cosmetic-foundation-gate'], { cwd: BACKEND_DIR });

  const blockIIIEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
  };

  // 3. Gates HTTP -- cada uno con su propia instancia de backend en un puerto nuevo.
  await runBackendGate('Incremento 3 -- Títulos: equipamiento', blockIIIEnv, 3114, 'scripts/verify-title-equipment-gate.ts');
  await runBackendGate('Incremento 4 -- Desafíos: reclamación', blockIIIEnv, 3115, 'scripts/verify-challenge-claim-gate.ts');
  await runBackendGate('Incremento 5 -- Cosméticos: equipamiento', blockIIIEnv, 3116, 'scripts/verify-cosmetic-equipment-gate.ts');

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
