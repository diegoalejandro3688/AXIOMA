// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 6 (order 6 en U2).
// Cierra el bloque PHYSICS-C1A (Ciencias U2 Física R13-R18).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R18 -- B D A C B A C D B A.
// Dos tablas editoriales (Situación A "Posición / Área de contacto" y
// Situación B "Profundidad / Aumento de presión") representadas como filas
// de párrafo con "|" -- FORMAT_ONLY. Se preservan EXACTAMENTE la unidad Pa,
// N/m², y la relación Δp = ρgh (símbolos Δ y ρ Unicode).
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
  { type: 'heading', level: 3, text: 'El mismo bloque apoyado de distintas maneras' },
  { type: 'paragraph', text: 'Un grupo de estudiantes utilizó un bloque rectangular cuyo peso era 120 N.' },
  { type: 'paragraph', text: 'Lo apoyaron sobre una superficie horizontal usando tres caras diferentes.' },
  { type: 'paragraph', text: '| Posición | Área de contacto |' },
  { type: 'paragraph', text: '| P | 0,060 m² |' },
  { type: 'paragraph', text: '| Q | 0,030 m² |' },
  { type: 'paragraph', text: '| R | 0,015 m² |' },
  { type: 'paragraph', text: 'En los tres ensayos el peso del bloque permaneció igual.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Presión en un líquido' },
  { type: 'paragraph', text: 'Un equipo llenó un recipiente con un mismo líquido y colocó sensores de presión a distintas profundidades.' },
  { type: 'paragraph', text: 'Los sensores registraron el aumento de presión asociado a la columna de líquido respecto de la superficie.' },
  { type: 'paragraph', text: '| Profundidad | Aumento de presión |' },
  { type: 'paragraph', text: '| 0,10 m | 1 000 Pa |' },
  { type: 'paragraph', text: '| 0,20 m | 2 000 Pa |' },
  { type: 'paragraph', text: '| 0,30 m | 3 000 Pa |' },
  { type: 'paragraph', text: '| 0,40 m | 4 000 Pa |' },
  {
    type: 'paragraph',
    text: 'Después colocaron dos sensores adicionales a la misma profundidad de 0,30 m, pero en lados distintos del recipiente. Ambos registraron el mismo aumento de presión.',
  },
];

