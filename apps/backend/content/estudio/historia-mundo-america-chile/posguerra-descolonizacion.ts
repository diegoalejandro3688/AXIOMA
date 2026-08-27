// CONTENT-H3A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 7. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts (CONTENT-H1A).
//
// Answer keys: R7 usa la versión DEFINITIVA -- C A D B C A B D C B,
// verificada exactamente contra la fuente de este incremento.
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
  { type: 'heading', level: 3, text: 'Texto A — Una organización para un mundo que quería evitar otra catástrofe' },
  { type: 'paragraph', text: 'En 1945, representantes de numerosos países participaron en la creación de una nueva organización internacional.' },
  {
    type: 'paragraph',
    text: 'La experiencia reciente había demostrado que los acuerdos existentes antes de la guerra no habían sido suficientes para impedir un conflicto de enorme escala. Por ello, los gobiernos participantes buscaron establecer mecanismos más permanentes de cooperación.',
  },
  { type: 'paragraph', text: 'La nueva organización tendría espacios donde los Estados pudieran discutir problemas internacionales, coordinar acciones y buscar soluciones diplomáticas.' },
  { type: 'paragraph', text: 'También comenzó a adquirir fuerza otra preocupación: la protección de las personas no podía considerarse únicamente un asunto interno de cada gobierno.' },
  {
    type: 'paragraph',
    text: 'Durante los años siguientes, representantes de países con sistemas políticos, culturas y experiencias históricas muy diferentes debatieron qué derechos debían reconocerse a todas las personas.',
  },
  { type: 'paragraph', text: 'En 1948, esas discusiones contribuyeron a la adopción de la Declaración Universal de los Derechos Humanos.' },
  { type: 'paragraph', text: 'Ni la creación de Naciones Unidas ni la Declaración acabaron con las guerras, las persecuciones o las violaciones de derechos.' },
  {
    type: 'paragraph',
    text: 'Su importancia histórica radicó, entre otras cosas, en establecer instituciones y principios internacionales desde los cuales esas acciones podían ser discutidas, denunciadas y evaluadas.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Después de la bandera nueva' },
  { type: 'paragraph', text: 'En 1958, un territorio africano se encontraba en medio de un intenso debate sobre su futuro político.' },
  {
    type: 'paragraph',
    text: 'Durante décadas había sido administrado por una potencia europea. Sin embargo, después de la Segunda Guerra Mundial surgieron organizaciones locales que exigían que la población pudiera elegir su propio gobierno.',
  },
  {
    type: 'paragraph',
    text: 'Sus dirigentes afirmaban que si los europeos defendían principios de libertad y soberanía para sus propios países, esos mismos principios debían aplicarse también a los pueblos sometidos al dominio colonial.',
  },
  {
    type: 'paragraph',
    text: 'La potencia administradora intentó inicialmente conservar una fuerte influencia. Argumentaba que una independencia demasiado rápida podía producir problemas económicos e institucionales.',
  },
  { type: 'paragraph', text: 'Los movimientos nacionalistas respondían que esas dificultades no justificaban negar indefinidamente el derecho a gobernarse.' },
  { type: 'paragraph', text: 'Finalmente, el territorio consiguió su independencia.' },
  {
    type: 'paragraph',
    text: 'La celebración fue masiva, pero pronto comenzaron otros desafíos. Gran parte de las exportaciones dependía de unos pocos productos, muchos funcionarios especializados habían sido formados durante el sistema colonial y algunas fronteras agrupaban comunidades con historias e identidades diferentes.',
  },
  { type: 'paragraph', text: 'Además, tanto Estados Unidos como la Unión Soviética buscaban aumentar su influencia en distintas regiones del mundo.' },
  { type: 'paragraph', text: 'La independencia había resuelto una cuestión fundamental: la soberanía formal ya no pertenecía a la potencia colonial.' },
  {
    type: 'paragraph',
    text: 'Pero construir un Estado políticamente estable, económicamente menos dependiente y capaz de tomar decisiones autónomas resultó ser un proceso mucho más largo.',
  },
];

