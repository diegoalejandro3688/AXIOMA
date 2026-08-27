// CONTENT-L2 -- Golden Unit Lenguaje / Interpretar, Recurso 3. Contenido
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
  { type: 'heading', level: 3, text: 'Texto A — El último tren' },
  {
    type: 'paragraph',
    text: 'Matías llegó a la estación cuando faltaban diez minutos para las once. El tablero anunciaba que el último tren saldría a las 23:05, así que aceleró el paso hacia los andenes.',
  },
  {
    type: 'paragraph',
    text: 'Había pasado la tarde ayudando a su hermana a trasladar algunas cajas a su nuevo departamento. Antes de despedirse, ella le había ofrecido quedarse a dormir, pero Matías respondió que prefería regresar a casa.',
  },
  {
    type: 'paragraph',
    text: 'Cuando llegó al torniquete, buscó la tarjeta de transporte en el bolsillo de su chaqueta. No estaba allí. Revisó el pantalón, abrió la mochila y volvió a mirar dentro de la chaqueta.',
  },
  { type: 'paragraph', text: 'Detrás de él comenzaron a formarse varias personas.' },
  {
    type: 'paragraph',
    text: 'Matías se apartó y vació el contenido de la mochila sobre una banca: un cuaderno, una botella, dos cables y un paquete de galletas. Nada.',
  },
  { type: 'paragraph', text: 'Miró el tablero.' },
  { type: 'paragraph', text: '23:02.' },
  { type: 'paragraph', text: 'Sacó el teléfono y llamó a su hermana.' },
  { type: 'paragraph', text: '—¿Puedes revisar si dejé mi tarjeta sobre la mesa?' },
  { type: 'paragraph', text: 'Mientras esperaba la respuesta, comenzó a caminar lentamente hacia la salida.' },
  { type: 'paragraph', text: '—Sí, está aquí —respondió ella unos segundos después.' },
  { type: 'paragraph', text: 'Matías guardó silencio.' },
  { type: 'paragraph', text: 'Por los altavoces anunciaron la llegada del último tren.' },
  { type: 'paragraph', text: '—Bueno —dijo finalmente—. Parece que aceptaré esa cama después de todo.' },
  { type: 'paragraph', text: 'Su hermana se rio.' },
  { type: 'paragraph', text: 'Matías volvió a guardar sus cosas en la mochila y salió de la estación.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Una isla donde volvieron las aves marinas' },
  {
    type: 'paragraph',
    text: 'Durante buena parte del siglo XX, una pequeña isla situada frente a una costa del Pacífico fue utilizada ocasionalmente por pescadores. Con el tiempo llegaron también ratas escondidas en embarcaciones y cargamentos.',
  },
  {
    type: 'paragraph',
    text: 'Aunque estos animales podían parecer poco importantes, su presencia tuvo consecuencias sobre varias especies de aves marinas. Muchas de ellas construían sus nidos directamente en el suelo y sus huevos quedaban expuestos.',
  },
  {
    type: 'paragraph',
    text: 'Los registros realizados décadas después mostraron que algunas colonias habían disminuido considerablemente. En ciertos sectores donde antes se encontraban cientos de nidos, apenas quedaban unas pocas decenas.',
  },
  {
    type: 'paragraph',
    text: 'A comienzos de la década de 2010, un grupo de conservación inició un programa para retirar las ratas de la isla. El procedimiento tomó varios meses e incluyó controles posteriores para comprobar que no quedaran poblaciones reproductivas.',
  },
  {
    type: 'paragraph',
    text: 'Durante los primeros años no se observaron cambios espectaculares. Sin embargo, los investigadores siguieron contando nidos cada temporada.',
  },
  {
    type: 'paragraph',
    text: 'Cinco años después, dos especies mostraban aumentos sostenidos en el número de parejas reproductoras. También aparecieron nidos en zonas de la isla donde no habían sido registrados durante años.',
  },
  {
    type: 'paragraph',
    text: 'Los investigadores advierten que estos resultados no demuestran que todos los cambios se deban exclusivamente a la eliminación de las ratas. La disponibilidad de alimento, las condiciones oceánicas y otros factores también pueden influir en las poblaciones de aves.',
  },
  {
    type: 'paragraph',
    text: 'Aun así, la recuperación observada coincide temporalmente con la reducción de una amenaza importante y es consistente con resultados registrados en otras islas donde se han realizado proyectos semejantes.',
  },
];

