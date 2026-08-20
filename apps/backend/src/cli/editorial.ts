/**
 * CLI editorial interna -- LEF Bloque VII, Incremento 6.
 * Ver docs/adr/LEF-BLOCK-VII-DEFINITION.md §12.6 (frontera exacta), §13.6 (los
 * cinco criterios de cierre), decisión D (§4), DG-7 (§14.2) e invariantes 7,
 * 12, 13 y 22 (§7.1).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES ESTE ARCHIVO, LITERALMENTE
 * ---------------------------------------------------------------------------
 * §12.6: "comandos en `apps/backend/src/cli/` que consumen la MISMA API
 * administrativa de los Incrementos 2-5. Ninguna lógica de negocio propia en
 * el CLI: es un CLIENTE, no una segunda ruta de escritura."
 *
 * Su objetivo contractual es cerrar la decisión D: que un miembro autorizado
 * del equipo ejerza TODO el ciclo editorial -- crear, enviar a revisión,
 * aprobar, publicar, corregir publicando versión nueva y retirar -- "sin
 * editar código ni escribir SQL", que es la formulación literal del criterio
 * 259 y de `PRD-D052` (invariante 12).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ES UN CLIENTE HTTP Y NO UN PROCESO NEST, A DIFERENCIA DE LOS OTROS
 * TRES CLI DE `src/cli/`
 * ---------------------------------------------------------------------------
 * `recover-account.ts` (ADR-0005), `create-admin-actor.ts` (§9.5) y
 * `activate-cms018-exception.ts` (§8.5) son, POR MANDATO CONTRACTUAL,
 * herramientas FUERA DE BANDA: existen precisamente porque no deben ser
 * alcanzables por tráfico HTTP. §9.5 exige que "la emisión y entrega del token
 * ocurran fuera de banda" y §8.5 condición 1 exige que la activación de la
 * excepción sea "un acto deliberado" que no pueda inferirse de una petición.
 * Ambas levantan el contexto de Nest y hablan con la base a propósito.
 *
 * Este archivo es lo contrario, y también por mandato: §13.6 punto 3 exige que
 * el CLI del ciclo editorial "no importe repositorios de Prisma directamente
 * ni abra conexión propia a la base -- solo consuma la API". Por eso aquí NO
 * se importa `NestFactory`, ni `AppModule`, ni `PrismaService`, ni ningún
 * repositorio, ni `pg`: la única dependencia es `fetch`. Si este archivo
 * pudiera escribir en la base por su cuenta, sería exactamente la "segunda
 * ruta de escritura" que §12.6 prohíbe, y la autoridad de dominio dejaría de
 * ser EDUCATION (invariante 15).
 *
 * ---------------------------------------------------------------------------
 * EL BACKEND ES LA ÚNICA AUTORIDAD DE IDENTIDAD Y DE ROL (invariante 22, DG-7)
 * ---------------------------------------------------------------------------
 * "El CLI solo presenta el token personal del actor y nada más: no envía un
 * rol, no decide un rol, no aplica comprobaciones de autorización propias, no
 * abre conexión a la base" (§12.6).
 *
 * En consecuencia, y de forma verificable estáticamente (§13.6 punto 3):
 *  - Este archivo NO contiene la palabra AUTHOR ni PUBLISHER en ninguna
 *    comparación, ni en ningún literal enviado. No sabe qué roles existen.
 *  - NO construye ningún cuerpo de petición con un campo de rol o de actor.
 *    Los contratos de `packages/contracts` tampoco lo permitirían: son
 *    `.strict()` y no declaran esos campos.
 *  - NO decide si una operación está permitida. Manda la petición y REPORTA
 *    lo que el backend responda. Un 401/403 se imprime tal cual: el CLI no
 *    "protege" al usuario adivinando, porque adivinar sería una segunda
 *    autorización que podría divergir de la real.
 *  - NO acepta `INTERNAL_OPS_KEY` (§13.6 punto 2, decisión D, §7.2): esa clave
 *    compartida no concede NINGUNA capacidad editorial, y este archivo no la
 *    lee ni la envía. La única credencial es el token PERSONAL del actor.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTE CLI NO HACE (§12.6, "qué NO hace explícitamente")
 * ---------------------------------------------------------------------------
 *  - NO construye ninguna UI web ni un tercer paquete en `apps/`.
 *  - NO construye vista previa (`CMS-007`, diferido por decisión D).
 *  - NO importa contenido en masa (`CMS-026..029`, diferido por decisión E
 *    para TODO el bloque). No existe ningún comando de lote aquí.
 *  - NO duplica lógica de dominio: no valida `CMS-013`, no evalúa `CMS-018`,
 *    no comprueba transiciones. Todo eso vive en EDUCATION y en el servicio
 *    editorial, y el CLI se limita a recibir su veredicto.
 *  - NO nombra `ARCHIVED` (invariante 21): ningún comando lo produce ni lo
 *    ofrece, de modo que el valor sigue siendo inalcanzable por esta ruta.
 *    El estado terminal de V1 es `DEPRECATED`.
 *
 * ---------------------------------------------------------------------------
 * USO
 * ---------------------------------------------------------------------------
 *   node dist/cli/editorial.js <comando> [opciones]
 *
 * Credenciales y destino, por variable de entorno o por bandera:
 *   AXIOMA_ADMIN_TOKEN=axadm_...      (o --token)
 *   AXIOMA_ADMIN_API_URL=http://...   (o --api-url; por defecto localhost:3000)
 *
 * Ejecútese `node dist/cli/editorial.js help` para la lista de comandos.
 */

