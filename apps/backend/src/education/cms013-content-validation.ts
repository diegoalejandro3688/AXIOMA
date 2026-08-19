/**
 * =============================================================================
 * CMS-013 -- VALIDACIONES DE CONTENIDO PREVIAS A LA REVISIÓN.
 * LEF Bloque VII, Incremento 4. Ver LEF-BLOCK-VII-DEFINITION.md §5.2 (fila
 * `CMS-013`/`CMS-004`/`DM-D114`), §8.2 (precondición de T3), §12.4 (frontera)
 * y §13.4 punto 5 (criterio de cierre).
 * =============================================================================
 *
 * DE DÓNDE SALEN LAS REGLAS, LITERALMENTE. No se inventa ninguna regla
 * académica que el documento no pida. Las dos formulaciones del contrato son:
 *
 *   §8.2, T3, columna "Precondiciones":
 *     "validaciones de contenido de CMS-013 en PASS (exactamente una
 *      alternativa correcta, sin alternativas duplicadas, explicación
 *      presente, clasificación completa)"
 *
 *   §12.4, "Frontera exacta":
 *     "envío a revisión (T3) con las validaciones de contenido de CMS-013
 *      (exactamente una alternativa correcta, número válido de alternativas,
 *      sin duplicados, explicación presente, clasificación completa)"
 *
 * La unión de ambas da CINCO reglas, y son exactamente las cinco que este
 * archivo implementa. §13.4 punto 5 exige además, nominalmente, que se
 * rechacen: cero correctas, dos correctas, duplicadas y explicación ausente.
 *
 * -----------------------------------------------------------------------------
 * NOTA DE HONESTIDAD SOBRE "NÚMERO VÁLIDO DE ALTERNATIVAS"
 * -----------------------------------------------------------------------------
 * Ni la Definition ni la auditoría fijan un número (ni 4, ni 5, ni un rango).
 * Se buscó en `LEF-BLOCK-VII-DEFINITION.md` y `LEF-BLOCK-VII-EDITORIAL-AUDIT.md`
 * y no existe. Por tanto NO se inventa uno: inventar "exactamente 4
 * alternativas" sería una decisión de producto disfrazada de ingeniería, y el
 * seed y las fixtures existentes usan cantidades distintas entre sí.
 *
 * Lo único que sí está determinado sin decidir nada es el MÍNIMO
 * ESTRUCTURAL: `Question.questionType` solo admite `SINGLE_CHOICE`
 * (`schema.prisma`, enum `QuestionType`, "M1 solo admite SINGLE_CHOICE"), y
 * una pregunta de selección única con 0 o 1 alternativa no es una selección
 * -- no hay nada entre lo que elegir, y la "exactamente una correcta" sería
 * trivialmente la única opción posible. `>= 2` es una consecuencia de la
 * semántica del tipo, no un umbral editorial elegido.
 *
 * NO se impone cota superior: eso sí sería un número inventado. Si el Product
 * Owner quiere fijar un número exacto (p. ej. las 4 alternativas típicas de
 * PAES), es un cambio de una constante en este archivo y una línea en §12.4.
 *
 * -----------------------------------------------------------------------------
 * DÓNDE VIVE Y DÓNDE NO
 * -----------------------------------------------------------------------------
 * Es una función PURA sobre datos ya leídos, sin Prisma, sin HTTP y sin
 * dependencias de Nest. La invoca `EditorialTransitionService` como
 * precondición dura de T3 (y solo de T3): §8.2 la sitúa exactamente ahí y en
 * ningún otro punto de la máquina de estados. En particular NO se aplica en T1
 * ni en T2 -- un borrador incompleto es el estado normal de un borrador; lo
 * que CMS-013 impide es ENVIARLO A REVISIÓN incompleto.
 *
 * NO es la tipificación de hallazgos por severidad con bloqueo formal
 * (`editorial_finding`, `DM-D113`): eso está DIFERIDO por DM §9.21 (§5.2) y
 * este archivo no lo adelanta. Aquí un incumplimiento es un rechazo binario
 * con mensaje explícito, nada más.
 */

