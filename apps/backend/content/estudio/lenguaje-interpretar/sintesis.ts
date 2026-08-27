// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 4. Contenido
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
  { type: 'heading', level: 3, text: 'Texto A — Los techos que empiezan a producir alimentos' },
  {
    type: 'paragraph',
    text: 'En varias ciudades densamente pobladas, algunos edificios están comenzando a utilizar sus techos para instalar huertos. Espacios que antes permanecían vacíos se convierten así en pequeñas áreas de producción de verduras, hierbas y otros cultivos.',
  },
  {
    type: 'paragraph',
    text: 'Estos proyectos no buscan reemplazar la agricultura tradicional. La cantidad de alimentos producida en un techo urbano suele ser limitada en comparación con la de una explotación agrícola. Sin embargo, pueden acercar parte de la producción a quienes consumen esos alimentos.',
  },
  {
    type: 'paragraph',
    text: 'Uno de sus beneficios es reducir ciertas distancias de transporte. Un restaurante que recibe hierbas cultivadas en el edificio vecino, por ejemplo, necesita menos desplazamiento para obtener ese producto que si lo comprara a cientos de kilómetros.',
  },
  {
    type: 'paragraph',
    text: 'Los huertos en techos también pueden cumplir otras funciones. Algunas instalaciones se utilizan para actividades educativas, mientras otras permiten a vecinos participar en labores de cultivo. Además, la vegetación puede proporcionar sombra a determinadas superficies del edificio.',
  },
  {
    type: 'paragraph',
    text: 'Pero instalar un huerto no consiste simplemente en colocar tierra sobre un techo. Antes es necesario estudiar cuánto peso puede soportar la estructura, cómo se gestionará el agua y qué condiciones de viento o exposición solar existen.',
  },
  {
    type: 'paragraph',
    text: 'También debe decidirse qué tipo de cultivo es adecuado. Una planta que necesita grandes cantidades de agua o un suelo muy profundo podría no ser conveniente para ciertas construcciones.',
  },
  {
    type: 'paragraph',
    text: 'Por esta razón, los proyectos exitosos suelen combinar conocimientos de agricultura, arquitectura y gestión urbana. Su valor no depende únicamente de cuántos alimentos producen, sino también de las funciones educativas, ambientales y comunitarias que pueden desarrollar.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — El viaje de una prenda usada' },
  {
    type: 'paragraph',
    text: 'Cuando una persona deja una prenda en un contenedor de recolección, el recorrido de esa ropa apenas comienza. Dependiendo del sistema utilizado, las prendas pueden seguir destinos muy diferentes.',
  },
  {
    type: 'paragraph',
    text: 'El primer paso suele ser la clasificación. Se revisa el estado de cada pieza para determinar si puede reutilizarse directamente, repararse, transformarse o enviarse a procesos de reciclaje.',
  },
  {
    type: 'paragraph',
    text: 'Las prendas que todavía están en buenas condiciones pueden venderse o entregarse nuevamente para su uso. En algunos casos se distribuyen dentro de la misma ciudad; en otros, viajan a mercados ubicados a miles de kilómetros.',
  },
  {
    type: 'paragraph',
    text: 'La ropa dañada no necesariamente termina como residuo. Algunas piezas pueden repararse, mientras otras se transforman en productos diferentes, como paños de limpieza o materiales de relleno.',
  },
  {
    type: 'paragraph',
    text: 'El reciclaje de fibras presenta mayores dificultades. Muchas prendas actuales contienen mezclas de materiales, como algodón y poliéster, que son más complejas de separar que las prendas compuestas por una sola fibra.',
  },
  {
    type: 'paragraph',
    text: 'Incluso cuando existen tecnologías capaces de recuperar determinados materiales, el proceso puede requerir energía, transporte y nuevas instalaciones. Por eso, reciclar una prenda tampoco elimina por completo su impacto ambiental.',
  },
  {
    type: 'paragraph',
    text: 'Además, no toda la ropa recolectada consigue un nuevo uso. Cuando existe más oferta de prendas de segunda mano que demanda, parte del material puede quedar sin destino comercial y terminar siendo descartado.',
  },
  {
    type: 'paragraph',
    text: 'Por estas razones, la recolección de ropa usada es solo una parte de un sistema más amplio. Reducir el impacto asociado a la vestimenta también implica considerar cuánto se compra, cuánto tiempo se utiliza cada prenda y cómo fue fabricada originalmente.',
  },
];

