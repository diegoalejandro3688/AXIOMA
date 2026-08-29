// Gate de ENSAYOS-F2 -- "Textos de lectura compartidos + tablas estructuradas".
// Ver docs/adr/0024-ensayos-foundation.md.
//
// Contra el servidor de gates real + PostgreSQL de gates (`axioma_gates_dev`,
// vía `run-gate.ts`). Fixtures 100% AISLADAS (`ENSAYO.ZZTESTF2.<runId>`),
// NUNCA contenido productivo de Competencia Lectora. Limpia sus filas al final.
//
// Cubre (prompt ENSAYOS-F2 §13):
//   B. Integridad de BD  -- referencia cross-exam rechazada; passageKey y
//      displayOrder únicos por ensayo; mapeo nullable.
//   C. Inmutabilidad tras publicación -- pasaje y mapeo estructural congelados
//      cuando el ensayo está PUBLISHED (triggers), DELETE permitido.
//   D. Contrato -- un pasaje sirve a varias preguntas; aparece UNA sola vez en
//      `passages[]`; varias preguntas comparten el mismo `passageId`.
//   E. Tabla -- headers A|B|C, filas 1|2|3 / 4|5|6; roundtrip preserva estructura.
//   A. Regresión M1/M2 -- si están sembrados en la DB de gates: 0 pasajes,
//      todos los `passage_id` NULL (best-effort; la regresión dura vive en
//      verify-exam-foundation-gate + el smoke sobre axioma_dev).
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const backendDir = join(__dirname, '..');
let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed as any, raw: text };
}

function bootstrapActor(name: string, roles: string) {
  const r = spawnSync('node', ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', '1'], {
    cwd: backendDir,
    encoding: 'utf8',
  });
  const out = r.stdout ?? '';
  return { token: /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(out)?.[1] ?? '', stderr: r.stderr ?? '' };
}
const H = (t: string) => ({ 'x-admin-token': t });

