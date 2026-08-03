import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_USER_TIMEZONE } from '@axioma/contracts';
import { UserProfileRepository } from './user-profile.repository';
import { PublicProfileRepository } from './public-profile.repository';
import { isReservedOrOffensive } from './reserved-usernames';
import { Prisma } from '../generated/prisma/client';
import type { UserProfile, PublicProfile } from '../generated/prisma/client';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/** ADR-0018 §2: mismo período para frecuencia de cambio y ventana de reserva. */
const USERNAME_CHANGE_COOLDOWN_DAYS = 30;
const USERNAME_CHANGE_COOLDOWN_MS = USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION;
}

@Injectable()
export class UserService {
  constructor(
    private readonly profileRepo: UserProfileRepository,
    private readonly publicProfileRepo: PublicProfileRepository,
  ) {}

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

  // --- public_profile -- ver docs/adr/0018-public-profile-foundation.md ---

  /**
   * Creación perezosa e idempotente -- llamado desde el primer punto de
   * entrada real a Competir (hoy no existe todavía; el propio endpoint
   * de autoservicio sirve como ese punto de entrada mientras Competir no
   * se construya, Bloque IV). SIEMPRE nace `visibilityStatus = PRIVATE`
   * (ADR-0018 §1/§3) -- entrar aquí nunca hace, por sí solo, que alguien
   * se vuelva visible a otros estudiantes.
   *
   * Si ya existe un perfil para la cuenta (en cualquier lifecycleStatus),
   * es un no-op -- devuelve el existente sin modificarlo, mismo criterio
   * que `initializeProfile`.
   */
  async ensurePublicProfile(accountId: string, desiredUsername: string): Promise<{ profile: PublicProfile; created: boolean }> {
    const existing = await this.publicProfileRepo.findByAccountId(accountId);
    if (existing) return { profile: existing, created: false };

    if (isReservedOrOffensive(desiredUsername)) {
      throw new ConflictException('Este nombre de usuario no está disponible.');
    }
    const taken = await this.publicProfileRepo.findByUsernameNormalized(desiredUsername);
    if (taken) throw new ConflictException('Este nombre de usuario ya está en uso.');
    if (await this.isWithinReservationWindow(desiredUsername)) {
      throw new ConflictException('Este nombre de usuario está reservado temporalmente.');
    }

    try {
      const created = await this.publicProfileRepo.createWithHistory(accountId, desiredUsername);
      return { profile: created, created: true };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        // Carrera real: o esta cuenta ya obtuvo su perfil en una llamada
        // concurrente (P2002 sobre accountId -- entonces SÍ hay ganador
        // propio, se devuelve), o otra cuenta ganó el mismo username
        // primero (P2002 sobre usernameNormalized -- no hay perfil propio).
        const winner = await this.publicProfileRepo.findByAccountId(accountId);
        if (winner) return { profile: winner, created: false };
        throw new ConflictException('Este nombre de usuario ya está en uso.');
      }
      throw error;
    }
  }

  async getPublicProfile(accountId: string): Promise<PublicProfile> {
    const profile = await this.publicProfileRepo.findByAccountId(accountId);
    if (!profile) throw new NotFoundException('Todavía no existe una identidad pública para esta cuenta.');
    return profile;
  }

  /**
   * Reversible en cualquier momento, autoservicio, sin período de espera
   * (ADR-0018 §4) -- ÚNICA acción que puede hacer VISIBLE un perfil.
   * Exige `lifecycleStatus = ACTIVE`: un perfil RETIRED/ANONYMIZED no
   * admite este toggle (permanece forzado a PRIVATE, ver `retire()`).
   */
  async setPublicProfileVisibility(accountId: string, visible: boolean): Promise<PublicProfile> {
    const existing = await this.getPublicProfile(accountId);
    if (existing.lifecycleStatus !== 'ACTIVE') {
      throw new ConflictException('Esta identidad pública no está activa.');
    }
    return this.publicProfileRepo.updateVisibility(accountId, visible ? 'VISIBLE' : 'PRIVATE');
  }

  /**
   * Respeta frecuencia (1 cambio / 30 días desde `usernameChangedAt`),
   * nombres reservados y unicidad -- ADR-0018 §2. Un "cambio" al mismo
   * username actual es un no-op silencioso, no consume cooldown.
   */
  async changePublicUsername(accountId: string, desiredUsername: string): Promise<PublicProfile> {
    const existing = await this.getPublicProfile(accountId);
    if (existing.lifecycleStatus !== 'ACTIVE') {
      throw new ConflictException('Esta identidad pública no está activa.');
    }
    if (existing.usernameNormalized === desiredUsername) {
      return existing;
    }

    const earliestNextChangeAt = existing.usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS;
    if (Date.now() < earliestNextChangeAt) {
      throw new ConflictException(`Solo se permite un cambio de nombre de usuario cada ${USERNAME_CHANGE_COOLDOWN_DAYS} días.`);
    }
    if (isReservedOrOffensive(desiredUsername)) {
      throw new ConflictException('Este nombre de usuario no está disponible.');
    }
    const taken = await this.publicProfileRepo.findByUsernameNormalized(desiredUsername);
    if (taken) throw new ConflictException('Este nombre de usuario ya está en uso.');
    if (await this.isWithinReservationWindow(desiredUsername)) {
      throw new ConflictException('Este nombre de usuario está reservado temporalmente.');
    }

    try {
      return await this.publicProfileRepo.changeUsernameWithHistory(accountId, existing.usernameNormalized, desiredUsername);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) throw new ConflictException('Este nombre de usuario ya está en uso.');
      throw error;
    }
  }

  /**
   * Llamado por PrivacyService al SOLICITAR el cierre de cuenta (no al
   * completarlo) -- ver ADR-0018 §5 y ADR-0005. Excluye el perfil de toda
   * superficie pública de inmediato (fuerza `visibilityStatus = PRIVATE`
   * dentro de `retire()`), pero NO libera el username todavía -- eso
   * ocurre recién en `anonymizePublicProfileForAccountClosure`, para que
   * una cancelación dentro del plazo pueda restaurar sin haber perdido el
   * nombre. Seguro ante ausencia de perfil o reintento (no-op).
   */
  async retirePublicProfileForAccountClosureRequest(accountId: string): Promise<void> {
    const existing = await this.publicProfileRepo.findByAccountId(accountId);
    if (!existing || existing.lifecycleStatus !== 'ACTIVE') return;
    await this.publicProfileRepo.retire(accountId);
  }

  /**
   * Llamado por PrivacyService cuando la eliminación se CANCELA dentro del
   * plazo de recuperación. NUNCA restaura `visibilityStatus = VISIBLE`
   * automáticamente -- permanece PRIVATE, exige una nueva acción
   * afirmativa (ADR-0018 §4).
   */
  async reactivatePublicProfileForAccountRecovery(accountId: string): Promise<void> {
    const existing = await this.publicProfileRepo.findByAccountId(accountId);
    if (!existing || existing.lifecycleStatus !== 'RETIRED') return;
    await this.publicProfileRepo.reactivate(accountId);
  }

  /**
   * Llamado por PrivacyService al COMPLETAR realmente el cierre definitivo
   * (barrido `runAccountDeletionSweep`, no la solicitud). Terminal, no
   * reversible. Seguro ante ausencia de perfil o reintento (no-op).
   */
  async anonymizePublicProfileForAccountClosure(accountId: string): Promise<void> {
    const existing = await this.publicProfileRepo.findByAccountId(accountId);
    if (!existing || existing.lifecycleStatus === 'ANONYMIZED') return;
    await this.publicProfileRepo.anonymize(accountId);
  }

  /**
   * Ventana de reserva (ADR-0018 §2): true si `usernameNormalized` fue
   * reemplazado o quedó huérfano por cierre de cuenta hace MENOS de 30
   * días -- mismo período que la frecuencia de cambio, misma
   * justificación (reutiliza el plazo de gracia ya validado en ADR-0005).
   */
  private async isWithinReservationWindow(usernameNormalized: string): Promise<boolean> {
    const sinceDate = new Date(Date.now() - USERNAME_CHANGE_COOLDOWN_MS);
    const recentRelease = await this.publicProfileRepo.findRecentRelease(usernameNormalized, sinceDate);
    return recentRelease !== null;
  }
}
