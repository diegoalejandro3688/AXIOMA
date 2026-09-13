// F1-A.4 -- gate de pseudonimización de moderación (PublicProfileReport /
// AccountBlock) al cierre definitivo de cuenta. Mismo patrón que
// verify-privacy-gate.ts: servidor real + Postgres directo para fixtures y
// aserciones, disparo del barrido vía el endpoint interno existente.
import 'dotenv/config';
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

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const token = (identity: Parameters<typeof StubIdentityProvider.encode>[0]) =>
  StubIdentityProvider.encode(identity);

async function createSessionWithProfile(pg: Client, tag: string): Promise<{ accountId: string; sessionId: string; username: string }> {
  const uid = `modclose-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${uid}@example.com`;
  const t = token({ providerSubject: uid, email, emailVerified: true });
  const rSession = await post('/auth/session', { idToken: t });
  const accountId = rSession.body.accountId as string;
  const sessionId = rSession.body.sessionId as string;
  // slice(-20), no (0, 20): tomar el sufijo conserva el random de 6 chars
  // (y la cola variable del timestamp) -- un slice desde el inicio se queda
  // con el prefijo fijo + los dígitos altos casi constantes del epoch ms,
  // produciendo el mismo username en corridas separadas (CONFLICT 409).
  const username = uid.replace(/-/g, '').slice(-20);
  const rProfile = await post('/user/public-profile', { username }, { authorization: `Bearer ${t}`, 'x-session-id': sessionId });
  if (rProfile.status !== 201 && rProfile.status !== 200) {
    throw new Error(`no se pudo crear perfil público para ${tag}: ${rProfile.status} ${JSON.stringify(rProfile.body)}`);
  }
  return { accountId, sessionId, username };
}

