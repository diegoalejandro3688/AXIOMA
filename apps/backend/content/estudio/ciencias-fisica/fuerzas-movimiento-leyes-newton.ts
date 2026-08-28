// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 4 (order 4 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R16 -- B A D C B C A D B C.
// Tabla editorial de la Situación A ("Fuerza neta / Aceleración") representada
// como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan EXACTAMENTE los
// símbolos Unicode: Fₙₑₜₐ, m/s², ≠, y la relación Fₙₑₜₐ = ma.
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const situacionA: Blk[] = [
  { type: 'heading', level: 3, text: 'Un carro sometido a distintas fuerzas' },
  {
    type: 'paragraph',
    text: 'Un grupo de estudiantes utilizó un carro de masa constante sobre una superficie de roce despreciable.',
  },
  { type: 'paragraph', text: 'Aplicaron distintas fuerzas horizontales y midieron la aceleración resultante.' },
  { type: 'paragraph', text: '| Fuerza neta | Aceleración |' },
  { type: 'paragraph', text: '| 2 N | 1 m/s² |' },
  { type: 'paragraph', text: '| 4 N | 2 m/s² |' },
  { type: 'paragraph', text: '| 6 N | 3 m/s² |' },
  { type: 'paragraph', text: '| 8 N | 4 m/s² |' },
  { type: 'paragraph', text: 'Los estudiantes mantuvieron la masa del carro constante en todos los ensayos.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Dos estudiantes sobre patines' },
  {
    type: 'paragraph',
    text: 'Dos estudiantes, A y B, se encontraban inicialmente en reposo sobre patines en una superficie horizontal de roce muy pequeño.',
  },
  { type: 'paragraph', text: 'A extendió sus brazos y empujó a B.' },
  { type: 'paragraph', text: 'Después del empujón, ambos comenzaron a moverse en sentidos opuestos.' },
  { type: 'paragraph', text: 'Los sensores registraron que durante la interacción:' },
  {
    type: 'paragraph',
    text: 'A ejerció sobre B una fuerza de 90 N hacia la derecha; B ejerció sobre A una fuerza de 90 N hacia la izquierda.',
  },
  { type: 'paragraph', text: 'La masa de A era mayor que la masa de B.' },
];

