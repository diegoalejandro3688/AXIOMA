import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OutboxEventRepository } from './outbox-event.repository';
import { OutboxService } from './outbox.service';

@Module({
  imports: [ConfigModule],
  providers: [OutboxEventRepository, OutboxService],
  exports: [OutboxService, OutboxEventRepository],
})
export class OutboxModule {}
