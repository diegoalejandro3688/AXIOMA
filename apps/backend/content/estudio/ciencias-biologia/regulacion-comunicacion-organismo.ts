// CONTENT-C2A -- Ciencias / U1 "Biología", Recurso 6 (order 6 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R6 -- B A D C B C A D B C.
// Tabla editorial de la Situación A representada como filas de párrafo con "|"
// (schema sin tipo `table`) -- FORMAT_ONLY, valores 90/135/115/94 preservados.
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
  { type: 'heading', level: 3, text: 'Situación A — Regulación después de una comida' },
  {
    type: 'paragraph',
    text: 'Un grupo de estudiantes midió la concentración relativa de glucosa sanguínea en una persona antes y después de una comida.',
  },
  { type: 'paragraph', text: '| Tiempo | Glucosa relativa |' },
  { type: 'paragraph', text: '| Antes de comer | 90 |' },
  { type: 'paragraph', text: '| 30 minutos | 135 |' },
  { type: 'paragraph', text: '| 60 minutos | 115 |' },
  { type: 'paragraph', text: '| 120 minutos | 94 |' },
  {
    type: 'paragraph',
    text: 'Los estudiantes observaron que la glucosa aumentó después de la comida y luego se aproximó nuevamente al valor inicial.',
  },
  { type: 'paragraph', text: 'Propusieron que una respuesta hormonal contribuía a disminuir la alteración.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — Una misma hormona no afectaba a todas las células' },
  { type: 'paragraph', text: 'Una investigadora cultivó tres tipos celulares y agregó la misma hormona al medio.' },
  { type: 'paragraph', text: 'Las células X respondieron aumentando la captación de una sustancia.' },
  { type: 'paragraph', text: 'Las células Y no presentaron cambios detectables.' },
  { type: 'paragraph', text: 'Las células Z modificaron su actividad metabólica.' },
  {
    type: 'paragraph',
    text: 'Al analizar las membranas celulares, observó que X y Z poseían receptores capaces de reconocer la hormona, mientras que Y carecía de esos receptores.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora propuso que la respuesta dependía de la presencia de receptores específicos y también del tipo celular.',
  },
];

