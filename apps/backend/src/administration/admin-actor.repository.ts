import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AdminActor, AdminRole } from '../generated/prisma/client';

export interface AdminActorWithRoles extends AdminActor {
  roles: Array<{ role: AdminRole }>;
}

/**
 * Único punto de acceso a `admin_actor` y `admin_actor_role` (regla de
 * repositorio por agregado, ADR-0003).
 *
 * NO existe ningún método de borrado, deliberadamente (DG-9, invariante 23):
 * la baja de un actor es DESACTIVACIÓN. Aunque alguien añadiera uno, la FK
 * `Restrict` desde `admin_access_log` haría que PostgreSQL lo rechazara --
 * la garantía es estructural, no de disciplina.
 */
@Injectable()
export class AdminActorRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: { displayName: string; roles: AdminRole[] }): Promise<AdminActorWithRoles> {
    return this.prisma.adminActor.create({
      data: {
        displayName: input.displayName,
        roles: { create: input.roles.map((role) => ({ role })) },
      },
      include: { roles: { select: { role: true } } },
    });
  }

  findByIdWithRoles(id: string): Promise<AdminActorWithRoles | null> {
    return this.prisma.adminActor.findUnique({
      where: { id },
      include: { roles: { select: { role: true } } },
    });
  }

  /** Registro de "momento del último acceso" (§9.1). Best-effort del guard. */
  touchLastAuthenticated(id: string): Promise<AdminActor> {
    return this.prisma.adminActor.update({
      where: { id },
      data: { lastAuthenticatedAt: new Date() },
    });
  }

  /**
   * Desactivación (DG-9): impide operar, no borra nada. La revocación de los
   * tokens del actor la ejecuta `AdminTokenRepository.revokeAllByActorId` --
   * ambas cosas juntas son la "baja" de una persona del equipo.
   *
   * No se expone todavía por HTTP: el Incremento 2 no construye gestión de
   * actores (ADMIN-005..009 está fuera de alcance). Existe aquí porque es la
   * mecánica que el modelo de ciclo de vida exige y que el gate verifica.
   */
  deactivate(id: string): Promise<AdminActor> {
    return this.prisma.adminActor.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
  }
}
