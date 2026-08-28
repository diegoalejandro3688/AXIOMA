// CONTENT-H7A -- Historia / U2 "Formación ciudadana", Recurso 18 (order 1 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R18 -- A C B D A B D C A C.
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
  { type: 'heading', level: 3, text: 'Texto A — Ganar una elección no significaba poder hacerlo todo' },
  { type: 'paragraph', text: 'En un país democrático, un nuevo gobierno obtuvo una amplia mayoría de votos en las elecciones.' },
  { type: 'paragraph', text: 'Sus dirigentes afirmaron que el respaldo recibido les otorgaba un mandato para desarrollar su programa.' },
  {
    type: 'paragraph',
    text: 'Poco después, algunos integrantes del gobierno propusieron impedir que ciertos medios de comunicación publicaran críticas hacia las autoridades.',
  },
  {
    type: 'paragraph',
    text: 'También sugirieron restringir las actividades de organizaciones opositoras, argumentando que estas obstaculizaban la voluntad expresada por la mayoría.',
  },
  { type: 'paragraph', text: 'Otros sectores rechazaron esas propuestas.' },
  {
    type: 'paragraph',
    text: 'Sostuvieron que ganar una elección permitía gobernar dentro de las reglas institucionales, pero no eliminaba los derechos de quienes habían votado por otras opciones.',
  },
  {
    type: 'paragraph',
    text: 'Recordaron además que las autoridades seguían sometidas a las leyes y que la existencia de oposición era parte normal de una democracia.',
  },
  {
    type: 'paragraph',
    text: 'La discusión reveló una cuestión fundamental: la legitimidad obtenida mediante elecciones es necesaria para gobernar democráticamente, pero no transforma a la mayoría en una autoridad sin límites.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Participar entre una elección y la siguiente' },
  {
    type: 'paragraph',
    text: 'En una comuna, un grupo de vecinos estaba preocupado por la falta de áreas verdes y el deterioro de algunos espacios públicos.',
  },
  { type: 'paragraph', text: 'Las siguientes elecciones municipales todavía estaban lejos, pero los vecinos decidieron organizarse.' },
  { type: 'paragraph', text: 'Primero reunieron información sobre los problemas del sector y convocaron reuniones abiertas.' },
  { type: 'paragraph', text: 'Después crearon una organización comunitaria y presentaron sus propuestas ante autoridades locales.' },
  {
    type: 'paragraph',
    text: 'Algunas personas participaron en sesiones públicas del municipio y otras desarrollaron actividades destinadas a informar a más habitantes.',
  },
  { type: 'paragraph', text: 'No todos estaban de acuerdo sobre cuál debía ser la solución.' },
  { type: 'paragraph', text: 'Un grupo defendía construir nuevas plazas, mientras otro consideraba prioritario mejorar las existentes.' },
  {
    type: 'paragraph',
    text: 'A pesar de esas diferencias, los participantes continuaron discutiendo y buscando formas de influir en las decisiones públicas.',
  },
  {
    type: 'paragraph',
    text: 'La experiencia mostró que la ciudadanía podía intervenir en asuntos comunes sin necesidad de esperar exclusivamente el momento de una elección.',
  },
];

