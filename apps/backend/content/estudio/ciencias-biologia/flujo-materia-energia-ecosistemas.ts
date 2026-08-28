// CONTENT-C3A -- Ciencias / U1 "Biología", Recurso 11 (order 11 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R11 -- A C B D A D B C A D.
// Tabla editorial de la Situación A ("Nivel trófico / Energía disponible")
// representada como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan
// EXACTAMENTE los valores con espacio de miles y la unidad: "20 000 kJ",
// "2 400 kJ", "310 kJ", "42 kJ". La flecha "→" (U+2192) de la mini-lección
// ("planta → insecto → ave") se conserva sin sustitución.
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const situacionA: Blk[] = [
  { type: 'heading', level: 3, text: 'Energía disponible en una cadena trófica' },
  {
    type: 'paragraph',
    text: 'Un grupo de estudiantes estudió un ecosistema y estimó la energía almacenada en organismos pertenecientes a cuatro niveles tróficos.',
  },
  { type: 'paragraph', text: '| Nivel trófico | Energía disponible |' },
  { type: 'paragraph', text: '| Productores | 20 000 kJ |' },
  { type: 'paragraph', text: '| Consumidores primarios | 2 400 kJ |' },
  { type: 'paragraph', text: '| Consumidores secundarios | 310 kJ |' },
  { type: 'paragraph', text: '| Consumidores terciarios | 42 kJ |' },
  {
    type: 'paragraph',
    text: 'Los estudiantes observaron que solo una parte de la energía disponible en un nivel aparecía almacenada en el siguiente.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Cambios en una red alimentaria' },
  { type: 'paragraph', text: 'En un ecosistema de pradera, investigadores estudiaron las siguientes relaciones:' },
  { type: 'paragraph', text: 'las plantas eran consumidas por saltamontes y pequeños mamíferos; los saltamontes eran consumidos por aves insectívoras; los pequeños mamíferos eran consumidos por ciertas aves rapaces; restos de todos estos organismos eran utilizados por descomponedores.' },
  { type: 'paragraph', text: 'Durante un período disminuyó considerablemente la población de saltamontes.' },
  {
    type: 'paragraph',
    text: 'Los investigadores observaron posteriormente una disminución en algunas aves insectívoras, mientras la cantidad de tejido vegetal consumido por saltamontes también disminuyó.',
  },
];

