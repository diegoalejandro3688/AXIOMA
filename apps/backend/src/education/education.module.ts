import { Module } from '@nestjs/common';
import { CurriculumTopicRepository } from './curriculum-topic.repository';

@Module({
  providers: [CurriculumTopicRepository],
  exports: [CurriculumTopicRepository],
})
export class EducationModule {}
