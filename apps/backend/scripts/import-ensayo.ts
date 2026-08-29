/**
 * ENSAYOS-M1-B -- importer del banco de Ensayos. Cliente HTTP delgado, mismo
 * espíritu exacto que `scripts/import-content.ts` (Study) y `src/cli/editorial.ts`:
 * NO abre PrismaClient, NO conecta a Postgres, NO usa SQL, NO importa
 * repositorios -- solo `fetch` contra la API administrativa ya autorizada.
 *
 * Transforma `apps/backend/content/ensayo/**` en contenido real de:
 *   - EDITORIAL (Question / QuestionVersion / AnswerOption), vía el mismo
 *     workflow DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED que usa Study
 *     (`POST /administration/editorial/{subjects,curriculum-topics,questions,
 *      question-versions/:id/transitions}`), con dos actores administrativos
 *     (CMS-018: ningún actor auto-aprueba su propia versión).
 *   - EXAMS (Exam / ExamQuestion), vía la fachada administrativa que delega en
 *     `ExamService` (`POST /administration/exams`, `.../questions`, `.../publish`).
 *
 * Idempotente: un segundo run sobre source sin cambios no crea ninguna fila
 * nueva -- reconoce CREATE / NO-OP / RESUMED / NEW_VERSION por clave estable.
 *
 * TAXONOMÍA (ADR-0024): las 65 QuestionVersions cuelgan de un CurriculumTopic
 * `ENSAYO.M1` bajo un Subject contenedor `ensayos` -- excluido de todas las
 * superficies Study (`SubjectRepository.findAllActiveStudyCatalog`). El `Exam`
 * en cambio se asocia al Subject real `matematica`.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { loadExamModules } from '../content/ensayo/load';
import { ENSAYO_M1_BLUEPRINT } from '../content/ensayo/manifest';

const ADMIN_TOKEN_HEADER = 'x-admin-token';
const DEFAULT_API_URL = 'http://127.0.0.1:3000';
const ENSAYO_ROOT = join(__dirname, '..', 'content', 'ensayo');
// El servidor aplica un throttler global de ~100 req/60s. El import completo
// son ~325 peticiones, así que se pacea deliberadamente por debajo de ese
// límite (~1 req / 700 ms) y se reintenta un 429 varias veces con backoff.
const WRITE_PACING_MS = 700;
const MAX_429_RETRIES = 6;
const RETRY_BACKOFF_MS = [2000, 5000, 10000, 15000, 20000, 30000];

// Contenedor técnico de la taxonomía de Ensayos -- NO es una materia Study.
const ENSAYO_SUBJECT = { subjectKey: 'ensayos', name: 'Ensayos', shortName: 'Ens', displayOrder: 900 } as const;
// Subject real al que se asocia el Exam (ADR-0024 §7). `matematica` ES ahora
// "Matemática M1" tras M1/M2 SUBJECT TAXONOMY ALIGNMENT -> ENSAYO.M1 queda
// correctamente bajo Matemática M1. El futuro ENSAYO.M2 usará
// `subjectKey: 'matematica-m2'` (incremento aparte); hoy sólo M1 se importa.
const EXAM_SUBJECT_KEY = 'matematica';

type Flags = Map<string, string>;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv: string[]): Flags {
  const flags: Flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t?.startsWith('--')) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) flags.set(key, 'true');
    else {
      flags.set(key, next);
      i += 1;
    }
  }
  return flags;
}

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function resolveApiUrl(flags: Flags): string {
  return (flags.get('api-url') ?? process.env.AXIOMA_ADMIN_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
}
function resolveToken(flags: Flags): string {
  const t = flags.get('token') ?? process.env.AXIOMA_ADMIN_TOKEN;
  if (!t || t === 'true') fail('falta el token del actor AUTOR. Use --token o AXIOMA_ADMIN_TOKEN.');
  return t;
}
function resolvePublisherToken(flags: Flags, authorToken: string): string {
  return flags.get('publisher-token') ?? process.env.AXIOMA_PUBLISHER_TOKEN ?? authorToken;
}

interface HttpResult {
  status: number;
  body: unknown;
}
async function adminRequest(apiUrl: string, token: string, method: string, path: string, body?: unknown): Promise<HttpResult> {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { [ADMIN_TOKEN_HEADER]: token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      /* texto crudo */
    }
    if (res.status === 429 && attempt < MAX_429_RETRIES) {
      const backoff = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!;
      console.warn(`  [429] ${method} ${path} -- reintento ${attempt + 1}/${MAX_429_RETRIES} en ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    return { status: res.status, body: parsed };
  }
}
function assertOk(res: HttpResult, what: string): unknown {
  if (res.status < 200 || res.status >= 300) fail(`${what} falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// --- Canonicalización fuente vs. publicado (mismo criterio que import-content.ts) ---
function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
function stripSvg(blocks: unknown): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) =>
    b && typeof b === 'object' && (b as { type?: string }).type === 'formula'
      ? (({ svg: _s, ...rest }) => rest)(b as Record<string, unknown>)
      : b,
  );
}
function canonQuestion(stem: unknown, explanation: unknown, options: { content: unknown; isCorrect: boolean }[]): string {
  return canon({
    stemContent: stripSvg(stem),
    explanationContent: stripSvg(explanation),
    options: options.map((o) => ({ content: stripSvg([o.content])[0], isCorrect: o.isCorrect })),
  });
}

