// Mismo patrón que los gates anteriores: prueba contra el servidor real ya
// compilado y corriendo. A diferencia de los otros, este gate también lee
// el archivo de log del propio proceso (stdout+stderr redirigidos ahí por
// quien lo arrancó, igual que en CI) para verificar formato, correlación y
// ausencia de secretos -- no solo el comportamiento HTTP.
import 'dotenv/config';
import { readFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:3003';
const logPath = process.argv[3] ?? 'backend-observability.log';
const opsKey = process.env.INTERNAL_OPS_KEY ?? '';
let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function req(method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    body: text ? JSON.parse(text) : null,
  };
}

interface LogLine {
  timestamp?: string;
  level?: string;
  context?: string;
  message?: unknown;
  requestId?: string;
  appVersion?: string;
  stack?: string;
  meta?: unknown;
  [key: string]: unknown;
}

function readLogLines(): string[] {
  const raw = readFileSync(logPath, 'utf-8');
  return raw.split('\n').filter((line) => line.trim().length > 0);
}

function parseLogLines(): LogLine[] {
  const parsed: LogLine[] = [];
  for (const line of readLogLines()) {
    parsed.push(JSON.parse(line) as LogLine); // se deja lanzar -- una línea inválida ES un fallo del gate.
  }
  return parsed;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  console.log('--- 1. X-Request-Id inválido se ignora; se genera un UUID nuevo ---');
  const rTooLong = await req('GET', '/health/live', { 'x-request-id': 'a'.repeat(300) });
  const idTooLong = rTooLong.headers.get('x-request-id') ?? '';
  check('id demasiado largo: no se hace eco', idTooLong !== 'a'.repeat(300));
  check('id demasiado largo: se genera un UUID válido en su lugar', UUID_PATTERN.test(idTooLong));

  const rBadChars = await req('GET', '/health/live', { 'x-request-id': 'id con espacios y ñ' });
  const idBadChars = rBadChars.headers.get('x-request-id') ?? '';
  check('id con caracteres no permitidos: no se hace eco', idBadChars !== 'id con espacios y ñ');
  check('id con caracteres no permitidos: se genera un UUID válido', UUID_PATTERN.test(idBadChars));

  console.log('--- 2. X-Request-Id válido se respeta (eco exacto) ---');
  const validId = `gate-valid-${Date.now()}`;
  const rValid = await req('GET', '/health/live', { 'x-request-id': validId });
  check('id válido: eco exacto en el header', rValid.headers.get('x-request-id') === validId);

  console.log('--- 3. El mismo requestId aparece en header, body de error y log ---');
  const idFor401 = `gate-401-${Date.now()}`;
  const r401 = await req('GET', '/auth/me', { 'x-request-id': idFor401 });
  check('status 401', r401.status === 401);
  check('header X-Request-Id == id enviado', r401.headers.get('x-request-id') === idFor401);
  check('body.error.requestId == id enviado', r401.body?.error?.requestId === idFor401);
  check('body.error.code == UNAUTHORIZED', r401.body?.error?.code === 'UNAUTHORIZED');
  check(
    'body.error solo tiene campos esperados (sin fugas)',
    Object.keys(r401.body?.error ?? {})
      .sort()
      .every((k) => ['code', 'message', 'requestId', 'timestamp', 'issues'].includes(k)),
  );

  console.log('--- 4. Payload inválido (BadRequestException propia): code/issues normalizados ---');
  const rInvalidBody = await req('POST', '/auth/session', {}, { idTokenMalNombrado: 'x' });
  check('status 400 (hoy sería 500 sin este paso -- ver ADR-0007)', rInvalidBody.status === 400);
  check('body.error.code == VALIDATION_ERROR', rInvalidBody.body?.error?.code === 'VALIDATION_ERROR');
  check('body.error.issues es un array no vacío', Array.isArray(rInvalidBody.body?.error?.issues) && rInvalidBody.body.error.issues.length >= 1);
  const issueKeys = Object.keys(rInvalidBody.body?.error?.issues?.[0] ?? {}).sort();
  check('cada issue solo tiene {path, message}', issueKeys.length === 2 && issueKeys[0] === 'message' && issueKeys[1] === 'path');

  console.log('--- 5. Error no manejado (5xx): mensaje genérico al cliente, real + stack en el log ---');
  const rThrow = await req('POST', '/platform/_internal/diagnostics/throw', { 'x-internal-ops-key': opsKey });
  check('status 500', rThrow.status === 500);
  check('code == INTERNAL_SERVER_ERROR', rThrow.body?.error?.code === 'INTERNAL_SERVER_ERROR');
  check('mensaje genérico al cliente (no el real)', rThrow.body?.error?.message === 'Error interno.');
  check('el cliente NO recibe el mensaje real del error', !JSON.stringify(rThrow.body).includes('diagnóstico deliberado'));
  check('el cliente NO recibe stack', !('stack' in (rThrow.body?.error ?? {})));

  const linesAfterThrow = parseLogLines();
  const errorLogLine = linesAfterThrow
    .reverse()
    .find((l) => l.level === 'error' && typeof l.message === 'string' && l.message.includes('diagnóstico deliberado'));
  check('el servidor SÍ logueó el mensaje real del error', Boolean(errorLogLine));
  check('el log del error incluye stack', Boolean(errorLogLine?.stack));
  check('el log del error es nivel "error" (no "warn")', errorLogLine?.level === 'error');

  console.log('--- 6. Distinción 4xx=warn / 5xx=error: la excepción 401 del punto 3 se logueó como warn, sin stack ---');
  const warnLogLine = parseLogLines()
    .reverse()
    .find((l) => l.requestId === idFor401);
  check('la excepción 401 se logueó como "warn"', warnLogLine?.level === 'warn');
  check('el log de un 4xx no lleva stack', !warnLogLine?.stack);

  console.log('--- 7. Serialización defensiva: Error/BigInt/circular no rompen el log ---');
  const rTricky = await req('POST', '/platform/_internal/diagnostics/log-tricky', { 'x-internal-ops-key': opsKey });
  check('log-tricky responde 200/201 (no revienta el proceso)', rTricky.status === 200 || rTricky.status === 201);

  const trickyLine = parseLogLines()
    .reverse()
    .find((l) => typeof l.message === 'string' && l.message.includes('carga difícil de serializar'));
  check('la línea "difícil de serializar" existe y es JSON válido (ya se parseó arriba)', Boolean(trickyLine));
  const meta = trickyLine?.meta as Record<string, unknown> | undefined;
  check('BigInt serializado como string', typeof meta?.bigNumber === 'string' && (meta?.bigNumber as string).endsWith('n'));
  check('referencia circular no rompe el log (marcador presente)', JSON.stringify(meta?.circular ?? '').includes('Circular'));
  const errorSample = meta?.errorSample as Record<string, unknown> | undefined;
  check('Error serializado con name/message/stack', Boolean(errorSample?.name && errorSample?.message && errorSample?.stack));

  console.log('--- 8. Ausencia de secretos: ninguna clave sensible aparece en texto plano ---');
  const rawLog = readFileSync(logPath, 'utf-8');
  check('sin "secreto-no-debe-aparecer"', !rawLog.includes('secreto-no-debe-aparecer'));
  check('sin "token.no.debe.aparecer"', !rawLog.includes('token.no.debe.aparecer'));
  check('sin "hunter2-no-debe-aparecer"', !rawLog.includes('hunter2-no-debe-aparecer'));
  check('sin "ops-key-no-debe-aparecer"', !rawLog.includes('ops-key-no-debe-aparecer'));
  check('sin "actor-secret-no-debe-aparecer"', !rawLog.includes('actor-secret-no-debe-aparecer'));
  check('sin "session=no-debe-aparecer"', !rawLog.includes('session=no-debe-aparecer'));
  check('la redacción SÍ se activó ("[REDACTED]" presente)', rawLog.includes('[REDACTED]'));

  console.log('--- 9. Correlaciones distintas entre ejecuciones consecutivas (Privacy sweep, Analytics relay) ---');
  const fixedOuterId = `gate-outer-fixed-${Date.now()}`;
  await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey, 'x-request-id': fixedOuterId });
  await req('POST', '/privacy/_internal/sweep', { 'x-internal-ops-key': opsKey, 'x-request-id': fixedOuterId });
  const sweepJobIds = parseLogLines()
    .filter((l) => l.message === 'Iniciando barrido de PRIVACY')
    .map((l) => l.requestId);
  check('al menos 2 ejecuciones del barrido de PRIVACY registradas', sweepJobIds.length >= 2);
  const uniqueSweepIds = new Set(sweepJobIds);
  check('cada ejecución del barrido tiene su propio correlationId (todos distintos)', uniqueSweepIds.size === sweepJobIds.length);
  check('el correlationId del job NUNCA es el id fijo de la request externa', !sweepJobIds.includes(fixedOuterId));

  await req('POST', '/analytics/_internal/relay', { 'x-internal-ops-key': opsKey, 'x-request-id': fixedOuterId });
  await req('POST', '/analytics/_internal/relay', { 'x-internal-ops-key': opsKey, 'x-request-id': fixedOuterId });
  const relayJobIds = parseLogLines()
    .filter((l) => l.message === 'Iniciando relay de ANALYTICS')
    .map((l) => l.requestId);
  check('al menos 2 ejecuciones del relay de ANALYTICS registradas', relayJobIds.length >= 2);
  const uniqueRelayIds = new Set(relayJobIds);
  check('cada ejecución del relay tiene su propio correlationId (todos distintos)', uniqueRelayIds.size === relayJobIds.length);
  check('el correlationId del job NUNCA es el id fijo de la request externa', !relayJobIds.includes(fixedOuterId));

  console.log('--- 10. Toda línea del log es JSON válido de una sola línea, con campos base ---');
  const allLines = parseLogLines(); // ya lanzaría si alguna línea no fuera JSON válido
  check('el log tiene contenido', allLines.length > 0);
  check(
    'toda línea trae timestamp, level, context, message, appVersion',
    allLines.every((l) => l.timestamp && l.level && l.context && 'message' in l && l.appVersion),
  );

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de OBSERVABILITY pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
