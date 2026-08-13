// Gate de LEF Bloque VI, Incremento 8 ("Superficie móvil del Tutor IA", ver
// docs/adr/LEF-BLOCK-VI-DEFINITION.md §28) -- prueba la lógica REAL de
// producción (`lib/ai/*`) sin runtime de React Native, más verificaciones
// ESTÁTICAS sobre las pantallas/componentes reales, mismo criterio exacto que
// `verify-advanced-profile-mobile-gate.ts` (Bloque V, Incremento 8).
//
// Esto NO reemplaza la verificación manual contra backend real con
// FakeAiProvider (conversación, envío, cuota, reporte, borrado, temas claro/
// oscuro) -- ver evidencia adjunta en el reporte del incremento.
//
// 25 puntos verificados en el mismo orden del contrato del incremento, más
// el punto 26 (26/26b): cierre del hueco detectado en la verificación
// práctica -- una cuenta SIN conversaciones debe poder ver su cuota diaria y
// el disclaimer REALES (vía `GET /ai/me/status`), nunca fabricados en el
// cliente. La contraparte backend de ese punto (que el endpoint no crea
// conversación/mensaje, no consume cuota y no invoca al proveedor) se
// verifica contra backend real en
// `apps/backend/scripts/verify-ai-status-gate.ts`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aiMeStatusResponseSchema, type AiDailyQuotaResponse, type SendAiMessageResponse } from '@axioma/contracts';
import type { ApiResult } from '../lib/api/client';
import { mapSendMessageResult, resolveSendOperationId, AI_SAFETY_BLOCKED_CODE, AI_SAFETY_BLOCKED_MESSAGE } from '../lib/ai/send-outcome';
import { resolveSendAvailability, describeDailyQuota, describeTurns, describeResetAt } from '../lib/ai/conversation-availability';
import { ASSISTANCE_MODE_OPTIONS, DEFAULT_ASSISTANCE_MODE, describeAssistanceMode } from '../lib/ai/assistance-modes';
import { REPORT_CATEGORY_OPTIONS } from '../lib/ai/report-categories';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function readSource(...pathSegments: string[]): string {
  return readFileSync(join(__dirname, '..', ...pathSegments), 'utf8');
}

