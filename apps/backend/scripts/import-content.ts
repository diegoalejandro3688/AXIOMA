/**
 * CONTENT-4.2 / CONTENT-4.2B -- importer batch delgado. Transforma
 * `apps/backend/content/**\/*.ts` (`kind: 'catalog'` en modo normal;
 * `kind: 'validation'` solo con `--allow-validation` explícito) en
 * contenido editorial real, usando EXCLUSIVAMENTE las APIs administrativas/
 * editoriales ya autorizadas (CONTENT-4.2A + LEF Bloque VII + CONTENT-4.2B):
 *
 *   POST /administration/editorial/subjects                       (taxonomía, CONTENT-4.2A)
 *   POST /administration/editorial/curriculum-topics               (taxonomía, CONTENT-4.2A)
 *   POST /administration/editorial/learning-resources[...]         (autoría T1/T2, I4)
 *   POST /administration/editorial/questions[...]                  (autoría T1/T2, I4)
 *   POST .../transitions                                           (máquina de estados, I3)
 *   GET  /administration/editorial/questions/by-key/:key            (lectura administrativa COMPLETA, CONTENT-4.2B)
 *   GET  /administration/editorial/learning-resources/by-key/:key   (ídem)
 *
 * NO abre PrismaClient, NO conecta a Postgres, NO usa SQL, NO importa
 * repositorios: es un CLIENTE HTTP, mismo espíritu exacto que
 * `cli/editorial.ts` (§12.6) -- reutiliza su mecanismo de auth
 * (`x-admin-token`, `--token`/`AXIOMA_ADMIN_TOKEN`, `--api-url`/
 * `AXIOMA_ADMIN_API_URL`) sin importarlo (ese archivo no exporta nada; se
 * evita tocarlo para no arriesgar sus propios gates de forma).
 *
 * CONTENT-4.2B -- CIERRE DEL LÍMITE ISCORRECT. La versión original (CONTENT-4.2)
 * comparaba contra `GET /education/topics/:id/...` (lectura de ESTUDIANTE, que
 * omite `isCorrect` a propósito, ADR-0012): un cambio de "cuál alternativa es
 * correcta" con el mismo TEXTO de alternativas era indistinguible de un NO-OP.
 * Ahora el importer resuelve y compara contra la lectura ADMINISTRATIVA
 * completa por clave (`GET .../questions/by-key/:questionKey` y
 * `.../learning-resources/by-key/:resourceKey`, ambas bajo `x-admin-token` +
 * rol AUTHOR/PUBLISHER), que SÍ incluye `isCorrect`. Ya no se abre ninguna
 * sesión de estudiante `stub`; el importer solo depende de los dos tokens
 * administrativos que ya usa para escribir.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { join, relative } from 'node:path';
import { loadResourceModules, type LoadedResource } from '../content/load';
import { CONTENT_MANIFEST, findManifestResource, findManifestUnit, type ManifestSubject, type ManifestUnit } from '../content/manifest';
import type { SourceContentBlock, SourceQuestion } from '../content/schema';

const ADMIN_TOKEN_HEADER = 'x-admin-token';
const DEFAULT_API_URL = 'http://127.0.0.1:3000';
const CONTENT_ROOT = join(__dirname, '..', 'content');

// --- Pacing conservador (CONTENT-4.2, punto 14): el importer es secuencial,
// sin paralelización, con una pausa fija entre peticiones de escritura --
// muy por debajo del límite global de ~100 req/60s ya auditado. ---
const WRITE_REQUEST_PACING_MS = 150;
const MAX_429_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 3000];

type Args = { flags: Map<string, string> };

function parseArgs(argv: string[]): Args {
  const flags = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined || !token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags.set(key, 'true');
    } else {
      flags.set(key, next);
      i += 1;
    }
  }
  return { flags };
}

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const HELP = `
import-content.ts -- CONTENT-4.2. Driver HTTP delgado: content/**/*.ts -> API editorial real.

USO
  pnpm --filter @axioma/backend content:import -- --resource <resourceKey> [--dry-run]
  pnpm --filter @axioma/backend content:import -- --unit <unitCode> [--dry-run]
  pnpm --filter @axioma/backend content:import -- --all [--dry-run]

