// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 2. Contenido
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
  { type: 'heading', level: 3, text: 'Texto A — Por qué algunas ciudades están recuperando sus humedales' },
  {
    type: 'paragraph',
    text: 'Durante muchos años, numerosos humedales urbanos fueron rellenados o reducidos para construir viviendas, caminos y otras obras. En algunos lugares, estas transformaciones hicieron desaparecer áreas que anteriormente almacenaban agua de lluvia y servían de hábitat para diversas especies.',
  },
  {
    type: 'paragraph',
    text: 'Con el crecimiento de las ciudades, las superficies impermeables también aumentaron. El agua que antes podía infiltrarse lentamente comenzó a desplazarse con mayor rapidez hacia calles, canales y sistemas de drenaje. Como consecuencia, algunos sectores se volvieron más vulnerables a acumulaciones de agua durante precipitaciones intensas.',
  },
  {
    type: 'paragraph',
    text: 'Frente a este problema, distintas ciudades han comenzado a proteger o recuperar humedales. Algunas han retirado residuos, restaurado vegetación nativa y limitado nuevas construcciones en áreas cercanas.',
  },
  {
    type: 'paragraph',
    text: 'Estas acciones pueden ofrecer varios beneficios. Los humedales son capaces de almacenar temporalmente parte del agua y liberarla de manera gradual. Además, proporcionan espacios donde pueden vivir aves, insectos, anfibios y plantas.',
  },
  {
    type: 'paragraph',
    text: 'Sin embargo, recuperar un humedal no consiste simplemente en inundar un terreno. Es necesario estudiar el movimiento del agua, las características del suelo, las especies presentes y las actividades humanas del sector.',
  },
  {
    type: 'paragraph',
    text: 'Por ejemplo, si un canal que alimentaba originalmente un humedal fue desviado décadas atrás, restaurar únicamente la vegetación puede no ser suficiente. En ese caso, también podría ser necesario recuperar parte del flujo de agua.',
  },
  {
    type: 'paragraph',
    text: 'Por estas razones, los proyectos de restauración suelen combinar medidas ecológicas con planificación urbana. Su objetivo no es devolver exactamente el paisaje a un momento del pasado, sino recuperar funciones que puedan ser valiosas para la ciudad actual.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Del hielo natural a la refrigeración moderna' },
  {
    type: 'paragraph',
    text: 'Antes de que existieran los refrigeradores eléctricos, conservar alimentos durante períodos prolongados era una tarea difícil. En zonas con inviernos fríos, una de las soluciones consistía en cortar grandes bloques de hielo de lagos y ríos congelados.',
  },
  {
    type: 'paragraph',
    text: 'Después de extraerlos, los bloques eran almacenados en construcciones conocidas como depósitos de hielo. Sus paredes podían contener materiales aislantes, como paja o aserrín, que ayudaban a retrasar el derretimiento.',
  },
  {
    type: 'paragraph',
    text: 'En algunos lugares, el hielo natural comenzó incluso a transportarse a largas distancias. Durante el siglo XIX, comerciantes enviaron grandes cantidades desde regiones frías hacia ciudades con climas más cálidos. El negocio, sin embargo, dependía del clima y podía sufrir importantes pérdidas durante temporadas demasiado templadas.',
  },
  {
    type: 'paragraph',
    text: 'La aparición de sistemas de refrigeración mecánica cambió progresivamente esta situación. En vez de depender de lagos congelados, las máquinas podían producir bajas temperaturas mediante procesos controlados.',
  },
  {
    type: 'paragraph',
    text: 'Al principio, estos sistemas eran grandes y costosos, por lo que se utilizaron principalmente en instalaciones industriales, barcos y almacenes. Con el desarrollo tecnológico, los equipos se hicieron más pequeños y accesibles.',
  },
  {
    type: 'paragraph',
    text: 'Durante el siglo XX, los refrigeradores domésticos comenzaron a extenderse en numerosos hogares. A diferencia de los antiguos depósitos de hielo, permitían mantener una temperatura baja de forma más estable y sin reponer constantemente grandes bloques.',
  },
  {
    type: 'paragraph',
    text: 'Este cambio transformó también la distribución de alimentos. Productos que antes debían venderse rápidamente podían conservarse durante más tiempo y transportarse a mayores distancias.',
  },
  {
    type: 'paragraph',
    text: 'La refrigeración moderna, por lo tanto, no apareció de un día para otro. Fue resultado de una transición desde métodos dependientes de condiciones naturales hacia sistemas capaces de controlar artificialmente la temperatura.',
  },
];

