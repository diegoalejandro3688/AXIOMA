// STABILIZATION-B7 -- gate de SEGURIDAD de los gates de liga.
//
// B5A: un `verify-*-gate.ts` invocado DIRECTAMENTE (sin run-gate.ts) FINALIZÓ
// la temporada real `comp-v1-2026-08-31` sobre `axioma_dev` con una "higiene"
// de la forma `UPDATE game_season SET status='FINALIZED' WHERE status='ACTIVE'`.
//
// Este gate prueba, de forma mayormente ESTÁTICA (lectura de fuente) + una
// pequeña parte ejecutable, que:
//   1. ningún gate de liga contiene ya esa finalización global sin filtro,
//   2. todo gate que puede mutar estado de temporada/liga importa
//      `gate-db-safety` y llama `assertGateDb` como salvaguarda de
//      invocación directa,
//   3. la higiene namespaced (`finalizeStaleGateSeasons` /
//      `retireStaleGateLeagues`) sólo toca fixtures con marca epoch, nunca
//      una temporada/liga real.
//
// Se ejecuta vía run-gate.ts (axioma_gates_dev). No necesita servidor HTTP.
import 'dotenv/config';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { assertGateDb, finalizeStaleGateSeasons, retireStaleGateLeagues, GATE_FIXTURE_KEY_SQL_REGEX } from './gate-db-safety';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const SCRIPTS_DIR = __dirname;

