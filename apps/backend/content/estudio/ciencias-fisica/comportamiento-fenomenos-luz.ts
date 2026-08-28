// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 2 (order 2 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R14 -- B D A C B A D C B D.
// Tabla editorial de la Situación A ("Ensayo / Ángulo de incidencia / Ángulo
// de reflexión") representada como filas de párrafo con "|" -- FORMAT_ONLY.
// Se preserva EXACTAMENTE el símbolo de grado (°).
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
  { type: 'heading', level: 3, text: 'Un rayo de luz sobre una superficie reflectante' },
  { type: 'paragraph', text: 'Un estudiante dirigió un haz estrecho de luz hacia una superficie plana y pulida.' },
  { type: 'paragraph', text: 'Dibujó una línea normal perpendicular a la superficie en el punto de incidencia.' },
  { type: 'paragraph', text: 'Luego registró:' },
  { type: 'paragraph', text: '| Ensayo | Ángulo de incidencia | Ángulo de reflexión |' },
  { type: 'paragraph', text: '| 1 | 20° | 20° |' },
  { type: 'paragraph', text: '| 2 | 35° | 35° |' },
  { type: 'paragraph', text: '| 3 | 50° | 50° |' },
  { type: 'paragraph', text: '| 4 | 65° | 65° |' },
  { type: 'paragraph', text: 'El estudiante concluyó que existía una relación entre ambos ángulos.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Un haz atraviesa dos medios' },
  { type: 'paragraph', text: 'Un grupo de estudiantes dirigió un haz de luz desde el aire hacia un bloque transparente.' },
  { type: 'paragraph', text: 'Observaron que el rayo cambiaba de dirección al entrar al bloque.' },
  { type: 'paragraph', text: 'Después midieron:' },
  { type: 'paragraph', text: 'ángulo de incidencia en el aire: 45°; ángulo dentro del bloque: 28°.' },
  { type: 'paragraph', text: 'Además, comprobaron que la rapidez de la luz dentro del bloque era menor que en el aire.' },
  {
    type: 'paragraph',
    text: 'Luego hicieron pasar luz blanca a través de otro material transparente y observaron que emergían varios colores en direcciones ligeramente diferentes.',
  },
];

