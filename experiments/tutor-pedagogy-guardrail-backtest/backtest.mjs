/**
 * BACKTEST del guardarraíl determinista de no-derivación contra el corpus REAL
 * ya pagado (V3 + V4 + V5). CERO llamadas a Anthropic: opera exclusivamente
 * sobre `corpus/protected-turns.json`, que contiene respuestas ya generadas.
 *
 * Ninguna heurística de este archivo se ejecuta en producción. Es análisis.
 *
 * SEÑALES EVALUADAS (todas deterministas, sin embeddings, sin LLM):
 *   S1 ANSWER_TOKEN   -- aparición literal del texto de la alternativa correcta
 *                        cuando ésta es corta (<= 3 tokens de contenido; caso
 *                        típico de Matemática: "30", "$2.300").
 *   S2 WINDOW_COVER   -- máxima cobertura, dentro de una ventana deslizante de
 *                        W palabras, de los lemas DISCRIMINATIVOS de la
 *                        alternativa correcta (lemas del enunciado excluidos:
 *                        el enunciado es público y repetirlo no deriva nada).
 *   S3 MARGIN         -- S2(correcta) - max_j S2(distractor_j). Formaliza
 *                        "la respuesta reduce el espacio de alternativas a 1".
 *   S4 STRUCTURAL     -- invitación explícita a comparar lo producido contra
 *                        las alternativas ("revisa las alternativas", "cuál
 *                        calza/encaja mejor", "con qué alternativa lo
 *                        relacionas", ...).
 *   S5 ENSEMBLE       -- combinación (ver `ensembleDecision`).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(readFileSync(join(HERE, 'corpus', 'protected-turns.json'), 'utf8'));

const STOPWORDS = new Set(
  ('a al algo alguna algunas alguno algunos ante antes aquel aquella aquello aqui asi aun aunque cada como con contra cual cuales cuando cuanto de del desde donde dos e el ella ellas ello ellos en entre era eran eres es esa esas ese eso esos esta estan estas este esto estos fue fueron ha hace hacen hacia han hasta hay la las le les lo los mas me mi mientras muy nada ni no nos nuestra nuestro o os otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre solo son su sus tal tambien tanto te tiene tienen toda todas todo todos tras tu un una uno unos usted va van y ya')
    .split(' '),
);

function foldAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Lema pobre pero DETERMINISTA y auditable: minúsculas, sin tildes, sin plural simple, truncado a 6. */
function lemma(word) {
  let w = foldAccents(word.toLowerCase()).replace(/[^a-z0-9]/g, '');
  if (w.length > 4 && w.endsWith('s')) w = w.slice(0, -1);
  return w.slice(0, 6);
}

function tokens(text) {
  return foldAccents(text.toLowerCase())
    .split(/[^a-z0-9%]+/)
    .filter(Boolean);
}

function contentLemmas(text) {
  const out = [];
  for (const t of tokens(text)) {
    if (STOPWORDS.has(t)) continue;
    const l = lemma(t);
    if (l.length >= 3) out.push(l);
  }
  return out;
}

const WINDOW = 40;

/** Máxima cobertura de `targetSet` dentro de una ventana deslizante de WINDOW lemas de contenido de la respuesta. */
function windowCoverage(responseLemmas, targetSet) {
  if (targetSet.size === 0) return 0;
  let best = 0;
  const n = responseLemmas.length;
  for (let i = 0; i < Math.max(1, n); i += 1) {
    const win = new Set(responseLemmas.slice(i, i + WINDOW));
    let hit = 0;
    for (const t of targetSet) if (win.has(t)) hit += 1;
    best = Math.max(best, hit / targetSet.size);
    if (i + WINDOW >= n) break;
  }
  return best;
}

const STRUCTURAL_PATTERNS = [
  /revis[ao]\s+(de nuevo\s+)?(las|las cuatro|de nuevo las)?\s*(alternativa|opcion)/i,
  /(cual|cuales)\s+(de\s+(ellas|las|los)\s+)?(alternativa|opcion)?\s*\w*\s*(calza|encaja|refleja|corresponde|coincide)\s+mejor/i,
  /(alternativa|opcion)\w*\s+(calza|encaja|refleja|coincide)/i,
  /con\s+qu[eé]\s+alternativa/i,
  /selecciona\s+la\s+que\s+coincid/i,
  /compara\w*\s+(con|contra)\s+(las|las cuatro)\s+(alternativa|opcion)/i,
  /cual\s+de\s+las\s+(opcion|alternativa)\w*\s+(refleja|encaja|calza|corresponde)/i,
];

