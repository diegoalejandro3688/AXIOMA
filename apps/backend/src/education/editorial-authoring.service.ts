import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  answerOptionContentSchema,
  explanationContentSchema,
  resourceContentBlocksSchema,
  type EditorialAuthoringResponse,
  type EditorialCreateLearningResourceRequest,
  type EditorialCreateLearningResourceVersionRequest,
  type EditorialCreateQuestionRequest,
  type EditorialCreateQuestionVersionRequest,
  type EditorialUpdateLearningResourceVersionRequest,
  type EditorialUpdateQuestionVersionRequest,
} from '@axioma/contracts';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AdminActionRepository } from '../administration/admin-action.repository';
import type { AuthenticatedAdminActor } from '../administration/admin-identity.service';
import { EditorialAuthoringRepository } from './editorial-authoring.repository';
import { EditorialReadRepository } from './editorial-read.repository';
import { renderLatexToSvg } from './formula-rendering';
import type { EditorialObjectType } from './editorial-version.repository';
import type { AdminActionType, Prisma } from '../generated/prisma/client';

/**
 * =============================================================================
 * AUTORÍA EDITORIAL -- LEF Bloque VII, Incremento 4.
 * T1 (crear borrador) y T2 (editar en `DRAFT`).
 * Ver LEF-BLOCK-VII-DEFINITION.md §8.2 (filas T1 y T2), §9.2, §9.3, §12.4, §13.4.
 * =============================================================================
 *
 * POR QUÉ VIVE EN `education/` Y NO EN `administration/` -- invariante 15,
 * exactamente el mismo criterio que `editorial-transition.service.ts` fijó en
 * el Incremento 3: MC §6.24 ("Solo Education publica") y §11.1 -- la capa
 * administrativa SOLICITA; EDUCATION valida sus propios invariantes y ESCRIBE.
 * `editorial/editorial.controller.ts` es una fachada HTTP y no decide nada.
 *
 * -----------------------------------------------------------------------------
 * QUÉ HACE Y QUÉ NO -- frontera exacta del Incremento 4
 * -----------------------------------------------------------------------------
 * SÍ: T1 (crear `Question`/`QuestionVersion`/`AnswerOption` y
 *     `LearningResource`/`LearningResourceVersion` en `DRAFT`) y T2 (editar
 *     mientras estén en `DRAFT`).
 * NO: ninguna transición de estado. T3 vive en `editorial-transition.service.ts`
 *     junto con T4..T8, porque §8.2 es UNA máquina de estados cerrada y partirla
 *     en dos crearía una segunda ruta de transición. Este archivo nunca escribe
 *     `editorialStatus` ni `publishedAt`.
 * NO: importación masiva (`CMS-026..029`, diferido); generación con IA
 *     (`CONTENT-014`, invariante 18 -- este archivo no importa nada de `ai/`);
 *     vista previa (`CMS-007`, diferido); Content Coverage Matrix (Incremento 5).
 *
 * -----------------------------------------------------------------------------
 * ROLES (§9.2, §7.2 tabla de trust boundaries)
 * -----------------------------------------------------------------------------
 * T1 y T2 son EXCLUSIVAS del rol **Autor**. El Publicador NO puede crear ni
 * editar contenido -- ni siquiera en `DRAFT`: §9.2 lo dice literalmente
 * ("No puede: T1, T2, T3 -- crear/editar contenido, menor privilegio,
 * ADMIN-004") y §7.2 lo repite ("Editar el contenido de una versión (ni en
 * `DRAFT` -- eso es del Autor)"). La puerta gruesa es `@RequireAdminRole('AUTHOR')`
 * en el controller; el rol ejercido que se registra en la auditoría lo resuelve
 * este servicio desde `actor.roles`, nunca desde la petición (invariante 22).
 *
 * -----------------------------------------------------------------------------
 * FÓRMULAS -- §12.4, ADR-0002, ADR-0013
 * -----------------------------------------------------------------------------
 * El autor envía LaTeX; el SVG lo genera ESTE servicio con `renderLatexToSvg()`,
 * una sola vez, en el momento en que el contenido se escribe -- nunca en
 * lectura, nunca en el dispositivo del estudiante. El bloque persistido cumple
 * `formulaBlockSchema` (`latex` + `svg`), que es el contrato de almacenamiento
 * ya existente y que NO se modifica: se REUTILIZA (§12.4).
 *
 * Un LaTeX que MathJax no puede convertir hace fallar la operación con un 400:
 * `renderLatexToSvg` lanza, y persistir un LaTeX inválido como si fuera válido
 * dejaría contenido roto en la base.
 */