/** Cabecera del token personal -- misma constante que declara el guard del I2. */
const ADMIN_TOKEN_HEADER = 'x-admin-token';

const DEFAULT_API_URL = 'http://127.0.0.1:3000';

type Args = { command: string; flags: Map<string, string>; };

/** Parseo mínimo de `--clave valor`. Sin dependencias: el CLI no las necesita. */
function parseArgs(argv: string[]): Args {
  const command = argv[0] ?? 'help';
  const flags = new Map<string, string>();
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === undefined || !token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags.set(key, 'true');
    } else {
      flags.set(key, next);
      i += 1;
    }
  }
  return { command, flags };
}

function fail(message: string): never {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function requireFlag(args: Args, name: string): string {
  const value = args.flags.get(name);
  if (!value || value === 'true') fail(`falta la opción obligatoria --${name}`);
  return value;
}

/**
 * Resolución del token personal.
 *
 * SIN TOKEN NO OPERA (§13.6 punto 2). No hay ningún modo degradado, ninguna
 * credencial de reserva y ninguna lectura de `INTERNAL_OPS_KEY`: si el actor
 * no presenta su token personal, el comando termina aquí y no se emite ninguna
 * petición. Es una comprobación de ARGUMENTOS AUSENTES, no de autorización --
 * el CLI sigue sin saber ni decidir qué puede hacer ese token (invariante 22).
 */
function resolveToken(args: Args): string {
  const token = args.flags.get('token') ?? process.env.AXIOMA_ADMIN_TOKEN;
  if (!token || token === 'true') {
    fail(
      'no se presentó ningún token personal de actor administrativo.\n' +
        '       Use --token <valor> o la variable de entorno AXIOMA_ADMIN_TOKEN.\n' +
        '       El CLI no admite ninguna otra credencial: la clave compartida de\n' +
        '       operaciones internas NO concede ninguna capacidad editorial (§7.2).',
    );
  }
  return token;
}

function resolveApiUrl(args: Args): string {
  return (args.flags.get('api-url') ?? process.env.AXIOMA_ADMIN_API_URL ?? DEFAULT_API_URL).replace(/\/+$/, '');
}

/**
 * Única puerta de salida del CLI.
 *
 * Envía SIEMPRE el mismo par de cabeceras y nada más: el token personal y el
 * tipo de contenido. Ninguna cabecera de rol, ninguna de actor, ninguna clave
 * compartida. El cuerpo es exactamente el que el comando construyó a partir de
 * lo que el operador escribió; el CLI no le añade campos.
 */
async function request(
  apiUrl: string,
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; payload: unknown }> {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      [ADMIN_TOKEN_HEADER]: token,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    /* respuesta no-JSON: se reporta el texto crudo, sin interpretarlo */
  }
  return { status: response.status, payload };
}

/**
 * Reporte del resultado.
 *
 * El código de salida refleja el veredicto DEL BACKEND, sin reinterpretarlo:
 * 2xx -> 0, cualquier otra cosa -> 1. El CLI no traduce un 403 a "no tienes
 * permiso" ni un 409 a "ya estaba publicado": imprime el cuerpo que el
 * servidor devolvió, que es la única versión autorizada de lo ocurrido.
 */
function report(result: { status: number; payload: unknown }): void {
  const ok = result.status >= 200 && result.status < 300;
  console.log(JSON.stringify({ httpStatus: result.status, ok, body: result.payload }, null, 2));
  if (!ok) process.exit(1);
}

/**
 * Lectura de un cuerpo de petición desde un archivo JSON o desde stdin (`-`).
 *
 * El contenido académico (bloques semánticos de `DM-D104`) es demasiado
 * estructurado para banderas de línea de comandos, y forzarlo a banderas
 * invitaría a construirlo mal. Se entrega como JSON y viaja SIN TOCAR hasta la
 * API: el CLI no lo valida (eso es `CMS-013`, dominio de EDUCATION) y no lo
 * completa con valores por defecto propios, que serían lógica de negocio
 * encubierta.
 */
