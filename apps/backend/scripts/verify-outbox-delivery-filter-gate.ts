// Gate de infraestructura de plataforma (ADR-0017) -- SIN HTTP: prueba
// directamente `OutboxEventDeliveryRepository.findPendingFor` contra
// Postgres real, mismo criterio que verify-competitive-profile-foundation-gate.ts.
//
// Cubre el filtrado por `eventKey` añadido a `findPendingFor` (cada
// consumidor pasa explícitamente su propia lista de event keys aplicables,
// ej. GAMIFICATION_EVENT_KEYS/ANALYTICS_EVENT_KEYS de @axioma/contracts) --
// evita que un consumidor intente (y falle) procesar eventos que nunca le
// corresponden, sin introducir lógica por-consumidor en el repositorio
// compartido.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { GAMIFICATION_EVENT_KEYS, ANALYTICS_EVENT_KEYS } from '@axioma/contracts';
import { PrismaClient } from '../src/generated/prisma/client';
import { OutboxEventRepository } from '../src/platform/outbox/outbox-event.repository';
import { OutboxEventDeliveryRepository } from '../src/platform/outbox/outbox-event-delivery.repository';
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

const MAX_ATTEMPTS = 10;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const eventRepo = new OutboxEventRepository(prisma);
  const deliveryRepo = new OutboxEventDeliveryRepository(prisma);

  const suffix = `${Date.now()}-${randomUUID()}`;

  console.log('--- 1/2. account_registered: seleccionable por ANALYTICS, NUNCA por GAMIFICATION ---');
  const accountRegistered = await eventRepo.create({
    eventKey: 'account_registered',
    schemaVersion: 'v1',
    sourceDomain: 'AUTH',
    aggregateId: randomUUID(),
    occurredAt: new Date(),
    payload: { accountId: `outbox-filter-gate-${suffix}` },
  });

  const analyticsPending = await deliveryRepo.findPendingFor('ANALYTICS', ANALYTICS_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check('1. account_registered aparece en pendientes de ANALYTICS', analyticsPending.some((e) => e.id === accountRegistered.id));

  const gamificationPendingBefore = await deliveryRepo.findPendingFor('GAMIFICATION', GAMIFICATION_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check(
    '2. account_registered NUNCA aparece en pendientes de GAMIFICATION (filtrado en el origen, ni siquiera se intenta)',
    !gamificationPendingBefore.some((e) => e.id === accountRegistered.id),
  );
  check(
    '2b. sin fila de entrega para GAMIFICATION sobre este evento (nunca se procesó ni se marcó FAILED)',
    (await deliveryRepo.findFor(accountRegistered.id, 'GAMIFICATION')) === null,
  );

  console.log('--- 3. Un evento de gamificación válido SÍ es seleccionado por GAMIFICATION ---');
  const validGamificationEvent = await eventRepo.create({
    eventKey: 'curriculum_topic_completed',
    schemaVersion: 'v1',
    sourceDomain: 'PROGRESS',
    aggregateId: randomUUID(),
    occurredAt: new Date(),
    payload: { accountId: `outbox-filter-gate-${suffix}`, curriculumTopicId: randomUUID() },
  });
  const gamificationPendingAfter = await deliveryRepo.findPendingFor('GAMIFICATION', GAMIFICATION_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check('3. curriculum_topic_completed aparece en pendientes de GAMIFICATION', gamificationPendingAfter.some((e) => e.id === validGamificationEvent.id));
  check(
    '3b. ese mismo evento NUNCA aparece en pendientes de ANALYTICS (no está en su lista de event keys aplicables)',
    !(await deliveryRepo.findPendingFor('ANALYTICS', ANALYTICS_EVENT_KEYS, 500, MAX_ATTEMPTS)).some((e) => e.id === validGamificationEvent.id),
  );

  console.log('--- 4. Deliveries independientes: marcar PROCESSED para ANALYTICS no afecta a GAMIFICATION, ni viceversa ---');
  await deliveryRepo.recordOutcome(accountRegistered.id, 'ANALYTICS', { status: 'PROCESSED' });
  const analyticsPendingAfterProcess = await deliveryRepo.findPendingFor('ANALYTICS', ANALYTICS_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check('4a. tras procesar, account_registered YA NO está pendiente para ANALYTICS', !analyticsPendingAfterProcess.some((e) => e.id === accountRegistered.id));
  check(
    '4b. sigue sin ninguna fila de entrega para GAMIFICATION sobre ese mismo evento (independencia total, ADR-0017)',
    (await deliveryRepo.findFor(accountRegistered.id, 'GAMIFICATION')) === null,
  );

  await deliveryRepo.recordOutcome(validGamificationEvent.id, 'GAMIFICATION', { status: 'PROCESSED' });
  const gamificationPendingAfterProcess = await deliveryRepo.findPendingFor('GAMIFICATION', GAMIFICATION_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check(
    '4c. tras procesar en GAMIFICATION, ese evento ya no está pendiente ahí -- y nunca tuvo entrega en ANALYTICS (dominios distintos, deliveries propias)',
    !gamificationPendingAfterProcess.some((e) => e.id === validGamificationEvent.id),
  );
  check('4d. sin fila de entrega ANALYTICS para el evento de gamificación', (await deliveryRepo.findFor(validGamificationEvent.id, 'ANALYTICS')) === null);

  console.log('--- 5. FAILED/retry/maxAttempts sin cambios de semántica para eventos APLICABLES ---');
  const retryableEvent = await eventRepo.create({
    eventKey: 'quick_question_answered',
    schemaVersion: 'v1',
    sourceDomain: 'GAMIFICATION',
    aggregateId: randomUUID(),
    occurredAt: new Date(),
    payload: { accountId: `outbox-filter-gate-${suffix}`, quickQuestionAttemptId: randomUUID() },
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    await deliveryRepo.recordOutcome(retryableEvent.id, 'GAMIFICATION', { status: 'FAILED', lastError: `fallo simulado ${attempt}` });
  }
  const delivery = await deliveryRepo.findFor(retryableEvent.id, 'GAMIFICATION');
  check('5a. attempts == 3 tras 3 fallos (semántica de conteo sin cambios)', delivery?.attempts === 3);
  check('5b. status == FAILED', delivery?.status === 'FAILED');

  const pendingWithRoomToRetry = await deliveryRepo.findPendingFor('GAMIFICATION', GAMIFICATION_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check('5c. con attempts (3) < maxAttempts (10), el evento SIGUE pendiente (retry intacto)', pendingWithRoomToRetry.some((e) => e.id === retryableEvent.id));

  for (let attempt = 4; attempt <= MAX_ATTEMPTS; attempt++) {
    await deliveryRepo.recordOutcome(retryableEvent.id, 'GAMIFICATION', { status: 'FAILED', lastError: `fallo simulado ${attempt}` });
  }
  const deliveryExhausted = await deliveryRepo.findFor(retryableEvent.id, 'GAMIFICATION');
  check(`5d. attempts == ${MAX_ATTEMPTS} tras agotar los reintentos`, deliveryExhausted?.attempts === MAX_ATTEMPTS);

  const pendingAfterExhaustion = await deliveryRepo.findPendingFor('GAMIFICATION', GAMIFICATION_EVENT_KEYS, 500, MAX_ATTEMPTS);
  check(
    '5e. con attempts == maxAttempts, el evento YA NO aparece como pendiente (mismo corte que antes del cambio, sin alterar MAX_DELIVERY_ATTEMPTS)',
    !pendingAfterExhaustion.some((e) => e.id === retryableEvent.id),
  );

  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de filtrado de entrega multiconsumidor del Outbox (ADR-0017) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
