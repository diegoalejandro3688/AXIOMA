// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 1. Contenido
// editorial APROBADO externamente. Ver cabecera de
// content/estudio/m1-numeros/enteros-racionales.ts (CONTENT-4.3) para el
// criterio de ajustes técnicos (contentBlocks, LaTeX, questionKey sin
// padding) -- mismo patrón, sin excepciones.
import type { ResourceContentModule } from '../../schema';

const expresionesAlgebraicas: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 1,
  title: 'Expresiones algebraicas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá interpretar, representar, reducir y operar expresiones algebraicas, aplicando correctamente propiedades de las operaciones y utilizando lenguaje algebraico para modelar situaciones simples.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Expresiones algebraicas' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué es una expresión algebraica?' },
    { type: 'paragraph', order: 2, text: 'Una expresión algebraica combina números, letras y operaciones. Las letras representan valores que pueden variar.' },
    { type: 'formula', order: 3, latex: '3x + 5' },
    {
      type: 'paragraph',
      order: 4,
      text: 'Aquí: 3 es el coeficiente; x es la variable; 5 es un término constante.',
    },

    { type: 'heading', order: 5, level: 2, text: 'Términos semejantes' },
    { type: 'paragraph', order: 6, text: 'Dos términos son semejantes cuando tienen la misma parte literal. 3x y 5x son semejantes; 3x y 3x² no lo son.' },
    { type: 'paragraph', order: 7, text: 'Los términos semejantes pueden sumarse o restarse:' },
    { type: 'formula', order: 8, latex: '3x + 5x = 8x \\qquad 7a - 2a = 5a' },

    { type: 'heading', order: 9, level: 2, text: 'Reducción de términos semejantes' },
    { type: 'formula', order: 10, latex: '4x + 3 + 2x - 5' },
    { type: 'paragraph', order: 11, text: 'Agrupamos:' },
    { type: 'formula', order: 12, latex: '4x + 2x + 3 - 5' },
    { type: 'paragraph', order: 13, text: 'Entonces:' },
    { type: 'formula', order: 14, latex: '6x - 2' },

    { type: 'heading', order: 15, level: 2, text: 'Propiedad distributiva' },
    { type: 'formula', order: 16, latex: 'a(b+c) = ab + ac' },
    { type: 'paragraph', order: 17, text: 'Ejemplo:' },
    { type: 'formula', order: 18, latex: '3(x+4) = 3x + 12 \\qquad 2(x-5) = 2x - 10' },

    { type: 'heading', order: 19, level: 2, text: 'Distributiva con signo negativo' },
    { type: 'formula', order: 20, latex: '-(x+3) = -x - 3 \\qquad -2(x-4) = -2x + 8' },
    { type: 'paragraph', order: 21, text: 'El signo afecta a todos los términos del paréntesis.' },

    { type: 'heading', order: 22, level: 2, text: 'Multiplicación de expresiones simples' },
    { type: 'formula', order: 23, latex: '3x \\cdot 2x = 6x^2 \\qquad -2a \\cdot 4b = -8ab' },

    { type: 'heading', order: 24, level: 2, text: 'Evaluar una expresión' },
    { type: 'paragraph', order: 25, text: 'Si:' },
    { type: 'formula', order: 26, latex: '2x + 3' },
    { type: 'paragraph', order: 27, text: 'y x = 4:' },
    { type: 'formula', order: 28, latex: '2(4) + 3 = 11' },

    { type: 'heading', order: 29, level: 2, text: 'Traducir lenguaje cotidiano' },
    { type: 'paragraph', order: 30, text: '"El doble de un número más 5":' },
    { type: 'formula', order: 31, latex: '2x + 5' },
    { type: 'paragraph', order: 32, text: '"El triple de la diferencia entre un número y 4":' },
    { type: 'formula', order: 33, latex: '3(x-4)' },

    { type: 'heading', order: 34, level: 2, text: 'Área y perímetro mediante expresiones' },
    { type: 'paragraph', order: 35, text: 'Si un rectángulo tiene lados x y x+3:' },
    { type: 'formula', order: 36, latex: 'P = 2x + 2(x+3) = 4x + 6' },

    { type: 'heading', order: 37, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 38,
      text: 'Antes de operar: identifica términos semejantes, revisa signos, resuelve paréntesis, aplica distributiva y reduce la expresión.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de los siguientes términos es semejante a 5x?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '5x^2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '2x' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '5y' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Los términos semejantes tienen la misma parte literal. Tanto 5x como 2x contienen x elevado a 1.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es la expresión reducida de la siguiente suma?' },
        { type: 'formula', order: 1, latex: '3x + 4x' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '7x' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '12x' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '7x^2' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '3x + 4x = (3+4)x = 7x' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál expresión representa "el doble de un número más 7"?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '2(x+7)' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x+14' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '2x+7' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '7x+2' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Si el número es x, su doble es 2x. Luego se suman 7 unidades:' },
        { type: 'formula', order: 1, latex: '2x+7' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Reduce la siguiente expresión:' },
        { type: 'formula', order: 1, latex: '5x+3-2x+7' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '3x+10' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '7x+10' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '3x+4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '7x+4' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '5x-2x=3x \\qquad 3+7=10' },
        { type: 'paragraph', order: 1, text: 'Resultado:' },
        { type: 'formula', order: 2, latex: '3x+10' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el resultado de aplicar distributiva en la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '4(2x-3)' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '8x-3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '8x-12' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '6x-12' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '8x+12' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '4(2x-3)=8x-12' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Simplifica la siguiente expresión:' },
        { type: 'formula', order: 1, latex: '3(x+2)-2x' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'x+2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'x+6' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '5x+2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '5x+6' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '3(x+2)=3x+6' },
        { type: 'formula', order: 1, latex: '3x+6-2x=x+6' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Si x = -2, ¿cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: 'x^2+3x-1' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-11' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '(-2)^2+3(-2)-1 = 4-6-1 = -3' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es la expresión equivalente a la siguiente?' },
        { type: 'formula', order: 1, latex: '-2(3x-4)+x' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '-5x+8' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '-7x+8' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '-5x-8' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '7x-8' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '-2(3x-4)=-6x+8' },
        { type: 'formula', order: 1, latex: '-6x+8+x=-5x+8' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un rectángulo tiene ancho x y largo 2x+3. ¿Cuál es una expresión simplificada para su perímetro?',
        },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '3x+3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '4x+6' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '6x+3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '6x+6' }, correct: true },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'P=2x+2(2x+3)' },
        { type: 'formula', order: 1, latex: '=2x+4x+6' },
        { type: 'formula', order: 2, latex: '=6x+6' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál expresión es equivalente a la siguiente?' },
        { type: 'formula', order: 1, latex: '2(3x-1)-3(x+4)+5' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '3x-9' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '3x-7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '9x-9' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '9x-7' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '6x-2-3x-12+5' },
        { type: 'formula', order: 1, latex: '6x-3x=3x \\qquad -2-12+5=-9' },
        { type: 'paragraph', order: 2, text: 'Resultado:' },
        { type: 'formula', order: 3, latex: '3x-9' },
      ],
    },
  ],
};

export default expresionesAlgebraicas;