const presionSolidosLiquidosGases: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 6,
  title: 'Presión en sólidos, líquidos y gases',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la presión como relación entre fuerza y área, analizar su comportamiento en sólidos, líquidos y gases, e interpretar situaciones experimentales relacionadas con profundidad, transmisión de presión y cambios en las condiciones de un fluido.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Presión en sólidos, líquidos y gases' },

    { type: 'heading', level: 2, text: '1. ¿Qué es la presión?' },
    {
      type: 'paragraph',
      text: 'La presión describe cómo se distribuye una fuerza sobre una determinada área. Para una fuerza perpendicular a una superficie puede expresarse como: p = F/A donde: p es la presión; F es la magnitud de la fuerza; A es el área sobre la cual actúa. Su unidad en el Sistema Internacional es el pascal: Pa y: 1 Pa = 1 N/m².',
    },

    { type: 'heading', level: 2, text: '2. Fuerza y presión no son lo mismo' },
    {
      type: 'paragraph',
      text: 'Dos situaciones pueden involucrar la misma fuerza y producir presiones diferentes. Si la misma fuerza actúa sobre: un área menor, la presión es mayor; un área mayor, la presión es menor. Por eso, conocer solo la fuerza no basta para determinar la presión.',
    },

    { type: 'heading', level: 2, text: '3. Presión en sólidos' },
    {
      type: 'paragraph',
      text: 'Cuando un objeto se apoya sobre una superficie, puede ejercer presión sobre ella. Por ejemplo, un mismo objeto puede ejercer distinta presión dependiendo de qué cara esté apoyada. Si su peso no cambia pero el área de contacto disminuye: la presión aumenta.',
    },

    { type: 'heading', level: 2, text: '4. Aplicaciones del área de contacto' },
    {
      type: 'paragraph',
      text: 'Modificar el área permite controlar la presión. Por ejemplo: una punta fina puede producir gran presión sobre un área pequeña; una base ancha distribuye la fuerza sobre un área mayor; ciertos vehículos utilizan superficies amplias para reducir la presión sobre terrenos blandos. La fuerza total puede mantenerse igual mientras cambia la presión.',
    },

    { type: 'heading', level: 2, text: '5. Presión en líquidos' },
    {
      type: 'paragraph',
      text: 'Los líquidos ejercen presión sobre las superficies que están en contacto con ellos. En un líquido en reposo, la presión aumenta con la profundidad. De forma simplificada: Δp = ρgh donde: ρ es la densidad del líquido; g es la aceleración de gravedad; h es la profundidad considerada.',
    },

    { type: 'heading', level: 2, text: '6. Profundidad' },
    {
      type: 'paragraph',
      text: 'Si se consideran puntos dentro del mismo líquido y bajo las mismas condiciones: un punto más profundo presenta mayor presión; puntos ubicados a la misma profundidad presentan la misma presión asociada a la columna de líquido, aunque estén en posiciones horizontales distintas. La forma del recipiente no determina por sí sola esa presión.',
    },

    { type: 'heading', level: 2, text: '7. Densidad del líquido' },
    {
      type: 'paragraph',
      text: 'La presión hidrostática también depende de la densidad. Para la misma profundidad y la misma gravedad: un líquido de mayor densidad produce un aumento de presión mayor. Por eso no basta con conocer únicamente la profundidad.',
    },

    { type: 'heading', level: 2, text: '8. Transmisión de presión' },
    {
      type: 'paragraph',
      text: 'Cuando se aplica un cambio de presión a un fluido confinado, ese cambio puede transmitirse a través del fluido. Este principio se utiliza en sistemas hidráulicos. En un sistema ideal, la presión aplicada puede transmitirse, mientras la fuerza resultante depende del área sobre la cual actúa. Esto permite obtener fuerzas diferentes usando pistones de áreas distintas.',
    },

    { type: 'heading', level: 2, text: '9. Presión en gases' },
    {
      type: 'paragraph',
      text: 'Los gases también ejercen presión. Esta presión se debe a las interacciones de las partículas del gas con las superficies del recipiente. La presión de un gas puede cambiar si cambian condiciones como: temperatura; volumen; cantidad de gas. Por ejemplo, comprimir un gas en un recipiente puede aumentar su presión.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre presión: identifica si se trata de sólido, líquido o gas; distingue fuerza de presión; observa el área de contacto; en líquidos, compara profundidades; considera la densidad si se comparan fluidos distintos; identifica si existe un sistema hidráulico; analiza qué variables cambian antes de elegir una relación física.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué magnitud permanece constante en los tres ensayos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Área de contacto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Peso del bloque.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Presión ejercida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Forma del área apoyada.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La situación indica que el bloque mantiene un peso de 120 N y solo cambia el área sobre la que se apoya.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿En cuál posición el bloque ejerce mayor presión sobre la superficie?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P y Q por igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con la misma fuerza, la menor área de contacto produce la mayor presión. R tiene el área más pequeña.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la presión ejercida en la posición Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '4 000 Pa.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '400 Pa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40 Pa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '36 000 Pa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'p = F/A = 120 N / 0,030 m² = 4 000 Pa.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Si el área de contacto se reduce a la mitad mientras la fuerza permanece constante, ¿qué ocurre con la presión?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se reduce a la mitad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permanece igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se duplica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve cero.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La presión es inversamente proporcional al área cuando la fuerza se mantiene constante.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Una estudiante afirma: “La posición R ejerce más presión porque el bloque pesa más cuando se apoya sobre esa cara”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque cambiar la orientación cambia necesariamente la masa.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: el peso permanece igual y la mayor presión se debe a que la misma fuerza actúa sobre un área menor.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcta porque una menor área produce una fuerza gravitatoria mayor.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque la presión no depende del área.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La orientación no cambia el peso del bloque. La presión aumenta porque el área de contacto disminuye.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué ocurre con el aumento de presión al aumentar la profundidad?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumenta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Disminuye.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permanece siempre igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve negativo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran que el aumento de presión es mayor en los puntos ubicados a mayor profundidad.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué relación muestran los datos entre profundidad y aumento de presión para este líquido?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Al duplicar la profundidad, la presión se reduce a la mitad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No existe relación observable.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al duplicar la profundidad, el aumento de presión también se duplica.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La presión depende únicamente del ancho del recipiente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran proporcionalidad directa: por ejemplo, de 0,10 m a 0,20 m la profundidad se duplica y el aumento de presión pasa de 1 000 Pa a 2 000 Pa.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Por qué los dos sensores ubicados a 0,30 m registraron el mismo aumento de presión aunque estuvieran en lados distintos del recipiente?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todo punto de un líquido tiene siempre presión cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la presión depende solamente del material del recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque ambos sensores estaban obligatoriamente en contacto entre sí.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque en el mismo líquido en reposo, puntos a la misma profundidad presentan la misma presión hidrostática bajo las mismas condiciones.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La presión hidrostática depende de variables como profundidad, densidad y gravedad, no de la posición horizontal dentro del recipiente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si se reemplazara el líquido por otro de mayor densidad y se mantuviera la misma profundidad, ¿qué se esperaría para el aumento de presión?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sería necesariamente cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sería mayor.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Sería menor independientemente de la densidad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sería siempre exactamente igual.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Según Δp = ρgh, una mayor densidad produce un mayor aumento de presión para la misma profundidad y gravedad.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un sistema hidráulico ideal posee dos pistones comunicados por un líquido. Se aplica una determinada presión mediante el pistón pequeño. El segundo pistón tiene un área mayor. ¿Cuál explicación describe mejor por qué puede obtenerse una fuerza mayor sobre el segundo pistón?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El cambio de presión se transmite por el fluido y, al actuar sobre un área mayor, puede producir una fuerza mayor.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El líquido crea energía indefinidamente dentro del sistema.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La presión desaparece antes de llegar al segundo pistón.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El pistón grande reduce automáticamente la masa de los objetos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un sistema hidráulico ideal, la presión transmitida puede actuar sobre un área mayor y producir una fuerza mayor, de acuerdo con F = pA.',
        },
      ],
    },
  ],
};

export default presionSolidosLiquidosGases;
