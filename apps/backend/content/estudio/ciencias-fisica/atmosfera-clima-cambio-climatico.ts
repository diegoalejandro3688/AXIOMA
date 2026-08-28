// PHYSICS-C2A -- Ciencias / U2 "Física", Recurso 8 (order 8 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R20 -- A C B D A B D C A B.
// Dos tablas editoriales (Situación A "Período / Temperatura media" y
// Situación B "Concentración relativa del gas / Fracción de radiación
// infrarroja absorbida") como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preservan EXACTAMENTE los rangos de años con guion medio (1981–1990),
// °C, y los porcentajes.
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
  { type: 'heading', level: 3, text: 'Temperatura media durante varias décadas' },
  {
    type: 'paragraph',
    text: 'Un grupo de estudiantes analizó la temperatura media de una región durante cuatro períodos de diez años.',
  },
  { type: 'paragraph', text: '| Período | Temperatura media |' },
  { type: 'paragraph', text: '| 1981–1990 | 14,1 °C |' },
  { type: 'paragraph', text: '| 1991–2000 | 14,3 °C |' },
  { type: 'paragraph', text: '| 2001–2010 | 14,7 °C |' },
  { type: 'paragraph', text: '| 2011–2020 | 15,0 °C |' },
  {
    type: 'paragraph',
    text: 'Los estudiantes observaron además que existían años individuales más fríos o más cálidos dentro de cada período.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Radiación y concentración de un gas atmosférico' },
  {
    type: 'paragraph',
    text: 'Un equipo utilizó un modelo experimental para estudiar cómo una mayor concentración de cierto gas afectaba la interacción con radiación infrarroja.',
  },
  { type: 'paragraph', text: 'Mantuvieron constantes las demás condiciones y registraron:' },
  { type: 'paragraph', text: '| Concentración relativa del gas | Fracción de radiación infrarroja absorbida |' },
  { type: 'paragraph', text: '| 1,0 | 20% |' },
  { type: 'paragraph', text: '| 1,5 | 27% |' },
  { type: 'paragraph', text: '| 2,0 | 33% |' },
  { type: 'paragraph', text: '| 2,5 | 38% |' },
  { type: 'paragraph', text: 'El modelo representaba de manera simplificada un proceso asociado al efecto invernadero.' },
];

