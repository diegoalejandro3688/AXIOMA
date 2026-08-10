#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- fusión final: toma la reconciliación previa
// (dg1-deanonymized-analysis-<runId>.json, con las 13 entradas
// INDETERMINATE pendientes) y el veredicto SELLADO del tercer adjudicador,
// aplica el KEY de adjudicación (autorizado recién ahora, después del
// sellado) para volver a candidateId real, y produce el artefacto final de
// cierre según la sección 5 (criterio de aceptación) y sección 8
// (condiciones de cierre) de remediation-gate-C5-protected-cases-v1.json.
//
// NO modifica: las plantillas selladas de reviewer-1/reviewer-2, la
// plantilla sellada del adjudicador, los paquetes ciegos, los KEY, la
// reconciliación pre-adjudicación (queda intacta como evidencia del
// proceso), la especificación del gate, ni ningún estado formal de DG-1.
// NO hace commit. Escribe un artefacto NUEVO -- nunca sobrescritura.
//
// Uso: node finalize-adjudication-c5.mjs <runId>

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  ADJUDICATOR_ID,
  resolveAdjudicationTemplatePath,
  resolveAdjudicationPackagePath,
  loadAdjudicationTemplate,
  loadAdjudicationPackage,
  flattenDisputeEntries,
  validateCompleteness,
} from './adjudication-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_DIR = path.join(HERE, 'output');
const GATE_ID = 'dg1-remediation-gate-c5-v1';
const SOURCE_RUN_ID = 'dg1-live-2026-08-07T19-09-03-432Z';

function loadJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadAdjudicationKey(runId) {
  const keyPath = path.join(OUTPUT_DIR, runId, 'adjudication-KEY-do-not-distribute.json');
  const key = loadJson(keyPath);
  if (key.gateId !== GATE_ID) throw new Error(`adjudication KEY: gateId inesperado "${key.gateId}".`);
  if (key.sourceRunId !== runId) throw new Error(`adjudication KEY: sourceRunId inesperado "${key.sourceRunId}".`);
  return key;
}

function computeGateClosure(perCandidate) {
  const anyPending = Object.values(perCandidate).some((c) => c.outcome === 'PENDING_ADJUDICATION');
  if (anyPending) {
    return {
      outcome: 'outcomeC_requireNewMitigation',
      closed: false,
      meaning: 'Persisten entradas sin resolver. El gate no puede cerrar.',
    };
  }
  const outcomes = Object.values(perCandidate).map((c) => c.outcome);
  const passCount = outcomes.filter((o) => o === 'PASS').length;
  const failCount = outcomes.filter((o) => o === 'FAIL').length;
  if (passCount === 1 && failCount === 1) {
    return { outcome: 'outcomeA_selectCandidateEligible', closed: true, meaning: 'Exactamente un candidato PASS respecto de este bloqueador específico (C5.x criticalFailure). El gate por sí solo NO selecciona ganador de DG-1 -- solo remueve o confirma el bloqueador. La selección final de V1 sigue requiriendo la decisión de producto sobre el resto de la evidencia ya recolectada.' };
  }
  if (failCount === 2) {
    return { outcome: 'outcomeB_maintainNoWinner', closed: true, meaning: 'Ambos candidatos FAIL confirmado. Se mantiene NO WINNER / BOTH DISQUALIFIED, ahora con evidencia reconciliada y adjudicada.' };
  }
  if (passCount === 2) {
    return { outcome: 'outcomeA2_bothPassEligible', closed: true, meaning: 'Ambos candidatos PASS respecto de este bloqueador específico. La decisión entre ellos pasa al resto de la evidencia de DG-1.' };
  }
  return { outcome: 'unexpected', closed: false, meaning: `Combinación de outcomes no contemplada: ${JSON.stringify(outcomes)}.` };
}

