// STABILIZATION-B8 -- gate del pulido de Candidato. Verifica lo que NO
// necesita un renderer de React Native:
//   - fallback visual de avatar (Polish A): la rama `avatarUri == null` de
//     `Avatar` dibuja el glifo de persona canónico y NO muta inventario/equipo.
//   - título equipado en identidad (Polish B): `identity-header` lo muestra
//     condicionalmente y NUNCA un placeholder "Sin título"; Ranking igual.
//   - saludo de Inicio (Polish C): `displayName` o "estudiante", sin fuga de
//     username/email.
//   - "Tu liga actual" (Polish E): 1 fila marcada sii `currentTier` conocido.
//   - reconciliación acotada (Polish F): ventana y cadencia REALMENTE acotadas;
//     Quick nunca arma progreso de estudio.
//
// NO reemplaza la QA física (render real, claro/oscuro, latencia real).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  STUDY_RECONCILE_WINDOW_MS,
  STUDY_RECONCILE_REFETCH_OFFSETS_MS,
  armStudyProgressReconciliation,
  getStudyProgressArmedAt,
  clearStudyProgressReconciliation,
} from '../lib/progress/study-progress-reconciliation';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE_ROOT = join(__dirname, '..');
const read = (...p: string[]) => readFileSync(join(MOBILE_ROOT, ...p), 'utf8');

