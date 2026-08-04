// Gate del incremento "Progresión visible" (Bloque II, Learning Experience
// Foundation) -- ver docs/adr/BLOCK-II-DEFINITION.md. Prueba contra el
// servidor real ya compilado y corriendo (endpoints de autoservicio
// /gamification/me/*) más acceso directo a Postgres/repositorios para
// fixtures (mismo patrón que verify-gamification-xp-grant-gate.ts).
//
// NO toca identidad pública (ADR-0018, gate separado), rankings,
// equipamiento, cosméticos ni Perfil Avanzado -- fuera de alcance de este
// incremento.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { GamificationProgramRepository } from '../src/gamification/gamification-program.repository';
import { GamificationProgramVersionRepository } from '../src/gamification/gamification-program-version.repository';
import { XpRuleRepository } from '../src/gamification/xp-rule.repository';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

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

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

const runGrant = () => req('POST', '/gamification/_internal/grant-xp', { 'x-internal-ops-key': opsKey });

async function createSession(uidSuffix: string): Promise<{ accountId: string; headers: Record<string, string> }> {
  const uid = `progression-gate-${uidSuffix}-${Date.now()}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const session = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: session.body.accountId as string,
    headers: { authorization: `Bearer ${idToken}`, 'x-session-id': session.body.sessionId },
  };
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const programRepo = new GamificationProgramRepository(prisma);
  const versionRepo = new GamificationProgramVersionRepository(prisma);
  const ruleRepo = new XpRuleRepository(prisma);
  const activityRepo = new ValidatedGamificationActivityRepository(prisma);

  const suffix = Date.now();

  console.log('--- 0. Fixtures: programa/versión/regla de XP para este gate ---');
  // PROGRAM_KEY ('xp-core') está hardcodeado en XpGrantService -- no se
  // puede aislar en un programa propio (grantForActivity() siempre resuelve
  // contra ese programKey fijo, ver xp-grant.service.ts). Reutilizamos
  // 'xp-core', igual que verify-gamification-xp-grant-gate.ts.
  //
  // GamificationProgramVersionRepository.findApprovedEffectiveAt() elige,
  // para cada `at`, la versión APROBADA con el effectiveFrom MÁS RECIENTE
  // que aún sea <= at -- entre TODAS las versiones históricas de 'xp-core'
  // (dejadas por cualquier gate, en cualquier ejecución previa). Como este
  // gate necesita `at` tanto "ahora" como de varios días atrás (para
  // racha/fronteras de día), NINGÚN effectiveFrom único gana ambos casos a
  // la vez frente a versiones dejadas por otras ejecuciones. Se registra la
  // MISMA regla (mismo activityType) en DOS versiones -- una reciente (para
  // "ahora") y una antigua (para el pasado) -- así, gane cual gane la
  // selección para un `at` dado, la regla de este gate está presente en
  // ambas candidatas plausibles.
  let program = await programRepo.findByProgramKey('xp-core');
  if (!program) {
    program = await programRepo.create({ programKey: 'xp-core', name: 'XP Core', programType: 'XP', status: 'ACTIVE' });
  }
  const activityType = `PROGRESSION_GATE_ACTIVITY_${suffix}`;
  const BASE_XP = 60;

  const recentVersion = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: `progression-gate-recent-${suffix}`,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60 * 60 * 1000),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  const recentRule = await ruleRepo.create({ programVersionId: recentVersion.id, activityType, baseXp: BASE_XP, dailyCap: 100_000 });

  const pastVersion = await versionRepo.create({
    gamificationProgramId: program.id,
    versionLabel: `progression-gate-past-${suffix}`,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    effectiveUntil: null,
    approvedAt: new Date(),
  });
  const pastRule = await ruleRepo.create({ programVersionId: pastVersion.id, activityType, baseXp: BASE_XP, dailyCap: 100_000 });

  check('reglas de XP creadas en ambas versiones (reciente y antigua)', Boolean(recentRule.id) && Boolean(pastRule.id));

  async function grant(accountId: string, occurredAt: Date, dedupSuffix: string) {
    await activityRepo.create({
      accountId,
      sourceDomain: 'PROGRESS',
      sourceEntityType: 'StudentResponse',
      sourceEntityId: randomUUID(),
      activityType,
      validationStatus: 'PENDING',
      occurredAt,
      validationRuleVersion: 'v1',
      deduplicationKey: `progression-gate-${suffix}-${dedupSuffix}`,
      integrityStatus: 'NOT_EVALUATED',
    });
  }

  console.log('--- 1. Consistencia nivel/XP (Decision Gate 1) ---');
  const levelAccount = await createSession('level');
  // 4 otorgamientos de 60 XP = 240 -> nivel 2 (100..249), próximo nivel 3 en 250.
  await Promise.all(
    Array.from({ length: 4 }, (_, i) => grant(levelAccount.accountId, new Date(), `level-${i}`)),
  );
  await runGrant();

  const levelResponse = await req('GET', '/gamification/me/level', levelAccount.headers);
  check('GET /gamification/me/level responde 200', levelResponse.status === 200);
  check('lifetimeXp == 240', levelResponse.body?.lifetimeXp === 240);
  check('currentLevel.levelNumber == 2', levelResponse.body?.currentLevel?.levelNumber === 2);
  check('nextLevel.levelNumber == 3', levelResponse.body?.nextLevel?.levelNumber === 3);
  check('xpIntoLevel == 140 (240 - 100)', levelResponse.body?.xpIntoLevel === 140);
  check('xpForNextLevel == 150 (250 - 100)', levelResponse.body?.xpForNextLevel === 150);
  check(
    'progressRatio ~= 140/150',
    typeof levelResponse.body?.progressRatio === 'number' && Math.abs(levelResponse.body.progressRatio - 140 / 150) < 1e-9,
  );

  console.log('--- 1b. Cuenta sin ningún otorgamiento -- nivel 1 por invariante del seed, nunca error ---');
  const freshAccount = await createSession('fresh');
  const freshLevelResponse = await req('GET', '/gamification/me/level', freshAccount.headers);
  check('GET /gamification/me/level responde 200 incluso sin xp_balance', freshLevelResponse.status === 200);
  check('lifetimeXp == 0', freshLevelResponse.body?.lifetimeXp === 0);
  check('currentLevel.levelNumber == 1 (nivel base, minimumLifetimeXp = 0)', freshLevelResponse.body?.currentLevel?.levelNumber === 1);
  check('xpIntoLevel == 0', freshLevelResponse.body?.xpIntoLevel === 0);
  check('progressRatio == 0', freshLevelResponse.body?.progressRatio === 0);

  console.log('--- 2. Frontera de dominio (Decision Gate 2, verificación estática) ---');
  const filesToCheck = ['level-definition.repository.ts', 'progression.service.ts', 'progression.controller.ts', 'streak-calculator.ts'];
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress'];
  let boundaryViolationFound = false;
  for (const file of filesToCheck) {
    const contents = readFileSync(join(__dirname, '..', 'src', 'gamification', file), 'utf8');
    for (const symbol of forbiddenSymbols) {
      if (contents.includes(symbol)) {
        boundaryViolationFound = true;
        console.error(`  ${file} referencia el símbolo prohibido "${symbol}"`);
      }
    }
  }
  check('ningún archivo de Progresión visible referencia StudentResponse/CurriculumTopicProgress', !boundaryViolationFound);

  console.log('--- 3/4. Racha: cómputo correcto, no punitivo, idempotente (Decision Gates 3-4) ---');
  const streakAccount = await createSession('streak');
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  // Otorgamientos en 3 días consecutivos terminando HOY.
  await grant(streakAccount.accountId, new Date(now.getTime() - 2 * dayMs), 'streak-d0');
  await grant(streakAccount.accountId, new Date(now.getTime() - 1 * dayMs), 'streak-d1');
  await grant(streakAccount.accountId, now, 'streak-d2');
  await runGrant();

  const balanceBeforeStreakReads = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [streakAccount.accountId]);

  const streakResponse1 = await req('GET', '/gamification/me/streak', streakAccount.headers);
  check('GET /gamification/me/streak responde 200', streakResponse1.status === 200);
  check('currentStreak == 3 (3 días consecutivos terminando hoy)', streakResponse1.body?.currentStreak === 3);
  check('longestStreak == 3', streakResponse1.body?.longestStreak === 3);

  const streakResponse2 = await req('GET', '/gamification/me/streak', streakAccount.headers);
  check(
    'segunda lectura idéntica a la primera (idempotencia de lectura, Decision Gate 4)',
    JSON.stringify(streakResponse2.body) === JSON.stringify(streakResponse1.body),
  );

  const balanceAfterStreakReads = await pg.query('SELECT lifetime_xp FROM xp_balance WHERE account_id = $1', [streakAccount.accountId]);
  check(
    'leer la racha NO modificó xp_balance (Decision Gate 3 -- diseño no punitivo, sin escritura alguna)',
    balanceBeforeStreakReads.rows[0]?.lifetime_xp === balanceAfterStreakReads.rows[0]?.lifetime_xp,
  );

  console.log('--- 3b. Racha rota por un hueco de más de un día no penaliza XP acumulado ---');
  const brokenStreakAccount = await createSession('broken-streak');
  await grant(brokenStreakAccount.accountId, new Date(now.getTime() - 5 * dayMs), 'broken-old');
  await grant(brokenStreakAccount.accountId, now, 'broken-new');
  await runGrant();
  const brokenStreakResponse = await req('GET', '/gamification/me/streak', brokenStreakAccount.headers);
  check('currentStreak == 1 (el hueco de 4 días rompe la racha)', brokenStreakResponse.body?.currentStreak === 1);
  check('longestStreak == 1 (nunca hubo 2 días consecutivos)', brokenStreakResponse.body?.longestStreak === 1);
  const brokenLevelResponse = await req('GET', '/gamification/me/level', brokenStreakAccount.headers);
  check(
    'lifetimeXp == 120 (2 otorgamientos de 60) -- perder la racha NO borra XP acumulado',
    brokenLevelResponse.body?.lifetimeXp === 120,
  );

  console.log('--- 5. Frontera de día calendario UTC (Decision Gate 5) ---');
  const boundaryAccount = await createSession('boundary');
  // Pivote FIJO (10 días antes de "ahora"), no la medianoche real de hoy --
  // fragilidad temporal preexistente del fixture (no de streak-calculator.ts
  // ni de XpGrantService, sin cambios): anclar este escenario al día
  // calendario real hacía que, cuanto más avanzada la sesión, "hoy" quedara
  // más lejos del "ahora" en que se registra la versión de xp-core,
  // cayendo en una ventana donde una versión residual de OTRO gate
  // (p. ej. verify-gamification-xp-grant-gate.ts, mismo programKey
  // 'xp-core' porque XpGrantService lo tiene fijo) podía ganar la
  // selección de "versión vigente más reciente" para ese instante exacto
  // y no tener la regla de este gate -> NO_ACTIVE_RULE. Un pivote fijo,
  // suficientemente atrás, queda cubierto sin ambigüedad por la versión
  // "pastVersion" (effectiveFrom = -60 días) ya registrada más abajo, sin
  // competir con la contaminación de otros gates (concentrada cerca del
  // "ahora" real de esta sesión).
  //
  // currentStreak exige que el último día activo sea HOY/AYER real
  // (streak-calculator.ts, deliberadamente no se toca) -- como este
  // escenario ya no usa el día real, se observa vía longestStreak, que
  // ejercita EXACTAMENTE el mismo mecanismo bajo prueba (mismo día UTC =
  // un solo día; cruce a un día distinto = día consecutivo) sin depender
  // del reloj de pared.
  const boundaryPivot = new Date(now.getTime() - 10 * dayMs);
  const dayStartAtPivot = (offsetDays: number, hh: number, mm: number, ss: number, ms: number) => {
    const d = new Date(boundaryPivot);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    d.setUTCHours(hh, mm, ss, ms);
    return d;
  };
  // Dos instantes en el MISMO día calendario UTC (madrugada y noche) -> un solo día para la racha.
  await grant(boundaryAccount.accountId, dayStartAtPivot(0, 0, 0, 1, 0), 'boundary-early');
  await grant(boundaryAccount.accountId, dayStartAtPivot(0, 23, 59, 59, 0), 'boundary-late');
  // Instante justo al cruzar al día SIGUIENTE del pivote (00:00:00.000 UTC) -> día distinto, consecutivo.
  await grant(boundaryAccount.accountId, dayStartAtPivot(1, 0, 0, 0, 0), 'boundary-next-day');
  await runGrant();
  const boundaryStreakResponse = await req('GET', '/gamification/me/streak', boundaryAccount.headers);
  check(
    'dos otorgamientos el mismo día calendario UTC cuentan como UN solo día (longestStreak == 2, no 3)',
    boundaryStreakResponse.body?.longestStreak === 2,
  );

  console.log('--- 6. Reconstructibilidad e integridad del historial paginado (Decision Gate 6) ---');
  const historyAccount = await createSession('history');
  for (let i = 0; i < 7; i++) {
    await grant(historyAccount.accountId, new Date(now.getTime() - i * 1000), `history-${i}`);
  }
  await runGrant();

  const dbEntries = await pg.query(
    "SELECT count(*)::int AS n, COALESCE(SUM(xp_amount), 0)::int AS total FROM xp_ledger_entry WHERE account_id = $1 AND entry_type = 'OTORGAMIENTO'",
    [historyAccount.accountId],
  );
  check('7 xp_ledger_entry reales creadas para la cuenta de historial', dbEntries.rows[0].n === 7);

  const page1 = await req('GET', '/gamification/me/xp-history?limit=3', historyAccount.headers);
  check('página 1: 3 entradas', page1.body?.entries?.length === 3);
  check('página 1: hay nextCursor (quedan más páginas)', typeof page1.body?.nextCursor === 'string');

  const page2 = await req('GET', `/gamification/me/xp-history?limit=3&before=${encodeURIComponent(page1.body.nextCursor)}`, historyAccount.headers);
  check('página 2: 3 entradas', page2.body?.entries?.length === 3);

  const page3 = await req('GET', `/gamification/me/xp-history?limit=3&before=${encodeURIComponent(page2.body.nextCursor)}`, historyAccount.headers);
  check('página 3: 1 entrada restante', page3.body?.entries?.length === 1);
  check('página 3: nextCursor == null (no quedan más páginas)', page3.body?.nextCursor === null);

  const allIds = new Set([...page1.body.entries, ...page2.body.entries, ...page3.body.entries].map((e: { id: string }) => e.id));
  check('las 3 páginas cubren exactamente 7 filas distintas -- sin huecos ni duplicados', allIds.size === 7);

  const totalFromPages = [...page1.body.entries, ...page2.body.entries, ...page3.body.entries].reduce(
    (sum: number, e: { xpAmount: number }) => sum + e.xpAmount,
    0,
  );
  check('la suma de XP mostrada en el historial coincide EXACTAMENTE con el ledger real', totalFromPages === dbEntries.rows[0].total);

  console.log('--- 7. Sin identidad requerida: llamar sin sesión -> 401 (mismo AuthGuard que PROGRESS) ---');
  const noAuth = await req('GET', '/gamification/me/level');
  check('GET /gamification/me/level sin sesión -> 401', noAuth.status === 401);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Progresión Visible pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
