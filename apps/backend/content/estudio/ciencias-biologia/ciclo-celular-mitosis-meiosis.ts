// CONTENT-C1A -- Ciencias / U1 "Biología", Recurso 4 (order 4 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
// Cierra el bloque C1A (Ciencias U1 Biología R1-R4).
//
// Answer keys: R4 -- B C A D B D A C B D.
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
  { type: 'heading', level: 3, text: 'Situación A — Dos tipos de división celular' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó dos procesos celulares.' },
  {
    type: 'paragraph',
    text: 'En el proceso X, una célula con 46 cromosomas duplicó previamente su ADN y originó finalmente dos células, cada una con 46 cromosomas.',
  },
  {
    type: 'paragraph',
    text: 'En el proceso Y, una célula con 46 cromosomas duplicó su ADN una sola vez y posteriormente experimentó dos divisiones sucesivas, originando cuatro células con 23 cromosomas cada una.',
  },
  { type: 'paragraph', text: 'Los estudiantes intentaron identificar ambos procesos y explicar su importancia biológica.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — ¿Qué ocurre antes de que una célula se divida?' },
  { type: 'paragraph', text: 'Una investigadora cultivó células y midió la cantidad relativa de ADN durante distintas etapas del ciclo celular.' },
  { type: 'paragraph', text: 'Observó que un grupo de células presentaba una cantidad inicial de ADN equivalente a 1 unidad.' },
  { type: 'paragraph', text: 'Más adelante, antes de comenzar la división, esas mismas células alcanzaban aproximadamente 2 unidades.' },
  {
    type: 'paragraph',
    text: 'Después de completarse la mitosis y separarse las dos células resultantes, cada una volvía a presentar aproximadamente 1 unidad de ADN bajo el mismo criterio de medición.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora concluyó que el aumento previo no correspondía a la formación inmediata de una nueva célula, sino a la duplicación del material genético antes de su distribución.',
  },
];