const atmosferaClimaCambioClimatico: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 8,
  title: 'Atmósfera, clima y cambio climático',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo la atmósfera influye en el clima y en el balance energético de la Tierra, distinguiendo tiempo atmosférico de clima, relacionando el efecto invernadero con la interacción de la radiación y los gases atmosféricos, e interpretando datos asociados a cambios climáticos de largo plazo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Atmósfera, clima y cambio climático' },

    { type: 'heading', level: 2, text: '1. La atmósfera' },
    {
      type: 'paragraph',
      text: 'La atmósfera es la envoltura gaseosa que rodea la Tierra. Está compuesta principalmente por: nitrógeno; oxígeno; argón; dióxido de carbono; vapor de agua; otros gases en menor proporción. Aunque algunos gases están presentes en cantidades pequeñas, pueden tener efectos importantes sobre procesos atmosféricos.',
    },

    { type: 'heading', level: 2, text: '2. Capas de la atmósfera' },
    {
      type: 'paragraph',
      text: 'La atmósfera puede dividirse en capas según cómo varía la temperatura con la altura. Entre ellas se encuentran: troposfera; estratosfera; mesosfera; termosfera. La mayor parte de los fenómenos meteorológicos ocurre en la troposfera.',
    },

    { type: 'heading', level: 2, text: '3. Tiempo atmosférico y clima' },
    {
      type: 'paragraph',
      text: 'El tiempo atmosférico describe condiciones de corto plazo, por ejemplo: temperatura de un día; lluvia; viento; nubosidad. El clima corresponde a patrones y tendencias observados durante períodos largos. Por eso, un día frío no permite por sí solo determinar una tendencia climática.',
    },

    { type: 'heading', level: 2, text: '4. Radiación solar' },
    {
      type: 'paragraph',
      text: 'La principal fuente de energía del sistema climático terrestre es el Sol. Parte de la radiación solar: llega a la superficie; es absorbida; es reflejada por nubes, hielo, suelo y otras superficies. La energía absorbida puede luego ser emitida nuevamente en forma de radiación electromagnética.',
    },

    { type: 'heading', level: 2, text: '5. Balance energético' },
    {
      type: 'paragraph',
      text: 'La temperatura media del planeta está relacionada con el balance entre: energía que llega desde el Sol; energía reflejada; energía absorbida; energía emitida hacia el espacio. Si este balance cambia de manera persistente, la temperatura media puede modificarse.',
    },

    { type: 'heading', level: 2, text: '6. Efecto invernadero natural' },
    {
      type: 'paragraph',
      text: 'La superficie terrestre, al calentarse, emite radiación principalmente en la región infrarroja. Algunos gases atmosféricos pueden absorber y emitir parte de esa radiación. Este proceso contribuye a mantener temperaturas compatibles con las condiciones actuales de vida. El efecto invernadero natural no es, por sí mismo, un fenómeno anormal.',
    },

    { type: 'heading', level: 2, text: '7. Gases de efecto invernadero' },
    {
      type: 'paragraph',
      text: 'Entre los gases capaces de interactuar con radiación infrarroja se encuentran: vapor de agua; dióxido de carbono; metano; óxido nitroso. Cambios en sus concentraciones pueden modificar cuánto flujo de radiación infrarroja es absorbido y reemitido por la atmósfera.',
    },

    { type: 'heading', level: 2, text: '8. Cambio climático' },
    {
      type: 'paragraph',
      text: 'El clima terrestre ha cambiado a lo largo de su historia. Los cambios pueden relacionarse con distintos factores. En períodos recientes, el aumento de ciertas concentraciones de gases de efecto invernadero debido a actividades humanas constituye un factor importante en el cambio del balance energético. El análisis científico utiliza múltiples líneas de evidencia.',
    },

    { type: 'heading', level: 2, text: '9. Evidencia climática' },
    {
      type: 'paragraph',
      text: 'Para estudiar cambios de largo plazo se pueden analizar: registros de temperatura; concentración de gases atmosféricos; hielo; nivel del mar; glaciares; océanos; sedimentos; registros históricos e instrumentales. Una tendencia climática requiere observar períodos suficientes y múltiples datos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre clima: distingue un evento meteorológico de una tendencia climática; identifica qué variable se mide; analiza el período temporal; distingue correlación de causalidad; identifica cómo entra y sale energía del sistema; reconoce la función del efecto invernadero natural; utiliza varias evidencias antes de sacar una conclusión general.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué variable presenta la tabla?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Temperatura media.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Velocidad de una placa tectónica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Presión de un líquido.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Frecuencia de una onda.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla compara la temperatura media registrada en diferentes períodos de diez años.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué concepto es más adecuado para analizar este conjunto de datos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo el tiempo atmosférico de un día.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una medición instantánea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Clima.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Movimiento rectilíneo uniforme.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos abarcan varias décadas, por lo que permiten analizar patrones climáticos de largo plazo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tendencia muestran los valores?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una disminución continua de temperatura.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Un aumento de la temperatura media entre los períodos mostrados.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una temperatura exactamente constante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa de variabilidad entre años.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La temperatura media aumenta desde 14,1 °C hasta 15,0 °C a lo largo de los períodos considerados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Por qué la existencia de un año particularmente frío dentro de 2011–2020 no contradice necesariamente la tendencia de la tabla?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el clima no utiliza mediciones de temperatura.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los años deben tener idéntica temperatura.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque un año frío demuestra que toda tendencia es falsa.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque la variabilidad de corto plazo puede ocurrir dentro de una tendencia climática de largo plazo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El clima se analiza durante períodos prolongados, por lo que eventos individuales pueden diferir de la tendencia general.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Qué información adicional sería más útil para evaluar si la tendencia observada corresponde a un cambio climático regional más amplio?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Registros de otras variables climáticas y de estaciones de la región durante períodos comparables y suficientemente largos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La temperatura de una sola tarde.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El peso de los instrumentos de medición.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un único dato tomado fuera de la región.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una evaluación robusta requiere múltiples registros, variables y lugares durante períodos prolongados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué ocurrió con la fracción de radiación infrarroja absorbida al aumentar la concentración del gas?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Disminuyó.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumentó.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Permaneció exactamente igual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se volvió cero.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran un aumento desde 20% hasta 38% al aumentar la concentración relativa.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué variable fue modificada de manera intencional en el experimento?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El planeta estudiado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La longitud del año.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La masa de la Tierra.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La concentración relativa del gas.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento cambia la concentración del gas y mantiene constantes las demás condiciones.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué este resultado es relevante para comprender el efecto invernadero?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque demuestra que la atmósfera refleja toda la radiación solar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los gases eliminan toda transferencia de energía.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque muestra que cambios en la concentración de un gas pueden modificar su interacción con radiación infrarroja.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque demuestra que la temperatura atmosférica nunca cambia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El efecto invernadero depende de la interacción de ciertos gases con la radiación infrarroja emitida por la Tierra.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál afirmación sobre el efecto invernadero natural es correcta?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Es un proceso atmosférico que contribuye a mantener la temperatura terrestre y puede modificarse si cambian las concentraciones de ciertos gases.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Solo existe cuando ocurre contaminación industrial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impide que cualquier radiación escape al espacio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es exactamente igual a la reflexión de luz en un espejo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El efecto invernadero es un proceso natural, aunque su intensidad puede cambiar cuando cambia la composición atmosférica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Cuál conclusión puede obtenerse directamente del experimento sin exceder la evidencia disponible?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El aumento del gas observado es la única causa posible de cualquier cambio climático.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'En las condiciones del modelo, aumentar la concentración del gas estuvo asociado con una mayor absorción de radiación infrarroja; para evaluar el clima real se requiere integrar esta relación con otras variables y evidencia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Toda radiación electromagnética es absorbida de igual manera por cualquier gas.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El experimento demuestra exactamente cuánto aumentará la temperatura global futura.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El experimento permite establecer la relación observada bajo condiciones controladas, pero no basta por sí solo para describir todo el sistema climático.',
        },
      ],
    },
  ],
};

export default atmosferaClimaCambioClimatico;
