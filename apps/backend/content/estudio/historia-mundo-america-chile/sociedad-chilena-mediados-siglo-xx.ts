// CONTENT-H4A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 11. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R11 -- B C A D B A C D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Llegar a la ciudad no resolvía todos los problemas' },
  { type: 'paragraph', text: 'Durante la década de 1950, una familia procedente de una zona rural llegó a una gran ciudad chilena.' },
  {
    type: 'paragraph',
    text: 'El padre había encontrado empleo en una industria y esperaba recibir ingresos más regulares que los que obtenía mediante trabajos temporales en el campo.',
  },
  {
    type: 'paragraph',
    text: 'La ciudad ofrecía también mayores posibilidades de educación para sus hijos y acceso a servicios que eran difíciles de encontrar en su localidad de origen.',
  },
  { type: 'paragraph', text: 'Sin embargo, conseguir una vivienda adecuada resultó mucho más complejo.' },
  {
    type: 'paragraph',
    text: 'El rápido aumento de la población urbana había superado la capacidad disponible de construcción de viviendas. Numerosas familias vivían como allegadas o se instalaban en sectores que carecían inicialmente de infraestructura suficiente.',
  },
  { type: 'paragraph', text: 'La familia descubrió así que trasladarse a la ciudad podía ampliar ciertas oportunidades, pero también generar nuevos problemas.' },
  { type: 'paragraph', text: 'Al mismo tiempo, distintas organizaciones comenzaron a exigir programas habitacionales, servicios básicos y mayor intervención de las autoridades.' },
  {
    type: 'paragraph',
    text: 'El crecimiento urbano estaba transformando la vida social del país y obligando al Estado a responder a necesidades que adquirían una escala cada vez mayor.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Una sociedad con nuevas expectativas' },
  { type: 'paragraph', text: 'En una ciudad chilena de mediados del siglo XX, cada mañana cientos de personas se dirigían a trabajos muy diferentes.' },
  { type: 'paragraph', text: 'Algunas trabajaban en fábricas. Otras eran empleadas de oficinas públicas, profesores, técnicos, comerciantes o profesionales.' },
  {
    type: 'paragraph',
    text: 'La expansión de la educación había permitido que un número creciente de jóvenes aspirara a ocupaciones que requerían estudios formales.',
  },
  {
    type: 'paragraph',
    text: 'Para varias familias, lograr que sus hijos completaran la enseñanza secundaria o ingresaran a estudios superiores comenzó a representar una posibilidad de mejorar su situación social.',
  },
  { type: 'paragraph', text: 'Sin embargo, estas oportunidades no estaban disponibles por igual para toda la población.' },
  {
    type: 'paragraph',
    text: 'En sectores de menores ingresos, muchos jóvenes debían incorporarse tempranamente al trabajo y las diferencias entre zonas urbanas y rurales continuaban siendo importantes.',
  },
  {
    type: 'paragraph',
    text: 'Al mismo tiempo, distintos grupos comenzaron a exigir mejores condiciones laborales, acceso a servicios y mayor participación en las decisiones que afectaban sus vidas.',
  },
  { type: 'paragraph', text: 'La sociedad chilena se hacía más diversa y aparecían nuevas expectativas sobre aquello que el Estado y las instituciones debían garantizar.' },
];

