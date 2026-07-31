import type { LoggerService, LogLevel } from '@nestjs/common';
import { getCorrelationId } from './correlation-id.store';
import { resolveAppVersion } from './app-version';
import { safeStringify } from './sanitize';

const LEVEL_RANK: Record<LogLevel, number> = {
  verbose: 0,
  debug: 1,
  log: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

function resolveMinLevel(): LogLevel {
  const configured = (process.env.LOG_LEVEL ?? 'log') as LogLevel;
  return configured in LEVEL_RANK ? configured : 'log';
}

/**
 * Logger propio basado en la interfaz `LoggerService` de Nest (sin Pino ni
 * Winston -- ver ADR-0007). Registrado vía `app.useLogger()`: toda llamada
 * existente a `new Logger(Contexto)` en el resto del código (Auth, Privacy,
 * Analytics, internals de Nest) pasa a emitir en este formato sin tocar
 * esos archivos.
 *
 * Cada línea es un objeto JSON independiente, nunca lanza (ver
 * `safeStringify`), e incluye `requestId` del contexto de correlación
 * activo (HTTP o job programado) cuando existe.
 */
export class StructuredLogger implements LoggerService {
  private readonly appVersion = resolveAppVersion();
  private minLevel = resolveMinLevel();

  setLogLevels(levels: LogLevel[]): void {
    const ranked = levels.map((level) => LEVEL_RANK[level]).filter((rank) => rank !== undefined);
    if (ranked.length > 0) {
      const lowest = Math.min(...ranked);
      const found = (Object.keys(LEVEL_RANK) as LogLevel[]).find((level) => LEVEL_RANK[level] === lowest);
      if (found) this.minLevel = found;
    }
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  /** Convención de Nest: error(message, trace?, context?). */
  error(message: unknown, ...optionalParams: unknown[]): void {
    let context: string | undefined;
    let trace: string | undefined;
    if (optionalParams.length > 0 && typeof optionalParams[optionalParams.length - 1] === 'string') {
      context = optionalParams.pop() as string;
    }
    if (optionalParams.length > 0 && typeof optionalParams[0] === 'string') {
      trace = optionalParams[0] as string;
    }
    if (message instanceof Error) {
      trace = trace ?? message.stack;
    }
    this.write('error', message, [], context, trace);
  }

  private write(
    level: LogLevel,
    message: unknown,
    optionalParams: unknown[],
    explicitContext?: string,
    explicitTrace?: string,
  ): void {
    if (LEVEL_RANK[level] < LEVEL_RANK[this.minLevel]) return;

    let context = explicitContext;
    const rest = [...optionalParams];
    if (!context && rest.length > 0 && typeof rest[rest.length - 1] === 'string') {
      context = rest.pop() as string;
    }

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? 'Application',
      message: message instanceof Error ? message.message : message,
      appVersion: this.appVersion,
    };

    const requestId = getCorrelationId();
    if (requestId) entry.requestId = requestId;

    const stack = explicitTrace ?? (message instanceof Error ? message.stack : undefined);
    if (stack) entry.stack = stack;

    if (rest.length > 0) entry.meta = rest.length === 1 ? rest[0] : rest;

    const line = safeStringify(entry);
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  }
}
