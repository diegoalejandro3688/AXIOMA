// CONTENT-C2A -- Ciencias / U1 "Biología", Recurso 8 (order 8 en U1).
// Cierra el bloque C2A (Ciencias U1 Biología R5-R8).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R8 -- D A C B D B C A D B.
// Tabla del cuadro de Punnett (Situación A) representada como filas de párrafo
// con "|" -- FORMAT_ONLY. Se preservan EXACTAMENTE los caracteres Unicode
// Xᴺ / Xⁿ y el símbolo × ("Pp × Pp").
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
  { type: 'heading', level: 3, text: 'Situación A — Un cruce con dos individuos heterocigotos' },
  {
    type: 'paragraph',
    text: 'En una especie vegetal, el color púrpura de las flores depende de un alelo P que es dominante sobre un alelo p asociado con flores blancas.',
  },
  { type: 'paragraph', text: 'Dos plantas heterocigotas fueron cruzadas:' },
  { type: 'paragraph', text: 'Pp × Pp' },
  { type: 'paragraph', text: 'Los estudiantes representaron las combinaciones posibles de los gametos:' },
  { type: 'paragraph', text: '|  | P | p |' },
  { type: 'paragraph', text: '| P | PP | Pp |' },
  { type: 'paragraph', text: '| p | Pp | pp |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — Un patrón ligado al cromosoma X' },
  { type: 'paragraph', text: 'Una condición genética recesiva depende de un alelo ubicado en el cromosoma X.' },
  { type: 'paragraph', text: 'Una mujer posee dos cromosomas X y es heterocigota para el gen:' },
  { type: 'paragraph', text: 'XᴺXⁿ' },
  { type: 'paragraph', text: 'Un hombre posee:' },
  { type: 'paragraph', text: 'XᴺY' },
  { type: 'paragraph', text: 'El alelo Xᴺ se asocia con el fenotipo no afectado y Xⁿ con la condición recesiva.' },
  {
    type: 'paragraph',
    text: 'Los investigadores analizaron los posibles gametos producidos por ambos progenitores y las combinaciones cromosómicas de su descendencia.',
  },
];