async function newSession(label: string) {
  const uid = `exam-f2-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId as string },
  };
}

const TABLE_BLOCK = {
  type: 'table' as const,
  order: 1,
  headers: ['A', 'B', 'C'],
  rows: [
    ['1', '2', '3'],
    ['4', '5', '6'],
  ],
  footnote: 'Fuente: fixture sintético F2.',
};
const passageContent = (label: string) => [
  { type: 'paragraph', order: 0, text: `Texto compartido ${label} con acentos: á é í ó ú ñ ¿ ¡.` },
  TABLE_BLOCK,
];

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  console.log('--- 0. Fixtures: subject + topic aislados + question_version publicadas ---');
  const subjectRow = await pg.query(`SELECT id, subject_key FROM subject ORDER BY display_order ASC LIMIT 1`);
  let subjectId: string = subjectRow.rows[0]?.id;
  let subjectKey: string = subjectRow.rows[0]?.subject_key;
  if (!subjectId) {
    subjectId = randomUUID();
    subjectKey = `gate-ensayo-f2-${runId}`;
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
       VALUES ($1,$2,'Gate F2 Ensayos','GF2',902,'ACTIVE',now(),now())`,
      [subjectId, subjectKey],
    );
  }
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1,$2,'Tema aislado del gate F2 de Ensayos',931,$3,now(),now())`,
    [topicId, `GATE.EXAMF2.${runId}`, subjectId],
  );

  async function makePublishedQV(correctIndex: number): Promise<{ versionId: string; correctOptionId: string }> {
    const questionId = randomUUID();
    const versionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1,$2,$3,'SINGLE_CHOICE','ACTIVE',now(),now())`,
      [questionId, `GATE.EXAMF2.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'[{"type":"paragraph","order":0,"text":"Enunciado gate F2."}]','[{"type":"paragraph","order":0,"text":"Explicacion gate F2."}]','DRAFT',now(),now())`,
      [versionId, questionId, topicId],
    );
    const optionIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const optionId = randomUUID();
      optionIds.push(optionId);
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1,$2,$3,$4,$5,now())`,
        [optionId, versionId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alt ${i}` }), i, i === correctIndex],
      );
    }
    await pg.query(`UPDATE question_version SET editorial_status='PUBLISHED', published_at=now() WHERE id=$1`, [versionId]);
    return { versionId, correctOptionId: optionIds[correctIndex]! };
  }

  const qv = [await makePublishedQV(0), await makePublishedQV(1), await makePublishedQV(2), await makePublishedQV(3)];

  const author = bootstrapActor(`gate-exf2-author-${runId}`, 'AUTHOR');
  const publisher = bootstrapActor(`gate-exf2-publisher-${runId}`, 'PUBLISHER');
  check('bootstrap de actores AUTHOR/PUBLISHER', !!author.token && !!publisher.token, `${author.stderr} ${publisher.stderr}`);

  const examKeyA = `ENSAYO.ZZTESTF2A.${runId}`;
  const examKeyB = `ENSAYO.ZZTESTF2B.${runId}`;
  const trackedExamIds: string[] = [];
  const trackedAttemptIds: string[] = [];

  try {
    console.log('--- 1. Crear dos ensayos DRAFT aislados ---');
    const ca = await req('POST', '/administration/exams', H(publisher.token), { examKey: examKeyA, title: 'Ensayo F2 A', subjectKey, durationSeconds: 3600 });
    const cb = await req('POST', '/administration/exams', H(publisher.token), { examKey: examKeyB, title: 'Ensayo F2 B', subjectKey, durationSeconds: 3600 });
    const examA = ca.body?.id as string;
    const examB = cb.body?.id as string;
    trackedExamIds.push(examA, examB);
    check('dos ensayos creados', !!examA && !!examB && examA !== examB);

    console.log('--- 2. (E) resolver pasaje con TABLA -- idempotente por (examId, passageKey) ---');
    const t1a = await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T1`, displayOrder: 1, title: 'Texto 1', content: passageContent('T1'),
    });
    check('primer resolve de pasaje -> created:true', (t1a.status === 200 || t1a.status === 201) && t1a.body?.created === true);
    const passageT1 = t1a.body?.id as string;
    const t1again = await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T1`, displayOrder: 1, title: 'Texto 1', content: passageContent('T1'),
    });
    check('segundo resolve idéntico -> created:false, MISMO id', t1again.body?.created === false && t1again.body?.id === passageT1);

    const t1conflict = await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T1`, displayOrder: 1, title: 'Texto 1', content: [{ type: 'paragraph', order: 0, text: 'contenido DISTINTO' }],
    });
    check('(B) mismo passageKey con contenido en conflicto -> 409 (nunca sobrescribe)', t1conflict.status === 409);

    const t2a = await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T2`, displayOrder: 2, title: 'Texto 2', content: passageContent('T2'),
    });
    const passageT2 = t2a.body?.id as string;
    check('segundo pasaje del mismo ensayo -> created:true', t2a.body?.created === true && !!passageT2);

    console.log('--- 3. (B) unicidad de passageKey / displayOrder por ensayo ---');
    check('displayOrder de textos ya ocupado -> 409', (await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T3`, displayOrder: 2, title: 'Texto 3', content: passageContent('T3'),
    })).status === 409);
    let dupKey = false;
    try {
      await pg.query(
        `INSERT INTO exam_passage (id, exam_id, passage_key, display_order, title, content, created_at)
         VALUES ($1,$2,$3,$4,'x','[]'::jsonb,now())`,
        [randomUUID(), examA, `${examKeyA}.T1`, 77],
      );
    } catch (e) { dupKey = (e as { code?: string }).code === '23505'; }
    check('(B) INSERT SQL directo con passageKey duplicado -> rechazado (unique)', dupKey);

    console.log('--- 4. (B) una pregunta no puede referenciar un pasaje de OTRO ensayo ---');
    const crossExam = await req('POST', `/administration/exams/${examB}/questions`, H(publisher.token), {
      questionVersionId: qv[3].versionId, displayOrder: 1, passageId: passageT1,
    });
    check('link con passageId de otro ensayo (vía HTTP) -> 409', crossExam.status === 409);
    let crossTrigger = false;
    try {
      await pg.query(
        `INSERT INTO exam_question (id, exam_id, question_version_id, display_order, passage_id, created_at)
         VALUES ($1,$2,$3,1,$4,now())`,
        [randomUUID(), examB, qv[3].versionId, passageT1],
      );
    } catch (e) { crossTrigger = /pasaje .* pertenece al ensayo|no existe/i.test(String((e as Error).message)); }
    check('(B) trigger rechaza exam_question.passage_id de otro ensayo (SQL directo)', crossTrigger);

    console.log('--- 5. (D) un pasaje sirve a varias preguntas; mapeo nullable ---');
    const l1 = await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[0].versionId, displayOrder: 1, passageId: passageT1 });
    const l2 = await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[1].versionId, displayOrder: 2, passageId: passageT1 });
    const l3 = await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[2].versionId, displayOrder: 3, passageId: passageT2 });
    const l4 = await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[3].versionId, displayOrder: 4 });
    check('Q1/Q2 vinculadas al MISMO pasaje T1', l1.body?.passageId === passageT1 && l2.body?.passageId === passageT1);
    check('Q3 vinculada a T2', l3.body?.passageId === passageT2);
    check('Q4 sin pasaje -> passageId null (mapeo nullable)', l4.body?.passageId === null);
    check('re-link idéntico de Q1 con mismo passageId -> created:false', (await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[0].versionId, displayOrder: 1, passageId: passageT1 })).body?.created === false);
    check('re-link de Q1 con passageId DISTINTO -> 409 (no se reasigna en silencio)', (await req('POST', `/administration/exams/${examA}/questions`, H(publisher.token), { questionVersionId: qv[0].versionId, displayOrder: 1, passageId: passageT2 })).status === 409);

    console.log('--- 6. publicar Exam A ---');
    const pub = await req('POST', `/administration/exams/${examA}/publish`, H(publisher.token), {});
    check('publish -> PUBLISHED', pub.body?.status === 'PUBLISHED');

    console.log('--- 7. (C) inmutabilidad tras publicación ---');
    check('(C) resolver un pasaje NUEVO sobre ensayo PUBLISHED -> rechazado', (await req('POST', `/administration/exams/${examA}/passages`, H(publisher.token), {
      passageKey: `${examKeyA}.T9`, displayOrder: 9, title: 'Tarde', content: passageContent('T9'),
    })).status >= 400);
    let passageUpdateBlocked = false;
    try {
      await pg.query(`UPDATE exam_passage SET title='hackeado' WHERE id=$1`, [passageT1]);
    } catch (e) { passageUpdateBlocked = /publicad|PUBLISHED|congelad|frozen/i.test(String((e as Error).message)); }
    check('(C) UPDATE directo de exam_passage sobre ensayo PUBLISHED -> rechazado (trigger)', passageUpdateBlocked);
    let mappingUpdateBlocked = false;
    try {
      await pg.query(`UPDATE exam_question SET passage_id=$1 WHERE exam_id=$2 AND display_order=1`, [passageT2, examA]);
    } catch (e) { mappingUpdateBlocked = /publicad|PUBLISHED|congelad|frozen/i.test(String((e as Error).message)); }
    check('(C) reasignar exam_question.passage_id sobre ensayo PUBLISHED -> rechazado (trigger)', mappingUpdateBlocked);

    console.log('--- 8. (D)(E) contrato del runtime: pasaje UNA vez, passageId compartido, tabla intacta ---');
    const student = await newSession('student');
    const startA = await req('POST', `/exams/${examA}/attempts`, student.authHeaders, {});
    const attemptId = startA.body?.attemptId as string;
    trackedAttemptIds.push(attemptId);
    const qs = await req('GET', `/exams/me/attempts/${attemptId}/questions`, student.authHeaders);
    check('GET .../questions -> 200', qs.status === 200);
    const passages = qs.body?.passages ?? [];
    check('(D) `passages` contiene exactamente 2 textos (uno por passageKey), nunca repetidos', passages.length === 2);
    check('(D) los 2 textos son T1 y T2 en orden', passages[0]?.id === passageT1 && passages[1]?.id === passageT2);
    const qByOrder = (qs.body?.questions ?? []).slice().sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    check('(D) Q1 y Q2 comparten el MISMO passageId (= T1)', qByOrder[0]?.passageId === passageT1 && qByOrder[1]?.passageId === passageT1);
    check('(D) Q3.passageId = T2', qByOrder[2]?.passageId === passageT2);
    check('(D) Q4.passageId = null', qByOrder[3]?.passageId === null);
    check('(D) el texto T1 aparece UNA sola vez en `passages` aunque 2 preguntas lo referencian', passages.filter((p: any) => p.id === passageT1).length === 1);
    const t1Table = (passages[0]?.content ?? []).find((b: any) => b.type === 'table');
    check(
      '(E) la tabla del texto conserva headers A|B|C y filas 1|2|3 / 4|5|6 tras el roundtrip',
      !!t1Table &&
        JSON.stringify(t1Table.headers) === JSON.stringify(['A', 'B', 'C']) &&
        JSON.stringify(t1Table.rows) === JSON.stringify([['1', '2', '3'], ['4', '5', '6']]) &&
        t1Table.footnote === 'Fuente: fixture sintético F2.',
    );
    check('(D)(seguridad) `passages` no filtra pauta ni explicación', !qs.raw.includes('isCorrect') && !qs.raw.includes('explanationContent') && !qs.raw.includes('correctAnswerOptionId'));

    console.log('--- 9. (D) revisión expone la MISMA relación de pasajes ---');
    await req('PUT', `/exams/me/attempts/${attemptId}/answers`, student.authHeaders, { questionVersionId: qv[0].versionId, answerOptionId: qv[0].correctOptionId, operationId: randomUUID() });
    await req('POST', `/exams/me/attempts/${attemptId}/submit`, student.authHeaders, {});
    const review = await req('GET', `/exams/me/attempts/${attemptId}/review`, student.authHeaders);
    check('review -> 200', review.status === 200);
    check('review.passages contiene 2 textos, una vez cada uno', (review.body?.passages ?? []).length === 2);
    const rqByOrder = (review.body?.questions ?? []).slice().sort((a: any, b: any) => a.displayOrder - b.displayOrder);
    check('review: Q1/Q2 comparten passageId T1; Q4 null', rqByOrder[0]?.passageId === passageT1 && rqByOrder[1]?.passageId === passageT1 && rqByOrder[3]?.passageId === null);

    console.log('--- 10. (A) regresión M1/M2 (best-effort si están sembrados en la DB de gates) ---');
    const m = await pg.query(`SELECT id, exam_key FROM exam WHERE exam_key IN ('ENSAYO.M1','ENSAYO.M2')`);
    if (m.rowCount === 0) {
      check('ENSAYO.M1/M2 no sembrados en la DB de gates -- regresión dura cubierta por foundation-gate + smoke', true);
    } else {
      for (const row of m.rows) {
        const p = await pg.query(`SELECT count(*)::int n FROM exam_passage WHERE exam_id=$1`, [row.id]);
        const nullMap = await pg.query(`SELECT count(*)::int n FROM exam_question WHERE exam_id=$1 AND passage_id IS NOT NULL`, [row.id]);
        check(`${row.exam_key}: 0 pasajes`, p.rows[0].n === 0);
        check(`${row.exam_key}: 0 exam_question con passage_id no nulo`, nullMap.rows[0].n === 0);
      }
    }
  } finally {
    console.log('--- 11. Limpieza de fixtures del gate ---');
    for (const attemptId of trackedAttemptIds) {
      await pg.query(`DELETE FROM exam_attempt_answer WHERE attempt_id=$1`, [attemptId]);
      await pg.query(`DELETE FROM exam_attempt WHERE id=$1`, [attemptId]);
    }
    for (const examId of trackedExamIds) {
      await pg.query(`DELETE FROM exam_attempt_answer WHERE attempt_id IN (SELECT id FROM exam_attempt WHERE exam_id=$1)`, [examId]);
      await pg.query(`DELETE FROM exam_attempt WHERE exam_id=$1`, [examId]);
      await pg.query(`DELETE FROM exam_question WHERE exam_id=$1`, [examId]);
      await pg.query(`DELETE FROM exam_passage WHERE exam_id=$1`, [examId]);
      await pg.query(`DELETE FROM exam WHERE id=$1`, [examId]);
    }
  }

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de textos compartidos de Ensayos (ENSAYOS-F2) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