/** Finalización global de temporadas ACTIVE sin ningún filtro adicional (season_key / id). */
const FORBIDDEN_GLOBAL_SEASON_FINALIZE = /UPDATE\s+game_season\s+SET\s+status\s*=\s*'FINALIZED'[^;]*WHERE\s+status\s*=\s*'ACTIVE'\s*(?:"|')/i;
/** Retiro global de ligas ACTIVE sin filtro por league_key. */
const FORBIDDEN_GLOBAL_LEAGUE_RETIRE = /UPDATE\s+league_definition\s+SET\s+status\s*=\s*'RETIRED'[^;]*WHERE\s+status\s*=\s*'ACTIVE'\s*(?:"|')/i;

/**
 * Gates que ESCRIBEN estado de temporada/liga/participación: SQL directo
 * sobre esas tablas, `prisma.<tabla>.create/update`, o los helpers de
 * higiene. NO basta con importar el nombre de un servicio para un test de
 * predicado puro (p.ej. `verify-gamification-serialization-conflict-gate`).
 */
function mutatesLeagueState(source: string): boolean {
  return (
    /UPDATE\s+(game_season|league_definition|season_league_participation|league_group)/i.test(source) ||
    /INSERT\s+INTO\s+(game_season|league_definition|season_league_participation|league_group)/i.test(source) ||
    /prisma\.(gameSeason|leagueDefinition|seasonLeagueParticipation|leagueGroup)\.(create|update|updateMany|upsert|delete)/.test(source) ||
    /finalizeStaleGateSeasons|retireStaleGateLeagues|retireOtherActiveLeagues/.test(source) ||
    /\bnew LeagueEnrollmentService\(|\bnew SeasonTransitionService\(|\bnew LeaderboardFinalizationService\(/.test(source)
  );
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await assertGateDb(pg);

  const files = readdirSync(SCRIPTS_DIR).filter((f) => f.startsWith('verify-') && f.endsWith('-gate.ts'));

  console.log('--- 1. Ningún gate contiene la finalización/retiro GLOBAL sin filtro ---');
  const offendersFinalize: string[] = [];
  const offendersRetire: string[] = [];
  for (const file of files) {
    const source = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
    if (FORBIDDEN_GLOBAL_SEASON_FINALIZE.test(source)) offendersFinalize.push(file);
    if (FORBIDDEN_GLOBAL_LEAGUE_RETIRE.test(source)) offendersRetire.push(file);
  }
  check(`ningún gate finaliza game_season globalmente (offenders: ${offendersFinalize.join(', ') || 'ninguno'})`, offendersFinalize.length === 0);
  check(`ningún gate retira league_definition globalmente (offenders: ${offendersRetire.join(', ') || 'ninguno'})`, offendersRetire.length === 0);

  console.log('--- 2. Todo gate que muta estado de liga llama assertGateDb + importa gate-db-safety ---');
  const missingGuard: string[] = [];
  for (const file of files) {
    if (file === 'verify-league-gate-safety-gate.ts') continue;
    const source = readFileSync(join(SCRIPTS_DIR, file), 'utf8');
    if (!mutatesLeagueState(source)) continue;
    const importsHelper = /from '\.\/gate-db-safety'/.test(source);
    const callsAssert = /assertGateDb(ViaPrisma)?\s*\(/.test(source);
    if (!importsHelper || !callsAssert) missingGuard.push(file);
  }
  check(`todo gate mutador de estado de liga tiene la salvaguarda de invocación directa (faltan: ${missingGuard.join(', ') || 'ninguno'})`, missingGuard.length === 0);

  console.log('--- 3. La higiene namespaced NO toca una temporada real (season_key sin marca epoch) ---');
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefRepo = new LeagueDefinitionRepository(prisma);

  // 3a. Temporada "real" (clave estilo producto, sin marca epoch) ACTIVE.
  // Sufijo alfabético (NUNCA dígitos al final) -> no casa `-[0-9]{10,}$`.
  const runTag = Math.random().toString(36).slice(2, 7).replace(/[0-9]/g, 'x');
  await finalizeStaleGateSeasons(pg); // deja el terreno limpio (1 ACTIVE máx por índice único)
  const realKey = `b7safe-real-season-${runTag}`;
  const realSeason = await seasonRepo.create({ seasonKey: realKey, name: 'B7 safe real', startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 7 * 86_400_000) });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [realSeason.id]);
  const touchedReal = await finalizeStaleGateSeasons(pg);
  const realStill = await seasonRepo.findById(realSeason.id);
  check('finalizeStaleGateSeasons no tocó la temporada de clave real', touchedReal === 0 && realStill?.status === 'ACTIVE');
  check(`la regex de fixture "${GATE_FIXTURE_KEY_SQL_REGEX}" NO casa la clave real "${realKey}"`, !new RegExp(GATE_FIXTURE_KEY_SQL_REGEX).test(realKey));
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [realSeason.id]);

  // 3b. Temporada fixture (marca epoch) ACTIVE -> SÍ se finaliza.
  const fixtureKey = `b7safe-fixture-${Date.now()}`;
  const fixtureSeason = await seasonRepo.create({ seasonKey: fixtureKey, name: 'B7 safe fixture', startsAt: new Date(Date.now() - 3600_000), endsAt: new Date(Date.now() + 7 * 86_400_000) });
  await pg.query("UPDATE game_season SET status = 'ACTIVE' WHERE id = $1", [fixtureSeason.id]);
  const touchedFixture = await finalizeStaleGateSeasons(pg);
  const fixtureAfter = await seasonRepo.findById(fixtureSeason.id);
  check('finalizeStaleGateSeasons SÍ finaliza la temporada fixture (marca epoch)', touchedFixture === 1 && fixtureAfter?.status === 'FINALIZED');

  // 3c. Liga "real" (clave sin marca epoch) ACTIVE -> retireStaleGateLeagues NO la toca.
  const realLeagueKey = `b7safe-real-league-${runTag}`;
  const realLeague = await leagueDefRepo.create({ leagueKey: realLeagueKey, name: 'B7 safe real league', tierOrder: 990, participantGroupSize: 30 });
  const touchedRealLeague = await retireStaleGateLeagues(pg);
  const realLeagueAfter = await leagueDefRepo.findById(realLeague.id);
  check('retireStaleGateLeagues no tocó la liga de clave real', realLeagueAfter?.status === 'ACTIVE' && !new RegExp(GATE_FIXTURE_KEY_SQL_REGEX).test(realLeagueKey));
  await pg.query("UPDATE league_definition SET status = 'RETIRED', retired_at = now() WHERE id = $1", [realLeague.id]);

  // 3d. Liga fixture (marca epoch) ACTIVE -> SÍ se retira.
  const fixtureLeagueKey = `b7safe-fixture-league-${Date.now()}`;
  const fixtureLeague = await leagueDefRepo.create({ leagueKey: fixtureLeagueKey, name: 'B7 safe fixture league', tierOrder: 991, participantGroupSize: 30 });
  await retireStaleGateLeagues(pg);
  const fixtureLeagueAfter = await leagueDefRepo.findById(fixtureLeague.id);
  check('retireStaleGateLeagues SÍ retira la liga fixture (marca epoch)', fixtureLeagueAfter?.status === 'RETIRED');
  void touchedRealLeague;

  // Limpieza -- fixtures propios de este run (nada los referencia).
  await pg.query('DELETE FROM game_season WHERE season_key = ANY($1)', [[realKey, fixtureKey]]).catch(() => undefined);
  await pg.query('DELETE FROM league_definition WHERE league_key = ANY($1)', [[realLeagueKey, fixtureLeagueKey]]).catch(() => undefined);

  await prisma.$disconnect();
  await pg.end();

  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de seguridad de gates de liga pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
