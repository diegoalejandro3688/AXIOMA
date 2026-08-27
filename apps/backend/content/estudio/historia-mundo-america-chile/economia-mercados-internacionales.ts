// CONTENT-H2A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 4. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts (CONTENT-H1A).
//
// Answer keys: R4 usa la versión DEFINITIVA post-corrección editorial
// (redistribución de posición de alternativas correctas) -- B C A D B C A
// D B C, verificada exactamente contra la fuente de este incremento.
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
  { type: 'heading', level: 3, text: 'Texto A — El trigo y una oportunidad inesperada' },
  {
    type: 'paragraph',
    text: 'Durante la mitad del siglo XIX, productores agrícolas chilenos encontraron nuevas oportunidades de exportación cuando aumentó la demanda de alimentos en territorios del Pacífico.',
  },
  {
    type: 'paragraph',
    text: 'El crecimiento de poblaciones vinculadas a actividades mineras en California y Australia elevó temporalmente la necesidad de abastecimiento. La distancia existente entre esos centros y sus fuentes tradicionales de alimentos abrió oportunidades para productores de otros lugares.',
  },
  {
    type: 'paragraph',
    text: 'En Chile, algunos agricultores aumentaron la producción de trigo y otros productos destinados al comercio exterior. La actividad estimuló también el transporte, la utilización de puertos y diversos servicios asociados al comercio.',
  },
  { type: 'paragraph', text: 'Sin embargo, ese auge no podía durar indefinidamente.' },
  { type: 'paragraph', text: 'Con el paso del tiempo, los mercados de California y Australia desarrollaron nuevas fuentes de abastecimiento y su dependencia de productos chilenos disminuyó.' },
  {
    type: 'paragraph',
    text: 'La experiencia mostró que una expansión exportadora podía generar importantes beneficios mientras existiera demanda externa, pero también que esos beneficios podían reducirse rápidamente cuando cambiaban las condiciones internacionales.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Un ferrocarril hacia el puerto' },
  { type: 'paragraph', text: 'En la década de 1860, un empresario justificaba la construcción de una nueva conexión ferroviaria entre una zona productiva y un puerto:' },
  {
    type: 'paragraph',
    text: 'Nuestros minerales poseen valor mientras puedan llegar con rapidez a quienes desean comprarlos. De poco sirve aumentar la extracción si los carros tardan días en recorrer caminos que durante el invierno se vuelven casi intransitables.',
  },
  { type: 'paragraph', text: 'Una línea ferroviaria permitiría trasladar una cantidad mucho mayor de carga, reducir tiempos y conectar las faenas con el puerto.' },
  { type: 'paragraph', text: 'El beneficio tampoco quedaría limitado a las minas. Comerciantes, agricultores y pasajeros utilizarían la misma vía, y nuevos poblados podrían crecer a su alrededor.' },
  {
    type: 'paragraph',
    text: 'Construir el ferrocarril exige una gran inversión, pero mantener aisladas las zonas productivas también tiene un costo. Si queremos competir en los mercados extranjeros, necesitamos transportar con mayor eficiencia aquello que producimos.',
  },
];

