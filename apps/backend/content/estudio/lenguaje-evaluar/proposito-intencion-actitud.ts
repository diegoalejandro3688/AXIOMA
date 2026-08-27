// CONTENT-L3A -- Golden Unit Lenguaje / Evaluar, Recurso 1. Contenido
// editorial APROBADO externamente. Mismo criterio de ajustes técnicos que
// content/estudio/lenguaje-localizar/*.ts (contentBlocks, keys sin
// padding, texto completo duplicado en el stemContent de cada una de sus 5
// preguntas -- sin bloque nuevo ni cambio de schema).
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
  { type: 'heading', level: 3, text: 'Texto A — Una plaza que no debería cerrarse al caer la tarde' },
  { type: 'paragraph', text: 'Señora directora de Desarrollo Comunitario:' },
  {
    type: 'paragraph',
    text: 'Durante los últimos meses, varios vecinos del sector Los Aromos hemos observado que la plaza principal queda prácticamente vacía después de las siete de la tarde. No porque haya perdido importancia para el barrio, sino porque gran parte de su iluminación dejó de funcionar y algunas áreas permanecen completamente oscuras.',
  },
  {
    type: 'paragraph',
    text: 'Durante el día, la plaza sigue cumpliendo un papel importante. Niños juegan allí después de clases, personas mayores utilizan sus bancas y distintos grupos realizan actividades comunitarias durante los fines de semana.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, cuando oscurece, muchas familias prefieren evitar el lugar. Algunos vecinos han comenzado incluso a caminar varias cuadras adicionales para no atravesarlo de noche.',
  },
  {
    type: 'paragraph',
    text: 'Sabemos que el municipio enfrenta distintas necesidades y que mantener espacios públicos requiere recursos. Aun así, reparar la iluminación de una plaza tan utilizada no debería considerarse un detalle menor.',
  },
  {
    type: 'paragraph',
    text: 'Una plaza iluminada no resolverá por sí sola todos los problemas de seguridad del sector, pero permitiría recuperar horas de uso que hoy prácticamente se han perdido y facilitaría que más personas vuelvan a ocupar el espacio.',
  },
  { type: 'paragraph', text: 'Por esta razón, solicitamos que la reparación de las luminarias sea considerada dentro de las próximas intervenciones del barrio.' },
  {
    type: 'paragraph',
    text: 'No pedimos transformar completamente la plaza ni construir nuevas instalaciones. Pedimos algo mucho más simple: que un espacio que ya existe pueda seguir siendo utilizado también cuando termina el día.',
  },
  { type: 'paragraph', text: 'Atentamente, Junta de Vecinos Los Aromos' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — La obsesión por responder de inmediato' },
  {
    type: 'paragraph',
    text: 'Hay una expectativa cada vez más extendida de que todo mensaje debe recibir respuesta casi instantáneamente. Un correo enviado por la mañana parece exigir contestación antes del almuerzo; una notificación permanece unos minutos sin abrir y ya puede interpretarse como descuido.',
  },
  {
    type: 'paragraph',
    text: 'La rapidez tiene ventajas evidentes. En situaciones urgentes, responder a tiempo puede evitar problemas y facilitar decisiones. Pero convertir la respuesta inmediata en norma para cualquier comunicación genera una consecuencia menos visible: obliga a interrumpir constantemente otras tareas.',
  },
  {
    type: 'paragraph',
    text: 'Cada interrupción parece pequeña. Mirar un mensaje puede tomar apenas unos segundos. El problema aparece cuando esas interrupciones se repiten durante toda la jornada y fragmentan períodos que podrían utilizarse para leer, escribir, resolver un problema o simplemente pensar con continuidad.',
  },
  {
    type: 'paragraph',
    text: 'Por eso me parece extraño que la disponibilidad permanente se haya convertido en una señal automática de eficiencia. Una persona que responde todo en cinco minutos quizá sea muy organizada, pero también podría estar abandonando una tarea importante cada vez que aparece una notificación.',
  },
  {
    type: 'paragraph',
    text: 'No se trata de defender la lentitud ni de ignorar a quienes necesitan una respuesta. Se trata de distinguir entre lo urgente y lo que simplemente llegó primero a la pantalla.',
  },
  {
    type: 'paragraph',
    text: 'Tal vez sería más razonable aceptar que no todas las conversaciones necesitan ocurrir en tiempo real. Responder después de terminar una tarea no debería interpretarse necesariamente como falta de interés.',
  },
  {
    type: 'paragraph',
    text: 'Si queremos trabajar con más atención, tendremos que recuperar algo que parece cada vez menos permitido: el derecho a no estar disponibles durante cada minuto del día.',
  },
];

