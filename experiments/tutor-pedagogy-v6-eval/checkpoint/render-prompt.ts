import { buildSystemPrompt, buildAssistanceInstructionBlock, AI_ASSISTANCE_MODES, AXIOMA_TUTOR_PROMPT_VERSION } from '../../../apps/backend/src/ai/ai-pedagogy';
const ctxUn = { subjectName: 'Matemática', topicName: 'Porcentajes', question: { stemText: '¿Cuánto es el 20% de 150?', options: ['20','30','35','150'] } };
const ctxAns = { subjectName: 'Matemática', topicName: 'Porcentajes', question: { stemText: '¿Cuánto es el 20% de 150?', options: ['20','30','35','150'], studentAnswer: { chosenOptionText: '30', isCorrect: true, explanationText: '20% de 150 = 150 x 20 / 100 = 30.' } } };
const out: string[] = [];
out.push(`VERSION: ${AXIOMA_TUTOR_PROMPT_VERSION}`);
const base = buildSystemPrompt({ assistanceMode: 'HINT_FIRST' }).replace(buildAssistanceInstructionBlock('HINT_FIRST'), '').trim();
out.push(`\n### BLOQUE BASE (${base.length} caracteres)\n${base}`);
for (const m of AI_ASSISTANCE_MODES) { const b = buildAssistanceInstructionBlock(m); out.push(`\n### MODO ${m} (${b.length} caracteres)\n${b}`); }
out.push(`\n### PROMPT COMPLETO -- WORKED_SOLUTION + pregunta NO respondida (${buildSystemPrompt({academicContext:ctxUn,assistanceMode:'WORKED_SOLUTION'}).length} caracteres)\n${buildSystemPrompt({academicContext:ctxUn,assistanceMode:'WORKED_SOLUTION'})}`);
out.push(`\n### PROMPT COMPLETO -- HINT_FIRST + pregunta YA respondida (${buildSystemPrompt({academicContext:ctxAns,assistanceMode:'HINT_FIRST'}).length} caracteres)\n${buildSystemPrompt({academicContext:ctxAns,assistanceMode:'HINT_FIRST'})}`);
console.log(out.join('\n'));
console.error(`MEDIDAS base=${base.length} ` + AI_ASSISTANCE_MODES.map(m=>`${m}=${buildAssistanceInstructionBlock(m).length}`).join(' ') + ` ctxUn=${buildSystemPrompt({academicContext:ctxUn,assistanceMode:'HINT_FIRST'}).length} ctxAns=${buildSystemPrompt({academicContext:ctxAns,assistanceMode:'HINT_FIRST'}).length}`);