/** Vista mínima que CMS-013 necesita de una `question_version`. */
export interface Cms013QuestionInput {
  curriculumTopicId: string | null;
  /** `explanation_content` tal como está persistido (bloques JSON). */
  explanationContent: unknown;
  answerOptions: ReadonlyArray<{ content: unknown; isCorrect: boolean }>;
}

/** Vista mínima que CMS-013 necesita de una `learning_resource_version`. */
export interface Cms013LearningResourceInput {
  curriculumTopicId: string | null;
  title: string | null;
  contentBlocks: unknown;
}

/**
 * Mínimo estructural de alternativas -- ver la nota de honestidad de arriba.
 * Consecuencia de `QuestionType.SINGLE_CHOICE`, no un umbral editorial.
 */
export const CMS013_MIN_ANSWER_OPTIONS = 2;

/**
 * Normalización para la comparación de DUPLICADOS.
 *
 * Dos alternativas son la misma si su CONTENIDO es el mismo, con independencia
 * de `displayOrder`, de `isCorrect` y de espaciado o mayúsculas. Comparar el
 * JSON crudo dejaría pasar "12" y "12 " como distintas, que es exactamente el
 * duplicado que un autor comete en la práctica.
 *
 * Se compara sobre el bloque de contenido, cuyo contrato en M1 es un bloque
 * único `paragraph` o `formula` (`answerOptionContentSchema`): para
 * `paragraph` la clave es su texto; para `formula`, su LaTeX -- NUNCA su SVG,
 * que es un artefacto derivado y podría diferir por espaciado del renderizador
 * aun para el mismo LaTeX.
 */
function answerOptionComparisonKey(content: unknown): string {
  if (content !== null && typeof content === 'object') {
    const block = content as Record<string, unknown>;
    if (block.type === 'paragraph' && typeof block.text === 'string') {
      return `paragraph:${block.text.trim().replace(/\s+/g, ' ').toLowerCase()}`;
    }
    if (block.type === 'formula' && typeof block.latex === 'string') {
      return `formula:${block.latex.trim().replace(/\s+/g, ' ')}`;
    }
  }
  // Tipo de bloque no previsto por M1: se compara su forma serializada. No se
  // lanza -- Zod ya validó la forma al escribir; aquí solo se compara.
  return `raw:${JSON.stringify(content)}`;
}

/**
 * ¿Hay contenido REAL en un arreglo de bloques? "Explicación presente" no
 * puede significar solamente "la columna no es NULL": un arreglo vacío, o un
 * arreglo de párrafos en blanco, es una explicación ausente disfrazada.
 */
function hasSubstantiveBlocks(blocks: unknown): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;
  return blocks.some((raw) => {
    if (raw === null || typeof raw !== 'object') return false;
    const block = raw as Record<string, unknown>;
    if (block.type === 'paragraph' || block.type === 'heading') {
      return typeof block.text === 'string' && block.text.trim().length > 0;
    }
    if (block.type === 'formula') {
      return typeof block.latex === 'string' && block.latex.trim().length > 0;
    }
    if (block.type === 'image') {
      return typeof block.objectKey === 'string' && block.objectKey.trim().length > 0;
    }
    return false;
  });
}

/**
 * Aplica CMS-013 a una versión de pregunta. Devuelve la lista COMPLETA de
 * incumplimientos, no el primero: un autor que envía a revisión merece ver
 * todo lo que le falta de una vez, no descubrirlo de uno en uno.
 *
 * Lista vacía == PASS.
 */
