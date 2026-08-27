// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 6. Contenido
// editorial APROBADO externamente.
import type { ResourceContentModule } from '../../schema';

const funcionCuadratica: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 6,
  title: 'Función cuadrática',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer, representar e interpretar funciones cuadráticas, identificar sus elementos principales y resolver problemas utilizando expresiones de la forma f(x)=ax²+bx+c.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Función cuadrática' },

    { type: 'heading', order: 1, level: 2, text: 'Función cuadrática' },
    { type: 'formula', order: 2, latex: 'f(x)=ax^2+bx+c \\qquad a \\neq 0' },
    { type: 'paragraph', order: 3, text: 'Su gráfica es una parábola.' },

    { type: 'heading', order: 4, level: 2, text: 'Concavidad' },
    { type: 'paragraph', order: 5, text: 'a > 0: abre hacia arriba. a < 0: abre hacia abajo.' },

    { type: 'heading', order: 6, level: 2, text: 'Intercepto con eje y' },
    { type: 'formula', order: 7, latex: 'f(0)=c' },
    { type: 'paragraph', order: 8, text: 'Por tanto: (0,c)' },

    { type: 'heading', order: 9, level: 2, text: 'Ceros o raíces' },
    { type: 'paragraph', order: 10, text: 'Valores de x para los que f(x) = 0. Ejemplo:' },
    { type: 'formula', order: 11, latex: 'x^2-5x+6=0' },
    { type: 'formula', order: 12, latex: '(x-2)(x-3)=0' },
    { type: 'formula', order: 13, latex: 'x=2 \\ \\text{o}\\ x=3' },

    { type: 'heading', order: 14, level: 2, text: 'Factorización' },
    { type: 'formula', order: 15, latex: 'x^2+5x+6 = (x+2)(x+3)' },

    { type: 'heading', order: 16, level: 2, text: 'Vértice' },
    { type: 'formula', order: 17, latex: 'x_v = -\\dfrac{b}{2a}' },
    { type: 'paragraph', order: 18, text: 'Luego se evalúa f(x_v). Ejemplo:' },
    { type: 'formula', order: 19, latex: 'f(x)=x^2-4x+3' },
    { type: 'formula', order: 20, latex: 'x_v=2' },
    { type: 'formula', order: 21, latex: 'f(2)=-1' },
    { type: 'formula', order: 22, latex: 'V=(2,-1)' },

    { type: 'heading', order: 23, level: 2, text: 'Máximo y mínimo' },
    { type: 'paragraph', order: 24, text: 'a > 0: vértice mínimo. a < 0: vértice máximo.' },

    { type: 'heading', order: 25, level: 2, text: 'Eje de simetría' },
    { type: 'formula', order: 26, latex: 'x=-\\dfrac{b}{2a}' },

    { type: 'heading', order: 27, level: 2, text: 'Evaluación' },
    { type: 'formula', order: 28, latex: 'f(x)=x^2-2x+4' },
    { type: 'formula', order: 29, latex: 'f(3)=9-6+4=7' },

    { type: 'heading', order: 30, level: 2, text: 'Modelación' },
    {
      type: 'paragraph',
      order: 31,
      text: 'Las cuadráticas permiten modelar situaciones que primero aumentan y luego disminuyen, o viceversa. Ejemplo:',
    },
    { type: 'formula', order: 32, latex: 'h(t)=-5t^2+20t+2' },
    { type: 'paragraph', order: 33, text: 'Tiene un máximo porque a < 0.' },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál representa una función cuadrática?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: 'f(x)=3x+2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'f(x)=x^2+4x-1' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'f(x)=2/x' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'f(x)=5' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Una cuadrática tiene forma ax²+bx+c con a≠0.' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'formula', order: 0, latex: 'f(x)=-2x^2+3x+1' },
        { type: 'paragraph', order: 1, text: '¿Hacia dónde abre?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'arriba' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'abajo' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'derecha' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'izquierda' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'a=-2<0' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Intercepto con eje y de la siguiente función:' },
        { type: 'formula', order: 1, latex: 'f(x)=2x^2-5x+7' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(0,-5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(0,2)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(0,5)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(0,7)' }, correct: true },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'f(0)=7' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'formula', order: 0, latex: 'f(x)=x^2-2x+5' },
        { type: 'paragraph', order: 1, text: '¿Cuánto vale f(3)?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '9-6+5=8' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuáles son los ceros de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: 'x^2-7x+12' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2 y 6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 y 4' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '-3 y -4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1 y 12' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'x^2-7x+12=(x-3)(x-4)' },
        { type: 'formula', order: 1, latex: 'x=3 \\ \\text{o}\\ x=4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es la coordenada x del vértice de la siguiente función?' },
        { type: 'formula', order: 1, latex: 'f(x)=x^2-6x+5' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'x_v=-\\dfrac{b}{2a}=\\dfrac{6}{2}=3' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el vértice de la siguiente función?' },
        { type: 'formula', order: 1, latex: 'f(x)=x^2-4x+1' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(2,-3)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(2,3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(-2,-3)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(4,1)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'x_v=2' },
        { type: 'formula', order: 1, latex: 'f(2)=4-8+1=-3' },
        { type: 'formula', order: 2, latex: 'V=(2,-3)' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'formula', order: 0, latex: 'f(x)=-x^2+8x-5' },
        { type: 'paragraph', order: 1, text: 'tiene:' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'mínimo' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'máximo' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'ninguno' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'gráfica lineal' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'a=-1<0' },
        { type: 'paragraph', order: 1, text: 'La parábola abre hacia abajo y el vértice es un máximo.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'La altura de un objeto es:' },
        { type: 'formula', order: 1, latex: 'h(t)=-5t^2+20t+3' },
        { type: 'paragraph', order: 2, text: '¿En qué instante alcanza su altura máxima?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '1 s' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2 s' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3 s' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 s' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 't=-\\dfrac{b}{2a}=-\\dfrac{20}{2(-5)}=2' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un terreno rectangular tiene perímetro 40 m. Si un lado mide x, el otro mide 20-x. El área es A(x) = x(20-x). ¿Cuál es el área máxima posible?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '80 m²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '90 m²' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '100 m²' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '200 m²' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'A(x)=-x^2+20x' },
        { type: 'formula', order: 1, latex: 'x_v=-\\dfrac{20}{2(-1)}=10' },
        { type: 'formula', order: 2, latex: 'A(10)=10(10)=100' },
        { type: 'paragraph', order: 3, text: 'Área máxima: 100 m²' },
      ],
    },
  ],
};

export default funcionCuadratica;
