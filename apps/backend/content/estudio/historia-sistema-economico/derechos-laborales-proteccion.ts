// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 25 (order 4 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R25 -- B D A C B C A D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Trabajar más horas no significaba renunciar a todos los límites' },
  {
    type: 'paragraph',
    text: 'Un grupo de trabajadores de una empresa comenzó a cumplir jornadas más extensas debido a un aumento temporal de la demanda.',
  },
  {
    type: 'paragraph',
    text: 'Al principio aceptaron realizar horas adicionales porque esperaban recibir una compensación correspondiente.',
  },
  { type: 'paragraph', text: 'Con el paso de las semanas, algunos notaron que las horas trabajadas no aparecían correctamente registradas.' },
  { type: 'paragraph', text: 'Otros señalaron que los descansos eran cada vez más breves.' },
  {
    type: 'paragraph',
    text: 'Cuando plantearon la situación a su supervisor, este respondió que, debido a las necesidades de la empresa, todos debían adaptarse.',
  },
  { type: 'paragraph', text: 'Uno de los trabajadores recordó que las condiciones laborales no dependían únicamente de la voluntad del empleador.' },
  {
    type: 'paragraph',
    text: 'El grupo decidió solicitar orientación para revisar si la jornada, los descansos y los pagos estaban cumpliendo con las normas aplicables.',
  },
  {
    type: 'paragraph',
    text: 'La situación mostró que las necesidades productivas de una empresa no eliminan automáticamente los derechos de quienes trabajan.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando una denuncia permitió revisar las condiciones de trabajo' },
  { type: 'paragraph', text: 'En una pequeña empresa, varios trabajadores realizaban tareas que implicaban contacto frecuente con maquinaria.' },
  { type: 'paragraph', text: 'Durante meses habían solicitado mejoras en algunos elementos de seguridad.' },
  { type: 'paragraph', text: 'La administración respondía que los equipos existentes eran suficientes.' },
  {
    type: 'paragraph',
    text: 'Después de un incidente menor que no produjo consecuencias graves, los trabajadores decidieron presentar una denuncia ante una institución fiscalizadora.',
  },
  {
    type: 'paragraph',
    text: 'Un funcionario visitó el lugar, revisó las condiciones y solicitó antecedentes sobre las medidas preventivas adoptadas.',
  },
  { type: 'paragraph', text: 'La inspección detectó deficiencias y exigió implementar mejoras.' },
  { type: 'paragraph', text: 'La empresa debió actualizar procedimientos, entregar capacitación y corregir algunos elementos de protección.' },
  {
    type: 'paragraph',
    text: 'La situación mostró que la protección laboral no depende únicamente de acuerdos individuales entre empleador y trabajador, sino también de normas e instituciones encargadas de exigir su cumplimiento.',
  },
];

