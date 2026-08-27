// CONTENT-4.7 -- Golden Unit M1 / Geometría, Recurso 3. Contenido editorial
// APROBADO externamente. Mismo criterio de ajustes técnicos que
// figuras-geometricas.ts (contentBlocks, LaTeX, questionKey sin padding).
//
// NOTA CRÍTICA (Q10): la alternativa correcta APROBADA es C = (-3, 2).
// Verificado independientemente en esta implementación: rotación 90°
// antihorario (x,y) -> (-y,x) aplicada a (2,-3) da (3,2); reflexión sobre el
// eje y (x,y) -> (-x,y) aplicada a (3,2) da (-3,2). NO usar A (versión
// preliminar descartada por el equipo editorial).
import type { ResourceContentModule } from '../../schema';

const transformacionesIsometricas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS',
  unitCode: 'M1.GEOMETRIA',
  subjectKey: 'matematica',
  order: 3,
  title: 'Transformaciones isométricas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá aplicar traslaciones, reflexiones y rotaciones en el plano cartesiano, reconociendo que estas transformaciones conservan longitudes y ángulos.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Transformaciones isométricas' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué es una transformación isométrica?' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Es una transformación que conserva las longitudes, los ángulos, el perímetro y el área de una figura. Las principales son: traslación, reflexión y rotación.',
    },

    { type: 'heading', order: 3, level: 2, text: 'Traslación' },
    { type: 'formula', order: 4, latex: "P(x, y) + \\text{vector}(a, b) = P'(x + a, y + b)" },
    { type: 'paragraph', order: 5, text: 'Ejemplo: P(2, 3) trasladado por el vector (4, -1).' },
    { type: 'formula', order: 6, latex: "P' = (2 + 4, 3 - 1) = (6, 2)" },

    { type: 'heading', order: 7, level: 2, text: 'Reflexión sobre el eje x' },
    { type: 'formula', order: 8, latex: '(x, y) \\rightarrow (x, -y)' },

    { type: 'heading', order: 9, level: 2, text: 'Reflexión sobre el eje y' },
    { type: 'formula', order: 10, latex: '(x, y) \\rightarrow (-x, y)' },

    { type: 'heading', order: 11, level: 2, text: 'Reflexión respecto al origen' },
    { type: 'formula', order: 12, latex: '(x, y) \\rightarrow (-x, -y)' },

    { type: 'heading', order: 13, level: 2, text: 'Rotación en torno al origen' },
    {
      type: 'paragraph',
      order: 14,
      text: 'Para una rotación en torno al origen, considerando el sentido antihorario como positivo:',
    },
    { type: 'formula', order: 15, latex: '90°: (x, y) \\rightarrow (-y, x)' },
    { type: 'formula', order: 16, latex: '180°: (x, y) \\rightarrow (-x, -y)' },
    { type: 'formula', order: 17, latex: '270° \\text{ antihorario}: (x, y) \\rightarrow (y, -x)' },

    { type: 'heading', order: 18, level: 2, text: 'Ejemplo de rotación' },
    { type: 'paragraph', order: 19, text: 'P(2, 5) rotado 90° en torno al origen.' },
    { type: 'formula', order: 20, latex: "P' = (-5, 2)" },

    { type: 'heading', order: 21, level: 2, text: 'Figuras congruentes' },
    {
      type: 'paragraph',
      order: 22,
      text: 'Dos figuras son congruentes cuando una se obtiene de la otra mediante una o más transformaciones isométricas: conservan su forma y tamaño.',
    },

    { type: 'heading', order: 23, level: 2, text: 'Composición de transformaciones' },
    {
      type: 'paragraph',
      order: 24,
      text: 'Se pueden aplicar varias transformaciones en secuencia. El orden en que se aplican importa: cambiar el orden puede cambiar el resultado final.',
    },
    { type: 'paragraph', order: 25, text: 'Ejemplo: el punto (1, 2) se traslada por (3, 1):' },
    { type: 'formula', order: 26, latex: '(1 + 3, 2 + 1) = (4, 3)' },
    { type: 'paragraph', order: 27, text: 'y luego se refleja sobre el eje x:' },
    { type: 'formula', order: 28, latex: '(4, 3) \\rightarrow (4, -3)' },

    { type: 'heading', order: 29, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 30,
      text: 'Antes de resolver: identifica el tipo de transformación, aplica la regla de coordenadas correspondiente y, si hay más de una transformación, respeta el orden indicado, aplicando cada paso sobre el resultado del paso anterior.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'El punto P(2, 3) se traslada según el vector (4, 1). ¿Cuál es su imagen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(6, 4)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(2, 4)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(6, 3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-2, 2)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(2 + 4, 3 + 1) = (6, 4)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es la imagen del punto (3, 5) al reflejarlo sobre el eje x?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(-3, 5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(3, -5)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(-3, -5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(5, 3)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(x, y) \\rightarrow (x, -y)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Qué se conserva en una transformación isométrica?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Solo el color de la figura' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Solo la posición' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Las longitudes y los ángulos' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Solo el área, no el perímetro' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una isometría conserva longitudes, ángulos, perímetro y área.' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es la imagen del punto (-4, 2) al reflejarlo sobre el eje y?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(4, 2)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(-4, -2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4, -2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(2, -4)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(x, y) \\rightarrow (-x, y)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'El punto P(3, -2) se refleja respecto al origen. ¿Cuál es su imagen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3, 2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-3, -2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-3, 2)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(2, -3)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(x, y) \\rightarrow (-x, -y)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'El punto (2, 4) se rota 90° en sentido antihorario en torno al origen. ¿Cuál es su imagen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(4, 2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-4, 2)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(4, -2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-2, -4)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(x, y) \\rightarrow (-y, x) \\;\\Rightarrow\\; (2, 4) \\rightarrow (-4, 2)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'El punto (-3, 5) se rota 180° en torno al origen. ¿Cuál es su imagen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3, -5)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(-3, -5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(5, -3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(3, 5)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(x, y) \\rightarrow (-x, -y) \\;\\Rightarrow\\; (-3, 5) \\rightarrow (3, -5)' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'El punto A(1, -2) se traslada según el vector (3, 5) y luego se refleja sobre el eje x. ¿Cuál es su imagen final?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(4, 3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4, -3)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(-4, 3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4, 7)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '(1 + 3, -2 + 5) = (4, 3)' },
        { type: 'formula', order: 1, latex: '(4, 3) \\rightarrow (4, -3)' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un triángulo tiene vértices A(1, 1), B(4, 1) y C(1, 3). Se traslada según el vector (-2, 4). ¿Cuáles son las coordenadas de C\'?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(-1, 7)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(3, -1)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-1, -1)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(1, 7)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: "C' = (1 - 2, 3 + 4) = (-1, 7)" }],
    },
    {
      questionKey: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'El punto P(2, -3) se rota 90° en sentido antihorario en torno al origen y luego se refleja sobre el eje y. ¿Cuál es su imagen final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3, 2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-3, -2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-3, 2)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(2, 3)' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Rotación 90° antihorario:' },
        { type: 'formula', order: 1, latex: '(2, -3) \\rightarrow (-(-3), 2) = (3, 2)' },
        { type: 'paragraph', order: 2, text: 'Reflexión sobre el eje y:' },
        { type: 'formula', order: 3, latex: '(3, 2) \\rightarrow (-3, 2)' },
      ],
    },
  ],
};

export default transformacionesIsometricas;
