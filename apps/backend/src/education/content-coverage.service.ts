import { Injectable } from '@nestjs/common';
import type { ContentCoverageMatrixResponse, ContentCoverageCounts } from '@axioma/contracts';
import { SubjectRepository } from './subject.repository';
import { ContentCoverageRepository, type CoverageCountRow, type CoverageFreshnessRow } from './content-coverage.repository';

/** Cuatro casillas en cero -- el estado de un tema sin ninguna versión. */
const emptyCounts = (): ContentCoverageCounts => ({ published: 0, draft: 0, inReview: 0, approved: 0 });

const addCounts = (target: ContentCoverageCounts, source: ContentCoverageCounts): void => {
  target.published += source.published;
  target.draft += source.draft;
  target.inReview += source.inReview;
  target.approved += source.approved;
};

/**
 * Content Coverage Matrix -- LEF Bloque VII, Incremento 5.
 * Ver LEF-BLOCK-VII-DEFINITION.md §12.5 (frontera), §13.5 (criterios),
 * decisión E (§4) e invariante 14 (§7.1).
 *
 * ---------------------------------------------------------------------------
 * QUÉ ES, EXACTAMENTE
 * ---------------------------------------------------------------------------
 * Una AGREGACIÓN EN LECTURA sobre entidades que ya existen. No crea ninguna
 * entidad, no materializa ninguna tabla, no cachea nada y no transiciona nada.
 * Decisión E la admitió en el bloque "como capacidad de SOLO LECTURA
 * (consulta agregada sobre entidades existentes)".
 *
 * ---------------------------------------------------------------------------
 * REGLAS DURAS -- invariante 14 y §11.4
 * ---------------------------------------------------------------------------
 *  - CERO escrituras. Este servicio no inyecta ningún repositorio con métodos
 *    de escritura y no invoca ninguno: solo `SubjectRepository` (que solo lee)
 *    y `ContentCoverageRepository` (que solo agrega).
 *  - NO expone `AnswerOption.isCorrect` -- ni siquiera lo lee: ninguna
 *    consulta de este incremento toca `answer_option` (§13.5 punto 2).
 *  - NO expone contenido académico: ni `stem_content`, ni
 *    `explanation_content`, ni `content_blocks`, ni `title`. Salen conteos y
 *    referencias de taxonomía.
 *  - NO expone NINGÚN dato de estudiante: no importa nada de PROGRESS,
 *    GAMIFICATION, PRIVACY, AI ni `Account` (§13.5 punto 3, §11.4).
 *  - NO invoca `EditorialTransitionService` ni `EditorialAuthoringService`:
 *    leer la cobertura no puede tener, ni por accidente, un efecto editorial.
 *
 * ---------------------------------------------------------------------------
 * ALCANCE QUE §12.5 DEJA EXPRESAMENTE FUERA
 * ---------------------------------------------------------------------------
 * "no calcula cobertura curricular PAES oficial (la taxonomía de CMS-001 no
 * existe en el esquema, ADR-0012); no incluye errores frecuentes ni prácticas
 * disponibles (no existen como entidades)". La materia y el tema del esquema
 * real son la única taxonomía disponible, y es sobre ella que se agrega.
 */
@Injectable()
export class ContentCoverageService {
  constructor(
    private readonly subjects: SubjectRepository,
    private readonly coverage: ContentCoverageRepository,
  ) {}

  /**
   * Construye la matriz completa con CINCO consultas de agregación fijas,
   * independientes del número de materias y de temas (sin N+1).
   */
  async buildMatrix(): Promise<ContentCoverageMatrixResponse> {
    const [subjects, topics, questionCounts, resourceCounts, questionFresh, resourceFresh] = await Promise.all([
      // Se reutiliza el MISMO predicado de materia que el catálogo del
      // estudiante (`findAllActive`, `status = 'ACTIVE'`), en vez de inventar
      // uno propio para la superficie administrativa. Hoy la elección no tiene
      // efecto observable: ninguna ruta del sistema produce
      // `subject.status = 'RETIRED'`.
      this.subjects.findAllActive(),
      this.coverage.findAllTopics(),
      this.coverage.countQuestionVersionsByTopicAndStatus(),
      this.coverage.countLearningResourceVersionsByTopicAndStatus(),
      this.coverage.lastQuestionVersionUpdateByTopic(),
      this.coverage.lastLearningResourceVersionUpdateByTopic(),
    ]);

    const questionsByTopic = indexCounts(questionCounts);
    const resourcesByTopic = indexCounts(resourceCounts);
    const freshnessByTopic = indexFreshness(questionFresh, resourceFresh);

    const topicsBySubject = new Map<string, typeof topics>();
    for (const topic of topics) {
      const bucket = topicsBySubject.get(topic.subjectId);
      if (bucket) bucket.push(topic);
      else topicsBySubject.set(topic.subjectId, [topic]);
    }

    return {
      generatedAt: new Date().toISOString(),
      subjects: subjects.map((subject) => {
        const subjectTopics = topicsBySubject.get(subject.id) ?? [];
        const questionTotals = emptyCounts();
        const resourceTotals = emptyCounts();

        const rows = subjectTopics.map((topic) => {
          const questions = questionsByTopic.get(topic.id) ?? emptyCounts();
          const learningResources = resourcesByTopic.get(topic.id) ?? emptyCounts();
          addCounts(questionTotals, questions);
          addCounts(resourceTotals, learningResources);
          const lastUpdatedAt = freshnessByTopic.get(topic.id) ?? null;
          return {
            curriculumTopicId: topic.id,
            code: topic.code,
            name: topic.name,
            order: topic.order,
            parentId: topic.parentId,
            questions,
            learningResources,
            lastUpdatedAt: lastUpdatedAt ? lastUpdatedAt.toISOString() : null,
          };
        });

        return {
          subjectId: subject.id,
          subjectKey: subject.subjectKey,
          name: subject.name,
          shortName: subject.shortName,
          displayOrder: subject.displayOrder,
          questions: questionTotals,
          learningResources: resourceTotals,
          topics: rows,
        };
      }),
    };
  }
}

/**
 * (tema, estado) -> conteo, colapsado a las cuatro casillas del contrato.
 * `DEPRECATED`/`ARCHIVED` no llegan aquí: el repositorio ya los excluye de la
 * consulta. El `default` existe como defensa en profundidad, no como camino.
 */
function indexCounts(rows: CoverageCountRow[]): Map<string, ContentCoverageCounts> {
  const byTopic = new Map<string, ContentCoverageCounts>();
  for (const row of rows) {
    let counts = byTopic.get(row.curriculumTopicId);
    if (!counts) {
      counts = emptyCounts();
      byTopic.set(row.curriculumTopicId, counts);
    }
    switch (row.editorialStatus) {
      case 'PUBLISHED':
        counts.published += row.count;
        break;
      case 'DRAFT':
        counts.draft += row.count;
        break;
      case 'IN_REVIEW':
        counts.inReview += row.count;
        break;
      case 'APPROVED':
        counts.approved += row.count;
        break;
      default:
        break;
    }
  }
  return byTopic;
}

/** El `updated_at` más reciente entre AMBAS familias de versiones, por tema. */
function indexFreshness(...sources: CoverageFreshnessRow[][]): Map<string, Date> {
  const byTopic = new Map<string, Date>();
  for (const rows of sources) {
    for (const row of rows) {
      const current = byTopic.get(row.curriculumTopicId);
      if (!current || row.lastUpdatedAt > current) byTopic.set(row.curriculumTopicId, row.lastUpdatedAt);
    }
  }
  return byTopic;
}
