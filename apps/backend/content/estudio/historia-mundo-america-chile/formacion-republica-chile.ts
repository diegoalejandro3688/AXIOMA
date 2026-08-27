// CONTENT-H1A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 3. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts.
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
  { type: 'heading', level: 3, text: 'Texto A — Ordenar la República' },
  { type: 'paragraph', text: 'En 1834, un dirigente político chileno justificaba ante otros representantes la necesidad de fortalecer las nuevas instituciones:' },
  { type: 'paragraph', text: 'Hemos conquistado nuestra independencia, pero conquistarla no ha sido lo mismo que aprender a gobernarnos.' },
  {
    type: 'paragraph',
    text: 'Durante años hemos redactado reglamentos y constituciones mientras los gobiernos cambiaban y las disputas entre grupos impedían establecer una dirección permanente.',
  },
  { type: 'paragraph', text: 'Una República no puede sostenerse si cada autoridad desconoce a la siguiente o si cada conflicto termina poniendo en duda la existencia misma del gobierno.' },
  { type: 'paragraph', text: 'Necesitamos leyes estables, instituciones que puedan hacerlas cumplir y una autoridad ejecutiva capaz de mantener el orden.' },
  { type: 'paragraph', text: 'Esto no significa que el gobernante deba encontrarse por encima de la ley. Significa que las instituciones republicanas requieren fuerza suficiente para funcionar.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Una República con participación limitada' },
  {
    type: 'paragraph',
    text: 'Durante la primera mitad del siglo XIX, Chile fue consolidando instituciones republicanas que diferenciaban al nuevo Estado del orden monárquico colonial.',
  },
  {
    type: 'paragraph',
    text: 'Existían constituciones, autoridades civiles, congresos y elecciones. La soberanía ya no se justificaba en nombre de un rey extranjero, sino mediante un nuevo orden político construido en torno a la República.',
  },
  { type: 'paragraph', text: 'Sin embargo, la existencia de elecciones no significaba que todos los habitantes participaran en ellas.' },
  {
    type: 'paragraph',
    text: 'El derecho a intervenir políticamente estuvo sujeto a condiciones que restringían la ciudadanía electoral. Las mujeres no participaban en las elecciones y amplios sectores de la población permanecían fuera del sistema político.',
  },
  { type: 'paragraph', text: 'La vida pública estaba además fuertemente influida por grupos que contaban con mayores recursos económicos, educación y vínculos sociales.' },
  {
    type: 'paragraph',
    text: 'Al mismo tiempo, el Estado comenzó a promover símbolos, celebraciones y relatos vinculados con la independencia y la nueva República. Estas prácticas ayudaban a presentar a la población como parte de una comunidad nacional común.',
  },
  {
    type: 'paragraph',
    text: 'De esta manera, la construcción republicana chilena combinó instituciones nuevas y una nueva legitimidad política con importantes continuidades sociales y restricciones a la participación.',
  },
];

