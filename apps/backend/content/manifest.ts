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
  /**
   * CONTENT-4.3A -- Golden Unit real M1 / Eje Números (PAES M1, Admisión
   * 2027, DEMRE). `subjectKey: 'matematica'` reutiliza EXACTAMENTE los
   * mismos valores que `prisma/seed.ts` ya usa para el Subject real
   * (`name: 'Matemática'`, `shortName: 'Mate'`, `displayOrder: 1`) -- no se
   * inventa una materia paralela.
   *
   * Los 3 recursos (`ENTEROS_RACIONALES`/`PORCENTAJE`/`POTENCIAS_RAICES`)
   * están declarados aquí con su `expectedQuestions`/`expectedDifficulty`
   * oficiales, pero TODAVÍA NO tienen módulo `.ts` en `content/estudio/`:
   * CONTENT-4.3A entrega solo las Resource Specs (documentación fuente en
   * `content/specs/m1-numeros/*.md`), no los módulos importables -- ver
   * `resourceContentModuleSchema.questions` (mínimo 1 pregunta real) y el
   * reporte de entrega de CONTENT-4.3A, sección de riesgos. El gate no falla
   * por esto: `resourcesPresent`/`foundQuestionsByTopic` son puramente
   * informativos (0/3 recursos presentes hasta CONTENT-4.3C).
   *
   * NOTA DE AUDITORÍA -- código no colisiona pero se solapa académicamente:
   * `prisma/seed.ts` ya crea `M1.NUMEROS.PORCENTAJES` (PLURAL, contenido de
   * prueba `TEST-CONTENT-1`, no es catálogo PAES real). El código de este
   * recurso, `M1.NUMEROS.PORCENTAJE` (SINGULAR), es una fila DISTINTA -- sin
   * conflicto de unicidad -- pero la superposición temática debe resolverse
   * antes de importar en CONTENT-4.3B/C (seed.ts está fuera de alcance de
   * este incremento).
   */
  {
    // M1/M2 SUBJECT TAXONOMY ALIGNMENT -- Estudio V1 tiene 5 materias
    // académicas y "Matemática M1" / "Matemática M2" son DISTINTAS. Este
    // Subject (subjectKey `matematica`, id preservado) pasa a representar
    // oficialmente Matemática M1; sólo contiene unidades M1.*. Las unidades
    // M2.* viven ahora en la entrada `matematica-m2` de más abajo. La
    // migración `20260829120000_split_m1_m2_subjects` reasigna la taxonomía
    // ya persistida; `resolveOrCreateSubject` (editorial) rechaza un name/
    // shortName/displayOrder distinto del persistido, así que estos tres
    // valores DEBEN coincidir exactamente con esa migración y con seed.ts.
    subjectKey: 'matematica',
    name: 'Matemática M1',
    shortName: 'M1',
    displayOrder: 1,
    kind: 'catalog',
    units: [
      {
        unitCode: 'M1.NUMEROS',
        name: 'Números',
        order: 1,
        resources: [
          {
            topicCode: 'M1.NUMEROS.ENTEROS_RACIONALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.NUMEROS.PORCENTAJE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.NUMEROS.POTENCIAS_RAICES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-4.5 -- Golden Unit real M1 / Eje Álgebra y funciones (PAES
       * M1). Mismo patrón exacto que `M1.NUMEROS` (CONTENT-4.3): 6 recursos
       * reales con módulo `.ts` completo en `content/estudio/`, sin Resource
       * Specs adicionales (el contenido editorial ya llegó cerrado en este
       * incremento).
       *
       * `PROPORCIONALIDAD` reutiliza editorialmente 4 de las 12 preguntas
       * legacy de `M1.NUMEROS.PORCENTAJES` (antiguas Q9/Q10/Q11/Q12, ya
       * identificadas en auditoría de CONTENT-4.3/4.4 como Proporcionalidad,
       * no Porcentaje) -- pero como identities NUEVAS bajo
       * `M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD.Q3/Q4/Q7/Q8`. Las filas
       * legacy PUBLISHED no se tocan (no se reparentan, editan, deprecan ni
       * migran) -- CONTENT-4.5 no importa nada, ver reporte de entrega.
       */
      {
        unitCode: 'M1.ALGEBRA_FUNCIONES',
        name: 'Álgebra y funciones',
        order: 2,
        resources: [
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.EXPRESIONES_ALGEBRAICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.PROPORCIONALIDAD',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.ECUACIONES_INECUACIONES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.SISTEMAS_2X2',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.FUNCION_LINEAL_AFIN',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.ALGEBRA_FUNCIONES.FUNCION_CUADRATICA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-4.7 -- Golden Unit real M1 / Eje Geometría (PAES M1). Mismo
       * patrón exacto que `M1.NUMEROS` (CONTENT-4.3) y
       * `M1.ALGEBRA_FUNCIONES` (CONTENT-4.5): 4 recursos reales con módulo
       * `.ts` completo en `content/estudio/m1-geometria/`, contenido
       * editorial ya cerrado/APPROVED en este incremento -- solo
       * implementación técnica (contentBlocks/LaTeX/keys), cero cambios de
       * contenido. NO se agrega aquí `M1.PROBABILIDAD_ESTADISTICA` (M1 U4,
       * reservado para CONTENT-4.8).
       */
      {
        unitCode: 'M1.GEOMETRIA',
        name: 'Geometría',
        order: 3,
        resources: [
          {
            topicCode: 'M1.GEOMETRIA.FIGURAS_GEOMETRICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.GEOMETRIA.CUERPOS_GEOMETRICOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.GEOMETRIA.TRANSFORMACIONES_ISOMETRICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.GEOMETRIA.SEMEJANZA_PROPORCIONALIDAD_FIGURAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-4.8 -- Golden Unit real M1 / Eje Probabilidad y estadística
       * (PAES M1). Mismo patrón exacto que `M1.NUMEROS` (CONTENT-4.3),
       * `M1.ALGEBRA_FUNCIONES` (CONTENT-4.5) y `M1.GEOMETRIA` (CONTENT-4.7):
       * 3 recursos reales con módulo `.ts` completo en
       * `content/estudio/m1-probabilidad-estadistica/`, contenido editorial
       * ya cerrado/APPROVED en este incremento -- solo implementación
       * técnica (contentBlocks/LaTeX/keys), cero cambios de contenido. Con
       * esta unidad, M1 queda COMPLETA en source (16 recursos / 160
       * preguntas) -- no se agrega ninguna otra materia ni unidad M2 en
       * este incremento.
       */
      {
        unitCode: 'M1.PROBABILIDAD_ESTADISTICA',
        name: 'Probabilidad y estadística',
        order: 4,
        resources: [
          {
            topicCode: 'M1.PROBABILIDAD_ESTADISTICA.REPRESENTACION_DATOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.PROBABILIDAD_ESTADISTICA.MEDIDAS_POSICION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'M1.PROBABILIDAD_ESTADISTICA.REGLAS_PROBABILIDADES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
    ],
  },
  {
    // M1/M2 SUBJECT TAXONOMY ALIGNMENT -- nueva materia académica "Matemática
    // M2" (subjectKey `matematica-m2`, displayOrder 2). Sólo unidades M2.*.
    // El CONTENIDO editorial (LearningResource/Question/versiones/alternativas)
    // NO se mueve ni se recrea: la migración `20260829120000_split_m1_m2_subjects`
    // reasigna `curriculum_topic.subject_id` / `*.primary_subject_id` de las
    // identidades M2.* ya persistidas, con los IDs intactos. name/shortName/
    // displayOrder DEBEN coincidir con esa migración y con seed.ts
    // (`resolveOrCreateSubject` rechaza un valor distinto del persistido).
    // Los `order` de unidad se conservan (5..8) para que el importer sea
    // NO-OP contra la taxonomía ya sembrada; no se re-numeran.
    subjectKey: 'matematica-m2',
    name: 'Matemática M2',
    shortName: 'M2',
    displayOrder: 2,
    kind: 'catalog',
    units: [
      {
        unitCode: 'M2.NUMEROS',
        name: 'Números',
        order: 5,
        resources: [
          {
            topicCode: 'M2.NUMEROS.NUMEROS_REALES_LOGARITMOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
          {
            topicCode: 'M2.NUMEROS.MATEMATICA_FINANCIERA_MODELOS_CRECIMIENTO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
        ],
      },
      {
        unitCode: 'M2.ALGEBRA_FUNCIONES',
        name: 'Álgebra y funciones',
        order: 6,
        resources: [
          {
            topicCode: 'M2.ALGEBRA_FUNCIONES.SISTEMAS_ECUACIONES_ECUACIONES_CUADRATICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
          {
            topicCode: 'M2.ALGEBRA_FUNCIONES.FUNCION_POTENCIA_MODELAMIENTO_ALGEBRAICO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
        ],
      },
      {
        unitCode: 'M2.GEOMETRIA',
        name: 'Geometría',
        order: 7,
        resources: [
          {
            topicCode: 'M2.GEOMETRIA.HOMOTECIA_RELACIONES_GEOMETRICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
          {
            topicCode: 'M2.GEOMETRIA.TRIGONOMETRIA_TRIANGULOS_RECTANGULOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
        ],
      },
      {
        unitCode: 'M2.PROBABILIDAD_ESTADISTICA',
        name: 'Probabilidad y estadística',
        order: 8,
        resources: [
          {
            topicCode: 'M2.PROBABILIDAD_ESTADISTICA.MEDIDAS_DISPERSION_PROBABILIDAD_CONDICIONAL',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
          {
            topicCode: 'M2.PROBABILIDAD_ESTADISTICA.COMBINATORIA_MODELO_BINOMIAL',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 2, MEDIA: 4, DIFICIL: 4 },
          },
        ],
      },
    ],
  },
  /**
   * CONTENT-L2 -- Golden Unit real Lenguaje / PAES Competencia Lectora, U1
   * Localizar + U2 Interpretar. Mismo patrón exacto que `matematica`: cada
   * recurso tiene módulo `.ts` completo en `content/estudio/lenguaje-localizar/`
   * y `content/estudio/lenguaje-interpretar/`,
   * contenido editorial ya cerrado/APPROVED (ver
   * ZETRYND-LENGUAJE-U1-U2-EDITORIAL-APPROVED.md) -- solo implementación
   * técnica (contentBlocks/keys), cero cambios de contenido. `subjectKey`
   * `'lenguaje'` es la clave estable de esta materia -- no existía antes de
   * este incremento. U3 (Evaluar) queda explícitamente FUERA de alcance de
   * CONTENT-L2 y no se declara aquí.
   */
  {
    subjectKey: 'lenguaje',
    name: 'Lenguaje',
    shortName: 'Leng',
    displayOrder: 3,
    kind: 'catalog',
    units: [
      {
        unitCode: 'LENGUAJE.LOCALIZAR',
        name: 'Localizar',
        order: 1,
        resources: [
          {
            topicCode: 'LENGUAJE.LOCALIZAR.INFORMACION_EXPLICITA_RELEVANTE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.LOCALIZAR.RELACIONES_REFERENCIA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.LOCALIZAR.TEXTOS_DISCONTINUOS_MULTIMODALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      {
        unitCode: 'LENGUAJE.INTERPRETAR',
        name: 'Interpretar',
        order: 2,
        resources: [
          {
            topicCode: 'LENGUAJE.INTERPRETAR.IDEA_PRINCIPAL_JERARQUIA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.INTERPRETAR.RELACIONES_ENTRE_IDEAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.INTERPRETAR.INFERENCIAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.INTERPRETAR.SINTESIS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.INTERPRETAR.SIGNIFICADO_CONTEXTO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.INTERPRETAR.FUNCION_RECURSOS_TEXTO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-L3A + CONTENT-L3B -- Golden Unit real Lenguaje / U3 Evaluar,
       * COMPLETA (5 de 5 recursos oficiales: E1/E2/E3 de CONTENT-L3A, E4/E5
       * de CONTENT-L3B). Mismo patrón exacto que
       * `LENGUAJE.LOCALIZAR`/`LENGUAJE.INTERPRETAR`: cada recurso tiene
       * módulo `.ts` completo en `content/estudio/lenguaje-evaluar/`,
       * contenido editorial ya cerrado/APPROVED en cada incremento -- solo
       * implementación técnica, cero cambios de contenido.
       *
       * NOTA DE CORRECCIÓN (CONTENT-L3B, punto 0) -- el comentario original
       * de CONTENT-L3A nombraba incorrectamente E4/E5 como
       * "Contraargumentación y refutación" / "Coherencia y consistencia
       * argumentativa". Esos nombres fueron una alucinación de un reporte
       * anterior y NUNCA fueron los recursos editoriales reales. Los
       * nombres correctos, APPROVED y ya implementados, son:
       * `CALIDAD_CONFIABILIDAD_INFORMACION` ("Calidad y confiabilidad de la
       * información") y `RECURSOS_PERSUASIVOS_EFECTOS` ("Recursos
       * persuasivos y efectos en el lector").
       */
      {
        unitCode: 'LENGUAJE.EVALUAR',
        name: 'Evaluar',
        order: 3,
        resources: [
          {
            topicCode: 'LENGUAJE.EVALUAR.PROPOSITO_INTENCION_ACTITUD',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.EVALUAR.PERSPECTIVA_PUNTO_VISTA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.EVALUAR.ARGUMENTOS_EVIDENCIAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.EVALUAR.CALIDAD_CONFIABILIDAD_INFORMACION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'LENGUAJE.EVALUAR.RECURSOS_PERSUASIVOS_EFECTOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
    ],
  },
  /**
   * CONTENT-H1A -- Golden Unit real Historia / U1 "Historia: Mundo, América
   * y Chile", BLOQUE 1 (3 primeros recursos oficiales de la unidad: R1/R2/
   * R3, de un total posterior mayor). Mismo patrón exacto que
   * `lenguaje`/`matematica`: cada recurso tiene módulo `.ts` completo en
   * `content/estudio/historia-mundo-america-chile/`, contenido editorial ya
   * cerrado/APPROVED en este incremento -- solo implementación técnica,
   * cero cambios de contenido.
   *
   * `subjectKey: 'historia'`, `name`, `shortName` y `displayOrder: 4` NO son
   * inventados: coinciden EXACTAMENTE con el Subject `historia` que ya
   * existe en el seed real de `axioma_dev` (auditado directamente en DB
   * antes de escribir este manifest, lección aprendida de CONTENT-L2A.1
   * donde un `displayOrder` inventado para `lenguaje` produjo un 409 real en
   * import). El seed también contiene contenido legacy bajo el mismo
   * Subject (`H1.CHILE.SIGLO20.ISI`, convención de código `H1.*` distinta),
   * que este incremento NO toca -- mismo patrón de coexistencia ya usado
   * con `M1.NUMEROS.PORCENTAJES` y `L1.LECTURA.INFERENCIA`.
   *
   * CONTENT-H3A agrega R7-R9 (Bloque 3: Nuevo orden mundial de posguerra y
   * descolonización, Guerra Fría, Movilización política y social en América
   * Latina), completando `HISTORIA.MUNDO_AMERICA_CHILE` con 9 recursos.
   * (R8/R9 fueron corregidos editorialmente en CONTENT-H3A.1 tras detectarse
   * una divergencia frente a la fuente APPROVED -- ver comentarios de esos
   * módulos fuente.)
   *
   * CONTENT-H4A agrega R10-R12 (Bloque 4: Fin de la Guerra Fría y
   * globalización, Sociedad chilena de mediados del siglo XX,
   * Democratización de la sociedad chilena), completando
   * `HISTORIA.MUNDO_AMERICA_CHILE` con 12 recursos.
   *
   * CONTENT-H5A agrega R13-R15 (Bloque 5: Golpe de Estado de 1973 y quiebre
   * de la democracia, Modelo económico neoliberal durante la Dictadura
   * Militar, Violaciones a los Derechos Humanos y supresión del Estado de
   * derecho), completando `HISTORIA.MUNDO_AMERICA_CHILE` con 15 recursos.
   *
   * CONTENT-H6A agrega R16-R17 (Bloque 6: Recuperación de la democracia
   * durante la década de 1980, Transición a la democracia iniciada en 1988) y
   * CIERRA la U1 `HISTORIA.MUNDO_AMERICA_CHILE` con 17 recursos / 170
   * preguntas.
   *
   * CONTENT-H7A agrega la U2 `HISTORIA.FORMACION_CIUDADANA` (Formación
   * ciudadana, R18-R21, 4 recursos / 40 preguntas).
   *
   * CONTENT-H8A agrega la U3 `HISTORIA.SISTEMA_ECONOMICO` (Sistema económico,
   * R22-R27, 6 recursos / 60 preguntas) y COMPLETA la asignatura Historia en
   * source: 3 unidades / 27 recursos / 270 preguntas.
   */
  {
    subjectKey: 'historia',
    name: 'Historia',
    shortName: 'Hist',
    // M1/M2 SUBJECT TAXONOMY ALIGNMENT -- desplazado 4 -> 5 por la nueva
    // materia `matematica-m2` en displayOrder 2.
    displayOrder: 5,
    kind: 'catalog',
    units: [
      {
        unitCode: 'HISTORIA.MUNDO_AMERICA_CHILE',
        name: 'Historia: Mundo, América y Chile',
        order: 1,
        resources: [
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.IDEAS_REPUBLICANAS_LIBERALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.ESTADO_NACION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.FORMACION_REPUBLICA_CHILE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.ECONOMIA_MERCADOS_INTERNACIONALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSFORMACIONES_SOCIEDAD_CHILENA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.CRISIS_ESTADO_LIBERAL',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.POSGUERRA_DESCOLONIZACION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.GUERRA_FRIA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.MOVILIZACION_AMERICA_LATINA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.FIN_GUERRA_FRIA_GLOBALIZACION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.SOCIEDAD_CHILENA_MEDIADOS_SIGLO_XX',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.DEMOCRATIZACION_SOCIEDAD_CHILENA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.GOLPE_1973_QUIEBRE_DEMOCRACIA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.MODELO_ECONOMICO_NEOLIBERAL_DICTADURA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.DDHH_ESTADO_DERECHO_DICTADURA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.RECUPERACION_DEMOCRACIA_DECADA_1980',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.MUNDO_AMERICA_CHILE.TRANSICION_DEMOCRACIA_1988',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-H7A -- Historia / U2 "Formación ciudadana", COMPLETA (4 de 4
       * recursos: R18 Democracia: fundamentos, atributos y dimensiones; R19
       * Institucionalidad democrática en Chile; R20 Democracia en la sociedad
       * de la información; R21 Sistema judicial y acceso a la justicia en
       * Chile). Mismo patrón exacto que U1 `HISTORIA.MUNDO_AMERICA_CHILE`:
       * cada recurso con módulo `.ts` completo en
       * `content/estudio/historia-formacion-ciudadana/`, contenido editorial
       * ya cerrado/APPROVED en este incremento. `order: 2` = segunda unidad
       * de la asignatura. U3 (Sistema económico) sigue fuera de alcance.
       */
      {
        unitCode: 'HISTORIA.FORMACION_CIUDADANA',
        name: 'Formación ciudadana',
        order: 2,
        resources: [
          {
            topicCode: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_FUNDAMENTOS_ATRIBUTOS_DIMENSIONES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.FORMACION_CIUDADANA.INSTITUCIONALIDAD_DEMOCRATICA_CHILE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.FORMACION_CIUDADANA.DEMOCRACIA_SOCIEDAD_INFORMACION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.FORMACION_CIUDADANA.SISTEMA_JUDICIAL_ACCESO_JUSTICIA_CHILE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CONTENT-H8A -- Historia / U3 "Sistema económico", COMPLETA (6 de 6
       * recursos: R22 Funcionamiento del mercado y factores que pueden
       * alterarlo; R23 Relaciones entre el Estado y el mercado; R24 Modelos
       * de desarrollo: impactos sociales y medioambientales; R25 Derechos
       * laborales y mecanismos institucionales de protección; R26 Movimientos
       * y organizaciones sociales en la defensa de los derechos laborales;
       * R27 Transformaciones del mundo del trabajo y derechos laborales).
       * Mismo patrón exacto que U1/U2: cada recurso con módulo `.ts` completo
       * en `content/estudio/historia-sistema-economico/`, contenido editorial
       * ya cerrado/APPROVED en este incremento. `order: 3` = tercera y ÚLTIMA
       * unidad editorial de la asignatura Historia.
       */
      {
        unitCode: 'HISTORIA.SISTEMA_ECONOMICO',
        name: 'Sistema económico',
        order: 3,
        resources: [
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.FUNCIONAMIENTO_MERCADO_FACTORES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.ESTADO_Y_MERCADO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.MODELOS_DESARROLLO_IMPACTOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.DERECHOS_LABORALES_PROTECCION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.MOVIMIENTOS_ORGANIZACIONES_DERECHOS_LABORALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'HISTORIA.SISTEMA_ECONOMICO.TRANSFORMACIONES_MUNDO_TRABAJO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
    ],
  },
  /**
   * CONTENT-C1A -- Golden Unit real Ciencias / U1 Biología, BLOQUE 1 (R1-R4).
   * CONTENT-C2A -- BLOQUE 2 (R5-R8: ADN/genes/síntesis de proteínas;
   * regulación y comunicación en el organismo; reproducción humana y
   * regulación hormonal; herencia genética y patrones de transmisión).
   * Del total posterior mayor -- Science Master Plan V1: 12 recursos / 120
   * preguntas para Biología. Mismo patrón exacto que `matematica`/`lenguaje`/`historia`:
   * cada recurso con módulo `.ts` completo en
   * `content/estudio/ciencias-biologia/`, contenido editorial ya
   * cerrado/APPROVED en este incremento -- solo implementación técnica, cero
   * cambios de contenido.
   *
   * `subjectKey: 'ciencias'`, `name: 'Ciencias'`, `shortName: 'Cien'` y
   * `displayOrder: 2` NO son inventados: coinciden EXACTAMENTE con el Subject
   * `ciencias` que ya existe en el seed real de `axioma_dev`
   * (`prisma/seed.ts`, `seedCienciasFixture`). Ese seed también contiene
   * contenido legacy bajo el mismo Subject (`C1.BIOLOGIA.CELULA`, convención
   * de código `C1.*` distinta), que este incremento NO toca -- mismo patrón
   * de coexistencia ya usado con `H1.*` / `L1.*` / `M1.NUMEROS.PORCENTAJES`.
   *
   * Unidad declarada INCOMPLETA A PROPÓSITO (mismo criterio que
   * `LENGUAJE.EVALUAR` en CONTENT-L3A / Historia U1 en CONTENT-H1A):
   * `manifestUnitSchema.resources` solo exige `.min(1)`. R9-R12 y las
   * unidades U2 (Física) / U3 (Química) se agregarán en incrementos futuros.
   */
  {
    subjectKey: 'ciencias',
    name: 'Ciencias',
    shortName: 'Cien',
    // M1/M2 SUBJECT TAXONOMY ALIGNMENT -- desplazado 2 -> 4 por la nueva
    // materia `matematica-m2` en displayOrder 2.
    displayOrder: 4,
    kind: 'catalog',
    units: [
      {
        unitCode: 'CIENCIAS.BIOLOGIA',
        name: 'Biología',
        order: 1,
        resources: [
          {
            topicCode: 'CIENCIAS.BIOLOGIA.ORGANIZACION_CELULAR_TIPOS_CELULAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.ORGANELOS_ESPECIALIZACION_CELULAR',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.MEMBRANA_TRANSPORTE_CELULAR',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.CICLO_CELULAR_MITOSIS_MEIOSIS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.ADN_GENES_SINTESIS_PROTEINAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.REGULACION_COMUNICACION_ORGANISMO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.REPRODUCCION_HUMANA_REGULACION_HORMONAL',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.HERENCIA_GENETICA_PATRONES_TRANSMISION',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.EVOLUCION_EVIDENCIAS_EVOLUTIVAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.MECANISMOS_EVOLUTIVOS_FORMACION_ESPECIES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.FLUJO_MATERIA_ENERGIA_ECOSISTEMAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.BIOLOGIA.POBLACIONES_COMUNIDADES_BIODIVERSIDAD_IMPACTO_HUMANO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * PHYSICS-C1A -- Ciencias / U2 "Física", primer bloque (6 de 11 recursos
       * editoriales: R13 Ondas electromagnéticas y sus propiedades; R14
       * Comportamiento y fenómenos de la luz; R15 Espejos, lentes y tecnologías
       * basadas en ondas; R16 Fuerzas, movimiento y leyes de Newton; R17
       * Fuerzas de contacto, peso, roce y elasticidad; R18 Presión en sólidos,
       * líquidos y gases). Segunda unidad de Ciencias, `order: 2`; Biología
       * queda en `order: 1`. Cada recurso con módulo `.ts` completo en
       * `content/estudio/ciencias-fisica/`, contenido editorial APPROVED.
       */
      {
        unitCode: 'CIENCIAS.FISICA',
        name: 'Física',
        order: 2,
        resources: [
          {
            topicCode: 'CIENCIAS.FISICA.ONDAS_ELECTROMAGNETICAS_PROPIEDADES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.COMPORTAMIENTO_FENOMENOS_LUZ',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.ESPEJOS_LENTES_TECNOLOGIAS_ONDAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.FUERZAS_MOVIMIENTO_LEYES_NEWTON',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.FUERZAS_CONTACTO_PESO_ROCE_ELASTICIDAD',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.PRESION_SOLIDOS_LIQUIDOS_GASES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.TIERRA_DINAMICA_TECTONICA_PLACAS_ESTRUCTURA_TERRESTRE',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.ATMOSFERA_CLIMA_CAMBIO_CLIMATICO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.CORRIENTE_ELECTRICA_VOLTAJE_RESISTENCIA',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.CIRCUITOS_ELECTRICOS_SERIE_PARALELO_MIXTOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.FISICA.POTENCIA_ENERGIA_CONSUMO_ELECTRICO',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
      /**
       * CHEMISTRY-C1A -- Ciencias / U3 "Química", primer bloque (5 de 10 recursos
       * editoriales: R24 Materia, sustancias y mezclas; R25 Separación de mezclas
       * y propiedades físicas; R26 Cambios físicos, cambios químicos y evidencias
       * experimentales; R27 Modelos atómicos, partículas subatómicas e iones;
       * R28 El carbono, enlaces y representación de moléculas orgánicas). Tercera
       * unidad de Ciencias, `order: 3`; Biología queda en `order: 1` y Física en
       * `order: 2`. Cada recurso con módulo `.ts` completo en
       * `content/estudio/ciencias-quimica/`, contenido editorial APPROVED.
       */
      {
        unitCode: 'CIENCIAS.QUIMICA',
        name: 'Química',
        order: 3,
        resources: [
          {
            topicCode: 'CIENCIAS.QUIMICA.MATERIA_SUSTANCIAS_MEZCLAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.SEPARACION_MEZCLAS_PROPIEDADES_FISICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.CAMBIOS_FISICOS_CAMBIOS_QUIMICOS_EVIDENCIAS_EXPERIMENTALES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.MODELOS_ATOMICOS_PARTICULAS_SUBATOMICAS_IONES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.CARBONO_ENLACES_REPRESENTACION_MOLECULAS_ORGANICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.HIDROCARBUROS_ESTRUCTURA_COMPUESTOS_ORGANICOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.GRUPOS_FUNCIONALES_PROPIEDADES_COMPUESTOS_ORGANICOS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.REACCIONES_QUIMICAS_ECUACIONES_QUIMICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.MOL_MASA_MOLAR_RELACIONES_ESTEQUIOMETRICAS',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
          {
            topicCode: 'CIENCIAS.QUIMICA.REACTIVO_LIMITANTE_RENDIMIENTO_ANALISIS_CUANTITATIVO_REACCIONES',
            expectedQuestions: 10,
            expectedDifficulty: { FACIL: 3, MEDIA: 5, DIFICIL: 2 },
          },
        ],
      },
    ],
  },
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
