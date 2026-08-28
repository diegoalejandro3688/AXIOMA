// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 22 (order 1 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R22 -- B C A D B A C D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando la sequía cambió el precio de un producto' },
  { type: 'paragraph', text: 'Durante una temporada, una zona agrícola enfrentó una sequía más intensa de lo habitual.' },
  {
    type: 'paragraph',
    text: 'Los productores lograron cosechar una cantidad menor de cierto alimento, aunque el interés de los consumidores se mantuvo relativamente estable.',
  },
  { type: 'paragraph', text: 'En las semanas siguientes comenzó a observarse una menor disponibilidad del producto en ferias y supermercados.' },
  { type: 'paragraph', text: 'Algunos vendedores debían competir por adquirir las cantidades disponibles a los productores.' },
  { type: 'paragraph', text: 'El precio final comenzó a aumentar.' },
  { type: 'paragraph', text: 'Algunos consumidores decidieron comprar menos del producto o reemplazarlo por otros alimentos similares.' },
  { type: 'paragraph', text: 'Otros continuaron comprándolo a pesar del mayor precio.' },
  { type: 'paragraph', text: 'La situación no se originó porque los consumidores hubieran aumentado inicialmente su interés por el producto.' },
  { type: 'paragraph', text: 'El principal cambio había ocurrido en las condiciones de producción.' },
  {
    type: 'paragraph',
    text: 'El caso mostraba cómo una alteración en la oferta podía modificar tanto el precio como las decisiones posteriores de los consumidores.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Un nuevo competidor cambió las decisiones de todos' },
  { type: 'paragraph', text: 'En una ciudad, durante años dos empresas ofrecían un servicio similar.' },
  { type: 'paragraph', text: 'Sus precios eran relativamente altos y los consumidores tenían pocas alternativas.' },
  {
    type: 'paragraph',
    text: 'Tiempo después ingresó una tercera empresa que utilizaba una tecnología más eficiente y podía ofrecer el servicio a un precio menor.',
  },
  { type: 'paragraph', text: 'Algunos clientes comenzaron a cambiarse al nuevo proveedor.' },
  {
    type: 'paragraph',
    text: 'Las empresas que ya operaban en el mercado reaccionaron ofreciendo nuevas promociones y mejorando ciertos aspectos de su servicio.',
  },
  { type: 'paragraph', text: 'Una de ellas redujo sus precios.' },
  { type: 'paragraph', text: 'La otra prefirió mantenerlos, pero incorporó beneficios adicionales.' },
  { type: 'paragraph', text: 'La llegada del nuevo competidor no obligó a todas las empresas a actuar exactamente de la misma manera.' },
  { type: 'paragraph', text: 'Sin embargo, modificó las condiciones en las que debían competir por los consumidores.' },
  {
    type: 'paragraph',
    text: 'El caso mostraba cómo la entrada de nuevos oferentes podía cambiar precios, calidad y estrategias comerciales dentro de un mercado.',
  },
];

