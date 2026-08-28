// CHEMISTRY-C1A -- Ciencias / U3 "Química", Recurso 1 (order 1 en U3).
// Abre la unidad CIENCIAS.QUIMICA. Contenido editorial APROBADO externamente,
// transcrito verbatim.
//
// Answer keys: R24 -- B D A C B A C D B A.
// Tabla editorial de la Situación A ("Muestra / Observación") representada
// como filas de párrafo con "|" -- FORMAT_ONLY.
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
  { type: 'heading', level: 3, text: 'Clasificación de cuatro muestras' },
  { type: 'paragraph', text: 'Un grupo de estudiantes recibió cuatro muestras y registró algunas características.' },
  { type: 'paragraph', text: '| Muestra | Observación |' },
  {
    type: 'paragraph',
    text: '| P | Está formada por un único tipo de átomo y no puede descomponerse químicamente en sustancias más simples. |',
  },
  { type: 'paragraph', text: '| Q | Tiene composición definida y está formada por dos elementos unidos químicamente. |' },
  { type: 'paragraph', text: '| R | Contiene dos sustancias distribuidas uniformemente y se observa una sola fase. |' },
  { type: 'paragraph', text: '| S | Presenta dos regiones visibles con distinta composición. |' },
  { type: 'paragraph', text: 'Los estudiantes debían clasificar cada muestra.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Análisis de una muestra líquida' },
  { type: 'paragraph', text: 'Un equipo recibió una muestra líquida transparente.' },
  { type: 'paragraph', text: 'Al observarla, parecía uniforme.' },
  {
    type: 'paragraph',
    text: 'Luego tomaron pequeñas porciones de la muestra y encontraron que todas presentaban la misma apariencia.',
  },
  { type: 'paragraph', text: 'Posteriormente evaporaron el líquido y observaron que quedaba un sólido en el recipiente.' },
  { type: 'paragraph', text: 'Repitieron el procedimiento con otra porción y obtuvieron nuevamente el mismo tipo de sólido.' },
];

