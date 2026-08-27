// CONTENT-H3A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 8. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que los recursos anteriores del bloque.
//
// Answer keys: R8 usa la versión DEFINITIVA -- B D A C B A C D B C.
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
  { type: 'heading', level: 3, text: 'Texto A — Dos modelos, un mismo planeta' },
  { type: 'paragraph', text: 'Después de 1945, dos potencias emergieron con una influencia internacional sin precedentes.' },
  {
    type: 'paragraph',
    text: 'Cada una defendía un modelo político y económico distinto. Una promovía la economía de mercado, la propiedad privada y sistemas políticos basados en elecciones competitivas. La otra defendía la planificación estatal de la economía, la propiedad colectiva de los medios de producción y un sistema político organizado en torno a un partido único.',
  },
  {
    type: 'paragraph',
    text: 'Ambas potencias buscaron ampliar su influencia sobre otros países, ofreciendo apoyo económico, militar o político a gobiernos y movimientos que compartieran su orientación ideológica.',
  },
  { type: 'paragraph', text: 'Aunque nunca se enfrentaron directamente en una guerra declarada entre ellas, sostuvieron una intensa competencia en múltiples terrenos.' },
  { type: 'paragraph', text: 'Compitieron en el desarrollo científico y tecnológico, incluida la carrera espacial y el desarrollo de armamento.' },
  {
    type: 'paragraph',
    text: 'También compitieron por influencia política en distintas regiones del mundo, apoyando a gobiernos, partidos o movimientos alineados con su propio modelo.',
  },
  { type: 'paragraph', text: 'En varias ocasiones, esta rivalidad se manifestó en conflictos regionales donde ambas potencias intervinieron de manera indirecta.' },
  {
    type: 'paragraph',
    text: 'La posibilidad de un enfrentamiento nuclear directo generó, sin embargo, un fuerte incentivo para evitar una confrontación militar abierta entre ambas superpotencias.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — Un país, dos proyectos' },
  { type: 'paragraph', text: 'En un país asiático dividido tras el fin de la Segunda Guerra Mundial, coexistían dos gobiernos con proyectos políticos opuestos.' },
  {
    type: 'paragraph',
    text: 'La zona norte había adoptado un sistema de economía planificada y organización política de partido único, con apoyo de una de las grandes potencias. La zona sur había desarrollado un sistema orientado hacia la economía de mercado, con respaldo de la otra potencia.',
  },
  { type: 'paragraph', text: 'Ambos gobiernos afirmaban representar la legítima autoridad sobre la totalidad del territorio.' },
  {
    type: 'paragraph',
    text: 'En 1950 estalló un conflicto armado entre ambas zonas. Fuerzas internacionales, autorizadas por Naciones Unidas, intervinieron en apoyo del sur, mientras tropas de un país vecino apoyaron al norte.',
  },
  { type: 'paragraph', text: 'El conflicto se extendió durante varios años y produjo un enorme número de víctimas y una destrucción material considerable.' },
  {
    type: 'paragraph',
    text: 'Finalmente, se firmó un armisticio que estableció una línea de separación entre ambas zonas, sin que se lograra la reunificación del país.',
  },
  {
    type: 'paragraph',
    text: 'Décadas después, ambos territorios seguían constituyendo Estados separados, cada uno con un sistema político y económico profundamente distinto.',
  },
  {
    type: 'paragraph',
    text: 'El conflicto mostró cómo una disputa con raíces internas pudo integrarse en la confrontación más amplia entre las dos superpotencias de la posguerra.',
  },
];