const WORKFLOW = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED'] as const;
type Resumable = 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
const RESUMABLE = new Set<string>(['DRAFT', 'IN_REVIEW', 'APPROVED']);

async function transitionsToPublished(
  apiUrl: string,
  authorToken: string,
  publisherToken: string,
  versionId: string,
  from: Resumable = 'DRAFT',
): Promise<void> {
  const tokenFor = { IN_REVIEW: authorToken, APPROVED: publisherToken, PUBLISHED: publisherToken } as const;
  const remaining = WORKFLOW.slice(WORKFLOW.indexOf(from) + 1) as ReadonlyArray<'IN_REVIEW' | 'APPROVED' | 'PUBLISHED'>;
  for (const targetStatus of remaining) {
    await sleep(WRITE_PACING_MS);
    const body: { targetStatus: typeof targetStatus; operationId?: string } = { targetStatus };
    if (targetStatus === 'PUBLISHED') body.operationId = randomUUID();
    assertOk(
      await adminRequest(apiUrl, tokenFor[targetStatus], 'POST', `/administration/editorial/question-versions/${versionId}/transitions`, body),
      `transición a ${targetStatus} de ${versionId}`,
    );
  }
}

type QAction = 'CREATE' | 'NO-OP' | 'RESUMED' | 'NEW_VERSION';

interface LatestQuestion {
  questionId: string;
  versionId: string;
  status: string;
  stemContent: unknown;
  explanationContent: unknown;
  answerOptions: { content: unknown; isCorrect: boolean }[];
}

