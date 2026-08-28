// CONTENT-H7A -- Historia / U2 "Formación ciudadana", Recurso 21 (order 4 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
// Cierra la U2 "Formación ciudadana" (4 recursos / 40 preguntas).
//
// Answer keys: R21 -- D A C B D B C A D B.
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
  { type: 'heading', level: 3, text: 'Texto A — Tener un derecho y poder ejercerlo no siempre era lo mismo' },
  { type: 'paragraph', text: 'Una trabajadora consideraba que su empleador había incumplido ciertas obligaciones establecidas en su contrato.' },
  {
    type: 'paragraph',
    text: 'Sabía que podía reclamar, pero no tenía claridad sobre qué institución debía consultar ni qué documentos necesitaba presentar.',
  },
  { type: 'paragraph', text: 'También le preocupaba el costo de recibir asesoría profesional.' },
  { type: 'paragraph', text: 'Durante varias semanas evitó realizar cualquier gestión porque el procedimiento le parecía demasiado complejo.' },
  { type: 'paragraph', text: 'Finalmente, acudió a un servicio de orientación jurídica.' },
  {
    type: 'paragraph',
    text: 'Allí recibió información sobre sus derechos, conoció las alternativas disponibles y obtuvo ayuda para preparar los antecedentes necesarios.',
  },
  { type: 'paragraph', text: 'La trabajadora seguía sin saber cuál sería la decisión final sobre su conflicto.' },
  { type: 'paragraph', text: 'Sin embargo, ahora podía presentar su situación mediante un procedimiento institucional y hacer valer sus argumentos.' },
  {
    type: 'paragraph',
    text: 'El caso mostraba que reconocer un derecho en una norma es importante, pero también lo es que existan condiciones reales para poder ejercerlo.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Dos partes frente a una misma decisión' },
  { type: 'paragraph', text: 'En un proceso judicial, dos personas mantenían versiones diferentes sobre un mismo conflicto.' },
  { type: 'paragraph', text: 'Cada una presentó documentos y argumentos destinados a respaldar su posición.' },
  { type: 'paragraph', text: 'Una de ellas conocía personalmente a una autoridad política importante.' },
  {
    type: 'paragraph',
    text: 'Antes de que se dictara la resolución, esa autoridad realizó declaraciones públicas defendiendo su postura y afirmó que esperaba que el tribunal decidiera a su favor.',
  },
  { type: 'paragraph', text: 'El tribunal continuó el procedimiento sin modificar sus reglas.' },
  {
    type: 'paragraph',
    text: 'Ambas partes pudieron presentar antecedentes y la decisión final fue fundamentada utilizando las normas aplicables y la información incorporada al proceso.',
  },
  {
    type: 'paragraph',
    text: 'La existencia de influencia política fuera del tribunal no debía convertirse en una orden para quienes tenían la responsabilidad de resolver.',
  },
  {
    type: 'paragraph',
    text: 'El caso mostraba que la independencia judicial y las garantías procesales no existen para asegurar la victoria de una parte, sino para establecer condiciones que permitan resolver los conflictos de acuerdo con reglas comunes.',
  },
];

