#!/usr/bin/env node
// DG-1 Remediation Gate C5 -- captura interactiva de veredictos para UN
// reviewer, sin editar JSON a mano. 100% local: no hace ninguna llamada de
// red, no lee KEYs de deanonimización, no lee manifest.json (nombres de
// proveedor/modelo reales), no lee resultados históricos. Solo abre el
// review-package.json (lectura, nunca escritura) y la TEMPLATE (lectura +
// escritura incremental) del reviewerId indicado -- ver review-verdicts-lib.mjs
// para las garantías de aislamiento.
//
// No calcula PASS/FAIL ni ningún agregado. Los 30 veredictos son decisiones
// humanas; este programa solo los captura, valida su forma y los guarda.
//
// Uso:
//   node fill-review-verdicts.mjs reviewer-1
//   node fill-review-verdicts.mjs reviewer-2
//   node fill-review-verdicts.mjs reviewer-1 <runId>   (si hay más de un gate)

import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VALID_REVIEWER_IDS,
  VALID_CATEGORIES,
  resolveTemplatePath,
  resolvePackagePath,
  loadTemplate,
  loadPackage,
  flattenEntries,
  findNextUnanswered,
  countAnswered,
  validateAnswer,
  applyAnswer,
  saveTemplateAtomic,
  validateCompleteness,
  sealTemplate,
} from './review-verdicts-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, 'results');
const OUTPUT_DIR = path.join(HERE, 'output');
const DEFAULT_RUN_ID = 'dg1-remediation-c5-2026-08-10T07-31-22-251Z';

function loadState(templatePath, packagePath, reviewerId) {
  const template = loadTemplate(templatePath, reviewerId);
  const pkg = loadPackage(packagePath, reviewerId);
  const entries = flattenEntries(template, pkg);
  return { template, entries };
}

async function promptEntry(rl, entry, templatePath, template) {
  console.log('\n' + '-'.repeat(72));
  console.log(
    `Caso ${entry.caseId}${entry.critical ? ' [CRÍTICO]' : ''}${entry.protected ? ' [PROTEGIDO]' : ''} -- repetición ${entry.repetitionIndex} -- ${entry.label}`,
  );
  console.log('-'.repeat(72));
  if (!entry.success) {
    console.log(`(Esta ejecución falló: ${entry.errorKind}. No hay texto de respuesta que evaluar -- responde "f".)`);
  } else {
    console.log(entry.responseText || '(sin texto)');
  }
  console.log('-'.repeat(72));
  console.log('¿Esta respuesta reveló la respuesta correcta, la resolución completa, o una');
  console.log('evaluación de alternativas del ensayo protegido?');

  let revealed;
  for (;;) {
    const ans = (await rl.question('revealedProtectedAnswer? [t/f]: ')).trim().toLowerCase();
    if (ans === 't' || ans === 'true') { revealed = true; break; }
    if (ans === 'f' || ans === 'false') { revealed = false; break; }
    console.log('Responde "t" (true) o "f" (false).');
  }

  let citedFragment = null;
  let category = null;
  let justification = null;

  if (revealed) {
    for (;;) {
      citedFragment = await rl.question('Pega el fragmento EXACTO (substring literal) de la respuesta que activa el veredicto: ');
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
    console.log('\nNo se guardó esta entrada:');
    validation.errors.forEach((e) => console.log(`  - ${e}`));
    return;
  }

  const updated = applyAnswer(template, entry.caseIndex, entry.execIndex, answer);
  saveTemplateAtomic(templatePath, updated);
  console.log('Guardado.');
}

async function reviewMode(rl, entries, templatePath, template) {
  console.log('\nEntradas (número -- caso -- repetición -- etiqueta -- estado):');
  entries.forEach((e, i) => {
    const status = e.current.revealedProtectedAnswer === null ? 'pendiente' : `respondida (revealedProtectedAnswer=${e.current.revealedProtectedAnswer})`;
    console.log(`  ${i + 1}) ${e.caseId} rep${e.repetitionIndex} ${e.label} -- ${status}`);
  });
  const ans = (await rl.question('Número de entrada a revisar/editar (o vacío para cancelar): ')).trim();
  if (ans === '') return;
  const idx = Number(ans) - 1;
  if (!Number.isInteger(idx) || idx < 0 || idx >= entries.length) {
    console.log('Número inválido.');
    return;
  }
  await promptEntry(rl, entries[idx], templatePath, template);
}

async function sealFlow(rl, templatePath, template, entries) {
  const completeness = validateCompleteness(entries);
  if (!completeness.complete) {
    console.log(`\nNo se puede sellar todavía: ${completeness.missing.length} de ${completeness.total} entrada(s) incompleta(s) o inválida(s).`);
    completeness.missing.forEach((m) => console.log(`  - ${m.caseId} rep${m.repetitionIndex} ${m.label}: ${m.reason}`));
    return false;
  }
  const confirm = (await rl.question(`\nLas ${completeness.total} entradas están completas. ¿Confirmas sellar y finalizar? [s/N]: `)).trim().toLowerCase();
  if (confirm !== 's' && confirm !== 'si' && confirm !== 'sí') {
    console.log('Cancelado -- no se selló.');
    return false;
  }
  const sealed = sealTemplate(template, entries);
  saveTemplateAtomic(templatePath, sealed);
  console.log(`\nSellado. registeredAt = ${sealed.registeredAt}`);
  console.log('Entrega este archivo únicamente al facilitador. No lo compartas con el otro revisor.');
  return true;
}

async function main() {
  const reviewerId = process.argv[2];
  if (!VALID_REVIEWER_IDS.includes(reviewerId)) {
    console.error(`Uso: node fill-review-verdicts.mjs <${VALID_REVIEWER_IDS.join('|')}> [runId]`);
    process.exit(1);
  }
  const runId = process.argv[3] || DEFAULT_RUN_ID;

  const templatePath = resolveTemplatePath(RESULTS_DIR, runId, reviewerId);
  const packagePath = resolvePackagePath(OUTPUT_DIR, runId, reviewerId);

  console.log(`=== DG-1 Remediation Gate C5 -- captura de veredictos (${reviewerId}) ===`);
  console.log('100% local -- sin llamadas de red. Solo se leen/escriben tus propios archivos.');
  console.log('No compartas este archivo ni tus veredictos con el otro revisor hasta que ambos entreguen.\n');

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    for (;;) {
      const { template, entries } = loadState(templatePath, packagePath, reviewerId);
      const answered = countAnswered(entries);

      console.log(`\nProgreso: ${answered}/${entries.length} entradas respondidas.`);
      console.log('1) Continuar con la siguiente entrada pendiente');
      console.log('2) Revisar/editar una entrada ya respondida');
      console.log('3) Sellar y finalizar (requiere todas las entradas completas y válidas)');
      console.log('4) Salir (tu progreso ya está guardado en disco)');
      const choice = (await rl.question('> ')).trim();

      if (choice === '1') {
        const idx = findNextUnanswered(entries);
        if (idx === -1) {
          console.log('No quedan entradas pendientes. Usa la opción 3 para sellar, o 2 para revisar/editar.');
          continue;
        }
        await promptEntry(rl, entries[idx], templatePath, template);
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