const relacionesEntreIdeas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 2,
  title: 'Relaciones entre ideas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer y explicar relaciones entre ideas dentro de un texto, tales como causa y consecuencia, problema y solución, comparación y contraste, secuencia y ejemplificación.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Relaciones entre ideas' },

    { type: 'heading', level: 2, text: '1. Las ideas no aparecen aisladas' },
    {
      type: 'paragraph',
      text: 'En un texto, una oración suele relacionarse con otra. Por ejemplo: "Llovió intensamente durante toda la noche. Por eso, el camino quedó cerrado." Aquí existe una relación de causa → consecuencia. La lluvia provoca el cierre del camino.',
    },

    { type: 'heading', level: 2, text: '2. Causa y consecuencia' },
    {
      type: 'paragraph',
      text: 'Una idea explica por qué ocurre otra. Ejemplo: "La temperatura descendió bajo cero, por lo que el agua de la superficie se congeló." Causa: descenso de la temperatura. Consecuencia: congelamiento del agua. Algunas señales frecuentes son: porque; debido a; por esta razón; por lo tanto; como consecuencia; por ello. Pero la relación puede existir aunque no aparezca un conector explícito.',
    },

    { type: 'heading', level: 2, text: '3. Problema y solución' },
    {
      type: 'paragraph',
      text: 'Un texto puede presentar primero una dificultad y después una respuesta. Problema: "El colegio generaba gran cantidad de residuos." Solución: "Se instalaron puntos de reciclaje y se redujo el uso de productos desechables." Identificar esta estructura ayuda a comprender la organización global.',
    },

    { type: 'heading', level: 2, text: '4. Comparación y contraste' },
    {
      type: 'paragraph',
      text: 'Comparar significa relacionar elementos según sus semejanzas o diferencias. Ejemplo: "Ambos animales viven en ambientes fríos, pero uno permanece en tierra durante gran parte del año mientras el otro pasa la mayor parte del tiempo en el agua." Aquí encontramos semejanza y contraste. Palabras frecuentes: mientras que; en cambio; a diferencia de; igualmente; ambos; del mismo modo.',
    },

    { type: 'heading', level: 2, text: '5. Secuencia' },
    {
      type: 'paragraph',
      text: 'Algunos textos presentan acontecimientos o procedimientos en determinado orden. Ejemplo: se recoge una muestra; se analiza; se comparan los resultados; se publica el informe. Cambiar el orden podría alterar el sentido.',
    },

    { type: 'heading', level: 2, text: '6. Ejemplificación' },
    {
      type: 'paragraph',
      text: 'Una idea general puede desarrollarse mediante casos concretos. Ejemplo: "Algunas aves pueden utilizar objetos como herramientas. Por ejemplo, ciertos cuervos emplean ramas para extraer alimento." La segunda oración ejemplifica la primera.',
    },

    { type: 'heading', level: 2, text: '7. Explicación' },
    {
      type: 'paragraph',
      text: 'A veces una oración aclara o desarrolla otra. Ejemplo: "El material es biodegradable. Esto significa que puede descomponerse mediante procesos naturales." La segunda idea explica la primera.',
    },

    { type: 'heading', level: 2, text: '8. Relación entre párrafos' },
    {
      type: 'paragraph',
      text: 'Las relaciones no existen solamente entre oraciones. Un párrafo puede presentar un problema; otro explicar sus causas; otro proponer soluciones; otro mostrar consecuencias. Comprender esa organización ayuda a interpretar el texto completo.',
    },

    { type: 'heading', level: 2, text: '9. No depender solo de conectores' },
    {
      type: 'paragraph',
      text: 'Encontrar "pero" o "por eso" ayuda, pero no basta. Debemos preguntarnos: ¿qué relación lógica existe realmente entre las ideas? Dos párrafos pueden contrastarse aunque nunca aparezca la expresión "en cambio".',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Cuando te pregunten por una relación: identifica las dos ideas involucradas; resume cada una brevemente; pregunta cómo se conectan; comprueba si una causa, explica, ejemplifica, contrasta o sucede después de la otra; revisa que la alternativa describa la relación, no solo el contenido.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué relación existe entre el aumento de superficies impermeables y la mayor vulnerabilidad a acumulaciones de agua?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Comparación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Causa y consecuencia.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ejemplificación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Secuencia temporal sin relación causal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto explica que el aumento de superficies impermeables provoca un desplazamiento más rápido del agua y, como consecuencia, mayor vulnerabilidad.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el tercer párrafo respecto del problema presentado anteriormente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presenta una posible solución.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Contradice la existencia del problema.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Describe un ejemplo histórico sin relación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Resume los beneficios finales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Después de explicar el problema, el texto presenta la protección y recuperación de humedales como respuesta.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué relación existe entre la capacidad de almacenar agua y la presencia de distintas especies en los humedales?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Son dos beneficios diferentes de los humedales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El primer beneficio provoca necesariamente el segundo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El segundo contradice al primero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos corresponden a etapas de un mismo procedimiento.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto presenta ambos elementos como beneficios distintos: manejo del agua y provisión de hábitat.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué función cumple el ejemplo del canal desviado?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mostrar que recuperar la vegetación siempre resuelve el problema.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ilustrar por qué una restauración puede requerir medidas adicionales.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Contradecir la necesidad de estudiar el movimiento del agua.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar dos ciudades con estrategias diferentes.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El ejemplo muestra concretamente por qué una restauración no puede limitarse a una sola acción.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál describe mejor la organización general del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Presenta una definición, la contradice y finalmente la reemplaza.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Describe un problema urbano, explica una respuesta posible y luego precisa sus condiciones y complejidades.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Enumera distintas especies y después explica cómo clasificarlas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Compara dos modelos de ciudad sin establecer relación entre ellos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto parte del deterioro y sus consecuencias, presenta la restauración de humedales como respuesta y después explica que esta requiere planificación compleja.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación existe entre los depósitos de hielo y los sistemas de refrigeración mecánica?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Son dos métodos utilizados en distintos momentos para conservar productos mediante bajas temperaturas.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El segundo era necesario para producir hielo en los primeros depósitos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambos dependían directamente de lagos congelados.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los depósitos reemplazaron a la refrigeración mecánica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto presenta ambos como métodos de conservación, aunque funcionan de manera distinta y corresponden a etapas históricas diferentes.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Por qué el comercio de hielo natural podía sufrir pérdidas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque el hielo solo podía almacenarse en barcos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque dependía de condiciones climáticas suficientemente frías.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque las ciudades cálidas producían demasiado hielo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el aserrín aceleraba su derretimiento.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que el negocio dependía del clima y podía verse afectado por temporadas demasiado templadas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué relación establece el sexto párrafo entre los refrigeradores domésticos y los depósitos de hielo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Causa y consecuencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ejemplificación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Contraste.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Problema y solución.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El párrafo utiliza explícitamente "A diferencia de" para contrastar la estabilidad de los refrigeradores con la necesidad de reponer hielo.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué consecuencia de la expansión de la refrigeración se menciona en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La desaparición inmediata de todos los métodos tradicionales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La posibilidad de conservar y transportar alimentos durante más tiempo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La reducción de las distancias entre las ciudades.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La necesidad de extraer más hielo de los lagos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El penúltimo párrafo explica que la refrigeración permitió conservar productos por más tiempo y transportarlos a mayores distancias.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál secuencia representa mejor el desarrollo descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Refrigeradores domésticos → depósitos de hielo → extracción de hielo natural → refrigeración industrial.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Extracción y almacenamiento de hielo natural → transporte comercial de hielo → refrigeración mecánica industrial → expansión de refrigeradores domésticos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Transporte comercial → refrigeradores domésticos → extracción de hielo → depósitos industriales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Refrigeración mecánica → comercio de hielo natural → depósitos de hielo → refrigeración doméstica.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Esa alternativa conserva el orden histórico presentado: uso de hielo natural, expansión de su comercio, aparición de refrigeración mecánica y posterior difusión doméstica.',
        },
      ],
    },
  ],
};

export default relacionesEntreIdeas;
