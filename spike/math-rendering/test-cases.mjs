/**
 * Casos de prueba representativos para el spike del renderizador matemático.
 * No forma parte de la arquitectura final — vive solo en spike/math-rendering.
 */
export const testCases = [
  {
    id: 'fraccion',
    label: 'Fracción',
    display: true,
    latex: '\\frac{3x + 1}{2x - 5}',
  },
  {
    id: 'raiz',
    label: 'Raíz',
    display: true,
    latex: '\\sqrt{x^2 + y^2} = \\sqrt[3]{27}',
  },
  {
    id: 'exponente',
    label: 'Exponente',
    display: true,
    latex: 'a^{2} + b^{2} = c^{2} \\quad y \\quad 2^{-3} = \\frac{1}{8}',
  },
  {
    id: 'sumatoria',
    label: 'Sumatoria',
    display: true,
    latex: '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
  },
  {
    id: 'integral',
    label: 'Integral',
    display: true,
    latex: '\\int_{0}^{1} x^2 \\, dx = \\frac{1}{3}',
  },
  {
    id: 'limite',
    label: 'Límite',
    display: true,
    latex: '\\lim_{x \\to \\infty} \\frac{1}{x} = 0',
  },
  {
    id: 'matriz',
    label: 'Matriz',
    display: true,
    latex:
      '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} \\times \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 6 \\end{pmatrix}',
  },
  {
    id: 'cuadratica',
    label: 'Ecuación cuadrática (fórmula general)',
    display: true,
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  },
  {
    id: 'inline-mixto',
    label: 'Fórmula inline dentro de texto (estilo pregunta PAES)',
    display: false,
    latex: 'x^2 - 5x + 6 = 0',
    textoAntes: 'Si ',
    textoDespues:
      ', ¿cuál es el valor de $x$ que satisface la ecuación, considerando que $x > 0$?',
  },
];

/** Genera un id determinístico + label para archivos de salida. */
export function fileNameFor(testCase) {
  return `${testCase.id}.svg`;
}
