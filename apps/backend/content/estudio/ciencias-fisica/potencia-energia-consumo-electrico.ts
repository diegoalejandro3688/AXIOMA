// PHYSICS-C2A -- Ciencias / U2 "Física", Recurso 11 (order 11 en U2).
// Cierra la unidad U2 "Física" en el source (11 recursos / 110 preguntas).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R23 -- D B A C D A C B D A.
// Dos tablas editoriales (Situación A "Dispositivo / Corriente" y Situación B
// "Aparato / Potencia / Tiempo de uso diario") como filas de párrafo con "|"
// -- FORMAT_ONLY. Se preservan EXACTAMENTE: superíndice ² (P = I²R, P = V²/R),
// el símbolo × (220 V × 0,50 A = 110 W; 0,5 kW × 4 h = 2 kWh), espacios de
// miles (1 000 J, 1 500 W) y las unidades W, J, J/s, kWh.
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
  { type: 'heading', level: 3, text: 'Tres dispositivos eléctricos' },
  { type: 'paragraph', text: 'Un grupo de estudiantes comparó tres dispositivos conectados a una fuente de 220 V.' },
  { type: 'paragraph', text: '| Dispositivo | Corriente |' },
  { type: 'paragraph', text: '| P | 0,50 A |' },
  { type: 'paragraph', text: '| Q | 1,00 A |' },
  { type: 'paragraph', text: '| R | 2,00 A |' },
  { type: 'paragraph', text: 'Consideraron que durante la medición cada dispositivo operaba de manera estable.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Consumo diario de distintos aparatos' },
  { type: 'paragraph', text: 'Una familia registró el uso diario de tres aparatos.' },
  { type: 'paragraph', text: '| Aparato | Potencia | Tiempo de uso diario |' },
  { type: 'paragraph', text: '| Lámpara | 20 W | 5 h |' },
  { type: 'paragraph', text: '| Televisor | 100 W | 3 h |' },
  { type: 'paragraph', text: '| Calefactor | 1 500 W | 2 h |' },
  { type: 'paragraph', text: 'Los estudiantes calcularon el consumo energético diario de cada aparato.' },
];

