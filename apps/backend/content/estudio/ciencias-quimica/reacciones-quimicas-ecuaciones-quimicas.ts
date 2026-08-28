// CHEMISTRY-C2A -- Ciencias / U3 "Química", Recurso 8 (order 8 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R31 -- B D A C B A D C B A.
// Tablas editoriales (Situación A "Ecuación / Representación" y Situación B
// "Propuesta / Ecuación") como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preservan EXACTAMENTE los símbolos y ecuaciones: H₂O, 2 H₂, O₂, N₂,
// NH₃, H₂O₂, 2 H₂ + O₂ → 2 H₂O, N₂ + 3 H₂ → 2 NH₃, y las proporciones
// 2 : 1 : 2, 1 : 3 : 2 (flecha "→" U+2192).
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
  { type: 'heading', level: 3, text: 'Comparación de tres ecuaciones' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó tres representaciones:' },
  { type: 'paragraph', text: '| Ecuación | Representación |' },
  { type: 'paragraph', text: '| P | H₂ + O₂ → H₂O |' },
  { type: 'paragraph', text: '| Q | 2 H₂ + O₂ → 2 H₂O |' },
  { type: 'paragraph', text: '| R | N₂ + 3 H₂ → 2 NH₃ |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Formación de un compuesto' },
  { type: 'paragraph', text: 'Un equipo representó una reacción mediante:' },
  { type: 'paragraph', text: 'N₂ + H₂ → NH₃' },
  { type: 'paragraph', text: 'Luego intentó balancearla.' },
  { type: 'paragraph', text: 'Registraron tres propuestas:' },
  { type: 'paragraph', text: '| Propuesta | Ecuación |' },
  { type: 'paragraph', text: '| 1 | N₂ + H₂ → 2 NH₃ |' },
  { type: 'paragraph', text: '| 2 | N₂ + 3 H₂ → 2 NH₃ |' },
  { type: 'paragraph', text: '| 3 | 2 N₂ + 3 H₂ → 2 NH₃ |' },
];

