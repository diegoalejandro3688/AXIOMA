import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { EditorialTargetStatus, EditorialTransitionResponse } from '@axioma/contracts';
import { PrismaService } from '../platform/prisma/prisma.service';
import { AdminActionRepository } from '../administration/admin-action.repository';
import { AdminCms018ExceptionRepository } from '../administration/admin-cms018-exception.repository';
import type { AuthenticatedAdminActor } from '../administration/admin-identity.service';
import { EditorialVersionRepository, type EditorialObjectType, type EditorialVersionRef } from './editorial-version.repository';
import type { AdminActionType, AdminRole, EditorialStatus, Prisma } from '../generated/prisma/client';

/**
 * =============================================================================
 * MÁQUINA DE ESTADOS EDITORIAL -- LEF Bloque VII, Incremento 3.
 * "Transiciones de estado con auditoría (retiro primero)."
 * Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §8.2, §8.3, §8.4, §8.5, §8.6, §9.3,
 * §12.3, §13.3.
 * =============================================================================
 *
 * POR QUÉ VIVE EN `education/` Y NO EN `administration/` -- invariante 15.
 * MC §6.24 ("Solo Education publica") y §11.1: **la capa administrativa
 * SOLICITA; EDUCATION valida sus propios invariantes y EJECUTA la transición**.
 * El controller editorial (`editorial/editorial.controller.ts`) es una fachada
 * HTTP autenticada: no decide, no valida estados, no escribe. Toda la
 * autoridad de dominio está en este archivo.
 *
 * ALCANCE EXACTO DEL INCREMENTO 3: T4, T5, T6, T7 y T8.
 *  - T1/T2 (crear y editar borradores) y T3 (DRAFT -> IN_REVIEW) pertenecen al
 *    Incremento 4 (§12.4). Este servicio NO crea contenido, NO edita contenido
 *    y NO implementa T3 ni ninguna versión reducida de T3.
 *  - Las validaciones de contenido de CMS-013 son precondición de T3 y por
 *    tanto también del Incremento 4. No aparecen aquí.
 *
 * DEFENSA EN PROFUNDIDAD, NO SUSTITUCIÓN. Todo lo que este servicio rechaza,
 * PostgreSQL lo rechazaría igualmente sobre una fila que alcanzó publicación
 * (triggers del Incremento 1) y sobre la unicidad de versión publicada
 * (índices únicos parciales). El servicio existe para dar un error de dominio
 * explícito ANTES de llegar a la base -- §7.2, nota de rigor sobre la capa:
 * "un invariante cuya única defensa sea el servicio no cuenta como aplicado".
 * Aquí la base sigue siendo la autoridad final; esto es la puerta educada.
 */

/** Las CINCO transiciones del Incremento 3 (§8.2, filas T4..T8). */
interface TransitionSpec {
  readonly code: Extract<AdminActionType, 'T4' | 'T5' | 'T6' | 'T7' | 'T8'>;
  readonly from: EditorialStatus;
  readonly to: EditorialStatus;
  /** Roles que pueden ejecutarla (§8.2 columna "Actor autorizado", §9.2). */
  readonly roles: readonly AdminRole[];
  /** §9.3 campo 7: motivo obligatorio en T4, T6 y T8 autónomo. */
  readonly reasonRequired: boolean;
  /** §8.3 / invariante 9: el actor no puede ser el autor de la versión. */
  readonly cms018Applies: boolean;
  /** §8.2: "operación con clave de idempotencia" (invariante 11). */
  readonly idempotencyKeyRequired: boolean;
}