const potenciaEnergiaConsumoElectrico: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 11,
  title: 'Potencia, energía y consumo eléctrico',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá relacionar potencia eléctrica, energía consumida, voltaje, corriente y tiempo de funcionamiento, interpretando datos de dispositivos eléctricos y estimando consumo energético en situaciones cotidianas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Potencia, energía y consumo eléctrico' },

    { type: 'heading', level: 2, text: '1. Potencia eléctrica' },
    {
      type: 'paragraph',
      text: 'La potencia eléctrica indica la rapidez con que un dispositivo transforma o transfiere energía eléctrica. Se representa habitualmente mediante: P y su unidad en el Sistema Internacional es el watt: W. Un watt equivale a: 1 W = 1 J/s. Esto significa que un dispositivo de mayor potencia transforma más energía por unidad de tiempo.',
    },

    { type: 'heading', level: 2, text: '2. Potencia, voltaje y corriente' },
    {
      type: 'paragraph',
      text: 'En un dispositivo eléctrico puede utilizarse la relación: P = VI donde: P es la potencia; V es el voltaje; I es la corriente. Por ejemplo, un dispositivo conectado a un voltaje determinado tendrá mayor potencia si circula una corriente mayor.',
    },

    { type: 'heading', level: 2, text: '3. Potencia y resistencia' },
    {
      type: 'paragraph',
      text: 'Para componentes resistivos también pueden obtenerse relaciones como: P = I²R y: P = V²/R cuando corresponden las condiciones del circuito. Estas expresiones derivan de combinar la ley de Ohm con la relación P = VI.',
    },

    { type: 'heading', level: 2, text: '4. Energía eléctrica' },
    {
      type: 'paragraph',
      text: 'La energía utilizada por un dispositivo depende de: su potencia; el tiempo durante el cual funciona. Puede expresarse como: E = Pt donde: E es energía; P es potencia; t es tiempo. Un dispositivo de baja potencia puede consumir mucha energía si funciona durante mucho tiempo.',
    },

    { type: 'heading', level: 2, text: '5. Joule' },
    {
      type: 'paragraph',
      text: 'Si la potencia se expresa en watt y el tiempo en segundos, la energía se obtiene en joule: J. Por ejemplo: 100 W durante 10 s corresponden a: 1 000 J de energía transferida.',
    },

    { type: 'heading', level: 2, text: '6. Kilowatt-hora' },
    {
      type: 'paragraph',
      text: 'En consumo eléctrico doméstico es común utilizar: kilowatt-hora (kWh). Un kilowatt-hora corresponde a la energía utilizada por un dispositivo de 1 kW funcionando durante 1 hora. No es una unidad de potencia. Es una unidad de energía.',
    },

    { type: 'heading', level: 2, text: '7. Cálculo de consumo' },
    {
      type: 'paragraph',
      text: 'Para calcular energía en kWh: convertir la potencia a kilowatt; expresar el tiempo en horas; multiplicar. Por ejemplo: 0,5 kW × 4 h = 2 kWh',
    },

    { type: 'heading', level: 2, text: '8. Comparar dispositivos' },
    {
      type: 'paragraph',
      text: 'Dos dispositivos pueden tener: distinta potencia; distinto tiempo de uso; igual consumo total. Por eso, para comparar energía utilizada no basta con conocer únicamente la potencia. También debe considerarse el tiempo.',
    },

    { type: 'heading', level: 2, text: '9. Consumo y eficiencia' },
    {
      type: 'paragraph',
      text: 'Un dispositivo puede transformar la energía eléctrica en distintas formas: luz; movimiento; calor; sonido. La energía consumida no indica por sí sola cuánta energía se transforma en el efecto deseado. Para evaluar eso también debe considerarse la eficiencia del dispositivo.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre consumo eléctrico: diferencia potencia de energía; identifica las unidades; utiliza P = VI cuando corresponda; utiliza E = Pt; convierte W a kW si trabajas con kWh; convierte minutos a horas cuando sea necesario; compara tanto potencia como tiempo de funcionamiento.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál dispositivo presenta la mayor corriente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P y Q por igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'R presenta una corriente de 2,00 A, la mayor de las tres.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué relación permite calcular la potencia eléctrica a partir de voltaje y corriente?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'E = Pt.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'P = VI.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'V = IR exclusivamente para energía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'p = F/A.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La potencia eléctrica puede calcularse multiplicando el voltaje por la corriente.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la potencia del dispositivo P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '110 W.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '220 W.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '440 W.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,0023 W.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'P = VI = 220 V × 0,50 A = 110 W.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es la potencia del dispositivo Q?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '110 W.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '440 W.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '220 W.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '22 W.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'P = 220 V × 1,00 A = 220 W.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Los dispositivos P y R funcionan durante el mismo tiempo. ¿Cuál afirmación es correcta?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Ambos consumen necesariamente la misma energía porque están conectados al mismo voltaje.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'P consume más energía porque tiene menor corriente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No puede compararse el consumo aunque el tiempo sea el mismo.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'R consume más energía porque su potencia es mayor y ambos funcionan durante el mismo intervalo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'R tiene mayor corriente y, con el mismo voltaje, mayor potencia. Si ambos funcionan durante igual tiempo, R utiliza más energía.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál aparato tiene la mayor potencia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Calefactor.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Televisor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Lámpara.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todos poseen la misma.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El calefactor tiene una potencia de 1 500 W, superior a las otras dos.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuánta energía consume diariamente la lámpara?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,01 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,0 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,10 kWh.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '100 kWh.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '20 W = 0,020 kW. Entonces E = 0,020 kW × 5 h = 0,10 kWh.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuánto consume diariamente el televisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '3 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,30 kWh.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '30 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,03 kWh.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '100 W = 0,100 kW. Entonces 0,100 kW × 3 h = 0,30 kWh.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuánto consume diariamente el calefactor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,75 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,5 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '750 kWh.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3,0 kWh.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '1 500 W = 1,5 kW. Durante 2 h consume 1,5 kW × 2 h = 3,0 kWh.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma: “El aparato de mayor potencia siempre será el que consuma más energía, sin importar cuánto tiempo se use”. ¿Cuál evaluación es correcta?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es incorrecta: el consumo depende tanto de la potencia como del tiempo de funcionamiento.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'Es correcta porque energía y potencia son exactamente la misma magnitud.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Es correcta si todos los aparatos utilizan electricidad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es incorrecta porque la potencia no se relaciona con energía.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La energía consumida se calcula mediante E = Pt, por lo que un dispositivo de menor potencia puede consumir más energía si funciona durante un tiempo suficientemente mayor.',
        },
      ],
    },
  ],
};

export default potenciaEnergiaConsumoElectrico;
