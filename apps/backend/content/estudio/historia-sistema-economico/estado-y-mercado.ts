// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 23 (order 2 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R23 -- C A D B C B A D C B.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando contaminar tenía un costo que nadie estaba pagando' },
  {
    type: 'paragraph',
    text: 'Varias empresas de una zona industrial descargaban residuos que deterioraban la calidad del aire y afectaban a comunidades cercanas.',
  },
  {
    type: 'paragraph',
    text: 'Las empresas consideraban dentro de sus costos el uso de maquinaria, materias primas, salarios y transporte.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, los problemas respiratorios, el deterioro ambiental y otras consecuencias sufridas por habitantes de la zona no aparecían directamente en los costos de producción de las empresas.',
  },
  {
    type: 'paragraph',
    text: 'Las autoridades decidieron establecer nuevas normas ambientales y exigir inversiones destinadas a reducir las emisiones.',
  },
  { type: 'paragraph', text: 'Algunas empresas argumentaron que cumplir las nuevas exigencias aumentaría sus costos.' },
  {
    type: 'paragraph',
    text: 'Los residentes, en cambio, sostenían que anteriormente parte del costo de la actividad económica estaba siendo asumido por personas que no participaban de las decisiones productivas.',
  },
  {
    type: 'paragraph',
    text: 'La discusión mostró que el precio de un producto no siempre incorpora todos los costos que su producción genera para la sociedad.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Ayudar a pagar un servicio también tenía un costo' },
  {
    type: 'paragraph',
    text: 'Un municipio detectó que algunas familias tenían dificultades para pagar el transporte necesario para llegar a centros educativos y de salud.',
  },
  { type: 'paragraph', text: 'Las autoridades decidieron entregar un subsidio que reducía parte del precio pagado por esas familias.' },
  { type: 'paragraph', text: 'La medida permitió que más personas pudieran utilizar regularmente el servicio.' },
  { type: 'paragraph', text: 'Sin embargo, el municipio debía financiar el subsidio mediante recursos públicos.' },
  {
    type: 'paragraph',
    text: 'Algunos habitantes apoyaban la política porque consideraban que mejoraba el acceso a servicios importantes.',
  },
  { type: 'paragraph', text: 'Otros preguntaban si los mismos recursos podían utilizarse de manera más eficiente en otras necesidades.' },
  { type: 'paragraph', text: 'También existía preocupación por establecer criterios claros para determinar quiénes podían recibir el beneficio.' },
  {
    type: 'paragraph',
    text: 'La discusión mostró que una política estatal puede generar beneficios concretos y, al mismo tiempo, exigir decisiones sobre financiamiento, prioridades y distribución de recursos limitados.',
  },
];

