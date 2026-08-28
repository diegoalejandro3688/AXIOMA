// CONTENT-H5A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 15. Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R15 -- D B C A D B A C D B.
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
  { type: 'heading', level: 3, text: 'Texto A — Buscar una respuesta cuando las instituciones no respondían' },
  {
    type: 'paragraph',
    text: 'Durante los primeros años de la Dictadura, una familia comenzó a recorrer distintas instituciones buscando información sobre uno de sus integrantes, que había sido detenido.',
  },
  {
    type: 'paragraph',
    text: 'Preguntaron en dependencias públicas y acudieron a tribunales, pero recibieron respuestas contradictorias o insuficientes.',
  },
  {
    type: 'paragraph',
    text: 'Un abogado presentó acciones legales intentando conocer el lugar donde se encontraba la persona y las razones de su detención.',
  },
  { type: 'paragraph', text: 'Sin embargo, las autoridades responsables negaban disponer de información.' },
  { type: 'paragraph', text: 'La familia comenzó entonces a contactar a otras personas que atravesaban situaciones similares.' },
  {
    type: 'paragraph',
    text: 'Con apoyo de abogados, organizaciones religiosas y agrupaciones dedicadas a la defensa de los Derechos Humanos, comenzaron a registrar nombres, fechas y antecedentes.',
  },
  {
    type: 'paragraph',
    text: 'Cada documento parecía pequeño frente a la incertidumbre de las familias, pero reunir información permitía demostrar que no se trataba necesariamente de situaciones aisladas.',
  },
  {
    type: 'paragraph',
    text: 'También permitía recurrir a organismos nacionales e internacionales y mantener registro de hechos que, de otro modo, podían quedar sin documentación.',
  },
  {
    type: 'paragraph',
    text: 'La experiencia mostraba una situación especialmente grave: las instituciones que debían proteger a las personas tenían dificultades para controlar o esclarecer actuaciones realizadas por organismos vinculados al propio Estado.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando el poder tenía pocos controles' },
  { type: 'paragraph', text: 'En un régimen democrático, diferentes instituciones pueden limitarse mutuamente.' },
  {
    type: 'paragraph',
    text: 'Los tribunales pueden examinar actuaciones de las autoridades, el Congreso puede fiscalizar al gobierno, la prensa puede investigar asuntos públicos y los ciudadanos pueden organizarse para expresar oposición.',
  },
  {
    type: 'paragraph',
    text: 'Durante la Dictadura chilena, varios de esos mecanismos funcionaron de manera restringida o fueron directamente eliminados.',
  },
  {
    type: 'paragraph',
    text: 'El Congreso permaneció disuelto durante el régimen y la actividad de los partidos políticos estuvo prohibida o severamente limitada durante largos períodos.',
  },
  { type: 'paragraph', text: 'Los medios de comunicación enfrentaron censura y restricciones.' },
  {
    type: 'paragraph',
    text: 'Al mismo tiempo, organismos de seguridad desarrollaron operaciones contra personas consideradas opositoras.',
  },
  { type: 'paragraph', text: 'En numerosos casos, las víctimas no contaron con garantías efectivas frente a la actuación estatal.' },
  {
    type: 'paragraph',
    text: 'La existencia formal de normas y tribunales no garantizaba por sí sola que todas las personas pudieran ejercer plenamente sus derechos.',
  },
  {
    type: 'paragraph',
    text: 'Cuando disminuyen los mecanismos capaces de fiscalizar a quienes ejercen el poder, aumenta el riesgo de que decisiones arbitrarias permanezcan sin una respuesta institucional efectiva.',
  },
  {
    type: 'paragraph',
    text: 'Por ello, la protección de los Derechos Humanos está estrechamente relacionada con la existencia de límites reales al poder del Estado.',
  },
];

