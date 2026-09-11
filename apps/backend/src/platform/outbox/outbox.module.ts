import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxEventDeliveryRepository } from './outbox-event-delivery.repository';
import { OutboxEventRepository } from './outbox-event.repository';
import { OutboxService } from './outbox.service';
import { OutboxLifecycleService } from './outbox-lifecycle.service';
import { OutboxLifecycleScheduler } from './outbox-lifecycle.scheduler';
import { OutboxLifecycleController } from './outbox-lifecycle.controller';
import { InternalOpsModule } from '../internal-ops/internal-ops.module';

@Module({
  imports: [ConfigModule, InternalOpsModule],
  controllers: [OutboxLifecycleController],
  providers: [OutboxEventRepository, OutboxEventDeliveryRepository, OutboxService, OutboxLifecycleService, OutboxLifecycleScheduler],
  exports: [OutboxService, OutboxEventRepository, OutboxEventDeliveryRepository, OutboxLifecycleService],
})
export class OutboxModule {}
