// Candidato A: pre-renderizado servidor -> SVG estático, usando MathJax (mathjax-full v3,
// imports directos de ES modules -- el paquete "mathjax" v4 usa un cargador dinámico de
// componentes con un bug conocido de resolución de rutas en Windows, por eso se usa
// mathjax-full aquí en su lugar).
//
// Simula el paso "Validación -> Almacenamiento" de la arquitectura editorial: cada
// fórmula LaTeX se convierte UNA vez, en tiempo de publicación, a un SVG autocontenido
// que el cliente solo necesita mostrar (sin parsear LaTeX nunca en el dispositivo).

import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { testCases, fileNameFor } from '../test-cases.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'out', 'svg');
mkdirSync(outDir, { recursive: true });

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
const svgOutput = new SVG({ fontCache: 'none' }); // sin fontCache: SVG 100% autocontenido (clave para offline)
const html = mathjax.document('', { InputJax: tex, OutputJax: svgOutput });

const manifest = [];
const timings = [];

for (const testCase of testCases) {
  const t0 = performance.now();
  const node = html.convert(testCase.latex, { display: testCase.display });
  const svgString = adaptor.outerHTML(node);
  const t1 = performance.now();

  const fileName = fileNameFor(testCase);
  writeFileSync(resolve(outDir, fileName), svgString, 'utf-8');

  const bytes = Buffer.byteLength(svgString, 'utf-8');
  timings.push({ id: testCase.id, ms: Number((t1 - t0).toFixed(2)), bytes });
  manifest.push({ ...testCase, file: fileName, bytes });
}

writeFileSync(resolve(outDir, '..', 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');

console.log('Generación completa. Tiempo de conversión por fórmula (servidor, una sola vez):');
console.table(timings);
const totalBytes = timings.reduce((sum, t) => sum + t.bytes, 0);
console.log(`Tamaño total de ${timings.length} SVGs: ${(totalBytes / 1024).toFixed(1)} KB`);
console.log(`Promedio por fórmula: ${(totalBytes / timings.length / 1024).toFixed(2)} KB`);