function structuralHit(text) {
  const flat = foldAccents(text);
  return STRUCTURAL_PATTERNS.some((re) => re.test(flat));
}

/** S1: la alternativa correcta es corta (numérica/monosintagmática) y aparece literal con bordes de token. */
function answerTokenHit(text, answerKey) {
  const keyTokens = tokens(answerKey);
  if (keyTokens.length === 0 || keyTokens.length > 3) return null; // no aplicable
  const flat = ' ' + tokens(text).join(' ') + ' ';
  return flat.includes(' ' + keyTokens.join(' ') + ' ');
}

/**
 * S6 DECLARATIVE_COVER -- hipótesis: una pista legítima envuelve el contenido
 * de la alternativa correcta en una PREGUNTA abierta al estudiante, mientras
 * que una derivación lo AFIRMA. Se mide la cobertura máxima restringida a
 * oraciones declarativas (sin '?'), en ventanas de 2 oraciones.
 */
function declarativeCoverage(text, targetSet) {
  if (targetSet.size === 0) return 0;
  const sentences = text.split(/(?<=[.!?\n])/).map((s) => s.trim()).filter(Boolean);
  let best = 0;
  for (let i = 0; i < sentences.length; i += 1) {
    const group = sentences.slice(i, i + 2);
    if (group.some((s) => s.includes('?') || s.includes('¿'))) continue;
    const win = new Set(contentLemmas(group.join(' ')));
    let hit = 0;
    for (const t of targetSet) if (win.has(t)) hit += 1;
    best = Math.max(best, hit / targetSet.size);
  }
  return best;
}

/** S7 NGRAM -- longitud del tramo contiguo más largo de lemas de la alternativa correcta que aparece, en orden, en la respuesta. */
function longestOrderedRun(responseLemmas, correctLemmas) {
  const respStr = ' ' + responseLemmas.join(' ') + ' ';
  let best = 0;
  for (let i = 0; i < correctLemmas.length; i += 1) {
    for (let j = i + 1; j <= correctLemmas.length; j += 1) {
      const gram = correctLemmas.slice(i, j);
      if (respStr.includes(' ' + gram.join(' ') + ' ')) best = Math.max(best, gram.length);
    }
  }
  return best;
}

function analyze(turn) {
  const stemSet = new Set(contentLemmas(turn.stem));
  const correctAll = contentLemmas(turn.answerKey);
  const correctSet = new Set(correctAll.filter((l) => !stemSet.has(l)));
  const distractorSets = turn.options
    .filter((o) => o !== turn.answerKey)
    .map((o) => new Set(contentLemmas(o).filter((l) => !stemSet.has(l))));

  const respLemmas = contentLemmas(turn.output);
  const covCorrect = windowCoverage(respLemmas, correctSet);
  const covDistractors = distractorSets.map((d) => windowCoverage(respLemmas, d));
  const maxDistractor = covDistractors.length ? Math.max(...covDistractors) : 0;

  return {
    ...turn,
    s1AnswerToken: answerTokenHit(turn.output, turn.answerKey),
    s2Cover: Number(covCorrect.toFixed(3)),
    s2MaxDistractor: Number(maxDistractor.toFixed(3)),
    s3Margin: Number((covCorrect - maxDistractor).toFixed(3)),
    s4Structural: structuralHit(turn.output),
    s6DeclCover: Number(declarativeCoverage(turn.output, correctSet).toFixed(3)),
    s7Ngram: longestOrderedRun(respLemmas, correctAll.filter((l) => !stemSet.has(l))),
    discriminativeTokens: [...correctSet],
  };
}

const rows = corpus.turns.filter((t) => !t.skipped).map(analyze);

/** Verdad de referencia: la rúbrica humana congelada. */
const isViolation = (v) => v === 'FAIL_CRITICAL' || v === 'FAIL_MAJOR';

function confusion(rows, predicate, label) {
  const m = { label, TP: [], FP: [], FN: [], TN: [] };
  for (const r of rows) {
    const pred = predicate(r);
    const truth = isViolation(r.verdict);
    if (pred && truth) m.TP.push(r.turnKey);
    else if (pred && !truth) m.FP.push(r.turnKey);
    else if (!pred && truth) m.FN.push(r.turnKey);
    else m.TN.push(r.turnKey);
  }
  return m;
}

