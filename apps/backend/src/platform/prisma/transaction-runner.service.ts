import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '../../generated/prisma/client';

/**
 * Único punto autorizado para abrir una transacción que abarca más de un
 * repositorio -- ver regla en prisma.module.ts ("ningún dominio construye
 * queries Prisma directamente fuera de su propio repositorio"). Los
 * servicios de dominio orquestan transacciones a través de este runner,
 * nunca inyectando PrismaService directamente; las queries reales siguen
 * viviendo en los repositorios, que reciben el `tx` como cliente.
 */
@Injectable()
export class TransactionRunnerService {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<T> {
    return this.prisma.$transaction(fn, options);
  }
}
