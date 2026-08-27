// CONTENT-H3A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 9. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que los recursos anteriores del bloque.
//
// Answer keys: R9 usa la versión DEFINITIVA -- D B A C B D A C B A.
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
  { type: 'heading', level: 3, text: 'Texto A — Un gobierno interrumpido' },
  { type: 'paragraph', text: 'A comienzos de la década de 1970, un país latinoamericano ficticio atravesaba un periodo de fuerte polarización política.' },
  {
    type: 'paragraph',
    text: 'Un gobierno electo había impulsado un programa de reformas económicas y sociales orientado a ampliar la participación estatal en sectores estratégicos y a redistribuir recursos hacia sectores populares.',
  },
  {
    type: 'paragraph',
    text: 'Estas reformas generaron un fuerte respaldo entre amplios sectores populares y sindicales, pero también una intensa oposición entre grupos económicos y políticos que consideraban amenazados sus intereses.',
  },
  { type: 'paragraph', text: 'La polarización se intensificó a través de movilizaciones masivas de ambos sectores, huelgas, paros y una creciente confrontación política dentro de las instituciones.' },
  {
    type: 'paragraph',
    text: 'En este contexto de crisis institucional, las fuerzas armadas intervinieron y derrocaron al gobierno constitucional, estableciendo un régimen militar.',
  },
  { type: 'paragraph', text: 'El nuevo régimen suspendió las garantías constitucionales, disolvió el parlamento y prohibió los partidos políticos.' },
  {
    type: 'paragraph',
    text: 'Numerosas personas fueron perseguidas, detenidas o forzadas al exilio por su participación política previa u opositora al nuevo gobierno.',
  },
  { type: 'paragraph', text: 'A pesar de la represión, con el tiempo comenzaron a organizarse grupos que documentaban violaciones a los derechos humanos y exigían justicia e información sobre personas detenidas.' },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Organizarse bajo vigilancia' },
  { type: 'paragraph', text: 'Durante la década de 1980, en varios países latinoamericanos gobernados por regímenes militares, surgieron organizaciones sociales que se reunían pese al riesgo que ello implicaba.' },
  {
    type: 'paragraph',
    text: 'Algunas de estas agrupaciones estaban formadas principalmente por familiares de personas detenidas o desaparecidas, quienes exigían información sobre su paradero y denunciaban públicamente las violaciones a los derechos humanos.',
  },
  {
    type: 'paragraph',
    text: 'Otras organizaciones surgieron en barrios populares, donde vecinos se coordinaban para enfrentar dificultades económicas mediante ollas comunes, comprando e intercambiando alimentos de manera colectiva.',
  },
  { type: 'paragraph', text: 'También existieron organizaciones estudiantiles y sindicales que, a pesar de la prohibición o fuerte restricción de la actividad política, mantenían encuentros y coordinaban acciones de protesta.' },
  {
    type: 'paragraph',
    text: 'Estas organizaciones enfrentaban vigilancia, infiltración y represión por parte de las autoridades, que consideraban subversiva cualquier forma de organización social autónoma.',
  },
  {
    type: 'paragraph',
    text: 'A pesar de estos riesgos, muchas de estas agrupaciones lograron sostenerse en el tiempo, estableciendo redes de apoyo mutuo y manteniendo canales de comunicación entre sus integrantes.',
  },
  {
    type: 'paragraph',
    text: 'Con el paso de los años, algunas de estas organizaciones adquirieron mayor visibilidad pública y participaron activamente en procesos de movilización social más amplios.',
  },
  {
    type: 'paragraph',
    text: 'Su experiencia mostró que, incluso bajo condiciones de fuerte represión política, era posible sostener formas de organización social orientadas a la defensa de derechos y necesidades colectivas.',
  },
];

