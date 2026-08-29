// CONTENT-4.1 -- Gate PRE-BD del contenido fuente V1 (`apps/backend/content/`).
// Deliberadamente SIN Postgres, SIN Docker, SIN `run-gate.ts` (ese wrapper
// existe para aislar la base de gates; este script nunca abre ninguna
// conexión a ninguna base) -- ejecutable con solo `tsx`.
//
// Recorre TODOS los módulos de Recurso bajo `content/estudio/**` (un
// archivo = un Recurso, ver CONTENT-4.1), valida su forma contra
// `resourceContentModuleSchema` (@axioma/content-schema local, que a su vez
// reutiliza los bloques de `@axioma/contracts`), y cruza cada uno contra
// `CONTENT_MANIFEST` para las reglas de negocio (unicidad, orden,
// cobertura esperada, fórmulas LaTeX).
//
// ENSAYOS-M1-A (ADR-0024): `content/ensayo/**` YA NO se recorre aquí. El
// banco de Ensayos es un dominio SEPARADO con su propio schema/loader/
// manifest (`content/ensayo/schema.ts` etc.) y su propio gate
// (`verify:ensayo-source-gate`). Este gate valida EXCLUSIVAMENTE el
// catálogo Study (`content/estudio/**`, 98 LR / 980 Q).
import { join, relative } from 'node:path';
import { type ResourceContentModule, type SourceContentBlock, type SourceQuestion } from '../content/schema';
import { loadResourceModules as loadResourceModulesShared, type LoadedResource } from '../content/load';
import {
  CONTENT_MANIFEST,
  findManifestResource,
  findManifestUnit,
  expectedQuestionsForUnit,
  expectedQuestionsForSubject,
  totalExpectedQuestions,
  totalExpectedResources,
  catalogSubjects,
  type ContentManifest,
} from '../content/manifest';
import { renderLatexToSvg } from '../src/education/formula-rendering';

const CONTENT_ROOT = join(__dirname, '..', 'content');

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

/** Wrapper delgado sobre el loader compartido (`content/load.ts`) -- reporta cada `issue` con `check()`, mismo criterio que antes de la extracción (CONTENT-4.2, punto 2: evitar dos recorridos divergentes). */
async function loadResourceModules(dir: string): Promise<LoadedResource[]> {
  const { loaded, issues } = await loadResourceModulesShared(dir);
  for (const issue of issues) {
    check(`${relative(CONTENT_ROOT, issue.file)}: cumple resourceContentModuleSchema`, false);
    console.error(`       ${issue.message}`);
  }
  return loaded;
}

/** Extrae todos los bloques `formula` (fuente, sin `svg`) de un módulo de Recurso -- lección, enunciados, explicaciones y alternativas. */
function collectFormulaLatex(resource: ResourceContentModule): { latex: string; context: string }[] {
  const out: { latex: string; context: string }[] = [];
  const fromBlocks = (blocks: SourceContentBlock[], context: string) => {
    for (const block of blocks) {
      if (block.type === 'formula') out.push({ latex: block.latex, context });
    }
  };
  fromBlocks(resource.contentBlocks, `${resource.resourceKey} (lección)`);
  for (const q of resource.questions) {
    fromBlocks(q.stemContent, `${q.questionKey} (enunciado)`);
    fromBlocks(q.explanationContent as SourceContentBlock[], `${q.questionKey} (explicación)`);
    for (const opt of q.options) {
      if (opt.content.type === 'formula') out.push({ latex: opt.content.latex, context: `${q.questionKey} (alternativa)` });
    }
  }
  return out;
}

/** Texto plano canónico de una alternativa -- para detectar duplicados exactos (texto o LaTeX idéntico), sin depender del `type`. */
function canonicalOptionContent(option: SourceQuestion['options'][number]): string {
  return option.content.type === 'paragraph' ? `text:${option.content.text}` : `formula:${option.content.latex}`;
}

