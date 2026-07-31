import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Usado por CI (job db-migrations) para confirmar que el seed es idempotente:
 * tras correrlo dos veces, curriculum_topic debe tener exactamente 4 filas
 * (1 unidad + 3 subtemas de "Porcentajes y proporcionalidad").
 */
const EXPECTED_ROWS = 4;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const count = await prisma.curriculumTopic.count();
  console.log(`curriculum_topic rows: ${count}`);
  if (count !== EXPECTED_ROWS) {
    throw new Error(
      `Esperaba ${EXPECTED_ROWS} filas (1 unidad + 3 subtemas), encontré ${count} -- el seed no es idempotente.`,
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
