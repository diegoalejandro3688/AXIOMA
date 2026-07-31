import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventRepository } from './analytics-event.repository';
import { AnalyticsScheduler } from './analytics.scheduler';
import { AnalyticsService } from './analytics.service';
import { InternalOpsModule } from '../platform/internal-ops/internal-ops.module';
import { OutboxModule } from '../platform/outbox/outbox.module';

@Module({
  imports: [ConfigModule, InternalOpsModule, OutboxModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsEventRepository, AnalyticsService, AnalyticsScheduler],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
