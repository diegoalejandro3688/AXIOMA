// ENSAYOS-M1-A -- descubrimiento/carga de módulos de Ensayo. Espejo del
// loader de Study (`content/load.ts`) pero recorriendo EXCLUSIVAMENTE
// `content/ensayo/**`, con su propio schema. Separado a propósito: el loader
// de Study nunca ve `content/ensayo/` y este nunca ve `content/estudio/`.
//
// Sin efectos secundarios de escritura: solo lee del filesystem e importa
// dinámicamente los módulos `.ts` vía `tsx`. El gate lo trata como FALLO; el
// importer de ENSAYOS-M1-B lo tratará como error fatal antes de escribir nada.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { examSourceModuleSchema, type ExamSourceModule } from './schema';

export interface LoadedExam {
  file: string;
  module: ExamSourceModule;
}

export interface LoadExamIssue {
  file: string;
  message: string;
}

/** Recorre recursivamente `dir` y devuelve todos los `.ts` (nunca `schema.ts`/`manifest.ts`/`load.ts`). */
export function findExamFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...findExamFiles(full));
    } else if (entry.endsWith('.ts') && !['schema.ts', 'manifest.ts', 'load.ts'].includes(entry)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Carga y valida TODOS los módulos de Ensayo bajo `dir`. Nunca lanza por un
 * archivo individual inválido -- lo reporta en `issues` y continúa (mismo
 * criterio que el loader de Study).
 */
export async function loadExamModules(dir: string): Promise<{ loaded: LoadedExam[]; issues: LoadExamIssue[] }> {
  const files = findExamFiles(dir);
  const loaded: LoadedExam[] = [];
  const issues: LoadExamIssue[] = [];
  for (const file of files) {
    const imported = (await import(pathToFileURL(file).href)) as { default?: unknown };
    if (imported.default === undefined) {
      issues.push({ file, message: 'no exporta un default' });
      continue;
    }
    const result = examSourceModuleSchema.safeParse(imported.default);
    if (!result.success) {
      issues.push({ file, message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(' | ') });
      continue;
    }
    loaded.push({ file, module: result.data });
  }
  return { loaded, issues };
}
