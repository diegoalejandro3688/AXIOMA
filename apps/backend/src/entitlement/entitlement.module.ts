import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { EntitlementService } from './entitlement.service';
import { EntitlementController } from './entitlement.controller';
import { EntitlementInternalAdminController } from './entitlement-internal-admin.controller';
import { AccountSubscriptionRepository } from './subscription/account-subscription.repository';

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
 * C3.1: `AccountSubscriptionRepository` se anade como provider LOCAL (usa el
 * `PrismaService` global, no requiere importar ningun modulo). El modulo
 * sigue importando SOLO infraestructura -- ningun modulo de dominio, ningun
 * ciclo. `EntitlementService` lo recibe de forma OPCIONAL.
 *
 * C3.2: se EXPORTA `AccountSubscriptionRepository` para que `SubscriptionModule`
 * (reconciliacion de compras) escriba en la misma tabla que
 * `EntitlementService` lee. La dependencia va `SubscriptionModule ->
 * EntitlementModule` (la fuente de verdad de billing es lo que el entitlement
 * deriva), nunca al reves -- sin ciclo. La premisa C1.1 "solo se consume
 * `EntitlementService`" queda superada por la Capa 3.
 */
@Module({
  imports: [AuthModule, ConfigModule, InternalOpsModule],
  controllers: [EntitlementController, EntitlementInternalAdminController],
  providers: [EntitlementService, AccountSubscriptionRepository],
  exports: [EntitlementService, AccountSubscriptionRepository],
})
export class EntitlementModule {}
