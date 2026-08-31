// PROFILE-01 -- "Progreso por materia" (Perfil → Resumen) debe representar
// RECURSOS CANÓNICOS COMPLETADOS / TOTAL DE RECURSOS CANÓNICOS de la materia,
// nunca `curriculum_topic` en bruto (unidades + hijos + legacy).
//
// READ-ONLY -- igual que verify-study-content-mobile-reachability-gate: NO
// usa run-gate.ts ni la base de gates. El catálogo canónico V1 completo
// (16/8/14/33/27) solo existe en axioma_dev tras `content:import`. No escribe
// una sola fila; la única sesión que crea es una cuenta stub nueva para leer
// `GET /progress/me/summary` (endpoint de autoservicio, sin efectos).
//
// Requisitos: backend dev en :3000 (AUTH_IDENTITY_PROVIDER=stub) y
// DATABASE_URL -> axioma_dev con el contenido importado.
import 'dotenv/config';
import { Client } from 'pg';
import { StubIdentityProvider } from '../src/auth/identity-provider/stub-identity.provider';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';

/** Denominadores canónicos V1 (recursos por materia) -- objetivos de validación. */
const CANONICAL_RESOURCES: Record<string, number> = {
  matematica: 16,
  'matematica-m2': 8,
  lenguaje: 14,
  ciencias: 33,
  historia: 27,
};
/** Los denominadores INFLADOS que producía el cálculo anterior (todos los curriculum_topic). */
const OLD_INFLATED = new Set([24, 12, 18, 37, 31]);
const LEGACY_ROOT_CODES = ['M1.NUMEROS.PORCENTAJES', 'C1.BIOLOGIA.CELULA', 'L1.LECTURA.INFERENCIA', 'H1.CHILE.SIGLO20.ISI'];

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}${detail ? ` -> ${detail}` : ''}`);
    failures++;
  }
}

async function newSession() {
  const uid = `profile01-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  // --- 1. Predicado "recurso canónico" contra Postgres directo ---
  console.log('--- 1. Recursos canónicos por materia (Postgres) = topic hijo con learning_resource_version PUBLISHED ---');
  const dbRows = await pg.query<{ subject_key: string; canonical: number; all_topics: number }>(`
    SELECT s.subject_key,
      count(*) FILTER (
        WHERE ct.parent_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM learning_resource_version v
                      WHERE v.curriculum_topic_id = ct.id AND v.editorial_status = 'PUBLISHED')
      )::int AS canonical,
      count(*)::int AS all_topics
    FROM curriculum_topic ct
    JOIN subject s ON s.id = ct.subject_id
    WHERE s.status = 'ACTIVE'
    GROUP BY s.subject_key
  `);
  const dbBySubject = new Map(dbRows.rows.map((r) => [r.subject_key, r]));

  let totalCanonical = 0;
  for (const [key, expected] of Object.entries(CANONICAL_RESOURCES)) {
    const row = dbBySubject.get(key);
    check(`[db] ${key}: ${row?.canonical} recursos canónicos = ${expected}`, row?.canonical === expected, `all_topics=${row?.all_topics}`);
    if (row) totalCanonical += row.canonical;
  }
  check(`[db] total recursos canónicos = 98`, totalCanonical === 98, `got ${totalCanonical}`);

  // Los 4 topics legacy siguen en BD (no borrados) pero NO son recursos canónicos.
  const legacyRows = await pg.query<{ code: string; is_root: boolean; canonical: boolean }>(
    `SELECT ct.code, ct.parent_id IS NULL AS is_root,
       (ct.parent_id IS NOT NULL AND EXISTS (SELECT 1 FROM learning_resource_version v WHERE v.curriculum_topic_id = ct.id AND v.editorial_status = 'PUBLISHED')) AS canonical
     FROM curriculum_topic ct WHERE ct.code = ANY($1::text[])`,
    [LEGACY_ROOT_CODES],
  );
  for (const code of LEGACY_ROOT_CODES) {
    const row = legacyRows.rows.find((r) => r.code === code);
    check(`[db] topic legacy ${code} existe y NO es recurso canónico`, !!row && row.canonical === false);
  }

  // --- 2. GET /progress/me/summary refleja exactamente esos denominadores ---
  console.log('--- 2. GET /progress/me/summary: denominadores = recursos canónicos, numeradores 0 para cuenta nueva ---');
  const auth = await newSession();
  const res = await fetch(base + '/progress/me/summary', { headers: auth });
  check('GET /progress/me/summary -> 200', res.status === 200);
  const summary = (await res.json()) as {
    progressBySubject: { subjectKey: string; subjectName: string; topicsStarted: number; topicsCompleted: number; totalTopics: number }[];
  };
  const apiBySubject = new Map(summary.progressBySubject.map((s) => [s.subjectKey, s]));

  for (const [key, expected] of Object.entries(CANONICAL_RESOURCES)) {
    const s = apiBySubject.get(key);
    check(`[api] ${key}: totalTopics ${s?.totalTopics} = ${expected}`, s?.totalTopics === expected);
    check(`[api] ${key}: cuenta nueva -> 0 iniciados / 0 completados`, s?.topicsStarted === 0 && s?.topicsCompleted === 0);
  }
  check(
    '[api] NINGUNA materia usa un denominador inflado (24/12/18/37/31)',
    summary.progressBySubject.every((s) => !OLD_INFLATED.has(s.totalTopics)),
    summary.progressBySubject.map((s) => `${s.subjectKey}=${s.totalTopics}`).join(', '),
  );

  // --- 3. Separación M1 / M2 ---
  console.log('--- 3. Matemática M1 y Matemática M2 son materias separadas ---');
  const m1 = apiBySubject.get('matematica');
  const m2 = apiBySubject.get('matematica-m2');
  check('[api] M1 (matematica) presente con totalTopics 16', m1?.totalTopics === 16);
  check('[api] M2 (matematica-m2) presente con totalTopics 8', m2?.totalTopics === 8);
  check('[api] M1 y M2 son filas distintas (nunca fusionadas bajo `matematica`)', !!m1 && !!m2 && m1.subjectKey !== m2.subjectKey);
  check('[api] `ensayos` no aparece en progressBySubject', !apiBySubject.has('ensayos'));

  await pg.end();
  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('PROFILE-01 -- "Progreso por materia" reconciliado a recursos canónicos: 16/8/14/33/27 (98). Todas las verificaciones pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
