// CHEMISTRY-C1A -- Ciencias / U3 "Química", Recurso 5 (order 5 en U3).
// Cierra el bloque CHEMISTRY-C1A (Química R24-R28).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R28 -- B A D C B C A D B C.
// Tabla editorial de la Situación A ("Representación / Estructura") como filas
// de párrafo con "|" -- FORMAT_ONLY. Se preservan EXACTAMENTE los símbolos
// Unicode: enlace simple "–" (U+2013), doble "=", triple "≡" (U+2261),
// subíndices ₂ ₃ ₄ ₆ y "₁₀"; y las fórmulas C₂H₆, CH₃–CH₃, CH₂=CH₂,
// HC≡CH, CH₃–CH₂–CH₃, C₄H₁₀, C–C, C=C, C≡C, C–C–C–C.
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
  { type: 'heading', level: 3, text: 'Comparación de cuatro representaciones' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó cuatro representaciones simplificadas.' },
  { type: 'paragraph', text: '| Representación | Estructura |' },
  { type: 'paragraph', text: '| P | CH₃–CH₃ |' },
  { type: 'paragraph', text: '| Q | CH₂=CH₂ |' },
  { type: 'paragraph', text: '| R | HC≡CH |' },
  { type: 'paragraph', text: '| S | CH₃–CH₂–CH₃ |' },
  { type: 'paragraph', text: 'Los estudiantes compararon el número de carbonos y el tipo de enlace entre ellos.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Dos modelos con la misma fórmula molecular' },
  {
    type: 'paragraph',
    text: 'Un equipo construyó dos modelos utilizando cuatro átomos de carbono y diez átomos de hidrógeno en cada caso.',
  },
  { type: 'paragraph', text: 'En el modelo A, los cuatro carbonos estaban organizados en una cadena continua:' },
  { type: 'paragraph', text: 'C–C–C–C' },
  { type: 'paragraph', text: 'En el modelo B, tres carbonos formaban una secuencia principal y el cuarto estaba unido al carbono central.' },
  { type: 'paragraph', text: 'Los estudiantes comprobaron que ambos modelos podían representarse mediante la fórmula molecular:' },
  { type: 'paragraph', text: 'C₄H₁₀' },
];

