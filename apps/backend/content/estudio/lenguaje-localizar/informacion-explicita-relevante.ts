// CONTENT-L2 -- Golden Unit Lenguaje / Localizar, Recurso 1. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md). Mismo criterio de ajustes
// técnicos que content/estudio/m1-geometria/*.ts (contentBlocks, keys sin
// padding) -- sin excepciones.
//
// Representación de los textos (sección 11 del encargo): el schema fuente
// no tiene un tipo "pasaje compartido" -- cada Question es una entidad
// independiente con su propio stemContent. La representación mínima
// compatible es incluir el texto completo dentro del stemContent de cada
// una de sus 5 preguntas asociadas, seguido del enunciado propio de esa
// pregunta -- sin inventar un bloque nuevo ni tocar el schema.
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
  { type: 'heading', level: 3, text: 'Texto A — Una biblioteca sobre ruedas llegará a seis localidades rurales' },
  {
    type: 'paragraph',
    text: 'La Municipalidad de Valle Claro anunció que, a partir del 12 de abril, comenzará a funcionar una biblioteca móvil destinada a comunidades rurales que actualmente no cuentan con una biblioteca pública cercana. El proyecto utilizará un bus acondicionado con estanterías, mesas de lectura y una colección inicial de 2.400 libros.',
  },
  {
    type: 'paragraph',
    text: 'Durante su primera etapa, el vehículo recorrerá seis localidades: Los Maitenes, Santa Elisa, El Molino, Las Vertientes, San Gabriel y Quebrada Honda. Cada localidad recibirá una visita cada dos semanas, de acuerdo con un calendario publicado por el municipio.',
  },
  {
    type: 'paragraph',
    text: 'Además del préstamo de libros, el programa ofrecerá actividades de lectura para niños, orientación para estudiantes y talleres breves de escritura. Según la coordinadora del proyecto, Paula Rivas, el objetivo principal es facilitar el acceso a materiales de lectura sin obligar a los habitantes a desplazarse hasta el centro urbano.',
  },
  {
    type: 'paragraph',
    text: 'El municipio informó que la iniciativa costó 48 millones de pesos, monto que incluyó la compra y adaptación del vehículo, equipamiento y adquisición de libros. Una parte del financiamiento provino de un fondo regional y otra del presupuesto municipal.',
  },
  {
    type: 'paragraph',
    text: 'La primera parada será en Los Maitenes, donde el bus permanecerá entre las 10:00 y las 16:00 horas. La semana siguiente se realizará una actividad especial de inauguración en Santa Elisa, aunque esa jornada no reemplazará la visita regular correspondiente a la localidad.',
  },
  {
    type: 'paragraph',
    text: 'Si el programa obtiene una evaluación positiva durante sus primeros seis meses, el municipio estudiará incorporar otras cuatro localidades durante el año siguiente.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — La caja del altillo' },
  {
    type: 'paragraph',
    text: 'Cuando Elena llegó a la casa de su abuelo, la lluvia ya había empezado a golpear las ventanas del comedor. Había ido para ayudarlo a ordenar algunas habitaciones antes de que comenzaran las reparaciones del techo, previstas para el lunes siguiente.',
  },
  {
    type: 'paragraph',
    text: 'El abuelo le pidió que empezara por el altillo. Allí había varias cajas acumuladas desde hacía años: algunas contenían libros, otras ropa antigua y una estaba llena de herramientas que ya nadie utilizaba.',
  },
  {
    type: 'paragraph',
    text: 'Mientras movía una silla, Elena encontró una caja pequeña de madera debajo de una manta verde. En la tapa había una etiqueta escrita a mano: "Fotografías, 1987–1994".',
  },
  { type: 'paragraph', text: '—Pensé que la había perdido —dijo el abuelo cuando Elena bajó con la caja.' },
  {
    type: 'paragraph',
    text: 'Se sentaron en la mesa de la cocina y comenzaron a revisar las fotografías. La mayoría mostraba reuniones familiares, paseos y celebraciones. En una de ellas aparecía el abuelo frente a una tienda de bicicletas junto a un hombre que Elena no reconoció.',
  },
  { type: 'paragraph', text: '—Ese es Roberto —explicó él—. Trabajamos juntos durante casi diez años.' },
  {
    type: 'paragraph',
    text: 'Más tarde encontraron una fotografía tomada junto a un lago. En el reverso se leía: "Puerto Azul, febrero de 1991". El abuelo recordó que ese viaje había sido el primero que hizo después de comprar su automóvil rojo.',
  },
  {
    type: 'paragraph',
    text: 'Antes de guardar nuevamente las fotografías, separó tres de ellas. Una la puso en un marco del comedor, otra decidió entregársela a su hermana y la tercera la dejó sobre el escritorio porque quería mostrarla a Roberto cuando volviera a verlo.',
  },
  {
    type: 'paragraph',
    text: 'Elena cerró la caja y escribió una nueva etiqueta para que fuera más fácil encontrarla en el futuro. Esta vez puso: "Fotos familiares y viajes — altillo".',
  },
];

