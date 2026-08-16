import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type {
  AdminActionObjectType,
  AdminCms018ExceptionActivation,
  Prisma,
} from '../generated/prisma/client';

export type Cms018ActivationWithActor = AdminCms018ExceptionActivation & {
  activatedByActor: { id: string; displayName: string; isActive: boolean };
};

/**
 * Único punto de acceso a `admin_cms018_exception_activation` -- la activación
 * DELIBERADA de la excepción de CMS-018 (§8.5, DG-10, invariante 24).
 *
 * NO existe ningún método que "active por defecto", que active en bloque, ni
 * que active sin actor y sin motivo. §8.5 condición 1 es explícita: "ninguna
 * configuración inicial, ningún valor por defecto, ninguna inferencia del
 * sistema puede dejarla activa sin un acto deliberado".
 *
 * Tampoco existe superficie HTTP para `activate`: el único llamador es el CLI
 * `activate-cms018-exception.ts`, mismo precedente que `create-admin-actor.ts`
 * (§9.5, "emisión y entrega fuera de banda"). Activar exige ejecución local
 * del binario y `DATABASE_URL` -- no se puede activar con tráfico HTTP.
 */
@Injectable()
export class AdminCms018ExceptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  activate(input: {
    activatedByActorId: string;
    targetObjectType: AdminActionObjectType;
    targetObjectId: string;
    activationReason: string;
  }): Promise<AdminCms018ExceptionActivation> {
    return this.prisma.adminCms018ExceptionActivation.create({ data: input });
  }

  findById(id: string, tx?: Prisma.TransactionClient): Promise<Cms018ActivationWithActor | null> {
    return (tx ?? this.prisma).adminCms018ExceptionActivation.findUnique({
      where: { id },
      include: { activatedByActor: { select: { id: true, displayName: true, isActive: true } } },
    });
  }

  revoke(id: string): Promise<AdminCms018ExceptionActivation> {
    return this.prisma.adminCms018ExceptionActivation.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}
