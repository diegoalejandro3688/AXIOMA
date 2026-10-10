import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAds } from './ads-provider';
import { readAdUnitEnv, resolveAdUnitId } from './ad-unit-ids';
import { adsDevLog } from './ads-log';
import { createQuickExitInterstitialAd } from './ads-interstitial-sdk';
import { commitInterstitialShow, getInterstitialSession } from './interstitial-session';
import { QuickExitInterstitialController, type QuickExitInput } from './quick-exit-interstitial-controller';

/**
 * ADS V1 -- ADS-1C. Une el estado de `useAds()` con el controlador del
 * intersticial de salida de Quick. La logica vive en el controlador (puro);
 * aqui solo se lee la elegibilidad, se crea/descarta el controlador con la
 * pantalla y se expone `requestExit`.
 *
 * - `quickClosed` = la sesion de Quick esta realmente CERRADA (`isQuickSessionTerminal`);
 *   con Quick activo (incluido el resultado de cada pregunta) es siempre false.
 * - Se desmonta con la pantalla (logout, cambio de cuenta o salir de Quick
 *   desmontan el arbol): el anuncio cargado se descarta, nunca se reutiliza.
 * - `requestExit` lee el estado MAS RECIENTE de `useAds()` en el instante de la
 *   pulsacion (via ref), no el de cuando se cargo el anuncio.
 * - Si no hay controlador (p. ej. antes de montar), navega de inmediato.
 */
export function useQuickExitInterstitial(quickClosed: boolean): { requestExit: (navigate: () => void) => void } {
  const ads = useAds();
  const unitId = useMemo(() => resolveAdUnitId('interstitialQuickExit', readAdUnitEnv()), []);
  const placementEnabled = ads.isPlacementEnabled('interstitialQuickExit');
  const eligible = placementEnabled && unitId !== null;
  const cooldownMinutes = ads.config.interstitialCooldownMinutes;
  const maxPerSession = ads.config.interstitialMaxPerSession;
  const ineligibleReason = eligible ? undefined : !ads.ready ? `phase-${ads.phase}` : !placementEnabled ? 'flag-off' : 'no-unit-id';

  const input: QuickExitInput = {
    quickClosed,
    eligible,
    unitId,
    limits: { cooldownMinutes, maxPerSession },
    ineligibleReason,
  };
  const inputRef = useRef(input);
  inputRef.current = input;
  const controllerRef = useRef<QuickExitInterstitialController | null>(null);

  useEffect(() => {
    const controller = new QuickExitInterstitialController({
      createAd: createQuickExitInterstitialAd,
      now: () => Date.now(),
      log: (message) => adsDevLog('ads-interstitial', message),
      session: { get: getInterstitialSession, commit: commitInterstitialShow },
      schedule: (fn, ms) => {
        const handle = setTimeout(fn, ms);
        return () => clearTimeout(handle);
      },
    });
    controllerRef.current = controller;
    controller.update(inputRef.current);
    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(inputRef.current);
  }, [quickClosed, eligible, unitId, cooldownMinutes, maxPerSession, ineligibleReason]);

  const requestExit = useCallback((navigate: () => void) => {
    const controller = controllerRef.current;
    if (!controller) {
      navigate();
      return;
    }
    controller.exit(navigate, () => inputRef.current);
  }, []);

  return { requestExit };
}
