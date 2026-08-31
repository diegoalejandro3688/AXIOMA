// STUDY CONTENT MOBILE REACHABILITY -- gate DETERMINISTA (Node puro, sin
// backend) de la navegación de Estudio y de la agregación de progreso de
// Unidad.
//
// Cubre:
//   §32 -- construcción de rutas: Unidad -> lista de Recursos; Recurso ->
//          `topic/[resourceTopicId]/{recurso,ejercicio}` con el id del
//          RECURSO hijo, NUNCA el de la Unidad; el id de la Unidad viaja
//          aparte (`unitId`) solo para la vuelta.
//   §33 -- agregación de progreso de Unidad a partir de sus Recursos hijos
//          (NOT_STARTED / IN_PROGRESS / COMPLETED).
import { randomUUID } from 'node:crypto';
import type { CurriculumTopicResponse, TopicProgressStatus } from '@axioma/contracts';
import { unitResourceListParams, resourceFlowNav } from '../lib/study/study-navigation';
import { aggregateUnitProgressStatus } from '../lib/study/aggregate-unit-progress';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function topic(id: string, parentId: string | null): CurriculumTopicResponse {
  return { id, code: `c-${id.slice(0, 6)}`, name: `t-${id.slice(0, 6)}`, order: 1, parentId, subjectId: randomUUID() };
}

const unitId = randomUUID();
const subjectId = randomUUID();
const unit = topic(unitId, null);
const resource = topic(randomUUID(), unitId);

console.log('--- §32.1 Unidad -> lista de Recursos ---');
{
  const params = unitResourceListParams(subjectId, unit, 'Matemática M1');
  check('pathname params llevan unitId = id de la Unidad', params.unitId === unit.id);
  check('llevan subjectId', params.subjectId === subjectId);
  check('llevan unitName', params.unitName === unit.name);
}

console.log('--- §32.2 Recurso -> flujo recurso/ejercicio con el id del RECURSO ---');
{
  const r1 = resourceFlowNav(subjectId, resource, 'resource', 'Matemática M1', { id: unit.id, name: unit.name });
  check('entry "resource" -> pantalla recurso', r1.screen === 'recurso');
  check('topicId === id del RECURSO hijo', r1.params.topicId === resource.id);
  check('topicId NUNCA es el id de la Unidad', r1.params.topicId !== unit.id);
  check('el id de la Unidad viaja aparte en unitId', r1.params.unitId === unit.id);

  const r2 = resourceFlowNav(subjectId, resource, 'exercise', 'Matemática M1', { id: unit.id, name: unit.name });
  check('entry "exercise" -> pantalla ejercicio', r2.screen === 'ejercicio');
  check('topicId sigue siendo el del RECURSO en ejercicio', r2.params.topicId === resource.id);

  const r3 = resourceFlowNav(subjectId, resource, 'completed', 'Matemática M1', { id: unit.id, name: unit.name });
  check('entry "completed" -> pantalla ejercicio (muestra "Unidad completada")', r3.screen === 'ejercicio');

  const r4 = resourceFlowNav(subjectId, resource, 'resource', 'Matemática M1', undefined);
  check('sin unidad (entrada directa desde Inicio) -> unitId vacío, no crashea', r4.params.unitId === '');
}

console.log('--- §33 Agregación de progreso de Unidad ---');
{
  const S: Record<string, TopicProgressStatus> = { N: 'NOT_STARTED', I: 'IN_PROGRESS', C: 'COMPLETED' };
  // Caso A: todos NOT_STARTED -> Unidad NOT_STARTED
  check('A: [N,N,N] -> NOT_STARTED', aggregateUnitProgressStatus([S.N, S.N, S.N]) === 'NOT_STARTED');
  // Caso B: uno empezado -> IN_PROGRESS
  check('B: [I,N,N] -> IN_PROGRESS', aggregateUnitProgressStatus([S.I, S.N, S.N]) === 'IN_PROGRESS');
  // Caso C: algunos completados, algunos sin empezar -> IN_PROGRESS
  check('C: [C,C,N] -> IN_PROGRESS', aggregateUnitProgressStatus([S.C, S.C, S.N]) === 'IN_PROGRESS');
  // Caso D: todos completados -> COMPLETED
  check('D: [C,C,C] -> COMPLETED', aggregateUnitProgressStatus([S.C, S.C, S.C]) === 'COMPLETED');
  // Bordes
  check('un solo hijo COMPLETED -> COMPLETED', aggregateUnitProgressStatus([S.C]) === 'COMPLETED');
  check('sin hijos conocidos -> NOT_STARTED (defensivo)', aggregateUnitProgressStatus([]) === 'NOT_STARTED');
  check('[C,I] -> IN_PROGRESS', aggregateUnitProgressStatus([S.C, S.I]) === 'IN_PROGRESS');
}

console.log('');
if (failures > 0) {
  console.error(`${failures} verificación(es) fallaron.`);
  process.exit(1);
}
console.log('STUDY CONTENT MOBILE REACHABILITY -- navegación y agregación de progreso: todas las verificaciones pasaron.');
