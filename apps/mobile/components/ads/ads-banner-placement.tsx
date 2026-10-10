import { Component, lazy, Suspense, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useAds } from '../../lib/ads/ads-provider';
import { readAdUnitEnv, resolveAdUnitId } from '../../lib/ads/ad-unit-ids';
import { adsDevLog } from '../../lib/ads/ads-log';
import { BANNER_SLOT_PLACEMENT, decideBanner, type BannerSlot } from '../../lib/ads/ads-placements';
import { useTheme } from '../../theme';

/**
 * ADS V1 -- ADS-1C. Placement de banner compartido (Inicio / Estudio / Competir).
 *
 * - Consume SOLO `useAds()`: no inicializa el SDK, no pide config, no conoce el
 *   entitlement. La elegibilidad (FREE + ready + flag maestro + flag del slot)
 *   ya viene resuelta en `isPlacementEnabled`.
 * - No renderiza NADA (ni contenedor, ni placeholder) salvo elegibilidad
 *   completa + id de unidad valido + pantalla ENFOCADA + sin fallo previo.
 *   Al perder cualquiera de ellas (Premium, logout, pestana en segundo plano,
 *   flag apagado) el `BannerAd` nativo se DESMONTA por completo.
 * - La vista nativa se importa de forma perezosa: la libreria no se evalua
 *   mientras no haya un placement elegible.
 * - Un fallo de carga o una excepcion de render degradan limpio: el banner se
 *   oculta, el layout vuelve a su estado normal y la pantalla anfitriona no cae.
 * - El contenedor mide 0 hasta que el anuncio carga (la vista nativa nace en
 *   0x0): no deja un bloque vacio del tamano de un anuncio.
 */
const AdsBannerView = lazy(() => import('./ads-banner-view'));

class BannerErrorBoundary extends Component<{ onError: (message: string) => void; children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError(error.message);
  }

  render() {
    return this.state.crashed ? null : this.props.children;
  }
}

export function AdsBannerPlacement({ slot }: { slot: BannerSlot }) {
  const ads = useAds();
  const focused = useIsFocused();
  const tokens = useTheme();
  const placement = BANNER_SLOT_PLACEMENT[slot];
  const unitId = useMemo(() => resolveAdUnitId(placement, readAdUnitEnv()), [placement]);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const decision = decideBanner({ placementEnabled: ads.isPlacementEnabled(placement), unitId, focused, failed });

  // Un nuevo ciclo de elegibilidad/foco reinicia el estado del banner anterior.
  useEffect(() => {
    if (!decision.render) setLoaded(false);
    if (!decision.render && decision.reason !== 'load-failed') setFailed(false);
  }, [decision.render, decision.render ? '' : decision.reason]);

  useEffect(() => {
    adsDevLog('ads-banner', decision.render ? `placement=${slot} state=eligible` : `placement=${slot} state=hidden reason=${decision.reason}`);
  }, [slot, decision.render, decision.render ? '' : decision.reason]);

  if (!decision.render || unitId === null) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: tokens.color.background.default },
        loaded ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: tokens.color.border.default } : null,
      ]}
    >
      <BannerErrorBoundary
        onError={(message) => {
          adsDevLog('ads-banner', `placement=${slot} event=crashed ${message}`);
          setFailed(true);
        }}
      >
        <Suspense fallback={null}>
          <AdsBannerView
            unitId={unitId}
            onLoaded={() => {
              adsDevLog('ads-banner', `placement=${slot} event=loaded`);
              setLoaded(true);
            }}
            onFailed={(message) => {
              adsDevLog('ads-banner', `placement=${slot} event=failed ${message}`);
              setFailed(true);
            }}
          />
        </Suspense>
      </BannerErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
