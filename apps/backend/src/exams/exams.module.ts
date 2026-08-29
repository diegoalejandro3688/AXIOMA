import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdministrationModule } from '../administration/administration.module';
import { EducationModule } from '../education/education.module';
import { ObjectStorageModule } from '../platform/object-storage/object-storage.module';
import { ExamRepository } from './exam.repository';
import { ExamQuestionRepository } from './exam-question.repository';
import { ExamPassageRepository } from './exam-passage.repository';
import { ExamAttemptRepository } from './exam-attempt.repository';
import { ExamAttemptAnswerRepository } from './exam-attempt-answer.repository';
import { ExamScoringService } from './exam-scoring.service';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { ExamAdminController } from './exam-admin.controller';

/**
 * Dominio EXAMS / Ensayos V1 -- ENSAYOS-F1. Ver docs/adr/0024-ensayos-foundation.md.
 *
 * Importa `EducationModule` SOLO para `AnswerOptionRepository` (resolución
 * server-side de `isCorrect`) -- mismo criterio que `GamificationModule`
 * (Pregunta rápida) y `ProgressModule`. NO importa `OutboxModule` a propósito:
 * un intento de ensayo NUNCA publica un evento (aislamiento total de
 * gamificación, ADR-0024). NO importa `ProgressModule` ni referencia
 * `StudentResponse`/`CurriculumTopicProgress`.
 *
 * `ObjectStorageModule` -- resolver bloques `image` de `stemContent`/
 * `explanationContent` a URL firmada, mismo criterio que
 * `QuickQuestionController`.
 *
 * F1 NO expone escritura de definición de ensayo por HTTP -- eso llega en
 * ENSAYOS-M1-A/B. `ExamService` exporta los helpers de creación/vínculo para
 * que ese importer futuro y el gate compartan un único camino de escritura.
 */
@Module({
  imports: [AuthModule, AdministrationModule, EducationModule, ObjectStorageModule],
  controllers: [ExamController, ExamAdminController],
  providers: [
    ExamRepository,
    ExamQuestionRepository,
    ExamPassageRepository,
    ExamAttemptRepository,
    ExamAttemptAnswerRepository,
    ExamScoringService,
    ExamService,
  ],
  exports: [ExamService],
})
export class ExamsModule {}