const guerraFria: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 8,
  title: 'Guerra Fría: confrontación ideológica y manifestaciones',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá caracterizar la Guerra Fría como una confrontación ideológica, política y económica entre dos superpotencias, reconociendo sus manifestaciones en la competencia tecnológica y militar y en conflictos regionales, así como la tensión entre disputas internas y su integración en el conflicto internacional.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Guerra Fría: confrontación ideológica y manifestaciones' },

    { type: 'heading', level: 2, text: '1. ¿Qué fue la Guerra Fría?' },
    {
      type: 'paragraph',
      text: 'La Guerra Fría fue la confrontación ideológica, política, económica y militar entre Estados Unidos y la Unión Soviética, y sus respectivos bloques de aliados, desarrollada principalmente entre el fin de la Segunda Guerra Mundial y comienzos de la década de 1990. Se denomina "fría" porque las dos superpotencias no se enfrentaron directamente en una guerra declarada entre ellas.',
    },

    { type: 'heading', level: 2, text: '2. Dos modelos en competencia' },
    {
      type: 'paragraph',
      text: 'Estados Unidos representaba un modelo basado en: economía de mercado; propiedad privada; sistema político democrático liberal. La Unión Soviética representaba un modelo basado en: economía planificada por el Estado; propiedad colectiva de los medios de producción; sistema político de partido único. Esta oposición ideológica estructuró gran parte de la política internacional de la época.',
    },

    { type: 'heading', level: 2, text: '3. Bloques de alianzas' },
    {
      type: 'paragraph',
      text: 'Ambas potencias organizaron alianzas político-militares. Estados Unidos lideró un bloque de países alineados con el modelo occidental. La Unión Soviética lideró un bloque de países alineados con el modelo socialista. Numerosos países buscaron, además, mantener posiciones de no alineamiento frente a esta división.',
    },

    { type: 'heading', level: 2, text: '4. Competencia tecnológica y militar' },
    {
      type: 'paragraph',
      text: 'La rivalidad se manifestó en ámbitos como: desarrollo de armamento nuclear; carrera espacial; espionaje; propaganda internacional. Esta competencia buscaba demostrar la superioridad de cada modelo político y económico ante el resto del mundo.',
    },

    { type: 'heading', level: 2, text: '5. Conflictos regionales' },
    {
      type: 'paragraph',
      text: 'Aunque no hubo enfrentamiento militar directo entre las superpotencias, ambas intervinieron -- de forma directa o indirecta -- en conflictos regionales, apoyando a gobiernos, movimientos o facciones alineadas con su propio modelo. Estos conflictos regionales se transformaron muchas veces en escenarios de la confrontación global.',
    },

    { type: 'heading', level: 2, text: '6. Disputas internas y confrontación internacional' },
    {
      type: 'paragraph',
      text: 'Muchos conflictos regionales durante la Guerra Fría tuvieron causas internas propias: disputas políticas, sociales o territoriales previas a la intervención de las superpotencias. Sin embargo, estos conflictos frecuentemente se integraron en la confrontación más amplia entre Estados Unidos y la Unión Soviética, complejizando su desarrollo y sus consecuencias.',
    },

    { type: 'heading', level: 2, text: '7. El temor a la guerra nuclear' },
    {
      type: 'paragraph',
      text: 'La existencia de armamento nuclear en ambas potencias generó un fuerte incentivo para evitar una confrontación militar directa entre ellas, debido a la magnitud de la destrucción que podía producir un enfrentamiento de ese tipo. Este equilibrio contribuyó a que la confrontación se desplazara hacia otros terrenos.',
    },

    { type: 'heading', level: 2, text: '8. Manifestaciones no militares' },
    {
      type: 'paragraph',
      text: 'La Guerra Fría también se expresó en ámbitos como: propaganda y medios de comunicación; competencia económica; apoyo a movimientos políticos afines en distintos países; disputas culturales y deportivas. Estas manifestaciones formaban parte de la misma confrontación ideológica global.',
    },

    { type: 'heading', level: 2, text: '9. Consecuencias duraderas' },
    {
      type: 'paragraph',
      text: 'Muchos conflictos y divisiones territoriales originados durante la Guerra Fría persistieron después de que terminara la confrontación entre las superpotencias, mostrando que sus efectos no se limitaron al periodo de mayor tensión internacional.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre la Guerra Fría: identifica los dos modelos en competencia; distingue confrontación directa de manifestaciones indirectas; reconoce la combinación de causas internas y factores internacionales en los conflictos regionales; evita reducir la Guerra Fría únicamente a lo militar; considera también sus dimensiones ideológica, tecnológica y cultural.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué caracteriza principalmente a la rivalidad descrita en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Una guerra declarada directamente entre ambas potencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una competencia ideológica, política y tecnológica sin enfrentamiento militar directo entre ellas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Una alianza permanente entre ambas potencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición total del comercio internacional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe una intensa competencia ideológica, tecnológica y de influencia, sin guerra declarada entre las dos potencias centrales.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué modelo económico y político correspondía a la potencia que promovía elecciones competitivas y propiedad privada?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Economía planificada y partido único.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Propiedad colectiva y monarquía absoluta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Economía de mercado y sistema político basado en elecciones competitivas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ausencia total de gobierno.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe explícitamente el modelo de economía de mercado, propiedad privada y elecciones competitivas.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué factor explica, según el texto, que ambas potencias evitaran un enfrentamiento militar directo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La posibilidad de un enfrentamiento nuclear de enorme destructividad.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La ausencia total de rivalidad entre ambas potencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La falta de desarrollo tecnológico y militar.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La existencia de un único gobierno mundial.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El riesgo de una guerra nuclear directa desincentivó la confrontación militar abierta entre las superpotencias.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación se establece en el texto entre la competencia científico-tecnológica y la confrontación entre las potencias?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La competencia tecnológica fue completamente independiente de la rivalidad política.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La carrera espacial y armamentística formó parte de la disputa por demostrar la superioridad de cada modelo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La ciencia y la tecnología desaparecieron durante este periodo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo una de las potencias desarrolló avances tecnológicos.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto vincula la competencia científico-tecnológica y militar con la disputa más amplia por la influencia internacional.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué conclusión sobre la naturaleza de la Guerra Fría se sustenta mejor en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Fue exclusivamente un conflicto económico sin ninguna dimensión política.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Fue una confrontación multidimensional, expresada en distintos terrenos, que evitó deliberadamente el enfrentamiento militar directo entre las superpotencias.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Fue un conflicto limitado únicamente al territorio de ambas potencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fue un periodo sin ninguna forma de rivalidad internacional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe una confrontación que abarcó lo ideológico, tecnológico y político, evitando la guerra directa entre las superpotencias.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué situación describe principalmente el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La división de un país en dos zonas con sistemas políticos y económicos opuestos.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La unificación pacífica e inmediata de todo un continente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La independencia colonial de un territorio africano.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La creación de una monarquía única sobre toda la península.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe explícitamente la existencia de dos zonas con proyectos políticos y económicos opuestos dentro de un mismo territorio dividido.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué papel cumplieron las potencias externas en el conflicto descrito?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Se mantuvieron completamente al margen del conflicto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Apoyaron respectivamente a cada una de las zonas enfrentadas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Impidieron cualquier intervención militar internacional.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Se unieron para apoyar a un único bando.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto señala que fuerzas internacionales apoyaron al sur y tropas de un país vecino apoyaron al norte, evidenciando la intervención externa alineada.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué evidencia del texto muestra que el conflicto no se resolvió completamente?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La reunificación inmediata del país tras el armisticio.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de ambos gobiernos después del conflicto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La disolución de la línea de separación entre ambas zonas.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'La persistencia de dos Estados separados con sistemas distintos décadas después del conflicto.' },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto indica que, décadas después, ambos territorios seguían siendo Estados separados con sistemas políticos y económicos distintos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué relación existe entre el conflicto descrito y la confrontación internacional más amplia de la época?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El conflicto fue completamente ajeno a la rivalidad entre las superpotencias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El conflicto se desarrolló únicamente por decisión de organismos regionales sin ninguna potencia externa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El conflicto se integró en la confrontación entre las dos superpotencias, cada una apoyando a una de las zonas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El conflicto puso fin definitivamente a toda forma de rivalidad internacional.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El apoyo externo alineado con cada zona muestra cómo el conflicto se integró en la confrontación internacional más amplia de la Guerra Fría.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué conclusión general sobre los conflictos regionales durante la Guerra Fría permite formular el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todos los conflictos regionales carecían por completo de causas internas propias.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ningún conflicto regional estuvo relacionado con la rivalidad entre las superpotencias.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La confrontación global podía intensificar y modificar conflictos con causas propias, integrándolos a una disputa internacional más amplia.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La intervención de potencias externas eliminó automáticamente cualquier consecuencia duradera del conflicto.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El caso descrito ilustra cómo una disputa con raíces internas se integró en la confrontación más amplia entre las superpotencias, agravando y prolongando sus efectos.' },
      ],
    },
  ],
};

export default guerraFria;
