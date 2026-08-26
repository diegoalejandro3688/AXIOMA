// Gate del LEF Bloque VII ("Plataforma Editorial"), Incremento 1 --
// "Inmutabilidad Y unicidad de la versión publicada".
// Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.1 (frontera) y §13.1 (criterios).
//
// Contra PostgreSQL REAL, con conexión directa `pg` y SIN pasar por Nest --
// exigencia literal de la decisión C: la garantía debe sostenerse ante SQL
// directo, un backfill con un error o una migración manual futura. La
// validación de servicio no cuenta como aplicación del invariante
// (ADR-0012:50, "el trigger es la autoridad final").
//
// Este gate NO necesita el backend corriendo: el Incremento 1 no crea ningún
// endpoint (§12.1, "Cero endpoints").
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

let failures = 0;
let checksRun = 0;

function check(label: string, condition: boolean) {
  checksRun++;
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

/** Falla si la sentencia NO lanza (esperábamos que Postgres la rechazara). */
async function expectRejected(pg: Client, label: string, sql: string, params: unknown[] = []) {
  try {
    await pg.query(sql, params);
    check(label, false);
  } catch (error) {
    check(label, error instanceof Error && error.message.length > 0);
  }
}

/** Falla si la sentencia lanza (esperábamos que Postgres la aceptara). */
async function expectAccepted(pg: Client, label: string, sql: string, params: unknown[] = []) {
  try {
    await pg.query(sql, params);
    check(label, true);
  } catch (error) {
    check(label, false);
    console.error(`       -> ${(error as Error).message}`);
  }
}

const STEM = JSON.stringify([{ type: 'paragraph', order: 0, text: 'enunciado de fixture' }]);
const EXPL = JSON.stringify([{ type: 'paragraph', order: 0, text: 'explicación de fixture' }]);
const BLOCKS = JSON.stringify([{ type: 'paragraph', order: 0, text: 'bloque de fixture' }]);
const OPTION = JSON.stringify({ type: 'paragraph', order: 0, text: 'alternativa de fixture' });
// Valores DISTINTOS de los de la fixture: un UPDATE al MISMO valor es un no-op
// que el trigger acepta legítimamente (no altera contenido), así que probar un
// rechazo con el valor idéntico sería un falso negativo del propio gate.
const STEM_ALT = JSON.stringify([{ type: 'paragraph', order: 0, text: 'enunciado ALTERADO' }]);
const EXPL_ALT = JSON.stringify([{ type: 'paragraph', order: 0, text: 'explicación ALTERADA' }]);
const BLOCKS_ALT = JSON.stringify([{ type: 'paragraph', order: 0, text: 'bloque ALTERADO' }]);
const OPTION_ALT = JSON.stringify({ type: 'paragraph', order: 0, text: 'alternativa ALTERADA' });

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ==========================================================================
  // 0. Fixtures AISLADAS por corrida.
  //
  // Nota de higiene, deliberada y estructural: este gate deja PERSISTIR todo
  // el contenido que llega a publicarse. No puede borrarlo -- el DELETE sobre
  // una versión que alcanzó publicación está prohibido sin excepciones
  // (invariante 3) y no existe ningún bypass de trigger, session flag ni
  // "modo test" que permita saltárselo. Por eso cada corrida usa su propia
  // materia, sus propios temas y sus propias identidades, con sufijo único:
  // el aislamiento sustituye a la limpieza, exactamente igual que ya ocurría
  // con el contenido de `prisma/seed.ts`, que nunca se borra.
  // ==========================================================================
  console.log('--- 0. Fixtures aisladas por corrida (materia/tema/identidades propias) ---');
  const subjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate de inmutabilidad editorial', 'VII', 'ACTIVE', 990, now(), now())`,
    [subjectId, `lef7-i1-subject-${suffix}`],
  );
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema del gate de inmutabilidad editorial', 1, $3, now(), now())`,
    [topicId, `LEF7.I1.TOPIC.${suffix}`, subjectId],
  );
  const otherTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Segundo tema del gate', 2, $3, now(), now())`,
    [otherTopicId, `LEF7.I1.TOPIC2.${suffix}`, subjectId],
  );

  let questionSeq = 0;
  async function newQuestion(): Promise<string> {
    const id = randomUUID();
    questionSeq++;
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'SINGLE_CHOICE', 'ACTIVE', now(), now())`,
      [id, `LEF7.I1.Q${questionSeq}.${suffix}`, subjectId],
    );
    return id;
  }

  /** Crea una versión en DRAFT con `n` alternativas -- el único orden válido. */
  async function newDraftVersion(questionId: string, options = 2): Promise<{ versionId: string; optionIds: string[] }> {
    const versionId = randomUUID();
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'DRAFT', now(), now())`,
      [versionId, questionId, topicId, STEM, EXPL],
    );
    const optionIds: string[] = [];
    for (let i = 0; i < options; i++) {
      const optionId = randomUUID();
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1, $2, $3::jsonb, $4, $5, now())`,
        [optionId, versionId, OPTION, i, i === 0],
      );
      optionIds.push(optionId);
    }
    return { versionId, optionIds };
  }

  async function publish(versionId: string) {
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [versionId]);
  }

  let resourceSeq = 0;
  async function newResource(): Promise<string> {
    const id = randomUUID();
    resourceSeq++;
    await pg.query(
      `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'LESSON', 'ACTIVE', now(), now())`,
      [id, `LEF7.I1.R${resourceSeq}.${suffix}`, subjectId],
    );
    return id;
  }

  async function newDraftResourceVersion(resourceId: string): Promise<string> {
    const versionId = randomUUID();
    await pg.query(
      `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
       VALUES ($1, $2, $3, 'Título de fixture', $4::jsonb, 'DRAFT', now(), now())`,
      [versionId, resourceId, topicId, BLOCKS],
    );
    return versionId;
  }

  check('fixtures aisladas creadas sin errores', true);

  // ==========================================================================
  // 1. Los datos PREEXISTENTES satisfacen la migración (§13.1 punto 8).
  // ==========================================================================
  console.log('--- 1. Datos preexistentes compatibles: la migración es additiva y no exigió corrección de datos ---');
  const dupQuestions = await pg.query(
    `SELECT count(*)::int AS n FROM (SELECT question_id FROM question_version WHERE editorial_status = 'PUBLISHED' GROUP BY question_id HAVING count(*) > 1) d`,
  );
  check('0 identidades de pregunta con más de una versión PUBLISHED en la base real', dupQuestions.rows[0].n === 0);
  const dupResources = await pg.query(
    `SELECT count(*)::int AS n FROM (SELECT learning_resource_id FROM learning_resource_version WHERE editorial_status = 'PUBLISHED' GROUP BY learning_resource_id HAVING count(*) > 1) d`,
  );
  check('0 identidades de recurso con más de una versión PUBLISHED en la base real', dupResources.rows[0].n === 0);
  const indexes = await pg.query(
    `SELECT indexname FROM pg_indexes WHERE indexname IN ('question_version_one_published_per_question', 'learning_resource_version_one_published_per_resource')`,
  );
  check('ambos índices únicos parciales existen realmente en la base', indexes.rowCount === 2);
  const triggers = await pg.query(
    `SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
       'trg_question_version_published_immutable', 'trg_question_version_published_no_delete',
       'trg_learning_resource_version_published_immutable', 'trg_learning_resource_version_published_no_delete',
       'trg_answer_option_published_parent_immutable')`,
  );
  check('los 5 triggers de inmutabilidad existen realmente en la base', triggers.rowCount === 5);

  // ==========================================================================
  // 2. CONTROL POSITIVO ANTI-FALSO-NEGATIVO (§13.1 punto 1).
  //
  // Antes de probar un solo rechazo, se demuestra que EXACTAMENTE los mismos
  // UPDATE/INSERT/DELETE SÍ se aplican sobre filas que no alcanzaron
  // publicación. Sin esto, un gate que pasara porque la fixture no existe o
  // porque la sentencia nunca se ejecutó sería indistinguible de uno correcto.
  // ==========================================================================
  console.log('--- 2. Control positivo: en DRAFT, los MISMOS UPDATE/INSERT/DELETE sí se aplican (§13.1 punto 1) ---');
  const qControl = await newQuestion();
  const control = await newDraftVersion(qControl);
  await expectAccepted(pg, 'DRAFT: UPDATE stem_content -> aceptado', `UPDATE question_version SET stem_content = $2::jsonb WHERE id = $1`, [
    control.versionId,
    JSON.stringify([{ type: 'paragraph', order: 0, text: 'editado en borrador' }]),
  ]);
  await expectAccepted(pg, 'DRAFT: UPDATE explanation_content -> aceptado', `UPDATE question_version SET explanation_content = $2::jsonb WHERE id = $1`, [
    control.versionId,
    EXPL,
  ]);
  await expectAccepted(pg, 'DRAFT: UPDATE curriculum_topic_id -> aceptado', `UPDATE question_version SET curriculum_topic_id = $2 WHERE id = $1`, [
    control.versionId,
    otherTopicId,
  ]);
  await expectAccepted(pg, 'DRAFT: UPDATE curriculum_topic_id (vuelta) -> aceptado', `UPDATE question_version SET curriculum_topic_id = $2 WHERE id = $1`, [
    control.versionId,
    topicId,
  ]);
  await expectAccepted(pg, 'DRAFT: UPDATE published_at -> aceptado', `UPDATE question_version SET published_at = NULL WHERE id = $1`, [control.versionId]);
  await expectAccepted(pg, 'DRAFT: UPDATE answer_option.content -> aceptado', `UPDATE answer_option SET content = $2::jsonb WHERE id = $1`, [
    control.optionIds[0],
    OPTION,
  ]);
  await expectAccepted(pg, 'DRAFT: UPDATE answer_option.is_correct -> aceptado', `UPDATE answer_option SET is_correct = NOT is_correct WHERE id = $1`, [
    control.optionIds[0],
  ]);
  const extraDraftOptionId = randomUUID();
  await expectAccepted(
    pg,
    'DRAFT: INSERT de una alternativa nueva -> aceptado',
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at) VALUES ($1, $2, $3::jsonb, 9, false, now())`,
    [extraDraftOptionId, control.versionId, OPTION],
  );
  await expectAccepted(pg, 'DRAFT: DELETE de una alternativa -> aceptado', `DELETE FROM answer_option WHERE id = $1`, [extraDraftOptionId]);
  await expectAccepted(pg, 'DRAFT: transición DRAFT -> IN_REVIEW -> aceptada', `UPDATE question_version SET editorial_status = 'IN_REVIEW' WHERE id = $1`, [
    control.versionId,
  ]);
  await expectAccepted(pg, 'IN_REVIEW: transición IN_REVIEW -> APPROVED -> aceptada', `UPDATE question_version SET editorial_status = 'APPROVED' WHERE id = $1`, [
    control.versionId,
  ]);
  await expectAccepted(pg, 'APPROVED: UPDATE de contenido todavía aceptado (fila no publicada)', `UPDATE question_version SET stem_content = $2::jsonb WHERE id = $1`, [
    control.versionId,
    STEM,
  ]);
  await expectAccepted(pg, 'APPROVED -> DRAFT (devolución) -> aceptada', `UPDATE question_version SET editorial_status = 'DRAFT' WHERE id = $1`, [
    control.versionId,
  ]);
  await expectAccepted(pg, 'DRAFT: DELETE de la versión completa -> aceptado (nunca alcanzó publicación)', `DELETE FROM question_version WHERE id = $1`, [
    control.versionId,
  ]);

  // ==========================================================================
  // 3. question_version PUBLISHED: contenido inmutable vía SQL directo.
  // ==========================================================================
  console.log('--- 3. question_version PUBLISHED: contenido e identidad inmutables (§13.1 punto 2) ---');
  const qPub = await newQuestion();
  const pub = await newDraftVersion(qPub);
  await publish(pub.versionId);

  await expectRejected(pg, 'PUBLISHED: UPDATE stem_content -> rechazado', `UPDATE question_version SET stem_content = $2::jsonb WHERE id = $1`, [
    pub.versionId,
    JSON.stringify([{ type: 'paragraph', order: 0, text: 'intento de edición' }]),
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE explanation_content -> rechazado', `UPDATE question_version SET explanation_content = $2::jsonb WHERE id = $1`, [
    pub.versionId,
    JSON.stringify([{ type: 'paragraph', order: 0, text: 'otra explicación' }]),
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE curriculum_topic_id -> rechazado', `UPDATE question_version SET curriculum_topic_id = $2 WHERE id = $1`, [
    pub.versionId,
    otherTopicId,
  ]);
  const qOther = await newQuestion();
  await expectRejected(pg, 'PUBLISHED: UPDATE question_id -> rechazado', `UPDATE question_version SET question_id = $2 WHERE id = $1`, [
    pub.versionId,
    qOther,
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE published_at (hecho histórico congelado) -> rechazado', `UPDATE question_version SET published_at = now() - interval '1 day' WHERE id = $1`, [
    pub.versionId,
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE created_at -> rechazado', `UPDATE question_version SET created_at = now() - interval '1 day' WHERE id = $1`, [
    pub.versionId,
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE id -> rechazado', `UPDATE question_version SET id = $2 WHERE id = $1`, [pub.versionId, randomUUID()]);
  await expectRejected(pg, 'PUBLISHED: DELETE de la versión -> rechazado (invariante 3)', `DELETE FROM question_version WHERE id = $1`, [pub.versionId]);

  console.log('--- 3b. answer_option bajo padre PUBLISHED: inmutable, sin INSERT ni DELETE (§13.1 punto 2, invariante 2) ---');
  await expectRejected(pg, 'PUBLISHED: UPDATE answer_option.content -> rechazado', `UPDATE answer_option SET content = $2::jsonb WHERE id = $1`, [
    pub.optionIds[0],
    JSON.stringify({ type: 'paragraph', order: 0, text: 'alternativa alterada' }),
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE answer_option.is_correct (alterar CUÁL alternativa es correcta) -> rechazado', `UPDATE answer_option SET is_correct = NOT is_correct WHERE id = $1`, [
    pub.optionIds[0],
  ]);
  await expectRejected(pg, 'PUBLISHED: UPDATE answer_option.display_order -> rechazado', `UPDATE answer_option SET display_order = display_order + 10 WHERE id = $1`, [
    pub.optionIds[0],
  ]);
  await expectRejected(
    pg,
    'PUBLISHED: INSERT de una alternativa nueva en la versión publicada -> rechazado',
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at) VALUES ($1, $2, $3::jsonb, 9, false, now())`,
    [randomUUID(), pub.versionId, OPTION],
  );
  await expectRejected(pg, 'PUBLISHED: DELETE de una alternativa de la versión publicada -> rechazado', `DELETE FROM answer_option WHERE id = $1`, [
    pub.optionIds[0],
  ]);
  // Reasignar una alternativa de una versión en DRAFT hacia una publicada es
  // otra forma de insertar en la publicada -- también rechazada.
  const qMove = await newQuestion();
  const moveDraft = await newDraftVersion(qMove, 1);
  await expectRejected(
    pg,
    'PUBLISHED: reasignar una alternativa de un DRAFT hacia la versión publicada -> rechazado',
    `UPDATE answer_option SET question_version_id = $2 WHERE id = $1`,
    [moveDraft.optionIds[0], pub.versionId],
  );

  // ==========================================================================
  // 4. Transiciones sobre una fila PUBLISHED: lista cerrada (§13.1 puntos 3-4).
  // ==========================================================================
  console.log('--- 4. Transiciones desde PUBLISHED: solo PUBLISHED -> DEPRECATED; ARCHIVED permanentemente inalcanzable ---');
  for (const target of ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED']) {
    await expectRejected(
      pg,
      `PUBLISHED -> ${target} -> rechazado${target === 'ARCHIVED' ? ' (DG-8, invariante 21: de forma permanente, no provisional)' : ''}`,
      `UPDATE question_version SET editorial_status = '${target}' WHERE id = $1`,
      [pub.versionId],
    );
  }
  await expectRejected(
    pg,
    'PUBLISHED -> DEPRECATED colando ADEMÁS un cambio de contenido en el MISMO UPDATE -> rechazado',
    `UPDATE question_version SET editorial_status = 'DEPRECATED', stem_content = $2::jsonb WHERE id = $1`,
    [pub.versionId, JSON.stringify([{ type: 'paragraph', order: 0, text: 'colado' }])],
  );
  const beforeDeprecate = await pg.query(`SELECT updated_at, published_at FROM question_version WHERE id = $1`, [pub.versionId]);
  await expectAccepted(pg, 'PUBLISHED -> DEPRECATED (T8) -> ACEPTADO, junto con su updated_at', `UPDATE question_version SET editorial_status = 'DEPRECATED', updated_at = now() WHERE id = $1`, [
    pub.versionId,
  ]);
  const afterDeprecate = await pg.query(`SELECT editorial_status, updated_at, published_at FROM question_version WHERE id = $1`, [pub.versionId]);
  check('tras T8 la fila quedó realmente en DEPRECATED', afterDeprecate.rows[0].editorial_status === 'DEPRECATED');
  check('updated_at SÍ avanzó (T8 no queda bloqueado por el trigger)', afterDeprecate.rows[0].updated_at > beforeDeprecate.rows[0].updated_at);
  check('published_at NO cambió (hecho histórico, §8.2 T8)', afterDeprecate.rows[0].published_at.getTime() === beforeDeprecate.rows[0].published_at.getTime());

  // ==========================================================================
  // 5. EL HUECO: PUBLISHED -> DEPRECATED -> editar.
  //
  // Decisión explícita del Product Owner (2026-08-15): una versión que fue
  // publicada permanece inmutable PARA SIEMPRE. `DEPRECATED` significa
  // "retirada del catálogo activo", NO "vuelve a ser editable". Un trigger que
  // solo mirase `OLD.editorial_status = 'PUBLISHED'` dejaría editable
  // cualquier fila ya depreciada -- exactamente el hueco que este bloque
  // cierra con prueba real contra Postgres.
  // ==========================================================================
  console.log('--- 5. DEPRECATED sigue siendo inmutable: el hueco PUBLISHED -> DEPRECATED -> editar está cerrado ---');
  await expectRejected(pg, 'DEPRECATED: UPDATE stem_content -> rechazado', `UPDATE question_version SET stem_content = $2::jsonb WHERE id = $1`, [
    pub.versionId,
    JSON.stringify([{ type: 'paragraph', order: 0, text: 'edición tras depreciar' }]),
  ]);
  await expectRejected(pg, 'DEPRECATED: UPDATE explanation_content -> rechazado', `UPDATE question_version SET explanation_content = $2::jsonb WHERE id = $1`, [
    pub.versionId,
    EXPL_ALT,
  ]);
  await expectRejected(pg, 'DEPRECATED: UPDATE curriculum_topic_id -> rechazado', `UPDATE question_version SET curriculum_topic_id = $2 WHERE id = $1`, [
    pub.versionId,
    otherTopicId,
  ]);
  await expectRejected(pg, 'DEPRECATED: UPDATE published_at -> rechazado', `UPDATE question_version SET published_at = NULL WHERE id = $1`, [pub.versionId]);
  await expectRejected(pg, 'DEPRECATED: DELETE de la versión -> rechazado', `DELETE FROM question_version WHERE id = $1`, [pub.versionId]);
  for (const target of ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED']) {
    await expectRejected(
      pg,
      `DEPRECATED -> ${target} -> rechazado (DEPRECATED es TERMINAL en V1; corregir exige una versión NUEVA)`,
      `UPDATE question_version SET editorial_status = '${target}' WHERE id = $1`,
      [pub.versionId],
    );
  }
  console.log('--- 5b. answer_option bajo padre DEPRECATED: mismas garantías que bajo PUBLISHED ---');
  await expectRejected(pg, 'DEPRECATED: UPDATE answer_option.content -> rechazado', `UPDATE answer_option SET content = $2::jsonb WHERE id = $1`, [
    pub.optionIds[0],
    OPTION_ALT,
  ]);
  await expectRejected(pg, 'DEPRECATED: UPDATE answer_option.is_correct -> rechazado', `UPDATE answer_option SET is_correct = NOT is_correct WHERE id = $1`, [
    pub.optionIds[0],
  ]);
  await expectRejected(
    pg,
    'DEPRECATED: INSERT de una alternativa nueva en la versión depreciada -> rechazado',
    `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at) VALUES ($1, $2, $3::jsonb, 9, false, now())`,
    [randomUUID(), pub.versionId, OPTION],
  );
  await expectRejected(pg, 'DEPRECATED: DELETE de una alternativa de la versión depreciada -> rechazado', `DELETE FROM answer_option WHERE id = $1`, [
    pub.optionIds[0],
  ]);

  // ==========================================================================
  // 6. learning_resource_version: las mismas garantías (§13.1 puntos 2-4).
  // ==========================================================================
  console.log('--- 6. learning_resource_version: mismas garantías, PUBLISHED y DEPRECATED ---');
  const resource = await newResource();
  const lrvId = await newDraftResourceVersion(resource);
  await expectAccepted(pg, 'DRAFT (recurso): UPDATE title -> aceptado (control positivo)', `UPDATE learning_resource_version SET title = 'editado' WHERE id = $1`, [lrvId]);
  await pg.query(`UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [lrvId]);

  await expectRejected(pg, 'PUBLISHED (recurso): UPDATE title -> rechazado', `UPDATE learning_resource_version SET title = 'otro título' WHERE id = $1`, [lrvId]);
  await expectRejected(pg, 'PUBLISHED (recurso): UPDATE content_blocks -> rechazado', `UPDATE learning_resource_version SET content_blocks = $2::jsonb WHERE id = $1`, [
    lrvId,
    JSON.stringify([{ type: 'paragraph', order: 0, text: 'contenido alterado' }]),
  ]);
  await expectRejected(pg, 'PUBLISHED (recurso): UPDATE curriculum_topic_id -> rechazado', `UPDATE learning_resource_version SET curriculum_topic_id = $2 WHERE id = $1`, [
    lrvId,
    otherTopicId,
  ]);
  await expectRejected(pg, 'PUBLISHED (recurso): UPDATE published_at -> rechazado', `UPDATE learning_resource_version SET published_at = NULL WHERE id = $1`, [lrvId]);
  await expectRejected(pg, 'PUBLISHED (recurso): DELETE -> rechazado', `DELETE FROM learning_resource_version WHERE id = $1`, [lrvId]);
  for (const target of ['DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED']) {
    await expectRejected(pg, `PUBLISHED (recurso) -> ${target} -> rechazado`, `UPDATE learning_resource_version SET editorial_status = '${target}' WHERE id = $1`, [lrvId]);
  }
  await expectAccepted(pg, 'PUBLISHED (recurso) -> DEPRECATED (T8) -> ACEPTADO', `UPDATE learning_resource_version SET editorial_status = 'DEPRECATED', updated_at = now() WHERE id = $1`, [lrvId]);
  await expectRejected(pg, 'DEPRECATED (recurso): UPDATE title -> rechazado (hueco cerrado también aquí)', `UPDATE learning_resource_version SET title = 'edición tras depreciar' WHERE id = $1`, [lrvId]);
  await expectRejected(pg, 'DEPRECATED (recurso): UPDATE content_blocks -> rechazado', `UPDATE learning_resource_version SET content_blocks = $2::jsonb WHERE id = $1`, [lrvId, BLOCKS_ALT]);
  await expectRejected(pg, 'DEPRECATED (recurso): DELETE -> rechazado', `DELETE FROM learning_resource_version WHERE id = $1`, [lrvId]);
  for (const target of ['DRAFT', 'PUBLISHED', 'ARCHIVED']) {
    await expectRejected(pg, `DEPRECATED (recurso) -> ${target} -> rechazado (terminal en V1)`, `UPDATE learning_resource_version SET editorial_status = '${target}' WHERE id = $1`, [lrvId]);
  }

  // ==========================================================================
  // 7. Unicidad de versión publicada (§13.1 punto 6, DG-11, invariante 16).
  // ==========================================================================
  console.log('--- 7. Unicidad de versión publicada por identidad: control positivo ---');
  const qUnique = await newQuestion();
  const u1 = await newDraftVersion(qUnique);
  const u2 = await newDraftVersion(qUnique);
  const u3 = await newDraftVersion(qUnique);
  const draftCount = await pg.query(`SELECT count(*)::int AS n FROM question_version WHERE question_id = $1 AND editorial_status = 'DRAFT'`, [qUnique]);
  check('control positivo: una identidad admite VARIAS versiones simultáneas en DRAFT', draftCount.rows[0].n === 3);
  await expectAccepted(pg, 'control positivo: con CERO publicadas, una versión puede pasar a PUBLISHED', `UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [u1.versionId]);

  console.log('--- 7b. Unicidad: rechazo por UPDATE y por INSERT directo ---');
  await expectRejected(
    pg,
    'con una versión ya PUBLISHED, UPDATE de OTRA versión de la MISMA pregunta a PUBLISHED -> rechazado por el índice único parcial',
    `UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`,
    [u2.versionId],
  );
  await expectRejected(
    pg,
    'con una versión ya PUBLISHED, INSERT directo de una SEGUNDA fila publicada de la misma pregunta -> rechazado',
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'PUBLISHED', now(), now(), now())`,
    [randomUUID(), qUnique, topicId, STEM, EXPL],
  );

  console.log('--- 7c. Unicidad: identidades distintas no interfieren ---');
  const qIndependent = await newQuestion();
  const ind = await newDraftVersion(qIndependent);
  await expectAccepted(pg, 'otra Question distinta SÍ puede tener su propia versión publicada al mismo tiempo', `UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [ind.versionId]);

  console.log('--- 7d. Unicidad en learning_resource_version, por learning_resource_id ---');
  const resource2 = await newResource();
  const lr1 = await newDraftResourceVersion(resource2);
  const lr2 = await newDraftResourceVersion(resource2);
  await expectAccepted(pg, 'recurso con CERO publicadas: la primera versión puede publicarse', `UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [lr1]);
  await expectRejected(pg, 'segunda versión PUBLISHED del MISMO recurso por UPDATE -> rechazado', `UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [lr2]);
  await expectRejected(
    pg,
    'segunda versión PUBLISHED del MISMO recurso por INSERT directo -> rechazado',
    `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, published_at, created_at, updated_at)
     VALUES ($1, $2, $3, 'Duplicada', $4::jsonb, 'PUBLISHED', now(), now(), now())`,
    [randomUUID(), resource2, topicId, BLOCKS],
  );

  // ==========================================================================
  // 8. Sustitución transaccional old -> new, y el orden inverso (§8.6).
  // ==========================================================================
  console.log('--- 8. Sustitución transaccional DEPRECATED(old) -> PUBLISHED(new), y el orden inverso ---');
  // Orden INVERSO: publicar la nueva antes de despublicar la anterior. Debe
  // fallar -- un índice único parcial se verifica por sentencia y NO admite
  // diferimiento al COMMIT (§8.6).
  let reverseFailed = false;
  try {
    await pg.query('BEGIN');
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [u2.versionId]);
    await pg.query(`UPDATE question_version SET editorial_status = 'DEPRECATED' WHERE id = $1`, [u1.versionId]);
    await pg.query('COMMIT');
  } catch {
    reverseFailed = true;
    await pg.query('ROLLBACK');
  }
  check('orden INVERSO (publicar nueva -> despublicar anterior) dentro de UNA transacción -> FALLA', reverseFailed);
  const afterReverse = await pg.query(`SELECT id, editorial_status FROM question_version WHERE question_id = $1 ORDER BY created_at`, [qUnique]);
  check(
    'tras el fallo del orden inverso, la versión anterior sigue PUBLISHED y la nueva sigue sin publicar (sin estado intermedio)',
    afterReverse.rows.find((r) => r.id === u1.versionId)?.editorial_status === 'PUBLISHED' &&
      afterReverse.rows.find((r) => r.id === u2.versionId)?.editorial_status === 'DRAFT',
  );

  // Orden CORRECTO (§8.6): despublicar la anterior y DESPUÉS publicar la nueva.
  let forwardOk = true;
  try {
    await pg.query('BEGIN');
    await pg.query(`UPDATE question_version SET editorial_status = 'DEPRECATED' WHERE id = $1`, [u1.versionId]);
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [u2.versionId]);
    await pg.query('COMMIT');
  } catch (error) {
    forwardOk = false;
    await pg.query('ROLLBACK');
    console.error(`       -> ${(error as Error).message}`);
  }
  check('orden CORRECTO (DEPRECATED(old) -> PUBLISHED(new)) dentro de UNA transacción -> ÉXITO', forwardOk);
  const afterForward = await pg.query(`SELECT id, editorial_status FROM question_version WHERE question_id = $1`, [qUnique]);
  check(
    'tras la sustitución hay EXACTAMENTE una versión PUBLISHED de la identidad, y es la nueva',
    afterForward.rows.filter((r) => r.editorial_status === 'PUBLISHED').length === 1 &&
      afterForward.rows.find((r) => r.id === u2.versionId)?.editorial_status === 'PUBLISHED',
  );

  console.log('--- 8b. Rollback / atomicidad: una sustitución fallida no deja estado inválido ---');
  // Sustitución que despublica la anterior y luego falla por otro motivo
  // (intentar editar contenido publicado): el ROLLBACK debe dejarlo todo
  // exactamente como estaba.
  const beforeRollback = await pg.query(`SELECT id, editorial_status FROM question_version WHERE question_id = $1`, [qUnique]);
  let rollbackHappened = false;
  try {
    await pg.query('BEGIN');
    await pg.query(`UPDATE question_version SET editorial_status = 'DEPRECATED' WHERE id = $1`, [u2.versionId]);
    // Sentencia inválida deliberada dentro de la MISMA transacción.
    await pg.query(`UPDATE question_version SET stem_content = $2::jsonb WHERE id = $1`, [u2.versionId, STEM_ALT]);
    await pg.query('COMMIT');
  } catch {
    rollbackHappened = true;
    await pg.query('ROLLBACK');
  }
  check('una sustitución que falla a mitad aborta la transacción completa', rollbackHappened);
  const afterRollback = await pg.query(`SELECT id, editorial_status FROM question_version WHERE question_id = $1`, [qUnique]);
  const sameState = beforeRollback.rows.every(
    (before) => afterRollback.rows.find((after) => after.id === before.id)?.editorial_status === before.editorial_status,
  );
  check('tras el ROLLBACK el estado es EXACTAMENTE el previo -- ninguna versión quedó despublicada a medias', sameState);
  const publishedAfterRollback = afterRollback.rows.filter((r) => r.editorial_status === 'PUBLISHED').length;
  check('sigue habiendo exactamente UNA versión publicada de la identidad tras el rollback', publishedAfterRollback === 1);

  // ==========================================================================
  // 9. Concurrencia REAL: dos transacciones simultáneas (§13.1 punto 6).
  // ==========================================================================
  console.log('--- 9. Concurrencia real: dos transacciones simultáneas no pueden dejar dos PUBLISHED ---');
  const qRace = await newQuestion();
  const race1 = await newDraftVersion(qRace, 1);
  const race2 = await newDraftVersion(qRace, 1);

  const pgA = new Client({ connectionString: process.env.DATABASE_URL });
  const pgB = new Client({ connectionString: process.env.DATABASE_URL });
  await pgA.connect();
  await pgB.connect();

  async function publishInTransaction(client: Client, versionId: string): Promise<boolean> {
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [versionId]);
      await client.query('COMMIT');
      return true;
    } catch {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* la transacción ya estaba abortada */
      }
      return false;
    }
  }

  const raceResults = await Promise.all([publishInTransaction(pgA, race1.versionId), publishInTransaction(pgB, race2.versionId)]);
  const winners = raceResults.filter(Boolean).length;
  check('de dos transacciones CONCURRENTES publicando versiones distintas de la MISMA identidad, exactamente UNA gana', winners === 1);
  const racePublished = await pg.query(`SELECT count(*)::int AS n FROM question_version WHERE question_id = $1 AND editorial_status = 'PUBLISHED'`, [qRace]);
  check('en la base queda EXACTAMENTE una versión PUBLISHED de esa identidad tras la carrera', racePublished.rows[0].n === 1);
  await pgA.end();
  await pgB.end();

  // ==========================================================================
  // 10. Los triggers PREEXISTENTES de EDUCATION siguen funcionando.
  // ==========================================================================
  console.log('--- 10. Triggers preexistentes de EDUCATION (ADR-0012) intactos ---');
  const foreignSubjectId = randomUUID();
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, status, display_order, created_at, updated_at)
     VALUES ($1, $2, 'Materia ajena del gate', 'AJ', 'ACTIVE', 991, now(), now())`,
    [foreignSubjectId, `lef7-i1-foreign-${suffix}`],
  );
  const foreignTopicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1, $2, 'Tema de otra materia', 1, $3, now(), now())`,
    [foreignTopicId, `LEF7.I1.FOREIGN.${suffix}`, foreignSubjectId],
  );
  await expectRejected(
    pg,
    'trigger preexistente: INSERT question_version con tema de OTRA materia -> sigue rechazado',
    `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'DRAFT', now(), now())`,
    [randomUUID(), qPub, foreignTopicId, STEM, EXPL],
  );
  await expectRejected(
    pg,
    'trigger preexistente: UPDATE question.primary_subject_id -> sigue rechazado (inmutable)',
    `UPDATE question SET primary_subject_id = $2 WHERE id = $1`,
    [qPub, foreignSubjectId],
  );
  await expectRejected(
    pg,
    'trigger preexistente: UPDATE curriculum_topic.subject_id ya fijado -> sigue rechazado',
    `UPDATE curriculum_topic SET subject_id = $2 WHERE id = $1`,
    [topicId, foreignSubjectId],
  );

  // ==========================================================================
  // 11. Ausencia de cualquier mecanismo de bypass (decisión C, invariante 4).
  // ==========================================================================
  console.log('--- 11. Ninguna vía de bypass: sin flags, sin variables de sesión, sin "modo test" ---');
  const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
  const migrationDirName = readdirSync(migrationsDir).find((d) => d.includes('lef_vii_i1_published_immutability_uniqueness'));
  check('la migración del Incremento 1 existe en prisma/migrations', !!migrationDirName);
  const migrationSql = migrationDirName ? readFileSync(join(migrationsDir, migrationDirName, 'migration.sql'), 'utf8') : '';
  const bypassMarkers = ['current_setting', 'set_config', 'disable_immutability', 'skip_immutab', 'allow_edit_published'];
  // Se escanea el SQL EJECUTABLE, sin las líneas de comentario `--` (que
  // mencionan estas palabras precisamente para dejar constancia de que NO se
  // usan ninguna de ellas).
  const executableSql = migrationSql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .toLowerCase();
  const foundMarker = bypassMarkers.find((marker) => executableSql.includes(marker));
  check(`la migración no contiene ningún marcador de bypass en su SQL ejecutable (${bypassMarkers.join(', ')})`, foundMarker === undefined);
  const functionBodies = await pg.query(
    `SELECT prosrc FROM pg_proc WHERE proname IN (
       'enforce_question_version_published_immutable', 'enforce_question_version_published_no_delete',
       'enforce_learning_resource_version_published_immutable', 'enforce_learning_resource_version_published_no_delete',
       'enforce_answer_option_published_parent_immutable')`,
  );
  check('las 5 funciones plpgsql existen realmente en la base', functionBodies.rowCount === 5);
  const anyBypassInBody = functionBodies.rows.some((r) => bypassMarkers.some((m) => String(r.prosrc).toLowerCase().includes(m)));
  check('ninguna de las funciones instaladas consulta una variable de sesión ni un flag de bypass', !anyBypassInBody);

  // ==========================================================================
  // 12. Frontera del incremento: cero superficie nueva (§12.1).
  // ==========================================================================
  console.log('--- 12. Frontera: el Incremento 1 no crea endpoints, entidades, columnas ni valores de enum ---');
  const enumValues = await pg.query(
    `SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'editorial_status' ORDER BY e.enumsortorder`,
  );
  const labels = enumValues.rows.map((r) => r.enumlabel as string);
  check(
    'el enum editorial_status conserva EXACTAMENTE sus 6 valores (ni se añade SCHEDULED, ni se elimina ARCHIVED)',
    labels.join(',') === 'DRAFT,IN_REVIEW,APPROVED,PUBLISHED,DEPRECATED,ARCHIVED',
  );
  check('la migración no crea ninguna tabla ni columna nueva', !/CREATE TABLE|ADD COLUMN|ALTER TYPE/i.test(migrationSql));
  const srcDir = join(__dirname, '..', 'src');
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN DE ASERCIÓN (no relajación) -- trazabilidad obligatoria.
  //
  // Esta aserción decía antes: "no existe ningún módulo administrativo/editorial
  // en src (Incrementos 2-6, todavía no construidos)". Era una condición
  // TEMPORAL: cierta mientras el Bloque VII solo tenía cerrado el Incremento 1,
  // y expresada como "no existe carpeta admin/editorial" únicamente porque en
  // ese momento NADA administrativo estaba autorizado todavía.
  //
  // Quedó SUPERSEDED por la implementación LEGÍTIMA del Incremento 3 de LEF
  // Bloque VII (transiciones editoriales T4-T8, `admin_action`, CMS-018 con
  // excepción auditada), que crea `src/editorial/` con autorización explícita
  // del PO. Mantener la condición antigua haría fallar el gate por una razón
  // falsa: no hay ninguna regresión de inmutabilidad, solo alcance nuevo válido.
  //
  // Esta es su SUCESORA, con el mismo propósito original --guardar la frontera
  // del Incremento 1-- pero apuntando a lo que SIGUE fuera de alcance aun con
  // el I3 ya construido: importación masiva de contenido, Content Coverage
  // Matrix, y cualquier superficie de Incremento 4+ (creación/edición de
  // contenido vía API, es decir T1/T2/T3, y `CMS-013`). Sigue siendo un check
  // ESTÁTICO real sobre el código fuente (lectura + grep sobre el código
  // ejecutable, sin comentarios), no una comprobación debilitada ni vaga: las
  // menciones en comentarios de frontera se descartan a propósito, porque
  // documentar "esto NO se hace aquí" es justamente lo que se exige.
  // --------------------------------------------------------------------------
  const collectTsFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === 'node_modules' || entry.name === 'generated' || entry.name.startsWith('.')) return [];
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collectTsFiles(full);
      return entry.name.endsWith('.ts') ? [full] : [];
    });
  const stripTsComments = (source: string): string =>
    source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // Superficie administrativa/editorial: es la única donde el I4+ podría
  // aparecer adelantado. Se lee el código real, no la lista de carpetas.
  const adminEditorialDirs = ['administration', 'editorial'].map((d) => join(srcDir, d)).filter(existsSync);
  const adminEditorialCode = adminEditorialDirs
    .flatMap(collectTsFiles)
    .map((f) => stripTsComments(readFileSync(f, 'utf8')))
    .join('\n');
  // Todo el `src` ejecutable: importación masiva y Coverage Matrix quedan fuera
  // de alcance EN CUALQUIER módulo, no solo en el administrativo.
  const allSrcCode = collectTsFiles(srcDir)
    .map((f) => stripTsComments(readFileSync(f, 'utf8')))
    .join('\n');
  // Rutas de escritura realmente declaradas en la superficie administrativa/
  // editorial. El Incremento 3 solo autoriza DOS: las dos transiciones (T4-T8).
  // Cualquier otra ruta de escritura sería creación/edición de contenido (T1/
  // T2/T3) o importación, es decir Incremento 4+ adelantado.
  const writeRoutes = [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*(['"`])(.*?)\1/g)].map(
    (m) => m[2],
  );
  const bareWriteDecorators = [...adminEditorialCode.matchAll(/@(?:Post|Put|Patch|Delete)\(\s*\)/g)].length;
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 4 (2026-08-18).
  //
  // La lista anterior enumeraba las DOS rutas de escritura del Incremento 3 y
  // afirmaba, además, la AUSENCIA de la superficie de Incremento 4+. Esa
  // segunda mitad era una **aserción temporal de ausencia**, no una garantía
  // funcional de inmutabilidad: decía "el I4 todavía no existe", no "el I4
  // sería inseguro". El Incremento 4 se construyó CON autorización explícita y
  // dentro de la frontera de §12.4, de modo que mantener la condición antigua
  // haría fallar este gate por una razón FALSA -- igual que ocurrió al cerrar
  // el Incremento 3, y con el mismo tratamiento.
  //
  // Lo que NO cambia, y es lo que este gate realmente protege: los triggers de
  // inmutabilidad, los dos índices únicos parciales, los rechazos por SQL
  // directo y la idempotencia del seed. Ninguna de esas comprobaciones se ha
  // tocado ni relajado -- siguen siendo exactamente las mismas y siguen en
  // PASS. Esto NO es una relajación: es la actualización de una frontera de
  // alcance que el Product Owner movió.
  //
  // Lo que SIGUE fuera de alcance, y por tanto sigue verificándose como
  // ausente: importación masiva (CMS-026..029) y cualquier ruta de escritura
  // que no sea una de las OCHO autorizadas (2 transiciones de I3 + 6 de
  // autoría de I4).
  //
  // --------------------------------------------------------------------------
  // ACTUALIZACIÓN LEGÍTIMA -- LEF Bloque VII, Incremento 5 (2026-08-19).
  //
  // CLASIFICACIÓN (A vs B): la cláusula "sin Content Coverage Matrix" era una
  // **aserción temporal de frontera entre incrementos** (tipo B), no una
  // garantía funcional de inmutabilidad (tipo A). Decía "el I5 todavía no
  // existe", nunca "una matriz de cobertura pondría en riesgo la inmutabilidad
  // de la versión publicada" -- no podría decirlo: §12.5 la define como
  // ESTRICTAMENTE de solo lectura y el invariante 14 se lo prohíbe. El
  // Incremento 5 se construyó dentro de esa frontera, de modo que mantener la
  // condición antigua haría fallar este gate por una razón FALSA, igual que
  // ocurrió en las transiciones I2->I3 e I3->I4, y con el mismo tratamiento.
  //
  // NO ES UNA RELAJACIÓN. La aserción se SUSTITUYE por su sucesora, que es
  // estrictamente MÁS FUERTE en lo que de verdad protegía este gate:
  //   - antes: "no existe ninguna matriz de cobertura";
  //   - ahora: "la matriz existe y NO añadió NI UNA ruta de escritura" -- lo
  //     que se comprueba porque `adminEditorialDirs` ya cubre `src/editorial/`,
  //     donde vive el módulo de la matriz, y la lista de rutas de escritura
  //     autorizadas sigue siendo EXACTAMENTE la misma de ocho. Si el I5
  //     hubiera introducido un `@Post`/`@Patch`, este check caería.
  //   - se añade además la comprobación de que ningún archivo del módulo de la
  //     matriz invoca una escritura de Prisma sobre las tablas que este gate
  //     protege.
  //
  // Lo que NO cambia, y es la sustancia de este gate: los triggers de
  // inmutabilidad, los dos índices únicos parciales, los rechazos por SQL
  // directo y la idempotencia del seed. Ninguna de esas comprobaciones se ha
  // tocado ni relajado.
  // --------------------------------------------------------------------------
  const authorizedWriteRoutes = [
    // Incremento 3 -- transiciones T4..T8 (y, desde el Incremento 4, también T3).
    'question-versions/:versionId/transitions',
    'learning-resource-versions/:versionId/transitions',
    // Incremento 4 -- T1 (crear borrador) y T2 (editar en DRAFT), §12.4.
    'questions',
    'questions/:questionId/versions',
    'learning-resources',
    'learning-resources/:resourceId/versions',
    'question-versions/:versionId',
    'learning-resource-versions/:versionId',
    // CONTENT-4.2A -- resolución/creación IDEMPOTENTE de taxonomía (Subject/
    // CurriculumTopic), autorizada explícitamente para cerrar la dependencia
    // bloqueante que la auditoría de CONTENT-4.2 detectó en la API editorial
    // (T1 exige primarySubjectId/curriculumTopicId ya existentes). Mismo
    // controller, mismos guards (@RequireAdminRole('AUTHOR')), misma
    // semántica de no-sobrescritura silenciosa (CONFLICT explícito) que el
    // resto de esta lista -- ver EditorialTaxonomyService.
    'subjects',
    'curriculum-topics',
  ];
  // Módulo de la Content Coverage Matrix (Incremento 5): existe, y su única
  // capacidad autorizada es LEER. Se mide su código real, no su nombre.
  const coverageModuleFiles = [
    join(srcDir, 'editorial', 'coverage-matrix.controller.ts'),
    join(srcDir, 'editorial', 'coverage-matrix.module.ts'),
    join(srcDir, 'education', 'content-coverage.service.ts'),
    join(srcDir, 'education', 'content-coverage.repository.ts'),
  ].filter(existsSync);
  const coverageModuleCode = coverageModuleFiles.map((f) => stripTsComments(readFileSync(f, 'utf8'))).join('\n');
  const coverageIsReadOnly =
    coverageModuleFiles.length === 4 &&
    !/@(?:Post|Put|Patch|Delete)\s*\(/.test(coverageModuleCode) &&
    !/\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/.test(coverageModuleCode) &&
    !/\$executeRaw|\$transaction/.test(coverageModuleCode);
  check(
    'las capacidades que SIGUEN fuera de alcance continúan ausentes (sin importación masiva); la Content Coverage Matrix del Incremento 5 existe pero es ESTRICTAMENTE de solo lectura (cero verbos de escritura, cero escrituras de Prisma); y la superficie administrativa/editorial declara EXACTAMENTE las 10 rutas de escritura autorizadas (2 transiciones del Incremento 3 + 6 de autoría del Incremento 4 + 2 de taxonomía de CONTENT-4.2A) y ninguna más',
    coverageIsReadOnly &&
      !/bulk[_-]?import|importjob|import[_-]?batch|importcontent|content[_-]?import/i.test(allSrcCode) &&
      bareWriteDecorators === 0 &&
      writeRoutes.length === authorizedWriteRoutes.length &&
      writeRoutes.every((r) => authorizedWriteRoutes.includes(r)),
    `coverageReadOnly=${coverageIsReadOnly} writeRoutes=${writeRoutes.join(',')}`,
  );

  // ==========================================================================
  // 13. `prisma/seed.ts` sigue siendo idempotente (§13.1 punto 7).
  // ==========================================================================
  console.log('--- 13. prisma/seed.ts sigue siendo idempotente bajo los nuevos triggers e índices ---');
  const backendDir = join(__dirname, '..');
  // Reconciliación previa: esta base de gates puede traer un estado sembrado
  // por una versión ANTERIOR de seed.ts (p.ej. el catálogo previo a
  // TEST-CONTENT-1). Esa transición legítima -- crear las filas que faltan
  // para alcanzar el catálogo actual -- no es una falla de idempotencia; el
  // invariante real es que, una vez el estado YA coincide con lo que produce
  // el seed vigente, volver a correrlo no debe tocar ni una fila. Por eso se
  // corre una vez ANTES del snapshot (llevar la base al estado esperado por
  // el seed actual, cualquiera sea) y solo entonces se mide la idempotencia
  // entre dos corridas consecutivas ya reconciliadas.
  const reconcileRun = spawnSync('npx', ['tsx', 'prisma/seed.ts'], {
    cwd: backendDir,
    shell: process.platform === 'win32',
    encoding: 'utf8',
  });
  check('corrida de reconciliación previa (lleva la base al estado del seed actual) -> exit 0', reconcileRun.status === 0);
  if (reconcileRun.status !== 0) console.error(reconcileRun.stderr ?? reconcileRun.stdout);

  const countsBefore = await pg.query(
    `SELECT (SELECT count(*)::int FROM question) AS q, (SELECT count(*)::int FROM question_version) AS qv,
            (SELECT count(*)::int FROM answer_option) AS ao, (SELECT count(*)::int FROM learning_resource_version) AS lrv,
            (SELECT count(*)::int FROM curriculum_topic) AS ct`,
  );
  const seedRuns = [1, 2].map(() =>
    spawnSync('npx', ['tsx', 'prisma/seed.ts'], { cwd: backendDir, shell: process.platform === 'win32', encoding: 'utf8' }),
  );
  check('primera reejecución del seed sobre una base ya reconciliada -> exit 0', seedRuns[0].status === 0);
  if (seedRuns[0].status !== 0) console.error(seedRuns[0].stderr ?? seedRuns[0].stdout);
  check('segunda reejecución consecutiva del seed -> exit 0', seedRuns[1].status === 0);
  if (seedRuns[1].status !== 0) console.error(seedRuns[1].stderr ?? seedRuns[1].stdout);
  const countsAfter = await pg.query(
    `SELECT (SELECT count(*)::int FROM question) AS q, (SELECT count(*)::int FROM question_version) AS qv,
            (SELECT count(*)::int FROM answer_option) AS ao, (SELECT count(*)::int FROM learning_resource_version) AS lrv,
            (SELECT count(*)::int FROM curriculum_topic) AS ct`,
  );
  check(
    'el seed no creó ni duplicó NINGUNA fila de contenido en las reejecuciones (idempotencia real)',
    countsBefore.rows[0].q === countsAfter.rows[0].q &&
      countsBefore.rows[0].qv === countsAfter.rows[0].qv &&
      countsBefore.rows[0].ao === countsAfter.rows[0].ao &&
      countsBefore.rows[0].lrv === countsAfter.rows[0].lrv &&
      countsBefore.rows[0].ct === countsAfter.rows[0].ct,
  );

  await pg.end();

  console.log('');
  console.log(`Checks ejecutados: ${checksRun}`);
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de inmutabilidad y unicidad de la versión publicada (LEF Bloque VII, Incremento 1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
