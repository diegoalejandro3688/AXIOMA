// CONTENT-H2A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 6. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts (CONTENT-H1A).
//
// Answer keys: R6 usa la versión DEFINITIVA post-corrección editorial
// (redistribución de posición de alternativas correctas) -- B C A D B C A
// D B C, verificada exactamente contra la fuente de este incremento.
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
  { type: 'heading', level: 3, text: 'Texto A — Una crisis que cambió las expectativas sobre el Estado' },
  {
    type: 'paragraph',
    text: 'A comienzos de la década de 1930, una fábrica ubicada en una importante ciudad industrial redujo drásticamente su producción. En pocos meses, cientos de trabajadores perdieron su empleo y numerosos comercios cercanos comenzaron también a enfrentar dificultades.',
  },
  {
    type: 'paragraph',
    text: 'Durante un primer momento, algunas autoridades sostuvieron que la recuperación económica ocurriría sin necesidad de una intervención pública considerable. Sin embargo, el desempleo permaneció elevado y muchas familias agotaron rápidamente sus ahorros.',
  },
  { type: 'paragraph', text: 'El gobierno comenzó entonces a financiar obras públicas para crear empleos, estableció nuevas regulaciones financieras y desarrolló programas de ayuda dirigidos a los sectores más afectados.' },
  { type: 'paragraph', text: 'Estas medidas generaron un intenso debate.' },
  { type: 'paragraph', text: 'Sus partidarios sostenían que una crisis de esa magnitud exigía que el Estado asumiera responsabilidades que anteriormente habían sido más limitadas.' },
  { type: 'paragraph', text: 'Sus críticos advertían que una intervención demasiado amplia podía aumentar excesivamente el poder estatal y generar gastos difíciles de sostener.' },
  {
    type: 'paragraph',
    text: 'El debate no terminó con la recuperación económica. En distintos países, la experiencia de la crisis contribuyó a modificar las expectativas sobre qué debía hacer el Estado frente al desempleo, la pobreza y la inseguridad económica.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Tres respuestas frente a una época de incertidumbre' },
  { type: 'paragraph', text: 'Durante las décadas posteriores a la Primera Guerra Mundial, distintas sociedades buscaron respuestas frente a la inestabilidad política, los conflictos sociales y las crisis económicas.' },
  {
    type: 'paragraph',
    text: 'En el país Alfa, un movimiento llegó al poder prometiendo restaurar la unidad nacional. Una vez instalado en el gobierno, prohibió a sus principales adversarios, sometió los medios de comunicación a una estricta supervisión y utilizó organizaciones oficiales para movilizar a la población en apoyo del líder.',
  },
  {
    type: 'paragraph',
    text: 'En el país Beta, un presidente construyó una amplia base política entre trabajadores urbanos. El gobierno promovió legislación laboral, utilizó discursos transmitidos por nuevos medios de comunicación y presentó al Estado como mediador entre trabajadores y empresarios. Aunque el Ejecutivo adquirió gran protagonismo, el régimen surgió en un contexto latinoamericano diferente del totalitarismo europeo.',
  },
  {
    type: 'paragraph',
    text: 'En el país Gamma, los partidos continuaron compitiendo en elecciones y la oposición mantuvo representación política. Paralelamente, el Estado amplió seguros frente al desempleo, servicios sanitarios y sistemas de pensiones con el propósito de reducir la inseguridad social.',
  },
  {
    type: 'paragraph',
    text: 'En los tres casos aumentó la presencia del Estado, pero ese elemento común no permite afirmar que los sistemas fueran equivalentes. La diferencia fundamental estaba también en la forma de organizar el poder, la relación con la ciudadanía y los mecanismos utilizados para enfrentar los problemas sociales.',
  },
];

