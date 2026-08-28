// CONTENT-C3A -- Ciencias / U1 "Biología", Recurso 9 (order 9 en U1).
// Abre el bloque C3A (Ciencias U1 Biología R9-R12).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R9 -- B D A C B A C D B A.
// Tabla editorial de la Situación B ("Generación / Individuos oscuros")
// representada como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan
// EXACTAMENTE los porcentajes (18% / 31% / 47% / 63%).
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
  { type: 'heading', level: 3, text: 'Comparación de estructuras en cuatro especies' },
  { type: 'paragraph', text: 'Un grupo de estudiantes comparó el patrón óseo de una extremidad anterior en cuatro vertebrados.' },
  {
    type: 'paragraph',
    text: 'Observaron que, aunque las extremidades tenían funciones diferentes, todas presentaban una organización general semejante de varios huesos.',
  },
  { type: 'paragraph', text: 'En una especie la extremidad se utilizaba principalmente para nadar.' },
  { type: 'paragraph', text: 'En otra, para volar.' },
  { type: 'paragraph', text: 'En una tercera, para desplazarse sobre el suelo.' },
  { type: 'paragraph', text: 'En la cuarta, para manipular objetos.' },
  {
    type: 'paragraph',
    text: 'Los estudiantes propusieron que la semejanza estructural podía explicarse por un origen evolutivo común, seguido por modificaciones relacionadas con funciones diferentes.',
  },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Cambios en una población a través de generaciones' },
  {
    type: 'paragraph',
    text: 'Una investigadora estudió una población de insectos que presentaba dos variantes hereditarias de coloración: clara y oscura.',
  },
  { type: 'paragraph', text: 'Registró la frecuencia de individuos con coloración oscura durante varias generaciones.' },
  { type: 'paragraph', text: '| Generación | Individuos oscuros |' },
  { type: 'paragraph', text: '| 1 | 18% |' },
  { type: 'paragraph', text: '| 5 | 31% |' },
  { type: 'paragraph', text: '| 10 | 47% |' },
  { type: 'paragraph', text: '| 15 | 63% |' },
  { type: 'paragraph', text: 'Las condiciones ambientales se mantuvieron relativamente estables durante el período de estudio.' },
  {
    type: 'paragraph',
    text: 'La investigadora concluyó que la frecuencia de una característica heredable había cambiado a lo largo de generaciones.',
  },
];

