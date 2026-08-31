// Gate de "Continuar estudiando" (Inicio).
//
// STUDY CONTENT MOBILE REACHABILITY -- `pickContinueTarget()` ahora resuelve
// a un `curriculum_topic` de RECURSO (hijo de una Unidad canónica), no al id
// de una Unidad raíz. El flujo es:
//   1. GET /education/subjects                       (1 llamada)
//   2. GET /education/subjects/:id/topics            (1 llamada -- unidades canónicas)
//   3. GET /education/topics/:unitId/children        (N llamadas -- N = nº de unidades, 3-4 reales)
//   4. GET /progress/topics?topicIds=...             (1 llamada -- batch sobre TODOS los recursos)
//
// Verificación DETERMINISTA -- Node puro, sin backend real, `global.fetch`
// reemplazado por un stub que registra cada llamada. Prueba:
//   1. Que el progreso se pide en UNA sola llamada batch (nunca N+1), sin
//      importar cuántos recursos haya.
//   2. Que la selección (exercise > resource > all-completed > no-content)
//      opera sobre RECURSOS hijos y no cambió de semántica.
//   3. Que el destino elegido es SIEMPRE un id de recurso hijo, nunca el de
//      una Unidad.
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

function mockTopic(id: string, order: number, subjectId: string, parentId: string | null): CurriculumTopicResponse {
  return { id, code: `mock-${id.slice(0, 8)}`, name: `Tema ${order}`, order, parentId, subjectId };
}

function mockProgress(topicId: string, kind: 'not-started' | 'resource' | 'exercise' | 'completed'): TopicProgressResponse {
  if (kind === 'not-started') {
    return { curriculumTopicId: topicId, status: 'NOT_STARTED', startedAt: null, lastActivityAt: null, completedAt: null, responses: [] };
  }
  if (kind === 'resource') {
    return { curriculumTopicId: topicId, status: 'IN_PROGRESS', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', completedAt: null, responses: [] };
  }
  const response = { questionVersionId: randomUUID(), answerOptionId: randomUUID(), isCorrect: true, respondedAt: '2026-01-01T00:00:00Z' };
  if (kind === 'exercise') {
    return { curriculumTopicId: topicId, status: 'IN_PROGRESS', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', completedAt: null, responses: [response] };
  }
  return { curriculumTopicId: topicId, status: 'COMPLETED', startedAt: '2026-01-01T00:00:00Z', lastActivityAt: '2026-01-01T00:00:00Z', completedAt: '2026-01-01T00:00:00Z', responses: [response] };
}

function installMockFetch(
  subject: SubjectResponse,
  units: CurriculumTopicResponse[],
  childrenByUnit: Map<string, CurriculumTopicResponse[]>,
  progressByTopic: Map<string, TopicProgressResponse>,
) {
  const calls: RecordedCall[] = [];

  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    const jsonResponse = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

    if (url.endsWith('/education/subjects')) return jsonResponse([subject]);
    if (url.includes(`/education/subjects/${subject.id}/topics`)) return jsonResponse(units);

    const childrenMatch = /\/education\/topics\/([^/]+)\/children/.exec(url);
    if (childrenMatch) return jsonResponse(childrenByUnit.get(childrenMatch[1]) ?? []);

    if (url.startsWith('http://mock/progress/topics?topicIds=')) {
      const requestedIds = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const result = requestedIds
        .map((id) => progressByTopic.get(id))
        .filter((entry): entry is TopicProgressResponse => Boolean(entry));
      return jsonResponse(result);
    }
    // `/progress/topics/<id>` singular NUNCA debe llamarse -- lanzar convierte
    // una regresión N+1 en un fallo explícito.
    throw new Error(`Llamada inesperada en pickContinueTarget(): ${method} ${url}`);
  }) as typeof fetch;

  return calls;
}