async function readJsonBody(pathOrDash: string): Promise<unknown> {
  const raw =
    pathOrDash === '-'
      ? await new Promise<string>((resolve, reject) => {
          let buffer = '';
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', (chunk) => {
            buffer += chunk;
          });
          process.stdin.on('end', () => resolve(buffer));
          process.stdin.on('error', reject);
        })
      : await (await import('node:fs/promises')).readFile(pathOrDash, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(`el cuerpo de la petición no es JSON válido (${(error as Error).message})`);
  }
}

/**
 * Campos comunes y OPCIONALES de toda operación editorial.
 *
 * `--reason` (§9.3 campo 7) y `--operation-id` (invariante 11) se añaden solo
 * si el operador los escribió. El CLI NO genera una clave de idempotencia por
 * su cuenta: inventarla haría que dos ejecuciones del mismo comando fueran
 * siempre operaciones distintas, destruyendo en silencio la garantía que el
 * invariante 11 concede al operador. Si se quiere reintentar con seguridad, se
 * pasa la MISMA clave a propósito -- que es exactamente lo que idempotencia
 * significa.
 */
function withCommonFields(args: Args, body: Record<string, unknown>): Record<string, unknown> {
  const reason = args.flags.get('reason');
  const operationId = args.flags.get('operation-id');
  if (reason && reason !== 'true') body.reason = reason;
  if (operationId && operationId !== 'true') body.operationId = operationId;
  return body;
}

/**
 * Segmento de ruta según la familia de objeto.
 *
 * §8.2 y §8.4 tratan las dos familias en paralelo, y la API declara un par de
 * rutas por familia. Traducir `--object question|resource` a ese segmento es
 * enrutado, no lógica de dominio: el CLI no decide nada sobre el objeto, solo
 * sabe a qué URL de la API corresponde.
 */
function versionPathSegment(args: Args): string {
  const object = args.flags.get('object') ?? 'question';
  if (object === 'question') return 'question-versions';
  if (object === 'resource') return 'learning-resource-versions';
  return fail(`--object debe ser 'question' o 'resource' (recibido: ${object})`);
}

function objectTypeOf(args: Args): string {
  const object = args.flags.get('object') ?? 'question';
  if (object === 'question') return 'QUESTION_VERSION';
  if (object === 'resource') return 'LEARNING_RESOURCE_VERSION';
  return fail(`--object debe ser 'question' o 'resource' (recibido: ${object})`);
}

/**
 * Cuerpo de una transición.
 *
 * `targetStatus` es un literal que el COMANDO fija (`submit` -> `IN_REVIEW`,
 * `publish` -> `PUBLISHED`...). Eso no es la máquina de estados: es el nombre
 * de la intención del operador. Si la transición está permitida, desde qué
 * estado, por qué actor y con qué requisitos de motivo lo decide íntegramente
 * el servicio de dominio (§8.2, §8.4, `CMS-018`), y el CLI no lo comprueba ni
 * lo anticipa. Un `submit` sobre una versión ya publicada se envía igual y el
 * backend lo rechaza -- que es justo lo que debe ocurrir.
 *
 * `--cms018-activation-id` se reenvía tal cual cuando el operador lo escribe.
 * El CLI no puede crearlo: la activación es un acto deliberado fuera de banda
 * (`activate-cms018-exception.ts`, §8.5 condición 1). Aquí solo se NOMBRA una
 * activación que ya existe, y el backend verifica que ampare esta versión.
 */
function transitionBody(args: Args, targetStatus: string): Record<string, unknown> {
  const body = withCommonFields(args, { targetStatus });
  const activationId = args.flags.get('cms018-activation-id');
  if (activationId && activationId !== 'true') body.cms018ActivationId = activationId;
  return body;
}

