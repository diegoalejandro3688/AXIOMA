// CHEMISTRY-C1A -- Ciencias / U3 "Química", Recurso 4 (order 4 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R27 -- D B A C D A B C D A.
// Tabla editorial de la Situación A ("Especie / Protones / Neutrones /
// Electrones", 4 columnas) representada como filas de párrafo con "|" --
// FORMAT_ONLY. Se preserva EXACTAMENTE la relación A = Z + N y la carga +1.
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
  { type: 'heading', level: 3, text: 'Comparación de cuatro especies atómicas' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó cuatro especies.' },
  { type: 'paragraph', text: '| Especie | Protones | Neutrones | Electrones |' },
  { type: 'paragraph', text: '| P | 8 | 8 | 8 |' },
  { type: 'paragraph', text: '| Q | 8 | 10 | 8 |' },
  { type: 'paragraph', text: '| R | 11 | 12 | 10 |' },
  { type: 'paragraph', text: '| S | 12 | 12 | 12 |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Evidencia y modelos del átomo' },
  { type: 'paragraph', text: 'Un equipo estudió una representación histórica simplificada de un experimento.' },
  { type: 'paragraph', text: 'Partículas cargadas positivamente fueron dirigidas hacia una lámina muy delgada de material.' },
  { type: 'paragraph', text: 'Observaron que:' },
  {
    type: 'paragraph',
    text: 'la mayoría atravesaba la lámina con poca desviación; una fracción pequeña se desviaba considerablemente; muy pocas regresaban en dirección aproximada hacia la fuente.',
  },
  {
    type: 'paragraph',
    text: 'Los investigadores concluyeron que gran parte del volumen del átomo no contenía una concentración elevada de carga positiva y que esta debía estar concentrada en una región muy pequeña.',
  },
];