const posguerraDescolonizacion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 7,
  title: 'Nuevo orden mundial de posguerra y descolonización',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales transformaciones del orden internacional después de la Segunda Guerra Mundial, reconociendo la creación de organismos internacionales, la afirmación de los derechos humanos y el desarrollo de procesos de descolonización en Asia y África, así como las tensiones entre autodeterminación, intereses de las potencias y construcción de nuevos Estados.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Nuevo orden mundial de posguerra y descolonización' },

    { type: 'heading', level: 2, text: '1. Un mundo transformado por la guerra' },
    {
      type: 'paragraph',
      text: 'La Segunda Guerra Mundial alteró profundamente el equilibrio internacional. Entre sus consecuencias estuvieron: debilitamiento de varias potencias europeas; ascenso de Estados Unidos y la Unión Soviética; destrucción económica y material en amplias regiones; desplazamientos de población; necesidad de reconstrucción; cuestionamiento de las estructuras coloniales. El mundo posterior a 1945 no reprodujo simplemente el orden existente antes de la guerra.',
    },

    { type: 'heading', level: 2, text: '2. Un nuevo equilibrio internacional' },
    {
      type: 'paragraph',
      text: 'Después de 1945, Estados Unidos y la Unión Soviética adquirieron una influencia mundial extraordinaria. Las antiguas potencias europeas seguían siendo relevantes, pero países como Reino Unido, Francia y Alemania habían quedado profundamente afectados por la guerra. Este cambio contribuyó a formar un nuevo escenario internacional.',
    },

    { type: 'heading', level: 2, text: '3. Las Naciones Unidas' },
    {
      type: 'paragraph',
      text: 'En 1945 se creó la Organización de las Naciones Unidas (ONU). Entre sus propósitos se encontraban: mantener la paz y la seguridad internacional; promover cooperación entre Estados; favorecer soluciones diplomáticas; impulsar el respeto a los derechos humanos. La ONU no eliminó los conflictos internacionales, pero creó nuevas instituciones para abordarlos.',
    },

    { type: 'heading', level: 2, text: '4. Derechos humanos' },
    {
      type: 'paragraph',
      text: 'La experiencia de la guerra y los graves abusos cometidos durante ella fortalecieron la preocupación internacional por establecer principios universales de protección de las personas. En 1948, la Asamblea General de las Naciones Unidas adoptó la Declaración Universal de los Derechos Humanos. Esta proclamó derechos relacionados con: vida y libertad; igualdad; protección frente a discriminación; participación política; libertad de pensamiento y expresión; educación; condiciones dignas de vida.',
    },

    { type: 'heading', level: 2, text: '5. ¿Qué es la descolonización?' },
    {
      type: 'paragraph',
      text: 'La descolonización fue el proceso mediante el cual numerosos territorios sometidos a potencias coloniales lograron: independencia; soberanía; creación de Estados propios. El proceso tuvo especial importancia en Asia y África. Se intensificó durante las décadas posteriores a la Segunda Guerra Mundial.',
    },

    { type: 'heading', level: 2, text: '6. ¿Por qué avanzó la descolonización?' },
    {
      type: 'paragraph',
      text: 'No existió una única causa. Contribuyeron factores como: debilitamiento de potencias coloniales europeas; crecimiento de movimientos nacionalistas; organización política de poblaciones colonizadas; difusión del principio de autodeterminación; cambios en el sistema internacional; presión política interna y externa. Las condiciones fueron distintas en cada territorio.',
    },

    { type: 'heading', level: 2, text: '7. Independencias diferentes' },
    {
      type: 'paragraph',
      text: 'Las independencias no siguieron un único camino. Algunos procesos se desarrollaron principalmente mediante negociación, movilización política y acuerdos. Otros estuvieron acompañados por conflictos armados. Por ello, hablar de "descolonización" no significa hablar de una experiencia idéntica para todos los territorios.',
    },

    { type: 'heading', level: 2, text: '8. Autodeterminación' },
    {
      type: 'paragraph',
      text: 'La autodeterminación de los pueblos sostiene que las comunidades deben poder decidir su condición política. Esta idea adquirió creciente importancia internacional. Sin embargo, existía una tensión evidente: las potencias coloniales defendían sus intereses mientras numerosos pueblos reclamaban el derecho a gobernarse a sí mismos.',
    },

    { type: 'heading', level: 2, text: '9. Independencia no significó ausencia de dificultades' },
    {
      type: 'paragraph',
      text: 'La independencia política fue una transformación fundamental, pero los nuevos Estados enfrentaron desafíos como: fronteras heredadas del colonialismo; diferencias étnicas, lingüísticas o religiosas; economías dependientes; debilidad institucional; presión de potencias extranjeras; disputas internas por el poder. Por eso debemos diferenciar conseguir independencia de consolidar un Estado estable y autónomo.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre posguerra o descolonización: identifica el contexto posterior a 1945; distingue independencia de consolidación estatal; busca principios como soberanía y autodeterminación; analiza intereses coloniales y demandas locales; reconoce la importancia de la ONU y los derechos humanos; utiliza múltiples causas; evita presentar todos los procesos de independencia como iguales.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué acontecimiento favoreció directamente la búsqueda de nuevos mecanismos internacionales de cooperación señalada en el texto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La expansión del comercio medieval.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La independencia de las colonias americanas en el siglo XIX.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La experiencia de la Segunda Guerra Mundial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de todos los Estados europeos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La magnitud de la Segunda Guerra Mundial impulsó la creación de nuevas instituciones destinadas a favorecer cooperación y seguridad internacional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué organización internacional creada en 1945 corresponde al proceso descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La Organización de las Naciones Unidas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La Unión Europea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Organización de Estados Americanos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Sociedad de Naciones.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La ONU fue fundada en 1945 con objetivos relacionados con paz, seguridad, cooperación internacional y posteriormente una fuerte agenda de derechos humanos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué transformación en la concepción internacional de los derechos aparece reflejada en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los derechos comenzaron a considerarse exclusivos de las potencias vencedoras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los derechos dejaron de relacionarse con las personas y pasaron a pertenecer únicamente a los Estados.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cada gobierno adquirió libertad absoluta para definir derechos sin cuestionamiento externo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La protección de determinados derechos comenzó a adquirir una dimensión internacional y universal.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El desarrollo internacional de los derechos humanos cuestionó la idea de que su protección fuera exclusivamente un asunto interno de cada Estado.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el texto señala que la creación de la ONU no debe entenderse como el fin de los conflictos internacionales?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la ONU fue creada para organizar territorios coloniales.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque crear instituciones de cooperación no elimina automáticamente las causas y disputas que generan conflictos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque desde 1945 no existieron negociaciones diplomáticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los Estados rechazaron participar en ella.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las instituciones internacionales pueden facilitar cooperación y negociación, pero no hacen desaparecer automáticamente las tensiones entre Estados y sociedades.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Cuál de las siguientes interpretaciones explica mejor la importancia histórica de la Declaración Universal de los Derechos Humanos según el texto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Transformó automáticamente todos sus principios en leyes idénticas dentro de cada Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó inmediatamente las violaciones de derechos humanos en el mundo.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Contribuyó a establecer un marco internacional común desde el cual podían evaluarse y cuestionarse prácticas de los Estados.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazó la soberanía de todos los países por un único gobierno mundial.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Su importancia reside en la formulación de estándares universales de derechos, aunque su proclamación no garantizara por sí sola su cumplimiento.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué principio político defendían principalmente los movimientos nacionalistas descritos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La autodeterminación de los pueblos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La restauración permanente del dominio colonial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de cualquier forma de soberanía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La subordinación política a una potencia europea.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los movimientos reclamaban que la población pudiera decidir su propio gobierno y ejercer soberanía sobre su territorio.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué argumento de los movimientos nacionalistas aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los principios de libertad solo debían aplicarse en Europa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los principios de libertad y soberanía debían aplicarse también a los pueblos colonizados.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La independencia debía evitar cualquier forma de gobierno local.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las estructuras coloniales garantizaban siempre autonomía política.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los nacionalistas cuestionaban la contradicción entre defender soberanía en Europa y negar esos mismos principios a territorios colonizados.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el texto distingue entre obtener la independencia y consolidar un Estado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque después de la independencia desaparecían inmediatamente todos los problemas económicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la soberanía formal impedía cualquier influencia externa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la independencia significaba que las fronteras coloniales dejaban automáticamente de existir.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los nuevos Estados podían continuar enfrentando problemas institucionales, económicos y territoriales después de conseguir soberanía.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La independencia modificaba la autoridad política formal, pero no resolvía automáticamente las estructuras y dificultades heredadas del colonialismo.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué situación muestra mejor que la descolonización se desarrolló dentro de un sistema internacional más amplio?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de relaciones entre los nuevos países y otras potencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la política internacional después de 1945.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El interés de Estados Unidos y la Unión Soviética por aumentar su influencia sobre nuevas regiones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La decisión de los nuevos Estados de evitar todo contacto exterior.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los procesos de independencia coincidieron con nuevas rivalidades internacionales que podían influir sobre los Estados recién independizados.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál conclusión explica mejor el proceso histórico descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La descolonización consistió únicamente en reemplazar símbolos coloniales por símbolos nacionales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La independencia permitió recuperar soberanía política, pero la autonomía efectiva podía verse limitada por herencias coloniales, dependencias económicas y presiones internacionales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todos los territorios coloniales siguieron exactamente el mismo camino hacia la independencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La creación de nuevos Estados eliminó inmediatamente las fronteras y desigualdades heredadas del colonialismo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La soberanía política fue una transformación decisiva, pero los nuevos Estados continuaron enfrentando estructuras económicas, territoriales e internacionales que podían limitar su capacidad de acción.',
        },
      ],
    },
  ],
};

export default posguerraDescolonizacion;