const propositoIntencionActitud: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD',
  unitCode: 'LENGUAJE.EVALUAR',
  subjectKey: 'lenguaje',
  order: 1,
  title: 'Propósito, intención y actitud del emisor',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar y evaluar el propósito, la intención y la actitud del emisor a partir de sus elecciones discursivas, distinguiendo entre informar, persuadir, cuestionar, valorar o advertir, y evitando atribuir intenciones que el texto no respalda.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Propósito, intención y actitud del emisor' },

    { type: 'heading', level: 2, text: '1. Propósito, intención y actitud no son exactamente lo mismo' },
    {
      type: 'paragraph',
      text: 'Aunque se relacionan, conviene distinguirlas. Propósito: qué busca hacer el texto en términos generales (informar, explicar, persuadir, advertir, criticar). Intención: qué busca lograr el emisor en una situación más concreta (convencer de apoyar una medida, llamar la atención sobre un problema, cuestionar una práctica). Actitud: cómo se posiciona el emisor frente al tema (favorable, crítica, preocupada, escéptica, entusiasta, neutral).',
    },

    { type: 'heading', level: 2, text: '2. El propósito puede ser explícito' },
    {
      type: 'paragraph',
      text: 'A veces el texto declara claramente lo que busca. Ejemplo: "Esta campaña tiene como objetivo reducir el desperdicio de agua." Aquí el propósito está directamente señalado.',
    },

    { type: 'heading', level: 2, text: '3. También puede deducirse' },
    {
      type: 'paragraph',
      text: 'En otros casos debemos analizar: qué información se selecciona; qué palabras se utilizan; qué acciones se proponen; qué aspectos se destacan; cómo termina el texto. Ejemplo: si una columna enumera problemas de una política y termina pidiendo su modificación, probablemente busca cuestionarla y promover un cambio.',
    },

    { type: 'heading', level: 2, text: '4. Informar no significa ser completamente neutro' },
    {
      type: 'paragraph',
      text: 'Un texto puede entregar datos y, al mismo tiempo, mostrar una postura. Por ejemplo: "Durante los últimos cinco años se talaron 200 árboles en el sector. La pérdida resulta especialmente preocupante considerando la escasez de sombra en el barrio." La cifra informa; la palabra "preocupante" expresa una actitud.',
    },

    { type: 'heading', level: 2, text: '5. Palabras valorativas' },
    {
      type: 'paragraph',
      text: 'Algunas expresiones revelan cómo evalúa el emisor un tema. Ejemplos: "una medida necesaria"; "un resultado decepcionante"; "una solución insuficiente"; "un avance significativo". Estas expresiones pueden ser claves para identificar actitud.',
    },

    { type: 'heading', level: 2, text: '6. El grado de intensidad importa' },
    {
      type: 'paragraph',
      text: 'No es lo mismo decir "La propuesta presenta algunas dificultades." que "La propuesta es un fracaso absoluto." La segunda formulación expresa una actitud mucho más negativa e intensa.',
    },

    { type: 'heading', level: 2, text: '7. Diferenciar intención de efecto' },
    {
      type: 'paragraph',
      text: 'Una pregunta puede pedir "¿Qué intenta lograr el emisor?" Eso no es exactamente lo mismo que "¿Qué efecto produce realmente en el lector?" El primero se refiere a intención. El segundo puede depender de cómo recibe el mensaje cada lector.',
    },

    { type: 'heading', level: 2, text: '8. Evitar intenciones demasiado específicas' },
    {
      type: 'paragraph',
      text: 'Si una persona critica el exceso de vehículos en una ciudad, no podemos concluir automáticamente que quiere "prohibir todos los automóviles." La intención debe estar respaldada por lo que el texto efectivamente sostiene.',
    },

    { type: 'heading', level: 2, text: '9. El cierre suele ser importante' },
    {
      type: 'paragraph',
      text: 'Las últimas líneas pueden revelar: una recomendación; una advertencia; una pregunta abierta; una llamada a actuar; una valoración final. Pero debemos considerar todo el texto, no solo el cierre.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Para evaluar propósito, intención y actitud: identifica el tema; observa qué información se destaca; reconoce palabras valorativas; revisa qué propone o cuestiona el emisor; considera el cierre; elige la alternativa más respaldada y menos exagerada.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es el propósito principal de la carta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Informar sobre la historia de la plaza.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solicitar la reparación de la iluminación de la plaza.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Proponer la construcción de una plaza nueva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Criticar todas las decisiones del municipio.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La carta solicita explícitamente que la reparación de las luminarias sea considerada en las próximas intervenciones.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué actitud muestra principalmente el emisor frente al problema?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Indiferencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Preocupación acompañada de una petición concreta.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Entusiasmo por el estado actual de la plaza.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Rechazo absoluto al trabajo municipal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La carta expresa preocupación por la pérdida de uso nocturno, pero formula una solicitud específica sin presentar al municipio como responsable de todos los problemas.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el emisor menciona que el municipio enfrenta "distintas necesidades"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para retirar completamente su solicitud.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para mostrar que reconoce las limitaciones antes de defender la prioridad de la reparación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para afirmar que la plaza no necesita ninguna intervención.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que el municipio dispone de recursos ilimitados.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La concesión muestra una postura moderada: reconoce restricciones, pero sostiene que la reparación sigue siendo importante.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones describe mejor la intención del penúltimo párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Exigir una remodelación completa de la plaza.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que la petición es específica y limitada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Proponer cerrar la plaza durante las noches.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cuestionar la existencia de espacios comunitarios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor aclara que no pide nuevas instalaciones, sino recuperar mediante iluminación un espacio ya existente.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación describe mejor la estrategia general del emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presenta el problema de forma extrema para responsabilizar exclusivamente al municipio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Describe una situación concreta, reconoce límites y formula una solicitud proporcionada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Entrega información sin expresar ninguna postura ni solicitud.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utiliza amenazas para conseguir una respuesta inmediata.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La carta combina descripción del problema, reconocimiento de las restricciones municipales y una petición específica, lo que revela una estrategia persuasiva moderada.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es la postura principal del emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Toda comunicación debería ser respondida de inmediato.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La rapidez en las respuestas es siempre perjudicial.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No toda comunicación requiere una respuesta inmediata.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las notificaciones deberían eliminarse por completo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto cuestiona que la disponibilidad inmediata sea la norma para todas las comunicaciones.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué actitud muestra el emisor hacia la idea de que responder rápidamente sea siempre señal de eficiencia?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Totalmente favorable.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Crítica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Indiferente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Confundida.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor dice que le parece "extraño" considerar automáticamente eficiente a quien responde de inmediato y cuestiona esa asociación.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué intención cumple el ejemplo de una persona que responde todos sus mensajes en cinco minutos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que responder rápido siempre mejora la productividad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cuestionar la asociación automática entre rapidez y eficiencia.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Explicar cómo configurar las notificaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que las tareas importantes pueden terminarse en pocos minutos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El ejemplo muestra que una respuesta rápida puede implicar interrumpir tareas importantes, por lo que la rapidez no garantiza eficiencia.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el autor aclara que "no se trata de defender la lentitud"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para evitar que su postura sea interpretada como un rechazo absoluto a responder con rapidez.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para abandonar la postura presentada anteriormente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para afirmar que todas las respuestas deberían tardar varias horas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que las comunicaciones urgentes no existen.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La aclaración limita su postura: cuestiona la inmediatez permanente, no la rapidez cuando realmente es necesaria.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál describe mejor el propósito global del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Convencer al lector de dejar de utilizar cualquier sistema de mensajería.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Criticar la expectativa de disponibilidad permanente y defender una relación más selectiva con la inmediatez.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Informar de manera neutral sobre cómo funcionan las notificaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todas las interrupciones producen exactamente el mismo efecto.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La columna cuestiona la obligación de responder de inmediato y propone distinguir entre comunicaciones urgentes y aquellas que pueden esperar.',
        },
      ],
    },
  ],
};

export default propositoIntencionActitud;