const modelosAtomicosParticulasSubatomicasIones: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 4,
  title: 'Modelos atómicos, partículas subatómicas e iones',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá describir la estructura básica del átomo mediante protones, neutrones y electrones, relacionar número atómico y número másico con la identidad de los átomos, distinguir isótopos e iones, e interpretar evidencia simple asociada a modelos atómicos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Modelos atómicos, partículas subatómicas e iones' },

    { type: 'heading', level: 2, text: '1. El átomo' },
    {
      type: 'paragraph',
      text: 'El átomo es una unidad fundamental de la materia. Está formado por partículas subatómicas. Entre las principales se encuentran: protones; neutrones; electrones. Estas partículas presentan propiedades diferentes.',
    },

    { type: 'heading', level: 2, text: '2. Protones' },
    {
      type: 'paragraph',
      text: 'Los protones poseen carga eléctrica positiva. Se encuentran en el núcleo del átomo. El número de protones determina la identidad química del elemento. Por ejemplo, todos los átomos de un mismo elemento poseen el mismo número de protones.',
    },

    { type: 'heading', level: 2, text: '3. Neutrones' },
    {
      type: 'paragraph',
      text: 'Los neutrones no poseen carga eléctrica neta. También se encuentran en el núcleo. Su cantidad puede variar entre átomos de un mismo elemento. Estas variaciones dan origen a isótopos.',
    },

    { type: 'heading', level: 2, text: '4. Electrones' },
    {
      type: 'paragraph',
      text: 'Los electrones poseen carga eléctrica negativa. Se encuentran distribuidos alrededor del núcleo en regiones asociadas a distintos niveles de energía. En un átomo eléctricamente neutro: número de protones = número de electrones.',
    },

    { type: 'heading', level: 2, text: '5. Número atómico' },
    {
      type: 'paragraph',
      text: 'El número atómico se representa mediante: Z y corresponde al número de protones del átomo. Como el número de protones define el elemento: átomos con distinto Z corresponden a elementos distintos.',
    },

    { type: 'heading', level: 2, text: '6. Número másico' },
    {
      type: 'paragraph',
      text: 'El número másico se representa mediante: A y corresponde a la suma de: protones + neutrones. Por lo tanto: A = Z + N donde N representa el número de neutrones.',
    },

    { type: 'heading', level: 2, text: '7. Isótopos' },
    {
      type: 'paragraph',
      text: 'Los isótopos son átomos del mismo elemento que poseen: igual número de protones; diferente número de neutrones. Por eso presentan el mismo número atómico, pero distinto número másico.',
    },

    { type: 'heading', level: 2, text: '8. Iones' },
    {
      type: 'paragraph',
      text: 'Un ion es una especie con carga eléctrica neta debido a una pérdida o ganancia de electrones. Si un átomo pierde electrones: queda con carga positiva. Si gana electrones: queda con carga negativa. El número de protones no cambia al formar un ion mediante transferencia de electrones.',
    },

    { type: 'heading', level: 2, text: '9. Modelos atómicos' },
    {
      type: 'paragraph',
      text: 'Los modelos científicos pueden cambiar cuando aparece nueva evidencia. A lo largo del desarrollo de la teoría atómica se propusieron diferentes representaciones del átomo. Experimentos posteriores permitieron modificar modelos anteriores. Esto muestra que los modelos científicos son explicaciones construidas y evaluadas mediante evidencia.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de estructura atómica: identifica Z; determina el número de protones; usa A = Z + N si corresponde; compara protones para identificar el elemento; compara neutrones para reconocer isótopos; compara protones y electrones para determinar la carga; distingue cambios de modelo de cambios reales en la identidad del átomo.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es el número atómico de P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '16.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El número atómico corresponde al número de protones. P posee 8 protones.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué relación existe entre P y Q?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Son elementos diferentes porque tienen distinto número de neutrones.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Son isótopos del mismo elemento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Son el mismo ion.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Poseen diferente número atómico.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'P y Q tienen 8 protones, por lo que pertenecen al mismo elemento, pero poseen distinto número de neutrones.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es el número másico de Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '18.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'A = protones + neutrones = 8 + 10 = 18.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál especie posee carga eléctrica neta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R posee 11 protones y 10 electrones, por lo que tiene una carga neta positiva.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál afirmación sobre R es correcta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es un anión porque posee más protones que electrones.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Es neutro porque la diferencia entre protones y electrones es pequeña.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es un elemento con número atómico 10.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es un catión con carga +1 porque posee un protón más que electrones.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R tiene 11 protones y 10 electrones, por lo que su carga neta es +1.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué idea está mejor respaldada por el hecho de que la mayoría de las partículas atravesara la lámina con poca desviación?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Gran parte del volumen atómico no contiene una concentración densa de carga positiva.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Todo el átomo posee carga positiva distribuida uniformemente en una estructura sólida.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los electrones están dentro del núcleo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El átomo no contiene partículas subatómicas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si la mayor parte de las partículas atraviesa sin grandes desviaciones, la materia del átomo no está distribuida uniformemente como una región densa.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué observación apoya más directamente la existencia de una región pequeña y concentrada?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que todas las partículas se detuvieron.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que una pequeña fracción sufrió desviaciones muy grandes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que ninguna partícula cambió de dirección.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que la lámina tenía masa.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las grandes desviaciones de unas pocas partículas son consistentes con encuentros cercanos con una región pequeña y fuertemente concentrada.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué principio sobre los modelos científicos ilustra mejor esta situación?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Un modelo nunca puede modificarse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los modelos se eligen según preferencias personales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Nueva evidencia puede llevar a modificar un modelo previo.' }, correct: true },
        {
          content: { type: 'paragraph', order: 0, text: 'Un modelo científico debe representar literalmente cada detalle de la realidad.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evidencia experimental puede mostrar limitaciones de un modelo anterior y justificar la construcción de uno nuevo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Por qué no sería correcto concluir que todas las partículas del átomo están concentradas exclusivamente en el núcleo?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el experimento demuestra que no existen protones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los electrones poseen carga positiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el número atómico depende solo de neutrones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la evidencia sobre una región central concentrada no implica que electrones y otras propiedades estén localizados del mismo modo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento aporta evidencia sobre una concentración central de carga positiva y masa, pero no permite ubicar todas las partículas subatómicas en el mismo lugar.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál conclusión integra mejor las observaciones experimentales?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los resultados son consistentes con un átomo que posee una región central pequeña y concentrada, rodeada por un volumen mucho mayor donde se distribuyen los electrones.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los resultados demuestran que el átomo es completamente macizo y uniforme.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas las partículas positivas atraviesan cualquier material sin interacción.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La desviación de partículas demuestra que protones y electrones poseen la misma carga.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La combinación de muchas trayectorias poco desviadas y unas pocas desviaciones intensas es consistente con un núcleo pequeño y concentrado dentro de un átomo cuyo volumen total es mucho mayor.',
        },
      ],
    },
  ],
};

export default modelosAtomicosParticulasSubatomicasIones;
