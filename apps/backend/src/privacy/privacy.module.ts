import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyRequestRepository } from './privacy-request.repository';
import { PrivacyScheduler } from './privacy.scheduler';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [ConfigModule, AuthModule, InternalOpsModule, OutboxModule],
  controllers: [PrivacyController],
  providers: [PrivacyRequestRepository, PrivacyService, PrivacyScheduler],
  exports: [PrivacyService],
})
export class PrivacyModule {}
