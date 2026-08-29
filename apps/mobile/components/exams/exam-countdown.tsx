import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Text } from '../ui';
import {
  calibrateTimer,
  remainingMs,
  formatCountdown,
  type TimerCalibration,
} from '../../lib/exams/timer';

/**
 * Countdown del Ensayo -- ENSAYOS-M1-C. Aislado en su propio componente para
 * que el re-render por segundo NO arrastre la pantalla entera.
 *
 * NO es autoridad (ADR-0024): recibe `expiresAt` + `serverTime` del backend y
 * calibra el reloj local contra el del servidor. Cuando el reloj calibrado
 * llega a 0, llama `onExpire` UNA vez -- el llamador debe REFETCHear el estado
 * del intento; nunca se asume EXPIRED localmente. Al recalibrar (nuevos props
 * tras un refetch que sigue ACTIVE) el disparo de expiración se rearma.
 * `AppState -> active` fuerza un tick inmediato (background no pausa el reloj).
 */
export function ExamCountdown({
  expiresAt,
  serverTime,
  onExpire,
}: {
  expiresAt: string;
  serverTime: string;
  onExpire: () => void;
}) {
  const calibration = useRef<TimerCalibration>(calibrateTimer({ expiresAt, serverTime }));
  const firedExpire = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const [remaining, setRemaining] = useState(() => remainingMs(calibration.current));

  // Recalibrar cuando el backend devuelve nuevos valores (refetch) -- y rearmar el disparo.
  useEffect(() => {
    calibration.current = calibrateTimer({ expiresAt, serverTime });
    firedExpire.current = false;
    setRemaining(remainingMs(calibration.current));
  }, [expiresAt, serverTime]);

  useEffect(() => {
    const tick = () => {
      const r = remainingMs(calibration.current);
      setRemaining(r);
      if (r <= 0 && !firedExpire.current) {
        firedExpire.current = true;
        onExpireRef.current();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  const lowTime = remaining <= 5 * 60 * 1000;
  return (
    <Text
      variant="titleMedium"
      weight="bold"
      color={lowTime ? 'error' : 'primary'}
      accessibilityLabel={`Tiempo restante ${formatCountdown(remaining)}`}
    >
      {formatCountdown(remaining)}
    </Text>
  );
}
