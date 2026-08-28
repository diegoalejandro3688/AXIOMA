// PHYSICS-C1A -- Ciencias / U2 "Física", Recurso 5 (order 5 en U2).
// Contenido editorial APROBADO externamente, transcrito verbatim.
//
// Answer keys: R17 -- C B A D C A D B C A.
// Tabla editorial de la Situación B ("Masa / Deformación del resorte")
// representada como filas de párrafo con "|" -- FORMAT_ONLY. Se preservan
// EXACTAMENTE los símbolos Unicode m/s² y Fₙₑₜₐ, y las relaciones P = mg,
// F = kx.
import type { ResourceContentModule, SourceContentBlock } from '../../schema';

type Blk = { type: 'heading'; level: number; text: string } | { type: 'paragraph'; text: string };

function toBlocks(items: Blk[]): SourceContentBlock[] {
  return items.map((b, order) =>
    b.type === 'heading'
      ? ({ type: 'heading', order, level: b.level, text: b.text } as SourceContentBlock)
      : ({ type: 'paragraph', order, text: b.text } as SourceContentBlock),
  );
}

const situacionA: Blk[] = [
  { type: 'heading', level: 3, text: 'Una caja sobre una superficie horizontal' },
  { type: 'paragraph', text: 'Una estudiante colocó una caja de 5,0 kg sobre un piso horizontal.' },
  { type: 'paragraph', text: 'Consideró:' },
  { type: 'paragraph', text: 'g = 10 m/s²' },
  { type: 'paragraph', text: 'Primero dejó la caja en reposo sin aplicar fuerzas horizontales.' },
  { type: 'paragraph', text: 'Luego comenzó a empujarla hacia la derecha.' },
  { type: 'paragraph', text: 'En un primer ensayo aplicó una fuerza horizontal de 15 N y la caja permaneció en reposo.' },
  { type: 'paragraph', text: 'En un segundo ensayo aumentó la fuerza aplicada hasta 30 N y la caja comenzó a deslizarse hacia la derecha.' },
];

const situacionB: Blk[] = [
  { type: 'heading', level: 3, text: 'Un resorte y distintas masas' },
  { type: 'paragraph', text: 'Un grupo de estudiantes colgó distintas masas de un resorte vertical y esperó a que el sistema quedara en reposo.' },
  { type: 'paragraph', text: 'Usaron:' },
  { type: 'paragraph', text: 'g = 10 m/s²' },
  { type: 'paragraph', text: 'Registraron:' },
  { type: 'paragraph', text: '| Masa | Deformación del resorte |' },
  { type: 'paragraph', text: '| 0,10 kg | 0,02 m |' },
  { type: 'paragraph', text: '| 0,20 kg | 0,04 m |' },
  { type: 'paragraph', text: '| 0,30 kg | 0,06 m |' },
  { type: 'paragraph', text: '| 0,40 kg | 0,08 m |' },
  { type: 'paragraph', text: 'Los estudiantes observaron que al aumentar la masa también aumentaba la deformación del resorte.' },
];

