// Gate del cliente de API mínimo (`lib/api/client.ts`).
//
// HOTFIX Estudio/429 (2026-09-01) -- un `429 Too Many Requests` del backend
// llega con el mensaje CRUDO de `@nestjs/throttler`
// ("ThrottlerException: Too Many Requests") dentro de
// `{ error: { code, message } }`. El usuario final NUNCA debe ver internals
// de Nest: `apiRequest` sustituye ese mensaje por uno humano y accionable,
// conservando `status` (429) y `code` para el llamador.
//
// Verificación DETERMINISTA -- Node puro, `global.fetch` reemplazado por un
// stub; ningún archivo de producción se modifica.
import Module from 'node:module';
import { join } from 'node:path';

/** `lib/api/client.ts` -> `lib/auth/session-storage.ts` -> `expo-secure-store` -- no cargable en Node puro. */
type ResolveFilename = (request: string, ...rest: unknown[]) => string;
const moduleWithInternals = Module as unknown as { _resolveFilename: ResolveFilename };
const originalResolveFilename = moduleWithInternals._resolveFilename;
moduleWithInternals._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  // Stub CON estado -- este gate observa qué headers de sesión se envían (RC1A).
  if (request === 'expo-secure-store') return join(__dirname, '__stubs__', 'expo-secure-store.stateful.ts');
  return originalResolveFilename.call(this, request, ...rest);
} as ResolveFilename;

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function jsonResponse(data: unknown, status: number) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

