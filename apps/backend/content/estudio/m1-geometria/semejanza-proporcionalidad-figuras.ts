// CONTENT-4.7 -- Golden Unit M1 / Geometría, Recurso 4. Contenido editorial
// APROBADO externamente. Mismo criterio de ajustes técnicos que
// figuras-geometricas.ts (contentBlocks, LaTeX, questionKey sin padding).
import type { ResourceContentModule } from '../../schema';

const semejanzaProporcionalidadFiguras: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS',
  unitCode: 'M1.GEOMETRIA',
  subjectKey: 'matematica',
  order: 4,
  title: 'Semejanza y proporcionalidad de figuras',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer figuras semejantes, calcular razones de semejanza y aplicar la proporcionalidad de lados, perímetros y áreas en la resolución de problemas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Semejanza y proporcionalidad de figuras' },

    { type: 'heading', order: 1, level: 2, text: 'Figuras semejantes' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Dos figuras son semejantes cuando tienen la misma forma: sus ángulos correspondientes son iguales y sus lados correspondientes son proporcionales.',
    },

    { type: 'heading', order: 3, level: 2, text: 'Razón de semejanza' },
    { type: 'paragraph', order: 4, text: 'Ejemplo: si un lado mide 6 y su correspondiente mide 3:' },
    { type: 'formula', order: 5, latex: 'k = \\dfrac{6}{3} = 2' },

    { type: 'heading', order: 6, level: 2, text: 'Lados correspondientes' },
    { type: 'formula', order: 7, latex: "\\dfrac{AB}{A'B'} = \\dfrac{BC}{B'C'}" },
    { type: 'paragraph', order: 8, text: 'Ejemplo:' },
    { type: 'formula', order: 9, latex: '\\dfrac{4}{8} = \\dfrac{5}{x}' },
    { type: 'formula', order: 10, latex: '4x = 40 \\qquad x = 10' },

    { type: 'heading', order: 11, level: 2, text: 'Semejanza de triángulos' },
    { type: 'paragraph', order: 12, text: 'Un triángulo de lados 3, 4, 5 con razón k = 2 genera un triángulo semejante de lados:' },
    { type: 'formula', order: 13, latex: '6, 8, 10' },

    { type: 'heading', order: 14, level: 2, text: 'Perímetros' },
    { type: 'paragraph', order: 15, text: 'Los perímetros cambian según la razón de semejanza k. Ejemplo: k = 3, P = 12.' },
    { type: 'formula', order: 16, latex: "P' = 12 \\cdot 3 = 36" },

    { type: 'heading', order: 17, level: 2, text: 'Áreas' },
    { type: 'paragraph', order: 18, text: 'Las áreas cambian según k². Ejemplo: k = 2.' },
    { type: 'formula', order: 19, latex: '\\text{razón de áreas} = k^2 = 4' },

    { type: 'heading', order: 20, level: 2, text: 'Escalas' },
    { type: 'paragraph', order: 21, text: 'Una escala 1:100 indica que 1 unidad del dibujo equivale a 100 unidades reales. Ejemplo: 4 cm en el dibujo.' },
    { type: 'formula', order: 22, latex: '4 \\text{ cm} \\rightarrow 400 \\text{ cm} = 4 \\text{ m}' },

    { type: 'heading', order: 23, level: 2, text: 'Ampliación y reducción' },
    { type: 'paragraph', order: 24, text: 'Si k > 1, hay ampliación. Si 0 < k < 1, hay reducción. Si k = 1, las figuras tienen el mismo tamaño.' },

    { type: 'heading', order: 25, level: 2, text: 'Aplicación: sombras' },
    {
      type: 'paragraph',
      order: 26,
      text: 'Una persona de 1,5 m proyecta una sombra de 2 m. Si un árbol proyecta una sombra de 8 m, ¿cuál es su altura?',
    },
    { type: 'formula', order: 27, latex: '\\dfrac{1,5}{2} = \\dfrac{h}{8}' },
    { type: 'formula', order: 28, latex: 'h = 6 \\text{ m}' },

    { type: 'heading', order: 29, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 30,
      text: 'Antes de resolver: identifica los elementos correspondientes, calcula la razón de semejanza, recuerda que perímetros escalan por k y áreas por k², y verifica que la proporción esté bien planteada antes de despejar.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Dos figuras semejantes tienen lados correspondientes de 4 cm y 12 cm. ¿Cuál es la razón de semejanza?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'k = \\dfrac{12}{4} = 3' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de las siguientes afirmaciones es correcta para dos triángulos semejantes?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Tienen la misma área' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tienen el mismo perímetro' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Sus ángulos correspondientes son iguales' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Sus lados correspondientes son iguales' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En triángulos semejantes los ángulos correspondientes son iguales y los lados proporcionales.' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Dos figuras son semejantes con razón k = 2. Si un lado de la figura menor mide 5 cm, ¿cuánto mide su correspondiente en la figura mayor?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2,5 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '25 cm' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '5 \\cdot 2 = 10' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Dos triángulos semejantes tienen lados correspondientes de 6 cm y 9 cm. Si otro lado del triángulo menor mide 10 cm, ¿cuánto mide su correspondiente?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '15 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '13 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '20 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'k = \\dfrac{9}{6} = 1,5' },
        { type: 'formula', order: 1, latex: '10 \\cdot 1,5 = 15' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Una figura tiene perímetro 18 cm. Si se amplía con razón de semejanza k = 4, ¿cuál es el perímetro de la figura ampliada?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '22 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '36 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '72 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '288 cm' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '18 \\cdot 4 = 72' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Dos cuadrados son semejantes. El lado del segundo cuadrado es el doble del lado del primero. Si el área del primero es 16 cm², ¿cuál es el área del segundo?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '32 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '48 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '64 cm²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '128 cm²' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'k^2 = 2^2 = 4' },
        { type: 'formula', order: 1, latex: '16 \\cdot 4 = 64' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un plano usa una escala 1:200. Si una pared mide 3 cm en el plano, ¿cuál es su longitud real?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3 m' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6 m' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '60 m' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '600 m' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '3 \\cdot 200 = 600 \\text{ cm} = 6 \\text{ m}' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un triángulo tiene lados 4, 6 y 8 cm. Su semejante tiene el lado correspondiente al de 4 cm midiendo 10 cm. ¿Cuánto mide el lado correspondiente al de 6 cm?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '15 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '16 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '20 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'k = \\dfrac{10}{4} = 2,5' },
        { type: 'formula', order: 1, latex: '6 \\cdot 2,5 = 15' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una persona de 1,8 m de altura proyecta una sombra de 1,2 m. En el mismo momento, un poste proyecta una sombra de 5 m. ¿Cuál es la altura del poste?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '6 m' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7,5 m' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8 m' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9 m' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{1,8}{1,2} = \\dfrac{h}{5}' },
        { type: 'formula', order: 1, latex: 'h = 7,5' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Dos figuras semejantes tienen áreas de 25 cm² y 100 cm². Si un lado de la figura menor mide 7 cm, ¿cuánto mide su correspondiente en la figura mayor?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '14 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '21 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '28 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '35 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'k^2 = \\dfrac{100}{25} = 4 \\qquad k = 2' },
        { type: 'formula', order: 1, latex: '7 \\cdot 2 = 14' },
      ],
    },
  ],
};

export default semejanzaProporcionalidadFiguras;
