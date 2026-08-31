// STUDY CONTENT MOBILE REACHABILITY -- gate end-to-end del último gap de
// Study V1: los 98 Recursos canónicos y sus 980 preguntas viven como
// `curriculum_topic` HIJOS de las 17 Unidades canónicas, pero Mobile navegaba con el id
// de la Unidad directamente al flujo recurso/ejercicio, dejándolos
// inalcanzables. Este gate prueba la jerarquía REAL.
//
// READ-ONLY -- igual que verify-content-source-gate / verify-curriculum-topic-count,
// NO usa run-gate.ts ni la base de gates: no escribe una sola fila. El
// catálogo canónico completo (98/980) solo existe en axioma_dev tras
// `content:import`; run-gate.ts se niega (con razón) a tocar esa base, así
// que la reconciliación exhaustiva se hace aquí, sin mutar nada.
//
// Estrategia (el throttler global es 100 req/60s -- una verificación por API
// de los 98 recursos serían ~250 req y daría 429):
//   - RECONCILIACIÓN EXHAUSTIVA (17/98/980) contra Postgres directo -- el
//     endpoint de EDUCATION es un filtro fino sobre `editorial_status =
//     PUBLISHED` (equivalencia ya probada por verify-education-gate), así que
//     el estado de fila ES lo que el endpoint serviría.
//   - PRUEBA POR API END-TO-END de UNA unidad + UN recurso por cada una de
//     las 5 materias (subjects -> topics -> children -> resource -> questions),
//     con paso lento entre solicitudes.
//
// Requisitos: backend dev en :3000 (AUTH_IDENTITY_PROVIDER=stub) y
// DATABASE_URL -> axioma_dev con el contenido importado.
import 'dotenv/config';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';
import {
  CONTENT_MANIFEST,
  catalogSubjects,
  expectedQuestionsForSubject,
  totalExpectedQuestions,
  totalExpectedResources,
} from '../content/manifest';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const API_PACING_MS = 400;

