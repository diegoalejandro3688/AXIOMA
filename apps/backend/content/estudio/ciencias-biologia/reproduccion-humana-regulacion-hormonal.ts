// CONTENT-C2A -- Ciencias / U1 "Biología", Recurso 7 (order 7 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R7 -- C B A D C A D B C A.
// Tabla editorial de la Situación A (Momento/FSH/LH/Estrógenos/Progesterona)
// representada como filas de párrafo con "|" -- FORMAT_ONLY, valores
// Media/Baja/Alta/Muy alta preservados exactamente.
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
  { type: 'heading', level: 3, text: 'Situación A — Cambios hormonales durante un ciclo' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó datos simplificados de cuatro momentos de un ciclo reproductivo.' },
  { type: 'paragraph', text: '| Momento | FSH | LH | Estrógenos | Progesterona |' },
  { type: 'paragraph', text: '| 1 | Media | Baja | Baja | Baja |' },
  { type: 'paragraph', text: '| 2 | Media | Media | Alta | Baja |' },
  { type: 'paragraph', text: '| 3 | Baja | Muy alta | Alta | Baja |' },
  { type: 'paragraph', text: '| 4 | Baja | Baja | Media | Alta |' },
  { type: 'paragraph', text: 'Los estudiantes sabían que el momento 3 coincidía aproximadamente con la ovulación.' },
  { type: 'paragraph', text: 'También observaron que el aumento de progesterona se producía después de ese momento.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — Una señal hormonal y el endometrio' },
  { type: 'paragraph', text: 'Una investigadora estudió células del endometrio cultivadas bajo tres condiciones.' },
  { type: 'paragraph', text: 'En el grupo X no agregó hormonas.' },
  {
    type: 'paragraph',
    text: 'En el grupo Y agregó progesterona y observó cambios asociados con la mantención de determinadas características del tejido.',
  },
  {
    type: 'paragraph',
    text: 'En el grupo Z agregó la misma cantidad de progesterona, pero antes bloqueó los receptores capaces de reconocerla.',
  },
  { type: 'paragraph', text: 'Las células del grupo Z mostraron una respuesta mucho menor que las del grupo Y.' },
  {
    type: 'paragraph',
    text: 'La investigadora propuso que el efecto de la progesterona dependía de la capacidad de las células para reconocer esa señal.',
  },
];