const sociedadChilenaMediadosSigloXx: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 11,
  title: 'Sociedad chilena de mediados del siglo XX',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales transformaciones sociales experimentadas por Chile durante la primera mitad y mediados del siglo XX, reconociendo procesos de urbanización, expansión de los sectores medios, cambios en el trabajo y crecimiento de las demandas sociales vinculadas con vivienda, educación, salud y participación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Sociedad chilena de mediados del siglo XX' },

    { type: 'heading', level: 2, text: '1. Una sociedad que estaba cambiando' },
    {
      type: 'paragraph',
      text: 'Durante la primera mitad del siglo XX, Chile experimentó transformaciones importantes en su estructura social. Entre ellas: crecimiento de las ciudades, migración desde zonas rurales, expansión del trabajo asalariado, crecimiento de los sectores medios, aumento de la escolarización y nuevas demandas sociales. Estos cambios fueron graduales y desiguales.',
    },

    { type: 'heading', level: 2, text: '2. Urbanización' },
    {
      type: 'paragraph',
      text: 'Cada vez más personas comenzaron a vivir en ciudades. Factores que favorecieron este proceso incluyeron: búsqueda de empleo, desarrollo industrial, acceso a servicios, oportunidades educacionales y concentración administrativa. Santiago y otras ciudades aumentaron considerablemente su población.',
    },

    { type: 'heading', level: 2, text: '3. Migración campo-ciudad' },
    {
      type: 'paragraph',
      text: 'Muchas familias dejaron zonas rurales para buscar mejores oportunidades en centros urbanos. Sin embargo, las ciudades no siempre estaban preparadas para recibir a una población creciente. Esto generó problemas como déficit de viviendas, hacinamiento, falta de servicios básicos y crecimiento de asentamientos precarios.',
    },

    { type: 'heading', level: 2, text: '4. Industrialización y trabajo' },
    {
      type: 'paragraph',
      text: 'El desarrollo industrial incrementó la cantidad de trabajadores asalariados urbanos. También surgieron nuevos empleos en administración pública, comercio, educación, servicios e industrias. La estructura ocupacional chilena se volvió más diversa.',
    },

    { type: 'heading', level: 2, text: '5. Expansión de los sectores medios' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XX crecieron sectores vinculados a empleados públicos, profesores, profesionales, técnicos, comerciantes y pequeños empresarios. Estos grupos adquirieron una influencia social y política cada vez mayor.',
    },

    { type: 'heading', level: 2, text: '6. Educación' },
    {
      type: 'paragraph',
      text: 'La expansión de la educación fue una de las transformaciones importantes del período. Aumentaron matrícula escolar, alfabetización, acceso a enseñanza secundaria y oportunidades de formación profesional. Sin embargo, persistieron desigualdades territoriales y sociales.',
    },

    { type: 'heading', level: 2, text: '7. Nuevas demandas urbanas' },
    {
      type: 'paragraph',
      text: 'El crecimiento de las ciudades produjo demandas relacionadas con vivienda, transporte, agua potable, alcantarillado, salud y educación. El Estado comenzó a asumir un papel mayor en varias de estas áreas.',
    },

    { type: 'heading', level: 2, text: '8. Organización social' },
    {
      type: 'paragraph',
      text: 'Trabajadores, pobladores, estudiantes y otros grupos desarrollaron diferentes formas de organización. Podían recurrir a sindicatos, asociaciones, juntas vecinales, movilizaciones y organizaciones comunitarias. Estas acciones buscaban mejorar condiciones de vida o ampliar derechos.',
    },

    { type: 'heading', level: 2, text: '9. Mujeres y transformación social' },
    {
      type: 'paragraph',
      text: 'Las mujeres participaron crecientemente en educación, trabajo remunerado, organizaciones sociales y movimientos políticos. Durante el siglo XX también avanzaron demandas por mayores derechos civiles y políticos. El sufragio femenino en elecciones presidenciales se ejerció por primera vez en Chile en 1952.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre sociedad chilena del siglo XX: identifica el cambio social central; relaciona urbanización con migración; observa las condiciones de vivienda y trabajo; analiza la expansión de educación y sectores medios; distingue crecimiento económico de bienestar social; identifica demandas colectivas; evita asumir que todos los sectores experimentaron los cambios del mismo modo.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué proceso demográfico aparece principalmente representado en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Migración desde ciudades hacia zonas rurales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Migración desde sectores rurales hacia centros urbanos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Salida completa de la población chilena hacia otros países.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desaparición de las ciudades industriales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La familia deja una zona rural para instalarse en una ciudad en busca de empleo, educación y servicios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema enfrentó la familia después de llegar a la ciudad?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de cualquier trabajo industrial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de acceder a servicios urbanos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La dificultad para encontrar una vivienda adecuada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de regresar inmediatamente al campo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El crecimiento urbano rápido produjo un déficit habitacional que afectó a muchas familias recién llegadas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre urbanización y vivienda se desprende del texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'El crecimiento de la población urbana podía superar la capacidad de proporcionar viviendas e infraestructura suficientes.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La urbanización eliminó automáticamente los problemas habitacionales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las ciudades perdieron población durante la industrialización.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La vivienda dejó de ser una preocupación social durante la década de 1950.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La llegada de población a las ciudades aumentó más rápido que la disponibilidad de viviendas y servicios en algunos períodos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué transformación en el papel del Estado aparece sugerida?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El abandono completo de políticas sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de los servicios públicos urbanos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La transferencia de todas las responsabilidades sociales a organizaciones privadas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una mayor presión para intervenir en vivienda y provisión de servicios básicos.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El crecimiento urbano y las demandas sociales impulsaron una mayor participación estatal en áreas como vivienda e infraestructura.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación sintetiza mejor la experiencia de urbanización descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La migración urbana empeoraba necesariamente todas las condiciones de vida.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ciudad podía ofrecer nuevas oportunidades laborales y educacionales, pero su rápido crecimiento también producía problemas de vivienda e infraestructura.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La industrialización eliminaba inmediatamente las desigualdades sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento urbano ocurrió sin generar nuevas demandas hacia el Estado.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El proceso tuvo efectos diversos: amplió ciertas oportunidades, pero también produjo nuevas necesidades y tensiones sociales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué cambio social aparece representado por la diversidad de ocupaciones descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La expansión y diversificación de los sectores asalariados y medios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa del trabajo urbano.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El retorno de toda la población al trabajo agrícola.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de las profesiones especializadas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El crecimiento de empleos administrativos, técnicos, docentes y profesionales refleja una sociedad ocupacionalmente más diversa.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre educación y movilidad social aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La educación impedía cambiar de ocupación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo los trabajadores rurales podían acceder a estudios.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'El acceso a mayor educación podía ampliar las oportunidades ocupacionales y sociales de algunas personas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La enseñanza secundaria dejó de tener importancia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La educación fue vista por muchas familias como una vía para acceder a nuevas ocupaciones y mejorar su posición social.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el texto advierte que las nuevas oportunidades no estaban disponibles por igual?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los habitantes tenían exactamente los mismos recursos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque no existían diferencias entre áreas rurales y urbanas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la educación había desaparecido de las ciudades.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque persistían desigualdades económicas y territoriales que limitaban el acceso de algunos grupos.' },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las condiciones económicas y territoriales seguían influyendo en las posibilidades de estudiar y acceder a determinadas ocupaciones.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué proceso político-social puede asociarse con el aumento de las expectativas descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La reducción permanente de las demandas sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento de demandas por derechos, servicios y mayor participación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de las organizaciones colectivas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación del papel del Estado.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una sociedad más urbana, educada y organizada generó también mayores demandas sobre derechos y políticas públicas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál conclusión permite explicar mejor las transformaciones sociales del Chile de mediados del siglo XX?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento de la educación garantizó igualdad completa entre todos los sectores sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La sociedad permaneció prácticamente igual pese a la urbanización y la industrialización.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La diversificación del trabajo, el crecimiento de la educación y los sectores medios ampliaron oportunidades y expectativas, aunque persistieron importantes desigualdades.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las transformaciones sociales eliminaron la necesidad de políticas públicas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los cambios ampliaron oportunidades y modificaron la estructura social, pero sus beneficios no se distribuyeron uniformemente.' },
      ],
    },
  ],
};

export default sociedadChilenaMediadosSigloXx;
