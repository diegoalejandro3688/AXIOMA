// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 5. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md).
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
  { type: 'heading', level: 3, text: 'Texto A — La luz del taller' },
  {
    type: 'paragraph',
    text: 'Durante años, el taller de don Ernesto había sido uno de los lugares más ruidosos de la calle. Desde temprano se escuchaban martillos, sierras y conversaciones que se mezclaban con el sonido de la radio.',
  },
  { type: 'paragraph', text: 'Pero aquel invierno el movimiento comenzó a apagarse.' },
  {
    type: 'paragraph',
    text: 'Primero fueron menos los encargos. Después, Ernesto dejó de abrir los sábados. Algunas semanas, incluso cerraba antes de que oscureciera.',
  },
  {
    type: 'paragraph',
    text: 'Su nieta Camila, que pasaba por allí al volver del colegio, empezó a notarlo. Una tarde entró y encontró a su abuelo sentado junto al mesón, revisando una libreta de cuentas.',
  },
  { type: 'paragraph', text: '—Ha estado lento —dijo él, sin levantar mucho la mirada.' },
  {
    type: 'paragraph',
    text: 'Camila observó las estanterías. Varias piezas terminadas esperaban desde hacía semanas a que sus dueños regresaran por ellas.',
  },
  {
    type: 'paragraph',
    text: 'Durante los días siguientes comenzó a tomar fotografías de algunos muebles que Ernesto había restaurado. También escribió breves descripciones y las publicó en una página comunitaria del barrio.',
  },
  {
    type: 'paragraph',
    text: 'Al principio, la respuesta fue tibia: un par de comentarios y pocas consultas. Sin embargo, una vecina compartió una de las publicaciones y luego otra persona hizo lo mismo.',
  },
  {
    type: 'paragraph',
    text: 'En menos de dos semanas comenzaron a llegar mensajes desde otros sectores de la ciudad. Algunos preguntaban por reparaciones y otros querían saber si Ernesto podía fabricar muebles a pedido.',
  },
  {
    type: 'paragraph',
    text: 'El taller no volvió a ser exactamente como antes, pero las mañanas dejaron de ser silenciosas. Ernesto volvió a encender la radio y Camila, al pasar por la calle, veía nuevamente la luz encendida hasta entrada la tarde.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Cuando "rápido" no significa "mejor"' },
  {
    type: 'paragraph',
    text: 'Estamos acostumbrados a valorar la velocidad. Un mensaje que llega en segundos, una compra entregada al día siguiente o una búsqueda que responde inmediatamente suelen percibirse como mejoras evidentes.',
  },
  { type: 'paragraph', text: 'Sin embargo, esa lógica no funciona igual en todos los procesos.' },
  {
    type: 'paragraph',
    text: 'Aprender una habilidad compleja, por ejemplo, suele exigir períodos de práctica en los que el progreso es poco visible. Durante esos momentos, puede parecer que el esfuerzo está estancado, aunque internamente se estén formando conexiones y estrategias nuevas.',
  },
  {
    type: 'paragraph',
    text: 'Algo semejante ocurre en ciertas investigaciones científicas. Repetir experimentos, verificar resultados y revisar errores puede parecer un camino lento, pero esa lentitud cumple una función: reducir la posibilidad de aceptar conclusiones apresuradas.',
  },
  {
    type: 'paragraph',
    text: 'Por eso, llamar "ineficiente" a todo proceso que tarda puede ser engañoso. La eficiencia no siempre consiste en completar una tarea en el menor tiempo posible, sino en utilizar adecuadamente los recursos para alcanzar un resultado confiable.',
  },
  {
    type: 'paragraph',
    text: 'Esto no significa que la lentitud sea automáticamente una virtud. Un procedimiento puede retrasarse por mala organización, falta de recursos o decisiones innecesarias. El punto es que el tiempo, por sí solo, no basta para evaluar la calidad de un proceso.',
  },
  {
    type: 'paragraph',
    text: 'En algunos casos, intentar acortar camino elimina justamente las etapas que permiten detectar errores. La rapidez, entonces, deja de ser una ventaja si obliga a sacrificar precisión, comprensión o seguridad.',
  },
  { type: 'paragraph', text: 'La pregunta útil no es simplemente "¿cuánto demora?", sino "¿qué función cumple ese tiempo dentro del proceso?".' },
];

