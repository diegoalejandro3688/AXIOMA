// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 24 (order 3 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R24 -- A D B C A C B D A C.
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
  { type: 'heading', level: 3, text: 'Texto A — Una actividad que hacía crecer la economía local' },
  { type: 'paragraph', text: 'En una región comenzó a expandirse una actividad exportadora que utilizaba intensivamente recursos naturales.' },
  { type: 'paragraph', text: 'Durante los primeros años aumentaron las inversiones y se crearon nuevos empleos.' },
  { type: 'paragraph', text: 'También crecieron los ingresos de algunas empresas y comercios locales.' },
  { type: 'paragraph', text: 'Las autoridades destacaban que la actividad estaba contribuyendo al crecimiento económico de la zona.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, algunas comunidades comenzaron a expresar preocupación por la disminución de la disponibilidad de agua y por cambios observados en ecosistemas cercanos.',
  },
  {
    type: 'paragraph',
    text: 'Los trabajadores valoraban las nuevas oportunidades laborales, aunque distintos grupos discutían sobre la duración de esos empleos y las condiciones en que se desarrollaban.',
  },
  { type: 'paragraph', text: 'La situación generó un debate.' },
  { type: 'paragraph', text: 'Algunas personas defendían continuar expandiendo la actividad por sus beneficios económicos.' },
  {
    type: 'paragraph',
    text: 'Otras proponían establecer límites y nuevas exigencias ambientales para evitar que el crecimiento actual produjera costos difíciles de revertir en el futuro.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Una inversión que costaba más al principio' },
  {
    type: 'paragraph',
    text: 'Una ciudad decidió reemplazar progresivamente parte de su infraestructura energética por tecnologías menos contaminantes.',
  },
  { type: 'paragraph', text: 'El proyecto exigía una inversión inicial considerable.' },
  {
    type: 'paragraph',
    text: 'Algunos habitantes cuestionaron el gasto y señalaron que continuar utilizando los sistemas existentes sería más barato en el corto plazo.',
  },
  { type: 'paragraph', text: 'Las autoridades explicaron que la comparación debía incluir también los costos futuros.' },
  { type: 'paragraph', text: 'Las nuevas instalaciones consumían menos energía y reducían ciertas emisiones.' },
  { type: 'paragraph', text: 'Además, podían disminuir algunos gastos de operación durante los años siguientes.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, el proyecto también requería capacitación, mantenimiento especializado y adaptación de trabajadores y empresas.',
  },
  { type: 'paragraph', text: 'La decisión no ofrecía beneficios gratuitos ni inmediatos.' },
  {
    type: 'paragraph',
    text: 'Su evaluación dependía de comparar costos presentes con posibles beneficios económicos, ambientales y sociales durante un período más extenso.',
  },
];

