import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  subjectResponseSchema,
  curriculumTopicResponseSchema,
  learningResourceResponseSchema,
  questionResponseSchema,
  resourceContentBlocksSchema,
  explanationContentSchema,
  answerOptionContentSchema,
  practiceQuestionSampleResponseSchema,
  practiceQuestionAnswerResponseSchema,
  type SubjectResponse,
  type CurriculumTopicResponse,
  type LearningResourceResponse,
  type QuestionResponse,
  type ResourceContentBlockResponse,
  type PracticeQuestionSampleResponse,
  type PracticeQuestionAnswerResponse,
} from '@axioma/contracts';
import type { z } from 'zod';
import type { resourceContentBlockSchema } from '@axioma/contracts';
import { ObjectStorageService } from '../platform/object-storage/object-storage.service';
import { SubjectRepository } from './subject.repository';
import { CurriculumTopicRepository } from './curriculum-topic.repository';
import { LearningResourceVersionRepository } from './learning-resource-version.repository';
import { QuestionVersionRepository } from './question-version.repository';
import { AnswerOptionRepository } from './answer-option.repository';
import type { Subject, CurriculumTopic } from '../generated/prisma/client';
import type { LearningResourceVersionWithResource } from './learning-resource-version.repository';
import type { QuestionVersionWithDetails } from './question-version.repository';

type StoredContentBlock = z.infer<typeof resourceContentBlockSchema>;

/** URL de lectura de corta duración -- ver ADR-0010. Suficiente para servir una pantalla; nunca se persiste. */
const IMAGE_SIGNED_URL_TTL_SECONDS = 300;

/**
 * Servicio de lectura del dominio EDUCATION (Bloque I, Vertical Slice M1) --
 * ver ADR-0012 y ADR-0013. Solo sirve contenido `editorialStatus = PUBLISHED`
 * -- nunca borradores. `AnswerOption.isCorrect` nunca sale de este servicio:
 * los esquemas de respuesta de @axioma/contracts no lo declaran, y `.parse()`
 * descarta por defecto cualquier campo no declarado (defensa en profundidad,
 * ver ADR-0012 punto 4).
 *
 * `objectKey` de los bloques `image` tampoco sale nunca de este servicio --
 * se resuelve aquí mismo a una URL firmada vía `ObjectStorageService` (ver
 * ADR-0013, punto 4: "el cliente móvil nunca debe conocer ni manipular
 * claves internas del almacenamiento").
 */
