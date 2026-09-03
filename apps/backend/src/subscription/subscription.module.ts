import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { GooglePlaySubscriptionAdapter } from './google/google-play-subscription.adapter';
import { FakeSubscriptionProviderAdapter } from './fake-subscription-provider.adapter';
import { SUBSCRIPTION_PROVIDER_ADAPTER } from './subscription-provider.port';
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
 * (mismo patron que `AI_PROVIDER` / `IDENTITY_PROVIDER`): default `fake`. El
 * adaptador real (`GooglePlaySubscriptionAdapter`) SOLO se construye cuando
 * `GOOGLE_PLAY_PROVIDER_IMPL=google` -- asi el desarrollo local normal nunca
 * necesita `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` ni abre un cliente de red al
 * arrancar.
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
        const impl = config.get<string>('GOOGLE_PLAY_PROVIDER_IMPL', 'fake');
        if (impl === 'google') return new GooglePlaySubscriptionAdapter(config);
        return fake;
      },
    },
    SubscriptionReconciliationService,
  ],
})
export class SubscriptionModule {}
