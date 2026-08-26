// CONTENT-4.1 -- Manifest de metas esperadas del catálogo V1, SIN Postgres.
//
// Estructura: árbol Materia -> Unidad -> Recurso, con `expectedQuestions`
// como único dato "hoja". Los totales de unidad/materia/catálogo se
// DERIVAN siempre por suma (`expectedQuestionsForUnit`/...ForSubject/
// `totalExpectedQuestions`) -- nunca se guarda un total aparte que pudiera
// desincronizarse, así que "los totales de unidad se derivan correctamente
// de sus recursos" es una propiedad estructural del diseño, no algo que
// dependa de que alguien lo mantenga a mano.
//
// Deliberadamente SIN ninguna rama `if subjectKey === 'm2'`: M1 con 3
// recursos de 10 preguntas y M2 con ~2 recursos de 20-25 preguntas son
// simplemente distintos datos sobre la misma forma -- ver CONTENT-1.
import { z } from 'zod';
import { contentKindSchema } from './schema';

/**
 * Distribución de dificultad esperada -- OPCIONAL (ver CONTENT-4.1,
 * ajuste 2). Cuando está presente, la suma de sus tres valores debe igualar
 * `expectedQuestions` del mismo recurso (verificado por `.refine` más abajo,
 * a nivel del propio `manifestResourceSchema` -- un manifest inconsistente
 * consigo mismo ya falla al cargar, antes de que el gate compare nada
 * contra contenido real). Data-driven: CONTENT-3 fija 3/5/2 para recursos
 * de 10 preguntas, pero esta forma admite cualquier distribución para
 * cualquier cantidad, sin ninguna rama `if expectedQuestions === 10`.
 */
export const difficultyDistributionSchema = z.object({
  FACIL: z.number().int().nonnegative(),
  MEDIA: z.number().int().nonnegative(),
  DIFICIL: z.number().int().nonnegative(),
});
export type DifficultyDistribution = z.infer<typeof difficultyDistributionSchema>;

export const manifestResourceSchema = z
  .object({
    /** Código del `CurriculumTopic` hijo (Recurso) -- debe ser el `topicCode` real del módulo de contenido correspondiente. */
    topicCode: z.string().min(1),
    expectedQuestions: z.number().int().positive(),
    /** Ausente = el gate omite la comprobación de distribución para este recurso (ver CONTENT-4.1, ajuste 2). */
    expectedDifficulty: difficultyDistributionSchema.optional(),
  })
  .refine(
    (resource) =>
      !resource.expectedDifficulty ||
      resource.expectedDifficulty.FACIL + resource.expectedDifficulty.MEDIA + resource.expectedDifficulty.DIFICIL ===
        resource.expectedQuestions,
    { message: 'expectedDifficulty debe sumar exactamente expectedQuestions.', path: ['expectedDifficulty'] },
  );
export type ManifestResource = z.infer<typeof manifestResourceSchema>;

export const manifestUnitSchema = z.object({
  /** Código del `CurriculumTopic` raíz (Unidad). */
  unitCode: z.string().min(1),
  name: z.string().min(1),
  /** CONTENT-4.2 -- `CurriculumTopic.order` de la propia unidad (raíz). Necesario para que el importer pueda resolver/crear la unidad vía la Taxonomy API (CONTENT-4.2A) sin inventar un valor. */
  order: z.number().int().positive(),
  resources: z.array(manifestResourceSchema).min(1),
});
export type ManifestUnit = z.infer<typeof manifestUnitSchema>;

export const manifestSubjectSchema = z.object({
  subjectKey: z.string().min(1),
  name: z.string().min(1),
  /** CONTENT-4.2 -- `Subject.shortName`/`Subject.displayOrder`, exigidos por `POST /administration/editorial/subjects` (CONTENT-4.2A). */
  shortName: z.string().trim().min(1).max(20),
  displayOrder: z.number().int().positive(),
  /** 'catalog' (default) = cuenta para los totales oficiales V1; 'fixture'/'validation' = excluidas (ver CONTENT-4.1 ajuste 1, CONTENT-4.2B punto 9). */
  kind: contentKindSchema.default('catalog'),
  units: z.array(manifestUnitSchema),
});
export type ManifestSubject = z.infer<typeof manifestSubjectSchema>;

export const contentManifestSchema = z.array(manifestSubjectSchema);
export type ContentManifest = z.infer<typeof contentManifestSchema>;

/**
 * Manifest V1 -- HOY solo contiene la entrada de fixture usada para probar
 * el gate (CONTENT-4.1, punto 7 del incremento). El catálogo DEMRE real de
 * M1/M2/Lenguaje/Ciencias/Historia se agrega materia por materia en
 * incrementos posteriores (CONTENT-4.5 en la auditoría previa) -- no se
 * llena aquí a propósito.
 */
