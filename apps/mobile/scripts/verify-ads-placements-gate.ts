// Gate ADS-1C -- placements de publicidad V1: 3 banners (Inicio, Estudio,
// Competir) + 1 oportunidad de intersticial al pulsar "Volver a Competir" desde
// una sesion de Quick realmente CERRADA (ADS-1C.1). Verificacion DETERMINISTA: Node puro, sin
// React Native, sin el SDK, sin red; el anuncio se simula con un puerto falso.
//
//   1. Banners (politica pura sobre la maquina de estados REAL de ADS-1B):
//      Premium / entitlement loading|error / maestro apagado / placement apagado /
//      id nulo / fuera de foco / fallo => NO se renderiza; solo FREE + ready +
//      flag exacto => elegible; home/study/compete no se habilitan entre si.
//   2. Politica del intersticial (cargar / mostrar / tope / cooldown).
//   3. Controlador con anuncio falso: Quick activo no carga; resultados + elegible
//      carga; Premium/no-ready/flag apagado no cargan ni muestran; sin anuncio
//      cargado => navega ya; cargado + elegible => muestra y luego navega; solo un
//      anuncio MOSTRADO cuenta; cooldown y tope bloquean; cambio de elegibilidad
//      descarta el anuncio; re-chequeo al mostrar impide mostrar un anuncio FREE
//      obsoleto a Premium; la navegacion ocurre EXACTAMENTE una vez.
//   4. Fronteras de codigo: exactamente 3 pantallas con banner; ninguna en
//      Perfil/IA/auth/onboarding/paywall/Ensayos/estudio activo/Desafios/Ranking;
//      el intersticial solo en el boton de RESULTADOS de Quick; el SDK solo en 3
//      adaptadores; la vista del banner se carga perezosamente; logs sin datos
//      de usuario y solo en modo de prueba; sin TFUA/TFCD ni llamadas nativas.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ADS_CONFIG_OFF, type AdsConfigResponse } from '@axioma/contracts';
import {
  deriveAdsPhase,
  isPlacementEnabled,
  type AdsBuildMode,
  type AdsConfigInput,
  type AdsEntitlementInput,
  type AdsPlacement,
  type AdsSdkInput,
} from '../lib/ads/ads-state';
import { BANNER_SLOT_PLACEMENT, decideBanner, type BannerSlot } from '../lib/ads/ads-placements';
import {
  INITIAL_INTERSTITIAL_SESSION,
  decideExit,
  decideLoad,
  frequencyBlock,
  recordShow,
  type InterstitialLimits,
  type InterstitialSessionState,
} from '../lib/ads/interstitial-policy';
import { commitInterstitialShow, getInterstitialSession, resetInterstitialSessionForTests } from '../lib/ads/interstitial-session';
import {
  QuickExitInterstitialController,
  SHOW_FAILSAFE_MS,
  type InterstitialAdEvents,
  type InterstitialAdHandle,
  type QuickExitInput,
} from '../lib/ads/quick-exit-interstitial-controller';
import { GOOGLE_TEST_UNIT_IDS } from '../lib/ads/ad-unit-ids';
import { QUICK_STATUS_CLASS, isQuickSessionTerminal, type QuickScreenStatus } from '../lib/ads/quick-lifecycle';

let failures = 0;
function check(label: string, condition: boolean) {
  if (condition) console.log(`  OK  ${label}`);
  else {
    console.error(`FALLO  ${label}`);
    failures++;
  }
}

const MOBILE_ROOT = join(__dirname, '..');
const readText = (p: string) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
const readMobile = (...seg: string[]) => readText(join(MOBILE_ROOT, ...seg));
const count = (haystack: string, needle: string) => (needle === '' ? 0 : haystack.split(needle).length - 1);

const FULL: AdsConfigResponse = {
  adsEnabled: true,
  bannerHomeEnabled: true,
  bannerStudyEnabled: true,
  bannerCompeteEnabled: true,
  interstitialCompeteEnabled: true,
  interstitialCooldownMinutes: 20,
  interstitialMaxPerSession: 1,
};
const ready = (config: AdsConfigResponse): AdsConfigInput => ({ status: 'ready', config });
const TEST_BANNER = GOOGLE_TEST_UNIT_IDS.banner;
const TEST_INTERSTITIAL = GOOGLE_TEST_UNIT_IDS.interstitial;

/** Elegibilidad REAL de un placement a traves de la maquina de estados de ADS-1B. */
function placementOn(placement: AdsPlacement, e: AdsEntitlementInput, c: AdsConfigInput, s: AdsSdkInput, m: AdsBuildMode = 'test'): boolean {
  return isPlacementEnabled(deriveAdsPhase(e, c, s, m), c, placement);
}
const bannerRenders = (slot: BannerSlot, e: AdsEntitlementInput, c: AdsConfigInput, s: AdsSdkInput, over: Partial<{ unitId: string | null; focused: boolean; failed: boolean }> = {}) =>
  decideBanner({ placementEnabled: placementOn(BANNER_SLOT_PLACEMENT[slot], e, c, s), unitId: over.unitId === undefined ? TEST_BANNER : over.unitId, focused: over.focused ?? true, failed: over.failed ?? false }).render;

