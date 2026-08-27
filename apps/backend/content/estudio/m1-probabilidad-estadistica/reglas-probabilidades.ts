// CONTENT-4.8 -- Golden Unit M1 / Probabilidad y estadística, Recurso 3.
// Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que representacion-datos.ts (contentBlocks, LaTeX, questionKey
// sin padding).
import type { ResourceContentModule } from '../../schema';

const reglasProbabilidades: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES',
  unitCode: 'M1.PROBABILIDAD_ESTADISTICA',
  subjectKey: 'matematica',
  order: 3,
  title: 'Reglas de las probabilidades',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá calcular e interpretar probabilidades simples y compuestas, utilizar reglas de adición y multiplicación, reconocer eventos complementarios e independientes y resolver problemas contextualizados mediante espacios muestrales.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Reglas de las probabilidades' },

    { type: 'heading', order: 1, level: 2, text: 'Experimento aleatorio y espacio muestral' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Un experimento aleatorio es una situación cuyo resultado no puede conocerse con certeza antes de realizarla. Ejemplos: lanzar una moneda, lanzar un dado, extraer una carta. El conjunto de todos los resultados posibles se llama espacio muestral.',
    },
    { type: 'paragraph', order: 3, text: 'Para un dado:' },
    { type: 'formula', order: 4, latex: 'S = \\{1, 2, 3, 4, 5, 6\\}' },

    { type: 'heading', order: 5, level: 2, text: 'Probabilidad de un evento' },
    { type: 'paragraph', order: 6, text: 'Si todos los resultados son igualmente posibles:' },
    { type: 'formula', order: 7, latex: 'P(A) = \\dfrac{\\text{casos favorables}}{\\text{casos posibles}}' },
    { type: 'paragraph', order: 8, text: 'Ejemplo:' },
    { type: 'formula', order: 9, latex: 'P(\\text{par}) = \\dfrac{3}{6} = \\dfrac{1}{2}' },

    { type: 'heading', order: 10, level: 2, text: 'Valores posibles' },
    { type: 'paragraph', order: 11, text: 'Toda probabilidad cumple:' },
    { type: 'formula', order: 12, latex: '0 \\leq P(A) \\leq 1' },
    { type: 'paragraph', order: 13, text: 'Ejemplo: 0,25 = 25%.' },

    { type: 'heading', order: 14, level: 2, text: 'Evento complementario' },
    { type: 'formula', order: 15, latex: 'P(A^c) = 1 - P(A)' },
    { type: 'paragraph', order: 16, text: 'Ejemplo: P(A) = 0,3.' },
    { type: 'formula', order: 17, latex: 'P(A^c) = 0,7' },

    { type: 'heading', order: 18, level: 2, text: 'Regla de adición para eventos incompatibles' },
    { type: 'paragraph', order: 19, text: 'Si no pueden ocurrir simultáneamente:' },
    { type: 'formula', order: 20, latex: 'P(A \\cup B) = P(A) + P(B)' },
    { type: 'paragraph', order: 21, text: 'Ejemplo en un dado:' },
    { type: 'formula', order: 22, latex: 'P(1 \\text{ o } 6) = \\dfrac{1}{6} + \\dfrac{1}{6} = \\dfrac{1}{3}' },

    { type: 'heading', order: 23, level: 2, text: 'Regla general de adición' },
    { type: 'paragraph', order: 24, text: 'Cuando pueden ocurrir simultáneamente:' },
    { type: 'formula', order: 25, latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)' },
    { type: 'paragraph', order: 26, text: 'La intersección se resta porque fue contada dos veces.' },

    { type: 'heading', order: 27, level: 2, text: 'Eventos independientes' },
    { type: 'formula', order: 28, latex: 'P(A \\cap B) = P(A) \\cdot P(B)' },
    { type: 'paragraph', order: 29, text: 'Ejemplo: cara y luego 6.' },
    { type: 'formula', order: 30, latex: '\\dfrac{1}{2} \\cdot \\dfrac{1}{6} = \\dfrac{1}{12}' },

    { type: 'heading', order: 31, level: 2, text: 'Diagramas de árbol' },
    { type: 'paragraph', order: 32, text: 'Dos monedas: CC, CS, SC, SS. Cada camino representa una combinación posible.' },

    { type: 'heading', order: 33, level: 2, text: '"Al menos uno"' },
    { type: 'paragraph', order: 34, text: 'Puede ser más simple usar complemento. Ejemplo:' },
    { type: 'formula', order: 35, latex: 'P(\\text{al menos una cara}) = 1 - P(\\text{ninguna cara})' },
    { type: 'formula', order: 36, latex: '= 1 - \\dfrac{1}{4} = \\dfrac{3}{4}' },

    { type: 'heading', order: 37, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 38,
      text: 'Identifica el experimento, determina resultados posibles, define el evento, revisa si son incompatibles, independientes o complementarios, elige la regla y verifica que la probabilidad final esté entre 0 y 1.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Se lanza un dado equilibrado de seis caras. ¿Cuál es la probabilidad de obtener un 5?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1/5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '2/5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5/6' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'P(5) = \\dfrac{1}{6}' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En una bolsa hay 3 bolas rojas y 7 azules. Si se extrae una al azar, ¿cuál es la probabilidad de obtener una roja?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3/10' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3/7' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7/10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/3' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Total:' },
        { type: 'formula', order: 1, latex: '3 + 7 = 10' },
        { type: 'formula', order: 2, latex: 'P(\\text{roja}) = \\dfrac{3}{10}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Si:' },
        { type: 'formula', order: 1, latex: 'P(A) = 0,35' },
        { type: 'paragraph', order: 2, text: '¿cuál es la probabilidad de que A no ocurra?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,35' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,55' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,65' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1,35' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P(A^c) = 1 - P(A)' },
        { type: 'formula', order: 1, latex: '= 1 - 0,35 = 0,65' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Se lanza un dado equilibrado. ¿Cuál es la probabilidad de obtener un 2 o un 5?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1/6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1/2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2/3' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P(2 \\text{ o } 5) = \\dfrac{1}{6} + \\dfrac{1}{6} = \\dfrac{2}{6} = \\dfrac{1}{3}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Se lanza una moneda equilibrada y un dado equilibrado. ¿Cuál es la probabilidad de obtener cara y un número par?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1/4' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1/3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3/4' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P(\\text{cara}) = \\dfrac{1}{2}' },
        { type: 'formula', order: 1, latex: 'P(\\text{par}) = \\dfrac{3}{6} = \\dfrac{1}{2}' },
        { type: 'formula', order: 2, latex: 'P = \\dfrac{1}{2} \\cdot \\dfrac{1}{2} = \\dfrac{1}{4}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Se lanzan dos monedas equilibradas. ¿Cuál es la probabilidad de obtener exactamente una cara?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1/4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/2' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3/4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Espacio: CC, CS, SC, SS. Favorables: CS, SC.' },
        { type: 'formula', order: 1, latex: 'P = \\dfrac{2}{4} = \\dfrac{1}{2}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En un grupo:' },
        { type: 'formula', order: 1, latex: 'P(A) = 0,6 \\qquad P(B) = 0,5 \\qquad P(A \\cap B) = 0,2' },
        { type: 'paragraph', order: 2, text: '¿Cuál es P(A ∪ B)?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,7' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,9' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1,1' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)' },
        { type: 'formula', order: 1, latex: '= 0,6 + 0,5 - 0,2 = 0,9' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Se lanzan dos dados equilibrados. ¿Cuál es la probabilidad de obtener un 6 en ambos dados?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1/6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/18' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/36' }, correct: true },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '\\dfrac{1}{6} \\cdot \\dfrac{1}{6} = \\dfrac{1}{36}' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Se lanzan dos dados equilibrados. ¿Cuál es la probabilidad de que la suma sea 8?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5/36' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1/6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7/36' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/4' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Hay:' },
        { type: 'formula', order: 1, latex: '6 \\cdot 6 = 36' },
        { type: 'paragraph', order: 2, text: 'resultados ordenados igualmente probables. Suma 8: (2,6), (3,5), (4,4), (5,3), (6,2). 5 casos.' },
        { type: 'formula', order: 3, latex: 'P = \\dfrac{5}{36}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una máquina produce una pieza defectuosa con probabilidad 0,1. Cada pieza se considera independiente de las demás. Si se revisan 3 piezas, ¿cuál es la probabilidad de que al menos una sea defectuosa?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,001' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,1' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,271' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,729' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P(\\text{no defectuosa}) = 0,9' },
        { type: 'formula', order: 1, latex: 'P(\\text{ninguna defectuosa}) = 0,9^3 = 0,729' },
        { type: 'formula', order: 2, latex: 'P(\\text{al menos una defectuosa}) = 1 - 0,729 = 0,271' },
      ],
    },
  ],
};

export default reglasProbabilidades;
