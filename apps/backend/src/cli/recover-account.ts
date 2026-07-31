import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrivacyService } from '../privacy/privacy.service';

/**
 * Herramienta interna de operaciones (Fase 0, ver ADR-0005) -- NO es un
 * endpoint HTTP, deliberadamente. Recuperar una cuenta en DELETION_PENDING
 * dentro del plazo de 30 días requiere, por ahora, que alguien del equipo
 * ejecute esto directamente (acceso al servidor/infraestructura), hasta que
 * exista un flujo real de prueba de titularidad (enlace, código,
 * reautenticación) del lado del producto.
 *
 * Uso:
 *   node dist/cli/recover-account.js <accountId>
 *
 * Se ejecuta contra el binario ya compilado (node, no tsx) para que la
 * inyección de dependencias de Nest funcione -- ver ADR-0004/0005 sobre por
 * qué tsx/esbuild rompe emitDecoratorMetadata.
 */
async function main() {
  const accountId = process.argv[2];
  if (!accountId) {
    console.error('Uso: node dist/cli/recover-account.js <accountId>');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const privacyService = app.get(PrivacyService);
    await privacyService.cancelDeletion(accountId);
    console.log(`Cuenta ${accountId} recuperada correctamente.`);
  } catch (error) {
    console.error(`No se pudo recuperar la cuenta ${accountId}:`, error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main();
