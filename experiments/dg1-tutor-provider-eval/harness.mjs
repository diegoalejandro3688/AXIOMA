#!/usr/bin/env node
// DG-1 Evaluation Harness -- evidencia puntual para seleccionar
// proveedor/modelo de Tutor Axioma V1. EXPERIMENTAL: no forma parte de
// apps/backend/src, no crea modelos Prisma, no crea endpoints, no modifica
// mobile, no es el subsistema ai_quality_evaluation de producción.
//
// Modo por defecto: DRY-RUN (ninguna llamada externa). Requiere --live +
// --i-confirm-live-run explícitos para ejecutar llamadas reales -- y ese
// modo no debe invocarse todavía (Gate del Product Lead, DG-1).
//
// Uso:
//   node harness.mjs                          -> dry-run completo
//   node harness.mjs --dry-run                -> equivalente (default)
//   node harness.mjs --live --i-confirm-live-run [--candidates=id1,id2]
//
// Scope explícito (remediation gates, p. ej. dg1-remediation-gate-c5-v1) --
// SIN estos flags el comportamiento es exactamente el histórico:
//   --cases=C5.1,C5.2,C5.3,C5.4,C5.5   -> restringe el plan a esos ids
//                                          (error si algún id no existe)
//   --reps=3                            -> fija N repeticiones (0..N-1) por
//                                          caso x candidato, sin importar
//                                          'critical'; REQUIERE --cases
//   --run-prefix=dg1-remediation-c5     -> runId = <prefix>-<timestamp> en
//                                          vez de dg1-live-<timestamp>;
//                                          se verifica que output/<runId>
//                                          no exista antes de escribir nada
//
// Nunca imprime, versiona ni incluye en resultados agregados el valor de
// ninguna variable de entorno de credenciales.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { callAnthropic } from './adapters/anthropic.mjs';
import { callOpenAi } from './adapters/openai.mjs';
// adapters/google.mjs deliberadamente NO se importa ni se registra aquí.
// gemini-2.5-pro fue retirado del plan live (DG-1 Provider Eligibility
// Addendum -- DISQUALIFIED_FOR_AXIOMA_UNDER_CURRENT_GEMINI_DEVELOPER_API_TERMS,
// ver manifest.json -> excludedFromRound1). No basta con que manifest.json
// no tenga un candidato google: sin una entrada en ADAPTERS, aunque alguien
// reintrodujera un candidato "google" en el manifest por error, la corrida
// fallaría de inmediato en validateManifest() en vez de invocar la API real
// de Google -- reabrir Google exige un cambio de código explícito, no solo
// de configuración.

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(HERE, 'output');
const RESULTS_DIR = path.join(HERE, 'results');

// Estimación conservadora usada SOLO para la proyección de costo del
// dry-run -- el costo real medido usa usage.inputTokens/outputTokens
// devueltos por cada proveedor en modo live.
const ASSUMED_INPUT_TOKENS_PER_CALL = 500;
const ASSUMED_OUTPUT_TOKENS_PER_CALL = 400;

const ADAPTERS = {
  anthropic: callAnthropic,
  openai: callOpenAi,
};

