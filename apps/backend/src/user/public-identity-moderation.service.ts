import { Injectable, NotFoundException } from '@nestjs/common';
import { PublicProfileRepository } from './public-profile.repository';
import { PublicProfileReportRepository } from './public-profile-report.repository';
import type { PublicProfileReport } from '../generated/prisma/client';

const RESOLUTION_DISMISSED = 'DISMISSED_NO_ACTION';
const RESOLUTION_ACTIONED_RESET = 'ACTIONED_USERNAME_RESET';

export interface OpenReportView {
  reportId: string;
  reportType: PublicProfileReport['reportType'];
  targetUsername: string | null;
  targetAccountId: string;
  createdAt: Date;
  openReportsForTarget: number;
}

export interface ForceResetResult {
  targetAccountId: string;
  previousUsername: string | null;
  alreadyReset: boolean;
  reportsActioned: number;
}

/**
 * PS-0C.2 -- RUTA DE OPERADOR (sin endpoint HTTP; se ejerce vía la CLI
 * `dist/cli/moderate-public-identity.js`, mismo criterio que
 * `recover-account`). Mínimo viable: listar reportes OPEN, descartar, o
 * accionar un reset de identidad pública.
 *
 * NUNCA toca cuenta / progreso / XP / LP / liga / ranking -- sólo la
 * PRESENTACIÓN de la identidad pública (`PublicProfileRepository.forceUsernameReset`).
 */
@Injectable()
export class PublicIdentityModerationService {
  constructor(
    private readonly publicProfileRepo: PublicProfileRepository,
    private readonly reportRepo: PublicProfileReportRepository,
  ) {}

  async listOpenReports(): Promise<OpenReportView[]> {
    const reports = await this.reportRepo.listByStatus('OPEN');
    const targetAccountIds = [...new Set(reports.map((r) => r.targetAccountId))];
    const profiles = await this.publicProfileRepo.findManyByAccountIds(targetAccountIds);
    const usernameByAccountId = new Map(profiles.map((p) => [p.accountId, p.usernameNormalized]));
    const openCountByAccountId = new Map<string, number>();
    for (const r of reports) openCountByAccountId.set(r.targetAccountId, (openCountByAccountId.get(r.targetAccountId) ?? 0) + 1);

    return reports.map((r) => ({
      reportId: r.id,
      reportType: r.reportType,
      targetUsername: usernameByAccountId.get(r.targetAccountId) ?? null,
      targetAccountId: r.targetAccountId,
      createdAt: r.createdAt,
      openReportsForTarget: openCountByAccountId.get(r.targetAccountId) ?? 0,
    }));
  }

  /** Descartar un reporte: sólo cambia el estado del reporte, nada más. */
  async dismissReport(reportId: string): Promise<void> {
    const report = await this.reportRepo.findById(reportId);
    if (!report) throw new NotFoundException(`Reporte ${reportId} no encontrado.`);
    await this.reportRepo.resolve(reportId, 'DISMISSED', RESOLUTION_DISMISSED);
  }

  /**
   * Accionar: reset forzado de la identidad pública del objetivo del
   * reporte + marcar ACTIONED todos los reportes OPEN contra ese objetivo.
   * Retry-safe: si el perfil ya está `USERNAME_RESET`, no vuelve a resetear
   * (idempotente), pero igual acciona los reportes pendientes.
   */
  async actionReportForceReset(reportId: string): Promise<ForceResetResult> {
    const report = await this.reportRepo.findById(reportId);
    if (!report) throw new NotFoundException(`Reporte ${reportId} no encontrado.`);

    const profile = await this.publicProfileRepo.findByAccountId(report.targetAccountId);
    if (!profile) {
      // El objetivo ya no tiene identidad pública -> sólo cerrar reportes.
      const reportsActioned = await this.reportRepo.actionAllOpenForTarget(report.targetAccountId, RESOLUTION_ACTIONED_RESET);
      return { targetAccountId: report.targetAccountId, previousUsername: null, alreadyReset: true, reportsActioned };
    }

    const alreadyReset = profile.moderationStatus === 'USERNAME_RESET';
    const previousUsername = alreadyReset ? null : profile.usernameNormalized;
    if (!alreadyReset) {
      await this.publicProfileRepo.forceUsernameReset(report.targetAccountId);
    }
    const reportsActioned = await this.reportRepo.actionAllOpenForTarget(report.targetAccountId, RESOLUTION_ACTIONED_RESET);
    return { targetAccountId: report.targetAccountId, previousUsername, alreadyReset, reportsActioned };
  }
}