const carbonoEnlacesRepresentacionMoleculasOrganicas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 5,
  title: 'El carbono, enlaces y representación de moléculas orgánicas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la capacidad del carbono para formar estructuras moleculares diversas, distinguir enlaces covalentes simples, dobles y triples, e interpretar fórmulas moleculares y representaciones estructurales sencillas de compuestos orgánicos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'El carbono, enlaces y representación de moléculas orgánicas' },

    { type: 'heading', level: 2, text: '1. El carbono en los compuestos orgánicos' },
    {
      type: 'paragraph',
      text: 'El carbono es un elemento fundamental en una gran diversidad de compuestos orgánicos. Puede unirse con elementos como: carbono; hidrógeno; oxígeno; nitrógeno; halógenos. La diversidad de compuestos de carbono se relaciona con su capacidad para establecer varios enlaces covalentes.',
    },

    { type: 'heading', level: 2, text: '2. Capacidad de enlace del carbono' },
    {
      type: 'paragraph',
      text: 'En muchos compuestos orgánicos, un átomo de carbono forma un total de cuatro enlaces covalentes. Estos enlaces pueden distribuirse de distintas maneras. Por ejemplo, un carbono puede presentar: cuatro enlaces simples; un enlace doble y dos simples; un enlace triple y un enlace simple. Al analizar una estructura, debe considerarse el total de enlaces alrededor de cada carbono.',
    },

    { type: 'heading', level: 2, text: '3. Enlace covalente' },
    {
      type: 'paragraph',
      text: 'Un enlace covalente se forma cuando dos átomos comparten electrones. En las representaciones estructurales se puede indicar mediante líneas. De manera simplificada: una línea representa un enlace simple; dos líneas representan un enlace doble; tres líneas representan un enlace triple.',
    },

    { type: 'heading', level: 2, text: '4. Enlaces simples' },
    {
      type: 'paragraph',
      text: 'Un enlace simple puede representarse como: C–C. Los compuestos que contienen cadenas de carbono pueden presentar varios enlaces simples consecutivos. Por ejemplo: C–C–C representa una cadena de tres átomos de carbono unidos mediante enlaces simples.',
    },

    { type: 'heading', level: 2, text: '5. Enlaces dobles y triples' },
    {
      type: 'paragraph',
      text: 'Un enlace doble se representa como: C=C. Un enlace triple se representa como: C≡C. La presencia de estos enlaces modifica la cantidad de otros enlaces que puede formar cada carbono dentro de la estructura.',
    },

    { type: 'heading', level: 2, text: '6. Cadenas de carbono' },
    {
      type: 'paragraph',
      text: 'Los átomos de carbono pueden enlazarse entre sí formando: cadenas lineales; cadenas ramificadas; estructuras cíclicas. Por ello, una misma cantidad de átomos de carbono puede organizarse de diferentes maneras.',
    },

    { type: 'heading', level: 2, text: '7. Fórmula molecular' },
    {
      type: 'paragraph',
      text: 'Una fórmula molecular indica cuántos átomos de cada elemento contiene una molécula. Por ejemplo: C₂H₆ indica: 2 átomos de carbono; 6 átomos de hidrógeno. La fórmula molecular no muestra directamente cómo están conectados los átomos.',
    },

    { type: 'heading', level: 2, text: '8. Fórmula estructural' },
    {
      type: 'paragraph',
      text: 'Una fórmula estructural entrega información sobre cómo se conectan los átomos. Por ejemplo, una representación condensada como: CH₃–CH₃ permite observar que existen dos carbonos unidos entre sí y que cada uno está asociado a tres hidrógenos. La representación estructural aporta información que no aparece explícitamente en la fórmula molecular.',
    },

    { type: 'heading', level: 2, text: '9. Diferentes representaciones' },
    {
      type: 'paragraph',
      text: 'Una misma molécula puede representarse mediante distintos modelos. Entre ellos: fórmula molecular; fórmula estructural desarrollada; fórmula estructural condensada; modelos tridimensionales. Cada representación destaca información diferente. No debe asumirse que dos dibujos distintos representan sustancias distintas sin analizar su conectividad.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre estructuras orgánicas: cuenta los átomos de carbono; identifica enlaces simples, dobles o triples; verifica el número total de enlaces de cada carbono; interpreta los subíndices de la fórmula molecular; distingue fórmula molecular de estructura; compara la conectividad entre átomos; evita clasificar únicamente por la apariencia del dibujo.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál representación contiene un enlace doble entre carbonos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En Q aparece la representación C=C, correspondiente a un enlace doble entre los carbonos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál representación contiene tres átomos de carbono?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'S corresponde a CH₃–CH₂–CH₃ y contiene tres átomos de carbono.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tipo de enlace une a los dos carbonos en R?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Simple.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Doble.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Iónico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Triple.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El símbolo ≡ representa un enlace covalente triple.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la fórmula molecular correspondiente a P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'C₂H₂.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'C₂H₄.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'C₂H₆.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'C₃H₈.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'CH₃–CH₃ contiene dos carbonos y seis hidrógenos, por lo que su fórmula molecular es C₂H₆.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Por qué Q posee menos átomos de hidrógeno que P aunque ambas estructuras contienen dos carbonos?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque Q contiene menos átomos en total debido a una reacción nuclear.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque el enlace doble entre los carbonos utiliza una mayor capacidad de enlace entre ellos, dejando menos enlaces disponibles para hidrógenos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque los enlaces dobles eliminan átomos de carbono.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el hidrógeno no puede unirse a carbonos con enlaces dobles.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En Q cada carbono participa en un enlace doble C=C, por lo que necesita menos enlaces adicionales con hidrógeno que en P, donde existe un enlace simple C–C.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué información entrega directamente la fórmula C₄H₁₀?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La posición exacta de cada átomo en el espacio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La longitud de todos los enlaces.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de átomos de carbono e hidrógeno en la molécula.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La forma exacta de la cadena.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fórmula molecular indica que existen cuatro átomos de carbono y diez átomos de hidrógeno.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué diferencia existe entre los modelos A y B?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La conectividad de los átomos de carbono.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El número total de átomos de carbono.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número total de hidrógenos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fórmula molecular.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Ambos contienen la misma cantidad de cada tipo de átomo, pero los carbonos se conectan de manera diferente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión puede obtenerse al comparar ambos modelos?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Toda fórmula molecular corresponde a una única disposición posible de los átomos.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una molécula ramificada debe contener más átomos que una lineal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dos estructuras distintas nunca pueden compartir fórmula molecular.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una misma fórmula molecular puede corresponder a diferentes conectividades entre los átomos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los dos modelos poseen C₄H₁₀, pero presentan distinta organización de sus átomos de carbono.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Por qué una fórmula estructural permite distinguir mejor los modelos A y B que la fórmula molecular?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque cambia el número de protones de los átomos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque muestra cómo están conectados los átomos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque elimina los átomos de hidrógeno de la sustancia real.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque solo puede utilizarse para moléculas lineales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fórmula estructural representa la conectividad, mientras la fórmula molecular solo entrega la cantidad de átomos de cada elemento.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “Como A y B tienen fórmula C₄H₁₀, necesariamente representan exactamente la misma estructura molecular”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Es correcta porque una fórmula molecular determina siempre una única conectividad.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque todas las moléculas con carbono deben ser lineales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: una misma fórmula molecular puede corresponder a estructuras con distinta conectividad, por lo que se necesita información estructural adicional.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta porque dos estructuras diferentes nunca pueden tener igual cantidad de átomos.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fórmula molecular no especifica cómo se conectan los átomos, por lo que distintas estructuras pueden compartir la misma composición molecular.',
        },
      ],
    },
  ],
};

export default carbonoEnlacesRepresentacionMoleculasOrganicas;
