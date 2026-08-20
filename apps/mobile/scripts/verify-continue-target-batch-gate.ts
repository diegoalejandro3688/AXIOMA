// Gate de "Continuar estudiando" (Inicio) tras la corrección del fan-out
// N+1: `pickContinueTarget()` hacía antes un GET /progress/topics/:id POR
// CADA tema raíz de la materia -- con un catálogo de prueba contaminado
// (129 temas) esto superaba el rate limit del backend. Ahora usa UNA sola
// llamada a GET /progress/topics?topicIds=....
//
// Verificación DETERMINISTA -- corre en Node puro, sin backend real, con
// `global.fetch` reemplazado por un stub que registra cada llamada y
// responde según el patrón de URL. Prueba dos cosas que un gate contra un
// servidor real no puede aislar con la misma certeza:
//   1. Que `pickContinueTarget()` hace EXACTAMENTE 1 llamada de progreso
//      (nunca N) sin importar cuántos temas devuelva EDUCATION.
//   2. Que la lógica de selección (exercise > resource > all-completed >
//      no-content) NO cambió ni un bit frente al comportamiento anterior.
//
// La reproducción contra el backend/BD REALES (129 temas de Matemática,
// sin 429) es un gate/verificación aparte -- ver
// `docs/verification/progress-batch-fix-e2e.md` (evidencia manual) --
// nunca se mezcla con este, que es intencionalmente sin red real.
import { randomUUID } from 'node:crypto';
import Module from 'node:module';
import { join } from 'node:path';
import type { CurriculumTopicResponse, SubjectResponse, TopicProgressResponse } from '@axioma/contracts';

/**
 * `lib/api/client.ts` -> `lib/auth/session-storage.ts` -> `expo-secure-store`
 * -> `react-native` (para `NativeModules`/`Platform`) -- ese último módulo
 * no se puede cargar en Node puro (fuera de Metro/Expo). Este gate no
 * necesita sesión real (todas las respuestas se sirven desde el `fetch`
 * simulado de abajo), así que se redirige SOLO `expo-secure-store` a un
 * stub local ANTES de importar `pick-continue-topic` -- ningún archivo de
 * producción se modifica ni se mockea; `session-storage.ts` real sigue
 * corriendo tal cual, solo cambia a qué implementación de SecureStore
 * termina llamando.
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

function mockTopic(id: string, order: number, subjectId: string): CurriculumTopicResponse {
  return { id, code: `mock-${id.slice(0, 8)}`, name: `Tema ${order}`, order, parentId: null, subjectId };
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

/**
 * Instala un `fetch` de prueba. `topics`/`progressByTopic` definen el
 * catálogo y el progreso simulados; `calls` acumula cada solicitud para
 * las aserciones de conteo. Cualquier URL no reconocida lanza -- una
 * llamada inesperada (ej. un `GET /progress/topics/:id` singular colado)
 * debe FALLAR el gate, no pasar en silencio.
 */
