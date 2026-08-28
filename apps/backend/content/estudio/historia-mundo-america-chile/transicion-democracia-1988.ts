// CONTENT-H6A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 17. Contenido editorial APROBADO externamente, transcrito verbatim.
// Cierra la U1 "Historia: Mundo, América y Chile" (17 recursos / 170 preguntas).
//
// Answer keys: R17 -- C A D B C B A D C B.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando una papeleta se convirtió en una decisión política' },
  { type: 'paragraph', text: 'Durante 1988, miles de personas participaron en actividades relacionadas con el plebiscito.' },
  {
    type: 'paragraph',
    text: 'Algunas colaboraban en campañas, otras asistían a reuniones políticas y muchas se preparaban para votar después de años sin elecciones presidenciales competitivas.',
  },
  {
    type: 'paragraph',
    text: 'Para los partidarios de la opción Sí, la continuidad del gobierno era presentada como una garantía de estabilidad.',
  },
  {
    type: 'paragraph',
    text: 'Quienes apoyaban el No sostenían que era necesario recuperar plenamente las instituciones democráticas y abrir paso a elecciones libres.',
  },
  { type: 'paragraph', text: 'La campaña se desarrolló en un contexto diferente al de los primeros años de la Dictadura.' },
  { type: 'paragraph', text: 'Los partidos opositores habían aumentado su coordinación y distintos sectores sociales estaban más organizados.' },
  { type: 'paragraph', text: 'También existía atención internacional sobre el proceso.' },
  { type: 'paragraph', text: 'El 5 de octubre, una mayoría votó por la opción No.' },
  { type: 'paragraph', text: 'El resultado no significó que la democracia quedara completamente restablecida ese mismo día.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, modificó decisivamente el escenario político porque activó el camino institucional hacia elecciones competitivas.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Volver a elegir no resolvía todo de inmediato' },
  { type: 'paragraph', text: 'En diciembre de 1989, ciudadanos chilenos participaron en elecciones presidenciales y parlamentarias competitivas.' },
  { type: 'paragraph', text: 'La jornada representó un cambio significativo respecto de los años anteriores.' },
  {
    type: 'paragraph',
    text: 'Los electores podían escoger entre distintas alternativas políticas y nuevamente se elegirían representantes para el Congreso.',
  },
  {
    type: 'paragraph',
    text: 'Patricio Aylwin obtuvo la mayoría presidencial y debía asumir el gobierno en marzo del año siguiente.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, dirigentes políticos de distintas posiciones sabían que el cambio de gobierno no significaría comenzar desde cero.',
  },
  { type: 'paragraph', text: 'La nueva democracia funcionaría dentro de instituciones construidas en parte durante el régimen anterior.' },
  {
    type: 'paragraph',
    text: 'Además, seguirían presentes debates sobre Derechos Humanos, relaciones entre autoridades civiles y Fuerzas Armadas, representación política y reformas constitucionales.',
  },
  {
    type: 'paragraph',
    text: 'El desafío consistía en reconstruir prácticas democráticas mientras se gestionaban continuidades institucionales y conflictos pendientes.',
  },
  { type: 'paragraph', text: 'El 11 de marzo de 1990, la transferencia del mando presidencial marcó un hito fundamental.' },
  { type: 'paragraph', text: 'Pero el proceso de democratización continuaría desarrollándose durante los años siguientes.' },
];

