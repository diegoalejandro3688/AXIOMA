// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 4. Contenido
// editorial APROBADO externamente.
import type { ResourceContentModule } from '../../schema';

const sistemas2x2: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 4,
  title: 'Sistemas de ecuaciones lineales (2x2)',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá representar y resolver sistemas de dos ecuaciones lineales con dos incógnitas, interpretar sus soluciones y utilizarlas para modelar situaciones problemáticas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Sistemas de ecuaciones lineales (2x2)' },

    { type: 'heading', order: 1, level: 2, text: 'Sistema' },
    { type: 'paragraph', order: 2, text: 'Ejemplo:' },
    { type: 'formula', order: 3, latex: '\\begin{cases} x+y=10 \\\\ x-y=2 \\end{cases}' },
    { type: 'paragraph', order: 4, text: 'Resolver significa hallar x e y que satisfacen ambas.' },

    { type: 'heading', order: 5, level: 2, text: 'Solución' },
    { type: 'paragraph', order: 6, text: 'x = 6, y = 4:' },
    { type: 'formula', order: 7, latex: '6+4=10 \\qquad 6-4=2' },
    { type: 'paragraph', order: 8, text: 'Solución: (6,4)' },

    { type: 'heading', order: 9, level: 2, text: 'Sustitución' },
    { type: 'formula', order: 10, latex: '\\begin{cases} x+y=9 \\\\ x=2y \\end{cases}' },
    { type: 'formula', order: 11, latex: '2y+y=9 \\qquad y=3 \\qquad x=6' },

    { type: 'heading', order: 12, level: 2, text: 'Eliminación' },
    { type: 'formula', order: 13, latex: '\\begin{cases} x+y=11 \\\\ x-y=3 \\end{cases}' },
    { type: 'paragraph', order: 14, text: 'Sumamos:' },
    { type: 'formula', order: 15, latex: '2x=14 \\qquad x=7 \\qquad y=4' },

    { type: 'heading', order: 16, level: 2, text: 'Multiplicar una ecuación' },
    { type: 'formula', order: 17, latex: '\\begin{cases} 2x+y=7 \\\\ x+2y=8 \\end{cases}' },
    { type: 'paragraph', order: 18, text: 'Multiplicar la primera por 2 permite eliminar y:' },
    { type: 'formula', order: 19, latex: '4x+2y=14' },
    { type: 'paragraph', order: 20, text: 'Restando la segunda:' },
    { type: 'formula', order: 21, latex: '3x=6 \\qquad x=2 \\qquad y=3' },

    { type: 'heading', order: 22, level: 2, text: 'Comprobación' },
    { type: 'paragraph', order: 23, text: 'Reemplazar x e y en ambas ecuaciones.' },

    { type: 'heading', order: 24, level: 2, text: 'Interpretación gráfica' },
    { type: 'paragraph', order: 25, text: 'Cada ecuación representa una recta. La solución es su punto de intersección.' },

    { type: 'heading', order: 26, level: 2, text: 'Sin solución' },
    { type: 'formula', order: 27, latex: '\\begin{cases} x+y=4 \\\\ x+y=7 \\end{cases}' },
    { type: 'paragraph', order: 28, text: 'Rectas paralelas distintas.' },

    { type: 'heading', order: 29, level: 2, text: 'Infinitas soluciones' },
    { type: 'formula', order: 30, latex: '\\begin{cases} x+y=5 \\\\ 2x+2y=10 \\end{cases}' },
    { type: 'paragraph', order: 31, text: 'Ambas representan la misma recta.' },

    { type: 'heading', order: 32, level: 2, text: 'Modelación' },
    { type: 'paragraph', order: 33, text: 'Dos incógnitas más dos condiciones permiten construir un sistema.' },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál par satisface el siguiente sistema?' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x+y=7 \\\\ x-y=1 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3,4)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4,3)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(5,2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(6,1)' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '4+3=7 \\qquad 4-3=1' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuánto vale y en el siguiente sistema?' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x+y=12 \\\\ x=5 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '17' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '5+y=12' },
        { type: 'formula', order: 1, latex: 'y=7' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve el siguiente sistema:' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x+y=8 \\\\ x-y=2 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3,5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4,4)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(5,3)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(6,2)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '2x=10' },
        { type: 'formula', order: 1, latex: 'x=5 \\qquad y=3' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve el siguiente sistema:' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x+y=11 \\\\ 2x-y=7 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(4,7)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(5,6)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(6,5)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(7,4)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '3x=18' },
        { type: 'formula', order: 1, latex: 'x=6 \\qquad y=5' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve el siguiente sistema:' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x=2y+1 \\\\ x+y=10 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(5,5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(6,4)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(7,3)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(8,2)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '2y+1+y=10' },
        { type: 'formula', order: 1, latex: '3y=9 \\qquad y=3 \\qquad x=7' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Resuelve el siguiente sistema:' },
        { type: 'formula', order: 1, latex: '\\begin{cases} 2x+y=9 \\\\ x-y=3 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(3,3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4,1)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(5,-1)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(6,-3)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '3x=12' },
        { type: 'formula', order: 1, latex: 'x=4 \\qquad y=1' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Qué tipo de solución tiene el siguiente sistema?' },
        { type: 'formula', order: 1, latex: '\\begin{cases} x+y=5 \\\\ 2x+2y=10 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'única solución' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'ninguna' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'infinitas' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'exactamente dos' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La segunda ecuación es el doble de la primera. Ambas representan la misma recta.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Qué tipo de solución tiene el siguiente sistema?' },
        { type: 'formula', order: 1, latex: '\\begin{cases} 2x+y=4 \\\\ 2x+y=9 \\end{cases}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'única' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'ninguna' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'infinitas' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(0,0)' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: '2x+y no puede valer simultáneamente 4 y 9. Las rectas son paralelas distintas.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Se vendieron 30 entradas entre adultos y estudiantes. Adulto: $5.000. Estudiante: $3.000. Recaudación total: $126.000. ¿Cuántas entradas de adulto se vendieron?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '15' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '21' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'a+e=30' },
        { type: 'formula', order: 1, latex: '5000a+3000e=126000' },
        { type: 'formula', order: 2, latex: 'e=30-a' },
        { type: 'formula', order: 3, latex: '5000a+3000(30-a)=126000' },
        { type: 'formula', order: 4, latex: '2000a=36000' },
        { type: 'formula', order: 5, latex: 'a=18' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En una granja hay gallinas y conejos. 26 animales. 74 patas. ¿Cuántos conejos hay?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '11' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '13' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'g+c=26' },
        { type: 'formula', order: 1, latex: '2g+4c=74' },
        { type: 'formula', order: 2, latex: '2g+2c=52' },
        { type: 'paragraph', order: 3, text: 'Restando:' },
        { type: 'formula', order: 4, latex: '2c=22' },
        { type: 'formula', order: 5, latex: 'c=11' },
      ],
    },
  ],
};

export default sistemas2x2;
