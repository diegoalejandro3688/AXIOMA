#!/usr/bin/env node
/**
 * Gate consolidado -- Fase 2, Learning Experience Foundation completa.
 *
 * HOY (2026-08-03, con el Bloque II recién cerrado) es un alias directo del
 * gate consolidado del bloque más reciente de la fase -- cada gate de
 * bloque ya reutiliza el del bloque anterior (verify-block-ii-gate.mjs
 * invoca a verify-block-i-gate.mjs, que a su vez invoca al de M1), así que
 * el gate del último bloque cerrado YA cubre toda la fase acumulada hasta
 * ahora. Este script existe como un nombre estable e independiente del
 * número de bloque actual -- quien quiera validar "toda la fase" no debería
 * tener que saber cuál es el bloque más reciente.
 *
 * Cuando se cierre el Bloque III, este archivo deberá actualizarse para
 * invocar `verify-block-iii-gate.mjs` en su lugar (y así sucesivamente) --
 * es DELIBERADAMENTE un alias fino, no una reimplementación, para no
 * mantener dos copias de la misma orquestación.
 *
 * Uso: node scripts/verify-learning-experience-foundation-gate.mjs
 * (equivalente a `pnpm run verify:learning-experience-foundation-gate`)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const useShell = process.platform === 'win32';

console.log('=== Gate consolidado -- Learning Experience Foundation (alias del Bloque II, el más reciente cerrado) ===\n');

const result = spawnSync('node', ['scripts/verify-block-ii-gate.mjs'], { cwd: ROOT, stdio: 'inherit', shell: useShell });
process.exit(result.status ?? 1);
