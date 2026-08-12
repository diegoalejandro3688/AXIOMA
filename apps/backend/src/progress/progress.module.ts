import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EducationModule } from '../education/education.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { CurriculumTopicProgressRepository } from './curriculum-topic-progress.repository';
import { StudentResponseRepository } from './student-response.repository';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [AuthModule, EducationModule, OutboxModule],
  controllers: [ProgressController],
  providers: [CurriculumTopicProgressRepository, StudentResponseRepository, ProgressService],
  // CurriculumTopicProgressRepository/StudentResponseRepository exportados para lectura cruzada
  // de solo lectura -- mismo criterio que EducationModule (todos sus repos ya se exportan);
  // consumido por AiAcademicContextBuilder (LEF Bloque VI, Incremento 4).
  exports: [ProgressService, CurriculumTopicProgressRepository, StudentResponseRepository],
})
export class ProgressModule {}