export const CONTENT_MANIFEST: ContentManifest = [
  {
    subjectKey: 'fixture',
    name: '[FIXTURE] Materia de prueba (no es catálogo real)',
    shortName: 'FIXT',
    displayOrder: 999,
    kind: 'fixture',
    units: [
      {
        unitCode: 'FIXTURE.UNIDAD_DEMO',
        name: '[FIXTURE] Unidad demo',
        order: 1,
        resources: [
          {
            topicCode: 'FIXTURE.UNIDAD_DEMO.RECURSO_DEMO',
            expectedQuestions: 2,
            // Ejercita la comprobación de distribución de dificultad del gate (CONTENT-4.1, ajuste 2)
            // -- coincide con el fixture real: Q1 FACIL, Q2 MEDIA.
            expectedDifficulty: { FACIL: 1, MEDIA: 1, DIFICIL: 0 },
          },
        ],
      },
    ],
  },
  /**
   * CONTENT-4.2B -- namespace TÉCNICO/TEMPORAL para validar
   * `import-content.ts` end-to-end (CREATE/NO-OP/NEW VERSION), sin tocar ni
   * reutilizar ninguna unidad DEMRE real (nunca M1.NUMEROS.PORCENTAJES ni
   * similar). `kind: 'validation'` (CONTENT-4.2B, punto 9 -- antes
   * 'catalog', ajuste obligatorio: 'catalog' contribuía a coverage/totales
   * oficiales V1, mezclando datos técnicos con contenido académico).
   * `validation` NO cuenta en coverage, NO se importa por defecto ni con
   * `--unit`/`--all` -- solo con `--resource <key> --allow-validation`
   * explícito. Aislado en su PROPIA materia `zztest`, imposible de confundir
   * con M1/M2/Lenguaje/Ciencias/Historia. Pensado para ejecutarse
   * EXCLUSIVAMENTE contra la base de gates (`axioma_gates_dev`), nunca
   * contra producción -- ver `verify-content-import-gate.ts` y la entrega de
   * CONTENT-4.2 (riesgos/deuda).
   */
  {
    subjectKey: 'zztest',
    name: '[ZZTEST] Materia técnica de validación de importer (CONTENT-4.2, NO es catálogo académico)',
    shortName: 'ZZTEST',
    displayOrder: 9999,
    kind: 'validation',
    units: [
      {
        unitCode: 'ZZTEST.IMPORT_VALIDATION',
        name: '[ZZTEST] Unidad técnica de validación',
        order: 1,
        resources: [
          {
            topicCode: 'ZZTEST.IMPORT_VALIDATION.PIPELINE_CHECK',
            expectedQuestions: 3,
            expectedDifficulty: { FACIL: 1, MEDIA: 1, DIFICIL: 1 },
          },
        ],
      },
    ],
  },
];

// --- Helpers de agregación -- todos derivados, ninguno hardcodeado por materia ---

export function expectedQuestionsForUnit(unit: ManifestUnit): number {
  return unit.resources.reduce((sum, r) => sum + r.expectedQuestions, 0);
}

export function expectedResourceCountForUnit(unit: ManifestUnit): number {
  return unit.resources.length;
}

export function expectedQuestionsForSubject(subject: ManifestSubject): number {
  return subject.units.reduce((sum, u) => sum + expectedQuestionsForUnit(u), 0);
}

/** Materias de catálogo V1 real -- excluye `kind: 'fixture'` (CONTENT-4.1, ajuste 1). */
export function catalogSubjects(manifest: ContentManifest): ManifestSubject[] {
  return manifest.filter((s) => s.kind === 'catalog');
}

/** SOLO catálogo real -- un fixture nunca contribuye al total oficial, sin importar cuántas preguntas declare. */
export function totalExpectedQuestions(manifest: ContentManifest): number {
  return catalogSubjects(manifest).reduce((sum, s) => sum + expectedQuestionsForSubject(s), 0);
}

/** SOLO catálogo real -- ver `totalExpectedQuestions`. */
export function totalExpectedResources(manifest: ContentManifest): number {
  return catalogSubjects(manifest).reduce((sum, s) => sum + s.units.reduce((u, unit) => u + expectedResourceCountForUnit(unit), 0), 0);
}

/** Busca la entrada de manifest de UN recurso por su `topicCode`, junto con su unidad y materia. */
export function findManifestResource(
  manifest: ContentManifest,
  topicCode: string,
): { subject: ManifestSubject; unit: ManifestUnit; resource: ManifestResource } | null {
  for (const subject of manifest) {
    for (const unit of subject.units) {
      const resource = unit.resources.find((r) => r.topicCode === topicCode);
      if (resource) return { subject, unit, resource };
    }
  }
  return null;
}

/** Busca la entrada de manifest de UNA unidad por su `unitCode`. */
export function findManifestUnit(manifest: ContentManifest, unitCode: string): { subject: ManifestSubject; unit: ManifestUnit } | null {
  for (const subject of manifest) {
    const unit = subject.units.find((u) => u.unitCode === unitCode);
    if (unit) return { subject, unit };
  }
  return null;
}
