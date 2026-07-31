import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { InternalOpsGuard } from './internal-ops.guard';
import { PrivacyController } from './privacy.controller';
import { PrivacyRequestRepository } from './privacy-request.repository';
import { PrivacyScheduler } from './privacy.scheduler';
import { PrivacyService } from './privacy.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [PrivacyController],
  providers: [PrivacyRequestRepository, PrivacyService, PrivacyScheduler, InternalOpsGuard],
  exports: [PrivacyService],
})
export class PrivacyModule {}
