// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1B:
//   - `GET /me/subscription` (resumen de gestion, solo lectura, sin datos crudos)
//   - minimizacion de datos de facturacion en el CIERRE DEFINITIVO de la cuenta
//   - barrido de RETENCION por fila + limpieza de `Account.obfuscated_account_id`
//   - ancla del reloj de retencion: GREATEST(account.closed_at, account_subscription.updated_at)
//
// Integracion contra el servidor de gates + DB (`axioma_gates_dev` via
// run-gate.ts) + SQL directo. NO llama a Google. El barrido de retencion se
// dispara via `POST /internal/billing-retention/sweep` (InternalOpsGuard); el
// `retentionDays` del body es SOLO para gates/ops -- el @Cron nunca lo pasa y
// la regla "config ausente -> NO-OP" se prueba aparte (grupo P).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { encodeFakeSubscriptionToken } from '../src/subscription/fake-subscription-provider.adapter';
import { encodeFakeRtdnOidcToken } from '../src/subscription/rtdn/fake-rtdn-push-authenticator';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const SRC = join(__dirname, '..', 'src');
const REPO = join(__dirname, '..', '..', '..');
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
const EXPECTED_AUD = process.env.GOOGLE_PLAY_RTDN_OIDC_AUDIENCE ?? '';
const EXPECTED_SA = process.env.GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL ?? '';
const DAY = 24 * 60 * 60 * 1000;
const MGMT_URL = 'https://play.google.com/store/account/subscriptions?sku=zetrynd_premium&package=com.zetrynd.app';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
const readSrc = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const readRepo = (rel: string) => readFileSync(join(REPO, rel), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

const createdAccountIds: string[] = [];
const usedTokens: string[] = [];
const usedMessageIds: string[] = [];

async function makeSession(pg: Client, label: string) {
  const uid = `pb1b-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const accountId = randomUUID();
  const sessionId = randomUUID();
  await pg.query(`INSERT INTO account (id, status, session_version, created_at, updated_at) VALUES ($1,'ACTIVE',1,now(),now())`, [accountId]);
  await pg.query(
    `INSERT INTO auth_identity (id, account_id, provider_code, provider_subject, email_normalized, email_verified_at, linked_at)
     VALUES ($1,$2,'firebase',$3,$4,now(),now())`,
    [randomUUID(), accountId, uid, `${uid}@example.com`],
  );
  await pg.query(`INSERT INTO auth_session (id, account_id, session_version, created_at, expires_at) VALUES ($1,$2,1,now(),now()+interval '1 day')`, [sessionId, accountId]);
  createdAccountIds.push(accountId);
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  return { accountId, uid, auth: { authorization: `Bearer ${idToken}`, 'x-session-id': sessionId } };
}

async function insertSub(
  pg: Client,
  opts: {
    accountId: string;
    state: string;
    expiryDeltaMs?: number | null;
    purchaseToken?: string;
    linkedPurchaseToken?: string | null;
    resubscribedFrom?: string | null;
    updatedAtDeltaMs?: number;
    rawSnapshot?: boolean;
    latestNotificationType?: string | null;
    autoRenewing?: boolean;
    cancelReason?: string | null;
    cancelUserInitiated?: boolean | null;
    cancelTimeDeltaMs?: number | null;
  },
): Promise<string> {
  const token = opts.purchaseToken ?? `pb1b-tok-${randomUUID()}`;
  usedTokens.push(token);
  await pg.query(
    `INSERT INTO account_subscription
       (id, account_id, provider, product_id, base_plan_id, purchase_token, linked_purchase_token,
        resubscribed_from_purchase_token, state, expiry_time, start_time, auto_renewing,
        acknowledgement_state, latest_notification_type, raw_snapshot, cancel_reason,
        cancel_user_initiated, cancel_time, created_at, updated_at)
     VALUES ($1,$2,'GOOGLE_PLAY','zetrynd_premium','premium-monthly',$3,$4,$5,$6::subscription_state,$7,
        now() - interval '60 days', $8, 'ACKNOWLEDGED', $9, $10::jsonb, $11, $12, $13, now(),
        now() + ($14 || ' milliseconds')::interval)`,
    [
      randomUUID(),
      opts.accountId,
      token,
      opts.linkedPurchaseToken ?? null,
      opts.resubscribedFrom ?? null,
      opts.state,
      opts.expiryDeltaMs === undefined ? null : opts.expiryDeltaMs === null ? null : new Date(Date.now() + opts.expiryDeltaMs),
      opts.autoRenewing ?? true,
      opts.latestNotificationType === undefined ? 'SUBSCRIPTION_RENEWED' : opts.latestNotificationType,
      opts.rawSnapshot === false ? null : JSON.stringify({ fake: true, diagnostic: 'x' }),
      opts.cancelReason === undefined ? null : opts.cancelReason,
      opts.cancelUserInitiated === undefined ? null : opts.cancelUserInitiated,
      opts.cancelTimeDeltaMs == null ? null : new Date(Date.now() + opts.cancelTimeDeltaMs),
      String(opts.updatedAtDeltaMs ?? 0),
    ],
  );
  return token;
}

async function insertRtdnEvent(pg: Client, purchaseToken: string, status: string) {
  const messageId = `pb1b-msg-${randomUUID()}`;
  usedMessageIds.push(messageId);
  await pg.query(
    `INSERT INTO google_play_rtdn_event (id, message_id, provider, package_name, notification_kind, notification_type, purchase_token, status, attempts, created_at, updated_at)
     VALUES ($1,$2,'GOOGLE_PLAY','com.zetrynd.app','subscription',2,$3,$4::rtdn_processing_status,0,now(),now())`,
    [randomUUID(), messageId, purchaseToken, status],
  );
  return messageId;
}

const summaryOf = (auth: Record<string, string>) => req('GET', '/me/subscription', auth);
const subRow = async (pg: Client, token: string) =>
  (await pg.query(
    `SELECT state, raw_snapshot, latest_notification_type, auto_renewing, cancel_reason, cancel_user_initiated, cancel_time, account_id
     FROM account_subscription WHERE purchase_token = $1`,
    [token],
  )).rows[0] as
    | { state: string; raw_snapshot: unknown; latest_notification_type: string | null; auto_renewing: boolean; cancel_reason: string | null; cancel_user_initiated: boolean | null; cancel_time: Date | null; account_id: string }
    | undefined;
const accountRow = async (pg: Client, id: string) =>
  (await pg.query(`SELECT status, closed_at, session_version, obfuscated_account_id FROM account WHERE id = $1`, [id])).rows[0] as
    | { status: string; closed_at: Date | null; session_version: number; obfuscated_account_id: string | null }
    | undefined;

async function finalizeClosure(pg: Client, auth: Record<string, string>, accountId: string) {
  const r = await req('POST', '/privacy/account-deletion', auth);
  if (r.status !== 202 && r.status !== 200) throw new Error(`account-deletion -> ${r.status} ${r.raw}`);
  await pg.query(`UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'`, [accountId]);
  const s = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  if (s.status !== 200 && s.status !== 201) throw new Error(`sweep -> ${s.status} ${s.raw}`);
}

/** Ruta PRODUCTION-CAPABLE (sin body, solo env). */
const retentionSweepEnvOnly = () => req('POST', '/internal/billing-retention/sweep', { 'x-internal-ops-key': opsKey }, {});
/** Ruta SOLO NO-PRODUCCION (rejectInProduction) -- override para gates. */
const retentionSweep = (retentionDays: number) =>
  req('POST', '/internal/billing-retention/_test/sweep', { 'x-internal-ops-key': opsKey }, { retentionDays });

// --- RTDN helpers (para la prueba de atribucion de primer contacto) ------
const oidcBearer = () => `Bearer ${encodeFakeRtdnOidcToken({ email: EXPECTED_SA, aud: EXPECTED_AUD, email_verified: true })}`;
function rtdnEnvelope(messageId: string, purchaseToken: string, notificationType: number) {
  usedMessageIds.push(messageId);
  const dn = {
    version: '1.0',
    packageName: 'com.zetrynd.app',
    eventTimeMillis: String(Date.now()),
    subscriptionNotification: { version: '1.0', notificationType, purchaseToken, subscriptionId: 'zetrynd_premium' },
  };
  return { message: { data: Buffer.from(JSON.stringify(dn), 'utf8').toString('base64'), messageId }, subscription: 'projects/z/subscriptions/rtdn' };
}
const postRtdn = (body: unknown) => req('POST', '/internal/google-play/rtdn', { authorization: oidcBearer() }, body);
const processRtdn = () => req('POST', '/internal/google-play/rtdn/_internal/process', { 'x-internal-ops-key': opsKey });

/**
 * Simula "paso del tiempo desde el cierre": envejece closed_at + el updated_at
 * de las filas de la cuenta. NECESARIO porque `applyAccountClosure` (correcto)
 * bumpea `updated_at` de todas las filas al cerrar -> el reloj de retencion
 * arranca en el cierre, no antes.
 */
async function ageClosedAccount(pg: Client, accountId: string, days: number) {
  await pg.query(`UPDATE account SET closed_at = now() - ($2 || ' days')::interval WHERE id = $1`, [accountId, String(days)]);
  await pg.query(`UPDATE account_subscription SET updated_at = now() - ($2 || ' days')::interval WHERE account_id = $1`, [accountId, String(days)]);
}

async function main() {
  check('(precondicion) INTERNAL_OPS_KEY configurada', opsKey.length > 0);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  try {
    // ====================================================================
    console.log('--- SUMMARY (A-J) ---');
    {
      const s = await makeSession(pg, 'sum-a');
      const r = await summaryOf(s.auth);
      check('A: FREE / sin suscripcion -> 200 { tier:FREE, isSubscribed:false, renewalStatus:none, accessUntil:null, paymentIssue:false }',
        r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ tier: 'FREE', isSubscribed: false, renewalStatus: 'none', accessUntil: null, paymentIssue: false, managementUrl: MGMT_URL }));
    }
    {
      const s = await makeSession(pg, 'sum-b');
      await insertSub(pg, { accountId: s.accountId, state: 'ACTIVE', expiryDeltaMs: 30 * DAY });
      const r = await summaryOf(s.auth);
      const b = r.body as Record<string, unknown>;
      check('B: ACTIVE -> tier PREMIUM, isSubscribed true, renewalStatus renews, paymentIssue false, accessUntil ISO futuro',
        b.tier === 'PREMIUM' && b.isSubscribed === true && b.renewalStatus === 'renews' && b.paymentIssue === false && typeof b.accessUntil === 'string' && new Date(b.accessUntil as string).getTime() > Date.now());
    }
    {
      const s = await makeSession(pg, 'sum-c');
      await insertSub(pg, { accountId: s.accountId, state: 'CANCELED', expiryDeltaMs: 12 * DAY, autoRenewing: false });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('C: CANCELED + expiry futuro -> tier PREMIUM (acceso pagado vigente), renewalStatus cancels, accessUntil = fin de acceso',
        b.tier === 'PREMIUM' && b.isSubscribed === true && b.renewalStatus === 'cancels' && typeof b.accessUntil === 'string' && new Date(b.accessUntil as string).getTime() > Date.now());
      check('C: CANCELED NO se trata como EXPIRED', b.renewalStatus !== 'none');
    }
    {
      const s = await makeSession(pg, 'sum-d');
      await insertSub(pg, { accountId: s.accountId, state: 'IN_GRACE_PERIOD', expiryDeltaMs: 2 * DAY });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('D: IN_GRACE_PERIOD -> tier PREMIUM (grace conserva acceso), renewalStatus grace_period, paymentIssue TRUE',
        b.tier === 'PREMIUM' && b.renewalStatus === 'grace_period' && b.paymentIssue === true);
    }
    {
      const s = await makeSession(pg, 'sum-e');
      await insertSub(pg, { accountId: s.accountId, state: 'ON_HOLD', expiryDeltaMs: -1 * DAY });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('E: ON_HOLD -> tier FREE, isSubscribed true, renewalStatus on_hold, paymentIssue TRUE',
        b.tier === 'FREE' && b.isSubscribed === true && b.renewalStatus === 'on_hold' && b.paymentIssue === true);
    }
    {
      const s = await makeSession(pg, 'sum-f');
      await insertSub(pg, { accountId: s.accountId, state: 'PENDING', expiryDeltaMs: 20 * DAY });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('F: PENDING -> tier FREE (nunca falso Premium) PERO isSubscribed true (relevancia de ciclo de vida), renewalStatus none, paymentIssue false',
        b.tier === 'FREE' && b.isSubscribed === true && b.renewalStatus === 'none' && b.paymentIssue === false);
    }
    {
      const s = await makeSession(pg, 'sum-g');
      await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -10 * DAY });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('G: EXPIRED -> tier FREE, isSubscribed FALSE, renewalStatus none, accessUntil null', b.tier === 'FREE' && b.isSubscribed === false && b.renewalStatus === 'none' && b.accessUntil === null);
    }
    {
      const s = await makeSession(pg, 'sum-h');
      await insertSub(pg, { accountId: s.accountId, state: 'REVOKED', expiryDeltaMs: 20 * DAY });
      const b = (await summaryOf(s.auth)).body as Record<string, unknown>;
      check('H: REVOKED (incluso expiry futuro stale) -> tier FREE, isSubscribed FALSE', b.tier === 'FREE' && b.isSubscribed === false && b.renewalStatus === 'none');
    }
    {
      const s = await makeSession(pg, 'sum-i');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'ACTIVE', expiryDeltaMs: 30 * DAY, cancelReason: 'system', cancelUserInitiated: true });
      const r = await summaryOf(s.auth);
      const keys = Object.keys(r.body as object).sort();
      check('I: la respuesta tiene EXACTAMENTE 6 claves de gestion', JSON.stringify(keys) === JSON.stringify(['accessUntil', 'isSubscribed', 'managementUrl', 'paymentIssue', 'renewalStatus', 'tier']));
      const raw = r.raw;
      check('I: NO emite purchaseToken / linked / resubscribed / rawSnapshot / obfuscatedAccountId / billingAccountRef / accountId / subscriptionState crudo',
        !raw.includes(token) && !/purchaseToken|linkedPurchaseToken|resubscribed|rawSnapshot|obfuscated|billingAccountRef|accountId|SUBSCRIPTION_STATE_|orderId/i.test(raw));
      check('I: managementUrl es el deep link de Google Play (no una pagina de pago)', (r.body as { managementUrl?: string }).managementUrl === MGMT_URL && !/pay|checkout|billing\.google/i.test((r.body as { managementUrl: string }).managementUrl));
    }
    {
      // J: GET es READ-ONLY -- no crea billingAccountRef, no muta la fila, no llama a Google.
      const s = await makeSession(pg, 'sum-j');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'ACTIVE', expiryDeltaMs: 30 * DAY });
      const before = await subRow(pg, token);
      const beforeAcct = await accountRow(pg, s.accountId);
      await summaryOf(s.auth);
      await summaryOf(s.auth);
      const after = await subRow(pg, token);
      const afterAcct = await accountRow(pg, s.accountId);
      check('J: GET /me/subscription no muta account_subscription', JSON.stringify(before) === JSON.stringify(after));
      check('J: GET /me/subscription NO aprovisiona obfuscated_account_id (sigue NULL)', beforeAcct?.obfuscated_account_id === null && afterAcct?.obfuscated_account_id === null);
      const summarySrc = stripComments(readSrc('subscription/subscription-summary.controller.ts')) + stripComments(readSrc('subscription/subscription.service.ts'));
      check('J: el codigo del resumen no llama a Google ni al provider adapter', !/provider\.|getSubscription\(|acknowledgeSubscription|SUBSCRIPTION_PROVIDER_ADAPTER|google-auth/.test(summarySrc));
      check('J: el resumen NO escribe (sin create/update/delete/upsert)', !/\.(create|update|updateMany|delete|deleteMany|upsert)\(/.test(summarySrc));
      check('J: 401 sin sesion', (await req('GET', '/me/subscription')).status === 401);
    }

    // ====================================================================
    console.log('--- ACCOUNT CLOSE (K-O) ---');
    {
      // K: DELETION_PENDING (antes de finalizar) -> filas de billing SIN cambios.
      const s = await makeSession(pg, 'close-k');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'ACTIVE', expiryDeltaMs: 30 * DAY });
      const before = await subRow(pg, token);
      const r = await req('POST', '/privacy/account-deletion', s.auth);
      check('K: POST /privacy/account-deletion -> 202/200', r.status === 202 || r.status === 200);
      const acct = await accountRow(pg, s.accountId);
      const after = await subRow(pg, token);
      check('K: cuenta en DELETION_PENDING', acct?.status === 'DELETION_PENDING' && acct?.closed_at === null);
      check('K: la fila de suscripcion NO se toco (diagnostico intacto durante el plazo de recuperacion)', JSON.stringify(before) === JSON.stringify(after));
      // limpieza: finalizar para no dejar la request colgada
      await pg.query(`UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1`, [s.accountId]);
      await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
    }
    {
      // L: cierre DEFINITIVO -> diagnosticos NULL, lifecycle retenido, state sin cambios.
      const s = await makeSession(pg, 'close-l');
      const token = await insertSub(pg, {
        accountId: s.accountId, state: 'CANCELED', expiryDeltaMs: 8 * DAY, autoRenewing: true,
        latestNotificationType: 'SUBSCRIPTION_CANCELED', cancelReason: 'user', cancelUserInitiated: true, cancelTimeDeltaMs: -1 * DAY,
      });
      await finalizeClosure(pg, s.auth, s.accountId);
      const acct = await accountRow(pg, s.accountId);
      const row = await subRow(pg, token);
      check('L: cuenta CLOSED con closed_at', acct?.status === 'CLOSED' && acct?.closed_at instanceof Date);
      check('L: diagnosticos NULLABLE a NULL (rawSnapshot / latestNotificationType / cancelReason / cancelUserInitiated / cancelTime)',
        row?.raw_snapshot === null && row?.latest_notification_type === null && row?.cancel_reason === null && row?.cancel_user_initiated === null && row?.cancel_time === null);
      check('L (PB-1B-R1 §4): autoRenewing NO se toca en el cierre -- conserva su valor VERDADERO (true), nunca se falsifica a false',
        row?.auto_renewing === true);
      check('L: lifecycle RETENIDO -- la fila sigue existiendo y `state` NO cambio (sigue CANCELED, nunca forzado a EXPIRED)', row?.state === 'CANCELED' && row?.account_id === s.accountId);
      const pt = (await pg.query(`SELECT purchase_token, expiry_time, product_id FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0];
      check('L: purchaseToken / expiryTime / productId RETENIDOS', pt?.purchase_token === token && pt?.expiry_time instanceof Date && pt?.product_id === 'zetrynd_premium');
      check('L: Account.obfuscated_account_id NO se limpia en el cierre (lo necesita la retencion)', acct?.obfuscated_account_id === null || typeof acct?.obfuscated_account_id === 'string');
    }
    {
      // M: PENDING retenido tras el cierre.
      const s = await makeSession(pg, 'close-m');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'PENDING', expiryDeltaMs: 20 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      const row = await subRow(pg, token);
      check('M: fila PENDING RETENIDA tras el cierre definitivo (NUNCA se purga por cerrar la cuenta)', row?.state === 'PENDING' && row?.account_id === s.accountId);
    }
    {
      // N: PENDING -> ACTIVE despues del cierre: se persiste ACTIVE, cuenta sigue CLOSED, sin restaurar auth.
      const s = await makeSession(pg, 'close-n');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'PENDING', expiryDeltaMs: 20 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      const acctBefore = await accountRow(pg, s.accountId);
      // Google resuelve la compra pendiente -> el ciclo de vida (RTDN/reconcile) persiste ACTIVE.
      await pg.query(`UPDATE account_subscription SET state = 'ACTIVE'::subscription_state WHERE purchase_token = $1`, [token]);
      const acctAfter = await accountRow(pg, s.accountId);
      check('N: la suscripcion pasa a ACTIVE (verdad de Google conservada)', (await subRow(pg, token))?.state === 'ACTIVE');
      check('N: la cuenta sigue CLOSED (nunca reactivada)', acctAfter?.status === 'CLOSED');
      check('N: session_version NO cambio con la transicion de la suscripcion', acctBefore?.session_version === acctAfter?.session_version);
      check('N: autenticacion NO restaurada -- una nueva sesion para la identidad cerrada es rechazada', (await req('POST', '/auth/session', {}, { idToken: StubIdentityProvider.encode({ providerSubject: s.uid, email: `${s.uid}@example.com`, emailVerified: true }) })).status === 401);
    }
    {
      // O: la reconciliacion de ciclo de vida nunca cambia Account.status/sessionVersion -- estatico.
      const files = ['subscription/subscription-reconciliation.service.ts', 'subscription/rtdn/rtdn-processing.service.ts', 'subscription/subscription.service.ts', 'subscription/billing-retention.service.ts'];
      let clean = true;
      for (const f of files) {
        const src = stripComments(readSrc(f));
        if (/reactivateAccount|markClosed|incrementSessionVersion|restoreFromDeletion|enableUser|\.updateStatus\(|status:\s*'ACTIVE'|status:\s*'PENDING'/.test(src)) clean = false;
      }
      check('O: ningun path de suscripcion (reconcile/RTDN/service/retencion) muta Account.status / closedAt / sessionVersion / identidad', clean);
    }

    // ====================================================================
    console.log('--- RETENTION (P-T) ---');
    {
      // P / D: la ruta PRODUCTION-CAPABLE (`/sweep`, sin body) resuelve SOLO de
      // env. `BILLING_RETENTION_DAYS_AFTER_TERMINAL` ausente (.env.gates no lo
      // define) -> enabled:false, NO-OP, RETENER.
      const s = await makeSession(pg, 'ret-p');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -100 * DAY, updatedAtDeltaMs: -100 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 400);
      const r = await retentionSweepEnvOnly();
      check('P/D: /sweep (production-capable, sin body) + env ausente -> enabled:false, NO-OP (0 purgas)',
        r.status === 200 && (r.body as { enabled?: boolean }).enabled === false && (r.body as { purgedRows?: number }).purgedRows === 0);
      check('P/D: la fila terminal SIGUE presente (fail-safe: retener) incluso con la cuenta muy antigua', (await subRow(pg, token)) !== undefined);
      // C: NINGUN body puede forzar la purga por /sweep -- el handler no acepta retentionDays.
      const rBody = await req('POST', '/internal/billing-retention/sweep', { 'x-internal-ops-key': opsKey }, { retentionDays: 0 });
      check('C: POST /sweep con { retentionDays: 0 } -> el campo se IGNORA (schema sin body), sigue NO-OP',
        rBody.status === 200 && (rBody.body as { enabled?: boolean }).enabled === false && (await subRow(pg, token)) !== undefined);
      // C: el endpoint de override (_test/sweep) esta protegido por rejectInProduction (estatico).
      const ctrlSrc = stripComments(readSrc('subscription/billing-retention.controller.ts'));
      check('C: `/sweep` (production-capable) llama runRetentionSweep() SIN argumentos (solo env)', /@Post\('sweep'\)[\s\S]{0,220}?runRetentionSweep\(\)/.test(ctrlSrc));
      check('C: `/_test/sweep` (el unico que acepta retentionDays) llama rejectInProduction() ANTES de barrer',
        /@Post\('_test\/sweep'\)/.test(ctrlSrc) && ctrlSrc.indexOf('this.rejectInProduction()') < ctrlSrc.indexOf('runRetentionSweep(new Date()'));
      check('C: rejectInProduction lanza NotFoundException con NODE_ENV === "production"', /NODE_ENV'\)\s*===\s*'production'/.test(ctrlSrc) && /throw new NotFoundException\(\)/.test(ctrlSrc));
      check('C: el @Cron scheduler NUNCA pasa un override a runRetentionSweep', /runRetentionSweep\(\)/.test(stripComments(readSrc('subscription/billing-retention.scheduler.ts'))) && !/runRetentionSweep\([^)]*\d/.test(stripComments(readSrc('subscription/billing-retention.scheduler.ts'))));
    }
    {
      // Q: terminal + retencion vencida + sin trabajo vivo -> purga permitida.
      const s = await makeSession(pg, 'ret-q');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -50 * DAY, updatedAtDeltaMs: -40 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      // closed_at ~ ahora (finalizeClosure lo fija; applyAccountClosure bumpea
      // updated_at) -> GREATEST(closed_at, updated_at) = ahora -> a 30 dias NO
      // elegible. (Se asevera SOLO sobre ESTA fila -- /_test/sweep es global.)
      await retentionSweep(30);
      check('Q: closed_at reciente -> GREATEST domina -> ESTA fila aun NO se purga', (await subRow(pg, token)) !== undefined);
      // envejecer closed_at + updated_at -> ahora si.
      await ageClosedAccount(pg, s.accountId, 45);
      await retentionSweep(30);
      check('Q: closed_at + updated_at ambos > 30 dias, sin RTDN vivo -> ESTA fila PURGADA', (await subRow(pg, token)) === undefined);
    }
    {
      // R: terminal pero con RTDN VIVO en la linea de tokens -> NO se purga.
      const s = await makeSession(pg, 'ret-r');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'REVOKED', expiryDeltaMs: -20 * DAY, updatedAtDeltaMs: -40 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 45);
      await insertRtdnEvent(pg, token, 'RETRYABLE');
      const r = await retentionSweep(30);
      check('R: RTDN RETRYABLE para el token -> fila NO purgada, contada como skippedLiveWork', (await subRow(pg, token)) !== undefined && (r.body as { skippedLiveWork: number }).skippedLiveWork >= 1);
      // resolver el RTDN -> ahora si purga.
      await pg.query(`UPDATE google_play_rtdn_event SET status = 'DONE'::rtdn_processing_status WHERE purchase_token = $1`, [token]);
      const r2 = await retentionSweep(30);
      check('R: RTDN resuelto (DONE) -> fila purgada', (r2.body as { purgedRows: number }).purgedRows >= 1 && (await subRow(pg, token)) === undefined);
    }
    {
      // S: filas NO terminales -> nunca se purgan.
      for (const st of ['PENDING', 'ACTIVE', 'IN_GRACE_PERIOD', 'ON_HOLD', 'PAUSED']) {
        const s = await makeSession(pg, `ret-s-${st}`);
        const token = await insertSub(pg, { accountId: s.accountId, state: st, expiryDeltaMs: st === 'ON_HOLD' ? -1 * DAY : 20 * DAY, updatedAtDeltaMs: -90 * DAY });
        await finalizeClosure(pg, s.auth, s.accountId);
        await ageClosedAccount(pg, s.accountId, 120);
        await retentionSweep(1);
        check(`S: ${st} (no terminal) NUNCA se purga aunque la cuenta este cerrada y "vieja"`, (await subRow(pg, token)) !== undefined);
      }
    }
    {
      // T: CANCELED con periodo pagado vigente -> no terminal -> no se purga.
      const s = await makeSession(pg, 'ret-t');
      const token = await insertSub(pg, { accountId: s.accountId, state: 'CANCELED', expiryDeltaMs: 15 * DAY, updatedAtDeltaMs: -90 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 120);
      await retentionSweep(1);
      check('T: CANCELED paid-through -> NO se purga (deriva del `state`, no del vencimiento del reloj)', (await subRow(pg, token)) !== undefined);
    }

    // ====================================================================
    console.log('--- ACCOUNT-LEVEL REF (U-X) -- PB-1B-R1 §1: la ref NUNCA se limpia en PB-1B ---');
    {
      // U: fila terminal vieja + fila ACTIVE de reemplazo -> vieja se purga, ref STAYS.
      const s = await makeSession(pg, 'ref-u');
      const obf = `obf-${randomUUID()}`;
      await pg.query(`UPDATE account SET obfuscated_account_id = $1 WHERE id = $2`, [obf, s.accountId]);
      const oldTok = await insertSub(pg, { accountId: s.accountId, state: 'SUPERSEDED', expiryDeltaMs: -30 * DAY, updatedAtDeltaMs: -300 * DAY });
      const newTok = await insertSub(pg, { accountId: s.accountId, state: 'ACTIVE', expiryDeltaMs: 30 * DAY, updatedAtDeltaMs: -1 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 400);
      await retentionSweep(1);
      check('U: fila SUPERSEDED vieja purgada; fila ACTIVE retenida; ref STAYS', (await subRow(pg, oldTok)) === undefined && (await subRow(pg, newTok)) !== undefined && (await accountRow(pg, s.accountId))?.obfuscated_account_id === obf);
    }
    {
      // V: fila terminal vieja + fila PENDING de reemplazo -> vieja purga, ref STAYS.
      const s = await makeSession(pg, 'ref-v');
      const obf = `obf-${randomUUID()}`;
      await pg.query(`UPDATE account SET obfuscated_account_id = $1 WHERE id = $2`, [obf, s.accountId]);
      const oldTok = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -30 * DAY, updatedAtDeltaMs: -300 * DAY });
      await insertSub(pg, { accountId: s.accountId, state: 'PENDING', expiryDeltaMs: 20 * DAY, updatedAtDeltaMs: -1 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 400);
      await retentionSweep(1);
      check('V: fila EXPIRED vieja purgada; ref STAYS (queda la fila PENDING)', (await subRow(pg, oldTok)) === undefined && (await accountRow(pg, s.accountId))?.obfuscated_account_id === obf);
    }
    {
      // W (PB-1B-R1): ULTIMA fila purgada + sin trabajo vivo -> la ref SIGUE.
      const s = await makeSession(pg, 'ref-w');
      const obf = `obf-${randomUUID()}`;
      await pg.query(`UPDATE account SET obfuscated_account_id = $1 WHERE id = $2`, [obf, s.accountId]);
      const tok = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -30 * DAY, updatedAtDeltaMs: -300 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 400);
      const r = await retentionSweep(1);
      check('W: ultima fila purgada (cero filas restantes) -> Account.obfuscated_account_id SIGUE (PB-1B NO lo limpia; diferido a PB-6)',
        (await subRow(pg, tok)) === undefined && (await accountRow(pg, s.accountId))?.obfuscated_account_id === obf);
      check('W: la respuesta del barrido NO reporta `clearedRefs` (concepto eliminado en R1)', !('clearedRefs' in (r.body as object)));
      // guardar para la prueba clave siguiente
      (globalThis as { __refW?: { accountId: string; obf: string; uid: string; auth: Record<string, string> } }).__refW = { accountId: s.accountId, obf, uid: s.uid, auth: s.auth };
    }
    {
      // X: RTDN vivo en la linea -> la fila no se purga; la ref (que tampoco se toca nunca) SIGUE.
      const s = await makeSession(pg, 'ref-x');
      const obf = `obf-${randomUUID()}`;
      await pg.query(`UPDATE account SET obfuscated_account_id = $1 WHERE id = $2`, [obf, s.accountId]);
      const tok = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -30 * DAY, updatedAtDeltaMs: -300 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await ageClosedAccount(pg, s.accountId, 400);
      await insertRtdnEvent(pg, tok, 'PENDING');
      await retentionSweep(1);
      check('X: RTDN PENDING en la linea -> fila NO purgada Y ref presente', (await subRow(pg, tok)) !== undefined && (await accountRow(pg, s.accountId))?.obfuscated_account_id === obf);
    }
    {
      // === PRUEBA CLAVE (PB-1B-R1 §1 B) ===
      // Cuenta CLOSED + CERO filas de suscripcion + RTDN de PRIMER CONTACTO
      // cuyo snapshot trae el `obfuscatedExternalAccountId` de la cuenta ->
      // la RTDN AUN puede atribuir la cuenta, crear/reconciliar la fila, y la
      // cuenta sigue CLOSED (nunca reactivada).
      const w = (globalThis as { __refW?: { accountId: string; obf: string; uid: string; auth: Record<string, string> } }).__refW!;
      const beforeAcct = await accountRow(pg, w.accountId);
      check('KEY: precondicion -- cuenta CLOSED, cero filas, ref presente', beforeAcct?.status === 'CLOSED' && beforeAcct?.obfuscated_account_id === w.obf);
      const rowCountBefore = (await pg.query(`SELECT count(*)::int n FROM account_subscription WHERE account_id = $1`, [w.accountId])).rows[0].n;
      check('KEY: cero filas de suscripcion antes de la RTDN', rowCountBefore === 0);

      const firstContactTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * DAY, acknowledged: true, obfuscatedExternalAccountId: w.obf, nonce: `fc-${randomUUID()}` });
      usedTokens.push(firstContactTok);
      await postRtdn(rtdnEnvelope('pb1br1-key', firstContactTok, 4));
      await processRtdn();

      const newRow = await subRow(pg, firstContactTok);
      check('KEY: RTDN de primer contacto -> la fila se CREA y se atribuye a la cuenta CLOSED via obfuscatedExternalAccountId', newRow?.account_id === w.accountId && newRow?.state === 'ACTIVE');
      const rtdnEv = (await pg.query(`SELECT status FROM google_play_rtdn_event WHERE message_id = 'pb1br1-key'`)).rows[0];
      check('KEY: el evento RTDN quedo DONE (atribuido, no RETRYABLE eterno)', rtdnEv?.status === 'DONE');
      const afterAcct = await accountRow(pg, w.accountId);
      check('KEY: la cuenta sigue CLOSED (nunca reactivada) y session_version intacta', afterAcct?.status === 'CLOSED' && afterAcct?.session_version === beforeAcct?.session_version);
      check('KEY: autenticacion NO restaurada para la identidad cerrada', (await req('POST', '/auth/session', {}, { idToken: StubIdentityProvider.encode({ providerSubject: w.uid, email: `${w.uid}@example.com`, emailVerified: true }) })).status === 401);
      check('KEY: la ref opaca se conservo -> por eso la atribucion fue posible', afterAcct?.obfuscated_account_id === w.obf);
    }

    // ====================================================================
    console.log('--- TERMINAL CLOCK (§24) ---');
    {
      // El ancla es GREATEST(closed_at, updated_at). Probamos sus 3 propiedades.
      const s = await makeSession(pg, 'clock-1');
      const tok = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -100 * DAY, updatedAtDeltaMs: -10 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      // closed_at reciente -> GREATEST = ahora -> NO elegible a 30 dias aunque la fila lleve EXPIRED "mucho".
      check('CLOCK: transicion terminal antigua pero cuenta recien cerrada -> el ancla es closed_at -> NO se purga (la retencion no empieza antes de cerrar la cuenta)',
        (await retentionSweep(30), (await subRow(pg, tok)) !== undefined));
      // Envejecer closed_at a 40 dias; updated_at es -10 dias -> GREATEST = -10 dias -> a 30 dias AUN no.
      await pg.query(`UPDATE account SET closed_at = now() - interval '40 days' WHERE id = $1`, [s.accountId]);
      await retentionSweep(30);
      check('CLOCK: updated_at (-10d) > closed_at (-40d) en recencia -> GREATEST = updated_at -> a 30 dias AUN no elegible (un update reciente NO acorta la retencion)', (await subRow(pg, tok)) !== undefined);
      // Un "update no relacionado" AHORA (tocar la fila) mueve updated_at hacia ADELANTE -> reloj MAS TARDE, nunca antes.
      await pg.query(`UPDATE account_subscription SET latest_notification_type = 'X' WHERE purchase_token = $1`, [tok]);
      await pg.query(`UPDATE account SET closed_at = now() - interval '400 days' WHERE id = $1`, [s.accountId]);
      await retentionSweep(30);
      check('CLOCK: un update reciente de la fila -> updated_at=ahora -> el reloj se ALARGA (no se purga aunque closed_at sea antiquisimo)', (await subRow(pg, tok)) !== undefined);
      // Envejecer updated_at tambien -> ahora si.
      await pg.query(`UPDATE account_subscription SET updated_at = now() - interval '90 days' WHERE purchase_token = $1`, [tok]);
      await retentionSweep(30);
      check('CLOCK: closed_at y updated_at ambos > 30 dias -> ELEGIBLE, se purga; la retencion no ocurre antes del intervalo configurado', (await subRow(pg, tok)) === undefined);
    }
    {
      // reconcile repetido (varios updates) no mueve el reloj hacia atras.
      const s = await makeSession(pg, 'clock-2');
      const tok = await insertSub(pg, { accountId: s.accountId, state: 'EXPIRED', expiryDeltaMs: -100 * DAY, updatedAtDeltaMs: -200 * DAY });
      await finalizeClosure(pg, s.auth, s.accountId);
      await pg.query(`UPDATE account SET closed_at = now() - interval '200 days' WHERE id = $1`, [s.accountId]);
      // "reconcile repetido": 3 updates seguidos -> updated_at avanza a ahora cada vez.
      for (let i = 0; i < 3; i++) await pg.query(`UPDATE account_subscription SET latest_notification_type = $2 WHERE purchase_token = $1`, [tok, `r${i}`]);
      await retentionSweep(30);
      check('CLOCK: reconcile repetido mueve updated_at HACIA ADELANTE (nunca atras) -> no se purga tras los updates recientes', (await subRow(pg, tok)) !== undefined);
    }

    // ====================================================================
    console.log('--- MOBILE + NO AUTO-CANCEL (Y-AC, estatico) ---');
    {
      const perfil = readRepo('apps/mobile/app/(tabs)/perfil/index.tsx');
      const perfilNoComments = perfil.replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/\/\/.*$/gm, '');
      check('Y: usa la semantica del servidor (`subSummaryState` / `summary.isSubscribed`), sin re-interpretar SubscriptionState en el movil',
        /subSummaryState\.status === 'ready' && subSummaryState\.summary\.isSubscribed/.test(perfilNoComments) && !/renewalStatus\s*===|state\s*===\s*'ACTIVE'|\bSubscriptionState\b/.test(perfilNoComments));
      check('Y: texto ESPECIFICO (ready + isSubscribed) -- "se gestiona en Google Play y no se cancela al eliminar tu cuenta"', /se gestiona en Google Play y no se cancela al eliminar tu cuenta/.test(perfil));
      check('E (PB-1B-R1 §3): estado 3-way loading | ready | error', /status: 'loading'.*status: 'ready'.*status: 'error'|'loading' \}[\s\S]{0,120}'ready';[\s\S]{0,120}'error' \}/.test(perfilNoComments));
      check('E: ante error / desconocido (status !== ready) -> disclosure GENERICA condicional, NO se falla en abierto',
        /const generic = subSummaryState\.status !== 'ready';/.test(perfilNoComments) && /Si tienes una suscripción de ZETRYND Premium en Google Play, eliminar tu cuenta de ZETRYND no la cancela/.test(perfil));
      check('E: la disclosure generica NO afirma que el usuario tenga una suscripcion (empieza "Si tienes...")', /'Si tienes una suscripción/.test(perfil) && !/generic[\s\S]{0,200}Tu suscripción a ZETRYND Premium se gestiona/.test(perfilNoComments));
      check('Z: ready + !isSubscribed -> ninguna disclosure (`if (!specific && !generic) return null`)', /if \(!specific && !generic\) return null;/.test(perfilNoComments));
      check('F / AA: la eliminacion sigue permitida en TODO estado -- primaryAction "Solicitar eliminación" intacta, sin `disabled` atado al resumen',
        /primaryAction=\{\{ label: 'Solicitar eliminación', onPress: handleConfirmAccountDeletion/.test(perfilNoComments) && !/disabled=\{[^}]*subSummaryState|disabled=\{[^}]*isSubscribed/.test(perfilNoComments));
      check('AB: "Gestionar suscripción" abre un deep link de Google Play (managementUrl del resumen o la constante congelada), nunca una pagina de pago',
        /Linking\.openURL\(manageUrl\)/.test(perfilNoComments) && /subSummaryState\.summary\.managementUrl : GOOGLE_PLAY_SUBSCRIPTIONS_MANAGEMENT_URL/.test(perfilNoComments) && !/pay|checkout/i.test(perfilNoComments.match(/manageUrl =[^;]+;/)?.[0] ?? ''));
      const sub = readRepo('apps/mobile/lib/api/subscription.ts');
      check('AB: el wrapper movil pega a GET /me/subscription con el schema estricto', /apiRequest\('GET', '\/me\/subscription', \{ schema: subscriptionSummaryResponseSchema \}\)/.test(sub));
      // AC: NO existe implementacion de auto-cancel en ninguna parte de subscription/.
      let noCancel = true;
      for (const f of ['subscription/subscription.service.ts', 'subscription/billing-retention.service.ts', 'subscription/subscription-reconciliation.service.ts', 'subscription/billing-identity.service.ts', 'subscription/present-subscription-summary.ts']) {
        if (/subscriptions:cancel|subscriptions\.cancel|cancelSubscription|voidPurchase|revoke\(|refund/i.test(stripComments(readSrc(f)))) noCancel = false;
      }
      check('AC: ningun path de PB-1B llama a subscriptions:cancel / revoke / refund de Google (cerrar ZETRYND != cancelar Google Play)', noCancel);
    }

    // ====================================================================
    console.log('--- CONTRACT / static ---');
    {
      const contract = readRepo('packages/contracts/src/subscription.ts');
      check('contract: subscriptionSummaryResponseSchema es .strict() con los 6 campos congelados (ADR K.2)',
        /subscriptionSummaryResponseSchema = z\s*\.object\(\{[\s\S]*?tier:[\s\S]*?isSubscribed:[\s\S]*?renewalStatus:[\s\S]*?accessUntil:[\s\S]*?paymentIssue:[\s\S]*?managementUrl:[\s\S]*?\}\)\s*\.strict\(\)/.test(contract));
      check('contract: renewalStatus enum = renews|cancels|grace_period|on_hold|none', /z\.enum\(\['renews', 'cancels', 'grace_period', 'on_hold', 'none'\]\)/.test(contract));
      check('contract: managementUrl congelada al deep link de Google Play', contract.includes("'https://play.google.com/store/account/subscriptions?sku=zetrynd_premium&package=com.zetrynd.app'"));
      check('env.example documenta BILLING_RETENTION_DAYS_AFTER_TERMINAL como OPCIONAL sin default', /# BILLING_RETENTION_DAYS_AFTER_TERMINAL=\s*$/m.test(readSrc('../.env.example')) && /AUSENTE.*NO-OP|NO-OP.*retiene|retiene, no se borra/i.test(readSrc('../.env.example')));
      check('retention: el @Cron NUNCA pasa overrideRetentionDays (regla "config ausente -> NO-OP" intacta para lo automatico)', !/runRetentionSweep\([^)]*\d/.test(stripComments(readSrc('subscription/billing-retention.scheduler.ts'))));
    }
  } finally {
    if (usedMessageIds.length) await pg.query('DELETE FROM google_play_rtdn_event WHERE message_id = ANY($1::text[])', [usedMessageIds]);
    if (usedTokens.length) await pg.query('DELETE FROM account_subscription WHERE purchase_token = ANY($1::text[])', [usedTokens]);
    if (createdAccountIds.length) {
      await pg.query('DELETE FROM account_subscription WHERE account_id = ANY($1::uuid[])', [createdAccountIds]);
      await pg.query('DELETE FROM privacy_request WHERE account_id = ANY($1::uuid[])', [createdAccountIds]);
      await pg.query('DELETE FROM auth_session WHERE account_id = ANY($1::uuid[])', [createdAccountIds]);
      await pg.query('DELETE FROM auth_identity WHERE account_id = ANY($1::uuid[])', [createdAccountIds]);
      await pg.query('DELETE FROM account WHERE id = ANY($1::uuid[])', [createdAccountIds]);
    }
    await pg.end();
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de resumen + retencion de suscripcion (PREMIUM V1, Capa 3, PB-1B) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
