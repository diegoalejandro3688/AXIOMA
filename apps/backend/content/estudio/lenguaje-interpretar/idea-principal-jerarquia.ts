// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 1. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md). Ver cabecera de
// content/estudio/lenguaje-localizar/informacion-explicita-relevante.ts
// para el criterio de representación de textos.
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
  { type: 'heading', level: 3, text: 'Texto A — Cuando una ciudad vuelve a dejar pasar el agua' },
  {
    type: 'paragraph',
    text: 'Durante décadas, muchas ciudades cubrieron grandes superficies con asfalto y hormigón. Calles, estacionamientos y veredas permitieron construir espacios resistentes y fáciles de mantener, pero también redujeron la cantidad de suelo capaz de absorber agua de lluvia.',
  },
  {
    type: 'paragraph',
    text: 'Cuando una precipitación intensa cae sobre una superficie impermeable, gran parte del agua corre rápidamente hacia alcantarillas y canales. Si estos sistemas no tienen suficiente capacidad, pueden producirse acumulaciones e inundaciones en sectores urbanos.',
  },
  {
    type: 'paragraph',
    text: 'Por esta razón, algunas ciudades están incorporando soluciones conocidas como infraestructura verde. Entre ellas se encuentran jardines de lluvia, áreas vegetadas junto a las calles, pavimentos permeables y pequeños parques diseñados para recibir temporalmente el exceso de agua.',
  },
  {
    type: 'paragraph',
    text: 'Un jardín de lluvia, por ejemplo, suele instalarse en una zona ligeramente más baja que el terreno circundante. Allí se acumula parte del agua durante una tormenta y luego esta puede infiltrarse lentamente en el suelo. Las plantas utilizadas, además, deben ser capaces de soportar períodos tanto húmedos como secos.',
  },
  {
    type: 'paragraph',
    text: 'Los pavimentos permeables cumplen una función semejante. A diferencia de superficies completamente selladas, permiten que una porción del agua atraviese pequeños espacios y llegue a capas inferiores preparadas para almacenarla temporalmente.',
  },
  {
    type: 'paragraph',
    text: 'Estas medidas no eliminan la necesidad de alcantarillas ni de otras obras tradicionales. Su propósito es complementarlas, disminuyendo la cantidad de agua que llega de forma inmediata a los sistemas de drenaje.',
  },
  {
    type: 'paragraph',
    text: 'Además, las áreas vegetadas pueden entregar otros beneficios, como proporcionar sombra, favorecer ciertos hábitats urbanos y mejorar algunos espacios públicos. Sin embargo, su diseño requiere considerar factores como el tipo de suelo, las precipitaciones locales y el mantenimiento.',
  },
  {
    type: 'paragraph',
    text: 'Así, la gestión del agua en las ciudades está comenzando a combinar infraestructura tradicional con espacios capaces de absorber, retener o retrasar parte de las precipitaciones.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — El valor de equivocarse durante el aprendizaje' },
  {
    type: 'paragraph',
    text: 'En muchos contextos escolares, equivocarse puede sentirse como una señal de fracaso. Un resultado incorrecto suele llamar inmediatamente la atención porque muestra que todavía existe algo que el estudiante no domina. Sin embargo, el error también puede convertirse en una fuente importante de información.',
  },
  {
    type: 'paragraph',
    text: 'Cuando una persona responde incorrectamente una pregunta y luego analiza por qué lo hizo, puede descubrir qué parte de su razonamiento necesita revisar. Quizás confundió dos conceptos, aplicó una regla en una situación inadecuada o interpretó mal una instrucción.',
  },
  {
    type: 'paragraph',
    text: 'El valor educativo del error, por lo tanto, no está simplemente en cometerlo. Repetir una respuesta incorrecta sin revisarla difícilmente produce aprendizaje. Lo importante es recibir información que permita reconocer qué ocurrió y modificar el razonamiento.',
  },
  {
    type: 'paragraph',
    text: 'La retroalimentación cumple aquí un papel central. Una explicación que solo indica cuál era la respuesta correcta puede ser menos útil que otra que muestra por qué una alternativa parecía razonable y en qué punto dejó de serlo.',
  },
  {
    type: 'paragraph',
    text: 'Esto también cambia la forma en que puede utilizarse una evaluación. Además de medir cuánto sabe una persona en un momento determinado, sus respuestas pueden revelar patrones. Si varios estudiantes cometen el mismo error, por ejemplo, podría existir una dificultad común que necesite ser trabajada nuevamente.',
  },
  {
    type: 'paragraph',
    text: 'No significa que todos los errores sean igualmente útiles ni que deban ignorarse los resultados correctos. Tampoco implica que equivocarse garantice aprender. El beneficio aparece cuando el error se observa, se comprende y se utiliza para ajustar una estrategia.',
  },
  {
    type: 'paragraph',
    text: 'Desde esta perspectiva, aprender no consiste únicamente en acumular respuestas correctas. También supone desarrollar la capacidad de detectar qué falla en nuestro razonamiento y utilizar esa información para avanzar.',
  },
];

