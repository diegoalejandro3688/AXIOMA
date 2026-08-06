// Gate del Bloque III, Incremento 4, sub-incremento 4.c ("Reclamación
// explícita", BLOCK-III-DEFINITION.md §4.17) -- prueba contra el servidor
// real (endpoints /gamification/me/challenges) más acceso directo a
// Postgres para fixtures/inspección, mismo patrón que
// verify-title-equipment-gate.ts (3.b). Cubre los Gates 37-41.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { ChallengeDefinitionRepository } from '../src/gamification/challenge-definition.repository';
import { AccountChallengeRepository } from '../src/gamification/account-challenge.repository';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
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
  const uid = `challenge-claim-gate-${uidSuffix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  if (session.status !== 200 || !session.body?.accountId) {
    throw new Error(`No se pudo crear la sesión de prueba (uid=${uid}): ${session.status} ${session.raw}`);
  }
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const tx = prisma as unknown as Prisma.TransactionClient;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  await pg.query("UPDATE challenge_definition SET status = 'RETIRED' WHERE challenge_key LIKE 'gate-4c-%' AND status = 'ACTIVE'");

  const rewardBundleRepo = new RewardBundleRepository(prisma);
  const titleDefinitionRepo = new TitleDefinitionRepository(prisma);
  const challengeDefinitionRepo = new ChallengeDefinitionRepository(prisma);
  const accountChallengeRepo = new AccountChallengeRepository(prisma);

  const suffix = Date.now();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  console.log('--- 0. Fixtures: título, reward_bundle (XP_BONUS + TITLE), challenge_definition, account_challenge COMPLETED ---');
  const title = await titleDefinitionRepo.create({
    titleKey: `gate-4c-title-${suffix}`,
    displayText: 'Campeón del desafío (gate 4.c)',
    rarityClass: 'RARE',
    unlockSourceType: 'CHALLENGE_CLAIM',
    visibilityStatus: 'PUBLIC',
  });
  const bundle = await rewardBundleRepo.create({
    bundleKey: `gate-4c-bundle-${suffix}`,
    name: 'Recompensa de desafío (gate 4.c)',
    items: [
      { componentType: 'XP_BONUS', xpAmount: 50 },
      { componentType: 'TITLE', referenceId: title.id },
    ],
  });
  const definitionWithReward = await challengeDefinitionRepo.create({
    challengeKey: `gate-4c-with-reward-${suffix}`,
    name: 'Desafío con recompensa (gate 4.c)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
    completionRule: JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 1 }),
    rewardBundleId: bundle.id,
    startsAt: windowStart,
    endsAt: windowEnd,
  });
  const definitionNoReward = await challengeDefinitionRepo.create({
    challengeKey: `gate-4c-no-reward-${suffix}`,
    name: 'Desafío sin recompensa configurada (gate 4.c)',
    challengeType: 'WEEKLY',
    eligibilityRule: JSON.stringify({ schemaVersion: 'v1', type: 'ALL_ACCOUNTS' }),
    completionRule: JSON.stringify({ schemaVersion: 'v1', type: 'CUMULATIVE_COUNT', targetValue: 1 }),
    rewardBundleId: null,
    startsAt: windowStart,
    endsAt: windowEnd,
  });

  async function materializeCompleted(accountId: string, definitionId: string, defWindowStart: Date, defWindowEnd: Date) {
    const { accountChallenge } = await accountChallengeRepo.createIdempotent(tx, {
      accountId,
      challengeDefinitionId: definitionId,
      targetValue: 1,
      periodStart: defWindowStart,
      periodEnd: defWindowEnd,
      acceptedAt: new Date(),
    });
    await pg.query("UPDATE account_challenge SET challenge_status = 'IN_PROGRESS' WHERE id = $1", [accountChallenge.id]);
    await pg.query("UPDATE account_challenge SET challenge_status = 'COMPLETED', completed_at = now(), progress_value = 1 WHERE id = $1", [
      accountChallenge.id,
    ]);
    return accountChallenge.id;
  }

  const alice = await createSession('alice');
  const bob = await createSession('bob');

  const aliceChallengeId = await materializeCompleted(alice.accountId, definitionWithReward.id, windowStart, windowEnd);
  check('account_challenge de Alice materializado COMPLETED', Boolean(aliceChallengeId));

  console.log('--- 1. GET /gamification/me/challenges -- lista solo los de la cuenta autenticada ---');
  const listAlice = await req('GET', '/gamification/me/challenges', alice.headers);
  check('GET -> 200', listAlice.status === 200);
  const aliceEntry = listAlice.body.challenges.find((c: { id: string }) => c.id === aliceChallengeId);
  check('el desafío de Alice aparece en su lista', Boolean(aliceEntry));
  check('challengeStatus == COMPLETED', aliceEntry?.challengeStatus === 'COMPLETED');
  check('targetValue/progressValue reflejados', aliceEntry?.targetValue === 1 && aliceEntry?.progressValue === 1);

  const listBob = await req('GET', '/gamification/me/challenges', bob.headers);
  check('GET (Bob) -> 200, sin el desafío de Alice', listBob.status === 200 && !listBob.body.challenges.some((c: { id: string }) => c.id === aliceChallengeId));

  console.log('--- 2. Gate 37: reclamar un desafío ajeno o inexistente -> 404 ---');
  const claimForeign = await req('POST', `/gamification/me/challenges/${aliceChallengeId}/claim`, bob.headers);
  check('Bob reclamando el desafío de Alice -> 404', claimForeign.status === 404);
  const claimUnknown = await req('POST', `/gamification/me/challenges/${randomUUID()}/claim`, alice.headers);
  check('reclamar un id inexistente -> 404', claimUnknown.status === 404);

  console.log('--- 3. Gate 38: reclamar antes de COMPLETED -> 409 ---');
  const { accountChallenge: inProgressChallenge } = await accountChallengeRepo.createIdempotent(tx, {
    accountId: alice.accountId,
    challengeDefinitionId: definitionWithReward.id,
    targetValue: 5,
    periodStart: new Date(windowStart.getTime() + 1), // periodStart distinto -> fila nueva, no choca con la de arriba
    periodEnd: windowEnd,
    acceptedAt: new Date(),
  });
  await pg.query("UPDATE account_challenge SET challenge_status = 'IN_PROGRESS' WHERE id = $1", [inProgressChallenge.id]);
  const claimNotCompleted = await req('POST', `/gamification/me/challenges/${inProgressChallenge.id}/claim`, alice.headers);
  check('reclamar IN_PROGRESS -> 409', claimNotCompleted.status === 409);

  console.log('--- 4. Claim real: Gate 40 (CHALLENGE_CLAIM), entrega XP_BONUS + TITLE, transición a CLAIMED (Gate 41 en el camino feliz) ---');
  const claimSuccess = await req('POST', `/gamification/me/challenges/${aliceChallengeId}/claim`, alice.headers);
  check('claim -> 200', claimSuccess.status === 200);
  check('challengeStatus == CLAIMED', claimSuccess.body.challengeStatus === 'CLAIMED');
  check('claimedAt fijado', claimSuccess.body.claimedAt != null);

  const grantRow = await pg.query(
    "SELECT * FROM reward_grant WHERE source_entity_type = 'CHALLENGE_CLAIM' AND source_entity_id = $1",
    [aliceChallengeId],
  );
  check('reward_grant creado con sourceEntityType CHALLENGE_CLAIM y sourceEntityId = account_challenge.id', grantRow.rows.length === 1);
  check(
    'idempotencyKey == reward:CHALLENGE_CLAIM:{id} (§4.4)',
    grantRow.rows[0]?.idempotency_key === `reward:CHALLENGE_CLAIM:${aliceChallengeId}`,
  );

  const componentsRow = await pg.query('SELECT component_type, delivery_status FROM reward_grant_component WHERE reward_grant_id = $1', [
    grantRow.rows[0].id,
  ]);
  check('2 componentes (XP_BONUS + TITLE), ambos DELIVERED', componentsRow.rows.length === 2 && componentsRow.rows.every((r) => r.delivery_status === 'DELIVERED'));

  const ledgerRow = await pg.query("SELECT xp_amount FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'BONO'", [alice.accountId]);
  check('xp_ledger_entry BONO creada por el claim, xp_amount == 50', ledgerRow.rows.some((r) => r.xp_amount === 50));

  const accountTitleRow = await pg.query('SELECT * FROM account_title WHERE account_id = $1 AND title_definition_id = $2', [
    alice.accountId,
    title.id,
  ]);
  check('account_title creada por el claim (acquisitionSourceType == CHALLENGE_CLAIM)', accountTitleRow.rows.length === 1 && accountTitleRow.rows[0].acquisition_source_type === 'CHALLENGE_CLAIM');

  console.log('--- 5. Gate 39: doble reclamación (secuencial) es idempotente, sin re-entregar ---');
  const claimAgain = await req('POST', `/gamification/me/challenges/${aliceChallengeId}/claim`, alice.headers);
  check('segundo claim -> 200 (idempotente, no un error)', claimAgain.status === 200);
  check('challengeStatus SIGUE CLAIMED', claimAgain.body.challengeStatus === 'CLAIMED');
  check('claimedAt SIN CAMBIOS', claimAgain.body.claimedAt === claimSuccess.body.claimedAt);

  const grantCountAfterRetry = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_id = $1', [aliceChallengeId]);
  check('sigue existiendo UN solo reward_grant tras el segundo claim', grantCountAfterRetry.rows[0].n === 1);
  const accountTitleCountAfterRetry = await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1 AND title_definition_id = $2', [
    alice.accountId,
    title.id,
  ]);
  check('sigue existiendo UNA sola account_title tras el segundo claim', accountTitleCountAfterRetry.rows[0].n === 1);

  console.log('--- 6. Claim concurrente (Gate 39): dos solicitudes simultáneas producen UN solo reward_grant ---');
  const carol = await createSession('carol');
  const carolChallengeId = await materializeCompleted(carol.accountId, definitionWithReward.id, windowStart, windowEnd);
  const [concurrentA, concurrentB] = await Promise.all([
    req('POST', `/gamification/me/challenges/${carolChallengeId}/claim`, carol.headers),
    req('POST', `/gamification/me/challenges/${carolChallengeId}/claim`, carol.headers),
  ]);
  check('ambas solicitudes concurrentes responden 200', concurrentA.status === 200 && concurrentB.status === 200);
  const carolGrantCount = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_id = $1', [carolChallengeId]);
  check('UN solo reward_grant pese a la concurrencia', carolGrantCount.rows[0].n === 1);
  const carolTitleCount = await pg.query('SELECT count(*)::int AS n FROM account_title WHERE account_id = $1 AND title_definition_id = $2', [
    carol.accountId,
    title.id,
  ]);
  check('UNA sola account_title pese a la concurrencia', carolTitleCount.rows[0].n === 1);

  console.log('--- 7. Desafío sin reward_bundle configurado: claim transiciona directo a CLAIMED, sin reward_grant ---');
  const daveChallengeId = await materializeCompleted(bob.accountId, definitionNoReward.id, windowStart, windowEnd);
  const claimNoReward = await req('POST', `/gamification/me/challenges/${daveChallengeId}/claim`, bob.headers);
  check('claim de desafío sin recompensa -> 200, CLAIMED', claimNoReward.status === 200 && claimNoReward.body.challengeStatus === 'CLAIMED');
  const noRewardGrantCount = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE source_entity_id = $1', [daveChallengeId]);
  check('ningún reward_grant creado (nada que entregar)', noRewardGrantCount.rows[0].n === 0);

  console.log('--- 8. Sin identidad requerida: 401 en ambos endpoints ---');
  const listNoAuth = await req('GET', '/gamification/me/challenges');
  check('GET sin sesión -> 401', listNoAuth.status === 401);
  const claimNoAuth = await req('POST', `/gamification/me/challenges/${randomUUID()}/claim`);
  check('POST claim sin sesión -> 401', claimNoAuth.status === 401);

  console.log('--- 9. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const gamificationDir = join(__dirname, '..', 'src', 'gamification');
  const workerContents = readFileSync(join(gamificationDir, 'reward-evaluation.worker.ts'), 'utf8');
  check('reward-evaluation.worker.ts sigue sin asignar claimedAt (el worker periódico nunca reclama)', !workerContents.includes('claimedAt'));
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile'];
  let boundaryViolationFound = false;
  for (const file of ['challenge.service.ts', 'challenge.controller.ts']) {
    const contents = readFileSync(join(gamificationDir, file), 'utf8');
    for (const symbol of forbiddenSymbols) {
      if (contents.includes(symbol)) {
        boundaryViolationFound = true;
        console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
      }
    }
  }
  check('ningún archivo nuevo de 4.c referencia PROGRESS/Public Profile', !boundaryViolationFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Reclamación de Desafíos (Bloque III, sub-incremento 4.c) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
