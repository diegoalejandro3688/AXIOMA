import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

/**
 * `correlationId` -- ver docs/adr/0007-logging-error-handling.md. En HTTP
 * coincide con `X-Request-Id` (recibido o generado); en trabajos programados
 * (PrivacyScheduler, AnalyticsScheduler) representa el identificador propio
 * de ESA ejecución -- Master Context 9.15 pide correlación también para
 * "trabajo asíncrono", no solo requests HTTP.
 */
const storage = new AsyncLocalStorage<string>();

/** Longitud y charset seguros -- nunca se confía ciegamente en un header del cliente. */
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

/** `null` si el valor es inválido, demasiado largo o contiene caracteres no permitidos (incluye control/saltos de línea). */
export function sanitizeIncomingRequestId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return REQUEST_ID_PATTERN.test(value) ? value : null;
}

export function generateCorrelationId(): string {
  return randomUUID();
}

export function runWithCorrelationId<T>(correlationId: string, fn: () => T): T {
  return storage.run(correlationId, fn);
}

export function getCorrelationId(): string | undefined {
  return storage.getStore();
}
