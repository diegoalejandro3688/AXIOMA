import { createHash, randomUUID } from 'node:crypto';
import { BadRequestException, Controller, Logger, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InternalOpsGuard } from '../internal-ops/internal-ops.guard';
import { ObjectStorageService } from '../object-storage/object-storage.service';
import { ObjectValidationError, resolveUploadLimits, validateObjectUpload } from '../object-storage/file-validation';
import { buildPngFixture } from '../object-storage/test-fixtures';

type ObjectStorageScenario = 'valid' | 'oversized-bytes' | 'invalid-mime' | 'bad-magic-bytes' | 'oversized-dimensions';

function buildScenarioFixture(
  scenario: ObjectStorageScenario,
  limits: { maxSizeBytes: number; maxWidthPx: number; maxHeightPx: number },
): { body: Buffer; contentType: string } {
  switch (scenario) {
    case 'valid':
      return { body: buildPngFixture({ width: 2, height: 2 }), contentType: 'image/png' };
    case 'oversized-bytes': {
      const base = buildPngFixture({ width: 2, height: 2 });
      const filler = Buffer.alloc(limits.maxSizeBytes, 0x00);
      return { body: Buffer.concat([base, filler]), contentType: 'image/png' };
    }
    case 'invalid-mime':
      return { body: buildPngFixture({ width: 2, height: 2 }), contentType: 'application/pdf' };
    case 'bad-magic-bytes': {
      const body = buildPngFixture({ width: 2, height: 2 });
      body[0] = 0x00; // corrompe la firma PNG deliberadamente
      return { body, contentType: 'image/png' };
    }
    case 'oversized-dimensions':
      return {
        body: buildPngFixture({ width: limits.maxWidthPx + 1000, height: limits.maxHeightPx + 1000, realPixelData: false }),
        contentType: 'image/png',
      };
    default:
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: `Escenario desconocido: "${scenario}".` });
  }
}

/**
 * Endpoints de diagnóstico para verificar, con evidencia real (no solo en el
 * papel), que el logging estructurado y el filtro global de excepciones
 * funcionan como se documenta en ADR-0007 -- usados por
 * scripts/verify-observability-gate.ts. Protegidos por InternalOpsGuard Y,
 * además, rechazados en producción incluso con la clave correcta (mismo
 * criterio que AUTH_IDENTITY_PROVIDER=stub en auth.module.ts): esto nunca
 * debe ser alcanzable con tráfico real.
 */
@Controller('platform/_internal/diagnostics')
export class DiagnosticsController {
  private readonly logger = new Logger(DiagnosticsController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  private rejectInProduction(): void {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }
  }

  /** Lanza una excepción no manejada deliberada -- para probar el camino 500 genérico. */
  @Post('throw')
  @UseGuards(InternalOpsGuard)
  throwUnhandled(): never {
    this.rejectInProduction();
    throw new Error('Error de diagnóstico deliberado (ADR-0007) -- nunca debería verse en producción.');
  }

  /**
   * Loguea una carga deliberadamente "difícil" (Error, BigInt, referencia
   * circular, claves sensibles) -- para probar que la serialización nunca
   * lanza y que la sanitización redacta secretos conocidos.
   */
  @Post('log-tricky')
  @UseGuards(InternalOpsGuard)
  logTricky(): { ok: true } {
    this.rejectInProduction();

    const circular: Record<string, unknown> = { name: 'circular' };
    circular.self = circular;

    this.logger.log('diagnóstico: carga difícil de serializar', {
      circular,
      bigNumber: 9_007_199_254_740_993n,
      errorSample: new Error('error de muestra'),
      authorization: 'Bearer secreto-no-debe-aparecer',
      idToken: 'token.no.debe.aparecer',
      password: 'hunter2-no-debe-aparecer',
      internalOpsKey: 'ops-key-no-debe-aparecer',
      analyticsActorSecret: 'actor-secret-no-debe-aparecer',
      nested: { cookie: 'session=no-debe-aparecer' },
    });

    return { ok: true };
  }

  /**
   * Prueba de extremo a extremo del almacenamiento de objetos --
   * completamente autocontenida (genera su propio archivo de prueba en
   * memoria, nunca depende de un archivo externo, y nunca devuelve ni
   * loguea la URL firmada -- se usa internamente y se descarta) -- ver
   * ADR-0010. `scenario` ejercita tanto el camino válido como cada
   * rechazo de validación con el mismo mecanismo.
   */
  @Post('object-storage-roundtrip')
  @UseGuards(InternalOpsGuard)
  async objectStorageRoundtrip(@Query('scenario') scenarioParam = 'valid') {
    this.rejectInProduction();

    const scenario = scenarioParam as ObjectStorageScenario;
    const limits = resolveUploadLimits(this.config);
    const { body, contentType } = buildScenarioFixture(scenario, limits);

    let validated;
    try {
      validated = validateObjectUpload(body, contentType, limits);
    } catch (error) {
      if (error instanceof ObjectValidationError) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: error.message });
      }
      throw error;
    }

    // Si la validación pasó, solo el escenario 'valid' debería llegar
    // aquí -- los demás ya lanzaron BadRequestException arriba.
    const key = `diagnostics/${randomUUID()}.png`;
    await this.objectStorage.putObject({ key, body, contentType: validated.contentType });

    try {
      const shortLivedUrl = await this.objectStorage.getSignedReadUrl(key, 2);
      const firstFetch = await fetch(shortLivedUrl);
      const downloaded = Buffer.from(await firstFetch.arrayBuffer());
      const downloadedHash = createHash('sha256').update(downloaded).digest('hex');

      await new Promise((resolve) => setTimeout(resolve, 3000));
      const secondFetch = await fetch(shortLivedUrl);

      return {
        validationPassed: true,
        sha256: validated.sha256,
        sizeBytes: validated.sizeBytes,
        width: validated.width,
        height: validated.height,
        downloadMatchesHash: firstFetch.ok && downloadedHash === validated.sha256,
        urlExpiredAfterTtl: !secondFetch.ok,
      };
    } finally {
      await this.objectStorage.deleteObject(key);
    }
  }
}
