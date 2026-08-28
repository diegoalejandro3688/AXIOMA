// CONTENT-H5A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 13. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R13 -- B A D C B C A D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Una sociedad donde los acuerdos se hacían cada vez más difíciles' },
  { type: 'paragraph', text: 'Durante 1972 y 1973, las discusiones políticas atravesaban prácticamente todos los espacios de la sociedad chilena.' },
  {
    type: 'paragraph',
    text: 'En una fábrica, algunos trabajadores defendían las transformaciones impulsadas por el gobierno y sostenían que permitirían distribuir de manera más equitativa la riqueza.',
  },
  { type: 'paragraph', text: 'Otros trabajadores temían que el conflicto político y los problemas económicos terminaran perjudicando sus empleos y condiciones de vida.' },
  {
    type: 'paragraph',
    text: 'Los propietarios de pequeñas empresas reclamaban dificultades para conseguir insumos, mientras organizaciones empresariales cuestionaban la creciente intervención estatal.',
  },
  {
    type: 'paragraph',
    text: 'En distintos barrios, grupos de vecinos se organizaban para conseguir productos escasos. Al mismo tiempo, aparecían circuitos informales de comercio donde esos mismos bienes podían venderse a precios mucho más altos.',
  },
  {
    type: 'paragraph',
    text: 'En el Congreso, gobierno y oposición mantenían profundas disputas sobre los límites de las reformas y el respeto a las instituciones.',
  },
  {
    type: 'paragraph',
    text: 'Las movilizaciones callejeras aumentaban y sectores de ambos lados comenzaron a considerar que sus adversarios amenazaban el futuro del país.',
  },
  {
    type: 'paragraph',
    text: 'Mientras algunos dirigentes seguían buscando acuerdos políticos, otros sostenían que las diferencias ya no podían resolverse mediante los mecanismos existentes.',
  },
  { type: 'paragraph', text: 'La crisis chilena reunía así problemas económicos, enfrentamientos institucionales y una creciente polarización social.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — El día en que las instituciones dejaron de funcionar como antes' },
  {
    type: 'paragraph',
    text: 'Durante la mañana del 11 de septiembre de 1973, las Fuerzas Armadas y Carabineros tomaron posiciones en distintos puntos estratégicos del país.',
  },
  { type: 'paragraph', text: 'Las autoridades militares anunciaron que el gobierno debía abandonar el poder.' },
  {
    type: 'paragraph',
    text: 'El presidente Salvador Allende permaneció en el palacio de La Moneda y rechazó renunciar al cargo para el cual había sido elegido.',
  },
  { type: 'paragraph', text: 'Al finalizar la jornada, el gobierno constitucional había sido derrocado y una Junta Militar asumió el control del Estado.' },
  { type: 'paragraph', text: 'Durante los días siguientes comenzaron profundas modificaciones institucionales.' },
  {
    type: 'paragraph',
    text: 'El Congreso Nacional dejó de funcionar y posteriormente fue disuelto. La actividad de los partidos políticos fue prohibida o suspendida y distintas libertades públicas quedaron severamente restringidas.',
  },
  {
    type: 'paragraph',
    text: 'Las autoridades militares concentraron facultades que anteriormente habían estado distribuidas entre diferentes instituciones.',
  },
  { type: 'paragraph', text: 'Estas transformaciones modificaron la forma en que se ejercía el poder político.' },
  { type: 'paragraph', text: 'No se trató simplemente de un cambio de presidente o de coalición gobernante.' },
  {
    type: 'paragraph',
    text: 'El sistema institucional que permitía la competencia entre partidos, la representación parlamentaria y la alternancia mediante elecciones había sido interrumpido.',
  },
];

