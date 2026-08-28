// CHEMISTRY-C1A -- Ciencias / U3 "Química", Recurso 2 (order 2 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R25 -- C A D B C B A D C B.
// Tabla editorial de la Situación A ("Mezcla / Característica principal")
// representada como filas de párrafo con "|" -- FORMAT_ONLY.
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
  { type: 'heading', level: 3, text: 'Cuatro mezclas y un método de separación' },
  { type: 'paragraph', text: 'Un grupo de estudiantes debía seleccionar un método apropiado para cuatro mezclas.' },
  { type: 'paragraph', text: '| Mezcla | Característica principal |' },
  { type: 'paragraph', text: '| P | Arena suspendida en agua; la arena no se disuelve. |' },
  { type: 'paragraph', text: '| Q | Dos líquidos inmiscibles con diferente densidad. |' },
  { type: 'paragraph', text: '| R | Dos sólidos con tamaños de partícula claramente diferentes. |' },
  { type: 'paragraph', text: '| S | Un sólido soluble disuelto completamente en agua. |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Separación de una mezcla de tres componentes' },
  { type: 'paragraph', text: 'Un equipo recibió una mezcla formada por:' },
  { type: 'paragraph', text: 'arena; sal; agua.' },
  { type: 'paragraph', text: 'Primero agitaron la mezcla.' },
  { type: 'paragraph', text: 'Luego realizaron las siguientes etapas:' },
  {
    type: 'paragraph',
    text: 'pasaron la mezcla por un filtro; recuperaron un sólido retenido; calentaron el filtrado; observaron que el agua se evaporaba y quedaba un sólido blanco.',
  },
];

