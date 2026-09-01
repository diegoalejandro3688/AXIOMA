// Gate de "Continuar estudiando" (Inicio).
//
// INICIO Increment 2 -- `pickContinueTarget()` recorre TODAS las materias
// canónicas (no sólo la primera), en el orden que devuelve
// `GET /education/subjects`. Flujo por materia inspeccionada:
//   1. GET /education/subjects                       (1 llamada, una vez)
//   2. GET /education/subjects/:id/topics            (1 llamada por materia -- unidades canónicas)
//   3. GET /education/topics/:unitId/children        (N llamadas -- N = nº de unidades de la materia)
//   4. GET /progress/topics?topicIds=...             (1 llamada BATCH por materia con recursos)
//
// STUDY CONTENT MOBILE REACHABILITY -- el destino resuelve SIEMPRE a un
// `curriculum_topic` de RECURSO (hijo, `parentId !== null`), nunca a una Unidad.
//
// Verificación DETERMINISTA -- Node puro, sin backend real, `global.fetch`
// reemplazado por un stub que registra cada llamada. Prueba:
//   1. selección dentro de materia: exercise > resource (semántica ADR-0014)
//   2. prioridad de ORDEN DE MATERIA entre materias (materia N+1 sólo si la N
//      está completada / sin destino accionable)
//   3. materias vacías (sin unidades / sin recursos) se saltan
//   4. all-completed GLOBAL cuando todas las materias con contenido están completas
//   5. no-content cuando no hay contenido en ninguna materia
//   6. el progreso se pide en 1 sola llamada BATCH por materia (nunca `/progress/topics/:id` singular)
//   7. un fallo real de EDUCATION/PROGRESS -> ok:false (NUNCA "completada" falsa)
import { randomUUID } from 'node:crypto';
import Module from 'node:module';
import { join } from 'node:path';
import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';

/**
 * `lib/api/client.ts` -> `lib/auth/session-storage.ts` -> `expo-secure-store`
 * -> `react-native` -- no cargable en Node puro. Se redirige SOLO
 * `expo-secure-store` a un stub local; ningún archivo de producción se
 * modifica ni se mockea.
 */
type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const moduleWithInternals = Module as unknown as { _resolveFilename: ResolveFilename };
const originalResolveFilename = moduleWithInternals._resolveFilename;
moduleWithInternals._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  if (request === 'expo-secure-store') {
    return join(__dirname, '__stubs__', 'expo-secure-store.ts');
  }
  return originalResolveFilename.call(this, request, ...rest);
} as ResolveFilename;

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

interface RecordedCall {
  method: string;
  url: string;
}

type ProgressKind = 'not-started' | 'resource' | 'exercise' | 'completed';

function mockSubject(order: number): SubjectResponse {
  return { id: randomUUID(), subjectKey: `subject-${order}`, name: `Materia ${order}`, shortName: `M${order}`, displayOrder: order };
}

function mockTopic(id: string, order: number, subjectId: string, parentId: string | null): CurriculumTopicResponse {
  return { id, code: `mock-${id.slice(0, 8)}`, name: `Tema ${order}`, order, parentId, subjectId };
}

