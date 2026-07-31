import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  HealthLiveResponse,
  HealthReadyResponse,
  healthLiveResponseSchema,
  healthReadyResponseSchema,
} from '@axioma/contracts';
import { PrismaService } from '../prisma/prisma.service';

/**
 * No pertenece a ningún dominio canónico: verifica que el backend responde
 * correctamente. Sin efectos secundarios -- ni /live ni /ready escriben datos.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Vivo = el proceso responde. No depende de Postgres ni de ningún recurso externo. */
  @Get('live')
  getLive(): HealthLiveResponse {
    return healthLiveResponseSchema.parse({
      status: 'ok',
      service: 'axioma-backend',
      timestamp: new Date().toISOString(),
    });
  }

  /** Listo = además puede atender tráfico real: Postgres responde a una consulta mínima. */
  @Get('ready')
  async getReady(@Res({ passthrough: true }) res: Response): Promise<HealthReadyResponse> {
    const database = await this.checkDatabase();
    const status = database === 'ok' ? 'ok' : 'unhealthy';
    res.status(status === 'ok' ? 200 : 503);
    return healthReadyResponseSchema.parse({
      status,
      service: 'axioma-backend',
      timestamp: new Date().toISOString(),
      checks: { database },
    });
  }

  private async checkDatabase(): Promise<'ok' | 'unhealthy'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'unhealthy';
    }
  }
}
