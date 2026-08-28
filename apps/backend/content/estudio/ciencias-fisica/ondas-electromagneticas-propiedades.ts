// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 1 (order 1 en U2).
// Abre la unidad CIENCIAS.FISICA. Contenido editorial APROBADO externamente,
// transcrito verbatim.
//
// Answer keys: R13 -- D B A C D A C B D A.
// Tabla editorial de la Situación A ("Radiación / Frecuencia aproximada")
// representada como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan
// EXACTAMENTE la notación científica y los símbolos Unicode:
// 3,0 × 10⁸ m/s, 1,0 × 10⁹ Hz, 3,0 × 10¹² Hz, 5,0 × 10¹⁴ Hz, 2,0 × 10¹⁸ Hz,
// c = λf.
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
  { type: 'heading', level: 3, text: 'Comparación de distintas radiaciones' },
  { type: 'paragraph', text: 'Un grupo de estudiantes comparó cuatro tipos de radiación electromagnética que se propagaban en el vacío.' },
  { type: 'paragraph', text: '| Radiación | Frecuencia aproximada |' },
  { type: 'paragraph', text: '| P | 1,0 × 10⁹ Hz |' },
  { type: 'paragraph', text: '| Q | 3,0 × 10¹² Hz |' },
  { type: 'paragraph', text: '| R | 5,0 × 10¹⁴ Hz |' },
  { type: 'paragraph', text: '| S | 2,0 × 10¹⁸ Hz |' },
  {
    type: 'paragraph',
    text: 'Los estudiantes recordaron que todas las radiaciones electromagnéticas se propagan en el vacío aproximadamente a 3,0 × 10⁸ m/s.',
  },
  { type: 'paragraph', text: 'A partir de los datos, compararon sus frecuencias y longitudes de onda.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Una señal electromagnética y su longitud de onda' },
  { type: 'paragraph', text: 'Un equipo estudió una señal electromagnética que se propagaba en el vacío.' },
  { type: 'paragraph', text: 'La señal tenía una frecuencia de:' },
  { type: 'paragraph', text: '6,0 × 10⁸ Hz' },
  { type: 'paragraph', text: 'Para analizarla, utilizaron la relación:' },
  { type: 'paragraph', text: 'c = λf' },
  { type: 'paragraph', text: 'considerando:' },
  { type: 'paragraph', text: 'c = 3,0 × 10⁸ m/s' },
  { type: 'paragraph', text: 'Después compararon esa señal con otra cuya frecuencia era el doble.' },
];

