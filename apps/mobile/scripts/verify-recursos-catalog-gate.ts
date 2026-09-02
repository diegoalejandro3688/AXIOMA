// Gate del "catálogo de Recursos" (Estudio R -- modo independiente
// `estudio/[subjectId]/recursos`). Protege la ARQUITECTURA DE CARGA de
// `lib/study/resource-catalog.ts::assembleResourceCatalog`, no el render.
//
// Contrato:
//   1. una carga con N Unidades -> 1 listRootTopics + N listChildTopics + 1
//      getTopicsProgressBatch (patrón `1 + N + 1`), NUNCA un
//      `GET /progress/topics/:id` por recurso;
//   2. TODOS los resource ids viajan en el ÚNICO batch de progreso;
//   3. cada Recurso queda asociado a su Unidad (agrupación correcta);
//   4. la numeración conceptual reinicia por sección (índice dentro de la
//      sección);
//   5. Unidades sin Recursos se OMITEN;
//   6. progreso ausente -> NOT_STARTED en el call-site;
//   7. materia sin Recursos -> catálogo con 0 secciones (EmptyState global);
//   8. un fallo de listRootTopics / de CUALQUIER listChildTopics / del batch
//      se PROPAGA como { ok: false } (ErrorState global, nunca silenciado).
//
// Node puro -- `global.fetch` stub + redirección de `expo-secure-store` al
// stub compartido (mismo criterio que `verify-unidades-batch-gate.ts`).
import Module from 'node:module';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CurriculumTopicResponse, TopicProgressResponse } from '@axioma/contracts';

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
    failures += 1;
  }
}

interface RecordedCall {
  method: string;
  url: string;
}

function topic(subjectId: string, code: string, name: string, order: number, parentId: string | null): CurriculumTopicResponse {
  return { id: randomUUID(), code, name, order, parentId, subjectId };
}

function mockProgress(topicId: string, status: TopicProgressResponse['status']): TopicProgressResponse {
  const touched = status !== 'NOT_STARTED';
  return {
    curriculumTopicId: topicId,
    status,
    startedAt: touched ? '2026-01-01T00:00:00Z' : null,
    lastActivityAt: touched ? '2026-01-01T00:00:00Z' : null,
    completedAt: status === 'COMPLETED' ? '2026-01-01T00:00:00Z' : null,
    responses: touched
      ? [{ questionVersionId: randomUUID(), answerOptionId: randomUUID(), isCorrect: true, respondedAt: '2026-01-01T00:00:00Z' }]
      : [],
  };
}

interface Fixture {
  subjectId: string;
  units: CurriculumTopicResponse[];
  childrenByUnit: Map<string, CurriculumTopicResponse[]>;
  progressByResource: Map<string, TopicProgressResponse>;
  fail?: 'roots' | 'children' | 'progress';
}

function installMockFetch(fx: Fixture): RecordedCall[] {
  const calls: RecordedCall[] = [];
  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    const rootsMatch = url.match(/\/education\/subjects\/([^/]+)\/topics$/);
    if (rootsMatch) {
      if (fx.fail === 'roots') return new Response('boom', { status: 500 });
      return json(fx.units);
    }

    const childrenMatch = url.match(/\/education\/topics\/([^/]+)\/children$/);
    if (childrenMatch) {
      const unitId = childrenMatch[1];
      if (fx.fail === 'children' && unitId === fx.units[1]?.id) return new Response('boom', { status: 500 });
      return json(fx.childrenByUnit.get(unitId) ?? []);
    }

    if (url.includes('/progress/topics?topicIds=')) {
      if (fx.fail === 'progress') return new Response('boom', { status: 500 });
      const ids = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const result = ids
        .map((id) => fx.progressByResource.get(id))
        .filter((entry): entry is TopicProgressResponse => Boolean(entry));
      return json(result);
    }

    // `GET /progress/topics/:id` singular u otra URL inesperada -> regresión.
    throw new Error(`Llamada inesperada en el catálogo de Recursos: ${method} ${url}`);
  }) as typeof fetch;
  return calls;
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

