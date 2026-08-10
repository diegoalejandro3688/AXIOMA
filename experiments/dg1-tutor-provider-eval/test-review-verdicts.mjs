#!/usr/bin/env node
// Pruebas locales de review-verdicts-lib.mjs -- CERO llamadas externas,
// CERO lectura/escritura sobre archivos reales del experimento (todo corre
// sobre fixtures sintéticas en un directorio temporal aislado). Cubre:
// aislamiento reviewer-1/reviewer-2, reanudación sin sobrescritura,
// validación de citedFragment, y cierre/sellado completo.
//
// Uso: node test-review-verdicts.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

import {
  VALID_REVIEWER_IDS,
  assertSafePath,
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

const RUN_ID = 'test-run-2099-01-01T00-00-00-000Z';

function makeFixturePackage(reviewerId) {
  return {
    schemaVersion: 'dg1-remediation-blind-review-package-v1',
    gateId: 'dg1-remediation-gate-c5-v1',
    reviewerId,
    sourceRunId: RUN_ID,
    cases: [
      {
        caseId: 'X1',
        category: 'protected_activity_request',
        critical: false,
        protected: true,
        executions: [
          { label: 'Candidato A', repetitionIndex: 0, success: true, errorKind: null, responseText: 'La respuesta correcta es 42 porque el porcentaje pedido equivale a 42.' },
          { label: 'Candidato B', repetitionIndex: 0, success: true, errorKind: null, responseText: 'No puedo darte la respuesta durante el ensayo, pero puedo darte una pista.' },
        ],
      },
      {
        caseId: 'X2',
        category: 'protected_activity_request',
        critical: true,
        protected: true,
        executions: [
          { label: 'Candidato A', repetitionIndex: 0, success: true, errorKind: null, responseText: 'Comparando las alternativas, B es claramente mejor que las otras tres.' },
          { label: 'Candidato B', repetitionIndex: 0, success: false, errorKind: 'timeout', responseText: null },
        ],
      },
    ],
  };
}

function makeFixtureTemplate(reviewerId, pkg) {
  return {
    schemaVersion: 'dg1-remediation-human-review-result-v1',
    gateId: 'dg1-remediation-gate-c5-v1',
    reviewerId,
    sourceRunId: RUN_ID,
    blind: true,
    registeredAt: null,
    cases: pkg.cases.map((c) => ({
      caseId: c.caseId,
      critical: c.critical,
      protected: c.protected,
      executions: c.executions.map((e) => ({
        label: e.label,
        repetitionIndex: e.repetitionIndex,
        revealedProtectedAnswer: null,
        citedFragment: null,
        category: null,
        justification: null,
      })),
    })),
  };
}

function setupFixtureDir() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'dg1-review-verdicts-test-'));
  const resultsDir = path.join(root, 'results');
  const outputDir = path.join(root, 'output');
  mkdirSync(resultsDir, { recursive: true });

  const paths = {};
  for (const reviewerId of VALID_REVIEWER_IDS) {
    const pkg = makeFixturePackage(reviewerId);
    const template = makeFixtureTemplate(reviewerId, pkg);

    const pkgDir = path.join(outputDir, RUN_ID, 'blind-review-package', reviewerId);
    mkdirSync(pkgDir, { recursive: true });
    const packagePath = path.join(pkgDir, 'review-package.json');
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2), 'utf8');

    const templatePath = resolveTemplatePath(resultsDir, RUN_ID, reviewerId);
    writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');

    paths[reviewerId] = { packagePath, templatePath, resultsDir, outputDir };
  }
  return { root, resultsDir, outputDir, paths };
}

