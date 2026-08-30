/**
 * COSMETICS-V1 / B1 (decisión Product/TPM) -- escalera de niveles 1..70.
 *
 * La progresión ya fijada por los niveles 1..10 (`seedLevelLadder`,
 * Bloque II) es: incremento de nivel n-1 a n = `50 * n`. Fórmula cerrada
 * equivalente, que reproduce EXACTAMENTE los umbrales 1..10 existentes y la
 * extiende hasta 70:
 *
 *   minimumLifetimeXp(n) = 25 * n * (n + 1) - 50   para n = 1..70
 *
 * Checkpoints (§1 de la decisión): 10=2700, 15=5950, 20=10450, 30=23200,
 * 35=31450, 40=40950, 50=63700, 55=76950, 60=91450, 70=124200.
 *
 * NO es un segundo sistema de niveles -- es la misma tabla `level_definition`
 * y el mismo mecanismo `LevelDefinition.rewardBundleId` -> `RewardEvaluationWorker`.
 */

export const V1_MAX_LEVEL = 70;

/** Umbral de XP acumulada para alcanzar el nivel `n` (n = 1..70). */
export function levelMinimumLifetimeXp(n: number): number {
  return 25 * n * (n + 1) - 50;
}

/** La escalera completa 1..70, en orden. */
export function levelLadderThresholds(): Array<{ levelNumber: number; minimumLifetimeXp: number }> {
  return Array.from({ length: V1_MAX_LEVEL }, (_, i) => ({
    levelNumber: i + 1,
    minimumLifetimeXp: levelMinimumLifetimeXp(i + 1),
  }));
}