const reproduccionHumanaRegulacionHormonal: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 7,
  title: 'Reproducción humana y regulación hormonal',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar aspectos básicos de la reproducción humana, relacionando formación de gametos, fecundación, ciclo ovárico y ciclo uterino con la acción coordinada de señales hormonales, y analizando cómo cambios en estas señales pueden modificar los procesos reproductivos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Reproducción humana y regulación hormonal' },

    { type: 'heading', level: 2, text: '1. Reproducción sexual' },
    {
      type: 'paragraph',
      text: 'La reproducción sexual implica la participación de células especializadas llamadas gametos. En humanos: los gametos masculinos son los espermatozoides; los gametos femeninos son los ovocitos. Los gametos poseen la mitad del número de cromosomas característico de las células somáticas. Esto permite que la fecundación restablezca el número cromosómico de la especie.',
    },

    { type: 'heading', level: 2, text: '2. Gametogénesis' },
    {
      type: 'paragraph',
      text: 'La gametogénesis corresponde al proceso mediante el cual se forman gametos. Está relacionada con la meiosis. Durante la gametogénesis: se reduce el número cromosómico; se generan células especializadas; pueden producirse diferencias entre los gametos formados. La formación de gametos no ocurre de la misma manera en todos los sexos.',
    },

    { type: 'heading', level: 2, text: '3. Fecundación' },
    {
      type: 'paragraph',
      text: 'La fecundación corresponde a la unión de los gametos. Como resultado, se forma una célula con material genético proveniente de ambos progenitores. La fecundación: restablece el número diploide de cromosomas; combina información genética; inicia una nueva secuencia de desarrollo.',
    },

    { type: 'heading', level: 2, text: '4. Ciclo ovárico' },
    {
      type: 'paragraph',
      text: 'En el ovario ocurren cambios cíclicos relacionados con el desarrollo y liberación de un ovocito. De forma general pueden distinguirse: desarrollo folicular, ovulación y actividad posterior del tejido ovárico. Estos procesos están regulados hormonalmente.',
    },

    { type: 'heading', level: 2, text: '5. Ciclo uterino' },
    {
      type: 'paragraph',
      text: 'El revestimiento interno del útero también experimenta cambios cíclicos. Durante el ciclo: puede regenerarse; aumentar su grosor; mantenerse durante un período; desprenderse parcialmente si no ocurre embarazo. Los cambios uterinos están coordinados con señales hormonales.',
    },

    { type: 'heading', level: 2, text: '6. FSH y desarrollo folicular' },
    {
      type: 'paragraph',
      text: 'La hormona foliculoestimulante, FSH, participa en el desarrollo de estructuras foliculares en el ovario. Durante este proceso también cambian los niveles de otras hormonas. La regulación funciona como una red y no como una secuencia independiente de señales aisladas.',
    },

    { type: 'heading', level: 2, text: '7. LH y ovulación' },
    {
      type: 'paragraph',
      text: 'La hormona luteinizante, LH, participa en eventos relacionados con la ovulación. Un aumento marcado de LH puede asociarse temporalmente con la liberación del ovocito. Observar una relación temporal no significa que cualquier aumento hormonal produzca por sí solo todos los cambios del ciclo.',
    },

    { type: 'heading', level: 2, text: '8. Estrógenos y progesterona' },
    {
      type: 'paragraph',
      text: 'Los estrógenos y la progesterona participan en la coordinación de cambios ováricos y uterinos. En términos generales: los estrógenos participan en cambios del tejido uterino y otros procesos reproductivos; la progesterona contribuye a mantener determinadas condiciones del endometrio después de la ovulación. Sus niveles varían durante el ciclo.',
    },

    { type: 'heading', level: 2, text: '9. Coordinación hormonal' },
    {
      type: 'paragraph',
      text: 'El ciclo reproductivo depende de interacción entre señales. Una modificación en una hormona puede influir en: desarrollo folicular, ovulación, características del endometrio y liberación de otras hormonas. Por eso, el análisis debe considerar relaciones entre variables y momentos del ciclo.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre regulación reproductiva: identifica qué etapa del ciclo se observa; ubica el cambio hormonal relevante; diferencia asociación temporal de causa; relaciona señal con estructura blanco; analiza qué variable cambia después; compara tendencias en gráficos o tablas; evita explicar todo el ciclo mediante una sola hormona.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué hormona presenta su mayor nivel en el momento asociado con la ovulación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Progesterona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'FSH.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'LH.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Estrógenos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra que la LH alcanza un nivel muy alto en el momento 3, asociado temporalmente con la ovulación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué hormona aumenta principalmente después de la ovulación en los datos mostrados?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'FSH.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Progesterona.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'LH.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguna.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En el momento 4 la progesterona alcanza su nivel más alto, después del momento asociado con la ovulación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por los datos?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'El aumento pronunciado de LH ocurre alrededor del momento asociado con la ovulación.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La progesterona es máxima antes de cualquier cambio ovárico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas las hormonas alcanzan su máximo al mismo tiempo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La FSH desaparece completamente durante todo el ciclo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran una coincidencia temporal clara entre el máximo de LH y el momento de ovulación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Por qué sería incorrecto concluir, usando solo esta tabla, que la LH es la única hormona relevante para el ciclo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la LH no aparece en los datos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna hormona cambia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque solo la progesterona puede actuar sobre el ovario.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque varias hormonas cambian en distintos momentos y participan en procesos coordinados.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La regulación reproductiva depende de múltiples señales hormonales que varían y actúan de manera coordinada.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Qué observación experimental fortalecería más la hipótesis de que el aumento de LH participa directamente en la ovulación?',
        },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Comprobar que todas las células del organismo poseen la misma cantidad de LH.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Medir únicamente el tamaño del útero.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mostrar que al bloquear específicamente la acción de LH no ocurre normalmente la ovulación, manteniendo controladas otras condiciones.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Observar que los estrógenos existen durante el ciclo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una intervención específica sobre la acción de LH permitiría evaluar de manera más directa su papel causal en la ovulación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué condición actuó como referencia sin hormona agregada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Grupo X.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Grupo Y.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Grupo Z.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguno.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El grupo X permite comparar qué ocurre en ausencia de progesterona agregada.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué diferencia principal existe entre los grupos Y y Z?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo Y posee ADN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Z recibe más progesterona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Y carece de membrana.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'En Z se bloqueó el reconocimiento de progesterona mediante sus receptores.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Ambos grupos reciben progesterona, pero en Z se impide que las células respondan normalmente a la señal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La progesterona actúa de la misma forma aunque las células no puedan reconocerla.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La respuesta celular a progesterona depende, al menos en parte, de receptores capaces de reconocerla.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los receptores producen necesariamente progesterona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El endometrio no responde a señales hormonales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reducción de la respuesta al bloquear receptores apoya que estos son necesarios para una respuesta normal a la hormona.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué es útil incluir el grupo X en el experimento?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque demuestra que todos los grupos son idénticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque reemplaza la necesidad de medir respuestas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permite comparar las respuestas hormonales con una condición sin progesterona agregada.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque evita utilizar receptores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un grupo de referencia ayuda a determinar qué cambios se asocian específicamente con la exposición hormonal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión integra mejor ambas situaciones?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La reproducción humana depende de señales hormonales coordinadas cuya acción requiere tanto cambios en sus concentraciones como la capacidad de tejidos específicos para responder a ellas.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Cada hormona actúa de manera independiente y nunca interactúa con otros procesos.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'La ovulación y los cambios uterinos ocurren sin regulación hormonal.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Todas las células responden exactamente igual a cualquier señal hormonal.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los ciclos reproductivos dependen de cambios coordinados en señales hormonales y de respuestas específicas de los tejidos blanco.',
        },
      ],
    },
  ],
};

export default reproduccionHumanaRegulacionHormonal;
