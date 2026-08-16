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
  ],
})
export class EducationModule {}
