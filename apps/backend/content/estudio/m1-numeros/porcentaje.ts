// CONTENT-4.3 -- Golden Unit M1 / Números, Recurso 2. Contenido editorial
// APROBADO externamente. Ver cabecera de enteros-racionales.ts para el
// criterio de ajustes técnicos (contentBlocks, LaTeX, questionKey sin
// padding).
//
// Q06 y Q08 son preguntas NUEVAS, con identidad propia bajo
// `M1.NUMEROS.PORCENTAJE`, inspiradas editorialmente en las antiguas Q3/Q5
// legacy de `M1.NUMEROS.PORCENTAJES` (ver auditoría previa) -- NO son las
// mismas filas, NO reutilizan sus identities, y las versiones PUBLISHED
// legacy permanecen intactas (ver reporte de entrega, confirmación O).
import type { ResourceContentModule } from '../../schema';

const porcentaje: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.NUMEROS.PORCENTAJE.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.NUMEROS.PORCENTAJE',
  unitCode: 'M1.NUMEROS',
  subjectKey: 'matematica',
  order: 2,
  title: 'Porcentaje',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá comprender el porcentaje como una proporción, calcular porcentajes de cantidades, determinar porcentajes relativos, resolver aumentos y disminuciones porcentuales y aplicar estos conceptos en problemas contextualizados.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Porcentaje' },

    { type: 'heading', order: 1, level: 2, text: '¿Qué es un porcentaje?' },
    { type: 'paragraph', order: 2, text: 'Un porcentaje expresa una cantidad por cada 100.' },
    { type: 'formula', order: 3, latex: '25\\% = \\dfrac{25}{100} = 0{,}25' },
    { type: 'paragraph', order: 4, text: 'También:' },
    { type: 'formula', order: 5, latex: '50\\% = \\dfrac{50}{100} = \\dfrac{1}{2} = 0{,}5' },

    { type: 'heading', order: 6, level: 2, text: 'Calcular un porcentaje de una cantidad' },
    { type: 'paragraph', order: 7, text: 'Para calcular p% de una cantidad N:' },
    { type: 'formula', order: 8, latex: '\\dfrac{p}{100} \\cdot N' },
    { type: 'paragraph', order: 9, text: 'Ejemplo:' },
    { type: 'formula', order: 10, latex: '20\\% \\text{ de } 350 = 0{,}20 \\cdot 350 = 70' },

    { type: 'heading', order: 11, level: 2, text: 'Determinar qué porcentaje representa una cantidad' },
    { type: 'formula', order: 12, latex: '\\dfrac{\\text{parte}}{\\text{total}} \\cdot 100' },
    { type: 'paragraph', order: 13, text: 'Ejemplo: 10 de 40 estudiantes:' },
    { type: 'formula', order: 14, latex: '\\dfrac{10}{40} \\cdot 100 = 25\\%' },

    { type: 'heading', order: 15, level: 2, text: 'Encontrar el total' },
    { type: 'paragraph', order: 16, text: 'Si 60 corresponde al 30% de una cantidad x:' },
    { type: 'formula', order: 17, latex: '0{,}30x = 60' },
    { type: 'paragraph', order: 18, text: 'Entonces:' },
    { type: 'formula', order: 19, latex: 'x = 200' },

    { type: 'heading', order: 20, level: 2, text: 'Aumento porcentual' },
    { type: 'paragraph', order: 21, text: 'Un producto cuesta $50.000 y aumenta 10%.' },
    { type: 'formula', order: 22, latex: '50.000 \\cdot 1{,}10 = 55.000' },

    { type: 'heading', order: 23, level: 2, text: 'Disminución porcentual' },
    { type: 'paragraph', order: 24, text: 'Una chaqueta cuesta $80.000 y tiene 25% de descuento.' },
    { type: 'formula', order: 25, latex: '80.000 \\cdot 0{,}75 = 60.000' },

    { type: 'heading', order: 26, level: 2, text: 'La cantidad base importa' },
    { type: 'paragraph', order: 27, text: 'Un precio aumenta de $20.000 a $25.000. El aumento fue:' },
    { type: 'formula', order: 28, latex: '5.000' },
    { type: 'paragraph', order: 29, text: 'El porcentaje de aumento se calcula respecto del precio original:' },
    { type: 'formula', order: 30, latex: '\\dfrac{5.000}{20.000} \\cdot 100 = 25\\%' },

    { type: 'heading', order: 31, level: 2, text: 'Variaciones sucesivas' },
    { type: 'paragraph', order: 32, text: 'Una cantidad de 10.000 aumenta 20%:' },
    { type: 'formula', order: 33, latex: '10.000 \\cdot 1{,}20 = 12.000' },
    { type: 'paragraph', order: 34, text: 'Luego disminuye 10%:' },
    { type: 'formula', order: 35, latex: '12.000 \\cdot 0{,}90 = 10.800' },
    { type: 'paragraph', order: 36, text: 'Los porcentajes sucesivos se aplican sobre cantidades diferentes.' },

    { type: 'heading', order: 37, level: 2, text: 'Porcentaje de cambio' },
    { type: 'formula', order: 38, latex: '\\dfrac{\\text{valor final} - \\text{valor inicial}}{\\text{valor inicial}} \\cdot 100' },
    { type: 'paragraph', order: 39, text: 'Un resultado positivo representa aumento y uno negativo, disminución.' },

    { type: 'heading', order: 40, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 41,
      text: 'En problemas de porcentaje conviene preguntarse: ¿cuál es el 100%? ¿Qué parte o cambio estoy comparando? ¿Sobre qué cantidad se aplica el porcentaje?',
    },
    {
      type: 'paragraph',
      order: 42,
      text: 'Identificar correctamente la cantidad base suele ser más importante que la operación misma.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuál de las siguientes expresiones es equivalente a 35%?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,035' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,35' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3,5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '35' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '35\\% = \\dfrac{35}{100} = 0{,}35' }],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '¿Cuánto es el 20% de 250?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '25' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '50' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '75' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '0{,}20 \\cdot 250 = 50' }],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: 'En un grupo de 50 personas, 15 usan lentes. ¿Qué porcentaje del grupo usa lentes?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '15%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '25%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30%' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '35%' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '\\dfrac{15}{50} \\cdot 100 = 30\\%' }],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Si 42 representa el 30% de una cantidad, ¿cuál es esa cantidad?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '126' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '140' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '160' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '180' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '0{,}30x = 42' },
        { type: 'formula', order: 1, latex: 'x = \\dfrac{42}{0{,}30} = 140' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Un artículo cuesta $36.000 y aumenta su precio en un 15%. ¿Cuál es su nuevo precio?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$39.600' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$40.500' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$41.400' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$42.000' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '36.000 \\cdot 1{,}15 = 41.400' }],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Una polera cuesta $24.000 y tiene un descuento del 25%. ¿Cuánto dinero se descuenta?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$4.800' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$6.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$8.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$18.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '25\\% \\text{ de } 24.000 = 0{,}25 \\cdot 24.000 = 6.000' },
        { type: 'paragraph', order: 1, text: 'El descuento es $6.000.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'El precio de un producto aumentó de $40.000 a $46.000. ¿En qué porcentaje aumentó?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '6%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '15%' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '20%' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El aumento fue:' },
        { type: 'formula', order: 1, latex: '46.000 - 40.000 = 6.000' },
        { type: 'paragraph', order: 2, text: 'Respecto del precio original:' },
        { type: 'formula', order: 3, latex: '\\dfrac{6.000}{40.000} \\cdot 100 = 15\\%' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'Después de aplicar un descuento del 20%, un producto cuesta $16.000. ¿Cuál era su precio original?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$18.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$19.200' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$20.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$21.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Después del descuento queda el 80% del precio original:' },
        { type: 'formula', order: 1, latex: '0{,}80x = 16.000' },
        { type: 'paragraph', order: 2, text: 'Entonces:' },
        { type: 'formula', order: 3, latex: 'x = \\dfrac{16.000}{0{,}80} = 20.000' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un producto aumenta su precio en 20% y posteriormente recibe un descuento de 20%. Si inicialmente costaba $50.000, ¿cuál es su precio final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$48.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$50.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$52.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$60.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '50.000 \\cdot 1{,}20 = 60.000' },
        { type: 'paragraph', order: 1, text: 'Luego:' },
        { type: 'formula', order: 2, latex: '60.000 \\cdot 0{,}80 = 48.000' },
        { type: 'paragraph', order: 3, text: 'Los porcentajes no se anulan porque se aplican sobre cantidades distintas.' },
      ],
    },
    {
      questionKey: 'M1.NUMEROS.PORCENTAJE.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una tienda, un producto recibe primero un descuento de 10%. Luego, sobre el precio ya rebajado, se aplica un descuento adicional de 20%. Si el precio final es $72.000, ¿cuál era el precio original?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$90.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$96.000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$100.000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$108.000' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '0{,}90 \\cdot 0{,}80 = 0{,}72' },
        { type: 'paragraph', order: 1, text: 'Entonces:' },
        { type: 'formula', order: 2, latex: '0{,}72x = 72.000' },
        { type: 'formula', order: 3, latex: 'x = 100.000' },
      ],
    },
  ],
};

export default porcentaje;
