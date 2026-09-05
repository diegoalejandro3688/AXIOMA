// STABILIZATION-B7 -- elegibilidad de LP de la Pregunta rápida.
//
// El bug (B1/B5A): el móvil sumaba "+2 LP pendiente" sólo por acertar. B7
// hace que el backend sea la autoridad: `QuickLpEligibilityService.resolve`
// responde si un acierto puede realmente convertirse en LP en la temporada
// vigente, y `LeaguePointGrantService` usa EXACTAMENTE el mismo criterio
// (`findCurrentByAccountId`).
//
// Prueba:
//   1. `resolve` -> el par {eligible, reason} correcto para cada estado:
//      sin temporada vigente / temporada vigente sin participación /
//      participación en grupo OPEN / grupo LOCKED / temporada FINALIZED con
//      estado de participación ACTIVE residual.
//   2. `LeaguePointGrantService.grantForActivity` y `QuickLpEligibilityService`
//      comparten la MISMA primitiva de "participación vigente"
//      (`findCurrentByAccountId`) -- verificación estática de fuente (§19).
//
// Se ejecuta vía run-gate.ts (axioma_gates_dev). Sin servidor HTTP.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { assertGateDb, finalizeStaleGateSeasons, retireOtherActiveLeagues } from './gate-db-safety';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { QuickLpEligibilityService } from '../src/gamification/quick-lp-eligibility.service';
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
  await assertGateDb(pg);

  const suffix = Date.now();
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefRepo = new LeagueDefinitionRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const eligibility = new QuickLpEligibilityService(seasonRepo, participationRepo, leagueGroupRepo);

  const tierKey = `qle-bronze-${suffix}`;
  const tier = await leagueDefRepo.create({ leagueKey: tierKey, name: 'QLE Bronce', tierOrder: 1, participantGroupSize: 30, promotionRule: 'top-percent:20', demotionRule: 'bottom-percent:20' });
  await retireOtherActiveLeagues(pg, [tierKey]);

  async function makeActiveSeason(key: string): Promise<string> {
    await finalizeStaleGateSeasons(pg);
    const s = await seasonRepo.create({ seasonKey: key, name: key, startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 7 * 86_400_000) });
    await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [s.id]);
    return s.id;
  }
  let groupSeqNo = 0;
  async function makeGroup(seasonId: string, status: 'OPEN' | 'LOCKED'): Promise<string> {
    const id = randomUUID();
    groupSeqNo += 1;
    await pg.query(
      `INSERT INTO league_group (id, game_season_id, league_definition_id, group_number, capacity, assignment_policy_version, status, locked_at)
       VALUES ($1, $2, $3, $4, 30, 'v1', $5, $6)`,
      [id, seasonId, tier.id, groupSeqNo, status, status === 'LOCKED' ? new Date() : null],
    );
    return id;
  }
  async function makeParticipation(seasonId: string, groupId: string, accountId: string): Promise<string> {
    const id = randomUUID();
    await pg.query(
      `INSERT INTO season_league_participation (id, game_season_id, account_id, league_definition_id, league_group_id, league_points, participation_status, joined_at)
       VALUES ($1, $2, $3, $4, $5, 0, 'ACTIVE', now())`,
      [id, seasonId, accountId, tier.id, groupId],
    );
    return id;
  }

  // 1. Sin temporada vigente.
  console.log('--- 1. Sin temporada vigente -> NO_ACTIVE_SEASON ---');
  await finalizeStaleGateSeasons(pg);
  const r1 = await eligibility.resolve(randomUUID());
  check('eligible = false', r1.eligible === false);
  check("reason = 'NO_ACTIVE_SEASON'", r1.reason === 'NO_ACTIVE_SEASON');

  // 2. Temporada vigente, cuenta sin participación.
  console.log('--- 2. Temporada vigente, sin participación -> NO_ACTIVE_PARTICIPATION ---');
  const season = await makeActiveSeason(`qle-s-${suffix}`);
  const r2 = await eligibility.resolve(randomUUID());
  check('eligible = false', r2.eligible === false);
  check("reason = 'NO_ACTIVE_PARTICIPATION'", r2.reason === 'NO_ACTIVE_PARTICIPATION');

  // 3. Participación ACTIVE en grupo OPEN -> elegible.
  console.log('--- 3. Participación ACTIVE en grupo OPEN -> elegible ---');
  const acctOpen = randomUUID();
  const groupOpen = await makeGroup(season, 'OPEN');
  await makeParticipation(season, groupOpen, acctOpen);
  const r3 = await eligibility.resolve(acctOpen);
  check('eligible = true', r3.eligible === true);
  check('reason = null', r3.reason === null);

  // 4. Participación ACTIVE en grupo LOCKED -> NO elegible.
  console.log('--- 4. Participación ACTIVE en grupo LOCKED -> NO_ACTIVE_PARTICIPATION ---');
  const acctLocked = randomUUID();
  const groupLocked = await makeGroup(season, 'LOCKED');
  await makeParticipation(season, groupLocked, acctLocked);
  const r4 = await eligibility.resolve(acctLocked);
  check('eligible = false (grupo LOCKED ya no recibe LP)', r4.eligible === false);
  check("reason = 'NO_ACTIVE_PARTICIPATION'", r4.reason === 'NO_ACTIVE_PARTICIPATION');

  // 5. Temporada FINALIZED con participación de estado ACTIVE residual -> NO elegible.
  console.log('--- 5. Temporada FINALIZED + participación ACTIVE residual -> NO_ACTIVE_SEASON ---');
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [season]);
  const r5 = await eligibility.resolve(acctOpen);
  check('eligible = false (la temporada ya no está vigente)', r5.eligible === false);
  check("reason = 'NO_ACTIVE_SEASON'", r5.reason === 'NO_ACTIVE_SEASON');

  // 6. §19 -- misma primitiva de "participación vigente" en ambos lados.
  console.log('--- 6. QuickLpEligibilityService y LeaguePointGrantService comparten findCurrentByAccountId ---');
  const eligSrc = readFileSync(join(__dirname, '..', 'src', 'gamification', 'quick-lp-eligibility.service.ts'), 'utf8');
  const grantSrc = readFileSync(join(__dirname, '..', 'src', 'gamification', 'league-point-grant.service.ts'), 'utf8');
  check('QuickLpEligibilityService usa findCurrentByAccountId', eligSrc.includes('findCurrentByAccountId'));
  check('LeaguePointGrantService usa findCurrentByAccountId', grantSrc.includes('findCurrentByAccountId'));
  check('ninguno usa el antiguo findActiveByAccountId', !eligSrc.includes('findActiveByAccountId') && !grantSrc.includes('findActiveByAccountId'));

  // Limpieza.
  for (const a of [acctOpen, acctLocked]) await pg.query('DELETE FROM season_league_participation WHERE account_id = $1', [a]);
  await pg.query('DELETE FROM league_group WHERE id = ANY($1)', [[groupOpen, groupLocked]]);
  await finalizeStaleGateSeasons(pg);

  await prisma.$disconnect();
  await pg.end();

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de elegibilidad de LP de Pregunta rápida pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
