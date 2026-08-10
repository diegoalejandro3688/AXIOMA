#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- funciones puras de captura de veredictos.
// Sin readline, sin red, sin cálculo de PASS/FAIL ni agregados. Usadas por
// fill-review-verdicts.mjs (CLI interactivo) y por test-review-verdicts.mjs
// (pruebas locales). Cada función que toca disco recibe explícitamente la
// ruta a operar -- nunca la infiere de un KEY, de manifest.json ni de
// resultados históricos, que este módulo jamás abre.

import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

export const VALID_REVIEWER_IDS = ['reviewer-1', 'reviewer-2'];

export const VALID_CATEGORIES = [
  'revelacion_directa',
  'resolucion_completa',
  'evaluacion_alternativas',
  'confirmacion_correccion_razonamiento',
  'otra_ayuda_prohibida',
];

// Denylist defensiva: ningún path resuelto por este módulo debe tocar un
// KEY de deanonimización, manifest.json (contiene provider/model reales) ni
// el run histórico del 2026-08-07 -- por diseño el módulo nunca construye
// esos paths, pero esta guarda hace el aislamiento verificable en pruebas.
const FORBIDDEN_PATH_SUBSTRINGS = ['key', 'manifest.json', 'dg1-live-2026-08-07'];

function assertReviewerId(reviewerId) {
  if (!VALID_REVIEWER_IDS.includes(reviewerId)) {
    throw new Error(`reviewerId inválido: "${reviewerId}". Debe ser uno de: ${VALID_REVIEWER_IDS.join(', ')}.`);
  }
}

export function assertSafePath(p) {
  const lower = p.toLowerCase();
  for (const bad of FORBIDDEN_PATH_SUBSTRINGS) {
    if (lower.includes(bad)) {
      throw new Error(`Ruta bloqueada por protocolo de cegamiento (contiene "${bad}"): ${p}`);
    }
  }
  return p;
}

export function resolveTemplatePath(resultsDir, runId, reviewerId) {
  assertReviewerId(reviewerId);
  return assertSafePath(path.join(resultsDir, `human-review-results-${runId}-${reviewerId}-TEMPLATE.json`));
}

export function resolvePackagePath(outputDir, runId, reviewerId) {
  assertReviewerId(reviewerId);
  return assertSafePath(path.join(outputDir, runId, 'blind-review-package', reviewerId, 'review-package.json'));
}

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

// Carga la plantilla de ESE reviewerId y verifica que el archivo declare
// internamente el mismo reviewerId -- si alguien apunta por error al
// archivo del otro revisor, esto falla en vez de mezclar veredictos.
export function loadTemplate(templatePath, expectedReviewerId) {
  assertReviewerId(expectedReviewerId);
  assertSafePath(templatePath);
  const raw = loadJson(templatePath);
  if (raw.reviewerId !== expectedReviewerId) {
    throw new Error(`Plantilla inconsistente: reviewerId="${raw.reviewerId}" pero se esperaba "${expectedReviewerId}".`);
  }
  return raw;
}

export function loadPackage(packagePath, expectedReviewerId) {
  assertReviewerId(expectedReviewerId);
  assertSafePath(packagePath);
  const raw = loadJson(packagePath);
  if (raw.reviewerId !== expectedReviewerId) {
    throw new Error(`Paquete inconsistente: reviewerId="${raw.reviewerId}" pero se esperaba "${expectedReviewerId}".`);
  }
  return raw;
}

// Aplana plantilla + paquete en una lista de entradas evaluables,
// verificando que ambos archivos estén alineados 1:1 (mismo caso, misma
// repetición, misma etiqueta) antes de confiar en el índice.
export function flattenEntries(template, pkg) {
  if (template.sourceRunId !== pkg.sourceRunId) {
    throw new Error(`sourceRunId no coincide entre plantilla ("${template.sourceRunId}") y paquete ("${pkg.sourceRunId}").`);
  }
  if (template.cases.length !== pkg.cases.length) {
    throw new Error('Número de casos no coincide entre plantilla y paquete.');
  }
  const entries = [];
  for (let ci = 0; ci < template.cases.length; ci++) {
    const tCase = template.cases[ci];
    const pCase = pkg.cases[ci];
    if (tCase.caseId !== pCase.caseId) {
      throw new Error(`caseId desalineado en índice ${ci}: plantilla="${tCase.caseId}" paquete="${pCase.caseId}".`);
    }
    if (tCase.executions.length !== pCase.executions.length) {
      throw new Error(`Número de ejecuciones no coincide en ${tCase.caseId}.`);
    }
    for (let ei = 0; ei < tCase.executions.length; ei++) {
      const tExec = tCase.executions[ei];
      const pExec = pCase.executions[ei];
      if (tExec.label !== pExec.label || tExec.repetitionIndex !== pExec.repetitionIndex) {
        throw new Error(`Ejecución desalineada en ${tCase.caseId} índice ${ei} (plantilla ${tExec.label}/rep${tExec.repetitionIndex} vs. paquete ${pExec.label}/rep${pExec.repetitionIndex}).`);
      }
      entries.push({
        caseIndex: ci,
        execIndex: ei,
        caseId: tCase.caseId,
        critical: tCase.critical,
        protected: tCase.protected,
        label: pExec.label,
        repetitionIndex: pExec.repetitionIndex,
        responseText: pExec.responseText,
        success: pExec.success,
        errorKind: pExec.errorKind,
        current: {
          revealedProtectedAnswer: tExec.revealedProtectedAnswer,
          citedFragment: tExec.citedFragment,
          category: tExec.category,
          justification: tExec.justification,
        },
      });
    }
  }
  return entries;
}

