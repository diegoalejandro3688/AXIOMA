/**
 * ADS V1 -- ADS-1B. UNICO modulo de la app que toca `react-native-google-mobile-ads`.
 *
 * - El SDK se importa DINAMICAMENTE: el modulo no se evalua hasta que
 *   `AdsProvider` confirma FREE + modo de build explicito + config habilitada.
 *   Una sesion Premium / con entitlement sin resolver / con config apagada NUNCA
 *   dispara la carga ni la inicializacion.
 * - La inicializacion es por PROCESO y Google Mobile Ads no expone
 *   "desinicializar": si una sesion FREE ya lo inicializo, un login PREMIUM
 *   posterior en el MISMO proceso lo encuentra inicializado. El contrato de
 *   producto para PREMIUM es cero anuncios renderizados, cero solicitudes y
 *   todos los placements apagados (ver ads-provider.tsx), no "SDK jamas
 *   inicializado". No se simula ninguna desinicializacion.
 * - Orden OBLIGATORIO: primero la configuracion de solicitudes (PG + TEEN) y
 *   solo despues la inicializacion, para que TODA solicitud futura herede esa
 *   configuracion. Se espera cada paso antes del siguiente.
 * - TEEN usa `ageRestrictedTreatment` (TFAT). NO se usan los tags deprecados
 *   (TFUA/TFCD) ni llamadas directas al modulo nativo. El valor minuscula del
 *   enum JS llega correcto a Android gracias al parche pnpm de
 *   `react-native-google-mobile-ads@17.0.0` (ADS-1A.1).
 * - Idempotente por proceso: la inicializacion ocurre UNA vez; si falla se
 *   permite reintentar.
 * - Esta fase NO carga ni solicita ningun anuncio.
 */
let initialization: Promise<void> | null = null;

export function initializeAdsSdk(testDeviceIdentifiers: string[]): Promise<void> {
  if (!initialization) {
    initialization = (async () => {
      const ads = await import('react-native-google-mobile-ads');
      const mobileAds = ads.default;
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.PG,
        ageRestrictedTreatment: ads.AgeRestrictedTreatment.TEEN,
        testDeviceIdentifiers,
      });
      await mobileAds().initialize();
    })().catch((error: unknown) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}
