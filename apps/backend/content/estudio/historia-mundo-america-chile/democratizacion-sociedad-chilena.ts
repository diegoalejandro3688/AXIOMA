// CONTENT-H4A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 12. Contenido editorial APROBADO externamente, transcrito verbatim.
// Q7 usa la versión CORREGIDA Y AUTORITATIVA indicada en el prompt de H4A
// (correcta B, no la versión previa con correcta A).
//
// Answer keys: R12 -- A D B C A C B D A C.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando votar dejó de ser asunto de unos pocos' },
  { type: 'paragraph', text: 'Durante las primeras décadas del siglo XX, una organización de mujeres chilenas comenzó a reunirse periódicamente para discutir su situación jurídica y política.' },
  {
    type: 'paragraph',
    text: 'Sus integrantes sostenían que resultaba contradictorio que mujeres que trabajaban, estudiaban, pagaban impuestos y participaban en organizaciones sociales no pudieran intervenir en las mismas decisiones políticas que los hombres.',
  },
  { type: 'paragraph', text: 'Algunas personas se oponían a sus demandas afirmando que la política debía continuar siendo principalmente una actividad masculina.' },
  { type: 'paragraph', text: 'Las organizaciones femeninas respondían que la ciudadanía no debía depender del sexo de una persona.' },
  { type: 'paragraph', text: 'Con el paso de los años, estas demandas lograron avances legales.' },
  {
    type: 'paragraph',
    text: 'Primero se amplió la participación femenina en determinadas elecciones locales y posteriormente se reconoció el derecho a votar en elecciones parlamentarias y presidenciales.',
  },
  { type: 'paragraph', text: 'El cambio no ocurrió de un día para otro.' },
  { type: 'paragraph', text: 'Fue resultado de décadas de organización, debate público y presión política.' },
  {
    type: 'paragraph',
    text: 'Cuando las mujeres comenzaron a participar plenamente en elecciones nacionales, el electorado chileno se amplió de manera significativa y los partidos tuvieron que dirigirse a un conjunto mucho más amplio de ciudadanos.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Más ciudadanos, más demandas' },
  { type: 'paragraph', text: 'Durante la década de 1960, una ciudad chilena experimentaba una intensa actividad política y social.' },
  { type: 'paragraph', text: 'En los barrios, organizaciones de pobladores discutían problemas de vivienda y servicios.' },
  { type: 'paragraph', text: 'En universidades, estudiantes debatían reformas educacionales y cambios sociales.' },
  { type: 'paragraph', text: 'Sindicatos de trabajadores negociaban salarios y condiciones laborales.' },
  { type: 'paragraph', text: 'En sectores rurales, organizaciones campesinas comenzaron a adquirir mayor presencia y capacidad de movilización.' },
  { type: 'paragraph', text: 'Los partidos políticos intentaban responder a estas demandas, pero proponían soluciones diferentes.' },
  { type: 'paragraph', text: 'Algunos defendían transformaciones graduales dentro de las instituciones existentes.' },
  { type: 'paragraph', text: 'Otros consideraban necesarias reformas mucho más profundas.' },
  { type: 'paragraph', text: 'El aumento de la participación social y política permitió que grupos antes poco representados expresaran sus intereses con mayor fuerza.' },
  { type: 'paragraph', text: 'Sin embargo, también intensificó la competencia entre proyectos políticos distintos.' },
  { type: 'paragraph', text: 'La democratización había ampliado los espacios de participación, pero no había eliminado los conflictos sobre cómo debía organizarse la sociedad.' },
];

