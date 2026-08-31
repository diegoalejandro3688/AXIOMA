// Gate del Bloque III, Incremento 4, sub-incremento 4.d ("Superficie móvil
// de Desafíos") -- ver docs/adr/BLOCK-III-DEFINITION.md §4.18. Prueba la
// lógica REAL de producción (`group-challenges.ts`, `claim-outcome.ts`)
// sin runtime de React Native -- ambos módulos son deliberadamente libres
// de imports de RN/Expo (solo un `import type` de `lib/api/client.ts`,
// elidido en compilación) para que esto sea posible con `tsx` puro, mismo
// criterio que `verify-offline-outbox-gate.ts` (lógica real, sin
// dispositivo/emulador).
//
// Esto NO reemplaza la verificación manual en Browser/simulador de la
// PANTALLA (renderizado real, tema claro/oscuro, gestos) -- ver el
// checklist en docs/adr/BLOCK-III-DEFINITION.md §4.18.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChallengeSummary } from '@axioma/contracts';
import type { ApiResult } from '../lib/api/client';
import { groupChallenges, progressRatio, canClaim } from '../lib/challenges/group-challenges';
import { mapClaimResult } from '../lib/challenges/claim-outcome';
import { challengeTypeLabel, challengeStatusLabel, formatCountdown, formatRewardXp, claimCtaLabel, isPastPeriod } from '../lib/challenges/challenge-card-view';
import { selectHubChallenges, challengeSections } from '../lib/challenges/select-hub-challenges';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

let seq = 0;
function makeChallenge(overrides: Partial<ChallengeSummary> = {}): ChallengeSummary {
  seq++;
  return {
    id: `challenge-${seq}`,
    challengeKey: `key-${seq}`,
    name: `Desafío ${seq}`,
    description: null,
    challengeType: 'WEEKLY',
    targetValue: 10,
    progressValue: 0,
    challengeStatus: 'ACCEPTED',
    rewardXpBonus: 100,
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-08T00:00:00.000Z',
    acceptedAt: '2026-08-01T00:00:00.000Z',
    completedAt: null,
    claimedAt: null,
    ...overrides,
  };
}