const estadoYMercado: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 2,
  title: 'Relaciones entre el Estado y el mercado',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar distintas formas de relación entre el Estado y el mercado, reconociendo funciones estatales como regulación, tributación, provisión de bienes y servicios, protección de derechos y corrección de fallas de mercado, así como analizar los efectos y tensiones que pueden producir estas intervenciones.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Relaciones entre el Estado y el mercado' },

    { type: 'heading', level: 2, text: '1. Estado y mercado' },
    {
      type: 'paragraph',
      text: 'En las economías modernas, el mercado cumple una función importante en la producción e intercambio de bienes y servicios. Pero el Estado también participa de distintas maneras. Puede: establecer reglas, fiscalizar, recaudar impuestos, entregar subsidios, proveer servicios, regular actividades y proteger derechos. Por eso, Estado y mercado interactúan constantemente.',
    },

    { type: 'heading', level: 2, text: '2. ¿Por qué regula el Estado?' },
    {
      type: 'paragraph',
      text: 'La regulación busca establecer condiciones para el funcionamiento de determinadas actividades. Puede orientarse a: proteger consumidores, reducir riesgos, asegurar estándares, evitar abusos, proteger el medioambiente y promover competencia. La regulación no significa necesariamente que el Estado produzca directamente el bien o servicio.',
    },

    { type: 'heading', level: 2, text: '3. Impuestos' },
    {
      type: 'paragraph',
      text: 'Los impuestos son pagos obligatorios establecidos por el Estado. Permiten financiar: educación, salud, infraestructura, seguridad, programas sociales y funcionamiento de instituciones públicas. También pueden utilizarse para modificar incentivos económicos.',
    },

    { type: 'heading', level: 2, text: '4. Subsidios' },
    {
      type: 'paragraph',
      text: 'Un subsidio es un apoyo económico destinado a reducir costos o favorecer determinada actividad o grupo. Puede aplicarse, por ejemplo, para: facilitar acceso a bienes, apoyar producción, incentivar ciertas conductas y proteger sectores específicos. Los subsidios también implican costos fiscales y deben ser financiados.',
    },

    { type: 'heading', level: 2, text: '5. Bienes y servicios públicos' },
    {
      type: 'paragraph',
      text: 'Existen bienes y servicios cuya provisión puede presentar dificultades si depende exclusivamente del mercado. Por eso, el Estado puede participar directamente en áreas como: infraestructura, seguridad, justicia, educación, salud y otras prestaciones públicas. La intensidad de esa participación puede variar según el modelo económico.',
    },

    { type: 'heading', level: 2, text: '6. Fallas de mercado' },
    {
      type: 'paragraph',
      text: 'Una falla de mercado ocurre cuando el funcionamiento del mercado no genera resultados eficientes o socialmente adecuados por sí solo. Puede relacionarse con: poder de mercado, información desigual, externalidades y bienes públicos. Estas situaciones pueden motivar intervención estatal.',
    },

    { type: 'heading', level: 2, text: '7. Externalidades' },
    {
      type: 'paragraph',
      text: 'Una externalidad ocurre cuando una actividad genera efectos sobre terceros que no participan directamente en la decisión. Por ejemplo: contaminación, ruido y beneficios de ciertas inversiones colectivas. Si esos costos o beneficios no se reflejan plenamente en los precios, el Estado puede intentar corregirlos mediante regulación, impuestos u otros instrumentos.',
    },

    { type: 'heading', level: 2, text: '8. Protección de consumidores' },
    {
      type: 'paragraph',
      text: 'Los consumidores no siempre poseen la misma información o poder que los productores. Por eso pueden existir normas relacionadas con: información de precios, seguridad de productos, publicidad, contratos y derechos de garantía. La regulación puede reducir asimetrías de información.',
    },

    { type: 'heading', level: 2, text: '9. Tensiones de la intervención' },
    {
      type: 'paragraph',
      text: 'Las políticas estatales también pueden generar costos o efectos no deseados. Por ejemplo: regulación excesiva, mayor costo fiscal, incentivos incorrectos, burocracia y distorsiones. Por eso, analizar una política pública requiere evaluar tanto sus objetivos como sus consecuencias.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre Estado y mercado: identifica el problema; distingue regulación de producción estatal; determina qué instrumento utiliza el Estado; analiza quién recibe costos y beneficios; identifica posibles fallas de mercado; evita asumir que toda intervención es buena o mala; evalúa efectos previstos y no previstos.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema económico aparece principalmente descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de toda actividad empresarial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El exceso de consumidores en el mercado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una externalidad negativa asociada a la contaminación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de costos de producción.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La contaminación genera costos sobre terceros que no participan directamente en la producción ni en la compra del producto.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué instrumento utilizó el Estado en el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Regulaciones ambientales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Eliminación de todas las empresas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Prohibición general del consumo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Entrega obligatoria de productos gratuitos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las autoridades establecieron normas destinadas a reducir las emisiones generadas por las empresas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el problema puede considerarse una falla de mercado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las empresas obtenían pérdidas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los consumidores dejaron de comprar cualquier producto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el Estado era propietario de todas las fábricas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque parte de los costos de la producción recaía sobre terceros y no estaba incorporada plenamente en las decisiones de mercado.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La externalidad surge porque parte del costo social de la producción queda fuera del precio y de las decisiones privadas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué tensión genera la regulación descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Estado deja de establecer cualquier norma.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Reducir el daño ambiental puede aumentar los costos que deben asumir las empresas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La regulación elimina automáticamente toda contaminación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los residentes deben asumir todos los costos empresariales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una regulación puede buscar reducir daños sociales, pero también aumentar costos de cumplimiento para quienes realizan la actividad regulada.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión explica mejor la intervención estatal en el caso?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El Estado interviene porque toda actividad privada debe ser reemplazada por producción pública.',
          },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'La contaminación demuestra que todos los precios de mercado son incorrectos.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La regulación intenta hacer que quienes producen consideren costos que de otro modo recaerían sobre terceros, aunque la medida pueda generar nuevos costos y tensiones.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Toda intervención estatal elimina necesariamente las fallas de mercado.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La regulación busca corregir una externalidad incorporando parte del costo social a las decisiones productivas, sin que eso implique que la política sea gratuita o perfecta.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué instrumento de política pública aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una prohibición de utilizar transporte.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Un subsidio destinado a reducir el costo para determinadas familias.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de todos los impuestos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La privatización obligatoria del municipio.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El municipio entrega apoyo económico para disminuir parte del precio que deben pagar ciertas familias.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es uno de los beneficios buscados por la política?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Facilitar el acceso de determinadas familias a servicios mediante una reducción del costo de transporte.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Evitar que cualquier persona utilice transporte.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar completamente el gasto público.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impedir el acceso a centros educativos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El subsidio busca reducir una barrera económica que dificultaba el acceso a servicios importantes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué el subsidio no puede analizarse únicamente por el menor precio que pagan sus beneficiarios?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque los subsidios no utilizan recursos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque únicamente las empresas financian las políticas públicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el precio pagado siempre aumenta con un subsidio.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque también debe considerarse su financiamiento y el uso alternativo de los recursos públicos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los recursos fiscales son limitados, por lo que financiar una política implica decidir cómo distribuirlos entre distintas necesidades.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué problema busca enfrentar la definición de criterios para recibir el beneficio?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición del mercado de transporte.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad de recaudar impuestos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Determinar cómo distribuir un recurso público limitado entre quienes potencialmente podrían solicitarlo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de entregar el subsidio a todas las empresas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los criterios de acceso ayudan a definir quiénes reciben una política cuando los recursos disponibles son limitados.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál interpretación sintetiza mejor la relación entre Estado y mercado mostrada en ambos textos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Estado solo puede participar reemplazando completamente al mercado.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El Estado puede utilizar regulación, subsidios y otros instrumentos para enfrentar problemas o perseguir objetivos sociales, pero esas intervenciones también generan costos, incentivos y decisiones distributivas que deben evaluarse.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda política estatal mejora necesariamente los resultados económicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los mercados no necesitan reglas ni instituciones para funcionar.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La intervención estatal puede corregir problemas o ampliar acceso, pero requiere recursos y puede producir efectos que deben analizarse junto con sus beneficios.',
        },
      ],
    },
  ],
};

export default estadoYMercado;