const reaccionesQuimicasEcuacionesQuimicas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 8,
  title: 'Reacciones químicas y ecuaciones químicas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá interpretar ecuaciones químicas sencillas, distinguir reactivos y productos, relacionar los coeficientes con proporciones entre partículas y aplicar la conservación de los átomos para evaluar y balancear representaciones de reacciones químicas simples.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Reacciones químicas y ecuaciones químicas' },

    { type: 'heading', level: 2, text: '1. ¿Qué representa una ecuación química?' },
    {
      type: 'paragraph',
      text: 'Una ecuación química es una representación simbólica de una reacción. De forma general: reactivos → productos. Los reactivos corresponden a las sustancias presentes al inicio. Los productos corresponden a las sustancias que se forman.',
    },

    { type: 'heading', level: 2, text: '2. Fórmulas químicas' },
    {
      type: 'paragraph',
      text: 'Las sustancias se representan mediante fórmulas químicas. Por ejemplo: H₂O indica que una molécula de agua contiene: 2 átomos de hidrógeno; 1 átomo de oxígeno. Los subíndices forman parte de la identidad de la sustancia representada.',
    },

    { type: 'heading', level: 2, text: '3. Coeficientes' },
    {
      type: 'paragraph',
      text: 'Los números ubicados delante de las fórmulas se denominan coeficientes estequiométricos. Por ejemplo: 2 H₂ representa dos unidades de H₂. El coeficiente multiplica a toda la fórmula. Por tanto, 2 H₂ contiene en total cuatro átomos de hidrógeno.',
    },

    { type: 'heading', level: 2, text: '4. Conservación de los átomos' },
    {
      type: 'paragraph',
      text: 'En una reacción química ordinaria, los átomos se reorganizan. No se crean ni desaparecen átomos por el hecho de ocurrir la reacción. Por eso, una ecuación correctamente balanceada debe presentar el mismo número de átomos de cada elemento a ambos lados.',
    },

    { type: 'heading', level: 2, text: '5. Balanceo de ecuaciones' },
    {
      type: 'paragraph',
      text: 'Balancear una ecuación consiste en ajustar los coeficientes para conservar la cantidad de átomos de cada elemento. No se deben cambiar los subíndices de las fórmulas para balancear. Cambiar un subíndice modificaría la sustancia representada.',
    },

    { type: 'heading', level: 2, text: '6. Ejemplo de balanceo' },
    {
      type: 'paragraph',
      text: 'Considere: H₂ + O₂ → H₂O. La ecuación no está balanceada inicialmente. Una forma balanceada es: 2 H₂ + O₂ → 2 H₂O. Ahora existen: 4 H a ambos lados; 2 O a ambos lados.',
    },

    { type: 'heading', level: 2, text: '7. Coeficientes y proporciones' },
    {
      type: 'paragraph',
      text: 'En: 2 H₂ + O₂ → 2 H₂O los coeficientes expresan una proporción: 2 : 1 : 2. Esto significa que, según la representación, dos unidades de H₂ reaccionan con una de O₂ para formar dos unidades de H₂O.',
    },

    { type: 'heading', level: 2, text: '8. Estados físicos' },
    {
      type: 'paragraph',
      text: 'En algunas ecuaciones pueden aparecer símbolos como: (s) sólido; (l) líquido; (g) gas; (aq) disuelto en agua. Estos símbolos entregan información sobre el estado físico o condición de las sustancias. No cambian por sí mismos la cantidad de átomos.',
    },

    { type: 'heading', level: 2, text: '9. Evidencia y ecuaciones' },
    {
      type: 'paragraph',
      text: 'Una ecuación química representa de manera simbólica un proceso. La evidencia experimental puede incluir: formación de gas; precipitación; cambio de temperatura; cambio de color. La ecuación permite representar qué sustancias participan, mientras la observación experimental aporta evidencia sobre lo que ocurrió.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una ecuación química: identifica reactivos y productos; cuenta átomos de cada elemento; revisa los coeficientes; no modifiques subíndices para balancear; verifica conservación de átomos; interpreta la proporción entre coeficientes; relaciona la ecuación con la evidencia experimental disponible.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: 'En la ecuación Q, ¿cuáles son los reactivos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo H₂O.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'H₂ y O₂.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'H₂O y O₂.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo O₂.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los reactivos se encuentran a la izquierda de la flecha; en Q son H₂ y O₂.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál de las ecuaciones P y Q está correctamente balanceada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguna.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo Q.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Q presenta cuatro H y dos O a ambos lados; P no conserva el número de átomos de oxígeno.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuántos átomos de hidrógeno están representados en total en 2 H₂?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '4.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '2.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cada H₂ contiene dos átomos de hidrógeno y el coeficiente 2 indica dos unidades: 2 × 2 = 4.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la proporción de coeficientes H₂ : O₂ : H₂O en Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 : 1 : 1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1 : 2 : 1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 : 1 : 2.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '2 : 2 : 1.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los coeficientes de Q son 2, 1 y 2 respectivamente.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Un estudiante intenta balancear P cambiando H₂O por H₂O₂. ¿Cuál evaluación es correcta?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es correcto porque cualquier subíndice puede modificarse para equilibrar átomos.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecto porque cambiar un subíndice modifica la sustancia representada; deben ajustarse coeficientes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcto solo si aumenta también el coeficiente del oxígeno.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Es incorrecto porque nunca se pueden usar coeficientes en ecuaciones químicas.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El balanceo conserva las fórmulas químicas y modifica únicamente los coeficientes necesarios.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuántos átomos de nitrógeno contiene una molécula de N₂?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El subíndice 2 indica que N₂ contiene dos átomos de nitrógeno.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál propuesta conserva correctamente los átomos de nitrógeno e hidrógeno?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Propuesta 1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Propuesta 3.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguna.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Propuesta 2.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En la propuesta 2 hay 2 N y 6 H tanto en los reactivos como en los productos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: 'En la propuesta 2, ¿cuántos átomos de hidrógeno existen en el lado de los reactivos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '2.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '9.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: '3 H₂ representa tres unidades con dos hidrógenos cada una: 3 × 2 = 6.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué la propuesta 1 no está balanceada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque contiene demasiados átomos de nitrógeno en los reactivos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque hay 2 H en los reactivos y 6 H en los productos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque NH₃ no contiene nitrógeno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque N₂ debe tener siempre coeficiente 2.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La propuesta 1 conserva nitrógeno, pero no hidrógeno: hay 2 H a la izquierda y 6 H a la derecha.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Cuál afirmación describe mejor el significado de la ecuación balanceada N₂ + 3 H₂ → 2 NH₃?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Representa una proporción de 1 : 3 : 2 entre N₂, H₂ y NH₃ y conserva el número de átomos de cada elemento.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Indica que tres átomos individuales de hidrógeno reaccionan con un átomo de nitrógeno.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que los átomos de nitrógeno se convierten en átomos de hidrógeno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Significa que los subíndices pueden modificarse sin cambiar las sustancias.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los coeficientes indican la proporción representada y permiten comprobar que los átomos se conservan durante la reacción.',
        },
      ],
    },
  ],
};

export default reaccionesQuimicasEcuacionesQuimicas;
