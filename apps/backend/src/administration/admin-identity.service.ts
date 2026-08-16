import { Injectable } from '@nestjs/common';
import { AdminActorRepository } from './admin-actor.repository';
import { AdminTokenRepository } from './admin-token.repository';
import { AdminAccessLogRepository } from './admin-access-log.repository';
import { generateAdminToken, hashAdminToken, adminTokenHashEquals } from './admin-token.crypto';
import type { AdminRole } from '../generated/prisma/client';

/**
 * Identidad administrativa autenticada, tal como el backend la resolvió.
 * Es el ÚNICO origen de verdad de rol en toda la aplicación (invariante 22):
 * `roles` viene siempre de `admin_actor_role`, jamás del request.
 */
export interface AuthenticatedAdminActor {
  actorId: string;
  displayName: string;
  roles: AdminRole[];
  tokenId: string;
}

/** Motivo INTERNO del rechazo -- nunca se filtra a la respuesta HTTP. */
export type AdminAuthRejection =
  | 'REJECTED_UNKNOWN_TOKEN'
  | 'REJECTED_EXPIRED'
  | 'REJECTED_REVOKED'
  | 'REJECTED_ACTOR_INACTIVE';

export type AdminAuthResult =
  | { ok: true; actor: AuthenticatedAdminActor }
  | { ok: false; reason: AdminAuthRejection };

/**
 * LEF Bloque VII, Incremento 2 -- resolución de identidad administrativa.
 * Ver LEF-BLOCK-VII-DEFINITION.md §9.5 (DG-7) y §9.6 (ADMIN-002 parcial).
 *
 * ---------------------------------------------------------------------------
 * ADMIN-002 -- ESTADO PARCIAL, declarado aquí de forma explícita (§9.6)
 * ---------------------------------------------------------------------------
 * SATISFECHO por este servicio y el modelo que lo sostiene:
 *   - cuenta administrativa INDIVIDUAL, una por persona real;
 *   - credencial NO COMPARTIDA (un token pertenece a exactamente un actor);
 *   - autenticación segura: secreto de 256 bits, almacenado solo hasheado;
 *   - REVOCABLE (`revokedAt`) y EXPIRABLE (`expiresAt`), evaluados server-side;
 *   - atribución y registro de accesos append-only;
 *   - separación total respecto de la sesión de estudiante.
 *
 * NO SATISFECHO TODAVÍA, y deliberadamente NO simulado:
 *   - "verificación adicional para operaciones críticas" (MFA / segundo
 *     factor). Un solo secreto presentado por cabecera es UN factor. Pedirlo
 *     dos veces, exigir un segundo token del mismo tipo o añadir una
 *     confirmación interactiva NO son un segundo factor: serían una
 *     simulación, y §9.6 la prohíbe expresamente. DG-7 autorizó el token
 *     personal y NO autorizó diseñar un sistema de MFA.
 *
 * Por tanto `ADMIN-002` NO puede declararse satisfecho al cerrar el
 * Incremento 2 (§12.2, §13.2 punto 11). Este comentario existe para que nadie
 * lo declare por descuido leyendo solo el código.
 * ---------------------------------------------------------------------------
 */
@Injectable()
export class AdminIdentityService {
  constructor(
    private readonly actorRepo: AdminActorRepository,
    private readonly tokenRepo: AdminTokenRepository,
    private readonly accessLogRepo: AdminAccessLogRepository,
  ) {}

  /**
   * Bootstrap controlado (§9.5, "emisión y entrega fuera de banda"): crea el
   * actor con sus roles EXPLÍCITOS y emite su primer token.
   *
   * Devuelve el token EN CLARO una única vez, al llamador en proceso. No se
   * persiste, no se loguea y no existe ninguna ruta para recuperarlo después.
   * Solo lo invoca el CLI de bootstrap -- nunca un controller HTTP.
   */
  async bootstrapActor(input: {
    displayName: string;
    roles: AdminRole[];
    expiresAt: Date;
  }): Promise<{ actorId: string; displayName: string; roles: AdminRole[]; plainToken: string }> {
    const actor = await this.actorRepo.create({
      displayName: input.displayName,
      roles: input.roles,
    });

    const plainToken = generateAdminToken();
    await this.tokenRepo.create({
      actorId: actor.id,
      tokenHash: hashAdminToken(plainToken),
      expiresAt: input.expiresAt,
    });

    return {
      actorId: actor.id,
      displayName: actor.displayName,
      roles: actor.roles.map((r) => r.role),
      plainToken,
    };
  }

