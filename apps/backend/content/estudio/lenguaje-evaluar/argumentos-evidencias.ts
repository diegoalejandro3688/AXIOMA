// CONTENT-L3A -- Golden Unit Lenguaje / Evaluar, Recurso 3. Contenido
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
  { type: 'heading', level: 3, text: 'Texto A — Más árboles donde realmente hacen falta' },
  {
    type: 'paragraph',
    text: 'Cada verano vuelve la misma escena en numerosos barrios: veredas expuestas durante horas al sol, paraderos sin sombra y plazas que se vuelven difíciles de utilizar durante la tarde.',
  },
  {
    type: 'paragraph',
    text: 'Por eso, cuando una municipalidad anuncia nuevos proyectos de arborización, no basta con preguntar cuántos árboles plantará. También importa dónde serán plantados.',
  },
  {
    type: 'paragraph',
    text: 'Una política que distribuya árboles de forma uniforme puede parecer justa a primera vista, pero los barrios no enfrentan las mismas condiciones. Algunos ya cuentan con calles arboladas y parques cercanos, mientras otros tienen grandes superficies de pavimento y muy poca vegetación.',
  },
  {
    type: 'paragraph',
    text: 'En estos últimos sectores, aumentar la cobertura vegetal puede tener un efecto especialmente importante. La sombra reduce la exposición directa al sol en veredas y espacios de espera, y las áreas vegetadas pueden contribuir a disminuir la temperatura de ciertas superficies.',
  },
  {
    type: 'paragraph',
    text: 'También existe una cuestión de uso del espacio público. Una plaza sin sombra puede permanecer prácticamente vacía durante las horas más calurosas, aunque tenga juegos, bancas y otras instalaciones en buen estado.',
  },
  {
    type: 'paragraph',
    text: 'Esto no significa que plantar árboles resuelva por sí solo todos los problemas urbanos. Además, una arborización mal planificada puede generar dificultades si se eligen especies inadecuadas o si no existe mantenimiento suficiente.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, esas limitaciones no justifican repartir los recursos sin considerar las diferencias entre sectores. Si el objetivo es mejorar las condiciones urbanas, la prioridad debería estar en los lugares donde la falta de sombra y vegetación es mayor.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — ¿Deberían empezar más tarde las clases?' },
  {
    type: 'paragraph',
    text: 'Durante años se ha debatido si las jornadas escolares de adolescentes deberían comenzar más tarde. La discusión no se relaciona solo con comodidad: también involucra hábitos de sueño, organización familiar y funcionamiento de los establecimientos.',
  },
  {
    type: 'paragraph',
    text: 'Quienes apoyan horarios más tardíos señalan que durante la adolescencia los patrones de sueño suelen desplazarse. A muchos jóvenes les resulta difícil dormirse temprano, incluso cuando deben levantarse a primera hora.',
  },
  {
    type: 'paragraph',
    text: 'Si el inicio de clases obliga a despertarse demasiado temprano, el tiempo total de sueño puede reducirse. Dormir menos, a su vez, puede afectar la atención, el estado de ánimo y el desempeño en distintas tareas.',
  },
  {
    type: 'paragraph',
    text: 'Algunas experiencias escolares han registrado mejoras en asistencia o puntualidad después de retrasar el horario de entrada. Sin embargo, esos resultados no aparecen de la misma manera en todos los establecimientos y pueden depender de otros cambios realizados al mismo tiempo.',
  },
  {
    type: 'paragraph',
    text: 'También existen dificultades prácticas. Una entrada más tarde puede modificar horarios de transporte, actividades deportivas, trabajos de familiares y la hora de salida durante la tarde.',
  },
  {
    type: 'paragraph',
    text: 'Por eso, afirmar que retrasar las clases es una solución simple sería exagerado. La evidencia sugiere que el horario puede influir en el descanso de los estudiantes, pero cualquier cambio debe considerar las condiciones concretas de cada comunidad escolar.',
  },
  {
    type: 'paragraph',
    text: 'La discusión, entonces, no debería reducirse a elegir entre "temprano" o "tarde". La pregunta más útil es cómo organizar una jornada que permita suficiente descanso sin ignorar las necesidades logísticas de quienes participan en ella.',
  },
];

