// CHEMISTRY-C2A -- Ciencias / U3 "Química", Recurso 9 (order 9 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R32 -- A D B C A C B D A C.
// Tabla editorial de la Situación A ("Muestra / Masa de H₂O") como filas de
// párrafo con "|" -- FORMAT_ONLY. La Situación B es prosa estructurada
// (lista de masas molares) sin tabla formal. Se preservan EXACTAMENTE:
// 6,02 × 10²³, 1,20 × 10²⁴, 3,01 × 10²³, 1,81 × 10²⁴, 5,4 × 10²⁵,
// M(H₂O) = 2(1) + 16 = 18 g/mol, n = m/M, m = nM, 2 : 1 : 2 y g/mol
// (símbolos × U+00D7, superíndices ²³/²⁴/²⁵).
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
  { type: 'heading', level: 3, text: 'Comparación de muestras de agua' },
  { type: 'paragraph', text: 'Un grupo de estudiantes trabajó con agua, cuya masa molar consideraron igual a:' },
  { type: 'paragraph', text: '18 g/mol' },
  { type: 'paragraph', text: 'Registraron:' },
  { type: 'paragraph', text: '| Muestra | Masa de H₂O |' },
  { type: 'paragraph', text: '| P | 18 g |' },
  { type: 'paragraph', text: '| Q | 36 g |' },
  { type: 'paragraph', text: '| R | 9 g |' },
  { type: 'paragraph', text: '| S | 54 g |' },
  { type: 'paragraph', text: 'Para sus cálculos utilizaron:' },
  { type: 'paragraph', text: '6,02 × 10²³ partículas/mol' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Formación de agua' },
  { type: 'paragraph', text: 'Un equipo estudió la reacción:' },
  { type: 'paragraph', text: '2 H₂ + O₂ → 2 H₂O' },
  { type: 'paragraph', text: 'Para simplificar los cálculos consideraron:' },
  { type: 'paragraph', text: 'masa molar de H₂ = 2 g/mol; masa molar de O₂ = 32 g/mol; masa molar de H₂O = 18 g/mol.' },
  {
    type: 'paragraph',
    text: 'En cada pregunta se considera que el otro reactivo está disponible en cantidad suficiente, salvo que se indique lo contrario.',
  },
];