const modelosDesarrolloImpactos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 3,
  title: 'Modelos de desarrollo: impactos sociales y medioambientales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá analizar distintos modelos y estrategias de desarrollo considerando sus efectos económicos, sociales y medioambientales, reconociendo tensiones entre crecimiento, distribución, uso de recursos naturales y sostenibilidad, así como la importancia de evaluar beneficios y costos en el corto y largo plazo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Modelos de desarrollo: impactos sociales y medioambientales' },

    { type: 'heading', level: 2, text: '1. Crecimiento y desarrollo' },
    {
      type: 'paragraph',
      text: 'El crecimiento económico se refiere al aumento de la producción de bienes y servicios de una economía. El desarrollo, en cambio, es un concepto más amplio. Puede incluir dimensiones como: ingreso, educación, salud, empleo, distribución de oportunidades, calidad de vida y condiciones ambientales. Por eso, una economía puede crecer sin que todos los grupos reciban los mismos beneficios.',
    },

    { type: 'heading', level: 2, text: '2. Modelos de desarrollo' },
    {
      type: 'paragraph',
      text: 'Un modelo de desarrollo reúne decisiones y orientaciones sobre cómo organizar la economía y promover el bienestar. Puede considerar aspectos como: rol del Estado, rol de empresas privadas, comercio exterior, industrialización, uso de recursos naturales, políticas sociales e inversión pública. No existe una única forma histórica de organizar estas dimensiones.',
    },

    { type: 'heading', level: 2, text: '3. Especialización productiva' },
    {
      type: 'paragraph',
      text: 'Algunos países basan una parte importante de su economía en ciertos sectores o recursos. Esto puede generar: exportaciones, empleo, ingresos fiscales e inversión. Pero una alta dependencia de pocas actividades también puede aumentar la vulnerabilidad frente a: cambios de precios internacionales, agotamiento de recursos y crisis externas.',
    },

    { type: 'heading', level: 2, text: '4. Impactos sociales' },
    {
      type: 'paragraph',
      text: 'El crecimiento de una actividad económica puede producir beneficios, pero estos no siempre se distribuyen de manera uniforme. Es necesario analizar: empleos creados, salarios, condiciones laborales, acceso a servicios, distribución territorial y desigualdad. Preguntar “¿quién gana y quién asume los costos?” es fundamental.',
    },

    { type: 'heading', level: 2, text: '5. Medioambiente y producción' },
    {
      type: 'paragraph',
      text: 'La producción utiliza recursos naturales y puede generar impactos sobre: agua, aire, suelo, biodiversidad y ecosistemas. Algunos daños pueden afectar a personas que no reciben directamente los beneficios de una actividad económica. Esto conecta con el concepto de externalidad visto en R23.',
    },

    { type: 'heading', level: 2, text: '6. Desarrollo sostenible' },
    {
      type: 'paragraph',
      text: 'El desarrollo sostenible busca satisfacer necesidades presentes considerando también la capacidad de las generaciones futuras para satisfacer las suyas. Esto implica pensar en: uso responsable de recursos, conservación ambiental, viabilidad económica, bienestar social y largo plazo. No significa detener toda actividad económica, sino considerar sus efectos futuros.',
    },

    { type: 'heading', level: 2, text: '7. Recursos renovables y no renovables' },
    {
      type: 'paragraph',
      text: 'Algunos recursos pueden regenerarse bajo determinadas condiciones. Otros existen en cantidades limitadas. Por eso, la estrategia de desarrollo puede variar según: disponibilidad, velocidad de renovación, intensidad de extracción, alternativas tecnológicas y capacidad de gestión.',
    },

    { type: 'heading', level: 2, text: '8. Tecnología e innovación' },
    {
      type: 'paragraph',
      text: 'La innovación puede permitir: producir con menos recursos, reducir contaminación, aumentar productividad, reutilizar materiales y desarrollar nuevas fuentes de energía. Sin embargo, una nueva tecnología también puede producir efectos sociales y ambientales que deben evaluarse.',
    },

    { type: 'heading', level: 2, text: '9. Decisiones y trade-offs' },
    {
      type: 'paragraph',
      text: 'Muchas decisiones de desarrollo implican trade-offs, es decir, situaciones en que obtener un beneficio puede exigir asumir un costo o renunciar parcialmente a otra alternativa. Por ejemplo: producción vs. conservación; inversión presente vs. beneficio futuro; empleo inmediato vs. riesgo ambiental; costo de una regulación vs. reducción de daños. El análisis debe comparar alternativas y no asumir soluciones perfectas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre desarrollo: distingue crecimiento de desarrollo; identifica beneficios económicos; identifica costos sociales y ambientales; determina quién recibe cada efecto; distingue corto y largo plazo; busca externalidades; analiza sostenibilidad y alternativas.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué beneficio económico aparece mencionado directamente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La creación de empleos y aumento de inversiones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa del uso de recursos naturales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de toda actividad exportadora.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La reducción obligatoria de todos los salarios.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala que la expansión de la actividad generó inversiones y nuevas oportunidades laborales.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué preocupación medioambiental aparece en el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El exceso de producción de agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La recuperación inmediata de todos los ecosistemas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la actividad productiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La menor disponibilidad de agua y cambios en ecosistemas cercanos.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las comunidades expresan preocupación por efectos ambientales relacionados con agua y ecosistemas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el crecimiento económico no permite por sí solo evaluar completamente la situación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el crecimiento nunca produce beneficios.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque también deben considerarse efectos sociales y ambientales, además de cómo se distribuyen los beneficios y costos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque la producción y el empleo no tienen relación con el desarrollo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todo impacto ambiental implica cerrar inmediatamente la actividad.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El desarrollo requiere analizar múltiples dimensiones y no únicamente cuánto aumenta la producción o la inversión.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué tensión aparece principalmente en el debate descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La obligación de elegir entre tener economía o tener sociedad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad de aplicar cualquier regulación.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La búsqueda de beneficios económicos actuales frente a posibles costos ambientales y sociales de largo plazo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia total de intereses diferentes entre los actores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El caso contrapone beneficios presentes con riesgos y costos que podrían manifestarse o mantenerse en el futuro.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál criterio permitiría evaluar mejor si la estrategia es sostenible?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Considerar si los beneficios económicos pueden mantenerse sin deteriorar de forma crítica los recursos y condiciones sociales necesarios para el futuro.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Medir únicamente las ganancias obtenidas durante el primer año.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Ignorar cualquier impacto que no aparezca reflejado directamente en los precios.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Suponer que todo recurso natural puede recuperarse sin límites.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La sostenibilidad exige analizar si una actividad puede mantenerse en el tiempo sin comprometer gravemente recursos, ecosistemas o bienestar futuro.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica principal tiene la nueva inversión descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'No requiere ningún gasto inicial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Elimina toda necesidad de mantenimiento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tiene un costo inicial elevado, pero puede generar beneficios posteriores.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Impide cualquier innovación tecnológica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La inversión exige recursos al comienzo, mientras parte de sus beneficios se espera durante los años posteriores.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué sería insuficiente comparar únicamente el costo inicial de ambas alternativas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el costo inicial nunca importa.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque también deben evaluarse costos y beneficios que ocurren en el tiempo.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque toda tecnología nueva es necesariamente mejor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los efectos ambientales no pueden analizarse económicamente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las decisiones de desarrollo pueden producir efectos durante períodos largos, por lo que una evaluación completa debe considerar corto y largo plazo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué trade-off aparece reflejado principalmente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Reducir contaminación sin realizar ninguna inversión.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Obtener todos los beneficios antes de implementar el proyecto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar automáticamente cualquier costo laboral.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Asumir mayores costos y ajustes presentes a cambio de posibles beneficios futuros.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El proyecto requiere recursos y adaptaciones actuales con la expectativa de obtener beneficios posteriores.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué muestra la necesidad de capacitar trabajadores?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que las transformaciones tecnológicas también pueden producir efectos sociales y requerir adaptación.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que la tecnología elimina siempre todos los empleos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que únicamente los impactos ambientales importan para el desarrollo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que la innovación no modifica las formas de trabajo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los cambios productivos pueden exigir nuevas habilidades y ajustes laborales, por lo que sus efectos no son exclusivamente técnicos o ambientales.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor el análisis de modelos de desarrollo presentado en ambos textos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una estrategia de desarrollo debe maximizar únicamente la producción inmediata.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Los efectos ambientales deben evaluarse separados de cualquier consecuencia social.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evaluar el desarrollo exige comparar crecimiento, distribución de beneficios y costos, impactos sociales, uso de recursos y consecuencias de largo plazo.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Toda actividad que produzca algún impacto ambiental debe ser necesariamente eliminada.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El desarrollo es multidimensional y requiere evaluar simultáneamente resultados económicos, sociales y ambientales tanto presentes como futuros.',
        },
      ],
    },
  ],
};

export default modelosDesarrolloImpactos;
