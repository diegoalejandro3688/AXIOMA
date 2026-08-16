import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminIdentityService } from '../administration/admin-identity.service';
import type { AdminRole } from '../generated/prisma/client';

/**
 * Bootstrap del actor administrativo -- LEF Bloque VII, Incremento 2.
 * Ver LEF-BLOCK-VII-DEFINITION.md §9.5 ("emisión y entrega del token ocurren
 * fuera de banda; un operador crea el actor y emite su token").
 *
 * Mismo precedente de estilo que `recover-account.ts` (ADR-0005): herramienta
 * interna de operaciones que, DELIBERADAMENTE, no es un endpoint HTTP.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN CLI Y NO UN ENDPOINT
 * ---------------------------------------------------------------------------
 *  - NO existe ningún endpoint público de auto-registro administrativo, y no
 *    debe existir: quien crea actores administrativos necesita acceso
 *    operativo al servidor/infraestructura, no una cuenta.
 *  - NO es alcanzable con tráfico HTTP de ningún tipo. Ejecutarlo exige
 *    ejecución local del binario compilado y `DATABASE_URL`.
 *  - NUNCA está disponible para una cuenta de estudiante: este archivo no
 *    importa `AuthService`, `AuthGuard` ni nada de `auth/`, no lee ninguna
 *    sesión y no crea ninguna. Un `Account` no puede invocarlo ni indirectamente.
 *  - El token en claro se imprime en stdout UNA sola vez, en el momento de la
 *    creación. No se persiste (la base solo guarda su SHA-256), no se escribe
 *    en ningún log estructurado y no existe ninguna ruta -- ni CLI, ni API, ni
 *    consulta SQL -- para recuperarlo después. Perderlo significa emitir uno
 *    nuevo, nunca "consultarlo".
 *  - Los roles se pasan EXPLÍCITAMENTE como argumento del operador y se
 *    persisten en `admin_actor_role`. A partir de ahí el backend es la única
 *    autoridad de rol (invariante 22): el CLI no vuelve a mencionarlos jamás,
 *    y ningún cliente los envía en ninguna request.
 *
 * ---------------------------------------------------------------------------
 * SIN VALOR POR DEFECTO PARA LA EXPIRACIÓN, a propósito
 * ---------------------------------------------------------------------------
 * `--expires-in-days` es OBLIGATORIO. §9.5 exige que el token sea expirable,
 * pero ninguna fuente contractual fija una duración, y el criterio de DG-9
 * (no inventar números de política sin fuente) se aplica igual aquí: el
 * operador decide y deja constancia en cada emisión, en vez de que el código
 * consagre en silencio un plazo que nadie aprobó.
 *
 * Uso:
 *   node dist/cli/create-admin-actor.js --name "Nombre Apellido" \
 *        --roles AUTHOR,PUBLISHER --expires-in-days 30
 */

const VALID_ROLES: readonly AdminRole[] = ['AUTHOR', 'PUBLISHER'];

const USAGE = [
  'Uso:',
  '  node dist/cli/create-admin-actor.js --name "<nombre legible>" --roles <AUTHOR|PUBLISHER|AUTHOR,PUBLISHER> --expires-in-days <N>',
  '',
  'Todos los argumentos son obligatorios. --expires-in-days no tiene valor por defecto',
  'deliberadamente: ninguna fuente contractual fija la duración de un token administrativo.',
].join('\n');

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) continue;
    out[key] = value;
    i++;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const displayName = (args.name ?? '').trim();
  const rolesRaw = (args.roles ?? '').trim();
  const expiresInDaysRaw = (args['expires-in-days'] ?? '').trim();

  if (!displayName || !rolesRaw || !expiresInDaysRaw) {
    console.error(USAGE);
    process.exit(1);
  }

  const roles = Array.from(
    new Set(
      rolesRaw
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter((r) => r.length > 0),
    ),
  ) as AdminRole[];

  const invalid = roles.filter((r) => !VALID_ROLES.includes(r));
  if (roles.length === 0 || invalid.length > 0) {
    console.error(`Roles inválidos: ${invalid.join(', ') || '(ninguno indicado)'}. Válidos en V1: ${VALID_ROLES.join(', ')}.`);
    console.error('Los otros cuatro roles de ADMIN-003 no están implementados en V1 (ver LEF-BLOCK-VII-DEFINITION.md §9.4).');
    process.exit(1);
  }

  const expiresInDays = Number(expiresInDaysRaw);
  if (!Number.isInteger(expiresInDays) || expiresInDays <= 0) {
    console.error('--expires-in-days debe ser un entero positivo.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const service = app.get(AdminIdentityService);
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const created = await service.bootstrapActor({ displayName, roles, expiresAt });

    // ÚNICA vez en toda la vida del sistema que este valor es visible.
    // console.log directo, NUNCA el logger estructurado: el token no debe
    // pasar por la ruta de logs ni siquiera para ser redactado.
    console.log('');
    console.log('AdminActor creado.');
    console.log(`  actorId    : ${created.actorId}`);
    console.log(`  displayName: ${created.displayName}`);
    console.log(`  roles      : ${created.roles.join(', ')}`);
    console.log(`  expira     : ${expiresAt.toISOString()}`);
    console.log('');
    console.log('  TOKEN (se muestra UNA sola vez, no se puede recuperar despues):');
    console.log(`  ${created.plainToken}`);
    console.log('');
    console.log('  Entregalo a la persona por un canal fuera de banda y no lo guardes en ningun archivo.');
    console.log('  Se presenta en la cabecera X-Admin-Token. Si se pierde, emite uno nuevo: no hay consulta posible.');
    console.log('');
  } catch (error) {
    console.error('No se pudo crear el AdminActor:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