const golpe1973QuiebreDemocracia: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 13,
  title: 'Golpe de Estado de 1973 y quiebre de la democracia',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el proceso que condujo al golpe de Estado del 11 de septiembre de 1973 en Chile desde una perspectiva multicausal, reconociendo la polarización política y social, los conflictos institucionales y económicos, la influencia del contexto internacional y las consecuencias inmediatas del golpe sobre el orden democrático.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Golpe de Estado de 1973 y quiebre de la democracia' },

    { type: 'heading', level: 2, text: '1. Chile antes de 1973' },
    {
      type: 'paragraph',
      text: 'Durante las décadas previas al golpe de Estado, Chile había experimentado una creciente participación política y social. Distintos sectores defendían proyectos diferentes sobre: economía, propiedad, distribución de la riqueza, rol del Estado, reformas sociales y relaciones internacionales. Estas diferencias se intensificaron durante los primeros años de la década de 1970.',
    },

    { type: 'heading', level: 2, text: '2. El gobierno de la Unidad Popular' },
    {
      type: 'paragraph',
      text: 'En 1970, Salvador Allende ganó la elección presidencial como candidato de la coalición Unidad Popular. Su programa proponía avanzar hacia una transformación socialista mediante mecanismos institucionales. Entre las medidas impulsadas estuvieron: nacionalización de sectores estratégicos, profundización de la reforma agraria, ampliación de políticas sociales y mayor intervención estatal en la economía. Estas transformaciones contaron con apoyo de algunos sectores y una fuerte oposición de otros.',
    },

    { type: 'heading', level: 2, text: '3. Polarización política' },
    {
      type: 'paragraph',
      text: 'La sociedad chilena se encontraba cada vez más dividida entre proyectos políticos difíciles de conciliar. Existían: sectores favorables al gobierno, sectores opositores, organizaciones sociales movilizadas, grupos que defendían transformaciones más profundas y grupos que buscaban frenar o revertir esas transformaciones. La polarización redujo progresivamente los espacios de acuerdo político.',
    },

    { type: 'heading', level: 2, text: '4. Conflictos institucionales' },
    {
      type: 'paragraph',
      text: 'Durante el período aumentaron las tensiones entre: Poder Ejecutivo, Congreso, Poder Judicial, partidos políticos y organizaciones sociales. Gobierno y oposición se acusaban mutuamente de vulnerar límites institucionales o impedir el funcionamiento normal del sistema político. El conflicto político pasó a involucrar crecientemente la interpretación de la propia legalidad democrática.',
    },

    { type: 'heading', level: 2, text: '5. Problemas económicos' },
    {
      type: 'paragraph',
      text: 'Chile también enfrentó graves dificultades económicas. Entre ellas: inflación, desabastecimiento de determinados productos, caída de inversiones, conflictos productivos, mercado negro y huelgas y paralizaciones. Las causas fueron múltiples y estuvieron vinculadas tanto a decisiones internas como al conflicto político y económico del período.',
    },

    { type: 'heading', level: 2, text: '6. Movilización social' },
    {
      type: 'paragraph',
      text: 'La crisis no se desarrolló solamente dentro de las instituciones. Trabajadores, empresarios, estudiantes, pobladores, transportistas y distintas organizaciones sociales participaron activamente en: manifestaciones, huelgas, ocupaciones, marchas y movilizaciones de apoyo o rechazo al gobierno. La sociedad civil se encontraba intensamente politizada.',
    },

    { type: 'heading', level: 2, text: '7. Guerra Fría e intervención exterior' },
    {
      type: 'paragraph',
      text: 'La crisis chilena también se desarrolló dentro de la Guerra Fría. Estados Unidos consideraba con preocupación la existencia de un gobierno socialista elegido democráticamente en América Latina y desarrolló acciones destinadas a debilitar políticamente al gobierno de Allende y apoyar a sectores opositores. Al mismo tiempo, el gobierno chileno mantuvo relaciones con Cuba y otros países socialistas. Sin embargo, el contexto internacional no explica por sí solo el golpe: interactuó con profundas tensiones políticas, sociales, económicas e institucionales internas.',
    },

    { type: 'heading', level: 2, text: '8. Las Fuerzas Armadas' },
    {
      type: 'paragraph',
      text: 'A medida que aumentaba la crisis, las Fuerzas Armadas adquirieron una presencia cada vez mayor en el escenario político. Durante 1973 aumentaron las tensiones y los intentos de intervención militar. Finalmente, el 11 de septiembre de 1973, las Fuerzas Armadas y Carabineros realizaron un golpe de Estado contra el gobierno constitucional.',
    },

    { type: 'heading', level: 2, text: '9. El quiebre democrático' },
    {
      type: 'paragraph',
      text: 'El golpe significó una ruptura del orden institucional democrático. Posteriormente: se disolvió el Congreso Nacional, se restringió la actividad política, los partidos fueron prohibidos o suspendidos, se limitaron libertades públicas y una Junta Militar concentró el poder. Por ello, el 11 de septiembre de 1973 constituye un quiebre de la democracia chilena.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre 1973: evita explicaciones monocausales; identifica factores políticos, económicos y sociales; considera el contexto internacional; diferencia causas de consecuencias; distingue polarización política de ruptura institucional; reconoce que el golpe interrumpió el orden constitucional; analiza las fuentes según su perspectiva y contexto.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué característica de la sociedad chilena de 1972–1973 aparece principalmente en el texto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de las diferencias políticas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Una creciente polarización entre distintos proyectos políticos y sociales.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El término de todas las movilizaciones ciudadanas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de un acuerdo permanente entre gobierno y oposición.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto muestra una sociedad cada vez más dividida entre sectores que defendían proyectos políticos y económicos distintos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema económico aparece mencionado directamente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La dificultad para acceder a determinados productos e insumos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación completa de la inflación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición del comercio informal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento uniforme de la producción en todos los sectores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto describe escasez de algunos bienes, dificultades para obtener insumos y aparición de circuitos informales de comercio.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre economía y política muestra mejor el texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Los problemas económicos se desarrollaban completamente separados de las disputas políticas.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las organizaciones políticas dejaron de intervenir en debates económicos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Todos los sectores atribuían exactamente las mismas causas a los problemas económicos.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las dificultades económicas interactuaban con el conflicto político y eran interpretadas de manera distinta por diversos sectores.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La crisis económica y la polarización política se reforzaban mutuamente y eran explicadas de manera diferente según la posición de cada actor.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué la polarización podía dificultar una salida institucional a la crisis?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque eliminaba automáticamente el funcionamiento del Congreso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los partidos comenzaron a defender el mismo programa.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque aumentaba la percepción de que el adversario representaba una amenaza, reduciendo los espacios de negociación.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque impedía que existieran organizaciones sociales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando los adversarios son percibidos como amenazas fundamentales, resulta más difícil construir acuerdos y compromisos políticos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor la crisis descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fue resultado exclusivo de la situación económica.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Surgió de la interacción entre conflictos políticos, problemas económicos, tensiones institucionales y movilización social.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Se originó únicamente por decisiones tomadas fuera de Chile.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fue provocada exclusivamente por un único grupo social.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La crisis previa al golpe fue multicausal y combinó factores políticos, económicos, sociales e institucionales que se influyeron mutuamente.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué ocurrió el 11 de septiembre de 1973 según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se realizaron nuevas elecciones presidenciales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Congreso eligió un nuevo presidente constitucional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las Fuerzas Armadas y Carabineros derrocaron al gobierno constitucional.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El gobierno transfirió voluntariamente el poder después de una elección.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El 11 de septiembre las Fuerzas Armadas y Carabineros realizaron un golpe de Estado que terminó con el gobierno constitucional.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        {
          type: 'paragraph',
          text: '¿Qué elemento permite identificar el acontecimiento como un quiebre democrático y no simplemente como un cambio de gobierno?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La interrupción de las instituciones representativas y de los mecanismos democráticos de competencia política.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de diferencias entre partidos antes del golpe.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La presencia de problemas económicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El cambio de autoridades administrativas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El golpe no produjo únicamente un reemplazo de autoridades: interrumpió instituciones fundamentales del sistema democrático.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué transformación en la distribución del poder aparece descrita después del golpe?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Congreso recibió mayores atribuciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los partidos adquirieron autonomía completa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se fortaleció la separación entre poderes mediante nuevas elecciones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las nuevas autoridades concentraron facultades que antes estaban distribuidas entre distintas instituciones.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La concentración del poder reemplazó mecanismos institucionales propios de un régimen democrático basado en poderes diferenciados.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué la disolución del Congreso constituye una evidencia importante del quiebre institucional?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el Congreso administraba directamente todas las empresas del país.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque eliminó una institución fundamental de representación y deliberación política.' },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque significó automáticamente el término de todos los conflictos sociales.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque permitió ampliar inmediatamente la competencia electoral.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Congreso constituye una institución central de representación política y elaboración de leyes dentro de un sistema democrático.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál conclusión caracteriza mejor el significado político del golpe de Estado de 1973?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Consistió únicamente en reemplazar a un gobierno por otro dentro de las mismas reglas democráticas.',
          },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Fue solamente una respuesta económica y no modificó las instituciones políticas.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Interrumpió el orden constitucional democrático y dio paso a una concentración del poder que eliminó o restringió instituciones y mecanismos de participación política.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Amplió inmediatamente la representación parlamentaria y la competencia electoral.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El golpe implicó una ruptura del orden democrático porque terminó con el gobierno constitucional y modificó profundamente las instituciones, la representación política y las libertades públicas.',
        },
      ],
    },
  ],
};

export default golpe1973QuiebreDemocracia;