const TRANSITIONS: readonly TransitionSpec[] = [
  // T4 -- IN_REVIEW -> DRAFT (devolución). Actor: Autor (EL MISMO que la creó
  // o editó por última vez) o Publicador. Motivo obligatorio.
  {
    code: 'T4',
    from: 'IN_REVIEW',
    to: 'DRAFT',
    roles: ['AUTHOR', 'PUBLISHER'],
    reasonRequired: true,
    cms018Applies: false,
    idempotencyKeyRequired: false,
  },
  // T5 -- IN_REVIEW -> APPROVED. Actor: Publicador. Precondición CMS-018.
  {
    code: 'T5',
    from: 'IN_REVIEW',
    to: 'APPROVED',
    roles: ['PUBLISHER'],
    reasonRequired: false,
    cms018Applies: true,
    idempotencyKeyRequired: false,
  },
  // T6 -- APPROVED -> DRAFT (rechazo tardío). Actor: Publicador. Motivo obligatorio.
  {
    code: 'T6',
    from: 'APPROVED',
    to: 'DRAFT',
    roles: ['PUBLISHER'],
    reasonRequired: true,
    cms018Applies: false,
    idempotencyKeyRequired: false,
  },
  // T7 -- APPROVED -> PUBLISHED. Actor: Publicador. Precondición CMS-018.
  // Despublica la versión publicada anterior de la misma identidad ANTES, en
  // la misma transacción (§8.6). Clave de idempotencia.
  {
    code: 'T7',
    from: 'APPROVED',
    to: 'PUBLISHED',
    roles: ['PUBLISHER'],
    reasonRequired: false,
    cms018Applies: true,
    idempotencyKeyRequired: true,
  },
  // T8 -- PUBLISHED -> DEPRECATED (retiro). Actor: Publicador. Motivo
  // obligatorio. Clave de idempotencia. `publishedAt` NO se modifica.
  {
    code: 'T8',
    from: 'PUBLISHED',
    to: 'DEPRECATED',
    roles: ['PUBLISHER'],
    reasonRequired: true,
    cms018Applies: false,
    idempotencyKeyRequired: true,
  },
];

/**
 * Transiciones que existen en §8.2 pero pertenecen al Incremento 4. Se
 * distinguen de las PROHIBIDAS para que el error diga la verdad: T3 no está
 * prohibida por el contrato, simplemente no está construida todavía (DG-12,
 * Opción C -- el Product Owner la asignó al Incremento 4 junto con CMS-013).
 */
const DEFERRED_TO_INCREMENT_4: ReadonlyArray<{ from: EditorialStatus; to: EditorialStatus; code: string }> = [
  { from: 'DRAFT', to: 'IN_REVIEW', code: 'T3' },
];

/**
 * Autoría de una versión, tal como §8.3 la define: "el AdminActor que creó la
 * versión (T1) o el que la editó por última vez (T2)", leído CONTRA EL
 * REGISTRO DE ACCIÓN ADMINISTRATIVA -- no contra un campo de la versión, que
 * no existe y que el Incremento 1 no autorizó a añadir (§8.4, nota sobre
 * `deprecatedAt`: ninguna columna nueva sobre tablas de Bloque I).
 */
interface VersionAuthorship {
  /** `null` cuando la versión no fue creada por el flujo editorial (ver nota). */
  lastAuthorActorId: string | null;
}

export interface TransitionInput {
  objectType: EditorialObjectType;
  versionId: string;
  targetStatus: EditorialTargetStatus;
  reason?: string;
  operationId?: string;
  cms018ActivationId?: string;
}

