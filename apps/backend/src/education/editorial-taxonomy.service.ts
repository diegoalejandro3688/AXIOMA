import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import { EditorialTaxonomyRepository } from './editorial-taxonomy.repository';
import type { CurriculumTopic, Subject } from '../generated/prisma/client';
import type { EditorialResolveCurriculumTopicRequest, EditorialResolveSubjectRequest } from '@axioma/contracts';

/**
 * CONTENT-4.2A -- resolución/creación IDEMPOTENTE de taxonomía editorial
 * (`Subject`, `CurriculumTopic`). Cierra la dependencia bloqueante que
 * detectó la auditoría de CONTENT-4.2: los payloads de
 * `EditorialAuthoringService` (T1) exigen `primarySubjectId`/
 * `curriculumTopicId` como UUIDs YA EXISTENTES, y hasta este incremento la
 * única forma de crearlos era `prisma/seed.ts` (Prisma directo).
 *
 * Semántica por operación, SIEMPRE una de tres (nunca un `upsert` ciego que
 * pueda ocultar una contradicción):
 *   - CREATED: no existía por clave estable -> se crea.
 *   - NO-OP: existía y coincide en TODOS los campos estructurales -> se
 *     devuelve la fila existente, sin escribir nada.
 *   - CONFLICT (409): existía la misma clave pero con algún campo
 *     estructural distinto -> se rechaza explícitamente. Nunca se
 *     sobrescribe, nunca se reparenta, nunca se mueve de materia.
 *
 * `CurriculumTopic.subjectId` inmutable una vez fijado y "hijo no puede
 * pertenecer a otra materia que su padre" ya los aplica PostgreSQL
 * (`trg_curriculum_topic_subject_consistency`, migración
 * `20260801205203_education_foundation_expand`) -- este servicio los
 * comprueba ANTES, para dar un error de dominio legible; la base sigue
 * siendo la autoridad final (mismo criterio que `EditorialAuthoringService`).
 * `parent_id` NO tiene trigger de inmutabilidad propio en Postgres -- la
 * prohibición de reparentar la aplica este servicio (comparación
 * estructural completa antes de decidir NO-OP vs. CONFLICT).
 *
 * SIN `AdminAction`: el enum `AdminActionObjectType` (`QUESTION_VERSION` |
 * `LEARNING_RESOURCE_VERSION` | `ANSWER_OPTION`) y `AdminActionType`
 * (T1..T8, atado a `EditorialStatus`) están cerrados en el schema de
 * Prisma, y `Subject`/`CurriculumTopic` no tienen `editorialStatus` -- no
 * son entidades versionadas. Integrar un audit trail real exigiría ampliar
 * esos enums (migración), prohibida explícitamente en CONTENT-4.2A. Inventar
 * un segundo sistema de auditoría también está prohibido. Documentado como
 * deuda conocida, no como omisión silenciosa -- ver entrega del incremento.
 */
export interface ResolvedSubject {
  subject: Subject;
  created: boolean;
}

export interface ResolvedCurriculumTopic {
  topic: CurriculumTopic;
  created: boolean;
}

@Injectable()
export class EditorialTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: EditorialTaxonomyRepository,
  ) {}

  async resolveOrCreateSubject(input: EditorialResolveSubjectRequest): Promise<ResolvedSubject> {
    const existing = await this.repo.findSubjectByKey(input.subjectKey);
    if (!existing) {
      const subject = await this.prisma.$transaction((tx) =>
        this.repo.createSubject(tx, {
          subjectKey: input.subjectKey,
          name: input.name,
          shortName: input.shortName,
          displayOrder: input.displayOrder,
        }),
      );
      return { subject, created: true };
    }

    const structuralMismatch =
      existing.name !== input.name || existing.shortName !== input.shortName || existing.displayOrder !== input.displayOrder;
    if (structuralMismatch) {
      throw new ConflictException(
        `Ya existe un Subject con subjectKey "${input.subjectKey}" pero con atributos estructurales distintos ` +
          `(existente: name="${existing.name}", shortName="${existing.shortName}", displayOrder=${existing.displayOrder}; ` +
          `solicitado: name="${input.name}", shortName="${input.shortName}", displayOrder=${input.displayOrder}). ` +
          'No se sobrescribe -- corrija la solicitud o el subjectKey.',
      );
    }
    return { subject: existing, created: false };
  }

  async resolveOrCreateCurriculumTopic(input: EditorialResolveCurriculumTopicRequest): Promise<ResolvedCurriculumTopic> {
    const requestedParentId = input.parentId ?? null;
    const existing = await this.repo.findTopicByCode(input.code);

    if (!existing) {
      await this.assertSubjectExists(input.subjectId);
      if (requestedParentId) await this.assertParentBelongsToSubject(requestedParentId, input.subjectId);

      const topic = await this.prisma.$transaction((tx) =>
        this.repo.createTopic(tx, {
          code: input.code,
          name: input.name,
          order: input.order,
          subjectId: input.subjectId,
          parentId: requestedParentId,
        }),
      );
      return { topic, created: true };
    }

    const structuralMismatch =
      existing.subjectId !== input.subjectId ||
      existing.parentId !== requestedParentId ||
      existing.name !== input.name ||
      existing.order !== input.order;
    if (structuralMismatch) {
      throw new ConflictException(
        `Ya existe un CurriculumTopic con code "${input.code}" pero con atributos estructurales distintos ` +
          `(existente: subjectId=${existing.subjectId}, parentId=${existing.parentId ?? 'null'}, name="${existing.name}", order=${existing.order}; ` +
          `solicitado: subjectId=${input.subjectId}, parentId=${requestedParentId ?? 'null'}, name="${input.name}", order=${input.order}). ` +
          'No se reparenta ni se mueve de materia -- corrija la solicitud o el code.',
      );
    }
    return { topic: existing, created: false };
  }

  private async assertSubjectExists(subjectId: string): Promise<void> {
    const subject = await this.repo.findSubjectById(subjectId);
    if (!subject) throw new NotFoundException(`El Subject "${subjectId}" no existe.`);
  }

  private async assertParentBelongsToSubject(parentId: string, subjectId: string): Promise<void> {
    const parent = await this.repo.findTopicById(parentId);
    if (!parent) throw new NotFoundException(`El CurriculumTopic padre "${parentId}" no existe.`);
    if (parent.subjectId !== subjectId) {
      throw new ConflictException(
        `El CurriculumTopic padre "${parentId}" pertenece a la materia ${parent.subjectId}, distinta de la solicitada (${subjectId}).`,
      );
    }
  }
}
