// Genera apps/mobile/lab-data/math-svg.generated.ts a partir de los SVG ya generados,
// para que la pantalla de laboratorio en Expo pueda importarlos como modulo TS
// sin depender de carga de assets adicional. Solo para el spike.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { testCases } from '../test-cases.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgDir = resolve(__dirname, '..', 'out', 'svg');
const outFile = resolve(__dirname, '..', '..', '..', 'apps', 'mobile', 'lab-data', 'math-svg.generated.ts');

const entries = testCases.map((tc) => {
  const svg = readFileSync(resolve(svgDir, `${tc.id}.svg`), 'utf-8');
  return `  ${JSON.stringify(tc.id)}: ${JSON.stringify(svg)},`;
});

const content = `// GENERADO por spike/math-rendering/scripts/generate-rn-data.mjs -- no editar a mano.
// Solo para el spike del renderizador matemático (Fase 0, Paso 2). No es parte de la
// arquitectura final: los SVG reales vendrán de la API, no de un archivo embebido.
export const mathSvgById: Record<string, string> = {
${entries.join('\n')}
};
`;

writeFileSync(outFile, content, 'utf-8');
console.log('Escrito:', outFile);
