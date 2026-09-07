import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Idempotencia de `prisma/seed.ts` (job `db-migrations` de CI: migra una base
 * vacía -> corre el seed -> lo corre otra vez -> ejecuta este gate).
 *
 * El contrato NO es "la tabla tiene exactamente 7 filas físicas" -- eso solo
 * vale en el pipeline de CI, sobre una base recién migrada, y ya no describe
 * un entorno con el import canónico de Estudio V1 aplicado (donde
 * `curriculum_topic` tiene ~130 filas y el conteo canónico visible lo valida
 * `verify:study-content-mobile-reachability-gate`).
 *
 * El contrato REAL es: `prisma/seed.ts` gestiona SUS filas por `upsert` sobre
 * `code` (clave única), así que correrlo N veces deja EXACTAMENTE UNA fila por
 * cada uno de sus 7 topics canónicos -- nunca las duplica. Este gate lo
 * verifica de forma robusta a la presencia de OTRO contenido (import canónico,
 * fixtures de otros gates): comprueba que cada `code` sembrado aparece una sola
 * vez. Si además la base está "prístina" (solo el seed), el total es 7.
 *
 * Los 7 (ver `apps/backend/prisma/seed.ts`):
 *   Matemática: M1.NUMEROS.PORCENTAJES (unidad) + .CALCULO / .VARIACION /
 *               .PROPORCIONALIDAD (3 subtemas)
 *   Ciencias:   C1.BIOLOGIA.CELULA
 *   Lenguaje:   L1.LECTURA.INFERENCIA
 *   Historia:   H1.CHILE.SIGLO20.ISI
 */
const SEED_TOPIC_CODES = [
  'M1.NUMEROS.PORCENTAJES',
  'M1.NUMEROS.PORCENTAJES.CALCULO',
  'M1.NUMEROS.PORCENTAJES.VARIACION',
  'M1.NUMEROS.PORCENTAJES.PROPORCIONALIDAD',
  'C1.BIOLOGIA.CELULA',
  'L1.LECTURA.INFERENCIA',
  'H1.CHILE.SIGLO20.ISI',
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // READ-ONLY: este gate solo cuenta filas -- nunca escribe. Corre en CI contra
  // la base efímera `axioma_ci` (migrada + seed x2), y el chequeo es
  // agnóstico al entorno: la invariante "cada topic sembrado aparece 1 vez"
  // se cumple igual en `axioma_ci`, en `axioma_gates_dev` y en `axioma_dev`
  // (donde los 7 códigos existen como raíces legacy, una vez cada uno).
  const total = await prisma.curriculumTopic.count();
  console.log(`curriculum_topic rows (total): ${total}`);

  let failures = 0;
  const check = (label: string, ok: boolean) => {
    console.log(`${ok ? '  OK' : 'FALLO'}  ${label}`);
    if (!ok) failures++;
  };

  // Idempotencia: cada topic sembrado existe EXACTAMENTE UNA vez. Si el seed no
  // fuera idempotente (create ciego en vez de upsert), una segunda corrida
  // duplicaría estas filas y el conteo por `code` sería > 1.
  for (const code of SEED_TOPIC_CODES) {
    const n = await prisma.curriculumTopic.count({ where: { code } });
    check(`\`${code}\` aparece exactamente 1 vez (no duplicado por re-seed)`, n === 1);
  }

  if (total === SEED_TOPIC_CODES.length) {
    console.log('  (base prístina: el seed es el único contenido de curriculum_topic)');
  } else {
    console.log(
      `  (la base tiene ${total} topics: ${SEED_TOPIC_CODES.length} del seed + ${total - SEED_TOPIC_CODES.length} de otro origen ` +
        '-- import canónico y/o fixtures de gates; el contrato de idempotencia del seed sigue siendo el conteo por `code`)',
    );
  }

  if (failures > 0) {
    throw new Error(`${failures} verificación(es) de idempotencia del seed fallaron -- prisma/seed.ts no es idempotente.`);
  }
  console.log('\nprisma/seed.ts es idempotente: sus 7 topics canónicos aparecen una sola vez.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
