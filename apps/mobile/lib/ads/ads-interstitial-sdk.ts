import type { InterstitialAdEvents, InterstitialAdHandle } from './quick-exit-interstitial-controller';

/**
 * ADS V1 -- ADS-1C. Adaptador del intersticial sobre `react-native-google-mobile-ads`
 * (junto a `ads-sdk.ts` y `components/ads/ads-banner-view.tsx`, uno de los
 * UNICOS archivos de la app que tocan la libreria).
 *
 * - El SDK se importa DINAMICAMENTE al cargar: nunca se evalua para Premium /
 *   sin elegibilidad. NO inicializa el SDK (lo hace `ads-sdk.ts` via
 *   `AdsProvider`, con PG + TEEN ya aplicados) ni duplica esa configuracion.
 * - `load()` y `show()` solo se invocan desde `QuickExitInterstitialController`,
 *   que ya verifico la elegibilidad.
 * - `destroy()` es idempotente y libera la instancia nativa; los eventos de una
 *   instancia destruida se ignoran.
 */
export function createQuickExitInterstitialAd(unitId: string, events: InterstitialAdEvents): InterstitialAdHandle {
  let destroyed = false;
  let ad: import('react-native-google-mobile-ads').InterstitialAd | null = null;
  const unsubscribers: Array<() => void> = [];

  return {
    load() {
      void (async () => {
        try {
          const ads = await import('react-native-google-mobile-ads');
          if (destroyed) return;
          const created = ads.InterstitialAd.createForAdRequest(unitId);
          ad = created;
          const add = (type: (typeof ads.AdEventType)[keyof typeof ads.AdEventType], listener: (payload?: unknown) => void) => {
            const unsubscribe = (created.addAdEventListener as (t: unknown, l: (p?: unknown) => void) => () => void)(type, listener);
            if (typeof unsubscribe === 'function') unsubscribers.push(unsubscribe);
          };
          add(ads.AdEventType.LOADED, () => !destroyed && events.onLoaded());
          add(ads.AdEventType.ERROR, (error) => !destroyed && events.onError(error instanceof Error ? error.message : 'unknown'));
          add(ads.AdEventType.OPENED, () => !destroyed && events.onOpened());
          add(ads.AdEventType.CLOSED, () => !destroyed && events.onClosed());
          created.load();
        } catch (error) {
          if (!destroyed) events.onError(error instanceof Error ? error.message : 'unknown');
        }
      })();
    },
    show() {
      if (destroyed || ad === null) throw new Error('interstitial not ready');
      void Promise.resolve(ad.show()).catch((error: unknown) => {
        if (!destroyed) events.onError(error instanceof Error ? error.message : 'unknown');
      });
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const unsubscribe of unsubscribers) {
        try {
          unsubscribe();
        } catch {
          // mejor esfuerzo
        }
      }
      unsubscribers.length = 0;
      try {
        ad?.destroy();
      } catch {
        // mejor esfuerzo
      }
      ad = null;
    },
  };
}