const molMasaMolarRelacionesEstequiometricas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 9,
  title: 'Mol, masa molar y relaciones estequiométricas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá interpretar el mol como unidad de cantidad de sustancia, relacionar cantidad de partículas, masa y masa molar, y utilizar coeficientes de ecuaciones químicas balanceadas para establecer relaciones estequiométricas simples entre reactivos y productos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Mol, masa molar y relaciones estequiométricas' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un mol?' },
    {
      type: 'paragraph',
      text: 'El mol es la unidad del Sistema Internacional para la cantidad de sustancia. Un mol contiene aproximadamente: 6,02 × 10²³ entidades elementales. Estas entidades pueden ser, por ejemplo: átomos; moléculas; iones. Este número se conoce como constante de Avogadro.',
    },

    { type: 'heading', level: 2, text: '2. Cantidad de partículas' },
    {
      type: 'paragraph',
      text: 'Si una muestra contiene 1 mol de moléculas, posee aproximadamente: 6,02 × 10²³ moléculas. Si contiene 2 mol: 2 × 6,02 × 10²³ moléculas. El mol permite conectar cantidades microscópicas de partículas con cantidades medibles en laboratorio.',
    },

    { type: 'heading', level: 2, text: '3. Masa molar' },
    {
      type: 'paragraph',
      text: 'La masa molar corresponde a la masa de un mol de una sustancia. Se expresa habitualmente en: g/mol. Por ejemplo, si una sustancia posee una masa molar de 18 g/mol, entonces: 1 mol de esa sustancia tiene una masa de 18 g.',
    },

    { type: 'heading', level: 2, text: '4. Calcular masa molar' },
    {
      type: 'paragraph',
      text: 'La masa molar de un compuesto puede calcularse sumando los aportes de los átomos indicados en su fórmula. Por ejemplo, para H₂O, usando aproximadamente: H = 1 g/mol; O = 16 g/mol se obtiene: M(H₂O) = 2(1) + 16 = 18 g/mol.',
    },

    { type: 'heading', level: 2, text: '5. Relación entre masa y mol' },
    {
      type: 'paragraph',
      text: 'Puede utilizarse: n = m/M donde: n es la cantidad de sustancia en mol; m es la masa; M es la masa molar. También: m = nM. Estas relaciones permiten convertir entre masa y cantidad de sustancia.',
    },

    { type: 'heading', level: 2, text: '6. Ecuación balanceada y moles' },
    {
      type: 'paragraph',
      text: 'Los coeficientes de una ecuación balanceada expresan relaciones proporcionales entre cantidades de sustancia. Por ejemplo: 2 H₂ + O₂ → 2 H₂O indica una relación molar: 2 : 1 : 2 entre H₂, O₂ y H₂O.',
    },

    { type: 'heading', level: 2, text: '7. Relaciones estequiométricas' },
    {
      type: 'paragraph',
      text: 'Si la reacción es: 2 H₂ + O₂ → 2 H₂O entonces, bajo condiciones ideales y con reactivos suficientes: 2 mol de H₂ reaccionan con 1 mol de O₂; 2 mol de H₂ pueden producir 2 mol de H₂O; 1 mol de O₂ puede producir 2 mol de H₂O. Los coeficientes funcionan como factores de proporción.',
    },

    { type: 'heading', level: 2, text: '8. De mol a masa' },
    {
      type: 'paragraph',
      text: 'Para calcular la masa de un producto se puede seguir: convertir el dato inicial a mol; utilizar la relación molar de la ecuación; convertir los mol obtenidos a masa mediante la masa molar. Es importante no comparar directamente masas cuando la ecuación entrega una relación entre moles.',
    },

    { type: 'heading', level: 2, text: '9. Conservación de masa' },
    {
      type: 'paragraph',
      text: 'En un sistema cerrado, la masa total se conserva durante una reacción química. Sin embargo, esto no significa que cada reactivo y cada producto posean la misma masa individual. Los átomos se reorganizan y las proporciones dependen de: fórmula química; coeficientes; masas molares.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante un problema estequiométrico: identifica la ecuación balanceada; localiza el dato conocido; conviértelo a mol si está expresado en masa; usa la relación entre coeficientes; convierte el resultado a la unidad solicitada; revisa las unidades en cada paso; no confundas masa molar con masa total de una muestra.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántos moles de H₂O hay en la muestra P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,5 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6,02 × 10²³ mol.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'n = m/M = 18 g / 18 g/mol = 1 mol.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántos moles de H₂O hay en Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,5 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '36 g / 18 g/mol = 2 mol.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántos moles de H₂O contiene R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,5 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '9 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18 mol.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'n = 9 g / 18 g/mol = 0,5 mol.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántas moléculas contiene aproximadamente la muestra P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '18 moléculas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,20 × 10²⁴ moléculas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6,02 × 10²³ moléculas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3,01 × 10²³ moléculas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'P contiene 1 mol de H₂O, equivalente aproximadamente a 6,02 × 10²³ moléculas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuántas moléculas de H₂O contiene aproximadamente la muestra S?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1,81 × 10²⁴ moléculas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '6,02 × 10²³ moléculas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3,01 × 10²³ moléculas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5,4 × 10²⁵ moléculas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '54 g corresponden a 3 mol. Entonces 3 × 6,02 × 10²³ ≈ 1,81 × 10²⁴ moléculas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: 'Según la ecuación, ¿cuántos moles de H₂O pueden formarse a partir de 2 mol de H₂?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,5 mol.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los coeficientes de H₂ y H₂O son ambos 2, por lo que la relación molar es 2:2.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuántos moles de H₂O pueden formarse a partir de 1 mol de O₂?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,5 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '32 mol.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La ecuación indica que 1 mol de O₂ puede producir 2 mol de H₂O.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué masa de H₂ corresponde a 3 mol de H₂?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1,5 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6 g.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'm = nM = 3 mol × 2 g/mol = 6 g.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si reaccionan 4 mol de H₂ con suficiente O₂, ¿qué masa de H₂O puede producirse idealmente?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '72 g.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '36 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 g.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La relación H₂:H₂O es 1:1 en cantidad de mol. 4 mol de H₂ producen 4 mol de H₂O, equivalentes a 4 × 18 g = 72 g.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “Como el coeficiente de H₂O es 2, siempre se forman exactamente 2 g de agua”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque los coeficientes representan directamente gramos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta solo cuando se usan 2 g de oxígeno.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: los coeficientes expresan proporciones entre cantidades de sustancia, y la masa debe obtenerse considerando los moles y la masa molar.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque las ecuaciones químicas no permiten establecer relaciones cuantitativas.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El coeficiente 2 representa una proporción de cantidad de sustancia, no una masa de 2 g. Para obtener masa deben utilizarse además las masas molares.',
        },
      ],
    },
  ],
};

export default molMasaMolarRelacionesEstequiometricas;
