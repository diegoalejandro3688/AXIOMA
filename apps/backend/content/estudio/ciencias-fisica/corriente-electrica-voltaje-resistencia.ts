// PHYSICS-C2A -- Ciencias / U2 "Física", Recurso 9 (order 9 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R21 -- B D A C B A C D B A.
// Dos tablas editoriales (Situación A "Voltaje / Corriente" y Situación B
// "Resistor / Corriente") como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preserva EXACTAMENTE el símbolo ohm (Ω): 10 Ω, 12 Ω; y V = IR.
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
  { type: 'heading', level: 3, text: 'Voltaje y corriente en un resistor' },
  { type: 'paragraph', text: 'Un grupo de estudiantes conectó un resistor a una fuente de voltaje variable.' },
  { type: 'paragraph', text: 'Mantuvieron el mismo resistor durante todos los ensayos y registraron:' },
  { type: 'paragraph', text: '| Voltaje | Corriente |' },
  { type: 'paragraph', text: '| 2 V | 0,20 A |' },
  { type: 'paragraph', text: '| 4 V | 0,40 A |' },
  { type: 'paragraph', text: '| 6 V | 0,60 A |' },
  { type: 'paragraph', text: '| 8 V | 0,80 A |' },
  { type: 'paragraph', text: 'Los estudiantes observaron una relación regular entre ambas variables.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Comparación de tres resistores' },
  { type: 'paragraph', text: 'Un equipo conectó tres resistores diferentes, uno a la vez, a una fuente ideal de 6 V.' },
  { type: 'paragraph', text: 'Registraron:' },
  { type: 'paragraph', text: '| Resistor | Corriente |' },
  { type: 'paragraph', text: '| P | 1,0 A |' },
  { type: 'paragraph', text: '| Q | 0,50 A |' },
  { type: 'paragraph', text: '| R | 0,25 A |' },
  { type: 'paragraph', text: 'La diferencia de potencial aplicada fue la misma en los tres casos.' },
];

