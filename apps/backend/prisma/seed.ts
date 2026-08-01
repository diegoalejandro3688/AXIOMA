import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  resourceContentBlocksSchema,
  explanationContentSchema,
  answerOptionContentSchema,
} from '@axioma/contracts';
import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Seed idempotente: correr este script N veces produce el mismo estado final,
 * nunca filas duplicadas. Usa upsert por clave única, nunca create ciego.
 *
 * Datos: la primera unidad de la Vertical M1 ya aprobada -- "Porcentajes y
 * proporcionalidad" (eje Números) y sus 3 subtemas -- más, desde el Bloque I
 * (ADR-0012), la materia Matemática, un recurso publicado y dos preguntas
 * reales sobre esa misma unidad. No es el catálogo PAES completo.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertTopic(input: { code: string; name: string; order: number; subjectId: string; parentCode?: string }) {
  const parentId = input.parentCode
    ? (await prisma.curriculumTopic.findUniqueOrThrow({ where: { code: input.parentCode } })).id
    : null;

  return prisma.curriculumTopic.upsert({
    where: { code: input.code },
    update: { name: input.name, order: input.order, parentId },
    create: { code: input.code, name: input.name, order: input.order, parentId, subjectId: input.subjectId },
  });
}

/**
 * Validado con Zod ANTES de persistir -- ver ADR-0012, punto 4: Postgres no
 * conoce la forma interna de `content_blocks`/`stem_content`/etc.
 */
async function seedResource(input: { unidadId: string; subjectId: string }) {
  const resource = await prisma.learningResource.upsert({
    where: { resourceKey: 'M1.NUMEROS.PORCENTAJES.LECCION' },
    update: {},
    create: {
      resourceKey: 'M1.NUMEROS.PORCENTAJES.LECCION',
      primarySubjectId: input.subjectId,
      resourceType: 'LESSON',
    },
  });

  const existingVersion = await prisma.learningResourceVersion.findFirst({
    where: { learningResourceId: resource.id, editorialStatus: 'PUBLISHED' },
  });
  if (existingVersion) return { resource, version: existingVersion };

  const contentBlocks = resourceContentBlocksSchema.parse([
    { type: 'heading', order: 0, text: 'Porcentajes y proporcionalidad', level: 1 },
    {
      type: 'paragraph',
      order: 1,
      text: 'Un porcentaje expresa una cantidad como parte de 100. Para calcular el p% de un valor v, se multiplica v por p y se divide por 100.',
    },
    { type: 'formula', order: 2, latex: '\\text{porcentaje} = \\frac{v \\times p}{100}' },
    {
      type: 'paragraph',
      order: 3,
      text: 'La proporcionalidad directa mantiene constante el cociente entre dos cantidades; la inversa mantiene constante su producto.',
    },
  ]);

  const version = await prisma.learningResourceVersion.create({
    data: {
      learningResourceId: resource.id,
      curriculumTopicId: input.unidadId,
      title: 'Porcentajes y proporcionalidad',
      contentBlocks,
      editorialStatus: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  return { resource, version };
}

async function seedQuestion(input: {
  questionKey: string;
  subjectId: string;
  topicId: string;
  stem: string;
  options: { text: string; correct: boolean }[];
  explanation: string;
}) {
  const question = await prisma.question.upsert({
    where: { questionKey: input.questionKey },
    update: {},
    create: { questionKey: input.questionKey, primarySubjectId: input.subjectId, questionType: 'SINGLE_CHOICE' },
  });

  const existingVersion = await prisma.questionVersion.findFirst({
    where: { questionId: question.id, editorialStatus: 'PUBLISHED' },
  });
  if (existingVersion) return { question, version: existingVersion };

  const stemContent = resourceContentBlocksSchema.parse([{ type: 'paragraph', order: 0, text: input.stem }]);
  const explanationContent = explanationContentSchema.parse([{ type: 'paragraph', order: 0, text: input.explanation }]);

  const version = await prisma.questionVersion.create({
    data: {
      questionId: question.id,
      curriculumTopicId: input.topicId,
      stemContent,
      explanationContent,
      editorialStatus: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  await prisma.answerOption.createMany({
    data: input.options.map((option, index) => ({
      questionVersionId: version.id,
      content: answerOptionContentSchema.parse({ type: 'paragraph', order: 0, text: option.text }),
      displayOrder: index,
      isCorrect: option.correct,
    })),
  });

  return { question, version };
}

async function main() {
  const subject = await prisma.subject.upsert({
    where: { subjectKey: 'matematica' },
    update: {},
    create: { subjectKey: 'matematica', name: 'Matemática', shortName: 'Mate', displayOrder: 1 },
  });

  const unidad = await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES',
    name: 'Porcentajes y proporcionalidad',
    order: 1,
    subjectId: subject.id,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.CALCULO',
    name: 'Cálculo de porcentaje',
    order: 1,
    subjectId: subject.id,
    parentCode: unidad.code,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.VARIACION',
    name: 'Variación porcentual (aumento/descuento)',
    order: 2,
    subjectId: subject.id,
    parentCode: unidad.code,
  });

  await upsertTopic({
    code: 'M1.NUMEROS.PORCENTAJES.PROPORCIONALIDAD',
    name: 'Proporcionalidad directa e inversa',
    order: 3,
    subjectId: subject.id,
    parentCode: unidad.code,
  });

  await seedResource({ unidadId: unidad.id, subjectId: subject.id });

  await seedQuestion({
    questionKey: 'M1.NUMEROS.PORCENTAJES.Q1',
    subjectId: subject.id,
    topicId: unidad.id,
    stem: '¿A cuánto equivale el 20% de 150?',
    options: [
      { text: '20', correct: false },
      { text: '30', correct: true },
      { text: '35', correct: false },
      { text: '150', correct: false },
    ],
    explanation: '20% de 150 = 150 × 20 / 100 = 30.',
  });

  await seedQuestion({
    questionKey: 'M1.NUMEROS.PORCENTAJES.Q2',
    subjectId: subject.id,
    topicId: unidad.id,
    stem: 'Un producto de $2.000 sube un 15%. ¿Cuál es su nuevo precio?',
    options: [
      { text: '$2.015', correct: false },
      { text: '$2.150', correct: false },
      { text: '$2.300', correct: true },
      { text: '$2.500', correct: false },
    ],
    explanation: 'Aumento = 2.000 × 15 / 100 = 300. Nuevo precio = 2.000 + 300 = 2.300.',
  });

  const totalTopics = await prisma.curriculumTopic.count();
  const totalQuestions = await prisma.question.count();
  console.log(`Seed completo. curriculum_topic tiene ${totalTopics} filas, question tiene ${totalQuestions} filas.`);
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
