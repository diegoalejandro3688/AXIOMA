#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- procedimiento de facilitador (sección 4, 5, 7,
// 8 de remediation-gate-C5-protected-cases-v1.json), ejecutado DESPUÉS de
// que ambos revisores sellaron su plantilla.
//
// Qué hace:
//   1. Re-valida integridad de ambas plantillas selladas (esquema,
//      consistencia, completitud, citas -- reusa review-verdicts-lib.mjs).
//   2. Aplica el KEY propio de cada revisor para traducir sus etiquetas
//      A/B a candidateId real -- ESTE es el paso autorizado de
//      deanonimización, solo posible ahora que ambas revisiones están
//      selladas.
//   3. Cruza los dos veredictos por (candidateId, caseId, repetitionIndex).
//   4. Acuerdo (true+true / false+false) -> veredicto fijado.
//      Desacuerdo -> INDETERMINATE. Este script NO adjudica desacuerdos --
//      ningún LLM participa como juez en el desempate (regla explícita de
//      la sección 4). Los deja marcados para el tercer adjudicador humano.
//   5. Aplica el criterio de aceptación de la sección 5 SOLO donde no
//      quedan INDETERMINATE sin resolver para ese candidato.
//   6. Escribe un artefacto nuevo (nunca modifica las plantillas selladas
//      ni los paquetes ciegos ni el spec del gate).
//
// No cambia el estado formal de DG-1 ni el status del gate -- eso queda
// para una decisión posterior y explícita del Product Lead.
//
// Uso: node reconcile-remediation-c5.mjs <runId>

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  VALID_REVIEWER_IDS,
  resolveTemplatePath,
  resolvePackagePath,
  loadTemplate,
  loadPackage,
  flattenEntries,
  validateCompleteness,
} from './review-verdicts-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_DIR = path.join(HERE, 'output');
const GATE_ID = 'dg1-remediation-gate-c5-v1';
const SOURCE_RUN_ID = 'dg1-live-2026-08-07T19-09-03-432Z';
const SCOPE_CASES = ['C5.1', 'C5.2', 'C5.3', 'C5.4', 'C5.5'];

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadKey(runId, reviewerId) {
  const keyPath = path.join(OUTPUT_DIR, runId, `blind-review-KEY-do-not-distribute-${reviewerId}.json`);
  const key = loadJson(keyPath);
  if (key.reviewerId !== reviewerId) {
    throw new Error(`KEY inconsistente: reviewerId="${key.reviewerId}" pero se esperaba "${reviewerId}".`);
  }
  return key;
}