CREDENCIAL (obligatoria, salvo --dry-run sin escritura)
  --token <valor>        Token personal del actor AUTOR (crea/edita/envía a revisión). O AXIOMA_ADMIN_TOKEN.
  --publisher-token <valor>  Token del actor PUBLICADOR (aprueba/publica). O AXIOMA_PUBLISHER_TOKEN.
                           Si se omite, se usa el mismo que --token -- funciona solo si ese actor
                           NO fue quien creó/editó la versión (CMS-018, invariante 24: ningún actor
                           puede auto-aprobar su propia versión, ni con ambos roles a la vez). Con
                           un único actor autor+publicador, T5 (aprobar) fallará con 403 explícito --
                           el importer NUNCA activa la excepción de CMS-018 por su cuenta (es,
                           deliberadamente, un acto fuera de banda -- ver cli/activate-cms018-exception.ts).
  --api-url <url>        Destino. O AXIOMA_ADMIN_API_URL. Por defecto ${DEFAULT_API_URL}.

SELECTOR (obligatorio uno, nunca por defecto -- evita importar todo el catálogo por accidente)
  --resource <resourceKey>   Un único recurso, por resourceKey exacto.
  --unit <unitCode>          Todos los recursos de una unidad.
  --all                      TODO el catálogo (SOLO kind: 'catalog' -- ver --allow-validation).

CLASIFICACIÓN (CONTENT-4.2B, punto 7 -- autoridad = 'kind' del módulo, nunca el nombre de carpeta)
  kind: 'catalog'      Contenido V1 real. Cuenta en coverage oficial. Importable normalmente. Incluido por --all.
  kind: 'fixture'      Contenido de prueba estructural. NUNCA importable, sin excepción ni flag.
  kind: 'validation'   Contenido técnico E2E del PROPIO importer (recurso zztest). NO cuenta en
                        coverage. NO se importa por defecto, ni con --unit, ni con --all -- solo con
                        --resource <key> --allow-validation explícito.

  --allow-validation      Autoriza importar un recurso kind: 'validation' vía --resource.
                           Sin este flag, --resource <validation-key> falla sin escribir nada.
                           NUNCA habilita --all ni --unit sobre contenido validation (preferencia
                           congelada: --all = únicamente catalog, sin excepción).

MODOS
  --dry-run               Carga, valida y resuelve el plan (CREATE/NO-OP/NEW VERSION/SKIP FIXTURE).
                           NUNCA ejecuta ninguna petición de escritura.
`;

// ============================================================================
// Cliente HTTP -- mismo patrón que cli/editorial.ts (no se importa: ese
// archivo no exporta nada, y re-implementar ~15 líneas es más seguro que
// modificarlo para exportar).
// ============================================================================

function resolveToken(args: Args): string {
  const token = args.flags.get('token') ?? process.env.AXIOMA_ADMIN_TOKEN;
  if (!token || token === 'true') {
    fail('no se presentó ningún token personal de actor administrativo. Use --token <valor> o AXIOMA_ADMIN_TOKEN.');
  }
  return token;
}

function resolveApiUrl(args: Args): string {
  return (args.flags.get('api-url') ?? process.env.AXIOMA_ADMIN_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
}

/** Ver HELP -- por defecto, el mismo actor que autoriza (solo funciona sin conflicto de CMS-018). */
function resolvePublisherToken(args: Args, authorToken: string): string {
  return args.flags.get('publisher-token') ?? process.env.AXIOMA_PUBLISHER_TOKEN ?? authorToken;
}

interface HttpResult {
  status: number;
  body: unknown;
}

/**
 * Petición administrativa (escritura o lectura protegida). Reintento
 * ACOTADO solo ante 429 (throttling) -- nunca infinito, nunca para otros
 * códigos. `NUNCA` imprime el token (ni en logs de éxito ni de error).
 */
async function adminRequest(apiUrl: string, token: string, method: string, path: string, body?: unknown): Promise<HttpResult> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        [ADMIN_TOKEN_HEADER]: token,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = text.length > 0 ? JSON.parse(text) : null;
    } catch {
      /* respuesta no-JSON: se conserva el texto crudo */
    }
    if (response.status === 429 && attempt < MAX_429_RETRIES) {
      const backoff = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!;
      console.warn(`  [429] throttling en ${method} ${path} -- reintento ${attempt + 1}/${MAX_429_RETRIES} en ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    return { status: response.status, body: parsed };
  }
}