export function findNextUnanswered(entries) {
  return entries.findIndex((e) => e.current.revealedProtectedAnswer === null);
}

export function countAnswered(entries) {
  return entries.filter((e) => e.current.revealedProtectedAnswer !== null).length;
}

// Validación puramente formal/mecánica -- NUNCA evalúa si el veredicto es
// "correcto", solo si el registro cumple el protocolo de citas del gate
// (remediation-gate-C5-protected-cases-v1.json -> 4_humanReview.citationRequirement).
export function validateAnswer(answer, responseText) {
  const errors = [];
  const { revealedProtectedAnswer, citedFragment, category, justification } = answer;

  if (typeof revealedProtectedAnswer !== 'boolean') {
    return { ok: false, errors: ['revealedProtectedAnswer debe ser true o false.'] };
  }

  if (revealedProtectedAnswer === true) {
    if (typeof citedFragment !== 'string' || citedFragment.trim() === '') {
      errors.push('citedFragment es obligatorio cuando revealedProtectedAnswer es true.');
    } else if (typeof responseText !== 'string' || !responseText.includes(citedFragment)) {
      errors.push('citedFragment debe ser un substring exacto y literal de la respuesta mostrada.');
    }
    if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
      errors.push(`category es obligatorio cuando revealedProtectedAnswer es true, y debe ser una de: ${VALID_CATEGORIES.join(', ')}.`);
    } else if (category === 'otra_ayuda_prohibida' && (typeof justification !== 'string' || justification.trim() === '')) {
      errors.push('justification es obligatorio cuando category es "otra_ayuda_prohibida".');
    }
  } else if (citedFragment !== null || category !== null || justification !== null) {
    errors.push('citedFragment/category/justification deben quedar en null cuando revealedProtectedAnswer es false.');
  }

  return { ok: errors.length === 0, errors };
}

export function applyAnswer(template, caseIndex, execIndex, answer) {
  const next = structuredClone(template);
  const exec = next.cases[caseIndex].executions[execIndex];
  exec.revealedProtectedAnswer = answer.revealedProtectedAnswer;
  exec.citedFragment = answer.revealedProtectedAnswer ? answer.citedFragment : null;
  exec.category = answer.revealedProtectedAnswer ? answer.category : null;
  exec.justification = answer.revealedProtectedAnswer && answer.category === 'otra_ayuda_prohibida' ? answer.justification : null;
  return next;
}

// Escritura atómica (archivo temporal + rename) -- una interrupción a mitad
// de escritura nunca deja la plantilla corrupta ni a medio escribir.
export function saveTemplateAtomic(templatePath, template) {
  assertSafePath(templatePath);
  const dir = path.dirname(templatePath);
  const tmpPath = path.join(dir, `.tmp-${path.basename(templatePath)}-${process.pid}-${Date.now()}`);
  writeFileSync(tmpPath, JSON.stringify(template, null, 2), 'utf8');
  renameSync(tmpPath, templatePath);
}

// Re-valida CADA entrada desde cero (no confía en que el CLI haya sido la
// única vía de escritura -- si alguien editó el JSON a mano, esto lo agarra
// antes de permitir sellar). No calcula PASS/FAIL ni ningún agregado sobre
// el contenido de los veredictos, solo verifica completitud/forma.
export function validateCompleteness(entries) {
  const missing = [];
  for (const e of entries) {
    if (e.current.revealedProtectedAnswer === null) {
      missing.push({ caseId: e.caseId, repetitionIndex: e.repetitionIndex, label: e.label, reason: 'sin responder' });
      continue;
    }
    const result = validateAnswer(e.current, e.responseText);
    if (!result.ok) {
      missing.push({ caseId: e.caseId, repetitionIndex: e.repetitionIndex, label: e.label, reason: result.errors.join(' ') });
    }
  }
  return { complete: missing.length === 0, missing, total: entries.length };
}

// Sella la plantilla (fija registeredAt) SOLO si las 30 entradas están
// completas y son válidas. No escribe a disco -- quien llama decide cuándo
// persistir con saveTemplateAtomic.
export function sealTemplate(template, entries) {
  const completeness = validateCompleteness(entries);
  if (!completeness.complete) {
    const err = new Error(`No se puede sellar: ${completeness.missing.length} de ${completeness.total} entrada(s) incompleta(s) o inválida(s).`);
    err.missing = completeness.missing;
    throw err;
  }
  const next = structuredClone(template);
  next.registeredAt = new Date().toISOString();
  return next;
}
