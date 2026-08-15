/**
 * Vuelca el system prompt `AXIOMA_TUTOR_V5` renderizado (los 4 modos, más el
 * bloque de contexto académico en sus dos estados) a
 * `checkpoint/prompt-v5-rendered.txt`, para que `no-overfitting-check.mjs`
 * pueda verificarlo mecánicamente y para que el checkpoint tenga el texto
 * exacto bajo evaluación.
 *
 * NO hace ninguna llamada a Anthropic.
 *
 * Uso (desde apps/backend):
 *   npx tsx ../../experiments/tutor-pedagogy-v5-eval/checkpoint/render-prompt.ts
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AI_ASSISTANCE_MODES, AXIOMA_TUTOR_PROMPT_VERSION, buildSystemPrompt } from '../../../apps/backend/src/ai/ai-pedagogy';

const here = dirname(fileURLToPath(import.meta.url));

// Contexto SINTÉTICO deliberado: no proviene de ningún fixture del dataset, para que
// el volcado contenga únicamente el texto de las INSTRUCCIONES (que es lo que se
// audita por overfitting) y no contenido de evaluación inyectado por el builder.
const syntheticUnanswered = {
  subjectName: '<materia>',
  topicName: '<tema>',
  question: { stemText: '<enunciado>', options: ['<alt 1>', '<alt 2>', '<alt 3>', '<alt 4>'] },
};
const syntheticAnswered = {
  ...syntheticUnanswered,
  question: {
    ...syntheticUnanswered.question,
    studentAnswer: { chosenOptionText: '<alt elegida>', isCorrect: true, explanationText: '<explicación validada>' },
  },
};

const parts: string[] = [`# System prompt renderizado -- ${AXIOMA_TUTOR_PROMPT_VERSION}\n`];
for (const mode of AI_ASSISTANCE_MODES) {
  parts.push(`\n===== MODO ${mode} (sin contexto académico) =====\n`);
  parts.push(buildSystemPrompt({ assistanceMode: mode }));
}
parts.push('\n===== BLOQUE DE CONTEXTO ACADÉMICO -- pregunta NO respondida (protegida) =====\n');
parts.push(buildSystemPrompt({ assistanceMode: 'HINT_FIRST', academicContext: syntheticUnanswered }));
parts.push('\n===== BLOQUE DE CONTEXTO ACADÉMICO -- pregunta YA respondida (protección terminada) =====\n');
parts.push(buildSystemPrompt({ assistanceMode: 'WORKED_SOLUTION', academicContext: syntheticAnswered }));

const out = join(here, 'prompt-v5-rendered.txt');
writeFileSync(out, parts.join('\n'), 'utf8');
console.log(`Escrito: ${out}`);
