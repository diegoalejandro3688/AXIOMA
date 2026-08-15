// Gate de EDUCATION (Bloque I, Vertical Slice M1) -- ver ADR-0012. Prueba
// contra el servidor real ya compilado y corriendo, con acceso directo a
// Postgres para fixtures y para probar los triggers de invariantes vía SQL
// puro (no solo vía API) -- mismo patrón que los gates anteriores.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3006';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { method, headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function newSession(label: string) {
  const uid = `edu-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({
    providerSubject: uid,
    email: `${uid}@example.com`,
    emailVerified: true,
  });
  const res = await fetch(base + '/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const body = (await res.json()) as { sessionId: string; accountId: string };
  return { authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': body.sessionId } };
}

/** Falla si la query NO lanza (esperábamos que el trigger la rechazara). */
async function expectRejected(pg: Client, label: string, sql: string, params: unknown[] = []) {
  try {
    await pg.query(sql, params);
    check(label, false);
  } catch (error) {
    check(label, error instanceof Error && error.message.length > 0);
  }
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const { authHeaders } = await newSession('a');

  // --- 1. Endpoints de lectura: sin sesión -> 401 ---
  console.log('--- 1. Sin sesión -> 401 en todos los endpoints de lectura ---');
  const rNoAuth = await req('GET', '/education/subjects');
  check('GET /education/subjects sin sesión -> 401', rNoAuth.status === 401);

  // --- 2. Recorrido completo con datos reales del seed ---
  console.log('--- 2. Recorrido: materias -> temas -> recurso -> preguntas ---');
  const rSubjects = await req('GET', '/education/subjects', authHeaders);
  check('GET /education/subjects -> 200', rSubjects.status === 200);
  const matematica = rSubjects.body?.find((s: { subjectKey: string }) => s.subjectKey === 'matematica');
  check('materia "matematica" sembrada presente', !!matematica);

  const rTopics = await req('GET', `/education/subjects/${matematica.id}/topics`, authHeaders);
  check('GET topics de la materia -> 200', rTopics.status === 200);
  const unidad = rTopics.body?.find((t: { code: string }) => t.code === 'M1.NUMEROS.PORCENTAJES');
  check('unidad sembrada presente y con subjectId correcto', unidad?.subjectId === matematica.id);

  const rResource = await req('GET', `/education/topics/${unidad.id}/resource`, authHeaders);
  check('GET recurso publicado -> 200', rResource.status === 200);
  check('el recurso pertenece al tema solicitado', rResource.body?.curriculumTopicId === unidad.id);
  check('contentBlocks no está vacío', Array.isArray(rResource.body?.contentBlocks) && rResource.body.contentBlocks.length > 0);
  check(
    'solo tipos de bloque permitidos (heading/paragraph/formula/image)',
    rResource.body.contentBlocks.every((b: { type: string }) =>
      ['heading', 'paragraph', 'formula', 'image'].includes(b.type),
    ),
  );
  const formulaBlocks = rResource.body.contentBlocks.filter((b: { type: string }) => b.type === 'formula');
  check('el recurso sembrado tiene al menos un bloque formula', formulaBlocks.length > 0);
  check(
    'todo bloque formula trae latex Y svg (ADR-0002/ADR-0013) -- nunca solo uno de los dos',
    formulaBlocks.every((b: { latex?: string; svg?: string }) => !!b.latex && !!b.svg),
  );
  check(
    'ningún bloque image expone objectKey -- solo url firmada (ADR-0013, punto 4)',
    rResource.body.contentBlocks
      .filter((b: { type: string }) => b.type === 'image')
      .every((b: Record<string, unknown>) => !('objectKey' in b) && typeof b.url === 'string'),
  );
  check(
    'la respuesta cruda del recurso NO contiene la cadena "objectKey"',
    !JSON.stringify(rResource.body).includes('objectKey'),
  );

  const rQuestions = await req('GET', `/education/topics/${unidad.id}/questions`, authHeaders);
  check('GET preguntas publicadas -> 200', rQuestions.status === 200);
  check('al menos 2 preguntas sembradas', rQuestions.body?.length >= 2);
  check(
    'cada pregunta tiene 4 alternativas',
    rQuestions.body.every((q: { answerOptions: unknown[] }) => q.answerOptions.length === 4),
  );

  // --- 3. isCorrect NUNCA sale hacia el cliente (ADR-0012) ---
  console.log('--- 3. AnswerOption.isCorrect ausente de toda respuesta de la API ---');
  check('la respuesta cruda de /questions NO contiene la cadena "isCorrect"', !rQuestions.raw.includes('isCorrect'));
  for (const q of rQuestions.body) {
    for (const option of q.answerOptions) {
      check(`alternativa ${option.id} no expone isCorrect`, !('isCorrect' in option));
    }
  }

  // --- 4. Tema/recurso inexistente -> 404 ---
  console.log('--- 4. Tema inexistente -> 404 ---');
  const fakeId = randomUUID();
  const rMissingTopic = await req('GET', `/education/topics/${fakeId}/resource`, authHeaders);
  check('GET recurso de tema inexistente -> 404', rMissingTopic.status === 404);

  // --- 5. Solo contenido PUBLISHED es servible (borrador nunca aparece) ---
  console.log('--- 5. Un recurso DRAFT no reemplaza al publicado en la respuesta ---');
  const resourceRow = await pg.query('SELECT learning_resource_id FROM learning_resource_version WHERE id = $1', [
    rResource.body.versionId,
  ]);
  const learningResourceId = resourceRow.rows[0].learning_resource_id;
  const draftId = randomUUID();
  await pg.query(
    `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Borrador de prueba', '[{"type":"paragraph","order":0,"text":"borrador"}]', 'DRAFT', now(), now())`,
    [draftId, learningResourceId, unidad.id],
  );
  const rResourceAfterDraft = await req('GET', `/education/topics/${unidad.id}/resource`, authHeaders);
  check('el borrador recién insertado NO se sirve', rResourceAfterDraft.body?.versionId !== draftId);
  check('sigue sirviéndose la versión publicada original', rResourceAfterDraft.body?.versionId === rResource.body.versionId);

  // --- 5b. Bloque image se resuelve a URL firmada (ADR-0013, punto 4), sobre
  // una sustitución de versión REAL (old -> new) ---
  //
  // NOTA DE TRAZABILIDAD -- evolución de cobertura, LEF Bloque VII, Incremento 1
  // (2026-08-15). Este bloque probaba antes el escenario "DOS versiones
  // PUBLISHED del mismo learning_resource conviven y el lector sirve la más
  // reciente (orderBy publishedAt desc)", montándolo así:
  //   1. INSERT de una segunda `learning_resource_version` directamente en
  //      PUBLISHED sobre el MISMO `learning_resource` sembrado;
  //   2. aserción "la versión con imagen (más reciente) pasa a ser la servida";
  //   3. teardown con `UPDATE ... SET editorial_status='DRAFT'` sobre esa fila
  //      publicada, y aserción "tras revertir, vuelve a servirse la original".
  //
  // Ese escenario quedó formalmente SUPERSEDED por DG-11
  // (LEF-BLOCK-VII-DEFINITION.md §8.6, invariante 16): el índice único parcial
  // `learning_resource_version_one_published_per_resource` vuelve
  // IRREPRESENTABLE el estado "dos PUBLISHED de la misma identidad", de modo
  // que la aserción antigua ya no describe ningún estado alcanzable del
  // sistema. Su teardown, además, es hoy una transición PUBLISHED -> DRAFT que
  // §8.4 rechaza de forma cerrada.
  //
  // La INTENCIÓN útil original -- "el sistema sirve la versión vigente
  // correcta cuando el contenido se sustituye" -- se conserva íntegra, y de
  // hecho con más fuerza, reexpresada sobre la nueva realidad contractual:
  //   (a) la sustitución se hace por el ÚNICO camino válido, en una sola
  //       transacción: DEPRECATED(old) -> PUBLISHED(new) (§8.6, orden de T7);
  //   (b) se verifica que el lector devuelve `new`;
  //   (c) se verifica que PostgreSQL RECHAZA tener dos PUBLISHED simultáneas
  //       del mismo padre -- el estado que la aserción antigua daba por
  //       posible (mismo check que
  //       scripts/verify-education-published-immutability-gate.ts demuestra en
  //       detalle para ambas familias de versión).
  //
  // Higiene entre corridas (LEF VII §8.4, invariante 3): las versiones
  // publicadas por este gate ya NO se borran ni se revierten -- no puede
  // hacerse sin debilitar la garantía. Por eso la fixture cuelga de un
  // `learning_resource` y un `curriculum_topic` PROPIOS y ÚNICOS por corrida,
  // igual que ya hacían verify-academic-summary-gate y
  // verify-advanced-profile-gate: el contenido sembrado queda intacto y las
  // filas de prueba simplemente persisten, como persiste lo que siembra
  // `prisma/seed.ts`.
  console.log('--- 5b. Sustitución old->new (DEPRECATED(old) -> PUBLISHED(new)) y bloque image: objectKey nunca sale, url firmada sí ---');
  const gateSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const isolatedTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema aislado del gate de EDUCATION', 900, $3, now(), now())`,
    [isolatedTopicId, `GATE.EDU.TOPIC.${gateSuffix}`, matematica.id],
  );
  const isolatedResourceId = randomUUID();
  await pg.query(
    `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'LESSON', 'ACTIVE', now(), now())`,
    [isolatedResourceId, `GATE.EDU.RESOURCE.${gateSuffix}`, matematica.id],
  );

  // Versión `old`: se construye en DRAFT y se publica (DRAFT -> PUBLISHED),
  // que es el único orden válido del nuevo contrato.
  const oldVersionId = randomUUID();
  await pg.query(
    `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Versión vigente (gate)', '[{"type":"paragraph","order":0,"text":"contenido vigente"}]', 'DRAFT', now(), now())`,
    [oldVersionId, isolatedResourceId, isolatedTopicId],
  );
  await pg.query(`UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [oldVersionId]);
  const rIsolatedBefore = await req('GET', `/education/topics/${isolatedTopicId}/resource`, authHeaders);
  check('el lector sirve la versión publicada inicial del recurso aislado', rIsolatedBefore.body?.versionId === oldVersionId);

  // Versión `new` (la que trae el bloque image), todavía en DRAFT.
  const imageVersionId = randomUUID();
  await pg.query(
    `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Versión con imagen (gate)',
       '[{"type":"image","order":0,"objectKey":"gate/fixture-image.png","altText":"Imagen de prueba del gate"}]',
       'DRAFT', now(), now())`,
    [imageVersionId, isolatedResourceId, isolatedTopicId],
  );

  // (c) Dos PUBLISHED simultáneas del mismo padre: irrepresentable (DG-11).
  await expectRejected(
    pg,
    'publicar una SEGUNDA versión del mismo learning_resource sin despublicar la anterior -> rechazado por PostgreSQL (DG-11, unicidad de versión publicada)',
    `UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`,
    [imageVersionId],
  );

  // (a) Sustitución por el único camino válido, en UNA transacción:
  // DEPRECATED(old) primero, PUBLISHED(new) después (§8.6).
  await pg.query('BEGIN');
  await pg.query(`UPDATE learning_resource_version SET editorial_status = 'DEPRECATED' WHERE id = $1`, [oldVersionId]);
  await pg.query(`UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [imageVersionId]);
  await pg.query('COMMIT');

  // (b) El lector devuelve `new` -- misma intención que la aserción antigua.
  const rResourceWithImage = await req('GET', `/education/topics/${isolatedTopicId}/resource`, authHeaders);
  check('tras la sustitución transaccional DEPRECATED(old) -> PUBLISHED(new), el lector sirve la versión NUEVA', rResourceWithImage.body?.versionId === imageVersionId);
  const imageBlock = rResourceWithImage.body?.contentBlocks?.[0];
  check('el bloque image de la respuesta NO tiene objectKey', imageBlock && !('objectKey' in imageBlock));
  check('el bloque image de la respuesta SÍ tiene url (string)', typeof imageBlock?.url === 'string' && imageBlock.url.length > 0);
  check('la url es una URL firmada real (contiene parámetros de firma S3)', /X-Amz-Signature|Signature=/.test(imageBlock?.url ?? ''));
  const rSeededResourceIntact = await req('GET', `/education/topics/${unidad.id}/resource`, authHeaders);
  check('el recurso SEMBRADO no fue tocado por esta prueba (sigue sirviéndose su versión publicada original)', rSeededResourceIntact.body?.versionId === rResource.body.versionId);

  // --- 6. questionType restringido a SINGLE_CHOICE a nivel de base de datos ---
  console.log('--- 6. question_type distinto de SINGLE_CHOICE es rechazado por Postgres ---');
  await expectRejected(
    pg,
    'INSERT question con question_type inválido -> rechazado (enum de un solo valor)',
    `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'NUMERIC_RESPONSE', 'ACTIVE', now(), now())`,
    [randomUUID(), `gate-invalid-type-${Date.now()}`, matematica.id],
  );

  // --- 7. Invariante 1: consistencia de materia (creación) ---
  console.log('--- 7. Invariante 1: version.curriculumTopic.subjectId debe coincidir con identity.primarySubjectId ---');
  const otraMateriaId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Lenguaje (gate)', 'Leng', 'ACTIVE', 99, now(), now())`,
    [otraMateriaId, `gate-lenguaje-${Date.now()}`],
  );
  const otroTemaId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema de otra materia', 1, $3, now(), now())`,
    [otroTemaId, `GATE.OTRA.MATERIA.${Date.now()}`, otraMateriaId],
  );

  await expectRejected(
    pg,
    'INSERT learning_resource_version con tema de OTRA materia -> rechazado por trigger',
    `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, 'Inconsistente', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [randomUUID(), learningResourceId, otroTemaId],
  );

  const questionRow = await pg.query('SELECT question_id FROM question_version WHERE id = $1', [
    rQuestions.body[0].versionId,
  ]);
  await expectRejected(
    pg,
    'INSERT question_version con tema de OTRA materia -> rechazado por trigger',
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, '[{"type":"paragraph","order":0,"text":"x"}]', '[{"type":"paragraph","order":0,"text":"x"}]', 'DRAFT', now(), now())`,
    [randomUUID(), questionRow.rows[0].question_id, otroTemaId],
  );

  // --- 8. Invariante 1: protección contra UPDATE posteriores (no solo INSERT) ---
  console.log('--- 8. UPDATE que intentan romper el invariante DESPUÉS de creados los datos ---');
  await expectRejected(
    pg,
    'UPDATE learning_resource.primary_subject_id -> rechazado (inmutable)',
    `UPDATE learning_resource SET primary_subject_id = $1 WHERE id = $2`,
    [otraMateriaId, learningResourceId],
  );
  await expectRejected(
    pg,
    'UPDATE question.primary_subject_id -> rechazado (inmutable)',
    `UPDATE question SET primary_subject_id = $1 WHERE id = $2`,
    [otraMateriaId, questionRow.rows[0].question_id],
  );
  await expectRejected(
    pg,
    'UPDATE curriculum_topic.subject_id ya fijado -> rechazado (inmutable)',
    `UPDATE curriculum_topic SET subject_id = $1 WHERE id = $2`,
    [otraMateriaId, unidad.id],
  );
  await expectRejected(
    pg,
    'UPDATE curriculum_topic.parent_id hacia un padre de OTRA materia -> rechazado',
    `UPDATE curriculum_topic SET parent_id = $1 WHERE id = $2`,
    [otroTemaId, unidad.id],
  );

  // Caso positivo: hijo consistente con el padre SÍ se acepta.
  const hijoConsistenteId = randomUUID();
  try {
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, created_at, updated_at)
       VALUES ($1, $2, 'Hijo consistente (gate)', 1, $3, $4, now(), now())`,
      [hijoConsistenteId, `GATE.HIJO.CONSISTENTE.${Date.now()}`, unidad.id, matematica.id],
    );
    check('INSERT hijo con la MISMA materia que su padre -> aceptado', true);
  } catch {
    check('INSERT hijo con la MISMA materia que su padre -> aceptado', false);
  }
  await expectRejected(
    pg,
    'INSERT hijo con materia DISTINTA a la de su padre -> rechazado',
    `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Hijo inconsistente (gate)', 2, $3, $4, now(), now())`,
    [randomUUID(), `GATE.HIJO.INCONSISTENTE.${Date.now()}`, unidad.id, otraMateriaId],
  );

  // --- 9. Rechazo de ciclos ---
  console.log('--- 9. Rechazo de ciclos en curriculum_topic ---');
  await expectRejected(
    pg,
    'INSERT con parent_id = id propio (auto-referencia) -> rechazado',
    (() => {
      const selfId = randomUUID();
      return `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, created_at, updated_at)
              VALUES ('${selfId}', 'GATE.CICLO.AUTO.${Date.now()}', 'Ciclo directo', 1, '${selfId}', '${matematica.id}', now(), now())`;
    })(),
  );

  const cicloA = randomUUID();
  const cicloB = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Ciclo A (gate)', 1, $3, now(), now())`,
    [cicloA, `GATE.CICLO.A.${Date.now()}`, matematica.id],
  );
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", parent_id, subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Ciclo B (gate)', 1, $3, $4, now(), now())`,
    [cicloB, `GATE.CICLO.B.${Date.now()}`, cicloA, matematica.id],
  );
  await expectRejected(
    pg,
    'UPDATE que crea un ciclo indirecto (A pasa a ser hijo de su propio nieto/hijo B) -> rechazado',
    `UPDATE curriculum_topic SET parent_id = $1 WHERE id = $2`,
    [cicloB, cicloA],
  );

  // --- 10. Nodos huérfanos estructuralmente imposibles tras la migración ---
  console.log('--- 10. subject_id NOT NULL impide nodos huérfanos hacia adelante ---');
  await expectRejected(
    pg,
    'INSERT curriculum_topic SIN subject_id -> rechazado (NOT NULL, sin backdoor tras la migración contract)',
    `INSERT INTO curriculum_topic (id, code, name, "order", created_at, updated_at)
     VALUES ($1, $2, 'Sin materia', 1, now(), now())`,
    [randomUUID(), `GATE.SIN.MATERIA.${Date.now()}`],
  );

  // --- 11. Reproducibilidad del backfill: 0 filas huérfanas, con y sin datos previos ---
  console.log('--- 11. Backfill reproducible: 0 filas de curriculum_topic con subject_id nulo ---');
  const orphanCount = await pg.query('SELECT count(*)::int AS n FROM curriculum_topic WHERE subject_id IS NULL');
  check('0 filas con subject_id NULL en la base actual (con datos preexistentes de Fase 0)', orphanCount.rows[0].n === 0);
  const rootsWithoutSubject = await pg.query(
    "SELECT count(*)::int AS n FROM curriculum_topic WHERE parent_id IS NULL AND subject_id IS NULL",
  );
  check('0 raíces sin materia resoluble', rootsWithoutSubject.rows[0].n === 0);
  // El caso "desde cero" (base efímera vacía) lo ejercita el propio job de CI
  // al aplicar `prisma migrate deploy` contra una base sin datos previos --
  // ver ci.yml, job db-migrations (backfill trivial, 0 filas que propagar).

  await pg.end();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de EDUCATION pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
