// Infraestructura MÍNIMA de generación de SVG a partir de LaTeX -- ver
// ADR-0002 (arquitectura oficial) y ADR-0013 (enmienda a ADR-0012). NO es el
// pipeline editorial completo (validación asistida, revisión humana,
// almacenamiento de assets, invalidación) -- solo la función pura que ese
// pipeline futuro invocará. Hoy la usa `prisma/seed.ts`, el único punto que
// "publica" contenido en M1. Mismo patrón de imports que el spike aprobado
// (`spike/math-rendering/scripts/generate-svg.mjs`): `mathjax-full` v3
// (imports directos de ES modules), no el paquete `mathjax` v4 (bug de
// resolución de rutas en Windows, ya documentado en el spike).
import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({ packages: AllPackages });
// `fontCache: 'none'` -- SVG 100% autocontenido, sin <defs> compartidos entre
// fórmulas (imprescindible porque cada SVG viaja solo, inline, en su propio
// bloque -- ver ADR-0002).
const svgOutput = new SVG({ fontCache: 'none' });
const html = mathjax.document('', { InputJax: tex, OutputJax: svgOutput });

/**
 * Convierte LaTeX a un SVG autocontenido. Se invoca UNA vez, en el momento en
 * que el contenido se crea (ADR-0002: "el SVG se genera una sola vez, en el
 * momento de publicación... nunca se regenera en cada lectura"). Lanza si
 * MathJax no puede convertir la expresión -- un LaTeX inválido no debe
 * persistirse silenciosamente como si fuera válido.
 */
export function renderLatexToSvg(latex: string, display: boolean = false): string {
  const node = html.convert(latex, { display });
  return adaptor.outerHTML(node);
}
