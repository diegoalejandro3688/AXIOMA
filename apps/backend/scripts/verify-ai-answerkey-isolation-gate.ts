// Gate determinista de AISLAMIENTO DEL `answerKey` -- LEF Bloque VI,
// addendum §29.2 de docs/adr/LEF-BLOCK-VI-DEFINITION.md (reconciliación E/F
// del 2026-08-14). Autorizado explícitamente por el Product Owner como gate
// NUEVO y PERMANENTE.
//
// QUÉ PRUEBA, y por qué existe. La reconciliación E/F retira del prompt la
// equivalencia `pregunta no respondida == actividad protegida`: el Tutor SÍ
// puede razonar y, bajo `WORKED_SOLUTION` explícito, resolver una pregunta
// normal todavía no respondida (decisión E). Al retirar esa restricción de
// COMPORTAMIENTO, la única garantía de SEGURIDAD que queda sobre la pauta es
// la de MINIMIZACIÓN (decisión G/P + §24 + invariante de I4), y hasta hoy
// ningún gate la protegía contra una regresión -- ya lo señaló
// `experiments/tutor-pedagogy-guardrail-backtest/DECISION-GATE.md` §11.1. Este
// gate cierra exactamente ese hueco.
//
// La propiedad verificada es de categoría (A) (determinista, sin LLM, ver
// `ai-pedagogy.ts`): mientras la política de I4 no lo autorice -- es decir,
// mientras no exista un `StudentResponse` REAL de ESA cuenta para ESA
// `questionVersionId` -- el `answerKey` (qué alternativa es la correcta) y la
// explicación validada NUNCA aparecen en:
//   (a) el system prompt CONSTRUIDO (`buildSystemPrompt`, la función real de
//       producción, evaluada para LOS CUATRO modos),
//   (b) el `academicContext` entregado al proveedor (capturado del
//       `FakeAiProvider` REAL vía `AiInternalAdminController`),
//   (c) los mensajes que el backend pasa al proveedor -- que son exactamente
//       `history` (las filas `ai_message` persistidas) + el `content` crudo
//       del estudiante, ver `AnthropicAiProvider.generateReply`: el backend
//       nunca sintetiza ningún otro mensaje.
//
// FUENTES CANÓNICAS REALES, NUNCA HEURÍSTICAS DE TEXTO/SIMILITUD: el texto
// contra el que se compara sale de Postgres (`answer_option.is_correct = true`
// y `question_version.explanation_content` del seed real), no de una
// aproximación semántica. La prueba es de contención literal exacta.
//
// PRECAUCIÓN ANTI-FALSO-NEGATIVO (sección 4): un gate que nunca dispone del
// dato sería trivialmente verde. Por eso se verifica también el CONTROL
// POSITIVO -- con `StudentResponse` real, la explicación validada SÍ aparece
// en el contexto y en el system prompt. Si el control positivo fallara, las
// aserciones negativas no probarían nada y el gate se declara inválido.
//
// MATIZ DELIBERADO sobre el TEXTO de la alternativa correcta: ese texto es
// PÚBLICO -- viaja siempre dentro de la lista de alternativas del enunciado,
// igual que los distractores, y debe hacerlo (el estudiante las ve en
// pantalla). Lo privilegiado NO es el texto, sino la INFORMACIÓN DE CUÁL LO
// ES. Por eso la aserción correcta no es "el texto no aparece" (sería falsa y
// exigiría romper el producto), sino "el texto no aparece en NINGUNA posición
// distinta de la lista de alternativas, y ninguna marca lo distingue de los
// distractores". Ver sección 3.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { AI_ASSISTANCE_MODES, buildSystemPrompt } from '../src/ai/ai-pedagogy';
import type { AiAcademicContext } from '../src/ai/ai-provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;
let invalidated = false;

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
  const uid = `ai-answerkey-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

/**
 * Precondición de IDENTIDAD DE PROCESO -- misma implementación EXACTA que
 * `verify-ai-pedagogy-gate.ts`/`verify-ai-safety-gate.ts`, ver el incidente
 * del 2026-08-13 (`experiments/tutor-pedagogy-v5-eval/INCIDENT-v4-leak-during-v5-prep.md`).
 * Un puerto abierto NUNCA es evidencia de qué proceso escucha: sin esta
 * comprobación, un backend real ajeno en el mismo puerto convertiría cada
 * mensaje de este gate en una llamada PAGADA a Anthropic.
 */
async function assertBackendIsFake(): Promise<void> {
  if (!opsKey) {
    throw new Error(`0z. IDENTIDAD NO CONFIRMABLE: falta INTERNAL_OPS_KEY, sin ella no se puede interrogar a ${base}. Abortando ANTES de generar.`);
  }
  const probe = await req('GET', '/ai/_internal/effective-provider', { 'x-internal-ops-key': opsKey });
  if (probe.status !== 200) {
    throw new Error(
      `0z. IDENTIDAD NO CONFIRMABLE: GET /ai/_internal/effective-provider en ${base} devolvió ${probe.status}. ` +
        `Un puerto abierto NO prueba qué proceso escucha. Abortando ANTES de emitir ninguna generación.`,
    );
  }
  if (probe.body?.provider !== 'fake') {
    throw new Error(
      `0z. BACKEND EQUIVOCADO: ${base} corre provider="${probe.body?.provider}" (impl=${probe.body?.impl}, AI_PROVIDER_IMPL=${probe.body?.configured}). ` +
        `Este gate SOLO puede correr contra FakeAiProvider -- seguir habría emitido llamadas PAGADAS. Abortando.`,
    );
  }
  console.log(`  OK  0z. identidad del backend CONFIRMADA en ${base}: provider=fake (impl=${probe.body?.impl}, AI_PROVIDER_IMPL=${probe.body?.configured})`);
}

async function lastContextFor(content: string): Promise<AiAcademicContext | null> {
  const r = await req('GET', `/ai/_internal/fake-provider-last-context?content=${encodeURIComponent(content)}`, { 'x-internal-ops-key': opsKey });
  return (r.body?.context ?? null) as AiAcademicContext | null;
}

/** Convierte los bloques canónicos de contenido a texto plano -- MISMA lógica que `AiAcademicContextBuilder` (un solo bloque para alternativas, array para explicación). */
type PlainBlock = { type: string; text?: string; latex?: string };
function blockText(block: PlainBlock): string {
  if (block.type === 'paragraph' || block.type === 'heading') return block.text ?? '';
  if (block.type === 'formula') return block.latex ? `[fórmula: ${block.latex}]` : '';
  if (block.type === 'image') return '[imagen]';
  return '';
}
function blocksText(raw: unknown): string {
  const blocks = (Array.isArray(raw) ? raw : [raw]) as PlainBlock[];
  return blocks.map(blockText).filter((t) => t.length > 0).join(' ');
}

/** Fragmentos NO triviales de un texto -- evita que la contención sea verdadera por casualidad sobre palabras sueltas. */
function significantFragments(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  const out: string[] = [];
  if (clean.length >= 40) out.push(clean.slice(0, 40));
  if (clean.length >= 80) out.push(clean.slice(Math.floor(clean.length / 2), Math.floor(clean.length / 2) + 40));
  if (clean.length >= 40) out.push(clean.slice(-40));
  return out.length > 0 ? out : [clean];
}

function occurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return count;
    count++;
    from = idx + needle.length;
  }
}

async function main() {
  console.log('--- 0. Precondiciones: identidad del proceso backend + Postgres real ---');
  await assertBackendIsFake();

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ------------------------------------------------------------------
  // 1. Fuentes canónicas REALES del seed -- nunca fixtures inventados.
  // ------------------------------------------------------------------
  console.log('--- 1. Fuentes canónicas reales (Postgres/seed): answerKey y explicación validada de una pregunta publicada ---');
  const topicRow = await pg.query(`SELECT id FROM curriculum_topic WHERE code = 'M1.NUMEROS.PORCENTAJES'`);
  if (topicRow.rowCount === 0) throw new Error('Fixture ausente: falta el tema M1.NUMEROS.PORCENTAJES del seed canónico. Ejecuta `pnpm prisma:seed`.');
  const topicId = topicRow.rows[0].id as string;

  const qvRows = await pg.query(
    `SELECT id, explanation_content FROM question_version WHERE curriculum_topic_id = $1 AND editorial_status = 'PUBLISHED' ORDER BY published_at ASC`,
    [topicId],
  );
  if (qvRows.rowCount < 2) throw new Error('Fixture ausente: se requieren al menos 2 preguntas publicadas en el tema de porcentajes.');
  const qvAnswered = qvRows.rows[0].id as string;
  const qvUnanswered = qvRows.rows[1].id as string;

  const optionsUnanswered = (await pg.query(`SELECT id, content, is_correct FROM answer_option WHERE question_version_id = $1 ORDER BY display_order ASC, id ASC`, [qvUnanswered])).rows;
  const correctRow = optionsUnanswered.find((o) => o.is_correct === true);
  if (!correctRow) throw new Error('Fixture inválido: la pregunta no tiene ninguna alternativa marcada is_correct = true.');
  const correctOptionText = blockText(correctRow.content as PlainBlock);
  const distractorTexts = optionsUnanswered.filter((o) => o.is_correct !== true).map((o) => blockText(o.content as PlainBlock));
  const explanationUnanswered = blocksText((await pg.query(`SELECT explanation_content FROM question_version WHERE id = $1`, [qvUnanswered])).rows[0].explanation_content);
  const explanationAnswered = blocksText(qvRows.rows[0].explanation_content);
  const correctOptionIdAnswered = (await pg.query(`SELECT id FROM answer_option WHERE question_version_id = $1 AND is_correct = true`, [qvAnswered])).rows[0].id as string;

  check('1a. la alternativa correcta canónica existe y tiene texto no vacío', correctOptionText.length > 0);
  check('1b. existen distractores reales (la pregunta discrimina de verdad)', distractorTexts.length >= 2);
  check('1c. la explicación validada canónica es un texto NO trivial (>= 40 caracteres) -- si fuera corta, la contención literal no probaría nada', explanationUnanswered.replace(/\s+/g, ' ').trim().length >= 40);
  check('1d. la explicación validada NO es un substring del enunciado/alternativas (es contenido genuinamente privilegiado)', !distractorTexts.some((d) => d.includes(explanationUnanswered)) && !correctOptionText.includes(explanationUnanswered));
  const explanationFragments = significantFragments(explanationUnanswered);
  console.log(`      (fixture: alternativa correcta = ${JSON.stringify(correctOptionText)}; explicación validada = ${explanationUnanswered.length} caracteres, ${explanationFragments.length} fragmentos de control)`);

  // ------------------------------------------------------------------
  // 2. Caso NEGATIVO: pregunta SIN StudentResponse -> el academicContext
  //    entregado al proveedor no contiene answerKey ni explicación.
  // ------------------------------------------------------------------
  console.log('--- 2. (b) academicContext entregado al proveedor -- pregunta SIN StudentResponse ---');
  const alice = await createSession('alice-unanswered');
  const convUnanswered = await req('POST', '/ai/me/conversations', alice.headers, { contextQuestionVersionId: qvUnanswered });
  check('2a. conversación con contexto de pregunta creada', convUnanswered.status === 200 || convUnanswered.status === 201);
  const contentUnanswered = `answerkey-gate-unanswered-${randomUUID()}`;
  const sentUnanswered = await req('POST', `/ai/me/conversations/${convUnanswered.body.conversationId}/messages`, alice.headers, {
    content: contentUnanswered,
    operationId: randomUUID(),
    requestedMode: 'WORKED_SOLUTION',
  });
  check('2b. mensaje enviado con requestedMode = WORKED_SOLUTION (el modo que V6 RE-AUTORIZA a resolver)', sentUnanswered.status === 200 || sentUnanswered.status === 201);

  const ctxUnanswered = await lastContextFor(contentUnanswered);
  check('2c. el proveedor recibió un academicContext no nulo (la pregunta sí viaja: enunciado + alternativas son públicos)', !!ctxUnanswered?.question);
  const ctxUnansweredJson = JSON.stringify(ctxUnanswered ?? {});
  check('2d. academicContext NO contiene `studentAnswer` (gating de I4)', ctxUnanswered?.question?.studentAnswer === undefined);
  for (const fragment of explanationFragments) {
    check(`2e. academicContext NO contiene la explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !ctxUnansweredJson.includes(fragment));
  }
  const ctxLower = ctxUnansweredJson.toLowerCase();
  for (const marker of ['iscorrect', 'correctanswer', 'correctoption', 'answerkey', 'explanationtext', 'studentanswer']) {
    check(`2f. academicContext NO contiene el marcador privilegiado "${marker}" en ninguna forma`, !ctxLower.includes(marker));
  }

  // ------------------------------------------------------------------
  // 3. (a) SYSTEM PROMPT CONSTRUIDO -- la función REAL de producción,
  //    evaluada para LOS CUATRO modos sobre el contexto REAL capturado.
  // ------------------------------------------------------------------
  console.log('--- 3. (a) system prompt construido por `buildSystemPrompt` (función real de producción) -- los CUATRO modos ---');
  for (const mode of AI_ASSISTANCE_MODES) {
    const prompt = buildSystemPrompt({ academicContext: ctxUnanswered, assistanceMode: mode });
    for (const fragment of explanationFragments) {
      check(`3a[${mode}]. el system prompt NO contiene la explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !prompt.includes(fragment));
    }
    const promptLower = prompt.toLowerCase();
    for (const marker of ['iscorrect', 'correctanswer', 'correctoption', 'answerkey']) {
      check(`3b[${mode}]. el system prompt NO contiene el marcador privilegiado "${marker}"`, !promptLower.includes(marker));
    }
    // El TEXTO de la alternativa correcta es PÚBLICO y viaja dentro de la
    // lista de alternativas -- ver cabecera. Lo privilegiado es SABER CUÁL
    // lo es. Aserción exacta: no aparece en NINGUNA posición fuera de la
    // línea de alternativas.
    const alternativesLine = prompt.split('\n').find((line) => line.startsWith('Alternativas: ')) ?? '';
    check(`3c[${mode}]. el system prompt incluye la línea pública de alternativas`, alternativesLine.length > 0);
    check(
      `3d[${mode}]. el texto de la alternativa correcta aparece ÚNICAMENTE dentro de la lista pública de alternativas (0 apariciones fuera de ella)`,
      occurrences(prompt, correctOptionText) === occurrences(alternativesLine, correctOptionText) && occurrences(alternativesLine, correctOptionText) >= 1,
    );
    check(
      `3e[${mode}]. la alternativa correcta NO está marcada, ordenada ni señalada de forma distinta a los distractores (todos aparecen exactamente igual de veces en la línea)`,
      distractorTexts.every((d) => occurrences(alternativesLine, d) === occurrences(alternativesLine, correctOptionText)),
    );
    check(
      `3f[${mode}]. el system prompt declara explícitamente que la pauta oficial NO está disponible (instrucción anti-fabricación, decisión Q)`,
      prompt.includes('NO ha respondido esta pregunta todavía') && prompt.includes('NO incluye la pauta oficial'),
    );
    // Reconciliación V6: el vocabulario de la decisión F no puede aplicarse a una pregunta simplemente no respondida (§29.1.1).
    check(
      `3g[${mode}]. el system prompt NO llama "PROTEGIDA" a una pregunta que solo carece de StudentResponse (equivalencia retirada, §29.1.1)`,
      !/pregunta\s+PROTEGIDA/i.test(prompt) && !/preguntas?\s+protegidas?/i.test(prompt),
    );
  }

  // ------------------------------------------------------------------
  // 4. (c) MENSAJES que el backend pasa al proveedor. Son exactamente
  //    `history` (filas ai_message) + el `content` crudo del estudiante
  //    (ver AnthropicAiProvider.generateReply): el backend NUNCA sintetiza
  //    ningún otro mensaje. Se verifica sobre Postgres real.
  // ------------------------------------------------------------------
  console.log('--- 4. (c) mensajes sintetizados/persistidos por el backend -- ninguno contiene la pauta ---');
  const msgRows = await pg.query(`SELECT role, content FROM ai_message WHERE conversation_id = $1 ORDER BY created_at ASC`, [convUnanswered.body.conversationId]);
  const allMessagesJson = JSON.stringify(msgRows.rows);
  for (const fragment of explanationFragments) {
    check(`4a. ningún ai_message de la conversación contiene la explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !allMessagesJson.includes(fragment));
  }
  check('4b. el backend NO sintetizó ningún mensaje extra: exactamente 1 USER + 1 ASSISTANT', msgRows.rows.filter((r) => r.role === 'USER').length === 1 && msgRows.rows.filter((r) => r.role === 'ASSISTANT').length === 1);
  check('4c. el mensaje USER persistido es EXACTAMENTE el texto del estudiante, sin enriquecimiento del backend', msgRows.rows.find((r) => r.role === 'USER')?.content === contentUnanswered);
  const staticProviderSource = (await import('node:fs')).readFileSync((await import('node:path')).join(__dirname, '..', 'src', 'ai', 'anthropic-ai-provider.ts'), 'utf8');
  check(
    '4d. verificación estática: `AnthropicAiProvider` construye `messages` únicamente con `history` + `newMessage` (ninguna otra fuente de texto)',
    /const messages = \[\.\.\.history\.map\(\(m\) => \(\{ role: toAnthropicRole\(m\.role\), content: m\.content \}\)\), \{ role: 'user' as const, content: newMessage \}\]/.test(staticProviderSource),
  );
  check(
    '4e. verificación estática: el system prompt es un parámetro SEPARADO de `messages` (invariante 15, separación system/user)',
    /system: systemPrompt/.test(staticProviderSource) && /messages,/.test(staticProviderSource),
  );

  // ------------------------------------------------------------------
  // 5. CONTROL POSITIVO -- sin él, todo lo anterior podría ser un falso
  //    negativo trivial ("el dato nunca estuvo disponible").
  // ------------------------------------------------------------------
  console.log('--- 5. CONTROL POSITIVO: con StudentResponse REAL, la pauta SÍ llega (el gate no es un falso negativo trivial) ---');
  const bob = await createSession('bob-answered');
  const answered = await req('POST', `/progress/topics/${topicId}/responses`, bob.headers, {
    questionVersionId: qvAnswered,
    answerOptionId: correctOptionIdAnswered,
    operationId: randomUUID(),
  });
  check('5a. fixture: StudentResponse REAL registrado en PROGRESS', answered.status === 200 || answered.status === 201);
  const convAnswered = await req('POST', '/ai/me/conversations', bob.headers, { contextQuestionVersionId: qvAnswered });
  const contentAnswered = `answerkey-gate-answered-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${convAnswered.body.conversationId}/messages`, bob.headers, {
    content: contentAnswered,
    operationId: randomUUID(),
    requestedMode: 'WORKED_SOLUTION',
  });
  const ctxAnswered = await lastContextFor(contentAnswered);
  const ctxAnsweredJson = JSON.stringify(ctxAnswered ?? {});
  const answeredFragments = significantFragments(explanationAnswered);
  const positiveContextOk = !!ctxAnswered?.question?.studentAnswer && answeredFragments.every((f) => ctxAnsweredJson.includes(f));
  check('5b. CON StudentResponse -> `studentAnswer` presente en el academicContext (política de I4 autoriza)', !!ctxAnswered?.question?.studentAnswer);
  check('5c. CON StudentResponse -> la explicación validada SÍ aparece en el academicContext', answeredFragments.every((f) => ctxAnsweredJson.includes(f)));
  const promptAnswered = buildSystemPrompt({ academicContext: ctxAnswered, assistanceMode: 'WORKED_SOLUTION' });
  const positivePromptOk = answeredFragments.every((f) => promptAnswered.includes(f));
  check('5d. CON StudentResponse -> la explicación validada SÍ aparece en el system prompt construido', positivePromptOk);
  check('5e. CON StudentResponse -> el system prompt declara que la pauta validada está disponible', promptAnswered.includes('El contexto incluye la pauta validada de Axioma'));
  if (!positiveContextOk || !positivePromptOk) {
    invalidated = true;
    console.error('GATE INVÁLIDO: el control positivo falló. Las aserciones negativas de las secciones 2-4 NO prueban nada si el dato nunca es alcanzable por ninguna ruta.');
  } else {
    console.log('  OK  5f. control positivo satisfecho: la pauta ES alcanzable cuando la política de I4 la autoriza, luego su AUSENCIA en las secciones 2-4 es una garantía real, no un artefacto.');
  }

  // ------------------------------------------------------------------
  // 6. AISLAMIENTO POR CUENTA -- la respuesta de otra cuenta nunca habilita
  //    la pauta para quien no ha respondido (misma questionVersionId).
  // ------------------------------------------------------------------
  console.log('--- 6. Aislamiento por cuenta: la StudentResponse de OTRA cuenta nunca desbloquea la pauta ---');
  const carol = await createSession('carol-crossaccount');
  const convCarol = await req('POST', '/ai/me/conversations', carol.headers, { contextQuestionVersionId: qvAnswered });
  const contentCarol = `answerkey-gate-crossaccount-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${convCarol.body.conversationId}/messages`, carol.headers, {
    content: contentCarol,
    operationId: randomUUID(),
    requestedMode: 'WORKED_SOLUTION',
  });
  const ctxCarol = await lastContextFor(contentCarol);
  const ctxCarolJson = JSON.stringify(ctxCarol ?? {});
  const promptCarol = buildSystemPrompt({ academicContext: ctxCarol, assistanceMode: 'WORKED_SOLUTION' });
  check('6a. Carol (sin responder) NO recibe `studentAnswer` aunque Bob SÍ respondió la misma pregunta', ctxCarol?.question?.studentAnswer === undefined);
  for (const fragment of answeredFragments) {
    check(`6b. el academicContext de Carol NO contiene la explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !ctxCarolJson.includes(fragment));
    check(`6c. el system prompt de Carol NO contiene la explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !promptCarol.includes(fragment));
  }

  // ------------------------------------------------------------------
  // 7. Contexto de TEMA (sin pregunta) -- nunca arrastra pauta de ninguna pregunta.
  // ------------------------------------------------------------------
  console.log('--- 7. Contexto de TEMA: nunca arrastra la pauta de ninguna pregunta del tema ---');
  const dave = await createSession('dave-topic');
  const convTopic = await req('POST', '/ai/me/conversations', dave.headers, { contextCurriculumTopicId: topicId });
  const contentTopic = `answerkey-gate-topic-${randomUUID()}`;
  await req('POST', `/ai/me/conversations/${convTopic.body.conversationId}/messages`, dave.headers, { content: contentTopic, operationId: randomUUID(), requestedMode: 'WORKED_SOLUTION' });
  const ctxTopic = await lastContextFor(contentTopic);
  const promptTopic = buildSystemPrompt({ academicContext: ctxTopic, assistanceMode: 'WORKED_SOLUTION' });
  check('7a. contexto de tema no incluye ninguna pregunta', ctxTopic?.question === undefined);
  for (const fragment of [...explanationFragments, ...answeredFragments]) {
    check(`7b. el system prompt de contexto de TEMA no contiene ninguna explicación validada (fragmento ${JSON.stringify(fragment.slice(0, 24))}...)`, !promptTopic.includes(fragment));
  }

  // ------------------------------------------------------------------
  // 8. Verificación estática de la ÚNICA frontera que puede habilitar la pauta.
  // ------------------------------------------------------------------
  console.log('--- 8. Verificación estática: `AiAcademicContextBuilder` es la ÚNICA frontera y su gating depende de StudentResponse ---');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const builderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'ai-academic-context-builder.service.ts'), 'utf8');
  check('8a. el builder solo adjunta `studentAnswer` DENTRO del bloque condicionado por `studentResponse`', /if \(studentResponse\) \{[\s\S]*?studentAnswer = \{[\s\S]*?explanationText:/.test(builderSource));
  check('8b. `explanationContent` se lee EXCLUSIVAMENTE dentro de ese bloque (una sola aparición en todo el archivo)', occurrences(builderSource, 'version.explanationContent') === 1);
  // El mapeo público de alternativas NUNCA puede arrastrar `isCorrect`: se
  // inspecciona la expresión concreta que construye `options`, no el archivo
  // entero (el archivo sí menciona `isCorrect`, pero el de `StudentResponse`).
  const optionsMapLine = builderSource.split('\n').find((line) => line.includes('options: options.map(')) ?? '';
  check('8c-1. el builder mapea las alternativas públicas en una sola expresión localizable', optionsMapLine.length > 0);
  check('8c-2. esa expresión NUNCA expone `isCorrect` de una AnswerOption (solo el `isCorrect` de la StudentResponse, en otra rama)', !optionsMapLine.includes('isCorrect'));
  // Toda ASIGNACIÓN de `isCorrect` al contexto debe provenir de la StudentResponse -- nunca de una AnswerOption.
  const isCorrectAssignments = builderSource.split('\n').filter((line) => /\bisCorrect\s*:/.test(line) && !line.trim().startsWith('*'));
  check('8c-3. existe exactamente UNA asignación de `isCorrect` al contexto', isCorrectAssignments.length === 1);
  check('8c-4. esa única asignación proviene de `studentResponse.isCorrect`, nunca de una AnswerOption', isCorrectAssignments[0]?.includes('studentResponse.isCorrect') === true);

  const pedagogySource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ai', 'ai-pedagogy.ts'), 'utf8');
  const contextFn = pedagogySource.slice(pedagogySource.indexOf('function buildAcademicContextBlock'), pedagogySource.indexOf('Composición final del system prompt'));
  const elseBranchStart = contextFn.indexOf('} else {');
  check('8d-1. el renderizador del bloque de contexto tiene una rama `else` explícita para la pregunta SIN responder', elseBranchStart > 0);
  const answeredBranch = contextFn.slice(0, elseBranchStart);
  const unansweredBranch = contextFn.slice(elseBranchStart);
  check('8d-2. la explicación validada se emite ÚNICAMENTE en la rama con `studentAnswer` (0 apariciones en la rama sin responder)', occurrences(unansweredBranch, 'explanationText') === 0 && occurrences(answeredBranch, 'explanationText') >= 1);
  check('8d-3. la rama sin responder NO emite la alternativa elegida ni ninguna marca de correccion', !unansweredBranch.includes('chosenOptionText') && !unansweredBranch.includes('isCorrect'));

  await pg.end();

  console.log('');
  if (invalidated) {
    console.error('GATE INVÁLIDO -- el control positivo de la sección 5 no se satisfizo.');
    process.exit(1);
  }
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de AISLAMIENTO DEL answerKey (LEF Bloque VI, §29.2) pasaron.');
  console.log('Propiedad garantizada: sin `StudentResponse` real de esa cuenta para esa pregunta, la pauta oficial (alternativa correcta identificada + explicación validada) NUNCA aparece en el system prompt, ni en el academicContext, ni en ningún mensaje que el backend pase al proveedor -- en NINGUNO de los cuatro modos, incluido WORKED_SOLUTION, que V6 re-autoriza a resolver.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
