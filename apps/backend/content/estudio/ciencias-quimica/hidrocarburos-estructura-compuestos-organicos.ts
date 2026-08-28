// CHEMISTRY-C2A -- Ciencias / U3 "Química", Recurso 6 (order 6 en U3).
// Abre el bloque CHEMISTRY-C2A (Química R29-R33).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R29 -- A C B D A B D C A B.
// Tablas editoriales (Situación A "Compuesto / Representación" y Situación B
// "Sustancia / Fórmula molecular") como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preservan EXACTAMENTE los símbolos Unicode: CH₃–CH₃, CH₂=CH₂, HC≡CH,
// CH₃–CH₂–CH₃, CₙH₂ₙ₊₂, CₙH₂ₙ, CₙH₂ₙ₋₂, C₂H₆, C₂H₄, C₂H₂, C₃H₈, C₄H₁₀,
// C₄H₈, C₄H₆, y los enlaces C–C, C=C, C≡C.
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
  { type: 'heading', level: 3, text: 'Comparación de cuatro hidrocarburos' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó cuatro compuestos.' },
  { type: 'paragraph', text: '| Compuesto | Representación |' },
  { type: 'paragraph', text: '| P | CH₃–CH₃ |' },
  { type: 'paragraph', text: '| Q | CH₂=CH₂ |' },
  { type: 'paragraph', text: '| R | HC≡CH |' },
  { type: 'paragraph', text: '| S | CH₃–CH₂–CH₃ |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Fórmulas de una serie de compuestos' },
  { type: 'paragraph', text: 'Un equipo comparó tres sustancias de cadena abierta.' },
  { type: 'paragraph', text: '| Sustancia | Fórmula molecular |' },
  { type: 'paragraph', text: '| X | C₄H₁₀ |' },
  { type: 'paragraph', text: '| Y | C₄H₈ |' },
  { type: 'paragraph', text: '| Z | C₄H₆ |' },
  { type: 'paragraph', text: 'Los estudiantes consideraron estructuras sencillas en las que:' },
  {
    type: 'paragraph',
    text: 'X posee solo enlaces simples C–C; Y posee un enlace doble C=C; Z posee un enlace triple C≡C.',
  },
];

