// CONTENT-H8A -- Historia / U3 "Sistema económico", Recurso 26 (order 5 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R26 -- D B A C D A C B D A.
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
  { type: 'heading', level: 3, text: 'Texto A — Una demanda que dejó de ser individual' },
  {
    type: 'paragraph',
    text: 'En una empresa, varios trabajadores comenzaron a manifestar preocupación por diferencias entre los turnos y por la falta de claridad en algunos criterios utilizados para asignarlos.',
  },
  { type: 'paragraph', text: 'Al principio cada persona planteó el problema por separado a su supervisor.' },
  { type: 'paragraph', text: 'Las respuestas fueron distintas y no se produjo un cambio general.' },
  { type: 'paragraph', text: 'Después de varias semanas, los trabajadores se reunieron y descubrieron que muchos tenían inquietudes similares.' },
  { type: 'paragraph', text: 'Decidieron organizar una propuesta común y solicitar que sus representantes se reunieran con la empresa.' },
  {
    type: 'paragraph',
    text: 'Durante el encuentro presentaron antecedentes, explicaron cómo las condiciones afectaban a distintos grupos y propusieron criterios más claros.',
  },
  {
    type: 'paragraph',
    text: 'La empresa no aceptó todas las solicitudes, pero acordó revisar parte del sistema y continuar las conversaciones.',
  },
  {
    type: 'paragraph',
    text: 'El proceso mostró que transformar varias inquietudes individuales en una demanda colectiva podía modificar la forma en que los trabajadores participaban en la discusión de sus condiciones laborales.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Un derecho que antes había sido una demanda' },
  {
    type: 'paragraph',
    text: 'Décadas atrás, trabajadores de distintos sectores comenzaron a exigir límites más claros a jornadas laborales muy extensas.',
  },
  {
    type: 'paragraph',
    text: 'En reuniones, organizaciones y movilizaciones, planteaban que trabajar durante demasiadas horas afectaba su salud y su vida familiar.',
  },
  {
    type: 'paragraph',
    text: 'Algunas empresas rechazaban las demandas porque consideraban que reducir la jornada podía aumentar los costos de producción.',
  },
  { type: 'paragraph', text: 'Con el tiempo, el tema comenzó a discutirse también en instituciones políticas y espacios públicos.' },
  { type: 'paragraph', text: 'Distintos actores participaron en el debate y se produjeron cambios graduales en las normas laborales.' },
  { type: 'paragraph', text: 'Años después, muchas personas consideraban normal que existieran límites legales a la jornada.' },
  { type: 'paragraph', text: 'Sin embargo, esos límites no habían aparecido de manera automática.' },
  {
    type: 'paragraph',
    text: 'Formaban parte de un proceso histórico en el que organizaciones de trabajadores, autoridades, empleadores y otros actores habían participado en conflictos, negociaciones y reformas.',
  },
];

