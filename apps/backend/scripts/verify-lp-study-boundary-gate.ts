// Gate de LP-V1-HOTFIX -- "Frontera Study/Competir de League Points".
// Local-DB-only, NUNCA producción. Reproduce el bug real (Study otorgando LP
// bajo la config histórica de 3 reglas), aplica la remediación local
// (`competitive:hotfix-study-lp-boundary-v1`), y prueba la frontera
// corregida contra el código REAL de `LeaguePointGrantService`.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/platform/prisma/prisma.service';
import { TransactionRunnerService } from '../src/platform/prisma/transaction-runner.service';
import { ValidatedGamificationActivityRepository } from '../src/gamification/validated-gamification-activity.repository';
import { SeasonLeagueParticipationRepository } from '../src/gamification/season-league-participation.repository';
import { GameSeasonRepository } from '../src/gamification/game-season.repository';
import { LeagueGroupRepository } from '../src/gamification/league-group.repository';
import { LeaguePointRuleRepository } from '../src/gamification/league-point-rule.repository';
import { LeaguePointLedgerEntryRepository } from '../src/gamification/league-point-ledger-entry.repository';
import { QuickQuestionAttemptRepository } from '../src/gamification/quick-question-attempt.repository';
import { LeaguePointGrantService } from '../src/gamification/league-point-grant.service';
import { hotfixStudyLpBoundary } from './competitive-hotfix-study-lp-boundary-v1';

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? '  OK' : 'FALLO'}  ${label}`);
  if (!ok) failures++;
}

async function insertActivity(prisma: PrismaClient, accountId: string, activityType: string, occurredAt: Date, dedupSuffix: string): Promise<string> {
  const id = randomUUID();
  await prisma.validatedGamificationActivity.create({
    data: {
      id,
      accountId,
      sourceDomain: activityType === 'QUICK_QUESTION_ANSWERED' ? 'GAMIFICATION' : 'PROGRESS',
      sourceEntityType: 'Test',
      sourceEntityId: randomUUID(),
      activityType,
      validationStatus: 'PENDING',
      validationRuleVersion: 'v1',
      occurredAt,
      deduplicationKey: `lp-hotfix-gate:${dedupSuffix}:${randomUUID()}`,
      integrityStatus: 'NOT_EVALUATED',
    },
  });
  return id;
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const svcPrisma = prisma as unknown as PrismaService;

  // --- Fixtures: 1 liga, 1 temporada ACTIVE, 1 grupo OPEN, 1 participante enrolado ---
  const leagueId = randomUUID();
  await prisma.leagueDefinition.create({
    data: { id: leagueId, leagueKey: `gate-lp-${Date.now()}`, name: 'Liga del gate', tierOrder: 1, participantGroupSize: 30, status: 'ACTIVE' },
  });
  const seasonId = randomUUID();
  const seasonStart = new Date(Date.now() - 60 * 60 * 1000);
  const seasonEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.gameSeason.create({
    data: { id: seasonId, seasonKey: `gate-lp-season-${Date.now()}`, name: 'Temporada del gate', startsAt: seasonStart, endsAt: seasonEnd, status: 'ACTIVE' },
  });
  const groupId = randomUUID();
  await prisma.leagueGroup.create({
    data: { id: groupId, gameSeasonId: seasonId, leagueDefinitionId: leagueId, groupNumber: 1, capacity: 30, assignmentPolicyVersion: 'v1', status: 'OPEN' },
  });
  const accountId = randomUUID();
  const joinedAt = new Date(Date.now() - 30 * 60 * 1000);
  const participationId = randomUUID();
  await prisma.seasonLeagueParticipation.create({
    data: { id: participationId, gameSeasonId: seasonId, accountId, leagueDefinitionId: leagueId, leagueGroupId: groupId, joinedAt },
  });

  const txRunner = new TransactionRunnerService(svcPrisma);
  const activityRepo = new ValidatedGamificationActivityRepository(svcPrisma);
  const participationRepo = new SeasonLeagueParticipationRepository(svcPrisma);
  const seasonRepo = new GameSeasonRepository(svcPrisma);
  const groupRepo = new LeagueGroupRepository(svcPrisma);
  const ruleRepo = new LeaguePointRuleRepository(svcPrisma);
  const ledgerRepo = new LeaguePointLedgerEntryRepository(svcPrisma);
  const quickAttemptRepo = new QuickQuestionAttemptRepository(svcPrisma);
  const grantService = new LeaguePointGrantService(txRunner, activityRepo, participationRepo, seasonRepo, groupRepo, ruleRepo, ledgerRepo, quickAttemptRepo);

  // --- Fase 1: reproducir el bug con la config HISTÓRICA de 3 reglas (1786-era) ---
  console.log('--- 1. Reproducción del bug: config histórica de 3 reglas (RESPUESTA_VALIDADA=1, QUICK=2, TEMA=5) ---');
  const historicalEffectiveFrom = new Date('2026-01-01T00:00:00.000Z');
  await prisma.leaguePointRule.createMany({
    data: [
      { id: randomUUID(), activityType: 'RESPUESTA_VALIDADA', basePoints: 1, dailyCap: null, effectiveFrom: historicalEffectiveFrom, effectiveUntil: null, ruleVersion: 'v1', status: 'ACTIVE' },
      { id: randomUUID(), activityType: 'QUICK_QUESTION_ANSWERED', basePoints: 2, dailyCap: null, effectiveFrom: historicalEffectiveFrom, effectiveUntil: null, ruleVersion: 'v1', status: 'ACTIVE' },
      { id: randomUUID(), activityType: 'TEMA_COMPLETADO', basePoints: 5, dailyCap: null, effectiveFrom: historicalEffectiveFrom, effectiveUntil: null, ruleVersion: 'v1', status: 'ACTIVE' },
    ],
  });

  const studyAnswerId = await insertActivity(prisma, accountId, 'RESPUESTA_VALIDADA', new Date(), 'study-answer-before');
  const studyAnswerActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: studyAnswerId } });
  const buggyOutcome = await grantService.grantForActivity(studyAnswerActivity);
  check('BUG REPRODUCIDO: una respuesta normal de Estudio otorga LP bajo la config histórica', buggyOutcome.outcome === 'LP_GRANTED');
  let participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('BUG REPRODUCIDO: leaguePoints subió a 1 tras una respuesta de Estudio', participationRow.leaguePoints === 1);

  const studyTopicId = await insertActivity(prisma, accountId, 'TEMA_COMPLETADO', new Date(), 'study-topic-before');
  const studyTopicActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: studyTopicId } });
  const buggyTopicOutcome = await grantService.grantForActivity(studyTopicActivity);
  check('BUG REPRODUCIDO: completar un tema de Estudio otorga +5 LP bajo la config histórica', buggyTopicOutcome.outcome === 'LP_GRANTED');
  participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('BUG REPRODUCIDO: leaguePoints subió a 6 (1+5) tras Estudio', participationRow.leaguePoints === 6);

  // --- Fase 2: aplicar la remediación local (frontera T = ahora + 2s) ---
  console.log('--- 2. Remediación local: retirar (effectiveUntil) las 2 reglas de Estudio a partir de T ---');
  const T = new Date(Date.now() + 2000);
  const remediation = await hotfixStudyLpBoundary({ dryRun: false, effectiveAt: T });
  check('remediación real: 2 reglas retiradas (effectiveUntil=T)', remediation.retired === 2);
  check('remediación real: 0 conflictos', remediation.conflicts === 0);

  // Rerun idempotente
  const remediationRerun = await hotfixStudyLpBoundary({ dryRun: false, effectiveAt: T });
  check('remediación reejecutada con el MISMO T: 0 retiradas nuevas (reutiliza)', remediationRerun.retired === 0 && remediationRerun.reused === 2);

  // --- Fase 3: actividad de Estudio ANTES de T sigue siendo elegible (no se toca el pasado) ---
  console.log('--- 3. Actividad de Estudio anterior a T: NO reprocesada, LP ya otorgado permanece intacto ---');
  participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('LP ya otorgado (6) permanece intacto -- esta remediación NUNCA revierte lo ya otorgado', participationRow.leaguePoints === 6);

  // --- Fase 3.5: conflicto -- T divergente (debe ejecutarse ANTES de que el T original pase) ---
  console.log('--- 3.5 Divergencia de T: conflicto, no sobreescribe en silencio ---');
  const conflictResult = await hotfixStudyLpBoundary({ dryRun: false, effectiveAt: new Date(T.getTime() + 60_000) });
  check('T divergente sobre reglas ya retiradas -> conflicto (0 escrituras nuevas)', conflictResult.conflicts === 2 && conflictResult.retired === 0);

  // --- Fase 4: esperar a que T pase, luego probar la frontera corregida ---
  console.log('--- 4. Tras T: Estudio ya NO otorga LP; Quick SIGUE otorgando LP ---');
  await new Promise((r) => setTimeout(r, 2500));

  const studyAnswerAfterId = await insertActivity(prisma, accountId, 'RESPUESTA_VALIDADA', new Date(), 'study-answer-after');
  const studyAnswerAfterActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: studyAnswerAfterId } });
  const afterAnswerOutcome = await grantService.grantForActivity(studyAnswerAfterActivity);
  check('post-T: respuesta de Estudio -> 0 LP (NO_ACTIVE_RULE, nunca LP_GRANTED)', afterAnswerOutcome.outcome === 'NO_ACTIVE_RULE');

  const studyTopicAfterId = await insertActivity(prisma, accountId, 'TEMA_COMPLETADO', new Date(), 'study-topic-after');
  const studyTopicAfterActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: studyTopicAfterId } });
  const afterTopicOutcome = await grantService.grantForActivity(studyTopicAfterActivity);
  check('post-T: completar tema de Estudio -> 0 LP (NO_ACTIVE_RULE)', afterTopicOutcome.outcome === 'NO_ACTIVE_RULE');

  const resourceAfterId = await insertActivity(prisma, accountId, 'RECURSO_COMPLETADO', new Date(), 'resource-after');
  const resourceAfterActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: resourceAfterId } });
  const resourceOutcome = await grantService.grantForActivity(resourceAfterActivity);
  check('RECURSO_COMPLETADO -> 0 LP (nunca tuvo regla, XP-only)', resourceOutcome.outcome === 'NO_ACTIVE_RULE');

  const examAfterId = await insertActivity(prisma, accountId, 'ENSAYO_COMPLETADO', new Date(), 'exam-after');
  const examAfterActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: examAfterId } });
  const examOutcome = await grantService.grantForActivity(examAfterActivity);
  check('ENSAYO_COMPLETADO -> 0 LP (nunca tuvo regla, XP-only)', examOutcome.outcome === 'NO_ACTIVE_RULE');

  participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('leaguePoints sigue en 6 (nada de lo anterior sumó LP nuevo)', participationRow.leaguePoints === 6);

  // Quick Question (genuinamente Competir) DEBE seguir otorgando LP.
  // Fixtures mínimas propias (pregunta + alternativa correcta publicadas),
  // sin depender de que la DB desechable tenga contenido previo.
  const quickAttemptId = randomUUID();
  const qId = randomUUID();
  const qvId = randomUUID();
  const subj = await prisma.subject.create({ data: { id: randomUUID(), subjectKey: `gate-lp-subj-${Date.now()}`, name: 'M', shortName: 'M', displayOrder: 999, status: 'ACTIVE' } });
  const topic = await prisma.curriculumTopic.create({ data: { id: randomUUID(), code: `GATE.LP.${Date.now()}`, name: 'T', order: 999, subjectId: subj.id } });
  await prisma.question.create({ data: { id: qId, questionKey: `gate-lp-q-${Date.now()}`, primarySubjectId: subj.id, questionType: 'SINGLE_CHOICE', status: 'ACTIVE' } });
  await prisma.questionVersion.create({
    data: { id: qvId, questionId: qId, curriculumTopicId: topic.id, stemContent: [{ type: 'paragraph', order: 0, text: 'x' }], explanationContent: [{ type: 'paragraph', order: 0, text: 'x' }], editorialStatus: 'DRAFT' },
  });
  const optId = randomUUID();
  await prisma.answerOption.create({ data: { id: optId, questionVersionId: qvId, content: { type: 'paragraph', order: 0, text: 'a' }, displayOrder: 0, isCorrect: true } });
  await prisma.questionVersion.update({ where: { id: qvId }, data: { editorialStatus: 'PUBLISHED', publishedAt: new Date() } });
  const quickSession = await prisma.quickQuestionSession.create({ data: { id: randomUUID(), accountId, status: 'ACTIVE' } });
  await prisma.quickQuestionAttempt.create({
    data: { id: quickAttemptId, accountId, sessionId: quickSession.id, questionVersionId: qvId, answerOptionId: optId, isCorrect: true, presentedAt: new Date(), respondedAt: new Date(), operationId: randomUUID() },
  });

  const quickActivityId = await insertActivity(prisma, accountId, 'QUICK_QUESTION_ANSWERED', new Date(), 'quick-after');
  await prisma.validatedGamificationActivity.update({ where: { id: quickActivityId }, data: { sourceEntityId: quickAttemptId } });
  const quickActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: quickActivityId } });
  const quickOutcome = await grantService.grantForActivity(quickActivity);
  check('Quick Question (correcta, post-T) -> LP_GRANTED (Competir sigue funcionando)', quickOutcome.outcome === 'LP_GRANTED');
  participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('leaguePoints = 8 (6 histórico intacto + 2 de Quick post-T)', participationRow.leaguePoints === 8);

  // Reprocesar Quick no duplica
  const quickRetry = await grantService.grantForActivity(quickActivity);
  check('reprocesar el mismo Quick -> sigue LP_GRANTED (idempotente, mismo entry)', quickRetry.outcome === 'LP_GRANTED');
  participationRow = await prisma.seasonLeagueParticipation.findUniqueOrThrow({ where: { id: participationId } });
  check('leaguePoints sigue en 8 (no 10) tras reprocesar Quick', participationRow.leaguePoints === 8);

  // --- Fase 5: joinedAt / OUT_OF_WINDOW sin cambios ---
  console.log('--- 5. Guarda joinedAt/OUT_OF_WINDOW sin cambios ---');
  const preJoinId = await insertActivity(prisma, accountId, 'QUICK_QUESTION_ANSWERED', new Date(joinedAt.getTime() - 60_000), 'pre-join-quick');
  await prisma.validatedGamificationActivity.update({ where: { id: preJoinId }, data: { sourceEntityId: quickAttemptId } });
  const preJoinActivity = await prisma.validatedGamificationActivity.findUniqueOrThrow({ where: { id: preJoinId } });
  const preJoinOutcome = await grantService.grantForActivity(preJoinActivity);
  check('actividad ANTES de joinedAt -> OUT_OF_WINDOW (sin cambios)', preJoinOutcome.outcome === 'OUT_OF_WINDOW');

  await prisma.$disconnect();
  if (failures > 0) {
    console.error(`\n${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('\nTodas las verificaciones del gate de frontera LP Study/Competir pasaron.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
