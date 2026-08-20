#!/usr/bin/env node
/**
 * Gate consolidado -- Fase 2, Learning Experience Foundation completa.
 *
 * HOY (2026-08-20, con el Bloque VII recién cerrado) es un alias directo del
 * gate consolidado del bloque más reciente de la fase -- cada gate de
 * bloque ya reutiliza el del bloque anterior (verify-lef-block-vii-gate.mjs
 * invoca a verify-lef-block-vi-gate.mjs, que invoca a
 * verify-lef-block-v-gate.mjs, que invoca a
 * verify-lef-block-iv-gate.mjs, que a su vez invoca a
 * verify-block-iii-gate.mjs, luego verify-block-ii-gate.mjs,
 * verify-block-i-gate.mjs y este al de M1), así que el gate del último
 * bloque cerrado YA cubre toda la fase acumulada hasta ahora. Este script
 * existe como un nombre estable e independiente del número de bloque
 * actual -- quien quiera validar "toda la fase" no debería tener que saber
 * cuál es el bloque más reciente.
 *
 * Actualizado al cerrar el Bloque VII (mismo criterio de alias fino ya usado
 * al cerrar el Bloque VI, 2026-08-14): apunta a
 * verify-lef-block-vii-gate.mjs en vez de verify-lef-block-vi-gate.mjs.
 * Cuando se cierre el Bloque VIII de esta fase, este archivo deberá
 * actualizarse de nuevo en su lugar (y así sucesivamente) -- es
 * DELIBERADAMENTE un alias fino, no una reimplementación, para no mantener
 * dos copias de la misma orquestación.
 *
 * Uso: node scripts/verify-learning-experience-foundation-gate.mjs
 * (equivalente a `pnpm run verify:learning-experience-foundation-gate`)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const useShell = process.platform === 'win32';

console.log('=== Gate consolidado -- Learning Experience Foundation (alias del Bloque VII, el más reciente cerrado) ===\n');

const result = spawnSync('node', ['scripts/verify-lef-block-vii-gate.mjs'], { cwd: ROOT, stdio: 'inherit', shell: useShell });
process.exit(result.status ?? 1);
