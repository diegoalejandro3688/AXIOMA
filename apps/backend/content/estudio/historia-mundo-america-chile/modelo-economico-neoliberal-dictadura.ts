// CONTENT-H5A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 14. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R14 -- C B A D C A D B C A.
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
  { type: 'heading', level: 3, text: 'Texto A — Una fábrica frente a una economía más abierta' },
  {
    type: 'paragraph',
    text: 'A fines de la década de 1970, una empresa chilena que producía artículos para el mercado nacional comenzó a enfrentar una situación diferente a la de años anteriores.',
  },
  { type: 'paragraph', text: 'Durante mucho tiempo había competido principalmente con otras empresas instaladas dentro del país.' },
  { type: 'paragraph', text: 'Sin embargo, la reducción de los aranceles facilitó la entrada de productos fabricados en el extranjero.' },
  {
    type: 'paragraph',
    text: 'Algunos consumidores comenzaron a encontrar una mayor variedad de bienes y, en determinados casos, precios más bajos.',
  },
  {
    type: 'paragraph',
    text: 'Para la empresa nacional, en cambio, la nueva competencia significaba que debía reducir costos, mejorar sus procesos o encontrar nuevos mercados para continuar operando.',
  },
  { type: 'paragraph', text: 'Algunas compañías lograron adaptarse.' },
  { type: 'paragraph', text: 'Otras redujeron su producción o terminaron cerrando.' },
  {
    type: 'paragraph',
    text: 'Paralelamente, sectores vinculados a productos que podían venderse en mercados extranjeros comenzaron a encontrar nuevas oportunidades.',
  },
  {
    type: 'paragraph',
    text: 'El cambio mostraba que una política económica podía producir efectos diferentes según la actividad, la capacidad de adaptación de las empresas y su relación con los mercados internacionales.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando una crisis obligó a intervenir' },
  {
    type: 'paragraph',
    text: 'A comienzos de la década de 1980, numerosas empresas y familias chilenas habían adquirido deudas en un contexto financiero que parecía favorable.',
  },
  { type: 'paragraph', text: 'Sin embargo, las condiciones internacionales cambiaron.' },
  {
    type: 'paragraph',
    text: 'El acceso al crédito se volvió más difícil, aumentaron los problemas para pagar las deudas y distintas empresas comenzaron a enfrentar graves dificultades.',
  },
  { type: 'paragraph', text: 'Durante 1982, la economía chilena entró en una profunda crisis.' },
  { type: 'paragraph', text: 'La producción cayó y aumentó considerablemente el desempleo.' },
  { type: 'paragraph', text: 'Varias instituciones financieras se encontraron en una situación crítica.' },
  {
    type: 'paragraph',
    text: 'Aunque las políticas económicas de los años anteriores habían otorgado al mercado un papel central, las autoridades decidieron intervenir para impedir que el deterioro financiero continuara expandiéndose.',
  },
  {
    type: 'paragraph',
    text: 'El Estado asumió temporalmente el control de algunas instituciones y desarrolló medidas destinadas a estabilizar el sistema.',
  },
  { type: 'paragraph', text: 'Durante los años posteriores también se realizaron ajustes a la política económica.' },
  {
    type: 'paragraph',
    text: 'La experiencia mostró que la implementación del nuevo modelo no había seguido una trayectoria lineal y que, frente a una crisis de gran magnitud, incluso un gobierno que promovía mercados más libres podía recurrir a una intervención estatal considerable.',
  },
];

