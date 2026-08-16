import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminActorRepository } from '../administration/admin-actor.repository';
import { AdminCms018ExceptionRepository } from '../administration/admin-cms018-exception.repository';
import type { AdminActionObjectType } from '../generated/prisma/client';

/**
 * Activación DELIBERADA de la excepción de CMS-018 -- LEF Bloque VII,
 * Incremento 3. Ver LEF-BLOCK-VII-DEFINITION.md §8.5 (DG-10) e invariante 24.
 *
 * Mismo precedente de estilo que `create-admin-actor.ts` (§9.5, "emisión y
 * entrega fuera de banda"): herramienta interna de operaciones que,
 * DELIBERADAMENTE, no es un endpoint HTTP.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN CLI Y NO UN CAMPO DE PETICIÓN
 * ---------------------------------------------------------------------------
 * §8.5, condición 1: "La excepción NO es el comportamiento por defecto.
 * Alguien debe activarla de forma explícita e intencional. Ninguna
 * configuración inicial, ningún valor por defecto, ninguna inferencia del
 * sistema puede dejarla activa sin un acto deliberado."
 *
 * Un booleano en el cuerpo de la petición, por muy `false` que sea su valor
 * por defecto, es exactamente una inferencia a un paso de distancia: bastaría
 * un cliente descuidado, un valor por defecto de un formulario futuro o una
 * plantilla copiada para que la auto-aprobación pasara a ser rutina silenciosa.
 * Exigir que la activación exista como FILA, creada fuera de banda por alguien
 * con acceso operativo al servidor y con su propia justificación escrita, es
 * la única forma en que "deliberada" significa algo verificable.
 *
 * ---------------------------------------------------------------------------
 * LO QUE ESTA ACTIVACIÓN NO ES (§8.5)
 * ---------------------------------------------------------------------------
 *  - NO es un flag global. Ampara UNA versión concreta (`--object-id`) y
 *    ninguna otra. Publicar otra versión bajo excepción exige activarla otra vez.
 *  - NO es un "modo equipo de una persona" permanente. Cada USO posterior
 *    (T5, T7) exige además su propio motivo: la justificación es POR USO, no
 *    por activación (condición 3). Este CLI no exime de eso a nadie.
 *  - NO es una excepción a la inmutabilidad. No toca §8.4, ni los invariantes
 *    1-5, ni el 16. Su alcance es exclusivamente el invariante 9 (separación
 *    de actor en aprobación y publicación).
 *  - NO es invisible. Cada uso queda como evento distinguible y consultable en
 *    `admin_action`, con el actor que activó y el actor que usó.
 *
 * ---------------------------------------------------------------------------
 * NOTA DE HONESTIDAD, tomada literalmente de §8.5
 * ---------------------------------------------------------------------------
 * En un equipo de una sola persona, quien activa y quien se beneficia son
 * necesariamente la misma persona. Eso es inherente al escenario que el
 * Product Owner autorizó, no un defecto del diseño. Lo que la excepción
 * garantiza en ese caso NO es la separación de responsabilidades (imposible
 * con un solo actor) sino su TRAZABILIDAD: que cada auto-aprobación sea
 * deliberada, atribuida y justificada, en vez de indistinguible de una
 * aprobación normal.
 *
 * Uso:
 *   node dist/cli/activate-cms018-exception.js \
 *        --actor-id <uuid del AdminActor que activa> \
 *        --object-type QUESTION_VERSION|LEARNING_RESOURCE_VERSION \
 *        --object-id <uuid de la versión> \
 *        --reason "<justificación de la activación>"
 */

const VALID_OBJECT_TYPES: readonly AdminActionObjectType[] = ['QUESTION_VERSION', 'LEARNING_RESOURCE_VERSION'];

const USAGE = [
  'Uso:',
  '  node dist/cli/activate-cms018-exception.js --actor-id <uuid> \\',
  '       --object-type <QUESTION_VERSION|LEARNING_RESOURCE_VERSION> \\',
  '       --object-id <uuid> --reason "<justificacion>"',
  '',
  'Todos los argumentos son obligatorios. La excepcion de CMS-018 NO tiene valor por',
  'defecto y NO se activa sola: ver LEF-BLOCK-VII-DEFINITION.md 8.5, condicion 1.',
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

  const actorId = (args['actor-id'] ?? '').trim();
  const objectTypeRaw = (args['object-type'] ?? '').trim().toUpperCase();
  const objectId = (args['object-id'] ?? '').trim();
  const reason = (args.reason ?? '').trim();

  if (!actorId || !objectTypeRaw || !objectId || !reason) {
    console.error(USAGE);
    process.exit(1);
  }

  if (!VALID_OBJECT_TYPES.includes(objectTypeRaw as AdminActionObjectType)) {
    console.error(`--object-type inválido. Válidos: ${VALID_OBJECT_TYPES.join(', ')}.`);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    // El actor que activa debe existir y estar ACTIVO. Una activación
    // atribuida a un actor desactivado no sería atribución (invariante 23).
    const actorRepo = app.get(AdminActorRepository);
    const actor = await actorRepo.findByIdWithRoles(actorId);
    if (!actor) {
      console.error('No existe ningún AdminActor con ese identificador.');
      process.exitCode = 1;
      return;
    }
    if (!actor.isActive) {
      console.error('El AdminActor indicado está desactivado y no puede activar ninguna excepción.');
      process.exitCode = 1;
      return;
    }

    const repo = app.get(AdminCms018ExceptionRepository);
    const activation = await repo.activate({
      activatedByActorId: actor.id,
      targetObjectType: objectTypeRaw as AdminActionObjectType,
      targetObjectId: objectId,
      activationReason: reason,
    });

    console.log('');
    console.log('Excepcion de CMS-018 ACTIVADA -- desviacion registrada, no camino normal.');
    console.log(`  activationId : ${activation.id}`);
    console.log(`  activadaPor  : ${actor.displayName} (${actor.id})`);
    console.log(`  objeto       : ${activation.targetObjectType} ${activation.targetObjectId}`);
    console.log(`  motivo       : ${activation.activationReason}`);
    console.log('');
    console.log('  Ampara UNICAMENTE esa version. Cada uso (T5, T7) exige ADEMAS su propio motivo.');
    console.log('  Se presenta como `cms018ActivationId` en el cuerpo de la transicion.');
    console.log('');
  } catch (error) {
    console.error('No se pudo activar la excepción:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