const significadoContexto: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 5,
  title: 'Significado de palabras y expresiones en contexto',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá determinar el significado de palabras y expresiones a partir del contexto, reconociendo claves semánticas, usos figurados, matices y sustituciones léxicas pertinentes sin depender únicamente de una definición de diccionario.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Significado de palabras y expresiones en contexto' },

    { type: 'heading', level: 2, text: '1. El contexto modifica el significado' },
    {
      type: 'paragraph',
      text: 'Una misma palabra puede significar cosas distintas según cómo se use. Ejemplo: "El río corre entre las montañas." Aquí "corre" significa que fluye. En cambio: "Antonia corre todas las mañanas." Aquí significa desplazarse rápidamente a pie. La palabra es la misma, pero el contexto cambia su sentido.',
    },

    { type: 'heading', level: 2, text: '2. No basta con conocer una definición' },
    {
      type: 'paragraph',
      text: 'En Competencia Lectora importa identificar qué significa la expresión dentro de ese texto específico. Si una palabra tiene varios significados posibles, debemos elegir el que: encaje con la oración; sea coherente con el párrafo; mantenga el sentido global.',
    },

    { type: 'heading', level: 2, text: '3. Claves cercanas' },
    {
      type: 'paragraph',
      text: 'Muchas veces el propio texto entrega pistas. Ejemplo: "El sendero era estrecho: apenas permitía que dos personas caminaran lado a lado." La explicación posterior ayuda a comprender "estrecho".',
    },

    { type: 'heading', level: 2, text: '4. Claves distribuidas' },
    {
      type: 'paragraph',
      text: 'La pista también puede aparecer varias oraciones antes o después. Por eso, ante una palabra desconocida, conviene leer: la oración completa; la anterior; la siguiente; y, si es necesario, el párrafo.',
    },

    { type: 'heading', level: 2, text: '5. Sustitución léxica' },
    {
      type: 'paragraph',
      text: 'Una forma de comprobar el significado es reemplazar mentalmente la palabra. Texto: "La decisión generó una reacción adversa." Si sustituimos por "una reacción desfavorable", el sentido se conserva. Una sustitución correcta debe mantener: significado; tono; relación con el resto del texto.',
    },

    { type: 'heading', level: 2, text: '6. Sentido figurado' },
    {
      type: 'paragraph',
      text: 'Las palabras no siempre se utilizan literalmente. Ejemplo: "La noticia encendió el debate." No significa que el debate haya ardido. "Encendió" significa que lo activó o intensificó.',
    },

    { type: 'heading', level: 2, text: '7. Expresiones completas' },
    {
      type: 'paragraph',
      text: 'A veces la unidad de significado no es una sola palabra. Ejemplo: "Después de varios intentos, el proyecto comenzó a tomar forma." La expresión significa empezar a desarrollarse de manera más definida. Interpretar cada palabra por separado no bastaría.',
    },

    { type: 'heading', level: 2, text: '8. Matices' },
    {
      type: 'paragraph',
      text: 'Dos palabras pueden parecer sinónimas pero tener diferentes matices. Por ejemplo: observar; mirar; vigilar. Todas se relacionan con ver, pero no expresan exactamente lo mismo. La sustitución debe respetar el matiz requerido por el texto.',
    },

    { type: 'heading', level: 2, text: '9. Evitar respuestas "posibles" pero inadecuadas' },
    {
      type: 'paragraph',
      text: 'Una alternativa puede ser un sinónimo de diccionario y aun así no funcionar en contexto. La pregunta no es "¿Qué podría significar esta palabra?" sino "¿Qué significa aquí?".',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Cuando aparezca una palabra o expresión: lee la oración completa; revisa las pistas cercanas; identifica el sentido general del fragmento; prueba mentalmente cada sustitución; descarta opciones que cambien el tono o la relación entre ideas.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: 'En la expresión "el movimiento comenzó a apagarse", la palabra destacada significa que:' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'el taller empezó a incendiarse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'la actividad del taller comenzó a disminuir.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'la iluminación del taller dejó de funcionar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ernesto comenzó a trabajar de noche.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El contexto muestra menos encargos, reducción de horarios y menor actividad, por lo que "apagarse" se usa figuradamente como disminuir.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué significa que la respuesta inicial a las publicaciones fuera "tibia"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que fue moderada y poco entusiasta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que fue agresiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que ocurrió durante un día caluroso.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que fue inmediata y masiva.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto aclara que hubo solo un par de comentarios y pocas consultas, lo que muestra una recepción limitada.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Cuál de las siguientes expresiones podría reemplazar mejor "el movimiento comenzó a apagarse" sin alterar su sentido?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El trabajo comenzó a disminuir.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El taller comenzó a oscurecerse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los trabajadores comenzaron a correr.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La calle comenzó a quedar vacía.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La expresión se refiere al descenso de la actividad laboral del taller.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: 'En el contexto del relato, que "las mañanas dejaron de ser silenciosas" significa principalmente que:' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'comenzaron a ocurrir discusiones frecuentes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'el taller recuperó parte de su actividad.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'aumentó el tráfico de la calle.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Camila comenzó a escuchar música en casa.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La frase funciona figuradamente como señal del regreso de encargos y trabajo al taller.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué efecto produce el contraste entre "apagarse" al inicio y "la luz encendida" al final?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Refuerza figuradamente el paso desde el declive hacia una recuperación parcial del taller.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que el problema principal era eléctrico.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Indica que Camila instaló nuevas lámparas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Muestra que Ernesto decidió trabajar exclusivamente de noche.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las imágenes de apagarse y volver a tener luz acompañan simbólicamente la disminución y posterior recuperación de la actividad.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: 'En el tercer párrafo, que el progreso parezca "estancado" significa que:' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'aparentemente no avanza.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'retrocede rápidamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'termina de manera definitiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'se vuelve más fácil.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto explica que durante ciertos períodos el progreso puede ser poco visible, por lo que parece no avanzar.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: 'En el cuarto párrafo, la palabra "lento" tiene un sentido principalmente:' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'negativo, porque demuestra que la investigación está mal diseñada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'descriptivo, porque indica que el proceso requiere tiempo para verificar resultados.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'irónico, porque los científicos trabajan con mucha rapidez.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'figurado, porque se refiere al movimiento físico de los investigadores.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto no presenta la lentitud como defecto automático, sino como parte de un proceso de verificación cuidadosa.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué significa la expresión "acortar camino" en el penúltimo párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Elegir una ruta físicamente más breve.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reducir etapas de un proceso para terminar antes.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Cambiar completamente el objetivo de una investigación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utilizar más recursos para obtener mejores resultados.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La expresión se utiliza figuradamente para referirse a eliminar o reducir etapas con el propósito de avanzar más rápido.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes expresiones podría reemplazar mejor "conclusiones apresuradas"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'conclusiones obtenidas demasiado pronto.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'conclusiones escritas con rapidez física.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'conclusiones muy extensas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'conclusiones que nadie comprende.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '"Apresuradas" se refiere a conclusiones adoptadas antes de contar con suficiente revisión o evidencia.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué sentido adquiere la palabra "eficiencia" dentro del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Terminar siempre una tarea en el menor tiempo posible.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Evitar cualquier procedimiento que requiera repetición.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utilizar adecuadamente tiempo y recursos para obtener un resultado confiable.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Preferir procesos lentos aunque no produzcan mejores resultados.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto redefine la eficiencia: no como velocidad absoluta, sino como uso adecuado de recursos para alcanzar resultados confiables.' },
      ],
    },
  ],
};

export default significadoContexto;
