// CONTENT-L3A -- Golden Unit Lenguaje / Evaluar, Recurso 2. Contenido
// editorial APROBADO externamente. Mismo criterio de ajustes técnicos que
// proposito-intencion-actitud.ts.
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
  { type: 'heading', level: 3, text: 'Texto A — La ventana del cuarto piso' },
  {
    type: 'paragraph',
    text: 'Cuando llegué al edificio por primera vez, pensé que la calle era demasiado ruidosa. Desde la ventana del cuarto piso veía buses detenerse cada pocos minutos, vendedores instalando sus puestos y personas cruzando apresuradamente antes de que cambiara la luz.',
  },
  {
    type: 'paragraph',
    text: 'Yo venía de una casa ubicada al final de una calle pequeña donde, después de las ocho de la noche, apenas pasaba algún automóvil. Durante las primeras semanas, cada bocina me parecía innecesaria y cada conversación en la vereda, demasiado fuerte.',
  },
  { type: 'paragraph', text: 'Mi vecino Sergio decía lo contrario.' },
  { type: 'paragraph', text: '—Aquí siempre está pasando algo —comentaba cuando coincidíamos en el ascensor.' },
  {
    type: 'paragraph',
    text: 'Él había vivido en el edificio desde niño. Conocía al dueño del quiosco, saludaba a los conductores de algunos buses y podía decir qué días llegaba el vendedor de plantas.',
  },
  { type: 'paragraph', text: 'Yo, en cambio, solo veía movimiento.' },
  {
    type: 'paragraph',
    text: 'Una tarde se cortó la electricidad en varias cuadras. Los semáforos dejaron de funcionar y los negocios comenzaron a cerrar antes de lo habitual. Sin música, motores ni luces, la calle quedó extrañamente quieta.',
  },
  { type: 'paragraph', text: 'Me senté junto a la ventana.' },
  { type: 'paragraph', text: 'Después de unos minutos descubrí que el silencio no me resultaba tan agradable como había imaginado.' },
  {
    type: 'paragraph',
    text: 'Cuando volvió la electricidad, también regresaron poco a poco los sonidos: primero una alarma, luego el motor de un bus y finalmente las voces de quienes salían nuevamente a la calle.',
  },
  {
    type: 'paragraph',
    text: 'Sergio tenía razón en algo. Quizás yo había confundido el ruido con algo completamente ajeno, cuando para muchas personas era simplemente el sonido cotidiano del lugar donde vivían.',
  },
  { type: 'paragraph', text: 'No llegué a amar las bocinas. Pero desde entonces la calle dejó de parecerme únicamente molesta.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — ¿Una ciudad más rápida para quién?' },
  {
    type: 'paragraph',
    text: 'Cada vez que se anuncia una nueva autopista urbana, suele aparecer la promesa de reducir los tiempos de viaje. La idea parece difícil de cuestionar: si los vehículos pueden desplazarse más rápido, todos deberían beneficiarse.',
  },
  { type: 'paragraph', text: 'Sin embargo, esa conclusión depende de a quién se considere dentro de ese "todos".' },
  {
    type: 'paragraph',
    text: 'Para una persona que utiliza automóvil diariamente, una vía más rápida puede significar menos tiempo en ciertos trayectos. Pero para quien se desplaza a pie, en bicicleta o en transporte público, los efectos pueden ser distintos.',
  },
  {
    type: 'paragraph',
    text: 'Una obra diseñada principalmente para aumentar el flujo de automóviles puede ocupar espacio que antes tenía otros usos, modificar recorridos peatonales o dificultar ciertas conexiones entre barrios.',
  },
  {
    type: 'paragraph',
    text: 'Esto no significa que toda infraestructura vial sea negativa. Hay lugares donde mejorar una vía puede resolver problemas reales de seguridad o conectividad. El punto es que medir el éxito exclusivamente por la velocidad de los automóviles deja fuera otras experiencias urbanas.',
  },
  {
    type: 'paragraph',
    text: 'Desde esa perspectiva, sería más útil preguntar no solo cuántos minutos ahorra un conductor, sino también qué ocurre con quienes cruzan la vía, esperan un bus, viven junto a ella o utilizan el espacio público cercano.',
  },
  {
    type: 'paragraph',
    text: 'Una ciudad no es simplemente una red por la que deben circular vehículos con la mayor velocidad posible. Es un lugar compartido por personas que se mueven de maneras diferentes.',
  },
  { type: 'paragraph', text: 'Por eso, evaluar una obra únicamente según el tiempo de viaje de quienes conducen ofrece una imagen incompleta de sus efectos.' },
];

