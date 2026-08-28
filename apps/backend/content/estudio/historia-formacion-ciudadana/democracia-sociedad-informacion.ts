// CONTENT-H7A -- Historia / U2 "Formación ciudadana", Recurso 20 (order 3 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R20 -- C B A D C A D B C A.
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
  { type: 'heading', level: 3, text: 'Texto A — Una noticia que todos compartían' },
  {
    type: 'paragraph',
    text: 'Durante una campaña electoral comenzó a circular en redes sociales una publicación que afirmaba que una de las candidaturas había propuesto eliminar un beneficio social.',
  },
  { type: 'paragraph', text: 'Miles de personas compartieron la publicación en pocas horas.' },
  { type: 'paragraph', text: 'Algunos usuarios comentaban indignados y otros defendían al candidato señalado.' },
  { type: 'paragraph', text: 'Un grupo de estudiantes decidió revisar la información antes de seguir difundiéndola.' },
  {
    type: 'paragraph',
    text: 'Buscaron el programa oficial de la candidatura y descubrieron que la propuesta descrita en la publicación no aparecía allí.',
  },
  { type: 'paragraph', text: 'Después revisaron distintos medios de comunicación y encontraron que algunos habían desmentido la información.' },
  {
    type: 'paragraph',
    text: 'También observaron que la publicación original no indicaba quién era su autor ni entregaba documentos que respaldaran la afirmación.',
  },
  {
    type: 'paragraph',
    text: 'La experiencia mostró que una información ampliamente difundida podía parecer verdadera simplemente por aparecer repetida muchas veces.',
  },
  {
    type: 'paragraph',
    text: 'Los estudiantes comprendieron que participar responsablemente en una democracia también implicaba evaluar críticamente la información antes de compartirla.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando todos parecían pensar lo mismo' },
  { type: 'paragraph', text: 'Una estudiante utilizaba diariamente una plataforma digital para informarse sobre asuntos públicos.' },
  {
    type: 'paragraph',
    text: 'Con el tiempo notó que la mayoría de las publicaciones que aparecían en su pantalla expresaban opiniones muy parecidas a las suyas.',
  },
  { type: 'paragraph', text: 'Al principio pensó que esto demostraba que casi todas las personas estaban de acuerdo con ella.' },
  {
    type: 'paragraph',
    text: 'Sin embargo, al conversar con compañeros de otros cursos descubrió que ellos veían publicaciones y debates muy diferentes.',
  },
  {
    type: 'paragraph',
    text: 'La estudiante investigó cómo funcionaba la plataforma y comprendió que el sistema seleccionaba contenidos utilizando información sobre sus interacciones anteriores.',
  },
  {
    type: 'paragraph',
    text: 'Decidió comenzar a consultar medios distintos, revisar documentos originales y buscar deliberadamente argumentos con los que no estaba de acuerdo.',
  },
  { type: 'paragraph', text: 'No cambió necesariamente sus opiniones, pero comprendió mejor las razones que sostenían otras posiciones.' },
  {
    type: 'paragraph',
    text: 'La experiencia le permitió distinguir entre tener una opinión propia y asumir que esa opinión representaba automáticamente a toda la sociedad.',
  },
];

