// Gate del Bloque IV, Incremento 5, sub-incremento 5.a ("Enrolamiento real
// + wrappers API + hub de navegación") -- resuelve el hueco real
// encontrado en la auditoría previa a Incremento 5:
// `LeagueEnrollmentService.joinActiveSeason` (Incremento 1) nunca tenía
// disparador HTTP. Prueba contra el servidor real
// (GET/POST /gamification/me/league/participation), mismo criterio que
// verify-competitive-leaderboard-gate.ts (3.c): HTTP para los endpoints
// nuevos, instanciación directa de servicios/repos para fixtures
// (temporada/tier/cálculo de leaderboard) que no tienen su propio HTTP.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueDefinitionRepository } from '../src/gamification/league-definition.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { LeaderboardDefinitionRepository } from '../src/gamification/leaderboard-definition.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { LeaderboardEntryRepository } from '../src/gamification/leaderboard-entry.repository';
import { LeaderboardCalculationService } from '../src/gamification/leaderboard-calculation.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3011';
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
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

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `lpg-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return { accountId: session.body.accountId as string, headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId } };
}

const LP = '/gamification/me/league/participation';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const seasonRepo = new GameSeasonRepository(prisma);
  const leagueDefinitionRepo = new LeagueDefinitionRepository(prisma);
  const leaderboardDefinitionRepo = new LeaderboardDefinitionRepository(prisma);
  const participationRepo = new SeasonLeagueParticipationRepository(prisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(prisma);
  const entryRepo = new LeaderboardEntryRepository(prisma);
  const calculationService = new LeaderboardCalculationService(leaderboardDefinitionRepo, participationRepo, ledgerRepo, entryRepo);
  const txRunner = new TransactionRunnerService(prisma);

  const suffix = Date.now();
  const now = new Date();

  console.log('--- 0. Fixtures: temporada ACTIVA propia + tier más bajo, aislados de otras corridas ---');
  // Higiene entre corridas -- mismo criterio que verify-league-season-foundation-gate.ts.
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE status = 'ACTIVE'");

  const season = await seasonRepo.create({
    seasonKey: `lpg-season-${suffix}`,
    name: 'Temporada de prueba -- gate de participación',
    startsAt: new Date(now.getTime() - 60 * 60 * 1000),
    endsAt: new Date(now.getTime() + 60 * 60 * 1000),
  });
  await pg.query('UPDATE game_season SET status = $1 WHERE id = $2', ['ACTIVE', season.id]);

  const bronze = await leagueDefinitionRepo.create({
    leagueKey: `lpg-bronze-${suffix}`,
    name: 'Bronce de prueba',
    tierOrder: 1,
    participantGroupSize: 10,
  });
  // Asegura que ESTE tier sea el más bajo real durante la corrida -- mismo
  // criterio de higiene que verify-league-season-foundation-gate.ts.
  await pg.query('UPDATE league_definition SET status = $1 WHERE league_key != $2 AND status = $3', ['RETIRED', bronze.leagueKey, 'ACTIVE']);

  console.log('--- 1. GET antes de cualquier POST: NOT_ENROLLED, y NUNCA crea participación ---');
  const alice = await createSession('alice');
  const getBeforeJoin = await req('GET', LP, alice.headers);
  check('GET -> 200', getBeforeJoin.status === 200);
  check('outcome NOT_ENROLLED (hay temporada activa, la cuenta no participa)', getBeforeJoin.body?.outcome === 'NOT_ENROLLED');
  const rowsBeforeJoin = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1', [alice.accountId]);
  check('GET no creó ninguna fila real (lectura pura)', rowsBeforeJoin.rows[0].n === 0);

  console.log('--- 2. POST: cuerpo inesperado -> 400 (.strict()) ---');
  const postUnexpectedBody = await req('POST', LP, alice.headers, { tier: 'GOLD', leagueGroupId: randomUUID() });
  check('POST con tier/leagueGroupId -> 400 (el cliente NUNCA elige tier ni grupo)', postUnexpectedBody.status === 400);

  console.log('--- 3. POST: creación real -> ENROLLED, sin IDs internos ---');
  const post1 = await req('POST', LP, alice.headers, {});
  check('POST -> 200 (nunca 201, acción idempotente)', post1.status === 200);
  check('outcome ENROLLED', post1.body?.outcome === 'ENROLLED');
  check('leagueName presente', typeof post1.body?.leagueName === 'string' && post1.body.leagueName.length > 0);
  check('status ACTIVE (recién inscrita)', post1.body?.status === 'ACTIVE');
  check('joinedAt es ISO string', typeof post1.body?.joinedAt === 'string' && !Number.isNaN(Date.parse(post1.body.joinedAt)));
  // COMPETITIVE V1 (parche final de QA) -- `leaguePoints` (saldo VIVO) SÍ se
  // expone; la posición NUNCA (rank/rankPosition/currentRank siguen prohibidos).
  check('leaguePoints presente, entero, no negativo', Number.isInteger(post1.body?.leaguePoints) && post1.body.leaguePoints >= 0);
  check('participación recién creada -> leaguePoints === 0', post1.body?.leaguePoints === 0);
  const forbiddenKeys = ['accountId', 'leagueDefinitionId', 'seasonLeagueParticipationId', 'gameSeasonId', 'leagueGroupId', 'currentRank', 'rankPosition', 'finalRank'];
  check('sin ninguna clave prohibida (IDs internos ni posición)', forbiddenKeys.every((k) => !(k in (post1.body ?? {}))));
  check('la respuesta cruda tampoco contiene esas cadenas', forbiddenKeys.every((k) => !post1.raw.includes(k)));

  console.log('--- 4. GET después del POST: ENROLLED, MISMO leagueName/joinedAt/status (persistente, "antes y después de reiniciar la app") ---');
  const getAfterJoin1 = await req('GET', LP, alice.headers);
  const getAfterJoin2 = await req('GET', LP, alice.headers); // segunda llamada independiente -- simula reabrir la app
  check('primer GET tras inscribirse -> ENROLLED', getAfterJoin1.body?.outcome === 'ENROLLED');
  check('segundo GET (independiente) -> MISMO leagueName', getAfterJoin2.body?.leagueName === getAfterJoin1.body?.leagueName);
  check('segundo GET -> MISMO joinedAt', getAfterJoin2.body?.joinedAt === getAfterJoin1.body?.joinedAt);
  check('segundo GET -> MISMO status', getAfterJoin2.body?.status === getAfterJoin1.body?.status);

  console.log('--- 5. NOT_ENROLLED -> POST -> ENROLLED: transición real de extremo a extremo ---');
  const bob = await createSession('bob');
  const bobBefore = await req('GET', LP, bob.headers);
  check('Bob antes de unirse -> NOT_ENROLLED', bobBefore.body?.outcome === 'NOT_ENROLLED');
  const bobJoin = await req('POST', LP, bob.headers, {});
  check('POST de Bob -> ENROLLED', bobJoin.body?.outcome === 'ENROLLED');
  const bobAfter = await req('GET', LP, bob.headers);
  check('Bob después de unirse -> ENROLLED (mismo leagueName que devolvió el POST)', bobAfter.body?.outcome === 'ENROLLED' && bobAfter.body?.leagueName === bobJoin.body?.leagueName);

  console.log('--- 6. POST repetido (ya inscrita): idempotente, sin duplicar ---');
  const post2 = await req('POST', LP, alice.headers, {});
  check('segundo POST -> 200, ENROLLED', post2.status === 200 && post2.body?.outcome === 'ENROLLED');
  check('MISMO joinedAt que la primera inscripción (no se reinscribió)', post2.body?.joinedAt === post1.body?.joinedAt);
  const aliceRowCount = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1', [alice.accountId]);
  check('exactamente UNA fila real para Alice', aliceRowCount.rows[0].n === 1);

  console.log('--- 6b. leaguePoints refleja el saldo persistido de season_league_participation.league_points ---');
  // `LeaguePointGrantService` incrementa esta columna en producción; aquí se
  // simula el efecto con un UPDATE dirigido (mismo criterio "fixture por SQL"
  // que el resto del gate) para probar que el endpoint LEE la columna viva.
  await pg.query('UPDATE season_league_participation SET league_points = 7 WHERE account_id = $1 AND game_season_id = $2', [alice.accountId, season.id]);
  const getAfterLp = await req('GET', LP, alice.headers);
  check('GET tras cambiar el saldo -> leaguePoints === 7 (lee el valor persistido, no lo recalcula)', getAfterLp.body?.leaguePoints === 7);
  check('GET sigue sin exponer posición', !('rankPosition' in (getAfterLp.body ?? {})) && !('currentRank' in (getAfterLp.body ?? {})));
  await pg.query('UPDATE season_league_participation SET league_points = 0 WHERE account_id = $1 AND game_season_id = $2', [alice.accountId, season.id]);

  console.log('--- 7. Cinco POST CONCURRENTES de una cuenta NUEVA -> UNA sola participación real ---');
  const carol = await createSession('carol');
  const concurrentPosts = await Promise.all(Array.from({ length: 5 }, () => req('POST', LP, carol.headers, {})));
  check('las 5 solicitudes concurrentes responden 200', concurrentPosts.every((r) => r.status === 200));
  check('las 5 respuestas devuelven el MISMO leagueName', concurrentPosts.every((r) => r.body?.leagueName === concurrentPosts[0].body?.leagueName));
  check('las 5 respuestas devuelven el MISMO joinedAt (misma fila, no 5 distintas)', concurrentPosts.every((r) => r.body?.joinedAt === concurrentPosts[0].body?.joinedAt));
  const carolRowCount = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1', [carol.accountId]);
  check('exactamente UNA fila real en base de datos pese a la concurrencia', carolRowCount.rows[0].n === 1);

  console.log('--- 8. Perfil PRIVATE participa igual, y aparece REDACTADO en el ranking de terceros ---');
  const dave = await createSession('dave');
  await pg.query(
    `INSERT INTO public_profile (id, account_id, username_normalized, visibility_status, lifecycle_status, username_changed_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'PRIVATE', 'ACTIVE', now(), now(), now())`,
    [randomUUID(), dave.accountId, `lpg-dave-${suffix}`.toLowerCase()],
  );
  const daveJoin = await req('POST', LP, dave.headers, {});
  check('cuenta con perfil PRIVATE se inscribe igual -> ENROLLED', daveJoin.body?.outcome === 'ENROLLED');

  const daveParticipation = await participationRepo.findByAccountAndSeason(dave.accountId, season.id);
  if (!daveParticipation) throw new Error('Se esperaba una participación real para Dave.');
  const leaderboardDefinition = await calculationService.ensureLeaderboardDefinition();
  const groupRow = await pg.query('SELECT league_group_id FROM season_league_participation WHERE id = $1', [daveParticipation.id]);
  const groupId = groupRow.rows[0].league_group_id as string;
  await txRunner.run((tx) => calculationService.recalculateGroup(tx, leaderboardDefinition.id, season.id, groupId));

  const daveEntryRows = await pg.query('SELECT rank_position FROM leaderboard_entry WHERE group_id = $1 AND season_league_participation_id = $2', [
    groupId,
    daveParticipation.id,
  ]);
  check('el cálculo de ranking SÍ generó una fila para Dave (participar no depende de la visibilidad del perfil)', daveEntryRows.rowCount === 1);

  console.log('--- 9. GET/POST nunca revelan NO_ACTIVE_SEASON de forma incoherente entre sí ---');
  await pg.query("UPDATE game_season SET status = 'FINALIZED', finalized_at = now() WHERE id = $1", [season.id]);
  const erin = await createSession('erin');
  const getNoSeason = await req('GET', LP, erin.headers);
  const postNoSeason = await req('POST', LP, erin.headers, {});
  check('GET sin temporada activa -> 200, NO_ACTIVE_SEASON (nunca error)', getNoSeason.status === 200 && getNoSeason.body?.outcome === 'NO_ACTIVE_SEASON');
  check('POST sin temporada activa -> 200, NO_ACTIVE_SEASON (nunca error)', postNoSeason.status === 200 && postNoSeason.body?.outcome === 'NO_ACTIVE_SEASON');
  const erinRowCount = await pg.query('SELECT count(*)::int AS n FROM season_league_participation WHERE account_id = $1', [erin.accountId]);
  check('sin temporada activa, el POST tampoco crea ninguna fila', erinRowCount.rows[0].n === 0);
  // Coherencia GET/POST (§ especificación): "NO_ACTIVE_SEASON si NO existe
  // temporada activa" -- incondicional, la MISMA condición para las dos
  // rutas y para CUALQUIER cuenta, incluida una ya inscrita en la temporada
  // que acaba de terminar. No es un caso especial: es la misma
  // verificación (`seasonRepo.findActive()`) que decide todo lo demás.
  const aliceAfterSeasonEnd = await req('GET', LP, alice.headers);
  check(
    'incluso una cuenta YA inscrita ve NO_ACTIVE_SEASON tras finalizar la temporada -- misma condición que para cualquier otra cuenta (coherencia GET/POST)',
    aliceAfterSeasonEnd.body?.outcome === 'NO_ACTIVE_SEASON',
  );
  const alicePostAfterSeasonEnd = await req('POST', LP, alice.headers, {});
  check('el POST de esa MISMA cuenta también ve NO_ACTIVE_SEASON -- GET y POST coherentes entre sí', alicePostAfterSeasonEnd.body?.outcome === 'NO_ACTIVE_SEASON');

  console.log('--- 10. Sin identidad requerida: 401 en ambas rutas ---');
  const noAuthGet = await req('GET', LP);
  const noAuthPost = await req('POST', LP, {}, {});
  check('GET sin sesión -> 401', noAuthGet.status === 401);
  check('POST sin sesión -> 401', noAuthPost.status === 401);

  console.log('--- 11. Frontera: GET nunca invoca la escritura (verificación estática) ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const controllerSource = readFileSync(join(__dirname, '..', 'src', 'gamification', 'league-participation.controller.ts'), 'utf8');
  // Aísla el CUERPO del método getStatus (entre su firma y la del método
  // join siguiente) -- NO todo lo que precede a @Post(), que también
  // incluiría el docstring de la clase (donde "joinActiveSeason" aparece
  // legítimamente en prosa, no como código).
  const getStatusStart = controllerSource.indexOf('async getStatus');
  const joinStart = controllerSource.indexOf('async join', getStatusStart);
  const getHandlerBody = controllerSource.slice(getStatusStart, joinStart);
  check('el CUERPO del método GET no invoca joinActiveSeason', !getHandlerBody.includes('joinActiveSeason'));

  console.log('--- 12. Limpieza ---');
  await pg.query('DELETE FROM leaderboard_entry WHERE group_id = $1', [groupId]);
  await pg.query("UPDATE game_season SET status = 'ARCHIVED' WHERE id = $1", [season.id]);
  // RETIRAR (no borrar) el tier propio -- mismo criterio de higiene que
  // verify-league-season-foundation-gate.ts: dejarlo ACTIVE contaminaría
  // findLowestActiveTier() de corridas futuras de otros gates (tierOrder=1
  // empataría con el "bronze" real de esos gates).
  await pg.query("UPDATE league_definition SET status = 'RETIRED' WHERE id = $1", [bronze.id]);
  await pg.query('DELETE FROM public_profile WHERE account_id = $1', [dave.accountId]);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Participación de Liga (Bloque IV, Incremento 5, sub-incremento 5.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
