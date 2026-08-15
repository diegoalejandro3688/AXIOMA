/**
 * Verificación MECÁNICA de ausencia de overfitting textual del prompt
 * `AXIOMA_TUTOR_V5` al dataset de evaluación (punto M del encargo del Product
 * Owner) y de ausencia de secretos en los artefactos nuevos.
 *
 * No hace ninguna llamada a Anthropic ni toca la base de datos: lee el texto
 * del prompt renderizado (volcado por `render-prompt.mjs`, o el que se le pase
 * por argumento) y lo contrasta contra:
 *   1. IDs de casos de evaluación (P##, M##, C##, L##, H##, R##).
 *   2. Fragmentos literales de los enunciados, alternativas y explicaciones de
 *      los fixtures canónicos del seed usados por el dataset.
 *   3. Valores concretos de esos fixtures.
 *   4. Nombres de materia usados como parche ("en Historia...", "en Lenguaje...").
 *   5. Patrones de secreto (API keys, tokens).
 *
 * Uso:  node checkpoint/no-overfitting-check.mjs [rutaDelPromptRenderizado]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const promptPath = process.argv[2] ?? join(here, 'prompt-v5-rendered.txt');
const prompt = readFileSync(promptPath, 'utf8');

let failures = 0;
const ok = (label) => console.log(`  OK  ${label}`);
const fail = (label, detail) => {
  console.error(`FALLO  ${label}${detail ? ` -- ${detail}` : ''}`);
  failures += 1;
};

// --- 1. IDs de casos de evaluación ---------------------------------------
console.log('--- 1. El prompt NO contiene identificadores de casos de evaluación ---');
const caseIdPattern = /\b(?:P|M|C|L|H|R)\d{2}\b/g;
const idHits = [...prompt.matchAll(caseIdPattern)].map((m) => m[0]);
if (idHits.length === 0) ok('ningún ID de caso (P##/M##/C##/L##/H##/R##) aparece en el prompt');
else fail('el prompt menciona IDs de casos de evaluación', idHits.join(', '));

// --- 2/3. Fragmentos y valores de los fixtures canónicos ------------------
console.log('--- 2/3. El prompt NO contiene enunciados, alternativas, explicaciones ni valores de los fixtures ---');
const fixtureFragments = [
  // Matemática (M1.NUMEROS.PORCENTAJES .Q1/.Q2)
  '20% de 150', '20 % de 150', 'el 20% de 150', '150 × 20', '150 x 20',
  '¿A cuánto equivale el 20% de 150?',
  'Un producto de $2.000 sube un 15%', '2.000', '2.300', '2.015', '2.150', '2.500',
  'precio x 1,15', 'precio × 1,15',
  // Ciencias (C1.BIOLOGIA.CELULA.Q1)
  'plasmólisis', 'hipertónica', 'célula vegetal', 'pared celular', 'ósmosis',
  // Lenguaje (L1.LECTURA.INFERENCIA.Q1)
  'Elena', 'puerta entreabierta', 'alerta y desconfiada', 'sin hacer ruido',
  // Historia (H1.CHILE.SIGLO20.ISI.Q1)
  'Sustitución de Importaciones', 'salitre', 'CORFO', '1929',
  'Producir dentro del país los bienes que antes se importaban',
  // Otros ejercicios del dataset
  '8 trabajadores', '12 trabajadores', '10 días', '850 puntos', 'DEMRE', 'demre.cl',
  '$400.000', 'notebook',
];
// Siglas cortas: se buscan con límite de palabra y respetando mayúsculas, para no
// confundirlas con subcadenas de palabras corrientes (p. ej. "ISI" dentro de "análisis").
const fixtureAcronyms = [/\bISI\b/, /\bPAES\b/, /\bTDAH\b/];
const fragmentHits = [
  ...fixtureFragments.filter((f) => prompt.toLowerCase().includes(f.toLowerCase())),
  ...fixtureAcronyms.filter((re) => re.test(prompt)).map((re) => re.source),
];
if (fragmentHits.length === 0) ok(`ninguno de los ${fixtureFragments.length + fixtureAcronyms.length} fragmentos/valores/siglas de fixture aparece en el prompt`);
else fail('el prompt contiene contenido literal de los fixtures de evaluación', fragmentHits.join(' | '));

// --- 4. Materias usadas como parche ---------------------------------------
console.log('--- 4. La política es materia-agnóstica: ninguna materia aparece como regla dirigida ---');
const subjectPatchPattern = /\b(?:en|para|de)\s+(Historia|Lenguaje|Ciencias|Matemática|Biología)\b/gi;
const subjectHits = [...prompt.matchAll(subjectPatchPattern)].map((m) => m[0]);
if (subjectHits.length === 0) ok('ninguna regla del prompt está dirigida a una materia concreta');
else fail('el prompt contiene una regla dirigida a una materia concreta (parche)', subjectHits.join(', '));

// --- 5. Secretos en los artefactos nuevos ---------------------------------
console.log('--- 5. Ausencia de secretos en TODOS los artefactos nuevos de este experimento ---');
const secretPatterns = [
  { name: 'clave de API de Anthropic', re: /sk-ant-[A-Za-z0-9_-]{8,}/ },
  { name: 'clave de API genérica sk-', re: /\bsk-[A-Za-z0-9]{20,}/ },
  { name: 'asignación de ANTHROPIC_API_KEY con valor', re: /ANTHROPIC_API_KEY\s*[=:]\s*["']?[A-Za-z0-9_\-]{8,}/ },
  { name: 'password/secret con valor literal', re: /\b(?:password|secret|token)\s*[=:]\s*["'][A-Za-z0-9_\-]{12,}["']/i },
  { name: 'cadena de conexión con credenciales', re: /postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/ },
];
const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const artifacts = walk(root);
let secretFindings = 0;
for (const file of artifacts) {
  const content = readFileSync(file, 'utf8');
  for (const { name, re } of secretPatterns) {
    if (re.test(content)) {
      fail(`secreto potencial (${name}) en ${file}`);
      secretFindings += 1;
    }
  }
}
if (secretFindings === 0) ok(`ninguno de los ${artifacts.length} archivos del experimento contiene un patrón de secreto`);

console.log('');
if (failures > 0) {
  console.error(`RESULTADO: ${failures} verificación(es) FALLARON.`);
  process.exit(1);
}
console.log('RESULTADO: OK -- sin overfitting textual al dataset y sin secretos en los artefactos.');
