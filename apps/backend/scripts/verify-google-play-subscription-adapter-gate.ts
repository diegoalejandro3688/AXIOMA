// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2: adaptador de
// verificacion de Google Play + mapper + reconciliacion de compra.
//
// NO requiere credenciales ni red de Google -- corre siempre contra el
// adaptador FAKE (`GOOGLE_PLAY_PROVIDER_IMPL=fake`, el default). El adaptador
// real se compila pero se ejercita con Google recien en C3.4.
//
// PARTE A -- mapper PURO (`mapGoogleSubscription` / `mapGoogleSubscriptionState`):
//   matriz de estados de Google + fail-closed para desconocidos, seleccion
//   determinista del line item ZETRYND, validacion de package/product,
//   ausencia total de `latestEventTime`.
// PARTE B -- reconciliacion end-to-end contra el servidor de gates + DB:
//   verified/pending, idempotencia, fallo de red, producto equivocado,
//   acknowledge (una sola vez / reintento tras fallo), colision de cuenta,
//   linked token -> SUPERSEDED, not_configured -> 503.
// PARTE C -- forma del endpoint (`.strict()`, 401, respuesta minima sin
//   payload crudo de Google ni echo del purchaseToken).
// PARTE D -- frontera de transporte (Google no se filtra al dominio).
// PARTE E -- procedencia de `latestEventTime` (C3.2 seccion 3): una
//   verificacion directa NUNCA lo fija ni lo reemplaza.
// PARTE G -- compra pendiente CANCELADA (`SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED`):
//   disposicion propia del mapper; nunca una fila / acknowledge / SUPERSEDED;
//   con `linkedPurchaseToken` se reconcilia la suscripcion existente; ownership.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { deriveSubscriptionTier } from '../src/entitlement/subscription/derive-subscription-tier';
import { mapGoogleSubscription, mapGoogleSubscriptionState } from '../src/subscription/google/map-google-subscription';
import {
  ZETRYND_PLAY_PACKAGE_NAME,
  ZETRYND_PREMIUM_BASE_PLAN_ID,
  ZETRYND_PREMIUM_PRODUCT_ID,
} from '../src/subscription/subscription-product';
import {
  encodeFakeAckFailToken,
  encodeFakeErrorToken,
  encodeFakePendingPurchaseCanceledToken,
  encodeFakeSubscriptionToken,
} from '../src/subscription/fake-subscription-provider.adapter';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const SRC = join(__dirname, '..', 'src');
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
async function makeSession(pg: Client, label: string) {
  const uid = `gp-adapter-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

async function main() {
  // ========================================================================
  console.log('--- PARTE A. mapper PURO: matriz de estados + line item + validacion ---');

  // A.1 -- matriz de subscriptionState -> normalizado + reconocido + tier.
  const stateMatrix: Array<[string, string, boolean, 'FREE' | 'PREMIUM', number | null]> = [
    ['SUBSCRIPTION_STATE_PENDING', 'PENDING', true, 'FREE', +30 * 24 * HOUR],
    ['SUBSCRIPTION_STATE_ACTIVE', 'ACTIVE', true, 'PREMIUM', +30 * 24 * HOUR],
    ['SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'IN_GRACE_PERIOD', true, 'PREMIUM', +3 * 24 * HOUR],
    ['SUBSCRIPTION_STATE_ON_HOLD', 'ON_HOLD', true, 'FREE', -1 * HOUR],
    ['SUBSCRIPTION_STATE_PAUSED', 'PAUSED', true, 'FREE', +30 * 24 * HOUR],
    ['SUBSCRIPTION_STATE_EXPIRED', 'EXPIRED', true, 'FREE', -5 * 24 * HOUR],
  ];
  for (const [google, norm, recognized, tier, expiryDelta] of stateMatrix) {
    const m = mapGoogleSubscriptionState(google);
    check(`A: ${google} -> ${norm} (reconocido=${recognized})`, m.state === norm && m.recognized === recognized);
    const derived = deriveSubscriptionTier(
      { state: m.state, expiryTime: expiryDelta === null ? null : new Date(now.getTime() + expiryDelta), autoRenewing: true },
      now,
    );
    check(`A: ${google} -> tier ${tier}`, derived === tier);
  }
  // CANCELED depende de expiry.
  check('A: SUBSCRIPTION_STATE_CANCELED -> CANCELED', mapGoogleSubscriptionState('SUBSCRIPTION_STATE_CANCELED').state === 'CANCELED');
  check('A: CANCELED + expiry futuro -> PREMIUM', deriveSubscriptionTier({ state: 'CANCELED', expiryTime: new Date(now.getTime() + 24 * HOUR), autoRenewing: false }, now) === 'PREMIUM');
  check('A: CANCELED + expiry pasado -> FREE', deriveSubscriptionTier({ state: 'CANCELED', expiryTime: new Date(now.getTime() - 24 * HOUR), autoRenewing: false }, now) === 'FREE');
  // Fail-closed: desconocido / UNSPECIFIED.
  for (const unknown of ['SUBSCRIPTION_STATE_UNSPECIFIED', 'SUBSCRIPTION_STATE_SOMETHING_NEW_2027', undefined as unknown as string, '']) {
    const m = mapGoogleSubscriptionState(unknown);
    check(`A: estado desconocido "${unknown}" -> EXPIRED + NO reconocido (fail-closed)`, m.state === 'EXPIRED' && m.recognized === false);
    check(`A: estado desconocido "${unknown}" -> tier FREE`, deriveSubscriptionTier({ state: m.state, expiryTime: new Date(now.getTime() + 99 * 24 * HOUR), autoRenewing: true }, now) === 'FREE');
  }

  const ctx = {
    queriedPackageName: ZETRYND_PLAY_PACKAGE_NAME,
    purchaseToken: 'tok-A',
    expectedPackageName: ZETRYND_PLAY_PACKAGE_NAME,
    expectedProductId: ZETRYND_PREMIUM_PRODUCT_ID,
    expectedBasePlanId: ZETRYND_PREMIUM_BASE_PLAN_ID,
  };
  const li = (productId: string, basePlanId: string | undefined, extra: Record<string, unknown> = {}) => ({
    productId,
    expiryTime: new Date(now.getTime() + 30 * 24 * HOUR).toISOString(),
    autoRenewingPlan: { autoRenewEnabled: true },
    ...(basePlanId === undefined ? {} : { offerDetails: { basePlanId } }),
    ...extra,
  });

  // A.2 -- seleccion de line item: NUNCA lineItems[0] a ciegas.
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li('otro.producto', 'otro-plan'), li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID)] }, ctx);
    check('A: line item ZETRYND se selecciona aunque sea lineItems[1], no [0]', r.ok && r.snapshot.productId === ZETRYND_PREMIUM_PRODUCT_ID);
  }
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, undefined)] }, ctx);
    check('A: basePlanId omitido por Google -> el match por productId basta', r.ok && r.snapshot.basePlanId === null);
  }
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li('otro', 'x'), li('otro2', 'y')] }, ctx);
    check('A: ningun line item ZETRYND -> reject "no_matching_line_item"', !r.ok && r.reason === 'no_matching_line_item');
  }
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID), li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID)] }, ctx);
    check('A: >1 line item ZETRYND -> reject "ambiguous_line_items"', !r.ok && r.reason === 'ambiguous_line_items');
  }
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, 'premium-annual')] }, ctx);
    check('A: line item con base plan equivocado (annual) -> reject', !r.ok);
  }
  {
    const r = mapGoogleSubscription({ subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE', lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID)] }, { ...ctx, queriedPackageName: 'com.otra.app' });
    check('A: packageName consultado != esperado -> reject "wrong_package"', !r.ok && r.reason === 'wrong_package');
  }

  // A.3 -- extraccion de campos + procedencia de latestEventTime.
  {
    const r = mapGoogleSubscription(
      {
        subscriptionState: 'SUBSCRIPTION_STATE_CANCELED',
        regionCode: 'CL',
        linkedPurchaseToken: 'tok-viejo',
        acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
        testPurchase: {},
        externalAccountIdentifiers: { obfuscatedExternalAccountId: 'obf-123' },
        canceledStateContext: { userInitiatedCancellation: {} },
        startTime: new Date(now.getTime() - 40 * 24 * HOUR).toISOString(),
        lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID, { autoRenewingPlan: { autoRenewEnabled: false } })],
      },
      ctx,
    );
    check('A: extrae linkedPurchaseToken / autoRenewing=false / acknowledged / testPurchase / regionCode / obfuscatedExternalAccountId / cancelUserInitiated', !!(r.ok && r.snapshot.linkedPurchaseToken === 'tok-viejo' && r.snapshot.autoRenewing === false && r.snapshot.acknowledged === true && r.snapshot.testPurchase === true && r.snapshot.regionCode === 'CL' && r.snapshot.obfuscatedExternalAccountId === 'obf-123' && r.snapshot.cancelUserInitiated === true));
    check('A: el snapshot mapeado NO tiene `latestEventTime` (subscriptionsv2.get no lo trae)', r.ok && !('latestEventTime' in (r.snapshot as Record<string, unknown>)));
  }
  check('A: los tipos de transporte de Google NO declaran eventTimeMillis (solo la nota lo menciona)', !/eventTimeMillis[?:]/.test(stripComments(readSrc('subscription/google/google-subscription-v2.types.ts'))));
  check('A: el mapper NUNCA fija latestEventTime', !/latestEventTime/.test(stripComments(readSrc('subscription/google/map-google-subscription.ts'))));

  // A.4 -- SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: disposicion propia,
  //        NO cae por el branch generico de "enum desconocido".
  {
    const PPC = 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED';
    const withLinked = mapGoogleSubscription({ subscriptionState: PPC, linkedPurchaseToken: 'tok-A', lineItems: [li(ZETRYND_PREMIUM_PRODUCT_ID, ZETRYND_PREMIUM_BASE_PLAN_ID)] }, ctx);
    check('A: PENDING_PURCHASE_CANCELED con linkedPurchaseToken -> disposicion pendingPurchaseCanceled + linked', !withLinked.ok && 'pendingPurchaseCanceled' in withLinked && (withLinked as { linkedPurchaseToken?: string | null }).linkedPurchaseToken === 'tok-A');
    const noLinked = mapGoogleSubscription({ subscriptionState: PPC, lineItems: [] }, ctx);
    check('A: PENDING_PURCHASE_CANCELED sin linkedPurchaseToken ni line item -> disposicion + linked null', !noLinked.ok && 'pendingPurchaseCanceled' in noLinked && (noLinked as { linkedPurchaseToken?: string | null }).linkedPurchaseToken === null);
    const wrongPkg = mapGoogleSubscription({ subscriptionState: PPC, linkedPurchaseToken: 'tok-A' }, { ...ctx, queriedPackageName: 'com.otra.app' });
    check('A: PENDING_PURCHASE_CANCELED con package equivocado -> sigue ganando wrong_package', !wrongPkg.ok && 'reason' in wrongPkg && wrongPkg.reason === 'wrong_package');
    const helperState = mapGoogleSubscriptionState(PPC);
    check('A: mapGoogleSubscriptionState(PENDING_PURCHASE_CANCELED) -> NO reconocido, jamas ACTIVE (explicito, no default)', helperState.recognized === false && helperState.state !== 'ACTIVE');
    check('A: el mapper trata PENDING_PURCHASE_CANCELED de forma EXPLICITA (no lo deja caer por el default)', /GOOGLE_SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED/.test(stripComments(readSrc('subscription/google/map-google-subscription.ts'))));
  }

  // ========================================================================
  console.log('--- PARTE A2. reglas PURAS: eleccion de proveedor (fail-closed en prod) + acknowledgement ---');

  // A2.a -- `resolveSubscriptionProviderChoice` (task hardening seccion A).
  const { resolveSubscriptionProviderChoice } = await import('../src/subscription/subscription-provider-choice');
  const choiceMatrix: Array<[string | undefined, string | undefined, 'google' | 'fake' | 'reject']> = [
    ['development', undefined, 'fake'],
    ['development', 'fake', 'fake'],
    ['test', undefined, 'fake'],
    [undefined, 'fake', 'fake'],
    ['development', 'google', 'google'],
    ['production', 'google', 'google'],
    ['production', undefined, 'reject'], // falta el provider en prod -> fail-closed
    ['production', 'fake', 'reject'], // provider=fake en prod -> fail-closed
    ['production', 'anything-else', 'reject'],
  ];
  for (const [nodeEnv, impl, expected] of choiceMatrix) {
    const c = resolveSubscriptionProviderChoice(nodeEnv, impl);
    const got = 'reject' in c ? 'reject' : c.use;
    check(`A2: choice(NODE_ENV=${nodeEnv ?? 'unset'}, impl=${impl ?? 'unset'}) -> ${expected}`, got === expected);
  }
  check('A2: el modulo aplica resolveSubscriptionProviderChoice y LANZA en el rechazo', (() => {
    const mod = stripComments(readSrc('subscription/subscription.module.ts'));
    return /resolveSubscriptionProviderChoice\(/.test(mod) && /'reject' in choice\) throw new Error\(choice\.reject\)/.test(mod);
  })());
  check('A2: la factory NO tiene un default "fake" a secas (sin config.get(IMPL, "fake"))', !/GOOGLE_PLAY_PROVIDER_IMPL['"],\s*['"]fake['"]/.test(readSrc('subscription/subscription.module.ts')));

  // A2.b -- `shouldAcknowledgeSubscription` (task hardening seccion B).
  const { shouldAcknowledgeSubscription } = await import('../src/subscription/should-acknowledge');
  const future = new Date(now.getTime() + 30 * 24 * HOUR);
  const past = new Date(now.getTime() - 30 * 24 * HOUR);
  const ackMatrix: Array<[string, Parameters<typeof shouldAcknowledgeSubscription>[0], boolean]> = [
    ['ACTIVE + no-ack -> ack', { state: 'ACTIVE', expiryTime: future, recognizedState: true, acknowledged: false }, true],
    ['ACTIVE + expiry pasado (stale) -> NO (no concede)', { state: 'ACTIVE', expiryTime: past, recognizedState: true, acknowledged: false }, false],
    ['IN_GRACE_PERIOD + no-ack -> ack (la tabla lo considera entitled)', { state: 'IN_GRACE_PERIOD', expiryTime: future, recognizedState: true, acknowledged: false }, true],
    ['CANCELED + expiry futuro + no-ack -> ack (usuario cancelo auto-renovacion, periodo pagado vigente)', { state: 'CANCELED', expiryTime: future, recognizedState: true, acknowledged: false }, true],
    ['CANCELED + expiry pasado + no-ack -> NO (ya no concede)', { state: 'CANCELED', expiryTime: past, recognizedState: true, acknowledged: false }, false],
    ['PENDING -> NO', { state: 'PENDING', expiryTime: future, recognizedState: true, acknowledged: false }, false],
    ['EXPIRED -> NO', { state: 'EXPIRED', expiryTime: past, recognizedState: true, acknowledged: false }, false],
    ['ON_HOLD -> NO', { state: 'ON_HOLD', expiryTime: past, recognizedState: true, acknowledged: false }, false],
    ['PAUSED -> NO', { state: 'PAUSED', expiryTime: future, recognizedState: true, acknowledged: false }, false],
    ['estado fail-closed (recognized=false) -> NO', { state: 'EXPIRED', expiryTime: future, recognizedState: false, acknowledged: false }, false],
    ['ya acknowledgeada -> NO (renovacion normal)', { state: 'ACTIVE', expiryTime: future, recognizedState: true, acknowledged: true }, false],
  ];
  for (const [label, input, expected] of ackMatrix) {
    check(`A2: shouldAcknowledge: ${label}`, shouldAcknowledgeSubscription(input, now) === expected);
  }
  check('A2: la reconciliacion delega en shouldAcknowledgeSubscription (no re-implementa la regla)', /shouldAcknowledgeSubscription\(\{/.test(stripComments(readSrc('subscription/subscription-reconciliation.service.ts'))));

  // ========================================================================
  console.log('--- PARTE B. reconciliacion end-to-end (fake adapter) ---');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const reconcile = (auth: Record<string, string>, purchaseToken: string) =>
    req('POST', '/me/subscription/google-play/reconcile', auth, { purchaseToken });
  const tierOf = async (auth: Record<string, string>) => ((await req('GET', '/me/entitlement', auth)).body as { tier?: string } | null)?.tier;
  const rowOf = async (token: string) =>
    (await pg.query(`SELECT state, acknowledgement_state, latest_event_time, account_id FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0] as
      | { state: string; acknowledgement_state: string; latest_event_time: Date | null; account_id: string }
      | undefined;

  try {
    // B1 -- ACTIVE + futuro -> verified -> PREMIUM -> acked -> latest_event_time NULL.
    {
      const s = await makeSession(pg, 'b1');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      const r = await reconcile(s.auth, token);
      check('B1: reconcile ACTIVE -> 200 { status: "verified" }', r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ status: 'verified' }));
      check('B1: GET /me/entitlement -> PREMIUM', (await tierOf(s.auth)) === 'PREMIUM');
      const row = await rowOf(token);
      check('B1: fila persistida state=ACTIVE', row?.state === 'ACTIVE');
      check('B1: acknowledgement_state = ACKNOWLEDGED (backend acknowledgeo)', row?.acknowledgement_state === 'ACKNOWLEDGED');
      check('B1: latest_event_time IS NULL (verificacion directa no aporta cronologia de proveedor)', row?.latest_event_time === null);
    }

    // B2 -- PENDING -> pending -> FREE -> NO acknowledge.
    {
      const s = await makeSession(pg, 'b2');
      const token = encodeFakeSubscriptionToken({ state: 'PENDING', expiryDeltaMs: 30 * 24 * HOUR });
      const r = await reconcile(s.auth, token);
      check('B2: reconcile PENDING -> 200 { status: "pending" }', r.status === 200 && (r.body as { status?: string })?.status === 'pending');
      check('B2: GET /me/entitlement -> FREE (una compra pendiente nunca concede)', (await tierOf(s.auth)) === 'FREE');
      check('B2: acknowledgement_state = PENDING (NO se acknowledgea una pendiente)', (await rowOf(token))?.acknowledgement_state === 'PENDING');
    }

    // B3 -- idempotencia: mismo token dos veces -> una sola fila, mismo dueno.
    {
      const s = await makeSession(pg, 'b3');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 20 * 24 * HOUR });
      await reconcile(s.auth, token);
      const r2 = await reconcile(s.auth, token);
      check('B3: segundo reconcile del mismo token -> 200 verified (idempotente)', r2.status === 200);
      const count = (await pg.query(`SELECT count(*)::int n FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0].n;
      check('B3: EXACTAMENTE 1 fila para el token', count === 1);
      check('B3: la fila sigue siendo de la misma cuenta', (await rowOf(token))?.account_id === s.accountId);
    }

    // B4 -- fallo de red de Google -> 503 -> ninguna fila, sin PREMIUM.
    {
      const s = await makeSession(pg, 'b4');
      const token = encodeFakeErrorToken('transient');
      const r = await reconcile(s.auth, token);
      check('B4: fallo transitorio de Google -> 503', r.status === 503);
      check('B4: NO se fabrica ninguna suscripcion', (await rowOf(token)) === undefined);
      check('B4: GET /me/entitlement -> FREE', (await tierOf(s.auth)) === 'FREE');
    }

    // B5 -- producto equivocado -> 400 -> ninguna fila.
    {
      const s = await makeSession(pg, 'b5');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, productId: 'com.otro.producto' });
      const r = await reconcile(s.auth, token);
      check('B5: snapshot con productId != zetrynd_premium -> 400 SUBSCRIPTION_INVALID', r.status === 400 && (r.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_INVALID');
      check('B5: ninguna fila', (await rowOf(token)) === undefined);
    }

    // B6 -- not_configured NUNCA se disfraza de exito.
    {
      const s = await makeSession(pg, 'b6');
      const token = encodeFakeErrorToken('not_configured');
      const r = await reconcile(s.auth, token);
      check('B6: verificacion no configurada -> 503 (nunca un "verified" falso)', r.status === 503);
      check('B6: ninguna fila, sin PREMIUM', (await rowOf(token)) === undefined && (await tierOf(s.auth)) === 'FREE');
    }

    // B7 -- estado no reconocido -> fail-closed: fila EXPIRED, FREE, sin acknowledge.
    {
      const s = await makeSession(pg, 'b7');
      const token = encodeFakeSubscriptionToken({ state: 'EXPIRED', recognizedState: false, rawSubscriptionState: 'SUBSCRIPTION_STATE_FUTURE_2027', expiryDeltaMs: 99 * 24 * HOUR });
      const r = await reconcile(s.auth, token);
      check('B7: estado de Google no reconocido -> 200 verified (se persiste fail-closed)', r.status === 200);
      check('B7: fila state=EXPIRED, FREE', (await rowOf(token))?.state === 'EXPIRED' && (await tierOf(s.auth)) === 'FREE');
      check('B7: NO se acknowledgea un estado no reconocido', (await rowOf(token))?.acknowledgement_state === 'PENDING');
    }

    // B8 -- acknowledge se dispara tambien para CANCELED (periodo pagado vigente) y GRACE.
    {
      const s = await makeSession(pg, 'b8-canceled');
      // Usuario cancela la auto-renovacion antes de que el backend termine:
      // Google reporta CANCELED, expiryTime futuro, ackState PENDING.
      const token = encodeFakeSubscriptionToken({ state: 'CANCELED', expiryDeltaMs: 20 * 24 * HOUR, autoRenewing: false });
      const r = await reconcile(s.auth, token);
      check('B8: CANCELED + expiry futuro + no-ack -> 200 verified', r.status === 200);
      check('B8: -> PREMIUM (el periodo pagado sigue vigente)', (await tierOf(s.auth)) === 'PREMIUM');
      check('B8: -> acknowledgement_state = ACKNOWLEDGED (una cancelacion vigente TAMBIEN se acknowledgea)', (await rowOf(token))?.acknowledgement_state === 'ACKNOWLEDGED');
    }
    {
      const s = await makeSession(pg, 'b8-grace');
      const token = encodeFakeSubscriptionToken({ state: 'IN_GRACE_PERIOD', expiryDeltaMs: 3 * 24 * HOUR });
      const r = await reconcile(s.auth, token);
      check('B8: GRACE valido + no-ack -> 200 verified, PREMIUM, ACKNOWLEDGED', r.status === 200 && (await tierOf(s.auth)) === 'PREMIUM' && (await rowOf(token))?.acknowledgement_state === 'ACKNOWLEDGED');
    }
    {
      const s = await makeSession(pg, 'b8-ackd');
      // Ya acknowledgeada de origen (una renovacion) -> no se re-acknowledgea, 200.
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true });
      const r = await reconcile(s.auth, token);
      check('B8: ya acknowledgeada -> 200 verified, sigue ACKNOWLEDGED (sin re-acknowledge)', r.status === 200 && (await rowOf(token))?.acknowledgement_state === 'ACKNOWLEDGED');
    }

    // B8-retry -- fallo de acknowledge = 503 REINTENTABLE, fila preservada, sin duplicar.
    {
      const s = await makeSession(pg, 'b8-retry');
      const token = encodeFakeAckFailToken(1, { state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });

      const r1 = await reconcile(s.auth, token);
      check('B8-retry: #1 con ack fallido -> 503 REINTENTABLE (no "verified")', r1.status === 503);
      check('B8-retry: #1 -> la fila YA esta persistida (state ACTIVE)', (await rowOf(token))?.state === 'ACTIVE');
      check('B8-retry: #1 -> NO se revoca PREMIUM por un fallo de transporte del ack', (await tierOf(s.auth)) === 'PREMIUM');
      check('B8-retry: #1 -> acknowledgement_state sigue PENDING', (await rowOf(token))?.acknowledgement_state === 'PENDING');

      const r2 = await reconcile(s.auth, token);
      check('B8-retry: #2 (mismo token) -> reintenta el acknowledge y ahora tiene exito -> 200 verified', r2.status === 200 && (r2.body as { status?: string })?.status === 'verified');
      check('B8-retry: #2 -> acknowledgement_state = ACKNOWLEDGED', (await rowOf(token))?.acknowledgement_state === 'ACKNOWLEDGED');
      const count = (await pg.query(`SELECT count(*)::int n FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0].n;
      check('B8-retry: EXACTAMENTE 1 fila en todo el proceso (sin duplicar)', count === 1);
      check('B8-retry: sigue PREMIUM', (await tierOf(s.auth)) === 'PREMIUM');
    }

    // B9 -- colision de cuenta: mismo token, otra cuenta -> 409, dueno original intacto.
    {
      const a = await makeSession(pg, 'b9a');
      const b = await makeSession(pg, 'b9b');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      await reconcile(a.auth, token);
      const r = await reconcile(b.auth, token);
      check('B9: token de otra cuenta -> 409 SUBSCRIPTION_ACCOUNT_MISMATCH', r.status === 409 && (r.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_ACCOUNT_MISMATCH');
      check('B9: la fila sigue siendo de la cuenta A (no se transfiere)', (await rowOf(token))?.account_id === a.accountId);
      check('B9: la cuenta B NO gana PREMIUM', (await tierOf(b.auth)) === 'FREE');
    }

    // B10 -- linked token: A_tok -> SUPERSEDED, B_tok current, sin inventar latestEventTime.
    {
      const s = await makeSession(pg, 'b10');
      const oldToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 10 * 24 * HOUR });
      await reconcile(s.auth, oldToken);
      const newToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 40 * 24 * HOUR, linkedPurchaseToken: oldToken });
      const r = await reconcile(s.auth, newToken);
      check('B10: reconcile del token nuevo con linkedPurchaseToken -> 200', r.status === 200);
      check('B10: el token viejo pasa a SUPERSEDED', (await rowOf(oldToken))?.state === 'SUPERSEDED');
      check('B10: el token nuevo queda ACTIVE', (await rowOf(newToken))?.state === 'ACTIVE');
      check('B10: latest_event_time del token nuevo IS NULL (no se invento un timestamp de proveedor)', (await rowOf(newToken))?.latest_event_time === null);
      check('B10: GET /me/entitlement -> PREMIUM (la fila vigente es la nueva)', (await tierOf(s.auth)) === 'PREMIUM');
    }
    // B10b -- linked predecesor de otra cuenta -> 409, sin transferir.
    {
      const owner = await makeSession(pg, 'b10b-owner');
      const other = await makeSession(pg, 'b10b-other');
      const oldToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 10 * 24 * HOUR });
      await reconcile(owner.auth, oldToken);
      const newToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 40 * 24 * HOUR, linkedPurchaseToken: oldToken });
      const r = await reconcile(other.auth, newToken);
      check('B10b: token nuevo cuyo predecesor pertenece a otra cuenta -> 409', r.status === 409);
      check('B10b: el predecesor sigue siendo del dueno original, sin SUPERSEDED', (await rowOf(oldToken))?.account_id === owner.accountId && (await rowOf(oldToken))?.state === 'ACTIVE');
    }

    // ====================================================================
    console.log('--- PARTE C. forma del endpoint ---');
    {
      const s = await makeSession(pg, 'c');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      const extra = await req('POST', '/me/subscription/google-play/reconcile', s.auth, { purchaseToken: token, accountId: 'x', tier: 'PREMIUM', state: 'ACTIVE', expiryTime: 'y', autoRenowing: true, productId: 'z' });
      check('C: body con campos extra (accountId/tier/state/...) -> 400 VALIDATION_ERROR (.strict())', extra.status === 400 && (extra.body as { error?: { code?: string } })?.error?.code === 'VALIDATION_ERROR');
      const noAuth = await req('POST', '/me/subscription/google-play/reconcile', {}, { purchaseToken: token });
      check('C: sin sesion -> 401', noAuth.status === 401);
      const ok = await reconcile(s.auth, token);
      const keys = ok.body && typeof ok.body === 'object' ? Object.keys(ok.body as object) : [];
      check('C: la respuesta tiene EXACTAMENTE la clave "status"', JSON.stringify(keys) === JSON.stringify(['status']));
      check('C: la respuesta NO hace eco del purchaseToken ni trae payload de Google', !JSON.stringify(ok.body).includes(token.slice(0, 10)) && !JSON.stringify(ok.body).includes('fake') && !JSON.stringify(ok.body).includes('subscriptionState'));
    }
    {
      const ctrl = stripComments(readSrc('subscription/subscription.controller.ts'));
      check('C: el controller responde via subscriptionReconcileResponseSchema.parse({ status })', /subscriptionReconcileResponseSchema\.parse\(\{\s*status:/.test(ctrl));
      check('C: el controller opera sobre request.accountId (no acepta accountId del body)', /request\.accountId/.test(ctrl) && !/body\.accountId|@Param|@Query/.test(ctrl));
      const svc = stripComments(readSrc('subscription/subscription-reconciliation.service.ts'));
      check('C: el servicio devuelve solo { status } (sin tier/estado/expiry crudos)', /return \{ status:/.test(svc) && !/return \{[^}]*\btier\b/.test(svc));
    }

    // ====================================================================
    console.log('--- PARTE D. frontera de transporte: Google no se filtra al dominio ---');
    {
      const entSvc = readSrc('entitlement/entitlement.service.ts');
      check('D: EntitlementService NO importa nada de subscription/ ni de google/ (nunca parsea Google)', !/from '\.\.\/subscription|google-subscription|map-google|google-auth-library/.test(entSvc));
      const recon = readSrc('subscription/subscription-reconciliation.service.ts');
      check('D: la reconciliacion NO importa tipos de transporte de Google', !/google-subscription-v2|map-google-subscription|GoogleSubscriptionPurchaseV2|google-auth-library/.test(recon));
      check('D: la reconciliacion consume el puerto neutral (VerifiedSubscriptionSnapshot), no JSON de Google', /VerifiedSubscriptionSnapshot|SUBSCRIPTION_PROVIDER_ADAPTER/.test(recon));
      const ctrl = readSrc('subscription/subscription.controller.ts');
      check('D: el controller NO importa google-auth-library ni tipos de google/', !/google-auth-library|subscription\/google\//.test(ctrl));
      const adapter = readSrc('subscription/google/google-play-subscription.adapter.ts');
      check('D: SOLO el adaptador real importa google-auth-library', /from 'google-auth-library'/.test(adapter));
      const mod = stripComments(readSrc('subscription/subscription.module.ts'));
      check('D: el adaptador real SOLO se construye bajo la eleccion "google" (resolveSubscriptionProviderChoice)', /resolveSubscriptionProviderChoice\(/.test(mod) && /choice\.use === 'google' \? new GooglePlaySubscriptionAdapter\(config\) : fake/.test(mod));
    }

    // ====================================================================
    console.log('--- PARTE E. procedencia de latestEventTime (C3.2 seccion 3) ---');
    {
      const repo = stripComments(readSrc('entitlement/subscription/account-subscription.repository.ts'));
      const createBody = repo.slice(repo.indexOf('async createFromVerified'), repo.indexOf('async updateFromVerified'));
      const updateBody = repo.slice(repo.indexOf('async updateFromVerified'), repo.indexOf('async markSuperseded'));
      check('E: createFromVerified NO fija latestEventTime', !/latestEventTime/.test(createBody));
      check('E: updateFromVerified NO fija latestEventTime ni latestNotificationType', !/latestEventTime|latestNotificationType/.test(updateBody));
      check('E: la reconciliacion nunca referencia latestEventTime', !/latestEventTime/.test(stripComments(readSrc('subscription/subscription-reconciliation.service.ts'))));

      // Comportamiento: una fila con latestEventTime NO-null (simula una RTDN
      // previa) NO se borra ni se reemplaza al reconciliar directo.
      const s = await makeSession(pg, 'e');
      const token = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      await reconcile(s.auth, token); // crea la fila (latest_event_time NULL)
      const rtdnTime = new Date(now.getTime() - 2 * HOUR);
      await pg.query(`UPDATE account_subscription SET latest_event_time = $1, latest_notification_type = 'SUBSCRIPTION_RENEWED' WHERE purchase_token = $2`, [rtdnTime, token]);
      await reconcile(s.auth, token); // reconcilia directo otra vez
      const row = (await pg.query(`SELECT latest_event_time, latest_notification_type FROM account_subscription WHERE purchase_token = $1`, [token])).rows[0];
      check('E: latest_event_time de una RTDN previa NO se borra al reconciliar directo', row.latest_event_time instanceof Date && Math.abs(new Date(row.latest_event_time).getTime() - rtdnTime.getTime()) < 1000);
      check('E: latest_notification_type tampoco se toca', row.latest_notification_type === 'SUBSCRIPTION_RENEWED');
    }

    // ====================================================================
    console.log('--- PARTE F. credenciales y package.json ---');
    check('F: package.json declara google-auth-library como dep directa', /"google-auth-library":/.test(readFileSync(join(SRC, '..', 'package.json'), 'utf8')));
    check('F: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON solo se LEE (config.get) en el adaptador real', (() => {
      const readsIt = (f: string) => /config\.(get|getOrThrow)<[^>]*>\('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'\)|config\.(get|getOrThrow)\('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON'\)/.test(readSrc(f));
      const otherReaders = ['subscription/subscription-reconciliation.service.ts', 'subscription/subscription.controller.ts', 'subscription/subscription.module.ts', 'subscription/fake-subscription-provider.adapter.ts', 'subscription/google/map-google-subscription.ts']
        .filter(readsIt);
      return otherReaders.length === 0 && readsIt('subscription/google/google-play-subscription.adapter.ts');
    })());
    check('F: el adaptador real no tiene logger ni loguea la credencial (solo lanza errores tipados)', !/Logger|this\.logger|console\./.test(stripComments(readSrc('subscription/google/google-play-subscription.adapter.ts'))));
    check('F: .env.example documenta GOOGLE_PLAY_PROVIDER_IMPL y no trae un JSON real', (() => {
      const env = readFileSync(join(SRC, '..', '.env.example'), 'utf8');
      return /GOOGLE_PLAY_PROVIDER_IMPL=fake/.test(env) && /# GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/.test(env) && !/"private_key"/.test(env);
    })());

    // ====================================================================
    console.log('--- PARTE G. compra pendiente CANCELADA (SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED) ---');

    // G1 -- compra pendiente INICIAL cancelada (sin linked) -> canceled, FREE,
    //       sin fila, sin acknowledge. Idempotente.
    {
      const s = await makeSession(pg, 'g1');
      const token = encodeFakePendingPurchaseCanceledToken(null);
      const r = await reconcile(s.auth, token);
      check('G1: compra pendiente inicial cancelada -> 200 { status: "canceled" }', r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ status: 'canceled' }));
      check('G1: GET /me/entitlement -> FREE', (await tierOf(s.auth)) === 'FREE');
      check('G1: NO se crea ninguna fila para el token cancelado', (await rowOf(token)) === undefined);
      const r2 = await reconcile(s.auth, token);
      check('G1: reintento idempotente -> sigue 200 canceled, sin fila', r2.status === 200 && (r2.body as { status?: string })?.status === 'canceled' && (await rowOf(token)) === undefined);
    }

    // G2 -- reemplazo pendiente cancelado, linked a A ACTIVE + futuro:
    //       DISPOSICION DEL TOKEN ENVIADO = `canceled` (aunque A siga dando
    //       PREMIUM). A sin cambios, NO SUPERSEDED; B nunca es fila.
    {
      const s = await makeSession(pg, 'g2');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakePendingPurchaseCanceledToken(aToken);
      const r = await reconcile(s.auth, bToken);
      check('G2: reemplazo pendiente cancelado (linked a A ACTIVE) -> 200 { status: "canceled" } (NUNCA "verified")', r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ status: 'canceled' }));
      check('G2: A sigue ACTIVE, NO SUPERSEDED', (await rowOf(aToken))?.state === 'ACTIVE');
      check('G2: B (token cancelado) nunca es una fila', (await rowOf(bToken)) === undefined);
      check('G2: GET /me/entitlement -> PREMIUM (authorization independiente, derivada de A)', (await tierOf(s.auth)) === 'PREMIUM');
    }

    // G3 -- linked a A CANCELED + expiry futuro -> status `canceled`, PREMIUM.
    {
      const s = await makeSession(pg, 'g3');
      const aToken = encodeFakeSubscriptionToken({ state: 'CANCELED', expiryDeltaMs: 15 * 24 * HOUR, autoRenewing: false });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakePendingPurchaseCanceledToken(aToken);
      const r = await reconcile(s.auth, bToken);
      check('G3: linked a A CANCELED+futuro -> 200 { status: "canceled" }, A no SUPERSEDED, entitlement PREMIUM', r.status === 200 && (r.body as { status?: string })?.status === 'canceled' && (await rowOf(aToken))?.state === 'CANCELED' && (await tierOf(s.auth)) === 'PREMIUM');
    }

    // G4 -- linked a A EXPIRED -> status `canceled`, entitlement FREE.
    {
      const s = await makeSession(pg, 'g4');
      const aToken = encodeFakeSubscriptionToken({ state: 'EXPIRED', expiryDeltaMs: -5 * 24 * HOUR });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakePendingPurchaseCanceledToken(aToken);
      const r = await reconcile(s.auth, bToken);
      check('G4: linked a A EXPIRED -> 200 { status: "canceled" }, A EXPIRED, entitlement FREE', r.status === 200 && (r.body as { status?: string })?.status === 'canceled' && (await rowOf(aToken))?.state === 'EXPIRED' && (await tierOf(s.auth)) === 'FREE');
      check('G4: B nunca es fila', (await rowOf(bToken)) === undefined);
    }

    // G5 -- una compra pendiente cancelada NUNCA marca a A SUPERSEDED
    //       (contraste directo con el reemplazo COMPLETADO de G7).
    {
      const s = await makeSession(pg, 'g5');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 20 * 24 * HOUR });
      await reconcile(s.auth, aToken);
      await reconcile(s.auth, encodeFakePendingPurchaseCanceledToken(aToken));
      check('G5: A jamas pasa a SUPERSEDED por una compra pendiente cancelada', (await rowOf(aToken))?.state === 'ACTIVE');
    }

    // G5b -- reconciliacion repetida de la compra pendiente cancelada linkeada:
    //        idempotente -- sigue `canceled`, A intacta, sin fila para B.
    {
      const s = await makeSession(pg, 'g5b');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 25 * 24 * HOUR });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakePendingPurchaseCanceledToken(aToken);
      await reconcile(s.auth, bToken);
      const r2 = await reconcile(s.auth, bToken);
      check('G5b: 2do reconcile del token cancelado linkeado -> sigue 200 canceled', r2.status === 200 && (r2.body as { status?: string })?.status === 'canceled');
      check('G5b: A sigue ACTIVE (una sola fila, sin SUPERSEDED), B sin fila, PREMIUM', (await rowOf(aToken))?.state === 'ACTIVE' && (await rowOf(bToken)) === undefined && (await tierOf(s.auth)) === 'PREMIUM');
      const aCount = (await pg.query(`SELECT count(*)::int n FROM account_subscription WHERE purchase_token = $1`, [aToken])).rows[0].n;
      check('G5b: EXACTAMENTE 1 fila para A', aCount === 1);
    }

    // G6 -- linked a A de OTRA cuenta -> 409, sin mutar nada.
    {
      const owner = await makeSession(pg, 'g6-owner');
      const other = await makeSession(pg, 'g6-other');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR });
      await reconcile(owner.auth, aToken);
      const r = await reconcile(other.auth, encodeFakePendingPurchaseCanceledToken(aToken));
      check('G6: reemplazo pendiente cancelado cuyo linked es de otra cuenta -> 409 SUBSCRIPTION_ACCOUNT_MISMATCH', r.status === 409 && (r.body as { error?: { code?: string } })?.error?.code === 'SUBSCRIPTION_ACCOUNT_MISMATCH');
      check('G6: A sigue siendo del dueno original, ACTIVE, sin SUPERSEDED', (await rowOf(aToken))?.account_id === owner.accountId && (await rowOf(aToken))?.state === 'ACTIVE');
      check('G6: la otra cuenta NO gana PREMIUM', (await tierOf(other.auth)) === 'FREE');
    }

    // G7 -- REGRESION: un reemplazo COMPLETADO (ACTIVE con linkedPurchaseToken)
    //       SIGUE marcando a A SUPERSEDED con normalidad. La regla especial es
    //       solo para PENDING_PURCHASE_CANCELED.
    {
      const s = await makeSession(pg, 'g7');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 10 * 24 * HOUR });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 40 * 24 * HOUR, linkedPurchaseToken: aToken });
      const r = await reconcile(s.auth, bToken);
      check('G7: reemplazo COMPLETADO -> 200 { status: "verified" } (NO "canceled"), A SUPERSEDED, B ACTIVE, PREMIUM', r.status === 200 && (r.body as { status?: string })?.status === 'verified' && (await rowOf(aToken))?.state === 'SUPERSEDED' && (await rowOf(bToken))?.state === 'ACTIVE' && (await tierOf(s.auth)) === 'PREMIUM');
    }

    // G8 -- un enum GENUINAMENTE desconocido sigue fail-closed (no se confunde
    //       con PENDING_PURCHASE_CANCELED).
    {
      const unknown = mapGoogleSubscriptionState('SUBSCRIPTION_STATE_SOMETHING_NEW_2028');
      check('G8: enum futuro desconocido -> EXPIRED + NO reconocido (fail-closed, sin cambios)', unknown.state === 'EXPIRED' && unknown.recognized === false);
    }

    // G9 -- NUNCA se acknowledgea el token de una compra pendiente cancelada.
    {
      const s = await makeSession(pg, 'g9');
      const aToken = encodeFakeSubscriptionToken({ state: 'ACTIVE', expiryDeltaMs: 30 * 24 * HOUR, acknowledged: true });
      await reconcile(s.auth, aToken);
      const bToken = encodeFakePendingPurchaseCanceledToken(aToken);
      await reconcile(s.auth, bToken);
      check('G9: el token cancelado no tiene fila -> imposible que se haya acknowledgeado', (await rowOf(bToken)) === undefined);
      check('G9: A conserva su acknowledgement_state = ACKNOWLEDGED (no se toco)', (await rowOf(aToken))?.acknowledgement_state === 'ACKNOWLEDGED');
    }
  } finally {
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
  console.log('Todas las verificaciones del gate del adaptador de Google Play (PREMIUM V1, Capa 3, C3.2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