const transicionDemocracia1988: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 17,
  title: 'Transición a la democracia iniciada en 1988',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el proceso de transición a la democracia iniciado con el plebiscito de 1988, reconociendo la participación ciudadana, la organización de las fuerzas políticas, las reformas institucionales, las elecciones de 1989 y la transferencia del gobierno en 1990, así como las continuidades y tensiones presentes en el nuevo escenario democrático.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Transición a la democracia iniciada en 1988' },

    { type: 'heading', level: 2, text: '1. El itinerario institucional hacia 1988' },
    {
      type: 'paragraph',
      text: 'La Constitución de 1980 estableció un mecanismo para definir la continuidad del régimen. Según ese itinerario, en 1988 debía realizarse un plebiscito en el que la ciudadanía decidiría si aceptaba o rechazaba al candidato propuesto para continuar en la Presidencia. La oposición decidió participar en ese proceso y transformarlo en una oportunidad para impulsar la recuperación democrática.',
    },

    { type: 'heading', level: 2, text: '2. El plebiscito del 5 de octubre de 1988' },
    {
      type: 'paragraph',
      text: 'El plebiscito preguntó si Augusto Pinochet debía continuar en la Presidencia por un nuevo período. Las opciones eran: Sí, favorable a su continuidad; No, contrario a ella. El resultado otorgó la mayoría a la opción No. Esto abrió el camino hacia elecciones presidenciales y parlamentarias competitivas.',
    },

    { type: 'heading', level: 2, text: '3. Participación y organización ciudadana' },
    {
      type: 'paragraph',
      text: 'La oposición desarrolló una amplia campaña política. Participaron: partidos, organizaciones sociales, dirigentes, voluntarios y ciudadanos. También fue importante el fortalecimiento de mecanismos de registro y participación electoral. La campaña buscó convencer a sectores diversos de que era posible avanzar hacia un cambio político mediante una vía institucional.',
    },

    { type: 'heading', level: 2, text: '4. La campaña del Sí y del No' },
    {
      type: 'paragraph',
      text: 'Durante la campaña, ambas opciones utilizaron espacios de propaganda electoral. La franja televisiva adquirió gran importancia. La opción No desarrolló un mensaje centrado en: recuperación democrática, participación, futuro y convivencia política. La campaña reflejó la creciente importancia de los medios de comunicación dentro de la competencia política.',
    },

    { type: 'heading', level: 2, text: '5. El reconocimiento del resultado' },
    {
      type: 'paragraph',
      text: 'Un momento fundamental del proceso fue el reconocimiento del resultado del plebiscito. Esto permitió que el itinerario institucional continuara hacia elecciones competitivas. La aceptación del resultado mostró la importancia de reglas electorales que pudieran ser reconocidas por actores con posiciones políticas opuestas.',
    },

    { type: 'heading', level: 2, text: '6. Reformas constitucionales de 1989' },
    {
      type: 'paragraph',
      text: 'Después del plebiscito se desarrollaron negociaciones entre el régimen y sectores de oposición. Estas condujeron a reformas constitucionales aprobadas en un nuevo plebiscito en 1989. Las reformas modificaron distintos aspectos del orden institucional antes del retorno a un gobierno democrático.',
    },

    { type: 'heading', level: 2, text: '7. Elecciones de 1989' },
    {
      type: 'paragraph',
      text: 'En diciembre de 1989 se realizaron elecciones presidenciales y parlamentarias. Patricio Aylwin, candidato de la Concertación de Partidos por la Democracia, ganó la elección presidencial. La existencia de elecciones competitivas y la reaparición de representantes elegidos fueron hitos centrales de la recuperación institucional.',
    },

    { type: 'heading', level: 2, text: '8. El 11 de marzo de 1990' },
    {
      type: 'paragraph',
      text: 'El 11 de marzo de 1990, Patricio Aylwin asumió la Presidencia. Con ello terminó formalmente la Dictadura Militar y comenzó un nuevo período de gobiernos democráticos. Sin embargo, la transición no significó que todas las tensiones políticas e institucionales desaparecieran inmediatamente.',
    },

    { type: 'heading', level: 2, text: '9. Continuidades y límites' },
    {
      type: 'paragraph',
      text: 'El nuevo gobierno democrático comenzó a funcionar dentro de un marco institucional que conservaba elementos heredados del período anterior. Persistieron debates relacionados con: diseño constitucional, papel de las Fuerzas Armadas, Derechos Humanos, mecanismos de representación y reformas políticas. Por eso, la transición debe entenderse como un proceso, no como un cambio instantáneo ocurrido en una sola fecha.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre la transición: ordena cronológicamente 1988 → 1989 → 1990; diferencia plebiscito de elección presidencial; identifica participación ciudadana y acuerdos políticos; reconoce la continuidad de ciertas instituciones; distingue fin de la Dictadura de resolución inmediata de todos sus efectos; analiza negociación y competencia electoral; comprende la transición como proceso gradual.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué acontecimiento aparece como el centro del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El golpe de Estado de 1973.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La crisis económica de 1982.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El plebiscito de 1988.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La elección parlamentaria de 1970.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto se centra en el plebiscito del 5 de octubre de 1988 y su importancia para el proceso de recuperación democrática.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué defendían principalmente quienes apoyaban la opción No según el texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Abrir paso a elecciones competitivas y recuperar las instituciones democráticas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar definitivamente toda participación electoral.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mantener al mismo gobierno sin cambios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Disolver los partidos opositores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La opción No se relacionó con la demanda por recuperación democrática y realización de elecciones competitivas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el resultado del plebiscito fue decisivo aunque la democracia no se restableciera completamente ese mismo día?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque eliminó de inmediato todas las instituciones heredadas del régimen.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque produjo automáticamente un nuevo gobierno esa noche.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque terminó inmediatamente todos los conflictos políticos existentes.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque abrió el itinerario institucional que conduciría a elecciones presidenciales y parlamentarias.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El triunfo del No inició una nueva etapa institucional que condujo posteriormente a elecciones competitivas.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué cambio respecto de años anteriores aparece reflejado en el escenario político de 1988?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa de la oposición.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una mayor coordinación de fuerzas opositoras y participación de distintos sectores sociales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El fin de toda organización ciudadana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de cualquier campaña política.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reorganización política y social de los años ochenta permitió una participación opositora mucho más coordinada en el plebiscito.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor la importancia histórica del plebiscito de 1988?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fue solamente una consulta simbólica sin consecuencias políticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazó por sí mismo todos los pasos posteriores de la transición.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Transformó un mecanismo previsto por el propio marco institucional en una vía para disputar la continuidad del régimen y abrir el camino hacia elecciones democráticas.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Eliminó inmediatamente todas las instituciones creadas durante la Dictadura.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La oposición utilizó el plebiscito como una oportunidad institucional para impulsar un cambio político que continuó mediante elecciones y reformas posteriores.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué ocurrió en diciembre de 1989?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se suspendieron definitivamente las elecciones.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Se realizaron elecciones presidenciales y parlamentarias competitivas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Se disolvió nuevamente el Congreso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comenzó la Dictadura Militar.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En diciembre de 1989 Chile realizó elecciones presidenciales y parlamentarias competitivas dentro del proceso de transición democrática.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué muestra la elección de representantes para el Congreso?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La recuperación de una institución central de representación política democrática.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la competencia entre partidos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La concentración de todas las funciones del Estado en una sola autoridad.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de la participación ciudadana.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La elección del Congreso restableció una dimensión fundamental de la representación y deliberación política democrática.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el texto afirma que el nuevo gobierno no comenzaría “desde cero”?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque no existiría ninguna institución política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las leyes anteriores serían eliminadas automáticamente.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el gobierno electo tendría exactamente las mismas características que la Dictadura.' },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque persistían instituciones, normas y problemas heredados del régimen anterior.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La transición implicó cambios importantes, pero también continuidades institucionales y problemas pendientes que debían ser abordados posteriormente.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica de una transición política aparece mejor representada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todo el orden político cambia instantáneamente y sin continuidades.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Los conflictos desaparecen automáticamente al realizar una elección.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Pueden coexistir cambios democráticos importantes con instituciones y tensiones heredadas del período anterior.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una transición siempre impide negociar reformas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las transiciones combinan cambios y continuidades, por lo que la democratización suele desarrollarse a lo largo del tiempo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor el proceso iniciado en 1988?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El plebiscito restableció por completo la democracia sin necesidad de otros procesos políticos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El triunfo del No abrió una secuencia de participación electoral, negociación, reformas y elecciones que permitió el cambio de gobierno en 1990, aunque permanecieron continuidades y desafíos institucionales.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'La transición dependió exclusivamente de decisiones tomadas por actores internacionales.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las elecciones de 1989 eliminaron inmediatamente todos los problemas vinculados al período dictatorial.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La transición fue un proceso gradual: el plebiscito abrió el camino hacia reformas, elecciones y transferencia del poder, pero no resolvió de manera instantánea todas las continuidades y conflictos heredados.',
        },
      ],
    },
  ],
};

export default transicionDemocracia1988;