const regulacionComunicacionOrganismo: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 6,
  title: 'Regulación y comunicación en el organismo',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo el organismo mantiene condiciones internas relativamente estables mediante mecanismos de regulación y comunicación hormonal, relacionando estímulos, hormonas, células blanco y retroalimentación con la mantención de la homeostasis.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Regulación y comunicación en el organismo' },

    { type: 'heading', level: 2, text: '1. Homeostasis' },
    {
      type: 'paragraph',
      text: 'La homeostasis corresponde a la capacidad del organismo para mantener determinadas variables internas dentro de rangos compatibles con su funcionamiento. Entre las variables que pueden regularse se encuentran: concentración de glucosa, temperatura, disponibilidad de agua y concentración de ciertas sustancias. Homeostasis no significa que las condiciones internas sean completamente constantes. Significa que existen mecanismos capaces de responder a cambios.',
    },

    { type: 'heading', level: 2, text: '2. Variables reguladas' },
    {
      type: 'paragraph',
      text: 'Una variable regulada puede aumentar o disminuir debido a cambios internos o externos. El organismo puede detectar esas modificaciones y activar respuestas. Por ejemplo, después de consumir alimentos puede aumentar temporalmente la concentración de glucosa en la sangre. El sistema regulador responde para evitar que la alteración se mantenga indefinidamente.',
    },

    { type: 'heading', level: 2, text: '3. Comunicación entre células' },
    {
      type: 'paragraph',
      text: 'Las células pueden comunicarse mediante señales. Una señal puede ser reconocida por células capaces de responder a ella. Esto permite coordinar funciones entre diferentes tejidos y órganos. No todas las células responden necesariamente a todas las señales.',
    },

    { type: 'heading', level: 2, text: '4. Hormonas' },
    {
      type: 'paragraph',
      text: 'Las hormonas son señales químicas producidas por determinadas células o tejidos. Pueden transportarse y actuar sobre células blanco. Una hormona puede modificar procesos como: captación de sustancias, almacenamiento, liberación de moléculas, actividad metabólica y crecimiento.',
    },

    { type: 'heading', level: 2, text: '5. Células blanco' },
    {
      type: 'paragraph',
      text: 'Una célula blanco posee estructuras que permiten reconocer una señal determinada. Estas estructuras suelen denominarse receptores. Por eso, aunque una hormona circule por distintas partes del organismo, solo ciertas células responden de manera específica. La presencia de una señal no implica que todas las células reaccionen igual.',
    },

    { type: 'heading', level: 2, text: '6. Retroalimentación negativa' },
    {
      type: 'paragraph',
      text: 'Muchos mecanismos homeostáticos funcionan mediante retroalimentación negativa. En términos generales: 1. una variable se aleja de cierto rango; 2. se detecta el cambio; 3. se activa una respuesta; 4. la respuesta tiende a disminuir la alteración inicial. Esto contribuye a estabilizar la variable.',
    },

    { type: 'heading', level: 2, text: '7. Regulación de la glucosa' },
    {
      type: 'paragraph',
      text: 'La concentración de glucosa en la sangre constituye un ejemplo clásico de regulación. Después de una comida puede aumentar. En respuesta, determinadas células pueden liberar insulina. La insulina favorece procesos que ayudan a reducir la glucosa sanguínea.',
    },

    { type: 'heading', level: 2, text: '8. Insulina' },
    {
      type: 'paragraph',
      text: 'La insulina puede favorecer: entrada de glucosa a ciertas células, utilización de glucosa y almacenamiento de glucosa en determinadas formas. Como resultado, puede contribuir a que una concentración elevada vuelva hacia valores menores.',
    },

    { type: 'heading', level: 2, text: '9. Glucagón' },
    {
      type: 'paragraph',
      text: 'Cuando la glucosa sanguínea disminuye, otra señal hormonal relevante es el glucagón. Este puede favorecer procesos que permiten aumentar nuevamente la disponibilidad de glucosa en la sangre. Insulina y glucagón participan en respuestas distintas según el estado del organismo.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de regulación: identifica la variable; determina qué cambio ocurrió; identifica la señal; reconoce la célula o tejido blanco; determina el efecto de la respuesta; decide si la respuesta reduce o aumenta la alteración inicial; evita confundir señal con resultado final.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué variable se está regulando principalmente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Número de cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Concentración de glucosa en la sangre.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Cantidad de ADN celular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Longitud de los huesos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento registra cambios en la concentración relativa de glucosa sanguínea a lo largo del tiempo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué ocurre inicialmente después de la comida?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumenta la glucosa sanguínea.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Desaparece la glucosa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La concentración permanece exactamente igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se duplica el número de células.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran un aumento desde 90 hasta 135 unidades relativas después de la comida.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué hormona sería coherente con una respuesta destinada a disminuir la glucosa elevada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una señal que impida toda captación de glucosa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una hormona que aumente aún más la liberación de glucosa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una señal que destruya las células blanco.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Insulina.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La insulina favorece procesos que contribuyen a disminuir una concentración elevada de glucosa sanguínea.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Por qué el cambio entre 30 y 120 minutos es compatible con retroalimentación negativa?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque la respuesta mantiene la glucosa cada vez más alejada del valor inicial.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna señal participa en el proceso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la respuesta tiende a reducir la alteración inicial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque la glucosa aumenta indefinidamente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La concentración elevada disminuye progresivamente y se aproxima nuevamente al valor previo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuál resultado apoyaría mejor la hipótesis de que la insulina participa en la disminución observada?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Que la concentración de glucosa aumente después de bloquear toda respuesta hormonal.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que al bloquear específicamente la acción de la insulina, la glucosa permanezca elevada durante más tiempo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que el número de cromosomas cambie después de comer.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que todas las células produzcan exactamente la misma hormona.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si bloquear la acción de insulina dificulta el retorno de la glucosa hacia valores menores, eso apoyaría su participación en la regulación.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué característica explica principalmente que la célula Y no respondiera?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Poseía demasiadas mitocondrias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tenía un núcleo más grande.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Carecía de receptores para esa hormona.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Presentaba ADN.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una célula necesita reconocer la señal para responder; la ausencia del receptor impide esa respuesta específica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por las respuestas diferentes de X y Z?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Una misma señal puede producir efectos distintos según el tipo de célula blanco.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todas las células responden de manera idéntica a una hormona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los receptores destruyen siempre la hormona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una hormona solo puede actuar sobre una célula.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Aunque ambas células reconocen la hormona, su respuesta depende de las características y funciones propias de cada tipo celular.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué variable debería modificarse para probar directamente la importancia del receptor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El color del recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El tamaño del laboratorio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número de cromosomas de otra especie.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La presencia o ausencia del receptor en células comparables.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Comparar células equivalentes que difieran en la presencia del receptor permitiría evaluar directamente su papel en la respuesta hormonal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué afirmación describe mejor una célula blanco?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una célula que necesariamente produce la hormona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una célula capaz de reconocer una señal y responder a ella.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una célula sin membrana plasmática.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una célula que siempre responde a cualquier hormona.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las células blanco poseen receptores específicos que les permiten reconocer determinadas señales y generar respuestas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión integra mejor ambas situaciones?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La homeostasis depende de que todas las células realicen exactamente la misma función.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las hormonas actúan siempre sin receptores.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La regulación requiere señales que sean reconocidas por células específicas y respuestas que contribuyan a modificar una variable del organismo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La retroalimentación negativa aumenta siempre la alteración inicial.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La regulación homeostática depende de señales, células blanco y respuestas coordinadas que ayudan a ajustar variables internas.',
        },
      ],
    },
  ],
};

export default regulacionComunicacionOrganismo;
