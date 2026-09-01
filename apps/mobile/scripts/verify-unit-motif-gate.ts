// Gate de "motivo de Unidad" (Estudio A1) -- congela el CONTRATO del resolver
// `resolveUnitMotif(code)` de `lib/academic/unit-motif-map.ts`.
//
// A1 introdujo iconografía propia para las 13 unidades que en A0 caían en
// `generic` (M2 x4, Lenguaje x3, Ciencias x3, Historia x3) y migró el
// resolver de matching AMBIGUO por segmentos de palabra a un mapa EXPLÍCITO
// por unit code canónico. Este gate protege ese contrato: cada unidad V1
// tiene motivo propio, M1 no cambió, y no hay vuelta al matching por palabra.
//
// Node puro -- `unit-motif-map.ts` NO importa `react-native-svg`, se importa
// directo sin stubs. NO se renderiza SVG (sin infraestructura frágil).
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

// --- Catálogo V1 autoritativo: 17 unit codes -> motivo esperado (contrato A1) ---
const M1: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  ['M1.NUMEROS', 'percentage'],
  ['M1.ALGEBRA_FUNCIONES', 'algebra'],
  ['M1.GEOMETRIA', 'geometry'],
  ['M1.PROBABILIDAD_ESTADISTICA', 'data'],
];
const M2: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  ['M2.NUMEROS', 'realNumbers'],
  ['M2.ALGEBRA_FUNCIONES', 'functionTransform'],
  ['M2.GEOMETRIA', 'vectorGeometry'],
  ['M2.PROBABILIDAD_ESTADISTICA', 'distribution'],
];
const LENGUAJE: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  ['LENGUAJE.LOCALIZAR', 'locate'],
  ['LENGUAJE.INTERPRETAR', 'interpret'],
  ['LENGUAJE.EVALUAR', 'evaluate'],
];
const CIENCIAS: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  ['CIENCIAS.BIOLOGIA', 'cell'],
  ['CIENCIAS.FISICA', 'wave'],
  ['CIENCIAS.QUIMICA', 'molecule'],
];
const HISTORIA: ReadonlyArray<readonly [string, UnitMotifKind]> = [
  ['HISTORIA.MUNDO_AMERICA_CHILE', 'globe'],
  ['HISTORIA.FORMACION_CIUDADANA', 'citizenship'],
  ['HISTORIA.SISTEMA_ECONOMICO', 'exchange'],
];
const ALL_V1 = [...M1, ...M2, ...LENGUAJE, ...CIENCIAS, ...HISTORIA];

console.log('--- 1. Resolución exacta de los 17 unit codes de catálogo V1 ---');
for (const [code, expected] of ALL_V1) {
  check(`${code} -> ${expected}`, resolveUnitMotif(code) === expected);
}

console.log('--- 2. Ninguna unidad V1 usa el fallback `generic` ---');
for (const [code] of ALL_V1) {
  check(`${code} != generic`, resolveUnitMotif(code) !== 'generic');
}

console.log('--- 3. Matemática M1 conserva EXACTAMENTE sus 4 motivos APPROVED ---');
check('M1.NUMEROS === percentage', resolveUnitMotif('M1.NUMEROS') === 'percentage');
check('M1.ALGEBRA_FUNCIONES === algebra', resolveUnitMotif('M1.ALGEBRA_FUNCIONES') === 'algebra');
check('M1.GEOMETRIA === geometry', resolveUnitMotif('M1.GEOMETRIA') === 'geometry');
check('M1.PROBABILIDAD_ESTADISTICA === data', resolveUnitMotif('M1.PROBABILIDAD_ESTADISTICA') === 'data');

console.log('--- 4. M2 tiene 4 motivos propios, distintos del M1 correspondiente ---');
for (let i = 0; i < 4; i += 1) {
  const m1Kind = M1[i][1];
  const [m2Code, m2Kind] = M2[i];
  check(`${m2Code} (${m2Kind}) != M1 (${m1Kind})`, resolveUnitMotif(m2Code) !== m1Kind);
}
check('los 4 motivos de M2 son distintos entre sí', new Set(M2.map(([, k]) => k)).size === 4);

console.log('--- 5-7. Lenguaje / Ciencias / Historia: 3 motivos propios cada una ---');
check('Lenguaje: 3 motivos distintos', new Set(LENGUAJE.map(([, k]) => k)).size === 3);
check('Ciencias: 3 motivos distintos', new Set(CIENCIAS.map(([, k]) => k)).size === 3);
check('Historia: 3 motivos distintos', new Set(HISTORIA.map(([, k]) => k)).size === 3);

console.log('--- 8. Los 17 motivos V1 son todos únicos (una identidad por unidad) ---');
check('17 unit codes -> 17 motivos distintos', new Set(ALL_V1.map(([, k]) => k)).size === 17);

console.log('--- 9. unknown / vacío -> generic ---');
check('code fuera del catálogo -> generic', resolveUnitMotif('FUTURA.MATERIA.NUEVA_UNIDAD') === 'generic');
check('code vacío -> generic', resolveUnitMotif('') === 'generic');
check('materia sin unidad conocida -> generic', resolveUnitMotif('LENGUAJE.REDACTAR') === 'generic');

console.log('--- 10. case-insensitive (propiedad conservada de A0) ---');
check('m2.numeros -> realNumbers', resolveUnitMotif('m2.numeros') === 'realNumbers');
check('Ciencias.Biologia -> cell', resolveUnitMotif('Ciencias.Biologia') === 'cell');

console.log('--- 11. Descendientes: un Recurso hereda el motivo de su Unidad por prefijo ---');
check('M1.NUMEROS.PORCENTAJES -> percentage (hereda de M1.NUMEROS)', resolveUnitMotif('M1.NUMEROS.PORCENTAJES') === 'percentage');
check('M2.NUMEROS.NUMEROS_REALES_LOGARITMOS -> realNumbers', resolveUnitMotif('M2.NUMEROS.NUMEROS_REALES_LOGARITMOS') === 'realNumbers');
check('CIENCIAS.BIOLOGIA.CELULA -> cell', resolveUnitMotif('CIENCIAS.BIOLOGIA.CELULA') === 'cell');
check('herencia por prefijo canónico, no por segmento libre (M2.GEOMETRIA.X hereda vectorGeometry, no geometry)', resolveUnitMotif('M2.GEOMETRIA.HOMOTECIA') === 'vectorGeometry');

console.log('--- 12. NO hay matching ambiguo por palabra suelta ---');
check('X.NUMEROS (materia inventada) -> generic, NO percentage/realNumbers', resolveUnitMotif('X.NUMEROS') === 'generic');
check('OTRA.GEOMETRIA -> generic', resolveUnitMotif('OTRA.GEOMETRIA') === 'generic');
check('ALGO.PROBABILIDAD.ESTADISTICA -> generic', resolveUnitMotif('ALGO.PROBABILIDAD.ESTADISTICA') === 'generic');
check('segmento suelto NUMEROS -> generic', resolveUnitMotif('NUMEROS') === 'generic');

if (failures > 0) {
  console.error(`\nGate de motivo de Unidad (A1): ${failures} verificación(es) fallaron.`);
  process.exit(1);
}
console.log('\nGate de motivo de Unidad (Estudio A1): todas las verificaciones pasaron.');