const democraciaSociedadInformacion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION',
  unitCode: 'HISTORIA.FORMACION_CIUDADANA',
  subjectKey: 'historia',
  order: 3,
  title: 'Democracia en la sociedad de la información',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo la sociedad de la información transforma la participación democrática, reconociendo las oportunidades que ofrecen los medios digitales para acceder a información y participar en asuntos públicos, así como los desafíos asociados a la desinformación, la circulación de contenidos engañosos, la formación de opiniones y la evaluación crítica de las fuentes.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Democracia en la sociedad de la información' },

    { type: 'heading', level: 2, text: '1. ¿Qué es la sociedad de la información?' },
    {
      type: 'paragraph',
      text: 'La sociedad de la información se caracteriza por la producción, circulación y acceso masivo a información mediante tecnologías digitales. Actualmente, noticias, opiniones, documentos y debates públicos pueden difundirse en pocos segundos. Esto ha transformado la manera en que las personas: se informan, participan, debaten, organizan acciones colectivas y forman opiniones.',
    },

    { type: 'heading', level: 2, text: '2. Más acceso a información' },
    {
      type: 'paragraph',
      text: 'Internet permite acceder a grandes cantidades de información. Esto puede fortalecer la democracia porque facilita: conocer decisiones públicas, consultar datos, comparar posiciones, seguir debates políticos y acceder a distintas fuentes. Sin embargo, tener más información disponible no significa necesariamente estar mejor informado.',
    },

    { type: 'heading', level: 2, text: '3. Libertad de expresión y participación' },
    {
      type: 'paragraph',
      text: 'Las plataformas digitales permiten que muchas personas expresen opiniones y participen en debates públicos. También pueden utilizarse para: organizar campañas, difundir peticiones, denunciar problemas, convocar actividades y compartir propuestas. Esto amplía las posibilidades de participación ciudadana.',
    },

    { type: 'heading', level: 2, text: '4. Desinformación' },
    {
      type: 'paragraph',
      text: 'La rapidez con que circula la información también puede facilitar la difusión de contenidos falsos o engañosos. La desinformación puede alterar la comprensión de hechos públicos y afectar la toma de decisiones ciudadanas. Por eso, es importante verificar: fuente, autoría, fecha, evidencia y contexto.',
    },

    { type: 'heading', level: 2, text: '5. Diferenciar información y opinión' },
    {
      type: 'paragraph',
      text: 'Una opinión expresa una interpretación o valoración. Una afirmación factual sostiene que algo ocurrió o existe y puede requerir evidencia. En una democracia es legítimo expresar opiniones diferentes, pero eso no significa que todas las afirmaciones sobre hechos posean el mismo respaldo.',
    },

    { type: 'heading', level: 2, text: '6. Algoritmos y visibilidad' },
    {
      type: 'paragraph',
      text: 'Las plataformas digitales no muestran necesariamente todos los contenidos de la misma manera. Los algoritmos pueden seleccionar qué publicaciones aparecen con mayor frecuencia según distintos criterios. Esto puede influir en: qué información vemos, qué temas parecen importantes y qué posiciones encontramos repetidamente. Por eso, conviene buscar fuentes diversas.',
    },

    { type: 'heading', level: 2, text: '7. Cámaras de eco' },
    {
      type: 'paragraph',
      text: 'Cuando una persona recibe principalmente contenidos similares a sus propias opiniones, puede formarse una cámara de eco. En ella, ciertas ideas se repiten constantemente mientras otras perspectivas aparecen poco o nada. Esto puede dificultar el diálogo entre grupos con opiniones distintas.',
    },

    { type: 'heading', level: 2, text: '8. Medios de comunicación y democracia' },
    {
      type: 'paragraph',
      text: 'Los medios cumplen funciones importantes: informar, investigar, fiscalizar, difundir debates y permitir circulación de distintas perspectivas. Por eso, libertad de prensa y pluralismo informativo son relevantes para una sociedad democrática.',
    },

    { type: 'heading', level: 2, text: '9. Ciudadanía digital responsable' },
    {
      type: 'paragraph',
      text: 'La participación democrática digital también exige responsabilidad. Antes de compartir información conviene: revisar la fuente, buscar confirmación, distinguir hechos de opiniones, evitar difundir contenidos engañosos y respetar derechos de otras personas. La velocidad no debe reemplazar el análisis crítico.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente digital: identifica quién produce el contenido; revisa qué evidencia presenta; distingue hecho de opinión; considera posibles intereses o perspectivas; compara con otras fuentes; analiza cómo circula la información; evita asumir que popularidad equivale a veracidad.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema aparece principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La prohibición completa de las redes sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la participación política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La difusión rápida de una información posiblemente falsa o engañosa.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La falta absoluta de acceso a programas políticos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto muestra cómo una afirmación sin respaldo puede difundirse ampliamente y afectar el debate público.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué acción realizaron los estudiantes para verificar la publicación?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La compartieron inmediatamente con más personas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consultaron el programa oficial y otras fuentes informativas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Decidieron creerla porque era popular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evitaron revisar cualquier documento.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los estudiantes contrastaron la publicación con fuentes oficiales y medios que habían revisado la afirmación.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el número de veces que una publicación es compartida no demuestra necesariamente que sea verdadera?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque popularidad y evidencia son criterios diferentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna información digital puede ser verdadera.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque solo las autoridades pueden comunicar hechos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las redes sociales impiden verificar fuentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Que muchas personas repitan una afirmación no constituye por sí mismo evidencia de que esa afirmación sea correcta.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué elemento disminuía la confiabilidad de la publicación original?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que tratara un tema político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que hubiera sido leída por estudiantes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que existieran opiniones diferentes sobre ella.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que no identificara autor ni presentara evidencia que respaldara su afirmación.' },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La ausencia de autoría identificable y evidencia verificable dificulta evaluar la credibilidad de una fuente.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál conclusión relaciona mejor el caso con la calidad de la democracia?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Para proteger la democracia debe impedirse que los ciudadanos compartan opiniones.' },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda información difundida por medios tradicionales es necesariamente verdadera.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Una ciudadanía capaz de verificar y contrastar información está mejor preparada para tomar decisiones políticas informadas.',
          },
          correct: true,
        },
        {
          content: { type: 'paragraph', order: 0, text: 'La democracia funciona mejor cuando las personas reciben una sola fuente de información.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La deliberación democrática mejora cuando las personas pueden distinguir afirmaciones respaldadas de contenidos engañosos y tomar decisiones con mayor información.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué fenómeno aparece principalmente descrito?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La exposición frecuente a contenidos similares a las opiniones previas de la estudiante.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición completa de los algoritmos digitales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de consultar medios distintos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de opiniones políticas diferentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La estudiante recibía principalmente contenidos similares a sus preferencias anteriores, una situación relacionada con las cámaras de eco.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué error inicial cometió la estudiante?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Pensar que existían distintas opiniones políticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar diferentes medios de comunicación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Buscar documentos originales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Suponer que los contenidos que veía representaban necesariamente la opinión de toda la sociedad.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Su experiencia digital estaba seleccionada y no constituía una muestra completa de las opiniones existentes en la sociedad.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué consultar fuentes distintas puede fortalecer el análisis ciudadano?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque garantiza que todas las personas lleguen a la misma conclusión.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permite conocer información y perspectivas que podrían no aparecer en el entorno habitual de una persona.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque elimina automáticamente cualquier información falsa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque hace innecesario evaluar la evidencia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Diversificar las fuentes ayuda a contrastar perspectivas y reduce la dependencia de un entorno informativo limitado.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre algoritmos y opinión pública puede inferirse?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los algoritmos determinan de manera absoluta lo que cada persona debe pensar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las plataformas siempre muestran todos los puntos de vista por igual.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La selección de contenidos puede influir en qué temas y perspectivas resultan más visibles para una persona.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los algoritmos eliminan cualquier posibilidad de participación democrática.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los sistemas de recomendación pueden influir en la exposición a determinados contenidos, aunque no determinan automáticamente las opiniones de los usuarios.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál práctica representa mejor una ciudadanía democrática responsable dentro de la sociedad de la información?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar fuentes, evaluar evidencia, reconocer distintas perspectivas y participar sin asumir que popularidad o repetición equivalen a verdad.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Compartir cualquier publicación que confirme las propias opiniones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evitar toda información que presente perspectivas diferentes.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Considerar que los algoritmos sustituyen la necesidad de análisis crítico.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La participación democrática en entornos digitales requiere evaluar críticamente la información y exponerse a fuentes y perspectivas diversas.',
        },
      ],
    },
  ],
};

export default democraciaSociedadInformacion;
