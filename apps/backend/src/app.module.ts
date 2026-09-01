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
    // Rate limit GLOBAL por IP (`@nestjs/throttler`, tracker por defecto = IP).
    // El endpoint de auth mantiene su propio `@Throttle` estricto (10/60 s).
    //
    // `limit` alineado con la navegación REAL aprobada (hotfix Estudio/429,
    // 2026-09-01): la pantalla Inicio dispara ~32 solicitudes por carga --
    // 4 planas + ~28 de `pickContinueTarget` (Hotfix 2.1: inspecciona TODAS
    // las materias -> 1 `listSubjects` + por materia `listRootTopics` +
    // `listChildTopics` por unidad (17 en total) + `getTopicsProgressBatch`).
    // Ese refresco se repite en cada foco de la tab (Incremento 2). Con el
    // límite anterior (100/60 s) tres visitas normales a Inicio en un minuto
    // ya lo agotaban y rompían la siguiente navegación (Estudio -> Unidades
    // devolvía 429). 300/60 s cubre navegación intensa real con margen y
    // sigue cortando un loop/abuso de verdad (300 en segundos). NO subir
    // para tapar un fan-out duplicado del cliente -- aquí las solicitudes son
    // legítimas y la amplificación está congelada por decisión de producto.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
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
