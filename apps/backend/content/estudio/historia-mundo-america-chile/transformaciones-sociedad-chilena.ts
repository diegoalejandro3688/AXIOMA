// CONTENT-H2A -- Golden Unit Historia / U1 Mundo, América y Chile, Recurso
// 5. Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que ideas-republicanas-liberales.ts (CONTENT-H1A).
//
// Answer keys: R5 usa la versión DEFINITIVA post-corrección editorial
// (redistribución de posición de alternativas correctas) -- A C B D B C A
// D B C, verificada exactamente contra la fuente de este incremento.
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
  { type: 'heading', level: 3, text: 'Texto A — Llegar a la ciudad' },
  {
    type: 'paragraph',
    text: 'En las últimas décadas del siglo XIX, distintas ciudades chilenas comenzaron a recibir una cantidad creciente de personas provenientes de zonas rurales y de localidades más pequeñas.',
  },
  {
    type: 'paragraph',
    text: 'Para algunos migrantes, la ciudad ofrecía oportunidades de trabajo en talleres, comercio, construcción, servicios, industrias y actividades vinculadas a los puertos.',
  },
  { type: 'paragraph', text: 'Sin embargo, el crecimiento de la población urbana fue más rápido que la capacidad de muchas ciudades para proporcionar viviendas adecuadas.' },
  {
    type: 'paragraph',
    text: 'En barrios populares, varias familias podían compartir espacios pequeños y con escasa ventilación. El acceso al agua limpia, alcantarillado y servicios sanitarios era irregular, especialmente en los sectores más pobres.',
  },
  { type: 'paragraph', text: 'Estas condiciones favorecieron la propagación de enfermedades y aumentaron la preocupación de médicos, reformadores y autoridades.' },
  { type: 'paragraph', text: 'Aun así, las ciudades siguieron atrayendo población porque concentraban empleos, servicios y posibilidades de mejorar los ingresos.' },
  {
    type: 'paragraph',
    text: 'Así, la urbanización chilena estuvo marcada simultáneamente por nuevas oportunidades y por problemas sociales derivados de un crecimiento rápido y desigual.',
  },
];

const textoB: Blk[] = [
  { type: 'heading', level: 3, text: 'Texto B — No basta con tener trabajo' },
  { type: 'paragraph', text: 'A comienzos del siglo XX, un trabajador de un centro productivo describía las condiciones de vida de su comunidad:' },
  { type: 'paragraph', text: 'Algunos dicen que mientras exista trabajo no hay razón para reclamar. Pero tener empleo no significa necesariamente vivir bien.' },
  {
    type: 'paragraph',
    text: 'Muchos comenzamos antes de que salga el sol y regresamos cuando ya oscureció. Si alguien enferma o sufre un accidente, el salario puede desaparecer de un día para otro.',
  },
  { type: 'paragraph', text: 'Las habitaciones donde viven varias familias son pequeñas, y cuando una enfermedad llega a una casa suele extenderse rápidamente a las demás.' },
  { type: 'paragraph', text: 'Por eso nos hemos organizado. Cada integrante aporta una pequeña cantidad para ayudar a quien enferma y para sostener a las familias cuando ocurre una desgracia.' },
  { type: 'paragraph', text: 'También queremos discutir juntos nuestras condiciones de trabajo. Una sola persona puede ser ignorada con facilidad; muchas personas organizadas pueden hacerse escuchar.' },
];

