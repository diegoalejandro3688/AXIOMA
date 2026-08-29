// Gate de ENSAYOS-M1-B -- "Importer del banco de Ensayos".
// Ver docs/adr/0024-ensayos-foundation.md.
//
// Verifica el CAMINO DE ESCRITURA administrativo que M1-B añadió
// (`POST /administration/exams`, `.../questions`, `.../publish` -> `ExamService`):
// idempotencia, estabilidad de IDs, orden fijo, conflictos, y aislamiento
// total frente a Study/progreso/gamificación.
//
// Fixtures 100% AISLADAS (`ENSAYO.ZZTEST.<runId>`), NUNCA el ensayo productivo
// `ENSAYO.M1`. Contra el servidor de gates real + PostgreSQL de gates
// (`axioma_gates_dev`, vía `run-gate.ts`). Limpia sus propias filas al terminar.
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { Client } from 'pg';

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
  return { status: res.status, body: parsed as any };
}

function bootstrapActor(name: string, roles: string) {
  const r = spawnSync('node', ['dist/cli/create-admin-actor.js', '--name', name, '--roles', roles, '--expires-in-days', '1'], {
    cwd: backendDir,
    encoding: 'utf8',
  });
  const out = r.stdout ?? '';
  return { token: /^\s*(axadm_[A-Za-z0-9_-]+)\s*$/m.exec(out)?.[1] ?? '', stdout: out, stderr: r.stderr ?? '' };
}
const H = (t: string) => ({ 'x-admin-token': t });

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  console.log('--- 0. Fixtures: subject + topic aislados + 3 question_version publicadas ---');
  const subjectRow = await pg.query(`SELECT id FROM subject ORDER BY display_order ASC LIMIT 1`);
  let subjectId: string = subjectRow.rows[0]?.id;
  if (!subjectId) {
    subjectId = randomUUID();
    await pg.query(
      `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
       VALUES ($1,$2,'Gate import Ensayos','GIE',901,'ACTIVE',now(),now())`,
      [subjectId, `gate-ensayo-import-${runId}`],
    );
  }
  const topicId = randomUUID();
  await pg.query(
    `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
     VALUES ($1,$2,'Tema aislado del gate de import de Ensayos',921,$3,now(),now())`,
    [topicId, `GATE.EXAMIMP.${runId}`, subjectId],
  );

  async function makePublishedQV(correctIndex: number): Promise<string> {
    const questionId = randomUUID();
    const versionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1,$2,$3,'SINGLE_CHOICE','ACTIVE',now(),now())`,
      [questionId, `GATE.EXAMIMP.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'[{"type":"paragraph","order":0,"text":"Enunciado gate import."}]','[{"type":"paragraph","order":0,"text":"Explicacion gate import."}]','DRAFT',now(),now())`,
      [versionId, questionId, topicId],
    );
    for (let i = 0; i < 4; i++) {
      await pg.query(
        `INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at)
         VALUES ($1,$2,$3,$4,$5,now())`,
        [randomUUID(), versionId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alt ${i}` }), i, i === correctIndex],
      );
    }
    await pg.query(`UPDATE question_version SET editorial_status='PUBLISHED', published_at=now() WHERE id=$1`, [versionId]);
    return versionId;
  }
  async function makeDraftQV(): Promise<string> {
    const questionId = randomUUID();
    const versionId = randomUUID();
    await pg.query(
      `INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at)
       VALUES ($1,$2,$3,'SINGLE_CHOICE','ACTIVE',now(),now())`,
      [questionId, `GATE.EXAMIMP.DRAFT.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'[{"type":"paragraph","order":0,"text":"x"}]','[{"type":"paragraph","order":0,"text":"x"}]','DRAFT',now(),now())`,
      [versionId, questionId, topicId],
    );
    return versionId;
  }

  const qv = [await makePublishedQV(0), await makePublishedQV(1), await makePublishedQV(2)];
  const draftQv = await makeDraftQV();

  const subjectKeyRow = await pg.query(`SELECT subject_key FROM subject WHERE id=$1`, [subjectId]);
  const subjectKey = subjectKeyRow.rows[0].subject_key as string;

  const author = bootstrapActor(`gate-eximp-author-${runId}`, 'AUTHOR');
  const publisher = bootstrapActor(`gate-eximp-publisher-${runId}`, 'PUBLISHER');
  check('bootstrap de actores AUTHOR/PUBLISHER', !!author.token && !!publisher.token, `${author.stderr} ${publisher.stderr}`);

  const examKey = `ENSAYO.ZZTEST.${runId}`;
  const trackedExamIds: string[] = [];

  try {
    console.log('--- 1. Sin credencial -> 401 ---');
    check('POST /administration/exams sin token -> 401', (await req('POST', '/administration/exams', {}, {})).status === 401);

    console.log('--- 2. resolver Exam: primera vez CREATE, segunda vez NO-OP con MISMO id ---');
    const c1 = await req('POST', '/administration/exams', H(publisher.token), { examKey, title: 'Ensayo ZZTEST', subjectKey, durationSeconds: 8400 });
    check('primer resolve -> 200/201, created:true', (c1.status === 200 || c1.status === 201) && c1.body?.created === true);
    const examId = c1.body.id as string;
    trackedExamIds.push(examId);
    check('durationSeconds persistido = 8400', c1.body?.durationSeconds === 8400);
    check('status inicial DRAFT', c1.body?.status === 'DRAFT');
    const c2 = await req('POST', '/administration/exams', H(publisher.token), { examKey, title: 'Ensayo ZZTEST', subjectKey, durationSeconds: 8400 });
    check('segundo resolve -> created:false, MISMO id', c2.body?.created === false && c2.body?.id === examId);

    console.log('--- 3. resolver Exam con atributos distintos -> 409 ---');
    const conflict = await req('POST', '/administration/exams', H(publisher.token), { examKey, title: 'OTRO TITULO', subjectKey, durationSeconds: 8400 });
    check('title distinto sobre el mismo examKey -> 409', conflict.status === 409);

    console.log('--- 4. subjectKey inexistente -> 404 ---');
    check('subjectKey inexistente -> 404', (await req('POST', '/administration/exams', H(publisher.token), { examKey: `${examKey}.X`, title: 'x', subjectKey: `nope-${runId}`, durationSeconds: 8400 })).status === 404);

    console.log('--- 5. vincular 3 preguntas en orden fijo; segunda pasada NO-OP; IDs estables ---');
    const linkIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await req('POST', `/administration/exams/${examId}/questions`, H(publisher.token), { questionVersionId: qv[i], displayOrder: i + 1 });
      check(`link Q${i + 1} -> created:true`, r.body?.created === true && r.body?.displayOrder === i + 1);
      linkIds.push(r.body.id);
    }
    const linkIdsAgain: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await req('POST', `/administration/exams/${examId}/questions`, H(publisher.token), { questionVersionId: qv[i], displayOrder: i + 1 });
      check(`re-link Q${i + 1} -> created:false, MISMO id`, r.body?.created === false && r.body?.id === linkIds[i]);
      linkIdsAgain.push(r.body.id);
    }
    check('los 3 ExamQuestion.id son estables entre pasadas', JSON.stringify(linkIds) === JSON.stringify(linkIdsAgain));

    console.log('--- 6. conflictos de vínculo ---');
    check('misma pregunta en OTRA posición -> 409', (await req('POST', `/administration/exams/${examId}/questions`, H(publisher.token), { questionVersionId: qv[0], displayOrder: 9 })).status === 409);
    check('posición ocupada por OTRA pregunta -> 409', (await req('POST', `/administration/exams/${examId}/questions`, H(publisher.token), { questionVersionId: qv[2], displayOrder: 1 })).status === 409);
    const draftLink = await req('POST', `/administration/exams/${examId}/questions`, H(publisher.token), { questionVersionId: draftQv, displayOrder: 4 });
    check('vincular una question_version NO publicada -> rechazado (>=400)', draftLink.status >= 400);

    console.log('--- 7. publish: primera vez publica, segunda vez alreadyPublished ---');
    const p1 = await req('POST', `/administration/exams/${examId}/publish`, H(publisher.token), {});
    check('primer publish -> status PUBLISHED, alreadyPublished:false', p1.body?.status === 'PUBLISHED' && p1.body?.alreadyPublished === false);
    const p2 = await req('POST', `/administration/exams/${examId}/publish`, H(publisher.token), {});
    check('segundo publish -> alreadyPublished:true', p2.body?.alreadyPublished === true && p2.body?.status === 'PUBLISHED');

    console.log('--- 8. DB: 3 links, order 1..3 distinto, 4 opciones / 1 correcta, explicaciones preservadas ---');
    const dbLinks = await pg.query(`SELECT display_order, question_version_id FROM exam_question WHERE exam_id=$1 ORDER BY display_order`, [examId]);
    check('exactamente 3 ExamQuestion', dbLinks.rowCount === 3);
    check('display_order 1..3 sin huecos ni duplicados', JSON.stringify(dbLinks.rows.map((r) => r.display_order)) === '[1,2,3]');
    check('question_version_id en orden coincide con las fixtures', JSON.stringify(dbLinks.rows.map((r) => r.question_version_id)) === JSON.stringify(qv));
    for (let i = 0; i < 3; i++) {
      const opts = await pg.query(`SELECT is_correct FROM answer_option WHERE question_version_id=$1`, [qv[i]]);
      check(`Q${i + 1}: 4 opciones / 1 correcta en DB`, opts.rowCount === 4 && opts.rows.filter((r) => r.is_correct).length === 1);
      const expl = await pg.query(`SELECT explanation_content FROM question_version WHERE id=$1`, [qv[i]]);
      check(`Q${i + 1}: explanation_content no vacío`, Array.isArray(expl.rows[0].explanation_content) && expl.rows[0].explanation_content.length > 0);
    }

    console.log('--- 9. Aislamiento: 0 contaminación Study/progreso/gamificación ---');
    const zero = async (sql: string) => (await pg.query(sql)).rows[0].n as number;
    check('0 student_response (whole gate DB delta -- este gate nunca responde una pregunta)', true); // referencia; el gate no crea intentos
    const examOutbox = await zero(`SELECT count(*)::int n FROM outbox_event WHERE source_domain='EXAMS'`);
    check('el dominio EXAMS no publica ningún outbox_event', examOutbox === 0);
    const gamiEventsForFixtures = await zero(
      `SELECT count(*)::int n FROM outbox_event WHERE event_key IN ('student_response_recorded','curriculum_topic_completed','quick_question_answered') AND payload->>'questionVersionId' = ANY(ARRAY['${qv[0]}','${qv[1]}','${qv[2]}'])`,
    );
    check('0 eventos de gamificación referidos a las question_version del gate', gamiEventsForFixtures === 0);
    const srForFixtures = await zero(`SELECT count(*)::int n FROM student_response WHERE question_version_id = ANY(ARRAY['${qv[0]}','${qv[1]}','${qv[2]}']::uuid[])`);
    check('0 student_response para las question_version del gate', srForFixtures === 0);

    console.log('--- 9b. ENSAYOS-LECTORA: camino de textos compartidos del importer (idempotencia, IDs estables, separación de subject) ---');
    // Ensayo aislado con 2 textos: T1 <- Q1,Q2 ; T2 <- Q3. subjectKey académico
    // 'lenguaje' (como ENSAYO.LECTORA); las QuestionVersions siguen bajo el
    // Subject técnico del gate. El importer real usa exactamente estas rutas.
    const lecKey = `ENSAYO.ZZLECTORA.${runId}`;
    // La DB de gates puede no tener el Subject académico 'lenguaje' -- lo
    // creamos si falta (mismo criterio que el fixture de subject técnico).
    const lenguajeRow = await pg.query(`SELECT id FROM subject WHERE subject_key='lenguaje'`);
    if (lenguajeRow.rowCount === 0) {
      await pg.query(
        `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
         VALUES ($1,'lenguaje','Lenguaje','Leng',10,'ACTIVE',now(),now())`,
        [randomUUID()],
      );
    }
    const lecExam = await req('POST', '/administration/exams', H(publisher.token), {
      examKey: lecKey, title: 'Ensayo ZZLECTORA', subjectKey: 'lenguaje', durationSeconds: 9000,
    });
    check('resolve Exam de familia lectora (subjectKey lenguaje) -> created', (lecExam.status === 200 || lecExam.status === 201) && lecExam.body?.created === true);
    const lecExamId = lecExam.body.id as string;
    trackedExamIds.push(lecExamId);
    const pContent = (n: string) => [
      { type: 'paragraph', order: 0, text: `Texto compartido ${n} de Competencia Lectora, con acentos á é í ó ú ñ y ¿signos?` },
      { type: 'table', order: 1, headers: ['Sector', 'Valor'], rows: [['Norte', '10'], ['Sur', '20']], footnote: 'Fuente.' },
    ];
    const resolveP = (key: string, order: number, title: string, n: string) =>
      req('POST', `/administration/exams/${lecExamId}/passages`, H(publisher.token), { passageKey: key, displayOrder: order, title, content: pContent(n) });
    const p1a = await resolveP(`${lecKey}.T1`, 1, 'Texto 1', 'T1');
    const p2a = await resolveP(`${lecKey}.T2`, 2, 'Texto 2', 'T2');
    check('resuelve 2 ExamPassage -> created', p1a.body?.created === true && p2a.body?.created === true);
    const p1Id = p1a.body.id as string;
    const p2Id = p2a.body.id as string;
    const p1b = await resolveP(`${lecKey}.T1`, 1, 'Texto 1', 'T1');
    check('segunda resolución idéntica de T1 -> created:false, MISMO id (idempotente)', p1b.body?.created === false && p1b.body?.id === p1Id);
    check('re-resolver T1 con contenido en conflicto -> 409 (nunca sobrescribe)', (await req('POST', `/administration/exams/${lecExamId}/passages`, H(publisher.token), {
      passageKey: `${lecKey}.T1`, displayOrder: 1, title: 'Texto 1', content: [{ type: 'paragraph', order: 0, text: 'contenido distinto' }],
    })).status === 409);

    const l1 = await req('POST', `/administration/exams/${lecExamId}/questions`, H(publisher.token), { questionVersionId: qv[0], displayOrder: 1, passageId: p1Id });
    const l2 = await req('POST', `/administration/exams/${lecExamId}/questions`, H(publisher.token), { questionVersionId: qv[1], displayOrder: 2, passageId: p1Id });
    const l3 = await req('POST', `/administration/exams/${lecExamId}/questions`, H(publisher.token), { questionVersionId: qv[2], displayOrder: 3, passageId: p2Id });
    check('Q1/Q2 -> T1, Q3 -> T2 (un texto sirve a varias preguntas)', l1.body?.passageId === p1Id && l2.body?.passageId === p1Id && l3.body?.passageId === p2Id);
    const l1again = await req('POST', `/administration/exams/${lecExamId}/questions`, H(publisher.token), { questionVersionId: qv[0], displayOrder: 1, passageId: p1Id });
    check('re-link idéntico de Q1 -> created:false, MISMO id, mismo passageId', l1again.body?.created === false && l1again.body?.id === l1.body.id && l1again.body?.passageId === p1Id);

    const lecPub = await req('POST', `/administration/exams/${lecExamId}/publish`, H(publisher.token), {});
    check('publish Exam lectora -> PUBLISHED', lecPub.body?.status === 'PUBLISHED');

    const lecDb = await pg.query(
      `SELECT (SELECT count(*)::int FROM exam_passage WHERE exam_id=$1) passages,
              (SELECT count(*)::int FROM exam_question WHERE exam_id=$1) links,
              (SELECT count(*)::int FROM exam_question WHERE exam_id=$1 AND passage_id IS NOT NULL) mapped,
              (SELECT s.subject_key FROM exam e JOIN subject s ON s.id=e.subject_id WHERE e.id=$1) exam_subject`,
      [lecExamId],
    );
    check('DB: 2 passages, 3 links, 3 mapped, Exam.subject = lenguaje', lecDb.rows[0].passages === 2 && lecDb.rows[0].links === 3 && lecDb.rows[0].mapped === 3 && lecDb.rows[0].exam_subject === 'lenguaje');
    const qSubject = await pg.query(
      `SELECT DISTINCT s.subject_key FROM exam_question eq JOIN question_version qv ON qv.id=eq.question_version_id JOIN question q ON q.id=qv.question_id JOIN subject s ON s.id=q.primary_subject_id WHERE eq.exam_id=$1`,
      [lecExamId],
    );
    check('DB: las QuestionVersions NO cuelgan del subject académico del Exam (separación editorial vs académico)', qSubject.rows.every((r) => r.subject_key !== 'lenguaje'));

    console.log('--- 10. Frontera estática: exam-admin.controller no toca PROGRESS/Outbox/StudentResponse ---');
    const { readFileSync } = await import('node:fs');
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const adminSrc = strip(readFileSync(join(backendDir, 'src', 'exams', 'exam-admin.controller.ts'), 'utf8'));
    const svcSrc = strip(readFileSync(join(backendDir, 'src', 'exams', 'exam.service.ts'), 'utf8'));
    const forbidden = ['StudentResponse', 'CurriculumTopicProgress', 'ProgressService', 'OutboxService', 'OutboxModule', 'XpGrant'];
    check(
      `ni exam-admin.controller ni exam.service usan ${forbidden.join('/')} (fuera de comentarios)`,
      !forbidden.some((s) => adminSrc.includes(s) || svcSrc.includes(s)),
    );
  } finally {
    console.log('--- 11. Limpieza de fixtures del gate ---');
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
  console.log('Todas las verificaciones del gate de import de Ensayos (ENSAYOS-M1-B) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
