import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccountRepository } from './account.repository';
import { AuthIdentityRepository } from './auth-identity.repository';
import { AuthSessionRepository } from './auth-session.repository';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { FirebaseIdentityProvider } from './identity-provider/firebase-identity.provider';
import { IDENTITY_PROVIDER } from './identity-provider/identity-provider.interface';
import { StubIdentityProvider } from './identity-provider/stub-identity.provider';
import { OutboxModule } from '../platform/outbox/outbox.module';

@Module({
  imports: [ConfigModule, OutboxModule],
  controllers: [AuthController],
  providers: [
    AccountRepository,
    AuthIdentityRepository,
    AuthSessionRepository,
    AuthService,
    AuthGuard,
    StubIdentityProvider,
    {
      // Se construye manualmente (no como provider aparte) para que
      // FirebaseIdentityProvider NUNCA se instancie -- ni siquiera intente
      // leer FIREBASE_SERVICE_ACCOUNT_JSON -- cuando AUTH_IDENTITY_PROVIDER=stub.
      // Si Nest la registrara como provider normal, la instanciaría siempre
      // (eager), rompiendo el arranque en desarrollo sin credenciales reales.
      provide: IDENTITY_PROVIDER,
      inject: [ConfigService, StubIdentityProvider],
      useFactory: (config: ConfigService, stub: StubIdentityProvider) => {
        const mode = config.get<string>('AUTH_IDENTITY_PROVIDER', 'firebase');
        if (mode === 'stub') {
          if (config.get<string>('NODE_ENV') === 'production') {
            throw new Error('AUTH_IDENTITY_PROVIDER=stub no está permitido en producción');
          }
          return stub;
        }
        return new FirebaseIdentityProvider(config);
      },
    },
  ],
  exports: [AuthService, AuthGuard],
})
export class AuthModule {}
