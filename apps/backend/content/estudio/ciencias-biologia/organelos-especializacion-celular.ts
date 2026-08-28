// CONTENT-C1A -- Ciencias / U1 "Biología", Recurso 2 (order 2 en U1).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R2 -- C A D B C B A D C B.
// Tabla editorial de la Situación A representada como filas de párrafo con "|"
// (schema sin tipo `table`) -- FORMAT_ONLY, sin pérdida semántica.
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
  { type: 'heading', level: 3, text: 'Situación A — Tres células con funciones diferentes' },
  { type: 'paragraph', text: 'Un grupo de estudiantes analizó tres tipos de células eucariontes.' },
  { type: 'paragraph', text: '| Tipo celular | Característica observada |' },
  { type: 'paragraph', text: '| Célula X | Gran cantidad de retículo endoplasmático rugoso y aparato de Golgi |' },
  { type: 'paragraph', text: '| Célula Y | Gran cantidad de mitocondrias |' },
  { type: 'paragraph', text: '| Célula Z | Numerosos lisosomas |' },
  { type: 'paragraph', text: 'Los estudiantes propusieron las siguientes funciones posibles:' },
  { type: 'paragraph', text: '1. producir y secretar grandes cantidades de proteínas;' },
  { type: 'paragraph', text: '2. realizar una actividad con alta demanda energética;' },
  { type: 'paragraph', text: '3. degradar de manera frecuente materiales incorporados por la célula.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Situación B — ¿Por qué unas células tenían más mitocondrias?' },
  { type: 'paragraph', text: 'Una investigadora comparó dos tipos celulares pertenecientes al mismo organismo.' },
  { type: 'paragraph', text: 'El primer tipo realizaba contracciones repetidas durante largos períodos.' },
  {
    type: 'paragraph',
    text: 'El segundo formaba parte de un tejido cuya actividad requería menos movimiento y menor gasto energético.',
  },
  {
    type: 'paragraph',
    text: 'Al observarlos mediante microscopía, registró una mayor cantidad de mitocondrias por célula en el primer tipo.',
  },
  {
    type: 'paragraph',
    text: 'La investigadora propuso que esta diferencia podía relacionarse con la distinta demanda energética de ambos tejidos.',
  },
  {
    type: 'paragraph',
    text: 'Para evaluar su explicación, midió el consumo de oxígeno y la actividad metabólica de ambos tipos celulares bajo condiciones similares.',
  },
  {
    type: 'paragraph',
    text: 'Los resultados indicaron que las células con mayor cantidad de mitocondrias también mostraban valores mayores de actividad metabólica.',
  },
];