/** Resultado interno común a todas las operaciones de autoría. */
interface AuthoringOutcome {
  objectType: EditorialObjectType;
  identityId: string;
  versionId: string;
  adminActionId: string;
}

@Injectable()
export class EditorialAuthoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EditorialAuthoringRepository,
    private readonly actionRepo: AdminActionRepository,
    /** CONTENT-4.2B -- lectura administrativa completa por clave (`isCorrect` incluido). */
    private readonly readRepo: EditorialReadRepository,
  ) {}

  // ==========================================================================
  // T1 -- pregunta nueva (identidad + versión DRAFT + alternativas).
  // ==========================================================================
  async createQuestion(
    actor: AuthenticatedAdminActor,
    input: EditorialCreateQuestionRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'QUESTION_VERSION');
    if (replay) return replay;

    await this.assertSubjectExists(input.primarySubjectId);
    await this.assertTopicBelongsToSubject(input.curriculumTopicId, input.primarySubjectId);
    if (await this.repo.findQuestionByKey(input.questionKey)) {
      throw new ConflictException(`Ya existe una pregunta con la clave editorial "${input.questionKey}".`);
    }

    const stemContent = this.renderResourceBlocks(input.stemContent, 'stemContent');
    const explanationContent = this.renderExplanationBlocks(input.explanationContent);
    const answerOptions = this.renderAnswerOptions(input.answerOptions);

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const question = await this.repo.createQuestionIdentity(tx, {
        questionKey: input.questionKey,
        primarySubjectId: input.primarySubjectId,
      });
      const version = await this.repo.createQuestionVersion(tx, {
        questionId: question.id,
        curriculumTopicId: input.curriculumTopicId,
        stemContent,
        explanationContent,
        answerOptions,
      });
      const action = await this.appendAction(tx, actor, 'T1', 'QUESTION_VERSION', version.id, input);
      return { objectType: 'QUESTION_VERSION' as const, identityId: question.id, versionId: version.id, adminActionId: action };
    });

    return this.project(outcome, false);
  }

  // ==========================================================================
  // T1 -- versión DRAFT nueva de una pregunta YA EXISTENTE.
  //
  // Ésta es la forma canónica de CORREGIR contenido publicado (invariante 5,
  // `CMS-025`): nunca se reedita lo publicado; se crea una versión nueva que
  // recorrerá T3 -> T5 -> T7, y en T7 la anterior se despublica dentro de la
  // misma transacción (§8.6, invariante 16). Este servicio no toca ni mira la
  // versión publicada anterior: la deja intacta y referenciable (§13.4 punto 3).
  // ==========================================================================
  async createQuestionVersion(
    actor: AuthenticatedAdminActor,
    questionId: string,
    input: EditorialCreateQuestionVersionRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'QUESTION_VERSION');
    if (replay) return replay;

    const question = await this.repo.findQuestionIdentity(questionId);
    if (!question) throw new NotFoundException('La pregunta indicada no existe.');
    await this.assertTopicBelongsToSubject(input.curriculumTopicId, question.primarySubjectId);

    const stemContent = this.renderResourceBlocks(input.stemContent, 'stemContent');
    const explanationContent = this.renderExplanationBlocks(input.explanationContent);
    const answerOptions = this.renderAnswerOptions(input.answerOptions);

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const version = await this.repo.createQuestionVersion(tx, {
        questionId: question.id,
        curriculumTopicId: input.curriculumTopicId,
        stemContent,
        explanationContent,
        answerOptions,
      });
      const action = await this.appendAction(tx, actor, 'T1', 'QUESTION_VERSION', version.id, input);
      return { objectType: 'QUESTION_VERSION' as const, identityId: question.id, versionId: version.id, adminActionId: action };
    });

    return this.project(outcome, false);
  }

  // ==========================================================================
  // T1 -- recurso de aprendizaje nuevo. §8.2 y §8.4 tratan las dos familias en
  // paralelo, con exactamente las mismas transiciones: mismo flujo, sin
  // alternativas.
  // ==========================================================================
  async createLearningResource(
    actor: AuthenticatedAdminActor,
    input: EditorialCreateLearningResourceRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'LEARNING_RESOURCE_VERSION');
    if (replay) return replay;

    await this.assertSubjectExists(input.primarySubjectId);
    await this.assertTopicBelongsToSubject(input.curriculumTopicId, input.primarySubjectId);
    if (await this.repo.findLearningResourceByKey(input.resourceKey)) {
      throw new ConflictException(`Ya existe un recurso con la clave editorial "${input.resourceKey}".`);
    }

    const contentBlocks = this.renderResourceBlocks(input.contentBlocks, 'contentBlocks');

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const resource = await this.repo.createLearningResourceIdentity(tx, {
        resourceKey: input.resourceKey,
        primarySubjectId: input.primarySubjectId,
        resourceType: input.resourceType,
      });
      const version = await this.repo.createLearningResourceVersion(tx, {
        learningResourceId: resource.id,
        curriculumTopicId: input.curriculumTopicId,
        title: input.title,
        contentBlocks,
      });
      const action = await this.appendAction(tx, actor, 'T1', 'LEARNING_RESOURCE_VERSION', version.id, input);
      return {
        objectType: 'LEARNING_RESOURCE_VERSION' as const,
        identityId: resource.id,
        versionId: version.id,
        adminActionId: action,
      };
    });

    return this.project(outcome, false);
  }

  /** T1 -- versión `DRAFT` nueva de un recurso ya existente (corrección). */
  async createLearningResourceVersion(
    actor: AuthenticatedAdminActor,
    resourceId: string,
    input: EditorialCreateLearningResourceVersionRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'LEARNING_RESOURCE_VERSION');
    if (replay) return replay;

    const resource = await this.repo.findLearningResourceIdentity(resourceId);
    if (!resource) throw new NotFoundException('El recurso de aprendizaje indicado no existe.');
    await this.assertTopicBelongsToSubject(input.curriculumTopicId, resource.primarySubjectId);

    const contentBlocks = this.renderResourceBlocks(input.contentBlocks, 'contentBlocks');

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const version = await this.repo.createLearningResourceVersion(tx, {
        learningResourceId: resource.id,
        curriculumTopicId: input.curriculumTopicId,
        title: input.title,
        contentBlocks,
      });
      const action = await this.appendAction(tx, actor, 'T1', 'LEARNING_RESOURCE_VERSION', version.id, input);
      return {
        objectType: 'LEARNING_RESOURCE_VERSION' as const,
        identityId: resource.id,
        versionId: version.id,
        adminActionId: action,
      };
    });

    return this.project(outcome, false);
  }

  // ==========================================================================
  // T2 -- edición en `DRAFT`. §8.2 fila T2: "La versión está en DRAFT".
  //
  // La comprobación de estado es de SERVICIO, y aquí eso basta como PUERTA
  // pero no como GARANTÍA -- §7.2, nota de rigor sobre la capa. La garantía
  // sigue siendo PostgreSQL: sobre una versión que alcanzó publicación, los
  // triggers del Incremento 1 rechazarían todo `UPDATE` de contenido y todo
  // `INSERT`/`DELETE` de alternativa aunque esta comprobación no existiera.
  //
  // `IN_REVIEW` congela la edición (§8.2, efecto de T3): para volver a editar
  // hay que devolver la versión a `DRAFT` con T4, que ya existe desde el
  // Incremento 3. Este servicio NO ofrece ningún atajo.
  // ==========================================================================
  async updateQuestionVersion(
    actor: AuthenticatedAdminActor,
    versionId: string,
    input: EditorialUpdateQuestionVersionRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'QUESTION_VERSION');
    if (replay) return replay;

    const version = await this.repo.findQuestionVersionForAuthoring(versionId);
    if (!version) throw new NotFoundException('La versión de pregunta indicada no existe.');
    this.assertDraft(version.editorialStatus, 'T2');
    if (input.curriculumTopicId !== undefined) {
      await this.assertTopicBelongsToSubject(input.curriculumTopicId, version.primarySubjectId);
    }
    this.assertSomethingToUpdate(input, ['curriculumTopicId', 'stemContent', 'explanationContent', 'answerOptions']);

    const stemContent = input.stemContent && this.renderResourceBlocks(input.stemContent, 'stemContent');
    const explanationContent = input.explanationContent && this.renderExplanationBlocks(input.explanationContent);
    const answerOptions = input.answerOptions && this.renderAnswerOptions(input.answerOptions);

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.updateQuestionVersionContent(tx, versionId, {
        curriculumTopicId: input.curriculumTopicId,
        stemContent,
        explanationContent,
        answerOptions,
      });
      const action = await this.appendAction(tx, actor, 'T2', 'QUESTION_VERSION', versionId, input);
      return {
        objectType: 'QUESTION_VERSION' as const,
        identityId: version.questionId,
        versionId,
        adminActionId: action,
      };
    });

    return this.project(outcome, false);
  }

  // ==========================================================================
  // Lectura administrativa completa por clave -- CONTENT-4.2B. A diferencia
  // de `project()` (que nunca expone contenido, invariante 8), este método
  // SÍ devuelve el contenido editorial completo de la versión PUBLISHED
  // actual, `isCorrect` incluido -- es una capacidad de LECTURA nueva y
  // aditiva, gateada por el mismo rol administrativo, no una relajación de
  // lo que las respuestas de ESCRITURA (T1/T2) exponen.
  // ==========================================================================
  async findQuestionByKey(questionKey: string) {
    const found = await this.readRepo.findQuestionByKeyWithVersions(questionKey);
    if (!found) throw new NotFoundException(`No existe ninguna pregunta con la clave editorial "${questionKey}".`);
    return found;
  }

  async findLearningResourceByKey(resourceKey: string) {
    const found = await this.readRepo.findLearningResourceByKeyWithVersions(resourceKey);
    if (!found) throw new NotFoundException(`No existe ningún recurso con la clave editorial "${resourceKey}".`);
    return found;
  }

  async updateLearningResourceVersion(
    actor: AuthenticatedAdminActor,
    versionId: string,
    input: EditorialUpdateLearningResourceVersionRequest,
  ): Promise<EditorialAuthoringResponse> {
    const replay = await this.resolveIdempotentReplay(actor, input.operationId, 'LEARNING_RESOURCE_VERSION');
    if (replay) return replay;

    const version = await this.repo.findLearningResourceVersionForAuthoring(versionId);
    if (!version) throw new NotFoundException('La versión de recurso indicada no existe.');
    this.assertDraft(version.editorialStatus, 'T2');
    if (input.curriculumTopicId !== undefined) {
      await this.assertTopicBelongsToSubject(input.curriculumTopicId, version.primarySubjectId);
    }
    this.assertSomethingToUpdate(input, ['curriculumTopicId', 'title', 'contentBlocks']);

    const contentBlocks = input.contentBlocks && this.renderResourceBlocks(input.contentBlocks, 'contentBlocks');

    const outcome = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await this.repo.updateLearningResourceVersionContent(tx, versionId, {
        curriculumTopicId: input.curriculumTopicId,
        title: input.title,
        contentBlocks,
      });
      const action = await this.appendAction(tx, actor, 'T2', 'LEARNING_RESOURCE_VERSION', versionId, input);
      return {
        objectType: 'LEARNING_RESOURCE_VERSION' as const,
        identityId: version.learningResourceId,
        versionId,
        adminActionId: action,
      };
    });

    return this.project(outcome, false);
  }

  // ==========================================================================
  // Validación de REFERENCIAS CANÓNICAS.
  //
  // Los 5 triggers de consistencia de Bloque I
  // (`trg_question_version_subject_consistency` y hermanos, migración
  // 20260801205203) siguen siendo la autoridad final: rechazarían una versión
  // cuyo tema pertenece a otra materia aunque estas comprobaciones no
  // existieran. Existen para dar un 400 con mensaje de dominio en vez de un
  // error de PostgreSQL sin contexto (§7.2, nota de rigor).
  // ==========================================================================
  private async assertSubjectExists(subjectId: string): Promise<void> {
    const subject = await this.repo.findSubject(subjectId);
    if (!subject) throw new BadRequestException('La materia indicada (primarySubjectId) no existe.');
  }

  private async assertTopicBelongsToSubject(topicId: string, subjectId: string): Promise<void> {
    const topic = await this.repo.findTopic(topicId);
    if (!topic) throw new BadRequestException('El tema curricular indicado (curriculumTopicId) no existe.');
    if (topic.subjectId !== subjectId) {
      throw new BadRequestException(
        'El tema curricular indicado pertenece a una materia distinta de la de la entidad. La clasificación debe ser consistente (trg_*_subject_consistency, Bloque I).',
      );
    }
  }

  /** §8.2 fila T2: la edición solo existe mientras la versión está en `DRAFT`. */
  private assertDraft(status: string, code: string): void {
    if (status === 'DRAFT') return;
    if (status === 'IN_REVIEW') {
      throw new ConflictException(
        `${code} solo puede editar una versión en DRAFT. Esta versión está en IN_REVIEW: T3 CONGELA la edición (§8.2). Para volver a editarla hay que devolverla a DRAFT con T4.`,
      );
    }
    throw new ConflictException(
      `${code} solo puede editar una versión en DRAFT. Esta versión está en ${status}. Corregir contenido que salió de DRAFT es crear una versión NUEVA (invariante 5, CMS-025), nunca reeditar la existente.`,
    );
  }

  private assertSomethingToUpdate(input: Record<string, unknown>, fields: readonly string[]): void {
    if (fields.some((f) => input[f] !== undefined)) return;
    throw new BadRequestException(
      'La petición de edición no contiene ningún campo de contenido: una acción administrativa se registra solo cuando algo cambia (§9.3, "un registro por cada operación editorial QUE CAMBIA ALGO").',
    );
  }

  // ==========================================================================
  // Renderizado de fórmulas + validación Zod de ALMACENAMIENTO.
  //
  // Doble puerta deliberada: el contrato de PETICIÓN ya validó la forma de
  // entrada; aquí se valida la forma de lo que realmente se PERSISTE, con los
  // mismos esquemas que `prisma/seed.ts` usa (`resourceContentBlocksSchema`,
  // `explanationContentSchema`, `answerOptionContentSchema`). Es la garantía
  // de que la ruta editorial escribe exactamente la misma forma de JSON que la
  // única ruta de escritura que existía hasta ahora -- ADR-0012 punto 4: Zod es
  // la autoridad de la forma del `Json`, Postgres no la conoce.
  // ==========================================================================
  private renderFormula<T extends { type: string }>(block: T): T | (T & { svg: string }) {
    if (block.type !== 'formula') return block;
    const latex = (block as unknown as { latex: string }).latex;
    let svg: string;
    try {
      svg = renderLatexToSvg(latex, false);
    } catch (error) {
      throw new BadRequestException(
        `El LaTeX de un bloque de fórmula no se puede renderizar y no se persistirá como si fuera válido: ${(error as Error).message}`,
      );
    }
    // MathJax NO siempre lanza ante un LaTeX inválido: para muchos errores de
    // sintaxis produce un SVG de ERROR (`data-mjx-error`, nodo `merror`) que
    // se renderizaría en el dispositivo del estudiante como un rectángulo rojo
    // con el mensaje de MathJax. Persistir eso sería exactamente el "LaTeX
    // inválido persistido silenciosamente como si fuera válido" que
    // `formula-rendering.ts` dice querer evitar. Se detecta y se rechaza.
    if (/data-mjx-error|<merror|mjx-merror/i.test(svg)) {
      const detail = /data-mjx-error="([^"]*)"/.exec(svg)?.[1] ?? 'sintaxis inválida';
      throw new BadRequestException(
        `El LaTeX de un bloque de fórmula es inválido y MathJax solo pudo producir un SVG de error ("${detail}"). No se persiste: se renderizaría como un error visible para el estudiante.`,
      );
    }
    return { ...block, svg };
  }

  private renderResourceBlocks(blocks: ReadonlyArray<{ type: string }>, field: string): Prisma.InputJsonValue {
    const rendered = blocks.map((b) => this.renderFormula(b));
    const parsed = resourceContentBlocksSchema.safeParse(rendered);
    if (!parsed.success) {
      throw new BadRequestException(`El contenido de ${field} no cumple el contrato de almacenamiento de EDUCATION.`);
    }
    return parsed.data as unknown as Prisma.InputJsonValue;
  }

  private renderExplanationBlocks(blocks: ReadonlyArray<{ type: string }>): Prisma.InputJsonValue {
    const rendered = blocks.map((b) => this.renderFormula(b));
    const parsed = explanationContentSchema.safeParse(rendered);
    if (!parsed.success) {
      throw new BadRequestException('El contenido de explanationContent no cumple el contrato de almacenamiento de EDUCATION.');
    }
    return parsed.data as unknown as Prisma.InputJsonValue;
  }

  private renderAnswerOptions(
    options: ReadonlyArray<{ content: { type: string }; isCorrect: boolean }>,
  ): Array<{ content: Prisma.InputJsonValue; isCorrect: boolean }> {
    return options.map((option) => {
      const parsed = answerOptionContentSchema.safeParse(this.renderFormula(option.content));
      if (!parsed.success) {
        throw new BadRequestException('El contenido de una alternativa no cumple el contrato de almacenamiento de EDUCATION.');
      }
      return { content: parsed.data as unknown as Prisma.InputJsonValue, isCorrect: option.isCorrect };
    });
  }

  // ==========================================================================
  // Auditoría (§9.3) e idempotencia (invariante 11).
  //
  // §8.2 exige clave de idempotencia SOLO en T7 y T8. Para T1 y T2 el
  // documento no la exige, de modo que aquí es OPCIONAL -- pero si el cliente
  // la envía, se HONRA con exactamente el mismo mecanismo del Incremento 3
  // (`admin_action.operation_id` es `@unique` y PostgreSQL es la autoridad).
  // No se inventa una exigencia que el contrato no fija, ni se ignora una
  // clave que el cliente sí envió.
  //
  // El registro se escribe DENTRO de la transacción del efecto: si la
  // transacción falla no hay registro; si hay registro, el efecto ocurrió.
  //
  // Campos de §9.3 para T1/T2:
  //   1 actor, 2 rol ejercido, 3 momento (`occurredAt`, default de la fila),
  //   4 tipo de acción (T1/T2), 5 objeto afectado, 6 estado previo -> nuevo,
  //   7 motivo (OPCIONAL aquí: §9.3 lo hace obligatorio en T4, T6, T8 autónomo
  //     y en todo uso de la excepción de CMS-018, no en T1/T2),
  //   8 clave de idempotencia, 9 marca de excepción (SIEMPRE `null`: §8.5
  //     acota la excepción a T5 y T7, y T1/T2 no la admiten ni podrían).
  //
  // Campo 6 en T1: `previousStatus` es `null` porque §8.2 describe T1 como
  // "(inexistente) -> DRAFT" -- no había estado previo. §9.3 hace el par
  // previo->nuevo "obligatorio para T3-T8", precisamente porque T1/T2 no
  // siempre lo tienen. En T2 ambos son `DRAFT`: la edición no cambia el estado.
  // ==========================================================================
  private async appendAction(
    tx: Prisma.TransactionClient,
    actor: AuthenticatedAdminActor,
    actionType: Extract<AdminActionType, 'T1' | 'T2'>,
    objectType: EditorialObjectType,
    objectId: string,
    input: { operationId?: string; reason?: string },
  ): Promise<string> {
    const action = await this.actionRepo.append(tx, {
      actorId: actor.actorId,
      // Resuelto del token por el backend en esta misma request (invariante
      // 22). Nada de lo que envíe el cliente participa.
      roleExercised: 'AUTHOR',
      actionType,
      objectType,
      objectId,
      previousStatus: actionType === 'T1' ? null : 'DRAFT',
      newStatus: 'DRAFT',
      reason: input.reason?.trim() ? input.reason.trim() : null,
      operationId: input.operationId ?? null,
      cms018ActivationId: null,
    });
    return action.id;
  }

  /**
   * Reconoce una repetición por clave de idempotencia ANTES de cualquier
   * efecto, con el mismo criterio que `EditorialTransitionService`: una clave
   * identifica UNA operación concreta, no un permiso de reintento genérico.
   */
  private async resolveIdempotentReplay(
    actor: AuthenticatedAdminActor,
    operationId: string | undefined,
    objectType: EditorialObjectType,
  ): Promise<EditorialAuthoringResponse | null> {
    if (!operationId) return null;
    const previous = await this.actionRepo.findByOperationId(operationId);
    if (!previous) return null;
    if (previous.objectType !== objectType) {
      throw new ConflictException(
        'Esa clave de idempotencia ya se usó para una operación sobre otro tipo de objeto. Una clave identifica una operación concreta.',
      );
    }
    const identityId = await this.resolveIdentityId(objectType, previous.objectId);
    if (!identityId) {
      throw new ConflictException('Esa clave de idempotencia corresponde a un objeto que ya no es resoluble.');
    }
    return this.project(
      { objectType, identityId, versionId: previous.objectId, adminActionId: previous.id },
      true,
    );
  }

  private async resolveIdentityId(objectType: EditorialObjectType, versionId: string): Promise<string | null> {
    if (objectType === 'QUESTION_VERSION') {
      const v = await this.repo.findQuestionVersionForAuthoring(versionId);
      return v ? v.questionId : null;
    }
    const v = await this.repo.findLearningResourceVersionForAuthoring(versionId);
    return v ? v.learningResourceId : null;
  }

  /**
   * Proyección de salida. REFERENCIAS solamente -- nunca contenido académico,
   * y en particular NUNCA `isCorrect` (invariante 8, §11.4).
   */
  private project(outcome: AuthoringOutcome, idempotentReplay: boolean): EditorialAuthoringResponse {
    return {
      objectType: outcome.objectType,
      identityId: outcome.identityId,
      versionId: outcome.versionId,
      editorialStatus: 'DRAFT',
      adminActionId: outcome.adminActionId,
      idempotentReplay,
    };
  }
}
