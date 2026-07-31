/**
 * Sanitización central de logs -- ver docs/adr/0007-logging-error-handling.md.
 * Dos garantías independientes:
 *  1. Ninguna clave sensible conocida (token, credencial, secreto) llega a
 *     stdout, sin importar en qué nivel de anidamiento aparezca.
 *  2. Cualquier valor -- Error, BigInt, referencias circulares, funciones,
 *     lo que sea -- siempre produce una línea JSON válida. Un log jamás
 *     debe tirar la aplicación ni romper el parseo de la línea.
 *
 * Esto NO incluye redacción de texto libre por regex (ej. un email dentro
 * de un mensaje de log escrito a mano) -- eso queda fuera de alcance del
 * Paso 7 (ver ADR-0007), depende de la disciplina del desarrollador, igual
 * que hoy.
 */

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'idtoken',
  'accesstoken',
  'refreshtoken',
  'password',
  'internalopskey',
  'analyticsactorsecret',
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '');
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(normalizeKey(key));
}

const REDACTED = '[REDACTED]';

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'bigint') return `${value.toString()}n`;
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();
  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...sanitizePlainObject(value as unknown as Record<string, unknown>, seen, ['name', 'message', 'stack']),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  return sanitizePlainObject(value as Record<string, unknown>, seen);
}

function sanitizePlainObject(
  obj: Record<string, unknown>,
  seen: WeakSet<object>,
  skipKeys: string[] = [],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (skipKeys.includes(key)) continue;
    result[key] = isSensitiveKey(key) ? REDACTED : sanitizeValue(obj[key], seen);
  }
  return result;
}

/** Punto de entrada: sanitiza cualquier valor antes de serializarlo. */
export function sanitizeForLog(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet());
}

/** Nunca lanza -- si incluso la sanitización falla, cae a una línea mínima segura. */
export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(sanitizeForLog(value));
  } catch {
    return JSON.stringify({
      level: 'error',
      message: '[entrada de log no serializable]',
      timestamp: new Date().toISOString(),
    });
  }
}
