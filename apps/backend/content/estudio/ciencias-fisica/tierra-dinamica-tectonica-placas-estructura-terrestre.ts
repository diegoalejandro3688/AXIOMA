// PHYSICS-C2A -- Ciencias / U2 "Física", Recurso 7 (order 7 en U2).
// Abre el bloque PHYSICS-C2A (Ciencias U2 Física R19-R23).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R19 -- C A D B C B A D C B.
// Dos tablas editoriales (Situación A "Zona / Movimiento relativo /
// Observaciones" y Situación B "Distancia desde la dorsal / Edad aproximada
// de la roca") representadas como filas de párrafo con "|" -- FORMAT_ONLY.
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
  { type: 'heading', level: 3, text: 'Actividad geológica en tres zonas' },
  { type: 'paragraph', text: 'Un grupo de estudiantes comparó tres regiones tectónicas.' },
  { type: 'paragraph', text: '| Zona | Movimiento relativo | Observaciones |' },
  { type: 'paragraph', text: '| P | Las placas se separan | Ascenso de material y formación de nueva corteza |' },
  { type: 'paragraph', text: '| Q | Las placas se aproximan y una desciende bajo la otra | Fosa oceánica, sismos y volcanismo |' },
  { type: 'paragraph', text: '| R | Las placas se desplazan lateralmente | Alta actividad sísmica y escaso volcanismo asociado al límite |' },
  { type: 'paragraph', text: 'Los estudiantes intentaron relacionar cada zona con un tipo de límite de placas.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'El fondo oceánico y su edad' },
  { type: 'paragraph', text: 'Investigadores estudiaron rocas del fondo oceánico a diferentes distancias de una dorsal.' },
  { type: 'paragraph', text: 'Obtuvieron los siguientes resultados:' },
  { type: 'paragraph', text: '| Distancia desde la dorsal | Edad aproximada de la roca |' },
  { type: 'paragraph', text: '| 100 km | 5 millones de años |' },
  { type: 'paragraph', text: '| 300 km | 18 millones de años |' },
  { type: 'paragraph', text: '| 500 km | 32 millones de años |' },
  { type: 'paragraph', text: '| 700 km | 47 millones de años |' },
  { type: 'paragraph', text: 'Además, observaron un patrón similar al otro lado de la dorsal.' },
  {
    type: 'paragraph',
    text: 'Los investigadores propusieron que se estaba formando nueva corteza cerca de la dorsal y que esta se desplazaba progresivamente hacia ambos lados.',
  },
];

