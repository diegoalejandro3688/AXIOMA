// CONTENT-H7A -- Historia / U2 "Formación ciudadana", Recurso 19 (order 2 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R19 -- B A D C B C A D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando una institución debía controlar a otra' },
  { type: 'paragraph', text: 'Un grupo de parlamentarios comenzó a investigar la forma en que una autoridad del gobierno había utilizado recursos públicos.' },
  {
    type: 'paragraph',
    text: 'Durante varias sesiones solicitaron antecedentes y citaron a funcionarios para conocer cómo se habían tomado ciertas decisiones.',
  },
  {
    type: 'paragraph',
    text: 'Algunos integrantes del gobierno criticaron la investigación y afirmaron que el Congreso estaba interfiriendo con la administración del Estado.',
  },
  { type: 'paragraph', text: 'Los parlamentarios respondieron que no pretendían reemplazar al Ejecutivo en sus funciones.' },
  { type: 'paragraph', text: 'Su objetivo, señalaron, era ejercer las atribuciones de fiscalización que les correspondían.' },
  {
    type: 'paragraph',
    text: 'La discusión mostró que en una democracia distintas instituciones pueden entrar en tensión sin que eso signifique necesariamente una crisis institucional.',
  },
  {
    type: 'paragraph',
    text: 'El Ejecutivo conserva sus responsabilidades de gobierno, mientras el Congreso puede ejercer mecanismos de control dentro de sus competencias.',
  },
  {
    type: 'paragraph',
    text: 'La existencia de estas relaciones permite que quienes ejercen poder público deban explicar y justificar determinadas decisiones.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Resolver un conflicto sin recibir órdenes del gobierno' },
  { type: 'paragraph', text: 'Dos personas mantenían un conflicto relacionado con el cumplimiento de un contrato.' },
  { type: 'paragraph', text: 'Después de intentar llegar a un acuerdo, una de ellas decidió recurrir a un tribunal.' },
  { type: 'paragraph', text: 'Durante el proceso, ambas partes presentaron antecedentes y argumentos.' },
  { type: 'paragraph', text: 'Un funcionario del gobierno manifestó públicamente cuál pensaba que debía ser el resultado del caso.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, el tribunal debía resolver utilizando las normas aplicables y los antecedentes presentados, sin recibir instrucciones de esa autoridad.',
  },
  { type: 'paragraph', text: 'La independencia judicial no significaba que los jueces pudieran decidir arbitrariamente.' },
  { type: 'paragraph', text: 'Por el contrario, debían fundamentar sus decisiones y actuar dentro del orden jurídico.' },
  {
    type: 'paragraph',
    text: 'La situación mostraba que la independencia de una institución democrática no equivale a ausencia de reglas, sino a capacidad para cumplir sus funciones sin subordinación indebida a otros poderes.',
  },
];

