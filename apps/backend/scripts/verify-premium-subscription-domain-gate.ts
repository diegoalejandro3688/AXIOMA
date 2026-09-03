// Gate de PREMIUM V1 -- Capa 3 (Google Play Billing), C3.1: dominio de
// suscripcion + derivacion de entitlement.
//
// Dos partes:
//   PARTE A -- funcion PURA `deriveSubscriptionTier` (sin DB, sin server):
//     la matriz de ciclo de vida aprobada en C3.0 (ADR seccion E.1) + los
//     casos frontera (`expiryTime === now`) + la invariante "el tier NUNCA
//     sale de `autoRenewing`".
//   PARTE B -- integracion contra el servidor de gates real + DB
//     (`axioma_gates_dev` via run-gate.ts) + SQL directo con `pg`:
//     `GET /me/entitlement` deriva del `account_subscription` REAL,
//     la regla de seleccion de la fila vigente, la unicidad global de
//     `purchaseToken`, la precedencia del override de QA y la
//     production-safety, y el contrato `{ tier }` intacto.
//
// C3.1 NO conecta con Google: este gate nunca llama a `subscriptionsv2.get`,
// nunca monta un endpoint de compra/restore/RTDN, nunca usa credenciales.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { deriveSubscriptionTier, type NormalizedSubscriptionState } from '../src/entitlement/subscription/derive-subscription-tier';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

interface TestSession {
  accountId: string;
  authHeaders: Record<string, string>;
}

/**
 * Crea una cuenta + identidad + sesion por SQL directo (no via
 * `POST /auth/session`, que esta rate-limited a 10/60s y este gate necesita
 * ~20 cuentas). El AuthGuard valida exactamente estas tres filas
 * (`auth.service.validateSession`): identidad por `provider_subject`,
 * sesion no revocada/no expirada, `session_version` coincidente.
 */
