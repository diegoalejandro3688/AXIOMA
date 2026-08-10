#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- captura interactiva de veredictos del tercer
// adjudicador. Equivalente a fill-review-verdicts.mjs pero sobre la lista
// plana de disputas INDETERMINATE. 100% local: sin red, sin leer ningún
// KEY, sin leer manifest.json, sin leer el veredicto histórico, sin saber
// cuál revisor dijo qué en cada postura.
//
// No calcula PASS/FAIL ni ningún agregado. El veredicto de cada disputa es
// una decisión humana del adjudicador; este programa solo la captura,
// valida su forma y la guarda.
//
// Uso:
//   node fill-adjudication-verdicts.mjs [runId]

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VALID_CATEGORIES,
  resolveAdjudicationTemplatePath,
  resolveAdjudicationPackagePath,
  loadAdjudicationTemplate,
  loadAdjudicationPackage,
  flattenDisputeEntries,
  findNextUnanswered,
  countAnswered,
  validateAnswer,
  applyAdjudicationAnswer,
  saveTemplateAtomic,
  validateCompleteness,
  sealTemplate,
} from './adjudication-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_DIR = path.join(HERE, 'output');
const DEFAULT_RUN_ID = 'dg1-remediation-c5-2026-08-10T07-31-22-251Z';

function loadState(templatePath, packagePath) {
  const template = loadAdjudicationTemplate(templatePath);
  const pkg = loadAdjudicationPackage(packagePath);
  const entries = flattenDisputeEntries(template, pkg);
  return { template, entries };
}

async function promptDispute(rl, entry, templatePath, template) {
  console.log('\n' + '-'.repeat(72));
  console.log(`Disputa ${entry.disputeId} -- caso ${entry.caseId}${entry.critical ? ' [CRÍTICO]' : ''}${entry.protected ? ' [PROTEGIDO]' : ''}`);
  console.log('-'.repeat(72));
  console.log(`Prompt del estudiante: ${entry.userPrompt}`);
  if (entry.formatConstraint) console.log(`Restricción de formato: ${entry.formatConstraint}`);
  console.log('\nRespuesta en disputa:');
  console.log(entry.responseText || '(sin texto)');
  console.log('\nPosturas en disputa (anónimas -- NO elijas entre ellas, evalúa tú mismo desde cero):');
  for (const p of entry.postures) {
    const cita = p.citedFragment ? ` -- cita: "${p.citedFragment}" (${p.category})` : '';
    const just = p.justification ? ` -- justificación: ${p.justification}` : '';
    console.log(`  ${p.postureLabel}: revealedProtectedAnswer=${p.revealedProtectedAnswer}${cita}${just}`);
  }
  console.log('-'.repeat(72));

  let revealed;
  for (;;) {
    const ans = (await rl.question('Tu veredicto -- revealedProtectedAnswer? [t/f]: ')).trim().toLowerCase();
    if (ans === 't' || ans === 'true') { revealed = true; break; }
    if (ans === 'f' || ans === 'false') { revealed = false; break; }
    console.log('Responde "t" (true) o "f" (false).');
  }

  let citedFragment = null;
  let category = null;
  let justification = null;

  if (revealed) {
    for (;;) {
      citedFragment = await rl.question('Pega TU fragmento EXACTO (substring literal) de la respuesta que activa tu veredicto: ');
      if (citedFragment.trim() !== '' && entry.responseText && entry.responseText.includes(citedFragment)) break;
      console.log('Ese texto no aparece exactamente en la respuesta mostrada (revisa mayúsculas/espacios/saltos de línea). Intenta de nuevo.');
    }
    console.log('\nCategorías válidas:');
    VALID_CATEGORIES.forEach((c, i) => console.log(`  ${i + 1}) ${c}`));
    for (;;) {
      const catAns = (await rl.question('Elige categoría [1-5]: ')).trim();
      const i = Number(catAns) - 1;
      if (Number.isInteger(i) && i >= 0 && i < VALID_CATEGORIES.length) { category = VALID_CATEGORIES[i]; break; }
      console.log(`Elige un número entre 1 y ${VALID_CATEGORIES.length}.`);
    }
    if (category === 'otra_ayuda_prohibida') {
      for (;;) {
        justification = await rl.question('Justificación (obligatoria para "otra_ayuda_prohibida"): ');
        if (justification.trim() !== '') break;
        console.log('La justificación no puede quedar vacía.');
      }
    }
  }

  const answer = { revealedProtectedAnswer: revealed, citedFragment, category, justification };
  const validation = validateAnswer(answer, entry.responseText);
  if (!validation.ok) {
    console.log('\nNo se guardó esta disputa:');
    validation.errors.forEach((e) => console.log(`  - ${e}`));
    return;
  }

  const updated = applyAdjudicationAnswer(template, entry.index, answer);
  saveTemplateAtomic(templatePath, updated);
  console.log('Guardado.');
}

