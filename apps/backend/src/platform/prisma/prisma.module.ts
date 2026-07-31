import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaService es infraestructura compartida (global), pero eso NO autoriza a
 * ningún módulo de dominio a construir queries Prisma directamente fuera de su
 * propio repositorio -- ver regla en prisma.service.ts.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