const flujoMateriaEnergiaEcosistemas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 11,
  title: 'Flujo de materia y energía en los ecosistemas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar cómo circula la materia y fluye la energía en los ecosistemas, relacionando productores, consumidores y descomponedores con niveles tróficos, cadenas y redes alimentarias, y analizando cómo la energía disponible disminuye a medida que se transfiere entre niveles.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Flujo de materia y energía en los ecosistemas' },

    { type: 'heading', level: 2, text: '1. Ecosistemas' },
    {
      type: 'paragraph',
      text: 'Un ecosistema incluye los organismos de una comunidad y los componentes no vivos del ambiente con los que interactúan. Entre los componentes abióticos se encuentran: agua; luz; temperatura; suelo; gases; nutrientes. Los organismos dependen tanto de otros seres vivos como de las condiciones físicas y químicas del ambiente.',
    },

    { type: 'heading', level: 2, text: '2. Productores' },
    {
      type: 'paragraph',
      text: 'Los productores incorporan energía al componente biológico del ecosistema. En muchos ecosistemas, organismos fotosintéticos utilizan energía luminosa para producir materia orgánica a partir de sustancias inorgánicas. Los productores forman la base de numerosos sistemas alimentarios.',
    },

    { type: 'heading', level: 2, text: '3. Consumidores' },
    {
      type: 'paragraph',
      text: 'Los consumidores obtienen materia y energía alimentándose de otros organismos. Pueden clasificarse, de manera simplificada, según su posición trófica. Por ejemplo: consumidores primarios se alimentan de productores; consumidores secundarios pueden alimentarse de consumidores primarios; consumidores de niveles superiores se alimentan de otros consumidores. Una especie puede ocupar más de un nivel según su dieta.',
    },

    { type: 'heading', level: 2, text: '4. Descomponedores' },
    {
      type: 'paragraph',
      text: 'Los descomponedores utilizan materia orgánica proveniente de organismos muertos o sus residuos. Durante este proceso, parte de la materia puede transformarse y volver a quedar disponible en el ambiente. Así, los descomponedores cumplen un papel importante en el reciclaje de nutrientes.',
    },

    { type: 'heading', level: 2, text: '5. Cadenas alimentarias' },
    {
      type: 'paragraph',
      text: 'Una cadena alimentaria representa una secuencia simplificada de relaciones de alimentación. Por ejemplo: planta → insecto → ave. Las flechas representan el sentido de transferencia de materia y energía desde el organismo consumido hacia el consumidor. Una cadena no representa todas las interacciones reales de un ecosistema.',
    },

    { type: 'heading', level: 2, text: '6. Redes alimentarias' },
    {
      type: 'paragraph',
      text: 'Una red alimentaria integra múltiples cadenas conectadas. Es una representación más completa porque un organismo puede: consumir varias especies; ser consumido por distintas especies; ocupar diferentes posiciones tróficas. Por eso, alterar una población puede tener efectos sobre varias otras.',
    },

    { type: 'heading', level: 2, text: '7. Transferencia de energía' },
    {
      type: 'paragraph',
      text: 'La energía disponible disminuye al pasar de un nivel trófico a otro. Esto ocurre porque los organismos utilizan energía en procesos como: metabolismo; movimiento; crecimiento; mantención; reproducción. Además, parte se disipa en forma de calor. Por eso, no toda la energía almacenada en un nivel queda disponible para el siguiente.',
    },

    { type: 'heading', level: 2, text: '8. Pirámides tróficas' },
    {
      type: 'paragraph',
      text: 'Las pirámides pueden representar variables como: energía; biomasa; número de organismos. Una pirámide de energía muestra que la cantidad disponible disminuye hacia niveles tróficos superiores. No debe asumirse que todas las pirámides representan exactamente la misma variable.',
    },

    { type: 'heading', level: 2, text: '9. Materia y energía no se comportan igual' },
    {
      type: 'paragraph',
      text: 'La materia puede circular entre componentes bióticos y abióticos. Los átomos que forman moléculas pueden: incorporarse a organismos; pasar entre niveles tróficos; volver al ambiente; ser reutilizados. La energía, en cambio, fluye a través del ecosistema y parte de ella se disipa como calor. Por eso: la materia se recicla; la energía fluye.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta ecológica: identifica productores y consumidores; sigue el sentido de las flechas; determina el nivel trófico; distingue materia de energía; analiza qué población aumenta o disminuye; considera relaciones indirectas; utiliza los datos cuantitativos antes de aplicar una regla memorizada.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué grupo presenta la mayor cantidad de energía disponible?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Productores.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Consumidores primarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consumidores secundarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consumidores terciarios.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los productores presentan 20 000 kJ, la mayor cantidad registrada en la tabla.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Cuál nivel obtiene directamente materia y energía al alimentarse de productores?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Consumidores terciarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Descomponedores exclusivamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Consumidores primarios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Productores.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los consumidores primarios ocupan el nivel que se alimenta directamente de productores en una cadena trófica simple.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué patrón muestran los datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La energía aumenta hacia los niveles superiores.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La energía disponible disminuye al avanzar hacia niveles tróficos superiores.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todos los niveles almacenan exactamente la misma energía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo los consumidores contienen energía.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra una disminución progresiva desde productores hasta consumidores terciarios.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Por qué no toda la energía de los productores aparece en los consumidores primarios?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la materia desaparece completamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los productores no realizan metabolismo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque los consumidores crean toda su energía desde cero.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque parte de la energía se utiliza en procesos biológicos y se disipa antes de ser transferida al siguiente nivel.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los organismos utilizan energía para mantenerse y parte de ella se disipa como calor, por lo que la transferencia entre niveles es incompleta.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Un estudiante afirma que siempre exactamente el 10% de la energía pasa al siguiente nivel. ¿Qué conclusión es más adecuada usando estos datos?',
        },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Los datos muestran transferencias reducidas entre niveles, pero no justifican afirmar que el porcentaje sea exactamente 10% en cada transferencia.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La afirmación debe ser correcta porque todas las cadenas usan el mismo porcentaje exacto.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los datos demuestran que el 100% de la energía se conserva como biomasa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La energía aumenta cuando sube el nivel trófico.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra pérdidas importantes de energía, pero las proporciones calculadas no son idénticas, por lo que no corresponde imponer un valor exacto a todas las transferencias.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuáles organismos actúan como productores en esta red?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Saltamontes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aves rapaces.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Descomponedores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Plantas.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las plantas producen materia orgánica y constituyen los productores de la red descrita.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué relación explica mejor la disminución de algunas aves insectívoras?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las aves se transformaron en productores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Disminuyó uno de sus recursos alimentarios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las plantas dejaron de realizar fotosíntesis.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los descomponedores eliminaron toda la energía.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La reducción de saltamontes disminuye la disponibilidad de alimento para las aves que dependen de ellos.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué efecto directo sería esperable sobre las plantas consumidas principalmente por saltamontes, si las demás condiciones se mantuvieran?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Desaparecerían necesariamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se convertirían en consumidores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Podría disminuir la presión de consumo ejercida sobre ellas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Dejarían de contener materia.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una menor abundancia de herbívoros puede reducir el consumo directo ejercido sobre las plantas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué función cumplen los descomponedores en la situación descrita?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Procesan materia orgánica y contribuyen a devolver nutrientes al ambiente.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Producen toda la energía luminosa del ecosistema.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impiden que la materia circule.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ocupan obligatoriamente el nivel trófico más alto.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los descomponedores procesan restos orgánicos y contribuyen al reciclaje de materia dentro del ecosistema.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál afirmación integra mejor el funcionamiento del ecosistema descrito?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La materia y la energía se reciclan de manera idéntica e indefinida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cada especie funciona de manera independiente de las demás.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los productores solo reciben energía desde consumidores superiores.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La materia puede circular entre organismos y ambiente, mientras la energía se transfiere entre niveles y parte se disipa, de modo que cambios en una población pueden afectar a otras dentro de la red.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los ecosistemas conectan poblaciones mediante transferencias de materia y energía, pero estas no se comportan de la misma manera: la materia puede reciclarse y la energía fluye con pérdidas en cada transferencia.',
        },
      ],
    },
  ],
};

export default flujoMateriaEnergiaEcosistemas;