const evolucionEvidenciasEvolutivas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS',
  unitCode: 'CIENCIAS.BIOLOGIA',
  subjectKey: 'ciencias',
  order: 9,
  title: 'Evolución y evidencias evolutivas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá explicar la evolución como cambio en las características hereditarias de las poblaciones a lo largo de generaciones, distinguiéndola de cambios individuales, e interpretar diferentes tipos de evidencia evolutiva, como el registro fósil, las homologías, la biogeografía y las similitudes genéticas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Evolución y evidencias evolutivas' },

    { type: 'heading', level: 2, text: '1. ¿Qué es evolución biológica?' },
    {
      type: 'paragraph',
      text: 'La evolución biológica corresponde a cambios heredables que ocurren en poblaciones a lo largo de generaciones. Esto significa que: la evolución ocurre en poblaciones; involucra características heredables; requiere considerar más de una generación; no corresponde simplemente a cambios que experimenta un individuo durante su vida. Un organismo puede crecer o modificarse, pero eso no significa por sí solo que la población haya evolucionado.',
    },

    { type: 'heading', level: 2, text: '2. Poblaciones y generaciones' },
    {
      type: 'paragraph',
      text: 'Una población está formada por individuos de la misma especie que habitan una determinada área y pueden reproducirse entre sí. Si la frecuencia de ciertas variantes hereditarias cambia entre generaciones, puede estar ocurriendo evolución. Por eso, para estudiar evolución se comparan frecuentemente: generaciones; poblaciones; frecuencias de características; variantes genéticas.',
    },

    { type: 'heading', level: 2, text: '3. Variación heredable' },
    {
      type: 'paragraph',
      text: 'Los individuos de una población pueden presentar diferencias. Parte de esa variación puede ser heredable. La variación heredable es importante porque permite que ciertas características puedan transmitirse entre generaciones. No toda diferencia entre individuos tiene necesariamente una causa genética. El ambiente también puede influir sobre muchas características.',
    },

    { type: 'heading', level: 2, text: '4. Registro fósil' },
    {
      type: 'paragraph',
      text: 'Los fósiles corresponden a restos, huellas o evidencias de organismos del pasado. El registro fósil permite: conocer organismos extintos; comparar formas antiguas y actuales; estudiar cambios a través del tiempo; establecer secuencias aproximadas de aparición. El registro fósil es incompleto, porque no todos los organismos tienen la misma probabilidad de fosilizarse.',
    },

    { type: 'heading', level: 2, text: '5. Anatomía comparada' },
    {
      type: 'paragraph',
      text: 'Comparar estructuras de distintos organismos puede entregar evidencia sobre relaciones evolutivas. Las estructuras homólogas comparten un origen evolutivo general, aunque puedan cumplir funciones distintas. Por ejemplo, ciertas extremidades de vertebrados presentan una organización ósea básica semejante pese a utilizarse para: caminar; nadar; volar; manipular objetos. La semejanza estructural puede reflejar ascendencia común.',
    },

    { type: 'heading', level: 2, text: '6. Estructuras análogas' },
    {
      type: 'paragraph',
      text: 'Dos estructuras pueden cumplir funciones similares sin compartir el mismo origen evolutivo. Estas se denominan estructuras análogas. Por ejemplo, distintas estructuras utilizadas para volar pueden haber evolucionado de manera independiente. Por eso, semejanza funcional no implica necesariamente parentesco cercano.',
    },

    { type: 'heading', level: 2, text: '7. Biogeografía' },
    {
      type: 'paragraph',
      text: 'La biogeografía estudia la distribución de organismos en diferentes regiones. La distribución de especies puede relacionarse con: aislamiento geográfico; historia de los continentes; barreras físicas; colonización de nuevos ambientes. Especies cercanas geográficamente pueden compartir características debido a su historia evolutiva.',
    },

    { type: 'heading', level: 2, text: '8. Evidencia molecular' },
    {
      type: 'paragraph',
      text: 'Comparar ADN o proteínas permite evaluar similitudes entre organismos. En términos generales, especies que comparten un ancestro común relativamente reciente pueden presentar mayores similitudes en determinadas secuencias. La evidencia molecular se utiliza junto con otros tipos de evidencia. No debe interpretarse de forma aislada.',
    },

    { type: 'heading', level: 2, text: '9. Evolución observable' },
    {
      type: 'paragraph',
      text: 'La evolución no corresponde únicamente a procesos ocurridos hace millones de años. También pueden observarse cambios evolutivos en poblaciones actuales. Por ejemplo, puede medirse cómo cambia la frecuencia de una variante heredable entre generaciones. La velocidad del cambio depende de múltiples factores.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre evidencias evolutivas: identifica qué tipo de evidencia se presenta; distingue individuos de poblaciones; determina si el cambio es heredable; compara generaciones; diferencia función semejante de origen común; integra más de una evidencia cuando sea posible; evita afirmar parentesco solo porque dos organismos se parecen externamente.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué tipo de evidencia están utilizando principalmente los estudiantes?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Biogeografía.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Anatomía comparada.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Registro climático.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cambios de temperatura.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los estudiantes comparan estructuras corporales de diferentes organismos, lo que corresponde a evidencia de anatomía comparada.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué característica apoya la idea de que las estructuras sean homólogas?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Todas cumplen exactamente la misma función.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas poseen el mismo tamaño.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Todas pertenecen a organismos acuáticos.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Comparten una organización estructural general pese a cumplir funciones distintas.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las estructuras homólogas pueden conservar un patrón estructural asociado a un origen común aunque sus funciones hayan cambiado.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: '¿Qué conclusión está mejor respaldada por la observación?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Las semejanzas estructurales pueden aportar evidencia de ascendencia común.',
          },
          correct: true,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Dos especies con funciones distintas nunca pueden estar relacionadas evolutivamente.',
          },
          correct: false,
        },
        { content: { type: 'paragraph', order: 0, text: 'Toda estructura semejante tiene necesariamente la misma función.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La anatomía no permite formular hipótesis evolutivas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un patrón estructural compartido entre especies puede utilizarse como evidencia para proponer relaciones evolutivas.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Por qué la función diferente de las extremidades no invalida necesariamente la hipótesis de origen común?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque la función nunca cambia durante la evolución.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque todas las especies viven en el mismo ambiente.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque una estructura heredada de un ancestro común puede modificarse y especializarse para funciones diferentes.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque la evolución elimina siempre las diferencias anatómicas.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Las estructuras homólogas pueden conservar una base común y experimentar modificaciones relacionadas con distintas funciones.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: '¿Qué evidencia adicional fortalecería más la hipótesis de relación evolutiva entre las especies?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Que todas tengan exactamente el mismo tamaño corporal.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Encontrar similitudes consistentes en secuencias genéticas asociadas con esas estructuras, junto con otros caracteres compartidos.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Observar que viven en ambientes completamente distintos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Comprobar que utilizan las extremidades para funciones diferentes.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La combinación de evidencia anatómica y molecular permite evaluar con mayor solidez una hipótesis de ascendencia común.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué variable cambió a lo largo de las generaciones?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La frecuencia de individuos con coloración oscura.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El número de cromosomas de cada insecto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La cantidad de especies del planeta.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La duración de una generación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran un aumento progresivo en la proporción de individuos con la variante oscura.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Por qué los datos son compatibles con un proceso evolutivo?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Porque cada insecto cambió de color durante su vida.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Porque el ambiente desapareció.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Porque cambió entre generaciones la frecuencia de una característica heredable en la población.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Porque todos los insectos terminaron siendo idénticos.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evolución puede identificarse como un cambio generacional en la frecuencia de características heredables dentro de una población.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: '¿Qué información adicional sería necesaria para explicar por qué aumentó la variante oscura?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo el tamaño promedio de los insectos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El nombre científico de la población.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Únicamente el número de generaciones estudiadas.' }, correct: false },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evidencia sobre diferencias en supervivencia, reproducción u otros procesos que afecten la transmisión de ambas variantes.',
          },
          correct: true,
        },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los datos muestran que ocurrió un cambio, pero para explicar su causa se necesita información sobre los procesos que modificaron la frecuencia de las variantes.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Qué afirmación distingue correctamente evolución de cambio individual?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'Evolución significa que todos los organismos deben cambiar durante su vida.',
          },
          correct: false,
        },
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La evolución se evalúa mediante cambios heredables en poblaciones a través de generaciones.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'Todo cambio producido por el ambiente se hereda.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Un individuo puede evolucionar completamente durante una sola generación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La evolución se refiere a cambios en poblaciones a lo largo de generaciones, no simplemente a modificaciones de un individuo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: '¿Cuál conclusión es la más adecuada a partir de los datos disponibles?' },
      ]),
      options: [
        {
          content: {
            type: 'paragraph',
            order: 0,
            text: 'La población experimentó un cambio evolutivo, pero los datos por sí solos no permiten identificar con certeza el mecanismo que lo produjo.',
          },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'La selección natural fue necesariamente la única causa posible.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cada insecto oscuro produjo exactamente un descendiente oscuro.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La variante clara dejó de existir por completo.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El cambio generacional en una característica heredable es compatible con evolución, pero identificar el mecanismo requiere evidencia adicional.',
        },
      ],
    },
  ],
};

export default evolucionEvidenciasEvolutivas;
