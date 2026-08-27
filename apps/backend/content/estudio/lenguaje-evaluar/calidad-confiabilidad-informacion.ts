// CONTENT-L3B -- Golden Unit Lenguaje / Evaluar, Recurso 4. Contenido
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
  { type: 'heading', level: 3, text: 'Texto A — Más bicicletas en el centro: qué muestran realmente los conteos' },
  {
    type: 'paragraph',
    text: 'Durante los últimos tres años, el Departamento de Movilidad de Puerto Claro ha realizado conteos de bicicletas en seis intersecciones del centro de la ciudad. Los registros se efectúan durante dos semanas de abril y dos semanas de octubre, entre las 07:00 y las 19:00.',
  },
  {
    type: 'paragraph',
    text: 'Según el informe publicado este mes, el promedio diario observado en esos puntos pasó de 1.840 bicicletas en 2023 a 2.310 en 2025, un aumento aproximado del 26 %.',
  },
  {
    type: 'paragraph',
    text: 'El cambio no fue igual en todas las intersecciones. En dos puntos cercanos a nuevas ciclovías el aumento superó el 40 %, mientras que en uno de los sectores observados prácticamente no hubo variación.',
  },
  {
    type: 'paragraph',
    text: 'El informe advierte que estos datos no representan todos los desplazamientos en bicicleta de la ciudad. Solo registran seis ubicaciones y períodos específicos del año. Tampoco permiten determinar por sí solos por qué aumentó el número de bicicletas observadas.',
  },
  {
    type: 'paragraph',
    text: 'Durante el mismo período se ampliaron algunas ciclovías, aumentó la cantidad de estacionamientos para bicicletas y también subió el precio del transporte motorizado. Cualquiera de estos factores podría haber influido.',
  },
  {
    type: 'paragraph',
    text: 'La asociación Ciclistas de Puerto Claro señaló que las cifras muestran una tendencia positiva y pidió ampliar la red de ciclovías. Por su parte, la Cámara de Comercio del Centro pidió estudiar también los efectos que cualquier cambio vial podría tener sobre zonas de carga y estacionamiento.',
  },
  { type: 'paragraph', text: 'El Departamento de Movilidad informó que repetirá los conteos el próximo año y que incorporará dos nuevas intersecciones para ampliar la cobertura.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — "El truco de los 20 minutos que duplica tu memoria"' },
  { type: 'paragraph', text: '¿Quieres recordar el doble de información sin estudiar más? Investigadores han descubierto un método sorprendente que funciona prácticamente para cualquier persona.' },
  {
    type: 'paragraph',
    text: 'La técnica es simple: después de estudiar durante veinte minutos, debes cerrar los ojos durante exactamente tres minutos y pensar en otra cosa. Según varios expertos, este breve descanso permite que el cerebro "archive" toda la información y libera espacio para seguir aprendiendo.',
  },
  {
    type: 'paragraph',
    text: 'Miles de estudiantes ya estarían utilizando este método con resultados increíbles. En redes sociales abundan testimonios de personas que aseguran haber pasado de olvidar casi todo a recordar contenidos completos después de aplicarlo durante apenas una semana.',
  },
  { type: 'paragraph', text: 'Una estudiante comentó: "Antes necesitaba estudiar toda la tarde. Ahora leo una vez y lo recuerdo casi todo".' },
  {
    type: 'paragraph',
    text: 'Además, un conocido especialista en productividad afirmó recientemente que "el cerebro aprende mejor cuando no lo fuerzas". Esto demuestra que la técnica tiene respaldo científico.',
  },
  {
    type: 'paragraph',
    text: 'No es necesario modificar ningún otro hábito: puedes dormir poco, estudiar con el teléfono al lado o interrumpirte constantemente. Si respetas los veinte minutos de estudio y los tres de descanso, los resultados aparecerán.',
  },
  {
    type: 'paragraph',
    text: 'Algunas personas dicen que cada estudiante aprende de manera diferente, pero el cerebro humano funciona bajo los mismos principios básicos. Por eso, este método debería funcionar para casi todos.',
  },
  { type: 'paragraph', text: 'Pruébalo durante siete días. No tienes nada que perder y podrías transformar por completo tu forma de estudiar.' },
];

