// CONTENT-4.2B -- Recurso TÉCNICO de validación del importer
// (`scripts/import-content.ts`), NO es catálogo académico V1. `kind:
// 'validation'` (antes 'catalog' en CONTENT-4.2 original; ajuste
// obligatorio de CONTENT-4.2B punto 9/10: 'validation' nunca cuenta en
// coverage y solo se importa con `--resource ... --allow-validation`
// explícito), aislado en su propia materia técnica `zztest` (ver
// manifest.ts) -- imposible de confundir con M1/M2/Lenguaje/Ciencias/
// Historia. Sin imágenes (CONTENT-4.2 no implementa pipeline de assets).
// Incluye UNA fórmula para ejercitar la normalización LaTeX/SVG del
// importer (punto 10 del incremento original).
import type { ResourceContentModule } from '../../../schema';

const pipelineCheck: ResourceContentModule = {
  kind: 'validation',
  resourceKey: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.LECCION',
  resourceType: 'CONCEPT_EXPLANATION',
  topicCode: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK',
  unitCode: 'ZZTEST.IMPORT_VALIDATION',
  subjectKey: 'zztest',
  order: 1,
  title: '[ZZTEST] Verificación técnica del importer',
  learningObjective: 'Servir como recurso técnico controlado para demostrar CREATE/NO-OP/NEW VERSION de import-content.ts (CONTENT-4.2) -- sin valor académico.',
  contentBlocks: [
    { type: 'heading', order: 0, text: '[ZZTEST] Verificación técnica del importer', level: 1 },
    { type: 'paragraph', order: 1, text: 'Contenido técnico de prueba para CONTENT-4.2, sin valor pedagógico real.' },
    { type: 'formula', order: 2, latex: 'a^2 + b^2 = c^2' },
  ],
  questions: [
    {
      questionKey: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q1',
      order: 0,
      difficulty: 'FACIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] Pregunta técnica 1: ¿cuánto es 2 + 2?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '4' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '5' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] 2 + 2 = 4 por definición de la suma.' }],
    },
    {
      questionKey: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q2',
      order: 1,
      difficulty: 'MEDIA',
      stemContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] Pregunta técnica 2: en un triángulo rectángulo, ¿qué relaciona a, b y c?' }],
      options: [
        { content: { type: 'formula', order: 0, latex: 'a^2 + b^2 = c^2' }, correct: true },
        { content: { type: 'formula', order: 0, latex: 'a + b = c' }, correct: false },
        { content: { type: 'formula', order: 0, latex: 'a \\times b = c' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] El teorema de Pitágoras relaciona los catetos y la hipotenusa de un triángulo rectángulo.' }],
    },
    {
      questionKey: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK.Q3',
      order: 2,
      difficulty: 'DIFICIL',
      stemContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] Pregunta técnica 3: ¿cuál es el resultado de 12 / 4 - 1?' }],
      options: [
        { content: { type: 'paragraph', order: 0, text: '2' }, correct: true },
        { content: { type: 'paragraph', order: 0, text: '3' }, correct: false },
        { content: { type: 'paragraph', order: 0, text: '8' }, correct: false },
      ],
      explanationContent: [{ type: 'paragraph', order: 0, text: '[ZZTEST] Por precedencia de operadores, primero 12 / 4 = 3, luego 3 - 1 = 2.' }],
    },
  ],
};

export default pipelineCheck;
