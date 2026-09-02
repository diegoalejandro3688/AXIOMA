// Gate de "Continuar estudiando" (Inicio).
//
// HOTFIX 2.1 -- la tarjeta principal sigue la ACTIVIDAD DE ESTUDIO MÁS
// RECIENTE, no el orden de materia. `pickContinueTarget()`:
//   - recorre TODAS las materias canónicas (orden `GET /education/subjects`)
//   - reúne cada recurso EN CURSO (`status != COMPLETED` y `responses > 0`)
//   - elige el de `max(response.respondedAt)` más reciente (empate -> orden canónico)
//   - si NO hay ninguno en curso -> primer recurso SIN COMENZAR en orden canónico
//   - todo completado -> `all-completed` GLOBAL ; sin contenido -> `no-content`
//   - fallo real de fetch -> `ok: false` (NUNCA "completada" falsa)
//
// Flujo por materia inspeccionada:
//   1. GET /education/subjects                       (1 llamada, una vez)
//   2. GET /education/subjects/:id/topics            (1 por materia -- unidades canónicas)
//   3. GET /education/topics/:unitId/children        (N -- N = nº de unidades)
//   4. GET /progress/topics?topicIds=...             (1 BATCH por materia con recursos)
//
// Node puro, sin backend real, `global.fetch` stub que registra cada llamada.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';
import type { PickContinueResult } from '../lib/progress/pick-continue-topic';

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
/** Un recurso: sólo su estado, o su estado + los `respondedAt` de sus respuestas (en orden ARBITRARIO). */
type ResourceSpec = ProgressKind | { kind: ProgressKind; at: string[] };

function specKind(s: ResourceSpec): ProgressKind {
  return typeof s === 'string' ? s : s.kind;
}
function specTimes(s: ResourceSpec): string[] | undefined {
  return typeof s === 'string' ? undefined : s.at;
}

function mockSubject(order: number): SubjectResponse {
  return { id: randomUUID(), subjectKey: `subject-${order}`, name: `Materia ${order}`, shortName: `M${order}`, displayOrder: order };
}

function mockTopic(id: string, order: number, subjectId: string, parentId: string | null): CurriculumTopicResponse {
  return { id, code: `mock-${id.slice(0, 8)}`, name: `Tema ${order}`, order, parentId, subjectId };
}

function mockProgress(topicId: string, kind: Exclude<ProgressKind, 'not-started'>, at?: string[]): TopicProgressResponse {
  const times = at ?? ['2026-01-01T00:00:00.000Z'];
  const responses = times.map((respondedAt) => ({
    questionVersionId: randomUUID(),
    answerOptionId: randomUUID(),
    isCorrect: true,
    respondedAt,
  }));
  const base = { curriculumTopicId: topicId, startedAt: times[0]!, lastActivityAt: times[times.length - 1]! };
  if (kind === 'resource') return { ...base, status: 'IN_PROGRESS', completedAt: null, responses: [] };
  if (kind === 'exercise') return { ...base, status: 'IN_PROGRESS', completedAt: null, responses };
  return { ...base, status: 'COMPLETED', completedAt: times[times.length - 1]!, responses };
}

interface SubjectCatalog {
  subject: SubjectResponse;
  units: CurriculumTopicResponse[];
  childrenByUnit: Map<string, CurriculumTopicResponse[]>;
  resources: CurriculumTopicResponse[];
  progressByTopic: Map<string, TopicProgressResponse>;
  /** Recurso "de interés" por índice global de creación (para aserciones). */
  resourceByTag: Map<string, CurriculumTopicResponse>;
  failAt?: 'units' | 'children' | 'progress';
}

/**
 * `spec`: por unidad, una lista de recursos. Un recurso puede etiquetarse
 * como `[tag, ResourceSpec]` para poder aseverar cuál se seleccionó.
 */
