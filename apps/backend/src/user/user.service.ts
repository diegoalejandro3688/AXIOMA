import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_USER_TIMEZONE } from '@axioma/contracts';
import { UserProfileRepository } from './user-profile.repository';
import { Prisma } from '../generated/prisma/client';
import type { UserProfile } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class UserService {
  constructor(private readonly profileRepo: UserProfileRepository) {}

  /**
   * Crea el perfil si no existe; si ya existe, lo devuelve SIN modificarlo
   * -- un segundo POST nunca actualiza (ver ADR-0008, para eso está PATCH).
   *
   * Seguro ante creación concurrente: si dos requests simultáneas pasan la
   * verificación inicial y ambas intentan `create`, la restricción única de
   * `account_id` en Postgres deja pasar solo una; la otra recibe P2002, lo
   * captura, y devuelve el perfil que sí se creó -- nunca un 500.
   */
  async initializeProfile(
    accountId: string,
    input: { displayName: string; timezone?: string },
  ): Promise<{ profile: UserProfile; created: boolean }> {
    const existing = await this.profileRepo.findByAccountId(accountId);
    if (existing) return { profile: existing, created: false };

    try {
      const created = await this.profileRepo.create({
        accountId,
        displayName: input.displayName,
        timezone: input.timezone ?? DEFAULT_USER_TIMEZONE,
      });
      return { profile: created, created: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const winner = await this.profileRepo.findByAccountId(accountId);
        if (winner) return { profile: winner, created: false };
      }
      throw error;
    }
  }

  async getProfile(accountId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findByAccountId(accountId);
    if (!profile) throw new NotFoundException('El perfil todavía no ha sido inicializado.');
    return profile;
  }

  async updateProfile(
    accountId: string,
    input: { displayName?: string; timezone?: string },
  ): Promise<UserProfile> {
    const existing = await this.profileRepo.findByAccountId(accountId);
    if (!existing) throw new NotFoundException('El perfil todavía no ha sido inicializado.');
    return this.profileRepo.update(accountId, input);
  }

  /**
   * Llamado por PrivacyService durante el cierre definitivo (ver ADR-0008).
   * `display_name` es dato personal -- sin necesidad de conservar la fila
   * una vez cerrada la cuenta, se elimina por completo (no se anonimiza).
   * Seguro ante reintentos y ante ausencia de perfil: `deleteMany` nunca
   * lanza si no hay fila que borrar.
   */
  async deleteProfileForAccountClosure(accountId: string): Promise<void> {
    await this.profileRepo.deleteByAccountId(accountId);
  }
}
