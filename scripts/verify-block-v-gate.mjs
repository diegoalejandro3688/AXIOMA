#!/usr/bin/env node
/**
 * Gate consolidado -- Bloque V (Refinamiento y Preparación).
 *
 * ORQUESTADOR, no reemplazo: invoca los mismos scripts `verify:*-gate` que
 * ya existen por dominio (cada uno se conserva intacto para diagnóstico
 * puntual, ver `apps/backend/scripts/verify-*.ts` y
 * `apps/mobile/scripts/verify-offline-outbox-gate.ts`), en la misma
 * secuencia que ya usa `.github/workflows/ci.yml` (job `db-migrations`) --
 * este script no reimplementa ninguna lógica de verificación, solo
 * automatiza localmente la orquestación de puertos/env/orden que hoy solo
 * existe como pasos sueltos de CI.
 *
 * Precondiciones (no las levanta este script, igual que ya exige cada gate
 * individual): Postgres real accesible vía `DATABASE_URL`, MinIO real
 * accesible vía `OBJECT_STORAGE_*`. Falla con un mensaje explícito si
 * faltan, en vez de intentar adivinar o levantar infraestructura nueva.
 *
 * Uso: node scripts/verify-block-v-gate.mjs
 * (equivalente a `pnpm run verify:block-v-gate` desde la raíz del repo)
 *
 * Portabilidad Windows (corrección real, ver hallazgo del usuario): `ROOT`
 * se calculaba con `new URL('..', import.meta.url).pathname`, que NUNCA
 * decodifica el porcentaje-escapado de la URL -- con una ruta que contiene
 * un espacio (ej. "usuario 4"), `.pathname` deja literalmente "usuario%204"
 * en vez de "usuario 4". Eso apuntaba `cwd` a un directorio que no existe,
 * y `spawnSync` fallaba en el arranque mismo (`status: null`, ni siquiera
 * llega a ejecutar nada) -- por eso el primer paso (`typecheck`) fallaba
 * sin ningún error de TypeScript real. `fileURLToPath` sí decodifica
 * correctamente y además normaliza separadores de Windows.
 */

import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { createWriteStream, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../apps/backend', import.meta.url));

// En Windows, `pnpm`/`npx` son shims `.cmd` -- `spawn`/`spawnSync` sin
// `shell: true` no puede ejecutarlos directamente (falla con `status: null`
// y `error.code === 'ENOENT'/'EINVAL'`, sin importar que `cwd` sea correcto).
// `node` (binario real, no shim) no lo necesita, pero no hace daño.
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
  console.log('\n\n=== Resumen — Gate consolidado Bloque V ===');
  const width = Math.max(...results.map((r) => r.name.length), 20);
  for (const r of results) {
    const pad = r.name.padEnd(width, ' ');
    const mark = r.status === 'PASS' ? 'PASS' : r.status === 'SKIPPED' ? 'SKIPPED' : 'FAIL';
    console.log(`${pad}  ${mark}${r.note ? '  -- ' + r.note : ''}`);
  }
  console.log(exitCode === 0 ? '\nGate consolidado: PASS\n' : '\nGate consolidado: FAIL\n');
  process.exit(exitCode);
}

/**
 * `spawnSync` puede fallar de dos formas muy distintas y `status` por sí
 * solo no las distingue: (a) el proceso arrancó y salió con código != 0
 * (`status` es un número), o (b) el proceso NUNCA arrancó (spawn falló --
 * `status` es `null`, `error` trae la causa real: ENOENT, EINVAL, cwd
 * inexistente, etc.). Reportar solo "código de salida null" oculta la causa
 * real -- este helper arma un mensaje que distingue ambos casos.
 */
function describeFailure(result) {
  if (result.error) {
    return `no se pudo iniciar el proceso -- ${result.error.code ?? result.error.name}: ${result.error.message}`;
  }
  if (result.signal) {
    return `terminado por señal ${result.signal}`;
  }
  return `código de salida ${result.status}`;
}

