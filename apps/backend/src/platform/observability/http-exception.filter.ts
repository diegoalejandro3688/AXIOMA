import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { Response } from 'express';
import { getCorrelationId } from './correlation-id.store';

interface NormalizedError {
  code: string;
  message: string;
  issues?: Array<{ path: string; message: string }>;
}

function codeFromStatus(status: number): string {
  const text = STATUS_CODES[status] ?? 'Error';
  return text.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/**
 * Normaliza el `getResponse()` de una HttpException -- que puede ser un
 * string, un objeto o (en teoría) un array -- a una forma fija, SIN
 * exponer campos arbitrarios que la excepción original pudiera traer.
 */
function normalizeHttpExceptionBody(status: number, body: unknown, fallbackMessage: string): NormalizedError {
  const defaultCode = codeFromStatus(status);

  if (typeof body === 'string') {
    return { code: defaultCode, message: body };
  }

  if (Array.isArray(body)) {
    return {
      code: defaultCode,
      message: 'Solicitud inválida.',
      issues: body
        .filter((item): item is string => typeof item === 'string')
        .map((message) => ({ path: '', message })),
    };
  }

  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const code = typeof record.code === 'string' ? record.code : defaultCode;
    const message = typeof record.message === 'string' ? record.message : fallbackMessage;
    const issues = Array.isArray(record.issues)
      ? (record.issues as unknown[])
          .filter(
            (item): item is { path: unknown; message: unknown } =>
              typeof item === 'object' && item !== null && 'message' in item,
          )
          .map((item) => ({
            path: typeof item.path === 'string' ? item.path : '',
            message: typeof item.message === 'string' ? item.message : String(item.message),
          }))
      : undefined;
    return { code, message, ...(issues ? { issues } : {}) };
  }

  return { code: defaultCode, message: fallbackMessage };
}

/**
 * Filtro global -- ver ADR-0007. Formato único de error para toda la API:
 * `{ error: { code, message, requestId, timestamp, issues? } }`.
 *
 * 4xx (errores de negocio/input esperables) se loguean como `warn`, sin
 * stack. 5xx (no manejados o explícitamente internos) se loguean como
 * `error` CON stack en el servidor -- pero el cliente nunca recibe el
 * stack ni detalles internos, solo un mensaje genérico.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = getCorrelationId() ?? 'unknown';
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let normalized: NormalizedError = { code: 'INTERNAL_SERVER_ERROR', message: 'Error interno.' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      normalized = normalizeHttpExceptionBody(status, exception.getResponse(), exception.message);
    }

    if (status >= 500) {
      // El servidor loguea el error REAL (mensaje + stack), aunque el
      // cliente reciba un mensaje genérico para errores no reconocidos --
      // así se puede correlacionar un 500 del cliente con la causa real sin
      // exponerla (Master Context 8.22: "qué falló, dónde, cuándo").
      const realMessage = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(`${normalized.code}: ${realMessage}`, stack);
    } else {
      this.logger.warn(`${normalized.code}: ${normalized.message}`);
    }

    response.status(status).json({
      error: {
        code: normalized.code,
        message: normalized.message,
        requestId,
        timestamp,
        ...(normalized.issues ? { issues: normalized.issues } : {}),
      },
    });
  }
}