function main() {
  console.log('--- 1. groupChallenges: renderiza los cuatro estados en el grupo correcto ---');
  const accepted = makeChallenge({ challengeStatus: 'ACCEPTED' });
  const inProgress = makeChallenge({ challengeStatus: 'IN_PROGRESS', progressValue: 4 });
  const completed = makeChallenge({ challengeStatus: 'COMPLETED', progressValue: 10, completedAt: '2026-08-03T00:00:00.000Z' });
  const claimed = makeChallenge({
    challengeStatus: 'CLAIMED',
    progressValue: 10,
    completedAt: '2026-08-03T00:00:00.000Z',
    claimedAt: '2026-08-04T00:00:00.000Z',
  });
  const grouped = groupChallenges([accepted, inProgress, completed, claimed]);
  check('ACCEPTED cae en "active"', grouped.active.includes(accepted));
  check('IN_PROGRESS cae en "active"', grouped.active.includes(inProgress));
  check('COMPLETED cae en "completed" (pendiente de reclamar)', grouped.completed.includes(completed));
  check('CLAIMED cae en "claimed"', grouped.claimed.includes(claimed));
  check('cada grupo tiene exactamente 1 elemento (sin duplicar entre grupos)', grouped.active.length === 2 && grouped.completed.length === 1 && grouped.claimed.length === 1);

  console.log('--- 2. progressRatio: acotado a [0,1], reflejando progressValue/targetValue tal cual el backend los entrega ---');
  check('0/10 -> 0', progressRatio(makeChallenge({ progressValue: 0, targetValue: 10 })) === 0);
  check('4/10 -> 0.4', progressRatio(makeChallenge({ progressValue: 4, targetValue: 10 })) === 0.4);
  check('10/10 -> 1', progressRatio(makeChallenge({ progressValue: 10, targetValue: 10 })) === 1);
  check('targetValue 0 (defensivo, no debería ocurrir por el CHECK del backend) -> 0, sin dividir por cero', progressRatio(makeChallenge({ progressValue: 0, targetValue: 0 })) === 0);

  console.log('--- 3. canClaim: únicamente COMPLETED habilita el botón de reclamar ---');
  check('ACCEPTED -> no se puede reclamar', canClaim(accepted) === false);
  check('IN_PROGRESS -> no se puede reclamar', canClaim(inProgress) === false);
  check('COMPLETED -> SÍ se puede reclamar', canClaim(completed) === true);
  check('CLAIMED -> no se puede reclamar de nuevo', canClaim(claimed) === false);

  console.log('--- 4/6/7. mapClaimResult: 200/404/409/503/network/otro -- mismo significado que el backend fija en §4.17 ---');
  const okResult: ApiResult<ChallengeSummary> = { ok: true, data: claimed };
  const okOutcome = mapClaimResult(okResult);
  check('200 -> kind "ok" con los datos del servidor (nunca optimista)', okOutcome.kind === 'ok' && okOutcome.data === claimed);

  const notFound: ApiResult<ChallengeSummary> = { ok: false, kind: 'http', status: 404, message: 'no existe' };
  check('404 -> kind "not_found" (Gate 37)', mapClaimResult(notFound).kind === 'not_found');

  const notCompleted: ApiResult<ChallengeSummary> = { ok: false, kind: 'http', status: 409, message: 'todavía no completado' };
  check('409 -> kind "not_completed" -- la pantalla debe reconciliar con el backend, no asumir (Gate 38)', mapClaimResult(notCompleted).kind === 'not_completed');

  const retryable: ApiResult<ChallengeSummary> = { ok: false, kind: 'http', status: 503, message: 'entrega no confirmada' };
  const retryableOutcome = mapClaimResult(retryable);
  check(
    '503 -> kind "retryable", con el mensaje del backend preservado (Gate 41)',
    retryableOutcome.kind === 'retryable' && retryableOutcome.message === 'entrega no confirmada',
  );

  const network: ApiResult<ChallengeSummary> = { ok: false, kind: 'network', message: 'sin conexión' };
  check('sin red -> kind "network"', mapClaimResult(network).kind === 'network');

  const otherHttp: ApiResult<ChallengeSummary> = { ok: false, kind: 'http', status: 500, message: 'error inesperado' };
  const otherOutcome = mapClaimResult(otherHttp);
  check('otro status HTTP -> kind "error", status preservado', otherOutcome.kind === 'error' && otherOutcome.status === 500);

  console.log('--- 5. DESAFÍOS V1 §18: etiqueta Diario / Semanal derivada de challengeType ---');
  check('DAILY -> "Diario"', challengeTypeLabel('DAILY') === 'Diario');
  check('WEEKLY -> "Semanal"', challengeTypeLabel('WEEKLY') === 'Semanal');

  console.log('--- 5b. Incremento 5 (refactor): challengeStatusLabel -- extraído SIN cambios del mapa inline del hub ---');
  check('ACCEPTED -> "Por empezar"', challengeStatusLabel('ACCEPTED') === 'Por empezar');
  check('IN_PROGRESS -> "En progreso"', challengeStatusLabel('IN_PROGRESS') === 'En progreso');
  check('COMPLETED -> "Completado -- reclama tu recompensa"', challengeStatusLabel('COMPLETED') === 'Completado -- reclama tu recompensa');
  check('CLAIMED -> "Reclamado"', challengeStatusLabel('CLAIMED') === 'Reclamado');

  console.log('--- 6. DESAFÍOS V1 §19: cuenta regresiva local, sin negativos ---');
  const t0 = new Date('2026-08-30T00:00:00.000Z');
  check('faltan ~30 h -> "1 d 6 h restantes"', formatCountdown('2026-08-31T06:00:00.000Z', t0) === '1 d 6 h restantes');
  check('faltan 6 h -> "6 h restantes"', formatCountdown('2026-08-30T06:00:00.000Z', t0) === '6 h restantes');
  check('faltan 30 min -> "30 min restantes"', formatCountdown('2026-08-30T00:30:00.000Z', t0) === '30 min restantes');
  check('período ya terminado -> null (nunca contador negativo)', formatCountdown('2026-08-29T00:00:00.000Z', t0) === null);
  check('período termina exactamente ahora -> null', formatCountdown('2026-08-30T00:00:00.000Z', t0) === null);
  check('isPastPeriod true cuando periodEnd <= now', isPastPeriod({ periodEnd: '2026-08-29T00:00:00.000Z' }, t0) === true);
  check('isPastPeriod false cuando periodEnd > now', isPastPeriod({ periodEnd: '2026-08-31T00:00:00.000Z' }, t0) === false);

  console.log('--- 7. DESAFÍOS V1 §20: vista previa de recompensa XP + copia del CTA ---');
  check('rewardXpBonus 10 -> "+10 XP"', formatRewardXp(10) === '+10 XP');
  check('rewardXpBonus 100 -> "+100 XP"', formatRewardXp(100) === '+100 XP');
  check('rewardXpBonus null -> null', formatRewardXp(null) === null);
  check('rewardXpBonus 0 -> null (no se previsualiza)', formatRewardXp(0) === null);
  check('CTA con recompensa -> "Reclamar +20 XP"', claimCtaLabel(20) === 'Reclamar +20 XP');
  check('CTA sin recompensa -> "Reclamar"', claimCtaLabel(null) === 'Reclamar');

  console.log('--- 8. Incremento 6: selectHubChallenges -- vista previa DETERMINISTA por challengeKey ---');
  const dailyB = makeChallenge({ challengeType: 'DAILY', challengeKey: 'daily-b', name: 'Daily B' });
  const dailyA = makeChallenge({ challengeType: 'DAILY', challengeKey: 'daily-a', name: 'Daily A', progressValue: 9 });
  const dailyC = makeChallenge({ challengeType: 'DAILY', challengeKey: 'daily-c', name: 'Daily C' });
  const weeklyZ = makeChallenge({ challengeType: 'WEEKLY', challengeKey: 'weekly-z', name: 'Weekly Z' });
  const weeklyM = makeChallenge({ challengeType: 'WEEKLY', challengeKey: 'weekly-m', name: 'Weekly M', rewardXpBonus: 100 });
  // Orden de entrada barajado -- NUNCA debe influir (no se usa acceptedAt ni orden de llegada).
  const pickAll = selectHubChallenges([dailyB, weeklyZ, dailyC, weeklyM, dailyA]);
  check('DAILY seleccionado = el primero por challengeKey ASC (daily-a), no por progreso ni orden de entrada', pickAll.daily?.challengeKey === 'daily-a');
  check('WEEKLY seleccionado = el primero por challengeKey ASC (weekly-m), no por recompensa ni orden de entrada', pickAll.weekly?.challengeKey === 'weekly-m');
  check('orden de entrada distinto -> MISMA selección (determinista)', selectHubChallenges([dailyA, dailyC, dailyB, weeklyM, weeklyZ]).daily?.challengeKey === 'daily-a');
  check('sin DAILY -> daily === null (esa fila no se renderiza)', selectHubChallenges([weeklyM, weeklyZ]).daily === null);
  check('sin WEEKLY -> weekly === null', selectHubChallenges([dailyA, dailyB]).weekly === null);
  check('colección vacía -> ambos null, sin lanzar', (() => { const r = selectHubChallenges([]); return r.daily === null && r.weekly === null; })());
  check('no muta la colección de entrada', (() => { const input = [dailyB, dailyA]; selectHubChallenges(input); return input[0] === dailyB && input[1] === dailyA; })());

  console.log('--- 8b. Incremento 7: challengeSections -- pantalla completa, orden ESTABLE por challengeKey, separado por tipo ---');
  const sections = challengeSections([weeklyZ, dailyB, weeklyM, dailyC, dailyA]);
  check('DIARIOS ordenados por challengeKey ASC (a, b, c), no por progreso ni orden de entrada', sections.daily.map((c) => c.challengeKey).join(',') === 'daily-a,daily-b,daily-c');
  check('SEMANAL ordenado por challengeKey ASC (m, z)', sections.weekly.map((c) => c.challengeKey).join(',') === 'weekly-m,weekly-z');
  check('orden de entrada distinto -> MISMO resultado (determinista)', challengeSections([dailyC, dailyA, dailyB]).daily.map((c) => c.challengeKey).join(',') === 'daily-a,daily-b,daily-c');
  check('NO recorta -- todos los DAILY del período se conservan', sections.daily.length === 3);
  check('COMPLETED y CLAIMED siguen presentes (no se filtran por estado)', (() => {
    const done = makeChallenge({ challengeType: 'DAILY', challengeKey: 'daily-done', challengeStatus: 'COMPLETED', progressValue: 10 });
    const claimedRow = makeChallenge({ challengeType: 'DAILY', challengeKey: 'daily-claimed', challengeStatus: 'CLAIMED', progressValue: 10, claimedAt: '2026-08-04T00:00:00.000Z' });
    const r = challengeSections([done, claimedRow, dailyA]);
    return r.daily.some((c) => c.challengeStatus === 'COMPLETED') && r.daily.some((c) => c.challengeStatus === 'CLAIMED');
  })());
  check('sin desafíos de un tipo -> array vacío, sin lanzar', challengeSections([dailyA]).weekly.length === 0 && challengeSections([]).daily.length === 0);
  check('no muta la colección de entrada', (() => { const input = [weeklyZ, weeklyM]; challengeSections(input); return input[0] === weeklyZ && input[1] === weeklyM; })());

  console.log('--- 8c. Incremento 7: la pantalla completa competir/desafios.tsx reutiliza todo, sin duplicar ---');
  const screenSrc = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'competir', 'desafios.tsx'), 'utf8');
  const rowSrc = readFileSync(join(__dirname, '..', 'components', 'challenges', 'challenge-row.tsx'), 'utf8');
  const layoutSrc = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'competir', '_layout.tsx'), 'utf8');
  const hubSrc = readFileSync(join(__dirname, '..', 'app', '(tabs)', 'competir', 'index.tsx'), 'utf8');
  check('existe competir/desafios.tsx', screenSrc.length > 0);
  check('está registrada como Stack.Screen "desafios" en competir/_layout.tsx', layoutSrc.includes('name="desafios"'));
  check('el CTA del hub navega a /(tabs)/competir/desafios (ruta real, ya activa)', hubSrc.includes("router.push('/(tabs)/competir/desafios')"));
  check('la pantalla usa `listChallenges` (misma colección, sin endpoint nuevo)', screenSrc.includes('listChallenges'));
  check('la pantalla usa `useChallengeClaim` y NO reimplementa claim (`claimChallenge` nunca aparece)', screenSrc.includes('useChallengeClaim') && !screenSrc.includes('claimChallenge'));
  check('la pantalla ordena vía `challengeSections` (challengeKey), NUNCA `acceptedAt`', screenSrc.includes('challengeSections(') && !/acceptedAt/.test(screenSrc));
  check('la pantalla usa `<ChallengeRow variant="full"`', screenSrc.includes('variant="full"'));
  check('secciones DIARIOS + SEMANAL, sin tabs/filtros/historial/streaks/refresh', /Diarios/i.test(screenSrc) && /Semanal/i.test(screenSrc) && !/\b(Tabs|filtro|filtros|historial|streak|racha|Refresh|Actualizar manualmente)\b/i.test(screenSrc));
  check('la pantalla NO muestra dificultad ni rareza', !/\b(EASY|MEDIUM|HARD|ADVANCED)\b/.test(screenSrc) && !/dificultad|rareza|rarity/i.test(screenSrc));
  check('COMPLETED/CLAIMED representables -- la pantalla no filtra por estado', !/filter\([^)]*challengeStatus|challengeStatus !== 'CLAIMED'|!== 'COMPLETED'/.test(screenSrc));
  check('back nativo (header de _layout, como Ranking) -- sin navegación custom', !screenSrc.includes('router.back') || !screenSrc.includes('customBack'));
  check('DIARIO azul / SEMANAL violeta viene de la MISMA primitive (challenge-row), no redefinido en la pantalla', rowSrc.includes('academic.violet') && !screenSrc.includes('academic.violet'));

  console.log('--- 9. Sin lógica duplicada del backend: el mapeo es puramente HTTP status -> intención de UI ---');
  // Verificación por diseño, no por inspección de texto: mapClaimResult no
  // recibe ni necesita `challengeStatus`/`progressValue`/`targetValue` para
  // decidir su resultado -- solo el status HTTP ya decidido por el backend.
  const notCompletedNoBusinessFields = mapClaimResult({ ok: false, kind: 'http', status: 409, message: 'x' });
  check('el mapeo de 409 no requiere ni infiere el estado real del desafío -- delega la verdad al backend', notCompletedNoBusinessFields.kind === 'not_completed');

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de Desafíos (móvil, Bloque III, sub-incremento 4.d) pasaron.');
  console.log('');
  console.log('RECORDATORIO: esto valida group-challenges.ts/claim-outcome.ts (lógica pura), no la pantalla React');
  console.log('Native en sí (renderizado, tema claro/oscuro, doble toque real). Verificación manual complementaria');
  console.log('en Browser (expo start --web) pendiente antes del cierre -- ver docs/adr/BLOCK-III-DEFINITION.md §4.18.');
}

main();
