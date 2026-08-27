// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 6. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md). Texto B incluye una
// secuencia numerada -- representación mínima compatible: párrafos
// sucesivos "N. Etapa — descripción", sin bloque de lista/flecha nuevo.
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
  { type: 'heading', level: 3, text: 'Texto A — Una exposición que obliga a mirar despacio' },
  {
    type: 'paragraph',
    text: 'La exposición Rastros de ciudad, instalada durante este mes en el Centro Cultural Norte, reúne fotografías tomadas en barrios que han cambiado rápidamente durante las últimas dos décadas.',
  },
  {
    type: 'paragraph',
    text: 'A primera vista, las imágenes parecen mostrar escenas cotidianas: una esquina, una fachada, una cancha vacía o un negocio de barrio. Sin embargo, al observarlas con más atención aparecen pequeños detalles que revelan transformaciones mayores.',
  },
  {
    type: 'paragraph',
    text: 'Una de las series compara fotografías tomadas desde el mismo punto con quince años de diferencia. En una imagen se observa una vivienda baja rodeada de árboles; en la otra, el mismo terreno está ocupado por un edificio de departamentos. La comparación permite percibir de inmediato una transformación que podría resultar más abstracta si se explicara solo mediante cifras.',
  },
  {
    type: 'paragraph',
    text: 'La exposición también incluye breves testimonios de habitantes de los sectores fotografiados. "Antes todos conocíamos a la señora del almacén; ahora casi nadie sabe quién vive en el edificio de al lado", comenta una vecina en uno de los paneles.',
  },
  {
    type: 'paragraph',
    text: 'Estos testimonios no intentan demostrar que todos los cambios hayan sido negativos. Más bien incorporan experiencias personales que acompañan las transformaciones visibles en las fotografías.',
  },
  {
    type: 'paragraph',
    text: 'El recorrido termina con un gran mapa donde los visitantes pueden marcar lugares que consideran importantes en sus propios barrios. Al finalizar la primera semana, el mapa estaba cubierto de notas sobre plazas, negocios, paraderos, árboles y casas.',
  },
  {
    type: 'paragraph',
    text: 'El título de la exposición, Rastros de ciudad, resulta especialmente apropiado porque las obras invitan a observar aquello que permanece, desaparece o cambia mientras una ciudad se transforma.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — ¿Dónde termina la basura electrónica?' },
  {
    type: 'paragraph',
    text: 'Cada año se reemplazan millones de teléfonos, computadores y otros dispositivos electrónicos. Algunos siguen funcionando; otros están dañados o han quedado obsoletos.',
  },
  { type: 'heading', level: 3, text: '¿Qué contienen?' },
  {
    type: 'paragraph',
    text: 'Un dispositivo electrónico puede incluir: metales; plástico; vidrio; baterías; componentes electrónicos. Algunos de estos materiales pueden recuperarse, mientras otros requieren tratamientos especiales.',
  },
  { type: 'heading', level: 3, text: 'Un recorrido posible' },
  { type: 'paragraph', text: '1. Recolección — El dispositivo llega a un punto autorizado.' },
  { type: 'paragraph', text: '2. Clasificación — Se determina si puede reutilizarse, repararse o desmontarse.' },
  { type: 'paragraph', text: '3. Desmontaje — Se separan componentes y materiales.' },
  { type: 'paragraph', text: '4. Recuperación — Algunos metales, plásticos y otras partes pueden ingresar nuevamente a procesos productivos.' },
  { type: 'heading', level: 3, text: 'No todo puede tratarse igual' },
  {
    type: 'paragraph',
    text: 'Las baterías requieren especial cuidado. Si se dañan o manipulan incorrectamente, ciertos componentes pueden generar riesgos durante el transporte o almacenamiento.',
  },
  {
    type: 'paragraph',
    text: 'Por eso, distintos tipos de residuos electrónicos deben seguir procedimientos específicos y no deberían mezclarse simplemente con la basura doméstica.',
  },
  { type: 'heading', level: 3, text: 'Un dato para dimensionar el problema' },
  {
    type: 'paragraph',
    text: 'Imagina una fila de 10.000 teléfonos colocados uno junto a otro. Aunque cada dispositivo individual sea pequeño, juntos representan una gran cantidad de materiales que podrían terminar descartados.',
  },
  { type: 'heading', level: 3, text: 'Antes de desechar' },
  {
    type: 'paragraph',
    text: 'Antes de reemplazar un dispositivo, puede ser útil preguntarse: ¿todavía funciona?; ¿puede repararse?; ¿otra persona podría utilizarlo?; si debe descartarse, ¿existe un punto de recepción autorizado?',
  },
];