function buildSubject(
  order: number,
  spec: Array<Array<ResourceSpec | [string, ResourceSpec]>>,
  failAt?: SubjectCatalog['failAt'],
): SubjectCatalog {
  const subject = mockSubject(order);
  const units: CurriculumTopicResponse[] = [];
  const childrenByUnit = new Map<string, CurriculumTopicResponse[]>();
  const resources: CurriculumTopicResponse[] = [];
  const progressByTopic = new Map<string, TopicProgressResponse>();
  const resourceByTag = new Map<string, CurriculumTopicResponse>();

  spec.forEach((unitResources, u) => {
    const unit = mockTopic(randomUUID(), u + 1, subject.id, null);
    units.push(unit);
    const children = unitResources.map((entry, r) => {
      const [tag, rspec] = Array.isArray(entry) ? entry : [undefined, entry];
      const child = mockTopic(randomUUID(), r + 1, subject.id, unit.id);
      resources.push(child);
      if (tag) resourceByTag.set(tag, child);
      const kind = specKind(rspec);
      if (kind !== 'not-started') progressByTopic.set(child.id, mockProgress(child.id, kind, specTimes(rspec)));
      // `not-started` -> ausente del batch (mismo criterio real).
      return child;
    });
    childrenByUnit.set(unit.id, children);
  });

  return { subject, units, childrenByUnit, resources, progressByTopic, resourceByTag, failAt };
}

function emptySubject(order: number): SubjectCatalog {
  return {
    subject: mockSubject(order),
    units: [],
    childrenByUnit: new Map(),
    resources: [],
    progressByTopic: new Map(),
    resourceByTag: new Map(),
  };
}

function installMockFetch(catalogs: SubjectCatalog[]) {
  const calls: RecordedCall[] = [];
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
  const err = () => json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno.' } }, 500);

  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    if (url.endsWith('/education/subjects')) return json(catalogs.map((c) => c.subject));

    const subjectTopics = /\/education\/subjects\/([^/]+)\/topics/.exec(url);
    if (subjectTopics) {
      const cat = catalogs.find((c) => c.subject.id === subjectTopics[1]);
      if (cat?.failAt === 'units') return err();
      return json(cat?.units ?? []);
    }

    const children = /\/education\/topics\/([^/]+)\/children/.exec(url);
    if (children) {
      const cat = catalogs.find((c) => c.childrenByUnit.has(children[1]!));
      if (cat?.failAt === 'children') return err();
      return json(cat?.childrenByUnit.get(children[1]!) ?? []);
    }

    if (url.includes('/progress/topics?topicIds=')) {
      const ids = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const owner = catalogs.find((c) => ids.some((id) => c.resources.some((r) => r.id === id)));
      if (owner?.failAt === 'progress') return err();
      const merged = new Map<string, TopicProgressResponse>();
      for (const c of catalogs) for (const [k, v] of c.progressByTopic) merged.set(k, v);
      return json(ids.map((id) => merged.get(id)).filter((e): e is TopicProgressResponse => Boolean(e)));
    }

    // `/progress/topics/<id>` singular NUNCA debe llamarse.
    throw new Error(`Llamada inesperada en pickContinueTarget(): ${method} ${url}`);
  }) as typeof fetch;

  return calls;
}

const progressCalls = (calls: RecordedCall[]) => calls.filter((c) => c.url.includes('/progress/topics'));
const noSingularProgress = (calls: RecordedCall[]) => !calls.some((c) => /\/progress\/topics\/[0-9a-f-]{36}/i.test(c.url));

