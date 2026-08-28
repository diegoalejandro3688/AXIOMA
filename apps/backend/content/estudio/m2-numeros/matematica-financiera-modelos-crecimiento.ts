// M2-C1A -- Golden Unit M2 / Números, Recurso 2 (order 2 en U1). Contenido
// editorial APROBADO externamente, transcrito verbatim. Ajustes solo
// técnicos: contentBlocks (heading/paragraph/formula), LaTeX en `latex`,
// questionKey sin padding.
//
// Answer key: R2 -- C B A B B C B C B B  ("CBABBCBCBB").
// Q10 = B (respuesta correcta DEFINITIVA tras revisión editorial:
// "El Plan B entrega un monto final mayor"; 1,10^2 = 1,21 > 1,12 x 1,08 =
// 1,2096). Sin notas de "corrección" en el recurso final.
// Dificultad: 2 FACIL / 4 MEDIA / 4 DIFICIL.
import type { ResourceContentModule } from '../../schema';

const matematicaFinancieraModelosCrecimiento: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO',
  unitCode: 'M2.NUMEROS',
  subjectKey: 'matematica',
  order: 2,
  title: 'Matemática financiera y modelos de crecimiento',
  learningObjective:
    'Resolver e interpretar problemas de crecimiento y decrecimiento porcentual, interés compuesto, ahorro, créditos y modelos exponenciales, utilizando potencias, porcentajes y logaritmos para comparar alternativas y determinar valores futuros o tiempos de crecimiento.',
  contentBlocks: [
    { type: 'heading', order: 0, level: 1, text: 'Matemática financiera y modelos de crecimiento' },

    { type: 'heading', order: 1, level: 2, text: '1. Variaciones porcentuales sucesivas' },
    {
      type: 'paragraph',
      order: 2,
      text: 'Cuando una cantidad aumenta o disminuye un porcentaje, es útil representarlo mediante un factor multiplicativo. Si una cantidad aumenta un r\\%, se multiplica por:',
    },
    { type: 'formula', order: 3, latex: '1+\\frac{r}{100}' },
    { type: 'paragraph', order: 4, text: 'Por ejemplo, un aumento del 12\\% corresponde al factor:' },
    { type: 'formula', order: 5, latex: '1,12' },
    { type: 'paragraph', order: 6, text: 'Si disminuye un r\\%, se multiplica por:' },
    { type: 'formula', order: 7, latex: '1-\\frac{r}{100}' },
    { type: 'paragraph', order: 8, text: 'Por ejemplo, una disminución del 20\\% corresponde al factor:' },
    { type: 'formula', order: 9, latex: '0,80' },
    { type: 'paragraph', order: 10, text: 'Cuando ocurren varias variaciones consecutivas, los factores se multiplican.' },

    { type: 'heading', order: 11, level: 2, text: '2. Un aumento y una disminución iguales no se anulan' },
    { type: 'paragraph', order: 12, text: 'Supongamos que una cantidad inicial es 100. Si aumenta un 20\\%:' },
    { type: 'formula', order: 13, latex: '100\\cdot1,20=120' },
    { type: 'paragraph', order: 14, text: 'Si posteriormente disminuye un 20\\%:' },
    { type: 'formula', order: 15, latex: '120\\cdot0,80=96' },
    {
      type: 'paragraph',
      order: 16,
      text: 'El resultado no vuelve a ser 100. Esto ocurre porque el segundo porcentaje se calcula sobre una base distinta. En general:',
    },
    { type: 'formula', order: 17, latex: '(1+r)(1-r)=1-r^2' },
    {
      type: 'paragraph',
      order: 18,
      text: 'cuando r se expresa como número decimal. Por eso, un aumento y una disminución porcentual iguales producen una disminución neta.',
    },

    { type: 'heading', order: 19, level: 2, text: '3. Crecimiento porcentual repetido' },
    {
      type: 'paragraph',
      order: 20,
      text: 'Si una cantidad inicial C_0 aumenta siempre en la misma proporción r, después de n períodos puede modelarse mediante:',
    },
    { type: 'formula', order: 21, latex: 'C_n=C_0(1+r)^n' },
    {
      type: 'paragraph',
      order: 22,
      text: 'Por ejemplo, si una población inicial de 5000 individuos aumenta un 4\\% anual:',
    },
    { type: 'formula', order: 23, latex: 'C_n=5000(1,04)^n' },
    {
      type: 'paragraph',
      order: 24,
      text: 'Este tipo de modelo es exponencial porque el factor de crecimiento se aplica repetidamente sobre el valor acumulado.',
    },

    { type: 'heading', order: 25, level: 2, text: '4. Decrecimiento porcentual repetido' },
    { type: 'paragraph', order: 26, text: 'Si una cantidad disminuye en una proporción constante r, se utiliza:' },
    { type: 'formula', order: 27, latex: 'C_n=C_0(1-r)^n' },
    { type: 'paragraph', order: 28, text: 'Por ejemplo, si un dispositivo pierde un 15\\% de su valor cada año:' },
    { type: 'formula', order: 29, latex: 'V_n=V_0(0,85)^n' },
    {
      type: 'paragraph',
      order: 30,
      text: 'La cantidad disminuye cada período, pero la disminución absoluta no es siempre la misma, porque se calcula sobre el valor restante.',
    },

    { type: 'heading', order: 31, level: 2, text: '5. Interés simple e interés compuesto' },
    {
      type: 'paragraph',
      order: 32,
      text: 'En el interés simple, los intereses se calculan siempre sobre el capital inicial. Si un capital C genera una tasa r por período durante n períodos:',
    },
    { type: 'formula', order: 33, latex: 'M=C(1+rn)' },
    {
      type: 'paragraph',
      order: 34,
      text: 'En cambio, en el interés compuesto los intereses obtenidos pasan a formar parte del capital. Entonces:',
    },
    { type: 'formula', order: 35, latex: 'M=C(1+r)^n' },
    { type: 'paragraph', order: 36, text: 'La diferencia se vuelve más importante a medida que aumenta el número de períodos.' },

    { type: 'heading', order: 37, level: 2, text: '6. Capitalización y frecuencia de los períodos' },
    {
      type: 'paragraph',
      order: 38,
      text: 'La tasa debe estar expresada para el mismo período que se utiliza en el exponente. Por ejemplo, si una inversión crece un 2\\% mensual durante 6 meses:',
    },
    { type: 'formula', order: 39, latex: 'M=C(1,02)^6' },
    {
      type: 'paragraph',
      order: 40,
      text: 'No sería correcto usar directamente una tasa anual junto con un número de meses sin realizar primero la conversión apropiada. Siempre debe existir coherencia entre: la tasa; la unidad de tiempo; el número de períodos.',
    },

    { type: 'heading', order: 41, level: 2, text: '7. Valor futuro y comparación de alternativas' },
    {
      type: 'paragraph',
      order: 42,
      text: 'Dos alternativas financieras pueden tener diferentes tasas, plazos o formas de crecimiento. Por ejemplo:',
    },
    { type: 'paragraph', order: 43, text: 'Plan A:' },
    { type: 'formula', order: 44, latex: 'A_n=100000(1,05)^n' },
    { type: 'paragraph', order: 45, text: 'Plan B:' },
    { type: 'formula', order: 46, latex: 'B_n=110000(1,03)^n' },
    {
      type: 'paragraph',
      order: 47,
      text: 'Aunque el Plan B comienza con una cantidad mayor, el Plan A crece a una tasa superior. Por eso, no basta comparar solamente los valores iniciales: también debe estudiarse la evolución en el tiempo.',
    },

    { type: 'heading', order: 48, level: 2, text: '8. Créditos y costo total' },
    {
      type: 'paragraph',
      order: 49,
      text: 'En un crédito, el monto recibido inicialmente no necesariamente coincide con el monto total pagado. Si una persona recibe:',
    },
    { type: 'paragraph', order: 50, text: '$600 000' },
    { type: 'paragraph', order: 51, text: 'y paga 12 cuotas de:' },
    { type: 'paragraph', order: 52, text: '$57 000' },
    { type: 'paragraph', order: 53, text: 'entonces el total pagado es:' },
    { type: 'formula', order: 54, latex: '12\\cdot57000=\\$684000' },
    { type: 'paragraph', order: 55, text: 'La diferencia:' },
    { type: 'formula', order: 56, latex: '684000-600000=\\$84000' },
    {
      type: 'paragraph',
      order: 57,
      text: 'representa un costo adicional respecto del monto recibido. En problemas reales pueden intervenir intereses, comisiones y otros cargos, por lo que es importante identificar exactamente qué cantidades se están comparando.',
    },

    { type: 'heading', order: 58, level: 2, text: '9. Uso de logaritmos para encontrar el tiempo' },
    { type: 'paragraph', order: 59, text: 'En un modelo exponencial:' },
    { type: 'formula', order: 60, latex: 'C_n=C_0(1+r)^n' },
    { type: 'paragraph', order: 61, text: 'a veces la incógnita es n. Por ejemplo:' },
    { type: 'formula', order: 62, latex: '1000(1,10)^n=2000' },
    { type: 'paragraph', order: 63, text: 'Dividiendo por 1000:' },
    { type: 'formula', order: 64, latex: '(1,10)^n=2' },
    { type: 'paragraph', order: 65, text: 'Entonces:' },
    { type: 'formula', order: 66, latex: 'n=\\frac{\\log(2)}{\\log(1,10)}' },
    {
      type: 'paragraph',
      order: 67,
      text: 'Los logaritmos permiten despejar exponentes cuando no es posible obtenerlos directamente mediante potencias conocidas.',
    },

    { type: 'heading', order: 68, level: 2, text: '10. Interpretación de modelos exponenciales' },
    { type: 'paragraph', order: 69, text: 'Una expresión como:' },
    { type: 'formula', order: 70, latex: 'P(t)=800(1,06)^t' },
    {
      type: 'paragraph',
      order: 71,
      text: 'entrega información directa: 800 es el valor inicial; 1,06 es el factor de crecimiento; la tasa de crecimiento es 6\\% por período; t representa el número de períodos. En cambio:',
    },
    { type: 'formula', order: 72, latex: 'Q(t)=800(0,94)^t' },
    {
      type: 'paragraph',
      order: 73,
      text: 'representa una disminución del 6\\% por período. Interpretar correctamente los parámetros permite comprender el fenómeno sin necesidad de calcular muchos valores.',
    },

    { type: 'heading', order: 74, level: 3, text: 'Situación ZETRYND 1 — Fondo para equipamiento' },
    { type: 'paragraph', order: 75, text: 'Un centro educativo dispone inicialmente de:' },
    { type: 'paragraph', order: 76, text: '$2 000 000' },
    { type: 'paragraph', order: 77, text: 'para renovar equipamiento. El dinero se mantiene en un fondo que crece un 3\\% mensual. Después de n meses, el monto puede modelarse por:' },
    { type: 'formula', order: 78, latex: 'F(n)=2\\,000\\,000(1,03)^n' },
    { type: 'paragraph', order: 79, text: 'Después de 6 meses:' },
    { type: 'formula', order: 80, latex: 'F(6)=2\\,000\\,000(1,03)^6' },
    { type: 'paragraph', order: 81, text: 'Como:' },
    { type: 'formula', order: 82, latex: '(1,03)^6\\approx1,194' },
    { type: 'paragraph', order: 83, text: 'se obtiene aproximadamente:' },
    { type: 'formula', order: 84, latex: 'F(6)\\approx\\$2\\,388\\,000' },
    {
      type: 'paragraph',
      order: 85,
      text: 'El aumento total no corresponde simplemente a 6\\cdot3\\%=18\\%, porque cada mes el crecimiento se aplica sobre el monto acumulado.',
    },

    { type: 'heading', order: 86, level: 3, text: 'Situación ZETRYND 2 — Pérdida de valor de un equipo' },
    { type: 'paragraph', order: 87, text: 'Un equipo tecnológico tiene un valor inicial de:' },
    { type: 'paragraph', order: 88, text: '$900 000' },
    { type: 'paragraph', order: 89, text: 'y pierde un 12\\% de su valor cada año. Su valor después de t años se modela mediante:' },
    { type: 'formula', order: 90, latex: 'V(t)=900\\,000(0,88)^t' },
    { type: 'paragraph', order: 91, text: 'Después del primer año:' },
    { type: 'formula', order: 92, latex: 'V(1)=900\\,000(0,88)=\\$792\\,000' },
    { type: 'paragraph', order: 93, text: 'Después del segundo año:' },
    { type: 'formula', order: 94, latex: 'V(2)=900\\,000(0,88)^2' },
    {
      type: 'paragraph',
      order: 95,
      text: 'La segunda disminución del 12\\% se calcula sobre los $792 000, no nuevamente sobre los $900 000 iniciales.',
    },
  ],
  questions: [
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Un producto cuesta inicialmente $50 000 y aumenta su precio en un 10\\%. ¿Cuál es su nuevo precio?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$50 010' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$50 500' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$55 000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$60 000' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Un aumento del 10\\% corresponde a multiplicar por 1,10:' },
        { type: 'formula', order: 1, latex: '50000\\cdot1,10=55000' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una cantidad disminuye un 25\\%. ¿Cuál es el factor multiplicativo que representa esta disminución?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,25' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '0,75' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '1,25' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '1,75' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Si una cantidad disminuye un 25\\%, permanece el 75\\% de su valor:' },
        { type: 'formula', order: 1, latex: '1-0,25=0,75' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un artículo cuesta inicialmente $80 000. Su precio aumenta un 20\\% y luego disminuye un 20\\%. ¿Cuál es el precio final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$76 800' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$80 000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$83 200' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$96 000' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Primero:' },
        { type: 'formula', order: 1, latex: '80000(1,20)=96000' },
        { type: 'paragraph', order: 2, text: 'Luego:' },
        { type: 'formula', order: 3, latex: '96000(0,80)=76800' },
        { type: 'paragraph', order: 4, text: 'Los porcentajes iguales no se anulan porque se aplican sobre cantidades diferentes.' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una inversión de $200 000 crece a una tasa compuesta del 5\\% anual. ¿Cuál expresión representa su valor después de 4 años?',
        },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: '200000(1+0,05\\cdot4)' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '200000(1,05)^4' }, correct: true },
        { content: { type: 'formula', order: 0, latex: '200000(0,95)^4' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '200000+1,05^4' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'En interés compuesto se utiliza:' },
        { type: 'formula', order: 1, latex: 'M=C(1+r)^n' },
        { type: 'paragraph', order: 2, text: 'Por lo tanto:' },
        { type: 'formula', order: 3, latex: 'M=200000(1,05)^4' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q5',
      order: 4,
      difficulty: 'MEDIA',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Un computador tiene un valor inicial de $1 000 000 y pierde un 10\\% de su valor cada año. ¿Cuál es su valor después de 2 años?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '$800 000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$810 000' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '$820 000' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '$900 000' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Cada año conserva el 90\\% de su valor:' },
        { type: 'formula', order: 1, latex: '1000000(0,9)^2=1000000(0,81)=810000' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q6',
      order: 5,
      difficulty: 'MEDIA',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Dos inversiones se modelan mediante:' },
        { type: 'formula', order: 1, latex: 'A(t)=500000(1,04)^t' },
        { type: 'formula', order: 2, latex: 'B(t)=500000(1,06)^t' },
        { type: 'paragraph', order: 3, text: 'para t>0. ¿Cuál afirmación es correcta?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 'A(t)>B(t) \\ \\text{para todo}\\ t>0' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'A(t)=B(t) \\ \\text{para todo}\\ t>0' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'B(t)>A(t) \\ \\text{para todo}\\ t>0' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'No puede compararse sin conocer un valor específico de t' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Ambas inversiones comienzan con el mismo capital, pero B tiene un factor de crecimiento mayor:' },
        { type: 'formula', order: 1, latex: '1,06>1,04' },
        { type: 'paragraph', order: 2, text: 'Por eso, para cualquier t>0:' },
        { type: 'formula', order: 3, latex: 'B(t)>A(t)' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q7',
      order: 6,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una inversión aumenta un 10\\% durante el primer año y luego disminuye un 10\\% durante el segundo año. Si el capital inicial es C, ¿qué porcentaje del capital inicial representa el valor final?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: '90\\%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '99\\%' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '100\\%' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '101\\%' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El valor final es:' },
        { type: 'formula', order: 1, latex: 'C(1,10)(0,90)=C(0,99)' },
        { type: 'paragraph', order: 2, text: 'Por lo tanto, queda el 99\\% del capital inicial.' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q8',
      order: 7,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una población se modela mediante:' },
        { type: 'formula', order: 1, latex: 'P(t)=1200(1,05)^t' },
        { type: 'paragraph', order: 2, text: 'Otra población se modela mediante:' },
        { type: 'formula', order: 3, latex: 'Q(t)=1500(1,02)^t' },
        { type: 'paragraph', order: 4, text: '¿Cuál afirmación describe correctamente la situación?' },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'P(t) siempre es mayor porque su tasa de crecimiento es mayor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Q(t) siempre es mayor porque comienza con más individuos.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Es posible que P(t) supere a Q(t) después de suficiente tiempo.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Las dos poblaciones necesariamente serán iguales después de un período.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Q comienza con un valor mayor, pero P crece más rápido. Como:' },
        { type: 'formula', order: 1, latex: '1,05>1,02' },
        {
          type: 'paragraph',
          order: 2,
          text: 'es posible que el crecimiento acumulado de P haga que eventualmente supere a Q.',
        },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q9',
      order: 8,
      difficulty: 'DIFICIL',
      stemContent: [
        { type: 'paragraph', order: 0, text: 'Una cantidad inicial de 400 crece según el modelo:' },
        { type: 'formula', order: 1, latex: 'C(t)=400(1,08)^t' },
        { type: 'paragraph', order: 2, text: '¿qué expresión permite determinar el tiempo t necesario para que la cantidad alcance 800?' },
      ],
      options: [
        { content: { type: 'formula', order: 0, latex: 't=\\frac{\\log(1,08)}{\\log(2)}' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 't=\\frac{\\log(2)}{\\log(1,08)}' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 't=\\log(800-400)' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 't=\\frac{800}{400(1,08)}' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Se plantea:' },
        { type: 'formula', order: 1, latex: '400(1,08)^t=800' },
        { type: 'paragraph', order: 2, text: 'Dividiendo por 400:' },
        { type: 'formula', order: 3, latex: '(1,08)^t=2' },
        { type: 'paragraph', order: 4, text: 'Aplicando logaritmos:' },
        { type: 'formula', order: 5, latex: 't\\log(1,08)=\\log(2)' },
        { type: 'paragraph', order: 6, text: 'Entonces:' },
        { type: 'formula', order: 7, latex: 't=\\frac{\\log(2)}{\\log(1,08)}' },
      ],
    },
    {
      questionKey: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una inversión inicial de $100 000 puede colocarse en uno de dos planes durante 2 años. Plan A: aumenta un 12\\% el primer año y un 8\\% el segundo. Plan B: aumenta un 10\\% cada año. ¿Cuál afirmación es correcta?',
        },
      ],
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El Plan A entrega un monto final mayor.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El Plan B entrega un monto final mayor.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'Ambos entregan exactamente el mismo monto.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'No es posible compararlos sin conocer el interés simple.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'Para el Plan A:' },
        { type: 'formula', order: 1, latex: '100000(1,12)(1,08)' },
        { type: 'paragraph', order: 2, text: 'El factor total es:' },
        { type: 'formula', order: 3, latex: '1,2096' },
        { type: 'paragraph', order: 4, text: 'Para el Plan B:' },
        { type: 'formula', order: 5, latex: '100000(1,10)^2' },
        { type: 'formula', order: 6, latex: '(1,10)^2=1,21' },
        { type: 'paragraph', order: 7, text: 'Comparando:' },
        { type: 'formula', order: 8, latex: '1,21>1,2096' },
        { type: 'paragraph', order: 9, text: 'Por lo tanto, el Plan B entrega un monto final mayor.' },
      ],
    },
  ],
};

export default matematicaFinancieraModelosCrecimiento;
