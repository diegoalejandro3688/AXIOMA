// CONTENT-4.3 -- Golden Unit M1 / Números, Recurso 3. Contenido editorial
// APROBADO externamente. Ver cabecera de enteros-racionales.ts para el
// criterio de ajustes técnicos (contentBlocks, LaTeX, questionKey sin
// padding).
import type { ResourceContentModule } from '../../schema';

const potenciasRaices: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.NUMEROS.POTENCIAS_RAICES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.NUMEROS.POTENCIAS_RAICES',
  unitCode: 'M1.NUMEROS',
  subjectKey: 'matematica',
  order: 3,
  title: 'Potencias y raíces enésimas',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá comprender y aplicar las propiedades de las potencias de base racional y exponente racional, trabajar con raíces enésimas en los números reales y utilizar ambas herramientas para simplificar expresiones y resolver problemas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Potencias y raíces enésimas' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué es una potencia?' },
    { type: 'paragraph', order: 2, text: 'Una potencia representa una multiplicación repetida: a^n, donde a es la base y n es el exponente.' },
    { type: 'formula', order: 3, latex: 'a^n' },
    { type: 'paragraph', order: 4, text: 'Ejemplo:' },
    { type: 'formula', order: 5, latex: '2^4 = 16' },

    { type: 'heading', order: 6, level: 2, text: 'Signo de una potencia' },
    { type: 'paragraph', order: 7, text: 'Si la base negativa tiene exponente par:' },
    { type: 'formula', order: 8, latex: '(-2)^4 = 16' },
    { type: 'paragraph', order: 9, text: 'Si tiene exponente impar:' },
    { type: 'formula', order: 10, latex: '(-2)^3 = -8' },
    { type: 'paragraph', order: 11, text: 'Es importante distinguir:' },
    { type: 'formula', order: 12, latex: '(-2)^2 = 4' },
    { type: 'paragraph', order: 13, text: 'de:' },
    { type: 'formula', order: 14, latex: '-2^2 = -4' },

    { type: 'heading', order: 15, level: 2, text: 'Producto de potencias de igual base' },
    { type: 'formula', order: 16, latex: 'a^m \\cdot a^n = a^{m+n}' },
    { type: 'paragraph', order: 17, text: 'Ejemplo:' },
    { type: 'formula', order: 18, latex: '3^2 \\cdot 3^4 = 3^6' },

    { type: 'heading', order: 19, level: 2, text: 'Cociente de potencias de igual base' },
    { type: 'formula', order: 20, latex: '\\dfrac{a^m}{a^n} = a^{m-n} \\qquad (a \\neq 0)' },
    { type: 'paragraph', order: 21, text: 'Ejemplo:' },
    { type: 'formula', order: 22, latex: '\\dfrac{5^7}{5^3} = 5^4' },

    { type: 'heading', order: 23, level: 2, text: 'Potencia de una potencia' },
    { type: 'formula', order: 24, latex: '(a^m)^n = a^{mn}' },
    { type: 'paragraph', order: 25, text: 'Ejemplo:' },
    { type: 'formula', order: 26, latex: '(2^3)^4 = 2^{12}' },

    { type: 'heading', order: 27, level: 2, text: 'Exponente negativo' },
    { type: 'formula', order: 28, latex: 'a^{-n} = \\dfrac{1}{a^n}' },
    { type: 'paragraph', order: 29, text: 'Ejemplo:' },
    { type: 'formula', order: 30, latex: '2^{-3} = \\dfrac{1}{8}' },
    { type: 'paragraph', order: 31, text: 'También:' },
    { type: 'formula', order: 32, latex: '\\left(\\dfrac{2}{3}\\right)^{-2} = \\left(\\dfrac{3}{2}\\right)^2 = \\dfrac{9}{4}' },

    { type: 'heading', order: 33, level: 2, text: 'Raíz enésima' },
    { type: 'formula', order: 34, latex: '\\sqrt[3]{8} = 2' },
    { type: 'paragraph', order: 35, text: 'porque:' },
    { type: 'formula', order: 36, latex: '2^3 = 8' },
    { type: 'paragraph', order: 37, text: 'También:' },
    { type: 'formula', order: 38, latex: '\\sqrt[4]{16} = 2' },

    { type: 'heading', order: 39, level: 2, text: 'Raíces pares e impares' },
    {
      type: 'paragraph',
      order: 40,
      text: 'En los números reales, una raíz de índice par de un número negativo no está definida. Por ejemplo:',
    },
    { type: 'formula', order: 41, latex: '\\sqrt{-9}' },
    { type: 'paragraph', order: 42, text: 'no es un número real. En cambio:' },
    { type: 'formula', order: 43, latex: '\\sqrt[3]{-8} = -2' },

    { type: 'heading', order: 44, level: 2, text: 'Simplificación de raíces' },
    { type: 'formula', order: 45, latex: '\\sqrt{72} = \\sqrt{36 \\cdot 2} = 6\\sqrt{2}' },
    { type: 'paragraph', order: 46, text: 'También:' },
    { type: 'formula', order: 47, latex: '\\sqrt[3]{54} = \\sqrt[3]{27 \\cdot 2} = 3\\sqrt[3]{2}' },

    { type: 'heading', order: 48, level: 2, text: 'Exponentes racionales' },
    { type: 'formula', order: 49, latex: 'a^{\\frac{1}{n}} = \\sqrt[n]{a}' },
    { type: 'paragraph', order: 50, text: 'y:' },
    { type: 'formula', order: 51, latex: 'a^{\\frac{m}{n}} = \\sqrt[n]{a^m}' },
    { type: 'paragraph', order: 52, text: 'cuando la expresión está definida en los números reales. Ejemplo:' },
    { type: 'formula', order: 53, latex: '16^{\\frac{1}{2}} = 4' },
    { type: 'paragraph', order: 54, text: 'y:' },
    { type: 'formula', order: 55, latex: '27^{\\frac{2}{3}} = \\left(\\sqrt[3]{27}\\right)^2 = 9' },

    { type: 'heading', order: 56, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 57,
      text: 'Antes de resolver una expresión con potencias o raíces, identifica: la base, el exponente, si existen bases iguales, si puedes aplicar una propiedad, y si el radicando contiene una potencia perfecta.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '(-3)^2' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-9' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: true },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '(-3)^2 = (-3)(-3) = 9' }],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál de las siguientes expresiones es equivalente a la siguiente?' },
        { type: 'formula', order: 1, latex: '2^3 \\cdot 2^4' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '2^7' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '2^{12}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '4^7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '2^1' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '2^3 \\cdot 2^4 = 2^{3+4} = 2^7' }],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '\\sqrt[3]{-27}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-9' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '(-3)^3 = -27' },
        { type: 'paragraph', order: 1, text: 'Por lo tanto:' },
        { type: 'formula', order: 2, latex: '\\sqrt[3]{-27} = -3' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el resultado de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '\\dfrac{5^6}{5^2}' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '5^3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '5^4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '5^8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '\\dfrac{5^6}{5^2} = 5^{6-2} = 5^4' }],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '\\left(\\dfrac{2}{3}\\right)^{-2}' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{4}{9}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{4}{9}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{9}{4}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{9}{4}' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\left(\\dfrac{2}{3}\\right)^{-2} = \\left(\\dfrac{3}{2}\\right)^2 = \\dfrac{9}{4}' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál de las siguientes expresiones es equivalente a la siguiente?' },
        { type: 'formula', order: 1, latex: '\\sqrt{48}' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '2\\sqrt{12}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '4\\sqrt{3}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '8\\sqrt{6}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '16\\sqrt{3}' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '48 = 16 \\cdot 3' },
        { type: 'paragraph', order: 1, text: 'Entonces:' },
        { type: 'formula', order: 2, latex: '\\sqrt{48} = 4\\sqrt{3}' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '64^{\\frac{2}{3}}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '16' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '32' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '64^{\\frac{2}{3}} = \\left(\\sqrt[3]{64}\\right)^2 = 4^2 = 16' }],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de las siguientes expresiones no representa un número real?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '\\sqrt[3]{-125}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\sqrt{49}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\sqrt[4]{-16}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\sqrt[5]{-32}' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Una raíz de índice par con radicando negativo no está definida en los números reales.' },
        { type: 'paragraph', order: 1, text: 'En cambio:' },
        { type: 'formula', order: 2, latex: '\\sqrt[3]{-125} = -5' },
        { type: 'paragraph', order: 3, text: 'y:' },
        { type: 'formula', order: 4, latex: '\\sqrt[5]{-32} = -2' },
        { type: 'paragraph', order: 5, text: 'sí son números reales.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '\\dfrac{2^5 \\cdot 2^{-2}}{2^{-1}}' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '16' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '32' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '2^5 \\cdot 2^{-2} = 2^3' },
        { type: 'paragraph', order: 1, text: 'Luego:' },
        { type: 'formula', order: 2, latex: '\\dfrac{2^3}{2^{-1}} = 2^{3-(-1)} = 2^4 = 16' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.POTENCIAS_RAICES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un cubo tiene un volumen de 216 cm³. Si la longitud de cada arista es a, entonces:',
        },
        { type: 'formula', order: 1, latex: 'a^3 = 216' },
        { type: 'paragraph', order: 2, text: '¿Cuánto mide cada arista?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '6 cm' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8 cm' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '72 cm' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: 'a = \\sqrt[3]{216}' },
        { type: 'paragraph', order: 1, text: 'Como:' },
        { type: 'formula', order: 2, latex: '6^3 = 216' },
        { type: 'paragraph', order: 3, text: 'entonces:' },
        { type: 'formula', order: 4, latex: 'a = 6 \\text{ cm}' },
      ],
    },
  ],
};

export default potenciasRaices;