const transformacionesSociedadChilena: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA',
  unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
  subjectKey: 'historia',
  order: 5,
  title: 'Transformaciones de la sociedad chilena entre los siglos XIX y XX',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar las principales transformaciones sociales experimentadas por Chile entre fines del siglo XIX y comienzos del siglo XX, reconociendo los efectos de la urbanización, la expansión de actividades productivas, la migración interna, el crecimiento de nuevos grupos sociales y las desigualdades asociadas a la llamada cuestión social.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Transformaciones de la sociedad chilena entre los siglos XIX y XX' },

    { type: 'heading', level: 2, text: '1. Una sociedad en transformación' },
    {
      type: 'paragraph',
      text: 'Durante las últimas décadas del siglo XIX y las primeras del XX, Chile experimentó cambios importantes. El crecimiento de ciertas actividades económicas y urbanas modificó: dónde vivían las personas; en qué trabajaban; cómo se organizaban; qué problemas sociales enfrentaban. No fue una transformación instantánea ni uniforme.',
    },

    { type: 'heading', level: 2, text: '2. Urbanización' },
    {
      type: 'paragraph',
      text: 'Las ciudades comenzaron a crecer por distintas razones. Entre ellas: nuevas oportunidades laborales; expansión del comercio; crecimiento de servicios; migraciones desde zonas rurales. El crecimiento urbano produjo nuevas oportunidades, pero también fuertes problemas de vivienda e infraestructura.',
    },

    { type: 'heading', level: 2, text: '3. Migración interna' },
    {
      type: 'paragraph',
      text: 'Muchas personas se desplazaron buscando trabajo. Los movimientos podían darse: desde zonas rurales a ciudades; hacia centros mineros; hacia puertos; hacia regiones con nuevas actividades productivas. La migración modificó la composición de distintos espacios del país.',
    },

    { type: 'heading', level: 2, text: '4. Expansión de los sectores populares urbanos' },
    {
      type: 'paragraph',
      text: 'El crecimiento de ciudades y centros productivos aumentó el número de: obreros; trabajadores portuarios; empleados; artesanos; trabajadores de servicios. Estos grupos tuvieron experiencias laborales y condiciones de vida muy diversas.',
    },

    { type: 'heading', level: 2, text: '5. Nuevos sectores medios' },
    {
      type: 'paragraph',
      text: 'También crecieron grupos vinculados a: administración pública; educación; comercio; profesiones; servicios. Estos sectores medios adquirieron progresivamente mayor presencia social y política.',
    },

    { type: 'heading', level: 2, text: '6. La élite' },
    {
      type: 'paragraph',
      text: 'Las élites económicas y políticas continuaron ejerciendo una influencia importante. Su posición podía estar vinculada a: propiedad de tierras; minería; comercio; inversiones; participación política. Por eso, modernización económica no significó desaparición de las jerarquías sociales.',
    },

    { type: 'heading', level: 2, text: '7. La cuestión social' },
    {
      type: 'paragraph',
      text: 'El término cuestión social se utiliza para referirse al conjunto de problemas laborales y de vida que afectaron especialmente a sectores populares. Entre ellos: hacinamiento; malas condiciones sanitarias; bajos salarios; jornadas extensas; inseguridad laboral; enfermedades; escasa protección social.',
    },

    { type: 'heading', level: 2, text: '8. Organización de los trabajadores' },
    {
      type: 'paragraph',
      text: 'Frente a estas condiciones, distintos trabajadores comenzaron a organizarse. Aparecieron: sociedades de socorros mutuos; asociaciones; sindicatos; mancomunales; movimientos reivindicativos. Estas organizaciones podían buscar: ayuda entre trabajadores; mejores salarios; reducción de jornadas; mayor protección.',
    },

    { type: 'heading', level: 2, text: '9. Respuestas a la cuestión social' },
    {
      type: 'paragraph',
      text: 'Los problemas sociales fueron interpretados de distintas maneras. Participaron en el debate: trabajadores; empresarios; Iglesia; intelectuales; partidos políticos; Estado. Con el tiempo comenzaron a desarrollarse reformas y legislación social.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una fuente sobre transformaciones sociales: identifica el grupo social involucrado; relaciona cambios económicos con cambios sociales; distingue urbanización de mejora automática de condiciones; observa causas de migración; reconoce desigualdades; analiza formas de organización; evita explicar la cuestión social mediante una única causa.',
    },
  ]),
  questions: [
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué proceso demográfico aparece principalmente descrito en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La migración hacia las ciudades.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La desaparición de la población urbana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El abandono completo de las actividades comerciales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La emigración masiva desde Chile hacia Europa.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El texto describe el traslado de personas desde zonas rurales y localidades pequeñas hacia centros urbanos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué problema acompañó el crecimiento de las ciudades?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La ausencia total de nuevos trabajadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El cierre completo de talleres y puertos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La escasez de viviendas y servicios adecuados para parte de la población.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La reducción permanente de la población.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El crecimiento urbano superó en varios sectores la capacidad para ofrecer vivienda, saneamiento y servicios suficientes.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoA,
        { type: 'paragraph', text: '¿Por qué las ciudades continuaban atrayendo población pese a las malas condiciones de vida de algunos barrios?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque toda vivienda urbana era gratuita.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque concentraban oportunidades laborales y servicios.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Porque el trabajo rural había desaparecido completamente.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque las autoridades obligaban a todas las personas a migrar.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La posibilidad de encontrar empleo y acceder a determinados servicios mantenía el atractivo de los centros urbanos.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Qué relación entre urbanización y cuestión social puede establecerse a partir del texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La urbanización eliminó inmediatamente las desigualdades sociales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cuestión social ocurrió exclusivamente en las zonas rurales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento de las ciudades solucionó automáticamente los problemas sanitarios.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El rápido crecimiento urbano contribuyó a generar problemas de vivienda y salubridad que afectaron especialmente a sectores populares.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La concentración de población en condiciones precarias fue una de las dimensiones importantes de la cuestión social.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([...textoA, { type: 'paragraph', text: '¿Cuál interpretación explica mejor las transformaciones descritas?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La urbanización fue un proceso exclusivamente negativo que no generó oportunidades laborales.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'El crecimiento económico y urbano generó nuevas oportunidades, pero sus beneficios se distribuyeron de manera desigual y produjo nuevas tensiones sociales.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El crecimiento económico mejoró de forma inmediata y uniforme las condiciones de toda la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los problemas urbanos surgieron sin relación alguna con las transformaciones económicas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El texto muestra que modernización, migración y crecimiento urbano estuvieron acompañados tanto por oportunidades como por desigualdades y precariedad.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué mecanismo menciona el emisor para enfrentar problemas comunes entre trabajadores?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La eliminación de cualquier asociación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El abandono definitivo del trabajo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La organización y ayuda mutua.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La prohibición de aportar dinero colectivamente.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El trabajador describe una organización en la que sus integrantes aportan recursos y actúan colectivamente.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...textoB, { type: 'paragraph', text: '¿Qué problema laboral aparece en el texto?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La falta de protección ante enfermedad o accidente.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El exceso de seguros laborales garantizados.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La inexistencia de jornadas extensas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La obligación de todos los trabajadores de ser propietarios.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El emisor señala que enfermarse o sufrir un accidente podía significar perder inmediatamente el ingreso.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Con qué tipo de organización histórica se relaciona mejor la práctica de aportar dinero para ayudar a trabajadores enfermos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Con compañías coloniales de conquista.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Con parlamentos monárquicos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Con asociaciones destinadas exclusivamente a empresarios.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Con sociedades de socorros mutuos.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las sociedades de socorros mutuos se basaban en aportes de sus miembros para ayudarse frente a enfermedades, accidentes u otras dificultades.',
        },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Qué idea expresa la frase "una sola persona puede ser ignorada con facilidad; muchas personas organizadas pueden hacerse escuchar"?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La organización laboral impedía cualquier negociación.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La acción colectiva podía aumentar la capacidad de los trabajadores para plantear demandas.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Los problemas laborales solo podían resolverse de manera individual.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Los trabajadores rechazaban toda posibilidad de cooperación.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La organización colectiva permitía transformar problemas individuales en demandas compartidas y aumentar la capacidad de presión.' },
      ],
    },
    {
      questionKey: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...textoB,
        { type: 'paragraph', text: '¿Cuál de las siguientes afirmaciones relaciona mejor la fuente con la cuestión social en Chile?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Demuestra que la cuestión social se produjo únicamente por falta de empleo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Indica que los trabajadores contaban desde el comienzo con una amplia protección estatal.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Refleja cómo la precariedad laboral y habitacional impulsó formas de organización colectiva entre trabajadores para enfrentar problemas y exigir mejoras.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Muestra que el crecimiento económico eliminó los conflictos sociales durante el período.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuente vincula problemas laborales, inseguridad económica, malas condiciones habitacionales y organización obrera, elementos centrales de la cuestión social.',
        },
      ],
    },
  ],
};

export default transformacionesSociedadChilena;