@Injectable()
export class EditorialTransitionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versionRepo: EditorialVersionRepository,
    private readonly actionRepo: AdminActionRepository,
    private readonly cms018Repo: AdminCms018ExceptionRepository,
  ) {}

  async transition(actor: AuthenticatedAdminActor, input: TransitionInput): Promise<EditorialTransitionResponse> {
    // ------------------------------------------------------------------
    // (0) Invariante 21 / DG-8 -- ARCHIVED, primero y sin condiciones.
    //
    // Se comprueba ANTES que nada, incluso antes de resolver la versión, para
    // que la respuesta sea siempre el MISMO rechazo explícito "desde cualquier
    // estado" (§13.3 punto 5) y nunca un 404 que dependa de la fixture.
    // ------------------------------------------------------------------
    if (input.targetStatus === 'ARCHIVED') {
      throw new BadRequestException(
        'ARCHIVED está fuera del flujo editorial V1: ninguna transición lo alcanza desde ningún estado (DG-8, invariante 21). El estado terminal de V1 es DEPRECATED.',
      );
    }

    // ------------------------------------------------------------------
    // (1) Idempotencia (invariante 11) -- ANTES de cualquier efecto.
    //
    // Mismo patrón que `StudentResponse.operationId`: la clave la propone el
    // cliente, el UNIQUE de PostgreSQL es la autoridad, y reenviar la misma
    // operación devuelve el resultado anterior SIN repetir el efecto y SIN
    // crear un segundo registro de auditoría (§13.3 punto 7).
    // ------------------------------------------------------------------
    if (input.operationId) {
      const previous = await this.actionRepo.findByOperationId(input.operationId);
      if (previous) {
        if (previous.objectId !== input.versionId) {
          throw new ConflictException(
            'Esa clave de idempotencia ya se usó para una operación sobre otro objeto. Una clave identifica una operación concreta, no un permiso de reintento genérico.',
          );
        }
        return {
          versionId: previous.objectId,
          objectType: input.objectType,
          previousStatus: previous.previousStatus as EditorialTargetStatus,
          newStatus: previous.newStatus as EditorialTargetStatus,
          adminActionId: previous.id,
          idempotentReplay: true,
          supersededVersionId: null,
        };
      }
    }

    const version = await this.versionRepo.findVersion(input.objectType, input.versionId);
    if (!version) throw new NotFoundException('La versión editorial no existe.');

    const spec = this.resolveTransition(version.editorialStatus, input.targetStatus as EditorialStatus);

    if (spec.idempotencyKeyRequired && !input.operationId) {
      throw new BadRequestException(
        `${spec.code} exige una clave de idempotencia (operationId): §8.2 la declara parte de la precondición de la operación.`,
      );
    }

    const reason = input.reason?.trim() ?? '';
    if (spec.reasonRequired && reason.length === 0) {
      throw new BadRequestException(
        `${spec.code} exige un motivo registrado: es una de las operaciones donde CMS-022 y el criterio 265 obligan a poder responder "por qué".`,
      );
    }

    const authorship = await this.resolveAuthorship(input.objectType, input.versionId);
    const roleExercised = this.authorize(actor, spec, authorship);

    const cms018ActivationId = spec.cms018Applies
      ? await this.enforceCms018(actor, spec, input, authorship, reason)
      : this.rejectUnusedExceptionMark(spec, input);

    return this.apply(actor, spec, input, version, roleExercised, reason, cms018ActivationId);
  }

  // ==========================================================================
  // §8.4 -- lista CERRADA. Todo lo que no esté en TRANSITIONS se rechaza aquí,
  // con un error de dominio explícito, antes de que el trigger del Incremento 1
  // tenga que ser la defensa final (§13.3 punto 5).
  // ==========================================================================
  private resolveTransition(from: EditorialStatus, to: EditorialStatus): TransitionSpec {
    const spec = TRANSITIONS.find((t) => t.from === from && t.to === to);
    if (spec) return spec;

    const deferred = DEFERRED_TO_INCREMENT_4.find((t) => t.from === from && t.to === to);
    if (deferred) {
      throw new BadRequestException(
        `La transición ${from} -> ${to} (${deferred.code}) pertenece al Incremento 4 (autoría) y no está implementada en el Incremento 3, que cubre exactamente T4..T8.`,
      );
    }

    if (from === to) {
      throw new BadRequestException(`La versión ya está en ${to}: no hay ninguna transición que ejecutar.`);
    }

    throw new BadRequestException(
      `La transición ${from} -> ${to} no existe en la lista cerrada de transiciones autorizadas (§8.4). ` +
        'En particular: no existe DRAFT -> PUBLISHED, ni DRAFT -> APPROVED, ni IN_REVIEW -> PUBLISHED (publicar exige pasar por IN_REVIEW y APPROVED con separación de actor); ' +
        'y DEPRECATED es TERMINAL en V1 -- no existe DEPRECATED -> PUBLISHED ni DEPRECATED -> DRAFT, porque republicar es publicar una versión NUEVA (CMS-025, invariante 5).',
    );
  }

  // ==========================================================================
  // §8.2 columna "Actor autorizado" + §9.2 mapa rol->transiciones.
  //
  // El rol se evalúa SIEMPRE sobre `actor.roles`, que el backend resolvió
  // desde `admin_actor_role` en esta misma request (invariante 22). Nada de lo
  // que envíe el cliente participa.
  // ==========================================================================
  private authorize(actor: AuthenticatedAdminActor, spec: TransitionSpec, authorship: VersionAuthorship): AdminRole {
    if (spec.code === 'T4') {
      // §8.2, T4: "Autor (EL MISMO) o Publicador". El paréntesis es normativo:
      // un Autor cualquiera no devuelve el trabajo de otro; solo el propio.
      const isOwnAuthor = authorship.lastAuthorActorId !== null && authorship.lastAuthorActorId === actor.actorId;
      if (actor.roles.includes('AUTHOR') && isOwnAuthor) return 'AUTHOR';
      if (actor.roles.includes('PUBLISHER')) return 'PUBLISHER';
      throw new ForbiddenException(
        'T4 (devolución a DRAFT) la puede ejecutar el Publicador, o el Autor que creó o editó por última vez esta versión. Un Autor distinto no puede devolver trabajo ajeno (§8.2).',
      );
    }

    const granted = spec.roles.find((role) => actor.roles.includes(role));
    if (!granted) {
      throw new ForbiddenException(
        `${spec.code} exige el rol ${spec.roles.join(' o ')}. El actor administrativo no lo tiene (ADMIN-004, menor privilegio).`,
      );
    }
    return granted;
  }

  // ==========================================================================
  // §8.3 + §8.5 -- CMS-018 por IDENTIDAD DE ACTOR, con su excepción tratada
  // como EXCEPCIÓN (invariantes 9 y 24).
  //
  // Devuelve el id de la activación cuando la operación se amparó en la
  // excepción (noveno campo de §9.3), o `null` cuando siguió la regla normal.
  // ==========================================================================
  private async enforceCms018(
    actor: AuthenticatedAdminActor,
    spec: TransitionSpec,
    input: TransitionInput,
    authorship: VersionAuthorship,
    reason: string,
  ): Promise<string | null> {
    const selfApproval = authorship.lastAuthorActorId !== null && authorship.lastAuthorActorId === actor.actorId;

    if (!selfApproval) {
      // Regla normal satisfecha. Invocar la excepción aquí sería registrar
      // como "desviación auditada" algo que no lo fue, y arruinaría la
      // pregunta que §8.5 quiere respondible ("cuántas publicaciones se
      // hicieron bajo excepción"). Se rechaza para que el rastro no mienta.
      if (input.cms018ActivationId) {
        throw new BadRequestException(
          'No se puede invocar la excepción de CMS-018 en una operación que la regla normal ya permite: el actor no es el autor de esta versión.',
        );
      }
      return null;
    }

    // A partir de aquí, el actor SÍ es el autor: la regla normal REJECTA.
    if (!input.cms018ActivationId) {
      throw new ForbiddenException(
        `CMS-018: el actor que creó o editó por última vez esta versión no puede ejecutar ${spec.code} sobre ella. ` +
          'Tener simultáneamente los roles Autor y Publicador NO autoriza la auto-aprobación por sí solo (invariante 24): ' +
          'la excepción de §8.5 debe activarse de forma deliberada y justificarse en cada uso.',
      );
    }

    const activation = await this.cms018Repo.findById(input.cms018ActivationId);
    if (!activation) throw new BadRequestException('La activación de excepción de CMS-018 indicada no existe.');
    if (activation.revokedAt !== null) {
      throw new ForbiddenException('La activación de excepción de CMS-018 indicada está revocada.');
    }
    if (activation.targetObjectType !== input.objectType || activation.targetObjectId !== input.versionId) {
      // §8.5: "no es un flag global de bypass". Una activación ampara una
      // versión concreta y ninguna otra.
      throw new ForbiddenException(
        'La activación de excepción de CMS-018 indicada no ampara esta versión: una activación no es un flag global (§8.5).',
      );
    }
    if (reason.length === 0) {
      // §8.5 condición 3: la justificación es POR USO. Un motivo dado una vez
      // (el de la activación) NO cubre usos posteriores.
      throw new BadRequestException(
        'Todo uso de la excepción de CMS-018 exige su propio motivo: la justificación es por uso, no por activación (§8.5, condición 3).',
      );
    }

    return activation.id;
  }

  /** Impide marcar como excepción una transición a la que §8.5 no alcanza. */
  private rejectUnusedExceptionMark(spec: TransitionSpec, input: TransitionInput): null {
    if (input.cms018ActivationId) {
      throw new BadRequestException(
        `La excepción de CMS-018 solo alcanza a T5 y T7 (invariante 9). ${spec.code} no la admite: su alcance es exclusivamente la separación de actor en aprobación y publicación (§7.1, alcance acotado del invariante 24).`,
      );
    }
    return null;
  }

  /**
   * §8.3 -- autoría leída del registro de acción administrativa.
   *
   * NOTA DE HONESTIDAD, declarada explícitamente: una versión que NO fue
   * creada por el flujo editorial (el contenido de `prisma/seed.ts`, o una
   * fixture de verificación) no tiene ningún registro T1/T2, y por tanto no
   * tiene autor conocido. §8.3 define la regla como una COMPARACIÓN entre
   * identificadores de actor: si no hay autor, no hay identidad con la que
   * colisionar y CMS-018 no bloquea. Es la consecuencia literal del texto, no
   * una relajación -- y desaparece por sí sola en cuanto el Incremento 4
   * introduzca T1/T2, momento a partir del cual todo contenido nuevo tendrá
   * autor registrado.
   */
  private async resolveAuthorship(objectType: EditorialObjectType, versionId: string): Promise<VersionAuthorship> {
    const history = await this.actionRepo.findByObject(objectType, versionId);
    const authoringActions = history.filter((a) => a.actionType === 'T1' || a.actionType === 'T2');
    const last = authoringActions[authoringActions.length - 1];
    return { lastAuthorActorId: last ? last.actorId : null };
  }

  // ==========================================================================
  // Ejecución. UNA transacción: el efecto y su auditoría viven o mueren juntos
  // (§9.3, "si la transacción falla no hay registro; si hay registro, el
  // efecto ocurrió"). Nunca best-effort, nunca asíncrono.
  // ==========================================================================
  private async apply(
    actor: AuthenticatedAdminActor,
    spec: TransitionSpec,
    input: TransitionInput,
    version: EditorialVersionRef,
    roleExercised: AdminRole,
    reason: string,
    cms018ActivationId: string | null,
  ): Promise<EditorialTransitionResponse> {
    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let supersededVersionId: string | null = null;

      if (spec.code === 'T7') {
        // ------------------------------------------------------------------
        // §8.6 -- ORDEN OBLIGATORIO, no una preferencia.
        //
        // El índice único parcial `question_version_one_published_per_question`
        // se verifica POR SENTENCIA (un índice parcial no admite diferimiento
        // al COMMIT). Publicar primero y despublicar después haría fallar la
        // transacción completa. Por eso:
        //   1. UPDATE de la versión anterior: PUBLISHED -> DEPRECATED
        //   2. UPDATE de la versión nueva:    APPROVED  -> PUBLISHED
        //
        // No hay ninguna ventana observable entre ambas: bajo READ COMMITTED
        // un lector concurrente ve el estado anterior o el posterior, nunca el
        // intermedio.
        // ------------------------------------------------------------------
        const sibling = await this.versionRepo.findPublishedSibling(input.objectType, version.identityId, version.versionId, tx);
        if (sibling) {
          await this.versionRepo.updateEditorialStatus(tx, input.objectType, sibling.versionId, 'DEPRECATED');
          // §8.6, auditoría de la despublicación automática: es un EFECTO de
          // T7, no una invocación independiente de T8. Produce su propio
          // registro con motivo DETERMINADO POR EL SISTEMA y referencia a la
          // versión que la sustituye -- no exige motivo libre del Publicador,
          // porque el "por qué" está completamente determinado (supersesión).
          // Sin clave de idempotencia: no es una operación del cliente.
          await this.actionRepo.append(tx, {
            actorId: actor.actorId,
            roleExercised,
            actionType: 'T8',
            objectType: input.objectType,
            objectId: sibling.versionId,
            previousStatus: 'PUBLISHED',
            newStatus: 'DEPRECATED',
            reason: `Despublicación automática por supersesión dentro de T7: sustituida por la versión ${version.versionId} de la misma identidad (§8.6, invariante 16).`,
            operationId: null,
            cms018ActivationId: null,
          });
          supersededVersionId = sibling.versionId;
        }

        await this.versionRepo.updateEditorialStatus(tx, input.objectType, version.versionId, 'PUBLISHED', new Date());
      } else {
        // T4, T5, T6 y T8. En T8, `publishedAt` NO se pasa y por tanto NO se
        // toca: es un hecho histórico (§8.2), y el trigger del Incremento 1
        // rechazaría el UPDATE si se intentara.
        await this.versionRepo.updateEditorialStatus(tx, input.objectType, version.versionId, spec.to);
      }

      const action = await this.actionRepo.append(tx, {
        actorId: actor.actorId,
        roleExercised,
        actionType: spec.code,
        objectType: input.objectType,
        objectId: version.versionId,
        previousStatus: spec.from,
        newStatus: spec.to,
        reason: reason.length > 0 ? reason : null,
        operationId: input.operationId ?? null,
        cms018ActivationId,
      });

      return { action, supersededVersionId };
    });

    return {
      versionId: version.versionId,
      objectType: input.objectType,
      previousStatus: spec.from as EditorialTargetStatus,
      newStatus: spec.to as EditorialTargetStatus,
      adminActionId: result.action.id,
      idempotentReplay: false,
      supersededVersionId: result.supersededVersionId,
    };
  }
}
