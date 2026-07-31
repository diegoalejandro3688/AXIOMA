import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalOpsGuard } from './internal-ops.guard';

@Module({
  imports: [ConfigModule],
  providers: [InternalOpsGuard],
  exports: [InternalOpsGuard],
})
export class InternalOpsModule {}