/** Comando de una sola pasada (typecheck, lint, build, prisma, gates HTTP). Lanza si falla. */
function runOnce(name, command, args, opts = {}) {
  logStep(name);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: useShell, ...opts });
  if (result.error || result.status !== 0) {
    record(name, 'FAIL', describeFailure(result));
    printSummaryAndExit(1);
  }
  record(name, 'PASS');
}

/**
 * Levanta el backend en un puerto dado y espera /health/live -- mismo
 * patrón que ci.yml. `logFile`, si se pasa, replica exactamente lo que CI
 * hace con `nohup node dist/main.js > archivo.log 2>&1 &`: escribe
 * stdout+stderr del proceso a un archivo real en disco (no solo en memoria)
 * -- necesario porque `verify-observability-gate.ts` lee ese archivo con
 * `readFileSync` al final de su ejecución (mismo contrato que en CI, no se
 * toca su lógica). Ruta SIEMPRE absoluta (`join(BACKEND_DIR, logFile)`) --
 * un nombre relativo dependería de cuál sea `process.cwd()` en el momento
 * exacto de la escritura, que no tiene por qué coincidir con `BACKEND_DIR`.
 */
async function startBackend(env, port, logFile) {
  // Ciclo de vida del archivo de log: se BORRA explícitamente antes de
  // arrancar, no se confía solo en que `createWriteStream` lo abra en modo
  // truncado (`'w'`, el default). Motivo real, no teórico: si un backend
  // huérfano de una corrida interrumpida anterior sigue vivo (posible en
  // Windows si el proceso no terminó limpio -- ver el fix de `shell: true`
  // más abajo) y todavía tiene el archivo abierto, sus propios crons
  // (PRIVACY/ANALYTICS se disparan solos) seguirían escribiéndole líneas
  // viejas que un simple truncado-al-abrir no elimina de forma confiable --
  // borrar el path fuerza que cualquier escritor viejo quede apuntando a un
  // inodo/manejador que ya no es el que este gate va a leer.
  if (logFile) {
    rmSync(join(BACKEND_DIR, logFile), { force: true });
  }

  // SIN `shell: useShell` aquí -- a diferencia de `pnpm`/`npx` (shims
  // `.cmd`, sí lo necesitan), `node` es un ejecutable real. Envolverlo en
  // `cmd.exe /d /s /c node dist/main.js` (lo que hacía la versión anterior)
  // agrega una capa de proceso innecesaria que, con un hijo de larga
  // duración que escribe stdout/stderr continuamente bajo carga (como el
  // backend durante el gate de AUTH), es una causa real conocida de cierres
  // de pipe/conexión intermitentes en Windows -- y además rompe
  // silenciosamente `child.kill()` (mata el `cmd.exe` envoltorio, no
  // necesariamente el proceso `node` real, que puede quedar huérfano
  // reteniendo el puerto).
  const child = spawn('node', ['dist/main.js'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...env, PORT: String(port) },
    stdio: 'pipe',
  });

  let output = '';
  let spawnError = null;
  let exitInfo = null;
  const logStream = logFile ? createWriteStream(join(BACKEND_DIR, logFile)) : null;
  child.stdout?.on('data', (d) => {
    output += d.toString();
    logStream?.write(d);
  });
  child.stderr?.on('data', (d) => {
    output += d.toString();
    logStream?.write(d);
  });
  child.on('error', (err) => {
    spawnError = err; // spawn en sí falló (ej. cwd inexistente) -- distinto de que el backend arranque y luego falle.
  });
  // Si el backend termina por su cuenta (excepción no capturada, crash, o
  // cualquier motivo) mientras el gate todavía lo necesita, `runBackendGate`
  // debe poder mostrarlo explícitamente en vez de dejar que se manifieste
  // solo como un `ECONNRESET` críptico del lado del cliente HTTP del gate.
  child.on('exit', (code, signal) => {
    exitInfo = { code, signal };
  });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (spawnError) {
      throw new Error(`No se pudo iniciar el backend en :${port} -- ${spawnError.code ?? spawnError.name}: ${spawnError.message}`);
    }
    try {
      const res = await fetch(`http://localhost:${port}/health/live`);
      if (res.ok) return { child, logStream, output: () => output, exitInfo: () => exitInfo };
    } catch {
      // todavía no está arriba -- reintentar
    }
    await sleep(1000);
  }
  child.kill();
  throw new Error(`El backend no respondió en :${port} a tiempo.\n${output}`);
}

