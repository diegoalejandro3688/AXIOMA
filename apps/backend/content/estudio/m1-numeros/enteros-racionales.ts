// CONTENT-4.3 -- Golden Unit M1 / Números, Recurso 1. Contenido editorial
// APROBADO externamente (mini-lección y 10 preguntas) -- este archivo es
// IMPLEMENTACIÓN TÉCNICA, no autoría: el texto no se reescribe, resume ni
// amplía. Los únicos cambios respecto de la fuente aprobada son técnicos
// inevitables: partición del texto en `contentBlocks` (heading/paragraph/
// formula), LaTeX limpio para MathJax, y `questionKey` sin padding de ceros
// (`.Q1`..`.Q10`, no `.Q01`) para seguir la convención real ya vigente en el
// repo (`M1.NUMEROS.PORCENTAJES.Q1`..`Q12` en `prisma/seed.ts`, y `.Q1`..`.Q3`
// en `content/estudio/_content42-test/pipeline-check.ts`).
import type { ResourceContentModule } from '../../schema';

const enterosRacionales: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.NUMEROS.ENTEROS_RACIONALES.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.NUMEROS.ENTEROS_RACIONALES',
  unitCode: 'M1.NUMEROS',
  subjectKey: 'matematica',
  order: 1,
  title: 'Conjunto de los números enteros y racionales',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá comparar, ordenar y operar con números enteros y racionales, utilizando correctamente las reglas de signos, fracciones, decimales y prioridad de operaciones para resolver problemas matemáticos y situaciones contextualizadas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Conjunto de los números enteros y racionales' },

    { type: 'heading', order: 1, level: 2, text: 'Números enteros' },
    { type: 'paragraph', order: 2, text: 'Los números enteros incluyen los números positivos, los negativos y el cero.' },
    { type: 'formula', order: 3, latex: '-5,\\ -2,\\ 0,\\ 3,\\ 12' },
    {
      type: 'paragraph',
      order: 4,
      text: 'En una recta numérica, un número es mayor cuanto más a la derecha se encuentra. Por ejemplo:',
    },
    { type: 'formula', order: 5, latex: '-2 > -7' },
    {
      type: 'paragraph',
      order: 6,
      text: 'Aunque 7 sea mayor que 2 en valor absoluto, -2 está más cerca de cero y se encuentra a la derecha de -7.',
    },
    {
      type: 'paragraph',
      order: 7,
      text: 'Una forma útil de interpretar números negativos es mediante situaciones como temperaturas bajo cero, deudas o posiciones por debajo de un nivel de referencia.',
    },

    { type: 'heading', order: 8, level: 2, text: 'Suma y resta de enteros' },
    {
      type: 'paragraph',
      order: 9,
      text: 'Mismo signo: se suman los valores y se conserva el signo.',
    },
    { type: 'formula', order: 10, latex: '(-4) + (-7) = -11' },
    {
      type: 'paragraph',
      order: 11,
      text: 'Signos diferentes: se restan los valores absolutos y se conserva el signo del número con mayor valor absoluto.',
    },
    { type: 'formula', order: 12, latex: '8 + (-3) = 5 \\qquad 4 + (-9) = -5' },
    { type: 'paragraph', order: 13, text: 'Restar un número equivale a sumar su opuesto.' },
    { type: 'formula', order: 14, latex: '5 - (-3) = 5 + 3 = 8' },
    {
      type: 'paragraph',
      order: 15,
      text: 'Por eso, encontrarse dos signos negativos consecutivos en una resta puede transformar la operación en una suma.',
    },

    { type: 'heading', order: 16, level: 2, text: 'Multiplicación y división: regla de signos' },
    { type: 'paragraph', order: 17, text: 'Para multiplicaciones y divisiones:' },
    { type: 'formula', order: 18, latex: '(+)(+) = + \\qquad (-)(-) = + \\qquad (+)(-) = - \\qquad (-)(+) = -' },
    {
      type: 'paragraph',
      order: 19,
      text: 'En resumen: signos iguales dan resultado positivo; signos diferentes dan resultado negativo.',
    },
    { type: 'paragraph', order: 20, text: 'Ejemplo:' },
    { type: 'formula', order: 21, latex: '(-6)(-4) = 24 \\qquad \\text{mientras que} \\qquad (-6)(4) = -24' },

    { type: 'heading', order: 22, level: 2, text: 'Números racionales' },
    {
      type: 'paragraph',
      order: 23,
      text: 'Un número racional es aquel que puede escribirse como a/b, donde a y b son enteros y b es distinto de cero.',
    },
    { type: 'formula', order: 24, latex: '\\dfrac{a}{b}, \\quad a, b \\in \\mathbb{Z},\\ b \\neq 0' },
    { type: 'paragraph', order: 25, text: 'Por ejemplo:' },
    { type: 'formula', order: 26, latex: '\\dfrac{3}{4},\\quad -\\dfrac{5}{2},\\quad 7' },
    {
      type: 'paragraph',
      order: 27,
      text: 'El número 7 también es racional porque puede escribirse como 7/1. Los decimales finitos y los decimales periódicos también representan números racionales. Por ejemplo:',
    },
    { type: 'formula', order: 28, latex: '0{,}75 = \\dfrac{3}{4}' },

    { type: 'heading', order: 29, level: 2, text: 'Fracciones equivalentes' },
    { type: 'paragraph', order: 30, text: 'Dos fracciones son equivalentes cuando representan la misma cantidad. Por ejemplo:' },
    { type: 'formula', order: 31, latex: '\\dfrac{1}{2} = \\dfrac{2}{4} = \\dfrac{5}{10}' },
    {
      type: 'paragraph',
      order: 32,
      text: 'Podemos obtener fracciones equivalentes multiplicando o dividiendo numerador y denominador por el mismo número distinto de cero.',
    },

    { type: 'heading', order: 33, level: 2, text: 'Comparación de racionales' },
    { type: 'paragraph', order: 34, text: 'Si dos fracciones tienen el mismo denominador, basta comparar sus numeradores.' },
    { type: 'formula', order: 35, latex: '\\dfrac{5}{8} > \\dfrac{3}{8}' },
    {
      type: 'paragraph',
      order: 36,
      text: 'Si tienen denominadores distintos, podemos buscar un denominador común. Por ejemplo, para 3/4 y 2/3, usando denominador 12:',
    },
    { type: 'formula', order: 37, latex: '\\dfrac{3}{4} = \\dfrac{9}{12} \\qquad \\dfrac{2}{3} = \\dfrac{8}{12}' },
    { type: 'paragraph', order: 38, text: 'Por lo tanto:' },
    { type: 'formula', order: 39, latex: '\\dfrac{3}{4} > \\dfrac{2}{3}' },

    { type: 'heading', order: 40, level: 2, text: 'Suma y resta de fracciones' },
    {
      type: 'paragraph',
      order: 41,
      text: 'Para sumar o restar fracciones necesitamos un denominador común. Ejemplo:',
    },
    { type: 'formula', order: 42, latex: '\\dfrac{2}{3} + \\dfrac{1}{4}' },
    { type: 'paragraph', order: 43, text: 'El mínimo común denominador es 12:' },
    { type: 'formula', order: 44, latex: '\\dfrac{2}{3} = \\dfrac{8}{12} \\qquad \\dfrac{1}{4} = \\dfrac{3}{12}' },
    { type: 'paragraph', order: 45, text: 'Entonces:' },
    { type: 'formula', order: 46, latex: '\\dfrac{8}{12} + \\dfrac{3}{12} = \\dfrac{11}{12}' },

    { type: 'heading', order: 47, level: 2, text: 'Multiplicación y división de fracciones' },
    { type: 'paragraph', order: 48, text: 'Multiplicación: se multiplican numeradores entre sí y denominadores entre sí.' },
    { type: 'formula', order: 49, latex: '\\dfrac{2}{3} \\cdot \\dfrac{5}{4} = \\dfrac{10}{12} = \\dfrac{5}{6}' },
    { type: 'paragraph', order: 50, text: 'División: se multiplica por el recíproco de la segunda fracción.' },
    { type: 'formula', order: 51, latex: '\\dfrac{2}{3} \\div \\dfrac{5}{4} = \\dfrac{2}{3} \\cdot \\dfrac{4}{5} = \\dfrac{8}{15}' },

    { type: 'heading', order: 52, level: 2, text: 'Prioridad de operaciones' },
    {
      type: 'paragraph',
      order: 53,
      text: 'Cuando una expresión contiene varias operaciones, debemos respetar su prioridad: paréntesis, potencias, multiplicaciones y divisiones, y sumas y restas. Las operaciones del mismo nivel se realizan de izquierda a derecha.',
    },
    { type: 'paragraph', order: 54, text: 'Por ejemplo:' },
    { type: 'formula', order: 55, latex: '3 - 2(-4)' },
    { type: 'paragraph', order: 56, text: 'Primero multiplicamos:' },
    { type: 'formula', order: 57, latex: '2(-4) = -8' },
    { type: 'paragraph', order: 58, text: 'Entonces:' },
    { type: 'formula', order: 59, latex: '3 - (-8) = 11' },
    { type: 'paragraph', order: 60, text: 'Un error frecuente sería calcular primero 3 - 2.' },

    { type: 'heading', order: 61, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 62,
      text: 'Los enteros y racionales no son solo números para realizar operaciones. También permiten representar situaciones reales como deudas y ganancias, temperaturas, variaciones de altura, partes de una cantidad, distancias y repartos.',
    },
    {
      type: 'paragraph',
      order: 63,
      text: 'En problemas PAES, muchas veces la dificultad no está en la operación misma, sino en traducir correctamente la situación a una expresión numérica.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de los siguientes números es el mayor?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '-5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-10' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Entre números negativos, el mayor es el que está más cerca de cero. En la recta numérica, -3 está a la derecha de -5, -8 y -10.',
        },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es el resultado de -7 + 12?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-19' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '19' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Los números tienen signos diferentes, por lo que restamos sus valores absolutos: 12 - 7 = 5. Como 12 tiene el mayor valor absoluto y es positivo, el resultado es 5.',
        },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de las siguientes fracciones es equivalente a 0,75?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '\\dfrac{1}{4}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{2}{3}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{3}{4}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{4}{5}' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{3}{4} = 3 \\div 4 = 0{,}75' },
        { type: 'paragraph', order: 1, text: 'Por lo tanto, ambas representaciones corresponden al mismo número racional.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál es el resultado de 6 - (-4) + (-3)?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-1' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '13' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '6 - (-4) = 6 + 4 = 10' },
        { type: 'paragraph', order: 1, text: 'Luego:' },
        { type: 'formula', order: 2, latex: '10 + (-3) = 7' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de los siguientes números es el menor?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{1}{2}' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-0,7' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{3}{4}' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '-0,6' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '-\\dfrac{1}{2} = -0{,}5 \\qquad -\\dfrac{3}{4} = -0{,}75' },
        { type: 'paragraph', order: 1, text: 'Entonces:' },
        { type: 'formula', order: 2, latex: '-0{,}75 < -0{,}7 < -0{,}6 < -0{,}5' },
        { type: 'paragraph', order: 3, text: 'Por lo tanto, el menor es -3/4.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el resultado de la siguiente operación?' },
        { type: 'formula', order: 1, latex: '\\dfrac{5}{6} - \\dfrac{1}{4}' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '\\dfrac{7}{12}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{4}{10}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{2}{3}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{3}{12}' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{5}{6} = \\dfrac{10}{12} \\qquad \\dfrac{1}{4} = \\dfrac{3}{12}' },
        { type: 'paragraph', order: 1, text: 'Entonces:' },
        { type: 'formula', order: 2, latex: '\\dfrac{10}{12} - \\dfrac{3}{12} = \\dfrac{7}{12}' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '-\\dfrac{2}{3} \\div \\dfrac{4}{9}' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{1}{6}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{3}{2}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\dfrac{3}{2}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '-\\dfrac{8}{9}' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '-\\dfrac{2}{3} \\div \\dfrac{4}{9} = -\\dfrac{2}{3} \\cdot \\dfrac{9}{4} = -\\dfrac{3}{2}' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Durante la mañana, la temperatura era de -3°C. Durante la tarde aumentó 8°C y durante la noche disminuyó 6°C. ¿Cuál fue la temperatura final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-17°C' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-5°C' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-1°C' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1°C' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '-3 + 8 - 6 = -1' },
        { type: 'paragraph', order: 1, text: 'Por lo tanto, la temperatura final fue -1°C.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de la siguiente expresión?' },
        { type: 'formula', order: 1, latex: '2 - \\dfrac{3}{2}\\left(-4+\\dfrac{2}{3}\\right)' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '-4+\\dfrac{2}{3} = -\\dfrac{10}{3}' },
        { type: 'paragraph', order: 1, text: 'Luego:' },
        { type: 'formula', order: 2, latex: '\\dfrac{3}{2}\\left(-\\dfrac{10}{3}\\right) = -5' },
        { type: 'paragraph', order: 3, text: 'Finalmente:' },
        { type: 'formula', order: 4, latex: '2 - (-5) = 7' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.ENTEROS_RACIONALES.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una persona tiene una deuda de $24.000. Paga 3/8 del total de la deuda y posteriormente adquiere una nueva deuda equivalente a 1/4 de la deuda original. Si una deuda se representa mediante un número negativo, ¿cuál es su saldo final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '-$9.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-$15.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '-$21.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '-$27.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{3}{8} \\cdot 24.000 = 9.000' },
        { type: 'paragraph', order: 1, text: 'Queda debiendo:' },
        { type: 'formula', order: 2, latex: '24.000 - 9.000 = 15.000' },
        { type: 'paragraph', order: 3, text: 'Nueva deuda:' },
        { type: 'formula', order: 4, latex: '\\dfrac{1}{4} \\cdot 24.000 = 6.000' },
        { type: 'paragraph', order: 5, text: 'Entonces:' },
        { type: 'formula', order: 6, latex: '15.000 + 6.000 = 21.000' },
        { type: 'paragraph', order: 7, text: 'Como representa una deuda, el saldo es -$21.000.' },
      ],
    },
  ],
};

export default enterosRacionales;
