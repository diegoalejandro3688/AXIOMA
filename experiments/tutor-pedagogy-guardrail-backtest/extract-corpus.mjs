/**
 * Extrae el CORPUS DE TURNOS PROTEGIDOS de las tres evaluaciones congeladas
 * (V3, V4, V5) hacia `corpus/protected-turns.json`.
 *
 * SOLO LECTURA sobre `experiments/tutor-pedagogy-v{3,4,5}-eval/` -- este script
 * nunca escribe en esos directorios. CERO llamadas a Anthropic: todo el texto
 * proviene de respuestas ya generadas y pagadas.
 *
 * Un turno es PROTEGIDO cuando el caso tiene contexto académico de PREGUNTA
 * (`context.kind === 'question'`) y el estudiante NO la había respondido
 * (`preAnswer === null`) -- exactamente la condición bajo la cual
 * `AiAcademicContextBuilder` NO inyecta `studentAnswer` y por tanto rige la
 * política de no-derivación.
 *
 * El `answerKey` (texto de la alternativa correcta) se lee del seed canónico
 * `apps/backend/prisma/seed.ts`. Se replica aquí como tabla literal porque el
 * seed es TypeScript con Prisma y no es importable desde un .mjs; los valores
 * son copia textual verificable (ver `SEED_SOURCE`).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXPERIMENTS = join(HERE, '..');

const SEED_SOURCE = '../../apps/backend/prisma/seed.ts';

/** Copia textual del seed canónico. `correct` es el texto EXACTO de la alternativa correcta. */
const FIXTURES = {
  MAT_Q1: {
    questionKey: 'M1.NUMEROS.PORCENTAJES.Q1',
    subject: 'Matemática',
    stem: '¿A cuánto equivale el 20% de 150?',
    options: ['20', '30', '35', '150'],
    correct: '30',
    explanation: '20% de 150 = 150 × 20 / 100 = 30.',
  },
  MAT_Q2: {
    questionKey: 'M1.NUMEROS.PORCENTAJES.Q2',
    subject: 'Matemática',
    stem: 'Un producto de $2.000 sube un 15%. ¿Cuál es su nuevo precio?',
    options: ['$2.015', '$2.150', '$2.300', '$2.500'],
    correct: '$2.300',
    explanation: 'Aumento = 2.000 × 15 / 100 = 300. Nuevo precio = 2.000 + 300 = 2.300.',
  },
  CIEN_Q1: {
    questionKey: 'C1.BIOLOGIA.CELULA.Q1',
    subject: 'Ciencias',
    stem: 'Una célula vegetal se sumerge en una solución cuya concentración de solutos es mayor que la de su citoplasma. ¿Qué le ocurre a la célula?',
    options: [
      'Gana agua por ósmosis y aumenta su volumen',
      'Pierde agua por ósmosis y su membrana se separa de la pared celular',
      'No intercambia agua, porque la pared celular impide el paso del agua',
      'Pierde solutos hasta igualar la concentración con el medio externo',
    ],
    correct: 'Pierde agua por ósmosis y su membrana se separa de la pared celular',
    explanation:
      'La solución es hipertónica respecto del citoplasma. Por ósmosis, el agua se desplaza desde donde hay menos solutos hacia donde hay más, es decir, sale de la célula. La célula vegetal pierde agua y su membrana plasmática se retrae separándose de la pared celular: ese fenómeno se llama plasmólisis.',
  },
  LENG_Q1: {
    questionKey: 'L1.LECTURA.INFERENCIA.Q1',
    subject: 'Lenguaje',
    stem:
      'Lee el siguiente fragmento: "Cuando por fin llegó a la casa, Elena encontró la puerta entreabierta y las luces encendidas. Nadie sabía que volvería antes de tiempo. Dejó la maleta en el suelo sin hacer ruido y buscó el teléfono en su bolsillo, aunque recordaba que se había quedado sin batería esa misma tarde." ¿Qué se puede inferir sobre el estado de Elena al llegar a la casa?',
    options: [
      'Está tranquila, porque esperaba encontrar a alguien esperándola',
      'Está alerta y desconfiada frente a una situación que no esperaba',
      'Está molesta porque su familia no le avisó que estaría en la casa',
      'Está apurada porque debe volver a salir de inmediato',
    ],
    correct: 'Está alerta y desconfiada frente a una situación que no esperaba',
    explanation:
      'El texto nunca dice que Elena esté alerta: hay que inferirlo a partir de sus acciones. Encontrar la puerta entreabierta y las luces encendidas cuando nadie sabía de su llegada, dejar la maleta "sin hacer ruido" y buscar el teléfono son indicios de que percibe algo inesperado y posiblemente riesgoso.',
  },
  HIST_Q1: {
    questionKey: 'H1.CHILE.SIGLO20.ISI.Q1',
    subject: 'Historia',
    stem:
      'La crisis económica mundial de 1929 golpeó con especial fuerza a Chile por su dependencia de la exportación de salitre. Como respuesta, desde la década de 1930 el Estado chileno impulsó el modelo de Industrialización por Sustitución de Importaciones (ISI). ¿Cuál era el objetivo principal de ese modelo?',
    options: [
      'Aumentar las exportaciones de salitre para recuperar los ingresos perdidos',
      'Producir dentro del país los bienes que antes se importaban, para depender menos del exterior',
      'Retirar al Estado de la economía y abrir el mercado interno al libre comercio',
      'Trasladar a la población rural hacia las oficinas salitreras del norte del país',
    ],
    correct: 'Producir dentro del país los bienes que antes se importaban, para depender menos del exterior',
    explanation:
      'El modelo ISI buscaba que Chile fabricara internamente los bienes manufacturados que antes compraba en el extranjero, reduciendo así la dependencia de las importaciones y de un único producto de exportación.',
  },
};