// --- 1. banners ---------------------------------------------------------------
console.log('--- 1. banners: Premium / sin resolver / apagados => nada; FREE + ready + flag exacto => elegible ---');
{
  const slots: BannerSlot[] = ['home', 'study', 'compete'];
  for (const slot of slots) {
    check(`[${slot}] FREE + ready + flag ON + id valido + enfocado -> se renderiza`, bannerRenders(slot, 'FREE', ready(FULL), 'ready'));
    check(`[${slot}] PREMIUM (incluso con config ON y SDK ya listo) -> NO`, !bannerRenders(slot, 'PREMIUM', ready(FULL), 'ready'));
    check(`[${slot}] entitlement loading -> NO`, !bannerRenders(slot, 'loading', ready(FULL), 'ready'));
    check(`[${slot}] entitlement error -> NO`, !bannerRenders(slot, 'error', ready(FULL), 'ready'));
    check(`[${slot}] maestro adsEnabled apagado -> NO`, !bannerRenders(slot, 'FREE', ready({ ...FULL, adsEnabled: false }), 'ready'));
    check(`[${slot}] config en error / cargando -> NO`, !bannerRenders(slot, 'FREE', { status: 'error' }, 'ready') && !bannerRenders(slot, 'FREE', { status: 'loading' }, 'ready'));
    check(`[${slot}] SDK sin listo (idle/initializing/failed) -> NO`, ['idle', 'initializing', 'failed'].every((sdk) => !bannerRenders(slot, 'FREE', ready(FULL), sdk as AdsSdkInput)));
    check(`[${slot}] resolver devuelve null -> NO`, !bannerRenders(slot, 'FREE', ready(FULL), 'ready', { unitId: null }));
    check(`[${slot}] pantalla NO enfocada -> NO (sin vista nativa viva en segundo plano)`, !bannerRenders(slot, 'FREE', ready(FULL), 'ready', { focused: false }));
    check(`[${slot}] anuncio fallido -> se oculta (degrada limpio)`, !bannerRenders(slot, 'FREE', ready(FULL), 'ready', { failed: true }));
    check(`[${slot}] modo de build 'off' -> NO`, !decideBanner({ placementEnabled: placementOn(BANNER_SLOT_PLACEMENT[slot], 'FREE', ready(FULL), 'ready', 'off'), unitId: TEST_BANNER, focused: true, failed: false }).render);
  }
  check('el flag de CADA placement lo apaga individualmente', bannerRenders('home', 'FREE', ready({ ...FULL, bannerHomeEnabled: false }), 'ready') === false && bannerRenders('study', 'FREE', ready({ ...FULL, bannerStudyEnabled: false }), 'ready') === false && bannerRenders('compete', 'FREE', ready({ ...FULL, bannerCompeteEnabled: false }), 'ready') === false);
  const onlyHome = ready({ ...ADS_CONFIG_OFF, adsEnabled: true, bannerHomeEnabled: true });
  const onlyStudy = ready({ ...ADS_CONFIG_OFF, adsEnabled: true, bannerStudyEnabled: true });
  const onlyCompete = ready({ ...ADS_CONFIG_OFF, adsEnabled: true, bannerCompeteEnabled: true });
  check('home/study/compete NO se habilitan entre si (solo home -> solo home)', bannerRenders('home', 'FREE', onlyHome, 'ready') && !bannerRenders('study', 'FREE', onlyHome, 'ready') && !bannerRenders('compete', 'FREE', onlyHome, 'ready'));
  check('solo study -> solo study', !bannerRenders('home', 'FREE', onlyStudy, 'ready') && bannerRenders('study', 'FREE', onlyStudy, 'ready') && !bannerRenders('compete', 'FREE', onlyStudy, 'ready'));
  check('solo compete -> solo compete', !bannerRenders('home', 'FREE', onlyCompete, 'ready') && !bannerRenders('study', 'FREE', onlyCompete, 'ready') && bannerRenders('compete', 'FREE', onlyCompete, 'ready'));
  check('los flags de banner NO habilitan el intersticial, ni al reves', !placementOn('interstitialQuickExit', 'FREE', onlyHome, 'ready') && !placementOn('bannerHome', 'FREE', ready({ ...ADS_CONFIG_OFF, adsEnabled: true, interstitialCompeteEnabled: true }), 'ready'));
  check('mapa slot->placement: home=bannerHome, study=bannerStudy, compete=bannerCompete', BANNER_SLOT_PLACEMENT.home === 'bannerHome' && BANNER_SLOT_PLACEMENT.study === 'bannerStudy' && BANNER_SLOT_PLACEMENT.compete === 'bannerCompete');
}

