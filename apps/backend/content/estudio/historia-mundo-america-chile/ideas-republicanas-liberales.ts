// CONTENT-H1A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 1. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que content/estudio/lenguaje-evaluar/*.ts (contentBlocks, keys
// sin padding, texto completo en el stemContent de cada una de sus 5
// preguntas -- sin bloque nuevo ni cambio de schema).
//
// Fuentes históricas (sección 13 del encargo): los dos textos son
// originales/adaptados para ZETRYND, SIN autoría real atribuida -- se
// presentan como "En una asamblea..."/"La independencia..." sin nombrar a
// ninguna persona histórica real ni fuente bibliográfica ficticia.
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
  { type: 'heading', level: 3, text: 'Texto A — El poder y la ley' },
  {
    type: 'paragraph',
    text: 'En una asamblea celebrada durante las primeras décadas del siglo XIX, un representante defendió la necesidad de establecer una constitución para el nuevo gobierno:',
  },
  {
    type: 'paragraph',
    text: 'Durante demasiado tiempo se ha confundido obedecer las leyes con obedecer la voluntad de una persona. Si queremos llamar libres a nuestros ciudadanos, ninguna autoridad debe encontrarse por encima de las normas que rigen a todos.',
  },
  {
    type: 'paragraph',
    text: 'El gobierno debe poseer fuerza suficiente para hacer cumplir las leyes, pero esa misma fuerza necesita límites. Quien ejecuta las decisiones públicas no debe crear por sí mismo todas las normas ni controlar a quienes juzgan su cumplimiento.',
  },
  {
    type: 'paragraph',
    text: 'Tampoco basta con reemplazar a un gobernante por otro. Si la población continúa sin participar en la elección de sus representantes y si ciertas personas conservan privilegios únicamente por su nacimiento, habremos cambiado los nombres sin modificar los principios.',
  },
  { type: 'paragraph', text: 'Una república requiere ciudadanos sujetos a leyes comunes y autoridades que puedan responder por sus decisiones.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Nuevas repúblicas, antiguas desigualdades' },
  {
    type: 'paragraph',
    text: 'La independencia de buena parte de América durante las primeras décadas del siglo XIX permitió que nuevas autoridades proclamaran principios políticos diferentes de los utilizados por las monarquías coloniales.',
  },
  {
    type: 'paragraph',
    text: 'Conceptos como nación, soberanía, ciudadanía y constitución comenzaron a ocupar un lugar central en los debates públicos. Diversos gobiernos organizaron congresos, redactaron constituciones y defendieron la idea de que la autoridad debía justificarse en nombre de la nación.',
  },
  { type: 'paragraph', text: 'Sin embargo, establecer una república no significó que todos los habitantes participaran de inmediato en igualdad de condiciones.' },
  {
    type: 'paragraph',
    text: 'En distintos países, el derecho a votar dependió durante ciertos períodos de requisitos relacionados con propiedad, ingresos, alfabetización u otras condiciones. Las mujeres tampoco fueron incorporadas a la ciudadanía política en igualdad con los hombres.',
  },
  { type: 'paragraph', text: 'Además, las sociedades americanas conservaron fuertes desigualdades económicas y sociales heredadas del período anterior.' },
  {
    type: 'paragraph',
    text: 'Estas tensiones no significan que los principios republicanos carecieran de importancia. Al contrario, las ideas de igualdad jurídica, representación y soberanía ofrecieron un lenguaje político que distintos grupos utilizaron posteriormente para exigir una ampliación de derechos.',
  },
  {
    type: 'paragraph',
    text: 'Así, el siglo XIX puede entenderse no solo como el momento de formación de nuevas repúblicas, sino también como un período de disputa sobre quiénes podían formar parte efectiva de la ciudadanía.',
  },
];