const calidadConfiabilidadInformacion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION',
  unitCode: 'LENGUAJE.EVALUAR',
  subjectKey: 'lenguaje',
  order: 4,
  title: 'Calidad y confiabilidad de la información',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá evaluar la calidad y confiabilidad de la información de un texto considerando la fuente, la evidencia presentada, la actualidad, la precisión, la transparencia sobre límites y la coherencia entre afirmaciones y respaldo.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Calidad y confiabilidad de la información' },

    { type: 'heading', level: 2, text: '1. Información disponible no significa información confiable' },
    {
      type: 'paragraph',
      text: 'Que una afirmación aparezca escrita, publicada o repetida muchas veces no garantiza que sea correcta. Para evaluar su confiabilidad debemos preguntarnos: ¿quién la presenta?; ¿en qué evidencia se basa?; ¿esa evidencia puede verificarse?; ¿la información es actual?; ¿se distinguen hechos de opiniones?',
    },

    { type: 'heading', level: 2, text: '2. La fuente importa' },
    {
      type: 'paragraph',
      text: 'Una fuente puede ser más o menos adecuada según el tema. Por ejemplo, para conocer cifras oficiales de matrícula conviene un organismo educacional; para resultados de una investigación, el estudio o institución que la realizó; para el horario de un servicio, la entidad responsable. Una persona puede tener experiencia relevante, pero eso no convierte automáticamente cualquier afirmación suya en evidencia suficiente.',
    },

    { type: 'heading', level: 2, text: '3. Autoridad pertinente' },
    {
      type: 'paragraph',
      text: 'No basta con que alguien sea "experto". Su conocimiento debe relacionarse con el tema. Ejemplo: que una persona sea una reconocida arquitecta no la convierte necesariamente en una autoridad sobre tratamientos médicos. Debemos evaluar pertinencia, no solo prestigio.',
    },

    { type: 'heading', level: 2, text: '4. Evidencia verificable' },
    {
      type: 'paragraph',
      text: 'Una información gana confiabilidad cuando permite saber de dónde vienen los datos, cómo fueron obtenidos, qué período representan y quién realizó el análisis. Comparemos: "Los accidentes aumentaron muchísimo." con "Según los registros municipales, los accidentes reportados pasaron de 48 a 67 entre 2024 y 2025." La segunda afirmación permite evaluar mejor el respaldo.',
    },

    { type: 'heading', level: 2, text: '5. Actualidad de la información' },
    {
      type: 'paragraph',
      text: 'Algunos datos envejecen rápidamente. Una fuente de hace diez años puede servir para estudiar un proceso histórico, pero quizá no sea adecuada para responder "¿Cuál es la situación actual?" La relevancia temporal depende de la pregunta.',
    },

    { type: 'heading', level: 2, text: '6. Transparencia sobre límites' },
    {
      type: 'paragraph',
      text: 'Una fuente confiable no necesita presentar sus conclusiones como certezas absolutas. Frases como "los resultados son preliminares"; "la muestra fue pequeña"; "no puede establecerse causalidad", pueden aumentar la confiabilidad porque muestran que el emisor reconoce límites.',
    },

    { type: 'heading', level: 2, text: '7. Señales de baja confiabilidad' },
    {
      type: 'paragraph',
      text: 'Conviene desconfiar cuando un texto: no identifica fuentes; usa cifras sin explicar su origen; generaliza desde un solo caso; presenta opiniones como hechos; promete certeza total sin respaldo; selecciona únicamente evidencia favorable; utiliza afirmaciones extraordinarias sin prueba suficiente.',
    },

    { type: 'heading', level: 2, text: '8. Corroboración' },
    {
      type: 'paragraph',
      text: 'Una información es más sólida cuando puede contrastarse con otras fuentes independientes y pertinentes. Si varias fuentes confiables coinciden, aumenta nuestra confianza. Pero repetir una afirmación entre sitios que copian la misma fuente original no equivale a múltiples confirmaciones independientes.',
    },

    { type: 'heading', level: 2, text: '9. Confiabilidad no es estar de acuerdo' },
    {
      type: 'paragraph',
      text: 'Podemos considerar confiable una fuente aunque su conclusión no nos guste. Y podemos estar de acuerdo con una afirmación que, sin embargo, está mal respaldada. Evaluar información exige separar "¿Me convence?" de "¿Está suficientemente respaldada?"',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Ante una fuente o afirmación: identifica quién la produce; revisa su relación con el tema; busca origen y método de los datos; comprueba actualidad; distingue hechos de opinión; observa si reconoce límites; busca corroboración; evita confundir popularidad con confiabilidad.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué elemento aumenta especialmente la confiabilidad de los datos presentados?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que varias personas comentan el tema.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que se identifica quién realizó los conteos, dónde y durante qué períodos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que el aumento supera el 20 %.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que una asociación apoya la ampliación de ciclovías.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto identifica la institución responsable, los puntos observados, las fechas y los horarios, lo que permite evaluar cómo se obtuvieron los datos.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el informe señala que los conteos no representan todos los viajes en bicicleta de la ciudad?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque solo se observaron seis intersecciones durante períodos determinados.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque ninguna bicicleta fue registrada durante la noche.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los ciclistas utilizan las mismas calles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los conteos fueron realizados por comerciantes.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La propia fuente reconoce que la cobertura espacial y temporal es limitada.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué efecto tiene sobre la confiabilidad del informe que este reconozca sus propias limitaciones?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La disminuye, porque una fuente confiable nunca reconoce incertidumbre.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La fortalece, porque evita presentar los datos como más generales o concluyentes de lo que permiten.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La vuelve inútil para cualquier análisis.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que los conteos fueron incorrectos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Explicitar límites permite interpretar los resultados con mayor precisión y evita conclusiones exageradas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué el aumento de bicicletas observado no permite afirmar por sí solo que las nuevas ciclovías fueron la causa?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el texto identifica varios factores que cambiaron durante el mismo período.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque las ciclovías nunca afectan el transporte.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el aumento ocurrió únicamente en sectores sin ciclovías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los datos no incluyen ninguna cifra.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Además de las ciclovías, cambiaron estacionamientos y costos de transporte, por lo que los conteos no permiten aislar una única causa.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué información adicional permitiría evaluar con mayor solidez si las nuevas ciclovías contribuyeron al aumento observado?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Datos comparables de varios períodos y sectores con y sin nuevas ciclovías, controlando en lo posible otros cambios relevantes.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La opinión de una sola persona que comenzó a utilizar bicicleta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El color preferido de las bicicletas vendidas durante el año.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número total de automóviles registrados en otra ciudad.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una comparación más amplia y controlada permitiría relacionar mejor la presencia de nuevas ciclovías con los cambios observados, sin atribuir causalidad desde una simple coincidencia temporal.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es una señal clara de baja confiabilidad en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presenta una recomendación relacionada con el estudio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Habla sobre memoria y aprendizaje.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Afirma que existen "varios expertos" sin identificarlos ni mostrar la investigación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Incluye un testimonio de una estudiante.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto invoca expertos e investigadores, pero no entrega nombres, estudios, instituciones ni datos que permitan verificar las afirmaciones.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué el testimonio de una estudiante no basta para demostrar que el método funciona para casi todas las personas?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque una experiencia individual no permite justificar una afirmación tan general.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque ningún estudiante puede describir su experiencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los testimonios siempre son falsos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque estudiar durante veinte minutos es imposible.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Un caso particular puede ilustrar una experiencia, pero no demuestra eficacia general.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué problema presenta la frase "Esto demuestra que la técnica tiene respaldo científico"?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Confunde la opinión de un especialista en productividad con evidencia científica suficiente sobre el método específico.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Incluye demasiadas cifras estadísticas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reconoce demasiadas limitaciones metodológicas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Utiliza información proveniente de varias investigaciones independientes.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La cita es general y no demuestra que la técnica descrita haya sido evaluada científicamente.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes características reduce más la confiabilidad de la afirmación de que el método "duplica tu memoria"?' },
      ]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La ausencia de una explicación verificable sobre cómo se midió esa supuesta duplicación.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Que la publicación utiliza párrafos breves.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que recomienda cerrar los ojos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que menciona un período de siete días.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Una afirmación cuantitativa fuerte necesita mostrar cómo fue medida y con qué evidencia se obtuvo.' }],
    },
    {
      questionKey: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál sería la mejor manera de verificar la afirmación principal de la publicación?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Buscar estudios identificables que comparen el rendimiento de grupos que aplican y no aplican la técnica, con métodos y resultados disponibles para revisión.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Contar cuántas veces fue compartida la publicación en redes sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Buscar más testimonios de personas que digan que les funcionó.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consultar únicamente al autor de la publicación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una evaluación controlada, identificable y revisable aportaría evidencia mucho más sólida que popularidad o testimonios individuales.',
        },
      ],
    },
  ],
};

export default calidadConfiabilidadInformacion;