  /**
   * Resuelve token -> actor -> roles. TODO se comprueba en el servidor, en
   * este orden y sin caché de ningún tipo (§13.2: la revocación es efectiva
   * en la request inmediatamente siguiente).
   *
   * Cada intento -- aceptado o rechazado -- se registra en `admin_access_log`.
   * El motivo granular vive SOLO ahí; hacia fuera todos los rechazos son el
   * mismo 401 genérico (lo aplica `AdminAuthGuard`).
   */
  async authenticate(plainToken: string, requestPath: string): Promise<AdminAuthResult> {
    const presentedHash = hashAdminToken(plainToken);
    const token = await this.tokenRepo.findByHash(presentedHash);

    if (!token) {
      // Token desconocido: no hay actor al que atribuirlo, pero el intento
      // igualmente queda registrado (actorId NULL).
      await this.accessLogRepo.append({
        actorId: null,
        tokenId: null,
        outcome: 'REJECTED_UNKNOWN_TOKEN',
        requestPath,
      });
      return { ok: false, reason: 'REJECTED_UNKNOWN_TOKEN' };
    }

    // Confirmación en tiempo constante sobre el material derivado del secreto.
    // Redundante con el UNIQUE de Postgres, deliberadamente.
    if (!adminTokenHashEquals(token.tokenHash, presentedHash)) {
      await this.accessLogRepo.append({
        actorId: null,
        tokenId: null,
        outcome: 'REJECTED_UNKNOWN_TOKEN',
        requestPath,
      });
      return { ok: false, reason: 'REJECTED_UNKNOWN_TOKEN' };
    }

    // Revocación antes que expiración: un token revocado lo está aunque
    // todavía no hubiera vencido.
    if (token.revokedAt !== null) {
      await this.accessLogRepo.append({
        actorId: token.actorId,
        tokenId: token.id,
        outcome: 'REJECTED_REVOKED',
        requestPath,
      });
      return { ok: false, reason: 'REJECTED_REVOKED' };
    }

    // Expiración evaluada SIEMPRE contra el reloj del servidor y la columna
    // `expires_at` de la base. Ningún campo del cliente participa aquí.
    if (token.expiresAt.getTime() <= Date.now()) {
      await this.accessLogRepo.append({
        actorId: token.actorId,
        tokenId: token.id,
        outcome: 'REJECTED_EXPIRED',
        requestPath,
      });
      return { ok: false, reason: 'REJECTED_EXPIRED' };
    }

    const actor = await this.actorRepo.findByIdWithRoles(token.actorId);
    if (!actor || !actor.isActive) {
      await this.accessLogRepo.append({
        actorId: actor ? actor.id : null,
        tokenId: token.id,
        outcome: 'REJECTED_ACTOR_INACTIVE',
        requestPath,
      });
      return { ok: false, reason: 'REJECTED_ACTOR_INACTIVE' };
    }

    await this.accessLogRepo.append({
      actorId: actor.id,
      tokenId: token.id,
      outcome: 'ACCEPTED',
      requestPath,
    });
    await this.actorRepo.touchLastAuthenticated(actor.id);

    return {
      ok: true,
      actor: {
        actorId: actor.id,
        displayName: actor.displayName,
        // Los roles salen de `admin_actor_role`, leídos en ESTA request.
        // No hay ningún camino por el que el cliente los influya.
        roles: actor.roles.map((r) => r.role),
        tokenId: token.id,
      },
    };
  }
}
