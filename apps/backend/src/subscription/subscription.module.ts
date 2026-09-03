import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { GooglePlaySubscriptionAdapter } from './google/google-play-subscription.adapter';
import { FakeSubscriptionProviderAdapter } from './fake-subscription-provider.adapter';
import { SUBSCRIPTION_PROVIDER_ADAPTER } from './subscription-provider.port';
import { resolveSubscriptionProviderChoice } from './subscription-provider-choice';
import { SubscriptionReconciliationService } from './subscription-reconciliation.service';
import { SubscriptionController } from './subscription.controller';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2.
 *
 * Dominio de reconciliacion de compras. Importa `EntitlementModule` solo por
 * `AccountSubscriptionRepository` (frontera §1: `AccountSubscription` es la
 * fuente que `EntitlementService` deriva -- la dependencia va en esa
 * direccion, sin ciclo). `TransactionRunnerService` viene del `PrismaModule`
 * global.
 *
 * `SUBSCRIPTION_PROVIDER_ADAPTER` se resuelve por `useFactory` condicional
 * (`resolveSubscriptionProviderChoice`): `fake` por defecto en no-produccion,
 * `google` con `GOOGLE_PLAY_PROVIDER_IMPL=google`. En PRODUCCION con el impl
 * ausente o `fake`, la factory LANZA al arrancar (fail-closed) -- una feature
 * de pago mal configurada no se despliega, y no hay camino en produccion por
 * el que un `purchaseToken` fake no verificado conceda PREMIUM. El adaptador
 * real solo se construye bajo `google` -- el desarrollo local normal nunca
 * necesita `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ni abre un cliente de red.
 */
@Module({
  imports: [ConfigModule, AuthModule, EntitlementModule],
  controllers: [SubscriptionController],
  providers: [
    FakeSubscriptionProviderAdapter,
    {
      provide: SUBSCRIPTION_PROVIDER_ADAPTER,
      inject: [ConfigService, FakeSubscriptionProviderAdapter],
      useFactory: (config: ConfigService, fake: FakeSubscriptionProviderAdapter) => {
        const choice = resolveSubscriptionProviderChoice(
          config.get<string>('NODE_ENV'),
          config.get<string>('GOOGLE_PLAY_PROVIDER_IMPL'),
        );
        if ('reject' in choice) throw new Error(choice.reject);
        return choice.use === 'google' ? new GooglePlaySubscriptionAdapter(config) : fake;
      },
    },
    SubscriptionReconciliationService,
  ],
})
export class SubscriptionModule {}
