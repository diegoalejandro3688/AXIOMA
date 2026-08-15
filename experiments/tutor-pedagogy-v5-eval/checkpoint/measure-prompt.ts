/**
 * Medición determinista del tamaño del system prompt vigente (`AXIOMA_TUTOR_V5`).
 *
 * NO hace ninguna llamada a Anthropic: importa `ai-pedagogy.ts` y mide el texto
 * renderizado. El ratio caracteres/token es el MISMO derivado empíricamente en
 * V4 a partir de llamadas reales en español (~2,5 car./token, ver
 * `experiments/tutor-pedagogy-v4-eval/cost-plan.json`), para que la comparación
 * V4 -> V5 use una sola vara.
 *
 * Uso (desde apps/backend):
 *   npx tsx ../../experiments/tutor-pedagogy-v5-eval/checkpoint/measure-prompt.ts
 */
import { buildAssistanceInstructionBlock, buildSystemPrompt, AXIOMA_TUTOR_PROMPT_VERSION, AI_ASSISTANCE_MODES } from '../../../apps/backend/src/ai/ai-pedagogy';

const CHARS_PER_TOKEN = 2.5;
const tok = (chars: number) => Math.round(chars / CHARS_PER_TOKEN);

// Bloque base = prompt sin contexto académico menos el bloque del modo (y el separador '\n\n').
const hintBlock = buildAssistanceInstructionBlock('HINT_FIRST');
const baseChars = buildSystemPrompt({ assistanceMode: 'HINT_FIRST' }).length - hintBlock.length - 2;

const question = {
  subjectName: 'Materia de prueba',
  topicName: 'Tema de prueba',
  question: {
    stemText: 'Enunciado sintético de prueba, no proveniente de ningún fixture de evaluación.',
    options: ['alternativa 1', 'alternativa 2', 'alternativa 3', 'alternativa 4'],
  },
};

console.log(`promptVersion: ${AXIOMA_TUTOR_PROMPT_VERSION}`);
console.log(`ratio usado: ${CHARS_PER_TOKEN} caracteres/token (empírico V4, español)\n`);
console.log(`Bloque base                 ${String(baseChars).padStart(6)} car.  ~${tok(baseChars)} tok`);
for (const mode of AI_ASSISTANCE_MODES) {
  const chars = buildAssistanceInstructionBlock(mode).length;
  console.log(`${mode.padEnd(24)}    ${String(chars).padStart(6)} car.  ~${tok(chars)} tok`);
}
console.log('');
for (const mode of AI_ASSISTANCE_MODES) {
  const chars = buildSystemPrompt({ assistanceMode: mode, academicContext: question }).length;
  console.log(`Prompt COMPLETO (contexto de pregunta) + ${mode.padEnd(24)} ${String(chars).padStart(6)} car.  ~${tok(chars)} tok`);
}
