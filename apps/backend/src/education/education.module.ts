import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdministrationModule } from '../administration/administration.module';
import { ObjectStorageModule } from '../platform/object-storage/object-storage.module';
import { CurriculumTopicRepository } from './curriculum-topic.repository';
import { SubjectRepository } from './subject.repository';
import { LearningResourceRepository } from './learning-resource.repository';
import { LearningResourceVersionRepository } from './learning-resource-version.repository';
import { QuestionRepository } from './question.repository';
import { QuestionVersionRepository } from './question-version.repository';
import { AnswerOptionRepository } from './answer-option.repository';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { EditorialVersionRepository } from './editorial-version.repository';
import { EditorialTransitionService } from './editorial-transition.service';
// LEF Bloque VII, Incremento 4 -- autoría (T1 crear borrador, T2 editar en DRAFT).
import { EditorialAuthoringRepository } from './editorial-authoring.repository';
import { EditorialAuthoringService } from './editorial-authoring.service';
// CONTENT-4.2B -- lectura administrativa completa por clave (isCorrect incluido).
import { EditorialReadRepository } from './editorial-read.repository';
// CONTENT-4.2A -- resolución/creación idempotente de taxonomía (Subject/CurriculumTopic).
import { EditorialTaxonomyRepository } from './editorial-taxonomy.repository';
import { EditorialTaxonomyService } from './editorial-taxonomy.service';
// LEF Bloque VII, Incremento 5 -- Content Coverage Matrix (SOLO LECTURA).
import { ContentCoverageRepository } from './content-coverage.repository';
import { ContentCoverageService } from './content-coverage.service';

@Module({
  // `AdministrationModule` (LEF VII, Incremento 3) aporta el registro de
  // acción administrativa y la activación de la excepción de CMS-018, que la
  // máquina de estados escribe DENTRO de su propia transacción (§9.3).
  //
  // La dependencia va EDUCATION -> ADMINISTRATION y nunca al revés:
  // ADMINISTRATION no importa nada de EDUCATION, de modo que no hay ciclo. El
  // controller HTTP editorial vive en su propio módulo (`editorial/`)
  // precisamente para no crear uno.
  imports: [AuthModule, ObjectStorageModule, AdministrationModule],
  controllers: [EducationController],
  providers: [
    CurriculumTopicRepository,
    SubjectRepository,
    LearningResourceRepository,
    LearningResourceVersionRepository,
    QuestionRepository,
    QuestionVersionRepository,
    AnswerOptionRepository,
    EducationService,
    EditorialVersionRepository,
    EditorialTransitionService,
    EditorialAuthoringRepository,
    EditorialAuthoringService,
    EditorialReadRepository,
    EditorialTaxonomyRepository,
    EditorialTaxonomyService,
    ContentCoverageRepository,
    ContentCoverageService,
  ],
  exports: [
    CurriculumTopicRepository,
    SubjectRepository,
    LearningResourceRepository,
    LearningResourceVersionRepository,
    QuestionRepository,
    QuestionVersionRepository,
    AnswerOptionRepository,
    // Autoridad de publicación (invariante 15, MC §6.24 "Solo Education
    // publica"): la capa administrativa SOLICITA a través de este servicio y
    // nunca escribe en los repositorios de EDUCATION por su cuenta.
    EditorialTransitionService,
    // Incremento 4: misma razón (invariante 15) -- la capa administrativa
    // SOLICITA la creación/edición a través de este servicio de EDUCATION y
    // nunca escribe en sus repositorios por su cuenta.
    EditorialAuthoringService,
    // CONTENT-4.2A: mismo criterio -- la capa administrativa SOLICITA la
    // resolución/creación de taxonomía a través de este servicio y nunca
    // escribe en `subject`/`curriculum_topic` por su cuenta.
    EditorialTaxonomyService,
    // Incremento 5: misma razón (MC §6.17, "Administration no deberá escribir
    // directamente en tablas autoritativas"; aquí ni siquiera LEE por su
    // cuenta). La fachada HTTP de la matriz consume este servicio y NO el
    // repositorio -- `ContentCoverageRepository` NO se exporta.
    ContentCoverageService,
  ],
})
export class EducationModule {}
