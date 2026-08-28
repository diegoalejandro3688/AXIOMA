// CHEMISTRY-C2A -- Ciencias / U3 "Química", Recurso 7 (order 7 en U3).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R30 -- C B A D C A D B C A.
// Tablas editoriales (Situación A "Compuesto / Representación" y Situación B
// "Sustancia / Representación") como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preservan EXACTAMENTE los grupos funcionales y fórmulas: –OH, –CHO,
// C=O, –COOH, –NH₂, –COO–, CH₃–CH₂–OH, CH₃–CHO, CH₃–CO–CH₃, CH₃–COOH,
// CH₃–NH₂, CH₃–COO–CH₃, CH₃–CH₂–CH₃.
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
  { type: 'heading', level: 3, text: 'Identificación de cuatro compuestos' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó cuatro estructuras orgánicas simplificadas.' },
  { type: 'paragraph', text: '| Compuesto | Representación |' },
  { type: 'paragraph', text: '| P | CH₃–CH₂–OH |' },
  { type: 'paragraph', text: '| Q | CH₃–CHO |' },
  { type: 'paragraph', text: '| R | CH₃–CO–CH₃ |' },
  { type: 'paragraph', text: '| S | CH₃–COOH |' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Cambio de grupo funcional' },
  { type: 'paragraph', text: 'Un equipo comparó tres compuestos de estructura simplificada:' },
  { type: 'paragraph', text: '| Sustancia | Representación |' },
  { type: 'paragraph', text: '| X | CH₃–CH₂–CH₃ |' },
  { type: 'paragraph', text: '| Y | CH₃–CH₂–OH |' },
  { type: 'paragraph', text: '| Z | CH₃–COOH |' },
  {
    type: 'paragraph',
    text: 'Observaron que X estaba formado solo por carbono e hidrógeno, mientras Y y Z contenían oxígeno en grupos funcionales diferentes.',
  },
  {
    type: 'paragraph',
    text: 'Además, registraron que Y y Z presentaban mayor interacción con agua que X bajo las condiciones del ensayo.',
  },
];

const gruposFuncionalesPropiedadesCompuestosOrganicos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS',
  unitCode: 'CIENCIAS.QUIMICA',
  subjectKey: 'ciencias',
  order: 7,
  title: 'Grupos funcionales y propiedades de compuestos orgánicos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar grupos funcionales orgánicos sencillos en representaciones estructurales, relacionar su presencia con propiedades generales de los compuestos y comparar sustancias que poseen esqueletos carbonados similares pero diferentes grupos funcionales.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Grupos funcionales y propiedades de compuestos orgánicos' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un grupo funcional?' },
    {
      type: 'paragraph',
      text: 'Un grupo funcional es una parte específica de una molécula orgánica que influye de manera importante en sus propiedades y reactividad. Dos moléculas con esqueletos de carbono parecidos pueden comportarse de manera distinta si poseen grupos funcionales diferentes. Por eso, reconocerlos ayuda a clasificar compuestos orgánicos.',
    },

    { type: 'heading', level: 2, text: '2. Alcoholes' },
    {
      type: 'paragraph',
      text: 'Los alcoholes contienen el grupo: –OH unido a un átomo de carbono. Ejemplo: CH₃–CH₂–OH. La presencia del grupo –OH modifica propiedades como: polaridad; interacción con agua; temperatura de ebullición.',
    },

    { type: 'heading', level: 2, text: '3. Aldehídos' },
    {
      type: 'paragraph',
      text: 'Los aldehídos poseen un grupo carbonilo ubicado al extremo de una cadena. De forma simplificada puede representarse como: –CHO. Ejemplo: CH₃–CHO. El carbono del grupo carbonilo se encuentra unido a un hidrógeno.',
    },

    { type: 'heading', level: 2, text: '4. Cetonas' },
    {
      type: 'paragraph',
      text: 'Las cetonas también poseen un grupo carbonilo: C=O pero este se encuentra unido a dos carbonos dentro de la estructura. Ejemplo: CH₃–CO–CH₃. La posición del carbonilo permite distinguir una cetona de un aldehído sencillo.',
    },

    { type: 'heading', level: 2, text: '5. Ácidos carboxílicos' },
    {
      type: 'paragraph',
      text: 'Los ácidos carboxílicos contienen el grupo: –COOH. Este grupo combina una región carbonilo con un grupo –OH. Ejemplo: CH₃–COOH. Su presencia está relacionada con propiedades ácidas.',
    },

    { type: 'heading', level: 2, text: '6. Aminas' },
    {
      type: 'paragraph',
      text: 'Las aminas contienen nitrógeno unido a átomos de carbono y/o hidrógeno. Una representación sencilla es: –NH₂. Ejemplo: CH₃–NH₂. La presencia de nitrógeno modifica las propiedades del compuesto.',
    },

    { type: 'heading', level: 2, text: '7. Ésteres' },
    {
      type: 'paragraph',
      text: 'Los ésteres contienen una estructura característica que puede representarse de manera simplificada como: –COO–. Ejemplo: CH₃–COO–CH₃. Poseen un grupo carbonilo conectado a un oxígeno que, a su vez, se une a otro carbono.',
    },

    { type: 'heading', level: 2, text: '8. Grupo funcional y propiedades' },
    {
      type: 'paragraph',
      text: 'La estructura completa de una molécula influye en sus propiedades. Sin embargo, el grupo funcional puede producir diferencias importantes en: polaridad; solubilidad; temperatura de ebullición; acidez; reactividad. Por eso, pequeñas modificaciones estructurales pueden cambiar el comportamiento de una sustancia.',
    },

    { type: 'heading', level: 2, text: '9. Comparar estructuras' },
    {
      type: 'paragraph',
      text: 'Para comparar dos compuestos orgánicos conviene observar: número de carbonos; tipo de enlaces; grupo funcional; posición del grupo funcional. No basta con mirar únicamente la fórmula molecular. La conectividad sigue siendo fundamental.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre grupos funcionales: identifica los átomos distintos de C y H; localiza enlaces C=O si existen; busca grupos como –OH, –CHO, –COOH o –NH₂; distingue alcohol de ácido carboxílico; distingue aldehído de cetona según la posición del carbonilo; identifica la conectividad del oxígeno en un éster; relaciona estructura con propiedades sin generalizar más allá de la evidencia.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué grupo funcional presenta P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Cetona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ácido carboxílico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Alcohol.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Aldehído.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'P contiene un grupo –OH unido a una cadena carbonada, característico de un alcohol.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál compuesto corresponde a un aldehído?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Q presenta el grupo terminal –CHO, característico de los aldehídos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál compuesto corresponde a una cetona?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'S.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R posee un grupo carbonilo C=O ubicado entre dos carbonos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué grupo funcional caracteriza a S?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Alcohol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Éster.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Amina.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ácido carboxílico.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'S contiene el grupo –COOH, característico de los ácidos carboxílicos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Q y R contienen un grupo carbonilo. ¿Qué permite distinguirlos correctamente?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Q posee más carbonos que R necesariamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R no contiene oxígeno.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En Q el carbonilo está asociado a un extremo con hidrógeno, mientras en R está conectado a dos carbonos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Q es siempre un ácido y R siempre un alcohol.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ubicación y conectividad del grupo carbonilo permiten distinguir aldehídos de cetonas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál sustancia corresponde a un hidrocarburo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'X.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Y.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Z.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Y y Z.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'X contiene únicamente carbono e hidrógeno.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál grupo funcional presenta Y?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Amina.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cetona.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Éster.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Alcohol.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Y contiene el grupo –OH unido a una cadena carbonada.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál diferencia estructural principal existe entre Y y Z?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Y no contiene carbono.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Y contiene un grupo alcohol, mientras Z contiene un grupo ácido carboxílico.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Z no contiene oxígeno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos presentan exactamente el mismo grupo funcional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Y posee –OH, mientras Z posee –COOH.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por la observación experimental?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todo compuesto con oxígeno se disuelve completamente en agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los hidrocarburos siempre reaccionan químicamente con agua.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La presencia y el tipo de grupo funcional pueden influir en la interacción de una molécula con el agua.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de carbonos no influye nunca en ninguna propiedad.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las diferencias observadas son consistentes con que los grupos funcionales modifiquen propiedades como la polaridad y la interacción con agua.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “Si dos moléculas tienen el mismo número de carbonos, deben tener propiedades prácticamente iguales”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: diferentes grupos funcionales pueden producir propiedades muy distintas incluso con esqueletos carbonados similares.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque solo importa el número de carbonos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta siempre que ambas contengan oxígeno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque el número de carbonos nunca influye en una molécula.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El grupo funcional puede cambiar de manera importante la polaridad, reactividad y otras propiedades de un compuesto.',
        },
      ],
    },
  ],
};

export default gruposFuncionalesPropiedadesCompuestosOrganicos;
