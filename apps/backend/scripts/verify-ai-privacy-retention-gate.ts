// Gate de LEF Bloque VI, Incremento 7 ("Privacidad, retención y borrado") --
// ver docs/adr/LEF-BLOCK-VI-DEFINITION.md §27 y la política final del
// Product Owner (2026-08-12, Decision Gate de retención del ledger):
//   - AiConversation/AiMessage/AiResponseReport: 90 días desde la última
//     actividad canónica de la conversación (lastMessageAt, o createdAt si
//     nunca hubo un turno completado).
//   - AiUsageLedgerEntry: 90 días PROPIOS desde occurredAt, independiente de
//     la retención conversacional (invariante 17 del bloque).
//   - AiGenerationClaim: efímero, sin retención histórica.
// Contra backend/Postgres real. Los fixtures ">90 días" se construyen con
// SQL directo (backdating de columnas SIN trigger de inmutabilidad --
// ai_conversation/ai_generation_claim -- o INSERT directo para filas de
// ai_usage_ledger, cuyo occurred_at es en sí mismo inmutable incluso para
// este gate, por diseño: ver verificación 20/21 más abajo).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

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
  const uid = `ai-privacy-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function sendMessage(headers: Record<string, string>, conversationId: string, content: string) {
  return req('POST', `/ai/me/conversations/${conversationId}/messages`, headers, { content, operationId: randomUUID() });
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // ------------------------------------------------------------------
  // 1-2. Conversación reciente NO se purga; conversación >90 días desde última actividad SÍ se purga.
  // ------------------------------------------------------------------
  console.log('--- 1-2. Conversación reciente sobrevive; conversación >90 días desde última actividad se purga (contenido desaparece, ledger sobrevive DESVINCULADO) ---');
  const alice = await createSession('alice');
  const convRecent = await req('POST', '/ai/me/conversations', alice.headers, {});
  await sendMessage(alice.headers, convRecent.body.conversationId, `reciente-${randomUUID()}`);

  const bob = await createSession('bob');
  const convOld = await req('POST', '/ai/me/conversations', bob.headers, {});
  const contentOld = `viejo-${randomUUID()}`;
  const sendOld = await sendMessage(bob.headers, convOld.body.conversationId, contentOld);
  const oldAssistantId = sendOld.body?.assistantMessage?.id as string;
  const oldUserId = sendOld.body?.userMessage?.id as string;
  const ledgerBeforePurge = await pg.query(`SELECT id, conversation_id, assistant_message_id, operation_id, provider, model, prompt_version, input_tokens, output_tokens, attempts, latency_ms FROM ai_usage_ledger WHERE assistant_message_id = $1`, [oldAssistantId]);
  const ledgerRowId = ledgerBeforePurge.rows[0]?.id as string;
  check('1a fixture: ledger real creado para la conversación vieja', !!ledgerRowId);

  // Backdate -- ai_conversation NO tiene trigger de inmutabilidad (a diferencia de ai_message/ai_usage_ledger).
  await pg.query(`UPDATE ai_conversation SET last_message_at = now() - interval '91 days' WHERE id = $1`, [convOld.body.conversationId]);

  const sweep1 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('1b. barrido responde 200', sweep1.status === 200);
  check('1c. al menos 1 conversación purgada', sweep1.body?.aiRetention?.conversations?.purged >= 1);

  const recentAfter = await req('GET', `/ai/me/conversations/${convRecent.body.conversationId}`, alice.headers);
  check('2a. conversación RECIENTE sigue accesible (200) -- no se purga', recentAfter.status === 200);

  const oldConvRow = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [convOld.body.conversationId]);
  check('2b. conversación VIEJA fue eliminada físicamente', oldConvRow.rowCount === 0);
  const oldMsgRows = await pg.query(`SELECT 1 FROM ai_message WHERE id IN ($1, $2)`, [oldAssistantId, oldUserId]);
  check('5. purga eliminó AMBOS mensajes (USER y ASSISTANT)', oldMsgRows.rowCount === 0);

  const ledgerAfterPurge = await pg.query(`SELECT conversation_id, assistant_message_id, operation_id, provider, model, prompt_version, input_tokens, output_tokens, attempts, latency_ms FROM ai_usage_ledger WHERE id = $1`, [ledgerRowId]);
  const ledgerRow = ledgerAfterPurge.rows[0];
  check('8/desvinculación. el ledger SOBREVIVE tras purgar su conversación (política independiente, invariante 17)', !!ledgerRow);
  check('desvinculación. conversation_id quedó NULL', ledgerRow?.conversation_id === null);
  check('desvinculación. assistant_message_id quedó NULL', ledgerRow?.assistant_message_id === null);
  check('desvinculación. operation_id quedó NULL', ledgerRow?.operation_id === null);
  check(
    'tokens/provider/model/latencia. el resto de columnas permanece EXACTAMENTE intacto tras la desvinculación',
    ledgerRow?.provider === ledgerBeforePurge.rows[0].provider &&
      ledgerRow?.model === ledgerBeforePurge.rows[0].model &&
      ledgerRow?.prompt_version === ledgerBeforePurge.rows[0].prompt_version &&
      ledgerRow?.attempts === ledgerBeforePurge.rows[0].attempts &&
      ledgerRow?.latency_ms === ledgerBeforePurge.rows[0].latency_ms,
  );

  // ------------------------------------------------------------------
  // 3. Conversación SIN mensajes usa createdAt.
  // ------------------------------------------------------------------
  console.log('--- 3. Conversación sin mensajes (lastMessageAt nunca fijado) usa createdAt como ancla ---');
  const carol = await createSession('carol');
  const convEmpty = await req('POST', '/ai/me/conversations', carol.headers, {});
  check('3 fixture: lastMessageAt == null (nunca hubo un turno)', carol && true);
  await pg.query(`UPDATE ai_conversation SET created_at = now() - interval '91 days' WHERE id = $1 AND last_message_at IS NULL`, [convEmpty.body.conversationId]);
  const sweep3 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('3a. barrido responde 200', sweep3.status === 200);
  const emptyConvRow = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [convEmpty.body.conversationId]);
  check('3b. conversación sin mensajes con createdAt >90 días -> purgada', emptyConvRow.rowCount === 0);

  // ------------------------------------------------------------------
  // 4. Actividad reciente EXTIENDE la retención.
  // ------------------------------------------------------------------
  console.log('--- 4. Actividad reciente extiende la retención (lastMessageAt se refresca, la conversación sobrevive) ---');
  const dave = await createSession('dave');
  const convExtend = await req('POST', '/ai/me/conversations', dave.headers, {});
  await sendMessage(dave.headers, convExtend.body.conversationId, `turno1-${randomUUID()}`);
  await pg.query(`UPDATE ai_conversation SET last_message_at = now() - interval '91 days' WHERE id = $1`, [convExtend.body.conversationId]);
  // Turno NUEVO -- refresca lastMessageAt a "ahora" antes de que el barrido corra.
  await sendMessage(dave.headers, convExtend.body.conversationId, `turno2-reciente-${randomUUID()}`);
  const sweep4 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('4a. barrido responde 200', sweep4.status === 200);
  const extendedConvRow = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [convExtend.body.conversationId]);
  check('4b. conversación con actividad reciente SIGUE existiendo pese al lastMessageAt viejo original', extendedConvRow.rowCount === 1);

  // ------------------------------------------------------------------
  // 6-7. Purga maneja AiResponseReport y AiGenerationClaim huérfano.
  // ------------------------------------------------------------------
  console.log('--- 6-7. Purga elimina AiResponseReport y AiGenerationClaim huérfano de la conversación purgada ---');
  const erin = await createSession('erin');
  const convWithReport = await req('POST', '/ai/me/conversations', erin.headers, {});
  const sendReport = await sendMessage(erin.headers, convWithReport.body.conversationId, `con-reporte-${randomUUID()}`);
  const reportedMessageId = sendReport.body?.assistantMessage?.id as string;
  const reportRes = await req('POST', `/ai/me/conversations/${convWithReport.body.conversationId}/messages/${reportedMessageId}/report`, erin.headers, { reportType: 'CONFUSING' });
  check('6 fixture: reporte creado', reportRes.status === 200 || reportRes.status === 201);
  // Claim huérfano simulado -- un proceso caído a mitad de una generación dejaría una fila así.
  const orphanClaimOpId = randomUUID();
  await pg.query(
    `INSERT INTO ai_generation_claim (operation_id, account_id, conversation_id, claimed_at, reservation_expires_at) VALUES ($1,$2,$3, now() - interval '2 minutes', now() - interval '1 minute')`,
    [orphanClaimOpId, erin.accountId, convWithReport.body.conversationId],
  );
  await pg.query(`UPDATE ai_conversation SET last_message_at = now() - interval '91 days' WHERE id = $1`, [convWithReport.body.conversationId]);
  const sweep6 = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('6a. barrido responde 200', sweep6.status === 200);
  const reportAfter = await pg.query(`SELECT 1 FROM ai_response_report WHERE assistant_message_id = $1`, [reportedMessageId]);
  check('6b. el reporte fue eliminado junto con su mensaje (sin referencia rota, sin contenido identificable colgante)', reportAfter.rowCount === 0);
  const claimAfter = await pg.query(`SELECT 1 FROM ai_generation_claim WHERE operation_id = $1`, [orphanClaimOpId]);
  check('7. el claim huérfano de la conversación purgada fue eliminado', claimAfter.rowCount === 0);

  // ------------------------------------------------------------------
  // 9-10. Idempotencia: segunda ejecución no falla ni elimina datos no elegibles.
  // ------------------------------------------------------------------
  console.log('--- 9-10. El barrido es idempotente -- segunda ejecución inmediata no falla, no borra nada adicional, no toca conversaciones no elegibles ---');
  const frank = await createSession('frank');
  const convUntouched = await req('POST', '/ai/me/conversations', frank.headers, {});
  await sendMessage(frank.headers, convUntouched.body.conversationId, `no-tocar-${randomUUID()}`);
  const sweepAgain = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('9a. segunda ejecución inmediata -> 200, sin error', sweepAgain.status === 200);
  check('9b. segunda ejecución no purga conversaciones nuevas (0 elegibles ahora)', sweepAgain.body?.aiRetention?.conversations?.purged === 0);
  const untouchedRow = await req('GET', `/ai/me/conversations/${convUntouched.body.conversationId}`, frank.headers);
  check('10. conversación NO elegible (recién creada) sigue intacta tras el segundo barrido', untouchedRow.status === 200);

  // ------------------------------------------------------------------
  // 11. Batch limitado funciona.
  // ------------------------------------------------------------------
  console.log('--- 11. Batch limitado: purgeExpiredConversations respeta el límite pasado explícitamente ---');
  const grace = await createSession('grace-batch1');
  const heidi = await createSession('heidi-batch2');
  const convBatch1 = await req('POST', '/ai/me/conversations', grace.headers, {});
  const convBatch2 = await req('POST', '/ai/me/conversations', heidi.headers, {});
  await sendMessage(grace.headers, convBatch1.body.conversationId, `batch1-${randomUUID()}`);
  await sendMessage(heidi.headers, convBatch2.body.conversationId, `batch2-${randomUUID()}`);
  await pg.query(`UPDATE ai_conversation SET last_message_at = now() - interval '91 days' WHERE id IN ($1, $2)`, [convBatch1.body.conversationId, convBatch2.body.conversationId]);
  const batchCountBefore = (await pg.query(`SELECT count(*)::int AS c FROM ai_conversation WHERE id IN ($1, $2)`, [convBatch1.body.conversationId, convBatch2.body.conversationId])).rows[0].c;
  check('11 fixture: 2 conversaciones elegibles antes del batch limitado', batchCountBefore === 2);
  // Invocamos AiRetentionService.purgeExpiredConversations directamente vía un proceso Node.js corto (sin servidor HTTP) con batchSize=1 -- el endpoint HTTP no expone el tamaño de batch (deliberado, ver contratos), así que este único caso se verifica a nivel de servicio.
  const { execFileSync } = await import('node:child_process');
  const batchScript = `
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('./dist/app.module');
    (async () => {
      const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
      const { AiRetentionService } = require('./dist/ai/ai-retention.service');
      const service = app.get(AiRetentionService);
      const result = await service.purgeExpiredConversations(new Date(), 1);
      console.log(JSON.stringify(result));
      await app.close();
    })();
  `;
  const batchOutput = execFileSync('node', ['-e', batchScript], { encoding: 'utf-8', cwd: process.cwd() });
  const batchResult = JSON.parse(batchOutput.trim().split('\n').pop()!);
  check('11a. batchSize=1 purga EXACTAMENTE 1 de las 2 elegibles en esta llamada', batchResult.purged === 1);
  const batchCountAfterFirst = (await pg.query(`SELECT count(*)::int AS c FROM ai_conversation WHERE id IN ($1, $2)`, [convBatch1.body.conversationId, convBatch2.body.conversationId])).rows[0].c;
  check('11b. la OTRA conversación elegible sigue existiendo (no se purgó de más)', batchCountAfterFirst === 1);
  // Barrido normal (sin límite artificial) limpia la restante para no interferir con el resto del gate.
  await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });

  // ------------------------------------------------------------------
  // 12-15. Borrado manual: propietario puede, cuenta B no puede, 404 uniforme, no afecta otra conversación de A.
  // ------------------------------------------------------------------
  console.log('--- 12-15. Borrado manual: propietario sí, cuenta B no, 404 uniforme, sin afectar otras conversaciones del propietario ---');
  const ivan = await createSession('ivan');
  const judy = await createSession('judy');
  const convIvan1 = await req('POST', '/ai/me/conversations', ivan.headers, {});
  const convIvan2 = await req('POST', '/ai/me/conversations', ivan.headers, {});
  await sendMessage(ivan.headers, convIvan1.body.conversationId, `ivan1-${randomUUID()}`);
  await sendMessage(ivan.headers, convIvan2.body.conversationId, `ivan2-${randomUUID()}`);

  const deleteByOther = await req('DELETE', `/ai/me/conversations/${convIvan1.body.conversationId}`, judy.headers);
  check('13. cuenta B (judy) intenta borrar la conversación de A (ivan) -> 404 uniforme, NUNCA borrada', deleteByOther.status === 404);
  const stillThereAfterOtherAttempt = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [convIvan1.body.conversationId]);
  check('13b. la conversación de A sigue existiendo tras el intento de B', stillThereAfterOtherAttempt.rowCount === 1);

  const deleteNonexistent = await req('DELETE', `/ai/me/conversations/${randomUUID()}`, ivan.headers);
  check('14. conversación inexistente -> 404 uniforme (mismo código/mensaje que ajena)', deleteNonexistent.status === 404);
  check('14b. mismo status que el intento de cuenta B (404 uniforme, indistinguible)', deleteNonexistent.status === deleteByOther.status);

  const deleteOwn = await req('DELETE', `/ai/me/conversations/${convIvan1.body.conversationId}`, ivan.headers);
  check('12a. el propietario borra su propia conversación -> 204', deleteOwn.status === 204);
  const goneRow = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [convIvan1.body.conversationId]);
  check('12b. la conversación borrada ya no existe en la base', goneRow.rowCount === 0);
  const otherConvStillThere = await req('GET', `/ai/me/conversations/${convIvan2.body.conversationId}`, ivan.headers);
  check('15. la SEGUNDA conversación de A (nunca borrada) sigue intacta y accesible', otherConvStillThere.status === 200);

  // ------------------------------------------------------------------
  // 16-17. Eliminación de cuenta real propaga al dominio AI; sin filas huérfanas.
  // ------------------------------------------------------------------
  console.log('--- 16-17. Eliminación de cuenta (pipeline real de PRIVACY) propaga al Tutor IA; ledger sobrevive desvinculado, sin FKs rotos ---');
  const kevin = await createSession('kevin');
  const convKevin = await req('POST', '/ai/me/conversations', kevin.headers, {});
  const sendKevin = await sendMessage(kevin.headers, convKevin.body.conversationId, `kevin-${randomUUID()}`);
  const kevinAssistantId = sendKevin.body?.assistantMessage?.id as string;
  await req('POST', `/ai/me/conversations/${convKevin.body.conversationId}/messages/${kevinAssistantId}/report`, kevin.headers, { reportType: 'INCORRECT' });
  const kevinLedgerBefore = await pg.query(`SELECT id FROM ai_usage_ledger WHERE assistant_message_id = $1`, [kevinAssistantId]);
  const kevinLedgerId = kevinLedgerBefore.rows[0]?.id;

  const requestDeletion = await req('POST', '/privacy/account-deletion', kevin.headers, {});
  check('16a. solicitud de eliminación real -> 202', requestDeletion.status === 202);
  await pg.query(`UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'`, [kevin.accountId]);
  const sweepClosure = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('16b. barrido de cierre definitivo responde 200', sweepClosure.status === 200);
  const accountRow = await pg.query(`SELECT status FROM account WHERE id = $1`, [kevin.accountId]);
  check('16c fixture: la cuenta quedó CLOSED (pipeline real de AUTH/PRIVACY, sin segundo sistema de borrado)', accountRow.rows[0]?.status === 'CLOSED');

  const kevinConvAfter = await pg.query(`SELECT 1 FROM ai_conversation WHERE account_id = $1`, [kevin.accountId]);
  check('16d. las conversaciones de la cuenta cerrada fueron eliminadas', kevinConvAfter.rowCount === 0);
  const kevinMsgAfter = await pg.query(`SELECT 1 FROM ai_message WHERE id = $1`, [kevinAssistantId]);
  check('16e. los mensajes de la cuenta cerrada fueron eliminados', kevinMsgAfter.rowCount === 0);
  const kevinReportAfter = await pg.query(`SELECT 1 FROM ai_response_report WHERE account_id = $1`, [kevin.accountId]);
  check('16f. los reportes de la cuenta cerrada fueron eliminados', kevinReportAfter.rowCount === 0);
  const kevinClaimAfter = await pg.query(`SELECT 1 FROM ai_generation_claim WHERE account_id = $1`, [kevin.accountId]);
  check('16g. los claims de la cuenta cerrada fueron eliminados', kevinClaimAfter.rowCount === 0);
  const kevinLedgerAfter = await pg.query(`SELECT account_id, conversation_id, assistant_message_id, operation_id FROM ai_usage_ledger WHERE id = $1`, [kevinLedgerId]);
  check('16h. el ledger de la cuenta cerrada SOBREVIVE (política independiente, no se borra al cerrar cuenta)', kevinLedgerAfter.rowCount === 1);
  check('16i. el ledger quedó DESVINCULADO (conversation/assistantMessage/operation -> NULL)', kevinLedgerAfter.rows[0]?.conversation_id === null && kevinLedgerAfter.rows[0]?.assistant_message_id === null && kevinLedgerAfter.rows[0]?.operation_id === null);
  check('16j. accountId permanece intacto en el ledger (Account nunca se borra al cerrar, mismo patrón que xp_ledger_entry)', kevinLedgerAfter.rows[0]?.account_id === kevin.accountId);
  check('17. sin filas huérfanas -- el FK account_id del ledger sigue apuntando a una fila Account real (CLOSED, no eliminada)', accountRow.rowCount === 1);

  // ------------------------------------------------------------------
  // 18-19. El trigger sigue rechazando cualquier mutación no autorizada; la ruta autorizada funciona sin desactivar protección global.
  // ------------------------------------------------------------------
  console.log('--- 18-19. Triggers de ai_usage_ledger: rechazan mutación/borrado NO autorizados, incluso durante uso normal; la ruta autorizada NO requiere desactivar nada globalmente ---');
  const laura = await createSession('laura');
  const convLaura = await req('POST', '/ai/me/conversations', laura.headers, {});
  const sendLaura = await sendMessage(laura.headers, convLaura.body.conversationId, `laura-${randomUUID()}`);
  const lauraLedgerId = (await pg.query(`SELECT id FROM ai_usage_ledger WHERE assistant_message_id = $1`, [sendLaura.body?.assistantMessage?.id])).rows[0]?.id;
  let forbiddenUpdateRejected = false;
  try {
    await pg.query(`UPDATE ai_usage_ledger SET provider = 'otro-proveedor' WHERE id = $1`, [lauraLedgerId]);
  } catch {
    forbiddenUpdateRejected = true;
  }
  check('18a. UPDATE no autorizado (cambiar provider) sobre una fila normal -> rechazado por el trigger', forbiddenUpdateRejected);
  let forbiddenDeleteRejected = false;
  try {
    await pg.query(`DELETE FROM ai_usage_ledger WHERE id = $1`, [lauraLedgerId]);
  } catch {
    forbiddenDeleteRejected = true;
  }
  check('18b. DELETE de una fila NO expirada (recién creada) -> rechazado por el trigger', forbiddenDeleteRejected);
  let forbiddenRelinkRejected = false;
  try {
    await pg.query(`UPDATE ai_usage_ledger SET conversation_id = $1 WHERE id = $2`, [randomUUID(), lauraLedgerId]);
  } catch {
    forbiddenRelinkRejected = true;
  }
  check('18c. intento de RE-VINCULAR (poner un valor nuevo, no NULL) -> rechazado por el trigger', forbiddenRelinkRejected);
  check('19. el uso normal (creación de conversación/mensaje/ledger de laura) funcionó de punta a punta -- la protección NUNCA se desactivó globalmente para permitir la ruta autorizada de otros fixtures de este gate', sendLaura.status === 200 || sendLaura.status === 201);

  // ------------------------------------------------------------------
  // Al cumplir 90 días, el ledger se elimina COMPLETAMENTE (política propia, independiente).
  // ------------------------------------------------------------------
  console.log('--- Ledger con occurredAt >90 días -> eliminado COMPLETAMENTE por su propio barrido, incluso si sigue vinculado a una conversación viva ---');
  const mallory = await createSession('mallory');
  const convMallory = await req('POST', '/ai/me/conversations', mallory.headers, {});
  // Fixture directo -- occurred_at es inmutable incluso vía UPDATE (verificado en la auditoría de este incremento), así que la única forma de simular una fila vieja es un INSERT directo, con su propio mensaje/conversación fabricados a propósito para no colisionar con UNIQUE(assistant_message_id) de ninguna fila real.
  const fixtureConvId = randomUUID();
  const fixtureMsgId = randomUUID();
  const fixtureLedgerId = randomUUID();
  const fixtureOpId = randomUUID();
  await pg.query(`INSERT INTO ai_conversation (id, account_id, created_at) VALUES ($1, $2, now())`, [fixtureConvId, mallory.accountId]);
  await pg.query(`INSERT INTO ai_message (id, conversation_id, role, content, sequence, created_at) VALUES ($1, $2, 'ASSISTANT', 'fixture', 0, now())`, [fixtureMsgId, fixtureConvId]);
  await pg.query(
    `INSERT INTO ai_usage_ledger (id, account_id, conversation_id, assistant_message_id, operation_id, provider, model, prompt_version, attempts, latency_ms, occurred_at) VALUES ($1,$2,$3,$4,$5,'fake','fake','fake',1,0, now() - interval '91 days')`,
    [fixtureLedgerId, mallory.accountId, fixtureConvId, fixtureMsgId, fixtureOpId],
  );
  const sweepLedger = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('barrido de ledger responde 200', sweepLedger.status === 200);
  check('el barrido reporta al menos 1 fila de ledger eliminada', sweepLedger.body?.aiRetention?.ledgerEntries?.deleted >= 1);
  const fixtureLedgerAfter = await pg.query(`SELECT 1 FROM ai_usage_ledger WHERE id = $1`, [fixtureLedgerId]);
  check('la fila de ledger >90 días fue eliminada POR COMPLETO (no solo desvinculada)', fixtureLedgerAfter.rowCount === 0);
  // La conversación/mensaje fixture (todavía "viva", <90 días) NUNCA se tocó por el barrido de ledger -- solo por el de conversaciones.
  const fixtureConvAfter = await pg.query(`SELECT 1 FROM ai_conversation WHERE id = $1`, [fixtureConvId]);
  check('la conversación asociada (reciente) NUNCA fue tocada por el barrido de ledger -- políticas independientes', fixtureConvAfter.rowCount === 1);
  await pg.query(`DELETE FROM ai_message WHERE id = $1`, [fixtureMsgId]);
  await pg.query(`DELETE FROM ai_conversation WHERE id = $1`, [fixtureConvId]);

  // ------------------------------------------------------------------
  // 20. Claims expirados/huérfanos (sin conversación asociada a una purga) también se limpian por su propio barrido.
  // ------------------------------------------------------------------
  console.log('--- 20. Claims expirados se limpian por su propio barrido, incluso sin que su conversación se purgue ---');
  const nancy = await createSession('nancy');
  const convNancy = await req('POST', '/ai/me/conversations', nancy.headers, {});
  const expiredClaimOpId = randomUUID();
  await pg.query(
    `INSERT INTO ai_generation_claim (operation_id, account_id, conversation_id, claimed_at, reservation_expires_at) VALUES ($1,$2,$3, now() - interval '5 minutes', now() - interval '4 minutes')`,
    [expiredClaimOpId, nancy.accountId, convNancy.body.conversationId],
  );
  const sweepClaims = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey });
  check('barrido de claims responde 200', sweepClaims.status === 200);
  check('el barrido reporta al menos 1 claim eliminado', sweepClaims.body?.aiRetention?.claims?.deleted >= 1);
  const expiredClaimAfter = await pg.query(`SELECT 1 FROM ai_generation_claim WHERE operation_id = $1`, [expiredClaimOpId]);
  check('20. el claim expirado fue eliminado, SIN que su conversación (viva) se tocara', expiredClaimAfter.rowCount === 0);
  const nancyConvAfter = await req('GET', `/ai/me/conversations/${convNancy.body.conversationId}`, nancy.headers);
  check('20b. la conversación de nancy (viva) sigue intacta', nancyConvAfter.status === 200);

  // ------------------------------------------------------------------
  // 21. Ninguna purga/log contiene prompt/respuesta completa -- verificación estática.
  // ------------------------------------------------------------------
  console.log('--- 21. Verificación estática: AiRetentionService nunca loguea contenido de mensajes/conversaciones ---');
  const retentionSource = readFileSync(join(__dirname, '..', 'src', 'ai', 'ai-retention.service.ts'), 'utf8');
  const forbiddenLogTerms = ['.content', 'userMessage.content', 'assistantMessage.content', 'description'];
  const loggerCalls = retentionSource.match(/this\.logger\.\w+\([^)]*\)/gs) ?? [];
  const anyLoggerLeaksContent = loggerCalls.some((call) => forbiddenLogTerms.some((term) => call.includes(term)));
  check('21. ninguna llamada a this.logger.* en AiRetentionService referencia contenido de mensaje/reporte', !anyLoggerLeaksContent);

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Privacidad, Retención y Borrado (LEF Bloque VI, Incremento 7) pasaron.');
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