const movimientosOrganizacionesDerechosLaborales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES',
  unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
  subjectKey: 'historia',
  order: 5,
  title: 'Movimientos y organizaciones sociales en la defensa de los derechos laborales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el papel de los movimientos y organizaciones sociales en la defensa de los derechos laborales, reconociendo formas de organización colectiva, representación, negociación y movilización, así como analizar su importancia en la construcción, protección y ampliación de derechos dentro del mundo del trabajo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Movimientos y organizaciones sociales en la defensa de los derechos laborales' },

    { type: 'heading', level: 2, text: '1. ¿Por qué se organizan los trabajadores?' },
    {
      type: 'paragraph',
      text: 'Una persona puede defender individualmente sus derechos. Sin embargo, algunos problemas afectan simultáneamente a muchos trabajadores. Por ejemplo: salarios, jornadas, seguridad, condiciones laborales, estabilidad y beneficios comunes. La organización colectiva permite coordinar intereses compartidos.',
    },

    { type: 'heading', level: 2, text: '2. Sindicatos' },
    {
      type: 'paragraph',
      text: 'Los sindicatos son organizaciones de trabajadores creadas para representar y defender intereses laborales. Pueden cumplir funciones como: representar a sus afiliados, entregar información, formular demandas, negociar, participar en procesos institucionales y defender derechos colectivos. Su existencia forma parte de la libertad de asociación.',
    },

    { type: 'heading', level: 2, text: '3. Libertad sindical' },
    {
      type: 'paragraph',
      text: 'La libertad sindical implica que los trabajadores puedan organizarse dentro del marco jurídico. Esto supone la posibilidad de: formar organizaciones, afiliarse, participar, elegir representantes y desarrollar actividades sindicales. La organización no debería depender de la autorización discrecional del empleador.',
    },

    { type: 'heading', level: 2, text: '4. Negociación colectiva' },
    {
      type: 'paragraph',
      text: 'La negociación colectiva permite discutir condiciones laborales entre trabajadores organizados y empleadores. Puede abordar materias como: remuneraciones, beneficios, jornadas, condiciones de trabajo y otras materias permitidas por la normativa. Su objetivo es alcanzar acuerdos mediante un proceso colectivo.',
    },

    { type: 'heading', level: 2, text: '5. Representación' },
    {
      type: 'paragraph',
      text: 'Una organización permite que un grupo designe representantes para expresar posiciones comunes. Esto puede facilitar el diálogo cuando existe un número elevado de trabajadores. La representación no elimina las diferencias internas, pero ayuda a organizar demandas y propuestas.',
    },

    { type: 'heading', level: 2, text: '6. Movilización social' },
    {
      type: 'paragraph',
      text: 'Los trabajadores también pueden utilizar formas de movilización para visibilizar demandas. Estas pueden incluir: reuniones, campañas, manifestaciones, acciones sindicales y otras formas legales de presión colectiva. La movilización busca influir en decisiones de empleadores, autoridades o sociedad.',
    },

    { type: 'heading', level: 2, text: '7. Acción colectiva y poder de negociación' },
    {
      type: 'paragraph',
      text: 'Un trabajador aislado puede tener menor capacidad para negociar ciertas condiciones. Cuando varios trabajadores actúan coordinadamente, pueden aumentar su capacidad de representación y negociación. Esto ayuda a explicar por qué la organización colectiva ha tenido importancia histórica en el mundo laboral.',
    },

    { type: 'heading', level: 2, text: '8. Movimientos laborales y cambio histórico' },
    {
      type: 'paragraph',
      text: 'Muchos derechos que hoy parecen normales fueron objeto de conflictos y demandas históricas. Movimientos de trabajadores participaron en discusiones sobre: jornada, descanso, seguridad, remuneraciones, protección social y organización sindical. Esto no significa que todos los cambios hayan sido producto exclusivo de los movimientos laborales, sino que estos fueron actores relevantes.',
    },

    { type: 'heading', level: 2, text: '9. Instituciones y acción colectiva' },
    {
      type: 'paragraph',
      text: 'La acción colectiva puede desarrollarse dentro de marcos institucionales. Por ejemplo, mediante: negociación, procedimientos laborales, representación sindical y mecanismos de diálogo. Movilización e institucionalidad no son necesariamente opuestas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre organizaciones laborales: identifica el problema colectivo; distingue acción individual de colectiva; identifica la organización involucrada; analiza qué mecanismo utiliza; distingue representación de movilización; observa cambios en capacidad negociadora; relaciona acción colectiva con transformación histórica.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué cambio principal ocurre entre el inicio y el final del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los trabajadores dejan de preocuparse por sus condiciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La empresa elimina todos los turnos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los trabajadores abandonan cualquier diálogo.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Varias inquietudes individuales se convierten en una demanda colectiva organizada.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los trabajadores pasan de plantear problemas de manera separada a coordinar una propuesta y representación común.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué mecanismo utilizan los trabajadores para dialogar con la empresa?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una elección presidencial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Representantes que presentan una propuesta colectiva.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación del contrato laboral.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una decisión judicial inmediata.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los trabajadores designan representantes para plantear sus demandas y propuestas ante la empresa.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué la organización colectiva puede aumentar la capacidad de negociación?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permite coordinar problemas compartidos y presentar posiciones comunes frente al empleador.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque obliga siempre a la empresa a aceptar todas las demandas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque elimina cualquier diferencia entre trabajadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque reemplaza todas las normas laborales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La coordinación permite transformar problemas dispersos en demandas comunes con mayor capacidad de representación.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué muestra el hecho de que la empresa aceptara solo parte de las solicitudes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que la negociación colectiva garantiza una victoria completa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que organizarse elimina la necesidad de dialogar.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Que la negociación puede producir acuerdos parciales sin que una de las partes obtenga todo lo que solicita.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que los representantes no tienen ninguna función.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los procesos de negociación pueden terminar en acuerdos parciales y requieren interacción entre intereses distintos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor el proceso descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las demandas laborales solo pueden resolverse individualmente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La organización colectiva elimina automáticamente todos los conflictos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La representación laboral sustituye por completo a las instituciones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La acción colectiva puede modificar la capacidad de los trabajadores para plantear y negociar problemas compartidos, aunque no asegure que todas sus demandas sean aceptadas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La organización fortalece la representación y negociación, pero sus resultados dependen del proceso y no están garantizados.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué demanda aparece principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Establecer límites más claros a jornadas laborales excesivamente extensas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar todos los empleos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumentar obligatoriamente la jornada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Prohibir cualquier organización de trabajadores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto describe demandas históricas destinadas a limitar jornadas excesivas y proteger condiciones de vida y salud.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué papel desempeñaron las organizaciones de trabajadores?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fueron los únicos actores responsables de todos los cambios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impidieron cualquier debate institucional.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Contribuyeron a visibilizar demandas y presionar para que determinadas condiciones laborales fueran discutidas.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Eliminaron la participación de otros sectores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las organizaciones laborales fueron actores relevantes al convertir problemas laborales en asuntos de debate público e institucional.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el texto menciona la oposición de algunas empresas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que todos los empleadores rechazaban cualquier derecho.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para mostrar que los cambios laborales pueden generar conflictos entre intereses y costos percibidos por distintos actores.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Para indicar que los trabajadores no tenían demandas reales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que las normas laborales nunca cambian.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las reformas laborales pueden enfrentar intereses distintos, por ejemplo entre protección de trabajadores y costos empresariales.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre movilización e instituciones refleja mejor el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La movilización social impide cualquier reforma legal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las instituciones actúan siempre sin influencia de demandas sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los movimientos laborales solo pueden actuar fuera de la legalidad.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las demandas sociales pueden trasladarse al debate institucional y contribuir, junto con otros factores, a cambios normativos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La acción colectiva puede influir en debates públicos y procesos institucionales sin ser el único factor que explica una reforma.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál interpretación histórica es más adecuada a partir del texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Algunos derechos laborales actuales son resultado de procesos históricos en los que organización social, conflicto, negociación y acción institucional interactuaron durante el tiempo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todos los derechos laborales surgieron simultáneamente y sin conflictos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las organizaciones de trabajadores explican por sí solas cualquier transformación laboral.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los cambios laborales ocurren automáticamente cuando crece la economía.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los derechos laborales se han construido mediante procesos complejos en los que participan movimientos sociales, instituciones y otros actores.',
        },
      ],
    },
  ],
};

export default movimientosOrganizacionesDerechosLaborales;