const democraciaFundamentosAtributosDimensiones: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES',
  unitCode: 'HISTORIA.FORMACION_CIUDADANA',
  subjectKey: 'historia',
  order: 1,
  title: 'Democracia: fundamentos, atributos y dimensiones',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar los principales fundamentos, atributos y dimensiones de la democracia, reconociendo la soberanía popular, la participación ciudadana, el pluralismo, el respeto de los Derechos Humanos, la existencia de límites al poder y la importancia de instituciones que permitan la competencia política y la representación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Democracia: fundamentos, atributos y dimensiones' },

    { type: 'heading', level: 2, text: '1. ¿Qué entendemos por democracia?' },
    {
      type: 'paragraph',
      text: 'La democracia es una forma de organización política en la que el poder encuentra su legitimidad en la ciudadanía. Esto significa que quienes gobiernan no ejercen autoridad simplemente por poseer poder, sino porque existen mecanismos mediante los cuales la población participa en la formación y control de las decisiones políticas. La democracia moderna combina: participación, representación, instituciones, derechos y reglas comunes.',
    },

    { type: 'heading', level: 2, text: '2. Soberanía popular' },
    {
      type: 'paragraph',
      text: 'Uno de los fundamentos de la democracia es la soberanía popular. Esto significa que la autoridad política deriva de la ciudadanía. La soberanía popular puede expresarse mediante: elecciones, plebiscitos, participación política, organizaciones sociales y deliberación pública. No significa que todas las decisiones deban tomarse directamente por toda la población, ya que las democracias modernas utilizan ampliamente mecanismos representativos.',
    },

    { type: 'heading', level: 2, text: '3. Elecciones libres y competitivas' },
    {
      type: 'paragraph',
      text: 'Las elecciones son fundamentales para la democracia, pero deben cumplir ciertas condiciones. Entre ellas: participación libre, existencia de alternativas reales, competencia entre candidaturas, reglas conocidas, posibilidad efectiva de alternancia y respeto por los resultados. Una elección sin competencia real no basta para garantizar una democracia.',
    },

    { type: 'heading', level: 2, text: '4. Pluralismo' },
    {
      type: 'paragraph',
      text: 'Las sociedades contienen personas y grupos con ideas, intereses, identidades y proyectos políticos diferentes. El pluralismo reconoce que esas diferencias pueden expresarse legítimamente dentro del sistema político. Por eso, una democracia permite la existencia de oposición y desacuerdo.',
    },

    { type: 'heading', level: 2, text: '5. Derechos Humanos' },
    {
      type: 'paragraph',
      text: 'La democracia también requiere protección de derechos fundamentales. Entre ellos: libertad de expresión, libertad de asociación, igualdad ante la ley, participación política, libertad de conciencia y acceso a garantías judiciales. Una mayoría electoral no puede justificar cualquier vulneración de derechos.',
    },

    { type: 'heading', level: 2, text: '6. Estado de derecho' },
    {
      type: 'paragraph',
      text: 'En una democracia, quienes ejercen el poder también deben respetar las normas. Esto implica: límites al poder, instituciones fiscalizadoras, tribunales, procedimientos establecidos y garantías para las personas. La democracia y el Estado de derecho están estrechamente relacionados.',
    },

    { type: 'heading', level: 2, text: '7. Representación política' },
    {
      type: 'paragraph',
      text: 'En las democracias contemporáneas, gran parte de las decisiones públicas se toman mediante representantes. Los ciudadanos eligen autoridades para que: legislen, administren, representen intereses y adopten decisiones públicas. La representación permite organizar políticamente sociedades numerosas y complejas.',
    },

    { type: 'heading', level: 2, text: '8. Participación ciudadana' },
    {
      type: 'paragraph',
      text: 'La democracia no se limita al momento electoral. Las personas también pueden participar mediante: organizaciones comunitarias, sindicatos, centros de estudiantes, movimientos sociales, asociaciones, debates públicos y distintas formas legales de expresión ciudadana. La participación puede fortalecer la relación entre ciudadanía e instituciones.',
    },

    { type: 'heading', level: 2, text: '9. Democracia como dimensión política y social' },
    {
      type: 'paragraph',
      text: 'La democracia posee diferentes dimensiones. Una dimensión política se relaciona con elecciones, representación e instituciones. Una dimensión jurídica se relaciona con derechos y límites al poder. Una dimensión social se vincula con posibilidades efectivas de participación, inclusión y convivencia entre grupos diversos. Estas dimensiones se relacionan entre sí.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre democracia: no reduzcas democracia únicamente a elecciones; identifica soberanía popular; busca pluralismo y competencia política; verifica protección de derechos; identifica límites institucionales al poder; distingue mayoría de poder ilimitado; relaciona participación, representación y Estado de derecho.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué situación inicial otorga legitimidad democrática al gobierno descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Haber obtenido una mayoría de votos en elecciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Haber eliminado a los partidos opositores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Controlar todos los medios de comunicación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Gobernar sin instituciones fiscalizadoras.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La legitimidad democrática del gobierno proviene inicialmente del respaldo ciudadano obtenido mediante elecciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué principio democrático se vería directamente afectado al prohibir críticas de medios y organizaciones opositoras?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La propiedad privada exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La separación geográfica del territorio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El pluralismo y la libertad de expresión.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La administración económica del Estado.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia requiere que puedan expresarse ideas diversas, incluyendo posiciones críticas y opositoras.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué una mayoría electoral no puede ejercer poder sin límites?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque ganar elecciones elimina la autoridad del gobierno.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque las autoridades continúan sujetas a derechos, leyes e instituciones.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque las minorías deben gobernar en lugar de la mayoría.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las elecciones no tienen ninguna importancia en democracia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia combina gobierno de la mayoría con límites institucionales y protección de los derechos de todas las personas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué característica de la democracia representa mejor la existencia de oposición política?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de diferencias ideológicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de apoyar al gobierno elegido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la competencia política después de una elección.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'El reconocimiento de que pueden coexistir legítimamente proyectos políticos diferentes.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El pluralismo democrático permite la existencia de distintas posiciones y proyectos, incluso cuando uno de ellos gobierna.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor el problema planteado en el texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La democracia exige combinar legitimidad electoral con respeto a derechos, pluralismo y límites al ejercicio del poder.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Obtener mayoría electoral autoriza al gobierno a restringir cualquier derecho.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La democracia funciona mejor cuando desaparece la oposición.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Los derechos fundamentales dependen exclusivamente del resultado de cada elección.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia no consiste únicamente en decidir quién gobierna, sino también en establecer límites y garantizar derechos para mayorías y minorías.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué principio democrático aparece principalmente representado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de las organizaciones sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La participación ciudadana en asuntos públicos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición del desacuerdo entre vecinos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La concentración de las decisiones en una sola persona.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los vecinos participan organizándose, deliberando y presentando propuestas sobre asuntos de interés colectivo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué muestra el desacuerdo entre los vecinos sobre las posibles soluciones?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que una democracia exige eliminar todas las diferencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que solo las autoridades pueden tener opiniones distintas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que participar requiere que todos adopten exactamente la misma postura.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que el pluralismo permite discutir distintas alternativas dentro de un objetivo común.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia permite que existan diferencias legítimas y que estas sean discutidas mediante mecanismos de participación y deliberación.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué las acciones de los vecinos complementan las elecciones?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque reemplazan definitivamente a las autoridades elegidas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque permiten gobernar sin instituciones representativas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque ofrecen mecanismos de participación ciudadana entre procesos electorales.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque hacen innecesario volver a realizar elecciones.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La participación democrática puede desarrollarse continuamente mediante organizaciones, deliberación y contacto con las instituciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre representación y participación refleja mejor el texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los ciudadanos pueden elegir representantes y, al mismo tiempo, intervenir mediante organizaciones y mecanismos de participación.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Cuando existen representantes, la ciudadanía pierde toda posibilidad de participar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La participación ciudadana elimina necesariamente la representación política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las organizaciones comunitarias reemplazan jurídicamente al gobierno municipal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia representativa puede coexistir con diversas formas de participación ciudadana entre elecciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál interpretación representa mejor una concepción amplia de democracia a partir de ambos textos?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La democracia consiste únicamente en permitir que la mayoría decida durante las elecciones.' },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Las elecciones son suficientes aunque no existan libertades ni participación posterior.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La democracia combina elección de autoridades, protección de derechos, pluralismo, límites al poder y participación ciudadana.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'La participación social permite prescindir completamente de instituciones representativas.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una democracia plena combina mecanismos electorales con instituciones, derechos, pluralismo y oportunidades permanentes de participación.',
        },
      ],
    },
  ],
};

export default democraciaFundamentosAtributosDimensiones;
