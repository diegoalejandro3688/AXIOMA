#!/usr/bin/env node
/**
 * Gate consolidado -- Fase 2, Learning Experience Foundation completa.
 *
 * HOY (2026-08-05, con el Bloque III recién cerrado) es un alias directo del
 * gate consolidado del bloque más reciente de la fase -- cada gate de
 * bloque ya reutiliza el del bloque anterior (verify-block-iii-gate.mjs
 * invoca a verify-block-ii-gate.mjs, que a su vez invoca a verify-block-i-gate.mjs
 * y este al de M1), así que el gate del último bloque cerrado YA cubre toda
 * la fase acumulada hasta ahora. Este script existe como un nombre estable
 * e independiente del número de bloque actual -- quien quiera validar "toda
 * la fase" no debería tener que saber cuál es el bloque más reciente.
 *
 * Cuando se cierre el Bloque IV (Competir), este archivo deberá
 * actualizarse para invocar `verify-block-iv-gate.mjs` en su lugar (y así
 * sucesivamente) -- es DELIBERADAMENTE un alias fino, no una
 * reimplementación, para no mantener dos copias de la misma orquestación.
 *
 * Uso: node scripts/verify-learning-experience-foundation-gate.mjs
 * (equivalente a `pnpm run verify:learning-experience-foundation-gate`)
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const useShell = process.platform === 'win32';

console.log('=== Gate consolidado -- Learning Experience Foundation (alias del Bloque III, el más reciente cerrado) ===\n');

const result = spawnSync('node', ['scripts/verify-block-iii-gate.mjs'], { cwd: ROOT, stdio: 'inherit', shell: useShell });
process.exit(result.status ?? 1);