const herenciaGeneticaPatronesTransmision: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 8,
  title: 'Herencia genética y patrones de transmisión',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar principios básicos de herencia genética, diferenciando gen, alelo, genotipo y fenotipo, aplicando relaciones de dominancia y segregación a cruces simples, e interpretando probabilidades y patrones de transmisión, incluida la herencia ligada al sexo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Herencia genética y patrones de transmisión' },

    { type: 'heading', level: 2, text: '1. Genes y alelos' },
    {
      type: 'paragraph',
      text: 'Un gen es una región del ADN asociada con determinada información genética. Un mismo gen puede presentar distintas variantes llamadas alelos. Por ejemplo, para un gen pueden existir: alelo A; alelo a. Los alelos ocupan posiciones equivalentes en cromosomas homólogos.',
    },

    { type: 'heading', level: 2, text: '2. Genotipo' },
    {
      type: 'paragraph',
      text: 'El genotipo corresponde a la combinación de alelos que posee un individuo para uno o más genes. Para un gen con dos alelos A y a pueden existir combinaciones como: AA; Aa; aa. Estas combinaciones no necesariamente producen tres fenotipos distintos.',
    },

    { type: 'heading', level: 2, text: '3. Fenotipo' },
    {
      type: 'paragraph',
      text: 'El fenotipo corresponde a características observables o medibles resultantes de la expresión genética y, en muchos casos, de su interacción con el ambiente. Por eso: genotipo y fenotipo no son sinónimos; individuos con genotipos distintos pueden compartir un fenotipo; una característica puede depender de más de un gen o del ambiente.',
    },

    { type: 'heading', level: 2, text: '4. Dominancia y recesividad' },
    {
      type: 'paragraph',
      text: 'En un modelo mendeliano simple, un alelo puede ser dominante sobre otro. Si A es dominante sobre a: AA expresa el fenotipo dominante; Aa también expresa el fenotipo dominante; aa expresa el fenotipo recesivo. Dominante no significa “más común”, “mejor” ni “más fuerte”.',
    },

    { type: 'heading', level: 2, text: '5. Homocigosis y heterocigosis' },
    {
      type: 'paragraph',
      text: 'Un individuo es: homocigoto cuando posee dos alelos iguales: AA; aa. heterocigoto cuando posee dos alelos diferentes: Aa. Esta distinción permite predecir qué alelos pueden transmitirse a los gametos.',
    },

    { type: 'heading', level: 2, text: '6. Segregación de alelos' },
    {
      type: 'paragraph',
      text: 'Durante la meiosis, los alelos de un gen pueden separarse hacia gametos diferentes. Un individuo Aa puede producir gametos que contienen: A; a. En un modelo simple, ambos tipos pueden presentarse con probabilidades equivalentes.',
    },

    { type: 'heading', level: 2, text: '7. Cruces genéticos' },
    {
      type: 'paragraph',
      text: 'Un cruce permite representar combinaciones posibles entre gametos de dos progenitores. Por ejemplo: Aa × Aa puede generar: AA; Aa; Aa; aa. Esto representa probabilidades, no una secuencia obligatoria de descendientes.',
    },

    { type: 'heading', level: 2, text: '8. Probabilidad' },
    {
      type: 'paragraph',
      text: 'Si un cruce entrega una probabilidad de 25% para un genotipo, no significa que exactamente uno de cada cuatro hijos deba presentar ese resultado. Cada evento reproductivo tiene su propia probabilidad. En grupos grandes, las proporciones observadas pueden aproximarse a las esperadas, pero en grupos pequeños pueden existir diferencias por azar.',
    },

    { type: 'heading', level: 2, text: '9. Herencia ligada al sexo' },
    {
      type: 'paragraph',
      text: 'Algunos genes se encuentran en cromosomas sexuales. En humanos, ciertos genes localizados en el cromosoma X pueden presentar patrones particulares de transmisión. Cuando un individuo posee una sola copia de ese cromosoma para determinada región, un alelo recesivo puede expresarse sin que exista una segunda copia dominante que lo enmascare. El análisis debe considerar qué cromosoma recibe cada descendiente de cada progenitor.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de herencia: identifica el rasgo y los alelos; determina la relación de dominancia si está indicada; establece los genotipos posibles; identifica qué gametos puede producir cada progenitor; combina probabilidades; separa genotipo de fenotipo; recuerda que una probabilidad no garantiza un resultado individual.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué genotipo corresponde a una planta heterocigota?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'PP.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'pp.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Pp.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Un individuo heterocigoto posee dos alelos diferentes para el gen, en este caso Pp.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué genotipo produce el fenotipo blanco?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'pp.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'PP.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Pp.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'PP o Pp.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Como el alelo p es recesivo, el fenotipo blanco se expresa cuando el individuo posee dos copias p.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la probabilidad esperada de obtener una planta con genotipo PP?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '50%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '75%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '25%.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '100%.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'De las cuatro combinaciones equiprobables del cruce, una corresponde a PP.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la probabilidad esperada de obtener flores púrpuras?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '25%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '75%.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '50%.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '100%.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'PP, Pp y Pp expresan el fenotipo dominante, por lo que tres de cuatro combinaciones esperadas producen flores púrpuras.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Una pareja de plantas Pp produce solo cuatro descendientes y todos tienen flores púrpuras. ¿Cuál interpretación es más adecuada?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El modelo genético necesariamente era incorrecto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El genotipo pp dejó de existir en la especie.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Cada descendiente debía presentar exactamente uno de los cuatro genotipos del cuadro.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El resultado es posible porque las proporciones esperadas representan probabilidades y una muestra pequeña puede diferir de ellas por azar.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las probabilidades describen resultados esperados a lo largo de muchos eventos, pero una cantidad pequeña de descendientes puede presentar proporciones diferentes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué gametos puede producir la mujer para estos cromosomas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo Xᴺ.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Xᴺ o Xⁿ.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Xᴺ o Y.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo Xⁿ.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la formación de gametos, cada uno recibe uno de los dos cromosomas X de la mujer.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué cromosoma sexual recibe necesariamente del padre un descendiente con dos cromosomas X?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Y.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Xⁿ obligatoriamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Xᴺ.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ningún cromosoma sexual.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El padre posee XᴺY, por lo que un descendiente que recibe un cromosoma X paterno recibe Xᴺ.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Cuál combinación sería compatible con un descendiente que posee un cromosoma X y un cromosoma Y y expresa la condición recesiva?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'XⁿY.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'XᴺY.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'XᴺXⁿ.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'XᴺXᴺ.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un individuo con XⁿY posee una sola copia del gen ligado al X y el alelo recesivo puede expresarse.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué un alelo recesivo ligado al X puede expresarse con una sola copia en un individuo XY?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el cromosoma Y siempre contiene un alelo dominante equivalente.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los genes del X son dominantes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la meiosis duplica el alelo recesivo.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque para ese gen no existe una segunda copia correspondiente en el cromosoma Y que pueda enmascararlo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En determinados genes ligados al X, un individuo XY posee una sola copia de ese gen, por lo que un alelo recesivo puede expresarse directamente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál conclusión integra mejor ambos ejemplos de herencia?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La dominancia permite determinar siempre el genotipo exacto observando solo el fenotipo dominante.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los patrones de transmisión dependen de cómo se segregan los alelos y cromosomas durante la formación de gametos, y sus resultados deben interpretarse probabilísticamente.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cada cruce produce obligatoriamente las proporciones teóricas exactas en cualquier número de descendientes.',
          },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Los genes ligados al sexo no siguen ningún principio de segregación.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Tanto los cruces autosómicos simples como la herencia ligada al sexo dependen de la segregación durante la formación de gametos y generan probabilidades, no resultados individuales garantizados.',
        },
      ],
    },
  ],
};

export default herenciaGeneticaPatronesTransmision;
