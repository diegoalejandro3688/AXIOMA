// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 3. Contenido
// editorial APROBADO externamente.
import type { ResourceContentModule } from '../../schema';

const ecuacionesInecuaciones: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 3,
  title: 'Ecuaciones e inecuaciones de primer grado',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá plantear y resolver ecuaciones e inecuaciones de primer grado con una incógnita, interpretar sus soluciones y utilizarlas para modelar problemas en distintos contextos.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Ecuaciones e inecuaciones de primer grado' },

    { type: 'heading', order: 1, level: 2, text: 'Ecuación' },
    { type: 'paragraph', order: 2, text: 'Una ecuación es una igualdad con una incógnita.' },
    { type: 'formula', order: 3, latex: 'x+5=12' },
    { type: 'paragraph', order: 4, text: 'Solución:' },
    { type: 'formula', order: 5, latex: 'x=7' },

    { type: 'heading', order: 6, level: 2, text: 'Mantener el equilibrio' },
    { type: 'paragraph', order: 7, text: 'Si hacemos una operación en un miembro, realizamos la misma en el otro.' },
    { type: 'formula', order: 8, latex: 'x+4=10 \\qquad x=6' },

    { type: 'heading', order: 9, level: 2, text: 'Multiplicación o división' },
    { type: 'formula', order: 10, latex: '3x=18 \\qquad x=6' },
    { type: 'formula', order: 11, latex: '\\dfrac{x}{4}=5 \\qquad x=20' },

    { type: 'heading', order: 12, level: 2, text: 'Varios pasos' },
    { type: 'formula', order: 13, latex: '3x+5=20' },
    { type: 'formula', order: 14, latex: '3x=15' },
    { type: 'formula', order: 15, latex: 'x=5' },

    { type: 'heading', order: 16, level: 2, text: 'Variable en ambos lados' },
    { type: 'formula', order: 17, latex: '5x-2=2x+10' },
    { type: 'formula', order: 18, latex: '3x-2=10' },
    { type: 'formula', order: 19, latex: '3x=12' },
    { type: 'formula', order: 20, latex: 'x=4' },

    { type: 'heading', order: 21, level: 2, text: 'Paréntesis' },
    { type: 'formula', order: 22, latex: '2(x+3)=14' },
    { type: 'formula', order: 23, latex: '2x+6=14' },
    { type: 'formula', order: 24, latex: 'x=4' },

    { type: 'heading', order: 25, level: 2, text: 'Inecuación' },
    { type: 'formula', order: 26, latex: 'x+2<7' },
    { type: 'formula', order: 27, latex: 'x<5' },

    { type: 'heading', order: 28, level: 2, text: 'Operaciones' },
    {
      type: 'paragraph',
      order: 29,
      text: 'Podemos sumar/restar lo mismo en ambos lados. Multiplicar/dividir por un número positivo conserva el sentido.',
    },

    { type: 'heading', order: 30, level: 2, text: 'Número negativo' },
    { type: 'formula', order: 31, latex: '-2x<8' },
    { type: 'paragraph', order: 32, text: 'Al dividir por -2:' },
    { type: 'formula', order: 33, latex: 'x>-4' },
    { type: 'paragraph', order: 34, text: 'Debe invertirse el signo.' },

    { type: 'heading', order: 35, level: 2, text: 'Modelación' },
    { type: 'paragraph', order: 36, text: '"El triple de un número más 4 es 19":' },
    { type: 'formula', order: 37, latex: '3x+4=19' },
    { type: 'paragraph', order: 38, text: '"El triple de un número más 4 es como máximo 19":' },
    { type: 'formula', order: 39, latex: '3x+4 \\leq 19' },
    { type: 'paragraph', order: 40, text: '"Como máximo" corresponde a ≤. "Al menos" corresponde a ≥.' },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente ecuación:' },
        { type: 'formula', order: 1, latex: 'x+7=15' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '22' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '105' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'x=15-7=8' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente ecuación:' },
        { type: 'formula', order: 1, latex: '4x=28' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '24' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '32' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'x=28/4=7' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Qué representa "un número aumentado en 5 es menor que 12"?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: 'x+5=12' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x+5>12' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x+5<12' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '5x<12' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '"Aumentado en 5" es x+5 y "menor que" corresponde a <.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente ecuación:' },
        { type: 'formula', order: 1, latex: '3x-4=17' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '13' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '21' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '3x=21' },
        { type: 'formula', order: 1, latex: 'x=7' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente ecuación:' },
        { type: 'formula', order: 1, latex: '5x+2=3x+14' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '2x+2=14' },
        { type: 'formula', order: 1, latex: '2x=12' },
        { type: 'formula', order: 2, latex: 'x=6' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente ecuación:' },
        { type: 'formula', order: 1, latex: '3(x-2)=15' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '3x-6=15' },
        { type: 'formula', order: 1, latex: '3x=21' },
        { type: 'formula', order: 2, latex: 'x=7' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente inecuación:' },
        { type: 'formula', order: 1, latex: '2x+3 \\leq 11' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'x \\leq 4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'x \\geq 4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x \\leq 7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x \\geq 7' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '2x \\leq 8' },
        { type: 'formula', order: 1, latex: 'x \\leq 4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve la siguiente inecuación:' },
        { type: 'formula', order: 1, latex: '-3x>12' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'x>-4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x<-4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'x>4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x<4' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al dividir por -3 se invierte el signo:' },
        { type: 'formula', order: 1, latex: 'x<-4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La edad de Martín dentro de 4 años será el doble de la edad que tenía hace 5 años. ¿Cuál es su edad actual?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '16' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'x+4=2(x-5)' },
        { type: 'formula', order: 1, latex: 'x+4=2x-10' },
        { type: 'formula', order: 2, latex: 'x=14' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una empresa cobra $4.000 de cargo fijo más $1.500 por hora. Una persona dispone como máximo de $13.000. ¿Cuántas horas completas puede contratar como máximo?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '4000+1500h \\leq 13000' },
        { type: 'formula', order: 1, latex: '1500h \\leq 9000' },
        { type: 'formula', order: 2, latex: 'h \\leq 6' },
      ],
    },
  ],
};

export default ecuacionesInecuaciones;