const ddhhEstadoDerechoDictadura: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 15,
  title: 'Violaciones a los Derechos Humanos y supresión del Estado de derecho',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las violaciones sistemáticas a los Derechos Humanos ocurridas durante la Dictadura Militar chilena, relacionándolas con la concentración del poder, la restricción de libertades públicas y la supresión del Estado de derecho, así como reconocer las acciones desarrolladas por personas y organizaciones para denunciar estos hechos y defender a las víctimas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Violaciones a los Derechos Humanos y supresión del Estado de derecho' },

    { type: 'heading', level: 2, text: '1. ¿Qué es el Estado de derecho?' },
    {
      type: 'paragraph',
      text: 'Existe Estado de derecho cuando quienes ejercen el poder también están sometidos a normas e instituciones. Entre sus elementos fundamentales se encuentran: límites legales al poder, independencia de los tribunales, garantías procesales, protección de derechos fundamentales, posibilidad de recurrir ante abusos y responsabilidad de las autoridades. No basta con que existan leyes: estas deben limitar efectivamente el ejercicio del poder.',
    },

    { type: 'heading', level: 2, text: '2. Después del golpe de Estado' },
    {
      type: 'paragraph',
      text: 'Tras el golpe del 11 de septiembre de 1973 se produjo una profunda transformación institucional. Entre otras medidas: el Congreso fue disuelto, la actividad política fue restringida, partidos fueron suspendidos o prohibidos, se limitaron libertades públicas y las autoridades militares concentraron amplias facultades. El funcionamiento democrático anterior fue reemplazado por un régimen autoritario.',
    },

    { type: 'heading', level: 2, text: '3. Represión política' },
    {
      type: 'paragraph',
      text: 'La Dictadura desarrolló mecanismos destinados a perseguir a personas consideradas opositoras. Estos afectaron a: militantes políticos, dirigentes sociales, sindicalistas, estudiantes, profesionales, trabajadores y otras personas consideradas vinculadas a la oposición. La represión adquirió distintas formas y se desarrolló durante diferentes etapas del régimen.',
    },

    { type: 'heading', level: 2, text: '4. Organismos represivos' },
    {
      type: 'paragraph',
      text: 'Durante la Dictadura funcionaron organismos estatales dedicados a labores de inteligencia y represión. Entre ellos destacaron: DINA, creada durante los primeros años del régimen; y posteriormente, CNI. Estos organismos participaron en la persecución de opositores y estuvieron involucrados en graves violaciones a los Derechos Humanos.',
    },

    { type: 'heading', level: 2, text: '5. Violaciones a los Derechos Humanos' },
    {
      type: 'paragraph',
      text: 'Durante el período se produjeron graves violaciones como: detenciones arbitrarias, tortura, desaparición forzada, ejecuciones, persecución política y exilio. Estas acciones afectaron derechos fundamentales protegidos por principios jurídicos nacionales e internacionales.',
    },

    { type: 'heading', level: 2, text: '6. ¿Por qué hablamos de prácticas sistemáticas?' },
    {
      type: 'paragraph',
      text: 'No se trató únicamente de acciones aisladas de individuos. Existieron: instituciones estatales, centros de detención, cadenas de mando, procedimientos de inteligencia y mecanismos coordinados de persecución. Por ello, el análisis histórico debe considerar la dimensión institucional de la represión.',
    },

    { type: 'heading', level: 2, text: '7. Supresión del Estado de derecho' },
    {
      type: 'paragraph',
      text: 'Cuando las autoridades pueden detener, perseguir o sancionar personas sin garantías suficientes y existen débiles mecanismos efectivos para controlar esos actos, el Estado de derecho resulta gravemente afectado. Durante la Dictadura existieron: restricciones a libertades, estados de excepción, censura, limitaciones a la actividad política y dificultades para obtener protección judicial efectiva frente a abusos. La concentración del poder redujo los controles institucionales sobre las autoridades.',
    },

    { type: 'heading', level: 2, text: '8. Organizaciones de defensa de los Derechos Humanos' },
    {
      type: 'paragraph',
      text: 'A pesar de la represión, surgieron instituciones y organizaciones que prestaron apoyo a las víctimas. Desarrollaron labores como: asistencia jurídica, recopilación de antecedentes, apoyo a familias, denuncia pública y documentación de casos. Estas acciones fueron importantes para preservar información y defender derechos fundamentales.',
    },

    { type: 'heading', level: 2, text: '9. Dimensión internacional' },
    {
      type: 'paragraph',
      text: 'Las violaciones a los Derechos Humanos en Chile también generaron preocupación internacional. Organizaciones internacionales, gobiernos y entidades de defensa de derechos denunciaron distintos hechos ocurridos durante el régimen. Esto demuestra que la protección de los Derechos Humanos posee también una dimensión internacional, tema que ya apareció en R7.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre Derechos Humanos durante la Dictadura: identifica qué derecho está siendo vulnerado; distingue acción estatal de conflicto político general; analiza si existen garantías judiciales efectivas; relaciona concentración del poder con debilidad de controles institucionales; reconoce el papel de organizaciones de defensa; evita justificar vulneraciones por la posición política de las víctimas; diferencia oposición política de pérdida de derechos fundamentales.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué buscaba principalmente la familia descrita en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Obtener un permiso para abandonar el país.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Participar en una elección política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Formar una nueva empresa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Obtener información sobre una persona que había sido detenida.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La familia intentaba conocer el paradero y la situación de uno de sus integrantes después de su detención.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué actores aparecen prestando apoyo a las familias?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Exclusivamente empresas privadas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Abogados, organizaciones religiosas y agrupaciones de Derechos Humanos.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Únicamente partidos políticos extranjeros.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo instituciones militares.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto menciona expresamente la participación de abogados y organizaciones dedicadas al apoyo y defensa de las personas afectadas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué era importante registrar nombres, fechas y antecedentes?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque reemplazaba automáticamente las decisiones de los tribunales.' },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque permitía determinar de inmediato la responsabilidad de cualquier persona.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque ayudaba a documentar patrones, respaldar denuncias y conservar información sobre los casos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque hacía innecesario investigar posteriormente los hechos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La documentación permitía conservar evidencia, relacionar casos y respaldar acciones de denuncia y defensa de derechos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema relacionado con el Estado de derecho aparece principalmente reflejado?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La dificultad de las instituciones para entregar protección y controlar actuaciones de organismos estatales frente a posibles abusos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El exceso de participación electoral de la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de demasiados partidos políticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La autonomía completa de todas las organizaciones sociales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Estado de derecho requiere mecanismos efectivos para controlar a las autoridades y proteger a las personas frente a actuaciones arbitrarias.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión explica mejor la importancia histórica de las organizaciones mencionadas?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Sustituyeron completamente al sistema judicial durante toda la Dictadura.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Eliminaron inmediatamente las violaciones a los Derechos Humanos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Se limitaron exclusivamente a realizar actividades políticas partidistas.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Proporcionaron apoyo a las víctimas y contribuyeron a documentar hechos que podían ser negados, ocultados o difíciles de investigar institucionalmente.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Su trabajo permitió prestar asistencia y conservar antecedentes fundamentales para denunciar, investigar y comprender posteriormente las violaciones ocurridas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica del régimen aparece principalmente descrita?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La ampliación permanente de la competencia electoral.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La reducción de controles institucionales sobre quienes ejercían el poder.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El fortalecimiento del Congreso Nacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de restricciones a la prensa.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La concentración del poder y la limitación de instituciones fiscalizadoras redujeron los controles propios de un Estado democrático de derecho.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumplen los controles institucionales dentro de un Estado de derecho?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Limitar el ejercicio del poder y permitir revisar actuaciones de las autoridades.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Impedir que existan leyes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Concentrar todas las funciones estatales en una sola institución.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evitar cualquier crítica hacia las autoridades.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los controles institucionales buscan impedir actuaciones arbitrarias y garantizar que las autoridades también estén sometidas a normas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué la existencia formal de tribunales no garantiza por sí sola un Estado de derecho?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque un Estado de derecho no necesita tribunales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque únicamente el Congreso puede proteger derechos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque las instituciones deben poseer capacidad efectiva e independencia suficiente para proteger derechos y controlar al poder.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque los derechos fundamentales solo existen durante elecciones.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La existencia nominal de instituciones resulta insuficiente si estas no pueden ejercer efectivamente sus funciones de protección y control.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre concentración del poder y Derechos Humanos plantea el texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Una mayor concentración garantiza automáticamente una mayor protección de derechos.' },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'La protección de derechos no guarda relación con las instituciones políticas.' },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Eliminar mecanismos de fiscalización impide cualquier actuación estatal.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La reducción de controles sobre el poder puede aumentar el riesgo de actuaciones arbitrarias y vulneraciones de derechos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando existen menos mecanismos independientes de control, disminuyen las posibilidades de prevenir, detener o sancionar abusos de autoridad.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor la relación entre Estado de derecho y Derechos Humanos?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Los Derechos Humanos dependen únicamente de la voluntad individual de cada autoridad.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La protección efectiva de derechos requiere que el poder estatal esté sometido a límites, controles institucionales y garantías que puedan ser ejercidas realmente por las personas.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Basta con que existan normas escritas, aunque las autoridades puedan ignorarlas sin consecuencias.',
          },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Los controles institucionales solo son necesarios cuando existe una crisis económica.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El Estado de derecho protege los Derechos Humanos mediante límites efectivos al poder y mecanismos capaces de exigir el cumplimiento de las garantías fundamentales.',
        },
      ],
    },
  ],
};

export default ddhhEstadoDerechoDictadura;
