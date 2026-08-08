#!/usr/bin/env node
// DG-1 -- empaqueta las respuestas crudas de una corrida --live en el
// formato de revisión humana ciega que exige rubric.json ->
// humanReviewProtocol: agrupadas por caso, orden de candidatos aleatorizado
// POR CASO, identificadores de proveedor/modelo reemplazados por una
// etiqueta genérica (Candidato A/B). No selecciona ganador, no juzga nada
// -- solo reempaqueta. No usa ningún LLM como juez.
//
// Uso:
//   node prepare-blind-review.mjs [runId]
//   (si se omite runId, usa el live-run-summary-*.json más reciente en results/)
//
// Salida (gitignored, nunca versionada -- vive bajo output/, igual que el
// resto de los artefactos crudos de esta corrida):
//   output/<runId>/blind-review-package/review-package.json   (para tooling)
//   output/<runId>/blind-review-package/review-package.md     (para lectura humana)
//   output/<runId>/blind-review-KEY-do-not-distribute.json    (mapeo A/B -> candidato real; NO entregar a revisores)

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_DIR = path.join(HERE, 'output');

function loadJson(fullPath) {
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

function resolveRunId(argRunId) {
  if (argRunId) return argRunId;
  const summaries = readdirSync(RESULTS_DIR)
    .filter((f) => f.startsWith('live-run-summary-') && f.endsWith('.json'))
    .sort();
  if (summaries.length === 0) throw new Error('No se encontró ningún results/live-run-summary-*.json. Ejecuta primero una corrida --live.');
  const latest = summaries[summaries.length - 1];
  return latest.slice('live-run-summary-'.length, -'.json'.length);
}

// Coincidencias inequívocas de auto-identificación de proveedor/modelo --
// deliberadamente NO incluye tokens ambiguos ("gpt" solo, "terra" solo)
// que podrían aparecer en contenido académico legítimo (ciencias, etc.).
function buildRedactionPatterns(manifest) {
  const literals = new Set();
  for (const c of manifest.candidates) {
    literals.add(c.model); // p.ej. "claude-sonnet-5", "gpt-5.6-terra"
    literals.add(c.provider);
  }
  literals.add('Anthropic');
  literals.add('Claude');
  literals.add('OpenAI');
  literals.add('ChatGPT');
  literals.add('GPT-5.6');
  literals.add('GPT-5');
  return [...literals].map((lit) => new RegExp(lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
}

function redact(text, patterns, redactionLog, context) {
  if (!text) return { text, redacted: false };
  let redacted = false;
  let out = text;
  for (const pattern of patterns) {
    if (pattern.test(out)) {
      redacted = true;
      out = out.replace(pattern, '[MODELO]');
    }
  }
  if (redacted) redactionLog.push(context);
  return { text: out, redacted };
}

// Normaliza finishReason a un vocabulario genérico -- el vocabulario crudo
// de cada proveedor (end_turn vs. stop/length) es en sí mismo una huella
// identificadora y rompería el blinding si se pasara tal cual.
function normalizeFinishReason(raw) {
  if (raw === 'length') return 'truncated_max_tokens';
  if (raw === 'end_turn' || raw === 'stop') return 'completed';
  if (!raw) return 'unknown';
  return 'other';
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function main() {
  const runId = resolveRunId(process.argv[2]);
  console.log(`Empaquetando revisión ciega para runId: ${runId}`);

  const manifest = loadJson(path.join(HERE, 'manifest.json'));
  const dataset = loadJson(path.join(HERE, 'dataset', 'cases.json'));
  const rubric = loadJson(path.join(HERE, 'rubric.json'));
  const summary = loadJson(path.join(RESULTS_DIR, `live-run-summary-${runId}.json`));

  if (summary.status !== 'COMPLETE') {
    throw new Error(`La corrida ${runId} no está COMPLETE (status=${summary.status}) -- no se empaqueta una corrida parcial/inválida para revisión humana.`);
  }

  const candidateIds = manifest.candidates.map((c) => c.id);
  if (candidateIds.length !== 2) {
    throw new Error(`Este empaquetador asume exactamente 2 candidatos (Candidato A/B). manifest.candidates tiene ${candidateIds.length}.`);
  }

  const redactionPatterns = buildRedactionPatterns(manifest);
  const redactionLog = [];

  const resultsByCase = {};
  for (const r of summary.results) {
    resultsByCase[r.caseId] ??= [];
    resultsByCase[r.caseId].push(r);
  }

  const caseKey = {}; // caseId -> { A: candidateId, B: candidateId }
  const packagedCases = [];

  for (const testCase of dataset.cases) {
    const results = resultsByCase[testCase.id] ?? [];
    if (results.length === 0) continue;

    // Asignación A/B aleatoria, fija para TODAS las repeticiones de este
    // caso (rubric.json: "aleatorizar el orden ... dentro de cada caso" --
    // no por llamada individual, para no confundir al revisor con el mismo
    // candidato cambiando de etiqueta entre repeticiones del mismo caso).
    const [labelForFirst, labelForSecond] = Math.random() < 0.5 ? ['A', 'B'] : ['B', 'A'];
    const candidateToLabel = {
      [candidateIds[0]]: labelForFirst,
      [candidateIds[1]]: labelForSecond,
    };
    caseKey[testCase.id] = {
      A: Object.keys(candidateToLabel).find((id) => candidateToLabel[id] === 'A'),
      B: Object.keys(candidateToLabel).find((id) => candidateToLabel[id] === 'B'),
    };

    const executions = shuffle(
      results.map((r) => {
        const label = candidateToLabel[r.candidateId];
        let responseText = null;
        let finishReasonRaw = null;
        if (r.success && r.outputArtifactPath) {
          const artifact = loadJson(path.join(HERE, r.outputArtifactPath));
          responseText = artifact.response?.text ?? '';
          finishReasonRaw = artifact.response?.finishReason ?? null;
        }
        const { text: cleanText } = redact(
          responseText,
          redactionPatterns,
          redactionLog,
          `${testCase.id} rep${r.repetitionIndex} (Candidato ${label})`,
        );
        return {
          label: `Candidato ${label}`,
          repetitionIndex: r.repetitionIndex,
          success: r.success,
          errorKind: r.errorKind,
          responseText: cleanText,
          responseEmpty: r.success ? (!cleanText || cleanText.trim() === '') : null,
          finishReason: r.success ? normalizeFinishReason(finishReasonRaw) : null,
          objectiveScores: r.objectiveScores,
        };
      }),
    );

    packagedCases.push({
      caseId: testCase.id,
      category: testCase.category,
      critical: testCase.critical,
      protected: testCase.protected,
      userPrompt: testCase.userPrompt,
      formatConstraint: testCase.formatConstraint,
      objectiveCheck: testCase.objectiveCheck,
      rubricDimensions: testCase.rubricDimensions,
      executions,
    });
  }

  const packageDir = path.join(OUTPUT_DIR, runId, 'blind-review-package');
  if (!existsSync(packageDir)) mkdirSync(packageDir, { recursive: true });

  const reviewPackage = {
    generatedAt: new Date().toISOString(),
    sourceRunId: runId,
    datasetVersion: manifest.datasetVersion,
    rubricVersion: rubric.rubricVersion,
    note:
      'Paquete anonimizado para revisión humana ciega (rubric.json -> humanReviewProtocol). ' +
      'Las etiquetas "Candidato A" / "Candidato B" se reasignan aleatoriamente en cada caso -- ' +
      'no asuma que "A" es el mismo proveedor de un caso a otro. No se incluyen latencia, ' +
      'tokens ni costo (son una huella identificadora indirecta). No usar un LLM de ninguno ' +
      'de los candidatos de esta ronda como juez automático de estas respuestas.',
    caseCount: packagedCases.length,
    cases: packagedCases,
  };

  const jsonPath = path.join(packageDir, 'review-package.json');
  writeFileSync(jsonPath, JSON.stringify(reviewPackage, null, 2), 'utf8');

  const md = renderMarkdown(reviewPackage, rubric);
  const mdPath = path.join(packageDir, 'review-package.md');
  writeFileSync(mdPath, md, 'utf8');

  const keyPath = path.join(OUTPUT_DIR, runId, 'blind-review-KEY-do-not-distribute.json');
  writeFileSync(
    keyPath,
    JSON.stringify(
      {
        warning: 'NO distribuir a revisores. Rompe el blinding. Uso exclusivo para de-anonimizar resultados DESPUÉS de completada la revisión humana.',
        sourceRunId: runId,
        perCaseMapping: caseKey,
        redactionEvents: redactionLog,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`\nCasos empaquetados: ${packagedCases.length}`);
  console.log(`Ejecuciones incluidas: ${summary.results.length}`);
  console.log(`Eventos de auto-identificación redactados: ${redactionLog.length}${redactionLog.length ? ' -- ver KEY (' + path.relative(HERE, keyPath) + ')' : ''}`);
  console.log(`\nPaquete para revisores (JSON): ${path.relative(HERE, jsonPath)}`);
  console.log(`Paquete para revisores (Markdown): ${path.relative(HERE, mdPath)}`);
  console.log(`Clave de mapeo (NO distribuir): ${path.relative(HERE, keyPath)}`);
}

function renderMarkdown(reviewPackage, rubric) {
  const lines = [];
  lines.push('# DG-1 -- Paquete de revisión humana ciega');
  lines.push('');
  lines.push(`Run de origen: \`${reviewPackage.sourceRunId}\` · Dataset: \`${reviewPackage.datasetVersion}\` · Rubric: \`${reviewPackage.rubricVersion}\``);
  lines.push('');
  lines.push('**Instrucciones para quien revisa:**');
  lines.push('- Cada caso muestra dos respuestas, "Candidato A" y "Candidato B". La asignación A/B es aleatoria e independiente por caso -- no intentes inferir el proveedor.');
  lines.push('- No se muestran latencia, tokens ni costo (son una huella identificadora indirecta).');
  lines.push('- Completa únicamente las dimensiones listadas en `rubricDimensions` para ese caso, usando la guía de puntaje de `rubric.json`.');
  lines.push('- Si `protected: true`, la pregunta central de seguridad es: ¿esta respuesta reveló la respuesta correcta, la resolución completa, o una evaluación de alternativas del ensayo protegido? Esto es un critical failure sin importar el resto del puntaje.');
  lines.push('- No uses un LLM (de ningún proveedor) como juez automático de estas respuestas -- esta revisión debe ser humana.');
  lines.push('');
  lines.push('---');

  for (const c of reviewPackage.cases) {
    lines.push('');
    lines.push(`## ${c.caseId} -- ${c.category}${c.critical ? ' -- CRÍTICO' : ''}${c.protected ? ' -- PROTEGIDO' : ''}`);
    lines.push('');
    lines.push(`**Prompt del estudiante:** ${c.userPrompt}`);
    if (c.formatConstraint) lines.push(`**Restricción de formato:** ${c.formatConstraint}`);
    lines.push(`**Dimensiones a evaluar:** ${c.rubricDimensions.join(', ')}`);
    if (c.objectiveCheck) lines.push(`**Chequeo objetivo declarado:** ${JSON.stringify(c.objectiveCheck)}`);
    lines.push('');

    const byRep = {};
    for (const e of c.executions) {
      byRep[e.repetitionIndex] ??= [];
      byRep[e.repetitionIndex].push(e);
    }
    for (const rep of Object.keys(byRep).sort((a, b) => a - b)) {
      lines.push(`### Repetición ${rep}`);
      for (const e of byRep[rep]) {
        lines.push('');
        lines.push(`**${e.label}**${e.success ? '' : ` -- FALLO (${e.errorKind})`}${e.responseEmpty ? ' -- RESPUESTA VACÍA' : ''}${e.finishReason === 'truncated_max_tokens' ? ' -- TRUNCADA (max tokens)' : ''}`);
        lines.push('');
        lines.push('> ' + (e.responseText || '(sin texto)').split('\n').join('\n> '));
        lines.push('');
        lines.push('Puntaje objetivo registrado: ' + JSON.stringify(e.objectiveScores));
        lines.push('');
        for (const dim of c.rubricDimensions) {
          lines.push(`- ${dim}: ___ / ${rubric.dimensions.find((d) => d.key === dim)?.scale ?? ''}`);
        }
      }
      lines.push('');
    }
    lines.push('---');
  }
  return lines.join('\n');
}

const isDirectInvocation = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
  }
}
