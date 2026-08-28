// CONTENT-H4A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 10. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R10 -- C A D B C B D A C B.
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
  { type: 'heading', level: 3, text: 'Texto A — Una frontera que comenzó a abrirse' },
  { type: 'paragraph', text: 'En 1989, miles de personas se reunieron cerca de una frontera que durante décadas había dividido físicamente una ciudad europea.' },
  {
    type: 'paragraph',
    text: 'Durante años, aquella barrera había simbolizado mucho más que una separación territorial. Representaba también la división política entre dos sistemas vinculados a los grandes bloques de la Guerra Fría.',
  },
  { type: 'paragraph', text: 'Sin embargo, el escenario internacional estaba cambiando.' },
  {
    type: 'paragraph',
    text: 'En distintos países de Europa oriental aumentaban las movilizaciones y las demandas por mayores libertades políticas. Al mismo tiempo, la Unión Soviética mostraba menor disposición a intervenir para mantener por la fuerza a los gobiernos aliados.',
  },
  { type: 'paragraph', text: 'Las autoridades locales enfrentaban crecientes dificultades para controlar la situación.' },
  {
    type: 'paragraph',
    text: 'Finalmente, las restricciones para cruzar la frontera comenzaron a relajarse. Miles de personas se desplazaron hacia los puntos de paso y, en poco tiempo, sectores de la barrera fueron abiertos.',
  },
  { type: 'paragraph', text: 'Las imágenes recorrieron el mundo.' },
  { type: 'paragraph', text: 'El acontecimiento no provocó por sí solo el fin de la Guerra Fría, pero se transformó en uno de sus símbolos más poderosos.' },
  {
    type: 'paragraph',
    text: 'Mostraba que el equilibrio político que había dividido Europa durante décadas estaba experimentando una transformación profunda.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Un producto hecho en muchos países' },
  {
    type: 'paragraph',
    text: 'A comienzos del siglo XXI, una empresa diseñaba dispositivos electrónicos en un país, obtenía minerales y materiales desde distintas regiones, encargaba componentes a fábricas ubicadas en varios Estados y realizaba el ensamblaje final en otro territorio.',
  },
  { type: 'paragraph', text: 'Después, los productos eran transportados hacia mercados situados a miles de kilómetros.' },
  { type: 'paragraph', text: 'Las decisiones de una empresa podían afectar trabajadores, proveedores y consumidores distribuidos por diferentes continentes.' },
  { type: 'paragraph', text: 'Las nuevas tecnologías de comunicación permitían coordinar estas actividades casi en tiempo real.' },
  { type: 'paragraph', text: 'Al mismo tiempo, una interrupción importante en una zona podía generar efectos inesperados en otras partes del mundo.' },
  { type: 'paragraph', text: 'Si una fábrica especializada detenía su producción, empresas ubicadas muy lejos podían quedarse sin componentes.' },
  { type: 'paragraph', text: 'La integración económica ofrecía ventajas, como acceder a proveedores, tecnologías y mercados internacionales.' },
  { type: 'paragraph', text: 'Pero también generaba nuevas formas de dependencia.' },
  {
    type: 'paragraph',
    text: 'Las economías estaban más conectadas y, precisamente por eso, una crisis financiera, un problema logístico o una interrupción productiva podía transmitirse rápidamente entre países.',
  },
  {
    type: 'paragraph',
    text: 'La globalización no había eliminado las fronteras nacionales, pero había aumentado considerablemente la cantidad de procesos económicos que las atravesaban.',
  },
];

