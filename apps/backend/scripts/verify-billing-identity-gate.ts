// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1A: identidad de
// cuenta de facturacion (`billingAccountRef` / `Account.obfuscatedAccountId`).
//
// Corre contra el servidor de gates real + DB (`axioma_gates_dev` via
// run-gate.ts) + adaptador de suscripcion FAKE + verificador OIDC FAKE. No
// requiere Google ni Pub/Sub reales.
//
//   A. una cuenta nace con obfuscated_account_id = NULL.
//   B. POST /me/subscription/google-play/billing-context -> 200 + ref opaca.
//   C. segundo POST -> ref byte-identica (idempotente).
//   D. dos cuentas -> refs distintas.
//   E. N primeras llamadas concurrentes -> convergen en UN valor persistido.
//   F. la ref NO se deriva de account.id / firebase uid.
//   G. el cliente no puede elegir cuenta ni ref (no acepta accountId/billingAccountRef).
//   H. GET /me/entitlement sigue siendo EXACTAMENTE { tier }.
//   I. reconcile de primer contacto con obfuscatedExternalAccountId que COINCIDE -> procede.
//   J. reconcile de primer contacto SIN obfuscatedExternalAccountId -> 422 SUBSCRIPTION_UNVERIFIABLE.
//   K. testPurchase=true + SIN ref -> el MISMO 422 (sin bypass por testPurchase).
//   L. testPurchase=true + ref que coincide -> procede.
//   M. reconcile de primer contacto con ref de OTRA cuenta -> 409 SUBSCRIPTION_ACCOUNT_MISMATCH.
//   N. token ya de otra cuenta -> el 409 de ownership existente se preserva.
//   O. ruta advisory (fila/predecesor existente): ref ausente/distinta NO re-vincula.
//   P. RTDN atribuible SOLO por obfuscatedExternalAccountId -> la cuenta correcta.
//   Q. RTDN con ref desconocida -> RETRYABLE / FAILED acotado, nunca fabricada / DONE.
//   R. sin ref cruda / token crudo en logs (estatico).
//   S. postura CONGELADA de produccion intacta (estatico).
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
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
const EXPECTED_AUD = process.env.GOOGLE_PLAY_RTDN_OIDC_AUDIENCE ?? '';
const EXPECTED_SA = process.env.GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL ?? '';
const PACKAGE = 'com.zetrynd.app';
const HOUR = 3_600_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}
const readSrc = (rel: string) => readFileSync(join(SRC, rel), 'utf8');
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
  const uid = `billing-id-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  return { accountId, firebaseUid: uid, auth: { authorization: `Bearer ${idToken}`, 'x-session-id': sessionId } };
}

const billingContext = (auth: Record<string, string>, body?: unknown) =>
  req('POST', '/me/subscription/google-play/billing-context', auth, body);
const reconcile = (auth: Record<string, string>, purchaseToken: string) => {
  usedTokens.push(purchaseToken);
  return req('POST', '/me/subscription/google-play/reconcile', auth, { purchaseToken });
};
const tierOf = async (auth: Record<string, string>) => ((await req('GET', '/me/entitlement', auth)).body as { tier?: string } | null)?.tier;
const obfOf = async (pg: Client, accountId: string) =>
  (await pg.query(`SELECT obfuscated_account_id FROM account WHERE id = $1`, [accountId])).rows[0]?.obfuscated_account_id as string | null;

// --- RTDN helpers (identicos a verify-google-play-rtdn-gate) --------------
const oidcBearer = () =>
  `Bearer ${encodeFakeRtdnOidcToken({ email: EXPECTED_SA, aud: EXPECTED_AUD, email_verified: true })}`;
function envelope(messageId: string, purchaseToken: string, notificationType: number) {
  usedMessageIds.push(messageId);
  const dn = {
    version: '1.0',
    packageName: PACKAGE,
    eventTimeMillis: String(Date.now()),
    subscriptionNotification: { version: '1.0', notificationType, purchaseToken, subscriptionId: 'zetrynd_premium' },
  };
  return { message: { data: Buffer.from(JSON.stringify(dn), 'utf8').toString('base64'), messageId }, subscription: 'projects/z/subscriptions/rtdn' };
}
const postRtdn = (body: unknown) => req('POST', '/internal/google-play/rtdn', { authorization: oidcBearer() }, body);
const processRtdn = () => req('POST', '/internal/google-play/rtdn/_internal/process', { 'x-internal-ops-key': opsKey });
const rtdnRowOf = async (pg: Client, messageId: string) =>
  (await pg.query(`SELECT status, attempts, last_error_code FROM google_play_rtdn_event WHERE message_id = $1`, [messageId])).rows[0] as
    | { status: string; attempts: number; last_error_code: string | null }
    | undefined;
const subRowOf = async (pg: Client, token: string) =>
  (await pg.query(`SELECT account_id, state FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0] as
    | { account_id: string; state: string }
    | undefined;

