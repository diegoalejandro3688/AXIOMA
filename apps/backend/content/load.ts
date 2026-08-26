// CONTENT-4.2 -- descubrimiento/carga de módulos de Recurso, EXTRAÍDO de
// `verify-content-source-gate.ts` (CONTENT-4.1) para que el gate y
// `scripts/import-content.ts` compartan EXACTAMENTE el mismo recorrido de
// `apps/backend/content/` -- evita dos implementaciones divergentes (ver
// CONTENT-4.2, punto 2). Sin efectos secundarios de escritura: solo lee del
// filesystem e importa dinámicamente los módulos `.ts` vía `tsx`.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resourceContentModuleSchema, type ResourceContentModule } from './schema';

export interface LoadedResource {
  file: string;
  module: ResourceContentModule;
}

export interface LoadIssue {
  file: string;
  message: string;
}

/** Recorre recursivamente `dir` y devuelve todos los `.ts` (nunca `schema.ts`/`manifest.ts`/`load.ts`, que no son módulos de Recurso). */
export function findContentFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findContentFiles(full));
    } else if (entry.endsWith('.ts') && !['schema.ts', 'manifest.ts', 'load.ts'].includes(entry)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Carga y valida TODOS los módulos de Recurso bajo `dir`. Nunca lanza por un
 * archivo individual inválido -- lo reporta en `issues` y continúa con el
 * resto (mismo criterio que el resto de gates del repo: un fallo no detiene
 * al lote). El llamador decide qué hacer con `issues` (el gate las reporta
 * como FALLO; el importer las trata como error fatal antes de escribir nada).
 */
export async function loadResourceModules(dir: string): Promise<{ loaded: LoadedResource[]; issues: LoadIssue[] }> {
  const files = findContentFiles(dir);
  const loaded: LoadedResource[] = [];
  const issues: LoadIssue[] = [];
  for (const file of files) {
    const imported = (await import(pathToFileURL(file).href)) as { default?: unknown };
    if (imported.default === undefined) {
      issues.push({ file, message: 'no exporta un default' });
      continue;
    }
    const result = resourceContentModuleSchema.safeParse(imported.default);
    if (!result.success) {
      issues.push({ file, message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ') });
      continue;
    }
    loaded.push({ file, module: result.data });
  }
  return { loaded, issues };
}
