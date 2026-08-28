// CONTENT-C1A -- Ciencias / U1 "Biología", Recurso 3 (order 3 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R3 -- D B A C D A C B D A.
// Tabla cuantitativa editorial de la Situación A representada como filas de
// párrafo con "|" (schema sin tipo `table`) -- FORMAT_ONLY, se conservan
// exactamente valores, unidades (g) y decimales (10,0 / 11,4 / 10,0 / 8,7).
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
  { type: 'heading', level: 3, text: 'Situación A — Cambios de masa en tres soluciones' },
  {
    type: 'paragraph',
    text: 'Un grupo de estudiantes cortó tres fragmentos de tejido vegetal de igual masa inicial y los colocó durante una hora en soluciones diferentes.',
  },
  { type: 'paragraph', text: 'Después midieron nuevamente su masa.' },
  { type: 'paragraph', text: '| Fragmento | Masa inicial | Masa final |' },
  { type: 'paragraph', text: '| A | 10,0 g | 11,4 g |' },
  { type: 'paragraph', text: '| B | 10,0 g | 10,0 g |' },
  { type: 'paragraph', text: '| C | 10,0 g | 8,7 g |' },
  {
    type: 'paragraph',
    text: 'Los estudiantes asumieron que los principales cambios de masa se debían al movimiento de agua entre las células y las soluciones.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — Dos sustancias atravesaban la membrana de manera diferente' },
  { type: 'paragraph', text: 'Una investigadora estudió el movimiento de dos sustancias, X e Y, hacia el interior de una célula.' },
  { type: 'paragraph', text: 'Para ambas sustancias, la concentración inicial era mayor fuera que dentro de la célula.' },
  { type: 'paragraph', text: 'La sustancia X ingresó incluso cuando se bloqueó temporalmente la producción de energía celular.' },
  {
    type: 'paragraph',
    text: 'La sustancia Y también ingresó siguiendo su gradiente, pero dejó de hacerlo cuando se bloqueó una proteína específica de la membrana.',
  },
  {
    type: 'paragraph',
    text: 'En un segundo experimento, la célula logró acumular Y en una concentración interna superior a la externa, pero este proceso se detuvo al disminuir fuertemente la disponibilidad de energía celular.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora concluyó que una misma sustancia podía involucrar mecanismos de transporte diferentes según las condiciones.',
  },
];

