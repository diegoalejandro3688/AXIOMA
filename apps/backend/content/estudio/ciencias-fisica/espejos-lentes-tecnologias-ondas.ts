// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 3 (order 3 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R15 -- A C D B A D B C A D.
// Tabla editorial de la Situación A ("Sistema / Comportamiento de los rayos")
// representada como filas de párrafo con "|" -- FORMAT_ONLY.
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
  { type: 'heading', level: 3, text: 'Comparación de tres sistemas ópticos' },
  { type: 'paragraph', text: 'Un grupo de estudiantes dirigió rayos aproximadamente paralelos hacia tres dispositivos.' },
  { type: 'paragraph', text: '| Sistema | Comportamiento de los rayos |' },
  { type: 'paragraph', text: '| P | Los rayos reflejados se aproximaron y se reunieron frente al dispositivo. |' },
  { type: 'paragraph', text: '| Q | Los rayos atravesaron el dispositivo y luego se aproximaron hasta reunirse. |' },
  { type: 'paragraph', text: '| R | Los rayos atravesaron el dispositivo y luego se separaron. |' },
  { type: 'paragraph', text: 'Los estudiantes identificaron P como un espejo y Q y R como lentes transparentes.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Una imagen proyectada sobre una pantalla' },
  { type: 'paragraph', text: 'Un equipo colocó un objeto luminoso frente a una lente.' },
  { type: 'paragraph', text: 'Al otro lado de la lente ubicaron una pantalla móvil.' },
  { type: 'paragraph', text: 'Después de ajustar las distancias, observaron una imagen nítida del objeto sobre la pantalla.' },
  {
    type: 'paragraph',
    text: 'Luego reemplazaron la lente por otra y repitieron el procedimiento, pero no lograron obtener una imagen nítida sobre ninguna posición de la pantalla.',
  },
  {
    type: 'paragraph',
    text: 'Al seguir los rayos con una representación geométrica, observaron que con la segunda lente los rayos salían divergiendo y sus prolongaciones hacia atrás parecían provenir de una región situada del mismo lado que el objeto.',
  },
];

