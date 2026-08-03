#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque II (Progresión Visible y Public Profile
 * Foundation, Learning Experience Foundation) -- ver
 * docs/adr/BLOCK-II-DEFINITION.md, docs/adr/0018-public-profile-foundation.md
 * y docs/adr/BLOCK-II-CLOSURE-REPORT.md.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio que verify-block-i-gate.mjs:
 * 1. Reutiliza el gate consolidado del Bloque I TAL CUAL (que a su vez
 *    reutiliza el de M1 completo) -- no se reimplementa nada de eso, se
 *    invoca como un solo paso.
 * 2. Agrega los dos gates propios de este bloque -- Progresión Visible
 *    (GAMIFICATION, lectura) y Public Profile Foundation (USER + PRIVACY),
 *    cada uno con su propia instancia de backend en un puerto nuevo (mismo
 *    motivo que M1/Bloque I: el rate limiting de /auth/session es por
 *    proceso -- confirmado de nuevo durante el cierre de este bloque, ver
 *    BLOCK-II-CLOSURE-REPORT.md §5, incidencia 6).
 *
 * Uso: node scripts/verify-block-ii-gate.mjs
 * (equivalente a `pnpm run verify:block-ii-gate` desde la raíz del repo)
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
  console.log('\n\n=== Resumen — Gate consolidado Bloque II ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado Bloque II: PASS\n' : '\nGate consolidado Bloque II: FAIL\n');
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

  // 1. Gate consolidado del Bloque I completo (que ya incluye M1 entero).
  runOnce('Gate consolidado Bloque I (M1 + GAMIFICATION schema/integración/otorgamiento)', 'node', ['scripts/verify-block-i-gate.mjs'], { cwd: ROOT });

  const blockIIEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
  };

  // 2. Progresión Visible -- lectura sobre GAMIFICATION, puerto propio.
  await runBackendGate('GAMIFICATION Progresión Visible', blockIIEnv, 3112, 'scripts/verify-gamification-progression-gate.ts');

  // 3. Public Profile Foundation -- USER + PRIVACY, puerto propio. Necesita
  // dist/cli/recover-account.js ya compilado -- lo garantiza el paso 1
  // (gate consolidado del Bloque I ya corrió `build backend` como parte del
  // gate de M1 que invoca).
  await runBackendGate('USER Public Profile Foundation', blockIIEnv, 3113, 'scripts/verify-public-profile-gate.ts');

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
