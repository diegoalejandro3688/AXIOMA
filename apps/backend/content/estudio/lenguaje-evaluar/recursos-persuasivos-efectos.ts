// CONTENT-L3B -- Golden Unit Lenguaje / Evaluar, Recurso 5. Contenido
// editorial APROBADO externamente. Mismo criterio de ajustes técnicos que
// content/estudio/lenguaje-evaluar/proposito-intencion-actitud.ts.
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
  { type: 'heading', level: 3, text: 'Texto A — "Cinco minutos también cuentan"' },
  { type: 'paragraph', text: 'CAMPAÑA BARRIO LIMPIO' },
  { type: 'paragraph', text: '¿Cinco minutos parecen poco?' },
  {
    type: 'paragraph',
    text: 'Cinco minutos bastan para recoger una botella del suelo, separar residuos antes de salir de casa o dejar una bolsa en el contenedor correcto.',
  },
  { type: 'paragraph', text: 'Si 1.000 vecinos dedicaran cinco minutos a una acción de limpieza durante una misma semana, serían más de 80 horas de esfuerzo acumulado.' },
  { type: 'paragraph', text: 'Tu calle también es tu espacio' },
  {
    type: 'paragraph',
    text: 'La vereda por la que caminas, la plaza donde esperas y el paradero que utilizas forman parte del lugar que compartimos.',
  },
  { type: 'paragraph', text: 'No necesitas organizar una gran actividad para contribuir.' },
  { type: 'paragraph', text: 'Una acción pequeña sigue siendo una acción.' },
  { type: 'paragraph', text: 'Este sábado' },
  { type: 'paragraph', text: 'Jornada comunitaria de limpieza 10:00–12:00 Plaza Los Canelos' },
  { type: 'paragraph', text: 'El municipio entregará guantes y bolsas a quienes participen.' },
  { type: 'paragraph', text: 'Ven solo, con amigos o con tu familia.' },
  { type: 'paragraph', text: 'Antes de pasar de largo, pregúntate:' },
  { type: 'paragraph', text: 'Si todos esperan que otra persona lo haga, ¿quién empieza?' },
  { type: 'paragraph', text: 'Cinco minutos también cuentan.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — No compremos tiempo que no necesitamos' },
  {
    type: 'paragraph',
    text: 'Cada año aparecen nuevos dispositivos prometiendo ahorrarnos unos segundos aquí y unos minutos allá. Una aplicación organiza nuestra agenda, un aparato enciende las luces antes de que lleguemos y otro prepara el café sin que toquemos un botón.',
  },
  { type: 'paragraph', text: 'Nada de eso es necesariamente malo. La tecnología puede simplificar tareas reales y liberar tiempo para cosas importantes.' },
  { type: 'paragraph', text: 'El problema comienza cuando cualquier segundo que todavía requiere esfuerzo se presenta como una falla que necesita una solución comercial.' },
  { type: 'paragraph', text: '¿De verdad necesitamos reemplazar un objeto que funciona porque el nuevo modelo completa la misma tarea diez segundos más rápido?' },
  {
    type: 'paragraph',
    text: 'La publicidad rara vez dice: "Tu producto actual todavía sirve". En cambio, nos recuerda constantemente lo que supuestamente estamos perdiendo: velocidad, comodidad, novedad.',
  },
  {
    type: 'paragraph',
    text: 'Y así aparece una paradoja. Compramos productos para ahorrar tiempo, pero dedicamos tiempo a compararlos, aprender a utilizarlos, configurarlos, mantenerlos y finalmente reemplazarlos.',
  },
  { type: 'paragraph', text: 'No propongo volver a una vida sin tecnología. Tampoco creo que toda innovación sea innecesaria.' },
  {
    type: 'paragraph',
    text: 'Propongo algo mucho menos dramático: antes de comprar una herramienta que promete ahorrarnos tiempo, preguntarnos qué haremos realmente con ese tiempo y cuánto nos costará obtenerlo.',
  },
  {
    type: 'paragraph',
    text: 'Porque quizás la mejor forma de recuperar algunos minutos no sea comprar un dispositivo nuevo, sino dejar de sentir que cada minuto debe ser optimizado.',
  },
];