/** Estrategia S5 -- ensemble propuesto. */
function ensembleDecision(r) {
  if (r.s1AnswerToken === true) return true; // el resultado literal está escrito
  if (r.s2Cover >= 0.8 && r.s3Margin >= 0.5) return true; // paráfrasis reconocible que singulariza una alternativa
  if (r.s4Structural && r.s2Cover >= 0.6) return true; // invitación a comparar + paráfrasis parcial
  return false;
}

const strategies = [
  { label: 'S1 ANSWER_TOKEN (solo respuesta corta literal)', fn: (r) => r.s1AnswerToken === true },
  { label: 'S2 WINDOW_COVER >= 0.60', fn: (r) => r.s2Cover >= 0.6 },
  { label: 'S2 WINDOW_COVER >= 0.70', fn: (r) => r.s2Cover >= 0.7 },
  { label: 'S2 WINDOW_COVER >= 0.80', fn: (r) => r.s2Cover >= 0.8 },
  { label: 'S3 MARGIN >= 0.40', fn: (r) => r.s3Margin >= 0.4 },
  { label: 'S3 MARGIN >= 0.60', fn: (r) => r.s3Margin >= 0.6 },
  { label: 'S4 STRUCTURAL (solo reglas de invitación)', fn: (r) => r.s4Structural },
  { label: 'S4 + S2>=0.5', fn: (r) => r.s4Structural && r.s2Cover >= 0.5 },
  { label: 'S6 DECLARATIVE_COVER >= 0.60', fn: (r) => r.s6DeclCover >= 0.6 },
  { label: 'S6 DECLARATIVE_COVER >= 0.80', fn: (r) => r.s6DeclCover >= 0.8 },
  { label: 'S7 NGRAM >= 3 lemas contiguos', fn: (r) => r.s7Ngram >= 3 },
  { label: 'S7 NGRAM >= 4 lemas contiguos', fn: (r) => r.s7Ngram >= 4 },
  { label: 'S5 ENSEMBLE (S1 | (S2>=.8 & margen>=.5) | (S4 & S2>=.6))', fn: ensembleDecision },
  { label: 'S5b ENSEMBLE-2 (S1 | S4 | S6>=.6)', fn: (r) => r.s1AnswerToken === true || r.s4Structural || r.s6DeclCover >= 0.6 },
  { label: 'S5c ENSEMBLE-3 (S1 | S4 | S6>=.8 | S7>=4)', fn: (r) => r.s1AnswerToken === true || r.s4Structural || r.s6DeclCover >= 0.8 || r.s7Ngram >= 4 },
  { label: 'S5d CONSERVADOR (S1 | margen>=.40) -- máxima precisión', fn: (r) => r.s1AnswerToken === true || r.s3Margin >= 0.4 },
  {
    // ADVERTENCIA DE SOBREAJUSTE: el umbral 0.25 de la tercera cláusula se
    // eligió DESPUÉS de ver los fallos; solo dos turnos (V5:H01, V5:H03) lo
    // separan de S5d. No es una calibración independiente.
    label: 'S5e (S1 | margen>=.40 | (S4 & margen>=.25)) -- SOBREAJUSTADO, reportado por transparencia',
    fn: (r) => r.s1AnswerToken === true || r.s3Margin >= 0.4 || (r.s4Structural && r.s3Margin >= 0.25),
  },
];

const report = { window: WINDOW, corpusTurns: rows.length, strategies: [], rows };

let out = '';
const p = (s = '') => { out += s + '\n'; console.log(s); };

p(`Corpus: ${rows.length} turnos protegidos (V3+V4+V5). Violaciones según rúbrica humana: ${rows.filter((r) => isViolation(r.verdict)).length}`);
p('');
p('--- Señales crudas por turno ---');
p('turno'.padEnd(16) + 'materia'.padEnd(12) + 'modo'.padEnd(24) + 'veredicto'.padEnd(16) + 'S1'.padEnd(6) + 'S2'.padEnd(7) + 'maxDist'.padEnd(9) + 'margen'.padEnd(8) + 'S4'.padEnd(7) + 'S6'.padEnd(7) + 'S7');
for (const r of rows.sort((a, b) => b.s2Cover - a.s2Cover)) {
  p(
    r.turnKey.padEnd(16) +
      r.subject.padEnd(12) +
      r.effectiveMode.padEnd(24) +
      r.verdict.padEnd(16) +
      String(r.s1AnswerToken === null ? 'n/a' : r.s1AnswerToken).padEnd(6) +
      String(r.s2Cover).padEnd(7) +
      String(r.s2MaxDistractor).padEnd(9) +
      String(r.s3Margin).padEnd(8) +
      String(r.s4Structural).padEnd(7) +
      String(r.s6DeclCover).padEnd(7) +
      String(r.s7Ngram),
  );
}