/** Materia con 3 unidades: U1 con 2 recursos, U2 con 3, U3 SIN recursos. */
function buildFixture(): Fixture {
  const subjectId = randomUUID();
  const u1 = topic(subjectId, 'CIENCIAS.BIOLOGIA', 'Biología', 1, null);
  const u2 = topic(subjectId, 'CIENCIAS.FISICA', 'Física', 2, null);
  const u3 = topic(subjectId, 'CIENCIAS.QUIMICA', 'Química', 3, null);
  const u1r = [
    topic(subjectId, 'CIENCIAS.BIOLOGIA.CELULA', 'La célula', 1, u1.id),
    topic(subjectId, 'CIENCIAS.BIOLOGIA.ADN', 'ADN y genes', 2, u1.id),
  ];
  const u2r = [
    topic(subjectId, 'CIENCIAS.FISICA.ONDAS', 'Ondas', 1, u2.id),
    topic(subjectId, 'CIENCIAS.FISICA.FUERZAS', 'Fuerzas', 2, u2.id),
    topic(subjectId, 'CIENCIAS.FISICA.ENERGIA', 'Energía', 3, u2.id),
  ];
  const childrenByUnit = new Map<string, CurriculumTopicResponse[]>([
    [u1.id, u1r],
    [u2.id, u2r],
    [u3.id, []],
  ]);
  const progressByResource = new Map<string, TopicProgressResponse>([
    [u1r[0].id, mockProgress(u1r[0].id, 'COMPLETED')],
    [u1r[1].id, mockProgress(u1r[1].id, 'IN_PROGRESS')],
    [u2r[0].id, mockProgress(u2r[0].id, 'NOT_STARTED')],
    // u2r[1] y u2r[2] AUSENTES del batch a propósito.
  ]);
  return { subjectId, units: [u1, u2, u3], childrenByUnit, progressByResource };
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { assembleResourceCatalog, resourceCountLabel } = await import('../lib/study/resource-catalog');

  console.log('--- 1. Patrón de requests 1 + N + 1 (N = unidades), sin N+1 de progreso ---');
  {
    const fx = buildFixture();
    const calls = installMockFetch(fx);
    const result = await assembleResourceCatalog(fx.subjectId);

    check('assembleResourceCatalog resuelve ok', result.ok);
    const roots = calls.filter((c) => /\/education\/subjects\/[^/]+\/topics$/.test(c.url));
    const children = calls.filter((c) => /\/education\/topics\/[^/]+\/children$/.test(c.url));
    const batch = calls.filter((c) => c.url.includes('/progress/topics?topicIds='));
    const singular = calls.filter((c) => /\/progress\/topics\/[0-9a-f-]{36}$/i.test(c.url));
    check('EXACTAMENTE 1 listRootTopics', roots.length === 1);
    check('EXACTAMENTE N (3) listChildTopics -- uno por unidad', children.length === 3);
    check('EXACTAMENTE 1 getTopicsProgressBatch', batch.length === 1);
    check('CERO llamadas a /progress/topics/:id singular', singular.length === 0);
    check('coste total = 1 + N + 1 = 5', calls.length === 5);
  }

  console.log('--- 2. Todos los resource ids (de secciones no vacías) viajan en el ÚNICO batch ---');
  {
    const fx = buildFixture();
    const calls = installMockFetch(fx);
    await assembleResourceCatalog(fx.subjectId);
    const batchCall = calls.find((c) => c.url.includes('/progress/topics?topicIds='))!;
    const sentIds = decodeURIComponent(batchCall.url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
    const expectedIds = [...(fx.childrenByUnit.get(fx.units[0].id) ?? []), ...(fx.childrenByUnit.get(fx.units[1].id) ?? [])].map((r) => r.id);
    check('el batch lleva los 5 recursos de U1+U2', sentIds.length === 5 && expectedIds.every((id) => sentIds.includes(id)));
    check('el batch NO lleva ids de la unidad sin recursos (U3)', !sentIds.includes(fx.units[2].id));
    check('ids únicos en el batch (dedup)', new Set(sentIds).size === sentIds.length);
  }

  console.log('--- 3. Agrupación: cada recurso queda en su unidad; numeración reinicia por sección ---');
  {
    const fx = buildFixture();
    installMockFetch(fx);
    const result = await assembleResourceCatalog(fx.subjectId);
    if (!result.ok) throw new Error('esperaba ok');
    const { sections } = result.catalog;
    check('2 secciones (U3 sin recursos, omitida)', sections.length === 2);
    check('sección 1 = Biología con 2 recursos', sections[0].unit.name === 'Biología' && sections[0].resources.length === 2);
    check('sección 2 = Física con 3 recursos', sections[1].unit.name === 'Física' && sections[1].resources.length === 3);
    check(
      'orden de unidades y recursos preservado del backend',
      sections[0].resources[0].name === 'La célula' && sections[1].resources[2].name === 'Energía',
    );
    // Numeración conceptual: `index + 1` dentro de cada sección.
    const numbering = sections.map((s) => s.resources.map((_, i) => String(i + 1).padStart(2, '0')));
    check('cada sección numera desde 01', numbering[0][0] === '01' && numbering[1][0] === '01');
    check('la sección 2 llega hasta 03 (no continúa desde 02 de la sección 1)', numbering[1][numbering[1].length - 1] === '03');
  }

  console.log('--- 4. Progreso: presente se conserva; ausente -> NOT_STARTED en el call-site ---');
  {
    const fx = buildFixture();
    installMockFetch(fx);
    const result = await assembleResourceCatalog(fx.subjectId);
    if (!result.ok) throw new Error('esperaba ok');
    const { sections, progressByResource } = result.catalog;
    const bioR = sections[0].resources;
    const fisR = sections[1].resources;
    check('recurso COMPLETED conserva estado', progressByResource[bioR[0].id]?.status === 'COMPLETED');
    check('recurso IN_PROGRESS conserva estado', progressByResource[bioR[1].id]?.status === 'IN_PROGRESS');
    check('recurso NOT_STARTED conserva estado', progressByResource[fisR[0].id]?.status === 'NOT_STARTED');
    check('recurso ausente del batch -> sin entrada en el mapa', progressByResource[fisR[1].id] === undefined);
    check(
      'call-site: `progressByResource[id]?.status ?? "NOT_STARTED"` para el ausente',
      (progressByResource[fisR[2].id]?.status ?? 'NOT_STARTED') === 'NOT_STARTED',
    );
  }

  console.log('--- 5. Materia sin recursos -> 0 secciones (EmptyState global) ---');
  {
    const fx = buildFixture();
    for (const u of fx.units) fx.childrenByUnit.set(u.id, []);
    const calls = installMockFetch(fx);
    const result = await assembleResourceCatalog(fx.subjectId);
    check('ok', result.ok);
    check('0 secciones', result.ok && result.catalog.sections.length === 0);
    check('NO se llama al batch de progreso cuando no hay ids', !calls.some((c) => c.url.includes('/progress/topics?topicIds=')));
  }

  console.log('--- 6. Fallos se PROPAGAN como { ok: false } (ErrorState global), nunca silenciados ---');
  {
    const fxRoots = { ...buildFixture(), fail: 'roots' as const };
    installMockFetch(fxRoots);
    check('fallo de listRootTopics -> ok:false', !(await assembleResourceCatalog(fxRoots.subjectId)).ok);

    const fxChildren = { ...buildFixture(), fail: 'children' as const };
    installMockFetch(fxChildren);
    check('fallo de UN listChildTopics -> ok:false (no se salta la unidad)', !(await assembleResourceCatalog(fxChildren.subjectId)).ok);

    const fxProgress = { ...buildFixture(), fail: 'progress' as const };
    installMockFetch(fxProgress);
    check('fallo del batch de progreso -> ok:false', !(await assembleResourceCatalog(fxProgress.subjectId)).ok);
  }

  console.log('--- 7. resourceCountLabel: singular / plural ---');
  {
    check('1 -> "1 recurso"', resourceCountLabel(1) === '1 recurso');
    check('0 -> "0 recursos"', resourceCountLabel(0) === '0 recursos');
    check('12 -> "12 recursos"', resourceCountLabel(12) === '12 recursos');
  }

  console.log('');
  if (failures > 0) {
    console.error(`Gate del catálogo de Recursos: ${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Gate del catálogo de Recursos (Estudio R): todas las verificaciones pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
