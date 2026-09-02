// Gate de PREMIUM V1 -- Capa 1 (Entitlement backend), C1.3: enforcement del
// contenido de unidades. Contra el servidor de gates real + invariantes de
// BD por SQL directo sobre el catalogo canonico REAL (nunca por nombre
// visible ni por codigo hardcodeado).
//
// Regla: `GET /education/topics/:id/{children,resource,questions}` sobre un
// tema bajo una unidad canonica en posicion >= 2 requiere tier PREMIUM (403
// PREMIUM_REQUIRED para FREE). Las 2 primeras unidades de cada materia y su
// contenido permanecen libres. `subjects/:id/topics` (lista de unidades) y
// `practice-questions/*` NUNCA se gatean.
//
// Cubre:
//   A. Fixture determinista (materia propia, 4 unidades canonicas + 1 raiz
//      no canonica) -> matriz FREE/PREMIUM x endpoint, tabla de posiciones
//      exacta (2 FREE + 2 PREMIUM), NON_CANONICAL sin 403, 404 para tema
//      inexistente (guardrail 1).
//   B. `subjects/:id/topics` y `practice-questions/sample` -> 200 para FREE.
//   C. Invariantes de BD contra el catalogo REAL:
//      P3  cada materia activa con unidades canonicas: primeras min(2,N)
//          son posicion-FREE, el resto posicion-PREMIUM (orden canonico real).
//      P1  particion 3 vias EXHAUSTIVA y DISJUNTA de todo tema con contenido
//          publicado: {posicion-FREE, posicion-PREMIUM, NON_CANONICAL}.
//      P2  todo tema con contenido publicado clasificado NON_CANONICAL cuelga
//          de (o ES) una raiz NO canonica -- ningun hijo de unidad canonica
//          se escapa a NON_CANONICAL.
//   D. Scan estatico: `PremiumContentPolicy.classifyTopic` usa exactamente
//      `findById` + `findCanonicalUnitRootsBySubjectId` + `isFreeUnitPosition`
//      (el modelo SQL de este gate y el runtime no pueden divergir).
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';
import { FREE_UNITS_PER_SUBJECT, isFreeUnitPosition } from '@axioma/contracts';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
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
  return { status: res.status, body: text ? JSON.parse(text) : null, raw: text };
}

