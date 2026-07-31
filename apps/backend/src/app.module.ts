import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './platform/health/health.module';
import { PrismaModule } from './platform/prisma/prisma.module';
import { EducationModule } from './education/education.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    EducationModule,
    HealthModule,
  ],
})
export class AppModule {}
