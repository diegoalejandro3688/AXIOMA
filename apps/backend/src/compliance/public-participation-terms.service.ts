import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION,
  COMPLIANCE_ERROR_CODES,
  type PublicParticipationTermsStatusResponse,
} from '@axioma/contracts';
import { PublicParticipationTermsRepository } from './public-participation-terms.repository';

/**
 * PS-0C.2 -- autoridad de "¿esta cuenta aceptó la versión VIGENTE de los
 * Términos de uso y convivencia pública?".
 *
 * `hasAcceptedCurrent` es el ÚNICO predicado que consumen otros dominios
 * (USER, para el gate de presentabilidad de la identidad pública). Nunca se
 * expone `acceptedAt`/`acceptedVersion` a esos consumidores -- sólo el
 * booleano.
 */
@Injectable()
export class PublicParticipationTermsService {
  constructor(private readonly repo: PublicParticipationTermsRepository) {}

  get currentVersion(): string {
    return CURRENT_PUBLIC_PARTICIPATION_TERMS_VERSION;
  }

  async getStatus(accountId: string): Promise<PublicParticipationTermsStatusResponse> {
    const acceptance = await this.repo.findAcceptance(accountId);
    const acceptedVersion = acceptance?.acceptedVersion ?? null;
    return {
      currentVersion: this.currentVersion,
      acceptedVersion,
      acceptedAt: acceptance?.acceptedAt?.toISOString() ?? null,
      isCurrent: acceptedVersion === this.currentVersion,
    };
  }

  /**
   * `version` es un guard optimista del cliente. El backend SÓLO acepta la
   * versión vigente -- una versión antigua o futura enviada por el cliente
   * es `PUBLIC_TERMS_VERSION_MISMATCH` (400), nunca se persiste. Idempotente:
   * re-aceptar la versión vigente es un no-op silencioso (no reescribe
   * `acceptedAt`).
   */
  async accept(accountId: string, version: string): Promise<PublicParticipationTermsStatusResponse> {
    if (version !== this.currentVersion) {
      throw new BadRequestException({
        code: COMPLIANCE_ERROR_CODES.PUBLIC_TERMS_VERSION_MISMATCH,
        message: 'La versión de los términos enviada no es la vigente.',
      });
    }
    const current = await this.repo.findAcceptance(accountId);
    if (current?.acceptedVersion !== this.currentVersion) {
      await this.repo.setAcceptance(accountId, this.currentVersion);
    }
    return this.getStatus(accountId);
  }

  /** Predicado transversal -- ver arriba. */
  async hasAcceptedCurrent(accountId: string): Promise<boolean> {
    const acceptance = await this.repo.findAcceptance(accountId);
    return acceptance?.acceptedVersion === this.currentVersion;
  }

  /**
   * Lote para el gate de presentabilidad de una lista de ranking -- devuelve
   * el conjunto de `accountId` que SÍ tienen la versión vigente aceptada.
   */
  async filterAcceptedCurrent(accountIds: string[]): Promise<Set<string>> {
    const versions = await this.repo.findAcceptedVersionsByAccountIds(accountIds);
    const accepted = new Set<string>();
    for (const [accountId, version] of versions) {
      if (version === this.currentVersion) accepted.add(accountId);
    }
    return accepted;
  }
}