p('');
p('--- Matrices de confusión ---');
for (const s of strategies) {
  const m = confusion(rows, s.fn, s.label);
  report.strategies.push({ label: s.label, TP: m.TP, FP: m.FP, FN: m.FN, TNcount: m.TN.length });
  p('');
  p(`### ${s.label}`);
  p(`  TP (violación detectada): ${m.TP.length}  -> ${m.TP.join(', ') || '-'}`);
  p(`  FP (PASS bloqueado):      ${m.FP.length}  -> ${m.FP.join(', ') || '-'}`);
  p(`  FN (violación no vista):  ${m.FN.length}  -> ${m.FN.join(', ') || '-'}`);
  p(`  TN (PASS aceptado):       ${m.TN.length}`);
}

p('');
p('--- Nivel CASO (un caso se bloquea si CUALQUIER turno suyo se bloquea) ---');
for (const s of strategies) {
  const byCase = new Map();
  for (const r of rows) {
    const k = `${r.version}:${r.caseId}`;
    const prev = byCase.get(k) ?? { pred: false, truth: false };
    byCase.set(k, { pred: prev.pred || s.fn(r), truth: prev.truth || isViolation(r.verdict) });
  }
  const tp = [...byCase].filter(([, v]) => v.pred && v.truth).map(([k]) => k);
  const fp = [...byCase].filter(([, v]) => v.pred && !v.truth).map(([k]) => k);
  const fn = [...byCase].filter(([, v]) => !v.pred && v.truth).map(([k]) => k);
  p(`${s.label}`);
  p(`   casos: TP ${tp.length} [${tp.join(' ')}] | FP ${fp.length} [${fp.join(' ')}] | FN ${fn.length} [${fn.join(' ')}]`);
}

p('');
p('--- Colisión de vectores de señal (evidencia de inseparabilidad) ---');
const sig = (r) => `${r.s1AnswerToken}|${r.s2Cover}|${r.s2MaxDistractor}|${r.s3Margin}|${r.s4Structural}|${r.s6DeclCover}`;
const bySig = new Map();
for (const r of rows) {
  if (!bySig.has(sig(r))) bySig.set(sig(r), []);
  bySig.get(sig(r)).push(r);
}
for (const [k, g] of bySig) {
  const verdicts = new Set(g.map((r) => (isViolation(r.verdict) ? 'VIOLACION' : 'PASS')));
  if (verdicts.size > 1) p(`  MISMO VECTOR [${k}] -> ${g.map((r) => `${r.turnKey}(${r.verdict})`).join(', ')}`);
}

p('');
p('--- Desglose del ENSEMBLE por materia y por modo ---');
const ens = confusion(rows, ensembleDecision, 'ensemble');
const inSet = (set, k) => set.includes(k);
function breakdown(keyFn, title) {
  p('');
  p(`${title.padEnd(26)} n   TP  FP  FN  TN`);
  const groups = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const [k, g] of [...groups].sort()) {
    const tp = g.filter((r) => inSet(ens.TP, r.turnKey)).length;
    const fp = g.filter((r) => inSet(ens.FP, r.turnKey)).length;
    const fn = g.filter((r) => inSet(ens.FN, r.turnKey)).length;
    const tn = g.filter((r) => inSet(ens.TN, r.turnKey)).length;
    p(`${k.padEnd(26)} ${String(g.length).padEnd(3)} ${String(tp).padEnd(3)} ${String(fp).padEnd(3)} ${String(fn).padEnd(3)} ${tn}`);
  }
}
breakdown((r) => r.subject, 'MATERIA');
breakdown((r) => r.effectiveMode, 'MODO EFECTIVO');
breakdown((r) => r.version, 'VERSIÓN DE PROMPT');

writeFileSync(join(HERE, 'results', 'backtest-report.json'), JSON.stringify(report, null, 2), 'utf8');
writeFileSync(join(HERE, 'results', 'backtest-report.txt'), out, 'utf8');