/**
 * Termina el proceso Y cierra el archivo de log antes de devolver el
 * control -- si `verify-observability-gate.ts` intentara leerlo mientras el
 * `WriteStream` sigue abierto/sin flush, podría encontrar el archivo
 * incompleto (condición de carrera real, no solo teórica en Windows).
 */
async function stopBackend(handle) {
  handle.child.kill();
  if (handle.logStream) {
    await new Promise((resolve) => handle.logStream.end(resolve));
  }
}

/**
 * CAUSA RAÍZ real de que `backend-observability.log` cortara justo después
 * del arranque (evidencia: el archivo terminaba exactamente en "Nest
 * application successfully started", nada de lo que pasó durante el gate).
 * `spawnSync` bloquea el *event loop* del propio orquestador mientras el
 * script del gate corre -- el backend (proceso aparte) sigue respondiendo
 * bien por su cuenta, pero los listeners `child.stdout.on('data', ...)` que
 * escriben al archivo de log no pueden dispararse mientras el orquestador
 * está congelado esperando a `spawnSync`: nadie drena el pipe. Por eso los
 * checks puramente HTTP pasaban (no dependen del orquestador) y todos los
 * que leen el log fallaban (nunca se escribió nada durante la ejecución).
 * `spawn` asíncrono, esperado con una Promise sobre su evento `close`,
 * mantiene el event loop libre para seguir drenando stdout/stderr del
 * backend en paralelo.
 */
function spawnAsync(command, args, opts) {
  return new Promise((resolve) => {
    const child = spawn(command, args, opts);
    let error = null;
    child.on('error', (err) => {
      error = err;
    });
    child.on('close', (status, signal) => {
      resolve({ status, signal, error });
    });
  });
}

/** Imprime las variables suministradas a un paso, enmascarando cualquier clave que parezca secreta. */
function printEnvSummary(label, env) {
  console.log(`  [env] ${label}:`);
  for (const [key, value] of Object.entries(env)) {
    const isSecret = /secret|key|password/i.test(key) && key !== 'OBJECT_STORAGE_ACCESS_KEY_ID';
    const shown = value === undefined || value === '' ? '<vacío>' : isSecret ? `<presente, ${String(value).length} caracteres>` : value;
    console.log(`    ${key} = ${shown}`);
  }
}

async function runBackendGate(name, env, port, gateScript, gateArgs = [], logFile) {
  logStep(name);
  if (logFile) printEnvSummary(name, env);
  let handle;
  try {
    handle = await startBackend(env, port, logFile);
  } catch (err) {
    record(name, 'FAIL', err.message.split('\n')[0]);
    printSummaryAndExit(1);
  }
  const result = await spawnAsync('npx', ['tsx', gateScript, `http://localhost:${port}`, ...gateArgs], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: useShell,
  });
  // Se lee ANTES de `stopBackend()` -- si el backend ya había terminado por
  // su cuenta (crash real) mientras el gate seguía pidiéndole cosas, el
  // `exit` ya ocurrió y quedó registrado; llamar a `stopBackend()` después
  // solo mata un proceso que en ese caso ya no existe (`kill()` sobre un pid
  // muerto no lanza, es un no-op seguro).
  const exitBeforeStop = handle.exitInfo?.();
  await stopBackend(handle);
  const exitAfterStop = handle.exitInfo?.();

  if (result.error || result.status !== 0) {
    // Diagnóstico completo, no solo "código de salida N" -- distingue
    // explícitamente el proceso del GATE (`npx tsx ...`) del proceso del
    // BACKEND, y si el backend murió ANTES de que el orquestador lo matara
    // a propósito (`exitBeforeStop`) vs. solo al recibir el `kill()`
    // intencional (`exitAfterStop`, esperado y no es una causa de fallo).
    const lines = [];
    lines.push(`gate (npx tsx ${gateScript}): ${describeFailure(result)}`);
    if (exitBeforeStop) {
      lines.push(`backend YA había terminado por su cuenta ANTES del kill intencional -- código=${exitBeforeStop.code} señal=${exitBeforeStop.signal}`);
    } else if (exitAfterStop) {
      lines.push(`backend terminó recién al recibir el kill() intencional del orquestador -- código=${exitAfterStop.code} señal=${exitAfterStop.signal} (esperado, no es la causa)`);
    } else {
      lines.push('backend: sin información de salida capturada.');
    }
    const tail = handle.output().split('\n').filter((l) => l.trim().length > 0).slice(-40).join('\n');
    lines.push(`últimas ${Math.min(40, handle.output().split('\n').length)} líneas de stdout+stderr del backend:\n${tail}`);
    record(name, 'FAIL', lines.join('\n'));
    printSummaryAndExit(1);
  }
  record(name, 'PASS');
}