const derechosLaboralesProteccion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 4,
  title: 'Derechos laborales y mecanismos institucionales de protección',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la importancia de los derechos laborales dentro de una sociedad democrática, reconociendo normas y mecanismos institucionales destinados a proteger a las personas trabajadoras, así como analizar situaciones en las que esos derechos pueden ser vulnerados y las vías disponibles para exigir su cumplimiento.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Derechos laborales y mecanismos institucionales de protección' },

    { type: 'heading', level: 2, text: '1. ¿Qué son los derechos laborales?' },
    {
      type: 'paragraph',
      text: 'Los derechos laborales son normas y garantías que regulan la relación entre trabajadores y empleadores. Buscan establecer condiciones mínimas relacionadas con: remuneraciones, jornadas, descansos, seguridad, contratos, protección frente a abusos y organización colectiva. Su existencia busca evitar relaciones completamente desiguales.',
    },

    { type: 'heading', level: 2, text: '2. Contrato de trabajo' },
    {
      type: 'paragraph',
      text: 'El contrato establece obligaciones y derechos para ambas partes. Puede definir elementos como: funciones, jornada, remuneración, lugar de trabajo, duración y otras condiciones pactadas. El contrato no puede eliminar derechos establecidos por la legislación.',
    },

    { type: 'heading', level: 2, text: '3. Remuneración' },
    {
      type: 'paragraph',
      text: 'La remuneración corresponde al pago que recibe una persona por su trabajo. Su forma y monto deben ajustarse a las normas vigentes y a las condiciones acordadas. El pago oportuno y completo es una obligación fundamental del empleador.',
    },

    { type: 'heading', level: 2, text: '4. Jornada y descanso' },
    {
      type: 'paragraph',
      text: 'La legislación laboral regula cuánto tiempo puede trabajar una persona y qué descansos debe recibir. Estas normas buscan proteger: salud, seguridad, tiempo de recuperación y conciliación con otras dimensiones de la vida.',
    },

    { type: 'heading', level: 2, text: '5. Seguridad y salud laboral' },
    {
      type: 'paragraph',
      text: 'Los empleadores deben adoptar medidas destinadas a proteger la integridad y salud de quienes trabajan. Esto puede incluir: prevención de riesgos, capacitación, condiciones adecuadas, elementos de protección y protocolos. La seguridad no depende exclusivamente del trabajador.',
    },

    { type: 'heading', level: 2, text: '6. No discriminación' },
    {
      type: 'paragraph',
      text: 'Las relaciones laborales deben respetar la dignidad de las personas. No deberían existir decisiones arbitrarias basadas en características que no guardan relación con la capacidad o condiciones objetivas del trabajo. La igualdad y la no discriminación son principios relevantes.',
    },

    { type: 'heading', level: 2, text: '7. Mecanismos institucionales' },
    {
      type: 'paragraph',
      text: 'Cuando una persona considera que sus derechos laborales han sido vulnerados, puede recurrir a mecanismos institucionales. Según el caso, estos pueden incluir: fiscalización administrativa, orientación, denuncia, mediación, tribunales y representación sindical. La vía depende de la naturaleza del conflicto.',
    },

    { type: 'heading', level: 2, text: '8. Fiscalización' },
    {
      type: 'paragraph',
      text: 'La fiscalización busca comprobar si las normas laborales se están cumpliendo. Puede incluir: revisión de contratos, condiciones de seguridad, jornadas, remuneraciones y otras obligaciones legales. La fiscalización permite detectar y corregir incumplimientos.',
    },

    { type: 'heading', level: 2, text: '9. Protección y cumplimiento' },
    {
      type: 'paragraph',
      text: 'Reconocer un derecho en una norma no garantiza automáticamente su cumplimiento. También se requieren: información, instituciones, procedimientos, capacidad de denuncia y mecanismos de reparación. Por eso, derechos e institucionalidad están estrechamente vinculados.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una situación laboral: identifica el derecho involucrado; determina si existe una obligación del empleador; distingue acuerdo contractual de norma legal; identifica un posible incumplimiento; busca qué institución o mecanismo puede intervenir; analiza si existe desigualdad de poder; distingue prevención de reparación.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema aparece principalmente en el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de trabajadores.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Posibles incumplimientos relacionados con jornada, descansos y registro de horas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de realizar cualquier hora adicional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de una empresa.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto muestra dudas sobre el registro de horas, la extensión de la jornada y la reducción de descansos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué deberían hacer los trabajadores antes de asumir que la empresa puede imponer cualquier condición?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Renunciar inmediatamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ignorar el contrato.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Trabajar sin registrar sus horas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Revisar las normas y mecanismos institucionales aplicables.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las relaciones laborales están reguladas por normas que no dependen exclusivamente de la decisión del empleador.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué la necesidad productiva de la empresa no basta para justificar cualquier extensión de jornada?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la actividad económica también debe desarrollarse dentro de límites laborales establecidos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna empresa puede aumentar su producción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los trabajadores no pueden aceptar nunca horas adicionales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las jornadas no tienen relación con la ley.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las necesidades productivas deben compatibilizarse con las normas que regulan jornada, descanso y compensación.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el registro de las horas trabajadas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar la obligación de pagar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar completamente el contrato.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Permitir verificar si la jornada y las compensaciones corresponden a lo efectivamente trabajado.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Impedir toda fiscalización.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un registro adecuado permite comprobar el cumplimiento de obligaciones relacionadas con jornada y remuneración.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los derechos laborales dejan de aplicarse cuando aumenta la demanda.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La relación laboral combina necesidades productivas con límites y garantías destinadas a proteger a las personas trabajadoras.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los empleadores no pueden organizar la producción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cualquier conflicto laboral debe terminar necesariamente en juicio.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La actividad empresarial puede requerir ajustes, pero estos deben respetar derechos y procedimientos laborales.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué mecanismo institucional aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una elección parlamentaria.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una campaña comercial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una fiscalización laboral.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una negociación internacional.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una institución revisa las condiciones de trabajo y exige correcciones cuando detecta incumplimientos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué es importante la fiscalización en este caso?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque permite verificar si las condiciones reales de trabajo cumplen las normas de seguridad.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque elimina la responsabilidad del empleador.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque reemplaza todas las leyes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque impide que los trabajadores hagan denuncias.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fiscalización conecta las normas con las condiciones efectivas existentes en el lugar de trabajo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué demuestra que la empresa haya tenido que modificar procedimientos y capacitación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que toda empresa fiscalizada debe cerrar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que la seguridad depende exclusivamente del trabajador.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las normas laborales no generan obligaciones concretas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que la fiscalización puede producir medidas destinadas a corregir condiciones que no cumplen adecuadamente con las exigencias.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La revisión institucional puede derivar en acciones correctivas cuando se detectan deficiencias.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre derecho e institucionalidad refleja mejor el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Basta con que exista una norma, aunque nadie pueda exigirla.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los derechos se fortalecen cuando existen mecanismos capaces de fiscalizar y exigir su cumplimiento.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las instituciones sustituyen completamente a los trabajadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las denuncias eliminan la necesidad de prevención.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los derechos requieren mecanismos que permitan verificar su cumplimiento y corregir vulneraciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál interpretación representa mejor la función de los mecanismos de protección laboral?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Garantizar que nunca ocurra ningún conflicto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permitir que el empleador defina unilateralmente todas las condiciones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Crear vías de prevención, fiscalización y defensa que hagan efectivos derechos que de otro modo podrían quedar solo reconocidos formalmente.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar toda relación contractual por decisiones estatales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La protección laboral requiere normas y mecanismos concretos que permitan prevenir, detectar y corregir incumplimientos.',
        },
      ],
    },
  ],
};

export default derechosLaboralesProteccion;
