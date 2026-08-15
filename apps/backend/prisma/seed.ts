import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  resourceContentBlocksSchema,
  explanationContentSchema,
  answerOptionContentSchema,
} from '@axioma/contracts';
import { PrismaClient } from '../src/generated/prisma/client';
import { renderLatexToSvg } from '../src/education/formula-rendering';

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
    {
      type: 'formula',
      order: 2,
      latex: '\\text{porcentaje} = \\frac{v \\times p}{100}',
      // Generado UNA vez, en este mismo momento de "publicación" (ver ADR-0002 y
      // ADR-0013) -- nunca se regenera en cada lectura ni en el dispositivo.
      svg: renderLatexToSvg('\\text{porcentaje} = \\frac{v \\times p}{100}', true),
    },
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

  // LEF Bloque VII, Incremento 1: una `question_version` que alcanzó
  // publicación (PUBLISHED o DEPRECATED) es inmutable y no admite INSERT de
  // `answer_option` -- lo aplica PostgreSQL
  // (`trg_answer_option_published_parent_immutable`,
  // 20260815120000_lef_vii_i1_published_immutability_uniqueness). El orden de
  // construcción, por tanto, es el único válido del nuevo contrato y el mismo
  // que ejercerá T1+T7 del Incremento 4: crear en DRAFT -> insertar las
  // alternativas -> publicar (DRAFT -> PUBLISHED). El seed NO cambia ninguna
  // regla de producto ni ningún dato sembrado: solo el ORDEN de escritura.
  const draftVersion = await prisma.questionVersion.create({
    data: {
      questionId: question.id,
      curriculumTopicId: input.topicId,
      stemContent,
      explanationContent,
      editorialStatus: 'DRAFT',
    },
  });

  await prisma.answerOption.createMany({
    data: input.options.map((option, index) => ({
      questionVersionId: draftVersion.id,
      content: answerOptionContentSchema.parse({ type: 'paragraph', order: 0, text: option.text }),
      displayOrder: index,
      isCorrect: option.correct,
    })),
  });

  const version = await prisma.questionVersion.update({
    where: { id: draftVersion.id },
    data: { editorialStatus: 'PUBLISHED', publishedAt: new Date() },
  });

  return { question, version };
}

/**
 * Escalera de niveles del incremento "Progresión visible" (Bloque II) --
 * ver docs/adr/BLOCK-II-DEFINITION.md. Umbrales de referencia, sin ADR
 * propio (no es una decisión arquitectónica -- ver definición del bloque,
 * §6): progresión creciente simple, nivel 1 en 0 XP (invariante que
 * ProgressionService asume: toda cuenta tiene un nivel actual válido).
 * Upsert por `levelNumber` -- correr este script N veces no duplica filas.
 */
async function seedLevelLadder() {
  const thresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
  for (const [index, minimumLifetimeXp] of thresholds.entries()) {
    const levelNumber = index + 1;
    await prisma.levelDefinition.upsert({
      where: { levelNumber },
      update: { minimumLifetimeXp },
      create: { levelNumber, minimumLifetimeXp, levelName: null },
    });
  }
}

/**
 * Fixtures académicos MÍNIMOS de las tres materias PAES que hasta ahora no
 * tenían ninguno -- Ciencias, Lenguaje e Historia. Creados por decisión del
 * Product Owner sobre la evaluación pedagógica de `AXIOMA_TUTOR_V3`
 * (`experiments/tutor-pedagogy-v3-eval/README.md`, "Decisión pendiente del
 * Product Owner"): esa evaluación solo pudo cubrir Matemática porque era la
 * única materia con contenido canónico real, y la reevaluación de
 * `AXIOMA_TUTOR_V4` necesita contexto académico real en las cuatro materias.
 *
 * Alcance deliberadamente MÍNIMO, no una réplica de la profundidad de
 * Matemática: por materia, UNA unidad curricular real del temario PAES y UNA
 * pregunta publicada de alternativa única, con enunciado autocontenido
 * (suficiente para ejercitar HINT_FIRST / CONCEPTUAL_EXPLANATION /
 * GUIDED_STEPS / WORKED_SOLUTION y el caso de pregunta no respondida) y
 * explicación validada. Sin subtemas, sin recursos de aprendizaje: nada de
 * eso lo exige la reevaluación, y fabricarlo sería inventar catálogo.
 *
 * Idempotente igual que el resto del seed (upsert por clave única + reuso de
 * la versión publicada existente, ver `seedQuestion`).
 */