async function main() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(
      `Faltan variables de entorno requeridas: ${missing.join(', ')}.\n` +
        'Este script no levanta Postgres/MinIO -- deben estar corriendo y accesibles antes de ejecutarlo (mismo requisito que ya tiene cada gate individual).',
    );
    process.exit(1);
  }

  // NODE_ENV/LOG_LEVEL fijados EXPLÍCITAMENTE, no heredados de `process.env`
  // -- a diferencia del resto de variables (DATABASE_URL, claves, etc.), que
  // sí deben venir del entorno de quien invoca, estos dos cambian el
  // COMPORTAMIENTO del backend de formas que `ci.yml` nunca ejercita (ahí
  // simplemente no existen en el runner). Si la máquina local los tiene
  // definidos globalmente (ej. `NODE_ENV=production` de otro proyecto),
  // `{ ...process.env, ...env }` los heredaría silenciosamente:
  // `NODE_ENV=production` hace que `DiagnosticsController.rejectInProduction()`
  // rechace `/platform/_internal/diagnostics/log-tricky` (404 en vez de
  // loguear el payload de prueba), y un `LOG_LEVEL` en `warn` o superior
  // descarta las líneas de nivel `log` que usan los sweepers/relay
  // (`this.logger.log('Iniciando barrido de PRIVACY')`, etc.) -- ambos
  // explicarían fallos del gate de OBSERVABILITY que no tienen nada que ver
  // con un defecto real de sanitización/correlación.
  const authEnv = {
    AUTH_IDENTITY_PROVIDER: 'stub',
    INTERNAL_OPS_KEY: process.env.INTERNAL_OPS_KEY,
    NODE_ENV: 'development',
    LOG_LEVEL: 'log',
  };
  const analyticsEnv = { ...authEnv, ANALYTICS_ACTOR_SECRET: process.env.ANALYTICS_ACTOR_SECRET ?? 'local-analytics-actor-secret' };
  const objectStorageEnv = {
    ...analyticsEnv,
    OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT ?? 'http://localhost:9000',
    OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION ?? 'auto',
    OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET ?? 'axioma-content-local',
    OBJECT_STORAGE_ACCESS_KEY_ID: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? 'axioma',
    // Fallback alineado con `docker-compose.yml` (MINIO_ROOT_PASSWORD) -- el
    // valor anterior ('axioma_local_password') nunca coincidió con el MinIO
    // real que levanta ese archivo ('axioma_dev_password'), causando
    // SignatureDoesNotMatch en el gate de OBJECT-STORAGE (causa raíz
    // confirmada leyendo el log real del backend). `??` sigue priorizando
    // cualquier valor explícito ya presente en el entorno de quien invoca.
    OBJECT_STORAGE_SECRET_ACCESS_KEY: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? 'axioma_dev_password',
    OBJECT_STORAGE_MAX_FILE_SIZE_BYTES: process.env.OBJECT_STORAGE_MAX_FILE_SIZE_BYTES ?? '5242880',
    OBJECT_STORAGE_MAX_WIDTH_PX: process.env.OBJECT_STORAGE_MAX_WIDTH_PX ?? '4000',
    OBJECT_STORAGE_MAX_HEIGHT_PX: process.env.OBJECT_STORAGE_MAX_HEIGHT_PX ?? '4000',
  };

  // 1. Estáticos -- mismos comandos que `pnpm -r run <script>` a nivel de repo.
  runOnce('typecheck', 'pnpm', ['-r', 'run', 'typecheck'], { cwd: ROOT });
  runOnce('lint', 'pnpm', ['-r', 'run', 'lint'], { cwd: ROOT });
  runOnce('build contracts', 'pnpm', ['--filter', '@axioma/contracts', 'run', 'build'], { cwd: ROOT });
  runOnce('build backend', 'pnpm', ['--filter', '@axioma/backend', 'run', 'build'], { cwd: BACKEND_DIR });

  // 2. Migraciones + seed inicial.
  runOnce('prisma generate', 'pnpm', ['run', 'prisma:generate'], { cwd: BACKEND_DIR });
  runOnce('prisma migrate deploy', 'pnpm', ['run', 'prisma:migrate:deploy'], { cwd: BACKEND_DIR });
  runOnce('prisma seed (1ra pasada)', 'pnpm', ['run', 'prisma:seed'], { cwd: BACKEND_DIR });

  // 3. Gates de dominio -- mismo orden, mismos puertos separados que ci.yml
  // (el límite de /auth/session es por proceso -- reusar puerto arrastraría
  // el contador de rate-limiting de un gate al siguiente).
  await runBackendGate('AUTH gate', authEnv, 3100, 'scripts/verify-auth-gate.ts');
  await runBackendGate('PRIVACY gate', authEnv, 3101, 'scripts/verify-privacy-gate.ts');
  await runBackendGate('ANALYTICS gate', analyticsEnv, 3102, 'scripts/verify-analytics-gate.ts');
  await runBackendGate('OBSERVABILITY gate', analyticsEnv, 3103, 'scripts/verify-observability-gate.ts', ['backend-observability.log'], 'backend-observability.log');
  await runBackendGate('USER gate', analyticsEnv, 3104, 'scripts/verify-user-gate.ts');
  await runBackendGate('OBJECT-STORAGE gate', objectStorageEnv, 3105, 'scripts/verify-object-storage-gate.ts');

  // 4. Contenido real de EDUCATION (recurso publicado + preguntas) antes de sus gates.
  runOnce('prisma seed (contenido EDUCATION)', 'pnpm', ['run', 'prisma:seed'], { cwd: BACKEND_DIR });

  await runBackendGate('EDUCATION gate', objectStorageEnv, 3106, 'scripts/verify-education-gate.ts');
  await runBackendGate('PROGRESS gate', objectStorageEnv, 3107, 'scripts/verify-progress-gate.ts');

  // 5. OFFLINE-OUTBOX (mobile) -- requiere Node >=22 (node:sqlite, ver
  // ADR-0011). No se cambia de versión de Node automáticamente -- si el
  // proceso actual no la tiene, se falla con un mensaje explícito en vez de
  // un error críptico de módulo nativo faltante.
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 22) {
    record('OFFLINE-OUTBOX gate', 'SKIPPED', `Node ${process.versions.node} < 22 -- requerido por node:sqlite (ADR-0011). Ejecutar este script con Node 22+ para incluirlo.`);
  } else {
    const result = spawnSync('pnpm', ['--filter', '@axioma/mobile', 'run', 'verify:offline-outbox-gate'], {
      cwd: ROOT,
      stdio: 'inherit',
      shell: useShell,
    });
    if (result.error || result.status !== 0) {
      record('OFFLINE-OUTBOX gate', 'FAIL', describeFailure(result));
      printSummaryAndExit(1);
    }
    record('OFFLINE-OUTBOX gate', 'PASS');
  }

  printSummaryAndExit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