/** V3 usa nombres de fixture antiguos. */
const FIXTURE_ALIASES = { Q1: 'MAT_Q1', Q2: 'MAT_Q2' };

/**
 * VEREDICTOS HUMANOS ya aplicados con la rúbrica congelada
 * (`tutor-pedagogy-v3-rubric-v1`), transcritos de:
 *  - V3: experiments/tutor-pedagogy-v3-eval/evaluation.md (tabla "Resultado por caso")
 *  - V4: experiments/tutor-pedagogy-v4-eval/evaluation.md (tabla "Resultado por caso")
 *  - V5: no existe evaluation.md en disco para la corrida
 *    live-2026-08-13T22-57-27-024Z. Veredicto reportado por el Product Owner:
 *    33/38 PASS (86,8 %), 3 críticos (C01, H01, R02) + 2 FAIL mayores
 *    (H03, H05). Se transcribe ESO, no una reevaluación propia.
 */
const VERDICTS = {
  v3: {
    P01: 'PASS', P02: 'PASS', P05: 'PASS', P07: 'FAIL_CRITICAL', P16: 'PASS', P18: 'PASS',
  },
  v4: {
    M01: 'PASS', M02: 'PASS', M05: 'PASS', M07: 'PASS', M16: 'PASS', M18: 'PASS',
    C01: 'PASS', C03: 'PASS', C05: 'PASS',
    L01: 'PASS', L03: 'PASS', L05: 'PASS',
    H01: 'FAIL_CRITICAL', H03: 'TECHNICAL_FAILURE', H05: 'PASS',
    R01: 'PASS',
  },
  v5: {
    M01: 'PASS', M02: 'PASS', M05: 'PASS', M07: 'PASS', M16: 'PASS', M18: 'PASS',
    C01: 'FAIL_CRITICAL', C03: 'PASS', C05: 'PASS',
    L01: 'PASS', L03: 'PASS', L05: 'PASS',
    H01: 'FAIL_CRITICAL', H03: 'FAIL_MAJOR', H05: 'FAIL_MAJOR',
    R01: 'PASS', R02: 'FAIL_CRITICAL', R03: 'PASS', R04: 'PASS',
  },
};

const RUNS = [
  { version: 'V3', dir: 'tutor-pedagogy-v3-eval', run: 'live-2026-08-13T04-20-50-906Z', verdicts: VERDICTS.v3 },
  { version: 'V4', dir: 'tutor-pedagogy-v4-eval', run: 'live-2026-08-13T05-13-27-853Z', verdicts: VERDICTS.v4 },
  { version: 'V5', dir: 'tutor-pedagogy-v5-eval', run: 'live-2026-08-13T22-57-27-024Z', verdicts: VERDICTS.v5 },
];