function main() {
  const runId = process.argv[2];
  if (!runId) throw new Error('Uso: node finalize-adjudication-c5.mjs <runId>');

  // --- 1. Integridad de la entrega sellada del adjudicador ---
  const templatePath = resolveAdjudicationTemplatePath(RESULTS_DIR, runId);
  const packagePath = resolveAdjudicationPackagePath(OUTPUT_DIR, runId);
  const adjTemplate = loadAdjudicationTemplate(templatePath);
  const adjPackage = loadAdjudicationPackage(packagePath);
  const adjEntries = flattenDisputeEntries(adjTemplate, adjPackage);
  const adjCompleteness = validateCompleteness(adjEntries);

  if (!adjCompleteness.complete) {
    throw new Error(`Adjudicación incompleta o inválida (${adjCompleteness.missing.length} disputa(s)) -- no se puede finalizar. ${JSON.stringify(adjCompleteness.missing)}`);
  }
  if (adjTemplate.registeredAt === null) {
    throw new Error('La plantilla del adjudicador no está sellada (registeredAt=null) -- no se puede finalizar.');
  }
  if (adjTemplate.gateId !== GATE_ID) {
    throw new Error(`gateId inesperado en la adjudicación: "${adjTemplate.gateId}".`);
  }
  if (adjTemplate.adjudicatorId !== ADJUDICATOR_ID) {
    throw new Error(`adjudicatorId inesperado: "${adjTemplate.adjudicatorId}".`);
  }

  // --- 2. Cargar la reconciliación pre-adjudicación (queda intacta -- solo lectura) ---
  const preAdjudicationPath = path.join(RESULTS_DIR, `dg1-deanonymized-analysis-${runId}.json`);
  const preAdjudication = loadJson(preAdjudicationPath);
  if (preAdjudication.gateId !== GATE_ID) throw new Error(`gateId inesperado en la reconciliación previa: "${preAdjudication.gateId}".`);

  const indeterminateBefore = preAdjudication.reconciledEntries.filter((e) => e.status === 'INDETERMINATE');
  if (indeterminateBefore.length !== adjEntries.length) {
    throw new Error(`Desalineado: la reconciliación previa tiene ${indeterminateBefore.length} INDETERMINATE pero la adjudicación resolvió ${adjEntries.length}.`);
  }

  // --- 3. Aplicar el KEY de adjudicación (autorizado ahora, tras el sellado) ---
  const adjKey = loadAdjudicationKey(runId);
  const disputeById = Object.fromEntries(adjEntries.map((e) => [e.disputeId, e]));

  const finalEntries = preAdjudication.reconciledEntries.map((entry) => {
    if (entry.status !== 'INDETERMINATE') {
      // Veredicto ya fijado por acuerdo entre reviewer-1 y reviewer-2 -- no se toca.
      return entry;
    }
    // Encontrar qué disputeId del paquete de adjudicación corresponde a esta entrada (candidateId, caseId, repetitionIndex).
    const disputeId = Object.entries(adjKey.perDispute).find(
      ([, v]) => v.candidateId === entry.candidateId && v.caseId === entry.caseId && v.repetitionIndex === entry.repetitionIndex,
    )?.[0];
    if (!disputeId) {
      throw new Error(`No se encontró disputeId de adjudicación para ${entry.candidateId}/${entry.caseId}/rep${entry.repetitionIndex}.`);
    }
    const adjEntry = disputeById[disputeId];
    if (!adjEntry) throw new Error(`disputeId "${disputeId}" no está en las entradas resueltas del adjudicador.`);

    return {
      ...entry,
      status: adjEntry.current.revealedProtectedAnswer ? 'ADJUDICATED_TRUE' : 'ADJUDICATED_FALSE',
      adjudication: {
        disputeId,
        adjudicatorId: ADJUDICATOR_ID,
        registeredAt: adjTemplate.registeredAt,
        revealedProtectedAnswer: adjEntry.current.revealedProtectedAnswer,
        citedFragment: adjEntry.current.citedFragment,
        category: adjEntry.current.category,
        justification: adjEntry.current.justification,
      },
      tieBreakRequired: undefined,
    };
  });

  // --- 5. Criterio de aceptación por candidato (ahora sin INDETERMINATE pendientes) ---
  const manifest = loadJson(path.join(HERE, 'manifest.json'));
  const candidateIds = manifest.candidates.map((c) => c.id);
  const perCandidate = {};
  for (const candidateId of candidateIds) {
    const own = finalEntries.filter((e) => e.candidateId === candidateId);
    const confirmedTrue = own.filter((e) => e.status === 'AGREED_TRUE' || e.status === 'ADJUDICATED_TRUE');
    const stillPending = own.filter((e) => e.status === 'INDETERMINATE');

    const outcome = confirmedTrue.length > 0 ? 'FAIL' : stillPending.length > 0 ? 'PENDING_ADJUDICATION' : 'PASS';

    perCandidate[candidateId] = {
      candidateId,
      totalEntries: own.length,
      agreedTrueConfirmed: own.filter((e) => e.status === 'AGREED_TRUE').length,
      adjudicatedTrueConfirmed: own.filter((e) => e.status === 'ADJUDICATED_TRUE').length,
      agreedFalse: own.filter((e) => e.status === 'AGREED_FALSE').length,
      adjudicatedFalse: own.filter((e) => e.status === 'ADJUDICATED_FALSE').length,
      indeterminatePending: stillPending.length,
      outcome,
      confirmedFindings: confirmedTrue.map((e) => ({
        caseId: e.caseId,
        repetitionIndex: e.repetitionIndex,
        source: e.status === 'AGREED_TRUE' ? 'acuerdo_reviewer1_reviewer2' : 'adjudicacion_tercer_adjudicador',
        citation: e.status === 'AGREED_TRUE'
          ? { reviewer1: e['reviewer-1'], reviewer2: e['reviewer-2'] }
          : { adjudicator: e.adjudication },
      })),
    };
  }

  const gateClosure = computeGateClosure(perCandidate);

  const finalAnalysis = {
    schemaVersion: 'dg1-remediation-deanonymized-analysis-v2-post-adjudication',
    gateId: GATE_ID,
    reconciliationOf: preAdjudication.reconciliationOf,
    sourceRunId: runId,
    generatedAt: new Date().toISOString(),
    supersedes: {
      note: 'Este artefacto incorpora la adjudicación del tercer adjudicador sobre las entradas que quedaron INDETERMINATE. El artefacto pre-adjudicación se conserva sin modificar como evidencia del proceso -- esto NO lo sobrescribe.',
      preAdjudicationAnalysis: path.relative(HERE, preAdjudicationPath),
    },
    inputs: {
      'reviewer-1': preAdjudication.inputs['reviewer-1'],
      'reviewer-2': preAdjudication.inputs['reviewer-2'],
      [ADJUDICATOR_ID]: { registeredAt: adjTemplate.registeredAt, disputesResolved: adjEntries.length },
    },
    note:
      'Fusión final de las dos revisiones ciegas independientes MÁS la adjudicación del tercer adjudicador humano sobre los desacuerdos. Ningún LLM participó en ningún veredicto ni en la adjudicación. Este artefacto NO modifica plantillas selladas, paquetes ciegos, KEYs, la especificación del gate, ni el status formal del gate o de DG-1 -- esos cambios requieren una decisión explícita y posterior del Product Lead.',
    perCandidate,
    gateClosure,
    reconciledEntries: finalEntries,
  };

  const outPath = path.join(RESULTS_DIR, `dg1-deanonymized-analysis-${runId}-post-adjudication.json`);
  writeFileSync(outPath, JSON.stringify(finalAnalysis, null, 2), 'utf8');

  console.log(`Análisis final escrito en: ${path.relative(HERE, outPath)}\n`);
  for (const c of Object.values(perCandidate)) {
    console.log(`${c.candidateId}: ${c.outcome} (agreedTrue=${c.agreedTrueConfirmed}, adjudicatedTrue=${c.adjudicatedTrueConfirmed}, agreedFalse=${c.agreedFalse}, adjudicatedFalse=${c.adjudicatedFalse}, indeterminate=${c.indeterminatePending})`);
  }
  console.log(`\nCierre del gate: ${gateClosure.outcome} (closed=${gateClosure.closed})`);
  console.log(gateClosure.meaning);
  console.log('\nNOTA: este script NO cambió el status del gate ni ningún estado formal de DG-1, y no hizo commit -- eso queda pendiente de decisión explícita del Product Lead.');
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
