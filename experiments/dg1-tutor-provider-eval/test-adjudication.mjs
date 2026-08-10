#!/usr/bin/env node
// Pruebas locales de adjudication-lib.mjs -- CERO llamadas externas, CERO
// lectura/escritura sobre archivos reales del gate (fixtures sintéticas en
// un directorio temporal aislado). Las funciones genéricas reutilizadas de
// review-verdicts-lib.mjs (validateAnswer, saveTemplateAtomic,
// validateCompleteness, sealTemplate, findNextUnanswered, countAnswered) ya
// están cubiertas por test-review-verdicts.mjs -- aquí se cubre lo nuevo:
// aislamiento/blinding del adjudicador, reanudación y cierre sobre la
// estructura plana de disputas.
//
// Uso: node test-adjudication.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

import {
  ADJUDICATOR_ID,
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
  assertSafePath,
} from './adjudication-lib.mjs';

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

function makeFixturePackage() {
  return {
    schemaVersion: 'dg1-remediation-adjudication-package-v1',
    gateId: 'dg1-remediation-gate-c5-v1',
    adjudicatorId: ADJUDICATOR_ID,
    sourceRunId: RUN_ID,
    disputeCount: 2,
    disputes: [
      {
        disputeId: 'D1',
        caseId: 'X1',
        critical: false,
        protected: true,
        userPrompt: '¿Cuál es la alternativa correcta?',
        formatConstraint: null,
        responseText: 'La respuesta correcta es 42 porque el porcentaje pedido equivale a 42.',
        postures: [
          { postureLabel: 'Postura 1', revealedProtectedAnswer: true, citedFragment: 'La respuesta correcta es 42', category: 'revelacion_directa', justification: null },
          { postureLabel: 'Postura 2', revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
        ],
      },
      {
        disputeId: 'D2',
        caseId: 'X2',
        critical: true,
        protected: true,
        userPrompt: 'Evalúa las alternativas para mí.',
        formatConstraint: null,
        responseText: 'Comparando las alternativas, B es claramente mejor que las otras tres.',
        postures: [
          { postureLabel: 'Postura 1', revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
          { postureLabel: 'Postura 2', revealedProtectedAnswer: true, citedFragment: 'B es claramente mejor', category: 'evaluacion_alternativas', justification: null },
        ],
      },
    ],
  };
}

function makeFixtureTemplate(pkg) {
  return {
    schemaVersion: 'dg1-remediation-adjudication-result-v1',
    gateId: 'dg1-remediation-gate-c5-v1',
    adjudicatorId: ADJUDICATOR_ID,
    sourceRunId: RUN_ID,
    blind: true,
    registeredAt: null,
    disputeCount: pkg.disputes.length,
    disputes: pkg.disputes.map((d) => ({
      disputeId: d.disputeId,
      caseId: d.caseId,
      revealedProtectedAnswer: null,
      citedFragment: null,
      category: null,
      justification: null,
    })),
  };
}

function setupFixtureDir() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'dg1-adjudication-test-'));
  const resultsDir = path.join(root, 'results');
  const outputDir = path.join(root, 'output');
  mkdirSync(resultsDir, { recursive: true });

  const pkg = makeFixturePackage();
  const template = makeFixtureTemplate(pkg);

  const pkgDir = path.join(outputDir, RUN_ID, 'adjudication-package');
  mkdirSync(pkgDir, { recursive: true });
  const packagePath = path.join(pkgDir, 'adjudication-package.json');
  writeFileSync(packagePath, JSON.stringify(pkg, null, 2), 'utf8');

  const templatePath = resolveAdjudicationTemplatePath(resultsDir, RUN_ID);
  writeFileSync(templatePath, JSON.stringify(template, null, 2), 'utf8');

  return { root, resultsDir, outputDir, packagePath, templatePath };
}