const movilizacionAmericaLatina: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 9,
  title: 'Movilización política y social en América Latina',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar procesos de polarización política, quiebre institucional y represión en América Latina durante la Guerra Fría, reconociendo formas de organización y movilización social que surgieron pese a la represión, y evaluando la relación entre autoritarismo, derechos humanos y organización popular.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Movilización política y social en América Latina' },

    { type: 'heading', level: 2, text: '1. América Latina en el contexto de la Guerra Fría' },
    {
      type: 'paragraph',
      text: 'Durante la segunda mitad del siglo XX, América Latina se vio profundamente afectada por la confrontación ideológica de la Guerra Fría. Distintos gobiernos, movimientos políticos y organizaciones sociales se posicionaron dentro de este contexto internacional, lo que influyó fuertemente en la política interna de numerosos países de la región.',
    },

    { type: 'heading', level: 2, text: '2. Procesos de reforma y polarización' },
    {
      type: 'paragraph',
      text: 'En varios países latinoamericanos surgieron gobiernos que impulsaron reformas económicas y sociales orientadas a ampliar la participación estatal y redistribuir recursos hacia sectores populares. Estas reformas generaron, en muchos casos, un fuerte respaldo popular junto con una intensa oposición de sectores que veían amenazados sus intereses económicos y políticos.',
    },

    { type: 'heading', level: 2, text: '3. Quiebres institucionales' },
    {
      type: 'paragraph',
      text: 'En un contexto de fuerte polarización, distintos países de la región experimentaron quiebres institucionales, en muchos casos mediante intervenciones militares que derrocaron gobiernos constitucionales y establecieron regímenes autoritarios.',
    },

    { type: 'heading', level: 2, text: '4. Regímenes militares' },
    {
      type: 'paragraph',
      text: 'Los regímenes militares establecidos en distintos países latinoamericanos compartieron, con variaciones según cada caso, rasgos como: suspensión de garantías constitucionales; disolución o restricción de instancias legislativas; prohibición o fuerte restricción de partidos políticos; concentración del poder en las fuerzas armadas.',
    },

    { type: 'heading', level: 2, text: '5. Represión y violaciones a los derechos humanos' },
    {
      type: 'paragraph',
      text: 'Durante estos regímenes, numerosas personas fueron perseguidas, detenidas, torturadas, desaparecidas o forzadas al exilio debido a su participación política previa u opositora. Estas violaciones a los derechos humanos constituyen un elemento central para comprender este periodo histórico.',
    },

    { type: 'heading', level: 2, text: '6. Organización social bajo represión' },
    {
      type: 'paragraph',
      text: 'A pesar del contexto represivo, surgieron distintas formas de organización social, entre ellas: agrupaciones de familiares de detenidos y desaparecidos; organizaciones vecinales orientadas a enfrentar dificultades económicas; organizaciones estudiantiles y sindicales; redes de defensa de derechos humanos.',
    },

    { type: 'heading', level: 2, text: '7. Estrategias de organización' },
    {
      type: 'paragraph',
      text: 'Estas organizaciones desarrollaron distintas estrategias para sostenerse en el tiempo pese a la vigilancia y represión: coordinación informal; redes de apoyo mutuo; documentación de violaciones a derechos humanos; acciones colectivas de subsistencia económica, como ollas comunes.',
    },

    { type: 'heading', level: 2, text: '8. De la organización local a la movilización nacional' },
    {
      type: 'paragraph',
      text: 'Con el paso del tiempo, algunas organizaciones que habían surgido en espacios locales o familiares adquirieron mayor visibilidad pública y se integraron a procesos de movilización social y política de mayor escala, contribuyendo a procesos posteriores de apertura o transición política en distintos países.',
    },

    { type: 'heading', level: 2, text: '9. Tensión entre autoritarismo y organización popular' },
    {
      type: 'paragraph',
      text: 'La experiencia de estos países muestra una tensión relevante: mientras los regímenes autoritarios buscaban restringir e impedir la organización política y social autónoma, diversos grupos encontraron formas de sostener y adaptar su organización pese a la represión, orientándose especialmente a la defensa de derechos.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre movilización política y social en América Latina: identifica el contexto de la Guerra Fría; distingue reforma, quiebre institucional y represión; reconoce distintos tipos de organización social; evita presentar la represión como total ausencia de organización popular; analiza la relación entre represión estatal y defensa de derechos.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué proceso político describe principalmente el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La consolidación pacífica y sin oposición de un gobierno reformista.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia total de movilización política durante el periodo descrito.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La expansión colonial de una potencia europea en América Latina.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La interrupción de un gobierno constitucional mediante una intervención militar en un contexto de fuerte polarización.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe explícitamente la intervención de las fuerzas armadas que derrocó al gobierno constitucional en un contexto de polarización política.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué tipo de reformas había impulsado el gobierno constitucional según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Reformas orientadas a privatizar completamente todos los sectores económicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reformas económicas y sociales orientadas a ampliar la participación estatal y redistribuir recursos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Reformas destinadas a restringir la participación sindical.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Reformas orientadas exclusivamente a la política exterior.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que el gobierno impulsó reformas orientadas a ampliar la participación estatal y redistribuir recursos hacia sectores populares.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación existe, según el texto, entre las reformas impulsadas y la polarización política?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Las reformas generaron simultáneamente fuerte respaldo popular e intensa oposición de sectores afectados.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las reformas fueron aceptadas sin ninguna oposición.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las reformas no tuvieron ninguna relación con la posterior intervención militar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las reformas fueron rechazadas únicamente por sectores populares.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que las reformas generaron tanto respaldo popular como intensa oposición, contribuyendo a la polarización política previa al quiebre institucional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué medidas adoptó el régimen militar tras derrocar al gobierno constitucional?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Convocó inmediatamente a nuevas elecciones libres.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Amplió las garantías constitucionales existentes.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Suspendió garantías constitucionales, disolvió el parlamento y prohibió los partidos políticos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Mantuvo intacta la estructura institucional previa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe explícitamente estas medidas del régimen militar tras el quiebre institucional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué conclusión permite formular el cierre del texto sobre la organización social durante el régimen militar?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La represión impidió por completo cualquier forma de organización social.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'A pesar de la represión, surgieron grupos que documentaban violaciones a los derechos humanos y exigían justicia.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todos los grupos opositores fueron eliminados sin dejar ningún registro.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El régimen militar promovió activamente la organización de estos grupos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que, pese a la represión, se organizaron grupos que documentaban violaciones y exigían justicia e información.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué tipo de organizaciones se describen principalmente en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Organizaciones militares oficiales del Estado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Empresas privadas de gran tamaño.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Partidos políticos legalmente autorizados por el régimen.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Organizaciones sociales de familiares, vecinos, estudiantes y sindicatos que se reunían pese al riesgo.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe distintos tipos de organizaciones sociales -- familiares de detenidos, vecinales, estudiantiles y sindicales -- que se organizaban pese a la represión.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué actividad realizaban las organizaciones vecinales mencionadas en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Coordinaban ollas comunes para enfrentar dificultades económicas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Administraban directamente los ministerios del gobierno.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Organizaban elecciones nacionales paralelas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sustituían completamente a las fuerzas de seguridad del Estado.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala explícitamente que las organizaciones vecinales se coordinaban mediante ollas comunes para enfrentar dificultades económicas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Cómo respondían las autoridades a estas formas de organización social, según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Las promovían activamente como parte de su programa político.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las ignoraban por completo, sin ningún tipo de control.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las sometían a vigilancia, infiltración y represión por considerarlas subversivas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Les otorgaban financiamiento estatal directo.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que estas organizaciones enfrentaban vigilancia, infiltración y represión por parte de las autoridades.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué evolución experimentaron algunas de estas organizaciones con el paso del tiempo, según el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Desaparecieron completamente tras su primer año de existencia.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se transformaron en instituciones oficiales del régimen militar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Adquirieron mayor visibilidad pública y participaron en procesos de movilización social más amplios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Perdieron todo contacto entre sus integrantes desde su formación.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que, con el paso de los años, algunas organizaciones adquirieron mayor visibilidad y participaron en procesos de movilización social más amplios.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué conclusión general sobre la relación entre represión y organización social permite formular el texto?' }]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La represión estatal restringió la participación política, pero también generó nuevas formas de organización social orientadas a denunciar violaciones y defender derechos fundamentales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La represión estatal eliminó por completo cualquier posibilidad de organización social autónoma.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La organización social solo fue posible después de terminados los regímenes militares.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las organizaciones descritas actuaban en coordinación directa con las autoridades militares.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto muestra que, pese a la fuerte represión, surgieron y se sostuvieron formas de organización social orientadas a la defensa de derechos y necesidades colectivas.' },
      ],
    },
  ],
};

export default movilizacionAmericaLatina;
