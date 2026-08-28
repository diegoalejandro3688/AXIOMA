// CONTENT-C3A -- Ciencias / U1 "Biología", Recurso 10 (order 10 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R10 -- C A D B C B D A C B.
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
  { type: 'heading', level: 3, text: 'Dos variantes frente a un cambio ambiental' },
  {
    type: 'paragraph',
    text: 'En una población de insectos existían dos variantes hereditarias de coloración: clara y oscura.',
  },
  { type: 'paragraph', text: 'Antes de un cambio ambiental, ambas variantes presentaban frecuencias similares.' },
  {
    type: 'paragraph',
    text: 'Después, la superficie donde descansaban los insectos se volvió considerablemente más oscura.',
  },
  {
    type: 'paragraph',
    text: 'Durante varias generaciones, investigadores observaron que los insectos oscuros eran detectados con menor frecuencia por ciertos depredadores y dejaban, en promedio, más descendientes.',
  },
  { type: 'paragraph', text: 'La frecuencia de la variante oscura aumentó progresivamente en la población.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Una población pequeña quedó aislada' },
  { type: 'paragraph', text: 'Una especie de ave habitaba una región extensa.' },
  {
    type: 'paragraph',
    text: 'Después de una tormenta, un pequeño grupo de individuos llegó a una isla distante y formó una nueva población.',
  },
  { type: 'paragraph', text: 'La población insular permaneció separada durante muchas generaciones.' },
  {
    type: 'paragraph',
    text: 'Al principio, algunas frecuencias genéticas de los fundadores eran diferentes de las observadas en la población original.',
  },
  { type: 'paragraph', text: 'Con el tiempo surgieron además diferencias en ciertas señales de cortejo.' },
  {
    type: 'paragraph',
    text: 'Investigadores comprobaron que los individuos de ambas poblaciones tendían a reproducirse únicamente con miembros de su propia población cuando eran puestos nuevamente en contacto.',
  },
];

