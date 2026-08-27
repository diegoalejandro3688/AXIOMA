// CONTENT-L2 -- Golden Unit Lenguaje / Localizar, Recurso 2. Contenido
// editorial APROBADO externamente (ver
// ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md). Ver cabecera de
// informacion-explicita-relevante.ts para el criterio de representación de
// textos (pasaje completo duplicado en el stemContent de cada una de sus 5
// preguntas -- sin bloque nuevo ni cambio de schema).
//
// NOTA CRÍTICA (Texto B / Q10): versión APPROVED corregida -- el párrafo
// del viaje de Julián usa "San Marcos le había parecido..." (NO "allí").
// Correcta Q10 = D, verificada según fuente editorial.
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
  { type: 'heading', level: 3, text: 'Texto A — El regreso de las tortugas a Bahía Verde' },
  {
    type: 'paragraph',
    text: 'Durante la madrugada del jueves, un equipo de investigadores llegó a la playa de Bahía Verde para observar el nacimiento de tortugas marinas. La actividad formaba parte de un programa de seguimiento iniciado hace cuatro años por la Universidad Costera y una organización ambiental local.',
  },
  {
    type: 'paragraph',
    text: 'La bióloga Mariana Soto, coordinadora del proyecto, explicó que durante la temporada anterior se habían identificado 18 nidos en el sector. Este año, en cambio, el equipo registró 27, nueve más que en el período anterior.',
  },
  {
    type: 'paragraph',
    text: 'Para realizar el seguimiento, los investigadores instalaron pequeñas marcas alrededor de cada zona de anidación. Estas permiten advertir a los visitantes que no deben acercarse demasiado ni instalar sombrillas sobre la arena protegida.',
  },
  {
    type: 'paragraph',
    text: 'Mariana trabaja junto a Diego Leiva, especialista en fauna marina, y cuatro estudiantes universitarios. El investigador se encarga principalmente de revisar la temperatura de la arena, mientras que los estudiantes registran la hora en que comienzan a emerger las tortugas.',
  },
  {
    type: 'paragraph',
    text: 'Durante la observación del jueves, el grupo detectó movimiento en uno de los nidos poco después de las 4:00. Cerca de cuarenta minutos más tarde comenzaron a salir las primeras crías. Ellas avanzaron lentamente hacia el mar mientras los investigadores mantuvieron a los visitantes a varios metros de distancia.',
  },
  {
    type: 'paragraph',
    text: 'El programa continuará hasta fines de marzo. Entonces, el equipo elaborará un informe para comparar los resultados de esta temporada con los de años anteriores. Mariana señaló que todavía es demasiado pronto para afirmar que la población de tortugas está aumentando, pues existen otros factores que deben estudiarse antes de llegar a esa conclusión.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — El cuaderno azul' },
  {
    type: 'paragraph',
    text: 'Clara llegó a la estación poco antes de las seis. Había quedado de reunirse allí con su hermano Julián, quien regresaba después de pasar tres semanas en otra ciudad.',
  },
  {
    type: 'paragraph',
    text: 'Mientras esperaba, Clara abrió su mochila para buscar un libro. Entonces descubrió que llevaba dentro un cuaderno azul que no reconocía. En la primera página aparecía el nombre de Nicolás Vera, uno de sus compañeros de curso.',
  },
  {
    type: 'paragraph',
    text: 'Recordó que esa mañana había estudiado con Nicolás en la biblioteca del colegio. Ambos habían dejado sus mochilas junto a la misma mesa y, al parecer, el cuaderno terminó por error entre las cosas de Clara.',
  },
  {
    type: 'paragraph',
    text: 'Cuando Julián llegó, ella le explicó lo ocurrido. Él propuso volver inmediatamente al colegio, pero Clara le recordó que a esa hora la biblioteca ya estaría cerrada.',
  },
  { type: 'paragraph', text: '—Puedes entregárselo mañana —dijo su hermano.' },
  {
    type: 'paragraph',
    text: 'Clara asintió y guardó nuevamente el cuaderno. Después caminaron hasta una cafetería cercana, donde Julián comenzó a contarle sobre su viaje. Había visitado varios pueblos pequeños. De todos ellos, dijo que San Marcos le había parecido especialmente tranquilo.',
  },
  {
    type: 'paragraph',
    text: 'A la mañana siguiente, Clara buscó a Nicolás antes de entrar a clases. Este se mostró sorprendido al ver el cuaderno y explicó que había pasado gran parte de la tarde anterior buscándolo.',
  },
  { type: 'paragraph', text: '—Pensé que lo había dejado en el bus —comentó.' },
  { type: 'paragraph', text: 'Clara se lo entregó y ambos se rieron del error.' },
];

