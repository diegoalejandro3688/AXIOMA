// CONTENT-H6A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 16. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R16 -- B D A C B A D C B A.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando la protesta volvió a ocupar las calles' },
  {
    type: 'paragraph',
    text: 'Durante 1983, en distintos sectores de una ciudad chilena comenzaron a circular llamados a participar en jornadas de protesta.',
  },
  {
    type: 'paragraph',
    text: 'Algunas personas estaban motivadas principalmente por el desempleo y las dificultades económicas que afectaban a sus familias.',
  },
  { type: 'paragraph', text: 'Otras querían expresar su rechazo a la falta de elecciones competitivas y a las restricciones políticas.' },
  { type: 'paragraph', text: 'En poblaciones, grupos de vecinos organizaron reuniones y manifestaciones.' },
  { type: 'paragraph', text: 'Trabajadores participaron en paralizaciones y estudiantes desarrollaron actividades de protesta.' },
  {
    type: 'paragraph',
    text: 'No todos los participantes defendían exactamente las mismas ideas ni pertenecían a las mismas organizaciones.',
  },
  { type: 'paragraph', text: 'Sin embargo, existía un creciente malestar compartido frente a la situación económica y política.' },
  { type: 'paragraph', text: 'Las autoridades intentaron controlar las movilizaciones mediante distintas medidas represivas y restricciones.' },
  { type: 'paragraph', text: 'A pesar de ello, nuevas protestas continuaron desarrollándose durante los años siguientes.' },
  {
    type: 'paragraph',
    text: 'La aparición de estas movilizaciones mostró que el régimen enfrentaba una oposición social cada vez más visible y que distintos problemas económicos comenzaban a conectarse con demandas políticas más amplias.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — De la oposición dispersa a la búsqueda de una estrategia común' },
  { type: 'paragraph', text: 'A mediados de la década de 1980, distintos dirigentes opositores comenzaron a reunirse con mayor frecuencia.' },
  {
    type: 'paragraph',
    text: 'Procedían de partidos y movimientos que tenían historias políticas diferentes y que no siempre coincidían en la forma de enfrentar al régimen.',
  },
  {
    type: 'paragraph',
    text: 'Algunos consideraban que las protestas sociales debían intensificarse hasta hacer imposible la continuidad de la Dictadura.',
  },
  {
    type: 'paragraph',
    text: 'Otros pensaban que era necesario construir acuerdos amplios y utilizar mecanismos institucionales para abrir una salida democrática.',
  },
  {
    type: 'paragraph',
    text: 'También existían organizaciones que privilegiaban la denuncia de las violaciones a los Derechos Humanos y la presión internacional.',
  },
  { type: 'paragraph', text: 'Las diferencias provocaban tensiones entre los propios opositores.' },
  { type: 'paragraph', text: 'Sin embargo, comenzó a aumentar la idea de que ninguna estrategia aislada sería suficiente.' },
  {
    type: 'paragraph',
    text: 'Para disputar políticamente el futuro del país era necesario coordinar partidos, organizaciones sociales y distintos sectores ciudadanos.',
  },
  {
    type: 'paragraph',
    text: 'La búsqueda de acuerdos no eliminó las diferencias ideológicas, pero permitió avanzar hacia objetivos compartidos como elecciones libres, recuperación de libertades públicas y restitución de instituciones democráticas.',
  },
  {
    type: 'paragraph',
    text: 'Esta capacidad de coordinación sería especialmente importante cuando el itinerario institucional del régimen abrió posteriormente una instancia decisiva para definir su continuidad.',
  },
];