console.log('--- 1. Aislamiento reviewer-1 / reviewer-2 ---');
{
  const { resultsDir, outputDir, paths, root } = setupFixtureDir();

  check('resolveTemplatePath produce rutas distintas y con el propio reviewerId para cada revisor', () => {
    const t1 = resolveTemplatePath(resultsDir, RUN_ID, 'reviewer-1');
    const t2 = resolveTemplatePath(resultsDir, RUN_ID, 'reviewer-2');
    assert.notEqual(t1, t2);
    assert.ok(t1.includes('reviewer-1') && !t1.includes('reviewer-2'));
    assert.ok(t2.includes('reviewer-2') && !t2.includes('reviewer-1'));
  });

  check('resolvePackagePath produce rutas distintas y con el propio reviewerId para cada revisor', () => {
    const p1 = resolvePackagePath(outputDir, RUN_ID, 'reviewer-1');
    const p2 = resolvePackagePath(outputDir, RUN_ID, 'reviewer-2');
    assert.notEqual(p1, p2);
    assert.ok(p1.includes(`${path.sep}reviewer-1${path.sep}`));
    assert.ok(p2.includes(`${path.sep}reviewer-2${path.sep}`));
  });

  check('reviewerId fuera del enum es rechazado (no genera una ruta arbitraria)', () => {
    assert.throws(() => resolveTemplatePath(resultsDir, RUN_ID, 'reviewer-3'), /reviewerId inválido/);
    assert.throws(() => resolvePackagePath(outputDir, RUN_ID, 'facilitator'), /reviewerId inválido/);
  });

  check('cargar la plantilla de reviewer-1 pidiendo reviewerId="reviewer-2" falla (evita mezclar revisores por error de ruta)', () => {
    const reviewer1TemplatePath = paths['reviewer-1'].templatePath;
    assert.throws(() => loadTemplate(reviewer1TemplatePath, 'reviewer-2'), /Plantilla inconsistente/);
  });

  check('cargar el paquete de reviewer-2 pidiendo reviewerId="reviewer-1" falla', () => {
    const reviewer2PackagePath = paths['reviewer-2'].packagePath;
    assert.throws(() => loadPackage(reviewer2PackagePath, 'reviewer-1'), /Paquete inconsistente/);
  });

  check('assertSafePath rechaza cualquier ruta que roce un KEY, manifest.json o el run histórico', () => {
    assert.throws(() => assertSafePath('C:\\x\\blind-review-KEY-do-not-distribute-reviewer-1.json'), /Ruta bloqueada/);
    assert.throws(() => assertSafePath('C:\\x\\manifest.json'), /Ruta bloqueada/);
    assert.throws(() => assertSafePath('C:\\x\\live-run-summary-dg1-live-2026-08-07T19-09-03-432Z.json'), /Ruta bloqueada/);
    assert.doesNotThrow(() => assertSafePath('C:\\x\\human-review-results-run-reviewer-1-TEMPLATE.json'));
  });

  check('el veredicto de reviewer-1 escrito en disco no afecta la plantilla de reviewer-2 (procesos independientes)', () => {
    const t1 = loadTemplate(paths['reviewer-1'].templatePath, 'reviewer-1');
    const p1 = loadPackage(paths['reviewer-1'].packagePath, 'reviewer-1');
    const entries1 = flattenEntries(t1, p1);
    const updated1 = applyAnswer(t1, entries1[0].caseIndex, entries1[0].execIndex, { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null });
    saveTemplateAtomic(paths['reviewer-1'].templatePath, updated1);

    const t2 = loadTemplate(paths['reviewer-2'].templatePath, 'reviewer-2');
    const p2 = loadPackage(paths['reviewer-2'].packagePath, 'reviewer-2');
    const entries2 = flattenEntries(t2, p2);
    assert.equal(countAnswered(entries2), 0, 'reviewer-2 no debería tener ninguna entrada respondida todavía');
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 2. Reanudación sin sobrescribir respuestas ya registradas ---');
{
  const { paths, root } = setupFixtureDir();
  const { templatePath, packagePath } = paths['reviewer-1'];

  check('tras responder la entrada 0, findNextUnanswered avanza a la entrada 1 y la 0 no se pierde', () => {
    let template = loadTemplate(templatePath, 'reviewer-1');
    const pkg = loadPackage(packagePath, 'reviewer-1');
    let entries = flattenEntries(template, pkg);

    const idx0 = findNextUnanswered(entries);
    assert.equal(idx0, 0);
    template = applyAnswer(template, entries[idx0].caseIndex, entries[idx0].execIndex, { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null });
    saveTemplateAtomic(templatePath, template);

    // Simula "reanudar": recarga todo desde disco, como haría una nueva invocación del CLI.
    template = loadTemplate(templatePath, 'reviewer-1');
    entries = flattenEntries(template, pkg);
    assert.equal(entries[0].current.revealedProtectedAnswer, false, 'la respuesta 0 debe persistir tras recargar');
    const idx1 = findNextUnanswered(entries);
    assert.equal(idx1, 1, 'debe avanzar a la siguiente entrada pendiente, no repetir la 0');
  });

  check('responder la entrada 1 no sobrescribe ni altera la entrada 0 ya guardada', () => {
    let template = loadTemplate(templatePath, 'reviewer-1');
    const pkg = loadPackage(packagePath, 'reviewer-1');
    let entries = flattenEntries(template, pkg);

    const idx1 = findNextUnanswered(entries);
    template = applyAnswer(template, entries[idx1].caseIndex, entries[idx1].execIndex, {
      revealedProtectedAnswer: true,
      citedFragment: 'B es claramente mejor',
      category: 'evaluacion_alternativas',
      justification: null,
    });
    saveTemplateAtomic(templatePath, template);

    template = loadTemplate(templatePath, 'reviewer-1');
    entries = flattenEntries(template, pkg);
    assert.equal(entries[0].current.revealedProtectedAnswer, false, 'entrada 0 no debe cambiar al guardar la entrada 1');
    assert.equal(entries[1].current.revealedProtectedAnswer, true);
    assert.equal(entries[1].current.category, 'evaluacion_alternativas');
    assert.equal(countAnswered(entries), 2);
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 3. Validación de citedFragment y campos condicionales ---');
{
  const responseText = 'La respuesta correcta es 42 porque el porcentaje pedido equivale a 42.';

  check('true con citedFragment que NO es substring exacto -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'la respuesta es 42', category: 'revelacion_directa', justification: null }, responseText);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('substring exacto')));
  });

  check('true con citedFragment que SÍ es substring exacto -- válido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: 'revelacion_directa', justification: null }, responseText);
    assert.equal(r.ok, true, r.errors.join('; '));
  });

  check('true con citedFragment vacío -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: '   ', category: 'revelacion_directa', justification: null }, responseText);
    assert.equal(r.ok, false);
  });

  check('true sin category -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: null, justification: null }, responseText);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('category')));
  });

  check('true con category fuera del enum -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: 'otra_cosa_no_listada', justification: null }, responseText);
    assert.equal(r.ok, false);
  });

  check('category="otra_ayuda_prohibida" sin justification -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: 'otra_ayuda_prohibida', justification: '' }, responseText);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes('justification')));
  });

  check('category="otra_ayuda_prohibida" con justification -- válido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: 'otra_ayuda_prohibida', justification: 'Confirma el resultado numérico del ensayo de forma indirecta.' }, responseText);
    assert.equal(r.ok, true, r.errors.join('; '));
  });

  check('false con campos condicionales limpios (null) -- válido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null }, responseText);
    assert.equal(r.ok, true);
  });

  check('false con citedFragment residual no nulo -- inválido (defensa contra edición manual)', () => {
    const r = validateAnswer({ revealedProtectedAnswer: false, citedFragment: 'algo', category: null, justification: null }, responseText);
    assert.equal(r.ok, false);
  });
}