const ideasRepublicanasLiberales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 1,
  title: 'Ideas republicanas y liberales en el siglo XIX',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo las ideas republicanas y liberales cuestionaron el orden político tradicional y contribuyeron a transformaciones en Europa y América durante el siglo XIX, reconociendo principios como soberanía popular, ciudadanía, igualdad ante la ley, división de poderes, derechos individuales y constitucionalismo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Ideas republicanas y liberales en el siglo XIX' },

    { type: 'heading', level: 2, text: '1. El orden político tradicional' },
    {
      type: 'paragraph',
      text: 'Durante gran parte de la Edad Moderna europea, muchas monarquías legitimaban el poder del rey mediante: tradición; herencia dinástica; privilegios estamentales; concentración del poder político. La sociedad tampoco se concebía necesariamente como una comunidad de ciudadanos iguales ante la ley. Las revoluciones políticas de fines del siglo XVIII y los movimientos del XIX cuestionaron progresivamente ese orden.',
    },

    { type: 'heading', level: 2, text: '2. ¿Qué entendemos por liberalismo político?' },
    {
      type: 'paragraph',
      text: 'El liberalismo político defendió principios como: derechos individuales; igualdad jurídica; limitación del poder estatal; constituciones; representación política; división de poderes. Una idea central era que el gobernante no debía ejercer un poder ilimitado.',
    },

    { type: 'heading', level: 2, text: '3. Igualdad jurídica no significó igualdad social completa' },
    {
      type: 'paragraph',
      text: 'El liberalismo defendió la igualdad ante la ley y criticó los privilegios legales heredados. Sin embargo, durante buena parte del siglo XIX: el sufragio fue restringido; las mujeres permanecieron excluidas de la ciudadanía política; persistieron diferencias económicas y sociales profundas. Por eso debemos distinguir entre igualdad jurídica proclamada y igualdad política o social efectiva.',
    },

    { type: 'heading', level: 2, text: '4. ¿Qué es el republicanismo?' },
    {
      type: 'paragraph',
      text: 'El republicanismo sostuvo que el poder político debía orientarse al bien público y no entenderse como propiedad personal de un monarca. Entre sus principios destacan: soberanía popular; ciudadanía; representación; leyes comunes; responsabilidad de las autoridades; participación en los asuntos públicos.',
    },

    { type: 'heading', level: 2, text: '5. Soberanía popular' },
    {
      type: 'paragraph',
      text: 'Una transformación fundamental fue la idea de que la autoridad política debía originarse en la comunidad política o en la nación. Esto contrastaba con formas de legitimidad basadas exclusivamente en: la herencia; la dinastía; el derecho divino.',
    },

    { type: 'heading', level: 2, text: '6. Constitución' },
    {
      type: 'paragraph',
      text: 'Las constituciones buscaban establecer reglas fundamentales para organizar el poder. Podían determinar: funciones de las autoridades; límites del gobierno; derechos; instituciones; mecanismos de representación. El constitucionalismo fue una herramienta importante para limitar la arbitrariedad.',
    },

    { type: 'heading', level: 2, text: '7. División de poderes' },
    {
      type: 'paragraph',
      text: 'La concentración del poder podía favorecer abusos. Por eso, el pensamiento liberal defendió la separación entre funciones como: legislativa; ejecutiva; judicial. La idea fundamental no era simplemente crear más instituciones, sino evitar que una sola autoridad controlara todo el poder.',
    },

    { type: 'heading', level: 2, text: '8. Revoluciones e independencia' },
    {
      type: 'paragraph',
      text: 'Las ideas liberales y republicanas influyeron en procesos como: revoluciones europeas; independencia de las colonias americanas; formación de repúblicas; elaboración de constituciones. Sin embargo, las ideas no explican por sí solas estos procesos. También influyeron factores: económicos; sociales; militares; internacionales; locales.',
    },

    { type: 'heading', level: 2, text: '9. América: adaptación, no simple copia' },
    {
      type: 'paragraph',
      text: 'Las nuevas repúblicas americanas utilizaron principios como: soberanía; representación; constitución; ciudadanía. Pero los adaptaron a realidades propias. La construcción de los nuevos Estados estuvo marcada por conflictos sobre: quién podía participar; cuánto poder tendría el gobierno central; cómo organizar el territorio; qué relación existiría entre Iglesia y Estado; qué derechos serían reconocidos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Cuando aparezca una fuente del siglo XIX: identifica quién legitima el poder; observa si menciona derechos; busca referencias a ciudadanía o representación; analiza si limita o concentra el poder; distingue principios de su aplicación real; relaciona la fuente con cambios políticos más amplios; evita explicar procesos complejos mediante una sola causa.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué principio político aparece con mayor claridad en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El poder ilimitado del gobernante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La subordinación de las autoridades a la ley.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La transmisión hereditaria del gobierno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de toda institución estatal.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fuente sostiene que ninguna autoridad debe ubicarse por encima de las normas y que el ejercicio del poder necesita límites.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué idea liberal se expresa cuando el texto señala que quien ejecuta las decisiones no debe controlar también todas las normas y a quienes las juzgan?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'División de poderes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Mercantilismo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Privilegio estamental.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Absolutismo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto propone separar distintas funciones del poder para evitar su concentración en una sola autoridad.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el representante afirma que "no basta con reemplazar a un gobernante por otro"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque considera innecesaria cualquier forma de gobierno.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque sostiene que una transformación política requiere modificar también principios e instituciones.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque quiere restaurar todos los privilegios hereditarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque rechaza la existencia de leyes escritas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El emisor plantea que cambiar a la persona que gobierna no transforma realmente el sistema si continúan la exclusión política y los privilegios heredados.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué elemento del texto representa mejor una crítica al orden estamental?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La existencia de autoridades ejecutivas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La defensa de leyes comunes y el rechazo de privilegios por nacimiento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La necesidad de que el Estado tenga fuerza.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La organización de una asamblea política.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El rechazo a privilegios fundados en el nacimiento se relaciona directamente con la igualdad jurídica defendida por el liberalismo.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Cuál de las siguientes interpretaciones sitúa mejor la fuente dentro de las transformaciones políticas del siglo XIX?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Refleja un intento por reemplazar principios monárquicos y privilegios heredados por un orden constitucional basado en ciudadanía y límites al poder.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Defiende la conservación íntegra del absolutismo mediante nuevas instituciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Propone que todas las diferencias económicas desaparezcan inmediatamente mediante una constitución.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Rechaza cualquier forma de representación política para fortalecer la autoridad personal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente reúne principios característicos del liberalismo y republicanismo: constitucionalismo, ciudadanía, igualdad jurídica, representación y limitación del poder.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál fue una transformación política señalada en el texto después de las independencias americanas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición inmediata de todas las desigualdades sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La incorporación de conceptos como soberanía, ciudadanía y constitución.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de los congresos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El regreso generalizado al gobierno colonial.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que estos conceptos adquirieron un papel central en la construcción de los nuevos órdenes políticos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué tensión principal identifica el texto en las nuevas repúblicas americanas?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La contradicción entre principios de ciudadanía e igualdad y una participación política todavía restringida.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia completa de constituciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El rechazo absoluto de la soberanía nacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de diferencias sociales antes de la independencia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las nuevas repúblicas proclamaban principios de igualdad y ciudadanía, pero la participación efectiva continuaba limitada para amplios sectores.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué permite concluir el hecho de que el voto estuviera sujeto a requisitos de propiedad, ingresos o alfabetización?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que la ciudadanía política del siglo XIX podía ser restringida.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que todas las personas adultas votaban en igualdad de condiciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las repúblicas eliminaron inmediatamente las jerarquías sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las constituciones prohibían cualquier elección.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Estos requisitos limitaban quién podía participar electoralmente, mostrando que la ciudadanía efectiva no era universal.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué función histórica atribuye el texto a los principios republicanos a pesar de sus limitaciones iniciales?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Permitieron justificar exclusivamente los privilegios heredados.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Ofrecieron conceptos que posteriormente podían utilizarse para exigir una ampliación de derechos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Impidieron cualquier transformación política posterior.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminaron los conflictos sobre ciudadanía.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que nociones como igualdad jurídica y soberanía fueron utilizadas posteriormente para fundamentar nuevas demandas políticas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes conclusiones sintetiza mejor la relación entre liberalismo, republicanismo y transformaciones americanas durante el siglo XIX?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La adopción de principios republicanos produjo de inmediato una democracia política y social completa.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las nuevas repúblicas incorporaron principios de soberanía, representación e igualdad jurídica, pero su aplicación estuvo limitada y fue objeto de disputas posteriores.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La independencia americana ocurrió únicamente como consecuencia de ideas políticas europeas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los principios liberales tuvieron poca relación con la organización institucional de los nuevos Estados.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La formación republicana introdujo nuevos principios de legitimidad y organización política, pero estos coexistieron con exclusiones políticas y desigualdades que hicieron de la ciudadanía un proceso en disputa.',
        },
      ],
    },
  ],
};

export default ideasRepublicanasLiberales;
