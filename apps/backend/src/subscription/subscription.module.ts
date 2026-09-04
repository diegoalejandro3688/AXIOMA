import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { GooglePlaySubscriptionAdapter } from './google/google-play-subscription.adapter';
import { FakeSubscriptionProviderAdapter } from './fake-subscription-provider.adapter';
import { DisabledSubscriptionProviderAdapter } from './disabled-subscription-provider.adapter';
import { SUBSCRIPTION_PROVIDER_ADAPTER } from './subscription-provider.port';
import { resolveSubscriptionProviderChoice } from './subscription-provider-choice';
import { SubscriptionReconciliationService } from './subscription-reconciliation.service';
import { SubscriptionController } from './subscription.controller';
import { GooglePlayRtdnController } from './rtdn/google-play-rtdn.controller';
import { GooglePlayRtdnEventRepository } from './rtdn/google-play-rtdn-event.repository';
import { RtdnIngestionService } from './rtdn/rtdn-ingestion.service';
import { RtdnProcessingService } from './rtdn/rtdn-processing.service';
import { RtdnProcessingScheduler, RTDN_PROCESSING_ENABLED } from './rtdn/rtdn-processing.scheduler';
import { FakeRtdnPushAuthenticator } from './rtdn/fake-rtdn-push-authenticator';
import { GoogleRtdnPushAuthenticator } from './rtdn/google-rtdn-push-authenticator';
import { DisabledRtdnPushAuthenticator } from './rtdn/disabled-rtdn-push-authenticator';
import { resolveRtdnAuthChoice, rtdnProcessingEnabled } from './rtdn/rtdn-auth-choice';
import { RTDN_PUSH_AUTHENTICATOR, readRtdnAuthConfig, type RtdnAuthConfig } from './rtdn/rtdn-push-authenticator.port';

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.2 + C3.3.
 *
 * Dominio de reconciliacion de compras (C3.2) + inbox durable de RTDN (C3.3).
 * Importa `EntitlementModule` solo por `AccountSubscriptionRepository`
 * (frontera §1: `AccountSubscription` es la fuente que `EntitlementService`
 * deriva -- la dependencia va en esa direccion, sin ciclo).
 *
 * `SUBSCRIPTION_PROVIDER_ADAPTER` y `RTDN_PUSH_AUTHENTICATOR` se resuelven por
 * `useFactory` condicional (`resolveSubscriptionProviderChoice` /
 * `resolveRtdnAuthChoice`): `fake` por defecto en no-produccion; `google` con
 * el impl explicito. En PRODUCCION con el impl ausente o `fake`, la factory
 * LANZA al arrancar (fail-closed) -- ni un `purchaseToken` fake ni un push de
 * Pub/Sub no verificado pueden conceder PREMIUM / disparar reconciliacion.
 *
 * RC1B.1 -- POSTURA CONGELADA (`GOOGLE_PLAY_PROVIDER_IMPL=disabled` /
 * `GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled`): mientras Google Play Billing sigue
 * congelado (sin Play Console), esta postura EXPLICITA permite arrancar en
 * `NODE_ENV=production` con adaptadores `disabled` que NUNCA verifican ni
 * conceden PREMIUM (reconcile -> 503; push -> 401) y sin agendar el worker
 * del buzon RTDN. El impl ausente en produccion sigue siendo un rechazo.
 */
const RTDN_AUTH_FALLBACK: RtdnAuthConfig = {
  expectedAudience: 'rtdn-oidc-audience-no-configurada',
  expectedServiceAccountEmail: 'rtdn-service-account-no-configurada',
};

@Module({
  imports: [ConfigModule, AuthModule, EntitlementModule, InternalOpsModule],
  controllers: [SubscriptionController, GooglePlayRtdnController],
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
        if (choice.use === 'disabled') return new DisabledSubscriptionProviderAdapter();
        return choice.use === 'google' ? new GooglePlaySubscriptionAdapter(config) : fake;
      },
    },
    {
      provide: RTDN_PUSH_AUTHENTICATOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const choice = resolveRtdnAuthChoice(
          config.get<string>('NODE_ENV'),
          config.get<string>('GOOGLE_PLAY_RTDN_AUTH_IMPL'),
        );
        if ('reject' in choice) throw new Error(choice.reject);
        // RC1B.1 -- postura CONGELADA: rechaza todo push, sin config OIDC.
        if (choice.use === 'disabled') return new DisabledRtdnPushAuthenticator();
        const parsed = readRtdnAuthConfig(
          config.get<string>('GOOGLE_PLAY_RTDN_OIDC_AUDIENCE'),
          config.get<string>('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL'),
        );
        if (!parsed.ok) {
          if (config.get<string>('NODE_ENV') === 'production' || choice.use === 'google') {
            throw new Error(
              `Config de auth RTDN incompleta: falta ${parsed.missing.join(', ')}. ` +
                'Sin ella un push de Pub/Sub no se puede autenticar -- fail-closed.',
            );
          }
          // No-produccion + fake sin config: arranca con placeholders (dev no
          // recibe RTDN; cualquier push real fallaria la autenticacion).
          return new FakeRtdnPushAuthenticator(RTDN_AUTH_FALLBACK);
        }
        return choice.use === 'google'
          ? new GoogleRtdnPushAuthenticator(parsed.config)
          : new FakeRtdnPushAuthenticator(parsed.config);
      },
    },
    {
      // RC1B.1 -- `false` con `GOOGLE_PLAY_RTDN_AUTH_IMPL=disabled`: el
      // `@Cron` del worker RTDN sale sin tocar la BD ni Google.
      provide: RTDN_PROCESSING_ENABLED,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        rtdnProcessingEnabled(
          resolveRtdnAuthChoice(config.get<string>('NODE_ENV'), config.get<string>('GOOGLE_PLAY_RTDN_AUTH_IMPL')),
        ),
    },
    SubscriptionReconciliationService,
    GooglePlayRtdnEventRepository,
    RtdnIngestionService,
    RtdnProcessingService,
    RtdnProcessingScheduler,
  ],
})
export class SubscriptionModule {}