const democratizacionSociedadChilena: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 12,
  title: 'Democratización de la sociedad chilena',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el proceso de democratización de la sociedad chilena durante el siglo XX, reconociendo la ampliación progresiva de la participación política y social, la incorporación de nuevos actores, la expansión del sufragio y el aumento de las demandas por derechos y representación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Democratización de la sociedad chilena' },

    { type: 'heading', level: 2, text: '1. Democratización: más que elecciones' },
    {
      type: 'paragraph',
      text: 'La democratización no consiste únicamente en realizar elecciones. También implica procesos como ampliación del sufragio, incorporación de nuevos grupos a la vida política, fortalecimiento de organizaciones sociales, expansión de derechos y mayor participación ciudadana. Es un proceso histórico gradual y conflictivo.',
    },

    { type: 'heading', level: 2, text: '2. Un sistema político inicialmente restringido' },
    {
      type: 'paragraph',
      text: 'A comienzos del siglo XX, la participación electoral chilena era limitada. Existían restricciones vinculadas a factores como sexo, alfabetización, requisitos legales y mecanismos electorales. Por ello, una parte importante de la población permanecía fuera de la participación política formal.',
    },

    { type: 'heading', level: 2, text: '3. Ampliación del electorado' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XX se fueron eliminando diversas restricciones. Esto permitió incorporar progresivamente a nuevos sectores de la población. La expansión del electorado transformó la política chilena porque los partidos y gobiernos tuvieron que considerar demandas sociales más amplias.',
    },

    { type: 'heading', level: 2, text: '4. Participación política de las mujeres' },
    {
      type: 'paragraph',
      text: 'Las mujeres desarrollaron organizaciones y movimientos que defendieron mayores derechos civiles y políticos. En Chile, el sufragio femenino avanzó por etapas. Las mujeres participaron en elecciones municipales desde la década de 1930 y obtuvieron posteriormente el derecho a votar en elecciones parlamentarias y presidenciales. En 1952 participaron por primera vez en una elección presidencial.',
    },

    { type: 'heading', level: 2, text: '5. Crecimiento de partidos y organizaciones' },
    {
      type: 'paragraph',
      text: 'La ampliación de la participación política coincidió con una sociedad más organizada. Distintos sectores se expresaban mediante partidos políticos, sindicatos, organizaciones estudiantiles, agrupaciones de mujeres, asociaciones profesionales y organizaciones territoriales. La democracia adquirió así una dimensión electoral y también social.',
    },

    { type: 'heading', level: 2, text: '6. Sectores populares y trabajadores' },
    {
      type: 'paragraph',
      text: 'Trabajadores urbanos y rurales comenzaron a adquirir mayor presencia política. Sus demandas podían incluir mejores salarios, derechos laborales, vivienda, acceso a salud, educación y protección social. Esto contribuyó a ampliar los temas discutidos públicamente.',
    },

    { type: 'heading', level: 2, text: '7. Campesinado y participación' },
    {
      type: 'paragraph',
      text: 'Durante buena parte del siglo XX, la participación política rural fue más limitada que la urbana. Sin embargo, procesos posteriores de organización campesina y sindicalización aumentaron su capacidad de acción colectiva. La participación política comenzó a extenderse también hacia sectores tradicionalmente menos representados.',
    },

    { type: 'heading', level: 2, text: '8. Juventud y estudiantes' },
    {
      type: 'paragraph',
      text: 'Los estudiantes también adquirieron creciente protagonismo. Organizaciones estudiantiles participaron en debates sobre educación, reformas sociales, democracia, participación política y transformaciones institucionales. La juventud comenzó a convertirse en un actor político relevante.',
    },

    { type: 'heading', level: 2, text: '9. Democratización y conflicto' },
    {
      type: 'paragraph',
      text: 'La ampliación de la participación no significó ausencia de conflicto. Al contrario, una sociedad con más actores organizados también podía experimentar mayor competencia política, demandas más intensas, polarización, disputas sobre el rol del Estado y conflictos entre proyectos sociales distintos. La democratización puede ampliar la participación sin eliminar las tensiones.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre democratización: identifica quién obtiene mayor participación; distingue participación electoral de participación social; observa cambios legales; analiza el surgimiento de nuevos actores; relaciona derechos políticos con demandas sociales; evita asumir que democratización significa ausencia de conflicto; identifica continuidades y cambios a lo largo del tiempo.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué demanda principal defendían las organizaciones descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La igualdad de derechos políticos entre mujeres y hombres.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de todas las elecciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La exclusión de los hombres de la actividad política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de las organizaciones sociales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las organizaciones buscaban que las mujeres pudieran ejercer derechos políticos en igualdad de condiciones con los hombres.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué característica tuvo la ampliación del sufragio femenino según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se produjo inmediatamente mediante una única medida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ocurrió antes de que existieran organizaciones femeninas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó toda diferencia política entre hombres y mujeres de forma instantánea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se desarrolló gradualmente mediante distintos avances legales.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El proceso avanzó por etapas y fue resultado de años de organización y cambios legales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué argumento cuestionaban principalmente las organizaciones femeninas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que las mujeres debían participar más en actividades económicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que el sexo de una persona debía determinar su acceso a derechos políticos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que los partidos debían presentar programas electorales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las elecciones debían realizarse de manera periódica.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las organizaciones cuestionaban la exclusión política basada en el sexo y defendían una ciudadanía más igualitaria.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué efecto político tuvo la incorporación plena de las mujeres al electorado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Redujo la cantidad total de votantes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó la existencia de partidos políticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Amplió el electorado y obligó a los partidos a considerar a nuevos sectores ciudadanos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Impidió la participación masculina.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La incorporación de las mujeres aumentó considerablemente el universo electoral y modificó las estrategias políticas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor el proceso descrito?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La ampliación de derechos políticos fue resultado de organización social, debate y cambios legales desarrollados a lo largo del tiempo.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los derechos políticos se expandieron automáticamente sin presión social.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La democratización dependió exclusivamente de decisiones tomadas por gobiernos extranjeros.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El sufragio femenino no produjo ningún cambio en la participación política.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El proceso muestra cómo la movilización de nuevos actores sociales puede contribuir a transformar las normas de participación política.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué fenómeno aparece principalmente descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de las organizaciones sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El abandono completo de la política por parte de la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento de la participación de distintos grupos sociales y políticos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de las demandas laborales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto muestra una sociedad con mayor organización y participación de pobladores, estudiantes, trabajadores y campesinos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación se observa entre democratización y demandas sociales?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La democratización impedía que existieran organizaciones sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una mayor participación podía permitir que nuevos grupos expresaran sus intereses y exigencias.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Los nuevos actores dejaron de plantear demandas al incorporarse a la política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ampliación de la participación redujo necesariamente toda movilización.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La incorporación de nuevos actores permitió que demandas sociales antes menos visibles adquirieran mayor presencia pública.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el aumento de la participación también podía intensificar los conflictos políticos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los sectores comenzaron a defender exactamente el mismo proyecto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque desaparecieron las diferencias ideológicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las organizaciones sociales dejaron de intervenir en asuntos públicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque distintos grupos y partidos defendían soluciones y proyectos de sociedad diferentes.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una participación más amplia también podía aumentar la competencia entre proyectos políticos con objetivos distintos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué idea sobre democracia se desprende mejor del texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Puede existir una democracia con amplia participación y, al mismo tiempo, con importantes conflictos políticos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La democracia exige que no existan diferencias sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La participación social es incompatible con las instituciones democráticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las elecciones eliminan automáticamente todas las disputas políticas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La democracia permite la expresión y competencia de intereses distintos, por lo que participación y conflicto pueden coexistir.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál conclusión permite explicar mejor la democratización de la sociedad chilena durante el siglo XX?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Consistió únicamente en aumentar la cantidad de elecciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó inmediatamente las desigualdades y los conflictos sociales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Combinó la ampliación del electorado con una creciente organización social y participación de nuevos actores, generando también mayores disputas entre proyectos políticos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Redujo progresivamente la capacidad de organización de trabajadores, estudiantes y pobladores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democratización incluyó tanto la extensión de derechos electorales como una participación social más amplia, sin eliminar la competencia política ni las tensiones existentes.',
        },
      ],
    },
  ],
};

export default democratizacionSociedadChilena;