const formacionRepublicaChile: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 3,
  title: 'Formación de la República de Chile',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales características políticas y culturales del proceso de formación de la República de Chile durante la primera mitad del siglo XIX, reconociendo los debates sobre organización del Estado, autoridad, constituciones, ciudadanía y construcción de un nuevo orden republicano después de la independencia.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Formación de la República de Chile' },

    { type: 'heading', level: 2, text: '1. Independencia no significó República consolidada' },
    {
      type: 'paragraph',
      text: 'La independencia rompió el vínculo político con la monarquía española, pero eso no resolvió automáticamente cómo debía organizarse el nuevo país. Después de la independencia surgieron preguntas fundamentales: ¿quién debía gobernar?; ¿cómo debía distribuirse el poder?; ¿qué instituciones debía tener el Estado?; ¿quiénes podían participar políticamente?; ¿qué relación debía existir entre autoridad y libertad? Por eso, la formación de la República fue un proceso, no un hecho instantáneo.',
    },

    { type: 'heading', level: 2, text: '2. Búsqueda de un nuevo orden político' },
    {
      type: 'paragraph',
      text: 'Durante las primeras décadas del siglo XIX se ensayaron distintas formas de organización. El desafío consistía en reemplazar instituciones coloniales por un sistema político basado en principios republicanos. Esto generó: debates; constituciones; conflictos políticos; cambios institucionales.',
    },

    { type: 'heading', level: 2, text: '3. Las constituciones' },
    {
      type: 'paragraph',
      text: 'Las constituciones intentaban establecer reglas fundamentales para el nuevo Estado. Podían definir: quién ejercía el Poder Ejecutivo; cómo funcionaba el Congreso; requisitos de ciudadanía; mecanismos electorales; relación entre poderes; derechos y obligaciones. La existencia de varios textos constitucionales demuestra que no existía inicialmente un consenso completo sobre cómo organizar la República.',
    },

    { type: 'heading', level: 2, text: '4. Autoridad y orden' },
    {
      type: 'paragraph',
      text: 'Uno de los debates principales fue cuánto poder debía tener el gobierno central. Algunos sectores consideraban necesario un Ejecutivo fuerte para: mantener el orden; consolidar instituciones; evitar conflictos internos; fortalecer al Estado. Otros temían que una autoridad demasiado fuerte pudiera limitar principios republicanos.',
    },

    { type: 'heading', level: 2, text: '5. Liberalismo y conservadurismo' },
    {
      type: 'paragraph',
      text: 'Durante el siglo XIX chileno aparecieron distintas posiciones políticas. De manera general, sectores liberales tendían a defender: mayores libertades; límites al poder; ampliación de espacios de participación; reformas institucionales. Sectores conservadores solían valorar: estabilidad; autoridad; orden; continuidad de determinadas instituciones tradicionales. Estas categorías no fueron completamente rígidas y cambiaron con el tiempo.',
    },

    { type: 'heading', level: 2, text: '6. La Constitución de 1833' },
    {
      type: 'paragraph',
      text: 'La Constitución de 1833 fue fundamental en la organización política chilena del siglo XIX. Entre sus características se encontraba un Poder Ejecutivo fuerte, especialmente en la figura del Presidente. Contribuyó a establecer un período de mayor estabilidad institucional en comparación con las primeras décadas posteriores a la independencia. Pero esa estabilidad coexistió con una participación política bastante restringida.',
    },

    { type: 'heading', level: 2, text: '7. Ciudadanía limitada' },
    {
      type: 'paragraph',
      text: 'La República proclamaba principios de representación y ciudadanía, pero no todas las personas participaban políticamente. El derecho a voto estaba limitado mediante distintos requisitos. Por ejemplo, durante el siglo XIX la participación política estuvo fundamentalmente restringida a determinados sectores masculinos. Esto muestra nuevamente la diferencia entre principios republicanos y participación política efectiva.',
    },

    { type: 'heading', level: 2, text: '8. Construcción cultural de la República' },
    {
      type: 'paragraph',
      text: 'La República también debía construir símbolos e identidades. Se desarrollaron: símbolos patrios; celebraciones; relatos sobre la independencia; educación; instituciones culturales; imágenes de héroes nacionales. Estos elementos ayudaron a fortalecer una identidad política separada del pasado colonial.',
    },

    { type: 'heading', level: 2, text: '9. Continuidad y cambio' },
    {
      type: 'paragraph',
      text: 'La independencia generó importantes cambios políticos, pero varias características sociales y culturales anteriores continuaron. Por eso, la formación republicana debe analizarse mediante dos procesos simultáneos. Cambio: independencia; nuevas instituciones; constituciones; soberanía nacional. Continuidad: jerarquías sociales; influencia de grupos tradicionales; exclusiones políticas.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Cuando analices la formación de la República de Chile: distingue independencia de consolidación republicana; identifica debates institucionales; observa cómo se distribuye el poder; analiza quién puede participar; reconoce continuidad y cambio; relaciona estabilidad con formas de autoridad; evita describir el proceso como completamente democrático desde el comienzo.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es el principal problema que identifica el emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de independencia política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La inestabilidad institucional posterior a la independencia.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de territorio chileno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La falta total de leyes durante el período colonial.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto distingue entre haber conseguido la independencia y haber logrado establecer un gobierno republicano estable.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué solución propone principalmente el emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar todas las instituciones republicanas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fortalecer leyes, instituciones y autoridad ejecutiva.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Restaurar la monarquía española.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Suprimir cualquier forma de gobierno central.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fuente defiende instituciones estables y un Ejecutivo con capacidad para hacer funcionar el nuevo orden político.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué tensión política del período refleja mejor esta fuente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La búsqueda de equilibrio entre autoridad y principios republicanos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El debate entre industrialización y agricultura.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La disputa por la independencia de España, todavía no conseguida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La discusión sobre la eliminación de todas las constituciones.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor defiende una autoridad fuerte, pero aclara que esta debe permanecer sometida a la ley.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué la frase "conquistarla no ha sido lo mismo que aprender a gobernarnos" es históricamente significativa?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque distingue la independencia del proceso posterior de construcción institucional.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque demuestra que Chile continuaba siendo una colonia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque rechaza la existencia de una República.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque sostiene que no existieron conflictos políticos después de la independencia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La independencia creó un nuevo escenario político, pero fue necesario construir instituciones y acuerdos para organizar el Estado.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Con qué característica de la organización republicana chilena de la primera mitad del siglo XIX se relaciona mejor la posición del emisor?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Con la tendencia a fortalecer el Poder Ejecutivo como medio para consolidar el orden institucional.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Con la eliminación completa del gobierno central.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Con la instauración temprana del sufragio universal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Con la subordinación del gobierno chileno a las autoridades coloniales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La preocupación por estabilidad y autoridad se relaciona con la organización institucional consolidada durante las décadas posteriores y con el fortalecimiento del Ejecutivo.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes características muestra un cambio respecto del orden colonial?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La organización de instituciones republicanas como congresos y elecciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La dependencia política respecto de la monarquía española.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación completa de todas las autoridades civiles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia de constituciones.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El nuevo orden político incorporó instituciones republicanas y una legitimidad diferente de la monarquía colonial.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué demuestra el hecho de que existieran elecciones pero amplios sectores no pudieran participar?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Que la existencia de instituciones representativas no implicaba una ciudadanía política universal.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que Chile no tenía ningún sistema político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que todas las personas poseían los mismos derechos políticos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las elecciones reemplazaron completamente las desigualdades sociales.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Las elecciones constituían una práctica republicana, pero la participación estaba restringida.' }],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumplían los símbolos y celebraciones vinculados con la independencia?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Contribuir a construir identidad y pertenencia hacia la nueva República.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Restaurar la identidad colonial española.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminar las instituciones del Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impedir la construcción de una comunidad nacional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Estas prácticas ayudaban a fortalecer una identidad política vinculada con el nuevo Estado nacional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación entre continuidad y cambio presenta el texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Cambiaron las instituciones políticas, pero continuaron importantes desigualdades y exclusiones sociales.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Nada cambió después de la independencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas las desigualdades desaparecieron inmediatamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las instituciones coloniales se mantuvieron exactamente iguales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto muestra transformaciones institucionales junto con la persistencia de exclusiones políticas y diferencias sociales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál interpretación describe mejor el proceso de formación de la República de Chile durante la primera mitad del siglo XIX?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Fue un proceso de construcción institucional y cultural que estableció un nuevo orden republicano, aunque con participación política restringida y continuidades sociales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Consistió únicamente en declarar la independencia y no requirió transformaciones posteriores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Creó desde el comienzo una democracia de participación universal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mantuvo intacta la legitimidad monárquica y las instituciones coloniales.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La República implicó nuevas instituciones, formas de legitimidad e identidad política, pero coexistió con límites importantes a la ciudadanía y continuidades respecto de la sociedad anterior.',
        },
      ],
    },
  ],
};

export default formacionRepublicaChile;