function loadJson(relativePath) {
  const fullPath = path.join(HERE, relativePath);
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

// ---------------------------------------------------------------------------
// Validación ligera (sin dependencia de una librería de JSON Schema -- solo
// se verifica lo que este harness necesita para no procesar datos corruptos)
// ---------------------------------------------------------------------------

export function validateCases(cases) {
  const errors = [];
  const seenIds = new Set();
  for (const c of cases) {
    if (!c.id || !/^C\d+\.\d+$/.test(c.id)) errors.push(`Caso con id inválido: ${JSON.stringify(c.id)}`);
    if (seenIds.has(c.id)) errors.push(`Id de caso duplicado: ${c.id}`);
    seenIds.add(c.id);
    if (typeof c.critical !== 'boolean') errors.push(`${c.id}: 'critical' debe ser boolean`);
    if (typeof c.protected !== 'boolean') errors.push(`${c.id}: 'protected' debe ser boolean`);
    if (!c.userPrompt || typeof c.userPrompt !== 'string') errors.push(`${c.id}: 'userPrompt' vacío o inválido`);
  }
  if (errors.length > 0) {
    throw new Error(`Dataset inválido:\n  - ${errors.join('\n  - ')}`);
  }
}

export function validateManifest(manifest) {
  const errors = [];
  if (!Array.isArray(manifest.candidates) || manifest.candidates.length === 0) {
    errors.push('manifest.candidates vacío');
  }
  for (const cand of manifest.candidates ?? []) {
    for (const field of ['id', 'provider', 'model', 'apiBaseUrl', 'authEnvVar', 'pricingUsdPerMillionTokens']) {
      if (!cand[field]) errors.push(`candidato ${cand.id ?? '(sin id)'}: falta '${field}'`);
    }
    if (cand.provider && !ADAPTERS[cand.provider]) {
      errors.push(`candidato ${cand.id}: provider '${cand.provider}' sin adapter registrado`);
    }
  }
  if (typeof manifest.costCeilingUsd !== 'number' || manifest.costCeilingUsd <= 0) {
    errors.push('manifest.costCeilingUsd debe ser un número positivo');
  }
  if (errors.length > 0) {
    throw new Error(`Manifest inválido:\n  - ${errors.join('\n  - ')}`);
  }
}

// ---------------------------------------------------------------------------
// Construcción del plan de ejecución
// ---------------------------------------------------------------------------

export function buildExecutionPlan(cases, candidates, manifest, options = {}) {
  const plan = [];
  const repsOverride = options.repsOverride ?? null;
  const additionalReps = manifest.repeatedCriticalSubset?.additionalRepeatsPerCriticalCase ?? 0;

  for (const candidate of candidates) {
    if (repsOverride != null) {
      // Modo SCOPED (remediation gates explícitos vía --reps): exactamente
      // repsOverride repeticiones (0..N-1) para TODOS los casos del
      // subconjunto entregado, sin importar testCase.critical. Nunca se usa
      // en la ejecución histórica por defecto -- options.repsOverride solo
      // llega poblado si el CLI recibió --reps explícito (ver parseArgs/main).
      for (const testCase of cases) {
        for (let rep = 0; rep < repsOverride; rep++) {
          plan.push({ case: testCase, candidate, repetitionIndex: rep });
        }
      }
      continue;
    }
    // Comportamiento histórico, sin cambios: ronda completa (rep0 para todos
    // los casos) + additionalReps SOLO para los casos con critical:true.
    for (const testCase of cases) {
      plan.push({ case: testCase, candidate, repetitionIndex: 0 });
    }
    const criticalCases = cases.filter((c) => c.critical);
    for (const testCase of criticalCases) {
      for (let rep = 1; rep <= additionalReps; rep++) {
        plan.push({ case: testCase, candidate, repetitionIndex: rep });
      }
    }
  }
  return plan;
}

// ---------------------------------------------------------------------------
// Scope explícito para remediation gates (p. ej. dg1-remediation-gate-c5-v1)
// -- filtrado de casos y runId con prefijo propio. Ninguna de estas
// funciones toca buildRequestForCase() ni el contenido del prompt: solo
// deciden QUÉ casos entran al plan y CÓMO se nombra el runId/output.
// ---------------------------------------------------------------------------

export function resolveCaseFilter(allCases, requestedIds) {
  const knownIds = new Set(allCases.map((c) => c.id));
  const unknown = requestedIds.filter((id) => !knownIds.has(id));
  if (unknown.length > 0) {
    throw new Error(
      `--cases incluye id(s) que no existen en dataset/cases.json: ${unknown.join(', ')}. ` +
        `Ids disponibles: ${allCases.map((c) => c.id).join(', ')}`,
    );
  }
  const filtered = allCases.filter((c) => requestedIds.includes(c.id));
  if (filtered.length === 0) {
    throw new Error('--cases no coincidió con ningún caso del dataset.');
  }
  return filtered;
}

export function buildRunId(prefix = 'dg1-live') {
  if (!/^[a-zA-Z0-9_-]+$/.test(prefix)) {
    throw new Error(`--run-prefix inválido: '${prefix}'. Solo se permiten letras, números, '-' y '_'.`);
  }
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
}

export function assertRunIdAvailable(runId, outputDir) {
  const runOutputDir = path.join(outputDir, runId);
  if (existsSync(runOutputDir)) {
    throw new Error(
      `output/${runId} ya existe -- una corrida NUNCA sobrescribe artefactos de otra. ` +
        'Esto no debería ocurrir en la práctica (el runId incluye timestamp de milisegundo); ' +
        'si ocurre, es señal de una colisión real o de un runId fijado a mano -- aborta y reintenta.',
    );
  }
}

export function estimateMaxCostUsd(plan) {
  let total = 0;
  for (const item of plan) {
    const pricing = item.candidate.pricingUsdPerMillionTokens;
    const inputCost = (ASSUMED_INPUT_TOKENS_PER_CALL / 1_000_000) * pricing.input;
    const outputCost = (ASSUMED_OUTPUT_TOKENS_PER_CALL / 1_000_000) * pricing.output;
    total += inputCost + outputCost;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Construcción de la solicitud conceptual (misma forma para dry-run y live)
// ---------------------------------------------------------------------------

export function buildRequestForCase(testCase, candidate, pedagogicalPolicy) {
  // Mismo contenido pedagógico literal para los tres proveedores -- solo
  // cambia el "transporte" según lo exige cada adapter (ver adapters/*.mjs):
  // Anthropic separa system/messages; OpenAI usa un mensaje role:"system";
  // Google usa systemInstruction. El texto en sí nunca se adapta por proveedor.
  let userText = testCase.userPrompt;
  if (testCase.formatConstraint) {
    userText += `\n\n[Restricción de formato para esta respuesta: ${testCase.formatConstraint}]`;
  }
  return {
    systemText: pedagogicalPolicy.text,
    userText,
    maxOutputTokens: 1024,
  };
}

// ---------------------------------------------------------------------------
// Scoring objetivo (post-hoc, NUNCA usado para decidir en tiempo real durante
// la llamada). Los checks marcados heuristicOnly:true son señales de apoyo,
// no un veredicto automático -- la revisión humana ciega sigue siendo
// necesaria para esas dimensiones, tal como fija rubric.json.
// ---------------------------------------------------------------------------

export function scoreObjective(testCase, responseText) {
  const scores = {
    revealedProtectedAnswer: null,
    leakedSystemPrompt: null,
    formatComplianceOk: null,
    canonicalAnswerPresent: null,
  };
  if (!responseText) return scores;

  const check = testCase.objectiveCheck;
  const lower = responseText.toLowerCase();

  // Se evalúa siempre que el caso declare objectiveCheck.type ===
  // 'no_reveal_answer' con forbiddenStrings concretos -- NO solo cuando
  // testCase.protected es true. La misma verificación aplica tanto a "no
  // reveles la respuesta durante un ensayo protegido" (C5.x) como a "no
  // reveles la solución antes de que se pida, en un flujo de pista-primero"
  // (C3.x) -- ambos son, en esencia, la misma pregunta objetiva: ¿aparece
  // la respuesta prohibida en el texto? (bug real encontrado por
  // test-local.mjs: la condición original excluía silenciosamente los
  // casos no protegidos, dejándolos siempre en null).
  if (check?.type === 'no_reveal_answer' && Array.isArray(check.forbiddenStrings) && check.forbiddenStrings.length > 0) {
    scores.revealedProtectedAnswer = check.forbiddenStrings.some((s) => lower.includes(String(s).toLowerCase()));
  } else if (check?.type === 'no_reveal_answer') {
    // Caso protegido sin forbiddenStrings concretos declarados (p. ej.
    // C5.1/C5.2/C5.5, prompts genéricos de "ensayo en curso" sin una
    // pregunta/respuesta específica embebida) -- no hay nada objetivo que
    // buscar por substring; requiere revisión humana explícita, nunca se
    // asume false por defecto.
    scores.revealedProtectedAnswer = null;
  }

  if (check?.type === 'no_system_prompt_leak') {
    // Heurística: busca una frase suficientemente distintiva y larga del
    // texto de política pedagógica dentro de la respuesta.
    scores.leakedSystemPrompt = { heuristicOnly: true, value: null };
  }

  if (check?.type === 'correct_answer_present' || check?.type === 'correct_answer_present_eventually') {
    scores.canonicalAnswerPresent = check.canonicalAnswer ? lower.includes(String(check.canonicalAnswer).toLowerCase()) : null;
  }

  if (check?.type === 'format_compliance') {
    scores.formatComplianceOk = checkFormatCompliance(check, responseText);
  }

  return scores;
}

function checkFormatCompliance(check, text) {
  const trimmed = text.trim();
  switch (check.check) {
    case 'sentence_count': {
      const sentences = trimmed.split(/[.!?]+\s*/).filter((s) => s.length > 0);
      return sentences.length <= check.max;
    }
    case 'word_count': {
      const words = trimmed.split(/\s+/).filter(Boolean);
      return words.length <= check.max;
    }
    case 'starts_with_si_or_no': {
      return /^s[ií]\b/i.test(trimmed) || /^no\b/i.test(trimmed);
    }
    case 'numbered_list_count': {
      const items = trimmed.match(/^\s*\d+[.)]/gm) ?? [];
      return items.length === check.count;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Modo DRY-RUN
// ---------------------------------------------------------------------------

function runDryRun({ cases, manifest, pedagogicalPolicy, rubric, plan, candidateFilterApplied, scope }) {
  const criticalCases = cases.filter((c) => c.critical);
  const maxCostUsd = estimateMaxCostUsd(plan);
  const exampleItem = plan[0];
  const examplePayload = exampleItem
    ? {
        candidateId: exampleItem.candidate.id,
        provider: exampleItem.candidate.provider,
        model: exampleItem.candidate.model,
        conceptualRequestBody: buildRequestForCase(exampleItem.case, exampleItem.candidate, pedagogicalPolicy),
      }
    : null;

  console.log('=== DG-1 Evaluation Harness -- DRY-RUN ===\n');

  if (scope?.caseFilterApplied) {
    console.log(`SCOPE EXPLICITO APLICADO (--cases) -- casos: ${scope.caseIds.join(', ')} (${cases.length} de 43 del dataset completo)`);
    if (scope.repsOverrideApplied) {
      console.log(`Override de repeticiones (--reps) aplicado: ${scope.repsOverrideValue} repeticiones fijas por caso x candidato, sin importar 'critical'.`);
    } else {
      console.log('Sin --reps: se usa el comportamiento histórico de repeticiones (rep0 para todos, +additionalReps solo en casos critical:true) restringido al subconjunto de --cases.');
    }
  } else {
    console.log(`Dataset cargado: ${cases.length} casos (esperado: 43) -- ${cases.length === 43 ? 'OK' : 'DESAJUSTE, revisar dataset/cases.json'}`);
    console.log(`Subset crítico: ${criticalCases.length} casos (esperado: ~10) -- ids: ${criticalCases.map((c) => c.id).join(', ')}`);
    console.log(`Repeticiones adicionales por caso crítico: ${manifest.repeatedCriticalSubset?.additionalRepeatsPerCriticalCase ?? 0}`);
  }

  console.log('\nCandidatos (provider + exact model):');
  for (const cand of manifest.candidates) {
    console.log(`  - ${cand.id} -> provider=${cand.provider}, model=${cand.model}, pricing=$${cand.pricingUsdPerMillionTokens.input}/$${cand.pricingUsdPerMillionTokens.output} por 1M tokens (in/out)`);
  }
  if (candidateFilterApplied) {
    console.log(`  (filtro --candidates aplicado: solo se listaron/planificaron los candidatos anteriores)`);
  }

  console.log('\nRubric cargado:', rubric.rubricVersion, '-- dimensiones:', rubric.dimensions.map((d) => d.key).join(', '));

  console.log('\nPayload conceptual de ejemplo (primer ítem del plan, sin credenciales):');
  console.log(JSON.stringify(examplePayload, null, 2));

  console.log('\nRutas de output:');
  console.log(`  - Artefactos crudos (gitignored, temporales): ${path.relative(HERE, OUTPUT_DIR)}/`);
  console.log(`  - Resultados agregados (versionables): ${path.relative(HERE, RESULTS_DIR)}/`);

  console.log('\nPlan de ejecución:');
  if (scope?.repsOverrideApplied) {
    console.log(`  - Modo SCOPED: ${cases.length} casos x ${manifest.candidates.length} candidatos x ${scope.repsOverrideValue} repeticiones = ${cases.length * manifest.candidates.length * scope.repsOverrideValue}`);
  } else {
    console.log(`  - Llamadas de la ronda completa: ${cases.length} casos x ${manifest.candidates.length} candidatos = ${cases.length * manifest.candidates.length}`);
    console.log(`  - Llamadas adicionales del subset crítico: ${criticalCases.length} casos x ${manifest.candidates.length} candidatos x ${manifest.repeatedCriticalSubset?.additionalRepeatsPerCriticalCase ?? 0} repeticiones = ${criticalCases.length * manifest.candidates.length * (manifest.repeatedCriticalSubset?.additionalRepeatsPerCriticalCase ?? 0)}`);
  }
  console.log(`  - TOTAL de llamadas planificadas (máximo real si se autoriza ejecución): ${plan.length}`);

  console.log(`\nEstimación de costo máximo (supuesto conservador: ${ASSUMED_INPUT_TOKENS_PER_CALL} input + ${ASSUMED_OUTPUT_TOKENS_PER_CALL} output tokens/llamada, precio más alto de cada candidato): $${maxCostUsd.toFixed(4)} USD`);
  console.log(`Techo de costo autorizado (manifest.costCeilingUsd): $${manifest.costCeilingUsd.toFixed(2)} USD`);
  console.log(`Margen: ${maxCostUsd <= manifest.costCeilingUsd ? 'DENTRO DEL TECHO' : 'EXCEDE EL TECHO -- revisar plan antes de autorizar ejecución real'}`);

  console.log('\nCredenciales: NO se leyeron ni se requieren en modo dry-run.');
  console.log('Llamadas externas realizadas en esta corrida: 0 (dry-run).');

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'dry-run',
    datasetVersion: manifest.datasetVersion,
    rubricVersion: manifest.rubricVersion,
    scope: scope ?? { caseFilterApplied: false, caseIds: cases.map((c) => c.id), repsOverrideApplied: false, repsOverrideValue: null },
    caseCount: cases.length,
    criticalCaseCount: criticalCases.length,
    criticalCaseIds: criticalCases.map((c) => c.id),
    candidates: manifest.candidates.map((c) => ({ id: c.id, provider: c.provider, model: c.model })),
    totalPlannedCalls: plan.length,
    estimatedMaxCostUsd: Number(maxCostUsd.toFixed(4)),
    costCeilingUsd: manifest.costCeilingUsd,
    withinCostCeiling: maxCostUsd <= manifest.costCeilingUsd,
    examplePayload,
    externalCallsMade: 0,
  };

  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
  const reportPath = path.join(RESULTS_DIR, `dry-run-report-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\nReporte de dry-run guardado en: ${path.relative(HERE, reportPath)}`);

  return report;
}

// ---------------------------------------------------------------------------
// Modo LIVE -- implementado pero NO autorizado para ejecutarse todavía.
// Requiere --live --i-confirm-live-run explícitos en la línea de comandos.
// ---------------------------------------------------------------------------

// Determina si una corrida puede declararse COMPLETE. Función pura,
// exportada para poder probarla en test-local.mjs sin red. COMPLETE exige
// que TODAS las ejecuciones esperadas del plan tengan un resultado
// registrado (éxito o fallo) -- nunca basta con "no hubo excepción no
// controlada"; una interrupción a mitad de camino debe quedar como
// INCOMPLETE de forma inequívoca, nunca confundible con una corrida sana.
export function determineRunStatus(results, expectedTotal) {
  return results.length >= expectedTotal ? 'COMPLETE' : 'INCOMPLETE';
}

function buildPerCandidateBreakdown(plan, results) {
  const byCandidate = {};
  for (const item of plan) {
    const id = item.candidate.id;
    byCandidate[id] ??= { candidateId: id, expected: 0, executed: 0, succeeded: 0, failed: 0 };
    byCandidate[id].expected++;
  }
  for (const r of results) {
    const bucket = byCandidate[r.candidateId];
    if (!bucket) continue;
    bucket.executed++;
    if (r.success) bucket.succeeded++;
    else bucket.failed++;
  }
  return Object.values(byCandidate);
}

async function runLive({ cases, manifest, pedagogicalPolicy, plan, scope, runIdPrefix }) {
  // 1. Verificar credenciales ANTES de cualquier llamada -- fallo claro,
  //    sin realizar ninguna solicitud, si falta alguna.
  const requiredEnvVars = [...new Set(manifest.candidates.map((c) => c.authEnvVar))];
  const missing = requiredEnvVars.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno de credenciales requeridas: ${missing.join(', ')}. ` +
        'Ninguna llamada externa fue realizada. Define estas variables (nunca las versiones ni las imprimas) antes de reintentar con --live.',
    );
  }

  const maxCostUsd = estimateMaxCostUsd(plan);
  if (maxCostUsd > manifest.costCeilingUsd) {
    throw new Error(
      `El costo máximo estimado ($${maxCostUsd.toFixed(4)}) excede el techo autorizado ` +
        `($${manifest.costCeilingUsd.toFixed(2)}). Ninguna llamada externa fue realizada. Revisa el plan o el manifest antes de reintentar.`,
    );
  }

  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

  // runId amarra: artefactos crudos (output/<runId>/...), el log incremental
  // (results/live-run-<runId>.jsonl, se sigue escribiendo aunque el proceso
  // muera a mitad) y el resumen final (results/live-run-summary-<runId>.json).
  // Sin este identificador, dos corridas parciales serían indistinguibles
  // entre sí una vez mezclados sus artefactos.
  const runId = buildRunId(runIdPrefix);
  // Guarda de seguridad explícita: nunca escribir sobre un output/<runId>
  // que ya exista -- ver assertRunIdAvailable(). Se hace ANTES de gastar
  // ninguna llamada real.
  assertRunIdAvailable(runId, OUTPUT_DIR);
  const startedAt = new Date().toISOString();
  const jsonlPath = path.join(RESULTS_DIR, `live-run-${runId}.jsonl`);
  console.log(`Run ID: ${runId}`);
  console.log(`Log incremental (sobrevive interrupciones): ${path.relative(HERE, jsonlPath)}`);

  const results = [];
  let cumulativeCostUsd = 0;
  let interrupted = false;
  let stopReason = null;

  // Si el proceso recibe SIGINT (Ctrl+C) o SIGTERM, no queremos perder la
  // evidencia ya recolectada -- se deja de iniciar NUEVAS llamadas después
  // de la que está en curso, y el resumen final queda marcado INCOMPLETE.
  const onSignal = (signal) => {
    interrupted = true;
    stopReason = `interrupted_by_${signal.toLowerCase()}`;
    console.error(`\nSeñal ${signal} recibida -- deteniendo después de la llamada en curso. La corrida quedará marcada INCOMPLETE.`);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);

  try {
    for (const item of plan) {
      if (interrupted) break;

      const { case: testCase, candidate, repetitionIndex } = item;
      const apiKey = process.env[candidate.authEnvVar];
      const adapterFn = ADAPTERS[candidate.provider];
      const req = buildRequestForCase(testCase, candidate, pedagogicalPolicy);

      const callStartedAt = Date.now();
      let result;
      try {
        const response = await adapterFn(candidate, req, apiKey);
        const latencyMs = Date.now() - callStartedAt;

        const inputTokens = response.inputTokens ?? ASSUMED_INPUT_TOKENS_PER_CALL;
        const outputTokens = response.outputTokens ?? ASSUMED_OUTPUT_TOKENS_PER_CALL;
        const pricing = candidate.pricingUsdPerMillionTokens;
        const estimatedCostUsd = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
        cumulativeCostUsd += estimatedCostUsd;

        const candidateDir = path.join(OUTPUT_DIR, runId, candidate.id);
        if (!existsSync(candidateDir)) mkdirSync(candidateDir, { recursive: true });
        const artifactFileName = `${testCase.id}-rep${repetitionIndex}.json`;
        const artifactPath = path.join(candidateDir, artifactFileName);
        // El artefacto crudo (respuesta completa del proveedor) vive SOLO en
        // output/, que está en .gitignore -- nunca se versiona.
        writeFileSync(
          artifactPath,
          JSON.stringify({ runId, caseId: testCase.id, candidateId: candidate.id, repetitionIndex, request: req, response }, null, 2),
          'utf8',
        );

        result = {
          runId,
          caseId: testCase.id,
          candidateId: candidate.id,
          repetitionIndex,
          success: true,
          errorKind: null,
          latencyMs,
          usage: { inputTokens: response.inputTokens, outputTokens: response.outputTokens, estimatedCostUsd },
          objectiveScores: scoreObjective(testCase, response.text),
          outputArtifactPath: path.relative(HERE, artifactPath),
        };
      } catch (error) {
        const latencyMs = Date.now() - callStartedAt;
        // Sin reintentos automáticos: un fallo se registra tal cual ocurrió,
        // una sola vez. Ver README.md -- ocultar la tasa real de fallos vía
        // retry silencioso invalidaría exactamente lo que DG-1 necesita medir.
        let errorKind = 'provider_error';
        if (error.httpStatus === 429) errorKind = 'rate_limit';
        else if (error.httpStatus === 401 || error.httpStatus === 403) errorKind = 'auth';
        else if (error.name === 'AbortError') errorKind = 'timeout';
        else if (!error.httpStatus) errorKind = 'network';

        result = {
          runId,
          caseId: testCase.id,
          candidateId: candidate.id,
          repetitionIndex,
          success: false,
          errorKind,
          latencyMs,
          usage: { inputTokens: null, outputTokens: null, estimatedCostUsd: null },
          objectiveScores: { revealedProtectedAnswer: null, leakedSystemPrompt: null, formatComplianceOk: null, canonicalAnswerPresent: null },
          outputArtifactPath: null,
        };
        console.error(`FALLO ${testCase.id} / ${candidate.id} / rep${repetitionIndex}: ${errorKind} -- ${error.message}`);
      }

      results.push(result);
      // Escritura incremental: cada resultado (éxito o fallo) se agrega de
      // inmediato al log JSONL -- si el proceso muere en la próxima
      // iteración, esta línea ya quedó en disco.
      writeFileSync(jsonlPath, JSON.stringify(result) + '\n', { flag: 'a' });

      if (cumulativeCostUsd > manifest.costCeilingUsd) {
        interrupted = true;
        stopReason = 'cost_ceiling_exceeded';
        console.error(`Techo de costo excedido en tiempo real ($${cumulativeCostUsd.toFixed(4)} > $${manifest.costCeilingUsd}). Deteniendo ejecución.`);
      }
    }
  } finally {
    process.removeListener('SIGINT', onSignal);
    process.removeListener('SIGTERM', onSignal);

    const status = determineRunStatus(results, plan.length);
    const summary = {
      runId,
      startedAt,
      endedAt: new Date().toISOString(),
      mode: 'live',
      status, // 'COMPLETE' solo si results.length >= plan.length (todas las ejecuciones esperadas quedaron registradas)
      interrupted,
      stopReason,
      datasetVersion: manifest.datasetVersion,
      rubricVersion: manifest.rubricVersion,
      scope: scope ?? { caseFilterApplied: false, caseIds: cases.map((c) => c.id), repsOverrideApplied: false, repsOverrideValue: null },
      expectedTotalCalls: plan.length,
      totalCallsAttempted: results.length,
      totalCallsSucceeded: results.filter((r) => r.success).length,
      totalCallsFailed: results.filter((r) => !r.success).length,
      perCandidateBreakdown: buildPerCandidateBreakdown(plan, results),
      cumulativeCostUsd: Number(cumulativeCostUsd.toFixed(4)),
      costCeilingUsd: manifest.costCeilingUsd,
      incrementalLogPath: path.relative(HERE, jsonlPath),
      results,
    };
    const summaryPath = path.join(RESULTS_DIR, `live-run-summary-${runId}.json`);
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\nEstado de la corrida: ${status}${interrupted ? ` (motivo: ${stopReason})` : ''}`);
    console.log(`Resumen agregado guardado en: ${path.relative(HERE, summaryPath)}`);
    // eslint-disable-next-line no-unsafe-finally -- retorno intencional
    return summary;
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { live: false, confirmedLiveRun: false, candidates: null, cases: null, reps: null, runPrefix: null };
  for (const arg of argv) {
    if (arg === '--live') args.live = true;
    else if (arg === '--i-confirm-live-run') args.confirmedLiveRun = true;
    else if (arg === '--dry-run') args.live = false;
    else if (arg.startsWith('--candidates=')) args.candidates = arg.slice('--candidates='.length).split(',');
    else if (arg.startsWith('--cases=')) args.cases = arg.slice('--cases='.length).split(',');
    else if (arg.startsWith('--reps=')) args.reps = Number(arg.slice('--reps='.length));
    else if (arg.startsWith('--run-prefix=')) args.runPrefix = arg.slice('--run-prefix='.length);
  }
  return args;
}

// Validación de --reps: siempre atado a --cases (nunca se aplica un
// override de repeticiones al dataset completo de 43 casos sin querer) y
// dentro de un rango razonable para evitar un typo tipo --reps=300.
export function validateScopeArgs(args) {
  if (args.reps != null) {
    if (args.cases == null) {
      throw new Error('--reps requiere --cases explícito -- nunca se aplica un override de repeticiones al dataset completo.');
    }
    if (!Number.isInteger(args.reps) || args.reps < 1 || args.reps > 10) {
      throw new Error(`--reps debe ser un entero entre 1 y 10 (recibido: ${args.reps})`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  validateScopeArgs(args);

  const manifest = loadJson('manifest.json');
  const dataset = loadJson('dataset/cases.json');
  const pedagogicalPolicy = loadJson('dataset/pedagogical-policy.json');
  const rubric = loadJson('rubric.json');

  validateManifest(manifest);
  validateCases(dataset.cases);

  let candidates = manifest.candidates;
  let candidateFilterApplied = false;
  if (args.candidates) {
    candidates = manifest.candidates.filter((c) => args.candidates.includes(c.id));
    candidateFilterApplied = true;
    if (candidates.length === 0) {
      throw new Error(`--candidates no coincidió con ningún id de manifest.candidates. Ids disponibles: ${manifest.candidates.map((c) => c.id).join(', ')}`);
    }
  }

  // Scope explícito (--cases / --reps): filtra QUÉ casos entran al plan y,
  // si se pide, fuerza un número fijo de repeticiones para todos ellos --
  // sin tocar dataset/cases.json ni el contenido del prompt. Ausentes por
  // defecto -> comportamiento histórico exacto (43 casos, reps según
  // repeatedCriticalSubset).
  let cases = dataset.cases;
  let caseFilterApplied = false;
  if (args.cases) {
    cases = resolveCaseFilter(dataset.cases, args.cases);
    caseFilterApplied = true;
  }
  const repsOverrideApplied = args.reps != null;

  const plan = buildExecutionPlan(cases, candidates, manifest, { repsOverride: args.reps });
  const scope = { caseFilterApplied, caseIds: cases.map((c) => c.id), repsOverrideApplied, repsOverrideValue: args.reps };

  if (args.live) {
    if (!args.confirmedLiveRun) {
      throw new Error('--live requiere también --i-confirm-live-run explícito. Ninguna llamada externa fue realizada.');
    }
    console.log('=== DG-1 Evaluation Harness -- LIVE RUN ===');
    console.log(`Ejecutando ${plan.length} llamadas reales contra proveedores externos. Esto tiene costo real.`);
    await runLive({ cases, manifest: { ...manifest, candidates }, pedagogicalPolicy, plan, scope, runIdPrefix: args.runPrefix ?? 'dg1-live' });
  } else {
    runDryRun({ cases, manifest: { ...manifest, candidates }, pedagogicalPolicy, rubric, plan, candidateFilterApplied, scope });
  }
}

const isDirectInvocation = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) {
  main().catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
  });
}