const mecanismosEvolutivosFormacionEspecies: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 10,
  title: 'Mecanismos evolutivos y formación de especies',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo distintos mecanismos evolutivos modifican la frecuencia de variantes hereditarias en las poblaciones, diferenciando selección natural, deriva genética, flujo génico y mutación, y relacionando el aislamiento reproductivo con la formación de nuevas especies.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Mecanismos evolutivos y formación de especies' },

    { type: 'heading', level: 2, text: '1. Los mecanismos evolutivos' },
    {
      type: 'paragraph',
      text: 'Una población puede cambiar evolutivamente cuando varía la frecuencia de características o variantes genéticas heredables entre generaciones. Distintos procesos pueden producir esos cambios. Entre ellos: mutación; selección natural; deriva genética; flujo génico. Estos mecanismos no actúan necesariamente de manera aislada.',
    },

    { type: 'heading', level: 2, text: '2. Mutación' },
    {
      type: 'paragraph',
      text: 'Las mutaciones generan cambios en el ADN. Pueden originar nuevas variantes genéticas. Una mutación puede: ser perjudicial; ser neutra; resultar ventajosa en determinadas condiciones. La mutación genera variación, pero no significa que una variante vaya a aumentar necesariamente en una población.',
    },

    { type: 'heading', level: 2, text: '3. Selección natural' },
    {
      type: 'paragraph',
      text: 'La selección natural puede ocurrir cuando: existe variación heredable; algunos individuos sobreviven o se reproducen más que otros; esas diferencias están relacionadas con características heredables. Como consecuencia, determinadas variantes pueden aumentar su frecuencia a través de generaciones.',
    },

    { type: 'heading', level: 2, text: '4. La selección no tiene intención' },
    {
      type: 'paragraph',
      text: 'La selección natural no ocurre porque los organismos “necesiten” una característica. Las variantes ya existen o aparecen mediante procesos como mutación. Si una variante aumenta el éxito reproductivo en determinadas condiciones, puede volverse más frecuente. La evolución no persigue una meta predeterminada.',
    },

    { type: 'heading', level: 2, text: '5. Deriva genética' },
    {
      type: 'paragraph',
      text: 'La deriva genética corresponde a cambios en la frecuencia de variantes debido al azar. Puede tener efectos especialmente importantes en poblaciones pequeñas. Por ejemplo, algunos individuos pueden dejar más descendencia que otros por acontecimientos no relacionados con una ventaja adaptativa. Así, una variante puede aumentar o desaparecer simplemente por azar.',
    },

    { type: 'heading', level: 2, text: '6. Cuello de botella' },
    {
      type: 'paragraph',
      text: 'Una población puede disminuir drásticamente debido a un evento como: desastre; cambio ambiental brusco; enfermedad; reducción extrema del hábitat. Los sobrevivientes pueden contener solo una parte de la variación genética original. Aunque la población vuelva a crecer, su diversidad puede permanecer reducida. Este efecto corresponde a un caso de deriva genética.',
    },

    { type: 'heading', level: 2, text: '7. Flujo génico' },
    {
      type: 'paragraph',
      text: 'El flujo génico ocurre cuando individuos o gametos se desplazan entre poblaciones y aportan variantes genéticas. Puede: introducir alelos nuevos; modificar sus frecuencias; aumentar similitudes entre poblaciones. El flujo génico puede contrarrestar parcialmente la diferenciación entre poblaciones separadas.',
    },

    { type: 'heading', level: 2, text: '8. Aislamiento reproductivo' },
    {
      type: 'paragraph',
      text: 'Para que dos poblaciones se diferencien hasta formar especies distintas, el intercambio de genes entre ellas debe reducirse de manera importante. El aislamiento reproductivo puede ocurrir por diferencias en: territorio; época reproductiva; comportamiento; estructuras reproductivas; compatibilidad biológica. El aislamiento limita el flujo génico.',
    },

    { type: 'heading', level: 2, text: '9. Especiación' },
    {
      type: 'paragraph',
      text: 'La especiación corresponde al proceso mediante el cual pueden originarse nuevas especies. Un escenario general puede incluir: separación de poblaciones; reducción del flujo génico; acumulación de diferencias; evolución independiente; establecimiento de aislamiento reproductivo. No existe una única trayectoria obligatoria para todas las especies.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre mecanismos evolutivos: identifica qué cambió en la población; determina si el cambio depende del azar o del éxito reproductivo; observa si existe migración; identifica si apareció una nueva variante; considera el tamaño poblacional; evalúa si existe flujo génico; distingue adaptación de cambio aleatorio.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué mecanismo explica mejor el aumento de la variante oscura?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Deriva genética exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Flujo génico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Selección natural.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Aislamiento reproductivo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La variante oscura está asociada con menor detección y mayor éxito reproductivo, por lo que puede aumentar mediante selección natural.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Qué condición es necesaria para que la diferencia de color contribuya al cambio evolutivo descrito?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que la coloración sea heredable.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que todos los insectos cambien voluntariamente de color.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que desaparezcan todas las mutaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que no exista reproducción.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para que una característica aumente entre generaciones mediante selección, la diferencia relevante debe poder heredarse.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Por qué sería incorrecto afirmar que los insectos oscuros aparecieron porque la población “necesitaba” camuflarse?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los organismos pueden elegir sus mutaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el ambiente no influye sobre la supervivencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la selección natural siempre reduce la variación.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la selección actúa sobre variación existente o generada sin una finalidad dirigida por las necesidades del organismo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evolución no produce variantes porque sean necesarias; las condiciones ambientales influyen sobre qué variantes dejan más descendencia.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué dato permite relacionar más directamente la coloración con selección natural?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El número total de especies de insectos del ecosistema.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los individuos oscuros dejaron, en promedio, más descendientes que los claros.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La población contenía ADN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los depredadores también evolucionaban.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La selección natural depende de diferencias heredables asociadas con éxito reproductivo diferencial.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué resultado debilitaría más la explicación basada en selección natural?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Confirmar que la coloración se transmite a la descendencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Observar que la superficie permaneció oscura.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Encontrar que ambas variantes presentan la misma supervivencia y el mismo éxito reproductivo bajo las condiciones estudiadas.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Detectar individuos claros y oscuros en la misma generación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si ambas variantes tienen el mismo éxito reproductivo, disminuye la evidencia de que la diferencia de color esté siendo favorecida por selección.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué proceso redujo inicialmente el flujo génico entre ambas poblaciones?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumento de la tasa de mutación en todo el planeta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Separación geográfica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Desaparición del ADN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Igualdad completa entre ambientes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La llegada de un pequeño grupo a una isla generó separación geográfica y redujo el intercambio de genes con la población original.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Por qué las frecuencias genéticas iniciales de la población insular podían diferir de las de la población original?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las mutaciones son adaptativas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la selección natural siempre produce frecuencias idénticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las aves de la isla dejaron de poseer cromosomas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque un grupo pequeño de fundadores puede contener por azar una muestra no representativa de la variación original.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando pocos individuos originan una población, el azar puede hacer que sus frecuencias genéticas difieran de las de la población de origen.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué mecanismo describe mejor ese cambio inicial debido al pequeño número de fundadores?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Deriva genética.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Flujo génico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transcripción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Homeostasis.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El efecto de un grupo fundador pequeño es un ejemplo de deriva genética, ya que las frecuencias cambian por muestreo aleatorio.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué evidencia indica que comenzó a desarrollarse aislamiento reproductivo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ambas poblaciones poseen plumas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La isla está rodeada de agua.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al reencontrarse, los individuos tienden a reproducirse con miembros de su propia población.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Ambas poblaciones pertenecían originalmente a la misma especie.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una preferencia reproductiva que reduce los cruces entre poblaciones constituye evidencia de aislamiento reproductivo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál interpretación integra mejor los datos?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La separación geográfica produce automáticamente nuevas especies en una sola generación.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La separación redujo el flujo génico y permitió que procesos como deriva, selección y acumulación de diferencias contribuyeran a una divergencia que terminó asociándose con aislamiento reproductivo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La deriva genética solo ocurre en poblaciones muy grandes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dos poblaciones aisladas necesariamente evolucionan de manera idéntica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La especiación puede involucrar aislamiento, reducción del flujo génico y acumulación de diferencias mediante distintos mecanismos evolutivos a lo largo de generaciones.',
        },
      ],
    },
  ],
};

export default mecanismosEvolutivosFormacionEspecies;