async function readLatestQuestion(apiUrl: string, token: string, key: string): Promise<LatestQuestion | null> {
  const res = await adminRequest(apiUrl, token, 'GET', `/administration/editorial/questions/by-key/${encodeURIComponent(key)}`);
  if (res.status === 404) return null;
  if (res.status !== 200) fail(`lectura de "${key}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const b = res.body as {
    questionId: string;
    latestVersion:
      | { versionId: string; editorialStatus: string; stemContent: unknown; explanationContent: unknown; answerOptions: { content: unknown; isCorrect: boolean }[] }
      | null;
  };
  if (!b.latestVersion) return null;
  return {
    questionId: b.questionId,
    versionId: b.latestVersion.versionId,
    status: b.latestVersion.editorialStatus,
    stemContent: b.latestVersion.stemContent,
    explanationContent: b.latestVersion.explanationContent,
    answerOptions: b.latestVersion.answerOptions,
  };
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  const dryRun = flags.get('dry-run') === 'true';
  const apiUrl = resolveApiUrl(flags);
  const authorToken = dryRun && !flags.get('token') && !process.env.AXIOMA_ADMIN_TOKEN ? '(dry-run)' : resolveToken(flags);
  const publisherToken = resolvePublisherToken(flags, authorToken);

  const { loaded, issues } = await loadExamModules(ENSAYO_ROOT);
  if (issues.length > 0) {
    console.error('Validación pre-BD FALLÓ -- no se escribe nada:');
    for (const i of issues) console.error(`  ${i.file}: ${i.message}`);
    process.exit(1);
  }
  if (loaded.length !== 1) fail(`se esperaba exactamente 1 módulo de Ensayo, se cargaron ${loaded.length}.`);
  const exam = loaded[0]!.module;
  const durationSeconds = exam.durationMinutes * 60;

  console.log(`=== ENSAYO IMPORT: ${exam.examKey} -- ${exam.questions.length} preguntas -- dry-run: ${dryRun} ===\n`);

  if (dryRun) {
    console.log('[dry-run] plan:');
    console.log(`  - resolver Subject '${ENSAYO_SUBJECT.subjectKey}' + CurriculumTopic '${exam.examKey}'`);
    console.log(`  - por cada Q1..Q${exam.questions.length}: leer por clave -> CREATE|NO-OP|RESUMED|NEW_VERSION -> publicar`);
    console.log(`  - resolver Exam '${exam.examKey}' (subject '${EXAM_SUBJECT_KEY}', durationSeconds ${durationSeconds})`);
    console.log(`  - vincular ${exam.questions.length} ExamQuestion (displayOrder 1..${exam.questions.length})`);
    console.log(`  - publicar Exam`);
    return;
  }

  // --- 1. Taxonomía de Ensayos ---
  console.log('--- 1. Taxonomía ---');
  await sleep(WRITE_PACING_MS);
  const subjectBody = assertOk(
    await adminRequest(apiUrl, authorToken, 'POST', '/administration/editorial/subjects', ENSAYO_SUBJECT),
    `resolución de Subject '${ENSAYO_SUBJECT.subjectKey}'`,
  ) as { id: string; created: boolean };
  console.log(`  Subject ${ENSAYO_SUBJECT.subjectKey}: ${subjectBody.id} (${subjectBody.created ? 'CREATED' : 'NO-OP'})`);

  await sleep(WRITE_PACING_MS);
  const topicBody = assertOk(
    await adminRequest(apiUrl, authorToken, 'POST', '/administration/editorial/curriculum-topics', {
      code: exam.examKey,
      name: exam.title,
      order: 1,
      subjectId: subjectBody.id,
      parentId: null,
    }),
    `resolución de CurriculumTopic '${exam.examKey}'`,
  ) as { id: string; created: boolean };
  console.log(`  CurriculumTopic ${exam.examKey}: ${topicBody.id} (${topicBody.created ? 'CREATED' : 'NO-OP'})`);

  // --- 2. Preguntas: crear/reconciliar y publicar ---
  console.log('\n--- 2. Preguntas (workflow editorial real) ---');
  const summary: Record<QAction, number> = { CREATE: 0, 'NO-OP': 0, RESUMED: 0, NEW_VERSION: 0 };
  const publishedVersionByOrder = new Map<number, string>();

  for (const q of exam.questions) {
    const answerOptions = q.options.map((o) => ({ content: o.content, isCorrect: o.correct }));
    const sourceCanon = canonQuestion(q.stemContent, q.explanationContent, answerOptions);
    const existing = await readLatestQuestion(apiUrl, authorToken, q.questionKey);

    let action: QAction;
    let publishedVersionId: string;

    if (!existing) {
      await sleep(WRITE_PACING_MS);
      const created = assertOk(
        await adminRequest(apiUrl, authorToken, 'POST', '/administration/editorial/questions', {
          questionKey: q.questionKey,
          primarySubjectId: subjectBody.id,
          curriculumTopicId: topicBody.id,
          stemContent: q.stemContent,
          explanationContent: q.explanationContent,
          answerOptions,
        }),
        `creación de Question "${q.questionKey}"`,
      ) as { versionId: string };
      await transitionsToPublished(apiUrl, authorToken, publisherToken, created.versionId);
      publishedVersionId = created.versionId;
      action = 'CREATE';
    } else {
      const existingCanon = canonQuestion(existing.stemContent, existing.explanationContent, existing.answerOptions);
      if (existing.status === 'PUBLISHED') {
        if (sourceCanon === existingCanon) {
          publishedVersionId = existing.versionId;
          action = 'NO-OP';
        } else {
          await sleep(WRITE_PACING_MS);
          const nv = assertOk(
            await adminRequest(apiUrl, authorToken, 'POST', `/administration/editorial/questions/${existing.questionId}/versions`, {
              curriculumTopicId: topicBody.id,
              stemContent: q.stemContent,
              explanationContent: q.explanationContent,
              answerOptions,
            }),
            `nueva versión de "${q.questionKey}"`,
          ) as { versionId: string };
          await transitionsToPublished(apiUrl, authorToken, publisherToken, nv.versionId);
          publishedVersionId = nv.versionId;
          action = 'NEW_VERSION';
        }
      } else if (RESUMABLE.has(existing.status)) {
        if (sourceCanon !== existingCanon) {
          fail(`conflicto: "${q.questionKey}" tiene una versión ${existing.status} cuyo contenido NO coincide con el source -- requiere decisión editorial manual.`);
        }
        await transitionsToPublished(apiUrl, authorToken, publisherToken, existing.versionId, existing.status as Resumable);
        publishedVersionId = existing.versionId;
        action = 'RESUMED';
      } else {
        fail(`conflicto: "${q.questionKey}" -- versión más reciente en estado ${existing.status}, sin PUBLISHED vigente. Decisión editorial manual.`);
      }
    }

    // `publishedVersionId` es, en los cuatro caminos, la versión que quedó
    // PUBLISHED: la recién publicada (CREATE/NEW_VERSION/RESUMED) o la que ya
    // lo estaba (NO-OP). No se re-lee (ahorra 65 peticiones); el gate audita
    // source->DB por separado.
    publishedVersionByOrder.set(q.displayOrder, publishedVersionId);
    summary[action] += 1;
    console.log(`  ${q.questionKey} (pos ${q.displayOrder}): ${action} -> version ${publishedVersionId}`);
  }

  // --- 3. Exam ---
  console.log('\n--- 3. Exam ---');
  await sleep(WRITE_PACING_MS);
  const examBody = assertOk(
    await adminRequest(apiUrl, publisherToken, 'POST', '/administration/exams', {
      examKey: exam.examKey,
      title: exam.title,
      subjectKey: EXAM_SUBJECT_KEY,
      durationSeconds,
    }),
    `resolución de Exam "${exam.examKey}"`,
  ) as { id: string; status: string; created: boolean; subjectId: string; durationSeconds: number };
  console.log(`  Exam ${exam.examKey}: ${examBody.id} (${examBody.created ? 'CREATED' : 'NO-OP'}) status=${examBody.status} subject=${examBody.subjectId} durationSeconds=${examBody.durationSeconds}`);

  // --- 4. ExamQuestion links ---
  console.log('\n--- 4. ExamQuestion links ---');
  const linkSummary = { created: 0, noop: 0 };
  for (const q of exam.questions) {
    const questionVersionId = publishedVersionByOrder.get(q.displayOrder)!;
    await sleep(WRITE_PACING_MS);
    const link = assertOk(
      await adminRequest(apiUrl, publisherToken, 'POST', `/administration/exams/${examBody.id}/questions`, {
        questionVersionId,
        displayOrder: q.displayOrder,
      }),
      `vínculo ExamQuestion pos ${q.displayOrder}`,
    ) as { created: boolean };
    if (link.created) linkSummary.created += 1;
    else linkSummary.noop += 1;
  }
  console.log(`  ${linkSummary.created} creados, ${linkSummary.noop} NO-OP`);

  // --- 5. Publicar Exam ---
  console.log('\n--- 5. Publicar Exam ---');
  await sleep(WRITE_PACING_MS);
  const pub = assertOk(
    await adminRequest(apiUrl, publisherToken, 'POST', `/administration/exams/${examBody.id}/publish`, {}),
    `publicación de Exam "${exam.examKey}"`,
  ) as { status: string; alreadyPublished: boolean };
  console.log(`  status=${pub.status} (${pub.alreadyPublished ? 'ya estaba PUBLISHED' : 'PUBLICADO ahora'})`);

  // --- Resumen ---
  console.log('\n=== RESUMEN ===');
  console.log(`  Preguntas: CREATE=${summary.CREATE} NO-OP=${summary['NO-OP']} RESUMED=${summary.RESUMED} NEW_VERSION=${summary.NEW_VERSION}`);
  console.log(`  Links:     created=${linkSummary.created} noop=${linkSummary.noop}`);
  console.log(`  Exam:      ${examBody.created ? 'CREATED' : 'REUSED'} / ${pub.status}`);
  console.log(`  Blueprint: ${ENSAYO_M1_BLUEPRINT.expectedQuestionCount} preguntas esperadas, ${exam.questions.length} en source`);

  const totalPublished = summary.CREATE + summary['NO-OP'] + summary.RESUMED + summary.NEW_VERSION;
  if (totalPublished !== exam.questions.length) fail(`se esperaban ${exam.questions.length} preguntas resueltas, se procesaron ${totalPublished}.`);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