function mockProgress(topicId: string, kind: ProgressKind): TopicProgressResponse {
  const base = { curriculumTopicId: topicId, startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z' };
  const response = { questionVersionId: randomUUID(), answerOptionId: randomUUID(), isCorrect: true, respondedAt: '2026-01-01T00:00:00Z' };
  if (kind === 'not-started') {
    return { curriculumTopicId: topicId, status: 'NOT_STARTED', startedAt: null, lastActivityAt: null, completedAt: null, responses: [] };
  }
  if (kind === 'resource') {
    return { ...base, status: 'IN_PROGRESS', completedAt: null, responses: [] };
  }
  if (kind === 'exercise') {
    return { ...base, status: 'IN_PROGRESS', completedAt: null, responses: [response] };
  }
  return { ...base, status: 'COMPLETED', completedAt: '2026-01-01T00:00:00Z', responses: [response] };
}

/** Una materia con `unitCount` unidades, `resourcesPerUnit` recursos por unidad, y un progreso por recurso (por índice global). */
interface SubjectCatalog {
  subject: SubjectResponse;
  units: CurriculumTopicResponse[];
  childrenByUnit: Map<string, CurriculumTopicResponse[]>;
  resources: CurriculumTopicResponse[];
  progressByTopic: Map<string, TopicProgressResponse>;
  /** Si se define, la llamada a este endpoint para esta materia devuelve 500. */
  failAt?: 'units' | 'children' | 'progress';
}

function buildSubject(order: number, resourceKinds: ProgressKind[][], failAt?: SubjectCatalog['failAt']): SubjectCatalog {
  const subject = mockSubject(order);
  const units: CurriculumTopicResponse[] = [];
  const childrenByUnit = new Map<string, CurriculumTopicResponse[]>();
  const resources: CurriculumTopicResponse[] = [];
  const progressByTopic = new Map<string, TopicProgressResponse>();

  resourceKinds.forEach((unitResources, u) => {
    const unit = mockTopic(randomUUID(), u + 1, subject.id, null);
    units.push(unit);
    const children = unitResources.map((kind, r) => {
      const child = mockTopic(randomUUID(), r + 1, subject.id, unit.id);
      resources.push(child);
      if (kind !== 'not-started') progressByTopic.set(child.id, mockProgress(child.id, kind));
      // `not-started` -> ausente del batch (mismo criterio real).
      return child;
    });
    childrenByUnit.set(unit.id, children);
  });

  return { subject, units, childrenByUnit, resources, progressByTopic, failAt };
}

/** Materia sin ninguna unidad. */
function emptySubject(order: number): SubjectCatalog {
  return { subject: mockSubject(order), units: [], childrenByUnit: new Map(), resources: [], progressByTopic: new Map() };
}

function installMockFetch(catalogs: SubjectCatalog[]) {
  const calls: RecordedCall[] = [];
  const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  const errorResponse = () => jsonResponse({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno.' } }, 500);

  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    if (url.endsWith('/education/subjects')) return jsonResponse(catalogs.map((c) => c.subject));

    const subjectTopicsMatch = /\/education\/subjects\/([^/]+)\/topics/.exec(url);
    if (subjectTopicsMatch) {
      const cat = catalogs.find((c) => c.subject.id === subjectTopicsMatch[1]);
      if (cat?.failAt === 'units') return errorResponse();
      return jsonResponse(cat?.units ?? []);
    }

    const childrenMatch = /\/education\/topics\/([^/]+)\/children/.exec(url);
    if (childrenMatch) {
      const cat = catalogs.find((c) => c.childrenByUnit.has(childrenMatch[1]!));
      if (cat?.failAt === 'children') return errorResponse();
      return jsonResponse(cat?.childrenByUnit.get(childrenMatch[1]!) ?? []);
    }

    if (url.includes('/progress/topics?topicIds=')) {
      const requestedIds = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const owner = catalogs.find((c) => requestedIds.some((id) => c.resources.some((r) => r.id === id)));
      if (owner?.failAt === 'progress') return errorResponse();
      const merged = new Map<string, TopicProgressResponse>();
      for (const c of catalogs) for (const [k, v] of c.progressByTopic) merged.set(k, v);
      const result = requestedIds.map((id) => merged.get(id)).filter((e): e is TopicProgressResponse => Boolean(e));
      return jsonResponse(result);
    }

    // `/progress/topics/<id>` singular NUNCA debe llamarse -- lanzar convierte
    // una regresión N+1 en un fallo explícito.
    throw new Error(`Llamada inesperada en pickContinueTarget(): ${method} ${url}`);
  }) as typeof fetch;

  return calls;
}

function progressCalls(calls: RecordedCall[]) {
  return calls.filter((c) => c.url.includes('/progress/topics'));
}
function noSingularProgress(calls: RecordedCall[]) {
  return !calls.some((c) => /\/progress\/topics\/[0-9a-f-]{36}/i.test(c.url));
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { pickContinueTarget } = await import('../lib/progress/pick-continue-topic');

  console.log('--- 1. Materia 1 con recurso EN CURSO -> lo selecciona (entry exercise), sin mirar materia 2 ---');
  {
    const s1 = buildSubject(1, [['completed', 'exercise', 'resource']]);
    const s2 = buildSubject(2, [['resource']]);
    const calls = installMockFetch([s1, s2]);
    const result = await pickContinueTarget();
    check('resuelve ok', result.ok);
    check('destino en la materia 1', result.ok && result.target.kind === 'topic' && result.target.subject.id === s1.subject.id);
    check('entry === "exercise"', result.ok && result.target.kind === 'topic' && result.target.entry === 'exercise');
    check('el destino es un RECURSO hijo (parentId !== null)', result.ok && result.target.kind === 'topic' && result.target.topic.parentId !== null);
    check('EXACTAMENTE 1 llamada batch de progreso (sólo la materia 1)', progressCalls(calls).length === 1);
    check('nunca `/progress/topics/:id` singular', noSingularProgress(calls));
    check('la materia 2 NO se consultó (subject-order corta antes)', !calls.some((c) => c.url.includes(`/education/subjects/${s2.subject.id}/topics`)));
  }

  console.log('--- 2. Materia 1 con recurso SIN COMENZAR -> lo selecciona (entry resource) ---');
  {
    const s1 = buildSubject(1, [['completed', 'not-started']]);
    const calls = installMockFetch([s1, buildSubject(2, [['exercise']])]);
    const result = await pickContinueTarget();
    check('entry === "resource"', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
    check('destino en la materia 1', result.ok && result.target.kind === 'topic' && result.target.subject.id === s1.subject.id);
    check('1 sola llamada batch de progreso', progressCalls(calls).length === 1);
  }

  console.log('--- 3. Materia 1 COMPLETADA, materia 2 accionable -> selecciona materia 2 (prioridad de orden entre materias) ---');
  {
    const s1 = buildSubject(1, [['completed', 'completed'], ['completed']]);
    const s2 = buildSubject(2, [['exercise', 'resource']]);
    const s3 = buildSubject(3, [['resource']]);
    const calls = installMockFetch([s1, s2, s3]);
    const result = await pickContinueTarget();
    check('destino en la materia 2, NO la 3', result.ok && result.target.kind === 'topic' && result.target.subject.id === s2.subject.id);
    check('entry === "exercise" (semántica dentro de materia intacta)', result.ok && result.target.kind === 'topic' && result.target.entry === 'exercise');
    check('EXACTAMENTE 2 llamadas batch de progreso (materia 1 completada + materia 2 acierta)', progressCalls(calls).length === 2);
    check('la materia 3 no se consultó', !calls.some((c) => c.url.includes(`/education/subjects/${s3.subject.id}/topics`)));
    check('nunca `/progress/topics/:id` singular', noSingularProgress(calls));
  }

  console.log('--- 3b. §F: materia 1 SIN COMENZAR + materia 2 EN CURSO -> gana la materia 1 (orden entre materias manda) ---');
  {
    const s1 = buildSubject(1, [['not-started']]);
    const s2 = buildSubject(2, [['exercise']]);
    installMockFetch([s1, s2]);
    const result = await pickContinueTarget();
    check('destino en la materia 1 (sin comenzar), NUNCA "cualquier en-curso global gana"', result.ok && result.target.kind === 'topic' && result.target.subject.id === s1.subject.id);
    check('entry === "resource"', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
  }

  console.log('--- 4. Materia 1 VACÍA (sin unidades), materia 2 accionable -> salta la vacía y selecciona la 2 ---');
  {
    const s1 = emptySubject(1);
    const s2 = buildSubject(2, [['resource']]);
    const calls = installMockFetch([s1, s2]);
    const result = await pickContinueTarget();
    check('destino en la materia 2', result.ok && result.target.kind === 'topic' && result.target.subject.id === s2.subject.id);
    check('la materia 1 vacía NO generó llamada de progreso', progressCalls(calls).length === 1);
  }

  console.log('--- 4b. Materia 1 con unidades pero SIN recursos hijos -> se salta, materia 2 gana ---');
  {
    const s1 = buildSubject(1, [[]]); // 1 unidad, 0 recursos
    const s2 = buildSubject(2, [['resource']]);
    const calls = installMockFetch([s1, s2]);
    const result = await pickContinueTarget();
    check('destino en la materia 2', result.ok && result.target.kind === 'topic' && result.target.subject.id === s2.subject.id);
    check('la materia 1 (unidades sin recursos) NO generó llamada de progreso', progressCalls(calls).length === 1);
  }

  console.log('--- 5. TODAS las materias con contenido COMPLETADAS -> all-completed GLOBAL ---');
  {
    const calls = installMockFetch([
      buildSubject(1, [['completed', 'completed']]),
      buildSubject(2, [['completed']]),
      buildSubject(3, [['completed', 'completed', 'completed']]),
    ]);
    const result = await pickContinueTarget();
    check('kind === "all-completed"', result.ok && result.target.kind === 'all-completed');
    check('all-completed NO nombra una sola materia (kind sin `subject`)', result.ok && result.target.kind === 'all-completed' && !('subject' in result.target));
    check('se inspeccionaron las 3 materias (3 llamadas batch de progreso)', progressCalls(calls).length === 3);
  }

  console.log('--- 6. NINGUNA materia tiene contenido -> no-content, sin llamada de progreso ---');
  {
    const calls = installMockFetch([emptySubject(1), buildSubject(2, [[]]), emptySubject(3)]);
    const result = await pickContinueTarget();
    check('kind === "no-content"', result.ok && result.target.kind === 'no-content');
    check('nunca se llamó a /progress/topics', progressCalls(calls).length === 0);
  }

  console.log('--- 6b. Cero materias -> no-content ---');
  {
    installMockFetch([]);
    const result = await pickContinueTarget();
    check('kind === "no-content"', result.ok && result.target.kind === 'no-content');
  }

  console.log('--- 7. Fallo de `GET /education/subjects` -> ok:false ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response(JSON.stringify({ error: { code: 'X', message: 'Error interno.' } }), { status: 500, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    const result = await pickContinueTarget();
    check('ok === false ante fallo de listSubjects', result.ok === false);
  }

  console.log('--- 8. Fallo del BATCH de progreso de una materia -> ok:false (NUNCA "completada"/"no-content" falsa) ---');
  {
    const s1 = buildSubject(1, [['resource']], 'progress');
    installMockFetch([s1, buildSubject(2, [['resource']])]);
    const result = await pickContinueTarget();
    check('ok === false cuando el progreso de una materia falla', result.ok === false);
  }

  console.log('--- 8b. Fallo de `.../topics` (unidades) de una materia -> ok:false ---');
  {
    const s1 = buildSubject(1, [['resource']], 'units');
    installMockFetch([s1, buildSubject(2, [['resource']])]);
    const result = await pickContinueTarget();
    check('ok === false cuando las unidades de una materia fallan (no se salta a la siguiente)', result.ok === false);
  }

  console.log('--- 8c. Fallo de `.../children` de una materia -> ok:false ---');
  {
    const s1 = buildSubject(1, [['resource']], 'children');
    installMockFetch([s1, buildSubject(2, [['resource']])]);
    const result = await pickContinueTarget();
    check('ok === false cuando los hijos de una unidad fallan', result.ok === false);
  }

  console.log('--- 9. Batching: 4 unidades x 25 recursos en la materia 1 -> 1 sola llamada de progreso, nunca 100 ---');
  {
    const many: ProgressKind[][] = Array.from({ length: 4 }, () => Array.from({ length: 25 }, () => 'not-started' as ProgressKind));
    const calls = installMockFetch([buildSubject(1, many)]);
    const result = await pickContinueTarget();
    check('resuelve ok (primer recurso sin comenzar)', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
    check('EXACTAMENTE 1 llamada de progreso (nunca 100 -- sin fan-out N+1)', progressCalls(calls).length === 1);
    check('esa llamada es la ruta COLECCIÓN (?topicIds=)', progressCalls(calls)[0]?.url.includes('?topicIds='));
    check('EXACTAMENTE 4 llamadas /children (una por unidad)', calls.filter((c) => c.url.includes('/children')).length === 4);
    check('nunca `/progress/topics/:id` singular', noSingularProgress(calls));
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de "Continuar estudiando" pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
