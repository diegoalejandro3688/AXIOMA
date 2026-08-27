// CONTENT-4.7 -- Golden Unit M1 / Geometría, Recurso 2. Contenido editorial
// APROBADO externamente. Mismo criterio de ajustes técnicos que
// figuras-geometricas.ts (contentBlocks, LaTeX, questionKey sin padding).
import type { ResourceContentModule } from '../../schema';

const cuerposGeometricos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS',
  unitCode: 'M1.GEOMETRIA',
  subjectKey: 'matematica',
  order: 2,
  title: 'Cuerpos geométricos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar cuerpos geométricos y sus elementos, y calcular áreas y volúmenes de prismas y cilindros.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Cuerpos geométricos' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué es un cuerpo geométrico?' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Un cuerpo geométrico es una figura de tres dimensiones: tiene largo, ancho y altura. Ejemplos: cubo, prisma, cilindro, pirámide, cono, esfera.',
    },

    { type: 'heading', order: 3, level: 2, text: 'Elementos de un poliedro' },
    { type: 'paragraph', order: 4, text: 'Un poliedro tiene caras, aristas y vértices. Un cubo tiene:' },
    { type: 'paragraph', order: 5, text: '6 caras, 12 aristas, 8 vértices.' },

    { type: 'heading', order: 6, level: 2, text: 'Volumen' },
    { type: 'paragraph', order: 7, text: 'El volumen mide el espacio que ocupa un cuerpo, en unidades cúbicas (cm³, m³).' },

    { type: 'heading', order: 8, level: 2, text: 'Volumen de un prisma' },
    { type: 'formula', order: 9, latex: 'V = A_{\\text{base}} \\cdot h' },

    { type: 'heading', order: 10, level: 2, text: 'Prisma rectangular' },
    { type: 'formula', order: 11, latex: 'V = l \\cdot a \\cdot h' },
    { type: 'paragraph', order: 12, text: 'Ejemplo: l = 5, a = 3, h = 4.' },
    { type: 'formula', order: 13, latex: 'V = 5 \\cdot 3 \\cdot 4 = 60' },

    { type: 'heading', order: 14, level: 2, text: 'Cubo' },
    { type: 'formula', order: 15, latex: 'V = a^3 \\qquad A_{\\text{total}} = 6a^2' },

    { type: 'heading', order: 16, level: 2, text: 'Cilindro' },
    { type: 'formula', order: 17, latex: 'V = \\pi r^2 h' },
    { type: 'paragraph', order: 18, text: 'Ejemplo: r = 3, h = 5.' },
    { type: 'formula', order: 19, latex: 'V = \\pi (3)^2 (5) = 45\\pi' },

    { type: 'heading', order: 20, level: 2, text: 'Área total de un prisma rectangular' },
    { type: 'formula', order: 21, latex: 'A_T = 2(la + lh + ah)' },

    { type: 'heading', order: 22, level: 2, text: 'Capacidad y volumen' },
    { type: 'paragraph', order: 23, text: 'Relación entre unidades de volumen y capacidad:' },
    { type: 'formula', order: 24, latex: '1 \\text{ cm}^3 = 1 \\text{ mL} \\qquad 1000 \\text{ cm}^3 = 1 \\text{ L}' },

    { type: 'heading', order: 25, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 26,
      text: 'Antes de calcular: identifica el cuerpo, distingue área de volumen, revisa qué medidas conoces, elige la fórmula correcta y convierte unidades si es necesario. La confusión más común es mezclar unidades cuadradas (área) con unidades cúbicas (volumen).',
    },
  ],
  questions: [
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuántas caras tiene un cubo?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Un cubo tiene 6 caras cuadradas.' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un prisma rectangular mide 5 cm × 3 cm × 4 cm. ¿Cuál es su volumen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '20 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '60 cm³' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '75 cm³' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'V = 5 \\cdot 3 \\cdot 4 = 60' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un cubo tiene arista de 4 cm. ¿Cuál es su volumen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '16 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '48 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '64 cm³' }, correct: true },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'V = 4^3 = 64' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un prisma tiene área basal de 18 cm² y altura 7 cm. ¿Cuál es su volumen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '25 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '90 cm³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '126 cm³' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '138 cm³' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'V = 18 \\cdot 7 = 126' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un cilindro tiene radio 3 cm y altura 8 cm. ¿Cuál es su volumen?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '24\\pi \\text{ cm}^3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '48\\pi \\text{ cm}^3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '72\\pi \\text{ cm}^3' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '144\\pi \\text{ cm}^3' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'V = \\pi (3)^2 (8) = 72\\pi' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un cubo tiene arista de 5 cm. ¿Cuál es su área total?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '25 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '100 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '125 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '150 cm²' }, correct: true },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'A_T = 6 \\cdot 5^2 = 6 \\cdot 25 = 150' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Una caja rectangular mide 10 cm × 6 cm × 4 cm. ¿Cuál es su área total?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '124 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '188 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '248 cm²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '240 cm²' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'A_T = 2(10 \\cdot 6 + 10 \\cdot 4 + 6 \\cdot 4)' },
        { type: 'formula', order: 1, latex: 'A_T = 2(60 + 40 + 24) = 2(124) = 248' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un envase tiene una capacidad de 2500 cm³. ¿A cuántos litros equivale?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,25 L' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2,5 L' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '25 L' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '250 L' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '2500 \\text{ cm}^3 = 2,5 \\text{ L}' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Una piscina mide 8 m de largo, 5 m de ancho y 1,5 m de profundidad. ¿Cuál es su volumen?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '13,5 m³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40 m³' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '60 m³' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '90 m³' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'V = 8 \\cdot 5 \\cdot 1,5 = 60' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un cilindro tiene un volumen de 200π cm³ y un radio de 5 cm. ¿Cuál es su altura?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '200\\pi = \\pi (5)^2 h' },
        { type: 'formula', order: 1, latex: '200 = 25h' },
        { type: 'formula', order: 2, latex: 'h = 8' },
      ],
    },
  ],
};

export default cuerposGeometricos;
