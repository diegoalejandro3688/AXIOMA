import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './platform/observability/http-exception.filter';
import { correlationIdMiddleware } from './platform/observability/correlation-id.middleware';
import { StructuredLogger } from './platform/observability/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: new StructuredLogger() });
  // Necesario desde ADR-0013: el cliente mobile en target Web (Expo Web,
  // usado para verificación -- ver ADR-0009) corre en un origen distinto al
  // backend. Sin `allowedHeaders` explícito, `cors` refleja los headers que
  // el propio preflight del navegador solicita (incluye `x-session-id`,
  // `authorization`) -- no hace falta enumerarlos. Nativo (iOS/Android) no
  // tiene restricción CORS; esto solo afecta al target Web.
  app.enableCors();
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
