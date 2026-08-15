import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Usado por CI (job db-migrations) para confirmar que el seed es idempotente:
 * tras correrlo dos veces, curriculum_topic debe tener exactamente 7 filas.
 *
 * Desglose (4 de Matemática, ya existentes + 3 nuevas de los fixtures mínimos
 * de Ciencias/Lenguaje/Historia creados para la reevaluación de
 * `AXIOMA_TUTOR_V4`, ver `apps/backend/prisma/seed.ts`):
 *   1 unidad + 3 subtemas de "Porcentajes y proporcionalidad" (Matemática)
 *   1 unidad de "Organización, estructura y actividad celular" (Ciencias)
 *   1 unidad de "Competencia lectora: inferencia e interpretación" (Lenguaje)
 *   1 unidad de "Chile en el siglo XX: crisis de 1929 e industrialización
 *     sustitutiva" (Historia)
 */
const EXPECTED_ROWS = 7;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const count = await prisma.curriculumTopic.count();
  console.log(`curriculum_topic rows: ${count}`);
  if (count !== EXPECTED_ROWS) {
    throw new Error(
      `Esperaba ${EXPECTED_ROWS} filas (Matemática: 1 unidad + 3 subtemas; Ciencias/Lenguaje/Historia: 1 unidad cada una), encontré ${count} -- el seed no es idempotente.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