const argumentosEvidencias: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS',
  unitCode: 'LENGUAJE.EVALUAR',
  subjectKey: 'lenguaje',
  order: 3,
  title: 'Argumentos y evidencias',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar tesis, argumentos y evidencias dentro de un texto, evaluar qué tan bien respaldan una postura y distinguir entre afirmaciones, razones, ejemplos y pruebas relevantes.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Argumentos y evidencias' },

    { type: 'heading', level: 2, text: '1. ¿Qué es una tesis?' },
    {
      type: 'paragraph',
      text: 'La tesis es la idea principal que un texto argumentativo busca defender. Ejemplo: "Las escuelas deberían aumentar los espacios de sombra en sus patios." Esa es una postura que necesita razones que la respalden.',
    },

    { type: 'heading', level: 2, text: '2. ¿Qué es un argumento?' },
    {
      type: 'paragraph',
      text: 'Un argumento es una razón que apoya la tesis. Tesis: "Las escuelas deberían aumentar los espacios de sombra." Argumento: "La exposición prolongada al sol puede dificultar el uso del patio durante las horas más calurosas." El argumento explica por qué la propuesta tiene sentido.',
    },

    { type: 'heading', level: 2, text: '3. ¿Qué es una evidencia?' },
    {
      type: 'paragraph',
      text: 'La evidencia es la información utilizada para respaldar una afirmación. Puede incluir: datos; resultados de estudios; observaciones; ejemplos; testimonios pertinentes; comparaciones; registros. No toda evidencia tiene el mismo valor.',
    },

    { type: 'heading', level: 2, text: '4. Afirmar no es demostrar' },
    { type: 'paragraph', text: 'Decir "Esta medida es excelente." no constituye por sí mismo evidencia. Es una valoración. Para sostenerla sería necesario entregar razones o datos.' },

    { type: 'heading', level: 2, text: '5. La evidencia debe ser pertinente' },
    {
      type: 'paragraph',
      text: 'Una evidencia puede ser verdadera y aun así no apoyar el argumento. Tesis: "El transporte público debería aumentar su frecuencia durante la mañana." Evidencia poco pertinente: "La ciudad tiene varios parques nuevos." Aunque la afirmación fuera correcta, no respalda la tesis.',
    },

    { type: 'heading', level: 2, text: '6. Suficiencia de la evidencia' },
    {
      type: 'paragraph',
      text: 'Una sola experiencia puede servir como ejemplo, pero no siempre basta para justificar una afirmación general. Ejemplo: "Mi bus llegó tarde ayer, por lo tanto todos los buses funcionan mal." La conclusión es demasiado amplia para la evidencia disponible.',
    },

    { type: 'heading', level: 2, text: '7. Evidencia y ejemplo' },
    {
      type: 'paragraph',
      text: 'Un ejemplo ayuda a ilustrar una idea, pero no siempre la demuestra. Si una columna menciona a una sola persona que mejoró sus hábitos de estudio, eso puede mostrar que algo es posible, pero no necesariamente que funcione para todos.',
    },

    { type: 'heading', level: 2, text: '8. Argumentos distintos pueden apoyar la misma tesis' },
    {
      type: 'paragraph',
      text: 'Una postura puede sostenerse mediante: razones económicas; razones ambientales; razones sociales; razones prácticas. Evaluar un texto implica reconocer cómo se relacionan esas razones con la tesis.',
    },

    { type: 'heading', level: 2, text: '9. Evidencia faltante' },
    {
      type: 'paragraph',
      text: 'A veces la pregunta no es "¿Qué evidencia aparece?" sino "¿Qué información fortalecería mejor este argumento?" En ese caso debemos elegir evidencia directamente relacionada con la afirmación.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Para evaluar argumentos: identifica la tesis; reconoce las razones; separa argumentos de ejemplos; revisa qué evidencia se ofrece; pregunta si esa evidencia es pertinente; evalúa si es suficiente; evita aceptar una conclusión más amplia que el respaldo disponible.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la tesis principal del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las plazas deberían eliminar sus juegos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los proyectos de arborización deberían priorizar sectores con mayor falta de sombra y vegetación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Los árboles son la única solución a los problemas urbanos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todos los barrios deberían recibir exactamente la misma cantidad de árboles.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto sostiene que no basta con distribuir árboles de manera uniforme y que deberían priorizarse los sectores con mayores carencias.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes ideas funciona como argumento a favor de la tesis?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Algunos barrios ya tienen calles arboladas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La sombra puede mejorar las condiciones de uso de veredas y espacios públicos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Existen distintas especies de árboles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las plazas tienen bancas y juegos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La idea explica por qué aumentar la vegetación en sectores con poca sombra puede resultar beneficioso.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el ejemplo de una plaza que queda vacía durante las horas más calurosas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ilustrar cómo la falta de sombra puede limitar el uso de un espacio público.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todas las plazas de la ciudad están vacías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Probar que los juegos infantiles son innecesarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que los árboles impiden utilizar las plazas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El ejemplo concreta el argumento de que la sombra influye en la posibilidad de utilizar los espacios públicos.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué el autor menciona problemas posibles de una arborización mal planificada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que no deberían plantarse más árboles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para reconocer una limitación sin abandonar la tesis principal.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para afirmar que todas las especies producen daños.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para sustituir su argumento por uno contrario.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El autor incorpora una objeción razonable, pero sostiene que esa dificultad no invalida la necesidad de priorizar ciertos sectores.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes evidencias fortalecería mejor la tesis del texto?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Un registro que muestre qué barrios tienen menor cobertura arbórea y mayores temperaturas superficiales durante el verano.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Una encuesta sobre los colores de árboles preferidos por los habitantes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una lista de plazas construidas durante los últimos veinte años.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El testimonio de una persona que prefiere caminar de noche.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Esa información permitiría identificar directamente los sectores con mayor falta de vegetación y condiciones térmicas más desfavorables, lo que respalda la prioridad propuesta.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes ideas funciona como evidencia a favor de comenzar las clases más tarde?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Algunos adolescentes tienen dificultades para dormirse temprano.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todas las familias prefieren horarios más tardíos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las actividades deportivas son innecesarias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ningún establecimiento puede modificar sus horarios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto presenta los patrones de sueño adolescentes como una razón relevante para considerar horarios de entrada más tardíos.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación existe entre dormir menos y la tesis discutida?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Constituye una posible consecuencia de horarios muy tempranos y apoya la consideración de cambios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que todos los estudiantes deberían estudiar desde casa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Prueba que la hora de entrada es la única causa del desempeño escolar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No tiene relación con el debate.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto vincula un inicio muy temprano con menor tiempo de sueño y posibles efectos sobre atención y estado de ánimo.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el texto aclara que las mejoras observadas no aparecen en todos los establecimientos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para mostrar que la evidencia disponible debe interpretarse con cautela.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que los horarios nunca influyen.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para afirmar que todos los estudios son incorrectos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para defender exclusivamente horarios más tempranos.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La aclaración evita generalizar resultados y reconoce que pueden intervenir otros factores.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones está mejor respaldada por el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Retrasar el inicio de clases garantiza mejores calificaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El horario puede influir en el descanso, pero sus efectos deben evaluarse junto con otras condiciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las jornadas escolares deberían comenzar a la misma hora en todo el país.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los problemas de sueño adolescente se deben exclusivamente a las escuelas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto reconoce posibles beneficios, pero también límites y condiciones logísticas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes evidencias permitiría evaluar mejor si retrasar el inicio de clases produjo una mejora en un establecimiento específico?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar sueño, asistencia y puntualidad antes y después del cambio, considerando otras modificaciones realizadas durante el mismo período.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Preguntar únicamente si los estudiantes prefieren dormir más.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Observar el horario de una sola clase durante una semana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Registrar cuántos profesores viven cerca del establecimiento.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La comparación permitiría relacionar el cambio de horario con resultados concretos y controlar parcialmente la influencia de otros factores simultáneos.',
        },
      ],
    },
  ],
};

export default argumentosEvidencias;
