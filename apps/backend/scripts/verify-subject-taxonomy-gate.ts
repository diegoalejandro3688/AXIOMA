// Gate de M1/M2 SUBJECT TAXONOMY ALIGNMENT.
//
// Estudio V1 tiene 5 materias académicas visibles y "Matemática M1" /
// "Matemática M2" son materias DISTINTAS (no unidades de una "Matemática"
// genérica). El contenedor técnico `ensayos` permanece oculto.
//
// Prueba, en tres planos:
//   1. SOURCE (content/manifest.ts, estático): 5 materias de catálogo, claves
//      y presentación exactas, y los conteos canónicos 98 LR / 980 Q con el
//      reparto M1 16/160 + M2 8/80 -- NUNCA se afirman contra un conteo de DB
//      poblada (ver fixture drift de axioma_dev / axioma_gates_dev).
//   2. RUNTIME (servidor de gates + axioma_gates_dev): `GET /education/subjects`
//      expone exactamente esas 5 como prefijo ordenado (displayOrder 1..5) y
//      NO expone `ensayos`; los temas raíz de M1 son sólo `M1.*` y los de M2
//      sólo `M2.*` (sin cruce); si existe `Exam ENSAYO.M1`, apunta a
//      "Matemática M1".
//   3. INVARIANTE (DB + migración): tras la migración de alineación, los TRES
//      triggers de inmutabilidad de materia siguen ACTIVOS con su definición
//      original y los DOS de consistencia de versión no se tocaron -- la
//      inmutabilidad "materia de una identidad" sigue vigente fuera de esa
//      migración histórica.
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import {
  CONTENT_MANIFEST,
  catalogSubjects,
  totalExpectedResources,
  totalExpectedQuestions,
  expectedQuestionsForSubject,
} from '../content/manifest';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const MIGRATION_SQL = join(__dirname, '..', 'prisma', 'migrations', '20260829120000_split_m1_m2_subjects', 'migration.sql');

const CANONICAL: { subjectKey: string; name: string; shortName: string; displayOrder: number; unitPrefix: string | null }[] = [
  { subjectKey: 'matematica', name: 'Matemática M1', shortName: 'M1', displayOrder: 1, unitPrefix: 'M1.' },
  { subjectKey: 'matematica-m2', name: 'Matemática M2', shortName: 'M2', displayOrder: 2, unitPrefix: 'M2.' },
  { subjectKey: 'lenguaje', name: 'Lenguaje', shortName: 'Leng', displayOrder: 3, unitPrefix: null },
  { subjectKey: 'ciencias', name: 'Ciencias', shortName: 'Cien', displayOrder: 4, unitPrefix: null },
  { subjectKey: 'historia', name: 'Historia', shortName: 'Hist', displayOrder: 5, unitPrefix: null },
];

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    if (detail) console.error(`       -> ${detail}`);
    failures++;
  }
}

