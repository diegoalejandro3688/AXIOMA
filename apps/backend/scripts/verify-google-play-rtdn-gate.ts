// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), C3.3: inbox durable de
// RTDN (Pub/Sub push autenticado OIDC) + worker de procesamiento + extension
// de la reconciliacion C3.2 con `providerEventTime`.
//
// NO requiere Pub/Sub real, credenciales ni red de Google -- verificador OIDC
// FAKE (`GOOGLE_PLAY_RTDN_AUTH_IMPL=fake`) + adaptador de suscripcion FAKE.
//
// PARTE A -- reglas PURAS: parseo del sobre Pub/Sub + clasificacion, tabla de
//   notificationType, monotonicidad de `latestEventTime`, contexto de
//   revocacion, eleccion de verificador (fail-closed en prod).
// PARTE B -- autenticacion OIDC del push (aceptar / rechazar cada camino).
// PARTE C -- sobre de Pub/Sub (malformado / base64 / JSON / package).
// PARTE D -- dedup por `messageId` (durable, sobrevive reinicios).
// PARTE E -- procesamiento: evento de suscripcion -> reconsulta C3.2;
//   el payload RTDN nunca decide el tier; cronologia monotona.
// PARTE F -- ciclo de vida: renovacion / cancelacion vigente / grace / hold /
//   recuperacion / expiracion / revoke / pending purchase canceled.
// PARTE G -- fallos: transitorio reintentable, permanente no hace loop,
//   acknowledge reintentado (recuperacion autonoma).
// PARTE H -- seguridad (estatica): sin AuthGuard de usuario, verificador OIDC
//   propio, sin logueo del bearer, sin persistir credenciales, sin mutar
//   entitlement en el controller, fake OIDC prohibido en produccion.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import {
  encodeFakeAckFailToken,
  encodeFakeSequenceToken,
  encodeFakeSubscriptionToken,
} from '../src/subscription/fake-subscription-provider.adapter';
import { encodeFakeRtdnOidcToken } from '../src/subscription/rtdn/fake-rtdn-push-authenticator';
import {
  classifyDeveloperNotification,
  parsePubSubEnvelope,
} from '../src/subscription/rtdn/parse-pubsub-envelope';
import {
  applyRevocationContext,
  parseEventTimeMillis,
  resolveProviderEventTimeUpdate,
} from '../src/subscription/rtdn/rtdn-event-time';
import {
  RTDN_SUBSCRIPTION_DEPRECATED_TYPES,
  isActionableSubscriptionNotification,
  rtdnSubscriptionNotificationLabel,
} from '../src/subscription/rtdn/rtdn-notification-type';
import { resolveRtdnAuthChoice } from '../src/subscription/rtdn/rtdn-auth-choice';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const SRC = join(__dirname, '..', 'src');
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
const EXPECTED_AUD = process.env.GOOGLE_PLAY_RTDN_OIDC_AUDIENCE ?? '';
const EXPECTED_SA = process.env.GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL ?? '';
const PACKAGE = 'com.zetrynd.app';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
const readSrc = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const createdAccountIds: string[] = [];
const usedMessageIds: string[] = [];
const usedPurchaseTokens: string[] = [];