export function evaluateCms013ForQuestion(input: Cms013QuestionInput): string[] {
  const violations: string[] = [];

  // Regla 1 -- "clasificación completa" (§8.2 T3, §12.4).
  //
  // La clasificación curricular de una versión es `curriculum_topic_id`
  // (ADR-0012: "vive AQUÍ, no en la identidad -- es la clasificación editorial
  // fina, trazable por versión"). Su CONSISTENCIA con la materia de la
  // pregunta ya la aplica PostgreSQL
  // (`trg_question_version_subject_consistency`, migración
  // 20260801205203_education_foundation_expand); aquí se comprueba su
  // PRESENCIA, que es lo que CMS-013 nombra.
  if (!input.curriculumTopicId) {
    violations.push(
      'CMS-013 (clasificación completa): la versión no tiene tema curricular asignado (curriculumTopicId).',
    );
  }

  // Regla 2 -- "explicación presente" (§8.2 T3, §12.4, §13.4 punto 5).
  if (!hasSubstantiveBlocks(input.explanationContent)) {
    violations.push(
      'CMS-013 (explicación presente): la versión no tiene explicación, o su explicación no contiene ningún bloque con contenido real.',
    );
  }

  // Regla 3 -- "número válido de alternativas" (§12.4). Ver la nota de
  // honestidad de la cabecera: mínimo estructural de SINGLE_CHOICE, sin cota
  // superior inventada.
  if (input.answerOptions.length < CMS013_MIN_ANSWER_OPTIONS) {
    violations.push(
      `CMS-013 (número válido de alternativas): una pregunta SINGLE_CHOICE necesita al menos ${CMS013_MIN_ANSWER_OPTIONS} alternativas entre las que elegir; tiene ${input.answerOptions.length}.`,
    );
  }

  // Regla 4 -- "exactamente una alternativa correcta" (§8.2 T3, §12.4).
  // §13.4 punto 5 exige nominalmente rechazar CERO y DOS. Se distinguen los
  // dos mensajes porque son errores editoriales distintos.
  const correctCount = input.answerOptions.filter((option) => option.isCorrect).length;
  if (correctCount === 0) {
    violations.push(
      'CMS-013 (exactamente una alternativa correcta): ninguna alternativa está marcada como correcta.',
    );
  } else if (correctCount > 1) {
    violations.push(
      `CMS-013 (exactamente una alternativa correcta): hay ${correctCount} alternativas marcadas como correctas.`,
    );
  }

  // Regla 5 -- "sin alternativas duplicadas" (§8.2 T3, §12.4, §13.4 punto 5).
  const seen = new Map<string, number>();
  const duplicated = new Set<string>();
  input.answerOptions.forEach((option) => {
    const key = answerOptionComparisonKey(option.content);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) duplicated.add(key);
  });
  if (duplicated.size > 0) {
    violations.push(
      `CMS-013 (sin alternativas duplicadas): ${duplicated.size} contenido(s) de alternativa aparecen más de una vez.`,
    );
  }

  return violations;
}

/**
 * Aplica CMS-013 a una versión de recurso de aprendizaje.
 *
 * §8.2 y §8.4 tratan las DOS familias en paralelo, con exactamente las mismas
 * transiciones, de modo que T3 y su precondición se aplican también aquí. De
 * las cinco reglas, las tres que tienen sentido sobre un recurso son las que
 * no hablan de alternativas: clasificación completa, título presente y
 * contenido presente. Las dos reglas de alternativas (`exactamente una
 * correcta`, `sin duplicados`) no son aplicables porque un
 * `learning_resource_version` no tiene `answer_option` -- no se "relajan": no
 * tienen objeto sobre el que aplicarse.
 */
export function evaluateCms013ForLearningResource(input: Cms013LearningResourceInput): string[] {
  const violations: string[] = [];

  if (!input.curriculumTopicId) {
    violations.push(
      'CMS-013 (clasificación completa): la versión no tiene tema curricular asignado (curriculumTopicId).',
    );
  }

  if (!input.title || input.title.trim().length === 0) {
    violations.push('CMS-013 (contenido presente): la versión no tiene título.');
  }

  // Equivalente de "explicación presente" en un recurso: su cuerpo.
  if (!hasSubstantiveBlocks(input.contentBlocks)) {
    violations.push(
      'CMS-013 (contenido presente): la versión no tiene bloques de contenido con contenido real.',
    );
  }

  return violations;
}
