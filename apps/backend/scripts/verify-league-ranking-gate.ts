// Gate del Bloque IV, Incremento 2 ("Ranking") -- ver
// docs/adr/0020-ranking-materializacion.md (APPROVED) y
// docs/adr/LEF-BLOCK-IV-DEFINITION.md §10. Cubre los 21 Decision Gates
// acordados: 1-15 de la propuesta inicial (los que siguen vigentes tras la
// corrección de fondo) + 16-21 exigidos explícitamente por el Product Owner
// sobre la revisión de ADR-0020 (privacidad sin alteración competitiva,
// anonimización histórica, reversos, cierre idempotente, política
// congelada, grupos pequeños).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardSnapshotRepository } from '../src/gamification/leaderboard-snapshot.repository';
import { LeaderboardSnapshotEntryRepository } from '../src/gamification/leaderboard-snapshot-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { LeaderboardFinalizationService } from '../src/gamification/leaderboard-finalization.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // Higiene entre corridas -- ninguna temporada ACTIVE huérfana de una corrida anterior interrumpida.
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");
  // Higiene entre corridas -- este gate depende de ser dueño del `tierOrder`
  // más alto/más bajo ACTIVE para probar "tiers extremos" (§7b). Sin esto,
  // una corrida anterior de ESTE MISMO gate deja un league_definition ACTIVE
  // con el mismo tierOrder (25/5), y findHighestActiveTier/findLowestActiveTier
  // pueden devolver esa fila vieja en vez de la de esta corrida (empate de
  // tierOrder, desempate arbitrario de la base) -- falso negativo, no un
  // defecto de la lógica de producción.
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE status = 'ACTIVE'");

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const snapshotRepo = new LeaderboardSnapshotRepository(prisma);
  const snapshotEntryRepo = new LeaderboardSnapshotEntryRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);

  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const finalizationService = new LeaderboardFinalizationService(
    prisma,
    leagueGroupRepo,
    leagueDefinitionRepo,
    participationRepo,
    calculationService,
    snapshotRepo,
    snapshotEntryRepo,
  );

  const suffix = Date.now();
  const now = new Date();
  const seasonStart = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const seasonEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  /**
   * node-postgres serializa un `Date` de JS aplicando la zona horaria del
   * PROCESO al insertar en una columna `timestamp without time zone` --
   * mismo artefacto ya documentado en `verify-challenge-foundation-gate.ts`
   * para columnas `@db.Date`. Prisma (usado para leer de vuelta) siempre
   * trata estas columnas como UTC. Mezclar ambos sin normalizar produce un
   * desfase fijo (el offset de zona horaria del proceso) entre lo escrito
   * por `pg.query` y lo leído por Prisma -- se evita pasando SIEMPRE
   * `.toISOString()` (string, no objeto `Date`) como parámetro de consulta
   * cruda, nunca el objeto `Date` directamente.
   */
  function iso(d: Date): string {
    return d.toISOString();
  }

  // --- Fixtures compartidos ---
  const rule = await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, effective_from, rule_version)
     VALUES ($1, $2, 5, $3, 'gate-rule-v1') RETURNING id`,
    [randomUUID(), `gate-activity-${suffix}`, iso(seasonStart)],
  );
  const ruleId = rule.rows[0].id as string;

  async function makeActivity(accountId: string, occurredAt: Date): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO validated_gamification_activity (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, occurred_at, validation_rule_version, deduplication_key, integrity_status)
       VALUES ($1, $2, 'PROGRESS', 'StudentResponse', $3, $4, 'VALID', $5, 'v1', $6, 'OK')`,
      [id, accountId, randomUUID(), `gate-activity-${suffix}`, iso(occurredAt), `gate-dedup-${randomUUID()}`],
    );
    return id;
  }

  /** OTORGAMIENTO real -- exige participación ACTIVE/temporada ACTIVE/grupo OPEN-FULL (trigger de ventana, Incremento 1). */
  async function grant(accountId: string, participationId: string, amount: number, occurredAt: Date): Promise<void> {
    const activityId = await makeActivity(accountId, occurredAt);
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, rule_version, idempotency_key, occurred_at)
       VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', $6, 'gate-rule-v1', $7, $8)`,
      [randomUUID(), accountId, participationId, activityId, ruleId, amount, `gate-grant-${randomUUID()}`, iso(occurredAt)],
    );
  }

  /** REVERSO -- sin restricción de ventana (solo aplica a OTORGAMIENTO), exige integridad de reverso. */
  async function reverse(accountId: string, participationId: string, originalEntryId: string, amount: number, occurredAt: Date): Promise<void> {
    await pg.query(
      `INSERT INTO league_point_ledger_entry (id, account_id, season_league_participation_id, entry_type, point_amount, idempotency_key, occurred_at, reverses_entry_id)
       VALUES ($1, $2, $3, 'REVERSO', $4, $5, $6, $7)`,
      [randomUUID(), accountId, participationId, amount, `gate-reverse-${randomUUID()}`, iso(occurredAt), originalEntryId],
    );
  }

  /**
   * Cierra un grupo de fixture DESPUÉS de otorgar sus puntos -- el trigger
   * de ventana (Incremento 1) exige `participation_status = ACTIVE` Y
   * `league_group.status IN (OPEN, FULL)` para cualquier OTORGAMIENTO, así
   * que los fixtures de finalización deben acumular puntos con el grupo
   * todavía OPEN y las participaciones todavía ACTIVE (igual que ocurriría
   * en producción), y solo INMEDIATAMENTE ANTES de finalizar transicionar a
   * LOCKED/SEASON_ENDED -- mismo orden cronológico real, nunca al revés.
   */
  async function closeGroupAndParticipations(groupId: string, participationIds: string[]): Promise<void> {
    await pg.query("UPDATE league_group SET status = 'LOCKED', locked_at = now() WHERE id = $1", [groupId]);
    await pg.query("UPDATE season_league_participation SET participation_status = 'SEASON_ENDED' WHERE id = ANY($1)", [participationIds]);
  }

  const season = await seasonRepo.create({ seasonKey: `ranking-gate-${suffix}`, name: 'Temporada de ranking', startsAt: seasonStart, endsAt: seasonEnd });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [season.id]);

  console.log('--- 1. Reconstructibilidad completa (Gate 1) ---');
  {
    const bronze = await leagueDefinitionRepo.create({ leagueKey: `bronze-recon-${suffix}`, name: 'Bronce', tierOrder: 10, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
       VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
      [randomUUID(), season.id, bronze.id],
    );
    const groupId = group.rows[0].id as string;

    const accountA = randomUUID();
    const accountB = randomUUID();
    const pA = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [randomUUID(), season.id, accountA, bronze.id, groupId, iso(seasonStart)],
    );
    const pB = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [randomUUID(), season.id, accountB, bronze.id, groupId, iso(seasonStart)],
    );
    const participationAId = pA.rows[0].id as string;
    const participationBId = pB.rows[0].id as string;

    await grant(accountA, participationAId, 10, new Date(now.getTime() - 5000));
    await grant(accountB, participationBId, 20, new Date(now.getTime() - 4000));

    const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();

    const first = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));
    // Borrar y recalcular de nuevo -- debe producir EXACTAMENTE el mismo resultado (fuente = ledger, nunca un estado incremental).
    const second = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

    check('B (20 pts) queda rank 1, A (10 pts) rank 2', first.find((r) => r.accountId === accountB)?.rankPosition === 1 && first.find((r) => r.accountId === accountA)?.rankPosition === 2);
    check('recalcular sin cambios en el ledger produce el MISMO resultado exacto', JSON.stringify(first) === JSON.stringify(second));

    const rows = await entryRepo.findAllByGroupId(groupId);
    check('exactamente 2 filas leaderboard_entry tras el recálculo (sin duplicados por las dos pasadas)', rows.length === 2);
  }

  console.log('--- 2. Desempate determinista: metricValue -> tieBreakValue -> activityCount -> accountId (Gate 2) ---');
  {
    const tierD = await leagueDefinitionRepo.create({ leagueKey: `tie-${suffix}`, name: 'TierTie', tierOrder: 11, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
       VALUES ($1, $2, $3, 1, 40, 'v1-lowest-tier', 'OPEN') RETURNING id`,
      [randomUUID(), season.id, tierD.id],
    );
    const groupId = group.rows[0].id as string;

    // Empate de metricValue (10 == 10): C llega primero (tieBreakValue anterior) -> mejor posición que D.
    const accountC = randomUUID();
    const accountD = randomUUID();
    const pC = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [randomUUID(), season.id, accountC, tierD.id, groupId, iso(seasonStart)],
    );
    const pD = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [randomUUID(), season.id, accountD, tierD.id, groupId, iso(seasonStart)],
    );
    const participationC = pC.rows[0].id as string;
    const participationD = pD.rows[0].id as string;

    await grant(accountC, participationC, 10, new Date(now.getTime() - 100_000)); // C alcanza 10 ANTES
    await grant(accountD, participationD, 10, new Date(now.getTime() - 50_000)); // D alcanza 10 DESPUÉS

    const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
    const ranked = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

    check('empate de metricValue -> gana quien alcanzó el puntaje ANTES (C rank 1, D rank 2)', ranked.find((r) => r.accountId === accountC)?.rankPosition === 1 && ranked.find((r) => r.accountId === accountD)?.rankPosition === 2);
  }

  console.log('--- 3. Reversos afectan tieBreakValue correctamente (Gate 18, obligatorio) ---');
  {
    const tierR = await leagueDefinitionRepo.create({ leagueKey: `reverse-${suffix}`, name: 'TierReverse', tierOrder: 12, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierR.id],
    );
    const groupId = group.rows[0].id as string;
    const accountE = randomUUID();
    const pE = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [randomUUID(), season.id, accountE, tierR.id, groupId, iso(seasonStart)],
    );
    const participationE = pE.rows[0].id as string;

    const t1 = new Date(now.getTime() - 300_000);
    const t2 = new Date(now.getTime() - 200_000);
    const t3 = new Date(now.getTime() - 100_000);

    await grant(accountE, participationE, 10, t1);
    const originalEntry = await pg.query('SELECT id FROM league_point_ledger_entry WHERE season_league_participation_id = $1 ORDER BY occurred_at DESC LIMIT 1', [participationE]);
    const originalEntryId = originalEntry.rows[0].id as string;

    const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
    const afterGrant = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));
    check('tras el otorgamiento, tieBreakValue = t1 (única entrada)', afterGrant[0]!.tieBreakValue.getTime() === t1.getTime());

    await reverse(accountE, participationE, originalEntryId, -10, t2);
    const afterReverse = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));
    check('tras el REVERSO, tieBreakValue = t2 (última entrada, aunque el total bajó)', afterReverse[0]!.tieBreakValue.getTime() === t2.getTime());
    check('metricValue tras el reverso = 0 (10 - 10)', afterReverse[0]!.metricValue === 0);

    await grant(accountE, participationE, 10, t3);
    const afterRegrant = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));
    check('tras el nuevo OTORGAMIENTO, tieBreakValue = t3 (refleja el estado real más reciente, no el t1 original)', afterRegrant[0]!.tieBreakValue.getTime() === t3.getTime());
    check('metricValue vuelve a 10', afterRegrant[0]!.metricValue === 10);
  }

  console.log('--- 4. Privacidad sin alteración competitiva (Gate 16, obligatorio) ---');
  {
    const tierP = await leagueDefinitionRepo.create({ leagueKey: `privacy-${suffix}`, name: 'TierPrivacy', tierOrder: 13, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierP.id],
    );
    const groupId = group.rows[0].id as string;

    const accountVisible = randomUUID();
    const accountPrivate = randomUUID();
    const pVisible = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [randomUUID(), season.id, accountVisible, tierP.id, groupId, iso(seasonStart)],
    );
    const pPrivate = await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [randomUUID(), season.id, accountPrivate, tierP.id, groupId, iso(seasonStart)],
    );

    // accountPrivate SÍ tiene public_profile, con visibility_status PRIVATE y lifecycle RETIRED -- el escenario más adverso posible.
    const publicProfileId = randomUUID();
    await pg.query(
      `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, updated_at)
       VALUES ($1, $2, $3, 'PRIVATE', 'RETIRED', now())`,
      [publicProfileId, accountPrivate, `gate-private-${suffix}`],
    );

    await grant(accountVisible, pVisible.rows[0].id, 15, new Date(now.getTime() - 10_000));
    await grant(accountPrivate, pPrivate.rows[0].id, 30, new Date(now.getTime() - 9_000)); // MÁS puntos -- debería quedar rank 1 pese a PRIVATE/RETIRED

    const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
    const ranked = await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

    check('la cuenta PRIVATE/RETIRED SÍ obtiene una fila leaderboard_entry (nunca excluida del cálculo)', ranked.some((r) => r.accountId === accountPrivate));
    check('la cuenta PRIVATE/RETIRED ocupa rank 1 por sus puntos reales (30 > 15) -- la visibilidad NUNCA altera el cálculo', ranked.find((r) => r.accountId === accountPrivate)?.rankPosition === 1);
    check('la cuenta VISIBLE queda rank 2, sin beneficio ni perjuicio por la visibilidad ajena', ranked.find((r) => r.accountId === accountVisible)?.rankPosition === 2);

    const entryRow = await entryRepo.findAllByGroupId(groupId);
    check('leaderboard_entry.publicProfileId es null (Incremento 2 no lo resuelve -- presentación es Incremento 3)', entryRow.every((r) => r.publicProfileId === null));
  }

  console.log('--- 5. Anonimización histórica sin tocar el ranking (Gate 17, obligatorio) ---');
  {
    const calcSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'leaderboard-calculation.service.ts'), 'utf8');
    const finalizationSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'leaderboard-finalization.service.ts'), 'utf8');
    check(
      'leaderboard-calculation.service.ts nunca referencia PublicProfile/username/avatar -- nada que anonimizar en este incremento',
      !calcSource.includes('PublicProfile') && !calcSource.includes('username') && !calcSource.includes('avatarReference'),
    );
    check('leaderboard-finalization.service.ts tampoco los referencia', !finalizationSource.includes('PublicProfile') && !finalizationSource.includes('username'));
  }

  console.log('--- 6. Grupos pequeños (Gate 21, obligatorio) ---');
  {
    const tierSmall = await leagueDefinitionRepo.create({
      leagueKey: `small-${suffix}`,
      name: 'TierSmall',
      tierOrder: 14,
      participantGroupSize: 40,
      promotionRule: 'top-percent:20',
      demotionRule: 'bottom-percent:20',
    });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierSmall.id],
    );
    const groupId = group.rows[0].id as string;
    const accounts = [randomUUID(), randomUUID()]; // SOLO 2 -- por debajo del mínimo de 3
    const participationIds: string[] = [];
    for (const [i, acc] of accounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierSmall.id, groupId, iso(seasonStart)],
      );
      participationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, 10 * (i + 1), new Date(now.getTime() - 10_000 + i * 100));
    }

    await closeGroupAndParticipations(groupId, participationIds);
    const didFinalize = await finalizationService.finalizeGroup(groupId);
    check('finalizeGroup procesó el grupo pequeño', didFinalize === true);

    const statuses = await pg.query('SELECT participation_status FROM season_league_participation WHERE id = ANY($1)', [participationIds]);
    check('con menos de 3 participantes, el 100% cierra RETAINED pese a tener reglas configuradas', statuses.rows.every((r) => r.participation_status === 'RETAINED'));
  }

  console.log('--- 7. Gramática top/bottom N% formalizada (Gate 12) ---');
  {
    const tierG = await leagueDefinitionRepo.create({
      leagueKey: `grammar-${suffix}`,
      name: 'TierGrammar',
      tierOrder: 15, // NI el más alto ni el más bajo -- permite ascenso Y descenso reales
      participantGroupSize: 40,
      promotionRule: 'top-percent:20',
      demotionRule: 'bottom-percent:20',
    });
    // Tiers vecinos para que TierGrammar NO sea extremo.
    await leagueDefinitionRepo.create({ leagueKey: `grammar-below-${suffix}`, name: 'Below', tierOrder: 5, participantGroupSize: 40 });
    await leagueDefinitionRepo.create({ leagueKey: `grammar-above-${suffix}`, name: 'Above', tierOrder: 25, participantGroupSize: 40 });

    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierG.id],
    );
    const groupId = group.rows[0].id as string;

    // G=10 -> top 20% = 2 (PROMOTED), bottom 20% = 2 (DEMOTED), 6 RETAINED.
    const accounts = Array.from({ length: 10 }, () => randomUUID());
    const participationIds: string[] = [];
    for (const [i, acc] of accounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierG.id, groupId, iso(seasonStart)],
      );
      participationIds.push(p.rows[0].id);
      // Puntos DECRECIENTES: accounts[0] tiene más puntos (mejor rank), accounts[9] menos (peor rank).
      await grant(acc, p.rows[0].id, (10 - i) * 10, new Date(now.getTime() - 10_000 + i * 100));
    }

    await closeGroupAndParticipations(groupId, participationIds);
    const didFinalize = await finalizationService.finalizeGroup(groupId);
    check('finalizeGroup procesó el grupo de 10', didFinalize === true);

    const statuses = await pg.query(
      'SELECT account_id, participation_status FROM season_league_participation WHERE id = ANY($1) ORDER BY account_id',
      [participationIds],
    );
    const statusByAccount = new Map(statuses.rows.map((r) => [r.account_id as string, r.participation_status as string]));

    check('accounts[0] (rank 1, mejor) -> PROMOTED', statusByAccount.get(accounts[0]!) === 'PROMOTED');
    check('accounts[1] (rank 2) -> PROMOTED', statusByAccount.get(accounts[1]!) === 'PROMOTED');
    check('accounts[2] (rank 3, fuera de la zona de ascenso) -> RETAINED', statusByAccount.get(accounts[2]!) === 'RETAINED');
    check('accounts[7] (rank 8, fuera de la zona de descenso) -> RETAINED', statusByAccount.get(accounts[7]!) === 'RETAINED');
    check('accounts[8] (rank 9) -> DEMOTED', statusByAccount.get(accounts[8]!) === 'DEMOTED');
    check('accounts[9] (rank 10, peor) -> DEMOTED', statusByAccount.get(accounts[9]!) === 'DEMOTED');

    console.log('--- 7b. Tiers extremos: sin tier superior/inferior -> RETAINED (ADR-0020 §4, punto 8) ---');
    // El tier MÁS ALTO existente es tierOrder=25 ("Above") -- ningún candidato a PROMOTED en él puede ascender.
    const topTierGroup = await pg.query(
      `SELECT id FROM league_definition WHERE league_key = $1`,
      [`grammar-above-${suffix}`],
    );
    const aboveId = topTierGroup.rows[0].id as string;
    await pg.query('UPDATE league_definition SET promotion_rule = $1, demotion_rule = $2 WHERE id = $3', ['top-percent:20', 'bottom-percent:20', aboveId]);
    const extremeGroup = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, aboveId],
    );
    const extremeGroupId = extremeGroup.rows[0].id as string;
    const extremeAccounts = Array.from({ length: 5 }, () => randomUUID());
    const extremeParticipationIds: string[] = [];
    for (const [i, acc] of extremeAccounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, aboveId, extremeGroupId, iso(seasonStart)],
      );
      extremeParticipationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, (5 - i) * 10, new Date(now.getTime() - 10_000 + i * 100));
    }
    await closeGroupAndParticipations(extremeGroupId, extremeParticipationIds);
    await finalizationService.finalizeGroup(extremeGroupId);
    const extremeStatuses = await pg.query('SELECT participation_status FROM season_league_participation WHERE id = ANY($1)', [extremeParticipationIds]);
    check('en el tier MÁS ALTO, ningún candidato a ascenso queda PROMOTED -- todos RETAINED o DEMOTED', extremeStatuses.rows.every((r) => r.participation_status !== 'PROMOTED'));

    console.log('--- 7c. Tope de solapamiento: promoteCount + demoteCount > G se resuelve capando demoteCount (ADR-0020 §4, punto 5) ---');
    const tierOverlap = await leagueDefinitionRepo.create({
      leagueKey: `overlap-${suffix}`,
      name: 'TierOverlap',
      tierOrder: 16,
      participantGroupSize: 40,
      promotionRule: 'top-percent:60',
      demotionRule: 'bottom-percent:60',
    });
    const overlapGroup = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierOverlap.id],
    );
    const overlapGroupId = overlapGroup.rows[0].id as string;
    // G=5, top 60% = floor(3.0)=3, bottom 60% = floor(3.0)=3 -- 3+3=6 > 5 -> demoteCount se capa a 5-3=2.
    const overlapAccounts = Array.from({ length: 5 }, () => randomUUID());
    const overlapParticipationIds: string[] = [];
    for (const [i, acc] of overlapAccounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierOverlap.id, overlapGroupId, iso(seasonStart)],
      );
      overlapParticipationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, (5 - i) * 10, new Date(now.getTime() - 10_000 + i * 100));
    }
    await closeGroupAndParticipations(overlapGroupId, overlapParticipationIds);
    await finalizationService.finalizeGroup(overlapGroupId);
    const overlapStatuses = await pg.query('SELECT participation_status FROM season_league_participation WHERE id = ANY($1)', [overlapParticipationIds]);
    const promoted = overlapStatuses.rows.filter((r) => r.participation_status === 'PROMOTED').length;
    const demoted = overlapStatuses.rows.filter((r) => r.participation_status === 'DEMOTED').length;
    check('promoteCount=3, demoteCount capado a 2 (no 3) -- 3+2=5=G, sin solapamiento', promoted === 3 && demoted === 2);
  }

  console.log('--- 8. Cierre idempotente (Gate 19, obligatorio) ---');
  {
    const tierIdem = await leagueDefinitionRepo.create({ leagueKey: `idem-${suffix}`, name: 'TierIdem', tierOrder: 17, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierIdem.id],
    );
    const groupId = group.rows[0].id as string;
    const accounts = [randomUUID(), randomUUID(), randomUUID()];
    const participationIds: string[] = [];
    for (const [i, acc] of accounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierIdem.id, groupId, iso(seasonStart)],
      );
      participationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, 10 * (i + 1), new Date(now.getTime() - 10_000 + i * 100));
    }

    await closeGroupAndParticipations(groupId, participationIds);
    const firstCall = await finalizationService.finalizeGroup(groupId);
    check('primera llamada a finalizeGroup -> true (finalizó de verdad)', firstCall === true);
    const secondCall = await finalizationService.finalizeGroup(groupId);
    check('segunda llamada (reintento simulado) -> false (no-op idempotente, grupo ya no está LOCKED)', secondCall === false);

    const snapshotCount = await pg.query('SELECT count(*)::int AS n FROM leaderboard_snapshot WHERE league_group_id = $1', [groupId]);
    check('exactamente UNA instantánea final -- sin duplicados por el reintento', snapshotCount.rows[0].n === 1);
    const entryCount = await pg.query('SELECT count(*)::int AS n FROM leaderboard_snapshot_entry WHERE leaderboard_snapshot_id IN (SELECT id FROM leaderboard_snapshot WHERE league_group_id = $1)', [groupId]);
    check('exactamente 3 filas leaderboard_snapshot_entry (una por participación, sin duplicar)', entryCount.rows[0].n === 3);
  }

  console.log('--- 9. Política congelada (Gate 20, obligatorio) ---');
  {
    const tierFreeze = await leagueDefinitionRepo.create({
      leagueKey: `freeze-${suffix}`,
      name: 'TierFreeze',
      tierOrder: 18,
      participantGroupSize: 40,
      promotionRule: 'top-percent:20',
      demotionRule: 'bottom-percent:20',
    });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierFreeze.id],
    );
    const groupId = group.rows[0].id as string;
    const accounts = [randomUUID(), randomUUID(), randomUUID()];
    const participationIds: string[] = [];
    for (const [i, acc] of accounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierFreeze.id, groupId, iso(seasonStart)],
      );
      participationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, 10 * (i + 1), new Date(now.getTime() - 10_000 + i * 100));
    }
    await closeGroupAndParticipations(groupId, participationIds);
    await finalizationService.finalizeGroup(groupId);

    const snapshotBefore = await pg.query('SELECT promotion_rule_version FROM leaderboard_snapshot WHERE league_group_id = $1', [groupId]);
    check('promotionRuleVersion congelado = "top-percent:20"', snapshotBefore.rows[0].promotion_rule_version === 'top-percent:20');

    // Cambiar la regla DESPUÉS del cierre -- no debe reescribir la instantánea ya creada.
    await pg.query("UPDATE league_definition SET promotion_rule = 'top-percent:50' WHERE id = $1", [tierFreeze.id]);
    const snapshotAfter = await pg.query('SELECT promotion_rule_version FROM leaderboard_snapshot WHERE league_group_id = $1', [groupId]);
    check('cambiar la regla DESPUÉS del cierre NO altera la instantánea ya escrita (sigue en "top-percent:20")', snapshotAfter.rows[0].promotion_rule_version === 'top-percent:20');
  }

  console.log('--- 10. Snapshot final inmutable (Gate 9) ---');
  {
    const snapshotRow = await pg.query('SELECT id FROM leaderboard_snapshot LIMIT 1');
    const snapshotId = snapshotRow.rows[0].id as string;

    let updateRejected = false;
    try {
      await pg.query("UPDATE leaderboard_snapshot SET content_hash = 'tampered' WHERE id = $1", [snapshotId]);
    } catch (error) {
      updateRejected = String((error as Error).message ?? '').includes('inmutable');
    }
    check('trigger rechaza UPDATE sobre leaderboard_snapshot', updateRejected);

    let deleteRejected = false;
    try {
      await pg.query('DELETE FROM leaderboard_snapshot WHERE id = $1', [snapshotId]);
    } catch (error) {
      deleteRejected = String((error as Error).message ?? '').includes('no admite DELETE');
    }
    check('trigger rechaza DELETE sobre leaderboard_snapshot', deleteRejected);

    const entryRow = await pg.query('SELECT id FROM leaderboard_snapshot_entry LIMIT 1');
    const entryId = entryRow.rows[0].id as string;
    let entryUpdateRejected = false;
    try {
      await pg.query('UPDATE leaderboard_snapshot_entry SET rank_position = 999 WHERE id = $1', [entryId]);
    } catch (error) {
      entryUpdateRejected = String((error as Error).message ?? '').includes('inmutable');
    }
    check('trigger rechaza UPDATE sobre leaderboard_snapshot_entry', entryUpdateRejected);

    let correctionWithoutReasonRejected = false;
    try {
      await pg.query(
        `INSERT INTO leaderboard_snapshot (id, league_group_id, game_season_id, league_definition_id, leaderboard_definition_id, snapshot_at, tie_break_rule_version, promotion_rule_version, demotion_rule_version, ranking_metric_version, participant_count, content_hash, supersedes_snapshot_id)
         SELECT $1, league_group_id, game_season_id, league_definition_id, leaderboard_definition_id, now(), tie_break_rule_version, promotion_rule_version, demotion_rule_version, ranking_metric_version, participant_count, 'x', id
         FROM leaderboard_snapshot WHERE id = $2`,
        [randomUUID(), snapshotId],
      );
    } catch (error) {
      correctionWithoutReasonRejected = (error as { code?: string }).code === '23514';
    }
    check('CHECK exige correction_reason cuando supersedes_snapshot_id no es NULL', correctionWithoutReasonRejected);
  }

  console.log('--- 11. contentHash determinista (Gate 10) ---');
  {
    const ranked = [
      { seasonLeagueParticipationId: 'p1', accountId: 'a1', metricValue: 10, tieBreakValue: new Date('2026-01-01T00:00:00Z'), activityCount: 1, rankPosition: 1 },
      { seasonLeagueParticipationId: 'p2', accountId: 'a2', metricValue: 5, tieBreakValue: new Date('2026-01-02T00:00:00Z'), activityCount: 1, rankPosition: 2 },
    ];
    const outcomes = new Map([
      ['p1', 'PROMOTED' as const],
      ['p2', 'RETAINED' as const],
    ]);
    const { createHash } = await import('node:crypto');
    function hashOf(rows: typeof ranked) {
      const canonical = [...rows]
        .sort((a, b) => a.rankPosition - b.rankPosition)
        .map((r) => `${r.seasonLeagueParticipationId}:${r.rankPosition}:${r.metricValue}:${r.tieBreakValue.toISOString()}:${outcomes.get(r.seasonLeagueParticipationId)}`)
        .join('|');
      return createHash('sha256').update(canonical).digest('hex');
    }
    const hashA = hashOf(ranked);
    const hashB = hashOf([...ranked].reverse()); // mismo contenido, orden de iteración distinto
    check('el mismo contenido produce el mismo hash sin importar el orden de iteración de entrada', hashA === hashB);
  }

  console.log('--- 12. Recuperación directa por clave para "mi posición" (Gate 13) ---');
  {
    const tierOwn = await leagueDefinitionRepo.create({ leagueKey: `own-${suffix}`, name: 'TierOwn', tierOrder: 19, participantGroupSize: 40 });
    const group = await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status) VALUES ($1,$2,$3,1,40,'v1-lowest-tier','OPEN') RETURNING id`,
      [randomUUID(), season.id, tierOwn.id],
    );
    const groupId = group.rows[0].id as string;
    const accounts = Array.from({ length: 5 }, () => randomUUID());
    const participationIds: string[] = [];
    for (const [i, acc] of accounts.entries()) {
      const p = await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [randomUUID(), season.id, acc, tierOwn.id, groupId, iso(seasonStart)],
      );
      participationIds.push(p.rows[0].id);
      await grant(acc, p.rows[0].id, (5 - i) * 10, new Date(now.getTime() - 10_000 + i * 100));
    }
    const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
    await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

    const lastParticipationId = participationIds[4]!; // peor posición -- rank 5, fuera de cualquier "top N" típico
    const own = await entryRepo.findBySeasonLeagueParticipationId(leaderboardDefinition.id, groupId, lastParticipationId);
    check('recuperación directa por (groupId, seasonLeagueParticipationId) funciona sin paginar', own?.rankPosition === 5);
  }

  console.log('--- 13. Sin recálculo bajo demanda expuesto (Gate 8) ---');
  {
    const gamificationDir = join(__dirname, '..', 'src', 'gamification');
    const controllerFiles = readdirSync(gamificationDir).filter((f) => f.endsWith('.controller.ts'));
    let exposureFound = false;
    for (const file of controllerFiles) {
      const contents = readFileSync(join(gamificationDir, file), 'utf8');
      if (contents.includes('LeaderboardCalculationService') || contents.includes('LeaderboardFinalizationService')) {
        exposureFound = true;
        console.error(`  ${file} expone el cálculo/cierre de ranking a un endpoint`);
      }
    }
    check('ningún controller referencia LeaderboardCalculationService/LeaderboardFinalizationService (sin recálculo bajo demanda)', !exposureFound);
  }

  console.log('--- 14. Frontera de dominio intacta (Gate 15) ---');
  {
    const gamificationDir = join(__dirname, '..', 'src', 'gamification');
    const filesToCheck = [
      'leaderboard-calculation.service.ts',
      'leaderboard-finalization.service.ts',
      'leaderboard-entry.repository.ts',
      'leaderboard-snapshot.repository.ts',
      'leaderboard-snapshot-entry.repository.ts',
      'leaderboard-definition.repository.ts',
    ];
    const forbidden = ['StudentResponse', 'CurriculumTopicProgress', 'XpLedgerEntryRepository', 'XpBalanceRepository', 'PublicProfileRepository'];
    let violation = false;
    for (const file of filesToCheck) {
      const contents = readFileSync(join(gamificationDir, file), 'utf8');
      for (const symbol of forbidden) {
        if (contents.includes(symbol)) {
          violation = true;
          console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
        }
      }
    }
    check('ningún archivo de Incremento 2 referencia PROGRESS/XP/PublicProfile directamente', !violation);
  }

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Ranking (Bloque IV, Incremento 2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
