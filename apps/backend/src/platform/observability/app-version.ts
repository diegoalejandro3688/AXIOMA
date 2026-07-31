import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Fuente de `appVersion` para logs -- ver ADR-0007. Orden: `APP_VERSION` del
 * entorno (fijado en CI/despliegue al SHA corto o semver del release) ->
 * versión de package.json -> 'unknown'. Se asume cwd = apps/backend (misma
 * convención ya usada por los scripts de verificación y CI).
 */
function readPackageVersion(): string | undefined {
  try {
    const raw = readFileSync(join(process.cwd(), 'package.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version;
  } catch {
    return undefined;
  }
}

export function resolveAppVersion(): string {
  return process.env.APP_VERSION || readPackageVersion() || 'unknown';
}
