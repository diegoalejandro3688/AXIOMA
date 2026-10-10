import {
  decideExit,
  decideLoad,
  type ExitSkipReason,
  type InterstitialLimits,
  type InterstitialSessionState,
} from './interstitial-policy';

/**
 * ADS V1 -- ADS-1C. Controlador del intersticial "salida de Quick".
 *
 * Clase PURA (sin React, sin el SDK): el anuncio real entra por el puerto
 * `createAd` (`ads-interstitial-sdk.ts`), lo que permite verificar cada regla
 * de forma determinista con un anuncio falso.
 *
 * Ciclo de vida:
 *   - NO crea ni solicita nada mientras Quick esta ACTIVO (`quickClosed=false`),
 *     incluida la pantalla de resultado de cada pregunta (se puede continuar).
 *   - Con la sesion de Quick realmente CERRADA Y elegibilidad completa, carga UNA vez.
 *   - Cualquier perdida de elegibilidad (logout, Premium, entitlement en carga,
 *     error del provider, config apagada, cambio de cuenta...) DESCARTA el
 *     anuncio cargado: nunca queda reutilizable.
 *   - `exit()` re-lee la elegibilidad EN EL INSTANTE de la pulsacion; si falta
 *     cualquier condicion, el anuncio no esta cargado, o el tope/cooldown lo
 *     impide, navega de inmediato (nunca espera un anuncio ni muestra spinner).
 *   - Solo cuenta un anuncio REALMENTE mostrado (evento `opened`); una carga
 *     fallida, un anuncio no mostrado o uno descartado NO consumen el tope.
 *   - La navegacion ocurre EXACTAMENTE una vez (skip, cierre, error o failsafe).
 *   - Tras mostrar, la instancia se descarta y no se recarga desde Quick.
 */
export interface InterstitialAdEvents {
  onLoaded(): void;
  onError(message: string): void;
  onOpened(): void;
  onClosed(): void;
}

export interface InterstitialAdHandle {
  load(): void;
  show(): void;
  destroy(): void;
}

export interface QuickExitInput {
  /** `true` SOLO con la sesion de Quick realmente cerrada (ver `quick-lifecycle.ts`). */
  quickClosed: boolean;
  /** `ads.isPlacementEnabled('interstitialQuickExit')` AND unitId valido. */
  eligible: boolean;
  unitId: string | null;
  limits: InterstitialLimits;
  /** Motivo (sin datos de usuario) cuando `eligible` es false; solo para el log de QA. */
  ineligibleReason?: string;
}

export interface QuickExitControllerDeps {
  createAd(unitId: string, events: InterstitialAdEvents): InterstitialAdHandle;
  now(): number;
  log(message: string): void;
  session: { get(): InterstitialSessionState; commit(nowMs: number): void };
  /** Programa `fn` tras `ms`; devuelve la funcion que lo cancela. */
  schedule(fn: () => void, ms: number): () => void;
}

/** Si `show()` no produce `opened` en este plazo, se abandona y se navega (nunca atrapar al usuario). */
export const SHOW_FAILSAFE_MS = 5000;

type ControllerState = 'idle' | 'loading' | 'loaded' | 'failed' | 'showing' | 'done' | 'disposed';

export class QuickExitInterstitialController {
  private state: ControllerState = 'idle';
  private ad: InterstitialAdHandle | null = null;
  private generation = 0;
  private opened = false;
  private cancelFailsafe: (() => void) | null = null;
  private pendingNavigate: (() => void) | null = null;

  constructor(private readonly deps: QuickExitControllerDeps) {}

  /** Estado interno, solo para verificacion. */
  get debugState(): ControllerState {
    return this.state;
  }

  update(input: QuickExitInput): void {
    if (this.state === 'disposed' || this.state === 'showing' || this.state === 'done') return;

    if (!input.eligible || input.unitId === null) {
      if (this.state === 'loading' || this.state === 'loaded') this.discard(`ineligible:${input.ineligibleReason ?? 'unknown'}`);
      return;
    }
    if (this.state !== 'idle') return;

    const decision = decideLoad({
      quickClosed: input.quickClosed,
      eligible: input.eligible,
      unitId: input.unitId,
      session: this.deps.session.get(),
      limits: input.limits,
      nowMs: this.deps.now(),
    });
    if (!decision.ok) {
      if (decision.reason !== 'quick-active') this.deps.log(`event=skip-load reason=${decision.reason}`);
      return;
    }
    this.startLoad(input.unitId);
  }