// --- 2. politica del intersticial ---------------------------------------------
console.log('--- 2. politica: cargar / mostrar / tope por sesion / cooldown ---');
{
  const limits: InterstitialLimits = { cooldownMinutes: 20, maxPerSession: 1 };
  const t0 = 50_000_000;
  const load = (over: Partial<{ quickClosed: boolean; eligible: boolean; unitId: string | null; session: InterstitialSessionState; limits: InterstitialLimits }>) =>
    decideLoad({ quickClosed: true, eligible: true, unitId: TEST_INTERSTITIAL, session: INITIAL_INTERSTITIAL_SESSION, limits, nowMs: t0, ...over });
  check('Quick ACTIVO (o resultado intermedio) -> no se puede cargar (quick-active)', JSON.stringify(load({ quickClosed: false })) === JSON.stringify({ ok: false, reason: 'quick-active' }));
  check('sesion de Quick CERRADA + elegible -> se puede cargar', load({}).ok === true);
  check('no elegible (Premium / no-ready / flag apagado) -> no carga', JSON.stringify(load({ eligible: false })) === JSON.stringify({ ok: false, reason: 'not-eligible' }));
  check('id de unidad nulo -> no carga', load({ unitId: null }).ok === false);
  check('tope alcanzado -> no carga (session-cap)', JSON.stringify(load({ session: { shownCount: 1, lastShownAtMs: t0 - 60 * 60_000 } })) === JSON.stringify({ ok: false, reason: 'session-cap' }));
  check('cooldown vigente -> no carga (cooldown)', JSON.stringify(load({ session: { shownCount: 1, lastShownAtMs: t0 - 5 * 60_000 }, limits: { cooldownMinutes: 20, maxPerSession: 3 } })) === JSON.stringify({ ok: false, reason: 'cooldown' }));
  check('cooldown vencido y bajo el tope -> carga', load({ session: { shownCount: 1, lastShownAtMs: t0 - 21 * 60_000 }, limits: { cooldownMinutes: 20, maxPerSession: 3 } }).ok === true);
  check('maxPerSession=0 (intersticial apagado en el servidor) -> bloqueado', frequencyBlock(INITIAL_INTERSTITIAL_SESSION, { cooldownMinutes: 0, maxPerSession: 0 }, t0) === 'session-cap');

  const exit = (over: Partial<{ eligibleNow: boolean; loaded: boolean; session: InterstitialSessionState; limits: InterstitialLimits }>) =>
    decideExit({ eligibleNow: true, loaded: true, session: INITIAL_INTERSTITIAL_SESSION, limits, nowMs: t0, ...over });
  check('salida: elegible + cargado + sin bloqueo -> show', exit({}).action === 'show');
  check('salida: no cargado -> skip not-loaded (navega ya)', JSON.stringify(exit({ loaded: false })) === JSON.stringify({ action: 'skip', reason: 'not-loaded' }));
  check('salida: Premium / perdio elegibilidad -> skip not-eligible (aunque haya anuncio cargado)', JSON.stringify(exit({ eligibleNow: false })) === JSON.stringify({ action: 'skip', reason: 'not-eligible' }));
  check('salida: tope -> skip session-cap; cooldown -> skip cooldown', exit({ session: { shownCount: 1, lastShownAtMs: t0 - 90 * 60_000 } }).action === 'skip' && JSON.stringify(exit({ session: { shownCount: 1, lastShownAtMs: t0 - 60_000 }, limits: { cooldownMinutes: 20, maxPerSession: 5 } })) === JSON.stringify({ action: 'skip', reason: 'cooldown' }));
  const after = recordShow(INITIAL_INTERSTITIAL_SESSION, t0);
  check('recordShow incrementa el contador y fija el instante del cooldown', after.shownCount === 1 && after.lastShownAtMs === t0 && INITIAL_INTERSTITIAL_SESSION.shownCount === 0);
  resetInterstitialSessionForTests();
  check('sesion de proceso: arranca en 0; commit la incrementa; reset (solo tests) la limpia', getInterstitialSession().shownCount === 0);
  commitInterstitialShow(123);
  check('commitInterstitialShow cuenta UN show', getInterstitialSession().shownCount === 1 && getInterstitialSession().lastShownAtMs === 123);
  resetInterstitialSessionForTests();
  check('tras el reset de test, vuelve a 0', getInterstitialSession().shownCount === 0 && getInterstitialSession().lastShownAtMs === null);
}