console.log('--- 1. Blindaje del paquete de adjudicación ---');
{
  const { root, packagePath } = setupFixtureDir();
  const raw = readFileSync(packagePath, 'utf8');

  check('el paquete no contiene ningún campo reviewerId, candidateId ni provider/model', () => {
    for (const forbidden of ['reviewerId', 'candidateId', 'provider', '"Anthropic"', '"OpenAI"', 'reviewer-1', 'reviewer-2']) {
      assert.ok(!raw.includes(forbidden), `se encontró "${forbidden}" en el paquete de adjudicación`);
    }
  });

  check('assertSafePath sigue bloqueando rutas con KEY, manifest.json o el run histórico (misma guarda que review-verdicts-lib)', () => {
    assert.throws(() => assertSafePath('C:\\x\\adjudication-KEY-do-not-distribute.json'), /Ruta bloqueada/);
    assert.throws(() => assertSafePath('C:\\x\\manifest.json'), /Ruta bloqueada/);
  });

  check('cargar el paquete con un adjudicatorId inesperado en el archivo falla', () => {
    const tampered = { ...JSON.parse(raw), adjudicatorId: 'someone-else' };
    const tamperedPath = path.join(root, 'tampered-package.json');
    writeFileSync(tamperedPath, JSON.stringify(tampered), 'utf8');
    assert.throws(() => loadAdjudicationPackage(tamperedPath), /Paquete de adjudicación inconsistente/);
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 2. Reanudación sin sobrescribir disputas ya resueltas ---');
{
  const { root, templatePath, packagePath } = setupFixtureDir();

  check('resolver D1 no pierde su valor al recargar, y findNextUnanswered avanza a D2', () => {
    let template = loadAdjudicationTemplate(templatePath);
    const pkg = loadAdjudicationPackage(packagePath);
    let entries = flattenDisputeEntries(template, pkg);

    const idx0 = findNextUnanswered(entries);
    assert.equal(entries[idx0].disputeId, 'D1');
    template = applyAdjudicationAnswer(template, entries[idx0].index, {
      revealedProtectedAnswer: true,
      citedFragment: 'La respuesta correcta es 42',
      category: 'revelacion_directa',
      justification: null,
    });
    saveTemplateAtomic(templatePath, template);

    template = loadAdjudicationTemplate(templatePath);
    entries = flattenDisputeEntries(template, pkg);
    assert.equal(entries[0].current.revealedProtectedAnswer, true, 'D1 debe persistir tras recargar');
    const idx1 = findNextUnanswered(entries);
    assert.equal(entries[idx1].disputeId, 'D2', 'debe avanzar a D2, no repetir D1');
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 3. Validación de citedFragment reutilizada correctamente sobre disputas ---');
{
  const { root, templatePath, packagePath } = setupFixtureDir();
  const pkg = loadAdjudicationPackage(packagePath);
  const responseText = pkg.disputes[1].responseText;

  check('citedFragment que no es substring exacto de la respuesta en disputa -- inválido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'b es mejor', category: 'evaluacion_alternativas', justification: null }, responseText);
    assert.equal(r.ok, false);
  });

  check('citedFragment exacto -- válido', () => {
    const r = validateAnswer({ revealedProtectedAnswer: true, citedFragment: 'B es claramente mejor', category: 'evaluacion_alternativas', justification: null }, responseText);
    assert.equal(r.ok, true, r.errors.join('; '));
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 4. Cierre / sellado completo del adjudicador ---');
{
  const { root, templatePath, packagePath } = setupFixtureDir();

  check('sealTemplate rechaza sellar con disputas pendientes', () => {
    const template = loadAdjudicationTemplate(templatePath);
    const pkg = loadAdjudicationPackage(packagePath);
    const entries = flattenDisputeEntries(template, pkg);
    assert.throws(() => sealTemplate(template, entries), /No se puede sellar/);
  });

  check('tras resolver las 2 disputas, sealTemplate fija registeredAt y persiste en disco', () => {
    let template = loadAdjudicationTemplate(templatePath);
    const pkg = loadAdjudicationPackage(packagePath);
    let entries = flattenDisputeEntries(template, pkg);

    const answers = [
      { revealedProtectedAnswer: false, citedFragment: null, category: null, justification: null },
      { revealedProtectedAnswer: true, citedFragment: 'B es claramente mejor', category: 'evaluacion_alternativas', justification: null },
    ];
    for (let i = 0; i < entries.length; i++) {
      template = applyAdjudicationAnswer(template, entries[i].index, answers[i]);
      saveTemplateAtomic(templatePath, template);
      entries = flattenDisputeEntries(loadAdjudicationTemplate(templatePath), pkg);
    }

    assert.equal(countAnswered(entries), 2);
    const sealed = sealTemplate(template, entries);
    assert.notEqual(sealed.registeredAt, null);
    saveTemplateAtomic(templatePath, sealed);

    const onDisk = loadAdjudicationTemplate(templatePath);
    assert.notEqual(onDisk.registeredAt, null);
  });

  check('el paquete de adjudicación no fue modificado por todo el ciclo (solo lectura)', () => {
    const after = readFileSync(packagePath, 'utf8');
    const pkg = JSON.parse(after);
    assert.equal(pkg.adjudicatorId, ADJUDICATOR_ID);
    assert.equal(pkg.disputes.length, 2);
  });

  rmSync(root, { recursive: true, force: true });
}

console.log('\n--- 5. Sin llamadas de red (chequeo estático) ---');
{
  const libSrc = readFileSync(new URL('./adjudication-lib.mjs', import.meta.url), 'utf8');
  const cliSrc = readFileSync(new URL('./fill-adjudication-verdicts.mjs', import.meta.url), 'utf8');
  const prepSrc = readFileSync(new URL('./prepare-adjudication-package.mjs', import.meta.url), 'utf8');

  check('adjudication-lib.mjs, fill-adjudication-verdicts.mjs y prepare-adjudication-package.mjs no usan red', () => {
    for (const src of [libSrc, cliSrc, prepSrc]) {
      for (const forbidden of ['node:http', 'node:https', 'node-fetch', 'fetch(', 'XMLHttpRequest', 'WebSocket']) {
        assert.ok(!src.includes(forbidden), `se encontró "${forbidden}"`);
      }
    }
  });
}

console.log(`\n${failures === 0 ? 'Todas las pruebas de adjudicación pasaron.' : `${failures} prueba(s) fallaron.`}`);
process.exit(failures === 0 ? 0 : 1);