const finGuerraFriaGlobalizacion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 10,
  title: 'Fin de la Guerra Fría y globalización',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales transformaciones asociadas al fin de la Guerra Fría y al avance de la globalización desde fines del siglo XX, reconociendo cambios políticos, económicos, tecnológicos y culturales, así como la creciente interdependencia entre distintas regiones del mundo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Fin de la Guerra Fría y globalización' },

    { type: 'heading', level: 2, text: '1. El debilitamiento del bloque soviético' },
    {
      type: 'paragraph',
      text: 'Durante la década de 1980, la Unión Soviética enfrentó diversos problemas: bajo dinamismo económico, dificultades productivas, altos gastos militares, descontento social y tensiones dentro del bloque socialista. Estas dificultades contribuyeron a debilitar su capacidad para sostener el orden político establecido después de la Segunda Guerra Mundial.',
    },

    { type: 'heading', level: 2, text: '2. Reformas en la Unión Soviética' },
    {
      type: 'paragraph',
      text: 'Desde 1985, Mijaíl Gorbachov impulsó reformas conocidas como perestroika, asociada a una reestructuración económica, y glasnost, vinculada a una mayor apertura y transparencia política. Estas reformas buscaban fortalecer el sistema soviético, pero también abrieron espacios para críticas y demandas de transformación.',
    },

    { type: 'heading', level: 2, text: '3. Transformaciones en Europa oriental' },
    {
      type: 'paragraph',
      text: 'Durante 1989 se produjeron importantes cambios políticos en distintos países de Europa oriental. Gobiernos vinculados al bloque soviético comenzaron a perder el control político. Uno de los acontecimientos más simbólicos fue la caída del Muro de Berlín en noviembre de 1989.',
    },

    { type: 'heading', level: 2, text: '4. Fin de la Unión Soviética' },
    {
      type: 'paragraph',
      text: 'En 1991, la Unión Soviética dejó de existir. Diversas repúblicas que la integraban se transformaron en Estados independientes. Con ello terminó la estructura bipolar que había caracterizado gran parte de la Guerra Fría.',
    },

    { type: 'heading', level: 2, text: '5. ¿Terminó también el conflicto internacional?' },
    {
      type: 'paragraph',
      text: 'No. El fin de la Guerra Fría modificó profundamente el sistema internacional, pero no produjo un mundo sin conflictos. Continuaron guerras regionales, tensiones étnicas y territoriales, disputas económicas, conflictos políticos y nuevas amenazas transnacionales. Por eso, el fin de la bipolaridad no debe confundirse con el fin de la historia o de las disputas internacionales.',
    },

    { type: 'heading', level: 2, text: '6. ¿Qué entendemos por globalización?' },
    {
      type: 'paragraph',
      text: 'La globalización es un proceso de creciente conexión e interdependencia entre distintas regiones del mundo. Se manifiesta en áreas como comercio, finanzas, producción, comunicaciones, tecnología, cultura y migraciones. No comenzó de cero en la década de 1990, pero adquirió una nueva intensidad.',
    },

    { type: 'heading', level: 2, text: '7. Producción y comercio global' },
    {
      type: 'paragraph',
      text: 'Las empresas comenzaron a distribuir distintas etapas de producción entre varios países. Por ejemplo: diseño en un país, fabricación de componentes en otros, ensamblaje en otra región y venta en mercados internacionales. Esto permitió aumentar la integración económica mundial.',
    },

    { type: 'heading', level: 2, text: '8. Revolución tecnológica' },
    {
      type: 'paragraph',
      text: 'El desarrollo de computadores, telecomunicaciones, internet y transporte más eficiente aceleró la circulación de información, capitales, bienes y servicios. Las distancias físicas siguieron existiendo, pero muchas comunicaciones comenzaron a realizarse de manera casi inmediata.',
    },

    { type: 'heading', level: 2, text: '9. Globalización cultural' },
    {
      type: 'paragraph',
      text: 'Ideas, música, películas, marcas, modas y formas de consumo comenzaron a difundirse rápidamente entre distintos países. Sin embargo, globalización no significa necesariamente uniformidad cultural. Las sociedades pueden adoptar elementos externos, transformarlos, combinarlos con tradiciones locales o rechazarlos.',
    },

    { type: 'heading', level: 2, text: '10. Beneficios y tensiones' },
    {
      type: 'paragraph',
      text: 'La globalización puede generar acceso a mercados más amplios, difusión tecnológica, intercambio cultural y oportunidades económicas. Pero también puede relacionarse con desigualdades, dependencia económica, vulnerabilidad frente a crisis internacionales, precarización laboral en determinados contextos e impactos ambientales. La PAES puede pedir analizar ambas dimensiones, evitando interpretaciones totalmente positivas o totalmente negativas.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué acontecimiento histórico representa principalmente el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La creación de la Unión Europea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fundación de la ONU.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La apertura del Muro de Berlín en 1989.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El inicio de la Primera Guerra Mundial.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe la apertura del Muro de Berlín en 1989, uno de los acontecimientos más simbólicos del fin de la Guerra Fría.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué elemento favoreció los cambios políticos descritos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La menor disposición soviética a intervenir para sostener gobiernos aliados.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La creación inmediata de un único Estado europeo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El aumento del control soviético sobre toda Europa occidental.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de las movilizaciones ciudadanas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La reducción de la intervención soviética permitió que los procesos políticos internos de Europa oriental avanzaran con mayor autonomía.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el texto señala que la barrera tenía un significado mayor que su función territorial?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque había sido construida únicamente con objetivos comerciales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque representaba exclusivamente una frontera lingüística.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque separaba a todos los países europeos entre sí.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque simbolizaba la división política e ideológica propia de la Guerra Fría.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El Muro de Berlín se convirtió en un símbolo de la división entre los bloques político-ideológicos enfrentados durante la Guerra Fría.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre factores internos y externos aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los cambios dependieron exclusivamente de decisiones de Estados Unidos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las movilizaciones internas coincidieron con una menor intervención soviética, facilitando transformaciones políticas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las protestas ciudadanas no tuvieron ninguna relación con el proceso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Unión Soviética aumentó su control militar y eso produjo la apertura de la frontera.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El proceso combinó presiones internas por cambios políticos con una modificación del comportamiento soviético hacia los gobiernos aliados.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor la importancia histórica del acontecimiento descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La apertura de la frontera eliminó inmediatamente todos los conflictos europeos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El acontecimiento creó por sí solo la globalización económica.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Se convirtió en símbolo de una transformación más amplia del orden político europeo y del debilitamiento de la estructura bipolar.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demostró que el sistema soviético se había fortalecido.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La caída del Muro fue parte de un proceso más amplio de debilitamiento del bloque soviético y transformación del orden internacional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica de la globalización aparece principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición total del comercio internacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La distribución de procesos productivos entre distintos países.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La producción exclusiva dentro de un único territorio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El abandono de las tecnologías de comunicación.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe cadenas productivas internacionales en las que distintas etapas de producción se realizan en varios países.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué papel cumplen las tecnologías de comunicación en el proceso descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Impiden que las empresas operen internacionalmente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminan la necesidad de transporte físico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Obligan a producir todos los componentes en una sola fábrica.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Facilitan la coordinación de actividades productivas distribuidas entre distintos territorios.' },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las comunicaciones rápidas permiten coordinar proveedores, fábricas y mercados ubicados en diferentes regiones.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué una interrupción productiva localizada puede afectar a empresas de otros países?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque las cadenas productivas están interconectadas y algunas etapas dependen de proveedores externos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque cada país produce exactamente los mismos bienes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la globalización eliminó completamente las fronteras políticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las empresas dejaron de utilizar materias primas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La interdependencia hace que una interrupción en una parte de la cadena pueda afectar etapas productivas ubicadas en otros territorios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué concepto resume mejor la relación económica descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Autosuficiencia completa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aislamiento internacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Interdependencia económica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Autarquía productiva.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La interdependencia implica que distintas economías y actores dependen parcialmente unos de otros para desarrollar sus actividades.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál conclusión explica mejor una característica de la globalización económica según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La integración internacional elimina completamente cualquier riesgo económico.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una mayor integración puede ampliar oportunidades económicas, pero también transmitir problemas con rapidez entre territorios interdependientes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La globalización obliga a todos los países a producir exactamente los mismos bienes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El comercio internacional reduce necesariamente toda desigualdad entre países.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La interdependencia puede generar beneficios mediante comercio, tecnología y especialización, pero también aumenta la posibilidad de que perturbaciones externas afecten a múltiples economías.',
        },
      ],
    },
  ],
};

export default finGuerraFriaGlobalizacion;
