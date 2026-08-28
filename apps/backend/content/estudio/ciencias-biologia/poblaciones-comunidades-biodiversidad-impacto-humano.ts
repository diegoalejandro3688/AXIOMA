// CONTENT-C3A -- Ciencias / U1 "Biología", Recurso 12 (order 12 en U1).
// Cierra la unidad U1 "Biología" en el source (12 recursos / 120 preguntas).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R12 -- C A D B C B A D C B.
// Tabla editorial de la Situación A ("Año / Tamaño poblacional / Disponibilidad
// relativa de alimento") representada como filas de párrafo con "|" --
// FORMAT_ONLY. Se preservan EXACTAMENTE los valores numéricos y las etiquetas
// Alta / Media / Baja.
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
  { type: 'heading', level: 3, text: 'Una población y la disponibilidad de alimento' },
  { type: 'paragraph', text: 'Investigadores estudiaron una población de pequeños mamíferos durante seis años.' },
  { type: 'paragraph', text: '| Año | Tamaño poblacional | Disponibilidad relativa de alimento |' },
  { type: 'paragraph', text: '| 1 | 120 | Alta |' },
  { type: 'paragraph', text: '| 2 | 155 | Alta |' },
  { type: 'paragraph', text: '| 3 | 190 | Media |' },
  { type: 'paragraph', text: '| 4 | 205 | Media |' },
  { type: 'paragraph', text: '| 5 | 198 | Baja |' },
  { type: 'paragraph', text: '| 6 | 172 | Baja |' },
  { type: 'paragraph', text: 'Durante el mismo período no se detectaron cambios importantes en el número de depredadores.' },
  {
    type: 'paragraph',
    text: 'Los investigadores propusieron que la disponibilidad de alimento podía estar actuando como uno de los factores limitantes de la población.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Fragmentación de un bosque' },
  { type: 'paragraph', text: 'Una región boscosa continua fue dividida por carreteras y zonas urbanizadas.' },
  {
    type: 'paragraph',
    text: 'Años después, investigadores compararon poblaciones de una especie que habitaba varios fragmentos del bosque.',
  },
  { type: 'paragraph', text: 'Observaron que:' },
  {
    type: 'paragraph',
    text: 'algunos fragmentos pequeños contenían poblaciones reducidas; el movimiento de individuos entre fragmentos era poco frecuente; ciertas poblaciones presentaban menor diversidad genética; varias especies que necesitaban grandes áreas habían disminuido en la región.',
  },
  { type: 'paragraph', text: 'Luego se construyeron corredores de vegetación que conectaban algunos fragmentos.' },
  {
    type: 'paragraph',
    text: 'Durante los años siguientes aumentó el desplazamiento de individuos entre varias zonas conectadas.',
  },
];

