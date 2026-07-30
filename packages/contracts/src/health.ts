import { z } from 'zod';

/**
 * Contrato mínimo usado para validar que mobile, backend y contracts
 * compilan y se comunican correctamente durante la fundación (Fase 0).
 * No representa un dominio de producto.
 */
export const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('axioma-backend'),
  timestamp: z.string().datetime({ offset: true }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
