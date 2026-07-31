import { z } from 'zod';

/**
 * Contratos mínimos usados para validar que mobile, backend y contracts
 * compilan y se comunican correctamente durante la fundación (Fase 0).
 * No representan un dominio de producto.
 *
 * live: el proceso responde, sin dependencias externas, sin efectos secundarios.
 * ready: además confirma que puede atender tráfico real (ej. Postgres responde).
 */
export const healthLiveResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('axioma-backend'),
  timestamp: z.string().datetime({ offset: true }),
});

export const healthReadyResponseSchema = z.object({
  status: z.enum(['ok', 'unhealthy']),
  service: z.literal('axioma-backend'),
  timestamp: z.string().datetime({ offset: true }),
  checks: z.object({
    database: z.enum(['ok', 'unhealthy']),
  }),
});

export type HealthLiveResponse = z.infer<typeof healthLiveResponseSchema>;
export type HealthReadyResponse = z.infer<typeof healthReadyResponseSchema>;