async function reviewMode(rl, entries, templatePath, template) {
  console.log('\nDisputas (número -- id -- caso -- estado):');
  entries.forEach((e, i) => {
    const status = e.current.revealedProtectedAnswer === null ? 'pendiente' : `respondida (revealedProtectedAnswer=${e.current.revealedProtectedAnswer})`;
    console.log(`  ${i + 1}) ${e.disputeId} -- ${e.caseId} -- ${status}`);
  });
  const ans = (await rl.question('Número de disputa a revisar/editar (o vacío para cancelar): ')).trim();
  if (ans === '') return;
  const idx = Number(ans) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
    console.log('Número inválido.');
    return;
  }
  await promptDispute(rl, entries[idx], templatePath, template);
}

async function sealFlow(rl, templatePath, template, entries) {
  const completeness = validateCompleteness(entries);
  if (!completeness.complete) {
    console.log(`\nNo se puede sellar todavía: ${completeness.missing.length} de ${completeness.total} disputa(s) incompleta(s) o inválida(s).`);
    completeness.missing.forEach((m) => console.log(`  - ${m.caseId}: ${m.reason}`));
    return false;
  }
  const confirm = (await rl.question(`\nLas ${completeness.total} disputas están completas. ¿Confirmas sellar y finalizar? [s/N]: `)).trim().toLowerCase();
  if (confirm !== 's' && confirm !== 'si' && confirm !== 'sí') {
    console.log('Cancelado -- no se selló.');
    return false;
  }
  const sealed = sealTemplate(template, entries);
  saveTemplateAtomic(templatePath, sealed);
  console.log(`\nSellado. registeredAt = ${sealed.registeredAt}`);
  console.log('Entrega este archivo únicamente al facilitador.');
  return true;
}

async function main() {
  const runId = process.argv[2] || DEFAULT_RUN_ID;
  const templatePath = resolveAdjudicationTemplatePath(RESULTS_DIR, runId);
  const packagePath = resolveAdjudicationPackagePath(OUTPUT_DIR, runId);

  console.log('=== DG-1 Remediation Gate C5 -- captura de veredictos (tercer adjudicador) ===');
  console.log('100% local -- sin llamadas de red. Solo se leen/escriben tus propios archivos.');
  console.log('No sabes cuál revisor dijo qué en cada postura, ni la identidad del proveedor/modelo.\n');

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      const { template, entries } = loadState(templatePath, packagePath);
      const answered = countAnswered(entries);

      console.log(`\nProgreso: ${answered}/${entries.length} disputas respondidas.`);
      console.log('1) Continuar con la siguiente disputa pendiente');
      console.log('2) Revisar/editar una disputa ya respondida');
      console.log('3) Sellar y finalizar (requiere todas las disputas completas y válidas)');
      console.log('4) Salir (tu progreso ya está guardado en disco)');
      const choice = (await rl.question('> ')).trim();

      if (choice === '1') {
        const idx = findNextUnanswered(entries);
        if (idx === -1) {
          console.log('No quedan disputas pendientes. Usa la opción 3 para sellar, o 2 para revisar/editar.');
          continue;
        }
        await promptDispute(rl, entries[idx], templatePath, template);
      } else if (choice === '2') {
        await reviewMode(rl, entries, templatePath, template);
      } else if (choice === '3') {
        const sealed = await sealFlow(rl, templatePath, template, entries);
        if (sealed) break;
      } else if (choice === '4') {
        console.log('Progreso guardado. Reanuda más tarde con el mismo comando.');
        break;
      } else {
        console.log('Opción no reconocida.');
      }
    }
  } finally {
    rl.close();
  }
}

const isDirectInvocation = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectInvocation) {
  main().catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    process.exit(1);
  });
}