const informacionExplicitaRelevante: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE',
  unitCode: 'LENGUAJE.LOCALIZAR',
  subjectKey: 'lenguaje',
  order: 1,
  title: 'Información explícita y relevante',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá localizar información explícita en textos continuos, distinguir datos relevantes de información secundaria e identificar detalles específicos aunque aparezcan rodeados de información similar o competidora.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Información explícita y relevante' },

    { type: 'heading', level: 2, text: '1. ¿Qué significa localizar información?' },
    { type: 'paragraph', text: 'Localizar consiste en encontrar información que aparece expresamente en el texto. La respuesta no necesita ser inferida: está escrita.' },
    { type: 'paragraph', text: 'Por ejemplo, si un texto dice: "La exposición abrirá el 14 de septiembre." y preguntan cuándo abrirá, la respuesta es: 14 de septiembre.' },

    { type: 'heading', level: 2, text: '2. Explícito no significa siempre fácil' },
    {
      type: 'paragraph',
      text: 'Una información puede estar escrita directamente y aun así ser difícil de encontrar. Esto ocurre cuando: el texto es largo; aparecen muchos datos similares; existen varias fechas, nombres o cantidades; la información está repartida entre distintas secciones; una alternativa utiliza palabras casi idénticas a las del texto, pero cambia un detalle.',
    },

    { type: 'heading', level: 2, text: '3. Identificar las palabras clave de la pregunta' },
    {
      type: 'paragraph',
      text: 'Antes de buscar, identifica exactamente qué se solicita. Por ejemplo: "¿Por qué fue suspendida la actividad del sábado?" Palabras clave: actividad; sábado; motivo de suspensión. Esto evita confundirla con otra actividad o con otra fecha.',
    },

    { type: 'heading', level: 2, text: '4. Información relevante y secundaria' },
    {
      type: 'paragraph',
      text: 'No toda la información de un texto tiene la misma importancia para responder una pregunta. Si preguntan "¿Cuántas personas participaron?", pueden ser irrelevantes para esa pregunta: quién organizó; dónde ocurrió; cuánto duró; qué dijeron los asistentes. La tarea es encontrar el dato solicitado, no resumir todo el texto.',
    },

    { type: 'heading', level: 2, text: '5. Información competidora' },
    {
      type: 'paragraph',
      text: 'Los textos pueden contener datos similares. Por ejemplo: 120 personas participaron el viernes; 180 participaron el sábado; 300 asistieron durante todo el fin de semana. Si preguntan por el sábado, responder 300 sería incorrecto aunque ese número aparezca en el texto.',
    },

    { type: 'heading', level: 2, text: '6. Reformulación' },
    {
      type: 'paragraph',
      text: 'La pregunta no siempre repite exactamente las mismas palabras del texto. Texto: "El museo permanecerá cerrado debido a trabajos de mantenimiento." Pregunta: "¿Cuál es la razón del cierre del museo?" La respuesta sigue estando explícita: trabajos de mantenimiento.',
    },

    { type: 'heading', level: 2, text: '7. Buscar en una zona específica' },
    {
      type: 'paragraph',
      text: 'Algunas preguntas indican dónde buscar: según el primer párrafo; de acuerdo con la sección "Resultados"; en relación con la segunda jornada. Cuando eso ocurre, conviene limitar la búsqueda a esa parte.',
    },

    { type: 'heading', level: 2, text: '8. Verificar antes de responder' },
    {
      type: 'paragraph',
      text: 'Después de encontrar una posible respuesta, vuelve al texto y comprueba: que corresponde exactamente a lo preguntado; que no pertenece a otro momento, persona o categoría; que no agregaste una inferencia propia.',
    },

    { type: 'heading', level: 2, text: '9. Distractores frecuentes' },
    {
      type: 'paragraph',
      text: 'En preguntas de localización, los distractores suelen ser: un dato verdadero, pero que responde otra pregunta; una cifra cercana; información correspondiente a otra persona; una causa distinta mencionada en el texto; una generalización de un dato específico.',
    },

    { type: 'heading', level: 2, text: '10. Idea clave' },
    {
      type: 'paragraph',
      text: 'Para localizar información explícita: identifica qué pide exactamente la pregunta; busca palabras o ideas clave; ubica la zona relevante; distingue el dato correcto de información competidora; comprueba literalmente la evidencia antes de responder.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuándo comenzará a funcionar la biblioteca móvil?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El 6 de abril' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El 12 de abril' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Después de seis meses' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El año siguiente' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El primer párrafo indica explícitamente que el programa comenzará a funcionar a partir del 12 de abril.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuántos libros tendrá inicialmente la biblioteca móvil?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '240' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1.200' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2.400' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '4.800' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El texto señala que el bus contará con una colección inicial de 2.400 libros.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: 'Según el texto, ¿cuál es el objetivo principal del proyecto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar las bibliotecas públicas del centro urbano.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Facilitar el acceso a materiales de lectura en comunidades rurales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Organizar talleres de escritura todas las semanas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Financiar actividades escolares en las seis localidades.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La coordinadora señala expresamente que el objetivo es facilitar el acceso a materiales de lectura sin que los habitantes tengan que trasladarse al centro urbano.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué incluye el monto de 48 millones de pesos mencionado en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Únicamente la compra de los libros.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El funcionamiento del programa durante seis meses.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El vehículo, su adaptación, equipamiento y libros.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La construcción de bibliotecas en seis localidades.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto especifica que los 48 millones incluyen la compra y adaptación del vehículo, el equipamiento y la adquisición de libros.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál afirmación sobre Santa Elisa está expresamente respaldada por el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Será la primera localidad visitada por la biblioteca móvil.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Recibirá una inauguración que sustituirá su visita regular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tendrá una actividad especial además de su visita regular.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Será incorporada únicamente si el programa resulta exitoso.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que habrá una actividad especial de inauguración en Santa Elisa y aclara que no reemplazará la visita regular.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué Elena fue a la casa de su abuelo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para buscar fotografías antiguas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para ayudar a ordenar antes de reparar el techo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para visitar a Roberto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para llevar una caja al altillo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El primer párrafo señala explícitamente que Elena fue a ayudar a ordenar habitaciones antes de las reparaciones del techo.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Dónde encontró Elena la caja de fotografías?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Sobre el escritorio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Dentro de una caja de herramientas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Debajo de una manta verde en el altillo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Junto a la mesa de la cocina.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El relato indica que Elena encontró la caja debajo de una manta verde mientras ordenaba el altillo.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué información aparecía en el reverso de una fotografía?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El nombre de Roberto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '"Fotografías, 1987–1994".' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '"Fotos familiares y viajes — altillo".' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '"Puerto Azul, febrero de 1991".' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La fotografía tomada junto al lago tenía escrito en el reverso: "Puerto Azul, febrero de 1991".' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué decidió hacer el abuelo con una de las tres fotografías que separó?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Guardarla nuevamente bajo la manta verde.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Entregársela a su hermana.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Enviarla a la tienda de bicicletas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Colocarla dentro de la caja de herramientas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala explícitamente que una de las fotografías sería entregada a su hermana.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes relaciones entre una fotografía y su destino final está correctamente indicada?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fotografía del lago → marco del comedor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fotografía con Roberto → destinada necesariamente a su hermana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una de las fotografías separadas → quedó sobre el escritorio para mostrarla a Roberto.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todas las fotografías de viajes → fueron retiradas de la caja.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto señala que una de las tres fotografías separadas quedó sobre el escritorio porque el abuelo quería mostrársela a Roberto. No especifica que fuera necesariamente la fotografía donde ambos aparecen.',
        },
      ],
    },
  ],
};

export default informacionExplicitaRelevante;
