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
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
