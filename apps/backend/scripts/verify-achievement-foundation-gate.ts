// Gate ESTRUCTURAL del Bloque III, Incremento 2, sub-incremento 2.a
// ("Fundación de persistencia de logros") -- valida esquema/persistencia
// únicamente: sin HTTP, sin worker, sin cálculo de progreso, sin
// achievement_progress/achievement_unlock, sin entrega, sin exposición
// pública. Prueba directamente contra Postgres real usando los
// repositorios reales más aserciones SQL directas para las restricciones
// de base de datos (UNIQUE, FK) -- mismo criterio que
// verify-reward-foundation-gate.ts (1.a).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { AchievementDefinitionRepository } from '../src/gamification/achievement-definition.repository';
import { AchievementVersionRepository } from '../src/gamification/achievement-version.repository';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
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

  const definitionRepo = new AchievementDefinitionRepository(prisma);
  const versionRepo = new AchievementVersionRepository(prisma);
  const bundleRepo = new RewardBundleRepository(prisma);

  // achievement_definition no admite DELETE (sin método expuesto, mismo
  // criterio que reward_bundle/level_definition) -- las filas ACTIVE que
  // dejan corridas anteriores de ESTE gate nunca desaparecen, y desde 2.b
  // `RewardEvaluationWorker.evaluateAchievements` las evalúa para TODA
  // cuenta con actividad de XP (no solo las de este gate) -- una fila
  // vieja con un `unlockRule` ya inválido (de antes de fijar la gramática)
  // rompería la evaluación de logros de CUALQUIER otro gate. Se retiran
  // aquí, al principio, mismo patrón que el retiro de `level_definition`
  // de prueba en verify-reward-delivery-xp-bonus-gate.ts (1.c).
  await pg.query("UPDATE achievement_definition SET status = 'RETIRED' WHERE achievement_key LIKE 'first-unit-mastered-%' OR achievement_key LIKE 'other-achievement-%'");

  const suffix = Date.now();

  console.log('--- 1. achievement_definition: creación, achievement_category/progress_tracking_type abiertos ---');
  const definition = await definitionRepo.create({
    achievementKey: `first-unit-mastered-${suffix}`,
    name: 'Primera unidad dominada (gate)',
    description: 'Completar la primera unidad con dominio suficiente.',
    achievementCategory: 'HITO_ACADEMICO', // valor libre -- Data Model no enumera categorías (§4.6)
    visibilityClass: 'PUBLIC',
    repeatability: 'UNIQUE',
    progressTrackingType: 'CUMULATIVE_COUNTER', // valor libre -- sin interpretación en 2.a
  });
  check('definición creada', definition.id !== undefined);
  check('status nace ACTIVE', definition.status === 'ACTIVE');
  check('achievementCategory persistida tal cual (sin coerción a enum)', definition.achievementCategory === 'HITO_ACADEMICO');

  let duplicateKeyRejected = false;
  try {
    await definitionRepo.create({
      achievementKey: definition.achievementKey,
      name: 'Duplicado',
      achievementCategory: 'OTRA',
      visibilityClass: 'PRIVATE',
      repeatability: 'REPEATABLE',
      progressTrackingType: 'BOOLEAN_FLAG',
    });
  } catch (error) {
    duplicateKeyRejected = (error as { code?: string }).code === 'P2002';
  }
  check('UNIQUE rechaza achievement_key duplicado', duplicateKeyRejected);

  console.log('--- 2. achievement_version: versionado por definición, unlockRule validado (gramática XP_THRESHOLD de 2.b), vínculo a reward_bundle ---');
  const bundle = await bundleRepo.create({
    bundleKey: `achievement-gate-bundle-${suffix}`,
    name: 'Recompensa de logro (gate)',
    items: [{ componentType: 'XP_BONUS', xpAmount: 100 }],
  });

  const v1 = await versionRepo.create({
    achievementDefinitionId: definition.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 1000 },
    rewardBundleId: bundle.id,
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });
  check('versión v1 creada', v1.id !== undefined);
  check('approvalStatus == APPROVED', v1.approvalStatus === 'APPROVED');
  check(
    'unlockRule persistida en forma canónica (orden de claves fijo)',
    v1.unlockRule === '{"schemaVersion":"v1","type":"XP_THRESHOLD","value":1000}',
  );
  check('rewardBundleId referencia el bundle real', v1.rewardBundleId === bundle.id);

  let invalidGrammarRejected = false;
  try {
    await versionRepo.create({ achievementDefinitionId: definition.id, versionLabel: 'v-invalid', unlockRule: { schemaVersion: 'v1', type: 'STREAK_DAYS', value: 7 } });
  } catch (error) {
    invalidGrammarRejected = (error as { name?: string }).name === 'ZodError';
  }
  check('unlockRule con un `type` distinto de XP_THRESHOLD rechazado por Zod -- 2.b no admite otros tipos', invalidGrammarRejected);

  let nonPositiveValueRejected = false;
  try {
    await versionRepo.create({ achievementDefinitionId: definition.id, versionLabel: 'v-zero', unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 0 } });
  } catch (error) {
    nonPositiveValueRejected = (error as { name?: string }).name === 'ZodError';
  }
  check('unlockRule con value <= 0 rechazado por Zod', nonPositiveValueRejected);

  let duplicateVersionLabelRejected = false;
  try {
    await versionRepo.create({
      achievementDefinitionId: definition.id,
      versionLabel: 'v1',
      unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 2000 },
    });
  } catch (error) {
    duplicateVersionLabelRejected = (error as { code?: string }).code === 'P2002';
  }
  check('UNIQUE(achievementDefinitionId, versionLabel) rechaza versionLabel duplicado bajo el mismo logro', duplicateVersionLabelRejected);

  const otherDefinition = await definitionRepo.create({
    achievementKey: `other-achievement-${suffix}`,
    name: 'Otro logro (gate)',
    achievementCategory: 'CONSTANCIA',
    visibilityClass: 'PRIVATE',
    repeatability: 'REPEATABLE',
    progressTrackingType: 'STREAK_DAYS',
  });
  const otherV1 = await versionRepo.create({
    achievementDefinitionId: otherDefinition.id,
    versionLabel: 'v1',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 500 },
  });
  check(
    'el MISMO versionLabel ("v1") SÍ se permite bajo un achievement_definition_id distinto (unicidad es por par, no global)',
    otherV1.id !== undefined,
  );

  let fkRejectedForUnknownBundle = false;
  try {
    await versionRepo.create({
      achievementDefinitionId: definition.id,
      versionLabel: 'v-bad-bundle',
      unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 10 },
      rewardBundleId: randomUUID(),
    });
  } catch (error) {
    fkRejectedForUnknownBundle = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza achievement_version con reward_bundle_id inexistente', fkRejectedForUnknownBundle);

  let fkRejectedForUnknownDefinition = false;
  try {
    await versionRepo.create({
      achievementDefinitionId: randomUUID(),
      versionLabel: 'v1',
      unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 10 },
    });
  } catch (error) {
    fkRejectedForUnknownDefinition = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza achievement_version con achievement_definition_id inexistente', fkRejectedForUnknownDefinition);

  console.log('--- 3. findApprovedEffectiveAt: mismo predicado/desempate que GamificationProgramVersionRepository ---');
  const pastVersion = await versionRepo.create({
    achievementDefinitionId: definition.id,
    versionLabel: 'v0-past',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 300 },
    approvalStatus: 'APPROVED',
    effectiveFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    effectiveUntil: new Date(Date.now() - 60_000),
    approvedAt: new Date(),
  });
  const draftVersion = await versionRepo.create({
    achievementDefinitionId: definition.id,
    versionLabel: 'v2-draft',
    unlockRule: { schemaVersion: 'v1', type: 'XP_THRESHOLD', value: 5000 },
    approvalStatus: 'DRAFT',
  });

  const effectiveNow = await versionRepo.findApprovedEffectiveAt(definition.id, new Date());
  check('resuelve v1 (APPROVED, vigente ahora) -- no v0 (ya expirada) ni v2 (DRAFT)', effectiveNow?.id === v1.id);
  check('nunca resuelve una versión DRAFT', effectiveNow?.id !== draftVersion.id);

  const effectiveInThePast = await versionRepo.findApprovedEffectiveAt(definition.id, new Date(Date.now() - 25 * 24 * 60 * 60 * 1000));
  check('resuelve v0 cuando `at` cae dentro de SU ventana de vigencia pasada', effectiveInThePast?.id === pastVersion.id);

  console.log('--- 4. Inmutabilidad por diseño de repositorio (sin update/delete expuesto) ---');
  check(
    'AchievementDefinitionRepository no expone update/delete',
    !('update' in definitionRepo) && !('delete' in definitionRepo),
  );
  check('AchievementVersionRepository no expone update/delete', !('update' in versionRepo) && !('delete' in versionRepo));

  console.log('--- 5. Sin efecto sobre progreso, desbloqueo, entrega, XP o PROGRESS ---');
  // achievement_progress/achievement_unlock ya existen desde el
  // sub-incremento 2.b (autorizado, ver excepción controlada A1) -- este
  // gate (2.a) no las crea NI las toca: comprobación relevante es que
  // ninguna fila referencia las definiciones/versiones de ESTE gate.
  const progressRowsForDefinition = await pg.query('SELECT count(*)::int AS n FROM achievement_progress WHERE achievement_definition_id = ANY($1)', [
    [definition.id, otherDefinition.id],
  ]);
  check('ninguna achievement_progress creada a partir de las definiciones de este gate (2.a no calcula progreso)', progressRowsForDefinition.rows[0].n === 0);
  const unlockRowsForDefinition = await pg.query('SELECT count(*)::int AS n FROM achievement_unlock WHERE achievement_definition_id = ANY($1)', [
    [definition.id, otherDefinition.id],
  ]);
  check('ningún achievement_unlock creado a partir de las definiciones de este gate (2.a no desbloquea nada)', unlockRowsForDefinition.rows[0].n === 0);

  // 2.a no involucra ninguna cuenta (achievement_definition/version no
  // tienen account_id) -- la comprobación relevante es que el bundle
  // creado para este gate nunca se usó para entregar nada.
  const rewardGrantForBundle = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE reward_bundle_id = $1', [bundle.id]);
  check('ningún reward_grant creado a partir del bundle de este gate (2.a no entrega nada)', rewardGrantForBundle.rows[0].n === 0);

  console.log('--- 6. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const filesToCheck = ['achievement-definition.repository.ts', 'achievement-version.repository.ts'];
  const forbiddenSymbols = [
    'StudentResponse',
    'CurriculumTopicProgress',
    'PublicProfile',
    'equippedTitle',
    'equippedCosmetic',
    'RewardEvaluationWorker',
    'RewardGrantRepository',
    'achievementProgress',
    'achievementUnlock',
  ];
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
  check(
    'ningún archivo de 2.a referencia PROGRESS/Public Profile/equipamiento/worker/entrega/progreso/desbloqueo',
    !boundaryViolationFound,
  );

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Logros (Bloque III, sub-incremento 2.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