const funcionamientoMercadoFactores: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 1,
  title: 'Funcionamiento del mercado y factores que pueden alterarlo',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el funcionamiento básico del mercado a partir de la interacción entre oferta y demanda, reconociendo cómo se forman precios y cantidades y analizando factores que pueden modificar esas relaciones, como cambios en costos, ingreso, preferencias, expectativas, competencia o disponibilidad de bienes.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Funcionamiento del mercado y factores que pueden alterarlo' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un mercado?' },
    {
      type: 'paragraph',
      text: 'Un mercado es un espacio de intercambio en el que compradores y vendedores interactúan. No tiene que ser necesariamente un lugar físico. Puede funcionar mediante: tiendas, ferias, plataformas digitales, contratos y distintos sistemas de intercambio. En él se relacionan decisiones de consumo y producción.',
    },

    { type: 'heading', level: 2, text: '2. Demanda' },
    {
      type: 'paragraph',
      text: 'La demanda representa las cantidades de un bien o servicio que los consumidores están dispuestos y pueden adquirir bajo determinadas condiciones. La demanda puede cambiar por factores como: ingreso, preferencias, expectativas, precio de bienes relacionados y cantidad de consumidores. No depende únicamente del precio del propio bien.',
    },

    { type: 'heading', level: 2, text: '3. Oferta' },
    {
      type: 'paragraph',
      text: 'La oferta representa las cantidades que los productores están dispuestos y pueden vender. Puede cambiar por factores como: costos de producción, tecnología, disponibilidad de insumos, expectativas y número de productores. Por eso, un aumento de costos puede reducir la cantidad que resulta conveniente ofrecer.',
    },

    { type: 'heading', level: 2, text: '4. Precio e interacción' },
    {
      type: 'paragraph',
      text: 'Los precios entregan información a compradores y vendedores. Si muchas personas desean adquirir un producto y la cantidad disponible es limitada, puede existir presión para que el precio aumente. Si existe abundante oferta y poca demanda, puede producirse presión en sentido contrario. Los precios no se forman por una sola decisión aislada, sino mediante múltiples interacciones.',
    },

    { type: 'heading', level: 2, text: '5. Cantidad de equilibrio' },
    {
      type: 'paragraph',
      text: 'En modelos económicos básicos se habla de un punto de equilibrio cuando la cantidad que los consumidores desean comprar coincide con la cantidad que los productores desean vender. Este concepto permite analizar cómo pueden cambiar precios y cantidades ante distintas situaciones. Sin embargo, los mercados reales pueden experimentar ajustes, incertidumbre y restricciones.',
    },

    { type: 'heading', level: 2, text: '6. Cambios en la demanda' },
    {
      type: 'paragraph',
      text: 'Imagina que aumenta fuertemente el interés por un producto. Si las demás condiciones permanecen constantes, esto puede generar una mayor demanda. También puede ocurrir lo contrario si: cambian las preferencias, disminuye el ingreso, aparece un sustituto atractivo o cambian las expectativas. Es importante distinguir movimiento dentro de una relación de demanda de un cambio de la demanda provocado por otros factores.',
    },

    { type: 'heading', level: 2, text: '7. Cambios en la oferta' },
    {
      type: 'paragraph',
      text: 'La oferta también puede modificarse. Por ejemplo: una tecnología más eficiente puede reducir costos; una sequía puede reducir la producción agrícola; un aumento del precio de un insumo puede encarecer la producción; la entrada de nuevos productores puede aumentar la disponibilidad. Estos cambios pueden modificar tanto precios como cantidades.',
    },

    { type: 'heading', level: 2, text: '8. Competencia' },
    {
      type: 'paragraph',
      text: 'La competencia ocurre cuando distintos productores buscan atraer consumidores. Puede incentivar: menores precios, mejoras de calidad, innovación y mayor variedad. Pero no todos los mercados presentan el mismo nivel de competencia. Cuando existen pocos oferentes o grandes barreras de entrada, el comportamiento del mercado puede cambiar.',
    },

    { type: 'heading', level: 2, text: '9. Factores que alteran el funcionamiento' },
    {
      type: 'paragraph',
      text: 'El funcionamiento de los mercados puede verse afectado por: poder de mercado, información incompleta, externalidades, regulaciones, impuestos, subsidios, crisis y desastres naturales. Por eso, analizar un mercado exige observar más que el precio final.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre mercados: identifica qué cambió; determina si afecta oferta o demanda; separa precio del propio bien de otros factores; analiza efectos sobre precio y cantidad; identifica restricciones o competencia; evita afirmar que todos los mercados funcionan igual; distingue causa de consecuencia.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál fue el factor inicial que alteró el mercado descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Un aumento repentino de los ingresos de todos los consumidores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una sequía que redujo la producción disponible.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de productos sustitutos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una campaña que aumentó la preferencia por el alimento.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La sequía redujo la cantidad producida, por lo que el cambio inicial afectó principalmente la oferta.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué ocurrió con la disponibilidad del producto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumentó considerablemente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se mantuvo siempre idéntica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Disminuyó como consecuencia de una menor producción.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Desapareció porque los consumidores dejaron de comprarlo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La menor cosecha redujo la cantidad disponible para vendedores y consumidores.' },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el aumento del precio puede relacionarse con un cambio de oferta y no con un aumento inicial de demanda?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la cantidad disponible disminuyó mientras el interés de los consumidores se mantuvo relativamente estable.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque los consumidores dejaron completamente de comprar alimentos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la demanda nunca influye en los precios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todo aumento de precio es causado exclusivamente por regulaciones.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto indica que el shock inicial fue productivo: disminuyó la oferta antes de que cambiaran las decisiones de consumo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué reacción de algunos consumidores aparece después del aumento de precio?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Comprar necesariamente una cantidad mayor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Producir ellos mismos el alimento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ignorar completamente el cambio de precio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reducir sus compras o buscar productos sustitutos.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Ante un precio más alto, algunos consumidores ajustaron su consumo y buscaron alternativas similares.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál secuencia causal explica mejor el caso?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Aumento de demanda → sequía → caída de producción → disminución del precio.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Sequía → menor oferta → presión al alza sobre el precio → ajustes en las decisiones de consumo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Menor demanda → mayor producción → aumento del precio → escasez.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mayor oferta → menor disponibilidad → aumento de costos para consumidores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El shock climático redujo primero la oferta; esto generó presión sobre el precio y posteriormente modificó algunas decisiones de compra.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué cambio ocurrió en el mercado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ingresó un nuevo oferente con capacidad para competir.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todos los consumidores dejaron de utilizar el servicio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se prohibió la existencia de empresas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desapareció cualquier diferencia entre proveedores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La entrada de una tercera empresa aumentó el número de oferentes y modificó las condiciones competitivas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué efecto tuvo la mayor competencia sobre las empresas existentes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las obligó a abandonar necesariamente el mercado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó automáticamente todos sus costos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las llevó a ajustar precios, promociones o calidad para atraer consumidores.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Les permitió dejar de considerar las preferencias de sus clientes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La competencia generó incentivos para modificar estrategias y hacer más atractiva la oferta de cada empresa.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué la nueva empresa podía ofrecer un precio menor según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque no necesitaba consumidores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque estaba prohibido cobrar precios más altos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las demás empresas cerraron.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque utilizaba una tecnología más eficiente.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una tecnología más eficiente puede reducir costos y modificar las condiciones en que una empresa puede ofrecer un producto o servicio.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué conclusión permite obtener el hecho de que las empresas reaccionaran de manera diferente?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La competencia obliga a todas las empresas a tomar exactamente la misma decisión.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los actores pueden responder de distintas maneras ante un mismo cambio en las condiciones del mercado.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La entrada de competidores no altera ninguna estrategia empresarial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La calidad no puede formar parte de la competencia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las empresas pueden competir mediante distintas combinaciones de precio, calidad, promociones u otras estrategias.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál interpretación sintetiza mejor el funcionamiento de mercado mostrado en ambos textos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los precios dependen únicamente de decisiones gubernamentales.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Oferta y demanda permanecen fijas aunque cambien las condiciones económicas.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambios en producción, costos, tecnología o número de oferentes pueden modificar precios, cantidades y decisiones de consumidores y productores.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Toda modificación de un mercado beneficia de la misma forma a todos sus participantes.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los mercados responden a cambios en las condiciones de oferta, demanda y competencia, y esos ajustes pueden generar efectos distintos entre los participantes.',
        },
      ],
    },
  ],
};

export default funcionamientoMercadoFactores;