const relacionesReferencia: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA',
  unitCode: 'LENGUAJE.LOCALIZAR',
  subjectKey: 'lenguaje',
  order: 2,
  title: 'Información explícita y relaciones de referencia',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá localizar información explícita y reconocer relaciones de referencia dentro de un texto, identificando con precisión a qué personas, objetos, lugares o ideas remiten pronombres y otras expresiones.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Información explícita y relaciones de referencia' },

    { type: 'heading', level: 2, text: '1. ¿Qué es una relación de referencia?' },
    {
      type: 'paragraph',
      text: 'En un texto, muchas veces no se repite continuamente el mismo nombre. Por ejemplo: "Valentina abrió la ventana. Ella quería que entrara aire." La palabra ella se refiere a: Valentina. Reconocer estas relaciones permite seguir correctamente la información.',
    },

    { type: 'heading', level: 2, text: '2. Pronombres' },
    {
      type: 'paragraph',
      text: 'Los pronombres pueden reemplazar a personas, objetos o ideas ya mencionadas. Ejemplo: "Tomás encontró sus llaves y las guardó en el bolsillo." Las se refiere a: las llaves.',
    },

    { type: 'heading', level: 2, text: '3. Referentes cercanos y lejanos' },
    {
      type: 'paragraph',
      text: 'El referente no siempre aparece justo antes. Ejemplo: "Martina dejó el libro sobre la mesa antes de salir. Cuando volvió después del almuerzo, este seguía allí." Este se refiere al libro, aunque entre ambos aparezca otra información.',
    },

    { type: 'heading', level: 2, text: '4. Expresiones equivalentes' },
    {
      type: 'paragraph',
      text: 'También se puede evitar repetir un nombre mediante otra expresión. Ejemplo: "La astrónoma Vera Rubin realizó importantes investigaciones. La científica estudió el movimiento de las galaxias." La científica se refiere a Vera Rubin.',
    },

    { type: 'heading', level: 2, text: '5. Un mismo referente a través del texto' },
    {
      type: 'paragraph',
      text: 'Una persona puede aparecer mediante distintas expresiones: "Daniel llegó primero. El estudiante abrió la sala. Más tarde, él recibió al resto del grupo." Las tres expresiones se refieren a la misma persona.',
    },

    { type: 'heading', level: 2, text: '6. Evitar el referente más cercano por defecto' },
    {
      type: 'paragraph',
      text: 'No siempre el sustantivo inmediatamente anterior es la respuesta. Ejemplo: "Sofía entregó la carpeta a Camila porque ella debía presentarla ante el curso." Para decidir a quién se refiere ella, debemos usar la información del texto. La cercanía ayuda, pero no basta por sí sola.',
    },

    { type: 'heading', level: 2, text: '7. Referencias a ideas completas' },
    {
      type: 'paragraph',
      text: 'Una expresión también puede referirse a una acción o situación completa. Ejemplo: "La carretera fue cerrada durante toda la mañana debido a la nieve. Esto provocó retrasos en varios recorridos." Esto se refiere al cierre de la carretera debido a la nieve.',
    },

    { type: 'heading', level: 2, text: '8. Referencias temporales y espaciales' },
    {
      type: 'paragraph',
      text: 'Palabras como allí, entonces, ese día, en ese lugar, también dependen de información anterior. Ejemplo: "El equipo llegó a Valdivia el martes. Permaneció allí hasta el viernes." Allí se refiere a Valdivia.',
    },

    { type: 'heading', level: 2, text: '9. Cómo comprobar un referente' },
    {
      type: 'paragraph',
      text: 'Cuando encuentres una expresión de referencia: identifica posibles referentes; reemplaza mentalmente la expresión por cada candidato; revisa cuál mantiene el sentido; comprueba que concuerde con el resto de la información.',
    },

    { type: 'heading', level: 2, text: '10. Idea clave' },
    {
      type: 'paragraph',
      text: 'Para seguir relaciones de referencia: identifica la expresión que reemplaza o retoma información; busca el referente explícito; no elijas automáticamente el elemento más cercano; revisa concordancia y sentido; sigue al mismo referente aunque cambie la forma de nombrarlo.',
    },
  ]),
  questions: [
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿A qué se refiere la palabra "Estas" en el tercer párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A las tortugas marinas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A las pequeñas marcas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'A las zonas de anidación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A las sombrillas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La oración anterior señala que los investigadores instalaron pequeñas marcas. Luego se indica que estas advierten a los visitantes.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Quién es "el investigador" mencionado en el cuarto párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mariana Soto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Uno de los estudiantes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Diego Leiva.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Un visitante de la playa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto presenta a Diego Leiva como especialista en fauna marina y luego lo retoma mediante la expresión "el investigador".' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿A quiénes se refiere "Ellas" en el quinto párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A las primeras crías.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'A las estudiantes universitarias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A las tortugas de la temporada anterior.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A las marcas instaladas en la arena.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La oración inmediatamente anterior señala que comenzaron a salir las primeras crías. Ellas retoma ese referente.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué momento señala la palabra "Entonces" en el último párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La madrugada del jueves.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El momento en que nacen las primeras crías.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El final del programa, a fines de marzo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El inicio del proyecto, hace cuatro años.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica primero que el programa continuará hasta fines de marzo y luego señala que entonces se elaborará el informe.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál de las siguientes secuencias identifica correctamente al mismo referente a través del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Mariana Soto → "el investigador" → "Ellas".' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Diego Leiva → "el investigador".' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las pequeñas marcas → "Ellas".' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los estudiantes → "Estas" → "el investigador".' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Diego Leiva es presentado como especialista en fauna marina y posteriormente es retomado mediante "el investigador". Las demás secuencias mezclan referentes distintos.',
        },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿A qué lugar se refiere "allí" en el primer párrafo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'A otra ciudad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A la estación.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'A la biblioteca.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A una cafetería.' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Clara llega a la estación y se indica que había quedado de reunirse allí con Julián.' }],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Quién es "Él" en la oración "Él propuso volver inmediatamente al colegio"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Nicolás.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Julián.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Un compañero de Clara.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El encargado de la biblioteca.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La oración anterior señala que Julián llegó y Clara le explicó lo ocurrido. Él retoma a Julián.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿A qué objeto se refiere la expresión "el cuaderno" después de la conversación entre Clara y Julián?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Al libro que Clara buscaba en su mochila.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'A un cuaderno de Julián.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Al cuaderno azul con el nombre de Nicolás Vera.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'A una libreta encontrada en la cafetería.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Es el mismo cuaderno azul encontrado anteriormente en la mochila de Clara y que pertenecía a Nicolás.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: 'En la expresión "Este se mostró sorprendido", ¿a quién se refiere "Este"?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Julián.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Nicolás.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'San Marcos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El conductor del bus.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La oración indica que Clara buscó a Nicolás antes de entrar a clases. La expresión "Este" lo retoma directamente.' },
      ],
    },
    {
      questionKey: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cuál de las siguientes secuencias mantiene correctamente el mismo referente a lo largo del relato?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Nicolás Vera → "Él" → "Este"' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Julián → "Él" → "Este"' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Nicolás Vera → "el cuaderno" → "Este"' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Julián → "Él" / Nicolás Vera → "Este"' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando Clara le cuenta lo ocurrido a Julián, "Él" se refiere a Julián. Más adelante, cuando Clara busca a Nicolás, "Este" se refiere a Nicolás. La alternativa D mantiene correctamente ambos referentes sin confundirlos.',
        },
      ],
    },
  ],
};

export default relacionesReferencia;
