import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Frontera de validación de INPUT del cliente -- ver ADR-0007. `safeParse` +
 * `BadRequestException` (400), nunca hace eco de los valores crudos
 * inválidos en la respuesta (evita reflejar, ej., un idToken parcial).
 *
 * Los `.parse()` de esquemas de RESPUESTA (lo que el propio backend
 * devuelve) se mantienen tal cual en los controllers -- si esos fallan, es
 * un bug del servidor y debe terminar en 500 (ver AllExceptionsFilter),
 * nunca disfrazarse de "error de input del cliente".
 */
export function parseRequestBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'Solicitud inválida.',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