const sintesis: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.SINTESIS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.SINTESIS',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 4,
  title: 'Síntesis',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá sintetizar información de un fragmento o texto, conservando sus ideas esenciales, eliminando detalles secundarios y evitando reformulaciones incompletas, excesivamente generales o que agreguen información no presente.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Síntesis' },

    { type: 'heading', level: 2, text: '1. ¿Qué significa sintetizar?' },
    {
      type: 'paragraph',
      text: 'Sintetizar significa expresar de forma más breve lo esencial de un texto o fragmento sin cambiar su sentido. No se trata solo de "hacerlo más corto". Una buena síntesis debe conservar: la idea central; las relaciones importantes; la información indispensable.',
    },

    { type: 'heading', level: 2, text: '2. Resumir no es copiar' },
    {
      type: 'paragraph',
      text: 'Una síntesis no necesita repetir las mismas palabras. Texto: "El aumento de temperaturas modifica la época de floración de algunas plantas, lo que puede alterar su relación con especies polinizadoras." Síntesis posible: el aumento de temperatura puede modificar la interacción entre plantas y polinizadores. La redacción cambia, pero el sentido principal permanece.',
    },

    { type: 'heading', level: 2, text: '3. Eliminar detalles secundarios' },
    {
      type: 'paragraph',
      text: 'Una síntesis normalmente omite: ejemplos; nombres particulares; cifras no esenciales; explicaciones repetidas; detalles descriptivos. Si el texto explica tres casos de ciudades que reutilizan agua, la síntesis no necesita mencionar las tres.',
    },

    { type: 'heading', level: 2, text: '4. Pero no eliminar lo esencial' },
    {
      type: 'paragraph',
      text: 'Reducir demasiado también puede producir una mala síntesis. Texto: "Algunos animales urbanos modifican sus horarios para evitar la actividad humana." Síntesis insuficiente: "Los animales cambian." Es demasiado general. Una mejor opción: algunos animales urbanos cambian sus horarios en respuesta a la actividad humana.',
    },

    { type: 'heading', level: 2, text: '5. Síntesis local' },
    { type: 'paragraph', text: 'Puede pedirse sintetizar un párrafo, una sección o una parte específica. Aquí solo debemos considerar la información de ese fragmento.' },

    { type: 'heading', level: 2, text: '6. Síntesis global' },
    {
      type: 'paragraph',
      text: 'También puede pedirse resumir el texto completo. En ese caso hay que integrar ideas de varias partes y decidir cuáles son esenciales para el sentido general.',
    },

    { type: 'heading', level: 2, text: '7. Mantener las relaciones' },
    {
      type: 'paragraph',
      text: 'Una síntesis debe conservar relaciones importantes. Si el texto dice: "La sequía redujo la producción, por lo que aumentaron las importaciones", no basta con resumir "Hubo sequía e importaciones". Mejor: la reducción de la producción causada por la sequía llevó a aumentar las importaciones.',
    },

    { type: 'heading', level: 2, text: '8. No agregar conclusiones' },
    {
      type: 'paragraph',
      text: 'Una alternativa puede sonar razonable y aun así ser incorrecta porque introduce una idea nueva. Si un texto afirma que una estrategia "podría ayudar", no debemos sintetizarla como "la estrategia resolverá el problema". Eso exagera la información original.',
    },

    { type: 'heading', level: 2, text: '9. Cómo distinguir una buena síntesis' },
    {
      type: 'paragraph',
      text: 'Pregúntate: ¿incluye lo esencial?; ¿elimina detalles?; ¿conserva las relaciones importantes?; ¿mantiene el grado de certeza?; ¿representa todo el fragmento y no solo una parte?',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Para sintetizar: identifica la idea principal; separa ideas esenciales de detalles; conecta las ideas importantes; exprésalas con menos palabras; verifica que no hayas agregado ni exagerado nada.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál sintetiza mejor el segundo párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los huertos urbanos producirán más alimentos que la agricultura tradicional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aunque su producción es limitada, los huertos en techos pueden acercar alimentos a los consumidores.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Los edificios deberían reemplazar sus techos por terrenos agrícolas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La agricultura tradicional depende de los huertos urbanos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Conserva las dos ideas esenciales del párrafo: producción limitada y proximidad al consumidor.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál sintetiza mejor los párrafos cuarto y quinto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los huertos en techos pueden ofrecer beneficios adicionales, pero requieren condiciones técnicas adecuadas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todos los techos urbanos sirven para producir alimentos y organizar actividades educativas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La principal función de los huertos urbanos es proporcionar sombra.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La arquitectura impide instalar huertos en edificios.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los párrafos presentan beneficios adicionales y luego explican que la instalación exige evaluar condiciones estructurales y ambientales.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la mejor síntesis de los dos párrafos que explican las condiciones para instalar un huerto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Los cultivos urbanos necesitan exclusivamente mucho sol.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es necesario evaluar tanto las características del edificio como las necesidades de los cultivos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Los techos resistentes permiten cultivar cualquier especie.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La selección de plantas es más importante que la seguridad estructural.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'La síntesis integra ambos aspectos: condiciones del edificio y características de las plantas.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál alternativa sintetiza mejor el propósito del texto completo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Explicar que los huertos en techos son una alternativa urbana con distintos beneficios y requisitos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Demostrar que la agricultura tradicional será reemplazada por cultivos en edificios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Enseñar paso a paso cómo construir un huerto profesional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar exclusivamente el costo de los cultivos urbanos y rurales.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto explica qué son estos proyectos, sus posibles beneficios y las condiciones necesarias para desarrollarlos.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál es la síntesis más completa y precisa del texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los huertos en techos permiten producir alimentos localmente y, aunque tienen limitaciones y requieren planificación técnica, pueden aportar beneficios ambientales, educativos y comunitarios.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los huertos urbanos solucionan los problemas de transporte de alimentos y permiten cultivar cualquier especie en los edificios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La principal ventaja de cultivar en techos es producir grandes cantidades de alimentos sin utilizar terrenos rurales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los edificios modernos están diseñados para sostener huertos que sustituyen a la agricultura tradicional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Integra producción local, limitaciones, planificación y beneficios adicionales sin agregar conclusiones que el texto no sostiene.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál sintetiza mejor el segundo párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las prendas recolectadas se clasifican según su estado para decidir su destino.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Toda la ropa usada debe ser reciclada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La clasificación consiste únicamente en separar colores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las prendas dañadas se descartan inmediatamente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El párrafo explica que se revisa cada prenda para decidir si será reutilizada, reparada, transformada o reciclada.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál resume mejor los párrafos cuarto y quinto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las prendas dañadas pueden convertirse fácilmente en nuevas fibras.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ropa dañada puede tener otros usos, aunque el reciclaje de fibras puede ser técnicamente complejo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las prendas de una sola fibra son imposibles de reciclar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los paños de limpieza requieren mezclar algodón y poliéster.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Integra la posibilidad de reutilizar prendas dañadas y la dificultad específica del reciclaje de fibras mezcladas.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál sintetiza mejor la idea desarrollada en los párrafos sexto y séptimo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Recoger ropa usada garantiza que ninguna prenda será descartada.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El reciclaje y la reutilización también tienen limitaciones y no aseguran un nuevo destino para toda la ropa.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El transporte es el único impacto ambiental del reciclaje.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La demanda de ropa usada siempre supera a la oferta.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Ambos párrafos muestran límites: el reciclaje consume recursos y parte de la ropa recolectada puede terminar descartada.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál alternativa conserva mejor la relación entre la recolección y el problema ambiental presentada al final?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Recolectar prendas resuelve por completo el impacto ambiental de la industria.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La recolección ayuda, pero debe acompañarse de cambios relacionados con consumo, duración y fabricación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La ropa usada debería dejar de recolectarse porque siempre termina como residuo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fabricación de ropa no tiene relación con su impacto ambiental posterior.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El último párrafo presenta la recolección como solo una parte de una estrategia más amplia.' }],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.SINTESIS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál sintetiza mejor el texto completo?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La ropa usada puede seguir varios caminos después de ser recolectada, pero reutilizarla o reciclarla tiene límites, por lo que reducir su impacto exige considerar también el consumo y la producción.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda prenda recolectada puede reutilizarse, transformarse o reciclarse si existe suficiente tecnología.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La principal dificultad de la ropa usada es transportarla hacia mercados extranjeros.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El reciclaje de fibras mixtas es la única estrategia eficaz para reducir el impacto de la vestimenta.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La alternativa reúne el recorrido de las prendas, las limitaciones de las distintas opciones y la conclusión de que el problema requiere una mirada más amplia.',
        },
      ],
    },
  ],
};

export default sintesis;
