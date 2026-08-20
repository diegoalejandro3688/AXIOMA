#!/usr/bin/env node
/**
 * Gate FIJO e INMUTABLE de cierre -- LEF Fase 2.
 *
 * A diferencia de `verify-learning-experience-foundation-gate.mjs` (alias
 * RODANTE: se repunta en cada cierre de bloque hacia el gate consolidado
 * del bloque LEF más reciente), este archivo queda asociado PERMANENTEMENTE
 * al estado final de cierre de LEF Fase 2 y NO debe repuntarse en fases
 * futuras -- una eventual Fase 3+ tendrá su propio gate fijo, análogo a
 * este, nunca reutilizará este archivo ni su nombre.
 *
 * Alcance de "LEF Fase 2" (Decisión del Product Owner, LEF Bloque VIII,
 * I1, 2026-08-20):
 *   - Comprende funcionalmente LEF Bloque I a LEF Bloque VII.
 *   - LEF Bloque VIII es su bloque TERMINAL de consolidación,
 *     verificación, gobernanza y cierre -- no agrega alcance funcional
 *     propio a la fase.
 *   - M1/Fase 1 (Bloques I-V del roadmap pre-LEF/Vertical Slice) es
 *     baseline/prerrequisito HEREDADO: participa transitivamente porque la
 *     cadena de gates lo alcanza, pero NO es parte del alcance funcional
 *     contractual de LEF Fase 2 y no debe reabrirse por este cierre.
 *
 * Ejecuta DIRECTAMENTE `verify-lef-block-viii-gate.mjs` -- deliberadamente
 * NO pasa por `verify-learning-experience-foundation-gate.mjs`. Son dos
 * artefactos distintos con propósitos distintos: aquel es rodante (apunta
 * siempre al bloque LEF más reciente, cualquiera que sea en el futuro),
 * este es fijo (apunta para siempre al cierre de LEF Fase 2, aunque en el
 * futuro existan más bloques LEF de una fase distinta).
 *
 * Uso: node scripts/verify-lef-phase-2-gate.mjs
 * (equivalente a `pnpm run verify:lef-phase-2-gate` desde la raíz del repo)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const useShell = process.platform === 'win32';

console.log('=== Gate FIJO -- LEF Fase 2 (LEF Bloques I-VII + consolidación/cierre de Bloque VIII) ===\n');

const result = spawnSync('node', ['scripts/verify-lef-block-viii-gate.mjs'], { cwd: ROOT, stdio: 'inherit', shell: useShell });
process.exit(result.status ?? 1);