const institucionalidadDemocraticaChile: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE',
  unitCode: 'HISTORIA.FORMACION_CIUDADANA',
  subjectKey: 'historia',
  order: 2,
  title: 'Institucionalidad democrática en Chile',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la organización básica de la institucionalidad democrática chilena, reconociendo las funciones generales del Poder Ejecutivo, el Congreso Nacional y el Poder Judicial, así como la importancia de los mecanismos de representación, control y autonomía institucional dentro de un Estado de derecho.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Institucionalidad democrática en Chile' },

    { type: 'heading', level: 2, text: '1. Instituciones y democracia' },
    {
      type: 'paragraph',
      text: 'Una democracia necesita instituciones que organicen el ejercicio del poder. Estas permiten: distribuir funciones, representar a la ciudadanía, elaborar normas, administrar el Estado, resolver conflictos y fiscalizar a las autoridades. La existencia de instituciones diferenciadas ayuda a evitar una concentración excesiva del poder.',
    },

    { type: 'heading', level: 2, text: '2. Poder Ejecutivo' },
    {
      type: 'paragraph',
      text: 'En Chile, el Poder Ejecutivo es encabezado por el Presidente o Presidenta de la República. Entre sus funciones generales se encuentran: dirigir el gobierno, administrar el Estado, participar en la formación de las leyes, conducir políticas públicas y ejercer atribuciones definidas por la Constitución y las leyes. El Ejecutivo no actúa sin límites, ya que sus decisiones están sujetas al orden jurídico.',
    },

    { type: 'heading', level: 2, text: '3. Congreso Nacional' },
    {
      type: 'paragraph',
      text: 'El Congreso Nacional está compuesto por: Cámara de Diputadas y Diputados; Senado. Entre sus funciones se encuentran: participar en la elaboración de leyes, representar políticamente a la ciudadanía, debatir asuntos públicos y fiscalizar determinadas actuaciones del gobierno según las atribuciones de cada cámara. El Congreso es una institución fundamental de representación y deliberación.',
    },

    { type: 'heading', level: 2, text: '4. Poder Judicial' },
    {
      type: 'paragraph',
      text: 'El Poder Judicial administra justicia mediante tribunales. Su función es resolver conflictos y aplicar el derecho en casos concretos. Para cumplir adecuadamente su tarea, resulta fundamental que los tribunales puedan actuar con independencia respecto de otros poderes.',
    },

    { type: 'heading', level: 2, text: '5. Separación de funciones' },
    {
      type: 'paragraph',
      text: 'En un sistema democrático, distintas instituciones cumplen funciones diferentes. Esta distribución busca evitar que una sola autoridad pueda: legislar, gobernar, juzgar, sin controles. La separación de funciones contribuye a limitar el poder y proteger los derechos.',
    },

    { type: 'heading', level: 2, text: '6. Controles institucionales' },
    {
      type: 'paragraph',
      text: 'Las instituciones democráticas pueden ejercer controles sobre otras autoridades. Estos mecanismos buscan: fiscalizar decisiones, exigir responsabilidad, verificar cumplimiento de normas y prevenir abusos. Los controles no significan que las instituciones deban impedir permanentemente el funcionamiento de las demás, sino que existan límites efectivos.',
    },

    { type: 'heading', level: 2, text: '7. Organismos autónomos' },
    {
      type: 'paragraph',
      text: 'Además de los poderes tradicionales, existen instituciones con grados importantes de autonomía. Su autonomía busca permitir que determinadas funciones se realicen con independencia de los intereses inmediatos del gobierno de turno. Dependiendo de la institución, estas funciones pueden relacionarse con: control, elecciones, política monetaria, persecución penal y otras materias definidas por el ordenamiento jurídico.',
    },

    { type: 'heading', level: 2, text: '8. Representación política' },
    {
      type: 'paragraph',
      text: 'La ciudadanía participa en la institucionalidad mediante la elección de autoridades. La representación política permite que distintos intereses y proyectos tengan presencia en instituciones democráticas. Por eso, elecciones competitivas y pluralismo son elementos fundamentales del sistema.',
    },

    { type: 'heading', level: 2, text: '9. Instituciones y Estado de derecho' },
    {
      type: 'paragraph',
      text: 'Ninguna institución democrática posee poder ilimitado. Todas deben actuar dentro de: Constitución, leyes, procedimientos y competencias determinadas. El Estado de derecho exige que las autoridades puedan ser controladas y que sus decisiones estén sujetas a normas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre institucionalidad: identifica qué institución aparece; determina su función principal; evita atribuir todas las funciones a una sola autoridad; distingue gobierno, legislación y justicia; identifica mecanismos de control; relaciona autonomía con independencia funcional; vincula institucionalidad con Estado de derecho.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué institución aparece ejerciendo una función de fiscalización?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Poder Judicial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Congreso Nacional.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una organización empresarial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un medio de comunicación privado.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto describe a parlamentarios utilizando atribuciones de fiscalización sobre actuaciones del gobierno.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué poder del Estado administra y dirige el gobierno?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Poder Ejecutivo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El Poder Judicial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Congreso exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los tribunales electorales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Poder Ejecutivo tiene entre sus funciones generales dirigir el gobierno y administrar el Estado.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué la fiscalización parlamentaria no implica necesariamente reemplazar al Ejecutivo?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el Congreso controla directamente todas las decisiones administrativas.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque el Ejecutivo deja de tener responsabilidades cuando es fiscalizado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque fiscalizar significa gobernar temporalmente en lugar del Presidente.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque ambas instituciones poseen funciones distintas y el control puede ejercerse sin asumir las atribuciones de la otra.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La separación de funciones permite que una institución controle ciertos actos de otra sin reemplazarla en sus competencias.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué principio democrático aparece principalmente reflejado en la situación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La concentración completa del poder.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la representación política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de controles institucionales entre autoridades.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de toda diferencia entre poderes del Estado.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los controles institucionales buscan limitar el poder y exigir responsabilidad a las autoridades.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión explica mejor la relación entre separación de funciones y fiscalización?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las instituciones democráticas deben trabajar completamente aisladas unas de otras.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La distribución de funciones permite que distintas autoridades ejerzan competencias propias y, al mismo tiempo, existan mecanismos de control y responsabilidad.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Fiscalizar implica necesariamente impedir que el gobierno funcione.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La democracia requiere que todas las instituciones tengan exactamente las mismas atribuciones.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La democracia combina diferenciación de funciones con controles recíprocos que ayudan a evitar abusos y concentración excesiva del poder.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué institución debe resolver el conflicto descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Congreso Nacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Presidencia de la República.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un tribunal de justicia.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una organización social.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los tribunales ejercen la función jurisdiccional y resuelven conflictos aplicando el derecho.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué significa independencia judicial en el contexto del texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Que los tribunales puedan resolver sin recibir órdenes indebidas de otros poderes.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que los jueces puedan ignorar todas las leyes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que el Poder Judicial gobierne el país.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que ninguna decisión judicial necesite fundamentos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La independencia judicial permite que los tribunales cumplan sus funciones sin subordinación política indebida.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué independencia no significa arbitrariedad?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque los jueces deben obedecer siempre al gobierno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las autoridades políticas deben decidir cada sentencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los tribunales no pueden interpretar normas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las decisiones judiciales deben fundarse en normas, procedimientos y antecedentes del caso.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La independencia opera dentro del Estado de derecho y no elimina la obligación de fundamentar y someter las decisiones a las normas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre autonomía institucional y Estado de derecho representa mejor el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una institución autónoma puede actuar fuera de todas las normas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La autonomía permite ejercer funciones específicas con independencia, pero dentro de competencias y reglas jurídicas.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La autonomía implica que una institución puede asumir funciones de todos los poderes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Estado de derecho elimina cualquier autonomía institucional.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La autonomía protege el ejercicio independiente de ciertas funciones, pero esas instituciones siguen sujetas al orden jurídico.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál interpretación sintetiza mejor el funcionamiento de una institucionalidad democrática?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las decisiones importantes deben concentrarse en una sola autoridad.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las instituciones funcionan democráticamente únicamente cuando nunca existen desacuerdos entre ellas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El poder se distribuye entre instituciones con funciones diferenciadas, sujetas a normas y mecanismos de control que buscan proteger derechos y evitar abusos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La independencia institucional permite que cada organismo actúe sin límites legales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una institucionalidad democrática distribuye funciones y establece controles y límites jurídicos para evitar la concentración arbitraria del poder.',
        },
      ],
    },
  ],
};

export default institucionalidadDemocraticaChile;
