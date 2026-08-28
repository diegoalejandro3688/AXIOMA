// CHEMISTRY-C1A -- Ciencias / U3 "Química", Recurso 3 (order 3 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R26 -- A C B D A C B D A C.
// Tabla editorial de la Situación A ("Proceso / Observación") representada
// como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan EXACTAMENTE
// los valores 22 °C y 29 °C (símbolo de grado °).
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
  { type: 'heading', level: 3, text: 'Cuatro transformaciones observadas' },
  { type: 'paragraph', text: 'Un grupo de estudiantes registró cuatro procesos.' },
  { type: 'paragraph', text: '| Proceso | Observación |' },
  { type: 'paragraph', text: '| P | Un cubo de hielo se derrite y forma agua líquida. |' },
  { type: 'paragraph', text: '| Q | Dos soluciones transparentes se mezclan y aparece un sólido blanco. |' },
  { type: 'paragraph', text: '| R | Una lámina metálica es doblada sin cambiar su composición. |' },
  { type: 'paragraph', text: '| S | Una sustancia reacciona y se observa desprendimiento de gas junto con aumento de temperatura. |' },
  { type: 'paragraph', text: 'Los estudiantes debían clasificar los procesos.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Una reacción entre dos soluciones' },
  { type: 'paragraph', text: 'Un equipo mezcló dos soluciones incoloras en un vaso de precipitados.' },
  { type: 'paragraph', text: 'Antes de mezclarlas, ambas se encontraban a 22 °C.' },
  { type: 'paragraph', text: 'Después de combinarlas, observaron:' },
  {
    type: 'paragraph',
    text: 'aparición de una coloración amarilla; formación de un sólido fino; aumento de temperatura hasta 29 °C; ausencia de una fuente externa de calentamiento.',
  },
  { type: 'paragraph', text: 'Luego filtraron la mezcla y recuperaron el sólido formado.' },
];