const CURRICULUM_CODE_RE = /^[A-Z0-9]+(\.[A-Z0-9_]+)+$/;

function isChildTopicOf(topicCode: string, unitCode: string): boolean {
  if (!topicCode.startsWith(`${unitCode}.`)) return false;
  const extraSegments = topicCode.slice(unitCode.length + 1).split('.');
  return extraSegments.length === 1 && extraSegments[0]!.length > 0;
}

function printSubjectCoverage(subject: ContentManifest[number], foundQuestionsByTopic: Map<string, number>, foundResourceTopics: Set<string>) {
  console.log(`\n${subject.name} (${subject.subjectKey})`);
  let subjectFound = 0;
  for (const unit of subject.units) {
    const expectedUnitTotal = expectedQuestionsForUnit(unit);
    let unitFound = 0;
    for (const resource of unit.resources) {
      const found = foundQuestionsByTopic.get(resource.topicCode) ?? 0;
      unitFound += found;
    }
    subjectFound += unitFound;
    const resourcesPresent = unit.resources.filter((r) => foundResourceTopics.has(r.topicCode)).length;
    console.log(
      `  ${unit.name} (${unit.unitCode}): ${unitFound}/${expectedUnitTotal} preguntas -- ${resourcesPresent}/${unit.resources.length} recursos presentes`,
    );
  }
  console.log(`  Total materia: ${subjectFound}/${expectedQuestionsForSubject(subject)} preguntas`);
}

/**
 * Materias `kind: 'fixture'`/`'validation'` se imprimen APARTE y nunca
 * entran en "Total catálogo" -- ver CONTENT-4.1 ajuste 1 (fixture) y
 * CONTENT-4.2B punto 9 (validation): ninguna de las dos contribuye jamás a
 * la cobertura oficial V1, aunque ambas sigan probándose/mostrándose.
 */
function printCoverageSummary(manifest: ContentManifest, foundQuestionsByTopic: Map<string, number>, foundResourceTopics: Set<string>) {
  const catalog = catalogSubjects(manifest);
  const fixtures = manifest.filter((s) => s.kind === 'fixture');
  const validation = manifest.filter((s) => s.kind === 'validation');

  console.log('\n--- Resumen de cobertura esperada -- CATÁLOGO V1 (manifest vs. contenido fuente encontrado) ---');
  if (catalog.length === 0) console.log('  (sin materias de catálogo real en el manifest todavía)');
  for (const subject of catalog) printSubjectCoverage(subject, foundQuestionsByTopic, foundResourceTopics);
  console.log(`\nTotal catálogo V1 (manifest, EXCLUYE fixtures y validation): ${totalExpectedResources(manifest)} recursos, ${totalExpectedQuestions(manifest)} preguntas esperadas.`);

  if (fixtures.length > 0) {
    console.log('\n--- Materias de PRUEBA (kind: fixture -- excluidas de los totales oficiales de arriba) ---');
    for (const subject of fixtures) printSubjectCoverage(subject, foundQuestionsByTopic, foundResourceTopics);
  }
  if (validation.length > 0) {
    console.log('\n--- Materias TÉCNICAS de validación del importer (kind: validation -- excluidas de los totales oficiales de arriba) ---');
    for (const subject of validation) printSubjectCoverage(subject, foundQuestionsByTopic, foundResourceTopics);
  }
}