const tierraDinamicaTectonicaPlacasEstructuraTerrestre: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 7,
  title: 'Tierra dinámica: tectónica de placas y estructura terrestre',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la estructura interna y dinámica de la Tierra, relacionando el movimiento de placas tectónicas con sismos, volcanismo y formación de relieve, e interpretar evidencia geológica asociada a distintos tipos de límites de placas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Tierra dinámica: tectónica de placas y estructura terrestre' },

    { type: 'heading', level: 2, text: '1. La Tierra posee una estructura interna' },
    {
      type: 'paragraph',
      text: 'La Tierra no es homogénea. De forma general, puede describirse mediante regiones como: corteza; manto; núcleo. Estas regiones presentan diferencias en: composición; densidad; estado físico; comportamiento mecánico. El interior terrestre se estudia principalmente mediante evidencia indirecta.',
    },

    { type: 'heading', level: 2, text: '2. Litosfera y astenosfera' },
    {
      type: 'paragraph',
      text: 'La litosfera corresponde a una capa rígida que incluye la corteza y la parte más superficial del manto. Está fragmentada en placas tectónicas. Debajo se encuentra una región del manto superior con comportamiento más deformable denominada astenosfera. El movimiento relativo de las placas ocurre sobre escalas de tiempo geológicas.',
    },

    { type: 'heading', level: 2, text: '3. Placas tectónicas' },
    {
      type: 'paragraph',
      text: 'Las placas tectónicas son grandes fragmentos de litosfera que se desplazan unos respecto de otros. Sus velocidades suelen ser pequeñas a escala humana, pero sus efectos acumulados durante millones de años pueden producir grandes cambios. El movimiento de placas está relacionado con procesos internos de la Tierra.',
    },

    { type: 'heading', level: 2, text: '4. Límites divergentes' },
    {
      type: 'paragraph',
      text: 'En un límite divergente, dos placas se separan. Esto puede favorecer: ascenso de material desde el interior; formación de nueva corteza; actividad volcánica; expansión del fondo oceánico. Las dorsales oceánicas constituyen un ejemplo importante.',
    },

    { type: 'heading', level: 2, text: '5. Límites convergentes' },
    {
      type: 'paragraph',
      text: 'En un límite convergente, dos placas se aproximan. Dependiendo del tipo de placas involucradas, pueden ocurrir procesos como: subducción; formación de cordilleras; volcanismo; sismos. No todos los límites convergentes producen exactamente los mismos fenómenos.',
    },

    { type: 'heading', level: 2, text: '6. Subducción' },
    {
      type: 'paragraph',
      text: 'La subducción ocurre cuando una placa se introduce por debajo de otra. Este proceso puede estar asociado con: fosas oceánicas; actividad sísmica; volcanismo; reciclaje de material hacia el interior terrestre. En Chile, la interacción entre placas está fuertemente relacionada con estos procesos.',
    },

    { type: 'heading', level: 2, text: '7. Límites transformantes' },
    {
      type: 'paragraph',
      text: 'En un límite transformante, dos placas se desplazan lateralmente una respecto de la otra. En estos límites no se crea ni destruye necesariamente gran cantidad de litosfera. Sin embargo, la acumulación y liberación de tensión puede producir sismos.',
    },

    { type: 'heading', level: 2, text: '8. Sismos' },
    {
      type: 'paragraph',
      text: 'Un sismo ocurre cuando se libera de manera repentina energía acumulada en materiales de la corteza o litosfera. Esta energía puede propagarse mediante ondas sísmicas. Los sismos son frecuentes en zonas tectónicamente activas, especialmente cerca de límites de placas. No todos los sismos tienen el mismo origen ni magnitud.',
    },

    { type: 'heading', level: 2, text: '9. Evidencias de la tectónica de placas' },
    {
      type: 'paragraph',
      text: 'Entre las evidencias que apoyan la tectónica de placas se encuentran: distribución de sismos y volcanes; correspondencia de estructuras geológicas; expansión del fondo oceánico; patrones magnéticos en rocas oceánicas; mediciones modernas del desplazamiento de placas. Estas evidencias permiten construir y evaluar modelos sobre la dinámica terrestre.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre tectónica: identifica el tipo de límite; observa la dirección relativa de las placas; relaciona el límite con fenómenos geológicos; distingue subducción de divergencia; analiza distribución de sismos y volcanes; identifica la evidencia disponible; evita asumir que todos los límites producen los mismos efectos.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tipo de límite corresponde a la zona P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Convergente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transformante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Divergente.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Sin actividad tectónica.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En un límite divergente las placas se separan y puede formarse nueva corteza.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué proceso ocurre principalmente en la zona Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Subducción.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Expansión continental sin interacción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reflexión de ondas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evaporación del manto.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La situación indica que una placa desciende bajo otra, lo que corresponde a subducción.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tipo de límite corresponde mejor a la zona R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Divergente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Convergente con subducción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Convergente continental exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transformante.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El desplazamiento lateral entre placas caracteriza a los límites transformantes.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Por qué la zona Q presenta simultáneamente sismos y volcanismo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque las placas dejan de interactuar.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la convergencia y subducción pueden generar deformación, liberación de energía y procesos asociados con generación de magma.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque todo límite de placas produce exactamente los mismos fenómenos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el núcleo entra directamente en contacto con la corteza.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La subducción puede producir actividad sísmica por deformación y favorecer procesos vinculados con volcanismo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma que la presencia de sismos demuestra por sí sola que existe subducción. ¿Cuál evaluación es más adecuada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque solo existen sismos en zonas de subducción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque todos los sismos producen volcanes.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque también pueden producirse sismos en otros límites, como los transformantes, por lo que se requiere evidencia adicional.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque los sismos no están relacionados con tectónica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los sismos pueden ocurrir en distintos tipos de límites de placas, por lo que su presencia aislada no demuestra subducción.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Dónde se encuentran las rocas más jóvenes de las registradas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A 700 km de la dorsal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A 100 km de la dorsal.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'A 500 km de la dorsal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A 300 km de la dorsal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las rocas ubicadas a 100 km tienen una edad aproximada de 5 millones de años, la menor de la tabla.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué patrón muestran los datos?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La edad de las rocas aumenta al aumentar la distancia desde la dorsal.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todas las rocas poseen la misma edad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las rocas más antiguas están siempre en la dorsal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La edad disminuye al alejarse de la dorsal.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las rocas son progresivamente más antiguas a mayores distancias de la dorsal.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué proceso explica mejor el patrón observado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Subducción exactamente en el centro de la dorsal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ausencia completa de movimiento tectónico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desaparición periódica de la corteza continental.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Formación de nueva corteza y expansión del fondo oceánico desde la dorsal.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La creación de corteza cerca de la dorsal y su desplazamiento hacia los lados explica que las rocas más antiguas estén más alejadas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué es importante que se observe un patrón similar a ambos lados de la dorsal?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque demuestra que todas las rocas del planeta tienen la misma composición.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque indica que la dorsal no tiene relación con el movimiento de placas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque entrega evidencia consistente con una expansión hacia ambos lados desde una zona donde se forma nueva corteza.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque significa que la edad de las rocas no puede medirse.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un patrón aproximadamente simétrico apoya la idea de formación de corteza en la dorsal seguida por desplazamiento en direcciones opuestas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión integra mejor la evidencia de la situación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La corteza oceánica permanece inmóvil después de formarse.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distribución de edades del fondo oceánico constituye evidencia de movimiento de placas y formación continua de nueva corteza en límites divergentes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las dorsales solo pueden formarse en continentes.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las rocas más antiguas deben encontrarse necesariamente en el centro de toda dorsal.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La edad creciente con la distancia y el patrón a ambos lados de la dorsal son compatibles con expansión del fondo oceánico y tectónica de placas.',
        },
      ],
    },
  ],
};

export default tierraDinamicaTectonicaPlacasEstructuraTerrestre;
