// CONTENT-4.8 -- Golden Unit M1 / Probabilidad y estadística, Recurso 2.
// Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que representacion-datos.ts (contentBlocks, LaTeX, questionKey
// sin padding).
import type { ResourceContentModule } from '../../schema';

const medidasPosicion: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION',
  unitCode: 'M1.PROBABILIDAD_ESTADISTICA',
  subjectKey: 'matematica',
  order: 2,
  title: 'Medidas de posición',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá determinar e interpretar medidas de posición en conjuntos de datos, especialmente mediana, cuartiles y percentiles, utilizando datos ordenados y representaciones estadísticas para comparar posiciones relativas dentro de una distribución.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Medidas de posición' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué son las medidas de posición?' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Indican dónde se ubica un dato dentro de un conjunto ordenado. Primero se deben ordenar los datos de menor a mayor. Principales: mediana, cuartiles, percentiles.',
    },

    { type: 'heading', order: 3, level: 2, text: 'Mediana' },
    { type: 'paragraph', order: 4, text: 'Divide un conjunto ordenado en dos partes con igual cantidad de datos. Ejemplo impar:' },
    { type: 'formula', order: 5, latex: '2,\\ 4,\\ 5,\\ 7,\\ 9' },
    { type: 'paragraph', order: 6, text: 'Mediana:' },
    { type: 'formula', order: 7, latex: '5' },

    { type: 'heading', order: 8, level: 2, text: 'Mediana con cantidad par' },
    { type: 'paragraph', order: 9, text: 'Ejemplo:' },
    { type: 'formula', order: 10, latex: '2,\\ 4,\\ 6,\\ 8' },
    { type: 'paragraph', order: 11, text: 'Valores centrales: 4 y 6.' },
    { type: 'formula', order: 12, latex: 'Me = \\dfrac{4 + 6}{2} = 5' },

    { type: 'heading', order: 13, level: 2, text: 'Cuartiles' },
    {
      type: 'paragraph',
      order: 14,
      text: 'Q1, Q2, Q3. Q1: aproximadamente 25% queda en o bajo esa posición. Q2: mediana. Q3: aproximadamente 75% queda en o bajo esa posición.',
    },

    { type: 'heading', order: 15, level: 2, text: 'Cómo determinar cuartiles' },
    { type: 'paragraph', order: 16, text: 'Estrategia: ordenar, encontrar Q2, mediana de mitad inferior → Q1, mediana de mitad superior → Q3.' },
    { type: 'paragraph', order: 17, text: 'Ejemplo:' },
    { type: 'formula', order: 18, latex: '1, 2, 3, 4, 5, 6, 7, 8' },
    { type: 'formula', order: 19, latex: 'Q2 = \\dfrac{4 + 5}{2} = 4,5' },
    { type: 'paragraph', order: 20, text: 'Mitad inferior: 1, 2, 3, 4.' },
    { type: 'formula', order: 21, latex: 'Q1 = \\dfrac{2 + 3}{2} = 2,5' },
    { type: 'paragraph', order: 22, text: 'Mitad superior: 5, 6, 7, 8.' },
    { type: 'formula', order: 23, latex: 'Q3 = \\dfrac{6 + 7}{2} = 6,5' },

    { type: 'heading', order: 24, level: 2, text: 'Rango intercuartílico' },
    { type: 'formula', order: 25, latex: 'RIC = Q3 - Q1' },
    { type: 'paragraph', order: 26, text: 'Ejemplo: Q1 = 12, Q3 = 20.' },
    { type: 'formula', order: 27, latex: 'RIC = 8' },

    { type: 'heading', order: 28, level: 2, text: 'Percentiles' },
    { type: 'paragraph', order: 29, text: 'Dividen un conjunto ordenado en 100 partes. Pk indica una posición tal que aproximadamente k% de los datos queda en o bajo ese valor. Ejemplo: P80, posición asociada aproximadamente al 80% de los datos.' },

    { type: 'heading', order: 30, level: 2, text: 'Interpretar un percentil' },
    {
      type: 'paragraph',
      order: 31,
      text: 'Si un estudiante está en percentil 90: su resultado se ubica en una posición igual o superior a aproximadamente el 90% de los resultados considerados. NO significa 90% de respuestas correctas.',
    },

    { type: 'heading', order: 32, level: 2, text: 'Comparar distribuciones' },
    { type: 'paragraph', order: 33, text: 'Por ejemplo: mediana mayor → posición central mayor; RIC menor → 50% central más concentrado.' },

    { type: 'heading', order: 34, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 35,
      text: 'Ordena los datos, identifica cuántos datos hay, distingue mediana, cuartil y percentil, revisa qué posición se busca e interpreta el resultado.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es la mediana del conjunto:' },
        { type: 'formula', order: 1, latex: '2,\\ 4,\\ 6,\\ 7,\\ 9' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Hay 5 datos ordenados. El valor central es 6.' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es la mediana de:' },
        { type: 'formula', order: 1, latex: '3,\\ 5,\\ 7,\\ 9' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'Me = \\dfrac{5 + 7}{2} = 6' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Qué medida corresponde al segundo cuartil Q2?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La media' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La moda' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La mediana' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El rango' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El segundo cuartil corresponde a la mediana.' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Considera:' },
        { type: 'formula', order: 1, latex: '2, 4, 6, 8, 10, 12, 14, 16' },
        { type: 'paragraph', order: 2, text: '¿Cuál es Q1 usando la mediana de la mitad inferior?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Mitad inferior: 2, 4, 6, 8.' },
        { type: 'formula', order: 1, latex: 'Q1 = \\dfrac{4 + 6}{2} = 5' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Para un conjunto: Q1 = 18, Q3 = 30. ¿Cuál es el rango intercuartílico?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '48' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'RIC = Q3 - Q1' },
        { type: 'formula', order: 1, latex: 'RIC = 30 - 18 = 12' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Los datos ordenados son:' },
        { type: 'formula', order: 1, latex: '4, 6, 8, 10, 12, 14, 16' },
        { type: 'paragraph', order: 2, text: '¿Cuál es la mediana?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Hay 7 datos. El cuarto valor es 10.' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un estudiante está en el percentil 80 de una prueba. ¿Cuál interpretación es correcta?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Respondió correctamente el 80% de las preguntas.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Obtuvo exactamente 80 puntos.' }, correct: false },
        {
          content: { type: 'paragraph', order: 0, text: 'Su resultado está en una posición igual o superior a aproximadamente el 80% de los resultados considerados.' },
          correct: true,
        },
        { content: { type: 'paragraph', order: 0, text: 'El 80% de sus respuestas fueron mejores que sus otras respuestas.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Un percentil indica posición relativa dentro de una distribución. No corresponde directamente al porcentaje de respuestas correctas.' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una distribución tiene: Q1 = 20, Q2 = 27, Q3 = 35. ¿Cuál afirmación es correcta?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La mediana es 20.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La mediana es 27.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El rango intercuartílico es 27.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El 75% de los datos es exactamente igual a 35.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Q2 corresponde a la mediana:' },
        { type: 'formula', order: 1, latex: 'Me = 27' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Los datos ordenados son:' },
        { type: 'formula', order: 1, latex: '3, 5, 7, 9, 11, 13, 15, 17' },
        { type: 'paragraph', order: 2, text: '¿Cuál es el rango intercuartílico usando la mediana de cada mitad para calcular Q1 y Q3?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Mitad inferior: 3, 5, 7, 9.' },
        { type: 'formula', order: 1, latex: 'Q1 = \\dfrac{5 + 7}{2} = 6' },
        { type: 'paragraph', order: 2, text: 'Mitad superior: 11, 13, 15, 17.' },
        { type: 'formula', order: 3, latex: 'Q3 = \\dfrac{13 + 15}{2} = 14' },
        { type: 'formula', order: 4, latex: 'RIC = 14 - 6 = 8' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Dos grupos obtuvieron: Grupo A: Q1=40, Q2=55, Q3=70. Grupo B: Q1=50, Q2=55, Q3=60. ¿Cuál afirmación está mejor respaldada?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Ambos grupos tienen exactamente los mismos resultados.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Grupo A tiene mayor mediana.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El 50% central del Grupo B está más concentrado que el del Grupo A.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'El Grupo B tiene necesariamente un promedio mayor.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Ambos tienen mediana:' },
        { type: 'formula', order: 1, latex: '55' },
        { type: 'paragraph', order: 2, text: 'Pero:' },
        { type: 'formula', order: 3, latex: 'RIC_A = 70 - 40 = 30' },
        { type: 'formula', order: 4, latex: 'RIC_B = 60 - 50 = 10' },
        { type: 'paragraph', order: 5, text: 'Por tanto, el 50% central del Grupo B está más concentrado.' },
      ],
    },
  ],
};

export default medidasPosicion;
