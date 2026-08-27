// CONTENT-4.5 -- Golden Unit M1 / Álgebra y funciones, Recurso 2. Contenido
// editorial APROBADO externamente.
//
// Q3, Q4, Q7 y Q8 son preguntas NUEVAS, con identidad propia bajo
// `M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD`, editorialmente inspiradas en las
// antiguas Q9/Q10/Q11/Q12 legacy de `M1.NUMEROS.PORCENTAJES` (auditoría de
// CONTENT-4.3/4.4: esas 4 preguntas legacy evalúan genuinamente
// Proporcionalidad, no Porcentaje). NO son las mismas filas, NO reutilizan
// sus identities, y las versiones PUBLISHED legacy permanecen intactas --
// este incremento no las toca en absoluto (no importa nada, ver CONTENT-4.5
// punto 15).
import type { ResourceContentModule } from '../../schema';

const proporcionalidad: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD',
  unitCode: 'M1.ALGEBRA_FUNCIONES',
  subjectKey: 'matematica',
  order: 2,
  title: 'Proporcionalidad',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá reconocer relaciones de proporcionalidad directa e inversa, determinar constantes de proporcionalidad y resolver problemas contextualizados utilizando razones, tablas y relaciones entre magnitudes.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Proporcionalidad' },

    { type: 'heading', order: 1, level: 2, text: 'Razón entre dos cantidades' },
    { type: 'paragraph', order: 2, text: 'Una razón compara dos cantidades mediante una división. Si hay 6 lápices rojos y 3 azules:' },
    { type: 'formula', order: 3, latex: '\\dfrac{6}{3} = 2' },
    { type: 'paragraph', order: 4, text: 'Hay 2 lápices rojos por cada azul.' },

    { type: 'heading', order: 5, level: 2, text: '¿Qué es una proporción?' },
    { type: 'paragraph', order: 6, text: 'Una proporción es una igualdad entre dos razones.' },
    { type: 'formula', order: 7, latex: '\\dfrac{2}{3} = \\dfrac{4}{6}' },
    { type: 'paragraph', order: 8, text: 'En general:' },
    { type: 'formula', order: 9, latex: '\\dfrac{a}{b} = \\dfrac{c}{d}' },
    { type: 'paragraph', order: 10, text: 'con denominadores distintos de cero.' },

    { type: 'heading', order: 11, level: 2, text: 'Proporcionalidad directa' },
    {
      type: 'paragraph',
      order: 12,
      text: 'Dos magnitudes son directamente proporcionales cuando, al multiplicar una por cierto factor, la otra se multiplica por el mismo factor. Si 2 cuadernos cuestan $3.000, 4 cuadernos cuestan:',
    },
    { type: 'formula', order: 13, latex: '3.000 \\cdot 2 = 6.000' },

    { type: 'heading', order: 14, level: 2, text: 'Constante de proporcionalidad directa' },
    { type: 'formula', order: 15, latex: 'y = kx \\qquad k = \\dfrac{y}{x}' },
    { type: 'paragraph', order: 16, text: 'Si 5 kg cuestan $7.500:' },
    { type: 'formula', order: 17, latex: 'k = \\dfrac{7.500}{5} = 1.500' },
    { type: 'paragraph', order: 18, text: 'Entonces:' },
    { type: 'formula', order: 19, latex: 'y = 1.500x' },

    { type: 'heading', order: 20, level: 2, text: 'Tablas de proporcionalidad directa' },
    { type: 'paragraph', order: 21, text: 'Ejemplo:' },
    { type: 'formula', order: 22, latex: 'x: 2, 4, 7 \\qquad y: 6, 12, 21' },
    { type: 'paragraph', order: 23, text: 'En todos:' },
    { type: 'formula', order: 24, latex: '\\dfrac{y}{x} = 3' },

    { type: 'heading', order: 25, level: 2, text: 'Proporcionalidad inversa' },
    { type: 'formula', order: 26, latex: 'xy = k \\qquad \\text{o} \\qquad y = \\dfrac{k}{x}' },
    { type: 'paragraph', order: 27, text: 'Si 4 personas realizan un trabajo en 6 horas:' },
    { type: 'formula', order: 28, latex: '4 \\cdot 6 = 24' },
    { type: 'paragraph', order: 29, text: 'Con 8 personas:' },
    { type: 'formula', order: 30, latex: '8t = 24 \\qquad t = 3' },

    { type: 'heading', order: 31, level: 2, text: 'Cómo distinguirlas' },
    {
      type: 'paragraph',
      order: 32,
      text: 'Directa: una magnitud aumenta y la otra también en la misma proporción. Inversa: una aumenta mientras la otra disminuye de forma que el producto permanece constante.',
    },

    { type: 'heading', order: 33, level: 2, text: 'No toda relación es proporcional' },
    { type: 'formula', order: 34, latex: 'x: 1, 2, 3 \\qquad y: 5, 7, 9' },
    { type: 'paragraph', order: 35, text: 'Aunque ambas aumentan, y/x no es constante. No existe proporcionalidad directa.' },

    { type: 'heading', order: 36, level: 2, text: 'Regla de tres como estrategia' },
    { type: 'paragraph', order: 37, text: 'Si 3 entradas cuestan $12.000 y buscamos el valor de 5:' },
    { type: 'formula', order: 38, latex: '\\dfrac{3}{12.000} = \\dfrac{5}{x}' },
    { type: 'formula', order: 39, latex: '3x = 60.000 \\qquad x = 20.000' },
    { type: 'paragraph', order: 40, text: 'Lo importante es comprender la relación, no memorizar solo la regla.' },

    { type: 'heading', order: 41, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 42,
      text: 'Pregunta: ¿qué magnitudes comparo? ¿qué ocurre con una cuando cambia la otra? ¿la razón es constante o el producto? ¿es directa, inversa o ninguna?',
    },
  ],
  questions: [
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Si 4 lápices cuestan $2.000 y todos tienen el mismo precio, ¿cuánto cuestan 8?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$2.500' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$3.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$4.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$8.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Al duplicarse la cantidad, se duplica el precio:' },
        { type: 'formula', order: 1, latex: '2.000 \\cdot 2 = 4.000' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál situación representa proporcionalidad directa?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Número de trabajadores y tiempo para una misma tarea.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Cantidad de productos y precio total, con precio unitario constante.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Velocidad y tiempo para una distancia fija.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Edad y estatura de una persona.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Con precio unitario constante, al multiplicar la cantidad por un factor, el precio total se multiplica por el mismo factor.',
        },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Si 3 cuadernos cuestan $4.500, ¿cuánto costarán 5 cuadernos al mismo precio por unidad?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$6.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$7.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$7.500' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$9.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{4.500}{3} = 1.500' },
        { type: 'formula', order: 1, latex: '5 \\cdot 1.500 = 7.500' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Para preparar 4 porciones se necesitan 300 g de harina. ¿Cuánta harina se necesita para 10 porciones?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '600 g' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '650 g' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '750 g' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1.200 g' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{300}{4} = 75' },
        { type: 'formula', order: 1, latex: '75 \\cdot 10 = 750' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En una relación directamente proporcional:' },
        { type: 'formula', order: 1, latex: 'y = 4x' },
        { type: 'paragraph', order: 2, text: '¿Cuál es y cuando x = 7?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '11' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '21' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '28' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '35' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'y = 4(7) = 28' }],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál tabla representa proporcionalidad directa?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '(1,3), (2,5), (3,7)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(2,6), (4,12), (6,18)' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '(1,4), (2,6), (4,10)' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '(2,8), (3,10), (4,12)' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{6}{2} = \\dfrac{12}{4} = \\dfrac{18}{6} = 3' },
        { type: 'paragraph', order: 1, text: 'La razón y/x es constante.' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Si 4 personas realizan un trabajo en 6 horas, ¿cuánto tardarían 8 personas al mismo ritmo?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2 h' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3 h' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '8 h' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12 h' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '4 \\cdot 6 = 24' },
        { type: 'formula', order: 1, latex: '8t = 24 \\qquad t = 3' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un viaje tarda 6 horas a 60 km/h constantes. Si el mismo trayecto se realiza a 90 km/h, ¿cuánto tarda?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3 h' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4 h' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '5 h' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9 h' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '60 \\cdot 6 = 360 \\text{ km}' },
        { type: 'formula', order: 1, latex: '360 / 90 = 4' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Una máquina produce 180 piezas en 12 minutos a ritmo constante. ¿Cuántas producirá en 35 minutos?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '420' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '480' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '525' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '630' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{180}{12} = 15' },
        { type: 'formula', order: 1, latex: '15 \\cdot 35 = 525' },
      ],
    },
    {
      questionKey: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Seis trabajadores completan una tarea en 15 días. ¿Cuántos trabajadores se necesitan para completar la misma tarea en 10 días, trabajando todos al mismo ritmo?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '9' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '6 \\cdot 15 = 90' },
        { type: 'formula', order: 1, latex: '10x = 90 \\qquad x = 9' },
      ],
    },
  ],
};

export default proporcionalidad;
