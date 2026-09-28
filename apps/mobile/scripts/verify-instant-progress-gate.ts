// VC4 (Instant Progress) -- gate de `instant-xp-store.ts`. Lógica PURA, sin
// SQLite ni módulos nativos (a diferencia de `pending-lp-store.ts`, XP no
// necesita persistir -- ver el docstring del store), así que corre
// directamente con `tsx`, sin adaptador especial.
//
// Cubre:
//   1. Completar actividad -> XP local actualizado inmediatamente (addOptimisticXp).
//   2. Respuesta backend confirmando la misma recompensa -> no hay doble suma (reconcileXp).
//   3. Refetch posterior -> no sobrescribe incorrectamente el estado inmediato (delta parcial).
//   4. Reintentos/replays -> no duplicar XP (dos addOptimisticXp reales de dos actividades reales, cada una su propio delta).
//   5. applyOptimisticXpOverlay -- nunca se sale de la barra, nunca inventa un level-up.
//   6. Notificación de suscriptores (multipantalla: cualquier listener ve el MISMO valor).
import type { LevelProgressResponse } from '@axioma/contracts';
import {
  addOptimisticXp,
  reconcileXp,
  getOptimisticXpDelta,
  subscribeInstantXp,
  applyOptimisticXpOverlay,
  XP_REWARD_BY_ACTIVITY_TYPE,
} from '../lib/progress/instant-xp-store';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

function level(overrides: Partial<LevelProgressResponse>): LevelProgressResponse {
  return {
    lifetimeXp: 1000,
    currentLevel: { levelNumber: 5, levelName: 'Nivel 5', minimumLifetimeXp: 900 },
    nextLevel: { levelNumber: 6, levelName: 'Nivel 6', minimumLifetimeXp: 1100 },
    xpIntoLevel: 40,
    xpForNextLevel: 100,
    progressRatio: 0.4,
    ...overrides,
  };
}

async function main() {
  console.log('--- 1. Completar actividad -> XP local actualizado inmediatamente ---');
  check('sin actividad todavía, delta == 0', getOptimisticXpDelta() === 0);
  addOptimisticXp(XP_REWARD_BY_ACTIVITY_TYPE.RESPUESTA_VALIDADA);
  check('tras RESPUESTA_VALIDADA (+2), delta == 2 -- disponible de inmediato, sin esperar red', getOptimisticXpDelta() === 2);

  console.log('--- 2. Notificación de suscriptores (multipantalla) ---');
  let notifications = 0;
  const unsubscribe = subscribeInstantXp(() => {
    notifications++;
  });
  addOptimisticXp(XP_REWARD_BY_ACTIVITY_TYPE.TEMA_COMPLETADO);
  check('un segundo addOptimisticXp (+20, TEMA_COMPLETADO) notifica a los suscriptores', notifications === 1);
  check('el delta acumula ambas actividades reales (2 + 20 = 22) -- nunca reemplaza, siempre suma', getOptimisticXpDelta() === 22);

  console.log('--- 3. Primera reconciliación: solo fija el baseline, NUNCA resta antes de tener un baseline real ---');
  reconcileXp(1000); // "lifetimeXp autoritativo" ANTES de que el backend procesara ninguna de las dos actividades.
  check('el delta optimista NO se toca en la primera reconciliación (no hay baseline previo que comparar)', getOptimisticXpDelta() === 22);

  console.log('--- 4. Backend confirma UNA de las dos actividades (+2 real) -> reconcilia SOLO eso, sin doble suma ---');
  reconcileXp(1002); // +2 real confirmado (RESPUESTA_VALIDADA ya otorgada)
  check('el delta optimista baja EXACTAMENTE en 2 (22 -> 20) -- ni de más ni de menos', getOptimisticXpDelta() === 20);

  console.log('--- 5. Refetch posterior sin cambios reales -> NO sobrescribe el estado inmediato restante ---');
  reconcileXp(1002); // mismo valor, sin incremento real
  check('un refetch que NO trae un incremento real deja el delta optimista intacto (20)', getOptimisticXpDelta() === 20);

  console.log('--- 6. Backend confirma el resto (+20 real, TEMA_COMPLETADO) -> converge a 0, nunca negativo ---');
  reconcileXp(1022);
  check('el delta optimista llega EXACTAMENTE a 0 -- todo lo pendiente quedó confirmado', getOptimisticXpDelta() === 0);

  console.log('--- 7. Un delta confirmado MAYOR al pendiente nunca deja el store en negativo ---');
  addOptimisticXp(5);
  reconcileXp(1122); // +100 real (mucho más que los 5 pendientes -- ej. otra actividad grande otorgada primero)
  check('nunca queda negativo (se acota en 0, invariante anti-doble-resta)', getOptimisticXpDelta() === 0);

  unsubscribe();

  console.log('--- 8. applyOptimisticXpOverlay -- nunca se sale de la barra ---');
  const midLevel = level({ xpIntoLevel: 40, xpForNextLevel: 100, progressRatio: 0.4, lifetimeXp: 1000 });
  const overlaySmall = applyOptimisticXpOverlay(midLevel, 20);
  check('delta pequeño: xpIntoLevel sube tal cual (40+20=60)', overlaySmall.xpIntoLevel === 60);
  check('progressRatio recalculado consistente con xpIntoLevel/xpForNextLevel (0.6)', overlaySmall.progressRatio === 0.6);
  check('lifetimeXp también sube (1000+20=1020)', overlaySmall.lifetimeXp === 1020);
  check('currentLevel.levelNumber NUNCA cambia -- ningún level-up se inventa aquí', overlaySmall.currentLevel.levelNumber === midLevel.currentLevel.levelNumber);

  const overlayOverflow = applyOptimisticXpOverlay(midLevel, 9999);
  check('delta que desborda el nivel -> xpIntoLevel se ACOTA al techo (100), nunca lo excede', overlayOverflow.xpIntoLevel === 100);
  check('progressRatio acotado a 1 (nunca > 1, nunca sugiere una barra rota)', overlayOverflow.progressRatio === 1);
  check('lifetimeXp SÍ refleja el delta completo (sin techo -- es un contador total, no una barra)', overlayOverflow.lifetimeXp === 1000 + 9999);

  const overlayZero = applyOptimisticXpOverlay(midLevel, 0);
  check('delta == 0 -> devuelve el nivel TAL CUAL (misma referencia de valores, sin overlay superfluo)', overlayZero.xpIntoLevel === 40 && overlayZero.progressRatio === 0.4);

  console.log('--- 9. applyOptimisticXpOverlay en el nivel MÁXIMO (xpForNextLevel === null) -- sin techo que acotar ---');
  const maxLevel = level({ xpIntoLevel: 0, xpForNextLevel: null, progressRatio: 1, lifetimeXp: 50_000 });
  const overlayMax = applyOptimisticXpOverlay(maxLevel, 20);
  check('lifetimeXp sube sin techo (50000+20)', overlayMax.lifetimeXp === 50_020);
  check('xpIntoLevel/progressRatio del nivel máximo NUNCA se tocan (no hay "próximo nivel" que llenar)', overlayMax.xpIntoLevel === 0 && overlayMax.progressRatio === 1);

  console.log('');
  if (failures > 0) {
    console.error(`${failures} verificación(es) fallaron.`);
    process.exit(1);
  }
  console.log('Todas las verificaciones del gate de INSTANT-PROGRESS (XP) pasaron.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