async function req(path: string, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function newSession() {
  const uid = `taxo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const res = await fetch(base + '/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const body = (await res.json()) as { sessionId: string };
  return { authorization: `Bearer ${idToken}`, 'x-session-id': body.sessionId };
}

async function main() {
  console.log('--- 1. SOURCE: content/manifest.ts -- 5 materias de catálogo, presentación y conteos canónicos ---');
  const cat = catalogSubjects(CONTENT_MANIFEST);
  check(`exactamente 5 materias de catálogo (encontradas: ${cat.length})`, cat.length === 5);
  for (const want of CANONICAL) {
    const got = cat.find((s) => s.subjectKey === want.subjectKey);
    check(
      `manifest: ${want.subjectKey} -> name="${want.name}" shortName="${want.shortName}" displayOrder=${want.displayOrder}`,
      !!got && got.name === want.name && got.shortName === want.shortName && got.displayOrder === want.displayOrder,
      got ? `name="${got.name}" shortName="${got.shortName}" displayOrder=${got.displayOrder}` : 'ausente',
    );
    if (got && want.unitPrefix) {
      check(
        `manifest: todas las unidades de ${want.subjectKey} usan el prefijo ${want.unitPrefix}`,
        got.units.every((u) => u.unitCode.startsWith(want.unitPrefix!)),
        got.units.map((u) => u.unitCode).join(', '),
      );
    }
  }
  check(`manifest: totalExpectedResources = 98 (${totalExpectedResources(CONTENT_MANIFEST)})`, totalExpectedResources(CONTENT_MANIFEST) === 98);
  check(`manifest: totalExpectedQuestions = 980 (${totalExpectedQuestions(CONTENT_MANIFEST)})`, totalExpectedQuestions(CONTENT_MANIFEST) === 980);
  const m1 = cat.find((s) => s.subjectKey === 'matematica')!;
  const m2 = cat.find((s) => s.subjectKey === 'matematica-m2')!;
  check(`manifest: Matemática M1 declara 160 preguntas (${expectedQuestionsForSubject(m1)})`, expectedQuestionsForSubject(m1) === 160);
  check(`manifest: Matemática M2 declara 80 preguntas (${expectedQuestionsForSubject(m2)})`, expectedQuestionsForSubject(m2) === 80);
  check('manifest: Matemática M1 = 16 recursos', m1.units.reduce((n, u) => n + u.resources.length, 0) === 16);
  check('manifest: Matemática M2 = 8 recursos', m2.units.reduce((n, u) => n + u.resources.length, 0) === 8);
  check('manifest: NINGUNA unidad M2.* sigue dentro de la materia `matematica`', m1.units.every((u) => !u.unitCode.startsWith('M2.')));

  console.log('\n--- 2. INVARIANTE: la migración de alineación reactiva lo que desactiva y no toca los triggers de versión ---');
  const sql = readFileSync(MIGRATION_SQL, 'utf8');
  for (const trg of ['trg_curriculum_topic_subject_consistency', 'trg_learning_resource_subject_immutable', 'trg_question_subject_immutable']) {
    const disables = (sql.match(new RegExp(`DISABLE TRIGGER "${trg}"`, 'g')) ?? []).length;
    const enables = (sql.match(new RegExp(`ENABLE TRIGGER "${trg}"`, 'g')) ?? []).length;
    check(`migración: ${trg} se DISABLE (${disables}) y se re-ENABLE (${enables}) el mismo número de veces`, disables >= 1 && disables === enables);
  }
  check(
    'migración: NO toca trg_learning_resource_version_subject_consistency ni trg_question_version_subject_consistency',
    !/TRIGGER "trg_learning_resource_version_subject_consistency"/.test(sql) && !/TRIGGER "trg_question_version_subject_consistency"/.test(sql),
  );
  check('migración: NO usa session_replication_role', !/session_replication_role/i.test(sql));
  check('migración: es fresh-DB safe (INSERT de subject guardado por EXISTS matematica)', /WHERE EXISTS \(SELECT 1 FROM "subject" WHERE "subject_key" = 'matematica'\)/.test(sql));

  console.log('\n--- 3. RUNTIME + DB (servidor de gates / axioma_gates_dev) ---');
  const H = await newSession();
  const subs = await req('/education/subjects', H);
  check('GET /education/subjects -> 200', subs.status === 200);
  const rows: { subjectKey: string; name: string; shortName: string; id: string }[] = subs.body ?? [];
  check('`ensayos` NO aparece en /education/subjects', !rows.some((s) => s.subjectKey === 'ensayos'));
  // Las 5 canónicas son el prefijo ordenado por displayOrder (una BD de gates
  // acumula materias-fixture con displayOrder alto; se comparan sólo las 5).
  for (let i = 0; i < CANONICAL.length; i++) {
    const got = rows[i];
    const want = CANONICAL[i]!;
    check(
      `/education/subjects[${i}] = ${want.subjectKey} "${want.name}" (${want.shortName})`,
      !!got && got.subjectKey === want.subjectKey && got.name === want.name && got.shortName === want.shortName,
      got ? `${got.subjectKey} "${got.name}" (${got.shortName})` : 'ausente',
    );
  }

  const subM1 = rows.find((s) => s.subjectKey === 'matematica');
  const subM2 = rows.find((s) => s.subjectKey === 'matematica-m2');
  if (subM1 && subM2) {
    const tM1 = await req(`/education/subjects/${subM1.id}/topics`, H);
    const tM2 = await req(`/education/subjects/${subM2.id}/topics`, H);
    const codesM1: string[] = (tM1.body ?? []).map((t: { code: string }) => t.code);
    const codesM2: string[] = (tM2.body ?? []).map((t: { code: string }) => t.code);
    // Nota: axioma_gates_dev acumula temas-fixture `GATE.*` creados
    // directamente bajo `matematica` por gates previos; la separación real
    // se afirma por "ningún M2.* en M1" y "ningún M1.* en M2" (y por los
    // checks a nivel de DB más abajo, que son a prueba de ese ruido).
    check('temas raíz de "Matemática M1": al menos un M1.* y ningún M2.*', codesM1.some((c) => c.startsWith('M1.')) && !codesM1.some((c) => c.startsWith('M2.')), codesM1.join(', '));
    check('temas raíz de "Matemática M2": ningún M1.*', !codesM2.some((c) => c.startsWith('M1.')), codesM2.join(', '));
    check('temas raíz de "Matemática M2": todo lo académico es M2.* (o vacío si aún no se importó)', codesM2.filter((c) => /^M\d\./.test(c)).every((c) => c.startsWith('M2.')), codesM2.join(', '));
  } else {
    check('materias matematica y matematica-m2 presentes en runtime', false);
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  try {
    const trg = await pg.query(
      `SELECT tgname, tgenabled::text AS st FROM pg_trigger WHERE tgname IN
        ('trg_curriculum_topic_subject_consistency','trg_learning_resource_subject_immutable','trg_question_subject_immutable',
         'trg_learning_resource_version_subject_consistency','trg_question_version_subject_consistency')`,
    );
    check(
      `los 5 triggers de materia están ACTIVOS ('O') tras la migración (${trg.rows.map((r) => `${r.tgname}=${r.st}`).join(' ')})`,
      trg.rows.length === 5 && trg.rows.every((r) => r.st === 'O'),
    );

    const m2Leak = await pg.query(
      `SELECT count(*)::int AS n FROM curriculum_topic ct
        JOIN subject s ON s.id = ct.subject_id
        WHERE ct.code LIKE 'M2.%' AND s.subject_key = 'matematica'`,
    );
    check('DB: 0 temas M2.* siguen bajo la materia `matematica`', m2Leak.rows[0].n === 0, `n=${m2Leak.rows[0].n}`);
    const m1Leak = await pg.query(
      `SELECT count(*)::int AS n FROM curriculum_topic ct
        JOIN subject s ON s.id = ct.subject_id
        WHERE ct.code LIKE 'M1.%' AND s.subject_key = 'matematica-m2'`,
    );
    check('DB: 0 temas M1.* bajo la materia `matematica-m2`', m1Leak.rows[0].n === 0, `n=${m1Leak.rows[0].n}`);

    const exam = await pg.query(
      `SELECT e.exam_key, s.subject_key, s.name FROM exam e JOIN subject s ON s.id = e.subject_id WHERE e.exam_key = 'ENSAYO.M1'`,
    );
    if (exam.rows.length === 1) {
      check(
        'Exam ENSAYO.M1 pertenece a la materia `matematica` = "Matemática M1"',
        exam.rows[0].subject_key === 'matematica' && exam.rows[0].name === 'Matemática M1',
        `subject_key=${exam.rows[0].subject_key} name="${exam.rows[0].name}"`,
      );
    } else {
      console.log('  --  Exam ENSAYO.M1 no está en esta BD (gates) -- verificado en runtime de axioma_dev por separado');
    }
  } finally {
    await pg.end();
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) del gate de taxonomía M1/M2 fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de taxonomía M1/M2 pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
