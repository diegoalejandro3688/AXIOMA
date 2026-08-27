// CONTENT-H3A.1 -- Corrección editorial de Historia R9. El source anterior
// (escrito en CONTENT-H3A) divergía casi por completo de la fuente
// editorial APPROVED original -- este archivo transcribe verbatim el
// contenido editorial autoritativo recuperado desde el transcript de la
// sesión de CONTENT-H3A. taxonomy/resourceKey/questionKey/order sin
// cambios respecto de la versión anterior.
//
// Answer keys: R9 -- D B A C B D A C B A.
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
  { type: 'heading', level: 3, text: 'Texto A — Cambiar el campo sin abandonar las instituciones' },
  { type: 'paragraph', text: 'A comienzos de la década de 1960, en un país latinoamericano aumentó la discusión sobre la distribución de la tierra.' },
  {
    type: 'paragraph',
    text: 'Una pequeña proporción de propietarios controlaba grandes extensiones, mientras numerosas familias campesinas trabajaban terrenos ajenos o cultivaban superficies insuficientes para sostenerse.',
  },
  {
    type: 'paragraph',
    text: 'Algunos grupos políticos defendían una transformación revolucionaria de la propiedad rural. Consideraban que las instituciones existentes protegían demasiado los intereses de los grandes propietarios y que un cambio profundo difícilmente podía realizarse por vías tradicionales.',
  },
  {
    type: 'paragraph',
    text: 'Otros sectores proponían una reforma agraria aprobada mediante leyes. Su objetivo era redistribuir parte de la tierra, aumentar la productividad y mejorar las condiciones de vida de los campesinos sin eliminar completamente el sistema de propiedad privada.',
  },
  { type: 'paragraph', text: 'Organizaciones campesinas comenzaron además a exigir contratos más justos, mejores salarios y acceso a la tierra.' },
  {
    type: 'paragraph',
    text: 'Gobiernos extranjeros observaban estos procesos con atención. En el contexto de la Guerra Fría, algunos apoyaban programas de reforma con la expectativa de reducir el atractivo de movimientos revolucionarios.',
  },
  {
    type: 'paragraph',
    text: 'El conflicto agrario, por lo tanto, tenía raíces locales relacionadas con la desigualdad rural, pero también se desarrollaba dentro de un escenario político internacional más amplio.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando el adversario se convirtió en “enemigo interno”' },
  {
    type: 'paragraph',
    text: 'En la década de 1970, un país latinoamericano atravesó una fuerte crisis política. Después de un golpe de Estado, las fuerzas armadas disolvieron el Congreso, restringieron la actividad de los partidos y establecieron controles sobre los medios de comunicación.',
  },
  { type: 'paragraph', text: 'Las nuevas autoridades afirmaban que el país se encontraba amenazado por grupos que pretendían destruir su organización política y social.' },
  { type: 'paragraph', text: 'Bajo esa lógica, dirigentes sindicales, estudiantes, militantes políticos y otras personas consideradas opositoras fueron sometidas a vigilancia y persecución.' },
  { type: 'paragraph', text: 'Numerosas personas fueron detenidas sin garantías judiciales suficientes. Organizaciones de derechos humanos denunciaron torturas, desapariciones y ejecuciones.' },
  { type: 'paragraph', text: 'El gobierno justificaba estas acciones como medidas necesarias para defender la seguridad nacional.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, presentar a adversarios políticos como enemigos que debían ser eliminados permitió ampliar la represión mucho más allá de quienes participaban en acciones violentas.',
  },
  {
    type: 'paragraph',
    text: 'Con el paso del tiempo, familiares de víctimas, organizaciones religiosas, abogados y agrupaciones civiles comenzaron a documentar los abusos y exigir información sobre las personas detenidas o desaparecidas.',
  },
  {
    type: 'paragraph',
    text: 'Estas acciones mostraron que incluso bajo un régimen autoritario podían surgir nuevas formas de movilización social centradas en la defensa de los derechos humanos.',
  },
];