async function makeSession(pg: Client, label: string) {
  const uid = `gp-rtdn-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  return { accountId, auth: { authorization: `Bearer ${idToken}`, 'x-session-id': sessionId } };
}

const HOUR = 3_600_000;
const now = new Date();

// --- helpers RTDN ---------------------------------------------------------
function oidcBearer(overrides: Partial<{ email: string; aud: string; email_verified: boolean; exp: number }> = {}): string {
  return `Bearer ${encodeFakeRtdnOidcToken({
    email: overrides.email ?? EXPECTED_SA,
    aud: overrides.aud ?? EXPECTED_AUD,
    email_verified: overrides.email_verified ?? true,
    ...(overrides.exp !== undefined ? { exp: overrides.exp } : {}),
  })}`;
}
function developerNotification(opts: {
  packageName?: string;
  eventTimeMillis?: string;
  subscription?: { notificationType: number; purchaseToken: string | null };
  test?: boolean;
  oneTime?: boolean;
  voided?: boolean;
}): Record<string, unknown> {
  const dn: Record<string, unknown> = { version: '1.0', packageName: opts.packageName ?? PACKAGE };
  if (opts.eventTimeMillis !== undefined) dn.eventTimeMillis = opts.eventTimeMillis;
  if (opts.subscription) {
    dn.subscriptionNotification = {
      version: '1.0',
      notificationType: opts.subscription.notificationType,
      ...(opts.subscription.purchaseToken !== null ? { purchaseToken: opts.subscription.purchaseToken } : {}),
      subscriptionId: 'zetrynd_premium',
    };
  }
  if (opts.test) dn.testNotification = { version: '1.0' };
  if (opts.oneTime) dn.oneTimeProductNotification = { version: '1.0', purchaseToken: 'x', sku: 'y' };
  if (opts.voided) dn.voidedPurchaseNotification = { purchaseToken: 'x', orderId: 'z' };
  return dn;
}
function envelope(messageId: string, dn: Record<string, unknown> | string, subscription = 'projects/zetrynd/subscriptions/rtdn'): Record<string, unknown> {
  usedMessageIds.push(messageId);
  const data = typeof dn === 'string' ? dn : Buffer.from(JSON.stringify(dn), 'utf8').toString('base64');
  return { message: { data, messageId }, subscription };
}
const postRtdn = (bearer: string | null, body: unknown) =>
  req('POST', '/internal/google-play/rtdn', bearer ? { authorization: bearer } : {}, body);
const processRtdn = () => req('POST', '/internal/google-play/rtdn/_internal/process', { 'x-internal-ops-key': opsKey });
const reconcile = (auth: Record<string, string>, purchaseToken: string) => {
  usedPurchaseTokens.push(purchaseToken);
  return req('POST', '/me/subscription/google-play/reconcile', auth, { purchaseToken });
};
const tierOf = async (auth: Record<string, string>) =>
  ((await req('GET', '/me/entitlement', auth)).body as { tier?: string } | null)?.tier;

async function main() {
  // ========================================================================
  console.log('--- PARTE A. reglas PURAS ---');

  // A.1 parseo de sobre + clasificacion.
  {
    const good = parsePubSubEnvelope(envelope('m-a1', developerNotification({ subscription: { notificationType: 2, purchaseToken: 'tok-x' } })));
    check('A: sobre valido -> ok, messageId, notification', good.ok && good.messageId === 'm-a1' && good.notification.packageName === PACKAGE);
    check('A: sobre sin `message` -> malformed_envelope', !parsePubSubEnvelope({}).ok);
    check('A: sobre sin messageId -> missing_message_id', (parsePubSubEnvelope({ message: { data: 'eyj9' } }) as { reason?: string }).reason === 'missing_message_id');
    check('A: sobre sin data -> missing_data', (parsePubSubEnvelope({ message: { messageId: 'x' } }) as { reason?: string }).reason === 'missing_data');
    check('A: data no base64 -> invalid_base64', (parsePubSubEnvelope({ message: { messageId: 'x', data: '!!!not base64!!!' } }) as { reason?: string }).reason === 'invalid_base64');
    check('A: data base64 de no-JSON -> invalid_json', (parsePubSubEnvelope({ message: { messageId: 'x', data: Buffer.from('no soy json', 'utf8').toString('base64') } }) as { reason?: string }).reason === 'invalid_json');
    const sub = classifyDeveloperNotification({ subscriptionNotification: { notificationType: 4, purchaseToken: 'p' } });
    check('A: clasifica subscriptionNotification -> subscription + token + type', sub.kind === 'subscription' && sub.purchaseToken === 'p' && sub.subscriptionNotificationType === 4);
    check('A: clasifica testNotification -> test, sin token', classifyDeveloperNotification({ testNotification: {} }).kind === 'test');
    check('A: clasifica oneTimeProduct -> one_time_product', classifyDeveloperNotification({ oneTimeProductNotification: {} }).kind === 'one_time_product');
    check('A: clasifica voidedPurchase -> voided_purchase', classifyDeveloperNotification({ voidedPurchaseNotification: {} }).kind === 'voided_purchase');
    check('A: clasifica payload desconocido -> unknown', classifyDeveloperNotification({}).kind === 'unknown');
  }

  // A.2 tabla de notificationType -- TODA la tabla oficial ACTUAL.
  {
    const known: Array<[number, string]> = [
      [1, 'SUBSCRIPTION_RECOVERED'],
      [2, 'SUBSCRIPTION_RENEWED'],
      [3, 'SUBSCRIPTION_CANCELED'],
      [4, 'SUBSCRIPTION_PURCHASED'],
      [5, 'SUBSCRIPTION_ON_HOLD'],
      [6, 'SUBSCRIPTION_IN_GRACE_PERIOD'],
      [7, 'SUBSCRIPTION_RESTARTED'],
      [8, 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED'],
      [9, 'SUBSCRIPTION_DEFERRED'],
      [10, 'SUBSCRIPTION_PAUSED'],
      [11, 'SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED'],
      [12, 'SUBSCRIPTION_REVOKED'],
      [13, 'SUBSCRIPTION_EXPIRED'],
      [17, 'SUBSCRIPTION_ITEMS_CHANGED'],
      [18, 'SUBSCRIPTION_CANCELLATION_SCHEDULED'],
      [19, 'SUBSCRIPTION_PRICE_CHANGE_UPDATED'],
      [20, 'SUBSCRIPTION_PENDING_PURCHASE_CANCELED'],
      [22, 'SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED'],
    ];
    for (const [type, label] of known) {
      check(`A: type ${type} -> ${label} (reconocido, NUNCA SUBSCRIPTION_UNKNOWN_*)`, rtdnSubscriptionNotificationLabel(type) === label);
    }
    check('A: type 8 sigue reconocido pero esta marcado DEPRECADO', RTDN_SUBSCRIPTION_DEPRECATED_TYPES.has(8) && rtdnSubscriptionNotificationLabel(8) === 'SUBSCRIPTION_PRICE_CHANGE_CONFIRMED');
    check('A: 17/18/19/22 NO se etiquetan como SUBSCRIPTION_UNKNOWN_*', [17, 18, 19, 22].every((t) => !rtdnSubscriptionNotificationLabel(t)!.startsWith('SUBSCRIPTION_UNKNOWN_')));
    for (const n of [14, 15, 16, 21, 99]) {
      check(`A: entero NO documentado ${n} -> SUBSCRIPTION_UNKNOWN_${n} (fail-safe, registrable, nunca concede)`, rtdnSubscriptionNotificationLabel(n) === `SUBSCRIPTION_UNKNOWN_${n}`);
    }
    check('A: type null -> null', rtdnSubscriptionNotificationLabel(null) === null);
    check('A: accionable sii hay purchaseToken', isActionableSubscriptionNotification('t') && !isActionableSubscriptionNotification(null) && !isActionableSubscriptionNotification(''));
  }

  // A.3 monotonicidad de latestEventTime.
  {
    const T1 = new Date(now.getTime() - 2 * HOUR);
    const T2 = new Date(now.getTime() - 1 * HOUR);
    const T3 = new Date(now.getTime());
    check('A: incoming=null (reconcile directo) -> no toca la cronologia', resolveProviderEventTimeUpdate(T2, null, 'X') === null);
    check('A: existing=null -> aplica incoming', resolveProviderEventTimeUpdate(null, T2, 'SUBSCRIPTION_RENEWED')?.latestEventTime.getTime() === T2.getTime());
    check('A: incoming (T3) > existing (T2) -> avanza a T3', resolveProviderEventTimeUpdate(T2, T3, 'X')?.latestEventTime.getTime() === T3.getTime());
    check('A: incoming (T1) < existing (T2) -> NO retrocede (null)', resolveProviderEventTimeUpdate(T2, T1, 'X') === null);
    check('A: incoming == existing -> no reaplica (null)', resolveProviderEventTimeUpdate(T2, new Date(T2.getTime()), 'X') === null);
    check('A: parseEventTimeMillis("1700000000000") -> Date', parseEventTimeMillis('1700000000000')?.getTime() === 1_700_000_000_000);
    check('A: parseEventTimeMillis basura -> null', parseEventTimeMillis('abc') === null && parseEventTimeMillis(null) === null && parseEventTimeMillis('0') === null);
  }

  // A.4 contexto de revocacion.
  {
    check('A: revoke (12) + snapshot EXPIRED -> REVOKED (fidelidad, sigue FREE)', applyRevocationContext('EXPIRED', 12) === 'REVOKED');
    check('A: revoke (12) + snapshot ACTIVE -> NO se sobreescribe (se confia en Google)', applyRevocationContext('ACTIVE', 12) === 'ACTIVE');
    check('A: notificationType != 12 -> estado sin cambios', applyRevocationContext('EXPIRED', 2) === 'EXPIRED' && applyRevocationContext('EXPIRED', null) === 'EXPIRED');
  }

  // A.5 eleccion de verificador (fail-closed en produccion).
  {
    const matrix: Array<[string | undefined, string | undefined, 'google' | 'fake' | 'reject']> = [
      ['development', undefined, 'fake'],
      ['development', 'fake', 'fake'],
      ['test', undefined, 'fake'],
      ['development', 'google', 'google'],
      ['production', 'google', 'google'],
      ['production', undefined, 'reject'],
      ['production', 'fake', 'reject'],
      ['production', 'otro', 'reject'],
    ];
    for (const [env, impl, expected] of matrix) {
      const c = resolveRtdnAuthChoice(env, impl);
      check(`A: rtdnAuthChoice(NODE_ENV=${env ?? 'unset'}, impl=${impl ?? 'unset'}) -> ${expected}`, ('reject' in c ? 'reject' : c.use) === expected);
    }
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  // Prisma normaliza a UTC; este cliente crudo debe leer los TIMESTAMP sin tz
  // como UTC para que `Date.getTime()` cuadre con `eventTimeMillis`.
  await pg.query("SET TIME ZONE 'UTC'");

  // `latest_event_ms`: epoch ms via SQL -- node-postgres parsea `timestamp` sin
  // tz como hora LOCAL aunque la sesion sea UTC, asi que no se compara el Date.
  const subRowOf = async (token: string) => {
    const row = (await pg.query(
      `SELECT state, acknowledgement_state, latest_notification_type, account_id,
              (extract(epoch from latest_event_time) * 1000)::bigint AS latest_event_ms
       FROM account_subscription WHERE purchase_token = $1`,
      [token],
    )).rows[0] as
      | { state: string; acknowledgement_state: string; latest_notification_type: string | null; account_id: string; latest_event_ms: string | null }
      | undefined;
    return row === undefined
      ? undefined
      : { ...row, latestEventMs: row.latest_event_ms === null ? null : Number(row.latest_event_ms) };
  };
  const rtdnRowOf = async (messageId: string) =>
    (await pg.query(`SELECT status, attempts, notification_kind, notification_type, last_error_code FROM google_play_rtdn_event WHERE message_id = $1`, [messageId])).rows[0] as
      | { status: string; attempts: number; notification_kind: string; notification_type: number | null; last_error_code: string | null }
      | undefined;
  const rtdnCount = async (messageId: string) =>
    (await pg.query(`SELECT count(*)::int n FROM google_play_rtdn_event WHERE message_id = $1`, [messageId])).rows[0].n as number;

  try {
    check('(precondicion) INTERNAL_OPS_KEY / audiencia / SA configuradas para el gate', opsKey.length > 0 && EXPECTED_AUD.length > 0 && EXPECTED_SA.length > 0);

    // ======================================================================
    console.log('--- PARTE B. autenticacion OIDC del push ---');
    {
      const dn = developerNotification({ test: true });
      const okAuth = await postRtdn(oidcBearer(), envelope('b-ok', dn));
      check('B: identidad valida (aud + SA + email_verified) -> 200', okAuth.status === 200 && (okAuth.body as { received?: boolean })?.received === true);
      check('B: sin bearer -> 401', (await postRtdn(null, envelope('b-nobearer', dn))).status === 401);
      check('B: token con formato invalido -> 401', (await postRtdn('Bearer no-es-un-token', envelope('b-badtoken', dn))).status === 401);
      check('B: audiencia equivocada -> 401', (await postRtdn(oidcBearer({ aud: 'https://otro.audiencia/rtdn' }), envelope('b-aud', dn))).status === 401);
      check('B: service account equivocada -> 401', (await postRtdn(oidcBearer({ email: 'atacante@evil.example' }), envelope('b-sa', dn))).status === 401);
      check('B: email no verificado -> 401', (await postRtdn(oidcBearer({ email_verified: false }), envelope('b-ev', dn))).status === 401);
      check('B: token expirado -> 401', (await postRtdn(oidcBearer({ exp: Math.floor(Date.now() / 1000) - 60 }), envelope('b-exp', dn))).status === 401);
      check('B: un rechazo de auth NO persiste fila', (await rtdnRowOf('b-aud')) === undefined && (await rtdnRowOf('b-nobearer')) === undefined);
    }

    // ======================================================================
    console.log('--- PARTE C. sobre de Pub/Sub ---');
    {
      check('C: sobre malformado (sin message) -> 400, sin fila', (await postRtdn(oidcBearer(), { nope: true })).status === 400);
      check('C: data no base64 -> 400', (await postRtdn(oidcBearer(), { message: { messageId: 'c-b64', data: '@@@' } })).status === 400 && (await rtdnRowOf('c-b64')) === undefined);
      check('C: data base64 de no-JSON -> 400', (await postRtdn(oidcBearer(), envelope('c-json', Buffer.from('xxx', 'utf8').toString('base64')))).status === 400 && (await rtdnRowOf('c-json')) === undefined);
      const wrongPkg = await postRtdn(oidcBearer(), envelope('c-pkg', developerNotification({ packageName: 'com.otra.app', subscription: { notificationType: 4, purchaseToken: 'x' } })));
      check('C: packageName != com.zetrynd.app -> 400, NUNCA persiste ni reconcilia', wrongPkg.status === 400 && (await rtdnRowOf('c-pkg')) === undefined);
    }

    // ======================================================================
    console.log('--- PARTE D. dedup por messageId (durable) ---');
    {
      const s = await makeSession(pg, 'd');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      await reconcile(s.auth, token);
      const dn = developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 2, purchaseToken: token } });
      const first = await postRtdn(oidcBearer(), envelope('d-dup', dn));
      const second = await postRtdn(oidcBearer(), envelope('d-dup', dn));
      check('D: primera entrega -> 200 deduplicated:false', first.status === 200 && (first.body as { deduplicated?: boolean })?.deduplicated === false);
      check('D: re-entrega mismo messageId -> 200 deduplicated:true', second.status === 200 && (second.body as { deduplicated?: boolean })?.deduplicated === true);
      check('D: EXACTAMENTE 1 fila de inbox para el messageId', (await rtdnCount('d-dup')) === 1);
    }

    // ======================================================================
    console.log('--- PARTE E. procesamiento: RTDN -> reconsulta C3.2, cronologia ---');
    {
      const s = await makeSession(pg, 'e1');
      // seq: reconcile del movil ve ACTIVE; el worker RTDN reconsulta y ve CANCELED (periodo vigente).
      const token = encodeFakeSequenceToken([
        { state: 'ACTIVE', expiryDeltaMs: 20 * 24 * HOUR, acknowledged: true },
        { state: 'CANCELED', expiryDeltaMs: 20 * 24 * HOUR, autoRenewing: false, acknowledged: true },
      ]);
      await reconcile(s.auth, token);
      check('E: tras reconcile del movil -> fila ACTIVE, PREMIUM', (await subRowOf(token))?.state === 'ACTIVE' && (await tierOf(s.auth)) === 'PREMIUM');
      const evtMs = String(now.getTime() - 30 * 60_000);
      await postRtdn(oidcBearer(), envelope('e1-cancel', developerNotification({ eventTimeMillis: evtMs, subscription: { notificationType: 3, purchaseToken: token } })));
      await processRtdn();
      const row = await subRowOf(token);
      check('E: el worker reconsulto Google y reconcilio -> fila CANCELED', row?.state === 'CANCELED');
      check('E: -> sigue PREMIUM (periodo pagado vigente; el tier NO sale del RTDN)', (await tierOf(s.auth)) === 'PREMIUM');
      check('E: latest_event_time = eventTimeMillis del RTDN (cronologia de Google)', row?.latestEventMs === Number(evtMs));
      check('E: latest_notification_type = SUBSCRIPTION_CANCELED', row?.latest_notification_type === 'SUBSCRIPTION_CANCELED');
      check('E: el evento de inbox quedo DONE', (await rtdnRowOf('e1-cancel'))?.status === 'DONE');
    }
    // E.2 cronologia fuera de orden: un RTDN mas VIEJO no retrocede latest_event_time.
    {
      const s = await makeSession(pg, 'e2');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 40 * 24 * HOUR, acknowledged: true });
      await reconcile(s.auth, token);
      const newer = String(now.getTime());
      const older = String(now.getTime() - 6 * HOUR);
      await postRtdn(oidcBearer(), envelope('e2-new', developerNotification({ eventTimeMillis: newer, subscription: { notificationType: 2, purchaseToken: token } })));
      await processRtdn();
      check('E2: primer RTDN fija latest_event_time = T(newer)', (await subRowOf(token))?.latestEventMs === Number(newer));
      await postRtdn(oidcBearer(), envelope('e2-old', developerNotification({ eventTimeMillis: older, subscription: { notificationType: 6, purchaseToken: token } })));
      await processRtdn();
      const row = await subRowOf(token);
      check('E2: RTDN mas viejo (entregado despues) NO retrocede latest_event_time', row?.latestEventMs === Number(newer));
      check('E2: ni pisa latest_notification_type con el evento viejo', row?.latest_notification_type === 'SUBSCRIPTION_RENEWED');
      check('E2: aun asi el evento viejo se reconcilio y quedo DONE', (await rtdnRowOf('e2-old'))?.status === 'DONE');
    }
    // E.3 test notification: sin mutacion de suscripcion / entitlement.
    {
      const s = await makeSession(pg, 'e3');
      const before = await tierOf(s.auth);
      const r = await postRtdn(oidcBearer(), envelope('e3-test', developerNotification({ test: true })));
      check('E3: testNotification -> 200', r.status === 200);
      check('E3: fila de inbox DONE, kind=test, sin token', (await rtdnRowOf('e3-test'))?.status === 'DONE' && (await rtdnRowOf('e3-test'))?.notification_kind === 'test');
      await processRtdn();
      check('E3: sin efecto en entitlement', (await tierOf(s.auth)) === before && before === 'FREE');
    }
    // E.4 familias fuera de alcance: IGNORED, sin reconciliacion.
    {
      const r1 = await postRtdn(oidcBearer(), envelope('e4-onetime', developerNotification({ oneTime: true })));
      const r2 = await postRtdn(oidcBearer(), envelope('e4-voided', developerNotification({ voided: true })));
      check('E4: oneTimeProduct + voidedPurchase -> 200, inbox IGNORED (no son ciclo de vida de suscripcion en C3.3)', r1.status === 200 && r2.status === 200 && (await rtdnRowOf('e4-onetime'))?.status === 'IGNORED' && (await rtdnRowOf('e4-voided'))?.status === 'IGNORED');
    }
    // E.5 RTDN antes que el reconcile del movil -> no atribuible -> RETRYABLE (no FAILED de una).
    {
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      usedPurchaseTokens.push(token);
      await postRtdn(oidcBearer(), envelope('e5-early', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 4, purchaseToken: token } })));
      await processRtdn();
      const row = await rtdnRowOf('e5-early');
      check('E5: RTDN de un token sin fila ni predecesor -> RETRYABLE (not_attributable), NO FAILED', row?.status === 'RETRYABLE' && row?.last_error_code === 'not_attributable');
      check('E5: NO se creo ninguna suscripcion a partir del RTDN solo', (await subRowOf(token)) === undefined);
    }

    // ======================================================================
    console.log('--- PARTE F. ciclo de vida (RTDN -> reconsulta -> reconcile) ---');
    const lifecycle: Array<[string, number, string, unknown, 'PREMIUM' | 'FREE']> = [
      ['renovacion', 2, 'ACTIVE', { state: 'ACTIVE', expiryDeltaMs: 60 * 24 * HOUR }, 'PREMIUM'],
      ['cancelacion vigente', 3, 'CANCELED', { state: 'CANCELED', expiryDeltaMs: 10 * 24 * HOUR, autoRenewing: false }, 'PREMIUM'],
      ['grace period', 6, 'IN_GRACE_PERIOD', { state: 'IN_GRACE_PERIOD', expiryDeltaMs: 2 * 24 * HOUR }, 'PREMIUM'],
      ['account hold', 5, 'ON_HOLD', { state: 'ON_HOLD', expiryDeltaMs: -1 * HOUR }, 'FREE'],
      ['recuperacion', 1, 'ACTIVE', { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR }, 'PREMIUM'],
      ['expiracion', 13, 'EXPIRED', { state: 'EXPIRED', expiryDeltaMs: -3 * 24 * HOUR }, 'FREE'],
    ];
    for (const [name, type, expectedState, secondSpec, expectedTier] of lifecycle) {
      const s = await makeSession(pg, `f-${type}`);
      const token = encodeFakeSequenceToken([{ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true }, secondSpec as never]);
      await reconcile(s.auth, token);
      await postRtdn(oidcBearer(), envelope(`f-${type}`, developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: type, purchaseToken: token } })));
      await processRtdn();
      const row = await subRowOf(token);
      check(`F: ${name} (type ${type}) -> fila ${expectedState}, entitlement ${expectedTier}`, row?.state === expectedState && (await tierOf(s.auth)) === expectedTier);
    }
    // F.revoke -- type 12: snapshot vuelve EXPIRED -> se registra REVOKED, FREE.
    {
      const s = await makeSession(pg, 'f-revoke');
      const token = encodeFakeSequenceToken([
        { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true },
        { state: 'EXPIRED', expiryDeltaMs: 20 * 24 * HOUR }, // Google: post-revoke el estado es terminal aunque el timestamp fuera futuro
      ]);
      await reconcile(s.auth, token);
      check('F: revoke -- pre: PREMIUM', (await tierOf(s.auth)) === 'PREMIUM');
      await postRtdn(oidcBearer(), envelope('f-revoke', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 12, purchaseToken: token } })));
      await processRtdn();
      const row = await subRowOf(token);
      check('F: revoke (12) + snapshot terminal -> fila REVOKED (fidelidad de auditoria)', row?.state === 'REVOKED');
      check('F: revoke -> NO continua PREMIUM', (await tierOf(s.auth)) === 'FREE');
    }
    // F.pending-purchase-canceled -- type 20 fluye por el camino C3.2 aprobado.
    {
      const s = await makeSession(pg, 'f-ppc');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true });
      await reconcile(s.auth, aToken);
      // El token del RTDN (B) es una compra pendiente cancelada linkeada a A.
      const bToken = encodeFakeSubscriptionToken({ state: 'EXPIRED', pendingPurchaseCanceled: true, linkedPurchaseToken: aToken });
      usedPurchaseTokens.push(bToken);
      await postRtdn(oidcBearer(), envelope('f-ppc', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 20, purchaseToken: bToken } })));
      await processRtdn();
      check('F: pending purchase canceled (20) -> B nunca es fila', (await subRowOf(bToken)) === undefined);
      check('F: A NO SUPERSEDED, sigue ACTIVE', (await subRowOf(aToken))?.state === 'ACTIVE');
      check('F: entitlement sigue PREMIUM (derivado de A)', (await tierOf(s.auth)) === 'PREMIUM');
      check('F: el evento de inbox quedo DONE', (await rtdnRowOf('f-ppc'))?.status === 'DONE');
    }
    // F.tipos-reconocidos-sin-soporte -- 17/18/19/22: reconocidos, disparan la
    // reconsulta autoritativa, NO cambian el tier por si mismos, NO se
    // implementa add-on / cuota / UI de precio.
    for (const [type, label] of [
      [17, 'SUBSCRIPTION_ITEMS_CHANGED'],
      [18, 'SUBSCRIPTION_CANCELLATION_SCHEDULED'],
      [19, 'SUBSCRIPTION_PRICE_CHANGE_UPDATED'],
      [22, 'SUBSCRIPTION_PRICE_STEP_UP_CONSENT_UPDATED'],
    ] as Array<[number, string]>) {
      const s = await makeSession(pg, `f-t${type}`);
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true });
      await reconcile(s.auth, token);
      await postRtdn(oidcBearer(), envelope(`f-t${type}`, developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: type, purchaseToken: token } })));
      await processRtdn();
      const row = await subRowOf(token);
      check(`F: type ${type} (${label}) -> inbox DONE, reconciliado, sigue PREMIUM, latest_notification_type=${label}`,
        (await rtdnRowOf(`f-t${type}`))?.status === 'DONE'
          && row?.state === 'ACTIVE'
          && (await tierOf(s.auth)) === 'PREMIUM'
          && row?.latest_notification_type === label);
    }

    // ======================================================================
    console.log('--- PARTE G. clasificacion de fallos ---');
    // G.1 fallo transitorio de Google -> RETRYABLE, luego exito.
    {
      const s = await makeSession(pg, 'g1');
      const token = encodeFakeSequenceToken([
        { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true }, // reconcile movil
        { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true }, // 1er intento worker (lo forzamos a fallar con err token? no: seq no lanza)
      ]);
      await reconcile(s.auth, token);
      // Un RTDN cuyo token de suscripcion es un `fakesub-err:transient` para forzar el fallo de verificacion.
      const errToken = 'fakesub-err:transient';
      usedPurchaseTokens.push(errToken);
      // Necesita fila previa para atribuir -> creamos una a mano para ese token.
      await pg.query(
        `INSERT INTO account_subscription (id, account_id, provider, product_id, purchase_token, state, expiry_time, auto_renewing, acknowledgement_state, created_at, updated_at)
         VALUES ($1,$2,'GOOGLE_PLAY','zetrynd_premium',$3,'ACTIVE',now()+interval '30 days',true,'ACKNOWLEDGED',now(),now())`,
        [randomUUID(), s.accountId, errToken],
      );
      await postRtdn(oidcBearer(), envelope('g1-transient', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 2, purchaseToken: errToken } })));
      await processRtdn();
      check('G1: fallo transitorio de Google -> inbox RETRYABLE (code transient)', (await rtdnRowOf('g1-transient'))?.status === 'RETRYABLE' && (await rtdnRowOf('g1-transient'))?.last_error_code === 'transient');
      check('G1: NO se revoca la suscripcion existente por el fallo del worker', (await subRowOf(errToken))?.state === 'ACTIVE' && (await tierOf(s.auth)) === 'PREMIUM');
    }
    // G.2 evento invalido permanente -> FAILED, no hace loop.
    {
      const s = await makeSession(pg, 'g2');
      const badToken = 'fakesub-err:not_found';
      usedPurchaseTokens.push(badToken);
      await pg.query(
        `INSERT INTO account_subscription (id, account_id, provider, product_id, purchase_token, state, expiry_time, auto_renewing, acknowledgement_state, created_at, updated_at)
         VALUES ($1,$2,'GOOGLE_PLAY','zetrynd_premium',$3,'ACTIVE',now()+interval '30 days',true,'ACKNOWLEDGED',now(),now())`,
        [randomUUID(), s.accountId, badToken],
      );
      await postRtdn(oidcBearer(), envelope('g2-perm', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 2, purchaseToken: badToken } })));
      await processRtdn();
      const row1 = await rtdnRowOf('g2-perm');
      check('G2: token rechazado por Google (not_found) -> inbox FAILED permanente', row1?.status === 'FAILED' && row1?.last_error_code === 'provider_rejected');
      const attempts1 = row1?.attempts ?? 0;
      await processRtdn();
      await processRtdn();
      const row2 = await rtdnRowOf('g2-perm');
      check('G2: FAILED no se vuelve a reclamar -> attempts no aumenta (no hace loop)', (row2?.attempts ?? 0) === attempts1 && row2?.status === 'FAILED');
    }
    // G.3 acknowledge fallido -> RETRYABLE -> reintento del worker lo acknowledgea (recuperacion autonoma).
    {
      const s = await makeSession(pg, 'g3');
      const token = encodeFakeAckFailToken(1, { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      usedPurchaseTokens.push(token);
      const first = await reconcile(s.auth, token);
      check('G3: reconcile del movil con ack fallido -> 503 reintentable, fila PREMIUM sin ack', first.status === 503 && (await subRowOf(token))?.acknowledgement_state === 'PENDING' && (await tierOf(s.auth)) === 'PREMIUM');
      await postRtdn(oidcBearer(), envelope('g3-ack', developerNotification({ eventTimeMillis: String(now.getTime()), subscription: { notificationType: 4, purchaseToken: token } })));
      await processRtdn();
      check('G3: el worker de RTDN reintenta el acknowledge y ahora tiene exito -> ACKNOWLEDGED', (await subRowOf(token))?.acknowledgement_state === 'ACKNOWLEDGED');
      check('G3: evento de inbox DONE, sigue PREMIUM, 1 sola fila', (await rtdnRowOf('g3-ack'))?.status === 'DONE' && (await tierOf(s.auth)) === 'PREMIUM');
    }

    // ======================================================================
    console.log('--- PARTE H. seguridad (estatica) ---');
    {
      const ctrl = stripComments(readSrc('subscription/rtdn/google-play-rtdn.controller.ts'));
      check('H: el controller RTDN NO usa AuthGuard de usuario', !/\bAuthGuard\b/.test(ctrl) && !/@UseGuards\(AuthGuard/.test(ctrl));
      check('H: el endpoint de ingesta NO tiene @UseGuards (frontera OIDC propia dentro del servicio)', /@Post\(\)\s*\n\s*@HttpCode\(200\)/.test(stripComments(ctrl)));
      check('H: el disparo manual del worker SI exige InternalOpsGuard', /_internal\/process[\s\S]*@UseGuards\(InternalOpsGuard\)/.test(stripComments(ctrl)));
      check('H: el controller NO muta entitlement ni suscripciones (solo delega)', !/EntitlementService|AccountSubscriptionRepository|reconcilePurchase|deriveSubscriptionTier/.test(ctrl));
      const ingestion = stripComments(readSrc('subscription/rtdn/rtdn-ingestion.service.ts'));
      check('H: la ingesta exige el verificador OIDC antes de tocar nada', /authenticator\.authenticate\(/.test(ingestion) && ingestion.indexOf('authenticator.authenticate(') < ingestion.indexOf('parsePubSubEnvelope('));
      check('H: la ingesta valida el package exacto com.zetrynd.app', /packageName !== ZETRYND_PLAY_PACKAGE_NAME/.test(ingestion));
      const authFiles = [
        'subscription/rtdn/rtdn-ingestion.service.ts',
        'subscription/rtdn/fake-rtdn-push-authenticator.ts',
        'subscription/rtdn/google-rtdn-push-authenticator.ts',
        'subscription/rtdn/rtdn-processing.service.ts',
        'subscription/rtdn/google-play-rtdn-event.repository.ts',
      ];
      check('H: ningun archivo RTDN loguea el bearer / authorization header', authFiles.every((f) => !/(logger|console)\.\w+\([^)]*\b(authorization|bearer)\b/i.test(stripComments(readSrc(f)))));
      check('H: los verificadores OIDC no tienen Logger (no pueden filtrar el token)', !/Logger|this\.logger|console\./.test(stripComments(readSrc('subscription/rtdn/fake-rtdn-push-authenticator.ts'))) && !/Logger|this\.logger|console\./.test(stripComments(readSrc('subscription/rtdn/google-rtdn-push-authenticator.ts'))));
      const repo = stripComments(readSrc('subscription/rtdn/google-play-rtdn-event.repository.ts'));
      check('H: el repositorio de inbox NO persiste bearer/authorization/jwt/credencial', !/\b(bearer|authorization|jwt|credential|serviceAccountJson)\b/i.test(repo));
      const schema = readSrc('../prisma/schema.prisma');
      const rtdnModel = schema.slice(schema.indexOf('model GooglePlayRtdnEvent'), schema.indexOf('model GooglePlayRtdnEvent') + 1600);
      check('H: el modelo google_play_rtdn_event NO tiene columnas de secreto', !/bearer|authorization|jwt|credential|token_jwt/i.test(rtdnModel));
      const mod = stripComments(readSrc('subscription/subscription.module.ts'));
      check('H: el modulo aplica resolveRtdnAuthChoice y LANZA en el rechazo (fake OIDC prohibido en prod)', /resolveRtdnAuthChoice\(/.test(mod) && /'reject' in choice\) throw new Error\(choice\.reject\)/.test(mod));
      check('H: config de auth RTDN incompleta con impl=google / en prod -> fail-closed (throw)', /readRtdnAuthConfig\(/.test(mod) && /throw new Error\(\s*[`'"]Config de auth RTDN incompleta/.test(mod));
      check('H: el adaptador OIDC real SOLO se importa/instancia bajo la eleccion google', /choice\.use === 'google'\s*\n?\s*\?\s*new GoogleRtdnPushAuthenticator/.test(mod));
      const recon = readSrc('subscription/subscription-reconciliation.service.ts');
      check('H: la reconciliacion NO importa tipos de transporte de Google ni de Pub/Sub', !/google-subscription-v2|map-google-subscription|GoogleSubscriptionPurchaseV2|google-auth-library|rtdn-notification\.types|parse-pubsub/.test(recon));
      check('H: la reconciliacion recibe providerEventTime como primitivo (Date|null) desde el worker', /reconcileFromNotification\(input: \{[\s\S]*providerEventTime: Date \| null/.test(recon));
    }

    // ======================================================================
    console.log('--- PARTE I. procedencia: reconcile directo del movil no fija cronologia ---');
    {
      const s = await makeSession(pg, 'i');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true });
      await reconcile(s.auth, token);
      check('I: fila creada por reconcile directo -> latest_event_time NULL', (await subRowOf(token))?.latestEventMs === null);
      // ahora una RTDN fija la cronologia; un segundo reconcile directo NO la borra.
      await postRtdn(oidcBearer(), envelope('i-rtdn', developerNotification({ eventTimeMillis: String(now.getTime() - HOUR), subscription: { notificationType: 2, purchaseToken: token } })));
      await processRtdn();
      const afterRtdn = await subRowOf(token);
      check('I: RTDN fija latest_event_time', afterRtdn?.latestEventMs === now.getTime() - HOUR);
      await reconcile(s.auth, token);
      check('I: reconcile directo posterior NO borra ni retrocede latest_event_time', (await subRowOf(token))?.latestEventMs === now.getTime() - HOUR);
    }
  } finally {
    if (usedMessageIds.length) {
      await pg.query('DELETE FROM google_play_rtdn_event WHERE message_id = ANY($1::text[])', [usedMessageIds]);
    }
    if (usedPurchaseTokens.length) {
      await pg.query('DELETE FROM account_subscription WHERE purchase_token = ANY($1::text[])', [usedPurchaseTokens]);
    }
    if (createdAccountIds.length) {
      await pg.query('DELETE FROM account_subscription WHERE account_id = ANY($1::uuid[])', [createdAccountIds]);
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
  console.log('Todas las verificaciones del gate de RTDN de Google Play (PREMIUM V1, Capa 3, C3.3) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