const comportamientoFenomenosLuz: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 2,
  title: 'Comportamiento y fenómenos de la luz',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar fenómenos asociados al comportamiento de la luz, como reflexión, refracción, dispersión y absorción, relacionando cambios de dirección y propagación con las características de los medios, e interpretar situaciones experimentales y representaciones de rayos luminosos.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Comportamiento y fenómenos de la luz' },

    { type: 'heading', level: 2, text: '1. La luz como radiación electromagnética' },
    {
      type: 'paragraph',
      text: 'La luz visible corresponde a una parte del espectro electromagnético. Puede propagarse en el vacío y también atravesar distintos medios materiales. Al interactuar con la materia, puede experimentar fenómenos como: reflexión; refracción; absorción; dispersión. Estos fenómenos dependen de las propiedades del medio y de la interacción de la luz con las superficies.',
    },

    { type: 'heading', level: 2, text: '2. Reflexión' },
    {
      type: 'paragraph',
      text: 'La reflexión ocurre cuando la luz incide sobre una superficie y cambia de dirección permaneciendo en el mismo medio. Por ejemplo, cuando la luz llega a un espejo, una parte importante puede reflejarse. En una representación mediante rayos se distinguen: rayo incidente; normal; rayo reflejado.',
    },

    { type: 'heading', level: 2, text: '3. Ley de la reflexión' },
    {
      type: 'paragraph',
      text: 'El ángulo de incidencia se mide respecto de la línea normal a la superficie. El ángulo de reflexión también se mide respecto de la normal. Para una reflexión regular se cumple: ángulo de incidencia = ángulo de reflexión. Esto no significa que los ángulos se midan respecto de la superficie.',
    },

    { type: 'heading', level: 2, text: '4. Reflexión regular y difusa' },
    {
      type: 'paragraph',
      text: 'En una superficie muy lisa, rayos incidentes paralelos pueden reflejarse de manera ordenada. Esto se denomina reflexión regular. En una superficie irregular, los rayos pueden reflejarse en múltiples direcciones. Esto se denomina reflexión difusa. En ambos casos se cumple la ley de la reflexión a escala local.',
    },

    { type: 'heading', level: 2, text: '5. Refracción' },
    {
      type: 'paragraph',
      text: 'La refracción ocurre cuando la luz pasa de un medio a otro y cambia su rapidez de propagación. Como consecuencia, puede cambiar su dirección. Por ejemplo, un rayo que pasa del aire al agua puede desviarse. La frecuencia de la luz se mantiene al atravesar la frontera, mientras pueden cambiar: rapidez; longitud de onda.',
    },

    { type: 'heading', level: 2, text: '6. Dirección y normal' },
    {
      type: 'paragraph',
      text: 'Para describir la refracción se utiliza nuevamente una línea normal a la superficie. Cuando la luz pasa a un medio donde su rapidez es menor, puede desviarse hacia la normal. Cuando pasa a un medio donde su rapidez es mayor, puede desviarse alejándose de la normal. Esto depende también del ángulo de incidencia.',
    },

    { type: 'heading', level: 2, text: '7. Dispersión' },
    {
      type: 'paragraph',
      text: 'La luz visible puede estar formada por radiaciones de distintas longitudes de onda. Cuando diferentes componentes experimentan refracciones distintas, pueden separarse. Este fenómeno se denomina dispersión. Un prisma puede separar luz blanca en diferentes colores debido a que distintas longitudes de onda no se desvían exactamente de la misma manera.',
    },

    { type: 'heading', level: 2, text: '8. Absorción' },
    {
      type: 'paragraph',
      text: 'Cuando la luz llega a un material, parte de su energía puede ser absorbida. La energía absorbida puede transformarse en otras formas, por ejemplo energía térmica. La absorción depende de factores como: material; longitud de onda; superficie; intensidad de la radiación.',
    },

    { type: 'heading', level: 2, text: '9. Transmisión' },
    {
      type: 'paragraph',
      text: 'Una parte de la luz puede atravesar un material. A este proceso se le denomina transmisión. Un mismo material puede: reflejar una parte; absorber otra; transmitir otra. Por eso, la energía incidente puede distribuirse entre diferentes procesos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre comportamiento de la luz: identifica si la luz permanece o cambia de medio; localiza la normal; mide mentalmente los ángulos respecto de la normal; distingue reflexión de refracción; identifica si se separan colores; analiza si parte de la energía es absorbida; usa el diagrama y los datos antes de elegir el fenómeno.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué fenómeno está siendo estudiado principalmente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Refracción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reflexión.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Dispersión.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Absorción.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La luz incide sobre una superficie y cambia de dirección permaneciendo en el mismo medio, lo que corresponde a reflexión.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: 'Respecto de qué línea se miden los ángulos de incidencia y reflexión?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'De la superficie reflectante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Del borde del espejo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'De cualquier línea paralela al rayo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'De la normal a la superficie.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los ángulos de incidencia y reflexión se definen respecto de la línea normal.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué relación muestran los datos de los cuatro ensayos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El ángulo de incidencia es igual al ángulo de reflexión.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El ángulo de reflexión siempre es el doble del de incidencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El ángulo de incidencia disminuye cuando aumenta el de reflexión.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos ángulos suman siempre 45°.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En cada ensayo ambos ángulos tienen el mismo valor, de acuerdo con la ley de la reflexión.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Si en un nuevo ensayo el ángulo de incidencia fuera 40°, ¿qué ángulo de reflexión se esperaría?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '20°.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '80°.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40°.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '140°.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ley de la reflexión establece que ambos ángulos son iguales cuando se miden respecto de la normal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Un segundo estudiante mide 30° entre el rayo incidente y la superficie. ¿Cuál sería el ángulo de incidencia correcto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '30°.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '60°.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '90°.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '120°.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La normal forma 90° con la superficie. Si el rayo forma 30° con la superficie, forma 60° con la normal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué fenómeno ocurre cuando el rayo cambia de dirección al entrar al bloque?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Refracción.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Reflexión difusa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Absorción total.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Interferencia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La refracción ocurre cuando la luz cambia su rapidez y puede cambiar de dirección al pasar entre medios.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué cambio experimenta la luz al pasar desde el aire hacia el bloque descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumenta su rapidez.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Su frecuencia se vuelve cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desaparece su longitud de onda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Disminuye su rapidez.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La situación indica explícitamente que la rapidez de propagación es menor dentro del bloque.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué el rayo se desvía hacia la normal al entrar al bloque?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque aumenta su frecuencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la luz deja de ser electromagnética.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque entra a un medio donde su rapidez es menor.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque el ángulo de incidencia siempre debe ser cero.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando la luz entra oblicuamente a un medio donde se propaga más lentamente, puede desviarse hacia la normal.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué fenómeno explica que la luz blanca se separe en varios colores?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Reflexión regular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dispersión.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Absorción completa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Polarización exclusivamente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La dispersión ocurre porque diferentes longitudes de onda pueden refractarse en distinta medida.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál afirmación integra correctamente lo observado en ambos experimentos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La reflexión y la refracción requieren que la luz desaparezca temporalmente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La luz siempre mantiene la misma rapidez en cualquier medio.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La dispersión ocurre porque todos los colores poseen exactamente la misma interacción con el material.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Al cambiar de medio, la rapidez y longitud de onda de la luz pueden cambiar sin modificar su frecuencia, y distintas longitudes de onda pueden desviarse en diferente magnitud.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la refracción la frecuencia se conserva, mientras la rapidez y la longitud de onda pueden cambiar; la dependencia de la desviación con la longitud de onda permite explicar la dispersión.',
        },
      ],
    },
  ],
};

export default comportamientoFenomenosLuz;
