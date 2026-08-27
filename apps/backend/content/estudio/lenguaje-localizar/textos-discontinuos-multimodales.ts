// CONTENT-L2 -- Golden Unit Lenguaje / Localizar, Recurso 3. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md). Ver cabecera de
// informacion-explicita-relevante.ts para el criterio de representación de
// textos.
//
// Representación de tablas (sección 11 del encargo): el schema fuente no
// tiene un bloque "tabla" -- se usa la representación mínima compatible:
// cada fila se transcribe como un párrafo con celdas separadas por " | ",
// precedido por un párrafo de encabezado con el mismo formato. Sin inventar
// tipo de bloque nuevo, sin tocar el schema.
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
  { type: 'heading', level: 3, text: 'Texto A — Programa "Muévete al colegio"' },
  { type: 'paragraph', text: 'Objetivo: promover formas de traslado más sustentables entre estudiantes de enseñanza media.' },
  { type: 'heading', level: 3, text: 'Resultados de la semana piloto' },
  { type: 'paragraph', text: 'Participaron 240 estudiantes de cuatro establecimientos.' },
  { type: 'paragraph', text: 'Medio de transporte | Lunes | Miércoles | Viernes' },
  { type: 'paragraph', text: 'A pie | 38 | 44 | 51' },
  { type: 'paragraph', text: 'Bicicleta | 24 | 36 | 42' },
  { type: 'paragraph', text: 'Transporte público | 96 | 91 | 87' },
  { type: 'paragraph', text: 'Automóvil particular | 82 | 69 | 60' },
  { type: 'heading', level: 3, text: 'Actividades complementarias' },
  { type: 'paragraph', text: 'Taller de seguridad para ciclistas — Miércoles · 16:00–17:00 — Gimnasio municipal — 30 cupos.' },
  { type: 'paragraph', text: 'Caminata comunitaria — Viernes · 07:30 — Salida desde Plaza Norte — Recorrido aproximado: 2,5 km.' },
  { type: 'paragraph', text: 'Revisión gratuita de bicicletas — Viernes · 15:00–18:00 — Patio del Liceo Central — Atención por orden de llegada.' },
  { type: 'heading', level: 3, text: 'Importante' },
  { type: 'paragraph', text: 'Los datos de la tabla corresponden exclusivamente a los 240 estudiantes inscritos en la semana piloto.' },
  {
    type: 'paragraph',
    text: 'Para participar en el taller de seguridad es necesario registrarse previamente. La caminata comunitaria y la revisión de bicicletas no requieren inscripción.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Festival Jóvenes y Ciencia' },
  { type: 'paragraph', text: 'Sábado 19 de octubre — Centro Cultural Horizonte' },
  { type: 'heading', level: 3, text: 'Acceso general' },
  { type: 'paragraph', text: 'Entrada gratuita.' },
  { type: 'paragraph', text: 'Las actividades se desarrollarán entre las 09:30 y las 18:30.' },
  { type: 'paragraph', text: 'Los menores de 14 años deben ingresar acompañados por una persona adulta.' },
  { type: 'heading', level: 3, text: 'Programa' },
  { type: 'paragraph', text: 'Hora | Actividad | Lugar | Condición' },
  { type: 'paragraph', text: '10:00 | Viaje al sistema solar | Auditorio | Sin inscripción' },
  { type: 'paragraph', text: '11:30 | Construye un pequeño robot | Laboratorio 2 | Inscripción obligatoria' },
  { type: 'paragraph', text: '13:00 | Descanso | Patio central | —' },
  { type: 'paragraph', text: '14:00 | Ciencia de los alimentos | Sala Norte | Sin inscripción' },
  { type: 'paragraph', text: '15:30 | Desafío de programación | Laboratorio 1 | Inscripción obligatoria' },
  { type: 'paragraph', text: '17:00 | Preguntas a una astrónoma | Auditorio | Sin inscripción' },
  { type: 'heading', level: 3, text: 'Inscripciones' },
  {
    type: 'paragraph',
    text: 'Las inscripciones para talleres estarán disponibles desde el 7 de octubre a las 18:00 en el sitio del Centro Cultural Horizonte.',
  },
  { type: 'paragraph', text: 'Cada persona podrá reservar como máximo un taller con inscripción obligatoria.' },
  {
    type: 'paragraph',
    text: 'Las reservas se mantendrán hasta 10 minutos antes de comenzar la actividad. Después de ese momento, los cupos podrán entregarse a personas que estén esperando.',
  },
  { type: 'heading', level: 3, text: 'Servicios' },
  { type: 'paragraph', text: 'Guardarropa: 09:30–18:45' },
  { type: 'paragraph', text: 'Cafetería: 10:30–17:30' },
  { type: 'paragraph', text: 'Punto de información: 09:30–18:30' },
  { type: 'heading', level: 3, text: 'Transporte especial' },
  { type: 'paragraph', text: 'Un bus gratuito saldrá desde Plaza Central hacia el recinto a las: 09:00 · 11:00 · 13:30.' },
  { type: 'paragraph', text: 'Los viajes de regreso desde el Centro Cultural serán a las: 16:00 · 18:45.' },
];

