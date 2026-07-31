import { z } from 'zod';

/**
 * Contratos del dominio AUTH. El cliente nunca recibe ni envía datos de
 * Firebase directamente al resto del sistema -- solo el idToken (opaco
 * para el cliente) y el sessionId propio de Axioma.
 */

export const createSessionRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const accountStatusSchema = z.enum(['PENDING', 'ACTIVE', 'DELETION_PENDING', 'CLOSED']);

export const createSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  accountId: z.string().uuid(),
  status: accountStatusSchema,
});

export const meResponseSchema = z.object({
  accountId: z.string().uuid(),
  status: accountStatusSchema,
});

export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type AccountStatusDto = z.infer<typeof accountStatusSchema>;
