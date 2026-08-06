// Lógica pura -- sin imports de RN/Expo, gateable con `tsx` puro, mismo
// criterio que `lib/leaderboard/paginate-leaderboard.ts`.

export type PositionCardVariant = 'own' | 'other';

export type PositionCardEmptyState = { message: string; showAction: boolean };

/**
 * Copy de `<PositionCard>` cuando `competitive` es `null` (sin
 * participación activa, ADR-0021 §2) -- MISMO componente en ambas
 * pantallas (propia y de terceros), copy CONTEXTUAL según `variant`
 * (precisión obligatoria del Product Owner):
 * - `own`: invita a actuar ("Aún no participas en una liga activa"),
 *   con acceso a Competir (`showAction: true`).
 * - `other`: solo informa ("No participa en la liga actual"), sin
 *   ninguna acción posible sobre la cuenta de otra persona.
 */
export function describePositionCardEmptyState(variant: PositionCardVariant): PositionCardEmptyState {
  if (variant === 'own') {
    return { message: 'Aún no participas en una liga activa', showAction: true };
  }
  return { message: 'No participa en la liga actual', showAction: false };
}