/**
 * Las prohibiciones de este gate son sobre CÓDIGO real, no sobre la prosa de
 * los comentarios -- exactamente la misma precisión que ya documentó
 * `verify-advanced-profile-mobile-gate.ts` ("símbolos reales de código
 * (imports/uso), no palabras sueltas -- esas aparecen legítimamente en la
 * prosa del comentario"). Un docstring que explica "este archivo NUNCA
 * importa lib/offline" no puede hacer fallar la comprobación de que no lo
 * importa.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function fileExists(...pathSegments: string[]): boolean {
  try {
    readFileSync(join(__dirname, '..', ...pathSegments), 'utf8');
    return true;
  } catch {
    return false;
  }
}

function quota(overrides: Partial<AiDailyQuotaResponse> = {}): AiDailyQuotaResponse {
  return { limit: 7, consumed: 2, remaining: 5, resetAt: '2026-08-13T00:00:00.000Z', ...overrides };
}

function sendResponse(): SendAiMessageResponse {
  return {
    userMessage: { id: 'm1', role: 'USER', content: 'hola', sequence: 0, createdAt: '2026-08-12T10:00:00.000Z', requestedMode: null },
    assistantMessage: { id: 'm2', role: 'ASSISTANT', content: 'respuesta', sequence: 1, createdAt: '2026-08-12T10:00:01.000Z', requestedMode: null },
    turnCount: 1,
    maxTurns: 9,
    dailyQuota: quota({ consumed: 3, remaining: 4 }),
    academicContext: null,
  };
}

function main() {
  const hubSource = readSource('app', '(tabs)', 'ia', 'index.tsx');
  const conversationSource = readSource('app', '(tabs)', 'ia', 'conversation', '[conversationId].tsx');
  const layoutSource = readSource('app', '(tabs)', 'ia', '_layout.tsx');
  const apiSource = readSource('lib', 'api', 'ai.ts');
  const bubbleSource = readSource('components', 'ai', 'ai-message-bubble.tsx');
  const quotaSource = readSource('components', 'ai', 'ai-quota-summary.tsx');
  const modeSelectorSource = readSource('components', 'ai', 'ai-mode-selector.tsx');
  const disclaimerSource = readSource('components', 'ai', 'ai-disclaimer.tsx');
  const ejercicioSource = readSource('app', '(tabs)', 'estudio', 'topic', '[topicId]', 'ejercicio.tsx');
  const availabilitySource = readSource('lib', 'ai', 'conversation-availability.ts');
  const modesSource = readSource('lib', 'ai', 'assistance-modes.ts');
  const allAiSources = [hubSource, conversationSource, layoutSource, apiSource, bubbleSource, quotaSource, modeSelectorSource, disclaimerSource, availabilitySource, modesSource].join('\n');
  /** Mismo conjunto de archivos, SIN comentarios -- base de todas las comprobaciones de "nunca aparece X". */
  const allAiCode = stripComments(allAiSources);

  console.log('--- 1. La pestaña IA ya NO es un placeholder ---');
  check('`app/(tabs)/ia.tsx` (placeholder plano) ya no existe -- ahora es un directorio con su propio Stack', !fileExists('app', '(tabs)', 'ia.tsx'));
  check('el hub NO usa ComingSoonPlaceholder', !stripComments(hubSource).includes('ComingSoonPlaceholder'));
  check('`ia` sigue siendo una de las 5 tabs principales (app/(tabs)/_layout.tsx intacto)', readSource('app', '(tabs)', '_layout.tsx').includes('name="ia"'));
  check('una conversación NO es una tab: vive bajo el Stack de `ia`, nunca en (tabs)/_layout', layoutSource.includes('conversation/[conversationId]') && !readSource('app', '(tabs)', '_layout.tsx').includes('conversation'));

  console.log('--- 2. Historial vacío renderizable (estado vacío real, sin datos inventados) ---');
  check('el hub distingue explícitamente `conversations.length === 0`', hubSource.includes('conversations.length === 0'));
  check('con conversaciones, cuota/disclaimer se leen de la fila canónica del servidor', hubSource.includes('const quotaSource = conversations[0] ?? null'));
  check('sin conversaciones, cuota/disclaimer vienen de GET /ai/me/status (también del servidor), nunca de un valor local', hubSource.includes('getAiStatus') && hubSource.includes("statusState.status === 'ready'"));

  console.log('--- 3. Crear conversación y 4. abrirla ---');
  check('el hub crea conversaciones vía createAiConversation (POST /ai/me/conversations)', hubSource.includes('createAiConversation'));
  check('tras crear, navega a la conversación creada usando el conversationId DEVUELTO por el servidor', hubSource.includes('conversationId: result.data.conversationId'));
  check('el hub abre una conversación existente navegando a /(tabs)/ia/conversation/[conversationId]', hubSource.includes("pathname: '/(tabs)/ia/conversation/[conversationId]'"));
  check('la pantalla de conversación carga su detalle vía getAiConversation', conversationSource.includes('getAiConversation'));

  console.log('--- 5. Envío con operationId provisto por el cliente ---');
  check('sendAiMessage exige operationId en su firma', /operationId: string/.test(apiSource));
  check('la pantalla genera el operationId con randomUUID (expo-crypto), igual que PROGRESS/Pregunta rápida', conversationSource.includes("from 'expo-crypto'") && conversationSource.includes('randomUUID'));

  console.log('--- 6. Doble toque bloqueado localmente ---');
  check('envío: retorna de inmediato si ya hay un envío en curso', conversationSource.includes("if (sendState.status === 'sending') return;"));
  check('creación de conversación: retorna de inmediato si ya hay una creación en curso', hubSource.includes('if (creating) return;'));
  check('borrado: retorna de inmediato si ya hay un borrado en curso', hubSource.includes('if (deletingId) return;'));
  check('reporte: retorna de inmediato si ya se está enviando o ya se envió', conversationSource.includes("=== 'sending'") && conversationSource.includes("=== 'sent'"));

  console.log('--- 7. Reintento de la MISMA operación reutiliza el operationId; 8. una operación nueva usa uno nuevo ---');
  let generated = 0;
  const generateNew = () => `nuevo-${++generated}`;
  const pending = { content: 'explícame esto', operationId: 'op-original' };
  check('reintento del mismo contenido pendiente -> MISMO operationId', resolveSendOperationId(pending, 'explícame esto', generateNew) === 'op-original');
  check('reintento del mismo contenido NO consume un operationId nuevo', generated === 0);
  check('contenido distinto -> operationId NUEVO', resolveSendOperationId(pending, 'otra duda', generateNew) === 'nuevo-1');
  check('sin nada pendiente -> operationId NUEVO', resolveSendOperationId(null, 'explícame esto', generateNew) === 'nuevo-2');
  check('la pantalla usa resolveSendOperationId (no genera un UUID nuevo en cada intento)', conversationSource.includes('resolveSendOperationId(pending, trimmed, randomUUID)'));
  check('un fallo de red/503 CONSERVA el intento pendiente para poder reintentar con el mismo operationId', conversationSource.includes("const retryable = outcome.kind === 'network' || outcome.kind === 'unavailable'"));

  console.log('--- 9. Cuota renderizada EXCLUSIVAMENTE desde el backend ---');
  check('describeDailyQuota usa limit/remaining/consumed recibidos', describeDailyQuota(quota()) === '5 de 7 consultas disponibles hoy (2 usadas)');
  check('con otros valores del servidor, el texto cambia (nada fijado en el cliente)', describeDailyQuota(quota({ limit: 42, remaining: 41, consumed: 1 })) === '41 de 42 consultas disponibles hoy (1 usadas)');
  check('resetAt se formatea desde el valor del servidor, nunca se recalcula la frontera de día', describeResetAt('2026-08-13T00:00:00.000Z', new Date('2026-08-12T10:00:00.000Z')).length > 0);
  const businessNumbers = /\b(?:3|50|6|15)\s*(?:consultas|turnos)\b|Free|Premium|premium/;
  check('ningún archivo de la superficie IA menciona planes ni números de negocio (3/50/6/15, Free/Premium)', !businessNumbers.test(allAiCode));
  check('AiQuotaSummary no contiene ningún literal numérico de cuota -- solo interpola lo recibido', quotaSource.includes('describeDailyQuota(dailyQuota)') && quotaSource.includes('describeTurns(turnCount, maxTurns)'));
  check('tras un envío OK, cuota/turnos se sustituyen por los del servidor (reconciliación, sin optimismo)', conversationSource.includes('dailyQuota: outcome.data.dailyQuota') && conversationSource.includes('turnCount: outcome.data.turnCount'));
  check('los mensajes pintados son los canónicos del servidor (userMessage/assistantMessage), nunca uno construido localmente', conversationSource.includes('outcome.data.userMessage, outcome.data.assistantMessage'));

  console.log('--- 10. Cuota agotada bloquea el envío y explica el límite con el resetAt real ---');
  const exhausted = resolveSendAvailability({ dailyQuota: quota({ consumed: 7, remaining: 0 }), turnCount: 1, maxTurns: 9 });
  check('remaining = 0 -> canSend false, motivo quota_exhausted', !exhausted.canSend && exhausted.reason === 'quota_exhausted');
  check('el mensaje de cuota agotada incluye cuándo se renueva (resetAt del servidor)', !exhausted.canSend && exhausted.message.includes('renueva'));
  const available = resolveSendAvailability({ dailyQuota: quota(), turnCount: 1, maxTurns: 9 });
  check('remaining > 0 y turnos disponibles -> canSend true', available.canSend);
  check('la pantalla deshabilita la entrada cuando availability.canSend es false', conversationSource.includes('const inputDisabled = !availability.canSend || sending;'));

  console.log('--- 11. Límite de turnos renderizado e independiente de la cuota ---');
  const turnLimited = resolveSendAvailability({ dailyQuota: quota(), turnCount: 9, maxTurns: 9 });
  check('turnCount >= maxTurns -> canSend false, motivo turn_limit_reached (con cuota AÚN disponible)', !turnLimited.canSend && turnLimited.reason === 'turn_limit_reached');
  check('el límite de turnos NO borra el historial: el mensaje lo dice explícitamente', !turnLimited.canSend && turnLimited.message.includes('historial se conserva'));
  check('describeTurns muestra turnCount/maxTurns del servidor', describeTurns(4, 9) === 'Turno 4 de 9');

  console.log('--- 12. Modo por defecto: nunca fuerza un enum desde el cliente ---');
  check('DEFAULT_ASSISTANCE_MODE es null (ausencia del campo), nunca HINT_FIRST ni WORKED_SOLUTION', DEFAULT_ASSISTANCE_MODE === null);
  check('la pantalla inicializa el modo con DEFAULT_ASSISTANCE_MODE', conversationSource.includes('useState<AiAssistanceMode | null>(DEFAULT_ASSISTANCE_MODE)'));
  check('el cliente OMITE requestedMode cuando no hay selección explícita', apiSource.includes('if (input.requestedMode) body.requestedMode = input.requestedMode;'));
  check('mobile nunca infiere el modo del texto del mensaje (sin heurísticas sobre `content`)', !conversationSource.includes('WORKED_SOLUTION') && !hubSource.includes('WORKED_SOLUTION'));

  console.log('--- 13. Los 4 modos mapean a los enums EXACTOS del contrato ---');
  const modeValues = ASSISTANCE_MODE_OPTIONS.map((option) => option.value);
  check('las opciones son exactamente [null, HINT_FIRST, CONCEPTUAL_EXPLANATION, GUIDED_STEPS, WORKED_SOLUTION]', JSON.stringify(modeValues) === JSON.stringify([null, 'HINT_FIRST', 'CONCEPTUAL_EXPLANATION', 'GUIDED_STEPS', 'WORKED_SOLUTION']));
  check('cada modo tiene etiqueta en español, distinta del enum', ASSISTANCE_MODE_OPTIONS.every((option) => option.label.length > 0 && option.label !== option.value));
  check('describeAssistanceMode(null) devuelve la etiqueta de "sin selección", no un modo real', describeAssistanceMode(null) === 'Automático');
  check('describeAssistanceMode traduce un enum real a su etiqueta', describeAssistanceMode('GUIDED_STEPS') === 'Pasos guiados');

  console.log('--- 14. Safety 422 (AI_SAFETY_BLOCKED) DISTINGUIDO de 503 (fallo técnico) ---');
  const safety: ApiResult<SendAiMessageResponse> = { ok: false, kind: 'http', status: 422, code: AI_SAFETY_BLOCKED_CODE, message: 'lo que diga el backend' };
  const unavailable: ApiResult<SendAiMessageResponse> = { ok: false, kind: 'http', status: 503, code: 'SERVICE_UNAVAILABLE', message: 'no disponible' };
  const conflict: ApiResult<SendAiMessageResponse> = { ok: false, kind: 'http', status: 409, code: 'CONFLICT', message: 'Se alcanzó el límite diario de consultas al Tutor IA.' };
  const network: ApiResult<SendAiMessageResponse> = { ok: false, kind: 'network', message: 'sin conexión' };
  const ok: ApiResult<SendAiMessageResponse> = { ok: true, data: sendResponse() };
  check('422 + AI_SAFETY_BLOCKED -> kind safety_blocked (estado seguro de producto)', mapSendMessageResult(safety).kind === 'safety_blocked');
  check('el mensaje de safety es el propio de Axioma, estable', (mapSendMessageResult(safety) as { message: string }).message === AI_SAFETY_BLOCKED_MESSAGE);
  check('503 -> kind unavailable (fallo técnico temporal), NUNCA safety_blocked', mapSendMessageResult(unavailable).kind === 'unavailable');
  check('409 -> kind limit, con el mensaje TAL CUAL del servidor (mobile no decide qué límite fue)', mapSendMessageResult(conflict).kind === 'limit' && (mapSendMessageResult(conflict) as { message: string }).message === conflict.message);
  check('error de red -> kind network (ambiguo, reintentable con el mismo operationId)', mapSendMessageResult(network).kind === 'network');
  check('respuesta OK -> kind ok con los datos canónicos', mapSendMessageResult(ok).kind === 'ok');
  check('la UI presenta safety y error técnico con estilos DISTINTOS (no "servidor caído" para un bloqueo)', conversationSource.includes("sendState.outcome.kind === 'safety_blocked' ? styles.noticeSafety : styles.noticeError"));

  console.log('--- 15. Disclaimer presente, del backend, no repetido por mensaje ---');
  check('AiDisclaimer recibe el texto por props -- no hay literal del disclaimer en el componente', !disclaimerSource.includes('puede cometer errores'));
  check('el hub renderiza el disclaimer del servidor (de la conversación o de status, nunca propio)', hubSource.includes('<AiDisclaimer text={header.disclaimer} />'));
  check('la conversación renderiza el disclaimer del servidor UNA sola vez (cabecera), nunca por mensaje', conversationSource.includes('<AiDisclaimer text={detail.disclaimer} />') && !bubbleSource.includes('AiDisclaimer'));

  console.log('--- 16. Reporte de respuestas ASSISTANT; 17. nunca de mensajes USER ---');
  check('el control de reporte solo se renderiza si el mensaje es ASSISTANT (garantía estructural)', bubbleSource.includes('isAssistant && onReport'));
  check("isAssistant se deriva del rol canónico del contrato (role === 'ASSISTANT')", bubbleSource.includes("const isAssistant = message.role === 'ASSISTANT';"));
  check('las 5 categorías son exactamente las del contrato', JSON.stringify(REPORT_CATEGORY_OPTIONS.map((option) => option.value)) === JSON.stringify(['INCORRECT', 'CONFUSING', 'TOO_LONG', 'OFF_TOPIC', 'INAPPROPRIATE']));
  check('las etiquetas están en español y NUNCA sustituyen al enum enviado', REPORT_CATEGORY_OPTIONS.every((option) => option.label !== option.value && /[a-záéíóú]/.test(option.label)));
  check('reportAiMessage envía el enum canónico en reportType', apiSource.includes('body: Record<string, unknown> = { reportType: input.reportType }'));
  const bubbleCode = stripComments(bubbleSource);
  check('la confirmación es simple y no inventa estado de moderación', !bubbleCode.includes('revisión') && !bubbleCode.includes('moderación') && bubbleCode.includes('REPORT_SENT_MESSAGE'));

  console.log('--- 18. Borrado con confirmación previa y reconciliación tras éxito ---');
  check('el borrado exige una confirmación explícita previa (pendingDeleteId)', hubSource.includes('pendingDeleteId') && hubSource.includes('¿Eliminar esta conversación?'));
  check('tras el 204, se recarga la lista desde el servidor (nunca se borra solo en memoria)', /const result = await deleteAiConversation[\s\S]{0,400}await load\(\);/.test(hubSource));
  check('sin papelera: no hay noción de restaurar/archivar en la superficie IA', !allAiCode.includes('restaurar') && !allAiCode.includes('papelera') && !allAiCode.includes('archivar'));

  console.log('--- 19. Contexto desde Estudio: SOLO identificadores ---');
  check('ejercicio.tsx ofrece abrir el Tutor tras responder', ejercicioSource.includes('Preguntar al Tutor IA'));
  check('ejercicio.tsx envía ÚNICAMENTE contextQuestionVersionId', ejercicioSource.includes('contextQuestionVersionId: currentQuestion.versionId'));
  const tutorPushMatch = /router\.push\(\{\s*pathname: '\/\(tabs\)\/ia',\s*params: \{([^}]*)\}\s*\}\)/.exec(stripComments(ejercicioSource));
  check('la navegación al Tutor desde Estudio es localizable y explícita', !!tutorPushMatch);
  const tutorPushParams = tutorPushMatch?.[1] ?? 'NO-ENCONTRADO';
  const forbiddenContextFields = ['correctAnswer', 'isCorrect', 'explanation', 'subject', 'progress', 'answerOptionId', 'stemContent'];
  check('los params enviados al Tutor son EXCLUSIVAMENTE identificadores de contexto, sin datos académicos fabricados', forbiddenContextFields.every((field) => !tutorPushParams.includes(field)));
  check('el hub reenvía los identificadores tal cual, sin construir contexto propio', hubSource.includes('contextQuestionVersionId: contextQuestionVersionId || undefined') && hubSource.includes('contextCurriculumTopicId: contextCurriculumTopicId || undefined'));
  check('el cliente API solo permite enviar los dos identificadores del contrato', apiSource.includes('contextQuestionVersionId?: string;') && apiSource.includes('contextCurriculumTopicId?: string;'));

  console.log('--- 20. Sin lógica de XP/progreso/ranking/gamificación en la superficie IA ---');
  const forbiddenDomains = [/\bxp\b/i, /\branking\b/i, /\bleague\b/i, /\bliga\b/i, /\bstreak\b/i, /\bracha\b/i, /\bachievement/i, /\bcosmetic/i, /grantXp/i];
  check('ningún archivo de la superficie IA menciona XP/ranking/liga/racha/logros/cosméticos', forbiddenDomains.every((pattern) => !pattern.test(allAiCode)));
  check('la superficie IA nunca importa lib/offline (el Tutor es online-only, no compone con el outbox)', !allAiCode.includes('lib/offline') && !allAiCode.includes('../offline') && !allAiCode.includes('outbox'));

  console.log('--- 21. Sin proveedor/modelo/API key en mobile ---');
  const forbiddenProviderSymbols = ['anthropic', 'Anthropic', 'claude', 'Claude', 'api_key', 'apiKey', 'API_KEY', 'openai', 'sonnet'];
  check('ningún archivo de la superficie IA menciona proveedor, modelo ni credenciales', forbiddenProviderSymbols.every((symbol) => !allAiCode.includes(symbol)));
  check('el mensaje de fallo técnico es propio de Axioma, sin detalle de proveedor', conversationSource.includes('AI_UNAVAILABLE_MESSAGE') || readSource('lib', 'ai', 'send-outcome.ts').includes('AI_UNAVAILABLE_MESSAGE'));

  console.log('--- 22. Tema claro y 23. tema oscuro (tokens, nunca hex sueltos) ---');
  const themedFiles: Array<[string, string]> = [
    ['app/(tabs)/ia/index.tsx', hubSource],
    ['app/(tabs)/ia/conversation/[conversationId].tsx', conversationSource],
    ['components/ai/ai-message-bubble.tsx', bubbleSource],
    ['components/ai/ai-quota-summary.tsx', quotaSource],
    ['components/ai/ai-mode-selector.tsx', modeSelectorSource],
    ['components/ai/ai-disclaimer.tsx', disclaimerSource],
  ];
  for (const [name, source] of themedFiles) {
    check(`${name} usa useThemedStyles/ThemeTokens (claro y oscuro derivados de los mismos tokens)`, source.includes('useThemedStyles') && source.includes('ThemeTokens'));
  }
  const hexLiterals = themedFiles.filter(([, source]) => /#[0-9a-fA-F]{3,8}\b/.test(stripComments(source)));
  check('ninguna pantalla/componente de IA define colores hex propios fuera de los tokens', hexLiterals.length === 0);

  console.log('--- 24. Estados de carga / error / vacío, con los componentes ya existentes ---');
  check('el hub usa LoadingState y ErrorState (con reintento)', hubSource.includes('<LoadingState') && hubSource.includes('<ErrorState') && hubSource.includes('onRetry'));
  check('la conversación usa LoadingState y ErrorState (con reintento)', conversationSource.includes('<LoadingState') && conversationSource.includes('<ErrorState') && conversationSource.includes('onRetry'));
  check('el hub tiene estado vacío explícito para "sin conversaciones"', hubSource.includes('Todavía no tienes conversaciones'));
  check('la conversación tiene estado vacío explícito para "sin mensajes"', conversationSource.includes("detail.messages.length === 0") && conversationSource.includes('Conversación nueva'));

  console.log('--- 25. Contratos: mobile NUNCA duplica los esquemas Zod del Tutor ---');
  check('lib/api/ai.ts importa los esquemas de @axioma/contracts', apiSource.includes("from '@axioma/contracts'") && apiSource.includes('aiConversationDetailResponseSchema'));
  check('ningún archivo de la superficie IA declara un z.object propio para el Tutor', !allAiCode.includes('z.object') && !allAiCode.includes("from 'zod'"));

  console.log('--- 26. Cuenta SIN conversaciones: cuota y disclaimer reales vía GET /ai/me/status (cierre del hueco de I8) ---');
  const hubCode = stripComments(hubSource);
  const apiCode = stripComments(apiSource);
  check('lib/api/ai.ts expone getAiStatus contra la ruta canónica /ai/me/status', apiCode.includes("const STATUS_PATH = '/ai/me/status'") && apiCode.includes('export function getAiStatus'));
  check('getAiStatus valida con el esquema del contrato (aiMeStatusResponseSchema), nunca uno redeclarado en mobile', apiCode.includes('schema: aiMeStatusResponseSchema') && apiCode.includes("from '@axioma/contracts'"));
  check('getAiStatus es una LECTURA: método GET y sin body', /apiRequest\('GET', STATUS_PATH, \{ schema: aiMeStatusResponseSchema \}\)/.test(apiCode));
  check('el contrato de status tiene EXACTAMENTE dos claves: dailyQuota y disclaimer', JSON.stringify(Object.keys(aiMeStatusResponseSchema.shape).sort()) === JSON.stringify(['dailyQuota', 'disclaimer']));
  check('el contrato de status NO expone turnCount/maxTurns (conceptos por conversación, no por cuenta)', !('turnCount' in aiMeStatusResponseSchema.shape) && !('maxTurns' in aiMeStatusResponseSchema.shape));
  check('el hub solo pide status cuando el historial está VACÍO (no duplica el fetch si ya hay datos frescos)', /if \(conversations\.length > 0\) \{\s*setStatusState\(\{ status: 'idle' \}\);\s*return;\s*\}\s*await loadStatus\(\);/.test(hubCode));
  check('el encabezado se arma SOLO desde quotaSource (servidor) o statusState.data (servidor)', hubCode.includes('const header = quotaSource') && hubCode.includes('statusState.data.dailyQuota') && hubCode.includes('statusState.data.disclaimer'));
  check('si status falla, el hub muestra el mensaje del servidor y ofrece reintento -- nunca un placeholder', hubCode.includes("statusState.status === 'error'") && hubCode.includes('{statusState.message}') && hubCode.includes('Reintentar'));
  check('si status está cargando, el hub muestra un estado de carga honesto (sin cuota provisional)', hubCode.includes("statusState.status === 'loading'") && hubCode.includes('Cargando tu cuota diaria'));
  check('cuota/disclaimer nunca se renderizan si `header` es null (no hay rama de valores por defecto)', hubCode.includes('{header ? <AiQuotaSummary dailyQuota={header.dailyQuota} /> : null}'));

  console.log('--- 26b. Cero fallbacks hardcodeados de cuota/disclaimer en TODA la superficie IA ---');
  check('ningún archivo de la superficie IA contiene el texto del disclaimer del backend', !/puede cometer errores|Verifica la informaci/.test(allAiCode));
  check('ningún archivo de la superficie IA construye un objeto con forma de dailyQuota (limit/consumed/remaining literales)', !/limit\s*:\s*\d+/.test(allAiCode) && !/remaining\s*:\s*\d+/.test(allAiCode) && !/consumed\s*:\s*\d+/.test(allAiCode));
  check('ningún archivo de la superficie IA fabrica un resetAt (nunca calcula la frontera de día UTC)', !/resetAt\s*:\s*(new Date|['"`])/.test(allAiCode) && !allAiCode.includes('setUTCHours'));
  check('ningún `dailyQuota ??`/`disclaimer ??` con valor por defecto en la superficie IA', !/dailyQuota\s*(\?\?|\|\|)\s*[^=]/.test(allAiCode) && !/disclaimer\s*(\?\?|\|\|)\s*[^=]/.test(allAiCode));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Superficie Móvil del Tutor IA (LEF Bloque VI, Incremento 8) pasaron.');
}

main();
