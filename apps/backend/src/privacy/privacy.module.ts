import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { UserModule } from '../user/user.module';
import { ProgressModule } from '../progress/progress.module';
import { AiModule } from '../ai/ai.module';
import { SubscriptionModule } from '../subscription/subscription.module';
// WEB-0D.1B-P0A -- cierre definitivo de cuenta también elimina el historial
// de Ensayos (PAES) y de Pregunta rápida, mismo criterio que ProgressModule.
import { ExamsModule } from '../exams/exams.module';
import { GamificationModule } from '../gamification/gamification.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyRequestRepository } from './privacy-request.repository';
import { PrivacyScheduler } from './privacy.scheduler';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    UserModule,
    ProgressModule,
    AiModule,
    SubscriptionModule,
    ExamsModule,
    GamificationModule,
    InternalOpsModule,
    OutboxModule,
  ],
  controllers: [PrivacyController],
  providers: [PrivacyRequestRepository, PrivacyService, PrivacyScheduler],
  exports: [PrivacyService],
})
export class PrivacyModule {}