@Injectable()
export class EducationService {
  constructor(
    private readonly subjectRepo: SubjectRepository,
    private readonly topicRepo: CurriculumTopicRepository,
    private readonly resourceVersionRepo: LearningResourceVersionRepository,
    private readonly questionVersionRepo: QuestionVersionRepository,
    private readonly answerOptionRepo: AnswerOptionRepository,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  async listSubjects(): Promise<SubjectResponse[]> {
    const subjects = await this.subjectRepo.findAllActive();
    return subjects.map(toSubjectResponse);
  }

  async listRootTopics(subjectId: string): Promise<CurriculumTopicResponse[]> {
    await this.getSubjectOrThrow(subjectId);
    // STUDY CONTENT MOBILE REACHABILITY -- solo unidades canónicas V1 (raíces
    // con un Recurso hijo publicado). Excluye de forma no destructiva los
    // topics raíz legacy del seed que nunca fueron parte de CONTENT_MANIFEST
    // (M1.NUMEROS.PORCENTAJES, C1.BIOLOGIA.CELULA, L1.LECTURA.INFERENCIA,
    // H1.CHILE.SIGLO20.ISI) -- ver docstring del repo.
    const topics = await this.topicRepo.findCanonicalUnitRootsBySubjectId(subjectId);
    return topics.map(toTopicResponse);
  }

  async listChildTopics(topicId: string): Promise<CurriculumTopicResponse[]> {
    await this.getTopicOrThrow(topicId);
    const topics = await this.topicRepo.findChildren(topicId);
    return topics.map(toTopicResponse);
  }

  async getPublishedResource(topicId: string): Promise<LearningResourceResponse> {
    await this.getTopicOrThrow(topicId);
    const version = await this.resourceVersionRepo.findLatestPublishedByTopicId(topicId);
    if (!version) throw new NotFoundException('No hay ningún recurso publicado para este tema.');
    return this.toResourceResponse(version);
  }

  async listPublishedQuestions(topicId: string): Promise<QuestionResponse[]> {
    await this.getTopicOrThrow(topicId);
    const versions = await this.questionVersionRepo.findPublishedByTopicId(topicId);
    return Promise.all(versions.map((version) => this.toQuestionResponse(version)));
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- STATELESS. Selecciona una pregunta
   * aleatoria elegible de la materia (pool canónico publicado, ver
   * `QuestionVersionRepository.findRandomPracticeQuestionForSubject`),
   * excluyendo las ya vistas por el cliente en la ejecución actual. NO
   * escribe nada: sin `student_response`, sin progreso, sin Outbox, sin XP.
   * `question: null` cuando el `exclude` set ya cubre todo el pool (nunca
   * un 404 por pool agotado).
   */
  async samplePracticeQuestion(
    subjectId: string,
    excludeQuestionVersionIds: string[],
  ): Promise<PracticeQuestionSampleResponse> {
    await this.getSubjectOrThrow(subjectId);
    const version = await this.questionVersionRepo.findRandomPracticeQuestionForSubject(
      subjectId,
      [...new Set(excludeQuestionVersionIds)],
    );
    return practiceQuestionSampleResponseSchema.parse({
      question: version ? await this.toQuestionResponse(version) : null,
    });
  }

  /**
   * ESTUDIO / PRÁCTICA LIBRE V1 -- STATELESS. Valida una respuesta y
   * devuelve SOLO `isCorrect` (server-authoritative). NO crea
   * `student_response`, NO toca `curriculum_topic_progress`, NO completa
   * recurso/unidad, NO emite `student_response_recorded` /
   * `curriculum_topic_completed`, NO publica al Outbox, NO otorga XP/LP, NO
   * avanza desafíos. CERO escritura en base de datos.
   *
   * Rechaza (404/400) si la pregunta no es elegible para práctica libre de
   * ESA materia (no publicada, no canónica, retirada, de otra materia) o si
   * la alternativa no pertenece a la pregunta.
   */
  async answerPracticeQuestion(
    subjectId: string,
    questionVersionId: string,
    answerOptionId: string,
  ): Promise<PracticeQuestionAnswerResponse> {
    await this.getSubjectOrThrow(subjectId);

    const eligible = await this.questionVersionRepo.findEligiblePracticeQuestionById(questionVersionId, subjectId);
    if (!eligible) {
      throw new NotFoundException('La pregunta no está disponible para práctica libre en esta materia.');
    }

    const option = await this.answerOptionRepo.findById(answerOptionId);
    if (!option || option.questionVersionId !== questionVersionId) {
      throw new BadRequestException('La alternativa no pertenece a esta pregunta.');
    }

    return practiceQuestionAnswerResponseSchema.parse({
      questionVersionId,
      answerOptionId,
      isCorrect: option.isCorrect,
    });
  }

  private async getSubjectOrThrow(subjectId: string): Promise<Subject> {
    const subject = await this.subjectRepo.findById(subjectId);
    if (!subject) throw new NotFoundException('Materia no encontrada.');
    return subject;
  }

  private async getTopicOrThrow(topicId: string): Promise<CurriculumTopic> {
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) throw new NotFoundException('Tema no encontrado.');
    return topic;
  }

  /**
   * Bloque por bloque: todo pasa igual salvo `image`, cuyo `objectKey`
   * (interno) se resuelve aquí a `url` (firmada, pública) -- ver ADR-0013.
   */
  private async resolveBlocks(blocks: StoredContentBlock[]): Promise<ResourceContentBlockResponse[]> {
    return Promise.all(
      blocks.map(async (block): Promise<ResourceContentBlockResponse> => {
        if (block.type !== 'image') return block;
        const url = await this.objectStorage.getSignedReadUrl(block.objectKey, IMAGE_SIGNED_URL_TTL_SECONDS);
        return { type: 'image', order: block.order, url, altText: block.altText };
      }),
    );
  }

  private async toResourceResponse(version: LearningResourceVersionWithResource): Promise<LearningResourceResponse> {
    const storedBlocks = resourceContentBlocksSchema.parse(version.contentBlocks);
    return learningResourceResponseSchema.parse({
      id: version.learningResource.id,
      resourceKey: version.learningResource.resourceKey,
      curriculumTopicId: version.curriculumTopicId,
      versionId: version.id,
      title: version.title,
      // Validado con Zod al leer -- Postgres no conoce la forma interna del JSON (ADR-0012, punto 4).
      contentBlocks: await this.resolveBlocks(storedBlocks),
      publishedAt: version.publishedAt?.toISOString(),
    });
  }

  private async toQuestionResponse(version: QuestionVersionWithDetails): Promise<QuestionResponse> {
    const storedStem = resourceContentBlocksSchema.parse(version.stemContent);
    const storedExplanation = explanationContentSchema.parse(version.explanationContent);
    return questionResponseSchema.parse({
      id: version.question.id,
      questionKey: version.question.questionKey,
      curriculumTopicId: version.curriculumTopicId,
      versionId: version.id,
      questionType: version.question.questionType,
      stemContent: await this.resolveBlocks(storedStem),
      explanationContent: await this.resolveBlocks(storedExplanation),
      // `isCorrect` deliberadamente omitido -- ver docstring de la clase.
      answerOptions: version.answerOptions.map((option) => ({
        id: option.id,
        content: answerOptionContentSchema.parse(option.content),
        displayOrder: option.displayOrder,
      })),
      publishedAt: version.publishedAt?.toISOString(),
    });
  }
}

function toSubjectResponse(subject: Subject): SubjectResponse {
  return subjectResponseSchema.parse({
    id: subject.id,
    subjectKey: subject.subjectKey,
    name: subject.name,
    shortName: subject.shortName,
    displayOrder: subject.displayOrder,
  });
}

function toTopicResponse(topic: CurriculumTopic): CurriculumTopicResponse {
  return curriculumTopicResponseSchema.parse({
    id: topic.id,
    code: topic.code,
    name: topic.name,
    order: topic.order,
    parentId: topic.parentId,
    subjectId: topic.subjectId,
  });
}