/** id del recurso seleccionado, o null. */
function selectedId(result: PickContinueResult): string | null {
  return result.ok && result.target.kind === 'topic' ? result.target.topic.id : null;
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { pickContinueTarget } = await import('../lib/progress/pick-continue-topic');

  console.log('--- 1. Un solo recurso EN CURSO -> se selecciona (entry exercise, recurso hijo) ---');
  {
    const s1 = buildSubject(1, [[['x', 'exercise'], 'not-started']]);
    installMockFetch([s1, buildSubject(2, [['not-started']])]);
    const r = await pickContinueTarget();
    check('resuelve ok', r.ok);
    check('selecciona el recurso en curso', selectedId(r) === s1.resourceByTag.get('x')!.id);
    check('entry === "exercise"', r.ok && r.target.kind === 'topic' && r.target.entry === 'exercise');
    check('destino RECURSO hijo (parentId !== null)', r.ok && r.target.kind === 'topic' && r.target.topic.parentId !== null);
  }

  console.log('--- 2. §F: materia 1 SIN COMENZAR + materia 2 EN CURSO -> gana el EN CURSO de la materia 2 (recencia > orden de materia) ---');
  {
    const s1 = buildSubject(1, [[['u1', 'not-started']]]);
    const s2 = buildSubject(2, [[['x2', { kind: 'exercise', at: ['2026-05-01T10:00:00.000Z'] }]]]);
    installMockFetch([s1, s2]);
    const r = await pickContinueTarget();
    check('selecciona el recurso EN CURSO de la materia 2 (NO el sin-comenzar de la materia 1)', selectedId(r) === s2.resourceByTag.get('x2')!.id);
    check('entry === "exercise"', r.ok && r.target.kind === 'topic' && r.target.entry === 'exercise');
  }

  console.log('--- 3. Dos EN CURSO en materias distintas -> gana el timestamp más nuevo ---');
  {
    const s1 = buildSubject(1, [[['m1', { kind: 'exercise', at: ['2026-03-01T00:00:00.000Z'] }]]]); // lunes
    const s2 = buildSubject(2, [['not-started']]);
    const s3 = buildSubject(3, [[['h', { kind: 'exercise', at: ['2026-03-02T00:00:00.000Z'] }]]]); // martes (más nuevo)
    installMockFetch([s1, s2, s3]);
    const r = await pickContinueTarget();
    check('gana el EN CURSO más reciente (materia 3), NO el orden de materia', selectedId(r) === s3.resourceByTag.get('h')!.id);
  }

  console.log('--- 4. Dos EN CURSO en la MISMA materia -> gana el timestamp más nuevo ---');
  {
    const s1 = buildSubject(1, [
      [['viejo', { kind: 'exercise', at: ['2026-01-10T00:00:00.000Z'] }]],
      [['nuevo', { kind: 'exercise', at: ['2026-06-10T00:00:00.000Z'] }]],
    ]);
    installMockFetch([s1]);
    const r = await pickContinueTarget();
    check('gana el recurso EN CURSO más reciente dentro de la materia', selectedId(r) === s1.resourceByTag.get('nuevo')!.id);
  }

  console.log('--- 5. Un recurso COMPLETED tiene la actividad MÁS nueva -> NUNCA se selecciona ---');
  {
    const s1 = buildSubject(1, [
      [['done', { kind: 'completed', at: ['2026-09-01T00:00:00.000Z'] }]], // el más nuevo, pero COMPLETED
      [['curso', { kind: 'exercise', at: ['2026-02-01T00:00:00.000Z'] }]], // más viejo, pero EN CURSO
    ]);
    installMockFetch([s1]);
    const r = await pickContinueTarget();
    check('selecciona el EN CURSO, NUNCA el COMPLETED aunque sea más reciente', selectedId(r) === s1.resourceByTag.get('curso')!.id);
  }

  console.log('--- 6. Empate exacto de timestamp -> gana el primero en el recorrido canónico ---');
  {
    const t = '2026-04-04T04:04:04.000Z';
    const s1 = buildSubject(1, [[['primero', { kind: 'exercise', at: [t] }]]]);
    const s2 = buildSubject(2, [[['segundo', { kind: 'exercise', at: [t] }]]]);
    installMockFetch([s1, s2]);
    const r = await pickContinueTarget();
    check('empate -> el primero en el recorrido canónico (materia 1)', selectedId(r) === s1.resourceByTag.get('primero')!.id);
  }

  console.log('--- 7. Sin ningún EN CURSO -> primer recurso SIN COMENZAR en orden canónico (materia -> unidad -> recurso) ---');
  {
    const s1 = buildSubject(1, [['completed', 'completed']]);
    const s2 = buildSubject(2, [[['first', 'not-started'], 'not-started'], ['resource']]);
    const s3 = buildSubject(3, [['not-started']]);
    installMockFetch([s1, s2, s3]);
    const r = await pickContinueTarget();
    check('primer SIN COMENZAR canónico -> materia 2, unidad 1, recurso 1', selectedId(r) === s2.resourceByTag.get('first')!.id);
    check('entry === "resource"', r.ok && r.target.kind === 'topic' && r.target.entry === 'resource');
  }

  console.log('--- 8. Materia 1 COMPLETADA, materia 2 SIN COMENZAR -> selecciona el sin-comenzar de la materia 2 ---');
  {
    const s1 = buildSubject(1, [['completed']]);
    const s2 = buildSubject(2, [[['u', 'not-started']]]);
    const s3 = buildSubject(3, [['not-started']]);
    installMockFetch([s1, s2, s3]);
    const r = await pickContinueTarget();
    check('selecciona el SIN COMENZAR de la materia 2', selectedId(r) === s2.resourceByTag.get('u')!.id);
  }

  console.log('--- 9. TODO COMPLETADO -> all-completed GLOBAL (sin `subject`) ---');
  {
    const calls = installMockFetch([
      buildSubject(1, [['completed', 'completed']]),
      buildSubject(2, [['completed']]),
      buildSubject(3, [['completed', 'completed', 'completed']]),
    ]);
    const r = await pickContinueTarget();
    check('kind === "all-completed"', r.ok && r.target.kind === 'all-completed');
    check('no nombra una sola materia (sin `subject`)', r.ok && r.target.kind === 'all-completed' && !('subject' in r.target));
    check('se inspeccionaron las 3 materias (3 batches de progreso)', progressCalls(calls).length === 3);
  }

  console.log('--- 10. Sin contenido en ninguna materia -> no-content ---');
  {
    const calls = installMockFetch([emptySubject(1), buildSubject(2, [[]]), emptySubject(3)]);
    const r = await pickContinueTarget();
    check('kind === "no-content"', r.ok && r.target.kind === 'no-content');
    check('nunca se llamó a /progress/topics', progressCalls(calls).length === 0);
  }
  {
    installMockFetch([]);
    const r = await pickContinueTarget();
    check('cero materias -> no-content', r.ok && r.target.kind === 'no-content');
  }

  console.log('--- 11. Fallo real de fetch -> ok:false (NUNCA "completada"/"no-content" falsa) ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response(JSON.stringify({ error: { code: 'X', message: 'Error.' } }), { status: 500, headers: { 'content-type': 'application/json' } })) as typeof fetch;
    check('listSubjects 500 -> ok:false', (await pickContinueTarget()).ok === false);
  }
  {
    installMockFetch([buildSubject(1, [['resource']], 'units'), buildSubject(2, [['resource']])]);
    check('unidades de una materia fallan -> ok:false (no se salta a la siguiente)', (await pickContinueTarget()).ok === false);
  }
  {
    installMockFetch([buildSubject(1, [['resource']], 'children'), buildSubject(2, [['resource']])]);
    check('hijos de una unidad fallan -> ok:false', (await pickContinueTarget()).ok === false);
  }
  {
    installMockFetch([buildSubject(1, [['exercise']], 'progress'), buildSubject(2, [['resource']])]);
    check('progreso de una materia falla -> ok:false', (await pickContinueTarget()).ok === false);
  }

  console.log('--- 12. Progreso siempre BATCH, nunca singular; 4 unidades x 25 recursos -> 1 batch por materia ---');
  {
    const many: ResourceSpec[][] = Array.from({ length: 4 }, () => Array.from({ length: 25 }, () => 'not-started' as ResourceSpec));
    const calls = installMockFetch([buildSubject(1, many)]);
    const r = await pickContinueTarget();
    check('resuelve ok (primer sin-comenzar)', r.ok && r.target.kind === 'topic' && r.target.entry === 'resource');
    check('EXACTAMENTE 1 batch de progreso (nunca 100)', progressCalls(calls).length === 1);
    check('la llamada es la ruta COLECCIÓN (?topicIds=)', progressCalls(calls)[0]?.url.includes('?topicIds='));
    check('EXACTAMENTE 4 llamadas /children (una por unidad)', calls.filter((c) => c.url.includes('/children')).length === 4);
    check('nunca `/progress/topics/:id` singular', noSingularProgress(calls));
  }
  {
    // Multi-materia: 1 batch de progreso por materia con recursos (2 de 3).
    const calls = installMockFetch([
      buildSubject(1, [['exercise']]),
      emptySubject(2),
      buildSubject(3, [['not-started']]),
    ]);
    await pickContinueTarget();
    check('1 batch de progreso por materia CON recursos (materia 2 vacía no cuenta)', progressCalls(calls).length === 2);
    check('nunca singular en multi-materia', noSingularProgress(calls));
  }

  console.log('--- 13. Destino RECURSO hijo (parentId !== null) tanto en curso como sin comenzar ---');
  {
    installMockFetch([buildSubject(1, [[{ kind: 'exercise', at: ['2026-07-07T00:00:00.000Z'] }]])]);
    const r1 = await pickContinueTarget();
    check('en curso -> parentId !== null', r1.ok && r1.target.kind === 'topic' && r1.target.topic.parentId !== null);
    installMockFetch([buildSubject(2, [['not-started']])]);
    const r2 = await pickContinueTarget();
    check('sin comenzar -> parentId !== null', r2.ok && r2.target.kind === 'topic' && r2.target.topic.parentId !== null);
  }

  console.log('--- 14. La recencia usa max(respondedAt), NO responses[last] -- array en orden NO cronológico ---');
  {
    // Recurso A: respuestas [ene, DIC, mar] -> el array NO está ordenado; max = DIC.
    // Recurso B: respuestas [feb] -> max = feb. A (DIC) debe ganar a B (feb).
    const s = buildSubject(1, [
      [['A', { kind: 'exercise', at: ['2026-01-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'] }]],
      [['B', { kind: 'exercise', at: ['2026-02-01T00:00:00.000Z'] }]],
    ]);
    installMockFetch([s]);
    const r = await pickContinueTarget();
    check('gana A por max(respondedAt)=DIC, aunque responses[last] de A sea marzo', selectedId(r) === s.resourceByTag.get('A')!.id);

    // Y al revés: si B tuviera una respuesta en 2027 (fuera de orden en medio del array), B gana.
    const s2 = buildSubject(1, [
      [['A2', { kind: 'exercise', at: ['2026-01-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z'] }]],
      [['B2', { kind: 'exercise', at: ['2026-02-01T00:00:00.000Z', '2027-01-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'] }]],
    ]);
    installMockFetch([s2]);
    const r2 = await pickContinueTarget();
    check('gana B2 (tiene un respondedAt de 2027 en medio del array)', selectedId(r2) === s2.resourceByTag.get('B2')!.id);
  }

  // ------------------------------------------------------------------
  // 15. PREMIUM V1 (C2.2 regresión Inicio): Inicio 100% disponible para FREE
  //     tras el enforcement de Capa 1. Desde C1.3 los `children` de una
  //     unidad Premium devuelven `403 PREMIUM_REQUIRED` para FREE.
  //     `pickContinueTarget({ freeUnitsOnly: true })` NO debe pedirlos, y un
  //     `403` que llegase igual (tier stale) NO es fatal.
  // ------------------------------------------------------------------
  console.log('--- 15. FREE: no se recorren unidades Premium; un 403 en children no es fatal ---');

  /** Materia con `freeUnits` unidades Free (1 recurso sin-comenzar c/u) + `premiumUnits` unidades que dan 403 en children. */
  function installPremiumAwareFetch(opts: { freeUnits: number; premiumUnits: number; premium403: boolean }) {
    const calls: RecordedCall[] = [];
    const subject = mockSubject(1);
    const units: CurriculumTopicResponse[] = [];
    const childrenByUnit = new Map<string, CurriculumTopicResponse[]>();
    const premiumUnitIds = new Set<string>();
    const total = opts.freeUnits + opts.premiumUnits;
    for (let i = 0; i < total; i++) {
      const unit = mockTopic(randomUUID(), i + 1, subject.id, null);
      units.push(unit);
      const child = mockTopic(randomUUID(), 1, subject.id, unit.id);
      childrenByUnit.set(unit.id, [child]);
      if (i >= opts.freeUnits) premiumUnitIds.add(unit.id);
    }
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      calls.push({ method: init?.method ?? 'GET', url });
      if (url.endsWith('/education/subjects')) return json([subject]);
      if (/\/education\/subjects\/[^/]+\/topics/.test(url)) return json(units);
      const ch = /\/education\/topics\/([^/]+)\/children/.exec(url);
      if (ch) {
        if (opts.premium403 && premiumUnitIds.has(ch[1]!)) {
          return json({ error: { code: 'PREMIUM_REQUIRED', message: 'Contenido Premium.' } }, 403);
        }
        return json(childrenByUnit.get(ch[1]!) ?? []);
      }
      if (url.includes('/progress/topics?topicIds=')) return json([]); // todos sin-comenzar
      throw new Error(`Llamada inesperada: ${url}`);
    }) as typeof fetch;
    return { calls, units, premiumUnitIds };
  }

  {
    // FREE (freeUnitsOnly): 4 unidades (2 Free + 2 Premium). Solo se piden los children de las 2 Free.
    const { calls, units } = installPremiumAwareFetch({ freeUnits: 2, premiumUnits: 2, premium403: true });
    const r = await pickContinueTarget({ freeUnitsOnly: true });
    const childrenCalls = calls.filter((c) => c.url.includes('/children'));
    const premiumUnitChildrenCalls = childrenCalls.filter((c) => units.slice(2).some((u) => c.url.includes(u.id)));
    check('FREE: resuelve ok (Inicio disponible)', r.ok);
    check('FREE: selecciona un recurso de U1/U2', r.ok && r.target.kind === 'topic' && r.target.entry === 'resource');
    check('FREE: EXACTAMENTE 2 llamadas /children (solo unidades Free)', childrenCalls.length === 2);
    check('FREE: CERO llamadas /children a unidades Premium', premiumUnitChildrenCalls.length === 0);
  }
  {
    // Defensa: aunque se recorran todas (tier no resuelto) y un children dé 403,
    // Inicio NO falla -- esa unidad se salta.
    const { calls } = installPremiumAwareFetch({ freeUnits: 2, premiumUnits: 2, premium403: true });
    const r = await pickContinueTarget(); // sin freeUnitsOnly -> recorre las 4
    check('tier no resuelto: se piden los 4 children', calls.filter((c) => c.url.includes('/children')).length === 4);
    check('un 403 PREMIUM_REQUIRED en children NO es fatal -> ok', r.ok);
    check('resuelve a un recurso accesible de U1/U2', r.ok && r.target.kind === 'topic');
  }
  {
    // Un error NO-Premium en children sigue siendo fatal (no se degrada la resiliencia).
    const s = buildSubject(1, [['resource']], 'children');
    installMockFetch([s]);
    check('children 500 (no Premium) sigue -> ok:false', (await pickContinueTarget({ freeUnitsOnly: true })).ok === false);
  }
  {
    // PREMIUM confirmado (freeUnitsOnly:false): se recorren todas, sin 403 (backend no gatea).
    const { calls } = installPremiumAwareFetch({ freeUnits: 2, premiumUnits: 2, premium403: false });
    const r = await pickContinueTarget({ freeUnitsOnly: false });
    check('PREMIUM: se piden los 4 children', calls.filter((c) => c.url.includes('/children')).length === 4);
    check('PREMIUM: resuelve ok', r.ok);
  }

  // Estático: Inicio pasa el tier confirmado y NUNCA se bloquea por el entitlement.
  {
    const homeSrc = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'index.tsx'), 'utf8');
    check('index.tsx usa useEntitlement', /useEntitlement\(\)/.test(homeSrc));
    check(
      'index.tsx deriva confirmedTier solo de state.status === "ready"',
      /entitlement\.state\.status === 'ready' \? entitlement\.state\.tier : null/.test(homeSrc),
    );
    check(
      'index.tsx pasa { freeUnitsOnly: confirmedTier === "FREE" } a pickContinueTarget',
      /pickContinueTarget\(\{ freeUnitsOnly: confirmedTier === 'FREE' \}\)/.test(homeSrc),
    );
    check('index.tsx: load() depende de confirmedTier (recarga al confirmarse/cambiar el tier)', /\}, \[confirmedTier\]\);/.test(homeSrc));
    check('index.tsx NO renderiza paywall ni PremiumLockedScreen en Inicio', !/PremiumLockedScreen|usePaywall|PremiumBadge/.test(homeSrc));
    check('index.tsx NO bloquea el render por el entitlement (sin early-return por entitlement.state)', !/entitlement\.state\.status === 'loading'\) return|entitlement\.state\.status === 'error'\) return/.test(homeSrc));
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
