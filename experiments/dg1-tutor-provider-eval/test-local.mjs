#!/usr/bin/env node
// Pruebas locales del harness de DG-1 -- CERO llamadas externas. Verifica
// carga de datos, validación de schema, construcción del plan de ejecución
// y las funciones de scoring objetivo con entradas sintéticas fijas.
//
// Uso: node test-local.mjs

import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function loadJson(relativePath) {
  return JSON.parse(readFileSync(path.join(HERE, relativePath), 'utf8'));
}

let failures = 0;
function check(label, fn) {
  try {
    fn();
    console.log(`  OK  ${label}`);
  } catch (error) {
    console.error(`FALLO ${label} -- ${error.message}`);
    failures++;
  }
}

console.log('--- 1. Dataset y manifest cargan y tienen la forma esperada ---');
const dataset = loadJson('dataset/cases.json');
const manifest = loadJson('manifest.json');
const rubric = loadJson('rubric.json');
const pedagogicalPolicy = loadJson('dataset/pedagogical-policy.json');

check('dataset.cases tiene exactamente 43 casos', () => {
  assert.equal(dataset.cases.length, 43);
});
check('todos los ids de caso son únicos', () => {
  const ids = dataset.cases.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});
check('el subset crítico tiene aproximadamente 10 casos', () => {
  const criticalCount = dataset.cases.filter((c) => c.critical).length;
  assert.ok(criticalCount >= 8 && criticalCount <= 12, `esperado ~10, obtuvo ${criticalCount}`);
});
check('el subset crítico cubre las cinco categorías pedidas por el Product Lead', () => {
  const critical = dataset.cases.filter((c) => c.critical);
  const hasMath = critical.some((c) => c.category === 'guided_math_paes');
  const hasProtected = critical.some((c) => c.category === 'protected_activity_request');
  const hasInjection = critical.some((c) => c.manipulationAttempt === true);
  const hasFormat = critical.some((c) => c.category === 'strict_format');
  const hasUncertainty = critical.some((c) => c.category === 'ambiguous_incomplete');
  assert.ok(hasMath, 'falta razonamiento matemático en el subset crítico');
  assert.ok(hasProtected, 'falta no-revelación protegida en el subset crítico');
  assert.ok(hasInjection, 'falta resistencia a manipulación en el subset crítico');
  assert.ok(hasFormat, 'falta instruction following en el subset crítico');
  assert.ok(hasUncertainty, 'falta reconocimiento de incertidumbre en el subset crítico');
});
check('manifest tiene exactamente 2 candidatos en la ronda 1 (Google retirado -- DISQUALIFIED_FOR_AXIOMA_UNDER_CURRENT_GEMINI_DEVELOPER_API_TERMS)', () => {
  assert.equal(manifest.candidates.length, 2);
});
check('los dos proveedores de la ronda 1 son anthropic/openai, sin duplicados, sin google', () => {
  const providers = manifest.candidates.map((c) => c.provider).sort();
  assert.deepEqual(providers, ['anthropic', 'openai']);
});
check('google-gemini-2.5-pro está registrado en excludedFromRound1 con el motivo de descalificación exacto', () => {
  const entry = manifest.excludedFromRound1.find((e) => e.id === 'google-gemini-2.5-pro');
  assert.ok(entry, 'falta la entrada de exclusión para google-gemini-2.5-pro');
  assert.equal(entry.reason, 'DISQUALIFIED_FOR_AXIOMA_UNDER_CURRENT_GEMINI_DEVELOPER_API_TERMS');
});
check('las variables de credenciales requeridas son EXACTAMENTE Anthropic + OpenAI -- DG1_GOOGLE_API_KEY ya no es requisito y Google no puede invocarse accidentalmente', () => {
  const requiredEnvVars = [...new Set(manifest.candidates.map((c) => c.authEnvVar))].sort();
  assert.deepEqual(requiredEnvVars, ['DG1_ANTHROPIC_API_KEY', 'DG1_OPENAI_API_KEY']);
});
check('pricing de GPT-5.6 Terra refleja la corrección del Product Lead ($2/$12)', () => {
  const openai = manifest.candidates.find((c) => c.provider === 'openai');
  assert.equal(openai.pricingUsdPerMillionTokens.input, 2.0);
  assert.equal(openai.pricingUsdPerMillionTokens.output, 12.0);
});
check('gemini-3.1-pro-preview no aparece entre los candidatos de la ronda 1', () => {
  assert.ok(!manifest.candidates.some((c) => c.model.includes('preview')));
});
check('rubric define las 7 dimensiones esperadas', () => {
  const keys = rubric.dimensions.map((d) => d.key).sort();
  assert.deepEqual(keys, ['correctness', 'cost', 'instructionFollowing', 'latency', 'pedagogicalQuality', 'reliability', 'safetyPolicyCompliance']);
});
check('pedagogicalPolicy tiene texto no vacío', () => {
  assert.ok(pedagogicalPolicy.text.length > 100);
});

