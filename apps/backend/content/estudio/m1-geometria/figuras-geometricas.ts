// CONTENT-4.7 -- Golden Unit M1 / Geometría, Recurso 1. Contenido editorial
// APROBADO externamente. Ver cabecera de
// content/estudio/m1-numeros/enteros-racionales.ts (CONTENT-4.3) para el
// criterio de ajustes técnicos (contentBlocks, LaTeX, questionKey sin
// padding) -- mismo patrón, sin excepciones.
import type { ResourceContentModule } from '../../schema';

const figurasGeometricas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS',
  unitCode: 'M1.GEOMETRIA',
  subjectKey: 'matematica',
  order: 1,
  title: 'Figuras geométricas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer y utilizar propiedades de figuras geométricas planas, calcular perímetros y áreas, y resolver problemas que involucren triángulos, cuadriláteros, circunferencias y relaciones métricas básicas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Figuras geométricas' },

    { type: 'heading', order: 1, level: 2, text: 'Perímetro' },
    { type: 'paragraph', order: 2, text: 'El perímetro corresponde a la suma de las longitudes de todos los lados de una figura. Para un rectángulo de largo l y ancho a:' },
    { type: 'formula', order: 3, latex: 'P = 2l + 2a' },
    { type: 'paragraph', order: 4, text: 'Ejemplo: l = 8, a = 5.' },
    { type: 'formula', order: 5, latex: 'P = 2(8) + 2(5) = 26' },

    { type: 'heading', order: 6, level: 2, text: 'Área de un rectángulo y un cuadrado' },
    { type: 'formula', order: 7, latex: '\\text{Rectángulo: } A = \\text{base} \\cdot \\text{altura} \\qquad \\text{Cuadrado: } A = l^2' },
    { type: 'paragraph', order: 8, text: 'Ejemplo: base = 7, altura = 4.' },
    { type: 'formula', order: 9, latex: 'A = 7 \\cdot 4 = 28' },

    { type: 'heading', order: 10, level: 2, text: 'Área de un triángulo' },
    { type: 'formula', order: 11, latex: 'A = \\dfrac{\\text{base} \\cdot \\text{altura}}{2}' },
    { type: 'paragraph', order: 12, text: 'Ejemplo: base = 10 cm, altura = 6 cm.' },
    { type: 'formula', order: 13, latex: 'A = \\dfrac{10 \\cdot 6}{2} = 30 \\text{ cm}^2' },
    { type: 'paragraph', order: 14, text: 'La altura debe ser perpendicular a la base utilizada.' },

    { type: 'heading', order: 15, level: 2, text: 'Tipos de triángulos' },
    {
      type: 'paragraph',
      order: 16,
      text: 'Según sus lados: equilátero (3 lados iguales), isósceles (2 lados iguales), escaleno (todos distintos). Según sus ángulos: acutángulo (todos menores que 90°), rectángulo (uno mide 90°), obtusángulo (uno es mayor que 90°).',
    },

    { type: 'heading', order: 17, level: 2, text: 'Suma de ángulos interiores de un triángulo' },
    { type: 'formula', order: 18, latex: '\\alpha + \\beta + \\gamma = 180°' },
    { type: 'paragraph', order: 19, text: 'Ejemplo: 50° + 60° + γ = 180°.' },
    { type: 'formula', order: 20, latex: '\\gamma = 70°' },

    { type: 'heading', order: 21, level: 2, text: 'Teorema de Pitágoras' },
    { type: 'paragraph', order: 22, text: 'En un triángulo rectángulo:' },
    { type: 'formula', order: 23, latex: 'a^2 + b^2 = c^2' },
    { type: 'paragraph', order: 24, text: 'donde c es la hipotenusa. Ejemplo:' },
    { type: 'formula', order: 25, latex: '3^2 + 4^2 = 9 + 16 = 25 \\qquad c = 5' },

    { type: 'heading', order: 26, level: 2, text: 'Cuadriláteros' },
    {
      type: 'paragraph',
      order: 27,
      text: 'Un cuadrilátero tiene cuatro lados. Ejemplos: cuadrado, rectángulo, rombo, romboide, trapecio. La suma de sus ángulos interiores es:',
    },
    { type: 'formula', order: 28, latex: '360°' },

    { type: 'heading', order: 29, level: 2, text: 'Circunferencia y círculo' },
    { type: 'paragraph', order: 30, text: 'La circunferencia es la línea que rodea al círculo. Longitud:' },
    { type: 'formula', order: 31, latex: 'C = 2\\pi r' },
    { type: 'paragraph', order: 32, text: 'El círculo es la región interior. Área:' },
    { type: 'formula', order: 33, latex: 'A = \\pi r^2' },

    { type: 'heading', order: 34, level: 2, text: 'Figuras compuestas' },
    { type: 'paragraph', order: 35, text: 'Una figura compleja puede dividirse en figuras simples. Ejemplo:' },
    { type: 'formula', order: 36, latex: 'A_{\\text{total}} = A_{\\text{rectángulo}} + A_{\\text{triángulo}}' },
    { type: 'paragraph', order: 37, text: 'También puede ser necesario restar áreas si una sección fue retirada.' },

    { type: 'heading', order: 38, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 39,
      text: 'Antes de calcular: identifica la figura, distingue perímetro de área, revisa qué medidas conoces, determina medidas faltantes, usa la fórmula adecuada y conserva correctamente las unidades. Muchas veces el desafío principal es interpretar la figura y decidir qué información realmente se necesita.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un rectángulo mide 8 cm de largo y 5 cm de ancho. ¿Cuál es su perímetro?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '13 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '26 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '40 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '80 cm' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'P = 2(8) + 2(5) = 16 + 10 = 26' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es el área de un cuadrado cuyo lado mide 6 cm?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '36 cm²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '48 cm²' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'A = 6^2 = 36' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Dos ángulos de un triángulo miden 45° y 65°. ¿Cuánto mide el tercer ángulo?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '60°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '70°' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '80°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '90°' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '180° - 45° - 65° = 70°' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un triángulo tiene base 12 cm y altura 7 cm. ¿Cuál es su área?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '19 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '42 cm²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '84 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '168 cm²' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'A = \\dfrac{12 \\cdot 7}{2} = 42' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un triángulo rectángulo tiene catetos de 6 cm y 8 cm. ¿Cuánto mide su hipotenusa?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '7 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '12 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '6^2 + 8^2 = 36 + 64 = 100' },
        { type: 'formula', order: 1, latex: 'c = \\sqrt{100} = 10' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Tres ángulos interiores de un cuadrilátero miden 80°, 95° y 110°. ¿Cuánto mide el cuarto ángulo?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '65°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '75°' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '85°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '95°' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '360° - (80° + 95° + 110°) = 75°' }],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es el área de un círculo de radio 5 cm?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '5\\pi \\text{ cm}^2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '10\\pi \\text{ cm}^2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '25\\pi \\text{ cm}^2' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '50\\pi \\text{ cm}^2' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'A = \\pi r^2' },
        { type: 'formula', order: 1, latex: 'A = \\pi (5)^2 = 25\\pi' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un rectángulo tiene un área de 54 cm² y uno de sus lados mide 6 cm. ¿Cuánto mide el otro lado?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '7 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '54 = 6x' },
        { type: 'formula', order: 1, latex: 'x = 9' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una figura está formada por un rectángulo de 10 cm de largo y 6 cm de ancho, al cual se le recorta un cuadrado de lado 3 cm. ¿Cuál es el área restante?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '42 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '48 cm²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '51 cm²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '57 cm²' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Área del rectángulo:' },
        { type: 'formula', order: 1, latex: '10 \\cdot 6 = 60' },
        { type: 'paragraph', order: 2, text: 'Área retirada:' },
        { type: 'formula', order: 3, latex: '3^2 = 9' },
        { type: 'paragraph', order: 4, text: 'Área restante:' },
        { type: 'formula', order: 5, latex: '60 - 9 = 51' },
      ],
    },
    {
      questionKey: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un terreno rectangular tiene un largo de 15 m y una diagonal de 17 m. ¿Cuál es el área del terreno?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '90 m²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '105 m²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '120 m²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '255 m²' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '15^2 + x^2 = 17^2' },
        { type: 'formula', order: 1, latex: '225 + x^2 = 289' },
        { type: 'formula', order: 2, latex: 'x^2 = 64 \\qquad x = 8' },
        { type: 'formula', order: 3, latex: 'A = 15 \\cdot 8 = 120' },
      ],
    },
  ],
};

export default figurasGeometricas;
