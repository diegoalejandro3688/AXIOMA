import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CurriculumTopicRepository } from './curriculum-topic.repository';
import { SubjectRepository } from './subject.repository';
import { LearningResourceRepository } from './learning-resource.repository';
import { LearningResourceVersionRepository } from './learning-resource-version.repository';
import { QuestionRepository } from './question.repository';
import { QuestionVersionRepository } from './question-version.repository';
import { AnswerOptionRepository } from './answer-option.repository';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';

@Module({
  imports: [AuthModule],
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
  ],
  exports: [
    CurriculumTopicRepository,
    SubjectRepository,
    LearningResourceRepository,
    LearningResourceVersionRepository,
    QuestionRepository,
    QuestionVersionRepository,
    AnswerOptionRepository,
  ],
})
export class EducationModule {}