const HELP = `
CLI editorial interna -- LEF Bloque VII, Incremento 6 (§12.6).
Cliente de la API administrativa. No contiene lógica de dominio.

  node dist/cli/editorial.js <comando> [opciones]

CREDENCIAL (obligatoria en todo comando)
  --token <valor>        Token personal del actor. O AXIOMA_ADMIN_TOKEN.
  --api-url <url>        Destino. O AXIOMA_ADMIN_API_URL. Por defecto ${DEFAULT_API_URL}.

IDENTIDAD
  whoami                 Actor y roles que el BACKEND resuelve desde el token.

AUTORÍA (T1/T2 -- Incremento 4)
  question:create          --file <ruta|->
  question:new-version     --question-id <uuid> --file <ruta|->
  question:update          --version-id <uuid> --file <ruta|->
  resource:create          --file <ruta|->
  resource:new-version     --resource-id <uuid> --file <ruta|->
  resource:update          --version-id <uuid> --file <ruta|->

CICLO EDITORIAL (T3..T8 -- Incremento 3)
  submit     --version-id <uuid> [--object question|resource] [--reason ...]
  approve    --version-id <uuid> [--object ...] [--reason ...] [--cms018-activation-id <uuid>]
  publish    --version-id <uuid> [--object ...] [--reason ...] [--operation-id <uuid>]
  retire     --version-id <uuid> [--object ...] --reason <texto> [--operation-id <uuid>]
  return-to-draft --version-id <uuid> [--object ...] --reason <texto>

CONSULTA (solo lectura)
  actions            --object-id <uuid> [--object question|resource]
  cms018-uses
  coverage           Content Coverage Matrix (Incremento 5).

Opciones comunes: --reason <texto>, --operation-id <uuid>.
El estado terminal de V1 es DEPRECATED, y 'retire' es el único comando que lo
alcanza. No existe ningún comando para el sexto valor histórico del enum: es
inalcanzable por esta ruta (invariante 21, DG-8).
`;

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    console.log(HELP);
    return;
  }

  const token = resolveToken(args);
  const apiUrl = resolveApiUrl(args);
  const base = '/administration/editorial';
  const send = (method: string, path: string, body?: unknown) => request(apiUrl, token, method, path, body);

  switch (args.command) {
    // ---- Identidad (Incremento 2). El backend responde quién es y qué roles
    //      tiene; el CLI se limita a imprimirlo, nunca a usarlo para decidir.
    case 'whoami':
      return report(await send('GET', '/administration/me'));

    // ---- Autoría, T1 y T2 (Incremento 4).
    case 'question:create':
      return report(await send('POST', `${base}/questions`, withCommonFields(args, {
        ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>),
      })));

    case 'question:new-version':
      return report(await send('POST', `${base}/questions/${requireFlag(args, 'question-id')}/versions`,
        withCommonFields(args, { ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>) })));

    case 'question:update':
      return report(await send('PATCH', `${base}/question-versions/${requireFlag(args, 'version-id')}`,
        withCommonFields(args, { ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>) })));

    case 'resource:create':
      return report(await send('POST', `${base}/learning-resources`,
        withCommonFields(args, { ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>) })));

    case 'resource:new-version':
      return report(await send('POST', `${base}/learning-resources/${requireFlag(args, 'resource-id')}/versions`,
        withCommonFields(args, { ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>) })));

    case 'resource:update':
      return report(await send('PATCH', `${base}/learning-resource-versions/${requireFlag(args, 'version-id')}`,
        withCommonFields(args, { ...(await readJsonBody(requireFlag(args, 'file')) as Record<string, unknown>) })));

    // ---- Ciclo editorial, T3..T8 (Incremento 3). Un comando por INTENCIÓN;
    //      la legalidad de cada una la decide el servicio de dominio.
    case 'submit':
      return report(await send('POST', `${base}/${versionPathSegment(args)}/${requireFlag(args, 'version-id')}/transitions`,
        transitionBody(args, 'IN_REVIEW')));

    case 'approve':
      return report(await send('POST', `${base}/${versionPathSegment(args)}/${requireFlag(args, 'version-id')}/transitions`,
        transitionBody(args, 'APPROVED')));

    case 'publish':
      return report(await send('POST', `${base}/${versionPathSegment(args)}/${requireFlag(args, 'version-id')}/transitions`,
        transitionBody(args, 'PUBLISHED')));

    case 'retire':
      return report(await send('POST', `${base}/${versionPathSegment(args)}/${requireFlag(args, 'version-id')}/transitions`,
        transitionBody(args, 'DEPRECATED')));

    case 'return-to-draft':
      return report(await send('POST', `${base}/${versionPathSegment(args)}/${requireFlag(args, 'version-id')}/transitions`,
        transitionBody(args, 'DRAFT')));

    // ---- Consulta. Solo `GET`: el CLI no abre ninguna ruta de lectura nueva,
    //      consume las que los Incrementos 3 y 5 ya declararon.
    case 'actions':
      return report(await send('GET',
        `${base}/actions?objectType=${objectTypeOf(args)}&objectId=${requireFlag(args, 'object-id')}`));

    case 'cms018-uses':
      return report(await send('GET', `${base}/cms018-exception-uses`));

    case 'coverage':
      return report(await send('GET', `${base}/coverage-matrix`));

    default:
      fail(`comando desconocido: ${args.command}. Ejecute 'help' para la lista.`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