/** Dispara el barrido de cierre vía el endpoint interno existente (mismo patrón que otros gates de PRIVACY). */
async function runClosureSweep() {
  return post('/privacy/_internal/sweep', {}, { 'x-internal-ops-key': opsKey });
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  console.log('--- Fixtures: 4 cuentas (reporter, target, blocker, blocked) + relaciones cruzadas ---');
  const reporter = await createSessionWithProfile(pg, 'reporter');
  const target = await createSessionWithProfile(pg, 'target');
  const blocker = await createSessionWithProfile(pg, 'blocker');
  const blocked = await createSessionWithProfile(pg, 'blocked');
  // Cuenta activa de control -- NUNCA se cierra en este gate (checks E/J).
  const activeControl = await createSessionWithProfile(pg, 'active-control');

  // reporter -> target
  const reportRes = await post(`/user/safety/reports/${target.username}`, { reportType: 'IMPERSONATION' }, {
    'x-session-id': reporter.sessionId,
  });
  check('fixture: reporte creado', reportRes.status === 200 || reportRes.status === 201);

  // activeControl -> target (control: el reporter de esta fila NUNCA se cierra)
  const controlReportRes = await post(`/user/safety/reports/${target.username}`, { reportType: 'OTHER_SAFETY' }, {
    'x-session-id': activeControl.sessionId,
  });
  check('fixture: reporte de control creado', controlReportRes.status === 200 || controlReportRes.status === 201);

  // blocker -> blocked
  const blockRes = await post(`/user/safety/blocks/${blocked.username}`, {}, { 'x-session-id': blocker.sessionId });
  check('fixture: bloqueo creado', blockRes.status === 200 || blockRes.status === 201);

  // activeControl -> blocked (control: el bloqueador de esta fila NUNCA se cierra)
  const controlBlockRes = await post(`/user/safety/blocks/${blocked.username}`, {}, { 'x-session-id': activeControl.sessionId });
  check('fixture: bloqueo de control creado', controlBlockRes.status === 200 || controlBlockRes.status === 201);

  const reportRow = await pg.query(
    'SELECT id, reporter_account_id, target_account_id, target_public_profile_id FROM public_profile_report WHERE reporter_account_id = $1 AND target_account_id = $2',
    [reporter.accountId, target.accountId],
  );
  const originalReportId = reportRow.rows[0]?.id;
  const originalTargetProfileId = reportRow.rows[0]?.target_public_profile_id;
  check('fixture legible antes del cierre', !!originalReportId && !!originalTargetProfileId);

  const blockRow = await pg.query('SELECT id FROM account_block WHERE blocker_account_id = $1 AND blocked_account_id = $2', [
    blocker.accountId,
    blocked.accountId,
  ]);
  const originalBlockId = blockRow.rows[0]?.id;
  check('fixture de bloqueo legible antes del cierre', !!originalBlockId);

  console.log('--- Cerrar las 4 cuentas (solicitud + barrido inmediato, sin esperar 30 días) ---');
  for (const acc of [reporter, target, blocker, blocked]) {
    await post('/privacy/account-deletion', {}, { 'x-session-id': acc.sessionId });
    await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [
      acc.accountId,
    ]);
  }
  const sweep1 = await runClosureSweep();
  check('barrido corre sin error HTTP', sweep1.status === 200 || sweep1.status === 201);

  const statuses = await pg.query('SELECT id, status FROM account WHERE id = ANY($1::uuid[])', [
    [reporter.accountId, target.accountId, blocker.accountId, blocked.accountId],
  ]);
  check('las 4 cuentas quedan CLOSED tras el barrido', statuses.rows.every((r) => r.status === 'CLOSED'));

  console.log('--- A. Cierre del reportante: reporterAccountId ya no es el Account.id original ---');
  const rowA = await pg.query('SELECT reporter_account_id FROM public_profile_report WHERE id = $1', [originalReportId]);
  check('reporterAccountId cambiado', rowA.rows[0]?.reporter_account_id !== reporter.accountId);
  check('reporterAccountId sigue teniendo forma de UUID', /^[0-9a-f-]{36}$/i.test(rowA.rows[0]?.reporter_account_id ?? ''));

  console.log('--- B. Cierre del objetivo: targetAccountId ya no es el Account.id original ---');
  const rowB = await pg.query('SELECT target_account_id, target_public_profile_id FROM public_profile_report WHERE id = $1', [
    originalReportId,
  ]);
  check('targetAccountId cambiado', rowB.rows[0]?.target_account_id !== target.accountId);

  console.log('--- I. targetPublicProfileId ya no identifica directamente el perfil cerrado ---');
  check('targetPublicProfileId cambiado', rowB.rows[0]?.target_public_profile_id !== originalTargetProfileId);
  check('targetPublicProfileId coincide con targetAccountId (mismo ref)', rowB.rows[0]?.target_public_profile_id === rowB.rows[0]?.target_account_id);

  console.log('--- C. Cierre del bloqueador: blockerAccountId ya no es el Account.id original ---');
  const rowC = await pg.query('SELECT blocker_account_id FROM account_block WHERE id = $1', [originalBlockId]);
  check('blockerAccountId cambiado', rowC.rows[0]?.blocker_account_id !== blocker.accountId);

  console.log('--- D. Cierre del bloqueado: blockedAccountId ya no es el Account.id original ---');
  const rowD = await pg.query('SELECT blocked_account_id FROM account_block WHERE id = $1', [originalBlockId]);
  check('blockedAccountId cambiado', rowD.rows[0]?.blocked_account_id !== blocked.accountId);

  console.log('--- E/J. Identificadores de la cuenta activa de control permanecen intactos ---');
  // target_account_id ya fue pseudonimizado (igual que blocked_account_id
  // más abajo) -- buscamos por el valor actual (rowB), no por el original.
  const controlReportRow = await pg.query(
    'SELECT reporter_account_id, target_account_id FROM public_profile_report WHERE reporter_account_id = $1 AND target_account_id = $2',
    [activeControl.accountId, rowB.rows[0]?.target_account_id],
  );
  check('reporterAccountId de control SIN cambios (aunque el target sí cerró)', controlReportRow.rows[0]?.reporter_account_id === activeControl.accountId);

  const controlBlockRow = await pg.query('SELECT blocker_account_id FROM account_block WHERE blocker_account_id = $1 AND blocked_account_id = $2', [
    activeControl.accountId,
    rowD.rows[0]?.blocked_account_id, // el blocked_account_id ya fue pseudonimizado -- buscamos por el valor actual
  ]);
  check('blockerAccountId de control SIN cambios (aunque el blocked sí cerró)', controlBlockRow.rows.length === 1 && controlBlockRow.rows[0]?.blocker_account_id === activeControl.accountId);

  console.log('--- F. Las filas retenidas siguen existiendo (nunca se borran por cierre de una parte) ---');
  const reportStillExists = await pg.query('SELECT count(*) FROM public_profile_report WHERE id = $1', [originalReportId]);
  check('fila de reporte retenida', Number(reportStillExists.rows[0]?.count) === 1);
  const blockStillExists = await pg.query('SELECT count(*) FROM account_block WHERE id = $1', [originalBlockId]);
  check('fila de bloqueo retenida', Number(blockStillExists.rows[0]?.count) === 1);

  console.log('--- report_type y demás hechos de moderación no-identificadores no cambiaron ---');
  const reportTypeRow = await pg.query('SELECT report_type FROM public_profile_report WHERE id = $1', [originalReportId]);
  check('reportType sin alterar', reportTypeRow.rows[0]?.report_type === 'IMPERSONATION');

  console.log('--- G. Reintentar el barrido es idempotente (0 mutaciones adicionales, sin lanzar) ---');
  const sweep2 = await runClosureSweep();
  check('segundo barrido corre sin error HTTP', sweep2.status === 200 || sweep2.status === 201);
  const rowAAfterRetry = await pg.query('SELECT reporter_account_id FROM public_profile_report WHERE id = $1', [originalReportId]);
  check('reporterAccountId estable tras reintento (mismo pseudónimo, no cambia de nuevo)', rowAAfterRetry.rows[0]?.reporter_account_id === rowA.rows[0]?.reporter_account_id);

  console.log('--- H. Restricciones UNIQUE siguen válidas (sin duplicados tras pseudonimizar) ---');
  const dupCheckReport = await pg.query(
    'SELECT reporter_account_id, target_account_id, report_type, count(*) FROM public_profile_report GROUP BY 1,2,3 HAVING count(*) > 1',
  );
  check('sin duplicados en public_profile_report', dupCheckReport.rows.length === 0);
  const dupCheckBlock = await pg.query('SELECT blocker_account_id, blocked_account_id, count(*) FROM account_block GROUP BY 1,2 HAVING count(*) > 1');
  check('sin duplicados en account_block', dupCheckBlock.rows.length === 0);

  await pg.end();

  console.log(`\n${failures === 0 ? 'GATE PASS' : `GATE FALLÓ (${failures} check(s))`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