const ondasElectromagneticasPropiedades: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 1,
  title: 'Ondas electromagnéticas y sus propiedades',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar propiedades fundamentales de las ondas electromagnéticas, relacionando frecuencia, longitud de onda y propagación con su ubicación en el espectro electromagnético, e interpretar datos y situaciones experimentales para comparar distintos tipos de radiación electromagnética.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Ondas electromagnéticas y sus propiedades' },

    { type: 'heading', level: 2, text: '1. ¿Qué es una onda electromagnética?' },
    {
      type: 'paragraph',
      text: 'Una onda electromagnética corresponde a una perturbación asociada con campos eléctricos y magnéticos que varían y se propagan transportando energía. Entre las ondas electromagnéticas se encuentran: ondas de radio; microondas; radiación infrarroja; luz visible; radiación ultravioleta; rayos X; rayos gamma. Todas forman parte del espectro electromagnético.',
    },

    { type: 'heading', level: 2, text: '2. No necesitan un medio material' },
    {
      type: 'paragraph',
      text: 'A diferencia de las ondas mecánicas, las ondas electromagnéticas pueden propagarse en el vacío. Por ejemplo, la radiación proveniente del Sol atraviesa el espacio antes de llegar a la Tierra. Esto significa que su propagación no requiere necesariamente: aire; agua; sólidos; otro medio material.',
    },

    { type: 'heading', level: 2, text: '3. Rapidez de propagación en el vacío' },
    {
      type: 'paragraph',
      text: 'Todas las ondas electromagnéticas se propagan en el vacío con la misma rapidez. Esta rapidez se representa habitualmente mediante: c y su valor aproximado es: 3,0 × 10⁸ m/s. En materiales, la rapidez de propagación puede ser diferente.',
    },

    { type: 'heading', level: 2, text: '4. Frecuencia' },
    {
      type: 'paragraph',
      text: 'La frecuencia indica cuántas oscilaciones ocurren por unidad de tiempo. Se mide en: hertz (Hz). Una frecuencia mayor significa que ocurren más oscilaciones durante el mismo intervalo temporal. En el espectro electromagnético existen ondas con frecuencias muy distintas.',
    },

    { type: 'heading', level: 2, text: '5. Longitud de onda' },
    {
      type: 'paragraph',
      text: 'La longitud de onda representa la distancia correspondiente a un ciclo completo de la onda. Se suele representar mediante: λ y puede expresarse en unidades como: metros; centímetros; nanómetros. La unidad utilizada depende del tamaño de la longitud de onda estudiada.',
    },

    { type: 'heading', level: 2, text: '6. Relación entre frecuencia y longitud de onda' },
    {
      type: 'paragraph',
      text: 'En el vacío se cumple: c = λf donde: c es la rapidez de propagación; λ es la longitud de onda; f es la frecuencia. Como c es constante en el vacío: si aumenta la frecuencia, disminuye la longitud de onda; si disminuye la frecuencia, aumenta la longitud de onda. Por eso frecuencia y longitud de onda varían de manera inversa.',
    },

    { type: 'heading', level: 2, text: '7. El espectro electromagnético' },
    {
      type: 'paragraph',
      text: 'De menor a mayor frecuencia, una organización general del espectro es: ondas de radio → microondas → infrarrojo → visible → ultravioleta → rayos X → rayos gamma. En sentido contrario, la longitud de onda aumenta. Así, las ondas de radio poseen generalmente longitudes de onda mayores que los rayos gamma.',
    },

    { type: 'heading', level: 2, text: '8. Luz visible' },
    {
      type: 'paragraph',
      text: 'La luz visible corresponde solo a una pequeña región del espectro electromagnético. Dentro del visible, diferentes longitudes de onda se relacionan con distintos colores. Sin embargo, la radiación electromagnética existe mucho más allá de lo que puede detectar el ojo humano.',
    },

    { type: 'heading', level: 2, text: '9. Frecuencia y energía' },
    {
      type: 'paragraph',
      text: 'En términos generales, una radiación electromagnética de mayor frecuencia está asociada con mayor energía por fotón. Por eso, diferentes regiones del espectro pueden interactuar de maneras distintas con la materia. Esto no significa que toda radiación de alta frecuencia produzca necesariamente el mismo efecto en cualquier situación: también importan factores como intensidad, exposición y material involucrado.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre ondas electromagnéticas: identifica la región del espectro; determina si se compara frecuencia o longitud de onda; recuerda que en el vacío todas viajan con la misma rapidez; usa la relación inversa entre frecuencia y longitud de onda; diferencia rapidez de frecuencia; distingue ondas electromagnéticas de ondas mecánicas; interpreta los datos antes de asumir una región del espectro.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál de las radiaciones presenta la mayor frecuencia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'S presenta una frecuencia de 2,0 × 10¹⁸ Hz, que es la mayor de las cuatro.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué propiedad comparten P, Q, R y S mientras se propagan en el vacío?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La misma longitud de onda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La misma rapidez de propagación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La misma frecuencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La misma energía por fotón.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Todas las ondas electromagnéticas se propagan en el vacío aproximadamente a la misma rapidez, aunque sus frecuencias y longitudes de onda sean diferentes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál radiación posee la mayor longitud de onda?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Como la frecuencia y la longitud de onda varían inversamente en el vacío, la radiación de menor frecuencia posee la mayor longitud de onda.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: 'Si se compara R con S, ¿cuál afirmación es correcta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'S posee menor frecuencia y menor longitud de onda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambas poseen la misma longitud de onda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S posee mayor frecuencia y menor longitud de onda.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'R posee mayor frecuencia y menor longitud de onda.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'S tiene mayor frecuencia que R y, como ambas viajan a la misma rapidez en el vacío, debe tener menor longitud de onda.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “S viaja más rápido que P porque tiene mayor frecuencia”. ¿Cuál evaluación es más adecuada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque la rapidez siempre aumenta con la frecuencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta únicamente para las ondas de radio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque las ondas de alta frecuencia no tienen longitud de onda.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque, en el vacío, ambas se propagan con la misma rapidez aunque tengan frecuencias diferentes.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La frecuencia permite distinguir las radiaciones, pero no cambia la rapidez de propagación de las ondas electromagnéticas en el vacío.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué representa la letra f en la expresión utilizada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Frecuencia.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Fuerza.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Flujo magnético.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Distancia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En la relación c = λf, f representa la frecuencia de la onda.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál es la longitud de onda de la señal de 6,0 × 10⁸ Hz?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2,0 m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,0 m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,50 m.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,20 m.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'λ = c/f = (3,0 × 10⁸ m/s)/(6,0 × 10⁸ Hz) = 0,50 m.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si una segunda señal posee el doble de frecuencia y también se propaga en el vacío, ¿qué ocurre con su longitud de onda?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se duplica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se reduce a la mitad.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Permanece igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve cero.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Como la rapidez permanece constante, duplicar la frecuencia implica reducir la longitud de onda a la mitad.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué dato adicional permitiría calcular la longitud de onda de cualquier radiación electromagnética en un medio determinado?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo su color observable.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Únicamente su intensidad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de objetos presentes en el medio.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Su frecuencia y la rapidez con que se propaga en ese medio.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La relación λ = v/f requiere conocer la frecuencia y la rapidez de propagación en el medio considerado.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante mide dos ondas electromagnéticas A y B en el vacío. Determina que la frecuencia de B es tres veces la frecuencia de A. ¿Cuál conclusión se deduce correctamente?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La longitud de onda de B corresponde a un tercio de la longitud de onda de A.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'B viaja tres veces más rápido que A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La longitud de onda de B es tres veces mayor que la de A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A y B deben pertenecer necesariamente a la misma región del espectro.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En el vacío la rapidez es la misma para ambas ondas, por lo que una frecuencia tres veces mayor corresponde a una longitud de onda tres veces menor.',
        },
      ],
    },
  ],
};

export default ondasElectromagneticasPropiedades;