/** Construye N unidades, cada una con `resourcesPerUnit` recursos hijos. */
function buildCatalog(subjectId: string, unitCount: number, resourcesPerUnit: number) {
  const units: CurriculumTopicResponse[] = [];
  const childrenByUnit = new Map<string, CurriculumTopicResponse[]>();
  const allResources: CurriculumTopicResponse[] = [];
  for (let u = 0; u < unitCount; u++) {
    const unit = mockTopic(randomUUID(), u + 1, subjectId, null);
    units.push(unit);
    const children = Array.from({ length: resourcesPerUnit }, (_, r) =>
      mockTopic(randomUUID(), r + 1, subjectId, unit.id),
    );
    childrenByUnit.set(unit.id, children);
    allResources.push(...children);
  }
  return { units, childrenByUnit, allResources };
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { pickContinueTarget } = await import('../lib/progress/pick-continue-topic');

  const subjectId = randomUUID();
  const subject: SubjectResponse = { id: subjectId, subjectKey: 'matematica', name: 'Matemática M1', shortName: 'M1', displayOrder: 1 };

  console.log('--- 1. Arquitectura: 4 unidades x 25 recursos (100) -> UNA sola llamada de progreso, no 100 ---');
  {
    const { units, childrenByUnit, allResources } = buildCatalog(subjectId, 4, 25);
    const progressByTopic = new Map(allResources.map((t) => [t.id, mockProgress(t.id, 'not-started')]));
    const calls = installMockFetch(subject, units, childrenByUnit, progressByTopic);

    const result = await pickContinueTarget();

    check('pickContinueTarget() resuelve ok', result.ok);
    const progressCalls = calls.filter((c) => c.url.includes('/progress/topics'));
    check('EXACTAMENTE 1 llamada de progreso (nunca 100 -- sin fan-out N+1)', progressCalls.length === 1);
    check('la llamada de progreso es la ruta COLECCIÓN (?topicIds=)', progressCalls[0]?.url.includes('?topicIds='));
    check('EXACTAMENTE 4 llamadas /children (una por unidad canónica)', calls.filter((c) => c.url.includes('/children')).length === 4);
    check('destino: primer recurso sin comenzar, entry "resource"', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
    check(
      'el destino es un RECURSO hijo (parentId !== null), nunca una Unidad',
      result.ok && result.target.kind === 'topic' && result.target.topic.parentId !== null,
    );
  }

  console.log('--- 2. Selección: EXERCISE tiene prioridad sobre RESOURCE y COMPLETED ---');
  {
    const { units, childrenByUnit, allResources } = buildCatalog(subjectId, 2, 2);
    const [rCompleted, rExercise, rResource] = allResources;
    const progressByTopic = new Map([
      [rCompleted.id, mockProgress(rCompleted.id, 'completed')],
      [rExercise.id, mockProgress(rExercise.id, 'exercise')],
      [rResource.id, mockProgress(rResource.id, 'resource')],
      [allResources[3].id, mockProgress(allResources[3].id, 'not-started')],
    ]);
    installMockFetch(subject, units, childrenByUnit, progressByTopic);

    const result = await pickContinueTarget();
    check('elige el recurso EXERCISE aunque no sea el primero', result.ok && result.target.kind === 'topic' && result.target.topic.id === rExercise.id);
    check('entry === "exercise"', result.ok && result.target.kind === 'topic' && result.target.entry === 'exercise');
  }

  console.log('--- 3. Sin EXERCISE -> primer RESOURCE ---');
  {
    const { units, childrenByUnit, allResources } = buildCatalog(subjectId, 1, 2);
    const progressByTopic = new Map([
      [allResources[0].id, mockProgress(allResources[0].id, 'completed')],
      [allResources[1].id, mockProgress(allResources[1].id, 'resource')],
    ]);
    installMockFetch(subject, units, childrenByUnit, progressByTopic);

    const result = await pickContinueTarget();
    check('elige el recurso RESOURCE', result.ok && result.target.kind === 'topic' && result.target.topic.id === allResources[1].id);
    check('entry === "resource"', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
  }

  console.log('--- 4. Todo COMPLETED -> "all-completed" ---');
  {
    const { units, childrenByUnit, allResources } = buildCatalog(subjectId, 2, 2);
    const progressByTopic = new Map(allResources.map((t) => [t.id, mockProgress(t.id, 'completed')]));
    installMockFetch(subject, units, childrenByUnit, progressByTopic);

    const result = await pickContinueTarget();
    check('kind === "all-completed"', result.ok && result.target.kind === 'all-completed');
  }

  console.log('--- 5. Sin unidades canónicas -> "no-content", sin llamar progreso ---');
  {
    const calls = installMockFetch(subject, [], new Map(), new Map());
    const result = await pickContinueTarget();
    check('kind === "no-content"', result.ok && result.target.kind === 'no-content');
    check('nunca se llamó a /progress/topics', !calls.some((c) => c.url.includes('/progress/topics')));
  }

  console.log('--- 6. Unidades sin recursos hijos -> "no-content" ---');
  {
    const unit = mockTopic(randomUUID(), 1, subjectId, null);
    const calls = installMockFetch(subject, [unit], new Map([[unit.id, []]]), new Map());
    const result = await pickContinueTarget();
    check('kind === "no-content" cuando ninguna unidad tiene recursos', result.ok && result.target.kind === 'no-content');
    check('nunca se llamó a /progress/topics (0 recursos, 0 necesidad)', !calls.some((c) => c.url.includes('/progress/topics')));
  }

  console.log('--- 7. Fallo del batch de progreso se propaga (ok:false) ---');
  {
    const { units, childrenByUnit } = buildCatalog(subjectId, 1, 1);
    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/education/subjects')) return new Response(JSON.stringify([subject]), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes(`/education/subjects/${subjectId}/topics`)) return new Response(JSON.stringify(units), { status: 200, headers: { 'content-type': 'application/json' } });
      const childrenMatch = /\/education\/topics\/([^/]+)\/children/.exec(url);
      if (childrenMatch) return new Response(JSON.stringify(childrenByUnit.get(childrenMatch[1]) ?? []), { status: 200, headers: { 'content-type': 'application/json' } });
      if (url.includes('/progress/topics?topicIds=')) {
        return new Response(JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno.' } }), { status: 500, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`Llamada inesperada: ${url}`);
    }) as typeof fetch;

    const result = await pickContinueTarget();
    check('ok === false ante un fallo del batch de progreso', result.ok === false);
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
