// Gate de "motivo de Unidad" (Estudio A0) -- verifica el CONTRATO del
// resolver `resolveUnitMotif(code)` tras extraerlo de
// `app/(tabs)/estudio/[subjectId]/unidades.tsx` a
// `lib/academic/unit-motif.ts` (fuente única, canónica).
//
// A0 es un refactor de ZERO VISUAL CHANGE: este gate congela la resolución
// EXACTA de los 17 unit codes de catálogo V1 (M1/M2/Lenguaje/Ciencias/
// Historia) tal como se comportaba ANTES del refactor, de modo que A1
// (iconografía nueva) no pueda alterar M1/M2 sin que el gate lo note.
//
// Node puro -- `lib/academic/unit-motif-map.ts` NO importa `react-native-svg`
// (el componente vive aparte en `unit-motif.tsx`), así que se importa
// directamente, sin stubs ni monkeypatch de `_resolveFilename`.
import { resolveUnitMotif, type UnitMotifKind } from '../lib/academic/unit-motif-map';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}

// --- Contrato congelado: los 17 unit codes de catálogo V1 (manifest real) ---
const EXPECTED: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  // Matemática M1 -- APPROVED, referencia visual. Motivo propio por área.
  ['M1.NUMEROS', 'percentage'],
  ['M1.ALGEBRA_FUNCIONES', 'algebra'],
  ['M1.GEOMETRIA', 'geometry'],
  ['M1.PROBABILIDAD_ESTADISTICA', 'data'],
  // Matemática M2 -- HOY reutiliza los motivos de M1 (incl. `NUMEROS ->
  // percentage`, semánticamente flojo). A0 lo CONGELA tal cual; A1 decidirá.
  ['M2.NUMEROS', 'percentage'],
  ['M2.ALGEBRA_FUNCIONES', 'algebra'],
  ['M2.GEOMETRIA', 'geometry'],
  ['M2.PROBABILIDAD_ESTADISTICA', 'data'],
  // Lenguaje -- sin área mapeada -> generic (fallback).
  ['LENGUAJE.LOCALIZAR', 'generic'],
  ['LENGUAJE.INTERPRETAR', 'generic'],
  ['LENGUAJE.EVALUAR', 'generic'],
  // Ciencias -- sin área mapeada -> generic (fallback).
  ['CIENCIAS.BIOLOGIA', 'generic'],
  ['CIENCIAS.FISICA', 'generic'],
  ['CIENCIAS.QUIMICA', 'generic'],
  // Historia -- sin área mapeada -> generic (fallback).
  ['HISTORIA.MUNDO_AMERICA_CHILE', 'generic'],
  ['HISTORIA.FORMACION_CIUDADANA', 'generic'],
  ['HISTORIA.SISTEMA_ECONOMICO', 'generic'],
];

console.log('--- Resolución de los 17 unit codes de catálogo V1 (contrato A0) ---');
for (const [code, expected] of EXPECTED) {
  check(`${code} -> ${expected}`, resolveUnitMotif(code) === expected);
}

console.log('--- Propiedades estructurales del resolver ---');
// Case-insensitive (el resolver hace `.toUpperCase()`).
check('minúsculas resuelven igual (m1.numeros)', resolveUnitMotif('m1.numeros') === 'percentage');
// Segmentación por `.`, `-` y `_` indistintamente.
check('separadores . - _ equivalentes', resolveUnitMotif('M1-NUMEROS') === 'percentage' && resolveUnitMotif('M1_NUMEROS') === 'percentage');
// Orden de resolución: primer segmento reconocido gana.
check('primer segmento reconocido gana (GEOMETRIA antes que NUMEROS)', resolveUnitMotif('X.GEOMETRIA.NUMEROS') === 'geometry');
// Código con sub-tema (nivel recurso) sigue resolviendo por el área.
check('code de recurso (3 segmentos) resuelve por área', resolveUnitMotif('M1.NUMEROS.PORCENTAJES') === 'percentage');
// Fallback: código sin ningún segmento de área conocido -> generic.
check('code sin área conocida -> generic', resolveUnitMotif('FUTURA.MATERIA.SIN_AREA') === 'generic');
check('code vacío -> generic', resolveUnitMotif('') === 'generic');
// Alias de segmento del mapa original (deben seguir existiendo).
check('PORCENTAJES -> percentage', resolveUnitMotif('X.PORCENTAJES') === 'percentage');
check('FUNCIONES -> algebra', resolveUnitMotif('X.FUNCIONES') === 'algebra');
check('DATOS -> data', resolveUnitMotif('X.DATOS') === 'data');
check('ESTADISTICA -> data', resolveUnitMotif('X.ESTADISTICA') === 'data');

if (failures > 0) {
  console.error(`\nGate de motivo de Unidad: ${failures} verificación(es) fallaron.`);
  process.exit(1);
}
console.log('\nGate de motivo de Unidad (Estudio A0): todas las verificaciones pasaron.');
