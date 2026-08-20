#!/usr/bin/env node
/**
 * Gate consolidado -- LEF Bloque VIII (Consolidación y cierre de LEF Fase 2).
 *
 * Orquestador puro, sin reimplementar ninguna aserción propia de otro gate.
 * Encadena exactamente dos pasos:
 *
 *   1. El gate consolidado ya aprobado de LEF Bloque VII
 *      (`verify-lef-block-vii-gate.mjs`), que a su vez encadena la
 *      regresión completa LEF I-VI y, transitivamente a través de esa
 *      cadena, M1/Fase 1 (Bloques I-V pre-LEF, baseline heredado) --
 *      681/681 comprobaciones en su última corrida de cierre.
 *   2. El gate focalizado de I4 (`verify-gamification-serialization-conflict-gate.ts`):
 *      corrección de conflictos de serialización SERIALIZABLE detectados
 *      por Postgres en el COMMIT (`DriverAdapterError`/`TransactionWriteConflict`,
 *      SQLSTATE 40001) en `XpGrantService`/`LeaguePointGrantService` --
 *      resuelve DG-14 del triage transversal de deuda de I2.
 *
 * Bloque VIII no agrega alcance funcional nuevo (Decisión del Product
 * Owner, LEF Bloque VIII I1, 2026-08-20): es exclusivamente consolidación,
 * verificación y gobernanza del cierre de LEF Fase 2 (= LEF Bloques I-VII).
 * Por eso este gate no tiene "incrementos" de dominio propios más allá de
 * I4 -- I1/I2 de Bloque VIII fueron decisiones y triage documental, sin
 * superficie de código propia que gatear.
 *
 * Propaga el código de salida del primer paso que falle y se detiene ahí
 * (fail-fast, mismo criterio que todos los gates consolidados anteriores).
 *
 * Uso: node scripts/verify-lef-block-viii-gate.mjs
 * (equivalente a `pnpm run verify:lef-block-viii-gate` desde la raíz del repo)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../apps/backend', import.meta.url));
const useShell = process.platform === 'win32';

function runOnce(name, command, args, opts = {}) {
  console.log(`\n=== ${name} ===`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: useShell, ...opts });
  if (result.error || result.status !== 0) {
    const reason = result.error
      ? `no se pudo iniciar el proceso -- ${result.error.code ?? result.error.name}: ${result.error.message}`
      : result.signal
        ? `terminado por señal ${result.signal}`
        : `código de salida ${result.status}`;
    console.error(`\nGate consolidado Bloque VIII (LEF, Consolidación y cierre de Fase 2): FAIL -- ${name} (${reason})`);
    process.exit(result.status && result.status !== 0 ? result.status : 1);
  }
}

console.log('=== Gate consolidado -- LEF Bloque VIII (Consolidación y cierre de LEF Fase 2) ===');

runOnce(
  'Paso 1 -- gate consolidado LEF Bloque VII (regresión completa LEF I-VII, encadena M1 transitivamente)',
  'node',
  ['scripts/verify-lef-block-vii-gate.mjs'],
  { cwd: ROOT },
);

runOnce(
  'Paso 2 -- I4: conflictos de serialización detectados en COMMIT (gamificación, DG-14)',
  'npx',
  ['tsx', 'scripts/verify-gamification-serialization-conflict-gate.ts'],
  { cwd: BACKEND_DIR },
);

console.log('\nGate consolidado Bloque VIII (LEF, Consolidación y cierre de Fase 2): PASS\n');
process.exit(0);