/** Corridas de reintento de V4 (mismo dataset) -- se usan solo para recuperar casos que expiraron en la principal. */
const V4_RETRY_RUNS = ['live-2026-08-13T05-18-11-513Z'];

function loadCases(dir) {
  const raw = JSON.parse(readFileSync(join(EXPERIMENTS, dir, 'dataset', 'cases.json'), 'utf8'));
  return new Map(raw.cases.map((c) => [c.id, c]));
}

function resolveFixture(name) {
  const key = FIXTURE_ALIASES[name] ?? name;
  return FIXTURES[key] ? { key, ...FIXTURES[key] } : null;
}

function readResult(dir, run, id) {
  const p = join(EXPERIMENTS, dir, 'results', run, `${id}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null;
}

const turns = [];

for (const { version, dir, run, verdicts } of RUNS) {
  const cases = loadCases(dir);
  for (const [id, kase] of cases) {
    if (kase.context?.kind !== 'question') continue;
    if (kase.preAnswer !== null && kase.preAnswer !== undefined) continue; // pregunta YA respondida -> no protegida
    const fixture = resolveFixture(kase.context.fixture);
    if (!fixture) throw new Error(`Fixture desconocido: ${kase.context.fixture}`);

    let result = readResult(dir, run, id);
    let sourceRun = run;
    if (version === 'V4' && (!result || result.status !== 'OK')) {
      for (const retry of V4_RETRY_RUNS) {
        const alt = readResult(dir, retry, id);
        if (alt && alt.status === 'OK') { result = alt; sourceRun = retry; break; }
      }
    }
    const verdict = verdicts[id] ?? 'UNKNOWN';

    if (!result || !Array.isArray(result.turns) || result.turns.length === 0) {
      turns.push({ version, caseId: id, turnIndex: null, verdict: 'TECHNICAL_FAILURE', skipped: true, subject: fixture.subject, fixture: fixture.key });
      continue;
    }

    for (const t of result.turns) {
      if (typeof t.output !== 'string' || t.output.length === 0) continue;
      turns.push({
        version,
        caseId: id,
        turnIndex: t.index ?? 0,
        turnKey: `${version}:${id}:T${t.index ?? 0}`,
        subject: fixture.subject,
        fixture: fixture.key,
        requestedMode: t.requestedMode ?? '(none->HINT_FIRST)',
        effectiveMode: t.requestedMode ?? 'HINT_FIRST',
        studentMessage: t.input,
        output: t.output,
        verdict,
        sourceRun,
        answerKey: fixture.correct,
        options: fixture.options,
        stem: fixture.stem,
        explanation: fixture.explanation,
      });
    }
  }
}

const outDir = join(HERE, 'corpus');
mkdirSync(outDir, { recursive: true });
const payload = {
  generatedBy: 'experiments/tutor-pedagogy-guardrail-backtest/extract-corpus.mjs',
  seedSource: SEED_SOURCE,
  note: 'Solo lectura sobre las evaluaciones congeladas V3/V4/V5. Cero llamadas a Anthropic.',
  runs: RUNS.map(({ version, dir, run }) => ({ version, dir, run })),
  turnCount: turns.filter((t) => !t.skipped).length,
  skippedTechnicalFailures: turns.filter((t) => t.skipped).map((t) => `${t.version}:${t.caseId}`),
  turns,
};
writeFileSync(join(outDir, 'protected-turns.json'), JSON.stringify(payload, null, 2), 'utf8');

console.log(`Turnos protegidos con texto real: ${payload.turnCount}`);
console.log(`Perdidos por fallo técnico (sin texto): ${payload.skippedTechnicalFailures.join(', ') || 'ninguno'}`);
for (const v of ['V3', 'V4', 'V5']) {
  const sub = turns.filter((t) => t.version === v && !t.skipped);
  console.log(`  ${v}: ${sub.length} turnos / ${new Set(sub.map((t) => t.caseId)).size} casos`);
}