async function main() {
  check('(precondicion) INTERNAL_OPS_KEY / audiencia / SA del gate configuradas', opsKey.length > 0 && EXPECTED_AUD.length > 0 && EXPECTED_SA.length > 0);

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  try {
    // ====================================================================
    console.log('--- A/B/C. aprovisionamiento perezoso + idempotencia ---');
    const s1 = await makeSession(pg, 'b');
    check('A: la cuenta nace con obfuscated_account_id = NULL', (await obfOf(pg, s1.accountId)) === null);

    const r1 = await billingContext(s1.auth);
    const ref1 = (r1.body as { billingAccountRef?: string } | null)?.billingAccountRef;
    check('B: POST billing-context -> 200', r1.status === 200);
    check('B: body === EXACTAMENTE { billingAccountRef }', r1.body != null && JSON.stringify(Object.keys(r1.body as object)) === JSON.stringify(['billingAccountRef']));
    check('B: billingAccountRef es un string opaco (UUID v4)', typeof ref1 === 'string' && UUID_RE.test(ref1));
    check('B: se persistio en Account.obfuscated_account_id', (await obfOf(pg, s1.accountId)) === ref1);

    const r2 = await billingContext(s1.auth);
    check('C: segundo POST -> mismo billingAccountRef byte-identico', (r2.body as { billingAccountRef?: string } | null)?.billingAccountRef === ref1);
    const r3 = await billingContext(s1.auth);
    check('C: N-esimo POST -> sigue el mismo valor (nunca rota)', (r3.body as { billingAccountRef?: string } | null)?.billingAccountRef === ref1);

    // ====================================================================
    console.log('--- D. dos cuentas -> refs distintas y unicas ---');
    const s2 = await makeSession(pg, 'd');
    const ref2 = ((await billingContext(s2.auth)).body as { billingAccountRef?: string } | null)?.billingAccountRef;
    check('D: cuentas distintas -> billingAccountRef distinto', typeof ref2 === 'string' && ref2 !== ref1);

    // ====================================================================
    console.log('--- E. concurrencia: N primeras llamadas convergen en un valor ---');
    {
      const s = await makeSession(pg, 'e');
      const results = await Promise.all(Array.from({ length: 8 }, () => billingContext(s.auth)));
      const refs = results.map((r) => (r.body as { billingAccountRef?: string } | null)?.billingAccountRef);
      check('E: las 8 respuestas son 200 (ningun 500)', results.every((r) => r.status === 200));
      check('E: las 8 devuelven el MISMO billingAccountRef', new Set(refs).size === 1 && typeof refs[0] === 'string');
      const stored = (await pg.query(`SELECT count(*)::int n FROM account WHERE id = $1 AND obfuscated_account_id = $2`, [s.accountId, refs[0]])).rows[0].n;
      check('E: exactamente 1 valor persistido y coincide con el devuelto', stored === 1);
    }

    // ====================================================================
    console.log('--- F. la ref NO se deriva de la identidad de la cuenta ---');
    {
      const s = await makeSession(pg, 'f');
      const ref = ((await billingContext(s.auth)).body as { billingAccountRef?: string } | null)?.billingAccountRef ?? '';
      check('F: billingAccountRef no contiene account.id', !ref.includes(s.accountId) && !s.accountId.includes(ref));
      check('F: billingAccountRef no contiene el firebase uid', !ref.includes(s.firebaseUid));
      const src = stripComments(readSrc('subscription/billing-identity.service.ts'));
      check('F: BillingIdentityService genera con crypto.randomUUID(), sin hash/salt/derivacion', /randomUUID\(\)/.test(src) && !/(sha256|hmac|createHash|salt|accountId \+|\+ accountId)/i.test(src));
    }

    // ====================================================================
    console.log('--- G. el cliente no elige cuenta ni ref ---');
    {
      const s = await makeSession(pg, 'g');
      const victim = await makeSession(pg, 'g-victim');
      const victimRef = ((await billingContext(victim.auth)).body as { billingAccountRef?: string } | null)?.billingAccountRef;
      // body con accountId / billingAccountRef ajenos -> se IGNORAN (sin @Body en el controller)
      const r = await billingContext(s.auth, { accountId: victim.accountId, billingAccountRef: 'atacante-elige-esto' });
      const got = (r.body as { billingAccountRef?: string } | null)?.billingAccountRef;
      check('G: un body con accountId/billingAccountRef ajenos -> 200, ref propia (nunca la elegida ni la de la victima)', r.status === 200 && got !== 'atacante-elige-esto' && got !== victimRef && UUID_RE.test(got ?? ''));
      check('G: la victima conserva su ref intacta', (await obfOf(pg, victim.accountId)) === victimRef);
      check('G: sin sesion -> 401', (await billingContext({})).status === 401);
      const ctrl = stripComments(readSrc('subscription/subscription.controller.ts'));
      check('G: el endpoint billing-context NO tiene @Body / @Param / @Query (accountId solo de la sesion)', /billingContext\(@Req\(\) request: AuthenticatedRequest\)/.test(ctrl));
      check('G: opera sobre request.accountId', /provisionBillingAccountRef\(request\.accountId\)/.test(ctrl));
      check('G: es POST y no GET (la primera llamada escribe)', /@Post\('billing-context'\)/.test(ctrl));
    }

    // ====================================================================
    console.log('--- H. GET /me/entitlement sigue siendo EXACTAMENTE { tier } ---');
    {
      const s = await makeSession(pg, 'h');
      await billingContext(s.auth);
      const r = await req('GET', '/me/entitlement', s.auth);
      check('H: GET /me/entitlement -> { tier: "FREE" } exacto (sin billingAccountRef)', r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ tier: 'FREE' }));
      const entCtrl = readSrc('entitlement/entitlement.controller.ts');
      check('H: EntitlementController no menciona billing/obfuscated/subscription', !/billing|obfuscated|Subscription/i.test(entCtrl));
    }

    // ====================================================================
    console.log('--- I/J/K/L/M. cross-check de atribucion en primer contacto ---');
    {
      const s = await makeSession(pg, 'i');
      const ref = ((await billingContext(s.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      const okTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, obfuscatedExternalAccountId: ref });
      const rI = await reconcile(s.auth, okTok);
      check('I: primer contacto + obfuscatedExternalAccountId que coincide -> 200 verified -> PREMIUM', rI.status === 200 && (await tierOf(s.auth)) === 'PREMIUM');
    }
    {
      const s = await makeSession(pg, 'j');
      await billingContext(s.auth);
      const missTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR }); // sin ref
      const rJ = await reconcile(s.auth, missTok);
      check('J: primer contacto SIN obfuscatedExternalAccountId -> 422 SUBSCRIPTION_UNVERIFIABLE', rJ.status === 422 && (rJ.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_UNVERIFIABLE');
      check('J: NO se creo fila, cuenta sigue FREE', (await subRowOf(pg, missTok)) === undefined && (await tierOf(s.auth)) === 'FREE');
    }
    {
      const s = await makeSession(pg, 'k');
      await billingContext(s.auth);
      const testMiss = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, testPurchase: true });
      const rK = await reconcile(s.auth, testMiss);
      check('K: testPurchase=true + SIN ref -> el MISMO 422 (sin bypass por testPurchase)', rK.status === 422 && (rK.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_UNVERIFIABLE');
    }
    {
      const s = await makeSession(pg, 'l');
      const ref = ((await billingContext(s.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      const testOk = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, testPurchase: true, obfuscatedExternalAccountId: ref });
      const rL = await reconcile(s.auth, testOk);
      check('L: testPurchase=true + ref que coincide -> procede (200 verified, PREMIUM)', rL.status === 200 && (await tierOf(s.auth)) === 'PREMIUM');
    }
    {
      const a = await makeSession(pg, 'm-a');
      const b = await makeSession(pg, 'm-b');
      await billingContext(a.auth);
      const bRef = ((await billingContext(b.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      const foreignTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, obfuscatedExternalAccountId: bRef });
      const rM = await reconcile(a.auth, foreignTok);
      check('M: primer contacto con la ref de OTRA cuenta -> 409 SUBSCRIPTION_ACCOUNT_MISMATCH', rM.status === 409 && (rM.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_ACCOUNT_MISMATCH');
      check('M: A no gana PREMIUM, no hay fila', (await tierOf(a.auth)) === 'FREE' && (await subRowOf(pg, foreignTok)) === undefined);
    }

    // ====================================================================
    console.log('--- N. el 409 de ownership por purchaseToken ya usado se preserva ---');
    {
      const a = await makeSession(pg, 'n-a');
      const b = await makeSession(pg, 'n-b');
      const aRef = ((await billingContext(a.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      await billingContext(b.auth);
      const tok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, obfuscatedExternalAccountId: aRef, nonce: `n-${randomUUID()}` });
      const rA = await reconcile(a.auth, tok);
      const rB = await reconcile(b.auth, tok);
      check('N: A reconcilia el token -> 200; B (misma cadena) -> 409 SUBSCRIPTION_ACCOUNT_MISMATCH', rA.status === 200 && rB.status === 409 && (rB.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_ACCOUNT_MISMATCH');
      check('N: la fila sigue siendo de A', (await subRowOf(pg, tok))?.account_id === a.accountId);
    }

    // ====================================================================
    console.log('--- O. ruta advisory (predecesor existente): ref ausente NO re-vincula ---');
    {
      const s = await makeSession(pg, 'o');
      const ref = ((await billingContext(s.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      const oldTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 10 * 24 * HOUR, obfuscatedExternalAccountId: ref });
      await reconcile(s.auth, oldTok);
      // sucesor con linkedPurchaseToken y SIN obfuscatedExternalAccountId -> ruta advisory, procede igual.
      const newTok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 40 * 24 * HOUR, linkedPurchaseToken: oldTok });
      const rO = await reconcile(s.auth, newTok);
      check('O: sucesor linkeado SIN obfuscatedExternalAccountId -> 200 (ausencia tolerada en la ruta advisory)', rO.status === 200);
      check('O: predecesor SUPERSEDED, sucesor ACTIVE, misma cuenta, PREMIUM', (await subRowOf(pg, oldTok))?.state === 'SUPERSEDED' && (await subRowOf(pg, newTok))?.account_id === s.accountId && (await tierOf(s.auth)) === 'PREMIUM');
    }

    // ====================================================================
    console.log('--- P. RTDN atribuible SOLO por obfuscatedExternalAccountId ---');
    {
      const s = await makeSession(pg, 'p');
      const ref = ((await billingContext(s.auth)).body as { billingAccountRef?: string }).billingAccountRef!;
      // RTDN de un token que NUNCA fue reconciliado por el movil, pero cuyo
      // snapshot trae el obfuscatedExternalAccountId de la cuenta.
      const tok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true, obfuscatedExternalAccountId: ref, nonce: `p-${randomUUID()}` });
      usedTokens.push(tok);
      await postRtdn(envelope('bid-p', tok, 4));
      await processRtdn();
      const row = await subRowOf(pg, tok);
      check('P: el worker atribuyo la RTDN a la cuenta correcta via obfuscatedExternalAccountId', row?.account_id === s.accountId && row?.state === 'ACTIVE');
      check('P: -> entitlement PREMIUM sin que el movil haya reconciliado', (await tierOf(s.auth)) === 'PREMIUM');
      check('P: el evento de inbox quedo DONE', (await rtdnRowOf(pg, 'bid-p'))?.status === 'DONE');
    }

    // ====================================================================
    console.log('--- Q. RTDN con ref desconocida -> RETRYABLE, nunca fabricada / DONE ---');
    {
      const tok = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, obfuscatedExternalAccountId: `obf-desconocida-${randomUUID()}`, nonce: `q-${randomUUID()}` });
      usedTokens.push(tok);
      await postRtdn(envelope('bid-q', tok, 4));
      await processRtdn();
      const ev = await rtdnRowOf(pg, 'bid-q');
      check('Q: ref opaca que no mapea a ninguna cuenta -> RETRYABLE not_attributable (NO FAILED de una)', ev?.status === 'RETRYABLE' && ev?.last_error_code === 'not_attributable');
      check('Q: NO se fabrico ninguna fila de suscripcion', (await subRowOf(pg, tok)) === undefined);
    }

    // ====================================================================
    console.log('--- R. logging/privacy (estatico) ---');
    {
      const files = [
        'subscription/billing-identity.service.ts',
        'subscription/subscription.controller.ts',
        'subscription/subscription-reconciliation.service.ts',
        'auth/account.repository.ts',
      ];
      // Prohibido: INTERPOLAR el VALOR crudo de la ref / token en un log
      // (`${...ref}` / `${snapRef}` / `${...obfuscatedAccountId}` / `${purchaseToken}`)
      // o pasarlo como argumento suelto. La MENCION del termino en prosa de un
      // mensaje esta permitida.
      const RAW_VALUE_IN_LOG = /(logger|console)\.\w+\([^)]*\$\{[^}]*\b(billingAccountRef|obfuscatedExternalAccountId|obfuscatedAccountId|snapRef|storedRef|obfRef|purchaseToken)\b[^}]*\}/;
      for (const f of files) {
        // `tokenHint(...)` es un fingerprint REDACTADO -- se retira antes del test.
        const src = stripComments(readSrc(f)).replace(/tokenHint\([^)]*\)/g, 'HINT');
        check(`R: ${f} nunca interpola el VALOR crudo de la ref / token en un log`, !RAW_VALUE_IN_LOG.test(src));
      }
      const recon = stripComments(readSrc('subscription/subscription-reconciliation.service.ts'));
      check('R: la reconciliacion loguea solo tokenHint() para el purchaseToken', /tokenHint\(purchaseToken\)/.test(recon) && !/logger\.\w+\([^)]*\$\{purchaseToken\}/.test(recon));
    }

    // ====================================================================
    console.log('--- S. postura CONGELADA de produccion intacta ---');
    {
      const { resolveSubscriptionProviderChoice } = await import('../src/subscription/subscription-provider-choice');
      check('S: production + provider unset -> reject (sin cambios PB-1A)', 'reject' in resolveSubscriptionProviderChoice('production', undefined));
      check('S: production + disabled -> disabled', (resolveSubscriptionProviderChoice('production', 'disabled') as { use?: string }).use === 'disabled');
      const mod = stripComments(readSrc('subscription/subscription.module.ts'));
      check('S: SubscriptionModule provee BillingIdentityService', /BillingIdentityService,/.test(mod));
      check('S: PB-1A no toco la eleccion de adaptador (reject/disabled/google intactos)', /'reject' in choice\) throw new Error\(choice\.reject\)/.test(mod));
      const contract = readSrc('../../../packages/contracts/src/subscription.ts');
      check('S: googlePlayBillingContextResponseSchema es .strict() y solo { billingAccountRef }', /googlePlayBillingContextResponseSchema = z\s*\.object\(\{\s*billingAccountRef: z\.string\(\)\.min\(1\),\s*\}\)\s*\.strict\(\)/.test(contract));
      check('S: SUBSCRIPTION_UNVERIFIABLE_CODE exportado', /SUBSCRIPTION_UNVERIFIABLE_CODE = 'SUBSCRIPTION_UNVERIFIABLE'/.test(contract));
    }
  } finally {
    if (usedMessageIds.length) await pg.query('DELETE FROM google_play_rtdn_event WHERE message_id = ANY($1::text[])', [usedMessageIds]);
    if (usedTokens.length) await pg.query('DELETE FROM account_subscription WHERE purchase_token = ANY($1::text[])', [usedTokens]);
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
  console.log('Todas las verificaciones del gate de identidad de facturacion (PREMIUM V1, Capa 3, PB-1A) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
