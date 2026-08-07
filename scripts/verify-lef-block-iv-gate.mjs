#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque IV (Competir, Learning Experience Foundation)
 * -- ver docs/adr/LEF-BLOCK-IV-DEFINITION.md y
 * docs/adr/LEF-BLOCK-IV-CLOSURE-REPORT.md.
 *
 * Nombre con prefijo `lef-` -- ver nota de nomenclatura en
 * LEF-BLOCK-IV-DEFINITION.md: `verify-block-iv-gate.mjs` pertenece a un
 * roadmap anterior y distinto (Fase 1, "Bloque IV de V"), ya usado.
 *
 * ORQUESTADOR, no reemplazo -- mismo criterio que verify-block-iii-gate.mjs:
 * 1. Reutiliza el gate consolidado del Bloque III TAL CUAL (que a su vez
 *    reutiliza el de Bloque II, Bloque I y M1) -- no se reimplementa nada
 *    de eso, se invoca como un solo paso.
 * 2. Agrega los gates propios de los cinco incrementos de este bloque
 *    (Fundación de temporadas y ligas, Ranking, Perfil competitivo,
 *    Pregunta rápida, Participación de liga -- Superficie móvil 5.a-5.d no
 *    tiene gate backend propio, se valida con los gates mobile de abajo):
 *    - Los gates sin HTTP corren directamente vía `pnpm run verify:*`.
 *    - Los gates HTTP corren cada uno con su propia instancia de backend
 *      en un puerto nuevo (mismo motivo que todos los bloques anteriores:
 *      el rate limiting de /auth/session es por proceso).
 * 3. Agrega los gates mobile propios de la superficie de Incremento 5
 *    (lógica pura + verificación estática de las pantallas reales).
 *
 * Uso: node scripts/verify-lef-block-iv-gate.mjs
 * (equivalente a `pnpm run verify:lef-block-iv-gate` desde la raíz del repo)
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
  console.log('\n\n=== Resumen -- Gate consolidado Bloque IV (LEF) ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado Bloque IV (LEF): PASS\n' : '\nGate consolidado Bloque IV (LEF): FAIL\n');
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

  // 1. Gate consolidado del Bloque III completo (que ya incluye Bloque II + I + M1).
  runOnce('Gate consolidado Bloque III (M1 + Bloque I + II + III)', 'node', ['scripts/verify-block-iii-gate.mjs'], { cwd: ROOT });

  // 2. Gates de Bloque IV sin HTTP -- en proceso, contra Prisma/pg directamente.
  runOnce('Incremento 1 -- Fundación de temporadas y ligas', 'pnpm', ['run', 'verify:league-season-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 2 -- Ranking', 'pnpm', ['run', 'verify:league-ranking-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 3 -- Perfil competitivo: fundación', 'pnpm', ['run', 'verify:competitive-profile-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 4 -- Pregunta rápida: fundación', 'pnpm', ['run', 'verify:quick-question-foundation-gate'], { cwd: BACKEND_DIR });
  runOnce('Incremento 4 -- Pregunta rápida: motor de sesión', 'pnpm', ['run', 'verify:quick-question-engine-gate'], { cwd: BACKEND_DIR });

  const blockIVEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
    ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret',
  };

  // 3. Gates de Bloque IV con HTTP -- cada uno con su propia instancia de backend.
  await runBackendGate('Incremento 3 -- Perfil competitivo: endpoint individual', blockIVEnv, 3117, 'scripts/verify-competitive-profile-endpoint-gate.ts');
  await runBackendGate('Incremento 3 -- Ranking con redacción', blockIVEnv, 3118, 'scripts/verify-competitive-leaderboard-gate.ts');
  await runBackendGate('Incremento 4 -- Pregunta rápida: endpoints HTTP', blockIVEnv, 3119, 'scripts/verify-quick-question-http-gate.ts');
  await runBackendGate('Incremento 5.a -- Participación de liga (backend)', blockIVEnv, 3120, 'scripts/verify-league-participation-gate.ts');

  // 4. Gates mobile de la superficie de Incremento 5 (lógica pura + estático sobre las pantallas reales).
  runOnce('Incremento 5.a -- Participación de liga (mobile)', 'pnpm', ['run', 'verify:league-participation-gate'], { cwd: MOBILE_DIR });
  runOnce('Incremento 5.b -- Ranking (mobile)', 'pnpm', ['run', 'verify:leaderboard-gate'], { cwd: MOBILE_DIR });
  runOnce('Incremento 5.c -- Perfil competitivo (mobile)', 'pnpm', ['run', 'verify:competitive-profile-gate'], { cwd: MOBILE_DIR });
  runOnce('Incremento 5.d -- Pregunta rápida (mobile)', 'pnpm', ['run', 'verify:quick-question-gate'], { cwd: MOBILE_DIR });

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
