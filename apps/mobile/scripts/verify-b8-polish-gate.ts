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

  // VC4 MICROBLOQUE 4 -- regresión del bug de starvation cross-tarjeta:
  // `armedAt` es un ÚNICO valor GLOBAL compartido por TODAS las tarjetas
  // (XP en Inicio, Desafíos en Inicio Y en Competir). Antes, cada
  // consumidor llamaba `clearStudyProgressReconciliation()` en cuanto SU
  // PROPIA señal cambiaba -- si XP (rápido) cambiaba primero, mataba la
  // ventana COMPARTIDA antes de que Desafíos (más lento, depende de un
  // paso adicional aguas abajo) recibiera sus propios refetch programados.
  // Simulación: arma la ventana, "XP cambia" (sin que el consumidor XP
  // limpie nada -- comportamiento correcto tras el fix), y confirma que la
  // ventana SIGUE viva para que Desafíos aún reciba sus refetch.
  clearStudyProgressReconciliation();
  armStudyProgressReconciliation(2_000_000);
  const afterFastConsumerChanged = getStudyProgressArmedAt(2_000_000 + 5_000); // XP ya cambió a los 5s
  check('cuenta A (XP) cambiando su propia señal NO limpia la ventana compartida', afterFastConsumerChanged === 2_000_000);
  const stillArmedForSlowConsumer = getStudyProgressArmedAt(2_000_000 + STUDY_RECONCILE_REFETCH_OFFSETS_MS[STUDY_RECONCILE_REFETCH_OFFSETS_MS.length - 1]! - 1);
  check('Desafíos (más lento) sigue viendo la ventana armada hasta su propio refetch programado', stillArmedForSlowConsumer === 2_000_000);
  clearStudyProgressReconciliation();

  const hookSrc = read('lib', 'progress', 'use-bounded-reconciliation.ts');
  check(
    'el hook YA NO limpia la ventana compartida sólo porque SU PROPIA señal cambió (sin efecto keyed únicamente en [changed] que llame clearStudyProgressReconciliation)',
    !/useEffect\(\(\) => \{\s*if \(changed\) \{\s*clearStudyProgressReconciliation\(\);/.test(hookSrc),
  );
  const hookCode = hookSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check(
    'la ÚNICA llamada a clearStudyProgressReconciliation en el hook vive en el efecto de expiración natural (keyed en [processing, armedAt])',
    (hookCode.match(/clearStudyProgressReconciliation\(\)/g) ?? []).length === 1,
  );
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

  console.log('--- H. RewardBurst (VC4 MICROBLOQUE 5) -- feedback visual puro de +20/+100 XP ---');
  const burstSrc = read('components', 'ui', 'reward-burst.tsx');
  check('RewardBurst existe', burstSrc.length > 0);
  check(
    'sin dependencia nueva -- solo react-native (Animated/AccessibilityInfo/useWindowDimensions) + theme propio',
    !/from '(?!react|react-native|\.\.\/\.\.\/theme)/.test(burstSrc),
  );
  check('respeta Reduce Motion (mismo patrón AccessibilityInfo.isReduceMotionEnabled ya usado en progress.tsx/answer-option.tsx)', burstSrc.includes('AccessibilityInfo.isReduceMotionEnabled'));
  check('con Reduce Motion sigue apareciendo (fade), nunca se oculta el feedback', /reduceMotion\) \{[\s\S]*?Animated\.sequence/.test(burstSrc));
  check('pointerEvents="none" -- nunca bloquea la UI', burstSrc.includes('pointerEvents="none"'));
  const burstCode = burstSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  check('NUNCA llama addOptimisticXp / toca el store de Instant XP -- feedback puro, no fuente de verdad', !/addOptimisticXp|reconcileXp|instant-xp-store/.test(burstCode));
  check('sin persistencia (no AsyncStorage/SQLite) -- transitorio en memoria', !/AsyncStorage|expo-sqlite/.test(burstSrc));

  console.log('--- H2. RewardBurst -- integración RECURSO ---');
  check(
    'ejercicio.tsx dispara RewardBurst SÓLO bajo resourceJustCompleted real (misma condición que addOptimisticXp)',
    /outcome\.data\.resourceJustCompleted\) \{[\s\S]{0,80}addOptimisticXp\(XP_REWARD_BY_ACTIVITY_TYPE\.RECURSO_COMPLETADO\)[\s\S]{0,500}setResourceBurst/.test(ejercicioSrc),
  );
  check('ejercicio.tsx usa amount = XP_REWARD_BY_ACTIVITY_TYPE.RECURSO_COMPLETADO (nunca 20 hardcodeado en el JSX)', /amount=\{XP_REWARD_BY_ACTIVITY_TYPE\.RECURSO_COMPLETADO\}/.test(ejercicioSrc));
  check('ejercicio.tsx usa kind="resource"', /kind="resource"/.test(ejercicioSrc));

  console.log('--- H3. RewardBurst -- integración ENSAYO ---');
  const recursosSrc = read('app', '(tabs)', 'estudio', '[subjectId]', 'recursos.tsx');
  const unidadDetailSrc = read('app', '(tabs)', 'estudio', '[subjectId]', 'unidad', '[unitId].tsx');
  const recursoSrc = read('app', '(tabs)', 'estudio', 'topic', '[topicId]', 'recurso.tsx');
  const studyNavSrc = read('lib', 'study', 'study-navigation.ts');
  const attemptSrc = read('app', '(tabs)', 'estudio', 'ensayos', '[examId]', 'attempt', '[attemptId].tsx');
  // VC4 MICROBLOQUE 11 -- mantenimiento de expectativa STALE: ANTES,
  // addOptimisticXp/setEssayBurst se disparaban juntos, incondicionalmente,
  // bajo `result.ok` (el bug real que QA reportó -- HTTP 200 de submit NUNCA
  // implica que el backend ya otorgó XP). MICROBLOQUE 11 los desacopla
  // deliberadamente: ahora sólo ocurren bajo `if (granted)`, evidencia
  // AUTORITATIVA real de `pollExamRewardGranted`/reward-status -- `result.ok`
  // sigue siendo una precondición (si falla el submit, nunca se llega ni a
  // consultar reward-status), pero deja de ser SUFICIENTE por sí solo.
  check(
    'attempt screen dispara RewardBurst SÓLO con evidencia AUTORITATIVA real (granted, vía pollExamRewardGranted) -- nunca por result.ok solo',
    /pollExamRewardGranted\(examId, \(\) => !mounted\.current\);[\s\S]{0,200}if \(granted\) \{[\s\S]{0,1300}addOptimisticXp\([\s\S]{0,500}setEssayBurst\(true\)/.test(attemptSrc),
  );
  check('attempt screen usa amount = XP_REWARD_BY_ACTIVITY_TYPE.ENSAYO_COMPLETADO (nunca 100 hardcodeado)', /amount=\{XP_REWARD_BY_ACTIVITY_TYPE\.ENSAYO_COMPLETADO\}/.test(attemptSrc));
  check('attempt screen usa kind="essay"', /kind="essay"/.test(attemptSrc));
  const resultSrc = read('app', '(tabs)', 'estudio', 'ensayos', '[examId]', 'result', '[attemptId].tsx');
  check('la pantalla de RESULTADO sigue sin mostrar XP (ADR-0024) -- RewardBurst nunca se importa ahí', !resultSrc.includes('RewardBurst'));

  console.log('--- H3b. RewardBurst ENSAYO (VC4 MICROBLOQUE 5E) -- fix del modal de confirmación tapando el burst ---');
  const attemptCode = attemptSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const confirmCloseIdx = attemptCode.indexOf('setConfirmSubmit(false)');
  const submitCallIdx = attemptCode.indexOf('submitExamAttempt(attemptId)');
  const essayBurstTrueIdx = attemptCode.indexOf('setEssayBurst(true)');
  // ROOT CAUSE del QA FAIL: el modal `<Dialog>` (React Native `<Modal>`
  // nativo, capa SIEMPRE por encima del árbol de React) permanecía abierto
  // durante TODO el round-trip de red y sólo se cerraba en el mismo instante
  // en que se armaba el burst -- su fade de cierre nativo competía con el
  // arranque de `RewardBurst` y se lo comía visualmente. Fix: cerrar el
  // modal ANTES del `await submitExamAttempt`, no después.
  check('setConfirmSubmit(false) se llama ANTES de submitExamAttempt (cierra el modal antes del round-trip de red, no después)', confirmCloseIdx !== -1 && submitCallIdx !== -1 && confirmCloseIdx < submitCallIdx);
  // 3 call sites legítimos: cierre temprano en handleSubmit (el fix),
  // secondaryAction "Seguir revisando", y onRequestClose del propio Modal --
  // ninguno es un duplicado del OTRO, cada uno es un camino real distinto de
  // cerrar el diálogo.
  check('setConfirmSubmit(false) NO se llama de nuevo dentro de handleSubmit tras el envío (el cierre tardío original fue eliminado)', !/setSubmitting\(false\);\s*setConfirmSubmit\(false\)/.test(attemptCode));
  check('setEssayBurst(true) sigue ocurriendo DESPUÉS del cierre del modal (nunca antes)', confirmCloseIdx !== -1 && essayBurstTrueIdx !== -1 && confirmCloseIdx < essayBurstTrueIdx);
  // VC4 MICROBLOQUE 11 -- el check original prohibía TODO `setTimeout` en el
  // archivo; eso dejó de ser correcto porque `pollExamRewardGranted` (nuevo,
  // este bloque) usa un `setTimeout` LEGÍTIMO para espaciar sus reintentos
  // acotados (ver su docstring: ventana finita, nunca infinita) -- un
  // propósito TOTALMENTE distinto al que este check original auditaba (un
  // hack de "esperar al modal" con un número mágico). Se acota la prohibición
  // a la ventana ENTRE el cierre del modal y la llamada de submit (donde SÍ
  // seguiría siendo la señal de un hack reintroducido) -- el poll real vive
  // MUCHO después, dentro de la rama `if (result.ok)`, fuera de esta ventana.
  const modalCloseToSubmitWindow = confirmCloseIdx !== -1 && submitCallIdx !== -1 ? attemptCode.slice(confirmCloseIdx, submitCallIdx) : '';
  check(
    'no se usa setTimeout/delay artificial para "esperar" al modal (el margen sigue siendo el round-trip de red real) -- el setTimeout real de pollExamRewardGranted vive fuera de esta ventana, con otro propósito (ventana acotada de reintentos, no un hack de UI)',
    modalCloseToSubmitWindow !== '' && !/setTimeout\(/.test(modalCloseToSubmitWindow),
  );
  check('Dialog sigue recibiendo visible={confirmSubmit} (misma pieza, sin duplicar el componente)', /visible=\{confirmSubmit\}/.test(attemptCode));
  // VC4 MICROBLOQUE 11 -- addOptimisticXp/setEssayBurst(true) siguen
  // acotados a la rama `result.ok` (409/error nunca los alcanzan, sin
  // cambios de esto) -- PERO ya no son incondicionales dentro de ella: ahora
  // exigen ADEMÁS `granted` (evidencia autoritativa real). Ver check de H3
  // arriba para la prueba completa de esa nueva condición -- este check
  // mantiene únicamente la mitad que sigue siendo cierta (siguen anidados
  // dentro de `if (result.ok)`, nunca alcanzables desde 409/error).
  check(
    'addOptimisticXp(ENSAYO_COMPLETADO) y setEssayBurst(true) siguen anidados DENTRO de "if (result.ok)" -- 409/error nunca los alcanzan',
    /if \(result\.ok\) \{[\s\S]{0,2000}if \(granted\) \{[\s\S]{0,200}addOptimisticXp\([\s\S]{0,200}setEssayBurst\(true\);[\s\S]{0,50}return;[\s\S]{0,50}\}/.test(attemptCode),
  );
  check('essayBurst arranca en false (nunca true por defecto -- sin burst en mount/reentrada)', /essayBurst, setEssayBurst\] = useState\(false\)/.test(attemptCode));

  console.log('--- H3c. Submit interaction safety (VC4 MICROBLOQUE 5E.1) -- reutiliza `submitting`, sin reabrir el Modal ---');
  // 1. Dialog se cierra ANTES del request -- ya cubierto en H3b (orden
  // setConfirmSubmit(false) < submitExamAttempt), no se duplica aquí.
  // 2. Doble submit imposible -- guard YA existente al inicio de handleSubmit.
  check('handleSubmit sigue rechazando un segundo submit mientras submitting=true (guard preexistente, sin cambios)', /if \(state\.status !== 'ready' \|\| submitting\) return;/.test(attemptCode));
  // 3. Respuestas NO mutables durante el submit.
  check('AnswerOption se deshabilita durante submitting (no se pueden mutar respuestas en vuelo)', /disabled=\{pendingOptionId !== null \|\| submitting\}/.test(attemptCode));
  // 4. Navegación de pregunta relevante + salida + reapertura del diálogo, protegidas.
  check('"Anterior" se deshabilita durante submitting', /label="Anterior"[\s\S]{0,80}disabled=\{safeIndex === 0 \|\| submitting\}/.test(attemptCode));
  check('"Siguiente" se deshabilita durante submitting', /label="Siguiente"[\s\S]{0,80}disabled=\{safeIndex === total - 1 \|\| submitting\}/.test(attemptCode));
  check('"Entregar ensayo" (footer) se deshabilita durante submitting -- evita reabrir el Dialog en vuelo', /label="Entregar ensayo"[\s\S]{0,120}disabled=\{submitting\}/.test(attemptCode));
  check('"Salir del ensayo" (X) se deshabilita durante submitting -- evita abandonar la pantalla en vuelo (protección que antes daba el Modal gratis)', /accessibilityLabel="Salir del ensayo"[\s\S]{0,80}disabled=\{submitting\}/.test(attemptCode));
  // No se agregó Modal nuevo, ni setTimeout, ni dependencia nueva -- ya
  // cubierto por los checks "sin dependencia nueva"/"sin setTimeout" de H3b.
  check('no se reintrodujo el Dialog abierto durante el submit -- sigue habiendo exactamente un `<Dialog` en el archivo', (attemptCode.match(/<Dialog/g) ?? []).length === 1);

  console.log('--- H4. RewardBurst -- Quick NO se reemplaza por el burst grande ---');
  check('quick-question.tsx sigue usando su propio RewardReveal compacto', quickSrc.includes('RewardReveal'));
  check('quick-question.tsx NO importa RewardBurst -- Quick mantiene su patrón pequeño/local (§14)', !quickSrc.includes('RewardBurst'));

  console.log('--- H5. RewardBurst (VC4 MICROBLOQUE 5B) -- completion state dedicado del recurso ---');
  const ejercicioCode = ejercicioSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  // §1 -- el burst YA NO vive sobre la vista normal de pregunta: sólo aparece
  // una vez dentro de la rama `showCompleted`. Verificación estructural (no
  // regex frágil): entre el `return (` de la vista de pregunta y el
  // `Pressable` de "Salir de la pregunta" que la cierra, `<RewardBurst` no
  // debe aparecer -- sólo debe existir DESPUÉS de `if (showCompleted)`.
  const showCompletedIdx = ejercicioCode.indexOf('if (showCompleted)');
  const questionViewSrc = ejercicioCode.slice(0, showCompletedIdx);
  const completedBranchSrc = ejercicioCode.slice(showCompletedIdx);
  check('RewardBurst NO aparece en la vista normal de pregunta (antes de showCompleted)', !questionViewSrc.includes('<RewardBurst'));
  check('RewardBurst SÍ aparece dentro de la rama showCompleted (completion state dedicado)', completedBranchSrc.includes('<RewardBurst'));

  // §13 -- el completion state se activa DE INMEDIATO al completar (nunca
  // esperando el tap "Continuar" sobre la última pregunta): el mismo bloque
  // que dispara `addOptimisticXp(RECURSO_COMPLETADO)` debe llamar también
  // `setShowCompleted(true)`.
  check(
    'showCompleted se activa en el MISMO instante que resourceJustCompleted (sin esperar "Continuar")',
    /addOptimisticXp\(XP_REWARD_BY_ACTIVITY_TYPE\.RECURSO_COMPLETADO\);[\s\S]{0,400}setShowCompleted\(true\)/.test(ejercicioCode),
  );

  // §8/§9 -- score derivado de state.answers/state.questions (fuente local
  // autoritativa ya auditada), nunca un summary separado inventado.
  check('correctCount se deriva de state.answers[...].isCorrect === true (fuente ya autoritativa)', /state\.questions\.filter\(\(question\) => state\.answers\[question\.versionId\]\?\.isCorrect === true\)/.test(ejercicioCode));
  check('totalCount = state.questions.length (mismo recurso, mismas preguntas)', /totalCount = state\.questions\.length/.test(ejercicioCode));
  check('percentage = round(correct/total * 100) -- nunca "puntos"/"nota"/"aprobado"', /Math\.round\(\(correctCount \/ totalCount\) \* 100\)/.test(ejercicioCode) && !/\b(nota|aprobado|reprobado|puntaje)\b/i.test(ejercicioCode));

  // Summary muestra correct/total + percentage (§9/§14).
  // VC4 MICROBLOQUE 5C -- polish visual: "X de N correctas" en una línea
  // pasó a "X/N" + label "Correctas" separado (bloque de stats en columnas,
  // ver CompletionSummary) -- misma información, presentación distinta.
  check('el resumen muestra correctCount/totalCount ("X/N")', /\{correctCount\}\/\{totalCount\}/.test(ejercicioCode));
  check('el resumen etiqueta esa cifra como "Correctas"', /Correctas/.test(ejercicioCode));
  check('el resumen muestra el porcentaje ("YY%")', /\{percentage\}%/.test(ejercicioCode));
  check('el resumen etiqueta esa cifra como "Aciertos"', /Aciertos/.test(ejercicioCode));

  // §10/§14 -- el resumen se revela DESPUÉS de terminar el burst
  // (`onComplete` -> `setSummaryRevealed(true)`), nunca simultáneo.
  check('RewardBurst.onComplete revela el resumen (setSummaryRevealed(true))', /onComplete=\{\(\) => \{[\s\S]{0,80}setResourceBurst\(null\);[\s\S]{0,80}setSummaryRevealed\(true\);/.test(ejercicioCode));

  // §16 -- reentrada NUNCA dispara el burst: `summaryRevealed` arranca en
  // `true` (nada que esperar) y `resourceBurst` sólo se setea dentro de
  // `handleSelect`, nunca en `load()`.
  const loadFnSrc = ejercicioCode.slice(ejercicioCode.indexOf('const load = useCallback'), ejercicioCode.indexOf('const load = useCallback') + 900);
  check('load() (mount/reentrada) NUNCA llama setResourceBurst -- sólo handleSelect puede armar un burst real', !loadFnSrc.includes('setResourceBurst'));
  check('summaryRevealed arranca en true (reentrada muestra el resumen sin esperar un burst que no va a ocurrir)', /useState\(true\)/.test(ejercicioCode.slice(ejercicioCode.indexOf('summaryRevealed'), ejercicioCode.indexOf('summaryRevealed') + 60)));

  // Ensayo explícitamente fuera de alcance de 5B -- sus constantes de
  // animación deben seguir intactas (ver reward-burst.tsx PROFILE.essay).
  const burstProfileSrc = burstCode;
  console.log('--- H6. RewardBurst PROFILE.essay (VC4 MICROBLOQUE 5E.2) -- misma familia visual que resource, ligeramente más enfático ---');
  // Extracción NUMÉRICA (no comparación de texto literal frágil): saca cada
  // campo de un bloque `kind: { ... }` del objeto PROFILE real y compara
  // VALORES/relaciones, no la redacción exacta del archivo.
  function profileBlock(src: string, kind: 'resource' | 'essay'): string {
    const idx = src.indexOf(`${kind}: {`);
    const end = src.indexOf('},', idx);
    return src.slice(idx, end);
  }
  function profileNumber(block: string, field: string): number | null {
    const m = block.match(new RegExp(`${field}:\\s*(-?[0-9.]+)`));
    return m ? Number(m[1]) : null;
  }
  const resourceBlock = profileBlock(burstProfileSrc, 'resource');
  const essayBlock = profileBlock(burstProfileSrc, 'essay');
  const resourceFontSizeExpr = resourceBlock.match(/fontSize:\s*([^,]+),/)?.[1]?.trim();
  const essayFontSizeExpr = essayBlock.match(/fontSize:\s*([^,]+),/)?.[1]?.trim();
  check('essay usa el MISMO fontSize protagonista que resource (o uno igual de grande, nunca vuelve a un tamaño de label/title secundario)', !!resourceFontSizeExpr && resourceFontSizeExpr === essayFontSizeExpr);

  const essayPopMs = profileNumber(essayBlock, 'popMs')!;
  const essayHoldMs = profileNumber(essayBlock, 'holdMs')!;
  const essayFlyMs = profileNumber(essayBlock, 'flyMs')!;
  const essayFlyXRatio = profileNumber(essayBlock, 'flyXRatio')!;
  const essayFlyYRatio = profileNumber(essayBlock, 'flyYRatio')!;
  const POP_SETTLE_MS_CONST = 80; // mismo valor que POP_SETTLE_MS en reward-burst.tsx (fase 1 = max(popMs, popMs+settle))
  const essayTotalMs = Math.max(essayPopMs, essayPopMs + POP_SETTLE_MS_CONST) + essayHoldMs + essayFlyMs;
  check(`duración total de essay ronda ~2s (calculada: ${essayTotalMs}ms, rango aceptado 1850-2200ms)`, essayTotalMs >= 1850 && essayTotalMs <= 2200);
  check('hold de lectura de essay es sustancial (>= 700ms, ya no 90ms del perfil original)', essayHoldMs >= 700);
  check(
    'recorrido de essay es corto/calmado, alineado con resource -- NUNCA vuelve al vuelo largo original (flyXRatio 0.32 / flyYRatio 0.22)',
    essayFlyXRatio <= 0.2 && essayFlyYRatio <= 0.15,
  );
  const resourcePopMs = profileNumber(resourceBlock, 'popMs')!;
  const resourceHoldMs = profileNumber(resourceBlock, 'holdMs')!;
  const resourceFlyMs = profileNumber(resourceBlock, 'flyMs')!;
  check('essay se siente "ligeramente más enfático" que resource -- pop/hold/fly de essay son >= los de resource, nunca menores', essayPopMs >= resourcePopMs && essayHoldMs >= resourceHoldMs && essayFlyMs >= resourceFlyMs);
  check(
    'resource NO cambió en este bloque (PROFILE.resource intacto -- valores aprobados por QA física en 5B/5C)',
    resourcePopMs === 260 && resourceHoldMs === 550 && resourceFlyMs === 700,
  );

  console.log('--- H7. Ensayo -- polish visual (VC4 MICROBLOQUE 5F), comportamiento intacto ---');
  // §19 -- después del polish debe seguir siendo verdad TODO lo funcional:
  // submit 5E, submitting safety 5E.1, RewardBurst, AnswerOption, progress,
  // CTA, Anterior/Siguiente, navigator. Estos NO se duplican aquí (ya
  // cubiertos por H3/H3b/H3c arriba, sin cambios) -- H7 verifica
  // específicamente lo que este bloque SÍ tocó: que sigue siendo sólo
  // presentación, nunca lógica.
  check('el flujo de submit 5E sigue intacto (setConfirmSubmit antes del request) -- H3b ya lo cubre, sin regresión', confirmCloseIdx !== -1 && submitCallIdx !== -1 && confirmCloseIdx < submitCallIdx);
  check('la protección submitting de 5E.1 sigue intacta (Anterior/Siguiente/Entregar/X deshabilitados) -- H3c ya lo cubre, sin regresión', /disabled=\{safeIndex === 0 \|\| submitting\}/.test(attemptCode) && /disabled=\{safeIndex === total - 1 \|\| submitting\}/.test(attemptCode));
  check('AnswerOption sigue siendo el MISMO componente, sin reescritura (sólo se usa, no se edita su archivo)', /<AnswerOption/.test(attemptCode) && !attemptCode.includes('function AnswerOption'));
  check('el contador "respondidas" NO se eliminó -- sólo se reagrupó junto al título (misma información, sin duplicar la cuenta)', /\{answered\}\/\{total\} respondidas/.test(attemptCode));
  check('"Ver preguntas" / "Ocultar preguntas" (el navigator toggle) sigue presente y funcional', /Ocultar preguntas.*:.*Ver preguntas/.test(attemptCode) || /navigatorOpen \? 'Ocultar preguntas' : 'Ver preguntas'/.test(attemptCode));
  check('CTA "Entregar ensayo" sigue presente, sin cambiar su onPress (abre el Dialog, no envía directo)', /label="Entregar ensayo"[\s\S]{0,150}onPress=\{\(\) => setConfirmSubmit\(true\)\}/.test(attemptCode));
  check('Dialog sigue siendo el único, sin Modal nuevo agregado en este bloque', (attemptCode.match(/<Dialog/g) ?? []).length === 1 && !/<Modal\b/.test(attemptCode));
  check('sin nuevas dependencias -- import únicamente de react/react-native/expo-router/componentes ya usados', !/from '@/.test(attemptCode.replace(/from '@axioma\/contracts'/g, '')));
  // §13 -- bottom tab bar: decisión KEEP VISIBLE, sin cambios de navegación/tabBarStyle en este archivo.
  check('NO se tocó tabBarStyle/navigation.getParent() para ocultar la bottom tab bar (decisión: KEEP VISIBLE, sin hack)', !/tabBarStyle|getParent\(\)/.test(attemptCode));

  console.log('--- H8. Ensayo -- overlay real del RewardBurst + spacing inferior (VC4 MICROBLOQUE 5F.1) ---');
  // ROOT CAUSE: sin zIndex, el orden de pintado de hermanos superpuestos en
  // React Native sigue el orden del árbol -- montar <RewardBurst> ANTES de
  // header/ScrollView/footer (sin position:absolute) hacía que esos
  // hermanos, pintados DESPUÉS, quedaran por encima pese a que el burst
  // usaba `position:absolute`. Fix en dos capas: zIndex/elevation en el
  // propio componente (robusto para cualquier llamador futuro) + orden de
  // montaje como ÚLTIMO hermano en este caller (capa de seguridad extra).
  const rewardBurstJsxIdx = attemptCode.lastIndexOf('essayBurst ?');
  const dialogJsxIdx = attemptCode.indexOf('<Dialog');
  check('RewardBurst se monta DESPUÉS del <Dialog> (último hermano del árbol, no el primero) -- capa de seguridad de orden de pintado', rewardBurstJsxIdx !== -1 && dialogJsxIdx !== -1 && rewardBurstJsxIdx > dialogJsxIdx);
  check('reward-burst.tsx declara zIndex explícito en su View raíz -- overlay real sin depender sólo del orden del árbol', /zIndex:\s*999/.test(burstCode));
  check('reward-burst.tsx declara elevation explícito (Android respeta zIndex de hermanos superpuestos vía elevation)', /elevation:\s*999/.test(burstCode));
  check('el fix sigue siendo pointerEvents="none" (nunca bloquea interacción más allá de `submitting`)', /pointerEvents="none"/.test(burstCode));
  // VC4 MICROBLOQUE 5F.2 -- root cause real: la bottom tab bar (hermana de
  // este Stack) YA suma `insets.bottom` a su propia altura -- sumarlo TAMBIÉN
  // aquí duplicaba la reserva de safe-area. Se retiró `insets.bottom` del
  // paddingBottom de esta pantalla (queda sólo un respiro fijo pequeño).
  check('paddingBottom de la pantalla YA NO duplica insets.bottom (root cause real del hueco, no un ajuste por intuición)', !/paddingBottom:\s*insets\.bottom/.test(attemptCode) && /paddingBottom:\s*spacing\.space4/.test(attemptCode));
  check('flow result.ok -> setEssayBurst(true) -> onComplete -> goToResult() sigue intacto (sin cambios de lógica, sólo de montaje/orden)', /setEssayBurst\(false\);\s*\n\s*goToResult\(\);/.test(attemptCode));

  console.log('--- H9. Repasar recurso -- HARD READ-ONLY (VC4 MICROBLOQUE 6) ---');
  // §18 -- 12 checks. Todo contra ejercicioCode (comentarios ya despojados),
  // priorizando ausencia estructural (imposible de invocar) sobre un simple
  // guard textual, tal como pide §12 del prompt.
  check('existe el CTA "Repasar recurso"', /label="Repasar recurso"/.test(ejercicioCode));
  const reviewCtaIdx = ejercicioCode.indexOf('label="Repasar recurso"');
  const showCompletedIdxV6 = ejercicioCode.indexOf('if (showCompleted)');
  // El CTA vive dentro de `CompletionSummary`, una función SEPARADA definida
  // más abajo en el archivo -- sólo se invoca (`<CompletionSummary .../>`)
  // dentro de la rama `showCompleted`, nunca en la vista normal de pregunta.
  const completionSummaryDefIdx = ejercicioCode.indexOf('function CompletionSummary(');
  const completionSummaryUsageIdx = ejercicioCode.indexOf('<CompletionSummary');
  check('el CTA "Repasar recurso" SÓLO aparece dentro de la rama showCompleted (nunca en la vista normal de pregunta)', reviewCtaIdx > completionSummaryDefIdx && completionSummaryDefIdx !== -1 && completionSummaryUsageIdx > showCompletedIdxV6 && completionSummaryUsageIdx < completionSummaryDefIdx);
  // ReviewScreen es una función SEPARADA -- verificar que ni ELLA ni su bloque
  // de render (entre su firma y su cierre) referencian ninguna API/función de
  // escritura, en vez de sólo buscar la ausencia de un guard textual.
  const reviewScreenStart = ejercicioCode.indexOf('function ReviewScreen(');
  const reviewScreenEnd = ejercicioCode.indexOf('\nfunction StemContent', reviewScreenStart);
  const reviewScreenBody = ejercicioCode.slice(reviewScreenStart, reviewScreenEnd === -1 ? undefined : reviewScreenEnd);
  check('ReviewScreen existe como función propia, claramente delimitada', reviewScreenStart !== -1 && reviewScreenBody.length > 200);
  check('ReviewScreen NUNCA llama a la API de envío de respuesta (submitResponseViaOutbox no aparece en su cuerpo)', !reviewScreenBody.includes('submitResponseViaOutbox'));
  check('ReviewScreen NUNCA llama addOptimisticXp', !reviewScreenBody.includes('addOptimisticXp'));
  check('ReviewScreen NUNCA llama armStudyProgressReconciliation (sin rearmar reconciliación)', !reviewScreenBody.includes('armStudyProgressReconciliation'));
  check('ReviewScreen NUNCA referencia resourceJustCompleted (no puede disparar un nuevo completion)', !reviewScreenBody.includes('resourceJustCompleted'));
  check('ReviewScreen NUNCA importa/usa <RewardBurst> (sin burst en modo repaso)', !reviewScreenBody.includes('RewardBurst'));
  check('ReviewScreen NUNCA llama setState de progreso (setState/handleSelect no aparecen en su cuerpo)', !reviewScreenBody.includes('handleSelect') && !/\bsetState\(/.test(reviewScreenBody));
  check('las alternativas en Repaso son read-only: SIEMPRE disabled, onPress vacío (Pressable con disabled=true nunca invoca onPress)', /<AnswerOption[\s\S]{0,200}disabled\s*\n[\s\S]{0,400}onPress=\{\(\) => \{\}\}/.test(reviewScreenBody));
  check('Anterior/Siguiente de Repaso sólo tocan el estado local reviewIndex (setReviewIndex), nunca router/API', /setReviewIndex\(\(i\) => Math\.max/.test(reviewScreenBody) && /setReviewIndex\(\(i\) => Math\.min/.test(reviewScreenBody) && !reviewScreenBody.includes('router.'));
  check('"Salir del repaso" existe y usa onExit (vuelve al summary, sin nueva ruta)', /label="Salir del repaso"[\s\S]{0,60}onPress=\{onExit\}/.test(reviewScreenBody) || (reviewScreenBody.includes('Salir del repaso') && reviewScreenBody.includes('onPress={onExit}')));
  // VC4 MICROBLOQUE 6.1 -- load() ya no fija siempre `false`: ahora calcula
  // reviewMode explícitamente en CADA carga (`origin === 'resources' &&
  // completedNow`, nunca un valor heredado/persistido de un render anterior)
  // -- sigue sin "reabrir en Repaso automáticamente" salvo el atajo 6.1
  // explícito y autoritativo (probado aparte en H10).
  check('reentrada: load() SIEMPRE recalcula reviewMode/reviewIndex desde cero en cada carga (nunca persiste un reviewMode anterior)', /setReviewMode\(origin === 'resources' && completedNow\);\s*\n\s*setReviewIndex\(0\);/.test(ejercicioCode) && ejercicioCode.indexOf("setReviewMode(origin === 'resources' && completedNow)") < showCompletedIdxV6);
  check('Resource Completion 5B/5C permanece intacto: CompletionSummary sigue mostrando X/N + porcentaje (ver H5, sin cambios)', /\{correctCount\}\/\{totalCount\}/.test(ejercicioCode) && /\{percentage\}%/.test(ejercicioCode));

  console.log('--- H10. Resource section role / Review entry (VC4 MICROBLOQUE 6.1) ---');
  // §21 -- 13 checks. Todo contra código sin comentarios, priorizando
  // ausencia/presencia estructural sobre un simple guard textual.
  const recursosCode = recursosSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const unidadDetailCode = unidadDetailSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const recursoCode = recursoSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const studyNavCode = studyNavSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  // 1/2. Recursos abre completado -> Review; incompleto -> Study normal.
  check('recursos.tsx pasa origin "resources" explícito a resourceFlowNav (no inferido)', /resourceFlowNav\([\s\S]{0,200}'resources'\)/.test(recursosCode));
  check('unidad/[unitId].tsx (Unidades) pasa origin "unit" explícito', /resourceFlowNav\([\s\S]{0,200}'unit'\)/.test(unidadDetailCode));
  check('el origin viaja en los params devueltos por resourceFlowNav (contrato compartido)', /params:\s*\{[\s\S]{0,200}origin,/.test(studyNavCode));

  // 3/4. Review reutiliza ReviewScreen existente y sigue read-only (H9 ya
  // prueba la ausencia estructural de escritura en su cuerpo completo).
  check('ejercicio.tsx sigue usando exactamente el mismo componente ReviewScreen (una sola declaración, no duplicado)', (ejercicioCode.match(/function ReviewScreen\(/g) ?? []).length === 1);

  // 5. Origen explícito, no history inferida -- el guard de reviewMode no
  // depende de canGoBack/stack depth, sólo de `origin` (param explícito) +
  // `completedNow` (estado autoritativo).
  check('ejercicio.tsx deriva reviewMode SOLO de origin+estado autoritativo, no de canGoBack/stack depth', /setReviewMode\(origin === 'resources' && completedNow\)/.test(ejercicioCode) && !ejercicioCode.includes('canGoBack'));

  // 6. Salir desde Recursos vuelve a Recursos (no al summary, no genérico).
  check('existe backToRecursos() -> pushea a estudio/[subjectId]/recursos', /function backToRecursos\(\)[\s\S]{0,200}pathname:\s*'\/\(tabs\)\/estudio\/\[subjectId\]\/recursos'/.test(ejercicioCode));
  check('el exit de ReviewScreen es backToRecursos cuando origin === "resources" (y summary local en cualquier otro caso)', /const exitReview = origin === 'resources' \? backToRecursos : \(\) => setReviewMode\(false\);/.test(ejercicioCode));
  check('ReviewScreen recibe onExit={exitReview} (no un handler fijo)', /onExit=\{exitReview\}/.test(ejercicioCode));

  // 7/8/9. Unidades conserva flujo de completion normal: RewardBurst sólo en
  // completion NUEVO (handleSelect), nunca en el atajo de entrada directa.
  check('el atajo de entrada directa a Repaso vive SOLO en load() (mount), nunca dentro de handleSelect (fuente de RewardBurst/XP)', !/handleSelect[\s\S]{0,2000}setReviewMode\(origin/.test(ejercicioCode));
  check('RewardBurst sigue disparándose SOLO por outcome.data.resourceJustCompleted dentro de handleSelect (sin relación con origin)', /resourceJustCompleted\)\s*\{[\s\S]{0,300}setResourceBurst/.test(ejercicioCode));
  check('el guard de reviewMode usa completedNow (estado autoritativo derivado de answers/getTopicProgress), no solo el param origin', /completedNow = !firstUnanswered/.test(ejercicioCode));

  // 10. no Challenge/XP progress en review (ya cubierto por H9; reconfirmado
  // aquí contra el árbol completo del archivo, no sólo el cuerpo de la función).
  check('ningún caller de ReviewScreen le pasa armStudyProgressReconciliation/addOptimisticXp/RewardBurst como prop', !/<ReviewScreen[\s\S]{0,400}(armStudyProgressReconciliation|addOptimisticXp|RewardBurst)/.test(ejercicioCode));

  // 11. review request sobre incompleto no fuerza read-only incorrectamente
  // -- ya probado en study-navigation-gate (§32.3); reconfirmado aquí que la
  // ÚNICA llamada que ARMA reviewMode (`setReviewMode(...)`) exige
  // `origin === 'resources' && completedNow`, nunca `origin` por sí solo.
  // Otros usos de `origin === 'resources'` (exitReview/continueLabel/
  // onContinue, agregados en 6.1/6.1.1) deciden PRESENTACIÓN/DESTINO, nunca
  // si el modo es de escritura o lectura -- no forman parte de este check.
  const reviewModeFromOriginOccurrences = (ejercicioCode.match(/setReviewMode\(origin === 'resources'[^)]*\)/g) ?? []);
  check('origin=resources sobre un recurso NO completo cae al flujo normal (la única llamada setReviewMode basada en origin exige && completedNow)', reviewModeFromOriginOccurrences.length === 1 && reviewModeFromOriginOccurrences[0].includes('&& completedNow'));

  // 12. gating Premium existente permanece intacto -- recursos.tsx sigue
  // bloqueando FREE ANTES de listar/armar cualquier navegación.
  check('recursos.tsx conserva el gate Premium (FREE -> PremiumLockedScreen) sin tocar', /confirmedTier === 'FREE'[\s\S]{0,80}status:\s*'premium'/.test(recursosCode) && recursosCode.includes("PremiumLockedScreen origin=\"resources\""));

  // 13. sin nuevas dependencias -- recurso.tsx sólo agrega el forwarding del
  // param `origin` ya recibido por la ruta; ningún import nuevo.
  check('recurso.tsx declara el param origin y lo reenvía a ejercicio.tsx sin ningún import nuevo', /origin\?:\s*string/.test(recursoCode) && /origin:\s*origin\s*\?\?\s*''/.test(recursoCode) && !/^import .*reward-burst/m.test(recursoCode));

  console.log('--- H11. CompletionSummary CTA final respeta origin (VC4 MICROBLOQUE 6.1.1) ---');
  // CompletionSummary ya no recibe un label fijo: `continueLabel` es un prop
  // obligatorio (string), y el caller (ejercicio.tsx) lo decide leyendo
  // `origin`, el mismo param explícito ya aprobado en 6.1 -- nunca
  // `router.back()` incidental, ninguna ruta nueva.
  check('CompletionSummary declara el prop continueLabel: string (ya no hay label fijo "Volver a Unidades" hardcodeado en el botón)', /continueLabel:\s*string;/.test(ejercicioCode) && /label=\{continueLabel\}/.test(ejercicioCode));
  check('origin === "unit" -> continueLabel "Volver a Unidades" + destino backToUnidades', /continueLabel=\{origin === 'resources' \? 'Volver a Recursos' : 'Volver a Unidades'\}/.test(ejercicioCode));
  check('origin === "resources" -> onContinue es backToRecursos (mismo destino que "Salir del repaso", no una ruta nueva)', /onContinue=\{origin === 'resources' \? backToRecursos : backToUnidades\}/.test(ejercicioCode));
  check('no se introdujo router.back() incidental para este CTA', !/onContinue=\{.*router\.back/.test(ejercicioCode));
  check('no se creó ninguna ruta/pathname nueva -- backToRecursos sigue siendo el único destino "resources" ya usado por exitReview', (ejercicioCode.match(/pathname:\s*'\/\(tabs\)\/estudio\/\[subjectId\]\/recursos'/g) ?? []).length === 1);
  // Se mantienen intactos: Repasar recurso, RewardBurst, score, XP,
  // completion, ReviewScreen HARD READ-ONLY, gating Premium -- reconfirmado
  // contra los checks H5/H9/H10 ya existentes (sin tocarlos), este bloque
  // sólo agrega cobertura del CTA nuevo.
  check('"Repasar recurso" sigue presente sin cambios (no se tocó al agregar continueLabel)', /label="Repasar recurso"/.test(ejercicioCode));

  console.log('--- H12. Remove Review CTA from Units summary (VC4 MICROBLOQUE 6.1.2) ---');
  // 1/2 -- origin='unit' NO muestra "Repasar recurso", mantiene "Volver a
  // Unidades". `onReview` sólo se pasa cuando origin === 'resources'
  // (ternario explícito en el caller) -- para 'unit' llega `undefined`, y el
  // botón NO se renderiza (guard `onReview ? <Button.../> : null`, nunca un
  // botón deshabilitado ni un hueco vacío).
  check('onReview sólo se pasa cuando origin === "resources" (ternario explícito, undefined en cualquier otro caso)', /onReview=\{\s*\n\s*origin === 'resources'\s*\n\s*\?\s*\(\)\s*=>\s*\{/.test(ejercicioCode));
  check('CompletionSummary declara onReview?: () => void (opcional -- ausente es un estado válido, no un error)', /onReview\?:\s*\(\)\s*=>\s*void;/.test(ejercicioCode));
  check('el botón "Repasar recurso" SÓLO se renderiza si onReview existe (onReview ? <Button.../> : null) -- nunca deshabilitado, nunca un hueco', /\{onReview \? <Button variant="secondary" label="Repasar recurso" onPress=\{onReview\}[\s\S]{0,40}: null\}/.test(ejercicioCode));
  check('origin "unit" sigue mostrando "Volver a Unidades" como único CTA (continueLabel/onContinue de H11 sin cambios)', /continueLabel=\{origin === 'resources' \? 'Volver a Recursos' : 'Volver a Unidades'\}/.test(ejercicioCode));

  // 3 -- completed desde Resources sigue entrando DIRECTO a Review (sin
  // tocar el guard de reviewMode de H10/H11).
  check('completed desde Resources sigue entrando directo a Review (guard de reviewMode intacto)', /setReviewMode\(origin === 'resources' && completedNow\)/.test(ejercicioCode));

  // 4 -- Resources incomplete -> completion NUEVO (handleSelect) -> summary
  // con "Volver a Recursos" (onReview SÍ presente ahí, por origin==='resources').
  check('Resources incomplete + completion nuevo -> CompletionSummary con "Volver a Recursos" (origin sigue siendo resources)', /continueLabel=\{origin === 'resources' \? 'Volver a Recursos'/.test(ejercicioCode));

  // 5/6 -- ReviewScreen sigue read-only; RewardBurst/completion intactos --
  // ya cubiertos por H9/H10, reconfirmados aquí sin haber tocado esas líneas.
  check('ReviewScreen sigue siendo la única función, sin cambios de firma (H9 intacto)', (ejercicioCode.match(/function ReviewScreen\(/g) ?? []).length === 1);
  check('RewardBurst de completion nuevo sigue intacto (misma condición resourceJustCompleted de H10, no tocada en 6.1.2)', /resourceJustCompleted\)\s*\{[\s\S]{0,300}setResourceBurst/.test(ejercicioCode));

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de pulido B8 pasaron.');
}

main();