const poblacionesComunidadesBiodiversidadImpactoHumano: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 12,
  title: 'Poblaciones, comunidades, biodiversidad e impacto humano',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá analizar cambios en poblaciones y comunidades, relacionando tamaño poblacional, factores limitantes, interacciones ecológicas y biodiversidad con perturbaciones naturales y actividades humanas, y evaluando posibles consecuencias de distintas acciones sobre la estabilidad de los ecosistemas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Poblaciones, comunidades, biodiversidad e impacto humano' },

    { type: 'heading', level: 2, text: '1. Poblaciones' },
    {
      type: 'paragraph',
      text: 'Una población está formada por individuos de la misma especie que habitan una determinada área y pueden interactuar entre sí. El tamaño de una población puede cambiar debido a: nacimientos; muertes; inmigración; emigración. Estos procesos modifican el número de individuos a lo largo del tiempo.',
    },

    { type: 'heading', level: 2, text: '2. Factores limitantes' },
    {
      type: 'paragraph',
      text: 'El crecimiento de una población no puede aumentar indefinidamente. Puede estar limitado por factores como: alimento; agua; espacio; refugio; enfermedades; depredación; condiciones ambientales. La importancia de cada factor depende del ecosistema.',
    },

    { type: 'heading', level: 2, text: '3. Capacidad de carga' },
    {
      type: 'paragraph',
      text: 'La capacidad de carga corresponde, de manera general, al tamaño poblacional que un ambiente puede sostener durante cierto período bajo determinadas condiciones. No es un valor completamente fijo. Puede cambiar si se modifican: recursos; clima; disponibilidad de hábitat; relaciones con otras especies.',
    },

    { type: 'heading', level: 2, text: '4. Comunidades' },
    {
      type: 'paragraph',
      text: 'Una comunidad está formada por poblaciones de diferentes especies que viven e interactúan en una misma área. Dentro de una comunidad pueden existir interacciones como: competencia; depredación; parasitismo; mutualismo. Estas relaciones pueden modificar el tamaño y distribución de las poblaciones.',
    },

    { type: 'heading', level: 2, text: '5. Competencia' },
    {
      type: 'paragraph',
      text: 'La competencia ocurre cuando organismos utilizan recursos limitados similares. Puede ocurrir: entre individuos de la misma especie; entre especies diferentes. La competencia no implica necesariamente que una especie desaparezca, pero puede afectar crecimiento, reproducción o distribución.',
    },

    { type: 'heading', level: 2, text: '6. Biodiversidad' },
    {
      type: 'paragraph',
      text: 'La biodiversidad incluye distintas formas de variación biológica. Puede considerarse a nivel de: genes; especies; ecosistemas. Un ecosistema con mayor biodiversidad puede contener más especies y mayor variedad de interacciones. Biodiversidad no significa simplemente “muchos individuos”.',
    },

    { type: 'heading', level: 2, text: '7. Perturbaciones' },
    {
      type: 'paragraph',
      text: 'Una perturbación corresponde a un evento que modifica las condiciones de un ecosistema. Puede ser: natural; causada o intensificada por actividad humana. Ejemplos incluyen: incendios; sequías; inundaciones; contaminación; pérdida de hábitat. Sus efectos dependen de intensidad, duración y frecuencia.',
    },

    { type: 'heading', level: 2, text: '8. Pérdida y fragmentación de hábitat' },
    {
      type: 'paragraph',
      text: 'Cuando un hábitat disminuye o se divide en fragmentos aislados, las poblaciones pueden verse afectadas. La fragmentación puede: reducir áreas disponibles; disminuir conectividad; limitar desplazamiento; reducir flujo génico; aumentar aislamiento. Sus efectos pueden variar según la especie.',
    },

    { type: 'heading', level: 2, text: '9. Especies introducidas e impacto humano' },
    {
      type: 'paragraph',
      text: 'Cuando una especie llega a un ecosistema fuera de su distribución original, puede interactuar con especies locales. No toda especie introducida produce necesariamente un impacto grave. Sin embargo, algunas pueden: competir fuertemente; depredar especies locales; alterar hábitats; modificar redes alimentarias. La evaluación debe basarse en evidencia.',
    },

    { type: 'heading', level: 2, text: '10. Conservación y toma de decisiones' },
    {
      type: 'paragraph',
      text: 'Las acciones de conservación pueden incluir: proteger hábitats; restaurar zonas degradadas; mantener conectividad; reducir contaminación; controlar amenazas específicas; monitorear poblaciones. Una medida debe evaluarse considerando tanto sus beneficios como sus posibles efectos sobre otros componentes del ecosistema.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿En qué año se registró el mayor tamaño poblacional?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Año 1.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Año 3.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Año 4.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Año 6.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El valor máximo registrado es 205 individuos durante el año 4.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué variable ambiental cambió durante el período estudiado?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Disponibilidad de alimento.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Número de cromosomas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cantidad de especies del planeta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Duración del año.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La tabla muestra que la disponibilidad relativa de alimento pasó de alta a media y luego a baja.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué patrón es compatible con la hipótesis de los investigadores?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La población disminuye cuando aumenta la disponibilidad de alimento.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El alimento se mantiene constante mientras cambia la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El número de depredadores aumenta fuertemente antes de la disminución.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La reducción de alimento coincide con una disminución posterior del tamaño poblacional.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Cuando la disponibilidad de alimento baja, la población deja de aumentar y posteriormente disminuye, lo que es compatible con un efecto limitante.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Por qué los datos no permiten afirmar que el alimento es el único factor que regula la población?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque las poblaciones nunca responden al ambiente.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque podrían existir otros factores no medidos que también influyan sobre nacimientos, muertes o desplazamientos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque el alimento no puede actuar como recurso limitado.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el tamaño poblacional no cambió.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una asociación entre alimento y tamaño poblacional no excluye la participación de enfermedades, competencia u otros factores.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Qué diseño adicional permitiría evaluar mejor la hipótesis de que el alimento limita el crecimiento poblacional?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Medir únicamente el color de los animales.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comparar solo el tamaño de otra especie sin registrar recursos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparar poblaciones similares con distinta disponibilidad de alimento, controlando otros factores relevantes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Contar una sola vez los individuos de la población.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Comparar condiciones que difieran en disponibilidad de alimento y controlar otras variables permitiría evaluar mejor su efecto sobre el tamaño poblacional.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué proceso ambiental describe principalmente la situación inicial?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Aumento de capacidad fotosintética.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Fragmentación de hábitat.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Formación de una nueva capa atmosférica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Duplicación genética de todas las especies.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El bosque continuo fue dividido en áreas separadas por infraestructura y urbanización.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué consecuencia puede producir la reducción del movimiento entre fragmentos?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Disminución del flujo génico entre algunas poblaciones.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Conversión inmediata de todas las poblaciones en especies nuevas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Eliminación de todas las mutaciones.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumento obligatorio de la biodiversidad.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si disminuye el intercambio de individuos, también puede reducirse el movimiento de variantes genéticas entre poblaciones.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué función cumplen principalmente los corredores de vegetación en este caso?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Eliminar todos los depredadores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Transformar consumidores en productores.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Impedir cualquier interacción entre fragmentos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Aumentar la conectividad entre sectores de hábitat separados.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los corredores permiten que organismos se desplacen con mayor facilidad entre fragmentos previamente aislados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué evidencia apoya que los corredores tuvieron el efecto esperado?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas las especies aumentaron exactamente en la misma proporción.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Desaparecieron las carreteras.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Aumentó el desplazamiento de individuos entre varias zonas conectadas.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El bosque dejó de contener poblaciones pequeñas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un aumento del movimiento entre fragmentos es evidencia directa de una mayor conectividad funcional.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál conclusión integra mejor los datos?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La fragmentación afecta únicamente el tamaño físico del bosque y no a las poblaciones.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La pérdida de conectividad puede reducir movimientos y flujo génico, afectar poblaciones y biodiversidad, y algunas medidas de conservación pueden disminuir parte de esos efectos al reconectar hábitats.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Construir un corredor garantiza que todas las especies recuperen inmediatamente sus poblaciones originales.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Las poblaciones pequeñas siempre presentan mayor diversidad genética.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fragmentación puede producir efectos poblacionales y genéticos, mientras que aumentar conectividad puede reducir parte del aislamiento, aunque no garantiza una recuperación completa.',
        },
      ],
    },
  ],
};

export default poblacionesComunidadesBiodiversidadImpactoHumano;
