// Gate ESTRUCTURAL del Bloque III, sub-incremento 1.a ("Fundación de
// persistencia", ADR-0019) -- valida esquema/persistencia únicamente: sin
// HTTP, sin worker, sin cron, sin endpoint interno, sin lectura de
// xp_ledger_entry, sin evaluación de niveles/logros/desafíos, sin entrega
// real de títulos/cosméticos/bonos, sin escritura sobre inventario ni
// public_profile. Prueba directamente contra Postgres real usando los
// repositorios reales más aserciones SQL directas para las restricciones
// de base de datos (CHECK, trigger de inmutabilidad, FK) que un
// repositorio no puede eludir ni aunque quisiera -- mismo criterio que
// verify-gamification-schema-gate.ts (Bloque I).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { RewardBundleRepository } from '../src/gamification/reward-bundle.repository';
import { RewardGrantRepository } from '../src/gamification/reward-grant.repository';
import { RewardGrantComponentRepository } from '../src/gamification/reward-grant-component.repository';
import { RewardEvaluationCursorRepository } from '../src/gamification/reward-evaluation-cursor.repository';
import { deriveGrantStatus } from '../src/gamification/reward-status';
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

  const bundleRepo = new RewardBundleRepository(prisma);
  const grantRepo = new RewardGrantRepository(prisma);
  const componentRepo = new RewardGrantComponentRepository(prisma);
  const cursorRepo = new RewardEvaluationCursorRepository(prisma);

  const suffix = Date.now();

  console.log('--- 1. reward_bundle/reward_bundle_item: creación y CHECK de coherencia del snapshot ---');
  const bundle = await bundleRepo.create({
    bundleKey: `level-up-${suffix}`,
    name: 'Recompensa de nivel (gate)',
    items: [
      { componentType: 'XP_BONUS', xpAmount: 50 },
      { componentType: 'TITLE', referenceId: randomUUID() },
    ],
  });
  check('bundle creado con 2 items', bundle.id !== undefined);
  const bundleWithItems = await bundleRepo.findById(bundle.id);
  check('2 reward_bundle_item persistidos', bundleWithItems?.items.length === 2);

  let xpBonusRejectedWithReferenceId = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'XP_BONUS', 10, $3)`,
      [randomUUID(), bundle.id, randomUUID()],
    );
  } catch (error) {
    xpBonusRejectedWithReferenceId = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza XP_BONUS con reference_id no nulo', xpBonusRejectedWithReferenceId);

  let xpBonusRejectedWithZeroAmount = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'XP_BONUS', 0, NULL)`,
      [randomUUID(), bundle.id],
    );
  } catch (error) {
    xpBonusRejectedWithZeroAmount = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza XP_BONUS con xp_amount = 0 (exige > 0)', xpBonusRejectedWithZeroAmount);

  let titleRejectedWithoutReferenceId = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'TITLE', NULL, NULL)`,
      [randomUUID(), bundle.id],
    );
  } catch (error) {
    titleRejectedWithoutReferenceId = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza TITLE sin reference_id', titleRejectedWithoutReferenceId);

  let titleRejectedWithXpAmount = false;
  try {
    await pg.query(
      `INSERT INTO reward_bundle_item (id, reward_bundle_id, component_type, xp_amount, reference_id)
       VALUES ($1, $2, 'COSMETIC', 5, $3)`,
      [randomUUID(), bundle.id, randomUUID()],
    );
  } catch (error) {
    titleRejectedWithXpAmount = (error as { code?: string }).code === '23514';
  }
  check('CHECK rechaza COSMETIC con xp_amount no nulo', titleRejectedWithXpAmount);

  console.log('--- 2. reward_grant: idempotencia por idempotency_key, FK a reward_bundle ---');
  const accountA = randomUUID();
  const titleReferenceId = bundleWithItems!.items.find((i) => i.componentType === 'TITLE')!.referenceId!;
  const idempotencyKeyA = `reward:LEVEL:${accountA}:2`;

  const firstAttempt = await grantRepo.createIdempotent({
    accountId: accountA,
    rewardBundleId: bundle.id,
    sourceEntityType: 'LEVEL',
    sourceEntityId: `${accountA}:2`,
    idempotencyKey: idempotencyKeyA,
    components: [
      { componentType: 'XP_BONUS', xpAmount: 50 },
      { componentType: 'TITLE', referenceId: titleReferenceId },
    ],
  });
  check('primer createIdempotent -> created=true', firstAttempt.created === true);
  check('2 componentes creados', firstAttempt.grant.components.length === 2);
  check('ambos componentes nacen PENDING', firstAttempt.grant.components.every((c) => c.deliveryStatus === 'PENDING'));

  const secondAttempt = await grantRepo.createIdempotent({
    accountId: accountA,
    rewardBundleId: bundle.id,
    sourceEntityType: 'LEVEL',
    sourceEntityId: `${accountA}:2`,
    idempotencyKey: idempotencyKeyA,
    components: [{ componentType: 'XP_BONUS', xpAmount: 999 }], // deliberadamente distinto -- no debe usarse
  });
  check('segundo createIdempotent (misma clave) -> created=false', secondAttempt.created === false);
  check('devuelve la MISMA fila (mismo id)', secondAttempt.grant.id === firstAttempt.grant.id);
  const grantCountForKey = await pg.query('SELECT count(*)::int AS n FROM reward_grant WHERE idempotency_key = $1', [idempotencyKeyA]);
  check('sigue existiendo UN solo reward_grant para esa clave', grantCountForKey.rows[0].n === 1);
  check(
    'los componentes NO cambiaron con el segundo intento (sigue habiendo 2, no 1)',
    secondAttempt.grant.components.length === 2,
  );

  let fkRejectedForUnknownBundle = false;
  try {
    await grantRepo.createIdempotent({
      accountId: accountA,
      rewardBundleId: randomUUID(),
      sourceEntityType: 'LEVEL',
      sourceEntityId: `${accountA}:3`,
      idempotencyKey: `reward:LEVEL:${accountA}:3`,
      components: [{ componentType: 'XP_BONUS', xpAmount: 10 }],
    });
  } catch (error) {
    fkRejectedForUnknownBundle = (error as { code?: string }).code === 'P2003';
  }
  check('FK rechaza reward_grant con reward_bundle_id inexistente', fkRejectedForUnknownBundle);

  let bundleDeleteRestricted = false;
  try {
    await pg.query('DELETE FROM reward_bundle WHERE id = $1', [bundle.id]);
  } catch (error) {
    bundleDeleteRestricted = (error as { code?: string }).code === '23503';
  }
  check('RESTRICT impide borrar un reward_bundle referenciado por grants/items', bundleDeleteRestricted);

  console.log('--- 3. Snapshot independiente de cambios posteriores en reward_bundle_item ---');
  const titleItem = bundleWithItems!.items.find((i) => i.componentType === 'TITLE')!;
  const newReferenceId = randomUUID();
  await pg.query('UPDATE reward_bundle_item SET reference_id = $1 WHERE id = $2', [newReferenceId, titleItem.id]);
  const componentsAfterBundleEdit = await componentRepo.findByRewardGrantId(firstAttempt.grant.id);
  const titleComponent = componentsAfterBundleEdit.find((c) => c.componentType === 'TITLE')!;
  check(
    'editar reward_bundle_item DESPUÉS de la entrega no cambia el snapshot ya guardado en reward_grant_component',
    titleComponent.referenceId === titleReferenceId && titleComponent.referenceId !== newReferenceId,
  );

  console.log('--- 4. Terminalidad de DELIVERED: UPDATE y DELETE rechazados ---');
  const xpComponent = componentsAfterBundleEdit.find((c) => c.componentType === 'XP_BONUS')!;
  const delivered = await componentRepo.markDelivered(xpComponent.id);
  check('markDelivered transiciona PENDING -> DELIVERED', delivered.deliveryStatus === 'DELIVERED');
  check('deliveredAt quedó registrado', delivered.deliveredAt !== null);

  let updateAfterDeliveredRejected = false;
  try {
    await pg.query("UPDATE reward_grant_component SET delivery_status = 'FAILED' WHERE id = $1", [xpComponent.id]);
  } catch (error) {
    updateAfterDeliveredRejected = String((error as Error).message ?? '').includes('inmutable');
  }
  check('trigger rechaza UPDATE sobre un componente ya DELIVERED', updateAfterDeliveredRejected);

  let deleteRejected = false;
  try {
    await pg.query('DELETE FROM reward_grant_component WHERE id = $1', [xpComponent.id]);
  } catch (error) {
    deleteRejected = String((error as Error).message ?? '').includes('no admite DELETE');
  }
  check('trigger rechaza DELETE sobre reward_grant_component (incondicional)', deleteRejected);

  console.log('--- 5. Derivación pura de grantStatus (4 casos) ---');
  check('todos PENDING -> PENDING', deriveGrantStatus([{ deliveryStatus: 'PENDING' }, { deliveryStatus: 'PENDING' }]) === 'PENDING');
  check(
    'mezcla PENDING/DELIVERED -> PARTIAL',
    deriveGrantStatus([{ deliveryStatus: 'DELIVERED' }, { deliveryStatus: 'PENDING' }]) === 'PARTIAL',
  );
  check('todos DELIVERED -> GRANTED', deriveGrantStatus([{ deliveryStatus: 'DELIVERED' }, { deliveryStatus: 'DELIVERED' }]) === 'GRANTED');
  check(
    'uno o más FAILED sin ningún DELIVERED -> FAILED',
    deriveGrantStatus([{ deliveryStatus: 'FAILED' }, { deliveryStatus: 'PENDING' }]) === 'FAILED',
  );
  check(
    'FAILED mezclado con al menos un DELIVERED -> PARTIAL (FAILED no domina sobre un DELIVERED ya logrado)',
    deriveGrantStatus([{ deliveryStatus: 'FAILED' }, { deliveryStatus: 'DELIVERED' }]) === 'PARTIAL',
  );

  // Verificación end-to-end sobre el grant real de este gate: quedó con un
  // componente DELIVERED (XP_BONUS) y uno PENDING (TITLE) -> PARTIAL.
  const componentsNow = await componentRepo.findByRewardGrantId(firstAttempt.grant.id);
  check('grant real de este gate deriva PARTIAL (1 DELIVERED + 1 PENDING)', deriveGrantStatus(componentsNow) === 'PARTIAL');

  console.log('--- 6. Aislamiento por cuenta del cursor (reward_evaluation_cursor) ---');
  const cursorAccountOk = randomUUID();
  const cursorAccountFailing = randomUUID();
  const now = new Date();

  await cursorRepo.upsertSuccess(cursorAccountOk, now);
  await cursorRepo.upsertFailure(cursorAccountFailing, new Date(now.getTime() + 60_000));

  const cursorOk = await cursorRepo.findByAccountId(cursorAccountOk);
  const cursorFailing = await cursorRepo.findByAccountId(cursorAccountFailing);
  check('cuenta exitosa: lastProcessedRecordedAt avanzó, attempts = 0', cursorOk?.lastProcessedRecordedAt !== null && cursorOk?.attempts === 0);
  check(
    'cuenta fallida: lastProcessedRecordedAt permanece NULL (nunca procesada con éxito), attempts = 1',
    cursorFailing?.lastProcessedRecordedAt === null && cursorFailing?.attempts === 1,
  );

  // Un segundo fallo de la MISMA cuenta no toca el cursor de la otra cuenta -- aislamiento real, no solo por construcción del test.
  await cursorRepo.upsertFailure(cursorAccountFailing, new Date(now.getTime() + 120_000));
  const cursorOkAfterOtherFailure = await cursorRepo.findByAccountId(cursorAccountOk);
  const cursorFailingAfterSecondFailure = await cursorRepo.findByAccountId(cursorAccountFailing);
  check(
    'un segundo fallo en la cuenta B no altera el cursor ya avanzado de la cuenta A',
    cursorOkAfterOtherFailure?.lastProcessedRecordedAt?.getTime() === cursorOk?.lastProcessedRecordedAt?.getTime(),
  );
  check('attempts de la cuenta fallida sube a 2 (backoff), sigue con lastProcessedRecordedAt NULL', cursorFailingAfterSecondFailure?.attempts === 2 && cursorFailingAfterSecondFailure?.lastProcessedRecordedAt === null);

  console.log('--- 7. Sin efecto todavía sobre XP, inventario, equipamiento o PROGRESS ---');
  const xpLedgerForAccountA = await pg.query('SELECT count(*)::int AS n FROM xp_ledger_entry WHERE account_id = $1', [accountA]);
  check('ninguna xp_ledger_entry creada para la cuenta de este gate (sin entrega real todavía)', xpLedgerForAccountA.rows[0].n === 0);
  const xpBalanceForAccountA = await pg.query('SELECT count(*)::int AS n FROM xp_balance WHERE account_id = $1', [accountA]);
  check('ninguna xp_balance creada/tocada', xpBalanceForAccountA.rows[0].n === 0);
  const publicProfileForAccountA = await pg.query('SELECT count(*)::int AS n FROM public_profile WHERE account_id = $1', [accountA]);
  check('ningún public_profile creado/tocado (fuera de alcance de este ADR)', publicProfileForAccountA.rows[0].n === 0);
  const studentResponseCount = await pg.query('SELECT count(*)::int AS n FROM student_response WHERE account_id = $1', [accountA]);
  check('ningún StudentResponse creado/tocado (PROGRESS fuera de alcance)', studentResponseCount.rows[0].n === 0);

  console.log('--- 8. Frontera de dominio: verificación estática ---');
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const filesToCheck = [
    'reward-bundle.repository.ts',
    'reward-grant.repository.ts',
    'reward-grant-component.repository.ts',
    'reward-evaluation-cursor.repository.ts',
    'reward-status.ts',
  ];
  const forbiddenSymbols = ['StudentResponse', 'CurriculumTopicProgress', 'PublicProfile', 'equippedTitle', 'equippedCosmetic'];
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
  check('ningún archivo de este sub-incremento referencia PROGRESS/Public Profile/equipamiento', !boundaryViolationFound);

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Fundación de Recompensas (Bloque III, sub-incremento 1.a) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
