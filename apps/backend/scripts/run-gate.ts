// DEV-DB-HYGIENE-1 -- Gate Database Isolation.
//
// Vía OFICIAL local para ejecutar cualquier `verify-*-gate.ts`. Ejecutar un
// gate directamente (`tsx scripts/verify-X-gate.ts`) queda FUERA del flujo
// local soportado -- sin este wrapper no hay ninguna garantía de que el
// gate esté aislado de `axioma_dev` (la base real de Android/desarrollo
// manual).
//
// Qué hace, en orden:
//   1. Carga OBLIGATORIAMENTE `.env.gates` (nunca `.env`) -- si no existe,
//      falla de inmediato con instrucciones, nunca sigue con lo que haya
//      en el entorno ambiente por defecto.
//   2. Verifica que el `DATABASE_URL` resuelto de esa carga NO apunte a
//      `axioma_dev` -- comparación exacta del nombre de base al final del
//      connection string, no un substring ingenuo (evita falsos positivos
//      / negativos con nombres como `axioma_gates_dev`).
//   3. Verifica que el `DATABASE_URL` resuelto SÍ apunte a la base de gates
//      esperada (`axioma_gates_dev` por defecto, override posible vía
//      `GATE_DATABASE_URL` para quien use un nombre distinto).
//   4. Spawnea el gate real (`tsx scripts/<archivo>`) como proceso hijo con
//      ese `DATABASE_URL` inyectado en su entorno, y le antepone
//      `http://127.0.0.1:3001` (el servidor de gates, override posible vía
//      `GATE_SERVER_BASE_URL`) como PRIMER argumento posicional -- todos
//      los gates ya leen `process.argv[2] ?? 'http://127.0.0.1:3000'`, así
//      que esto redirige su tráfico HTTP sin tocar ningún gate.
//
// No modifica ningún `verify-*-gate.ts`. No toca `axioma_dev` en ningún
// punto de su propia ejecución (ni siquiera para leerla).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const BACKEND_ROOT = join(__dirname, '..');
const ENV_GATES_PATH = join(BACKEND_ROOT, '.env.gates');
const FORBIDDEN_DB_NAME = 'axioma_dev';
const EXPECTED_DB_NAME = process.env.GATE_DATABASE_URL_NAME ?? 'axioma_gates_dev';
const DEFAULT_GATE_SERVER_BASE_URL = process.env.GATE_SERVER_BASE_URL ?? 'http://127.0.0.1:3001';

function fail(message: string): never {
  console.error(`\nFALLO DE AISLAMIENTO -- run-gate.ts se niega a continuar.\n${message}\n`);
  process.exit(1);
}

/** Parser mínimo -- solo necesita KEY=VALUE por línea, sin interpretar comillas anidadas ni multilinea (suficiente para .env.gates, que este mismo repo controla). */
function parseEnvFile(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Extrae el nombre de base de datos (segmento de path) de una URL de conexión Postgres, ignorando query string. */
function extractDatabaseName(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    const name = url.pathname.replace(/^\//, '');
    return name || null;
  } catch {
    return null;
  }
}

function main() {
  const [gateFile, ...gateArgs] = process.argv.slice(2);
  if (!gateFile) {
    fail('Uso: tsx scripts/run-gate.ts <verify-X-gate.ts> [args adicionales para el gate]');
  }

  // 1. .env.gates es OBLIGATORIO -- nunca se cae de vuelta a `.env`/al entorno ambiente.
  if (!existsSync(ENV_GATES_PATH)) {
    fail(
      `No existe ${ENV_GATES_PATH}.\n` +
        'Bootstrap requerido antes de correr gates -- ver README de DEV-DB-HYGIENE-1:\n' +
        '  1. Crear la base:   docker exec axioma-postgres-dev psql -U axioma -d axioma_dev -c "CREATE DATABASE axioma_gates_dev OWNER axioma;"\n' +
        '  2. Migrarla:        (DATABASE_URL apuntando a axioma_gates_dev) pnpm prisma migrate deploy\n' +
        '  3. Confirmar que apps/backend/.env.gates existe con DATABASE_URL=...axioma_gates_dev...',
    );
  }

  const gatesEnv = parseEnvFile(readFileSync(ENV_GATES_PATH, 'utf8'));
  const resolvedDatabaseUrl = gatesEnv.DATABASE_URL;
  if (!resolvedDatabaseUrl) {
    fail(`${ENV_GATES_PATH} no define DATABASE_URL.`);
  }

  const dbName = extractDatabaseName(resolvedDatabaseUrl);
  if (!dbName) {
    fail(`No se pudo interpretar el nombre de base de datos desde DATABASE_URL de .env.gates: "${resolvedDatabaseUrl}".`);
  }

  // 2. Nunca axioma_dev, exacto (no substring -- "axioma_gates_dev" NO debe rechazarse).
  if (dbName === FORBIDDEN_DB_NAME) {
    fail(
      `.env.gates resuelve a la base "${dbName}" -- EXACTAMENTE la base real de Android/desarrollo manual.\n` +
        'Esto nunca debe pasar. Revisa apps/backend/.env.gates antes de continuar.',
    );
  }

  // 3. Debe ser explícitamente la base de gates esperada -- no "cualquier otra que no sea axioma_dev".
  if (dbName !== EXPECTED_DB_NAME) {
    fail(
      `.env.gates resuelve a la base "${dbName}", pero se esperaba "${EXPECTED_DB_NAME}".\n` +
        'Si es intencional (nombre de base de gates distinto), define GATE_DATABASE_URL_NAME con el nombre correcto.',
    );
  }

  console.log(`[run-gate] Aislamiento confirmado -- DB de gates = "${dbName}" (nunca "${FORBIDDEN_DB_NAME}").`);
  console.log(`[run-gate] Servidor de gates = ${DEFAULT_GATE_SERVER_BASE_URL}`);
  console.log(`[run-gate] Ejecutando: ${gateFile}`);

  // 4. Spawnear el gate real, sin modificarlo -- DATABASE_URL inyectado, base HTTP como primer argumento posicional.
  const child = spawn(
    'npx',
    ['tsx', join('scripts', gateFile), DEFAULT_GATE_SERVER_BASE_URL, ...gateArgs],
    {
      cwd: BACKEND_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        ...gatesEnv,
        DATABASE_URL: resolvedDatabaseUrl,
      },
    },
  );

  child.on('exit', (code) => {
    process.exit(code ?? 1);
  });
}

main();
