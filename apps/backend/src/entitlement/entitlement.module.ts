import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { EntitlementService } from './entitlement.service';
import { EntitlementController } from './entitlement.controller';
import { EntitlementInternalAdminController } from './entitlement-internal-admin.controller';

/**
 * PREMIUM V1 -- Capa 1 (Entitlement backend), C1.1.
 *
 * Modulo TRANSVERSAL: importa unicamente infraestructura compartida
 * (`AuthModule` para `AuthGuard`, `InternalOpsModule` para `InternalOpsGuard`,
 * `ConfigModule` para el rechazo en produccion). NUNCA importa un modulo de
 * dominio -- son los modulos de dominio (`AiModule` ya en C1.1; Education/
 * Exams/Progress en C1.2-C1.4) los que importan este. Asi el ciclo de
 * modulos es imposible.
 *
 * Exporta `EntitlementService` -- la unica pieza que otros modulos consumen.
 */
@Module({
  imports: [AuthModule, ConfigModule, InternalOpsModule],
  controllers: [EntitlementController, EntitlementInternalAdminController],
  providers: [EntitlementService],
  exports: [EntitlementService],
})
export class EntitlementModule {}