// --- 3. controlador con anuncio falso ------------------------------------------
console.log('--- 3. controlador: ciclo de vida completo con un anuncio falso ---');
{
  class FakeAd implements InterstitialAdHandle {
    loads = 0;
    shows = 0;
    destroys = 0;
    throwOnShow = false;
    constructor(readonly unitId: string, readonly events: InterstitialAdEvents) {}
    load() {
      this.loads++;
    }
    show() {
      this.shows++;
      if (this.throwOnShow) throw new Error('show failed');
    }
    destroy() {
      this.destroys++;
    }
  }

  const harness = (initial: InterstitialSessionState = INITIAL_INTERSTITIAL_SESSION) => {
    const ads: FakeAd[] = [];
    const logs: string[] = [];
    const timers: Array<{ fn: () => void; ms: number; cancelled: boolean }> = [];
    let nowMs = 90_000_000;
    let session = initial;
    const controller = new QuickExitInterstitialController({
      createAd: (unitId, events) => {
        const ad = new FakeAd(unitId, events);
        ads.push(ad);
        return ad;
      },
      now: () => nowMs,
      log: (message) => logs.push(message),
      session: { get: () => session, commit: (t) => void (session = recordShow(session, t)) },
      schedule: (fn, ms) => {
        const timer = { fn, ms, cancelled: false };
        timers.push(timer);
        return () => void (timer.cancelled = true);
      },
    });
    return {
      controller,
      ads,
      logs,
      timers,
      advanceMinutes: (m: number) => void (nowMs += m * 60_000),
      get session() {
        return session;
      },
    };
  };
  const limits: InterstitialLimits = { cooldownMinutes: 20, maxPerSession: 1 };
  const input = (over: Partial<QuickExitInput> = {}): QuickExitInput => ({ quickClosed: true, eligible: true, unitId: TEST_INTERSTITIAL, limits, ...over });
  const navCounter = () => {
    let n = 0;
    return { fn: () => void n++, get n() {
      return n;
    } };
  };

  // Quick activo
  {
    const h = harness();
    h.controller.update(input({ quickClosed: false }));
    check('Quick ACTIVO + elegible: NO se crea ni se carga ningun anuncio', h.ads.length === 0 && h.controller.debugState === 'idle');
  }
  // Resultados + elegible
  {
    const h = harness();
    h.controller.update(input());
    check('sesion CERRADA + elegible: se crea y carga UN anuncio de prueba', h.ads.length === 1 && h.ads[0].loads === 1 && h.ads[0].unitId === TEST_INTERSTITIAL && h.controller.debugState === 'loading');
    h.ads[0].events.onLoaded();
    check('evento loaded -> estado loaded', h.controller.debugState === 'loaded');
    h.controller.update(input());
    check('un segundo update elegible NO crea otro anuncio', h.ads.length === 1);
  }
  // No elegible
  {
    const h = harness();
    h.controller.update(input({ eligible: false, ineligibleReason: 'phase-disabled' }));
    h.controller.update(input({ unitId: null }));
    check('PREMIUM / provider no-ready / flag apagado / id nulo: NO carga', h.ads.length === 0);
  }
  // Perdida de elegibilidad con anuncio cargado (logout / Premium / cuenta distinta)
  {
    const h = harness();
    h.controller.update(input());
    const first = h.ads[0];
    first.events.onLoaded();
    h.controller.update(input({ eligible: false, ineligibleReason: 'phase-waiting_entitlement' }));
    check('perder elegibilidad con anuncio cargado lo DESTRUYE y vuelve a idle', first.destroys === 1 && h.controller.debugState === 'idle' && h.session.shownCount === 0);
    first.events.onLoaded();
    check('un evento tardio de la instancia descartada se ignora (no resucita el anuncio)', h.controller.debugState === 'idle');
    check('el descarte por perder elegibilidad NO consume el tope', h.session.shownCount === 0);
    check('log de descarte sin datos de usuario', h.logs.some((l) => l.startsWith('event=discard reason=ineligible:phase-waiting_entitlement')));
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input({ eligible: false }));
    check('salida tras perder elegibilidad: navega de inmediato, 0 shows', nav.n === 1 && first.shows === 0);
  }
  // Salida sin anuncio cargado
  {
    const h = harness();
    h.controller.update(input());
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    check('salida con anuncio AUN cargando: navega de inmediato (no espera), no muestra, descarta, no cuenta', nav.n === 1 && h.ads[0].shows === 0 && h.ads[0].destroys === 1 && h.session.shownCount === 0);
    const h2 = harness();
    const nav2 = navCounter();
    h2.controller.exit(nav2.fn, () => input());
    check('salida sin ningun anuncio: navega de inmediato exactamente una vez', nav2.n === 1 && h2.ads.length === 0);
    check('log skip reason=not-loaded', h.logs.some((l) => l === 'event=skip reason=not-loaded'));
  }
  // Salida con anuncio cargado
  {
    const h = harness();
    h.controller.update(input());
    const ad = h.ads[0];
    ad.events.onLoaded();
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    check('cargado + elegible al salir: se MUESTRA y aun NO navega', ad.shows === 1 && nav.n === 0 && h.controller.debugState === 'showing');
    check('hay un failsafe programado (nunca atrapar al usuario)', h.timers.length === 1 && h.timers[0].ms === SHOW_FAILSAFE_MS);
    ad.events.onOpened();
    check('evento opened: cuenta UN show, cooldown fijado y failsafe cancelado', h.session.shownCount === 1 && h.session.lastShownAtMs !== null && h.timers[0].cancelled);
    ad.events.onClosed();
    check('al cerrarse el anuncio: navega exactamente una vez y descarta la instancia', nav.n === 1 && ad.destroys === 1 && h.controller.debugState === 'done');
    h.controller.update(input());
    check('tras mostrar NO se recarga desde Quick', h.ads.length === 1);
    ad.events.onClosed();
    ad.events.onError('late');
    check('eventos posteriores (closed/error) no navegan por segunda vez', nav.n === 1);
  }
  // Doble toque mientras se muestra
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onLoaded();
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    h.controller.exit(nav.fn, () => input());
    check('doble toque durante el anuncio: un solo show y sin navegar aun', h.ads[0].shows === 1 && nav.n === 0);
    h.ads[0].events.onOpened();
    h.ads[0].events.onClosed();
    check('...y la navegacion ocurre exactamente una vez', nav.n === 1);
  }
  // Carga fallida
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onError('no fill');
    check('carga fallida: estado failed, anuncio descartado, SIN consumir el tope', h.controller.debugState === 'failed' && h.ads[0].destroys === 1 && h.session.shownCount === 0);
    h.controller.update(input());
    check('carga fallida: NO reintenta en bucle', h.ads.length === 1);
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    check('carga fallida: la salida navega de inmediato', nav.n === 1);
  }
  // show() lanza / error al mostrar / failsafe
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onLoaded();
    h.ads[0].throwOnShow = true;
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    check('show() lanza: navega una vez, descarta y NO cuenta (anuncio no mostrado)', nav.n === 1 && h.session.shownCount === 0 && h.ads[0].destroys === 1);

    const h2 = harness();
    h2.controller.update(input());
    h2.ads[0].events.onLoaded();
    const nav2 = navCounter();
    h2.controller.exit(nav2.fn, () => input());
    h2.ads[0].events.onError('show error');
    check('error mientras se muestra (sin opened): navega una vez y NO cuenta', nav2.n === 1 && h2.session.shownCount === 0);

    const h3 = harness();
    h3.controller.update(input());
    h3.ads[0].events.onLoaded();
    const nav3 = navCounter();
    h3.controller.exit(nav3.fn, () => input());
    h3.timers[0].fn();
    check('failsafe sin opened: navega una vez, descarta y NO cuenta', nav3.n === 1 && h3.session.shownCount === 0 && h3.ads[0].destroys === 1);
    h3.ads[0].events.onOpened();
    h3.ads[0].events.onClosed();
    check('...un opened/closed tardio tras el failsafe no cuenta ni navega otra vez', nav3.n === 1 && h3.session.shownCount === 0);
  }
  // Cooldown y tope
  {
    const justShown: InterstitialSessionState = { shownCount: 1, lastShownAtMs: 90_000_000 - 5 * 60_000 };
    const relaxed: InterstitialLimits = { cooldownMinutes: 20, maxPerSession: 3 };
    const h = harness(justShown);
    h.controller.update(input({ limits: relaxed }));
    check('cooldown vigente: NO carga un nuevo anuncio', h.ads.length === 0 && h.logs.some((l) => l === 'event=skip-load reason=cooldown'));
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input({ limits: relaxed }));
    check('cooldown vigente: la salida navega sin anuncio (skip cooldown)', nav.n === 1 && h.logs.includes('event=skip reason=cooldown'));
    const h2 = harness(justShown);
    h2.advanceMinutes(16);
    h2.controller.update(input({ limits: relaxed }));
    check('cooldown vencido (y bajo el tope): vuelve a cargar', h2.ads.length === 1);

    const capped: InterstitialSessionState = { shownCount: 1, lastShownAtMs: 90_000_000 - 120 * 60_000 };
    const h3 = harness(capped);
    h3.controller.update(input());
    const nav3 = navCounter();
    h3.controller.exit(nav3.fn, () => input());
    check('tope de sesion alcanzado (max 1): NO carga y la salida navega sin anuncio (skip session-cap)', h3.ads.length === 0 && nav3.n === 1 && h3.logs.includes('event=skip reason=session-cap'));
    const h4 = harness();
    h4.controller.update(input({ limits: { cooldownMinutes: 0, maxPerSession: 0 } }));
    check('intersticial apagado en el servidor (0/0): no carga', h4.ads.length === 0);
  }
  // Re-chequeo al mostrar (anuncio FREE obsoleto vs Premium)
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onLoaded();
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input({ eligible: false, ineligibleReason: 'phase-disabled' }));
    check('FREE A cargo el anuncio; al pulsar ya es PREMIUM: NO se muestra, navega una vez, se destruye, no cuenta', h.ads[0].shows === 0 && nav.n === 1 && h.ads[0].destroys === 1 && h.session.shownCount === 0);
  }
  // Quick ya no esta en resultados al pulsar
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onLoaded();
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input({ quickClosed: false }));
    check('si la sesion de Quick no esta CERRADA al pulsar: no se muestra (navega)', h.ads[0].shows === 0 && nav.n === 1);
  }
  // Desmontaje (logout / cambio de cuenta desmontan la pantalla)
  {
    const h = harness();
    h.controller.update(input());
    h.ads[0].events.onLoaded();
    h.controller.dispose();
    check('dispose (logout/cambio de cuenta/salir de Quick): destruye el anuncio, sin navegar ni contar', h.ads[0].destroys === 1 && h.session.shownCount === 0 && h.controller.debugState === 'disposed');
    const nav = navCounter();
    h.controller.exit(nav.fn, () => input());
    check('salida tras dispose: navega una vez, nunca muestra', nav.n === 1 && h.ads[0].shows === 0);
    h.controller.update(input());
    check('un controlador desmontado no vuelve a cargar', h.ads.length === 1);
  }
}