const fuerzasContactoPesoRoceElasticidad: ResourceContentModule = {
  kind: 'catalog',
  resourceKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.LECCION',
  resourceType: 'LESSON',
  topicCode: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD',
  unitCode: 'CIENCIAS.FISICA',
  subjectKey: 'ciencias',
  order: 5,
  title: 'Fuerzas de contacto, peso, roce y elasticidad',
  learningObjective:
    'Al finalizar este recurso, el estudiante podrá identificar y analizar fuerzas de contacto y a distancia, relacionando peso, fuerza normal, roce y fuerza elástica con el movimiento o equilibrio de los cuerpos, e interpretar situaciones experimentales sencillas mediante diagramas de fuerzas.',
  contentBlocks: toBlocks([
    { type: 'heading', level: 1, text: 'Fuerzas de contacto, peso, roce y elasticidad' },

    { type: 'heading', level: 2, text: '1. Fuerzas de contacto y a distancia' },
    {
      type: 'paragraph',
      text: 'Las fuerzas pueden clasificarse de manera general según exista o no contacto directo entre los cuerpos. Ejemplos de fuerzas de contacto: fuerza normal; roce; tensión; fuerza elástica. Ejemplo de fuerza a distancia: fuerza gravitatoria. El peso corresponde a una fuerza gravitatoria.',
    },

    { type: 'heading', level: 2, text: '2. Peso' },
    {
      type: 'paragraph',
      text: 'El peso es la fuerza con que un cuerpo celeste atrae gravitatoriamente a un objeto. Cerca de la superficie terrestre puede expresarse como: P = mg donde: P es el peso; m es la masa; g es la aceleración de gravedad. El peso se mide en newton. La masa se mide en kilogramo.',
    },

    { type: 'heading', level: 2, text: '3. Masa y peso no son lo mismo' },
    {
      type: 'paragraph',
      text: 'La masa corresponde a una propiedad del cuerpo relacionada con su inercia. El peso depende del campo gravitatorio. Por eso: la masa puede mantenerse igual al cambiar de lugar; el peso puede cambiar si cambia la aceleración de gravedad. Confundir masa con peso es un error frecuente.',
    },

    { type: 'heading', level: 2, text: '4. Fuerza normal' },
    {
      type: 'paragraph',
      text: 'Cuando un cuerpo está en contacto con una superficie, esta puede ejercer una fuerza perpendicular sobre él. Esta fuerza se denomina: fuerza normal. Su dirección es perpendicular a la superficie. La normal no siempre tiene el mismo valor que el peso. Eso depende de las demás fuerzas y de la aceleración del cuerpo.',
    },

    { type: 'heading', level: 2, text: '5. Roce' },
    {
      type: 'paragraph',
      text: 'La fuerza de roce aparece entre superficies en contacto y se opone al movimiento relativo o a la tendencia de movimiento entre ellas. Puede existir: roce estático; roce cinético. El roce puede permitir acciones como: caminar; frenar; impulsar un vehículo; sostener objetos. Por eso no siempre debe interpretarse como una fuerza “perjudicial”.',
    },

    { type: 'heading', level: 2, text: '6. Roce estático' },
    {
      type: 'paragraph',
      text: 'El roce estático puede impedir que un objeto comience a deslizarse. Su valor puede ajustarse hasta cierto máximo. Por ejemplo, si una persona empuja suavemente una caja y esta no se mueve, el roce estático puede equilibrar horizontalmente la fuerza aplicada.',
    },

    { type: 'heading', level: 2, text: '7. Roce cinético' },
    {
      type: 'paragraph',
      text: 'Cuando dos superficies se deslizan una respecto de la otra, puede actuar roce cinético. Su dirección se opone al movimiento relativo entre las superficies. Si una caja se desliza hacia la derecha sobre un piso horizontal, el roce cinético sobre la caja apunta hacia la izquierda.',
    },

    { type: 'heading', level: 2, text: '8. Fuerza elástica' },
    {
      type: 'paragraph',
      text: 'Un resorte puede ejercer una fuerza cuando se estira o comprime. En un modelo ideal se puede expresar: F = kx en magnitud, donde: F es la fuerza elástica; k es la constante elástica; x es la deformación respecto de la posición de equilibrio. A mayor deformación, mayor magnitud de fuerza en este modelo.',
    },

    { type: 'heading', level: 2, text: '9. Diagramas de cuerpo libre' },
    {
      type: 'paragraph',
      text: 'Un diagrama de cuerpo libre representa las fuerzas que actúan sobre un cuerpo específico. Por ejemplo, para un objeto en reposo sobre una mesa horizontal pueden aparecer: peso hacia abajo; normal hacia arriba. Si ambas tienen igual magnitud y no existen otras fuerzas verticales: Fₙₑₜₐ vertical = 0.',
    },

    { type: 'heading', level: 2, text: '10. Estrategia PAES' },
    {
      type: 'paragraph',
      text: 'Ante una pregunta sobre fuerzas: identifica el cuerpo analizado; separa fuerzas de contacto y a distancia; ubica el peso verticalmente hacia abajo; ubica la normal perpendicular a la superficie; determina si existe roce y su sentido; verifica si el cuerpo está acelerando; no asumas automáticamente que normal = peso.',
    },
  ]),
  questions: [
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿Cuál es aproximadamente el peso de la caja?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '5 N.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10 N.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '50 N.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '500 N.' }, correct: false },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'P = mg = 5,0 kg × 10 m/s² = 50 N.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q2',
      order: 1,
      difficulty: 'FACIL',
      stemContent: toBlocks([
        ...situacionA,
        { type: 'paragraph', text: 'Mientras la caja está en reposo sobre el piso y no existen otras fuerzas verticales, ¿qué fuerza equilibra su peso?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El roce.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fuerza normal.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La fuerza elástica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La fuerza aplicada horizontal.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La superficie ejerce una fuerza normal hacia arriba que puede equilibrar el peso hacia abajo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q3',
      order: 2,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'En el primer ensayo, la estudiante aplica 15 N hacia la derecha y la caja permanece en reposo. ¿Qué magnitud debe tener el roce estático horizontal en ese momento?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '15 N.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0 N.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '30 N.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '50 N.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Si la caja permanece en reposo, la fuerza neta horizontal es cero, por lo que el roce estático debe equilibrar los 15 N aplicados.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q4',
      order: 3,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionA, { type: 'paragraph', text: '¿En qué dirección actúa el roce sobre la caja cuando esta se desliza hacia la derecha?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Hacia arriba.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Hacia abajo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Hacia la derecha.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Hacia la izquierda.' }, correct: true },
      ],
      explanationContent: [
        { type: 'paragraph', order: 0, text: 'El roce cinético se opone al movimiento relativo de la caja respecto del piso.' },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q5',
      order: 4,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionA,
        {
          type: 'paragraph',
          text: 'Durante el segundo ensayo, la fuerza aplicada es 30 N hacia la derecha y el roce cinético tiene magnitud 18 N. ¿Cuál es la aceleración de la caja?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,4 m/s².' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2,0 m/s².' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2,4 m/s².' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '9,6 m/s².' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La fuerza neta es 30 N − 18 N = 12 N. Luego, a = Fₙₑₜₐ/m = 12 N / 5,0 kg = 2,4 m/s².',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q6',
      order: 5,
      difficulty: 'FACIL',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué fuerza hace que la masa sea atraída hacia abajo?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'El peso.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La fuerza normal.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El roce.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Una fuerza magnética necesariamente.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La Tierra ejerce sobre la masa una fuerza gravitatoria hacia abajo, correspondiente al peso.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q7',
      order: 6,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Cuando una masa permanece en reposo colgada del resorte, ¿qué relación existe entre la fuerza elástica y el peso, si se desprecia cualquier otra fuerza vertical?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'La fuerza elástica es siempre cero.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'El peso debe ser mayor que la fuerza elástica.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Ambas fuerzas apuntan hacia abajo.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Tienen igual magnitud y sentidos opuestos.' }, correct: true },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'En equilibrio la fuerza neta es cero, por lo que la fuerza elástica hacia arriba equilibra el peso hacia abajo.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q8',
      order: 7,
      difficulty: 'MEDIA',
      stemContent: toBlocks([...situacionB, { type: 'paragraph', text: '¿Qué patrón muestran los datos?' }]),
      options: [
        { content: { type: 'paragraph', order: 0, text: 'Al duplicar la masa, la deformación disminuye a la mitad.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'Al duplicar la masa, la deformación también se duplica.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: 'La deformación permanece constante.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: 'La masa no se relaciona con la deformación.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Por ejemplo, al pasar de 0,10 kg a 0,20 kg, la deformación pasa de 0,02 m a 0,04 m.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q9',
      order: 8,
      difficulty: 'MEDIA',
      stemContent: toBlocks([
        ...situacionB,
        { type: 'paragraph', text: 'Usando los datos del primer ensayo, ¿cuál es aproximadamente la constante elástica del resorte?' },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '5 N/m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '10 N/m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '50 N/m.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '500 N/m.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'La masa de 0,10 kg tiene un peso de 1 N. En equilibrio, F = kx, por lo que k = 1 N / 0,02 m = 50 N/m.',
        },
      ],
    },
    {
      questionKey: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD.Q10',
      order: 9,
      difficulty: 'DIFICIL',
      stemContent: toBlocks([
        ...situacionB,
        {
          type: 'paragraph',
          text: 'Si se cuelga una masa de 0,50 kg y el resorte mantiene el mismo comportamiento lineal observado, ¿qué deformación se esperaría?',
        },
      ]),
      options: [
        { content: { type: 'paragraph', order: 0, text: '0,10 m.' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '0,50 m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '2,5 m.' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '5,0 m.' }, correct: false },
      ],
      explanationContent: [
        {
          type: 'paragraph',
          order: 0,
          text: 'Una masa de 0,50 kg pesa 5 N. Con k = 50 N/m, x = F/k = 5 N / 50 N/m = 0,10 m.',
        },
      ],
    },
  ],
};

export default fuerzasContactoPesoRoceElasticidad;
