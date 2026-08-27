// CONTENT-4.8 -- Golden Unit M1 / Probabilidad y estadística, Recurso 1.
// Contenido editorial APROBADO externamente. Mismo criterio de ajustes
// técnicos que content/estudio/m1-geometria/*.ts (contentBlocks, LaTeX,
// questionKey sin padding) -- sin excepciones.
import type { ResourceContentModule } from '../../schema';

const representacionDatos: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS',
  unitCode: 'M1.PROBABILIDAD_ESTADISTICA',
  subjectKey: 'matematica',
  order: 1,
  title: 'Representación de datos a través de tablas y gráficos',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá organizar, representar e interpretar datos mediante tablas de frecuencia y distintos tipos de gráficos, comparando información y extrayendo conclusiones a partir de representaciones estadísticas.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Representación de datos a través de tablas y gráficos' },

    { type: 'heading', order: 1, level: 2, text: 'Datos y variables' },
    {
      type: 'paragraph',
      order: 2,
      text: 'En estadística recolectamos información llamada datos. Los datos pueden provenir, por ejemplo, de: edades, notas, cantidad de hermanos, preferencias, tiempos, alturas. La característica que estamos estudiando se llama variable.',
    },
    {
      type: 'paragraph',
      order: 3,
      text: 'Por ejemplo, si preguntamos a un grupo de estudiantes cuántos libros leyeron durante un mes, la variable es: cantidad de libros leídos.',
    },

    { type: 'heading', order: 4, level: 2, text: 'Frecuencia absoluta' },
    { type: 'paragraph', order: 5, text: 'La frecuencia absoluta indica cuántas veces aparece un dato. Ejemplo:' },
    { type: 'formula', order: 6, latex: '2,\\ 3,\\ 2,\\ 4,\\ 3,\\ 2' },
    { type: 'paragraph', order: 7, text: 'El valor 2 aparece 3 veces. Por tanto:' },
    { type: 'formula', order: 8, latex: 'f = 3' },

    { type: 'heading', order: 9, level: 2, text: 'Tabla de frecuencias' },
    { type: 'paragraph', order: 10, text: 'Ejemplo: Libros 1 (frecuencia 2), Libros 2 (frecuencia 4), Libros 3 (frecuencia 3), Libros 4 (frecuencia 1). El total de observaciones es:' },
    { type: 'formula', order: 11, latex: '2 + 4 + 3 + 1 = 10' },

    { type: 'heading', order: 12, level: 2, text: 'Frecuencia relativa' },
    { type: 'formula', order: 13, latex: 'f_r = \\dfrac{f}{n}' },
    { type: 'paragraph', order: 14, text: 'Si 8 de 20 estudiantes prefieren Ciencias:' },
    { type: 'formula', order: 15, latex: 'f_r = \\dfrac{8}{20} = 0,4' },
    { type: 'paragraph', order: 16, text: 'También: 40%.' },

    { type: 'heading', order: 17, level: 2, text: 'Frecuencia acumulada' },
    { type: 'paragraph', order: 18, text: 'Si las frecuencias son 2, 3, 4, 1, las acumuladas son 2, 5, 9, 10. La última frecuencia acumulada coincide con el total de datos.' },

    { type: 'heading', order: 19, level: 2, text: 'Gráfico de barras' },
    {
      type: 'paragraph',
      order: 20,
      text: 'Representa categorías o valores mediante barras. La altura de cada barra indica su frecuencia. Es útil para comparar cantidades entre categorías.',
    },

    { type: 'heading', order: 21, level: 2, text: 'Gráfico circular' },
    { type: 'paragraph', order: 22, text: 'Todo el círculo corresponde a 100% o 360°. Si una categoría representa 25%:' },
    { type: 'formula', order: 23, latex: '0,25 \\cdot 360° = 90°' },

    { type: 'heading', order: 24, level: 2, text: 'Gráfico de líneas' },
    {
      type: 'paragraph',
      order: 25,
      text: 'Es útil para observar cambios a través del tiempo. Ejemplos: temperatura durante una semana, ventas mensuales, población a través de años.',
    },

    { type: 'heading', order: 26, level: 2, text: 'Interpretar antes de calcular' },
    {
      type: 'paragraph',
      order: 27,
      text: 'Se puede analizar: mayor frecuencia, menor frecuencia, diferencias, tendencias, proporciones del total. Siempre revisar: título, ejes, unidades, escala.',
    },

    { type: 'heading', order: 28, level: 2, text: 'Idea clave' },
    {
      type: 'paragraph',
      order: 29,
      text: 'Identifica la variable, revisa el total de observaciones, distingue frecuencia absoluta, relativa y acumulada, identifica qué representa cada eje o sector, revisa la escala y compara antes de concluir. Un gráfico puede ser correcto matemáticamente pero inducir una interpretación equivocada si se ignora su escala.',
    },
  ],
  questions: [
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En el conjunto de datos:' },
        { type: 'formula', order: 1, latex: '2,\\ 4,\\ 3,\\ 2,\\ 5,\\ 2,\\ 4' },
        { type: 'paragraph', order: 2, text: '¿cuál es la frecuencia absoluta del valor 2?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '7' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: 'El valor 2 aparece tres veces.' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En una encuesta participaron 20 estudiantes y 5 eligieron Historia como su asignatura favorita. ¿Cuál es la frecuencia relativa de quienes eligieron Historia?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,20' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,25' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,40' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,75' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: 'f_r = \\dfrac{5}{20} = 0,25' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q3',
      order: 2,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: '¿Qué tipo de gráfico es especialmente útil para mostrar cómo cambia una cantidad a través del tiempo?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Gráfico de líneas' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Gráfico circular' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Diagrama de Venn' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tabla de multiplicar' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Un gráfico de líneas permite visualizar fácilmente aumentos, disminuciones y tendencias a través del tiempo.' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una tabla muestra: Valor 1 (frecuencia 3), Valor 2 (frecuencia 5), Valor 3 (frecuencia 4), Valor 4 (frecuencia 2). ¿Cuántos datos contiene la muestra?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '12' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '14' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '16' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '3 + 5 + 4 + 2 = 14' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Las frecuencias absolutas de cuatro categorías son 4, 6, 5, 3. ¿Cuál es la frecuencia acumulada de la tercera categoría?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '15' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '18' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '4 + 6 + 5 = 15' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: 'En una encuesta de 50 personas, 20 eligieron la opción A. ¿Qué porcentaje representa esa opción?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '20%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '40%' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '50%' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '\\dfrac{20}{50} = 0,4' },
        { type: 'formula', order: 1, latex: '0,4 \\cdot 100 = 40\\%' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'En un gráfico circular, una categoría representa el 30% del total. ¿Cuántos grados debe medir su sector?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '30°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '90°' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '108°' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '120°' }, correct: false },
      ],
      explanationContent: [{ type: 'formula', order: 0, latex: '0,30 \\cdot 360° = 108°' }],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una encuesta sobre transporte entrega: Bus 18, Auto 12, Bicicleta 6, Caminando 4 estudiantes. ¿Qué fracción de los estudiantes utiliza bus?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '9/20' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3/10' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1/2' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Total:' },
        { type: 'formula', order: 1, latex: '18 + 12 + 6 + 4 = 40' },
        { type: 'paragraph', order: 2, text: 'Fracción:' },
        { type: 'formula', order: 3, latex: '\\dfrac{18}{40} = \\dfrac{9}{20}' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una tabla muestra la cantidad de horas semanales de estudio de 40 estudiantes: 0–2 horas (6), 3–5 horas (14), 6–8 horas (12), 9–11 horas (8). ¿Qué porcentaje estudia al menos 6 horas semanales?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '20%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '50%' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '70%' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '12 + 8 = 20' },
        { type: 'formula', order: 1, latex: '\\dfrac{20}{40} = 0,5 = 50\\%' },
      ],
    },
    {
      questionKey: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En un gráfico circular, las categorías A, B y C representan 25%, 35% y 20%. El resto corresponde a D. Si participaron 150 personas, ¿cuántas pertenecen a D?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '20' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '40' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '45' }, correct: false },
      ],
      explanationContent: [
        { type: 'formula', order: 0, latex: '100\\% - 25\\% - 35\\% - 20\\% = 20\\%' },
        { type: 'formula', order: 1, latex: '0,20 \\cdot 150 = 30' },
      ],
    },
  ],
};

export default representacionDatos;
