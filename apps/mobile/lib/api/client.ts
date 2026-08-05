import type { ZodType, ZodTypeDef } from 'zod';
import { loadSession } from '../auth/session-storage';

/**
 * Cliente de API mínimo -- ver ADR-0013. `fetch` nativo envuelto, sin
 * librería nueva (`axios`/`react-query` quedan diferidos hasta que la
 * complejidad de caché/reintentos lo justifique). Distingue explícitamente
 * error de RED (sin respuesta del servidor) de error HTTP (respuesta con
 * status de error) -- son estados de interfaz distintos (Master Context
 * §4.15: "Sin conexión" vs. "Error recuperable").
 */

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'network'; message: string }
  | { ok: false; kind: 'http'; status: number; code?: string; message: string; body?: unknown };

let unauthorizedHandler: (() => void) | null = null;

/** Registrado por `AuthProvider` -- se invoca ante CUALQUIER 401, de cualquier endpoint autenticado (ver ADR-0013). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

interface RequestOptions<T> {
  body?: unknown;
  // `ZodType<T, ZodTypeDef, unknown>` (no solo `ZodType<T>`) -- fija el
  // parámetro Output en T sin dejar que TS infiera T a partir del parámetro
  // Input (contravariante) de esquemas con `.default()` (ej. `level` en
  // headingBlockSchema), que de otro modo infiere T con esos campos
  // opcionales en vez de requeridos.
  schema?: ZodType<T, ZodTypeDef, unknown>;
  /** Para endpoints que no requieren sesión (ej. el propio POST /auth/session). */
  skipAuth?: boolean;
}

export async function apiRequest<T = void>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: RequestOptions<T> = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (!options.skipAuth) {
    const session = await loadSession();
    if (session) {
      headers.authorization = `Bearer ${session.idToken}`;
      headers['x-session-id'] = session.sessionId;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, kind: 'network', message: 'No se pudo conectar con el servidor. Revisa tu conexión.' };
  }

  if (response.status === 401 && unauthorizedHandler) {
    unauthorizedHandler();
  }

  if (!response.ok) {
    let code: string | undefined;
    let message = `Error ${response.status}`;
    let body: unknown;
    try {
      body = await response.json();
      const errorBody = body as { error?: { code?: string; message?: string } };
      code = errorBody?.error?.code;
      message = errorBody?.error?.message ?? message;
    } catch {
      // Cuerpo de error no-JSON o vacío -- se conserva el mensaje genérico.
    }
    // `body` completo se conserva (no solo `error.*`) -- algunos endpoints
    // (ej. 409 de PROGRESS, ADR-0014) incluyen datos adicionales junto al
    // envelope de error estándar (`existingResponse`), que el llamador
    // puede necesitar leer explícitamente con su propio esquema.
    return { ok: false, kind: 'http', status: response.status, code, message, body };
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const json: unknown = await response.json();
  const data = options.schema ? options.schema.parse(json) : (json as T);
  return { ok: true, data };
}
