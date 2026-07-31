import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Infraestructura compartida (regla ajustada 2026-07-31): PrismaService expone el
 * cliente de Prisma a toda la app, pero cada dominio accede a sus propios datos a
 * través de repositorios por agregado -- nunca importando PrismaService directamente
 * fuera de su propio repositorio.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conexión a PostgreSQL establecida');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