async function makeSession(pg: Client, label: string): Promise<TestSession> {
  const uid = `sub-domain-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const accountId = randomUUID();
  const sessionId = randomUUID();
  await pg.query(
    `INSERT INTO account (id, status, session_version, created_at, updated_at) VALUES ($1, 'ACTIVE', 1, now(), now())`,
    [accountId],
  );
  await pg.query(
    `INSERT INTO auth_identity (id, account_id, provider_code, provider_subject, email_normalized, email_verified_at, linked_at)
     VALUES ($1, $2, 'firebase', $3, $4, now(), now())`,
    [randomUUID(), accountId, uid, `${uid}@example.com`],
  );
  await pg.query(
    `INSERT INTO auth_session (id, account_id, session_version, created_at, expires_at)
     VALUES ($1, $2, 1, now(), now() + interval '1 day')`,
    [sessionId, accountId],
  );
  createdAccountIds.push(accountId);
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  return { accountId, authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': sessionId } };
}

const createdAccountIds: string[] = [];

async function setOverride(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
  const q = tier === null ? '' : `&tier=${tier}`;
  const r = await req('POST', `/_internal/entitlement/set-tier-override?accountId=${accountId}${q}`, { 'x-internal-ops-key': opsKey });
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

const HOUR = 3_600_000;
const D = (deltaMs: number) => new Date(Date.now() + deltaMs);

async function main() {
  // ========================================================================
  console.log('--- PARTE A. deriveSubscriptionTier (funcion pura, sin DB) ---');

  const future = D(24 * HOUR);
  const past = D(-24 * HOUR);
  const now = new Date();
  const der = (state: NormalizedSubscriptionState, expiryTime: Date | null, autoRenewing = true) =>
    deriveSubscriptionTier({ state, expiryTime, autoRenewing }, now);

  check('null -> FREE', deriveSubscriptionTier(null, now) === 'FREE');
  check('ACTIVE + expiry futuro -> PREMIUM', der('ACTIVE', future) === 'PREMIUM');
  check('ACTIVE + expiry null -> PREMIUM (se confia en el estado)', der('ACTIVE', null) === 'PREMIUM');
  check('IN_GRACE_PERIOD + expiry futuro -> PREMIUM (grace conserva acceso)', der('IN_GRACE_PERIOD', future) === 'PREMIUM');
  check('CANCELED + expiry futuro -> PREMIUM (periodo pagado sigue vigente)', der('CANCELED', future) === 'PREMIUM');
  check('CANCELED + expiry pasado -> FREE', der('CANCELED', past) === 'FREE');
  check('CANCELED + expiry null -> FREE (sin periodo pagado que probar)', der('CANCELED', null) === 'FREE');
  check('ON_HOLD -> FREE (aunque expiry fuese futuro)', der('ON_HOLD', future) === 'FREE');
  check('EXPIRED -> FREE', der('EXPIRED', past) === 'FREE');
  check('REVOKED -> FREE aunque expiry sea futuro (stale)', der('REVOKED', future) === 'FREE');
  check('PENDING -> FREE (una compra pendiente nunca concede)', der('PENDING', future) === 'FREE');
  check('PAUSED -> FREE (no aplica V1)', der('PAUSED', future) === 'FREE');
  check('SUPERSEDED -> FREE (nunca deberia llegar como fila vigente)', der('SUPERSEDED', future) === 'FREE');
  // Guarda de robustez: un estado "vigente" con expiry ya pasado -> FREE.
  check('ACTIVE + expiry pasado (fila stale) -> FREE', der('ACTIVE', past) === 'FREE');
  check('IN_GRACE_PERIOD + expiry pasado (fila stale) -> FREE', der('IN_GRACE_PERIOD', past) === 'FREE');

  // Frontera EXACTA: ADR E.1 usa `>` ESTRICTO -> `expiryTime === now` == YA EXPIRADO.
  const fixedNow = new Date('2026-09-02T12:00:00.000Z');
  const derAt = (state: NormalizedSubscriptionState, expiry: Date) => deriveSubscriptionTier({ state, expiryTime: expiry, autoRenewing: false }, fixedNow);
  check('CANCELED + expiryTime === now -> FREE (comparacion `>` estricta)', derAt('CANCELED', new Date('2026-09-02T12:00:00.000Z')) === 'FREE');
  check('CANCELED + expiryTime = now + 1ms -> PREMIUM', derAt('CANCELED', new Date('2026-09-02T12:00:00.001Z')) === 'PREMIUM');
  check('ACTIVE + expiryTime === now -> FREE (fila stale, guarda de robustez)', derAt('ACTIVE', new Date('2026-09-02T12:00:00.000Z')) === 'FREE');

  // `autoRenewing` NUNCA es autoridad de entitlement: para cada estado, el
  // resultado es identico con autoRenewing true y false.
  for (const state of ['ACTIVE', 'IN_GRACE_PERIOD', 'CANCELED', 'ON_HOLD', 'EXPIRED', 'REVOKED', 'PENDING', 'PAUSED'] as NormalizedSubscriptionState[]) {
    for (const expiry of [future, past, null]) {
      const withT = deriveSubscriptionTier({ state, expiryTime: expiry, autoRenewing: true }, now);
      const withF = deriveSubscriptionTier({ state, expiryTime: expiry, autoRenewing: false }, now);
      check(`autoRenewing no cambia el tier: ${state} / expiry=${expiry === null ? 'null' : expiry > now ? 'fut' : 'past'} (${withT})`, withT === withF);
    }
  }
  // Y el caso que mas importa: cancelar la auto-renovacion con periodo vigente NO degrada.
  check('cancelar auto-renovacion con periodo vigente -> sigue PREMIUM', deriveSubscriptionTier({ state: 'CANCELED', expiryTime: future, autoRenewing: false }, now) === 'PREMIUM');

  // ========================================================================
  console.log('--- PARTE B. integracion: GET /me/entitlement deriva del account_subscription real ---');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  async function insertSub(opts: {
    accountId: string;
    state: NormalizedSubscriptionState;
    expiryTime?: Date | null;
    autoRenewing?: boolean;
    purchaseToken?: string;
    linkedPurchaseToken?: string | null;
    updatedAt?: Date;
  }): Promise<string> {
    const token = opts.purchaseToken ?? `tok-${randomUUID()}`;
    const updatedAt = opts.updatedAt ?? new Date();
    await pg.query(
      `INSERT INTO account_subscription
         (id, account_id, provider, product_id, base_plan_id, purchase_token, linked_purchase_token,
          state, expiry_time, start_time, auto_renewing, acknowledgement_state, created_at, updated_at)
       VALUES ($1, $2, 'GOOGLE_PLAY', 'zetrynd_premium', 'premium-monthly', $3, $4,
          $5::subscription_state, $6, now(), $7, 'ACKNOWLEDGED', now(), $8)`,
      [
        randomUUID(),
        opts.accountId,
        token,
        opts.linkedPurchaseToken ?? null,
        opts.state,
        opts.expiryTime === undefined ? null : opts.expiryTime,
        opts.autoRenewing ?? true,
        updatedAt,
      ],
    );
    return token;
  }

  async function tierOf(auth: Record<string, string>): Promise<{ status: number; body: unknown }> {
    return req('GET', '/me/entitlement', auth);
  }

  try {
    // B0 -- cuenta SIN suscripcion -> FREE (comportamiento pre-C3.1 preservado).
    {
      const s = await makeSession(pg, 'b0');
      const r = await tierOf(s.authHeaders);
      check('B0: cuenta sin account_subscription -> { tier: "FREE" }', r.status === 200 && JSON.stringify(r.body) === JSON.stringify({ tier: 'FREE' }));
    }

    // B1..B9 -- un estado por cuenta.
    const cases: Array<[string, NormalizedSubscriptionState, Date | null, 'FREE' | 'PREMIUM', boolean]> = [
      ['B1 ACTIVE + futuro', 'ACTIVE', D(30 * 24 * HOUR), 'PREMIUM', true],
      ['B2 CANCELED + futuro + autoRenew=false', 'CANCELED', D(10 * 24 * HOUR), 'PREMIUM', false],
      ['B3 IN_GRACE_PERIOD + futuro', 'IN_GRACE_PERIOD', D(3 * 24 * HOUR), 'PREMIUM', true],
      ['B4 ON_HOLD', 'ON_HOLD', D(-1 * HOUR), 'FREE', true],
      ['B5 EXPIRED', 'EXPIRED', D(-5 * 24 * HOUR), 'FREE', false],
      ['B6 REVOKED + futuro (stale)', 'REVOKED', D(20 * 24 * HOUR), 'FREE', true],
      ['B7 PENDING + futuro', 'PENDING', D(20 * 24 * HOUR), 'FREE', true],
      ['B8 ACTIVE + expiry pasado (stale)', 'ACTIVE', D(-1 * HOUR), 'FREE', true],
      ['B9 CANCELED + expiry pasado', 'CANCELED', D(-1 * HOUR), 'FREE', false],
    ];
    for (const [label, state, expiry, expected, autoRenew] of cases) {
      const s = await makeSession(pg, label.split(' ')[0]!.toLowerCase());
      await insertSub({ accountId: s.accountId, state, expiryTime: expiry, autoRenewing: autoRenew });
      const r = await tierOf(s.authHeaders);
      check(`${label} -> ${expected}`, r.status === 200 && (r.body as { tier?: string })?.tier === expected);
    }

    // ====================================================================
    console.log('--- PARTE C. seleccion de la fila vigente (historico + SUPERSEDED) ---');

    // C1 -- fila ACTIVE vieja (expiry futuro) + fila EXPIRED nueva -> gana la nueva -> FREE.
    {
      const s = await makeSession(pg, 'c1');
      await insertSub({ accountId: s.accountId, state: 'ACTIVE', expiryTime: D(60 * 24 * HOUR), updatedAt: D(-10 * 24 * HOUR) });
      await insertSub({ accountId: s.accountId, state: 'EXPIRED', expiryTime: D(-1 * HOUR), updatedAt: D(-1 * HOUR) });
      const r = await tierOf(s.authHeaders);
      check('C1: ACTIVE historico + EXPIRED mas reciente -> FREE (el historico no concede Premium)', (r.body as { tier?: string })?.tier === 'FREE');
    }

    // C2 -- fila EXPIRED vieja + fila ACTIVE nueva -> gana la nueva -> PREMIUM.
    {
      const s = await makeSession(pg, 'c2');
      await insertSub({ accountId: s.accountId, state: 'EXPIRED', expiryTime: D(-30 * 24 * HOUR), updatedAt: D(-30 * 24 * HOUR) });
      await insertSub({ accountId: s.accountId, state: 'ACTIVE', expiryTime: D(20 * 24 * HOUR), updatedAt: D(-1 * HOUR) });
      const r = await tierOf(s.authHeaders);
      check('C2: EXPIRED historico + ACTIVE mas reciente -> PREMIUM', (r.body as { tier?: string })?.tier === 'PREMIUM');
    }

    // C3 -- SUPERSEDED sola -> se excluye -> como si no hubiera suscripcion vigente -> FREE.
    {
      const s = await makeSession(pg, 'c3');
      await insertSub({ accountId: s.accountId, state: 'SUPERSEDED', expiryTime: D(60 * 24 * HOUR) });
      const r = await tierOf(s.authHeaders);
      check('C3: unica fila SUPERSEDED (expiry futuro) -> FREE (excluida de la seleccion)', (r.body as { tier?: string })?.tier === 'FREE');
    }

    // C4 -- SUPERSEDED (nueva, expiry futuro) + ACTIVE (vieja, expiry futuro) -> gana la ACTIVE -> PREMIUM.
    {
      const s = await makeSession(pg, 'c4');
      await insertSub({ accountId: s.accountId, state: 'ACTIVE', expiryTime: D(20 * 24 * HOUR), updatedAt: D(-2 * HOUR) });
      await insertSub({ accountId: s.accountId, state: 'SUPERSEDED', expiryTime: D(60 * 24 * HOUR), updatedAt: D(-1 * HOUR) });
      const r = await tierOf(s.authHeaders);
      check('C4: SUPERSEDED mas reciente + ACTIVE vigente -> PREMIUM (SUPERSEDED nunca es la fila vigente)', (r.body as { tier?: string })?.tier === 'PREMIUM');
    }

    // ====================================================================
    console.log('--- PARTE D. unicidad de purchaseToken / linkedPurchaseToken ---');
    {
      const a = await makeSession(pg, 'd-a');
      const b = await makeSession(pg, 'd-b');
      const shared = `tok-shared-${randomUUID()}`;
      await insertSub({ accountId: a.accountId, state: 'ACTIVE', expiryTime: D(10 * 24 * HOUR), purchaseToken: shared });
      let rejected = false;
      try {
        await insertSub({ accountId: b.accountId, state: 'ACTIVE', expiryTime: D(10 * 24 * HOUR), purchaseToken: shared });
      } catch (e) {
        rejected = (e as { code?: string }).code === '23505';
      }
      check('D1: un purchaseToken NO puede pertenecer a dos cuentas (unique violation 23505)', rejected);

      // linkedPurchaseToken NO es unico -- el mismo token viejo puede ser referenciado por varias filas.
      const oldToken = `tok-old-${randomUUID()}`;
      let linkedOk = true;
      try {
        await insertSub({ accountId: a.accountId, state: 'SUPERSEDED', expiryTime: D(-1 * HOUR), linkedPurchaseToken: oldToken });
        await insertSub({ accountId: a.accountId, state: 'ACTIVE', expiryTime: D(10 * 24 * HOUR), linkedPurchaseToken: oldToken });
      } catch {
        linkedOk = false;
      }
      check('D2: linkedPurchaseToken NO es unico (la rotacion de token no debilita la unicidad de purchaseToken)', linkedOk);
    }

    // ====================================================================
    console.log('--- PARTE E. precedencia del override de QA + production-safety ---');
    {
      const s = await makeSession(pg, 'e');
      const tierFor = async (auth: Record<string, string>): Promise<string | undefined> =>
        ((await req('GET', '/me/entitlement', auth)).body as { tier?: string } | null)?.tier;
      // Suscripcion EXPIRED -> derivacion pura diria FREE.
      await insertSub({ accountId: s.accountId, state: 'EXPIRED', expiryTime: D(-10 * 24 * HOUR) });
      check('E0: sin override, EXPIRED -> FREE', (await tierFor(s.authHeaders)) === 'FREE');

      await setOverride(s.accountId, 'PREMIUM');
      check('E1: override PREMIUM gana sobre la derivacion (EXPIRED) -> PREMIUM', (await tierFor(s.authHeaders)) === 'PREMIUM');

      await setOverride(s.accountId, 'FREE');
      check('E2: override FREE explicito se respeta', (await tierFor(s.authHeaders)) === 'FREE');

      await setOverride(s.accountId, null);
      check('E3: sin override -> vuelve a la derivacion (EXPIRED) -> FREE', (await tierFor(s.authHeaders)) === 'FREE');

      // Y sobre una suscripcion vigente, sin override, PREMIUM viene de la suscripcion, no de un truco.
      const s2 = await makeSession(pg, 'e2');
      await insertSub({ accountId: s2.accountId, state: 'ACTIVE', expiryTime: D(15 * 24 * HOUR) });
      check('E4: PREMIUM sin override viene de una AccountSubscription ACTIVE real', (await tierFor(s2.authHeaders)) === 'PREMIUM');
    }
    // Production-safety: el override SOLO es alcanzable via el controller interno,
    // que rechaza en produccion ANTES de mutar. Verificacion estatica (source).
    {
      const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
      const adminSrc = stripComments(readFileSync(join(__dirname, '..', 'src/entitlement/entitlement-internal-admin.controller.ts'), 'utf8'));
      check('E5: el endpoint de override llama rejectInProduction ANTES de mutar', adminSrc.indexOf('this.rejectInProduction();') !== -1 && adminSrc.indexOf('this.rejectInProduction();') < adminSrc.indexOf('this.entitlementService.setTestOnlyTierOverride'));
      check('E5: rejectInProduction lanza NotFoundException con NODE_ENV === "production"', /NODE_ENV'\)\s*===\s*'production'/.test(adminSrc) && /throw new NotFoundException\(\)/.test(adminSrc));
      const svcSrc = stripComments(readFileSync(join(__dirname, '..', 'src/entitlement/entitlement.service.ts'), 'utf8'));
      check('E6: EntitlementService no expone ningun otro camino a PREMIUM (solo override + deriveSubscriptionTier)', /deriveSubscriptionTier\(/.test(svcSrc) && !/return \{ tier: 'PREMIUM' \}/.test(svcSrc));
    }

    // ====================================================================
    console.log('--- PARTE F. contrato GET /me/entitlement intacto: EXACTAMENTE { tier } ---');
    {
      const sFree = await makeSession(pg, 'f-free');
      const rFree = await tierOf(sFree.authHeaders);
      check('F1: FREE -> body === { tier: "FREE" } (sin metadata de billing)', JSON.stringify(rFree.body) === JSON.stringify({ tier: 'FREE' }));

      const sPrem = await makeSession(pg, 'f-prem');
      await insertSub({ accountId: sPrem.accountId, state: 'ACTIVE', expiryTime: D(15 * 24 * HOUR) });
      const rPrem = await tierOf(sPrem.authHeaders);
      check('F2: PREMIUM -> body === { tier: "PREMIUM" } (sin state/expiryTime/autoRenewing/purchaseToken)', JSON.stringify(rPrem.body) === JSON.stringify({ tier: 'PREMIUM' }));
      const keys = rPrem.body && typeof rPrem.body === 'object' ? Object.keys(rPrem.body as object) : [];
      check('F3: el body tiene EXACTAMENTE una clave: "tier"', JSON.stringify(keys) === JSON.stringify(['tier']));

      const rNoAuth = await req('GET', '/me/entitlement');
      check('F4: 401 sin sesion (AuthGuard intacto)', rNoAuth.status === 401);
    }

    // ====================================================================
    console.log('--- PARTE G. migracion aditiva: tabla + enums + FK, sin backfill ---');
    {
      const tbl = await pg.query(`SELECT to_regclass('public.account_subscription') IS NOT NULL AS exists`);
      check('G1: tabla account_subscription existe', tbl.rows[0].exists === true);
      const enums = await pg.query(
        `SELECT typname FROM pg_type WHERE typname IN ('subscription_provider','subscription_state','subscription_acknowledgement_state')`,
      );
      check('G2: los 3 enums existen (subscription_provider / _state / _acknowledgement_state)', enums.rowCount === 3);
      const stateVals = await pg.query<{ v: string }>(
        `SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) v FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'subscription_state'`,
      );
      check(
        'G3: subscription_state tiene los 9 valores normalizados (ADR D.6)',
        stateVals.rows[0].v === 'PENDING,ACTIVE,IN_GRACE_PERIOD,ON_HOLD,CANCELED,EXPIRED,REVOKED,PAUSED,SUPERSEDED',
      );
      const fk = await pg.query(
        `SELECT 1 FROM information_schema.table_constraints
          WHERE table_name = 'account_subscription' AND constraint_type = 'FOREIGN KEY'`,
      );
      check('G4: hay FK account_subscription.account_id -> account', (fk.rowCount ?? 0) >= 1);
      // Sin backfill: cuentas preexistentes sin fila -> FREE (ya cubierto por B0).
      const orphan = await pg.query(
        `SELECT count(*)::int n FROM account a WHERE NOT EXISTS (SELECT 1 FROM account_subscription s WHERE s.account_id = a.id)`,
      );
      check('G5: existen cuentas SIN account_subscription y siguen siendo validas (derivan FREE)', orphan.rows[0].n > 0);
    }
  } finally {
    // Limpieza -- este gate crea cuentas/sesiones/suscripciones de prueba por
    // SQL directo; se borran en orden hijo -> padre (FK RESTRICT).
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
  console.log('Todas las verificaciones del gate de dominio de suscripcion (PREMIUM V1, Capa 3, C3.1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