function main() {
  console.log('--- A. Fallback visual de avatar (Polish A) ---');
  const avatarSrc = read('components', 'ui', 'avatar.tsx');
  check('la rama avatarUri null dibuja <Icon name="profile" (glifo de persona canónico)', /avatarUri \?[\s\S]*?:[\s\S]*?<Icon name="profile"/.test(avatarSrc));
  // Sólo el CÓDIGO cuenta, no los comentarios (que sí mencionan "no equipa cosmético").
  const avatarCode = avatarSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('el fallback NO crea inventario / equipa / otorga nada (sólo presentación)', !/(inventoryItem|equipCosmetic|createIdempotent|rewardGrant|\.acquire\(|api\/(inventory|cosmetic|personalization))/i.test(avatarCode));
  check('Avatar sigue recibiendo todo por props (sin fetch, sin API, sin efecto)', !/from '.*lib\/api|useEffect\(|fetch\(/.test(avatarCode));

  console.log('--- B. Título equipado en identidad (Polish B) ---');
  const headerSrc = read('components', 'competitive', 'identity-header.tsx');
  check('identity-header muestra equippedTitle.displayText condicionalmente', /equippedTitle \?[\s\S]*?equippedTitle\.displayText/.test(headerSrc));
  check('identity-header NUNCA renderiza un placeholder "Sin título"', !headerSrc.includes('Sin título'));
  const rankingSrc = read('app', '(tabs)', 'competir', 'ranking.tsx');
  check('Ranking muestra row.equippedTitle.displayText como línea secundaria', /row\.equippedTitle \?[\s\S]*?row\.equippedTitle\.displayText/.test(rankingSrc));
  check('Ranking no muestra placeholder de título ausente', !/Sin t[ií]tulo/.test(rankingSrc));
  const publicViewSrc = read('components', 'competitive', 'public-profile-view.tsx');
  check('public-profile-view pasa equippedTitle (sólo el equipado, nunca uno poseído-sin-equipar)', /equippedTitle=\{profile\.equippedTitle\}/.test(publicViewSrc));

  console.log('--- C. Saludo de Inicio (Polish C) ---');
  const homeSrc = read('app', '(tabs)', 'index.tsx');
  check('saludo = displayName o "estudiante"', /displayName \?\?\s*'estudiante'/.test(homeSrc) && /Hola, \{greetingName\}/.test(homeSrc));
  check('el saludo NO deriva de username/email/accountId', !/greetingName[\s\S]{0,120}(username|email|accountId)/.test(homeSrc));

  console.log('--- E. "Tu liga actual" en la escalera de ligas (Polish E) ---');
  const ladderSrc = read('components', 'competitive', 'league-ladder-dialog.tsx');
  check('las 7 filas siguen viniendo de LEAGUE_TIERS.map', /LEAGUE_TIERS\.map/.test(ladderSrc));
  check('marca "Tu liga actual" sólo en la fila tier === highlightedTier', /tier === highlightedTier/.test(ladderSrc) && ladderSrc.includes('Tu liga actual'));
  check('currentTier == null -> highlightedTier null -> ninguna fila marcada', /currentTier == null \? null :/.test(ladderSrc));
  check('el llamador pasa la liga vigente autoritativa (view.leagueTier), nunca un valor fijo', /currentTier=\{[\s\S]*?leagueState[\s\S]*?leagueTier[\s\S]*?\}/.test(read('app', '(tabs)', 'competir', 'index.tsx')));

  console.log('--- F. Reconciliación ACOTADA (Polish F) ---');
  check('ventana <= 5 min (acotada, cubre la latencia backend ~1.5-2.5 min)', STUDY_RECONCILE_WINDOW_MS > 0 && STUDY_RECONCILE_WINDOW_MS <= 300_000);
  check('cadencia de refetch acotada: 3-6 intentos espaciados, ninguno < 5s', STUDY_RECONCILE_REFETCH_OFFSETS_MS.length >= 3 && STUDY_RECONCILE_REFETCH_OFFSETS_MS.length <= 6 && STUDY_RECONCILE_REFETCH_OFFSETS_MS.every((o) => o >= 5_000));
  check('offsets estrictamente crecientes y todos dentro de la ventana', STUDY_RECONCILE_REFETCH_OFFSETS_MS.every((o, i) => (i === 0 || o > STUDY_RECONCILE_REFETCH_OFFSETS_MS[i - 1]!) && o < STUDY_RECONCILE_WINDOW_MS));

  clearStudyProgressReconciliation();
  check('sin armar -> getStudyProgressArmedAt() == null', getStudyProgressArmedAt() === null);
  armStudyProgressReconciliation(1_000_000);
  check('armado -> devuelve el timestamp', getStudyProgressArmedAt(1_000_000) === 1_000_000);
  check('dentro de la ventana -> sigue armado', getStudyProgressArmedAt(1_000_000 + STUDY_RECONCILE_WINDOW_MS - 1) === 1_000_000);
  check('pasada la ventana -> auto-limpieza a null (nunca poll indefinido)', getStudyProgressArmedAt(1_000_000 + STUDY_RECONCILE_WINDOW_MS + 1) === null);

  const hookSrc = read('lib', 'progress', 'use-bounded-reconciliation.ts');
  check('el hook cancela sus timers al desmontar / re-armar (cleanup con clearTimeout)', /return \(\) => \{[\s\S]*?clearTimeout/.test(hookSrc));
  check('el hook NO usa setInterval (sin bucle perpetuo)', !hookSrc.includes('setInterval'));
  check('el hook nunca fabrica valores (no muta signature ni el valor autoritativo)', !/setState\(|signature =|\.xp|leaguePoints =/.test(hookSrc.replace(/setArmedAt/g, '')));

  console.log('--- I. Quick NUNCA arma progreso de estudio ---');
  const quickSrc = read('app', '(tabs)', 'competir', 'quick-question.tsx');
  check('quick-question.tsx no importa study-progress-reconciliation', !quickSrc.includes('study-progress-reconciliation'));
  const reconcileSrc = read('lib', 'progress', 'study-progress-reconciliation.ts');
  check('el store documenta que QUICK_QUESTION_ANSWERED nunca arma', /QUICK_QUESTION_ANSWERED\s+NUNCA/.test(reconcileSrc));
  const ejercicioSrc = read('app', '(tabs)', 'estudio', 'topic', '[topicId]', 'ejercicio.tsx');
  check('ejercicio.tsx arma SÓLO en el camino aceptado por el servidor (outcome.kind === "ok")', /outcome\.kind === 'ok'\) \{\s*\n\s*armStudyProgressReconciliation\(\)/.test(ejercicioSrc));

  console.log('--- G. Ranking refetch en foco / al cambiar LP pendiente (Polish G, móvil) ---');
  check('Ranking usa useFocusEffect para refresco silencioso', /useFocusEffect/.test(rankingSrc) && /load\(\{ silent: true \}\)/.test(rankingSrc));
  check('Ranking se suscribe a subscribePendingLp para reconciliar', /subscribePendingLp/.test(rankingSrc));
  check('Ranking NO copia el valor del Hub directamente (dispara un refetch real)', !/hubLp|view\.leaguePoints/.test(rankingSrc));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de pulido B8 pasaron.');
}

main();