function installMockFetch(subject: SubjectResponse, topics: CurriculumTopicResponse[], progressByTopic: Map<string, TopicProgressResponse>) {
  const calls: RecordedCall[] = [];

  (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';
    calls.push({ method, url });

    const jsonResponse = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

    if (url.endsWith('/education/subjects')) {
      return jsonResponse([subject]);
    }
    if (url.includes(`/education/subjects/${subject.id}/topics`)) {
      return jsonResponse(topics);
    }
    if (url.startsWith('http://mock/progress/topics?topicIds=')) {
      const requestedIds = decodeURIComponent(url.split('topicIds=')[1] ?? '').split(',').filter(Boolean);
      const result = requestedIds
        .map((id) => progressByTopic.get(id))
        .filter((entry): entry is TopicProgressResponse => Boolean(entry));
      return jsonResponse(result);
    }
    // Cualquier otra URL (en particular `/progress/topics/<id>` singular)
    // -- NUNCA debería llamarse desde `pickContinueTarget()` tras la
    // corrección. Lanzar aquí convierte una regresión silenciosa en un
    // fallo explícito del gate.
    throw new Error(`Llamada inesperada en pickContinueTarget(): ${method} ${url}`);
  }) as typeof fetch;

  return calls;
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  // Import dinámico DESPUÉS de fijar la env var -- `lib/api/client.ts` lee
  // `EXPO_PUBLIC_API_BASE_URL` al cargarse (constante de módulo).
  const { pickContinueTarget } = await import('../lib/progress/pick-continue-topic');

  const subjectId = randomUUID();
  const subject: SubjectResponse = { id: subjectId, subjectKey: 'matematica', name: 'Matemática', shortName: 'Mate', displayOrder: 1 };

  console.log('--- 1. Arquitectura: 150 temas raíz -> UNA sola llamada de progreso, no 150 (reproduce la escala real de Inicio) ---');
  {
    const topics = Array.from({ length: 150 }, (_, i) => mockTopic(randomUUID(), i + 1, subjectId));
    const progressByTopic = new Map(topics.map((t) => [t.id, mockProgress(t.id, 'not-started')]));
    const calls = installMockFetch(subject, topics, progressByTopic);

    const result = await pickContinueTarget();

    check('pickContinueTarget() resuelve ok', result.ok);
    check('EXACTAMENTE 3 llamadas de red en total (subjects + topics + progress-batch)', calls.length === 3);
    const progressCalls = calls.filter((c) => c.url.includes('/progress/topics'));
    check('EXACTAMENTE 1 llamada de progreso (nunca 150 -- el fan-out N+1 quedó eliminado)', progressCalls.length === 1);
    check('la única llamada de progreso es la ruta COLECCIÓN (?topicIds=), no la singular (/progress/topics/:id)', progressCalls[0]?.url.includes('?topicIds='));
    check('resultado: sin progreso -- "all-completed" no, cae en "resource" del primer tema (todos NOT_STARTED)', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
  }

  console.log('--- 2. Selección preservada: EXERCISE tiene prioridad sobre RESOURCE y COMPLETED ---');
  {
    const topicCompleted = mockTopic(randomUUID(), 1, subjectId);
    const topicExercise = mockTopic(randomUUID(), 2, subjectId);
    const topicResource = mockTopic(randomUUID(), 3, subjectId);
    const topics = [topicCompleted, topicExercise, topicResource];
    const progressByTopic = new Map([
      [topicCompleted.id, mockProgress(topicCompleted.id, 'completed')],
      [topicExercise.id, mockProgress(topicExercise.id, 'exercise')],
      [topicResource.id, mockProgress(topicResource.id, 'resource')],
    ]);
    installMockFetch(subject, topics, progressByTopic);

    const result = await pickContinueTarget();
    check('elige el tema EXERCISE aunque no sea el primero de la lista', result.ok && result.target.kind === 'topic' && result.target.topic.id === topicExercise.id);
    check('entry === "exercise"', result.ok && result.target.kind === 'topic' && result.target.entry === 'exercise');
  }

  console.log('--- 3. Selección preservada: sin EXERCISE, cae en el primer RESOURCE ---');
  {
    const topicCompleted = mockTopic(randomUUID(), 1, subjectId);
    const topicResource = mockTopic(randomUUID(), 2, subjectId);
    const topics = [topicCompleted, topicResource];
    const progressByTopic = new Map([
      [topicCompleted.id, mockProgress(topicCompleted.id, 'completed')],
      [topicResource.id, mockProgress(topicResource.id, 'resource')],
    ]);
    installMockFetch(subject, topics, progressByTopic);

    const result = await pickContinueTarget();
    check('elige el tema RESOURCE', result.ok && result.target.kind === 'topic' && result.target.topic.id === topicResource.id);
    check('entry === "resource"', result.ok && result.target.kind === 'topic' && result.target.entry === 'resource');
  }

  console.log('--- 4. Selección preservada: todo COMPLETED -> "all-completed" ---');
  {
    const topics = [mockTopic(randomUUID(), 1, subjectId), mockTopic(randomUUID(), 2, subjectId)];
    const progressByTopic = new Map(topics.map((t) => [t.id, mockProgress(t.id, 'completed')]));
    installMockFetch(subject, topics, progressByTopic);

    const result = await pickContinueTarget();
    check('kind === "all-completed"', result.ok && result.target.kind === 'all-completed');
  }

  console.log('--- 5. Sin temas raíz -> "no-content", SIN llamar progreso en absoluto (optimización preexistente intacta) ---');
  {
    const calls = installMockFetch(subject, [], new Map());
    const result = await pickContinueTarget();
    check('kind === "no-content"', result.ok && result.target.kind === 'no-content');
    check('nunca se llamó a /progress/topics (ni singular ni batch) -- 0 temas, 0 necesidad', !calls.some((c) => c.url.includes('/progress/topics')));
  }

  console.log('--- 6. Fallo del batch de progreso se propaga igual que antes (ok:false con el mensaje del servidor) ---');
  {
    const topics = [mockTopic(randomUUID(), 1, subjectId)];
    (globalThis as { fetch: typeof fetch }).fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/education/subjects')) {
        return new Response(JSON.stringify([subject]), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes(`/education/subjects/${subjectId}/topics`)) {
        return new Response(JSON.stringify(topics), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes('/progress/topics?topicIds=')) {
        return new Response(JSON.stringify({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno.' } }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
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
  console.log('Todas las verificaciones del gate de "Continuar estudiando" (batch de progreso) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
