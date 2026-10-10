import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';

/**
 * ADS V1 -- ADS-1C. Vista nativa del banner. Junto a `lib/ads/ads-sdk.ts` y
 * `lib/ads/ads-interstitial-sdk.ts`, uno de los UNICOS archivos que importan
 * `react-native-google-mobile-ads`. Se carga SOLO de forma perezosa
 * (`React.lazy` en `ads-banner-placement.tsx`), por lo que la libreria no se
 * evalua mientras no haya un placement elegible (Premium / sin config / etc.).
 *
 * Banner adaptativo anclado: tamano optimo para cualquier ancho, el mas bajo de
 * la familia adaptativa. (`ANCHORED_ADAPTIVE_BANNER` figura como deprecado en
 * favor de `LARGE_ANCHORED_ADAPTIVE_BANNER` -- mas alto; se elige el estandar
 * por ser el menos intrusivo y sigue soportado por el puente Android 17.0.0.)
 *
 * NO inicializa el SDK ni pide configuracion: la solicitud usa la configuracion
 * global ya aplicada por `AdsProvider` (PG + TEEN) antes de `initialize()`.
 */
export interface AdsBannerViewProps {
  unitId: string;
  onLoaded: () => void;
  onFailed: (message: string) => void;
}

export default function AdsBannerView({ unitId, onLoaded, onFailed }: AdsBannerViewProps) {
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      onAdLoaded={() => onLoaded()}
      onAdFailedToLoad={(error) => onFailed(error instanceof Error ? error.message : 'unknown')}
    />
  );
}
