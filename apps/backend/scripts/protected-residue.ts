// Residuo protegido del working tree -- infraestructura de gates, NO producto.
//
// Estos paths bajo `apps/mobile/` son cambios preexistentes, sancionados por el
// operador, que NO pertenecen a ningún incremento editorial y que TODOS los
// FINAL GATE han preservado byte a byte. Un gate editorial que exige
// "`apps/mobile` sin ningún cambio" NO debe volverse rojo por este residuo,
// pero SÍ debe seguir detectando cualquier cambio mobile nuevo -- trackeado o
// sin seguimiento -- que no esté en esta lista exacta.
//
// La lista es un CONJUNTO EXACTO. Añadir un path aquí es una decisión explícita.

import { spawnSync } from 'node:child_process';

/**
 * Paths (relativos a la raíz del repo) del residuo mobile sancionado, tal y
 * como los reporta `git status --porcelain -- apps/mobile`:
 *   - 7 archivos trackeados modificados/borrados (branding + iconos Android +
 *     onboarding + app.json), y
 *   - 2 entradas sin seguimiento (`.env-test-output/` como directorio colapsado,
 *     y el wordmark de auth).
 * Ver `docs/adr/LEF-BLOCK-VII-*` y el historial de FINAL GATE para el contexto.
 */
export const SANCTIONED_MOBILE_RESIDUE: readonly string[] = [
  'apps/mobile/app.json',
  'apps/mobile/app/onboarding.tsx',
  'apps/mobile/assets/android-icon-background.png',
  'apps/mobile/assets/android-icon-foreground.png',
  'apps/mobile/assets/android-icon-monochrome.png',
  'apps/mobile/assets/icon.png',
  'apps/mobile/components/auth/auth-brand-header.tsx',
  'apps/mobile/.env-test-output/',
  'apps/mobile/components/auth/zetrynd-wordmark.tsx',
] as const;

/** Prefijos de directorio sancionados (una entrada `??` colapsada cubre todo su subárbol). */
const SANCTIONED_DIR_PREFIXES: readonly string[] = SANCTIONED_MOBILE_RESIDUE.filter((p) => p.endsWith('/'));

function isSanctioned(path: string): boolean {
  if (SANCTIONED_MOBILE_RESIDUE.includes(path)) return true;
  return SANCTIONED_DIR_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export interface MobileResidueVerdict {
  /** `true` si el árbol mobile SOLO contiene residuo sancionado (o está limpio). */
  clean: boolean;
  /** Líneas crudas de `git status --porcelain` que NO corresponden a residuo sancionado. */
  offenders: string[];
  /** Salida completa de `git status --porcelain -- apps/mobile` (para diagnóstico). */
  raw: string;
}

/**
 * Verifica que `apps/mobile` no tenga NINGÚN cambio fuera del residuo protegido
 * sancionado -- ni trackeado ni sin seguimiento. Un árbol mobile totalmente
 * limpio también es válido. Cualquier otra cosa (un nuevo `.tsx`, un asset
 * modificado que no esté en la lista, un directorio sin seguimiento nuevo)
 * cuenta como violación.
 *
 * Usa `git status --porcelain` porque, a diferencia de `git diff HEAD`, incluye
 * en una sola pasada los cambios trackeados Y los archivos sin seguimiento.
 */
export function verifyMobileTreeOnlySanctionedResidue(repoRoot: string): MobileResidueVerdict {
  const res = spawnSync('git', ['status', '--porcelain', '--', 'apps/mobile'], {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const raw = (res.stdout ?? '').replace(/\r\n/g, '\n');
  if (res.status !== 0) {
    return { clean: false, offenders: [`git status salió con código ${res.status}: ${(res.stderr ?? '').trim()}`], raw };
  }
  const offenders: string[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    // Formato porcelain v1: 2 chars de estado, 1 espacio, luego el path.
    // Un rename se reporta como `R  old -> new`; tomamos el destino.
    let path = line.slice(3).trim();
    const arrow = path.indexOf(' -> ');
    if (arrow !== -1) path = path.slice(arrow + 4);
    path = path.replace(/^"(.*)"$/, '$1'); // git cita paths con caracteres especiales
    if (!isSanctioned(path)) offenders.push(line);
  }
  return { clean: offenders.length === 0, offenders, raw };
}