const economiaMercadosInternacionales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 4,
  title: 'Economía chilena e inserción en los mercados internacionales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo la economía chilena del siglo XIX se vinculó con los mercados internacionales, reconociendo el papel de las exportaciones de materias primas, la demanda externa, la expansión de actividades productivas, la infraestructura y las consecuencias de una economía dependiente de los ciclos del comercio mundial.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Economía chilena e inserción en los mercados internacionales' },

    { type: 'heading', level: 2, text: '1. Chile y la economía mundial' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XIX, Chile se integró cada vez más a los mercados internacionales mediante la exportación de productos demandados en otras regiones. Entre las actividades relevantes se encontraron: minería; agricultura; producción de materias primas; comercio portuario. La economía nacional comenzó a depender en mayor medida de lo que ocurría fuera del país.',
    },

    { type: 'heading', level: 2, text: '2. Exportar materias primas' },
    {
      type: 'paragraph',
      text: 'Una economía exportadora vende al exterior productos cuya demanda depende de mercados internacionales. Esto puede generar: crecimiento; empleo; ingresos fiscales; expansión comercial. Pero también crea riesgos si gran parte de la economía depende de pocos productos.',
    },

    { type: 'heading', level: 2, text: '3. La demanda externa' },
    {
      type: 'paragraph',
      text: 'El crecimiento de una actividad productiva no depende únicamente de que exista un recurso. También debe existir: demanda; capacidad de extracción o producción; transporte; financiamiento; acceso a mercados. Por eso, los cambios económicos del siglo XIX deben analizarse como resultado de varios factores combinados.',
    },

    { type: 'heading', level: 2, text: '4. Minería' },
    {
      type: 'paragraph',
      text: 'La minería tuvo un papel importante en la economía chilena del siglo XIX. Productos minerales podían adquirir gran valor cuando aumentaba su demanda internacional. La expansión minera también generaba actividad en: transporte; comercio; inversión; servicios; puertos.',
    },

    { type: 'heading', level: 2, text: '5. Agricultura y exportación' },
    {
      type: 'paragraph',
      text: 'En determinados períodos también aumentó la demanda externa por productos agrícolas. Cuando mercados extranjeros necesitaban alimentos, productores chilenos podían ampliar sus exportaciones. Sin embargo, una demanda excepcional podía disminuir posteriormente, mostrando la importancia de los ciclos externos.',
    },

    { type: 'heading', level: 2, text: '6. Infraestructura' },
    {
      type: 'paragraph',
      text: 'El crecimiento exportador impulsó inversiones en: caminos; ferrocarriles; puertos; comunicaciones. La infraestructura facilitaba transportar productos desde las zonas productivas hasta los mercados. Al mismo tiempo, conectaba distintas regiones del país.',
    },

    { type: 'heading', level: 2, text: '7. Valparaíso y el comercio' },
    {
      type: 'paragraph',
      text: 'Puertos como Valparaíso se transformaron en centros importantes de intercambio. Por ellos circulaban: mercancías; capitales; comerciantes; información; productos importados y exportados. La expansión del comercio fortaleció la conexión de Chile con otras economías.',
    },

    { type: 'heading', level: 2, text: '8. Beneficios y desigualdades' },
    {
      type: 'paragraph',
      text: 'El crecimiento exportador no beneficiaba necesariamente de la misma manera a toda la sociedad. Podía generar riqueza y expansión económica, pero también coexistir con: concentración de propiedad; desigualdades; condiciones laborales precarias; diferencias regionales. Crecimiento económico no equivale automáticamente a bienestar generalizado.',
    },

    { type: 'heading', level: 2, text: '9. Dependencia y vulnerabilidad' },
    {
      type: 'paragraph',
      text: 'Una economía muy dependiente de exportaciones puede verse afectada cuando: disminuye la demanda internacional; cae el precio de un producto; aparece un competidor; ocurre una crisis externa. Así, la integración al mercado internacional produce oportunidades y también vulnerabilidades.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente económica del siglo XIX: identifica qué se produce; determina quién demanda ese producto; observa la relación con el comercio exterior; busca efectos sobre infraestructura y empleo; distingue crecimiento de distribución; analiza causas internas y externas; identifica posibles dependencias del mercado internacional.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué factor favoreció el aumento de las exportaciones agrícolas chilenas descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición del comercio marítimo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento de la demanda de alimentos en mercados externos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de producir trigo en Chile.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La reducción de la población en California y Australia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El aumento de la demanda de alimentos en mercados del Pacífico abrió oportunidades para productores agrícolas chilenos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué actividad se vio favorecida junto con la producción agrícola?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de los puertos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de los servicios comerciales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El transporte y el comercio portuario.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El cierre de las rutas marítimas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La expansión exportadora impulsó actividades relacionadas con el traslado de productos y el uso de puertos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué disminuyó posteriormente la importancia de esos mercados para los productos chilenos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque desarrollaron nuevas fuentes de abastecimiento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque Chile dejó de producir alimentos de manera definitiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque desapareció toda demanda internacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los productos agrícolas dejaron de poder transportarse por mar.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al surgir nuevos proveedores, California y Australia dejaron de depender en la misma medida de las exportaciones chilenas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué característica de una economía exportadora muestra principalmente este caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Su independencia completa de los mercados externos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad de generar crecimiento económico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de actividades de transporte.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Su relación con cambios en la demanda internacional.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El auge y posterior disminución de las exportaciones estuvieron vinculados a transformaciones en mercados extranjeros.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la mejor conclusión histórica que puede obtenerse de este proceso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Toda actividad exportadora garantizaba crecimiento permanente.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La integración a mercados internacionales podía impulsar actividades productivas, pero también generar vulnerabilidad frente a cambios externos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La economía chilena del siglo XIX funcionaba completamente aislada del comercio mundial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La demanda internacional no tenía ningún efecto sobre la producción nacional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El caso muestra tanto las oportunidades generadas por una demanda externa favorable como la vulnerabilidad cuando esas condiciones cambian.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es la principal razón que entrega el emisor para construir el ferrocarril?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Impedir cualquier intercambio comercial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reducir la producción minera.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Facilitar el transporte de productos hacia el puerto.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar todos los puertos por estaciones ferroviarias.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor sostiene que una mejor conexión permitiría llevar más rápidamente la producción hasta los mercados de exportación.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre infraestructura y economía exportadora presenta la fuente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una infraestructura eficiente puede facilitar el acceso de la producción a los mercados internacionales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La infraestructura vuelve innecesario producir bienes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El comercio exterior funciona mejor cuando las regiones productivas permanecen aisladas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los ferrocarriles impiden el crecimiento de los puertos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El ferrocarril aparece como un medio para reducir tiempos y costos de transporte y mejorar la conexión con mercados externos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el emisor afirma que el ferrocarril podría beneficiar también a agricultores y comerciantes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque solo las minas podían utilizar la línea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el ferrocarril eliminaría el comercio agrícola.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los agricultores dejarían de producir para vender.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la infraestructura podía ser utilizada por distintas actividades económicas y poblaciones.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La nueva conexión podía transportar distintas cargas y pasajeros, generando efectos económicos más amplios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué factor económico internacional aparece implícito en la última frase del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de todo intercambio entre países.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La competencia por colocar productos en mercados extranjeros.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La decisión de Chile de evitar las exportaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de demanda por minerales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor relaciona la eficiencia del transporte con la capacidad de competir en mercados internacionales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones explica mejor la relación entre expansión exportadora e infraestructura en Chile durante el siglo XIX?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La infraestructura se desarrolló completamente al margen de la actividad productiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los ferrocarriles hicieron innecesarios los mercados internacionales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La necesidad de transportar productos hacia los mercados estimuló obras que, a su vez, ampliaron la integración económica entre regiones y puertos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La expansión exportadora redujo la necesidad de conectar las zonas productivas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La actividad exportadora generó incentivos para mejorar el transporte, mientras la nueva infraestructura facilitó a su vez el comercio y la integración territorial.',
        },
      ],
    },
  ],
};

export default economiaMercadosInternacionales;