// --- 3b. ciclo de vida de Quick (ADS-1C.1) ---------------------------------------
console.log('--- 3b. Quick: un resultado por pregunta (sesion ACTIVA) NUNCA crea ni carga un intersticial ---');
{
  const quickSource = stripComments(readMobile('app', '(tabs)', 'competir', 'quick-question.tsx'));
  const typeStart = quickSource.indexOf('type Screen =');
  const typeEnd = quickSource.indexOf('export default function QuickQuestionScreen', typeStart);
  const typeBlock = typeStart > -1 && typeEnd > typeStart ? quickSource.slice(typeStart, typeEnd) : '';
  const sourceStatuses = [...new Set([...typeBlock.matchAll(/status: '([a-z_]+)'/g)].map((m) => m[1]))].sort();
  const classified = Object.keys(QUICK_STATUS_CLASS).sort();
  check('TODOS los estados reales de la pantalla de Quick estan clasificados (un estado nuevo exige decision explicita)', JSON.stringify(sourceStatuses) === JSON.stringify(classified));
  check("solo 'session_closed' es TERMINAL; 'result', 'question', 'resolving_timeout' y 'no_questions' son ACTIVOS", Object.entries(QUICK_STATUS_CLASS).filter(([, c]) => c === 'terminal').map(([k]) => k).join() === 'session_closed' && ['result', 'question', 'resolving_timeout', 'no_questions'].every((k) => QUICK_STATUS_CLASS[k as QuickScreenStatus] === 'active'));
  check('isQuickSessionTerminal: true unicamente para session_closed', (Object.keys(QUICK_STATUS_CLASS) as QuickScreenStatus[]).every((st) => isQuickSessionTerminal(st) === (st === 'session_closed')));

  // Controlador con anuncio falso, alimentado con el 'quickClosed' que el hook REALMENTE deriva de cada estado.
  const created: string[] = [];
  const limits3: InterstitialLimits = { cooldownMinutes: 20, maxPerSession: 1 };
  const makeController = () =>
    new QuickExitInterstitialController({
      createAd: (unitId) => {
        created.push(unitId);
        return { load() {}, show() {}, destroy() {} };
      },
      now: () => 1_000_000,
      log: () => undefined,
      session: { get: () => INITIAL_INTERSTITIAL_SESSION, commit: () => undefined },
      schedule: () => () => undefined,
    });
  const drive = (statuses: QuickScreenStatus[]) => {
    created.length = 0;
    const controller = makeController();
    for (const st of statuses) controller.update({ quickClosed: isQuickSessionTerminal(st), eligible: true, unitId: TEST_INTERSTITIAL, limits: limits3 });
    return created.length;
  };
  check('flujo normal: initializing -> question -> result -> question -> result -> resolving_timeout: CERO anuncios creados/cargados', drive(['initializing', 'question', 'result', 'question', 'result', 'resolving_timeout']) === 0);
  check("pantalla de RESULTADO por pregunta (donde ADS-1C cargaba): CERO anuncios, aunque la elegibilidad sea completa", drive(['result']) === 0);
  check("'no_questions' (sesion abierta sin preguntas): CERO anuncios", drive(['no_questions']) === 0);
  check("'error' / 'initializing': CERO anuncios", drive(['error', 'initializing']) === 0);
  check("solo 'session_closed' abre la ventana de carga: exactamente UN anuncio", drive(['question', 'result', 'session_closed']) === 1);
  check("tras 'session_closed' un 'update' posterior no crea otro", drive(['session_closed', 'session_closed', 'session_closed']) === 1);
  for (const st of ['result', 'question', 'resolving_timeout', 'no_questions', 'initializing', 'error'] as QuickScreenStatus[]) {
    check(`[${st}] decideLoad bloquea con quick-active`, JSON.stringify(decideLoad({ quickClosed: isQuickSessionTerminal(st), eligible: true, unitId: TEST_INTERSTITIAL, session: INITIAL_INTERSTITIAL_SESSION, limits: limits3, nowMs: 1 })) === JSON.stringify({ ok: false, reason: 'quick-active' }));
  }
}