const cicloCelularMitosisMeiosis: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 4,
  title: 'Ciclo celular, mitosis y meiosis',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las etapas generales del ciclo celular y diferenciar mitosis y meiosis según el número de divisiones, el resultado celular, la conservación o reducción del número de cromosomas y su función biológica, relacionando estos procesos con crecimiento, reparación, reproducción y variabilidad genética.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Ciclo celular, mitosis y meiosis' },

    { type: 'heading', level: 2, text: '1. El ciclo celular' },
    {
      type: 'paragraph',
      text: 'El ciclo celular corresponde al conjunto de procesos que atraviesa una célula desde que se origina hasta que vuelve a dividirse. Incluye períodos en los que la célula: crece, realiza sus funciones, duplica su ADN, prepara la división y distribuye el material genético. La división celular es solo una parte del ciclo.',
    },

    { type: 'heading', level: 2, text: '2. Interfase' },
    {
      type: 'paragraph',
      text: 'Durante gran parte del ciclo, la célula se encuentra en interfase. En este período: aumenta de tamaño, desarrolla actividad metabólica, produce moléculas y duplica su ADN antes de la división. La duplicación del ADN permite que el material genético pueda distribuirse posteriormente entre las células resultantes.',
    },

    { type: 'heading', level: 2, text: '3. Cromosomas y duplicación del ADN' },
    {
      type: 'paragraph',
      text: 'El ADN de una célula eucarionte se organiza en cromosomas. Antes de una división celular, cada cromosoma duplica su material genético. Después de la duplicación, cada cromosoma posee dos copias asociadas llamadas cromátidas hermanas. Duplicar el ADN no significa duplicar inmediatamente el número de células.',
    },

    { type: 'heading', level: 2, text: '4. Mitosis' },
    {
      type: 'paragraph',
      text: 'La mitosis es un proceso de división nuclear que permite distribuir copias equivalentes del material genético. En términos generales: los cromosomas duplicados se organizan; las cromátidas hermanas se separan; el material genético se distribuye en dos núcleos. Después puede ocurrir la división del citoplasma.',
    },

    { type: 'heading', level: 2, text: '5. Función de la mitosis' },
    {
      type: 'paragraph',
      text: 'En organismos multicelulares, la mitosis participa en: crecimiento, renovación celular y reparación de tejidos. También puede intervenir en reproducción asexual de determinados organismos. Las células resultantes conservan, en términos generales, la misma información genética que la célula que inició la división.',
    },

    { type: 'heading', level: 2, text: '6. Meiosis' },
    {
      type: 'paragraph',
      text: 'La meiosis comprende dos divisiones celulares sucesivas después de una sola duplicación previa del ADN. Su resultado general es la formación de células con la mitad del número de cromosomas de la célula inicial. En animales, este proceso está relacionado con la formación de gametos.',
    },

    { type: 'heading', level: 2, text: '7. Reducción del número de cromosomas' },
    {
      type: 'paragraph',
      text: 'La reducción cromosómica es fundamental para la reproducción sexual. Si los gametos conservaran el mismo número de cromosomas que las células que los originan, la fecundación aumentaría el número de cromosomas en cada generación. La meiosis permite que la unión de dos gametos restablezca el número cromosómico característico de la especie.',
    },

    { type: 'heading', level: 2, text: '8. Variabilidad genética' },
    {
      type: 'paragraph',
      text: 'Las células producidas por meiosis no son necesariamente genéticamente idénticas entre sí. Durante este proceso pueden contribuir a la variabilidad: distribución independiente de cromosomas; intercambio de segmentos entre cromosomas homólogos. La reproducción sexual combina además material genético proveniente de dos gametos.',
    },

    { type: 'heading', level: 2, text: '9. Mitosis y meiosis no cumplen la misma función' },
    {
      type: 'paragraph',
      text: 'Aunque ambos procesos distribuyen material genético, tienen resultados diferentes. Mitosis: una división principal; generalmente dos células resultantes; conserva el número de cromosomas; relacionada con crecimiento y reparación. Meiosis: dos divisiones; generalmente cuatro células resultantes; reduce el número de cromosomas a la mitad; relacionada con reproducción sexual y variabilidad.',
    },

    { type: 'heading', level: 2, text: '10. Regulación del ciclo celular' },
    {
      type: 'paragraph',
      text: 'La división celular debe estar regulada. La célula posee mecanismos que controlan si determinadas condiciones permiten avanzar en el ciclo. Si el control del ciclo se altera, algunas células pueden comenzar a dividirse de manera anormal. Por eso, estudiar el ciclo celular permite comprender tanto procesos normales de crecimiento como algunas alteraciones biológicas.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué proceso corresponde a X?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Meiosis.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mitosis.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Fecundación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mutación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El proceso X origina dos células que mantienen el mismo número cromosómico de la célula inicial, característica general de la mitosis.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué característica permite identificar el proceso Y como meiosis?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Origina dos células idénticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No ocurre duplicación del ADN.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Produce células con la mitad del número de cromosomas después de dos divisiones.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Duplica permanentemente el número cromosómico.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La meiosis comprende dos divisiones y genera células con un número cromosómico reducido respecto de la célula inicial.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Por qué es importante que las células producidas por meiosis tengan 23 cromosomas en este ejemplo?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque permite que al fusionarse dos gametos se restablezcan 46 cromosomas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque evita completamente cualquier variabilidad genética.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las células del organismo deben tener 23 cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la meiosis elimina la mitad de los genes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reducción cromosómica permite que la fecundación restablezca el número característico de la especie sin duplicarlo en cada generación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál comparación entre X e Y está correctamente formulada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ambos procesos producen siempre cuatro células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo X requiere duplicar ADN antes de dividirse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos reducen el número cromosómico a la mitad.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'X conserva el número cromosómico, mientras Y lo reduce.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La mitosis conserva el número de cromosomas en las células hijas, mientras la meiosis produce una reducción cromosómica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si una especie posee 12 cromosomas en sus células somáticas, ¿qué resultado sería compatible con una meiosis normal?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Dos células con 12 cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cuatro células con 6 cromosomas cada una.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Cuatro células con 24 cromosomas cada una.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una célula con 6 cromosomas y otra con 18.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La meiosis reduce a la mitad el número cromosómico, por lo que una célula diploide con 12 cromosomas puede originar células haploides con 6.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué proceso explica el aumento de 1 a 2 unidades de ADN antes de la división?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Pérdida de cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Destrucción del núcleo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Separación de las células hijas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Duplicación del ADN.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Antes de la división celular, el ADN se replica para que pueda distribuirse posteriormente entre las células resultantes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué cada célula resultante vuelve a presentar aproximadamente 1 unidad de ADN?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el material genético duplicado fue distribuido entre las dos células hijas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque todo el ADN duplicado fue destruido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las células dejaron de poseer cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque ambas células fusionaron sus núcleos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La mitosis distribuye el material genético previamente duplicado entre las células resultantes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión incorrecta evitaron los datos del experimento?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que las células contienen ADN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que el ciclo celular incluye distintas etapas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que duplicar el ADN significa que inmediatamente se formaron dos células.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que la mitosis permite distribuir material genético.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El aumento de ADN ocurre antes de la división; por lo tanto, duplicar el material genético no equivale a producir inmediatamente dos células.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué medición adicional permitiría relacionar mejor la cantidad de ADN con el momento de la división?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El color del recipiente utilizado.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'El número de células presentes en distintos momentos del experimento.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La marca del microscopio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La temperatura exterior del edificio.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Comparar la cantidad de ADN con el número de células a lo largo del tiempo permitiría relacionar la duplicación del ADN con la posterior división celular.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Una sustancia experimental impide que las células dupliquen correctamente su ADN. ¿Qué predicción está mejor sustentada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las células deberían completar siempre la división sin consecuencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La sustancia debería convertir automáticamente la mitosis en meiosis.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las células aumentarían necesariamente su número de cromosomas sin límite.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El avance normal hacia la división podría verse interrumpido porque la duplicación adecuada del ADN es necesaria antes de distribuir el material genético.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La correcta duplicación del ADN es una condición fundamental para que el material genético pueda distribuirse adecuadamente durante una división celular.',
        },
      ],
    },
  ],
};

export default cicloCelularMitosisMeiosis;