const funcionRecursosTexto: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 6,
  title: 'Función de elementos y recursos del texto',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá determinar la función que cumplen distintos elementos dentro de un texto —como ejemplos, citas, títulos, comparaciones, descripciones y recursos gráficos— explicando cómo contribuyen a desarrollar, aclarar u organizar el sentido global.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Función de elementos y recursos del texto' },

    { type: 'heading', level: 2, text: '1. No basta con identificar un elemento' },
    {
      type: 'paragraph',
      text: 'En comprensión lectora, a veces no preguntan "¿Qué aparece en el texto?" sino "¿Para qué aparece?". Por ejemplo: "El agua cubrió casi toda la avenida. \'Nunca habíamos visto algo así\', señaló una vecina." La cita no está solo para repetir información. Puede cumplir la función de aportar un testimonio directo sobre el hecho descrito.',
    },

    { type: 'heading', level: 2, text: '2. Función de un ejemplo' },
    {
      type: 'paragraph',
      text: 'Un ejemplo suele: aclarar una idea; mostrar un caso concreto; hacer más comprensible una afirmación general. Texto: "Algunas especies cambian su conducta según la temperatura. Por ejemplo, ciertos reptiles modifican sus horarios de actividad." La segunda oración ejemplifica la primera.',
    },

    { type: 'heading', level: 2, text: '3. Función de una comparación' },
    {
      type: 'paragraph',
      text: 'Una comparación puede: explicar algo desconocido mediante algo conocido; destacar semejanzas; resaltar diferencias; hacer más clara una magnitud o característica. No basta con reconocer que dos cosas se comparan: debemos preguntarnos qué consigue esa comparación.',
    },

    { type: 'heading', level: 2, text: '4. Función de una cita' },
    {
      type: 'paragraph',
      text: 'Una cita puede utilizarse para: aportar evidencia; presentar una opinión; incorporar la voz de un especialista; mostrar una experiencia; ejemplificar una postura. Su función depende del contexto.',
    },

    { type: 'heading', level: 2, text: '5. Función de una descripción' },
    {
      type: 'paragraph',
      text: 'Una descripción puede: permitir imaginar una escena; caracterizar un lugar o personaje; destacar una condición relevante; preparar información necesaria para comprender lo que ocurre después.',
    },

    { type: 'heading', level: 2, text: '6. Función de un título' },
    {
      type: 'paragraph',
      text: 'El título puede: anticipar el tema; resumir una idea central; generar una expectativa; establecer un contraste; llamar la atención sobre un aspecto particular. No todos los títulos cumplen exactamente la misma función.',
    },

    { type: 'heading', level: 2, text: '7. Función de subtítulos y secciones' },
    {
      type: 'paragraph',
      text: 'Los subtítulos ayudan a: organizar información; separar aspectos del tema; facilitar la búsqueda; mostrar la estructura del texto. En textos extensos o multimodales, esto puede ser especialmente importante.',
    },

    { type: 'heading', level: 2, text: '8. Función de recursos visuales' },
    {
      type: 'paragraph',
      text: 'Un gráfico, tabla, recuadro o imagen puede: complementar; resumir; comparar; ejemplificar; mostrar datos de forma más directa. Debe analizarse su relación con el texto verbal.',
    },

    { type: 'heading', level: 2, text: '9. Función no significa "calidad"' },
    {
      type: 'paragraph',
      text: 'Aquí hay una frontera importante con Evaluar. Pregunta de Interpretar: "¿Qué función cumple este ejemplo?" Pregunta de Evaluar: "¿Es efectivo este ejemplo para apoyar la postura?" La primera busca explicar qué hace el recurso. La segunda juzga qué tan adecuado es.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta de función: identifica el elemento; revisa qué aparece antes y después; determina qué idea desarrolla; pregúntate qué cambia si se elimina; elige la alternativa que explique su aporte al texto.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué función cumple la comparación entre las dos fotografías tomadas desde el mismo punto?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mostrar de forma concreta una transformación urbana ocurrida con el tiempo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todos los edificios son negativos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar cómo utilizar una cámara fotográfica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Identificar al autor de las imágenes.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La comparación hace visible de manera directa el cambio ocurrido en un mismo lugar.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumplen los testimonios de los habitantes?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Reemplazar completamente las fotografías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Incorporar experiencias personales relacionadas con los cambios mostrados.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar científicamente la causa de las transformaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Indicar cuánto cuesta vivir en cada barrio.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que los testimonios acompañan las transformaciones visibles mediante experiencias personales.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple la cita de la vecina?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presentar un ejemplo concreto de cómo una habitante percibe cambios en las relaciones del barrio.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Probar que antes todas las personas se conocían.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Entregar una definición de transformación urbana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Contradecir el contenido de las fotografías.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La cita ejemplifica una experiencia personal vinculada con los cambios sociales percibidos en el barrio.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el mapa situado al final de la exposición?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mostrar exclusivamente dónde fueron tomadas las fotografías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Permitir que los visitantes relacionen el tema de la exposición con sus propios barrios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Indicar la ruta más corta para salir del centro cultural.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Clasificar los barrios según su tamaño.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El mapa invita a los visitantes a identificar lugares significativos de sus propios entornos, extendiendo el tema de la exposición a su experiencia.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el título Rastros de ciudad en relación con el texto completo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Nombrar únicamente los edificios antiguos fotografiados.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Anticipar la idea de observar señales de permanencia y cambio en espacios urbanos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Explicar técnicamente cómo fueron tomadas las fotografías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Indicar que la exposición trata solo de restos arqueológicos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El título sintetiza la idea de buscar huellas de aquello que permanece, desaparece o cambia en la ciudad.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple la sección "¿Qué contienen?"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Explicar qué materiales pueden formar parte de los dispositivos electrónicos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Indicar dónde comprar nuevos teléfonos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar marcas de computadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Enseñar cómo fabricar una batería.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La sección identifica distintos materiales presentes en dispositivos electrónicos.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué función cumple la secuencia numerada "Recolección → Clasificación → Desmontaje → Recuperación"?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presentar posibles etapas del tratamiento de un residuo electrónico.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Clasificar dispositivos desde el más caro al más barato.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar el orden en que se fabrican los teléfonos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar cuánto tiempo tarda cada proceso.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La secuencia organiza visualmente posibles etapas que sigue un dispositivo después de ser recolectado.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple el apartado sobre las baterías?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Introducir una excepción que muestra por qué algunos componentes necesitan tratamiento especial.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que todas las partes de un dispositivo son peligrosas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Explicar cómo aumentar la duración de una batería.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que las baterías no contienen materiales reutilizables.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El apartado precisa que no todos los residuos pueden manejarse igual y utiliza las baterías como caso relevante.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple la imagen mental de una fila de 10.000 teléfonos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Entregar instrucciones para almacenar teléfonos en filas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ayudar a dimensionar la cantidad de materiales acumulados cuando muchos dispositivos se desechan.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Comparar el tamaño de teléfonos antiguos y modernos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Probar que existen exactamente 10.000 teléfonos desechados cada año.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La comparación transforma una cantidad abstracta en una representación fácil de imaginar para mostrar la escala del problema.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué función cumple la sección final "Antes de desechar" respecto del resto del texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Cambia el foco desde explicar el tratamiento de residuos hacia decisiones que una persona puede considerar antes de descartarlos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Contradice la idea de que algunos materiales pueden recuperarse.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Introduce una lista de dispositivos que deben comprarse nuevos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Repite exactamente la secuencia de tratamiento presentada anteriormente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Después de explicar qué ocurre con los residuos, la sección final traslada esa información a decisiones previas que puede considerar el usuario de un dispositivo.',
        },
      ],
    },
  ],
};

export default funcionRecursosTexto;
