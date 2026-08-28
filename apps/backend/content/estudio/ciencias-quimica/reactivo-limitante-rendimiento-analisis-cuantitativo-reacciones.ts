// CHEMISTRY-C2A -- Ciencias / U3 "Química", Recurso 10 (order 10 en U3).
// Cierra la unidad U3 "Química" en el source (10 recursos / 100 preguntas).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R33 -- C A D B C B A D C B.
// Las dos situaciones son prosa estructurada (sin tablas formales). Se
// preservan EXACTAMENTE: 2 H₂ + O₂ → 2 H₂O, la relación
// rendimiento (%) = (cantidad experimental / cantidad teórica) × 100,
// y los valores 25 g, 20 g, 26 g, 80%, 100%, 125% (símbolo × U+00D7,
// flecha → U+2192).
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
  { type: 'heading', level: 3, text: 'Dos reactivos disponibles en distintas cantidades' },
  { type: 'paragraph', text: 'Un grupo de estudiantes estudió la reacción:' },
  { type: 'paragraph', text: '2 H₂ + O₂ → 2 H₂O' },
  { type: 'paragraph', text: 'Disponían inicialmente de:' },
  { type: 'paragraph', text: '4 mol de H₂' },
  { type: 'paragraph', text: '3 mol de O₂' },
  { type: 'paragraph', text: 'Consideraron que la reacción ocurría según la proporción indicada por la ecuación.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Rendimiento experimental de una reacción' },
  { type: 'paragraph', text: 'Un equipo realizó una reacción cuya cantidad teórica de producto era:' },
  { type: 'paragraph', text: '25 g' },
  { type: 'paragraph', text: 'Después de completar el procedimiento, separar el producto y secarlo, obtuvo:' },
  { type: 'paragraph', text: '20 g' },
  { type: 'paragraph', text: 'Los estudiantes utilizaron:' },
  { type: 'paragraph', text: 'rendimiento (%) = (cantidad experimental / cantidad teórica) × 100' },
  {
    type: 'paragraph',
    text: 'En otro ensayo, un grupo obtuvo aparentemente 26 g de producto usando las mismas cantidades iniciales, por lo que decidió revisar su procedimiento y la pureza de la muestra obtenida.',
  },
];