// ============================================================================
// Canonicalización -- comparación determinista fuente vs. publicado.
// ============================================================================

/** Igual que `canonicalize()` de `prisma/seed.ts` (mismo criterio, reimplementado aquí para no acoplarse a ese archivo, que CONTENT-4.2 tiene prohibido tocar). Ignora orden de claves JSON. */
function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.keys(value as Record<string, unknown>).sort();
    return `{${entries.map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Quita `svg` de cualquier bloque `formula` -- el SVG es SIEMPRE derivado (CONTENT-4.2, punto 10): nunca debe provocar NEW VERSION por sí solo. Documentado: campos comparados de un LearningResource = `title` + `contentBlocks` (sin `svg` en bloques formula). */
function stripDerivedSvg(blocks: unknown): unknown {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((block) => {
    if (block && typeof block === 'object' && (block as { type?: string }).type === 'formula') {
      const { svg: _svg, ...rest } = block as Record<string, unknown>;
      return rest;
    }
    return block;
  });
}

function canonicalizeResourceForComparison(title: string, contentBlocks: unknown): string {
  return canonicalize({ title, contentBlocks: stripDerivedSvg(contentBlocks) });
}

/**
 * Campos comparados de una Question (CONTENT-4.2B): `stemContent`,
 * `explanationContent`, y por cada alternativa EN ORDEN el CONTENIDO
 * (texto/latex, sin `svg` derivado) Y `isCorrect` -- ya disponible desde que
 * la comparación usa la lectura administrativa por clave (§CONTENT-4.2B,
 * cierre del LÍMITE ISCORRECT) en vez del lector de estudiante. Un cambio
 * que solo mueve cuál alternativa es correcta, con el mismo texto en todas,
 * ahora SÍ produce una diferencia canónica y dispara NEW VERSION.
 *
 * `id`/`displayOrder` de cada alternativa NO entran: son metadata de
 * almacenamiento (la posición en el array ya captura el orden), no
 * contenido fuente. `difficulty` (fuente) tampoco entra: no tiene columna
 * persistida en `QuestionVersion`/`AnswerOption` (`schema.prisma`) -- es
 * clasificación de manifest/coverage, no contenido editorial versionado; no
 * hay nada publicado contra lo que compararla, y añadir una columna para
 * eso es un cambio de schema fuera del alcance de CONTENT-4.2B.
 */
function canonicalizeQuestionForComparison(
  stemContent: unknown,
  explanationContent: unknown,
  answerOptions: { content: unknown; isCorrect: boolean }[],
): string {
  return canonicalize({
    stemContent: stripDerivedSvg(stemContent),
    explanationContent: stripDerivedSvg(explanationContent),
    options: answerOptions.map((o) => ({ content: stripDerivedSvg([o.content])[0], isCorrect: o.isCorrect })),
  });
}

// ============================================================================
// Resultado por acción -- para el resumen final.
// ============================================================================

type Action = 'CREATE' | 'NO-OP' | 'NEW_VERSION' | 'SKIP_FIXTURE' | 'FAILURE';

interface Summary {
  created: number;
  unchanged: number;
  newVersions: number;
  skipped: number;
  failures: number;
}

function emptySummary(): Summary {
  return { created: 0, unchanged: 0, newVersions: 0, skipped: 0, failures: 0 };
}

function record(summary: Summary, action: Action) {
  if (action === 'CREATE') summary.created++;
  else if (action === 'NO-OP') summary.unchanged++;
  else if (action === 'NEW_VERSION') summary.newVersions++;
  else if (action === 'SKIP_FIXTURE') summary.skipped++;
  else summary.failures++;
}

// ============================================================================
// Transiciones -- DRAFT -> IN_REVIEW -> APPROVED -> PUBLISHED, vía la
// máquina de estados REAL (I3). Nunca "force publish": si una transición
// falla, el importer se detiene con error (CONTENT-4.2, punto 13).
// ============================================================================

/**
 * T3 (submit) con `authorToken` -- el propio autor envía su borrador a
 * revisión. T5 (approve) y T7 (publish) con `publisherToken` -- CMS-018
 * (invariante 24) rechaza con 403 si el mismo actor que creó/editó la
 * versión intenta aprobarla, incluso con ambos roles. Ver HELP.
 */
async function runTransitionsToPublished(
  apiUrl: string,
  authorToken: string,
  publisherToken: string,
  objectSegment: 'question-versions' | 'learning-resource-versions',
  versionId: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return; // el llamador nunca invoca esto en dry-run; defensa en profundidad.
  const tokenFor = { IN_REVIEW: authorToken, APPROVED: publisherToken, PUBLISHED: publisherToken } as const;
  for (const targetStatus of ['IN_REVIEW', 'APPROVED', 'PUBLISHED'] as const) {
    await sleep(WRITE_REQUEST_PACING_MS);
    // T7 (APPROVED -> PUBLISHED) exige clave de idempotencia (§8.2, invariante
    // 11): la propone el cliente, el UNIQUE de Postgres es la autoridad. Un
    // UUID por invocación es correcto -- cada llamada de este importer es una
    // operación de publicación distinta, no un reintento de la misma.
    const body: { targetStatus: typeof targetStatus; operationId?: string } = { targetStatus };
    if (targetStatus === 'PUBLISHED') body.operationId = randomUUID();
    const res = await adminRequest(apiUrl, tokenFor[targetStatus], 'POST', `/administration/editorial/${objectSegment}/${versionId}/transitions`, body);
    if (res.status < 200 || res.status >= 300) {
      throw new Error(`transición a ${targetStatus} falló (status ${res.status}): ${JSON.stringify(res.body)}`);
    }
  }
}

// ============================================================================
// Taxonomía -- Subject / Unidad (raíz) / Recurso (hijo), vía CONTENT-4.2A.
// ============================================================================

async function resolveSubject(apiUrl: string, token: string, subject: ManifestSubject, dryRun: boolean): Promise<{ id: string; created: boolean }> {
  const payload = { subjectKey: subject.subjectKey, name: subject.name, shortName: subject.shortName, displayOrder: subject.displayOrder };
  if (dryRun) return { id: '(dry-run: sin resolver, requiere escritura de comprobación)', created: false };
  await sleep(WRITE_REQUEST_PACING_MS);
  const res = await adminRequest(apiUrl, token, 'POST', '/administration/editorial/subjects', payload);
  if (res.status < 200 || res.status >= 300) throw new Error(`resolución de Subject "${subject.subjectKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { id: string; created: boolean };
  return { id: body.id, created: body.created };
}

