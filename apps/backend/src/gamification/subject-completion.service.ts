import { Injectable } from '@nestjs/common';
import { CurriculumTopicRepository } from '../education/curriculum-topic.repository';
import { CurriculumTopicProgressRepository } from '../progress/curriculum-topic-progress.repository';
import { SubjectRepository } from '../education/subject.repository';

/**
 * STABILIZATION-B6A -- predicado canónico ÚNICO de "materia completa",
 * compuesto EXCLUSIVAMENTE de la semántica de completitud de unidad ya
 * establecida (la MISMA que "Progreso por materia" de Perfil / Erudito /
 * Polímata / avatares históricos B2):
 *
 *   unidad completa   <=> TODOS sus recursos canónicos
 *                         (`findCanonicalResourceChildIds`, hijo con
 *                         `learning_resource_version` PUBLISHED) están
 *                         `curriculum_topic_progress.status = COMPLETED`.
 *   materia completa  <=> TODAS las unidades raíz canónicas V1 de la
 *                         materia (`findCanonicalUnitRootsBySubjectId`)
 *                         están completas.
 *
 * Nunca depende de XP, LP, Desafíos, Premium, cosméticos equipados,
 * TEMA_COMPLETADO ni de una completitud aislada. Lectura pura -- ninguna
 * escritura, ninguna evaluación de elegibilidad de recompensa aquí.
 */
@Injectable()
export class SubjectCompletionService {
  constructor(
    private readonly curriculumTopicRepo: CurriculumTopicRepository,
    private readonly curriculumTopicProgressRepo: CurriculumTopicProgressRepository,
    private readonly subjectRepo: SubjectRepository,
  ) {}

  async isSubjectComplete(accountId: string, subjectId: string): Promise<boolean> {
    const units = await this.curriculumTopicRepo.findCanonicalUnitRootsBySubjectId(subjectId);
    if (units.length === 0) return false;

    for (const unit of units) {
      const childIds = await this.curriculumTopicRepo.findCanonicalResourceChildIds(unit.id);
      if (childIds.length === 0) return false;
      const progressRows = await this.curriculumTopicProgressRepo.findManyByAccountAndTopicIds(accountId, childIds);
      const completedCount = progressRows.filter((row) => row.status === 'COMPLETED').length;
      if (completedCount < childIds.length) return false;
    }
    return true;
  }

  /** Igual que `isSubjectComplete` pero resuelve la materia por `subject_key` canónico. Devuelve `false` si la materia no existe (nunca lanza). */
  async isSubjectCompleteByKey(accountId: string, subjectKey: string): Promise<boolean> {
    const subject = await this.subjectRepo.findByKey(subjectKey);
    if (!subject) return false;
    return this.isSubjectComplete(accountId, subject.id);
  }
}
