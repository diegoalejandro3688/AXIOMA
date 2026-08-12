// Gate de LEF Bloque VI, Incremento 5 ("Comportamiento pedagógico") -- ver
// docs/adr/LEF-BLOCK-VI-DEFINITION.md §25. Mayoritariamente contra
// FakeAiProvider (determinista, sin red, sin coste) -- verifica ESTRUCTURA
// (versión de prompt trazable, selección de modo, disclaimer, persistencia/
// idempotencia del modo solicitado), NUNCA la calidad pedagógica real del
// modelo (eso pertenece al gate de integración real de Incremento 2,
// deliberadamente fuera de esta regresión rutinaria -- ver
// ai-pedagogy.ts, sección "(A) vs (B)" al inicio del archivo).
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX } from '../src/ai/fake-ai-provider';
import {
  AXIOMA_TUTOR_PROMPT_VERSION,
  AXIOMA_TUTOR_DISCLAIMER,
  buildAssistanceInstructionBlock,
  buildSystemPrompt,
  resolveEffectiveAssistanceMode,
} from '../src/ai/ai-pedagogy';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown, attempt = 0): Promise<{ status: number; body: any; raw: string }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
    return req(method, path, headers, body, attempt + 1);
  }
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `ai-pedagogy-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function lastModeFor(content: string): Promise<unknown> {
  const r = await req('GET', `/ai/_internal/fake-provider-last-mode?content=${encodeURIComponent(content)}`, { 'x-internal-ops-key': opsKey });
  return r.body?.mode;
}

async function sendMessage(headers: Record<string, string>, conversationId: string, content: string, requestedMode?: string) {
  return req('POST', `/ai/me/conversations/${conversationId}/messages`, headers, {
    content,
    operationId: randomUUID(),
    ...(requestedMode ? { requestedMode } : {}),
  });
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ------------------------------------------------------------------
  // 0. Verificación PURA (sin backend/red): garantía (A) determinista a
  // nivel de texto -- MODO POR DEFECTO SIN AMBIGÜEDAD (revisión del Product
  // Owner): `requestedMode` ausente/null resuelve EXACTAMENTE a la política
  // HINT_FIRST, byte a byte -- nunca una quinta semántica distinta.
  // WORKED_SOLUTION NUNCA aparece en la instrucción salvo solicitud
  // explícita del modo.
  // ------------------------------------------------------------------
  console.log('--- 0. Verificación pura de ai-pedagogy.ts (sin backend): modo por defecto == HINT_FIRST, sin ambigüedad; WORKED_SOLUTION nunca aparece sin solicitud explícita ---');
  check('0a. resolveEffectiveAssistanceMode(undefined) == HINT_FIRST', resolveEffectiveAssistanceMode(undefined) === 'HINT_FIRST');
  check('0a2. resolveEffectiveAssistanceMode(null) == HINT_FIRST', resolveEffectiveAssistanceMode(null) === 'HINT_FIRST');
  check('0a3. resolveEffectiveAssistanceMode(otro modo explícito) nunca se reescribe a HINT_FIRST', resolveEffectiveAssistanceMode('GUIDED_STEPS') === 'GUIDED_STEPS');
  const defaultInstruction = buildAssistanceInstructionBlock(undefined);
  const nullInstruction = buildAssistanceInstructionBlock(null);
  const hintInstruction = buildAssistanceInstructionBlock('HINT_FIRST');
  const solutionInstruction = buildAssistanceInstructionBlock('WORKED_SOLUTION');
  check('0b. instrucción para mode AUSENTE es BYTE-IDÉNTICA a la instrucción para HINT_FIRST explícito (sin quinta semántica ambigua)', defaultInstruction === hintInstruction);
  check('0b2. instrucción para mode NULL es BYTE-IDÉNTICA a la instrucción para HINT_FIRST explícito', nullInstruction === hintInstruction);
  check('0c. progresión por defecto (mode ausente) nunca menciona "SOLUCIÓN COMPLETA" como modo activo', !defaultInstruction.includes('SOLUCIÓN COMPLETA'));
  check('0d. modo HINT_FIRST/por-defecto nunca coincide con el bloque de WORKED_SOLUTION', hintInstruction !== solutionInstruction);
  check('0e. modo WORKED_SOLUTION explícito SÍ menciona la solicitud explícita del estudiante', solutionInstruction.includes('SOLUCIÓN COMPLETA') && solutionInstruction.includes('EXPLÍCITAMENTE'));
  const promptWithoutMode = buildSystemPrompt({});
  const promptWithHint = buildSystemPrompt({ assistanceMode: 'HINT_FIRST' });
  const promptWithSolution = buildSystemPrompt({ assistanceMode: 'WORKED_SOLUTION' });
  check('0f. system prompt SIN modo -> nunca contiene el bloque de instrucción de SOLUCIÓN COMPLETA', !promptWithoutMode.includes('SOLUCIÓN COMPLETA'));
  check('0g. system prompt SIN modo es BYTE-IDÉNTICO al system prompt con HINT_FIRST explícito (mismo academicContext)', promptWithoutMode === promptWithHint);
  check('0h. system prompt CON WORKED_SOLUTION explícito -> sí contiene el bloque de instrucción de SOLUCIÓN COMPLETA', promptWithSolution.includes('SOLUCIÓN COMPLETA'));
  check('0i. AXIOMA_TUTOR_PROMPT_VERSION es un identificador no vacío (trazabilidad, decisión O)', typeof AXIOMA_TUTOR_PROMPT_VERSION === 'string' && AXIOMA_TUTOR_PROMPT_VERSION.length > 0);
  check('0j. AXIOMA_TUTOR_DISCLAIMER es un texto no vacío (decisión N)', typeof AXIOMA_TUTOR_DISCLAIMER === 'string' && AXIOMA_TUTOR_DISCLAIMER.length > 0);
  // Refuerzo: ningún texto libre de estudiante puede alcanzar esta función -- solo acepta `AiAssistanceMode | null | undefined`,
  // nunca un string arbitrario, así que "clasificar semánticamente el mensaje" ni siquiera compila -- verificado aquí invocándola
  // únicamente con valores del enum/ausencia, igual que la llama AiConversationService en producción.

  // ------------------------------------------------------------------
  // 1. Disclaimer presente en la superficie de conversación (create/list/get), AUSENTE en sendMessage.
  // ------------------------------------------------------------------
  console.log('--- 1. Disclaimer presente en create/list/get, AUSENTE en la respuesta de sendMessage (decisión N) ---');
  const student1 = await createSession('s1');
  const conv1 = await req('POST', '/ai/me/conversations', student1.headers, {});
  check('1a. disclaimer presente al crear -> texto exacto esperado', conv1.body?.disclaimer === AXIOMA_TUTOR_DISCLAIMER);
  const list1 = await req('GET', '/ai/me/conversations', student1.headers);
  check('1b. disclaimer presente en el listado', list1.body?.conversations?.[0]?.disclaimer === AXIOMA_TUTOR_DISCLAIMER);
  const get1 = await req('GET', `/ai/me/conversations/${conv1.body.conversationId}`, student1.headers);
  check('1c. disclaimer presente al leer una conversación', get1.body?.disclaimer === AXIOMA_TUTOR_DISCLAIMER);
  const send1 = await sendMessage(student1.headers, conv1.body.conversationId, 'No entendí la explicación, ¿me puedes ayudar?');
  check('1d. sendMessage funciona sin contexto académico (estudiante pide ayuda sin contexto)', send1.status === 200 || send1.status === 201);
  check('1e. la respuesta de sendMessage NUNCA incluye "disclaimer" (sin repetición invasiva por respuesta)', !('disclaimer' in (send1.body ?? {})));

  // ------------------------------------------------------------------
  // 2. Estudiante SIN modo explícito ("no entendí") -> FakeAiProvider recibe mode == null, nunca WORKED_SOLUTION.
  // ------------------------------------------------------------------
  console.log('--- 2. Mensaje libre sin requestedMode -> proveedor recibe mode == null (progresión por defecto) ---');
  const content2 = `no-entendi-${randomUUID()}`;
  const student2 = await createSession('s2');
  const conv2 = await req('POST', '/ai/me/conversations', student2.headers, {});
  await sendMessage(student2.headers, conv2.body.conversationId, content2);
  const mode2 = await lastModeFor(content2);
  check('2a. FakeAiProvider recibió assistanceMode == null (nunca inventa un modo)', mode2 === null);

  // ------------------------------------------------------------------
  // 3. Estudiante solicita pista explícitamente -> el proveedor recibe HINT_FIRST, nunca otro modo.
  // ------------------------------------------------------------------
  console.log('--- 3. Estudiante solicita una pista (requestedMode=HINT_FIRST) ---');
  const content3 = `dame-una-pista-${randomUUID()}`;
  const student3 = await createSession('s3');
  const conv3 = await req('POST', '/ai/me/conversations', student3.headers, {});
  const send3 = await sendMessage(student3.headers, conv3.body.conversationId, content3, 'HINT_FIRST');
  check('3a. sendMessage con requestedMode=HINT_FIRST -> 200/201', send3.status === 200 || send3.status === 201);
  check('3b. userMessage.requestedMode == HINT_FIRST (ecoado por el contrato)', send3.body?.userMessage?.requestedMode === 'HINT_FIRST');
  check('3c. assistantMessage.requestedMode == null (el campo solo tiene significado en USER)', send3.body?.assistantMessage?.requestedMode === null);
  const mode3 = await lastModeFor(content3);
  check('3d. FakeAiProvider recibió exactamente HINT_FIRST', mode3 === 'HINT_FIRST');

  // ------------------------------------------------------------------
  // 4. Estudiante solicita explicación conceptual explícitamente.
  // ------------------------------------------------------------------
  console.log('--- 4. Estudiante solicita explicación conceptual (requestedMode=CONCEPTUAL_EXPLANATION) ---');
  const content4 = `explicame-el-concepto-${randomUUID()}`;
  const student4 = await createSession('s4');
  const conv4 = await req('POST', '/ai/me/conversations', student4.headers, {});
  await sendMessage(student4.headers, conv4.body.conversationId, content4, 'CONCEPTUAL_EXPLANATION');
  const mode4 = await lastModeFor(content4);
  check('4. FakeAiProvider recibió exactamente CONCEPTUAL_EXPLANATION', mode4 === 'CONCEPTUAL_EXPLANATION');

  // ------------------------------------------------------------------
  // 5. Estudiante intenta obtener la solución DIRECTAMENTE por texto libre (sin requestedMode) -> nunca escala a WORKED_SOLUTION por sí solo.
  // ------------------------------------------------------------------
  console.log('--- 5. Estudiante pide la solución en texto libre SIN requestedMode -> nunca escala a WORKED_SOLUTION por iniciativa del backend ---');
  const content5 = `dame-la-respuesta-directamente-${randomUUID()}`;
  const student5 = await createSession('s5');
  const conv5 = await req('POST', '/ai/me/conversations', student5.headers, {});
  await sendMessage(student5.headers, conv5.body.conversationId, content5);
  const mode5 = await lastModeFor(content5);
  check('5. sin requestedMode explícito, el backend NUNCA envía WORKED_SOLUTION como instrucción (mode == null)', mode5 === null);

  // ------------------------------------------------------------------
  // 6. Estudiante SÍ solicita la solución completa explícitamente -> honrado, con contexto (pregunta ya respondida).
  // ------------------------------------------------------------------
  console.log('--- 6. Solicitud EXPLÍCITA de solución completa (WORKED_SOLUTION), con y sin contexto de pregunta respondida ---');
  const topicRow = await pg.query(`SELECT id, name FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  const topicId = topicRow.rows[0].id as string;
  const qvRow = await pg.query(`SELECT id FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' ORDER BY published_at ASC LIMIT 1`, [topicId]);
  const qv1 = qvRow.rows[0].id as string;
  const optCorrect = (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [qv1])).rows[0];

  const student6 = await createSession('s6');
  await req('POST', `/progress/topics/${topicId}/responses`, student6.headers, { questionVersionId: qv1, answerOptionId: optCorrect.id, operationId: randomUUID() });
  const conv6 = await req('POST', '/ai/me/conversations', student6.headers, { contextQuestionVersionId: qv1 });
  const content6 = `dame-la-solucion-completa-${randomUUID()}`;
  const send6 = await sendMessage(student6.headers, conv6.body.conversationId, content6, 'WORKED_SOLUTION');
  check('6a. sendMessage con WORKED_SOLUTION explícito -> 200/201 (permitido, no es actividad protegida)', send6.status === 200 || send6.status === 201);
  const mode6 = await lastModeFor(content6);
  check('6b. FakeAiProvider recibió exactamente WORKED_SOLUTION (honrado por ser solicitud explícita)', mode6 === 'WORKED_SOLUTION');

  // ------------------------------------------------------------------
  // 7. Interacción progresiva multi-turno: pista -> pasos -> solución, en la MISMA conversación, cada turno con su propio modo.
  // ------------------------------------------------------------------
  console.log('--- 7. Interacción progresiva multi-turno en la misma conversación (pista -> pasos -> solución) ---');
  const student7 = await createSession('s7');
  const conv7 = await req('POST', '/ai/me/conversations', student7.headers, {});
  await sendMessage(student7.headers, conv7.body.conversationId, 'Necesito una pista', 'HINT_FIRST');
  await sendMessage(student7.headers, conv7.body.conversationId, 'Ahora dame los pasos', 'GUIDED_STEPS');
  await sendMessage(student7.headers, conv7.body.conversationId, 'Ya, dame la solución completa', 'WORKED_SOLUTION');
  const detail7 = await req('GET', `/ai/me/conversations/${conv7.body.conversationId}`, student7.headers);
  const userMessages7 = (detail7.body?.messages ?? []).filter((m: { role: string }) => m.role === 'USER');
  check('7a. 3 turnos de estudiante persistidos en orden', userMessages7.length === 3);
  check('7b. turno 1 -> requestedMode HINT_FIRST', userMessages7[0]?.requestedMode === 'HINT_FIRST');
  check('7c. turno 2 -> requestedMode GUIDED_STEPS', userMessages7[1]?.requestedMode === 'GUIDED_STEPS');
  check('7d. turno 3 -> requestedMode WORKED_SOLUTION', userMessages7[2]?.requestedMode === 'WORKED_SOLUTION');
  check('7e. turnCount avanza correctamente (3 turnos completados)', detail7.body?.turnCount === 3);

  // ------------------------------------------------------------------
  // 8. Contexto académico sigue siendo mínimo -- el modo NUNCA se filtra al contexto académico ni viceversa.
  // ------------------------------------------------------------------
  console.log('--- 8. El contexto académico sigue siendo mínimo -- ausencia de campos de modo/pedagogía dentro de academicContext ---');
  const summary8 = conv6.body?.academicContext;
  check('8a. academicContext solo tiene subjectName/topicName (whitelisting sin cambios por I5)', summary8 && Object.keys(summary8).sort().join(',') === 'subjectName,topicName');

  // ------------------------------------------------------------------
  // 9. requestedMode inválido -> rechazado por el esquema, nunca silenciosamente ignorado.
  // ------------------------------------------------------------------
  console.log('--- 9. requestedMode con un valor no autorizado -> 400 (enum estricto) ---');
  const student9 = await createSession('s9');
  const conv9 = await req('POST', '/ai/me/conversations', student9.headers, {});
  const rejected9 = await req('POST', `/ai/me/conversations/${conv9.body.conversationId}/messages`, student9.headers, {
    content: 'hola',
    operationId: randomUUID(),
    requestedMode: 'RESOURCE_REDIRECT', // modo candidato del Data Model, deliberadamente NO habilitado en I5.
  });
  check('9. modo no habilitado en I5 -> 400, nunca aceptado silenciosamente', rejected9.status === 400);

  // ------------------------------------------------------------------
  // 10. Idempotencia/retry preserva el modo persistido -- ver invariante 11/12 extendido a I5.
  // ------------------------------------------------------------------
  console.log('--- 10. Retry técnico (fallo simulado una vez) reutiliza el MISMO modo persistido, nunca uno nuevo del body del reintento ---');
  const student10 = await createSession('s10');
  const conv10 = await req('POST', '/ai/me/conversations', student10.headers, {});
  const opId10 = randomUUID();
  const content10 = `${FAKE_AI_PROVIDER_FAIL_ONCE_PREFIX}-retry-modo-${randomUUID()}`;
  const first10 = await req('POST', `/ai/me/conversations/${conv10.body.conversationId}/messages`, student10.headers, {
    content: content10,
    operationId: opId10,
    requestedMode: 'GUIDED_STEPS',
  });
  check('10a. primer intento falla técnicamente (fallo simulado) -> 503, USER persistido igualmente', first10.status === 503);
  // Reintento del MISMO operationId -- el cliente podría incluso omitir requestedMode aquí; el backend nunca debe pedirlo de nuevo, lee el ya persistido.
  const retry10 = await req('POST', `/ai/me/conversations/${conv10.body.conversationId}/messages`, student10.headers, {
    content: content10,
    operationId: opId10,
  });
  check('10b. reintento del mismo operationId -> éxito (200/201)', retry10.status === 200 || retry10.status === 201);
  check('10c. userMessage.requestedMode del reintento sigue siendo GUIDED_STEPS (el ORIGINAL, nunca perdido/sobrescrito)', retry10.body?.userMessage?.requestedMode === 'GUIDED_STEPS');
  const mode10 = await lastModeFor(content10);
  check('10d. FakeAiProvider recibió GUIDED_STEPS en la llamada que finalmente tuvo éxito (leído del mensaje persistido, no del body del reintento)', mode10 === 'GUIDED_STEPS');

  // ------------------------------------------------------------------
  // 11. Cada generación queda asociada a una versión de prompt trazable (decisión O/invariante 15).
  // ------------------------------------------------------------------
  console.log('--- 11. Cada generación (ledger) queda asociada a una versión de prompt trazable ---');
  const ledgerRows = await pg.query(
    `SELECT l.prompt_version FROM ai_usage_ledger l JOIN ai_message m ON m.id = l.assistant_message_id WHERE m.conversation_id = $1 ORDER BY l.recorded_at ASC`,
    [conv7.body.conversationId],
  );
  check('11a. las 3 filas del ledger de la conversación multi-turno tienen prompt_version no nulo', ledgerRows.rows.length === 3 && ledgerRows.rows.every((r) => !!r.prompt_version));
  check('11b. prompt_version es estable/consistente entre generaciones del mismo proceso (FakeAiProvider)', new Set(ledgerRows.rows.map((r) => r.prompt_version)).size === 1);

  // ------------------------------------------------------------------
  // 12. No se introduce estado académico canónico nuevo -- verificación estática + verificación real (conteo de filas de PROGRESS sin cambios por los envíos puramente conversacionales).
  // ------------------------------------------------------------------
  console.log('--- 12. Verificación estática: ai-pedagogy.ts nunca importa Prisma/XP/gamification/progress/education ---');
  const pedagogySource = readFileSync(join(__dirname, '..', 'src', 'ai', 'ai-pedagogy.ts'), 'utf8');
  const importLines = pedagogySource
    .split('\n')
    .filter((line) => /^\s*import\s/.test(line))
    .join('\n');
  const forbiddenImportPatterns = [/generated\/prisma/, /@prisma\/client/, /gamification\//, /progress\//, /education\//, /xp-/, /anthropic-ai\/sdk/];
  check('12a. ai-pedagogy.ts nunca importa Prisma/gamification/progress/education/XP/SDK de Anthropic', !forbiddenImportPatterns.some((p) => p.test(importLines)));
  const progressCountBefore = await pg.query(`SELECT count(*)::int AS c FROM student_response`);
  const student12 = await createSession('s12');
  const conv12 = await req('POST', '/ai/me/conversations', student12.headers, {});
  await sendMessage(student12.headers, conv12.body.conversationId, 'Explícame porcentajes', 'CONCEPTUAL_EXPLANATION');
  const progressCountAfter = await pg.query(`SELECT count(*)::int AS c FROM student_response`);
  check('12b. enviar mensajes al Tutor NUNCA crea filas nuevas en student_response (ninguna escritura académica canónica)', progressCountBefore.rows[0].c === progressCountAfter.rows[0].c);

  // ------------------------------------------------------------------
  // 13. Un replay del MISMO operationId intentando enviar un requestedMode DISTINTO nunca cambia el modo efectivo original.
  // ------------------------------------------------------------------
  console.log('--- 13. Replay del MISMO operationId con requestedMode DISTINTO en el body -> el modo efectivo ORIGINAL nunca cambia ---');
  const student13 = await createSession('s13');
  const conv13 = await req('POST', '/ai/me/conversations', student13.headers, {});
  const opId13 = randomUUID();
  const content13 = `intento-cambiar-modo-en-replay-${randomUUID()}`;
  const original13 = await req('POST', `/ai/me/conversations/${conv13.body.conversationId}/messages`, student13.headers, {
    content: content13,
    operationId: opId13,
    requestedMode: 'GUIDED_STEPS',
  });
  check('13a. operación original con GUIDED_STEPS -> 200/201', original13.status === 200 || original13.status === 201);
  check('13a2. userMessage.requestedMode original == GUIDED_STEPS', original13.body?.userMessage?.requestedMode === 'GUIDED_STEPS');
  // Replay del MISMO operationId, intentando "colar" WORKED_SOLUTION -- debe ser tratado como replay puro (invariante 11/12), nunca una operación nueva.
  const replay13 = await req('POST', `/ai/me/conversations/${conv13.body.conversationId}/messages`, student13.headers, {
    content: content13,
    operationId: opId13,
    requestedMode: 'WORKED_SOLUTION',
  });
  check('13b. replay -> 200/201 (idempotente, nunca error ni operación nueva)', replay13.status === 200 || replay13.status === 201);
  check('13c. userMessage.id del replay == el mismo id original (replay puro, no una fila nueva)', replay13.body?.userMessage?.id === original13.body?.userMessage?.id);
  check('13d. requestedMode del replay SIGUE siendo GUIDED_STEPS -- el WORKED_SOLUTION del body del replay fue IGNORADO', replay13.body?.userMessage?.requestedMode === 'GUIDED_STEPS');
  const userMessagesConv13 = (await pg.query(`SELECT requested_mode FROM ai_message WHERE conversation_id = $1 AND role = 'USER'`, [conv13.body.conversationId])).rows;
  check('13e. una ÚNICA fila USER en la base para esta operación (sin duplicado por el intento de replay)', userMessagesConv13.length === 1);
  check('13f. esa única fila persiste requested_mode == GUIDED_STEPS en la base (nunca sobrescrita)', userMessagesConv13[0]?.requested_mode === 'GUIDED_STEPS');
  const mode13 = await lastModeFor(content13);
  check('13g. FakeAiProvider solo fue invocado con GUIDED_STEPS para este contenido (nunca con WORKED_SOLUTION)', mode13 === 'GUIDED_STEPS');

  // ------------------------------------------------------------------
  // 14. WORKED_SOLUTION sobre una pregunta SIN responder -- el contexto que llega al proveedor sigue sin studentAnswer (frontera de Incremento 4, no ampliada por I5).
  // ------------------------------------------------------------------
  console.log('--- 14. WORKED_SOLUTION sobre pregunta SIN responder -> el contexto entregado al proveedor SIGUE sin studentAnswer (I4 no ampliado por I5) ---');
  const qv2Row = await pg.query(
    `SELECT id FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' AND id != $2 ORDER BY published_at ASC LIMIT 1`,
    [topicId, qv1],
  );
  const qv2 = qv2Row.rows[0]?.id as string | undefined;
  if (qv2) {
    const student14 = await createSession('s14');
    const conv14 = await req('POST', '/ai/me/conversations', student14.headers, { contextQuestionVersionId: qv2 });
    const content14 = `worked-solution-sin-responder-${randomUUID()}`;
    const send14 = await sendMessage(student14.headers, conv14.body.conversationId, content14, 'WORKED_SOLUTION');
    check('14a. sendMessage con WORKED_SOLUTION sobre pregunta sin responder -> igualmente 200/201 (I5 no bloquea, solo I6 lo hará)', send14.status === 200 || send14.status === 201);
    const ctx14 = (await req('GET', `/ai/_internal/fake-provider-last-context?content=${encodeURIComponent(content14)}`, { 'x-internal-ops-key': opsKey })).body?.context as {
      question?: { studentAnswer?: unknown };
    } | null;
    check('14b. el contexto entregado al proveedor NUNCA incluye studentAnswer (pregunta sin responder, misma frontera de I4)', ctx14?.question?.studentAnswer === undefined);
  } else {
    console.log('  (omitido: no hay una segunda question_version publicada disponible en el fixture para este caso)');
  }

  // ------------------------------------------------------------------
  // 15. Ninguna mutación de estado académico/gamificación canónico -- extensión de 12b a XP/ranking/liga.
  // ------------------------------------------------------------------
  console.log('--- 15. Ninguna fila nueva en xp_ledger_entry/league_point_ledger_entry por el uso del Tutor (XP/ranking/liga intactos) ---');
  const xpBefore = await pg.query(`SELECT count(*)::int AS c FROM xp_ledger_entry`);
  const leagueBefore = await pg.query(`SELECT count(*)::int AS c FROM league_point_ledger_entry`);
  const student15 = await createSession('s15');
  const conv15 = await req('POST', '/ai/me/conversations', student15.headers, {});
  await sendMessage(student15.headers, conv15.body.conversationId, 'Dame la solución completa', 'WORKED_SOLUTION');
  const xpAfter = await pg.query(`SELECT count(*)::int AS c FROM xp_ledger_entry`);
  const leagueAfter = await pg.query(`SELECT count(*)::int AS c FROM league_point_ledger_entry`);
  check('15a. xp_ledger_entry sin filas nuevas tras usar el Tutor', xpBefore.rows[0].c === xpAfter.rows[0].c);
  check('15b. league_point_ledger_entry sin filas nuevas tras usar el Tutor', leagueBefore.rows[0].c === leagueAfter.rows[0].c);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Comportamiento Pedagógico (LEF Bloque VI, Incremento 5) pasaron.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
