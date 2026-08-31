import { useCallback, useRef, useState } from 'react';
import type { ChallengeSummary } from '@axioma/contracts';
import { claimChallenge } from '../../lib/api/challenges';

export interface UseChallengeClaimHandlers {
  /** Aplica al estado local la fila REAL que devolvió el servidor tras un claim confirmado. */
  onClaimed: (updated: ChallengeSummary) => void;
  /**
   * El backend contradijo la vista local (404 not_found / 409 not_completed):
   * la colección local está desactualizada y debe recargarse. Nunca se
   * asume el estado -- se delega la verdad al backend, igual que antes.
   */
  onReconcile: () => void | Promise<void>;
}

export interface ChallengeClaim {
  /** id del desafío cuyo claim está en curso, o `null`. */
  claimingId: string | null;
  /**
   * Mensaje de error por desafío (503 reintentable / red / error
   * inesperado). Se limpia al reintentar ESE mismo desafío.
   */
  errors: Record<string, string>;
  /** Dispara el claim de un desafío. Ignorado si ya hay uno en curso -- misma semántica que antes. */
  claim: (accountChallengeId: string) => Promise<void>;
  /**
   * `true` mientras CUALQUIER claim está en curso -- para deshabilitar
   * todos los botones a la vez, igual que la pantalla hacía con
   * `disabled={claimingId !== null}`.
   */
  claiming: boolean;
}

/**
 * DESAFÍOS -- flujo de reclamación reutilizable, extraído SIN cambios de
 * `competir/index.tsx` (Bloque III, sub-incremento 4.d). Una sola fuente de
 * verdad para claim -> respuesta del servidor -> (actualización local |
 * reconciliación | error localizado), para que el hub y la futura pantalla
 * completa de Desafíos la compartan sin duplicar la lógica.
 *
 * NO introduce fetch propio, polling ni optimismo: el llamador sigue siendo
 * dueño de la colección (`onClaimed` recibe la fila REAL del servidor,
 * `onReconcile` recarga). Mismo backend, mismos endpoints, misma semántica
 * de 200/404/409/503/red que `mapClaimResult`. El bloqueo de reentrada
 * (`inFlightRef`) replica exactamente el `if (claimingId !== null) return`
 * previo.
 */
export function useChallengeClaim({ onClaimed, onReconcile }: UseChallengeClaimHandlers): ChallengeClaim {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlightRef = useRef(false);

  const claim = useCallback(
    async (accountChallengeId: string) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setClaimingId(accountChallengeId);
      setErrors((prev) => {
        if (!(accountChallengeId in prev)) return prev;
        const next = { ...prev };
        delete next[accountChallengeId];
        return next;
      });

      const outcome = await claimChallenge(accountChallengeId);

      inFlightRef.current = false;
      setClaimingId(null);

      if (outcome.kind === 'ok') {
        onClaimed(outcome.data);
        return;
      }
      if (outcome.kind === 'not_completed' || outcome.kind === 'not_found') {
        // La vista local está desactualizada -> recargar TODO. Se limpian
        // también los errores localizados, igual que hacía el `load()`
        // previo (`setItemErrors({})`).
        setErrors({});
        await onReconcile();
        return;
      }
      // 503 retryable | red | error inesperado -- todos traen `message`.
      setErrors((prev) => ({ ...prev, [accountChallengeId]: outcome.message }));
    },
    [onClaimed, onReconcile],
  );

  return { claimingId, errors, claim, claiming: claimingId !== null };
}