console.log('\n--- 2. Construcción del plan de ejecución (sin llamadas) ---');
{
  const { buildExecutionPlan, estimateMaxCostUsd } = await importHarnessInternals();
  const plan = buildExecutionPlan(dataset.cases, manifest.candidates, manifest);
  const criticalCount = dataset.cases.filter((c) => c.critical).length;
  const additionalReps = manifest.repeatedCriticalSubset.additionalRepeatsPerCriticalCase;
  const expected = dataset.cases.length * manifest.candidates.length + criticalCount * manifest.candidates.length * additionalReps;

  check('el tamaño del plan coincide con el cálculo esperado (ronda completa + repeticiones críticas)', () => {
    assert.equal(plan.length, expected);
  });
  check('el costo máximo estimado del plan completo queda por debajo del techo de $10', () => {
    const cost = estimateMaxCostUsd(plan);
    assert.ok(cost <= manifest.costCeilingUsd, `costo estimado $${cost.toFixed(4)} excede el techo $${manifest.costCeilingUsd}`);
  });
}

console.log('\n--- 2b. Scope explícito para remediation gates (--cases/--reps/--run-prefix, sin llamadas) ---');
{
  const { buildExecutionPlan, buildRequestForCase, resolveCaseFilter, buildRunId, assertRunIdAvailable, validateScopeArgs } = await importHarnessInternals();
  const REMEDIATION_CASE_IDS = ['C5.1', 'C5.2', 'C5.3', 'C5.4', 'C5.5'];

  check('resolveCaseFilter selecciona exactamente C5.1-C5.5, en ese orden, sin casos extra', () => {
    const filtered = resolveCaseFilter(dataset.cases, REMEDIATION_CASE_IDS);
    assert.deepEqual(filtered.map((c) => c.id), REMEDIATION_CASE_IDS);
  });
  check('resolveCaseFilter rechaza un id que no existe en el dataset (nunca se ignora en silencio)', () => {
    assert.throws(() => resolveCaseFilter(dataset.cases, ['C5.1', 'C99.9']), /C99\.9/);
  });

  const remediationCases = resolveCaseFilter(dataset.cases, REMEDIATION_CASE_IDS);
  const remediationPlan = buildExecutionPlan(remediationCases, manifest.candidates, manifest, { repsOverride: 3 });

  check('el plan scoped tiene exactamente 30 llamadas (5 casos x 2 candidatos x 3 repeticiones)', () => {
    assert.equal(remediationPlan.length, 30);
  });
  check('el plan scoped cubre exactamente los 5 casos del gate, ninguno de los 38 restantes', () => {
    const idsInPlan = new Set(remediationPlan.map((item) => item.case.id));
    assert.deepEqual([...idsInPlan].sort(), [...REMEDIATION_CASE_IDS].sort());
  });
  check('el plan scoped da exactamente 3 repeticiones (0,1,2) por caso x candidato, incluidos los no-critical', () => {
    for (const candidate of manifest.candidates) {
      for (const caseId of REMEDIATION_CASE_IDS) {
        const reps = remediationPlan
          .filter((item) => item.candidate.id === candidate.id && item.case.id === caseId)
          .map((item) => item.repetitionIndex)
          .sort();
        assert.deepEqual(reps, [0, 1, 2], `${candidate.id}/${caseId}: reps=${JSON.stringify(reps)}`);
      }
    }
  });
  check("validateScopeArgs exige --cases cuando se pasa --reps (nunca se aplica al dataset completo sin querer)", () => {
    assert.throws(() => validateScopeArgs({ reps: 3, cases: null }), /--reps requiere --cases/);
    assert.doesNotThrow(() => validateScopeArgs({ reps: 3, cases: REMEDIATION_CASE_IDS }));
  });
  check('validateScopeArgs rechaza --reps fuera de [1,10]', () => {
    assert.throws(() => validateScopeArgs({ reps: 0, cases: REMEDIATION_CASE_IDS }), /entre 1 y 10/);
    assert.throws(() => validateScopeArgs({ reps: 300, cases: REMEDIATION_CASE_IDS }), /entre 1 y 10/);
  });

  check('ejecución normal SIN flags de scope conserva el alcance histórico exacto (126 llamadas, 43 casos)', () => {
    const historicalPlan = buildExecutionPlan(dataset.cases, manifest.candidates, manifest);
    const criticalCount = dataset.cases.filter((c) => c.critical).length;
    const additionalReps = manifest.repeatedCriticalSubset.additionalRepeatsPerCriticalCase;
    const expected = dataset.cases.length * manifest.candidates.length + criticalCount * manifest.candidates.length * additionalReps;
    assert.equal(historicalPlan.length, expected);
    assert.equal(historicalPlan.length, 126, 'el total histórico esperado para el dataset actual es 126');
    // Sin options.repsOverride, un caso no-critical del subconjunto C5.x debe
    // seguir teniendo UNA sola repetición, tal como antes de este cambio.
    const c51Reps = historicalPlan.filter((item) => item.case.id === 'C5.1' && item.candidate.id === 'anthropic-claude-sonnet-5').length;
    assert.equal(c51Reps, 1, 'C5.1 (critical:false) no debe ganar repeticiones extra sin --reps explícito');
  });

  check('buildRequestForCase produce, para C5.1-C5.5, el mismo systemText/userText que el artefacto crudo del run original DG-1', () => {
    for (const caseId of REMEDIATION_CASE_IDS) {
      const testCase = dataset.cases.find((c) => c.id === caseId);
      const req = buildRequestForCase(testCase, manifest.candidates[0], pedagogicalPolicy);
      const originalArtifact = loadJson(`output/dg1-live-2026-08-07T19-09-03-432Z/anthropic-claude-sonnet-5/${caseId}-rep0.json`);
      assert.equal(req.systemText, originalArtifact.request.systemText, `${caseId}: systemText difiere del run original`);
      assert.equal(req.userText, originalArtifact.request.userText, `${caseId}: userText difiere del run original`);
    }
  });

  check('buildRunId(): sin prefijo produce el formato histórico dg1-live-<timestamp>; con prefijo, uno separado', () => {
    const historical = buildRunId();
    const remediation = buildRunId('dg1-remediation-c5');
    assert.ok(historical.startsWith('dg1-live-'), `formato histórico inesperado: ${historical}`);
    assert.ok(remediation.startsWith('dg1-remediation-c5-'), `formato de remediation inesperado: ${remediation}`);
    assert.notEqual(historical, remediation);
  });
  check('buildRunId() rechaza un prefijo con caracteres no seguros para un path', () => {
    assert.throws(() => buildRunId('../etc'), /inválido/);
  });

  check('assertRunIdAvailable() nunca permite escribir sobre el run frozen original', () => {
    assert.throws(
      () => assertRunIdAvailable('dg1-live-2026-08-07T19-09-03-432Z', path.join(HERE, 'output')),
      /ya existe/,
      'el run original YA existe en disco y debe bloquear cualquier intento de reusar su runId',
    );
  });
  check('assertRunIdAvailable() no bloquea un runId nuevo que aún no tiene directorio', () => {
    const probeOutputDir = path.join(HERE, 'output');
    const probeRunId = `dg1-remediation-c5-__test-probe-${process.pid}`;
    const probeDir = path.join(probeOutputDir, probeRunId);
    assert.ok(!existsSync(probeDir), 'precondición rota: el directorio de prueba ya existía');
    assert.doesNotThrow(() => assertRunIdAvailable(probeRunId, probeOutputDir));
    // Simula que el runId pasa a estar "tomado" y confirma que ahí sí bloquea.
    mkdirSync(probeDir, { recursive: true });
    assert.throws(() => assertRunIdAvailable(probeRunId, probeOutputDir), /ya existe/);
    rmSync(probeDir, { recursive: true, force: true }); // limpieza -- no dejar artefactos de prueba
  });
}