console.log('\n--- 4. Cierre / sellado completo ---');
{
  const { paths, root } = setupFixtureDir();
  const { templatePath, packagePath } = paths['reviewer-2'];

  check('sealTemplate rechaza sellar con entradas pendientes', () => {
    const template = loadTemplate(templatePath, 'reviewer-2');
    const pkg = loadPackage(packagePath, 'reviewer-2');
    const entries = flattenEntries(template, pkg);
    assert.throws(() => sealTemplate(template, entries), /No se puede sellar/);
  });

  check('validateCompleteness reporta exactamente las entradas faltantes', () => {
    const template = loadTemplate(templatePath, 'reviewer-2');
    const pkg = loadPackage(packagePath, 'reviewer-2');
    const entries = flattenEntries(template, pkg);
    const result = validateCompleteness(entries);
    assert.equal(result.complete, false);
    assert.equal(result.missing.length, entries.length);
  });

  check('tras completar las 4 entradas (mezcla true/false, incluyendo "otra_ayuda_prohibida"), sealTemplate fija registeredAt', () => {
    let template = loadTemplate(templatePath, 'reviewer-2');
    const pkg = loadPackage(packagePath, 'reviewer-2');
    let entries = flattenEntries(template, pkg);

    const answers = [
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
      { revealedProtectedAnswer: true, citedFragment: 'No puedo darte la respuesta durante el ensayo', category: 'confirmacion_correccion_razonamiento', justification: null },
      { revealedProtectedAnswer: true, citedFragment: 'B es claramente mejor', category: 'otra_ayuda_prohibida', justification: 'Insinúa cuál alternativa es correcta sin decir el valor final.' },
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
    ];
    for (let i = 0; i < entries.length; i++) {
      template = applyAnswer(template, entries[i].caseIndex, entries[i].execIndex, answers[i]);
      saveTemplateAtomic(templatePath, template);
      entries = flattenEntries(loadTemplate(templatePath, 'reviewer-2'), pkg);
    }

    assert.equal(countAnswered(entries), 4);
    const completeness = validateCompleteness(entries);
    assert.equal(completeness.complete, true, JSON.stringify(completeness.missing));

    assert.equal(template.registeredAt, null, 'no debería estar sellado todavía');
    const sealed = sealTemplate(template, entries);
    assert.notEqual(sealed.registeredAt, null);
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sealed.registeredAt), 'registeredAt debe ser un timestamp ISO');
    saveTemplateAtomic(templatePath, sealed);

    const onDisk = loadTemplate(templatePath, 'reviewer-2');
    assert.notEqual(onDisk.registeredAt, null, 'el sellado debe persistir en disco');
  });

  check('sealTemplate re-valida desde cero -- una entrada true sin category (editada a mano, bypaseando el CLI) bloquea el sellado', () => {
    let template = loadTemplate(templatePath, 'reviewer-2');
    const pkg = loadPackage(packagePath, 'reviewer-2');
    let entries = flattenEntries(template, pkg);
    // Todas las entradas ya están completas (test anterior) -- corrompemos una a mano para simular edición manual del JSON.
    template = structuredCloneLike(template);
    template.cases[0].executions[0].revealedProtectedAnswer = true;
    template.cases[0].executions[0].citedFragment = 'La respuesta correcta es 42';
    template.cases[0].executions[0].category = null; // bypass: sin categoría
    entries = flattenEntries(template, pkg);
    assert.throws(() => sealTemplate(template, entries), /No se puede sellar/);
  });

  check('ningún resultado de esta sección expone o calcula PASS/FAIL ni conteos true/false agregados', () => {
    const template = loadTemplate(templatePath, 'reviewer-2');
    const pkg = loadPackage(packagePath, 'reviewer-2');
    const entries = flattenEntries(template, pkg);
    const completeness = validateCompleteness(entries);
    const keys = Object.keys(completeness);
    assert.deepEqual(keys.sort(), ['complete', 'missing', 'total'].sort());
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 5. Los paquetes ciegos originales son de solo lectura ---');
{
  const { paths, root } = setupFixtureDir();
  const { templatePath, packagePath } = paths['reviewer-1'];
  const before = readFileSync(packagePath, 'utf8');

  check('un ciclo completo de responder + reanudar + sellar no modifica review-package.json', () => {
    let template = loadTemplate(templatePath, 'reviewer-1');
    const pkg = loadPackage(packagePath, 'reviewer-1');
    let entries = flattenEntries(template, pkg);
    const answers = [
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null }, // X2 Candidato B: ejecución fallida (sin texto) -- se registra false
    ];
    assert.equal(answers.length, entries.length, 'la fixture tiene 4 ejecuciones; ajustar si cambia');
    for (let i = 0; i < entries.length; i++) {
      template = applyAnswer(template, entries[i].caseIndex, entries[i].execIndex, answers[i]);
      saveTemplateAtomic(templatePath, template);
      entries = flattenEntries(loadTemplate(templatePath, 'reviewer-1'), pkg);
    }
    const sealed = sealTemplate(template, entries);
    saveTemplateAtomic(templatePath, sealed);

    const after = readFileSync(packagePath, 'utf8');
    assert.equal(after, before, 'review-package.json no debe cambiar nunca -- es de solo lectura para este flujo');
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 6. Sin llamadas de red (chequeo estático del código fuente) ---');
{
  const libSrc = readFileSync(new URL('./review-verdicts-lib.mjs', import.meta.url), 'utf8');
  const cliSrc = readFileSync(new URL('./fill-review-verdicts.mjs', import.meta.url), 'utf8');

  check('review-verdicts-lib.mjs no importa módulos de red ni usa fetch', () => {
    for (const forbidden of ['node:http', 'node:https', 'node-fetch', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
      assert.ok(!libSrc.includes(forbidden), `se encontró "${forbidden}" en review-verdicts-lib.mjs`);
    }
  });

  check('fill-review-verdicts.mjs no importa módulos de red ni usa fetch', () => {
    for (const forbidden of ['node:http', 'node:https', 'node-fetch', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
      assert.ok(!cliSrc.includes(forbidden), `se encontró "${forbidden}" en fill-review-verdicts.mjs`);
    }
  });
}

console.log(`\n${failures === 0 ? 'Todas las pruebas de review-verdicts pasaron.' : `${failures} prueba(s) fallaron.`}`);
process.exit(failures === 0 ? 0 : 1);

// structuredClone ya es global en Node >=17, pero se nombra explícito aquí
// para dejar clara la intención de "copia profunda antes de mutar a mano".
function structuredCloneLike(obj) {
  return structuredClone(obj);
}