const separacionMezclasPropiedadesFisicas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 2,
  title: 'Separación de mezclas y propiedades físicas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá seleccionar y explicar métodos físicos de separación de mezclas a partir de diferencias en propiedades como tamaño de partícula, densidad, solubilidad y volatilidad, e interpretar resultados experimentales para evaluar la eficacia de un procedimiento de separación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Separación de mezclas y propiedades físicas' },

    { type: 'heading', level: 2, text: '1. Separar sin cambiar la identidad química' },
    {
      type: 'paragraph',
      text: 'Los componentes de una mezcla pueden separarse mediante métodos físicos cuando presentan propiedades diferentes. Durante una separación física, las sustancias no tienen que transformarse químicamente. El objetivo es aprovechar diferencias como: tamaño de partícula; densidad; solubilidad; punto de ebullición; afinidad con materiales.',
    },

    { type: 'heading', level: 2, text: '2. Filtración' },
    {
      type: 'paragraph',
      text: 'La filtración permite separar, por ejemplo, un sólido insoluble de un líquido. Se utiliza una barrera porosa que deja pasar parte de la mezcla y retiene partículas de mayor tamaño. Se distinguen: filtrado; residuo. La filtración depende principalmente del tamaño de las partículas y de si el sólido está disuelto o no.',
    },

    { type: 'heading', level: 2, text: '3. Decantación' },
    {
      type: 'paragraph',
      text: 'La decantación puede utilizarse cuando los componentes se separan por diferencia de densidad y forman fases distintas. Puede aplicarse, por ejemplo, a: sólido sedimentado y líquido; dos líquidos inmiscibles. Se deja que las fases se separen y luego se retira una de ellas.',
    },

    { type: 'heading', level: 2, text: '4. Tamizado' },
    {
      type: 'paragraph',
      text: 'El tamizado permite separar sólidos con diferentes tamaños de partícula. Una malla permite el paso de partículas más pequeñas y retiene las más grandes. No depende de que las sustancias reaccionen entre sí.',
    },

    { type: 'heading', level: 2, text: '5. Evaporación' },
    {
      type: 'paragraph',
      text: 'La evaporación puede utilizarse para recuperar un sólido disuelto en un líquido. Al eliminar el solvente por vaporización, el soluto no volátil puede permanecer en el recipiente. Este método es útil cuando interesa principalmente recuperar el sólido.',
    },

    { type: 'heading', level: 2, text: '6. Destilación' },
    {
      type: 'paragraph',
      text: 'La destilación combina: vaporización; condensación. Permite separar sustancias aprovechando diferencias en volatilidad o temperatura de ebullición. El componente que se vaporiza se conduce a una zona más fría, donde puede condensarse y recuperarse.',
    },

    { type: 'heading', level: 2, text: '7. Cromatografía' },
    {
      type: 'paragraph',
      text: 'La cromatografía permite separar componentes según su diferente interacción con: una fase móvil; una fase estacionaria. Los componentes pueden desplazarse a velocidades diferentes. Por eso, una mancha aparentemente única puede separarse en varias.',
    },

    { type: 'heading', level: 2, text: '8. Solubilidad' },
    {
      type: 'paragraph',
      text: 'La solubilidad puede utilizarse como criterio de separación. Si una sustancia se disuelve en un solvente y otra no, puede realizarse una separación selectiva. Luego pueden combinarse métodos como: disolución; filtración; evaporación.',
    },

    { type: 'heading', level: 2, text: '9. Elegir el método correcto' },
    {
      type: 'paragraph',
      text: 'Antes de escoger una técnica, conviene preguntar: ¿los componentes son sólidos, líquidos o gases? ¿hay fases visibles? ¿un sólido está disuelto? ¿difieren en tamaño? ¿difieren en densidad? ¿difieren en volatilidad? ¿interactúan de manera distinta con un solvente o soporte? La técnica depende de la propiedad que diferencia a los componentes.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre separación: identifica los componentes; determina el estado físico de cada uno; observa si la mezcla es homogénea o heterogénea; identifica la propiedad física diferente; selecciona el método que aprovecha esa diferencia; analiza qué componente se recupera en cada etapa; verifica si se necesita combinar más de un método.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué método es adecuado para separar la arena del agua en P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Destilación exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cromatografía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Filtración.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Fusión.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La arena es un sólido insoluble cuyas partículas pueden quedar retenidas por un material filtrante.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué método es apropiado para separar los líquidos inmiscibles de Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Decantación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Tamizado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Filtración de papel necesariamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sublimación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los líquidos inmiscibles forman fases separadas y pueden distinguirse por su densidad, lo que permite decantarlos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué método aprovecha mejor la diferencia de tamaño de partículas en R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Evaporación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Destilación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cromatografía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tamizado.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El tamizado separa sólidos según el tamaño de sus partículas mediante una malla.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si se desea recuperar el sólido disuelto en S y el solvente no necesita recuperarse, ¿qué método es adecuado?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Tamizado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evaporación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Decantación entre dos líquidos inmiscibles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Filtración directa del soluto disuelto.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al evaporar el solvente, el soluto no volátil puede quedar en el recipiente.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante intenta separar S mediante filtración y no observa sólido retenido. ¿Cuál explicación es más adecuada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La filtración transforma el sólido en gas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El agua destruyó químicamente el soluto.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El soluto está disuelto a escala de partículas y atraviesa el filtro junto con el solvente, por lo que se requiere otro método.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda mezcla homogénea puede separarse con un tamiz.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un soluto disuelto no se comporta como partículas sólidas suspendidas, por lo que un filtro común no lo retiene.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué sustancia se espera que quede principalmente retenida en el filtro?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sal disuelta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Arena.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Vapor de agua.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La arena no se disuelve y sus partículas pueden ser retenidas por el filtro.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué contiene principalmente el filtrado después de separar la arena?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Agua con sal disuelta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Solo arena.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sal sólida sin agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Únicamente aire.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La sal permanece disuelta en el agua y atraviesa el filtro junto con el solvente.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué propiedad permite separar finalmente la sal del agua mediante calentamiento?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El color de la sal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El tamaño del recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La masa total inicial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La diferencia de volatilidad entre el agua y la sal.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El agua se vaporiza con facilidad bajo las condiciones del procedimiento, mientras la sal permanece en el recipiente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué fueron necesarios dos métodos de separación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna propiedad física puede utilizarse en mezclas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los tres componentes tenían exactamente las mismas propiedades.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la arena y la sal requerían aprovechar propiedades diferentes: insolubilidad/tamaño de partícula y volatilidad del solvente.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque toda separación debe incluir exactamente dos pasos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La filtración permite separar la arena, mientras la evaporación permite recuperar la sal disuelta.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si además se quisiera recuperar el agua líquida en lugar de perderla como vapor, ¿qué modificación sería más adecuada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sustituir todo el procedimiento por tamizado.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Incorporar un sistema de destilación que permita condensar y recoger el vapor de agua.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Agregar más sal antes de calentar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Filtrar nuevamente el agua antes de evaporarla.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La destilación permite vaporizar el agua y luego condensarla para recuperarla como líquido.',
        },
      ],
    },
  ],
};

export default separacionMezclasPropiedadesFisicas;