const organelosEspecializacionCelular: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 2,
  title: 'Organelos y especialización celular',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá relacionar la estructura y función de los principales organelos celulares con las necesidades metabólicas y funcionales de distintos tipos de células, explicando cómo la especialización celular se refleja en diferencias en la abundancia y desarrollo de determinadas estructuras internas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Organelos y especialización celular' },

    { type: 'heading', level: 2, text: '1. Compartimentalización celular' },
    {
      type: 'paragraph',
      text: 'Las células eucariontes poseen estructuras internas especializadas llamadas organelos. La compartimentalización permite que diferentes procesos ocurran en zonas específicas de la célula. Esto mejora la organización de funciones como: síntesis de moléculas, obtención de energía, almacenamiento, transporte, degradación y regulación.',
    },

    { type: 'heading', level: 2, text: '2. Núcleo' },
    {
      type: 'paragraph',
      text: 'El núcleo contiene la mayor parte del material genético de una célula eucarionte. Entre sus funciones generales: almacenar ADN; proteger la información genética; participar en la regulación de la actividad celular. El núcleo no realiza por sí solo todas las funciones celulares, pero contiene información fundamental para coordinarlas.',
    },

    { type: 'heading', level: 2, text: '3. Ribosomas' },
    {
      type: 'paragraph',
      text: 'Los ribosomas participan en la síntesis de proteínas. Pueden encontrarse: libres en el citoplasma; asociados al retículo endoplasmático rugoso. Todas las células necesitan ribosomas porque las proteínas cumplen funciones estructurales, metabólicas y regulatorias.',
    },

    { type: 'heading', level: 2, text: '4. Retículo endoplasmático rugoso' },
    {
      type: 'paragraph',
      text: 'El retículo endoplasmático rugoso posee ribosomas asociados. Participa especialmente en la síntesis y procesamiento inicial de proteínas que pueden: ser secretadas, incorporarse a membranas o dirigirse a determinados compartimentos celulares. Las células que producen grandes cantidades de proteínas para exportación suelen presentar abundante RER.',
    },

    { type: 'heading', level: 2, text: '5. Retículo endoplasmático liso' },
    {
      type: 'paragraph',
      text: 'El retículo endoplasmático liso no presenta ribosomas adheridos. Participa en procesos como: síntesis de ciertos lípidos, metabolismo de sustancias y almacenamiento de calcio en algunos tipos celulares. Su abundancia puede variar según la función de la célula.',
    },

    { type: 'heading', level: 2, text: '6. Aparato de Golgi' },
    {
      type: 'paragraph',
      text: 'El aparato de Golgi recibe moléculas provenientes principalmente del retículo endoplasmático. Puede modificar, clasificar, empaquetar y dirigir proteínas y otras moléculas hacia distintos destinos. Es especialmente relevante en células secretoras.',
    },

    { type: 'heading', level: 2, text: '7. Mitocondrias' },
    {
      type: 'paragraph',
      text: 'Las mitocondrias participan en procesos mediante los cuales la célula obtiene energía utilizable a partir de nutrientes. Las células con alta demanda energética suelen presentar numerosas mitocondrias. Por ejemplo, células que realizan actividad intensa o sostenida necesitan una producción elevada de energía.',
    },

    { type: 'heading', level: 2, text: '8. Lisosomas y degradación' },
    {
      type: 'paragraph',
      text: 'Los lisosomas contienen sustancias que permiten degradar distintos materiales. Participan en: reciclaje celular, degradación de componentes y procesamiento de materiales incorporados por la célula. La degradación controlada permite recuperar moléculas y mantener el funcionamiento celular.',
    },

    { type: 'heading', level: 2, text: '9. Cloroplastos y vacuola' },
    {
      type: 'paragraph',
      text: 'En células vegetales fotosintéticas, los cloroplastos permiten captar energía luminosa y participar en la producción de materia orgánica. La gran vacuola central puede contribuir a: almacenamiento, equilibrio interno y mantenimiento de la presión celular. Estas estructuras ayudan a explicar características propias de muchas células vegetales.',
    },

    { type: 'heading', level: 2, text: '10. Especialización celular' },
    {
      type: 'paragraph',
      text: 'Las células de un mismo organismo pueden compartir el mismo material genético general y, sin embargo, desempeñar funciones diferentes. Esto puede reflejarse en: distinta forma, abundancia de organelos, proteínas producidas y actividad metabólica. Por eso, conocer la función de una célula permite formular predicciones sobre su estructura interna.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál función es más compatible con la Célula X?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Almacenar exclusivamente material genético.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Realizar fotosíntesis.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Producir y secretar grandes cantidades de proteínas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Degradar principalmente sustancias mediante lisosomas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La abundancia de RER y aparato de Golgi es característica de células con intensa síntesis, procesamiento y secreción de proteínas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué característica permite asociar a la Célula Y con una alta demanda energética?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Poseer numerosas mitocondrias.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Presentar muchos lisosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Carecer de ribosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tener una pared celular.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las mitocondrias participan en la obtención de energía utilizable, por lo que suelen ser abundantes en células con alta demanda energética.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál función sería más compatible con la Célula Z?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Síntesis intensiva de proteínas para secreción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Captación de energía luminosa.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Producción de material genético.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Degradación frecuente de materiales celulares o incorporados.' },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los lisosomas participan en procesos de degradación y reciclaje de diferentes materiales.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Qué conclusión general está mejor sustentada por la información?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'Todos los tipos celulares deben tener exactamente la misma cantidad de organelos.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La abundancia de ciertos organelos puede relacionarse con la función que realiza la célula.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Los organelos no influyen en el funcionamiento celular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo las células vegetales presentan especialización.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las diferencias en abundancia de organelos reflejan distintas necesidades funcionales y metabólicas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Si los estudiantes descubrieran una célula con abundante RER, Golgi y muchas mitocondrias, ¿qué inferencia sería más razonable?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Es una célula necesariamente inactiva.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No puede sintetizar proteínas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Podría realizar una intensa actividad de síntesis y secreción que también requiere gran cantidad de energía.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Debe ser obligatoriamente una célula vegetal fotosintética.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La combinación de organelos asociados a síntesis/secreción y producción de energía sugiere una célula con elevada actividad metabólica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál variable celular comparó inicialmente la investigadora?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Número de cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cantidad de mitocondrias.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Presencia de pared celular.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cantidad de cloroplastos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La observación inicial mostró que uno de los tipos celulares poseía una mayor cantidad de mitocondrias.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Cuál era la hipótesis principal de la investigadora?' }]),
      options: [
        {
          content: { type: 'paragraph', order: 0, text: 'La mayor cantidad de mitocondrias se relaciona con una mayor demanda energética.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todas las células deben tener idéntica actividad metabólica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las mitocondrias impiden el uso de energía.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Las células con más mitocondrias necesariamente poseen cloroplastos.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La investigadora propone que la abundancia de mitocondrias está asociada con las necesidades energéticas de cada tipo celular.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Por qué fue útil medir la actividad metabólica de ambos tipos celulares?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque permitió determinar el color de las células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque eliminó la necesidad de observar mitocondrias.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Porque confirmó que ambos tejidos realizaban exactamente la misma función.' },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque permitió comparar una consecuencia funcional asociada a la abundancia de mitocondrias.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Relacionar cantidad de mitocondrias con actividad metabólica permite evaluar si existe asociación entre estructura y demanda energética.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por los resultados?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de mitocondrias nunca cambia entre células.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Toda célula con mitocondrias realiza contracciones.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las células con mayor demanda energética pueden presentar una mayor abundancia de mitocondrias.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las mitocondrias son responsables de todas las funciones celulares.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los resultados muestran una asociación entre mayor abundancia de mitocondrias y mayor actividad metabólica.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué evidencia adicional fortalecería más la explicación propuesta?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Observar únicamente la forma externa de una célula.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar varios tipos celulares con diferentes demandas energéticas y verificar si existe una relación consistente entre actividad metabólica y abundancia de mitocondrias.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Analizar una sola célula sin medir ninguna función.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Asumir que todos los tejidos con mitocondrias tienen exactamente la misma actividad.' },
          correct: false,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Repetir la comparación en diversos tipos celulares permitiría evaluar si la relación entre demanda energética y abundancia de mitocondrias se mantiene de manera consistente.',
        },
      ],
    },
  ],
};

export default organelosEspecializacionCelular;
