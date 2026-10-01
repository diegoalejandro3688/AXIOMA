// VC4 MICROBLOQUE 9 -- gate de presentación de preguntas de Ciencias.
// Vive separado de `verify-b8-polish-gate.ts` (dominio distinto: esto es
// PRESENTACIÓN de contenido académico, no polish de flujo/UX). Sin
// renderer/DB: prueba directamente las funciones puras exportadas por
// `content-block-renderer.tsx` contra fixtures que son transcripciones
// EXACTAS de contenido real ya existente en `apps/backend/content/estudio/
// ciencias-*` (Microbloque 9 NO editó ningún archivo de contenido -- el
// mismo texto con `|` sigue siendo la fuente; sólo cambia cómo se renderiza).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePipeRow, groupIntoSegments } from '../lib/content/table-blocks';
import type { ResourceContentBlockResponse } from '@axioma/contracts';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE_ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(MOBILE_ROOT, ...p), 'utf8');

function para(text: string, order: number): ResourceContentBlockResponse {
  return { type: 'paragraph', order, text } as ResourceContentBlockResponse;
}
function heading(text: string, order: number): ResourceContentBlockResponse {
  return { type: 'heading', order, level: 3, text } as unknown as ResourceContentBlockResponse;
}

function main() {
  console.log('--- 1/2. parsePipeRow: reconoce filas reales, rechaza texto normal ---');
  check('reconoce "| Masa | Deformación del resorte |" -> 2 celdas', JSON.stringify(parsePipeRow('| Masa | Deformación del resorte |')) === JSON.stringify(['Masa', 'Deformación del resorte']));
  check('reconoce fila de Punnett con celda vacía "|  | P | p |" -> 3 celdas, primera vacía', JSON.stringify(parsePipeRow('|  | P | p |')) === JSON.stringify(['', 'P', 'p']));
  check('trimea espacios de cada celda ("| 0,10 kg | 0,02 m |")', JSON.stringify(parsePipeRow('| 0,10 kg | 0,02 m |')) === JSON.stringify(['0,10 kg', '0,02 m']));
  check('NO reconoce prosa normal sin pipes como fila', parsePipeRow('Una estudiante colocó una caja de 5,0 kg sobre un piso horizontal.') === null);
  check('NO reconoce una fórmula con | suelto sin cerrar como fila (requiere empezar Y terminar en |)', parsePipeRow('el valor absoluto |x| es siempre positivo') === null);

  console.log('--- 3/4/5. groupIntoSegments: corridas reales de Ciencias (Física/Química/Biología) ---');
  // Física -- CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD (situación B),
  // transcripción EXACTA del archivo fuente real (no se tocó el archivo).
  const fisicaBlocks: ResourceContentBlockResponse[] = [
    heading('Un resorte y distintas masas', 0),
    para('Un grupo de estudiantes colgó distintas masas de un resorte vertical y esperó a que el sistema quedara en reposo.', 1),
    para('Usaron:', 2),
    para('g = 10 m/s²', 3),
    para('Registraron:', 4),
    para('| Masa | Deformación del resorte |', 5),
    para('| 0,10 kg | 0,02 m |', 6),
    para('| 0,20 kg | 0,04 m |', 7),
    para('| 0,30 kg | 0,06 m |', 8),
    para('| 0,40 kg | 0,08 m |', 9),
    para('Los estudiantes observaron que al aumentar la masa también aumentaba la deformación del resorte.', 10),
  ];
  const fisicaSegments = groupIntoSegments(fisicaBlocks);
  const fisicaTable = fisicaSegments.find((s) => s.kind === 'table');
  check('Física (resorte): produce exactamente 1 segmento tabla', fisicaSegments.filter((s) => s.kind === 'table').length === 1);
  check('Física (resorte): headers = ["Masa", "Deformación del resorte"]', !!fisicaTable && fisicaTable.kind === 'table' && JSON.stringify(fisicaTable.headers) === JSON.stringify(['Masa', 'Deformación del resorte']));
  check('Física (resorte): 4 filas de datos (no cuenta el header)', !!fisicaTable && fisicaTable.kind === 'table' && fisicaTable.rows.length === 4);
  check('Física (resorte): todo lo demás (heading + 3 párrafos antes + 1 después) sigue como blocks, sin alterar orden relativo', fisicaSegments.length === 3 && fisicaSegments[0].kind === 'blocks' && fisicaSegments[1].kind === 'table' && fisicaSegments[2].kind === 'blocks');
  check('Física (resorte): el párrafo final de observación se preserva textualmente sin cambios', fisicaSegments[2].kind === 'blocks' && fisicaSegments[2].blocks[0].type === 'paragraph' && (fisicaSegments[2].blocks[0] as { text: string }).text === 'Los estudiantes observaron que al aumentar la masa también aumentaba la deformación del resorte.');

  // Química -- CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.
  const quimicaBlocks: ResourceContentBlockResponse[] = [
    para('| Muestra | Masa de H₂O |', 0),
    para('| P | 18 g |', 1),
    para('| Q | 36 g |', 2),
    para('| R | 9 g |', 3),
    para('| S | 54 g |', 4),
  ];
  const quimicaSegments = groupIntoSegments(quimicaBlocks);
  check('Química (mol/masa): produce exactamente 1 segmento tabla (toda la corrida, sin párrafos alrededor)', quimicaSegments.length === 1 && quimicaSegments[0].kind === 'table');
  check('Química (mol/masa): 4 muestras (P/Q/R/S)', quimicaSegments[0].kind === 'table' && quimicaSegments[0].rows.length === 4);

  // Biología -- CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION (Punnett).
  const biologiaBlocks: ResourceContentBlockResponse[] = [para('|  | P | p |', 0), para('| P | PP | Pp |', 1), para('| p | Pp | pp |', 2)];
  const biologiaSegments = groupIntoSegments(biologiaBlocks);
  check('Biología (Punnett): produce exactamente 1 segmento tabla', biologiaSegments.length === 1 && biologiaSegments[0].kind === 'table');
  check('Biología (Punnett): header con celda vacía preservada ("", "P", "p")', biologiaSegments[0].kind === 'table' && JSON.stringify(biologiaSegments[0].headers) === JSON.stringify(['', 'P', 'p']));
  check('Biología (Punnett): 2 filas de genotipos (P/p)', biologiaSegments[0].kind === 'table' && biologiaSegments[0].rows.length === 2);

  console.log('--- 6. Fila de pipe AISLADA (1 sola) NO se convierte en tabla -- fallback seguro ---');
  const singleton: ResourceContentBlockResponse[] = [para('Cierta expresión usa el símbolo |x| para valor absoluto.', 0), para('| esto parece una fila pero está sola |', 1), para('Continúa el enunciado normal.', 2)];
  const singletonSegments = groupIntoSegments(singleton);
  check('una sola fila de pipes no forma tabla (se necesitan >=2 filas consecutivas)', singletonSegments.every((s) => s.kind !== 'table'));

  console.log('--- 7. Consistencia de columnas / sin celdas vacías accidentales en los 3 casos reales ---');
  for (const [name, seg] of [['Física', fisicaSegments.find((s) => s.kind === 'table')], ['Química', quimicaSegments[0]], ['Biología', biologiaSegments[0]]] as const) {
    if (!seg || seg.kind !== 'table') continue;
    const consistentColumns = seg.rows.every((row) => row.length === seg.headers.length);
    check(`${name}: todas las filas tienen el mismo número de columnas que el header`, consistentColumns);
    const noAccidentalEmpty = seg.rows.every((row) => row.some((cell) => cell.trim() !== ''));
    check(`${name}: ninguna fila de datos está completamente vacía`, noAccidentalEmpty);
  }

  console.log('--- 8. No queda ningún pipe "|" crudo en el texto que efectivamente se renderiza (headers/rows) ---');
  const allCells = [fisicaTable, quimicaSegments[0], biologiaSegments[0]]
    .flatMap((s) => (s && s.kind === 'table' ? [...s.headers, ...s.rows.flat()] : []));
  check('ninguna celda de las tablas reales contiene el carácter "|" (el pipe se consumió al parsear, nunca llega a UI)', allCells.every((cell) => !cell.includes('|')));

  console.log('--- 9. DataTable: componente genérico, sin dependencia externa nueva, sólo tokens del sistema ---');
  const dataTableSrc = read('components', 'ui', 'data-table.tsx');
  check('data-table.tsx sólo importa react-native + primitivas propias (Text/theme) -- ninguna librería externa nueva', /^import \{ ScrollView, View \} from 'react-native';$/m.test(dataTableSrc) && !/from '(?!react-native|\.\/text|\.\.\/\.\.\/theme)/.test(dataTableSrc));
  check('DataTable no está acoplado a @axioma/contracts/ExamTableBlock -- prop shape genérico {headers,rows,footnote?}', !/^import .*@axioma\/contracts/m.test(dataTableSrc) && /interface DataTableProps/.test(dataTableSrc));
  check('sin colores hardcodeados -- todo color viene de useThemedStyles/theme tokens (t.color.*)', !/#[0-9a-fA-F]{3,8}/.test(dataTableSrc));
  check('headers visualmente distinguibles (fila propia con backgroundColor de token, no sólo color de texto)', /headerRow:.*backgroundColor: t\.color/.test(dataTableSrc.replace(/\n/g, ' ')));
  check('tabla con overflow horizontal contenido en su propio ScrollView (nunca desplaza el resto de la pantalla)', /<ScrollView horizontal/.test(dataTableSrc));

  console.log('--- 10. Study/Quick/Ensayo comparten el mismo ContentBlockRenderer (consistencia, §18/§19) ---');
  const consumers = [
    ['app', '(tabs)', 'competir', 'quick-question.tsx'],
    ['app', '(tabs)', 'estudio', '[subjectId]', 'practica-libre.tsx'],
    ['app', '(tabs)', 'estudio', 'ensayos', '[examId]', 'attempt', '[attemptId].tsx'],
    ['app', '(tabs)', 'estudio', 'ensayos', '[examId]', 'review', '[attemptId].tsx'],
    ['app', '(tabs)', 'estudio', 'topic', '[topicId]', 'ejercicio.tsx'],
    ['app', '(tabs)', 'estudio', 'topic', '[topicId]', 'recurso.tsx'],
  ];
  let allImportShared = true;
  for (const path of consumers) {
    const src = read(...path);
    if (!src.includes('ContentBlockRenderer')) {
      console.error(`FALLO  ${path.join('/')} ya no importa ContentBlockRenderer`);
      allImportShared = false;
      failures++;
    }
  }
  check('los 6 consumidores (Quick/Práctica libre/Ensayo attempt+review/Ejercicio/Recurso) siguen usando el MISMO ContentBlockRenderer (ninguno bifurcó su propia lógica de tabla)', allImportShared);

  console.log('--- 11. Sin dependencia externa nueva declarada en package.json ---');
  const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
  check('package.json no declara ninguna librería de tablas nueva (react-native-table-*, etc.)', !Object.keys(pkg.dependencies ?? {}).some((dep) => /table/i.test(dep)));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de presentación de Ciencias (VC4 MICROBLOQUE 9) pasaron.');
}

main();
