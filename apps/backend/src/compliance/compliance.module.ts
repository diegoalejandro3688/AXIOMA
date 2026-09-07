import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ComplianceController } from './compliance.controller';
import { PublicParticipationTermsRepository } from './public-participation-terms.repository';
import { PublicParticipationTermsService } from './public-participation-terms.service';

/**
 * PS-0C.2 -- "Minimum Compliance Remediation".
 *
 * Hoy: aceptación VERSIONADA de los Términos de uso y convivencia pública.
 * Exporta `PublicParticipationTermsService` para que `UserModule` pueda
 * consultar `hasAcceptedCurrent` / `filterAcceptedCurrent` en el gate de
 * presentabilidad de la identidad pública, sin acoplar USER a `account`.
 *
 * Importa `AuthModule` sólo por `AuthGuard` (superficie de autoservicio).
 */
@Module({
  imports: [AuthModule],
  controllers: [ComplianceController],
  providers: [PublicParticipationTermsRepository, PublicParticipationTermsService],
  exports: [PublicParticipationTermsService],
})
export class ComplianceModule {}
