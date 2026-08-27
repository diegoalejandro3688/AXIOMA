// CONTENT-H3A.1 -- Corrección editorial de Historia R8. El source anterior
// (escrito en CONTENT-H3A) divergía casi por completo de la fuente
// editorial APPROVED original -- este archivo transcribe verbatim el
// contenido editorial autoritativo recuperado desde el transcript de la
// sesión de CONTENT-H3A. taxonomy/resourceKey/questionKey/order sin
// cambios respecto de la versión anterior.
//
// Answer keys: R8 -- B D A C B A C D B C.
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const textoA: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto A — Una competencia que llegó hasta el espacio' },
  { type: 'paragraph', text: 'En octubre de 1957, la Unión Soviética puso en órbita el primer satélite artificial. El acontecimiento tuvo una enorme repercusión internacional.' },
  {
    type: 'paragraph',
    text: 'Desde un punto de vista científico, demostraba la capacidad de desarrollar nuevas tecnologías de lanzamiento. Pero en el contexto de la Guerra Fría, su significado iba mucho más allá.',
  },
  {
    type: 'paragraph',
    text: 'Si un país podía colocar un objeto en órbita, también demostraba poseer conocimientos aplicables a sistemas de misiles de largo alcance. Por ello, el avance soviético generó preocupación en Estados Unidos.',
  },
  { type: 'paragraph', text: 'La respuesta estadounidense incluyó nuevas inversiones en educación científica, investigación tecnológica y programas espaciales.' },
  {
    type: 'paragraph',
    text: 'A partir de entonces, cada avance fue presentado como una prueba de capacidad nacional. Satélites, viajes tripulados y finalmente la llegada estadounidense a la Luna en 1969 adquirieron un enorme valor simbólico.',
  },
  { type: 'paragraph', text: 'Millones de personas observaron estos acontecimientos a través de medios de comunicación.' },
  {
    type: 'paragraph',
    text: 'La carrera espacial fue, por tanto, una competencia científica real, pero también una herramienta mediante la cual ambas potencias buscaban demostrar la superioridad de sus sistemas políticos y económicos.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Una guerra local dentro de una rivalidad global' },
  {
    type: 'paragraph',
    text: 'A comienzos de la década de 1960, un país asiático estaba dividido políticamente y enfrentaba un conflicto armado que tenía raíces anteriores a la intervención directa de las grandes potencias.',
  },
  { type: 'paragraph', text: 'Los grupos enfrentados tenían proyectos distintos sobre la organización política del país y contaban con apoyos sociales propios.' },
  { type: 'paragraph', text: 'Sin embargo, la Guerra Fría modificó profundamente la escala del conflicto.' },
  {
    type: 'paragraph',
    text: 'Estados Unidos comenzó a proporcionar apoyo creciente a uno de los gobiernos involucrados, al considerar que su derrota podía ampliar la influencia comunista en la región.',
  },
  { type: 'paragraph', text: 'La Unión Soviética y China, por su parte, entregaron diferentes formas de respaldo al sector contrario.' },
  { type: 'paragraph', text: 'Con el tiempo, el conflicto se convirtió en una guerra de gran magnitud.' },
  { type: 'paragraph', text: 'Aun así, describirlo únicamente como un enfrentamiento entre Estados Unidos y la Unión Soviética sería incompleto.' },
  { type: 'paragraph', text: 'Los actores locales poseían sus propias motivaciones políticas, experiencias históricas y objetivos nacionales.' },
  {
    type: 'paragraph',
    text: 'El caso muestra cómo la competencia entre superpotencias podía incorporarse a conflictos existentes y transformarlos, sin ser necesariamente su única causa.',
  },
];

