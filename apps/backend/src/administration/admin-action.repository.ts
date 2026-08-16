import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type {
  AdminAction,
  AdminActionObjectType,
  AdminActionType,
  AdminCms018ExceptionActivation,
  AdminRole,
  EditorialStatus,
  Prisma,
} from '../generated/prisma/client';

export type AdminActionWithActors = AdminAction & {
  actor: { id: string; displayName: string };
  cms018Activation:
    | (AdminCms018ExceptionActivation & { activatedByActor: { id: string; displayName: string } })
    | null;
};

/**
 * Único punto de acceso a `admin_action` -- el registro de ACCIÓN editorial de
 * §9.3 (distinto del registro de ACCESO de `admin_access_log`, Incremento 2).
 *
 * Solo `append` y lectura. No hay `update` ni `delete`, y aunque los hubiera
 * el trigger `admin_action_immutable` los rechazaría en PostgreSQL: el
 * servicio nunca es la garantía (§7.2, nota de rigor sobre la capa).
 *
 * TODOS los métodos de escritura EXIGEN un `Prisma.TransactionClient`. No es
 * una comodidad: §9.3 ("cuándo se registra") ordena que el registro se escriba
 * DENTRO de la misma transacción que aplica el efecto -- si la transacción
 * falla no hay registro, y si hay registro el efecto ocurrió. Nunca
 * best-effort, nunca asíncrono. Al no existir ninguna sobrecarga sin `tx`, no
 * hay forma de llamarlo fuera de una transacción por descuido.
 */
@Injectable()
export class AdminActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Los NUEVE campos de §9.3. `tx` obligatorio -- ver docstring de la clase. */
  append(
    tx: Prisma.TransactionClient,
    input: {
      actorId: string;
      roleExercised: AdminRole;
      actionType: AdminActionType;
      objectType: AdminActionObjectType;
      objectId: string;
      previousStatus: EditorialStatus | null;
      newStatus: EditorialStatus | null;
      reason: string | null;
      operationId: string | null;
      cms018ActivationId: string | null;
    },
  ): Promise<AdminAction> {
    return tx.adminAction.create({ data: input });
  }

  /**
   * Resolución de idempotencia (invariante 11). `tx` opcional: la lectura
   * previa ocurre tanto dentro de la transacción de la operación como en el
   * pre-chequeo que evita abrirla.
   */
  findByOperationId(operationId: string, tx?: Prisma.TransactionClient): Promise<AdminActionWithActors | null> {
    return (tx ?? this.prisma).adminAction.findUnique({
      where: { operationId },
      include: this.withActors,
    });
  }

  /**
   * Historial de un objeto, en orden cronológico. Es la fuente sobre la que
   * §8.3 define el enforcement de CMS-018: "la comparación es entre
   * identificadores de actor, CONTRA EL REGISTRO DE ACCIÓN ADMINISTRATIVA".
   */
  findByObject(
    objectType: AdminActionObjectType,
    objectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AdminActionWithActors[]> {
    return (tx ?? this.prisma).adminAction.findMany({
      where: { objectType, objectId },
      orderBy: { occurredAt: 'asc' },
      include: this.withActors,
    });
  }

  /**
   * Usos de la excepción de CMS-018 (§8.5: "el uso de la excepción es un tipo
   * de evento DISTINGUIBLE Y CONSULTABLE, de modo que 'cuántas publicaciones
   * se hicieron bajo excepción' sea una pregunta respondible sin leer código").
   */
  findCms018ExceptionUses(tx?: Prisma.TransactionClient): Promise<AdminActionWithActors[]> {
    return (tx ?? this.prisma).adminAction.findMany({
      where: { cms018ActivationId: { not: null } },
      orderBy: { occurredAt: 'asc' },
      include: this.withActors,
    });
  }

  private readonly withActors = {
    actor: { select: { id: true, displayName: true } },
    cms018Activation: { include: { activatedByActor: { select: { id: true, displayName: true } } } },
  } as const;
}