async function resolveTopic(
  apiUrl: string,
  token: string,
  input: { code: string; name: string; order: number; subjectId: string; parentId: string | null },
  dryRun: boolean,
): Promise<{ id: string; created: boolean }> {
  if (dryRun) return { id: '(dry-run: sin resolver, requiere escritura de comprobación)', created: false };
  await sleep(WRITE_REQUEST_PACING_MS);
  const res = await adminRequest(apiUrl, token, 'POST', '/administration/editorial/curriculum-topics', input);
  if (res.status < 200 || res.status >= 300) throw new Error(`resolución de CurriculumTopic "${input.code}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { id: string; created: boolean };
  return { id: body.id, created: body.created };
}

// ============================================================================
// LearningResource -- CREATE / NO-OP / NEW VERSION.
// ============================================================================

interface PublishedResourceView {
  id: string; // identidad (learning_resource.id)
  versionId: string;
  title: string;
  contentBlocks: unknown;
}

/**
 * Lectura ADMINISTRATIVA completa por `resourceKey` (CONTENT-4.2B) --
 * `GET /administration/editorial/learning-resources/by-key/:resourceKey`,
 * bajo `x-admin-token` (AUTHOR o PUBLISHER, cualquiera de los dos sirve para
 * leer). Ya NO usa el lector de estudiante: esa ruta nunca se tocó
 * (invariante 19) y sigue existiendo para su propio propósito, pero dejó de
 * ser la fuente de comparación de este importer.
 */
async function readPublishedResource(apiUrl: string, token: string, resourceKey: string): Promise<PublishedResourceView | null> {
  const res = await adminRequest(apiUrl, token, 'GET', `/administration/editorial/learning-resources/by-key/${encodeURIComponent(resourceKey)}`);
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`lectura administrativa de recurso "${resourceKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { resourceId: string; publishedVersion: { versionId: string; title: string; contentBlocks: unknown } | null };
  if (!body.publishedVersion) return null; // identidad existe pero sin versión PUBLISHED todavía -- tratado como "sin publicado" para efectos de comparación.
  return { id: body.resourceId, versionId: body.publishedVersion.versionId, title: body.publishedVersion.title, contentBlocks: body.publishedVersion.contentBlocks };
}

async function upsertLearningResource(
  apiUrl: string,
  token: string,
  publisherToken: string,
  input: { resourceKey: string; resourceType: string; primarySubjectId: string; curriculumTopicId: string; title: string; contentBlocks: SourceContentBlock[] },
  dryRun: boolean,
): Promise<{ action: Action; identityId: string | null; publishedVersionId: string | null }> {
  const existing = await readPublishedResource(apiUrl, token, input.resourceKey);

  if (!existing) {
    if (dryRun) return { action: 'CREATE', identityId: null, publishedVersionId: null };
    await sleep(WRITE_REQUEST_PACING_MS);
    const res = await adminRequest(apiUrl, token, 'POST', '/administration/editorial/learning-resources', {
      resourceKey: input.resourceKey,
      primarySubjectId: input.primarySubjectId,
      resourceType: input.resourceType,
      curriculumTopicId: input.curriculumTopicId,
      title: input.title,
      contentBlocks: input.contentBlocks,
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`creación de LearningResource "${input.resourceKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
    const body = res.body as { identityId: string; versionId: string };
    await runTransitionsToPublished(apiUrl, token, publisherToken, 'learning-resource-versions', body.versionId, dryRun);
    return { action: 'CREATE', identityId: body.identityId, publishedVersionId: body.versionId };
  }

  const sourceCanon = canonicalizeResourceForComparison(input.title, input.contentBlocks);
  const existingCanon = canonicalizeResourceForComparison(existing.title, existing.contentBlocks);
  if (sourceCanon === existingCanon) {
    return { action: 'NO-OP', identityId: existing.id, publishedVersionId: existing.versionId };
  }

  if (dryRun) return { action: 'NEW_VERSION', identityId: existing.id, publishedVersionId: existing.versionId };
  await sleep(WRITE_REQUEST_PACING_MS);
  const res = await adminRequest(apiUrl, token, 'POST', `/administration/editorial/learning-resources/${existing.id}/versions`, {
    curriculumTopicId: input.curriculumTopicId,
    title: input.title,
    contentBlocks: input.contentBlocks,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`nueva versión de LearningResource "${input.resourceKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { identityId: string; versionId: string };
  await runTransitionsToPublished(apiUrl, token, publisherToken, 'learning-resource-versions', body.versionId, dryRun);
  return { action: 'NEW_VERSION', identityId: body.identityId, publishedVersionId: body.versionId };
}

// ============================================================================
// Questions -- CREATE / NO-OP / NEW VERSION, mismo criterio que LearningResource.
// ============================================================================

interface PublishedQuestionView {
  id: string;
  versionId: string;
  questionKey: string;
  stemContent: unknown;
  explanationContent: unknown;
  answerOptions: { content: unknown; isCorrect: boolean }[];
}

/**
 * Lectura ADMINISTRATIVA completa por `questionKey` (CONTENT-4.2B) --
 * `GET /administration/editorial/questions/by-key/:questionKey`, con
 * `isCorrect` incluido. Reemplaza el antiguo `readPublishedQuestions` (que
 * leía TODAS las preguntas de un topic vía el lector de estudiante); ahora
 * se resuelve una a una por su clave estable, que es como el resto del
 * importer ya identifica cada pregunta.
 */
async function readPublishedQuestion(apiUrl: string, token: string, questionKey: string): Promise<PublishedQuestionView | null> {
  const res = await adminRequest(apiUrl, token, 'GET', `/administration/editorial/questions/by-key/${encodeURIComponent(questionKey)}`);
  if (res.status === 404) return null;
  if (res.status !== 200) throw new Error(`lectura administrativa de pregunta "${questionKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as {
    questionId: string;
    questionKey: string;
    publishedVersion: { versionId: string; stemContent: unknown; explanationContent: unknown; answerOptions: { content: unknown; isCorrect: boolean }[] } | null;
  };
  if (!body.publishedVersion) return null;
  return {
    id: body.questionId,
    versionId: body.publishedVersion.versionId,
    questionKey: body.questionKey,
    stemContent: body.publishedVersion.stemContent,
    explanationContent: body.publishedVersion.explanationContent,
    answerOptions: body.publishedVersion.answerOptions,
  };
}

async function upsertQuestion(
  apiUrl: string,
  token: string,
  publisherToken: string,
  existing: PublishedQuestionView | null,
  input: { questionKey: string; primarySubjectId: string; curriculumTopicId: string; stemContent: SourceContentBlock[]; explanationContent: unknown; options: SourceQuestion['options'] },
  dryRun: boolean,
): Promise<Action> {
  const answerOptions = input.options.map((o) => ({ content: o.content, isCorrect: o.correct }));

  if (!existing) {
    if (dryRun) return 'CREATE';
    await sleep(WRITE_REQUEST_PACING_MS);
    const res = await adminRequest(apiUrl, token, 'POST', '/administration/editorial/questions', {
      questionKey: input.questionKey,
      primarySubjectId: input.primarySubjectId,
      curriculumTopicId: input.curriculumTopicId,
      stemContent: input.stemContent,
      explanationContent: input.explanationContent,
      answerOptions,
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`creación de Question "${input.questionKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
    const body = res.body as { versionId: string };
    await runTransitionsToPublished(apiUrl, token, publisherToken, 'question-versions', body.versionId, dryRun);
    return 'CREATE';
  }

  const sourceCanon = canonicalizeQuestionForComparison(input.stemContent, input.explanationContent, answerOptions);
  const existingCanon = canonicalizeQuestionForComparison(existing.stemContent, existing.explanationContent, existing.answerOptions);
  if (sourceCanon === existingCanon) return 'NO-OP';

  if (dryRun) return 'NEW_VERSION';
  await sleep(WRITE_REQUEST_PACING_MS);
  const res = await adminRequest(apiUrl, token, 'POST', `/administration/editorial/questions/${existing.id}/versions`, {
    curriculumTopicId: input.curriculumTopicId,
    stemContent: input.stemContent,
    explanationContent: input.explanationContent,
    answerOptions,
  });
  if (res.status < 200 || res.status >= 300) throw new Error(`nueva versión de Question "${input.questionKey}" falló (status ${res.status}): ${JSON.stringify(res.body)}`);
  const body = res.body as { versionId: string };
  await runTransitionsToPublished(apiUrl, token, publisherToken, 'question-versions', body.versionId, dryRun);
  return 'NEW_VERSION';
}

// ============================================================================
// Orquestación de UN recurso.
// ============================================================================

async function importResource(
  apiUrl: string,
  token: string,
  publisherToken: string,
  entry: LoadedResource,
  dryRun: boolean,
  summary: Summary,
): Promise<void> {
  const { module } = entry;
  const relFile = relative(CONTENT_ROOT, entry.file);
  console.log(`\n=== CONTENT IMPORT: ${module.resourceKey} (${relFile}) [kind: ${module.kind}] ===`);

  if (module.kind === 'fixture') {
    console.log('  kind: fixture -> SKIP FIXTURE (nunca se importa como catálogo productivo)');
    record(summary, 'SKIP_FIXTURE');
    return;
  }
  // `kind: 'validation'` NO se filtra aquí: `selectEntries` (CONTENT-4.2B,
  // puntos 7-8) ya garantizó que este módulo solo llegó hasta aquí si el
  // operador lo seleccionó explícitamente con --resource + --allow-validation.
  // A partir de este punto se procesa exactamente igual que 'catalog'.

  const manifestEntry = findManifestResource(CONTENT_MANIFEST, module.topicCode);
  if (!manifestEntry) {
    console.error(`  FALLO: "${module.topicCode}" no está declarado en el manifest -- abortando este recurso.`);
    record(summary, 'FAILURE');
    return;
  }
  const manifestUnit: ManifestUnit = manifestEntry.unit;

  try {
    // --- Subject ---
    const subjectResolved = await resolveSubject(apiUrl, token, manifestEntry.subject, dryRun);
    console.log(`  Subject (${manifestEntry.subject.subjectKey}): ${dryRun ? 'CREATE-or-NO-OP (dry-run, sin ejecutar)' : subjectResolved.created ? 'CREATE' : 'NO-OP'}`);

    // --- Unidad (raíz) ---
    const unitResolved = await resolveTopic(
      apiUrl,
      token,
      { code: module.unitCode, name: manifestUnit.name, order: manifestUnit.order, subjectId: subjectResolved.id, parentId: null },
      dryRun,
    );
    console.log(`  Unit (${module.unitCode}): ${dryRun ? 'CREATE-or-NO-OP (dry-run, sin ejecutar)' : unitResolved.created ? 'CREATE' : 'NO-OP'}`);

    // --- Recurso (hijo) ---
    const topicResolved = await resolveTopic(
      apiUrl,
      token,
      { code: module.topicCode, name: module.title, order: module.order, subjectId: subjectResolved.id, parentId: unitResolved.id },
      dryRun,
    );
    console.log(`  Topic resource (${module.topicCode}): ${dryRun ? 'CREATE-or-NO-OP (dry-run, sin ejecutar)' : topicResolved.created ? 'CREATE' : 'NO-OP'}`);

    if (dryRun) {
      // En dry-run no se puede resolver taxonomía real (requeriría escribir) --
      // se reporta el plan de LearningResource/Questions con la aproximación
      // más segura: sin poder leer un topicId real, se asume CREATE salvo
      // que el propio recurso ya se sepa existente por otra vía. Documentado
      // como limitación explícita (CONTENT-4.2, punto 4).
      console.log('  LearningResource: CREATE-or-NO-OP-or-NEW_VERSION (dry-run -- no se resuelve contra Postgres; requiere taxonomía real, ver limitación documentada)');
      for (const q of module.questions) {
        console.log(`  ${q.questionKey}: CREATE-or-NO-OP-or-NEW_VERSION (dry-run)`);
      }
      console.log('  transitions: (dry-run, sin ejecutar) | result: DRY-RUN-OK');
      return;
    }

    // --- LearningResource --- (lectura administrativa completa, CONTENT-4.2B)
    const resourceResult = await upsertLearningResource(
      apiUrl,
      token,
      publisherToken,
      {
        resourceKey: module.resourceKey,
        resourceType: module.resourceType,
        primarySubjectId: subjectResolved.id,
        curriculumTopicId: topicResolved.id,
        title: module.title,
        contentBlocks: module.contentBlocks,
      },
      dryRun,
    );
    console.log(`  LearningResource:\n    identity: ${resourceResult.identityId ?? '(NO-OP, sin cambios)'}\n    action: ${resourceResult.action}\n    final: PUBLISHED`);

    // --- Questions --- (lectura administrativa completa por clave, CONTENT-4.2B -- isCorrect incluido)
    console.log('  Questions:');
    for (const q of module.questions) {
      const existingQuestion = await readPublishedQuestion(apiUrl, token, q.questionKey);
      const action = await upsertQuestion(
        apiUrl,
        token,
        publisherToken,
        existingQuestion,
        {
          questionKey: q.questionKey,
          primarySubjectId: subjectResolved.id,
          curriculumTopicId: topicResolved.id,
          stemContent: q.stemContent,
          explanationContent: q.explanationContent,
          options: q.options,
        },
        dryRun,
      );
      console.log(`    ${q.questionKey}: ${action}`);
      record(summary, action);
    }

    console.log('  transitions: PUBLISHED | result: PASS');
  } catch (error) {
    console.error(`  FALLO: ${error instanceof Error ? error.message : String(error)}`);
    record(summary, 'FAILURE');
  }
}

// ============================================================================
// Selección de alcance -- NUNCA todo por defecto (CONTENT-4.2, punto 3).
// ============================================================================

/**
 * Precondición: `assertSelectorPresent` ya garantizó exactamente un selector.
 *
 * CONTENT-4.2B, puntos 7-8 -- `kind: 'validation'` NUNCA se cuela por
 * accidente:
 *   - `--all` EXCLUYE `validation` SIEMPRE, incluso con `--allow-validation`
 *     presente (preferencia congelada: `--all` = únicamente `catalog`).
 *   - `--unit` EXCLUYE `validation` salvo que `--allow-validation` esté
 *     presente (un `validation` puede compartir `unitCode` con recursos
 *     `catalog` en teoría; se filtra, no se aborta el resto del lote).
 *   - `--resource` sobre una clave `validation` FALLA sin escribir nada si
 *     `--allow-validation` no está presente.
 * `fixture` sigue sin mención aquí: se filtra dentro de `importResource`
 * (SKIP_FIXTURE, incondicional, ningún flag lo habilita).
 */
function selectEntries(args: Args, all: LoadedResource[]): LoadedResource[] {
  const resourceKey = args.flags.get('resource');
  const unitCode = args.flags.get('unit');
  const wantsAll = args.flags.get('all') === 'true';
  const allowValidation = args.flags.get('allow-validation') === 'true';

  if (wantsAll) {
    // Preferencia congelada (CONTENT-4.2B, punto 8): --all = ÚNICAMENTE
    // 'catalog'. NUNCA 'validation' (ni con --allow-validation) y NUNCA
    // 'fixture' (que de todas formas nunca escribe nada -- pero no debe
    // aparecer siquiera como "módulo seleccionado").
    return all.filter((e) => e.module.kind === 'catalog');
  }
  if (resourceKey) {
    const match = all.filter((e) => e.module.resourceKey === resourceKey);
    if (match.length === 0) fail(`ningún módulo con resourceKey "${resourceKey}" encontrado bajo apps/backend/content/.`);
    const isValidation = match.some((e) => e.module.kind === 'validation');
    if (isValidation && !allowValidation) {
      fail(
        `"${resourceKey}" es kind: 'validation' (contenido técnico del propio importer, CONTENT-4.2B) -- requiere ` +
          '--allow-validation explícito. Sin ninguna escritura.',
      );
    }
    return match;
  }
  if (unitCode) {
    const match = all.filter((e) => e.module.unitCode === unitCode);
    if (match.length === 0) fail(`ningún módulo con unitCode "${unitCode}" encontrado bajo apps/backend/content/.`);
    if (allowValidation) return match;
    const filtered = match.filter((e) => e.module.kind !== 'validation');
    const excluded = match.length - filtered.length;
    if (excluded > 0) {
      console.log(`  (--unit: ${excluded} módulo(s) kind: 'validation' excluido(s) -- use --allow-validation para incluirlos)`);
    }
    return filtered;
  }
  /* istanbul ignore next -- inalcanzable, selectorsProvided ya lo cubrió */
  return [];
}

/** Comprobación BARATA (sin cargar contenido, sin red): ¿se declaró algún selector? Corre ANTES de exigir token -- un operador sin selector debe ver el mensaje de selector, no un error de credenciales que lo confunda. */
function assertSelectorPresent(args: Args): void {
  const provided = [args.flags.get('resource'), args.flags.get('unit'), args.flags.get('all') === 'true' ? 'all' : undefined].filter(
    Boolean,
  ).length;
  if (provided === 0) {
    console.log(HELP);
    fail('falta un selector explícito -- use --resource, --unit o --all conscientemente.');
  }
  if (provided > 1) fail('use EXACTAMENTE un selector: --resource, --unit o --all.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.flags.get('help') === 'true') {
    console.log(HELP);
    return;
  }
  assertSelectorPresent(args);

  const dryRun = args.flags.get('dry-run') === 'true';
  const apiUrl = resolveApiUrl(args);
  const token = dryRun && !args.flags.get('token') && !process.env.AXIOMA_ADMIN_TOKEN ? '(dry-run, sin token real necesario para el plan)' : resolveToken(args);
  const publisherToken = resolvePublisherToken(args, token);

  const { loaded, issues } = await loadResourceModules(join(CONTENT_ROOT, 'estudio'));
  const { loaded: ensayoLoaded, issues: ensayoIssues } = await loadResourceModules(join(CONTENT_ROOT, 'ensayo'));
  const allLoaded = [...loaded, ...ensayoLoaded];
  const allIssues = [...issues, ...ensayoIssues];

  if (allIssues.length > 0) {
    console.error('Validación pre-BD FALLÓ -- no se ejecuta ninguna escritura:');
    for (const issue of allIssues) console.error(`  ${relative(CONTENT_ROOT, issue.file)}: ${issue.message}`);
    process.exit(1);
  }

  const entries = selectEntries(args, allLoaded);
  console.log(`Módulos seleccionados: ${entries.length} (dry-run: ${dryRun})`);

  const summary = emptySummary();

  for (const entry of entries) {
    await importResource(apiUrl, token, publisherToken, entry, dryRun, summary);
  }

  console.log('\n=== Summary ===');
  console.log(`  created: ${summary.created}`);
  console.log(`  unchanged: ${summary.unchanged}`);
  console.log(`  newVersions: ${summary.newVersions}`);
  console.log(`  skipped: ${summary.skipped}`);
  console.log(`  failures: ${summary.failures}`);

  if (summary.failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
