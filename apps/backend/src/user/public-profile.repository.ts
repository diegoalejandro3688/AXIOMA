import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { PublicProfile, ProfileUsernameHistory } from '../generated/prisma/client';

/**
 * Único punto de acceso a `public_profile`/`profile_username_history` --
 * ver docs/adr/0018-public-profile-foundation.md. `profile_username_history`
 * es append-only: este repositorio nunca expone un método que la actualice
 * o borre, solo `create` implícito dentro de las transacciones de abajo.
 */
@Injectable()
export class PublicProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountId(accountId: string): Promise<PublicProfile | null> {
    return this.prisma.publicProfile.findUnique({ where: { accountId } });
  }

  findByUsernameNormalized(usernameNormalized: string): Promise<PublicProfile | null> {
    return this.prisma.publicProfile.findUnique({ where: { usernameNormalized } });
  }

  /**
   * Ventana de reserva (ADR-0018 §2): un username que fue reemplazado o
   * quedó huérfano por cierre de cuenta hace menos de `sinceDate` sigue
   * bloqueado para CUALQUIER otra cuenta, aunque ya no lo tenga ninguna
   * fila activa de `public_profile` (columna única solo protege el valor
   * ACTUAL de cada perfil, no el histórico -- por eso se consulta el
   * historial aquí, no la tabla viva).
   */
  findRecentRelease(usernameNormalized: string, sinceDate: Date): Promise<ProfileUsernameHistory | null> {
    return this.prisma.profileUsernameHistory.findFirst({
      where: { previousUsernameNormalized: usernameNormalized, changedAt: { gte: sinceDate } },
      orderBy: { changedAt: 'desc' },
    });
  }

  /**
   * Creación atómica: fila de `public_profile` + primera entrada de
   * `profile_username_history` en la misma transacción -- nunca queda un
   * perfil creado sin su historial inicial (ADR-0018 §4, "creación
   * atómica"). SIEMPRE nace `visibilityStatus = PRIVATE` / `lifecycleStatus
   * = ACTIVE` -- ninguna ruta de creación admite otro valor inicial.
   */
  createWithHistory(accountId: string, usernameNormalized: string): Promise<PublicProfile> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.publicProfile.create({
        data: { accountId, usernameNormalized, visibilityStatus: 'PRIVATE', lifecycleStatus: 'ACTIVE' },
      });
      await tx.profileUsernameHistory.create({
        data: {
          publicProfileId: profile.id,
          previousUsernameNormalized: null,
          newUsernameNormalized: usernameNormalized,
          changeReason: 'INITIAL_CLAIM',
        },
      });
      return profile;
    });
  }

  updateVisibility(accountId: string, visibilityStatus: 'PRIVATE' | 'VISIBLE'): Promise<PublicProfile> {
    return this.prisma.publicProfile.update({ where: { accountId }, data: { visibilityStatus } });
  }

  /**
   * Cambio de username + historial en la misma transacción. `usernameChangedAt`
   * se actualiza aquí -- base de la verificación de frecuencia (30 días,
   * ADR-0018 §2), que el llamador (UserService) ya validó ANTES de invocar
   * este método.
   */
  changeUsernameWithHistory(accountId: string, previousUsernameNormalized: string, newUsernameNormalized: string): Promise<PublicProfile> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.publicProfile.update({
        where: { accountId },
        data: { usernameNormalized: newUsernameNormalized, usernameChangedAt: new Date() },
      });
      await tx.profileUsernameHistory.create({
        data: {
          publicProfileId: profile.id,
          previousUsernameNormalized,
          newUsernameNormalized,
          changeReason: 'USER_CHANGE',
        },
      });
      return profile;
    });
  }

  /**
   * `visibilityStatus` se fuerza a PRIVATE en el mismo `update` -- un
   * perfil retirado nunca queda visible, sin depender de una segunda
   * llamada (ADR-0018 §5).
   */
  retire(accountId: string): Promise<PublicProfile> {
    return this.prisma.publicProfile.update({
      where: { accountId },
      data: { lifecycleStatus: 'RETIRED', visibilityStatus: 'PRIVATE', retiredAt: new Date() },
    });
  }

  /**
   * Reactivación tras recuperar la cuenta dentro del plazo (ADR-0005). NO
   * restaura `visibilityStatus = VISIBLE` -- permanece PRIVATE, exige una
   * nueva acción afirmativa del estudiante (ADR-0018 §4).
   */
  reactivate(accountId: string): Promise<PublicProfile> {
    return this.prisma.publicProfile.update({
      where: { accountId },
      data: { lifecycleStatus: 'ACTIVE', retiredAt: null },
    });
  }

  /**
   * Terminal, no reversible. `usernameNormalized` NO se limpia aquí --
   * deuda diferida documentada en el modelo (ver comentario de
   * `PublicProfile` en schema.prisma): la liberación real para otra cuenta
   * requeriría un job de limpieza no construido en este incremento.
   *
   * Extendido en el sub-incremento 3.b (Bloque III, BLOCK-III-DEFINITION.md
   * §4.10) para también borrar `equipped_title` en la MISMA transacción --
   * la propiedad (`account_title`) nunca se toca, solo la presentación
   * pública, mismo criterio ya aplicado aquí a `avatarReference`.
   */
  anonymize(accountId: string): Promise<PublicProfile> {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.publicProfile.update({
        where: { accountId },
        data: { lifecycleStatus: 'ANONYMIZED', anonymizedAt: new Date(), avatarReference: null },
      });
      await tx.equippedTitle.deleteMany({ where: { publicProfileId: profile.id } });
      await tx.profileUsernameHistory.create({
        data: {
          publicProfileId: profile.id,
          previousUsernameNormalized: profile.usernameNormalized,
          newUsernameNormalized: profile.usernameNormalized,
          changeReason: 'ACCOUNT_CLOSURE',
        },
      });
      return profile;
    });
  }
}
