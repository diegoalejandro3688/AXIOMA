#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- funciones puras para el desempate del tercer
// adjudicador (sección 4.disagreementHandling.tieBreakProcedure). Reutiliza
// las funciones genéricas de review-verdicts-lib.mjs (validateAnswer,
// saveTemplateAtomic, validateCompleteness, sealTemplate, countAnswered,
// findNextUnanswered, VALID_CATEGORIES, assertSafePath) porque ese módulo
// ya opera sobre listas planas de "entries" con { current, responseText } --
// no depende de la estructura caso/candidato de los paquetes de revisor.
//
// Este módulo NO tiene acceso a candidateId, provider, model, reviewerId,
// ni al veredicto histórico -- estructuralmente no puede leerlos porque
// nunca abre esos archivos ni acepta esos campos.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  VALID_CATEGORIES,
  assertSafePath,
  validateAnswer,
  saveTemplateAtomic,
  validateCompleteness,
  sealTemplate,
  findNextUnanswered,
  countAnswered,
} from './review-verdicts-lib.mjs';

export const ADJUDICATOR_ID = 'adjudicator-3';

export {
  VALID_CATEGORIES,
  assertSafePath,
  validateAnswer,
  saveTemplateAtomic,
  validateCompleteness,
  sealTemplate,
  findNextUnanswered,
  countAnswered,
};

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function resolveAdjudicationPackagePath(outputDir, runId) {
  return assertSafePath(path.join(outputDir, runId, 'adjudication-package', 'adjudication-package.json'));
}

export function resolveAdjudicationTemplatePath(resultsDir, runId) {
  return assertSafePath(path.join(resultsDir, `adjudication-results-${runId}-${ADJUDICATOR_ID}-TEMPLATE.json`));
}

export function loadAdjudicationPackage(packagePath) {
  assertSafePath(packagePath);
  const raw = loadJson(packagePath);
  if (raw.adjudicatorId !== ADJUDICATOR_ID) {
    throw new Error(`Paquete de adjudicación inconsistente: adjudicatorId="${raw.adjudicatorId}" pero se esperaba "${ADJUDICATOR_ID}".`);
  }
  return raw;
}

export function loadAdjudicationTemplate(templatePath) {
  assertSafePath(templatePath);
  const raw = loadJson(templatePath);
  if (raw.adjudicatorId !== ADJUDICATOR_ID) {
    throw new Error(`Plantilla de adjudicación inconsistente: adjudicatorId="${raw.adjudicatorId}" pero se esperaba "${ADJUDICATOR_ID}".`);
  }
  return raw;
}

// Aplana plantilla + paquete en la misma forma de "entries" que usa
// review-verdicts-lib (current + responseText), verificando alineación
// disputeId a disputeId.
export function flattenDisputeEntries(template, pkg) {
  if (template.sourceRunId !== pkg.sourceRunId) {
    throw new Error(`sourceRunId no coincide entre plantilla ("${template.sourceRunId}") y paquete ("${pkg.sourceRunId}").`);
  }
  if (template.disputes.length !== pkg.disputes.length) {
    throw new Error('Número de disputas no coincide entre plantilla y paquete.');
  }
  const entries = [];
  for (let i = 0; i < template.disputes.length; i++) {
    const tD = template.disputes[i];
    const pD = pkg.disputes[i];
    if (tD.disputeId !== pD.disputeId) {
      throw new Error(`disputeId desalineado en índice ${i}: plantilla="${tD.disputeId}" paquete="${pD.disputeId}".`);
    }
    entries.push({
      index: i,
      disputeId: pD.disputeId,
      caseId: pD.caseId,
      critical: pD.critical,
      protected: pD.protected,
      userPrompt: pD.userPrompt,
      formatConstraint: pD.formatConstraint,
      postures: pD.postures,
      responseText: pD.responseText,
      current: {
        revealedProtectedAnswer: tD.revealedProtectedAnswer,
        citedFragment: tD.citedFragment,
        category: tD.category,
        justification: tD.justification,
      },
    });
  }
  return entries;
}

export function applyAdjudicationAnswer(template, disputeIndex, answer) {
  const next = structuredClone(template);
  const d = next.disputes[disputeIndex];
  d.revealedProtectedAnswer = answer.revealedProtectedAnswer;
  d.citedFragment = answer.revealedProtectedAnswer ? answer.citedFragment : null;
  d.category = answer.revealedProtectedAnswer ? answer.category : null;
  d.justification = answer.revealedProtectedAnswer && answer.category === 'otra_ayuda_prohibida' ? answer.justification : null;
  return next;
}