async function newSession(label: string) {
  const uid = `premium-content-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const idToken = StubIdentityProvider.encode({ providerSubject: uid, email: `${uid}@example.com`, emailVerified: true });
  const r = await req('POST', '/auth/session', {}, { idToken });
  return {
    accountId: r.body?.accountId as string,
    authHeaders: { authorization: `Bearer ${idToken}`, 'x-session-id': r.body?.sessionId as string },
  };
}

async function setTier(accountId: string, tier: 'FREE' | 'PREMIUM' | null) {
  const q = tier === null ? '' : `&tier=${tier}`;
  const r = await req('POST', `/_internal/entitlement/set-tier-override?accountId=${accountId}${q}`, { 'x-internal-ops-key': opsKey });
  if (r.status !== 200 && r.status !== 201) throw new Error(`set-tier-override(${accountId},${tier}) -> ${r.status} ${r.raw}`);
}

const isPremiumRequired = (r: { status: number; body: unknown }) =>
  r.status === 403 && (r.body as { error?: { code?: string } })?.error?.code === 'PREMIUM_REQUIRED';

// SQL que replica EXACTAMENTE `CurriculumTopicRepository.findCanonicalUnitRootsBySubjectId`
// (parent_id IS NULL, algun hijo con learning_resource_version PUBLISHED,
// ORDER BY "order" ASC). Ninguna decision por nombre/codigo.
const CANONICAL_UNITS_SQL = `
  SELECT u.id, u."order"
  FROM curriculum_topic u
  WHERE u.subject_id = $1 AND u.parent_id IS NULL
    AND EXISTS (
      SELECT 1 FROM curriculum_topic c
      JOIN learning_resource_version lrv ON lrv.curriculum_topic_id = c.id
      WHERE c.parent_id = u.id AND lrv.editorial_status = 'PUBLISHED'
    )
  ORDER BY u."order" ASC`;

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const subjectId = randomUUID();
  const accounts: string[] = [];

  // ---------------- Fixture determinista ----------------
  // NOTA: el contenido publicado es INMUTABLE (triggers
  // `enforce_*_version_published_no_delete`), como en verify-education-gate /
  // verify-exam-foundation-gate -- no se borra. Al final la materia del gate
  // se marca RETIRED para que NO aparezca en `GET /education/subjects` ni en
  // el barrido P1/P3 de corridas futuras.
  await pg.query(
    `INSERT INTO subject (id, subject_key, name, short_name, display_order, status, created_at, updated_at)
     VALUES ($1, $2, 'Materia del gate Premium/Contenido (C1.3)', 'GATEC', 960, 'ACTIVE', now(), now())`,
    [subjectId, `gate-premium-content-${runId}`],
  );

  /** Unidad raiz + 1 recurso hijo con learning_resource_version PUBLISHED + 1 question_version PUBLISHED (DRAFT -> UPDATE a PUBLISHED, mismo patron que el resto de gates). */
  async function makeCanonicalUnit(order: number, label: string): Promise<{ unitId: string; resourceId: string }> {
    const unitId = randomUUID();
    const resourceId = randomUUID();
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,now(),now()), ($6,$7,$8,0,$5,now(),now())`,
      [unitId, `GATE.PREMIUM.CONTENT.${runId}.${label}`, `Unidad ${label}`, order, subjectId, resourceId, `GATE.PREMIUM.CONTENT.${runId}.${label}.R`, `Recurso ${label}`],
    );
    await pg.query(`UPDATE curriculum_topic SET parent_id = $1 WHERE id = $2`, [unitId, resourceId]);

    const lrId = randomUUID();
    const lrvId = randomUUID();
    await pg.query(
      `INSERT INTO learning_resource (id, resource_key, primary_subject_id, resource_type, status, created_at, updated_at)
       VALUES ($1,$2,$3,'LESSON','ACTIVE',now(),now())`,
      [lrId, `GATE.PREMIUM.CONTENT.LR.${randomUUID()}`, subjectId],
    );
    await pg.query(
      `INSERT INTO learning_resource_version (id, learning_resource_id, curriculum_topic_id, title, content_blocks, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'Recurso del gate','[{"type":"paragraph","order":0,"text":"Contenido del gate."}]','DRAFT',now(),now())`,
      [lrvId, lrId, resourceId],
    );
    await pg.query(`UPDATE learning_resource_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [lrvId]);

    const qId = randomUUID();
    const qvId = randomUUID();
    await pg.query(`INSERT INTO question (id, question_key, primary_subject_id, question_type, status, created_at, updated_at) VALUES ($1,$2,$3,'SINGLE_CHOICE','ACTIVE',now(),now())`, [qId, `GATE.PREMIUM.CONTENT.Q.${randomUUID()}`, subjectId]);
    await pg.query(
      `INSERT INTO question_version (id, question_id, curriculum_topic_id, stem_content, explanation_content, editorial_status, created_at, updated_at)
       VALUES ($1,$2,$3,'[{"type":"paragraph","order":0,"text":"Enunciado."}]','[{"type":"paragraph","order":0,"text":"Explicacion."}]','DRAFT',now(),now())`,
      [qvId, qId, resourceId],
    );
    for (let i = 0; i < 4; i++) {
      await pg.query(`INSERT INTO answer_option (id, question_version_id, content, display_order, is_correct, created_at) VALUES ($1,$2,$3,$4,$5,now())`, [randomUUID(), qvId, JSON.stringify({ type: 'paragraph', order: 0, text: `Alt ${i}` }), i, i === 0]);
    }
    await pg.query(`UPDATE question_version SET editorial_status = 'PUBLISHED', published_at = now() WHERE id = $1`, [qvId]);
    return { unitId, resourceId };
  }

  try {
    const U = [
      await makeCanonicalUnit(10, 'U0'),
      await makeCanonicalUnit(20, 'U1'),
      await makeCanonicalUnit(30, 'U2'),
      await makeCanonicalUnit(40, 'U3'),
    ];
    // Raiz NO canonica: hijo SIN learning_resource_version publicada.
    const ncRootId = randomUUID();
    const ncChildId = randomUUID();
    await pg.query(
      `INSERT INTO curriculum_topic (id, code, name, "order", subject_id, created_at, updated_at)
       VALUES ($1,$2,'Raiz legacy (no canonica)',50,$3,now(),now()), ($4,$5,'Hijo sin recurso publicado',0,$3,now(),now())`,
      [ncRootId, `GATE.PREMIUM.CONTENT.${runId}.NC`, subjectId, ncChildId, `GATE.PREMIUM.CONTENT.${runId}.NC.C`],
    );
    await pg.query(`UPDATE curriculum_topic SET parent_id = $1 WHERE id = $2`, [ncRootId, ncChildId]);

    const free = await newSession('free');
    const prem = await newSession('premium');
    accounts.push(free.accountId, prem.accountId);
    await setTier(free.accountId, 'FREE');
    await setTier(prem.accountId, 'PREMIUM');

    console.log('--- A. Tabla de posiciones (fixture: 4 unidades canonicas) ---');
    const canonicalRows = await pg.query(CANONICAL_UNITS_SQL, [subjectId]);
    check('el fixture expone EXACTAMENTE 4 unidades canonicas, en orden', canonicalRows.rows.map((r) => r.id).join(',') === U.map((u) => u.unitId).join(','));
    check(`FREE_UNITS_PER_SUBJECT === 2 (contrato)`, FREE_UNITS_PER_SUBJECT === 2);

    console.log('--- A.1 FREE: primeras 2 unidades y su contenido -> 200 (FREE UNIT -> FREE CONTENT) ---');
    for (const idx of [0, 1]) {
      check(`FREE: GET topics/U${idx}/children -> 200`, (await req('GET', `/education/topics/${U[idx]!.unitId}/children`, free.authHeaders)).status === 200);
      check(`FREE: GET topics/R${idx}/resource -> 200`, (await req('GET', `/education/topics/${U[idx]!.resourceId}/resource`, free.authHeaders)).status === 200);
      check(`FREE: GET topics/R${idx}/questions -> 200`, (await req('GET', `/education/topics/${U[idx]!.resourceId}/questions`, free.authHeaders)).status === 200);
    }

    console.log('--- A.2 FREE: unidades 3+ y su contenido -> 403 PREMIUM_REQUIRED ---');
    for (const idx of [2, 3]) {
      const ch = await req('GET', `/education/topics/${U[idx]!.unitId}/children`, free.authHeaders);
      check(`FREE: GET topics/U${idx}/children -> 403 PREMIUM_REQUIRED`, isPremiumRequired(ch));
      check(`FREE: el 403 no lleva 'origin'`, !('origin' in ((ch.body as { error?: object })?.error ?? {})));
      check(`FREE: GET topics/R${idx}/resource -> 403`, isPremiumRequired(await req('GET', `/education/topics/${U[idx]!.resourceId}/resource`, free.authHeaders)));
      check(`FREE: GET topics/R${idx}/questions -> 403`, isPremiumRequired(await req('GET', `/education/topics/${U[idx]!.resourceId}/questions`, free.authHeaders)));
    }

    console.log('--- A.3 PREMIUM: unidades 3+ -> 200 ---');
    for (const idx of [2, 3]) {
      check(`PREMIUM: GET topics/U${idx}/children -> 200`, (await req('GET', `/education/topics/${U[idx]!.unitId}/children`, prem.authHeaders)).status === 200);
      check(`PREMIUM: GET topics/R${idx}/resource -> 200`, (await req('GET', `/education/topics/${U[idx]!.resourceId}/resource`, prem.authHeaders)).status === 200);
      check(`PREMIUM: GET topics/R${idx}/questions -> 200`, (await req('GET', `/education/topics/${U[idx]!.resourceId}/questions`, prem.authHeaders)).status === 200);
    }

    console.log('--- A.4 NON_CANONICAL: sin 403 (decision v2); tema inexistente -> 404 (guardrail 1) ---');
    check('FREE: GET topics/NC-root/children -> NO 403 (200)', (await req('GET', `/education/topics/${ncRootId}/children`, free.authHeaders)).status === 200);
    const ncRes = await req('GET', `/education/topics/${ncChildId}/resource`, free.authHeaders);
    check('FREE: GET topics/NC-child/resource -> 404 (sin recurso publicado), NUNCA 403', ncRes.status === 404);
    const ghost = await req('GET', `/education/topics/${randomUUID()}/resource`, free.authHeaders);
    check('FREE: GET topics/<uuid inexistente>/resource -> 404 (nunca 403)', ghost.status === 404);
    const ghostChildren = await req('GET', `/education/topics/${randomUUID()}/children`, free.authHeaders);
    check('FREE: GET topics/<uuid inexistente>/children -> 404 (nunca 403)', ghostChildren.status === 404);

    console.log('--- B. Superficies NUNCA gateadas: lista de unidades + practica libre ---');
    const topics = await req('GET', `/education/subjects/${subjectId}/topics`, free.authHeaders);
    check('FREE: GET subjects/:id/topics -> 200', topics.status === 200);
    check('FREE: subjects/:id/topics lista las 4 unidades canonicas (NC excluida)', (topics.body ?? []).map((t: { id: string }) => t.id).sort().join(',') === U.map((u) => u.unitId).sort().join(','));
    const sample = await req('POST', `/education/subjects/${subjectId}/practice-questions/sample`, free.authHeaders, { excludeQuestionVersionIds: [] });
    check('FREE: POST practice-questions/sample -> NUNCA 403 (practica libre no gateada por Premium)', sample.status !== 403);
    // @Post sin @HttpCode -> Nest devuelve 201; el cuerpo trae la pregunta.
    check('FREE: POST practice-questions/sample -> 2xx con pregunta', (sample.status === 200 || sample.status === 201) && sample.body?.question?.id);

    console.log('--- C. Invariantes de BD contra el catalogo REAL ---');
    const activeSubjects = await pg.query(`SELECT id, name FROM subject WHERE status = 'ACTIVE'`);
    // Mapa topicId -> clase, computado con la MISMA regla del runtime.
    let anyRealPremiumUnit = false;
    let p3Ok = true;
    const freePosTopicRoots = new Set<string>();
    const premiumPosTopicRoots = new Set<string>();
    for (const s of activeSubjects.rows) {
      const units = (await pg.query(CANONICAL_UNITS_SQL, [s.id])).rows;
      const nFree = Math.min(FREE_UNITS_PER_SUBJECT, units.length);
      units.forEach((u, idx) => {
        const isFreePos = isFreeUnitPosition(idx);
        if (isFreePos !== idx < nFree) p3Ok = false;
        (isFreePos ? freePosTopicRoots : premiumPosTopicRoots).add(u.id as string);
      });
      if (units.length > FREE_UNITS_PER_SUBJECT) anyRealPremiumUnit = true;
    }
    check('P3: cada materia activa -- primeras min(2,N) unidades canonicas son posicion-FREE, el resto posicion-PREMIUM (orden canonico real)', p3Ok);
    check('P3: al menos una materia REAL tiene una unidad en posicion PREMIUM (el gate muerde en contenido real)', anyRealPremiumUnit);

    // Todo tema con contenido publicado -> su raiz (parent_id ?? id).
    const contentTopics = await pg.query(`
      SELECT DISTINCT ct.id AS topic_id, COALESCE(ct.parent_id, ct.id) AS root_id, ct.subject_id
      FROM curriculum_topic ct
      WHERE EXISTS (SELECT 1 FROM learning_resource_version v WHERE v.curriculum_topic_id = ct.id AND v.editorial_status = 'PUBLISHED')
         OR EXISTS (SELECT 1 FROM question_version v WHERE v.curriculum_topic_id = ct.id AND v.editorial_status = 'PUBLISHED')`);
    let p1Free = 0, p1Premium = 0, p1NonCanon = 0, p1Bad = 0;
    let p2Ok = true;
    for (const row of contentTopics.rows) {
      const rootId = row.root_id as string;
      const inFree = freePosTopicRoots.has(rootId);
      const inPrem = premiumPosTopicRoots.has(rootId);
      if (inFree && inPrem) p1Bad++;            // imposible: una raiz no puede ser free y premium a la vez
      else if (inFree) p1Free++;
      else if (inPrem) p1Premium++;
      else {
        p1NonCanon++;
        // P2: contenido NON_CANONICAL cuelga de (o ES) una raiz NO canonica.
        const rootRow = (await pg.query(`SELECT parent_id FROM curriculum_topic WHERE id = $1`, [rootId])).rows[0];
        if (!rootRow || rootRow.parent_id !== null) p2Ok = false; // su "root" resuelto debe ser un nodo raiz real
      }
    }
    check('P1: particion 3-vias de todo tema con contenido publicado -- ninguna raiz es simultaneamente FREE y PREMIUM', p1Bad === 0);
    check('P1: la particion es exhaustiva (todo tema con contenido cae en FREE | PREMIUM | NON_CANONICAL)', p1Free + p1Premium + p1NonCanon === contentTopics.rows.length);
    check('P2: todo contenido NON_CANONICAL resuelve a una raiz real (parent_id NULL) -- ningun hijo de unidad canonica se escapa', p2Ok);
    console.log(`      (catalogo real: ${p1Free} temas posicion-FREE, ${p1Premium} posicion-PREMIUM, ${p1NonCanon} NON_CANONICAL)`);

    console.log('--- D. Scan estatico: classifyTopic usa las 3 primitivas canonicas ---');
    const policySrc = readFileSync(join(__dirname, '..', 'src', 'education', 'premium-content-policy.service.ts'), 'utf8');
    check('classifyTopic llama topicRepo.findById', /this\.topicRepo\.findById\(topicId\)/.test(policySrc));
    check('classifyTopic llama topicRepo.findCanonicalUnitRootsBySubjectId', /this\.topicRepo\.findCanonicalUnitRootsBySubjectId\(topic\.subjectId\)/.test(policySrc));
    check('classifyTopic usa isFreeUnitPosition (de @axioma/contracts)', /isFreeUnitPosition\(idx\)/.test(policySrc) && /from '@axioma\/contracts'/.test(policySrc));
    check('classifyTopic resuelve la raiz como parent_id ?? id (arbol de 2 niveles)', /topic\.parentId \?\? topic\.id/.test(policySrc));
    check('tema inexistente -> UNKNOWN_TOPIC (la policy NO produce 404)', /if \(!topic\) return 'UNKNOWN_TOPIC'/.test(policySrc));
    check('idx === -1 -> NON_CANONICAL (estado explicito, no fail-open incidental)', /idx === -1\) return 'NON_CANONICAL'/.test(policySrc));

    const svcSrc = readFileSync(join(__dirname, '..', 'src', 'education', 'education.service.ts'), 'utf8');
    check('education.service: assertUnitContentAccessible SOLO consulta el tier para PREMIUM_UNIT', /if \(klass !== 'PREMIUM_UNIT'\) return;[\s\S]{0,120}getEntitlement\(accountId\)/.test(svcSrc));
    check('education.service: listRootTopics NO llama assertUnitContentAccessible (lista de unidades abierta)', !/listRootTopics[\s\S]{0,300}assertUnitContentAccessible/.test(svcSrc));
    check('education.service: samplePracticeQuestion NO llama assertUnitContentAccessible', !/samplePracticeQuestion[\s\S]{0,400}assertUnitContentAccessible/.test(svcSrc));
  } finally {
    console.log('--- Limpieza (contenido publicado inmutable permanece; la materia se retira) ---');
    for (const acc of accounts) {
      try { await setTier(acc, null); } catch { /* best-effort */ }
    }
    try {
      await pg.query(`UPDATE subject SET status = 'RETIRED', updated_at = now() WHERE id = $1`, [subjectId]);
    } catch (e) {
      console.error('  (no se pudo retirar la materia del gate:', (e as Error).message, ')');
    }
  }

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificacion(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Premium/Contenido (PREMIUM V1, Capa 1, C1.3) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
