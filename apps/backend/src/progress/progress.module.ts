import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EducationModule } from '../education/education.module';
// PREMIUM V1 -- Capa 1 (C1.4): gatea la escritura de progreso sobre temas premium.
import { EntitlementModule } from '../entitlement/entitlement.module';
import { OutboxModule } from '../platform/outbox/outbox.module';
import { CurriculumTopicProgressRepository } from './curriculum-topic-progress.repository';
import { StudentResponseRepository } from './student-response.repository';
// XP-V1B-2 -- persiste "la cuenta X completó el LearningResource canónico Y".
import { LearningResourceProgressRepository } from './learning-resource-progress.repository';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';

@Module({
  imports: [AuthModule, EducationModule, EntitlementModule, OutboxModule],
  controllers: [ProgressController],
  providers: [CurriculumTopicProgressRepository, StudentResponseRepository, LearningResourceProgressRepository, ProgressService],
  // CurriculumTopicProgressRepository/StudentResponseRepository exportados para lectura cruzada
  // de solo lectura -- mismo criterio que EducationModule (todos sus repos ya se exportan);
  // consumido por AiAcademicContextBuilder (LEF Bloque VI, Incremento 4).
  exports: [ProgressService, CurriculumTopicProgressRepository, StudentResponseRepository],
})
export class ProgressModule {}
