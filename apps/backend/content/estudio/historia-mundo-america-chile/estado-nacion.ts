// CONTENT-H1A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 2. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts.
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const textoA: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto A — Una escuela para ciudadanos' },
  { type: 'paragraph', text: 'En 1872, un funcionario de un Estado europeo recientemente unificado defendía ante el parlamento la expansión de la educación pública:' },
  {
    type: 'paragraph',
    text: 'No basta con que nuestras provincias respondan a un mismo gobierno. Durante generaciones han utilizado costumbres distintas y, en algunas regiones, incluso formas diferentes de hablar.',
  },
  {
    type: 'paragraph',
    text: 'Si queremos construir una comunidad política duradera, los niños deben conocer las mismas leyes fundamentales, comprender los deberes de la ciudadanía y reconocer símbolos que pertenezcan a todos.',
  },
  {
    type: 'paragraph',
    text: 'La escuela puede cumplir esa tarea. Allí aprenderán una lengua común para la administración, la historia de la nación y las obligaciones que corresponden a quienes forman parte de ella.',
  },
  { type: 'paragraph', text: 'No debemos esperar que la unidad política produzca automáticamente una unidad nacional. Esta debe construirse también mediante instituciones compartidas.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Fronteras, ciudadanía e identidad' },
  {
    type: 'paragraph',
    text: 'Después de las independencias americanas, los nuevos gobiernos enfrentaron un desafío que iba mucho más allá de romper los vínculos con las antiguas metrópolis.',
  },
  {
    type: 'paragraph',
    text: 'Era necesario construir Estados capaces de gobernar territorios extensos, recaudar impuestos, organizar fuerzas armadas, establecer leyes y definir fronteras.',
  },
  { type: 'paragraph', text: 'Al mismo tiempo, debían fortalecer una identidad política entre poblaciones que no necesariamente se consideraban parte de una misma comunidad nacional.' },
  {
    type: 'paragraph',
    text: 'Para ello, distintos gobiernos promovieron constituciones, símbolos patrios, celebraciones públicas y relatos históricos que destacaban acontecimientos y figuras considerados fundacionales.',
  },
  { type: 'paragraph', text: 'Sin embargo, ese proceso también produjo tensiones.' },
  {
    type: 'paragraph',
    text: 'Las fronteras de los nuevos Estados no siempre coincidieron con comunidades culturales preexistentes. Pueblos indígenas, grupos regionales y otras poblaciones podían quedar incorporados a proyectos nacionales que no reconocían plenamente sus propias formas de identidad.',
  },
  { type: 'paragraph', text: 'Además, las disputas fronterizas entre Estados vecinos se transformaron en ocasiones en conflictos diplomáticos o militares.' },
  {
    type: 'paragraph',
    text: 'Por eso, la formación de los Estados nacionales americanos fue simultáneamente un proceso de organización política, creación de identidad y disputa por territorio, ciudadanía y pertenencia.',
  },
];

