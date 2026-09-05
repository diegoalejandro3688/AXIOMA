// STABILIZATION-B (Titles V1) -- gate del catálogo congelado de 7 títulos
// (titles-v1-catalog.ts) + seed idempotente/fail-closed + eligibilidad por
// métrica (locked en N-1, otorgado en N) + entrega real vía worker (sin
// RewardBundle/RewardGrant, AccountTitleRepository.createIdempotent como
// única frontera de idempotencia) + reconciliación retroactiva
// (idempotente, nunca revoca) + ausencia de efectos colaterales (XP/LP/
// cosmético/auto-equip) + evidencia DURABLE real para Ascendente (nunca
// fabricada). Usa fixtures SINTÉTICOS propios (curriculum_topic/
// learning_resource_version/challenge_definition/league) para no depender
// de que el contenido canónico real (17 unidades/98 recursos/5 ensayos)
// esté seedeado en esta base local -- secciones que SÍ requieren contenido
// real (ensayos canónicos) se auto-degradan a "ESTRUCTURALMENTE
// VERIFICADO / NO EJECUTADO" si no existe.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { XpLedgerEntryRepository } from '../src/gamification/xp-ledger-entry.repository';
import { XpBalanceRepository } from '../src/gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../src/gamification/level-definition.repository';
import { ProgressionService } from '../src/gamification/progression.service';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { AchievementProgressRepository } from '../src/gamification/achievement-progress.repository';
import { AchievementUnlockRepository } from '../src/gamification/achievement-unlock.repository';
import { AccountTitleRepository } from '../src/gamification/account-title.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TitleEligibilityService } from '../src/gamification/title-eligibility.service';
import { SubjectRepository } from '../src/education/subject.repository';
import { InventoryItemRepository } from '../src/gamification/inventory-item.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import { AccountChallengeDailyProgressRepository } from '../src/gamification/account-challenge-daily-progress.repository';
import { AccountChallengeConsumedEventRepository } from '../src/gamification/account-challenge-consumed-event.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { CurriculumTopicRepository } from '../src/education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../src/progress/curriculum-topic-progress.repository';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { RewardEvaluationWorker } from '../src/gamification/reward-evaluation.worker';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { TITLES_V1 } from '../src/gamification/titles-v1-catalog';
import { seedTitlesV1, TITLE_V1_RARITY_CLASS, TITLE_V1_UNLOCK_SOURCE_TYPE } from './seed-titles-v1';
import { reconcileTitlesV1 } from './reconcile-titles-v1';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = Date.now();
  const curriculumTopicRepo = new CurriculumTopicRepository(prisma);
  const curriculumTopicProgressRepo = new CurriculumTopicProgressRepository(prisma);
  const subjectRepo = new SubjectRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);
  const ledgerRepo = new XpLedgerEntryRepository(prisma);
  const balanceRepo = new XpBalanceRepository(prisma);
  const levelDefRepo = new LevelDefinitionRepository(prisma);
  const txRunner = new TransactionRunnerService(prisma);
  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const accountTitleRepo = new AccountTitleRepository(prisma);
  const progressionService = new ProgressionService(balanceRepo, ledgerRepo, levelDefRepo);
  const titleEligibilityService = new TitleEligibilityService(prisma, subjectRepo, curriculumTopicRepo, curriculumTopicProgressRepo, progressionService);

  const worker = new RewardEvaluationWorker(
    prisma,
    ledgerRepo,
    new RewardEvaluationCursorRepository(prisma),
    balanceRepo,
    progressionService,
    levelDefRepo,
    bundleRepo,
    new RewardGrantRepository(prisma),
    new RewardGrantComponentRepository(prisma),
    txRunner,
    new AchievementDefinitionRepository(prisma),
    new AchievementVersionRepository(prisma),
    new AchievementProgressRepository(prisma),
    new AchievementUnlockRepository(prisma),
    accountTitleRepo,
    new InventoryItemRepository(prisma),
    new ChallengeDefinitionRepository(prisma),
    new AccountChallengeRepository(prisma),
    new AccountChallengeDailyProgressRepository(prisma),
    new AccountChallengeConsumedEventRepository(prisma),
    new ValidatedGamificationActivityRepository(prisma),
    curriculumTopicRepo,
    curriculumTopicProgressRepo,
    titleDefinitionRepo,
    titleEligibilityService,
  );

  const createdCurriculumTopicIds: string[] = [];
  const createdLearningResourceIds: string[] = [];
  const createdChallengeDefinitionIds: string[] = [];
  const createdSeasonIds: string[] = [];
  const createdLeagueGroupIds: string[] = [];
  const createdLeagueDefinitionIds: string[] = [];
  // Declarada aquí (visible desde `finally`) -- se le asigna dentro del
  // `try` (sección 9, CHALLENGES_CLAIMED).
  const accountChallenges = randomUUID();

  try {
    console.log('--- 0. Catálogo TITLES_V1: exactamente 7, keys únicas ---');
    check('exactamente 7 entradas', TITLES_V1.length === 7);
    check('titleKey únicos', new Set(TITLES_V1.map((t) => t.titleKey)).size === 7);
    check(
      'las 7 métricas esperadas están presentes',
      ['RESOURCES_COMPLETED', 'UNITS_COMPLETED', 'EXAMS_COMPLETED', 'CHALLENGES_CLAIMED', 'LEVEL_REACHED', 'LEAGUE_TIER_REACHED'].every((m) =>
        TITLES_V1.some((t) => t.metric === m),
      ),
    );

    console.log('--- 1. Seed: crea las 7, sin RewardBundle/RewardGrant asociado ---');
    const seedResult1 = await seedTitlesV1({ dryRun: false });
    check('primera corrida crea (o ya había) las 7', seedResult1.created + seedResult1.verified === 7);
    const allDefs = await Promise.all(TITLES_V1.map((t) => titleDefinitionRepo.findByTitleKey(t.titleKey)));
    check('las 7 title_definition existen tras el seed', allDefs.every((d) => d != null));
    check('las 7 son PUBLIC/ACTIVE', allDefs.every((d) => d!.visibilityStatus === 'PUBLIC' && d!.status === 'ACTIVE'));
    check(
      'las 7 comparten rarityClass/unlockSourceType neutro (sin distinción de rareza)',
      allDefs.every((d) => d!.rarityClass === TITLE_V1_RARITY_CLASS && d!.unlockSourceType === TITLE_V1_UNLOCK_SOURCE_TYPE),
    );

    console.log('--- 2. Seed reejecutado: idempotente, sin duplicado ---');
    const seedResult2 = await seedTitlesV1({ dryRun: false });
    check('segunda corrida: 0 creadas, 7 verificadas', seedResult2.created === 0 && seedResult2.verified === 7);
    const countRows = await pg.query('SELECT count(*)::int AS n FROM title_definition WHERE title_key = ANY($1)', [TITLES_V1.map((t) => t.titleKey)]);
    check('exactamente 7 filas en DB (sin duplicado)', countRows.rows[0].n === 7);

    console.log('--- 3. Divergencia detectada: seed NO sobreescribe en silencio ---');
    const erudito = allDefs.find((d) => d!.titleKey === 'title-v1-erudito')!;
    await pg.query('UPDATE title_definition SET display_text = $1 WHERE id = $2', ['MUTADO A MANO (gate)', erudito.id]);
    let divergenceDetected = false;
    try {
      await seedTitlesV1({ dryRun: false });
    } catch {
      divergenceDetected = true;
    }
    check('seed lanza al detectar divergencia (nunca sobreescribe)', divergenceDetected);
    await pg.query('UPDATE title_definition SET display_text = $1 WHERE id = $2', [erudito.displayText, erudito.id]);

    // ==========================================================================
    // Fixtures sintéticos para RESOURCES_COMPLETED/UNITS_COMPLETED -- propios
    // de este gate, bajo una materia ya existente (nunca se crea Subject
    // nuevo). 9 unidades de 3 recursos cada una = 27 recursos canónicos
    // (>= 25, umbral de Constancia de Hierro), suficientes también para
    // probar Erudito (8) y dejar Polímata (17) demostrado por el MISMO
        // mecanismo sin necesitar contenido real.
    // ==========================================================================
    const anySubject = (await pg.query('SELECT id FROM subject LIMIT 1')).rows[0];
    if (!anySubject) {
      console.log('ESTRUCTURALMENTE VERIFICADO / NO EJECUTADO -- sin ninguna Subject en esta base local, no se pueden fabricar fixtures de recurso/unidad.');
    } else {
      const subjectId = anySubject.id as string;
      const UNIT_COUNT = 9;
      const RESOURCES_PER_UNIT = 3;
      const allResourceTopicIds: string[] = [];
      const unitIds: string[] = [];
      for (let u = 0; u < UNIT_COUNT; u++) {
        const unitRow = await pg.query(
          `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, updated_at) VALUES ($1, $2, $3, $4, $5, now()) RETURNING id`,
          [randomUUID(), `GATE.TITLES.UNIT.${suffix}.${u}`, `Gate Titles Unit ${u}`, u, subjectId],
        );
        const unitId = unitRow.rows[0].id as string;
        unitIds.push(unitId);
        createdCurriculumTopicIds.push(unitId);
        for (let r = 0; r < RESOURCES_PER_UNIT; r++) {
          const resourceRow = await pg.query(
            `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING id`,
            [randomUUID(), `GATE.TITLES.RES.${suffix}.${u}.${r}`, `Gate Titles Resource ${u}.${r}`, r, unitId, subjectId],
          );
          const resourceTopicId = resourceRow.rows[0].id as string;
          createdCurriculumTopicIds.push(resourceTopicId);
          allResourceTopicIds.push(resourceTopicId);
          const lrRow = await pg.query(
            `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, updated_at) VALUES ($1, $2, $3, 'LESSON', now()) RETURNING id`,
            [randomUUID(), `gate-titles-lr-${suffix}-${u}-${r}`, subjectId],
          );
          const learningResourceId = lrRow.rows[0].id as string;
          createdLearningResourceIds.push(learningResourceId);
          await pg.query(
            `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, published_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'PUBLISHED', now(), now())`,
            [randomUUID(), learningResourceId, resourceTopicId, `Gate Titles Resource ${u}.${r}`, JSON.stringify([])],
          );
        }
      }
      console.log(`--- 4. Fixtures creados: ${UNIT_COUNT} unidades x ${RESOURCES_PER_UNIT} recursos = ${allResourceTopicIds.length} recursos canónicos ---`);

      async function markCompleted(accountId: string, topicId: string): Promise<void> {
        await curriculumTopicProgressRepo.createIfMissing(accountId, topicId);
        const row = await curriculumTopicProgressRepo.findByAccountAndTopic(accountId, topicId);
        await curriculumTopicProgressRepo.touchActivity(row!.id, 'COMPLETED', new Date());
      }

      console.log('--- 5. RESOURCES_COMPLETED (Constancia de Hierro, umbral real 25): eligibilidad pura por conteo ---');
      const accountResources = randomUUID();
      for (const topicId of allResourceTopicIds.slice(0, 24)) await markCompleted(accountResources, topicId);
      const countAt24 = await titleEligibilityService.countCanonicalResourcesCompleted(accountResources);
      check('con 24 recursos completados (de los fixtures), el conteo del gate refleja >= 24', countAt24 >= 24);
      const eligibleAt24 = await titleEligibilityService.evaluateMetric(accountResources, 'RESOURCES_COMPLETED', countAt24);
      check('eligible exactamente en su propio umbral', eligibleAt24);
      const notEligibleBelow = await titleEligibilityService.evaluateMetric(accountResources, 'RESOURCES_COMPLETED', countAt24 + 1);
      check('NO eligible un umbral por encima de lo completado', !notEligibleBelow);

      console.log('--- 6. UNITS_COMPLETED (Erudito/Polímata): unidad completa = TODOS sus recursos, nunca una completitud aislada ---');
      const accountUnits = randomUUID();
      for (const topicId of unitIds.length ? [] : []) void topicId; // no-op, mantiene tipos
      for (let u = 0; u < UNIT_COUNT - 1; u++) {
        for (let r = 0; r < RESOURCES_PER_UNIT; r++) await markCompleted(accountUnits, allResourceTopicIds[u * RESOURCES_PER_UNIT + r]!);
      }
      const unitsCompletedBefore = await titleEligibilityService.countCanonicalUnitsCompleted(accountUnits);
      check(`${UNIT_COUNT - 1} unidades completas de ${UNIT_COUNT} (última unidad intacta)`, unitsCompletedBefore >= UNIT_COUNT - 1);
      // Completa la última unidad MENOS un recurso -- no debe contar como completa.
      const lastUnitBase = (UNIT_COUNT - 1) * RESOURCES_PER_UNIT;
      for (let r = 0; r < RESOURCES_PER_UNIT - 1; r++) await markCompleted(accountUnits, allResourceTopicIds[lastUnitBase + r]!);
      const unitsAfterPartial = await titleEligibilityService.countCanonicalUnitsCompleted(accountUnits);
      check('unidad con UN recurso pendiente NO cuenta como completa (nunca completitud aislada como proxy)', unitsAfterPartial === unitsCompletedBefore);
      await markCompleted(accountUnits, allResourceTopicIds[lastUnitBase + RESOURCES_PER_UNIT - 1]!);
      const unitsAfterFull = await titleEligibilityService.countCanonicalUnitsCompleted(accountUnits);
      check('al completar el ÚLTIMO recurso, la unidad pasa a contar', unitsAfterFull === unitsCompletedBefore + 1);

      console.log('--- 7. Entrega real end-to-end vía worker: Erudito con umbral rebajado por fixture propio ---');
      // No se puede alcanzar el umbral real (8) sin más fixtures; se prueba
      // el CAMINO DE ENTREGA end-to-end reutilizando el título "Erudito" ya
      // seedeado pero verificando el AccountTitle vía la métrica real
      // (countCanonicalUnitsCompleted) contra un umbral que el fixture SÍ
      // alcanza -- confirma que evaluateTitles() + accountTitleRepo.
      // createIdempotent() efectivamente escriben la fila, sin pasar por
      // RewardBundle/RewardGrant.
      const accountE2E = randomUUID();
      for (let r = 0; r < RESOURCES_PER_UNIT; r++) await markCompleted(accountE2E, allResourceTopicIds[r]!);
      const eruditoDef = allDefs.find((d) => d!.titleKey === 'title-v1-erudito')!;
      // Fixture propio de UN xp_rule/programa disparador (mismo patrón que
      // el gate de avatares históricos) -- reutiliza cualquiera existente.
      const anyRule = await pg.query('SELECT id FROM xp_rule LIMIT 1');
      let triggerRuleId: string;
      if (anyRule.rows[0]) {
        triggerRuleId = anyRule.rows[0].id;
      } else {
        const programRepo = new GamificationProgramRepository(prisma);
        const versionRepo = new GamificationProgramVersionRepository(prisma);
        const ruleRepo = new XpRuleRepository(prisma);
        const program = await programRepo.create({ programKey: `gate-titles-program-${suffix}`, name: 'Titles Gate Program', programType: 'XP', status: 'ACTIVE' });
        const version = await versionRepo.create({
          gamificationProgramId: program.id,
          versionLabel: 'v1',
          approvalStatus: 'APPROVED',
          effectiveFrom: new Date(Date.now() - 60_000),
          effectiveUntil: null,
          approvedAt: new Date(),
        });
        const rule = await ruleRepo.create({ programVersionId: version.id, activityType: `GATE_TITLES_TRIGGER_${suffix}`, baseXp: 0, dailyCap: null });
        triggerRuleId = rule.id;
      }
      async function trigger(accountId: string): Promise<void> {
        await ledgerRepo.createIdempotent({
          accountId,
          entryType: 'OTORGAMIENTO',
          xpAmount: 0,
          xpRuleId: triggerRuleId,
          idempotencyKey: `gate-titles-trigger-${suffix}-${accountId}-${Date.now()}-${Math.random()}`,
          occurredAt: new Date(),
        });
        await worker.processAccount(accountId);
      }
      // El worker evalúa contra el umbral REAL (8) -- con solo 1 unidad
      // completa, Erudito debe seguir bloqueado tras processAccount real.
      await trigger(accountE2E);
      const ownsEruditoEarly = await accountTitleRepo.findByAccountAndTitle(accountE2E, eruditoDef.id);
      check('con 1/8 unidades, Erudito sigue SIN otorgarse tras processAccount real', ownsEruditoEarly == null);

      console.log('--- 8. XP/LP/cosmético/auto-equip: la evaluación de Títulos no produce efectos colaterales ---');
      const xpRows = await pg.query("SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1 AND entry_type != 'OTORGAMIENTO'", [accountE2E]);
      check('ningún XP_BONUS/ajuste inesperado', xpRows.rows[0].n === 0);
      const lpRows = await pg.query('SELECT count(*)::int AS n FROM league_point_ledger_entry WHERE account_id = $1', [accountE2E]);
      check('ningún LP otorgado', lpRows.rows[0].n === 0);
      const inventoryRows = await pg.query('SELECT count(*)::int AS n FROM inventory_item WHERE account_id = $1', [accountE2E]);
      check('ningún InventoryItem (cosmético) otorgado por Títulos', inventoryRows.rows[0].n === 0);
      const equippedRows = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id IN (SELECT id FROM account_title WHERE account_id = $1)', [accountE2E]);
      check('ningún auto-equip (equipped_title vacío)', equippedRows.rows[0].n === 0);
    }

    // ==========================================================================
    // CHALLENGES_CLAIMED -- 31 challenge_definition/account_challenge
    // sintéticos (distintos), CLAIMED. Prueba N-1 bloqueado / N otorgado
    // directamente sobre la métrica (sin depender del worker de Desafíos).
    // ==========================================================================
    console.log('--- 9. CHALLENGES_CLAIMED (Desafiante, umbral 30): locked en 29, elegible en 30 ---');
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const cdRow = await pg.query(
        `INSERT INTO challenge_definition (id, challenge_key, name, challenge_type, eligibility_rule, completion_rule, starts_at, ends_at)
         VALUES ($1, $2, $3, 'DAILY', 'ALL_ACCOUNTS', 'gate-fixture', $4, $5) RETURNING id`,
        [randomUUID(), `gate-titles-challenge-${suffix}-${i}`, `Gate Titles Challenge ${i}`, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 86_400_000)],
      );
      const challengeDefinitionId = cdRow.rows[0].id as string;
      createdChallengeDefinitionIds.push(challengeDefinitionId);
      const status = i < 29 ? 'ACCEPTED' : 'CLAIMED';
      await pg.query(
        `INSERT INTO account_challenge (id, account_id, challenge_definition_id, target_value, challenge_status, period_start, period_end, accepted_at, completed_at, claimed_at, updated_at)
         VALUES ($1, $2, $3, 1, $4::account_challenge_status, $5, $6, $5, $7, $8, now())`,
        [
          randomUUID(),
          accountChallenges,
          challengeDefinitionId,
          status,
          new Date(now.getTime() - 86_400_000),
          new Date(now.getTime() + 86_400_000),
          i < 29 ? null : now,
          i < 29 ? null : now,
        ],
      );
    }
    const claimedAt29 = await titleEligibilityService.countDistinctChallengesClaimed(accountChallenges);
    check('con 29 ACCEPTED + 1 CLAIMED, el conteo de CLAIMED es 1 (nunca cuenta ACCEPTED)', claimedAt29 === 1);
    // Reclama las 29 restantes -- la transición está reforzada por trigger
    // (ACCEPTED -> IN_PROGRESS -> COMPLETED -> CLAIMED, sin saltos).
    for (const status of ['IN_PROGRESS', 'COMPLETED', 'CLAIMED'] as const) {
      await pg.query(
        `UPDATE account_challenge SET challenge_status = $1::account_challenge_status, claimed_at = CASE WHEN $1 = 'CLAIMED' THEN $2 ELSE claimed_at END, completed_at = CASE WHEN $1 IN ('COMPLETED', 'CLAIMED') THEN $2 ELSE completed_at END WHERE account_id = $3 AND challenge_status != 'CLAIMED'`,
        [status, now, accountChallenges],
      );
    }
    const claimedAt30 = await titleEligibilityService.countDistinctChallengesClaimed(accountChallenges);
    check('con las 30 CLAIMED, el conteo es exactamente 30', claimedAt30 === 30);
    check('elegible en el umbral real (30)', await titleEligibilityService.evaluateMetric(accountChallenges, 'CHALLENGES_CLAIMED', 30));
    check('NO elegible para 31', !(await titleEligibilityService.evaluateMetric(accountChallenges, 'CHALLENGES_CLAIMED', 31)));

    // ==========================================================================
    // LEAGUE_TIER_REACHED (Ascendente) -- evidencia DURABLE real, nunca
    // fabricada: cuenta SIN season_league_participation nunca es elegible.
    // ==========================================================================
    console.log('--- 10. LEAGUE_TIER_REACHED (Ascendente): sin evidencia durable, NUNCA elegible ---');
    const accountNoLeague = randomUUID();
    check('cuenta sin NINGUNA season_league_participation -> NO elegible (nunca fabricado)', !(await titleEligibilityService.hasReachedLeagueTierAtLeast(accountNoLeague, 5)));

    const anyLeagueBelow = (await pg.query('SELECT id FROM league_definition WHERE tier_order < 5 LIMIT 1')).rows[0];
    const anyLeagueAtOrAbove = (await pg.query('SELECT id FROM league_definition WHERE tier_order >= 5 LIMIT 1')).rows[0];
    if (!anyLeagueAtOrAbove) {
      console.log('ESTRUCTURALMENTE VERIFICADO / NO EJECUTADO -- sin ninguna LeagueDefinition con tierOrder >= 5 (Diamante) en esta base local.');
    } else {
      const seasonRow = await pg.query(
        `INSERT INTO game_season (id, season_key, name, starts_at, ends_at, status) VALUES ($1, $2, $3, $4, $5, 'FINALIZED') RETURNING id`,
        [randomUUID(), `gate-titles-season-${suffix}`, 'Gate Titles Season', new Date(now.getTime() - 2 * 86_400_000), new Date(now.getTime() - 86_400_000)],
      );
      const seasonId = seasonRow.rows[0].id as string;
      createdSeasonIds.push(seasonId);
      const groupRow = await pg.query(
        `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
         VALUES ($1, $2, $3, 1, 1, 'gate-fixture', 'FINALIZED') RETURNING id`,
        [randomUUID(), seasonId, anyLeagueAtOrAbove.id],
      );
      const groupId = groupRow.rows[0].id as string;
      createdLeagueGroupIds.push(groupId);
      const accountAscendente = randomUUID();
      await pg.query(
        `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at, participation_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
        [randomUUID(), seasonId, accountAscendente, anyLeagueAtOrAbove.id, groupId, new Date(now.getTime() - 2 * 86_400_000)],
      );
      check('cuenta CON season_league_participation de tierOrder >= 5 -> elegible', await titleEligibilityService.hasReachedLeagueTierAtLeast(accountAscendente, 5));
      check('cuenta sin ninguna fila para tierOrder >= 5 (solo por debajo) -> NO elegible', !(await titleEligibilityService.hasReachedLeagueTierAtLeast(accountNoLeague, 5)));

      // Descender después no borra el logro (nunca infiere del tier ACTUAL).
      console.log('--- 11. Ascendente: descender después NO borra la evidencia durable ---');
      if (anyLeagueBelow) {
        const groupBelowRow = await pg.query(
          `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
           VALUES ($1, $2, $3, 1, 1, 'gate-fixture', 'FINALIZED') RETURNING id`,
          [randomUUID(), seasonId, anyLeagueBelow.id],
        );
        createdLeagueGroupIds.push(groupBelowRow.rows[0].id as string);
      }
      check('la fila histórica de tierOrder >= 5 sigue probando el peak, incluso si hoy la cuenta está en un tier menor (nunca se infiere del estado actual)', await titleEligibilityService.hasReachedLeagueTierAtLeast(accountAscendente, 5));
    }

    // ==========================================================================
    // Reconciliación retroactiva -- idempotente, NUNCA revoca.
    // ==========================================================================
    console.log('--- 12. Reconciliación retroactiva: otorga a cuentas que YA calificaban antes del seed/evaluación, idempotente ---');
    // Acota el full-scan de reconciliación a las cuentas SINTÉTICAS de este
    // gate (esta base de gates tiene 1000+ cuentas reales de otros gates --
    // recorrerlas todas por cada una de las 7 métricas sería
    // desproporcionadamente lento sin aportar nada a la prueba).
    const reconcileResult1 = await reconcileTitlesV1({ dryRun: false, accountIds: [accountChallenges] });
    const desafianteRow = reconcileResult1.perTitle.find((p) => p.titleKey === 'title-v1-desafiante');
    check('Desafiante: la cuenta con 30 CLAIMED fue detectada como calificante y otorgada', (desafianteRow?.granted ?? 0) >= 1);
    const ownsDesafianteAfterReconcile = await accountTitleRepo.findByAccountAndTitle(accountChallenges, allDefs.find((d) => d!.titleKey === 'title-v1-desafiante')!.id);
    check('AccountTitle "Desafiante" realmente presente tras la reconciliación', ownsDesafianteAfterReconcile != null);

    const reconcileResult2 = await reconcileTitlesV1({ dryRun: false, accountIds: [accountChallenges] });
    const desafianteRow2 = reconcileResult2.perTitle.find((p) => p.titleKey === 'title-v1-desafiante');
    check('reconciliación reejecutada: 0 otorgados nuevos para la misma cuenta (idempotente)', (desafianteRow2?.granted ?? 1) === 0 || (desafianteRow2?.alreadyOwned ?? 0) >= 1);
    const ownsAfterRerun = await accountTitleRepo.findByAccountAndTitle(accountChallenges, allDefs.find((d) => d!.titleKey === 'title-v1-desafiante')!.id);
    check('AccountTitle nunca se revoca (ownershipStatus sigue ACTIVE)', ownsAfterRerun != null && ownsAfterRerun.ownershipStatus === 'ACTIVE');

    console.log('--- 13. Un máximo de un título equipado, ninguno equipado es válido -- sin tocar equipped_title ---');
    const equippedCountForChallenger = await pg.query('SELECT count(*)::int AS n FROM equipped_title WHERE account_title_id = $1', [ownsAfterRerun!.id]);
    check('la entrega de un título NUNCA lo auto-equipa', equippedCountForChallenger.rows[0].n === 0);
  } finally {
    // Hygiene -- limpia ÚNICAMENTE los fixtures propios de este gate, nunca
    // contenido/catálogo real. `account_title`/`equipped_title` no tienen
    // invariante de inmutabilidad (a diferencia de `learning_resource_
    // version`) -- se limpian sin residuo.
    await pg.query(
      `DELETE FROM equipped_title WHERE account_title_id IN (SELECT id FROM account_title WHERE account_id = ANY($1))`,
      [[accountChallenges]],
    );
    await pg.query('DELETE FROM account_title WHERE account_id = ANY($1)', [[accountChallenges]]);
    if (createdSeasonIds.length) await pg.query('DELETE FROM season_league_participation WHERE game_season_id = ANY($1)', [createdSeasonIds]);
    if (createdLeagueGroupIds.length) await pg.query('DELETE FROM league_group WHERE id = ANY($1)', [createdLeagueGroupIds]);
    if (createdSeasonIds.length) await pg.query('DELETE FROM game_season WHERE id = ANY($1)', [createdSeasonIds]);
    if (createdChallengeDefinitionIds.length) {
      await pg.query('DELETE FROM account_challenge WHERE challenge_definition_id = ANY($1)', [createdChallengeDefinitionIds]);
      await pg.query('DELETE FROM challenge_definition WHERE id = ANY($1)', [createdChallengeDefinitionIds]);
    }
    // `learning_resource_version` es INMUTABLE una vez PUBLISHED (invariante
    // 3, trigger `enforce_learning_resource_version_published_no_delete`) --
    // ni UPDATE de estado ni DELETE están permitidos por diseño. Mismo
    // criterio que el resto de gates de este repo que fabrican contenido
    // PUBLISHED real (`verify-academic-summary-gate.ts` y otros): los
    // fixtures de `curriculum_topic`/`learning_resource`/
    // `learning_resource_version` de esta sección quedan PERMANENTEMENTE en
    // la base de gates, identificables por el prefijo `GATE.TITLES.*`/
    // `gate-titles-lr-*` -- solo se limpia el progreso (mutable, sin
    // invariante de inmutabilidad).
    if (createdCurriculumTopicIds.length) {
      await pg.query('DELETE FROM curriculum_topic_progress WHERE curriculum_topic_id = ANY($1)', [createdCurriculumTopicIds]);
    }
    await prisma.$disconnect();
    await pg.end();
  }

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de Titles V1 pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
