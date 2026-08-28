// CONTENT-C2A -- Ciencias / U1 "Biología", Recurso 5 (order 5 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R5 -- A C B D A B D C A C.
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
  { type: 'heading', level: 3, text: 'Situación A — Del ADN a una proteína' },
  { type: 'paragraph', text: 'Un grupo de estudiantes estudió la expresión de un gen en células cultivadas.' },
  { type: 'paragraph', text: 'Observaron que, al activarse el gen, aumentaba primero la cantidad de una molécula de ARN específica.' },
  { type: 'paragraph', text: 'Poco después aumentaba también la cantidad de una determinada proteína.' },
  {
    type: 'paragraph',
    text: 'Cuando utilizaron una sustancia que impedía la producción del ARN, la cantidad de la proteína dejó de aumentar.',
  },
  { type: 'paragraph', text: 'En cambio, al permitir nuevamente la producción de ARN, la síntesis de la proteína se recuperó.' },
  {
    type: 'paragraph',
    text: 'Los estudiantes propusieron que el ARN actuaba como una etapa intermedia entre la información presente en el ADN y la producción de la proteína.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — Una mutación y sus posibles consecuencias' },
  { type: 'paragraph', text: 'Una investigadora comparó dos versiones de un mismo gen.' },
  { type: 'paragraph', text: 'La versión original producía una proteína de 250 aminoácidos.' },
  { type: 'paragraph', text: 'En una segunda versión encontró un cambio en un nucleótido del ADN.' },
  {
    type: 'paragraph',
    text: 'Al analizar el ARN producido a partir del gen modificado, comprobó que también presentaba un cambio correspondiente en su secuencia.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, la proteína final continuaba teniendo 250 aminoácidos y conservaba su función en las condiciones estudiadas.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora concluyó que no todos los cambios en el ADN producen necesariamente una alteración observable en la función de una proteína.',
  },
];