const corrienteElectricaVoltajeResistencia: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 9,
  title: 'Corriente eléctrica, voltaje y resistencia',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar conceptos fundamentales de electricidad, relacionando corriente eléctrica, diferencia de potencial y resistencia mediante la ley de Ohm, e interpretar datos y situaciones experimentales simples en conductores y componentes eléctricos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Corriente eléctrica, voltaje y resistencia' },

    { type: 'heading', level: 2, text: '1. Corriente eléctrica' },
    {
      type: 'paragraph',
      text: 'La corriente eléctrica corresponde al flujo ordenado de carga eléctrica a través de un material. Se representa habitualmente mediante: I y su unidad en el Sistema Internacional es el ampere: A. Una corriente mayor implica un mayor flujo de carga por unidad de tiempo.',
    },

    { type: 'heading', level: 2, text: '2. Movimiento de cargas' },
    {
      type: 'paragraph',
      text: 'En materiales conductores existen cargas que pueden desplazarse. Cuando existe una diferencia de potencial adecuada, estas cargas pueden experimentar un movimiento neto que constituye una corriente eléctrica. En metales, los electrones participan principalmente en este proceso.',
    },

    { type: 'heading', level: 2, text: '3. Diferencia de potencial' },
    {
      type: 'paragraph',
      text: 'La diferencia de potencial eléctrico, o voltaje, representa una diferencia de energía potencial eléctrica por unidad de carga entre dos puntos. Se representa mediante: V y se mide en volt: V. Una fuente como una batería puede mantener una diferencia de potencial entre sus terminales.',
    },

    { type: 'heading', level: 2, text: '4. Resistencia eléctrica' },
    {
      type: 'paragraph',
      text: 'La resistencia representa la oposición que presenta un componente al paso de corriente eléctrica. Se representa mediante: R y se mide en ohm: Ω. La resistencia depende de características como: material; geometría; temperatura.',
    },

    { type: 'heading', level: 2, text: '5. Ley de Ohm' },
    {
      type: 'paragraph',
      text: 'Para ciertos componentes bajo condiciones apropiadas se cumple: V = IR donde: V es el voltaje; I es la corriente; R es la resistencia. Esta relación permite analizar cómo cambia una variable si las otras permanecen constantes.',
    },

    { type: 'heading', level: 2, text: '6. Voltaje y corriente' },
    {
      type: 'paragraph',
      text: 'Si la resistencia permanece constante: al aumentar el voltaje, aumenta la corriente. Por ejemplo, duplicar el voltaje aplicado a un resistor óhmico ideal produce el doble de corriente.',
    },

    { type: 'heading', level: 2, text: '7. Resistencia y corriente' },
    {
      type: 'paragraph',
      text: 'Si el voltaje permanece constante: al aumentar la resistencia, disminuye la corriente. Una mayor oposición al movimiento de cargas reduce la corriente para la misma diferencia de potencial.',
    },

    { type: 'heading', level: 2, text: '8. Conductores y aislantes' },
    {
      type: 'paragraph',
      text: 'Los materiales pueden comportarse de manera diferente frente al movimiento de carga. Los conductores facilitan el desplazamiento de cargas. Los aislantes dificultan significativamente ese desplazamiento. Esta diferencia se relaciona con su estructura y propiedades eléctricas.',
    },

    { type: 'heading', level: 2, text: '9. Medición eléctrica' },
    {
      type: 'paragraph',
      text: 'Para medir corriente se utiliza un amperímetro. Para medir diferencia de potencial se utiliza un voltímetro. De forma general: el amperímetro se integra al camino de la corriente; el voltímetro compara el potencial entre dos puntos. La conexión correcta es importante para obtener mediciones válidas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta eléctrica: identifica V, I y R; revisa qué variable permanece constante; utiliza V = IR cuando corresponda; diferencia corriente de voltaje; observa las unidades; analiza si el comportamiento es óhmico; evita asumir que mayor voltaje significa necesariamente mayor resistencia.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué variable fue modificada entre los ensayos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El material del resistor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El voltaje aplicado.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La unidad de corriente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número de electrones del universo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El voltaje cambia entre 2 V y 8 V, mientras el mismo resistor se mantiene en todos los ensayos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué ocurre con la corriente cuando aumenta el voltaje en estos datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Disminuye.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se vuelve cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permanece exactamente igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumenta.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La corriente aumenta progresivamente a medida que aumenta el voltaje.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la resistencia del componente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '10 Ω.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,10 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40 Ω.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R = V/I. Por ejemplo, R = 2 V / 0,20 A = 10 Ω.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué relación muestran los datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La corriente es inversamente proporcional al voltaje.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La resistencia aumenta en cada ensayo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Al duplicar el voltaje, la corriente también se duplica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'No existe relación entre voltaje y corriente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Para este resistor, la razón V/I permanece constante y la corriente aumenta proporcionalmente con el voltaje.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si el mismo resistor se conecta a una fuente de 12 V y mantiene su comportamiento óhmico, ¿qué corriente se esperaría?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,12 A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,2 A.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '12 A.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '120 A.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'I = V/R = 12 V / 10 Ω = 1,2 A.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál resistor permitió la mayor corriente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todos la misma.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'P permitió una corriente de 1,0 A, la mayor de las tres mediciones.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál resistor posee la mayor resistencia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P y Q por igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con el mismo voltaje, el componente que permite menor corriente posee mayor resistencia. R presenta 0,25 A.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál es la resistencia del resistor Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '3 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24 Ω.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12 Ω.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R = V/I = 6 V / 0,50 A = 12 Ω.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por los datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mayor resistencia produce siempre mayor corriente.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Para un mismo voltaje, una mayor resistencia se asocia con una menor corriente.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El voltaje fue distinto en cada resistor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La resistencia no influye en la corriente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al mantener 6 V constantes, las corrientes más pequeñas corresponden a resistencias mayores.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “R deja pasar menos corriente porque recibe menos voltaje que P”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: ambos reciben 6 V; la diferencia de corriente se explica por sus distintas resistencias.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Es correcta porque la corriente determina siempre el voltaje de la fuente.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta porque R recibe necesariamente 1,5 V.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque todos los resistores deben permitir la misma corriente.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La diferencia de potencial es la misma para los tres resistores; sus diferentes corrientes reflejan diferencias de resistencia.',
        },
      ],
    },
  ],
};

export default corrienteElectricaVoltajeResistencia;