const textosDiscontinuosMultimodales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES',
  unitCode: 'LENGUAJE.LOCALIZAR',
  subjectKey: 'lenguaje',
  order: 3,
  title: 'Localización en textos discontinuos y multimodales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá localizar información explícita en textos discontinuos y multimodales, relacionando datos distribuidos entre tablas, encabezados, recuadros y distintas secciones de una misma representación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Localización en textos discontinuos y multimodales' },

    { type: 'heading', level: 2, text: '1. ¿Qué es un texto discontinuo?' },
    {
      type: 'paragraph',
      text: 'Un texto discontinuo no organiza toda su información en párrafos seguidos. Puede presentarla mediante: tablas; horarios; formularios; listas; fichas; diagramas; mapas; gráficos; calendarios. Para comprenderlo, muchas veces hay que cruzar filas, columnas, títulos y categorías.',
    },

    { type: 'heading', level: 2, text: '2. ¿Qué es un texto multimodal?' },
    {
      type: 'paragraph',
      text: 'Un texto multimodal combina distintos modos de comunicar información. Por ejemplo: palabras; números; imágenes; íconos; gráficos; distribución espacial. Una campaña puede incluir un título, una imagen, datos numéricos y una instrucción. Todos esos elementos forman parte del mensaje.',
    },

    { type: 'heading', level: 2, text: '3. Leer primero la estructura' },
    {
      type: 'paragraph',
      text: 'Antes de buscar una respuesta, identifica: título; subtítulos; categorías; columnas; filas; unidades de medida; notas o condiciones. Esto permite saber dónde buscar cada tipo de información.',
    },

    { type: 'heading', level: 2, text: '4. Cruzar fila y columna' },
    {
      type: 'paragraph',
      text: 'En una tabla, encontrar un número no basta. Hay que comprobar que corresponda simultáneamente a: la fila correcta; la columna correcta. Ejemplo: Día | Mañana | Tarde — Lunes | 12 | 18 — Martes | 15 | 21. Si preguntan por el martes en la mañana, la respuesta es 15, no 21.',
    },

    { type: 'heading', level: 2, text: '5. Atención a las unidades' },
    {
      type: 'paragraph',
      text: 'Un mismo texto puede utilizar: personas; kilómetros; minutos; porcentajes; pesos; fechas. No confundas números que representan cosas diferentes.',
    },

    { type: 'heading', level: 2, text: '6. Información repartida' },
    {
      type: 'paragraph',
      text: 'A veces la respuesta requiere consultar dos partes explícitas. Por ejemplo: una tabla muestra que una actividad comienza a las 15:00 y una nota indica que debe llegarse 20 minutos antes. Ambos datos aparecen escritos. No estás infiriendo una intención: estás relacionando información explícita.',
    },

    { type: 'heading', level: 2, text: '7. Títulos y encabezados también informan' },
    { type: 'paragraph', text: 'No ignores: encabezados; rótulos; leyendas; notas al pie; destacados. Muchas preguntas dependen precisamente de ellos.' },

    { type: 'heading', level: 2, text: '8. Distractores frecuentes' },
    {
      type: 'paragraph',
      text: 'En este tipo de preguntas pueden aparecer: un dato de la fila correcta pero columna equivocada; un horario correspondiente a otra actividad; un número correcto con una unidad incorrecta; una condición válida solo para otro grupo; información principal confundida con una nota especial.',
    },

    { type: 'heading', level: 2, text: '9. No leer linealmente' },
    {
      type: 'paragraph',
      text: 'En un texto continuo normalmente avanzas de arriba hacia abajo. En un texto discontinuo puede ser más eficiente: pregunta → categoría → sección → dato. No es necesario releer toda la representación para cada pregunta.',
    },

    { type: 'heading', level: 2, text: '10. Idea clave' },
    {
      type: 'paragraph',
      text: 'Para localizar información en textos discontinuos y multimodales: reconoce cómo está organizada la información; identifica la sección relevante; cruza correctamente categorías; revisa unidades y condiciones; comprueba que el dato responda exactamente a la pregunta.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuántos estudiantes participaron en la semana piloto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '180' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '200' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '240' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '300' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La infografía señala explícitamente que participaron 240 estudiantes.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuántos estudiantes llegaron en bicicleta el miércoles?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '24' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '36' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '42' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '44' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Al cruzar la fila Bicicleta con la columna Miércoles, la tabla muestra 36 estudiantes.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué actividad se realiza el viernes por la mañana?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Taller de seguridad para ciclistas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Revisión gratuita de bicicletas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Caminata comunitaria.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Registro de participantes.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La caminata comunitaria está programada para el viernes a las 07:30.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes actividades exige inscripción previa?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo el taller de seguridad para ciclistas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Solo la caminata comunitaria.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La caminata y la revisión de bicicletas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las tres actividades.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La sección "Importante" especifica que solo el taller de seguridad requiere registro previo.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál combinación de datos corresponde correctamente al viernes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Bicicleta: 36 estudiantes / caminata: 2,5 km.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Automóvil particular: 60 estudiantes / revisión de bicicletas: 15:00–18:00.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Transporte público: 96 estudiantes / taller: 16:00–17:00.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A pie: 44 estudiantes / caminata: 07:30.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El viernes, la tabla registra 60 estudiantes en automóvil particular, y la revisión de bicicletas está programada de 15:00 a 18:00. Las otras alternativas combinan datos de días distintos.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿A qué hora comienza "Ciencia de los alimentos"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '11:30' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '13:00' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14:00' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '15:30' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'En la tabla del programa, "Ciencia de los alimentos" comienza a las 14:00.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál actividad de la tarde requiere inscripción obligatoria?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ciencia de los alimentos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desafío de programación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Preguntas a una astrónoma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Descanso.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El "Desafío de programación", programado a las 15:30, aparece señalado con inscripción obligatoria.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: 'Una persona reservó un cupo para "Construye un pequeño robot". ¿Hasta qué hora se mantiene su reserva?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '11:10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '11:20' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '11:30' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '11:40' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La actividad comienza a las 11:30 y el texto indica que las reservas se mantienen hasta 10 minutos antes, es decir, hasta las 11:20.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué servicio continúa funcionando después del término de las actividades generales a las 18:30?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La cafetería.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El punto de información.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El guardarropa.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todos los servicios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Las actividades terminan a las 18:30, mientras que el guardarropa permanece abierto hasta las 18:45.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        {
          type: 'paragraph',
          text: 'Una persona quiere asistir a "Preguntas a una astrónoma" y luego regresar a Plaza Central utilizando el transporte gratuito. Según el programa, ¿qué opción puede utilizar después de la actividad?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El bus de las 16:00.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El bus de las 18:45.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El bus de las 13:30.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ningún bus, porque todos salen antes de las 17:00.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '"Preguntas a una astrónoma" comienza a las 17:00. De los horarios de regreso indicados, el único posterior es el de las 18:45.' },
      ],
    },
  ],
};

export default textosDiscontinuosMultimodales;
