import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './platform/observability/http-exception.filter';
import { correlationIdMiddleware } from './platform/observability/correlation-id.middleware';
import { StructuredLogger } from './platform/observability/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new StructuredLogger() });
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
