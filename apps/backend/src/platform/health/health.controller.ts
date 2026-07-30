import { Controller, Get } from '@nestjs/common';
import { HealthResponse, healthResponseSchema } from '@axioma/contracts';

/**
 * No pertenece a ningún dominio canónico: verifica que el backend
 * responde correctamente durante la fundación (Fase 0).
 */
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return healthResponseSchema.parse({
      status: 'ok',
      service: 'axioma-backend',
      timestamp: new Date().toISOString(),
    });
  }
}