const recursosPersuasivosEfectos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS',
  unitCode: 'LENGUAJE.EVALUAR',
  subjectKey: 'lenguaje',
  order: 5,
  title: 'Recursos persuasivos y efectos en el lector',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar y evaluar recursos persuasivos utilizados en distintos textos, explicando cómo apelan a emociones, valores, autoridad, urgencia, identificación o contraste, y distinguiendo entre recursos eficaces y afirmaciones exageradas o manipuladoras.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Recursos persuasivos y efectos en el lector' },

    { type: 'heading', level: 2, text: '1. ¿Qué es persuadir?' },
    {
      type: 'paragraph',
      text: 'Persuadir significa intentar influir en: una opinión; una decisión; una conducta; una valoración. Un texto persuasivo no solo entrega información: busca que el receptor piense o actúe de determinada manera.',
    },

    { type: 'heading', level: 2, text: '2. Persuasión no significa necesariamente engaño' },
    {
      type: 'paragraph',
      text: 'Un texto puede intentar persuadir utilizando razones válidas y evidencia sólida. Por ejemplo: "Vacunarse reduce el riesgo de determinadas enfermedades. Consulta el calendario oficial y mantén tus dosis al día." Aquí hay una intención persuasiva, pero eso no vuelve falsa la información.',
    },

    { type: 'heading', level: 2, text: '3. Apelación emocional' },
    {
      type: 'paragraph',
      text: 'Un emisor puede intentar provocar: miedo; esperanza; culpa; orgullo; empatía; entusiasmo. Ejemplo: "Imagina que mañana el bosque donde jugabas de niño ya no existe." La imagen busca generar una respuesta emocional. La pregunta importante es: ¿qué efecto busca producir y cómo se relaciona con el mensaje?',
    },

    { type: 'heading', level: 2, text: '4. Identificación con el receptor' },
    {
      type: 'paragraph',
      text: 'Un texto puede utilizar expresiones como: "todos hemos vivido esto"; "personas como tú"; "nuestra comunidad"; "juntos podemos". Esto crea cercanía y busca que el receptor se sienta parte del problema o de la solución.',
    },

    { type: 'heading', level: 2, text: '5. Apelación a autoridad' },
    {
      type: 'paragraph',
      text: 'También puede mencionarse a especialistas, instituciones, estudios o figuras reconocidas. Pero debemos evaluar si esa autoridad es pertinente, identificable y realmente relacionada con la afirmación. Decir "los expertos aseguran" sin mayor información puede tener apariencia persuasiva sin ofrecer un respaldo sólido.',
    },

    { type: 'heading', level: 2, text: '6. Urgencia' },
    {
      type: 'paragraph',
      text: 'Palabras como: ahora; hoy; último día; antes de que sea tarde; quedan pocas oportunidades, pueden impulsar una decisión rápida. La urgencia puede ser legítima, pero también puede utilizarse para reducir el tiempo de reflexión.',
    },

    { type: 'heading', level: 2, text: '7. Contrastes' },
    {
      type: 'paragraph',
      text: 'Un texto puede presentar dos posibilidades de manera muy diferente. Ejemplo: "Podemos seguir desperdiciando agua o empezar hoy a proteger nuestro futuro." El contraste simplifica la decisión y orienta al receptor hacia una opción. Debemos evaluar si existen realmente solo esas dos alternativas.',
    },

    { type: 'heading', level: 2, text: '8. Preguntas retóricas' },
    {
      type: 'paragraph',
      text: 'Una pregunta retórica no siempre espera una respuesta directa. Ejemplo: "¿Realmente queremos dejar este problema a la próxima generación?" Su función puede ser: provocar reflexión; reforzar una postura; generar presión emocional.',
    },

    { type: 'heading', level: 2, text: '9. Efecto buscado y efecto real' },
    {
      type: 'paragraph',
      text: 'Un recurso puede intentar producir confianza, preocupación, identificación o urgencia. Pero no todos los lectores reaccionarán igual. Por eso es más preciso afirmar "busca generar preocupación" que "hace que todos los lectores sientan miedo".',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Para evaluar un recurso persuasivo: identifica qué postura o conducta promueve; localiza el recurso utilizado; determina qué respuesta intenta provocar; revisa si el recurso se relaciona con la evidencia; detecta exageraciones o falsas alternativas; diferencia efecto buscado de efecto garantizado; evalúa si fortalece razonablemente el mensaje o intenta presionar sin suficiente respaldo.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la conducta que busca promover principalmente la campaña?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que los vecinos abandonen el uso de espacios públicos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Que las personas realicen pequeñas acciones de limpieza y participen en el cuidado comunitario.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que todas las familias limpien durante varias horas cada día.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que el municipio sea el único responsable de recoger residuos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La campaña insiste en que pequeñas acciones individuales y la participación comunitaria pueden contribuir al cuidado del barrio.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué efecto busca producir la frase "Tu calle también es tu espacio"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Crear identificación y sentido de responsabilidad respecto del entorno cotidiano.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Informar quién es legalmente propietario de las calles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Indicar que cada vecino puede cerrar su calle.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar cómo se construyen los espacios públicos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La frase acerca el problema al receptor y presenta el espacio público como algo compartido que también le concierne.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función persuasiva cumple el cálculo de "más de 80 horas de esfuerzo acumulado"?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Mostrar que acciones breves pueden adquirir una magnitud relevante cuando muchas personas participan.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que cada vecino debe trabajar exactamente 80 horas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Probar que la jornada comunitaria durará más de tres días.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar la limpieza con una jornada laboral obligatoria.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El dato transforma una acción individual pequeña en un resultado colectivo más visible, reforzando la idea central de la campaña.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué recurso utiliza principalmente la pregunta "Si todos esperan que otra persona lo haga, ¿quién empieza?"?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una definición técnica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una pregunta retórica que intenta provocar reflexión y responsabilidad.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una cita de autoridad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una comparación estadística.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La pregunta no busca obtener información del lector, sino impulsarlo a reconsiderar la pasividad frente al problema.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál evaluación describe mejor la estrategia persuasiva global de la campaña?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Intenta motivar la participación haciendo que las acciones parezcan accesibles, vinculándolas con identidad comunitaria y mostrando su posible efecto acumulativo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Busca generar miedo afirmando que quienes no participan recibirán una sanción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se basa exclusivamente en autoridad científica para convencer.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Presenta la limpieza comunitaria como la única solución posible a todos los problemas del barrio.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La campaña combina accesibilidad, identificación, una cuantificación del esfuerzo colectivo y una invitación directa sin recurrir a amenazas ni afirmar que la acción resolverá todos los problemas.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué busca persuadir al lector de hacer el emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Abandonar completamente la tecnología.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Reflexionar antes de comprar productos cuya principal promesa es ahorrar pequeñas cantidades de tiempo.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Comprar siempre el dispositivo más rápido disponible.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utilizar únicamente objetos antiguos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto propone evaluar críticamente si el tiempo prometido justifica realmente una nueva compra.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué efecto persuasivo busca la pregunta "¿De verdad necesitamos reemplazar un objeto que funciona...?"?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Llevar al lector a cuestionar la necesidad de ciertas compras.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Obtener una respuesta técnica sobre la velocidad de los dispositivos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todos los productos nuevos son defectuosos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar cómo se mide el rendimiento de un aparato.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La pregunta retórica invita a reconsiderar la idea de reemplazar algo funcional solo por una mejora pequeña de velocidad.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple la "paradoja" descrita por el emisor?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que intentar ahorrar tiempo mediante nuevas compras también puede consumir tiempo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Probar que todos los dispositivos son más lentos que los anteriores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar por qué la publicidad dejará de existir.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que configurar dispositivos siempre toma años.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El contraste cuestiona la promesa de ahorro al señalar que adquirir y administrar nuevos productos también exige tiempo.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el emisor afirma que no propone "volver a una vida sin tecnología"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para limitar su postura y evitar que sea interpretada como un rechazo total a la innovación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para convencer al lector de comprar más dispositivos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para retirar todo lo dicho anteriormente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para afirmar que la tecnología siempre ahorra tiempo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La aclaración presenta una postura matizada: cuestiona ciertas decisiones de consumo, no la tecnología en general.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál evaluación describe mejor el uso de recursos persuasivos en el texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Utiliza preguntas retóricas, contraste y una aparente paradoja para cuestionar hábitos de consumo, mientras modera su postura mediante concesiones.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Se basa principalmente en amenazas sobre las consecuencias de comprar tecnología.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utiliza datos científicos detallados para demostrar que ningún dispositivo ahorra tiempo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Presenta solo dos opciones: abandonar completamente la tecnología o comprar todos los productos nuevos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto combina preguntas, contraste y concesiones para estimular una reflexión crítica sin convertir su postura en un rechazo absoluto de la tecnología.',
        },
      ],
    },
  ],
};

export default recursosPersuasivosEfectos;
