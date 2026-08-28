// CONTENT-C1A -- Ciencias / U1 "Biología", Recurso 1 (order 1 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
// Primer recurso del catálogo nuevo de Ciencias. Coexiste con el legacy
// `C1.BIOLOGIA.CELULA` (seed) sin tocarlo -- mismo patrón que H1.*/L1.*.
//
// Answer keys: R1 -- B D A C B A D C B A.
// La tabla editorial de la Situación A se representa como filas de párrafo
// con delimitador "|" (el schema no tiene tipo `table`) -- FORMAT_ONLY, sin
// pérdida de headers, filas, valores, orden ni "Sí"/"No".
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const situacionA: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación A — Tres muestras observadas al microscopio' },
  { type: 'paragraph', text: 'Un grupo de estudiantes observó tres muestras celulares y registró algunas características.' },
  { type: 'paragraph', text: '| Característica | Muestra 1 | Muestra 2 | Muestra 3 |' },
  { type: 'paragraph', text: '| Membrana plasmática | Sí | Sí | Sí |' },
  { type: 'paragraph', text: '| Material genético | Sí | Sí | Sí |' },
  { type: 'paragraph', text: '| Núcleo delimitado | No | Sí | Sí |' },
  { type: 'paragraph', text: '| Pared celular | Sí | No | Sí |' },
  { type: 'paragraph', text: '| Cloroplastos | No | No | Sí |' },
  { type: 'paragraph', text: 'Los estudiantes sabían que las muestras correspondían a una bacteria, una célula animal y una célula vegetal.' },
  { type: 'paragraph', text: 'A partir de las observaciones intentaron determinar cuál era cada una.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — ¿Todas las células de un organismo son iguales?' },
  { type: 'paragraph', text: 'Una investigadora observó muestras obtenidas de diferentes tejidos de un mismo organismo multicelular.' },
  {
    type: 'paragraph',
    text: 'Encontró células alargadas capaces de contraerse, células con prolongaciones que permitían transmitir señales y otras especializadas en formar una superficie protectora.',
  },
  {
    type: 'paragraph',
    text: 'Todas contenían el mismo tipo general de material genético y compartían varias estructuras celulares fundamentales.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, presentaban diferencias claras en su forma y en la abundancia de ciertas estructuras internas.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora propuso que estas diferencias estaban relacionadas con las funciones que cada tipo celular realizaba dentro del organismo.',
  },
  {
    type: 'paragraph',
    text: 'Para evaluar su explicación comparó características celulares con mediciones de las funciones desarrolladas por cada tejido.',
  },
  {
    type: 'paragraph',
    text: 'Los resultados mostraron asociaciones consistentes entre determinadas características estructurales y funciones específicas.',
  },
];