const estadoNacion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 2,
  title: 'Surgimiento e impactos del Estado-nación',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el surgimiento y consolidación del Estado-nación durante el siglo XIX, reconociendo su relación con la soberanía, el territorio, las instituciones, la identidad nacional y la ciudadanía, así como sus principales impactos políticos, sociales y culturales en Europa y América.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Surgimiento e impactos del Estado-nación' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un Estado-nación?' },
    {
      type: 'paragraph',
      text: 'Un Estado es una organización política que ejerce autoridad sobre: un territorio; una población; instituciones; leyes. Una nación es una comunidad cuyos integrantes comparten o creen compartir elementos como: historia; símbolos; tradiciones; lengua; memoria colectiva; identidad. Un Estado-nación busca vincular ambas dimensiones: organización política + comunidad nacional.',
    },

    { type: 'heading', level: 2, text: '2. No todos los Estados eran naciones homogéneas' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XIX existían: imperios con múltiples pueblos; territorios divididos políticamente pero con fuertes identidades comunes; nuevos Estados con poblaciones culturalmente diversas. Por eso, Estado y nación no son exactamente lo mismo.',
    },

    { type: 'heading', level: 2, text: '3. Soberanía y territorio' },
    {
      type: 'paragraph',
      text: 'La consolidación del Estado-nación implicó definir: fronteras; autoridades; leyes; administración; capacidad de ejercer poder dentro del territorio. Un Estado que no logra controlar efectivamente su territorio tiene dificultades para consolidarse.',
    },

    { type: 'heading', level: 2, text: '4. Instituciones comunes' },
    {
      type: 'paragraph',
      text: 'Los nuevos Estados desarrollaron instituciones como: gobiernos centrales; parlamentos; tribunales; fuerzas armadas; sistemas administrativos; escuelas públicas. Estas instituciones ayudaban a extender la autoridad estatal.',
    },

    { type: 'heading', level: 2, text: '5. Identidad nacional' },
    {
      type: 'paragraph',
      text: 'Los Estados también impulsaron símbolos e ideas destinadas a fortalecer la identidad nacional. Por ejemplo: banderas; himnos; fiestas nacionales; héroes; relatos históricos; monumentos. Estos elementos ayudaban a construir un sentido de pertenencia compartido.',
    },

    { type: 'heading', level: 2, text: '6. Educación y nacionalización' },
    {
      type: 'paragraph',
      text: 'La escuela fue especialmente importante. A través de ella, los Estados podían difundir: lengua común; historia nacional; símbolos; deberes ciudadanos; valores políticos. Así, la educación no solo enseñaba conocimientos: también contribuía a formar identidad nacional.',
    },

    { type: 'heading', level: 2, text: '7. Nacionalismo' },
    {
      type: 'paragraph',
      text: 'El nacionalismo defendía la idea de que una comunidad nacional debía tener: unidad; autonomía; reconocimiento político. Pero podía adoptar formas distintas. En algunos casos favoreció: unificación política; independencia; construcción estatal. En otros, generó: exclusiones; conflictos territoriales; tensiones con minorías.',
    },

    { type: 'heading', level: 2, text: '8. Europa y América' },
    {
      type: 'paragraph',
      text: 'En Europa, el nacionalismo influyó en procesos de: unificación; independencia; conflicto entre imperios y pueblos. En América, las independencias dieron origen a nuevos Estados que debieron: establecer fronteras; crear instituciones; consolidar gobiernos; construir identidades nacionales.',
    },

    { type: 'heading', level: 2, text: '9. Impactos ambiguos' },
    {
      type: 'paragraph',
      text: 'La formación del Estado-nación tuvo efectos importantes. Positivos o integradores: leyes comunes; administración; instituciones; mayor organización territorial. Conflictivos o excluyentes: homogeneización cultural; subordinación de minorías; disputas fronterizas; nacionalismos agresivos. Por eso no debemos evaluarlo como un proceso únicamente positivo o negativo.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Cuando aparezca una fuente sobre Estado-nación: identifica quién ejerce soberanía; observa cómo se define el territorio; busca mecanismos de integración; distingue Estado de nación; analiza símbolos e identidad; reconoce posibles exclusiones; relaciona el proceso con cambios políticos del siglo XIX.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la función principal que el emisor atribuye a la escuela?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sustituir completamente al gobierno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Contribuir a formar una identidad nacional común.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar todas las diferencias económicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impedir la existencia de leyes nacionales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fuente presenta la escuela como una institución capaz de difundir leyes, símbolos, lengua e historia compartida.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué diferencia establece implícitamente el texto entre unidad política y unidad nacional?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Son exactamente lo mismo y aparecen al mismo tiempo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La unidad política puede existir antes de que se consolide una identidad nacional común.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La unidad nacional impide la existencia de instituciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La unidad política depende únicamente de la religión.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor afirma que compartir un gobierno no produce automáticamente una comunidad nacional integrada.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué elemento del texto refleja mejor el proceso de construcción del Estado-nación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La creación de instituciones comunes para integrar poblaciones diversas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de todo sistema educativo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de cualquier autoridad central.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La renuncia a utilizar símbolos compartidos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La escuela pública aparece como un instrumento estatal para fortalecer cohesión, ciudadanía e identidad común.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué posible tensión puede inferirse de la propuesta de establecer una lengua común para la administración?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Podría entrar en conflicto con lenguas o identidades regionales existentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Impediría cualquier funcionamiento del Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminaría automáticamente todas las fronteras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Garantizaría igualdad económica completa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una política de uniformidad lingüística puede fortalecer la administración estatal, pero también tensionar identidades culturales previas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál evaluación describe mejor el proceso representado en la fuente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La consolidación del Estado-nación dependía únicamente de conquistar nuevos territorios.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La construcción estatal incluía tanto instituciones políticas como mecanismos culturales destinados a producir pertenencia nacional.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los Estados nacionales rechazaban el uso de la educación como herramienta pública.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La identidad nacional surgía siempre de forma espontánea y sin intervención estatal.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fuente muestra que la consolidación nacional combinaba autoridad política con educación, símbolos, lengua e historia compartida.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál fue uno de los desafíos de los nuevos Estados americanos después de la independencia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar toda forma de gobierno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Construir instituciones capaces de ejercer autoridad sobre el territorio.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Restaurar automáticamente el sistema colonial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evitar la creación de constituciones.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala que los nuevos gobiernos necesitaban establecer leyes, recaudar impuestos, organizar fuerzas armadas y administrar sus territorios.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué propósito cumplían los símbolos patrios y celebraciones públicas mencionados en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fortalecer una identidad nacional compartida.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar completamente las instituciones estatales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impedir cualquier participación ciudadana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar los conflictos fronterizos.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Estos elementos buscaban generar pertenencia y construir una comunidad nacional alrededor del nuevo Estado.' }],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué la construcción del Estado-nación podía generar tensiones con pueblos indígenas o grupos regionales?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la identidad promovida por el Estado podía no reconocer plenamente identidades preexistentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los grupos rechazaban necesariamente cualquier forma de Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las independencias eliminaron todas las diferencias culturales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los Estados no definían territorios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La construcción de una identidad nacional común podía producir procesos de exclusión o subordinación de comunidades con identidades propias.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación establece el texto entre fronteras y consolidación estatal?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las fronteras eran irrelevantes para el funcionamiento del Estado.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Definir y controlar fronteras formaba parte del proceso de consolidación política y podía generar conflictos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las fronteras desaparecieron después de las independencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas las fronteras americanas fueron aceptadas sin disputas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los nuevos Estados necesitaban delimitar su territorio, y las diferencias sobre esos límites podían producir tensiones con Estados vecinos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes conclusiones sintetiza mejor los impactos del surgimiento del Estado-nación durante el siglo XIX?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permitió organizar instituciones y construir identidades comunes, pero también pudo producir conflictos territoriales y exclusiones culturales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Produjo sociedades completamente homogéneas y eliminó todos los conflictos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se limitó exclusivamente a crear banderas e himnos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fue un proceso exclusivamente europeo sin efectos relevantes en América.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Estado-nación contribuyó a consolidar instituciones, territorio e identidad, pero también generó tensiones vinculadas con fronteras, minorías e intentos de homogeneización.',
        },
      ],
    },
  ],
};

export default estadoNacion;
