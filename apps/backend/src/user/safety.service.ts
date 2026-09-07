import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMPLIANCE_ERROR_CODES,
  type BlockUserResponse,
  type BlockedUser,
  type ListBlockedUsersResponse,
  type PublicProfileReportType,
  type ReportPublicProfileResponse,
} from '@axioma/contracts';
import { PublicProfileRepository } from './public-profile.repository';
import { AccountBlockRepository } from './account-block.repository';
import { PublicProfileReportRepository } from './public-profile-report.repository';
import type { PublicProfile } from '../generated/prisma/client';

/** Mismo mensaje uniforme que el resto de la superficie pública cross-cuenta (ADR-0021). */
const PUBLIC_PROFILE_NOT_FOUND_MESSAGE = 'Este perfil no existe o no está disponible.';

function normalizeUsername(raw: string): string {
  return raw.normalize('NFC').toLowerCase();
}

/**
 * PS-0C.2 -- reporte y bloqueo de identidades públicas.
 *
 * TODA operación opera sobre `request.accountId` (el llamador) + un
 * `username` de ruta resuelto canónicamente server-side. Nunca acepta un
 * `accountId` del cliente. Nunca expone el `accountId` del objetivo.
 *
 * Bloquear/reportar NO modifica ningún dato del objetivo (LP, rank, liga,
 * perfil, score) -- sólo crea una fila de relación/registro.
 */
@Injectable()
export class SafetyService {
  constructor(
    private readonly publicProfileRepo: PublicProfileRepository,
    private readonly blockRepo: AccountBlockRepository,
    private readonly reportRepo: PublicProfileReportRepository,
  ) {}

  /**
   * Resuelve un username a un perfil "objetivo válido" para reportar/bloquear.
   * `ANONYMIZED` e inexistente -> mismo 404 uniforme (nunca revela cuál de
   * los dos). Un perfil `PRIVATE` o `RETIRED` SÍ es un objetivo válido: el
   * username fue visible antes y el reporte/bloqueo sigue siendo legítimo.
   */
  private async resolveTarget(rawUsername: string): Promise<PublicProfile> {
    const profile = await this.publicProfileRepo.findByUsernameNormalized(normalizeUsername(rawUsername));
    if (!profile || profile.lifecycleStatus === 'ANONYMIZED') {
      throw new NotFoundException({
        code: COMPLIANCE_ERROR_CODES.PUBLIC_PROFILE_NOT_FOUND,
        message: PUBLIC_PROFILE_NOT_FOUND_MESSAGE,
      });
    }
    return profile;
  }

  async reportPublicProfile(
    reporterAccountId: string,
    rawUsername: string,
    reportType: PublicProfileReportType,
  ): Promise<ReportPublicProfileResponse> {
    const target = await this.resolveTarget(rawUsername);
    if (target.accountId === reporterAccountId) {
      throw new BadRequestException({
        code: COMPLIANCE_ERROR_CODES.CANNOT_REPORT_SELF,
        message: 'No puedes reportar tu propio perfil.',
      });
    }
    const { report, created } = await this.reportRepo.create({
      reporterAccountId,
      targetAccountId: target.accountId,
      targetPublicProfileId: target.id,
      reportType,
    });
    return {
      reportId: report.id,
      reportType: report.reportType,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      alreadyReported: !created,
    };
  }

  async blockUser(blockerAccountId: string, rawUsername: string): Promise<BlockUserResponse> {
    const target = await this.resolveTarget(rawUsername);
    if (target.accountId === blockerAccountId) {
      throw new BadRequestException({
        code: COMPLIANCE_ERROR_CODES.CANNOT_BLOCK_SELF,
        message: 'No puedes bloquearte a ti mismo.',
      });
    }
    const { block, created } = await this.blockRepo.create(blockerAccountId, target.accountId);
    return {
      username: target.usernameNormalized,
      blockedAt: block.createdAt.toISOString(),
      alreadyBlocked: !created,
    };
  }

  /**
   * Idempotente: desbloquear una relación inexistente (o un username que ya
   * no resuelve) devuelve éxito sin efecto. Resuelve por el username ACTUAL
   * del objetivo (si cambió su nombre, la lista propia ya lo muestra con el
   * nuevo).
   */
  async unblockUser(blockerAccountId: string, rawUsername: string): Promise<{ unblocked: boolean }> {
    const profile = await this.publicProfileRepo.findByUsernameNormalized(normalizeUsername(rawUsername));
    if (!profile) return { unblocked: false };
    const removed = await this.blockRepo.delete(blockerAccountId, profile.accountId);
    return { unblocked: removed > 0 };
  }

  async listMyBlocks(blockerAccountId: string): Promise<ListBlockedUsersResponse> {
    const blocks = await this.blockRepo.findByBlocker(blockerAccountId);
    if (blocks.length === 0) return { blocked: [] };
    const profiles = await this.publicProfileRepo.findManyByAccountIds(blocks.map((b) => b.blockedAccountId));
    const usernameByAccountId = new Map(profiles.map((p) => [p.accountId, p.usernameNormalized]));
    const blocked: BlockedUser[] = [];
    for (const block of blocks) {
      const username = usernameByAccountId.get(block.blockedAccountId);
      // Un bloqueo cuyo objetivo ya no tiene identidad pública resoluble
      // (cuenta cerrada/anonimizada) se omite de la lista -- su redacción es
      // irrelevante y no hay username por el que desbloquear.
      if (!username) continue;
      blocked.push({ username, blockedAt: block.createdAt.toISOString() });
    }
    return { blocked };
  }
}