const organizacionCelularTiposCelulas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 1,
  title: 'Organización celular y tipos de células',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar los principios básicos de la organización celular, reconociendo a la célula como unidad estructural y funcional de los seres vivos, comparando células procariontes y eucariontes, animales y vegetales, y relacionando características celulares con las funciones que desarrollan.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Organización celular y tipos de células' },

    { type: 'heading', level: 2, text: '1. La célula como unidad de la vida' },
    {
      type: 'paragraph',
      text: 'Todos los seres vivos están constituidos por una o más células. La célula corresponde a la unidad básica en la que pueden desarrollarse procesos necesarios para la vida, como: intercambio de sustancias, transformación de energía, crecimiento, reproducción y respuesta al ambiente. Algunos organismos poseen una sola célula y otros están formados por enormes cantidades de células especializadas.',
    },

    { type: 'heading', level: 2, text: '2. Principios de la teoría celular' },
    {
      type: 'paragraph',
      text: 'La teoría celular establece ideas fundamentales: todos los organismos están formados por células; la célula es la unidad básica de estructura y funcionamiento de los seres vivos; las células se originan a partir de otras células preexistentes. La teoría celular se construyó mediante observaciones y evidencia acumulada, no a partir de una única experiencia.',
    },

    { type: 'heading', level: 2, text: '3. Elementos comunes a las células' },
    {
      type: 'paragraph',
      text: 'Aunque existen grandes diferencias entre tipos celulares, todas las células poseen estructuras básicas. Entre ellas: membrana plasmática, material genético, citoplasma y ribosomas. Estas estructuras permiten delimitar la célula, almacenar información y producir moléculas necesarias para su funcionamiento.',
    },

    { type: 'heading', level: 2, text: '4. Células procariontes' },
    {
      type: 'paragraph',
      text: 'Las células procariontes poseen una organización relativamente simple. Características generales: no presentan un núcleo delimitado por membrana; su ADN se encuentra en una región del citoplasma; poseen ribosomas; presentan membrana plasmática; normalmente presentan pared celular; no poseen los organelos membranosos característicos de las células eucariontes. Las bacterias son organismos procariontes.',
    },

    { type: 'heading', level: 2, text: '5. Células eucariontes' },
    {
      type: 'paragraph',
      text: 'Las células eucariontes presentan compartimentos internos rodeados por membranas. Entre sus características: poseen núcleo; el ADN se encuentra principalmente dentro del núcleo; contienen diversos organelos; presentan mayor compartimentalización interna. Animales, plantas, hongos y protistas están formados por células eucariontes.',
    },

    { type: 'heading', level: 2, text: '6. Células animales y vegetales' },
    {
      type: 'paragraph',
      text: 'Las células animales y vegetales son eucariontes y comparten muchas estructuras. Ambas poseen: membrana plasmática, núcleo, mitocondrias, ribosomas y otros organelos. Pero también presentan diferencias importantes. Las células vegetales poseen, entre otras estructuras: pared celular, cloroplastos en células fotosintéticas y una gran vacuola central característica.',
    },

    { type: 'heading', level: 2, text: '7. Estructura y función' },
    {
      type: 'paragraph',
      text: 'Las características de una célula se relacionan con las funciones que realiza. Por ejemplo, diferentes células pueden variar en: forma, tamaño, cantidad de determinados organelos y organización interna. Esto permite la especialización celular en organismos multicelulares.',
    },

    { type: 'heading', level: 2, text: '8. Organismos unicelulares y multicelulares' },
    {
      type: 'paragraph',
      text: 'Un organismo unicelular realiza todas sus funciones mediante una sola célula. En los organismos multicelulares existen células especializadas que cooperan. Esto permite formar: tejidos, órganos y sistemas. La especialización aumenta la división de funciones dentro del organismo.',
    },

    { type: 'heading', level: 2, text: '9. Observar células' },
    {
      type: 'paragraph',
      text: 'Muchas células son demasiado pequeñas para observarse directamente a simple vista. El desarrollo del microscopio permitió: observar células, comparar estructuras, identificar diferencias, generar nuevas preguntas y reunir evidencia para desarrollar modelos biológicos. Las observaciones científicas dependen también de los instrumentos disponibles.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre organización celular: identifica las estructuras descritas; determina si corresponde a una célula procarionte o eucarionte; no asumas que todas las células poseen los mismos organelos; relaciona estructura con función; diferencia observación de interpretación; compara usando características concretas; utiliza la evidencia entregada antes que la memoria aislada.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué característica permite identificar directamente a la Muestra 1 como procarionte?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Poseer membrana plasmática.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No presentar un núcleo delimitado por membrana.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Contener material genético.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Poseer citoplasma.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ausencia de un núcleo delimitado es una característica fundamental que diferencia a las células procariontes de las eucariontes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál muestra corresponde a una célula vegetal?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo la Muestra 1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo la Muestra 2.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las muestras 1 y 2.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Muestra 3.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La combinación de núcleo, pared celular y cloroplastos permite identificar a la Muestra 3 como una célula vegetal fotosintética.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué evidencia permite concluir que las muestras 2 y 3 son eucariontes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ambas presentan un núcleo delimitado.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ambas tienen pared celular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambas poseen cloroplastos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguna contiene material genético.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La presencia de un núcleo rodeado por membrana caracteriza a las células eucariontes.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por la tabla?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo las células vegetales poseen material genético.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las células animales no poseen membrana plasmática.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las tres células comparten algunas estructuras básicas a pesar de pertenecer a tipos diferentes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todas las células poseen núcleo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las tres muestras presentan membrana plasmática y material genético, mostrando que distintos tipos celulares comparten características fundamentales.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si los estudiantes observaran una cuarta célula con membrana plasmática, núcleo y sin pared celular ni cloroplastos, ¿cuál inferencia estaría mejor sustentada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Debe ser necesariamente una bacteria.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sus características son compatibles con una célula animal eucarionte.' }, correct: true },
        {
          content: { type: 'paragraph', order: 0, text: 'Es necesariamente una célula vegetal que perdió todo su material genético.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'No puede pertenecer a ningún organismo vivo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una célula con núcleo pero sin pared celular ni cloroplastos presenta características compatibles con una célula animal, aunque una identificación completa requeriría más evidencia.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué concepto explica principalmente las diferencias entre las células descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Especialización celular.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ausencia de material genético.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transformación de células eucariontes en procariontes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminación de todas las estructuras comunes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En organismos multicelulares, diferentes células pueden especializarse para realizar funciones particulares.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué observación apoya la idea de que todas las células pertenecen al mismo organismo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas poseen exactamente la misma forma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas realizan la misma función.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguna presenta estructuras internas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparten características celulares fundamentales y el mismo tipo general de material genético.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las células pueden diferenciarse en estructura y función mientras mantienen características básicas y la información genética propia del organismo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál fue la hipótesis principal propuesta por la investigadora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La forma celular nunca se relaciona con la función.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas las células deben ser estructuralmente idénticas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las diferencias estructurales entre células están relacionadas con las funciones que desempeñan.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las células especializadas carecen de material genético.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La investigadora propone una relación entre las características estructurales observadas y las funciones realizadas por cada tipo celular.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué acción permitió evaluar mejor la hipótesis?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Observar una sola célula y asumir que representaba a todas.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar las características estructurales con mediciones de las funciones de diferentes tejidos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Ignorar las diferencias entre células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Clasificar las células únicamente por su tamaño.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Relacionar sistemáticamente estructura y función permite generar evidencia para evaluar la explicación propuesta.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión está mejor respaldada por los resultados?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La especialización permite que células de un mismo organismo compartan características básicas y, al mismo tiempo, desarrollen estructuras relacionadas con funciones diferentes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una célula cambia de organismo cuando modifica su forma.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las diferencias funcionales demuestran que las células no poseen características comunes.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todas las células multicelulares deben realizar cada función del organismo de manera independiente.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La especialización celular permite una división de funciones: las células conservan características fundamentales mientras desarrollan propiedades estructurales asociadas a tareas particulares.',
        },
      ],
    },
  ],
};

export default organizacionCelularTiposCelulas;