console.log('\n--- 3. Scoring objetivo con entradas sintéticas fijas (sin llamadas) ---');
{
  const { scoreObjective } = await importHarnessInternals();

  const protectedCase = dataset.cases.find((c) => c.id === 'C3.2');
  check('scoreObjective detecta revelación de respuesta prohibida (caso sintético)', () => {
    const scores = scoreObjective(protectedCase, 'La respuesta correcta es 45, calculado como 15% de 300.');
    assert.equal(scores.revealedProtectedAnswer, true);
  });
  check('scoreObjective NO marca revelación cuando la respuesta no aparece (caso sintético)', () => {
    const scores = scoreObjective(protectedCase, 'Para resolver esto, piensa en qué significa 15% como fracción de 300.');
    assert.equal(scores.revealedProtectedAnswer, false);
  });

  const mathCase = dataset.cases.find((c) => c.id === 'C3.8');
  check('scoreObjective detecta la presencia de la respuesta canónica (caso sintético)', () => {
    const scores = scoreObjective(mathCase, 'El 20% de 150 es 30, porque 150 x 0.20 = 30.');
    assert.equal(scores.canonicalAnswerPresent, true);
  });

  const formatCase = dataset.cases.find((c) => c.id === 'C8.1');
  check('scoreObjective aprueba una sola oración cuando se pide max_one_sentence', () => {
    const scores = scoreObjective(formatCase, 'Una función lineal es una relación cuya representación gráfica es una línea recta.');
    assert.equal(scores.formatComplianceOk, true);
  });
  check('scoreObjective rechaza múltiples oraciones cuando se pide max_one_sentence', () => {
    const scores = scoreObjective(formatCase, 'Una función lineal es una relación matemática. Su gráfico es una recta. Tiene pendiente constante.');
    assert.equal(scores.formatComplianceOk, false);
  });

  const yesNoCase = dataset.cases.find((c) => c.id === 'C8.3');
  check('scoreObjective valida el formato sí/no', () => {
    const scores = scoreObjective(yesNoCase, 'No, por ejemplo 6 es par pero no es divisible por 4.');
    assert.equal(scores.formatComplianceOk, true);
  });
}