const reactivoLimitanteRendimientoAnalisisCuantitativoReacciones: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 10,
  title: 'Reactivo limitante, rendimiento y análisis cuantitativo de reacciones',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar el reactivo limitante y el reactivo en exceso en reacciones químicas simples, calcular cantidades teóricas de producto y rendimiento porcentual, e interpretar diferencias entre resultados teóricos y experimentales.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Reactivo limitante, rendimiento y análisis cuantitativo de reacciones' },

    { type: 'heading', level: 2, text: '1. Reactivos y proporciones' },
    {
      type: 'paragraph',
      text: 'Una ecuación química balanceada indica la proporción en que reaccionan las sustancias. Por ejemplo: 2 H₂ + O₂ → 2 H₂O indica que: 2 mol de H₂ reaccionan con 1 mol de O₂; se pueden formar 2 mol de H₂O. Estas proporciones permiten determinar cuánto puede reaccionar de cada sustancia.',
    },

    { type: 'heading', level: 2, text: '2. Reactivo limitante' },
    {
      type: 'paragraph',
      text: 'El reactivo limitante es el reactivo que se consume primero según la proporción estequiométrica. Cuando este reactivo se agota: la reacción ya no puede seguir formando producto mediante esa reacción, aunque quede otro reactivo disponible. Por eso determina la cantidad máxima de producto que puede formarse.',
    },

    { type: 'heading', level: 2, text: '3. Reactivo en exceso' },
    {
      type: 'paragraph',
      text: 'El reactivo en exceso se encuentra en una cantidad mayor que la necesaria para reaccionar completamente con el reactivo limitante. Cuando termina la reacción: puede quedar parte de este reactivo sin reaccionar. Que un reactivo tenga mayor cantidad inicial no significa automáticamente que esté en exceso; debe compararse con la proporción de la ecuación.',
    },

    { type: 'heading', level: 2, text: '4. Cómo identificar el reactivo limitante' },
    {
      type: 'paragraph',
      text: 'Un procedimiento útil es: convertir cada cantidad disponible a mol; comparar esos valores usando los coeficientes de la ecuación; determinar cuál reactivo permite formar menos producto. Ese reactivo es el limitante.',
    },

    { type: 'heading', level: 2, text: '5. Producto teórico' },
    {
      type: 'paragraph',
      text: 'El rendimiento teórico corresponde a la cantidad máxima de producto que podría obtenerse según: la ecuación balanceada; la cantidad de reactivo limitante. Puede expresarse en: mol; gramos; otras unidades apropiadas. Es un valor calculado.',
    },

    { type: 'heading', level: 2, text: '6. Resultado experimental' },
    {
      type: 'paragraph',
      text: 'En una experiencia real, la cantidad obtenida puede ser menor que la teórica. Esto puede deberse, por ejemplo, a: pérdidas durante el procedimiento; reacción incompleta; reacciones secundarias; dificultades en la separación o recuperación del producto. Por eso debe distinguirse el resultado experimental del resultado teórico.',
    },

    { type: 'heading', level: 2, text: '7. Rendimiento porcentual' },
    {
      type: 'paragraph',
      text: 'El rendimiento porcentual compara la cantidad real obtenida con la cantidad teórica. Puede expresarse como: rendimiento (%) = (cantidad experimental / cantidad teórica) × 100. Por ejemplo, si teóricamente se esperaban 10 g y se obtuvieron 8 g: rendimiento = (8 g / 10 g) × 100 = 80%.',
    },

    { type: 'heading', level: 2, text: '8. Interpretar el rendimiento' },
    {
      type: 'paragraph',
      text: 'Un rendimiento de: 100% significa que la cantidad experimental coincide con la cantidad teórica calculada. Un rendimiento menor que 100% indica que se obtuvo menos producto que el máximo teórico. En un análisis experimental, un valor aparentemente superior al 100% debería revisarse considerando factores como: impurezas; humedad; errores de medición; procedimiento utilizado.',
    },

    { type: 'heading', level: 2, text: '9. Reactivo sobrante' },
    {
      type: 'paragraph',
      text: 'Después de identificar el reactivo limitante, puede calcularse cuánto reactivo en exceso queda sin reaccionar. Para ello: determina cuánto reactivo en exceso fue necesario; réstalo de la cantidad inicial disponible. Esto permite describir cuantitativamente el estado final del sistema.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante un problema de reactivo limitante: escribe o identifica la ecuación balanceada; convierte las cantidades a mol; usa los coeficientes estequiométricos; identifica qué reactivo produce menos producto; calcula el rendimiento teórico a partir del limitante; diferencia resultado teórico de experimental; si corresponde, calcula el rendimiento porcentual o el reactivo sobrante.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuántos moles de O₂ se necesitan para reaccionar completamente con 4 mol de H₂?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8 mol.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ecuación indica una relación 2 mol H₂ : 1 mol O₂. Por lo tanto, 4 mol de H₂ requieren 2 mol de O₂.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál reactivo es el limitante en esta situación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'H₂.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'O₂.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'H₂O.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Ninguno, porque siempre reaccionan cantidades iguales.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los 4 mol de H₂ requieren solo 2 mol de O₂, y hay 3 mol disponibles. Por lo tanto, H₂ se consume primero.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántos moles de H₂O pueden formarse teóricamente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 mol.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La relación H₂:H₂O es 2:2, equivalente a 1:1. Por ello, 4 mol de H₂ pueden formar 4 mol de H₂O.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuánto O₂ queda sin reaccionar después de consumir completamente el H₂?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1 mol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '2 mol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 mol.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se necesitan 2 mol de O₂ para reaccionar con los 4 mol de H₂. Como inicialmente había 3 mol, queda 1 mol de O₂.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “O₂ debe ser el reactivo limitante porque inicialmente hay menos moles de O₂ que de H₂”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque el reactivo con menos moles siempre es el limitante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque todos los coeficientes de una reacción son iguales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: debe considerarse la proporción estequiométrica, y en este caso 3 mol de O₂ son más que suficientes para reaccionar con 4 mol de H₂.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque una reacción química nunca puede tener reactivo limitante.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El reactivo limitante no se determina comparando directamente los moles iniciales, sino comparándolos con la relación indicada por los coeficientes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál es la cantidad experimental obtenida en el primer ensayo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '5 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '20 g.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '25 g.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '80 g.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La situación indica que se obtuvieron experimentalmente 20 g de producto.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál fue el rendimiento porcentual del primer ensayo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '80%.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '20%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '125%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5%.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Rendimiento = (20 g / 25 g) × 100 = 80%.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué representa la cantidad teórica de 25 g?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La cantidad que siempre debe obtenerse exactamente en cualquier experimento.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La masa total de todos los reactivos antes de reaccionar necesariamente.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de reactivo que sobró.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La cantidad máxima de producto calculada a partir de la estequiometría y del reactivo limitante.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El rendimiento teórico representa el máximo calculado que podría producirse bajo las condiciones estequiométricas consideradas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál podría explicar que el rendimiento experimental sea menor que 100%?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los coeficientes de la ecuación dejan de existir durante el experimento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número de protones de los elementos cambia espontáneamente.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Pérdidas de producto, reacción incompleta o dificultades en su recuperación.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda reacción debe producir obligatoriamente menos del 50%.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Diversos factores experimentales pueden hacer que la cantidad recuperada sea menor que la cantidad teórica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'El segundo grupo obtiene aparentemente 26 g cuando el máximo teórico calculado era 25 g. ¿Cuál interpretación es más adecuada?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La reacción creó materia adicional, por lo que el cálculo teórico es irrelevante.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El resultado debe revisarse, ya que una masa aparente superior al rendimiento teórico puede indicar impurezas, humedad o errores experimentales en la muestra o medición.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todo rendimiento real debe superar 100%.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El reactivo limitante produce automáticamente más producto cuando se mide después de la reacción.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un resultado aparente superior al máximo teórico requiere revisar el procedimiento y la muestra antes de concluir que se obtuvo realmente más producto puro del permitido por la estequiometría.',
        },
      ],
    },
  ],
};

export default reactivoLimitanteRendimientoAnalisisCuantitativoReacciones;
