import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './platform/health/health.module';
import { PrismaModule } from './platform/prisma/prisma.module';
import { EducationModule } from './education/education.module';
import { AuthModule } from './auth/auth.module';
import { PrivacyModule } from './privacy/privacy.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DiagnosticsModule } from './platform/observability/diagnostics.module';
import { UserModule } from './user/user.module';
import { ProgressModule } from './progress/progress.module';
import { GamificationModule } from './gamification/gamification.module';
import { AiModule } from './ai/ai.module';
import { AdministrationModule } from './administration/administration.module';
import { EditorialModule } from './editorial/editorial.module';
// ENSAYOS-F1 -- dominio EXAMS / Ensayos V1 (ADR-0024).
import { ExamsModule } from './exams/exams.module';
// LEF Bloque VII, Incremento 5 -- Content Coverage Matrix (SOLO LECTURA, §12.5).
import { CoverageMatrixModule } from './editorial/coverage-matrix.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EducationModule,
    AuthModule,
    PrivacyModule,
    AnalyticsModule,
    DiagnosticsModule,
    UserModule,
    ProgressModule,
    GamificationModule,
    AiModule,
    AdministrationModule,
    EditorialModule,
    ExamsModule,
    CoverageMatrixModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
