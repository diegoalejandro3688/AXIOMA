/**
 * COMPETITIVE V1 -- provisiona UNA temporada real de 7 días para QA
 * local/dev y el primer lanzamiento V1.
 *
 * NO es orquestación recurrente. La generación automática de temporada
 * siguiente / recurrencia infinita sigue siendo:
 *
 *     ⚪ RELEASE PREPARATION BLOCKER -- recurring season orchestration
 *
 * Este script solo enciende la PRIMERA temporada.
 *
 * Comportamiento:
 *   - IDEMPOTENTE -- si ya hay una `game_season` ACTIVE, la reporta y no crea otra.
 *   - Nunca crea temporadas solapadas (respeta el índice único parcial "una
 *     sola ACTIVE" y la guarda de `SeasonTransitionService`).
 *   - Crea la fila vía `GameSeasonRepository.create` (nace SCHEDULED,
 *     `startsAt = now`, `endsAt = now + 7d`) y la activa por el camino REAL
 *     `SeasonTransitionService.activateScheduledSeasons()` -- sin bypass de
 *     invariantes, sin esperar al cron horario.
 *   - EXPLÍCITO -- solo corre cuando se invoca a mano; nunca en el arranque
 *     del backend, nunca como side effect de un import.
 *
 * Uso:
 *   pnpm --filter @axioma/backend competitive:ensure-first-season
 *   pnpm --filter @axioma/backend competitive:ensure-first-season -- --dry-run
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { SeasonTransitionService } from '../src/gamification/season-transition.service';
import { LEAGUE_V1_SEASON_DURATION_DAYS, COMPETITIVE_V1_SEASON_KEY_PREFIX, COMPETITIVE_V1_SEASON_NAME } from '../src/gamification/competitive-v1-config';

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function ensureFirstCompetitiveSeason({ dryRun }: { dryRun: boolean }): Promise<void> {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) }) as unknown as PrismaService;
  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueGroupRepo = new LeagueGroupRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const transitionService = new SeasonTransitionService(prisma, seasonRepo, leagueGroupRepo, participationRepo);

  console.log(`=== COMPETITIVE V1 -- primera temporada ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

  const existing = await seasonRepo.findActive();
  if (existing) {
    console.log('  YA EXISTE una temporada ACTIVE -- no se crea otra:');
    console.log(`    seasonKey : ${existing.seasonKey}`);
    console.log(`    name      : ${existing.name}`);
    console.log(`    startsAt  : ${existing.startsAt.toISOString()}`);
    console.log(`    endsAt    : ${existing.endsAt.toISOString()}`);
    const remainingMs = existing.endsAt.getTime() - Date.now();
    console.log(`    restante  : ${remainingMs > 0 ? `${Math.floor(remainingMs / DAY_MS)} d ${Math.floor((remainingMs % DAY_MS) / (60 * 60 * 1000))} h` : 'EXPIRADA (pendiente de cierre por el scheduler)'}`);
    await (prisma as unknown as PrismaClient).$disconnect();
    console.log('\n=== Reutilizada ===');
    return;
  }

  const now = new Date();
  const startsAt = now;
  const endsAt = new Date(now.getTime() + LEAGUE_V1_SEASON_DURATION_DAYS * DAY_MS);
  const seasonKey = `${COMPETITIVE_V1_SEASON_KEY_PREFIX}-${isoDate(startsAt)}`;

  if (dryRun) {
    console.log('  CREARÍA + ACTIVARÍA:');
    console.log(`    seasonKey : ${seasonKey}`);
    console.log(`    name      : ${COMPETITIVE_V1_SEASON_NAME}`);
    console.log(`    startsAt  : ${startsAt.toISOString()}`);
    console.log(`    endsAt    : ${endsAt.toISOString()} (+${LEAGUE_V1_SEASON_DURATION_DAYS} d)`);
    await (prisma as unknown as PrismaClient).$disconnect();
    console.log('\n=== DRY RUN ===');
    return;
  }

  let created;
  try {
    created = await seasonRepo.create({
      seasonKey,
      name: COMPETITIVE_V1_SEASON_NAME,
      description: `Temporada V1 de 7 días -- ${isoDate(startsAt)} a ${isoDate(endsAt)}`,
      startsAt,
      endsAt,
      rankingRuleVersion: 'sum-league-points-v1',
      rewardPolicyVersion: 'league-frame-v1',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Colisión de `seasonKey` (@unique) -- ya se creó hoy una temporada que
    // luego se finalizó/archivó. Se reporta, no se rompe silenciosamente.
    console.error(`  No se pudo crear la temporada "${seasonKey}": ${message}`);
    console.error('  Si ya existe una fila con ese seasonKey (no ACTIVE), resuélvela manualmente o espera al día siguiente.');
    await (prisma as unknown as PrismaClient).$disconnect();
    process.exit(1);
  }

  console.log(`  CREADA (SCHEDULED): ${created.seasonKey} -- ${created.startsAt.toISOString()} → ${created.endsAt.toISOString()}`);

  const { activated, skippedOverlap } = await transitionService.activateScheduledSeasons();
  console.log(`  activateScheduledSeasons(): ${activated} activada(s), ${skippedOverlap} omitida(s) por solapamiento`);

  const nowActive = await seasonRepo.findActive();
  await (prisma as unknown as PrismaClient).$disconnect();

  if (!nowActive || nowActive.id !== created.id) {
    console.error('  La temporada creada NO quedó ACTIVE -- revisa si hay otra ACTIVE bloqueando la activación.');
    process.exit(1);
  }
  console.log('\n  ACTIVA:');
  console.log(`    seasonKey : ${nowActive.seasonKey}`);
  console.log(`    name      : ${nowActive.name}`);
  console.log(`    startsAt  : ${nowActive.startsAt.toISOString()}`);
  console.log(`    endsAt    : ${nowActive.endsAt.toISOString()}`);
  console.log('\n=== Creada y activada ===');
}

if (require.main === module) {
  ensureFirstCompetitiveSeason({ dryRun: process.argv.slice(2).includes('--dry-run') }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