const recuperacionDemocraciaDecada1980: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 16,
  title: 'Recuperación de la democracia durante la década de 1980',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el proceso de recuperación de la democracia en Chile durante la década de 1980, reconociendo el impacto de la crisis económica, el resurgimiento de la movilización social y política, la reorganización de la oposición, las demandas por Derechos Humanos y la búsqueda de una salida institucional al régimen militar.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Recuperación de la democracia durante la década de 1980' },

    { type: 'heading', level: 2, text: '1. Una dictadura que entró en una etapa diferente' },
    {
      type: 'paragraph',
      text: 'Durante los primeros años de la década de 1980, la Dictadura Militar seguía concentrando el poder político y restringiendo la participación democrática. Sin embargo, comenzaron a acumularse factores que modificaron el escenario. Entre ellos: crisis económica, desempleo, aumento del descontento social, reorganización de fuerzas políticas, movilizaciones ciudadanas y presión por el respeto a los Derechos Humanos. Esto abrió una nueva etapa del régimen.',
    },

    { type: 'heading', level: 2, text: '2. La Constitución de 1980' },
    {
      type: 'paragraph',
      text: 'En 1980 se aprobó una nueva Constitución mediante un plebiscito realizado bajo condiciones políticas autoritarias y sin las garantías propias de una competencia democrática plena. La Constitución estableció un itinerario institucional que contemplaba la continuidad del régimen y, más adelante, un plebiscito para decidir sobre la permanencia del candidato propuesto por las Fuerzas Armadas. Este marco sería posteriormente utilizado por la oposición para impulsar una salida institucional.',
    },

    { type: 'heading', level: 2, text: '3. La crisis económica de 1982' },
    {
      type: 'paragraph',
      text: 'La grave crisis económica de 1982 tuvo importantes consecuencias sociales. Aumentaron: desempleo, endeudamiento, quiebras, pobreza y malestar social. La crisis debilitó la imagen de estabilidad económica que el régimen intentaba proyectar.',
    },

    { type: 'heading', level: 2, text: '4. Las jornadas de protesta' },
    {
      type: 'paragraph',
      text: 'Desde 1983 comenzaron grandes jornadas de protesta nacional. Participaron distintos sectores: trabajadores, estudiantes, pobladores, organizaciones sociales, sectores profesionales y partidos y movimientos políticos. Las protestas combinaron demandas económicas con exigencias políticas.',
    },

    { type: 'heading', level: 2, text: '5. Reorganización de la oposición' },
    {
      type: 'paragraph',
      text: 'Durante la década de 1980, distintos partidos y movimientos opositores comenzaron a reorganizarse. No todos compartían la misma estrategia. Algunos defendían: movilización social, negociación, salida institucional y presión internacional. Otros sectores consideraban necesarias estrategias de confrontación más directa. La oposición era diversa.',
    },

    { type: 'heading', level: 2, text: '6. Derechos Humanos y legitimidad' },
    {
      type: 'paragraph',
      text: 'Las denuncias por violaciones a los Derechos Humanos continuaron teniendo una importancia central. Organizaciones nacionales e internacionales documentaban casos y exigían respuestas. Esto contribuía a cuestionar la legitimidad del régimen tanto dentro como fuera de Chile.',
    },

    { type: 'heading', level: 2, text: '7. Iglesia y organizaciones sociales' },
    {
      type: 'paragraph',
      text: 'Distintas instituciones cumplieron un papel relevante en la defensa de personas afectadas por la represión y en la generación de espacios de diálogo. También crecieron: organizaciones vecinales, sindicatos, agrupaciones estudiantiles, organizaciones de mujeres y movimientos de Derechos Humanos. La recuperación democrática tuvo, por tanto, una importante dimensión social.',
    },

    { type: 'heading', level: 2, text: '8. Negociación y búsqueda de acuerdos' },
    {
      type: 'paragraph',
      text: 'A medida que avanzaba la década, algunos sectores opositores comenzaron a considerar que una salida democrática requería combinar: movilización, presión política, acuerdos entre fuerzas opositoras y utilización de mecanismos institucionales disponibles. El objetivo era ampliar las posibilidades de una transición política.',
    },

    { type: 'heading', level: 2, text: '9. Presión interna y externa' },
    {
      type: 'paragraph',
      text: 'El régimen enfrentó presiones provenientes de distintos ámbitos. Internamente: protestas, reorganización política, demandas sociales y críticas económicas. Externamente: organismos internacionales, gobiernos extranjeros y organizaciones de Derechos Humanos. Estos factores no actuaron de manera aislada, sino de forma simultánea.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre recuperación democrática en los años ochenta: identifica actores sociales y políticos; relaciona crisis económica con movilización; distingue protesta social de negociación política; reconoce el papel de los Derechos Humanos; analiza la diversidad de estrategias opositoras; identifica factores internos y externos; evita explicar la recuperación democrática mediante una sola causa.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué fenómeno aparece principalmente descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de toda movilización social.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'El surgimiento de jornadas de protesta contra la situación económica y política.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La realización de elecciones presidenciales competitivas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El cierre de todas las organizaciones sociales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto describe el resurgimiento de protestas sociales durante la década de 1980 vinculadas tanto a dificultades económicas como a demandas políticas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué factor económico impulsó a parte de los participantes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación completa del desempleo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento uniforme de los salarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de las dificultades familiares.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El desempleo y los problemas económicos derivados de la crisis.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La crisis económica afectó a numerosas familias y contribuyó al crecimiento del descontento y la movilización social.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre crisis económica y demandas políticas aparece reflejada?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las dificultades económicas podían contribuir a movilizaciones que también cuestionaban las restricciones políticas del régimen.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los problemas económicos hicieron desaparecer toda demanda democrática.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las protestas fueron exclusivamente económicas y nunca políticas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La crisis fortaleció automáticamente el apoyo de toda la población al régimen.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las protestas combinaron demandas materiales con exigencias relacionadas con participación política y democratización.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el texto señala que los participantes no defendían exactamente las mismas ideas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todos pertenecían a una sola organización.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las protestas carecían completamente de objetivos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la oposición social reunía actores diversos con motivaciones y proyectos distintos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque únicamente participaban autoridades estatales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las movilizaciones reunieron sectores sociales y políticos diferentes que coincidían en ciertas demandas sin compartir necesariamente una misma estrategia.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión explica mejor la importancia política de las protestas descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Produjeron inmediatamente el término de la Dictadura.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Visibilizaron un aumento del descontento y contribuyeron a ampliar la presión social por cambios políticos, aunque no resolvieron por sí solas la transición.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Eliminaron completamente las diferencias dentro de la oposición.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazaron de manera automática todas las instituciones existentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las protestas fueron importantes para aumentar la presión sobre el régimen, pero la recuperación democrática dependió también de organización política, acuerdos y procesos institucionales posteriores.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué proceso político describe principalmente el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La creciente coordinación entre distintas fuerzas opositoras.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de los partidos políticos opositores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La creación de una única ideología política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El abandono de toda estrategia democrática.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto muestra cómo distintas fuerzas opositoras comenzaron a buscar acuerdos y formas de coordinación durante la década de 1980.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué diferencia estratégica existía entre distintos sectores de oposición?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todos defendían exactamente el mismo método.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguno buscaba cambios políticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todos rechazaban cualquier forma de movilización.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Algunos privilegiaban movilización y presión, mientras otros enfatizaban acuerdos y mecanismos institucionales.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La oposición era diversa y debatía distintas estrategias para avanzar hacia la recuperación democrática.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué construir acuerdos amplios podía ser importante?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque permitía eliminar toda diferencia ideológica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque garantizaba inmediatamente el fin del régimen.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque facilitaba coordinar actores distintos en torno a objetivos democráticos comunes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque impedía que participaran organizaciones sociales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los acuerdos permitían reunir fuerzas diversas alrededor de demandas compartidas sin exigir que abandonaran todas sus diferencias políticas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre diversidad y unidad aparece reflejada?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Para coordinarse, todos los opositores debían convertirse en un único partido.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Actores con diferencias ideológicas podían colaborar en objetivos comunes relacionados con la recuperación democrática.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las diferencias políticas hacían imposible cualquier cooperación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La oposición dejó de debatir estrategias durante la década de 1980.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La coordinación democrática podía construirse sobre objetivos compartidos aun cuando persistieran diferencias entre los actores participantes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál interpretación explica mejor el proceso de recuperación democrática durante la década de 1980?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Resultó de la interacción entre movilización social, reorganización política, defensa de los Derechos Humanos, presión interna y externa y búsqueda de acuerdos institucionales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Fue consecuencia exclusiva de la crisis económica de 1982.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se produjo únicamente por decisiones adoptadas por gobiernos extranjeros.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dependió exclusivamente de una sola organización política.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La recuperación de la democracia fue un proceso multicausal en el que participaron diversos actores y estrategias, preparando las condiciones políticas que adquirirían especial importancia desde 1988.',
        },
      ],
    },
  ],
};

export default recuperacionDemocraciaDecada1980;
