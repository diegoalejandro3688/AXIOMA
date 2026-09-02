import { Injectable } from '@nestjs/common';
import { isFreeUnitPosition } from '@axioma/contracts';
import { CurriculumTopicRepository } from './curriculum-topic.repository';

/**
 * Clasificación de acceso de un `curriculum_topic` frente a PREMIUM V1
 * (Capa 1, C1.3). ESTRUCTURAL: no conoce el `tier` de ninguna cuenta.
 *
 *  - `UNKNOWN_TOPIC`  el id no corresponde a ningún tema -- la policy NO
 *                     decide acceso; el 404 lo produce el `getTopicOrThrow`
 *                     del servicio (guardrail 1).
 *  - `FREE_UNIT`      el tema cuelga de una de las primeras
 *                     `FREE_UNITS_PER_SUBJECT` unidades canónicas de su
 *                     materia (por POSICIÓN en el orden canónico real).
 *  - `PREMIUM_UNIT`   el tema cuelga de una unidad canónica en posición ≥ 2.
 *  - `NON_CANONICAL`  la unidad raíz del tema no está en el catálogo canónico
 *                     de la materia (raíz legacy del seed, etc.). Se PERMITE
 *                     el acceso (decisión v2); el gate `verify:premium-content-access-gate`
 *                     demuestra por invariante de BD que ningún contenido
 *                     premium es alcanzable por esta vía.
 */
export type TopicAccessClass = 'FREE_UNIT' | 'PREMIUM_UNIT' | 'NON_CANONICAL' | 'UNKNOWN_TOPIC';

@Injectable()
export class PremiumContentPolicy {
  constructor(private readonly topicRepo: CurriculumTopicRepository) {}

  async classifyTopic(topicId: string): Promise<TopicAccessClass> {
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) return 'UNKNOWN_TOPIC';

    // Árbol canónico de 2 niveles: Unidad (raíz) -> Recurso (hijo). Un tema
    // hijo hereda la clasificación de su unidad; una unidad se clasifica a sí
    // misma.
    const rootUnitId = topic.parentId ?? topic.id;

    // MISMA consulta (mismo filtro de legacy, mismo `orderBy: { order: 'asc' }`)
    // que alimenta la pantalla de Unidades -- la posición backend coincide con
    // el índice que mobile numera. Nunca por nombre visible ni por código.
    const units = await this.topicRepo.findCanonicalUnitRootsBySubjectId(topic.subjectId);
    const idx = units.findIndex((unit) => unit.id === rootUnitId);

    if (idx === -1) return 'NON_CANONICAL';
    return isFreeUnitPosition(idx) ? 'FREE_UNIT' : 'PREMIUM_UNIT';
  }
}
