import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EducationModule } from '../education/education.module';
import { CurriculumTopicProgressRepository } from './curriculum-topic-progress.repository';
import { StudentResponseRepository } from './student-response.repository';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [AuthModule, EducationModule],
  controllers: [ProgressController],
  providers: [CurriculumTopicProgressRepository, StudentResponseRepository, ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
