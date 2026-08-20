#!/usr/bin/env node
/**
 * Gate consolidado -- Fase 2, Learning Experience Foundation completa.
 *
 * HOY (2026-08-20, con el Bloque VIII en curso) es un alias directo del
 * gate consolidado del bloque LEF más reciente -- cada gate de bloque ya
 * reutiliza el del bloque anterior (verify-lef-block-viii-gate.mjs invoca a
 * verify-lef-block-vii-gate.mjs, que invoca a verify-lef-block-vi-gate.mjs,
 * que invoca a verify-lef-block-v-gate.mjs, que invoca a
 * verify-lef-block-iv-gate.mjs, que a su vez invoca a
 * verify-block-iii-gate.mjs, luego verify-block-ii-gate.mjs,
 * verify-block-i-gate.mjs y este al de M1), así que el gate del bloque LEF
 * más reciente YA cubre toda la cadena acumulada hasta ahora. Este script
 * existe como un nombre estable e independiente del número de bloque
 * actual -- quien quiera validar "toda la cadena LEF" no debería tener que
 * saber cuál es el bloque más reciente.
 *
 * Actualizado al construir el gate de Bloque VIII (mismo criterio de alias
 * fino ya usado en cada bloque anterior, VII incluido, 2026-08-20): apunta
 * a verify-lef-block-viii-gate.mjs en vez de verify-lef-block-vii-gate.mjs.
 * Es DELIBERADAMENTE un alias fino, no una reimplementación, para no
 * mantener dos copias de la misma orquestación.
 *
 * IMPORTANTE -- distinto de `verify-lef-phase-2-gate.mjs`: ese archivo es
 * el gate FIJO e INMUTABLE de cierre de LEF Fase 2, congelado en el bloque
 * de cierre y que nunca vuelve a repuntarse. ESTE archivo conserva su
 * semántica histórica de alias RODANTE: seguirá avanzando hacia el bloque
 * LEF más reciente incluso después del cierre de Fase 2, si en el futuro
 * existieran más bloques LEF (p. ej. de una Fase 3).
 *
 * Uso: node scripts/verify-learning-experience-foundation-gate.mjs
 * (equivalente a `pnpm run verify:learning-experience-foundation-gate`)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const useShell = process.platform === 'win32';

console.log('=== Gate consolidado -- Learning Experience Foundation (alias del Bloque VIII, el más reciente) ===\n');

const result = spawnSync('node', ['scripts/verify-lef-block-viii-gate.mjs'], { cwd: ROOT, stdio: 'inherit', shell: useShell });
process.exit(result.status ?? 1);