const movilizacionAmericaLatina: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 9,
  title: 'Movilización política y social en América Latina',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales formas de movilización política y social desarrolladas en América Latina durante la segunda mitad del siglo XX, reconociendo la influencia de revoluciones, reformas, movimientos sociales y dictaduras militares, así como sus vínculos con la Guerra Fría y las violaciones a los derechos humanos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Movilización política y social en América Latina' },

    { type: 'heading', level: 2, text: '1. América Latina en transformación' },
    {
      type: 'paragraph',
      text: 'Durante la segunda mitad del siglo XX, América Latina experimentó profundas transformaciones políticas y sociales. En distintos países surgieron debates sobre desigualdad, distribución de la tierra, participación política, desarrollo económico, derechos laborales, educación y soberanía nacional. Estos problemas generaron diferentes respuestas.',
    },

    { type: 'heading', level: 2, text: '2. Revoluciones' },
    {
      type: 'paragraph',
      text: 'Algunos movimientos consideraron que las instituciones existentes no permitían realizar cambios suficientemente profundos. La Revolución Cubana de 1959 se convirtió en un referente importante para distintos sectores políticos de la región. Su impacto fue tanto nacional como internacional.',
    },

    { type: 'heading', level: 2, text: '3. Reformas' },
    {
      type: 'paragraph',
      text: 'Otros sectores buscaron transformar la sociedad mediante mecanismos institucionales. Entre las reformas debatidas o implementadas estuvieron: reforma agraria, ampliación de derechos sociales, cambios educacionales, nacionalización de recursos y mayor participación política. Revolución y reforma representaron estrategias diferentes de transformación.',
    },

    { type: 'heading', level: 2, text: '4. Movimientos sociales' },
    {
      type: 'paragraph',
      text: 'Diversos grupos comenzaron a organizarse para defender demandas específicas. Participaron, entre otros: trabajadores, campesinos, estudiantes, mujeres, poblaciones urbanas y organizaciones comunitarias. La movilización social no se limitó a partidos políticos.',
    },

    { type: 'heading', level: 2, text: '5. La Guerra Fría en América Latina' },
    {
      type: 'paragraph',
      text: 'Las tensiones regionales se desarrollaron dentro del contexto de la Guerra Fría. Estados Unidos buscó limitar la expansión de movimientos asociados al comunismo. La Unión Soviética y Cuba apoyaron, en distintos momentos y formas, a determinados movimientos o gobiernos de izquierda. Sin embargo, los conflictos latinoamericanos también tenían causas locales propias.',
    },

    { type: 'heading', level: 2, text: '6. Polarización política' },
    {
      type: 'paragraph',
      text: 'En varios países aumentó la distancia entre proyectos políticos rivales. Distintos sectores defendían modelos diferentes respecto de propiedad, economía, rol del Estado, participación política y relaciones internacionales. Cuando disminuía la capacidad de alcanzar acuerdos, la polarización podía intensificarse.',
    },

    { type: 'heading', level: 2, text: '7. Dictaduras militares' },
    {
      type: 'paragraph',
      text: 'Durante las décadas de 1960, 1970 y 1980, varios países latinoamericanos fueron gobernados por dictaduras militares. Estas experiencias tuvieron diferencias nacionales, pero muchas compartieron: suspensión o restricción de instituciones democráticas, persecución política, censura, represión y limitación de derechos.',
    },

    { type: 'heading', level: 2, text: '8. Doctrina de Seguridad Nacional' },
    {
      type: 'paragraph',
      text: 'En distintos regímenes militares adquirió influencia la idea de que ciertos adversarios políticos internos constituían amenazas para la seguridad del Estado. Esto contribuyó a justificar vigilancia, persecución, detenciones y represión de organizaciones políticas y sociales.',
    },

    { type: 'heading', level: 2, text: '9. Violaciones a los derechos humanos' },
    {
      type: 'paragraph',
      text: 'En numerosas dictaduras latinoamericanas se produjeron graves violaciones a los derechos humanos. Entre ellas: detenciones arbitrarias, tortura, desapariciones, ejecuciones, exilio y persecución política. Estas prácticas no deben presentarse simplemente como “excesos” individuales, sino analizarse dentro de los mecanismos represivos desarrollados por determinados regímenes.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre América Latina en este período: identifica las demandas del actor social; distingue revolución de reforma; observa el contexto de Guerra Fría; considera causas locales; identifica características democráticas o autoritarias; analiza las consecuencias de la polarización; reconoce violaciones a los derechos humanos sin relativizarlas por la posición política de las víctimas.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema social aparece principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La ausencia completa de producción agrícola.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de los trabajadores campesinos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de toda propiedad rural.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La concentración de la tierra y las desigualdades que afectaban a sectores campesinos.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe una distribución desigual de la propiedad rural y las dificultades que enfrentaban numerosas familias campesinas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué estrategia defendían quienes proponían una reforma agraria mediante leyes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar cualquier participación del Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Modificar la distribución de la tierra utilizando mecanismos institucionales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Abandonar todas las actividades agrícolas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Restaurar estructuras coloniales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La reforma agraria aparece como una vía institucional para modificar la estructura de propiedad rural.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué diferencia principal existía entre las dos estrategias de transformación mencionadas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una buscaba cambios revolucionarios y la otra reformas mediante instituciones existentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ambas rechazaban cualquier modificación de la propiedad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambas proponían exactamente el mismo mecanismo político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una defendía el abandono de la agricultura y la otra la industrialización completa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto contrapone una estrategia revolucionaria con una vía reformista basada en legislación e instituciones.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre factores internos y externos aparece en el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desigualdad rural fue creada exclusivamente por potencias extranjeras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La Guerra Fría no tuvo ninguna influencia sobre América Latina.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Un problema social de origen local fue también interpretado y abordado dentro de la competencia internacional de la Guerra Fría.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los gobiernos extranjeros controlaban directamente toda la agricultura latinoamericana.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La desigualdad agraria tenía causas locales, pero las respuestas políticas también estaban influidas por preocupaciones propias de la Guerra Fría.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor las movilizaciones sociales descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los campesinos actuaban exclusivamente por instrucciones de gobiernos extranjeros.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las demandas sociales podían surgir de desigualdades locales y, al mismo tiempo, adquirir importancia dentro de disputas políticas nacionales e internacionales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las reformas institucionales y las revoluciones eran procesos idénticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La movilización campesina desapareció completamente cuando comenzaron las reformas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las demandas tenían raíces sociales propias, aunque su desarrollo e interpretación estuvieron también influidos por el contexto político nacional e internacional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica permite identificar al gobierno descrito como una dictadura?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La ampliación del pluralismo político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de elecciones competitivas periódicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El fortalecimiento del Congreso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La disolución de instituciones representativas y la restricción de la actividad política.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La supresión o restricción de instituciones democráticas constituye una característica central de los regímenes dictatoriales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué efecto tuvo la idea del “enemigo interno” según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Contribuyó a justificar la persecución de opositores políticos y sociales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Favoreció una mayor protección del pluralismo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminó toda intervención de las fuerzas armadas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Garantizó procesos judiciales independientes.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Definir a opositores como amenazas internas permitió justificar vigilancia, persecución y represión.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué las acciones descritas constituyen violaciones a los derechos humanos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque toda intervención estatal constituye automáticamente una violación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque únicamente afectaron a personas extranjeras.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque incluyeron detenciones arbitrarias, torturas, desapariciones y ejecuciones fuera de garantías fundamentales.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque las organizaciones civiles no tenían permitido criticar al gobierno.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las prácticas mencionadas vulneran derechos fundamentales como la integridad, libertad, vida y garantías judiciales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué forma de movilización surgió como respuesta a la represión?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Organizaciones que buscaban ampliar el poder militar.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Agrupaciones de familiares y organizaciones civiles que documentaban abusos y defendían derechos humanos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Movimientos dedicados exclusivamente a eliminar las instituciones judiciales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Organizaciones que exigían profundizar la censura.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Familiares, abogados, grupos religiosos y organizaciones civiles desarrollaron acciones destinadas a denunciar abusos y exigir verdad y protección de derechos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué conclusión histórica permite relacionar mejor dictaduras, movilización social y derechos humanos en América Latina?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La represión estatal restringió la participación política, pero también generó nuevas formas de organización social orientadas a denunciar violaciones y defender derechos fundamentales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las dictaduras eliminaron de forma permanente cualquier posibilidad de acción colectiva.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las violaciones a los derechos humanos fueron fenómenos completamente independientes de los mecanismos políticos de los regímenes autoritarios.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'La defensa de los derechos humanos solo surgió después de que todas las dictaduras habían terminado.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La represión limitó severamente la participación, pero distintas organizaciones sociales lograron desarrollar acciones de denuncia y defensa de los derechos humanos incluso durante regímenes autoritarios.',
        },
      ],
    },
  ],
};

export default movilizacionAmericaLatina;
