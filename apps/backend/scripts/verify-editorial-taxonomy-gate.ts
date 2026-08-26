// CONTENT-4.2A -- Gate end-to-end de EditorialTaxonomyService, SIN HTTP:
// prueba directamente el servicio contra Postgres real, mismo criterio que
// verify-competitive-profile-foundation-gate.ts. Cubre exactamente la
// semántica CREATED/NO-OP/CONFLICT para Subject y CurriculumTopic
// (raíz=Unidad, hijo=Recurso) que cierra la dependencia bloqueante
// detectada por la auditoría de CONTENT-4.2.
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { EditorialTaxonomyRepository } from '../src/education/editorial-taxonomy.repository';
import { EditorialTaxonomyService } from '../src/education/editorial-taxonomy.service';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

async function expectConflict(promise: Promise<unknown>, label: string) {
  try {
    await promise;
    check(label, false);
  } catch (error) {
    const isConflict = (error as { status?: number; name?: string }).status === 409 || (error as Error).name === 'ConflictException';
    check(label, isConflict);
    if (!isConflict) console.error(`       error inesperado: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const repo = new EditorialTaxonomyRepository(prisma);
  const service = new EditorialTaxonomyService(prisma, repo);

  const suffix = Date.now();
  const subjectKey = `gate-taxonomy-${suffix}`;

  console.log('--- Subject: 1ra llamada crea ---');
  const s1 = await service.resolveOrCreateSubject({ subjectKey, name: 'Gate Taxonomy', shortName: 'GT', displayOrder: 999 });
  check('1ra llamada: created=true', s1.created === true);
  const subjectId = s1.subject.id;

  console.log('--- Subject: 2da llamada idéntica -> NO-OP, mismo UUID ---');
  const s2 = await service.resolveOrCreateSubject({ subjectKey, name: 'Gate Taxonomy', shortName: 'GT', displayOrder: 999 });
  check('2da llamada: created=false', s2.created === false);
  check('2da llamada: mismo id que la 1ra', s2.subject.id === subjectId);

  console.log('--- Subject: mismo subjectKey, atributo estructural distinto -> CONFLICT ---');
  await expectConflict(
    service.resolveOrCreateSubject({ subjectKey, name: 'Nombre Distinto', shortName: 'GT', displayOrder: 999 }),
    'mismo subjectKey con name distinto -> rechazado (409)',
  );

  const subjectRows = await pg.query('SELECT count(*)::int AS n FROM subject WHERE subject_key = $1', [subjectKey]);
  check('exactamente 1 fila de subject para esta key (sin duplicados)', subjectRows.rows[0].n === 1);

  console.log('\n--- CurriculumTopic raíz (Unidad): 1ra llamada crea ---');
  const unitCode = `GATE.TAXONOMY.${suffix}`;
  const u1 = await service.resolveOrCreateCurriculumTopic({ code: unitCode, name: 'Unidad Gate', order: 1, subjectId });
  check('1ra llamada: created=true', u1.created === true);
  check('parentId de una raíz es null', u1.topic.parentId === null);
  const unitId = u1.topic.id;

  console.log('--- CurriculumTopic raíz: 2da llamada idéntica -> NO-OP, mismo UUID ---');
  const u2 = await service.resolveOrCreateCurriculumTopic({ code: unitCode, name: 'Unidad Gate', order: 1, subjectId });
  check('2da llamada: created=false', u2.created === false);
  check('2da llamada: mismo id que la 1ra', u2.topic.id === unitId);

  console.log('\n--- CurriculumTopic hijo (Recurso): 1ra llamada crea bajo la unidad ---');
  const resourceCode = `GATE.TAXONOMY.${suffix}.RECURSO`;
  const r1 = await service.resolveOrCreateCurriculumTopic({
    code: resourceCode,
    name: 'Recurso Gate',
    order: 1,
    subjectId,
    parentId: unitId,
  });
  check('1ra llamada: created=true', r1.created === true);
  check('parentId == id de la unidad', r1.topic.parentId === unitId);
  const resourceId = r1.topic.id;

  console.log('--- CurriculumTopic hijo: 2da llamada idéntica -> NO-OP, mismo UUID ---');
  const r2 = await service.resolveOrCreateCurriculumTopic({
    code: resourceCode,
    name: 'Recurso Gate',
    order: 1,
    subjectId,
    parentId: unitId,
  });
  check('2da llamada: created=false', r2.created === false);
  check('2da llamada: mismo id que la 1ra', r2.topic.id === resourceId);

  console.log('--- CurriculumTopic hijo: mismo code, OTRO parent -> CONFLICT ---');
  const otherUnit = await service.resolveOrCreateCurriculumTopic({
    code: `GATE.TAXONOMY.${suffix}.OTRA_UNIDAD`,
    name: 'Otra Unidad Gate',
    order: 2,
    subjectId,
  });
  await expectConflict(
    service.resolveOrCreateCurriculumTopic({
      code: resourceCode,
      name: 'Recurso Gate',
      order: 1,
      subjectId,
      parentId: otherUnit.topic.id,
    }),
    'mismo code con parentId distinto -> rechazado (409), sin reparentar',
  );

  console.log('--- CurriculumTopic hijo: mismo code, OTRO subject -> CONFLICT ---');
  const otherSubject = await service.resolveOrCreateSubject({
    subjectKey: `${subjectKey}-otra`,
    name: 'Otra Materia Gate',
    shortName: 'OMG',
    displayOrder: 998,
  });
  await expectConflict(
    service.resolveOrCreateCurriculumTopic({
      code: resourceCode,
      name: 'Recurso Gate',
      order: 1,
      subjectId: otherSubject.subject.id,
      parentId: unitId,
    }),
    'mismo code con subjectId distinto -> rechazado (409), sin mover de materia',
  );

  const topicRows = await pg.query('SELECT count(*)::int AS n FROM curriculum_topic WHERE code = $1', [resourceCode]);
  check('exactamente 1 fila de curriculum_topic para este code (sin duplicados)', topicRows.rows[0].n === 1);

  const finalTopic = await pg.query('SELECT parent_id, subject_id FROM curriculum_topic WHERE code = $1', [resourceCode]);
  check('el recurso SIGUE bajo su unidad original (sin reparentar)', finalTopic.rows[0].parent_id === unitId);
  check('el recurso SIGUE en su materia original (sin mover de materia)', finalTopic.rows[0].subject_id === subjectId);

  console.log('\n--- CurriculumTopic: subjectId inexistente -> 404, sin crear ---');
  try {
    await service.resolveOrCreateCurriculumTopic({
      code: `GATE.TAXONOMY.${suffix}.HUERFANO`,
      name: 'Huérfano',
      order: 1,
      subjectId: randomUUID(),
    });
    check('subjectId inexistente -> rechazado', false);
  } catch (error) {
    check('subjectId inexistente -> rechazado (404)', (error as { status?: number }).status === 404);
  }

  await pg.end();
  await prisma.$disconnect();

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Taxonomía Editorial (CONTENT-4.2A) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