async function main() {
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://mock';
  const secureStore = (await import('./__stubs__/expo-secure-store.stateful')) as unknown as {
    __seed: (k: string, v: string) => void;
  };
  const { apiRequest, resolveApiBaseUrl } = await import('../lib/api/client');

  console.log('--- AR-1A: resolveApiBaseUrl -- DEV permisivo, RELEASE fail-closed ---');
  {
    check('DEV + env URL -> usa la env URL', resolveApiBaseUrl('http://localhost:3000', true) === 'http://localhost:3000');
    check('DEV + env ausente -> fallback a localhost', resolveApiBaseUrl(undefined, true) === 'http://localhost:3000');
    check('DEV + env vacía/whitespace -> fallback a localhost', resolveApiBaseUrl('   ', true) === 'http://localhost:3000');
    check(
      'RELEASE + HTTPS válida -> aceptada (sin trailing slash)',
      resolveApiBaseUrl('https://zetrynd.example.com/', false) === 'https://zetrynd.example.com',
    );
    const throws = (v: string | undefined) => {
      try {
        resolveApiBaseUrl(v, false);
        return false;
      } catch {
        return true;
      }
    };
    check('RELEASE + env ausente -> lanza', throws(undefined));
    check('RELEASE + env whitespace -> lanza', throws('   '));
    check('RELEASE + http:// -> lanza', throws('http://zetrynd.example.com'));
    check('RELEASE + https://localhost -> lanza', throws('https://localhost:3000'));
    check('RELEASE + https://127.0.0.1 -> lanza', throws('https://127.0.0.1'));
    check('RELEASE + https://10.0.2.2 -> lanza', throws('https://10.0.2.2'));
    check('RELEASE + URL inválida -> lanza', throws('not a url'));
  }

  console.log('--- 0. RC1A: credencial de sesión = solo X-Session-Id, nunca Authorization ---');
  {
    // Instalación previa peor caso: dejó también el idToken legado en el Keystore.
    secureStore.__seed('axioma.v1.session.sessionId', 'sess-uuid-123');
    secureStore.__seed('axioma.v1.session.idToken', 'legacy-expired-firebase-token');

    let seenHeaders: Headers | undefined;
    (globalThis as { fetch: typeof fetch }).fetch = (async (_url: string, init?: RequestInit) => {
      seenHeaders = new Headers(init?.headers);
      return jsonResponse({ ok: true }, 200);
    }) as typeof fetch;

    await apiRequest('GET', '/auth/me');
    check('envía X-Session-Id con el sessionId almacenado', seenHeaders?.get('x-session-id') === 'sess-uuid-123');
    check('NO envía header Authorization', !seenHeaders?.has('authorization'));
    check(
      'ningún header transporta el idToken legado',
      ![...(seenHeaders ?? new Headers()).values()].some((v) => v.includes('legacy-expired-firebase-token')),
    );
  }

  console.log('--- 0b. skipAuth: no envía credencial de sesión ---');
  {
    let seenHeaders: Headers | undefined;
    (globalThis as { fetch: typeof fetch }).fetch = (async (_url: string, init?: RequestInit) => {
      seenHeaders = new Headers(init?.headers);
      return jsonResponse({ sessionId: 'x', accountId: 'y', status: 'ACTIVE' }, 200);
    }) as typeof fetch;
    await apiRequest('POST', '/auth/session', { body: { idToken: 't' }, skipAuth: true });
    check('POST /auth/session no envía X-Session-Id', !seenHeaders?.has('x-session-id'));
  }

  console.log('--- 1. 429 con el body crudo de @nestjs/throttler -> mensaje humano, sin internals de Nest ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      jsonResponse(
        { error: { code: 'TOO_MANY_REQUESTS', message: 'ThrottlerException: Too Many Requests', requestId: 'x', timestamp: 'y' } },
        429,
      )) as typeof fetch;

    const result = await apiRequest('GET', '/education/subjects');
    check('ok === false', result.ok === false);
    if (!result.ok && result.kind === 'http') {
      check('kind === "http"', result.kind === 'http');
      check('status === 429 se conserva', result.status === 429);
      check('code === "TOO_MANY_REQUESTS" se conserva', result.code === 'TOO_MANY_REQUESTS');
      check('el mensaje NO contiene "ThrottlerException"', !result.message.includes('ThrottlerException'));
      check('el mensaje NO contiene "Exception" ni "Nest"', !/exception/i.test(result.message) && !/\bnest\b/i.test(result.message));
      check(
        'el mensaje es humano y accionable ("varias solicitudes" + "espera")',
        /varias solicitudes/i.test(result.message) && /espera/i.test(result.message),
      );
      check('el body original se conserva para el llamador', Boolean(result.body));
    } else {
      check('resultado es un error http', false);
    }
  }

  console.log('--- 2. Un 429 sin body JSON (cuerpo vacío) -> igualmente mensaje humano ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response('', { status: 429, headers: { 'content-type': 'text/plain' } })) as typeof fetch;
    const result = await apiRequest('GET', '/education/subjects');
    check(
      '429 sin JSON -> mismo mensaje humano',
      result.ok === false && result.kind === 'http' && result.status === 429 && /varias solicitudes/i.test(result.message),
    );
  }

  console.log('--- 3. Otros errores HTTP NO se tocan (el 429 es el único caso especial) ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'Tema no encontrado.' } }, 404)) as typeof fetch;
    const result = await apiRequest('GET', '/education/topics/abc/children');
    check(
      '404 conserva su propio mensaje del backend',
      result.ok === false && result.kind === 'http' && result.status === 404 && result.message === 'Tema no encontrado.',
    );
  }

  console.log('--- 4. Error de RED (sin respuesta) sigue siendo `kind: "network"` ---');
  {
    (globalThis as { fetch: typeof fetch }).fetch = (async () => {
      throw new Error('offline');
    }) as typeof fetch;
    const result = await apiRequest('GET', '/education/subjects');
    check('kind === "network"', result.ok === false && result.kind === 'network');
  }

  console.log('--- AR-2B / RQ-06: una respuesta 2xx que NO satisface el esquema -> `kind:"schema"` TIPADO, nunca un throw ---');
  {
    const { z } = await import('zod');
    const strictSchema = z.object({ username: z.string(), moderationStatus: z.string() });

    // (a) payload válido -> ok con los datos parseados.
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      jsonResponse({ username: 'ana', moderationStatus: 'CLEAR', extra: 'ignorado' }, 200)) as typeof fetch;
    const okResult = await apiRequest('GET', '/user/public-profile', { schema: strictSchema });
    check('payload válido -> ok === true con datos parseados', okResult.ok === true && okResult.ok && okResult.data.username === 'ana');

    // (b) payload que le falta un campo requerido (deriva de contrato: el
    // backend desplegado va por detrás y no envía `moderationStatus`) ->
    // NUNCA lanza; devuelve `kind:'schema'` con un mensaje accionable.
    (globalThis as { fetch: typeof fetch }).fetch = (async () => jsonResponse({ username: 'ana' }, 200)) as typeof fetch;
    let threw = false;
    let schemaResult: Awaited<ReturnType<typeof apiRequest>> | undefined;
    try {
      schemaResult = await apiRequest('GET', '/user/public-profile', { schema: strictSchema });
    } catch {
      threw = true;
    }
    check('payload inválido -> NO lanza (sin promesa rechazada sin capturar)', !threw);
    check('payload inválido -> ok === false && kind === "schema"', !!schemaResult && !schemaResult.ok && schemaResult.kind === 'schema');
    check('payload inválido -> trae un mensaje accionable (no vacío, sugiere actualizar la app)', !!schemaResult && !schemaResult.ok && /actualizar la app/i.test(schemaResult.message));

    // (c) fallo HTTP con esquema pedido -> se conserva el comportamiento `kind:'http'` (nunca se enmascara como schema).
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      jsonResponse({ error: { code: 'NOT_FOUND', message: 'No encontrado.' } }, 404)) as typeof fetch;
    const httpResult = await apiRequest('GET', '/user/public-profile', { schema: strictSchema });
    check('fallo HTTP con schema pedido -> sigue siendo kind:"http" (no enmascarado)', !httpResult.ok && httpResult.kind === 'http' && httpResult.status === 404);

    // (d) 2xx con cuerpo NO-JSON donde se esperaba JSON -> `kind:'network'` recuperable, nunca throw.
    (globalThis as { fetch: typeof fetch }).fetch = (async () =>
      new Response('<html>bad gateway</html>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch;
    let threwJson = false;
    let jsonFail: Awaited<ReturnType<typeof apiRequest>> | undefined;
    try {
      jsonFail = await apiRequest('GET', '/user/public-profile', { schema: strictSchema });
    } catch {
      threwJson = true;
    }
    check('2xx con cuerpo no-JSON -> NO lanza', !threwJson);
    check('2xx con cuerpo no-JSON -> kind:"network" recuperable', !!jsonFail && !jsonFail.ok && jsonFail.kind === 'network');
  }

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate del cliente de API pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
