import { INITIAL_INTERSTITIAL_SESSION, recordShow, type InterstitialSessionState } from './interstitial-policy';

/**
 * ADS V1 -- ADS-1C. Estado de "sesion" del intersticial: un singleton en la
 * memoria del runtime JS (= vida del proceso de la app). Es estado de runtime
 * del producto, NO de facturacion, y NO se persiste: un reinicio del proceso (o
 * recarga del JS) lo pone a cero. Compartido por todas las instancias del
 * controlador, de modo que volver a entrar a Quick no reinicia el tope.
 */
let session: InterstitialSessionState = INITIAL_INTERSTITIAL_SESSION;

export function getInterstitialSession(): InterstitialSessionState {
  return session;
}

/** Cuenta UN intersticial realmente mostrado (llamar solo ante el evento `opened`). */
export function commitInterstitialShow(nowMs: number): void {
  session = recordShow(session, nowMs);
}

/** Solo para verificaciones deterministas (gate). */
export function resetInterstitialSessionForTests(): void {
  session = INITIAL_INTERSTITIAL_SESSION;
}