async function seedCienciasFixture() {
  const subject = await prisma.subject.upsert({
    where: { subjectKey: 'ciencias' },
    update: {},
    create: { subjectKey: 'ciencias', name: 'Ciencias', shortName: 'Cien', displayOrder: 2 },
  });

  const unidad = await upsertTopic({
    code: 'C1.BIOLOGIA.CELULA',
    name: 'Organización, estructura y actividad celular',
    order: 1,
    subjectId: subject.id,
  });

  await seedQuestion({
    questionKey: 'C1.BIOLOGIA.CELULA.Q1',
    subjectId: subject.id,
    topicId: unidad.id,
    stem: 'Una célula vegetal se sumerge en una solución cuya concentración de solutos es mayor que la de su citoplasma. ¿Qué le ocurre a la célula?',
    options: [
      { text: 'Gana agua por ósmosis y aumenta su volumen', correct: false },
      { text: 'Pierde agua por ósmosis y su membrana se separa de la pared celular', correct: true },
      { text: 'No intercambia agua, porque la pared celular impide el paso del agua', correct: false },
      { text: 'Pierde solutos hasta igualar la concentración con el medio externo', correct: false },
    ],
    explanation:
      'La solución es hipertónica respecto del citoplasma. Por ósmosis, el agua se desplaza desde donde hay menos solutos hacia donde hay más, es decir, sale de la célula. La célula vegetal pierde agua y su membrana plasmática se retrae separándose de la pared celular: ese fenómeno se llama plasmólisis. La pared celular es permeable al agua, así que no impide el intercambio, y los solutos no atraviesan libremente la membrana.',
  });
}

async function seedLenguajeFixture() {
  const subject = await prisma.subject.upsert({
    where: { subjectKey: 'lenguaje' },
    update: {},
    create: { subjectKey: 'lenguaje', name: 'Lenguaje', shortName: 'Leng', displayOrder: 3 },
  });

  const unidad = await upsertTopic({
    code: 'L1.LECTURA.INFERENCIA',
    name: 'Competencia lectora: inferencia e interpretación',
    order: 1,
    subjectId: subject.id,
  });

  await seedQuestion({
    questionKey: 'L1.LECTURA.INFERENCIA.Q1',
    subjectId: subject.id,
    topicId: unidad.id,
    stem:
      'Lee el siguiente fragmento: "Cuando por fin llegó a la casa, Elena encontró la puerta entreabierta y las luces encendidas. Nadie sabía que volvería antes de tiempo. Dejó la maleta en el suelo sin hacer ruido y buscó el teléfono en su bolsillo, aunque recordaba que se había quedado sin batería esa misma tarde." ¿Qué se puede inferir sobre el estado de Elena al llegar a la casa?',
    options: [
      { text: 'Está tranquila, porque esperaba encontrar a alguien esperándola', correct: false },
      { text: 'Está alerta y desconfiada frente a una situación que no esperaba', correct: true },
      { text: 'Está molesta porque su familia no le avisó que estaría en la casa', correct: false },
      { text: 'Está apurada porque debe volver a salir de inmediato', correct: false },
    ],
    explanation:
      'El texto nunca dice que Elena esté alerta: hay que inferirlo a partir de sus acciones. Encontrar la puerta entreabierta y las luces encendidas cuando nadie sabía de su llegada, dejar la maleta "sin hacer ruido" y buscar el teléfono son indicios de que percibe algo inesperado y posiblemente riesgoso. Las demás alternativas atribuyen emociones (tranquilidad, molestia, apuro) que ningún elemento del fragmento sostiene.',
  });
}

async function seedHistoriaFixture() {
  const subject = await prisma.subject.upsert({
    where: { subjectKey: 'historia' },
    update: {},
    create: { subjectKey: 'historia', name: 'Historia', shortName: 'Hist', displayOrder: 4 },
  });

  const unidad = await upsertTopic({
    code: 'H1.CHILE.SIGLO20.ISI',
    name: 'Chile en el siglo XX: crisis de 1929 e industrialización sustitutiva',
    order: 1,
    subjectId: subject.id,
  });

  await seedQuestion({
    questionKey: 'H1.CHILE.SIGLO20.ISI.Q1',
    subjectId: subject.id,
    topicId: unidad.id,
    stem:
      'La crisis económica mundial de 1929 golpeó con especial fuerza a Chile por su dependencia de la exportación de salitre. Como respuesta, desde la década de 1930 el Estado chileno impulsó el modelo de Industrialización por Sustitución de Importaciones (ISI). ¿Cuál era el objetivo principal de ese modelo?',
    options: [
      { text: 'Aumentar las exportaciones de salitre para recuperar los ingresos perdidos', correct: false },
      { text: 'Producir dentro del país los bienes que antes se importaban, para depender menos del exterior', correct: true },
      { text: 'Retirar al Estado de la economía y abrir el mercado interno al libre comercio', correct: false },
      { text: 'Trasladar a la población rural hacia las oficinas salitreras del norte del país', correct: false },
    ],
    explanation:
      'El modelo ISI buscaba que Chile fabricara internamente los bienes manufacturados que antes compraba en el extranjero, reduciendo así la dependencia de las importaciones y de un único producto de exportación. Fue un modelo con fuerte intervención estatal: CORFO se creó en 1939 justamente para impulsarlo, lo que es lo contrario de retirar al Estado de la economía. Volver a apostar por el salitre habría profundizado la dependencia que la crisis dejó en evidencia.',
  });
}

async function main() {
  await seedLevelLadder();

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

  await seedCienciasFixture();
  await seedLenguajeFixture();
  await seedHistoriaFixture();

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