const hidrocarburosEstructuraCompuestosOrganicos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 6,
  title: 'Hidrocarburos y estructura de compuestos orgánicos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá clasificar hidrocarburos simples como alcanos, alquenos o alquinos a partir del tipo de enlace entre átomos de carbono, relacionar estructura y grado de saturación, e interpretar fórmulas moleculares y estructurales sencillas de compuestos orgánicos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Hidrocarburos y estructura de compuestos orgánicos' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un hidrocarburo?' },
    {
      type: 'paragraph',
      text: 'Un hidrocarburo es un compuesto orgánico formado únicamente por: carbono; hidrógeno. Los hidrocarburos pueden presentar diferentes estructuras dependiendo de cómo se conectan los átomos de carbono. Entre las familias más simples se encuentran: alcanos; alquenos; alquinos.',
    },

    { type: 'heading', level: 2, text: '2. Alcanos' },
    {
      type: 'paragraph',
      text: 'Los alcanos contienen únicamente enlaces simples entre carbonos. Por eso se clasifican como hidrocarburos saturados. Ejemplo: CH₃–CH₃ corresponde a un hidrocarburo con enlace simple carbono–carbono.',
    },

    { type: 'heading', level: 2, text: '3. Alquenos' },
    {
      type: 'paragraph',
      text: 'Los alquenos contienen al menos un enlace doble entre carbonos: C=C. Este enlace reduce la cantidad máxima de hidrógenos que puede tener la molécula respecto de un alcano con igual número de carbonos. Por ello se consideran hidrocarburos insaturados.',
    },

    { type: 'heading', level: 2, text: '4. Alquinos' },
    {
      type: 'paragraph',
      text: 'Los alquinos contienen al menos un enlace triple entre carbonos: C≡C. También se consideran insaturados. Un enlace triple implica una mayor cantidad de enlace entre dos carbonos y, por lo tanto, menos enlaces disponibles para hidrógeno.',
    },

    { type: 'heading', level: 2, text: '5. Saturación e insaturación' },
    {
      type: 'paragraph',
      text: 'Un hidrocarburo saturado posee solo enlaces simples entre carbonos. Un hidrocarburo insaturado posee al menos: un enlace doble; o un enlace triple. La clasificación depende de la estructura, no solo del número total de átomos.',
    },

    { type: 'heading', level: 2, text: '6. Fórmulas moleculares simples' },
    {
      type: 'paragraph',
      text: 'Para cadenas abiertas sencillas pueden observarse relaciones generales. Alcanos: CₙH₂ₙ₊₂. Alquenos con un doble enlace: CₙH₂ₙ. Alquinos con un triple enlace: CₙH₂ₙ₋₂. Estas expresiones permiten comparar el número de hidrógenos para igual número de carbonos.',
    },

    { type: 'heading', level: 2, text: '7. Comparar fórmulas' },
    {
      type: 'paragraph',
      text: 'Por ejemplo, para dos carbonos: alcano: C₂H₆; alqueno: C₂H₄; alquino: C₂H₂. La disminución del número de hidrógenos está relacionada con la presencia de enlaces múltiples entre carbonos.',
    },

    { type: 'heading', level: 2, text: '8. Fórmulas estructurales' },
    {
      type: 'paragraph',
      text: 'Una fórmula estructural permite identificar directamente el tipo de enlace. Ejemplos: CH₃–CH₂–CH₃; CH₂=CH–CH₃; HC≡C–CH₃. La fórmula molecular puede orientar la clasificación, pero la estructura entrega información más directa.',
    },

    { type: 'heading', level: 2, text: '9. Cadenas lineales y ramificadas' },
    {
      type: 'paragraph',
      text: 'Los hidrocarburos pueden presentar cadenas: lineales; ramificadas. Dos hidrocarburos pueden poseer la misma fórmula molecular y distinta organización estructural. Esto ocurre especialmente a medida que aumenta la cantidad de carbonos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre hidrocarburos: confirma que el compuesto contiene solo C y H; observa el tipo de enlace C–C; identifica enlace simple, doble o triple; clasifica como alcano, alqueno o alquino; relaciona enlaces múltiples con insaturación; compara el número de hidrógenos; distingue fórmula molecular de fórmula estructural.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál compuesto corresponde a un alqueno?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Q contiene un enlace doble C=C, característico de los alquenos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál compuesto contiene un enlace triple?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R presenta la estructura HC≡CH, que contiene un enlace triple entre carbonos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuáles de los compuestos son saturados?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Q y R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P y S.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P y Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R y S.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'P y S poseen únicamente enlaces simples entre carbonos, por lo que corresponden a hidrocarburos saturados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la fórmula molecular de S?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'C₂H₆.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'C₃H₆.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'C₃H₄.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'C₃H₈.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'CH₃–CH₂–CH₃ contiene tres carbonos y ocho hidrógenos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Por qué R posee menos hidrógenos que P si ambos contienen dos carbonos?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque el enlace triple entre los carbonos deja menos capacidad de enlace disponible para hidrógenos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque R contiene menos protones de carbono.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el hidrógeno desaparece al escribir un enlace triple.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque P no es un hidrocarburo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El enlace triple utiliza tres enlaces entre los carbonos, dejando solo un enlace adicional disponible en cada carbono para hidrógeno.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cómo se clasifica X?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Alquino.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Alcano.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Alqueno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Compuesto inorgánico.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'X posee únicamente enlaces simples entre carbonos, por lo que corresponde a un alcano.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué relación se observa al comparar X, Y y Z?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Aumenta el número de hidrógenos al aumentar el número de enlaces múltiples.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todos poseen diferente número de carbonos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fórmula molecular no cambia con la estructura.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Para igual número de carbonos, aumenta la insaturación mientras disminuye el número de hidrógenos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con cuatro carbonos en los tres casos, las estructuras con enlaces múltiples poseen menos hidrógenos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Cuál expresión general es consistente con Y si corresponde a un alqueno de cadena abierta con un solo doble enlace?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'CₙH₂ₙ₊₂' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'CₙH₂ₙ₋₂' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'CₙH₂ₙ' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'CₙHₙ' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los alquenos sencillos de cadena abierta con un doble enlace pueden seguir la relación CₙH₂ₙ.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué información permite distinguir con mayor certeza si una sustancia con fórmula C₄H₈ posee un doble enlace?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Su fórmula estructural.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Solo su masa total.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El color del recipiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de muestra utilizada.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fórmula estructural muestra directamente cómo se conectan los carbonos y permite observar el enlace doble.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “Si dos hidrocarburos tienen cuatro carbonos, deben pertenecer a la misma familia”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque la familia depende solo del número de carbonos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: la familia también depende del tipo de enlace entre carbonos, por lo que compuestos con igual número de carbonos pueden ser alcanos, alquenos o alquinos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta si todos contienen hidrógeno.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque los hidrocarburos nunca pueden tener igual número de carbonos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La clasificación depende del tipo de enlaces presentes y no únicamente de la cantidad de carbonos.',
        },
      ],
    },
  ],
};

export default hidrocarburosEstructuraCompuestosOrganicos;