console.log('\n--- 4. Integridad de corrida parcial (determineRunStatus, sin llamadas) ---');
{
  const { determineRunStatus } = await importHarnessInternals();

  check('una corrida con todos los resultados esperados se declara COMPLETE', () => {
    const fakeResults = Array.from({ length: 189 }, () => ({ success: true }));
    assert.equal(determineRunStatus(fakeResults, 189), 'COMPLETE');
  });
  check('una corrida interrumpida a mitad (menos resultados que el total esperado) se declara INCOMPLETE', () => {
    const fakeResults = Array.from({ length: 87 }, () => ({ success: true }));
    assert.equal(determineRunStatus(fakeResults, 189), 'INCOMPLETE');
  });
  check('una corrida con 0 resultados (interrumpida antes de la primera llamada) se declara INCOMPLETE, nunca COMPLETE', () => {
    assert.equal(determineRunStatus([], 189), 'INCOMPLETE');
  });
  check('una corrida con fallos registrados (no solo éxitos) igual cuenta para COMPLETE -- un fallo real no debe desaparecer de la evidencia', () => {
    const fakeResults = [
      ...Array.from({ length: 5 }, () => ({ success: true })),
      { success: false, errorKind: 'rate_limit' },
      { success: false, errorKind: 'timeout' },
    ];
    assert.equal(determineRunStatus(fakeResults, 7), 'COMPLETE');
  });
}

console.log(`\n${failures === 0 ? 'Todas las pruebas locales pasaron.' : `${failures} prueba(s) fallaron.`}`);
process.exit(failures === 0 ? 0 : 1);

async function importHarnessInternals() {
  // Importa harness.mjs directamente -- main() está protegido por un guard
  // de invocación directa (import.meta.url vs. process.argv[1]), así que
  // importar el módulo aquí NO dispara ninguna llamada externa.
  return import('./harness.mjs');
}
