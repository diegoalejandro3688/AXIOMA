// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 27 (order 6 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
// Cierra la U3 "Sistema económico" y completa la asignatura Historia en source
// (27 recursos / 270 preguntas).
//
// Answer keys: R27 -- C A D B C B D A C B.
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
  { type: 'heading', level: 3, text: 'Texto A — Una máquina no reemplazó todo el trabajo' },
  { type: 'paragraph', text: 'Una empresa dedicada a la distribución de productos incorporó un sistema automatizado para clasificar paquetes.' },
  { type: 'paragraph', text: 'Antes del cambio, varios trabajadores realizaban manualmente gran parte de esa tarea.' },
  { type: 'paragraph', text: 'Con el nuevo sistema, la clasificación se hizo más rápida y disminuyeron algunos errores.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, la empresa todavía necesitaba trabajadores para supervisar los equipos, resolver problemas, organizar despachos y realizar tareas que requerían decisiones no automatizadas.',
  },
  { type: 'paragraph', text: 'Algunos empleados recibieron capacitación para asumir nuevas funciones.' },
  { type: 'paragraph', text: 'Otros tuvieron mayores dificultades porque sus tareas anteriores habían cambiado significativamente.' },
  {
    type: 'paragraph',
    text: 'La empresa aumentó su productividad, pero el proceso también generó preocupación entre trabajadores que no sabían si podrían adaptarse a las nuevas exigencias.',
  },
  { type: 'paragraph', text: 'El caso mostró que la tecnología podía sustituir determinadas tareas y, al mismo tiempo, transformar o crear otras.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Trabajar desde cualquier lugar no significaba trabajar a cualquier hora' },
  { type: 'paragraph', text: 'Una empresa permitió que parte de sus trabajadores realizara sus funciones desde sus hogares varios días por semana.' },
  {
    type: 'paragraph',
    text: 'Muchos valoraron la reducción de los tiempos de traslado y la posibilidad de organizar algunas actividades con mayor flexibilidad.',
  },
  { type: 'paragraph', text: 'Sin embargo, comenzaron a aparecer nuevos problemas.' },
  { type: 'paragraph', text: 'Algunos supervisores enviaban mensajes durante la noche y esperaban respuestas inmediatas.' },
  {
    type: 'paragraph',
    text: 'Varios trabajadores sentían que nunca terminaban completamente su jornada porque podían recibir solicitudes a cualquier hora.',
  },
  {
    type: 'paragraph',
    text: 'También surgieron diferencias entre quienes contaban con espacios adecuados para trabajar y quienes debían compartir habitaciones o equipos con otras personas.',
  },
  {
    type: 'paragraph',
    text: 'La empresa decidió establecer horarios de contacto, mejorar el registro de jornada y entregar recursos para determinadas necesidades laborales.',
  },
  {
    type: 'paragraph',
    text: 'La experiencia mostró que una nueva modalidad podía ofrecer ventajas sin eliminar la necesidad de regular tiempos, condiciones y responsabilidades.',
  },
];