const modeloEconomicoNeoliberalDictadura: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 14,
  title: 'Modelo económico neoliberal durante la Dictadura Militar',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales transformaciones económicas implementadas en Chile durante la Dictadura Militar, reconociendo la adopción de políticas de orientación neoliberal, la reducción del papel productivo del Estado, la apertura económica y las privatizaciones, así como sus efectos y tensiones sociales durante las décadas de 1970 y 1980.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Modelo económico neoliberal durante la Dictadura Militar' },

    { type: 'heading', level: 2, text: '1. Un cambio profundo de orientación económica' },
    {
      type: 'paragraph',
      text: 'Después del golpe de Estado de 1973, la política económica chilena experimentó transformaciones profundas. Durante las décadas anteriores, el Estado había adquirido un papel importante mediante: empresas públicas, regulación económica, políticas industriales, protección de la producción nacional y provisión de servicios sociales. Durante la Dictadura Militar comenzó a desarrollarse un modelo diferente, inspirado crecientemente en principios de mercado.',
    },

    { type: 'heading', level: 2, text: '2. ¿Qué significa "neoliberal"?' },
    {
      type: 'paragraph',
      text: 'El término neoliberal se utiliza para describir un conjunto de políticas que otorgan un papel central al mercado en la organización económica. Entre sus características suelen encontrarse: propiedad privada, competencia, apertura comercial, reducción de determinadas regulaciones, privatización de empresas estatales y menor intervención directa del Estado en la producción. Eso no significa la desaparición del Estado: este continuó estableciendo leyes, instituciones y reglas económicas.',
    },

    { type: 'heading', level: 2, text: '3. Los economistas y las nuevas políticas' },
    {
      type: 'paragraph',
      text: 'Un grupo de economistas chilenos, varios de ellos formados en la Universidad de Chicago, adquirió una influencia importante en la política económica. Posteriormente fueron conocidos como los Chicago Boys. Defendían medidas destinadas a: controlar la inflación, aumentar la competencia, liberalizar mercados, abrir la economía al comercio exterior y reducir el tamaño del sector estatal productivo.',
    },

    { type: 'heading', level: 2, text: '4. Apertura comercial' },
    {
      type: 'paragraph',
      text: 'Chile redujo barreras al comercio internacional. Esto facilitó la entrada de productos extranjeros y aumentó la exposición de las empresas nacionales a la competencia externa. La apertura podía: reducir precios de determinados bienes, ampliar la variedad disponible y favorecer sectores exportadores. Pero también generó dificultades para empresas nacionales que anteriormente operaban bajo mayor protección.',
    },

    { type: 'heading', level: 2, text: '5. Privatizaciones' },
    {
      type: 'paragraph',
      text: 'Varias empresas que se encontraban bajo control estatal fueron transferidas al sector privado. La lógica detrás de estas políticas sostenía que la propiedad privada y la competencia podían mejorar la eficiencia económica. Sin embargo, el proceso y sus resultados han sido objeto de debate respecto de: mecanismos de venta, concentración de propiedad, regulación y efectos sociales.',
    },

    { type: 'heading', level: 2, text: '6. Transformaciones sociales' },
    {
      type: 'paragraph',
      text: 'Las reformas no se limitaron a empresas y comercio. Durante el período también se modificaron instituciones relacionadas con: pensiones, salud, educación y relaciones laborales. En 1981 comenzó un nuevo sistema de pensiones basado principalmente en cuentas individuales administradas por entidades privadas.',
    },

    { type: 'heading', level: 2, text: '7. Relaciones laborales' },
    {
      type: 'paragraph',
      text: 'Durante la Dictadura se modificaron las normas que regulaban el trabajo y la organización sindical. El Plan Laboral de 1979 transformó aspectos como: negociación colectiva, sindicatos, huelga y relaciones entre trabajadores y empresas. Estas reformas buscaban aumentar la flexibilidad del mercado laboral, aunque también redujeron determinadas capacidades de negociación colectiva de los trabajadores.',
    },

    { type: 'heading', level: 2, text: '8. La crisis de 1982' },
    {
      type: 'paragraph',
      text: 'El nuevo modelo no produjo un crecimiento continuo. A comienzos de la década de 1980, Chile sufrió una grave crisis económica. Entre sus efectos estuvieron: caída de la producción, quiebras, alto desempleo y dificultades financieras. El Estado intervino para enfrentar la crisis, incluyendo medidas sobre instituciones financieras. Esto demuestra que incluso dentro de una economía orientada al mercado, la intervención estatal no desapareció.',
    },

    { type: 'heading', level: 2, text: '9. Recuperación y exportaciones' },
    {
      type: 'paragraph',
      text: 'Durante la segunda mitad de los años ochenta, la economía comenzó a recuperarse. Adquirieron creciente importancia sectores exportadores vinculados a: minería, agricultura, industria forestal y pesca. Chile se integró cada vez más a los mercados internacionales.',
    },

    { type: 'heading', level: 2, text: '10. ¿Cómo evaluar el período?' },
    {
      type: 'paragraph',
      text: 'Los efectos de las reformas fueron diversos. Entre los resultados asociados al modelo se encuentran: mayor apertura internacional, expansión de determinados sectores exportadores, mayor participación privada en la economía y transformación de instituciones sociales. Al mismo tiempo, el período estuvo marcado por: desempleo elevado durante la crisis, desigualdades, precariedad para determinados sectores y menor capacidad de negociación de organizaciones laborales. Para analizar históricamente el proceso es necesario distinguir objetivos, medidas y consecuencias, y reconocer que sus efectos no fueron iguales para toda la población.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué política económica aparece principalmente representada en el texto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El cierre completo del comercio exterior.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento permanente de las barreras a las importaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La apertura comercial mediante la reducción de aranceles.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de vender productos extranjeros.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reducción de aranceles facilitó la entrada de productos importados y aumentó la competencia internacional dentro del mercado chileno.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué efecto podía tener la apertura comercial sobre los consumidores?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar completamente el acceso a productos extranjeros.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Aumentar la variedad de bienes disponibles y, en algunos casos, reducir sus precios.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Obligar a comprar únicamente producción nacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar toda competencia entre empresas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una mayor entrada de productos importados podía ampliar las opciones disponibles para los consumidores y generar competencia en precios.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué algunas empresas nacionales enfrentaron dificultades después de la apertura?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque tuvieron que competir con productos extranjeros en condiciones diferentes a las del período de mayor protección.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque se prohibió toda actividad industrial chilena.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque dejaron de existir consumidores dentro del país.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las empresas fueron nacionalizadas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reducción de la protección comercial expuso a las empresas nacionales a una competencia internacional más intensa.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué efecto diferente podía producir la misma política sobre determinados sectores exportadores?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Impedirles vender fuera del país.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar la demanda internacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Obligar a cerrar todas sus instalaciones.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Crear oportunidades para integrarse con mayor fuerza a mercados internacionales.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Mientras algunos productores enfrentaron mayor competencia importada, otros sectores encontraron oportunidades en la expansión de las exportaciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué conclusión permite analizar mejor los efectos de la apertura económica descrita?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Toda empresa nacional resultó necesariamente beneficiada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La apertura produjo exactamente los mismos resultados en todos los sectores.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una misma reforma podía generar oportunidades y dificultades diferentes según la actividad económica y la capacidad de adaptación de cada actor.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La reducción de aranceles eliminó cualquier relación entre Chile y los mercados internacionales.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los efectos de una reforma económica no son uniformes: dependen de factores como competencia, productividad, orientación exportadora y capacidad de adaptación.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué fenómeno económico describe principalmente el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La crisis económica chilena de comienzos de la década de 1980.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La independencia política de Chile.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La creación de la CORFO en la década de 1930.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa del sistema financiero.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe la profunda crisis económica que afectó a Chile especialmente durante 1982.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué consecuencia social aparece asociada directamente a la crisis?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de toda deuda privada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento inmediato de los salarios reales de toda la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de las quiebras empresariales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un fuerte aumento del desempleo.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La caída de la actividad económica produjo pérdidas de empleo y elevó significativamente el desempleo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué aparente contradicción permite analizar la intervención estatal descrita?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Un gobierno que rechazaba toda actividad privada decidió privatizar empresas.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un modelo que otorgaba gran importancia al mercado recurrió a una fuerte intervención del Estado frente a una crisis financiera.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una economía completamente cerrada comenzó a prohibir importaciones.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Un sistema sin instituciones financieras decidió crear monedas extranjeras.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Aunque la orientación económica privilegiaba mecanismos de mercado, la gravedad de la crisis llevó al Estado a intervenir para estabilizar el sistema financiero.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué evidencia del texto cuestiona la idea de que la transformación económica fue un proceso lineal?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las políticas permanecieron idénticas durante todo el período.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Nunca existieron crisis ni cambios en las decisiones gubernamentales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La crisis obligó a modificar respuestas económicas y aumentar temporalmente la intervención estatal.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El Estado dejó definitivamente de actuar en la economía desde 1973.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La crisis de 1982 produjo intervenciones y ajustes que muestran que la implementación del modelo experimentó cambios y adaptaciones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        {
          type: 'paragraph',
          text: '¿Cuál conclusión explica mejor la relación entre Estado y mercado durante las transformaciones económicas de la Dictadura?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La expansión de mecanismos de mercado redujo varias formas de intervención estatal directa, pero el Estado siguió siendo fundamental para establecer reglas y pudo intervenir intensamente durante situaciones de crisis.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El Estado desapareció completamente de la economía después de 1973.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las reformas eliminaron cualquier necesidad de instituciones públicas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La crisis de 1982 provocó el abandono permanente de todas las reformas orientadas al mercado.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La transformación disminuyó ciertas funciones productivas y reguladoras del Estado, pero este siguió desempeñando un papel institucional y adquirió nuevamente una intervención importante durante la crisis.',
        },
      ],
    },
  ],
};

export default modeloEconomicoNeoliberalDictadura;