const membranaTransporteCelular: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 3,
  title: 'Membrana plasmática y transporte celular',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar el papel de la membrana plasmática como barrera selectiva, diferenciando transporte pasivo y activo, difusión y ósmosis, y analizando cómo los gradientes de concentración influyen en el movimiento de sustancias y agua a través de las membranas celulares.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Membrana plasmática y transporte celular' },

    { type: 'heading', level: 2, text: '1. Membrana plasmática' },
    {
      type: 'paragraph',
      text: 'La membrana plasmática delimita la célula y separa su interior del ambiente. No funciona como una barrera completamente cerrada. Presenta permeabilidad selectiva, lo que significa que permite el paso de algunas sustancias con mayor facilidad que otras. Esto ayuda a mantener condiciones internas compatibles con el funcionamiento celular.',
    },

    { type: 'heading', level: 2, text: '2. Gradiente de concentración' },
    {
      type: 'paragraph',
      text: 'Un gradiente de concentración existe cuando una sustancia se encuentra en distinta concentración entre dos regiones. Las partículas presentan movimiento constante. Cuando existe un gradiente, puede producirse un movimiento neto desde una zona de mayor concentración hacia otra de menor concentración.',
    },

    { type: 'heading', level: 2, text: '3. Difusión' },
    {
      type: 'paragraph',
      text: 'La difusión es un proceso pasivo. En términos generales, una sustancia se desplaza siguiendo su gradiente de concentración. No requiere que la célula utilice directamente energía para impulsar ese movimiento. La difusión continúa hasta aproximarse a una distribución más equilibrada.',
    },

    { type: 'heading', level: 2, text: '4. Difusión facilitada' },
    {
      type: 'paragraph',
      text: 'Algunas sustancias no atraviesan fácilmente la membrana por sí solas. Pueden desplazarse mediante proteínas de membrana. Cuando ese movimiento ocurre siguiendo el gradiente de concentración y sin gasto directo de energía celular, se denomina difusión facilitada. Sigue siendo transporte pasivo.',
    },

    { type: 'heading', level: 2, text: '5. Ósmosis' },
    {
      type: 'paragraph',
      text: 'La ósmosis corresponde al movimiento de agua a través de una membrana selectivamente permeable. El agua se redistribuye de acuerdo con las diferencias en concentración de solutos entre ambos lados de la membrana. Por eso, una célula puede ganar o perder agua según el medio en que se encuentre.',
    },

    { type: 'heading', level: 2, text: '6. Medio hipotónico' },
    {
      type: 'paragraph',
      text: 'En un medio hipotónico, la concentración de solutos fuera de la célula es menor que en su interior. Como resultado, existe una tendencia neta al ingreso de agua. En una célula animal, un ingreso excesivo de agua puede aumentar considerablemente su volumen. En células vegetales, la pared celular contribuye a resistir ese aumento.',
    },

    { type: 'heading', level: 2, text: '7. Medio hipertónico' },
    {
      type: 'paragraph',
      text: 'En un medio hipertónico, la concentración de solutos fuera de la célula es mayor que en su interior. Existe una tendencia neta a que el agua salga de la célula. Esto puede reducir su volumen. En células vegetales, la pérdida de agua también altera la presión interna.',
    },

    { type: 'heading', level: 2, text: '8. Medio isotónico' },
    {
      type: 'paragraph',
      text: 'En un medio isotónico, las concentraciones efectivas a ambos lados permiten que no exista un movimiento neto importante de agua. El agua continúa moviéndose en ambas direcciones, pero los flujos se compensan aproximadamente. Equilibrio no significa ausencia de movimiento molecular.',
    },

    { type: 'heading', level: 2, text: '9. Transporte activo' },
    {
      type: 'paragraph',
      text: 'Algunas sustancias deben desplazarse en sentido contrario a su gradiente. Ese proceso requiere energía y proteínas de membrana específicas. El transporte activo permite mantener diferencias de concentración importantes para el funcionamiento celular.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante un problema de transporte celular: identifica la sustancia que se mueve; compara concentraciones; determina la dirección del gradiente; distingue soluto de agua; identifica si existe gasto energético; predice cambios en volumen celular; utiliza los datos entregados antes de asumir el resultado.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué fragmento presentó una ganancia neta de agua?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo B.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo C.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'B y C.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El fragmento A aumentó su masa, lo que es compatible con un ingreso neto de agua hacia sus células.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál fragmento probablemente estuvo en una condición cercana a isotónica?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'B.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'C.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguno.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La masa del fragmento B no presentó un cambio neto, lo que es compatible con flujos de agua aproximadamente equilibrados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué interpretación explica mejor la disminución de masa del fragmento C?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El agua salió netamente de las células hacia una solución más concentrada en solutos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las células incorporaron grandes cantidades de agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todo el material genético salió de las células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El transporte activo introdujo agua en contra de su gradiente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La disminución de masa es compatible con pérdida neta de agua hacia un medio hipertónico.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué variable debería haberse mantenido constante para comparar adecuadamente las tres condiciones?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La concentración de cada solución.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El resultado final de masa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El tiempo de exposición de los fragmentos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La dirección del movimiento de agua.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Mantener constante el tiempo permite atribuir mejor las diferencias observadas a las soluciones utilizadas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si se repitiera el experimento usando una serie de soluciones con concentraciones conocidas, ¿qué resultado permitiría estimar mejor la concentración interna efectiva del tejido?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La solución que produzca el mayor aumento de masa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La solución que destruya el tejido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La solución con el menor volumen total.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La concentración en la que el tejido presente aproximadamente cero cambio neto de masa.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una condición con cambio neto cercano a cero permite aproximarse a una situación isotónica entre tejido y solución.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué característica del ingreso inicial de X indica que corresponde a un proceso pasivo?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ocurre siguiendo el gradiente y continúa sin depender directamente de energía celular.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Solo ocurre contra el gradiente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Requiere aumentar la concentración interna por sobre la externa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Depende obligatoriamente de una bomba.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El movimiento a favor del gradiente sin gasto energético directo es característico del transporte pasivo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué mecanismo explica mejor el ingreso inicial de Y?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ósmosis.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transporte activo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Difusión facilitada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'División celular.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Y se mueve a favor de su gradiente, pero depende de una proteína de membrana, lo que es compatible con difusión facilitada.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué evidencia distingue el segundo mecanismo de transporte de Y del primero?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Y deja completamente de interactuar con proteínas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La célula puede acumular Y contra su gradiente y el proceso depende de energía.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El agua sustituye a Y.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La concentración externa siempre es mayor.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Acumular una sustancia contra su gradiente requiere transporte activo y gasto energético.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión sobre las proteínas de membrana está mejor sustentada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las proteínas de membrana realizan transporte activo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las proteínas solo intervienen en el movimiento de agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ningún transporte pasivo utiliza proteínas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Algunas proteínas pueden facilitar transporte pasivo y otras participar en procesos activos.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La presencia de proteínas no determina por sí sola si un proceso es activo o pasivo; importa también la dirección del gradiente y el gasto energético.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Cuál procedimiento permitiría distinguir mejor entre transporte pasivo facilitado y transporte activo para una sustancia?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar su movimiento respecto del gradiente y evaluar si cambia cuando disminuye la disponibilidad de energía celular.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Observar únicamente el tamaño de la célula.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Determinar si la sustancia tiene algún color visible.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Medir solo la temperatura ambiental una vez.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La dirección respecto del gradiente y la dependencia energética son criterios fundamentales para diferenciar ambos mecanismos.',
        },
      ],
    },
  ],
};

export default membranaTransporteCelular;
