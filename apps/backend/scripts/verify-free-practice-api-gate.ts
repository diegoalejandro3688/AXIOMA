// Gate del lane STATELESS de Práctica libre (ESTUDIO / PRÁCTICA LIBRE V1,
// P0 backend). Deliberadamente SIN Postgres, SIN Docker, SIN `run-gate.ts`
// -- ejecutable con solo `tsx`, mismo criterio que
// `verify-content-source-gate.ts`.
//
// Cubre:
//   A. INVARIANTE STATELESS (scan de fuente) -- ninguna de las piezas nuevas
//      importa/menciona `student_response`, `curriculum_topic_progress`,
//      Outbox, XP, LP, gamificación, desafíos ni `ProgressService`.
//   B. FILTRO CANÓNICO (scan del SQL) -- PUBLISHED, question ACTIVE,
//      `parent_id IS NOT NULL`, `subject_id` de la ruta, EXISTS
//      `learning_resource_version` PUBLISHED, `!= ALL(exclude)`.
//   C. QUICK QUESTION intacto -- `findRandomEligible` sin cambios (0 deleciones).
//   D. ORQUESTACIÓN del servicio con repos falsos -- dedup del exclude set,
//      pool agotado -> `question: null`, rechazo cross-subject / opción
//      ajena, `isCorrect` correcto/incorrecto, y CERO llamadas de escritura.
//   E. CONTRATOS -- Zod: `default([])`, cota `MAX_PRACTICE_EXCLUDE_IDS`,
//      `question` nullable, shape de answer.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  practiceQuestionSampleRequestSchema,
  practiceQuestionSampleResponseSchema,
  practiceQuestionAnswerRequestSchema,
  practiceQuestionAnswerResponseSchema,
  MAX_PRACTICE_EXCLUDE_IDS,
} from '@axioma/contracts';
import { EducationService } from '../src/education/education.service';

const ROOT = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures += 1;
  }
}
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
/** Elimina comentarios de bloque y de línea -- el scan de "invariante" mira SÓLO código ejecutable
 *  (los docstrings mencionan a propósito "NO otorga XP" etc. para documentar la ausencia). */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const serviceSrc = read('src/education/education.service.ts');
const controllerSrc = read('src/education/education.controller.ts');
const repoSrc = read('src/education/question-version.repository.ts');