const espejosLentesTecnologiasOndas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 3,
  title: 'Espejos, lentes y tecnologías basadas en ondas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar de manera cualitativa cómo espejos y lentes modifican la trayectoria de la luz para formar imágenes, distinguiendo dispositivos convergentes y divergentes, e interpretar aplicaciones tecnológicas basadas en reflexión y refracción.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Espejos, lentes y tecnologías basadas en ondas' },

    { type: 'heading', level: 2, text: '1. Formación de imágenes' },
    {
      type: 'paragraph',
      text: 'Una imagen óptica se forma cuando los rayos luminosos llegan a un sistema como: espejo; lente; conjunto de lentes. Dependiendo del sistema, los rayos pueden: reflejarse; refractarse; converger; divergir. La ubicación y características de la imagen dependen de cómo cambie la dirección de los rayos.',
    },

    { type: 'heading', level: 2, text: '2. Espejo plano' },
    {
      type: 'paragraph',
      text: 'Un espejo plano produce una imagen que, idealmente: es virtual; aparece detrás del espejo; tiene el mismo tamaño que el objeto; se encuentra a igual distancia detrás del espejo que el objeto delante de él. La imagen no se forma porque los rayos realmente atraviesen el espejo. El observador interpreta que los rayos reflejados provienen de un punto situado detrás de él.',
    },

    { type: 'heading', level: 2, text: '3. Espejos curvos' },
    {
      type: 'paragraph',
      text: 'Los espejos curvos pueden clasificarse principalmente en: cóncavos; convexos. Un espejo cóncavo puede hacer converger rayos paralelos. Un espejo convexo produce un comportamiento divergente de los rayos reflejados. Por eso tienen usos diferentes.',
    },

    { type: 'heading', level: 2, text: '4. Foco' },
    {
      type: 'paragraph',
      text: 'En un sistema convergente, rayos que llegan paralelos al eje principal pueden dirigirse hacia una región denominada foco. La distancia entre el sistema óptico y ese punto se relaciona con la distancia focal. El concepto de foco es importante tanto en espejos cóncavos como en lentes convergentes.',
    },

    { type: 'heading', level: 2, text: '5. Lentes' },
    {
      type: 'paragraph',
      text: 'Una lente es un material transparente con superficies diseñadas para desviar la luz mediante refracción. De forma simplificada existen: lentes convergentes; lentes divergentes. Su efecto depende de la geometría de la lente y de los materiales involucrados.',
    },

    { type: 'heading', level: 2, text: '6. Lente convergente' },
    {
      type: 'paragraph',
      text: 'Una lente convergente puede hacer que rayos aproximadamente paralelos se acerquen entre sí después de atravesarla. En determinadas condiciones, los rayos pueden reunirse y formar una imagen real. Este tipo de lente se utiliza en varios instrumentos ópticos.',
    },

    { type: 'heading', level: 2, text: '7. Lente divergente' },
    {
      type: 'paragraph',
      text: 'Una lente divergente hace que rayos paralelos se separen después de atravesarla. Al observar las prolongaciones de esos rayos, parecen provenir de una región situada antes de la lente. Por ello puede producir imágenes virtuales en configuraciones simples.',
    },

    { type: 'heading', level: 2, text: '8. Imágenes reales y virtuales' },
    {
      type: 'paragraph',
      text: 'Una imagen real puede formarse donde los rayos luminosos convergen físicamente. Puede proyectarse sobre una pantalla. Una imagen virtual corresponde a una posición desde donde los rayos parecen provenir o hacia donde parecen dirigirse, aunque no converjan físicamente allí. En general, una imagen virtual no puede proyectarse directamente sobre una pantalla.',
    },

    { type: 'heading', level: 2, text: '9. Aplicaciones tecnológicas' },
    {
      type: 'paragraph',
      text: 'La reflexión y la refracción se utilizan en tecnologías como: anteojos; cámaras; telescopios; microscopios; proyectores; sistemas de iluminación; instrumentos médicos. En muchos dispositivos se combinan varios elementos ópticos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre espejos y lentes: identifica si ocurre reflexión o refracción; determina si el sistema es convergente o divergente; observa qué hacen los rayos después del dispositivo; diferencia imagen real de virtual; identifica si puede proyectarse en una pantalla; no asumas que todos los espejos o lentes producen la misma imagen; relaciona la función tecnológica con el comportamiento de la luz.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál sistema corresponde a una lente convergente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ninguno.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En Q los rayos atraviesan la lente y posteriormente convergen, comportamiento característico de una lente convergente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál sistema corresponde a una lente divergente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'R.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'P y Q.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En R los rayos se separan después de atravesar la lente, por lo que corresponde a una lente divergente.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué tipo de espejo podría corresponder al sistema P?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Espejo plano.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Espejo convexo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ningún espejo puede hacer eso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Espejo cóncavo.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un espejo cóncavo puede reflejar rayos paralelos de manera que converjan hacia una región focal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué diferencia principal permite distinguir P de Q en la situación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P no interactúa con luz.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'En P predomina la reflexión y en Q la refracción.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Q refleja todos los rayos sin atravesarse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos dependen exclusivamente de absorción.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'P es un espejo y modifica los rayos mediante reflexión, mientras Q es una lente y los desvía principalmente mediante refracción.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma que P y Q son exactamente el mismo sistema porque ambos hacen converger rayos. ¿Cuál evaluación es más adecuada?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta: ambos pueden ser convergentes, pero uno utiliza reflexión y el otro refracción.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque cualquier sistema convergente debe ser una lente.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es correcta porque reflexión y refracción son el mismo fenómeno.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación es incorrecta porque ningún espejo puede ser convergente.',
          },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Dos sistemas pueden producir convergencia mediante fenómenos distintos: un espejo cóncavo mediante reflexión y una lente convergente mediante refracción.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué tipo de imagen se obtuvo con la primera lente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Virtual, porque apareció en una pantalla.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Imaginaria sin relación con la luz.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reflejada por un espejo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Real.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una imagen que puede proyectarse de forma nítida sobre una pantalla corresponde a una imagen real.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué característica presenta probablemente la primera lente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es necesariamente divergente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es convergente en la configuración utilizada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'No desvía la luz.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Funciona únicamente por reflexión.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una lente convergente puede hacer que los rayos provenientes de un objeto se reúnan y formen una imagen real en determinadas configuraciones.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué no se obtuvo una imagen proyectable con la segunda lente en la situación descrita?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las lentes absorben completamente la luz.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la frecuencia de la luz se hizo cero.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque los rayos emergieron divergiendo y no convergieron físicamente sobre una pantalla.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque la pantalla refleja toda la radiación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si los rayos divergen, no se reúnen físicamente en un punto detrás de la lente y por ello no forman allí una imagen real proyectable.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué tipo de imagen sugieren las prolongaciones hacia atrás de los rayos de la segunda lente?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una imagen virtual.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una imagen real.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una imagen producida por absorción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una imagen sin interacción óptica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando los rayos divergen pero parecen provenir de un punto al prolongarlos hacia atrás, ese punto corresponde a una imagen virtual.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál aplicación depende directamente de controlar la convergencia o divergencia de la luz mediante lentes?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una resistencia eléctrica utilizada para calentar agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un imán permanente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un termómetro de contacto que no utiliza óptica.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Un sistema de anteojos diseñado para modificar la trayectoria de la luz antes de que ingrese al ojo.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los anteojos utilizan lentes con propiedades específicas para modificar la trayectoria de los rayos y ayudar a que la imagen se forme adecuadamente en el sistema visual.',
        },
      ],
    },
  ],
};

export default espejosLentesTecnologiasOndas;
