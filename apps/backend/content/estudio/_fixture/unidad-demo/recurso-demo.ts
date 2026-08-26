// CONTENT-4.1 -- Fixture MÍNIMO para probar `verify-content-source-gate.ts`.
// NO es catálogo real (ver manifest.ts, subjectKey "fixture"). NO se
// importa a Postgres por este incremento -- CONTENT-4.2 es quien lo haría,
// y ni siquiera se planea que este fixture llegue a producción.
import type { ResourceContentModule } from '../../../schema';

const recursoDemo: ResourceContentModule = {
  kind: 'fixture',
  resourceKey: 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO.LECCION',
  resourceType: 'LESSON',
  topicCode: 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO',
  unitCode: 'FIXTURE.UNIDAD_DEMO',
  subjectKey: 'fixture',
  order: 1,
  title: '[FIXTURE] Recurso demo',
  learningObjective: 'Servir como fixture mínimo para el gate pre-BD de CONTENT-4.1 -- sin valor pedagógico real.',
  contentBlocks: [
    { type: 'heading', order: 0, text: '[FIXTURE] Recurso demo', level: 1 },
    { type: 'paragraph', order: 1, text: 'Contenido de prueba, sin valor pedagógico real.' },
    { type: 'formula', order: 2, latex: 'x^2 + y^2 = z^2' },
  ],
  questions: [
    {
      questionKey: 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '[FIXTURE] ¿Cuánto es 1 + 1?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: '[FIXTURE] 1 + 1 = 2 por definición de la suma.' }],
    },
    {
      questionKey: 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO.Q2',
      order: 1,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '[FIXTURE] ¿Cuál es la raíz cuadrada de 9?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '81' }, correct: false },
        { content: { type: 'formula', order: 0, latex: '\\sqrt{3}' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: '[FIXTURE] 3 x 3 = 9, por lo tanto la raíz cuadrada de 9 es 3.' }],
    },
  ],
};

export default recursoDemo;