const inferencias: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.INTERPRETAR.INFERENCIAS',
  unitCode: 'LENGUAJE.INTERPRETAR',
  subjectKey: 'lenguaje',
  order: 3,
  title: 'Inferencias locales y globales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá deducir información implícita a partir de pistas presentes en el texto, distinguiendo inferencias locales de inferencias globales y evitando conclusiones que no estén suficientemente respaldadas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Inferencias locales y globales' },

    { type: 'heading', level: 2, text: '1. ¿Qué es inferir?' },
    {
      type: 'paragraph',
      text: 'Inferir significa obtener una conclusión que el texto no dice de manera directa, pero que puede deducirse a partir de la información que sí entrega. Ejemplo: "Tomás entró al salón sacudiendo su paraguas y dejando pequeñas gotas en el piso." El texto no dice "Estaba lloviendo", pero podemos inferirlo razonablemente.',
    },

    { type: 'heading', level: 2, text: '2. Inferir no es imaginar' },
    {
      type: 'paragraph',
      text: 'Una inferencia debe tener evidencia. Si el texto dice: "Camila apagó la luz y cerró la puerta antes de salir", podemos inferir que se fue del lugar. Pero no podemos afirmar que "iba al cine". Eso sería inventar información.',
    },

    { type: 'heading', level: 2, text: '3. Inferencia local' },
    {
      type: 'paragraph',
      text: 'Una inferencia local se obtiene a partir de una parte específica del texto. Ejemplo: "Andrés miró el reloj tres veces mientras esperaba frente al consultorio." Podemos inferir que probablemente estaba pendiente del tiempo o de la espera. La evidencia está concentrada en una oración o pequeño fragmento.',
    },

    { type: 'heading', level: 2, text: '4. Inferencia global' },
    {
      type: 'paragraph',
      text: 'Una inferencia global requiere integrar información de distintas partes. Por ejemplo, si durante un relato un personaje evita responder, cambia de tema, guarda una carta y finalmente decide no entregarla, podemos inferir una actitud o conflicto a partir del conjunto. No existe una sola frase que entregue la respuesta.',
    },

    { type: 'heading', level: 2, text: '5. Pistas textuales' },
    {
      type: 'paragraph',
      text: 'Las inferencias pueden surgir de: acciones; descripciones; comparaciones; reacciones; consecuencias; datos distribuidos; cambios de comportamiento; relaciones entre personajes; tono de determinadas expresiones.',
    },

    { type: 'heading', level: 2, text: '6. Diferenciar evidencia de conclusión' },
    {
      type: 'paragraph',
      text: 'Una estrategia útil: evidencia es lo que el texto dice; inferencia es lo que podemos concluir. Ejemplo. Evidencia: "Las luces estaban apagadas y las puertas cerradas." Inferencia posible: el lugar probablemente no estaba atendiendo público.',
    },

    { type: 'heading', level: 2, text: '7. Grado de seguridad' },
    {
      type: 'paragraph',
      text: 'No todas las conclusiones tienen el mismo respaldo. Una buena respuesta PAES suele ser la que está mejor sustentada, no necesariamente la única imaginable. Debemos evitar alternativas que exageran, generalizan, atribuyen emociones sin evidencia, agregan causas desconocidas o confunden posibilidad con certeza.',
    },

    { type: 'heading', level: 2, text: '8. Inferir motivaciones' },
    {
      type: 'paragraph',
      text: 'En textos narrativos puede ser necesario interpretar por qué actúa un personaje. Si alguien vuelve repetidamente a revisar que una ventana esté cerrada, podría inferirse preocupación o precaución. Pero la motivación debe construirse desde sus acciones y el contexto.',
    },

    { type: 'heading', level: 2, text: '9. Inferir en textos no literarios' },
    {
      type: 'paragraph',
      text: 'También se infiere en artículos y textos informativos. Si un estudio muestra una disminución constante, nuevas medidas de protección y una recuperación posterior, podemos relacionar datos y extraer una conclusión, siempre que el texto entregue respaldo suficiente.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia práctica' },
    {
      type: 'paragraph',
      text: 'Ante una inferencia: identifica qué debes deducir; localiza las pistas; formula una conclusión breve; pregunta ¿qué evidencia la respalda?; elimina alternativas que agreguen demasiado; elige la conclusión más ajustada al texto.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué se puede inferir principalmente de la reacción de Matías cuando su hermana confirma que tiene la tarjeta?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que está molesto con ella por haberla tomado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que comprende que probablemente no alcanzará a tomar el tren.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Que decide comprar una nueva tarjeta inmediatamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Que recuerda dónde dejó otra tarjeta.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La hora es 23:02, el último tren sale a las 23:05 y Matías no tiene su tarjeta. Su silencio y decisión posterior muestran que asume que no podrá viajar.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Por qué la frase final sobre "aceptar esa cama" resulta comprensible para el lector?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque su hermana había ofrecido anteriormente que se quedara a dormir.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque la estación tenía habitaciones disponibles.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque Matías había reservado alojamiento cerca.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el último tren tenía camas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al inicio se menciona que su hermana le ofreció quedarse a dormir. La frase final retoma implícitamente esa posibilidad.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Qué puede inferirse del hecho de que Matías camine lentamente hacia la salida mientras espera la respuesta?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ya comienza a considerar que quizá tendrá que abandonar su intento de viajar.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Está intentando encontrar otro andén.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Quiere evitar que su hermana responda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sabe que existe otro tren después de las 23:05.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El tiempo es muy limitado y no encuentra su tarjeta. Su movimiento hacia la salida anticipa que está considerando que no podrá abordar.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué rasgo de Matías se sugiere al inicio cuando rechaza quedarse a dormir?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Prefería volver a su propia casa esa noche.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'No quería volver a ver a su hermana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tenía miedo de viajar en tren.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Había discutido con su familia.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que rechazó la oferta porque prefería regresar a casa. Las otras alternativas agregan motivos que el relato no respalda.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación resume mejor el cambio que experimenta Matías durante el relato?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Pasa de rechazar una alternativa a aceptarla debido a un problema inesperado.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Pasa de querer tomar el tren a decidir que ya no le gusta viajar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Pasa de estar enojado con su hermana a perdonarla.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Pasa de perder la tarjeta a descubrir que nunca tuvo una.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Al inicio rechaza quedarse con su hermana, pero la pérdida de acceso al tren hace que finalmente acepte esa opción.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué puede inferirse sobre las ratas respecto de las aves marinas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Representaban una amenaza para especies que anidaban en el suelo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ayudaban a proteger los huevos de las aves.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eran el principal alimento de las aves marinas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo afectaban a aves que anidaban en árboles.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto relaciona la presencia de ratas con huevos expuestos y posteriormente describe su eliminación como reducción de una amenaza.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué los investigadores continuaron contando nidos aunque al comienzo no vieran cambios grandes?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque necesitaban observar la evolución de las colonias durante varias temporadas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque querían trasladar todos los nidos a otra isla.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque desconocían si quedaban pescadores en el lugar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las aves solo se reproducían cada cinco años.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El seguimiento prolongado permitió detectar posteriormente aumentos sostenidos que no eran evidentes en los primeros años.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué se puede inferir del regreso de nidos a sectores donde habían desaparecido?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Algunas aves comenzaron nuevamente a utilizar áreas que anteriormente habían abandonado.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Todas las especies de la isla recuperaron su población original.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las aves fueron trasladadas manualmente a esos lugares.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las condiciones oceánicas dejaron de afectar completamente a las aves.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La reaparición de nidos indica que esos sectores volvieron a ser utilizados. Las demás alternativas agregan información no respaldada.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Por qué el texto menciona otros factores como la disponibilidad de alimento y las condiciones oceánicas?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Para negar que las poblaciones de aves hayan aumentado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para mostrar que no puede atribuirse todo el cambio a una sola causa con certeza.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Para demostrar que eliminar las ratas no tuvo ningún efecto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Para explicar cómo llegaron las ratas a la isla.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los investigadores reconocen que existen otras variables, por lo que evitan afirmar una causalidad absoluta.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.INTERPRETAR.INFERENCIAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál es la conclusión más respaldada por el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar las ratas garantiza la recuperación completa de cualquier población de aves marinas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La recuperación de las aves ocurrió exclusivamente porque aumentó la cantidad de alimento disponible.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La eliminación de las ratas probablemente contribuyó a la recuperación observada, aunque no puede considerarse la única causa posible.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'No existe ninguna relación posible entre la eliminación de ratas y el aumento de nidos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El aumento coincide con la eliminación de una amenaza y con resultados de otros proyectos, pero el texto señala explícitamente que también pueden intervenir otros factores.',
        },
      ],
    },
  ],
};

export default inferencias;
