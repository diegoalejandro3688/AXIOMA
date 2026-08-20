// Gate de "Unidades" (Estudio -> materia -> Unidades) tras migrarla al
// batch de progreso: segundo call-site del mismo fan-out N+1 corregido en
// Inicio (`app/(tabs)/estudio/[subjectId]/unidades.tsx:34`, antes
// `Promise.all(topics.map(getTopicProgress))`), reproducible con los
// mismos datos reales de Matemática.
//
// Verificación DETERMINISTA -- mismo criterio que
// `verify-continue-target-batch-gate.ts`: Node puro, `global.fetch`
// reemplazado por un stub. Prueba `getTopicsProgressBatch()` (la función
// real de producción que la pantalla ahora usa) MÁS la misma reducción a
// `Record<string, TopicProgressResponse>` que hace `unidades.tsx` en su
// `load()` -- replicada aquí línea por línea porque esa lógica vive dentro
// de un componente React (no es una función exportable de forma aislada),
// mismo criterio que el resto de gates de este directorio, que tampoco
// montan componentes React.
import { randomUUID } from 'node:crypto';
import Module from 'node:module';
import { join } from 'node:path';
import type { TopicProgressResponse } from '@axioma/contracts';

// Ver la nota equivalente en `verify-continue-target-batch-gate.ts`:
// `expo-secure-store` termina requiriendo `react-native`, que no corre en
// Node puro. Redirige SOLO esa resolución a un stub compartido -- ningún
// archivo de producción se modifica ni se mockea.
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

function mockProgress(topicId: string, status: TopicProgressResponse['status']): TopicProgressResponse {
  const hasResponse = status !== 'NOT_STARTED';
  return {
    curriculumTopicId: topicId,
    status,
    startedAt: hasResponse ? '2026-01-01T00:00:00Z' : null,
    lastActivityAt: hasResponse ? '2026-01-01T00:00:00Z' : null,
    completedAt: status === 'COMPLETED' ? '2026-01-01T00:00:00Z' : null,
    responses: hasResponse ? [{ questionVersionId: randomUUID(), answerOptionId: randomUUID(), isCorrect: true, respondedAt: '2026-01-01T00:00:00Z' }] : [],
  };
}

function installMockFetch(progressByTopic: Map<string, TopicProgressResponse>) {
  const calls: RecordedCall[] = [];
  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    if (url.startsWith('http://mock/progress/topics?topicIds=')) {
      const requestedIds = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const result = requestedIds
        .map((id) => progressByTopic.get(id))
        .filter((entry): entry is TopicProgressResponse => Boolean(entry));
      return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // Cualquier otra URL -- en particular `/progress/topics/<id>` singular
    // -- NUNCA debería llamarse desde `getTopicsProgressBatch()`. Lanzar
    // aquí convierte una regresión N+1 silenciosa en un fallo explícito.
    throw new Error(`Llamada inesperada en el flujo de progreso de Unidades: ${method} ${url}`);
  }) as typeof fetch;
  return calls;
}

/** Misma reducción que `unidades.tsx` línea por línea (ver nota de cabecera). */
function buildProgressByTopic(entries: TopicProgressResponse[]): Record<string, TopicProgressResponse> {
  const progressByTopic: Record<string, TopicProgressResponse> = {};
  for (const progress of entries) progressByTopic[progress.curriculumTopicId] = progress;
  return progressByTopic;
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const { getTopicsProgressBatch } = await import('../lib/api/progress');

  console.log('--- 1. Arquitectura: 131 temas (escala real de Matemática hoy) -> UNA sola llamada, no 131 ---');
  {
    const topicIds = Array.from({ length: 131 }, () => randomUUID());
    const progressByTopicMock = new Map(topicIds.map((id) => [id, mockProgress(id, 'NOT_STARTED')]));
    const calls = installMockFetch(progressByTopicMock);

    const result = await getTopicsProgressBatch(topicIds);

    check('getTopicsProgressBatch() resuelve ok', result.ok);
    check('EXACTAMENTE 1 llamada de red (nunca 131 -- sin fan-out N+1)', calls.length === 1);
    check('la única llamada es la ruta COLECCIÓN (?topicIds=), no la singular (/progress/topics/:id)', calls[0]?.url.includes('?topicIds='));
    check('devuelve un elemento por cada uno de los 131 temas', result.ok && result.data.length === 131);
  }

  console.log('--- 2. Conservación de los 3 estados visibles en Unidades (COMPLETED/IN_PROGRESS/NOT_STARTED) ---');
  {
    const topicCompleted = randomUUID();
    const topicInProgress = randomUUID();
    const topicNotStarted = randomUUID();
    const progressByTopicMock = new Map([
      [topicCompleted, mockProgress(topicCompleted, 'COMPLETED')],
      [topicInProgress, mockProgress(topicInProgress, 'IN_PROGRESS')],
      [topicNotStarted, mockProgress(topicNotStarted, 'NOT_STARTED')],
    ]);
    installMockFetch(progressByTopicMock);

    const result = await getTopicsProgressBatch([topicCompleted, topicInProgress, topicNotStarted]);
    check('batch ok', result.ok);
    const byTopic = result.ok ? buildProgressByTopic(result.data) : {};
    check('topicCompleted conserva status COMPLETED', byTopic[topicCompleted]?.status === 'COMPLETED');
    check('topicInProgress conserva status IN_PROGRESS', byTopic[topicInProgress]?.status === 'IN_PROGRESS');
    check('topicNotStarted conserva status NOT_STARTED', byTopic[topicNotStarted]?.status === 'NOT_STARTED');
  }

  console.log('--- 3. Tema omitido por el batch (ej. borrado entre listRootTopics y la respuesta) -> tratamiento NOT_STARTED, no un error de pantalla ---');
  {
    const topicPresent = randomUUID();
    const topicMissing = randomUUID(); // se pide, pero NUNCA aparece en la respuesta del servidor.
    const progressByTopicMock = new Map([[topicPresent, mockProgress(topicPresent, 'IN_PROGRESS')]]);
    installMockFetch(progressByTopicMock);

    const result = await getTopicsProgressBatch([topicPresent, topicMissing]);
    check('batch ok (200, no falla por el id ausente)', result.ok);
    const byTopic = result.ok ? buildProgressByTopic(result.data) : {};
    check('topicPresent conserva su estado real', byTopic[topicPresent]?.status === 'IN_PROGRESS');
    check(
      'topicMissing está AUSENTE del mapa -- exactamente la condición que dispara `progress?.status ?? "NOT_STARTED"` en unidades.tsx (nunca ErrorState por un solo tema)',
      byTopic[topicMissing] === undefined,
    );
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Unidades (batch de progreso) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
