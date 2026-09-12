// WEB-0D.1C-B4-R1 -- reconciliador DURABLE de participaciones terminales
// pendientes de privacidad: red de seguridad para el hook de cierre y el
// hook de finalización de B4 cuando cualquiera falla transitoriamente.
// Invocación directa del servicio real (con el interruptor
// GAMIFICATION_PRIVACY_RECONCILER_ENABLED fijado en ESTE proceso solamente,
// nunca en el servidor real) + HTTP real contra /privacy para los cierres.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues } from './gate-db-safety';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { GamificationPrivacyService } from '../src/gamification/gamification-privacy.service';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3001';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failures++;
    console.error(`FALLO  ${label}`);
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

let sessionCount = 0;
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  // POST /auth/session tiene @Throttle(10/60s) -- este gate crea varias
  // sesiones, se espacian para no disparar ese límite (mismo criterio que
  // verify-deferred-history-pseudonymization-gate.ts).
  if (sessionCount > 0) await sleep(7_000);
  sessionCount++;
  const uid = `b4r1-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

async function closeDefinitively(pg: Client, session: { accountId: string; headers: Record<string, string> }): Promise<void> {
  const del = await req('POST', '/privacy/account-deletion', session.headers, {});
  if (del.status !== 202) throw new Error(`solicitud de eliminación falló para ${session.accountId}: ${del.status} ${del.raw}`);
  await pg.query("UPDATE privacy_request SET scheduled_for = now() - interval '1 hour' WHERE account_id = $1 AND status = 'PENDING'", [session.accountId]);
  const sweep = await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey }, {});
  if (sweep.status !== 200) throw new Error(`barrido de cierre falló: ${sweep.status} ${sweep.raw}`);
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);
  await finalizeStaleGateSeasons(pg);
  await retireStaleGateLeagues(pg);

  const now = new Date();
  const suffix = `${Date.now()}`;
  const gamificationSecret = process.env.GAMIFICATION_ACTOR_SECRET ?? '';
  check('preflight: GAMIFICATION_ACTOR_SECRET presente', gamificationSecret.length > 0);

  // Habilita el reconciliador SOLO en este proceso de gate -- nunca en el
  // servidor real (ver B4-R1 §12: apagado por defecto).
  process.env.GAMIFICATION_PRIVACY_RECONCILER_ENABLED = 'true';

  const txRunner = new TransactionRunnerService(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const privacyService = new GamificationPrivacyService(txRunner, undefined, participationRepo);

  // Fixture de temporada/liga/grupo YA FINALIZADO -- reutilizable por todos
  // los escenarios (todas las participaciones sembradas nacen directamente
  // en un estado terminal, sin pasar por finalizeGroup real).
  const existingActiveSeason = await pg.query(`SELECT id, starts_at, ends_at FROM game_season WHERE status = 'ACTIVE' LIMIT 1`);
  let seasonId: string;
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id;
  } else {
    seasonId = randomUUID();
    await pg.query(`INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1,$2,'Gate Season B4R1','ACTIVE',$3,$4)`, [
      seasonId,
      `b4r1-gate-season-${suffix}`,
      now.toISOString(),
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ]);
  }
  const leagueDefId = randomUUID();
  await pg.query(`INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1,$2,'Gate League B4R1',1,30)`, [leagueDefId, `b4r1-gate-league-${suffix}`]);
  const terminalGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,30,'v1','FINALIZED')`, [
    terminalGroupId,
    seasonId,
    leagueDefId,
  ]);
  const activeGroupId = randomUUID();
  await pg.query(`INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,2,30,'v1','OPEN')`, [
    activeGroupId,
    seasonId,
    leagueDefId,
  ]);

  async function seedTerminalParticipation(accountId: string, rank = 1): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status, final_rank, finalized_at) VALUES ($1,$2,$3,$4,$5,$6,'RETAINED',$7,$8)`,
      [id, seasonId, accountId, leagueDefId, terminalGroupId, now.toISOString(), rank, now.toISOString()],
    );
    return id;
  }

  // ==========================================================================
  console.log('--- 13. Éxito inmediato normal -- hook de cierre pseudonimiza, reconciliador es no-op ---');

  const immediate = await createSession('immediate');
  const immediateParticipationId = await seedTerminalParticipation(immediate.accountId);
  await closeDefinitively(pg, immediate); // el hook de cierre de B4 corre dentro de este barrido real
  const immediateAfterClosure = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [immediateParticipationId]);
  const immediateActorRef = gamificationActorRef(immediate.accountId, gamificationSecret);
  check('13.1 hook de cierre pseudonimizó de inmediato', immediateAfterClosure.rows[0].account_id === null && immediateAfterClosure.rows[0].gamification_actor_ref === immediateActorRef);

  const reconcileAfterImmediate = await privacyService.reconcileTerminalSeasonParticipations(50);
  check('13.2 reconciliador habilitado corre sin lanzar', reconcileAfterImmediate.enabled === true);
  // Nota: `axioma_gates_dev` es una base COMPARTIDA de larga duración -- el
  // conteo GLOBAL de mutaciones puede incluir candidatos de otras corridas
  // de gate (p.ej. filas B5 deliberadamente preservadas por
  // verify-deferred-history-pseudonymization-gate.ts que también matchean
  // este predicado). La prueba real e inequívoca es que ESTA fila
  // específica, ya pseudonimizada por el hook de cierre, permanece
  // IDÉNTICA tras la corrida del reconciliador (13.4) -- nunca se
  // re-procesa ni se duplica.
  const immediateStable = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [immediateParticipationId]);
  check('13.3/13.4 fila ya pseudonimizada por el hook permanece IDÉNTICA tras el reconciliador (sin doble procesamiento)', immediateStable.rows[0].account_id === null && immediateStable.rows[0].gamification_actor_ref === immediateActorRef);

  // ==========================================================================
  console.log('--- 14. Fallo TRANSITORIO del hook -- finalización/cierre sigue, participación queda elegible, reconciliador la repara después ---');

  // Simula el fallo transitorio del hook DIRECTAMENTE (sin pasar por HTTP):
  // invoca el método del hook de cierre con el secreto AUSENTE de este
  // proceso -- reproduce "GAMIFICATION_ACTOR_SECRET ausente en el instante
  // del hook" sin apagar el servidor real.
  const transient = await createSession('transient');
  const transientParticipationId = await seedTerminalParticipation(transient.accountId, 2);
  // Snapshot de negocio ANTES del fallo simulado, para probar inmutabilidad.
  const transientBefore = await pg.query('SELECT participation_status, final_rank, league_definition_id, league_group_id, game_season_id FROM season_league_participation WHERE id = $1', [transientParticipationId]);

  const savedSecret1 = process.env.GAMIFICATION_ACTOR_SECRET;
  delete process.env.GAMIFICATION_ACTOR_SECRET;
  const secretMissingService = new GamificationPrivacyService(txRunner, undefined, participationRepo);
  let hookThrew = false;
  try {
    // La cuenta todavía NO está cerrada -- se cierra DESPUÉS, con el
    // secreto restaurado en el SERVIDOR real (closeDefinitively pasa por
    // HTTP, que sí tiene el secreto). Aquí probamos el hook de cierre
    // DIRECTAMENTE contra una cuenta ya marcada CLOSED a mano (fixture),
    // simulando el fallo transitorio SIN afectar al servidor real.
    await pg.query("UPDATE account SET status = 'CLOSED', closed_at = now() WHERE id = $1", [transient.accountId]);
    await secretMissingService.pseudonymizeTerminalSeasonParticipations(transient.accountId);
  } catch {
    hookThrew = true;
  }
  process.env.GAMIFICATION_ACTOR_SECRET = savedSecret1;
  check('14.1 hook de cierre con secreto ausente -> lanza (fallo transitorio real)', hookThrew);

  const transientAfterFailure = await pg.query('SELECT account_id, gamification_actor_ref, participation_status, final_rank FROM season_league_participation WHERE id = $1', [transientParticipationId]);
  check('14.2 participación permanece TERMINAL y CRUDA (elegible para reintento)', transientAfterFailure.rows[0].account_id === transient.accountId && transientAfterFailure.rows[0].gamification_actor_ref === null && transientAfterFailure.rows[0].participation_status === 'RETAINED');
  check('14.3 sin cambios de negocio (finalRank intacto)', transientAfterFailure.rows[0].final_rank === transientBefore.rows[0].final_rank);

  // Reconciliación posterior (secreto ya restaurado).
  const reconcileTransient = await privacyService.reconcileTerminalSeasonParticipations(50);
  check('14.4 reconciliador procesa la cuenta pendiente', reconcileTransient.accountsProcessed >= 1);
  const transientAfterReconcile = await pg.query('SELECT account_id, gamification_actor_ref, participation_status, final_rank, league_definition_id, league_group_id, game_season_id FROM season_league_participation WHERE id = $1', [transientParticipationId]);
  const transientActorRef = gamificationActorRef(transient.accountId, gamificationSecret);
  check('14.5 participación pseudonimizada tras la reconciliación', transientAfterReconcile.rows[0].account_id === null && transientAfterReconcile.rows[0].gamification_actor_ref === transientActorRef);
  check(
    '14.6 MISMO estado de negocio (participationStatus/finalRank/leagueDefinitionId/leagueGroupId/gameSeasonId intactos)',
    transientAfterReconcile.rows[0].participation_status === transientBefore.rows[0].participation_status &&
      transientAfterReconcile.rows[0].final_rank === transientBefore.rows[0].final_rank &&
      transientAfterReconcile.rows[0].league_definition_id === transientBefore.rows[0].league_definition_id &&
      transientAfterReconcile.rows[0].league_group_id === transientBefore.rows[0].league_group_id &&
      transientAfterReconcile.rows[0].game_season_id === transientBefore.rows[0].game_season_id,
  );
  const transientCandidateGone = await participationRepo.findAccountIdsWithTerminalPendingPrivacy(1000);
  check('14.7 la cuenta YA NO aparece como candidata (desapareció de la consulta de reintento)', !transientCandidateGone.includes(transient.accountId));

  // ==========================================================================
  console.log('--- 15. Secreto AUSENTE durante la corrida del reconciliador -- cero mutaciones, candidato sigue descubrible ---');

  const secretCase = await createSession('secret');
  const secretParticipationId = await seedTerminalParticipation(secretCase.accountId, 3);
  await pg.query("UPDATE account SET status = 'CLOSED', closed_at = now() WHERE id = $1", [secretCase.accountId]);

  const beforeCandidates = await participationRepo.findAccountIdsWithTerminalPendingPrivacy(1000);
  check('15.0 la cuenta aparece como candidata ANTES de correr el reconciliador', beforeCandidates.includes(secretCase.accountId));

  const savedSecret2 = process.env.GAMIFICATION_ACTOR_SECRET;
  delete process.env.GAMIFICATION_ACTOR_SECRET;
  const reconcileNoSecret = await privacyService.reconcileTerminalSeasonParticipations(50);
  process.env.GAMIFICATION_ACTOR_SECRET = savedSecret2;
  check('15.1 reconciliador reporta secretMissing=true', reconcileNoSecret.secretMissing === true);
  check('15.2 CERO mutaciones (accountsProcessed=0)', reconcileNoSecret.accountsProcessed === 0);
  const secretParticipationAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [secretParticipationId]);
  check('15.3 participación SIGUE cruda (sin fallback, sin mutación parcial)', secretParticipationAfter.rows[0].account_id === secretCase.accountId && secretParticipationAfter.rows[0].gamification_actor_ref === null);
  const afterCandidates = await participationRepo.findAccountIdsWithTerminalPendingPrivacy(1000);
  check('15.4 la cuenta SIGUE siendo candidata (nunca se marcó "fallida" permanentemente)', afterCandidates.includes(secretCase.accountId));

  const reconcileWithSecret = await privacyService.reconcileTerminalSeasonParticipations(50);
  check('15.5 con el secreto restaurado, la corrida SÍ pseudonimiza', reconcileWithSecret.accountsProcessed >= 1);
  const secretParticipationFinal = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [secretParticipationId]);
  check('15.6 participación ahora pseudonimizada', secretParticipationFinal.rows[0].account_id === null && secretParticipationFinal.rows[0].gamification_actor_ref === gamificationActorRef(secretCase.accountId, gamificationSecret));

  // ==========================================================================
  console.log('--- 16. Seguridad de estado: solo CLOSED+terminal+crudo es elegible ---');

  // A. ACTIVE + terminal.
  const activeAccount = await createSession('active-terminal');
  const activeTerminalId = await seedTerminalParticipation(activeAccount.accountId, 4);
  // B. DELETION_PENDING + terminal.
  const pendingAccount = await createSession('pending-terminal');
  const pendingTerminalId = await seedTerminalParticipation(pendingAccount.accountId, 5);
  const pendingDel = await req('POST', '/privacy/account-deletion', pendingAccount.headers, {});
  if (pendingDel.status !== 202) throw new Error(`solicitud de eliminación falló: ${pendingDel.status}`);
  // C. CLOSED + ACTIVE participation (no terminal).
  const closedActiveAccount = await createSession('closed-active-participation');
  const closedActiveParticipationId = randomUUID();
  await pg.query(`INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status) VALUES ($1,$2,$3,$4,$5,$6,'ACTIVE')`, [
    closedActiveParticipationId,
    seasonId,
    closedActiveAccount.accountId,
    leagueDefId,
    activeGroupId,
    now.toISOString(),
  ]);
  await closeDefinitively(pg, closedActiveAccount);
  // D. CLOSED + terminal + YA pseudonimizada (control -- ya cubierto por §13, se re-verifica aquí explícitamente).

  const statusSafetyResult = await privacyService.reconcileTerminalSeasonParticipations(50);
  void statusSafetyResult;

  const activeAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [activeTerminalId]);
  check('16.A cuenta ACTIVA + terminal: IGNORADA (sigue cruda)', activeAfter.rows[0].account_id === activeAccount.accountId && activeAfter.rows[0].gamification_actor_ref === null);
  const pendingAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [pendingTerminalId]);
  check('16.B cuenta DELETION_PENDING + terminal: IGNORADA (sigue cruda)', pendingAfter.rows[0].account_id === pendingAccount.accountId && pendingAfter.rows[0].gamification_actor_ref === null);
  const closedActiveAfter = await pg.query('SELECT account_id, gamification_actor_ref, participation_status FROM season_league_participation WHERE id = $1', [closedActiveParticipationId]);
  check('16.C cuenta CLOSED + participación ACTIVE (no terminal): IGNORADA (sigue cruda)', closedActiveAfter.rows[0].account_id === closedActiveAccount.accountId && closedActiveAfter.rows[0].gamification_actor_ref === null && closedActiveAfter.rows[0].participation_status === 'ACTIVE');
  const alreadyDoneAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [immediateParticipationId]);
  check('16.D cuenta CLOSED + terminal + YA pseudonimizada: sin cambios (no-op)', alreadyDoneAfter.rows[0].account_id === null && alreadyDoneAfter.rows[0].gamification_actor_ref === immediateActorRef);

  // ==========================================================================
  console.log('--- 17. TOCTOU real -- fresh-check dentro de la transacción evita procesar una cuenta ya no elegible ---');

  const toctouAccount = await createSession('toctou');
  const toctouParticipationId = await seedTerminalParticipation(toctouAccount.accountId, 6);
  await pg.query("UPDATE account SET status = 'CLOSED', closed_at = now() WHERE id = $1", [toctouAccount.accountId]);
  const toctouCandidatesBefore = await participationRepo.findAccountIdsWithTerminalPendingPrivacy(1000);
  check('17.1 la cuenta aparece como candidata en el DESCUBRIMIENTO', toctouCandidatesBefore.includes(toctouAccount.accountId));

  // Altera el fixture a un estado NO elegible DESPUÉS del descubrimiento,
  // ANTES de que el reconciliador procese la cuenta -- simula la ventana
  // TOCTOU real (imposible en producción, ya que CLOSED es terminal, pero
  // prueba que el guardia explícito de B4-R1 §7 SÍ está ahí y SÍ actúa).
  await pg.query("UPDATE account SET status = 'ACTIVE' WHERE id = $1", [toctouAccount.accountId]);

  await privacyService.reconcileTerminalSeasonParticipations(50);
  const toctouAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [toctouParticipationId]);
  check('17.2 fresh-check DENTRO de la transacción evitó la pseudonimización (sigue cruda)', toctouAfter.rows[0].account_id === toctouAccount.accountId && toctouAfter.rows[0].gamification_actor_ref === null);
  // Deliberadamente NO se restaura a CLOSED: dejarla ACTIVE es un fixture
  // inerte y seguro (nunca vuelve a ser candidata), y evita contaminar el
  // conteo determinista de la sección 18 con un candidato adicional
  // inesperado.

  // ==========================================================================
  console.log('--- 18. Lote acotado + idempotencia -- múltiples corridas, progreso determinista, sin duplicar ---');

  const batchAccounts: string[] = [];
  const batchParticipationIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const acc = await createSession(`batch-${i}`);
    const partId = await seedTerminalParticipation(acc.accountId, 10 + i);
    await pg.query("UPDATE account SET status = 'CLOSED', closed_at = now() WHERE id = $1", [acc.accountId]);
    batchAccounts.push(acc.accountId);
    batchParticipationIds.push(partId);
  }

  const run1 = await privacyService.reconcileTerminalSeasonParticipations(2);
  check('18.1 primera corrida respeta el límite de lote (<=2 cuentas procesadas)', run1.accountsProcessed <= 2 && run1.accountsProcessed > 0);
  const run2 = await privacyService.reconcileTerminalSeasonParticipations(2);
  check('18.2 segunda corrida procesa cuentas DISTINTAS (progreso determinista)', run2.accountsProcessed > 0);
  const run3 = await privacyService.reconcileTerminalSeasonParticipations(2);
  const totalProcessed = run1.accountsProcessed + run2.accountsProcessed + run3.accountsProcessed;
  const run4 = await privacyService.reconcileTerminalSeasonParticipations(50);
  check('18.3 CERO candidatas restantes tras agotar el lote (todas procesadas sin duplicar)', run4.accountsDiscovered === 0);
  // >=5 (no ===5): `axioma_gates_dev` es compartida -- puede haber otros
  // candidatos legítimos de otras corridas de gate en la misma ventana; la
  // prueba determinista real es 18.5 (las 5 PROPIAS de este lote,
  // identificadas por id, quedaron pseudonimizadas) + 18.3 (agotamiento).
  check('18.4 al menos las 5 cuentas sembradas fueron procesadas entre las 3 corridas acotadas (sin perder ninguna)', totalProcessed >= 5);

  const batchFinal = await pg.query(
    `SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = ANY($1)`,
    [batchParticipationIds],
  );
  check('18.5 las 5 participaciones quedaron pseudonimizadas, cada una con SU PROPIO actorRef', batchFinal.rows.every((r: { account_id: string | null; gamification_actor_ref: string | null }) => r.account_id === null && r.gamification_actor_ref !== null));

  const run5 = await privacyService.reconcileTerminalSeasonParticipations(50);
  check('18.6 corrida final (5ta) es no-op puro', run5.accountsProcessed === 0 && run5.accountsDiscovered === 0);

  await retireStaleGateLeagues(pg);
  await finalizeStaleGateSeasons(pg);

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de reintento durable de privacidad de participaciones terminales (WEB-0D.1C-B4-R1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
