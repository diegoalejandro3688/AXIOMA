import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InternalOpsModule } from '../internal-ops/internal-ops.module';
import { DiagnosticsController } from './diagnostics.controller';

@Module({
  imports: [ConfigModule, InternalOpsModule],
  controllers: [DiagnosticsController],
})
export class DiagnosticsModule {}
