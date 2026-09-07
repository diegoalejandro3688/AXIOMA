import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';

/**
 * PS-0C.2 -- acceso a los DOS campos de aceptación de Términos de
 * participación pública que viven físicamente en `account`
 * (`public_terms_accepted_version` / `public_terms_accepted_at`).
 *
 * Boundary: son un concepto de COMPLIANCE (no de AUTH). Este repositorio
 * NUNCA lee ni escribe ningún otro campo de `account` -- mismo criterio de
 * acceso acotado que ya usan otras lecturas cross-tabla del repo
 * (`AnalyticsService` sobre `outbox_event`, servicios competitivos sobre
 * repos de GAMIFICATION). AUTH sigue siendo el único dueño del ciclo de
 * vida de la cuenta.
 */
export interface PublicParticipationTermsAcceptance {
  acceptedVersion: string | null;
  acceptedAt: Date | null;
}

@Injectable()
export class PublicParticipationTermsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAcceptance(accountId: string): Promise<PublicParticipationTermsAcceptance | null> {
    const row = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { publicTermsAcceptedVersion: true, publicTermsAcceptedAt: true },
    });
    if (!row) return null;
    return { acceptedVersion: row.publicTermsAcceptedVersion, acceptedAt: row.publicTermsAcceptedAt };
  }

  /**
   * Lote -- UNA sola consulta `WHERE id IN (...)`, para el gate de
   * presentabilidad de una lista de ranking (evita N+1, mismo criterio que
   * `PublicProfileRepository.findManyByAccountIds`). Devuelve sólo la
   * `acceptedVersion` (lo único que el gate necesita).
   */
  async findAcceptedVersionsByAccountIds(accountIds: string[]): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (accountIds.length === 0) return result;
    const rows = await this.prisma.account.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, publicTermsAcceptedVersion: true },
    });
    for (const row of rows) {
      result.set(row.id, row.publicTermsAcceptedVersion);
    }
    return result;
  }

  /** Fija EXACTAMENTE `version` + `now()` -- el llamador ya validó que `version` es la vigente. */
  setAcceptance(accountId: string, version: string): Promise<unknown> {
    return this.prisma.account.update({
      where: { id: accountId },
      data: { publicTermsAcceptedVersion: version, publicTermsAcceptedAt: new Date() },
    });
  }
}