const adnGenesSintesisProteinas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 5,
  title: 'ADN, genes y síntesis de proteínas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo se organiza y utiliza la información genética, relacionando ADN, genes y cromosomas con los procesos de replicación, transcripción y traducción, y analizando cómo cambios en la secuencia del ADN pueden modificar la información disponible para la síntesis de proteínas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'ADN, genes y síntesis de proteínas' },

    { type: 'heading', level: 2, text: '1. ADN e información genética' },
    {
      type: 'paragraph',
      text: 'El ADN es una molécula que almacena información genética. En células eucariontes, la mayor parte del ADN se encuentra en el núcleo. Esta información participa en procesos relacionados con: estructura celular, metabolismo, desarrollo, funcionamiento y reproducción. El ADN no “realiza” directamente todas las funciones de la célula, pero contiene instrucciones que pueden ser utilizadas para producir moléculas importantes.',
    },

    { type: 'heading', level: 2, text: '2. Genes' },
    {
      type: 'paragraph',
      text: 'Un gen corresponde a una región del ADN que contiene información utilizada para generar un producto funcional. En muchos casos, ese producto está relacionado con la síntesis de una proteína. Los genes: ocupan posiciones determinadas en los cromosomas; poseen secuencias específicas; pueden presentar variantes; pueden expresarse de manera diferente según el tipo celular y las condiciones.',
    },

    { type: 'heading', level: 2, text: '3. Cromosomas' },
    {
      type: 'paragraph',
      text: 'El ADN se organiza asociado a proteínas formando cromosomas. Un cromosoma contiene muchos genes. Por eso: gen y cromosoma no son sinónimos; un cromosoma contiene múltiples regiones de ADN; diferentes genes pueden ubicarse en un mismo cromosoma. La organización del ADN facilita su almacenamiento y distribución.',
    },

    { type: 'heading', level: 2, text: '4. Replicación del ADN' },
    {
      type: 'paragraph',
      text: 'Antes de una división celular, el ADN debe duplicarse. La replicación permite producir nuevas moléculas de ADN a partir de moléculas preexistentes. El objetivo general es que, después de una división, las células resultantes puedan recibir información genética. La replicación copia ADN. No produce directamente proteínas.',
    },

    { type: 'heading', level: 2, text: '5. Expresión de la información genética' },
    {
      type: 'paragraph',
      text: 'La información contenida en un gen puede ser utilizada por la célula. De forma general, este proceso incluye: ADN → ARN → proteína. Esta secuencia resume el flujo de información en muchos procesos celulares. No significa que todo el ADN se exprese permanentemente ni que todas las células produzcan las mismas proteínas.',
    },

    { type: 'heading', level: 2, text: '6. Transcripción' },
    {
      type: 'paragraph',
      text: 'Durante la transcripción, la información de una región del ADN se utiliza para producir una molécula de ARN. El ARN contiene una secuencia relacionada con la información del gen transcrito. La transcripción permite que información almacenada en el ADN pueda ser utilizada posteriormente en otros procesos celulares.',
    },

    { type: 'heading', level: 2, text: '7. Código genético' },
    {
      type: 'paragraph',
      text: 'La información del ARN puede organizarse en grupos de nucleótidos llamados codones. Cada codón puede asociarse con un aminoácido o con señales relacionadas con el proceso de síntesis. El código genético permite convertir información basada en nucleótidos en una secuencia de aminoácidos.',
    },

    { type: 'heading', level: 2, text: '8. Traducción' },
    {
      type: 'paragraph',
      text: 'Durante la traducción, los ribosomas utilizan la información presente en el ARN mensajero. A partir de ella se organiza una secuencia de aminoácidos. Los aminoácidos pueden formar una proteína. Por eso, la traducción convierte información genética previamente transcrita en una secuencia molecular con potencial función biológica.',
    },

    { type: 'heading', level: 2, text: '9. Gen, proteína y característica' },
    {
      type: 'paragraph',
      text: 'Una proteína puede participar en procesos que influyen sobre determinadas características. Sin embargo, la relación gen → proteína → característica no siempre es simple. Muchas características dependen de: varios genes, regulación genética, ambiente e interacción entre diferentes moléculas. Por eso, no debe asumirse que cada característica corresponde necesariamente a un único gen.',
    },

    { type: 'heading', level: 2, text: '10. Mutaciones' },
    {
      type: 'paragraph',
      text: 'Una mutación corresponde a un cambio en la secuencia del ADN. Sus consecuencias pueden variar. Una mutación puede: no modificar el producto final; cambiar un aminoácido; alterar de manera importante una proteína; afectar regiones que regulan la expresión; no producir un efecto observable. El efecto depende del tipo y ubicación del cambio.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué molécula almacenaba inicialmente la información del gen?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'ADN.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Proteína.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Lípido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Glucosa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los genes corresponden a regiones del ADN que contienen información genética.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué proceso produce una molécula de ARN utilizando información del ADN?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Traducción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Replicación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transcripción.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Meiosis.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La transcripción utiliza una región del ADN como base para producir una molécula de ARN.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué evidencia apoya mejor la idea de que el ARN participa como etapa intermedia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La proteína existe antes que el ADN.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Al bloquear la producción de ARN dejó de aumentar la cantidad de proteína.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El ADN desapareció durante el experimento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La proteína produjo directamente nuevas moléculas de ADN.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si impedir la formación de ARN afecta posteriormente la producción de proteína, los datos apoyan una relación funcional entre ambas etapas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál secuencia representa mejor el proceso estudiado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Proteína → ADN → ARN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'ARN → proteína → ADN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'ADN → proteína → ARN.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'ADN → ARN → proteína.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La información genética puede transcribirse desde ADN a ARN y luego utilizarse en la síntesis de una proteína.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué resultado adicional fortalecería más la explicación de los estudiantes?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Mostrar que, al impedir específicamente la traducción sin detener la producción de ARN, el ARN continúa presente pero la proteína deja de producirse.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Observar únicamente el tamaño de las células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todas las proteínas poseen la misma secuencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar el ADN y concluir que la expresión aumenta.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Separar experimentalmente transcripción y traducción permitiría mostrar que la presencia de ARN no basta si la etapa de síntesis proteica está bloqueada.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué tipo de cambio se observó inicialmente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Desaparición completa del cromosoma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cambio en un nucleótido del ADN.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Eliminación de todos los genes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Duplicación de toda la célula.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La situación describe una modificación puntual en la secuencia del ADN.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué el cambio observado en el ARN era esperable?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque las proteínas copian directamente el ADN.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el ARN siempre posee una secuencia idéntica a todas las proteínas.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque las mutaciones solo afectan ribosomas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque el ARN se produce utilizando información contenida en el ADN.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un cambio en la secuencia del ADN puede reflejarse en el ARN generado durante la transcripción.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por el hecho de que la proteína conservara su función?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Toda mutación destruye necesariamente una proteína.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los genes no contienen información.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un cambio en el ADN puede no producir un cambio funcional observable en la proteína.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El ARN no participa en la expresión genética.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las consecuencias de una mutación dependen de cómo afecte la información utilizada para producir o regular una proteína.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué información adicional sería más útil para evaluar si la mutación modificó la estructura primaria de la proteína?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Comparar la secuencia de aminoácidos de ambas proteínas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Medir únicamente el tamaño de la célula.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Contar la cantidad total de cromosomas de otra especie.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Observar el color del medio de cultivo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La estructura primaria corresponde a la secuencia de aminoácidos, por lo que compararla permitiría determinar si el cambio genético alteró esa secuencia.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál interpretación es científicamente más adecuada?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Si una mutación no cambia el número de aminoácidos, nunca puede afectar una proteína.',
          },
          correct: false,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Toda mutación genera obligatoriamente una nueva característica visible.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El efecto de una mutación depende de su ubicación y de cómo modifica la información genética o su expresión.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las mutaciones solo pueden ocurrir durante la meiosis.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una mutación puede tener efectos distintos según dónde ocurra y cómo influya sobre la secuencia, regulación o función del producto génico.',
        },
      ],
    },
  ],
};

export default adnGenesSintesisProteinas;