// --------------------------------------------------------------------------
console.log('--- A. Invariante STATELESS: las piezas nuevas no tocan el lane académico ni gamificación ---');
// Código ejecutable (sin comentarios) de las piezas nuevas, aislado por
// marcador de MÉTODO (no de docstring).
const svcCode = stripComments(serviceSrc);
const repoCode = stripComments(repoSrc);
const svcPractice = svcCode.slice(svcCode.indexOf('async samplePracticeQuestion'));
const repoPractice = repoCode.slice(repoCode.indexOf('async findRandomPracticeQuestionForSubject'));
const FORBIDDEN: Array<[string, RegExp]> = [
  ['no crea student_response', /studentResponse|student_response|responseRepo|StudentResponse/],
  ['no toca curriculum_topic_progress', /topic_progress|topicProgressRepo|TopicProgress|recordActivityAndMaybeComplete/],
  ['no publica al Outbox', /outbox|Outbox|\.publish\(/],
  ['no otorga XP', /\bXP\b|xpLedger|xp_ledger|GamificationService|gamification/i],
  ['no otorga LP / League Points', /LeaguePoint|league_point|\bLP\b|competitive/i],
  ['no avanza desafíos', /challenge|Challenge|desaf[íi]o/i],
  ['no emite student_response_recorded / curriculum_topic_completed', /student_response_recorded|curriculum_topic_completed/],
  ['no usa ProgressService', /ProgressService|progress\.service/],
  ['no crea sesión / attempt', /Session|session|Attempt|attempt/],
];
for (const [label, re] of FORBIDDEN) {
  check(`servicio: ${label}`, !re.test(svcPractice));
  check(`repositorio: ${label}`, !re.test(repoPractice));
}
check('servicio: métodos declarados sin `async` write helpers -- sólo `.parse` + repos de EDUCATION', /questionVersionRepo\.(findRandomPracticeQuestionForSubject|findEligiblePracticeQuestionById)/.test(svcPractice) && /answerOptionRepo\.findById/.test(svcPractice));
check('repositorio: sólo `$queryRaw` de LECTURA (SELECT), nunca INSERT/UPDATE/DELETE', /\$queryRaw</.test(repoPractice) && !/INSERT\s+INTO|UPDATE\s+"|DELETE\s+FROM/i.test(repoPractice));

// --------------------------------------------------------------------------
console.log('--- B. Filtro canónico (SQL de práctica libre) ---');
for (const [label, re] of [
  ['question_version PUBLISHED', /qv\."editorial_status"\s*=\s*'PUBLISHED'/],
  ['question ACTIVE (no retirada)', /q\."status"\s*=\s*'ACTIVE'/],
  ['recurso, no unidad raíz ni legacy: parent_id IS NOT NULL', /resource\."parent_id"\s+IS\s+NOT\s+NULL/],
  ['acotado a la materia de la ruta: subject_id', /resource\."subject_id"\s*=\s*\$\{subjectId\}::uuid/],
  ['recurso con learning_resource_version PUBLISHED (canónico)', /EXISTS\s*\(\s*SELECT 1 FROM "learning_resource_version"[\s\S]*?editorial_status"\s*=\s*'PUBLISHED'/],
] as Array<[string, RegExp]>) {
  check(`sample SQL: ${label}`, re.test(repoPractice));
}
check('sample SQL: excluye las ya vistas -- != ALL(exclude)', /qv\."id"\s*!=\s*ALL\(\$\{excludeQuestionVersionIds\}::uuid\[\]\)/.test(repoPractice));
check('sample SQL: aleatorio server-side -- ORDER BY random() LIMIT 1', /ORDER BY random\(\)\s*\n?\s*LIMIT 1/.test(repoPractice));
check('answer-by-id SQL: mismo predicado canónico + PUBLISHED + ACTIVE + subject', /findEligiblePracticeQuestionById[\s\S]*qv\."editorial_status"\s*=\s*'PUBLISHED'[\s\S]*q\."status"\s*=\s*'ACTIVE'[\s\S]*resource\."subject_id"\s*=\s*\$\{subjectId\}::uuid/.test(repoPractice));

// --------------------------------------------------------------------------
console.log('--- C. Quick Question intacto ---');
const diff = execFileSync('git', ['diff', '--numstat', 'HEAD', '--', 'apps/backend/src/education/question-version.repository.ts'], {
  cwd: join(ROOT, '..', '..'),
  encoding: 'utf8',
}).trim();
const deletions = diff ? Number(diff.split(/\s+/)[1]) : 0;
check('question-version.repository.ts: 0 líneas eliminadas (cambio 100% ADITIVO)', deletions === 0);
check('`findRandomEligible` (global, de Quick Question) sigue presente y sin filtro de materia', /async findRandomEligible\(excludeQuestionVersionIds: string\[\], tx\?: Prisma\.TransactionClient\)/.test(repoSrc) && !/findRandomEligible[\s\S]{0,400}subject_id/.test(repoSrc));

// --------------------------------------------------------------------------
console.log('--- D. Orquestación del servicio (repos falsos, sin DB) ---');
type Rec = { method: string; args: unknown[] };
const calls: Rec[] = [];
const SUBJECT_ID = randomUUID();
const QV_ID = randomUUID();
const OPT_CORRECT = randomUUID();
const OPT_WRONG = randomUUID();

const paragraph = (text: string) => [{ type: 'paragraph' as const, order: 0, text }];
const block = (text: string) => ({ type: 'paragraph' as const, order: 0, text });
const fakeVersion = {
  id: QV_ID,
  questionId: randomUUID(),
  curriculumTopicId: randomUUID(),
  editorialStatus: 'PUBLISHED',
  stemContent: paragraph('¿Enunciado de práctica?'),
  explanationContent: paragraph('Explicación.'),
  publishedAt: new Date('2026-01-01T00:00:00Z'),
  question: { id: randomUUID(), questionKey: 'X.Y.Z.Q1', questionType: 'SINGLE_CHOICE' },
  answerOptions: [
    { id: OPT_CORRECT, questionVersionId: QV_ID, content: block('A'), displayOrder: 0, isCorrect: true },
    { id: OPT_WRONG, questionVersionId: QV_ID, content: block('B'), displayOrder: 1, isCorrect: false },
  ],
};

function makeService(over: Partial<Record<string, unknown>> = {}) {
  const subjectRepo = { findById: async (id: string) => (id === SUBJECT_ID ? { id, subjectKey: 'ciencias' } : null) };
  const topicRepo = {};
  const resourceVersionRepo = {};
  const questionVersionRepo = {
    findRandomPracticeQuestionForSubject: async (...args: unknown[]) => {
      calls.push({ method: 'findRandomPracticeQuestionForSubject', args });
      return 'randomResult' in over ? (over.randomResult as unknown) : fakeVersion;
    },
    findEligiblePracticeQuestionById: async (...args: unknown[]) => {
      calls.push({ method: 'findEligiblePracticeQuestionById', args });
      return over.eligibleResult === undefined ? fakeVersion : (over.eligibleResult as unknown);
    },
  };
  const answerOptionRepo = {
    findById: async (id: string) => {
      calls.push({ method: 'answerOptionRepo.findById', args: [id] });
      return fakeVersion.answerOptions.find((o) => o.id === id) ?? (over.foreignOption as unknown) ?? null;
    },
  };
  const objectStorage = { getSignedReadUrl: async () => 'never-called' };
  // PREMIUM V1 (C1.3) -- Práctica libre NUNCA se gatea: estos dos colaboradores
  // no deben ser tocados por `samplePracticeQuestion`/`answerPracticeQuestion`.
  const entitlementService = {
    getEntitlement: async () => {
      calls.push({ method: 'entitlementService.getEntitlement', args: [] });
      return { tier: 'FREE' as const };
    },
  };
  const premiumContentPolicy = {
    classifyTopic: async () => {
      calls.push({ method: 'premiumContentPolicy.classifyTopic', args: [] });
      return 'FREE_UNIT' as const;
    },
  };
  return new EducationService(
    subjectRepo as never,
    topicRepo as never,
    resourceVersionRepo as never,
    questionVersionRepo as never,
    answerOptionRepo as never,
    objectStorage as never,
    entitlementService as never,
    premiumContentPolicy as never,
  );
}

async function expectThrow(label: string, fn: () => Promise<unknown>, name: string) {
  try {
    await fn();
    check(`${label} -> lanza ${name}`, false);
  } catch (e) {
    check(`${label} -> lanza ${name}`, (e as { constructor: { name: string } }).constructor.name === name);
  }
}

(async () => {
  // D.1 -- dedup del exclude set antes de tocar el repo
  calls.length = 0;
  const dup = [QV_ID, QV_ID, OPT_WRONG, OPT_WRONG, OPT_WRONG];
  await makeService().samplePracticeQuestion(SUBJECT_ID, dup);
  const passed = calls.find((c) => c.method === 'findRandomPracticeQuestionForSubject')?.args[1] as string[];
  check('sample: el repo recibe subjectId de la ruta', calls[0]?.args?.[0] === SUBJECT_ID || (calls.find((c) => c.method === 'findRandomPracticeQuestionForSubject')?.args[0] === SUBJECT_ID));
  check('sample: el exclude set llega DEDUPLICADO al repo', passed.length === 2 && new Set(passed).size === passed.length);

  // D.2 -- pool agotado -> { question: null }, sin 404
  const exhausted = await makeService({ randomResult: null }).samplePracticeQuestion(SUBJECT_ID, [QV_ID]);
  check('sample: pool agotado -> { question: null } (nunca 404)', exhausted.question === null);
  check('sample: respuesta valida contra practiceQuestionSampleResponseSchema', practiceQuestionSampleResponseSchema.safeParse(exhausted).success);

  // D.3 -- happy path
  const ok = await makeService().samplePracticeQuestion(SUBJECT_ID, []);
  check('sample: happy path -> question presente', ok.question !== null && ok.question?.versionId === QV_ID);
  check('sample: la pregunta NO expone isCorrect', ok.question !== null && !JSON.stringify(ok.question).includes('isCorrect'));

  // D.4 -- subject inexistente
  await expectThrow('sample: subjectId inexistente', () => makeService().samplePracticeQuestion(randomUUID(), []), 'NotFoundException');
  await expectThrow('answer: subjectId inexistente', () => makeService().answerPracticeQuestion(randomUUID(), QV_ID, OPT_CORRECT), 'NotFoundException');

  // D.5 -- answer: pregunta no elegible (otra materia / no publicada / no canónica)
  await expectThrow('answer: qv no elegible para esta materia', () => makeService({ eligibleResult: null }).answerPracticeQuestion(SUBJECT_ID, QV_ID, OPT_CORRECT), 'NotFoundException');

  // D.6 -- answer: opción de otra pregunta
  await expectThrow(
    'answer: answerOptionId de otra pregunta',
    () => makeService({ foreignOption: { id: 'x', questionVersionId: randomUUID(), isCorrect: true } }).answerPracticeQuestion(SUBJECT_ID, QV_ID, randomUUID()),
    'BadRequestException',
  );

  // D.7 -- answer: correcto / incorrecto server-authoritative
  const rc = await makeService().answerPracticeQuestion(SUBJECT_ID, QV_ID, OPT_CORRECT);
  check('answer: alternativa correcta -> isCorrect true', rc.isCorrect === true && rc.questionVersionId === QV_ID && rc.answerOptionId === OPT_CORRECT);
  const ri = await makeService().answerPracticeQuestion(SUBJECT_ID, QV_ID, OPT_WRONG);
  check('answer: alternativa incorrecta -> isCorrect false', ri.isCorrect === false);
  check('answer: respuesta valida contra practiceQuestionAnswerResponseSchema', practiceQuestionAnswerResponseSchema.safeParse(rc).success);

  // D.8 -- CERO llamadas de escritura en toda la orquestación
  const writeish = calls.filter((c) => /create|update|delete|upsert|enqueue|publish|record|grant/i.test(c.method));
  check('orquestación: CERO llamadas a métodos de escritura', writeish.length === 0);

  // D.9 -- PREMIUM V1 (C1.3): Práctica libre NUNCA consulta entitlement ni la
  // policy de contenido premium. `calls` acumula todas las invocaciones de
  // esta corrida completa.
  check(
    'práctica libre: CERO llamadas a entitlementService.getEntitlement / premiumContentPolicy.classifyTopic',
    calls.filter((c) => /entitlementService|premiumContentPolicy/.test(c.method)).length === 0,
  );

  // ----------------------------------------------------------------------
  console.log('--- E. Contratos ---');
  check('sample request: excludeQuestionVersionIds default []', practiceQuestionSampleRequestSchema.parse({}).excludeQuestionVersionIds.length === 0);
  check(`sample request: rechaza más de MAX_PRACTICE_EXCLUDE_IDS (${MAX_PRACTICE_EXCLUDE_IDS})`, !practiceQuestionSampleRequestSchema.safeParse({ excludeQuestionVersionIds: Array.from({ length: MAX_PRACTICE_EXCLUDE_IDS + 1 }, () => randomUUID()) }).success);
  check('sample request: rechaza ids no-UUID', !practiceQuestionSampleRequestSchema.safeParse({ excludeQuestionVersionIds: ['no-uuid'] }).success);
  check('sample response: question puede ser null', practiceQuestionSampleResponseSchema.safeParse({ question: null }).success);
  check('answer request: answerOptionId obligatorio y UUID', practiceQuestionAnswerRequestSchema.safeParse({ answerOptionId: randomUUID() }).success && !practiceQuestionAnswerRequestSchema.safeParse({}).success);
  check('answer response: sin topicStatus / sin progreso', !('topicStatus' in practiceQuestionAnswerResponseSchema.parse({ questionVersionId: randomUUID(), answerOptionId: randomUUID(), isCorrect: true })));

  // ----------------------------------------------------------------------
  console.log('--- F. Controller: POST (no GET), auth, parseRequestBody ---');
  check('controller: sample es @Post', /@Post\('subjects\/:subjectId\/practice-questions\/sample'\)/.test(controllerSrc));
  check('controller: answer es @Post', /@Post\('subjects\/:subjectId\/practice-questions\/:questionVersionId\/answer'\)/.test(controllerSrc));
  check('controller: NINGÚN practice endpoint es @Get', !/@Get\([^)]*practice-questions/.test(controllerSrc));
  check('controller: valida input con parseRequestBody', /parseRequestBody\(practiceQuestionSampleRequestSchema/.test(controllerSrc) && /parseRequestBody\(practiceQuestionAnswerRequestSchema/.test(controllerSrc));
  check('controller: hereda @UseGuards(AuthGuard) del @Controller', /@Controller\('education'\)\s*\n@UseGuards\(AuthGuard\)/.test(controllerSrc));
  check('controller: no importa ProgressService ni nada de gamificación', !/ProgressService|gamification|Gamification/.test(controllerSrc));

  console.log('');
  if (failures > 0) {
    console.error(`Gate de Práctica libre (P0 backend): ${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Gate de Práctica libre (P0 backend, lane stateless): todas las verificaciones pasaron.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
