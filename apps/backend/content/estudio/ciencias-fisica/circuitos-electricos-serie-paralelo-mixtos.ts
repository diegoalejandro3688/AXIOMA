// PHYSICS-C2A -- Ciencias / U2 "Física", Recurso 10 (order 10 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R22 -- C A D B C B A D C B.
// Sin tablas editoriales formales; los valores de R₁, R₂ y V de la Situación A
// son líneas de texto estructuradas. Se preservan EXACTAMENTE los símbolos
// Unicode: Ω, subíndices ₁ ₂ ₃ ₑ, y ≈ (en "≈ 1,33 A"), y las relaciones
// I₁ = I₂ = I₃, Rₑq = R₁ + R₂ + R₃ + ..., 1/Rₑq = 1/R₁ + 1/R₂ + ...
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
  { type: 'heading', level: 3, text: 'Dos resistores conectados de distintas formas' },
  { type: 'paragraph', text: 'Un grupo de estudiantes utilizó dos resistores:' },
  { type: 'paragraph', text: 'R₁ = 6 Ω' },
  { type: 'paragraph', text: 'R₂ = 3 Ω' },
  { type: 'paragraph', text: 'y una fuente ideal de:' },
  { type: 'paragraph', text: 'V = 12 V' },
  { type: 'paragraph', text: 'Primero conectaron los resistores en serie.' },
  { type: 'paragraph', text: 'Después los conectaron en paralelo a la misma fuente.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Tres lámparas y una falla' },
  { type: 'paragraph', text: 'Un equipo construyó dos circuitos utilizando tres lámparas eléctricamente equivalentes.' },
  { type: 'paragraph', text: 'En el circuito P, las tres lámparas estaban conectadas en serie.' },
  { type: 'paragraph', text: 'En el circuito Q, las tres lámparas estaban conectadas en paralelo a una fuente ideal.' },
  {
    type: 'paragraph',
    text: 'Después de comprobar que ambos circuitos funcionaban, retiraron una lámpara de cada montaje y dejaron abierta su posición.',
  },
];