  /**
   * Pulsacion de "Volver a Competir" con la sesion ya cerrada. `readInput`
   * se llama AQUI, en el instante del toque (elegibilidad fresca, no la del momento de carga).
   */
  exit(navigate: () => void, readInput: () => QuickExitInput): void {
    let navigated = false;
    const navigateOnce = () => {
      if (navigated) return;
      navigated = true;
      navigate();
    };

    if (this.state === 'showing') return; // doble toque mientras se muestra: la navegacion pendiente ya esta en curso
    if (this.state === 'disposed') {
      navigateOnce();
      return;
    }

    const current = readInput();
    const eligibleNow = current.quickClosed && current.eligible && current.unitId !== null;
    const decision = decideExit({
      eligibleNow,
      loaded: this.state === 'loaded' && this.ad !== null,
      session: this.deps.session.get(),
      limits: current.limits,
      nowMs: this.deps.now(),
    });

    if (decision.action === 'skip') {
      this.deps.log(`event=skip reason=${decision.reason}`);
      this.logSkipDiscard(decision.reason, current);
      this.discardSilently();
      this.state = 'done';
      navigateOnce();
      return;
    }

    // Mostrar.
    this.state = 'showing';
    this.opened = false;
    this.pendingNavigate = navigateOnce;
    this.deps.log('event=show');
    this.cancelFailsafe = this.deps.schedule(() => {
      if (this.state === 'showing' && !this.opened) {
        this.deps.log('event=failsafe reason=no-open');
        this.finishShow(false);
      }
    }, SHOW_FAILSAFE_MS);
    try {
      this.ad?.show();
    } catch (error) {
      this.deps.log(`event=show-error ${describeError(error)}`);
      this.finishShow(false);
    }
  }

  dispose(): void {
    if (this.state === 'disposed') return;
    this.cancelFailsafe?.();
    this.cancelFailsafe = null;
    if (this.ad) this.deps.log('event=discard reason=unmount');
    this.discardSilently();
    this.pendingNavigate = null;
    this.state = 'disposed';
  }

  private startLoad(unitId: string): void {
    this.generation += 1;
    const generation = this.generation;
    this.state = 'loading';
    this.deps.log('event=load-start');
    const events: InterstitialAdEvents = {
      onLoaded: () => {
        if (generation !== this.generation || this.state !== 'loading') return;
        this.state = 'loaded';
        this.deps.log('event=loaded');
      },
      onError: (message) => {
        if (generation !== this.generation) return;
        if (this.state === 'loading') {
          this.deps.log(`event=load-failed ${message}`);
          this.discardSilently();
          this.state = 'failed';
        } else if (this.state === 'showing') {
          this.deps.log(`event=show-error ${message}`);
          this.finishShow(false);
        }
      },
      onOpened: () => {
        if (generation !== this.generation || this.state !== 'showing') return;
        this.opened = true;
        this.cancelFailsafe?.();
        this.cancelFailsafe = null;
        this.deps.session.commit(this.deps.now());
        this.deps.log('event=opened');
      },
      onClosed: () => {
        if (generation !== this.generation || this.state !== 'showing') return;
        this.finishShow(this.opened);
      },
    };
    try {
      this.ad = this.deps.createAd(unitId, events);
      this.ad.load();
    } catch (error) {
      this.deps.log(`event=load-failed ${describeError(error)}`);
      this.discardSilently();
      this.state = 'failed';
    }
  }

  private finishShow(wasShown: boolean): void {
    if (this.state !== 'showing') return;
    this.cancelFailsafe?.();
    this.cancelFailsafe = null;
    this.deps.log(wasShown ? 'event=dismissed' : 'event=show-abandoned');
    this.discardSilently();
    this.state = 'done';
    const navigate = this.pendingNavigate;
    this.pendingNavigate = null;
    navigate?.();
  }

  private discard(reason: string): void {
    this.deps.log(`event=discard reason=${reason}`);
    this.discardSilently();
    this.state = 'idle';
  }

  private discardSilently(): void {
    this.generation += 1; // invalida cualquier evento tardio de la instancia anterior
    const ad = this.ad;
    this.ad = null;
    try {
      ad?.destroy();
    } catch {
      // liberacion nativa de mejor esfuerzo
    }
  }

  private logSkipDiscard(reason: ExitSkipReason, current: QuickExitInput): void {
    if (this.ad && reason === 'not-eligible') this.deps.log(`event=discard reason=ineligible:${current.ineligibleReason ?? 'unknown'}`);
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? `error=${error.message}` : 'error=unknown';
}