const cambiosFisicosCambiosQuimicosEvidenciasExperimentales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 3,
  title: 'Cambios físicos, cambios químicos y evidencias experimentales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá distinguir cambios físicos de cambios químicos a partir de la conservación o transformación de las sustancias, e interpretar evidencias experimentales como formación de gas, precipitado, cambio de color y variaciones de temperatura para evaluar si ocurrió una reacción química.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Cambios físicos, cambios químicos y evidencias experimentales' },

    { type: 'heading', level: 2, text: '1. Cambios físicos' },
    {
      type: 'paragraph',
      text: 'Un cambio físico modifica alguna propiedad o estado de un material sin formar necesariamente una sustancia nueva. Ejemplos: fusión; evaporación; trituración; deformación; disolución. En un cambio físico, la identidad química de las sustancias puede mantenerse.',
    },

    { type: 'heading', level: 2, text: '2. Cambios de estado' },
    {
      type: 'paragraph',
      text: 'Los cambios de estado son ejemplos frecuentes de cambios físicos. Entre ellos se encuentran: fusión; solidificación; vaporización; condensación; sublimación. Durante estos procesos, la sustancia puede cambiar de estado físico sin cambiar su composición química.',
    },

    { type: 'heading', level: 2, text: '3. Cambios químicos' },
    {
      type: 'paragraph',
      text: 'Un cambio químico implica la formación de una o más sustancias nuevas. Las sustancias iniciales se denominan reactivos. Las sustancias formadas se denominan productos. Durante una reacción química, los átomos se reorganizan para formar nuevas combinaciones.',
    },

    { type: 'heading', level: 2, text: '4. Evidencias de una reacción química' },
    {
      type: 'paragraph',
      text: 'Algunas observaciones pueden sugerir que ocurrió una reacción química. Entre ellas: cambio de color; formación de gas; formación de un sólido; emisión de luz; cambio de temperatura. Estas observaciones deben interpretarse en contexto. No toda modificación visible demuestra por sí sola una reacción química.',
    },

    { type: 'heading', level: 2, text: '5. Formación de gas' },
    {
      type: 'paragraph',
      text: 'Si durante un proceso aparece un gas que no estaba presente inicialmente, esto puede constituir evidencia de una reacción química. Por ejemplo, pueden observarse: burbujas; efervescencia; expansión. Sin embargo, la aparición de burbujas también puede deberse a un cambio físico, como ebullición.',
    },

    { type: 'heading', level: 2, text: '6. Formación de precipitado' },
    {
      type: 'paragraph',
      text: 'Cuando dos soluciones se mezclan y aparece un sólido insoluble, este sólido se denomina precipitado. La formación de un precipitado puede indicar que se produjo una nueva sustancia. Este fenómeno es diferente de simplemente agregar un sólido que ya existía.',
    },

    { type: 'heading', level: 2, text: '7. Cambios de temperatura' },
    {
      type: 'paragraph',
      text: 'Una reacción química puede liberar o absorber energía. Por eso puede observarse un cambio de temperatura incluso si no existe calentamiento externo. Sin embargo, un cambio de temperatura causado directamente por una fuente externa no demuestra por sí solo una reacción química.',
    },

    { type: 'heading', level: 2, text: '8. Cambios de color' },
    {
      type: 'paragraph',
      text: 'Un cambio de color puede ser evidencia de reacción química si está asociado a la formación de nuevas sustancias. Pero también puede ocurrir por fenómenos físicos como: mezcla de colores; cambio de iluminación; concentración. Se necesita analizar el proceso completo.',
    },

    { type: 'heading', level: 2, text: '9. Reversibilidad' },
    {
      type: 'paragraph',
      text: 'No conviene clasificar un proceso solo según si parece reversible. Algunos cambios físicos pueden ser difíciles de revertir y algunas reacciones químicas pueden ser reversibles bajo determinadas condiciones. El criterio principal es si cambia la identidad química de las sustancias.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre transformaciones: identifica las sustancias iniciales; analiza qué ocurre durante el proceso; determina si aparecen sustancias nuevas; distingue cambio de estado de reacción química; interpreta las evidencias experimentales; evita usar una sola señal de manera automática; relaciona la observación con la identidad química de las sustancias.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tipo de cambio ocurre principalmente en P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Cambio físico.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Cambio químico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reacción de combustión necesariamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Formación de un elemento nuevo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El hielo y el agua líquida corresponden a la misma sustancia en estados físicos diferentes.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué observación de Q constituye una evidencia importante de cambio químico?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las soluciones eran transparentes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se utilizó un recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se formó un sólido nuevo al mezclar las soluciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ambas soluciones eran líquidas inicialmente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La formación de un precipitado puede indicar que apareció una sustancia nueva.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cómo se clasifica mejor el proceso R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Cambio químico porque cambió la forma.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Cambio físico porque se modificó la forma sin cambiar la composición.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Reacción química porque el metal sigue siendo sólido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Formación de un compuesto nuevo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Doblar una lámina modifica su forma, pero no necesariamente altera su identidad química.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué combinación de evidencias de S apoya mejor que ocurrió una reacción química?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo que la sustancia estaba en un recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo que la sustancia tenía masa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo que el experimento ocurrió rápidamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desprendimiento de gas y cambio de temperatura asociados al proceso.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La aparición de gas junto con un cambio térmico sin calentamiento externo aporta evidencia consistente con una reacción química.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “Todo proceso que produce burbujas es necesariamente una reacción química”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta, porque las burbujas también pueden formarse en procesos físicos como la ebullición.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque todo gas es una sustancia nueva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta únicamente si el líquido es agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque las reacciones químicas nunca producen gases.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La presencia de burbujas debe interpretarse en contexto; en una ebullición, por ejemplo, se forma vapor por un cambio de estado.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué evidencia observada es consistente con la formación de una sustancia nueva?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El vaso era transparente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las soluciones tenían volumen.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se formó un sólido durante la mezcla.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las sustancias estaban inicialmente en estado líquido.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La aparición de un precipitado al mezclar las soluciones puede indicar que se formó una nueva sustancia.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué interpretación es más adecuada para el aumento de 22 °C a 29 °C?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que toda reacción debe alcanzar 29 °C.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Indica que durante el proceso se produjo una transferencia de energía asociada a la reacción.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que el vaso agregó energía química.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Significa que las soluciones dejaron de tener masa.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Como no hubo calentamiento externo, el aumento de temperatura es consistente con liberación de energía durante el proceso.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Por qué la aparición de una coloración amarilla puede considerarse evidencia adicional, pero no debería evaluarse de manera aislada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el color nunca se relaciona con reacciones químicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque solo los sólidos pueden cambiar de color.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque toda sustancia amarilla es un elemento.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque cambios de color también pueden tener causas físicas, por lo que debe analizarse junto con otras observaciones.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El cambio de color aporta evidencia, pero resulta más convincente cuando coincide con otras señales como precipitación y cambio de temperatura.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué función cumple la filtración realizada al final?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Permite separar físicamente el sólido formado del líquido restante.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Convierte nuevamente los productos en reactivos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impide que haya ocurrido una reacción química.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Hace desaparecer el precipitado mediante una reacción.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La filtración separa un sólido insoluble del líquido sin determinar por sí misma la naturaleza química del sólido.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión está mejor respaldada por el conjunto de datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo ocurrió un cambio físico porque las sustancias iniciales eran líquidas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento de temperatura por sí solo prueba cualquier reacción química posible.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La formación de un sólido, el cambio de color y el aumento de temperatura en ausencia de calentamiento externo constituyen evidencia conjunta consistente con una reacción química.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda mezcla de dos soluciones produce obligatoriamente sustancias nuevas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Varias evidencias independientes apoyan la interpretación de que las sustancias iniciales se transformaron y se formaron productos nuevos.',
        },
      ],
    },
  ],
};

export default cambiosFisicosCambiosQuimicosEvidenciasExperimentales;