const circuitosElectricosSerieParaleloMixtos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 10,
  title: 'Circuitos eléctricos en serie, paralelo y mixtos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá analizar circuitos eléctricos simples en serie, paralelo y configuraciones mixtas, relacionando corriente, voltaje y resistencia equivalente, e interpretar cómo cambia el comportamiento del circuito al modificar la conexión entre componentes.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Circuitos eléctricos en serie, paralelo y mixtos' },

    { type: 'heading', level: 2, text: '1. Circuito eléctrico' },
    {
      type: 'paragraph',
      text: 'Un circuito eléctrico corresponde a un conjunto de componentes conectados de modo que exista un camino para el movimiento de cargas. Puede incluir: fuente; conductores; resistores; interruptores; otros componentes. Para que exista corriente sostenida debe existir un camino cerrado y una diferencia de potencial.',
    },

    { type: 'heading', level: 2, text: '2. Circuito en serie' },
    {
      type: 'paragraph',
      text: 'En una conexión en serie, los componentes se ubican uno después de otro en un mismo camino. La corriente que atraviesa cada componente es la misma. Por eso, en un circuito ideal en serie: I₁ = I₂ = I₃. La diferencia de potencial de la fuente se distribuye entre los componentes.',
    },

    { type: 'heading', level: 2, text: '3. Resistencia equivalente en serie' },
    {
      type: 'paragraph',
      text: 'Para resistores conectados en serie: Rₑq = R₁ + R₂ + R₃ + ... Agregar resistores en serie aumenta la resistencia equivalente. Si el voltaje de la fuente permanece constante, una resistencia equivalente mayor produce una corriente total menor.',
    },

    { type: 'heading', level: 2, text: '4. Voltaje en serie' },
    {
      type: 'paragraph',
      text: 'En un circuito en serie, la suma de las diferencias de potencial en los componentes corresponde al voltaje total aplicado. De forma simplificada: Vtotal = V₁ + V₂ + V₃. Un resistor de mayor resistencia puede presentar una mayor caída de voltaje si la misma corriente pasa por todos.',
    },

    { type: 'heading', level: 2, text: '5. Circuito en paralelo' },
    {
      type: 'paragraph',
      text: 'En una conexión en paralelo, los componentes se encuentran en ramas diferentes conectadas entre los mismos dos puntos principales. Cada rama recibe la misma diferencia de potencial ideal. Por eso: V₁ = V₂ = V₃. La corriente total se reparte entre las ramas.',
    },

    { type: 'heading', level: 2, text: '6. Corriente en paralelo' },
    {
      type: 'paragraph',
      text: 'En un nodo, la corriente puede dividirse. Para un circuito simple: Itotal = I₁ + I₂ + I₃. La rama de menor resistencia permite una mayor corriente si todas tienen el mismo voltaje. La suma de las corrientes de las ramas corresponde a la corriente entregada por la fuente.',
    },

    { type: 'heading', level: 2, text: '7. Resistencia equivalente en paralelo' },
    {
      type: 'paragraph',
      text: 'Para resistores en paralelo: 1/Rₑq = 1/R₁ + 1/R₂ + ... La resistencia equivalente de varios resistores en paralelo es menor que cualquiera de las resistencias individuales. Esto permite que, con el mismo voltaje de fuente, aumente la corriente total del circuito.',
    },

    { type: 'heading', level: 2, text: '8. ¿Qué ocurre si un componente falla?' },
    {
      type: 'paragraph',
      text: 'En un circuito simple en serie, si se interrumpe un componente, se abre el único camino y deja de circular corriente por todo el circuito. En un circuito en paralelo, si una rama se abre, las demás pueden seguir funcionando si conservan un camino cerrado. Esta diferencia tiene aplicaciones prácticas importantes.',
    },

    { type: 'heading', level: 2, text: '9. Circuitos mixtos' },
    {
      type: 'paragraph',
      text: 'Un circuito mixto combina secciones en serie y en paralelo. Para analizarlo se puede: identificar grupos claramente en paralelo; calcular su resistencia equivalente; combinar esa equivalencia con elementos en serie; determinar corriente y voltajes paso a paso. No conviene tratar todo el circuito como una sola regla memorizada.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de circuitos: identifica nodos y caminos; determina qué componentes están realmente en serie; identifica ramas en paralelo; recuerda: misma corriente en serie; recuerda: mismo voltaje en paralelo; calcula primero la resistencia equivalente; verifica si una interrupción afecta a todo el circuito o solo a una rama.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuál es la resistencia equivalente cuando R₁ y R₂ están conectados en serie?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9 Ω.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18 Ω.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En serie, las resistencias se suman: Rₑq = 6 Ω + 3 Ω = 9 Ω.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'En la conexión en serie, ¿qué magnitud es igual en ambos resistores?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La corriente.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La resistencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La caída de voltaje.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La potencia necesariamente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un circuito en serie existe un único camino, por lo que la misma corriente atraviesa ambos resistores.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuál es aproximadamente la corriente total en la conexión en serie?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,75 A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2,0 A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4,0 A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,33 A.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'I = V/Rₑq = 12 V / 9 Ω ≈ 1,33 A.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Cuando los mismos resistores se conectan en paralelo, ¿qué magnitud es igual en ambos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La corriente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El voltaje.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La resistencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de carga almacenada.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las ramas en paralelo están conectadas entre los mismos dos puntos, por lo que reciben la misma diferencia de potencial.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuál es la resistencia equivalente de R₁ = 6 Ω y R₂ = 3 Ω conectados en paralelo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '9 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4,5 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 Ω.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18 Ω.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '1/Rₑq = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2, por lo que Rₑq = 2 Ω.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué ocurre en el circuito P al retirar una lámpara?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La corriente aumenta en las otras dos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se abre el único camino y las demás dejan de funcionar.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las otras dos reciben automáticamente el doble de voltaje.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No ocurre ningún cambio.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En serie existe un único camino para la corriente; abrirlo impide que la corriente circule por todo el circuito.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué ocurre normalmente con las otras ramas del circuito Q si una lámpara es retirada y las restantes continúan conectadas a la fuente?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Pueden seguir conduciendo corriente.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Deben apagarse todas obligatoriamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se convierten en una conexión en serie.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fuente deja necesariamente de tener voltaje.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada rama en paralelo posee su propio camino, por lo que abrir una no interrumpe necesariamente las restantes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si las tres lámparas del circuito Q son equivalentes, ¿cómo se relacionan las corrientes de sus ramas antes de retirar una?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una debe ser el doble de las otras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas deben ser cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La corriente solo pasa por una rama a la vez.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Son iguales entre sí.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Lámparas equivalentes sometidas al mismo voltaje presentan la misma resistencia y, por ley de Ohm, corrientes iguales.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué ocurre con la corriente total entregada por la fuente al agregar una rama resistiva en paralelo, manteniendo constante el voltaje ideal?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Disminuye necesariamente a cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permanece siempre exactamente igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumenta porque disminuye la resistencia equivalente.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve independiente de la resistencia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Agregar una rama en paralelo reduce la resistencia equivalente y, con voltaje constante, aumenta la corriente total.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'En un circuito mixto, un resistor R₁ está en serie con un conjunto formado por R₂ y R₃ conectados en paralelo. ¿Cuál procedimiento es más adecuado para calcular la resistencia equivalente total?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sumar directamente R₁ + R₂ + R₃.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Calcular primero la resistencia equivalente de R₂ y R₃ en paralelo y luego sumarla con R₁.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Multiplicar las tres resistencias sin considerar su conexión.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Considerar que la resistencia equivalente siempre es igual a la menor resistencia del circuito.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un circuito mixto se simplifica primero cada sección según su tipo de conexión y luego se combinan las equivalencias obtenidas.',
        },
      ],
    },
  ],
};

export default circuitosElectricosSerieParaleloMixtos;
