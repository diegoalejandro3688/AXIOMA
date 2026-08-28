// M2-C2A -- Golden Unit M2 / Probabilidad y estadística, Recurso 2 (order 2
// en U4). Contenido editorial APROBADO externamente, transcrito verbatim.
// Ajustes solo técnicos: contentBlocks (heading/paragraph/formula), LaTeX en
// `latex`, questionKey sin padding.
//
// Answer key: R8 -- D C C C C B C C C C  ("DCCCCBCCCC").
// Dificultad: 2 FACIL / 4 MEDIA / 4 DIFICIL (Q1-Q2 FACIL, Q3-Q6 MEDIA,
// Q7-Q10 DIFICIL).
import type { ResourceContentModule } from '../../schema';

const combinatoriaModeloBinomial: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL',
  unitCode: 'M2.PROBABILIDAD_ESTADISTICA',
  subjectKey: 'matematica',
  order: 2,
  title: 'Combinatoria y modelo binomial',
  learningObjective:
    'Aplicar principios de conteo, permutaciones y combinaciones para determinar cantidades de resultados posibles, y utilizar el modelo binomial para calcular e interpretar probabilidades en experimentos con ensayos independientes de éxito y fracaso.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Combinatoria y modelo binomial' },

    { type: 'heading', order: 1, level: 2, text: '1. Principio multiplicativo' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Cuando un procedimiento se realiza en etapas sucesivas, y cada etapa tiene una cierta cantidad de opciones, el número total de resultados puede obtenerse multiplicando las posibilidades de cada etapa. Por ejemplo, si una persona puede elegir: 3 poleras; 2 pantalones; entonces existen:',
    },
    { type: 'formula', order: 3, latex: '3\\cdot2=6' },
    { type: 'paragraph', order: 4, text: 'combinaciones posibles. Este principio es la base de muchas técnicas de conteo.' },

    { type: 'heading', order: 5, level: 2, text: '2. Factorial' },
    { type: 'paragraph', order: 6, text: 'Para un número natural n, su factorial se define como:' },
    { type: 'formula', order: 7, latex: 'n!=n(n-1)(n-2)\\cdots2\\cdot1' },
    { type: 'paragraph', order: 8, text: 'Por ejemplo:' },
    { type: 'formula', order: 9, latex: '5!=5\\cdot4\\cdot3\\cdot2\\cdot1' },
    { type: 'formula', order: 10, latex: '=120' },
    { type: 'paragraph', order: 11, text: 'También se define:' },
    { type: 'formula', order: 12, latex: '0!=1' },
    { type: 'paragraph', order: 13, text: 'El factorial aparece frecuentemente en problemas donde se ordenan o seleccionan elementos.' },

    { type: 'heading', order: 14, level: 2, text: '3. Permutaciones' },
    { type: 'paragraph', order: 15, text: 'Cuando se ordenan n elementos distintos y se utilizan todos, la cantidad de ordenamientos posibles es:' },
    { type: 'formula', order: 16, latex: 'n!' },
    { type: 'paragraph', order: 17, text: 'Por ejemplo, si 4 personas se ubican en una fila, existen:' },
    { type: 'formula', order: 18, latex: '4!=24' },
    { type: 'paragraph', order: 19, text: 'formas diferentes de ordenarlas. En este tipo de problema, el orden importa.' },

    { type: 'heading', order: 20, level: 2, text: '4. Selecciones ordenadas' },
    {
      type: 'paragraph',
      order: 21,
      text: 'A veces se eligen solo algunos elementos de un conjunto y además importa el orden. Si se seleccionan r elementos distintos a partir de n, sin repetición, el número de posibilidades puede expresarse como:',
    },
    { type: 'formula', order: 22, latex: '\\frac{n!}{(n-r)!}' },
    { type: 'paragraph', order: 23, text: 'Por ejemplo, si entre 6 personas se asignan los cargos de presidente y vicepresidente:' },
    { type: 'formula', order: 24, latex: '6\\cdot5=30' },
    { type: 'paragraph', order: 25, text: 'posibilidades. Elegir a Ana como presidenta y Bruno como vicepresidente no es lo mismo que invertir los cargos.' },

    { type: 'heading', order: 26, level: 2, text: '5. Combinaciones' },
    { type: 'paragraph', order: 27, text: 'Cuando se seleccionan r elementos a partir de n, pero el orden no importa, se utilizan combinaciones. La cantidad es:' },
    { type: 'formula', order: 28, latex: '\\binom{n}{r}=\\frac{n!}{r!(n-r)!}' },
    { type: 'paragraph', order: 29, text: 'Por ejemplo, seleccionar 2 integrantes de un grupo de 5 puede hacerse de:' },
    { type: 'formula', order: 30, latex: '\\binom52=\\frac{5!}{2!3!}' },
    { type: 'formula', order: 31, latex: '=10' },
    { type: 'paragraph', order: 32, text: 'formas. El grupo formado por Ana y Bruno es el mismo que el formado por Bruno y Ana.' },

    { type: 'heading', order: 33, level: 2, text: '6. ¿Importa el orden?' },
    {
      type: 'paragraph',
      order: 34,
      text: 'Esta pregunta permite distinguir muchos problemas. Si se eligen: primer, segundo y tercer lugar; el orden importa. Si se seleccionan: 3 representantes de un curso; el orden no importa. Por eso, antes de aplicar una fórmula conviene preguntar: ¿Cambiar el orden produce un resultado diferente? Si la respuesta es sí, se trata de una selección ordenada. Si la respuesta es no, puede utilizarse una combinación.',
    },

    { type: 'heading', order: 35, level: 2, text: '7. Experimentos de Bernoulli' },
    {
      type: 'paragraph',
      order: 36,
      text: 'Un ensayo de Bernoulli tiene solo dos resultados posibles, que suelen llamarse: éxito; fracaso. Por ejemplo: responder correctamente o incorrectamente una pregunta; obtener cara o sello; que una pieza sea defectuosa o no defectuosa. Si se repite el mismo experimento varias veces bajo determinadas condiciones, puede construirse un modelo binomial.',
    },

    { type: 'heading', order: 37, level: 2, text: '8. Condiciones del modelo binomial' },
    {
      type: 'paragraph',
      order: 38,
      text: 'Un modelo binomial se utiliza cuando: 1. existe un número fijo de ensayos n; 2. cada ensayo tiene dos resultados posibles; 3. la probabilidad de éxito p se mantiene constante; 4. los ensayos son independientes. Si X representa el número de éxitos:',
    },
    { type: 'formula', order: 39, latex: 'X\\sim B(n,p)' },
    { type: 'paragraph', order: 40, text: 'La probabilidad de fracaso es:' },
    { type: 'formula', order: 41, latex: '1-p' },

    { type: 'heading', order: 42, level: 2, text: '9. Probabilidad binomial' },
    { type: 'paragraph', order: 43, text: 'La probabilidad de obtener exactamente k éxitos en n ensayos es:' },
    { type: 'formula', order: 44, latex: 'P(X=k)=\\binom{n}{k}p^k(1-p)^{n-k}' },
    { type: 'paragraph', order: 45, text: 'El término:' },
    { type: 'formula', order: 46, latex: '\\binom{n}{k}' },
    { type: 'paragraph', order: 47, text: 'cuenta cuántas formas distintas existen de ubicar los k éxitos entre los n ensayos. Por ejemplo, obtener exactamente 2 éxitos en 4 ensayos puede ocurrir en:' },
    { type: 'formula', order: 48, latex: '\\binom42=6' },
    { type: 'paragraph', order: 49, text: 'órdenes diferentes.' },

    { type: 'heading', order: 50, level: 2, text: '10. Interpretar probabilidades binomiales' },
    { type: 'paragraph', order: 51, text: 'Supongamos que la probabilidad de éxito en cada ensayo es:' },
    { type: 'formula', order: 52, latex: 'p=0,8' },
    { type: 'paragraph', order: 53, text: 'y se realizan 5 ensayos independientes. La probabilidad de obtener exactamente 4 éxitos es:' },
    { type: 'formula', order: 54, latex: 'P(X=4)=\\binom54(0,8)^4(0,2)' },
    { type: 'paragraph', order: 55, text: 'No basta calcular:' },
    { type: 'formula', order: 56, latex: '(0,8)^4(0,2)' },
    { type: 'paragraph', order: 57, text: 'porque existen varias posiciones posibles para el único fracaso. El factor combinatorio considera todas esas posibilidades.' },

    { type: 'heading', order: 58, level: 3, text: 'Situación ZETRYND 1 — Selección de un equipo' },
    {
      type: 'paragraph',
      order: 59,
      text: 'Un grupo tiene 8 estudiantes y deben seleccionarse 3 para representar al curso. Como los tres tendrán el mismo rol, el orden no importa. Entonces el número de equipos posibles es:',
    },
    { type: 'formula', order: 60, latex: '\\binom83' },
    { type: 'formula', order: 61, latex: '=\\frac{8!}{3!5!}' },
    { type: 'formula', order: 62, latex: '=56' },
    {
      type: 'paragraph',
      order: 63,
      text: 'Si, en cambio, hubiera que seleccionar presidente, vicepresidente y secretario, el orden sí importaría y el conteo sería diferente.',
    },

    { type: 'heading', order: 64, level: 3, text: 'Situación ZETRYND 2 — Rendimiento en preguntas' },
    { type: 'paragraph', order: 65, text: 'Un estudiante responde preguntas independientes y tiene una probabilidad de:' },
    { type: 'formula', order: 66, latex: '0,7' },
    { type: 'paragraph', order: 67, text: 'de responder correctamente cada una. Si responde 5 preguntas, y X representa el número de respuestas correctas:' },
    { type: 'formula', order: 68, latex: 'X\\sim B(5,0,7)' },
    { type: 'paragraph', order: 69, text: 'La probabilidad de obtener exactamente 4 correctas es:' },
    { type: 'formula', order: 70, latex: 'P(X=4)=\\binom54(0,7)^4(0,3)' },
    { type: 'paragraph', order: 71, text: 'Como:' },
    { type: 'formula', order: 72, latex: '\\binom54=5' },
    { type: 'paragraph', order: 73, text: 'se obtiene:' },
    { type: 'formula', order: 74, latex: 'P(X=4)=5(0,7)^4(0,3)' },
    { type: 'paragraph', order: 75, text: 'El factor 5 representa las distintas posiciones en que puede aparecer la única respuesta incorrecta.' },
  ],
  questions: [
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de:' },
        { type: 'formula', order: 1, latex: '4!' },
        { type: 'paragraph', order: 2, text: '?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '16' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '24' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Por definición:' },
        { type: 'formula', order: 1, latex: '4!=4\\cdot3\\cdot2\\cdot1=24' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Se seleccionan 2 estudiantes de un grupo de 6 para formar una pareja de representantes, sin distinguir cargos. ¿Qué expresión permite calcular la cantidad de parejas posibles?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '6^2' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '6!' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\binom62' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '6\\cdot5' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Como solo se forma un grupo y el orden no importa, corresponde utilizar una combinación:' },
        { type: 'formula', order: 1, latex: '\\binom62' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuántas formas existen de ordenar 5 libros distintos en una repisa?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '25' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '60' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '120' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '625' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Se ordenan los 5 elementos distintos y se utilizan todos:' },
        { type: 'formula', order: 1, latex: '5!=120' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'De un grupo de 7 personas se deben elegir un presidente y un vicepresidente. ¿Cuántas asignaciones distintas existen?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '21' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '35' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '42' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '49' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Hay 7 opciones para presidente y luego 6 para vicepresidente:' },
        { type: 'formula', order: 1, latex: '7\\cdot6=42' },
        { type: 'paragraph', order: 2, text: 'El orden importa porque los cargos son diferentes.' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Cuál es el valor de:' },
        { type: 'formula', order: 1, latex: '\\binom63' },
        { type: 'paragraph', order: 2, text: '?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '20' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '36' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Se tiene:' },
        { type: 'formula', order: 1, latex: '\\binom63=\\frac{6!}{3!3!}' },
        { type: 'formula', order: 2, latex: '=20' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una moneda equilibrada se lanza 4 veces. Si X representa la cantidad de caras obtenidas, ¿qué expresión corresponde a:' },
        { type: 'formula', order: 1, latex: 'P(X=3)?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '\\left(\\frac12\\right)^3' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\binom43\\left(\\frac12\\right)^3\\left(\\frac12\\right)' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\binom42\\left(\\frac12\\right)^4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '4\\left(\\frac12\\right)^3' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Para exactamente 3 caras en 4 lanzamientos:' },
        { type: 'formula', order: 1, latex: 'P(X=3)=\\binom43\\left(\\frac12\\right)^3\\left(\\frac12\\right)^1' },
        { type: 'paragraph', order: 2, text: 'El coeficiente combinatorio cuenta las distintas posiciones posibles del único sello.' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q7',
      order: 6,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'De 10 estudiantes se seleccionan 4 para integrar un equipo. ¿Cuántos equipos distintos pueden formarse?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '40' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '120' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '210' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '5040' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Como el orden no importa:' },
        { type: 'formula', order: 1, latex: '\\binom{10}{4}=\\frac{10!}{4!6!}' },
        { type: 'formula', order: 2, latex: '=210' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q8',
      order: 7,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una prueba contiene 6 preguntas independientes. Un estudiante tiene probabilidad 0,8 de responder correctamente cada pregunta. ¿Cuál es la probabilidad de responder correctamente exactamente 5 preguntas?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '(0,8)^5(0,2)' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '5(0,8)^5(0,2)' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '6(0,8)^5(0,2)' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '\\binom65(0,8)(0,2)^5' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Se utiliza el modelo binomial:' },
        { type: 'formula', order: 1, latex: 'P(X=5)=\\binom65(0,8)^5(0,2)' },
        { type: 'paragraph', order: 2, text: 'Como:' },
        { type: 'formula', order: 3, latex: '\\binom65=6' },
        { type: 'paragraph', order: 4, text: 'la expresión queda:' },
        { type: 'formula', order: 5, latex: '6(0,8)^5(0,2)' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'De un grupo formado por 5 mujeres y 4 hombres se seleccionan 3 personas al azar. ¿Cuántos grupos distintos pueden formarse que contengan exactamente 2 mujeres y 1 hombre?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '20' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '60' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Se seleccionan:' },
        { type: 'formula', order: 1, latex: '\\binom52' },
        { type: 'paragraph', order: 2, text: 'formas de elegir las 2 mujeres, y:' },
        { type: 'formula', order: 3, latex: '\\binom41' },
        { type: 'paragraph', order: 4, text: 'formas de elegir al hombre. Por el principio multiplicativo:' },
        { type: 'formula', order: 5, latex: '\\binom52\\binom41=10\\cdot4=40' },
      ],
    },
    {
      questionKey: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una máquina produce una pieza defectuosa con probabilidad:' },
        { type: 'formula', order: 1, latex: '0,1' },
        { type: 'paragraph', order: 2, text: 'de manera independiente para cada pieza. Se seleccionan 5 piezas. ¿Cuál es la probabilidad de que al menos una sea defectuosa?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '(0,1)^5' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '1-(0,1)^5' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '1-(0,9)^5' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '5(0,1)(0,9)^4' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Es más sencillo calcular primero el evento complementario. La probabilidad de que ninguna pieza sea defectuosa es:' },
        { type: 'formula', order: 1, latex: '(0,9)^5' },
        { type: 'paragraph', order: 2, text: 'Por lo tanto:' },
        { type: 'formula', order: 3, latex: 'P(\\text{al menos una defectuosa})=1-P(\\text{ninguna defectuosa})' },
        { type: 'formula', order: 4, latex: '=1-(0,9)^5' },
      ],
    },
  ],
};

export default combinatoriaModeloBinomial;