const crisisEstadoLiberal: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 6,
  title: 'Crisis del Estado liberal y nuevos modelos políticos y económicos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la crisis del Estado liberal durante la primera mitad del siglo XX y analizar el surgimiento de nuevas respuestas políticas y económicas, distinguiendo las características de los totalitarismos europeos, el populismo latinoamericano y los inicios del Estado de bienestar, así como los diferentes modos en que estos modelos ampliaron o restringieron la intervención estatal y la participación política.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Crisis del Estado liberal y nuevos modelos políticos y económicos' },

    { type: 'heading', level: 2, text: '1. La crisis del Estado liberal' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XIX, en numerosos países se consolidaron sistemas políticos vinculados con principios liberales como: constituciones; representación; derechos individuales; división de poderes; propiedad privada; economías de mercado. Pero estos sistemas enfrentaron fuertes tensiones durante las primeras décadas del siglo XX.',
    },

    { type: 'heading', level: 2, text: '2. ¿Por qué entró en crisis?' },
    {
      type: 'paragraph',
      text: 'No existió una única causa. Entre los procesos que contribuyeron a la crisis estuvieron: los efectos de la Primera Guerra Mundial; conflictos sociales; desigualdad; crecimiento de movimientos obreros; nacionalismos; dificultades de los sistemas parlamentarios; crisis económicas; la Gran Depresión iniciada en 1929. La combinación fue diferente en cada país. Por eso debemos evitar una explicación monocausal.',
    },

    { type: 'heading', level: 2, text: '3. La Gran Depresión' },
    {
      type: 'paragraph',
      text: 'La crisis económica iniciada en 1929 produjo, con distinta intensidad según cada país: caída de la producción; reducción del comercio; desempleo; quiebras; aumento de la pobreza. La magnitud de la crisis contribuyó a cuestionar la idea de que el mercado siempre podía recuperar por sí mismo el equilibrio económico.',
    },

    { type: 'heading', level: 2, text: '4. Mayor intervención estatal' },
    {
      type: 'paragraph',
      text: 'Una de las transformaciones del período fue la expansión del papel del Estado. Distintos gobiernos comenzaron a intervenir más en: regulación económica; empleo; protección social; infraestructura; producción; servicios públicos. Pero mayor intervención estatal no significaba necesariamente el mismo sistema político. Este punto es fundamental.',
    },

    { type: 'heading', level: 2, text: '5. Los totalitarismos europeos' },
    {
      type: 'paragraph',
      text: 'En algunos países europeos surgieron regímenes totalitarios que pretendieron ejercer un amplio control sobre la sociedad. Entre sus características podían encontrarse: concentración del poder; liderazgo autoritario; partido único o predominante; persecución de opositores; propaganda; censura; movilización política dirigida desde el Estado; rechazo del pluralismo democrático. Los casos históricos tuvieron características propias, por lo que no deben tratarse como idénticos.',
    },

    { type: 'heading', level: 2, text: '6. Fascismo y nazismo' },
    {
      type: 'paragraph',
      text: 'El fascismo italiano y el nazismo alemán compartieron características autoritarias y antidemocráticas. Sin embargo, el nazismo incorporó de manera central una ideología racial extrema y antisemita. Por eso, reconocer elementos comunes no significa borrar las diferencias entre los regímenes.',
    },

    { type: 'heading', level: 2, text: '7. Populismo en América Latina' },
    {
      type: 'paragraph',
      text: 'En distintos países latinoamericanos surgieron experiencias políticas denominadas populistas. Aunque fueron diversas, algunas compartieron: liderazgo político fuerte; apelación directa a sectores populares; incorporación política de trabajadores; nacionalismo económico; mayor presencia estatal; uso intensivo de discursos y medios de comunicación. No deben confundirse automáticamente con los totalitarismos europeos.',
    },

    { type: 'heading', level: 2, text: '8. Inicios del Estado de bienestar' },
    {
      type: 'paragraph',
      text: 'Otra respuesta al conflicto social y económico consistió en ampliar la protección ofrecida por el Estado. Se desarrollaron políticas relacionadas con: seguridad social; salud; educación; protección laboral; pensiones; seguros frente a determinados riesgos. Estas políticas ayudaron a construir progresivamente lo que conocemos como Estado de bienestar.',
    },

    { type: 'heading', level: 2, text: '9. Tres respuestas diferentes' },
    {
      type: 'paragraph',
      text: 'Es importante no mezclar los conceptos. Totalitarismo: elimina o reduce drásticamente el pluralismo; concentra el poder; utiliza mecanismos de control político y social. Populismo latinoamericano: busca movilizar e incorporar políticamente a sectores populares; suele fortalecer el Ejecutivo y la intervención estatal; presenta experiencias muy diversas. Estado de bienestar: amplía responsabilidades sociales y económicas del Estado; puede desarrollarse dentro de sistemas democráticos. Los tres implicaron de diferentes maneras un Estado con mayor protagonismo, pero no son equivalentes.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente de este período: identifica el problema al que intenta responder; distingue intervención estatal de autoritarismo; observa si existe pluralismo político; analiza qué sectores sociales busca movilizar o proteger; identifica mecanismos de propaganda o participación; compara diferentes respuestas frente a una misma crisis; evita tratar totalitarismo, populismo y Estado de bienestar como sinónimos.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema económico aparece principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Un aumento permanente de las exportaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desempleo provocado por una fuerte caída de la actividad económica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una escasez completa de trabajadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento acelerado de todos los comercios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La disminución de la producción provoca pérdida de empleos y dificultades económicas para trabajadores y comercios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué acción adoptó el gobierno frente a la crisis?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Prohibió cualquier forma de ayuda pública.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó todas las regulaciones económicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Financió obras públicas y desarrolló medidas de asistencia y regulación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Entregó el control político a las empresas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto menciona obras públicas, regulación financiera y programas de ayuda como ejemplos de una intervención estatal más amplia.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué transformación histórica refleja principalmente la respuesta gubernamental descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una ampliación del papel del Estado frente a problemas económicos y sociales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición definitiva del Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El retorno de las monarquías absolutas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de cualquier regulación económica.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La crisis favoreció debates y políticas que asignaban al Estado responsabilidades mayores en la economía y la protección social.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué permite concluir el debate entre partidarios y críticos de las medidas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que todos los sectores compartían exactamente la misma visión sobre el Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que la intervención estatal eliminó inmediatamente toda discusión política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que la crisis solo generó consecuencias económicas y ninguna discusión política.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que existían distintas posiciones sobre cuánto debía intervenir el Estado para enfrentar la crisis.' },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fuente contrapone a quienes consideraban necesaria una mayor intervención y a quienes advertían sobre sus posibles costos y efectos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Cuál interpretación relaciona mejor esta fuente con la crisis del Estado liberal durante la primera mitad del siglo XX?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La crisis demostró que todos los países abandonaron de inmediato las instituciones liberales y adoptaron el mismo régimen político.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La incapacidad de las respuestas tradicionales para resolver rápidamente problemas económicos favoreció debates sobre una mayor responsabilidad estatal, aunque las soluciones políticas adoptadas fueron diversas.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La Gran Depresión eliminó cualquier participación del Estado en las economías occidentales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El desempleo llevó necesariamente al establecimiento de regímenes totalitarios en todos los países afectados.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La crisis cuestionó respuestas económicas tradicionales y favoreció una mayor intervención estatal, pero los países respondieron mediante modelos políticos y económicos diferentes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica permite asociar mejor al país Alfa con un régimen totalitario?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La existencia de seguros de desempleo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La celebración de elecciones competitivas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de adversarios políticos y el control de los medios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La mediación entre trabajadores y empresarios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La persecución de opositores, el control comunicacional y la movilización dirigida son características vinculadas a los regímenes totalitarios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué característica del país Beta se relaciona mejor con experiencias populistas latinoamericanas?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La apelación política a trabajadores mediante un liderazgo fuerte y una mayor mediación estatal.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación completa de cualquier relación entre dirigentes y sectores populares.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia absoluta del Estado en las relaciones laborales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La restauración de un sistema político monárquico.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La movilización de sectores populares, el liderazgo presidencial y la intervención estatal aparecen entre las características de diversas experiencias populistas latinoamericanas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué el país Gamma se aproxima más al desarrollo de un Estado de bienestar que a un régimen totalitario?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque eliminó los programas sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque concentró todo el poder en un único líder.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque prohibió la competencia electoral.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque amplió la protección social mientras mantuvo pluralismo político y competencia electoral.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La expansión de políticas sociales puede realizarse dentro de un sistema democrático y no implica por sí misma una organización totalitaria.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué elemento comparten los tres casos según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación del pluralismo político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una mayor presencia del Estado frente a problemas políticos, económicos o sociales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La adopción de un partido único.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El establecimiento del mismo modelo económico.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los tres casos muestran una ampliación del protagonismo estatal, aunque sus instituciones, objetivos y relaciones con la ciudadanía son diferentes.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué conclusión permite comparar adecuadamente los tres casos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todo aumento de la intervención estatal produce necesariamente un régimen totalitario.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Populismo y Estado de bienestar son dos nombres para exactamente el mismo sistema político.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La crisis del liberalismo generó respuestas diversas que podían compartir un mayor protagonismo estatal, pero diferían profundamente en pluralismo, participación y organización del poder.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los distintos modelos surgidos durante el período rechazaron por igual cualquier intervención económica o social del Estado.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La mayor presencia estatal fue una característica de distintas respuestas a las crisis del período, pero no permite equipararlas: sus instituciones, mecanismos políticos y relaciones con la ciudadanía podían ser profundamente diferentes.',
        },
      ],
    },
  ],
};

export default crisisEstadoLiberal;