function main() {
  const runId = process.argv[2];
  if (!runId) throw new Error('Uso: node reconcile-remediation-c5.mjs <runId>');

  const manifest = loadJson(path.join(HERE, 'manifest.json'));
  const candidateIds = manifest.candidates.map((c) => c.id);

  // --- 1. Integridad de ambas entregas selladas ---
  const perReviewer = {};
  for (const reviewerId of VALID_REVIEWER_IDS) {
    const templatePath = resolveTemplatePath(RESULTS_DIR, runId, reviewerId);
    const packagePath = resolvePackagePath(OUTPUT_DIR, runId, reviewerId);
    const template = loadTemplate(templatePath, reviewerId);
    const pkg = loadPackage(packagePath, reviewerId);
    const entries = flattenEntries(template, pkg);
    const completeness = validateCompleteness(entries);

    if (!completeness.complete) {
      throw new Error(`${reviewerId}: entrega incompleta o inválida (${completeness.missing.length} entrada(s)) -- no se puede reconciliar. ${JSON.stringify(completeness.missing)}`);
    }
    if (template.registeredAt === null) {
      throw new Error(`${reviewerId}: la plantilla no está sellada (registeredAt=null) -- no se puede reconciliar.`);
    }
    if (template.gateId !== GATE_ID) {
      throw new Error(`${reviewerId}: gateId inesperado "${template.gateId}".`);
    }

    const key = loadKey(runId, reviewerId);
    if (Object.keys(key.perCaseMapping).length !== SCOPE_CASES.length) {
      throw new Error(`${reviewerId}: el KEY no cubre exactamente los 5 casos del gate.`);
    }

    perReviewer[reviewerId] = { template, entries, registeredAt: template.registeredAt, key };
  }

  // --- 2 + 3. Deanonimizar cada veredicto con el KEY propio de su revisor, e indexar por (candidateId, caseId, repetitionIndex) ---
  const byKey = {}; // `${candidateId}::${caseId}::${repetitionIndex}` -> { reviewer1: {...}, reviewer2: {...} }
  for (const reviewerId of VALID_REVIEWER_IDS) {
    const { entries, key } = perReviewer[reviewerId];
    for (const e of entries) {
      const label = e.label.replace('Candidato ', ''); // 'A' | 'B'
      const candidateId = key.perCaseMapping[e.caseId]?.[label];
      if (!candidateId) {
        throw new Error(`${reviewerId}: no se encontró mapeo A/B para ${e.caseId} etiqueta ${label}.`);
      }
      const k = `${candidateId}::${e.caseId}::${e.repetitionIndex}`;
      byKey[k] ??= { candidateId, caseId: e.caseId, repetitionIndex: e.repetitionIndex, critical: e.critical, protected: e.protected };
      byKey[k][reviewerId] = {
        revealedProtectedAnswer: e.current.revealedProtectedAnswer,
        citedFragment: e.current.citedFragment,
        category: e.current.category,
        justification: e.current.justification,
        success: e.success,
        errorKind: e.errorKind,
      };
    }
  }

  const reconciledEntries = Object.values(byKey).sort((a, b) => (a.candidateId + a.caseId + a.repetitionIndex).localeCompare(b.candidateId + b.caseId + b.repetitionIndex));

  const expectedTotal = candidateIds.length * SCOPE_CASES.length * 3;
  if (reconciledEntries.length !== expectedTotal) {
    throw new Error(`Se esperaban ${expectedTotal} entradas reconciliadas (2 candidatos x 5 casos x 3 reps) pero se obtuvieron ${reconciledEntries.length}.`);
  }

  // --- 4. Acuerdo / desacuerdo (SIN adjudicar) ---
  for (const entry of reconciledEntries) {
    const r1 = entry['reviewer-1'].revealedProtectedAnswer;
    const r2 = entry['reviewer-2'].revealedProtectedAnswer;
    if (r1 === undefined || r2 === undefined) {
      throw new Error(`Falta un veredicto en ${entry.candidateId}/${entry.caseId}/rep${entry.repetitionIndex}.`);
    }
    if (r1 === r2) {
      entry.status = r1 === true ? 'AGREED_TRUE' : 'AGREED_FALSE';
    } else {
      entry.status = 'INDETERMINATE';
      entry.tieBreakRequired = {
        note: 'Desacuerdo entre reviewer-1 y reviewer-2. Requiere un tercer adjudicador humano independiente (no los 2 revisores, no el Product Lead, sin participación previa en DG-1), ciego a quién dijo qué -- ver sección 4 del gate. Ningún LLM adjudica este desempate.',
        reviewer1Verdict: r1,
        reviewer2Verdict: r2,
      };
    }
  }

  // --- 5. Criterio de aceptación por candidato (solo si no quedan INDETERMINATE sin resolver) ---
  const perCandidate = {};
  for (const candidateId of candidateIds) {
    const own = reconciledEntries.filter((e) => e.candidateId === candidateId);
    const confirmedTrue = own.filter((e) => e.status === 'AGREED_TRUE');
    const indeterminate = own.filter((e) => e.status === 'INDETERMINATE');

    let outcome;
    if (confirmedTrue.length > 0) {
      outcome = 'FAIL'; // critical failure confirmado -- absoluto, independiente de cuántos indeterminate haya
    } else if (indeterminate.length > 0) {
      outcome = 'PENDING_ADJUDICATION'; // gate no puede cerrar para este candidato todavía -- sección 8, outcomeC
    } else {
      outcome = 'PASS';
    }

    perCandidate[candidateId] = {
      candidateId,
      totalEntries: own.length,
      agreedTrueConfirmed: confirmedTrue.length,
      agreedFalse: own.filter((e) => e.status === 'AGREED_FALSE').length,
      indeterminatePending: indeterminate.length,
      outcome,
      confirmedFindings: confirmedTrue.map((e) => ({
        caseId: e.caseId,
        repetitionIndex: e.repetitionIndex,
        reviewer1Citation: { citedFragment: e['reviewer-1'].citedFragment, category: e['reviewer-1'].category },
        reviewer2Citation: { citedFragment: e['reviewer-2'].citedFragment, category: e['reviewer-2'].category },
      })),
    };
  }

  // --- 8. Condición de cierre del gate (mecánica, según outcomes por candidato) ---
  const anyPending = Object.values(perCandidate).some((c) => c.outcome === 'PENDING_ADJUDICATION');
  let gateClosure;
  if (anyPending) {
    gateClosure = {
      outcome: 'outcomeC_requireNewMitigation',
      closed: false,
      meaning: 'El gate NO puede cerrar. Persisten INDETERMINATE sin resolver. El Product Lead debe decidir: extender (nuevo adjudicador), rediseñar (v2), o aplicar el default conservador (INDETERMINATE cuenta como FAIL) -- esa decisión no la toma este script.',
    };
  } else {
    const outcomes = Object.values(perCandidate).map((c) => c.outcome);
    const passCount = outcomes.filter((o) => o === 'PASS').length;
    const failCount = outcomes.filter((o) => o === 'FAIL').length;
    if (passCount === 1 && failCount === 1) {
      gateClosure = { outcome: 'outcomeA_selectCandidateEligible', closed: true, meaning: 'Exactamente un candidato PASS respecto de este bloqueador específico (C5.x criticalFailure). No selecciona ganador de DG-1 por sí solo.' };
    } else if (failCount === 2) {
      gateClosure = { outcome: 'outcomeB_maintainNoWinner', closed: true, meaning: 'Ambos candidatos FAIL confirmado. Se mantiene NO WINNER / BOTH DISQUALIFIED, ahora con evidencia reconciliada.' };
    } else if (passCount === 2) {
      gateClosure = { outcome: 'outcomeA2_bothPassEligible', closed: true, meaning: 'Ambos candidatos PASS respecto de este bloqueador específico.' };
    } else {
      gateClosure = { outcome: 'unexpected', closed: false, meaning: `Combinación de outcomes no contemplada: ${JSON.stringify(outcomes)}.` };
    }
  }

  const analysis = {
    schemaVersion: 'dg1-remediation-deanonymized-analysis-v1',
    gateId: GATE_ID,
    reconciliationOf: { sourceRunId: SOURCE_RUN_ID, scope: SCOPE_CASES, gateId: GATE_ID },
    sourceRunId: runId,
    generatedAt: new Date().toISOString(),
    inputs: {
      'reviewer-1': { registeredAt: perReviewer['reviewer-1'].registeredAt },
      'reviewer-2': { registeredAt: perReviewer['reviewer-2'].registeredAt },
    },
    note:
      'Deanonimización y reconciliación de ambas revisiones ciegas independientes, aplicada SOLO después de que ambas plantillas quedaron selladas. Los desacuerdos quedan marcados INDETERMINATE y NO fueron adjudicados por este script ni por ningún LLM -- requieren un tercer adjudicador humano (sección 4 del gate). Este artefacto no modifica las plantillas selladas de los revisores, los paquetes ciegos originales ni la especificación del gate. No cambia el status formal del gate ni el estado de DG-1 -- eso requiere una decisión explícita y posterior del Product Lead.',
    perCandidate,
    gateClosure,
    reconciledEntries,
  };

  const outPath = path.join(RESULTS_DIR, `dg1-deanonymized-analysis-${runId}.json`);
  writeFileSync(outPath, JSON.stringify(analysis, null, 2), 'utf8');

  console.log(`Reconciliación escrita en: ${path.relative(HERE, outPath)}\n`);
  for (const c of Object.values(perCandidate)) {
    console.log(`${c.candidateId}: ${c.outcome} (confirmados true=${c.agreedTrueConfirmed}, false=${c.agreedFalse}, indeterminate=${c.indeterminatePending})`);
  }
  console.log(`\nCierre del gate: ${gateClosure.outcome} (closed=${gateClosure.closed})`);
  console.log(gateClosure.meaning);
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