const fuerzasMovimientoLeyesNewton: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 4,
  title: 'Fuerzas, movimiento y leyes de Newton',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cambios en el movimiento a partir de la fuerza neta, relacionando masa, aceleración e inercia con las leyes de Newton, e interpretar situaciones experimentales y datos simples sobre la acción de fuerzas en distintos cuerpos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Fuerzas, movimiento y leyes de Newton' },

    { type: 'heading', level: 2, text: '1. Fuerza' },
    {
      type: 'paragraph',
      text: 'Una fuerza corresponde a una interacción capaz de modificar el estado de movimiento de un cuerpo o producir deformaciones. La fuerza es una magnitud vectorial. Por eso posee: magnitud; dirección; sentido. Su unidad en el Sistema Internacional es el newton: N.',
    },

    { type: 'heading', level: 2, text: '2. Fuerza neta' },
    {
      type: 'paragraph',
      text: 'Sobre un mismo cuerpo pueden actuar varias fuerzas al mismo tiempo. La fuerza neta corresponde al resultado de combinar vectorialmente todas las fuerzas que actúan sobre él. Si las fuerzas se equilibran: fuerza neta = 0. Si no se equilibran: fuerza neta ≠ 0. La fuerza neta es la que determina el cambio en el movimiento.',
    },

    { type: 'heading', level: 2, text: '3. Primera ley de Newton' },
    {
      type: 'paragraph',
      text: 'La primera ley establece que un cuerpo mantiene su estado de reposo o de movimiento rectilíneo uniforme si la fuerza neta sobre él es cero. Esto significa que: un cuerpo en reposo puede permanecer en reposo; un cuerpo en movimiento puede continuar con velocidad constante. No se necesita una fuerza neta para mantener una velocidad constante.',
    },

    { type: 'heading', level: 2, text: '4. Inercia' },
    {
      type: 'paragraph',
      text: 'La inercia corresponde a la tendencia de un cuerpo a mantener su estado de movimiento. La masa está relacionada con la inercia. Un cuerpo de mayor masa presenta mayor resistencia a cambiar su velocidad. Por eso, bajo condiciones similares, resulta más difícil acelerar un cuerpo con mayor masa.',
    },

    { type: 'heading', level: 2, text: '5. Segunda ley de Newton' },
    {
      type: 'paragraph',
      text: 'La segunda ley relaciona fuerza neta, masa y aceleración. Se expresa como: Fₙₑₜₐ = ma donde: Fₙₑₜₐ es la fuerza neta; m es la masa; a es la aceleración. La aceleración tiene la misma dirección y sentido que la fuerza neta.',
    },

    { type: 'heading', level: 2, text: '6. Efecto de aumentar la fuerza' },
    {
      type: 'paragraph',
      text: 'Si la masa permanece constante y aumenta la fuerza neta: aumenta la aceleración. Por ejemplo, aplicar una fuerza neta mayor sobre el mismo carro produce un cambio de velocidad más rápido.',
    },

    { type: 'heading', level: 2, text: '7. Efecto de aumentar la masa' },
    {
      type: 'paragraph',
      text: 'Si la fuerza neta permanece constante y aumenta la masa: disminuye la aceleración. Esto se debe a que una masa mayor presenta mayor inercia.',
    },

    { type: 'heading', level: 2, text: '8. Tercera ley de Newton' },
    {
      type: 'paragraph',
      text: 'Cuando un cuerpo ejerce una fuerza sobre otro, el segundo ejerce simultáneamente una fuerza sobre el primero. Estas fuerzas: tienen igual magnitud; tienen sentidos opuestos; actúan sobre cuerpos diferentes. Por eso no se anulan entre sí al analizar un solo cuerpo.',
    },

    { type: 'heading', level: 2, text: '9. Movimiento y equilibrio' },
    {
      type: 'paragraph',
      text: 'Que un cuerpo esté en movimiento no significa necesariamente que exista fuerza neta. Un objeto puede moverse con velocidad constante y tener: Fₙₑₜₐ = 0. En cambio, si cambia su velocidad, existe aceleración y, de acuerdo con la segunda ley, debe existir una fuerza neta distinta de cero.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de dinámica: identifica el cuerpo analizado; reconoce todas las fuerzas relevantes; determina la fuerza neta; observa si la velocidad cambia; relaciona fuerza neta con aceleración; considera la masa del cuerpo; recuerda que acción y reacción actúan sobre cuerpos distintos.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué variable fue modificada entre los ensayos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Masa del carro.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fuerza neta aplicada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Tipo de superficie.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dirección de la gravedad.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra que la fuerza neta aplicada cambia entre ensayos, mientras la masa permanece constante.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué ocurre con la aceleración cuando aumenta la fuerza neta y la masa permanece constante?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumenta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Disminuye.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve siempre cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permanece necesariamente igual.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran que una fuerza neta mayor produce una aceleración mayor cuando la masa se mantiene constante.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué masa tenía aproximadamente el carro?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,5 kg.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1 kg.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 kg.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 kg.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Usando F = ma: m = F/a. Por ejemplo, 2 N / 1 m/s² = 2 kg.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué relación entre fuerza neta y aceleración muestran los datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Son inversamente proporcionales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No existe relación entre ellas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Al duplicar la fuerza neta, se duplica la aceleración.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La aceleración disminuye al aumentar la fuerza.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con masa constante, los datos muestran proporcionalidad directa entre fuerza neta y aceleración.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Si se utilizara un carro de 4 kg y se aplicara una fuerza neta de 8 N, ¿qué aceleración se esperaría?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,5 m/s².' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 m/s².' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '4 m/s².' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '32 m/s².' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'a = F/m = 8 N / 4 kg = 2 m/s².' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué ley de Newton explica principalmente que ambos estudiantes se ejerzan fuerzas de igual magnitud y sentido opuesto?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Primera ley.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ley de gravitación universal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tercera ley.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ley de conservación de la carga.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tercera ley establece que dos cuerpos que interactúan se ejercen fuerzas de igual magnitud y sentidos opuestos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué las dos fuerzas de 90 N no se anulan entre sí?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque actúan sobre cuerpos diferentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque una de ellas no es una fuerza real.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque tienen distinta magnitud.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque ambas apuntan en el mismo sentido.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una fuerza actúa sobre A y la otra sobre B, por lo que no se suman al calcular la fuerza neta de un solo estudiante.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si la fuerza horizontal sobre ambos tiene la misma magnitud, ¿cuál estudiante experimentará mayor aceleración durante el empujón?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A, porque tiene mayor masa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos necesariamente la misma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguno, porque las fuerzas son opuestas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'B, porque tiene menor masa.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con la misma magnitud de fuerza, el cuerpo de menor masa experimenta mayor aceleración según a = F/m.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Antes del empujón, ambos estudiantes permanecían en reposo. Si la fuerza neta sobre cada uno era cero, ¿qué principio describe esa situación?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo la tercera ley de Newton.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Primera ley de Newton.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Únicamente conservación de energía térmica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Refracción de la luz.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La primera ley establece que un cuerpo permanece en reposo si la fuerza neta que actúa sobre él es cero.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál afirmación integra correctamente la situación?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Como las fuerzas tienen igual magnitud, ambos deben adquirir exactamente la misma aceleración.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La fuerza que A ejerce sobre B existe antes que la fuerza de B sobre A.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las fuerzas de interacción tienen igual magnitud, pero las aceleraciones pueden ser diferentes porque dependen también de las masas de los cuerpos.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La tercera ley exige que ambos estudiantes tengan la misma masa.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las fuerzas de acción y reacción tienen igual magnitud, pero la aceleración de cada cuerpo depende de su propia masa mediante la segunda ley de Newton.',
        },
      ],
    },
  ],
};

export default fuerzasMovimientoLeyesNewton;