const guerraFria: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 8,
  title: 'Guerra Fría: confrontación ideológica y manifestaciones',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la Guerra Fría como una confrontación global entre Estados Unidos y la Unión Soviética, reconociendo sus dimensiones ideológicas, políticas, económicas, militares y culturales, así como sus manifestaciones indirectas en distintos territorios y su impacto sobre el orden internacional de la segunda mitad del siglo XX.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Guerra Fría: confrontación ideológica y manifestaciones' },

    { type: 'heading', level: 2, text: '1. ¿Qué fue la Guerra Fría?' },
    {
      type: 'paragraph',
      text: 'La Guerra Fría fue una confrontación prolongada entre Estados Unidos y la Unión Soviética, y los bloques políticos que se organizaron en torno a ellos. No consistió en una guerra directa y permanente entre ambas potencias, sino en una competencia global que se expresó de múltiples formas.',
    },

    { type: 'heading', level: 2, text: '2. Dos proyectos ideológicos' },
    {
      type: 'paragraph',
      text: 'Estados Unidos representaba un modelo asociado a capitalismo, propiedad privada, democracia liberal y economías de mercado. La Unión Soviética representaba un modelo asociado a socialismo de Estado, propiedad estatal de sectores productivos, partido único y planificación económica. La confrontación no fue solo militar: también fue una disputa sobre cómo organizar la sociedad.',
    },

    { type: 'heading', level: 2, text: '3. Bloques y alianzas' },
    {
      type: 'paragraph',
      text: 'Durante la Guerra Fría se consolidaron alianzas político-militares. En Occidente destacó la OTAN. En el bloque soviético se organizó el Pacto de Varsovia. Estas alianzas reflejaban la división del mundo en zonas de influencia.',
    },

    { type: 'heading', level: 2, text: '4. Carrera armamentista' },
    {
      type: 'paragraph',
      text: 'Estados Unidos y la Unión Soviética desarrollaron enormes arsenales militares. La existencia de armas nucleares generó una situación paradójica: ambas potencias podían destruir al adversario; una guerra directa podía tener consecuencias catastróficas; eso contribuía a evitar un enfrentamiento directo a gran escala. La amenaza nuclear fue un elemento central del período.',
    },

    { type: 'heading', level: 2, text: '5. Conflictos indirectos' },
    {
      type: 'paragraph',
      text: 'Aunque Estados Unidos y la URSS evitaron enfrentarse directamente en una guerra total, apoyaron a distintos actores en conflictos regionales. Esto ocurrió, por ejemplo, en Corea, Vietnam, Afganistán y diferentes regiones de África y América Latina. A estos enfrentamientos se les suele llamar guerras por delegación o conflictos indirectos.',
    },

    { type: 'heading', level: 2, text: '6. Competencia económica y tecnológica' },
    {
      type: 'paragraph',
      text: 'La rivalidad también se expresó en modelos económicos, desarrollo industrial, tecnología, carrera espacial y ciencia. El lanzamiento de satélites y la llegada a la Luna tuvieron también un significado político y propagandístico.',
    },

    { type: 'heading', level: 2, text: '7. Propaganda y cultura' },
    {
      type: 'paragraph',
      text: 'Ambos bloques intentaron presentar su sistema como superior. Utilizaron cine, radio, prensa, educación, deportes, exposiciones y propaganda. La cultura se convirtió así en otro espacio de competencia.',
    },

    { type: 'heading', level: 2, text: '8. Crisis internacionales' },
    {
      type: 'paragraph',
      text: 'Hubo momentos en que la tensión estuvo cerca de convertirse en un enfrentamiento directo. Uno de los casos más conocidos fue la Crisis de los Misiles de Cuba de 1962. La posibilidad de una guerra nuclear mostró los riesgos del conflicto bipolar.',
    },

    { type: 'heading', level: 2, text: '9. Un mundo más complejo que dos bloques' },
    {
      type: 'paragraph',
      text: 'Aunque Estados Unidos y la Unión Soviética dominaron gran parte del sistema internacional, muchos países buscaron mantener cierta autonomía. Algunos participaron en movimientos que intentaban evitar una alineación completa con cualquiera de las dos superpotencias. Además, los conflictos locales tenían causas propias y no pueden explicarse únicamente como extensiones de la rivalidad entre Washington y Moscú.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre Guerra Fría: identifica qué bloque o modelo aparece; distingue conflicto directo de indirecto; observa componentes ideológicos; analiza propaganda y competencia cultural; reconoce la dimensión nuclear; identifica intereses locales además de internacionales; evita reducir todo conflicto del período a una única causa bipolar.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué acontecimiento de 1957 aparece descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La llegada del ser humano a la Luna.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El lanzamiento soviético del primer satélite artificial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La creación de la ONU.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La disolución de la Unión Soviética.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto se refiere al lanzamiento del Sputnik, primer satélite artificial puesto en órbita por la Unión Soviética en 1957.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el lanzamiento del satélite generó preocupación en Estados Unidos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque significaba el fin inmediato de la carrera espacial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque demostraba que la Unión Soviética había abandonado el desarrollo militar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque impedía cualquier avance científico estadounidense.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la tecnología espacial podía relacionarse también con el desarrollo de misiles de largo alcance.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La tecnología utilizada para lanzar objetos al espacio tenía también implicancias militares, especialmente en el desarrollo de misiles.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué dimensión de la Guerra Fría se evidencia principalmente en la carrera espacial?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La competencia tecnológica y propagandística entre las superpotencias.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la rivalidad ideológica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cooperación militar permanente entre ambos bloques.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El fin de la competencia científica.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los avances espaciales eran logros científicos, pero también se utilizaban para demostrar capacidad tecnológica y prestigio político.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué los logros científicos podían convertirse en herramientas políticas durante la Guerra Fría?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque los científicos controlaban directamente los gobiernos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque la investigación espacial eliminó las diferencias ideológicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque cada bloque podía presentarlos como evidencia de la superioridad de su propio sistema.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque la tecnología dejó de tener aplicaciones militares.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los avances tecnológicos se incorporaron a la competencia propagandística entre Estados Unidos y la Unión Soviética.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión sintetiza mejor la importancia de la carrera espacial dentro de la Guerra Fría?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fue una competencia exclusivamente científica sin relación con la rivalidad política.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Combinó desarrollo científico, capacidad estratégica y propaganda dentro de una confrontación más amplia entre sistemas rivales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demostró que Estados Unidos y la Unión Soviética habían abandonado cualquier competencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fue la principal causa de todos los conflictos militares del período.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La carrera espacial reunió ciencia, tecnología militar, prestigio internacional e ideología, convirtiéndose en una expresión significativa de la competencia global.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué característica de la Guerra Fría aparece representada en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El apoyo de las superpotencias a actores distintos dentro de conflictos regionales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de cualquier conflicto local.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La formación de un único gobierno mundial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El enfrentamiento militar directo permanente entre Estados Unidos y la URSS.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una manifestación frecuente de la Guerra Fría fue el respaldo de las superpotencias a distintos sectores en conflictos regionales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué sería incorrecto explicar el conflicto descrito únicamente mediante la rivalidad entre Estados Unidos y la Unión Soviética?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna potencia extranjera intervino.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el conflicto ocurrió antes del siglo XX.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los actores locales también tenían causas, intereses y proyectos políticos propios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque ambos bloques apoyaban exactamente al mismo sector.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La rivalidad global influyó sobre el conflicto, pero interactuó con procesos políticos y sociales locales preexistentes.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué efecto tuvo la intervención de las potencias sobre el conflicto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminó inmediatamente las diferencias políticas locales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Terminó rápidamente con las hostilidades.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impidió cualquier ayuda militar externa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumentó su escala al aportar recursos y apoyo a los sectores enfrentados.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El respaldo externo proporcionó mayores capacidades a los actores involucrados y contribuyó a intensificar el enfrentamiento.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué concepto describe mejor una situación en que dos grandes potencias respaldan bandos distintos sin enfrentarse directamente entre sí?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Descolonización negociada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Conflicto indirecto o guerra por delegación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Estado de bienestar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Integración económica regional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las guerras por delegación permitían a las superpotencias competir indirectamente apoyando actores locales o regionales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál interpretación explica mejor la relación entre la Guerra Fría y los conflictos regionales?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todos los conflictos regionales fueron creados completamente por las superpotencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La rivalidad entre Estados Unidos y la URSS no tuvo ningún efecto sobre guerras locales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La confrontación global podía intensificar y modificar conflictos con causas propias, integrándolos a una disputa internacional más amplia.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La Guerra Fría eliminó las motivaciones políticas de los actores locales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La competencia bipolar podía transformar conflictos existentes mediante apoyo político, económico o militar, pero no anulaba las causas y objetivos de los actores locales.' },
      ],
    },
  ],
};

export default guerraFria;