const sistemaJudicialAccesoJusticiaChile: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE',
  unitCode: 'HISTORIA.FORMACION_CIUDADANA',
  subjectKey: 'historia',
  order: 4,
  title: 'Sistema judicial y acceso a la justicia en Chile',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la función del sistema judicial dentro de una sociedad democrática, reconociendo la importancia de la independencia de los tribunales, el debido proceso, la igualdad ante la ley y el acceso efectivo a mecanismos de defensa y resolución de conflictos, así como identificar barreras que pueden dificultar el ejercicio de estos derechos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Sistema judicial y acceso a la justicia en Chile' },

    { type: 'heading', level: 2, text: '1. ¿Para qué existe un sistema judicial?' },
    {
      type: 'paragraph',
      text: 'En una sociedad surgen conflictos entre: personas, organizaciones, empresas, instituciones y autoridades. El sistema judicial permite resolver jurídicamente esos conflictos y determinar cómo se aplican las normas en casos concretos. También cumple una función fundamental en la protección de derechos.',
    },

    { type: 'heading', level: 2, text: '2. Los tribunales' },
    {
      type: 'paragraph',
      text: 'Los tribunales forman parte del sistema encargado de administrar justicia. Entre sus funciones se encuentran: conocer controversias, evaluar antecedentes, aplicar normas, dictar resoluciones y garantizar procedimientos establecidos. No todos los conflictos son iguales, por lo que existen distintos tribunales y procedimientos según la materia involucrada.',
    },

    { type: 'heading', level: 2, text: '3. Independencia judicial' },
    {
      type: 'paragraph',
      text: 'Para que la justicia funcione adecuadamente, los tribunales deben poder resolver los asuntos sometidos a su conocimiento sin recibir presiones indebidas de otras autoridades o actores. La independencia judicial ayuda a impedir que una persona obtenga un resultado simplemente por su poder político, económico o social. Sin embargo, independencia no significa actuar sin reglas. Los jueces también están sujetos al orden jurídico.',
    },

    { type: 'heading', level: 2, text: '4. Igualdad ante la ley' },
    {
      type: 'paragraph',
      text: 'La igualdad ante la ley significa que las personas deben recibir protección jurídica sin discriminaciones arbitrarias. Esto implica que las normas no deberían aplicarse de manera diferente simplemente por: riqueza, posición social, origen, opiniones y otras características personales. Pero la igualdad formal no siempre garantiza que todas las personas puedan utilizar el sistema con la misma facilidad.',
    },

    { type: 'heading', level: 2, text: '5. Acceso a la justicia' },
    {
      type: 'paragraph',
      text: 'El acceso a la justicia significa que una persona debe tener posibilidades reales de utilizar mecanismos institucionales para proteger sus derechos y resolver conflictos. Esto supone, entre otros elementos: conocer sus derechos, saber dónde acudir, disponer de procedimientos accesibles, poder presentar sus argumentos y contar con defensa cuando corresponda.',
    },

    { type: 'heading', level: 2, text: '6. Debido proceso' },
    {
      type: 'paragraph',
      text: 'El debido proceso reúne garantías destinadas a evitar decisiones arbitrarias. Dependiendo del procedimiento, puede incluir elementos como: conocer las acusaciones o pretensiones, presentar antecedentes, ejercer defensa, ser oído, obtener una decisión fundada y recurrir cuando el ordenamiento lo permita. Estas garantías ayudan a proteger a las personas frente al poder estatal y frente a decisiones injustificadas.',
    },

    { type: 'heading', level: 2, text: '7. Defensa jurídica' },
    {
      type: 'paragraph',
      text: 'Comprender una situación legal puede requerir conocimientos especializados. Por eso, el acceso a orientación y defensa jurídica puede ser fundamental. Cuando una persona carece de recursos o información suficiente, pueden existir mecanismos públicos o institucionales destinados a facilitar su acceso a asistencia jurídica. La posibilidad de defender derechos no debería depender únicamente de la capacidad económica.',
    },

    { type: 'heading', level: 2, text: '8. Barreras de acceso' },
    {
      type: 'paragraph',
      text: 'Una persona puede tener derechos reconocidos formalmente y aun así enfrentar dificultades para ejercerlos. Entre las barreras pueden encontrarse: desconocimiento, costos, distancia, complejidad de los procedimientos, falta de orientación, dificultades de accesibilidad y demora excesiva. Por eso, el acceso a la justicia debe analizarse también desde una dimensión práctica.',
    },

    { type: 'heading', level: 2, text: '9. Justicia y democracia' },
    {
      type: 'paragraph',
      text: 'Una democracia necesita mecanismos que permitan exigir el cumplimiento de derechos y normas. Si las personas no pueden recurrir efectivamente a instituciones independientes cuando sus derechos son vulnerados, el Estado de derecho se debilita. Por ello, justicia, democracia y protección de derechos están estrechamente relacionadas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre justicia: identifica qué derecho o conflicto aparece; distingue igualdad formal de acceso efectivo; busca garantías de debido proceso; identifica posibles barreras; relaciona independencia judicial con imparcialidad; analiza si existe posibilidad real de defensa; vincula acceso a la justicia con Estado de derecho.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué dificultad enfrenta inicialmente la trabajadora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de cualquier derecho laboral.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de consultar instituciones públicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La imposibilidad absoluta de presentar documentos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La falta de información y las dificultades para acceder a orientación jurídica.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La trabajadora conoce de forma general que puede reclamar, pero enfrenta barreras relacionadas con información, complejidad y posibles costos.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué permitió el servicio de orientación jurídica?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Entregar información y apoyo para utilizar mecanismos institucionales de defensa.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Garantizar automáticamente que la trabajadora ganaría el conflicto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar definitivamente a todos los tribunales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar la necesidad de presentar antecedentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La orientación facilita que una persona conozca sus opciones y pueda ejercer sus derechos mediante los procedimientos existentes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué diferencia entre derecho formal y acceso efectivo refleja mejor el caso?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Si un derecho aparece escrito, todas las personas pueden ejercerlo automáticamente de la misma forma.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Solo quienes poseen recursos económicos tienen derechos jurídicos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Un derecho puede estar reconocido, pero existir barreras prácticas que dificulten su ejercicio.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de orientación jurídica elimina cualquier conflicto.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El reconocimiento formal de un derecho no garantiza por sí solo que todas las personas tengan las mismas posibilidades reales de defenderlo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué la complejidad de los procedimientos puede convertirse en una barrera de acceso a la justicia?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque obliga a eliminar todas las normas jurídicas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque puede dificultar que una persona comprenda cómo ejercer sus derechos y dónde recurrir.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque impide que existan tribunales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque garantiza que solo una parte pueda presentar antecedentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Procedimientos difíciles de comprender pueden impedir o retrasar el uso efectivo de los mecanismos de protección jurídica.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión explica mejor el concepto de acceso a la justicia a partir del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Significa que todas las personas deben obtener siempre una decisión favorable.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consiste únicamente en que existan leyes escritas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Implica eliminar cualquier procedimiento para resolver conflictos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Requiere que las personas tengan posibilidades reales de conocer, utilizar y participar en mecanismos institucionales destinados a proteger sus derechos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Acceder a la justicia no garantiza ganar un caso, sino poder utilizar efectivamente procedimientos e instituciones para presentar y defender una pretensión.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué principio debe proteger al tribunal frente a presiones externas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La concentración política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La independencia judicial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación del debido proceso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La subordinación de los jueces al gobierno.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La independencia judicial busca permitir que los tribunales resuelvan sin recibir órdenes o presiones indebidas de otros poderes.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué elemento del texto representa una garantía del debido proceso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que una autoridad política determine el resultado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que una sola parte pueda presentar documentos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que ambas partes puedan presentar antecedentes y argumentos antes de una decisión fundada.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que el tribunal resuelva sin explicar sus razones.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El debido proceso requiere oportunidades de defensa y procedimientos que permitan fundamentar las decisiones.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué una decisión fundada es importante?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permite relacionar la resolución con normas y antecedentes, reduciendo el riesgo de arbitrariedad.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque garantiza que todas las partes estarán satisfechas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque elimina la necesidad de aplicar leyes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque permite al tribunal decidir según preferencias personales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Fundamentar una resolución permite explicar las razones jurídicas y fácticas que justifican la decisión.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre igualdad ante la ley e independencia judicial aparece en el caso?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las personas con contactos políticos deberían recibir un procedimiento distinto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La igualdad requiere que todas las decisiones sean idénticas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La independencia permite que las autoridades políticas sustituyan al tribunal cuando existe un conflicto.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La justicia debe resolver según las reglas aplicables sin otorgar ventajas indebidas por la posición o influencia de una persona.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La igualdad jurídica exige que las diferencias de poder o influencia no determinen arbitrariamente el resultado de un procedimiento.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál afirmación sintetiza mejor la importancia del sistema judicial dentro de un Estado democrático de derecho?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Su función principal es garantizar que las autoridades siempre ganen los conflictos.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Debe ofrecer mecanismos independientes y sujetos a garantías mediante los cuales las personas puedan defender derechos y resolver controversias conforme a normas comunes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Su independencia significa que los tribunales pueden ignorar las leyes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El acceso a la justicia es innecesario cuando existen elecciones democráticas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El sistema judicial protege el Estado de derecho cuando ofrece procedimientos accesibles, imparciales y sometidos a normas para resolver conflictos y defender derechos.',
        },
      ],
    },
  ],
};

export default sistemaJudicialAccesoJusticiaChile;