/** Los 4 topics raíz legacy del seed -- NUNCA parte de CONTENT_MANIFEST V1. */
const LEGACY_ROOT_CODES = [
  'M1.NUMEROS.PORCENTAJES',
  'C1.BIOLOGIA.CELULA',
  'L1.LECTURA.INFERENCIA',
  'H1.CHILE.SIGLO20.ISI',
];

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function req(method: string, path: string, headers: Record<string, string> = {}) {
  await sleep(API_PACING_MS);
  const res = await fetch(base + path, { method, headers });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function newSession() {
  const uid = `study-reach-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const res = await fetch(base + '/auth/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const body = (await res.json()) as { sessionId: string };
  return { authorization: `Bearer ${idToken}`, 'x-session-id': body.sessionId };
}

interface ApiTopic {
  id: string;
  code: string;
  name: string;
  order: number;
  parentId: string | null;
  subjectId: string;
}

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const manifestSubjects = catalogSubjects(CONTENT_MANIFEST);
  // Conteos canónicos DERIVADOS del manifest -- la única autoridad. El
  // handoff de STUDY CONTENT dice "20 unidades", pero su propio desglose
  // (M1:4 + M2:4 + Lenguaje:3 + Ciencias:3 + Historia:3) suma 17, y el
  // manifest + source + BD reconcilian en 17/98/980. No se toca el manifest
  // (regla central): se verifica contra lo que el catálogo canónico REALMENTE
  // contiene.
  const EXPECTED_UNITS = manifestSubjects.reduce((n, s) => n + s.units.length, 0);

  // =========================================================================
  // PARTE 1 -- Reconciliación exhaustiva contra Postgres (0 llamadas API).
  // =========================================================================
  console.log('=== PARTE 1: reconciliación canónica exhaustiva (Postgres) ===\n');

  // Todos los topics por code, con su materia (subjectKey) y su padre.
  const topicRows = await pg.query<{
    id: string;
    code: string;
    order: number;
    parent_id: string | null;
    subject_key: string;
    pub_resources: number;
    pub_questions: number;
  }>(`
    SELECT t.id, t.code, t."order", t.parent_id, s.subject_key,
      (SELECT count(*)::int FROM learning_resource_version v WHERE v.curriculum_topic_id = t.id AND v.editorial_status = 'PUBLISHED') AS pub_resources,
      (SELECT count(*)::int FROM question_version q WHERE q.curriculum_topic_id = t.id AND q.editorial_status = 'PUBLISHED') AS pub_questions
    FROM curriculum_topic t
    JOIN subject s ON s.id = t.subject_id
  `);
  const byCode = new Map(topicRows.rows.map((r) => [r.code, r]));
  const byId = new Map(topicRows.rows.map((r) => [r.id, r]));

  let dbUnits = 0;
  let dbResources = 0;
  let dbQuestions = 0;
  const perSubjectDb: Record<string, { units: number; resources: number; questions: number }> = {};

  for (const subject of manifestSubjects) {
    perSubjectDb[subject.subjectKey] = { units: 0, resources: 0, questions: 0 };
    for (const unit of subject.units) {
      const unitRow = byCode.get(unit.unitCode);
      check(`[db] unidad ${unit.unitCode} existe`, !!unitRow);
      if (!unitRow) continue;
      check(`[db] unidad ${unit.unitCode} es raíz (parent_id NULL)`, unitRow.parent_id === null);
      check(`[db] unidad ${unit.unitCode} en materia ${subject.subjectKey}`, unitRow.subject_key === subject.subjectKey);
      check(`[db] unidad ${unit.unitCode} order canónico = ${unit.order}`, unitRow.order === unit.order);
      dbUnits++;
      perSubjectDb[subject.subjectKey].units++;

      for (const resource of unit.resources) {
        const rRow = byCode.get(resource.topicCode);
        check(`[db]   recurso ${resource.topicCode} existe`, !!rRow);
        if (!rRow) continue;
        const parent = rRow.parent_id ? byId.get(rRow.parent_id) : undefined;
        check(`[db]   recurso ${resource.topicCode} es hijo de ${unit.unitCode}`, parent?.code === unit.unitCode);
        check(`[db]   recurso ${resource.topicCode} en materia ${subject.subjectKey}`, rRow.subject_key === subject.subjectKey);
        check(`[db]   recurso ${resource.topicCode} tiene lección PUBLISHED`, rRow.pub_resources >= 1);
        check(
          `[db]   recurso ${resource.topicCode}: ${rRow.pub_questions} preguntas PUBLISHED = expectedQuestions ${resource.expectedQuestions}`,
          rRow.pub_questions === resource.expectedQuestions,
        );
        check(`[db]   recurso ${resource.topicCode}: expectedQuestions === 10`, resource.expectedQuestions === 10);
        if (rRow.pub_resources >= 1) {
          dbResources++;
          perSubjectDb[subject.subjectKey].resources++;
        }
        if (rRow.pub_questions === resource.expectedQuestions) {
          dbQuestions += rRow.pub_questions;
          perSubjectDb[subject.subjectKey].questions += rRow.pub_questions;
        }
      }
    }
  }

  console.log('');
  check(`[db] materias catálogo: ${manifestSubjects.length} / 5`, manifestSubjects.length === 5);
  check(`[db] unidades canónicas: ${dbUnits} / ${EXPECTED_UNITS}`, dbUnits === EXPECTED_UNITS);
  check(
    `[db] recursos canónicos con lección PUBLISHED: ${dbResources} / ${totalExpectedResources(CONTENT_MANIFEST)} (98)`,
    dbResources === totalExpectedResources(CONTENT_MANIFEST) && dbResources === 98,
  );
  check(
    `[db] preguntas canónicas PUBLISHED: ${dbQuestions} / ${totalExpectedQuestions(CONTENT_MANIFEST)} (980)`,
    dbQuestions === totalExpectedQuestions(CONTENT_MANIFEST) && dbQuestions === 980,
  );
  for (const subject of manifestSubjects) {
    const got = perSubjectDb[subject.subjectKey];
    const expR = subject.units.reduce((n, u) => n + u.resources.length, 0);
    const expQ = expectedQuestionsForSubject(subject);
    check(
      `[db] ${subject.subjectKey}: ${got.resources}/${expR} recursos, ${got.questions}/${expQ} preguntas`,
      got.resources === expR && got.questions === expQ,
    );
  }

  // M2: order interno 5..8 (nunca renumerado).
  const m2 = manifestSubjects.find((s) => s.subjectKey === 'matematica-m2');
  if (m2) {
    const m2Orders = m2.units.map((u) => byCode.get(u.unitCode)?.order).join(',');
    check(`[db] M2: order interno canónico = 5,6,7,8 (nunca renumerado)`, m2Orders === '5,6,7,8', `orders=${m2Orders}`);
  }

  // Legacy: siguen EXISTIENDO en BD (no hard-delete).
  console.log('');
  for (const code of LEGACY_ROOT_CODES) {
    check(`[db] topic legacy ${code} sigue en curriculum_topic (no hard-delete)`, byCode.has(code));
  }

  // =========================================================================
  // PARTE 2 -- Prueba end-to-end por API: 1 unidad + 1 recurso por materia.
  // =========================================================================
  console.log('\n=== PARTE 2: prueba end-to-end por API (1 recurso real por materia) ===\n');
  const auth = await newSession();
  const rSubjects = await req('GET', '/education/subjects', auth);
  check('[api] GET /education/subjects -> 200', rSubjects.status === 200);
  const apiSubjects: { id: string; subjectKey: string }[] = rSubjects.body ?? [];

  let apiUnitsSeen = 0;

  for (const manifestSubject of manifestSubjects) {
    const subject = apiSubjects.find((s) => s.subjectKey === manifestSubject.subjectKey);
    check(`[api] materia ${manifestSubject.subjectKey} presente`, !!subject);
    if (!subject) continue;

    const rTopics = await req('GET', `/education/subjects/${subject.id}/topics`, auth);
    const units: ApiTopic[] = rTopics.body ?? [];
    check(
      `[api] ${manifestSubject.subjectKey}: ${units.length} unidades visibles = ${manifestSubject.units.length} canónicas`,
      units.length === manifestSubject.units.length,
      units.map((u) => u.code).join(', '),
    );
    for (const legacyCode of LEGACY_ROOT_CODES) {
      check(`[api] ${manifestSubject.subjectKey}: unidad legacy ${legacyCode} NO visible`, !units.some((u) => u.code === legacyCode));
    }
    const orders = units.map((u) => u.order);
    check(`[api] ${manifestSubject.subjectKey}: unidades ordenadas por order asc`, orders.every((o, i) => i === 0 || o >= orders[i - 1]));
    for (const mu of manifestSubject.units) {
      check(`[api] ${manifestSubject.subjectKey}: unidad ${mu.unitCode} presente`, units.some((u) => u.code === mu.unitCode));
    }
    apiUnitsSeen += units.length;

    // Primera unidad de la materia -> sus recursos hijos.
    const firstManifestUnit = manifestSubject.units[0];
    const firstUnit = units.find((u) => u.code === firstManifestUnit.unitCode);
    if (!firstUnit) continue;
    const rChildren = await req('GET', `/education/topics/${firstUnit.id}/children`, auth);
    const children: ApiTopic[] = rChildren.body ?? [];
    check(
      `[api] ${firstManifestUnit.unitCode}: ${children.length} recursos hijos = ${firstManifestUnit.resources.length} canónicos`,
      children.length === firstManifestUnit.resources.length,
    );
    for (const mr of firstManifestUnit.resources) {
      check(`[api] ${firstManifestUnit.unitCode}: recurso ${mr.topicCode} es hijo`, children.some((c) => c.code === mr.topicCode && c.parentId === firstUnit.id));
    }

    // Primer recurso hijo -> lección + 10 preguntas alcanzables.
    const firstManifestResource = firstManifestUnit.resources[0];
    const firstResource = children.find((c) => c.code === firstManifestResource.topicCode);
    check(`[api] recurso muestra ${firstManifestResource.topicCode} presente`, !!firstResource);
    if (!firstResource) continue;
    check(
      '[api] el id de navegación al flujo es el del RECURSO hijo, nunca el de la Unidad',
      firstResource.id !== firstUnit.id && firstResource.parentId === firstUnit.id,
    );

    const rResource = await req('GET', `/education/topics/${firstResource.id}/resource`, auth);
    check(
      `[api] ${firstManifestResource.topicCode}: recurso PUBLISHED alcanzable (200, curriculumTopicId correcto)`,
      rResource.status === 200 && rResource.body?.curriculumTopicId === firstResource.id,
    );
    const rQuestions = await req('GET', `/education/topics/${firstResource.id}/questions`, auth);
    const qCount = Array.isArray(rQuestions.body) ? rQuestions.body.length : -1;
    check(`[api] ${firstManifestResource.topicCode}: ${qCount} preguntas PUBLISHED alcanzables (10)`, qCount === 10);
  }

  check(`[api] total de unidades canónicas visibles across materias: ${apiUnitsSeen} / ${EXPECTED_UNITS}`, apiUnitsSeen === EXPECTED_UNITS);

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('STUDY CONTENT MOBILE REACHABILITY -- 17/17 unidades, 98/98 recursos y 980/980 preguntas alcanzables por el modelo de navegación canónico. Todas las verificaciones pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