const ideaPrincipalJerarquia: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 1,
  title: 'Idea principal y jerarquía de información',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar la idea principal de un texto o fragmento, distinguirla de ideas secundarias y ejemplos, y reconocer cómo se jerarquiza la información para construir el sentido global.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Idea principal y jerarquía de información' },

    { type: 'heading', level: 2, text: '1. ¿Qué es la idea principal?' },
    {
      type: 'paragraph',
      text: 'La idea principal es la información que organiza y resume lo más importante que el texto comunica sobre un tema. No siempre aparece escrita en una sola oración. A veces debe construirse relacionando varias partes.',
    },
    {
      type: 'paragraph',
      text: 'Por ejemplo: "Las ciudades han aumentado sus áreas verdes durante los últimos años. Nuevos parques, corredores vegetales y jardines comunitarios buscan reducir las altas temperaturas y ofrecer espacios de encuentro." La idea principal no es solamente "hay parques nuevos", sino algo más amplio: las ciudades están aumentando sus áreas verdes para obtener distintos beneficios urbanos.',
    },

    { type: 'heading', level: 2, text: '2. Tema e idea principal no son lo mismo' },
    {
      type: 'paragraph',
      text: 'El tema indica de qué habla el texto. La idea principal expresa qué dice el texto sobre ese tema. Ejemplo: tema — el sueño; idea principal — dormir adecuadamente favorece distintos procesos necesarios para el aprendizaje. Responder solo "el sueño" sería demasiado general si preguntan por la idea principal.',
    },

    { type: 'heading', level: 2, text: '3. Ideas secundarias' },
    {
      type: 'paragraph',
      text: 'Las ideas secundarias explican, desarrollan, ejemplifican, justifican o precisan la idea principal. Si un texto sostiene que los árboles ayudan a mejorar las ciudades, puede desarrollar esa idea diciendo que producen sombra, reducen temperatura, absorben agua u ofrecen hábitat. Esos datos son importantes, pero no necesariamente constituyen la idea global.',
    },

    { type: 'heading', level: 2, text: '4. Ejemplos y casos específicos' },
    {
      type: 'paragraph',
      text: 'Un ejemplo puede ocupar varias líneas y aun así tener menor jerarquía. Por ejemplo: "En una escuela de Valdivia se instalaron depósitos para recolectar agua lluvia." Si el texto completo explica distintas estrategias para ahorrar agua, ese caso es un ejemplo, no necesariamente su idea principal.',
    },

    { type: 'heading', level: 2, text: '5. La idea principal puede estar explícita' },
    {
      type: 'paragraph',
      text: 'A veces aparece claramente: "La alimentación de los polinizadores depende de la diversidad de plantas presentes durante distintas épocas del año." El resto del párrafo desarrolla esa afirmación. En estos casos, debemos reconocer cuál oración organiza las demás.',
    },

    { type: 'heading', level: 2, text: '6. También puede construirse' },
    {
      type: 'paragraph',
      text: 'Otros textos nunca dicen literalmente "la idea principal es…". Hay que reunir información. Si varios párrafos explican que una laguna perdió especies, que aumentaron los residuos, que disminuyó la calidad del agua y que se inició un plan de recuperación, podemos interpretar que el texto trata sobre el deterioro de la laguna y los esfuerzos para recuperarla.',
    },

    { type: 'heading', level: 2, text: '7. Jerarquía de información' },
    {
      type: 'paragraph',
      text: 'Podemos imaginar tres niveles. Nivel 1 — Idea principal: lo esencial del texto. Nivel 2 — Ideas secundarias: explicaciones o aspectos principales que desarrollan la idea. Nivel 3 — Detalles: ejemplos, cifras, nombres, fechas o casos particulares. No todos los datos tienen el mismo peso.',
    },

    { type: 'heading', level: 2, text: '8. ¿Cómo reconocer una buena idea principal?' },
    {
      type: 'paragraph',
      text: 'Una buena formulación debe: abarcar gran parte del texto; incluir lo esencial; no ser demasiado general; no quedarse en un detalle; no agregar información que el texto no sostiene.',
    },

    { type: 'heading', level: 2, text: '9. Distractores frecuentes' },
    {
      type: 'paragraph',
      text: 'En preguntas sobre idea principal suelen aparecer alternativas que mencionan un detalle verdadero, resumen solo un párrafo, son demasiado generales, exageran la postura del texto o incorporan una conclusión no respaldada.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Al terminar de leer, pregúntate: ¿de qué se habla?; ¿qué es lo más importante que se dice sobre eso?; ¿qué ideas se repiten o desarrollan?; ¿qué información podría eliminarse sin cambiar el mensaje central?; ¿qué alternativa explica mejor el texto completo?',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es el tema principal del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La construcción de estacionamientos urbanos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El uso de infraestructura verde para gestionar el agua de lluvia en las ciudades.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de los sistemas de alcantarillado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El cultivo de plantas resistentes a la sequía.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto se concentra en cómo distintas formas de infraestructura verde ayudan a manejar el agua de lluvia en zonas urbanas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes ideas cumple principalmente la función de ejemplo dentro del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las superficies impermeables reducen la absorción del agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Algunas ciudades están incorporando infraestructura verde.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un jardín de lluvia puede acumular temporalmente agua para que luego se infiltre.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La gestión urbana del agua está combinando distintos tipos de infraestructura.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El jardín de lluvia se presenta como un caso específico que desarrolla la idea general de infraestructura verde.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál expresa mejor la idea principal del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los jardines de lluvia son la solución más efectiva para evitar cualquier inundación urbana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las ciudades deberían reemplazar el hormigón por parques y jardines.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Algunas ciudades están complementando sus sistemas tradicionales con infraestructura verde para manejar mejor las precipitaciones.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los pavimentos permeables son superiores a las alcantarillas tradicionales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Esa alternativa integra el problema inicial, las soluciones descritas y la conclusión del texto sin exagerar su alcance.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación jerárquica existe entre el cuarto y el tercer párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El cuarto contradice la idea presentada en el tercero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El cuarto desarrolla mediante un caso específico una solución mencionada en el tercero.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El cuarto presenta el problema que el tercero resuelve posteriormente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos presentan conclusiones independientes.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El tercer párrafo introduce varias formas de infraestructura verde y el cuarto explica específicamente cómo funciona un jardín de lluvia.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál información podría eliminarse sin alterar significativamente la idea principal del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La explicación de que las superficies impermeables dificultan la absorción del agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de soluciones de infraestructura verde.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El hecho de que las plantas de un jardín de lluvia deban soportar períodos húmedos y secos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La idea de combinar infraestructura tradicional con sistemas que retengan o retrasen precipitaciones.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Ese dato ayuda a explicar el funcionamiento particular de un jardín de lluvia, pero no es indispensable para comprender la idea global del texto.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es el tema central del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las diferencias entre distintos tipos de evaluaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El papel que pueden cumplir los errores en el aprendizaje.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las razones por las que los estudiantes obtienen malas calificaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La necesidad de eliminar los errores durante una evaluación.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto analiza principalmente cómo los errores pueden utilizarse como información para mejorar el aprendizaje.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué idea secundaria desarrolla el segundo párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los errores deben ser ignorados después de una evaluación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una respuesta incorrecta puede mostrar qué parte del razonamiento necesita corregirse.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todos los estudiantes cometen los mismos errores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La retroalimentación es innecesaria cuando existe una respuesta correcta.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El párrafo muestra distintas causas posibles de un error y explica que revisarlas permite detectar dificultades específicas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones resume mejor el cuarto párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La retroalimentación es más útil cuando ayuda a comprender el razonamiento detrás del error.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las alternativas incorrectas deberían eliminarse de las evaluaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las respuestas correctas no necesitan ninguna explicación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La retroalimentación solo debe entregarse después de varias evaluaciones.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El párrafo contrasta una corrección que solo entrega la respuesta con otra que explica dónde falla el razonamiento.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple el ejemplo de varios estudiantes que cometen el mismo error?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todas las evaluaciones son deficientes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que un patrón de respuestas puede revelar una dificultad compartida.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Probar que los estudiantes aprenden mejor trabajando en grupo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar por qué los errores deberían recibir una calificación positiva.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El ejemplo desarrolla la idea de que las respuestas de una evaluación pueden entregar información sobre dificultades comunes.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál expresa mejor la idea principal del texto completo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Equivocarse es preferible a responder correctamente porque produce un aprendizaje más profundo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los errores permiten aprender automáticamente, incluso cuando no se revisan.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Los errores pueden contribuir al aprendizaje cuando se analizan y se utilizan para corregir el razonamiento.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las evaluaciones deberían centrarse exclusivamente en explicar respuestas incorrectas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto sostiene que el error puede ser útil, pero solo cuando se comprende y se utiliza para ajustar el razonamiento; no afirma que equivocarse sea suficiente por sí mismo.',
        },
      ],
    },
  ],
};

export default ideaPrincipalJerarquia;