const materiaSustanciasMezclas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 1,
  title: 'Materia, sustancias y mezclas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá clasificar distintos sistemas materiales como sustancias puras o mezclas, distinguiendo elementos, compuestos, mezclas homogéneas y heterogéneas a partir de su composición y propiedades observables, e interpretar evidencia experimental simple asociada a estos sistemas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Materia, sustancias y mezclas' },

    { type: 'heading', level: 2, text: '1. ¿Qué es la materia?' },
    {
      type: 'paragraph',
      text: 'La materia corresponde a todo aquello que posee masa y ocupa un lugar en el espacio. Puede presentarse en distintos estados físicos y formar una gran variedad de materiales. Para describirla se utilizan propiedades como: masa; volumen; densidad; temperatura; color; solubilidad. Estas propiedades permiten comparar y caracterizar diferentes sistemas materiales.',
    },

    { type: 'heading', level: 2, text: '2. Propiedades de la materia' },
    {
      type: 'paragraph',
      text: 'Algunas propiedades dependen de la cantidad de materia presente y otras permiten caracterizar una sustancia sin depender directamente de la cantidad utilizada. Por ejemplo: la masa cambia si aumenta la cantidad de material; la densidad puede mantenerse característica bajo determinadas condiciones; la temperatura de ebullición puede servir como evidencia para identificar sustancias. Las propiedades observadas deben interpretarse considerando las condiciones experimentales.',
    },

    { type: 'heading', level: 2, text: '3. Sustancias puras' },
    {
      type: 'paragraph',
      text: 'Una sustancia pura posee una composición definida. Está formada por un solo tipo de sustancia química. Puede corresponder a: un elemento; un compuesto. Una sustancia pura no se clasifica como mezcla simplemente porque contenga muchas partículas.',
    },

    { type: 'heading', level: 2, text: '4. Elementos' },
    {
      type: 'paragraph',
      text: 'Un elemento corresponde a una sustancia formada por átomos con el mismo número atómico. Ejemplos incluyen: hierro; oxígeno; cobre; carbono. Un elemento no puede descomponerse químicamente en sustancias más simples mediante reacciones químicas ordinarias.',
    },

    { type: 'heading', level: 2, text: '5. Compuestos' },
    {
      type: 'paragraph',
      text: 'Un compuesto es una sustancia pura formada por dos o más elementos unidos químicamente en proporciones definidas. Por ejemplo, el agua está formada por hidrógeno y oxígeno combinados químicamente. Las propiedades de un compuesto pueden ser distintas de las propiedades de los elementos que lo forman.',
    },

    { type: 'heading', level: 2, text: '6. Mezclas' },
    {
      type: 'paragraph',
      text: 'Una mezcla está formada por dos o más sustancias presentes juntas sin constituir una única sustancia pura. Su composición puede variar. Los componentes de una mezcla conservan su identidad química y pueden separarse mediante métodos físicos adecuados.',
    },

    { type: 'heading', level: 2, text: '7. Mezclas homogéneas' },
    {
      type: 'paragraph',
      text: 'Una mezcla homogénea presenta una composición uniforme a escala macroscópica. En ella no se distinguen fácilmente regiones con composición diferente. Ejemplos frecuentes incluyen algunas: soluciones; mezclas de gases; aleaciones. Una mezcla homogénea sigue siendo una mezcla aunque se observe como una sola fase.',
    },

    { type: 'heading', level: 2, text: '8. Mezclas heterogéneas' },
    {
      type: 'paragraph',
      text: 'Una mezcla heterogénea no presenta composición uniforme a escala macroscópica. Puede contener: fases distinguibles; partículas visibles; regiones con propiedades diferentes. La heterogeneidad puede observarse directamente o mediante instrumentos.',
    },

    { type: 'heading', level: 2, text: '9. Fases y componentes' },
    {
      type: 'paragraph',
      text: 'No debe confundirse: número de componentes; número de fases. Un sistema puede contener varias sustancias y presentar una sola fase visible. Por ejemplo, una solución puede contener soluto y solvente pero observarse como una sola fase. En cambio, una mezcla heterogénea puede presentar dos o más fases distinguibles.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre clasificación de la materia: identifica cuántas sustancias forman el sistema; determina si existe composición definida o variable; distingue sustancia pura de mezcla; si es sustancia pura, diferencia elemento de compuesto; si es mezcla, analiza si es uniforme; distingue componentes de fases; utiliza la evidencia experimental antes de clasificar.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cómo se clasifica la muestra P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mezcla homogénea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Elemento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Compuesto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla heterogénea.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'P está formada por un solo tipo de átomo y corresponde a una sustancia elemental.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cómo se clasifica la muestra Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Elemento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla homogénea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla heterogénea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Compuesto.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Q posee composición definida y contiene dos elementos unidos químicamente, por lo que corresponde a un compuesto.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cómo se clasifica la muestra R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mezcla homogénea.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Elemento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sustancia pura elemental.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla heterogénea.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'R contiene más de una sustancia, pero estas se encuentran distribuidas uniformemente y forman una sola fase observable.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué característica permite clasificar mejor a S como mezcla heterogénea?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Está formada por un solo elemento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Posee composición siempre fija.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Presenta regiones visibles con distinta composición.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'No tiene masa.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La presencia de regiones con composición diferente indica que el sistema no es uniforme.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “R debe ser una sustancia pura porque solo se observa una fase”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque toda fase única corresponde a un elemento.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: una mezcla homogénea puede presentar una sola fase aunque contenga más de una sustancia.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque las mezclas siempre tienen dos fases visibles.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque ninguna sustancia pura puede presentar una sola fase.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El número de fases visibles no determina por sí solo si el sistema es una sustancia pura o una mezcla.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué evidencia inicial sugiere que la muestra es homogénea a escala macroscópica?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presenta una apariencia uniforme.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Siempre contiene un solo elemento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No posee masa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Está formada necesariamente por una sola sustancia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La uniformidad observable sugiere una mezcla homogénea, aunque por sí sola no demuestra que sea una sustancia pura.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué evidencia indica que el líquido probablemente contenía más de una sustancia?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Era transparente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tenía volumen.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Después de evaporarlo quedó un sólido.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Se encontraba dentro de un recipiente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evaporación separó un componente líquido y dejó otro componente sólido, lo que indica la presencia de al menos dos sustancias.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál clasificación es más consistente con toda la evidencia?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Elemento puro.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Compuesto puro necesariamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla heterogénea con dos fases visibles desde el inicio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mezcla homogénea.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La muestra era uniforme, pero la evaporación permitió separar un sólido, consistente con una solución homogénea.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué la evaporación puede utilizarse para separar los componentes de esta muestra?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque convierte todos los elementos en compuestos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los componentes pueden presentar distintas propiedades físicas, como diferente volatilidad.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque destruye químicamente todos los componentes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque toda mezcla debe reaccionar antes de separarse.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las diferencias en propiedades físicas pueden utilizarse para separar sustancias sin cambiar necesariamente su identidad química.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál conclusión está mejor respaldada por el conjunto de observaciones?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una muestra puede observarse como una sola fase y aun así contener más de una sustancia, por lo que deben considerarse pruebas adicionales para distinguir una mezcla homogénea de una sustancia pura.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda sustancia transparente es una mezcla.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Si queda un sólido después de evaporar, el líquido inicial era necesariamente un elemento.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las mezclas homogéneas no pueden separarse mediante métodos físicos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La apariencia uniforme no basta para concluir que existe una sola sustancia; la separación física aporta evidencia adicional sobre la composición del sistema.',
        },
      ],
    },
  ],
};

export default materiaSustanciasMezclas;