// --- 4. fronteras de codigo ----------------------------------------------------
console.log('--- 4. fronteras: 3 banners + 1 intersticial, nada mas; SDK aislado; logs seguros ---');
{
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'android' || name.startsWith('.')) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full, out);
      else if (/\.(ts|tsx|js)$/.test(name)) out.push(full);
    }
    return out;
  };
  const files = ['app', 'lib', 'components'].flatMap((d) => (existsSync(join(MOBILE_ROOT, d)) ? walk(join(MOBILE_ROOT, d)) : []));
  const rel = (f: string) => relative(MOBILE_ROOT, f).replace(/\\/g, '/');
  const code = (f: string) => stripComments(readText(f));

  const bannerUsers = files.filter((f) => /<AdsBannerPlacement\b/.test(code(f))).map(rel).sort();
  check(`EXACTAMENTE 3 pantallas montan un banner: Inicio, Estudio y Competir (encontrado: ${bannerUsers.join(', ')})`, JSON.stringify(bannerUsers) === JSON.stringify(['app/(tabs)/competir/index.tsx', 'app/(tabs)/estudio/index.tsx', 'app/(tabs)/index.tsx']));
  check('Inicio: un unico <AdsBannerPlacement slot="home" />', count(code(join(MOBILE_ROOT, 'app', '(tabs)', 'index.tsx')), '<AdsBannerPlacement slot="home" />') === 1);
  check('Estudio (raiz): un unico <AdsBannerPlacement slot="study" />', count(code(join(MOBILE_ROOT, 'app', '(tabs)', 'estudio', 'index.tsx')), '<AdsBannerPlacement slot="study" />') === 1);
  check('Competir (hub): un unico <AdsBannerPlacement slot="compete" />', count(code(join(MOBILE_ROOT, 'app', '(tabs)', 'competir', 'index.tsx')), '<AdsBannerPlacement slot="compete" />') === 1);

  const adsConsumers = files.filter((f) => /AdsBannerPlacement|useQuickExitInterstitial|from '[./]+\/(?:lib\/)?ads\/|components\/ads\//.test(code(f))).map(rel).sort();
  const allowedConsumers = ['app/(tabs)/competir/index.tsx', 'app/(tabs)/competir/quick-question.tsx', 'app/(tabs)/estudio/index.tsx', 'app/(tabs)/index.tsx', 'app/_layout.tsx'];
  check(`solo estas pantallas importan codigo de ads fuera de lib/ads y components/ads (encontrado: ${adsConsumers.filter((f) => !f.startsWith('lib/ads/') && !f.startsWith('components/ads/') && f !== 'lib/api/ads.ts').join(', ')})`, JSON.stringify(adsConsumers.filter((f) => !f.startsWith('lib/ads/') && !f.startsWith('components/ads/') && f !== 'lib/api/ads.ts')) === JSON.stringify(allowedConsumers));

  const forbidden = [
    'app/(tabs)/perfil/',
    'app/(tabs)/ia/',
    'app/(auth)/',
    'app/onboarding.tsx',
    'app/(tabs)/estudio/ensayos/',
    'app/(tabs)/estudio/[subjectId]/',
    'app/(tabs)/estudio/topic/',
    'app/(tabs)/competir/desafios.tsx',
    'app/(tabs)/competir/ranking.tsx',
    'app/(tabs)/competir/perfil/',
    'components/premium/',
    'lib/billing/',
    'lib/entitlement/',
  ];
  const forbiddenHits = files.map(rel).filter((f) => forbidden.some((p) => f.startsWith(p))).filter((f) => /AdsBannerPlacement|useQuickExitInterstitial|useAds\b|lib\/ads|components\/ads/.test(code(join(MOBILE_ROOT, f))));
  check(`NINGUN anuncio en Perfil, IA, auth, onboarding, paywall/compra, Ensayos, estudio activo, Desafios, Ranking, perfil competitivo${forbiddenHits.length ? ` (${forbiddenHits.join(', ')})` : ''}`, forbiddenHits.length === 0);

  const quickRaw = readMobile('app', '(tabs)', 'competir', 'quick-question.tsx');
  const quick = stripComments(quickRaw);
  check("Quick: el hook se llama con isQuickSessionTerminal(screen.status) -- solo una sesion CERRADA abre la ventana de carga", count(quick, 'useQuickExitInterstitial(isQuickSessionTerminal(screen.status))') === 1 && /from '\.\.\/\.\.\/\.\.\/lib\/ads\/quick-lifecycle'/.test(quick));
  check("Quick: el hook NO se alimenta con 'result', 'question', 'no_questions' ni 'resolving_timeout'", !/useQuickExitInterstitial\([^)]*(?:'result'|'question'|'no_questions'|'resolving_timeout')/.test(quick));
  const iHook = quick.indexOf('useQuickExitInterstitial(');
  const iFirstEarlyReturn = quick.indexOf("if (screen.status === 'initializing') return");
  check('Quick: el hook se invoca ANTES de los retornos tempranos (orden de hooks estable)', iHook > -1 && iHook < iFirstEarlyReturn);
  check('Quick: requestExit se usa UNA sola vez, solo desde handleExitFromClosedSession', count(quick, 'requestExit') === 2 && /function handleExitFromClosedSession\(\) \{[\s\S]*?requestExit\(\(\) => router\.push\('\/\(tabs\)\/competir'\)\);/.test(quick));
  const iClosedBlock = quick.indexOf("if (screen.status === 'session_closed') {");
  const iNoQuestionsBlock = quick.indexOf("if (screen.status === 'no_questions') {");
  const closedBlock = iClosedBlock > -1 && iNoQuestionsBlock > iClosedBlock ? quick.slice(iClosedBlock, iNoQuestionsBlock) : '';
  check('Quick: handleExitFromClosedSession es el onPress de "Volver a Competir" SOLO en la pantalla de sesion CERRADA', count(quick, 'onPress={handleExitFromClosedSession}') === 1 && count(closedBlock, 'onPress={handleExitFromClosedSession}') === 1);
  const iResultMarker = quick.indexOf("const headlineColor = screen.verdict === 'correct'"); // inicio del render del RESULTADO por pregunta
  const resultTail = iResultMarker > -1 ? quick.slice(iResultMarker) : '';
  check('Quick: el RESULTADO por pregunta NO ofrece anuncio (su "Volver a Competir" usa handleExit; sin requestExit)', count(resultTail, 'onPress={handleExit}') === 1 && !/requestExit|handleExitFromClosedSession/.test(resultTail));
  check('Quick: las demas salidas (sin preguntas, timeout, "Salir" de la pregunta ACTIVA, resultado) usan handleExit y SIN anuncio', count(quick, 'onPress={handleExit}') === 4);
  check('Quick: closeQuickQuestionSession se invoca UNA sola vez, dentro de handleExit (comportamiento original)', count(quick, 'closeQuickQuestionSession(') === 1 && /async function handleExit\(\) \{[\s\S]*?await closeQuickQuestionSession\(sessionId\);/.test(quick));
  check('Quick: doble toque bloqueado en la salida con anuncio (exitingRef)', /function handleExitFromClosedSession\(\) \{\s*if \(exitingRef\.current\) return;\s*exitingRef\.current = true;/.test(quick));
  check('Quick: ningun otro codigo de anuncios (sin load/show/InterstitialAd en la pantalla)', !/InterstitialAd|\.show\(|BannerAd/.test(quick));

  const placement = code(join(MOBILE_ROOT, 'components', 'ads', 'ads-banner-placement.tsx'));
  check("banner: la vista nativa se carga con React.lazy (el SDK no se evalua sin placement elegible)", /lazy\(\(\) => import\('\.\/ads-banner-view'\)\)/.test(placement) && !/^\s*import\b[^;]*from\s+'\.\/ads-banner-view'/m.test(placement));
  check('banner: usa useAds() (no useAuth/entitlement/ads-sdk), useIsFocused y decideBanner', /useAds\(\)/.test(placement) && /useIsFocused\(\)/.test(placement) && /decideBanner\(/.test(placement) && !/useAuth|useEntitlement|ads-sdk|initializeAdsSdk|getAdsConfig/.test(placement));
  check('banner: retorna null salvo decision.render; el contenedor solo existe tras la decision', /if \(!decision\.render \|\| unitId === null\) return null;/.test(placement));
  check('banner: error boundary + onFailed degradan sin tumbar la pantalla anfitriona', /class BannerErrorBoundary/.test(placement) && /getDerivedStateFromError/.test(placement) && /setFailed\(true\)/.test(placement));
  check('banner: el id sale del resolver (resolveAdUnitId) por placement; sin ids literales', /resolveAdUnitId\(placement, readAdUnitEnv\(\)\)/.test(placement) && !/ca-app-pub-\d/.test(placement));
  const bannerView = code(join(MOBILE_ROOT, 'components', 'ads', 'ads-banner-view.tsx'));
  check('vista del banner: BannerAd adaptativo anclado, sin inicializar el SDK ni configurar solicitudes', /BannerAdSize\.ANCHORED_ADAPTIVE_BANNER/.test(bannerView) && !/initialize|setRequestConfiguration|requestOptions|tagFor/.test(bannerView));
  const interstitialSdk = code(join(MOBILE_ROOT, 'lib', 'ads', 'ads-interstitial-sdk.ts'));
  check("adaptador del intersticial: import dinamico, SIN initialize() ni setRequestConfiguration (no duplica ADS-1B)", /await import\('react-native-google-mobile-ads'\)/.test(interstitialSdk) && !/\.initialize\(|setRequestConfiguration|tagFor/.test(interstitialSdk));
  const hook = code(join(MOBILE_ROOT, 'lib', 'ads', 'use-quick-exit-interstitial.ts'));
  check("hook del intersticial: resuelve el id con resolveAdUnitId('interstitialQuickExit') y lee solo useAds()", /resolveAdUnitId\('interstitialQuickExit', readAdUnitEnv\(\)\)/.test(hook) && /useAds\(\)/.test(hook) && !/useAuth|useEntitlement/.test(hook));
  check('hook del intersticial: dispose al desmontar y salida lee la elegibilidad MAS RECIENTE (ref)', /controller\.dispose\(\)/.test(hook) && /controller\.exit\(navigate, \(\) => inputRef\.current\)/.test(hook));

  const adsCode = ['ads-banner-placement.tsx', 'ads-banner-view.tsx'].map((n) => code(join(MOBILE_ROOT, 'components', 'ads', n))).concat(
    ['ads-log.ts', 'ads-interstitial-sdk.ts', 'use-quick-exit-interstitial.ts', 'quick-exit-interstitial-controller.ts', 'ads-placements.ts', 'interstitial-policy.ts', 'interstitial-session.ts'].map((n) => code(join(MOBILE_ROOT, 'lib', 'ads', n))),
  );
  check('ningun modulo de placements toca cuenta, email, token ni sesion (logs sin datos de usuario)', adsCode.every((c) => !/accountId|email|useAuth|sessionId|idToken|password/i.test(c)));
  check('console.* solo en ads-log.ts (y esta limitado a modo de prueba)', adsCode.filter((c) => /console\./.test(c)).length === 1 && /console\.info/.test(code(join(MOBILE_ROOT, 'lib', 'ads', 'ads-log.ts'))) && /isTestAdMode\(readAdUnitEnv\(\)\)/.test(code(join(MOBILE_ROOT, 'lib', 'ads', 'ads-log.ts'))));
  check('sin ids de unidad de produccion ni TFUA/TFCD ni llamadas nativas directas en los placements', adsCode.every((c) => !/ca-app-pub-(?!3940256099942544)\d{16}/.test(c) && !/tagForChildDirected|tagForUnderAge|NativeModules|RNGoogleMobileAdsModule/.test(c)));
  check('sin otros formatos: ni app-open, ni recompensados, ni nativos, ni intersticiales extra', files.every((f) => !/AppOpenAd|RewardedAd|RewardedInterstitialAd|NativeAd\b|useRewardedAd|useAppOpenAd/.test(code(f))) && count(code(join(MOBILE_ROOT, 'lib', 'ads', 'ads-interstitial-sdk.ts')), 'InterstitialAd.createForAdRequest') === 1);
}

if (failures > 0) {
  console.error(`\n${failures} verificacion(es) del gate ADS-1C fallaron.`);
  process.exit(1);
}
console.log('\nTodas las verificaciones del gate ADS-1C (placements de publicidad V1) pasaron.');
