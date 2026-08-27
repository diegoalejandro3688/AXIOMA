// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 5. Contenido
// editorial APROBADO externamente.
import type { ResourceContentModule } from '../../schema';

const funcionLinealAfin: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 5,
  title: 'Función lineal y afín',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer, representar e interpretar funciones lineales y afines, identificar pendiente e intercepto, analizar su comportamiento y resolver problemas contextualizados mediante modelos de la forma y=mx y y=mx+b.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Función lineal y afín' },

    { type: 'heading', order: 1, level: 2, text: 'Función' },
    { type: 'formula', order: 2, latex: 'y=2x' },
    { type: 'paragraph', order: 3, text: 'Si x = 3:' },
    { type: 'formula', order: 4, latex: 'y=6' },

    { type: 'heading', order: 5, level: 2, text: 'Función lineal' },
    { type: 'formula', order: 6, latex: 'y=mx' },
    { type: 'paragraph', order: 7, text: 'Su gráfica es una recta que pasa por (0,0).' },

    { type: 'heading', order: 8, level: 2, text: 'Función afín' },
    { type: 'formula', order: 9, latex: 'y=mx+b' },
    { type: 'paragraph', order: 10, text: 'm es la pendiente, b es el intercepto con el eje y. Ejemplo:' },
    { type: 'formula', order: 11, latex: 'y=2x+5' },
    { type: 'paragraph', order: 12, text: 'corta el eje y en (0,5).' },

    { type: 'heading', order: 13, level: 2, text: 'Pendiente' },
    { type: 'formula', order: 14, latex: 'm=\\dfrac{y_2-y_1}{x_2-x_1}' },
    { type: 'paragraph', order: 15, text: 'Para (1,3) y (3,7):' },
    { type: 'formula', order: 16, latex: 'm=\\dfrac{7-3}{3-1}=2' },

    { type: 'heading', order: 17, level: 2, text: 'Interpretación' },
    { type: 'paragraph', order: 18, text: 'm > 0: creciente. m < 0: decreciente. m = 0: constante.' },

    { type: 'heading', order: 19, level: 2, text: 'Construcción con m y b' },
    { type: 'paragraph', order: 20, text: 'm = 4, b = -2:' },
    { type: 'formula', order: 21, latex: 'y=4x-2' },

    { type: 'heading', order: 22, level: 2, text: 'Desde dos puntos' },
    { type: 'paragraph', order: 23, text: 'Puntos (1,5), (3,9):' },
    { type: 'formula', order: 24, latex: 'm=\\dfrac{9-5}{3-1}=2' },
    { type: 'formula', order: 25, latex: 'y=2x+b' },
    { type: 'formula', order: 26, latex: '5=2+b \\qquad b=3' },
    { type: 'formula', order: 27, latex: 'y=2x+3' },

    { type: 'heading', order: 28, level: 2, text: 'Tabla' },
    { type: 'formula', order: 29, latex: 'x: 0,1,2,3 \\qquad y: 2,5,8,11' },
    { type: 'formula', order: 30, latex: 'm=3 \\qquad b=2' },
    { type: 'formula', order: 31, latex: 'y=3x+2' },

    { type: 'heading', order: 32, level: 2, text: 'Modelación' },
    { type: 'paragraph', order: 33, text: 'Servicio: $2.000 fijos + $800/km' },
    { type: 'formula', order: 34, latex: 'y=800x+2000' },

    { type: 'heading', order: 35, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 36,
      text: 'Analiza: pendiente, crecimiento/decrecimiento, valor de y cuando x=0, significado contextual de m y b, y si es lineal (b=0) o afín (b≠0).',
    },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál función es lineal?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: 'y=3x' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'y=3x+2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=x^2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=3' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'Una función lineal tiene forma y=mx y pasa por el origen.' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En la siguiente función, ¿cuál es la pendiente?' },
        { type: 'formula', order: 1, latex: 'y=4x-7' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-7' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'La pendiente es el coeficiente de x:' },
        { type: 'formula', order: 1, latex: 'm=4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el intercepto con el eje y de la siguiente función?' },
        { type: 'formula', order: 1, latex: 'y=-2x+5' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Cuando x = 0:' },
        { type: 'formula', order: 1, latex: 'y=5' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'formula', order: 0, latex: 'f(x)=3x+2' },
        { type: 'paragraph', order: 1, text: '¿Cuánto vale f(4)?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'f(4)=3(4)+2=14' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Pendiente de la recta que pasa por (2,5) y (6,13):' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'm=\\dfrac{13-5}{6-2}=\\dfrac{8}{4}=2' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál función es decreciente?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: 'y=5x+1' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=2x-7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=-3x+4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'y=\\dfrac{1}{2}x+6' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'm=-3<0' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Tabla:' },
        { type: 'formula', order: 1, latex: 'x: 0,1,2,3 \\qquad y: 4,7,10,13' },
        { type: 'paragraph', order: 2, text: '¿Cuál expresión corresponde?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'y=3x' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=3x+4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'y=4x+3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=7x-3' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'm=3 \\qquad y(0)=4' },
        { type: 'formula', order: 1, latex: 'y=3x+4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Recta por (1,4) y (3,10). ¿Cuál ecuación corresponde?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'y=2x+2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=3x+1' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'y=3x-1' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'y=4x' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'm=\\dfrac{10-4}{3-1}=3' },
        { type: 'formula', order: 1, latex: '4=3+b \\qquad b=1' },
        { type: 'formula', order: 2, latex: 'y=3x+1' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un estacionamiento cobra $1.500 fijo más $700 por hora. ¿Cuál función representa C(h)?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'C(h)=1500h+700' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'C(h)=700h' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'C(h)=700h+1500' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'C(h)=2200h' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'C(h)=700h+1500' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Servicios:' },
        { type: 'formula', order: 1, latex: 'A(x)=500x+3000 \\qquad B(x)=800x+1500' },
        { type: 'paragraph', order: 2, text: '¿Para cuántos kilómetros tienen el mismo costo?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '500x+3000=800x+1500' },
        { type: 'formula', order: 1, latex: '1500=300x' },
        { type: 'formula', order: 2, latex: 'x=5' },
      ],
    },
  ],
};

export default funcionLinealAfin;