const perspectivaPuntoVista: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA',
  unitCode: 'LENGUAJE.EVALUAR',
  subjectKey: 'lenguaje',
  order: 2,
  title: 'Perspectiva y punto de vista',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar y evaluar la perspectiva o punto de vista desde el cual se presenta un tema, reconociendo cómo las experiencias, creencias, intereses y selecciones del emisor influyen en la representación de hechos, personas o situaciones.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Perspectiva y punto de vista' },

    { type: 'heading', level: 2, text: '1. ¿Qué es la perspectiva?' },
    {
      type: 'paragraph',
      text: 'La perspectiva es el punto de vista desde el cual se presenta una situación. Dos personas pueden observar el mismo hecho y destacar aspectos distintos. Ejemplo: una ciclovía nueva puede ser descrita por una persona que la usa diariamente, un comerciante preocupado por estacionamientos, o un urbanista que analiza movilidad. El hecho es el mismo, pero la perspectiva cambia.',
    },

    { type: 'heading', level: 2, text: '2. Perspectiva no significa necesariamente mentira' },
    {
      type: 'paragraph',
      text: 'Que un texto tenga una perspectiva no significa que sea falso. Significa que el emisor selecciona cierta información, enfatiza determinados aspectos, utiliza ciertas palabras y deja otros elementos en segundo plano. Todo texto se construye desde alguna posición.',
    },

    { type: 'heading', level: 2, text: '3. Experiencias personales' },
    {
      type: 'paragraph',
      text: 'Las experiencias pueden influir en cómo alguien interpreta una situación. Ejemplo: "Después de trabajar diez años en urgencias, considero que..." La experiencia del emisor ayuda a explicar su punto de vista. Esto no demuestra automáticamente que tenga razón, pero sí permite comprender desde dónde habla.',
    },

    { type: 'heading', level: 2, text: '4. Perspectiva en textos narrativos' },
    {
      type: 'paragraph',
      text: 'En literatura, la historia puede estar filtrada por: narrador; personaje; recuerdos; emociones; conocimientos limitados. Si el narrador es un personaje, no necesariamente conoce todo.',
    },

    { type: 'heading', level: 2, text: '5. Narrador y autor no son lo mismo' },
    {
      type: 'paragraph',
      text: 'En un relato ficticio, no debemos asumir que las ideas del narrador corresponden directamente a las del autor real. El narrador es una voz construida dentro del texto.',
    },

    { type: 'heading', level: 2, text: '6. Selección de información' },
    {
      type: 'paragraph',
      text: 'La perspectiva puede aparecer incluso sin palabras claramente valorativas. Si un texto sobre una celebración solo describe basura, ruido y congestión, mientras omite otros aspectos, esa selección contribuye a una representación principalmente negativa.',
    },

    { type: 'heading', level: 2, text: '7. Lenguaje valorativo' },
    {
      type: 'paragraph',
      text: 'Palabras como admirable, absurdo, preocupante, innecesario, extraordinario, pueden revelar con claridad una posición. Pero la perspectiva también puede construirse de forma más sutil.',
    },

    { type: 'heading', level: 2, text: '8. Prejuicios y estereotipos' },
    {
      type: 'paragraph',
      text: 'A veces un texto atribuye características generales a un grupo. Ejemplo: "Los jóvenes nunca se interesan por estos temas." Una afirmación así generaliza y puede reflejar un estereotipo. Debemos distinguir entre información respaldada, opinión y generalización.',
    },

    { type: 'heading', level: 2, text: '9. Comparar perspectivas' },
    {
      type: 'paragraph',
      text: 'Dos textos pueden tratar el mismo tema desde puntos de vista distintos. Uno puede destacar beneficios y otro costos o dificultades. Evaluar ambas perspectivas implica reconocer qué selecciona y enfatiza cada una.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Para reconocer una perspectiva: identifica quién habla; pregunta qué relación tiene con el tema; observa qué información selecciona; identifica palabras valorativas; detecta generalizaciones; considera qué aspectos quedan fuera; formula el punto de vista sin exagerarlo.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué perspectiva tiene inicialmente la narradora sobre la calle?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La considera tranquila y poco concurrida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La percibe principalmente como ruidosa y molesta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La considera idéntica al lugar donde vivía antes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La encuentra peligrosa por falta de habitantes.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al inicio, la narradora destaca buses, bocinas, conversaciones y movimiento como elementos que le resultan molestos.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué Sergio percibe la calle de manera distinta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque nunca había estado en ese barrio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque vive allí desde niño y conoce a muchas personas del sector.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque trabaja conduciendo un bus.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque no escucha los sonidos de la calle.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Su experiencia prolongada y sus vínculos con el barrio hacen que interprete el movimiento como parte natural de la vida del lugar.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué influencia tiene la experiencia anterior de la narradora en su primera impresión?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La lleva a comparar la calle con un entorno mucho más silencioso.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La hace reconocer inmediatamente todas las ventajas del barrio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Le permite conocer a los comerciantes desde el primer día.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evita que note diferencias entre ambos lugares.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La narradora venía de una calle muy tranquila, lo que influye en que perciba con mayor intensidad el ruido del nuevo entorno.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el corte de electricidad en la evolución de la perspectiva de la narradora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Confirma que prefiere completamente el silencio.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Le permite experimentar la ausencia del movimiento que antes criticaba y reconsiderar su valoración.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que Sergio exageraba sobre la actividad del barrio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La convence de mudarse nuevamente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al experimentar una calle casi silenciosa, descubre que la ausencia total de actividad tampoco le resulta agradable.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál describe mejor el cambio de perspectiva de la narradora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Pasa de rechazar todo ruido a considerar que cualquier sonido urbano es positivo.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Pasa de interpretar el movimiento solo como molestia a reconocer que también forma parte de la identidad cotidiana del barrio.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Pasa de admirar el barrio a descubrir sus principales defectos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Pasa de confiar en Sergio a considerar que su visión era completamente equivocada.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La narradora no termina celebrando todos los ruidos, pero amplía su mirada y reconoce que el movimiento también tiene significado para quienes viven allí.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es la perspectiva principal del emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las autopistas urbanas siempre deben eliminarse.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las obras viales deberían evaluarse considerando a distintos usuarios de la ciudad, no solo a conductores.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los automóviles son innecesarios en cualquier ciudad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El transporte público siempre es más rápido que el automóvil.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto cuestiona evaluar una obra únicamente desde la experiencia de quienes conducen y propone considerar otros usuarios.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué aspecto de la expresión "todos deberían beneficiarse" cuestiona el emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que la palabra "todos" puede ocultar experiencias distintas según la forma de desplazamiento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que ninguna persona obtiene beneficios de una autopista.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que todos los habitantes utilizan automóvil.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que las ciudades no deberían medir tiempos de viaje.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El autor cuestiona que el beneficio de los conductores pueda generalizarse automáticamente al conjunto de la población.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el emisor aclara que "no toda infraestructura vial sea negativa"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para mostrar que su perspectiva no consiste en rechazar cualquier obra vial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para abandonar su crítica anterior.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para defender que solo se construyan autopistas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que todas las obras producen los mismos efectos.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La aclaración delimita su postura y evita convertirla en un rechazo absoluto.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué selección de información contribuye más directamente a la perspectiva del emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Considerar únicamente la velocidad de los vehículos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Incluir experiencias de peatones, ciclistas, usuarios de transporte público y residentes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Describir exclusivamente el costo de construir carreteras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar modelos de automóviles.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La inclusión de distintos usuarios sostiene la idea de que una obra debe evaluarse desde múltiples experiencias urbanas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones evalúa con mayor precisión el punto de vista del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Parte de la idea de que toda mejora para conductores perjudica necesariamente al resto de la población.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cuestiona una evaluación centrada solo en conductores y propone ampliar los criterios para considerar efectos sobre distintos usuarios.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Sostiene que la velocidad no debe considerarse nunca al evaluar infraestructura.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Afirma que las autopistas son la principal causa de todos los problemas urbanos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor no rechaza la velocidad ni las obras viales en sí; cuestiona que ese único criterio represente adecuadamente sus efectos sobre toda la ciudad.',
        },
      ],
    },
  ],
};

export default perspectivaPuntoVista;