async function main() {
  console.log('--- 0. Carga de módulos de contenido Study (content/estudio/**) ---');
  // `content/ensayo/**` NO se carga aquí -- dominio separado, gate propio
  // (`verify:ensayo-source-gate`). Ver ADR-0024.
  const allResources = await loadResourceModules(join(CONTENT_ROOT, 'estudio'));
  check(`al menos un módulo de Recurso cargado y con forma válida (encontrados: ${allResources.length})`, allResources.length > 0);

  console.log('\n--- 1. Unicidad global de resourceKey / questionKey ---');
  const resourceKeySeen = new Map<string, string>();
  const questionKeySeen = new Map<string, string>();
  for (const { file, module } of allResources) {
    const relFile = relative(CONTENT_ROOT, file);
    const dupResource = resourceKeySeen.get(module.resourceKey);
    check(`resourceKey único: "${module.resourceKey}" (${relFile})`, !dupResource);
    if (dupResource) console.error(`       ya usado en ${dupResource}`);
    resourceKeySeen.set(module.resourceKey, relFile);

    for (const q of module.questions) {
      const dupQuestion = questionKeySeen.get(q.questionKey);
      check(`questionKey único: "${q.questionKey}" (${relFile})`, !dupQuestion);
      if (dupQuestion) console.error(`       ya usado en ${dupQuestion}`);
      questionKeySeen.set(q.questionKey, relFile);
    }
  }

  console.log('\n--- 2. Convención de código de unidad/recurso ---');
  for (const { file, module } of allResources) {
    const relFile = relative(CONTENT_ROOT, file);
    check(`unitCode con convención válida: "${module.unitCode}" (${relFile})`, CURRICULUM_CODE_RE.test(module.unitCode));
    check(`topicCode con convención válida: "${module.topicCode}" (${relFile})`, CURRICULUM_CODE_RE.test(module.topicCode));
    check(
      `topicCode es hijo directo de unitCode ("${module.topicCode}" bajo "${module.unitCode}")`,
      isChildTopicOf(module.topicCode, module.unitCode),
    );
  }

  console.log('\n--- 3. Cada recurso referencia una unidad/recurso definidos en el manifest ---');
  for (const { file, module } of allResources) {
    const relFile = relative(CONTENT_ROOT, file);
    const unitEntry = findManifestUnit(CONTENT_MANIFEST, module.unitCode);
    check(`unitCode "${module.unitCode}" existe en el manifest (${relFile})`, unitEntry !== null);

    const resourceEntry = findManifestResource(CONTENT_MANIFEST, module.topicCode);
    check(`topicCode "${module.topicCode}" existe en el manifest (${relFile})`, resourceEntry !== null);
    if (resourceEntry) {
      check(
        `el recurso del manifest para "${module.topicCode}" pertenece a la MISMA unidad ("${module.unitCode}")`,
        resourceEntry.unit.unitCode === module.unitCode,
      );
      // CONTENT-4.1, ajuste 1: un módulo NUNCA puede declararse 'catalog'
      // bajo una materia 'fixture' del manifest, ni viceversa -- la
      // separación es tipada en ambos lados, no solo por convención de carpeta.
      check(
        `kind del módulo ("${module.kind}") coincide con kind de la materia del manifest ("${resourceEntry.subject.kind}") (${relFile})`,
        module.kind === resourceEntry.subject.kind,
      );
    }
  }

  console.log('\n--- 4. Orden de recursos sin duplicados dentro de una unidad ---');
  const resourcesByUnit = new Map<string, LoadedResource[]>();
  for (const entry of allResources) {
    const bucket = resourcesByUnit.get(entry.module.unitCode) ?? [];
    bucket.push(entry);
    resourcesByUnit.set(entry.module.unitCode, bucket);
  }
  for (const [unitCode, resources] of resourcesByUnit) {
    const orders = resources.map((r) => r.module.order);
    const uniqueOrders = new Set(orders);
    check(`unidad "${unitCode}": orden de recursos sin duplicados (${orders.join(',')})`, uniqueOrders.size === orders.length);
  }

  console.log('\n--- 5-9. Por recurso: orden de preguntas, cantidad esperada, alternativas, corrección ---');
  const foundQuestionsByTopic = new Map<string, number>();
  const foundResourceTopics = new Set<string>();
  for (const { file, module } of allResources) {
    const relFile = relative(CONTENT_ROOT, file);
    foundResourceTopics.add(module.topicCode);
    foundQuestionsByTopic.set(module.topicCode, module.questions.length);

    const qOrders = module.questions.map((q) => q.order);
    check(`${relFile}: orden de preguntas sin duplicados (${qOrders.join(',')})`, new Set(qOrders).size === qOrders.length);

    const resourceEntry = findManifestResource(CONTENT_MANIFEST, module.topicCode);
    if (resourceEntry) {
      check(
        `${relFile}: cantidad de preguntas (${module.questions.length}) == expectedQuestions del manifest (${resourceEntry.resource.expectedQuestions})`,
        module.questions.length === resourceEntry.resource.expectedQuestions,
      );

      // CONTENT-4.1, ajuste 2: SOLO se compara cuando el manifest define
      // `expectedDifficulty` para este recurso -- ausente = se omite la
      // comprobación por completo (nunca falla por default), data-driven
      // por recurso, sin ninguna rama `if expectedQuestions === 10`.
      const expectedDifficulty = resourceEntry.resource.expectedDifficulty;
      if (expectedDifficulty) {
        const actualDifficulty = { FACIL: 0, MEDIA: 0, DIFICIL: 0 };
        for (const q of module.questions) actualDifficulty[q.difficulty]++;
        const matches =
          actualDifficulty.FACIL === expectedDifficulty.FACIL &&
          actualDifficulty.MEDIA === expectedDifficulty.MEDIA &&
          actualDifficulty.DIFICIL === expectedDifficulty.DIFICIL;
        check(
          `${relFile}: distribución de dificultad FACIL/MEDIA/DIFICIL == esperada por manifest ` +
            `(real: ${actualDifficulty.FACIL}/${actualDifficulty.MEDIA}/${actualDifficulty.DIFICIL}, ` +
            `esperada: ${expectedDifficulty.FACIL}/${expectedDifficulty.MEDIA}/${expectedDifficulty.DIFICIL})`,
          matches,
        );
      }
    }

    for (const q of module.questions) {
      const correctCount = q.options.filter((o) => o.correct).length;
      check(`${q.questionKey}: exactamente una alternativa correcta (encontradas: ${correctCount})`, correctCount === 1);

      const canonicalOptions = q.options.map(canonicalOptionContent);
      check(`${q.questionKey}: alternativas no duplicadas`, new Set(canonicalOptions).size === canonicalOptions.length);
    }
  }

  console.log('\n--- 10. Ningún recurso duplicado dentro del manifest ---');
  const manifestTopicCodes = new Map<string, string>();
  for (const subject of CONTENT_MANIFEST) {
    for (const unit of subject.units) {
      for (const resource of unit.resources) {
        const dup = manifestTopicCodes.get(resource.topicCode);
        check(`manifest: topicCode "${resource.topicCode}" no duplicado`, !dup);
        if (dup) console.error(`       ya declarado bajo ${dup}`);
        manifestTopicCodes.set(resource.topicCode, `${subject.subjectKey}/${unit.unitCode}`);
      }
    }
  }

  console.log('\n--- 11. Fórmulas/LaTeX validables en memoria (MathJax, sin efectos secundarios) ---');
  const latexSeen = new Set<string>();
  let formulaCount = 0;
  let formulaFailures = 0;
  for (const { module } of allResources) {
    for (const { latex, context } of collectFormulaLatex(module)) {
      if (latexSeen.has(latex)) continue;
      latexSeen.add(latex);
      formulaCount++;
      try {
        renderLatexToSvg(latex);
      } catch (error) {
        formulaFailures++;
        const message = error instanceof Error ? error.message : String(error);
        check(`LaTeX renderizable (${context}): "${latex}"`, false);
        console.error(`       ${message}`);
      }
    }
  }
  check(`todas las fórmulas LaTeX únicas son renderizables (${formulaCount - formulaFailures}/${formulaCount})`, formulaFailures === 0);

  printCoverageSummary(CONTENT_MANIFEST, foundQuestionsByTopic, foundResourceTopics);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de contenido fuente (CONTENT-4.1) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