const transformacionesMundoTrabajo: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 6,
  title: 'Transformaciones del mundo del trabajo y derechos laborales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá analizar transformaciones recientes del mundo del trabajo, reconociendo el impacto de cambios tecnológicos, nuevas formas de organización laboral y nuevas modalidades de empleo, así como sus efectos sobre las competencias requeridas, las condiciones de trabajo y la necesidad de adaptar mecanismos de protección de derechos laborales.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Transformaciones del mundo del trabajo y derechos laborales' },

    { type: 'heading', level: 2, text: '1. El mundo del trabajo cambia' },
    {
      type: 'paragraph',
      text: 'Las formas de trabajar no permanecen iguales a lo largo del tiempo. Cambian debido a factores como: tecnología, transformaciones productivas, globalización, organización empresarial, cambios sociales y nuevas regulaciones. Estos procesos pueden modificar empleos, tareas y condiciones laborales.',
    },

    { type: 'heading', level: 2, text: '2. Tecnología y automatización' },
    {
      type: 'paragraph',
      text: 'La automatización permite que máquinas o sistemas digitales realicen tareas antes desarrolladas por personas. Puede producir: aumento de productividad, reducción de algunas tareas repetitivas, creación de nuevas ocupaciones, transformación de empleos existentes y desaparición de determinadas funciones. Por eso, automatización no significa necesariamente desaparición de todo trabajo.',
    },

    { type: 'heading', level: 2, text: '3. Nuevas competencias' },
    {
      type: 'paragraph',
      text: 'Cuando cambian las tecnologías, también pueden cambiar las habilidades requeridas. Los trabajadores pueden necesitar: capacitación, competencias digitales, adaptación, nuevos conocimientos técnicos y capacidad para aprender continuamente. La educación y formación laboral adquieren importancia durante estas transformaciones.',
    },

    { type: 'heading', level: 2, text: '4. Teletrabajo' },
    {
      type: 'paragraph',
      text: 'Las tecnologías digitales permiten desarrollar algunas actividades laborales a distancia. El teletrabajo puede ofrecer: flexibilidad, ahorro de tiempo de traslado y nuevas posibilidades de organización. Pero también puede generar desafíos relacionados con: jornada, desconexión, supervisión, condiciones del espacio de trabajo y separación entre trabajo y vida personal.',
    },

    { type: 'heading', level: 2, text: '5. Plataformas digitales' },
    {
      type: 'paragraph',
      text: 'Algunas actividades laborales se coordinan mediante plataformas digitales. Estas pueden conectar: trabajadores, consumidores, empresas y servicios. Esta modalidad puede ofrecer flexibilidad, pero también plantea preguntas sobre: estabilidad, ingresos, protección social, responsabilidad y condición jurídica de quienes prestan servicios.',
    },

    { type: 'heading', level: 2, text: '6. Flexibilidad laboral' },
    {
      type: 'paragraph',
      text: 'La flexibilidad puede referirse a cambios en: horarios, ubicación, funciones, contratación y organización del trabajo. Puede beneficiar a trabajadores y empresas en determinadas circunstancias. Sin embargo, también puede producir inseguridad si significa ausencia de protección o ingresos impredecibles.',
    },

    { type: 'heading', level: 2, text: '7. Nuevos riesgos' },
    {
      type: 'paragraph',
      text: 'Las transformaciones laborales también pueden generar nuevos problemas. Por ejemplo: vigilancia digital, disponibilidad permanente, aislamiento, inestabilidad, brechas de capacitación y desplazamiento de ciertas tareas. Los mecanismos de protección deben considerar estos cambios.',
    },

    { type: 'heading', level: 2, text: '8. Continuidades' },
    {
      type: 'paragraph',
      text: 'Aunque cambien las tecnologías, varias cuestiones fundamentales permanecen. Entre ellas: remuneración, seguridad, jornada, descanso, dignidad, protección frente a abusos y posibilidad de organizarse. Las nuevas formas de trabajo no hacen desaparecer automáticamente los derechos laborales.',
    },

    { type: 'heading', level: 2, text: '9. Adaptación institucional' },
    {
      type: 'paragraph',
      text: 'Cuando el mundo laboral cambia, las instituciones pueden necesitar adaptar: regulaciones, mecanismos de fiscalización, sistemas de protección social, capacitación y criterios de seguridad laboral. El desafío consiste en responder a nuevas condiciones sin asumir que las reglas del pasado pueden aplicarse siempre de manera idéntica.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre transformaciones laborales: identifica qué cambió; distingue tarea de empleo completo; analiza beneficios y riesgos; identifica quiénes deben adaptarse; observa qué derechos continúan siendo relevantes; distingue flexibilidad de ausencia de protección; relaciona transformación tecnológica con respuesta institucional.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué cambio introdujo inicialmente la empresa?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminó toda tecnología del proceso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cerró completamente sus operaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Incorporó un sistema automatizado para clasificar paquetes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Sustituyó todas las actividades por trabajo manual.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El cambio principal fue la incorporación de tecnología para automatizar una tarea que antes se realizaba principalmente de manera manual.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué ocurrió con algunos trabajadores después de la automatización?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Recibieron capacitación para desempeñar nuevas funciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Dejaron automáticamente de tener cualquier tarea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se prohibió que utilizaran tecnología.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todos continuaron realizando exactamente el mismo trabajo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto indica que parte de los trabajadores fue capacitada para adaptarse a las nuevas necesidades de la empresa.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué sería incorrecto afirmar que la automatización eliminó todo el trabajo humano en la empresa?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la máquina dejó de funcionar inmediatamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la productividad disminuyó completamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque ningún trabajador cambió de función.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque algunas tareas fueron automatizadas, mientras otras continuaron requiriendo supervisión, organización y decisiones humanas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tecnología reemplazó ciertas tareas específicas, pero no eliminó todas las funciones realizadas por personas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué desafío laboral aparece principalmente en el proceso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad absoluta de utilizar nuevas tecnologías.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La necesidad de capacitación y adaptación frente a la transformación de tareas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de toda productividad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de mantener los mismos procesos para siempre.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando cambian las tareas, algunos trabajadores necesitan adquirir nuevas competencias para desempeñar funciones diferentes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión interpreta mejor el efecto de la automatización descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Toda automatización produce necesariamente desempleo total.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La tecnología solo produce beneficios y nunca genera tensiones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La automatización puede aumentar productividad y transformar la composición de las tareas, generando simultáneamente oportunidades de adaptación y riesgos para trabajadores cuyas funciones cambian.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las tecnologías no afectan la organización del trabajo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El impacto tecnológico puede combinar mejoras productivas con transformaciones laborales que exigen capacitación y generan incertidumbre para algunos trabajadores.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué beneficio del teletrabajo aparece directamente mencionado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de cualquier jornada laboral.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La reducción de tiempos de traslado para algunos trabajadores.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la supervisión.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de responder mensajes durante toda la noche.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una de las ventajas señaladas es disminuir el tiempo utilizado en desplazarse entre hogar y lugar de trabajo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué problema representa la expectativa de responder mensajes a cualquier hora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El aumento automático de todos los salarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición del trabajo digital.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad de utilizar comunicaciones laborales.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La dificultad para establecer límites claros entre jornada laboral y tiempo personal.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La disponibilidad permanente puede extender de hecho el trabajo más allá del horario establecido y dificultar la desconexión.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué muestra la diferencia entre las condiciones físicas de los hogares?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que una misma modalidad laboral puede producir efectos distintos según las condiciones de cada trabajador.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que todas las personas experimentan el teletrabajo exactamente de la misma forma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que trabajar desde casa elimina cualquier desigualdad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que el lugar de trabajo nunca influye en las condiciones laborales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las ventajas o dificultades del teletrabajo también dependen de recursos, espacio y condiciones disponibles para cada persona.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué la empresa estableció horarios de contacto y mejoró el registro de jornada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para obligar a los trabajadores a estar disponibles permanentemente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para eliminar cualquier flexibilidad.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para adaptar mecanismos de protección y organización a una modalidad de trabajo diferente.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Para impedir el uso de herramientas digitales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las nuevas formas de trabajo pueden requerir adaptar reglas y controles para proteger derechos que continúan siendo relevantes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor las transformaciones del mundo del trabajo mostradas en ambos textos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las nuevas tecnologías hacen innecesarios todos los derechos laborales anteriores.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los cambios tecnológicos y organizacionales pueden generar productividad y flexibilidad, pero también nuevos riesgos que exigen capacitación y adaptación de las formas de protección laboral.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Las transformaciones laborales afectan únicamente a las empresas y nunca a los trabajadores.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'La mejor respuesta a cualquier innovación es impedir su utilización.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las transformaciones laborales ofrecen nuevas posibilidades, pero también modifican riesgos y necesidades de protección, por lo que trabajadores, empresas e instituciones deben adaptarse.',
        },
      ],
    },
  ],
};

export default transformacionesMundoTrabajo;
