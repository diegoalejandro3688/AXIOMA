// WEB-0D.1C-B1 -- primitiva de pseudonimización de GAMIFICATION (dominio
// separado de Analytics) + soporte de esquema en los 7 modelos históricos +
// transición de privacidad de una sola vía en los triggers de inmutabilidad
// que la poseen. Acceso directo a Postgres (axioma_gates_dev) -- este
// bloque NO expone superficie HTTP nueva, solo esquema/trigger/función pura.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { assertGateDb } from './gate-db-safety';
import { gamificationActorRef } from '../src/gamification/gamification-actor-ref';
import { analyticsActorRef } from '../src/analytics/analytics-actor-ref';

let failures = 0;
function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    failures++;
    console.error(`FALLO  ${label}`);
  }
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const suffix = `${Date.now()}`;
  const now = new Date();

  // ==========================================================================
  console.log('--- 1. Primitiva gamificationActorRef -- forma criptográfica y separación de dominio ---');
  // Secretos de PRUEBA únicamente -- nunca un valor real, nunca leído de env.
  const secretG1 = `test-gamification-secret-${suffix}-A`;
  const secretG2 = `test-gamification-secret-${suffix}-B`;
  const secretAnalytics = `test-analytics-secret-${suffix}`;
  const accountX = randomUUID();
  const accountY = randomUUID();

  const refX1a = gamificationActorRef(accountX, secretG1);
  const refX1b = gamificationActorRef(accountX, secretG1);
  const refX2 = gamificationActorRef(accountX, secretG2);
  const refY1 = gamificationActorRef(accountY, secretG1);

  check('1.1 misma cuenta + mismo secreto => mismo ref (determinístico)', refX1a === refX1b);
  check('1.2 cuenta distinta => ref distinto', refX1a !== refY1);
  check('1.3 mismo cuenta + secreto distinto => ref distinto', refX1a !== refX2);
  check('1.4 el ref NUNCA es el accountId crudo', refX1a !== accountX);
  check('1.5 formato estable: 64 hex chars (HMAC-SHA256 en hex)', /^[0-9a-f]{64}$/.test(refX1a));

  const analyticsRefX = analyticsActorRef(accountX, secretAnalytics);
  const gamificationRefXWithAnalyticsSecretValue = gamificationActorRef(accountX, secretAnalytics);
  check(
    '1.6 mismo secreto de VALOR + mismo accountId => misma salida (ambas son HMAC-SHA256 puro, esperado -- la separación real es NUNCA compartir el secreto, no el algoritmo)',
    analyticsRefX === gamificationRefXWithAnalyticsSecretValue,
  );
  check(
    '1.7 dominio separado en la práctica: con secretos DISTINTOS (el caso real -- GAMIFICATION_ACTOR_SECRET != ANALYTICS_ACTOR_SECRET), la misma cuenta produce refs distintos entre dominios',
    analyticsActorRef(accountX, secretAnalytics) !== gamificationActorRef(accountX, secretG1),
  );
  check(
    '1.8 gamificationActorRef es pura -- mismo accountId+secreto en llamadas independientes sigue siendo determinístico sin estado oculto ni acoplamiento a analyticsActorRef',
    gamificationActorRef(accountX, secretG1) === refX1a && analyticsActorRef !== (gamificationActorRef as unknown),
  );

  // ==========================================================================
  console.log('--- 2. Esquema: 7 modelos, fila NORMAL (accountId real, gamificationActorRef NULL) ---');
  const accountNormal = randomUUID();

  // 2.a validated_gamification_activity (fundación -- las demás filas de este gate dependen de una)
  const vgaId = randomUUID();
  const dedupKey = `dwcag-b1-gate-${suffix}`;
  await pg.query(
    `INSERT INTO validated_gamification_activity
       (id, account_id, source_domain, source_entity_type, source_entity_id, activity_type, validation_status, validation_rule_version, occurred_at, deduplication_key, integrity_status)
     VALUES ($1, $2, 'GATE', 'GATE_ENTITY', $3, 'RESPUESTA_VALIDADA', 'VALID', 'v1', $4, $5, 'INTACT')`,
    [vgaId, accountNormal, randomUUID(), now, dedupKey],
  );
  const vgaRow = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [vgaId]);
  check('2.a ValidatedGamificationActivity: insert normal ok, accountId real', vgaRow.rows[0].account_id === accountNormal);
  check('2.a ValidatedGamificationActivity: gamificationActorRef NULL por defecto', vgaRow.rows[0].gamification_actor_ref === null);

  // WEB-0D.1C-B0R -- ver `verify-deferred-gamification-worker-closed-account-guard-gate.ts`:
  // este gate también toca el `xp_rule`/`gamification_program_version`
  // COMPARTIDO bajo `xp-core` -- retira el propio ANTES (barre residuo de
  // una corrida anterior abortada a mitad de camino) Y DESPUÉS (mismo
  // criterio EXACTO, mismo patrón de prefijo de version_label).
  async function retireOwnXpCoreFixture(): Promise<void> {
    await pg.query(
      `UPDATE xp_rule xr SET status = 'RETIRED'
       FROM gamification_program_version gpv, gamification_program gp
       WHERE xr.program_version_id = gpv.id AND gpv.gamification_program_id = gp.id
         AND gp.program_key = 'xp-core' AND gpv.version_label LIKE 'pseudo-gate-%'
         AND xr.status = 'ACTIVE'`,
    );
  }
  // Mismo criterio, tabla compartida distinta -- `league_point_rule` no
  // tiene ningún soporte de reuso/limpieza en NINGÚN gate anterior; una
  // fila propia dejada ACTIVE para `RESPUESTA_VALIDADA` rompe el
  // invariante congelado de `verify-competitive-v1-gate.ts` ("Estudio
  // nunca otorga LP") para cualquier corrida posterior.
  async function retireOwnLpRuleFixture(): Promise<void> {
    await pg.query(`UPDATE league_point_rule SET status = 'RETIRED' WHERE rule_version LIKE 'pseudo-gate-lp-%' AND status = 'ACTIVE'`);
  }
  await retireOwnXpCoreFixture();
  await retireOwnLpRuleFixture();

  // Fixture XpRule mínimo (mismo patrón que otros gates de este bloque -- xp-core reutilizado/creado idempotente).
  async function findOrCreateXpCoreRuleId(): Promise<string> {
    const existing = await pg.query(
      `SELECT xr.id FROM xp_rule xr
       JOIN gamification_program_version gpv ON gpv.id = xr.program_version_id
       JOIN gamification_program gp ON gp.id = gpv.gamification_program_id
       WHERE gp.program_key = 'xp-core' AND gp.status = 'ACTIVE' AND gpv.approval_status = 'APPROVED'
         AND xr.activity_type = 'RESPUESTA_VALIDADA' AND xr.status = 'ACTIVE'
         AND (xr.effective_from IS NULL OR xr.effective_from <= $1)
         AND (xr.effective_until IS NULL OR xr.effective_until > $1)
       LIMIT 1`,
      [now],
    );
    if (existing.rows.length > 0) return existing.rows[0].id as string;

    let programId: string;
    const existingProgram = await pg.query(`SELECT id FROM gamification_program WHERE program_key = 'xp-core'`);
    if (existingProgram.rows.length > 0) {
      programId = existingProgram.rows[0].id as string;
    } else {
      programId = randomUUID();
      await pg.query(`INSERT INTO gamification_program (id, program_key, name, program_type) VALUES ($1, 'xp-core', 'XP Core', 'XP')`, [programId]);
    }

    let versionId: string;
    const versionLabel = `pseudo-gate-${suffix}`;
    const existingVersion = await pg.query(
      `SELECT id FROM gamification_program_version WHERE gamification_program_id = $1 AND version_label = $2`,
      [programId, versionLabel],
    );
    if (existingVersion.rows.length > 0) {
      versionId = existingVersion.rows[0].id as string;
    } else {
      versionId = randomUUID();
      // `now.toISOString()`, NUNCA el `Date` crudo -- ver
      // `verify-deferred-gamification-worker-closed-account-guard-gate.ts`
      // para el hallazgo completo: el driver `pg` crudo serializa un
      // `Date` de JS usando la zona horaria LOCAL del proceso Node (aquí
      // Europe/Paris, UTC+2) al escribir una columna `timestamp without
      // time zone`, mientras Prisma SIEMPRE trata el valor naive
      // almacenado como UTC puro al comparar -- sin este fix, la regla
      // parece estar 2h en el futuro para `findApplicableRule` y las
      // secciones E/F de este gate fallarían con NO_ACTIVE_RULE falso.
      await pg.query(
        `INSERT INTO gamification_program_version (id, gamification_program_id, version_label, approval_status, effective_from) VALUES ($1, $2, $3, 'APPROVED', $4)`,
        [versionId, programId, versionLabel, now.toISOString()],
      );
    }

    const ruleId = randomUUID();
    await pg.query(`INSERT INTO xp_rule (id, program_version_id, activity_type, base_xp, effective_from) VALUES ($1, $2, 'RESPUESTA_VALIDADA', 10, $3)`, [
      ruleId,
      versionId,
      now.toISOString(),
    ]);
    return ruleId;
  }
  const xpRuleId = await findOrCreateXpCoreRuleId();

  // 2.b xp_ledger_entry
  const xpEntryId = randomUUID();
  await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, validated_activity_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at)
     VALUES ($1, $2, $3, $4, 'OTORGAMIENTO', 10, $5, $6)`,
    [xpEntryId, accountNormal, vgaId, xpRuleId, `xp-b1-gate-${suffix}`, now],
  );
  const xpRow = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [xpEntryId]);
  check('2.b XpLedgerEntry: insert normal ok, accountId real', xpRow.rows[0].account_id === accountNormal);
  check('2.b XpLedgerEntry: gamificationActorRef NULL por defecto', xpRow.rows[0].gamification_actor_ref === null);

  // 2.c reward_grant (necesita reward_bundle real -- fixture mínimo)
  const bundleId = randomUUID();
  await pg.query(`INSERT INTO reward_bundle (id, name, bundle_key) VALUES ($1, 'Gate Bundle', $2)`, [bundleId, `pseudo-gate-bundle-${suffix}`]);
  const rewardGrantId = randomUUID();
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key)
     VALUES ($1, $2, $3, 'ACHIEVEMENT_UNLOCK', $4, $5)`,
    [rewardGrantId, accountNormal, bundleId, randomUUID(), `reward-b1-gate-${suffix}`],
  );
  const rewardRow = await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [rewardGrantId]);
  check('2.c RewardGrant: insert normal ok, accountId real', rewardRow.rows[0].account_id === accountNormal);
  check('2.c RewardGrant: gamificationActorRef NULL por defecto', rewardRow.rows[0].gamification_actor_ref === null);

  // Fixture achievement_definition/version mínimo para 2.d/2.e
  const achDefId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_definition (id, achievement_key, name, achievement_category, visibility_class, repeatability, progress_tracking_type)
     VALUES ($1, $2, 'Gate Achievement', 'GATE', 'PRIVATE', 'UNIQUE', 'GATE')`,
    [achDefId, `pseudo-gate-ach-${suffix}`],
  );
  const achVersionId = randomUUID();
  await pg.query(
    // `unlock_rule` es JSON parseado y validado con Zod
    // (`XpThresholdUnlockRuleSchema`) por `RewardEvaluationWorker` en CRON
    // real -- un valor que no sea JSON válido, o que sea JSON válido pero
    // no cumpla el esquema (p.ej. `'{}'`), queda como residuo PERMANENTE
    // que ese cron sigue intentando evaluar (y fallando) en cada tick
    // mientras el servidor de gates viva, incluso después de que este
    // gate termine -- rompiendo la evaluación de OTRAS cuentas ajenas a
    // este gate en OTROS gates de logros. `value` deliberadamente
    // inalcanzable (999999999) para que, aunque algún día SÍ se evalúe
    // contra una cuenta real, nunca se complete por accidente.
    `INSERT INTO achievement_version (id, achievement_definition_id, version_label, unlock_rule, approval_status)
     VALUES ($1, $2, 'v1', '{"schemaVersion":"v1","type":"XP_THRESHOLD","value":999999999}', 'APPROVED')`,
    [achVersionId, achDefId],
  );

  // 2.d achievement_progress
  const achProgressId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at)
     VALUES ($1, $2, $3, $4, 0, 1, $5)`,
    [achProgressId, accountNormal, achDefId, achVersionId, now],
  );
  const achProgressRow = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [achProgressId]);
  check('2.d AchievementProgress: insert normal ok, accountId real', achProgressRow.rows[0].account_id === accountNormal);
  check('2.d AchievementProgress: gamificationActorRef NULL por defecto', achProgressRow.rows[0].gamification_actor_ref === null);

  // 2.e achievement_unlock
  const achUnlockId = randomUUID();
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at)
     VALUES ($1, $2, $3, $4, 1, $5)`,
    [achUnlockId, accountNormal, achDefId, achVersionId, now],
  );
  const achUnlockRow = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_unlock WHERE id = $1', [achUnlockId]);
  check('2.e AchievementUnlock: insert normal ok, accountId real', achUnlockRow.rows[0].account_id === accountNormal);
  check('2.e AchievementUnlock: gamificationActorRef NULL por defecto', achUnlockRow.rows[0].gamification_actor_ref === null);

  // Fixture season/league/group mínimo para 2.f/2.g
  // `game_season_single_active` -- a lo sumo una temporada ACTIVE en toda la
  // base compartida `axioma_gates_dev`. Reutiliza la existente si hay una
  // (mismo patrón que WEB-0D.1C-A/B0R), en vez de competir por crear otra.
  let seasonId: string;
  let seasonStartsAt: Date;
  let seasonEndsAt: Date;
  // Solo reutiliza una temporada ACTIVE cuya VENTANA todavía cubra `now` --
  // una ACTIVE con `ends_at` ya vencido (residuo de OTRO gate nunca
  // finalizado, p.ej. una ventana corta de 2h) sigue satisfaciendo
  // `status='ACTIVE'` pero rechazaría cualquier OTORGAMIENTO real vía el
  // trigger `enforce_league_point_ledger_entry_window`.
  const existingActiveSeason = await pg.query(
    `SELECT id, starts_at, ends_at FROM game_season WHERE status = 'ACTIVE' AND starts_at <= $1 AND ends_at > $1 LIMIT 1`,
    [now.toISOString()],
  );
  if (existingActiveSeason.rows.length > 0) {
    seasonId = existingActiveSeason.rows[0].id as string;
    seasonStartsAt = existingActiveSeason.rows[0].starts_at as Date;
    seasonEndsAt = existingActiveSeason.rows[0].ends_at as Date;
  } else {
    seasonId = randomUUID();
    seasonStartsAt = now;
    seasonEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // `.toISOString()` -- ver la nota extensa junto a `findOrCreateXpCoreRuleId`
    // (mismo hallazgo: `Date` crudo vía `pg` para una columna `timestamp
    // without time zone` queda desplazado por la zona horaria LOCAL del
    // proceso Node).
    await pg.query(
      `INSERT INTO game_season (id, season_key, name, status, starts_at, ends_at) VALUES ($1, $2, 'Gate Season', 'ACTIVE', $3, $4)`,
      [seasonId, `pseudo-gate-season-${suffix}`, seasonStartsAt.toISOString(), seasonEndsAt.toISOString()],
    );
  }
  // El otorgamiento OTORGAMIENTO de LP exige `occurred_at` dentro de [starts_at, ends_at) --
  // usar `now` funciona con una temporada recién creada; con una reutilizada, se acota al inicio real.
  const lpOccurredAt = now < seasonStartsAt ? seasonStartsAt : now;
  const leagueDefId = randomUUID();
  await pg.query(
    `INSERT INTO league_definition (id, league_key, name, tier_order, participant_group_size) VALUES ($1, $2, 'Gate League', 1, 30)`,
    [leagueDefId, `pseudo-gate-league-${suffix}`],
  );
  const leagueGroupId = randomUUID();
  await pg.query(
    `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status)
     VALUES ($1, $2, $3, 1, 30, 'v1', 'OPEN')`,
    [leagueGroupId, seasonId, leagueDefId],
  );

  // 2.f season_league_participation
  const participationId = randomUUID();
  await pg.query(
    `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, joined_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [participationId, seasonId, accountNormal, leagueDefId, leagueGroupId, lpOccurredAt.toISOString()],
  );
  const participationRow = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [participationId]);
  check('2.f SeasonLeagueParticipation: insert normal ok, accountId real', participationRow.rows[0].account_id === accountNormal);
  check('2.f SeasonLeagueParticipation: gamificationActorRef NULL por defecto', participationRow.rows[0].gamification_actor_ref === null);

  // Fixture league_point_rule mínimo para 2.g -- `rule_version` prefijado
  // `pseudo-gate-` (identificable, nunca `'v1'` genérico) para poder
  // retirarlo al terminar. `league_point_rule` NO tiene el mismo soporte
  // de reuso/limpieza que `xp_rule` en gates anteriores -- confirmado
  // durante esta regresión que `RESPUESTA_VALIDADA` NUNCA debe tener una
  // regla de LP ACTIVE (invariante congelado de `verify-competitive-v1-gate.ts`,
  // "Estudio nunca otorga LP"); dejar esta fila ACTIVE rompería ese gate
  // para CUALQUIER corrida posterior mientras el servidor de gates viva.
  const lpRuleId = randomUUID();
  await pg.query(
    `INSERT INTO league_point_rule (id, activity_type, base_points, rule_version, effective_from) VALUES ($1, 'RESPUESTA_VALIDADA', 1, $2, $3)`,
    [lpRuleId, `pseudo-gate-lp-${suffix}`, now.toISOString()],
  );

  // 2.g league_point_ledger_entry
  const lpEntryId = randomUUID();
  await pg.query(
    `INSERT INTO league_point_ledger_entry
       (id, account_id, season_league_participation_id, validated_activity_id, league_point_rule_id, entry_type, point_amount, idempotency_key, occurred_at)
     VALUES ($1, $2, $3, $4, $5, 'OTORGAMIENTO', 1, $6, $7)`,
    [lpEntryId, accountNormal, participationId, vgaId, lpRuleId, `lp-b1-gate-${suffix}`, lpOccurredAt.toISOString()],
  );
  const lpRow = await pg.query('SELECT account_id, gamification_actor_ref FROM league_point_ledger_entry WHERE id = $1', [lpEntryId]);
  check('2.g LeaguePointLedgerEntry: insert normal ok, accountId real', lpRow.rows[0].account_id === accountNormal);
  check('2.g LeaguePointLedgerEntry: gamificationActorRef NULL por defecto', lpRow.rows[0].gamification_actor_ref === null);

  // ==========================================================================
  console.log('--- 3. Transición de privacidad (accountId->NULL + gamificationActorRef) ---');
  const testPseudonym = gamificationActorRef(accountNormal, secretG1);

  // 3.a xp_ledger_entry -- trigger-protegido
  await pg.query(`UPDATE xp_ledger_entry SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, xpEntryId]);
  const xpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM xp_ledger_entry WHERE id = $1', [xpEntryId]);
  check('3.a XpLedgerEntry: transición de identidad SUCEDE (accountId NULL, ref fijado)', xpAfter.rows[0].account_id === null && xpAfter.rows[0].gamification_actor_ref === testPseudonym);

  // 3.b league_point_ledger_entry -- trigger-protegido
  await pg.query(`UPDATE league_point_ledger_entry SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, lpEntryId]);
  const lpAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM league_point_ledger_entry WHERE id = $1', [lpEntryId]);
  check('3.b LeaguePointLedgerEntry: transición de identidad SUCEDE', lpAfter.rows[0].account_id === null && lpAfter.rows[0].gamification_actor_ref === testPseudonym);

  // 3.c achievement_progress -- trigger-protegido, INCLUSO si estuviera COMPLETED (probado aparte en 3.c2)
  await pg.query(`UPDATE achievement_progress SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, achProgressId]);
  const achProgressAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_progress WHERE id = $1', [achProgressId]);
  check(
    '3.c AchievementProgress: transición de identidad SUCEDE',
    achProgressAfter.rows[0].account_id === null && achProgressAfter.rows[0].gamification_actor_ref === testPseudonym,
  );

  // 3.c2 -- misma transición pero sobre una fila YA COMPLETED (el caso que el trigger original bloqueaba incondicionalmente).
  const achProgressCompletedId = randomUUID();
  const accountCompleted = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, progress_status, updated_at)
     VALUES ($1, $2, $3, $4, 1, 1, 'COMPLETED', $5)`,
    [achProgressCompletedId, accountCompleted, achDefId, achVersionId, now],
  );
  const testPseudonymCompleted = gamificationActorRef(accountCompleted, secretG1);
  await pg.query(`UPDATE achievement_progress SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonymCompleted, achProgressCompletedId]);
  const achProgressCompletedAfter = await pg.query('SELECT account_id, gamification_actor_ref, progress_status FROM achievement_progress WHERE id = $1', [
    achProgressCompletedId,
  ]);
  check(
    '3.c2 AchievementProgress COMPLETED: la transición de identidad SUCEDE igual (excepción explícita sobre la regla terminal)',
    achProgressCompletedAfter.rows[0].account_id === null &&
      achProgressCompletedAfter.rows[0].gamification_actor_ref === testPseudonymCompleted &&
      achProgressCompletedAfter.rows[0].progress_status === 'COMPLETED',
  );

  // 3.d achievement_unlock -- trigger-protegido
  await pg.query(`UPDATE achievement_unlock SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, achUnlockId]);
  const achUnlockAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM achievement_unlock WHERE id = $1', [achUnlockId]);
  check('3.d AchievementUnlock: transición de identidad SUCEDE', achUnlockAfter.rows[0].account_id === null && achUnlockAfter.rows[0].gamification_actor_ref === testPseudonym);

  // 3.d2 -- misma transición pero sobre una fila con reward_grant_id YA fijado (el caso que el trigger original bloqueaba incondicionalmente).
  const achUnlockWithGrantId = randomUUID();
  const accountWithGrant = randomUUID();
  const bundleId2 = randomUUID();
  await pg.query(`INSERT INTO reward_bundle (id, name, bundle_key) VALUES ($1, 'Gate Bundle 2', $2)`, [bundleId2, `pseudo-gate-bundle2-${suffix}`]);
  const rewardGrantId2 = randomUUID();
  await pg.query(
    `INSERT INTO reward_grant (id, account_id, reward_bundle_id, source_entity_type, source_entity_id, idempotency_key) VALUES ($1, $2, $3, 'ACHIEVEMENT_UNLOCK', $4, $5)`,
    [rewardGrantId2, accountWithGrant, bundleId2, achUnlockWithGrantId, `reward-b1-gate-2-${suffix}`],
  );
  await pg.query(
    `INSERT INTO achievement_unlock (id, account_id, achievement_definition_id, achievement_version_id, unlock_instance, unlocked_at, reward_grant_id)
     VALUES ($1, $2, $3, $4, 1, $5, $6)`,
    [achUnlockWithGrantId, accountWithGrant, achDefId, achVersionId, now, rewardGrantId2],
  );
  const testPseudonymWithGrant = gamificationActorRef(accountWithGrant, secretG1);
  await pg.query(`UPDATE achievement_unlock SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonymWithGrant, achUnlockWithGrantId]);
  const achUnlockWithGrantAfter = await pg.query('SELECT account_id, gamification_actor_ref, reward_grant_id FROM achievement_unlock WHERE id = $1', [
    achUnlockWithGrantId,
  ]);
  check(
    '3.d2 AchievementUnlock con reward_grant_id YA fijado: la transición de identidad SUCEDE igual, reward_grant_id intacto',
    achUnlockWithGrantAfter.rows[0].account_id === null &&
      achUnlockWithGrantAfter.rows[0].gamification_actor_ref === testPseudonymWithGrant &&
      achUnlockWithGrantAfter.rows[0].reward_grant_id === rewardGrantId2,
  );

  // 3.e/3.f/3.g -- modelos SIN trigger de inmutabilidad (plain UPDATE, sin excepción especial necesaria).
  await pg.query(`UPDATE validated_gamification_activity SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, vgaId]);
  const vgaAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM validated_gamification_activity WHERE id = $1', [vgaId]);
  check('3.e ValidatedGamificationActivity (sin trigger): transición de identidad SUCEDE', vgaAfter.rows[0].account_id === null && vgaAfter.rows[0].gamification_actor_ref === testPseudonym);

  await pg.query(`UPDATE reward_grant SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, rewardGrantId]);
  const rewardAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM reward_grant WHERE id = $1', [rewardGrantId]);
  check('3.f RewardGrant (sin trigger): transición de identidad SUCEDE', rewardAfter.rows[0].account_id === null && rewardAfter.rows[0].gamification_actor_ref === testPseudonym);

  await pg.query(`UPDATE season_league_participation SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [testPseudonym, participationId]);
  const participationAfter = await pg.query('SELECT account_id, gamification_actor_ref FROM season_league_participation WHERE id = $1', [participationId]);
  check(
    '3.g SeasonLeagueParticipation (sin trigger): transición de identidad SUCEDE',
    participationAfter.rows[0].account_id === null && participationAfter.rows[0].gamification_actor_ref === testPseudonym,
  );

  // ==========================================================================
  console.log('--- 4. Unidireccionalidad (solo modelos con trigger de inmutabilidad -- el DB es quien la garantiza) ---');

  async function expectRejected(label: string, sql: string, params: unknown[]): Promise<void> {
    try {
      await pg.query(sql, params);
      check(label, false);
    } catch {
      check(label, true);
    }
  }

  await expectRejected(
    '4.a XpLedgerEntry: restaurar accountId tras la transición -- RECHAZADO',
    `UPDATE xp_ledger_entry SET account_id = $1 WHERE id = $2`,
    [accountNormal, xpEntryId],
  );
  await expectRejected(
    '4.a XpLedgerEntry: volver a cambiar gamificationActorRef -- RECHAZADO',
    `UPDATE xp_ledger_entry SET gamification_actor_ref = $1 WHERE id = $2`,
    [gamificationActorRef(accountNormal, secretG2), xpEntryId],
  );
  await expectRejected('4.a XpLedgerEntry: limpiar gamificationActorRef -- RECHAZADO', `UPDATE xp_ledger_entry SET gamification_actor_ref = NULL WHERE id = $1`, [
    xpEntryId,
  ]);

  await expectRejected(
    '4.b LeaguePointLedgerEntry: restaurar accountId -- RECHAZADO',
    `UPDATE league_point_ledger_entry SET account_id = $1 WHERE id = $2`,
    [accountNormal, lpEntryId],
  );
  await expectRejected(
    '4.b LeaguePointLedgerEntry: volver a cambiar gamificationActorRef -- RECHAZADO',
    `UPDATE league_point_ledger_entry SET gamification_actor_ref = $1 WHERE id = $2`,
    [gamificationActorRef(accountNormal, secretG2), lpEntryId],
  );

  await expectRejected(
    '4.c AchievementProgress: restaurar accountId -- RECHAZADO',
    `UPDATE achievement_progress SET account_id = $1 WHERE id = $2`,
    [accountNormal, achProgressId],
  );
  await expectRejected(
    '4.c AchievementProgress: volver a cambiar gamificationActorRef -- RECHAZADO',
    `UPDATE achievement_progress SET gamification_actor_ref = $1 WHERE id = $2`,
    [gamificationActorRef(accountNormal, secretG2), achProgressId],
  );

  await expectRejected(
    '4.d AchievementUnlock: restaurar accountId -- RECHAZADO',
    `UPDATE achievement_unlock SET account_id = $1 WHERE id = $2`,
    [accountNormal, achUnlockId],
  );
  await expectRejected(
    '4.d AchievementUnlock: volver a cambiar gamificationActorRef -- RECHAZADO',
    `UPDATE achievement_unlock SET gamification_actor_ref = $1 WHERE id = $2`,
    [gamificationActorRef(accountNormal, secretG2), achUnlockId],
  );

  // ==========================================================================
  console.log('--- 5. Inmutabilidad de negocio (un cambio simultáneo de campo protegido debe seguir fallando) ---');

  const xpEntryId2 = randomUUID();
  const accountNormal2 = randomUUID();
  await pg.query(
    `INSERT INTO xp_ledger_entry (id, account_id, validated_activity_id, xp_rule_id, entry_type, xp_amount, idempotency_key, occurred_at)
     VALUES ($1, $2, NULL, $3, 'OTORGAMIENTO', 10, $4, $5)`,
    [xpEntryId2, accountNormal2, xpRuleId, `xp-b1-gate-2-${suffix}`, now],
  );
  await expectRejected(
    '5.a XpLedgerEntry (fila real): transición de identidad + xpAmount distinto en la MISMA operación -- RECHAZADO',
    `UPDATE xp_ledger_entry SET account_id = NULL, gamification_actor_ref = $1, xp_amount = 999 WHERE id = $2`,
    [gamificationActorRef(accountNormal2, secretG1), xpEntryId2],
  );
  const xpEntry2Untouched = await pg.query('SELECT xp_amount, account_id FROM xp_ledger_entry WHERE id = $1', [xpEntryId2]);
  check('5.a XpLedgerEntry (fila real): xp_amount y account_id SIN cambios tras el intento rechazado', xpEntry2Untouched.rows[0].xp_amount === 10 && xpEntry2Untouched.rows[0].account_id === accountNormal2);

  const achProgressId2 = randomUUID();
  const accountNormal3 = randomUUID();
  await pg.query(
    `INSERT INTO achievement_progress (id, account_id, achievement_definition_id, achievement_version_id, current_value, target_value, updated_at)
     VALUES ($1, $2, $3, $4, 0, 1, $5)`,
    [achProgressId2, accountNormal3, achDefId, achVersionId, now],
  );
  await expectRejected(
    '5.b AchievementProgress: transición de identidad + achievementDefinitionId distinto en la MISMA operación -- RECHAZADO',
    `UPDATE achievement_progress SET account_id = NULL, gamification_actor_ref = $1, achievement_definition_id = $2 WHERE id = $3`,
    [gamificationActorRef(accountNormal3, secretG1), randomUUID(), achProgressId2],
  );

  // ==========================================================================
  console.log('--- 6. Ninguna escritura NUEVA de cuenta ACTIVA acepta accountId=null (guardias de servicio, no solo la columna) ---');

  const { XpGrantService } = await import('../src/gamification/xp-grant.service');
  const { LeaguePointGrantService } = await import('../src/gamification/league-point-grant.service');

  const fakeActivityNoAccount = { id: randomUUID(), accountId: null, occurredAt: now, activityType: 'RESPUESTA_VALIDADA' } as unknown as Parameters<
    InstanceType<typeof XpGrantService>['grantForActivity']
  >[0];

  const xpServiceForGuardCheck = new (XpGrantService as unknown as new (...args: unknown[]) => InstanceType<typeof XpGrantService>)(
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  );
  let xpGuardThrew = false;
  try {
    await xpServiceForGuardCheck.grantForActivity(fakeActivityNoAccount);
  } catch {
    xpGuardThrew = true;
  }
  check('6.a XpGrantService.grantForActivity con accountId=null: rechaza explícitamente (nunca otorga XP sin cuenta real)', xpGuardThrew);

  const lpServiceForGuardCheck = new (LeaguePointGrantService as unknown as new (...args: unknown[]) => InstanceType<typeof LeaguePointGrantService>)(
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  );
  const lpGuardResult = await lpServiceForGuardCheck.grantForActivity(fakeActivityNoAccount as never);
  check(
    '6.b LeaguePointGrantService.grantForActivity con accountId=null: NOT_PARTICIPATING (nunca otorga LP sin cuenta real)',
    lpGuardResult.outcome === 'NOT_PARTICIPATING',
  );

  // ==========================================================================
  console.log('--- 7. Consultas de descubrimiento/candidatos NUNCA resurgen una fila ya desidentificada ---');

  const { SeasonLeagueParticipationRepository } = await import('../src/gamification/season-league-participation.repository');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { PrismaClient } = await import('../src/generated/prisma/client');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as import('../src/platform/prisma/prisma.service').PrismaService;
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);

  const activeAccountIds = await participationRepo.findAllActiveAccountIds();
  check(
    '7.a findAllActiveAccountIds: la participación desidentificada (§3.g) NUNCA aparece',
    !activeAccountIds.includes(accountNormal) && !activeAccountIds.some((id) => id === null),
  );

  const { RewardEvaluationWorker } = await import('../src/gamification/reward-evaluation.worker');
  const { XpLedgerEntryRepository } = await import('../src/gamification/xp-ledger-entry.repository');
  const { RewardEvaluationCursorRepository } = await import('../src/gamification/reward-evaluation-cursor.repository');
  // Solo `discoverPendingAccounts` se ejerce aquí -- usa exclusivamente
  // prisma/ledgerRepo/cursorRepo (verificado leyendo el método). El resto
  // de las ~24 dependencias del worker quedan en `null`: nunca se tocan en
  // esta ruta, y pasarlas reales sería puro ruido para esta prueba acotada.
  const worker = new (RewardEvaluationWorker as unknown as new (...args: unknown[]) => InstanceType<typeof RewardEvaluationWorker>)(
    prisma,
    new XpLedgerEntryRepository(prisma),
    new RewardEvaluationCursorRepository(prisma),
    ...Array(23).fill(null),
  );
  const pendingAccounts = await worker.discoverPendingAccounts();
  check(
    '7.b discoverPendingAccounts: la cuenta cuya xp_ledger_entry ya está desidentificada (§3.a) NUNCA resurge',
    !pendingAccounts.includes(accountNormal),
  );

  // ==========================================================================
  console.log('--- 8. WEB-0D.1C-B1-R1 -- invariante de estado de identidad (CHECK) en los 7 modelos ---');

  type IdentityRowSpec = {
    label: string;
    table: string;
    columns: string[]; // sin id/account_id/gamification_actor_ref -- se anteponen aparte
    values: (accountId: string | null, actorRef: string | null) => unknown[];
  };

  const identitySpecs: IdentityRowSpec[] = [
    {
      label: 'ValidatedGamificationActivity',
      table: 'validated_gamification_activity',
      columns: ['source_domain', 'source_entity_type', 'source_entity_id', 'activity_type', 'validation_status', 'validation_rule_version', 'occurred_at', 'deduplication_key', 'integrity_status'],
      values: () => ['GATE', 'GATE_ENTITY', randomUUID(), 'RESPUESTA_VALIDADA', 'VALID', 'v1', now.toISOString(), `identity-vga-${randomUUID()}`, 'INTACT'],
    },
    {
      label: 'XpLedgerEntry',
      table: 'xp_ledger_entry',
      columns: ['xp_rule_id', 'entry_type', 'xp_amount', 'idempotency_key', 'occurred_at'],
      values: () => [xpRuleId, 'OTORGAMIENTO', 5, `identity-xp-${randomUUID()}`, now.toISOString()],
    },
    {
      label: 'RewardGrant',
      table: 'reward_grant',
      columns: ['reward_bundle_id', 'source_entity_type', 'source_entity_id', 'idempotency_key'],
      values: () => [bundleId, 'ACHIEVEMENT_UNLOCK', randomUUID(), `identity-reward-${randomUUID()}`],
    },
    {
      label: 'AchievementProgress',
      table: 'achievement_progress',
      columns: ['achievement_definition_id', 'achievement_version_id', 'current_value', 'target_value', 'updated_at'],
      values: () => [achDefId, achVersionId, 0, 1, now.toISOString()],
    },
    {
      label: 'AchievementUnlock',
      table: 'achievement_unlock',
      columns: ['achievement_definition_id', 'achievement_version_id', 'unlock_instance', 'unlocked_at'],
      values: () => [achDefId, achVersionId, 1, now.toISOString()],
    },
    {
      label: 'SeasonLeagueParticipation',
      table: 'season_league_participation',
      columns: ['game_season_id', 'league_definition_id', 'league_group_id', 'joined_at'],
      values: () => [seasonId, leagueDefId, leagueGroupId, lpOccurredAt.toISOString()],
    },
    {
      label: 'LeaguePointLedgerEntry',
      table: 'league_point_ledger_entry',
      columns: ['season_league_participation_id', 'validated_activity_id', 'league_point_rule_id', 'entry_type', 'point_amount', 'idempotency_key', 'occurred_at'],
      values: () => [participationId, vgaId, lpRuleId, 'OTORGAMIENTO', 1, `identity-lp-${randomUUID()}`, lpOccurredAt.toISOString()],
    },
  ];

  async function insertIdentityRow(spec: IdentityRowSpec, accountId: string | null, actorRef: string | null): Promise<string | null> {
    const id = randomUUID();
    const cols = ['id', 'account_id', 'gamification_actor_ref', ...spec.columns];
    const vals = [id, accountId, actorRef, ...spec.values(accountId, actorRef)];
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    try {
      await pg.query(`INSERT INTO ${spec.table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders})`, vals);
      return id;
    } catch {
      return null;
    }
  }

  for (const spec of identitySpecs) {
    // A. fila IDENTIFICABLE válida -- accountId real, actorRef NULL -- debe insertarse.
    const idA = await insertIdentityRow(spec, randomUUID(), null);
    check(`8.${spec.label}.A fila identificable válida -> insert SUCEDE`, idA !== null);

    // B. fila PSEUDONIMIZADA válida -- accountId NULL, actorRef real -- debe insertarse.
    const idB = await insertIdentityRow(spec, null, gamificationActorRef(randomUUID(), secretG1));
    check(`8.${spec.label}.B fila pseudonimizada válida -> insert SUCEDE`, idB !== null);

    // C. AMBOS presentes -- debe FALLAR por el CHECK.
    const idC = await insertIdentityRow(spec, randomUUID(), gamificationActorRef(randomUUID(), secretG1));
    check(`8.${spec.label}.C accountId+actorRef AMBOS presentes -> insert RECHAZADO`, idC === null);

    // D. NINGUNO presente -- debe FALLAR por el CHECK.
    const idD = await insertIdentityRow(spec, null, null);
    check(`8.${spec.label}.D accountId+actorRef AMBOS ausentes -> insert RECHAZADO`, idD === null);
  }

  // ==========================================================================
  console.log('--- 9. WEB-0D.1C-B1-R1 -- unicidad lógica espejada (actorRef) en los 3 modelos afectados ---');

  // AchievementProgress: @@unique([accountId, achievementDefinitionId]) -> espejo (actorRef, achievementDefinitionId).
  {
    const accE1 = randomUUID();
    const idE1 = await insertIdentityRow(identitySpecs[3]!, accE1, null);
    const idE2 = await insertIdentityRow(identitySpecs[3]!, accE1, null); // MISMA cuenta, mismo achievementDefinitionId -> viola unicidad vieja
    check('9.AchievementProgress.E dos filas identificables, MISMA cuenta + mismo achievementDefinitionId -> RECHAZADO (unicidad vieja intacta)', idE1 !== null && idE2 === null);

    const refF = gamificationActorRef(randomUUID(), secretG1);
    const idF1 = await insertIdentityRow(identitySpecs[3]!, null, refF);
    const idF2 = await insertIdentityRow(identitySpecs[3]!, null, refF); // MISMO actorRef, mismo achievementDefinitionId -> debe violar el espejo
    check('9.AchievementProgress.F dos filas pseudonimizadas, MISMO actorRef + mismo achievementDefinitionId -> RECHAZADO (espejo nuevo)', idF1 !== null && idF2 === null);

    const idG1 = await insertIdentityRow(identitySpecs[3]!, null, gamificationActorRef(randomUUID(), secretG1));
    const idG2 = await insertIdentityRow(identitySpecs[3]!, null, gamificationActorRef(randomUUID(), secretG1)); // actorRefs DISTINTOS, mismo achievementDefinitionId -> permitido
    check('9.AchievementProgress.G actorRefs DISTINTOS + mismo achievementDefinitionId -> PERMITIDO', idG1 !== null && idG2 !== null);
  }

  // AchievementUnlock: @@unique([accountId, achievementDefinitionId, unlockInstance]) -> espejo (actorRef, achievementDefinitionId, unlockInstance).
  {
    const accE1 = randomUUID();
    const idE1 = await insertIdentityRow(identitySpecs[4]!, accE1, null);
    const idE2 = await insertIdentityRow(identitySpecs[4]!, accE1, null);
    check('9.AchievementUnlock.E dos filas identificables, MISMA cuenta + mismo (achievementDefinitionId, unlockInstance) -> RECHAZADO', idE1 !== null && idE2 === null);

    const refF = gamificationActorRef(randomUUID(), secretG1);
    const idF1 = await insertIdentityRow(identitySpecs[4]!, null, refF);
    const idF2 = await insertIdentityRow(identitySpecs[4]!, null, refF);
    check('9.AchievementUnlock.F dos filas pseudonimizadas, MISMO actorRef + misma clave de negocio -> RECHAZADO (espejo nuevo)', idF1 !== null && idF2 === null);

    const idG1 = await insertIdentityRow(identitySpecs[4]!, null, gamificationActorRef(randomUUID(), secretG1));
    const idG2 = await insertIdentityRow(identitySpecs[4]!, null, gamificationActorRef(randomUUID(), secretG1));
    check('9.AchievementUnlock.G actorRefs DISTINTOS + misma clave de negocio -> PERMITIDO', idG1 !== null && idG2 !== null);
  }

  // SeasonLeagueParticipation: @@unique([accountId, gameSeasonId]) -> espejo (actorRef, gameSeasonId).
  {
    const accE1 = randomUUID();
    const idE1 = await insertIdentityRow(identitySpecs[5]!, accE1, null);
    const idE2 = await insertIdentityRow(identitySpecs[5]!, accE1, null);
    check('9.SeasonLeagueParticipation.E dos filas identificables, MISMA cuenta + misma temporada -> RECHAZADO', idE1 !== null && idE2 === null);

    const refF = gamificationActorRef(randomUUID(), secretG1);
    const idF1 = await insertIdentityRow(identitySpecs[5]!, null, refF);
    const idF2 = await insertIdentityRow(identitySpecs[5]!, null, refF);
    check('9.SeasonLeagueParticipation.F dos filas pseudonimizadas, MISMO actorRef + misma temporada -> RECHAZADO (espejo nuevo)', idF1 !== null && idF2 === null);

    const idG1 = await insertIdentityRow(identitySpecs[5]!, null, gamificationActorRef(randomUUID(), secretG1));
    const idG2 = await insertIdentityRow(identitySpecs[5]!, null, gamificationActorRef(randomUUID(), secretG1));
    check('9.SeasonLeagueParticipation.G actorRefs DISTINTOS + misma temporada -> PERMITIDO', idG1 !== null && idG2 !== null);
  }

  // ==========================================================================
  console.log('--- 10. WEB-0D.1C-B1-R1 -- la transición atómica de privacidad sigue siendo compatible con el CHECK ---');
  {
    const accH = randomUUID();
    const idH = await insertIdentityRow(identitySpecs[1]!, accH, null); // XpLedgerEntry identificable fresco
    check('10.a fila identificable fresca insertada', idH !== null);
    const refH = gamificationActorRef(accH, secretG1);
    let transitionOk = false;
    try {
      await pg.query(`UPDATE xp_ledger_entry SET account_id = NULL, gamification_actor_ref = $1 WHERE id = $2`, [refH, idH]);
      transitionOk = true;
    } catch {
      transitionOk = false;
    }
    check('10.b transición atómica (accountId->NULL + actorRef en la MISMA sentencia) SIGUE funcionando con el CHECK activo', transitionOk);
  }

  await retireOwnXpCoreFixture();
  await retireOwnLpRuleFixture();

  await prisma.$disconnect();
  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de primitiva de pseudónimo + soporte de esquema de GAMIFICATION (WEB-0D.1C-B1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
