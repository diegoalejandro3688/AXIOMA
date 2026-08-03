import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxEventDeliveryRepository } from './outbox-event-delivery.repository';
import { OutboxEventRepository } from './outbox-event.repository';
import { OutboxService } from './outbox.service';

@Module({
  imports: [ConfigModule],
  providers: [OutboxEventRepository, OutboxEventDeliveryRepository, OutboxService],
  exports: [OutboxService, OutboxEventRepository, OutboxEventDeliveryRepository],
})
export class OutboxModule {}
