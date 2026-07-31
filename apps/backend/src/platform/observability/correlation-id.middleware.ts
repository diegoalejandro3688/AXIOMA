import type { NextFunction, Request, Response } from 'express';
import { generateCorrelationId, runWithCorrelationId, sanitizeIncomingRequestId } from './correlation-id.store';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Registrado con `app.use()` en main.ts -- antes de cualquier guard/filtro,
 * para que TODO el manejo del request (incluido el filtro global de
 * excepciones) corra dentro del mismo contexto de correlación.
 */
export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = sanitizeIncomingRequestId(req.headers[REQUEST_ID_HEADER]);
  const correlationId = incoming ?? generateCorrelationId();
  res.setHeader('X-Request-Id', correlationId);
  runWithCorrelationId(correlationId, next);
}
