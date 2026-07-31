import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Seed idempotente: correr este script N veces produce el mismo estado final,
 * nunca filas duplicadas. Usa upsert por `code` (único), nunca create ciego.
 *
 * Datos: la primera unidad de la Vertical M1 ya aprobada -- "Porcentajes y
 * proporcionalidad" (eje Números) y sus 3 subtemas. Ver project memory /
 * Implementation Matrix v1.1. No es el catálogo PAES completo.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertTopic(input: {
  code: string;
  name: string;
  order: number;
  parentCode?: string;
}) {
  const parentId = input.parentCode
    ? (await prisma.curriculumTopic.findUniqueOrThrow({ where: { code: input.parentCode } })).id
    : null;

  return prisma.curriculumTopic.upsert({
    where: { code: input.code },
    update: { name: input.name, order: input.order, parentId },
    create: { code: input.code, name: input.name, order: input.order, parentId },
  });
}

async function main() {
  const unidad = await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES',
    name: 'Porcentajes y proporcionalidad',
    order: 1,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.CALCULO',
    name: 'Cálculo de porcentaje',
    order: 1,
    parentCode: unidad.code,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.VARIACION',
    name: 'Variación porcentual (aumento/descuento)',
    order: 2,
    parentCode: unidad.code,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.PROPORCIONALIDAD',
    name: 'Proporcionalidad directa e inversa',
    order: 3,
    parentCode: unidad.code,
  });

  const total = await prisma.curriculumTopic.count();
  console.log(`Seed completo. curriculum_topic tiene ${total} filas.`);
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
