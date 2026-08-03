#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque I (Gamification Foundation, Learning
 * Experience Foundation) -- ver docs/adr/0016-gamificacion-fundacion.md y
 * docs/adr/0017-entrega-multiconsumidor-outbox.md.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio que verify-block-v-gate.mjs:
 * 1. Reutiliza el gate consolidado de M1 TAL CUAL (typecheck, lint, build,
 *    migrate, seed, AUTH, PRIVACY, ANALYTICS, OBSERVABILITY, USER,
 *    OBJECT-STORAGE, EDUCATION, PROGRESS, OFFLINE-OUTBOX) -- no se
 *    reimplementa nada de eso, se invoca como un solo paso.
 * 2. Agrega los tres gates propios de GAMIFICATION: estructural,
 *    integración PROGRESS -> GAMIFICATION, y otorgamiento de XP -- los dos
 *    últimos con su propia instancia de backend en un puerto nuevo (mismo
 *    motivo que M1: el rate limiting de /auth/session es por proceso).
 *
 * Uso: node scripts/verify-block-i-gate.mjs
 * (equivalente a `pnpm run verify:block-i-gate` desde la raíz del repo)
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
  console.log('\n\n=== Resumen — Gate consolidado Bloque I ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado Bloque I: PASS\n' : '\nGate consolidado Bloque I: FAIL\n');
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

  // 1. Gate consolidado de M1 completo -- typecheck, lint, build, migrate,
  // seed, AUTH, PRIVACY, ANALYTICS, OBSERVABILITY, USER, OBJECT-STORAGE,
  // EDUCATION, PROGRESS, OFFLINE-OUTBOX. Ver verify-block-v-gate.mjs -- no
  // se reimplementa nada de esto.
  runOnce('Gate consolidado M1 (typecheck/lint/build + dominios de Fase 1)', 'node', ['scripts/verify-block-v-gate.mjs'], { cwd: ROOT });

  const gamificationEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
  };

  // 2. GAMIFICATION schema -- sin HTTP, no necesita backend.
  runOnce('GAMIFICATION schema gate', 'pnpm', ['run', 'verify:gamification-schema-gate'], { cwd: BACKEND_DIR });

  // 3-4. GAMIFICATION integración y otorgamiento -- cada uno con su propia
  // instancia de backend (mismo motivo que M1: rate limiting por proceso).
  await runBackendGate('GAMIFICATION integración PROGRESS->GAMIFICATION', gamificationEnv, 3110, 'scripts/verify-gamification-integration-gate.ts');
  await runBackendGate('GAMIFICATION otorgamiento de XP', gamificationEnv, 3111, 'scripts/verify-gamification-xp-grant-gate.ts');

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
