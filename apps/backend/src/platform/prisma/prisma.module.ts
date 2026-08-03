import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionRunnerService } from './transaction-runner.service';

/**
 * PrismaService es infraestructura compartida (global), pero eso NO autoriza a
 * ningún módulo de dominio a construir queries Prisma directamente fuera de su
 * propio repositorio -- ver regla en prisma.service.ts. Cuando una operación
 * necesita abarcar más de un repositorio en una sola transacción, el punto de
 * entrada autorizado es TransactionRunnerService, no PrismaService directamente.
 */
@Global()
@Module({
  providers: [PrismaService, TransactionRunnerService],
  exports: [PrismaService, TransactionRunnerService],
})
export class PrismaModule {}
