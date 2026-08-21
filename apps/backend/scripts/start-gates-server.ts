// DEV-DB-HYGIENE-1 -- arranca el servidor NestJS DEDICADO a gates
// (`pnpm run start:dev:gates`), cargando `.env.gates` (DATABASE_URL =
// axioma_gates_dev, PORT = 3001) en vez de `.env`. Nunca usar este comando
// para el servidor que sirve a Android (`pnpm run start:dev`, sin cambios,
// sigue leyendo `.env` = axioma_dev).
//
// `ConfigModule.forRoot({ isGlobal: true })` (app.module.ts) NO se toca --
// `dotenv` no sobreescribe variables de entorno ya presentes en el proceso,
// así que basta con inyectar DATABASE_URL/PORT aquí, en el proceso padre,
// ANTES de spawnear `nest start --watch`.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { config as loadDotenv } from 'dotenv';

const BACKEND_ROOT = join(__dirname, '..');
const ENV_GATES_PATH = join(BACKEND_ROOT, '.env.gates');

if (!existsSync(ENV_GATES_PATH)) {
  console.error(
    `\nFALLO -- no existe ${ENV_GATES_PATH}.\n` +
      'Bootstrap requerido antes de levantar el servidor de gates:\n' +
      '  1. Crear la base:   docker exec axioma-postgres-dev psql -U axioma -d axioma_dev -c "CREATE DATABASE axioma_gates_dev OWNER axioma;"\n' +
      '  2. Migrarla:        (DATABASE_URL apuntando a axioma_gates_dev) npx prisma migrate deploy\n' +
      '  3. Crear apps/backend/.env.gates -- copia de .env con DATABASE_URL apuntando a axioma_gates_dev y PORT=3001\n' +
      '(ver también scripts/run-gate.ts, misma verificación para los gates individuales)\n',
  );
  process.exit(1);
}

const parsed = loadDotenv({ path: ENV_GATES_PATH }).parsed ?? {};
const dbName = (() => {
  try {
    return new URL(parsed.DATABASE_URL ?? '').pathname.replace(/^\//, '');
  } catch {
    return null;
  }
})();

if (dbName === 'axioma_dev') {
  console.error('\nFALLO DE AISLAMIENTO -- .env.gates resuelve a axioma_dev. Revisa el archivo antes de continuar.\n');
  process.exit(1);
}

console.log(`[start-gates-server] DATABASE_URL -> base "${dbName}" | PORT -> ${parsed.PORT ?? '(no definido en .env.gates)'}`);

const child = spawn('npx', ['nest', 'start', '--watch'], {
  cwd: BACKEND_ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, ...parsed },
});

child.on('exit', (code) => process.exit(code ?? 1));
